import { api, esc, openModal, closeModal, toast } from '../api.js';

function roundRect(ctx, x, y, w, h, r, fill = null, stroke = null, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

const ROLE_COLORS = {
  'Batsman': { bg: 'rgba(56, 189, 248, 0.2)', border: '#38bdf8', text: '#38bdf8' },
  'Wicket-Keeper': { bg: 'rgba(52, 211, 153, 0.2)', border: '#34d399', text: '#34d399' },
  'Bowler': { bg: 'rgba(244, 63, 94, 0.2)', border: '#fb7185', text: '#fb7185' },
  'All-Rounder': { bg: 'rgba(245, 158, 11, 0.2)', border: '#fbbf24', text: '#fbbf24' }
};

function drawProfileToCanvas(canvas, data, logoImg = null, avatarImg = null) {
  const W = 940;
  const H = 580;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const {
    player = {},
    tier = { badge: '🎓', name: 'Trainee' },
    requiredXP = 100,
    academy = null,
    activeContract = null,
    stats = {},
    computedStats = {},
    tournamentsWon = [],
    inventory = []
  } = data || {};

  const publicId = player.public_id || player.discord_id || 'CA-UNASSIGNED';
  const xpPct = Math.min(100, Math.max(0, ((player.xp || 0) / Math.max(1, requiredXP)) * 100));
  const tourneys = (tournamentsWon || []).reduce((a, t) => a + (t.won || 0), 0);
  const equipped = (inventory || []).filter(i => i.equipped);

  // 1. Floodlit Stadium Dark Gradient Background
  const bgGrad = ctx.createRadialGradient(470, 180, 60, 470, 290, 650);
  bgGrad.addColorStop(0, '#14203f');
  bgGrad.addColorStop(0.55, '#090f20');
  bgGrad.addColorStop(1, '#04070e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle Broadcast Grid Lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Outer Frame + Corner Brackets
  roundRect(ctx, 10, 10, W - 20, H - 20, 18, null, 'rgba(245, 158, 11, 0.5)', 2);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  [[6, 6], [W - 26, 6], [6, H - 26], [W - 26, H - 26]].forEach(([cx, cy]) => ctx.strokeRect(cx, cy, 20, 20));

  // Top Header Strip
  roundRect(ctx, 26, 20, W - 52, 30, 8, 'rgba(15, 23, 42, 0.9)', 'rgba(245, 158, 11, 0.35)', 1);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 12px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CRICKET ASCEND • PLAYER PROFILE', 40, 40);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText(`PLAYER ID: ${publicId}  •  SEASON ${player.season || 1}`, W - 40, 40);

  // LEFT BIO PANEL
  roundRect(ctx, 26, 60, 326, H - 80, 16, 'rgba(13, 20, 38, 0.92)', 'rgba(56, 189, 248, 0.38)', 1.5);

  // Avatar Emblem Ring
  ctx.save();
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(189, 126, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(189, 126, 42, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    // Cover-crop custom player photo cleanly inside the glowing circular emblem
    const scale = Math.max(84 / avatarImg.width, 84 / avatarImg.height);
    const dw = avatarImg.width * scale;
    const dh = avatarImg.height * scale;
    ctx.drawImage(avatarImg, 189 - dw / 2, 126 - dh / 2, dw, dh);
  } else {
    const avGrad = ctx.createLinearGradient(147, 84, 231, 168);
    avGrad.addColorStop(0, '#0f172a');
    avGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = avGrad;
    ctx.fillRect(147, 84, 84, 84);
    if (logoImg) {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(logoImg, 147, 84, 84, 84);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(player.name || 'CA').slice(0, 2).toUpperCase(), 189, 127);
  }
  ctx.restore();

  // Player Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  let fs = 22;
  ctx.font = `bold ${fs}px "Chakra Petch", sans-serif`;
  while (ctx.measureText(player.name || 'Player').width > 290 && fs > 14) {
    fs -= 1;
    ctx.font = `bold ${fs}px "Chakra Petch", sans-serif`;
  }
  ctx.fillText(player.name || 'Cricketer', 189, 198);

  const completedChapters = Math.min(50, player.current_chapter || 1);
  // Compute OVR rating cleanly (45..99)
  const attrVals = Object.values(data.effectiveAttributes || {}).filter(v => typeof v === 'number');
  const avgAttr = attrVals.length > 0 ? attrVals.reduce((a, b) => a + b, 0) / attrVals.length : 15;
  const ovr = Math.min(99, Math.max(45, Math.round(40 + avgAttr * 0.85 + (player.level || 1) * 0.45)));

  // Badges Row: ID | OVR | LVL | ROLE
  roundRect(ctx, 40, 210, 82, 24, 12, 'rgba(56, 189, 248, 0.16)', '#38bdf8', 1);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillText(publicId, 81, 226);

  roundRect(ctx, 127, 210, 56, 24, 12, 'rgba(16, 185, 129, 0.18)', '#10b981', 1);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillText(`OVR ${ovr}`, 155, 226);

  roundRect(ctx, 188, 210, 62, 24, 12, 'rgba(245, 158, 11, 0.18)', '#f59e0b', 1);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillText(`LVL ${player.level || 1}`, 219, 226);

  const rc = ROLE_COLORS[player.primary_role] || ROLE_COLORS['Batsman'];
  roundRect(ctx, 255, 210, 84, 24, 12, rc.bg, rc.border, 1);
  ctx.fillStyle = rc.text;
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(String(player.primary_role || 'PLAYER').toUpperCase(), 297, 226);

  // Bio Info Fields
  const drawBio = (y, label, val, col = '#fff') => {
    roundRect(ctx, 40, y, 298, 42, 8, 'rgba(30, 41, 59, 0.58)', 'rgba(255,255,255,0.08)', 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(label, 52, y + 15);
    ctx.fillStyle = col;
    ctx.font = 'bold 12px sans-serif';
    let txt = String(val || '—');
    while (ctx.measureText(txt).width > 274 && txt.length > 6) txt = txt.slice(0, -2) + '…';
    ctx.fillText(txt, 52, y + 33);
  };

  drawBio(246, 'TIER & NATION', `${tier.name} • ${(player.nationality || 'Global').toUpperCase()}`, '#38bdf8');
  drawBio(294, 'PLAYING STYLE', `${player.batting_hand || 'Right-hand bat'} | ${player.bowling_style || 'Right-arm Fast'}`, '#f8fafc');
  drawBio(342, 'ACADEMY & SPONSOR', `${academy?.name || player.academy_id || 'Academy'} • ${player.sponsor || 'No Sponsor'}`, '#fbbf24');
  drawBio(390, 'ACTIVE CLUB CONTRACT', activeContract ? `${activeContract.club_name} (${activeContract.salary_per_match}c/m)` : 'Academy Stipend (20c/m)', '#34d399');
  drawBio(438, 'HONORS & CAMPAIGN', `Chapter ${Math.min(50, player.current_chapter || 1)}/50 • 🏆 ${tourneys} Cups • 👑 ${player.franchise_titles || 0} Franchise`, '#c084fc');

  // Level XP Progress at bottom of left panel
  roundRect(ctx, 40, 492, 298, 52, 8, 'rgba(15, 23, 42, 0.85)', 'rgba(244, 63, 94, 0.35)', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fda4af';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillText(`XP PROGRESS (${player.xp || 0} / ${requiredXP})`, 52, 510);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.round(xpPct)}%`, 326, 510);
  roundRect(ctx, 52, 520, 274, 12, 6, '#090d18');
  if (xpPct > 0) {
    const xpg = ctx.createLinearGradient(52, 520, 326, 520);
    xpg.addColorStop(0, '#ec4899');
    xpg.addColorStop(1, '#f43f5e');
    roundRect(ctx, 52, 520, Math.max(10, Math.round(274 * (xpPct / 100))), 12, 6, xpg);
  }

  // RIGHT PANEL: VITALS + COMPLETE CAREER STATS + EQUIPPED GEAR
  roundRect(ctx, 366, 60, W - 392, H - 80, 16, 'rgba(13, 20, 38, 0.92)', 'rgba(16, 185, 129, 0.38)', 1.5);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11.5px "JetBrains Mono", monospace';
  ctx.fillText('// MATCH VITALS & FORM', 384, 84);

  const vitals = [
    { label: 'ENERGY', val: `${player.energy ?? 100}/100`, pct: player.energy ?? 100, col: '#10b981' },
    { label: 'CONFIDENCE', val: `${player.confidence ?? 50}/100`, pct: player.confidence ?? 50, col: '#f59e0b' },
    { label: 'FORM', val: `${player.form ?? 50}/100`, pct: player.form ?? 50, col: '#38bdf8' },
    { label: 'REPUTATION', val: `${player.reputation ?? 0} REP`, pct: Math.min(100, ((player.reputation || 0) / 300) * 100), col: '#a855f7' }
  ];
  vitals.forEach((v, idx) => {
    const x = 384 + idx * 130;
    roundRect(ctx, x, 94, 122, 58, 8, 'rgba(30, 41, 59, 0.62)', 'rgba(255,255,255,0.07)', 1);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(v.label, x + 10, 111);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Chakra Petch", sans-serif';
    ctx.fillText(v.val, x + 10, 130);
    roundRect(ctx, x + 10, 138, 102, 6, 3, '#0b1120');
    if (v.pct > 0) roundRect(ctx, x + 10, 138, Math.max(6, Math.round(102 * Math.min(1, v.pct / 100))), 6, 3, v.col);
  });

  // CAREER STATS MATRIX (Batting + Bowling + Fielding)
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11.5px "JetBrains Mono", monospace';
  ctx.fillText('// CAREER MATCH STATISTICS', 384, 178);

  const statBoxes = [
    { lbl: 'MATCHES', val: String(stats.matches || 0), col: '#ffffff' },
    { lbl: 'TOTAL RUNS', val: String((stats.runs || 0).toLocaleString()), col: '#38bdf8' },
    { lbl: 'BAT AVG', val: String(computedStats.battingAvg || '0.00'), col: '#34d399' },
    { lbl: 'STRIKE RATE', val: String(computedStats.strikeRate || '0.00'), col: '#fbbf24' },
    { lbl: '4s / 6s', val: `${stats.fours || 0} / ${stats.sixes || 0}`, col: '#fbbf24' },
    { lbl: '50s / 100s', val: `${stats.fifties || 0} / ${stats.hundreds || 0}`, col: '#c084fc' },
    { lbl: 'WICKETS', val: String(stats.wickets || 0), col: '#fb7185' },
    { lbl: 'ECONOMY', val: String(computedStats.economy || '0.00'), col: '#38bdf8' },
    { lbl: 'BOWL AVG', val: String(computedStats.bowlingAvg || '0.00'), col: '#f8fafc' },
    { lbl: 'BEST BOWL', val: String(computedStats.bestBowling || 'N/A'), col: '#34d399' },
    { lbl: 'OVERS', val: Number(stats.overs || 0).toFixed(1), col: '#94a3b8' },
    { lbl: 'FIELD DISM', val: String((stats.catches || 0) + (stats.run_outs || 0) + (stats.stumpings || 0)), col: '#34d399' }
  ];

  statBoxes.forEach((sb, i) => {
    const colIdx = i % 4;
    const rowIdx = Math.floor(i / 4);
    const x = 384 + colIdx * 130;
    const y = 188 + rowIdx * 66;
    roundRect(ctx, x, y, 122, 58, 9, 'rgba(15, 23, 42, 0.85)', 'rgba(56, 189, 248, 0.22)', 1);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText(sb.lbl, x + 10, y + 18);
    ctx.fillStyle = sb.col;
    ctx.font = 'bold 18px "Chakra Petch", sans-serif';
    ctx.fillText(sb.val, x + 10, y + 43);
  });

  // WALLET + EQUIPPED GEAR SUMMARY STRIP
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11.5px "JetBrains Mono", monospace';
  ctx.fillText('// EQUIPPED LOADOUT & ECONOMY VAULT', 384, 408);

  roundRect(ctx, 384, 418, 512, 62, 10, 'rgba(30, 41, 59, 0.62)', 'rgba(245, 158, 11, 0.25)', 1);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText(`🪙 ${(player.coins || 0).toLocaleString()} Coins   •   🎟️ ${player.training_tokens || 0} Tickets   •   🌟 ${player.skill_points || 0} Skill Pts`, 398, 442);

  const gearSummary = equipped.length > 0
    ? equipped.map(e => `${e.type}: ${e.name}`).slice(0, 3).join('  |  ') + (equipped.length > 3 ? ` (+${equipped.length - 3} more)` : '')
    : 'No gear currently equipped';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px sans-serif';
  ctx.fillText(gearSummary, 398, 464);

  // Footer Stamp
  roundRect(ctx, 384, 492, 512, 52, 10, 'rgba(8, 13, 27, 0.9)', 'rgba(255,255,255,0.08)', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
  ctx.fillText(`SEASON ${player.season || 1} • ${String(player.nationality || 'CRICKET ASCEND').toUpperCase()} • ${publicId}`, 398, 522);
}

let cachedLogoImg = null;
function loadBotLogoForCanvas() {
  if (cachedLogoImg) return Promise.resolve(cachedLogoImg);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { cachedLogoImg = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = '/bot-logo.png';
  });
}

function loadPlayerAvatarForCanvas(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!String(url).startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function openSetProfilePhotoModal(currentUrl, onSaved) {
  let pendingDataUrl = currentUrl || '';
  openModal(`
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3>📷 Set Player Profile Photo</h3>
        <button class="btn btn-sm" id="photo-modal-close">✕</button>
      </div>
      <p style="font-size:0.84rem;color:var(--text-muted);margin:0;">
        Upload any photo from your device (auto-cropped &amp; optimized to 256×256) or paste an image URL to feature on your Profile Graphic Card and Search Directory.
      </p>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div id="photo-preview-ring" style="width:92px;height:92px;border-radius:50%;overflow:hidden;border:2px solid var(--cyan);background:#0b1120;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${pendingDataUrl
            ? `<img src="${esc(pendingDataUrl)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;" />`
            : `<span style="color:var(--text-muted);font-size:0.78rem;">No Photo</span>`}
        </div>
        <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:10px;">
          <label class="btn btn-primary btn-sm" style="cursor:pointer;text-align:center;">
            📁 Choose Photo from Device
            <input type="file" id="photo-file-input" accept="image/*" style="display:none;" />
          </label>
          <input id="photo-url-input" class="input" placeholder="Or paste https://... image URL" value="${pendingDataUrl && !pendingDataUrl.startsWith('data:') ? esc(pendingDataUrl) : ''}" />
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:6px;">
        <button class="btn btn-danger btn-sm" id="photo-clear-btn">🗑️ Reset to Initials</button>
        <button class="btn btn-emerald" id="photo-save-btn">✅ Save Profile Photo</button>
      </div>
    </div>
  `);

  const previewRing = document.getElementById('photo-preview-ring');
  const setPreview = (src) => {
    pendingDataUrl = src || '';
    previewRing.innerHTML = src
      ? `<img src="${esc(src)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;" />`
      : `<span style="color:var(--text-muted);font-size:0.78rem;">No Photo</span>`;
  };

  document.getElementById('photo-modal-close').onclick = closeModal;
  document.getElementById('photo-url-input').oninput = (e) => {
    const val = e.target.value.trim();
    if (val.startsWith('http://') || val.startsWith('https://')) setPreview(val);
  };

  document.getElementById('photo-file-input').onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const off = document.createElement('canvas');
        off.width = 256;
        off.height = 256;
        const octx = off.getContext('2d');
        const sc = Math.max(256 / img.width, 256 / img.height);
        const dw = img.width * sc;
        const dh = img.height * sc;
        octx.drawImage(img, 128 - dw / 2, 128 - dh / 2, dw, dh);
        const resized = off.toDataURL('image/jpeg', 0.85);
        document.getElementById('photo-url-input').value = '';
        setPreview(resized);
      };
      img.onerror = () => toast('Could not decode selected image file.', 'error');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  document.getElementById('photo-clear-btn').onclick = async () => {
    await api('/api/player/avatar', { method: 'POST', body: { avatar_url: null } });
    closeModal();
    toast('Profile photo reset to initials emblem.', 'info');
    if (onSaved) await onSaved(null);
  };

  document.getElementById('photo-save-btn').onclick = async () => {
    const urlVal = document.getElementById('photo-url-input').value.trim();
    const toSave = urlVal || pendingDataUrl;
    if (!toSave) return toast('Choose a photo file or enter an image URL first.', 'error');
    await api('/api/player/avatar', { method: 'POST', body: { avatar_url: toSave } });
    closeModal();
    toast('Profile photo updated!', 'success');
    if (onSaved) await onSaved(toSave);
  };
}

export function renderCommonProfileGraphicCard(hostEl, data, { isSelf = false, onChallenge = null } = {}) {
  const { player = {} } = data || {};
  const publicId = player.public_id || player.discord_id || 'CA-0000';

  hostEl.innerHTML = `
    <div class="card card-glow-cyan" style="padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="badge badge-cyan">🪪 PLAYER PROFILE CARD</span>
          <span class="badge badge-gold mono">${esc(publicId)}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${!isSelf && onChallenge ? `
            <button class="btn btn-gold btn-sm card-chal-btn">⚔️ Challenge (${esc(publicId)})</button>
          ` : ''}
          <button class="btn btn-sm card-dl-btn">📥 Download PNG</button>
        </div>
      </div>
      <div style="width:100%;overflow:hidden;border-radius:14px;background:#04070e;border:1px solid rgba(56,189,248,0.22);">
        <canvas class="profile-graphic-canvas" style="width:100%;height:auto;display:block;"></canvas>
      </div>
    </div>
  `;

  const canvas = hostEl.querySelector('.profile-graphic-canvas');
  let loadedAvatar = null;
  drawProfileToCanvas(canvas, data, cachedLogoImg, loadedAvatar);

  Promise.all([
    cachedLogoImg ? Promise.resolve(cachedLogoImg) : loadBotLogoForCanvas(),
    loadPlayerAvatarForCanvas(player.avatar_url)
  ]).then(([logo, av]) => {
    loadedAvatar = av;
    if (document.body.contains(canvas)) {
      drawProfileToCanvas(canvas, data, logo, loadedAvatar);
    }
  });

  hostEl.querySelector('.card-dl-btn').onclick = () => {
    const link = document.createElement('a');
    link.download = `cricket_ascend_${String(player.name || 'player').replace(/[^a-z0-9]/gi, '_')}_${publicId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Profile card PNG downloaded!', 'success');
  };

  const chalBtn = hostEl.querySelector('.card-chal-btn');
  if (chalBtn && onChallenge) {
    chalBtn.onclick = () => onChallenge(player);
  }
}

export async function openPlayerProfileModal(identifier, currentPlayerId = null, onChallengePlayer = null) {
  try {
    const data = await api(`/api/players/profile?id=${encodeURIComponent(identifier)}`);
    const { player, effectiveAttributes = {}, equipmentBonuses = {}, recentMatches = [] } = data;
    const isSelf = currentPlayerId && player.discord_id === currentPlayerId;

    openModal(`
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div>
            <h3>👤 ${esc(player.name)} <span class="badge badge-cyan mono">${esc(player.public_id || player.discord_id)}</span></h3>
            <div style="font-size:0.82rem;color:var(--text-muted);">Level ${player.level} • ${esc(player.primary_role)} • 🌍 ${esc(player.nationality)}</div>
          </div>
          <button class="btn btn-sm" id="modal-close-prof">✕ Close</button>
        </div>
        <div id="modal-prof-card-host"></div>
        <div class="grid-2" style="gap:12px;">
          <div class="card" style="padding:12px;">
            <h4 style="margin-bottom:8px;">⚡ Key Effective Attributes</h4>
            <div class="grid-2" style="gap:6px;font-size:0.8rem;">
              ${['power', 'timing', 'technique', 'accuracy', 'swing', 'spin_bowling', 'fitness', 'mentality'].map(k => `
                <div style="display:flex;justify-content:space-between;padding:4px 8px;border-radius:6px;background:rgba(15,23,42,0.75);">
                  <span>${k.replace('_', ' ')}</span>
                  <strong class="mono">${effectiveAttributes[k] || 10}${equipmentBonuses[k] ? ` <span style="color:var(--emerald);">(+${equipmentBonuses[k]})</span>` : ''}</strong>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card" style="padding:12px;">
            <h4 style="margin-bottom:8px;">📜 Recent Form (${recentMatches.length})</h4>
            <div style="display:flex;flex-direction:column;gap:5px;max-height:145px;overflow-y:auto;font-size:0.78rem;">
              ${recentMatches.map(m => `
                <div style="display:flex;justify-content:space-between;padding:4px 8px;border-radius:6px;background:rgba(15,23,42,0.75);">
                  <span>vs ${esc(m.opponent)}</span>
                  <span class="mono">${m.runs} (${m.balls}b) • ${m.wickets}w • <strong>${esc(m.result)}</strong></span>
                </div>
              `).join('') || '<div style="color:var(--text-muted);">No matches recorded yet.</div>'}
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById('modal-close-prof').onclick = () => {
      document.getElementById('modal-root').innerHTML = '';
    };

    renderCommonProfileGraphicCard(document.getElementById('modal-prof-card-host'), data, {
      isSelf,
      onChallenge: !isSelf && onChallengePlayer ? onChallengePlayer : null
    });
  } catch {}
}
