import db from '../database/db.js';

// The in-memory cache of academies
export const academies = {};

/**
 * Loads all academies from database academies table into the memory cache
 */
export async function loadAcademies() {
  try {
    const rows = await db.all('SELECT * FROM academies');
    // Clear current keys in-place to keep references intact
    for (const key in academies) {
      delete academies[key];
    }
    for (const row of rows) {
      academies[row.id] = {
        id: row.id,
        name: row.name,
        rating: row.rating,
        reputation: row.reputation,
        history: row.history,
        specialty: row.specialty,
        coachRating: row.coach_rating,
        trainingBonusText: row.training_bonus_text,
        bonuses: JSON.parse(row.bonuses_json || '{}'),
        graduatesDomestic: row.graduates_domestic,
        graduatesInternational: row.graduates_international,
        successRate: row.success_rate
      };
    }
  } catch (e) {
    console.error('Error loading academies:', e);
  }
}
