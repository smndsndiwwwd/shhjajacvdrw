const RARITY_ACCENTS = {
  Common: '#94a3b8',
  Rare: '#3b82f6',
  Epic: '#a855f7',
  Legendary: '#f59e0b'
};

export function renderGearIconSVG(type, rarity = 'Common', equipped = false) {
  const accent = RARITY_ACCENTS[rarity] || RARITY_ACCENTS.Common;
  const glow = equipped ? `filter:drop-shadow(0 0 8px ${accent}66);` : 'opacity:0.8;';

  switch (type) {
    case 'Bat':
      return `<svg viewBox="0 0 64 64" width="46" height="46" style="${glow}">
        <rect x="38" y="6" width="8" height="16" rx="3" transform="rotate(35 42 14)" fill="#38bdf8" stroke="#fff" stroke-width="1.5"/>
        <path d="M35 18 L43 24 L25 53 Q21 58 15 54 L13 52 Q9 48 13 43 Z" fill="#eab308" stroke="${accent}" stroke-width="2"/>
        <line x1="28" y1="27" x2="17" y2="48" stroke="#92400e" stroke-width="1.8"/>
      </svg>`;
    case 'Grip':
      return `<svg viewBox="0 0 64 64" width="46" height="46" style="${glow}">
        <rect x="23" y="10" width="18" height="44" rx="8" fill="#0f172a" stroke="${accent}" stroke-width="2.5"/>
        <path d="M23 20 L41 26 M23 28 L41 34 M23 36 L41 42 M23 44 L41 50" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    case 'Gloves':
      return `<svg viewBox="0 0 64 64" width="46" height="46" style="${glow}">
        <path d="M18 30 L18 16 Q18 12 22 12 Q25 12 25 16 L25 24 L27 12 Q27 9 30 9 Q33 9 33 12 L33 24 L35 13 Q35 10 38 10 Q41 10 41 13 L41 25 L43 18 Q45 15 47 17 Q49 19 47 24 L44 38 L44 52 L20 52 L20 38 L14 33 Q12 30 15 28 Z" fill="#1e293b" stroke="${accent}" stroke-width="2.2"/>
        <rect x="22" y="34" width="20" height="7" rx="2" fill="#10b981"/>
        <rect x="20" y="45" width="24" height="7" rx="2" fill="#38bdf8"/>
      </svg>`;
    case 'Pads':
      return `<svg viewBox="0 0 64 64" width="46" height="46" style="${glow}">
        <rect x="16" y="10" width="14" height="44" rx="5" fill="#e2e8f0" stroke="${accent}" stroke-width="2.2"/>
        <rect x="34" y="10" width="14" height="44" rx="5" fill="#e2e8f0" stroke="${accent}" stroke-width="2.2"/>
        <rect x="18" y="23" width="10" height="6" rx="2" fill="#38bdf8"/>
        <rect x="36" y="23" width="10" height="6" rx="2" fill="#38bdf8"/>
        <line x1="23" y1="12" x2="23" y2="52" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="41" y1="12" x2="41" y2="52" stroke="#94a3b8" stroke-width="1.5"/>
      </svg>`;
    case 'Helmet':
      return `<svg viewBox="0 0 64 64" width="46" height="46" style="${glow}">
        <path d="M16 32 C16 17 24 10 34 10 C45 10 50 19 50 30 L50 35 L20 35 Z" fill="#0f172a" stroke="${accent}" stroke-width="2.5"/>
        <path d="M20 34 L12 37 L15 41 L28 38" fill="#38bdf8"/>
        <path d="M16 38 L22 50 L44 50 L48 36" fill="none" stroke="#94a3b8" stroke-width="2.4"/>
        <line x1="19" y1="44" x2="46" y2="44" stroke="#94a3b8" stroke-width="2"/>
      </svg>`;
    case 'Shoes':
    default:
      return `<svg viewBox="0 0 64 64" width="46" height="46" style="${glow}">
        <path d="M12 42 L14 26 L24 24 L31 33 L48 36 Q54 37 54 43 L54 47 L12 47 Z" fill="#1e293b" stroke="${accent}" stroke-width="2.2"/>
        <path d="M12 47 L54 47" stroke="#10b981" stroke-width="3"/>
        <circle cx="17" cy="50" r="2" fill="#fbbf24"/>
        <circle cx="26" cy="50" r="2" fill="#fbbf24"/>
        <circle cx="38" cy="50" r="2" fill="#fbbf24"/>
        <circle cx="48" cy="50" r="2" fill="#fbbf24"/>
      </svg>`;
  }
}

/**
 * Hawk-Eye Style Pitch Strip Diagram showing last delivery bounce spot (Length x Line)
 */
export function renderHawkEyePitchSVG({ delivery = null, lengthOnly = false, battingHand = 'Right-hand bat' } = {}) {
  const isLeft = String(battingHand || '').toLowerCase().includes('left');
  const line = delivery?.line || null;
  const len = delivery?.length || null;

  // Map Line to X (pitch width 56..164)
  let bx = 110;
  if (line === 'Off Side') bx = isLeft ? 136 : 84;
  else if (line === 'Leg Side') bx = isLeft ? 84 : 136;
  else if (line === 'Wide') bx = isLeft ? 156 : 64;

  // Map Length to Y (bowler top ~22 -> batter crease bottom ~158)
  const lenLower = String(len || '').toLowerCase();
  let by = 96;
  let bandY = 76;
  let bandH = 36;
  if (lenLower.includes('yorker')) { by = 148; bandY = 140; bandH = 18; }
  else if (lenLower.includes('full')) { by = 126; bandY = 112; bandH = 28; }
  else if (lenLower.includes('good')) { by = 92; bandY = 76; bandH = 36; }
  else if (lenLower.includes('short')) { by = 58; bandY = 42; bandH = 34; }

  return `
    <svg viewBox="0 0 220 185" style="width:100%;max-width:230px;display:block;margin:0 auto;">
      <rect x="6" y="6" width="208" height="173" rx="12" fill="#08131d" stroke="rgba(56,189,248,0.25)" />
      <!-- Turf Grass -->
      <rect x="24" y="14" width="172" height="156" rx="8" fill="#134e30" />
      <!-- Pitch Clay Strip -->
      <rect x="66" y="18" width="88" height="148" fill="#d9be8b" stroke="#a68957" />

      <!-- Length Zones Shading -->
      <rect x="66" y="42" width="88" height="34" fill="rgba(244,63,94,0.14)" />
      <rect x="66" y="76" width="88" height="36" fill="rgba(56,189,248,0.14)" />
      <rect x="66" y="112" width="88" height="28" fill="rgba(16,185,129,0.14)" />
      <rect x="66" y="140" width="88" height="18" fill="rgba(245,158,11,0.18)" />

      <!-- Length Labels -->
      <text x="160" y="62" fill="#fda4af" font-size="8" font-family="JetBrains Mono">SHORT</text>
      <text x="160" y="96" fill="#7dd3fc" font-size="8" font-family="JetBrains Mono">GOOD</text>
      <text x="160" y="128" fill="#6ee7b7" font-size="8" font-family="JetBrains Mono">FULL</text>
      <text x="160" y="150" fill="#fcd34d" font-size="8" font-family="JetBrains Mono">YORKER</text>

      <!-- Crease Lines & Stumps -->
      <line x1="60" y1="30" x2="160" y2="30" stroke="#fff" stroke-width="1.5" />
      <line x1="60" y1="152" x2="160" y2="152" stroke="#fff" stroke-width="1.5" />
      <line x1="104" y1="22" x2="116" y2="22" stroke="#f43f5e" stroke-width="2.5" />
      <line x1="104" y1="158" x2="116" y2="158" stroke="#f43f5e" stroke-width="2.5" />

      <!-- Stump Tramlines -->
      <line x1="104" y1="22" x2="104" y2="158" stroke="rgba(255,255,255,0.22)" stroke-dasharray="3 3" />
      <line x1="116" y1="22" x2="116" y2="158" stroke="rgba(255,255,255,0.22)" stroke-dasharray="3 3" />

      ${delivery && lengthOnly ? `
        <!-- Initial Release Hint: Length Band Highlight Only -->
        <rect x="66" y="${bandY}" width="88" height="${bandH}" fill="rgba(251,191,36,0.38)" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="4 2" />
        <rect x="76" y="${by - 7}" width="68" height="13" rx="3" fill="rgba(2,6,23,0.82)" />
        <text x="110" y="${by + 2.5}" fill="#fde68a" font-size="8" font-weight="800" font-family="JetBrains Mono" text-anchor="middle">${(len || '').toUpperCase()}</text>
      ` : delivery ? `
        <!-- Trajectory & Bounce Marker -->
        <line x1="110" y1="24" x2="${bx}" y2="${by}" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 3" />
        <line x1="${bx}" y1="${by}" x2="${bx}" y2="164" stroke="#fbbf24" stroke-width="2" />
        <circle cx="${bx}" cy="${by}" r="7" fill="rgba(244,63,94,0.35)" />
        <circle cx="${bx}" cy="${by}" r="4.2" fill="#f43f5e" stroke="#fff" stroke-width="1.3" />
      ` : `
        <text x="110" y="94" fill="#0f172a" font-size="9" font-weight="700" font-family="JetBrains Mono" text-anchor="middle">AWAITING</text>
        <text x="110" y="106" fill="#0f172a" font-size="9" font-weight="700" font-family="JetBrains Mono" text-anchor="middle">DELIVERY</text>
      `}
    </svg>
  `;
}
