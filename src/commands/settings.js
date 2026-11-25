import db from '../database/db.js';
import { buildSettingsMessage } from '../game/settings.js';

export async function handleSettings(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);

  const playerName = player ? player.name : interaction.user.username;
  const messageData = buildSettingsMessage(discordId, playerName);

  await interaction.reply(messageData);
}
