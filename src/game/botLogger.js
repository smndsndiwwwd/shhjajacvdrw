import { EmbedBuilder } from 'discord.js';
import { recordSystemLog } from './systemLog.js';

export const BOT_LOG_CHANNEL_ID = '1546104900260200573';

/**
 * Sends a structured event log to the designated bot log channel
 * and mirrors it into the database admin_logs table.
 * @param {import('discord.js').Client} client - Discord Client instance
 * @param {object} logData - Log data payload
 * @param {string} logData.title - Log embed title
 * @param {string} logData.description - Main event description
 * @param {string} [logData.color='#38bdf8'] - Embed hex color
 * @param {Array<{name: string, value: string, inline?: boolean}>} [logData.fields=[]] - Structured detail fields
 */
export async function sendBotLog(client, { title, description, color = '#38bdf8', fields = [] }) {
  // Always record in database audit log even if Discord client is unavailable
  recordSystemLog({
    level: 'INFO',
    category: 'DiscordBot',
    actor: 'discord-bot',
    title: title || 'Bot Event',
    details: { description, fields }
  });

  if (!client) return;

  try {
    const channel = client.channels?.cache?.get(BOT_LOG_CHANNEL_ID) 
      || await client.channels?.fetch(BOT_LOG_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (fields && fields.length > 0) {
      embed.addFields(fields);
    }

    embed.setFooter({ text: 'Cricket Ascend 🏏 • Bot Activity Log' });

    await channel.send({ embeds: [embed] }).catch(err => {
      console.warn('Could not post to bot log channel:', err.message);
    });
  } catch (err) {
    console.warn('Error in sendBotLog:', err.message);
  }
}
