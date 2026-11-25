import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import net from 'net';
import readyEvent from './events/ready.js';
import interactionCreateEvent from './events/interactionCreate.js';
import { startWebServer } from '../web/server.js';

dotenv.config();

// Start Cricket Ascend Web Portal alongside Discord Bot
startWebServer();

// Enforce single-instance process lock
const LOCK_PORT = 39821;
const lockServer = net.createServer();
lockServer.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Another instance of Virtual CM Bot is already running on port ${LOCK_PORT}! Exiting duplicate instance.`);
    process.exit(0);
  }
});
lockServer.listen(LOCK_PORT, '127.0.0.1', () => {
  console.log(`🔒 Single-instance lock acquired on 127.0.0.1:${LOCK_PORT}`);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ Error: DISCORD_TOKEN is missing in your environment configuration (.env file)!');
  process.exit(1);
}

// Create new Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ]
});

// Bind Event Handlers
client.once(readyEvent.name, (...args) => readyEvent.execute(...args));
client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args));

// Register global error listener on client to prevent crashes from unhandled REST/Gateway issues
client.on('error', error => {
  console.error('🛡️ Discord Client emitted an error:', error);
});

// Log in to Discord
client.login(token)
  .then(() => {
    console.log('⏳ Connecting to Discord Gateway...');
  })
  .catch(error => {
    console.error('❌ Login failed! Please verify your DISCORD_TOKEN. Error details:', error);
  });
