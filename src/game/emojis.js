import db from '../database/db.js';

const cache = {};

/**
 * Loads all emojis from database config table into the memory cache
 */
export async function loadEmojis() {
  try {
    const rows = await db.all('SELECT * FROM config');
    for (const row of rows) {
      cache[row.key] = row.value;
    }
  } catch (e) {
    console.error('Error loading emojis config:', e);
  }
}

/**
 * Updates a configuration emoji in both database and cache
 * @param {string} key - Config key
 * @param {string} value - New emoji value
 */
export async function updateEmojiInDb(key, value) {
  await db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', key, value);
  cache[key] = value;
}

// Dynamic properties getter object for clean syntax elsewhere (e.g. emojis.coin)
export const emojis = {
  get coin() { return cache['emoji_coin'] || '<:ascendcoins:1546110493381361745>'; },
  get sp() { return cache['emoji_sp'] || '🌟'; },
  get token() { return cache['emoji_token'] || '<:ascendtickets:1546110558007197787>'; },
  get ticket() { return cache['emoji_token'] || '<:ascendtickets:1546110558007197787>'; },
  get energy() { return cache['emoji_energy'] || '⚡'; },
  get confidence() { return cache['emoji_confidence'] || '🔥'; },
  get form() { return cache['emoji_form'] || '📈'; },
  get reputation() { return cache['emoji_reputation'] || '🎖️'; },
  get xp() { return cache['emoji_xp'] || '🏆'; },
  get trophy() { return cache['emoji_trophy'] || '🏆'; },
  get bat() { return cache['emoji_bat'] || '🏏'; },
  get gloves() { return cache['emoji_gloves'] || '🧤'; },
  get shoes() { return cache['emoji_shoes'] || '👟'; },
  get pads() { return cache['emoji_pads'] || '🛡️'; },
  get grip() { return cache['emoji_grip'] || '🎗️'; },
  get wicket() { return cache['emoji_wicket'] || '🚨'; },
  get match() { return cache['emoji_match'] || '🏟️'; }
};
