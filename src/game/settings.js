import db from '../database/db.js';

export const DEFAULT_SETTINGS = {
  display_mode: 'graphic',       // 'graphic' | 'embed'
  field_radar: 1,               // 1 | 0
  dm_match: 1,                  // Always 1 (DMs)
  commentary_level: 'detailed', // 'detailed' | 'compact'
  mention_ping: 1,              // 1 | 0
  batting_order: 'auto'         // 'auto' | 'opener' | 'top_order' | 'middle_order' | 'finisher' | 'lower_order'
};

/**
 * Fetch or initialize settings for a player.
 */
export function getPlayerSettings(playerId) {
  try {
    const row = db.prepare('SELECT * FROM player_settings WHERE player_id = ?').get(playerId);
    if (row) {
      return {
        display_mode: row.display_mode || 'graphic',
        field_radar: row.field_radar ?? 1,
        dm_match: row.dm_match ?? 1,
        commentary_level: row.commentary_level || 'detailed',
        mention_ping: row.mention_ping ?? 1,
        batting_order: row.batting_order || 'auto'
      };
    }

    // Insert default settings
    db.prepare(`
      INSERT INTO player_settings (player_id, display_mode, field_radar, dm_match, commentary_level, mention_ping, batting_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerId,
      DEFAULT_SETTINGS.display_mode,
      DEFAULT_SETTINGS.field_radar,
      DEFAULT_SETTINGS.dm_match,
      DEFAULT_SETTINGS.commentary_level,
      DEFAULT_SETTINGS.mention_ping,
      DEFAULT_SETTINGS.batting_order
    );

    return { ...DEFAULT_SETTINGS };
  } catch (err) {
    console.error('Error in getPlayerSettings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Update a specific setting for a player.
 */
export function updatePlayerSetting(playerId, key, value) {
  try {
    getPlayerSettings(playerId);

    const allowedKeys = ['display_mode', 'field_radar', 'dm_match', 'commentary_level', 'mention_ping', 'batting_order'];
    if (!allowedKeys.includes(key)) {
      throw new Error(`Invalid setting key: ${key}`);
    }

    db.prepare(`UPDATE player_settings SET ${key} = ? WHERE player_id = ?`).run(value, playerId);
    if (key === 'batting_order') {
      try {
        db.prepare('UPDATE players SET batting_order = ? WHERE discord_id = ?').run(value, playerId);
      } catch (e) {}
    }
    return getPlayerSettings(playerId);
  } catch (err) {
    console.error(`Error updating setting ${key} for ${playerId}:`, err);
    return getPlayerSettings(playerId);
  }
}

/**
 * Reset settings back to defaults.
 */
export function resetPlayerSettings(playerId) {
  try {
    db.prepare(`
      UPDATE player_settings
      SET display_mode = ?, field_radar = ?, dm_match = ?, commentary_level = ?, mention_ping = ?, batting_order = ?
      WHERE player_id = ?
    `).run(
      DEFAULT_SETTINGS.display_mode,
      DEFAULT_SETTINGS.field_radar,
      DEFAULT_SETTINGS.dm_match,
      DEFAULT_SETTINGS.commentary_level,
      DEFAULT_SETTINGS.mention_ping,
      DEFAULT_SETTINGS.batting_order,
      playerId
    );
    try {
      db.prepare("UPDATE players SET batting_order = 'auto' WHERE discord_id = ?").run(playerId);
    } catch (e) {}
    return getPlayerSettings(playerId);
  } catch (err) {
    console.error(`Error resetting settings for ${playerId}:`, err);
    return getPlayerSettings(playerId);
  }
}

/**
 * Toggle a setting to its opposite/next value.
 */
export function togglePlayerSetting(playerId, key) {
  const current = getPlayerSettings(playerId);
  if (key === 'display_mode') {
    const nextVal = current.display_mode === 'graphic' ? 'embed' : 'graphic';
    return updatePlayerSetting(playerId, 'display_mode', nextVal);
  } else if (key === 'field_radar') {
    const nextVal = current.field_radar ? 0 : 1;
    return updatePlayerSetting(playerId, 'field_radar', nextVal);
  } else if (key === 'dm_match') {
    const nextVal = current.dm_match ? 0 : 1;
    return updatePlayerSetting(playerId, 'dm_match', nextVal);
  } else if (key === 'commentary_level') {
    const nextVal = current.commentary_level === 'detailed' ? 'compact' : 'detailed';
    return updatePlayerSetting(playerId, 'commentary_level', nextVal);
  } else if (key === 'mention_ping') {
    const nextVal = current.mention_ping ? 0 : 1;
    return updatePlayerSetting(playerId, 'mention_ping', nextVal);
  } else if (key === 'batting_order') {
    const orderCycle = ['auto', 'opener', 'top_order', 'middle_order', 'finisher', 'lower_order'];
    const currIdx = orderCycle.indexOf(current.batting_order || 'auto');
    const nextVal = orderCycle[(currIdx + 1) % orderCycle.length];
    return updatePlayerSetting(playerId, 'batting_order', nextVal);
  }
  return current;
}
