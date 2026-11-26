import * as THREE from '../vendor/three.module.js';

export const WORLD = {
  R_BOUNDARY: 56,
  R_RING: 30,
  R_STADIUM_INNER: 63,
  R_STADIUM_OUTER: 82,
  PITCH_LEN: 22.5,
  PITCH_W: 3.1,
  STRIKER_Z: 10.2,
  BOWLER_Z: -10.2,
  STUMP_H: 0.78
};

function makeOutfieldTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const cx = 512, cy = 512;

  ctx.fillStyle = '#0f3d21';
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric circular & radial mowed grass rings for classic Stick Cricket look
  const rings = 11;
  for (let i = rings; i >= 1; i--) {
    const r = (i / rings) * 510;
    ctx.fillStyle = i % 2 === 0 ? '#167a3c' : '#1b8c47';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle vertical lawnmower stripes clipped inside circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 508, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.08;
  for (let x = 0; x < 1024; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x, 0, 16, 1024);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePitchTexture(pitchType = 'Balanced') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1024;
  const ctx = c.getContext('2d');

  const lower = String(pitchType || '').toLowerCase();
  const baseCol = lower.includes('green') ? '#9db077' : lower.includes('dusty') ? '#cfa366' : '#d8bc86';
  const altCol = lower.includes('green') ? '#8fa368' : lower.includes('dusty') ? '#bd8f52' : '#c9aa70';

  ctx.fillStyle = baseCol;
  ctx.fillRect(0, 0, 256, 1024);

  // Fine granular wear patches around good-length landing zones
  for (let i = 0; i < 480; i++) {
    ctx.fillStyle = i % 3 === 0 ? altCol : 'rgba(90, 62, 32, 0.14)';
    const x = 16 + Math.random() * 224;
    const y = Math.random() * 1024;
    ctx.fillRect(x, y, 2 + Math.random() * 5, 3 + Math.random() * 10);
  }

  // Rough footmark scuff near batting/bowling popping creases
  ctx.fillStyle = 'rgba(72, 48, 22, 0.22)';
  ctx.beginPath(); ctx.ellipse(90, 240, 18, 42, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(166, 780, 18, 42, -0.1, 0, Math.PI * 2); ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHoardingTexture(text, bg, accent, fg = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 16, 96);
  ctx.fillRect(496, 0, 16, 96);
  ctx.fillRect(0, 82, 512, 14);
  ctx.fillStyle = fg;
  ctx.font = 'bold 38px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSkyDome() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#020617');
  g.addColorStop(0.45, '#091836');
  g.addColorStop(0.75, '#132a4f');
  g.addColorStop(0.95, '#1e3a5f');
  g.addColorStop(1.0, '#0b192e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.SphereGeometry(240, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
  );
}

function createFloodlightTower(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.lookAt(0, 6, 0);

  const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.55, roughness: 0.4 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.35, 34, 8), mastMat);
  mast.position.y = 17;
  g.add(mast);

  // Angled head frame
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 4.4, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  head.position.set(0, 34.5, 0.5);
  head.rotation.x = 0.34;
  g.add(head);

  // Glowing bulb panels
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  for (let row = -1; row <= 1; row += 2) {
    for (let col = -2; col <= 2; col++) {
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.3), bulbMat);
      bulb.position.set(col * 1.9, 34.5 + row * 1.0, 1.05);
      bulb.rotation.x = 0.34;
      g.add(bulb);
    }
  }

  // Soft volumetric glow halo
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const rad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  rad.addColorStop(0, 'rgba(224,242,254,0.85)');
  rad.addColorStop(0.35, 'rgba(56,189,248,0.28)');
  rad.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 128, 128);
  const spriteMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, 34.5, 1.6);
  sprite.scale.set(28, 22, 1);
  g.add(sprite);

  return g;
}

function createWicketSet() {
  const group = new THREE.Group();
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42, metalness: 0.1 });
  const zingMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const bailMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 });

  const stumps = [];
  [-0.18, 0, 0.18].forEach((ox) => {
    const sg = new THREE.Group();
    sg.position.set(ox, 0, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, WORLD.STUMP_H, 10), stumpMat);
    pole.position.y = WORLD.STUMP_H / 2;
    pole.castShadow = true;
    sg.add(pole);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.07, 10), zingMat);
    cap.position.y = WORLD.STUMP_H - 0.02;
    sg.add(cap);

    group.add(sg);
    stumps.push(sg);
  });

  const bails = [];
  [-0.09, 0.09].forEach((bx) => {
    const bg = new THREE.Group();
    bg.position.set(bx, WORLD.STUMP_H + 0.02, 0);
    const bailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.15, 8), bailMat);
    bailMesh.rotation.z = Math.PI / 2;
    bg.add(bailMesh);
    group.add(bg);
    bails.push(bg);
  });

  return { group, stumps, bails };
}

export function buildCricketStadium(scene) {
  scene.fog = new THREE.FogExp2(0x071226, 0.0028);
  scene.add(makeSkyDome());

  // Lighting setup for vibrant stylized arcade clarity
  const hemi = new THREE.HemisphereLight(0xcbe8ff, 0x12381f, 0.95);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
  keyLight.position.set(34, 58, 28);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 10;
  keyLight.shadow.camera.far = 160;
  keyLight.shadow.camera.left = -48;
  keyLight.shadow.camera.right = 48;
  keyLight.shadow.camera.top = 48;
  keyLight.shadow.camera.bottom = -48;
  keyLight.shadow.bias = -0.0008;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
  fillLight.position.set(-42, 32, -36);
  scene.add(fillLight);

  // Outer Stadium Concourse Apron
  const apron = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.R_STADIUM_OUTER + 18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1628, roughness: 0.9 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.06;
  scene.add(apron);

  // Track Ring outside Boundary
  const track = new THREE.Mesh(
    new THREE.RingGeometry(WORLD.R_BOUNDARY, WORLD.R_STADIUM_INNER, 64),
    new THREE.MeshStandardMaterial({ color: 0x163829, roughness: 0.85 })
  );
  track.rotation.x = -Math.PI / 2;
  track.position.y = -0.02;
  scene.add(track);

  // Lush Mowed Grass Outfield
  const outfield = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.R_BOUNDARY, 64),
    new THREE.MeshStandardMaterial({ map: makeOutfieldTexture(), roughness: 0.88 })
  );
  outfield.rotation.x = -Math.PI / 2;
  outfield.receiveShadow = true;
  scene.add(outfield);

  // 30-Yard Powerplay Dashed Ring
  const ppDots = new THREE.Group();
  const ppSegs = 64;
  const ppDotMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 });
  for (let i = 0; i < ppSegs; i++) {
    const a = (i / ppSegs) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.5), ppDotMat);
    seg.position.set(Math.cos(a) * WORLD.R_RING, 0.02, Math.sin(a) * WORLD.R_RING);
    seg.rotation.y = -a;
    ppDots.add(seg);
  }
  scene.add(ppDots);

  // Boundary Rope
  const rope = new THREE.Mesh(
    new THREE.TorusGeometry(WORLD.R_BOUNDARY, 0.24, 8, 96),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 })
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 0.22;
  scene.add(rope);

  // Advertising Hoarding Perimeter Boards
  const sponsorSpecs = [
    ['CRICKET ASCEND', '#0ea5e9', '#fbbf24'],
    ['SUPER LEAGUE', '#1e293b', '#38bdf8'],
    ['ASCEND PRO GEAR', '#059669', '#a7f3d0'],
    ['MAXIMUM SIXES', '#b91c1c', '#fde047']
  ];
  const boardCount = 24;
  const boardMats = sponsorSpecs.map(([t, bg, ac]) => new THREE.MeshStandardMaterial({ map: makeHoardingTexture(t, bg, ac), roughness: 0.55 }));
  const boardGeo = new THREE.BoxGeometry(15.2, 2.2, 0.5);
  for (let i = 0; i < boardCount; i++) {
    const ang = (i / boardCount) * Math.PI * 2;
    const board = new THREE.Mesh(boardGeo, boardMats[i % boardMats.length]);
    board.position.set(Math.cos(ang) * (WORLD.R_BOUNDARY + 3.2), 1.1, Math.sin(ang) * (WORLD.R_BOUNDARY + 3.2));
    board.lookAt(0, 1.1, 0);
    scene.add(board);
  }

  // Tiered Stadium Concrete Stands & Roof Canopy
  const standLower = new THREE.Mesh(
    new THREE.CylinderGeometry(WORLD.R_STADIUM_INNER + 12, WORLD.R_STADIUM_INNER, 10, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide, roughness: 0.85 })
  );
  standLower.position.y = 5;
  scene.add(standLower);

  const standUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(WORLD.R_STADIUM_OUTER + 4, WORLD.R_STADIUM_INNER + 12, 9.5, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, side: THREE.DoubleSide, roughness: 0.85 })
  );
  standUpper.position.y = 14.2;
  scene.add(standUpper);

  const canopy = new THREE.Mesh(
    new THREE.RingGeometry(WORLD.R_STADIUM_INNER + 4, WORLD.R_STADIUM_OUTER + 7, 48),
    new THREE.MeshStandardMaterial({ color: 0x334155, side: THREE.DoubleSide, roughness: 0.65, metalness: 0.25 })
  );
  canopy.rotation.x = Math.PI / 2;
  canopy.position.y = 20.5;
  scene.add(canopy);

  // Sightscreen at Bowler's End (-Z)
  const sightscreen = new THREE.Mesh(
    new THREE.BoxGeometry(18, 7.5, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 })
  );
  sightscreen.position.set(0, 3.8, -(WORLD.R_BOUNDARY + 4.8));
  scene.add(sightscreen);

  // 4 Floodlight Towers
  [
    [-46, -50], [46, -50], [-48, 48], [48, 48]
  ].forEach(([tx, tz]) => scene.add(createFloodlightTower(tx, tz)));

  // Animated 3D Low-Poly Crowd (InstancedMesh for crisp 60fps!)
  const crowdCount = 420;
  const crowdGeo = new THREE.BoxGeometry(0.85, 1.25, 0.65);
  const crowdMat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  const crowdInst = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
  const palette = [0x38bdf8, 0xf59e0b, 0x10b981, 0xf43f5e, 0xe2e8f0, 0xa855f7, 0xfacc15];
  const crowdMeta = [];
  const dummy = new THREE.Object3D();
  const colorObj = new THREE.Color();

  for (let i = 0; i < crowdCount; i++) {
    const tier = i % 5;
    const ang = (i / crowdCount) * Math.PI * 2 + (tier * 0.08) + (Math.random() - 0.5) * 0.03;
    const radius = WORLD.R_STADIUM_INNER + 2.2 + tier * 2.8;
    const baseY = 2.4 + tier * 2.6;
    const x = Math.cos(ang) * radius;
    const z = Math.sin(ang) * radius;
    crowdMeta.push({ x, z, baseY, ang, phase: (i * 0.73) % (Math.PI * 2) });
    dummy.position.set(x, baseY, z);
    dummy.lookAt(0, baseY, 0);
    dummy.updateMatrix();
    crowdInst.setMatrixAt(i, dummy.matrix);
    colorObj.setHex(palette[i % palette.length]);
    crowdInst.setColorAt(i, colorObj);
  }
  crowdInst.instanceMatrix.needsUpdate = true;
  if (crowdInst.instanceColor) crowdInst.instanceColor.needsUpdate = true;
  scene.add(crowdInst);

  // Textured Clay Pitch Strip + Crease Lines
  const pitchMat = new THREE.MeshStandardMaterial({ map: makePitchTexture('Balanced'), roughness: 0.92 });
  const pitchMesh = new THREE.Mesh(new THREE.BoxGeometry(WORLD.PITCH_W, 0.05, WORLD.PITCH_LEN), pitchMat);
  pitchMesh.position.set(0, 0.01, 0);
  pitchMesh.receiveShadow = true;
  scene.add(pitchMesh);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const addCreaseLine = (x, z, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), lineMat);
    m.position.set(x, 0.042, z);
    scene.add(m);
  };
  // Bowling creases + Popping creases + Return creases
  addCreaseLine(0, WORLD.BOWLER_Z, 2.7, 0.06);
  addCreaseLine(0, WORLD.BOWLER_Z + 1.35, 3.6, 0.06);
  addCreaseLine(-1.35, WORLD.BOWLER_Z + 0.65, 0.06, 2.4);
  addCreaseLine(1.35, WORLD.BOWLER_Z + 0.65, 0.06, 2.4);

  addCreaseLine(0, WORLD.STRIKER_Z, 2.7, 0.06);
  addCreaseLine(0, WORLD.STRIKER_Z - 1.35, 3.6, 0.06);
  addCreaseLine(-1.35, WORLD.STRIKER_Z - 0.65, 0.06, 2.4);
  addCreaseLine(1.35, WORLD.STRIKER_Z - 0.65, 0.06, 2.4);

  // Stumps + Bails at both ends
  const strikerWickets = createWicketSet();
  strikerWickets.group.position.set(0, 0.03, WORLD.STRIKER_Z);
  scene.add(strikerWickets.group);

  const nonStrikerWickets = createWicketSet();
  nonStrikerWickets.group.position.set(0, 0.03, WORLD.BOWLER_Z);
  scene.add(nonStrikerWickets.group);

  return {
    outfield,
    pitchMat,
    ppDotMat,
    strikerWickets,
    nonStrikerWickets,
    setPitchAppearance(pitchType) {
      if (pitchMat.map) pitchMat.map.dispose();
      pitchMat.map = makePitchTexture(pitchType);
      pitchMat.needsUpdate = true;
    },
    setPowerplay(isPowerplay) {
      ppDotMat.color.setHex(isPowerplay ? 0xf59e0b : 0xe2e8f0);
      ppDotMat.opacity = isPowerplay ? 0.88 : 0.42;
    },
    updateCrowd(timeSec, excitement) {
      const freq = 2.4 + excitement * 9.5;
      const amp = 0.14 + excitement * 0.72;
      for (let i = 0; i < crowdCount; i++) {
        const m = crowdMeta[i];
        const jump = Math.abs(Math.sin(timeSec * freq + m.phase)) * amp;
        dummy.position.set(m.x, m.baseY + jump, m.z);
        dummy.lookAt(0, m.baseY + jump, 0);
        dummy.updateMatrix();
        crowdInst.setMatrixAt(i, dummy.matrix);
      }
      crowdInst.instanceMatrix.needsUpdate = true;
    }
  };
}
