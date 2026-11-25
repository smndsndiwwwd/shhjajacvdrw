import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder } from 'discord.js';
import db from '../database/db.js';
import fs from 'fs';
import path from 'path';
import { simulateBall, deliveries, shots, simulateBallAdvanced, getReleaseHint, getDerivedShotName } from '../game/engine.js';
import { getPlayerEquippedShot } from '../game/shotmap.js';
import { updateAndGetEnergy, consumeEnergy, getEffectiveAttributes, getEquipmentBonuses } from '../game/utils.js';
import { emojis } from '../game/emojis.js';
import { sendBotLog } from '../game/botLogger.js';

import { fileURLToPath } from 'url';

// Load canvas library safely so we have a text fallback if it's compiling/installing
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back to text leaderboard.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedFieldBg = null;
async function getFieldBackground() {
  if (cachedFieldBg) return cachedFieldBg;
  if (!canvasLib) return null;
  try {
    const { loadImage } = canvasLib;
    const candidates = [
      path.resolve(__dirname, '../../field.png'),
      path.resolve(process.cwd(), 'field.png'),
      'C:/Virtual-CM/virtual-cm/field.png',
      'C:/Users/imthi/field.png',
      path.resolve(process.cwd(), 'virtual-cm/field.png')
    ];
    let foundPath = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    if (foundPath) {
      cachedFieldBg = await loadImage(foundPath);
    } else {
      console.warn('field.png not found in any candidates:', candidates);
    }
  } catch (e) {
    console.warn('Failed to load field.png:', e);
  }
  return cachedFieldBg;
}

const CHALLENGE_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds
const CHALLENGE_ENERGY_COST = 15;

export async function generateFieldImage(fieldPreset, highlightedZoneStr, isPowerplay = false, battingHand = 'Right') {
  if (!canvasLib) return null;
  try {
    const { createCanvas } = canvasLib;
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext('2d');

    const isLeftHand = (battingHand || '').toLowerCase().includes('left');
    const cx = 250;
    const cy = 250;

    // Load and draw realistic field background from field.png (with procedural fallback)
    const bg = await getFieldBackground();
    if (bg) {
      ctx.drawImage(bg, 0, 0, 500, 500);
    } else {
      // Procedural fallback
      ctx.fillStyle = '#1e3f20';
      ctx.fillRect(0, 0, 500, 500);

      ctx.beginPath();
      ctx.arc(cx, cy, 230, 0, Math.PI * 2);
      ctx.fillStyle = '#27ae60';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 120, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ebd3a3';
      ctx.fillRect(cx - 12, cy - 40, 24, 80);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 30);
      ctx.lineTo(cx + 12, cy - 30);
      ctx.moveTo(cx - 12, cy + 30);
      ctx.lineTo(cx + 12, cy + 30);
      ctx.stroke();

      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 32);
      ctx.lineTo(cx + 4, cy - 32);
      ctx.moveTo(cx - 4, cy + 32);
      ctx.lineTo(cx + 4, cy + 32);
      ctx.stroke();
    }

    // Zone angles dynamically adjusted for Right-Handed (RHB) vs Left-Handed (LHB)
    // Pitch is vertical: Bowler at North (y < cy), Batsman at South (y > cy).
    // For RHB facing North: Off Side is WEST (Left, 9 o'clock), Leg Side is EAST (Right, 3 o'clock).
    // For LHB facing North: Off Side is EAST (Right, 3 o'clock), Leg Side is WEST (Left, 9 o'clock).
    const zones = isLeftHand ? [
      { name: 'Zone 1 (Fine Leg)', start: 90, end: 135 },
      { name: 'Zone 2 (Square Leg)', start: 135, end: 180 },
      { name: 'Zone 3 (Mid Wicket)', start: 180, end: 225 },
      { name: 'Zone 4 (Long On)', start: 225, end: 270 },
      { name: 'Zone 5 (Long Off)', start: 270, end: 315 },
      { name: 'Zone 6 (Covers)', start: 315, end: 360 },
      { name: 'Zone 7 (Point)', start: 0, end: 45 },
      { name: 'Zone 8 (Third Man)', start: 45, end: 90 }
    ] : [
      { name: 'Zone 1 (Fine Leg)', start: 45, end: 90 },
      { name: 'Zone 2 (Square Leg)', start: 0, end: 45 },
      { name: 'Zone 3 (Mid Wicket)', start: 315, end: 360 },
      { name: 'Zone 4 (Long On)', start: 270, end: 315 },
      { name: 'Zone 5 (Long Off)', start: 225, end: 270 },
      { name: 'Zone 6 (Covers)', start: 180, end: 225 },
      { name: 'Zone 7 (Point)', start: 135, end: 180 },
      { name: 'Zone 8 (Third Man)', start: 90, end: 135 }
    ];

    // Highlight target zone if selected
    if (highlightedZoneStr) {
      const activeZone = zones.find(z => z.name.toLowerCase().includes(highlightedZoneStr.toLowerCase()));
      if (activeZone) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 230, (activeZone.start * Math.PI) / 180, (activeZone.end * Math.PI) / 180);
        ctx.closePath();
        ctx.fillStyle = 'rgba(241, 196, 15, 0.35)'; // Semi-transparent yellow glow
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw boundary line dividers for zones
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 230, cy + Math.sin(angle) * 230);
      ctx.stroke();
    }

    // Print zone labels around the outer ring
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    zones.forEach(z => {
      const midAngle = ((z.start + z.end) / 2 * Math.PI) / 180;
      const tx = cx + Math.cos(midAngle) * 200;
      const ty = cy + Math.sin(midAngle) * 200;
      
      // Draw small semi-transparent backing for text readability
      const label = z.name.split(' (')[0].replace('Zone ', 'Z');
      const sub = z.name.includes('(') ? z.name.split('(')[1].replace(')', '') : '';
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(tx - 36, ty - 13, 72, 26);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - 36, ty - 13, 72, 26);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, tx, ty - 5);
      ctx.font = '9px Arial';
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(sub, tx, ty + 6);
      ctx.font = 'bold 11px Arial'; // restore font
    });

    // Position & Draw Fielders
    // Wicketkeeper (behind stumps at bottom)
    const keeper = { x: cx, y: cy + 48, label: 'WK' };
    const bowler = { x: cx, y: cy - 48, label: 'P' };

    let rawFielders = [];
    const preset = (fieldPreset || 'Balanced').toLowerCase();

    const getCoord = (angleDeg, distance) => {
      const rad = (angleDeg * Math.PI) / 180;
      return { x: cx + Math.cos(rad) * distance, y: cy + Math.sin(rad) * distance };
    };

    if (preset === 'attacking') {
      // Matches FIELD_PRESET_CONFIGS.Attacking:
      // Zone 1: Short Leg
      // Zone 3: Mid Wicket, Deep Mid Wicket
      // Zone 5: Long Off
      // Zone 6: Silly Point, Cover
      // Zone 8: Slip 1, Slip 2, Gully
      rawFielders = [
        { angle: 70, distance: 42, label: 'Short Leg' },
        { angle: 335, distance: 75, label: 'Mid Wicket' },
        { angle: 340, distance: 160, label: 'Deep Mid Wicket' },
        { angle: 245, distance: 160, label: 'Long Off' },
        { angle: 190, distance: 42, label: 'Silly Point' },
        { angle: 205, distance: 75, label: 'Cover' },
        { angle: 98, distance: 45, label: 'Slip 1' },
        { angle: 108, distance: 48, label: 'Slip 2' },
        { angle: 122, distance: 60, label: 'Gully' }
      ];
    } else if (preset === 'defensive') {
      // Matches FIELD_PRESET_CONFIGS.Defensive:
      // Boundary riders guarding almost every outfield zone
      rawFielders = [
        { angle: 68, distance: 160, label: 'Deep Fine Leg' },
        { angle: 22, distance: 160, label: 'Deep Square Leg' },
        { angle: 338, distance: 160, label: 'Deep Mid Wicket' },
        { angle: 285, distance: 75, label: 'Mid On' },
        { angle: 300, distance: 160, label: 'Long On' },
        { angle: 240, distance: 160, label: 'Long Off' },
        { angle: 202, distance: 160, label: 'Deep Cover' },
        { angle: 155, distance: 80, label: 'Point' },
        { angle: 112, distance: 160, label: 'Deep Third Man' }
      ];
    } else {
      // Matches FIELD_PRESET_CONFIGS.Balanced:
      // Zone 1: Short Fine Leg (infield)
      // Zone 2: Deep Square Leg (outfield)
      // Zone 3: Deep Mid-Wicket (outfield)
      // Zone 4: Mid On (infield), Long On (outfield)
      // Zone 5: Mid Off (infield), Long Off (outfield)
      // Zone 6: Cover (infield)
      // Zone 7: Deep Point (outfield)
      // Zone 8: (Vacant)
      rawFielders = [
        { angle: 68, distance: 75, label: 'Short Fine Leg' },
        { angle: 22, distance: 160, label: 'Deep Square Leg' },
        { angle: 338, distance: 160, label: 'Deep Mid-Wicket' },
        { angle: 285, distance: 75, label: 'Mid On' },
        { angle: 300, distance: 160, label: 'Long On' },
        { angle: 255, distance: 75, label: 'Mid Off' },
        { angle: 240, distance: 160, label: 'Long Off' },
        { angle: 205, distance: 75, label: 'Cover' },
        { angle: 155, distance: 160, label: 'Deep Point' }
      ];
    }

    if (isLeftHand) {
      // Mirror across vertical pitch axis: angle = (540 - angle) % 360
      rawFielders = rawFielders.map(f => ({
        ...f,
        angle: (540 - f.angle) % 360
      }));
    }

    const maxOutfield = isPowerplay ? 2 : 5;
    let outfieldCount = 0;

    const adjustedFielders = rawFielders.map((f, idx) => {
      if (f.distance > 120) {
        if (outfieldCount < maxOutfield) {
          outfieldCount++;
          return f;
        } else {
          // Stagger pull-in distance so fielders never stack radially
          const pullDistance = 80 + ((idx % 3) * 12);
          return { angle: f.angle, distance: pullDistance, label: f.label };
        }
      }
      return f;
    });

    let fielders = adjustedFielders.map(f => getCoord(f.angle, f.distance));

    // Collision separation pass: guarantees zero overlap between any two fielders
    const minDistance = 24;
    for (let iter = 0; iter < 10; iter++) {
      for (let i = 0; i < fielders.length; i++) {
        for (let j = i + 1; j < fielders.length; j++) {
          const dx = fielders[j].x - fielders[i].x;
          const dy = fielders[j].y - fielders[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist < minDistance) {
            const overlap = (minDistance - dist) / 2;
            const nx = dist > 0.001 ? (dx / dist) : Math.cos((i * Math.PI) / 4);
            const ny = dist > 0.001 ? (dy / dist) : Math.sin((i * Math.PI) / 4);
            fielders[i].x -= nx * overlap;
            fielders[i].y -= ny * overlap;
            fielders[j].x += nx * overlap;
            fielders[j].y += ny * overlap;
          }
        }
      }
    }

    // Keep fielders away from pitch center / keeper / bowler / batsman
    const obstacles = [
      { x: keeper.x, y: keeper.y, r: 18 },
      { x: bowler.x, y: bowler.y, r: 18 },
      { x: cx, y: cy + 25, r: 18 },
      { x: cx, y: cy - 10, r: 16 }
    ];
    fielders.forEach(f => {
      obstacles.forEach(obs => {
        const dx = f.x - obs.x;
        const dy = f.y - obs.y;
        const dist = Math.hypot(dx, dy);
        if (dist < obs.r) {
          const nx = dist > 0.001 ? (dx / dist) : 1;
          const ny = dist > 0.001 ? (dy / dist) : 0;
          f.x = obs.x + nx * obs.r;
          f.y = obs.y + ny * obs.r;
        }
      });
      // Keep within boundary circle
      const distFromCenter = Math.hypot(f.x - cx, f.y - cy);
      if (distFromCenter > 215) {
        f.x = cx + ((f.x - cx) / distFromCenter) * 215;
        f.y = cy + ((f.y - cy) / distFromCenter) * 215;
      }
    });

    // Draw all fielders as red dots
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    
    // Draw keeper
    ctx.fillStyle = '#e67e22'; // Orange for keeper
    ctx.beginPath();
    ctx.arc(keeper.x, keeper.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px Arial';
    ctx.fillText('WK', keeper.x, keeper.y);

    // Draw bowler
    ctx.fillStyle = '#3498db'; // Blue for bowler
    ctx.beginPath();
    ctx.arc(bowler.x, bowler.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('B', bowler.x, bowler.y);

    // Draw batsman
    ctx.fillStyle = '#2ecc71'; // Green for batsman
    ctx.beginPath();
    ctx.arc(cx, cy + 25, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('BT', cx, cy + 25);
    ctx.font = 'bold 9px Arial';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(isLeftHand ? 'LHB' : 'RHB', cx, cy + 38);

    // Draw 9 fielders
    fielders.forEach((f, idx) => {
      ctx.fillStyle = '#e74c3c'; // Red for fielders
      ctx.beginPath();
      ctx.arc(f.x, f.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Arial';
      ctx.fillText('F', f.x, f.y);
    });

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error('Error drawing field canvas:', err);
    return null;
  }
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

function getBowlerButtonLayout(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, discordId) {
  // Row 1: Line
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_btn_line_Off Side_${discordId}`)
      .setLabel('Off Side ➡️')
      .setStyle(selectedLine === 'Off Side' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_line_Stumps_${discordId}`)
      .setLabel('Stumps 🎯')
      .setStyle(selectedLine === 'Stumps' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_line_Leg Side_${discordId}`)
      .setLabel('Leg Side ⬅️')
      .setStyle(selectedLine === 'Leg Side' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_line_Wide_${discordId}`)
      .setLabel('Wide 🚫')
      .setStyle(selectedLine === 'Wide' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 2: Length
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_btn_len_Yorker_${discordId}`)
      .setLabel('Yorker 🎯')
      .setStyle(selectedLength === 'Yorker' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_len_Full_${discordId}`)
      .setLabel('Full 🏏')
      .setStyle(selectedLength === 'Full' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_len_Good Length_${discordId}`)
      .setLabel('Good Length ⚖️')
      .setStyle(selectedLength === 'Good Length' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_len_Short_${discordId}`)
      .setLabel('Short 🚀')
      .setStyle(selectedLength === 'Short' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 3: Variation
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_btn_var_Normal Delivery_${discordId}`)
      .setLabel('Normal ⚖️')
      .setStyle(selectedVar === 'Normal Delivery' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_var_Swing/Spin_${discordId}`)
      .setLabel('Swing/Spin 🌀')
      .setStyle(selectedVar === 'Swing/Spin' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_var_Cutter/Googly_${discordId}`)
      .setLabel('Cutter/Googly 🔄')
      .setStyle(selectedVar === 'Cutter/Googly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_var_Slower Ball_${discordId}`)
      .setLabel('Slower 🐢')
      .setStyle(selectedVar === 'Slower Ball' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 4: Speed
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_btn_spd_Fast_${discordId}`)
      .setLabel('Fast ⚡')
      .setStyle(selectedSpeed === 'Fast' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_spd_Medium_${discordId}`)
      .setLabel('Medium ⚖️')
      .setStyle(selectedSpeed === 'Medium' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_spd_Slow_${discordId}`)
      .setLabel('Slow 🐢')
      .setStyle(selectedSpeed === 'Slow' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 5: Field & Deliver
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bowl_btn_fld_Balanced_${discordId}`)
      .setLabel('Balanced 👥')
      .setStyle(selectedField === 'Balanced' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_fld_Attacking_${discordId}`)
      .setLabel('Attacking ⚔️')
      .setStyle(selectedField === 'Attacking' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_fld_Defensive_${discordId}`)
      .setLabel('Defensive 🛡️')
      .setStyle(selectedField === 'Defensive' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`bowl_btn_ready_${discordId}`)
      .setLabel('DELIVER BALL 🥎')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!selectedLine || !selectedLength || !selectedVar || !selectedSpeed || !selectedField)
  );

  return [row1, row2, row3, row4, row5];
}

export async function handleChallenge(interaction) {
  const challengerId = interaction.user.id;
  const targetUser = interaction.options.getUser('user');

  if (!targetUser) {
    return interaction.reply({
      content: '❌ You must specify a user to challenge!',
      flags: ['Ephemeral']
    });
  }

  const targetId = targetUser.id;

  if (challengerId === targetId) {
    return interaction.reply({
      content: '❌ You cannot challenge yourself! Find someone else to duel.',
      flags: ['Ephemeral']
    });
  }

  // Defer reply to prevent timeout while querying DB
  await interaction.deferReply();

  // Query players
  const challenger = db.prepare('SELECT name, energy, last_challenge_timestamp, level, reputation, primary_role FROM players WHERE discord_id = ?').get(challengerId);
  const target = db.prepare('SELECT name, level, primary_role FROM players WHERE discord_id = ?').get(targetId);

  if (!challenger) {
    return interaction.editReply({
      content: '❌ You do not have an active career profile yet! Use `/begin` to create your player.'
    });
  }

  if (!target) {
    return interaction.editReply({
      content: `❌ **${targetUser.username}** does not have an active career profile. They need to run \`/begin\` first!`
    });
  }

  // Check cooldown (bypass for bot owner)
  const app = await interaction.client.application.fetch();
  const isOwner = app.owner.members ? app.owner.members.has(challengerId) : app.owner.id === challengerId;

  if (!isOwner) {
    const now = Date.now();
    const timePassed = now - (challenger.last_challenge_timestamp || 0);
    if (timePassed < CHALLENGE_COOLDOWN) {
      const remainingMin = Math.ceil((CHALLENGE_COOLDOWN - timePassed) / 60000);
      return interaction.editReply({
        content: `⏳ You are on duel cooldown! You can challenge someone again in **${remainingMin} minutes**.`
      });
    }
  }

  // Check challenger energy
  const challengerEnergy = updateAndGetEnergy(db, challengerId);
  if (challengerEnergy < CHALLENGE_ENERGY_COST) {
    return interaction.editReply({
      content: `❌ You are too tired to challenge anyone! Requires **${CHALLENGE_ENERGY_COST} ${emojis.energy}** (You have: ${challengerEnergy}).`
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('⚔️ PvP Cricket Duel Invitation!')
    .setDescription(`**${interaction.user.username}** has challenged **${targetUser.username}** to a 1-over (6 balls) shootout!\n\n` +
                   `• **Cost:** ${CHALLENGE_ENERGY_COST} ${emojis.energy} Energy from both players.\n` +
                   `• **Rules:** Each player bats for 6 balls. Highest score wins!\n\n` +
                   `**${targetUser.username}**, do you accept this challenge?`)
    .setColor('#e74c3c')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`challenge_accept_${challengerId}_${targetId}`)
      .setLabel('Accept Duel')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`challenge_decline_${challengerId}_${targetId}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
  );

  const inviteMsg = await interaction.editReply({
    embeds: [embed],
    components: [row]
  });

  const filter = i => i.user.id === targetId && i.customId.endsWith(`_${targetId}`);
  const collector = inviteMsg.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    collector.stop();

    if (i.customId.startsWith('challenge_decline_')) {
      return await i.update({
        content: `❌ **${targetUser.username}** has declined the duel. Back to the nets!`,
        embeds: [],
        components: []
      });
    }

    // Accept Duel Flow: Verify target energy
    const targetEnergy = updateAndGetEnergy(db, targetId);
    if (targetEnergy < CHALLENGE_ENERGY_COST) {
      return i.reply({
        content: `❌ You do not have enough energy! Requires **${CHALLENGE_ENERGY_COST} ${emojis.energy}** (You have: ${targetEnergy}).`,
        flags: ['Ephemeral']
      });
    }

    // Re-verify challenger energy
    const finalChallengerEnergy = updateAndGetEnergy(db, challengerId);
    if (finalChallengerEnergy < CHALLENGE_ENERGY_COST) {
      return i.reply({
        content: `❌ The challenger no longer has enough energy to duel. Duel cancelled.`,
        flags: ['Ephemeral']
      });
    }

    // Consume Energy & update cooldown
    consumeEnergy(db, challengerId, CHALLENGE_ENERGY_COST);
    consumeEnergy(db, targetId, CHALLENGE_ENERGY_COST);
    db.prepare('UPDATE players SET last_challenge_timestamp = ? WHERE discord_id = ?').run(Date.now(), challengerId);

    // Initialize stats rows if they don't exist
    db.prepare('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)').run(challengerId);
    db.prepare('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)').run(targetId);

    // Read target option from interaction (default is 15 runs now)
    const targetRuns = interaction.options.getInteger('target') || 15;

    const p1Role = challenger.primary_role;
    const p2Role = target.primary_role;

    const isP1AR = p1Role.toLowerCase().includes('rounder');
    const isP2AR = p2Role.toLowerCase().includes('rounder');

    const isP1Batsman = p1Role.toLowerCase().includes('bats') || p1Role.toLowerCase().includes('keeper');
    const isP2Batsman = p2Role.toLowerCase().includes('bats') || p2Role.toLowerCase().includes('keeper');
    const isP1Bowler = p1Role.toLowerCase().includes('bowl');
    const isP2Bowler = p2Role.toLowerCase().includes('bowl');

    let resolvedMode = 'normal';
    let arChoiceRole = null;

    if (isP1AR && !isP2AR) {
      // P1 is All-Rounder, P2 is specialist
      const specRole = isP2Batsman ? 'Batsman' : 'Bowler';
      await i.update({
        content: `🎭 **All-Rounder Strategy Choice:**\n**${challenger.name}**, as an All-Rounder playing against specialist **${target.name}** (${specRole}), choose your approach:`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ar_choice_batsman_${challengerId}`).setLabel('Play as Batsman 🏏').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ar_choice_bowler_${challengerId}`).setLabel('Play as Bowler 🥎').setStyle(ButtonStyle.Primary)
          )
        ],
        embeds: []
      });

      const arFilter = idx => (idx.customId === `ar_choice_batsman_${challengerId}` || idx.customId === `ar_choice_bowler_${challengerId}`) && idx.user.id === challengerId;
      try {
        const idx = await inviteMsg.awaitMessageComponent({ filter: arFilter, time: 30000 });
        arChoiceRole = idx.customId.includes('batsman') ? 'batsman' : 'bowler';
        
        if (arChoiceRole === 'batsman') {
          resolvedMode = isP2Batsman ? 'normal' : 'showdown';
        } else {
          resolvedMode = isP2Bowler ? 'normal' : 'showdown';
        }

        await idx.update({
          content: `🎭 **${challenger.name}** elected to play as a **${arChoiceRole.toUpperCase()}**! Setting up **${resolvedMode.toUpperCase()}** mode...`,
          components: []
        });
      } catch (err) {
        await inviteMsg.edit({
          content: `⏳ All-Rounder choice timed out. Starting in **NORMAL** mode...`,
          components: []
        }).catch(() => {});
        resolvedMode = 'normal';
      }
    } else if (isP2AR && !isP1AR) {
      // P2 is All-Rounder, P1 is specialist
      const specRole = isP1Batsman ? 'Batsman' : 'Bowler';
      await i.update({
        content: `🎭 **All-Rounder Strategy Choice:**\n**${target.name}**, as an All-Rounder playing against specialist **${challenger.name}** (${specRole}), choose your approach:`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ar_choice_batsman_${targetId}`).setLabel('Play as Batsman 🏏').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ar_choice_bowler_${targetId}`).setLabel('Play as Bowler 🥎').setStyle(ButtonStyle.Primary)
          )
        ],
        embeds: []
      });

      const arFilter = idx => (idx.customId === `ar_choice_batsman_${targetId}` || idx.customId === `ar_choice_bowler_${targetId}`) && idx.user.id === targetId;
      try {
        const idx = await inviteMsg.awaitMessageComponent({ filter: arFilter, time: 30000 });
        arChoiceRole = idx.customId.includes('batsman') ? 'batsman' : 'bowler';

        if (arChoiceRole === 'batsman') {
          resolvedMode = isP1Batsman ? 'normal' : 'showdown';
        } else {
          resolvedMode = isP1Bowler ? 'normal' : 'showdown';
        }

        await idx.update({
          content: `🎭 **${target.name}** elected to play as a **${arChoiceRole.toUpperCase()}**! Setting up **${resolvedMode.toUpperCase()}** mode...`,
          components: []
        });
      } catch (err) {
        await inviteMsg.edit({
          content: `⏳ All-Rounder choice timed out. Starting in **NORMAL** mode...`,
          components: []
        }).catch(() => {});
        resolvedMode = 'normal';
      }
    } else {
      // Both specialists or both All-Rounders
      resolvedMode = (isP1Batsman && isP2Bowler) || (isP1Bowler && isP2Batsman) ? 'showdown' : 'normal';
      await i.update({
        content: `⚔️ **The duel is ON!** Setting up **${resolvedMode.toUpperCase()}** mode...`,
        embeds: [],
        components: []
      });
    }

    // Run PvP simulation
    runPvPSimulation(inviteMsg, challengerId, targetId, challenger.name, target.name, resolvedMode, arChoiceRole, targetRuns);
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      await inviteMsg.edit({
        content: `⚠️ The challenge request timed out. **${targetUser.username}** ignored the call.`,
        embeds: [],
        components: []
      }).catch(() => {});
    }
  });
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

async function playPvPInteractiveInning(
  client,
  mainChannel,
  batterId,
  bowlerId,
  batterName,
  bowlerName,
  batterAttrs,
  batterEq,
  batterSkills,
  batterConf,
  bowlerAttrs,
  bowlerEq,
  bowlerSkills,
  bowlerConf,
  bowlerStyle,
  ballsLimit = 6,
  targetRuns = null
) {
  return new Promise(async (resolve) => {
    try {
      const batterUser = await client.users.fetch(batterId);
      const bowlerUser = await client.users.fetch(bowlerId);

      const batterDM = await batterUser.createDM();
      const bowlerDM = await bowlerUser.createDM();
      const batterHand = (db.prepare('SELECT batting_hand FROM players WHERE discord_id = ?').get(batterId)?.batting_hand) || 'Right-hand bat';

      let runsScored = 0;
      let ballsFaced = 0;
      let wickets = 0;
      let foursCount = 0;
      let sixesCount = 0;
      let freeHit = false;
      let lastCommentary = `🏏 **Inning Started!** ${batterName} is batting, ${bowlerName} is bowling.`;

      // Bowler UI State Renderer (async)
      const getBowlerRenderState = async (selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, step) => {
        const embed = new EmbedBuilder()
          .setTitle(`🥎 Bowler Selection: vs ${batterName}`)
          .setDescription(`▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n`)
          .setColor('#e74c3c')
          .addFields(
            { name: '📊 Inning Status', value: `Score: **${runsScored}** / **${wickets}**\nBalls: **${ballsFaced}** / ${ballsLimit}`, inline: true }
          );

        if (targetRuns) {
          embed.addFields({ name: '🎯 Target to Defend', value: `Keep score below **${targetRuns} runs**`, inline: true });
        }

        embed.addFields(
          { name: '📐 Aim Line', value: selectedLine ? selectedLine : '⏳ *Selecting...*', inline: true },
          { name: '📏 Length', value: selectedLine ? (selectedLength ? selectedLength : '⏳ *Selecting...*') : '❌ *Not Started*', inline: true },
          { name: '🌀 Variation', value: selectedLength ? (selectedVar ? selectedVar : '⏳ *Selecting...*') : '❌ *Not Started*', inline: true },
          { name: '⚡ Speed', value: selectedVar ? (selectedSpeed ? selectedSpeed : '⏳ *Selecting...*') : '❌ *Not Started*', inline: true },
          { name: '👥 Field Preset', value: selectedSpeed ? (selectedField ? selectedField : '⏳ *Selecting...*') : '❌ *Not Started*', inline: true }
        );

        let rows = [];
        if (step === 'line') {
          embed.setDescription(embed.data.description + `👉 **Step 1:** Select Aim Line.`);
          rows = [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`bowl_step_line_Off Side_${bowlerId}`).setLabel('Off Side ➡️').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`bowl_step_line_Stumps_${bowlerId}`).setLabel('Stumps 🎯').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`bowl_step_line_Leg Side_${bowlerId}`).setLabel('Leg Side ⬅️').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`bowl_step_line_Wide_${bowlerId}`).setLabel('Wide 🚫').setStyle(ButtonStyle.Primary)
            )
          ];
        } else if (step === 'length') {
          embed.setDescription(embed.data.description + `👉 **Step 2:** Select Length.`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_len_Yorker_${bowlerId}`).setLabel('Yorker 🎯').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_len_Full_${bowlerId}`).setLabel('Full 🏏').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_len_Good Length_${bowlerId}`).setLabel('Good Length ⚖️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_len_Short_${bowlerId}`).setLabel('Short 🚀').setStyle(ButtonStyle.Primary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_back_line_${bowlerId}`).setLabel('⬅️ Back to Line').setStyle(ButtonStyle.Secondary)
          );
          rows = [row1, row2];
        } else if (step === 'var') {
          embed.setDescription(embed.data.description + `👉 **Step 3:** Select Variation.`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_var_Normal Delivery_${bowlerId}`).setLabel('Normal ⚖️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_var_Swing/Spin_${bowlerId}`).setLabel('Swing/Spin 🌀').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_var_Cutter/Googly_${bowlerId}`).setLabel('Cutter/Googly 🔄').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_var_Slower Ball_${bowlerId}`).setLabel('Slower 🐢').setStyle(ButtonStyle.Primary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_back_length_${bowlerId}`).setLabel('⬅️ Back to Length').setStyle(ButtonStyle.Secondary)
          );
          rows = [row1, row2];
        } else if (step === 'speed') {
          embed.setDescription(embed.data.description + `👉 **Step 4:** Select Speed.`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_spd_Fast_${bowlerId}`).setLabel('Fast ⚡').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_spd_Medium_${bowlerId}`).setLabel('Medium ⚖️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_spd_Slow_${bowlerId}`).setLabel('Slow 🐢').setStyle(ButtonStyle.Primary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_back_var_${bowlerId}`).setLabel('⬅️ Back to Variation').setStyle(ButtonStyle.Secondary)
          );
          rows = [row1, row2];
        } else if (step === 'field') {
          embed.setDescription(embed.data.description + `👉 **Step 5:** Select Field Preset & Deliver.`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_fld_Balanced_${bowlerId}`).setLabel('Balanced 👥').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_fld_Attacking_${bowlerId}`).setLabel('Attacking ⚔️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bowl_step_fld_Defensive_${bowlerId}`).setLabel('Defensive 🛡️').setStyle(ButtonStyle.Primary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bowl_step_back_speed_${bowlerId}`).setLabel('⬅️ Back to Speed').setStyle(ButtonStyle.Secondary)
          );
          rows = [row1, row2];
        }

        const isPowerplay = (ballsFaced < 6);
        const buffer = await generateFieldImage(selectedField || 'Balanced', null, isPowerplay, batterHand);
        const files = [];
        if (buffer) {
          const filename = `field_${Date.now()}.png`;
          files.push(new AttachmentBuilder(buffer, { name: filename }));
          embed.setImage(`attachment://${filename}`);
        }

        return { embeds: [embed], components: rows, files };
      };

      // Batter UI State Renderer (async)
      const getBatterRenderState = async (selectedStance, selectedFootwork, selectedIntent, selectedZone, step, actualField, releaseHint, fullDeliveryReveal) => {
        const embed = new EmbedBuilder()
          .setTitle(`🏏 Batter Preparation: vs ${bowlerName}`)
          .setDescription(`▬▬▬ **Previous Delivery** ▬▬▬\n${lastCommentary}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                         (releaseHint ? `${releaseHint}\n\n` : ''))
          .setColor('#3498db')
          .addFields(
            { name: '📊 Inning Status', value: `Score: **${runsScored}** / **${wickets}**\nBalls: **${ballsFaced}** / ${ballsLimit}`, inline: true }
          );

        if (targetRuns) {
          const need = targetRuns - runsScored;
          embed.addFields({ name: '🎯 Target Score', value: `Need **${need} runs** to win`, inline: true });
        }

        if (freeHit) {
          embed.addFields({ name: '🚨 FREE HIT ACTIVE!', value: 'You cannot be dismissed on this delivery!' });
        }

        const isLeave = (selectedFootwork === 'Leave' || selectedIntent === 'Leave');

        embed.addFields(
          { name: '🧍 1. Stance', value: selectedStance ? `**${selectedStance}**` : (step === 'stance' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
          { name: '👣 2. Footwork', value: selectedFootwork ? (selectedFootwork === 'Leave' ? '🛡️ **Leave**' : `**${selectedFootwork}**`) : (step === 'footwork' ? '⏳ *Choosing...*' : '❌ *Pending*'), inline: true },
          { name: '🎯 3. Intent', value: isLeave ? '🛡️ **Leave**' : (selectedIntent ? `**${selectedIntent}**` : (step === 'intent' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true },
          { name: '📐 4. Zone', value: isLeave ? '— *(Left Alone)*' : (selectedZone ? `**${selectedZone}**` : (step === 'zone' ? '⏳ *Choosing...*' : '❌ *Pending*')), inline: true }
        );

        let rows = [];
        if (step === 'stance') {
          embed.setDescription(embed.data.description + `👉 **Step 1:** Select your **Stance** at the crease.`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_stance_Off Side_${batterId}`).setLabel('Off Side').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_stance_In Line_${batterId}`).setLabel('In Line').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_stance_Leg Side_${batterId}`).setLabel('Leg Side').setStyle(ButtonStyle.Primary)
          );
          rows = [row1];
        } else if (step === 'footwork') {
          embed.setDescription(embed.data.description + `👉 **Step 2:** Select your **Footwork** commitment.`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_footwork_Front Foot_${batterId}`).setLabel('Front Foot').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_footwork_Back Foot_${batterId}`).setLabel('Back Foot').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_footwork_Advanced_${batterId}`).setLabel('Advanced').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_footwork_Leave_${batterId}`).setLabel('Leave').setStyle(ButtonStyle.Secondary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_back_stance_${batterId}`).setLabel('⬅️ Back to Stance').setStyle(ButtonStyle.Secondary)
          );
          rows = [row1, row2];
        } else if (step === 'leave_confirm') {
          const leaveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
          const leaveShot = getPlayerEquippedShot(batterId, leaveFw, 'Leave', 'In Line');
          const leaveType = (selectedFootwork && selectedFootwork !== 'Leave') ? `${selectedFootwork} Leave` : 'Leave';
          embed.setDescription(
            embed.data.description +
            `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
            `👉 You have committed to a **${leaveType}**.\n` +
            (leaveShot ? `🧘 **Equipped Technique:** \`${leaveShot.num} ${leaveShot.name}\` (${leaveShot.style})\n💬 *"${leaveShot.desc}"*\n\n` : '') +
            `Click **CONFIRM LEAVE** to watch the ball pass through.`
          );
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_confirm_${batterId}`).setLabel('🛡️ CONFIRM LEAVE 🏏').setStyle(ButtonStyle.Success)
          );
          rows = [row1];
        } else if (step === 'intent') {
          embed.setDescription(embed.data.description + `👉 **Step 3:** Select your batting **Intent** for this ball.\n\n` +
                                    `• **Push**: Soft hands / strike rotation (0 or 1 run)\n` +
                                    `• **Stroke**: Classic ground boundary stroke (1 to 4 runs)\n` +
                                    `• **Loft**: Aerial boundary power-hitting (4s & 6s)\n` +
                                    `• **Leave**: Shoulder arms and let the ball pass through`);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_intent_Push_${batterId}`).setLabel('Push').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_intent_Stroke_${batterId}`).setLabel('Stroke').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_intent_Loft_${batterId}`).setLabel('Loft').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bat_step_intent_Leave_${batterId}`).setLabel('🛡️ Leave').setStyle(ButtonStyle.Secondary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_back_footwork_${batterId}`).setLabel('⬅️ Back to Footwork').setStyle(ButtonStyle.Secondary)
          );
          rows = [row1, row2];
        } else if (step === 'zone') {
          const equippedShot = (selectedFootwork && selectedIntent && selectedZone)
            ? getPlayerEquippedShot(batterId, selectedFootwork, selectedIntent, selectedZone)
            : null;
          const shotName = selectedZone ? (equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone)) : null;
          embed.setDescription(embed.data.description + `⚡ **Delivery Revealed:** ${fullDeliveryReveal}\n\n` +
                                    `👉 **Step 4:** Select your target **Zone**, then press **HIT SHOT** to execute!\n` +
                                    (shotName ? `🏏 **Projected Shot:** \`${shotName}\`` : `💡 *Click any field zone to preview and aim your shot.*`));
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_zone_Third Man_${batterId}`).setLabel('Third Man').setStyle(selectedZone === 'Third Man' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bat_step_zone_Point_${batterId}`).setLabel('Point').setStyle(selectedZone === 'Point' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bat_step_zone_Cover_${batterId}`).setLabel('Cover').setStyle(selectedZone === 'Cover' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bat_step_zone_Long Off_${batterId}`).setLabel('Long Off').setStyle(selectedZone === 'Long Off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_zone_Long On_${batterId}`).setLabel('Long On').setStyle(selectedZone === 'Long On' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bat_step_zone_Mid Wicket_${batterId}`).setLabel('Mid Wicket').setStyle(selectedZone === 'Mid Wicket' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bat_step_zone_Square Leg_${batterId}`).setLabel('Square Leg').setStyle(selectedZone === 'Square Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bat_step_zone_Fine Leg_${batterId}`).setLabel('Fine Leg').setStyle(selectedZone === 'Fine Leg' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          );
          const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bat_step_confirm_${batterId}`).setLabel('💥 HIT SHOT 🏏').setStyle(ButtonStyle.Success).setDisabled(!selectedZone)
          );
          rows = [row1, row2, row3];
        }

        const isPowerplay = (ballsFaced < 6 && ballsLimit > 6);
        const fieldPreset = actualField || 'Balanced';
        const buffer = await generateFieldImage(fieldPreset, selectedZone, isPowerplay, player.batting_hand);
        const files = [];
        if (buffer) {
          const filename = `field_${Date.now()}.png`;
          files.push(new AttachmentBuilder(buffer, { name: filename }));
          embed.setImage(`attachment://${filename}`);
        }

        return { embeds: [embed], components: rows, files };
      };

      const executeBall = async () => {
        let selectedLine = null;
        let selectedLength = null;
        let selectedVar = null;
        let selectedSpeed = null;
        let selectedField = 'Balanced';
        let bowlStep = 'line';

        let bowlerMsg = null;
        let batterWaitMsg = await batterDM.send({ content: `⏳ **Waiting for Bowler ${bowlerName}** to set their delivery choices...` }).catch(() => null);

        const runBowlSetup = async () => {
          const stateData = await getBowlerRenderState(selectedLine, selectedLength, selectedVar, selectedSpeed, selectedField, bowlStep);
          if (!bowlerMsg) {
            bowlerMsg = await bowlerDM.send(stateData).catch(() => null);
          } else {
            await bowlerMsg.edit(stateData).catch(async () => {
              bowlerMsg = await bowlerDM.send(stateData).catch(() => null);
            });
          }

          if (!bowlerMsg) return null;

          const filter = idx => idx.user.id === bowlerId && idx.customId.startsWith('bowl_step_');
          const collectResult = await new Promise((resBowl) => {
            const collector = bowlerMsg.createMessageComponentCollector({ filter, time: 900000, max: 1 });

            collector.on('collect', async idx => {
              const customId = idx.customId;
              await idx.deferUpdate().catch(() => {});

              if (customId.startsWith('bowl_step_line_')) {
                selectedLine = customId.replace('bowl_step_line_', '').replace(`_${bowlerId}`, '');
                bowlStep = 'length';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_len_')) {
                selectedLength = customId.replace('bowl_step_len_', '').replace(`_${bowlerId}`, '');
                bowlStep = 'var';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_var_')) {
                selectedVar = customId.replace('bowl_step_var_', '').replace(`_${bowlerId}`, '');
                bowlStep = 'speed';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_spd_')) {
                selectedSpeed = customId.replace('bowl_step_spd_', '').replace(`_${bowlerId}`, '');
                bowlStep = 'field';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_fld_')) {
                selectedField = customId.replace('bowl_step_fld_', '').replace(`_${bowlerId}`, '');
                resBowl('submit');
              } else if (customId.startsWith('bowl_step_back_line_')) {
                if (bowlStep !== 'length') return;
                selectedLine = null;
                bowlStep = 'line';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_back_length_')) {
                if (bowlStep !== 'var') return;
                selectedLength = null;
                bowlStep = 'length';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_back_var_')) {
                if (bowlStep !== 'speed') return;
                selectedVar = null;
                bowlStep = 'var';
                resBowl('next');
              } else if (customId.startsWith('bowl_step_back_speed_')) {
                if (bowlStep !== 'field') return;
                selectedSpeed = null;
                bowlStep = 'speed';
                resBowl('next');
              }
            });

            collector.on('end', (collected, reason) => {
              if (reason === 'time' && collected.size === 0) {
                resBowl('timeout');
              }
            });
          });

          if (collectResult === 'next') {
            return runBowlSetup();
          } else if (collectResult === 'timeout') {
            await bowlerMsg.edit({ content: '⚠️ **Match Forfeited!** You did not respond within 15 minutes. Match has ended and is recorded as a forfeit loss.', components: [], files: [] }).catch(() => {});
            await batterDM.send({ content: `🏆 **Opponent Forfeited!** Bowler **${bowlerName}** did not respond within 15 minutes. You are awarded the victory!` }).catch(() => {});
            await mainChannel.send({ content: `⚠️ **Match Forfeited!** Bowler **${bowlerName}** did not respond within 15 minutes. **${batterName}** wins the duel by forfeit!` }).catch(() => {});
            return { timedOut: true, forfeitedBy: bowlerId };
          } else {
            await bowlerMsg.edit({ components: [], files: [] }).catch(() => {});
            return { line: selectedLine, length: selectedLength, variation: selectedVar, speed: selectedSpeed, fieldPreset: selectedField };
          }
        };

        const bowlInput = await runBowlSetup();
        if (!bowlInput) {
          resolve({ runs: 0, wickets: 1, fours: 0, sixes: 0, balls: 0, dmFailed: true });
          return;
        }
        if (bowlInput.timedOut) {
          resolve({ runs: runsScored, wickets, fours: foursCount, sixes: sixesCount, balls: ballsFaced, forfeitedBy: bowlInput.forfeitedBy });
          return;
        }

        await batterWaitMsg.delete().catch(() => {});
        let selectedStance = null;
        let selectedFootwork = null;
        let selectedIntent = null;
        let selectedZone = null;
        let batStep = 'stance';

        let batterMsg = null;
        let bowlerWaitMsg = await bowlerDM.send({ content: `⏳ **Bowled!** Waiting for Batter ${batterName} to prepare their shot...` }).catch(() => null);

        const runBatSetup = async () => {
          const { getReleaseHint } = await import('../game/engine.js');
          const hint = getReleaseHint(bowlInput.line, bowlInput.length, bowlInput.speed, bowlInput.variation);
          const fullDeliveryReveal = `🥎 **${bowlInput.speed} ${bowlInput.variation}** pitched **${bowlInput.length}** and angling **${bowlInput.line}**!`;

          const stateData = await getBatterRenderState(selectedStance, selectedFootwork, selectedIntent, selectedZone, batStep, bowlInput.fieldPreset, hint, fullDeliveryReveal);
          if (!batterMsg) {
            batterMsg = await batterDM.send(stateData).catch(() => null);
          } else {
            await batterMsg.edit(stateData).catch(async () => {
              batterMsg = await batterDM.send(stateData).catch(() => null);
            });
          }

          if (!batterMsg) return null;

          const filter = idx => idx.user.id === batterId && idx.customId.startsWith('bat_step_');
          const collectResult = await new Promise((resBat) => {
            const collector = batterMsg.createMessageComponentCollector({ filter, time: 900000, max: 1 });

            collector.on('collect', async idx => {
              const customId = idx.customId;
              await idx.deferUpdate().catch(() => {});

              if (customId.startsWith('bat_step_stance_')) {
                selectedStance = customId.replace('bat_step_stance_', '').replace(`_${batterId}`, '');
                batStep = 'footwork';
                resBat('next');
              } else if (customId.startsWith('bat_step_back_stance_')) {
                if (batStep !== 'footwork') return;
                selectedStance = null;
                batStep = 'stance';
                resBat('next');
              } else if (customId.startsWith('bat_step_footwork_')) {
                selectedFootwork = customId.replace('bat_step_footwork_', '').replace(`_${batterId}`, '');
                if (selectedFootwork === 'Leave') {
                  batStep = 'leave_confirm';
                } else {
                  batStep = 'intent';
                }
                resBat('next');
              } else if (customId.startsWith('bat_step_back_footwork_')) {
                if (batStep !== 'intent') return;
                selectedFootwork = null;
                batStep = 'footwork';
                resBat('next');
              } else if (customId.startsWith('bat_step_intent_')) {
                selectedIntent = customId.replace('bat_step_intent_', '').replace(`_${batterId}`, '');
                if (selectedIntent === 'Leave') {
                  batStep = 'leave_confirm';
                  selectedZone = null;
                } else {
                  batStep = 'zone';
                  selectedZone = null;
                }
                resBat('next');
              } else if (customId.startsWith('bat_step_back_intent_')) {
                return;
              } else if (customId.startsWith('bat_step_zone_')) {
                selectedZone = customId.replace('bat_step_zone_', '').replace(`_${batterId}`, '');
                resBat('next');
              } else if (customId.startsWith('bat_step_confirm_')) {
                if (selectedFootwork === 'Leave' || selectedIntent === 'Leave' || selectedZone) resBat('submit');
                else resBat('next');
              }
            });

            collector.on('end', (collected, reason) => {
              if (reason === 'time' && collected.size === 0) {
                resBat('timeout');
              }
            });
          });

          if (collectResult === 'next') {
            return runBatSetup();
          } else if (collectResult === 'timeout') {
            await batterMsg.edit({ content: '⚠️ **Match Forfeited!** You did not respond within 15 minutes. Match has ended and is recorded as a forfeit loss.', components: [], files: [] }).catch(() => {});
            await bowlerDM.send({ content: `🏆 **Opponent Forfeited!** Batter **${batterName}** did not respond within 15 minutes. You are awarded the victory!` }).catch(() => {});
            await mainChannel.send({ content: `⚠️ **Match Forfeited!** Batter **${batterName}** did not respond within 15 minutes. **${bowlerName}** wins the duel by forfeit!` }).catch(() => {});
            return { timedOut: true, forfeitedBy: batterId };
          } else {
            await batterMsg.edit({ components: [], files: [] }).catch(() => {});
            const effectiveFw = (selectedFootwork && selectedFootwork !== 'Leave') ? selectedFootwork : 'Front Foot';
            const equippedShot = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
              ? getPlayerEquippedShot(batterId, effectiveFw, 'Leave', 'In Line')
              : (selectedZone ? getPlayerEquippedShot(batterId, selectedFootwork, selectedIntent, selectedZone) : null);
            const shotName = (selectedFootwork === 'Leave' || selectedIntent === 'Leave')
              ? 'Leave'
              : (equippedShot ? equippedShot.name : getDerivedShotName(selectedFootwork, selectedIntent, selectedZone));
            return {
              stance: selectedStance || 'In Line',
              footwork: selectedFootwork,
              intent: selectedIntent,
              zone: selectedZone,
              shotType: shotName,
              targetZone: selectedZone || 'Long On',
              equippedShot
            };
          }
        };

        const batterInput = await runBatSetup();
        if (!batterInput) {
          resolve({ runs: 0, wickets: 1, fours: 0, sixes: 0, balls: 0, dmFailed: true });
          return;
        }
        if (batterInput.timedOut) {
          resolve({ runs: runsScored, wickets, fours: foursCount, sixes: sixesCount, balls: ballsFaced, forfeitedBy: batterInput.forfeitedBy });
          return;
        }

        await bowlerWaitMsg.delete().catch(() => {});

        const batterTimingVal = (batterAttrs.timing || 50) + (batterEq.timing || 0);
        let perfectChance = Math.min(0.88, 0.60 + (batterTimingVal / 100) * 0.30);
        let slightlyChance = Math.max(0.10, 0.985 - perfectChance);
        if (bowlInput.speed === 'Fast') { perfectChance -= 0.03; }

        let timingResult = 'Perfect';
        const roll = Math.random();
        if (roll < perfectChance) {
          timingResult = 'Perfect';
        } else if (roll < perfectChance + slightlyChance) {
          timingResult = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
        } else {
          timingResult = Math.random() < 0.5 ? 'Very Early' : 'Very Late';
        }

        const isClutch = (ballsLimit - ballsFaced <= 5) && (targetRuns && (targetRuns - runsScored <= 15));
        const isPowerplay = (ballsFaced < 6 && ballsLimit > 6);
        const simResult = simulateBallAdvanced({
          bowlerInput: bowlInput,
          batterInput: batterInput,
          timingResult: timingResult,
          playerAttrs: batterAttrs,
          eqBonuses: batterEq,
          activeSkills: batterSkills,
          confidence: batterConf,
          bowlerSkill: (bowlerAttrs.accuracy || 50) + (bowlerEq.accuracy || 0),
          isFreeHit: freeHit,
          isClutch,
          isPowerplay
        });

        runsScored += simResult.runs;
        if (simResult.runs === 4 && !simResult.wicket) foursCount++;
        if (simResult.runs === 6 && !simResult.wicket) sixesCount++;
        if (!simResult.rebowl) ballsFaced++;
        if (simResult.wicket) wickets++;

        freeHit = simResult.nextIsFreeHit;

        lastCommentary = `🥎 **Delivery:** ${bowlInput.length} on ${bowlInput.line} (${bowlInput.speed})\n` +
                         `👉 **Shot:** ${batterInput.shotType} to ${batterInput.targetZone}\n` +
                         `⏱️ **Timing:** ${timingResult} (Simulated)\n\n` +
                         `${simResult.commentary}`;

        const resultEmbed = new EmbedBuilder()
          .setTitle(`🥎 Delivery Outcome: Ball ${ballsFaced}`)
          .setDescription(lastCommentary)
          .setColor(simResult.wicket ? '#e74c3c' : '#2ecc71')
          .addFields(
            { name: '📈 Current Score', value: `Score: **${runsScored}/${wickets}** in **${ballsFaced} balls**`, inline: true }
          );

        if (targetRuns) {
          resultEmbed.addFields({ name: '🎯 Target', value: `Need **${targetRuns - runsScored} runs** in **${ballsLimit - ballsFaced} balls**`, inline: true });
        }

        await batterDM.send({ embeds: [resultEmbed] }).catch(() => {});
        await bowlerDM.send({ embeds: [resultEmbed] }).catch(() => {});

        await mainChannel.send({
          content: `🥎 **Delivery ${ballsFaced} (${bowlerName} to ${batterName}):**\n` +
                   `**Outcome:** ${simResult.runs} Runs${simResult.wicket ? ' (WICKET!)' : ''}\n` +
                   `💬 *${simResult.commentary}*\n` +
                   `📈 **Current Inning Score:** **${runsScored}/${wickets}** (${ballsFaced} balls)`
        }).catch(() => {});

        const isGameOver = wickets >= 1 || ballsFaced >= ballsLimit || (targetRuns && runsScored >= targetRuns);

        if (isGameOver) {
          resolve({ runs: runsScored, wickets, fours: foursCount, sixes: sixesCount, balls: ballsFaced });
        } else {
          await executeBall();
        }
      };

      await executeBall();
    } catch (e) {
      console.error('Error playing PvP Inning:', e);
      resolve({ runs: 0, wickets: 1, fours: 0, sixes: 0, balls: 0 });
    }
  });
}

async function runPvPSimulation(message, p1Id, p2Id, p1Name, p2Name, resolvedMode, arChoiceRole, targetRuns) {
  const client = message.client;
  
  // Load attributes and gear bonuses
  const p1Attrs = getEffectiveAttributes(db, p1Id);
  const p2Attrs = getEffectiveAttributes(db, p2Id);
  const p1Eq = getEquipmentBonuses(db, p1Id);
  const p2Eq = getEquipmentBonuses(db, p2Id);

  const p1Skills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(p1Id).map(s => s.skill_key);
  const p2Skills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(p2Id).map(s => s.skill_key);

  const p1Conf = db.prepare('SELECT confidence FROM players WHERE discord_id = ?').get(p1Id).confidence;
  const p2Conf = db.prepare('SELECT confidence FROM players WHERE discord_id = ?').get(p2Id).confidence;

  const getBowlingSkill = (attrs, eq, style) => {
    const isSpin = style.toLowerCase().includes('spin');
    const skill = isSpin ? (attrs.spin_bowling || 10) + (eq.spin_bowling || 0) : (attrs.swing || 10) + (eq.swing || 0);
    const acc = (attrs.accuracy || 10) + (eq.accuracy || 0);
    return (skill * 0.5) + (acc * 0.5);
  };

  const p1Style = db.prepare('SELECT bowling_style FROM players WHERE discord_id = ?').get(p1Id).bowling_style;
  const p2Style = db.prepare('SELECT bowling_style FROM players WHERE discord_id = ?').get(p2Id).bowling_style;

  const p1BowlSkill = getBowlingSkill(p1Attrs, p1Eq, p1Style);
  const p2BowlSkill = getBowlingSkill(p2Attrs, p2Eq, p2Style);

  const p1Role = db.prepare('SELECT primary_role FROM players WHERE discord_id = ?').get(p1Id).primary_role;
  const p2Role = db.prepare('SELECT primary_role FROM players WHERE discord_id = ?').get(p2Id).primary_role;

  const isP1Batsman = p1Role.toLowerCase().includes('bats') || p1Role.toLowerCase().includes('keeper');
  const isP2Batsman = p2Role.toLowerCase().includes('bats') || p2Role.toLowerCase().includes('keeper');
  const isP1Bowler = p1Role.toLowerCase().includes('bowl');
  const isP2Bowler = p2Role.toLowerCase().includes('bowl');

  const isShowdown = (isP1Batsman && isP2Bowler) || (isP1Bowler && isP2Batsman);

  let p1Score = null;
  let p2Score = null;
  let resultText = '';

  if (isShowdown) {
    const batterId = isP1Batsman ? p1Id : p2Id;
    const batterName = isP1Batsman ? p1Name : p2Name;
    const bowlerId = isP1Batsman ? p2Id : p1Id;
    const bowlerName = isP1Batsman ? p2Name : p1Name;

    const target = targetRuns || 15;

    await message.channel.send({
      content: `⚔️ **CHALLENGE MODE DUEL (Showdown)!** Batsman **${batterName}** vs Bowler **${bowlerName}**!\n` +
               `🎯 **Objective:** **${batterName}** (Batsman) must score **${target} runs** or more in 6 balls without losing a wicket to win the duel! If the bowler takes a wicket or keeps them below target, **${bowlerName}** wins!\n` +
               `👉 Both players: Check your Direct Messages (DMs) to play out the match!`
    });

    const score = await playPvPInteractiveInning(
      client,
      message.channel,
      batterId,
      bowlerId,
      batterName,
      bowlerName,
      isP1Batsman ? p1Attrs : p2Attrs,
      isP1Batsman ? p1Eq : p2Eq,
      isP1Batsman ? p1Skills : p2Skills,
      isP1Batsman ? p1Conf : p2Conf,
      isP1Batsman ? p2Attrs : p1Attrs,
      isP1Batsman ? p2Eq : p1Eq,
      isP1Batsman ? p2Skills : p1Skills,
      isP1Batsman ? p2Conf : p1Conf,
      isP1Batsman ? p2Style : p1Style,
      6,
      target
    );

    if (score.dmFailed) {
      return message.channel.send({ content: `❌ **Duel Aborted**: Could not send DM to one or both players. Please verify your privacy settings.` });
    }

    if (score.forfeitedBy) {
      const winnerId = score.forfeitedBy === p1Id ? p2Id : p1Id;
      const loserId = score.forfeitedBy;
      const winnerName = winnerId === p1Id ? p1Name : p2Name;
      const loserName = loserId === p1Id ? p1Name : p2Name;
      resultText = `🏆 **${winnerName}** won the duel by forfeit! (**${loserName}** timed out after 15 minutes)`;
      if (winnerId === p1Id) {
        p1Score = { runs: target, wickets: 0, fours: 0, sixes: 0, balls: score.balls || 0 };
        p2Score = { runs: 0, wickets: 1, fours: 0, sixes: 0, balls: score.balls || 0 };
      } else {
        p2Score = { runs: target, wickets: 0, fours: 0, sixes: 0, balls: score.balls || 0 };
        p1Score = { runs: 0, wickets: 1, fours: 0, sixes: 0, balls: score.balls || 0 };
      }
    } else {
      const batterWon = score.runs >= target && score.wickets === 0;

      if (isP1Batsman) {
        p1Score = score;
        p2Score = batterWon
          ? { runs: score.runs - 2, wickets: 1, fours: 0, sixes: 0 }
          : { runs: score.runs + 2, wickets: 0, fours: 0, sixes: 0 };
      } else {
        p2Score = score;
        p1Score = batterWon
          ? { runs: score.runs - 2, wickets: 1, fours: 0, sixes: 0 }
          : { runs: score.runs + 2, wickets: 0, fours: 0, sixes: 0 };
      }
    }
  } else {
    // Normal Mode: Coin Toss
    await message.channel.send({
      content: `⚔️ **NORMAL MODE DUEL!** **${p1Name}** vs **${p2Name}**!\n` +
               `🎯 **Objective:** A standard 1-over (6 balls) shootout. Both players take turns batting and bowling 1 over. Highest runs scored wins the match!\n` +
               `👉 Players: Follow the coin toss and choice buttons in this channel, then check your DMs when innings start.`
    });

    const tossEmbed = new EmbedBuilder()
      .setTitle('🪙 PvP Coin Toss')
      .setDescription(`**${p1Name}** (Challenger), call the coin toss flip!`)
      .setColor('#f39c12');

    const tossRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`toss_heads_${p1Id}`).setLabel('Heads 🪙').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`toss_tails_${p1Id}`).setLabel('Tails 🪙').setStyle(ButtonStyle.Secondary)
    );

    const tossMsg = await message.channel.send({ embeds: [tossEmbed], components: [tossRow] });

    const tossFilter = i => (i.customId === `toss_heads_${p1Id}` || i.customId === `toss_tails_${p1Id}`) && i.user.id === p1Id;
    let tossWinnerId = p1Id;
    let choice = 'bat';

    try {
      const i = await tossMsg.awaitMessageComponent({ filter: tossFilter, time: 30000 });
      const call = i.customId.includes('heads') ? 'heads' : 'tails';
      const flip = Math.random() < 0.5 ? 'heads' : 'tails';
      const wonToss = call === flip;

      tossWinnerId = wonToss ? p1Id : p2Id;
      const winnerName = wonToss ? p1Name : p2Name;

      const choiceEmbed = new EmbedBuilder()
        .setTitle('🪙 Toss Decision')
        .setDescription(`**${winnerName}** won the toss! Choose whether to Bat First or Bowl First.`)
        .setColor('#2ecc71');

      const choiceRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`toss_decide_bat_${tossWinnerId}`).setLabel('Bat First 🏏').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`toss_decide_bowl_${tossWinnerId}`).setLabel('Bowl First 🥎').setStyle(ButtonStyle.Primary)
      );

      await i.update({ embeds: [choiceEmbed], components: [choiceRow] });

      const choiceFilter = idx => (idx.customId === `toss_decide_bat_${tossWinnerId}` || idx.customId === `toss_decide_bowl_${tossWinnerId}`) && idx.user.id === tossWinnerId;
      const idx = await tossMsg.awaitMessageComponent({ filter: choiceFilter, time: 30000 });
      choice = idx.customId.includes('decide_bat') ? 'bat' : 'bowl';

      await idx.update({ content: `🪙 **${winnerName}** won the toss and elected to **${choice === 'bat' ? 'Bat' : 'Bowl'} First**!`, embeds: [], components: [] });
    } catch (err) {
      await tossMsg.edit({ content: `⏳ Toss timed out. **${p1Name}** will bat first.`, embeds: [], components: [] }).catch(() => {});
      tossWinnerId = p1Id;
      choice = 'bat';
    }

    // Determine batting order
    let firstBatterId, firstBatterName, firstBatterAttrs, firstBatterEq, firstBatterSkills, firstBatterConf;
    let firstBowlerId, firstBowlerName, firstBowlerAttrs, firstBowlerEq, firstBowlerSkills, firstBowlerConf, firstStyle;

    let secondBatterId, secondBatterName, secondBatterAttrs, secondBatterEq, secondBatterSkills, secondBatterConf;
    let secondBowlerId, secondBowlerName, secondBowlerAttrs, secondBowlerEq, secondBowlerSkills, secondBowlerConf, secondStyle;

    const p1BatsFirst = (tossWinnerId === p1Id && choice === 'bat') || (tossWinnerId === p2Id && choice === 'bowl');

    if (p1BatsFirst) {
      firstBatterId = p1Id; firstBatterName = p1Name; firstBatterAttrs = p1Attrs; firstBatterEq = p1Eq; firstBatterSkills = p1Skills; firstBatterConf = p1Conf;
      firstBowlerId = p2Id; firstBowlerName = p2Name; firstBowlerAttrs = p2Attrs; firstBowlerEq = p2Eq; firstBowlerSkills = p2Skills; firstBowlerConf = p2Conf; firstStyle = p2Style;

      secondBatterId = p2Id; secondBatterName = p2Name; secondBatterAttrs = p2Attrs; secondBatterEq = p2Eq; secondBatterSkills = p2Skills; secondBatterConf = p2Conf;
      secondBowlerId = p1Id; secondBowlerName = p1Name; secondBowlerAttrs = p1Attrs; secondBowlerEq = p1Eq; secondBowlerSkills = p1Skills; secondBowlerConf = p1Conf; secondStyle = p1Style;
    } else {
      firstBatterId = p2Id; firstBatterName = p2Name; firstBatterAttrs = p2Attrs; firstBatterEq = p2Eq; firstBatterSkills = p2Skills; firstBatterConf = p2Conf;
      firstBowlerId = p1Id; firstBowlerName = p1Name; firstBowlerAttrs = p1Attrs; firstBowlerEq = p1Eq; firstBowlerSkills = p1Skills; firstBowlerConf = p1Conf; firstStyle = p1Style;

      secondBatterId = p1Id; secondBatterName = p1Name; secondBatterAttrs = p1Attrs; secondBatterEq = p1Eq; secondBatterSkills = p1Skills; secondBatterConf = p1Conf;
      secondBowlerId = p2Id; secondBowlerName = p2Name; secondBowlerAttrs = p2Attrs; secondBowlerEq = p2Eq; secondBowlerSkills = p2Skills; secondBowlerConf = p2Conf; secondStyle = p2Style;
    }

    // Innings 1
    await message.channel.send({ content: `🏏 **Innings 1:** **${firstBatterName}** is batting! Check your DMs to play.` });
    const score1 = await playPvPInteractiveInning(
      client,
      message.channel,
      firstBatterId,
      firstBowlerId,
      firstBatterName,
      firstBowlerName,
      firstBatterAttrs,
      firstBatterEq,
      firstBatterSkills,
      firstBatterConf,
      firstBowlerAttrs,
      firstBowlerEq,
      firstBowlerSkills,
      firstBowlerConf,
      firstStyle,
      6
    );

    if (score1.dmFailed) {
      return message.channel.send({ content: `❌ **Duel Aborted**: Could not send DM to one or both players.` });
    }

    if (score1.forfeitedBy) {
      const winnerId = score1.forfeitedBy === p1Id ? p2Id : p1Id;
      const loserId = score1.forfeitedBy;
      const winnerName = winnerId === p1Id ? p1Name : p2Name;
      const loserName = loserId === p1Id ? p1Name : p2Name;
      resultText = `🏆 **${winnerName}** won the duel by forfeit! (**${loserName}** timed out after 15 minutes)`;
      if (winnerId === p1Id) {
        p1Score = { runs: 10, wickets: 0, fours: 1, sixes: 1, balls: score1.balls || 0 };
        p2Score = { runs: 0, wickets: 1, fours: 0, sixes: 0, balls: score1.balls || 0 };
      } else {
        p2Score = { runs: 10, wickets: 0, fours: 1, sixes: 1, balls: score1.balls || 0 };
        p1Score = { runs: 0, wickets: 1, fours: 0, sixes: 0, balls: score1.balls || 0 };
      }
    } else {
      // Innings 2 (Chase)
      await message.channel.send({
        content: `🏁 **Innings 1 Completed!** **${firstBatterName}** scored **${score1.runs}/${score1.wickets}**.\n` +
                 `👉 **${secondBatterName}** needs **${score1.runs + 1} Runs** to win! Check your DMs to start the chase.`
      });

      const score2 = await playPvPInteractiveInning(
        client,
        message.channel,
        secondBatterId,
        secondBowlerId,
        secondBatterName,
        secondBowlerName,
        secondBatterAttrs,
        secondBatterEq,
        secondBatterSkills,
        secondBatterConf,
        secondBowlerAttrs,
        secondBowlerEq,
        secondBowlerSkills,
        secondBowlerConf,
        secondStyle,
        6,
        score1.runs + 1
      );

      if (score2.dmFailed) {
        return message.channel.send({ content: `❌ **Duel Aborted**: Could not send DM to one or both players.` });
      }

      if (score2.forfeitedBy) {
        const winnerId = score2.forfeitedBy === p1Id ? p2Id : p1Id;
        const loserId = score2.forfeitedBy;
        const winnerName = winnerId === p1Id ? p1Name : p2Name;
        const loserName = loserId === p1Id ? p1Name : p2Name;
        resultText = `🏆 **${winnerName}** won the duel by forfeit! (**${loserName}** timed out after 15 minutes)`;
        if (winnerId === p1Id) {
          p1Score = p1BatsFirst ? score1 : { runs: score1.runs + 2, wickets: 0, fours: 1, sixes: 1, balls: score2.balls || 0 };
          p2Score = p1BatsFirst ? { runs: 0, wickets: 1, fours: 0, sixes: 0, balls: score2.balls || 0 } : score1;
        } else {
          p2Score = !p1BatsFirst ? score1 : { runs: score1.runs + 2, wickets: 0, fours: 1, sixes: 1, balls: score2.balls || 0 };
          p1Score = !p1BatsFirst ? { runs: 0, wickets: 1, fours: 0, sixes: 0, balls: score2.balls || 0 } : score1;
        }
      } else {
        if (p1BatsFirst) {
          p1Score = score1;
          p2Score = score2;
        } else {
          p1Score = score2;
          p2Score = score1;
        }
      }
    }
  }

  const inn1Score = p1Score;
  const inn2Score = p2Score;

  // Duel Resolution
  let winnerId = null;
  let loserId = null;

  if (!resultText) {
    const p1Runs = inn1Score.runs;
    const p2Runs = inn2Score.runs;

    if (p1Runs > p2Runs) {
      winnerId = p1Id;
      loserId = p2Id;
      resultText = `🏆 **${p1Name}** won the duel by **${p1Runs - p2Runs} runs**!`;
    } else if (p2Runs > p1Runs) {
      winnerId = p2Id;
      loserId = p1Id;
      resultText = `🏆 **${p2Name}** won the duel by **${p2Runs - p1Runs} runs**!`;
    } else {
      const p1Bounds = inn1Score.fours + inn1Score.sixes;
      const p2Bounds = inn2Score.fours + inn2Score.sixes;
      if (p1Bounds > p2Bounds) {
        winnerId = p1Id;
        loserId = p2Id;
        resultText = `🏆 **${p1Name}** won on boundary tiebreaker (**${p1Bounds}** vs **${p2Bounds}**)!`;
      } else if (p2Bounds > p1Bounds) {
        winnerId = p2Id;
        loserId = p1Id;
        resultText = `🏆 **${p2Name}** won on boundary tiebreaker (**${p2Bounds}** vs **${p1Bounds}**)!`;
      } else {
        resultText = `🤝 **It's a dead heat TIE!** Both scored **${p1Runs} runs** and hit identical boundaries!`;
      }
    }
  } else {
    winnerId = p1Score.runs > p2Score.runs ? p1Id : p2Id;
    loserId = winnerId === p1Id ? p2Id : p1Id;
  }

  // Update DB Stats and rewards
  if (winnerId) {
    db.prepare('UPDATE players SET coins = coins + 200, reputation = reputation + 10, form = MIN(100, form + 15) WHERE discord_id = ?').run(winnerId);
    db.prepare('UPDATE challenge_stats SET played = played + 1, won = won + 1, runs = runs + ?, wickets = wickets + ?, fours = fours + ?, sixes = sixes + ? WHERE player_id = ?')
      .run(winnerId === p1Id ? p1Runs : p2Runs, winnerId === p1Id ? inn2Score.wickets : inn1Score.wickets, winnerId === p1Id ? inn1Score.fours : inn2Score.fours, winnerId === p1Id ? inn1Score.sixes : inn2Score.sixes, winnerId);

    db.prepare('UPDATE players SET coins = coins + 50, reputation = MAX(0, reputation - 5), form = MAX(20, form - 5) WHERE discord_id = ?').run(loserId);
    if (resultText.includes('forfeit')) {
      db.prepare('UPDATE players SET confidence = MAX(10, confidence - 15) WHERE discord_id = ?').run(loserId);
    }
    db.prepare('UPDATE challenge_stats SET played = played + 1, lost = lost + 1, runs = runs + ?, wickets = wickets + ?, fours = fours + ?, sixes = sixes + ? WHERE player_id = ?')
      .run(loserId === p1Id ? p1Runs : p2Runs, loserId === p1Id ? inn2Score.wickets : inn1Score.wickets, loserId === p1Id ? inn1Score.fours : inn2Score.fours, loserId === p1Id ? inn1Score.sixes : inn2Score.sixes, loserId);

    const { addXP } = await import('../game/utils.js');
    addXP(db, winnerId, 150);
    addXP(db, loserId, 50);

    db.prepare(`
      INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
      VALUES (?, ?, 'Challenge', ?, 6, ?, ?, 'not out', ?, ?, 1.0, ?)
    `).run(p1Id, p2Name, p1Runs, inn1Score.fours, inn1Score.sixes, inn2Score.wickets, p2Runs, winnerId === p1Id ? 'Won' : 'Lost');

    db.prepare(`
      INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
      VALUES (?, ?, 'Challenge', ?, 6, ?, ?, 'not out', ?, ?, 1.0, ?)
    `).run(p2Id, p1Name, p2Runs, inn2Score.fours, inn2Score.sixes, inn1Score.wickets, p1Runs, winnerId === p2Id ? 'Won' : 'Lost');
  } else {
    db.prepare('UPDATE players SET coins = coins + 100, form = MIN(100, form + 5) WHERE discord_id = ?').run(p1Id);
    db.prepare('UPDATE players SET coins = coins + 100, form = MIN(100, form + 5) WHERE discord_id = ?').run(p2Id);
    
    db.prepare('UPDATE challenge_stats SET played = played + 1, runs = runs + ?, wickets = wickets + ?, fours = fours + ?, sixes = sixes + ? WHERE player_id = ?').run(p1Runs, inn2Score.wickets, inn1Score.fours, inn1Score.sixes, p1Id);
    db.prepare('UPDATE challenge_stats SET played = played + 1, runs = runs + ?, wickets = wickets + ?, fours = fours + ?, sixes = sixes + ? WHERE player_id = ?').run(p2Runs, inn1Score.wickets, inn2Score.fours, inn2Score.sixes, p2Id);

    const { addXP } = await import('../game/utils.js');
    addXP(db, p1Id, 100);
    addXP(db, p2Id, 100);

    db.prepare(`
      INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
      VALUES (?, ?, 'Challenge', ?, 6, ?, ?, 'not out', ?, ?, 1.0, 'Tie')
    `).run(p1Id, p2Name, p1Runs, inn1Score.fours, inn1Score.sixes, inn2Score.wickets, p2Runs);

    db.prepare(`
      INSERT INTO match_history (player_id, opponent, match_type, runs, balls, fours, sixes, dismissal, wickets, runs_conceded, overs_bowled, result)
      VALUES (?, ?, 'Challenge', ?, 6, ?, ?, 'not out', ?, ?, 1.0, 'Tie')
    `).run(p2Id, p1Name, p2Runs, inn2Score.fours, inn2Score.sixes, inn1Score.wickets, p1Runs);
  }

  // Final scorecard message
  const summaryEmbed = new EmbedBuilder()
    .setTitle(`${emojis.match} PvP Duel Scorecard`)
    .setDescription(`${resultText}\n\n` +
                   `📊 **Scorecard Details:**\n` +
                   `**${p1Name} Inning:** ${p1Runs}/${inn1Score.wickets} in **${inn1Score.balls || 0} balls** (fours: ${inn1Score.fours}, sixes: ${inn1Score.sixes})\n` +
                   `**${p2Name} Inning:** ${p2Runs}/${inn2Score.wickets} in **${inn2Score.balls || 0} balls** (fours: ${inn2Score.fours}, sixes: ${inn2Score.sixes})`)
    .setColor('#f1c40f')
    .setTimestamp();

  if (winnerId) {
    const winnerName = winnerId === p1Id ? p1Name : p2Name;
    const loserName = winnerId === p1Id ? p2Name : p1Name;
    sendBotLog(message.client, {
      title: '⚔️ PvP Challenge Duel Concluded',
      description: `**${winnerName}** defeated **${loserName}** in a PvP Duel!`,
      color: '#f1c40f',
      fields: [
        { name: '🏆 Winner', value: `**${winnerName}** (<@${winnerId}>) • ${winnerId === p1Id ? p1Runs : p2Runs} runs (+200 🪙)`, inline: true },
        { name: '🥈 Runner-Up', value: `**${loserName}** (<@${loserId}>) • ${loserId === p1Id ? p1Runs : p2Runs} runs (+50 🪙)`, inline: true },
        { name: 'Match Summary', value: `${p1Name}: ${p1Runs}/${inn1Score.wickets} | ${p2Name}: ${p2Runs}/${inn2Score.wickets}`, inline: false }
      ]
    });
  } else {
    sendBotLog(message.client, {
      title: '⚔️ PvP Challenge Duel Concluded (TIE)',
      description: `**${p1Name}** and **${p2Name}** tied in their PvP Duel!`,
      color: '#3498db',
      fields: [
        { name: '🤝 Match Result', value: `Dead heat tie: both scored ${p1Runs} runs! (+100 🪙 each)`, inline: false },
        { name: 'Match Summary', value: `${p1Name}: ${p1Runs}/${inn1Score.wickets} | ${p2Name}: ${p2Runs}/${inn2Score.wickets}`, inline: false }
      ]
    });
  }

  await message.channel.send({ embeds: [summaryEmbed] });
}

export async function handleChallengeLeaderboard(interaction) {
  // Defer reply to prevent timeout while drawing canvas
  await interaction.deferReply();

  // Query top 10 challenge winners
  const leaderboardData = db.prepare(`
    SELECT p.name, c.won, c.played, c.runs
    FROM challenge_stats c
    JOIN players p ON c.player_id = p.discord_id
    ORDER BY c.won DESC, c.played ASC
    LIMIT 10
  `).all();

  if (leaderboardData.length === 0) {
    return interaction.editReply({
      content: '❌ No players have played in Challenge Mode yet! Use `/challenge` to get started.'
    });
  }

  // Draw Graphic if canvas library is available
  if (canvasLib) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(600, 800);
      const ctx = canvas.getContext('2d');

      // 1. Draw Sleek Dark Background (solid fill, highly optimized)
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, 600, 800);

      // 2. Draw Decorative Border Frame
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 580, 780);

      // 3. Draw Header Title banner
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(15, 15, 570, 110);
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.strokeRect(15, 15, 570, 110);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ CHALLENGE MODE DUELS ⚔️', 300, 60);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('GLOBAL PVP LEADERBOARD', 300, 95);

      // 4. Draw Columns headers
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Rank & Player', 40, 160);
      ctx.textAlign = 'right';
      ctx.fillText('Wins', 380, 160);
      ctx.fillText('Matches', 480, 160);
      ctx.fillText('Ratio', 550, 160);

      // Draw dividing line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 175);
      ctx.lineTo(570, 175);
      ctx.stroke();

      // 5. Draw Top 10 rows
      leaderboardData.forEach((row, index) => {
        const y = 220 + index * 52;
        const rank = index + 1;

        // Alternating row background
        ctx.fillStyle = rank % 2 === 0 ? '#1e272e' : '#141c2c';
        ctx.fillRect(25, y - 30, 550, 42);

        // Rank Gold/Silver/Bronze colors
        let rankColor = '#ffffff';
        if (rank === 1) rankColor = '#f1c40f';
        else if (rank === 2) rankColor = '#d2dae2';
        else if (rank === 3) rankColor = '#e67e22';

        ctx.fillStyle = rankColor;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`#${rank}  ${row.name}`, 45, y - 4);

        // Stats
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(row.won), 380, y - 4);
        ctx.fillText(String(row.played), 480, y - 4);

        const ratio = row.played > 0 ? Math.round((row.won / row.played) * 100) : 0;
        ctx.fillText(`${ratio}%`, 550, y - 4);
      });

      // 6. Draw Footer branding
      ctx.fillStyle = '#7f8c8d';
      ctx.font = 'italic 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cricket Ascend • Auto-Updated Real-Time PvP Stats', 300, 765);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'challenge_leaderboard.png' });

      return await interaction.editReply({
        content: '🏆 Here is the live PvP Challenge Mode leaderboard:',
        files: [attachment]
      });
    } catch (error) {
      console.error('Error rendering leaderboard canvas:', error);
      // Fallback below
    }
  }

  // Fallback Text Embed Leaderboard
  const embed = new EmbedBuilder()
    .setTitle('🏆 Challenge Mode PvP Leaderboard')
    .setDescription('Top players ranked by total PvP wins:')
    .setColor('#f1c40f')
    .setTimestamp();

  let list = '';
  leaderboardData.forEach((row, index) => {
    const ratio = row.played > 0 ? Math.round((row.won / row.played) * 100) : 0;
    list += `**#${index + 1}** \`${row.name}\` - **${row.won} Wins** / ${row.played} Played (${ratio}% Win Rate)\n`;
  });

  embed.setDescription(list);
  await interaction.editReply({ embeds: [embed] });
}

export async function handleChallengeStats(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const discordId = targetUser.id;

  // Defer reply
  await interaction.deferReply();

  const player = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);
  if (!player) {
    return interaction.editReply({
      content: `❌ **${targetUser.username}** does not have an active career profile yet.`
    });
  }

  // Initialize stats row if missing
  db.prepare('INSERT OR IGNORE INTO challenge_stats (player_id) VALUES (?)').run(discordId);

  const stats = db.prepare('SELECT * FROM challenge_stats WHERE player_id = ?').get(discordId);
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

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
      const { createCanvas, loadImage } = canvasLib;
      const canvas = createCanvas(800, 450);
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
        console.warn('Failed to load user avatar for PvP stats card.');
      }

      // Background solid fill (highly optimized)
      ctx.fillStyle = '#100505';
      ctx.fillRect(0, 0, 800, 450);

      // Grid (batched paths to save CPU draw calls)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
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
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 430);

      // Left Panel - Avatar & Player Name
      drawRoundRect(ctx, 30, 30, 240, 390, 16, 'rgba(17, 24, 39, 0.85)', '#ef4444', 2);

      // Avatar circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(150, 120, 55, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (avatarImg) {
        ctx.drawImage(avatarImg, 95, 65, 110, 110);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(95, 65, 110, 110);
      }
      ctx.restore();

      // Avatar ring
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(150, 120, 57, 0, Math.PI * 2);
      ctx.stroke();

      // Player Name
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(player.name, 150, 210);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('PVP CHALLENGER', 150, 235);

      // Win Rate Badge
      drawRoundRect(ctx, 60, 260, 180, 130, 12, 'rgba(239, 68, 68, 0.1)', '#ef4444', 1.5);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`${winRate}%`, 150, 315);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('WIN RATE', 150, 345);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${stats.won} W / ${stats.lost} L`, 150, 368);

      // Right Panel - PvP Statistics
      drawRoundRect(ctx, 290, 30, 480, 390, 16, 'rgba(17, 24, 39, 0.85)', '#ef4444', 2);

      // Header title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⚔️ PVP DUEL RECORD', 320, 70);

      const drawPvPLine = (x, y, label, val, color = '#ffffff') => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(label, x, y);
        ctx.fillStyle = color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, x + 400, y);
        ctx.textAlign = 'left';
      };

      drawPvPLine(320, 120, 'Total Duels Played', String(stats.played));
      drawPvPLine(320, 165, 'Wins Registered', String(stats.won), '#10b981');
      drawPvPLine(320, 210, 'Losses Conceded', String(stats.lost), '#f43f5e');
      drawPvPLine(320, 255, 'Total Runs Scored', String(stats.runs), '#f59e0b');
      drawPvPLine(320, 300, 'Total Fours Hit (4s)', String(stats.fours));
      drawPvPLine(320, 345, 'Total Sixes Hit (6s)', String(stats.sixes));

      // Footer brand
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = 'italic 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cricket Ascend PvP Duels • 1-Over Shootouts', 530, 395);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `challenge_stats_${discordId}.png` });

      return await interaction.editReply({
        content: `⚔️ **${player.name}'s PvP Challenge Stats:**`,
        files: [attachment]
      });

    } catch (err) {
      console.error('Error drawing PvP challenge stats canvas:', err);
    }
  }

  // Fallback Text Embed
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ PvP Challenge Mode Stats: ${player.name}`)
    .setDescription(`Performance record in 1-over head-to-head duels.`)
    .setColor('#e74c3c')
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: '🏟️ Match Record', value: `**Duels Played:** ${stats.played}\n**Wins:** 🟢 ${stats.won}\n**Losses:** 🔴 ${stats.lost}\n**Win Rate:** ${winRate}%`, inline: true },
      { name: '🏏 Batting & Scoring', value: `**Runs Scored:** ${stats.runs}\n**Fours:** ${stats.fours} x4\n**Sixes:** ${stats.sixes} x6`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

