import { ActivityType } from 'discord.js';

export default {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`🚀 Virtual CM Bot is online! Logged in as ${client.user.tag}`);
    console.log(`🤖 Cached Guilds count: ${client.guilds.cache.size}`);
    try {
      client.user.setPresence({
        activities: [{ name: '/help | Cricket Ascend 🏏', type: ActivityType.Playing }],
        status: 'online'
      });
      console.log('✅ Bot presence set to ONLINE (Playing /help | Cricket Ascend 🏏)');
    } catch (err) {
      console.error('Error setting bot presence:', err?.message || err);
    }
  }
};
