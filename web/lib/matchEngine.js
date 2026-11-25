import db from '../../src/database/db.js';
import {
  generateBowlerDelivery,
  getReleaseHint,
  getPlayerBattingPosition,
  getDerivedShotName,
  simulateBallAdvanced
} from '../../src/game/engine.js';
import { getPlayerEquippedShot } from '../../src/game/shotmap.js';
import { getPlayerChapters } from '../../src/game/chapters.js';
import { BowlingAttackManager } from '../../src/game/bowlingAttack.js';
import {
  QUICK_MATCH_CONFIG,
  getTournamentById,
  getTeamRoster,
  getTeamBowlers,
  advanceBracket
} from '../../src/game/tournaments.js';
import {
  franchiseLeagues,
  getFranchiseTeamRoster,
  getFranchiseTeamBowlers
} from '../../src/game/franchiseLeagues.js';
import {
  getEffectiveAttributes,
  getEquipmentBonuses,
  updateAndGetEnergy,
  consumeEnergy,
  addXP
} from '../../src/game/utils.js';
import { getPlayerEvent } from '../../src/game/events.js';
import { recordSystemLog } from '../../src/game/systemLog.js';
import { getPlayerTier, PITCH_TYPES } from './helpers.js';

// In-memory active web match sessions keyed by player.discord_id
const activeMatches = new Map();
const MATCH_IDLE_TIMEOUT_MS = 45 * 60 * 1000; // Auto-end inactive matches after 45 minutes

export function sweepExpiredWebMatches() {
  const now = Date.now();
  for (const [pid, match] of activeMatches.entries()) {
    const lastTs = match.lastActivityAt || match.startedAt || now;
    if (now - lastTs > MATCH_IDLE_TIMEOUT_MS) {
      if (!match.finished) {
        recordSystemLog({
          level: 'WARN',
          category: 'Match',
          actor: match.playerName || pid,
          target: match.opponent,
          title: `Match Auto-Ended on Inactivity Timeout (${match.mode.toUpperCase()})`,
          details: `${match.title}`
        });
      }
      activeMatches.delete(pid);
    }
  }
}

setInterval(() => {
  try { sweepExpiredWebMatches(); } catch {}
}, 60 * 1000).unref();

function randomPitch() {
  return PITCH_TYPES[Math.floor(Math.random() * PITCH_TYPES.length)];
}

function getPartnerName(roster, playerName, idx = 0) {
  const valid = (roster || []).filter(p => p !== playerName);
  return valid[idx % Math.max(1, valid.length)] || 'Team Partner';
}

function getPlayerHandShort(name = '') {
  const leftHints = ['Warne', 'Narine', 'Jadeja', 'Pant', 'Warner', 'De Kock', 'Boult', 'Starc', 'Curran', 'Dhawan', 'Ishan', 'Tilak', 'Jaiswal', 'Rinku', 'Ashwin', 'Gayle', 'Pooran', 'Stokes', 'Gautam', 'Head', 'Khawaja', 'Conway', 'Fakhar', 'Shaheen', 'Kuldeep', 'Axar'];
  return leftHints.some(h => name.includes(h)) ? 'Left-hand bat' : 'Right-hand bat';
}

export function computeTimingProfile(match, playerOpt = null) {
  const player = playerOpt || db.prepare('SELECT confidence, form FROM players WHERE discord_id = ?').get(match.playerId) || { confidence: 50, form: 50 };
  const attrs = match.playerAttrs || {};
  const eq = match.eqBonuses || {};
  const skills = match.activeSkills || [];
  const deliv = match.nextDelivery || {};

  const eqTimingBonus = (eq.timing || 0) + Math.round((eq.technique || 0) * 0.45);
  const confidence = Number(player.confidence ?? 50);
  const form = Number(player.form ?? 50);
  const isClutch = (match.bat?.ballsLimit || 18) - (match.bat?.balls || 0) <= 5;
  const isSpin = deliv.speed === 'Slow' || Boolean(match.isSpinOpponent);

  let skillBonus = 0;
  if (isClutch && skills.includes('clutch_finisher')) skillBonus += 8;
  if (isSpin && skills.includes('spin_specialist')) skillBonus += 6;
  if (!isSpin && skills.includes('pace_destroyer')) skillBonus += 5;

  const playerEdge = Math.round(
    (attrs.timing || 15) * 0.55 +
    (attrs.technique || 15) * 0.25 +
    eqTimingBonus * 1.15 +
    (confidence - 50) * 0.14 +
    (form - 50) * 0.10 +
    skillBonus
  );

  const bowlerSkill = match.bowlerSkill || 45;
  const speedThreat = deliv.speed === 'Fast' ? 12 : deliv.speed === 'Slow' ? 5 : 7;
  const varName = String(deliv.variation || '');
  const varThreat = ['Googly', 'Doosra', 'Knuckle', 'Flipper', 'Reverse', 'Slower'].some(v => varName.includes(v))
    ? 8
    : ['Swing', 'Seam', 'Cutter', 'Drift', 'Inswinger', 'Outswinger'].some(v => varName.includes(v))
      ? 4
      : 0;
  const pitchThreat = (match.pitch === 'Green Seamer' || match.pitch === 'Dusty Turn') ? 3 : 0;

  const bowlerThreat = Math.round(bowlerSkill * 0.42 + speedThreat + varThreat + pitchThreat);
  const netDiff = playerEdge - bowlerThreat;

  const sweetHalf = Math.round(Math.min(24, Math.max(12.5, 17 + netDiff * 0.14)) * 10) / 10;
  const goodHalf = Math.round(Math.min(44, Math.max(34, sweetHalf + 21)) * 10) / 10;
  const needleSpeed = Math.round(Math.min(1.08, Math.max(0.55, 0.80 - netDiff * 0.0042)) * 100) / 100;

  return {
    sweetHalf,
    goodHalf,
    needleSpeed,
    eqTimingBonus,
    playerEdge,
    bowlerThreat,
    bowlerSkill,
    deliverySpeed: deliv.speed || 'Medium',
    deliveryVariation: deliv.variation || 'Normal'
  };
}

function resolveBattingTiming(timingChoice, needlePos, timingProfile, confidence, activeSkills, isClutch) {
  if (typeof needlePos === 'number' && !Number.isNaN(needlePos)) {
    const dist = Math.abs(needlePos - 50);
    if (dist <= timingProfile.sweetHalf) return 'Perfect';
    if (dist <= timingProfile.goodHalf) return needlePos < 50 ? 'Slightly Early' : 'Slightly Late';
    return needlePos < 50 ? 'Very Early' : 'Very Late';
  }

  const validChoices = ['Perfect', 'Slightly Early', 'Slightly Late', 'Very Early', 'Very Late'];
  if (timingChoice && validChoices.includes(timingChoice)) {
    return timingChoice;
  }

  // Automatic timing roll weighted by equipment-vs-bowler profile, confidence & skills
  const netEdge = (timingProfile?.playerEdge || 25) - (timingProfile?.bowlerThreat || 25);
  const confFactor = ((confidence ?? 50) - 50) * 0.002;
  const clutchBonus = (isClutch && activeSkills.includes('clutch_finisher')) ? 0.10 : 0;
  const perfectChance = Math.min(0.80, Math.max(0.30, 0.44 + (netEdge * 0.0055) + confFactor + clutchBonus));
  const slightChance = Math.min(0.96, perfectChance + 0.40);

  const roll = Math.random();
  if (roll < perfectChance) return 'Perfect';
  if (roll < slightChance) return Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
  return Math.random() < 0.5 ? 'Very Early' : 'Very Late';
}

function simulateAITeammateFinish(runsScored, currentTeamRuns, targetRuns, oversDone, totalOvers, wicketsLost) {
  let simRuns = currentTeamRuns;
  let simWickets = wicketsLost;
  let simOvers = oversDone;
  const events = [];

  while (simOvers < totalOvers && simWickets < 10 && simRuns < targetRuns) {
    simOvers++;
    const overRuns = 5 + Math.floor(Math.random() * 8);
    simRuns += overRuns;
    if (Math.random() < 0.28) {
      simWickets++;
    }
    events.push(`Over ${simOvers}: Team ${simRuns}/${simWickets}`);
  }
  return { finalRuns: simRuns, finalWickets: simWickets, finalOvers: simOvers, events };
}

export function getActiveWebMatch(playerId) {
  sweepExpiredWebMatches();
  const m = activeMatches.get(playerId);
  if (!m) return null;
  return serializeMatchState(m);
}

export function clearActiveWebMatch(playerId) {
  activeMatches.delete(playerId);
}

function buildInitialReleaseCue(d) {
  if (!d) return '👀 *Bowler walks back to the mark...*';
  const spd = d.speed === 'Fast'
    ? 'steams in rapidly from the boundary'
    : d.speed === 'Slow'
      ? 'trots in with a slow, loopy rhythm'
      : 'glides in with a measured run-up';
  const v = String(d.variation || '').toLowerCase();
  let gripHint = '';
  if (v.includes('googly') || v.includes('doosra') || v.includes('mystery')) gripHint = ' — wrist snaps subtly behind the hand';
  else if (v.includes('swing') || v.includes('seam')) gripHint = ' — shiny side polished, upright seam visible';
  else if (v.includes('cutter') || v.includes('slower') || v.includes('knuckle')) gripHint = ' — fingers roll carefully across the leather';
  else if (v.includes('spin') || v.includes('leg-break') || v.includes('off-break')) gripHint = ' — giving the ball extra air & revs';
  return `👀 **Initial Release Hint:** The bowler ${spd}${gripHint}. *Commit your Stance, Footwork & Intent before reading the pitch!*`;
}

function buildFullDeliveryReveal(d) {
  if (!d) return '';
  return `🥎 **Full Delivery Read:** **${d.speed} ${d.variation}** pitched **${d.length}** on **${d.line}**!`;
}

function prepareNextDelivery(match) {
  if (match.phase !== 'batting') return;
  const bowlerType = match.attack ? match.attack.getCurrentBowler()?.type : null;
  const d = generateBowlerDelivery(match.pitch, bowlerType);
  match.nextDelivery = d;
  match.releaseHint = getReleaseHint(d.line, d.length, d.speed, d.variation);
  match.releaseCue = buildInitialReleaseCue(d);
  match.fullDeliveryReveal = buildFullDeliveryReveal(d);
}

function serializeMatchState(match) {
  const isAllRounder = match.role === 'All-Rounder';
  const ballsUsed = match.phase === 'batting' ? match.bat.balls : match.bowl.ballsBowled;
  const ppOvers = match.totalOvers >= 15 ? 6 : match.totalOvers >= 5 ? 2 : 1;
  const completedOvers = match.attack ? match.attack.completedOvers : Math.floor(ballsUsed / 6);
  const isPowerplay = completedOvers < ppOvers;
  const curBowler = match.attack ? match.attack.getCurrentBowler() : {
    name: match.opponent,
    style: match.isSpinOpponent ? 'Spin Specialist' : 'Pace Attack',
    oversBowled: Math.floor(ballsUsed / 6),
    ballsBowled: ballsUsed,
    runsConceded: match.teamRuns || match.bat.runs,
    wicketsTaken: match.bat.wickets || 0
  };

  return {
    id: match.id,
    mode: match.mode,
    title: match.title,
    opponent: match.opponent,
    userTeam: match.userTeam,
    pitch: match.pitch,
    difficulty: match.difficulty,
    role: match.role,
    phase: match.phase, // 'batting' | 'bowling'
    finished: match.finished,
    battingHand: match.battingHand,
    oppBatterHand: match.oppBatterHand || 'Right-hand bat',
    isSpinBowler: match.isSpinBowler,
    totalOvers: match.totalOvers,
    currentOverText: match.attack
      ? `${match.attack.completedOvers}.${match.attack.ballsInOver}`
      : `${Math.floor(ballsUsed / 6)}.${ballsUsed % 6}`,
    batting: {
      runs: match.bat.runs,
      balls: match.bat.balls,
      ballsLimit: match.bat.ballsLimit,
      fours: match.bat.fours,
      sixes: match.bat.sixes,
      wickets: match.bat.wickets,
      targetRuns: match.bat.targetRuns,
      freeHit: match.bat.freeHit,
      teamRuns: match.bat.teamRuns,
      teamWickets: match.bat.teamWickets,
      partnerName: match.bat.partnerName,
      partnerRuns: match.bat.partnerRuns,
      partnerBalls: match.bat.partnerBalls
    },
    bowling: {
      runsConceded: match.bowl.runsConceded,
      ballsBowled: match.bowl.ballsBowled,
      ballsLimit: match.bowl.ballsLimit,
      wicketsTaken: match.bowl.wicketsTaken,
      targetRuns: match.bowl.targetRuns
    },
    bowler: curBowler,
    bowlersCard: match.attack ? match.attack.bowlers : [],
    releaseHint: match.releaseHint,
    releaseCue: match.releaseCue || buildInitialReleaseCue(match.nextDelivery),
    fullDeliveryReveal: match.fullDeliveryReveal || buildFullDeliveryReveal(match.nextDelivery),
    timingProfile: match.phase === 'batting' ? computeTimingProfile(match) : null,
    fieldPreset: match.phase === 'batting' ? (match.nextDelivery?.fieldPreset || 'Balanced') : (match.lastFieldPreset || 'Balanced'),
    isPowerplay,
    lastBall: match.lastBall,
    recentBalls: (match.ballHistory || []).slice(-6),
    commentaryLog: match.commentaryLog.slice(0, 20),
    resultSummary: match.resultSummary,
    storyEvent: match.storyEvent ? {
      id: match.storyEvent.id,
      title: match.storyEvent.title,
      description: match.storyEvent.description,
      choices: match.storyEvent.choices.map((c, idx) => ({ index: idx, label: c.label }))
    } : null,
    isAllRounder
  };
}

export function startWebMatch(playerId, options = {}) {
  sweepExpiredWebMatches();
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(playerId);
  if (!player) throw new Error('Create your cricketer first before starting a match.');

  if (activeMatches.has(playerId)) {
    const existing = activeMatches.get(playerId);
    if (existing.finished) {
      activeMatches.delete(playerId);
    } else if (options.resume) {
      return serializeMatchState(existing);
    } else {
      throw new Error(`You already have a live match in progress (${existing.title}). Resume or forfeit it before starting a new match!`);
    }
  }

  const { mode = 'practice', tournamentTeamId = null } = options;
  const playerAttrs = getEffectiveAttributes(db, playerId);
  const eqBonuses = getEquipmentBonuses(db, playerId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(playerId).map(s => s.skill_key);
  const currentEnergy = updateAndGetEnergy(db, playerId);

  let matchConfig = null;
  let extraMeta = {};

  if (mode === 'chapter') {
    if (currentEnergy < 15) throw new Error(`Not enough energy (${currentEnergy}/100). Need 15 Energy.`);
    if (player.current_chapter > 50) throw new Error('You have completed all 50 Career Chapters! Try Practice, Tournaments, or Franchise League.');
    const chList = getPlayerChapters(player, db);
    const ch = chList.find(c => c.id === player.current_chapter);
    let reqLevel = 1, reqRep = 0, tierName = 'Academy';
    if (ch.id >= 6 && ch.id <= 12) { reqLevel = 3; tierName = 'Local Club'; }
    else if (ch.id >= 13 && ch.id <= 18) { reqLevel = 7; reqRep = 100; tierName = 'District League'; }
    else if (ch.id >= 19 && ch.id <= 28) { reqLevel = 12; reqRep = 400; tierName = 'State First-Class'; }
    else if (ch.id >= 29 && ch.id <= 38) { reqLevel = 18; reqRep = 800; tierName = 'T20 Franchise'; }
    else if (ch.id >= 39) { reqLevel = 28; reqRep = 1800; tierName = 'International'; }

    if (player.level < reqLevel || player.reputation < reqRep) {
      throw new Error(`Selection denied for ${tierName} (Chapter ${ch.id}): Requires Level ${reqLevel} & ${reqRep} Rep.`);
    }

    consumeEnergy(db, playerId, 15);
    matchConfig = {
      mode: 'chapter',
      title: `Chapter ${ch.id}: ${ch.name}`,
      opponent: ch.opponent,
      userTeam: `${player.name}'s XI`,
      difficulty: ch.difficulty,
      bowlerSkill: ch.bowlerSkill,
      targetRuns: ch.objective.target,
      ballsLimit: ch.objective.balls,
      totalOvers: Math.ceil(ch.objective.balls / 6),
      pitch: ch.pitchCondition,
      rewardXP: ch.rewards.xp,
      rewardCoins: ch.rewards.coins,
      chapterUnlockItem: ch.rewards.itemUnlock || null,
      chapterUnlockMsg: ch.rewards.message || ''
    };
  } else if (mode === 'practice') {
    if (currentEnergy < 15) throw new Error(`Not enough energy (${currentEnergy}/100). Need 15 Energy.`);
    consumeEnergy(db, playerId, 15);
    const lvl = player.level;
    matchConfig = {
      mode: 'practice',
      title: `Practice Nets Simulation (LVL ${lvl})`,
      opponent: `Practice Attack (LVL ${lvl})`,
      userTeam: `${player.name}'s Nets XI`,
      difficulty: 'Medium',
      bowlerSkill: Math.min(100, lvl * 4 + 10),
      targetRuns: lvl * 3 + 12,
      ballsLimit: 12,
      totalOvers: 2,
      pitch: randomPitch(),
      rewardXP: lvl * 20 + 50,
      rewardCoins: lvl * 10 + 20
    };
  } else if (mode === 'quick') {
    if (currentEnergy < 10) throw new Error(`Not enough energy (${currentEnergy}/100). Need 10 Energy.`);
    consumeEnergy(db, playerId, 10);
    const teams = QUICK_MATCH_CONFIG.teams;
    const compTeam = teams.find(t => t.id === tournamentTeamId) || teams[Math.floor(Math.random() * teams.length)];
    const pitch = randomPitch();
    const target = Math.max(30, Math.round(QUICK_MATCH_CONFIG.overs * 8.5 + (compTeam.rating / 12)) + Math.floor(Math.random() * 8) - 4);
    const attack = new BowlingAttackManager(compTeam.bowlers, QUICK_MATCH_CONFIG.overs, pitch);

    matchConfig = {
      mode: 'quick',
      title: `Quick Exhibition vs ${compTeam.name}`,
      opponent: compTeam.name,
      userTeam: `${player.name}'s XI`,
      difficulty: compTeam.difficulty,
      bowlerSkill: compTeam.bowlerSkill,
      targetRuns: target,
      ballsLimit: QUICK_MATCH_CONFIG.balls,
      totalOvers: QUICK_MATCH_CONFIG.overs,
      pitch,
      rewardXP: QUICK_MATCH_CONFIG.winXP,
      lossXP: QUICK_MATCH_CONFIG.lossXP,
      rewardCoins: 0,
      attack,
      roster: compTeam.roster
    };
  } else if (mode === 'tournament') {
    if (currentEnergy < 15) throw new Error(`Not enough energy (${currentEnergy}/100). Need 15 Energy.`);
    const activeRun = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(playerId);
    if (!activeRun) throw new Error('No active tournament run found. Enter a tournament first!');
    const tournament = getTournamentById(activeRun.tournament_id);
    if (!tournament) throw new Error('Tournament configuration missing.');
    const bracket = JSON.parse(activeRun.bracket_json);
    const round = bracket.rounds[bracket.roundIndex];
    const userMatch = round.matches.find(m => m.isUserMatch);
    const oppTeam = tournament.teams.find(t => t.name === userMatch.team2) || { name: userMatch.team2, rating: 65 };
    consumeEnergy(db, playerId, 15);

    const pitch = randomPitch();
    const totalOvers = tournament.overs || 20;
    const ballsLimit = totalOvers * 6;
    const baseTarget = totalOvers === 20
      ? (150 + Math.floor(Math.random() * 35) + Math.round((oppTeam.rating || 75) / 5))
      : Math.round(totalOvers * 9.5 + ((oppTeam.rating || 65) / 10));
    const targetRuns = Math.max(20, baseTarget + Math.floor(Math.random() * 7) - 3);
    const oppBowlers = getTeamBowlers(tournament.id, oppTeam.name);
    const attack = new BowlingAttackManager(oppBowlers, totalOvers, pitch);
    const roster = getTeamRoster(tournament.id, activeRun.user_team) || [];

    matchConfig = {
      mode: 'tournament',
      title: `${tournament.name} — ${round.name}`,
      opponent: oppTeam.name,
      userTeam: activeRun.user_team,
      difficulty: tournament.difficulty,
      bowlerSkill: tournament.bowlerSkill,
      targetRuns,
      ballsLimit,
      totalOvers,
      pitch,
      rewardXP: Math.round(tournament.rewards.xp * 0.35),
      rewardCoins: Math.round(tournament.rewards.coins * 0.25),
      attack,
      roster
    };
    extraMeta = { tournament, activeRun, bracket };
  } else if (mode === 'franchise') {
    const pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId);
    if (!pf || pf.status !== 'active') throw new Error('No active franchise contract. Register and complete an auction first.');
    const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];
    if (pf.current_round > league.seasonLength + 2) throw new Error('Season matches finished! Click Finish Season & Collect Awards.');
    const userTeam = league.teams.find(t => t.id === pf.team_id) || league.teams[0];
    const otherTeams = league.teams.filter(t => t.id !== userTeam.id);

    let oppTeam = null;
    if (pf.current_round <= league.seasonLength) {
      oppTeam = otherTeams[(pf.current_round - 1) % otherTeams.length] || otherTeams[0];
    } else {
      const standings = db.prepare('SELECT team_id FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC').all(playerId);
      const userRank = standings.findIndex(s => s.team_id === pf.team_id) + 1;
      if (userRank > 4) throw new Error(`Your team finished #${userRank} and missed Top-4 Playoffs. Click Complete Season.`);
      if (pf.current_round === league.seasonLength + 1) {
        const oppIdx = userRank === 1 ? 3 : userRank === 2 ? 2 : userRank === 3 ? 1 : 0;
        oppTeam = league.teams.find(t => t.id === standings[oppIdx]?.team_id) || otherTeams[0];
      } else {
        const finalOppId = standings[0]?.team_id === pf.team_id ? standings[1]?.team_id : standings[0]?.team_id;
        oppTeam = league.teams.find(t => t.id === finalOppId) || otherTeams[0];
      }
    }

    // Playing XI selection check
    const roleStr = pf.contract_role || 'Emerging Player';
    let selected = true;
    if (roleStr.includes('Bench')) {
      let chance = Math.max(15, Math.min(90, 50 + (player.form - 50) * 0.5 + (player.confidence - 50) * 0.3));
      selected = (((pf.current_round || 1) * 13 + player.level) % 100) < chance;
    } else if (!roleStr.includes('Marquee') && !roleStr.includes('Starter')) {
      selected = player.form >= 25;
    }

    if (!selected) {
      // Benched simulation
      const won = Math.random() < 0.5;
      db.prepare('UPDATE player_franchise SET current_round = current_round + 1 WHERE player_id = ?').run(playerId);
      if (pf.current_round <= league.seasonLength) {
        db.prepare('UPDATE franchise_standings SET played=played+1, won=won+?, lost=lost+?, points=points+?, nrr=nrr+? WHERE player_id=? AND team_id=?')
          .run(won ? 1 : 0, won ? 0 : 1, won ? 2 : 0, won ? 0.35 : -0.35, playerId, pf.team_id);
        db.prepare('UPDATE franchise_standings SET played=played+1, won=won+?, lost=lost+?, points=points+?, nrr=nrr+? WHERE player_id=? AND team_id=?')
          .run(won ? 0 : 1, won ? 1 : 0, won ? 0 : 2, won ? -0.35 : 0.35, playerId, oppTeam.id);
        simulateOtherFranchiseFixtures(playerId, pf.league_id, pf.team_id, oppTeam.id);
      }
      return {
        benched: true,
        won,
        opponent: oppTeam.name,
        userTeam: userTeam.name,
        message: `You were rested/benched for Round ${pf.current_round} vs ${oppTeam.name}. Result: ${won ? userTeam.name : oppTeam.name} won!`
      };
    }

    if (currentEnergy < 15) throw new Error(`Not enough energy (${currentEnergy}/100). Need 15 Energy.`);
    consumeEnergy(db, playerId, 15);

    const pitch = randomPitch();
    let firstRuns = 165 + Math.floor(Math.random() * 26);
    if (pitch.includes('Flat Belter')) firstRuns = 185 + Math.floor(Math.random() * 35);
    else if (pitch.includes('Green') || pitch.includes('Turning')) firstRuns = 140 + Math.floor(Math.random() * 30);
    else if (pitch.includes('Damp')) firstRuns = 132 + Math.floor(Math.random() * 26);

    const oppBowlers = getFranchiseTeamBowlers(pf.league_id, oppTeam.id || oppTeam.name);
    const attack = new BowlingAttackManager(oppBowlers, 20, pitch);
    const roster = getFranchiseTeamRoster(pf.league_id, userTeam.id || userTeam.name);

    const roundLabel = pf.current_round > league.seasonLength
      ? (pf.current_round === league.seasonLength + 1 ? 'Semi-Final' : 'Grand Final')
      : `Round ${pf.current_round}/${league.seasonLength}`;

    matchConfig = {
      mode: 'franchise',
      title: `${league.shortName} ${roundLabel}: ${userTeam.short} vs ${oppTeam.short}`,
      opponent: oppTeam.name,
      userTeam: userTeam.name,
      difficulty: league.difficulty,
      bowlerSkill: Math.min(85, 45 + player.level * 3),
      targetRuns: firstRuns + 1,
      ballsLimit: 120,
      totalOvers: 20,
      pitch,
      rewardXP: 100 + player.level * 10,
      rewardCoins: 0,
      attack,
      roster
    };
    extraMeta = { pf, league, userTeam, oppTeam };
  } else {
    throw new Error(`Unknown match mode: ${mode}`);
  }

  const role = player.primary_role;
  const isAllRounder = role === 'All-Rounder';
  const isBowlerOnly = role.toLowerCase().includes('bowl') && !isAllRounder;
  const isSpinBowler = (player.bowling_style || '').toLowerCase().includes('spin');

  // Determine batting vs bowling balls limits
  let batBallsLimit = matchConfig.ballsLimit;
  let batTarget = matchConfig.targetRuns;
  let bowlBallsLimit = matchConfig.ballsLimit;
  let bowlTarget = matchConfig.targetRuns;

  if (isAllRounder) {
    if (matchConfig.mode === 'chapter' || matchConfig.mode === 'practice') {
      batBallsLimit = Math.max(3, Math.ceil(matchConfig.ballsLimit / 2));
      bowlBallsLimit = Math.max(3, matchConfig.ballsLimit - batBallsLimit);
      batTarget = Math.max(5, Math.round(matchConfig.targetRuns * (batBallsLimit / matchConfig.ballsLimit)));
    } else {
      batBallsLimit = Math.min(matchConfig.ballsLimit, 60);
      bowlBallsLimit = Math.min(24, matchConfig.ballsLimit);
    }
  }

  // Pre-entry simulation for multi-over matches (Tournaments & Franchise)
  let preRuns = 0;
  let preWickets = 0;
  let preOvers = 0;
  const preNotes = [];
  if ((matchConfig.mode === 'tournament' || matchConfig.mode === 'franchise') && !isBowlerOnly) {
    const pos = getPlayerBattingPosition(player, db);
    if (pos.targetWickets > 0) {
      preOvers = Math.min(matchConfig.totalOvers - 2, Math.max(1, pos.targetWickets * 2));
      for (let ov = 1; ov <= preOvers; ov++) {
        preRuns += 6 + Math.floor(Math.random() * 6);
        if (preWickets < pos.targetWickets && (ov >= 2 || Math.random() < 0.45)) preWickets++;
      }
      if (preWickets < pos.targetWickets) preWickets = pos.targetWickets;
      if (matchConfig.attack) {
        matchConfig.attack.simulatePreEntry(preOvers, preRuns, preWickets);
      }
      preNotes.push(`Team was ${preRuns}/${preWickets} after ${preOvers}.0 overs when you walked in at No. ${pos.battingPos} (${pos.label}).`);
    }
  }

  const partnerName = getPartnerName(matchConfig.roster, player.name, preWickets);
  const partnerRuns = preOvers > 0 ? Math.max(0, Math.floor(preRuns * 0.42)) : 0;
  const partnerBalls = partnerRuns > 0 ? Math.max(partnerRuns, Math.floor(partnerRuns * 0.85)) : 0;

  const matchState = {
    id: `${matchConfig.mode}_${Date.now()}`,
    playerId,
    playerName: player.name,
    role,
    battingHand: player.batting_hand || 'Right-hand bat',
    oppBatterHand: Math.random() < 0.35 ? 'Left-hand bat' : 'Right-hand bat',
    isSpinBowler,
    ...matchConfig,
    extraMeta,
    playerAttrs,
    eqBonuses,
    activeSkills,
    phase: isBowlerOnly ? 'bowling' : 'batting',
    finished: false,
    bat: {
      runs: 0,
      balls: 0,
      ballsLimit: batBallsLimit,
      fours: 0,
      sixes: 0,
      wickets: 0,
      targetRuns: batTarget,
      freeHit: false,
      teamRuns: preRuns,
      teamWickets: preWickets,
      partnerName,
      partnerRuns,
      partnerBalls
    },
    bowl: {
      runsConceded: 0,
      ballsBowled: 0,
      ballsLimit: bowlBallsLimit,
      wicketsTaken: 0,
      targetRuns: bowlTarget
    },
    lastFieldPreset: 'Balanced',
    lastBall: null,
    ballHistory: [],
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    commentaryLog: preNotes.length > 0 ? preNotes : [`Match started on ${matchConfig.pitch} against ${matchConfig.opponent}.`],
    resultSummary: null,
    storyEvent: null
  };

  prepareNextDelivery(matchState);
  activeMatches.set(playerId, matchState);

  recordSystemLog({
    level: 'MATCH',
    category: 'Match',
    actor: player.name,
    target: matchConfig.opponent,
    title: `Match Started (${matchConfig.mode.toUpperCase()})`,
    details: `${matchConfig.title} | Pitch: ${matchConfig.pitch}`
  });

  return serializeMatchState(matchState);
}

export function playWebMatchBall(playerId, action = {}) {
  sweepExpiredWebMatches();
  const match = activeMatches.get(playerId);
  if (!match) throw new Error('No active match found (or it timed out from inactivity).');
  if (match.finished) return serializeMatchState(match);
  match.lastActivityAt = Date.now();

  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(playerId);
  if (!player) throw new Error('Player profile missing.');

  if (match.phase === 'batting') {
    const { stance = 'In Line', footwork = 'Front Foot', intent = 'Stroke', zone = 'Cover', timingQuality = null, needlePos = null } = action;
    const isLeave = footwork === 'Leave' || intent === 'Leave';
    const equippedShot = !isLeave
      ? getPlayerEquippedShot(playerId, footwork, intent, zone)
      : getPlayerEquippedShot(playerId, footwork !== 'Leave' ? footwork : 'Front Foot', 'Leave', 'In Line');

    const deliv = match.nextDelivery;
    const isClutch = (match.bat.ballsLimit - match.bat.balls) <= 5;
    const ppOvers = match.totalOvers >= 15 ? 6 : match.totalOvers >= 5 ? 2 : 1;
    const completedOvers = match.attack ? match.attack.completedOvers : Math.floor(match.bat.balls / 6);
    const isPowerplay = completedOvers < ppOvers;
    const timingProfile = computeTimingProfile(match, player);
    const parsedNeedle = (needlePos !== null && needlePos !== undefined && needlePos !== '') ? Number(needlePos) : null;
    const timingResult = isLeave
      ? 'Perfect'
      : resolveBattingTiming(timingQuality, parsedNeedle, timingProfile, player.confidence, match.activeSkills, isClutch);

    const simResult = simulateBallAdvanced({
      bowlerInput: {
        line: deliv.line,
        length: deliv.length,
        variation: deliv.variation,
        speed: deliv.speed,
        fieldPreset: deliv.fieldPreset
      },
      batterInput: {
        stance,
        footwork,
        intent,
        zone: isLeave ? 'In Line' : zone,
        targetZone: isLeave ? 'In Line' : zone,
        equippedShot
      },
      timingResult,
      playerAttrs: match.playerAttrs,
      eqBonuses: match.eqBonuses,
      activeSkills: match.activeSkills,
      confidence: player.confidence,
      bowlerSkill: match.bowlerSkill,
      isFreeHit: match.bat.freeHit,
      isClutch,
      isPowerplay,
      pitch: match.pitch
    });

    match.bat.runs += simResult.runs;
    match.bat.teamRuns += simResult.runs;
    if (simResult.runs === 4 && !simResult.wicket) match.bat.fours++;
    if (simResult.runs === 6 && !simResult.wicket) match.bat.sixes++;
    if (!simResult.rebowl) {
      match.bat.balls++;
      if (match.bat.runs > 0 && simResult.runs % 2 === 1 && match.bat.partnerRuns >= 0) {
        // Partner rotates strike slightly on odd runs
        const partnerGain = Math.random() < 0.4 ? 1 : 0;
        match.bat.partnerRuns += partnerGain;
        match.bat.teamRuns += partnerGain;
        match.bat.partnerBalls += partnerGain > 0 ? 1 : 0;
      }
    }
    if (simResult.wicket) {
      match.bat.wickets++;
      match.bat.teamWickets++;
    }
    match.bat.freeHit = Boolean(simResult.nextIsFreeHit);

    // Update bowling attack over rotation
    let overMsg = '';
    if (match.attack) {
      match.attack.recordBall(simResult.runs, simResult.wicket, simResult.rebowl);
      if (match.attack.ballsInOver >= 6) {
        const res = match.attack.completeOver();
        if (res.nextBowler) {
          overMsg = ` End of Over ${res.completedOverNum}! ${res.nextBowler.name} enters the attack.`;
        }
      }
    }

    // Update player confidence
    let confChange = -1;
    if (simResult.runs >= 4) confChange = 6;
    else if (simResult.runs > 0) confChange = 2;
    else if (simResult.wicket) confChange = match.activeSkills.includes('ice_veins') ? 0 : -15;
    player.confidence = Math.min(100, Math.max(10, player.confidence + confChange));
    db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, playerId);

    const shotName = isLeave
      ? 'Shouldered Arms (Leave)'
      : (equippedShot ? `${equippedShot.num} ${equippedShot.name}` : getDerivedShotName(footwork, intent, zone));

    const entry = `${deliv.length} on ${deliv.line} (${deliv.speed} ${deliv.variation}) ➔ ${shotName} [${simResult.timing}] — ${simResult.commentary}${overMsg}`;
    match.commentaryLog.unshift(entry);
    match.ballHistory = match.ballHistory || [];
    match.ballHistory.push(simResult.wicket ? 'W' : simResult.rebowl ? 'WD' : String(simResult.runs));
    match.lastBall = {
      runs: simResult.runs,
      wicket: simResult.wicket,
      rebowl: simResult.rebowl,
      freeHitNext: match.bat.freeHit,
      timing: simResult.timing,
      shotName,
      delivery: deliv,
      commentary: simResult.commentary
    };

    const maxBallsTotal = match.totalOvers * 6;
    const teamBallsUsed = match.attack ? (match.attack.completedOvers * 6 + match.attack.ballsInOver) : match.bat.balls;
    const chasedTarget = match.bat.teamRuns >= match.bat.targetRuns || (match.role !== 'All-Rounder' && match.bat.runs >= match.bat.targetRuns);
    const outOrEnded = match.bat.wickets >= 1 || match.bat.balls >= match.bat.ballsLimit || teamBallsUsed >= maxBallsTotal;

    if (match.role === 'All-Rounder') {
      if (match.bat.wickets >= 1 || match.bat.balls >= match.bat.ballsLimit) {
        // Transition to Phase 2: Bowling!
        match.phase = 'bowling';
        if (match.mode === 'chapter' || match.mode === 'practice') {
          const par = Math.round(match.targetRuns * (match.bowl.ballsLimit / match.ballsLimit));
          match.bowl.targetRuns = Math.max(par + 1, match.bat.runs + 1);
        } else {
          match.bowl.targetRuns = Math.max(24, Math.round(match.bowl.ballsLimit * 1.45) + (match.bat.runs >= 35 ? 4 : 0));
        }
        match.commentaryLog.unshift(`🥎 PHASE 2 BOWLING BEGINS! Defend ${match.bowl.targetRuns - 1} runs in ${match.bowl.ballsLimit} balls!`);
      } else {
        prepareNextDelivery(match);
      }
    } else if (chasedTarget || outOrEnded) {
      let won = chasedTarget;
      // In team modes (tournament/franchise), if user got out before target, teammates try to finish the chase!
      if (!won && match.bat.wickets >= 1 && (match.mode === 'tournament' || match.mode === 'franchise')) {
        const oversDone = Math.ceil(teamBallsUsed / 6);
        const simTeam = simulateAITeammateFinish(
          match.bat.runs,
          match.bat.teamRuns,
          match.bat.targetRuns,
          oversDone,
          match.totalOvers,
          match.bat.teamWickets
        );
        match.bat.teamRuns = simTeam.finalRuns;
        match.bat.teamWickets = simTeam.finalWickets;
        won = simTeam.finalRuns >= match.bat.targetRuns;
        match.commentaryLog.unshift(won
          ? `🎉 After your dismissal, teammates finished the chase at ${simTeam.finalRuns}/${simTeam.finalWickets}!`
          : `💔 After your dismissal, team finished at ${simTeam.finalRuns}/${simTeam.finalWickets} and fell short of ${match.bat.targetRuns}.`
        );
      }
      finalizeWebMatch(match, player, won);
    } else {
      prepareNextDelivery(match);
    }
  } else if (match.phase === 'bowling') {
    const {
      line = 'Stumps',
      length = 'Good Length',
      variation = 'Normal Delivery',
      fieldPreset = 'Balanced',
      speed = match.isSpinBowler ? 'Slow' : 'Fast'
    } = action;

    match.lastFieldPreset = fieldPreset;

    const aiIntent = ['Defensive', 'Balanced', 'Aggressive'][Math.floor(Math.random() * 3)];
    let aiZone = 'Long On';
    if (line === 'Leg Side') {
      aiZone = ['Fine Leg', 'Square Leg', 'Mid Wicket', 'Long On'][Math.floor(Math.random() * 4)];
    } else if (line === 'Off Side' || line === 'Wide') {
      aiZone = ['Long Off', 'Cover', 'Point', 'Third Man'][Math.floor(Math.random() * 4)];
    } else {
      aiZone = ['Fine Leg', 'Square Leg', 'Mid Wicket', 'Long On', 'Long Off', 'Cover', 'Point', 'Third Man'][Math.floor(Math.random() * 8)];
    }

    let aiShot = 'Straight Drive';
    if (length === 'Short') aiShot = ['Pull Shot', 'Hook Shot', 'Upper Cut', 'Defensive Shot'][Math.floor(Math.random() * 4)];
    else if (length === 'Yorker') aiShot = ['Defensive Shot', 'Late Cut', 'Straight Drive'][Math.floor(Math.random() * 3)];
    else if (length === 'Good Length') aiShot = ['Straight Drive', 'Cover Drive', 'Defensive Shot', 'Cut Shot'][Math.floor(Math.random() * 4)];
    else aiShot = ['Straight Drive', 'Lofted Drive', 'Slog Sweep', 'Sweep Shot', 'Cover Drive'][Math.floor(Math.random() * 5)];

    let timingResult = 'Slightly Late';
    const roll = Math.random();
    if (match.difficulty === 'Easy' || match.difficulty === 'Very Easy') {
      timingResult = roll < 0.3 ? 'Perfect' : roll < 0.7 ? 'Slightly Early' : 'Very Early';
    } else if (match.difficulty === 'Hard' || match.difficulty === 'Expert') {
      timingResult = roll < 0.58 ? 'Perfect' : roll < 0.94 ? 'Slightly Late' : 'Very Late';
    } else {
      timingResult = roll < 0.45 ? 'Perfect' : roll < 0.85 ? 'Slightly Early' : 'Very Late';
    }

    const bowlingSkill = match.isSpinBowler
      ? (match.playerAttrs.spin_bowling || 40) + (match.eqBonuses.spin_bowling || 0)
      : (match.playerAttrs.swing || 40) + (match.eqBonuses.swing || 0);
    const effectiveSkill = Math.round((bowlingSkill * 0.5) + (((match.playerAttrs.accuracy || 45) + (match.eqBonuses.accuracy || 0)) * 0.5));

    const simResult = simulateBallAdvanced({
      bowlerInput: { line, length, variation, speed, fieldPreset },
      batterInput: { targetZone: aiZone, intent: aiIntent, shotType: aiShot },
      timingResult,
      playerAttrs: { power: 55, timing: 55, technique: 55 },
      eqBonuses: {},
      activeSkills: match.activeSkills,
      confidence: 50,
      bowlerSkill: effectiveSkill,
      isFreeHit: false,
      isPowerplay: Math.floor(match.bowl.ballsBowled / 6) < (match.totalOvers >= 15 ? 6 : match.totalOvers >= 5 ? 2 : 1),
      pitch: match.pitch
    });

    match.bowl.runsConceded += simResult.runs;
    if (!simResult.rebowl) match.bowl.ballsBowled++;
    if (simResult.wicket) {
      match.bowl.wicketsTaken++;
      match.oppBatterHand = Math.random() < 0.35 ? 'Left-hand bat' : 'Right-hand bat';
    }

    const entry = `You bowled ${length} on ${line} (${speed} ${variation}) ➔ Opp played ${aiShot} to ${aiZone} [${timingResult}] — ${simResult.commentary}`;
    match.commentaryLog.unshift(entry);
    match.ballHistory = match.ballHistory || [];
    match.ballHistory.push(simResult.wicket ? 'W' : simResult.rebowl ? 'WD' : String(simResult.runs));
    match.lastBall = {
      runs: simResult.runs,
      wicket: simResult.wicket,
      rebowl: simResult.rebowl,
      timing: timingResult,
      shotName: aiShot,
      delivery: { line, length, variation, speed },
      commentary: simResult.commentary
    };

    const oppWon = match.bowl.runsConceded >= match.bowl.targetRuns;
    const userWon = match.bowl.wicketsTaken >= 10 || (match.bowl.ballsBowled >= match.bowl.ballsLimit && match.bowl.runsConceded < match.bowl.targetRuns);

    if (oppWon || userWon) {
      finalizeWebMatch(match, player, userWon);
    }
  }

  return serializeMatchState(match);
}

export function forfeitWebMatch(playerId) {
  const match = activeMatches.get(playerId);
  if (!match) return null;
  if (!match.finished) {
    const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(playerId);
    if (player) {
      player.confidence = Math.max(10, player.confidence - 15);
      db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, playerId);
      finalizeWebMatch(match, player, false, true);
    }
  }
  const serialized = serializeMatchState(match);
  activeMatches.delete(playerId);
  return serialized;
}

export function resolveStoryEventChoice(playerId, eventId, choiceIndex) {
  const match = activeMatches.get(playerId);
  const event = match?.storyEvent;
  if (!event || event.id !== eventId) {
    throw new Error('Career event expired or not found.');
  }
  const choice = event.choices[Number(choiceIndex)];
  if (!choice) throw new Error('Invalid choice.');
  if (typeof choice.dbUpdate === 'function') {
    choice.dbUpdate(db, playerId);
  }
  match.storyEvent = null;
  recordSystemLog({
    level: 'INFO',
    category: 'CareerEvent',
    actor: match.playerName,
    title: `Career Event Resolved: ${event.title}`,
    details: `Choice: ${choice.label} -> ${choice.resultText}`
  });
  return { label: choice.label, resultText: choice.resultText };
}

function finalizeWebMatch(match, player, won, isForfeit = false) {
  match.finished = true;
  const playerId = player.discord_id;
  const runs = match.bat.runs;
  const balls = match.bat.balls;
  const fours = match.bat.fours;
  const sixes = match.bat.sixes;
  const dismissal = isForfeit ? 'forfeit' : (match.bat.wickets > 0 ? 'out' : 'not out');
  const bowlingWickets = match.bowl.wicketsTaken;
  const runsConceded = match.bowl.runsConceded;
  const oversBowled = Number((match.bowl.ballsBowled / 6).toFixed(1));

  // Career stats update
  db.prepare(`
    UPDATE stats
    SET matches = matches + 1,
        runs = runs + ?,
        balls = balls + ?,
        fours = fours + ?,
        sixes = sixes + ?,
        fifties = fifties + ?,
        hundreds = hundreds + ?,
        ducks = ducks + ?,
        wickets = wickets + ?,
        overs = overs + ?,
        runs_conceded = runs_conceded + ?
    WHERE player_id = ?
  `).run(
    runs, balls, fours, sixes,
    (runs >= 50 && runs < 100) ? 1 : 0,
    runs >= 100 ? 1 : 0,
    (balls > 0 && runs === 0 && dismissal !== 'not out') ? 1 : 0,
    bowlingWickets, oversBowled, runsConceded, playerId
  );

  // Match history log
  db.prepare(`
    INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(playerId, match.opponent, match.mode, runs, balls, fours, sixes, dismissal, bowlingWickets, runsConceded, oversBowled, won ? 'Won' : 'Lost');

  const tier = getPlayerTier(player.level);
  let xpEarned = won ? (match.rewardXP || 100) : (match.lossXP || Math.round((match.rewardXP || 100) * 0.25));
  let coinsEarned = won ? (match.rewardCoins || 0) : (match.mode === 'quick' ? 0 : 10);
  let repEarned = won ? 5 : 1;
  let tokenReward = (won && (match.mode === 'chapter' || match.mode === 'practice')) ? (Math.random() < 0.3 ? 2 : 1) : 0;
  let bonusNotes = [];

  if (match.mode === 'chapter' || match.mode === 'practice') {
    const activeContract = db.prepare('SELECT id, salary_per_match, remaining_seasons FROM contracts WHERE player_id = ? AND active = 1').get(playerId);
    const baseSalary = activeContract ? activeContract.salary_per_match : tier.stipend;
    const matchSalary = won ? baseSalary : Math.round(baseSalary * 0.5);
    coinsEarned += matchSalary;

    if (match.mode === 'chapter' && won) {
      db.prepare('UPDATE players SET current_chapter = current_chapter + 1 WHERE discord_id = ?').run(playerId);
      if (match.chapterUnlockItem) {
        const item = match.chapterUnlockItem;
        db.prepare(`
          INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(playerId, item.item_id, item.name, item.type, item.rarity, JSON.stringify(item.bonuses));
      }
      if (match.chapterUnlockMsg) bonusNotes.push(match.chapterUnlockMsg);
    }

    if (activeContract) {
      db.prepare('UPDATE contracts SET remaining_seasons = remaining_seasons - 1 WHERE id = ?').run(activeContract.id);
      if (activeContract.remaining_seasons - 1 <= 0) {
        db.prepare('DELETE FROM contracts WHERE id = ?').run(activeContract.id);
      }
    }

    if (Math.random() < 0.15) {
      match.storyEvent = getPlayerEvent(player);
    }
  } else if (match.mode === 'tournament') {
    const { tournament, bracket } = match.extraMeta;
    const advanceResult = advanceBracket(bracket, won);
    if (won && advanceResult.finished && advanceResult.won) {
      // Champion!
      db.prepare('DELETE FROM active_tournament_run WHERE player_id = ?').run(playerId);
      db.prepare(`
        INSERT INTO player_tournaments (player_id, tournament_id, won, times_played, high_score, unlocked)
        VALUES (?, ?, 1, 1, ?, 1)
        ON CONFLICT(player_id, tournament_id) DO UPDATE SET
          won = won + 1,
          times_played = times_played + 1,
          high_score = MAX(high_score, ?)
      `).run(playerId, tournament.id, runs, runs);
      xpEarned += tournament.rewards.xp;
      coinsEarned += tournament.rewards.coins;
      repEarned += tournament.rewards.reputation;
      tokenReward += 2;
      bonusNotes.push(`🏆 CHAMPION! Won ${tournament.rewards.trophy}!`);
    } else if (!won) {
      db.prepare('DELETE FROM active_tournament_run WHERE player_id = ?').run(playerId);
      db.prepare(`
        INSERT INTO player_tournaments (player_id, tournament_id, won, times_played, high_score, unlocked)
        VALUES (?, ?, 0, 1, ?, 1)
        ON CONFLICT(player_id, tournament_id) DO UPDATE SET
          times_played = times_played + 1,
          high_score = MAX(high_score, ?)
      `).run(playerId, tournament.id, runs, runs);
      bonusNotes.push(`Knocked out of ${tournament.name}.`);
    } else {
      const nextRound = bracket.rounds[bracket.roundIndex];
      const nextMatch = nextRound.matches.find(m => m.isUserMatch);
      db.prepare(`
        UPDATE active_tournament_run
        SET current_round = ?, opponent_team = ?, bracket_json = ?
        WHERE player_id = ?
      `).run(bracket.roundIndex + 1, nextMatch.team2, JSON.stringify(bracket), playerId);
      bonusNotes.push(`Advanced to ${nextRound.name} vs ${nextMatch.team2}!`);
    }
  } else if (match.mode === 'franchise') {
    const { pf, league, oppTeam } = match.extraMeta;
    let matchSalary = Math.round(league.avgSalary * (pf.contract_role.includes('Marquee') ? 1.5 : pf.contract_role.includes('Starter') ? 1.2 : 0.8));
    if (!won) matchSalary = Math.round(matchSalary * 0.8);
    const runBonus = runs * 2;
    const wicketBonus = bowlingWickets * 20;
    const centuryBonus = runs >= 100 ? 150 : (runs >= 50 ? 50 : 0);
    coinsEarned = matchSalary + runBonus + wicketBonus + centuryBonus;

    const userDismissed = match.bat.wickets > 0 ? 1 : 0;
    db.prepare(`
      UPDATE player_franchise
      SET runs = runs + ?, balls = balls + ?, fours = fours + ?, sixes = sixes + ?, dismissals = dismissals + ?,
          matches_played = matches_played + 1, wickets = wickets + ?, runs_conceded = runs_conceded + ?, overs_bowled = overs_bowled + ?,
          current_round = current_round + 1
      WHERE player_id = ?
    `).run(runs, balls, fours, sixes, userDismissed, bowlingWickets, runsConceded, oversBowled, playerId);

    if (pf.current_round <= league.seasonLength) {
      db.prepare('UPDATE franchise_standings SET played=played+1, won=won+?, lost=lost+?, points=points+?, nrr=nrr+? WHERE player_id=? AND team_id=?')
        .run(won ? 1 : 0, won ? 0 : 1, won ? 2 : 0, won ? 0.75 : -0.75, playerId, pf.team_id);
      db.prepare('UPDATE franchise_standings SET played=played+1, won=won+?, lost=lost+?, points=points+?, nrr=nrr+? WHERE player_id=? AND team_id=?')
        .run(won ? 0 : 1, won ? 1 : 0, won ? 0 : 2, won ? -0.75 : 0.75, playerId, oppTeam.id);
      simulateOtherFranchiseFixtures(playerId, pf.league_id, pf.team_id, oppTeam.id);
    }
    simulateFranchiseAIPlayers(playerId, pf.league_id);
    bonusNotes.push(`Match Fee: ${matchSalary} | Performance Bonus: ${runBonus + wicketBonus + centuryBonus}`);
  }

  db.prepare(`
    UPDATE players
    SET coins = coins + ?,
        training_tokens = training_tokens + ?,
        reputation = reputation + ?,
        form = MIN(100, MAX(20, form + ?))
    WHERE discord_id = ?
  `).run(coinsEarned, tokenReward, repEarned, won ? 10 : -10, playerId);

  const xpResult = addXP(db, playerId, xpEarned);

  match.resultSummary = {
    won,
    xpEarned,
    coinsEarned,
    repEarned,
    tokenReward,
    levelUp: xpResult.levelUp,
    newLevel: xpResult.newLevel,
    achievementsUnlocked: xpResult.achievementsUnlocked,
    bonusNotes,
    batting: { runs, balls, fours, sixes, dismissal },
    bowling: { wickets: bowlingWickets, runsConceded, overs: oversBowled }
  };

  recordSystemLog({
    level: 'MATCH',
    category: 'Match',
    actor: player.name,
    target: match.opponent,
    title: `Match Completed: ${won ? 'WON' : 'LOST'} (${match.mode.toUpperCase()})`,
    details: {
      runs, balls, bowlingWickets, runsConceded,
      xpEarned, coinsEarned, levelUp: xpResult.levelUp
    }
  });
}

export function simulateOtherFranchiseFixtures(playerId, leagueId, userTeamId, oppTeamId) {
  const league = franchiseLeagues[leagueId];
  if (!league) return;
  const teamsToSim = league.teams.filter(t => t.id !== userTeamId && t.id !== oppTeamId);
  for (let i = 0; i < teamsToSim.length; i += 2) {
    if (i + 1 < teamsToSim.length) {
      const a = teamsToSim[i];
      const b = teamsToSim[i + 1];
      const aWins = Math.random() < 0.5;
      const nrr = 0.2 + Math.random() * 0.8;
      db.prepare('UPDATE franchise_standings SET played=played+1, won=won+?, lost=lost+?, points=points+?, nrr=nrr+? WHERE player_id=? AND team_id=?')
        .run(aWins ? 1 : 0, aWins ? 0 : 1, aWins ? 2 : 0, aWins ? nrr : -nrr, playerId, a.id);
      db.prepare('UPDATE franchise_standings SET played=played+1, won=won+?, lost=lost+?, points=points+?, nrr=nrr+? WHERE player_id=? AND team_id=?')
        .run(aWins ? 0 : 1, aWins ? 1 : 0, aWins ? 0 : 2, aWins ? -nrr : nrr, playerId, b.id);
    }
  }
}

export function simulateFranchiseAIPlayers(playerId, leagueId) {
  const ais = db.prepare('SELECT id, role FROM ai_players WHERE player_id = ? AND league_id = ?').all(playerId, leagueId);
  const upd = db.prepare('UPDATE ai_players SET runs = runs + ?, wickets = wickets + ? WHERE id = ?');
  for (const ai of ais) {
    let r = 0, w = 0;
    const roll = Math.random();
    if (ai.role === 'Batsman') {
      r = roll < 0.1 ? 0 : roll < 0.4 ? Math.floor(Math.random() * 20) + 10 : roll < 0.8 ? Math.floor(Math.random() * 35) + 30 : Math.floor(Math.random() * 50) + 65;
    } else {
      w = roll < 0.3 ? 0 : roll < 0.7 ? 1 : roll < 0.95 ? 2 : 3;
    }
    upd.run(r, w, ai.id);
  }
}
