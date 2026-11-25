import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const commands = [
  // /begin
  new SlashCommandBuilder()
    .setName('begin')
    .setDescription('Create your player and begin your Cricket Ascend career'),

  // /profile
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your player card and career progression')
    .addUserOption(option =>
      option.setName('user').setDescription('The user whose profile you want to view').setRequired(false)
    ),

  // /balance
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('View your coin wallet, training tickets, skill points, and vitals')
    .addUserOption(option =>
      option.setName('user').setDescription('The user whose balance you want to view').setRequired(false)
    ),

  // /bal
  new SlashCommandBuilder()
    .setName('bal')
    .setDescription('Quick shortcut to view your wallet balance and tickets')
    .addUserOption(option =>
      option.setName('user').setDescription('The user whose balance you want to view').setRequired(false)
    ),

  // /achievements
  new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View career achievements and milestones')
    .addUserOption(option =>
      option.setName('user').setDescription('The user whose achievements you want to view').setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('page').setDescription('Jump to a specific achievements page').setRequired(false)
    ),

  // /academy
  new SlashCommandBuilder()
    .setName('academy')
    .setDescription('View academy status or select/change your academy'),

  // /train
  new SlashCommandBuilder()
    .setName('train')
    .setDescription('Train your player to boost specific attributes')
    .addStringOption(option =>
      option.setName('regime').setDescription('Select a training discipline').setRequired(true)
        .addChoices(
          { name: 'Nets Batting Practice (+Batting Attributes)', value: 'batting' },
          { name: 'Target Bowling Drills (+Bowling Attributes)', value: 'bowling' },
          { name: 'Gym Workout (+Power, Fitness, Stamina)', value: 'fitness' },
          { name: 'Sprinting & Fielding Drills (+Fielding, Running, Reflexes)', value: 'fielding' }
        )
    ),

  // /chapters
  new SlashCommandBuilder()
    .setName('chapters')
    .setDescription('View career chapter levels and objectives'),

  // /play
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a cricket match to progress in your career')
    .addStringOption(option =>
      option.setName('type').setDescription('Type of match to play').setRequired(true)
        .addChoices(
          { name: 'Practice Nets Match (Casual XP/Coins)', value: 'practice' },
          { name: 'Current Career Chapter Match (Progression)', value: 'chapter' }
        )
    ),

  // /inventory
  new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Check your items, equipment, and gear'),

  // /equipment
  new SlashCommandBuilder()
    .setName('equipment')
    .setDescription('Visit the equipment shop or buy gear')
    .addSubcommand(subcommand =>
      subcommand.setName('shop').setDescription('Browse equipment currently in the shop')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('buy')
        .setDescription('Purchase equipment from the shop')
        .addStringOption(option =>
          option.setName('item_id').setDescription('The ID of the item to buy').setRequired(true)
        )
    ),

  // /attributes
  new SlashCommandBuilder()
    .setName('attributes')
    .setDescription('View your core player attributes and statistics'),

  // /skills
  new SlashCommandBuilder()
    .setName('skills')
    .setDescription('Manage your player skills and abilities')
    .addSubcommand(subcommand =>
      subcommand.setName('view').setDescription('View your skill tree and current skill points')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unlock')
        .setDescription('Unlock a skill node from the tree')
        .addStringOption(option =>
          option.setName('skill_key').setDescription('The key identifier of the skill to unlock').setRequired(true)
        )
    ),

  // /leaderboard
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the global Career Mode leaderboards')
    .addStringOption(option =>
      option.setName('type').setDescription('Filter leaderboard by stat').setRequired(true)
        .addChoices(
          { name: 'Career Level', value: 'level' },
          { name: 'Total Runs', value: 'runs' },
          { name: 'Total Wickets', value: 'wickets' },
          { name: 'Coins Balance', value: 'coins' }
        )
    ),

  // /history
  new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your player\'s recent match history records'),

  // /stats
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View highly detailed lifetime career statistics'),

  // /contracts
  new SlashCommandBuilder()
    .setName('contracts')
    .setDescription('Review your active contracts and salary details'),

  // /team
  new SlashCommandBuilder()
    .setName('team')
    .setDescription('View details about your current cricket academy and club contract team'),

  // /sponsors
  new SlashCommandBuilder()
    .setName('sponsors')
    .setDescription('View details about your active sponsor and endorsement deals'),

  // /challenge [duel | stats | leaderboard]
  new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Challenge other players or view PvP stats')
    .addSubcommand(subcommand =>
      subcommand
        .setName('duel')
        .setDescription('Challenge another user to a 1-over (6 balls) shootout')
        .addUserOption(option =>
          option.setName('user').setDescription('The user you want to duel').setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('target').setDescription('Target runs to defend/chase in Showdown (default: 15)').setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View Challenge Mode statistics and PvP record')
        .addUserOption(option =>
          option.setName('user').setDescription('User whose stats you want to view').setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the global Challenge Mode PvP leaderboard')
    ),

  // /season
  new SlashCommandBuilder()
    .setName('season')
    .setDescription('Check current season league division status, drafting state, and national team standing'),

  // /retire
  new SlashCommandBuilder()
    .setName('retire')
    .setDescription('Retire your current player and reset your stats for a fresh start'),

  // /help
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the commands directory, game modes, and gameplay guides')
    .addStringOption(option =>
      option.setName('topic').setDescription('Jump directly to a guide category').setRequired(false)
        .addChoices(
          { name: 'Starter Guide', value: 'starter' },
          { name: 'Game Modes (Tournaments, Franchise, Chapters, PvP)', value: 'modes' },
          { name: 'All Slash Commands Directory', value: 'commands' },
          { name: 'Batting & Gameplay Mechanics', value: 'gameplay' },
          { name: 'Teams, Academies & Sponsors', value: 'teams' },
          { name: 'Pro Strategy Guide', value: 'strategy' }
        )
    ),

  // /admin
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin operations for testing and troubleshooting')
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give coins or XP to a player')
        .addUserOption(option => option.setName('user').setDescription('The target player').setRequired(true))
        .addStringOption(option =>
          option.setName('type').setDescription('Type of resource to give').setRequired(true)
            .addChoices(
              { name: 'Coins', value: 'coins' },
              { name: 'XP', value: 'xp' },
              { name: 'Training Tokens', value: 'training_tokens' }
            )
        )
        .addIntegerOption(option => option.setName('amount').setDescription('Amount of resource').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set_energy')
        .setDescription('Restore player energy')
        .addUserOption(option => option.setName('user').setDescription('The target player').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Energy level (0-100)').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dashboard')
        .setDescription('Open the Bot Owner Emoji Config Dashboard')
    ),

  // /owner
  new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Bot Owner only commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give coins, XP, reputation, tokens, confidence, form, or skill points to a player')
        .addUserOption(option => option.setName('user').setDescription('The target player').setRequired(true))
        .addStringOption(option =>
          option.setName('type').setDescription('Type of resource to give').setRequired(true)
            .addChoices(
              { name: 'Coins', value: 'coins' },
              { name: 'XP', value: 'xp' },
              { name: 'Training Tokens', value: 'training_tokens' },
              { name: 'Reputation', value: 'reputation' },
              { name: 'Confidence', value: 'confidence' },
              { name: 'Form', value: 'form' },
              { name: 'Skill Points', value: 'skill_points' },
              { name: 'Energy', value: 'energy' }
            )
        )
        .addIntegerOption(option => option.setName('amount').setDescription('Amount of resource').setRequired(true))
    ),

  // /franchise
  new SlashCommandBuilder()
    .setName('franchise')
    .setDescription('Access the T20 Franchise League Career dashboard and stats'),

  // /playmatch
  new SlashCommandBuilder()
    .setName('playmatch')
    .setDescription('Play your active scheduled Franchise League match day'),

  // /tournament
  new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament Mode: Play vs Computer, grind XP, level up, and unlock championship tournaments')
    .addSubcommand(subcommand =>
      subcommand
        .setName('hub')
        .setDescription('Open the Tournament Arena and Exhibition Hub')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('quickmatch')
        .setDescription('Play a Quick Exhibition Match against the computer to grind XP')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Play your next active tournament knockout match')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bracket')
        .setDescription('View your current tournament knockout bracket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('abandon')
        .setDescription('Abandon your current active tournament campaign')
    ),

  // /shotmap
  new SlashCommandBuilder()
    .setName('shotmap')
    .setDescription('Configure your Batting Shot Map & Presets for matches')
    .addSubcommand(subcommand =>
      subcommand
        .setName('hub')
        .setDescription('Open the interactive Shot Map & Preset Editor')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('preset')
        .setDescription('View your currently equipped shot preset overview across 72 combinations')
        .addIntegerOption(option =>
          option
            .setName('page')
            .setDescription('Select preset page (1: Front Foot, 2: Back Foot, 3: Advanced)')
            .setRequired(false)
            .addChoices(
              { name: 'Page 1: Front Foot (24 Shots)', value: 1 },
              { name: 'Page 2: Back Foot (24 Shots)', value: 2 },
              { name: 'Page 3: Advanced / Step Out (24 Shots)', value: 3 }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset your shot map back to the default balanced preset')
    ),

  // /settings
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure your personal bot preferences (Graphics vs Embeds, Radar, DMs, etc.)'),

  // /invite
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the official invite link to add Cricket Ascend to your server')
].map(command => command.toJSON());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Main execution function
async function deploy() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.error('❌ Error: DISCORD_TOKEN and CLIENT_ID are required in environment variables!');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`⏳ Started refreshing ${commands.length} application (/) commands.`);

    const isGuildOnly = process.argv.includes('--guild');

    if (isGuildOnly && guildId) {
      console.log(`⏳ Deploying ${commands.length} application (/) commands to dev guild ${guildId}...`);
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} application (/) commands for Guild ${guildId}.`);
    } else {
      console.log(`⏳ Deploying ${commands.length} application (/) commands GLOBALLY across all Discord servers...`);
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} global application (/) commands across all servers!`);

      // Clear any guild-specific commands for the dev guild to avoid duplicate command entries
      if (guildId) {
        console.log(`🧹 Clearing guild-specific commands for Guild ${guildId} to prevent duplicates...`);
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: [] }
        );
        console.log(`✅ Guild-specific command list cleared. Global commands will serve all servers.`);
      }
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

// Check if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deploy();
}

export { deploy };
