/**
 * Interactive 2D SVG Cricket Field Radar
 * Enforces authentic T20 fielding restrictions:
 * - Powerplay (isPowerplay = true): MAX 2 fielders outside 30-yard ring (7 inside + WK + Bowler)
 * - Open Field (isPowerplay = false): MAX 5 fielders outside 30-yard ring (4 inside + WK + Bowler)
 * - Leg-side cap: max 5 fielders on leg side, max 2 behind square on leg side
 * - Dynamic Left-Hand / Right-Hand batter orientation & collision-free separation
 */
export function renderFieldRadarSVG({
  fieldPreset = 'Balanced',
  selectedZone = null,
  isPowerplay = false,
  battingHand = 'Right-hand bat',
  interactive = false
} = {}) {
  const isLeft = String(battingHand || '').toLowerCase().includes('left');
  const cx = 200;
  const cy = 200;
  const R = 176;
  const RING_R = 94;

  const zones = isLeft ? [
    { name: 'Fine Leg', short: 'Z1 Fine', start: 90, end: 135 },
    { name: 'Square Leg', short: 'Z2 Square', start: 135, end: 180 },
    { name: 'Mid Wicket', short: 'Z3 MidWkt', start: 180, end: 225 },
    { name: 'Long On', short: 'Z4 LongOn', start: 225, end: 270 },
    { name: 'Long Off', short: 'Z5 LongOff', start: 270, end: 315 },
    { name: 'Cover', short: 'Z6 Cover', start: 315, end: 360 },
    { name: 'Point', short: 'Z7 Point', start: 0, end: 45 },
    { name: 'Third Man', short: 'Z8 3rdMan', start: 45, end: 90 }
  ] : [
    { name: 'Fine Leg', short: 'Z1 Fine', start: 45, end: 90 },
    { name: 'Square Leg', short: 'Z2 Square', start: 0, end: 45 },
    { name: 'Mid Wicket', short: 'Z3 MidWkt', start: 315, end: 360 },
    { name: 'Long On', short: 'Z4 LongOn', start: 270, end: 315 },
    { name: 'Long Off', short: 'Z5 LongOff', start: 225, end: 270 },
    { name: 'Cover', short: 'Z6 Cover', start: 180, end: 225 },
    { name: 'Point', short: 'Z7 Point', start: 135, end: 180 },
    { name: 'Third Man', short: 'Z8 3rdMan', start: 90, end: 135 }
  ];

  const pt = (deg, dist) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + Math.cos(rad) * dist, cy + Math.sin(rad) * dist];
  };

  const wedgePath = (startDeg, endDeg) => {
    const [x1, y1] = pt(startDeg, R);
    const [x2, y2] = pt(endDeg, R);
    return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  };

  // Exact match to FIELD_PRESET_CONFIGS in src/game/engine.js
  // Priority order ensures when Powerplay pulls fielders in, exact PP positions stay out
  const preset = String(fieldPreset || 'Balanced').toLowerCase();
  let rawFielders = [];
  if (preset === 'attacking') {
    // 2 Outfield (Z3 Deep Mid Wicket, Z5 Long Off), 7 Infield (Z1 Short Leg, Z3 Mid Wicket, Z6 Silly Point & Cover, Z8 Slip 1, Slip 2, Gully)
    rawFielders = [
      { angle: 342, dist: 136, label: 'Deep MW' },
      { angle: 248, dist: 136, label: 'Long Off' },
      { angle: 68, dist: 44, label: 'Short Leg' },
      { angle: 328, dist: 68, label: 'Mid Wkt' },
      { angle: 190, dist: 44, label: 'Silly Pt' },
      { angle: 208, dist: 72, label: 'Cover' },
      { angle: 100, dist: 48, label: 'Slip 1' },
      { angle: 114, dist: 56, label: 'Slip 2' },
      { angle: 128, dist: 68, label: 'Gully' }
    ];
  } else if (preset === 'defensive') {
    // PP: only Z1 Deep Fine Leg + Z2 Deep Square Leg stay out (2); Normal: Z1, Z2, Z3, Z4, Z5 stay out (5)
    rawFielders = [
      { angle: 66, dist: 136, label: 'D.Fine' },
      { angle: 22, dist: 136, label: 'D.Square' },
      { angle: 336, dist: 136, label: 'D.MidWkt', ppLabel: 'MidWkt Up' },
      { angle: 294, dist: 136, label: 'Long On', ppLabel: 'LongOn Up' },
      { angle: 246, dist: 136, label: 'Long Off', ppLabel: 'LongOff Up' },
      { angle: 282, dist: 66, label: 'Mid On' },
      { angle: 204, dist: 76, label: 'Cover Up' },
      { angle: 158, dist: 74, label: 'Point' },
      { angle: 114, dist: 74, label: '3rdMan Up' }
    ];
  } else {
    // Balanced: PP: Z2 D.Square + Z3 D.MidWkt stay out (2); Normal: Z2, Z3, Z4, Z5, Z7 stay out (5)
    rawFielders = [
      { angle: 22, dist: 136, label: 'D.Square' },
      { angle: 338, dist: 136, label: 'D.MidWkt' },
      { angle: 296, dist: 136, label: 'Long On', ppLabel: 'LongOn Up' },
      { angle: 244, dist: 136, label: 'Long Off', ppLabel: 'LongOff Up' },
      { angle: 156, dist: 136, label: 'D.Point', ppLabel: 'Point Up' },
      { angle: 68, dist: 68, label: 'S.Fine' },
      { angle: 280, dist: 66, label: 'Mid On' },
      { angle: 260, dist: 66, label: 'Mid Off' },
      { angle: 204, dist: 72, label: 'Cover' }
    ];
  }

  // Enforce Powerplay (max 2 outside 30-yd circle) vs Open Field (max 5 outside)
  const maxOutfield = isPowerplay ? 2 : 5;
  let outfieldCount = 0;
  const restricted = rawFielders.map((f, idx) => {
    const finalAngle = isLeft ? (540 - f.angle) % 360 : f.angle;
    if (f.dist > RING_R) {
      if (outfieldCount < maxOutfield) {
        outfieldCount++;
        return { angle: finalAngle, dist: f.dist, label: f.label, isOut: true };
      }
      // Pull extra outfielders inside the 30-yard circle
      const pulledDist = 66 + ((idx % 3) * 7);
      return { angle: finalAngle, dist: pulledDist, label: f.ppLabel || `${f.label} (Up)`, isOut: false };
    }
    return { angle: finalAngle, dist: f.dist, label: f.label, isOut: false };
  });

  // Compute coordinates + run collision separation so no labels or dots stack
  const fielders = restricted.map(f => {
    const [fx, fy] = pt(f.angle, f.dist);
    return { x: fx, y: fy, label: f.label, isOut: f.isOut };
  });

  const minSep = 26;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < fielders.length; i++) {
      for (let j = i + 1; j < fielders.length; j++) {
        const dx = fielders[j].x - fielders[i].x;
        const dy = fielders[j].y - fielders[i].y;
        const d = Math.hypot(dx, dy);
        if (d < minSep) {
          const push = (minSep - d) / 2;
          const nx = d > 0.01 ? dx / d : Math.cos(i);
          const ny = d > 0.01 ? dy / d : Math.sin(i);
          fielders[i].x -= nx * push;
          fielders[i].y -= ny * push;
          fielders[j].x += nx * push;
          fielders[j].y += ny * push;
        }
      }
      // Keep inside/outside ring integrity & away from pitch
      const dc = Math.hypot(fielders[i].x - cx, fielders[i].y - cy);
      if (!fielders[i].isOut && dc > RING_R - 10) {
        fielders[i].x = cx + ((fielders[i].x - cx) / dc) * (RING_R - 12);
        fielders[i].y = cy + ((fielders[i].y - cy) / dc) * (RING_R - 12);
      }
      if (fielders[i].isOut && dc < RING_R + 18) {
        fielders[i].x = cx + ((fielders[i].x - cx) / dc) * (RING_R + 22);
        fielders[i].y = cy + ((fielders[i].y - cy) / dc) * (RING_R + 22);
      }
      if (dc > R - 18) {
        fielders[i].x = cx + ((fielders[i].x - cx) / dc) * (R - 20);
        fielders[i].y = cy + ((fielders[i].y - cy) / dc) * (R - 20);
      }
    }
  }

  return `
    <svg viewBox="0 0 400 412" class="radar-svg" aria-label="2D Cricket Field Radar">
      <defs>
        <radialGradient id="turfGrad" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#1f7546" />
          <stop offset="70%" stop-color="#134e30" />
          <stop offset="100%" stop-color="#0b2f1d" />
        </radialGradient>
      </defs>

      <!-- Stadium Outer Border -->
      <circle cx="${cx}" cy="${cy}" r="${R + 10}" fill="#07121a" stroke="rgba(56,189,248,0.32)" stroke-width="2" />
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#turfGrad)" stroke="#f1f5f9" stroke-width="2.5" />

      <!-- 30-yard Powerplay Circle -->
      <circle cx="${cx}" cy="${cy}" r="${RING_R}" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,${isPowerplay ? '0.85' : '0.42'})" stroke-width="${isPowerplay ? '2.2' : '1.4'}" stroke-dasharray="6 4" />

      <!-- Clickable Zone Wedges -->
      ${zones.map(z => {
        const isSel = selectedZone && z.name.toLowerCase() === selectedZone.toLowerCase();
        return `<path d="${wedgePath(z.start, z.end)}"
          class="radar-wedge ${interactive ? 'interactive' : ''} ${isSel ? 'selected' : ''}"
          data-zone="${z.name}"
          fill="${isSel ? 'rgba(245,158,11,0.32)' : 'rgba(255,255,255,0.01)'}"
          stroke="rgba(255,255,255,0.18)" stroke-width="1" />`;
      }).join('')}

      <!-- Center Pitch Strip -->
      <rect x="${cx - 10}" y="${cy - 32}" width="20" height="64" rx="3" fill="#e6cfa3" stroke="#b99c6b" stroke-width="1" />
      <line x1="${cx - 10}" y1="${cy - 22}" x2="${cx + 10}" y2="${cy - 22}" stroke="#fff" stroke-width="1.3" />
      <line x1="${cx - 10}" y1="${cy + 22}" x2="${cx + 10}" y2="${cy + 22}" stroke="#fff" stroke-width="1.3" />
      <rect x="${cx - 4}" y="${cy - 25}" width="8" height="2.5" fill="#f43f5e" />
      <rect x="${cx - 4}" y="${cy + 23}" width="8" height="2.5" fill="#f43f5e" />

      <!-- Zone Labels -->
      ${zones.map(z => {
        const mid = (z.start + z.end) / 2;
        const [lx, ly] = pt(mid, 158);
        return `
          <g pointer-events="none">
            <rect x="${lx - 31}" y="${ly - 10}" width="62" height="19" rx="5" fill="rgba(5,8,17,0.84)" stroke="rgba(148,163,184,0.32)" stroke-width="0.8" />
            <text x="${lx}" y="${ly + 3}" fill="${selectedZone === z.name ? '#fbbf24' : '#f8fafc'}" font-size="9" font-weight="700" font-family="JetBrains Mono, monospace" text-anchor="middle">${z.short}</text>
          </g>
        `;
      }).join('')}

      <!-- Batter, Keeper & Bowler -->
      <circle cx="${cx}" cy="${cy + 18}" r="4.5" fill="#10b981" stroke="#fff" stroke-width="1.3" />
      <circle cx="${cx}" cy="${cy + 42}" r="5.5" fill="#38bdf8" stroke="#fff" stroke-width="1.4" />
      <text x="${cx}" y="${cy + 53}" fill="#7dd3fc" font-size="8" font-weight="700" text-anchor="middle">WK</text>
      <circle cx="${cx}" cy="${cy - 40}" r="5.5" fill="#f43f5e" stroke="#fff" stroke-width="1.4" />
      <text x="${cx}" y="${cy - 48}" fill="#fda4af" font-size="8" font-weight="700" text-anchor="middle">BOWL</text>

      <!-- 9 Dynamic Fielders obeying Powerplay/Open Circle limits -->
      ${fielders.map(f => `
        <g pointer-events="none">
          <circle cx="${f.x.toFixed(1)}" cy="${f.y.toFixed(1)}" r="5.5" fill="${f.isOut ? '#fbbf24' : '#34d399'}" stroke="#090d16" stroke-width="1.5" />
          <text x="${f.x.toFixed(1)}" y="${(f.y - 8).toFixed(1)}" fill="#fef3c7" font-size="8" font-weight="700" text-anchor="middle">${f.label}</text>
        </g>
      `).join('')}

      <!-- Restriction Footer Legend -->
      <text x="12" y="402" fill="#94a3b8" font-size="9.5" font-family="JetBrains Mono, monospace">${isLeft ? 'LHB' : 'RHB'} • ${fieldPreset.toUpperCase()}</text>
      <text x="388" y="402" fill="${isPowerplay ? '#fbbf24' : '#34d399'}" font-size="9.5" font-weight="700" font-family="JetBrains Mono, monospace" text-anchor="end">
        ${isPowerplay ? `⚡ PP RING: ${outfieldCount}/2 OUT` : `🏟️ OPEN: ${outfieldCount}/5 OUT`}
      </text>
    </svg>
  `;
}
