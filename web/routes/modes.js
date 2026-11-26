import crypto from 'crypto';
import db, { resolvePlayerByIdentifier } from '../../src/database/db.js';
import { getAuthUser } from '../lib/auth.js';
import { sendJson, parseJsonBody, getClientIp } from '../lib/http.js';
import {
  getActiveWebMatch,
  startWebMatch,
  playWebMatchBall,
  forfeitWebMatch,
  clearActiveWebMatch,
  resolveStoryEventChoice,
  computeTimingProfile,
  resolveBattingTiming,
  buildTimingFeedback,
  buildInitialReleaseCue,
  buildFullDeliveryReveal
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

const PENDING_CHALLENGE_TTL_MS = 15 * 60 * 1000; // 15 mins to accept/decline
const ACTIVE_CHALLENGE_TTL_MS = 30 * 60 * 1000;  // 30 mins per turn/activity before auto-end
const CHALLENGE_MIN_LEVEL = 5;

export async function sweepExpiredWebChallenges(database = db) {
  const now = Date.now();
  const due = await database.all(
    `SELECT * FROM web_challenges
     WHERE status IN ('pending', 'active')
       AND expires_at > 0
       AND expires_at <= ?`,
    now
  );

  for (const duel of due) {
    const state = duel.state_json ? JSON.parse(duel.state_json) : { log: [] };
    if (!Array.isArray(state.log)) state.log = [];

    if (duel.status === 'pending') {
      state.log.unshift('Challenge timed out before opponent responded and was auto-ended.');
      await database.run(
        "UPDATE web_challenges SET status = 'expired', state_json = ?, expires_at = 0, updated_at = datetime('now') WHERE id = ?",
        JSON.stringify(state), duel.id
      );
      await recordSystemLog({
        level: 'INFO',
        category: 'Challenge',
        actor: duel.challenger_id,
        target: duel.opponent_id,
        title: `Challenge Auto-Expired (${duel.id})`,
        details: 'No response within time limit'
      });
    } else if (duel.status === 'active') {
      // Auto-end & award win to non-stalling player
      const waitingOnBatter = Boolean(state.pendingDelivery);
      const winnerId = waitingOnBatter ? state.bowlerId : state.batterId;
      const loserId = waitingOnBatter ? state.batterId : state.bowlerId;

      state.log.unshift(`Time expired! ${waitingOnBatter ? 'Batter' : 'Bowler'} failed to act in time — duel auto-ended.`);
      await database.run(
        "UPDATE web_challenges SET status = 'expired', winner_id = ?, state_json = ?, expires_at = 0, updated_at = datetime('now') WHERE id = ?",
        winnerId, JSON.stringify(state), duel.id
      );

      if (winnerId && winnerId !== 'ai_rival') {
        await database.run('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)', winnerId);
        await database.run('UPDATE challenge_stats SET played=played+1, won=won+1 WHERE player_id=?', winnerId);
      }
      if (loserId && loserId !== 'ai_rival') {
        await database.run('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)', loserId);
        await database.run('UPDATE challenge_stats SET played=played+1, lost=lost+1 WHERE player_id=?', loserId);
      }

      await recordSystemLog({
        level: 'MATCH',
        category: 'Challenge',
        actor: loserId || duel.challenger_id,
        target: winnerId || duel.opponent_id,
        title: `Active Duel Auto-Ended on Timeout (${duel.id})`,
        details: { runs: state.runs, balls: state.balls, waitingOnBatter }
      });
    }
  }
  return due.length;
}

async function getPlayer(res, user) {
  const player = await db.get('SELECT * FROM players WHERE discord_id = ?', user.player_id);
  if (!player) {
    sendJson(res, 404, { error: 'Career player required.' });
    return null;
  }
  return player;
}

export async function handleModeRoutes(req, res, pathname) {
  const user = await getAuthUser(req);
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
    return sendJson(res, 200, { match: await getActiveWebMatch(playerId) });
  }

  if (pathname === '/api/match/start' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const result = await startWebMatch(playerId, body);
      return sendJson(res, 200, result.benched ? result : { match: result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/match/ball' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const match = await playWebMatchBall(playerId, body);
      return sendJson(res, 200, { match });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/match/clear' && req.method === 'POST') {
    await clearActiveWebMatch(playerId);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/match/forfeit' && req.method === 'POST') {
    const match = await forfeitWebMatch(playerId);
    return sendJson(res, 200, { match });
  }

  if (pathname === '/api/match/event' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const outcome = await resolveStoryEventChoice(playerId, body.event_id, body.choice_index);
      return sendJson(res, 200, { ok: true, outcome });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // ==========================
  // TOURNAMENT ROUTES
  // ==========================
  if (pathname === '/api/tournament/hub' && req.method === 'GET') {
    const player = await getPlayer(res, user);
    if (!player) return true;
    const wonRows = await db.all('SELECT tournament_id, won, times_played, high_score FROM player_tournaments WHERE player_id = ?', playerId);
    const wonIds = wonRows.filter(r => r.won > 0).map(r => r.tournament_id);
    const activeRun = await db.get("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'", playerId);
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
    const player = await getPlayer(res, user);
    if (!player) return true;
    const existingTourney = await db.get("SELECT tournament_id FROM active_tournament_run WHERE player_id = ? AND status = 'active'", playerId);
    if (existingTourney) {
      return sendJson(res, 409, { error: 'You already have an active tournament run! Complete or abandon it before entering another.' });
    }
    const body = await parseJsonBody(req);
    const tournament = getTournamentById(String(body.tournament_id || ''));
    if (!tournament) return sendJson(res, 404, { error: 'Tournament not found.' });

    const wonIds = (await db.all('SELECT tournament_id FROM player_tournaments WHERE player_id = ? AND won > 0', playerId)).map(r => r.tournament_id);
    if (!isTournamentUnlocked(tournament, player.level, wonIds)) {
      return sendJson(res, 403, { error: `Requires Level ${tournament.requiredLevel}.` });
    }

    const teamName = String(body.team_name || tournament.teams[0].name);
    const bracket = generateTournamentBracket(tournament, teamName);
    const firstMatch = bracket.rounds[0].matches.find(m => m.isUserMatch);

    await db.run(
      `INSERT OR REPLACE INTO active_tournament_run (
         player_id, tournament_id, user_team, current_round, opponent_team, status, bracket_json
       ) VALUES (?, ?, ?, 1, ?, 'active', ?)`,
      playerId, tournament.id, teamName, firstMatch.team2, JSON.stringify(bracket)
    );

    await recordSystemLog({
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
    await db.run('DELETE FROM active_tournament_run WHERE player_id = ?', playerId);
    await recordSystemLog({
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
    const player = await getPlayer(res, user);
    if (!player) return true;

    let pf = await db.get('SELECT * FROM player_franchise WHERE player_id = ?', playerId);
    if (!pf) {
      await db.run("INSERT INTO player_franchise (player_id, status) VALUES (?, 'none')", playerId);
      pf = await db.get('SELECT * FROM player_franchise WHERE player_id = ?', playerId);
    }

    const league = pf.league_id ? franchiseLeagues[pf.league_id] : null;
    const standingsRows = pf.league_id
      ? await db.all('SELECT * FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC', playerId)
      : [];
    const standings = standingsRows.map((s, idx) => ({
      ...s,
      rank: idx + 1,
      teamName: league?.teams.find(t => t.id === s.team_id)?.name || s.team_id,
      teamShort: league?.teams.find(t => t.id === s.team_id)?.short || s.team_id.toUpperCase()
    }));

    const aiBats = pf.league_id
      ? await db.all("SELECT name, team_id, runs FROM ai_players WHERE player_id = ? AND league_id = ? ORDER BY runs DESC LIMIT 8", playerId, pf.league_id)
      : [];
    const aiBowls = pf.league_id
      ? await db.all("SELECT name, team_id, wickets FROM ai_players WHERE player_id = ? AND league_id = ? ORDER BY wickets DESC LIMIT 8", playerId, pf.league_id)
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
    const player = await getPlayer(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const leagueId = String(body.league_id || '');
    const league = franchiseLeagues[leagueId];
    if (!league) return sendJson(res, 404, { error: 'Franchise league not found.' });

    const pf = await db.get('SELECT * FROM player_franchise WHERE player_id = ?', playerId);
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
      await db.run("UPDATE player_franchise SET status = 'none', league_id = NULL WHERE player_id = ?", playerId);
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

    await db.run(
      `INSERT OR REPLACE INTO player_franchise (
         player_id, league_id, team_id, status, contract_value, contract_role, current_round,
         cooldown_until, runs, balls, fours, sixes, dismissals, matches_played, wickets, runs_conceded, overs_bowled
       ) VALUES (?, ?, ?, 'active', ?, ?, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0)`,
      playerId, leagueId, buyerTeam.id, finalVal, contractRole
    );

    await db.run('DELETE FROM franchise_standings WHERE player_id = ?', playerId);
    for (const t of league.teams) {
      await db.run('INSERT INTO franchise_standings (player_id, league_id, team_id, played, won, lost, points, nrr) VALUES (?, ?, ?, 0, 0, 0, 0, 0.0)', playerId, leagueId, t.id);
    }

    await db.run('DELETE FROM ai_players WHERE player_id = ?', playerId);
    const fNames = ['Virat', 'Babar', 'Steve', 'Jos', 'Rashid', 'Shaheen', 'Mitchell', 'Glenn', 'Quinton', 'David', 'Andre', 'Sunil', 'Hardik', 'Jasprit'];
    const lNames = ['Kohli', 'Azam', 'Smith', 'Buttler', 'Khan', 'Afridi', 'Starc', 'Maxwell', 'de Kock', 'Warner', 'Russell', 'Narine', 'Pandya', 'Bumrah'];
    for (const t of league.teams) {
      await db.run('INSERT INTO ai_players (player_id, name, role, team_id, league_id, skill_level, runs, wickets) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
        playerId, `${fNames[Math.floor(Math.random() * fNames.length)]} ${lNames[Math.floor(Math.random() * lNames.length)]}`, 'Batsman', t.id, leagueId, 72 + Math.floor(Math.random() * 23));
      await db.run('INSERT INTO ai_players (player_id, name, role, team_id, league_id, skill_level, runs, wickets) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
        playerId, `${fNames[Math.floor(Math.random() * fNames.length)]} ${lNames[Math.floor(Math.random() * lNames.length)]}`, 'Bowler', t.id, leagueId, 72 + Math.floor(Math.random() * 23));
    }

    const signOnCoins = Math.min(250, Math.round(finalVal / 500));
    await db.run('UPDATE players SET coins = coins + ? WHERE discord_id = ?', signOnCoins, playerId);

    await recordSystemLog({
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
    const player = await getPlayer(res, user);
    if (!player) return true;
    const pf = await db.get('SELECT * FROM player_franchise WHERE player_id = ?', playerId);
    if (!pf || pf.status !== 'active') return sendJson(res, 400, { error: 'No active franchise season.' });
    const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];

    const standings = await db.all('SELECT team_id FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC', playerId);
    const userRank = standings.findIndex(s => s.team_id === pf.team_id) + 1;
    const lastMatch = await db.get("SELECT result FROM match_history WHERE player_id = ? AND match_type = 'franchise' ORDER BY id DESC LIMIT 1", playerId);
    const wonTrophy = userRank <= 4 && lastMatch?.result === 'Won';
    const titlePrize = wonTrophy ? Math.min(800, Math.round(league.prizeMoney / 12)) : 0;

    const orangeWinner = await db.get('SELECT name, runs FROM ai_players WHERE player_id = ? ORDER BY runs DESC LIMIT 1', playerId);
    const purpleWinner = await db.get('SELECT name, wickets FROM ai_players WHERE player_id = ? ORDER BY wickets DESC LIMIT 1', playerId);
    const wonOrangeCap = orangeWinner ? pf.runs >= orangeWinner.runs : true;
    const wonPurpleCap = purpleWinner ? pf.wickets >= purpleWinner.wickets : true;

    let repGained = 40;
    let awardCoins = titlePrize;
    const awards = [];
    if (wonTrophy) {
      await db.run('UPDATE players SET franchise_titles = COALESCE(franchise_titles, 0) + 1 WHERE discord_id = ?', playerId);
      repGained += 50;
      awards.push(`🏆 ${league.shortName} Champions`);
    }
    if (wonOrangeCap) { repGained += 40; awardCoins += 120; awards.push('🍊 Orange Cap'); }
    if (wonPurpleCap) { repGained += 40; awardCoins += 120; awards.push('🍇 Purple Cap'); }

    await db.run('UPDATE players SET reputation = reputation + ?, coins = coins + ? WHERE discord_id = ?', repGained, awardCoins, playerId);
    const cooldownTime = Date.now() + (10 * 24 * 60 * 60 * 1000);
    await db.run("UPDATE player_franchise SET status = 'completed', cooldown_until = ?, current_round = 0 WHERE player_id = ?", cooldownTime, playerId);

    await recordSystemLog({
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

async function enrichChallengeRow(database, row) {
  if (!row) return null;
  const state = row.state_json ? JSON.parse(row.state_json) : {};
  const batter = state.batterId
    ? await database.get('SELECT discord_id, public_id, name, batting_hand, confidence, form FROM players WHERE discord_id = ?', state.batterId)
    : null;
  const bowler = state.bowlerId && state.bowlerId !== 'ai_rival'
    ? await database.get('SELECT discord_id, public_id, name, bowling_style FROM players WHERE discord_id = ?', state.bowlerId)
    : { name: 'AI Challenger Bot', public_id: 'AI', bowling_style: 'Right-arm Fast' };
  const winner = row.winner_id && row.winner_id !== 'ai_rival'
    ? await database.get('SELECT name, public_id FROM players WHERE discord_id = ?', row.winner_id)
    : (row.winner_id === 'ai_rival' ? { name: 'AI Challenger Bot', public_id: 'AI' } : null);

  let timingProfile = null;
  if (batter && row.status === 'active') {
    const attrs = await getEffectiveAttributes(database, batter.discord_id);
    const eq = await getEquipmentBonuses(database, batter.discord_id);
    const skills = (await database.all('SELECT skill_key FROM skills WHERE player_id = ?', batter.discord_id)).map(r => r.skill_key);
    let bowlerSkill = 52;
    if (state.bowlerId && state.bowlerId !== 'ai_rival') {
      const oppAttrs = await getEffectiveAttributes(database, state.bowlerId);
      bowlerSkill = Math.round(((oppAttrs.accuracy || 25) + (oppAttrs.swing || 25)) / 2);
    }
    timingProfile = await computeTimingProfile({
      playerId: batter.discord_id,
      playerAttrs: attrs,
      eqBonuses: eq,
      activeSkills: skills,
      bowlerSkill,
      pitch: state.pitch || 'Flat Belter (Batting Paradise)',
      bat: { balls: state.balls || 0, ballsLimit: state.maxBalls || 6 },
      nextDelivery: state.pendingDelivery || {}
    }, batter);
  }

  return {
    ...row,
    winner_name: winner?.name || null,
    winner_public_id: winner?.public_id || null,
    batterHand: batter?.batting_hand || 'Right-hand bat',
    bowlerStyle: bowler?.bowling_style || 'Right-arm Fast',
    timingProfile,
    releaseCue: state.pendingDelivery ? buildInitialReleaseCue(state.pendingDelivery) : null,
    fullDeliveryReveal: state.pendingDelivery ? buildFullDeliveryReveal(state.pendingDelivery) : null,
    currentBallPreview: state.pendingDelivery ? {
      length: state.pendingDelivery.length,
      line: state.pendingDelivery.line,
      speed: state.pendingDelivery.speed
    } : null,
    state
  };
}

  // ==========================
  // CHALLENGE MODE (PvP DUELS)
  // ==========================
  if (pathname === '/api/challenge/hub' && req.method === 'GET') {
    const player = await getPlayer(res, user);
    if (!player) return true;
    await sweepExpiredWebChallenges(db);

    const myStats = (await db.get('SELECT * FROM challenge_stats WHERE player_id = ?', playerId)) || { played: 0, won: 0, lost: 0, runs: 0, wickets: 0, fours: 0, sixes: 0 };
    const rivals = await db.all('SELECT discord_id, public_id, name, level, primary_role, nationality FROM players WHERE discord_id != ? AND level >= ? ORDER BY level DESC LIMIT 50', playerId, CHALLENGE_MIN_LEVEL);
    const challengeRows = await db.all(
      `SELECT c.*, p1.name as challenger_name, p1.public_id as challenger_public_id,
              p2.name as opponent_name, p2.public_id as opponent_public_id
       FROM web_challenges c
       JOIN players p1 ON c.challenger_id = p1.discord_id
       JOIN players p2 ON c.opponent_id = p2.discord_id
       WHERE (c.challenger_id = ? OR c.opponent_id = ?)
         AND c.challenger_id != 'ai_rival'
         AND c.opponent_id != 'ai_rival'
       ORDER BY c.updated_at DESC LIMIT 20`,
      playerId, playerId
    );
    const challenges = await Promise.all(challengeRows.map(c => enrichChallengeRow(db, c)));

    const leaderboard = await db.all(`
      SELECT p.discord_id, p.public_id, p.name, p.level, cs.won, cs.lost, cs.played, cs.runs, cs.wickets
      FROM challenge_stats cs JOIN players p ON cs.player_id = p.discord_id
      WHERE cs.played > 0
      ORDER BY cs.won DESC, cs.runs DESC LIMIT 20
    `);

    return sendJson(res, 200, { myStats, rivals, challenges, leaderboard, minLevel: CHALLENGE_MIN_LEVEL });
  }

  if (pathname === '/api/challenge/create' && req.method === 'POST') {
    const player = await getPlayer(res, user);
    if (!player) return true;
    if ((player.level || 1) < CHALLENGE_MIN_LEVEL) {
      return sendJson(res, 403, { error: `Challenge Mode unlocks at Level ${CHALLENGE_MIN_LEVEL}! Reach Level ${CHALLENGE_MIN_LEVEL} first (currently Level ${player.level}).` });
    }
    await sweepExpiredWebChallenges(db);

    const ownOngoing = await db.get(
      `SELECT id, status, expires_at FROM web_challenges
       WHERE (challenger_id = ? OR (opponent_id = ? AND status = 'active'))
         AND status IN ('pending', 'active')
         AND challenger_id != 'ai_rival' AND opponent_id != 'ai_rival'`,
      playerId, playerId
    );
    if (ownOngoing) {
      return sendJson(res, 409, {
        error: `You already have an active or pending challenge (${ownOngoing.status.toUpperCase()})! Complete, cancel, or wait for it to expire before starting another.`
      });
    }

    const body = await parseJsonBody(req);
    let opponentId = String(body.opponent_id || '').trim();
    const overs = Math.min(5, Math.max(1, Math.round(Number(body.overs) || 1)));
    const maxBalls = overs * 6;
    const maxWickets = Math.min(5, Math.max(1, Math.round(Number(body.max_wickets) || 1)));
    const targetRuns = Math.min(150, Math.max(6, Math.round(Number(body.target_runs) || 15)));
    const allowedPitches = [
      'Flat Belter (Batting Paradise)',
      'Balanced Sporting Pitch',
      'Green Seamer (Swing & Pace)',
      'Dusty Turn (Spin Paradise)'
    ];
    const pitch = allowedPitches.includes(String(body.pitch || '')) ? String(body.pitch) : 'Flat Belter (Batting Paradise)';
    if (!opponentId || opponentId === 'ai_rival') {
      return sendJson(res, 400, { error: 'Challenge Mode is PvP only! Select a registered player to challenge.' });
    }

    const opp = await resolvePlayerByIdentifier(db, opponentId);
    if (!opp) return sendJson(res, 404, { error: 'Opponent not found.' });
    if ((opp.level || 1) < CHALLENGE_MIN_LEVEL) {
      return sendJson(res, 403, { error: `${opp.name} hasn't unlocked Challenge Mode yet (requires Level ${CHALLENGE_MIN_LEVEL}).` });
    }
    opponentId = opp.discord_id;
    if (opponentId === playerId) return sendJson(res, 400, { error: 'Cannot challenge yourself!' });

    const oppBusy = await db.get(
      `SELECT id FROM web_challenges
       WHERE (challenger_id = ? OR opponent_id = ?) AND status = 'active'
         AND challenger_id != 'ai_rival' AND opponent_id != 'ai_rival'`,
      opponentId, opponentId
    );
    if (oppBusy) {
      return sendJson(res, 409, { error: 'That opponent is already in an active duel! Wait until their current challenge finishes.' });
    }

    // Smart PvP role assignment: if one is a Bowler and one is a Batsman/Keeper, put Batsman vs Bowler naturally
    const p1Bowl = String(player.primary_role || '').toLowerCase().includes('bowl') && !String(player.primary_role || '').toLowerCase().includes('all');
    const p2Bowl = String(opp.primary_role || '').toLowerCase().includes('bowl') && !String(opp.primary_role || '').toLowerCase().includes('all');
    const batterId = (p1Bowl && !p2Bowl) ? opponentId : playerId;
    const bowlerId = batterId === playerId ? opponentId : playerId;

    const id = `duel_${crypto.randomBytes(5).toString('hex')}`;
    const expiresAt = Date.now() + PENDING_CHALLENGE_TTL_MS;
    const state = {
      innings: 1,
      batterId,
      bowlerId,
      targetRuns,
      maxWickets,
      maxBalls,
      overs,
      pitch,
      runs: 0,
      balls: 0,
      wickets: 0,
      fours: 0,
      sixes: 0,
      freeHit: false,
      pendingDelivery: null,
      pendingShot: null,
      log: [`PvP Challenge issued! Target: ${targetRuns} runs in ${overs} Over${overs > 1 ? 's' : ''} (${maxBalls}b) • Max ${maxWickets} Wkt${maxWickets > 1 ? 's' : ''} • Pitch: ${pitch}.`]
    };

    await db.run(
      `INSERT INTO web_challenges (id, challenger_id, opponent_id, target_runs, status, state_json, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      id, playerId, opponentId, targetRuns, JSON.stringify(state), expiresAt
    );

    await recordSystemLog({
      level: 'INFO',
      category: 'Challenge',
      actor: user.username,
      target: opponentId,
      title: `Created PvP Duel (${id})`,
      details: { targetRuns, expiresAt },
      ip
    });
    return sendJson(res, 201, { id, status: 'pending', expires_at: expiresAt, state });
  }

  if (pathname === '/api/challenge/cancel' && req.method === 'POST') {
    const player = await getPlayer(res, user);
    if (!player) return true;
    await sweepExpiredWebChallenges(db);
    const body = await parseJsonBody(req);
    const duel = await db.get('SELECT * FROM web_challenges WHERE id = ?', String(body.challenge_id || ''));
    if (!duel) return sendJson(res, 404, { error: 'Challenge not found.' });
    if (duel.challenger_id !== playerId && duel.opponent_id !== playerId) {
      return sendJson(res, 403, { error: 'Not authorized to cancel this challenge.' });
    }
    if (!['pending', 'active'].includes(duel.status)) {
      return sendJson(res, 400, { error: 'Challenge is already finished.' });
    }

    const st = duel.state_json ? JSON.parse(duel.state_json) : { log: [] };
    if (!Array.isArray(st.log)) st.log = [];
    st.log.unshift(`${player.name} ended/cancelled the challenge.`);
    const nextStatus = duel.status === 'pending' ? 'cancelled' : 'forfeited';
    const winnerId = duel.status === 'active'
      ? (duel.challenger_id === playerId ? duel.opponent_id : duel.challenger_id)
      : null;

    await db.run(
      "UPDATE web_challenges SET status = ?, winner_id = ?, state_json = ?, expires_at = 0, updated_at = datetime('now') WHERE id = ?",
      nextStatus, winnerId, JSON.stringify(st), duel.id
    );

    await recordSystemLog({
      level: 'INFO',
      category: 'Challenge',
      actor: user.username,
      target: duel.id,
      title: `Challenge ${nextStatus === 'cancelled' ? 'Cancelled' : 'Forfeited'}`,
      ip
    });
    return sendJson(res, 200, { ok: true, status: nextStatus });
  }

  if (pathname === '/api/challenge/respond' && req.method === 'POST') {
    const player = await getPlayer(res, user);
    if (!player) return true;
    await sweepExpiredWebChallenges(db);
    const body = await parseJsonBody(req);
    const duel = await db.get('SELECT * FROM web_challenges WHERE id = ?', String(body.challenge_id || ''));
    if (!duel) return sendJson(res, 404, { error: 'Challenge not found.' });
    if (duel.status !== 'pending') {
      return sendJson(res, 410, { error: `This challenge is no longer pending (${duel.status}).` });
    }
    if (duel.opponent_id !== playerId) {
      return sendJson(res, 403, { error: 'Only the challenged player can respond to a pending duel.' });
    }

    if (body.accept) {
      if ((player.level || 1) < CHALLENGE_MIN_LEVEL) {
        return sendJson(res, 403, { error: `Challenge Mode unlocks at Level ${CHALLENGE_MIN_LEVEL}!` });
      }
      const busy = await db.get(
        `SELECT id FROM web_challenges
         WHERE (challenger_id = ? OR opponent_id = ?) AND status IN ('pending', 'active') AND id != ?`,
        playerId, playerId, duel.id
      );
      if (busy) {
        return sendJson(res, 409, { error: 'Finish or cancel your own active/pending challenge before accepting another.' });
      }
    }

    const nextStatus = body.accept ? 'active' : 'declined';
    const nextExp = body.accept ? Date.now() + ACTIVE_CHALLENGE_TTL_MS : 0;
    await db.run(
      "UPDATE web_challenges SET status = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?",
      nextStatus, nextExp, duel.id
    );
    return sendJson(res, 200, { ok: true, status: nextStatus, expires_at: nextExp });
  }

  if (pathname === '/api/challenge/play' && req.method === 'POST') {
    const player = await getPlayer(res, user);
    if (!player) return true;
    await sweepExpiredWebChallenges(db);
    const body = await parseJsonBody(req);
    const duel = await db.get('SELECT * FROM web_challenges WHERE id = ?', String(body.challenge_id || ''));
    if (!duel || duel.status !== 'active') return sendJson(res, 400, { error: 'Challenge is not active or has timed out.' });
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
      const nextExp = Date.now() + ACTIVE_CHALLENGE_TTL_MS;
      await db.run("UPDATE web_challenges SET state_json = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(state), nextExp, duel.id);
      const refreshed = await db.get(
        `SELECT c.*, p1.name as challenger_name, p1.public_id as challenger_public_id,
                COALESCE(p2.name, 'AI Challenger Bot') as opponent_name, p2.public_id as opponent_public_id
         FROM web_challenges c
         LEFT JOIN players p1 ON c.challenger_id = p1.discord_id
         LEFT JOIN players p2 ON c.opponent_id = p2.discord_id
         WHERE c.id = ?`,
        duel.id
      );
      return sendJson(res, 200, { challenge: await enrichChallengeRow(db, refreshed) });
    }

    if (isBatter) {
      if (!state.pendingDelivery) {
        return sendJson(res, 400, { error: 'Waiting for bowler to select the next delivery!' });
      }
      const { stance = 'In Line', footwork = 'Front Foot', intent = 'Stroke', zone = 'Cover', timingQuality = null, needlePos = null } = body;
      const isLeave = footwork === 'Leave' || intent === 'Leave';
      const deliv = state.pendingDelivery;
      const attrs = await getEffectiveAttributes(db, playerId);
      const eq = await getEquipmentBonuses(db, playerId);
      const skills = (await db.all('SELECT skill_key FROM skills WHERE player_id = ?', playerId)).map(r => r.skill_key);
      const equippedShot = !isLeave ? await getPlayerEquippedShot(playerId, footwork, intent, zone) : null;

      let bowlerSkill = 52;
      if (!isAiOpponent) {
        const oppAttrs = await getEffectiveAttributes(db, duel.opponent_id);
        bowlerSkill = Math.round(((oppAttrs.accuracy || 25) + (oppAttrs.swing || 25)) / 2);
      }

      const duelPitch = state.pitch || 'Flat Belter (Batting Paradise)';
      const maxBalls = state.maxBalls || 6;
      const maxWickets = state.maxWickets || 1;
      const timingProfile = await computeTimingProfile({
        playerId,
        playerAttrs: attrs,
        eqBonuses: eq,
        activeSkills: skills,
        bowlerSkill,
        pitch: duelPitch,
        bat: { balls: state.balls || 0, ballsLimit: maxBalls },
        nextDelivery: deliv
      }, player);
      const parsedNeedle = (needlePos !== null && needlePos !== undefined && needlePos !== '') ? Number(needlePos) : null;
      const timing = isLeave
        ? 'Perfect'
        : resolveBattingTiming(timingQuality, parsedNeedle, timingProfile, player.confidence, skills, (maxBalls - (state.balls || 0)) <= 3);

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
        pitch: duelPitch
      });

      state.runs += sim.runs;
      if (!sim.rebowl) state.balls++;
      if (sim.runs === 4 && !sim.wicket) state.fours++;
      if (sim.runs === 6 && !sim.wicket) state.sixes++;
      if (sim.wicket) state.wickets++;
      state.freeHit = Boolean(sim.nextIsFreeHit);

      const shotName = isLeave ? 'Leave' : (equippedShot ? equippedShot.name : getDerivedShotName(footwork, intent, zone));
      const effectiveDeliv = sim.actualLine && sim.actualLine !== deliv.line
        ? { ...deliv, line: sim.actualLine }
        : { ...deliv };
      const finalZoneName = isLeave ? 'In Line' : (sim.actualZone || zone);
      const timingFeedback = buildTimingFeedback(sim.timing, isLeave ? 50 : parsedNeedle, timingProfile);
      state.lastBall = {
        runs: sim.runs,
        wicket: Boolean(sim.wicket),
        dismissalType: sim.dismissalType || 'not out',
        dismissalDetail: sim.dismissalDetail || '',
        extraType: sim.extraType || '',
        rebowl: Boolean(sim.rebowl),
        timing: sim.timing,
        timingFeedback,
        shotSelection: sim.shotSelection || null,
        shotName,
        footwork,
        intent: isLeave ? 'Leave' : intent,
        stance,
        zone: finalZoneName,
        actualZone: finalZoneName,
        commentary: sim.commentary,
        delivery: effectiveDeliv
      };
      if (!Array.isArray(state.recentBalls)) state.recentBalls = [];
      state.recentBalls.push(
        sim.wicket ? 'W' :
        sim.extraType === 'no_ball' ? 'NB' :
        sim.rebowl ? 'WD' :
        String(sim.runs)
      );
      if (state.recentBalls.length > 6) state.recentBalls = state.recentBalls.slice(-6);

      state.log.unshift(`Ball ${state.balls}: ${effectiveDeliv.length} ${effectiveDeliv.line} ➔ ${shotName} [${timingFeedback.label}] — ${sim.commentary}`);
      state.pendingDelivery = isAiOpponent ? generateBowlerDelivery('Flat Belter (Batting Paradise)', state.aiBowlerType || 'pace') : null;

      const batterWon = state.runs >= state.targetRuns;
      const bowlerWon = state.wickets >= maxWickets || (state.balls >= maxBalls && state.runs < state.targetRuns);

      if (batterWon || bowlerWon) {
        const winnerId = batterWon ? state.batterId : state.bowlerId;
        const loserId = batterWon ? state.bowlerId : state.batterId;
        await db.run(
          "UPDATE web_challenges SET status = 'completed', winner_id = ?, state_json = ?, expires_at = 0, updated_at = datetime('now') WHERE id = ?",
          winnerId, JSON.stringify(state), duel.id
        );

        await db.run('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)', state.batterId);
        await db.run(
          'UPDATE challenge_stats SET played=played+1, won=won+?, lost=lost+?, runs=runs+?, fours=fours+?, sixes=sixes+? WHERE player_id=?',
          batterWon ? 1 : 0, batterWon ? 0 : 1, state.runs, state.fours, state.sixes, state.batterId
        );

        const batterRow = await db.get('SELECT name FROM players WHERE discord_id = ?', state.batterId);
        const bowlerRow = await db.get('SELECT name FROM players WHERE discord_id = ?', state.bowlerId);
        const oversStr = Number((state.balls / 6).toFixed(1));
        const batDismissal = state.wickets > 0 ? 'out' : 'not out';
        await db.run(
          `INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
           VALUES (?, ?, 'Challenge', ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
          state.batterId, bowlerRow?.name || 'PvP Rival', state.runs, state.balls, state.fours, state.sixes, batDismissal, batterWon ? 'Won' : 'Lost'
        );

        if (state.bowlerId !== 'ai_rival') {
          await db.run('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)', state.bowlerId);
          await db.run(
            'UPDATE challenge_stats SET played=played+1, won=won+?, lost=lost+?, wickets=wickets+? WHERE player_id=?',
            bowlerWon ? 1 : 0, bowlerWon ? 0 : 1, state.wickets, state.bowlerId
          );
          await db.run(
            `INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
             VALUES (?, ?, 'Challenge', 0, 0, 0, 0, 'did not bat', ?, ?, ?, ?)`,
            state.bowlerId, batterRow?.name || 'PvP Rival', state.wickets, state.runs, oversStr, bowlerWon ? 'Won' : 'Lost'
          );
        }

        if (winnerId !== 'ai_rival') {
          await db.run('UPDATE players SET coins = coins + 25, reputation = reputation + 5 WHERE discord_id = ?', winnerId);
          await addXP(db, winnerId, 60);
        }
        if (loserId !== 'ai_rival') {
          await addXP(db, loserId, 20);
        }

        await recordSystemLog({
          level: 'MATCH',
          category: 'Challenge',
          actor: player.name,
          target: duel.opponent_id,
          title: `PvP Duel Completed (${batterWon ? 'Batter Won' : 'Bowler Won'})`,
          details: { duelId: duel.id, runs: state.runs, target: state.targetRuns },
          ip
        });

        const completedRow = await db.get(
          `SELECT c.*, p1.name as challenger_name, p1.public_id as challenger_public_id,
                  COALESCE(p2.name, 'AI Challenger Bot') as opponent_name, p2.public_id as opponent_public_id
           FROM web_challenges c
           LEFT JOIN players p1 ON c.challenger_id = p1.discord_id
           LEFT JOIN players p2 ON c.opponent_id = p2.discord_id
           WHERE c.id = ?`,
          duel.id
        );
        return sendJson(res, 200, {
          challenge: await enrichChallengeRow(db, completedRow)
        });
      }

      const nextExp = Date.now() + ACTIVE_CHALLENGE_TTL_MS;
      await db.run("UPDATE web_challenges SET state_json = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(state), nextExp, duel.id);
      const refreshed = await db.get(
        `SELECT c.*, p1.name as challenger_name, p1.public_id as challenger_public_id,
                COALESCE(p2.name, 'AI Challenger Bot') as opponent_name, p2.public_id as opponent_public_id
         FROM web_challenges c
         LEFT JOIN players p1 ON c.challenger_id = p1.discord_id
         LEFT JOIN players p2 ON c.opponent_id = p2.discord_id
         WHERE c.id = ?`,
        duel.id
      );
      return sendJson(res, 200, { challenge: await enrichChallengeRow(db, refreshed) });
    }
  }

  return false;
}
