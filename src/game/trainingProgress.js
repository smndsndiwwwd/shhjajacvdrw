export const TRAINING_DAILY_LIMIT = 5;

export function getTrainingCapForLevel(level = 1) {
  return Math.min(99, 25 + Math.max(1, Number(level) || 1) * 3);
}

export const TRAINING_REGIMES = {
  batting: {
    id: 'batting',
    label: 'Nets Batting Practice',
    primary: ['timing', 'technique'],
    secondary: ['power', 'defense']
  },
  bowling: {
    id: 'bowling',
    label: 'Target Bowling Drills',
    primary: ['accuracy', 'variations'],
    secondaryPace: ['swing', 'seam'],
    secondarySpin: ['spin_bowling']
  },
  fitness: {
    id: 'fitness',
    label: 'Gym & Conditioning',
    primary: ['fitness', 'stamina'],
    secondary: ['power', 'running']
  },
  fielding: {
    id: 'fielding',
    label: 'Sprinting & Fielding Drills',
    primary: ['fielding', 'reflex'],
    secondary: ['throw_accuracy', 'running']
  }
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function getRegimeAttrs(regime, bowlingStyle = '') {
  const cfg = TRAINING_REGIMES[regime] || TRAINING_REGIMES.batting;
  if (regime === 'bowling') {
    const isSpin = String(bowlingStyle || '').toLowerCase().includes('spin');
    return {
      primary: cfg.primary,
      secondary: isSpin ? cfg.secondarySpin : cfg.secondaryPace
    };
  }
  return { primary: cfg.primary, secondary: cfg.secondary };
}

export async function getTrainingStatus(db, player) {
  const playerId = player.discord_id;
  const attrCap = getTrainingCapForLevel(player.level || 1);
  const currentAttrs = (await db.get('SELECT * FROM attributes WHERE player_id = ?', playerId)) || {};
  const rows = await db.all('SELECT * FROM training_progress WHERE player_id = ?', playerId);
  const today = todayUTC();
  const byRegime = {};

  for (const id of Object.keys(TRAINING_REGIMES)) {
    const row = rows.find(r => r.regime === id);
    const dailyUsed = row && row.last_train_date === today ? (row.daily_count || 0) : 0;
    const { primary, secondary } = getRegimeAttrs(id, player.bowling_style);
    const pool = [...primary, ...secondary];
    const attrValues = {};
    let allCapped = true;
    for (const k of pool) {
      const val = Number(currentAttrs[k] || 10);
      attrValues[k] = val;
      if (val < attrCap) allCapped = false;
    }

    byRegime[id] = {
      regime: id,
      progress: row ? Math.min(100, row.progress || 0) : 0,
      dailyUsed,
      dailyLimit: TRAINING_DAILY_LIMIT,
      totalSessions: row ? (row.total_sessions || 0) : 0,
      attrCap,
      allCapped,
      attrs: attrValues
    };
  }

  return { attrCap, dailyLimit: TRAINING_DAILY_LIMIT, regimes: byRegime };
}

export async function executeTrainingDrill(db, player, regime, bonusMult = 1.0) {
  if (!TRAINING_REGIMES[regime]) {
    throw new Error('Invalid training regime.');
  }
  const playerId = player.discord_id;
  const attrCap = getTrainingCapForLevel(player.level || 1);
  const today = todayUTC();

  let row = await db.get('SELECT * FROM training_progress WHERE player_id = ? AND regime = ?', playerId, regime);
  if (!row) {
    await db.run(
      `INSERT INTO training_progress (player_id, regime, progress, daily_count, last_train_date, total_sessions)
       VALUES (?, ?, 0, 0, ?, 0)`,
      playerId,
      regime,
      today
    );
    row = { progress: 0, daily_count: 0, last_train_date: today, total_sessions: 0 };
  }

  const dailyUsed = row.last_train_date === today ? (row.daily_count || 0) : 0;
  if (dailyUsed >= TRAINING_DAILY_LIMIT) {
    throw new Error(`Daily limit (${TRAINING_DAILY_LIMIT}/${TRAINING_DAILY_LIMIT}) reached for ${TRAINING_REGIMES[regime].label}. Train another area or return tomorrow!`);
  }

  const prevProgress = Math.min(100, row.progress || 0);
  const mult = Math.min(1.5, Math.max(0.8, Number(bonusMult) || 1.0));
  const gainPct = Math.min(48, Math.max(24, Math.round((28 + Math.random() * 9) * mult)));
  let nextProgress = prevProgress + gainPct;

  const currentAttrs = (await db.get('SELECT * FROM attributes WHERE player_id = ?', playerId)) || {};
  const { primary, secondary } = getRegimeAttrs(regime, player.bowling_style);
  const orderedCandidates = [...primary, ...secondary];

  const gains = [];
  let capReached = false;

  if (nextProgress >= 100) {
    // Prefer primary uncapped attributes with lowest rating first so growth stays balanced
    const uncappedPrimary = primary.filter(k => (currentAttrs[k] || 10) < attrCap);
    const uncappedSec = secondary.filter(k => (currentAttrs[k] || 10) < attrCap);
    const targetPool = uncappedPrimary.length > 0 ? uncappedPrimary : uncappedSec;

    if (targetPool.length > 0) {
      targetPool.sort((a, b) => (currentAttrs[a] || 10) - (currentAttrs[b] || 10));
      const picked = targetPool[0];
      const curr = Number(currentAttrs[picked] || 10);
      const nextVal = Math.min(attrCap, curr + 1);
      await db.run(`UPDATE attributes SET ${picked} = ? WHERE player_id = ?`, nextVal, playerId);
      gains.push({ key: picked, from: curr, to: nextVal, delta: 1 });
      nextProgress = Math.max(0, nextProgress - 100);
    } else {
      capReached = orderedCandidates.length > 0;
      nextProgress = 100;
    }
  }

  await db.run(
    `UPDATE training_progress
     SET progress = ?,
         daily_count = ?,
         last_train_date = ?,
         total_sessions = total_sessions + 1
     WHERE player_id = ? AND regime = ?`,
    nextProgress,
    dailyUsed + 1,
    today,
    playerId,
    regime
  );

  return {
    regime,
    prevProgress,
    newProgress: nextProgress,
    gainPct,
    breakthrough: gains.length > 0,
    gains,
    capReached,
    attrCap,
    dailyUsed: dailyUsed + 1,
    dailyLimit: TRAINING_DAILY_LIMIT
  };
}
