import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import db from '../database/db.js';
import { getEquipmentBonuses } from '../game/utils.js';
import { emojis } from '../game/emojis.js';
import { getPlayerSettings } from '../game/settings.js';
import { getPlayerModeStatsBreakdown } from '../game/statsHelper.js';

// Load canvas library safely
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back to text stats.');
}

export async function handleStats(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);

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

  const stats = db.prepare('SELECT * FROM stats WHERE player_id = ?').get(discordId);
  
  if (!stats) {
    const errorEmbed = new EmbedBuilder()
      .setDescription('❌ No stats found for your player.')
      .setColor('#e74c3c');
    return interaction.editReply({ embeds: [errorEmbed] });
  }

  // Batting & bowling calculations with accurate Not Outs & innings filtering
  const breakdown = getPlayerModeStatsBreakdown(db, discordId);
  const ov = breakdown.overall;
  const battingAvg = ov.battingAvg;
  const strikeRate = ov.strikeRate;
  const oversText = ov.overs.toFixed(1);
  const econ = ov.economy;
  const bowlingAvg = ov.bowlingAvg;
  const bestBowlingText = ov.bestBowling;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`btn_profile_${discordId}`).setLabel('⬅️ Back to Profile').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_achievements_${discordId}`).setLabel('🏅 Achievements').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`btn_skills_${discordId}`).setLabel('Skill Tree').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`btn_chapters_${discordId}`).setLabel('Play Campaign').setStyle(ButtonStyle.Success)
  );

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext('2d');

      // Helper function to draw rounded rectangles
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
      ctx.fillStyle = '#05080f';
      ctx.fillRect(0, 0, 800, 600);

      // Grid (batched paths to save CPU draw calls)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 800; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 600);
      }
      for (let i = 0; i < 600; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
      }
      ctx.stroke();

      // Border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 580);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 740, 70, 12, 'rgba(17, 24, 39, 0.85)', '#f59e0b', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`CAREER LIFETIME STATISTICS`, 400, 72);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(player.name.toUpperCase(), 400, 92);

      const drawStatLine = (x, y, w, label, val) => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText(label, x, y);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, x + w, y);
        ctx.textAlign = 'left';
      };

      // 1. Batting Record
      drawRoundRect(ctx, 30, 120, 350, 430, 16, 'rgba(17, 24, 39, 0.85)', '#3b82f6', 2);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('// BATTING RECORD', 50, 150);

      drawStatLine(50, 185, 310, 'Matches / Innings', `${ov.matches} / ${ov.innings} (${ov.notOuts} NO)`);
      drawStatLine(50, 220, 310, 'Total Runs Scored', `${ov.runs} (HS ${ov.highScoreText})`);
      drawStatLine(50, 255, 310, 'Balls Faced', String(stats.balls));
      drawStatLine(50, 290, 310, 'Batting Average', battingAvg);
      drawStatLine(50, 325, 310, 'Strike Rate', `${strikeRate}%`);
      drawStatLine(50, 360, 310, 'Boundaries (Fours/Sixes)', `${stats.fours} x4 / ${stats.sixes} x6`);
      drawStatLine(50, 395, 310, 'Half Centuries (50s)', String(stats.fifties));
      drawStatLine(50, 430, 310, 'Centuries (100s)', String(stats.hundreds));
      drawStatLine(50, 465, 310, 'Ducks (0 runs)', String(stats.ducks));

      // 2. Bowling & Fielding Record
      drawRoundRect(ctx, 400, 120, 370, 430, 16, 'rgba(17, 24, 39, 0.85)', '#10b981', 2);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('// BOWLING RECORD', 420, 150);

      drawStatLine(420, 185, 330, 'Wickets Taken', String(stats.wickets));
      drawStatLine(420, 220, 330, 'Overs Bowled', oversText);
      drawStatLine(420, 255, 330, 'Runs Conceded', String(stats.runs_conceded));
      drawStatLine(420, 290, 330, 'Economy Rate', econ);
      drawStatLine(420, 325, 330, 'Bowling Average', bowlingAvg);
      drawStatLine(420, 360, 330, 'Best Bowling Figures', bestBowlingText);

      // Dividing line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(420, 390);
      ctx.lineTo(750, 390);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('// FIELDING & PLAYMAKING', 420, 420);

      drawStatLine(420, 455, 330, 'Catches Taken', String(stats.catches));
      drawStatLine(420, 490, 330, 'Run Outs Triggered', String(stats.run_outs));
      drawStatLine(420, 525, 330, 'Stumpings Completed', String(stats.stumpings));

      // Footer
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = 'italic 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cricket Ascend Statistics Card • Live Career Updates', 400, 575);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `stats_${discordId}.png` });

      return await interaction.editReply({
        content: `📊 **${player.name}'s Lifetime Stats:**`,
        embeds: [],
        files: [attachment],
        components: [row]
      });
    } catch (error) {
      console.error('Error drawing stats card canvas:', error);
    }
  }

  // Fallback Embed
  const embed = new EmbedBuilder()
    .setTitle(`📊 Lifetime Career Stats: ${player.name}`)
    .setColor('#f39c12')
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      {
        name: '🏏 Batting Record',
        value: `**Matches:** ${ov.matches} | **Inns:** ${ov.innings} (**NO:** ${ov.notOuts})\n**Runs:** ${ov.runs} (HS ${ov.highScoreText})\n**Balls Faced:** ${ov.balls}\n**Average:** ${battingAvg}\n**Strike Rate:** ${strikeRate} ⚡\n**Boundary Count:** ${ov.fours}x4 | ${ov.sixes}x6\n**Milestones:** 50s: ${ov.fifties} | 100s: ${ov.hundreds} | Ducks: ${ov.ducks}`,
        inline: true
      },
      {
        name: '🥎 Bowling Record',
        value: `**Wickets:** ${stats.wickets}\n**Overs Bowled:** ${oversText}\n**Runs Conceded:** ${stats.runs_conceded}\n**Economy:** ${econ}\n**Bowling Average:** ${bowlingAvg}\n**Best Figures:** ${bestBowlingText}`,
        inline: true
      },
      {
        name: '🧤 Fielding & Playmaking',
        value: `**Catches:** ${stats.catches}\n**Run Outs:** ${stats.run_outs}\n**Stumpings:** ${stats.stumpings}`,
        inline: false
      }
    )
    .setTimestamp();

  await interaction.editReply({
    content: '',
    embeds: [embed],
    files: [],
    attachments: [],
    components: [row]
  });
}

export async function handleAttributes(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name, level FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  const attrs = db.prepare('SELECT * FROM attributes WHERE player_id = ?').get(discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);

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

  const userSettings = getPlayerSettings(interaction.user.id);
  const preferGraphic = userSettings.display_mode !== 'embed';

  if (canvasLib && preferGraphic) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(900, 680);
      const ctx = canvas.getContext('2d');

      // Sleek Dark Background solid fill (highly optimized)
      ctx.fillStyle = '#080410';
      ctx.fillRect(0, 0, 900, 680);

      // Subtle cybernetic grid lines (batched paths to save CPU draw calls)
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 900; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 680);
      }
      for (let i = 0; i < 680; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(900, i);
      }
      ctx.stroke();

      // Outer Border
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 880, 660);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 840, 75, 12, 'rgba(17, 24, 39, 0.85)', '#8b5cf6', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ATHLETIC ATTRIBUTES & SPECIALTIES', 450, 62);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${player.name.toUpperCase()} (LEVEL ${player.level}) • SPECIALIST PROFILE`, 450, 85);

      const drawAttributeBar = (x, y, label, key) => {
        const base = attrs[key] || 10;
        const bonus = eqBonuses[key] || 0;

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label.toUpperCase(), x, y);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        if (bonus > 0) {
          ctx.fillText(`${base} (+${bonus})`, x + 250, y);
        } else {
          ctx.fillText(`${base}`, x + 250, y);
        }

        // Draw background bar
        drawRoundRect(ctx, x, y + 8, 250, 8, 4, '#0f172a');
        
        // Draw base fill
        const basePercent = Math.min(100, base) / 100;
        const bonusPercent = Math.min(100 - base, bonus) / 100;

        if (basePercent > 0) {
          drawRoundRect(ctx, x, y + 8, Math.round(250 * basePercent), 8, 4, '#8b5cf6'); // Purple base
        }
        if (bonusPercent > 0) {
          drawRoundRect(ctx, x + Math.round(250 * basePercent), y + 8, Math.round(250 * bonusPercent), 8, 4, '#f59e0b'); // Amber gear bonus
        }
        ctx.textAlign = 'left';
      };

      // 1. Batting Column
      drawRoundRect(ctx, 30, 130, 275, 490, 16, 'rgba(17, 24, 39, 0.85)', '#3b82f6', 2);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BATTING STATS', 45, 165);

      drawAttributeBar(45, 205, 'Power', 'power');
      drawAttributeBar(45, 275, 'Timing', 'timing');
      drawAttributeBar(45, 345, 'Technique', 'technique');
      drawAttributeBar(45, 415, 'Vs Spin', 'spin');
      drawAttributeBar(45, 485, 'Vs Pace', 'pace');
      drawAttributeBar(45, 555, 'Defense', 'defense');

      // 2. Bowling Column
      drawRoundRect(ctx, 312, 130, 275, 490, 16, 'rgba(17, 24, 39, 0.85)', '#10b981', 2);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BOWLING STATS', 327, 165);

      drawAttributeBar(327, 205, 'Swing', 'swing');
      drawAttributeBar(327, 275, 'Seam', 'seam');
      drawAttributeBar(327, 345, 'Spin Style', 'spin_bowling');
      drawAttributeBar(327, 415, 'Accuracy', 'accuracy');
      drawAttributeBar(327, 485, 'Variations', 'variations');
      drawAttributeBar(327, 555, 'Stamina', 'stamina');

      // 3. Athletics Column
      drawRoundRect(ctx, 595, 130, 275, 490, 16, 'rgba(17, 24, 39, 0.85)', '#f43f5e', 2);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ATHLETICS & FIELDING', 610, 165);

      drawAttributeBar(610, 205, 'Fitness', 'fitness');
      drawAttributeBar(610, 275, 'Running Speed', 'running');
      drawAttributeBar(610, 345, 'Fielding Reflex', 'fielding');
      drawAttributeBar(610, 415, 'Hand Reflex', 'reflex');
      drawAttributeBar(610, 485, 'Throw Accuracy', 'throw_accuracy');
      drawAttributeBar(610, 555, 'Mentality', 'mentality');

      // Footer
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = 'italic 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Purple = Base Attributes | Amber = Equipped Gear Bonus', 450, 650);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `attributes_${discordId}.png` });

      return await interaction.editReply({
        content: `📈 **${player.name}'s Core Attributes:**`,
        files: [attachment]
      });

    } catch (err) {
      console.error('Error drawing attributes canvas:', err);
    }
  }

  // Fallback Text Embed
  const formatAttr = (key) => {
    const base = attrs[key] || 10;
    const bonus = eqBonuses[key] || 0;
    return bonus > 0 ? `**${base}** \`(+${bonus})\`` : `**${base}**`;
  };

  const embed = new EmbedBuilder()
    .setTitle(`Attributes of ${player.name}`)
    .setDescription('Base stats increase as you level up and train. Equipment bonuses `(+X)` are added from currently equipped gear.')
    .setColor('#9b59b6')
    .addFields(
      {
        name: '🏏 Batting Attributes',
        value: `💪 Power: ${formatAttr('power')}\n🎯 Timing: ${formatAttr('timing')}\n🎓 Technique: ${formatAttr('technique')}\n🌀 Vs Spin: ${formatAttr('spin')}\n⚡ Vs Pace: ${formatAttr('pace')}\n🛡️ Defense: ${formatAttr('defense')}`,
        inline: true
      },
      {
        name: '🥎 Bowling Attributes',
        value: `🔄 Swing: ${formatAttr('swing')}\n🟢 Seam: ${formatAttr('seam')}\n🌀 Spin Bowling: ${formatAttr('spin_bowling')}\n🎯 Accuracy: ${formatAttr('accuracy')}\n🎭 Variations: ${formatAttr('variations')}\n🔋 Stamina: ${formatAttr('stamina')}`,
        inline: true
      },
      {
        name: '🏃 Athletics & Fielding',
        value: `❤️ Fitness: ${formatAttr('fitness')}\n🏃 Running Speed: ${formatAttr('running')}\n👐 Fielding Reflex: ${formatAttr('fielding')}\n⚡ Hand Reflex: ${formatAttr('reflex')}\n💪 Throw Accuracy: ${formatAttr('throw_accuracy')}\n🧠 Mentality: ${formatAttr('mentality')}`,
        inline: false
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleHistory(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  // Get last 10 matches
  const history = db.prepare('SELECT * FROM match_history WHERE player_id = ? ORDER BY id DESC LIMIT 10').all(discordId);

  if (history.length === 0) {
    return interaction.reply({
      content: '🏏 You have not played any matches yet! Run `/chapters` or `/play` to get started.',
      ephemeral: false
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📜 Match History: ${player.name}`)
    .setDescription('Your last 10 matches in Career Mode:')
    .setColor('#34495e')
    .setTimestamp();

  let desc = '';
  history.forEach((match, index) => {
    const batText = `${match.runs} runs off ${match.balls} balls (${match.fours}x4, ${match.sixes}x6) - ${match.dismissal}`;
    let bowlText = '';
    if (match.overs_bowled > 0) {
      bowlText = ` | Bowled: ${match.overs_bowled.toFixed(1)} ov, ${match.wickets} wkts, ${match.runs_conceded} runs`;
    }
    
    const resultEmoji = match.result === 'Won' ? '✅' : match.result === 'Lost' ? '❌' : '🤝';
    desc += `**${index + 1}.** ${resultEmoji} **vs ${match.opponent}** (${match.match_type})\n   └ ${batText}${bowlText}\n\n`;
  });

  embed.setDescription(desc);
  await interaction.reply({ embeds: [embed] });
}

export async function handleLeaderboard(interaction) {
  const filterType = interaction.options.getString('type');
  
  let query = '';
  let title = '';
  let displayFn = null;

  if (filterType === 'level') {
    query = 'SELECT name, level, xp FROM players ORDER BY level DESC, xp DESC LIMIT 10';
    title = `${emojis.trophy} Global Level Leaderboard`;
    displayFn = (row, rank) => `**#${rank}** \`${row.name}\` - Level **${row.level}** (${row.xp} XP)`;
  } else if (filterType === 'runs') {
    query = 'SELECT p.name, s.runs FROM stats s JOIN players p ON s.player_id = p.discord_id ORDER BY s.runs DESC LIMIT 10';
    title = `${emojis.bat} Global Career Runs Leaderboard`;
    displayFn = (row, rank) => `**#${rank}** \`${row.name}\` - **${row.runs}** Career Runs`;
  } else if (filterType === 'wickets') {
    query = 'SELECT p.name, s.wickets FROM stats s JOIN players p ON s.player_id = p.discord_id ORDER BY s.wickets DESC LIMIT 10';
    title = `${emojis.wicket} Global Career Wickets Leaderboard`;
    displayFn = (row, rank) => `**#${rank}** \`${row.name}\` - **${row.wickets}** Wickets`;
  } else if (filterType === 'coins') {
    query = 'SELECT name, coins FROM players ORDER BY coins DESC LIMIT 10';
    title = `${emojis.coin} Global Wealth Leaderboard`;
    displayFn = (row, rank) => `**#${rank}** \`${row.name}\` - **${emojis.coin} ${row.coins}** Coins`;
  }

  const rows = db.prepare(query).all();

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor('#1abc9c')
    .setTimestamp();

  if (rows.length === 0) {
    embed.setDescription('No players found on the leaderboard yet.');
  } else {
    const list = rows.map((row, index) => displayFn(row, index + 1)).join('\n');
    embed.setDescription(list);
  }

  await interaction.reply({ embeds: [embed] });
}
