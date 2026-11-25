import { cricketAudio } from './cricketAudio.js';

// 8 Standard Wagon Zones mapped to 2D stadium angles (Top-down oval facing south/striker at bottom)
// Note: Right-hand batter vs Left-hand batter mirrors Off Side (Left/West for RHB when camera is behind bowler, Wait:
// In radar.js, Striker stands near center, Bowler top, Keeper bottom:
// Actually for classic arcade broadcast view:
// Bowler runs from TOP (north) toward BOTTOM (south, striker crease)!
// Facing the bowler (standing at south stumps looking north):
//   - For Right-Hand Bat: Off Side = screen LEFT (W/NW/SW? Wait: facing North, your Right hand = East, Left hand = West, wait!
//     Standing at south looking North: you stand to screen LEFT (leg side) and your bat faces Off Side = screen RIGHT!
//     Let's double check cricket perspective:
//     If camera is behind the Wicketkeeper looking toward the Bowler (North):
//     Right-hand batter stands on screen LEFT? Wait: facing bowler (North), a Right-Hand Batter holds bat on his RIGHT (Off Side = screen RIGHT) and pads on screen LEFT (Leg Side = screen LEFT)!
//     Wait: let's match radar.js exactly so Zone positions match 100%!
// Let's align angles so: North = Bowler/Straight, South = Keeper/Behind wicket.
export const WAGON_ZONES = [
  'Long Off',
  'Cover',
  'Point',
  'Third Man',
  'Fine Leg',
  'Square Leg',
  'Mid Wicket',
  'Long On'
];

function getZoneAngle(zone, isLeftHand) {
  // Angle in radians around Striker Wicket (0 = East/Right, -PI/2 = North/Bowler, +PI/2 = South/Keeper)
  const rhb = {
    'Long Off':   -1.22,  // North-East-ish (off side straight)
    'Cover':      -0.48,  // East-North-East (off side)
    'Point':       0.12,  // East (off side square)
    'Third Man':   0.92,  // South-East (off side fine)
    'Fine Leg':    2.22,  // South-West (leg side fine)
    'Square Leg':  3.02,  // West (leg side square)
    'Mid Wicket': -2.66,  // West-North-West (leg side)
    'Long On':    -1.92   // North-West-ish (leg side straight)
  };
  const deg = rhb[zone] ?? -0.48;
  if (!isLeftHand) return deg;
  // Mirror horizontally across North-South axis (angle -> PI - angle)
  return Math.PI - deg;
}

export function angleToZone(rad, isLeftHand) {
  let best = 'Cover';
  let bestDiff = Infinity;
  for (const z of WAGON_ZONES) {
    const za = getZoneAngle(z, isLeftHand);
    const diff = Math.abs(Math.atan2(Math.sin(rad - za), Math.cos(rad - za)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = z;
    }
  }
  return best;
}

const PRESET_SLOTS = {
  Attacking: [
    { x: 0.08, y: 0.36, deep: false }, { x: 0.12, y: 0.25, deep: false }, // Slips
    { x: 0.26, y: 0.14, deep: false }, { x: 0.30, y: -0.04, deep: false }, // Gully / Point
    { x: 0.28, y: -0.24, deep: false }, { x: 0.12, y: -0.35, deep: false }, // Cover / Mid-off
    { x: -0.14, y: -0.34, deep: false }, { x: -0.30, y: -0.16, deep: false }, // Mid-on / Mid-wkt
    { x: -0.30, y: 0.06, deep: false } // Sq leg (ring)
  ],
  Balanced: [
    { x: 0.10, y: 0.35, deep: false }, { x: 0.29, y: 0.04, deep: false }, // Slip / Point
    { x: 0.28, y: -0.22, deep: false }, { x: 0.13, y: -0.34, deep: false }, // Cover / Mid-off
    { x: -0.14, y: -0.34, deep: false }, { x: -0.29, y: -0.16, deep: false }, // Mid-on / Mid-wkt
    { x: -0.30, y: 0.08, deep: false },
    { x: 0.68, y: -0.44, deep: true }, { x: -0.66, y: -0.42, deep: true } // Long-off / Cow corner
  ],
  Defensive: [
    { x: 0.28, y: -0.02, deep: false }, { x: 0.15, y: -0.30, deep: false },
    { x: -0.15, y: -0.30, deep: false }, { x: -0.28, y: 0.04, deep: false },
    { x: 0.68, y: -0.42, deep: true }, { x: 0.72, y: 0.06, deep: true },
    { x: 0.44, y: 0.62, deep: true }, { x: -0.68, y: -0.44, deep: true },
    { x: -0.72, y: 0.06, deep: true }
  ]
};

function enforcePowerplaySlots(rawSlots, isPowerplay, isLeftHand) {
  const maxDeep = isPowerplay ? 2 : 5;
  let deepCount = 0;
  return rawSlots.map(s => {
    const mirrorX = isLeftHand ? -s.x : s.x;
    if (s.deep) {
      deepCount++;
      if (deepCount > maxDeep) {
        return { x: mirrorX * 0.44, y: s.y * 0.44 };
      }
    }
    return { x: mirrorX, y: s.y };
  });
}

export class CricketArcadeRenderer {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    // Logical canvas dimensions (16:9.6 broadcast arena)
    this.W = 960;
    this.H = 580;
    this.cx = this.W * 0.5;
    this.cy = this.H * 0.52;
    this.rx = 395; // Outfield X radius (boundary rope)
    this.ry = 228; // Outfield Y radius (boundary rope)

    // Pitch geometry in screen space
    this.bowlerStumpY = this.cy - 68;
    this.strikerStumpY = this.cy + 74;
    this.pitchTopY = this.bowlerStumpY - 8;
    this.pitchBotY = this.strikerStumpY + 14;
    this.pitchHalfW = 26;

    // Static spectators seed so crowd shimmers cleanly without flickering positions
    this.crowd = Array.from({ length: 190 }, (_, i) => {
      const ang = (i / 190) * Math.PI * 2 + (i % 3) * 0.015;
      const tier = i % 3;
      const rScale = 1.07 + tier * 0.055;
      const palette = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#e2e8f0', '#a855f7'];
      return {
        ang,
        rScale,
        color: palette[i % palette.length],
        phase: (i * 0.73) % (Math.PI * 2)
      };
    });

    this.state = {
      phase: 'batting',
      pitch: 'Balanced',
      fieldPreset: 'Balanced',
      isPowerplay: true,
      isLeftHand: false,
      selectedStance: 'In Line',
      selectedFootwork: 'Front Foot',
      selectedIntent: 'Stroke',
      selectedZone: 'Cover',
      bowlLine: 'Good Length',
      bowlLength: 'Good Length',
      bowlPitchTarget: { line: 'Stumps', length: 'Good Length', x: this.cx, y: this.cy + 8 },
      hoverPoint: null,
      lastDelivery: null
    };

    // Animation timeline state
    this.anim = null;
    this.particles = [];
    this.trail = [];
    this.floatingTexts = [];
    this.cameraShake = 0;
    this.flashAlpha = 0;
    this.flashColor = '#ffffff';
    this.stumpsBroken = false;
    this.bails = [];
    this.fielders = [];

    this.rafId = null;
    this.lastTime = 0;
    this.crowdExcitement = 0;

    this.syncFielders();
    this.bindPointer();
    this.startLoop();
  }

  updateConfig(cfg) {
    Object.assign(this.state, cfg);
    this.syncFielders();
  }

  syncFielders() {
    const raw = PRESET_SLOTS[this.state.fieldPreset] || PRESET_SLOTS.Balanced;
    const norm = enforcePowerplaySlots(raw, this.state.isPowerplay, this.state.isLeftHand);
    this.fielders = norm.map((p, idx) => ({
      id: idx,
      baseX: this.cx + p.x * this.rx,
      baseY: this.cy + p.y * this.ry,
      x: this.cx + p.x * this.rx,
      y: this.cy + p.y * this.ry,
      vx: 0,
      vy: 0
    }));
  }

  canvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * this.W,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * this.H
    };
  }

  bindPointer() {
    const handlePick = (pt) => {
      if (this.anim && this.anim.stage !== 'idle') return;
      if (this.state.phase === 'batting') {
        const ang = Math.atan2(pt.y - this.strikerStumpY, pt.x - this.cx);
        const zone = angleToZone(ang, this.state.isLeftHand);
        this.state.selectedZone = zone;
        cricketAudio.playUiTick();
        if (this.callbacks.onSelectZone) this.callbacks.onSelectZone(zone);
      } else {
        // Clamp onto pitch strip / slight outside off channel to select Line x Length!
        const minX = this.cx - 42;
        const maxX = this.cx + 42;
        const clampedX = Math.max(minX, Math.min(maxX, pt.x));
        const clampedY = Math.max(this.bowlerStumpY + 18, Math.min(this.strikerStumpY - 2, pt.y));

        const relX = clampedX - this.cx;
        const sideSign = this.state.isLeftHand ? -1 : 1; // RHB Off = positive screen X? Wait: screen Right when looking North: Off = >0!
        const orientedX = relX * sideSign;
        let line = 'Stumps';
        if (orientedX > 22) line = 'Wide';
        else if (orientedX > 8) line = 'Off Side';
        else if (orientedX < -8) line = 'Leg Side';

        const yNorm = (clampedY - this.bowlerStumpY) / Math.max(1, (this.strikerStumpY - this.bowlerStumpY));
        let length = 'Good Length';
        if (yNorm > 0.84) length = 'Yorker';
        else if (yNorm > 0.62) length = 'Full';
        else if (yNorm < 0.38) length = 'Short';

        this.state.bowlPitchTarget = { x: clampedX, y: clampedY, line, length };
        cricketAudio.playUiTick();
        if (this.callbacks.onSelectBowlSpot) this.callbacks.onSelectBowlSpot({ line, length });
      }
    };

    this._onDown = (e) => {
      cricketAudio.ensureContext();
      const pt = this.canvasCoords(e);
      handlePick(pt);
    };
    this._onMove = (e) => {
      this.state.hoverPoint = this.canvasCoords(e);
    };
    this._onLeave = () => {
      this.state.hoverPoint = null;
    };

    this.canvas.addEventListener('pointerdown', this._onDown);
    this.canvas.addEventListener('pointermove', this._onMove);
    this.canvas.addEventListener('pointerleave', this._onLeave);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerleave', this._onLeave);
  }

  // Convert logical Line & Length to bounce point on screen pitch
  deliveryToScreenPoint(deliv) {
    const isLH = this.state.isLeftHand;
    const sign = isLH ? -1 : 1;
    let x = this.cx;
    if (deliv?.line === 'Off Side') x += 12 * sign;
    else if (deliv?.line === 'Leg Side') x -= 12 * sign;
    else if (deliv?.line === 'Wide') x += 26 * sign;

    let y = this.bowlerStumpY + (this.strikerStumpY - this.bowlerStumpY) * 0.52;
    if (deliv?.length === 'Yorker') y = this.strikerStumpY - 6;
    else if (deliv?.length === 'Full' || deliv?.length === 'Full Toss') y = this.bowlerStumpY + (this.strikerStumpY - this.bowlerStumpY) * 0.76;
    else if (deliv?.length === 'Short') y = this.bowlerStumpY + (this.strikerStumpY - this.bowlerStumpY) * 0.28;
    return { x, y };
  }

  spawnDust(x, y, count = 10, color = '#d6b47e') {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * 1.9;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.65 - Math.random() * 0.8,
        r: 2 + Math.random() * 3.5,
        life: 0,
        maxLife: 24 + Math.random() * 16,
        color
      });
    }
  }

  spawnFloatingText(text, x, y, color = '#fbbf24', scale = 1.2) {
    this.floatingTexts.push({
      text, x, y, color, scale,
      life: 0,
      maxLife: 95
    });
  }

  dislodgeStumps(x, y) {
    this.stumpsBroken = true;
    this.bails = [
      { x: x - 4, y: y - 16, vx: -1.6 - Math.random(), vy: -3.5 - Math.random(), rot: 0, vr: -0.22 },
      { x: x + 4, y: y - 16, vx: 1.5 + Math.random(), vy: -3.9 - Math.random(), rot: 0, vr: 0.26 }
    ];
    this.spawnDust(x, y, 16, '#fbbf24');
    cricketAudio.playStumpsRattle();
  }

  /**
   * Trigger a full animated ball sequence matching the server RPG outcome!
   */
  playBallAnimation(ballResult, options = {}) {
    const lb = ballResult || {};
    const deliv = lb.delivery || { line: 'Stumps', length: 'Good Length', speed: 'Fast' };
    const bouncePt = this.deliveryToScreenPoint(deliv);
    const zone = options.zone || lb.zone || this.state.selectedZone || 'Cover';
    const shotAng = getZoneAngle(zone, this.state.isLeftHand);
    const isLeave = String(lb.shotName || '').toLowerCase().includes('leave');

    // Reset transient effects
    this.stumpsBroken = false;
    this.bails = [];
    this.trail = [];
    this.syncFielders();

    const speedMul = deliv.speed === 'Fast' ? 1.15 : deliv.speed === 'Slow' ? 0.82 : 1.0;

    // Shot reach magnitude
    let reach = 45;
    let peakZ = 14;
    if (lb.runs === 6) { reach = 425; peakZ = 115; }
    else if (lb.runs === 4) { reach = 370; peakZ = 24; }
    else if (lb.runs >= 2) { reach = 250; peakZ = 42; }
    else if (lb.runs === 1) { reach = 155; peakZ = 18; }
    else if (lb.wicket) {
      const lower = String(lb.commentary || '').toLowerCase();
      reach = (lower.includes('bowled') || lower.includes('lbw')) ? 8 : 135;
      peakZ = lower.includes('caught') ? 70 : 12;
    }

    const endX = this.cx + Math.cos(shotAng) * reach;
    const endY = this.strikerStumpY + Math.sin(shotAng) * (reach * 0.62);

    this.anim = {
      t: 0,
      stage: 'runup', // 'runup' -> 'delivery' -> 'outcome' -> 'done'
      runupDur: 0.48 / speedMul,
      delivDur: 0.56 / speedMul,
      outDur: (lb.runs >= 4 || lb.wicket || lb.runs >= 1) ? 1.35 : 0.72,
      bouncePt,
      zone,
      shotAng,
      endX,
      endY,
      peakZ,
      isLeave,
      bouncedPlayed: false,
      outcomeTriggered: false,
      lb,
      ball: { x: this.cx, y: this.bowlerStumpY - 46, z: 22 },
      runCrossings: lb.wicket ? 0 : Math.min(3, lb.runs === 4 || lb.runs === 6 ? 0 : lb.runs)
    };

    cricketAudio.playDeliveryWhoosh();
  }

  startLoop() {
    this.lastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt, now * 0.001);
      this.draw(now * 0.001);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  update(dt) {
    // Camera shake & flash decay
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 26);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.9);
    if (this.crowdExcitement > 0) this.crowdExcitement = Math.max(0, this.crowdExcitement - dt * 0.4);

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life++;
      if (p.life >= p.maxLife) this.particles.splice(i, 1);
    }

    // Dislodged bails physics
    for (const b of this.bails) {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.24;
      b.rot += b.vr;
      if (b.y > this.strikerStumpY + 4) {
        b.y = this.strikerStumpY + 4;
        b.vy *= -0.35;
        b.vx *= 0.7;
      }
    }

    // Floating celebratory texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life++;
      ft.y -= 24 * dt;
      if (ft.life >= ft.maxLife) this.floatingTexts.splice(i, 1);
    }

    if (!this.anim) return;
    const a = this.anim;
    a.t += dt;

    if (a.stage === 'runup') {
      const p = Math.min(1, a.t / a.runupDur);
      a.ball.x = this.cx;
      a.ball.y = (this.bowlerStumpY - 52) + p * 52;
      a.ball.z = 20 + Math.sin(p * Math.PI) * 8;
      if (p >= 1) {
        a.stage = 'delivery';
        a.t = 0;
        this.trail = [];
      }
    } else if (a.stage === 'delivery') {
      const p = Math.min(1, a.t / a.delivDur);
      const bounceP = 0.62;
      if (p <= bounceP) {
        const sub = p / bounceP;
        a.ball.x = this.cx + (a.bouncePt.x - this.cx) * sub;
        a.ball.y = this.bowlerStumpY + (a.bouncePt.y - this.bowlerStumpY) * sub;
        a.ball.z = 22 * (1 - sub * sub);
      } else {
        if (!a.bouncedPlayed) {
          a.bouncedPlayed = true;
          cricketAudio.playPitchBounce();
          this.spawnDust(a.bouncePt.x, a.bouncePt.y, 12, '#d9be8b');
        }
        const sub = (p - bounceP) / (1 - bounceP);
        a.ball.x = a.bouncePt.x + (this.cx - a.bouncePt.x) * sub * 0.35;
        a.ball.y = a.bouncePt.y + (this.strikerStumpY - a.bouncePt.y) * sub;
        const apex = a.lb.delivery?.length === 'Short' ? 28 : 13;
        a.ball.z = Math.sin(sub * Math.PI * 0.72) * apex + 5;
      }

      this.trail.push({ x: a.ball.x, y: a.ball.y - a.ball.z, z: a.ball.z, color: '#38bdf8' });
      if (this.trail.length > 22) this.trail.shift();

      if (p >= 1) {
        a.stage = 'outcome';
        a.t = 0;
        if (!a.outcomeTriggered) {
          a.outcomeTriggered = true;
          const lb = a.lb;
          const lowerComm = String(lb.commentary || '').toLowerCase();
          const isBowled = lb.wicket && (lowerComm.includes('bowled') || lowerComm.includes('stumps') || lowerComm.includes('timber'));

          if (lb.wicket) {
            this.cameraShake = 9;
            this.flashAlpha = 0.35;
            this.flashColor = '#f43f5e';
            this.crowdExcitement = 1;
            if (isBowled || lowerComm.includes('run out') || lowerComm.includes('stumped')) {
              this.dislodgeStumps(this.cx, this.strikerStumpY);
            } else {
              cricketAudio.playBatCrack(lb.timing || 'Slightly Late');
            }
            cricketAudio.playCrowdCheer(1.3);
            this.spawnFloatingText(isBowled ? 'BOWLED! 💥' : 'OUT! 💥', this.cx, this.strikerStumpY - 34, '#fb7185', 1.45);
          } else if (lb.rebowl) {
            this.spawnFloatingText('WIDE (+1)', this.cx, this.strikerStumpY - 30, '#fbbf24', 1.15);
          } else if (a.isLeave) {
            this.spawnFloatingText('WELL LEFT', this.cx, this.strikerStumpY - 26, '#94a3b8', 1.0);
          } else {
            cricketAudio.playBatCrack(lb.timing || 'Perfect');
            if (lb.runs === 6) {
              this.cameraShake = 10;
              this.flashAlpha = 0.28;
              this.flashColor = '#f59e0b';
              this.crowdExcitement = 1;
              cricketAudio.playCrowdCheer(1.7);
              this.spawnFloatingText('MAXIMUM SIX! 🔥', this.cx, this.strikerStumpY - 40, '#fbbf24', 1.55);
            } else if (lb.runs === 4) {
              this.cameraShake = 6;
              this.flashAlpha = 0.22;
              this.flashColor = '#10b981';
              this.crowdExcitement = 0.85;
              cricketAudio.playCrowdCheer(1.25);
              this.spawnFloatingText('FOUR! ⚡', this.cx, this.strikerStumpY - 36, '#34d399', 1.4);
            } else if (lb.runs > 0) {
              this.spawnFloatingText(`${lb.runs} RUN${lb.runs > 1 ? 'S' : ''}!`, this.cx, this.strikerStumpY - 28, '#38bdf8', 1.15);
            } else {
              this.spawnFloatingText(lb.timing === 'Perfect' ? 'SOLID! •' : 'DOT BALL', this.cx, this.strikerStumpY - 24, '#cbd5e1', 0.95);
            }
          }
        }
      }
    } else if (a.stage === 'outcome') {
      const p = Math.min(1, a.t / a.outDur);
      const easeOut = 1 - Math.pow(1 - p, 2.2);
      const lb = a.lb;

      if (!a.isLeave && !lb.rebowl && (lb.runs > 0 || (lb.wicket && !String(lb.commentary || '').toLowerCase().includes('bowled')))) {
        a.ball.x = this.cx + (a.endX - this.cx) * easeOut;
        a.ball.y = this.strikerStumpY + (a.endY - this.strikerStumpY) * easeOut;
        a.ball.z = Math.sin(p * Math.PI) * a.peakZ + (lb.runs === 6 ? 12 : 2);
        this.trail.push({ x: a.ball.x, y: a.ball.y - a.ball.z, z: a.ball.z, color: lb.runs === 6 ? '#f59e0b' : lb.runs === 4 ? '#34d399' : '#e2e8f0' });
        if (this.trail.length > 26) this.trail.shift();

        // Nearest fielder chases ball!
        let nearest = null;
        let bestD = Infinity;
        for (const f of this.fielders) {
          const d = Math.hypot(f.baseX - a.endX, f.baseY - a.endY);
          if (d < bestD) { bestD = d; nearest = f; }
        }
        if (nearest) {
          const targetX = lb.runs >= 4 ? (a.endX * 0.86 + this.cx * 0.14) : a.endX;
          const targetY = lb.runs >= 4 ? (a.endY * 0.86 + this.cy * 0.14) : a.endY;
          nearest.x += (targetX - nearest.x) * Math.min(1, dt * 4.5);
          nearest.y += (targetY - nearest.y) * Math.min(1, dt * 4.5);
        }
      } else {
        // Ball settles with keeper or through stumps
        a.ball.x = this.cx;
        a.ball.y = this.strikerStumpY + Math.min(34, p * 45);
        a.ball.z = 8 * (1 - p);
      }

      if (p >= 1) {
        this.anim = null;
        this.syncFielders();
      }
    }
  }

  draw(timeSec) {
    const ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetW = Math.round(this.W * dpr);
    const targetH = Math.round(this.H * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Apply damped camera shake on fours/sixes/wickets
    if (this.cameraShake > 0.2) {
      const sx = (Math.random() - 0.5) * this.cameraShake * 2;
      const sy = (Math.random() - 0.5) * this.cameraShake * 2;
      ctx.translate(sx, sy);
    }

    // 1. Stadium Arena Outer Backdrop + Crowd Tiers
    const arenaGrad = ctx.createRadialGradient(this.cx, this.cy, 80, this.cx, this.cy, 540);
    arenaGrad.addColorStop(0, '#0f172a');
    arenaGrad.addColorStop(0.7, '#090e1c');
    arenaGrad.addColorStop(1, '#04060d');
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Tiered Stadium Concrete Stands
    [1.22, 1.15, 1.07].forEach((sc, idx) => {
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy, this.rx * sc, this.ry * sc, 0, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#111827' : idx === 1 ? '#1e293b' : '#0f172a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Animated Procedural Spectators
    for (const spec of this.crowd) {
      const bounce = Math.sin(timeSec * (2.5 + this.crowdExcitement * 9) + spec.phase) * (1.2 + this.crowdExcitement * 3.8);
      const sx = this.cx + Math.cos(spec.ang) * (this.rx * spec.rScale);
      const sy = this.cy + Math.sin(spec.ang) * (this.ry * spec.rScale) + bounce;
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Corner Floodlight Towers Glow
    [[72, 42], [this.W - 72, 42], [72, this.H - 42], [this.W - 72, this.H - 42]].forEach(([fx, fy]) => {
      const fg = ctx.createRadialGradient(fx, fy, 4, fx, fy, 110);
      fg.addColorStop(0, 'rgba(224, 242, 254, 0.42)');
      fg.addColorStop(0.35, 'rgba(56, 189, 248, 0.09)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Textured Green Outfield + Mowing Bands
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.rx + 10, this.ry + 10, 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#14532d';
    ctx.fillRect(this.cx - this.rx - 15, this.cy - this.ry - 15, (this.rx + 15) * 2, (this.ry + 15) * 2);

    // Concentric turf mow rings
    [0.92, 0.78, 0.64, 0.50, 0.36].forEach((rMul, idx) => {
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy, this.rx * rMul, this.ry * rMul, 0, 0, Math.PI * 2);
      ctx.fillStyle = idx % 2 === 0 ? '#166534' : '#15803d';
      ctx.fill();
    });

    // Vertical lawn mowing stripes inside grass
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = this.cx - this.rx; x < this.cx + this.rx; x += 48) {
      ctx.fillRect(x, this.cy - this.ry, 24, this.ry * 2);
    }
    ctx.restore();

    // Outer Advertising Cushion Ring & Boundary Rope
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.rx + 5, this.ry + 5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 30-Yard Inner Powerplay Ring
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.rx * 0.44, this.ry * 0.48, 0, 0, Math.PI * 2);
    ctx.strokeStyle = this.state.isPowerplay ? 'rgba(245, 158, 11, 0.72)' : 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Detailed 22-Yard Pitch + Footmarks + Creases
    const pCol = String(this.state.pitch || '').includes('Green') ? '#a7b887'
      : String(this.state.pitch || '').includes('Dusty') ? '#cfa972' : '#d6bb89';
    ctx.fillStyle = pCol;
    ctx.strokeStyle = '#92784a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(this.cx - this.pitchHalfW, this.pitchTopY, this.pitchHalfW * 2, this.pitchBotY - this.pitchTopY);
    ctx.strokeRect(this.cx - this.pitchHalfW, this.pitchTopY, this.pitchHalfW * 2, this.pitchBotY - this.pitchTopY);

    // Subtle pitch wear patches
    ctx.fillStyle = 'rgba(120, 88, 48, 0.22)';
    ctx.beginPath();
    ctx.ellipse(this.cx - 8, this.bowlerStumpY + 26, 7, 13, 0.2, 0, Math.PI * 2);
    ctx.ellipse(this.cx + 9, this.strikerStumpY - 28, 7, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Crease markings (Bowler + Striker)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    // Bowler end
    ctx.beginPath();
    ctx.moveTo(this.cx - 28, this.bowlerStumpY); ctx.lineTo(this.cx + 28, this.bowlerStumpY);
    ctx.moveTo(this.cx - 32, this.bowlerStumpY + 14); ctx.lineTo(this.cx + 32, this.bowlerStumpY + 14);
    // Striker end
    ctx.moveTo(this.cx - 28, this.strikerStumpY); ctx.lineTo(this.cx + 28, this.strikerStumpY);
    ctx.moveTo(this.cx - 32, this.strikerStumpY - 14); ctx.lineTo(this.cx + 32, this.strikerStumpY - 14);
    // Return creases
    ctx.moveTo(this.cx - 21, this.bowlerStumpY - 6); ctx.lineTo(this.cx - 21, this.bowlerStumpY + 18);
    ctx.moveTo(this.cx + 21, this.bowlerStumpY - 6); ctx.lineTo(this.cx + 21, this.bowlerStumpY + 18);
    ctx.moveTo(this.cx - 21, this.strikerStumpY - 18); ctx.lineTo(this.cx - 21, this.strikerStumpY + 8);
    ctx.moveTo(this.cx + 21, this.strikerStumpY - 18); ctx.lineTo(this.cx + 21, this.strikerStumpY + 8);
    ctx.stroke();

    // 4. Interactive Aiming Overlay (when idle between balls)
    if (!this.anim) {
      if (this.state.phase === 'batting') {
        const ang = getZoneAngle(this.state.selectedZone, this.state.isLeftHand);
        const ax = this.cx + Math.cos(ang) * 265;
        const ay = this.strikerStumpY + Math.sin(ang) * 165;

        // Glowing aiming wedge
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.cx, this.strikerStumpY);
        ctx.arc(this.cx, this.strikerStumpY, 240, ang - 0.34, ang + 0.34);
        ctx.closePath();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
        ctx.fill();

        // Aim arrow
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(this.cx, this.strikerStumpY);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(ax, ay, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Interactive Bowling Pitch Spot Marker
        const pt = this.state.bowlPitchTarget;
        ctx.save();
        const pulse = 8 + Math.sin(timeSec * 5) * 2.5;
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. 3D Wooden Stumps & Bails (Bowler End)
    this.drawStumps(this.cx, this.bowlerStumpY, false);

    // 6. Dynamic Fielders + Wicketkeeper
    const fldColor = this.state.phase === 'batting' ? '#e11d48' : '#2563eb';
    const batColor = this.state.phase === 'batting' ? '#2563eb' : '#e11d48';

    // Non-striker (runs toward striker end during runs!)
    let nonStrikerY = this.bowlerStumpY + 10;
    let strikerY = this.strikerStumpY - 8;
    let runnerPhase = 0;
    if (this.anim && this.anim.stage === 'outcome' && this.anim.runCrossings > 0) {
      const p = Math.min(1, this.anim.t / this.anim.outDur);
      const runs = this.anim.runCrossings;
      const dist = (this.strikerStumpY - this.bowlerStumpY - 18);
      const trip = (p * runs) % 2;
      const prog = trip <= 1 ? trip : 2 - trip;
      runnerPhase = timeSec * 16;
      strikerY = (this.strikerStumpY - 8) - prog * dist;
      nonStrikerY = (this.bowlerStumpY + 10) + prog * dist;
    }

    this.drawPlayerSprite(this.cx + (this.state.isLeftHand ? -12 : 12), nonStrikerY, {
      kit: batColor, helmet: batColor, role: 'nonstriker', swing: runnerPhase
    });

    // Bowler
    let bowlerX = this.cx - 8;
    let bowlerY = this.bowlerStumpY - 46;
    let bowlerArm = 0;
    let bowlerStep = 0;
    if (this.anim) {
      if (this.anim.stage === 'runup') {
        const p = Math.min(1, this.anim.t / this.anim.runupDur);
        bowlerY = (this.bowlerStumpY - 48) + p * 48;
        bowlerStep = p * 18;
        bowlerArm = p * Math.PI * 1.6;
      } else {
        bowlerY = this.bowlerStumpY + 3;
        bowlerArm = Math.PI * 1.9;
      }
    }
    this.drawPlayerSprite(bowlerX, bowlerY, {
      kit: fldColor, cap: fldColor, role: 'bowler', armAngle: bowlerArm, swing: bowlerStep
    });

    // Outfielders
    for (const f of this.fielders) {
      this.drawPlayerSprite(f.x, f.y, { kit: fldColor, cap: fldColor, role: 'fielder' });
    }

    // Wicketkeeper behind striker stumps
    this.drawPlayerSprite(this.cx, this.strikerStumpY + 28, {
      kit: fldColor, helmet: fldColor, role: 'keeper'
    });

    // 7. Striker Stumps (or broken!)
    this.drawStumps(this.cx, this.strikerStumpY, this.stumpsBroken);

    // Stance offset & animated bat swing on Striker!
    let guardOffX = this.state.isLeftHand ? 11 : -11;
    if (this.state.selectedStance === 'Off Side') guardOffX += (this.state.isLeftHand ? -4 : 4);
    if (this.state.selectedStance === 'Leg Side') guardOffX += (this.state.isLeftHand ? 4 : -4);

    let batSwingAng = 0;
    if (this.anim) {
      if (this.anim.stage === 'delivery') batSwingAng = -0.7; // backlift!
      else if (this.anim.stage === 'outcome') {
        batSwingAng = this.anim.isLeave ? -1.1 : 1.25; // follow-through!
      }
    }
    this.drawPlayerSprite(this.cx + guardOffX, strikerY, {
      kit: batColor,
      helmet: '#0f172a',
      role: 'batsman',
      isLeftHand: this.state.isLeftHand,
      batAngle: batSwingAng,
      swing: runnerPhase
    });

    // 8. Trajectory Trail & 3D Ball + Bounce Shadow
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1];
        const b = this.trail[i];
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = (i / this.trail.length) * 0.72;
        ctx.lineWidth = Math.max(1.5, (i / this.trail.length) * 4.5);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (this.anim) {
      const b = this.anim.ball;
      // Ground shadow under ball
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, Math.max(2.5, 5 - b.z * 0.025), Math.max(1.5, 3 - b.z * 0.015), 0, 0, Math.PI * 2);
      ctx.fill();

      // Airborne Cricket Ball (White Kookaburra for stadium floodlights)
      const screenBy = b.y - b.z;
      const bGrad = ctx.createRadialGradient(b.x - 1.5, screenBy - 1.5, 1, b.x, screenBy, 5.5);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.65, '#e2e8f0');
      bGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(b.x, screenBy, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 9. Pitch Dust Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.75;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 10. Impact Flash Overlay
    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }

    // 11. Floating Celebratory Arcade Text
    for (const ft of this.floatingTexts) {
      const prog = ft.life / ft.maxLife;
      const alpha = prog < 0.7 ? 1 : Math.max(0, 1 - (prog - 0.7) / 0.3);
      const pop = prog < 0.14 ? 0.65 + (prog / 0.14) * 0.45 : 1.0;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale * pop, ft.scale * pop);
      ctx.font = 'bold 28px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 5;
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }

    // Bottom subtle zone hint badge inside canvas
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(14, this.H - 34, this.state.phase === 'batting' ? 285 : 325, 22);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      this.state.phase === 'batting'
        ? `AIM: ${this.state.selectedZone.toUpperCase()} (CLICK FIELD OR ◄/►)`
        : `TARGET: ${this.state.bowlPitchTarget.length.toUpperCase()} • ${this.state.bowlPitchTarget.line.toUpperCase()}`,
      22,
      this.H - 19
    );

    ctx.restore();
  }

  drawStumps(cx, cy, broken) {
    const ctx = this.ctx;
    const offsets = [-6, 0, 6];
    offsets.forEach((ox, idx) => {
      ctx.save();
      ctx.translate(cx + ox, cy);
      if (broken) {
        ctx.rotate((idx - 1) * 0.55 + 0.35);
      }
      // Wooden stump cylinder
      const grad = ctx.createLinearGradient(-1.5, -16, 1.5, 0);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      ctx.fillRect(-1.6, -15, 3.2, 15);
      ctx.restore();
    });

    if (!broken) {
      // Intact LED Bails
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 16);
      ctx.lineTo(cx + 7, cy - 16);
      ctx.stroke();
    } else {
      // Flying / dislodged bails
      for (const b of this.bails) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-3.5, -1.2, 7, 2.4);
        ctx.restore();
      }
    }
  }

  drawPlayerSprite(x, y, opts = {}) {
    const ctx = this.ctx;
    const { kit = '#2563eb', cap = null, helmet = null, role = 'fielder', batAngle = 0, armAngle = 0, swing = 0, isLeftHand = false } = opts;
    ctx.save();
    ctx.translate(x, y);

    // Soft ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated legs / running stride
    const legOff = Math.sin(swing) * 3.5;
    ctx.strokeStyle = role === 'batsman' || role === 'nonstriker' ? '#f8fafc' : '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, 2); ctx.lineTo(-3 - legOff * 0.4, 8 + legOff);
    ctx.moveTo(3, 2); ctx.lineTo(3 + legOff * 0.4, 8 - legOff);
    ctx.stroke();

    // Jersey torso
    ctx.fillStyle = kit;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-6.5, -8, 13, 12, 3) : ctx.rect(-6.5, -8, 13, 12);
    ctx.fill();
    ctx.stroke();

    // Bowler windmill arm
    if (role === 'bowler') {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(6, -6);
      ctx.lineTo(6 + Math.cos(armAngle) * 11, -6 - Math.sin(armAngle) * 11);
      ctx.stroke();
    }

    // Batsman Willow Bat
    if (role === 'batsman' || role === 'nonstriker') {
      ctx.save();
      const handSign = isLeftHand ? -1 : 1;
      ctx.translate(handSign * 6, -3);
      ctx.rotate(handSign * (0.45 + batAngle));
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.fillRect(-1.8, 0, 3.6, 15);
      ctx.strokeRect(-1.8, 0, 3.6, 15);
      ctx.restore();
    }

    // Head + Helmet / Cap
    ctx.fillStyle = helmet || cap || '#f1f5f9';
    ctx.beginPath();
    ctx.arc(0, -11, 5, 0, Math.PI * 2);
    ctx.fill();
    if (helmet) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -9, 3.8, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
