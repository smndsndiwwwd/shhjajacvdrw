import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import db from '../database/db.js';
import { franchiseLeagues, getFranchiseTeamRoster, getFranchiseTeamBowlers } from '../game/franchiseLeagues.js';
import { deliveries, shots, simulateBall, simulateBallAdvanced, getReleaseHint, getDerivedShotName, generateBowlerDelivery, pickBowlerTypeForOver, getOverBowler, getPlayerBattingPosition } from '../game/engine.js';
import { getPlayerEquippedShot } from '../game/shotmap.js';
import { generateFieldImage } from './challenge.js';
import { getEffectiveAttributes, getEquipmentBonuses, consumeEnergy, updateAndGetEnergy } from '../game/utils.js';
import { emojis } from '../game/emojis.js';
import { BowlingAttackManager } from '../game/bowlingAttack.js';
import { setPlayerInMatch, clearPlayerInMatch } from '../game/matchState.js';
import { getPlayerHand } from './tournament.js';

let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back.');
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const activeAuctions = new Set();
const activeFranchiseMatches = new Set();

export async function safeReplyOrEdit(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    } else {
      return await interaction.reply(payload);
    }
  } catch (err) {
    console.error('safeReplyOrEdit interaction error, falling back to channel.send:', err?.message || err);
    if (interaction.channel?.send) {
      return await interaction.channel.send(payload).catch(e => {
        console.error('channel.send fallback error:', e?.message || e);
      });
    }
  }
}

export async function handleFranchise(interaction) {
  const isButton = interaction.isButton?.() ?? false;
  if (isButton) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }
  } else {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }
  }

  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    const msg = '❌ You do not have a career player yet! Use `/begin` to create your player.';
    if (isButton) {
      return interaction.followUp({ content: msg, flags: ['Ephemeral'] }).catch(() => {});
    } else {
      return safeReplyOrEdit(interaction, { content: msg });
    }
  }

  // Ensure record in player_franchise exists
  db.prepare('INSERT OR IGNORE INTO player_franchise (player_id) VALUES (?)').run(discordId);
  const playerFranchise = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(discordId);

  // Check cooldown
  if (playerFranchise.status === 'completed' || playerFranchise.cooldown_until > Date.now()) {
    const timeLeft = playerFranchise.cooldown_until - Date.now();
    if (timeLeft > 0) {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return safeReplyOrEdit(interaction, {
        content: `⏳ **Franchise Cooldown**: You are resting after your last campaign. You can register for a new T20 franchise league in **${days} days and ${hours} hours**!`,
        embeds: [],
        files: [],
        attachments: [],
        components: []
      });
    } else {
      // Cooldown expired
      db.prepare("UPDATE player_franchise SET status = 'none', league_id = NULL, team_id = NULL WHERE player_id = ?").run(discordId);
      playerFranchise.status = 'none';
      playerFranchise.league_id = null;
      playerFranchise.team_id = null;
    }
  }

  if (playerFranchise.status === 'none') {
    return showLeagueSelection(interaction, discordId, player);
  }

  if (playerFranchise.status === 'registered' || playerFranchise.status === 'auction') {
    return showAuctionRoom(interaction, discordId, player, playerFranchise);
  }

  if (playerFranchise.status === 'active') {
    return showActiveDashboard(interaction, discordId, player, playerFranchise);
  }
}

// 1. LEAGUE SELECTION DIRECTORY
async function showLeagueSelection(interaction, discordId, player) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_franchise_league_${discordId}`)
      .setPlaceholder('Select a Franchise League to view details...')
      .addOptions(
        Object.values(franchiseLeagues).map(l => ({
          label: `${l.emoji} ${l.name}`,
          description: `Prestige: ${'★'.repeat(l.prestige)} | Prize: 🪙${l.prizeMoney}`,
          value: l.id
        }))
      )
  );

  let response = null;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(900, 650);
      const ctx = canvas.getContext('2d');

      // Background
      const mainGrad = ctx.createLinearGradient(0, 0, 900, 650);
      mainGrad.addColorStop(0, '#0c1a2f'); // Space/Navy theme
      mainGrad.addColorStop(1, '#050a12');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 900, 650);

      // Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 900; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 650); ctx.stroke();
      }
      for (let i = 0; i < 650; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(900, i); ctx.stroke();
      }

      // Border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 880, 630);

      // Header
      drawRoundRect(ctx, 30, 30, 840, 75, 12, 'rgba(15, 23, 42, 0.8)', '#38bdf8', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 T20 FRANCHISE LEAGUE CAREER DIRECTORY', 450, 62);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('SELECT A LEAGUE FROM THE MENU BELOW TO SIGN UP FOR THE mega AUCTION POOL', 450, 85);

      // Draw League Cards
      const leaguesList = Object.values(franchiseLeagues);
      leaguesList.forEach((l, idx) => {
        const col = idx % 3;
        const rowIdx = Math.floor(idx / 3);
        const x = 30 + col * 285;
        const y = 130 + rowIdx * 240;

        drawRoundRect(ctx, x, y, 270, 220, 14, 'rgba(15, 23, 42, 0.6)', '#38bdf8', 1.5);

        // Header Title
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${l.emoji} ${l.name}`, x + 15, y + 30);

        // Stars
        ctx.fillStyle = '#f1c40f';
        ctx.font = '14px sans-serif';
        ctx.fillText('★'.repeat(l.prestige) + '☆'.repeat(5 - l.prestige), x + 15, y + 55);

        // Stats
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Difficulty:`, x + 15, y + 80);
        ctx.fillStyle = l.difficulty === 'Hard' ? '#f43f5e' : l.difficulty.includes('Medium') ? '#f59e0b' : '#10b981';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(l.difficulty, x + 120, y + 80);

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Prize Pool:`, x + 15, y + 105);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`🪙 ${l.prizeMoney.toLocaleString()} Coins`, x + 120, y + 105);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Overseas Limit:`, x + 15, y + 130);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${l.overseasSlots} Slots / XI`, x + 120, y + 130);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Avg Contract:`, x + 15, y + 155);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`🪙 ${l.avgSalary} / match`, x + 120, y + 155);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Season Length:`, x + 15, y + 180);
        ctx.fillStyle = '#a855f7';
        ctx.fillText(`${l.seasonLength} matches + playoffs`, x + 120, y + 180);
      });

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `franchise_directory_${discordId}.png` });

      response = await safeReplyOrEdit(interaction, {
        content: '🏏 **Explore T20 Franchise Leagues:**',
        files: [attachment],
        components: [row]
      });

    } catch (err) {
      console.error(err);
    }
  }

  if (!response) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 T20 Franchise Leagues')
      .setDescription('Choose a league from the select menu below to view details and enter the auction pool.')
      .setColor('#38bdf8');
    await safeReplyOrEdit(interaction, {
      embeds: [embed],
      components: [row]
    });
  }
}

async function showAuctionRoom(interaction, discordId, player, pf) {
  const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];
  const startBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_start_auction_${league.id}_${discordId}`)
      .setLabel('🚀 Start televised Auction Session')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_franchise_abandon_${discordId}`)
      .setLabel('❌ Withdraw Registration')
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle(`🏏 ${league.name} Auction Waiting Room`)
    .setDescription(
      `🏏 **You are registered for the ${league.name} Mega Auction!**\n\n` +
      `Scouts and team managers are waiting in the auction room.\n` +
      `Click **Start televised Auction Session** below to begin the live bidding war for your contract!`
    )
    .setColor('#f1c40f')
    .setTimestamp();

  await safeReplyOrEdit(interaction, {
    content: '',
    embeds: [embed],
    files: [],
    attachments: [],
    components: [startBtn]
  });
}

// 2. DETAILED LEAGUE CARD
export async function handleLeagueDetail(interaction, leagueId) {
  await interaction.deferUpdate();
  const discordId = interaction.user.id;
  const league = franchiseLeagues[leagueId];
  if (!league) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_franchise_register_${leagueId}_${discordId}`)
      .setLabel(`Sign up for ${league.shortName} Auction`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_franchise_back_${discordId}`)
      .setLabel('⬅️ Back to Directory')
      .setStyle(ButtonStyle.Secondary)
  );

  let response = null;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(850, 550);
      const ctx = canvas.getContext('2d');

      // Background
      const mainGrad = ctx.createLinearGradient(0, 0, 850, 550);
      mainGrad.addColorStop(0, '#0c1a2f');
      mainGrad.addColorStop(1, '#050a12');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 850, 550);

      // Border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 830, 530);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 790, 70, 12, 'rgba(15, 23, 42, 0.8)', '#38bdf8', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${league.emoji} ${league.name.toUpperCase()}`, 425, 60);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('LEAGUE PROSPECTUS & FRANCHISE COMPOSITION', 425, 82);

      // History / Description Panel
      drawRoundRect(ctx, 30, 120, 480, 380, 16, 'rgba(15, 23, 42, 0.6)', '#38bdf8', 1.5);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📜 LEAGUE HISTORY & PROFILE', 50, 150);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'italic 12px sans-serif';
      
      const wrapText = (text, x, y, lineW, lineH) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > lineW && n > 0) {
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

      const nextY = wrapText(league.history, 50, 175, 440, 18);

      // Draw Key rules
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('⚙️ TOURNAMENT REGULATIONS:', 50, nextY + 35);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`• Overseas Limit: Maximum ${league.overseasSlots} non-native players allowed in the playing XI.`, 50, nextY + 60);
      ctx.fillText(`• Regular Season: ${league.seasonLength} matches. Top 4 qualify for knockouts.`, 50, nextY + 80);
      ctx.fillText(`• Bidding System: Auction values affect matches salary payouts directly.`, 50, nextY + 100);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`• Registration lock: 10-day cooldown applied upon league completion!`, 50, nextY + 120);

      // Teams list panel
      drawRoundRect(ctx, 530, 120, 290, 380, 16, 'rgba(15, 23, 42, 0.6)', '#38bdf8', 1.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🏏 PARTICIPATING TEAMS', 550, 150);

      ctx.font = 'bold 11px sans-serif';
      league.teams.forEach((t, idx) => {
        const ty = 178 + idx * 30;
        // Color dot
        ctx.fillStyle = t.primaryColor;
        ctx.beginPath();
        ctx.arc(560, ty - 4, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${t.name} (${t.short})`, 575, ty);
      });

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `league_details_${leagueId}.png` });

      response = await safeReplyOrEdit(interaction, {
        content: `🏏 **Prospectus for ${league.name}:**`,
        files: [attachment],
        embeds: [],
        components: [row]
      });

    } catch (err) {
      console.error(err);
    }
  }

  if (!response) {
    const embed = new EmbedBuilder()
      .setTitle(`${league.emoji} ${league.name}`)
      .setDescription(league.history)
      .setColor('#38bdf8');
    await safeReplyOrEdit(interaction, {
      embeds: [embed],
      components: [row]
    });
  }
}

// 3. ENTER AUCTION / CONFIRM REGISTRATION
export async function handleConfirmRegister(interaction, leagueId) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);
  const league = franchiseLeagues[leagueId];

  if (!player || !league) {
    return safeReplyOrEdit(interaction, { content: '❌ Data missing.' });
  }

  // Register in player_franchise
  db.prepare(`
    UPDATE player_franchise 
    SET status = 'auction', league_id = ?, team_id = NULL, contract_value = 0, current_round = 0 
    WHERE player_id = ?
  `).run(leagueId, discordId);

  const startBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_start_auction_${leagueId}_${discordId}`)
      .setLabel('🚀 Start televised Auction Session')
      .setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle(`🏏 Entering the ${league.name} Auction Pool`)
    .setDescription(
      `🏏 **You have officially entered the ${league.name} Auction!**\n\n` +
      `Scouts are currently evaluating your attributes, career stats, and form. ` +
      `Click the button below to initiate the live televised bidding simulation. Bidding wars will trigger based on team needs!`
    )
    .setColor('#f1c40f')
    .setTimestamp();

  await safeReplyOrEdit(interaction, {
    content: '',
    embeds: [embed],
    files: [],
    attachments: [],
    components: [startBtn]
  });
}

// 4. LIVE AUCTION SIMULATOR
export async function handleRunAuction(interaction, leagueId) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }
  const discordId = interaction.user.id;

  if (activeAuctions.has(discordId)) {
    return interaction.followUp({ content: '⏳ Your auction is already in progress, please wait...', flags: ['Ephemeral'] }).catch(() => {});
  }

  const existingPf = db.prepare('SELECT status FROM player_franchise WHERE player_id = ?').get(discordId);
  if (existingPf && existingPf.status === 'active') {
    return safeReplyOrEdit(interaction, {
      content: '⚠️ You already signed a contract with a franchise! Open your dashboard to view.',
      embeds: [],
      files: [],
      attachments: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`btn_franchise_dashboard_${discordId}`).setLabel('🏟️ Open Dashboard').setStyle(ButtonStyle.Primary)
        )
      ]
    });
  }

  activeAuctions.add(discordId);

  // Disable button immediately to prevent double clicking
  await safeReplyOrEdit(interaction, {
    content: '⏳ **Connecting to live auction broadcast...**',
    embeds: [],
    files: [],
    attachments: [],
    components: []
  });

  try {
    const player = db.prepare('SELECT name, level, reputation, primary_role, batting_hand, bowling_style, nationality, form, confidence FROM players WHERE discord_id = ?').get(discordId);
    const league = franchiseLeagues[leagueId];

    if (!player || !league) {
      return safeReplyOrEdit(interaction, { content: '❌ Player or league not found.' });
    }

    // Calculate base valuation:
    // Base valuation in mock $: from $30k to $600k
    let baseVal = 30000;
    baseVal += player.level * 8000;
    baseVal += player.reputation * 500;
    baseVal += (player.form - 50) * 1500;
    baseVal = Math.max(20000, baseVal);

    const isOverseas = player.nationality.toLowerCase() !== getLeagueNation(leagueId);

    // Decide bidding teams (pick 3 or 4 random teams from the league)
    const shuffledTeams = [...league.teams].sort(() => 0.5 - Math.random());
    const bidders = shuffledTeams.slice(0, Math.min(league.teams.length, 3));
    const buyerTeam = bidders[bidders.length - 1];

    // If player is really low level or bad form, they might go unsold, but let's make it super rare so they aren't frustrated.
    const isUnsold = player.level === 1 && player.form < 20 && Math.random() < 0.2;

    const biddingSteps = [];
    biddingSteps.push({ text: `🏏 **The auctioneer raises the gavel... Player: ${player.name} (${player.primary_role})**\n*Base Price set at: $${(baseVal / 2).toLocaleString()}*` });

    if (isUnsold) {
      biddingSteps.push({ text: `⚡ **The auctioneer calls for bids...**\n*No teams are opening a bid...*` });
      biddingSteps.push({ text: `🚨 **UNSOLD!** ${player.name} went unsold in the ${league.shortName} Auction due to lack of scouting form. Improve your form in Nets Practice and try again!` });
      
      // Reset status back to none so they can retry
      db.prepare("UPDATE player_franchise SET status = 'none', league_id = NULL WHERE player_id = ?").run(discordId);
    } else {
      // Generate bids
      let currentBid = Math.round(baseVal / 2);
      bidders.forEach((team, idx) => {
        currentBid += Math.round(baseVal * (0.2 + Math.random() * 0.25));
        biddingSteps.push({
          text: `💰 **${team.name}** open bidding at **$${currentBid.toLocaleString()}**!`
        });
      });

      // Add a final bidding war increment
      const finalVal = currentBid + Math.round(baseVal * 0.15);
      biddingSteps.push({
        text: `⚡ Bidding war heats up! **${buyerTeam.name}** counter-bids **$${finalVal.toLocaleString()}**...`
      });
      biddingSteps.push({
        text: `🔨 *Going once... Going twice...*`
      });

      const roleNames = ['Development Player', 'Bench', 'Emerging Player', 'Starter', 'Emerging Player', 'Marquee Signing'];
      let finalRoleIndex = 2; // Default Emerging
      if (player.level < 4) finalRoleIndex = 0; // Dev
      else if (player.level >= 12 && player.reputation >= 200) finalRoleIndex = 5; // Marquee
      else if (player.level >= 7) finalRoleIndex = 3; // Starter
      const contractRole = roleNames[finalRoleIndex];

      biddingSteps.push({
        text: `🎉 **SOLD!** **${buyerTeam.name}** signs **${player.name}** for **$${finalVal.toLocaleString()}** as a **${contractRole}**!`,
        success: true,
        teamId: buyerTeam.id,
        val: finalVal,
        role: contractRole
      });
    }

    // Execute step-by-step bidding animation (up to the penultimate step)
    for (let i = 0; i < biddingSteps.length - 1; i++) {
      const step = biddingSteps[i];
      await safeReplyOrEdit(interaction, {
        content: step.text,
        embeds: [],
        files: [],
        attachments: [],
        components: []
      });
      await sleep(1500);
    }

    // Save the result if sold
    const finalStep = biddingSteps[biddingSteps.length - 1];
    if (finalStep.success) {
      // Save to DB
      db.prepare(`
        UPDATE player_franchise 
        SET status = 'active', team_id = ?, contract_value = ?, contract_role = ?, current_round = 1, runs=0, balls=0, fours=0, sixes=0, dismissals=0, matches_played=0, wickets=0, runs_conceded=0, overs_bowled=0.0
        WHERE player_id = ?
      `).run(finalStep.teamId, finalStep.val, finalStep.role, discordId);

      // Populate Standings for the season
      db.prepare('DELETE FROM franchise_standings WHERE player_id = ?').run(discordId);
      const insertStanding = db.prepare(`
        INSERT INTO franchise_standings (player_id, league_id, team_id, played, won, lost, points, nrr)
        VALUES (?, ?, ?, 0, 0, 0, 0, 0.0)
      `);
      league.teams.forEach(t => {
        insertStanding.run(discordId, leagueId, t.id);
      });

      // Populate AI Players in standings to fill Orange/Purple cap statistics
      db.prepare('DELETE FROM ai_players WHERE player_id = ?').run(discordId);
      const insertAI = db.prepare(`
        INSERT INTO ai_players (player_id, name, role, team_id, league_id, skill_level, runs, wickets)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
      `);

      // Create AI stars
      const firstNames = ['Virat', 'Babar', 'Steve', 'Jos', 'Rashid', 'Shaheen', 'Mitchell', 'Glenn', 'Quinton', 'David', 'Andre', 'Sunil', 'Kieron', 'Hardik', 'Jasprit'];
      const lastNames = ['Kohli', 'Azam', 'Smith', 'Buttler', 'Khan', 'Afridi', 'Starc', 'Maxwell', 'de Kock', 'Warner', 'Russell', 'Narine', 'Pollard', 'Pandya', 'Bumrah'];

      league.teams.forEach(t => {
        const batName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const bowlName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        
        insertAI.run(discordId, batName, 'Batsman', t.id, leagueId, 70 + Math.floor(Math.random() * 25));
        insertAI.run(discordId, bowlName, 'Bowler', t.id, leagueId, 70 + Math.floor(Math.random() * 25));
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_franchise_dashboard_${discordId}`)
          .setLabel('🏟️ Open Franchise Dashboard')
          .setStyle(ButtonStyle.Primary)
      );

      // Pay balanced sign-on bonus capped against coin inflation
      const signOnCoins = Math.min(250, Math.round(finalStep.val / 500));
      db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(signOnCoins, discordId);

      const teamName = league.teams.find(t => t.id === finalStep.teamId)?.name || buyerTeam.name;

      const contractEmbed = new EmbedBuilder()
        .setTitle('✍️ Franchise Contract Finalized')
        .setDescription(
          `🎉 **Congratulations! You have signed a T20 Contract!**\n\n` +
          `• **Franchise:** ${league.emoji} **${teamName}**\n` +
          `• **Contract Value:** \`$${finalStep.val.toLocaleString()}\`\n` +
          `• **Assigned Squad Role:** **${finalStep.role}**\n` +
          `• **Sign-on Bonus credited:** **${emojis.coin} ${signOnCoins} Coins**\n\n` +
          `**Contract Perks & Bonuses:**\n` +
          `• **Run Bonus:** ${emojis.coin} 1 per 4 runs scored\n` +
          `• **Wicket Bonus:** ${emojis.coin} 10 per wicket taken\n` +
          `• **Milestone Bonus:** ${emojis.coin} +25 (50s) / +60 (100s)\n` +
          `• **Match Day Fee:** ${emojis.coin} ${Math.min(220, Math.round((league.avgSalary / 15) * (finalStep.role.includes('Marquee') ? 1.5 : finalStep.role.includes('Starter') ? 1.2 : 0.8)))} coins per match`
        )
        .setColor('#2ecc71')
        .setTimestamp();

      // Clean single message edit
      await safeReplyOrEdit(interaction, {
        content: `🎉 **SOLD!** **${buyerTeam.name}** signs **${player.name}** for **$${finalStep.val.toLocaleString()}** as a **${finalStep.role}**!`,
        embeds: [contractEmbed],
        files: [],
        attachments: [],
        components: [row]
      });
    } else {
      const retryRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_franchise_back_${discordId}`)
          .setLabel('⬅️ Back to League Directory')
          .setStyle(ButtonStyle.Primary)
      );
      await safeReplyOrEdit(interaction, {
        content: finalStep.text,
        embeds: [],
        files: [],
        attachments: [],
        components: [retryRow]
      });
    }
  } catch (err) {
    console.error('Error in handleRunAuction:', err);
    await safeReplyOrEdit(interaction, {
      content: '❌ An error occurred finalizing the auction. Please run `/franchise` to view your dashboard.',
      embeds: [],
      files: [],
      attachments: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`btn_franchise_dashboard_${discordId}`).setLabel('🏟️ Open Dashboard').setStyle(ButtonStyle.Primary)
        )
      ]
    });
  } finally {
    activeAuctions.delete(discordId);
  }
}

// 5. FRANCHISE ACTIVE DASHBOARD (CANVAS GRID)
async function showActiveDashboard(interaction, discordId, player, pf) {
  const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];
  const userTeam = league.teams.find(t => t.id === pf.team_id) || league.teams[0];
  const otherTeams = league.teams.filter(t => t.id !== userTeam.id);

  // Determine Opponent for the current round
  let opponentTeam = null;
  if (pf.current_round <= league.seasonLength) {
    opponentTeam = otherTeams[(pf.current_round - 1) % otherTeams.length] || otherTeams[0];
  } else {
    // Playoffs
    opponentTeam = getPlayoffOpponent(discordId, pf, league);
  }

  // Standings
  if (pf.current_round > league.seasonLength) {
    db.prepare(`
      UPDATE franchise_standings 
      SET played = MIN(played, ?)
      WHERE player_id = ? AND played > ?
    `).run(league.seasonLength, discordId, league.seasonLength);
  }
  const standings = db.prepare('SELECT * FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC').all(discordId);
  const userRank = standings.findIndex(s => s.team_id === pf.team_id) + 1;

  // AI Leaders (Orange / Purple caps)
  const aiBatsmen = db.prepare("SELECT * FROM ai_players WHERE player_id = ? ORDER BY runs DESC LIMIT 3").all(discordId);
  const aiBowlers = db.prepare("SELECT * FROM ai_players WHERE player_id = ? ORDER BY wickets DESC LIMIT 3").all(discordId);

  // Include user in cap leaders
  const capLeadersRuns = [...aiBatsmen.map(a => ({ name: a.name, runs: a.runs, team: league.teams.find(t => t.id === a.team_id)?.short || 'AI' })), { name: 'YOU', runs: pf.runs, team: userTeam.short }]
    .sort((a,b) => b.runs - a.runs).slice(0, 3);
  const capLeadersWickets = [...aiBowlers.map(a => ({ name: a.name, wickets: a.wickets, team: league.teams.find(t => t.id === a.team_id)?.short || 'AI' })), { name: 'YOU', wickets: pf.wickets, team: userTeam.short }]
    .sort((a,b) => b.wickets - a.wickets).slice(0, 3);

  // Buttons row
  const isSelected = checkXISelection(player, pf);
  const isPlayoff = pf.current_round > league.seasonLength;
  const playButtonLabel = pf.current_round > league.seasonLength + 2 
    ? '🏆 End Season & Collect Awards' 
    : isPlayoff
      ? (pf.current_round === league.seasonLength + 1 ? '🏆 Play Semi-Final' : '🏆 Play Grand Final')
      : (isSelected ? `🏏 Play Match (Round ${pf.current_round})` : `🔒 Simulate from Bench (Round ${pf.current_round})`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_franchise_playmatch_${discordId}`)
      .setLabel(playButtonLabel)
      .setStyle(isSelected || isPlayoff ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`btn_franchise_abandon_${discordId}`)
      .setLabel('🚨 Abandon League')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_profile_${discordId}`)
      .setLabel('⬅️ Back to Profile')
      .setStyle(ButtonStyle.Secondary)
  );

  let response = null;

  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(950, 680);
      const ctx = canvas.getContext('2d');

      // Theme Gradient (Uses team's color)
      const mainGrad = ctx.createLinearGradient(0, 0, 950, 680);
      mainGrad.addColorStop(0, '#0f172a');
      mainGrad.addColorStop(1, '#020617');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 950, 680);

      // Border with team accent color
      ctx.strokeStyle = userTeam.primaryColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 930, 660);

      // 1. Header Banner
      drawRoundRect(ctx, 30, 30, 890, 75, 12, 'rgba(15, 23, 42, 0.85)', userTeam.primaryColor, 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${league.emoji} ${league.shortName}: ${userTeam.name.toUpperCase()}`, 50, 60);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Squad Position: ${pf.contract_role} • NATIVE T20 CONTRACT VALUE: $${pf.contract_value.toLocaleString()}`, 50, 85);

      // 2. Left Column: Standings Table
      drawRoundRect(ctx, 30, 120, 420, 520, 16, 'rgba(15, 23, 42, 0.65)', userTeam.primaryColor, 1.5);
      ctx.fillStyle = userTeam.primaryColor;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('📊 LEAGUE TABLE STANDINGS', 50, 150);

      // Table Headers
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('RANK', 50, 180);
      ctx.fillText('TEAM', 90, 180);
      ctx.textAlign = 'right';
      ctx.fillText('P', 280, 180);
      ctx.fillText('W', 315, 180);
      ctx.fillText('L', 350, 180);
      ctx.fillText('PTS', 385, 180);
      ctx.fillText('NRR', 425, 180);
      ctx.textAlign = 'left';

      // Table Rows
      standings.slice(0, 10).forEach((row, idx) => {
        const team = league.teams.find(t => t.id === row.team_id);
        if (!team) return;
        const ry = 210 + idx * 36;
        const isUserRow = team.id === pf.team_id;

        drawRoundRect(ctx, 45, ry - 18, 390, 30, 6, isUserRow ? 'rgba(241, 196, 15, 0.12)' : 'rgba(30, 41, 59, 0.3)', isUserRow ? '#f1c40f' : 'transparent', 1);

        ctx.fillStyle = isUserRow ? '#f1c40f' : '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(idx + 1), 55, ry);
        ctx.fillText(team.short, 90, ry);
        
        ctx.fillStyle = isUserRow ? '#f1c40f' : '#e2e8f0';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        const displayPlayed = Math.min(row.played, league.seasonLength);
        ctx.fillText(String(displayPlayed), 280, ry);
        ctx.fillText(String(row.won), 315, ry);
        ctx.fillText(String(row.lost), 350, ry);
        ctx.fillStyle = isUserRow ? '#f1c40f' : '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(row.points), 385, ry);
        ctx.fillStyle = isUserRow ? '#f1c40f' : row.nrr >= 0 ? '#10b981' : '#f43f5e';
        ctx.fillText(row.nrr >= 0 ? `+${row.nrr.toFixed(2)}` : row.nrr.toFixed(2), 425, ry);
        ctx.textAlign = 'left';
      });

      // 3. Right Panel: Match day & Opponent
      drawRoundRect(ctx, 470, 120, 450, 180, 16, 'rgba(15, 23, 42, 0.65)', userTeam.primaryColor, 1.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🏟️ NEXT FIXTURE DETAILS', 490, 150);

      if (pf.current_round > league.seasonLength + 2) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🏆 TOURNAMENT COMPLETED!', 490, 190);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px sans-serif';
        ctx.fillText('All fixtures and finals have concluded.', 490, 215);
        ctx.fillText('Click the button below to process end-of-season awards!', 490, 235);
      } else {
        const isPlayoff = pf.current_round > league.seasonLength;
        const roundTitle = isPlayoff 
          ? (pf.current_round === league.seasonLength + 1 ? 'PLAYOFF SEMI-FINAL' : '🏆 GRAND FINAL')
          : `ROUND ${pf.current_round} OF ${league.seasonLength}`;

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(roundTitle, 490, 180);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        const oppName = opponentTeam ? opponentTeam.name.toUpperCase() : 'TO BE DECIDED';
        ctx.fillText(`${userTeam.short} vs ${oppName}`, 490, 212);

        // Selected status
        const isSelected = checkXISelection(player, pf);
        ctx.fillStyle = isSelected ? '#10b981' : '#f43f5e';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(isSelected ? '✅ SELECTED IN PLAYING XI' : '🔒 BENCHED FOR THIS ROUND', 490, 240);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText(isSelected ? 'You will play this match day interactively!' : 'You can simulate this match day from the bench.', 490, 258);
      }

      // 4. Right Panel Middle: Player stats this season
      drawRoundRect(ctx, 470, 320, 450, 140, 16, 'rgba(15, 23, 42, 0.65)', userTeam.primaryColor, 1.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('📈 YOUR TOURNAMENT STATS', 490, 350);

      const drawStatBox = (x, y, label, val) => {
        drawRoundRect(ctx, x, y, 95, 55, 8, 'rgba(30, 41, 59, 0.4)');
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px sans-serif';
        ctx.fillText(label, x + 8, y + 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(String(val), x + 8, y + 42);
      };

      const dismissals = Number(pf.dismissals ?? (pf.matches_played ? 0 : Math.max(0, (pf.current_round || 1) - 1)));
      let battingAvg = '0.0';
      if (dismissals > 0) {
        battingAvg = (pf.runs / dismissals).toFixed(1);
      } else if (pf.runs > 0) {
        battingAvg = `${pf.runs}*`;
      } else {
        battingAvg = '0.0';
      }

      if (player.primary_role === 'Bowler') {
        const bowlAvg = pf.wickets > 0 ? (pf.runs_conceded / pf.wickets).toFixed(1) : (pf.overs_bowled > 0 ? '—' : '0.0');
        const econ = pf.overs_bowled > 0 ? (pf.runs_conceded / pf.overs_bowled).toFixed(2) : '0.00';
        drawStatBox(490, 370, 'WICKETS', pf.wickets);
        drawStatBox(595, 370, 'OVERS', Number(pf.overs_bowled).toFixed(1));
        drawStatBox(700, 370, 'ECONOMY', econ);
        drawStatBox(805, 370, 'BOWL AVG', bowlAvg);
      } else if (player.primary_role === 'All-Rounder') {
        drawStatBox(490, 370, 'RUNS', pf.runs);
        drawStatBox(595, 370, 'BAT AVG', battingAvg);
        drawStatBox(700, 370, 'WICKETS', pf.wickets);
        drawStatBox(805, 370, 'STRIKE RATE', pf.balls > 0 ? ((pf.runs / pf.balls) * 100).toFixed(1) : '0.0');
      } else {
        drawStatBox(490, 370, 'RUNS', pf.runs);
        drawStatBox(595, 370, 'BALLS', pf.balls);
        drawStatBox(700, 370, 'AVERAGE', battingAvg);
        drawStatBox(805, 370, 'STRIKE RATE', pf.balls > 0 ? ((pf.runs / pf.balls) * 100).toFixed(1) : '0.0');
      }

      // 5. Right Panel Bottom: Cap leaders (Top scorers)
      drawRoundRect(ctx, 470, 480, 450, 160, 16, 'rgba(15, 23, 42, 0.65)', userTeam.primaryColor, 1.5);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🍊 ORANGE CAP (TOP RUNS)', 490, 510);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      capLeadersRuns.forEach((l, idx) => {
        ctx.fillText(`${idx + 1}. ${l.name} (${l.team})`, 490, 535 + idx * 20);
        ctx.textAlign = 'right';
        ctx.fillText(`${l.runs} R`, 680, 535 + idx * 20);
        ctx.textAlign = 'left';
      });

      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🍇 PURPLE CAP (TOP WICKETS)', 720, 510);

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      capLeadersWickets.forEach((l, idx) => {
        ctx.fillText(`${idx + 1}. ${l.name} (${l.team})`, 720, 535 + idx * 20);
        ctx.textAlign = 'right';
        ctx.fillText(`${l.wickets} W`, 900, 535 + idx * 20);
        ctx.textAlign = 'left';
      });

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `franchise_dashboard_${discordId}.png` });

      response = await safeReplyOrEdit(interaction, {
        content: `🏟️ **${league.name} League Panel (Round ${pf.current_round}):**`,
        files: [attachment],
        components: [row]
      });

    } catch (err) {
      console.error('Error rendering active dashboard canvas:', err);
    }
  }

  if (!response) {
    const roundScheduleText = pf.current_round > league.seasonLength + 2
      ? 'Tournament Concluded (Awards Available)'
      : pf.current_round > league.seasonLength
        ? (pf.current_round === league.seasonLength + 1 ? '🏆 Playoff Semi-Final' : '🏆 Grand Final')
        : `Round **${pf.current_round}** of **${league.seasonLength}** regular season matches.`;

    const embed = new EmbedBuilder()
      .setTitle(`${league.emoji} Active League: ${league.name}`)
      .setDescription(`Your team: **${userTeam.name}**\nStanding Rank: **#${userRank}**\n\nStage: ${roundScheduleText}`)
      .setColor('#3498db');
    await safeReplyOrEdit(interaction, {
      embeds: [embed],
      components: [row]
    });
  }
}

// 6. PLAY MATCH DAY HANDLER
export async function handlePlayMatch(interaction) {
  const isButton = interaction.isButton?.() ?? false;
  if (isButton) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }
  } else {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }
  }

  const discordId = interaction.user.id;
  if (activeFranchiseMatches.has(discordId)) {
    const msg = '⏳ Your match day is already in progress!';
    if (isButton) {
      return interaction.followUp({ content: msg, flags: ['Ephemeral'] }).catch(() => {});
    }
    return safeReplyOrEdit(interaction, { content: msg, flags: ['Ephemeral'] });
  }

  activeFranchiseMatches.add(discordId);

  try {
    const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);
    if (!player) {
      return safeReplyOrEdit(interaction, { content: '❌ Profile missing.', flags: ['Ephemeral'] });
    }

    const pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(discordId);
    if (!pf || pf.status !== 'active') {
      const msg = '❌ You do not have an active franchise league season.';
      return safeReplyOrEdit(interaction, { content: msg, flags: ['Ephemeral'] });
    }

    const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];
    const userTeam = league.teams.find(t => t.id === pf.team_id) || league.teams[0];
    const otherTeams = league.teams.filter(t => t.id !== userTeam.id);

    // End of Season
    if (pf.current_round > league.seasonLength + 2) {
      return await processEndSeason(interaction, discordId, player, pf, league);
    }

    // Determine Opponent
    let opponentTeam = null;
    if (pf.current_round <= league.seasonLength) {
      opponentTeam = otherTeams[(pf.current_round - 1) % otherTeams.length] || otherTeams[0];
    } else {
      opponentTeam = getPlayoffOpponent(discordId, pf, league);
      if (!opponentTeam) {
        // User benched/eliminated from playoffs
        return safeReplyOrEdit(interaction, { content: '❌ Playoffs finished or you did not qualify. Advance the season in dashboard!' });
      }
    }

    // Selection Check
    const isSelected = checkXISelection(player, pf);
    if (!isSelected) {
      // Player is benched! Simulate round match day in background
      return await simulateBenchedMatch(interaction, discordId, player, pf, league, userTeam, opponentTeam);
    }

    // Energy check & update
    const currentEnergy = updateAndGetEnergy(db, discordId);
    const energyCost = 15;
    if (currentEnergy < energyCost) {
      return safeReplyOrEdit(interaction, { content: `❌ You are too tired to play! Current energy: ${currentEnergy}/100. (Requires ${energyCost} energy).` });
    }

    // Consume energy
    consumeEnergy(db, discordId, energyCost);

    // Play interactive match
    const level = player.level;
    const pitchTypes = [
      'Flat Belter (Batting Paradise)',
      'Balanced Sporting Pitch',
      'Green Seamer (Pace & Swing)',
      'Dry Turning Track (Spin Heaven)',
      'Bouncy Clay Deck (Steep Bounce)',
      'Damp Slow Track (Sticky Pitch)'
    ];
    const pitch = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];

    // Authentic T20 First Innings Scores based on pitch conditions:
    let firstInningsRuns = 165 + Math.floor(Math.random() * 26);
    let firstInningsWickets = 4 + Math.floor(Math.random() * 4);

    if (pitch.includes('Flat Belter')) {
      firstInningsRuns = 185 + Math.floor(Math.random() * 41);
      firstInningsWickets = 2 + Math.floor(Math.random() * 4);
    } else if (pitch.includes('Green Seamer')) {
      firstInningsRuns = 145 + Math.floor(Math.random() * 31);
      firstInningsWickets = 5 + Math.floor(Math.random() * 4);
    } else if (pitch.includes('Dry Turning Track')) {
      firstInningsRuns = 135 + Math.floor(Math.random() * 31);
      firstInningsWickets = 6 + Math.floor(Math.random() * 4);
    } else if (pitch.includes('Bouncy Clay Deck')) {
      firstInningsRuns = 160 + Math.floor(Math.random() * 26);
      firstInningsWickets = 4 + Math.floor(Math.random() * 4);
    } else if (pitch.includes('Damp Slow Track')) {
      firstInningsRuns = 130 + Math.floor(Math.random() * 26);
      firstInningsWickets = 6 + Math.floor(Math.random() * 4);
    }

    const targetRuns = firstInningsRuns + 1;

    const matchConfig = {
      opponent: opponentTeam.name,
      difficulty: league.difficulty,
      bowlerSkill: Math.min(85, 45 + level * 3),
      pitch,
      firstInningsRuns,
      firstInningsWickets,
      targetRuns,
      ballsLimit: 18,
      rewardXP: 100 + level * 10,
      rewardCoins: 0
    };

    if (player.primary_role === 'Bowler') {
      await runFranchiseBowlingMatch(interaction, player, pf, matchConfig, opponentTeam, userTeam);
    } else if (player.primary_role === 'All-Rounder') {
      await runFranchiseAllRounderMatch(interaction, player, pf, matchConfig, opponentTeam, userTeam);
    } else {
      // 50/50 Toss: 50% Bat First (Set Target & Defend), 50% Chase!
      const userBatsFirst = Math.random() < 0.50;
      if (userBatsFirst) {
        await runFranchiseBatFirstMatch(interaction, player, pf, matchConfig, opponentTeam, userTeam);
      } else {
        await runFranchiseBattingMatch(interaction, player, pf, matchConfig, opponentTeam, userTeam);
      }
    }
  } catch (err) {
    console.error('Error in handlePlayMatch:', err);
    await safeReplyOrEdit(interaction, { content: '❌ An error occurred during the match. Please try again.' });
  } finally {
    activeFranchiseMatches.delete(discordId);
    clearPlayerInMatch(discordId);
  }
}

async function runFranchiseBattingMatch(interaction, player, pf, match, opponentTeam, userTeam) {
  const discordId = player.discord_id;
  setPlayerInMatch(discordId, 'franchise', { leagueId: pf.league_id, round: pf.current_round, title: `${userTeam.name} vs ${opponentTeam.name}` });
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let currentRuns = 0;
  let currentWickets = 0;
  let overs = 0;
  let balls = 0;
  const target = match.targetRuns;

  const posInfo = getPlayerBattingPosition(player, db);
  const targetWickets = posInfo.targetWickets;
  const battingPos = posInfo.battingPos;

  // 1. Live Over-by-Over Simulation Ticker
  let tickerLines = [
    `🪙 **Toss:** **${userTeam.name}** won the toss and elected to bowl first!`,
    `📋 **1st Innings:** **${opponentTeam.name}** posted **${match.firstInningsRuns}/${match.firstInningsWickets}** (20.0 ov) on a *${match.pitch}*.`,
    `🎯 **Target:** **${target} runs** in 20.0 overs (Req. RR: ${(target / 20).toFixed(2)} RPO)\n`
  ];

  const embed = new EmbedBuilder()
    .setTitle(`🏏 Match Day: ${userTeam.name} vs ${opponentTeam.name}`)
    .setDescription(tickerLines.join('\n'))
    .setColor('#38bdf8');

  let message = null;
  try {
    message = await safeReplyOrEdit(interaction, { embeds: [embed], files: [], attachments: [], components: [] });
  } catch (err) {
    if (interaction.channel?.send) {
      message = await interaction.channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
  if (!message && interaction.channel?.send) {
    message = await interaction.channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Pre-entry simulation up to targetWickets (Powerplay / early overs)
  if (targetWickets > 0) {
    const entryMaxOver = Math.min(8, Math.max(5, targetWickets * 3));
    while (overs < entryMaxOver && currentWickets < targetWickets && currentRuns < target) {
      await sleep(650);
      overs++;
      const runsInOver = 6 + Math.floor(Math.random() * 6);
      currentRuns += runsInOver;

      if (currentWickets < targetWickets && (overs >= 3 || Math.random() < 0.4)) {
        currentWickets++;
        tickerLines.push(`🚨 **Over ${overs}:** ${currentRuns}/${currentWickets} — *Wicket falls!* (Req. ${((target - currentRuns) / Math.max(1, 20 - overs)).toFixed(2)} RPO)`);
      } else {
        tickerLines.push(`🔹 **Over ${overs}:** ${currentRuns}/${currentWickets} (Need ${target - currentRuns} off ${(20 - overs) * 6} balls)`);
      }

      embed.setDescription(tickerLines.slice(-6).join('\n'));
      await message.edit({ embeds: [embed] }).catch(() => {});
    }

    if (currentWickets < targetWickets) {
      currentWickets = targetWickets;
    }
  }

  await sleep(1000);
  const ballsRemaining = Math.max(1, (20 - overs) * 6);
  const runsNeeded = Math.max(1, target - currentRuns);
  const rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);

  tickerLines.push(
    targetWickets === 0
      ? `\n🔔 **It's your turn!** You walk out to open the batting as an **${posInfo.label}** (0.0 ov).\n` +
        `🎯 **Equation:** Need **${runsNeeded} runs** in **${ballsRemaining} balls** (RRR: **${rrr}**).\n` +
        `👉 Target: **${target}**. Time to set the platform and chase it down!`
      : `\n🔔 **It's your turn!** You walk out to bat at No. ${battingPos} (${posInfo.label}).\n` +
        `🎯 **Equation:** Need **${runsNeeded} runs** in **${ballsRemaining} balls** with **${10 - currentWickets} wickets** remaining (RRR: **${rrr}**).\n` +
        `👉 Target: **${target}**. Time to take charge and steer the chase!`
  );
  embed.setDescription(tickerLines.slice(-6).join('\n'));
  await message.edit({ embeds: [embed] }).catch(() => {});
  await sleep(1500);

  // Authentic Franchise Roster & Bowling Attack Setup
  const userTeamRoster = getFranchiseTeamRoster(pf.league_id, userTeam.id || userTeam.name);
  const validUserRoster = userTeamRoster.filter(p => p !== player.name);
  let partnerName = validUserRoster[targetWickets % validUserRoster.length] || 'Opening Partner';
  let partnerRuns = (overs > 0) ? Math.min(currentRuns - 10, Math.floor(currentRuns * 0.4) + Math.floor(Math.random() * 8)) : 0;
  partnerRuns = Math.max(0, partnerRuns);
  let partnerBalls = (overs > 0) ? Math.max(partnerRuns, Math.floor(partnerRuns * 0.85) + Math.floor(Math.random() * 5)) : 0;
  let partnerFours = Math.floor(partnerRuns / 12);
  let partnerSixes = Math.floor(partnerRuns / 24);
  let reserveIdx = targetWickets + 1;

  const oppBowlers = getFranchiseTeamBowlers(pf.league_id, opponentTeam.id || opponentTeam.name);
  const attack = new BowlingAttackManager(oppBowlers, 20, match.pitch);
  if (overs > 0) {
    attack.simulatePreEntry(overs, currentRuns, currentWickets);
  }
  let currentBowler = attack.getCurrentBowler();

  // 2. Interactive Batting Loop
  let playerRuns = 0;
  let playerBalls = 0;
  let playerWickets = 0;
  let playerFours = 0;
  let playerSixes = 0;
  let freeHit = false;
  let matchWon = false;
  let lastCommentary = `🏏 You take guard at the crease alongside **${partnerName}**. **${currentBowler.name}** (${currentBowler.style}) is preparing to bowl.`;

  const getBatterRenderState = async (selectedZone, selectedStance, selectedFootwork, selectedIntent, step, actualField, releaseHint, fullDeliveryReveal) => {
    const ballsLeft = Math.max(0, (20 - overs) * 6 - balls);
    const needRuns = Math.max(0, target - currentRuns);
    const currRRR = ballsLeft > 0 ? ((needRuns / ballsLeft) * 6).toFixed(2) : '0.00';

    const embedState = new EmbedBuilder()
      .setTitle(`🏏 Batting Inning: ${userTeam.name} vs ${opponentTeam.name}`)
      .setDescription(`🌿 **Pitch:** \`${match.pitch}\`\n▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                     (releaseHint ? `${releaseHint}\n\n` : ''))
      .setColor('#38bdf8')
      .addFields(
        { name: '📊 Team Score', value: `**${currentRuns}/${currentWickets}** (Target: **${target}**)\nOvers: **${overs}.${balls}** / 20.0`, inline: true },
        { name: '🎯 Equation', value: `Need **${needRuns}** off **${ballsLeft}** balls\nRRR: **${currRRR}** RPO`, inline: true },
        {
          name: `🏏 Batting Pair`,
          value: `⭐ **${player.name} (You)*:** **${playerRuns}* (${playerBalls}b)** [${playerFours}x4, ${playerSixes}x6] — \`${(player.batting_hand || 'Right-hand bat').includes('Left') ? 'LHB' : 'RHB'}\`\n` +
                 `👤 **${partnerName}:** **${partnerRuns}* (${partnerBalls}b)** [${partnerFours}x4, ${partnerSixes}x6] — \`${getPlayerHand(partnerName).includes('Left') ? 'LHB' : 'RHB'}\``,
          inline: false
        },
        {
          name: `🥎 Bowler: ${currentBowler.name}`,
          value: `*${currentBowler.style}*\nSpell: **${attack.getBowlerFigureString(currentBowler)}**`,
          inline: true
        }
      );

    if (freeHit) {
      embedState.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'You cannot be dismissed on this delivery!' });
    }

    const isLeave = (selectedFootwork === 'Leave' || selectedIntent === 'Leave');

    embedState.addFields(
      { name: '🧍 1. Stance', value: selectedStance ? `**${selectedStance}**` : (step === 'stance' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '👣 2. Footwork', value: selectedFootwork ? (selectedFootwork === 'Leave' ? '🛡️ **Leave**' : `**${selectedFootwork}**`) : (step === 'footwork' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '🎯 3. Intent', value: isLeave ? '🛡️ **Leave**' : (selectedIntent ? `**${selectedIntent}**` : (step === 'intent' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true },
      { name: '📐 4. Zone', value: isLeave ? '— *(Left Alone)*' : (selectedZone ? `**${selectedZone}**` : (step === 'zone' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true }
    );

    let rows = [];
    if (step === 'stance') {
      embedState.setDescription(embedState.data.description + `👉 **Step 1:** Select your **Stance** at the crease.`);
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_stance_Off Side_${discordId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_In Line_${discordId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_Leg Side_${discordId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
      );
      rows = [row1];
    } else if (step === 'footwork') {
      embedState.setDescription(embedState.data.description + `👉 **Step 2:** Select your **Footwork** commitment.`);
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
      const leaveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
      const leaveShot = getPlayerEquippedShot(discordId, leaveFw, 'Leave', 'In Line');
      const leaveType = (selectedFootwork && selectedFootwork !== 'Leave') ? `${selectedFootwork} Leave` : 'Leave';
      embedState.setDescription(
        embedState.data.description +
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
      embedState.setDescription(embedState.data.description + `👉 **Step 3:** Select your batting **Intent** for this ball.\n\n` +
                                `• **Push**: Soft hands / strike rotation (0 or 1 run)\n` +
                                `• **Stroke**: Classic ground boundary stroke (1 to 4 runs)\n` +
                                `• **Loft**: Aerial boundary power-hitting (4s & 6s)\n` +
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
      const shotName = selectedZone ? getDerivedShotName(selectedFootwork, selectedIntent, selectedZone) : null;
      embedState.setDescription(embedState.data.description + `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
                                `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
                                (shotName ? `🏏 **Projected Shot:** \`${shotName}\`` : `💡 *Click any field zone to preview and aim your shot.*`));
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Third Man_${discordId}`).setLabel('Third Man').setStyle(selectedZone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Point_${discordId}`).setLabel('Point').setStyle(selectedZone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Cover_${discordId}`).setLabel('Cover').setStyle(selectedZone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Long Off_${discordId}`).setLabel('Long Off').setStyle(selectedZone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Long On_${discordId}`).setLabel('Long On').setStyle(selectedZone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Mid Wicket_${discordId}`).setLabel('Mid Wicket').setStyle(selectedZone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Square Leg_${discordId}`).setLabel('Square Leg').setStyle(selectedZone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Fine Leg_${discordId}`).setLabel('Fine Leg').setStyle(selectedZone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!selectedZone)
      );
      rows = [row1, row2, row3];
    }

    const isPowerplay = (overs < 6);
    const fieldPreset = actualField || 'Balanced';
    const buffer = await generateFieldImage(fieldPreset, selectedZone, isPowerplay, player.batting_hand);
    const files = [];
    if (buffer) {
      const filename = `field_${Date.now()}.png`;
      files.push(new AttachmentBuilder(buffer, { name: filename }));
      embedState.setImage(`attachment://${filename}`);
    }

    return { embeds: [embedState], components: rows, files };
  };

  let timedOut = false;
  const playInteractiveInnings = async () => {
    while (playerWickets === 0 && currentRuns < target && currentWickets < 10 && overs < 20) {
      // 1. Generate Bowler Delivery (pitch-aligned diverse variations, locked to bowler craft)
      const bowlInput = generateBowlerDelivery(match.pitch, currentBowler.type);
      const hint = getReleaseHint(bowlInput.line, bowlInput.length, bowlInput.speed, bowlInput.variation);
      const fullDeliveryReveal = `🥎 **${currentBowler.name} (${currentBowler.style})** bowls a **${bowlInput.speed} ${bowlInput.variation}** pitched **${bowlInput.length}** on **${bowlInput.line}**!`;

      // 2. Collect Player choices
      let selectedStance = null;
      let selectedFootwork = null;
      let selectedIntent = null;
      let selectedZone = null;
      let batStep = 'stance';

      const runBatChoice = async () => {
        const stateData = await getBatterRenderState(selectedZone, selectedStance, selectedFootwork, selectedIntent, batStep, bowlInput.fieldPreset, hint, fullDeliveryReveal);
        await message.edit(stateData).catch(async () => {
          message = await message.channel.send(stateData);
        });

        const filter = idx => idx.user.id === discordId && idx.customId.startsWith('bat_step_');
        const collectResult = await new Promise((resBat) => {
          const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
          collector.on('collect', async idx => {
            await idx.deferUpdate().catch(() => {});
            const customId = idx.customId;

            if (customId.startsWith('bat_step_stance_')) {
              selectedStance = customId.replace('bat_step_stance_', '').replace(`_${discordId}`, '');
              batStep = 'footwork';
              resBat('next');
            } else if (customId.startsWith('bat_step_footwork_')) {
              selectedFootwork = customId.replace('bat_step_footwork_', '').replace(`_${discordId}`, '');
              if (selectedFootwork === 'Leave') {
                batStep = 'leave_confirm';
              } else {
                batStep = 'intent';
              }
              resBat('next');
            } else if (customId.startsWith('bat_step_intent_')) {
              selectedIntent = customId.replace('bat_step_intent_', '').replace(`_${discordId}`, '');
              if (selectedIntent === 'Leave') {
                batStep = 'leave_confirm';
                selectedZone = null;
              } else {
                batStep = 'zone';
                selectedZone = null;
              }
              resBat('next');
            } else if (customId.startsWith('bat_step_zone_')) {
              selectedZone = customId.replace('bat_step_zone_', '').replace(`_${discordId}`, '');
              resBat('next');
            } else if (customId.startsWith('bat_step_confirm_')) {
              if (selectedFootwork === 'Leave' || selectedIntent === 'Leave' || selectedZone) resBat('submit');
              else resBat('next');
            } else if (customId.startsWith('bat_step_back_stance_')) {
              if (batStep !== 'footwork') return;
              selectedStance = null;
              batStep = 'stance';
              resBat('next');
            } else if (customId.startsWith('bat_step_back_footwork_')) {
              if (batStep !== 'intent') return;
              selectedFootwork = null;
              batStep = 'footwork';
              resBat('next');
            }
          });

          collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
              resBat('timeout');
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
          const shotName = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
            ? 'Leave'
            : (equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone));
          return { stance: selectedStance || 'In Line', footwork: selectedFootwork, intent: selectedIntent, zone: selectedZone, shotType: shotName, targetZone: selectedZone || 'Long On', equippedShot };
        }
      };

      const batterInput = await runBatChoice();
      if (!batterInput || batterInput.timedOut) {
        timedOut = true;
        break;
      }

      // 3. Resolve Delivery Outcome
      const batterTimingVal = (playerAttrs.timing || 50) + (eqBonuses.timing || 0);
      let perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
      let slightlyChance = Math.max(0.10, 0.985 - perfectChance);

      let timingResult = 'Perfect';
      const roll = Math.random();
      if (roll < perfectChance) timingResult = 'Perfect';
      else if (roll < perfectChance + slightlyChance) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
      else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';

      const isPowerplay = (overs < 6);
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
        isPowerplay,
        pitch: match.pitch
      });

      playerRuns += simResult.runs;
      if (simResult.runs === 4 && !simResult.wicket) playerFours++;
      if (simResult.runs === 6 && !simResult.wicket) playerSixes++;

      attack.recordBall(simResult.runs, simResult.wicket, simResult.rebowl);

      let overEndedOnUser = false;
      if (!simResult.rebowl) {
        playerBalls++;
        balls++;
        if (balls >= 6) {
          const overChange = attack.completeOver();
          overs = attack.completedOvers;
          balls = 0;
          overEndedOnUser = true;
          if (overChange.nextBowler) {
            currentBowler = overChange.nextBowler;
          }
        }
      }
      currentRuns += simResult.runs;

      if (simResult.wicket) {
        playerWickets = 1;
        currentWickets++;
      }

      freeHit = simResult.nextIsFreeHit;

      // 4. IMMEDIATE CHECK: Did this delivery chase down the target?
      if (currentRuns >= target) {
        matchWon = true;
        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n\n` +
                         `🎉 **THE WINNING RUNS!**\n` +
                         `💥 ${simResult.runs === 4 ? 'A cracking boundary through the gap' : simResult.runs === 6 ? 'A towering maximum into the stands' : 'A sharp single'} seals an unforgettable chase for **${userTeam.name}**!\n\n` +
                         `🏆 **Target Chased!** ${userTeam.name} reach **${currentRuns}/${currentWickets}** in **${overs}.${balls} overs**! Winning runs hit by **${player.name}**!`;
        break;
      }

      // Check if user was dismissed
      if (playerWickets > 0) {
        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n\n` +
                         `${simResult.commentary}\n\n` +
                         `💔 **WICKET!** You depart for **${playerRuns} runs** off **${playerBalls} balls** (${playerFours}x4, ${playerSixes}x6).`;
        break;
      }

      // 5. Strike Rotation & Partner Batting Simulation
      const userScoredOdd = (!simResult.rebowl && (simResult.runs === 1 || simResult.runs === 3));
      let partnerOnStrike = (userScoredOdd !== overEndedOnUser);

      if (partnerOnStrike && overs < 20 && currentRuns < target && currentWickets < 10) {
        const partnerLogs = [];

        while (partnerOnStrike && overs < 20 && currentRuns < target && currentWickets < 10) {
          balls++;
          let pOverEnded = false;

          const pRoll = Math.random();
          let pRuns = 0;
          let pText = '';
          let isPartnerOut = false;

          const isTopOrder = (currentWickets <= 3);
          const isMiddleOrder = (currentWickets >= 4 && currentWickets <= 6);
          const isTail = (currentWickets >= 7);

          const ballsLeftInMatch = Math.max(1, (20 - overs) * 6 - balls);
          const runsLeftInMatch = Math.max(0, target - currentRuns);
          const liveRRR = runsLeftInMatch / (ballsLeftInMatch / 6);
          const highPressure = liveRRR > 10.5;

          const pDeck = (match.pitch || '').toLowerCase();
          const isToughPitch = pDeck.includes('green') || pDeck.includes('seam') || pDeck.includes('dry') || pDeck.includes('dust') || pDeck.includes('turn');
          const bowlerRating = currentBowler?.rating || opponentTeam.rating || 60;

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
            currentWickets++;
            pText = `🚨 ${partnerName} is CAUGHT in the deep! Wicket falls!`;
          }

          attack.recordBall(pRuns, isPartnerOut, false);
          if (balls >= 6) {
            const overChange = attack.completeOver();
            overs = attack.completedOvers;
            balls = 0;
            pOverEnded = true;
            if (overChange.nextBowler) {
              currentBowler = overChange.nextBowler;
            }
          }

          currentRuns += pRuns;
          partnerRuns += pRuns;
          partnerBalls++;

          const currentOverStr = pOverEnded ? `${overs}.0` : `${overs}.${balls}`;
          partnerLogs.push(`• **[${currentOverStr}]** ${pText}`);

          if (pOverEnded && overs < 20) {
            partnerLogs.push(`🔄 **End of Over (${overs}.0 ov):** **${currentBowler.name}** (${currentBowler.style}) comes into the attack.`);
          }

          if (isPartnerOut) {
            if (currentWickets < 10) {
              partnerName = (validUserRoster && validUserRoster.length > 0)
                ? validUserRoster[reserveIdx++ % validUserRoster.length]
                : `Batter ${currentWickets + 1}`;
              partnerRuns = 0;
              partnerBalls = 0;
              partnerFours = 0;
              partnerSixes = 0;
              partnerLogs.push(`👉 *New batsman **${partnerName}** walks to the crease.*`);
            }
            partnerOnStrike = !pOverEnded;
          } else {
            const pScoredOdd = (pRuns === 1 || pRuns === 3);
            partnerOnStrike = (pScoredOdd === pOverEnded);
          }

          if (currentRuns >= target) {
            matchWon = true;
            break;
          }
          if (currentWickets >= 10 || overs >= 20) {
            break;
          }

          // If partner remains on strike, show live update and pause before next partner delivery
          if (partnerOnStrike) {
            const bLeft = Math.max(0, (20 - overs) * 6 - balls);
            const partnerEmbed = new EmbedBuilder()
              .setTitle(`🏏 Partner on Strike — ${userTeam.name} vs ${opponentTeam.name}`)
              .setColor('#f59e0b')
              .setDescription(
                `🏃 **You are at the non-striker's end watching ${partnerName} (${getPlayerHand(partnerName).includes('Left') ? 'LHB' : 'RHB'}) bat.**\n\n` +
                `🥎 **Bowler:** ${currentBowler.name} (${currentBowler.style})\n` +
                `Spell: **${attack.getBowlerFigureString(currentBowler)}**\n` +
                partnerLogs.slice(-3).join('\n') + `\n\n` +
                `📊 **Team Score:** **${currentRuns}/${currentWickets}** (Target: **${target}**)\n` +
                `Overs: **${currentOverStr}** / 20.0 | Need **${Math.max(0, target - currentRuns)}** runs off **${bLeft}** balls\n` +
                `⭐ **Your Score:** **${playerRuns}* (${playerBalls}b)** | 👤 **${partnerName}:** **${partnerRuns}* (${partnerBalls}b)**`
              );
            await message.edit({ embeds: [partnerEmbed], components: [], files: [], attachments: [] }).catch(() => {});
            await sleep(1600);
          }
        }

        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n` +
                         `${simResult.commentary}\n\n` +
                         `🏃 **Partner's Stint (While you were at non-striker's end):**\n` +
                         partnerLogs.join('\n') + `\n` +
                         `*(Team: ${currentRuns}/${currentWickets}, Need ${Math.max(0, target - currentRuns)} off ${Math.max(0, (20 - overs) * 6 - balls)}b)*`;

        if (matchWon) {
          lastCommentary += `\n\n🎉 **Target Chased!** The winning runs have been hit!`;
          break;
        }
        if (currentWickets >= 10 || overs >= 20) {
          break;
        }
      } else {
        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n\n` +
                         `${simResult.commentary}`;
        if (overEndedOnUser && overs < 20 && playerWickets === 0) {
          lastCommentary += `\n\n🔄 **End of Over (${overs}.0 ov):** **${currentBowler.name}** (${currentBowler.style}) comes into the attack from the Pavilion End! [Spell: ${attack.getBowlerFigureString(currentBowler)}]`;
        }
      }
    }
  };

  await playInteractiveInnings();

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle(`⚠️ Match Forfeited due to Inactivity`)
      .setDescription(`You did not respond within 15 minutes! The match has ended and is recorded as a **Loss**.`)
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [], attachments: [] }).catch(() => {});
    await sleep(1500);

    const summaryDetails = {
      pitch: match.pitch,
      firstInningsText: `${opponentTeam.name} ${match.firstInningsRuns}/${match.firstInningsWickets} (20.0 ov)`,
      secondInningsText: `${userTeam.name} ${currentRuns}/${currentWickets} (${overs}.${balls} ov) [Forfeit]`,
      resultText: `${opponentTeam.name} won by forfeit (inactivity)`
    };

    db.prepare('UPDATE players SET confidence = MAX(10, confidence - 15) WHERE discord_id = ?').run(discordId);
    await finishFranchiseMatch(interaction, player, pf, false, playerRuns, playerBalls, playerFours, playerSixes, Math.max(1, playerWickets), 0, 0, 0, opponentTeam, summaryDetails, message);
    return;
  }

  // Show final delivery outcome embed (stays for 5 seconds on dismissal)
  const finalEmbed = new EmbedBuilder()
    .setTitle(playerWickets > 0 ? `💔 WICKET! Dismissed — ${userTeam.name} vs ${opponentTeam.name}` : (matchWon ? `🎉 Chase Complete! ${userTeam.name} Win!` : `🏏 Batting Inning: ${userTeam.name} vs ${opponentTeam.name}`))
    .setDescription(
      `▬▬▬ **Match Situation** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `📊 **Team Score:** **${currentRuns}/${currentWickets}** (Target: **${target}**)\n` +
      `Overs: **${overs}.${balls}** / 20.0\n` +
      `🏏 **Your Contribution:** **${playerRuns}${playerWickets > 0 ? '' : '*'} (${playerBalls}b)** [${playerFours}x4, ${playerSixes}x6]${playerWickets > 0 ? ' — **OUT**' : ''}`
    )
    .setColor(matchWon ? '#2ecc71' : (playerWickets > 0 ? '#e74c3c' : '#38bdf8'));
  await message.edit({ embeds: [finalEmbed], components: [], files: [], attachments: [] }).catch(() => {});
  await sleep(playerWickets > 0 ? 5000 : 2500);

  // 3. Post-Batting Inning Simulation (if chase is still ongoing)
  let matchStatus = matchWon ? 'won' : (currentRuns >= target ? 'won' : (currentWickets >= 10 || overs >= 20 ? 'lost' : 'not finished'));

  if (matchStatus === 'not finished') {
    const wasDuck = (playerRuns === 0);
    const wasLowScore = (playerRuns < 12);
    let shockOversRemaining = wasDuck ? 3 : (wasLowScore ? 2 : 0);

    const pitchLower = (match.pitch || '').toLowerCase();
    const isToughPitch = pitchLower.includes('green') || pitchLower.includes('seam') || pitchLower.includes('dry') || pitchLower.includes('dust') || pitchLower.includes('turn') || pitchLower.includes('slow');
    const isBattingPitch = pitchLower.includes('flat') || pitchLower.includes('belter');
    const oppRating = opponentTeam.rating || 60;

    let postSimLines = [
      wasDuck
        ? `🔮 **Chasing ${target} runs — Duck shock! The dugout is stunned and the middle order faces immense pressure...**\n`
        : `🔮 **Simulating the remaining overs of the chase...** (Target: ${target} runs)\n`
    ];

    while (overs < 20 && currentRuns < target && currentWickets < 10) {
      await sleep(1200);
      overs++;
      const runsNeeded = target - currentRuns;
      const ballsLeft = (20 - overs + 1) * 6;
      const reqRate = (runsNeeded / (ballsLeft / 6));

      // 1. Base over runs based on batting order position (tailenders score far less!)
      // 1. Base over runs based on batting order position (tailenders score far less!)
      let baseOverRuns = 7;
      if (currentWickets <= 3) {
        if (reqRate >= 8 && reqRate <= 11) {
          baseOverRuns = 7 + Math.floor(Math.random() * 5); // 7 - 11 runs (avg 9.0)
        } else if (reqRate > 11) {
          baseOverRuns = 8 + Math.floor(Math.random() * 5); // 8 - 12 runs
        } else {
          baseOverRuns = 6 + Math.floor(Math.random() * 4); // 6 - 9 runs
        }
      } else if (currentWickets <= 6) {
        if (reqRate > 10) {
          baseOverRuns = 6 + Math.floor(Math.random() * 5); // 6 - 10 runs
        } else {
          baseOverRuns = 5 + Math.floor(Math.random() * 4); // 5 - 8 runs
        }
      } else {
        // Tailenders (7+ wickets down)
        baseOverRuns = 3 + Math.floor(Math.random() * 4); // 3 - 6 runs (avg 4.5)
      }

      // 2. Duck Shock / Early collapse
      if (shockOversRemaining > 0) {
        shockOversRemaining--;
        baseOverRuns = Math.max(2, baseOverRuns - 3);
      }

      // 3. Pitch & bowler adjustments
      if (isToughPitch) baseOverRuns -= 1;
      if (isBattingPitch) baseOverRuns += 1;
      if (oppRating >= 75) baseOverRuns -= 1;

      let runsInOver = Math.max(1, baseOverRuns);

      // 4. Dynamic Wicket Probability
      let wicketChance = 0.18;
      if (currentWickets <= 3) wicketChance = 0.16;
      else if (currentWickets <= 6) wicketChance = 0.26;
      else wicketChance = 0.44;

      if (reqRate > 14) wicketChance += 0.25;
      else if (reqRate > 11.5) wicketChance += 0.18;
      else if (reqRate > 9.5) wicketChance += 0.10;
      else if (reqRate <= 6.5) wicketChance -= 0.08;

      if (shockOversRemaining > 0) wicketChance += 0.18;
      if (isToughPitch) wicketChance += 0.06;
      if (oppRating >= 75) wicketChance += 0.06;

      wicketChance = Math.min(0.80, Math.max(0.08, wicketChance));

      if (currentRuns + runsInOver >= target) {
        // Stop on exact winning ball!
        const ballsTaken = Math.min(6, Math.max(1, Math.ceil((target - currentRuns) / 2)));
        currentRuns = target;
        balls = ballsTaken;
        postSimLines.push(`🔹 **Over ${overs}.${balls}:** ${currentRuns}/${currentWickets} — 🎉 **Target Chased! Winning runs hit!**`);
        matchStatus = 'won';
        break;
      }

      currentRuns += runsInOver;
      if (Math.random() < wicketChance) {
        currentWickets++;
        if (currentWickets < 10 && (reqRate > 11.5 || currentWickets >= 7) && Math.random() < 0.35) {
          currentWickets++;
          runsInOver = Math.max(1, runsInOver - 3);
          postSimLines.push(`🚨 **Over ${overs}:** ${currentRuns}/${currentWickets} — 💥 **DOUBLE WICKET OVER!** Opponent strikes twice!`);
        } else {
          postSimLines.push(`🚨 **Over ${overs}:** ${currentRuns}/${currentWickets} — 💥 **WICKET FALLS!** (Need ${target - currentRuns} off ${(20 - overs) * 6} balls)`);
        }

        if (currentWickets >= 10) {
          postSimLines.push(`💥 **ALL OUT!** The batting order collapses for ${currentRuns}!`);
          matchStatus = 'lost';
          break;
        }
      } else {
        postSimLines.push(`🔹 **Over ${overs}:** ${currentRuns}/${currentWickets} (Need ${target - currentRuns} off ${(20 - overs) * 6} balls, RRR: ${((target - currentRuns) / Math.max(1, 20 - overs)).toFixed(1)})`);
      }

      embed.setDescription(postSimLines.slice(-6).join('\n'));
      await message.edit({ embeds: [embed] }).catch(() => {});
    }

    if (currentRuns >= target) {
      matchStatus = 'won';
    } else if (matchStatus !== 'lost') {
      matchStatus = 'lost';
    }
  }

  const won = matchStatus === 'won';
  const ballsLeft = Math.max(0, (20 - overs) * 6 - balls);
  const margin = won
    ? `${10 - currentWickets} wickets (${ballsLeft} balls remaining)`
    : `${target - 1 - currentRuns} runs`;
  const resultText = won ? `${userTeam.name} won by ${margin}` : `${opponentTeam.name} won by ${margin}`;

  const summaryDetails = {
    pitch: match.pitch,
    firstInningsText: `${opponentTeam.name} ${match.firstInningsRuns}/${match.firstInningsWickets} (20.0 ov)`,
    secondInningsText: `${userTeam.name} ${currentRuns}/${currentWickets} (${overs}.${balls} ov)`,
    resultText
  };

  await finishFranchiseMatch(interaction, player, pf, won, playerRuns, playerBalls, playerFours, playerSixes, playerWickets, 0, 0, 0, opponentTeam, summaryDetails, message);
}

// 2B. INTERACTIVE FRANCHISE BATTING MATCH (BATTING 1ST - SETTING TARGET & DEFENDING)
async function runFranchiseBatFirstMatch(interaction, player, pf, match, opponentTeam, userTeam) {
  const discordId = player.discord_id;
  setPlayerInMatch(discordId, 'franchise', { leagueId: pf.league_id, round: pf.current_round, title: `${userTeam.name} vs ${opponentTeam.name}` });
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let currentRuns = 0;
  let currentWickets = 0;
  let overs = 0;
  let balls = 0;

  const posInfo = getPlayerBattingPosition(player, db);
  const targetWickets = posInfo.targetWickets;
  const battingPos = posInfo.battingPos;

  const tossWonByUser = Math.random() < 0.5;
  const tossText = tossWonByUser
    ? `🪙 **Toss:** **${userTeam.name}** won the toss and elected to bat first on a *${match.pitch}*!`
    : `🪙 **Toss:** **${opponentTeam.name}** won the toss and elected to bowl first on a *${match.pitch}*!`;

  let tickerLines = [
    tossText,
    `📋 **Match Setting:** 1st Innings — Setting a Target (20.0 ov)`,
    `🎯 **Objective:** Build a formidable total and dominate the bowling!\n`
  ];

  const embed = new EmbedBuilder()
    .setTitle(`🏏 Match Day (Batting 1st): ${userTeam.name} vs ${opponentTeam.name}`)
    .setDescription(tickerLines.join('\n'))
    .setColor('#38bdf8');

  let message = null;
  try {
    message = await safeReplyOrEdit(interaction, { embeds: [embed], files: [], attachments: [], components: [] });
  } catch (err) {
    if (interaction.channel?.send) {
      message = await interaction.channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
  if (!message && interaction.channel?.send) {
    message = await interaction.channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Pre-entry simulation up to targetWickets (Powerplay / early overs)
  if (targetWickets > 0) {
    const entryMaxOver = Math.min(8, Math.max(5, targetWickets * 3));
    while (overs < entryMaxOver && currentWickets < targetWickets) {
      await sleep(650);
      overs++;
      const runsInOver = 6 + Math.floor(Math.random() * 6);
      currentRuns += runsInOver;

      if (currentWickets < targetWickets && (overs >= 3 || Math.random() < 0.4)) {
        currentWickets++;
        tickerLines.push(`🚨 **Over ${overs}:** ${currentRuns}/${currentWickets} — *Wicket falls!* (CRR: ${(currentRuns / overs).toFixed(2)} RPO)`);
      } else {
        tickerLines.push(`🔹 **Over ${overs}:** ${currentRuns}/${currentWickets} (CRR: ${(currentRuns / overs).toFixed(2)} RPO)`);
      }

      embed.setDescription(tickerLines.slice(-6).join('\n'));
      await message.edit({ embeds: [embed] }).catch(() => {});
    }

    if (currentWickets < targetWickets) {
      currentWickets = targetWickets;
    }
  }

  await sleep(1000);
  const crr = (currentRuns / Math.max(1, overs)).toFixed(2);
  const proj = Math.round((currentRuns / Math.max(1, overs)) * 20);

  tickerLines.push(
    targetWickets === 0
      ? `\n🔔 **It's your turn!** You walk out to open the batting as an **${posInfo.label}** (0.0 ov).\n` +
        `👉 Take guard, assess the pitch conditions, and set the platform for a huge 1st innings total!`
      : `\n🔔 **It's your turn!** You walk out to bat at No. ${battingPos} (${posInfo.label}).\n` +
        `📊 **Situation:** Team is **${currentRuns}/${currentWickets}** (${overs}.${balls} ov) with **${10 - currentWickets} wickets in hand** (CRR: **${crr}**, Proj: **${proj}**).\n` +
        `👉 Time to take control, build partnerships, and set a commanding total!`
  );
  embed.setDescription(tickerLines.slice(-6).join('\n'));
  await message.edit({ embeds: [embed] }).catch(() => {});
  await sleep(1500);

  // Authentic Franchise Roster & Bowling Attack Setup
  const userTeamRoster = getFranchiseTeamRoster(pf.league_id, userTeam.id || userTeam.name);
  const validUserRoster = userTeamRoster.filter(p => p !== player.name);
  let partnerName = validUserRoster[targetWickets % validUserRoster.length] || 'Opening Partner';
  let partnerRuns = (overs > 0) ? Math.min(currentRuns - 10, Math.floor(currentRuns * 0.4) + Math.floor(Math.random() * 8)) : 0;
  partnerRuns = Math.max(0, partnerRuns);
  let partnerBalls = (overs > 0) ? Math.max(partnerRuns, Math.floor(partnerRuns * 0.85) + Math.floor(Math.random() * 5)) : 0;
  let partnerFours = Math.floor(partnerRuns / 12);
  let partnerSixes = Math.floor(partnerRuns / 24);
  let reserveIdx = targetWickets + 1;

  const oppBowlers = getFranchiseTeamBowlers(pf.league_id, opponentTeam.id || opponentTeam.name);
  const attack = new BowlingAttackManager(oppBowlers, 20, match.pitch);
  if (overs > 0) {
    attack.simulatePreEntry(overs, currentRuns, currentWickets);
  }
  let currentBowler = attack.getCurrentBowler();

  // 2. Interactive Batting Loop
  let playerRuns = 0;
  let playerBalls = 0;
  let playerWickets = 0;
  let playerFours = 0;
  let playerSixes = 0;
  let freeHit = false;
  let lastCommentary = `🏏 You take guard at the crease alongside **${partnerName}**. **${currentBowler.name}** (${currentBowler.style}) is preparing to bowl.`;

  const getBatterRenderState = async (selectedZone, selectedStance, selectedFootwork, selectedIntent, step, actualField, releaseHint, fullDeliveryReveal) => {
    const ballsRemaining = Math.max(0, (20 - overs) * 6 - balls);
    const currCRR = (overs + balls / 6) > 0 ? (currentRuns / (overs + balls / 6)).toFixed(2) : '0.00';
    const projectedTotal = (overs + balls / 6) > 0 ? Math.round((currentRuns / (overs + balls / 6)) * 20) : currentRuns;

    const embedState = new EmbedBuilder()
      .setTitle(`🏏 Batting Inning (1st Innings): ${userTeam.name} vs ${opponentTeam.name}`)
      .setDescription(`🌿 **Pitch:** \`${match.pitch}\`\n▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                     (releaseHint ? `${releaseHint}\n\n` : ''))
      .setColor('#38bdf8')
      .addFields(
        { name: '📊 Team Score', value: `**${currentRuns}/${currentWickets}** (Overs: **${overs}.${balls}** / 20.0)`, inline: true },
        { name: '📈 Current Run Rate', value: `CRR: **${currCRR}** RPO\nProjected: **${projectedTotal}**`, inline: true },
        {
          name: `🏏 Batting Pair`,
          value: `⭐ **${player.name} (You)*:** **${playerRuns}* (${playerBalls}b)** [${playerFours}x4, ${playerSixes}x6] — \`${(player.batting_hand || 'Right-hand bat').includes('Left') ? 'LHB' : 'RHB'}\`\n` +
                 `👤 **${partnerName}:** **${partnerRuns}* (${partnerBalls}b)** [${partnerFours}x4, ${partnerSixes}x6] — \`${getPlayerHand(partnerName).includes('Left') ? 'LHB' : 'RHB'}\``,
          inline: false
        },
        {
          name: `🥎 Bowler: ${currentBowler.name}`,
          value: `*${currentBowler.style}*\nSpell: **${attack.getBowlerFigureString(currentBowler)}**`,
          inline: true
        }
      );

    if (freeHit) {
      embedState.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'You cannot be dismissed on this delivery!' });
    }

    const isLeave = (selectedFootwork === 'Leave' || selectedIntent === 'Leave');

    embedState.addFields(
      { name: '🧍 1. Stance', value: selectedStance ? `**${selectedStance}**` : (step === 'stance' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '👣 2. Footwork', value: selectedFootwork ? (selectedFootwork === 'Leave' ? '🛡️ **Leave**' : `**${selectedFootwork}**`) : (step === 'footwork' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '🎯 3. Intent', value: isLeave ? '🛡️ **Leave**' : (selectedIntent ? `**${selectedIntent}**` : (step === 'intent' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true },
      { name: '📐 4. Zone', value: isLeave ? '— *(Left Alone)*' : (selectedZone ? `**${selectedZone}**` : (step === 'zone' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true }
    );

    let rows = [];
    if (step === 'stance') {
      embedState.setDescription(embedState.data.description + `👉 **Step 1:** Select your **Stance** at the crease.`);
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_stance_Off Side_${discordId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_In Line_${discordId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_Leg Side_${discordId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
      );
      rows = [row1];
    } else if (step === 'footwork') {
      embedState.setDescription(embedState.data.description + `👉 **Step 2:** Select your **Footwork** commitment.`);
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
      const leaveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
      const leaveShot = getPlayerEquippedShot(discordId, leaveFw, 'Leave', 'In Line');
      const leaveType = (selectedFootwork && selectedFootwork !== 'Leave') ? `${selectedFootwork} Leave` : 'Leave';
      embedState.setDescription(
        embedState.data.description +
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
      embedState.setDescription(embedState.data.description + `👉 **Step 3:** Select your batting **Intent** for this ball.\n\n` +
                                `• **Push**: Soft hands / strike rotation (0 or 1 run)\n` +
                                `• **Stroke**: Classic ground boundary stroke (1 to 4 runs)\n` +
                                `• **Loft**: Aerial boundary power-hitting (4s & 6s)\n` +
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
      const shotName = selectedZone ? getDerivedShotName(selectedFootwork, selectedIntent, selectedZone) : null;
      embedState.setDescription(embedState.data.description + `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
                                `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
                                (shotName ? `🏏 **Projected Shot:** \`${shotName}\`` : `💡 *Click any field zone to preview and aim your shot.*`));
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Third Man_${discordId}`).setLabel('Third Man').setStyle(selectedZone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Point_${discordId}`).setLabel('Point').setStyle(selectedZone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Cover_${discordId}`).setLabel('Cover').setStyle(selectedZone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Long Off_${discordId}`).setLabel('Long Off').setStyle(selectedZone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Long On_${discordId}`).setLabel('Long On').setStyle(selectedZone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Mid Wicket_${discordId}`).setLabel('Mid Wicket').setStyle(selectedZone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Square Leg_${discordId}`).setLabel('Square Leg').setStyle(selectedZone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Fine Leg_${discordId}`).setLabel('Fine Leg').setStyle(selectedZone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!selectedZone)
      );
      rows = [row1, row2, row3];
    }

    const isPowerplay = (overs < 6);
    const fieldPreset = actualField || 'Balanced';
    const buffer = await generateFieldImage(fieldPreset, selectedZone, isPowerplay, player.batting_hand);
    const files = [];
    if (buffer) {
      const filename = `field_${Date.now()}.png`;
      files.push(new AttachmentBuilder(buffer, { name: filename }));
      embedState.setImage(`attachment://${filename}`);
    }

    return { embeds: [embedState], components: rows, files };
  };

  let timedOut = false;
  const playInteractiveInnings = async () => {
    while (playerWickets === 0 && currentWickets < 10 && overs < 20) {
      // 1. Generate Bowler Delivery (pitch-aligned diverse variations, locked to bowler craft)
      const bowlInput = generateBowlerDelivery(match.pitch, currentBowler.type);
      const hint = getReleaseHint(bowlInput.line, bowlInput.length, bowlInput.speed, bowlInput.variation);
      const fullDeliveryReveal = `🥎 **${currentBowler.name} (${currentBowler.style})** bowls a **${bowlInput.speed} ${bowlInput.variation}** pitched **${bowlInput.length}** on **${bowlInput.line}**!`;

      // 2. Collect Player choices
      let selectedStance = null;
      let selectedFootwork = null;
      let selectedIntent = null;
      let selectedZone = null;
      let batStep = 'stance';

      const runBatChoice = async () => {
        const stateData = await getBatterRenderState(selectedZone, selectedStance, selectedFootwork, selectedIntent, batStep, bowlInput.fieldPreset, hint, fullDeliveryReveal);
        await message.edit(stateData).catch(async () => {
          message = await message.channel.send(stateData);
        });

        const filter = idx => idx.user.id === discordId && idx.customId.startsWith('bat_step_');
        const collectResult = await new Promise((resBat) => {
          const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
          collector.on('collect', async idx => {
            await idx.deferUpdate().catch(() => {});
            const customId = idx.customId;

            if (customId.startsWith('bat_step_stance_')) {
              selectedStance = customId.replace('bat_step_stance_', '').replace(`_${discordId}`, '');
              batStep = 'footwork';
              resBat('next');
            } else if (customId.startsWith('bat_step_footwork_')) {
              selectedFootwork = customId.replace('bat_step_footwork_', '').replace(`_${discordId}`, '');
              batStep = selectedFootwork === 'Leave' ? 'leave_confirm' : 'intent';
              resBat('next');
            } else if (customId.startsWith('bat_step_intent_')) {
              selectedIntent = customId.replace('bat_step_intent_', '').replace(`_${discordId}`, '');
              batStep = selectedIntent === 'Leave' ? 'leave_confirm' : 'zone';
              selectedZone = null;
              resBat('next');
            } else if (customId.startsWith('bat_step_zone_')) {
              selectedZone = customId.replace('bat_step_zone_', '').replace(`_${discordId}`, '');
              resBat('next');
            } else if (customId.startsWith('bat_step_confirm_')) {
              if (selectedFootwork === 'Leave' || selectedIntent === 'Leave' || selectedZone) resBat('submit');
              else resBat('next');
            } else if (customId.startsWith('bat_step_back_stance_')) {
              if (batStep !== 'footwork') return;
              selectedStance = null;
              batStep = 'stance';
              resBat('next');
            } else if (customId.startsWith('bat_step_back_footwork_')) {
              if (batStep !== 'intent') return;
              selectedFootwork = null;
              batStep = 'footwork';
              resBat('next');
            }
          });

          collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) resBat('timeout');
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
          const shotName = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
            ? 'Leave'
            : (equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone));
          return { stance: selectedStance || 'In Line', footwork: selectedFootwork, intent: selectedIntent, zone: selectedZone, shotType: shotName, targetZone: selectedZone || 'Long On', equippedShot };
        }
      };

      const batterInput = await runBatChoice();
      if (!batterInput || batterInput.timedOut) {
        timedOut = true;
        break;
      }

      // 3. Resolve Delivery Outcome
      const batterTimingVal = (playerAttrs.timing || 50) + (eqBonuses.timing || 0);
      let perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
      let slightlyChance = Math.max(0.10, 0.985 - perfectChance);

      let timingResult = 'Perfect';
      const roll = Math.random();
      if (roll < perfectChance) timingResult = 'Perfect';
      else if (roll < perfectChance + slightlyChance) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
      else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';

      const isPowerplay = (overs < 6);
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
        isPowerplay,
        pitch: match.pitch
      });

      playerRuns += simResult.runs;
      if (simResult.runs === 4 && !simResult.wicket) playerFours++;
      if (simResult.runs === 6 && !simResult.wicket) playerSixes++;

      attack.recordBall(simResult.runs, simResult.wicket, simResult.rebowl);

      let overEndedOnUser = false;
      if (!simResult.rebowl) {
        playerBalls++;
        balls++;
        if (balls >= 6) {
          const overChange = attack.completeOver();
          overs = attack.completedOvers;
          balls = 0;
          overEndedOnUser = true;
          if (overChange.nextBowler) {
            currentBowler = overChange.nextBowler;
          }
        }
      }
      currentRuns += simResult.runs;

      if (simResult.wicket) {
        playerWickets = 1;
        currentWickets++;
      }

      freeHit = simResult.nextIsFreeHit;

      // Check if user was dismissed
      if (playerWickets > 0) {
        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n\n` +
                         `${simResult.commentary}\n\n` +
                         `💔 **WICKET!** You depart for **${playerRuns} runs** off **${playerBalls} balls** (${playerFours}x4, ${playerSixes}x6).`;
        break;
      }

      // Strike Rotation & Partner Batting Simulation
      const userScoredOdd = (!simResult.rebowl && (simResult.runs === 1 || simResult.runs === 3));
      let partnerOnStrike = (userScoredOdd !== overEndedOnUser);

      if (partnerOnStrike && overs < 20 && currentWickets < 10) {
        const partnerLogs = [];

        while (partnerOnStrike && overs < 20 && currentWickets < 10) {
          balls++;
          let pOverEnded = false;

          const pRoll = Math.random();
          let pRuns = 0;
          let pText = '';
          let isPartnerOut = false;

          const isTopOrder = (currentWickets <= 3);
          const isMiddleOrder = (currentWickets >= 4 && currentWickets <= 6);
          const isTail = (currentWickets >= 7);

          const pDeck = (match.pitch || '').toLowerCase();
          const isToughPitch = pDeck.includes('green') || pDeck.includes('seam') || pDeck.includes('dry') || pDeck.includes('dust') || pDeck.includes('turn');
          const bowlerRating = currentBowler?.rating || opponentTeam.rating || 60;

          let dotProb = isTail ? 0.52 : (isMiddleOrder ? 0.44 : 0.36);
          if (isToughPitch) dotProb += 0.05;
          if (bowlerRating >= 75) dotProb += 0.04;

          let singleProb = isTail ? 0.28 : (isMiddleOrder ? 0.34 : 0.36);
          let twoProb = isTail ? 0.04 : 0.07;
          let threeProb = 0.01;
          let fourProb = isTail ? 0.04 : (isMiddleOrder ? 0.06 : 0.08);
          let sixProb = isTail ? 0.01 : (isMiddleOrder ? 0.02 : 0.03);

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
              pText = `${partnerName} pulls the Free Hit to deep square for a single (+1 run, strike rotated!).`;
            } else if (pRoll < 0.80) {
              pRuns = 4;
              partnerFours++;
              pText = `${partnerName} hammers the Free Hit through extra cover for FOUR! (+4 runs)`;
            } else {
              pRuns = 6;
              partnerSixes++;
              pText = `${partnerName} deposits the Free Hit deep into the stands for a huge SIX! (+6 runs)`;
            }
          } else if (pRoll < dotCutoff) {
            pRuns = 0;
            const dots = [
              `${partnerName} defends solidly on the front foot (0 runs).`,
              `${partnerName} is beaten outside off by a sharp ${currentBowler.style} delivery (0 runs).`,
              `${partnerName} pushes to mid-off, no run taken (0 runs).`,
              `${partnerName} leaves the ball alone outside off-stump (0 runs).`
            ];
            pText = dots[Math.floor(Math.random() * dots.length)];
          } else if (pRoll < singleCutoff) {
            pRuns = 1;
            const singles = [
              `${partnerName} works it into the gap at mid-wicket for a single (+1 run, strike rotated!).`,
              `${partnerName} pushes down to long-on for a sharp single (+1 run, strike rotated!).`,
              `${partnerName} drops it softly towards square leg and crosses for one (+1 run, strike rotated!).`,
              `${partnerName} taps it gently to cover-point and scrambles across (+1 run, strike rotated!).`
            ];
            pText = singles[Math.floor(Math.random() * singles.length)];
          } else if (pRoll < twoCutoff) {
            pRuns = 2;
            pText = `${partnerName} clips off the pads and sprints back for two (+2 runs).`;
          } else if (pRoll < threeCutoff) {
            pRuns = 3;
            pText = `${partnerName} punches through extra cover and they run three hard (+3 runs, strike rotated!).`;
          } else if (pRoll < fourCutoff) {
            pRuns = 4;
            partnerFours++;
            const fours = [
              `${partnerName} leans into a glorious cover drive for FOUR! (+4 runs)`,
              `${partnerName} swivels and pulls firmly behind square for FOUR! (+4 runs)`,
              `${partnerName} opens the face and steers it past backward point for FOUR! (+4 runs)`
            ];
            pText = fours[Math.floor(Math.random() * fours.length)];
          } else if (pRoll < sixCutoff) {
            pRuns = 6;
            partnerSixes++;
            pText = `${partnerName} clears the front leg and smokes it over long-on for SIX! (+6 runs)`;
          } else {
            pRuns = 0;
            isPartnerOut = true;
            currentWickets++;
            pText = `🚨 ${partnerName} is CAUGHT in the deep! Wicket falls!`;
          }

          attack.recordBall(pRuns, isPartnerOut, false);
          if (balls >= 6) {
            const overChange = attack.completeOver();
            overs = attack.completedOvers;
            balls = 0;
            pOverEnded = true;
            if (overChange.nextBowler) {
              currentBowler = overChange.nextBowler;
            }
          }

          currentRuns += pRuns;
          partnerRuns += pRuns;
          partnerBalls++;

          const currentOverStr = pOverEnded ? `${overs}.0` : `${overs}.${balls}`;
          partnerLogs.push(`• **[${currentOverStr}]** ${pText}`);

          if (pOverEnded && overs < 20) {
            partnerLogs.push(`🔄 **End of Over (${overs}.0 ov):** **${currentBowler.name}** (${currentBowler.style}) comes into the attack.`);
          }

          if (isPartnerOut) {
            if (currentWickets < 10) {
              partnerName = (validUserRoster && validUserRoster.length > 0)
                ? validUserRoster[reserveIdx++ % validUserRoster.length]
                : `Batter ${currentWickets + 1}`;
              partnerRuns = 0;
              partnerBalls = 0;
              partnerFours = 0;
              partnerSixes = 0;
              partnerLogs.push(`👉 *New batsman **${partnerName}** walks to the crease.*`);
            }
            partnerOnStrike = !pOverEnded;
          } else {
            const pScoredOdd = (pRuns === 1 || pRuns === 3);
            partnerOnStrike = (pScoredOdd === pOverEnded);
          }

          if (currentWickets >= 10 || overs >= 20) break;

          if (partnerOnStrike) {
            const partnerEmbed = new EmbedBuilder()
              .setTitle(`🏏 Partner on Strike — ${userTeam.name} vs ${opponentTeam.name}`)
              .setColor('#f59e0b')
              .setDescription(
                `🏃 **You are at the non-striker's end watching ${partnerName} (${getPlayerHand(partnerName).includes('Left') ? 'LHB' : 'RHB'}) bat.**\n\n` +
                `🥎 **Bowler:** ${currentBowler.name} (${currentBowler.style})\n` +
                `Spell: **${attack.getBowlerFigureString(currentBowler)}**\n` +
                partnerLogs.slice(-3).join('\n') + `\n\n` +
                `📊 **Team Score:** **${currentRuns}/${currentWickets}** (${currentOverStr} ov)\n` +
                `⭐ **Your Score:** **${playerRuns}* (${playerBalls}b)** | 👤 **${partnerName}:** **${partnerRuns}* (${partnerBalls}b)**`
              );
            await message.edit({ embeds: [partnerEmbed], components: [], files: [], attachments: [] }).catch(() => {});
            await sleep(1600);
          }
        }

        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n` +
                         `${simResult.commentary}\n\n` +
                         `🏃 **Partner's Stint (While you were at non-striker's end):**\n` +
                         partnerLogs.join('\n') + `\n` +
                         `*(Team: ${currentRuns}/${currentWickets}, Overs: ${overs}.${balls})*`;

        if (currentWickets >= 10 || overs >= 20) break;
      } else {
        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed} by ${currentBowler.name})\n` +
                         `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n\n` +
                         `${simResult.commentary}`;
        if (overEndedOnUser && overs < 20 && playerWickets === 0) {
          lastCommentary += `\n\n🔄 **End of Over (${overs}.0 ov):** **${currentBowler.name}** (${currentBowler.style}) comes into the attack from the Pavilion End! [Spell: ${attack.getBowlerFigureString(currentBowler)}]`;
        }
      }
    }
  };

  await playInteractiveInnings();

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle(`⚠️ Match Forfeited due to Inactivity`)
      .setDescription(`You did not respond within 15 minutes! The match has ended and is recorded as a **Loss**.`)
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [], attachments: [] }).catch(() => {});
    await sleep(1500);

    const summaryDetails = {
      pitch: match.pitch,
      firstInningsText: `${userTeam.name} ${currentRuns}/${currentWickets} (${overs}.${balls} ov) [Forfeit]`,
      secondInningsText: `${opponentTeam.name} 0/0 (0.0 ov)`,
      resultText: `${opponentTeam.name} won by forfeit (inactivity)`
    };

    db.prepare('UPDATE players SET confidence = MAX(10, confidence - 15) WHERE discord_id = ?').run(discordId);
    await finishFranchiseMatch(interaction, player, pf, false, playerRuns, playerBalls, playerFours, playerSixes, Math.max(1, playerWickets), 0, 0, 0, opponentTeam, summaryDetails, message);
    return;
  }

  // Show final delivery outcome embed (stays for 5 seconds on dismissal)
  const finalEmbed = new EmbedBuilder()
    .setTitle(playerWickets > 0 ? `💔 WICKET! Dismissed — ${userTeam.name} vs ${opponentTeam.name}` : `🏏 Batting Stint Complete: ${userTeam.name}`)
    .setDescription(
      `▬▬▬ **Match Situation** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `📊 **Team Score:** **${currentRuns}/${currentWickets}** (${overs}.${balls} ov)\n` +
      `🏏 **Your Contribution:** **${playerRuns}${playerWickets > 0 ? '' : '*'} (${playerBalls}b)** [${playerFours}x4, ${playerSixes}x6]${playerWickets > 0 ? ' — **OUT**' : ''}`
    )
    .setColor(playerWickets > 0 ? '#e74c3c' : '#38bdf8');
  await message.edit({ embeds: [finalEmbed], components: [], files: [], attachments: [] }).catch(() => {});
  await sleep(playerWickets > 0 ? 5000 : 2500);

  // Wrap up remaining overs of 1st Innings
  const wasDuckFirst = (playerRuns === 0);
  let shockOversFirst = wasDuckFirst ? 3 : (playerRuns < 12 ? 2 : 0);

  while (overs < 20 && currentWickets < 10) {
    overs++;
    let runsInOver = 6;
    if (currentWickets <= 3) runsInOver = 6 + Math.floor(Math.random() * 4);
    else if (currentWickets <= 6) runsInOver = 4 + Math.floor(Math.random() * 4);
    else runsInOver = 2 + Math.floor(Math.random() * 4);

    if (shockOversFirst > 0) {
      shockOversFirst--;
      runsInOver = Math.max(1, runsInOver - 2);
    }
    if (match.pitch.includes('Flat Belter')) runsInOver += 1;
    if (match.pitch.includes('Green') || match.pitch.includes('Dust') || match.pitch.includes('Slow')) runsInOver -= 1;
    currentRuns += Math.max(1, runsInOver);

    let wChance = currentWickets >= 7 ? 0.55 : (currentWickets >= 4 ? 0.38 : 0.25);
    if (shockOversFirst > 0) wChance += 0.18;
    if (Math.random() < wChance) currentWickets++;
  }

  const teamRuns = currentRuns;
  const teamWickets = Math.min(10, currentWickets);
  const target = teamRuns + 1;

  // Innings Break Embed
  const breakEmbed = new EmbedBuilder()
    .setTitle(`🏏 Innings Break: ${userTeam.name} set ${teamRuns}/${teamWickets}`)
    .setDescription(
      `💥 **Innings 1 Complete!**\n\n` +
      `• **Your Contribution:** **${playerRuns}${playerWickets > 0 ? '' : '*'} runs** off **${playerBalls} balls** (${playerFours}x4, ${playerSixes}x6)\n` +
      `• **Team Total:** **${teamRuns}/${teamWickets}** in 20.0 overs (CRR: ${(teamRuns / 20).toFixed(2)})\n\n` +
      `🎯 **Target for ${opponentTeam.name}:** **${target} runs** (Req. RR: ${(target / 20).toFixed(2)} RPO)\n\n` +
      `🔔 **Innings 2:** Your bowlers take the field to defend the total!`
    )
    .setColor('#38bdf8');
  await message.edit({ embeds: [breakEmbed], components: [], files: [] }).catch(() => {});
  await sleep(3500);

  // Innings 2: Defense Simulation Ticker
  let oppRuns = 0;
  let oppWickets = 0;
  let oppOvers = 0;
  let oppBalls = 0;
  let defTicker = [
    `🔮 **Defending ${target} runs against ${opponentTeam.name}...**\n`
  ];

  const defEmbed = new EmbedBuilder()
    .setTitle(`🥎 Innings 2: Defending ${target} vs ${opponentTeam.name}`)
    .setDescription(defTicker.join('\n'))
    .setColor('#f59e0b');
  await message.edit({ embeds: [defEmbed] }).catch(() => {});

  while (oppOvers < 20 && oppRuns < target && oppWickets < 10) {
    await sleep(1200);
    oppOvers++;
    const runsNeeded = target - oppRuns;
    const ballsLeft = (20 - oppOvers + 1) * 6;
    const reqRate = (runsNeeded / (ballsLeft / 6));

    let baseRuns = 6;
    if (oppWickets <= 3) baseRuns = 6 + Math.floor(Math.random() * 4);
    else if (oppWickets <= 6) baseRuns = 4 + Math.floor(Math.random() * 4);
    else baseRuns = 2 + Math.floor(Math.random() * 4);

    if (reqRate > 12) baseRuns += Math.floor(Math.random() * 3);
    else if (reqRate < 5.5) baseRuns = Math.min(baseRuns, 7);

    if (match.pitch.includes('Green') || match.pitch.includes('Dust') || match.pitch.includes('Slow')) {
      baseRuns -= 1;
    }
    baseRuns = Math.max(1, baseRuns);

    if (oppRuns + baseRuns >= target) {
      const ballsTaken = Math.min(6, Math.max(1, Math.ceil((target - oppRuns) / 2)));
      oppRuns = target;
      oppBalls = ballsTaken;
      defTicker.push(`🔹 **Over ${oppOvers}.${oppBalls}:** ${opponentTeam.name} reach ${oppRuns}/${oppWickets} — 💔 **Target chased down.**`);
      break;
    }

    oppRuns += baseRuns;

    let wChance = oppWickets >= 7 ? 0.55 : (oppWickets >= 4 ? 0.38 : 0.24);
    if (reqRate > 13) wChance += 0.25;
    else if (reqRate > 10.5) wChance += 0.14;
    else if (reqRate < 6) wChance -= 0.10;

    if (Math.random() < wChance) {
      oppWickets++;
      if (oppWickets >= 10) {
        defTicker.push(`🚨 **Over ${oppOvers}.4:** ${opponentTeam.name} are ${oppRuns}/${oppWickets} — 💥 **ALL OUT!**`);
        break;
      }
      defTicker.push(`🚨 **Over ${oppOvers}:** ${opponentTeam.name} ${oppRuns}/${oppWickets} — 💥 **WICKET FALLS!** (Need ${target - oppRuns} off ${(20 - oppOvers) * 6} balls)`);
    } else {
      defTicker.push(`🔹 **Over ${oppOvers}:** ${opponentTeam.name} ${oppRuns}/${oppWickets} (Need ${target - oppRuns} off ${(20 - oppOvers) * 6} balls, RRR: ${((target - oppRuns) / Math.max(1, 20 - oppOvers)).toFixed(1)})`);
    }

    defEmbed.setDescription(defTicker.slice(-6).join('\n'));
    await message.edit({ embeds: [defEmbed] }).catch(() => {});
  }

  const won = (oppRuns < target);
  const ballsLeft = Math.max(0, (20 - oppOvers) * 6 - oppBalls);
  const margin = won ? `${target - 1 - oppRuns} runs` : `${10 - oppWickets} wickets (${ballsLeft} balls remaining)`;
  const resultText = won ? `${userTeam.name} won by ${margin}` : `${opponentTeam.name} won by ${margin}`;

  const summaryDetails = {
    pitch: match.pitch,
    firstInningsText: `${userTeam.name} ${teamRuns}/${teamWickets} (20.0 ov)`,
    secondInningsText: `${opponentTeam.name} ${oppRuns}/${oppWickets} (${oppOvers}.${oppBalls} ov)`,
    resultText
  };

  await finishFranchiseMatch(interaction, player, pf, won, playerRuns, playerBalls, playerFours, playerSixes, playerWickets, 0, 0, 0, opponentTeam, summaryDetails, message);
}

async function runFranchiseBowlingMatch(interaction, player, pf, match, opponentTeam, userTeam) {
  const discordId = player.discord_id;
  setPlayerInMatch(discordId, 'franchise', { leagueId: pf.league_id, round: pf.current_round, title: `${userTeam.name} vs ${opponentTeam.name}` });
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const isSpin = player.bowling_style?.toLowerCase().includes('spin') ?? false;

  const userTeamRuns = match.firstInningsRuns;
  const userTeamWickets = match.firstInningsWickets;
  const target = userTeamRuns + 1;

  let oppRuns = 0;
  let oppWickets = 0;
  let oppOvers = 0;
  let oppBalls = 0;

  let runsConceded = 0;
  let ballsBowled = 0;
  let wicketsTaken = 0;
  let lastCommentary = '🥎 You stretch your arms, walking back to your bowling mark...';

  const bowlChoices = Object.entries(deliveries)
    .filter(([k, v]) => isSpin ? v.type === 'spin' : v.type === 'fast')
    .map(([k, v]) => ({ label: v.name, value: k, description: v.desc.substring(0, 100) }));

  // Simulate Overs 1 to 3 of Opponent Chase
  oppOvers = 3;
  oppBalls = 0;
  oppRuns = 22 + Math.floor(Math.random() * 8);
  oppWickets = Math.random() < 0.4 ? 1 : 0;

  const initialEmbed = new EmbedBuilder()
    .setTitle(`🥎 Bowling Day: ${userTeam.name} vs ${opponentTeam.name}`)
    .setDescription(
      `🪙 **Toss:** **${userTeam.name}** won the toss and elected to bat first!\n` +
      `📋 **1st Innings:** **${userTeam.name}** set **${userTeamRuns}/${userTeamWickets}** (20.0 ov) on a *${match.pitch}*.\n` +
      `🎯 **Target for ${opponentTeam.name}:** **${target} runs** (Req. RR: ${(target / 20).toFixed(2)})\n\n` +
      `🔹 **Overs 1–3 (Powerplay):** ${opponentTeam.name} are **${oppRuns}/${oppWickets}**.\n` +
      `🔔 **Captain calls you up to bowl Over 4!** Restrict the batsmen and pick up wickets!\n\n` +
      `*Select your delivery to bowl ball 4.1!*`
    )
    .setColor('#e74c3c')
    .addFields(
      { name: '📊 Opponent Score', value: `**${oppRuns}/${oppWickets}** (Target: **${target}**)\nOvers: **${oppOvers}.${oppBalls}** / 20.0`, inline: true },
      { name: '🎯 Equation', value: `Need **${Math.max(0, target - oppRuns)}** from **${(20 - oppOvers) * 6 - oppBalls}** balls\nRRR: **${(((Math.max(0, target - oppRuns)) / ((20 - oppOvers) * 6 - oppBalls)) * 6).toFixed(2)}**`, inline: true },
      { name: '🥎 Your Figures', value: `**${wicketsTaken}/${runsConceded}** in **${(ballsBowled / 6).toFixed(1)} ov**`, inline: true }
    );

  const getMenuRow = (stepPrompt) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`franchise_bowl_${discordId}`)
      .setPlaceholder(stepPrompt)
      .addOptions(bowlChoices.slice(0, 25))
  );

  let message = null;
  try {
    message = await safeReplyOrEdit(interaction, { embeds: [initialEmbed], components: [getMenuRow('Select delivery for ball 4.1...')] });
  } catch (err) {
    if (interaction.channel?.send) {
      message = await interaction.channel.send({ embeds: [initialEmbed], components: [getMenuRow('Select delivery for ball 4.1...')] }).catch(() => {});
    }
  }
  if (!message && interaction.channel?.send) {
    message = await interaction.channel.send({ embeds: [initialEmbed], components: [getMenuRow('Select delivery for ball 4.1...')] }).catch(() => {});
  }

  let matchEnded = false;
  let timedOut = false;

  const bowlOver = async (overNum) => {
    for (let b = 1; b <= 6; b++) {
      if (oppRuns >= target || oppWickets >= 10) {
        matchEnded = true;
        break;
      }

      const filter = idx => idx.customId === `franchise_bowl_${discordId}` && idx.user.id === discordId;
      const deliveryKey = await new Promise((res) => {
        const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
        collector.on('collect', async idx => {
          await idx.deferUpdate().catch(() => {});
          res(idx.values[0]);
        });
        collector.on('end', (collected, reason) => {
          if (reason === 'time' && collected.size === 0) res('timeout');
        });
      });

      if (deliveryKey === 'timeout') {
        timedOut = true;
        matchEnded = true;
        break;
      }

      const aiShotKey = getAIShot();
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
      oppBalls++;
      if (oppBalls >= 6) {
        oppOvers++;
        oppBalls = 0;
      }
      if (simResult.wicket) {
        oppWickets++;
        wicketsTaken++;
      }

      lastCommentary = `🥎 **You bowled:** ${deliveries[deliveryKey].name}\n🎯 **Batsman played:** ${shots[aiShotKey].name}\n\n${simResult.commentary}`;

      if (oppRuns >= target || oppWickets >= 10) {
        matchEnded = true;
        break;
      }

      if (b < 6) {
        const currentEmbed = new EmbedBuilder()
          .setTitle(`🥎 Bowling Day: Over ${overNum}`)
          .setDescription(`▬▬▬ **Previous Delivery (${overNum}.${b})** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n*Select next delivery to bowl ball ${overNum}.${b + 1}!*`)
          .setColor('#e74c3c')
          .addFields(
            { name: '📊 Opponent Score', value: `**${oppRuns}/${oppWickets}** (Target: **${target}**)\nOvers: **${oppOvers}.${oppBalls}** / 20.0`, inline: true },
            { name: '🎯 Equation', value: `Need **${Math.max(0, target - oppRuns)}** off **${Math.max(0, (20 - oppOvers) * 6 - oppBalls)}** balls\nRRR: **${(((Math.max(0, target - oppRuns)) / Math.max(1, (20 - oppOvers) * 6 - oppBalls)) * 6).toFixed(2)}**`, inline: true },
            { name: '🥎 Your Figures', value: `**${wicketsTaken}/${runsConceded}** in **${(ballsBowled / 6).toFixed(1)} ov**`, inline: true }
          );

        await message.edit({ embeds: [currentEmbed], components: [getMenuRow(`Bowl ball ${overNum}.${b + 1}...`)] }).catch(() => {});
      }
    }
  };

  // Bowl Spell 1 (Over 4)
  await bowlOver(4);

  // If match hasn't ended, simulate middle overs (Overs 5–16)
  if (!matchEnded && oppRuns < target && oppWickets < 10) {
    const midEmbed = new EmbedBuilder()
      .setTitle(`🥎 Bowling Day: ${userTeam.name} vs ${opponentTeam.name}`)
      .setDescription(`End of Over 4! You conceded **${runsConceded} runs** (${wicketsTaken} wkts).\n\n🔮 **Simulating middle overs (Overs 5–16)...**`)
      .setColor('#e74c3c')
      .addFields(
        { name: '📊 Score', value: `**${oppRuns}/${oppWickets}**`, inline: true },
        { name: '🎯 Target', value: `**${target}**`, inline: true }
      );
    await message.edit({ embeds: [midEmbed], components: [] }).catch(() => {});
    await sleep(1500);

    for (let o = 5; o <= 16; o++) {
      if (oppRuns >= target || oppWickets >= 10) {
        matchEnded = true;
        break;
      }
      oppOvers = o;
      oppBalls = 0;
      const runsInOver = 6 + Math.floor(Math.random() * 7);
      oppRuns += runsInOver;
      if (Math.random() < 0.2) oppWickets++;
    }

    if (!matchEnded && oppRuns < target && oppWickets < 10) {
      const deathEmbed = new EmbedBuilder()
        .setTitle(`🥎 Death Overs: Over 17`)
        .setDescription(
          `🔔 **Crucial Death Over!** Captain brings you back for Over 17!\n` +
          `Opponent is **${oppRuns}/${oppWickets}** needing **${target - oppRuns} runs** from **24 balls** (RRR: ${(((target - oppRuns) / 24) * 6).toFixed(2)}).\n\n` +
          `*Select your delivery to bowl ball 17.1!*`
        )
        .setColor('#e74c3c')
        .addFields(
          { name: '📊 Opponent Score', value: `**${oppRuns}/${oppWickets}** (Target: **${target}**)\nOvers: **16.0** / 20.0`, inline: true },
          { name: '🎯 Equation', value: `Need **${target - oppRuns}** from **24** balls`, inline: true },
          { name: '🥎 Your Figures', value: `**${wicketsTaken}/${runsConceded}** in **${(ballsBowled / 6).toFixed(1)} ov**`, inline: true }
        );

      await message.edit({ embeds: [deathEmbed], components: [getMenuRow('Bowl ball 17.1...')] }).catch(() => {});

      // Bowl Spell 2 (Over 17)
      await bowlOver(17);
    }
  }

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle(`⚠️ Match Forfeited due to Inactivity`)
      .setDescription(`You did not respond within 15 minutes! The match has ended and is recorded as a **Loss**.`)
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [], attachments: [] }).catch(() => {});
    await sleep(1500);

    const summaryDetails = {
      pitch: match.pitch,
      firstInningsText: `${userTeam.name} ${userTeamRuns}/${userTeamWickets} (20.0 ov)`,
      secondInningsText: `${opponentTeam.name} ${oppRuns}/${oppWickets} (${oppOvers}.${oppBalls} ov) [Forfeit]`,
      resultText: `${opponentTeam.name} won by forfeit (inactivity)`
    };

    db.prepare('UPDATE players SET confidence = MAX(10, confidence - 15) WHERE discord_id = ?').run(discordId);
    await finishFranchiseMatch(interaction, player, pf, false, 0, 0, 0, 0, 0, wicketsTaken, runsConceded, (ballsBowled / 6), opponentTeam, summaryDetails, message);
    return;
  }

  // Simulate remaining death overs (Overs 18–20)
  if (!matchEnded && oppRuns < target && oppWickets < 10) {
    for (let o = 18; o <= 20; o++) {
      oppOvers = o;
      oppBalls = 0;
      const runsInOver = 7 + Math.floor(Math.random() * 8);
      if (oppRuns + runsInOver >= target) {
        oppRuns = target;
        oppBalls = Math.min(6, Math.max(1, Math.ceil((target - oppRuns) / 2)));
        break;
      }
      oppRuns += runsInOver;
      if (Math.random() < 0.25) {
        oppWickets++;
        if (oppWickets >= 10) break;
      }
    }
  }

  const won = oppRuns < target && (oppWickets >= 10 || oppOvers >= 20);
  const ballsLeft = Math.max(0, (20 - oppOvers) * 6 - oppBalls);
  const margin = won
    ? (oppWickets >= 10 ? `${target - 1 - oppRuns} runs (all out)` : `${target - 1 - oppRuns} runs`)
    : `${10 - oppWickets} wickets (${ballsLeft} balls remaining)`;
  const resultText = won ? `${userTeam.name} won by ${margin}` : `${opponentTeam.name} won by ${margin}`;

  const summaryDetails = {
    pitch: match.pitch,
    firstInningsText: `${userTeam.name} ${userTeamRuns}/${userTeamWickets} (20.0 ov)`,
    secondInningsText: `${opponentTeam.name} ${oppRuns}/${oppWickets} (${oppOvers}.${oppBalls} ov)`,
    resultText
  };

  await finishFranchiseMatch(interaction, player, pf, won, 0, 0, 0, 0, 0, wicketsTaken, runsConceded, (ballsBowled / 6), opponentTeam, summaryDetails, message);
}

async function runFranchiseAllRounderMatch(interaction, player, pf, match, opponentTeam, userTeam) {
  const discordId = player.discord_id;
  setPlayerInMatch(discordId, 'franchise', { leagueId: pf.league_id, round: pf.current_round, title: `${userTeam.name} vs ${opponentTeam.name}` });
  const playerAttrs = getEffectiveAttributes(db, discordId);
  const eqBonuses = getEquipmentBonuses(db, discordId);
  const activeSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(discordId).map(s => s.skill_key);
  const isSpin = player.bowling_style?.toLowerCase().includes('spin') ?? false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- INNINGS 1: BATTING AT THE DEATH ---
  let userRuns = 0;
  let ballsFaced = 0;
  let userWickets = 0;
  let foursCount = 0;
  let sixesCount = 0;
  let freeHit = false;

  let teamRuns = 140 + Math.floor(Math.random() * 20);
  let teamWickets = 4;
  let overs = 18;
  let balls = 0;

  let lastCommentary = `🏏 You walk out to bat at No. 6 in the 19th over. Provide the finishing kick!`;

  const getBatterRenderState = async (selectedZone, selectedStance, selectedFootwork, selectedIntent, step, actualField, releaseHint, fullDeliveryReveal) => {
    const embedState = new EmbedBuilder()
      .setTitle(`🏏 Inning 1: Batting vs ${opponentTeam.name}`)
      .setDescription(`▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                     (releaseHint ? `${releaseHint}\n\n` : ''))
      .setColor('#9b59b6')
      .addFields(
        { name: '📊 Team Total', value: `**${teamRuns}/${teamWickets}**\nOvers: **${overs}.${balls}** / 20.0`, inline: true },
        { name: '🏏 Your Score', value: `**${userRuns}* (${ballsFaced}b)**\n${foursCount}x4 | ${sixesCount}x6`, inline: true },
        { name: '⚡ Match Situation', value: `Death Overs Phase (${Math.max(0, 12 - (overs === 18 ? balls : 6 + balls))} balls left)`, inline: true }
      );

    if (freeHit) {
      embedState.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'You cannot be dismissed on this delivery!' });
    }

    const isLeave = (selectedFootwork === 'Leave' || selectedIntent === 'Leave');

    embedState.addFields(
      { name: '🧍 1. Stance', value: selectedStance ? `**${selectedStance}**` : (step === 'stance' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '👣 2. Footwork', value: selectedFootwork ? (selectedFootwork === 'Leave' ? '🛡️ **Leave**' : `**${selectedFootwork}**`) : (step === 'footwork' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
      { name: '🎯 3. Intent', value: isLeave ? '🛡️ **Leave**' : (selectedIntent ? `**${selectedIntent}**` : (step === 'intent' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true },
      { name: '📐 4. Zone', value: isLeave ? '— *(Left Alone)*' : (selectedZone ? `**${selectedZone}**` : (step === 'zone' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true }
    );

    let rows = [];
    if (step === 'stance') {
      embedState.setDescription(embedState.data.description + `👉 **Step 1:** Select your **Stance** at the crease.`);
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_stance_Off Side_${discordId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_In Line_${discordId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bat_step_stance_Leg Side_${discordId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
      );
      rows = [row1];
    } else if (step === 'footwork') {
      embedState.setDescription(embedState.data.description + `👉 **Step 2:** Select your **Footwork** commitment.`);
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
      const leaveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
      const leaveShot = getPlayerEquippedShot(discordId, leaveFw, 'Leave', 'In Line');
      const leaveType = (selectedFootwork && selectedFootwork !== 'Leave') ? `${selectedFootwork} Leave` : 'Leave';
      embedState.setDescription(
        embedState.data.description +
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
      embedState.setDescription(embedState.data.description + `👉 **Step 3:** Select your batting **Intent** for this ball.`);
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
      const shotName = selectedZone ? getDerivedShotName(selectedFootwork, selectedIntent, selectedZone) : null;
      embedState.setDescription(embedState.data.description + `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
                                `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
                                (shotName ? `🏏 **Projected Shot:** \`${shotName}\`` : `💡 *Click any field zone to aim.*`));
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Third Man_${discordId}`).setLabel('Third Man').setStyle(selectedZone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Point_${discordId}`).setLabel('Point').setStyle(selectedZone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Cover_${discordId}`).setLabel('Cover').setStyle(selectedZone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Long Off_${discordId}`).setLabel('Long Off').setStyle(selectedZone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_zone_Long On_${discordId}`).setLabel('Long On').setStyle(selectedZone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Mid Wicket_${discordId}`).setLabel('Mid Wicket').setStyle(selectedZone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Square Leg_${discordId}`).setLabel('Square Leg').setStyle(selectedZone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`bat_step_zone_Fine Leg_${discordId}`).setLabel('Fine Leg').setStyle(selectedZone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bat_step_confirm_${discordId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!selectedZone)
      );
      rows = [row1, row2, row3];
    }

    const buffer = await generateFieldImage(actualField || 'Defensive', selectedZone, false, player.batting_hand);
    const files = [];
    if (buffer) {
      const filename = `field_${Date.now()}.png`;
      files.push(new AttachmentBuilder(buffer, { name: filename }));
      embedState.setImage(`attachment://${filename}`);
    }

    return { embeds: [embedState], components: rows, files };
  };

  let message = null;
  const initialARData = {
    embeds: [
      new EmbedBuilder()
        .setTitle(`🏏 All-Rounder Match: ${userTeam.name} vs ${opponentTeam.name}`)
        .setDescription(
          `🪙 **Toss:** **${userTeam.name}** won the toss and elected to bat first on a *${match.pitch}*!\n` +
          `📊 **Situation:** Team is **${teamRuns}/${teamWickets}** in the 19th over.\n\n` +
          `🔔 **Inning 1:** You are batting at the death (up to 8 balls to face)!\n` +
          `*Get ready to face the bowler!*`
        )
        .setColor('#9b59b6')
    ],
    components: [],
    files: []
  };

  try {
    message = await safeReplyOrEdit(interaction, initialARData);
  } catch (err) {
    if (interaction.channel?.send) {
      message = await interaction.channel.send(initialARData).catch(() => {});
    }
  }
  if (!message && interaction.channel?.send) {
    message = await interaction.channel.send(initialARData).catch(() => {});
  }

  const arOverTypes = {};
  let timedOut = false;
  // Batting Loop (faces up to 8 deliveries or until out/overs end)
  while (userWickets === 0 && ballsFaced < 8 && overs < 20) {
    // 1. Generate Bowler Delivery locked to the active over's bowler craft
    const ovIdx = Math.floor(ballsFaced / 6);
    if (!arOverTypes[ovIdx]) arOverTypes[ovIdx] = pickBowlerTypeForOver(match.pitch, ovIdx);
    const bowlInput = generateBowlerDelivery(match.pitch, arOverTypes[ovIdx]);

    const hint = getReleaseHint(bowlInput.line, bowlInput.length, bowlInput.speed, bowlInput.variation);

    let selectedStance = null;
    let selectedFootwork = null;
    let selectedIntent = null;
    let selectedZone = null;
    let batStep = 'stance';

    const runBatChoice = async () => {
      const fullDeliveryReveal = `🥎 **${bowlInput.speed} ${bowlInput.variation}** pitched **${bowlInput.length}** and angling **${bowlInput.line}**!`;
      const stateData = await getBatterRenderState(selectedZone, selectedStance, selectedFootwork, selectedIntent, batStep, bowlInput.fieldPreset, hint, fullDeliveryReveal);
      await message.edit(stateData).catch(async () => {
        message = await message.channel.send(stateData);
      });

      const filter = idx => idx.user.id === discordId && idx.customId.startsWith('bat_step_');
      const collectResult = await new Promise((resBat) => {
        const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
        collector.on('collect', async idx => {
          await idx.deferUpdate().catch(() => {});
          const customId = idx.customId;

          if (customId.startsWith('bat_step_stance_')) {
            selectedStance = customId.replace('bat_step_stance_', '').replace(`_${discordId}`, '');
            batStep = 'footwork';
            resBat('next');
          } else if (customId.startsWith('bat_step_footwork_')) {
            selectedFootwork = customId.replace('bat_step_footwork_', '').replace(`_${discordId}`, '');
            batStep = selectedFootwork === 'Leave' ? 'leave_confirm' : 'intent';
            resBat('next');
          } else if (customId.startsWith('bat_step_intent_')) {
            selectedIntent = customId.replace('bat_step_intent_', '').replace(`_${discordId}`, '');
            batStep = selectedIntent === 'Leave' ? 'leave_confirm' : 'zone';
            selectedZone = null;
            resBat('next');
          } else if (customId.startsWith('bat_step_zone_')) {
            selectedZone = customId.replace('bat_step_zone_', '').replace(`_${discordId}`, '');
            resBat('stay');
          } else if (customId.startsWith('bat_step_confirm_')) {
            resBat('done');
          } else if (customId.startsWith('bat_step_back_stance_')) {
            selectedStance = null;
            selectedFootwork = null;
            selectedIntent = null;
            selectedZone = null;
            batStep = 'stance';
            resBat('back');
          } else if (customId.startsWith('bat_step_back_footwork_')) {
            selectedFootwork = null;
            selectedIntent = null;
            selectedZone = null;
            batStep = 'footwork';
            resBat('back');
          }
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time' && collected.size === 0) resBat('timeout');
        });
      });

      if (collectResult === 'timeout') {
        timedOut = true;
        return { timedOut: true };
      }
      if (collectResult === 'stay' || collectResult === 'next' || collectResult === 'back') {
        return runBatChoice();
      }
      const effectiveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
      const equippedShot = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
        ? getPlayerEquippedShot(discordId, effectiveFw, 'Leave', 'In Line')
        : (selectedZone ? getPlayerEquippedShot(discordId, selectedFootwork, selectedIntent, selectedZone) : null);
      const shotName = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
        ? 'Leave'
        : (equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone));
      return { stance: selectedStance || 'In Line', footwork: selectedFootwork, intent: selectedIntent, zone: selectedZone, shotType: shotName, targetZone: selectedZone || 'Long On', equippedShot };
    };

    const batterInput = await runBatChoice();
    if (!batterInput || batterInput.timedOut) {
      timedOut = true;
      break;
    }
    const batterTimingVal = (playerAttrs.timing || 50) + (eqBonuses.timing || 0);
    const perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
    const slightlyChance = Math.max(0.10, 0.985 - perfectChance);

    let timingResult = 'Perfect';
    const roll = Math.random();
    if (roll < perfectChance) timingResult = 'Perfect';
    else if (roll < perfectChance + slightlyChance) timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
    else timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';

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
      isPowerplay: false,
      pitch: match.pitch,
      battingHand: player.batting_hand
    });

    userRuns += simResult.runs;
    teamRuns += simResult.runs;
    if (simResult.runs === 4 && !simResult.wicket) foursCount++;
    if (simResult.runs === 6 && !simResult.wicket) sixesCount++;
    if (!simResult.rebowl) {
      ballsFaced++;
      balls++;
      if (balls >= 6) {
        overs++;
        balls = 0;
      }
    }

    if (simResult.wicket) {
      userWickets = 1;
      teamWickets++;
    }

    freeHit = simResult.nextIsFreeHit;
    lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed})\n` +
                     `👉 **Your Shot:** ${batterInput.shotType} to ${batterInput.targetZone} [${simResult.timing}]\n\n` +
                     `${simResult.commentary}` +
                     (userWickets > 0 ? `\n\n💔 **WICKET!** You depart for **${userRuns} runs** off **${ballsFaced} balls** (${foursCount}x4, ${sixesCount}x6).` : '');
  }

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle(`⚠️ Match Forfeited due to Inactivity`)
      .setDescription(`You did not respond within 15 minutes! The match has ended and is recorded as a **Loss**.`)
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [], attachments: [] }).catch(() => {});
    await sleep(1500);

    const summaryDetails = {
      pitch: match.pitch,
      firstInningsText: `${userTeam.name} ${teamRuns}/${teamWickets} (${overs}.${balls} ov) [Forfeit]`,
      secondInningsText: `${opponentTeam.name} 0/0 (0.0 ov)`,
      resultText: `${opponentTeam.name} won by forfeit (inactivity)`
    };

    db.prepare('UPDATE players SET confidence = MAX(10, confidence - 15) WHERE discord_id = ?').run(discordId);
    await finishFranchiseMatch(interaction, player, pf, false, userRuns, ballsFaced, foursCount, sixesCount, Math.max(1, userWickets), 0, 0, 0, opponentTeam, summaryDetails, message);
    return;
  }

  // Show final delivery / dismissal outcome embed (stays for 5 seconds on dismissal)
  const finalBatEmbed = new EmbedBuilder()
    .setTitle(userWickets > 0 ? `💔 WICKET! Dismissed — ${userTeam.name} vs ${opponentTeam.name}` : `🏏 Batting Stint Complete: ${userTeam.name}`)
    .setDescription(
      `▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `📊 **Team Score:** **${teamRuns}/${teamWickets}** (${overs}.${balls} ov)\n` +
      `🏏 **Your Contribution:** **${userRuns}${userWickets > 0 ? '' : '*'} (${ballsFaced}b)** [${foursCount}x4, ${sixesCount}x6]${userWickets > 0 ? ' — **OUT**' : ''}`
    )
    .setColor(userWickets > 0 ? '#e74c3c' : '#38bdf8');
  await message.edit({ embeds: [finalBatEmbed], components: [], files: [], attachments: [] }).catch(() => {});
  await sleep(userWickets > 0 ? 5000 : 2500);

  // Wrap up Inning 1
  if (overs < 20) {
    teamRuns += (20 - overs) * 8;
    overs = 20;
    balls = 0;
  }

  const target = teamRuns + 1;

  const arInning1EndEmbed = new EmbedBuilder()
    .setTitle(`🏏 Inning 1 Complete: ${userTeam.name} set ${teamRuns}/${teamWickets}`)
    .setDescription(
      `💥 **Innings Break!**\n\n` +
      `• **Your Batting:** **${userRuns} runs** off **${ballsFaced} balls** (${foursCount}x4, ${sixesCount}x6)\n` +
      `• **Team Total:** **${teamRuns}/${teamWickets}** (20.0 ov)\n` +
      `🎯 **Target for ${opponentTeam.name}:** **${target} runs** (Req. RR: ${(target / 20).toFixed(2)})\n\n` +
      `🔔 **Inning 2:** You now have the ball for a crucial over in the defense!`
    )
    .setColor('#38bdf8');

  await message.edit({ embeds: [arInning1EndEmbed], components: [], files: [] }).catch(() => {});
  await sleep(2500);

  // --- INNINGS 2: BOWLING IN THE CHASE ---
  let oppRuns = Math.round(teamRuns * 0.85);
  let oppWickets = 4;
  let oppOvers = 17;
  let oppBalls = 0;

  let bowlingWickets = 0;
  let bowlingRunsConceded = 0;
  let oversBowled = 0;

  const bowlChoices = Object.entries(deliveries)
    .filter(([k, v]) => isSpin ? v.type === 'spin' : v.type === 'fast')
    .map(([k, v]) => ({ label: v.name, value: k, description: v.desc.substring(0, 100) }));

  const arInning2Embed = new EmbedBuilder()
    .setTitle(`🥎 Inning 2: Bowling vs ${opponentTeam.name}`)
    .setDescription(
      `🎯 **Target:** **${target}**\n` +
      `Opponent is **${oppRuns}/${oppWickets}** after 17.0 overs (Need **${target - oppRuns} runs** in 18 balls).\n\n` +
      `🔔 **Captain throws you the ball for Over 18!**\n*Select your delivery to bowl ball 18.1!*`
    )
    .setColor('#e74c3c')
    .addFields(
      { name: '📊 Opponent Score', value: `**${oppRuns}/${oppWickets}** (Target: **${target}**)`, inline: true },
      { name: '🎯 Equation', value: `Need **${target - oppRuns}** from 18 balls`, inline: true }
    );

  const getBowlMenu = (ph) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`franchise_ar_bowl_${discordId}`)
      .setPlaceholder(ph)
      .addOptions(bowlChoices.slice(0, 25))
  );

  await message.edit({ embeds: [arInning2Embed], components: [getBowlMenu('Bowl ball 18.1...')] }).catch(() => {});

  // Bowl Over 18 (6 deliveries)
  let matchEnded = false;
  for (let b = 1; b <= 6; b++) {
    if (oppRuns >= target || oppWickets >= 10) {
      matchEnded = true;
      break;
    }

    const filter = idx => idx.customId === `franchise_ar_bowl_${discordId}` && idx.user.id === discordId;
    const deliveryKey = await new Promise((res) => {
      const collector = message.createMessageComponentCollector({ filter, time: 900000, max: 1 });
      collector.on('collect', async idx => {
        await idx.deferUpdate().catch(() => {});
        res(idx.values[0]);
      });
      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) res('timeout');
      });
    });

    if (deliveryKey === 'timeout') {
      timedOut = true;
      matchEnded = true;
      break;
    }

    const aiShotKey = getAIShot();
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
    bowlingRunsConceded += runsOnBall;
    if (simResult.wicket) {
      oppWickets++;
      bowlingWickets++;
    }

    if (oppRuns >= target || oppWickets >= 10) {
      matchEnded = true;
      break;
    }

    if (b < 6) {
      const currentEmbed = new EmbedBuilder()
        .setTitle(`🥎 Inning 2: Over 18.${b}`)
        .setDescription(`▬▬▬ **Previous Delivery** ▬▬▬\n🥎 You bowled: **${deliveries[deliveryKey].name}**\n${simResult.commentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n*Select next delivery to bowl ball 18.${b + 1}!*`)
        .setColor('#e74c3c')
        .addFields(
          { name: '📊 Opponent Score', value: `**${oppRuns}/${oppWickets}** (Target: **${target}**)`, inline: true },
          { name: '🎯 Equation', value: `Need **${target - oppRuns}** from ${18 - b} balls`, inline: true },
          { name: '🥎 Your Figures', value: `**${bowlingWickets}/${bowlingRunsConceded}** (0.${b} ov)`, inline: true }
        );

      await message.edit({ embeds: [currentEmbed], components: [getBowlMenu(`Bowl ball 18.${b + 1}...`)] }).catch(() => {});
    }
  }

  if (timedOut) {
    const forfeitEmbed = new EmbedBuilder()
      .setTitle(`⚠️ Match Forfeited due to Inactivity`)
      .setDescription(`You did not respond within 15 minutes! The match has ended and is recorded as a **Loss**.`)
      .setColor('#ef4444');
    await message.edit({ embeds: [forfeitEmbed], components: [], files: [], attachments: [] }).catch(() => {});
    await sleep(1500);

    const summaryDetails = {
      pitch: match.pitch,
      firstInningsText: `${userTeam.name} ${teamRuns}/${teamWickets} (20.0 ov)`,
      secondInningsText: `${opponentTeam.name} ${oppRuns}/${oppWickets} (${oppOvers}.${oppBalls} ov) [Forfeit]`,
      resultText: `${opponentTeam.name} won by forfeit (inactivity)`
    };

    db.prepare('UPDATE players SET confidence = MAX(10, confidence - 15) WHERE discord_id = ?').run(discordId);
    await finishFranchiseMatch(interaction, player, pf, false, userRuns, ballsFaced, foursCount, sixesCount, userWickets, bowlingWickets, bowlingRunsConceded, oversBowled, opponentTeam, summaryDetails, message);
    return;
  }

  oversBowled = 1.0;
  oppOvers = 18;

  // Simulate Overs 19 & 20 if still alive
  if (!matchEnded && oppRuns < target && oppWickets < 10) {
    for (let o = 19; o <= 20; o++) {
      oppOvers = o;
      const rInOver = 7 + Math.floor(Math.random() * 7);
      if (oppRuns + rInOver >= target) {
        oppRuns = target;
        oppBalls = Math.min(6, Math.max(1, Math.ceil((target - oppRuns) / 2)));
        break;
      }
      oppRuns += rInOver;
      if (Math.random() < 0.25) {
        oppWickets++;
        if (oppWickets >= 10) break;
      }
    }
  }

  const won = oppRuns < target && (oppWickets >= 10 || oppOvers >= 20);
  const ballsLeft = Math.max(0, (20 - oppOvers) * 6 - oppBalls);
  const margin = won
    ? `${target - 1 - oppRuns} runs`
    : `${10 - oppWickets} wickets (${ballsLeft} balls remaining)`;
  const resultText = won ? `${userTeam.name} won by ${margin}` : `${opponentTeam.name} won by ${margin}`;

  const summaryDetails = {
    pitch: match.pitch,
    firstInningsText: `${userTeam.name} ${teamRuns}/${teamWickets} (20.0 ov)`,
    secondInningsText: `${opponentTeam.name} ${oppRuns}/${oppWickets} (${oppOvers}.${oppBalls} ov)`,
    resultText
  };

  await finishFranchiseMatch(interaction, player, pf, won, userRuns, ballsFaced, foursCount, sixesCount, userWickets, bowlingWickets, bowlingRunsConceded, oversBowled, opponentTeam, summaryDetails, message);
}

// 8. SIMULATE BENCHED MATCH DAY IN BACKGROUND
async function simulateBenchedMatch(interaction, discordId, player, pf, league, userTeam, opponentTeam) {
  const won = Math.random() < 0.5;

  // Advance round and standings
  db.prepare(`
    UPDATE player_franchise 
    SET current_round = current_round + 1 
    WHERE player_id = ?
  `).run(discordId);

  // Update standings (Regular season round-robin matches only - exclude playoffs)
  if (pf.current_round <= league.seasonLength) {
    db.prepare(`
      UPDATE franchise_standings 
      SET played = played + 1, won = won + ?, lost = lost + ?, points = points + ?, nrr = nrr + ?
      WHERE player_id = ? AND team_id = ?
    `).run(won ? 1 : 0, won ? 0 : 1, won ? 2 : 0, won ? 0.35 : -0.35, discordId, pf.team_id);

    db.prepare(`
      UPDATE franchise_standings 
      SET played = played + 1, won = won + ?, lost = lost + ?, points = points + ?, nrr = nrr + ?
      WHERE player_id = ? AND team_id = ?
    `).run(won ? 0 : 1, won ? 1 : 0, won ? 0 : 2, won ? -0.35 : 0.35, discordId, opponentTeam.id);

    // Simulate other fixtures for this round
    simulateOtherFixtures(discordId, pf.league_id, pf.team_id, opponentTeam.id);
  }

  const embed = new EmbedBuilder()
    .setTitle('🔒 Match Day: Benched')
    .setDescription(
      `📋 **You were rested/benched for this Match Day!**\n\n` +
      `The captain preferred a different team configuration based on form, fitness, and matchups. ` +
      `Your team played **${opponentTeam.name}** in your absence.\n\n` +
      `👉 **Result:** **${won ? `${userTeam.name} WON` : `${opponentTeam.name} WON`}**\n` +
      `📈 Standings updated automatically. Improve your **recent form** via \`/train\` to regain your spot in the playing XI!`
    )
    .setColor('#f43f5e')
    .setTimestamp();

  const dashboardBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_franchise_dashboard_${discordId}`)
      .setLabel('🏟️ Return to Dashboard')
      .setStyle(ButtonStyle.Primary)
  );

  await safeReplyOrEdit(interaction, {
    embeds: [embed],
    components: [dashboardBtn]
  });
}

// 9. FINISH MATCH DAY & PAY CONTRACT REWARDS
async function finishFranchiseMatch(interaction, player, pf, won, runs, balls, fours, sixes, wickets, bowlingWickets, runsConceded, overs, opponentTeam, summaryDetails = null, existingMessage = null) {
  const discordId = player.discord_id;
  clearPlayerInMatch(discordId);
  const league = franchiseLeagues[pf.league_id] || Object.values(franchiseLeagues)[0];
  const userTeam = league.teams.find(t => t.id === pf.team_id) || league.teams[0];

  // Calculate balanced match fee
  let matchSalary = Math.min(220, Math.round((league.avgSalary / 15) * (pf.contract_role.includes('Marquee') ? 1.5 : pf.contract_role.includes('Starter') ? 1.2 : 0.8)));
  if (!won) matchSalary = Math.round(matchSalary * 0.75);

  // Calculate bonuses
  const runBonus = Math.floor(runs / 4);
  const wicketBonus = bowlingWickets * 10;
  const centuryBonus = runs >= 100 ? 60 : (runs >= 50 ? 25 : 0);
  const totalCoinsEarned = matchSalary + runBonus + wicketBonus + centuryBonus;

  // Update Player Wallet & stats
  db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(totalCoinsEarned, discordId);
  
  const userDismissed = (wickets > 0) ? 1 : 0;
  db.prepare(`
    UPDATE player_franchise 
    SET runs = runs + ?, balls = balls + ?, fours = fours + ?, sixes = sixes + ?, dismissals = dismissals + ?, matches_played = matches_played + 1, wickets = wickets + ?, runs_conceded = runs_conceded + ?, overs_bowled = overs_bowled + ?, current_round = current_round + 1
    WHERE player_id = ?
  `).run(runs, balls, fours, sixes, userDismissed, bowlingWickets, runsConceded, overs, discordId);

  // Save to career stats
  db.prepare(`
    UPDATE stats 
    SET matches = matches + 1, runs = runs + ?, balls = balls + ?, fours = fours + ?, sixes = sixes + ?, fifties = fifties + ?, hundreds = hundreds + ?, ducks = ducks + ?, wickets = wickets + ?, runs_conceded = runs_conceded + ?, overs = overs + ?
    WHERE player_id = ?
  `).run(
    runs,
    balls,
    fours,
    sixes,
    (runs >= 50 && runs < 100) ? 1 : 0,
    runs >= 100 ? 1 : 0,
    (balls > 0 && runs === 0 && userDismissed > 0) ? 1 : 0,
    bowlingWickets,
    runsConceded,
    overs,
    discordId
  );

  // Match History
  db.prepare(`
    INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    discordId,
    opponentTeam.name,
    'franchise',
    runs,
    balls,
    fours,
    sixes,
    userDismissed > 0 ? 'out' : 'not out',
    bowlingWickets,
    runsConceded,
    overs,
    won ? 'won' : 'lost'
  );

  // Update Standings (Regular season round-robin matches only - exclude playoffs)
  if (pf.current_round <= league.seasonLength) {
    db.prepare(`
      UPDATE franchise_standings 
      SET played = played + 1, won = won + ?, lost = lost + ?, points = points + ?, nrr = nrr + ?
      WHERE player_id = ? AND team_id = ?
    `).run(won ? 1 : 0, won ? 0 : 1, won ? 2 : 0, won ? 0.75 : -0.75, discordId, pf.team_id);

    db.prepare(`
      UPDATE franchise_standings 
      SET played = played + 1, won = won + ?, lost = lost + ?, points = points + ?, nrr = nrr + ?
      WHERE player_id = ? AND team_id = ?
    `).run(won ? 0 : 1, won ? 1 : 0, won ? 0 : 2, won ? -0.75 : 0.75, discordId, opponentTeam.id);

    // Simulate other fixtures for this round
    simulateOtherFixtures(discordId, pf.league_id, pf.team_id, opponentTeam.id);
  }

  // Simulate AI players' round stats in background to keep Orange/Purple cap races evolving
  simulateAIPlayers(discordId, pf.league_id);

  const embed = new EmbedBuilder()
    .setTitle(won ? '🏆 VICTORY!' : '❌ DEFEAT')
    .setDescription(
      `🏏 **Match Complete!**\n\n` +
      (summaryDetails ? `🏟️ **Pitch:** *${summaryDetails.pitch || 'Standard'}*\n` +
        `🔹 **1st Innings:** ${summaryDetails.firstInningsText}\n` +
        `🔹 **2nd Innings:** ${summaryDetails.secondInningsText}\n` +
        `📢 **Result:** **${summaryDetails.resultText}**\n\n` : '') +
      `▬▬▬ **Your Performance** ▬▬▬\n` +
      (player.primary_role === 'Bowler'
        ? `🥎 **Bowling Figures:** **${bowlingWickets}/${runsConceded}** in **${overs.toFixed(1)} ov** (Econ: ${overs > 0 ? (runsConceded / overs).toFixed(2) : '0.00'})\n`
        : player.primary_role === 'All-Rounder'
          ? `🏏 **Batting:** **${runs}** (${balls}b, ${fours}x4, ${sixes}x6, SR: ${balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0'})\n` +
            `🥎 **Bowling:** **${bowlingWickets}/${runsConceded}** in **${overs.toFixed(1)} ov**\n`
          : `🏏 **Batting:** **${runs} runs** off **${balls} balls** (${fours}x4, ${sixes}x6) — SR: **${balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0'}**\n`) +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `💰 **Earnings Credited:**\n` +
      `• Base match fee: +${emojis.coin} ${matchSalary}\n` +
      (runBonus > 0 ? `• Runs bonus: +${emojis.coin} ${runBonus}\n` : '') +
      (wicketBonus > 0 ? `• Wickets bonus: +${emojis.coin} ${wicketBonus}\n` : '') +
      (centuryBonus > 0 ? `• Milestone bonus: +${emojis.coin} ${centuryBonus}\n` : '') +
      `👉 **Total coins added:** **${emojis.coin} ${totalCoinsEarned} Coins**`
    )
    .setColor(won ? '#2ecc71' : '#e74c3c')
    .setTimestamp();

  const returnBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_franchise_dashboard_${discordId}`)
      .setLabel('🏟️ Return to Dashboard')
      .setStyle(ButtonStyle.Primary)
  );

  let finished = false;
  if (existingMessage?.edit) {
    try {
      await existingMessage.edit({
        content: '',
        embeds: [embed],
        components: [returnBtn],
        files: [],
        attachments: []
      });
      finished = true;
    } catch (e) {}
  }

  if (!finished && (interaction.deferred || interaction.replied)) {
    try {
      await interaction.editReply({
        content: '',
        embeds: [embed],
        components: [returnBtn],
        files: [],
        attachments: []
      });
      finished = true;
    } catch (e) {}
  }

  if (!finished) {
    try {
      await interaction.followUp({
        embeds: [embed],
        components: [returnBtn]
      });
      finished = true;
    } catch (e) {}
  }

  if (!finished && interaction.channel?.send) {
    await interaction.channel.send({
      embeds: [embed],
      components: [returnBtn]
    }).catch(() => {});
  }
}

// 10. SIMULATE OTHER MATCHES IN STANDINGS
function simulateOtherFixtures(discordId, leagueId, userTeamId, oppTeamId) {
  const league = franchiseLeagues[leagueId];
  if (!league) return;

  const pf = db.prepare('SELECT current_round FROM player_franchise WHERE player_id = ?').get(discordId);
  if (pf && pf.current_round > league.seasonLength) {
    return; // Playoffs: no group stage fixtures to simulate
  }

  const teamsToSim = league.teams.filter(t => t.id !== userTeamId && t.id !== oppTeamId);

  // Pair them up
  for (let i = 0; i < teamsToSim.length; i += 2) {
    if (i + 1 < teamsToSim.length) {
      const teamA = teamsToSim[i];
      const teamB = teamsToSim[i + 1];

      const aWins = Math.random() < 0.5;
      const nrrDelta = (0.2 + Math.random() * 0.8);

      db.prepare(`
        UPDATE franchise_standings 
        SET played = played + 1, won = won + ?, lost = lost + ?, points = points + ?, nrr = nrr + ?
        WHERE player_id = ? AND team_id = ?
      `).run(aWins ? 1 : 0, aWins ? 0 : 1, aWins ? 2 : 0, aWins ? nrrDelta : -nrrDelta, discordId, teamA.id);

      db.prepare(`
        UPDATE franchise_standings 
        SET played = played + 1, won = won + ?, lost = lost + ?, points = points + ?, nrr = nrr + ?
        WHERE player_id = ? AND team_id = ?
      `).run(aWins ? 0 : 1, aWins ? 1 : 0, aWins ? 0 : 2, aWins ? -nrrDelta : nrrDelta, discordId, teamB.id);
    }
  }
}

// 11. SIMULATE AI PLAYER STATS PER ROUND
function simulateAIPlayers(discordId, leagueId) {
  const ais = db.prepare('SELECT id, role, skill_level FROM ai_players WHERE player_id = ? AND league_id = ?').all(discordId, leagueId);
  const updateAI = db.prepare('UPDATE ai_players SET runs = runs + ?, wickets = wickets + ? WHERE id = ?');

  ais.forEach(ai => {
    let runsAdded = 0;
    let wicketsAdded = 0;

    if (ai.role === 'Batsman') {
      // Roll runs based on skill level
      const roll = Math.random();
      if (roll < 0.1) runsAdded = 0;
      else if (roll < 0.4) runsAdded = Math.floor(Math.random() * 20) + 10;
      else if (roll < 0.8) runsAdded = Math.floor(Math.random() * 35) + 30;
      else runsAdded = Math.floor(Math.random() * 50) + 65; // High score
    } else {
      // Bowler
      const roll = Math.random();
      if (roll < 0.3) wicketsAdded = 0;
      else if (roll < 0.7) wicketsAdded = 1;
      else if (roll < 0.95) wicketsAdded = 2;
      else wicketsAdded = 3;
    }

    updateAI.run(runsAdded, wicketsAdded, ai.id);
  });
}

// 12. SQUAD PLAYING XI SELECTION CHECK
function checkXISelection(player, pf) {
  const form = Number(player?.form ?? 50);
  const confidence = Number(player?.confidence ?? 50);
  const role = pf?.contract_role || 'Emerging Player';

  // Core squad members (Starters, Marquee) are always selected in the playing XI
  if (role.includes('Marquee') || role.includes('Starter')) {
    return true;
  }

  // Emerging / Development players are selected unless form is critically low (< 25)
  if (!role.includes('Bench')) {
    return form >= 25;
  }

  // Only explicit Bench role has rotation check based on form & performance
  let chance = 50 + (form - 50) * 0.5 + (confidence - 50) * 0.3;
  chance = Math.max(15, Math.min(90, chance));
  const seed = ((pf?.current_round || 1) * 13) + (player?.level || 1);
  const roll = seed % 100;
  return roll < chance;
}

// 13. PLAYOFF OPPONENT GETTER
function getPlayoffOpponent(discordId, pf, league) {
  const standings = db.prepare('SELECT team_id FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC').all(discordId);
  const userRank = standings.findIndex(s => s.team_id === pf.team_id) + 1;

  if (userRank > 4) return null; // Didn't qualify

  // Playoff fixtures
  // Round seasonLength+1: Semis (1 vs 4, 2 vs 3)
  if (pf.current_round === league.seasonLength + 1) {
    if (userRank === 1) return league.teams.find(t => t.id === standings[3].team_id);
    if (userRank === 2) return league.teams.find(t => t.id === standings[2].team_id);
    if (userRank === 3) return league.teams.find(t => t.id === standings[1].team_id);
    if (userRank === 4) return league.teams.find(t => t.id === standings[0].team_id);
  }

  // Grand Final
  if (pf.current_round === league.seasonLength + 2) {
    // Pick the highest remaining team from standings
    const finalOpponentId = standings[0].team_id === pf.team_id ? standings[1].team_id : standings[0].team_id;
    return league.teams.find(t => t.id === finalOpponentId);
  }

  return null;
}

// 14. PROCESS END OF SEASON & AWARDS
async function processEndSeason(interaction, discordId, player, pf, league) {
  // Check if user's team qualified for playoffs (Top 4) and won the Grand Final
  const standings = db.prepare('SELECT team_id FROM franchise_standings WHERE player_id = ? ORDER BY points DESC, nrr DESC').all(discordId);
  const userRank = standings.findIndex(s => s.team_id === pf.team_id) + 1;

  const lastMatch = db.prepare(`
    SELECT result FROM match_history 
    WHERE player_id = ? AND match_type = 'franchise' 
    ORDER BY id DESC LIMIT 1
  `).get(discordId);

  const wonTrophy = userRank <= 4 && lastMatch?.result === 'won';
  const titlePrize = wonTrophy ? league.prizeMoney : 0;
  
  if (titlePrize > 0) {
    db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(titlePrize, discordId);
  }

  // Calculate Awards
  const userRuns = pf.runs;
  const userWickets = pf.wickets;

  const orangeCapWinner = db.prepare("SELECT name, runs FROM ai_players WHERE player_id = ? ORDER BY runs DESC LIMIT 1").get(discordId);
  const purpleCapWinner = db.prepare("SELECT name, wickets FROM ai_players WHERE player_id = ? ORDER BY wickets DESC LIMIT 1").get(discordId);

  const wonOrangeCap = orangeCapWinner ? userRuns >= orangeCapWinner.runs : true;
  const wonPurpleCap = purpleCapWinner ? userWickets >= purpleCapWinner.wickets : true;

  let repGained = 40;
  let awardCoins = 0;
  let achievements = [];

  if (wonTrophy) {
    db.prepare('UPDATE players SET franchise_titles = COALESCE(franchise_titles, 0) + 1 WHERE discord_id = ?').run(discordId);
    repGained += 50;
    achievements.push('🏆 T20 League Champion');
  }
  if (wonOrangeCap) {
    repGained += 40;
    awardCoins += 500;
    achievements.push('🍊 Orange Cap Winner');
  }
  if (wonPurpleCap) {
    repGained += 40;
    awardCoins += 500;
    achievements.push('🍇 Purple Cap Winner');
  }

  // Apply rewards
  db.prepare('UPDATE players SET reputation = reputation + ?, coins = coins + ? WHERE discord_id = ?').run(repGained, awardCoins, discordId);

  // Set cooldown: 10 days in milliseconds
  const cooldownDuration = 10 * 24 * 60 * 60 * 1000;
  const cooldownTime = Date.now() + cooldownDuration;

  db.prepare(`
    UPDATE player_franchise 
    SET status = 'completed', cooldown_until = ?, current_round = 0 
    WHERE player_id = ?
  `).run(cooldownTime, discordId);

  const trophyText = wonTrophy 
    ? `🎉 **CHAMPIONS!** Your team has won the **${league.name}** trophy! You earned a prize share of **${emojis.coin} ${titlePrize} Coins**!`
    : `🥈 **Runner-up Season Finished**: Your team finished Rank **#${userRank}** in the standing table.`;

  const capText = `• **Orange Cap:** Winner: **${wonOrangeCap ? 'YOU' : (orangeCapWinner?.name || 'None')}** (${wonOrangeCap ? userRuns : (orangeCapWinner?.runs || 0)} Runs)\n` +
                  `• **Purple Cap:** Winner: **${wonPurpleCap ? 'YOU' : (purpleCapWinner?.name || 'None')}** (${wonPurpleCap ? userWickets : (purpleCapWinner?.wickets || 0)} Wickets)`;

  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${league.shortName} Season Completed!`)
    .setDescription(
      `${trophyText}\n\n` +
      `📊 **League Awards Panel:**\n` +
      `${capText}\n\n` +
      `🏅 **Achievements Earned:**\n` +
      `${achievements.length > 0 ? achievements.map(a => `• ${a}`).join('\n') : '• Completed a professional T20 campaign.'}\n\n` +
      `🎖️ **Reputation Change:** **+${repGained} Rep**\n` +
      `${emojis.coin} **Award Bonus Coins:** **+${emojis.coin} ${awardCoins} Coins**\n\n` +
      `⚠️ Note: You have entered a **10-day cooldown** before you can register for another T20 Franchise League.`
    )
    .setColor('#f1c40f')
    .setTimestamp();

  const profileBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_profile_${discordId}`)
      .setLabel('⬅️ Back to Profile')
      .setStyle(ButtonStyle.Primary)
  );

  await safeReplyOrEdit(interaction, {
    embeds: [embed],
    components: [profileBtn]
  });
}

// 15. LEAGUE NATION HELPER
function getLeagueNation(leagueId) {
  const nations = {
    ipl: 'india',
    bbl: 'australia',
    psl: 'pakistan',
    sa20: 'south africa',
    cpl: 'west indies',
    hundred: 'england'
  };
  return nations[leagueId] || 'india';
}
