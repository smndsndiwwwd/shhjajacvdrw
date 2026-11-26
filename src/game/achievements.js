export const achievements = {
  first_step: {
    key: 'first_step',
    name: '👶 First Step',
    description: 'Create your Virtual Career player.',
    type: 'custom',
    reward_coins: 50
  },
  beta_tester: {
    key: 'beta_tester',
    name: '🧪 Beta Tester',
    description: 'One of the first 250 registered players in Virtual Career Mode!',
    type: 'custom',
    reward_coins: 500
  },
  half_century: {
    key: 'half_century',
    name: '🎖️ Fifty Up',
    description: 'Score your first career half-century (50+ runs in an innings or 50s stat).',
    type: 'stat_fifties',
    target: 1,
    reward_coins: 150
  },
  run_machine: {
    key: 'run_machine',
    name: '🏏 Run Machine',
    description: 'Score 500 total career runs.',
    type: 'stat_runs',
    target: 500,
    reward_coins: 200
  },
  century_machine: {
    key: 'century_machine',
    name: '💯 Century Machine',
    description: 'Score your first career century (100+ runs in a match or cumulative 100s).',
    type: 'stat_hundreds',
    target: 1,
    reward_coins: 500
  },
  boundary_king: {
    key: 'boundary_king',
    name: '⚡ Boundary King',
    description: 'Strike 50 career boundaries (fours).',
    type: 'stat_fours',
    target: 50,
    reward_coins: 200
  },
  power_finisher: {
    key: 'power_finisher',
    name: '💥 Power Finisher',
    description: 'Hit 25 career sixes.',
    type: 'stat_sixes',
    target: 25,
    reward_coins: 300
  },
  wall: {
    key: 'wall',
    name: '🧱 The Wall',
    description: 'Face 200 balls career-wide with an average of 40+.',
    type: 'custom',
    reward_coins: 300
  },
  golden_arm: {
    key: 'golden_arm',
    name: '🥎 Golden Arm',
    description: 'Take 25 total career wickets.',
    type: 'stat_wickets',
    target: 25,
    reward_coins: 250
  },
  hat_trick_hero: {
    key: 'hat_trick_hero',
    name: '🎩 Hat Trick Hero',
    description: 'Take 3 wickets in a single match.',
    type: 'custom',
    reward_coins: 400
  },
  fifer: {
    key: 'fifer',
    name: '🖐️ Five-Star Spell',
    description: 'Take 5 wickets in a single match.',
    type: 'custom',
    reward_coins: 600
  },
  mvp: {
    key: 'mvp',
    name: '🏆 MVP',
    description: 'Reach Level 15 in your career.',
    type: 'level',
    target: 15,
    reward_coins: 500
  },
  legend: {
    key: 'legend',
    name: '🌟 Legend',
    description: 'Complete all Career Chapters (Chapter 50).',
    type: 'chapters_completed',
    target: 50,
    reward_coins: 1000
  },
  goat: {
    key: 'goat',
    name: '🐐 GOAT',
    description: 'Reach Level 30, score 2000 runs, and unlock 5 skills.',
    type: 'custom',
    reward_coins: 2000
  }
};

/**
 * Checks and awards achievements based on player state and stats
 * @param {object} db SQLite Database connection
 * @param {string} playerId Discord ID of player
 * @returns {string[]} List of newly unlocked achievement names
 */
export async function checkAchievements(db, playerId) {
  const player = await db.get('SELECT * FROM players WHERE discord_id = ?', playerId);
  if (!player) return [];

  const playerStats = (await db.get('SELECT * FROM stats WHERE player_id = ?', playerId)) || {};
  const currentAchievements = (await db.all('SELECT achievement_key FROM player_achievements WHERE player_id = ?', playerId)).map(a => a.achievement_key);
  
  const skillCount = (await db.get('SELECT COUNT(*) as cnt FROM skills WHERE player_id = ?', playerId))?.cnt || 0;
  
  const newlyUnlocked = [];

  for (const [key, ach] of Object.entries(achievements)) {
    if (currentAchievements.includes(key)) continue;

    let unlocked = false;

    if (ach.type === 'stat_runs') {
      if ((playerStats.runs || 0) >= ach.target) unlocked = true;
    } else if (ach.type === 'stat_fifties') {
      if ((playerStats.fifties || 0) >= ach.target) unlocked = true;
    } else if (ach.type === 'stat_hundreds') {
      if ((playerStats.hundreds || 0) >= ach.target) unlocked = true;
    } else if (ach.type === 'stat_fours') {
      if ((playerStats.fours || 0) >= ach.target) unlocked = true;
    } else if (ach.type === 'stat_sixes') {
      if ((playerStats.sixes || 0) >= ach.target) unlocked = true;
    } else if (ach.type === 'stat_wickets') {
      if ((playerStats.wickets || 0) >= ach.target) unlocked = true;
    } else if (ach.type === 'level') {
      if (player.level >= ach.target) unlocked = true;
    } else if (ach.type === 'chapters_completed') {
      if (player.current_chapter > ach.target) unlocked = true;
    } else if (ach.type === 'custom') {
      if (key === 'first_step') {
        unlocked = true;
      } else if (key === 'beta_tester') {
        // First 250 registrations based on registration timestamp / order
        const regRank = (await db.get('SELECT COUNT(*) as rank FROM players WHERE created_at <= ?', player.created_at || new Date().toISOString()))?.rank || 1;
        if (regRank <= 250) unlocked = true;
      } else if (key === 'wall') {
        const balls = playerStats.balls || 0;
        const runs = playerStats.runs || 0;
        const matches = playerStats.matches || 0;
        const avg = matches > 0 ? (runs / matches) : 0;
        if (balls >= 200 && avg >= 40) unlocked = true;
      } else if (key === 'hat_trick_hero') {
        // Checked in match history, if any match has wickets >= 3
        const bestWickets = (await db.get('SELECT MAX(wickets) as max_w FROM match_history WHERE player_id = ?', playerId))?.max_w || 0;
        if (bestWickets >= 3) unlocked = true;
      } else if (key === 'fifer') {
        // Checked in match history, if any match has wickets >= 5
        const bestWickets = (await db.get('SELECT MAX(wickets) as max_w FROM match_history WHERE player_id = ?', playerId))?.max_w || 0;
        if (bestWickets >= 5) unlocked = true;
      } else if (key === 'goat') {
        if (player.level >= 30 && (playerStats.runs || 0) >= 2000 && skillCount >= 5) unlocked = true;
      }
    }

    if (unlocked) {
      await db.run('INSERT OR IGNORE INTO player_achievements (player_id, achievement_key) VALUES (?, ?)', playerId, key);
      await db.run('UPDATE players SET coins = coins + ? WHERE discord_id = ?', ach.reward_coins, playerId);
      newlyUnlocked.push(ach.name);
    }
  }

  return newlyUnlocked;
}

/**
 * Retrieves all achievements with player's unlocked status and metadata
 * @param {object} db SQLite Database connection
 * @param {string} playerId Discord ID of player
 * @returns {Promise<Array<{key: string, name: string, description: string, reward_coins: number, unlocked: boolean, earned_at: string | null}>>}
 */
export async function getPlayerAchievements(db, playerId) {
  await checkAchievements(db, playerId);

  const earnedRows = await db.all('SELECT achievement_key, earned_at FROM player_achievements WHERE player_id = ?', playerId);
  const earnedMap = new Map();
  for (const r of earnedRows) {
    earnedMap.set(r.achievement_key, r.earned_at);
  }

  return Object.values(achievements).map(ach => ({
    ...ach,
    unlocked: earnedMap.has(ach.key),
    earned_at: earnedMap.get(ach.key) || null
  }));
}
