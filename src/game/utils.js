import { checkAchievements } from './achievements.js';

/**
 * Returns the XP required to complete the current level and move to the next.
 * @param {number} level - Current player level
 * @returns {number} XP required
 */
export function getLevelRequiredXP(level) {
  return level * 200;
}

/**
 * Aggregates all attribute bonuses from equipped items in the player's inventory.
 * @param {object} db - SQLite database connection
 * @param {string} playerId - Discord user ID
 * @returns {object} Combined attribute bonuses
 */
export async function getEquipmentBonuses(db, playerId) {
  const equipped = await db.all('SELECT bonuses FROM inventory WHERE player_id = ? AND equipped = 1', playerId);
  const total = {};
  
  for (const item of equipped) {
    try {
      const bonuses = JSON.parse(item.bonuses);
      for (const [attr, val] of Object.entries(bonuses)) {
        total[attr] = (total[attr] || 0) + val;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  return total;
}

/**
 * Retrieves the base player attributes and adds active equipment bonuses.
 * @param {object} db - SQLite database
 * @param {string} playerId - Discord user ID
 * @returns {object} Total attributes
 */
export async function getEffectiveAttributes(db, playerId) {
  const base = await db.get('SELECT * FROM attributes WHERE player_id = ?', playerId);
  if (!base) return {};

  const bonuses = await getEquipmentBonuses(db, playerId);
  const effective = { ...base };

  for (const [attr, val] of Object.entries(bonuses)) {
    if (effective[attr] !== undefined) {
      effective[attr] += val;
    } else {
      // In case we want to support attributes not in base table (or custom keys)
      effective[attr] = val;
    }
  }
  return effective;
}

/**
 * Statefully calculates and recovers energy since the last update, then returns current energy.
 * @param {object} db - SQLite database
 * @param {string} playerId - Discord user ID
 * @returns {number} Current energy (0-100)
 */
export async function updateAndGetEnergy(db, playerId) {
  const player = await db.get('SELECT energy, last_energy_update FROM players WHERE discord_id = ?', playerId);
  if (!player) return 0;

  const now = Date.now();
  let lastUpdateMs = Number(player.last_energy_update);
  
  if (isNaN(lastUpdateMs)) {
    // Fallback for legacy text timestamps: append ' UTC' to force UTC parsing rather than local time
    lastUpdateMs = new Date(player.last_energy_update + ' UTC').getTime();
  }

  const diffMs = now - lastUpdateMs;
  const diffHours = diffMs / (1000 * 60 * 60);

  // Recover 5 energy per hour
  const recovery = Math.floor(diffHours * 5);
  
  if (recovery > 0) {
    const newEnergy = Math.min(100, player.energy + recovery);
    
    // Update energy and save current time as epoch integer
    await db.run(
      `UPDATE players 
       SET energy = ?, last_energy_update = ? 
       WHERE discord_id = ?`,
      newEnergy,
      now,
      playerId
    );
    
    return newEnergy;
  }

  return player.energy;
}

/**
 * Deducts energy from player after recovering any pending energy.
 * @param {object} db - SQLite database
 * @param {string} playerId - Discord user ID
 * @param {number} amount - Energy to consume
 * @returns {boolean} Whether energy was successfully consumed
 */
export async function consumeEnergy(db, playerId, amount) {
  const currentEnergy = await updateAndGetEnergy(db, playerId);
  if (currentEnergy < amount) return false;

  const now = Date.now();
  await db.run(
    `UPDATE players 
     SET energy = energy - ?, last_energy_update = ? 
     WHERE discord_id = ?`,
    amount,
    now,
    playerId
  );
  return true;
}

/**
 * Adds XP to a player and handles potential level ups recursively.
 * @param {object} db - SQLite database
 * @param {string} playerId - Discord user ID
 * @param {number} amount - XP to add
 * @returns {object} Level up metadata and unlocked achievements
 */
export async function addXP(db, playerId, amount) {
  const player = await db.get('SELECT level, xp, skill_points FROM players WHERE discord_id = ?', playerId);
  if (!player) return { levelUp: false, newLevel: 1, achievementsUnlocked: [] };

  let currentLevel = player.level;
  let currentXP = player.xp + amount;
  let skillPointsGained = 0;
  let levelUpOccurred = false;

  let req = getLevelRequiredXP(currentLevel);
  while (currentXP >= req) {
    currentXP -= req;
    currentLevel += 1;
    skillPointsGained += 1;
    levelUpOccurred = true;
    req = getLevelRequiredXP(currentLevel);
  }

  await db.run(
    'UPDATE players SET level = ?, xp = ?, skill_points = skill_points + ? WHERE discord_id = ?',
    currentLevel,
    currentXP,
    skillPointsGained,
    playerId
  );

  // Level up also gives a single targeted boost to a core attribute (capped at 99)
  if (levelUpOccurred) {
    const coreAttrs = ['power', 'timing', 'technique', 'fitness', 'defense', 'running', 'fielding', 'reflex', 'stamina', 'accuracy'];
    const boostedAttr = coreAttrs[Math.floor(Math.random() * coreAttrs.length)];
    await db.run(
      `UPDATE attributes 
       SET ${boostedAttr} = MIN(99, ${boostedAttr} + 1)
       WHERE player_id = ?`,
      playerId
    );
  }

  // Check achievements after XP and potential level updates
  const achievementsUnlocked = await checkAchievements(db, playerId);

  return {
    levelUp: levelUpOccurred,
    newLevel: currentLevel,
    achievementsUnlocked
  };
}
