/**
 * In-memory active match state tracker.
 * Prevents players from modifying shot presets or triggering duplicate matches while in play.
 */

const activeMatches = new Map(); // discordId -> { matchType: string, startedAt: number }

export function isPlayerInMatch(discordId) {
  return activeMatches.has(discordId);
}

export function getPlayerMatchInfo(discordId) {
  return activeMatches.get(discordId) || null;
}

export function setPlayerInMatch(discordId, matchType = 'match') {
  activeMatches.set(discordId, {
    matchType,
    startedAt: Date.now()
  });
}

export function clearPlayerInMatch(discordId) {
  activeMatches.delete(discordId);
}
