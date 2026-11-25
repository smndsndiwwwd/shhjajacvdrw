/**
 * In-memory cooldown tracker for commands that generate heavy canvas graphics.
 * 30-second cooldown per user across graphic-heavy commands (stats, attributes, equipment, inventory, skills, etc.).
 * Exempt: /profile
 */
const graphicCooldowns = new Map(); // userId -> expireTimestamp

const GRAPHIC_COOLDOWN_MS = 30 * 1000; // 30 seconds

/**
 * Checks whether a user is currently under a graphic generation cooldown.
 * @param {string} userId - Discord user ID
 * @returns {{ onCooldown: boolean, remainingSeconds: number }}
 */
export function checkGraphicCooldown(userId) {
  const now = Date.now();
  if (graphicCooldowns.has(userId)) {
    const expiresAt = graphicCooldowns.get(userId);
    if (now < expiresAt) {
      const remainingSeconds = Math.ceil((expiresAt - now) / 1000);
      return { onCooldown: true, remainingSeconds };
    } else {
      graphicCooldowns.delete(userId);
    }
  }
  return { onCooldown: false, remainingSeconds: 0 };
}

/**
 * Sets a 30-second graphic cooldown for the specified user.
 * @param {string} userId - Discord user ID
 */
export function setGraphicCooldown(userId) {
  graphicCooldowns.set(userId, Date.now() + GRAPHIC_COOLDOWN_MS);
}

/**
 * Checks cooldown and automatically replies to the interaction if on cooldown.
 * If not on cooldown, sets the cooldown and returns true.
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>} true if allowed to proceed, false if blocked by cooldown
 */
export async function enforceGraphicCooldown(interaction) {
  const userId = interaction.user.id;
  const status = checkGraphicCooldown(userId);
  if (status.onCooldown) {
    const content = `⏳ **Graphic Generation Cooldown:** Please wait **${status.remainingSeconds}s** before generating another graphic card.\n*(Note: \`/profile\` has no cooldown!)*`;
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: ['Ephemeral'] }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: ['Ephemeral'] }).catch(() => {});
    }
    return false;
  }
  setGraphicCooldown(userId);
  return true;
}

