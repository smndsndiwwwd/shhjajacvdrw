import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import db from '../database/db.js';
import { academies } from '../game/academies.js';
import { skillTree } from '../game/skills.js';
import { addXP, updateAndGetEnergy, consumeEnergy } from '../game/utils.js';
import { emojis } from '../game/emojis.js';
import { getPlayerSettings } from '../game/settings.js';
import { executeTrainingDrill } from '../game/trainingProgress.js';

// Load canvas library safely
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back.');
}// Helper to draw rounded rectangles
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

// Helper to wrap text into lines
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function handleTrain(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  // Energy check & update
  const currentEnergy = updateAndGetEnergy(db, discordId);
  const trainingCostEnergy = 25;
  
  if (currentEnergy < trainingCostEnergy) {
    return interaction.reply({
      content: `❌ You are too exhausted to train! Current Energy: **${currentEnergy}/100 ${emojis.energy}** (Requires ${trainingCostEnergy} ${emojis.energy}). Energy recovers naturally at 5 per hour.`,
      flags: ['Ephemeral']
    });
  }

  if (player.training_tokens <= 0) {
    return interaction.reply({
      content: `❌ You do not have any **Training Tickets** (${emojis.token}) left! Earn tickets by playing matches, tournaments, or completing career chapters.`,
      flags: ['Ephemeral']
    });
  }

  // Defer to prevent Gateway/database lag timeouts
  await interaction.deferReply();

  const regime = interaction.options.getString('regime');

  // Show training simulation
  await interaction.editReply({
    content: `⏳ **${player.name}** is heading to the facilities... setting up the drills... 🏃`
  });

  const academy = academies[player.academy_id] || { bonuses: {} };
  const bonuses = academy.bonuses || {};
  const xpMultiplier = bonuses[regime] || 1.0;

  let drillRes;
  try {
    drillRes = executeTrainingDrill(db, player, regime, xpMultiplier);
  } catch (err) {
    return interaction.editReply({ content: `⚠️ ${err.message}` });
  }

  // Deduct resources after verifying daily limit
  db.prepare('UPDATE players SET training_tokens = training_tokens - 1 WHERE discord_id = ?').run(discordId);
  consumeEnergy(db, discordId, trainingCostEnergy);

  const attrLabels = {
    power: '💥 Power',
    timing: '🎯 Timing',
    technique: '🎓 Technique',
    defense: '🛡️ Defense',
    swing: '🔄 Swing',
    seam: '⚡ Seam',
    spin_bowling: '🌀 Spin Bowling',
    accuracy: '🎯 Accuracy',
    variations: '🎭 Variations',
    fitness: '❤️ Fitness',
    stamina: '🔋 Stamina',
    fielding: '👐 Fielding',
    reflex: '⚡ Reflexes',
    throw_accuracy: '🎯 Throw Accuracy',
    running: '🏃 Running Speed'
  };

  const attrGains = drillRes.gains.map(g => `${attrLabels[g.key] || g.key}: **${g.from}** ➔ **${g.to}** (+${g.delta})`);
  const filledBlocks = Math.round(drillRes.newProgress / 10);
  const progressBar = `${'█'.repeat(filledBlocks)}${'░'.repeat(10 - filledBlocks)} ${drillRes.newProgress}%`;
  const baseXP = 50;
  const xpReward = Math.round(baseXP * xpMultiplier);

  // Add XP
  const xpResult = addXP(db, discordId, xpReward);

  // Send completed Embed
  setTimeout(async () => {
    const embed = new EmbedBuilder()
      .setTitle(`🏋️ Session Completed: ${regime.toUpperCase()}`)
      .setDescription(
        attrGains.length > 0
          ? `💥 Breakthrough unlocked! You filled the drill bar to 100% and earned an attribute upgrade.`
          : drillRes.capReached
            ? `🔒 Drill complete! Attributes for this discipline hit your Level Cap (${drillRes.attrCap}). Level up to unlock higher gains!`
            : `💪 Solid workout! Progress added toward your next attribute breakthrough.`
      )
      .setColor(attrGains.length > 0 ? '#2ecc71' : '#38bdf8')
      .addFields(
        { name: '✨ Rewards Earned', value: `+${xpReward} XP ${xpMultiplier > 1 ? `(⭐ Academy Buff)` : ''}`, inline: true },
        { name: '📊 Drill Bar & Cap', value: `[${progressBar}] (+${drillRes.gainPct}%)\nSessions Today: **${drillRes.dailyUsed}/${drillRes.dailyLimit}** • Cap: **${drillRes.attrCap}**`, inline: true },
        { name: '📈 Attribute Breakthroughs', value: attrGains.length > 0 ? attrGains.join('\n') : 'Keep filling the Drill Bar to reach 100%!', inline: false },
        { name: '⚡ Resources Used', value: `Cost: 25 Energy & 1 Ticket\nRemaining Energy: **${currentEnergy - trainingCostEnergy}/100 ${emojis.energy}**\nRemaining Tickets: **${player.training_tokens - 1} ${emojis.token}**`, inline: false }
      );

    if (xpResult.levelUp) {
      embed.addFields({
        name: '🎉 LEVEL UP!',
        value: `Congratulations! You reached **Level ${xpResult.newLevel}**! You gained **+1 Skill Point** (Use \`/skills\` to unlock perks) and a core attribute boost!`
      });
    }

    if (xpResult.achievementsUnlocked.length > 0) {
      embed.addFields({
        name: '🏆 Achievements Unlocked!',
        value: xpResult.achievementsUnlocked.join(', ')
      });
    }

    await interaction.editReply({
      content: '',
      embeds: [embed]
    });
  }, 1200);
}

export async function handleSkills(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name, skill_points FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  if (!interaction.deferred && !interaction.replied) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await interaction.deferUpdate().catch(() => {});
    } else {
      await interaction.deferReply().catch(() => {});
    }
  }

  let subcommand = 'view';
  try {
    if (interaction.options?.getSubcommand) {
      subcommand = interaction.options.getSubcommand(false) || 'view';
    }
  } catch (e) {
    subcommand = 'view';
  }

  if (subcommand === 'view') {
    const unlocked = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`btn_profile_${discordId}`).setLabel('⬅️ Back to Profile').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_skill_unlock_modal_${discordId}`).setLabel('🔓 Unlock Node').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`btn_stats_${discordId}`).setLabel('Lifetime Stats').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`btn_chapters_${discordId}`).setLabel('Play Campaign').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`btn_franchise_${discordId}`).setLabel('🏆 Franchise').setStyle(ButtonStyle.Primary)
    );

    let response;

    const userSettings = getPlayerSettings(interaction.user.id);
    const preferGraphic = userSettings.display_mode !== 'embed';

    if (canvasLib && preferGraphic) {
      try {
        const { createCanvas } = canvasLib;
        const canvas = createCanvas(1050, 840);
        const ctx = canvas.getContext('2d');

        // Background
        const mainGrad = ctx.createLinearGradient(0, 0, 1050, 840);
        mainGrad.addColorStop(0, '#0c0817');
        mainGrad.addColorStop(1, '#040208');
        ctx.fillStyle = mainGrad;
        ctx.fillRect(0, 0, 1050, 840);

        // Subtle cybernetic grid
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.10)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 1050; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 840);
          ctx.stroke();
        }
        for (let i = 0; i < 840; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(1050, i);
          ctx.stroke();
        }

        // Outer border
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, 1030, 820);

        // Header Banner
        drawRoundRect(ctx, 30, 24, 990, 78, 12, 'rgba(23, 15, 38, 0.95)', '#8b5cf6', 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PLAYER SKILLS DEVELOPMENT TREE', 525, 56);
        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`CURRENT BALANCE: ${player.skill_points} SP  |  UNLOCK NODES VIA: /skills unlock [skill_key]`, 525, 80);

        // Branches configuration
        const branches = {
          'Batting': { col: 0, row: 0, title: 'BATTING BRANCH', color: '#38bdf8' },
          'Bowling': { col: 1, row: 0, title: 'BOWLING BRANCH', color: '#34d399' },
          'Fitness': { col: 2, row: 0, title: 'FITNESS BRANCH', color: '#f43f5e' },
          'Leadership': { col: 0, row: 1, title: 'LEADERSHIP BRANCH', color: '#c084fc' },
          'Mental Strength': { col: 1, row: 1, title: 'MENTAL STRENGTH', color: '#fb923c' },
          'Fielding': { col: 2, row: 1, title: 'FIELDING BRANCH', color: '#2dd4bf' }
        };

        const drawSkillRow = (x, y, w, skill, isUnlocked, isEligible) => {
          const cardH = 65;
          const cardBg = isUnlocked 
            ? 'rgba(6, 78, 59, 0.70)' 
            : isEligible 
              ? 'rgba(30, 41, 59, 0.95)' 
              : 'rgba(15, 23, 42, 0.88)';
          const cardBorder = isUnlocked 
            ? '#10b981' 
            : isEligible 
              ? '#38bdf8' 
              : 'rgba(71, 85, 105, 0.7)';

          drawRoundRect(ctx, x, y, w, cardH, 8, cardBg, cardBorder, 1.5);

          // Clean skill name
          const cleanName = skill.name.replace(/^[^\w\s]+/, '').trim();
          
          // Status Icon & Title
          ctx.textAlign = 'left';
          ctx.font = 'bold 13px sans-serif';
          
          const bulletColor = isUnlocked ? '#34d399' : isEligible ? '#38bdf8' : '#64748b';
          ctx.fillStyle = bulletColor;
          ctx.beginPath();
          ctx.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isUnlocked ? '#34d399' : isEligible ? '#ffffff' : '#cbd5e1';
          ctx.fillText(cleanName, x + 26, y + 20);

          // Cost / Status Badge (top right)
          if (isUnlocked) {
            drawRoundRect(ctx, x + w - 78, y + 8, 70, 18, 4, '#064e3b', '#10b981', 1);
            ctx.fillStyle = '#6ee7b7';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('UNLOCKED', x + w - 43, y + 21);
          } else if (isEligible) {
            drawRoundRect(ctx, x + w - 68, y + 8, 60, 18, 4, '#78350f', '#f59e0b', 1);
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${skill.cost} SP`, x + w - 38, y + 21);
          } else {
            drawRoundRect(ctx, x + w - 68, y + 8, 60, 18, 4, '#1e293b', '#475569', 1);
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${skill.cost} SP`, x + w - 38, y + 21);
          }

          // Line 2: Key & Requirements Tag
          ctx.textAlign = 'left';
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = isUnlocked ? '#a7f3d0' : isEligible ? '#38bdf8' : '#94a3b8';
          const reqText = skill.requires ? ` [Req: ${skill.requires}]` : '';
          ctx.fillText(`key: ${skill.key}${reqText}`, x + 12, y + 36);

          // Line 3 & 4: Description (wrapped, high-contrast, fully readable)
          ctx.fillStyle = isUnlocked ? '#e2e8f0' : isEligible ? '#f8fafc' : '#94a3b8';
          ctx.font = '10px sans-serif';
          const lines = wrapText(ctx, skill.description, w - 24);
          if (lines[0]) ctx.fillText(lines[0], x + 12, y + 49);
          if (lines[1]) ctx.fillText(lines[1], x + 12, y + 60);
        };

        // Group skills by branch
        const grouped = {};
        for (const skill of Object.values(skillTree)) {
          if (!grouped[skill.branch]) grouped[skill.branch] = [];
          grouped[skill.branch].push(skill);
        }

        for (const [branchName, list] of Object.entries(grouped)) {
          const branchInfo = branches[branchName];
          if (!branchInfo) continue;

          const bx = 30 + branchInfo.col * 336;
          const by = 116 + branchInfo.row * 346;

          // Branch container
          drawRoundRect(ctx, bx, by, 318, 332, 14, 'rgba(17, 24, 39, 0.92)', branchInfo.color, 2);

          ctx.fillStyle = branchInfo.color;
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(branchInfo.title, bx + 16, by + 26);

          // Subtle divider under title
          ctx.strokeStyle = branchInfo.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(bx + 16, by + 32);
          ctx.lineTo(bx + 302, by + 32);
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          list.forEach((skill, idx) => {
            const sy = by + 40 + idx * 71;
            const isUnlocked = unlocked.includes(skill.key);
            const isEligible = !skill.requires || unlocked.includes(skill.requires);
            drawSkillRow(bx + 14, sy, 290, skill, isUnlocked, isEligible);
          });
        }

        const buffer = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer, { name: `skills_${discordId}.png` });

        response = await interaction.editReply({
          content: `🌟 **${player.name}'s Skill Tree:**`,
          files: [attachment],
          attachments: [],
          components: [row]
        });

      } catch (err) {
        console.error('Error drawing skills canvas:', err);
      }
    }

    if (!response) {
      const embed = new EmbedBuilder()
        .setTitle(`🌟 Skill Tree: ${player.name}`)
        .setDescription(`Current Skill Points: **${player.skill_points} ${emojis.sp}**\nUnlock skills to get passive bonuses in the batting engine and career matches.`)
        .setColor('#f1c40f')
        .setTimestamp();

      const branches = {};
      for (const skill of Object.values(skillTree)) {
        if (!branches[skill.branch]) branches[skill.branch] = [];
        branches[skill.branch].push(skill);
      }

      for (const [branchName, list] of Object.entries(branches)) {
        const skillLines = list.map(skill => {
          const isUnlocked = unlocked.includes(skill.key);
          const statusEmoji = isUnlocked ? '✅' : '🔒';
          const reqText = skill.requires ? `*(Requires: ${skillTree[skill.requires].name})*` : '';
          return `${statusEmoji} **${skill.name}** (\`${skill.key}\`) - Cost: ${skill.cost} SP\n   *Effect:* ${skill.description} ${reqText}`;
        }).join('\n');

        embed.addFields({ name: `🌳 ${branchName} Branch`, value: skillLines });
      }

      response = await interaction.editReply({
        content: '',
        embeds: [embed],
        files: [],
        attachments: [],
        components: [row]
      });
    }

  } else if (subcommand === 'unlock') {
    let skillKey = null;
    try {
      skillKey = interaction.options?.getString?.('skill_key') || interaction.options?.getString?.('unlock');
    } catch (e) {
      skillKey = null;
    }
    skillKey = (skillKey || '').toLowerCase().trim();

    if (!skillKey) {
      const errEmbed = new EmbedBuilder().setDescription(`❌ Please provide a valid skill key to unlock. Check \`/skills view\` or click Skill Tree to view keys.`).setColor('#e74c3c');
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const skill = skillTree[skillKey];

    if (!skill) {
      const errEmbed = new EmbedBuilder().setDescription(`❌ Skill key \`${skillKey}\` does not exist. Check \`/skills view\` for valid skill keys.`).setColor('#e74c3c');
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const alreadyUnlocked = db.prepare('SELECT skill_key FROM skills WHERE player_id = ? AND skill_key = ?').get(discordId, skillKey);
    if (alreadyUnlocked) {
      const errEmbed = new EmbedBuilder().setDescription(`❌ You have already unlocked **${skill.name}**!`).setColor('#e74c3c');
      return interaction.editReply({ embeds: [errEmbed] });
    }

    if (player.skill_points < skill.cost) {
      const errEmbed = new EmbedBuilder().setDescription(`❌ You do not have enough Skill Points! **${skill.name}** costs **${skill.cost} SP**, but you only have **${player.skill_points} SP**. Earn levels to get more points.`).setColor('#e74c3c');
      return interaction.editReply({ embeds: [errEmbed] });
    }

    // Check prerequisites
    if (skill.requires) {
      const reqUnlocked = db.prepare('SELECT skill_key FROM skills WHERE player_id = ? AND skill_key = ?').get(discordId, skill.requires);
      if (!reqUnlocked) {
        const errEmbed = new EmbedBuilder().setDescription(`❌ Prerequisites not met! You must unlock **${skillTree[skill.requires].name}** first.`).setColor('#e74c3c');
        return interaction.editReply({ embeds: [errEmbed] });
      }
    }

    // Unlock
    db.prepare('INSERT INTO skills (player_id, skill_key) VALUES (?, ?)').run(discordId, skillKey);
    db.prepare('UPDATE players SET skill_points = skill_points - ? WHERE discord_id = ?').run(skill.cost, discordId);

    const embed = new EmbedBuilder()
      .setTitle('🌟 Skill Unlocked!')
      .setDescription(`Congratulations! You have unlocked **${skill.name}** in the **${skill.branch}** branch!\n\n**Ability effect:** ${skill.description}`)
      .setColor('#2ecc71')
      .setFooter({ text: `Remaining Skill Points: ${player.skill_points - skill.cost} SP` })
      .setTimestamp();

    const unlockRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`btn_skills_${discordId}`).setLabel('🌟 View Skill Tree').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`btn_profile_${discordId}`).setLabel('🏏 Back to Profile').setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [unlockRow] });
  }
}


export async function handleAcademy(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  // Defer reply since canvas generation takes time
  await interaction.deferReply();

  let academyId = player.academy_id;
  if (academyId === 'pending') {
    academyId = Object.keys(academies)[0];
    db.prepare('UPDATE players SET academy_id = ? WHERE discord_id = ?').run(academyId, discordId);
  }

  const currentAcademy = academies[academyId];

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

  // Switch Academy Button
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_academy_transfer_${discordId}`)
      .setLabel('Request Academy Transfer (🪙 200)')
      .setStyle(ButtonStyle.Primary)
  );

  let response;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 450);
      const ctx = canvas.getContext('2d');

      // Background solid fill (highly optimized)
      ctx.fillStyle = '#051224';
      ctx.fillRect(0, 0, 800, 450);

      // Grid (batched paths to save CPU draw calls)
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 800; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 450);
      }
      for (let i = 0; i < 450; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
      }
      ctx.stroke();

      // Border
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 430);

      // Left Panel - Logo & Stars
      drawRoundRect(ctx, 30, 30, 240, 390, 16, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎓 ACADEMY', 150, 80);

      // Stars representation
      ctx.fillStyle = '#f1c40f';
      ctx.font = '32px sans-serif';
      const stars = '★'.repeat(currentAcademy.rating) + '☆'.repeat(5 - currentAcademy.rating);
      ctx.fillText(stars, 150, 150);

      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(currentAcademy.reputation.toUpperCase(), 150, 190);

      // Coach Rating capsule
      drawRoundRect(ctx, 60, 230, 180, 50, 8, 'rgba(52, 152, 219, 0.1)');
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('COACH RATING', 150, 248);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(currentAcademy.coachRating, 150, 270);

      // specialty
      drawRoundRect(ctx, 60, 300, 180, 50, 8, 'rgba(52, 152, 219, 0.1)');
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('ACADEMY SPECIALTY', 150, 318);
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(currentAcademy.specialty, 150, 340);

      // Right Panel - Detailed Info
      drawRoundRect(ctx, 290, 30, 480, 390, 16, 'rgba(17, 24, 39, 0.85)', '#3498db', 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(currentAcademy.name.toUpperCase(), 320, 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 12px sans-serif';
      // Word wrap for history
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

      const finalY = wrapText(currentAcademy.history, 320, 100, 420, 18);

      const enrolledCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(academyId)?.count || 0;
      const intCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ? AND current_chapter >= 39').get(academyId)?.count || 0;

      const drawAcademyStat = (y, label, val, valColor = '#ffffff') => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(label, 320, y);
        ctx.fillStyle = valColor;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, 740, y);
        ctx.textAlign = 'left';
      };

      // Draw dividing line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(320, 230);
      ctx.lineTo(740, 230);
      ctx.stroke();

      drawAcademyStat(250, '🔥 Training Focus Bonus', currentAcademy.trainingBonusText, '#2ecc71');
      drawAcademyStat(285, '📈 Professional Success Rate', currentAcademy.successRate);
      drawAcademyStat(320, '👥 Enrolled Active Players', `${enrolledCount}/40`, enrolledCount >= 40 ? '#e74c3c' : '#ffffff');
      drawAcademyStat(355, '🌍 Active International Players', String(intCount), '#f1c40f');
      drawAcademyStat(390, '🎓 Historical Graduates (Dom/Int)', `${currentAcademy.graduatesDomestic} / ${currentAcademy.graduatesInternational}`);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `academy_${academyId}.png` });

      response = await interaction.editReply({
        content: `🎓 **Welcome to ${currentAcademy.name}:**`,
        files: [attachment],
        components: [row]
      });

    } catch (err) {
      console.error('Error drawing academy canvas:', err);
    }
  }

  if (!response) {
      const enrolledCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(academyId)?.count || 0;
      const intCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ? AND current_chapter >= 39').get(academyId)?.count || 0;
      // Fallback Text Embed
      const embed = new EmbedBuilder()
        .setTitle(`🎓 Academy Hub: ${currentAcademy.name}`)
        .setDescription(`*Current Reputation:* ${currentAcademy.reputation}\n\n**History:** ${currentAcademy.history}`)
        .setColor('#3498db')
        .addFields(
          { name: '🔥 Training Focus', value: currentAcademy.trainingBonusText, inline: true },
          { name: '⭐ Star Rating', value: '⭐'.repeat(currentAcademy.rating), inline: true },
          { name: '🛡️ Coach Quality', value: currentAcademy.coachRating, inline: true },
          { name: '📈 Success Rate', value: currentAcademy.successRate, inline: true },
          { name: '👥 Players Enrolled', value: `${enrolledCount}/40`, inline: true },
          { name: '🌍 International Players', value: String(intCount), inline: true },
          { name: '🎓 Graduates (Dom/Int)', value: `${currentAcademy.graduatesDomestic} / ${currentAcademy.graduatesInternational}`, inline: true }
        )
      .setFooter({ text: `You can transfer to a different academy once every season for a transfer fee of ${emojis.coin} 200.` })
      .setTimestamp();

    response = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  }

  const filter = i => i.customId === `btn_academy_transfer_${discordId}` && i.user.id === discordId;
  const collector = response.createMessageComponentCollector({ filter, time: 20000 });

  collector.on('collect', async i => {
    if (player.coins < 200) {
      await i.reply({
        content: `❌ You do not have enough coins! A transfer costs **${emojis.coin} 200**, but you only have **${emojis.coin} ${player.coins}**.`,
        flags: ['Ephemeral']
      });
      return;
    }

    // Academy selection dropdown to switch
    const switchEmbed = new EmbedBuilder()
      .setTitle('🔄 Academy Transfer Portal')
      .setDescription(`Select the new academy you wish to join. Your transfer fee of **${emojis.coin} 200** will be deducted upon selection.`)
      .setColor('#f39c12');

    const options = Object.values(academies)
      .filter(a => a.id !== player.academy_id)
      .map(a => {
        const enrolled = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(a.id)?.count || 0;
        return {
          label: `${a.name.substring(0, 70)} (${enrolled}/40)`,
          description: `${a.specialty.substring(0, 80)}${enrolled >= 40 ? ' - FULL' : ''}`,
          value: a.id
        };
      });

    const dropdown = new StringSelectMenuBuilder()
      .setCustomId(`select_transfer_${discordId}`)
      .setPlaceholder('Select new academy...')
      .addOptions(options);

    const switchRow = new ActionRowBuilder().addComponents(dropdown);

    await i.update({
      embeds: [switchEmbed],
      components: [switchRow],
      files: [],
      attachments: []
    });

    const dropdownFilter = idx => idx.customId === `select_transfer_${discordId}` && idx.user.id === discordId;
    const dropdownCollector = response.createMessageComponentCollector({ filter: dropdownFilter, time: 20000 });

    dropdownCollector.on('collect', async idx => {
      const newAcadId = idx.values[0];
      const newAcad = academies[newAcadId];

      // Enforce the 40-player limit on transfer request
      const enrolledCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE academy_id = ?').get(newAcadId).count;
      if (enrolledCount >= 40) {
        return idx.reply({
          content: `❌ The **${newAcad.name}** is currently full (**40/40 players**)! Transfer request denied. Please choose another academy.`,
          flags: ['Ephemeral']
        });
      }

      // Execute transfer
      db.prepare('UPDATE players SET academy_id = ?, coins = coins - 200 WHERE discord_id = ?').run(newAcadId, discordId);

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Academy Transfer Approved!')
        .setDescription(`You have successfully transferred to **${newAcad.name}**!\n\n**New Training Focus:** ${newAcad.trainingBonusText}\n**Fee Paid:** ${emojis.coin} 200`)
        .setColor('#2ecc71')
        .setTimestamp();

      await idx.update({
        embeds: [successEmbed],
        components: []
      });
      dropdownCollector.stop();
      collector.stop();
    });
  });
}
