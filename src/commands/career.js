import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import db, { generateUniquePublicId } from '../database/db.js';
import { academies } from '../game/academies.js';
import { generateAcademiesForNation } from '../game/nationAcademies.js';
import { addXP, getLevelRequiredXP, updateAndGetEnergy, getEquipmentBonuses, getEffectiveAttributes } from '../game/utils.js';
import { getPlayerModeStatsBreakdown } from '../game/statsHelper.js';
import { emojis } from '../game/emojis.js';
import { getPlayerSettings } from '../game/settings.js';
import fs from 'fs';
import path from 'path';
import { sendBotLog } from '../game/botLogger.js';

// Load canvas library safely
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back to text profile.');
}

/**
 * Safely replies or edits an interaction depending on its current state.
 * Prevents "DiscordjsError [InteractionNotReplied]: The reply to this interaction has not been sent or deferred."
 */
export async function safeReplyOrEdit(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    } else {
      return await interaction.reply(payload);
    }
  } catch (err) {
    console.error('safeReplyOrEdit error:', err?.message || err);
    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(payload);
      } else {
        return await interaction.reply(payload);
      }
    } catch (e2) {
      if (interaction.channel?.send) {
        return await interaction.channel.send(payload).catch(() => {});
      }
    }
  }
}

/**
 * Safely updates or replies to a message component or modal interaction.
 */
export async function safeComponentUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    } else if (typeof interaction.update === 'function') {
      return await interaction.update(payload);
    } else {
      return await interaction.reply(payload);
    }
  } catch (err) {
    console.error('safeComponentUpdate error:', err?.message || err);
    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(payload);
      } else if (typeof interaction.update === 'function') {
        return await interaction.update(payload);
      } else {
        return await interaction.reply(payload);
      }
    } catch (e2) {
      if (interaction.channel?.send) {
        return await interaction.channel.send(payload).catch(() => {});
      }
    }
  }
}

export const NATION_OPTIONS = [
  { label: 'India', emoji: '🇮🇳', value: 'India', description: 'Powerhouse of world cricket with deep domestic academies' },
  { label: 'Australia', emoji: '🇦🇺', value: 'Australia', description: 'Hard-pitch specialists with aggressive fast-bowling roots' },
  { label: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', value: 'England', description: 'Home of cricket with elite swing and technical mastery' },
  { label: 'South Africa', emoji: '🇿🇦', value: 'South Africa', description: 'Athletic fielding and lethal pace battery heritage' },
  { label: 'Pakistan', emoji: '🇵🇰', value: 'Pakistan', description: 'Renowned for fiery reverse-swing and mystery spin' },
  { label: 'New Zealand', emoji: '🇳🇿', value: 'New Zealand', description: 'Disciplined tactical execution and clutch tournament grit' },
  { label: 'West Indies', emoji: '🌴', value: 'West Indies', description: 'Raw power hitting and world-renowned flair' },
  { label: 'Sri Lanka', emoji: '🇱🇰', value: 'Sri Lanka', description: 'Crafty spin variations and innovative stroke makers' },
  { label: 'Bangladesh', emoji: '🇧🇩', value: 'Bangladesh', description: 'Passionate spin culture and resilient fighters' },
  { label: 'Afghanistan', emoji: '🇦🇫', value: 'Afghanistan', description: 'Explosive rise driven by world-class spin wizards' },
  { label: 'Zimbabwe', emoji: '🇿🇼', value: 'Zimbabwe', description: 'Proud African cricketing heritage and fighting spirit' },
  { label: 'Ireland', emoji: '🇮🇪', value: 'Ireland', description: 'Tenacious giant-slayers with crisp seam-bowling roots' },
  { label: 'Scotland', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', value: 'Scotland', description: 'Steadfast European power with modern attacking intent' },
  { label: 'Netherlands', emoji: '🇳🇱', value: 'Netherlands', description: 'Fearless associate champions with clinical game plans' },
  { label: 'Nepal', emoji: '🇳🇵', value: 'Nepal', description: 'Electric fan following and exceptional young talent' },
  { label: 'United Arab Emirates', emoji: '🇦🇪', value: 'UAE', description: 'World-class desert training hubs and franchise crossroads' },
  { label: 'United States', emoji: '🇺🇸', value: 'USA', description: 'Rapidly rising superpower with cutting-edge sporting facilities' },
  { label: 'Canada', emoji: '🇨🇦', value: 'Canada', description: 'Historic North American presence with diverse talent' },
  { label: 'Namibia', emoji: '🇳🇦', value: 'Namibia', description: 'Tough, disciplined all-rounders with fearless temperament' },
  { label: 'Oman', emoji: '🇴🇲', value: 'Oman', description: 'Elite modern infrastructure and disciplined associate squad' },
  { label: 'Uganda', emoji: '🇺🇬', value: 'Uganda', description: 'Dynamic rising cricket pioneers with passionate athleticism' },
  { label: 'Kenya', emoji: '🇰🇪', value: 'Kenya', description: 'Historic World Cup semi-finalists with deep heritage' },
  { label: 'Papua New Guinea', emoji: '🇵🇬', value: 'PNG', description: 'World-class athletic fielding and spirited teamwork' },
  { label: 'Hong Kong', emoji: '🇭🇰', value: 'Hong Kong', description: 'Competitive Asian tournament stalwarts' },
  { label: 'Singapore', emoji: '🇸🇬', value: 'Singapore', description: 'Modern metropolitan development and ambitious squad' }
];

export const creationSessions = new Map();

export function getOrCreateSession(discordId, initialName = null) {
  if (!creationSessions.has(discordId)) {
    creationSessions.set(discordId, {
      name: initialName,
      primary_role: null,
      batting_hand: null,
      bowling_style: null,
      nationality: null,
      academy_id: null,
      updatedAt: Date.now()
    });
  }
  const session = creationSessions.get(discordId);
  if (initialName && !session.name) session.name = initialName;
  session.updatedAt = Date.now();
  return session;
}

export function getStep1Payload(discordId, defaultName) {
  const embed = new EmbedBuilder()
    .setTitle('🏏 Begin Your Career • Step 1/6: Player Name')
    .setDescription(
      `Welcome to **Cricket Ascend**!\n\n` +
      `Every cricket legend begins with a name on the team sheet.\n\n` +
      `• Default Name: **${defaultName}**\n\n` +
      `Click **Continue** to use your Discord name, or click **Enter Custom Name** to specify a custom player name.`
    )
    .setColor('#38bdf8')
    .setFooter({ text: 'Cricket Ascend • Step 1 of 6' });

  const files = [];
  const nameImagePath = path.join(process.cwd(), 'name.png');
  if (fs.existsSync(nameImagePath)) {
    files.push(new AttachmentBuilder(nameImagePath, { name: 'name.png' }));
    embed.setImage('attachment://name.png');
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`begin_name_keep_${discordId}`)
      .setLabel(`✅ Continue as "${defaultName.substring(0, 20)}"`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`begin_name_custom_${discordId}`)
      .setLabel('✏️ Enter Custom Name')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row], files };
}

export function getStep2Payload(discordId, playerName) {
  const embed = new EmbedBuilder()
    .setTitle('🏏 Begin Your Career • Step 2/6: Primary Role')
    .setDescription(
      `Player Name: **${playerName}**\n\n` +
      `Select your primary role in the team:\n\n` +
      `• 🏏 **Batsman**: Specialist run machine. Wider timing sweet-spots and elevated boundary power.\n` +
      `• 🧤 **Wicket-Keeper**: Agile gloveman & anchor. Sharp reflex fielding and crisp boundary placement.\n` +
      `• 🥎 **Bowler**: Lethal strike weapon. Commanding line, length, swing variations, and spin control.\n` +
      `• ⚡ **All-Rounder**: The complete cricketer. Dual-threat mastery capable of match-winning heroics with both bat and ball.`
    )
    .setColor('#38bdf8')
    .setFooter({ text: 'Cricket Ascend • Step 2 of 6' });

  const files = [];
  const roleImagePath = path.join(process.cwd(), 'role.png');
  if (fs.existsSync(roleImagePath)) {
    files.push(new AttachmentBuilder(roleImagePath, { name: 'role.png' }));
    embed.setImage('attachment://role.png');
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`begin_role_Batsman_${discordId}`)
      .setLabel('🏏 Batsman')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`begin_role_Wicket-Keeper_${discordId}`)
      .setLabel('🧤 Wicket-Keeper')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`begin_role_Bowler_${discordId}`)
      .setLabel('🥎 Bowler')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`begin_role_All-Rounder_${discordId}`)
      .setLabel('⚡ All-Rounder')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row], files };
}

export function getStep3Payload(discordId, session) {
  const embed = new EmbedBuilder()
    .setTitle('🏏 Begin Your Career • Step 3/6: Batting Stance')
    .setDescription(
      `Player: **${session.name}** | Role: **${session.primary_role}**\n\n` +
      `Choose your batting hand and stance at the crease:`
    )
    .setColor('#38bdf8')
    .setFooter({ text: 'Cricket Ascend • Step 3 of 6' });

  const files = [];
  const battingHandImagePath = path.join(process.cwd(), 'battinghand.png');
  if (fs.existsSync(battingHandImagePath)) {
    files.push(new AttachmentBuilder(battingHandImagePath, { name: 'battinghand.png' }));
    embed.setImage('attachment://battinghand.png');
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`begin_hand_Right_${discordId}`)
      .setLabel('🏏 Right Handed')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`begin_hand_Left_${discordId}`)
      .setLabel('🏏 Left Handed')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row], files };
}

export function getStep4Payload(discordId, session) {
  const embed = new EmbedBuilder()
    .setTitle('🏏 Begin Your Career • Step 4/6: Bowling Discipline')
    .setDescription(
      `Player: **${session.name}** | Role: **${session.primary_role}** (${session.batting_hand} Bat)\n\n` +
      `Select your bowling action and discipline:`
    )
    .setColor('#38bdf8')
    .setFooter({ text: 'Cricket Ascend • Step 4 of 6' });

  const files = [];
  const bowlingStyleImagePath = path.join(process.cwd(), 'bowlingstyle.png');
  if (fs.existsSync(bowlingStyleImagePath)) {
    files.push(new AttachmentBuilder(bowlingStyleImagePath, { name: 'bowlingstyle.png' }));
    embed.setImage('attachment://bowlingstyle.png');
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`begin_bowl_RF_${discordId}`)
      .setLabel('⚡ Right-arm Fast')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`begin_bowl_LF_${discordId}`)
      .setLabel('⚡ Left-arm Fast')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`begin_bowl_RS_${discordId}`)
      .setLabel('🌀 Right-arm Spin')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`begin_bowl_LS_${discordId}`)
      .setLabel('🌀 Left-arm Spin')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2], files };
}

export function getStep5Payload(discordId, session) {
  const embed = new EmbedBuilder()
    .setTitle('🏏 Begin Your Career • Step 5/6: Nationality')
    .setDescription(
      `Player: **${session.name}** | Style: **${session.batting_hand} Bat | ${session.bowling_style}**\n\n` +
      `Select the cricketing nation you will represent from the dropdown below:`
    )
    .setColor('#38bdf8')
    .setFooter({ text: 'Cricket Ascend • Step 5 of 6' });

  const files = [];
  const nationalityImagePath = path.join(process.cwd(), 'nationality.png');
  if (fs.existsSync(nationalityImagePath)) {
    files.push(new AttachmentBuilder(nationalityImagePath, { name: 'nationality.png' }));
    embed.setImage('attachment://nationality.png');
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`begin_nation_${discordId}`)
    .setPlaceholder('Select your country...')
    .addOptions(
      NATION_OPTIONS.map(n => ({
        label: `${n.emoji} ${n.label}`,
        description: n.description,
        value: n.value
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);
  return { embeds: [embed], components: [row], files };
}

export function getStep6Payload(discordId, session) {
  const nationAcademiesList = generateAcademiesForNation(session.nationality);

  let desc = `Player: **${session.name}** (${session.nationality})\n\n` +
             `Every great player starts at an academy. Academies grant permanent percentage bonuses to your training gains.\n\n` +
             `Here are the premier academies available in **${session.nationality}**:\n\n`;

  for (const acad of nationAcademiesList) {
    const enrolled = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(acad.id)?.count || 0;
    desc += `⭐ **${acad.name}** (${'⭐'.repeat(acad.rating)})\n`;
    desc += `  • *Specialty:* ${acad.specialty} | *Focus:* ${acad.trainingBonusText}\n`;
    desc += `  • *Coach:* ${acad.coachRating} | *Enrolled:* **${enrolled}/40** ${enrolled >= 40 ? '🔴 (FULL)' : ''}\n\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎓 Begin Your Career • Step 6/6: Choose Your Academy')
    .setDescription(desc.substring(0, 4000))
    .setColor('#00ffcc')
    .setFooter({ text: 'Cricket Ascend • Step 6 of 6' })
    .setTimestamp();

  const files = [];
  const academyImagePath = path.join(process.cwd(), 'academy.png');
  if (fs.existsSync(academyImagePath)) {
    files.push(new AttachmentBuilder(academyImagePath, { name: 'academy.png' }));
    embed.setImage('attachment://academy.png');
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`begin_acad_${discordId}`)
    .setPlaceholder('Select your training academy...')
    .addOptions(
      nationAcademiesList.map(acad => {
        const enrolled = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(acad.id)?.count || 0;
        return {
          label: `${acad.name.substring(0, 60)} (${enrolled}/40)`,
          description: `Specialty: ${acad.specialty.substring(0, 50)}`,
          value: acad.id
        };
      })
    );

  const row = new ActionRowBuilder().addComponents(select);
  return { embeds: [embed], components: [row], files };
}

export function generateStartingAttributes(role, bowlingStyle = '') {
  const base = {
    power: 10,
    timing: 10,
    technique: 10,
    spin: 10,
    pace: 10,
    fitness: 10,
    mentality: 10,
    aggression: 10,
    defense: 10,
    running: 10,
    fielding: 10,
    reflex: 10,
    throw_accuracy: 10,
    swing: 10,
    seam: 10,
    spin_bowling: 10,
    accuracy: 10,
    variations: 10,
    stamina: 10
  };

  const isSpin = (bowlingStyle || '').toLowerCase().includes('spin');

  if (role === 'Batsman') {
    base.power = 15;
    base.timing = 15;
    base.technique = 14;
    base.defense = 14;
    base.running = 12;
  } else if (role === 'Wicket-Keeper') {
    base.timing = 14;
    base.technique = 12;
    base.defense = 13;
    base.reflex = 15;
    base.fielding = 15;
    base.running = 13;
  } else if (role === 'Bowler') {
    base.accuracy = 15;
    base.variations = 13;
    base.stamina = 13;
    if (isSpin) {
      base.spin_bowling = 15;
      base.spin = 14;
    } else {
      base.pace = 15;
      base.swing = 14;
      base.seam = 14;
    }
  } else if (role === 'All-Rounder') {
    base.timing = 13;
    base.power = 12;
    base.accuracy = 13;
    base.fitness = 12;
    base.stamina = 12;
    if (isSpin) {
      base.spin_bowling = 13;
    } else {
      base.swing = 13;
    }
  }

  return base;
}

export async function finalizeCareerCreation(interaction, discordId, selectedAcademyId) {
  const session = creationSessions.get(discordId);
  if (!session) {
    return await safeReplyOrEdit(interaction, {
      content: '⚠️ Creation session expired. Please run `/begin` to start again.',
      flags: ['Ephemeral']
    });
  }

  const nationAcademiesList = generateAcademiesForNation(session.nationality);
  const academy = nationAcademiesList.find(ac => ac.id === selectedAcademyId);

  // Check 40-player limit
  const enrolledCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(selectedAcademyId)?.count || 0;
  if (enrolledCount >= 40) {
    return await safeReplyOrEdit(interaction, {
      content: `❌ The **${academy.name}** is currently full (**40/40 players**)! Please select a different academy.`,
      flags: ['Ephemeral']
    });
  }

  // Insert academy into DB if needed
  db.prepare(`
    INSERT OR REPLACE INTO academies (id, name, rating, reputation, history, specialty, coach_rating, training_bonus_text, bonuses_json, graduates_domestic, graduates_international, success_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    academy.id, 
    academy.name, 
    academy.rating, 
    academy.reputation, 
    academy.history, 
    academy.specialty, 
    academy.coachRating, 
    academy.trainingBonusText, 
    JSON.stringify(academy.bonuses), 
    academy.graduatesDomestic, 
    academy.graduatesInternational, 
    academy.successRate
  );

  const { loadAcademies } = await import('../game/academies.js');
  loadAcademies();

  // Create player and associated tables
  const now = Date.now();
  const publicId = generateUniquePublicId(db);
  db.prepare(`
    INSERT INTO players (discord_id, public_id, name, batting_hand, bowling_style, primary_role, nationality, academy_id, last_energy_update, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(discordId, publicId, session.name, session.batting_hand, session.bowling_style, session.primary_role, session.nationality, selectedAcademyId, now);

  const startingAttrs = generateStartingAttributes(session.primary_role, session.bowling_style);
  db.prepare(`
    INSERT INTO attributes (
      player_id, power, timing, technique, spin, pace, fitness, mentality, aggression, defense,
      running, fielding, reflex, throw_accuracy, swing, seam, spin_bowling, accuracy, variations, stamina
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    discordId,
    startingAttrs.power, startingAttrs.timing, startingAttrs.technique, startingAttrs.spin, startingAttrs.pace,
    startingAttrs.fitness, startingAttrs.mentality, startingAttrs.aggression, startingAttrs.defense,
    startingAttrs.running, startingAttrs.fielding, startingAttrs.reflex, startingAttrs.throw_accuracy,
    startingAttrs.swing, startingAttrs.seam, startingAttrs.spin_bowling, startingAttrs.accuracy,
    startingAttrs.variations, startingAttrs.stamina
  );
  db.prepare('INSERT INTO stats (player_id) VALUES (?)').run(discordId);
  db.prepare('INSERT INTO challenge_stats (player_id) VALUES (?)').run(discordId);

  // Starter gear
  const starterBatBonuses = JSON.stringify({ power: 1, timing: 1 });
  db.prepare(`
    INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
    VALUES (?, 'club_willow', 'Club Willow Bat', 'Bat', 'Common', ?, 1)
  `).run(discordId, starterBatBonuses);

  const starterShoesBonuses = JSON.stringify({ running: 1 });
  db.prepare(`
    INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
    VALUES (?, 'club_shoes', 'Academy Running Shoes', 'Shoes', 'Common', ?, 1)
  `).run(discordId, starterShoesBonuses);

  // Trigger achievement checks (Beta Tester, etc.)
  const result = addXP(db, discordId, 0);

  // Send Audit Log to Bot Log Channel
  sendBotLog(interaction.client, {
    title: '👤 New Career Player Registered',
    description: `**${session.name}** (<@${discordId}>) has officially registered their player profile in **Cricket Ascend**!`,
    color: '#2ecc71',
    fields: [
      { name: 'Role', value: session.primary_role, inline: true },
      { name: 'Discipline', value: `${session.batting_hand} Bat | ${session.bowling_style}`, inline: true },
      { name: 'Nationality', value: session.nationality, inline: true },
      { name: 'Academy', value: academy.name, inline: true }
    ]
  });

  // Clear session
  creationSessions.delete(discordId);

  // Welcome Embed
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('🏏 Career Mode Activated!')
    .setDescription(
      `🎉 Congratulations **${session.name}**! You have officially joined **${academy.name}**!\n\n` +
      `Your academy has equipped you with starter gear:\n` +
      `• 🏏 **Club Willow Bat** (+1 Power, +1 Timing)\n` +
      `• 👟 **Academy Running Shoes** (+1 Running)\n\n` +
      `Use \`/profile\` to inspect your player card, \`/train\` to practice, or \`/chapters\` to begin your 50-chapter campaign journey!`
    )
    .setColor('#2ecc71')
    .setThumbnail(interaction.user.displayAvatarURL?.() || 'https://cdn.discordapp.com/embed/avatars/0.png')
    .addFields(
      { name: 'Role', value: session.primary_role, inline: true },
      { name: 'Style', value: `${session.batting_hand} Bat | ${session.bowling_style}`, inline: true },
      { name: 'Nationality', value: session.nationality, inline: true }
    );

  if (result.achievementsUnlocked.length > 0) {
    welcomeEmbed.addFields({
      name: '🏆 Achievements Unlocked!',
      value: result.achievementsUnlocked.join(', ')
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`btn_profile_${discordId}`).setLabel('👤 View Profile').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_chapters_${discordId}`).setLabel('🏏 Play Campaign').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`btn_train_${discordId}`).setLabel('🏋️ Train Regimes').setStyle(ButtonStyle.Secondary)
  );

  return await safeComponentUpdate(interaction, {
    embeds: [welcomeEmbed],
    components: [row],
    files: []
  });
}

export async function handleBeginInteraction(interaction) {
  const customId = interaction.customId;
  let discordId = null;

  if (customId.startsWith('modal_begin_name_')) {
    discordId = customId.replace('modal_begin_name_', '');
  } else if (customId.startsWith('begin_name_keep_')) {
    discordId = customId.replace('begin_name_keep_', '');
  } else if (customId.startsWith('begin_name_custom_')) {
    discordId = customId.replace('begin_name_custom_', '');
  } else if (customId.startsWith('begin_role_')) {
    const rest = customId.replace('begin_role_', '');
    discordId = rest.substring(rest.indexOf('_') + 1);
  } else if (customId.startsWith('begin_hand_')) {
    const rest = customId.replace('begin_hand_', '');
    discordId = rest.substring(rest.indexOf('_') + 1);
  } else if (customId.startsWith('begin_bowl_')) {
    const rest = customId.replace('begin_bowl_', '');
    discordId = rest.substring(rest.indexOf('_') + 1);
  } else if (customId.startsWith('begin_nation_')) {
    discordId = customId.replace('begin_nation_', '');
  } else if (customId.startsWith('begin_acad_')) {
    discordId = customId.replace('begin_acad_', '');
  } else {
    discordId = customId.split('_').pop();
  }

  if (interaction.user.id !== discordId) {
    return interaction.reply({
      content: '❌ This career setup session belongs to another player!',
      flags: ['Ephemeral']
    });
  }

  // 1. Modal submit for custom name
  if (interaction.isModalSubmit() && customId.startsWith('modal_begin_name_')) {
    const customName = interaction.fields.getTextInputValue('input_player_name').trim() || interaction.user.username;
    const session = getOrCreateSession(discordId, customName);
    session.name = customName.substring(0, 30);
    const payload = getStep2Payload(discordId, session.name);
    return await safeComponentUpdate(interaction, payload);
  }

  // 2. Button: Keep default name
  if (customId.startsWith('begin_name_keep_')) {
    const session = getOrCreateSession(discordId);
    const payload = getStep2Payload(discordId, session.name);
    return await safeComponentUpdate(interaction, payload);
  }

  // 3. Button: Open custom name modal
  if (customId.startsWith('begin_name_custom_')) {
    const session = getOrCreateSession(discordId);
    const modal = new ModalBuilder()
      .setCustomId(`modal_begin_name_${discordId}`)
      .setTitle('Career Player Name');

    const nameInput = new TextInputBuilder()
      .setCustomId('input_player_name')
      .setLabel('Enter your career player name:')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(30)
      .setValue((session.name || interaction.user.username).substring(0, 30))
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    return await interaction.showModal(modal);
  }

  // 4. Button: Role selection (Batsman, Wicket-Keeper, Bowler, All-Rounder)
  if (customId.startsWith('begin_role_')) {
    const rest = customId.replace('begin_role_', '');
    const role = rest.substring(0, rest.indexOf('_'));
    const session = getOrCreateSession(discordId);
    session.primary_role = role;
    const payload = getStep3Payload(discordId, session);
    return await safeComponentUpdate(interaction, payload);
  }

  // 5. Button: Hand selection (Right, Left)
  if (customId.startsWith('begin_hand_')) {
    const rest = customId.replace('begin_hand_', '');
    const hand = rest.substring(0, rest.indexOf('_'));
    const session = getOrCreateSession(discordId);
    session.batting_hand = hand;
    const payload = getStep4Payload(discordId, session);
    return await safeComponentUpdate(interaction, payload);
  }

  // 6. Button: Bowling style (RF, LF, RS, LS)
  if (customId.startsWith('begin_bowl_')) {
    const rest = customId.replace('begin_bowl_', '');
    const code = rest.substring(0, rest.indexOf('_'));
    const styleMap = {
      'RF': 'Right-arm Fast',
      'LF': 'Left-arm Fast',
      'RS': 'Right-arm Spin',
      'LS': 'Left-arm Spin'
    };
    const session = getOrCreateSession(discordId);
    session.bowling_style = styleMap[code] || 'Right-arm Fast';
    const payload = getStep5Payload(discordId, session);
    return await safeComponentUpdate(interaction, payload);
  }

  // 7. Select Menu: Nationality
  if (interaction.isStringSelectMenu() && customId.startsWith('begin_nation_')) {
    const nationality = interaction.values[0];
    const session = getOrCreateSession(discordId);
    session.nationality = nationality;
    const payload = getStep6Payload(discordId, session);
    return await safeComponentUpdate(interaction, payload);
  }

  // 8. Select Menu: Academy (Finalization)
  if (interaction.isStringSelectMenu() && customId.startsWith('begin_acad_')) {
    const selectedAcademyId = interaction.values[0];
    return await finalizeCareerCreation(interaction, discordId, selectedAcademyId);
  }
}

export async function handleBegin(interaction) {
  const discordId = interaction.user.id;

  // Check if player already exists
  const existingPlayer = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);
  if (existingPlayer) {
    return await safeReplyOrEdit(interaction, {
      content: `❌ You already have an active career for **${existingPlayer.name}**! Use \`/profile\` to view your player card or \`/retire\` to start fresh.`,
      flags: ['Ephemeral']
    });
  }

  const defaultName = interaction.member?.displayName || interaction.user.username;
  const session = getOrCreateSession(discordId, defaultName);
  const payload = getStep1Payload(discordId, defaultName);
  return await safeReplyOrEdit(interaction, payload);
}

export const handleCareerStart = handleBegin;

function formatRegDate(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateStr.split(' ')[0];
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr.split(' ')[0];
  }
}

export async function handleProfile(interaction) {
  try {
    const targetUser = interaction.options?.getUser
      ? (interaction.options.getUser('user') || interaction.user)
      : interaction.user;
    const discordId = targetUser.id;
    const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

    if (!player) {
      const isSelf = targetUser.id === interaction.user.id;
      return interaction.reply({
        content: isSelf
          ? '❌ You do not have a career player yet! Use `/begin` to create your player and begin your cricket journey.'
          : `❌ **${targetUser.username}** does not have an active career profile yet.`,
        flags: ['Ephemeral']
      });
    }

    // Defer update if it is a button interaction, otherwise defer reply
    const isButton = interaction.isButton();
    if (isButton) {
      if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
    } else {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    }

  // Update and get current energy
  const currentEnergy = updateAndGetEnergy(db, discordId);
  const academy = academies[player.academy_id] || { name: 'None' };
  
  // XP Progress bar math
  const reqXP = getLevelRequiredXP(player.level);
  const xpPercent = Math.min(100, Math.max(0, (player.xp / reqXP) * 100));
  const regDate = formatRegDate(player.created_at);

  // Get current active contract
  const contract = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND active = 1').get(discordId);
  const contractText = contract 
    ? `💼 ${contract.club_name} (${contract.contract_type})\n💰 Salary: ${emojis.coin}${contract.salary_per_match} / match (Seasons Left: ${contract.remaining_seasons})`
    : `💼 Academy Player\n💰 Match Stipend: ${emojis.coin}20 / match`;

  // Honors and Titles (Tournaments & Franchise Won)
  const tourneyStats = db.prepare('SELECT COALESCE(SUM(won), 0) AS total_won FROM player_tournaments WHERE player_id = ?').get(discordId);
  const tournamentsWon = tourneyStats?.total_won || 0;
  const franchiseWon = player.franchise_titles || 0;

  // Helper function to draw rounded rectangles compatibly
  function drawRoundRect(ctx, x, y, width, height, radius, fillStyle = null, strokeStyle = null, strokeWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  const userSettings = getPlayerSettings(interaction.user.id);
  const preferGraphic = userSettings.display_mode !== 'embed';

  if (canvasLib && preferGraphic) {
    try {
      const { createCanvas, loadImage } = canvasLib;
      const canvas = createCanvas(840, 620);
      const ctx = canvas.getContext('2d');

      // Fetch avatar image
      let avatarImg = null;
      try {
        const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
        const response = await fetch(avatarUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          avatarImg = await loadImage(buffer);
        }
      } catch (e) {
        console.warn('Failed to load user avatar for profile card, using fallback initials badge.');
      }

      // 1. Luxury Dark Radial Background
      const bgGrad = ctx.createRadialGradient(420, 200, 80, 420, 310, 600);
      bgGrad.addColorStop(0, '#131d38');
      bgGrad.addColorStop(0.5, '#090d18');
      bgGrad.addColorStop(1, '#04060b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 840, 620);

      // Subtle futuristic grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 840; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 620);
        ctx.stroke();
      }
      for (let i = 0; i < 620; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(840, i);
        ctx.stroke();
      }

      // Outer glowing golden border
      drawRoundRect(ctx, 12, 12, 816, 596, 18, null, 'rgba(245, 158, 11, 0.45)', 2);

      // Corner accents
      const drawCorner = (x, y, w, h) => {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      };
      drawCorner(8, 8, 20, 20);
      drawCorner(812, 8, 20, 20);
      drawCorner(8, 592, 20, 20);
      drawCorner(812, 592, 20, 20);

      // Top Status Header Strip
      drawRoundRect(ctx, 30, 22, 780, 28, 8, 'rgba(15, 23, 42, 0.85)', 'rgba(245, 158, 11, 0.35)', 1);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`CRICKET ASCEND OFFICIAL CAREER PROFILE • PLAYER ID: ${player.public_id || discordId}`, 420, 40);

      // 2. Left Panel: Bio card
      drawRoundRect(ctx, 30, 60, 320, 530, 16, 'rgba(13, 20, 38, 0.9)', 'rgba(56, 189, 248, 0.35)', 1.5);

      // Outer avatar glow ring
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(190, 135, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Circular avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(190, 135, 50, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (avatarImg) {
        ctx.drawImage(avatarImg, 140, 85, 100, 100);
      } else {
        const avGrad = ctx.createLinearGradient(140, 85, 240, 185);
        avGrad.addColorStop(0, '#2563eb');
        avGrad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = avGrad;
        ctx.fillRect(140, 85, 100, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.name.substring(0, 2).toUpperCase(), 190, 135);
      }
      ctx.restore();

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      let fontSize = 22;
      ctx.font = `bold ${fontSize}px sans-serif`;
      while (ctx.measureText(player.name).width > 270 && fontSize > 16) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px sans-serif`;
      }
      ctx.fillText(player.name, 190, 212);

      // Role & Level Pill
      drawRoundRect(ctx, 60, 224, 125, 26, 13, 'rgba(245, 158, 11, 0.18)', '#f59e0b', 1);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${player.level}`, 122, 241);

      const roleColors = {
        'Batsman': { bg: 'rgba(56, 189, 248, 0.2)', border: '#38bdf8', text: '#38bdf8' },
        'Wicket-Keeper': { bg: 'rgba(52, 211, 153, 0.2)', border: '#34d399', text: '#34d399' },
        'Bowler': { bg: 'rgba(248, 113, 113, 0.2)', border: '#f87171', text: '#f87171' },
        'All-Rounder': { bg: 'rgba(245, 158, 11, 0.2)', border: '#fbbf24', text: '#fbbf24' }
      };
      const rCfg = roleColors[player.primary_role] || roleColors['Batsman'];

      drawRoundRect(ctx, 195, 224, 130, 26, 13, rCfg.bg, rCfg.border, 1);
      ctx.fillStyle = rCfg.text;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(player.primary_role.toUpperCase(), 260, 241);

      // Bio Fields
      const drawBioField = (y, label, val, color = '#ffffff') => {
        drawRoundRect(ctx, 45, y, 290, 44, 8, 'rgba(30, 41, 59, 0.55)', 'rgba(255, 255, 255, 0.08)', 1);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9.5px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, 58, y + 16);
        ctx.fillStyle = color;
        ctx.font = 'bold 12.5px sans-serif';
        ctx.fillText(val, 58, y + 34);
      };

      drawBioField(260, 'PLAYING DISCIPLINE', `${player.batting_hand} Bat | ${player.bowling_style}`, '#ffffff');
      drawBioField(312, 'TRAINING ACADEMY', academy.name, '#fbbf24');
      drawBioField(364, 'SPONSOR BRAND', player.sponsor || 'None', '#c084fc');
      drawBioField(416, 'REPRESENTING NATION', (player.nationality || 'CRICKET ASCEND').toUpperCase(), '#38bdf8');
      drawBioField(468, 'REGISTERED PRO DATE', regDate, '#34d399');

      // Honors & Titles Badge
      drawRoundRect(ctx, 45, 522, 290, 32, 6, 'rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.35)', 1);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🏆 Tournaments: ${tournamentsWon}  |  👑 Franchise: ${franchiseWon}`, 190, 542);

      // 3. Right Panel: Vitals & Financials
      drawRoundRect(ctx, 365, 60, 445, 530, 16, 'rgba(13, 20, 38, 0.9)', 'rgba(52, 211, 153, 0.35)', 1.5);

      // Section: Vitals
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('// PLAYER VITALS & MOMENTUM', 385, 88);

      const drawVitalBox = (x, y, label, val, percent, barColor) => {
        drawRoundRect(ctx, x, y, 195, 68, 8, 'rgba(30, 41, 59, 0.6)', 'rgba(255, 255, 255, 0.06)', 1);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText(label, x + 12, y + 19);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(val, x + 12, y + 41);

        // progress bar
        drawRoundRect(ctx, x + 12, y + 51, 171, 7, 3.5, '#0f172a');
        if (percent > 0) {
          drawRoundRect(ctx, x + 12, y + 51, Math.round(171 * (Math.min(100, percent) / 100)), 7, 3.5, barColor);
        }
      };

      drawVitalBox(385, 102, 'ENERGY BATTERY', `${currentEnergy} / 100`, currentEnergy, '#10b981');
      drawVitalBox(595, 102, 'MATCH CONFIDENCE', `${player.confidence} / 100`, player.confidence, '#f59e0b');
      drawVitalBox(385, 180, 'RECENT FORM', `${player.form} / 100`, player.form, '#38bdf8');
      drawVitalBox(595, 180, 'WORLD REPUTATION', `${player.reputation} REP`, Math.min(100, (player.reputation / 300) * 100), '#a855f7');

      // Section: Wallet
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('// ASSETS & CURRENCY VAULT', 385, 276);

      const drawResourceBox = (x, w, label, val, sub, color) => {
        drawRoundRect(ctx, x, 290, w, 62, 8, 'rgba(30, 41, 59, 0.6)', 'rgba(255, 255, 255, 0.06)', 1);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9.5px sans-serif';
        ctx.fillText(label, x + 12, 307);
        ctx.fillStyle = color;
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(val, x + 12, 329);
        ctx.fillStyle = '#64748b';
        ctx.font = '9px sans-serif';
        ctx.fillText(sub, x + 12, 343);
      };

      drawResourceBox(385, 128, 'COIN WALLET', `${player.coins.toLocaleString()}`, 'Purchasing Power', '#fbbf24');
      drawResourceBox(523, 128, 'SKILL POINTS', `${player.skill_points} SP`, 'Perk Unlocks', '#c084fc');
      drawResourceBox(661, 129, 'TRAIN TICKETS', `${player.training_tokens} Tix`, 'Daily Drills', '#34d399');

      // Section: Career Stats Summary Bar (on common graphic card)
      const pOv = getPlayerModeStatsBreakdown(db, discordId).overall;
      const bAvg = pOv.battingAvg;
      const bSr = pOv.strikeRate;
      const bEcon = pOv.economy;

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('// CAREER STATS', 385, 376);
      drawRoundRect(ctx, 385, 384, 405, 42, 8, 'rgba(30, 41, 59, 0.7)', 'rgba(56, 189, 248, 0.3)', 1);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11.5px sans-serif';
      ctx.fillText(`M: ${pOv.matches} (${pOv.notOuts} NO)   Runs: ${pOv.runs} (Avg ${bAvg} | SR ${bSr})   Wkts: ${pOv.wickets}`, 398, 410);

      // Section: Contract
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('// ACTIVE CLUB CONTRACT', 385, 444);

      drawRoundRect(ctx, 385, 452, 405, 52, 10, 'rgba(30, 41, 59, 0.65)', 'rgba(56, 189, 248, 0.25)', 1);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      if (contract) {
        ctx.fillText(`${contract.club_name} (${contract.contract_type})`, 400, 474);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11.5px sans-serif';
        ctx.fillText(`Salary: ${contract.salary_per_match} Coins/match • ${contract.remaining_seasons} Season(s)`, 400, 493);
      } else {
        ctx.fillText('Academy Trainee (Draft at Level 4)', 400, 474);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11.5px sans-serif';
        ctx.fillText('Match Stipend: 20 Coins / match', 400, 493);
      }

      // Section: XP Progress
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`// LEVEL PROGRESSION (${player.xp} / ${reqXP} XP)`, 385, 522);

      // XP progress bar
      drawRoundRect(ctx, 385, 530, 405, 22, 11, '#0b1120', 'rgba(255, 255, 255, 0.08)', 1);
      if (xpPercent > 0) {
        const xpGrad = ctx.createLinearGradient(385, 530, 790, 530);
        xpGrad.addColorStop(0, '#ec4899');
        xpGrad.addColorStop(1, '#f43f5e');
        drawRoundRect(ctx, 385, 530, Math.round(405 * (Math.min(100, xpPercent) / 100)), 22, 11, xpGrad);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(xpPercent)}% TO LEVEL ${player.level + 1}`, 587, 545);

      // Draw footer branding
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cricket Ascend Pro Profile • Passive Energy Recharge: 1 Energy / 3 mins', 587, 565);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `profile_${discordId}.png` });

      const isSelf = targetUser.id === interaction.user.id;
      if (isSelf) {
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`btn_stats_${discordId}`).setLabel('Lifetime Stats').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`btn_skills_${discordId}`).setLabel('Skill Tree').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`btn_achievements_${discordId}`).setLabel('🏅 Achievements').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`btn_train_${discordId}`).setLabel('Train Regimes').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`btn_chapters_${discordId}`).setLabel('Play Campaign').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`btn_franchise_${discordId}`).setLabel('🏆 Franchise').setStyle(ButtonStyle.Primary)
        );
        return await safeReplyOrEdit(interaction, {
          content: `🏏 **${player.name}'s Profile Card:**`,
          embeds: [],
          files: [attachment],
          attachments: [],
          components: [row1, row2]
        });
      } else {
        return await safeReplyOrEdit(interaction, {
          content: `🏏 **${player.name}'s Profile Card:**`,
          embeds: [],
          files: [attachment],
          attachments: []
        });
      }
    } catch (error) {
      console.error('Error drawing profile card canvas:', error);
      // Fallback below
    }
  }

  // Fallback Text Embed Profile
  const filledBars = Math.round(xpPercent / 10);
  const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(10 - filledBars);

  const avatarUrl = typeof targetUser.displayAvatarURL === 'function'
    ? targetUser.displayAvatarURL()
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const roleEmojiMap = {
    'Batsman': '🏏',
    'Wicket-Keeper': '🧤',
    'Bowler': '🥎',
    'All-Rounder': '⚡'
  };
  const roleColorMap = {
    'Batsman': '#38bdf8',
    'Wicket-Keeper': '#34d399',
    'Bowler': '#f87171',
    'All-Rounder': '#fbbf24'
  };

  const roleEmoji = roleEmojiMap[player.primary_role] || '🏏';
  const roleColor = roleColorMap[player.primary_role] || '#f59e0b';

  const embed = new EmbedBuilder()
    .setTitle(`${roleEmoji} Player Profile: ${player.name}`)
    .setDescription(`*Representing the proud nation of **${player.nationality || 'Cricket Ascend'}***`)
    .setColor(roleColor)
    .setThumbnail(avatarUrl)
    .addFields(
      { 
        name: '📋 Pro Bio Details', 
        value: `• **Role:** ${roleEmoji} **${player.primary_role}**\n• **Style:** ${player.batting_hand} Bat | ${player.bowling_style}\n• **Academy:** 🎓 ${academy.name}\n• **Sponsor:** ${emojis.shoes} ${player.sponsor || 'None'}\n• **Registered:** 📅 ${regDate}`, 
        inline: false 
      },
      { 
        name: `🏆 Level ${player.level} (${player.xp} / ${reqXP} XP)`, 
        value: `\`${progressBar}\` **${Math.round(xpPercent)}%**`, 
        inline: false 
      },
      { 
        name: '💎 Assets & Wallet', 
        value: `• **Coins:** ${emojis.coin} **${(player.coins || 0).toLocaleString()}**\n• **Skill Points:** ${emojis.sp} **${player.skill_points || 0} SP**\n• **Training Tickets:** ${emojis.token} **${(player.training_tokens || 0).toLocaleString()}**`, 
        inline: true 
      },
      { 
        name: '⚡ Performance Vitals', 
        value: `• **Energy:** ${currentEnergy}/100 ${emojis.energy}\n• **Confidence:** ${player.confidence}/100 ${emojis.confidence}\n• **Recent Form:** ${player.form}/100 ${emojis.form}\n• **Reputation:** ${player.reputation} REP ${emojis.reputation}`, 
        inline: true 
      },
      { 
        name: '🏆 Honors & Titles', 
        value: `• **Tournaments Won:** 🏆 **${tournamentsWon}**\n• **Franchise Titles:** 👑 **${franchiseWon}**`, 
        inline: false 
      },
      { 
        name: '📜 Active Contract', 
        value: contractText, 
        inline: false 
      }
    )
    .setFooter({ text: `Cricket Ascend Season ${player.season || 1} • Verified Pro Profile` })
    .setTimestamp();

  const isSelf = targetUser.id === interaction.user.id;
  if (isSelf) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`btn_stats_${discordId}`).setLabel('Lifetime Stats').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`btn_skills_${discordId}`).setLabel('Skill Tree').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`btn_achievements_${discordId}`).setLabel('🏅 Achievements').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`btn_train_${discordId}`).setLabel('Train Regimes').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_chapters_${discordId}`).setLabel('Play Campaign').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`btn_franchise_${discordId}`).setLabel('🏆 Franchise').setStyle(ButtonStyle.Primary)
    );
    await safeReplyOrEdit(interaction, { content: '', embeds: [embed], files: [], attachments: [], components: [row1, row2] });
  } else {
    await safeReplyOrEdit(interaction, { content: '', embeds: [embed], files: [], attachments: [] });
  }
  } catch (globalError) {
    console.error('Error in handleProfile:', globalError);
    const replyOpts = { content: '❌ An error occurred while retrieving this player profile.', flags: ['Ephemeral'] };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyOpts).catch(() => {});
    } else {
      await interaction.reply(replyOpts).catch(() => {});
    }
  }
}

export async function handleRetire(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name, level, coins, primary_role, nationality FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have an active career to retire from.',
      flags: ['Ephemeral']
    });
  }

  // Defer first to avoid 3-second gateway timeouts on slow connections
  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setTitle('⚠️ RETIREMENT DECISION')
    .setDescription(`Are you absolutely sure you want to retire **${player.name}**?\n\n**Warning:** This will permanently delete your player, stats, attributes, skill tree, equipment, achievements, and match history. This action **CANNOT** be undone.`)
    .setColor('#e74c3c')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_retire_${discordId}`).setLabel('Yes, Retire Player').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cancel_retire_${discordId}`).setLabel('No, Cancel').setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({
    embeds: [embed],
    components: [row]
  });
  const response = await interaction.fetchReply();

  const filter = i => i.user.id === discordId && (i.customId === `confirm_retire_${discordId}` || i.customId === `cancel_retire_${discordId}`);
  const collector = response.createMessageComponentCollector({ filter, time: 20000 });

  collector.on('collect', async i => {
    if (i.customId === `confirm_retire_${discordId}`) {
      // Execute deletions explicitly across all tables to wipe history completely
      db.prepare('DELETE FROM players WHERE discord_id = ?').run(discordId);
      db.prepare('DELETE FROM attributes WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM inventory WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM skills WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM stats WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM match_history WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM contracts WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM player_achievements WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM player_franchise WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM franchise_standings WHERE player_id = ?').run(discordId);
      db.prepare('DELETE FROM challenge_stats WHERE player_id = ?').run(discordId);

      // Send Audit Log to Bot Log Channel
      sendBotLog(i.client, {
        title: '👋 Career Retired',
        description: `**${player.name}** (<@${discordId}>) has officially retired from professional cricket and wiped their career data.`,
        color: '#e74c3c',
        fields: [
          { name: 'Player Name', value: player.name, inline: true },
          { name: 'Role & Nation', value: `${player.primary_role || 'Unknown'} (${player.nationality || 'Unknown'})`, inline: true },
          { name: 'Career Level', value: `Level ${player.level || 1}`, inline: true },
          { name: 'Final Coins', value: `${player.coins || 0} 🪙`, inline: true }
        ]
      });

      await i.update({
        content: `👋 **${player.name}** has officially hung up their boots and retired from all cricket. Your career save file has been wiped. You can start a new career with \`/begin\`.`,
        embeds: [],
        components: []
      }).catch(() => {});
    } else {
      await i.update({
        content: '✅ Retirement cancelled. Back to the nets!',
        embeds: [],
        components: []
      }).catch(() => {});
    }
    collector.stop();
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      await interaction.editReply({
        content: '⚠️ Retirement request timed out. Action cancelled.',
        embeds: [],
        components: []
      }).catch(() => {});
    }
  });
}
