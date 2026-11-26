import * as THREE from '../vendor/three.module.js';
import { cricketAudio } from './cricketAudio.js';
import { WORLD, buildCricketStadium } from './stadium3d.js';
import {
  createStickCricketer,
  animateBatterRig,
  animateBowlerRig,
  animateFielderRig
} from './characters3d.js';

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

// Three.js XZ polar angles: +X = screen-right (Off Side for RHB), -X = screen-left (Leg Side for RHB), -Z = Bowler end
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

const PRESET_SLOTS = {
  Attacking: [
    { ang: -1.18, rFrac: 0.85, deep: true, label: 'Long Off' },
    { ang: -2.68, rFrac: 0.85, deep: true, label: 'Deep MW' },
    { ang: 1.38,  rFrac: 0.24, deep: false, label: 'Slip 1' },
    { ang: 1.18,  rFrac: 0.28, deep: false, label: 'Slip 2' },
    { ang: 0.82,  rFrac: 0.30, deep: false, label: 'Gully' },
    { ang: 0.16,  rFrac: 0.28, deep: false, label: 'Point' },
    { ang: -0.46, rFrac: 0.42, deep: false, label: 'Cover' },
    { ang: -2.02, rFrac: 0.42, deep: false, label: 'Mid On' },
    { ang: 2.38,  rFrac: 0.22, deep: false, label: 'Short Leg' }
  ],
  Balanced: [
    { ang: 2.94,  rFrac: 0.86, deep: true, label: 'D.Square' },
    { ang: -2.70, rFrac: 0.86, deep: true, label: 'D.MidWkt' },
    { ang: -1.96, rFrac: 0.86, deep: true, label: 'Long On' },
    { ang: -1.16, rFrac: 0.86, deep: true, label: 'Long Off' },
    { ang: 0.24,  rFrac: 0.84, deep: true, label: 'D.Point' },
    { ang: 2.08,  rFrac: 0.44, deep: false, label: 'S.Fine' },
    { ang: 1.12,  rFrac: 0.34, deep: false, label: 'Slip' },
    { ang: -0.46, rFrac: 0.45, deep: false, label: 'Cover' },
    { ang: -1.42, rFrac: 0.42, deep: false, label: 'Mid Off' }
  ],
  Defensive: [
    { ang: 2.12,  rFrac: 0.87, deep: true, label: 'D.Fine' },
    { ang: 2.94,  rFrac: 0.87, deep: true, label: 'D.Square' },
    { ang: -2.68, rFrac: 0.87, deep: true, label: 'D.MidWkt' },
    { ang: -1.96, rFrac: 0.87, deep: true, label: 'Long On' },
    { ang: -1.16, rFrac: 0.87, deep: true, label: 'Long Off' },
    { ang: 0.96,  rFrac: 0.48, deep: false, label: '3rd Man' },
    { ang: 0.16,  rFrac: 0.46, deep: false, label: 'Point' },
    { ang: -0.48, rFrac: 0.46, deep: false, label: 'Cover' },
    { ang: -1.72, rFrac: 0.44, deep: false, label: 'Mid On' }
  ]
};

export class CricketArcadeRenderer {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.state = {
      phase: 'batting',
      pitch: 'Balanced',
      fieldPreset: 'Balanced',
      isPowerplay: true,
      isLeftHand: false,
      selectedStance: 'In Line',
      selectedFootwork: 'Front Foot',
      selectedIntent: 'Stroke',
      selectedZone: null,
      allowZoneClick: false,
      currentBallHint: null,
      bowlPitchTarget: { line: 'Stumps', length: 'Good Length', wx: 0, wy: 2.0 },
      hud: null
    };

    this.anim = null;
    this.hitStopTimer = 0;
    this.cameraShake = 0;
    this.crowdExcitement = 0;
    this.camLook = new THREE.Vector3(0, 0.85, -3.5);
    this.camPos = new THREE.Vector3(0, 5.2, 22.8);
    this.trailPoints = [];
    this.particles = [];
    this.stumpPhysics = [];
    this.bailPhysics = [];
    this.stumpsDislodged = false;
    this.fielders = [];
    this.rafId = null;
    this.destroyed = false;

    this.mountHudOverlay();

    try {
      this.initThree();
    } catch (err) {
      console.warn('WebGL unavailable, using 2D fallback:', err.message);
      this.webglFailed = true;
      this.initFallback2D();
    }

    this.bindPointer();
    this.startLoop();
  }

  mountHudOverlay() {
    const parent = this.canvas?.parentElement;
    if (!parent) return;
    parent.style.position = 'relative';

    const existing = parent.querySelector('.tv-hud-overlay');
    if (existing) existing.remove();

    const hud = document.createElement('div');
    hud.className = 'tv-hud-overlay';
    hud.innerHTML = `
      <div class="tv-hud-top">
        <div class="tv-scorebug-pill">
          <span class="tv-badge-live">3D LIVE</span>
          <span class="tv-score-main" data-hud="score">--</span>
          <span class="tv-score-sep">•</span>
          <span class="tv-score-sub" data-hud="overs">-- ov</span>
          <span class="tv-score-target" data-hud="target"></span>
        </div>
        <div class="tv-rule-chip" data-hud="rule">POWERPLAY</div>
      </div>
      <div class="tv-callout-stage" data-hud="callout"></div>
      <div class="tv-flash-layer" data-hud="flash"></div>
    `;
    parent.appendChild(hud);
    this.hudEl = hud;
    this.calloutEl = hud.querySelector('[data-hud="callout"]');
    this.flashEl = hud.querySelector('[data-hud="flash"]');
    this.syncHudDom();
  }

  syncHudDom() {
    if (!this.hudEl) return;
    const s = this.state;
    const modeEl = this.hudEl.querySelector('.tv-badge-live');
    const scoreEl = this.hudEl.querySelector('[data-hud="score"]');
    const oversEl = this.hudEl.querySelector('[data-hud="overs"]');
    const targetEl = this.hudEl.querySelector('[data-hud="target"]');
    const ruleEl = this.hudEl.querySelector('[data-hud="rule"]');

    if (modeEl) modeEl.textContent = s.hud?.modeLabel || '3D LIVE';
    if (s.hud) {
      if (scoreEl) scoreEl.textContent = s.hud.score || 'Match Ready';
      if (oversEl) oversEl.textContent = s.hud.overs || '';
      if (targetEl) targetEl.textContent = s.hud.target ? `• ${s.hud.target}` : '';
    } else {
      if (scoreEl) scoreEl.textContent = s.phase === 'batting' ? 'BATTING' : 'BOWLING';
      if (oversEl) oversEl.textContent = s.isLeftHand ? 'LHB' : 'RHB';
      if (targetEl) targetEl.textContent = '';
    }

    if (ruleEl) {
      const ruleTxt = s.isPowerplay ? 'POWERPLAY (2 OUT)' : 'OPEN FIELD (5 OUT)';
      const extra = s.phase === 'batting'
        ? (s.selectedZone ? ` • AIM: ${String(s.selectedZone).toUpperCase()}` : '')
        : ` • ${String(s.bowlPitchTarget?.length || 'GOOD').toUpperCase()} (${String(s.bowlPitchTarget?.line || 'STUMPS').toUpperCase()})`;
      ruleEl.textContent = `${ruleTxt}${extra}`;
    }
  }

  showCallout(text, color = '#fbbf24', flashHex = null) {
    if (this.calloutEl) {
      const pop = document.createElement('div');
      pop.className = 'tv-callout-pop';
      pop.style.color = color;
      pop.textContent = text;
      this.calloutEl.innerHTML = '';
      this.calloutEl.appendChild(pop);
      setTimeout(() => {
        if (pop.parentElement === this.calloutEl) pop.remove();
      }, 1550);
    }
    if (flashHex && this.flashEl) {
      this.flashEl.style.background = flashHex;
      this.flashEl.classList.remove('active');
      void this.flashEl.offsetWidth;
      this.flashEl.classList.add('active');
    }
  }

  initThree() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(44, 960 / 560, 0.4, 340);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.resizeScene();
    this._ro = new ResizeObserver(() => this.resizeScene());
    if (this.canvas.parentElement) this._ro.observe(this.canvas.parentElement);

    // 1. 3D Stadium, Pitch, Stands, Crowd, Floodlights & Stumps
    this.stadium = buildCricketStadium(this.scene);

    // 2. Stylized 3D Characters (Batter, Non-Striker, Bowler, Keeper, 9 Fielders)
    this.batterRig = createStickCricketer({
      role: 'batsman',
      jerseyColor: 0x2563eb,
      hasHelmet: true,
      capColor: 0x0f172a,
      isLeftHand: this.state.isLeftHand
    });
    this.batterRig.root.position.set(-1.1, 0, WORLD.STRIKER_Z - 0.8);
    this.scene.add(this.batterRig.root);

    this.nonStrikerRig = createStickCricketer({
      role: 'nonstriker',
      jerseyColor: 0x2563eb,
      hasHelmet: true,
      capColor: 0x0f172a
    });
    this.nonStrikerRig.root.position.set(1.2, 0, WORLD.BOWLER_Z + 1.4);
    this.nonStrikerRig.root.rotation.y = Math.PI;
    this.scene.add(this.nonStrikerRig.root);

    this.bowlerRig = createStickCricketer({
      role: 'bowler',
      jerseyColor: 0xe11d48,
      hasHelmet: false,
      capColor: 0xbe123c
    });
    this.bowlerRig.root.position.set(-1.0, 0, WORLD.BOWLER_Z - 7.5);
    this.scene.add(this.bowlerRig.root);

    this.keeperRig = createStickCricketer({
      role: 'keeper',
      jerseyColor: 0xe11d48,
      hasHelmet: true,
      capColor: 0x9f1239
    });
    this.keeperRig.root.position.set(0, 0, WORLD.STRIKER_Z + 2.8);
    this.keeperRig.root.rotation.y = Math.PI;
    this.keeperRig.torso.rotation.x = 0.42;
    this.scene.add(this.keeperRig.root);

    for (let i = 0; i < 9; i++) {
      const fRig = createStickCricketer({
        role: 'fielder',
        jerseyColor: 0xe11d48,
        hasHelmet: false,
        capColor: 0xbe123c
      });
      this.scene.add(fRig.root);
      this.fielders.push({ rig: fRig, baseX: 0, baseZ: 0, wx: 0, wz: 0, diveT: 0 });
    }

    // 3. Glossy 3D Cricket Ball + Seam + Ground Drop Shadow + Dynamic Ribbon Trail
    this.ballGroup = new THREE.Group();
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.08 });
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), ballMat);
    this.ballMesh.castShadow = true;
    const seamMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.161, 0.02, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    this.ballMesh.add(seamMesh);
    this.ballGroup.add(this.ballMesh);
    this.ballGroup.visible = false;
    this.scene.add(this.ballGroup);

    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.48 })
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.visible = false;
    this.scene.add(this.ballShadow);

    // Dynamic 3D Trail Line/Ribbon using BufferGeometry
    this.maxTrail = 28;
    const trailPos = new Float32Array(this.maxTrail * 3);
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    this.trailGeo.setDrawRange(0, 0);
    this.trailMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.88 });
    this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);

    // 4. Pitch Length Cue, Bounce Target & Aiming Zone Wedge
    this.lengthBand = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.PITCH_W - 0.15, 4.2),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    );
    this.lengthBand.rotation.x = -Math.PI / 2;
    this.lengthBand.position.y = 0.048;
    this.lengthBand.visible = false;
    this.scene.add(this.lengthBand);

    this.bounceRing = new THREE.Group();
    const ringOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.46, 24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ringOuter.rotation.x = -Math.PI / 2;
    const ringDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, side: THREE.DoubleSide })
    );
    ringDot.rotation.x = -Math.PI / 2;
    this.bounceRing.add(ringOuter, ringDot);
    this.bounceRing.position.y = 0.055;
    this.bounceRing.visible = false;
    this.scene.add(this.bounceRing);

    this.aimWedge = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    this.aimWedge.visible = false;
    this.scene.add(this.aimWedge);

    // Shared Particle Pool (Dust + Fireworks + Confetti)
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    this.particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.06);

    this.syncFielders();
    this.applyKitColors();
  }

  resizeScene() {
    if (!this.renderer || !this.canvas) return;
    const parent = this.canvas.parentElement;
    const w = Math.max(320, parent ? parent.clientWidth : 960);
    const h = Math.max(230, Math.round(w * (560 / 960)));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  applyKitColors() {
    if (!this.batterRig) return;
    const isBatPhase = this.state.phase === 'batting';
    const batHex = isBatPhase ? 0x2563eb : 0xe11d48;
    const fldHex = isBatPhase ? 0xe11d48 : 0x2563eb;
    const batCap = isBatPhase ? 0x0f172a : 0x9f1239;
    const fldCap = isBatPhase ? 0xbe123c : 0x1d4ed8;
    this.batterRig.setColors({ jerseyHex: batHex, capHex: batCap, isLeft: this.state.isLeftHand });
    this.nonStrikerRig.setColors({ jerseyHex: batHex, capHex: batCap });
    this.bowlerRig.setColors({ jerseyHex: fldHex, capHex: fldCap });
    this.keeperRig.setColors({ jerseyHex: fldHex, capHex: batHex === 0x2563eb ? 0x9f1239 : 0x1d4ed8 });
    this.fielders.forEach(f => f.rig.setColors({ jerseyHex: fldHex, capHex: fldCap }));
  }

  updateConfig(cfg) {
    Object.assign(this.state, cfg);
    if (this.stadium) {
      this.stadium.setPitchAppearance(this.state.pitch);
      this.stadium.setPowerplay(Boolean(this.state.isPowerplay));
    }
    this.applyKitColors();
    this.syncFielders();
    this.syncVisualMarkers();
    this.syncHudDom();
  }

  syncFielders() {
    if (this.fielders.length === 0) return;
    const raw = PRESET_SLOTS[this.state.fieldPreset] || PRESET_SLOTS.Balanced;
    const maxDeep = this.state.isPowerplay ? 2 : 5;
    let deepCount = 0;

    raw.forEach((slot, idx) => {
      const f = this.fielders[idx];
      if (!f) return;
      const ang = this.state.isLeftHand ? Math.PI - slot.ang : slot.ang;
      let r = slot.rFrac * (WORLD.R_BOUNDARY - 1.5);
      if (slot.deep) {
        deepCount++;
        if (deepCount > maxDeep) r = WORLD.R_RING * 0.80;
      }
      let wx = Math.cos(ang) * r;
      let wz = Math.sin(ang) * r;
      if (Math.abs(wx) < 3.6 && Math.abs(wz) < 12.2) {
        wx += (wx >= 0 ? 1 : -1) * 4.2;
      }
      f.baseX = wx;
      f.baseZ = wz;
      if (!this.anim) {
        f.wx = wx;
        f.wz = wz;
        f.rig.root.position.set(wx, 0, wz);
        f.rig.root.lookAt(0, 0, WORLD.STRIKER_Z);
      }
    });
  }

  syncVisualMarkers() {
    if (!this.lengthBand || !this.bounceRing || !this.aimWedge) return;
    const isIdle = !this.anim;

    if (isIdle && this.state.phase === 'batting') {
      const hint = this.state.currentBallHint;
      if (hint?.length) {
        const lk = String(hint.length).toLowerCase();
        let zMid = 1.0, lenDepth = 4.5;
        if (lk.includes('yorker')) { zMid = WORLD.STRIKER_Z - 1.2; lenDepth = 2.6; }
        else if (lk.includes('full')) { zMid = WORLD.STRIKER_Z - 4.2; lenDepth = 3.8; }
        else if (lk.includes('short')) { zMid = -4.5; lenDepth = 4.2; }
        this.lengthBand.scale.set(1, lenDepth / 4.2, 1);
        this.lengthBand.position.set(0, 0.048, zMid);
        this.lengthBand.material.color.setHex(hint.fullReveal ? 0x38bdf8 : 0xfbbf24);
        this.lengthBand.visible = true;

        if (hint.fullReveal && hint.line) {
          const spot = this.deliveryToWorldPoint(hint);
          this.bounceRing.position.set(spot.wx, 0.056, spot.wz ?? spot.wy);
          this.bounceRing.visible = true;
        } else {
          this.bounceRing.visible = false;
        }
      } else {
        this.lengthBand.visible = false;
        this.bounceRing.visible = false;
      }

      if (this.state.selectedZone) {
        const ang = getZoneWorldAngle(this.state.selectedZone, this.state.isLeftHand);
        const dirX = Math.cos(ang), dirZ = Math.sin(ang);
        const dRope = this.distanceToBoundaryFromStriker(dirX, dirZ) * 0.85;
        const pts = new Float32Array([
          0, 0.06, WORLD.STRIKER_Z,
          Math.cos(ang - 0.32) * dRope, 0.06, WORLD.STRIKER_Z + Math.sin(ang - 0.32) * dRope,
          Math.cos(ang + 0.32) * dRope, 0.06, WORLD.STRIKER_Z + Math.sin(ang + 0.32) * dRope
        ]);
        this.aimWedge.geometry.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        this.aimWedge.geometry.computeVertexNormals();
        this.aimWedge.visible = true;
      } else {
        this.aimWedge.visible = false;
      }
    } else if (isIdle && this.state.phase === 'bowling') {
      this.lengthBand.visible = false;
      this.aimWedge.visible = false;
      const pt = this.state.bowlPitchTarget;
      this.bounceRing.position.set(pt.wx || 0, 0.056, pt.wz ?? pt.wy ?? 2.0);
      this.bounceRing.visible = true;
    } else {
      this.lengthBand.visible = false;
      this.bounceRing.visible = false;
      this.aimWedge.visible = false;
    }
  }

  deliveryToWorldPoint(deliv) {
    // Behind-WK view: +X is Off Side for RHB, -X is Leg Side for RHB
    const sign = this.state.isLeftHand ? -1 : 1;
    let wx = 0;
    if (deliv?.line === 'Off Side') wx = 0.95 * sign;
    else if (deliv?.line === 'Leg Side') wx = -0.95 * sign;
    else if (deliv?.line === 'Wide') wx = 1.9 * sign;

    let wz = 0.8;
    const len = String(deliv?.length || '');
    if (len === 'Yorker') wz = WORLD.STRIKER_Z - 0.9;
    else if (len === 'Full' || len === 'Full Toss') wz = 5.2;
    else if (len === 'Short') wz = -4.2;
    return { wx, wy: wz, wz };
  }

  distanceToBoundaryFromStriker(dirX, dirZ) {
    const b = 2 * WORLD.STRIKER_Z * dirZ;
    const c = WORLD.STRIKER_Z * WORLD.STRIKER_Z - WORLD.R_BOUNDARY * WORLD.R_BOUNDARY;
    const disc = Math.max(0, b * b - 4 * c);
    return (-b + Math.sqrt(disc)) / 2;
  }

  bindPointer() {
    this._raycaster = new THREE.Raycaster();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const onDown = (e) => {
      if (this.anim || this.webglFailed) return;
      cricketAudio.ensureContext();
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((cy - rect.top) / Math.max(1, rect.height)) * 2 + 1
      );

      this._raycaster.setFromCamera(ndc, this.camera);
      const hit = new THREE.Vector3();
      if (!this._raycaster.ray.intersectPlane(this._groundPlane, hit)) return;

      if (this.state.phase === 'batting') {
        if (!this.state.allowZoneClick) return;
        const ang = Math.atan2(hit.z - WORLD.STRIKER_Z, hit.x);
        const zone = angleToZone(ang, this.state.isLeftHand);
        this.state.selectedZone = zone;
        this.syncVisualMarkers();
        this.syncHudDom();
        cricketAudio.playUiTick();
        if (this.callbacks.onSelectZone) this.callbacks.onSelectZone(zone);
      } else {
        const clampedX = Math.max(-2.4, Math.min(2.4, hit.x));
        const clampedZ = Math.max(WORLD.BOWLER_Z + 2.0, Math.min(WORLD.STRIKER_Z - 0.3, hit.z));
        const orientedX = clampedX * (this.state.isLeftHand ? -1 : 1);
        let line = 'Stumps';
        if (orientedX > 1.45) line = 'Wide';
        else if (orientedX > 0.45) line = 'Off Side';
        else if (orientedX < -0.45) line = 'Leg Side';

        const zNorm = (clampedZ - WORLD.BOWLER_Z) / (WORLD.STRIKER_Z - WORLD.BOWLER_Z);
        let length = 'Good Length';
        if (zNorm > 0.82) length = 'Yorker';
        else if (zNorm > 0.62) length = 'Full';
        else if (zNorm < 0.36) length = 'Short';

        this.state.bowlPitchTarget = { wx: clampedX, wy: clampedZ, wz: clampedZ, line, length };
        this.syncVisualMarkers();
        this.syncHudDom();
        cricketAudio.playUiTick();
        if (this.callbacks.onSelectBowlSpot) this.callbacks.onSelectBowlSpot({ line, length });
      }
    };

    this._onDown = onDown;
    this.canvas.addEventListener('pointerdown', this._onDown);
  }

  spawnParticles({ x, y, z, count = 14, colors = [0xd9be8b], speed = 5.5, gravity = 14, firework = false }) {
    if (!this.particleGroup) return;
    for (let i = 0; i < count; i++) {
      const col = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      const vy = firework ? (6 + Math.random() * 11) : (2.5 + Math.random() * 4.5);
      mesh.scale.setScalar(firework ? 1.55 : 0.9);
      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vx: Math.cos(a) * spd,
        vy,
        vz: Math.sin(a) * spd,
        gravity,
        spinX: (Math.random() - 0.5) * 14,
        spinY: (Math.random() - 0.5) * 14,
        life: 0,
        maxLife: firework ? (1.2 + Math.random() * 0.7) : (0.45 + Math.random() * 0.25)
      });
    }
  }

  resetStrikerStumps() {
    this.stumpsDislodged = false;
    this.stumpPhysics = [];
    this.bailPhysics = [];
    if (!this.stadium?.strikerWickets) return;
    const xs = [-0.18, 0, 0.18];
    this.stadium.strikerWickets.stumps.forEach((s, i) => {
      s.position.set(xs[i], 0, 0);
      s.rotation.set(0, 0, 0);
    });
    const bxs = [-0.09, 0.09];
    this.stadium.strikerWickets.bails.forEach((b, i) => {
      b.position.set(bxs[i], WORLD.STUMP_H + 0.02, 0);
      b.rotation.set(0, 0, 0);
    });
  }

  dislodgeStumps() {
    if (!this.stadium?.strikerWickets) return;
    this.stumpsDislodged = true;
    const { stumps, bails } = this.stadium.strikerWickets;
    this.stumpPhysics = stumps.map((mesh, idx) => ({
      mesh,
      vx: (idx - 1) * (2.6 + Math.random() * 2.0),
      vy: 3.4 + Math.random() * 2.5,
      vz: 4.5 + Math.random() * 3.8,
      rx: 6 + Math.random() * 7,
      rz: (idx - 1) * (5 + Math.random() * 5)
    }));
    this.bailPhysics = bails.map((mesh, idx) => ({
      mesh,
      vx: (idx === 0 ? -1 : 1) * (3.2 + Math.random() * 2.4),
      vy: 6.2 + Math.random() * 3.0,
      vz: 5.5 + Math.random() * 3.2,
      rx: 12 + Math.random() * 8,
      rz: 10 + Math.random() * 8
    }));
    this.spawnParticles({ x: 0, y: 0.6, z: WORLD.STRIKER_Z, count: 20, colors: [0xfbbf24, 0xf43f5e, 0xf8fafc], speed: 6 });
    cricketAudio.playStumpsRattle();
  }

  playBallAnimation(ballResult, options = {}) {
    if (this.webglFailed) {
      const lb = ballResult || {};
      this.showCallout(lb.wicket ? 'OUT!' : lb.runs === 6 ? 'SIX!' : lb.runs === 4 ? 'FOUR!' : `${lb.runs || 0} RUNS`);
      return;
    }

    const lb = ballResult || {};
    const deliv = lb.delivery || { line: 'Stumps', length: 'Good Length', speed: 'Fast' };
    const bouncePt = this.deliveryToWorldPoint(deliv);
    const zone = lb.actualZone || options.zone || lb.zone || this.state.selectedZone || 'Cover';
    const shotAng = getZoneWorldAngle(zone, this.state.isLeftHand);
    const dirX = Math.cos(shotAng);
    const dirZ = Math.sin(shotAng);
    const distRope = this.distanceToBoundaryFromStriker(dirX, dirZ);

    const detail = lb.dismissalDetail || '';
    const dType = String(lb.dismissalType || '').toLowerCase();
    const isNoBall = lb.extraType === 'no_ball';
    const isWide = lb.extraType === 'wide' || (!isNoBall && lb.rebowl);
    const isLeave = lb.footwork === 'Leave' || lb.intent === 'Leave' || String(lb.shotName || '').toLowerCase().includes('leave');
    const lowerComm = String(lb.commentary || '').toLowerCase();

    const isStumped = dType === 'stumped' || detail === 'stumped';
    const isBowled = dType === 'bowled' || detail === 'bowled';
    const isLbw = dType === 'lbw' || detail === 'lbw';
    const isFreeHitBowled = detail === 'free_hit_bowled';
    const isStumpsBroken = isBowled || isStumped || isFreeHitBowled ||
      (lb.wicket && !isLbw && (lowerComm.includes('bowled') || lowerComm.includes('stumps') || lowerComm.includes('timber') || lowerComm.includes('stumped')));
    const isKeeperTake = isWide || detail === 'keeper' ||
      (lb.wicket && !isStumpsBroken && !isLbw && (lowerComm.includes('keeper') || lowerComm.includes('caught behind')));
    const isBlockDrop = detail === 'block';
    const isDeepCatch = Boolean(lb.wicket && (detail === 'deep' || lowerComm.includes('deep') || lowerComm.includes('boundary')));
    const isRingHitOrCatch = (lb.wicket && !isStumpsBroken && !isLbw && !isKeeperTake && !isDeepCatch) || (!lb.wicket && lb.runs === 0 && detail === 'ring');
    const batRuns = isNoBall ? Math.max(0, (lb.runs || 0) - 1) : (lb.runs || 0);

    this.resetStrikerStumps();
    this.trailPoints = [];
    this.trailGeo.setDrawRange(0, 0);
    this.syncFielders();
    this.fielders.forEach(f => { f.diveT = 0; });
    if (this.keeperRig) {
      // Keeper stands right up to stumps for Spin/Stumped, further back for pace
      const isSlow = String(deliv.speed || '').toLowerCase() === 'slow';
      this.keeperRig.root.position.set(0, 0, WORLD.STRIKER_Z + ((isSlow || isStumped) ? 1.35 : 3.2));
    }

    const speedMul = deliv.speed === 'Fast' ? 1.22 : deliv.speed === 'Slow' ? 0.72 : 0.96;

    let landDist = 0;
    let peakY = 1.6;
    let endY = 0.18;
    let outcomeMode = 'shot'; // 'shot' | 'stumps' | 'lbw' | 'keeper' | 'block' | 'catch_ring' | 'catch_deep'

    if (isStumpsBroken) {
      outcomeMode = 'stumps';
      landDist = 0;
      peakY = 0.6;
    } else if (isLbw) {
      outcomeMode = 'lbw';
      landDist = 0;
      peakY = 0.55;
    } else if (isKeeperTake) {
      outcomeMode = 'keeper';
      landDist = 0;
      peakY = 1.1;
    } else if (isBlockDrop) {
      outcomeMode = 'block';
      landDist = 1.9;
      peakY = 0.45;
    } else if (isDeepCatch) {
      outcomeMode = 'catch_deep';
      landDist = distRope * 0.88;
      peakY = 12.5;
      endY = 1.25;
    } else if (isRingHitOrCatch) {
      outcomeMode = lb.wicket ? 'catch_ring' : 'shot';
      landDist = distRope * 0.34;
      peakY = lb.wicket ? 6.2 : 0.95;
      endY = lb.wicket ? 1.25 : 0.18;
    } else if (batRuns >= 6) {
      landDist = distRope + 14;
      peakY = 17.5;
      endY = 4.5;
    } else if (batRuns >= 4) {
      landDist = distRope + 1.8;
      peakY = 3.2;
      endY = 0.2;
    } else if (batRuns === 3) {
      landDist = distRope * 0.86;
      peakY = 4.6;
    } else if (batRuns === 2) {
      landDist = distRope * 0.65;
      peakY = 3.9;
    } else if (batRuns === 1) {
      landDist = distRope * 0.44;
      peakY = 2.4;
    } else {
      outcomeMode = 'block';
      landDist = 2.6;
      peakY = 0.6;
    }

    const endX = dirX * landDist;
    const endZ = WORLD.STRIKER_Z + dirZ * landDist;

    this.anim = {
      t: 0,
      stage: 'runup',
      runupDur: 0.48 / speedMul,
      delivDur: 0.54 / speedMul,
      outDur: (batRuns >= 4 || lb.wicket || batRuns >= 1) ? 1.50 : 0.78,
      bouncePt,
      zone,
      endX,
      endZ,
      peakY,
      endY,
      batRuns,
      outcomeMode,
      isWide,
      isNoBall,
      isLeave,
      isStumped,
      isBowled,
      isLbw,
      isFreeHitBowled,
      isStumpsBroken,
      isKeeperTake,
      shotIntent: lb.intent || 'Stroke',
      shotFootwork: lb.footwork || 'Front Foot',
      shotStance: lb.stance || 'In Line',
      bouncedPlayed: false,
      outcomeTriggered: false,
      lb,
      ball: new THREE.Vector3(-0.35, 1.8, WORLD.BOWLER_Z - 7.5),
      runCrossings: (lb.wicket || isWide) ? 0 : (batRuns === 4 || batRuns === 6 ? 0 : Math.min(3, batRuns || 0))
    };

    this.ballGroup.visible = false;
    this.ballShadow.visible = false;
    this.syncVisualMarkers();
    cricketAudio.playDeliveryWhoosh();
  }

  startLoop() {
    let last = performance.now();
    const tick = (now) => {
      if (this.destroyed) return;
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (!this.webglFailed) {
        this.update(dt, now * 0.001);
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  pushTrailPoint(pos, colorHex) {
    this.trailMat.color.setHex(colorHex);
    this.trailPoints.push(pos.clone());
    if (this.trailPoints.length > this.maxTrail) this.trailPoints.shift();
    const arr = this.trailGeo.attributes.position.array;
    for (let i = 0; i < this.trailPoints.length; i++) {
      arr[i * 3] = this.trailPoints[i].x;
      arr[i * 3 + 1] = this.trailPoints[i].y;
      arr[i * 3 + 2] = this.trailPoints[i].z;
    }
    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.setDrawRange(0, this.trailPoints.length);
  }

  update(dt, timeSec) {
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8);
    if (this.crowdExcitement > 0) this.crowdExcitement = Math.max(0, this.crowdExcitement - dt * 0.35);

    this.stadium.updateCrowd(timeSec, this.crowdExcitement);

    // Update Bounce Marker pulse
    if (this.bounceRing.visible) {
      const s = 1 + Math.sin(timeSec * 6) * 0.14;
      this.bounceRing.scale.set(s, 1, s);
    }

    // Update Particles (clay dust + 6s firework confetti)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.vy -= p.gravity * dt;
      p.mesh.rotation.x += p.spinX * dt;
      p.mesh.rotation.y += p.spinY * dt;
    }

    // Update Stump & Bail Rigid-Body Physics when bowled/broken
    if (this.stumpsDislodged) {
      [...this.stumpPhysics, ...this.bailPhysics].forEach((b) => {
        b.mesh.position.x += b.vx * dt;
        b.mesh.position.y += b.vy * dt;
        b.mesh.position.z += b.vz * dt;
        b.vy -= 18 * dt;
        b.mesh.rotation.x += b.rx * dt;
        b.mesh.rotation.z += b.rz * dt;
        if (b.mesh.position.y < 0.08) {
          b.mesh.position.y = 0.08;
          b.vy *= -0.35;
          b.vx *= 0.62;
          b.vz *= 0.62;
          b.rx *= 0.5;
          b.rz *= 0.5;
        }
      });
    }

    // Position Striker according to Left/Right hand stance
    const stanceSign = this.state.isLeftHand ? 1 : -1;
    let guardX = 1.05 * stanceSign;
    if (this.state.selectedStance === 'Off Side') guardX -= 0.28 * stanceSign;
    if (this.state.selectedStance === 'Leg Side') guardX += 0.28 * stanceSign;

    // Hit-stop freeze impact on crisp boundaries / timber strikes!
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      this.updateCamera(dt, timeSec, null);
      return;
    }

    if (!this.anim) {
      // Smoothly jog fielders back to base spots & play idle animations
      this.batterRig.root.position.set(guardX, 0, WORLD.STRIKER_Z - 0.8);
      animateBatterRig(this.batterRig, {
        isLeftHand: this.state.isLeftHand,
        stage: 'idle',
        timeSec
      });
      this.nonStrikerRig.root.position.set(1.2, 0, WORLD.BOWLER_Z + 1.4);
      animateBatterRig(this.nonStrikerRig, { isLeftHand: false, stage: 'idle', timeSec: timeSec + 1.1 });

      this.bowlerRig.root.position.set(-1.0, 0, WORLD.BOWLER_Z - 7.5);
      animateBowlerRig(this.bowlerRig, { stage: 'idle', timeSec });

      this.fielders.forEach((f, idx) => {
        const dx = f.baseX - f.wx;
        const dz = f.baseZ - f.wz;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
          const step = Math.min(dist, 9.5 * dt);
          f.wx += (dx / dist) * step;
          f.wz += (dz / dist) * step;
          f.rig.root.position.set(f.wx, 0, f.wz);
          animateFielderRig(f.rig, { moving: true, moveAngle: Math.atan2(dx, dz), timeSec, seed: idx });
        } else {
          f.rig.root.lookAt(0, 0, WORLD.STRIKER_Z);
          animateFielderRig(f.rig, { moving: false, timeSec, seed: idx });
        }
      });

      this.updateCamera(dt, timeSec, null);
      return;
    }

    const a = this.anim;
    a.t += dt;

    if (a.stage === 'runup') {
      const p = Math.min(1, a.t / a.runupDur);
      const bowlZ = (WORLD.BOWLER_Z - 7.5) + p * 7.5;
      this.bowlerRig.root.position.set(-0.9, 0, bowlZ);
      animateBowlerRig(this.bowlerRig, { stage: 'runup', progress: p, timeSec });
      animateBatterRig(this.batterRig, { isLeftHand: this.state.isLeftHand, stage: 'runup', progress: p, timeSec });

      if (p >= 1) {
        a.stage = 'delivery';
        a.t = 0;
        this.trailPoints = [];
        this.ballGroup.visible = true;
        this.ballShadow.visible = true;
      }
      this.updateCamera(dt, timeSec, new THREE.Vector3(0, 1.0, bowlZ * 0.4));
    } else if (a.stage === 'delivery') {
      const p = Math.min(1, a.t / a.delivDur);
      animateBowlerRig(this.bowlerRig, { stage: 'delivery', progress: p, timeSec });
      animateBatterRig(this.batterRig, {
        isLeftHand: this.state.isLeftHand,
        stage: 'delivery',
        progress: p,
        timeSec
      });

      const bounceP = 0.62;
      if (p <= bounceP) {
        const sub = p / bounceP;
        a.ball.x = -0.35 * (1 - sub) + a.bouncePt.wx * sub;
        a.ball.z = WORLD.BOWLER_Z + (a.bouncePt.wz - WORLD.BOWLER_Z) * sub;
        a.ball.y = 2.0 * (1 - sub * sub) + 0.16;
      } else {
        if (!a.bouncedPlayed) {
          a.bouncedPlayed = true;
          cricketAudio.playPitchBounce();
          this.spawnParticles({ x: a.bouncePt.wx, y: 0.12, z: a.bouncePt.wz, count: 12, colors: [0xd9be8b, 0xf8fafc], speed: 4.0 });
        }
        const sub = (p - bounceP) / (1 - bounceP);
        a.ball.x = a.bouncePt.wx * (1 - sub * 0.72);
        a.ball.z = a.bouncePt.wz + (WORLD.STRIKER_Z - a.bouncePt.wz) * sub;
        const apex = a.lb.delivery?.length === 'Short' ? 2.15 : a.lb.delivery?.speed === 'Slow' ? 1.65 : 1.05;
        a.ball.y = Math.sin(sub * Math.PI * 0.78) * apex + 0.35;
      }

      this.syncBallTransform(a.ball, 0x38bdf8, dt);
      this.updateCamera(dt, timeSec, new THREE.Vector3(a.ball.x * 0.35, 1.1, a.ball.z * 0.35));

      if (p >= 1) {
        a.stage = 'outcome';
        a.t = 0;
        if (!a.outcomeTriggered) {
          a.outcomeTriggered = true;
          this.triggerShotImpactOutcome(a);
        }
      }
    } else if (a.stage === 'outcome') {
      const p = Math.min(1, a.t / a.outDur);
      const easeOut = 1 - Math.pow(1 - p, 2.0);
      const lb = a.lb;

      // Animate Batter Follow-through OR Running Between Wickets
      let strikerZ = WORLD.STRIKER_Z - 0.8;
      let nonZ = WORLD.BOWLER_Z + 1.4;
      if (a.runCrossings > 0) {
        const trip = (p * a.runCrossings) % 2;
        const prog = trip <= 1 ? trip : 2 - trip;
        strikerZ = (WORLD.STRIKER_Z - 0.8) - prog * (WORLD.STRIKER_Z - WORLD.BOWLER_Z - 2.2);
        nonZ = (WORLD.BOWLER_Z + 1.4) + prog * (WORLD.STRIKER_Z - WORLD.BOWLER_Z - 2.2);
      }
      this.batterRig.root.position.set(guardX, 0, strikerZ);
      this.nonStrikerRig.root.position.set(1.2, 0, nonZ);

      animateBatterRig(this.batterRig, {
        isLeftHand: this.state.isLeftHand,
        intent: a.shotIntent || this.state.selectedIntent,
        zone: a.zone,
        isLeave: a.isLeave,
        stage: 'outcome',
        progress: p,
        runCrossings: a.runCrossings,
        timeSec
      });
      if (a.runCrossings > 0) {
        animateBatterRig(this.nonStrikerRig, { stage: 'outcome', runCrossings: a.runCrossings, timeSec });
      }

      if (a.outcomeMode === 'stumps') {
        a.ball.set(0, 0.42, WORLD.STRIKER_Z + Math.min(2.4, p * 3.0));
        this.syncBallTransform(a.ball, 0xf43f5e, dt);
        this.updateCamera(dt, timeSec, null);
      } else if (a.outcomeMode === 'lbw') {
        a.ball.set(guardX * 0.35, Math.max(0.18, 0.48 * (1 - p * 0.6)), WORLD.STRIKER_Z - 0.55);
        this.syncBallTransform(a.ball, 0xf43f5e, dt);
        this.updateCamera(dt, timeSec, null);
      } else if (a.outcomeMode === 'keeper') {
        const keeperZ = this.keeperRig ? this.keeperRig.root.position.z : (WORLD.STRIKER_Z + 2.6);
        const sideX = a.lb.wicket ? (this.state.isLeftHand ? -0.45 : 0.45) : (a.bouncePt.wx * 0.9);
        a.ball.set(sideX, 1.05, WORLD.STRIKER_Z + Math.min(keeperZ - WORLD.STRIKER_Z, p * 4.5));
        this.syncBallTransform(a.ball, a.isWide ? 0xfbbf24 : 0x94a3b8, dt);
        this.updateCamera(dt, timeSec, null);
      } else {
        a.ball.x = a.endX * easeOut;
        a.ball.z = WORLD.STRIKER_Z + (a.endZ - WORLD.STRIKER_Z) * easeOut;
        a.ball.y = Math.max(0.16, Math.sin(p * Math.PI) * a.peakY + a.endY * p);

        const tColor = a.batRuns >= 6 ? 0xf59e0b : a.batRuns >= 4 ? 0x10b981 : 0xf8fafc;
        this.syncBallTransform(a.ball, tColor, dt);

        // Closest Fielder Chases & Dives/Catches the Ball!
        if (p > 0.08 && this.fielders.length > 0 && a.outcomeMode !== 'block') {
          let nearest = null;
          let bestD = Infinity;
          for (const f of this.fielders) {
            const d = Math.hypot(f.baseX - a.endX, f.baseZ - a.endZ);
            if (d < bestD) { bestD = d; nearest = f; }
          }
          if (nearest) {
            const mag = Math.hypot(a.endX, a.endZ) || 1;
            const cap = Math.min(mag, WORLD.R_BOUNDARY - 1.2);
            const tx = (a.endX / mag) * cap;
            const tz = (a.endZ / mag) * cap;
            const dx = tx - nearest.wx;
            const dz = tz - nearest.wz;
            const dist = Math.hypot(dx, dz);
            const ang = Math.atan2(dx, dz);
            if (dist > 0.25) {
              const step = Math.min(dist, 15.5 * dt);
              nearest.wx += (dx / dist) * step;
              nearest.wz += (dz / dist) * step;
              nearest.rig.root.position.set(nearest.wx, 0, nearest.wz);
              const isDiving = dist < 3.4 && (a.batRuns === 4 || lb.wicket) && p > 0.52;
              if (isDiving) nearest.diveT = Math.min(1, nearest.diveT + dt * 2.4);
              animateFielderRig(nearest.rig, {
                moving: !isDiving,
                diveProgress: nearest.diveT,
                moveAngle: ang,
                timeSec,
                seed: 3
              });
            }
          }
        }

        this.updateCamera(dt, timeSec, a.outcomeMode === 'block' ? null : a.ball);
      }

      if (p >= 1) {
        this.anim = null;
        this.ballGroup.visible = false;
        this.ballShadow.visible = false;
        this.syncVisualMarkers();
      }
    }
  }

  syncBallTransform(pos, trailHex, dt) {
    this.ballGroup.position.copy(pos);
    this.ballMesh.rotation.x -= dt * 22;
    this.ballMesh.rotation.z += dt * 8;

    this.ballShadow.position.set(pos.x, 0.04, pos.z);
    const sc = Math.max(0.35, 1.0 - pos.y * 0.04);
    this.ballShadow.scale.set(sc, sc, 1);
    this.ballShadow.material.opacity = Math.max(0.16, 0.48 - pos.y * 0.025);

    this.pushTrailPoint(pos, trailHex);
  }

  triggerShotImpactOutcome(a) {
    const lb = a.lb;

    if (lb.wicket) {
      this.hitStopTimer = 0.065;
      this.cameraShake = 0.42;
      this.crowdExcitement = 1.0;
      if (a.isStumpsBroken) {
        this.dislodgeStumps();
      } else {
        cricketAudio.playBatCrack(lb.timing || 'Slightly Late');
      }
      cricketAudio.playCrowdCheer(1.3);
      const callout = a.isStumped ? 'STUMPED! 💥'
        : a.isBowled ? 'BOWLED! 💥'
        : a.isLbw ? 'LBW! OUT! 💥'
        : a.isKeeperTake ? 'CAUGHT BEHIND! 💥'
        : a.outcomeMode === 'catch_deep' ? 'CAUGHT DEEP! 💥'
        : 'CAUGHT! 💥';
      this.showCallout(callout, '#fb7185', 'rgba(244,63,94,0.34)');
    } else if (a.isWide) {
      this.showCallout('WIDE (+1)', '#fbbf24');
    } else if (a.isNoBall) {
      if (a.isFreeHitBowled) this.dislodgeStumps();
      else if (!a.isLeave && a.batRuns > 0) cricketAudio.playBatCrack(lb.timing || 'Perfect');
      if (a.batRuns >= 6) {
        this.hitStopTimer = 0.07;
        this.cameraShake = 0.48;
        this.crowdExcitement = 1.0;
        cricketAudio.playCrowdCheer(1.8);
        cricketAudio.playFireworkBurst();
        this.showCallout('NO BALL + SIX! 🔥', '#fbbf24', 'rgba(245,158,11,0.32)');
        const fireworkPalette = [0xfbbf24, 0x38bdf8, 0xf43f5e, 0x10b981, 0xa855f7, 0xffffff];
        [[-22, 12, -32], [22, 14, -32]].forEach(([fx, fy, fz]) => {
          this.spawnParticles({ x: fx, y: fy, z: fz, count: 28, colors: fireworkPalette, speed: 9.5, gravity: 7.5, firework: true });
        });
      } else if (a.batRuns >= 4) {
        this.hitStopTimer = 0.05;
        this.cameraShake = 0.28;
        this.crowdExcitement = 0.85;
        cricketAudio.playCrowdCheer(1.35);
        this.showCallout('NO BALL + FOUR! ⚡', '#34d399', 'rgba(16,185,129,0.24)');
      } else {
        this.showCallout('NO BALL • FREE HIT!', '#fbbf24', 'rgba(245,158,11,0.18)');
      }
    } else if (a.isFreeHitBowled) {
      this.dislodgeStumps();
      this.showCallout('FREE HIT! NOT OUT', '#fbbf24');
    } else if (a.isLeave) {
      this.showCallout('WELL LEFT', '#cbd5e1');
    } else if (a.isKeeperTake) {
      this.showCallout('BEATEN! •', '#94a3b8');
    } else {
      cricketAudio.playBatCrack(lb.timing || 'Perfect');
      this.spawnParticles({ x: 0, y: 0.9, z: WORLD.STRIKER_Z - 0.6, count: 10, colors: [0xfde047, 0x38bdf8], speed: 4.5 });

      if (a.batRuns === 6) {
        this.hitStopTimer = 0.07;
        this.cameraShake = 0.48;
        this.crowdExcitement = 1.0;
        cricketAudio.playCrowdCheer(1.8);
        cricketAudio.playFireworkBurst();
        this.showCallout('MAXIMUM SIX! 🔥', '#fbbf24', 'rgba(245,158,11,0.32)');
        const fireworkPalette = [0xfbbf24, 0x38bdf8, 0xf43f5e, 0x10b981, 0xa855f7, 0xffffff];
        [[-22, 12, -32], [22, 14, -32], [a.endX * 0.55, 10, a.endZ * 0.55]].forEach(([fx, fy, fz]) => {
          this.spawnParticles({ x: fx, y: fy, z: fz, count: 32, colors: fireworkPalette, speed: 9.5, gravity: 7.5, firework: true });
        });
      } else if (a.batRuns === 4) {
        this.hitStopTimer = 0.05;
        this.cameraShake = 0.28;
        this.crowdExcitement = 0.85;
        cricketAudio.playCrowdCheer(1.35);
        this.showCallout('FOUR! ⚡', '#34d399', 'rgba(16,185,129,0.24)');
      } else if (a.batRuns > 0) {
        this.showCallout(`${a.batRuns} RUN${a.batRuns > 1 ? 'S' : ''}!`, '#38bdf8');
      } else {
        this.showCallout(a.outcomeMode === 'block' ? 'SOLID BLOCK •' : 'FIELDED! •', '#e2e8f0');
      }
    }
  }

  updateCamera(dt, timeSec, followPos) {
    let targetCamPos = new THREE.Vector3(0, 5.2, 22.8);
    let targetLook = new THREE.Vector3(0, 0.85, -3.5);

    if (followPos) {
      targetCamPos.set(
        Math.max(-14, Math.min(14, followPos.x * 0.32)),
        5.2 + Math.max(0, followPos.y * 0.25),
        22.8 + Math.max(-5, Math.min(5, followPos.z * 0.08))
      );
      targetLook.set(followPos.x * 0.58, Math.max(0.6, followPos.y * 0.45), followPos.z * 0.65);
    }

    this.camPos.lerp(targetCamPos, Math.min(1, dt * 4.5));
    this.camLook.lerp(targetLook, Math.min(1, dt * 5.2));

    const sx = this.cameraShake > 0 ? Math.sin(timeSec * 55) * this.cameraShake : 0;
    const sy = this.cameraShake > 0 ? Math.cos(timeSec * 62) * this.cameraShake * 0.7 : 0;

    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.camera.lookAt(this.camLook);
  }

  initFallback2D() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    this.canvas.width = 960;
    this.canvas.height = 560;
    ctx.fillStyle = '#0b2f1d';
    ctx.fillRect(0, 0, 960, 560);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('3D Stadium Active — Use 2D Radar & Controls Below', 480, 280);
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._ro) this._ro.disconnect();
    if (this._onDown && this.canvas) this.canvas.removeEventListener('pointerdown', this._onDown);
    if (this.hudEl) this.hudEl.remove();
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    if (this.renderer) this.renderer.dispose();
  }
}
