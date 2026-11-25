import crypto from 'crypto';
import db from '../../src/database/db.js';
import { getAuthUser } from '../lib/auth.js';
import { sendJson, parseJsonBody, getClientIp } from '../lib/http.js';
import {
  getActiveWebMatch,
  startWebMatch,
  playWebMatchBall,
  forfeitWebMatch,
  clearActiveWebMatch,
  resolveStoryEventChoice
} from '../lib/matchEngine.js';
import {
  QUICK_MATCH_CONFIG,
  TOURNAMENTS,
  getTournamentById,
  isTournamentUnlocked,
  generateTournamentBracket
} from '../../src/game/tournaments.js';
import { franchiseLeagues } from '../../src/game/franchiseLeagues.js';
import {
  generateBowlerDelivery,
  getDerivedShotName,
  simulateBallAdvanced
} from '../../src/game/engine.js';
import { getPlayerEquippedShot } from '../../src/game/shotmap.js';
import { getEffectiveAttributes, getEquipmentBonuses, addXP } from '../../src/game/utils.js';
import { recordSystemLog } from '../../src/game/systemLog.js';

function getPlayer(res, user) {
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(user.player_id);
  if (!player) {
    sendJson(res, 404, { error: 'Career player required.' });
    return null;
  }
  return player;
}

export async function handleModeRoutes(req, res, pathname) {
  const user = getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized.' });
    return true;
  }
  const ip = getClientIp(req);
  const playerId = user.player_id;

  // ==========================
  // MATCH ROUTES
  // ==========================
  if (pathname === '/api/match/state' && req.method === 'GET') {
    return sendJson(res, 200, { match: getActiveWebMatch(playerId) });
  }

  if (pathname === '/api/match/start' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const result = startWebMatch(playerId, body);
      return sendJson(res, 200, result.benched ? result : { match: result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/match/ball' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const match = playWebMatchBall(playerId, body);
      return sendJson(res, 200, { match });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/match/clear' && req.method === 'POST') {
    clearActiveWebMatch(playerId);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/match/forfeit' && req.method === 'POST') {
    const match = forfeitWebMatch(playerId);
    return sendJson(res, 200, { match });
  }

  if (pathname === '/api/match/event' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const outcome = resolveStoryEventChoice(playerId, body.event_id, body.choice_index);
      return sendJson(res, 200, { ok: true, outcome });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // ==========================
  // TOURNAMENT ROUTES
  // ==========================
  if (pathname === '/api/tournament/hub' && req.method === 'GET') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const wonRows = db.prepare('SELECT tournament_id, won, times_played, high_score FROM player_tournaments WHERE player_id = ?').all(playerId);
    const wonIds = wonRows.filter(r => r.won > 0).map(r => r.tournament_id);
    const activeRun = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(playerId);
    let parsedBracket = null;
    if (activeRun?.bracket_json) {
      try { parsedBracket = JSON.parse(activeRun.bracket_json); } catch {}
    }

    const list = TOURNAMENTS.map(t => ({
      ...t,
      unlocked: isTournamentUnlocked(t, player.level, wonIds),
      record: wonRows.find(r => r.tournament_id === t.id) || { won: 0, times_played: 0, high_score: 0 }
    }));

    return sendJson(res, 200, {
      quickMatch: QUICK_MATCH_CONFIG,
      tournaments: list,
      wonIds,
      activeRun: activeRun ? { ...activeRun, bracket: parsedBracket } : null
    });
  }

  if (pathname === '/api/tournament/enter' && req.method === 'POST') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const tournament = getTournamentById(String(body.tournament_id || ''));
    if (!tournament) return sendJson(res, 404, { error: 'Tournament not found.' });

    const wonIds = db.prepare('SELECT tournament_id FROM player_tournaments WHERE player_id = ? AND won > 0').all(playerId).map(r => r.tournament_id);
    if (!isTournamentUnlocked(tournament, player.level, wonIds)) {
      return sendJson(res, 403, { error: `Requires Level ${tournament.requiredLevel}.` });
    }

    const teamName = String(body.team_name || tournament.teams[0].name);
    const bracket = generateTournamentBracket(tournament, teamName);
    const firstMatch = bracket.rounds[0].matches.find(m => m.isUserMatch);

    db.prepare(`
      INSERT OR REPLACE INTO active_tournament_run (
        player_id, tournament_id, user_team, current_round, opponent_team, status, bracket_json
      ) VALUES (?, ?, ?, 1, ?, 'active', ?)
    `).run(playerId, tournament.id, teamName, firstMatch.team2, JSON.stringify(bracket));

    recordSystemLog({
      level: 'INFO',
      category: 'Tournament',
      actor: user.username,
      target: tournament.name,
      title: `Entered ${tournament.name} as ${teamName}`,
      ip
    });
    return sendJson(res, 200, { ok: true, bracket });
  }

  if (pathname === '/api/tournament/abandon' && req.method === 'POST') {
    db.prepare('DELETE FROM active_tournament_run WHERE player_id = ?').run(playerId);
    recordSystemLog({
      level: 'INFO',
      category: 'Tournament',
      actor: user.username,
      title: 'Abandoned Active Tournament',
      ip
    });
    return sendJson(res, 200, { ok: true });
  }

  // ==========================
  // FRANCHISE ROUTES
  // ==========================
  if (pathname === '/api/franchise/hub' && req.method === 'GET') {
    const player = getPlayer(res, user);
    if (!player) return true;

    let pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId);
    if (!pf) {
      db.prepare("INSERT INTO player_franchise (player_id, status) VALUES (?, 'none')").run(playerId);
      pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId);
    }

    const league = pf.league_id ? franchiseLeagues[pf.league_id] : null;
    const standings = pf.league_id
      ? db.prepare('SELECT * FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC').all(playerId).map((s, idx) => ({
          ...s,
          rank: idx + 1,
          teamName: league?.teams.find(t => t.id === s.team_id)?.name || s.team_id,
          teamShort: league?.teams.find(t => t.id === s.team_id)?.short || s.team_id.toUpperCase()
        }))
      : [];

    const aiBats = pf.league_id
      ? db.prepare("SELECT name, team_id, runs FROM ai_players WHERE player_id = ? AND league_id = ? ORDER BY runs DESC LIMIT 8").all(playerId, pf.league_id)
      : [];
    const aiBowls = pf.league_id
      ? db.prepare("SELECT name, team_id, wickets FROM ai_players WHERE player_id = ? AND league_id = ? ORDER BY wickets DESC LIMIT 8").all(playerId, pf.league_id)
      : [];

    // Merge user into Orange/Purple cap races
    const orangeCap = [...aiBats, ...(pf.status === 'active' ? [{ name: `${player.name} (You)`, team_id: pf.team_id, runs: pf.runs, isUser: true }] : [])]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 6);
    const purpleCap = [...aiBowls, ...(pf.status === 'active' ? [{ name: `${player.name} (You)`, team_id: pf.team_id, wickets: pf.wickets, isUser: true }] : [])]
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 6);

    const cooldownLeftMs = pf.status === 'completed' && pf.cooldown_until > Date.now()
      ? pf.cooldown_until - Date.now()
      : 0;

    return sendJson(res, 200, {
      leagues: Object.values(franchiseLeagues),
      pf,
      activeLeague: league,
      userTeam: league?.teams.find(t => t.id === pf.team_id) || null,
      standings,
      orangeCap,
      purpleCap,
      cooldownLeftMs,
      seasonFinishedReady: Boolean(pf.status === 'active' && league && pf.current_round > league.seasonLength + 2)
    });
  }

  if (pathname === '/api/franchise/auction' && req.method === 'POST') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const leagueId = String(body.league_id || '');
    const league = franchiseLeagues[leagueId];
    if (!league) return sendJson(res, 404, { error: 'Franchise league not found.' });

    const pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId);
    if (pf && pf.status === 'active') {
      return sendJson(res, 400, { error: 'You already have an active franchise contract.' });
    }
    if (pf && pf.status === 'completed' && pf.cooldown_until > Date.now() && !body.bypass_cooldown) {
      const days = Math.ceil((pf.cooldown_until - Date.now()) / (24 * 60 * 60 * 1000));
      return sendJson(res, 400, { error: `Off-season cooldown active (${days} days remaining).` });
    }

    let baseVal = 30000 + (player.level * 8000) + (player.reputation * 500) + ((player.form - 50) * 1500);
    baseVal = Math.max(20000, baseVal);

    const shuffled = [...league.teams].sort(() => 0.5 - Math.random());
    const bidders = shuffled.slice(0, Math.min(league.teams.length, 3));
    const buyerTeam = bidders[bidders.length - 1];
    const isUnsold = player.level === 1 && player.form < 20 && Math.random() < 0.15;

    const steps = [`The auctioneer raises the gavel for ${player.name} (${player.primary_role}) — Base Price: $${Math.round(baseVal / 2).toLocaleString()}`];

    if (isUnsold) {
      steps.push('No franchises opened a bid...');
      steps.push(`UNSOLD in the ${league.shortName} Auction! Boost form in Practice Nets and retry.`);
      db.prepare("UPDATE player_franchise SET status = 'none', league_id = NULL WHERE player_id = ?").run(playerId);
      return sendJson(res, 200, { sold: false, steps });
    }

    let currentBid = Math.round(baseVal / 2);
    for (const t of bidders) {
      currentBid += Math.round(baseVal * (0.2 + Math.random() * 0.25));
      steps.push(`${t.name} bids $${currentBid.toLocaleString()}!`);
    }
    const finalVal = currentBid + Math.round(baseVal * 0.15);
    steps.push(`Bidding war! ${buyerTeam.name} counter-bids $${finalVal.toLocaleString()}!`);

    const roleNames = ['Development Player', 'Bench', 'Emerging Player', 'Starter', 'Emerging Player', 'Marquee Signing'];
    let rIdx = 2;
    if (player.level < 4) rIdx = 0;
    else if (player.level >= 12 && player.reputation >= 200) rIdx = 5;
    else if (player.level >= 7) rIdx = 3;
    const contractRole = roleNames[rIdx];
    steps.push(`SOLD! ${buyerTeam.name} signs ${player.name} for $${finalVal.toLocaleString()} (${contractRole})!`);

    db.prepare(`
      INSERT OR REPLACE INTO player_franchise (
        player_id, league_id, team_id, status, contract_value, contract_role, current_round,
        cooldown_until, runs, balls, fours, sixes, dismissals, matches_played, wickets, runs_conceded, overs_bowled
      ) VALUES (?, ?, ?, 'active', ?, ?, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0)
    `).run(playerId, leagueId, buyerTeam.id, finalVal, contractRole);

    db.prepare('DELETE FROM franchise_standings WHERE player_id = ?').run(playerId);
    const insStand = db.prepare('INSERT INTO franchise_standings (player_id, league_id, team_id, played, won, lost, points, nrr) VALUES (?, ?, ?, 0, 0, 0, 0, 0.0)');
    for (const t of league.teams) insStand.run(playerId, leagueId, t.id);

    db.prepare('DELETE FROM ai_players WHERE player_id = ?').run(playerId);
    const insAI = db.prepare('INSERT INTO ai_players (player_id, name, role, team_id, league_id, skill_level, runs, wickets) VALUES (?, ?, ?, ?, ?, ?, 0, 0)');
    const fNames = ['Virat', 'Babar', 'Steve', 'Jos', 'Rashid', 'Shaheen', 'Mitchell', 'Glenn', 'Quinton', 'David', 'Andre', 'Sunil', 'Hardik', 'Jasprit'];
    const lNames = ['Kohli', 'Azam', 'Smith', 'Buttler', 'Khan', 'Afridi', 'Starc', 'Maxwell', 'de Kock', 'Warner', 'Russell', 'Narine', 'Pandya', 'Bumrah'];
    for (const t of league.teams) {
      insAI.run(playerId, `${fNames[Math.floor(Math.random() * fNames.length)]} ${lNames[Math.floor(Math.random() * lNames.length)]}`, 'Batsman', t.id, leagueId, 72 + Math.floor(Math.random() * 23));
      insAI.run(playerId, `${fNames[Math.floor(Math.random() * fNames.length)]} ${lNames[Math.floor(Math.random() * lNames.length)]}`, 'Bowler', t.id, leagueId, 72 + Math.floor(Math.random() * 23));
    }

    const signOnCoins = Math.round(finalVal / 100);
    db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(signOnCoins, playerId);

    recordSystemLog({
      level: 'ECONOMY',
      category: 'Franchise',
      actor: user.username,
      target: `${league.shortName} - ${buyerTeam.name}`,
      title: `Signed Franchise Contract ($${finalVal.toLocaleString()})`,
      details: { contractRole, signOnCoins },
      ip
    });

    return sendJson(res, 200, {
      sold: true,
      steps,
      team: buyerTeam,
      contractValue: finalVal,
      contractRole,
      signOnCoins
    });
  }

  if (pathname === '/api/franchise/end-season' && req.method === 'POST') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId);
    if (!pf || pf.status !== 'active') return sendJson(res, 400, { error: 'No active franchise season.' });
    const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];

    const standings = db.prepare('SELECT team_id FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC').all(playerId);
    const userRank = standings.findIndex(s => s.team_id === pf.team_id) + 1;
    const lastMatch = db.prepare("SELECT result FROM match_history WHERE player_id = ? AND match_type = 'franchise' ORDER BY id DESC LIMIT 1").get(playerId);
    const wonTrophy = userRank <= 4 && lastMatch?.result === 'Won';
    const titlePrize = wonTrophy ? league.prizeMoney : 0;

    const orangeWinner = db.prepare('SELECT name, runs FROM ai_players WHERE player_id = ? ORDER BY runs DESC LIMIT 1').get(playerId);
    const purpleWinner = db.prepare('SELECT name, wickets FROM ai_players WHERE player_id = ? ORDER BY wickets DESC LIMIT 1').get(playerId);
    const wonOrangeCap = orangeWinner ? pf.runs >= orangeWinner.runs : true;
    const wonPurpleCap = purpleWinner ? pf.wickets >= purpleWinner.wickets : true;

    let repGained = 40;
    let awardCoins = titlePrize;
    const awards = [];
    if (wonTrophy) {
      db.prepare('UPDATE players SET franchise_titles = COALESCE(franchise_titles, 0) + 1 WHERE discord_id = ?').run(playerId);
      repGained += 50;
      awards.push(`🏆 ${league.shortName} Champions`);
    }
    if (wonOrangeCap) { repGained += 40; awardCoins += 500; awards.push('🍊 Orange Cap'); }
    if (wonPurpleCap) { repGained += 40; awardCoins += 500; awards.push('🍇 Purple Cap'); }

    db.prepare('UPDATE players SET reputation = reputation + ?, coins = coins + ? WHERE discord_id = ?').run(repGained, awardCoins, playerId);
    const cooldownTime = Date.now() + (10 * 24 * 60 * 60 * 1000);
    db.prepare("UPDATE player_franchise SET status = 'completed', cooldown_until = ?, current_round = 0 WHERE player_id = ?").run(cooldownTime, playerId);

    recordSystemLog({
      level: 'INFO',
      category: 'Franchise',
      actor: user.username,
      target: league.name,
      title: wonTrophy ? `Won ${league.shortName} Championship!` : `Completed ${league.shortName} Season (Rank #${userRank})`,
      details: { awards, awardCoins, repGained },
      ip
    });

    return sendJson(res, 200, {
      wonTrophy,
      userRank,
      titlePrize,
      awardCoins,
      repGained,
      awards,
      orangeWinner: wonOrangeCap ? `${player.name} (${pf.runs})` : `${orangeWinner?.name} (${orangeWinner?.runs})`,
      purpleWinner: wonPurpleCap ? `${player.name} (${pf.wickets})` : `${purpleWinner?.name} (${purpleWinner?.wickets})`
    });
  }

  // ==========================
  // CHALLENGE MODE (PvP DUELS)
  // ==========================
  if (pathname === '/api/challenge/hub' && req.method === 'GET') {
    const player = getPlayer(res, user);
    if (!player) return true;

    const myStats = db.prepare('SELECT * FROM challenge_stats WHERE player_id = ?').get(playerId) || { played: 0, won: 0, lost: 0, runs: 0, wickets: 0, fours: 0, sixes: 0 };
    const rivals = db.prepare('SELECT discord_id, name, level, primary_role FROM players WHERE discord_id != ? ORDER BY level DESC LIMIT 30').all(playerId);
    const challenges = db.prepare(`
      SELECT c.*, p1.name as challenger_name, COALESCE(p2.name, 'AI Challenger Bot') as opponent_name
      FROM web_challenges c
      LEFT JOIN players p1 ON c.challenger_id = p1.discord_id
      LEFT JOIN players p2 ON c.opponent_id = p2.discord_id
      WHERE c.challenger_id = ? OR c.opponent_id = ?
      ORDER BY c.updated_at DESC LIMIT 20
    `).all(playerId, playerId).map(c => ({ ...c, state: c.state_json ? JSON.parse(c.state_json) : null }));

    const leaderboard = db.prepare(`
      SELECT p.discord_id, p.name, p.level, cs.won, cs.lost, cs.played, cs.runs, cs.wickets
      FROM challenge_stats cs JOIN players p ON cs.player_id = p.discord_id
      ORDER BY cs.won DESC, cs.runs DESC LIMIT 20
    `).all();

    return sendJson(res, 200, { myStats, rivals, challenges, leaderboard });
  }

  if (pathname === '/api/challenge/create' && req.method === 'POST') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const opponentId = String(body.opponent_id || 'ai_rival');
    const targetRuns = Math.min(36, Math.max(6, Number(body.target_runs) || 15));
    const isAi = opponentId === 'ai_rival';

    if (!isAi) {
      if (opponentId === playerId) return sendJson(res, 400, { error: 'Cannot challenge yourself!' });
      const opp = db.prepare('SELECT discord_id, name FROM players WHERE discord_id = ?').get(opponentId);
      if (!opp) return sendJson(res, 404, { error: 'Opponent not found.' });
    }

    const id = `duel_${crypto.randomBytes(5).toString('hex')}`;
    const state = {
      innings: 1,
      batterId: playerId,
      bowlerId: opponentId,
      targetRuns,
      runs: 0,
      balls: 0,
      wickets: 0,
      fours: 0,
      sixes: 0,
      freeHit: false,
      pendingDelivery: isAi ? generateBowlerDelivery('Flat Belter (Batting Paradise)') : null,
      pendingShot: null,
      log: [isAi ? `AI Rival accepted a 1-Over (6-Ball) Showdown! Target: ${targetRuns} runs.` : `Challenge issued! Target: ${targetRuns} runs in 1 Over (6 balls).`]
    };

    db.prepare(`
      INSERT INTO web_challenges (id, challenger_id, opponent_id, target_runs, status, state_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, playerId, opponentId, targetRuns, isAi ? 'active' : 'pending', JSON.stringify(state));

    recordSystemLog({
      level: 'INFO',
      category: 'Challenge',
      actor: user.username,
      target: opponentId,
      title: `Created PvP Duel (${id})`,
      details: { targetRuns, isAi },
      ip
    });
    return sendJson(res, 201, { id, status: isAi ? 'active' : 'pending', state });
  }

  if (pathname === '/api/challenge/respond' && req.method === 'POST') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const duel = db.prepare('SELECT * FROM web_challenges WHERE id = ?').get(String(body.challenge_id || ''));
    if (!duel) return sendJson(res, 404, { error: 'Challenge not found.' });
    if (duel.opponent_id !== playerId || duel.status !== 'pending') {
      return sendJson(res, 403, { error: 'Only the challenged player can respond to a pending duel.' });
    }

    const nextStatus = body.accept ? 'active' : 'declined';
    db.prepare("UPDATE web_challenges SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, duel.id);
    return sendJson(res, 200, { ok: true, status: nextStatus });
  }

  if (pathname === '/api/challenge/play' && req.method === 'POST') {
    const player = getPlayer(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const duel = db.prepare('SELECT * FROM web_challenges WHERE id = ?').get(String(body.challenge_id || ''));
    if (!duel || duel.status !== 'active') return sendJson(res, 400, { error: 'Challenge is not active.' });
    if (duel.challenger_id !== playerId && duel.opponent_id !== playerId) {
      return sendJson(res, 403, { error: 'You are not part of this duel.' });
    }

    const state = JSON.parse(duel.state_json || '{}');
    const isBatter = state.batterId === playerId;
    const isBowler = state.bowlerId === playerId;
    const isAiOpponent = duel.opponent_id === 'ai_rival';

    if (isBowler && !isBatter) {
      // Opponent submits a delivery for this ball
      const { line = 'Stumps', length = 'Good Length', variation = 'Normal Delivery', speed = 'Fast', fieldPreset = 'Balanced' } = body;
      state.pendingDelivery = { line, length, variation, speed, fieldPreset };
      state.log.unshift(`Bowler selected delivery (${fieldPreset} field). Waiting for batter!`);
      db.prepare("UPDATE web_challenges SET state_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(state), duel.id);
      return sendJson(res, 200, { challenge: { ...duel, state } });
    }

    if (isBatter) {
      if (!state.pendingDelivery) {
        return sendJson(res, 400, { error: 'Waiting for bowler to select the next delivery!' });
      }
      const { stance = 'In Line', footwork = 'Front Foot', intent = 'Stroke', zone = 'Cover', timingQuality = null } = body;
      const isLeave = footwork === 'Leave' || intent === 'Leave';
      const deliv = state.pendingDelivery;
      const attrs = getEffectiveAttributes(db, playerId);
      const eq = getEquipmentBonuses(db, playerId);
      const skills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(playerId).map(r => r.skill_key);
      const timing = isLeave ? 'Perfect' : (timingQuality || (Math.random() < 0.45 ? 'Perfect' : Math.random() < 0.8 ? 'Slightly Early' : 'Very Late'));
      const equippedShot = !isLeave ? getPlayerEquippedShot(playerId, footwork, intent, zone) : null;

      let bowlerSkill = 52;
      if (!isAiOpponent) {
        const oppAttrs = getEffectiveAttributes(db, duel.opponent_id);
        bowlerSkill = Math.round(((oppAttrs.accuracy || 25) + (oppAttrs.swing || 25)) / 2);
      }

      const sim = simulateBallAdvanced({
        bowlerInput: deliv,
        batterInput: { stance, footwork, intent, zone, targetZone: zone, equippedShot },
        timingResult: timing,
        playerAttrs: attrs,
        eqBonuses: eq,
        activeSkills: skills,
        confidence: player.confidence,
        bowlerSkill,
        isFreeHit: state.freeHit,
        isPowerplay: true,
        pitch: 'Flat Belter (Batting Paradise)'
      });

      state.runs += sim.runs;
      if (!sim.rebowl) state.balls++;
      if (sim.runs === 4 && !sim.wicket) state.fours++;
      if (sim.runs === 6 && !sim.wicket) state.sixes++;
      if (sim.wicket) state.wickets++;
      state.freeHit = Boolean(sim.nextIsFreeHit);

      const shotName = isLeave ? 'Leave' : (equippedShot ? equippedShot.name : getDerivedShotName(footwork, intent, zone));
      state.log.unshift(`Ball ${state.balls}: ${deliv.length} ${deliv.line} ➔ ${shotName} [${sim.timing}] — ${sim.commentary}`);
      state.pendingDelivery = isAiOpponent ? generateBowlerDelivery('Flat Belter (Batting Paradise)') : null;

      const batterWon = state.runs >= state.targetRuns;
      const bowlerWon = state.wickets >= 1 || (state.balls >= 6 && state.runs < state.targetRuns);

      if (batterWon || bowlerWon) {
        const winnerId = batterWon ? state.batterId : state.bowlerId;
        const loserId = batterWon ? state.bowlerId : state.batterId;
        db.prepare("UPDATE web_challenges SET status = 'completed', winner_id = ?, state_json = ?, updated_at = datetime('now') WHERE id = ?")
          .run(winnerId, JSON.stringify(state), duel.id);

        db.prepare('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)').run(state.batterId);
        db.prepare('UPDATE challenge_stats SET played=played+1, won=won+?, lost=lost+?, runs=runs+?, fours=fours+?, sixes=sixes+? WHERE player_id=?')
          .run(batterWon ? 1 : 0, batterWon ? 0 : 1, state.runs, state.fours, state.sixes, state.batterId);

        if (state.bowlerId !== 'ai_rival') {
          db.prepare('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)').run(state.bowlerId);
          db.prepare('UPDATE challenge_stats SET played=played+1, won=won+?, lost=lost+?, wickets=wickets+? WHERE player_id=?')
            .run(bowlerWon ? 1 : 0, bowlerWon ? 0 : 1, state.wickets, state.bowlerId);
        }

        if (winnerId !== 'ai_rival') {
          db.prepare('UPDATE players SET coins = coins + 50, reputation = reputation + 5 WHERE discord_id = ?').run(winnerId);
          addXP(db, winnerId, 60);
        }
        if (loserId !== 'ai_rival') {
          addXP(db, loserId, 20);
        }

        recordSystemLog({
          level: 'MATCH',
          category: 'Challenge',
          actor: player.name,
          target: duel.opponent_id,
          title: `PvP Duel Completed (${batterWon ? 'Batter Won' : 'Bowler Won'})`,
          details: { duelId: duel.id, runs: state.runs, target: state.targetRuns },
          ip
        });

        return sendJson(res, 200, { challenge: { ...duel, status: 'completed', winner_id: winnerId, state } });
      }

      db.prepare("UPDATE web_challenges SET state_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(state), duel.id);
      return sendJson(res, 200, { challenge: { ...duel, state } });
    }
  }

  return false;
}
