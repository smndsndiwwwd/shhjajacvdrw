import * as THREE from '../vendor/three.module.js';

/**
 * Stylized low-poly Stick-Cricket inspired 3D Character Builder & Procedural Animator
 */
export function createStickCricketer({
  role = 'fielder',
  jerseyColor = 0x2563eb,
  trouserColor = 0xf8fafc,
  skinColor = 0xf1c27d,
  hasHelmet = false,
  capColor = 0x0f172a,
  isLeftHand = false
} = {}) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: jerseyColor, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const trouserMat = new THREE.MeshStandardMaterial({ color: trouserColor, roughness: 0.7 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const headWearMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.45, metalness: hasHelmet ? 0.25 : 0.05 });

  // Ground drop-shadow disc under feet
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  // Articulated Body Rig
  const body = new THREE.Group();
  root.add(body);

  // Legs (hips at y = 0.88)
  const makeLeg = (xOff) => {
    const hip = new THREE.Group();
    hip.position.set(xOff, 0.88, 0);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.76, 10), trouserMat);
    upper.position.y = -0.38;
    upper.castShadow = true;
    hip.add(upper);

    if (role === 'batsman' || role === 'nonstriker' || role === 'keeper') {
      // Crisp sculpted leg-guard batting pad
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.16), padMat);
      pad.position.set(0, -0.50, 0.06);
      pad.castShadow = true;
      hip.add(pad);
    }

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.27), shoeMat);
    shoe.position.set(0, -0.80, 0.06);
    hip.add(shoe);

    return hip;
  };

  const legL = makeLeg(-0.16);
  const legR = makeLeg(0.16);
  body.add(legL, legR);

  // Torso (waist y = 0.88 -> shoulders y = 1.62)
  const torso = new THREE.Group();
  torso.position.y = 0.88;
  body.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.24, 0.74, 12), jerseyMat);
  chest.position.y = 0.37;
  chest.castShadow = true;
  torso.add(chest);

  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.27, 0.12, 12), trimMat);
  stripe.position.y = 0.54;
  torso.add(stripe);

  // Stylised Stick-Cricket Oversized Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.94, 0);
  torso.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Expressive eyes facing forward (+Z local on character)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  [-0.10, 0.10].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeMat);
    eye.position.set(ex, 0.02, 0.28);
    headGroup.add(eye);
  });

  if (hasHelmet) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.355, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      headWearMat
    );
    shell.position.y = 0.02;
    shell.castShadow = true;
    headGroup.add(shell);

    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.37, 0.05, 12, 1, false, -0.7, 1.4),
      headWearMat
    );
    visor.position.set(0, 0.12, 0.04);
    headGroup.add(visor);

    // Helmet protective face grille bar
    const grille = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.016, 6, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 })
    );
    grille.position.set(0, -0.05, 0.19);
    grille.rotation.x = 0.18;
    headGroup.add(grille);
  } else {
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.335, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      headWearMat
    );
    capDome.position.y = 0.03;
    headGroup.add(capDome);

    const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 12, 1, false, -0.75, 1.5), headWearMat);
    peak.position.set(0, 0.09, 0.18);
    headGroup.add(peak);
  }

  // Arms
  const makeArm = (xOff) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOff, 0.66, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.24, 10), jerseyMat);
    sleeve.position.y = -0.10;
    shoulder.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.34, 10), skinMat);
    forearm.position.y = -0.36;
    forearm.castShadow = true;
    shoulder.add(forearm);

    const handMat = (role === 'batsman' || role === 'nonstriker' || role === 'keeper') ? gloveMat : skinMat;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 8), handMat);
    hand.position.y = -0.54;
    shoulder.add(hand);

    return shoulder;
  };

  const armL = makeArm(-0.34);
  const armR = makeArm(0.34);
  torso.add(armL, armR);

  // 3D English Willow Bat Pivot (held cleanly out in front in both gloved hands, never through legs)
  let batPivot = null;
  if (role === 'batsman' || role === 'nonstriker') {
    batPivot = new THREE.Group();
    batPivot.position.set(0, 0.24, 0.40);
    torso.add(batPivot);

    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.30, 10),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
    );
    grip.position.y = -0.15;
    batPivot.add(grip);

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.74, 0.075),
      new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.45 })
    );
    blade.position.y = -0.66;
    blade.castShadow = true;
    batPivot.add(blade);

    const sticker = new THREE.Mesh(
      new THREE.BoxGeometry(0.145, 0.28, 0.082),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    sticker.position.y = -0.62;
    batPivot.add(sticker);
  }

  // Ball held in bowler hand before release
  let handBall = null;
  if (role === 'bowler') {
    handBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
    );
    handBall.position.set(0, -0.58, 0.02);
    armR.add(handBall);
  }

  return {
    root,
    body,
    torso,
    headGroup,
    armL,
    armR,
    legL,
    legR,
    batPivot,
    handBall,
    isLeftHand,
    setColors({ jerseyHex, capHex, isLeft } = {}) {
      if (jerseyHex !== undefined) jerseyMat.color.setHex(jerseyHex);
      if (capHex !== undefined) headWearMat.color.setHex(capHex);
      if (isLeft !== undefined) this.isLeftHand = isLeft;
    }
  };
}

/**
 * Procedural animations for Batter (idle stance, backlift, drive/pull/lofted/leave swing, sprint)
 */
export function animateBatterRig(rig, {
  isLeftHand = false,
  stance = 'In Line',
  intent = 'Stroke',
  zone = 'Cover',
  isLeave = false,
  stage = 'idle',
  progress = 0,
  runCrossings = 0,
  timeSec = 0
} = {}) {
  // Forward in local rig coords is +Z. Stand side-on facing across stumps toward bowler!
  // For RHB (isLeftHand=false): body stands left of stumps (negative X), faces right (+X) slightly open (-Y/Bowler = -Z).
  // Rotating character ~+Math.PI/2 (or 1.25 rad) points chest/eyes toward +X (Off Side) and head turns toward -Z (Bowler).
  const dir = isLeftHand ? -1 : 1;
  const sideMul = isLeftHand ? -1 : 1;

  // Reset limbs smoothly
  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.headGroup.rotation.set(0, 0, 0);

  if (stage === 'outcome' && runCrossings > 0) {
    // Sprinting down the pitch!
    rig.root.rotation.y = Math.PI; // facing -Z toward non-striker end
    const stride = Math.sin(timeSec * 16) * 0.65;
    rig.legL.rotation.x = stride;
    rig.legR.rotation.x = -stride;
    rig.armL.rotation.x = -stride * 0.8;
    rig.armR.rotation.x = stride * 0.8;
    rig.torso.rotation.x = 0.16;
    if (rig.batPivot) {
      rig.batPivot.position.set(0, 0.28, 0.36);
      rig.batPivot.rotation.set(-0.65, 0, dir * 0.25);
    }
    return;
  }

  // Cricket batting stance in Three.js (+Z rig forward -> chest faces +X/off-side & slightly -Z/bowler for RHB):
  // With rot.y = dir * 1.76: chest(+Z) -> (+dir*0.98, -0.19), lead shoulder points toward Bowler (-Z), eyes look at Bowler (-Z)!
  rig.root.rotation.y = dir * 1.76;
  rig.headGroup.rotation.y = dir * 1.18;
  rig.legL.rotation.x = 0.08;
  rig.legR.rotation.x = -0.08;

  if (stage === 'idle' || stage === 'runup') {
    // Rhythmic crease bat tap OUT IN FRONT (+Z) of pads, held cleanly in both gloved hands
    const tap = Math.max(0, Math.sin(timeSec * 4.4)) * 0.14;
    rig.torso.rotation.x = 0.14;
    rig.armL.rotation.set(-0.72, 0, 0.30 * sideMul);
    rig.armR.rotation.set(-0.78 - tap * 0.4, 0, -0.30 * sideMul);
    if (rig.batPivot) {
      rig.batPivot.position.set(0, 0.22 - tap * 0.04, 0.40);
      // Negative rotation.x angles (-Y) bat blade FORWARD (+Z) in front of toes, never between legs!
      rig.batPivot.rotation.set(-0.36 - tap * 0.35, 0, -dir * 0.14);
    }
  } else if (stage === 'delivery') {
    // Trigger clean Backlift up over the back shoulder (-X*dir) as ball approaches!
    const lift = Math.min(1, progress * 1.35);
    rig.torso.rotation.x = 0.16 - lift * 0.06;
    rig.torso.rotation.y = -dir * lift * 0.24;
    rig.armL.rotation.set(-0.78 - lift * 0.55, 0, (0.28 - lift * 0.18) * sideMul);
    rig.armR.rotation.set(-0.84 - lift * 0.65, 0, (-0.28 + lift * 0.18) * sideMul);
    if (rig.batPivot) {
      rig.batPivot.position.set(0, 0.24 + lift * 0.20, 0.38);
      rig.batPivot.rotation.set(-0.42, 0, -dir * (0.14 + lift * 2.02));
    }
  } else if (stage === 'outcome') {
    const t = Math.min(1, progress * 3.8);
    const swingEase = Math.sin(Math.min(1, t) * Math.PI * 0.5);
    if (isLeave) {
      // Shouldered arms safely above off-stump
      rig.torso.rotation.y = -dir * 0.22;
      rig.armL.rotation.set(-1.35, 0, 0.35 * sideMul);
      rig.armR.rotation.set(-1.45, 0, -0.25 * sideMul);
      if (rig.batPivot) {
        rig.batPivot.position.set(0, 0.44, 0.34);
        rig.batPivot.rotation.set(-0.35, 0, -dir * 2.35);
      }
      return;
    }

    const isPull = zone === 'Square Leg' || zone === 'Fine Leg' || zone === 'Mid Wicket';
    const isLofted = String(intent || '').toLowerCase().includes('loft') || String(intent || '').toLowerCase().includes('aggr');

    if (isPull) {
      // Horizontal pull / sweep swing across chest out in front of pads!
      rig.torso.rotation.y = dir * (0.20 + swingEase * 1.05);
      rig.armL.rotation.set(-1.12, dir * swingEase * 0.85, 0.25 * sideMul);
      rig.armR.rotation.set(-1.20, dir * swingEase * 0.85, -0.25 * sideMul);
      if (rig.batPivot) {
        rig.batPivot.position.set(0, 0.38, 0.42);
        rig.batPivot.rotation.set(-1.25, dir * (0.15 + swingEase * 1.15), -dir * (0.95 - swingEase * 2.15));
      }
    } else {
      // Crisp Flowing Drive / Lofted Arc sweeping down from backlift through impact (+Z) to high follow-through!
      const followEndZ = isLofted ? 2.25 : 1.55;
      const swingZ = -dir * 2.16 + swingEase * dir * (2.16 + followEndZ);
      rig.torso.rotation.x = 0.20 - swingEase * 0.14;
      rig.torso.rotation.y = dir * (0.16 - swingEase * 0.38);
      rig.armL.rotation.set(-0.80 - swingEase * (isLofted ? 1.15 : 0.65), 0, 0.22 * sideMul);
      rig.armR.rotation.set(-0.85 - swingEase * (isLofted ? 1.25 : 0.72), 0, -0.22 * sideMul);
      if (rig.batPivot) {
        rig.batPivot.position.set(0, 0.26 + swingEase * 0.20, 0.44);
        rig.batPivot.rotation.set(-0.58 - swingEase * 0.28, 0, swingZ);
      }
    }
  }
}

/**
 * Procedural animations for Bowler (run-up + bowling arm whip + follow-through)
 */
export function animateBowlerRig(rig, { stage = 'idle', progress = 0, timeSec = 0 } = {}) {
  // Bowler faces +Z (toward Striker at z = +10.2)
  rig.root.rotation.y = 0;
  rig.torso.rotation.set(0, 0, 0);

  if (stage === 'idle' || stage === 'outcome') {
    const breath = Math.sin(timeSec * 3.0) * 0.04;
    rig.legL.rotation.x = 0;
    rig.legR.rotation.x = 0;
    rig.armL.rotation.set(0.15 + breath, 0, -0.12);
    rig.armR.rotation.set(0.15 - breath, 0, 0.12);
    if (rig.handBall) rig.handBall.visible = stage === 'idle';
    return;
  }

  if (stage === 'runup') {
    if (rig.handBall) rig.handBall.visible = true;
    const stride = Math.sin(progress * Math.PI * 5) * 0.72;
    rig.legL.rotation.x = stride;
    rig.legR.rotation.x = -stride;
    rig.armL.rotation.set(-stride * 0.85, 0, -0.16);
    // Final 25% of runup begins arm windup
    if (progress > 0.72) {
      const wp = (progress - 0.72) / 0.28;
      rig.armR.rotation.set(-wp * Math.PI * 1.15, 0, 0.15);
      rig.body.position.y = Math.sin(wp * Math.PI) * 0.35;
    } else {
      rig.armR.rotation.set(stride * 0.85, 0, 0.16);
    }
    rig.torso.rotation.x = 0.18;
  } else if (stage === 'delivery') {
    if (rig.handBall) rig.handBall.visible = false;
    const ft = Math.min(1, progress * 2.2);
    rig.torso.rotation.x = 0.28 * (1 - ft * 0.5);
    rig.armR.rotation.set(-Math.PI * 1.15 - ft * Math.PI * 0.75, 0, 0.14);
    rig.armL.rotation.set(0.55 - ft * 0.3, 0, -0.22);
    rig.legL.rotation.x = 0.45 * (1 - ft * 0.5);
    rig.legR.rotation.x = -0.35 * (1 - ft * 0.5);
  }
}

/**
 * Procedural animations for Fielders (ready crouch, chase sprint, dive stretch)
 */
export function animateFielderRig(rig, { moving = false, diveProgress = 0, moveAngle = 0, timeSec = 0, seed = 0 } = {}) {
  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);

  if (diveProgress > 0) {
    // Full horizontal dive lunge toward the ball!
    rig.root.rotation.y = moveAngle;
    const arc = Math.sin(diveProgress * Math.PI);
    rig.body.position.y = 0.32 * arc;
    rig.body.rotation.x = 1.18 * arc;
    rig.armL.rotation.set(-2.4 * arc, 0, -0.2);
    rig.armR.rotation.set(-2.4 * arc, 0, 0.2);
    return;
  }

  if (moving) {
    rig.root.rotation.y = moveAngle;
    const sp = Math.sin(timeSec * 16 + seed) * 0.72;
    rig.torso.rotation.x = 0.20;
    rig.legL.rotation.x = sp;
    rig.legR.rotation.x = -sp;
    rig.armL.rotation.set(-sp * 0.9, 0, -0.15);
    rig.armR.rotation.set(sp * 0.9, 0, 0.15);
  } else {
    // Athletic infielder ready bounce facing Striker (0, STRIKER_Z)
    const sway = Math.sin(timeSec * 3.6 + seed) * 0.05;
    rig.torso.rotation.x = 0.22 + sway;
    rig.legL.rotation.x = -0.12;
    rig.legR.rotation.x = -0.12;
    rig.armL.rotation.set(-0.48, 0, -0.22);
    rig.armR.rotation.set(-0.48, 0, 0.22);
  }
}
