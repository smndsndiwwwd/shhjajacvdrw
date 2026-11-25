import { cricketAudio } from './cricketAudio.js';

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

// World-space horizontal angle around Striker (+wy = toward keeper/south, -wy = toward bowler/north, +wx = off side for RHB)
function getZoneWorldAngle(zone, isLeftHand) {
  const rhb = {
    'Long Off':   -1.16,
    'Cover':      -0.44,
    'Point':       0.20,
    'Third Man':   1.02,
    'Fine Leg':    2.12,
    'Square Leg':  2.94,
    'Mid Wicket': -2.70,
    'Long On':    -1.98
  };
  const base = rhb[zone] ?? -0.44;
  return isLeftHand ? Math.PI - base : base;
}

export function angleToZone(rad, isLeftHand) {
  let best = 'Cover';
  let bestDiff = Infinity;
  for (const z of WAGON_ZONES) {
    const za = getZoneWorldAngle(z, isLeftHand);
    const diff = Math.abs(Math.atan2(Math.sin(rad - za), Math.cos(rad - za)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = z;
    }
  }
  return best;
}

// Polar world-space fielding templates around center (0, 0) matching cricket zones & Powerplay priorities
const PRESET_SLOTS = {
  Attacking: [
    // First 2 are the ONLY allowed deep outfielders in Powerplay
    { ang: -1.18, rFrac: 0.85, deep: true, label: 'Long Off' },
    { ang: -2.68, rFrac: 0.85, deep: true, label: 'Deep MW' },
    // 7 inner-ring aggressive catchers & ring savers
    { ang: 1.38,  rFrac: 0.24, deep: false, label: 'Slip 1' },
    { ang: 1.18,  rFrac: 0.28, deep: false, label: 'Slip 2' },
    { ang: 0.82,  rFrac: 0.30, deep: false, label: 'Gully' },
    { ang: 0.16,  rFrac: 0.28, deep: false, label: 'Point' },
    { ang: -0.46, rFrac: 0.42, deep: false, label: 'Cover' },
    { ang: -2.02, rFrac: 0.42, deep: false, label: 'Mid On' },
    { ang: 2.38,  rFrac: 0.22, deep: false, label: 'Short Leg' }
  ],
  Balanced: [
    // First 2 stay outside 30-yard circle in Powerplay
    { ang: 2.94,  rFrac: 0.86, deep: true, label: 'D.Square' },
    { ang: -2.70, rFrac: 0.86, deep: true, label: 'D.MidWkt' },
    // Next 3 stay out in Open Field, pulled inside 30-yd circle in Powerplay
    { ang: -1.96, rFrac: 0.86, deep: true, label: 'Long On' },
    { ang: -1.16, rFrac: 0.86, deep: true, label: 'Long Off' },
    { ang: 0.24,  rFrac: 0.84, deep: true, label: 'D.Point' },
    // 4 inside-circle anchor fielders
    { ang: 2.08,  rFrac: 0.44, deep: false, label: 'S.Fine' },
    { ang: 1.12,  rFrac: 0.34, deep: false, label: 'Slip' },
    { ang: -0.46, rFrac: 0.45, deep: false, label: 'Cover' },
    { ang: -1.42, rFrac: 0.42, deep: false, label: 'Mid Off' }
  ],
  Defensive: [
    // First 2 stay out in Powerplay
    { ang: 2.12,  rFrac: 0.87, deep: true, label: 'D.Fine' },
    { ang: 2.94,  rFrac: 0.87, deep: true, label: 'D.Square' },
    // Next 3 protect boundaries in Open Field, pulled in during PP
    { ang: -2.68, rFrac: 0.87, deep: true, label: 'D.MidWkt' },
    { ang: -1.96, rFrac: 0.87, deep: true, label: 'Long On' },
    { ang: -1.16, rFrac: 0.87, deep: true, label: 'Long Off' },
    // 4 ring fielders
    { ang: 0.96,  rFrac: 0.48, deep: false, label: '3rd Man' },
    { ang: 0.16,  rFrac: 0.46, deep: false, label: 'Point' },
    { ang: -0.48, rFrac: 0.46, deep: false, label: 'Cover' },
    { ang: -1.72, rFrac: 0.44, deep: false, label: 'Mid On' }
  ]
};

const R_BOUNDARY = 580;
const R_RING = 335;
const PITCH_HALF_LEN = 112;
const PITCH_HALF_W = 24;
const STRIKER_Y = 104;
const BOWLER_Y = -104;

export class CricketArcadeRenderer {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    this.W = 960;
    this.H = 580;

    // 3D Perspective Broadcast Camera Parameters
    this.baseCam = { x: 0, y: 1360, z: 980, lookX: 0, lookY: -10, fov: 850 };
    this.camFocus = { x: 0, y: 0 };

    // 3D Stadium Crowd Tier Rings
    this.crowd = Array.from({ length: 240 }, (_, i) => {
      const ang = (i / 240) * Math.PI * 2 + (i % 3) * 0.013;
      const tier = i % 3;
      const r = R_BOUNDARY + 62 + tier * 42;
      const z = 18 + tier * 36;
      const palette = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#e2e8f0', '#a855f7'];
      return { ang, r, z, color: palette[i % palette.length], phase: (i * 0.67) % (Math.PI * 2) };
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
      bowlPitchTarget: { line: 'Stumps', length: 'Good Length', wx: 0, wy: 24 }
    };

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
    this.crowdExcitement = 0;
    this.rafId = null;
    this.lastTime = 0;

    this.syncFielders();
    this.bindPointer();
    this.startLoop();
  }

  // Exact 3D LookAt Camera Projection (World wx/wy horizontal ground, wz elevation up)
  computeCameraBasis() {
    const cx = this.baseCam.x + this.camFocus.x;
    const cy = this.baseCam.y + this.camFocus.y * 0.25;
    const cz = this.baseCam.z;
    const lx = this.baseCam.lookX + this.camFocus.x * 0.45;
    const ly = this.baseCam.lookY + this.camFocus.y * 0.35;
    const lz = 0;

    const fx = lx - cx, fy = ly - cy, fz = lz - cz;
    const fl = Math.hypot(fx, fy, fz) || 1;
    const f = [fx / fl, fy / fl, fz / fl];

    // right = normalize(f x worldUp(0,0,1))
    let rx = f[1] * 1 - f[2] * 0;
    let ry = f[2] * 0 - f[0] * 1;
    let rz = 0;
    const rl = Math.hypot(rx, ry, rz) || 1;
    const r = [rx / rl, ry / rl, rz / rl];

    // up = r x f
    const u = [
      r[1] * f[2] - r[2] * f[1],
      r[2] * f[0] - r[0] * f[2],
      r[0] * f[1] - r[1] * f[0]
    ];

    return { pos: [cx, cy, cz], f, r, u };
  }

  project(wx, wy, wz = 0, basis = this._frameBasis) {
    const b = basis || this.computeCameraBasis();
    const dx = wx - b.pos[0];
    const dy = wy - b.pos[1];
    const dz = wz - b.pos[2];

    const cz = dx * b.f[0] + dy * b.f[1] + dz * b.f[2];
    const cx = dx * b.r[0] + dy * b.r[1] + dz * b.r[2];
    const cy = dx * b.u[0] + dy * b.u[1] + dz * b.u[2];

    const depth = Math.max(180, cz);
    const scale = this.baseCam.fov / depth;
    return {
      x: this.W * 0.5 + cx * scale,
      y: this.H * 0.505 - cy * scale,
      scale,
      depth: cz
    };
  }

  // Inverse ground intersection ray from screen pixel (sx, sy) onto plane wz = 0
  unprojectGround(sx, sy) {
    const b = this.computeCameraBasis();
    const nx = (sx - this.W * 0.5) / this.baseCam.fov;
    const ny = (this.H * 0.505 - sy) / this.baseCam.fov;

    const dirX = b.f[0] + b.r[0] * nx + b.u[0] * ny;
    const dirY = b.f[1] + b.r[1] * nx + b.u[1] * ny;
    const dirZ = b.f[2] + b.r[2] * nx + b.u[2] * ny;

    if (Math.abs(dirZ) < 1e-4) return { wx: 0, wy: 0 };
    const t = -b.pos[2] / dirZ;
    return {
      wx: b.pos[0] + dirX * t,
      wy: b.pos[1] + dirY * t
    };
  }

  updateConfig(cfg) {
    Object.assign(this.state, cfg);
    this.syncFielders();
  }

  syncFielders() {
    const raw = PRESET_SLOTS[this.state.fieldPreset] || PRESET_SLOTS.Balanced;
    const maxDeep = this.state.isPowerplay ? 2 : 5;
    let deepCount = 0;

    this.fielders = raw.map((slot, idx) => {
      const ang = this.state.isLeftHand ? Math.PI - slot.ang : slot.ang;
      let r = slot.rFrac * R_BOUNDARY;
      if (slot.deep) {
        deepCount++;
        if (deepCount > maxDeep) {
          r = R_RING * 0.80; // Pull extra deep fielders strictly inside 30-yd Powerplay circle!
        }
      }
      let wx = Math.cos(ang) * r;
      let wy = Math.sin(ang) * r;
      // Guarantee fielder never stands inside the 22-yard pitch corridor
      if (Math.abs(wx) < PITCH_HALF_W + 22 && Math.abs(wy) < PITCH_HALF_LEN + 18) {
        wx += (wx >= 0 ? 1 : -1) * 42;
      }
      return { id: idx, baseX: wx, baseY: wy, wx, wy, label: slot.label };
    });
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
    const onDown = (e) => {
      if (this.anim) return;
      cricketAudio.ensureContext();
      const sc = this.canvasCoords(e);
      const ground = this.unprojectGround(sc.x, sc.y);

      if (this.state.phase === 'batting') {
        const ang = Math.atan2(ground.wy - STRIKER_Y, ground.wx);
        const zone = angleToZone(ang, this.state.isLeftHand);
        this.state.selectedZone = zone;
        cricketAudio.playUiTick();
        if (this.callbacks.onSelectZone) this.callbacks.onSelectZone(zone);
      } else {
        const clampedX = Math.max(-44, Math.min(44, ground.wx));
        const clampedY = Math.max(BOWLER_Y + 18, Math.min(STRIKER_Y - 2, ground.wy));

        const orientedX = clampedX * (this.state.isLeftHand ? -1 : 1);
        let line = 'Stumps';
        if (orientedX > 24) line = 'Wide';
        else if (orientedX > 9) line = 'Off Side';
        else if (orientedX < -9) line = 'Leg Side';

        const yNorm = (clampedY - BOWLER_Y) / Math.max(1, STRIKER_Y - BOWLER_Y);
        let length = 'Good Length';
        if (yNorm > 0.82) length = 'Yorker';
        else if (yNorm > 0.60) length = 'Full';
        else if (yNorm < 0.36) length = 'Short';

        this.state.bowlPitchTarget = { wx: clampedX, wy: clampedY, line, length };
        cricketAudio.playUiTick();
        if (this.callbacks.onSelectBowlSpot) this.callbacks.onSelectBowlSpot({ line, length });
      }
    };

    this._onDown = onDown;
    this.canvas.addEventListener('pointerdown', this._onDown);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('pointerdown', this._onDown);
  }

  deliveryToWorldPoint(deliv) {
    const sign = this.state.isLeftHand ? -1 : 1;
    let wx = 0;
    if (deliv?.line === 'Off Side') wx = 13 * sign;
    else if (deliv?.line === 'Leg Side') wx = -13 * sign;
    else if (deliv?.line === 'Wide') wx = 29 * sign;

    let wy = 0;
    if (deliv?.length === 'Yorker') wy = STRIKER_Y - 6;
    else if (deliv?.length === 'Full' || deliv?.length === 'Full Toss') wy = BOWLER_Y + (STRIKER_Y - BOWLER_Y) * 0.74;
    else if (deliv?.length === 'Short') wy = BOWLER_Y + (STRIKER_Y - BOWLER_Y) * 0.28;
    return { wx, wy };
  }

  // Exact ray distance from striker crease (0, STRIKER_Y) to circular Boundary Rope R_BOUNDARY
  distanceToBoundaryFromStriker(dirX, dirY) {
    const b = 2 * STRIKER_Y * dirY;
    const c = STRIKER_Y * STRIKER_Y - R_BOUNDARY * R_BOUNDARY;
    const disc = Math.max(0, b * b - 4 * c);
    return (-b + Math.sqrt(disc)) / 2;
  }

  spawnDust(wx, wy, count = 12, color = '#d6b47e') {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.8 + Math.random() * 2.2;
      this.particles.push({
        wx, wy, wz: 2 + Math.random() * 6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1.1 + Math.random() * 1.8,
        r: 2.2 + Math.random() * 3.0,
        life: 0,
        maxLife: 24 + Math.random() * 14,
        color
      });
    }
  }

  spawnFloatingText(text, scX, scY, color = '#fbbf24', scale = 1.2) {
    this.floatingTexts.push({ text, x: scX, y: scY, color, scale, life: 0, maxLife: 95 });
  }

  dislodgeStumps() {
    this.stumpsBroken = true;
    this.bails = [
      { wx: -5, wy: STRIKER_Y, wz: 22, vx: -2.2 - Math.random(), vy: 1.5 - Math.random() * 3, vz: 5.5 + Math.random() * 2, rot: 0, vr: -0.25 },
      { wx: 5, wy: STRIKER_Y, wz: 22, vx: 2.1 + Math.random(), vy: 1.5 - Math.random() * 3, vz: 6.2 + Math.random() * 2, rot: 0, vr: 0.28 }
    ];
    this.spawnDust(0, STRIKER_Y, 18, '#fbbf24');
    cricketAudio.playStumpsRattle();
  }

  playBallAnimation(ballResult, options = {}) {
    const lb = ballResult || {};
    const deliv = lb.delivery || { line: 'Stumps', length: 'Good Length', speed: 'Fast' };
    const bouncePt = this.deliveryToWorldPoint(deliv);
    const zone = options.zone || lb.zone || this.state.selectedZone || 'Cover';
    const shotAng = getZoneWorldAngle(zone, this.state.isLeftHand);
    const dirX = Math.cos(shotAng);
    const dirY = Math.sin(shotAng);
    const distRope = this.distanceToBoundaryFromStriker(dirX, dirY);
    const isLeave = String(lb.shotName || '').toLowerCase().includes('leave');
    const lowerComm = String(lb.commentary || '').toLowerCase();
    const isBowledOrLbw = lb.wicket && (lowerComm.includes('bowled') || lowerComm.includes('lbw') || lowerComm.includes('stumps') || lowerComm.includes('timber'));

    this.stumpsBroken = false;
    this.bails = [];
    this.trail = [];
    this.syncFielders();

    const speedMul = deliv.speed === 'Fast' ? 1.15 : deliv.speed === 'Slow' ? 0.85 : 1.0;

    // Determine exact 3D landing target in world coordinates
    let landDist = 0;
    let peakZ = 22;
    let endZ = 3;
    if (lb.rebowl || isLeave || isBowledOrLbw) {
      landDist = 0;
      peakZ = 14;
    } else if (lb.runs === 6) {
      // Strictly OVER the boundary rope into the 3D Stadium Crowd Stands!
      landDist = distRope + 125;
      peakZ = 225;
      endZ = 42;
    } else if (lb.runs === 4) {
      // Races across the turf just past the boundary rope!
      landDist = distRope + 18;
      peakZ = 38;
      endZ = 3;
    } else if (lb.runs === 3) {
      landDist = distRope * 0.86;
      peakZ = 56;
    } else if (lb.runs === 2) {
      landDist = distRope * 0.66;
      peakZ = 48;
    } else if (lb.runs === 1) {
      landDist = distRope * 0.44;
      peakZ = 28;
    } else if (lb.wicket) {
      landDist = distRope * 0.48;
      peakZ = lowerComm.includes('caught') ? 105 : 22;
    } else {
      landDist = Math.min(distRope * 0.20, 85);
      peakZ = 16;
    }

    const endWx = dirX * landDist;
    const endWy = STRIKER_Y + dirY * landDist;

    this.anim = {
      t: 0,
      stage: 'runup',
      runupDur: 0.46 / speedMul,
      delivDur: 0.54 / speedMul,
      outDur: (lb.runs >= 4 || lb.wicket || lb.runs >= 1) ? 1.42 : 0.70,
      bouncePt,
      zone,
      endWx,
      endWy,
      peakZ,
      endZ,
      isLeave,
      isBowledOrLbw,
      bouncedPlayed: false,
      outcomeTriggered: false,
      lb,
      ball: { wx: 0, wy: BOWLER_Y - 72, wz: 28 },
      runCrossings: lb.wicket ? 0 : (lb.runs === 4 || lb.runs === 6 ? 0 : Math.min(3, lb.runs || 0))
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
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 26);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.9);
    if (this.crowdExcitement > 0) this.crowdExcitement = Math.max(0, this.crowdExcitement - dt * 0.4);

    // Smoothly return camera focus toward center when idle
    if (!this.anim || this.anim.stage !== 'outcome') {
      this.camFocus.x += (0 - this.camFocus.x) * Math.min(1, dt * 4);
      this.camFocus.y += (0 - this.camFocus.y) * Math.min(1, dt * 4);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.wx += p.vx;
      p.wy += p.vy;
      p.wz = Math.max(0, p.wz + p.vz);
      p.vz -= 0.14;
      p.life++;
      if (p.life >= p.maxLife) this.particles.splice(i, 1);
    }

    for (const b of this.bails) {
      b.wx += b.vx;
      b.wy += b.vy;
      b.wz += b.vz;
      b.vz -= 0.34;
      b.rot += b.vr;
      if (b.wz <= 1) {
        b.wz = 1;
        b.vz *= -0.35;
        b.vx *= 0.65;
        b.vy *= 0.65;
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life++;
      ft.y -= 28 * dt;
      if (ft.life >= ft.maxLife) this.floatingTexts.splice(i, 1);
    }

    if (!this.anim) return;
    const a = this.anim;
    a.t += dt;

    if (a.stage === 'runup') {
      const p = Math.min(1, a.t / a.runupDur);
      a.ball.wx = 0;
      a.ball.wy = (BOWLER_Y - 78) + p * 78;
      a.ball.wz = 24 + Math.sin(p * Math.PI) * 14;
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
        a.ball.wx = a.bouncePt.wx * sub;
        a.ball.wy = BOWLER_Y + (a.bouncePt.wy - BOWLER_Y) * sub;
        a.ball.wz = 30 * (1 - sub * sub);
      } else {
        if (!a.bouncedPlayed) {
          a.bouncedPlayed = true;
          cricketAudio.playPitchBounce();
          this.spawnDust(a.bouncePt.wx, a.bouncePt.wy, 14, '#d9be8b');
        }
        const sub = (p - bounceP) / (1 - bounceP);
        a.ball.wx = a.bouncePt.wx * (1 - sub * 0.72);
        a.ball.wy = a.bouncePt.wy + (STRIKER_Y - a.bouncePt.wy) * sub;
        const apex = a.lb.delivery?.length === 'Short' ? 34 : 15;
        a.ball.wz = Math.sin(sub * Math.PI * 0.75) * apex + 7;
      }

      this.trail.push({ wx: a.ball.wx, wy: a.ball.wy, wz: a.ball.wz, color: '#38bdf8' });
      if (this.trail.length > 20) this.trail.shift();

      if (p >= 1) {
        a.stage = 'outcome';
        a.t = 0;
        if (!a.outcomeTriggered) {
          a.outcomeTriggered = true;
          const lb = a.lb;
          const bannerPos = this.project(0, STRIKER_Y, 45);
          if (lb.wicket) {
            this.cameraShake = 10;
            this.flashAlpha = 0.34;
            this.flashColor = '#f43f5e';
            this.crowdExcitement = 1;
            const lowerComm = String(lb.commentary || '').toLowerCase();
            if (a.isBowledOrLbw || lowerComm.includes('run out') || lowerComm.includes('stumped')) {
              this.dislodgeStumps();
            } else {
              cricketAudio.playBatCrack(lb.timing || 'Slightly Late');
            }
            cricketAudio.playCrowdCheer(1.3);
            this.spawnFloatingText(a.isBowledOrLbw ? 'BOWLED! 💥' : 'OUT! 💥', bannerPos.x, bannerPos.y - 25, '#fb7185', 1.45);
          } else if (lb.rebowl) {
            this.spawnFloatingText('WIDE (+1)', bannerPos.x, bannerPos.y - 20, '#fbbf24', 1.15);
          } else if (a.isLeave) {
            this.spawnFloatingText('WELL LEFT', bannerPos.x, bannerPos.y - 18, '#94a3b8', 1.0);
          } else {
            cricketAudio.playBatCrack(lb.timing || 'Perfect');
            if (lb.runs === 6) {
              this.cameraShake = 11;
              this.flashAlpha = 0.28;
              this.flashColor = '#f59e0b';
              this.crowdExcitement = 1;
              cricketAudio.playCrowdCheer(1.75);
              this.spawnFloatingText('MAXIMUM SIX! 🔥', bannerPos.x, bannerPos.y - 30, '#fbbf24', 1.55);
            } else if (lb.runs === 4) {
              this.cameraShake = 6.5;
              this.flashAlpha = 0.22;
              this.flashColor = '#10b981';
              this.crowdExcitement = 0.85;
              cricketAudio.playCrowdCheer(1.3);
              this.spawnFloatingText('FOUR! ⚡', bannerPos.x, bannerPos.y - 26, '#34d399', 1.4);
            } else if (lb.runs > 0) {
              this.spawnFloatingText(`${lb.runs} RUN${lb.runs > 1 ? 'S' : ''}!`, bannerPos.x, bannerPos.y - 20, '#38bdf8', 1.15);
            } else {
              this.spawnFloatingText(lb.timing === 'Perfect' ? 'SOLID! •' : 'DOT BALL', bannerPos.x, bannerPos.y - 16, '#cbd5e1', 0.95);
            }
          }
        }
      }
    } else if (a.stage === 'outcome') {
      const p = Math.min(1, a.t / a.outDur);
      const easeOut = 1 - Math.pow(1 - p, 2.0);
      const lb = a.lb;

      if (!a.isLeave && !lb.rebowl && !a.isBowledOrLbw && (lb.runs > 0 || lb.wicket)) {
        a.ball.wx = a.endWx * easeOut;
        a.ball.wy = STRIKER_Y + (a.endWy - STRIKER_Y) * easeOut;
        a.ball.wz = Math.sin(p * Math.PI) * a.peakZ + a.endZ * p;

        // Subtle camera pan tracking big shots across 3D stadium!
        this.camFocus.x += (Math.max(-220, Math.min(220, a.ball.wx * 0.24)) - this.camFocus.x) * Math.min(1, dt * 3.5);
        this.camFocus.y += (Math.max(-140, Math.min(140, a.ball.wy * 0.22)) - this.camFocus.y) * Math.min(1, dt * 3.5);

        this.trail.push({
          wx: a.ball.wx, wy: a.ball.wy, wz: a.ball.wz,
          color: lb.runs === 6 ? '#f59e0b' : lb.runs === 4 ? '#34d399' : '#e2e8f0'
        });
        if (this.trail.length > 26) this.trail.shift();

        // Nearest fielder chases toward intercept point (clamped inside boundary!)
        let nearest = null;
        let bestD = Infinity;
        for (const f of this.fielders) {
          const d = Math.hypot(f.baseX - a.endWx, f.baseY - a.endWy);
          if (d < bestD) { bestD = d; nearest = f; }
        }
        if (nearest) {
          const mag = Math.hypot(a.endWx, a.endWy) || 1;
          const capDist = Math.min(mag, R_BOUNDARY - 16);
          const tx = (a.endWx / mag) * capDist;
          const ty = (a.endWy / mag) * capDist;
          nearest.wx += (tx - nearest.wx) * Math.min(1, dt * 4.5);
          nearest.wy += (ty - nearest.wy) * Math.min(1, dt * 4.5);
        }
      } else {
        a.ball.wx = 0;
        a.ball.wy = STRIKER_Y + Math.min(46, p * 56);
        a.ball.wz = 10 * (1 - p);
      }

      if (p >= 1) {
        this.anim = null;
        this.syncFielders();
      }
    }
  }

  drawPolygonGround(angles, r, z, fillStyle, strokeStyle = null, lw = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    angles.forEach((a, i) => {
      const p = this.project(Math.cos(a) * r, Math.sin(a) * r, z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lw; ctx.stroke(); }
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

    this._frameBasis = this.computeCameraBasis();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.cameraShake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.cameraShake * 2, (Math.random() - 0.5) * this.cameraShake * 2);
    }

    // 1. Night Sky & Stadium Horizon Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.H);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.45, '#0b152c');
    skyGrad.addColorStop(1, '#040812');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Subtle 3D polygon angles (56 segments for smooth perspective rings)
    const SEGS = 56;
    const angles = Array.from({ length: SEGS }, (_, i) => (i / SEGS) * Math.PI * 2);

    // 2. Back Stadium 3D Bowl Wall + Tiered Stands (drawn on Northern hemisphere + full oval outer shell)
    this.drawPolygonGround(angles, R_BOUNDARY + 175, 115, '#0f172a', 'rgba(56, 189, 248, 0.2)', 1.5);
    this.drawPolygonGround(angles, R_BOUNDARY + 115, 58, '#1e293b', 'rgba(255,255,255,0.08)', 1);
    this.drawPolygonGround(angles, R_BOUNDARY + 48, 10, '#0f172a', 'rgba(56, 189, 248, 0.25)', 2);

    // Vertical 3D Floodlight Pylons on far stands
    [[-520, -560], [520, -560]].forEach(([fx, fy]) => {
      const baseP = this.project(fx, fy, 40);
      const topP = this.project(fx, fy, 260);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4 * topP.scale * 1.8;
      ctx.beginPath();
      ctx.moveTo(baseP.x, baseP.y);
      ctx.lineTo(topP.x, topP.y);
      ctx.stroke();

      const fg = ctx.createRadialGradient(topP.x, topP.y, 4, topP.x, topP.y, 130);
      fg.addColorStop(0, 'rgba(224, 242, 254, 0.6)');
      fg.addColorStop(0.35, 'rgba(56, 189, 248, 0.14)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(topP.x, topP.y, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(topP.x - 16, topP.y - 6, 32, 10);
    });

    // Animated 3D Crowd (drawn in back half before field, front half clipped cleanly)
    const backSpecs = [];
    const frontSpecs = [];
    for (const spec of this.crowd) {
      const jump = Math.sin(timeSec * (2.6 + this.crowdExcitement * 10) + spec.phase) * (2.5 + this.crowdExcitement * 7);
      const wx = Math.cos(spec.ang) * spec.r;
      const wy = Math.sin(spec.ang) * spec.r;
      const p = this.project(wx, wy, spec.z + jump);
      if (wy < 80) backSpecs.push({ p, color: spec.color });
      else frontSpecs.push({ p, color: spec.color });
    }
    for (const s of backSpecs) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.p.x, s.p.y, Math.max(1.8, 4.2 * s.p.scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Textured Green 3D Outfield Concentric Mowing Rings
    this.drawPolygonGround(angles, R_BOUNDARY + 22, 0, '#14532d');
    [0.92, 0.78, 0.64, 0.50, 0.36, 0.22].forEach((mul, idx) => {
      this.drawPolygonGround(angles, R_BOUNDARY * mul, 0, idx % 2 === 0 ? '#166534' : '#15803d');
    });

    // 30-Yard Powerplay Dashed Circle
    ctx.save();
    ctx.setLineDash([10, 7]);
    this.drawPolygonGround(
      angles,
      R_RING,
      0.5,
      null,
      this.state.isPowerplay ? 'rgba(245, 158, 11, 0.78)' : 'rgba(255, 255, 255, 0.45)',
      2
    );
    ctx.restore();

    // 3D Boundary Rope & LED Sponsor Cushions
    this.drawPolygonGround(angles, R_BOUNDARY + 7, 2, null, '#0f172a', 7);
    ctx.save();
    ctx.setLineDash([18, 7]);
    this.drawPolygonGround(angles, R_BOUNDARY, 3, null, '#f8fafc', 3);
    ctx.restore();

    // 4. 3D Perspective Trapezoid 22-Yard Pitch + Creases
    const pCol = String(this.state.pitch || '').includes('Green') ? '#9fb37d'
      : String(this.state.pitch || '').includes('Dusty') ? '#cfa972' : '#d6bb89';
    const corners = [
      this.project(-PITCH_HALF_W, -PITCH_HALF_LEN - 10, 0),
      this.project(PITCH_HALF_W, -PITCH_HALF_LEN - 10, 0),
      this.project(PITCH_HALF_W, PITCH_HALF_LEN + 12, 0),
      this.project(-PITCH_HALF_W, PITCH_HALF_LEN + 12, 0)
    ];
    ctx.fillStyle = pCol;
    ctx.strokeStyle = '#92784a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    corners.forEach((c, i) => i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crease white lines in 3D space
    const drawLine3D = (x1, y1, x2, y2, col = '#fff', w = 1.8) => {
      const a = this.project(x1, y1, 0.5);
      const b = this.project(x2, y2, 0.5);
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    drawLine3D(-28, BOWLER_Y, 28, BOWLER_Y);
    drawLine3D(-34, BOWLER_Y + 18, 34, BOWLER_Y + 18);
    drawLine3D(-28, STRIKER_Y, 28, STRIKER_Y);
    drawLine3D(-34, STRIKER_Y - 18, 34, STRIKER_Y - 18);
    drawLine3D(-22, BOWLER_Y - 8, -22, BOWLER_Y + 22);
    drawLine3D(22, BOWLER_Y - 8, 22, BOWLER_Y + 22);
    drawLine3D(-22, STRIKER_Y - 22, -22, STRIKER_Y + 10);
    drawLine3D(22, STRIKER_Y - 22, 22, STRIKER_Y + 10);

    // 5. Interactive Aiming Wedge (Batting) or Pitch Target Marker (Bowling)
    if (!this.anim) {
      if (this.state.phase === 'batting') {
        const ang = getZoneWorldAngle(this.state.selectedZone, this.state.isLeftHand);
        const origP = this.project(0, STRIKER_Y, 6);
        const dirX = Math.cos(ang), dirY = Math.sin(ang);
        const dRope = this.distanceToBoundaryFromStriker(dirX, dirY);
        const tipP = this.project(dirX * dRope * 0.72, STRIKER_Y + dirY * dRope * 0.72, 6);
        const leftP = this.project(Math.cos(ang - 0.34) * dRope * 0.64, STRIKER_Y + Math.sin(ang - 0.34) * dRope * 0.64, 4);
        const rightP = this.project(Math.cos(ang + 0.34) * dRope * 0.64, STRIKER_Y + Math.sin(ang + 0.34) * dRope * 0.64, 4);

        ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
        ctx.beginPath();
        ctx.moveTo(origP.x, origP.y);
        ctx.lineTo(leftP.x, leftP.y);
        ctx.lineTo(tipP.x, tipP.y);
        ctx.lineTo(rightP.x, rightP.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(origP.x, origP.y);
        ctx.lineTo(tipP.x, tipP.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const pt = this.state.bowlPitchTarget;
        const p = this.project(pt.wx, pt.wy, 1);
        const pulse = 7 + Math.sin(timeSec * 5) * 2.5;
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, pulse, pulse * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Depth-Sorted 3D Entities (Stumps, Players, Fielders, Airborne Ball)
    const drawList = [];
    const fldKit = this.state.phase === 'batting' ? '#e11d48' : '#2563eb';
    const batKit = this.state.phase === 'batting' ? '#2563eb' : '#e11d48';

    drawList.push({
      depth: this.project(0, BOWLER_Y, 0).depth,
      render: () => this.drawStumps3D(0, BOWLER_Y, false)
    });

    // Striker & Non-Striker animations
    let strikerWy = STRIKER_Y - 12;
    let nonStrikerWy = BOWLER_Y + 14;
    let runPhase = 0;
    if (this.anim && this.anim.stage === 'outcome' && this.anim.runCrossings > 0) {
      const p = Math.min(1, this.anim.t / this.anim.outDur);
      const trip = (p * this.anim.runCrossings) % 2;
      const prog = trip <= 1 ? trip : 2 - trip;
      runPhase = timeSec * 16;
      strikerWy = (STRIKER_Y - 12) - prog * (STRIKER_Y - BOWLER_Y - 26);
      nonStrikerWy = (BOWLER_Y + 14) + prog * (STRIKER_Y - BOWLER_Y - 26);
    }

    drawList.push({
      depth: this.project(this.state.isLeftHand ? -14 : 14, nonStrikerWy, 0).depth,
      render: () => this.drawPlayer3D(this.state.isLeftHand ? -14 : 14, nonStrikerWy, { kit: batKit, helmet: '#0f172a', role: 'nonstriker', swing: runPhase })
    });

    let bowlWy = BOWLER_Y - 72;
    let bowlArm = 0;
    let bowlStep = 0;
    if (this.anim) {
      if (this.anim.stage === 'runup') {
        const p = Math.min(1, this.anim.t / this.anim.runupDur);
        bowlWy = (BOWLER_Y - 72) + p * 72;
        bowlStep = p * 18;
        bowlArm = p * Math.PI * 1.6;
      } else {
        bowlWy = BOWLER_Y + 4;
        bowlArm = Math.PI * 1.9;
      }
    }
    drawList.push({
      depth: this.project(-14, bowlWy, 0).depth,
      render: () => this.drawPlayer3D(-14, bowlWy, { kit: fldKit, cap: fldKit, role: 'bowler', armAngle: bowlArm, swing: bowlStep })
    });

    for (const f of this.fielders) {
      drawList.push({
        depth: this.project(f.wx, f.wy, 0).depth,
        render: () => this.drawPlayer3D(f.wx, f.wy, { kit: fldKit, cap: fldKit, role: 'fielder' })
      });
    }

    drawList.push({
      depth: this.project(0, STRIKER_Y + 34, 0).depth,
      render: () => this.drawPlayer3D(0, STRIKER_Y + 34, { kit: fldKit, helmet: fldKit, role: 'keeper' })
    });

    drawList.push({
      depth: this.project(0, STRIKER_Y, 0).depth,
      render: () => this.drawStumps3D(0, STRIKER_Y, this.stumpsBroken)
    });

    let guardX = this.state.isLeftHand ? 12 : -12;
    if (this.state.selectedStance === 'Off Side') guardX += (this.state.isLeftHand ? -4 : 4);
    if (this.state.selectedStance === 'Leg Side') guardX += (this.state.isLeftHand ? 4 : -4);

    let batSwingAng = 0;
    if (this.anim) {
      if (this.anim.stage === 'delivery') batSwingAng = -0.75;
      else if (this.anim.stage === 'outcome') batSwingAng = this.anim.isLeave ? -1.15 : 1.25;
    }
    drawList.push({
      depth: this.project(guardX, strikerWy, 0).depth,
      render: () => this.drawPlayer3D(guardX, strikerWy, {
        kit: batKit, helmet: '#0f172a', role: 'batsman', isLeftHand: this.state.isLeftHand, batAngle: batSwingAng, swing: runPhase
      })
    });

    // Sort farthest-to-closest!
    drawList.sort((a, b) => b.depth - a.depth);
    for (const item of drawList) item.render();

    // 7. 3D Ball Trail & 3D Ball + Ground Shadow
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const p1 = this.project(this.trail[i - 1].wx, this.trail[i - 1].wy, this.trail[i - 1].wz);
        const p2 = this.project(this.trail[i].wx, this.trail[i].wy, this.trail[i].wz);
        ctx.strokeStyle = this.trail[i].color;
        ctx.globalAlpha = (i / this.trail.length) * 0.78;
        ctx.lineWidth = Math.max(1.5, (i / this.trail.length) * 5.2 * p2.scale * 1.8);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (this.anim) {
      const b = this.anim.ball;
      const gP = this.project(b.wx, b.wy, 0.5);
      const bP = this.project(b.wx, b.wy, b.wz);
      const shadowScale = Math.max(0.45, 1 - b.wz * 0.0025);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(gP.x, gP.y, 7 * gP.scale * shadowScale * 1.6, 4 * gP.scale * shadowScale * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      const r = Math.max(3.8, 9.5 * bP.scale);
      const bg = ctx.createRadialGradient(bP.x - r * 0.3, bP.y - r * 0.3, r * 0.15, bP.x, bP.y, r);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.65, '#e2e8f0');
      bg.addColorStop(1, '#94a3b8');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bP.x, bP.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 8. 3D Pitch Dust Particles
    for (const pt of this.particles) {
      const pp = this.project(pt.wx, pt.wy, pt.wz);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife) * 0.78;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, Math.max(1.2, pt.r * pp.scale * 1.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Front crowd specs in front of southern rope if visible
    for (const s of frontSpecs) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.p.x, s.p.y, Math.max(1.8, 3.8 * s.p.scale), 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }

    // 9. Celebratory Floating Arcade Typography
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

    // Top-left Field Restriction & Aim HUD Chip inside Canvas
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(14, 14, 345, 24);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const fldRule = this.state.isPowerplay ? 'POWERPLAY (2 OUT / 7 IN)' : 'OPEN FIELD (5 OUT / 4 IN)';
    ctx.fillText(
      this.state.phase === 'batting'
        ? `${fldRule} • AIM: ${this.state.selectedZone.toUpperCase()}`
        : `${fldRule} • SPOT: ${this.state.bowlPitchTarget.length.toUpperCase()} (${this.state.bowlPitchTarget.line.toUpperCase()})`,
      22,
      30
    );

    ctx.restore();
  }

  drawStumps3D(wx, wy, broken) {
    const ctx = this.ctx;
    const base = this.project(wx, wy, 0);
    const sc = base.scale * 1.85;
    [-6, 0, 6].forEach((ox, idx) => {
      const sp = this.project(wx + ox * 0.9, wy, 0);
      const tp = this.project(wx + ox * 0.9 + (broken ? (idx - 1) * 7 : 0), wy + (broken ? 6 : 0), broken ? 14 : 21);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = Math.max(2, 3.2 * sc);
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.stroke();

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = Math.max(1, 1.3 * sc);
      ctx.beginPath();
      ctx.moveTo(sp.x - 0.6, sp.y);
      ctx.lineTo(tp.x - 0.6, tp.y);
      ctx.stroke();
    });

    if (!broken) {
      const l = this.project(wx - 6, wy, 22);
      const r = this.project(wx + 6, wy, 22);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = Math.max(1.8, 2.5 * sc);
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
    } else {
      for (const b of this.bails) {
        const bp = this.project(b.wx, b.wy, b.wz);
        ctx.save();
        ctx.translate(bp.x, bp.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-4 * sc, -1.5 * sc, 8 * sc, 3 * sc);
        ctx.restore();
      }
    }
  }

  drawPlayer3D(wx, wy, opts = {}) {
    const ctx = this.ctx;
    const { kit = '#2563eb', cap = null, helmet = null, role = 'fielder', batAngle = 0, armAngle = 0, swing = 0, isLeftHand = false } = opts;
    const base = this.project(wx, wy, 0);
    const sc = base.scale * 1.85;

    ctx.save();
    ctx.translate(base.x, base.y);

    // 3D Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 9 * sc, 4.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // Articulated Legs + Batting Pads highlight
    const legOff = Math.sin(swing) * 4 * sc;
    ctx.strokeStyle = role === 'batsman' || role === 'nonstriker' ? '#f8fafc' : '#0f172a';
    ctx.lineWidth = Math.max(2, 3.2 * sc);
    ctx.beginPath();
    ctx.moveTo(-3 * sc, -9 * sc); ctx.lineTo(-3.5 * sc, 0 + legOff);
    ctx.moveTo(3 * sc, -9 * sc); ctx.lineTo(3.5 * sc, 0 - legOff);
    ctx.stroke();

    // 3D Jersey Torso Cylinder
    const grad = ctx.createLinearGradient(-7 * sc, -21 * sc, 7 * sc, -8 * sc);
    grad.addColorStop(0, kit);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.fillRect(-6.5 * sc, -21 * sc, 13 * sc, 13 * sc);
    ctx.strokeRect(-6.5 * sc, -21 * sc, 13 * sc, 13 * sc);

    if (role === 'bowler') {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = Math.max(1.8, 2.8 * sc);
      ctx.beginPath();
      ctx.moveTo(6 * sc, -18 * sc);
      ctx.lineTo(6 * sc + Math.cos(armAngle) * 12 * sc, -18 * sc - Math.sin(armAngle) * 12 * sc);
      ctx.stroke();
    }

    if (role === 'batsman' || role === 'nonstriker') {
      ctx.save();
      const handSign = isLeftHand ? -1 : 1;
      ctx.translate(handSign * 6 * sc, -14 * sc);
      ctx.rotate(handSign * (0.45 + batAngle));
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.fillRect(-2 * sc, 0, 4 * sc, 16 * sc);
      ctx.strokeRect(-2 * sc, 0, 4 * sc, 16 * sc);
      ctx.restore();
    }

    // 3D Helmet / Cap Head Sphere
    ctx.fillStyle = helmet || cap || '#f1f5f9';
    ctx.beginPath();
    ctx.arc(0, -25 * sc, 5.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    if (helmet) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -23 * sc, 3.8 * sc, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
