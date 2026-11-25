import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import db from '../database/db.js';
import { chapters, getPlayerChapters } from '../game/chapters.js';
import { deliveries, shots, simulateBall, simulateBallAdvanced, getReleaseHint, getDerivedShotName, generateBowlerDelivery, pickBowlerTypeForOver } from '../game/engine.js';
import { getPlayerEquippedShot } from '../game/shotmap.js';
import { addXP, updateAndGetEnergy, consumeEnergy, getEffectiveAttributes, getEquipmentBonuses } from '../game/utils.js';
import { getRandomEvent, getPlayerEvent } from '../game/events.js';
import { emojis } from '../game/emojis.js';
import { academies } from '../game/academies.js';
import { generateFieldImage } from './challenge.js';
import { getPlayerSettings } from '../game/settings.js';

// Load canvas library safely
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back.');
}





function getBatterButtonLayout(selectedZone, selectedIntent, selectedShot, discordId) {
  // Row 1: Zones 1-4
  const row1 = new ActionRowBuilder();
  for (let i = 1; i <= 4; i++) {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`bat_btn_zone_Zone ${i}_${discordId}`)
        .setLabel(`Zone ${i}`)
        .setStyle(selectedZone === `Zone ${i}` ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }

  // Row 2: Zones 5-8
  const row2 = new ActionRowBuilder();
  for (let i = 5; i <= 8; i++) {
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`bat_btn_zone_Zone ${i}_${discordId}`)
        .setLabel(`Zone ${i}`)
        .setStyle(selectedZone === `Zone ${i}` ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }

  // Row 3: Intent
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bat_btn_intent_Defensive_${discordId}`)
      .setLabel('🛡️ Defensive')
      .setStyle(selectedIntent === 'Defensive' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bat_btn_intent_Balanced_${discordId}`)
      .setLabel('⚖️ Balanced')
      .setStyle(selectedIntent === 'Balanced' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bat_btn_intent_Aggressive_${discordId}`)
      .setLabel('🚀 Aggressive')
      .setStyle(selectedIntent === 'Aggressive' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 4: Shot
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bat_btn_shot_defensive_${discordId}`)
      .setLabel('🛡️ Block')
      .setStyle(selectedShot === 'defensive' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bat_btn_shot_straight_drive_${discordId}`)
      .setLabel('🏏 Drive')
      .setStyle(selectedShot === 'straight_drive' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bat_btn_shot_pull_${discordId}`)
      .setLabel('🚀 Pull')
      .setStyle(selectedShot === 'pull' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bat_btn_shot_sweep_${discordId}`)
      .setLabel('🔄 Sweep')
      .setStyle(selectedShot === 'sweep' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bat_btn_shot_lofted_drive_${discordId}`)
      .setLabel('💥 Loft')
      .setStyle(selectedShot === 'lofted_drive' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 5: Ready
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bat_btn_ready_${discordId}`)
      .setLabel('READY TO BAT 🏏')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!selectedZone || !selectedIntent || !selectedShot)
  );

  return [row1, row2, row3, row4, row5];
}

export function getBowlerStepLayout(step, selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, isSpin, discordId) {
  const line = selectedLine || null;
  const len = selectedLength || null;
  const variation = selectedVar || null;
  const spd = selectedSpeed || (isSpin ? 'Slow' : 'Fast');
  const fld = selectedField || 'Balanced';

  if (step === 'line') {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bowl_step_line_Stumps_${discordId}`)
        .setLabel('Stumps 🎯')
        .setStyle(line === 'Stumps' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_line_Off Side_${discordId}`)
        .setLabel('Off Side ➡️')
        .setStyle(line === 'Off Side' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_line_Leg Side_${discordId}`)
        .setLabel('Leg Side ⬅️')
        .setStyle(line === 'Leg Side' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_line_Wide_${discordId}`)
        .setLabel('Wide Outside Off 🚫')
        .setStyle(line === 'Wide' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
    return [row1];
  }

  if (step === 'length') {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bowl_step_len_Yorker_${discordId}`)
        .setLabel('Yorker 🎯')
        .setStyle(len === 'Yorker' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_len_Full_${discordId}`)
        .setLabel('Full Length 🏏')
        .setStyle(len === 'Full' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_len_Good Length_${discordId}`)
        .setLabel('Good Length ⚖️')
        .setStyle(len === 'Good Length' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_len_Short_${discordId}`)
        .setLabel('Short Pitch 🚀')
        .setStyle(len === 'Short' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bowl_step_back_line_${discordId}`)
        .setLabel('⬅️ Back to Line')
        .setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
  }

  if (step === 'variation') {
    const varLabel1 = isSpin ? 'Stock Turn ⚖️' : 'Stock Seam ⚖️';
    const varLabel2 = isSpin ? 'Drift / Arm Ball 🌀' : 'Swing Ball 🌀';
    const varLabel3 = isSpin ? 'Doosra / Googly 🔄' : 'Cutter 🔄';
    const varLabel4 = isSpin ? 'Flighted Loop 🐢' : 'Slower Ball 🐢';

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bowl_step_var_Normal Delivery_${discordId}`)
        .setLabel(varLabel1)
        .setStyle(variation === 'Normal Delivery' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_var_Swing/Spin_${discordId}`)
        .setLabel(varLabel2)
        .setStyle(variation === 'Swing/Spin' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_var_Cutter/Googly_${discordId}`)
        .setLabel(varLabel3)
        .setStyle(variation === 'Cutter/Googly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bowl_step_var_Slower Ball_${discordId}`)
        .setLabel(varLabel4)
        .setStyle(variation === 'Slower Ball' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bowl_step_back_len_${discordId}`)
        .setLabel('⬅️ Back to Length')
        .setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
  }

  // step === 'field'
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_step_fld_Balanced_${discordId}`)
      .setLabel('Balanced Field 👥')
      .setStyle(fld === 'Balanced' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_step_fld_Attacking_${discordId}`)
      .setLabel('Attacking Field ⚔️')
      .setStyle(fld === 'Attacking' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_step_fld_Defensive_${discordId}`)
      .setLabel('Defensive Field 🛡️')
      .setStyle(fld === 'Defensive' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_step_spd_Fast_${discordId}`)
      .setLabel(isSpin ? 'Quick / Flatter ⚡' : 'Fast Pace ⚡')
      .setStyle(spd === 'Fast' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_step_spd_Medium_${discordId}`)
      .setLabel(isSpin ? 'Standard Spin ⚖️' : 'Medium Pace ⚖️')
      .setStyle(spd === 'Medium' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_step_spd_Slow_${discordId}`)
      .setLabel(isSpin ? 'Slow / Tossed 🐢' : 'Slower Pace 🐢')
      .setStyle(spd === 'Slow' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_step_confirm_${discordId}`)
      .setLabel('🥎 DELIVER BALL ⚡')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`bowl_step_back_var_${discordId}`)
      .setLabel('⬅️ Back to Variation')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

function getBowlerButtonLayout(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, discordId) {
  return getBowlerStepLayout('field', selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, false, discordId);
}

// Get tier name based on level
function getPlayerTier(level) {
  if (level >= 19) return { name: '🟢 International National Team', stipend: 500 };
  if (level >= 13) return { name: '🟡 Domestic T20 Franchise', stipend: 250 };
  if (level >= 10) return { name: '🟠 State League Division', stipend: 100 };
  if (level >= 7) return { name: '🔴 District Cricket Division', stipend: 70 };
  if (level >= 4) return { name: '🔵 Local Club Cricket', stipend: 45 };
  return { name: '⚪ Academy Cricket', stipend: 20 };
}

// Helper to choose a random AI shot for bowling simulation
function getAIShot() {
  const shotKeys = Object.keys(shots);
  return shotKeys[Math.floor(Math.random() * shotKeys.length)];
}

// Helper to select a random delivery for AI bowling
function getAIDelivery(style) {
  const allDelivs = Object.entries(deliveries);
  const isSpinStyle = style.toLowerCase().includes('spin');
  const filtered = allDelivs.filter(([key, val]) => isSpinStyle ? val.type === 'spin' : val.type === 'fast');
  return filtered[Math.floor(Math.random() * filtered.length)][0];
}

export async function handleChapters(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  const isButton = interaction.isButton();
  if (isButton) {
    await interaction.deferUpdate();
  } else {
    await interaction.deferReply();
  }

  const playerChapters = getPlayerChapters(player, db);
  const nextCh = player.current_chapter;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_play_chapter_${discordId}`)
      .setLabel(nextCh > 50 ? 'All Chapters Completed!' : `Play Chapter ${nextCh}`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(nextCh > 50),
    new ButtonBuilder()
      .setCustomId(`btn_profile_${discordId}`)
      .setLabel('⬅️ Back to Profile')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_skills_${discordId}`)
      .setLabel('Skill Tree')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`btn_franchise_${discordId}`)
      .setLabel('🏆 Franchise')
      .setStyle(ButtonStyle.Primary)
  );

  let response = null;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(900, 1450);
      const ctx = canvas.getContext('2d');

      // Helper to draw rounded rectangles
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

      // Background solid fill (highly optimized)
      ctx.fillStyle = '#0a0512';
      ctx.fillRect(0, 0, 900, 1450);

      // Grid lines (batched paths to save CPU draw calls)
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 900; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1450);
      }
      for (let i = 0; i < 1450; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(900, i);
      }
      ctx.stroke();

      // Border
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 880, 1430);

      // Header Banner
      drawRoundRect(ctx, 26, 20, 848, 75, 12, 'rgba(17, 24, 39, 0.85)', '#9b59b6', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏏 CAREER CAMPAIGN CHAPTERS', 450, 50);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 13px sans-serif';
      const statusBannerText = nextCh > 50
        ? 'ALL CHAPTERS COMPLETED! 🎉'
        : `ACTIVE CHAPTER: CH ${nextCh} • ${(playerChapters.find(ch => ch.id === nextCh)?.name || '').toUpperCase()}`;
      ctx.fillText(statusBannerText, 450, 72);

      // Draw Grid of Chapters
      const cellWidth = 160;
      const cellHeight = 120;
      const gapX = 12;
      const gapY = 12;
      const startX = 26;
      const startY = 110;

      playerChapters.forEach((ch, index) => {
        const col = index % 5;
        const row = Math.floor(index / 5);

        const x = startX + col * (cellWidth + gapX);
        const y = startY + row * (cellHeight + gapY);

        const isCompleted = ch.id < nextCh;
        const isActive = ch.id === nextCh;
        const isLocked = ch.id > nextCh;

        // Container styles
        let bgStyle = 'rgba(71, 85, 105, 0.1)';
        let strokeColor = '#475569';
        let strokeW = 1;
        let textStatusColor = '#64748b';
        let statusSymbol = '🔒';

        if (isCompleted) {
          bgStyle = 'rgba(46, 204, 113, 0.08)';
          strokeColor = '#2ecc71';
          strokeW = 1.5;
          textStatusColor = '#2ecc71';
          statusSymbol = '✅';
        } else if (isActive) {
          bgStyle = 'rgba(241, 196, 15, 0.12)';
          strokeColor = '#f1c40f';
          strokeW = 2.5;
          textStatusColor = '#f1c40f';
          statusSymbol = '⚡';
        }

        drawRoundRect(ctx, x, y, cellWidth, cellHeight, 10, bgStyle, strokeColor, strokeW);

        // Header inside cell
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = textStatusColor;
        ctx.fillText(`Ch ${ch.id}`, x + 10, y + 20);

        ctx.textAlign = 'right';
        ctx.fillText(statusSymbol, x + cellWidth - 10, y + 20);

        // Draw line separator
        ctx.strokeStyle = strokeColor + '33'; // Add hex transparency
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 28);
        ctx.lineTo(x + cellWidth - 10, y + 28);
        ctx.stroke();

        // Draw Chapter Name
        ctx.textAlign = 'left';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = isLocked ? '#475569' : '#ffffff';

        // Word wrap for name to fit cellWidth - 20
        const wrapWords = (text, maxWidth) => {
          const words = text.split(' ');
          let lines = [];
          let currentLine = words[0] || '';
          for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
              currentLine += ' ' + word;
            } else {
              lines.push(currentLine);
              currentLine = word;
            }
          }
          lines.push(currentLine);
          return lines;
        };

        const wrappedName = wrapWords(ch.name, cellWidth - 20);
        let nameY = y + 43;
        wrappedName.slice(0, 2).forEach((line, idx) => {
          ctx.fillText(line, x + 10, nameY + idx * 13);
        });

        // Objective details
        ctx.font = '9px sans-serif';
        ctx.fillStyle = isLocked ? '#475569' : '#f39c12';
        ctx.fillText(`🎯 Target: ${ch.objective.target} R (${ch.objective.balls}b)`, x + 10, y + 82);

        // Difficulty pill/text
        let diffColor = '#64748b';
        if (!isLocked) {
          const diff = ch.difficulty.toLowerCase();
          if (diff.includes('very easy') || diff.includes('easy')) diffColor = '#2ecc71';
          else if (diff.includes('medium')) diffColor = '#3498db';
          else if (diff.includes('hard')) diffColor = '#e74c3c';
          else diffColor = '#9b59b6'; // Legendary/Expert
        }
        ctx.fillStyle = diffColor;
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`${ch.difficulty}`, x + 10, y + 100);

        // Reward coins
        ctx.textAlign = 'right';
        ctx.fillStyle = isLocked ? '#475569' : '#f1c40f';
        ctx.fillText(`🪙 ${ch.rewards.coins}`, x + cellWidth - 10, y + 100);
      });

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `chapters_${discordId}.png` });

      response = await interaction.editReply({
        content: `🏏 **Campaign Chapters Progress:**`,
        embeds: [],
        files: [attachment],
        attachments: [],
        components: [row]
      });
    } catch (err) {
      console.error('Error drawing chapters canvas:', err);
    }
  }

  if (!response) {
    const embed = new EmbedBuilder()
      .setTitle(`🏏 Career Chapters Directory`)
      .setDescription(`Select and play unlocked chapters. Your active chapter is highlighted in yellow.`)
      .setColor('#9b59b6')
      .setTimestamp();

    let chList = '';
    playerChapters.forEach(ch => {
      let statusIcon = '🔒';
      if (ch.id < nextCh) {
        statusIcon = '✅';
      } else if (ch.id === nextCh) {
        statusIcon = '⚡';
      }

      let reqText = '';
      if (ch.id >= 6 && ch.id <= 12) reqText = ' (Req LVL 3)';
      else if (ch.id >= 13 && ch.id <= 18) reqText = ' (Req LVL 7, 100 Rep)';
      else if (ch.id >= 19 && ch.id <= 28) reqText = ' (Req LVL 12, 400 Rep)';
      else if (ch.id >= 29 && ch.id <= 38) reqText = ' (Req LVL 18, 800 Rep)';
      else if (ch.id >= 39 && ch.id <= 50) reqText = ' (Req LVL 28, 1800 Rep)';

      chList += `${statusIcon} **Ch ${ch.id}: ${ch.name}**${ch.id > nextCh ? reqText : ''}\n   └ *Objective:* Score ${ch.objective.target} in ${ch.objective.balls} balls (${ch.difficulty})\n`;
    });

    embed.setDescription(`Your progress: Chapter **${player.current_chapter} / 50**\n\n${chList}`);

    await interaction.editReply({
      content: '',
      embeds: [embed],
      files: [],
      attachments: [],
      components: [row]
    });
  }
}

export async function handlePlay(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => {});
  }

  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  const safeReply = async (payload) => {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload).catch(async () => {
        return await interaction.channel?.send(payload).catch(() => {});
      });
    } else {
      return await interaction.reply(payload).catch(async () => {
        return await interaction.channel?.send(payload).catch(() => {});
      });
    }
  };

  if (!player) {
    return await safeReply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.'
    });
  }

  // Energy Check
  const currentEnergy = updateAndGetEnergy(db, discordId);
  const matchEnergyCost = 15;
  if (currentEnergy < matchEnergyCost) {
    return await safeReply({
      content: `❌ You are too tired to play a match! Current Energy: **${currentEnergy}/100 ${emojis.energy}** (Requires 15 ${emojis.energy}).`
    });
  }

  // Get match type: chapter or practice
  const playType = interaction.options ? interaction.options.getString('type') : 'chapter';

  let matchConfig = {};
  let chapterMode = false;

  if (playType === 'chapter') {
    const currentChapterNum = player.current_chapter;
    if (currentChapterNum > 50) {
      return await safeReply({
        content: '🎉 You have completed all 50 Career Chapters! Play casual matches by selecting **Practice Nets Match** in `/play`.'
      });
    }

    const playerChapters = getPlayerChapters(player, db);
    const chapter = playerChapters.find(ch => ch.id === currentChapterNum);

    // Enforce Level and Reputation requirements to progress to international / high levels
    let reqLevel = 1;
    let reqRep = 0;
    let tierName = 'Academy';

    if (currentChapterNum >= 6 && currentChapterNum <= 12) {
      reqLevel = 3;
      tierName = 'Local Club';
    } else if (currentChapterNum >= 13 && currentChapterNum <= 18) {
      reqLevel = 7;
      reqRep = 100;
      tierName = 'District League';
    } else if (currentChapterNum >= 19 && currentChapterNum <= 28) {
      reqLevel = 12;
      reqRep = 400;
      tierName = 'State First-Class';
    } else if (currentChapterNum >= 29 && currentChapterNum <= 38) {
      reqLevel = 18;
      reqRep = 800;
      tierName = 'T20 Franchise';
    } else if (currentChapterNum >= 39 && currentChapterNum <= 50) {
      reqLevel = 28;
      reqRep = 1800;
      tierName = 'International Level';
    }

    if (player.level < reqLevel || player.reputation < reqRep) {
      return await safeReply({
        content: `❌ **Selection Denied!** You do not meet the criteria to play the **${tierName}** campaign chapter (Ch ${currentChapterNum}: ${chapter.name}).\n\n` +
                 `🎯 **Selection Requirements:**\n` +
                 `• Player Level: **LVL ${reqLevel}** (Your level: LVL ${player.level})\n` +
                 `• Reputation: **${reqRep} ${emojis.reputation || '🎖️'}** (Your reputation: ${player.reputation})\n\n` +
                 `💡 *Tip: Train in \`/train\` and compete in practice matches (\`/play type:practice\`) to build your skills, level, and reputation!*`
      });
    }

    chapterMode = true;
    matchConfig = {
      opponent: chapter.opponent,
      difficulty: chapter.difficulty,
      bowlerSkill: chapter.bowlerSkill,
      targetRuns: chapter.objective.target,
      ballsLimit: chapter.objective.balls,
      pitch: chapter.pitchCondition,
      rewardXP: chapter.rewards.xp,
      rewardCoins: chapter.rewards.coins,
      chapterUnlockItem: chapter.rewards.itemUnlock || null,
      chapterUnlockMsg: chapter.rewards.message || ''
    };
  } else {
    // Practice Match
    const level = player.level;
    const practicePitches = [
      'Balanced Sporting Pitch',
      'Green Seamer (Pace & Swing)',
      'Dry Turning Track (Spin Heaven)',
      'Flat Belter (Batting Paradise)',
      'Bouncy Clay Deck (Steep Bounce)',
      'Damp Slow Track (Sticky Pitch)'
    ];
    const pitch = practicePitches[Math.floor(Math.random() * practicePitches.length)];

    matchConfig = {
      opponent: `Practice Bowler (LVL ${level})`,
      difficulty: 'Medium',
      bowlerSkill: Math.min(100, level * 4 + 10),
      targetRuns: level * 3 + 12,
      ballsLimit: 12,
      pitch,
      rewardXP: level * 20 + 50,
      rewardCoins: Math.min(60, 15 + level * 2)
    };
  }

  // Consume energy
  consumeEnergy(db, discordId, matchEnergyCost);

  // Directly start the career match phase corresponding to the player's role
  if (player.primary_role === 'All-Rounder') {
    runAllRounderMatch(interaction, player, matchConfig, chapterMode);
  } else if (player.primary_role.toLowerCase().includes('bowl')) {
    runBowlingMatch(interaction, player, matchConfig, chapterMode);
  } else {
    runBattingMatch(interaction, player, matchConfig, chapterMode);
  }
}

// 🏏 BATTING GAME LOOP
async function runBattingMatch(interaction, player, match, chapterMode) {
  const discordId = player.discord_id;
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

  let runsScored = 0;
  let ballsFaced = 0;
  let wickets = 0;
  let foursCount = 0;
  let sixesCount = 0;
  let freeHit = false;
  let lastCommentary = '🏏 The bowler stands at the top of their run-up...';
  
  const userSettings = getPlayerSettings(discordId);
  let useDM = userSettings ? (userSettings.dm_match ?? 1) === 1 : true;
  let message;

  let selectedStance = null;
  let selectedFootwork = null;
  let selectedIntent = null;
  let selectedZone = null;
  let currentStep = 'stance';

  // Lock bowler type per 6-ball over so a bowler never switches between pace and spin mid-over
  const overBowlerTypes = {};
  const getOverCraft = (ballCount) => {
    const ov = Math.floor((ballCount || 0) / 6);
    if (!overBowlerTypes[ov]) overBowlerTypes[ov] = pickBowlerTypeForOver(match.pitch, ov);
    return overBowlerTypes[ov];
  };

  // Pre-generate the first delivery
  const initialDelivery = generateBowlerDelivery(match.pitch, getOverCraft(0));
  let nextLine = initialDelivery.line;
  let nextLength = initialDelivery.length;
  let nextVariation = initialDelivery.variation;
  let nextSpeed = initialDelivery.speed;
  let nextFieldPreset = initialDelivery.fieldPreset;

  const getRenderState = async (stance, footwork, intent, zone, step, hint, fullDeliveryReveal, includeImage = true) => {
    const batTarget = match.targetRuns;
    const batBalls = match.ballsLimit;
    const ballsRemaining = Math.max(0, batBalls - ballsFaced);
    const need = Math.max(0, batTarget - runsScored);

    const totalBars = 10;
    const progressPercent = Math.min(100, Math.max(0, (runsScored / batTarget) * 100));
    const filled = Math.round((progressPercent / 100) * totalBars);
    const progressBar = '▰'.repeat(filled) + '▱'.repeat(totalBars - filled);

    const embed = new EmbedBuilder()
      .setTitle(`🏏 Batting Inning: vs ${match.opponent}`)
      .setDescription(`*Difficulty:* \`${match.difficulty}\` | *Pitch:* \`${match.pitch}\`\n\n▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
      .setColor('#3498db')
      .addFields(
        { name: '🎯 Objective Target', value: `Score **${batTarget} Runs** in **${batBalls} balls**`, inline: true },
        { name: '📊 Inning Status', value: `Runs: **${runsScored}** / **${wickets}**\nBalls: **${ballsFaced}** / **${batBalls}**\nNeed **${need} runs** (in ${ballsRemaining} balls)`, inline: true },
        { name: '📈 Target Progress', value: `${progressBar} (${Math.round(progressPercent)}%)`, inline: false },
        { name: '🔥 Batter Vitals', value: `Confidence: **${player.confidence}** | Form: **${player.form}** | Power: **${playerAttrs.power}**`, inline: true }
      );

    if (freeHit) {
      embed.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'You cannot be dismissed on this delivery!' });
    }

    const isLeave = (footwork === 'Leave' || intent === 'Leave');
    embed.addFields(
      { name: '🧍 1. Stance', value: stance ? `**${stance}**` : (step === 'stance' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '👣 2. Footwork', value: footwork ? (footwork === 'Leave' ? '🛡️ **Leave**' : `**${footwork}**`) : (step === 'footwork' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '🎯 3. Intent', value: isLeave ? '🛡️ **Leave**' : (intent ? `**${intent}**` : (step === 'intent' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true },
      { name: '📐 4. Zone', value: isLeave ? '— *(Left Alone)*' : (zone ? `**${zone}**` : (step === 'zone' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true }
    );

    let rows = [];
    const equippedShot = (footwork && footwork !== 'Leave' && intent && intent !== 'Leave' && zone)
      ? getPlayerEquippedShot(discordId, footwork, intent, zone)
      : null;

    if (step === 'stance') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        (hint ? `${hint}\n\n` : '') +
        `👉 **Step 1:** Select your **Stance** at the crease.`
      );
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_stance_Off Side_${discordId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_In Line_${discordId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_Leg Side_${discordId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
      );
      rows = [row1];
    } else if (step === 'footwork') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        (hint ? `${hint}\n\n` : '') +
        `👉 **Step 2:** Select your **Footwork** commitment for this delivery.`
      );
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_footwork_Front Foot_${discordId}`).setLabel('Front Foot').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_footwork_Back Foot_${discordId}`).setLabel('Back Foot').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_footwork_Advanced_${discordId}`).setLabel('Advanced').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_footwork_Leave_${discordId}`).setLabel('Leave').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_back_stance_${discordId}`).setLabel('⬅️ Back to Stance').setStyle(ButtonStyle.Secondary)
      );
      rows = [row1, row2];
    } else if (step === 'leave_confirm') {
      const leaveFw = (footwork && footwork !== 'Leave') ? footwork : 'Front Foot';
      const leaveShot = getPlayerEquippedShot(discordId, leaveFw, 'Leave', 'In Line');
      const leaveType = (footwork && footwork !== 'Leave') ? `${footwork} Leave` : 'Leave';
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
        `👉 You have committed to a **${leaveType}**.\n` +
        (leaveShot ? `🧘 **Equipped Technique:** \`${leaveShot.num} ${leaveShot.name}\` (${leaveShot.style})\n💬 *"${leaveShot.desc}"*\n\n` : '') +
        `Click **CONFIRM LEAVE** to watch the ball pass through.`
      );
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('🛡️ CONFIRM LEAVE 🏏').setStyle(ButtonStyle.Success)
      );
      rows = [row1];
    } else if (step === 'intent') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        (hint ? `${hint}\n\n` : '') +
        `👉 **Step 3:** Select your batting **Intent** for this ball.\n\n` +
        `• **Push**: Soft hands defense / strike rotation (safest, 0 or 1 run)\n` +
        `• **Stroke**: Classic ground boundary stroke along the carpet (1 to 4 runs)\n` +
        `• **Loft**: Aerial power-hitting over the fielders (high risk / reward, 4s & 6s)\n` +
        `• **Leave**: Shoulder arms and let the ball pass through without offering a shot`
      );
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_intent_Push_${discordId}`).setLabel('Push').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_intent_Stroke_${discordId}`).setLabel('Stroke').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_intent_Loft_${discordId}`).setLabel('Loft').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_intent_Leave_${discordId}`).setLabel('🛡️ Leave').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_back_footwork_${discordId}`).setLabel('⬅️ Back to Footwork').setStyle(ButtonStyle.Secondary)
      );
      rows = [row1, row2];
    } else if (step === 'zone') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
        `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
        (equippedShot 
          ? `🏏 **Equipped Preset Shot:** \`${equippedShot.num} ${equippedShot.name}\` (${equippedShot.style} • Risk: ${equippedShot.risk})\n💬 *"${equippedShot.desc}"*`
          : (zone ? `🏏 **Projected Shot:** \`${getDerivedShotName(footwork, intent, zone)}\`` : `💡 *Click any field zone to preview your preset shot and aim.*`))
      );
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Third Man_${discordId}`).setLabel('Third Man').setStyle(zone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Point_${discordId}`).setLabel('Point').setStyle(zone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Cover_${discordId}`).setLabel('Cover').setStyle(zone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Long Off_${discordId}`).setLabel('Long Off').setStyle(zone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Long On_${discordId}`).setLabel('Long On').setStyle(zone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Mid Wicket_${discordId}`).setLabel('Mid Wicket').setStyle(zone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Square Leg_${discordId}`).setLabel('Square Leg').setStyle(zone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Fine Leg_${discordId}`).setLabel('Fine Leg').setStyle(zone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!zone)
      );
      rows = [row1, row2, row3];
    }

    const payload = { embeds: [embed], components: rows };
    if (includeImage && userSettings?.field_radar !== 0) {
      const isPowerplay = (ballsFaced < 6 && match.ballsLimit > 6);
      const fieldPreset = nextFieldPreset || 'Balanced';
      const buffer = await generateFieldImage(fieldPreset, zone, isPowerplay, player.batting_hand);
      if (buffer) {
        const filename = `field_${Date.now()}.png`;
        payload.files = [new AttachmentBuilder(buffer, { name: filename })];
        embed.setImage(`attachment://${filename}`);
      }
    }

    return payload;
  };

  const runLoop = async (isNewBall = false) => {
    const hint = getReleaseHint(nextLine, nextLength, nextSpeed, nextVariation);
    const fullDeliveryReveal = `🥎 **${nextSpeed} ${nextVariation}** pitched **${nextLength}** and angling **${nextLine}**!`;
    const stateData = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);

    if (!message) {
      const isAlreadyInDM = !interaction.guildId || interaction.channel?.isDMBased?.();
      if (isAlreadyInDM || !useDM) {
        useDM = false;
        if (interaction.deferred || interaction.replied) {
          message = await interaction.editReply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        } else {
          message = await interaction.reply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        }
      } else {
        try {
          message = await interaction.user.send(stateData);
          await interaction.editReply({
            content: `✅ **Match started! Check your Direct Messages (DMs) to play.**\n🔗 **[Click here to open DMs](discord://-/users/${discordId})**`
          }).catch(() => {});
        } catch (err) {
          useDM = false;
          message = await interaction.editReply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        }
      }
    } else if (isNewBall) {
      // Clear buttons on the previous delivery message
      await message.edit({ components: [] }).catch(() => {});
      // Send a fresh new message for the new delivery
      message = await message.channel.send(stateData).catch(async () => {
        return await interaction.user.send(stateData);
      });
    }

    let deliveryConfirmed = false;
    const filter = i => i.user.id === discordId && i.customId.startsWith('bat_step_');
    const collector = message.createMessageComponentCollector({ filter, time: 900000 });

    collector.on('collect', async i => {
      const customId = i.customId;

      if (customId.startsWith('bat_step_stance_')) {
        selectedStance = customId.replace('bat_step_stance_', '').replace(`_${discordId}`, '');
        currentStep = 'footwork';
        const nextState = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_back_stance_')) {
        if (currentStep !== 'footwork') return i.deferUpdate().catch(() => {});
        currentStep = 'stance';
        selectedStance = null;
        selectedFootwork = null;
        const nextState = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_footwork_')) {
        selectedFootwork = customId.replace('bat_step_footwork_', '').replace(`_${discordId}`, '');
        if (selectedFootwork === 'Leave') {
          currentStep = 'leave_confirm';
        } else {
          currentStep = 'intent';
        }
        const nextState = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_back_footwork_')) {
        if (currentStep !== 'intent') return i.deferUpdate().catch(() => {});
        currentStep = 'footwork';
        selectedFootwork = null;
        selectedIntent = null;
        selectedZone = null;
        const nextState = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_intent_')) {
        selectedIntent = customId.replace('bat_step_intent_', '').replace(`_${discordId}`, '');
        if (selectedIntent === 'Leave') {
          currentStep = 'leave_confirm';
          selectedZone = null;
        } else {
          currentStep = 'zone';
          selectedZone = null;
        }
        const nextState = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_back_intent_')) {
        return i.deferUpdate().catch(() => {});
      } else if (customId.startsWith('bat_step_zone_')) {
        selectedZone = customId.replace('bat_step_zone_', '').replace(`_${discordId}`, '');
        const updatedState = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(updatedState).catch(() => {});
      } else if (customId.startsWith('bat_step_confirm_')) {
        if (selectedFootwork !== 'Leave' && selectedIntent !== 'Leave' && !selectedZone) return i.deferUpdate().catch(() => {});
        deliveryConfirmed = true;
        collector.stop();
        await i.update({ components: [] }).catch(() => {});

        const bowlerInput = {
          line: nextLine,
          length: nextLength,
          variation: nextVariation,
          speed: nextSpeed,
          fieldPreset: nextFieldPreset
        };
        const effectiveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
        const equippedShot = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
          ? getPlayerEquippedShot(discordId, effectiveFw, 'Leave', 'In Line')
          : (selectedZone ? getPlayerEquippedShot(discordId, selectedFootwork, selectedIntent, selectedZone) : null);
        const batterInput = {
          stance: selectedStance || 'In Line',
          footwork: selectedFootwork,
          intent: selectedIntent,
          zone: selectedZone,
          equippedShot: equippedShot
        };

        const batterTimingVal = (playerAttrs.timing || 50) + (eqBonuses.timing || 0);
        let perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
        let slightlyChance = Math.max(0.10, 0.985 - perfectChance);
        if (nextSpeed === 'Fast') { perfectChance -= 0.03; }
        if (match.difficulty === 'Hard') { perfectChance -= 0.04; }
        else if (match.difficulty === 'Easy') { perfectChance += 0.04; }

        let timingResult = 'Perfect';
        const roll = Math.random();
        if (roll < perfectChance) {
          timingResult = 'Perfect';
        } else if (roll < perfectChance + slightlyChance) {
          timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
        } else {
          timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
        }

        const isClutch = (match.ballsLimit - ballsFaced <= 5) && (match.targetRuns - runsScored <= 15);
        const isPowerplay = (ballsFaced < 6 && match.ballsLimit > 6);
        const simResult = simulateBallAdvanced({
          bowlerInput,
          batterInput,
          timingResult,
          playerAttrs,
          eqBonuses,
          activeSkills,
          confidence: player.confidence,
          bowlerSkill: match.bowlerSkill,
          isFreeHit: freeHit,
          isClutch,
          isPowerplay,
          pitch: match.pitch
        });

        runsScored += simResult.runs;
        if (simResult.runs === 4 && !simResult.wicket) foursCount++;
        if (simResult.runs === 6 && !simResult.wicket) sixesCount++;
        if (!simResult.rebowl) ballsFaced++;
        if (simResult.wicket) wickets++;

        freeHit = simResult.nextIsFreeHit;

        let confChange = -2;
        if (simResult.runs >= 4) confChange = 6;
        else if (simResult.runs > 0) confChange = 2;
        else if (simResult.wicket) confChange = -15;

        player.confidence = Math.min(100, Math.max(10, player.confidence + confChange));
        db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);

        const shotDesc = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
          ? 'Shouldered Arms (Leave)'
          : `${selectedFootwork} ${selectedIntent} to ${selectedZone} (${equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone)})`;

        lastCommentary = `🥎 **Delivery:** ${bowlerInput.length} on ${bowlerInput.line} (${bowlerInput.speed})\n` +
                         `👉 **Your Shot:** ${shotDesc}\n` +
                         `⏱️ **Timing:** ${simResult.timing}\n\n` +
                         `${simResult.commentary}`;

        const won = runsScored >= match.targetRuns;
        const lost = wickets >= 1 || (ballsFaced >= match.ballsLimit && runsScored < match.targetRuns);

        if (won || lost) {
          await message.edit({ components: [] }).catch(() => {});
          await message.channel.send({ content: lastCommentary });
          await finishMatch(null, player, match, won, runsScored, ballsFaced, foursCount, sixesCount, wickets === 1 ? 'bowled' : 'not out', 0, 0, 0, chapterMode, message);
        } else {
          selectedStance = null;
          selectedFootwork = null;
          selectedIntent = null;
          selectedZone = null;
          currentStep = 'stance';

          // Pre-generate next bowler delivery (locked by current over bowler)
          const nextDeliv = generateBowlerDelivery(match.pitch, getOverCraft(ballsFaced));
          nextLine = nextDeliv.line;
          nextLength = nextDeliv.length;
          nextVariation = nextDeliv.variation;
          nextSpeed = nextDeliv.speed;
          nextFieldPreset = nextDeliv.fieldPreset;

          runLoop(true);
        }
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && !deliveryConfirmed) {
        await message.edit({
          content: '⚠️ **Match Forfeited!** You did not respond within 15 minutes. Match has ended and is recorded as a loss.',
          components: [],
          files: []
        }).catch(() => {});
        player.confidence = Math.max(10, player.confidence - 15);
        db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);
        await finishMatch(null, player, match, false, runsScored, ballsFaced, foursCount, sixesCount, 'forfeit', 0, 0, 0, chapterMode, message);
      }
    });
  };

  runLoop();
}

// 🥎 BOWLING GAME LOOP
async function runBowlingMatch(interaction, player, match, chapterMode) {
  const discordId = player.discord_id;
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

  let runsConceded = 0;
  let ballsBowled = 0;
  let wicketsTaken = 0;
  let lastCommentary = '🥎 You take your mark at the bowling crease...';
  const isSpin = player.bowling_style.toLowerCase().includes('spin');

  const userSettings = getPlayerSettings(discordId);
  let useDM = userSettings ? (userSettings.dm_match ?? 1) === 1 : true;
  let message;

  let selectedLine = null;
  let selectedLength = null;
  let selectedVar = null;
  let selectedSpeed = isSpin ? 'Slow' : 'Fast';
  let selectedField = 'Balanced';
  let currentStep = 'line';

  const getRenderState = async (line, len, variation, spd, fld, step, includeImage = true) => {
    const ballsRemaining = Math.max(0, match.ballsLimit - ballsBowled);
    const need = Math.max(0, match.targetRuns - runsConceded);

    // Progress Bar
    const totalBars = 10;
    const progressPercent = Math.min(100, Math.max(0, (runsConceded / match.targetRuns) * 100));
    const filled = Math.round((progressPercent / 100) * totalBars);
    const progressBar = '▰'.repeat(filled) + '▱'.repeat(totalBars - filled);

    const embed = new EmbedBuilder()
      .setTitle(`🥎 Bowling Inning: vs ${match.opponent}`)
      .setColor('#e74c3c')
      .addFields(
        { name: '🎯 Objective Target', value: `Restrict opponent under **${match.targetRuns} Runs** in **${match.ballsLimit} balls**`, inline: true },
        { name: '📊 Inning Status', value: `Opponent: **${runsConceded}** / **${wicketsTaken}**\nBalls: **${ballsBowled}** / **${match.ballsLimit}**\nOpponent needs **${need} runs** (in ${ballsRemaining} balls)`, inline: true },
        { name: '📈 Opponent Progress', value: `${progressBar} (${Math.round(progressPercent)}% of restrict limit)`, inline: false },
        { name: '🔥 Bowler Vitals', value: `Accuracy: **${playerAttrs.accuracy}** | ${isSpin ? 'Spin' : 'Swing/Pace'}: **${isSpin ? playerAttrs.spin_bowling : playerAttrs.swing}**`, inline: true }
      );

    if (step === 'line') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `👉 **Step 1:** Select your **Aim Line** for this delivery.`
      );
    } else if (step === 'length') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `👉 **Step 2:** Select the **Pitch Length** to target the batter.`
      );
    } else if (step === 'variation') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `👉 **Step 3:** Select your **Bowling Craft** & delivery variation.`
      );
    } else if (step === 'field') {
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚡ **Delivery Setup:** **${len}** on **${line}** with **${variation}**!\n\n` +
        `👉 **Step 4:** Set your **Field Trap** and **Pace Effort**, then press **DELIVER BALL** to bowl!`
      );
    }

    embed.addFields(
      { name: '📐 1. Line', value: line ? `**${line}**` : (step === 'line' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '📏 2. Length', value: len ? `**${len}**` : (step === 'length' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '🌀 3. Variation', value: variation ? `**${variation}**` : (step === 'variation' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '👥 4. Field & Speed', value: (step === 'field') ? `**${fld}** (${spd})` : (step !== 'field' && line && len && variation ? `**${fld}** (${spd})` : '❌ *Pending*'), inline: true }
    );

    const rows = getBowlerStepLayout(step, line, len, variation, spd, fld, isSpin, discordId);
    const payload = {
      embeds: [embed],
      components: rows
    };

    if (includeImage && userSettings?.field_radar !== 0) {
      const isPowerplay = (ballsBowled < 6);
      const oppHand = match.oppBatterHand || 'Right-hand bat';
      const buffer = await generateFieldImage(fld, null, isPowerplay, oppHand);
      if (buffer) {
        const filename = `field_${Date.now()}.png`;
        payload.files = [new AttachmentBuilder(buffer, { name: filename })];
        embed.setImage(`attachment://${filename}`);
      }
    }

    return payload;
  };

  let deliveryConfirmed = false;
  const runLoop = async (isNewBall = false) => {
    deliveryConfirmed = false;
    const shouldIncludeImage = (currentStep === 'field');
    const stateData = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, shouldIncludeImage);

    if (!message) {
      const isAlreadyInDM = !interaction.guildId || interaction.channel?.isDMBased?.();
      if (isAlreadyInDM || !useDM) {
        useDM = false;
        if (interaction.deferred || interaction.replied) {
          message = await interaction.editReply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        } else {
          message = await interaction.reply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        }
      } else {
        try {
          message = await interaction.user.send(stateData);
          await interaction.editReply({
            content: `✅ **Match started! Check your Direct Messages (DMs) to play.**\n🔗 **[Click here to open DMs](discord://-/users/${discordId})**`
          }).catch(() => {});
        } catch (err) {
          console.warn('Could not send DM to user, falling back to channel:', err?.message || err);
          useDM = false;
          message = await interaction.editReply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        }
      }
    } else if (isNewBall) {
      // Clear buttons on the previous delivery message
      await message.edit({ components: [] }).catch(() => {});
      message = await message.channel.send(stateData);
    }

    const filter = i => i.user.id === discordId && i.customId.startsWith('bowl_step_');
    const collector = message.createMessageComponentCollector({ filter, time: 900000 });

    collector.on('collect', async i => {
      const customId = i.customId;

      if (customId.startsWith('bowl_step_line_')) {
        selectedLine = customId.replace('bowl_step_line_', '').replace(`_${discordId}`, '');
        currentStep = 'length';
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_back_line_')) {
        currentStep = 'line';
        selectedLine = null;
        selectedLength = null;
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_len_')) {
        selectedLength = customId.replace('bowl_step_len_', '').replace(`_${discordId}`, '');
        currentStep = 'variation';
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_back_len_')) {
        currentStep = 'length';
        selectedLength = null;
        selectedVar = null;
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_var_')) {
        selectedVar = customId.replace('bowl_step_var_', '').replace(`_${discordId}`, '');
        currentStep = 'field';
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_back_var_')) {
        currentStep = 'variation';
        selectedVar = null;
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_fld_')) {
        selectedField = customId.replace('bowl_step_fld_', '').replace(`_${discordId}`, '');
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_spd_')) {
        selectedSpeed = customId.replace('bowl_step_spd_', '').replace(`_${discordId}`, '');
        const nextState = await getRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bowl_step_confirm_')) {
        deliveryConfirmed = true;
        collector.stop();
        await i.update({ components: [] }).catch(() => {});

        // Simulate delivery
        await runSimulation();
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && !deliveryConfirmed) {
        await message.edit({
          content: '⚠️ **Match Forfeited!** You did not respond within 15 minutes. Match has ended and is recorded as a loss.',
          components: []
        }).catch(() => {});
        player.confidence = Math.max(10, player.confidence - 15);
        db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);
        await finishMatch(null, player, match, false, runsConceded, ballsBowled, 0, 0, 'forfeit', wicketsTaken, runsConceded, ballsBowled / 6, chapterMode, message);
      }
    });
  };

  const runSimulation = async () => {
    const intents = ['Defensive', 'Balanced', 'Aggressive'];
    const aiIntent = intents[Math.floor(Math.random() * intents.length)];

    let aiZone = 'Zone 4';
    if (selectedLine === 'Leg Side') {
      aiZone = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'][Math.floor(Math.random() * 4)];
    } else if (selectedLine === 'Off Side' || selectedLine === 'Wide') {
      aiZone = ['Zone 5', 'Zone 6', 'Zone 7', 'Zone 8'][Math.floor(Math.random() * 4)];
    } else {
      aiZone = `Zone ${Math.floor(Math.random() * 8) + 1}`;
    }

    let aiShot = 'Straight Drive';
    if (selectedLength === 'Short') {
      aiShot = ['Pull Shot', 'Hook Shot', 'Upper Cut', 'Defensive Shot'][Math.floor(Math.random() * 4)];
    } else if (selectedLength === 'Yorker') {
      aiShot = ['Defensive Shot', 'Late Cut', 'Straight Drive'][Math.floor(Math.random() * 3)];
    } else if (selectedLength === 'Good Length') {
      aiShot = ['Straight Drive', 'Cover Drive', 'Defensive Shot', 'Cut Shot'][Math.floor(Math.random() * 4)];
    } else {
      aiShot = ['Straight Drive', 'Lofted Drive', 'Slog Sweep', 'Sweep Shot', 'Cover Drive'][Math.floor(Math.random() * 5)];
    }

    const bowlerInput = {
      line: selectedLine || 'Stumps',
      length: selectedLength || 'Good Length',
      variation: selectedVar || 'Normal Delivery',
      speed: selectedSpeed || (isSpin ? 'Slow' : 'Fast'),
      fieldPreset: selectedField || 'Balanced'
    };
    const batterInput = { targetZone: aiZone, intent: aiIntent, shotType: aiShot };

    let timingResult = 'Slightly Late';
    const timingRoll = Math.random();
    if (match.difficulty === 'Easy') {
      if (timingRoll < 0.3) timingResult = 'Perfect';
      else if (timingRoll < 0.7) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
      else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
    } else if (match.difficulty === 'Hard') {
      if (timingRoll < 0.6) timingResult = 'Perfect';
      else if (timingRoll < 0.95) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
      else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
    } else {
      if (timingRoll < 0.45) timingResult = 'Perfect';
      else if (timingRoll < 0.85) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
      else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
    }

    const aiAttrs = { power: 55, timing: 55, technique: 55 };

    const simResult = simulateBallAdvanced({
      bowlerInput,
      batterInput,
      timingResult,
      playerAttrs: aiAttrs,
      eqBonuses: {},
      activeSkills: [],
      confidence: 50,
      bowlerSkill: (playerAttrs.accuracy || 45) + (eqBonuses.accuracy || 0),
      isFreeHit: false,
      pitch: match.pitch
    });

    runsConceded += simResult.runs;
    if (!simResult.rebowl) ballsBowled++;
    if (simResult.wicket) wicketsTaken++;

    lastCommentary = `🥎 **You bowled:** ${selectedLength || 'Good Length'} on ${selectedLine || 'Stumps'} (${selectedSpeed})\n` +
                     `👉 **Opponent played:** ${aiShot} to ${aiZone} (${timingResult} timing)\n\n` +
                     `${simResult.commentary}`;

    const won = wicketsTaken >= 10 || (ballsBowled >= match.ballsLimit && runsConceded < match.targetRuns);
    const lost = runsConceded >= match.targetRuns;

    if (won || lost) {
      await message.channel.send({ content: lastCommentary });
      await finishMatch(null, player, match, won, runsConceded, ballsBowled, 0, 0, 'not out', wicketsTaken, runsConceded, ballsBowled / 6, chapterMode, message);
    } else {
      selectedLine = null;
      selectedLength = null;
      selectedVar = null;
      currentStep = 'line';
      runLoop(true);
    }
  };

  runLoop();
}

// 🎭 ALL-ROUNDER GAME LOOP
async function runAllRounderMatch(interaction, player, match, chapterMode) {
  const originalTarget = match.targetRuns;
  const originalBalls = match.ballsLimit;

  const batTarget = Math.max(4, Math.round(originalTarget * 0.6));
  const batBalls = Math.max(3, Math.round(originalBalls * 0.6));

  const discordId = player.discord_id;
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

  let runsScored = 0;
  let ballsFaced = 0;
  let wickets = 0;
  let foursCount = 0;
  let sixesCount = 0;
  let freeHit = false;
  let lastCommentary = '🏏 Batting Phase: You walk out to bat...';
  
  const userSettings = getPlayerSettings(discordId);
  let useDM = userSettings ? (userSettings.dm_match ?? 1) === 1 : true;
  let message;

  let selectedStance = null;
  let selectedFootwork = null;
  let selectedIntent = null;
  let selectedZone = null;
  let currentStep = 'stance';

  // Lock bowler type per 6-ball over so a bowler never switches between pace and spin mid-over
  const overBowlerTypes = {};
  const getOverCraft = (ballCount) => {
    const ov = Math.floor((ballCount || 0) / 6);
    if (!overBowlerTypes[ov]) overBowlerTypes[ov] = pickBowlerTypeForOver(match.pitch, ov);
    return overBowlerTypes[ov];
  };

  // Pre-generate the first delivery
  const initialDelivery = generateBowlerDelivery(match.pitch, getOverCraft(0));
  let nextLine = initialDelivery.line;
  let nextLength = initialDelivery.length;
  let nextVariation = initialDelivery.variation;
  let nextSpeed = initialDelivery.speed;
  let nextFieldPreset = initialDelivery.fieldPreset;

  const getBatRenderState = async (stance, footwork, intent, zone, step, hint, fullDeliveryReveal, includeImage = true) => {
    const need = Math.max(0, batTarget - runsScored);
    const ballsRemaining = Math.max(0, batBalls - ballsFaced);

    // Progress Bar
    const totalBars = 10;
    const progressPercent = Math.min(100, Math.max(0, (runsScored / batTarget) * 100));
    const filled = Math.round((progressPercent / 100) * totalBars);
    const progressBar = '▰'.repeat(filled) + '▱'.repeat(totalBars - filled);

    const embed = new EmbedBuilder()
      .setTitle(`🏏 Batting Inning (All-Rounder Phase 1/2)`)
      .setColor('#3498db')
      .addFields(
        { name: '🎯 Objective Target', value: `Score at least **${batTarget} Runs** in **${batBalls} balls**`, inline: true },
        { name: '📊 Inning Status', value: `Score: **${runsScored}** / **${wickets}**\nBalls: **${ballsFaced}** / **${batBalls}**\n${need === 0 ? '✅ Target met!' : `Need **${need} runs** in **${ballsRemaining} balls**`}`, inline: true },
        { name: '📈 Phase Progress', value: `${progressBar} (${Math.round(progressPercent)}% of batting target)`, inline: false },
        { name: '🔥 Player Status', value: `Confidence: **${player.confidence}/100** ${emojis.confidence} | Form: **${player.form}/100** ${emojis.form}`, inline: true }
      );

    if (freeHit) {
      embed.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'No dismissal rules apply this ball!' });
    }

    const equippedShot = (footwork && intent && zone && footwork !== 'Leave' && intent !== 'Leave')
      ? getPlayerEquippedShot(discordId, footwork, intent, zone)
      : null;

    const isLeave = (footwork === 'Leave' || intent === 'Leave');

    embed.addFields(
      { name: '🧍 1. Stance', value: stance ? `**${stance}**` : (step === 'stance' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '👣 2. Footwork', value: footwork ? (footwork === 'Leave' ? '🛡️ **Leave**' : `**${footwork}**`) : (step === 'footwork' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '🎯 3. Intent', value: isLeave ? '🛡️ **Leave**' : (intent ? `**${intent}**` : (step === 'intent' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true },
      { name: '📐 4. Zone', value: isLeave ? '— *(Left Alone)*' : (zone ? `**${zone}**` : (step === 'zone' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true }
    );

    let rows = [];
    if (step === 'stance') {
      embed.setDescription(`*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                          (hint ? `${hint}\n\n` : '') +
                          `👉 **Step 1:** Select your **Stance** at the crease.`);
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_stance_Off Side_${discordId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_In Line_${discordId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_Leg Side_${discordId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
      );
      rows = [row1];
    } else if (step === 'footwork') {
      embed.setDescription(`*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                          (hint ? `${hint}\n\n` : '') +
                          `👉 **Step 2:** Select your **Footwork** commitment.`);
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_footwork_Front Foot_${discordId}`).setLabel('Front Foot').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_footwork_Back Foot_${discordId}`).setLabel('Back Foot').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_footwork_Advanced_${discordId}`).setLabel('Advanced (Step Out)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_footwork_Leave_${discordId}`).setLabel('Leave').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_back_stance_${discordId}`).setLabel('⬅️ Back to Stance').setStyle(ButtonStyle.Secondary)
      );
      rows = [row1, row2];
    } else if (step === 'leave_confirm') {
      const leaveFw = (footwork && footwork !== 'Leave') ? footwork : 'Front Foot';
      const leaveShot = getPlayerEquippedShot(discordId, leaveFw, 'Leave', 'In Line');
      const leaveType = (footwork && footwork !== 'Leave') ? `${footwork} Leave` : 'Leave';
      embed.setDescription(
        `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
        `▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
        `👉 You have committed to a **${leaveType}**.\n` +
        (leaveShot ? `🧘 **Equipped Technique:** \`${leaveShot.num} ${leaveShot.name}\` (${leaveShot.style})\n💬 *"${leaveShot.desc}"*\n\n` : '') +
        `Click **CONFIRM LEAVE** to watch the ball pass through to the keeper.`
      );
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('🛡️ CONFIRM LEAVE 🏏').setStyle(ButtonStyle.Success)
      );
      rows = [row1];
    } else if (step === 'intent') {
      embed.setDescription(`*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                          (hint ? `${hint}\n\n` : '') +
                          `👉 **Step 3:** Select your batting **Intent** for this ball.\n\n` +
                          `• **Push**: Soft hands defense / strike rotation (safest, 0 or 1 run)\n` +
                          `• **Stroke**: Classic ground boundary stroke along the carpet (1 to 4 runs)\n` +
                          `• **Loft**: Aerial power-hitting over the fielders (high risk / reward, 4s & 6s)\n` +
                          `• **Leave**: Shoulder arms and let the ball pass through without offering a shot`);
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_intent_Push_${discordId}`).setLabel('Push').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_intent_Stroke_${discordId}`).setLabel('Stroke').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_intent_Loft_${discordId}`).setLabel('Loft').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_intent_Leave_${discordId}`).setLabel('🛡️ Leave').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_back_footwork_${discordId}`).setLabel('⬅️ Back to Footwork').setStyle(ButtonStyle.Secondary)
      );
      rows = [row1, row2];
    } else if (step === 'zone') {
      embed.setDescription(`*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n▬▬▬ **Match Live Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                          `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
                          `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
                          (equippedShot
                            ? `🏏 **Equipped Preset Shot:** \`${equippedShot.num} ${equippedShot.name}\` (${equippedShot.style} • Risk: ${equippedShot.risk})\n💬 *"${equippedShot.desc}"*`
                            : (zone ? `🏏 **Projected Shot:** \`${getDerivedShotName(footwork, intent, zone)}\`` : `💡 *Click any field zone to preview your preset shot and aim.*`)));
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Third Man_${discordId}`).setLabel('Third Man').setStyle(zone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Point_${discordId}`).setLabel('Point').setStyle(zone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Cover_${discordId}`).setLabel('Cover').setStyle(zone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Long Off_${discordId}`).setLabel('Long Off').setStyle(zone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Long On_${discordId}`).setLabel('Long On').setStyle(zone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Mid Wicket_${discordId}`).setLabel('Mid Wicket').setStyle(zone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Square Leg_${discordId}`).setLabel('Square Leg').setStyle(zone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Fine Leg_${discordId}`).setLabel('Fine Leg').setStyle(zone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!zone)
      );
      rows = [row1, row2, row3];
    }

    const payload = { embeds: [embed], components: rows };
    if (includeImage && userSettings?.field_radar !== 0) {
      const isPowerplay = (ballsFaced < 6 && batBalls > 6);
      const fieldPreset = nextFieldPreset || 'Balanced';
      const buffer = await generateFieldImage(fieldPreset, zone, isPowerplay, player.batting_hand);
      if (buffer) {
        const filename = `field_${Date.now()}.png`;
        payload.files = [new AttachmentBuilder(buffer, { name: filename })];
        embed.setImage(`attachment://${filename}`);
      }
    }

    return payload;
  };

  const runBatLoop = async (isNewBall = false) => {
    const hint = getReleaseHint(nextLine, nextLength, nextSpeed, nextVariation);
    const fullDeliveryReveal = `🥎 **${nextSpeed} ${nextVariation}** pitched **${nextLength}** and angling **${nextLine}**!`;
    const stateData = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);

    if (!message) {
      const isAlreadyInDM = !interaction.guildId || interaction.channel?.isDMBased?.();
      if (isAlreadyInDM || !useDM) {
        useDM = false;
        if (interaction.deferred || interaction.replied) {
          message = await interaction.editReply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        } else {
          message = await interaction.reply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        }
      } else {
        try {
          message = await interaction.user.send(stateData);
          await interaction.editReply({
            content: `✅ **Match started! Check your Direct Messages (DMs) to play.**\n🔗 **[Click here to open DMs](discord://-/users/${discordId})**`
          }).catch(() => {});
        } catch (err) {
          useDM = false;
          message = await interaction.editReply(stateData).catch(async () => {
            return await interaction.channel?.send(stateData);
          });
        }
      }
    } else if (isNewBall) {
      // Clear buttons on the previous delivery message
      await message.edit({ components: [] }).catch(() => {});
      // Send a fresh new message for the new delivery
      message = await message.channel.send(stateData).catch(async () => {
        return await interaction.user.send(stateData);
      });
    }

    let deliveryConfirmed = false;
    const filter = i => i.user.id === discordId && i.customId.startsWith('bat_step_');
    const collector = message.createMessageComponentCollector({ filter, time: 900000 });

    collector.on('collect', async i => {
      const customId = i.customId;

      if (customId.startsWith('bat_step_stance_')) {
        selectedStance = customId.replace('bat_step_stance_', '').replace(`_${discordId}`, '');
        currentStep = 'footwork';
        const nextState = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_back_stance_')) {
        if (currentStep !== 'footwork') return i.deferUpdate().catch(() => {});
        currentStep = 'stance';
        selectedStance = null;
        selectedFootwork = null;
        const nextState = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_footwork_')) {
        selectedFootwork = customId.replace('bat_step_footwork_', '').replace(`_${discordId}`, '');
        if (selectedFootwork === 'Leave') {
          currentStep = 'leave_confirm';
        } else {
          currentStep = 'intent';
        }
        const nextState = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_back_footwork_')) {
        if (currentStep !== 'intent') return i.deferUpdate().catch(() => {});
        currentStep = 'footwork';
        selectedFootwork = null;
        selectedIntent = null;
        selectedZone = null;
        const nextState = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_intent_')) {
        selectedIntent = customId.replace('bat_step_intent_', '').replace(`_${discordId}`, '');
        if (selectedIntent === 'Leave') {
          currentStep = 'leave_confirm';
          selectedZone = null;
        } else {
          currentStep = 'zone';
          selectedZone = null;
        }
        const nextState = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(nextState).catch(() => {});
      } else if (customId.startsWith('bat_step_back_intent_')) {
        return i.deferUpdate().catch(() => {});
      } else if (customId.startsWith('bat_step_zone_')) {
        selectedZone = customId.replace('bat_step_zone_', '').replace(`_${discordId}`, '');
        const updatedState = await getBatRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, currentStep, hint, fullDeliveryReveal, true);
        await i.update(updatedState).catch(() => {});
      } else if (customId.startsWith('bat_step_confirm_')) {
        if (selectedFootwork !== 'Leave' && selectedIntent !== 'Leave' && !selectedZone) return i.deferUpdate().catch(() => {});
        deliveryConfirmed = true;
        collector.stop();
        await i.update({ components: [] }).catch(() => {});

        const bowlerInput = {
          line: nextLine,
          length: nextLength,
          variation: nextVariation,
          speed: nextSpeed,
          fieldPreset: nextFieldPreset
        };
        const effectiveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
        const equippedShot = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
          ? getPlayerEquippedShot(discordId, effectiveFw, 'Leave', 'In Line')
          : (selectedZone ? getPlayerEquippedShot(discordId, selectedFootwork, selectedIntent, selectedZone) : null);
        const batterInput = {
          stance: selectedStance || 'In Line',
          footwork: selectedFootwork,
          intent: selectedIntent,
          zone: selectedZone,
          equippedShot: equippedShot
        };

        const batterTimingVal = (playerAttrs.timing || 50) + (eqBonuses.timing || 0);
        let perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
        let slightlyChance = Math.max(0.10, 0.985 - perfectChance);
        if (nextSpeed === 'Fast') { perfectChance -= 0.03; }

        let timingResult = 'Perfect';
        const roll = Math.random();
        if (roll < perfectChance) {
          timingResult = 'Perfect';
        } else if (roll < perfectChance + slightlyChance) {
          timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
        } else {
          timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
        }

        const isClutch = (batBalls - ballsFaced <= 3);
        const isPowerplay = (ballsFaced < 6 && batBalls > 6);
        const simResult = simulateBallAdvanced({
          bowlerInput,
          batterInput,
          timingResult,
          playerAttrs,
          eqBonuses,
          activeSkills,
          confidence: player.confidence,
          bowlerSkill: match.bowlerSkill,
          isFreeHit: freeHit,
          isClutch,
          isPowerplay,
          pitch: match.pitch
        });

        runsScored += simResult.runs;
        if (simResult.runs === 4 && !simResult.wicket) foursCount++;
        if (simResult.runs === 6 && !simResult.wicket) sixesCount++;
        if (!simResult.rebowl) ballsFaced++;
        if (simResult.wicket) wickets++;

        freeHit = simResult.nextIsFreeHit;

        let confChange = -2;
        if (simResult.runs >= 4) confChange = 6;
        else if (simResult.runs > 0) confChange = 2;
        else if (simResult.wicket) confChange = -15;

        player.confidence = Math.min(100, Math.max(10, player.confidence + confChange));
        db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);

        const shotDesc = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
          ? 'Shouldered Arms (Leave)'
          : `${selectedFootwork} ${selectedIntent} to ${selectedZone} (${equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone)})`;

        lastCommentary = `🥎 **Delivery:** ${bowlerInput.length} on ${bowlerInput.line} (${bowlerInput.speed})\n` +
                         `👉 **Your Shot:** ${shotDesc}\n` +
                         `⏱️ **Timing:** ${simResult.timing}\n\n` +
                         `${simResult.commentary}`;

        const batFinished = wickets >= 1 || ballsFaced >= batBalls;

        if (batFinished) {
          await message.edit({ components: [] }).catch(() => {});
          const transitionEmbed = new EmbedBuilder()
            .setTitle(`🏏 Phase 1 (Batting) Complete!`)
            .setDescription(
              `🏃 You scored **${runsScored} runs** off **${ballsFaced} balls** (${foursCount}x4, ${sixesCount}x6)!\n\n` +
              (runsScored >= batTarget ? `🎉 **Target achieved!** You gave your team a strong total to defend.\n\n` : `⚠️ **Fell short of the ${batTarget} batting target.** You will need a disciplined bowling spell to defend this total!\n\n`) +
              `🥎 **Phase 2 (Bowling)** is starting now... Grab the ball and defend your total!`
            )
            .setColor('#9b59b6');

          await message.channel.send({ embeds: [transitionEmbed] });
          
          // Transition to Bowling Phase
          await runBowlingPhase(message);
        } else {
          selectedStance = null;
          selectedFootwork = null;
          selectedIntent = null;
          selectedZone = null;
          currentStep = 'stance';

          // Pre-generate next bowler delivery (locked by current over bowler)
          const nextDeliv = generateBowlerDelivery(match.pitch, getOverCraft(ballsFaced));
          nextLine = nextDeliv.line;
          nextLength = nextDeliv.length;
          nextVariation = nextDeliv.variation;
          nextSpeed = nextDeliv.speed;
          nextFieldPreset = nextDeliv.fieldPreset;

          runBatLoop(true);
        }
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && !deliveryConfirmed) {
        await message.edit({
          content: '⚠️ **Match Forfeited!** You did not respond within 15 minutes. Match has ended and is recorded as a loss.',
          components: [],
          files: []
        }).catch(() => {});
        player.confidence = Math.max(10, player.confidence - 15);
        db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);
        await finishMatch(null, player, match, false, runsScored, ballsFaced, foursCount, sixesCount, 'forfeit', 0, 0, 0, chapterMode, message);
      }
    });
  };

  const runBowlingPhase = async (battingMsg) => {
    const bowlBalls = Math.max(3, originalBalls - batBalls);
    const parBowlTarget = Math.round(originalTarget * (bowlBalls / originalBalls));
    const bowlingTarget = Math.max(parBowlTarget + 1, runsScored + 1);

    const isSpin = player.bowling_style.toLowerCase().includes('spin');
    const bowlingSkill = isSpin
      ? (playerAttrs.spin_bowling || 40) + (eqBonuses.spin_bowling || 0)
      : (playerAttrs.swing || 40) + (eqBonuses.swing || 0);
    const bowlerAcc = (playerAttrs.accuracy || 45) + (eqBonuses.accuracy || 0);
    const effectiveBowlerSkill = Math.round((bowlingSkill * 0.5) + (bowlerAcc * 0.5));

    let runsConceded = 0;
    let ballsBowled = 0;
    let wicketsTaken = 0;
    let bowlingCommentary = `🥎 **Bowling Phase Starts!** Defend **${bowlingTarget - 1} runs** against ${match.opponent} in **${bowlBalls} balls**!`;

    let selectedLine = null;
    let selectedLength = null;
    let selectedVar = null;
    let selectedSpeed = isSpin ? 'Slow' : 'Fast';
    let selectedField = 'Balanced';
    let currentStep = 'line';

    const getBowlRenderState = async (line, len, variation, spd, fld, step, includeImage = true) => {
      const ballsRemaining = Math.max(0, bowlBalls - ballsBowled);
      const need = Math.max(0, bowlingTarget - runsConceded);

      const totalBars = 10;
      const progressPercent = Math.min(100, Math.max(0, (runsConceded / bowlingTarget) * 100));
      const filled = Math.round((progressPercent / 100) * totalBars);
      const progressBar = '▰'.repeat(filled) + '▱'.repeat(totalBars - filled);

      const embed = new EmbedBuilder()
        .setTitle(`🥎 Bowling Inning (All-Rounder Phase 2/2)`)
        .setColor('#e74c3c')
        .addFields(
          { name: '🎯 Objective Target', value: `Restrict opponent under **${bowlingTarget} Runs** in **${bowlBalls} balls**`, inline: true },
          { name: '📊 Inning Status', value: `Opponent: **${runsConceded}** / **${wicketsTaken}**\nBalls: **${ballsBowled}** / **${bowlBalls}**\nOpponent needs **${need} runs** (in ${ballsRemaining} balls)`, inline: true },
          { name: '📈 Opponent Progress', value: `${progressBar} (${Math.round(progressPercent)}% of target)`, inline: false },
          { name: '🔥 Bowler Vitals', value: `Accuracy: **${playerAttrs.accuracy}** | ${isSpin ? 'Spin' : 'Swing/Pace'}: **${isSpin ? playerAttrs.spin_bowling : playerAttrs.swing}**`, inline: true }
        );

      if (step === 'line') {
        embed.setDescription(
          `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
          `▬▬▬ **Match Live Commentary** ▬▬▬\n${bowlingCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
          `👉 **Step 1:** Select your **Aim Line** for this delivery.`
        );
      } else if (step === 'length') {
        embed.setDescription(
          `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
          `▬▬▬ **Match Live Commentary** ▬▬▬\n${bowlingCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
          `👉 **Step 2:** Select the **Pitch Length** to target the batter.`
        );
      } else if (step === 'variation') {
        embed.setDescription(
          `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
          `▬▬▬ **Match Live Commentary** ▬▬▬\n${bowlingCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
          `👉 **Step 3:** Select your **Bowling Craft** & delivery variation.`
        );
      } else if (step === 'field') {
        embed.setDescription(
          `*Opponent:* **${match.opponent}** | *Pitch:* \`${match.pitch}\`\n\n` +
          `▬▬▬ **Match Live Commentary** ▬▬▬\n${bowlingCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
          `⚡ **Delivery Setup:** **${len}** on **${line}** with **${variation}**!\n\n` +
          `👉 **Step 4:** Set your **Field Trap** and **Pace Effort**, then press **DELIVER BALL** to bowl!`
        );
      }

      embed.addFields(
        { name: '📐 1. Line', value: line ? `**${line}**` : (step === 'line' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
        { name: '📏 2. Length', value: len ? `**${len}**` : (step === 'length' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
        { name: '🌀 3. Variation', value: variation ? `**${variation}**` : (step === 'variation' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
        { name: '👥 4. Field & Speed', value: (step === 'field') ? `**${fld}** (${spd})` : (step !== 'field' && line && len && variation ? `**${fld}** (${spd})` : '❌ *Pending*'), inline: true }
      );

      const rows = getBowlerStepLayout(step, line, len, variation, spd, fld, isSpin, discordId);
      const payload = {
        embeds: [embed],
        components: rows
      };

      if (includeImage && userSettings?.field_radar !== 0) {
        const isPowerplay = (ballsBowled < 6);
        const oppHand = match.oppBatterHand || 'Right-hand bat';
        const buffer = await generateFieldImage(fld, null, isPowerplay, oppHand);
        if (buffer) {
          const filename = `field_${Date.now()}.png`;
          payload.files = [new AttachmentBuilder(buffer, { name: filename })];
          embed.setImage(`attachment://${filename}`);
        }
      }

      return payload;
    };

    let bowlMessage = battingMsg;
    let bowlDeliveryConfirmed = false;

    const runBowlLoop = async (isNewBall = false) => {
      bowlDeliveryConfirmed = false;
      const shouldIncludeImage = (currentStep === 'field');
      const stateData = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, shouldIncludeImage);

      if (isNewBall || bowlMessage === battingMsg) {
        if (bowlMessage && bowlMessage !== battingMsg) {
          await bowlMessage.edit({ components: [] }).catch(() => {});
        }
        bowlMessage = await battingMsg.channel.send(stateData);
      }

      const filter = idx => idx.user.id === discordId && idx.customId.startsWith('bowl_step_');
      const collector = bowlMessage.createMessageComponentCollector({ filter, time: 900000 });

      collector.on('collect', async idx => {
        const customId = idx.customId;

        if (customId.startsWith('bowl_step_line_')) {
          selectedLine = customId.replace('bowl_step_line_', '').replace(`_${discordId}`, '');
          currentStep = 'length';
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_back_line_')) {
          currentStep = 'line';
          selectedLine = null;
          selectedLength = null;
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_len_')) {
          selectedLength = customId.replace('bowl_step_len_', '').replace(`_${discordId}`, '');
          currentStep = 'variation';
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_back_len_')) {
          currentStep = 'length';
          selectedLength = null;
          selectedVar = null;
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_var_')) {
          selectedVar = customId.replace('bowl_step_var_', '').replace(`_${discordId}`, '');
          currentStep = 'field';
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, true);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_back_var_')) {
          currentStep = 'variation';
          selectedVar = null;
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_fld_')) {
          selectedField = customId.replace('bowl_step_fld_', '').replace(`_${discordId}`, '');
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, true);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_spd_')) {
          selectedSpeed = customId.replace('bowl_step_spd_', '').replace(`_${discordId}`, '');
          const nextState = await getBowlRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, currentStep, false);
          await idx.update(nextState).catch(() => {});
        } else if (customId.startsWith('bowl_step_confirm_')) {
          bowlDeliveryConfirmed = true;
          collector.stop();
          await idx.update({ components: [] }).catch(() => {});

          const aiIntent = ['Defensive', 'Balanced', 'Aggressive'][Math.floor(Math.random() * 3)];
          let aiZone = 'Zone 4';
          if (selectedLine === 'Leg Side') {
            aiZone = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'][Math.floor(Math.random() * 4)];
          } else if (selectedLine === 'Off Side' || selectedLine === 'Wide') {
            aiZone = ['Zone 5', 'Zone 6', 'Zone 7', 'Zone 8'][Math.floor(Math.random() * 4)];
          } else {
            aiZone = `Zone ${Math.floor(Math.random() * 8) + 1}`;
          }

          let aiShot = 'Straight Drive';
          if (selectedLength === 'Short') {
            aiShot = ['Pull Shot', 'Hook Shot', 'Upper Cut', 'Defensive Shot'][Math.floor(Math.random() * 4)];
          } else if (selectedLength === 'Yorker') {
            aiShot = ['Defensive Shot', 'Late Cut', 'Straight Drive'][Math.floor(Math.random() * 3)];
          } else if (selectedLength === 'Good Length') {
            aiShot = ['Straight Drive', 'Cover Drive', 'Defensive Shot', 'Cut Shot'][Math.floor(Math.random() * 4)];
          } else {
            aiShot = ['Straight Drive', 'Lofted Drive', 'Slog Sweep', 'Sweep Shot', 'Cover Drive'][Math.floor(Math.random() * 5)];
          }

          const bowlerInput = {
            line: selectedLine || 'Stumps',
            length: selectedLength || 'Good Length',
            variation: selectedVar || 'Normal Delivery',
            speed: selectedSpeed || (isSpin ? 'Slow' : 'Fast'),
            fieldPreset: selectedField || 'Balanced'
          };
          const batterInput = { targetZone: aiZone, intent: aiIntent, shotType: aiShot };

          let timingResult = 'Slightly Late';
          const timingRoll = Math.random();
          if (match.difficulty === 'Easy' || match.difficulty === 'Very Easy') {
            if (timingRoll < 0.3) timingResult = 'Perfect';
            else if (timingRoll < 0.7) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
            else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
          } else if (match.difficulty === 'Hard' || match.difficulty === 'Expert') {
            if (timingRoll < 0.6) timingResult = 'Perfect';
            else if (timingRoll < 0.95) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
            else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
          } else {
            if (timingRoll < 0.45) timingResult = 'Perfect';
            else if (timingRoll < 0.85) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
            else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
          }

          const aiAttrs = { power: 55, timing: 55, technique: 55 };

          const simResult = simulateBallAdvanced({
            bowlerInput,
            batterInput,
            timingResult,
            playerAttrs: aiAttrs,
            eqBonuses: {},
            activeSkills,
            confidence: 50,
            bowlerSkill: effectiveBowlerSkill,
            isFreeHit: false,
            pitch: match.pitch
          });

          runsConceded += simResult.runs;
          if (!simResult.rebowl) ballsBowled++;
          if (simResult.wicket) wicketsTaken++;

          bowlingCommentary = `🥎 **You bowled:** ${selectedLength || 'Good Length'} on ${selectedLine || 'Stumps'} (${selectedSpeed})\n` +
                              `👉 **Opponent played:** ${aiShot} to ${aiZone} (${timingResult} timing)\n\n` +
                              `${simResult.commentary}`;

          const oppWon = runsConceded >= bowlingTarget;
          const oppLost = wicketsTaken >= 10 || (ballsBowled >= bowlBalls && runsConceded < bowlingTarget);

          if (oppWon || oppLost) {
            await bowlMessage.channel.send({ content: bowlingCommentary });
            await finishMatch(
              null, 
              player, 
              match, 
              oppLost, 
              runsScored, 
              ballsFaced, 
              foursCount, 
              sixesCount, 
              wickets === 1 ? 'bowled' : 'not out', 
              wicketsTaken, 
              runsConceded, 
              ballsBowled / 6, 
              chapterMode, 
              bowlMessage
            );
          } else {
            selectedLine = null;
            selectedLength = null;
            selectedVar = null;
            currentStep = 'line';
            runBowlLoop(true);
          }
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && !bowlDeliveryConfirmed) {
          await bowlMessage.edit({
            content: '⚠️ **Match Forfeited!** You did not respond within 15 minutes. Match has ended and is recorded as a loss.',
            components: [],
            files: []
          }).catch(() => {});
          player.confidence = Math.max(10, player.confidence - 15);
          db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);
          await finishMatch(
            null,
            player,
            match,
            false,
            runsScored,
            ballsFaced,
            foursCount,
            sixesCount,
            'forfeit',
            wicketsTaken,
            runsConceded,
            ballsBowled / 6,
            chapterMode,
            bowlMessage
          );
        }
      });
    };

    runBowlLoop();
  };

  runBatLoop();
}

// 🏆 FINISH MATCH AND REWARDS (Send New Message)
async function finishMatch(iUnused, player, match, won, runs, balls, fours, sixes, dismissal, wickets, runsConceded, overs, chapterMode, messageObj) {
  const discordId = player.discord_id;
  const tier = getPlayerTier(player.level);
  
  let xpEarned = won ? match.rewardXP : Math.round(match.rewardXP * 0.25);
  let coinsEarned = won ? match.rewardCoins : 5;

  const activeContract = db.prepare('SELECT salary_per_match FROM contracts WHERE player_id = ? AND active = 1').get(discordId);
  const baseSalary = activeContract ? activeContract.salary_per_match : tier.stipend;
  const matchSalary = won ? Math.round(baseSalary * 0.4) : Math.round(baseSalary * 0.15);
  
  coinsEarned += matchSalary;

  let tokenReward = won ? 1 : 0;
  if (won && Math.random() < 0.3) tokenReward += 1;

  db.prepare(`
    UPDATE players 
    SET coins = coins + ?, 
        training_tokens = training_tokens + ?, 
        form = MIN(100, MAX(20, form + ?))
    WHERE discord_id = ?
  `).run(coinsEarned, tokenReward, won ? 10 : -10, discordId);

  // Update Stats
  db.prepare(`
    UPDATE stats 
    SET matches = matches + 1,
        runs = runs + ?,
        balls = balls + ?,
        fours = fours + ?,
        sixes = sixes + ?,
        fifties = fifties + ?,
        hundreds = hundreds + ?,
        ducks = ducks + ?,
        wickets = wickets + ?,
        overs = overs + ?,
        runs_conceded = runs_conceded + ?
    WHERE player_id = ?
  `).run(
    runs, 
    balls, 
    fours, 
    sixes, 
    (runs >= 50 && runs < 100) ? 1 : 0, 
    runs >= 100 ? 1 : 0, 
    (balls > 0 && runs === 0 && dismissal !== 'not out') ? 1 : 0,
    wickets,
    overs,
    runsConceded,
    discordId
  );

  // Match History
  db.prepare(`
    INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(discordId, match.opponent, chapterMode ? 'Chapter' : 'Practice', runs, balls, fours, sixes, dismissal, wickets, runsConceded, overs, won ? 'Won' : 'Lost');

  let chapterRewardMsg = '';
  if (chapterMode && won) {
    db.prepare('UPDATE players SET current_chapter = current_chapter + 1 WHERE discord_id = ?').run(discordId);
    if (match.chapterUnlockItem) {
      const item = match.chapterUnlockItem;
      db.prepare(`
        INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(discordId, item.item_id, item.name, item.type, item.rarity, JSON.stringify(item.bonuses));
    }
    chapterRewardMsg = match.chapterUnlockMsg;
  }

  if (activeContract) {
    db.prepare('UPDATE contracts SET remaining_seasons = remaining_seasons - 1 WHERE player_id = ? AND active = 1').run(discordId);
    const checkContract = db.prepare('SELECT id, remaining_seasons FROM contracts WHERE player_id = ? AND active = 1').get(discordId);
    if (checkContract && checkContract.remaining_seasons <= 0) {
      db.prepare('DELETE FROM contracts WHERE id = ?').run(checkContract.id);
    }
  }

  const xpResult = addXP(db, discordId, xpEarned);

  // Build Results Embed
  const embed = new EmbedBuilder()
    .setTitle(won ? '🏆 MATCH VICTORY!' : '💔 MATCH DEFEAT!')
    .setDescription(won ? `Outstanding performance! You completed the match objective vs **${match.opponent}**.` : `You fell short of the objective against **${match.opponent}** this time. Hit the nets to train!`)
    .setColor(won ? '#2ecc71' : '#e74c3c')
    .addFields(
      { name: '🏏 Your Batting Card', value: `Score: **${runs}** Runs off **${balls}** balls\nBoundaries: **${fours}x4 | ${sixes}x6**\nStatus: *${dismissal}*`, inline: true }
    );

  if (wickets > 0 || overs > 0) {
    embed.addFields({ name: '🥎 Your Bowling Card', value: `Figures: **${wickets}** Wickets for **${runsConceded}** Runs\nOvers: **${overs.toFixed(1)}**`, inline: true });
  }

  embed.addFields(
    { name: '✨ Match Rewards', value: `+**${xpEarned} XP**\n+**${emojis.coin} ${coinsEarned} Coins** *(Includes Salary)*\n+**${emojis.token} ${tokenReward} Training Tokens**`, inline: false }
  );

  if (chapterRewardMsg) {
    embed.addFields({ name: '🎁 Chapter Rewards Unlocked!', value: chapterRewardMsg });
  }

  if (xpResult.levelUp) {
    embed.addFields({
      name: '🎉 LEVEL UP!',
      value: `Congratulations! You reached **Level ${xpResult.newLevel}**! You gained **+1 Skill Point** (Use \`/skills\` to spend it). All attributes got a **+1 passive boost**.`
    });
  }

  if (xpResult.achievementsUnlocked.length > 0) {
    embed.addFields({
      name: '🏆 Achievements Unlocked!',
      value: xpResult.achievementsUnlocked.join(', ')
    });
  }

  // Send Match Completion Card as a NEW message
  const finalMessage = await messageObj.channel.send({ embeds: [embed] });

  // Story Event chance (15%)
  let storyEventField = null;
  if (Math.random() < 0.15) {
    storyEventField = getPlayerEvent(player);
  }

  if (storyEventField) {
    const eventEmbed = new EmbedBuilder()
      .setTitle(`📜 Career Event: ${storyEventField.title}`)
      .setDescription(storyEventField.description)
      .setColor('#f1c40f')
      .setFooter({ text: 'Decisions impact your stats, reputation, and attributes.' });

    const buttons = storyEventField.choices.map((choice, index) => (
      new ButtonBuilder()
        .setCustomId(`event_choice:${storyEventField.id}:${index}:${discordId}`)
        .setLabel(choice.label.substring(0, 80))
        .setStyle(ButtonStyle.Secondary)
    ));

    const eventRow = new ActionRowBuilder().addComponents(buttons);

    // Send story event as a new message
    const eventMsg = await finalMessage.channel.send({
      embeds: [eventEmbed],
      components: [eventRow]
    });

    const filter = btnInt => btnInt.customId.startsWith(`event_choice:${storyEventField.id}:`) && btnInt.user.id === discordId;
    const collector = eventMsg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async btnInt => {
      try {
        collector.stop();
        await btnInt.deferUpdate().catch(() => {});

        const choiceIdx = parseInt(btnInt.customId.split(':')[2], 10);
        const chosenOption = storyEventField.choices[choiceIdx];

        if (chosenOption && typeof chosenOption.dbUpdate === 'function') {
          chosenOption.dbUpdate(db, discordId);
        }

        const decisionEmbed = new EmbedBuilder()
          .setTitle('✅ Career Choice Registered')
          .setDescription(`**You chose:** *${chosenOption ? chosenOption.label : 'Choice'}*\n\n**Outcome:** ${chosenOption ? chosenOption.resultText : 'Recorded.'}`)
          .setColor('#2ecc71');

        // Disable buttons on the event message and display decision outcome
        await eventMsg.edit({
          embeds: [decisionEmbed],
          components: []
        }).catch(() => {});
      } catch (err) {
        console.error('Error handling story event choice:', err);
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        try {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle(`📜 Career Event: ${storyEventField.title}`)
            .setDescription(`${storyEventField.description}\n\n*⏳ No choice was made in time. The event has expired.*`)
            .setColor('#7f8c8d');
          await eventMsg.edit({
            embeds: [timeoutEmbed],
            components: []
          }).catch(() => {});
        } catch (e) {}
      }
    });
  }
}

export async function handleContracts(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT level, coins, reputation, sponsor, name FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  const activeContract = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND active = 1').get(discordId);
  const tier = getPlayerTier(player.level);

  // Helper to draw rounded rectangles
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

  const canBrowse = player.level >= 4;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`browse_contracts_${discordId}`)
      .setLabel('Request Club Offers / Drafts')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canBrowse)
  );

  let response;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext('2d');

      // Background
      const mainGrad = ctx.createLinearGradient(0, 0, 800, 420);
      mainGrad.addColorStop(0, '#111622'); // Steel blue/grey
      mainGrad.addColorStop(1, '#070a10');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 800, 420);

      // Grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 420);
        ctx.stroke();
      }
      for (let i = 0; i < 420; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }

      // Border
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 400);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 740, 70, 12, 'rgba(17, 24, 39, 0.85)', '#64748b', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💼 CONTRACTS & SPONSORS LOCKER', 400, 60);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${player.name.toUpperCase()} • STAGED OFFERS HUB`, 400, 82);

      const drawContractStat = (x, y, label, val, color = '#ffffff') => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, x, y);
        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(val, x, y + 20);
      };

      // Left Panel: Active Contract Details
      drawRoundRect(ctx, 30, 120, 350, 260, 16, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💼 ACTIVE CLUB CONTRACT', 50, 150);

      if (activeContract) {
        drawContractStat(50, 185, 'Contracted Club Team', activeContract.club_name, '#f1c40f');
        drawContractStat(220, 185, 'Contract Division Tier', activeContract.contract_type);
        drawContractStat(50, 255, 'Match Salary Stipend', `🪙 ${activeContract.salary_per_match} / match`, '#2ecc71');
        drawContractStat(220, 255, 'Remaining Term Length', `${activeContract.remaining_seasons} Season(s)`);
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = 'italic 13px sans-serif';
        ctx.fillText('Playing under Academy Stipend.', 50, 190);
        
        drawContractStat(50, 245, 'Academy Match Stipend', `🪙 ${tier.stipend} / match`, '#2ecc71');
        drawContractStat(220, 245, 'Academy Rank Tier', tier.name.replace(/[^a-zA-Z0-9 ]/g, '').trim());
      }

      // Right Panel: Active Sponsor
      drawRoundRect(ctx, 400, 120, 370, 260, 16, 'rgba(17, 24, 39, 0.85)', '#f1c40f', 2);
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('👟 ACTIVE BRAND SPONSOR', 420, 150);

      if (player.sponsor && player.sponsor !== 'None') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.sponsor.toUpperCase(), 420, 190);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Status: Active Endorsement Deal', 420, 215);
        ctx.fillText('Provides match bonus coins and gear.', 420, 235);
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = 'italic 13px sans-serif';
        ctx.fillText('No active brand sponsor deal.', 420, 190);
        ctx.fillText('You are currently self-funded.', 420, 215);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(420, 260);
      ctx.lineTo(740, 260);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Unlock sponsorships via career choice events.', 420, 290);
      ctx.fillText('Request new draft offer bids below once Level 4.', 420, 310);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `contracts_${discordId}.png` });

      response = await interaction.editReply({
        content: `💼 **${player.name}'s Contract Locker:**`,
        files: [attachment],
        components: [row]
      });

    } catch (err) {
      console.error('Error drawing contracts canvas:', err);
    }
  }

  if (!response) {
    const embed = new EmbedBuilder()
      .setTitle('💼 Contracts & Sponsors Hub')
      .setColor('#34495e')
      .setTimestamp();

    if (activeContract) {
      embed.setDescription(`You currently have an active contract signed with **${activeContract.club_name}**.`);
      embed.addFields(
        { name: 'Club Name', value: activeContract.club_name, inline: true },
        { name: 'Contract Tier', value: activeContract.contract_type, inline: true },
        { name: 'Salary', value: `${emojis.coin} ${activeContract.salary_per_match} / match`, inline: true },
        { name: 'Remaining Term', value: `${activeContract.remaining_seasons} seasons`, inline: true }
      );
    } else {
      embed.setDescription(`You are playing under an academy stipend.\n\n**Current Stipend:** ${emojis.coin} ${tier.stipend} / match\n**Current Level Standing:** ${tier.name}`);
    }

    embed.addFields({
      name: '👟 Active Sponsor',
      value: `**Sponsor Name:** ${player.sponsor || 'None'}\n*(Unlock and sign sponsorships via random Post-Match Career Events)*`,
      inline: false
    });

    if (!canBrowse) {
      embed.setFooter({ text: 'Reach Level 4 to unlock local club cricket drafts and salary contract offers.' });
    }

    response = await interaction.editReply({ embeds: [embed], components: [row] });
  }

  const filter = i => i.customId === `browse_contracts_${discordId}` && i.user.id === discordId;
  const collector = response.createMessageComponentCollector({ filter, time: 20000 });

  collector.on('collect', async i => {
    const level = player.level;
    const baseVal = level * 15 + player.reputation * 0.2;
    
    const offers = [
      {
        club: 'Surrey Stars CC',
        type: level >= 13 ? 'Domestic T20' : level >= 7 ? 'District Club' : 'Local Club',
        salary: Math.round(baseVal * 0.9 + 20),
        term: 2
      },
      {
        club: 'Mumbai Blasters',
        type: level >= 13 ? 'Domestic T20' : level >= 7 ? 'District Club' : 'Local Club',
        salary: Math.round(baseVal * 1.1 + 30),
        term: 1
      },
      {
        club: 'Sydney Thunderbirds',
        type: level >= 13 ? 'Domestic T20' : level >= 7 ? 'District Club' : 'Local Club',
        salary: Math.round(baseVal * 1.0 + 25),
        term: 3
      }
    ];

    const offerEmbed = new EmbedBuilder()
      .setTitle('💼 Incoming Contract Offers')
      .setDescription('Review the club bids for your signature. Signing a new contract will replace your existing contract.')
      .setColor('#f39c12');

    offers.forEach((o, index) => {
      offerEmbed.addFields({
        name: `Offer #${index + 1}: ${o.club} (${o.type})`,
        value: `💰 Salary: **${emojis.coin} ${o.salary} / match**\n📅 Term: **${o.term} Seasons**`,
        inline: false
      });
    });

    const buttons = offers.map((o, idx) => (
      new ButtonBuilder()
        .setCustomId(`accept_contract_${idx}_${discordId}`)
        .setLabel(`Sign with ${o.club}`)
        .setStyle(ButtonStyle.Success)
    ));

    const offerRow = new ActionRowBuilder().addComponents(buttons);

    await i.update({
      embeds: [offerEmbed],
      components: [offerRow],
      files: [],
      attachments: []
    });

    const innerFilter = idx => idx.customId.startsWith(`accept_contract_`) && idx.user.id === discordId;
    const innerCollector = response.createMessageComponentCollector({ filter: innerFilter, time: 20000 });

    innerCollector.on('collect', async idx => {
      innerCollector.stop();
      collector.stop();
      
      const offerIndex = parseInt(idx.customId.split('_')[2], 10);
      const chosenOffer = offers[offerIndex];

      db.prepare('DELETE FROM contracts WHERE player_id = ?').run(discordId);

      db.prepare(`
        INSERT INTO contracts (player_id, club_name, contract_type, salary_per_match, term_seasons, remaining_seasons, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(discordId, chosenOffer.club, chosenOffer.type, chosenOffer.salary, chosenOffer.term, chosenOffer.term);

      const signEmbed = new EmbedBuilder()
        .setTitle('✅ Contract Signed!')
        .setDescription(`Congratulations! You have officially signed with **${chosenOffer.club}**!\n\n**New Match Salary:** ${emojis.coin} ${chosenOffer.salary} / match\n**Term:** ${chosenOffer.term} Seasons`)
        .setColor('#2ecc71')
        .setTimestamp();

      await idx.update({
        embeds: [signEmbed],
        components: []
      });
    });
  });
}

export async function handleSeason(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT level, season, form, reputation FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  const tier = getPlayerTier(player.level);

  let nextTierReq = 'N/A (Highest Tier reached!)';
  if (player.level < 4) nextTierReq = 'Reach Level 4 to unlock Local Club Cricket.';
  else if (player.level < 7) nextTierReq = 'Reach Level 7 to unlock District Division.';
  else if (player.level < 10) nextTierReq = 'Reach Level 10 to unlock State Selection.';
  else if (player.level < 13) nextTierReq = 'Reach Level 13 to unlock Domestic T20 Franchise leagues.';
  else if (player.level < 19) nextTierReq = 'Reach Level 19 to secure a National Team Call-up!';

  // Helper to draw rounded rectangles
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

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 320);
      const ctx = canvas.getContext('2d');

      // Background
      const mainGrad = ctx.createLinearGradient(0, 0, 800, 320);
      mainGrad.addColorStop(0, '#0c1a17');
      mainGrad.addColorStop(1, '#020705');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 800, 320);

      // Grid
      ctx.strokeStyle = 'rgba(26, 188, 156, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 320);
        ctx.stroke();
      }
      for (let i = 0; i < 320; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }

      // Border
      ctx.strokeStyle = '#1abc9c';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 300);

      // Left Panel: Season Badge
      drawRoundRect(ctx, 30, 30, 240, 260, 16, 'rgba(17, 24, 39, 0.85)', '#1abc9c', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 CAREER SEASON', 150, 70);

      ctx.fillStyle = '#1abc9c';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(`S${player.season}`, 150, 150);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('CURRENT CYCLE', 150, 185);

      drawRoundRect(ctx, 50, 215, 160, 48, 8, 'rgba(26, 188, 156, 0.1)');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(tier.name.replace(/[^a-zA-Z0-9 ]/g, '').trim(), 150, 245);

      // Right Panel: Stats & Next Target
      drawRoundRect(ctx, 290, 30, 480, 260, 16, 'rgba(17, 24, 39, 0.85)', '#1abc9c', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📈 PERFORMANCE OVERVIEW', 320, 65);

      const drawSeasonStat = (y, label, val, valColor = '#ffffff') => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(label, 320, y);
        ctx.fillStyle = valColor;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, 740, y);
        ctx.textAlign = 'left';
      };

      drawSeasonStat(110, 'Current Standing Tier', tier.name.replace(/[^a-zA-Z0-9 ]/g, '').trim());
      drawSeasonStat(150, 'Recent Match Form', `${player.form} / 100`, '#3b82f6');
      drawSeasonStat(190, 'Career World Reputation', `${player.reputation} REP`, '#eab308');

      // target line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(320, 215);
      ctx.lineTo(740, 215);
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🎯 NEXT STANDING TARGET:', 320, 245);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(nextTierReq, 320, 268);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `season_${discordId}.png` });

      return await interaction.editReply({
        content: `🏆 **Season ${player.season} Overview:**`,
        files: [attachment]
      });

    } catch (err) {
      console.error('Error drawing season canvas:', err);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Career Season Overview`)
    .setDescription(`You are currently playing in **Season ${player.season}**.\n\nYour achievements in local clubs, state, and franchises determine your call-ups.`)
    .setColor('#1abc9c')
    .addFields(
      { name: 'Current Tier Standing', value: tier.name, inline: true },
      { name: 'Recent Form Rating', value: `${player.form} / 100`, inline: true },
      { name: 'Career Reputation', value: `${player.reputation} Points`, inline: true },
      { name: '🚀 Next Tier Target', value: nextTierReq, inline: false }
    )
    .setFooter({ text: 'Matches played and training sessions improve your reputation, unlocking higher divisions!' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleTeam(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name, nationality, primary_role, batting_hand, bowling_style, academy_id, level, reputation FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  const academy = academies[player.academy_id] || { name: 'None', rating: 0, specialty: 'N/A', trainingBonusText: 'N/A', history: 'N/A', coachRating: 'N/A' };
  const contract = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND active = 1').get(discordId);
  const tier = getPlayerTier(player.level);

  // Add navigation button to view Contracts/Offers Hub directly
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_contracts_${discordId}`)
      .setLabel('Go to Contracts Hub')
      .setStyle(ButtonStyle.Primary)
  );

  // Helper to draw rounded rectangles
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

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 520);
      const ctx = canvas.getContext('2d');

      // Background solid fill (highly optimized)
      ctx.fillStyle = '#060a17';
      ctx.fillRect(0, 0, 800, 520);

      // Grid (batched paths to save CPU draw calls)
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 800; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 520);
      }
      for (let i = 0; i < 520; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
      }
      ctx.stroke();

      // Border
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 500);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 740, 70, 12, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏏 TEAM & CONTRACT INFORMATION', 400, 60);
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${player.name.toUpperCase()} • REPRESENTING ${player.nationality.toUpperCase()}`, 400, 82);

      const drawSectionLine = (x, y, label, val, color = '#ffffff') => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, x, y);
        ctx.fillStyle = color;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(val, x, y + 20);
      };

      // Left Panel: Training Academy Details
      drawRoundRect(ctx, 30, 120, 350, 260, 16, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🎓 ACTIVE TRAINING ACADEMY', 50, 150);

      drawSectionLine(50, 175, 'Academy Name', academy.name, '#f1c40f');
      drawSectionLine(50, 230, 'Coach Quality', academy.coachRating);
      drawSectionLine(210, 230, 'Academy Star Rating', '★'.repeat(academy.rating || 1));
      drawSectionLine(50, 285, 'Specialization Focus', academy.specialty);
      drawSectionLine(50, 340, 'Training Focus Reward', academy.trainingBonusText, '#2ecc71');

      // Right Panel: Professional Club Details
      drawRoundRect(ctx, 400, 120, 370, 260, 16, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('💼 ACTIVE CLUB CONTRACT', 420, 150);

      if (contract) {
        drawSectionLine(420, 180, 'Contracted Club Team', contract.club_name, '#f1c40f');
        drawSectionLine(600, 180, 'League Tier Standing', contract.contract_type);
        drawSectionLine(420, 255, 'Match Salary stipend', `🪙 ${contract.salary_per_match} / match`, '#2ecc71');
        drawSectionLine(600, 255, 'Remaining Contract Term', `${contract.remaining_seasons} Season(s)`);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('Club Status: Academy Trainee', 420, 180);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('You are currently playing for your academy team.', 420, 205);
        ctx.fillText('Earn reputation to receive pro draft bids.', 420, 222);

        drawSectionLine(420, 255, 'Match Stipend salary', `🪙 ${tier.stipend} / match`, '#2ecc71');
        drawSectionLine(600, 255, 'Contract Status', 'Free Agent');
      }

      // Bottom Panel: Standing standing & Info
      drawRoundRect(ctx, 30, 400, 740, 80, 12, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('📈 LEAGUE STANDINGS & REPUTATION', 50, 428);

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px sans-serif';
      ctx.fillText(`Standing Tier: ${tier.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}  |  Player Level: Level ${player.level}  |  World Reputation: ${player.reputation} REP`, 50, 458);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `team_${discordId}.png` });

      return await interaction.editReply({
        content: `🏏 **${player.name}'s Placement & Team Info:**`,
        files: [attachment],
        components: [row]
      });

    } catch (err) {
      console.error('Error drawing team canvas:', err);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏏 Team & Academy Status: ${player.name}`)
    .setDescription(`Your current team placements, contracts, and league standings.`)
    .setColor('#3498db')
    .setThumbnail(interaction.user.displayAvatarURL())
    .setTimestamp();

  // 1. Academy Details
  embed.addFields({
    name: '🎓 Training Academy',
    value: `**Name:** ${academy.name}\n` +
          `**Coach Quality:** ${academy.coachRating}\n` +
          `**Specialty:** ${academy.specialty}\n` +
          `**Training Focus:** ${academy.trainingBonusText}\n` +
          `**Rating:** ${'⭐'.repeat(academy.rating || 1)}\n` +
          `*Lore:* ${academy.history}`,
    inline: false
  });

  // 2. Club Contract Details
  if (contract) {
    embed.addFields({
      name: '💼 Club Contract',
      value: `**Club Team:** ${contract.club_name}\n` +
            `**Division/Tier:** ${contract.contract_type}\n` +
            `**Match Salary:** ${emojis.coin} ${contract.salary_per_match} / match\n` +
            `**Remaining Term:** ${contract.remaining_seasons} seasons`,
      inline: false
    });
  } else {
    embed.addFields({
      name: '💼 Club Contract',
      value: `*No active professional contract.*\n` +
            `You are playing as an **Academy Player** for **${academy.name}**.\n` +
            `**Stipend:** ${emojis.coin} ${tier.stipend} / match`,
      inline: false
    });
  }

  // 3. Standing standing
  embed.addFields({
    name: '📈 Standing & League Tier',
    value: `**Current Standing:** ${tier.name}\n` +
          `**Reputation:** ${player.reputation} ${emojis.reputation} | **Player Level:** Level ${player.level} ${emojis.form}\n` +
          `*(Unlock higher club contracts by earning Reputation and Leveling up!)*`,
    inline: false
  });

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleSponsors(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name, sponsor, coins, reputation FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  // Get active sponsor info from database
  const activeSponsorName = player.sponsor && player.sponsor !== 'None' ? player.sponsor : null;
  const allSponsors = db.prepare('SELECT * FROM sponsors').all();
  const activeSponsor = allSponsors.find(s => s.name === activeSponsorName);

  // List all sponsors in the game
  const signableSponsors = [];

  // Helper to draw rounded rectangles
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

  let response;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 480);
      const ctx = canvas.getContext('2d');

      // Background
      const mainGrad = ctx.createLinearGradient(0, 0, 800, 480);
      mainGrad.addColorStop(0, '#1c1a0c'); // Deep gold/black metallic
      mainGrad.addColorStop(1, '#070502');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 800, 480);

      // Grid
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 480);
        ctx.stroke();
      }
      for (let i = 0; i < 480; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }

      // Border
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 460);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 740, 70, 12, 'rgba(17, 24, 39, 0.85)', '#f1c40f', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👟 SPONSORSHIP & ENDORSEMENT CENTRE', 400, 60);
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${player.name.toUpperCase()} • WORLD REP: ${player.reputation} POINTS`, 400, 82);

      // Left Panel: Active Sponsor
      drawRoundRect(ctx, 30, 120, 350, 320, 16, 'rgba(17, 24, 39, 0.85)', '#f1c40f', 2);
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('👟 ACTIVE SPONSOR DEAL', 50, 150);

      if (activeSponsor) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(activeSponsor.name.toUpperCase(), 50, 185);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 12px sans-serif';
        
        const wrapText = (text, x, y, lineW, lineH) => {
          const words = text.split(' ');
          let line = '';
          let currentY = y;
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > lineW && n > 0) {
              ctx.fillText(line, x, currentY);
              line = words[n] + ' ';
              currentY += lineH;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, currentY);
          return currentY;
        };

        const lastY = wrapText(activeSponsor.description, 50, 215, 310, 18);

        // Draw Perks
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('ACTIVE PERKS & BONUS:', 50, lastY + 35);

        ctx.fillStyle = '#f1c40f';
        ctx.font = '12px sans-serif';
        ctx.fillText(`• Sign-on Bonus: +${activeSponsor.bonus_coins} Coins`, 50, lastY + 55);
        if (activeSponsor.perk_item_id) {
          ctx.fillStyle = '#2ecc71';
          ctx.fillText(`• Gear: ${activeSponsor.perk_item_name} (${activeSponsor.perk_item_type})`, 50, lastY + 72);
        }
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = 'italic 14px sans-serif';
        ctx.fillText('No active brand sponsor deal.', 50, 190);
        ctx.fillText('You are currently self-funded.', 50, 212);
        ctx.fillText('Sign a sponsorship from the available list.', 50, 234);
      }

      // Right Panel: Available Endorsement Deals
      drawRoundRect(ctx, 400, 120, 370, 320, 16, 'rgba(17, 24, 39, 0.85)', '#f1c40f', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🎯 AVAILABLE ENDORSEMENT DEALS', 420, 150);

      allSponsors.forEach((sp, index) => {
        const isCurrent = activeSponsor && activeSponsor.id === sp.id;
        const canSign = player.reputation >= sp.reputation_required;
        
        const y = 175 + index * 48;
        drawRoundRect(ctx, 420, y, 330, 40, 8, 'rgba(30, 41, 59, 0.4)');

        let statusText = '';
        let statusColor = '#ffffff';
        if (isCurrent) {
          statusText = 'Active';
          statusColor = '#2ecc71';
          // do not add to signable
        } else if (canSign) {
          statusText = 'Eligible';
          statusColor = '#f1c40f';
          signableSponsors.push(sp);
        } else {
          statusText = `Requires ${sp.reputation_required} Rep`;
          statusColor = '#f43f5e';
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(sp.name, 430, y + 17);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText(`Bonus: +${sp.bonus_coins} Coins`, 430, y + 31);

        ctx.fillStyle = statusColor;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(statusText, 740, y + 24);
        ctx.textAlign = 'left';
      });

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `sponsors_${discordId}.png` });

      const row = new ActionRowBuilder();
      if (signableSponsors.length > 0) {
        const selectOptions = signableSponsors.map(sp => ({
          label: `Sign with ${sp.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
          description: `Bonus: 🪙 ${sp.bonus_coins} | Gear: ${sp.perk_item_name || 'None'}`.substring(0, 100),
          value: sp.id
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`sign_sponsor_${discordId}`)
          .setPlaceholder('Sign a new sponsorship contract...')
          .addOptions(selectOptions);

        row.addComponents(selectMenu);
      }

      const responseOpts = {
        content: `👟 **Sponsorship Deal Centre:**`,
        files: [attachment]
      };
      if (row.components.length > 0) responseOpts.components = [row];

      response = await interaction.editReply(responseOpts);

    } catch (err) {
      console.error('Error drawing sponsors canvas:', err);
    }
  }

  if (!response) {
    // Fallback
    const embed = new EmbedBuilder()
      .setTitle(`👟 Sponsorship Centre: ${player.name}`)
      .setColor('#f1c40f')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    if (activeSponsor) {
      let perkText = `• **Sign-on Bonus:** +${emojis.coin} ${activeSponsor.bonus_coins} Coins\n`;
      if (activeSponsor.perk_item_id) {
        let bonuses = {};
        try { bonuses = JSON.parse(activeSponsor.perk_item_bonuses_json || '{}'); } catch(e){}
        const bonusStr = Object.entries(bonuses).map(([k,v]) => `+${v} ${k}`).join(', ');
        perkText += `• **Endorsement Gear:** *${activeSponsor.perk_item_name}* (${activeSponsor.perk_item_type}) [${bonusStr}]`;
      }
      embed.addFields({
        name: '👟 Active Sponsor',
        value: `**Sponsor:** ${activeSponsor.name}\n**Description:** *${activeSponsor.description}*\n\n**Perks Active:**\n${perkText}`,
        inline: false
      });
    } else {
      embed.addFields({
        name: '👟 Active Sponsor',
        value: `*No active sponsor. You are currently self-funded.*`,
        inline: false
      });
    }

    let sponsorListText = '';
    allSponsors.forEach(sp => {
      const isCurrent = activeSponsor && activeSponsor.id === sp.id;
      const canSign = player.reputation >= sp.reputation_required;
      const status = isCurrent ? '🟢 *Active Sponsor*' : canSign ? '✅ *Eligible*' : `🔒 *Locked (Requires ${sp.reputation_required} Rep)*`;
      
      let perkStr = `+${emojis.coin} ${sp.bonus_coins}`;
      if (sp.perk_item_id) {
        perkStr += ` & ${sp.perk_item_name}`;
      }

      sponsorListText += `• **${sp.name}** (${status})\n` +
                         `  └ *Description:* ${sp.description}\n` +
                         `  └ *Reward:* ${perkStr}\n\n`;

      if (canSign && !isCurrent) {
        signableSponsors.push(sp);
      }
    });

    embed.addFields({
      name: '🎯 Available Endorsement Deals',
      value: sponsorListText || 'No sponsors configured in the game database.',
      inline: false
    });

    const row = new ActionRowBuilder();
    if (signableSponsors.length > 0) {
      const selectOptions = signableSponsors.map(sp => ({
        label: `Sign with ${sp.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
        description: `Bonus: 🪙 ${sp.bonus_coins} | Gear: ${sp.perk_item_name || 'None'}`.substring(0, 100),
        value: sp.id
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`sign_sponsor_${discordId}`)
        .setPlaceholder('Sign a new sponsorship contract...')
        .addOptions(selectOptions);

      row.addComponents(selectMenu);
    }

    const responseOpts = { embeds: [embed] };
    if (row.components.length > 0) {
      responseOpts.components = [row];
    }

    response = await interaction.editReply(responseOpts);
  }

  if (signableSponsors.length > 0) {
    const filter = i => i.customId === `sign_sponsor_${discordId}` && i.user.id === discordId;
    const collector = response.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
      collector.stop();
      const selectedId = i.values[0];
      const sponsor = allSponsors.find(s => s.id === selectedId);

      if (!sponsor) {
        return i.reply({ content: '❌ Sponsor not found.', flags: ['Ephemeral'] });
      }

      // Update player's active sponsor name
      db.prepare('UPDATE players SET sponsor = ?, coins = coins + ? WHERE discord_id = ?').run(sponsor.name, sponsor.bonus_coins, discordId);

      // Insert perk item if exists
      let itemMsg = '';
      if (sponsor.perk_item_id) {
        db.prepare(`
          INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
          VALUES (?, ?, ?, ?, 'Common', ?, 0)
        `).run(discordId, sponsor.perk_item_id, sponsor.perk_item_name, sponsor.perk_item_type, sponsor.perk_item_bonuses_json || '{}');
        itemMsg = `\n🎁 **Bonus Gear Delivered:** *${sponsor.perk_item_name}* has been added to your \`/inventory\`!`;
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('✍️ Endorsement Contract Signed!')
        .setDescription(`Congratulations! You have signed a brand-new sponsorship contract with **${sponsor.name}**!\n\n` +
                       `💰 **Sign-on Bonus:** +${emojis.coin} ${sponsor.bonus_coins} Coins has been credited to your wallet.` +
                       `${itemMsg}`)
        .setColor('#2ecc71')
        .setTimestamp();

      await i.update({
        embeds: [successEmbed],
        components: [],
        files: [],
        attachments: []
      });
    });
  }
}

