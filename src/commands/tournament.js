import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder
} from 'discord.js';
import db from '../database/db.js';
import { emojis } from '../game/emojis.js';
import {
  getEffectiveAttributes,
  getEquipmentBonuses,
  updateAndGetEnergy,
  consumeEnergy,
  addXP,
  getLevelRequiredXP
} from '../game/utils.js';
import {
  deliveries,
  shots,
  simulateBall,
  simulateBallAdvanced,
  getReleaseHint,
  getDerivedShotName,
  generateBowlerDelivery,
  getOverBowler,
  getPlayerBattingPosition
} from '../game/engine.js';
import { generateFieldImage } from './challenge.js';
import { getPlayerEquippedShot } from '../game/shotmap.js';
import {
  QUICK_MATCH_CONFIG,
  TOURNAMENTS,
  getTournamentById,
  getTeamRoster,
  getTeamBowlers,
  isTournamentUnlocked,
  generateTournamentBracket,
  advanceBracket
} from '../game/tournaments.js';
import { BowlingAttackManager } from '../game/bowlingAttack.js';
import { setPlayerInMatch, clearPlayerInMatch } from '../game/matchState.js';

// Load canvas library safely
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  // Fallback to Discord embeds
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const PITCH_TYPES = [
  { id: 0, name: 'Flat Belter (Batting Paradise)', desc: 'Rock-hard surface, true bounce, lightning outfield. Perfect for stroke play and boundary hitting.' },
  { id: 1, name: 'Balanced Sporting Pitch', desc: 'Even contest between bat and ball. Good carry for pacers and fair value for true shots.' },
  { id: 2, name: 'Green Seamer (Pace & Swing)', desc: 'Generous grass cover. Sharp seam movement and lively swing in the air.' },
  { id: 3, name: 'Dry Turning Track (Spin Heaven)', desc: 'Dusty, abrasive deck. Massive grip, spin, and unpredictable bounce for slow bowlers.' },
  { id: 4, name: 'Bouncy Clay Deck (Steep Bounce)', desc: 'Hard red clay offering steep tennis-ball bounce and fierce carry to the keeper.' },
  { id: 5, name: 'Damp Slow Track (Sticky Pitch)', desc: 'Moisture beneath the surface. The ball holds up and grips off the pitch.' }
];

function getRandomPitch() {
  const index = Math.floor(Math.random() * PITCH_TYPES.length);
  return { ...PITCH_TYPES[index], index };
}

function getPitchByIndex(index) {
  const i = parseInt(index, 10);
  if (!isNaN(i) && i >= 0 && i < PITCH_TYPES.length) {
    return { ...PITCH_TYPES[i], index: i };
  }
  return { ...PITCH_TYPES[1], index: 1 };
}

export async function safeReplyOrEdit(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    } else {
      return await interaction.reply(payload);
    }
  } catch (err) {
    if (interaction.channel?.send) {
      return await interaction.channel.send(payload).catch(() => {});
    }
  }
}

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

/**
 * Main Tournament Hub handler
 */
export async function handleTournament(interaction, subOption = null) {
  const isButton = interaction.isButton?.() ?? false;
  const isSelect = interaction.isStringSelectMenu?.() ?? false;

  if (isButton || isSelect) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
  } else {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
  }

  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    const msg = '❌ You do not have a career player yet! Use `/begin` to create your player.';
    return safeReplyOrEdit(interaction, { content: msg, flags: ['Ephemeral'] });
  }

  if (subOption === 'quickmatch') {
    return startQuickMatch(interaction, player);
  } else if (subOption === 'play') {
    return playNextTournamentMatch(interaction, player);
  } else if (subOption === 'bracket') {
    return showTournamentBracket(interaction, player);
  } else if (subOption === 'abandon') {
    return handleAbandonTournament(interaction, player);
  }

  const wonTournaments = db.prepare('SELECT tournament_id FROM player_tournaments WHERE player_id = ? AND won > 0').all(discordId).map(t => t.tournament_id);
  const activeRun = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(discordId);

  await showTournamentHub(interaction, player, wonTournaments, activeRun);
}

/**
 * Display Tournament Hub (Overview of Quick Match and all Tournaments)
 */
async function showTournamentHub(interaction, player, wonTournaments, activeRun) {
  const discordId = player.discord_id;
  const reqXP = getLevelRequiredXP(player.level);
  const currentEnergy = updateAndGetEnergy(db, discordId);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Tournament Arena & Exhibitions')
    .setColor('#3498db')
    .setDescription(
      `Welcome to **Tournament Mode**, **${player.name}**!\n` +
      `Compete against computer AI clubs and national squads to lift prestigious trophies and earn major XP.\n\n` +
      (player.level === 1
        ? `⚠️ **ROOKIE STATUS (LEVEL 1)**: Professional tournaments require experience and are currently **LOCKED** 🔒!\n` +
          `👉 **Play Quick Match** against computer clubs to gain XP, level up, and unlock your first tournament!\n\n`
        : `🌟 **CONTENDER STATUS**: You have unlocked tournament tiers! Choose an unlocked tournament below, select your team, and battle knockout brackets!\n\n`) +
      `⚡ **Quick Match**: Always available. Friendly exhibition against computer clubs for fast XP grind.\n` +
      `🏆 **Tournaments**: Multi-stage knockout brackets for massive XP, Coins & Trophies!`
    )
    .addFields(
      {
        name: '👤 Player Standing',
        value: `Level: **${player.level}**\nXP: **${player.xp} / ${reqXP}**\nCoins: **${player.coins}** ${emojis.coin}\nEnergy: **${currentEnergy}/100** ${emojis.energy}`,
        inline: true
      },
      {
        name: '🏅 Trophies Won',
        value: `${wonTournaments.length} / ${TOURNAMENTS.length} Competitions\n${wonTournaments.length > 0 ? wonTournaments.map(t => `• ${getTournamentById(t)?.name || t}`).join('\n') : '*None yet*'}`.slice(0, 1024),
        inline: true
      }
    );

  if (activeRun) {
    const tourney = getTournamentById(activeRun.tournament_id);
    let bracket = null;
    try {
      bracket = JSON.parse(activeRun.bracket_json);
    } catch (e) {}
    const roundName = bracket ? bracket.rounds[bracket.roundIndex]?.name : `Round ${activeRun.current_round}`;

    embed.addFields({
      name: '⚡ ACTIVE TOURNAMENT RUN',
      value: `🏆 **${tourney?.name || activeRun.tournament_id}**\n` +
             `👕 Your Team: **${activeRun.user_team}**\n` +
             `⚔️ Next Match: **${roundName} vs ${activeRun.opponent_team}**\n` +
             `*Use the buttons below to continue your campaign!*`,
      inline: false
    });
  }

  let tournamentListText = `⚡ **Quick Exhibition Match** — *Always Unlocked* (Fast XP Grind)\n`;
  for (const t of TOURNAMENTS) {
    const isUnlocked = isTournamentUnlocked(t, player.level, wonTournaments);
    const hasWon = wonTournaments.includes(t.id);
    const statusIcon = hasWon ? '🏆 WON' : isUnlocked ? '🔓 UNLOCKED' : `🔒 Level ${t.requiredLevel}`;
    tournamentListText += `${t.icon} **${t.name}** [${statusIcon}] — *${t.teams.length} Teams, ${t.overs} Overs*\n`;
  }
  embed.addFields({ name: '📜 Tournament Directory & Unlock Status', value: tournamentListText });

  const actionRows = [];
  const btnRow = new ActionRowBuilder();
  btnRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`tourn_quickmatch_${discordId}`)
      .setLabel('⚡ Play Quick Match')
      .setStyle(ButtonStyle.Success)
  );

  if (activeRun) {
    btnRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`tourn_play_${discordId}`)
        .setLabel('▶️ Continue Tournament')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`tourn_bracket_${discordId}`)
        .setLabel('📊 View Bracket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tourn_abandon_${discordId}`)
        .setLabel('❌ Abandon Run')
        .setStyle(ButtonStyle.Danger)
    );
  }
  actionRows.push(btnRow);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tourn_select_${discordId}`)
    .setPlaceholder('Select a Tournament to view details or enter...');

  selectMenu.addOptions({
    label: '⚡ Quick Exhibition Match',
    description: 'Always unlocked! Play against computer teams to grind XP and level up.',
    value: 'quick_match',
    emoji: '⚡'
  });

  for (const t of TOURNAMENTS) {
    const isUnlocked = isTournamentUnlocked(t, player.level, wonTournaments);
    const hasWon = wonTournaments.includes(t.id);
    selectMenu.addOptions({
      label: `${t.name.slice(0, 50)}`,
      description: isUnlocked
        ? (hasWon ? `🏆 Completed! (Replay for ${t.rewards.coins} Coins)` : `Unlocked! ${t.teams.length} Teams • ${t.overs} Overs`)
        : `🔒 Locked (Requires Level ${t.requiredLevel})`,
      value: t.id,
      emoji: t.icon
    });
  }
  actionRows.push(new ActionRowBuilder().addComponents(selectMenu));

  let files = [];
  if (canvasLib) {
    try {
      const cardBuffer = await renderTournamentHubGraphic(player, wonTournaments, activeRun);
      if (cardBuffer) {
        const attachName = `tourn_hub_${Date.now()}.png`;
        files.push(new AttachmentBuilder(cardBuffer, { name: attachName }));
        embed.setImage(`attachment://${attachName}`);
      }
    } catch (e) {
      console.error('Error creating tournament hub canvas:', e);
    }
  }

  return safeReplyOrEdit(interaction, { embeds: [embed], components: actionRows, files });
}

/**
 * Render visual banner for Tournament Hub
 */
async function renderTournamentHubGraphic(player, wonTournaments, activeRun) {
  if (!canvasLib) return null;
  const { createCanvas } = canvasLib;
  const canvas = createCanvas(900, 320);
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, 900, 320);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#1e293b');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 900, 320);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 900; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 320);
    ctx.stroke();
  }
  for (let y = 0; y < 320; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(900, y);
    ctx.stroke();
  }

  drawRoundRect(ctx, 16, 16, 868, 288, 16, 'rgba(15, 23, 42, 0.75)', 'rgba(56, 189, 248, 0.35)', 2);

  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('CRICKET ASCEND • TOURNAMENT ARENA', 44, 58);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Captain: ${player.name} | Tier: ${player.level === 1 ? 'Rookie Qualifier' : 'Pro Circuit'} | Trophies: ${wonTournaments.length}/${TOURNAMENTS.length}`, 44, 86);

  // Quick Match Box
  drawRoundRect(ctx, 44, 114, 380, 160, 12, 'rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.45)', 2);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#10b981';
  ctx.fillText('⚡ QUICK EXHIBITIONS', 64, 146);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('• Casual domestic clubs & real county sides', 64, 178);
  ctx.fillText('• 0 Coins at stake, essential XP grind', 64, 204);
  ctx.fillText('• Level up to unlock major franchise cups', 64, 230);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('STATUS: ALWAYS UNLOCKED (FREE ENTRY)', 64, 258);

  // Tournaments Box
  drawRoundRect(ctx, 450, 114, 404, 160, 12, 'rgba(56, 189, 248, 0.12)', 'rgba(56, 189, 248, 0.45)', 2);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('🏆 KNOCKOUT CUPS', 470, 146);

  if (activeRun) {
    const tourney = getTournamentById(activeRun.tournament_id);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(`Active Run: ${tourney?.name || activeRun.tournament_id}`, 470, 178);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Leading: ${activeRun.user_team} (Stage: Round ${activeRun.current_round})`, 470, 204);
    ctx.fillText(`Next Opponent: ${activeRun.opponent_team}`, 470, 230);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('STATUS: CAMPAIGN IN PROGRESS', 470, 258);
  } else {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`• 7 Global Competitions (BBL, IPL, World Cup)`, 470, 178);
    ctx.fillText(`• Authentic Knockout Bracket progression`, 470, 204);
    ctx.fillText(`• Massive XP, Coins & Career Trophies`, 470, 230);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = player.level >= 2 ? '#38bdf8' : '#f87171';
    ctx.fillText(player.level >= 2 ? 'STATUS: TOURNAMENTS UNLOCKED' : 'STATUS: UNLOCKS AT LEVEL 2', 470, 258);
  }

  return canvas.toBuffer('image/png');
}

/**
 * Step 1: Quick Match Confirmation Screen
 */
export async function startQuickMatch(interaction, player) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing. Use `/begin` to create your player.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const currentEnergy = updateAndGetEnergy(db, discordId);
  const energyCost = 10;

  const teams = QUICK_MATCH_CONFIG.teams;
  const compTeam = teams[Math.floor(Math.random() * teams.length)];
  const pitchObj = getRandomPitch();

  const embed = new EmbedBuilder()
    .setTitle(`⚡ Match Day Preview: Quick Exhibition Match`)
    .setColor('#10b981')
    .setDescription(
      `Welcome to the **Exhibition Match Arena**!\n` +
      `Face off against experienced domestic computer clubs to hone your skills, earn XP, and unlock major tournament tiers.\n\n` +
      `⚔️ **Matchup:** **${player.name}'s XI** vs **${compTeam.name}**\n` +
      `⭐ **Key Opponent:** ${compTeam.keyPlayer}\n` +
      `🌿 **Pitch Condition:** **${pitchObj.name}**\n` +
      `💬 *${pitchObj.desc}*\n\n` +
      `📊 **Match Format:** **${QUICK_MATCH_CONFIG.overs} Overs (${QUICK_MATCH_CONFIG.balls} Balls)**\n` +
      `🎯 **Difficulty:** \`${compTeam.difficulty}\` (Bowler Rating: ~${compTeam.bowlerSkill})\n` +
      `🎁 **Rewards:** +${QUICK_MATCH_CONFIG.winXP} XP for Win (+${QUICK_MATCH_CONFIG.lossXP} XP on Loss)\n` +
      `⚡ **Energy Required:** **${energyCost} Energy** (You have: **${currentEnergy}/100** ${emojis.energy})\n\n` +
      (currentEnergy < energyCost
        ? `⚠️ **You are too tired to play!** Please rest or drink an energy beverage before taking the field.`
        : `👉 Click **Take the Field** to begin the match!`)
    )
    .setFooter({ text: 'Cricket Ascend • Quick Exhibition Match' });

  const row = new ActionRowBuilder();
  if (currentEnergy >= energyCost) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`tourn_start_quick__${compTeam.id}__${pitchObj.index}__${discordId}`)
        .setLabel('🏏 Take the Field / Start Match')
        .setStyle(ButtonStyle.Success)
    );
  }
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`tourn_hub_${discordId}`)
      .setLabel('⬅️ Back to Hub')
      .setStyle(ButtonStyle.Secondary)
  );

  return safeReplyOrEdit(interaction, { embeds: [embed], components: [row], files: [] });
}

/**
 * Step 2: Execute Quick Match after Confirmation
 */
export async function executeQuickMatch(interaction, player) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const currentEnergy = updateAndGetEnergy(db, discordId);
  const energyCost = 10;
  if (currentEnergy < energyCost) {
    return safeReplyOrEdit(interaction, { content: `❌ You need at least **${energyCost} Energy** to play! (Current: ${currentEnergy}/100)`, flags: ['Ephemeral'] });
  }
  consumeEnergy(db, discordId, energyCost);

  const customId = interaction.customId || '';
  const parts = customId.split('__');
  const compTeamId = parts[1];
  const compTeam = QUICK_MATCH_CONFIG.teams.find(t => t.id === compTeamId) || QUICK_MATCH_CONFIG.teams[0];
  const pitchIndex = parts[2];
  const pitchObj = getPitchByIndex(pitchIndex);
  const pitchName = pitchObj.name;

  const totalOvers = QUICK_MATCH_CONFIG.overs || 3;
  const ballsLimit = totalOvers * 6;
  const targetRuns = Math.round(totalOvers * 11.5) + Math.floor(Math.random() * 6) - 2;

  const matchConfig = {
    isQuickMatch: true,
    title: `⚡ Quick Exhibition Match vs ${compTeam.name}`,
    opponentName: compTeam.name,
    userTeamName: `${player.name}'s XI`,
    difficulty: compTeam.difficulty,
    bowlerSkill: compTeam.bowlerSkill,
    pitch: pitchName,
    totalOvers,
    ballsLimit,
    targetRuns,
    rewardXP: QUICK_MATCH_CONFIG.winXP,
    rewardCoins: 0,
    color: compTeam.color || '#10b981'
  };

  await runTournamentMatch(interaction, player, matchConfig, async (won, stats, msgObj) => {
    const earnedXP = won ? QUICK_MATCH_CONFIG.winXP : QUICK_MATCH_CONFIG.lossXP;
    const oldLevel = player.level;
    const levelResult = addXP(db, discordId, earnedXP);
    const updatedPlayer = db.prepare('SELECT level, xp, coins FROM players WHERE discord_id = ?').get(discordId);

    const newlyUnlocked = [];
    if (levelResult.levelUp) {
      for (const t of TOURNAMENTS) {
        if (oldLevel < t.requiredLevel && updatedPlayer.level >= t.requiredLevel) {
          newlyUnlocked.push(t);
        }
      }
    }

    const marginText = won
      ? `Won by ${10 - (stats.teamWickets || 0)} wickets`
      : `Lost by ${Math.max(1, matchConfig.targetRuns - 1 - (stats.teamRuns || 0))} runs`;

    const summaryEmbed = new EmbedBuilder()
      .setTitle(won ? '🎉 Quick Match Victory!' : '💔 Quick Match Defeat')
      .setColor(won ? '#2ecc71' : '#e74c3c')
      .setDescription(
        `**Match Outcome: vs ${compTeam.name}** (${marginText})\n\n` +
        `• 🌿 **Pitch Condition:** \`${matchConfig.pitch}\`\n` +
        `• 📊 **Team Score:** **${stats.teamRuns || stats.runs} / ${stats.teamWickets || stats.wickets}** (Target: **${matchConfig.targetRuns}**)\n` +
        `• 🏃 **Your Performance:** **${stats.runs}** runs (${stats.balls} balls, ${stats.fours}x4, ${stats.sixes}x6)\n\n` +
        `⭐ **XP Gained:** **+${earnedXP} XP**\n` +
        `${emojis.coin} **Coins Gained:** **+0 Coins** *(Exhibitions are low-stakes friendlies)*\n\n` +
        `📈 **Level Progress:** **Level ${updatedPlayer.level}** (${updatedPlayer.xp} / ${getLevelRequiredXP(updatedPlayer.level)} XP)`
      );

    if (levelResult.levelUp) {
      summaryEmbed.addFields({
        name: '🎊 LEVEL UP!',
        value: `Congratulations! You leveled up to **Level ${updatedPlayer.level}**!\n` +
               `You earned **+${levelResult.skillPointsGained || 1} Skill Point** to boost your attributes!`
      });

      if (newlyUnlocked.length > 0) {
        summaryEmbed.addFields({
          name: '🔓 NEW TOURNAMENTS UNLOCKED!',
          value: newlyUnlocked.map(t => `${t.icon} **${t.name}** (${t.badge})\n*You can now enter and compete in this tournament tier!*`).join('\n\n')
        });
      }
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tourn_quickmatch_${discordId}`)
        .setLabel('⚡ Play Another Quick Match')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`tourn_hub_${discordId}`)
        .setLabel('🏆 Tournament Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    if (msgObj) {
      await msgObj.edit({ embeds: [summaryEmbed], components: [row], files: [] }).catch(async () => {
        await msgObj.channel?.send({ embeds: [summaryEmbed], components: [row] }).catch(() => {});
      });
    } else {
      await safeReplyOrEdit(interaction, { embeds: [summaryEmbed], components: [row], files: [] });
    }
  });
}

/**
 * Handle selection of a tournament to view details and pick a team
 */
export async function handleTournamentDetails(interaction, player, tournamentId) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const wonTournaments = db.prepare('SELECT tournament_id FROM player_tournaments WHERE player_id = ? AND won > 0').all(discordId).map(t => t.tournament_id);

  if (tournamentId === 'quick_match') {
    return startQuickMatch(interaction, player);
  }

  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    return handleTournament(interaction);
  }

  const isUnlocked = isTournamentUnlocked(tournament, player.level, wonTournaments);

  if (!isUnlocked) {
    const embed = new EmbedBuilder()
      .setTitle(`🔒 ${tournament.name} is Locked!`)
      .setColor('#e74c3c')
      .setDescription(
        `This tournament requires **Level ${tournament.requiredLevel}** to enter!\n` +
        `Your current level is **Level ${player.level}**.\n\n` +
        `👉 **How to unlock:**\n` +
        `• Play **Quick Matches** against the computer to earn fast XP and level up!\n` +
        `• Complete lower-tier tournaments to accelerate level progression.`
      )
      .addFields({
        name: 'Tournament Info',
        value: `Tier: **${tournament.badge}**\nTeams: **${tournament.teams.length}**\nOvers: **${tournament.overs}**\nTrophy Reward: **${tournament.rewards.trophy}**`
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tourn_quickmatch_${discordId}`)
        .setLabel('⚡ Play Quick Match for XP')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`tourn_hub_${discordId}`)
        .setLabel('⬅️ Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    return safeReplyOrEdit(interaction, { embeds: [embed], components: [row], files: [] });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${tournament.icon} ${tournament.name}`)
    .setColor(tournament.color)
    .setDescription(
      `**${tournament.description}**\n\n` +
      `⚡ **Format:** Knockout Bracket (${tournament.rounds.join(' ➔ ')})\n` +
      `🥎 **Match Length:** ${tournament.overs} Overs (${tournament.balls} Balls)\n` +
      `📊 **Difficulty:** \`${tournament.difficulty}\` (Bowler Rating: ~${tournament.bowlerSkill})\n` +
      `🎁 **Champion Prize Pool:** +${tournament.rewards.xp} XP, +${tournament.rewards.coins} Coins, +${tournament.rewards.reputation} Rep, 🏆 **${tournament.rewards.trophy}**\n\n` +
      `👉 **Choose the team you want to lead against the computer:**`
    );

  const teamSelect = new StringSelectMenuBuilder()
    .setCustomId(`tourn_pickteam_${tournament.id}_${discordId}`)
    .setPlaceholder('Select your team from the tournament roster...');

  tournament.teams.forEach(team => {
    teamSelect.addOptions({
      label: team.name,
      description: `Rating: ${team.rating}/100 • Star: ${team.keyPlayer}`,
      value: team.name,
      emoji: '👕'
    });
  });

  const row1 = new ActionRowBuilder().addComponents(teamSelect);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tourn_hub_${discordId}`)
      .setLabel('⬅️ Back to Tournaments Hub')
      .setStyle(ButtonStyle.Secondary)
  );

  return safeReplyOrEdit(interaction, { embeds: [embed], components: [row1, row2], files: [] });
}

/**
 * Handle team selection: create active bracket run
 */
export async function handlePickTeam(interaction, player, tournamentId, userTeamName) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const tournament = getTournamentById(tournamentId);

  if (!tournament) {
    return handleTournament(interaction);
  }

  const bracket = generateTournamentBracket(tournament, userTeamName);
  const firstRound = bracket.rounds[0];
  const userMatch = firstRound.matches.find(m => m.isUserMatch);
  const opponentTeam = userMatch.team2;

  db.prepare(`
    INSERT OR REPLACE INTO active_tournament_run (
      player_id, tournament_id, user_team, current_round, opponent_team, status, bracket_json
    ) VALUES (?, ?, ?, 1, ?, 'active', ?)
  `).run(discordId, tournament.id, userTeamName, opponentTeam, JSON.stringify(bracket));

  await showTournamentBracket(interaction, player);
}

/**
 * Show active tournament bracket overview
 */
export async function showTournamentBracket(interaction, player) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const activeRun = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(discordId);

  if (!activeRun) {
    return handleTournament(interaction);
  }

  const tournament = getTournamentById(activeRun.tournament_id);
  let bracket = null;
  try {
    bracket = JSON.parse(activeRun.bracket_json);
  } catch (e) {
    return handleTournament(interaction);
  }

  const currentRound = bracket.rounds[bracket.roundIndex];
  const userMatch = currentRound.matches.find(m => m.isUserMatch);

  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${tournament.name} — Bracket Overview`)
    .setColor(tournament.color)
    .setDescription(
      `You are leading **${activeRun.user_team}** in the **${tournament.name}**!\n\n` +
      `🔥 **Current Stage:** **${currentRound.name}**\n` +
      `⚔️ **Your Matchup:** **${userMatch.team1}** (You) vs **${userMatch.team2}** (Computer)\n\n` +
      `Win this match to advance to the next round of the tournament!`
    );

  bracket.rounds.forEach((round, rIdx) => {
    let matchesText = '';
    round.matches.forEach((m) => {
      const isUser = m.isUserMatch;
      const t1 = m.team1 || 'TBD';
      const t2 = m.team2 || 'TBD';
      const winnerText = m.winner ? ` (Winner: **${m.winner}** ✅)` : '';
      const tag = isUser ? '⭐ **YOU:** ' : '• ';
      matchesText += `${tag}${t1} vs ${t2}${winnerText}\n`;
    });
    embed.addFields({
      name: `${round.name} ${rIdx === bracket.roundIndex ? '◀️ CURRENT STAGE' : ''}`,
      value: matchesText || 'Matches pending previous round outcomes'
    });
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tourn_play_${discordId}`)
      .setLabel(`▶️ Play ${currentRound.name} Match`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tourn_hub_${discordId}`)
      .setLabel('⬅️ Tournament Hub')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tourn_abandon_${discordId}`)
      .setLabel('❌ Abandon Tournament')
      .setStyle(ButtonStyle.Danger)
  );

  return safeReplyOrEdit(interaction, { embeds: [embed], components: [row], files: [] });
}

/**
 * Step 1: Tournament Match Confirmation Screen
 */
export async function playNextTournamentMatch(interaction, player) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const activeRun = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(discordId);

  if (!activeRun) {
    return handleTournament(interaction);
  }

  const tournament = getTournamentById(activeRun.tournament_id);
  let bracket = null;
  try {
    bracket = JSON.parse(activeRun.bracket_json);
  } catch (e) {
    return handleTournament(interaction);
  }

  const currentRound = bracket.rounds[bracket.roundIndex];
  const userMatch = currentRound.matches.find(m => m.isUserMatch);
  const opponentTeam = tournament.teams.find(t => t.name === userMatch.team2) || {
    name: userMatch.team2,
    rating: 65,
    keyPlayer: 'Opposition Star',
    color: '#e74c3c'
  };

  const currentEnergy = updateAndGetEnergy(db, discordId);
  const energyCost = 15;
  const pitchObj = getRandomPitch();

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Match Day Preview: ${tournament.name}`)
    .setColor(tournament.color || '#38bdf8')
    .setDescription(
      `You are leading **${activeRun.user_team}** in the knockout stages of the **${tournament.name}**!\n\n` +
      `🔥 **Current Stage:** **${currentRound.name}**\n` +
      `⚔️ **Matchup:** **${activeRun.user_team}** vs **${opponentTeam.name}**\n` +
      `⭐ **Key Opponent:** ${opponentTeam.keyPlayer || 'Opponent Star'} (Rating: ${opponentTeam.rating}/100)\n` +
      `🌿 **Pitch Report:** **${pitchObj.name}**\n` +
      `💬 *${pitchObj.desc}*\n\n` +
      `📊 **Match Length:** **${tournament.overs} Overs (${tournament.balls} Balls)**\n` +
      `🎯 **Difficulty:** \`${tournament.difficulty}\` (Bowler Rating: ~${tournament.bowlerSkill})\n` +
      `🏆 **Trophy on the Line:** **${tournament.rewards.trophy}**\n` +
      `⚡ **Energy Required:** **${energyCost} Energy** (You have: **${currentEnergy}/100** ${emojis.energy})\n\n` +
      (currentEnergy < energyCost
        ? `⚠️ **You are too tired to play!** Please rest or drink an energy beverage before taking the field.`
        : `👉 Click **Take the Field** to start your ${currentRound.name} match!`)
    )
    .setFooter({ text: `Cricket Ascend • ${tournament.name} • ${currentRound.name}` });

  const row = new ActionRowBuilder();
  if (currentEnergy >= energyCost) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`tourn_start_match__${pitchObj.index}__${discordId}`)
        .setLabel(`🏏 Take the Field (${currentRound.name})`)
        .setStyle(ButtonStyle.Success)
    );
  }
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`tourn_bracket_${discordId}`)
      .setLabel('📊 View Bracket')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tourn_hub_${discordId}`)
      .setLabel('⬅️ Back to Hub')
      .setStyle(ButtonStyle.Secondary)
  );

  return safeReplyOrEdit(interaction, { embeds: [embed], components: [row], files: [] });
}

/**
 * Step 2: Execute Tournament Match after Confirmation
 */
export async function executeTournamentMatch(interaction, player) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  const currentEnergy = updateAndGetEnergy(db, discordId);
  const energyCost = 15;
  if (currentEnergy < energyCost) {
    return safeReplyOrEdit(interaction, { content: `❌ You need at least **${energyCost} Energy** to play! (Current: ${currentEnergy}/100)`, flags: ['Ephemeral'] });
  }
  consumeEnergy(db, discordId, energyCost);

  const activeRun = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(discordId);
  if (!activeRun) {
    return handleTournament(interaction);
  }

  const tournament = getTournamentById(activeRun.tournament_id);
  let bracket = null;
  try {
    bracket = JSON.parse(activeRun.bracket_json);
  } catch (e) {
    return handleTournament(interaction);
  }

  const currentRound = bracket.rounds[bracket.roundIndex];
  const userMatch = currentRound.matches.find(m => m.isUserMatch);
  const opponentTeam = tournament.teams.find(t => t.name === userMatch.team2) || {
    name: userMatch.team2,
    rating: 65,
    color: '#e74c3c'
  };

  const customId = interaction.customId || '';
  const parts = customId.split('__');
  const pitchIndex = parts[1];
  const pitchObj = getPitchByIndex(pitchIndex);
  const pitchName = pitchObj.name;

  const totalOvers = tournament.overs || 20;
  const ballsLimit = totalOvers * 6;
  const baseTarget = totalOvers === 20
    ? (150 + Math.floor(Math.random() * 35) + Math.round((opponentTeam.rating || 75) / 5))
    : Math.round(totalOvers * 9.5 + ((opponentTeam.rating || 65) / 10));
  const targetRuns = Math.max(20, baseTarget + Math.floor(Math.random() * 7) - 3);

  const matchConfig = {
    isQuickMatch: false,
    tournamentId: tournament.id,
    title: `🏆 ${tournament.name} — ${currentRound.name}`,
    opponentName: opponentTeam.name,
    opponentTeam,
    userTeamName: activeRun.user_team,
    difficulty: tournament.difficulty,
    bowlerSkill: tournament.bowlerSkill,
    pitch: pitchName,
    totalOvers,
    ballsLimit,
    targetRuns,
    color: tournament.color || '#38bdf8'
  };

  await runTournamentMatch(interaction, player, matchConfig, async (won, stats, msgObj) => {
    const advanceResult = advanceBracket(bracket, won);

    if (won) {
      if (advanceResult.finished && advanceResult.won) {
        // Grand Final Champion
        db.prepare('DELETE FROM active_tournament_run WHERE player_id = ?').run(discordId);
        db.prepare(`
          INSERT INTO player_tournaments (player_id, tournament_id, won, times_played, high_score, unlocked)
          VALUES (?, ?, 1, 1, ?, 1)
          ON CONFLICT(player_id, tournament_id) DO UPDATE SET
            won = won + 1,
            times_played = times_played + 1,
            high_score = MAX(high_score, excluded.high_score)
        `).run(discordId, tournament.id, stats.runs);

        const rewardXP = tournament.rewards.xp;
        const rewardCoins = tournament.rewards.coins;
        const rewardRep = tournament.rewards.reputation;

        db.prepare('UPDATE players SET coins = coins + ?, reputation = reputation + ? WHERE discord_id = ?')
          .run(rewardCoins, rewardRep, discordId);

        const levelResult = addXP(db, discordId, rewardXP);
        const updatedPlayer = db.prepare('SELECT level, xp, coins, reputation FROM players WHERE discord_id = ?').get(discordId);

        const champEmbed = new EmbedBuilder()
          .setTitle(`🏆 TOURNAMENT CHAMPION: ${tournament.name}! 🎊`)
          .setColor('#f1c40f')
          .setDescription(
            `🌟 **HISTORY IS MADE!** 🌟\n\n` +
            `You led **${activeRun.user_team}** through the knockout bracket to capture the **${tournament.rewards.trophy}**!\n\n` +
            `🎁 **CHAMPION REWARDS CLAIMED:**\n` +
            `• ⭐ **+${rewardXP} XP**\n` +
            `• ${emojis.coin} **+${rewardCoins} Coins**\n` +
            `• 🎖️ **+${rewardRep} Reputation**\n` +
            `• 🏆 **${tournament.rewards.trophy}** added to your trophy cabinet!\n\n` +
            `📈 **Player Status:** Level **${updatedPlayer.level}** • **${updatedPlayer.coins}** Coins • **${updatedPlayer.reputation}** Rep`
          );

        if (levelResult.levelUp) {
          champEmbed.addFields({
            name: '🎊 LEVEL UP!',
            value: `Congratulations! You leveled up to **Level ${updatedPlayer.level}**!\n` +
                   `You earned **+${levelResult.skillPointsGained || 1} Skill Point** to boost your attributes!`
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`tourn_hub_${discordId}`)
            .setLabel('🏆 Tournament Hub')
            .setStyle(ButtonStyle.Success)
        );

        if (msgObj) {
          return await msgObj.edit({ embeds: [champEmbed], components: [row], files: [] }).catch(async () => {
            return await msgObj.channel?.send({ embeds: [champEmbed], components: [row] }).catch(() => {});
          });
        } else {
          return await safeReplyOrEdit(interaction, { embeds: [champEmbed], components: [row], files: [] });
        }
      } else {
        // Advanced to next round
        const nextRound = bracket.rounds[bracket.roundIndex];
        const nextUserMatch = nextRound.matches.find(m => m.isUserMatch);
        const nextOpponent = nextUserMatch.team2;

        db.prepare(`
          UPDATE active_tournament_run 
          SET current_round = current_round + 1,
              opponent_team = ?,
              bracket_json = ?
          WHERE player_id = ?
        `).run(nextOpponent, JSON.stringify(bracket), discordId);

        const matchWinXP = Math.round(tournament.rewards.xp / (bracket.rounds.length + 1));
        const matchWinCoins = Math.round(tournament.rewards.coins / (bracket.rounds.length + 1));
        db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(matchWinCoins, discordId);
        addXP(db, discordId, matchWinXP);

        const advanceEmbed = new EmbedBuilder()
          .setTitle(`✅ VICTORY! Advanced to ${nextRound.name}`)
          .setColor('#2ecc71')
          .setDescription(
            `**${activeRun.user_team}** defeated **${opponentTeam.name}**!\n\n` +
            `• 📊 **Team Score:** **${stats.teamRuns || stats.runs} / ${stats.teamWickets || stats.wickets}**\n` +
            `• 🏃 **Your Score:** **${stats.runs}** runs (${stats.balls}b, ${stats.fours}x4, ${stats.sixes}x6)\n` +
            `• ⭐ **Round Prize:** +${matchWinXP} XP, +${emojis.coin} ${matchWinCoins} Coins\n` +
            `⚔️ **Next Match:** **${nextRound.name}** vs **${nextOpponent}**!\n\n` +
            `Prepare your squad for the next stage of the tournament!`
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`tourn_play_${discordId}`)
            .setLabel(`▶️ Play ${nextRound.name}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`tourn_bracket_${discordId}`)
            .setLabel('📊 View Bracket')
            .setStyle(ButtonStyle.Secondary)
        );

        if (msgObj) {
          return await msgObj.edit({ embeds: [advanceEmbed], components: [row], files: [] }).catch(async () => {
            return await msgObj.channel?.send({ embeds: [advanceEmbed], components: [row] }).catch(() => {});
          });
        } else {
          return await safeReplyOrEdit(interaction, { embeds: [advanceEmbed], components: [row], files: [] });
        }
      }
    } else {
      // Knocked out
      db.prepare('DELETE FROM active_tournament_run WHERE player_id = ?').run(discordId);
      const partXP = Math.round(tournament.rewards.xp * 0.25);
      addXP(db, discordId, partXP);

      const defeatEmbed = new EmbedBuilder()
        .setTitle(`💔 Knocked Out of ${tournament.name}`)
        .setColor('#e74c3c')
        .setDescription(
          `**${activeRun.user_team}** was defeated by **${opponentTeam.name}** in the ${currentRound.name}.\n\n` +
          `• 📊 **Final Team Score:** **${stats.teamRuns || stats.runs} / ${stats.teamWickets || stats.wickets}** (Target: **${matchConfig.targetRuns}**)\n` +
          `• 🏃 **Your Score:** **${stats.runs}** runs (${stats.balls}b, ${stats.fours}x4, ${stats.sixes}x6)\n` +
          `⭐ **Consolation XP:** +${partXP} XP gained for match experience.\n\n` +
          `Don't give up! Level up through Quick Matches or retry this tournament anytime!`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tourn_select_${discordId}`)
          .setLabel('🔄 Retry Tournament')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`tourn_quickmatch_${discordId}`)
          .setLabel('⚡ Play Quick Match for XP')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`tourn_hub_${discordId}`)
          .setLabel('🏆 Tournament Hub')
          .setStyle(ButtonStyle.Secondary)
      );

      if (msgObj) {
        return await msgObj.edit({ embeds: [defeatEmbed], components: [row], files: [] }).catch(async () => {
          return await msgObj.channel?.send({ embeds: [defeatEmbed], components: [row] }).catch(() => {});
        });
      } else {
        return await safeReplyOrEdit(interaction, { embeds: [defeatEmbed], components: [row], files: [] });
      }
    }
  });
}

/**
 * Abandon active tournament
 */
export async function handleAbandonTournament(interaction, player) {
  if (!player) {
    player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(interaction.user.id);
  }
  if (!player) {
    return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
  }

  const discordId = player.discord_id;
  db.prepare('DELETE FROM active_tournament_run WHERE player_id = ?').run(discordId);

  const embed = new EmbedBuilder()
    .setTitle('❌ Tournament Run Abandoned')
    .setColor('#e74c3c')
    .setDescription('You have abandoned your active tournament run. You can enter any tournament again from the Hub!');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tourn_hub_${discordId}`)
      .setLabel('🏆 Back to Tournament Hub')
      .setStyle(ButtonStyle.Primary)
  );

  return safeReplyOrEdit(interaction, { embeds: [embed], components: [row], files: [] });
}

function getMatchBowler(match, overNumber, previousBowler = null) {
  const teamBowlers = match.opponentTeam?.bowlers || getTeamBowlers(match.tournamentId, match.opponentName);
  if (teamBowlers && teamBowlers.length > 0) {
    const isSpinOver = (overNumber % 2 === 0);
    const spinList = teamBowlers.filter(b => b.type === 'spin');
    const paceList = teamBowlers.filter(b => b.type === 'pace');
    let pool = (isSpinOver && spinList.length > 0) ? spinList : (paceList.length > 0 ? paceList : teamBowlers);
    const filtered = pool.filter(b => !previousBowler || b.name !== previousBowler.name);
    const picked = filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
    return {
      name: picked.name,
      type: picked.type || 'pace',
      style: picked.style || 'Right-Arm Fast-Medium',
      ballsBowled: 0,
      runsConceded: 0,
      wicketsTaken: 0
    };
  }
  return getOverBowler(match.pitch, overNumber, previousBowler);
}

function getInitialPartner(match, player, teamWickets = 0) {
  const teamRoster = getTeamRoster(match.tournamentId, match.userTeamName);
  if (teamRoster && teamRoster.length > 0) {
    const filtered = teamRoster.filter(p => p !== player.name);
    if (filtered.length > 0) {
      return filtered[teamWickets % filtered.length];
    }
  }
  const defaultPartners = [
    'Mitchell Marsh',
    'Travis Head',
    'David Warner',
    'Alex Hales',
    'Liam Livingstone',
    'Phil Salt',
    'Quinton de Kock',
    'Ruturaj Gaikwad',
    'Shubman Gill',
    'Devon Conway'
  ];
  const filtered = defaultPartners.filter(p => p !== player.name);
  return filtered[teamWickets % filtered.length] || 'Opening Partner';
}

const RESERVE_BATSMEN = [
  'Glenn Maxwell',
  'Heinrich Klaasen',
  'Tim David',
  'Marcus Stoinis',
  'Rinku Singh',
  'Sam Curran',
  'Shimron Hetmyer',
  'Nicholas Pooran',
  'David Miller',
  'Moeen Ali'
];

export function getPlayerHand(playerName) {
  const leftHanders = [
    'travis head', 'abhishek sharma', 'david warner', 'rishabh pant', 'shikhar dhawan',
    'quinton de kock', 'nicholas pooran', 'yashasvi jaiswal', 'sunil narine', 'rinku singh',
    'shivam dube', 'ravindra jadeja', 'rachin ravindra', 'fakhar zaman', 'saim ayub',
    'shai hope', 'devon conway', 'ben mcdermott', 'matthew wade', 'alastair cook',
    'shivnarine chanderpaul', 'kumar sangakkara', 'usman khawaja', 'ishan kishan',
    'tilak varma', 'devdutt padikkal', 'axar patel', 'krunal pandya', 'moeen ali',
    'shakib al hasan', 'soumya sarkar', 'tamim iqbal', 'kusal perera', 'charith asalanka'
  ];
  const lower = (playerName || '').toLowerCase();
  return leftHanders.some(lh => lower.includes(lh)) ? 'Left-hand bat' : 'Right-hand bat';
}

/**
 * Robust, In-Place Match Runner (Supports Batsman, Bowler, and All-Rounder)
 */
async function runTournamentMatch(interaction, player, match, onFinishCallback) {
  const discordId = player.discord_id;
  setPlayerInMatch(discordId, 'tournament', { matchId: match.tournamentId || match.title, title: match.title });

  const wrappedFinishCallback = async (...args) => {
    clearPlayerInMatch(discordId);
    return await onFinishCallback(...args);
  };

  const isBowlerRole = (player.primary_role === 'Bowler');

  const tossWonByUser = Math.random() < 0.50;
  let tossText = '';
  let matchObjective = '';

  if (isBowlerRole) {
    tossText = tossWonByUser
      ? `🪙 **Toss:** **${match.userTeamName}** won the toss and elected to bat first!`
      : `🪙 **Toss:** **${match.opponentName}** won the toss and elected to chase!`;
    matchObjective = `🎯 Your team set **${match.targetRuns - 1} runs**. Defend the total with your bowling spells!`;
  } else {
    tossText = tossWonByUser
      ? `🪙 **Toss:** **${match.userTeamName}** won the toss and elected to bowl first!`
      : `🪙 **Toss:** **${match.opponentName}** won the toss and elected to bat first!`;
    matchObjective = `🎯 Target: **${match.targetRuns} runs** in **${match.totalOvers || 20} Overs (${match.ballsLimit} balls)**!`;
  }

  const tickerLines = [
    `⚔️ **${match.title}**`,
    tossText,
    `🌿 **Pitch Condition:** \`${match.pitch}\``,
    matchObjective,
    `\n🔔 **Match Begins!** Players take their positions...`
  ];

  const kickoffEmbed = new EmbedBuilder()
    .setTitle(match.title)
    .setColor(match.color || '#38bdf8')
    .setDescription(tickerLines.join('\n'));

  let message = await safeReplyOrEdit(interaction, { embeds: [kickoffEmbed], components: [], files: [] });
  if (!message && interaction.channel?.send) {
    message = await interaction.channel.send({ embeds: [kickoffEmbed] }).catch(() => {});
  }
  await sleep(1800);

  if (isBowlerRole) {
    await runBowlingLoop(interaction, player, match, message, wrappedFinishCallback);
  } else {
    await runBattingLoop(interaction, player, match, message, wrappedFinishCallback);
  }
}

/**
 * Batting Loop: Full Franchise-Grade System
 * - Proper Team Scores (teamRuns / teamWickets in overs.balls)
 * - Partner Batting & Live Strike Rotation
 * - Over-Locked Bowlers (100% consistent craft throughout each over)
 * - Dismissal & Rest of Innings Simulation
 */
async function runBattingLoop(interaction, player, match, message, onFinishCallback) {
  const discordId = player.discord_id;
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

  const totalOvers = match.totalOvers || Math.max(3, Math.ceil(match.ballsLimit / 6));
  const totalBallsLimit = totalOvers * 6;
  const targetRuns = match.targetRuns;

  let teamRuns = 0;
  let teamWickets = 0;
  let completedOvers = 0;
  let ballsInCurrentOver = 0;

  const posInfo = getPlayerBattingPosition(player, db);
  const targetWickets = posInfo.targetWickets;

  // Pre-entry simulation up to targetWickets (authentic entrance based on career batting order)
  if (targetWickets > 0 && totalOvers >= 10) {
    const entryMaxOver = Math.min(18, Math.max(3, targetWickets * 3 + Math.floor(Math.random() * 2)));
    while (completedOvers < entryMaxOver && teamWickets < targetWickets) {
      completedOvers++;
      const runsInOver = 6 + Math.floor(Math.random() * 6);
      teamRuns += runsInOver;
      if (teamWickets < targetWickets && (completedOvers >= (targetWickets * 2) || Math.random() < 0.45)) {
        teamWickets++;
      }
    }
  }

  let playerRuns = 0;
  let playerBalls = 0;
  let playerFours = 0;
  let playerSixes = 0;
  let userIsOut = false;
  let userDismissalText = '';

  const teamRoster = getTeamRoster(match.tournamentId, match.userTeamName) || [];
  const validTeamRoster = teamRoster.filter(p => p !== player.name);

  let partnerName = getInitialPartner(match, player, teamWickets);
  let partnerRuns = (completedOvers > 0) ? Math.min(teamRuns - 10, Math.floor(teamRuns * 0.4) + Math.floor(Math.random() * 8)) : 0;
  partnerRuns = Math.max(0, partnerRuns);
  let partnerBalls = (completedOvers > 0) ? Math.max(partnerRuns, Math.floor(partnerRuns * 0.85) + Math.floor(Math.random() * 5)) : 0;
  let partnerFours = Math.floor(partnerRuns / 12);
  let partnerSixes = Math.floor(partnerRuns / 24);
  let reserveIdx = teamWickets + 1;

  let userOnStrike = true;
  const opponentBowlers = match.opponentTeam?.bowlers || getTeamBowlers(match.tournamentId, match.opponentName) || [];
  const attack = new BowlingAttackManager(opponentBowlers, totalOvers, match.pitch);
  if (completedOvers > 0) {
    attack.simulatePreEntry(completedOvers, teamRuns, teamWickets);
  }
  let currentBowler = attack.getCurrentBowler();

  let freeHit = false;
  let lastCommentary = (completedOvers === 0)
    ? `🏏 You walk out to open the innings alongside **${partnerName}** (${match.userTeamName}). **${currentBowler.name}** (${currentBowler.style}) takes the new ball!`
    : `🚨 You stride out to the middle at **${posInfo.label}** with **${match.userTeamName}** at **${teamRuns}/${teamWickets}** (${completedOvers}.0 ov). Partnering **${partnerName}** against **${currentBowler.name}** (${currentBowler.style})!`;
  let matchWon = false;
  let timedOut = false;

  const getRenderState = async (stance, footwork, intent, zone, step, hint, fullDeliveryReveal, fieldPreset) => {
    const runsNeed = Math.max(0, targetRuns - teamRuns);
    const ballsRemaining = Math.max(0, totalBallsLimit - (completedOvers * 6 + ballsInCurrentOver));
    const reqRunRate = ballsRemaining > 0 ? ((runsNeed / (ballsRemaining / 6))).toFixed(1) : '0.0';

    const totalBars = 10;
    const progressPercent = Math.min(100, Math.max(0, (teamRuns / targetRuns) * 100));
    const filled = Math.round((progressPercent / 100) * totalBars);
    const progressBar = '▰'.repeat(filled) + '▱'.repeat(totalBars - filled);

    const embed = new EmbedBuilder()
      .setTitle(`${match.title}`)
      .setColor(match.color || '#38bdf8')
      .addFields(
        {
          name: `📊 Team Score: ${match.userTeamName}`,
          value: `🌿 **Pitch:** \`${match.pitch}\`\n` +
                 `**${teamRuns} / ${teamWickets}** (${completedOvers}.${ballsInCurrentOver} / ${totalOvers}.0 ov)\n` +
                 `Target: **${targetRuns}** | Need **${runsNeed} runs** in **${ballsRemaining}b** (RRR: **${reqRunRate}**) | ${progressBar}`,
          inline: false
        },
        {
          name: `🏏 Batting Pair`,
          value: `⭐ **${player.name} (You)*:** **${playerRuns}* (${playerBalls}b)** [${playerFours}x4, ${playerSixes}x6] — \`${(player.batting_hand || 'Right-hand bat').includes('Left') ? 'LHB' : 'RHB'}\`\n` +
                 `👤 **${partnerName}:** **${partnerRuns}* (${partnerBalls}b)** [${partnerFours}x4, ${partnerSixes}x6] — \`${getPlayerHand(partnerName).includes('Left') ? 'LHB' : 'RHB'}\``,
          inline: true
        },
        {
          name: `🥎 Bowler: ${currentBowler.name}`,
          value: `*${currentBowler.style}*\n` +
                 `Spell: **${attack.getBowlerFigureString(currentBowler)}**`,
          inline: true
        }
      );

    if (freeHit) {
      embed.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'You cannot be dismissed on this delivery!' });
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
      embed.setDescription(
        `*Opponent:* **${match.opponentName}** | *Pitch:* \`${match.pitch}\` | *Bowler:* **${currentBowler.name}** (${currentBowler.style})\n\n` +
        `▬▬▬ **Match Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        (hint ? `${hint}\n\n` : '') +
        `👉 **Step 1:** Select your **Stance** at the crease.`
      );
      rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_stance_Off Side_${discordId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_stance_In Line_${discordId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_stance_Leg Side_${discordId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
        )
      ];
    } else if (step === 'footwork') {
      embed.setDescription(
        `*Opponent:* **${match.opponentName}** | *Pitch:* \`${match.pitch}\` | *Bowler:* **${currentBowler.name}** (${currentBowler.style})\n\n` +
        `▬▬▬ **Match Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        (hint ? `${hint}\n\n` : '') +
        `👉 **Step 2:** Select your **Footwork** commitment.`
      );
      rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_footwork_Front Foot_${discordId}`).setLabel('Front Foot').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_footwork_Back Foot_${discordId}`).setLabel('Back Foot').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_footwork_Advanced_${discordId}`).setLabel('Advanced (Step Out)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_footwork_Leave_${discordId}`).setLabel('Leave').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_back_stance_${discordId}`).setLabel('⬅️ Back to Stance').setStyle(ButtonStyle.Secondary)
        )
      ];
    } else if (step === 'leave_confirm') {
      const leaveFw = (footwork && footwork !== 'Leave') ? footwork : 'Front Foot';
      const leaveShot = getPlayerEquippedShot(discordId, leaveFw, 'Leave', 'In Line');
      const leaveType = (footwork && footwork !== 'Leave') ? `${footwork} Leave` : 'Leave';
      embed.setDescription(
        `*Opponent:* **${match.opponentName}** | *Pitch:* \`${match.pitch}\` | *Bowler:* **${currentBowler.name}** (${currentBowler.style})\n\n` +
        `▬▬▬ **Match Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
        `👉 You have committed to a **${leaveType}**.\n` +
        (leaveShot ? `🧘 **Equipped Technique:** \`${leaveShot.num} ${leaveShot.name}\` (${leaveShot.style})\n💬 *"${leaveShot.desc}"*\n\n` : '') +
        `Click **CONFIRM LEAVE** to watch the ball pass through.`
      );
      rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_confirm_${discordId}`).setLabel('🛡️ CONFIRM LEAVE 🏏').setStyle(ButtonStyle.Success)
        )
      ];
    } else if (step === 'intent') {
      embed.setDescription(
        `*Opponent:* **${match.opponentName}** | *Pitch:* \`${match.pitch}\` | *Bowler:* **${currentBowler.name}** (${currentBowler.style})\n\n` +
        `▬▬▬ **Match Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        (hint ? `${hint}\n\n` : '') +
        `👉 **Step 3:** Select your batting **Intent** for this ball.\n\n` +
        `• **Push**: Soft hands / strike rotation (0 or 1 run)\n` +
        `• **Stroke**: Classic ground boundary stroke (1 to 4 runs)\n` +
        `• **Loft**: Aerial boundary power-hitting (4s & 6s)\n` +
        `• **Leave**: Shoulder arms and let the ball pass through`
      );
      rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_intent_Push_${discordId}`).setLabel('Push').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_intent_Stroke_${discordId}`).setLabel('Stroke').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_intent_Loft_${discordId}`).setLabel('Loft').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`tourn_step_intent_Leave_${discordId}`).setLabel('🛡️ Leave').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_back_footwork_${discordId}`).setLabel('⬅️ Back to Footwork').setStyle(ButtonStyle.Secondary)
        )
      ];
    } else if (step === 'zone') {
      embed.setDescription(
        `*Opponent:* **${match.opponentName}** | *Pitch:* \`${match.pitch}\` | *Bowler:* **${currentBowler.name}** (${currentBowler.style})\n\n` +
        `▬▬▬ **Match Commentary** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
        `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
        (equippedShot
          ? `🏏 **Equipped Preset Shot:** \`${equippedShot.num} ${equippedShot.name}\` (${equippedShot.style} • Risk: ${equippedShot.risk})\n💬 *"${equippedShot.desc}"*`
          : (zone ? `🏏 **Projected Shot:** \`${getDerivedShotName(footwork, intent, zone)}\`` : `💡 *Click any field zone to preview your preset shot and aim.*`) )
      );
      rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_zone_Third Man_${discordId}`).setLabel('Third Man').setStyle(zone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`tourn_step_zone_Point_${discordId}`).setLabel('Point').setStyle(zone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`tourn_step_zone_Cover_${discordId}`).setLabel('Cover').setStyle(zone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`tourn_step_zone_Long Off_${discordId}`).setLabel('Long Off').setStyle(zone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_zone_Long On_${discordId}`).setLabel('Long On').setStyle(zone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`tourn_step_zone_Mid Wicket_${discordId}`).setLabel('Mid Wicket').setStyle(zone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`tourn_step_zone_Square Leg_${discordId}`).setLabel('Square Leg').setStyle(zone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`tourn_step_zone_Fine Leg_${discordId}`).setLabel('Fine Leg').setStyle(zone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tourn_step_confirm_${discordId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!zone)
        )
      ];
    }

    const payload = { embeds: [embed], components: rows };
    const isPowerplay = (totalOvers >= 15) ? (completedOvers < 6) : (completedOvers < Math.max(1, Math.floor(totalOvers / 4)));
    const buffer = await generateFieldImage(fieldPreset || 'Balanced', zone, isPowerplay, player.batting_hand);
    if (buffer) {
      const filename = `field_${Date.now()}.png`;
      payload.files = [new AttachmentBuilder(buffer, { name: filename })];
      embed.setImage(`attachment://${filename}`);
    }

    return payload;
  };

  // Main Ball-by-Ball Match Loop
  while (!userIsOut && teamRuns < targetRuns && teamWickets < 10 && completedOvers < totalOvers) {
    // Generate Delivery locked strictly to active bowler's craft (Pace or Spin)
    const bowlInput = generateBowlerDelivery(match.pitch, currentBowler.type);
    const hint = getReleaseHint(bowlInput.line, bowlInput.length, bowlInput.speed, bowlInput.variation);
    const fullDeliveryReveal = `🥎 **${currentBowler.name} (${currentBowler.style})** bowls a **${bowlInput.speed} ${bowlInput.variation}** pitched **${bowlInput.length}** on **${bowlInput.line}**!`;

    let selectedStance = null;
    let selectedFootwork = null;
    let selectedIntent = null;
    let selectedZone = null;
    let batStep = 'stance';

    const runBatChoice = async () => {
      const stateData = await getRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, batStep, hint, fullDeliveryReveal, bowlInput.fieldPreset);
      await message.edit(stateData).catch(async () => {
        if (message.channel?.send) message = await message.channel.send(stateData).catch(() => message);
      });

      const filter = idx => idx.user.id === discordId && idx.customId.startsWith('tourn_step_');
      const collectResult = await new Promise((resolveChoice) => {
        const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
        collector.on('collect', async idx => {
          await idx.deferUpdate().catch(() => {});
          const customId = idx.customId;

          if (customId.startsWith('tourn_step_stance_')) {
            selectedStance = customId.replace('tourn_step_stance_', '').replace(`_${discordId}`, '');
            batStep = 'footwork';
            resolveChoice('next');
          } else if (customId.startsWith('tourn_step_footwork_')) {
            selectedFootwork = customId.replace('tourn_step_footwork_', '').replace(`_${discordId}`, '');
            batStep = (selectedFootwork === 'Leave') ? 'leave_confirm' : 'intent';
            resolveChoice('next');
          } else if (customId.startsWith('tourn_step_back_stance_')) {
            selectedStance = null;
            batStep = 'stance';
            resolveChoice('next');
          } else if (customId.startsWith('tourn_step_intent_')) {
            selectedIntent = customId.replace('tourn_step_intent_', '').replace(`_${discordId}`, '');
            batStep = (selectedIntent === 'Leave') ? 'leave_confirm' : 'zone';
            selectedZone = null;
            resolveChoice('next');
          } else if (customId.startsWith('tourn_step_back_footwork_')) {
            selectedFootwork = null;
            batStep = 'footwork';
            resolveChoice('next');
          } else if (customId.startsWith('tourn_step_zone_')) {
            selectedZone = customId.replace('tourn_step_zone_', '').replace(`_${discordId}`, '');
            resolveChoice('next');
          } else if (customId.startsWith('tourn_step_confirm_')) {
            if (selectedFootwork === 'Leave' || selectedIntent === 'Leave' || selectedZone) {
              resolveChoice('submit');
            } else {
              resolveChoice('next');
            }
          }
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time' && collected.size === 0) {
            resolveChoice('timeout');
          }
        });
      });

      if (collectResult === 'next') {
        return await runBatChoice();
      } else if (collectResult === 'timeout') {
        return { timedOut: true };
      } else {
        const effectiveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
        const equippedShot = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
          ? getPlayerEquippedShot(discordId, effectiveFw, 'Leave', 'In Line')
          : (selectedZone ? getPlayerEquippedShot(discordId, selectedFootwork, selectedIntent, selectedZone) : null);
        return {
          stance: selectedStance || 'In Line',
          footwork: selectedFootwork,
          intent: selectedIntent,
          zone: selectedZone,
          equippedShot
        };
      }
    };

    const batterInput = await runBatChoice();
    if (!batterInput || batterInput.timedOut) {
      timedOut = true;
      break;
    }

    // Resolve Delivery Outcome
    const batterTimingVal = (playerAttrs.timing || 50) + (eqBonuses.timing || 0);
    let perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
    let slightlyChance = Math.max(0.10, 0.985 - perfectChance);

    let timingResult = 'Perfect';
    const roll = Math.random();
    if (roll < perfectChance) timingResult = 'Perfect';
    else if (roll < perfectChance + slightlyChance) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
    else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';

    const isPowerplay = (totalOvers >= 15) ? (completedOvers < 6) : (completedOvers < Math.max(1, Math.floor(totalOvers / 4)));
    const ballsRemaining = Math.max(0, totalBallsLimit - (completedOvers * 6 + ballsInCurrentOver));
    const isClutch = (ballsRemaining <= 6) && (targetRuns - teamRuns <= 16);

    const simResult = simulateBallAdvanced({
      bowlerInput: bowlInput,
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

    teamRuns += simResult.runs;
    playerRuns += simResult.runs;

    attack.recordBall(simResult.runs, simResult.wicket, simResult.rebowl);

    if (simResult.runs === 4 && !simResult.wicket) playerFours++;
    if (simResult.runs === 6 && !simResult.wicket) playerSixes++;

    let overEndedOnUser = false;
    if (!simResult.rebowl) {
      playerBalls++;
      ballsInCurrentOver++;
      if (ballsInCurrentOver >= 6) {
        const overChange = attack.completeOver();
        completedOvers = attack.completedOvers;
        ballsInCurrentOver = 0;
        overEndedOnUser = true;
        if (overChange.nextBowler) {
          currentBowler = overChange.nextBowler;
        }
      }
    }

    if (simResult.wicket) {
      userIsOut = true;
      teamWickets++;
      userDismissalText = simResult.commentary;
    }

    freeHit = simResult.nextIsFreeHit;

    let confChange = -2;
    if (simResult.runs >= 4) confChange = 6;
    else if (simResult.runs > 0) confChange = 2;
    else if (simResult.wicket) confChange = -15;

    player.confidence = Math.min(100, Math.max(10, player.confidence + confChange));
    db.prepare('UPDATE players SET confidence = ? WHERE discord_id = ?').run(player.confidence, discordId);

    const shotDesc = (batterInput.footwork === 'Leave' || batterInput.intent === 'Leave')
      ? 'Shouldered Arms (Leave)'
      : `${batterInput.footwork} ${batterInput.intent} to ${batterInput.zone} (${batterInput.equippedShot ? batterInput.equippedShot.name : getDerivedShotName(batterInput.footwork, batterInput.intent, batterInput.zone)})`;

    lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                     `👉 **Your Shot:** ${shotDesc}\n` +
                     `⏱️ **Timing:** ${simResult.timing}\n\n` +
                     `${simResult.commentary}`;

    if (overEndedOnUser && completedOvers < totalOvers && !userIsOut) {
      lastCommentary += `\n\n🔄 **End of Over (${completedOvers}.0 ov):** **${currentBowler.name}** (${currentBowler.style}) comes into the attack from the Pavilion End! [Spell: ${attack.getBowlerFigureString(currentBowler)}]`;
    }

    // Render immediate Delivery Outcome Card
    const outcomeColor = simResult.wicket
      ? '#ef4444'
      : (simResult.runs === 6 ? '#8b5cf6' : (simResult.runs === 4 ? '#10b981' : (simResult.runs > 0 ? '#3b82f6' : '#64748b')));
    const outcomeTitle = simResult.wicket
      ? `💔 WICKET! (${simResult.dismissalType ? simResult.dismissalType.toUpperCase() : 'OUT'})`
      : (simResult.runs === 6
          ? '💥 MAXIMUM! SIX RUNS! 🚀'
          : (simResult.runs === 4
              ? '🔥 FOUR! BOUNDARY HIT! ⚡'
              : (simResult.runs > 0 ? `🏃 ${simResult.runs} ${simResult.runs === 1 ? 'Run' : 'Runs'} Scored` : '🛡️ Dot Ball (0 Runs)')));

    const runsNeedAfter = Math.max(0, targetRuns - teamRuns);
    const ballsLeftAfter = Math.max(0, totalBallsLimit - (completedOvers * 6 + ballsInCurrentOver));

    const deliveryEmbed = new EmbedBuilder()
      .setTitle(`${outcomeTitle} — ${match.title}`)
      .setColor(outcomeColor)
      .setDescription(
        `▬▬▬ **Delivery & Shot Breakdown** ▬▬▬\n` +
        `🥎 **Bowler:** ${currentBowler.name} (${currentBowler.style} • ${bowlInput.speed} ${bowlInput.variation})\n` +
        `👉 **Your Shot:** **${shotDesc}**\n` +
        `⏱️ **Timing:** \`${simResult.timing}\`\n\n` +
        `${simResult.commentary}\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
      )
      .addFields(
        { name: '📊 Team Score', value: `**${teamRuns} / ${teamWickets}** (${completedOvers}.${ballsInCurrentOver} / ${totalOvers}.0 ov)`, inline: true },
        { name: '🎯 Target Equation', value: runsNeedAfter === 0 ? '🏆 **Target Chased!**' : `Need **${runsNeedAfter} runs** off **${ballsLeftAfter} balls**`, inline: true },
        { name: '🏏 Your Card', value: `**${playerRuns}${userIsOut ? '' : '*'} (${playerBalls}b)** [${playerFours}x4, ${playerSixes}x6]`, inline: true }
      );

    if (freeHit) {
      deliveryEmbed.addFields({ name: '🚨 FREE HIT', value: 'The bowler bowled a No Ball! Next delivery is a **FREE HIT**!', inline: false });
    }

    await message.edit({ embeds: [deliveryEmbed], components: [], files: [], attachments: [] }).catch(async () => {
      if (message.channel?.send) message = await message.channel.send({ embeds: [deliveryEmbed] }).catch(() => message);
    });

    await sleep(2200);

    // Immediate Check: Did this delivery win the match?
    if (teamRuns >= targetRuns) {
      matchWon = true;
      break;
    }

    // Did user get dismissed?
    if (userIsOut) {
      break;
    }

    // Check strike rotation
    const userScoredOdd = (!simResult.rebowl && (simResult.runs === 1 || simResult.runs === 3));
    userOnStrike = (userScoredOdd === overEndedOnUser);

    // Partner Batting Simulation while User is at Non-Striker's End
    if (!userOnStrike && completedOvers < totalOvers && teamRuns < targetRuns && teamWickets < 10) {
      const partnerLogs = [];

      while (!userOnStrike && completedOvers < totalOvers && teamRuns < targetRuns && teamWickets < 10) {
        ballsInCurrentOver++;
        let pOverEnded = false;

        const pRoll = Math.random();
        let pRuns = 0;
        let pText = '';
        let isPartnerOut = false;

        const isTopOrder = (teamWickets <= 3);
        const isMiddleOrder = (teamWickets >= 4 && teamWickets <= 6);
        const isTail = (teamWickets >= 7);

        const ballsLeftInMatch = Math.max(1, (totalOvers - completedOvers) * 6 - ballsInCurrentOver);
        const runsLeftInMatch = Math.max(0, targetRuns - teamRuns);
        const liveRRR = runsLeftInMatch / (ballsLeftInMatch / 6);
        const highPressure = liveRRR > 10.5;

        const pDeck = (match.pitch || '').toLowerCase();
        const isToughPitch = pDeck.includes('green') || pDeck.includes('seam') || pDeck.includes('dry') || pDeck.includes('dust') || pDeck.includes('turn');
        const bowlerRating = currentBowler?.rating || match.bowlerSkill || 60;

        let dotProb = isTail ? 0.52 : (isMiddleOrder ? 0.44 : 0.36);
        if (isToughPitch) dotProb += 0.05;
        if (bowlerRating >= 75) dotProb += 0.04;

        let singleProb = isTail ? 0.28 : (isMiddleOrder ? 0.34 : 0.36);
        let twoProb = isTail ? 0.04 : 0.07;
        let threeProb = 0.01;
        let fourProb = isTail ? 0.04 : (isMiddleOrder ? 0.06 : 0.08);
        let sixProb = isTail ? 0.01 : (isMiddleOrder ? 0.02 : 0.03);

        if (highPressure) {
          fourProb = Math.max(0.02, fourProb - 0.02);
          sixProb = Math.max(0.01, sixProb - 0.01);
        }

        const dotCutoff = dotProb;
        const singleCutoff = dotCutoff + singleProb;
        const twoCutoff = singleCutoff + twoProb;
        const threeCutoff = twoCutoff + threeProb;
        const fourCutoff = threeCutoff + fourProb;
        const sixCutoff = fourCutoff + sixProb;

        if (freeHit) {
          freeHit = false;
          if (pRoll < 0.45) {
            pRuns = 1;
            pText = `${partnerName} pulls the Free Hit into the deep for a single (+1 run, strike rotated!).`;
          } else if (pRoll < 0.80) {
            pRuns = 4;
            partnerFours++;
            pText = `${partnerName} crunches the Free Hit through extra cover for FOUR! (+4 runs)`;
          } else {
            pRuns = 6;
            partnerSixes++;
            pText = `${partnerName} smokes the Free Hit high and handsome into the stands for a huge SIX! (+6 runs)`;
          }
        } else if (pRoll < dotCutoff) {
          pRuns = 0;
          const dots = [
            `${partnerName} defends solidly on the front foot (0 runs).`,
            `${partnerName} is beaten outside off by a sharp ${currentBowler.style} delivery (0 runs).`,
            `${partnerName} pushes softly to mid-off, no run taken (0 runs).`,
            `${partnerName} leaves the ball alone outside off-stump (0 runs).`
          ];
          pText = dots[Math.floor(Math.random() * dots.length)];
        } else if (pRoll < singleCutoff) {
          pRuns = 1;
          const singles = [
            `${partnerName} works it into the gap at mid-wicket for a single (+1 run, strike rotated!).`,
            `${partnerName} pushes down to long-on for a brisk single (+1 run, strike rotated!).`,
            `${partnerName} drops it towards square leg and calls you through for one (+1 run, strike rotated!).`,
            `${partnerName} taps it gently to cover-point and scrambles across (+1 run, strike rotated!).`
          ];
          pText = singles[Math.floor(Math.random() * singles.length)];
        } else if (pRoll < twoCutoff) {
          pRuns = 2;
          pText = `${partnerName} clips off the pads and sprints back with you for a tight two (+2 runs).`;
        } else if (pRoll < threeCutoff) {
          pRuns = 3;
          pText = `${partnerName} punches through extra cover and you run three hard (+3 runs, strike rotated!).`;
        } else if (pRoll < fourCutoff) {
          pRuns = 4;
          partnerFours++;
          const fours = [
            `${partnerName} leans into a glorious drive through the covers for FOUR! (+4 runs)`,
            `${partnerName} pulls firmly behind square leg for a cracking FOUR! (+4 runs)`,
            `${partnerName} opens the face and steers it past point for FOUR! (+4 runs)`
          ];
          pText = fours[Math.floor(Math.random() * fours.length)];
        } else if (pRoll < sixCutoff) {
          pRuns = 6;
          partnerSixes++;
          pText = `${partnerName} clears the front leg and deposits it over the rope for SIX! (+6 runs)`;
        } else {
          pRuns = 0;
          isPartnerOut = true;
          teamWickets++;
          pText = `🚨 ${partnerName} is CAUGHT in the deep! Wicket falls!`;
        }

        attack.recordBall(pRuns, isPartnerOut, false);
        if (ballsInCurrentOver >= 6) {
          const overChange = attack.completeOver();
          completedOvers = attack.completedOvers;
          ballsInCurrentOver = 0;
          pOverEnded = true;
          if (overChange.nextBowler) {
            currentBowler = overChange.nextBowler;
          }
        }

        teamRuns += pRuns;
        partnerRuns += pRuns;
        partnerBalls++;

        const currentOverStr = pOverEnded ? `${completedOvers}.0` : `${completedOvers}.${ballsInCurrentOver}`;
        partnerLogs.push(`• **[${currentOverStr}]** ${pText}`);

        if (pOverEnded && completedOvers < totalOvers) {
          partnerLogs.push(`🔄 **End of Over (${completedOvers}.0 ov):** **${currentBowler.name}** (${currentBowler.style}) comes into the attack.`);
        }

        if (isPartnerOut) {
          if (teamWickets < 10) {
            partnerName = (validTeamRoster && validTeamRoster.length > 0)
              ? validTeamRoster[reserveIdx++ % validTeamRoster.length]
              : `Batter ${teamWickets + 1}`;
            partnerRuns = 0;
            partnerBalls = 0;
            partnerFours = 0;
            partnerSixes = 0;
            partnerLogs.push(`👉 *New batsman **${partnerName}** walks to the crease.* `);
          }
          userOnStrike = pOverEnded;
        } else {
          const pScoredOdd = (pRuns === 1 || pRuns === 3);
          userOnStrike = (pScoredOdd !== pOverEnded);
        }

        if (teamRuns >= targetRuns) {
          matchWon = true;
          break;
        }

        if (teamWickets >= 10 || completedOvers >= totalOvers) {
          break;
        }

        const bLeft = Math.max(0, totalBallsLimit - (completedOvers * 6 + ballsInCurrentOver));
        const partnerEmbed = new EmbedBuilder()
          .setTitle(`🏏 Partner on Strike — ${match.userTeamName} vs ${match.opponentName}`)
          .setColor('#f59e0b')
          .setDescription(
            `🏃 **You are at the non-striker's end watching ${partnerName} (${getPlayerHand(partnerName).includes('Left') ? 'LHB' : 'RHB'}) bat.**\n\n` +
            `🥎 **Bowler:** ${currentBowler.name} (${currentBowler.style})\n` +
            `Spell: **${attack.getBowlerFigureString(currentBowler)}**\n` +
            partnerLogs.slice(-3).join('\n') + `\n\n` +
            `📊 **Team Score:** **${teamRuns}/${teamWickets}** (Target: **${targetRuns}**)\n` +
            `Overs: **${currentOverStr}** / ${totalOvers}.0 | Need **${Math.max(0, targetRuns - teamRuns)}** runs off **${bLeft}** balls\n` +
            `⭐ **Your Score:** **${playerRuns}* (${playerBalls}b)** | 👤 **${partnerName}:** **${partnerRuns}* (${partnerBalls}b)**`
          );

        await message.edit({ embeds: [partnerEmbed], components: [], files: [], attachments: [] }).catch(() => {});
        await sleep(1600);
      }

      lastCommentary = `🏃 **Partner's Stint at Crease:**\n` + partnerLogs.slice(-3).join('\n');
    }

  }

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle('⚠️ Match Forfeited due to Inactivity')
      .setDescription('You did not respond within 15 minutes! The match has ended and is recorded as a **Defeat**.')
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [] }).catch(() => {});
    return onFinishCallback(false, { runs: playerRuns, balls: playerBalls, fours: playerFours, sixes: playerSixes, wickets: Math.max(1, teamWickets), teamRuns, teamWickets, forfeit: true }, message);
  }

  // 3. Post-Dismissal Rest of Innings Simulation
  if (userIsOut && !matchWon && teamRuns < targetRuns && teamWickets < 10 && completedOvers < totalOvers) {
    const dismissEmbed = new EmbedBuilder()
      .setTitle(`💔 WICKET! You departed for ${playerRuns} runs — ${match.userTeamName}`)
      .setColor('#ef4444')
      .setDescription(
        `You depart after scoring **${playerRuns} runs off ${playerBalls} balls** (${playerFours}x4, ${playerSixes}x6).\n` +
        `💬 *${userDismissalText || 'Dismissed by a fine delivery.'}*\n\n` +
        `You walk off to supportive applause from the team dugout.\n` +
        `🔮 **Simulating the remaining overs of the chase...**`
      )
      .addFields(
        { name: '📊 Team Score', value: `**${teamRuns}/${teamWickets}** (Need **${targetRuns - teamRuns} runs** in **${totalBallsLimit - (completedOvers * 6 + ballsInCurrentOver)}b**)`, inline: true }
      );

    await message.edit({ embeds: [dismissEmbed], components: [], files: [], attachments: [] }).catch(() => {});
    await sleep(3000);

    const wasDuck = (playerRuns === 0);
    const wasLowScore = (playerRuns < 12);
    let shockOversRemaining = wasDuck ? 3 : (wasLowScore ? 2 : 0);

    const pitchLower = (match.pitch || '').toLowerCase();
    const isToughPitch = pitchLower.includes('green') || pitchLower.includes('seam') || pitchLower.includes('dry') || pitchLower.includes('dust') || pitchLower.includes('turn') || pitchLower.includes('slow');
    const isBattingPitch = pitchLower.includes('flat') || pitchLower.includes('belter');
    const diffLower = (match.difficulty || 'Normal').toLowerCase();
    const isHardDiff = diffLower.includes('hard') || diffLower.includes('expert') || diffLower.includes('legend');
    const oppBowlerSkill = match.bowlerSkill || match.opponentTeam?.bowlerSkill || match.opponentTeam?.rating || 60;

    const postSimLines = [
      wasDuck
        ? `🔮 **Chasing ${targetRuns} runs — Duck shock! The dugout is stunned and the middle order faces immense pressure...**\n`
        : `🔮 **Chasing ${targetRuns} runs — Remaining overs simulation:**\n`
    ];

    while (completedOvers < totalOvers && teamRuns < targetRuns && teamWickets < 10) {
      await sleep(1400);
      completedOvers++;
      const needed = targetRuns - teamRuns;
      const ballsRem = (totalOvers - completedOvers + 1) * 6;
      const reqRate = needed / (ballsRem / 6);

      // 1. Base over runs based on batting order position (tailenders score far less!)
      let baseOverRuns = 7;
      if (teamWickets <= 3) {
        if (reqRate >= 8 && reqRate <= 11) {
          baseOverRuns = 7 + Math.floor(Math.random() * 5); // 7 - 11 runs (avg 9.0)
        } else if (reqRate > 11) {
          baseOverRuns = 8 + Math.floor(Math.random() * 5); // 8 - 12 runs
        } else {
          baseOverRuns = 6 + Math.floor(Math.random() * 4); // 6 - 9 runs
        }
      } else if (teamWickets <= 6) {
        if (reqRate > 10) {
          baseOverRuns = 6 + Math.floor(Math.random() * 5); // 6 - 10 runs
        } else {
          baseOverRuns = 5 + Math.floor(Math.random() * 4); // 5 - 8 runs
        }
      } else {
        // Tailenders (7+ wickets down)
        baseOverRuns = 3 + Math.floor(Math.random() * 4); // 3 - 6 runs (avg 4.5)
      }

      // 2. Duck Shock / Top-order collapse effect
      if (shockOversRemaining > 0) {
        shockOversRemaining--;
        baseOverRuns = Math.max(2, baseOverRuns - 3);
      }

      // 3. Pitch & bowling attack adjustments
      if (isToughPitch) baseOverRuns -= 1;
      if (isBattingPitch) baseOverRuns += 1;
      if (oppBowlerSkill >= 75) baseOverRuns -= 1;
      if (isHardDiff) baseOverRuns -= 1;

      let overRuns = Math.max(1, baseOverRuns);

      // 4. Dynamic Wicket Probability
      let wicketChance = 0.18;
      if (teamWickets <= 3) wicketChance = 0.16;
      else if (teamWickets <= 6) wicketChance = 0.26;
      else wicketChance = 0.44; // Tailenders get cleaned up quickly

      // High RRR increases risk of wickets
      if (reqRate > 14) wicketChance += 0.25;
      else if (reqRate > 11.5) wicketChance += 0.18;
      else if (reqRate > 9.5) wicketChance += 0.10;
      else if (reqRate <= 6.5) wicketChance -= 0.08;

      // Duck shock in early overs after dismissal
      if (shockOversRemaining > 0) wicketChance += 0.18;

      // Pitch & bowler strength
      if (isToughPitch) wicketChance += 0.06;
      if (oppBowlerSkill >= 75) wicketChance += 0.06;
      if (isHardDiff) wicketChance += 0.06;

      wicketChance = Math.min(0.80, Math.max(0.08, wicketChance));

      // Check if target chased in this over
      if (teamRuns + overRuns >= targetRuns) {
        const ballsTaken = Math.min(6, Math.max(1, Math.ceil(needed / 2)));
        teamRuns = targetRuns;
        ballsInCurrentOver = ballsTaken;
        postSimLines.push(`🔹 **Over ${completedOvers}.${ballsInCurrentOver}:** ${teamRuns}/${teamWickets} — 🎉 **Target Chased! Winning runs hit!**`);
        matchWon = true;
        break;
      }

      teamRuns += overRuns;

      // Check for wicket(s)
      if (Math.random() < wicketChance) {
        teamWickets++;
        // Possibility of a double-wicket over under extreme pressure
        if (teamWickets < 10 && (reqRate > 11.5 || teamWickets >= 7) && Math.random() < 0.35) {
          teamWickets++;
          overRuns = Math.max(1, overRuns - 3);
          postSimLines.push(`🚨 **Over ${completedOvers}:** ${teamRuns}/${teamWickets} — 💥 **DOUBLE WICKET OVER!** Opponent strikes twice!`);
        } else {
          postSimLines.push(`🚨 **Over ${completedOvers}:** ${teamRuns}/${teamWickets} — 💥 **WICKET FALLS!** (Need ${Math.max(0, targetRuns - teamRuns)} off ${(totalOvers - completedOvers) * 6}b)`);
        }

        if (teamWickets >= 10) {
          postSimLines.push(`💥 **ALL OUT!** The batting order collapses for ${teamRuns}!`);
          break;
        }
      } else {
        postSimLines.push(`🔹 **Over ${completedOvers}:** ${teamRuns}/${teamWickets} (Need ${Math.max(0, targetRuns - teamRuns)} off ${(totalOvers - completedOvers) * 6}b, RRR: ${((targetRuns - teamRuns) / Math.max(1, totalOvers - completedOvers)).toFixed(1)})`);
      }

      dismissEmbed.setDescription(postSimLines.slice(-5).join('\n'));
      await message.edit({ embeds: [dismissEmbed] }).catch(() => {});
    }

    await sleep(1500);
  }

  const won = matchWon || (teamRuns >= targetRuns);
  await onFinishCallback(won, {
    runs: playerRuns,
    balls: playerBalls,
    fours: playerFours,
    sixes: playerSixes,
    wickets: userIsOut ? 1 : 0,
    teamRuns,
    teamWickets,
    partnerName,
    partnerRuns,
    partnerBalls
  }, message);
}

/**
 * Bowling Loop for Bowlers (In-Place Edit for every ball with over-locked delivery craft)
 */
async function runBowlingLoop(interaction, player, match, message, onFinishCallback) {
  const discordId = player.discord_id;
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const isSpin = player.bowling_style?.toLowerCase().includes('spin') ?? false;

  const bowlChoices = Object.entries(deliveries)
    .filter(([k, v]) => isSpin ? v.type === 'spin' : v.type === 'fast')
    .map(([k, v]) => ({ label: v.name, value: k, description: v.desc.substring(0, 100) }));

  const target = match.targetRuns;
  let oppRuns = 0;
  let oppWickets = 0;
  let ballsBowled = 0;
  let runsConceded = 0;
  let wicketsTaken = 0;
  let lastCommentary = `🥎 You mark out your run-up and inspect the ${match.pitch} deck...`;
  let matchEnded = false;
  let timedOut = false;

  const getMenuRow = (promptText) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`tourn_bowl_${discordId}`)
      .setPlaceholder(promptText)
      .addOptions(bowlChoices.slice(0, 25))
  );

  const totalDeliveries = (match.ballsLimit >= 60) ? 24 : match.ballsLimit;

  for (let b = 1; b <= totalDeliveries; b++) {
    if (oppRuns >= target || oppWickets >= 10) {
      matchEnded = true;
      break;
    }

    const currentOver = Math.floor((b - 1) / 6) + 1;
    const ballInOver = ((b - 1) % 6) + 1;
    const matchBallsLeft = Math.max(0, match.ballsLimit - (b - 1));

    const embed = new EmbedBuilder()
      .setTitle(`🥎 Bowling Spell: ${match.title}`)
      .setColor('#e74c3c')
      .setDescription(
        `*Opponent:* **${match.opponentName}** | *Pitch:* \`${match.pitch}\` | *Your Style:* **${player.bowling_style || (isSpin ? 'Spin' : 'Fast')}**\n\n` +
        `▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `👉 **Delivery ${currentOver}.${ballInOver}:** Choose your bowling variation below!`
      )
      .addFields(
        { name: '📊 Opponent Chase', value: `Score: **${oppRuns}/${oppWickets}** (Target: **${target}**)\nMatch Balls Remaining: **${matchBallsLeft}**`, inline: true },
        { name: '🎯 Required Equations', value: `Need **${Math.max(0, target - oppRuns)} runs** off **${matchBallsLeft} balls**`, inline: true },
        { name: '🥎 Your Figures', value: `**${wicketsTaken}/${runsConceded}** in **${((b - 1) / 6).toFixed(1)} ov** (Spell: **${totalDeliveries - (b - 1)}b** left)`, inline: true }
      );

    await message.edit({ embeds: [embed], components: [getMenuRow(`Select delivery for ball ${currentOver}.${ballInOver}...`)], files: [] }).catch(async () => {
      if (message.channel?.send) message = await message.channel.send({ embeds: [embed], components: [getMenuRow(`Select delivery for ball ${currentOver}.${ballInOver}...`)] }).catch(() => message);
    });

    const filter = idx => idx.customId === `tourn_bowl_${discordId}` && idx.user.id === discordId;
    const deliveryKey = await new Promise((resolveDelivery) => {
      const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
      collector.on('collect', i => {
        i.deferUpdate().catch(() => {});
        resolveDelivery(i.values[0]);
      });
      collector.on('end', collected => {
        if (collected.size === 0) resolveDelivery(null);
      });
    });

    if (!deliveryKey) {
      timedOut = true;
      break;
    }

    const aiShotKey = chooseAiShot(deliveryKey);

    const bowlingSkill = isSpin
      ? (playerAttrs.spin_bowling || 10) + (eqBonuses.spin_bowling || 0)
      : (playerAttrs.swing || 10) + (eqBonuses.swing || 0);
    const accuracy = (playerAttrs.accuracy || 10) + (eqBonuses.accuracy || 0);
    const bowlerPowerRating = (bowlingSkill * 0.5) + (accuracy * 0.5);

    const simResult = simulateBall({
      deliveryKey,
      shotKey: aiShotKey,
      playerAttrs: { timing: 50, power: 50, technique: 50 },
      eqBonuses: {},
      activeSkills: [],
      confidence: 50,
      bowlerSkill: bowlerPowerRating
    });

    const runsOnBall = simResult.wicket ? 0 : simResult.runs;
    oppRuns += runsOnBall;
    runsConceded += runsOnBall;
    ballsBowled++;
    if (simResult.wicket) {
      oppWickets++;
      wicketsTaken++;
    }

    lastCommentary = `🥎 **You bowled:** ${deliveries[deliveryKey]?.name || deliveryKey}\n🎯 **Batsman played:** ${shots[aiShotKey]?.name || aiShotKey}\n\n${simResult.commentary}`;

    const outcomeColor = simResult.wicket ? '#10b981' : (runsOnBall >= 4 ? '#ef4444' : '#3b82f6');
    const outcomeTitle = simResult.wicket
      ? '🎯 WICKET TAKEN! EXCELLENT BALL!'
      : (runsOnBall === 6
          ? '💥 Opponent hit a SIX!'
          : (runsOnBall === 4 ? '🔥 Opponent hit a FOUR!' : (runsOnBall > 0 ? `🏃 ${runsOnBall} Runs Conceded` : '🛡️ Dot Ball Bowled!')));

    const bowlOutcomeEmbed = new EmbedBuilder()
      .setTitle(`${outcomeTitle} — ${match.title}`)
      .setColor(outcomeColor)
      .setDescription(
        `▬▬▬ **Spell Delivery Breakdown** ▬▬▬\n` +
        `🥎 **Your Delivery:** **${deliveries[deliveryKey]?.name || deliveryKey}**\n` +
        `🎯 **Batsman Played:** **${shots[aiShotKey]?.name || aiShotKey}**\n\n` +
        `${simResult.commentary}\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
      )
      .addFields(
        { name: '📊 Opponent Chase', value: `Score: **${oppRuns}/${oppWickets}** (Target: **${target}**) | Need **${Math.max(0, target - oppRuns)}** in **${Math.max(0, match.ballsLimit - ballsBowled)}b**`, inline: true },
        { name: '🥎 Your Figures', value: `**${wicketsTaken}/${runsConceded}** in **${((ballsBowled) / 6).toFixed(1)} ov**`, inline: true }
      );

    await message.edit({ embeds: [bowlOutcomeEmbed], components: [], files: [], attachments: [] }).catch(async () => {
      if (message.channel?.send) message = await message.channel.send({ embeds: [bowlOutcomeEmbed] }).catch(() => message);
    });

    await sleep(2200);

    if (oppRuns >= target || oppWickets >= 10) {
      matchEnded = true;
      break;
    }
  }

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle('⚠️ Match Forfeited due to Inactivity')
      .setDescription('You did not respond within 15 minutes! The match has ended.')
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [] }).catch(() => {});
    return onFinishCallback(false, { runs: 0, balls: ballsBowled, fours: 0, sixes: 0, wickets: wicketsTaken, teamRuns: oppRuns, teamWickets: oppWickets, forfeit: true }, message);
  }

  // If spell finished with overs remaining in match, simulate rest of innings
  if (!matchEnded && oppRuns < target && oppWickets < 10 && ballsBowled < match.ballsLimit) {
    const remBalls = match.ballsLimit - ballsBowled;
    const remOvers = Math.ceil(remBalls / 6);
    const spellFinishEmbed = new EmbedBuilder()
      .setTitle(`🏁 Spell Completed: ${wicketsTaken}/${runsConceded} (${(ballsBowled / 6).toFixed(1)} ov)`)
      .setColor('#38bdf8')
      .setDescription(
        `You have bowled your maximum quota of **${(ballsBowled / 6).toFixed(0)} overs**!\n` +
        `Simulating the remaining **${remOvers} overs** from the rest of the bowling attack...`
      );
    await message.edit({ embeds: [spellFinishEmbed], components: [] }).catch(() => {});
    await sleep(2000);

    for (let o = 1; o <= remOvers; o++) {
      if (oppRuns >= target || oppWickets >= 10) break;
      const bRem = (remOvers - o + 1) * 6;
      const rNeeded = target - oppRuns;
      const rrr = rNeeded / (bRem / 6);

      let overRuns = 6;
      if (oppWickets <= 3) overRuns = 6 + Math.floor(Math.random() * 4);
      else if (oppWickets <= 6) overRuns = 4 + Math.floor(Math.random() * 4);
      else overRuns = 2 + Math.floor(Math.random() * 4);

      if (rrr > 11.5) overRuns += Math.floor(Math.random() * 3);
      else if (rrr < 6) overRuns = Math.min(overRuns, 7);

      oppRuns += Math.max(1, overRuns);

      let wChance = oppWickets >= 7 ? 0.55 : (oppWickets >= 4 ? 0.38 : 0.25);
      if (rrr > 13) wChance += 0.25;
      else if (rrr > 10.5) wChance += 0.14;

      if (Math.random() < wChance) {
        oppWickets++;
      }
    }
  }

  const won = (oppRuns < target);
  await onFinishCallback(won, { runs: 0, balls: ballsBowled, fours: 0, sixes: 0, wickets: wicketsTaken, teamRuns: oppRuns, teamWickets: oppWickets }, message);
}
