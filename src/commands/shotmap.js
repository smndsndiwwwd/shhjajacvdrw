import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import db from '../database/db.js';
import {
  FOOTWORK_OPTIONS,
  INTENT_OPTIONS,
  ZONE_OPTIONS,
  getComboKey,
  getShotsForCombo,
  getPlayerEquippedShot,
  setPlayerEquippedShot,
  getPlayerCustomPreset,
  resetPlayerPreset,
  getShotById
} from '../game/shotmap.js';
import { isPlayerInMatch } from '../game/matchState.js';

/**
 * Handle /shotmap command and interactions
 */
export async function handleShotMap(interaction, subOption = null, state = {}) {
  const isButton = interaction.isButton();
  const isSelect = interaction.isStringSelectMenu();

  if (!isButton && !isSelect) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }
  }

  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    const msg = '❌ You do not have a career player yet! Use `/begin` to create your player.';
    if (isButton || isSelect) {
      return interaction.followUp({ content: msg, flags: ['Ephemeral'] }).catch(() => {});
    } else {
      return interaction.editReply({ content: msg }).catch(() => {});
    }
  }

  // Handle subcommands
  if (subOption === 'reset') {
    if (isPlayerInMatch(discordId)) {
      const lockEmbed = new EmbedBuilder()
        .setTitle('🔒 Shot Map Locked')
        .setColor('#ef4444')
        .setDescription('❌ You are currently in an active match! Shot combinations and presets cannot be modified during a match. You can only view.');
      
      if (isButton || isSelect) {
        if (!interaction.deferred && !interaction.replied) {
          return interaction.reply({ embeds: [lockEmbed], flags: ['Ephemeral'] }).catch(() => {});
        }
      }
      return interaction.editReply({ embeds: [lockEmbed], components: [] }).catch(() => {});
    }

    resetPlayerPreset(discordId);
    const resetEmbed = new EmbedBuilder()
      .setTitle('🔄 Shot Map Preset Reset')
      .setColor('#2ecc71')
      .setDescription('✅ Your Shot Map preset has been reset to the default balanced configuration for all 75 combinations!');
    
    if (isButton || isSelect) {
      if (!interaction.deferred && !interaction.replied) {
        return interaction.update({ embeds: [resetEmbed], components: [] }).catch(() => {});
      }
    }
    return interaction.editReply({ embeds: [resetEmbed], components: [] }).catch(() => {});
  }

  if (subOption === 'preset' || subOption === 'summary') {
    const page = interaction.options?.getInteger?.('page') || 1;
    return renderPresetSummary(interaction, player, page);
  }

  // Default: Open Shot Map Editor Hub
  const footwork = state.footwork || 'Front Foot';
  const intent = state.intent || 'Stroke';
  const zone = intent === 'Leave' ? 'In Line' : (state.zone || 'Cover');

  return renderShotMapEditor(interaction, player, footwork, intent, zone, state.notification);
}

/**
 * Render the interactive Shot Map Editor
 */
export async function renderShotMapEditor(interaction, player, footwork = 'Front Foot', intent = 'Stroke', zone = 'Cover', notification = null) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    const msg = '❌ You do not have a career player yet! Use `/begin` to create your player.';
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content: msg }).catch(() => {});
    } else {
      return interaction.reply({ content: msg, flags: ['Ephemeral'] }).catch(() => {});
    }
  }

  const isLeave = intent === 'Leave';
  const effectiveZone = isLeave ? 'In Line' : zone;
  const discordId = player.discord_id;
  const inMatch = isPlayerInMatch(discordId);
  const comboKey = getComboKey(footwork, intent, effectiveZone);
  const availableShots = getShotsForCombo(footwork, intent, effectiveZone);
  const equippedShot = getPlayerEquippedShot(discordId, footwork, intent, effectiveZone);

  const displayZone = isLeave ? 'In Line / Stumps (Direct Leave)' : effectiveZone;
  const displayIntent = isLeave ? 'Leave (Shoulder Arms / Duck / Pad-Away)' : intent;

  let descText = (inMatch
    ? `🔒 **MATCH IN PROGRESS — VIEW ONLY MODE**\n*You are currently playing an active match! Shot combinations and presets are locked during gameplay. You can view all shots and combinations, but changing equipped shots is disabled until your match ends.*\n\n`
    : '') +
    `Customize your batting style for every **Footwork**, **Intent**, and **Zone**!\n` +
    `When you execute this combination during a match, your equipped shot will be played.\n\n` +
    (notification ? `> ${notification}\n\n` : '') +
    `🎯 **Selected Combination:**\n` +
    `• **Footwork:** \`${footwork}\`\n` +
    `• **Intent:** \`${displayIntent}\`\n` +
    `• **Target Zone:** \`${displayZone}\`\n\n` +
    `🌟 **Currently Equipped ${isLeave ? 'Technique' : 'Shot'} in Preset:**\n` +
    `👉 **${equippedShot.num} ${equippedShot.name}**\n` +
    `*Style:* \`${equippedShot.style}\` | *Risk:* \`${equippedShot.risk}\`\n` +
    `💬 *"${equippedShot.desc}"*`;

  const embed = new EmbedBuilder()
    .setTitle(inMatch ? '📖 Batting Shot Map (🔒 View Only - Match Active)' : '📖 Batting Shot Map & Preset Editor')
    .setColor(inMatch ? '#f59e0b' : '#3498db')
    .setDescription(descText);

  // Available Shots Field
  let shotListText = '';
  availableShots.forEach((shot) => {
    const isEq = shot.id === equippedShot.id;
    shotListText += `${isEq ? '🟢 **[EQUIPPED]** ' : '⚪ '}` +
                    `**${shot.num} ${shot.name}** (${shot.style} • Risk: ${shot.risk})\n` +
                    `> *${shot.desc}*\n\n`;
  });

  if (shotListText.length > 1000) {
    shotListText = shotListText.slice(0, 995) + '...';
  }

  embed.addFields({
    name: isLeave
      ? `🧘 Available Leave Techniques for [${footwork} + Leave]`
      : `📚 Available Shots for [${footwork} + ${intent} + ${effectiveZone}]`,
    value: shotListText || 'None available'
  });

  embed.setFooter({
    text: isLeave
      ? `Cricket Ascend Shot Map 🏏 • Zone selection bypassed for Leave • Equip your leave technique below!`
      : `Cricket Ascend Shot Map 🏏 • Choose combination above, then equip any shot below!`
  });

  // Row 1: Footwork Selection Buttons
  const footworkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sm_foot_Front Foot_${intent}_${effectiveZone}_${discordId}`)
      .setLabel('Front Foot')
      .setStyle(footwork === 'Front Foot' ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('👟'),
    new ButtonBuilder()
      .setCustomId(`sm_foot_Back Foot_${intent}_${effectiveZone}_${discordId}`)
      .setLabel('Back Foot')
      .setStyle(footwork === 'Back Foot' ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('👟'),
    new ButtonBuilder()
      .setCustomId(`sm_foot_Advanced_${intent}_${effectiveZone}_${discordId}`)
      .setLabel('Advanced (Step Out)')
      .setStyle(footwork === 'Advanced' ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🏃')
  );

  // Row 2: Intent Selection Buttons (Push, Stroke, Loft, Leave)
  const defaultZoneForShots = effectiveZone === 'In Line' ? 'Cover' : effectiveZone;
  const intentRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sm_intent_${footwork}_Push_${defaultZoneForShots}_${discordId}`)
      .setLabel('Push')
      .setStyle(intent === 'Push' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji('🛡️'),
    new ButtonBuilder()
      .setCustomId(`sm_intent_${footwork}_Stroke_${defaultZoneForShots}_${discordId}`)
      .setLabel('Stroke')
      .setStyle(intent === 'Stroke' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji('🏏'),
    new ButtonBuilder()
      .setCustomId(`sm_intent_${footwork}_Loft_${defaultZoneForShots}_${discordId}`)
      .setLabel('Loft')
      .setStyle(intent === 'Loft' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setCustomId(`sm_intent_${footwork}_Leave_In Line_${discordId}`)
      .setLabel('Leave')
      .setStyle(intent === 'Leave' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji('🧘')
  );

  // Components array to send
  const components = [footworkRow, intentRow];

  // Row 3: Zone Selection Dropdown (Only shown when NOT leaving)
  if (!isLeave) {
    const zoneSelect = new StringSelectMenuBuilder()
      .setCustomId(`sm_zone_${footwork}_${intent}_${discordId}`)
      .setPlaceholder(`Target Zone: ${effectiveZone}`);

    ZONE_OPTIONS.forEach(z => {
      zoneSelect.addOptions({
        label: z,
        description: `Browse shots played towards ${z}`,
        value: z,
        default: z === effectiveZone,
        emoji: '🎯'
      });
    });
    const zoneRow = new ActionRowBuilder().addComponents(zoneSelect);
    components.push(zoneRow);
  }

  // Row 4 (or Row 3 for Leave): Equip Shot Dropdown
  const equipPlaceholder = inMatch
    ? '🔒 Match Active: Changing equipped shots is locked (View Only)'
    : (isLeave ? `Equip Leave Style for [${footwork} Leave]...` : `Equip Shot for [${footwork} + ${intent} + ${effectiveZone}]...`);

  const equipSelect = new StringSelectMenuBuilder()
    .setCustomId(`sm_equip_${footwork}_${intent}_${effectiveZone}_${discordId}`)
    .setPlaceholder(equipPlaceholder)
    .setDisabled(inMatch);

  availableShots.forEach(shot => {
    equipSelect.addOptions({
      label: `${shot.num} ${shot.name}`,
      description: `${shot.style} Style • Risk: ${shot.risk}`,
      value: shot.id,
      default: shot.id === equippedShot.id,
      emoji: shot.id === equippedShot.id ? '✅' : (isLeave ? '🧘' : '🏏')
    });
  });
  const equipRow = new ActionRowBuilder().addComponents(equipSelect);
  components.push(equipRow);

  // Utility Buttons
  const utilityRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sm_summary_${discordId}`)
      .setLabel('📋 Preset Overview')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`sm_reset_${discordId}`)
      .setLabel(inMatch ? '🔒 Reset (Locked)' : '🔄 Reset to Defaults')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(inMatch)
  );
  components.push(utilityRow);

  const payload = { embeds: [embed], components };

  // Always edit in-place without creating new messages
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload).catch(err => console.error('Error in renderShotMapEditor update:', err));
    } else {
      return await interaction.editReply(payload).catch(err => console.error('Error in renderShotMapEditor editReply:', err));
    }
  } else {
    return await interaction.editReply(payload).catch(err => console.error('Error in renderShotMapEditor editReply:', err));
  }
}

/**
 * Handle Preset Summary view with pagination across all combinations
 */
export async function renderPresetSummary(interaction, player, page = 1) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    const msg = '❌ You do not have a career player yet! Use `/begin` to create your player.';
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content: msg }).catch(() => {});
    } else {
      return interaction.reply({ content: msg, flags: ['Ephemeral'] }).catch(() => {});
    }
  }

  const discordId = player.discord_id;
  const customPresets = getPlayerCustomPreset(discordId);
  const customCount = Object.keys(customPresets).length;

  const validPage = Math.min(3, Math.max(1, parseInt(page, 10) || 1));
  const targetFootwork = FOOTWORK_OPTIONS[validPage - 1]; // 'Front Foot', 'Back Foot', 'Advanced'

  const pageColors = {
    1: '#3498db', // Front Foot (Blue)
    2: '#e67e22', // Back Foot (Orange)
    3: '#9b59b6'  // Advanced (Purple)
  };

  const intentIcons = {
    'Push': '🛡️ Push Intent (Defense / Soft Hands)',
    'Stroke': '🏏 Stroke Intent (Ground Boundary Drives & Cuts)',
    'Loft': '🚀 Loft Intent (Aerial Sixes & Power-Hitting)'
  };

  const intentFields = INTENT_OPTIONS.filter(i => i !== 'Leave').map(intent => {
    const lines = ZONE_OPTIONS.map(zone => {
      const comboKey = getComboKey(targetFootwork, intent, zone);
      const shot = getPlayerEquippedShot(discordId, targetFootwork, intent, zone);
      const isCustom = Boolean(customPresets[comboKey]);
      const marker = isCustom ? '⭐' : '⚪';
      return `${marker} **${zone}:** \`${shot.num} ${shot.name}\` *(${shot.style} • Risk: ${shot.risk})*`;
    });

    return {
      name: intentIcons[intent] || intent,
      value: lines.join('\n'),
      inline: false
    };
  });

  // Add Leave Intent field
  const leaveKey = getComboKey(targetFootwork, 'Leave', 'In Line');
  const leaveShot = getPlayerEquippedShot(discordId, targetFootwork, 'Leave', 'In Line');
  const isCustomLeave = Boolean(customPresets[leaveKey]);
  intentFields.push({
    name: '🧘 Leave Intent (Shoulder Arms / Duck / Pad-Away)',
    value: `${isCustomLeave ? '⭐' : '⚪'} **Equipped Technique:** \`${leaveShot.num} ${leaveShot.name}\` *(${leaveShot.style} Style • Risk: ${leaveShot.risk})*\n> *"${leaveShot.desc}"*`,
    inline: false
  });

  const embed = new EmbedBuilder()
    .setTitle(`📋 Shot Map Preset: ${player.name} (Page ${validPage}/3: ${targetFootwork})`)
    .setColor(pageColors[validPage])
    .setDescription(
      `Commitment: **${targetFootwork}** | Active Custom Overrides: **${customCount} / 75**\n` +
      `Here are all **24 scoring shots + 1 leave technique** for this footwork.\n` +
      `⭐ = *Custom Override* | ⚪ = *Default Shot*\n` +
      `Use the buttons below to browse all pages (Front Foot, Back Foot, Advanced).`
    )
    .addFields(intentFields)
    .setFooter({
      text: `Page ${validPage} of 3 • 75 Total Combinations • Cricket Ascend Batting Shot Map 🏏`
    });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sm_preset_prev_${validPage}_${discordId}`)
      .setLabel('◀️ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(validPage === 1),
    new ButtonBuilder()
      .setCustomId(`sm_preset_page_1_${discordId}`)
      .setLabel('1. Front Foot (25)')
      .setStyle(validPage === 1 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`sm_preset_page_2_${discordId}`)
      .setLabel('2. Back Foot (25)')
      .setStyle(validPage === 2 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`sm_preset_page_3_${discordId}`)
      .setLabel('3. Advanced (25)')
      .setStyle(validPage === 3 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`sm_preset_next_${validPage}_${discordId}`)
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(validPage === 3)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sm_back_${discordId}`)
      .setLabel('⬅️ Back to Shot Map Editor')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`sm_reset_${discordId}`)
      .setLabel('🔄 Reset to Defaults')
      .setStyle(ButtonStyle.Danger)
  );

  const payload = { embeds: [embed], components: [row1, row2] };

  // Always edit in-place without creating new messages
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload).catch(err => console.error('Error in renderPresetSummary update:', err));
    } else {
      return await interaction.editReply(payload).catch(err => console.error('Error in renderPresetSummary editReply:', err));
    }
  } else {
    return await interaction.editReply(payload).catch(err => console.error('Error in renderPresetSummary editReply:', err));
  }
}
