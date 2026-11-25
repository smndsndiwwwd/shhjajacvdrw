import { api, esc, formatRichText, toast } from '../api.js';
import { caIcon } from '../components/icons.js';
import { renderHawkEyePitchSVG } from '../components/gearSvg.js';
import { CricketArcadeRenderer, WAGON_ZONES } from '../engine/cricketCanvas.js';
import { cricketAudio } from '../engine/cricketAudio.js';

export function mountChallengeDuelArena(hostEl, initialDuel, state, { onCompleteDismiss, onReloadHub }) {
  let duel = initialDuel;
  let renderer = null;
  let busy = false;
  let resultTimer = null;
  let pollTimer = null;
  let showingFinalResult = ['completed', 'expired', 'forfeited'].includes(duel.status);

  // Step-by-step controls state
  let batStep = 'stance';
  let selStance = null;
  let selFootwork = null;
  let selIntent = null;
  let selZone = null;

  let bowlStep = 'line';
  let selLine = null;
  let selLength = null;
  let selVar = null;
  let selField = 'Balanced';
  let selSpeed = String(duel.bowlerStyle || '').toLowerCase().includes('spin') ? 'Slow' : 'Fast';

  // Equipment-weighted timing needle
  let timingMode = 'meter';
  let needlePos = 50;
  let needleDir = 1;
  let needleRafId = null;

  const stopNeedle = () => {
    if (needleRafId) {
      cancelAnimationFrame(needleRafId);
      needleRafId = null;
    }
  };

  const startNeedle = () => {
    stopNeedle();
    const tp = duel.timingProfile || { needleSpeed: 0.78 };
    const baseSpeed = tp.needleSpeed || 0.78;
    let lastTs = null;
    const tick = (ts) => {
      const el = document.getElementById('pvp-timing-needle');
      if (!el) return;
      const dtScale = lastTs ? Math.min(2.2, Math.max(0.35, (ts - lastTs) / 16.67)) : 1;
      lastTs = ts;
      needlePos += needleDir * baseSpeed * dtScale;
      if (needlePos >= 98) { needlePos = 98; needleDir = -1; }
      if (needlePos <= 2) { needlePos = 2; needleDir = 1; }
      el.style.left = `${needlePos}%`;
      needleRafId = requestAnimationFrame(tick);
    };
    needleRafId = requestAnimationFrame(tick);
  };

  const evaluateNeedle = () => {
    if (timingMode === 'auto') return null;
    const tp = duel.timingProfile || { sweetHalf: 17, goodHalf: 38 };
    const dist = Math.abs(needlePos - 50);
    if (dist <= tp.sweetHalf) return 'Perfect';
    if (dist <= tp.goodHalf) return needlePos < 50 ? 'Slightly Early' : 'Slightly Late';
    return needlePos < 50 ? 'Very Early' : 'Very Late';
  };

  const fmtTimeLeft = (expMs) => {
    if (!expMs || expMs <= 0) return '';
    const diff = Math.max(0, expMs - Date.now());
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${String(secs).padStart(2, '0')}s left`;
  };

  const stopPoll = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  const cleanup = () => {
    stopNeedle();
    stopPoll();
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
    window.removeEventListener('keydown', onKeyDown);
    if (renderer) { renderer.destroy(); renderer = null; }
  };

  const renderOutcomeBanner = (lb) => {
    if (!lb) return '';
    let cls = '';
    let icon = String(lb.runs);
    let label = `${lb.runs} Run${lb.runs === 1 ? '' : 's'}`;
    if (lb.wicket) { cls = 'is-wicket'; icon = 'W'; label = 'WICKET!'; }
    else if (lb.rebowl) { icon = 'WD'; label = 'WIDE (+1)'; }
    else if (lb.runs === 6) { cls = 'is-six'; icon = '6!'; label = 'MAXIMUM SIX!'; }
    else if (lb.runs === 4) { cls = 'is-four'; icon = '4!'; label = 'CRACKING FOUR!'; }
    else if (lb.runs === 0) { icon = '•'; label = 'DOT BALL'; }

    return `
      <div class="outcome-flash ${cls}" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="outcome-badge">${icon}</div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong>${label}</strong>
              <span class="badge badge-cyan">${esc(lb.timing)}</span>
              <span class="badge badge-muted">${esc(lb.shotName)}</span>
            </div>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">${formatRichText(lb.commentary)}</div>
          </div>
        </div>
      </div>
    `;
  };

  const getCurrentDuelBallHint = () => {
    if (duel?.currentBallPreview?.length) return duel.currentBallPreview;
    if (duel?.state?.pendingDelivery?.length) return duel.state.pendingDelivery;
    const rev = `${duel?.fullDeliveryReveal || ''} ${duel?.releaseCue || ''}`;
    let length = null;
    if (/full toss/i.test(rev)) length = 'Full Toss';
    else if (/yorker/i.test(rev)) length = 'Yorker';
    else if (/good length/i.test(rev)) length = 'Good Length';
    else if (/\bfull\b/i.test(rev)) length = 'Full';
    else if (/\bshort\b/i.test(rev)) length = 'Short';
    if (!length) return null;
    let line = null;
    if (/off side/i.test(rev)) line = 'Off Side';
    else if (/leg side/i.test(rev)) line = 'Leg Side';
    else if (/wide/i.test(rev)) line = 'Wide';
    else if (/stumps/i.test(rev)) line = 'Stumps';
    return { length, line, speed: /\bfast\b/i.test(rev) ? 'Fast' : /\bslow\b/i.test(rev) ? 'Slow' : 'Medium' };
  };

  const syncCanvasConfig = () => {
    if (!renderer || !duel?.state) return;
    const st = duel.state;
    const isBatter = st.batterId === state.player.discord_id;
    const isLeftHand = String(duel.batterHand || '').toLowerCase().includes('left');
    const curHint = isBatter && duel.status === 'active' ? getCurrentDuelBallHint() : null;
    renderer.updateConfig({
      phase: isBatter ? 'batting' : 'bowling',
      pitch: 'Flat Belter',
      fieldPreset: isBatter ? (st.pendingDelivery?.fieldPreset || 'Balanced') : selField,
      isPowerplay: true,
      isLeftHand,
      selectedStance: selStance || 'In Line',
      selectedFootwork: selFootwork || 'Front Foot',
      selectedIntent: selIntent || 'Stroke',
      selectedZone: (batStep === 'zone' && selZone) ? selZone : null,
      allowZoneClick: isBatter && batStep === 'zone',
      currentBallHint: curHint ? { ...curHint, fullReveal: batStep === 'zone' } : null
    });
  };

  const scrollToDuelCanvas = () => {
    const shell = document.getElementById('pvp-arcade-canvas')?.closest('.arcade-canvas-shell') || document.getElementById('pvp-arcade-canvas');
    if (shell && typeof shell.scrollIntoView === 'function') {
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const submitPlay = async () => {
    if (busy || duel.status !== 'active') return;
    const st = duel.state;
    const isBatter = st.batterId === state.player.discord_id;
    const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
    if (isBatter && !isLeave && batStep === 'zone' && !selZone) {
      toast('Pick a direction (Wagon Zone or click field) first!', 'info');
      return;
    }
    busy = true;
    cricketAudio.ensureContext();

    try {
      let body;
      const usedZone = selZone || 'Cover';
      if (isBatter) {
        const capturedNeedle = timingMode === 'meter' ? Math.round(needlePos * 10) / 10 : null;
        body = {
          challenge_id: duel.id,
          stance: selStance || 'In Line',
          footwork: selFootwork || 'Front Foot',
          intent: selIntent || 'Stroke',
          zone: usedZone,
          timingQuality: evaluateNeedle(),
          needlePos: capturedNeedle
        };
        stopNeedle();
      } else {
        body = {
          challenge_id: duel.id,
          line: selLine || 'Stumps',
          length: selLength || 'Good Length',
          variation: selVar || 'Normal Delivery',
          fieldPreset: selField || 'Balanced',
          speed: selSpeed || 'Fast'
        };
      }

      const res = await api('/api/challenge/play', { method: 'POST', body });
      duel = res.challenge;
      batStep = 'stance'; selStance = null; selFootwork = null; selIntent = null; selZone = null;
      bowlStep = 'line'; selLine = null; selLength = null; selVar = null;

      syncCanvasConfig();
      scrollToDuelCanvas();
      if (renderer && duel.state?.lastBall) {
        renderer.playBallAnimation(duel.state.lastBall, { zone: duel.state.lastBall.actualZone || usedZone });
      }
      updatePanels();

      if (duel.status !== 'active') {
        resultTimer = setTimeout(() => {
          showingFinalResult = true;
          updatePanels();
        }, 2600);
      }
    } catch {} finally {
      busy = false;
    }
  };

  const renderResultCardHTML = () => {
    const st = duel.state || {};
    const myId = state.player.discord_id;
    const iWon = duel.winner_id === myId;
    const winName = duel.winner_name || 'Winner';
    const winTag = duel.winner_public_id ? ` [${duel.winner_public_id}]` : '';

    return `
      <div class="card ${iWon ? 'card-glow-emerald' : 'card-glow-crimson'}" style="text-align:center;padding:24px;margin-bottom:14px;">
        <span class="badge ${iWon ? 'badge-emerald' : 'badge-crimson'}">${duel.status === 'expired' ? '⏱️ TIMED OUT' : duel.status === 'forfeited' ? '🏳️ FORFEITED' : iWon ? '🏆 CHALLENGE VICTORY!' : '💔 CHALLENGE DEFEAT'}</span>
        <h2 style="font-size:1.85rem;margin:10px 0 4px;">${esc(winName)}${esc(winTag)} Wins the Duel!</h2>
        <p style="color:var(--text-muted);font-size:0.88rem;margin:0 0 14px;">
          ${esc(duel.challenger_name)} vs ${esc(duel.opponent_name)} • Final Score: <strong>${st.runs || 0}/${st.wickets || 0}</strong> in <strong>${st.balls || 0}/6 balls</strong> (Target ${st.targetRuns || duel.target_runs})
        </p>
        <div class="grid-3" style="max-width:560px;margin:0 auto 14px;gap:10px;">
          <div class="card" style="padding:10px;"><div class="label">Score</div><div class="stat-big" style="font-size:1.3rem;">${st.runs || 0}/${st.wickets || 0}</div></div>
          <div class="card" style="padding:10px;"><div class="label">4s / 6s</div><div class="stat-big" style="font-size:1.3rem;color:var(--gold);">${st.fours || 0} / ${st.sixes || 0}</div></div>
          <div class="card" style="padding:10px;"><div class="label">Rewards</div><div class="mono ic-val" style="font-size:0.85rem;color:var(--emerald);margin-top:6px;justify-content:center;">${iWon ? `+25 ${caIcon('coin', 14)} • +5 Rep • +60 XP` : '+20 XP'}</div></div>
        </div>
        ${renderOutcomeBanner(st.lastBall)}
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px;">
          <button class="btn btn-primary" id="btn-chal-dismiss">✅ Done &amp; Back to Challenge Lobby</button>
        </div>
      </div>
    `;
  };

  const renderControlsHTML = () => {
    const st = duel.state || {};
    const isBatter = st.batterId === state.player.discord_id;

    if (duel.status !== 'active') {
      return `
        <div class="card card-glow-gold" style="text-align:center;padding:16px;">
          <span class="badge badge-gold">⚔️ DUEL CONCLUDED</span>
          <h3 style="margin:6px 0;">Winner: ${esc(duel.winner_name || 'Complete')}</h3>
          <button class="btn btn-primary" id="btn-chal-show-result-now" style="margin-top:8px;">🏆 View Duel Result ➡️</button>
        </div>
      `;
    }

    if (isBatter) {
      if (!st.pendingDelivery) {
        return `<div style="padding:14px;color:var(--gold);">⏳ Waiting for bowler to select the next delivery... <button class="btn btn-sm" id="btn-pvp-refresh">🔄 Refresh</button></div>`;
      }
      const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
      const tp = duel.timingProfile || { sweetHalf: 17, goodHalf: 38, eqTimingBonus: 0, playerEdge: 30, bowlerThreat: 25 };
      const redL = Math.max(2, Math.round(50 - tp.goodHalf));
      const greenL = Math.max(redL + 4, Math.round(50 - tp.sweetHalf));
      const greenR = Math.min(96, Math.round(50 + tp.sweetHalf));
      const redR = Math.min(98, Math.round(50 + tp.goodHalf));
      const barBg = `linear-gradient(90deg, #ef4444 0%, #f59e0b ${redL}%, #10b981 ${greenL}%, #34d399 50%, #10b981 ${greenR}%, #f59e0b ${redR}%, #ef4444 100%)`;

      const topBanner = batStep === 'zone'
        ? (duel.fullDeliveryReveal || `🥎 ${st.pendingDelivery.speed} ${st.pendingDelivery.variation} (${st.pendingDelivery.length} on ${st.pendingDelivery.line})`)
        : (duel.releaseCue || '👀 *Bowler runs in...*');

      return `
        <div class="release-banner ${batStep === 'zone' ? 'is-full-reveal' : ''}" style="margin-bottom:12px;">
          ${formatRichText(topBanner)}
        </div>
        <div class="grid-4" style="gap:8px;margin-bottom:12px;">
          <div class="step-crumb ${selStance ? 'done' : batStep === 'stance' ? 'active' : ''}" data-pvp-j="stance"><div class="label" style="margin:0;">1. Stance</div><div style="font-weight:700;font-size:0.8rem;">${esc(selStance || 'Pick')}</div></div>
          <div class="step-crumb ${selFootwork ? 'done' : batStep === 'footwork' ? 'active' : ''}" data-pvp-j="footwork"><div class="label" style="margin:0;">2. Footwork</div><div style="font-weight:700;font-size:0.8rem;">${esc(selFootwork || 'Pick')}</div></div>
          <div class="step-crumb ${selIntent ? 'done' : batStep === 'intent' ? 'active' : ''}" data-pvp-j="intent"><div class="label" style="margin:0;">3. Intent</div><div style="font-weight:700;font-size:0.8rem;">${isLeave ? 'Leave' : esc(selIntent || 'Pick')}</div></div>
          <div class="step-crumb ${batStep === 'zone' ? 'active' : ''}"><div class="label" style="margin:0;">4. Zone &amp; Swing</div><div style="font-weight:700;font-size:0.8rem;">${isLeave ? 'Leave' : esc(batStep === 'zone' ? (selZone || 'Pick Zone') : 'Locked')}</div></div>
        </div>

        ${batStep === 'stance' ? `
          <div class="choice-grid-3">
            ${['Off Side', 'In Line', 'Leg Side'].map(id => `<button class="choice-card pvp-st-btn" data-val="${id}"><span class="cc-title">${id}</span></button>`).join('')}
          </div>
        ` : ''}
        ${batStep === 'footwork' ? `
          <div class="choice-grid-2">
            ${['Front Foot', 'Back Foot', 'Advanced', 'Leave'].map(id => `<button class="choice-card pvp-fw-btn" data-val="${id}"><span class="cc-title">${id === 'Leave' ? 'Leave Ball' : id}</span></button>`).join('')}
          </div>
          <button class="btn btn-sm pvp-back-st" style="margin-top:8px;">⬅️ Back</button>
        ` : ''}
        ${batStep === 'intent' ? `
          <div class="choice-grid-2">
            ${['Push', 'Stroke', 'Loft', 'Leave'].map(id => `<button class="choice-card pvp-in-btn" data-val="${id}"><span class="cc-title">${id}</span></button>`).join('')}
          </div>
          <button class="btn btn-sm pvp-back-fw" style="margin-top:8px;">⬅️ Back</button>
        ` : ''}
        ${batStep === 'leave_confirm' ? `
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-emerald btn-lg" id="btn-pvp-submit">✅ Confirm Leave (SPACE)</button>
            <button class="btn pvp-back-fw">⬅️ Back</button>
          </div>
        ` : ''}
        ${batStep === 'zone' ? `
          <div class="grid-4" style="gap:6px;margin-bottom:8px;">
            ${WAGON_ZONES.map((z, i) => `<button class="btn btn-sm ${selZone === z ? 'btn-gold' : ''} pvp-z-btn" data-val="${z}">Z${i + 1} ${z}</button>`).join('')}
          </div>
          <div class="timing-meter-wrap" style="margin:10px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
              <span class="label" style="margin:0;">⏱️ Timing Release Meter</span>
              <button class="btn btn-sm" id="btn-pvp-toggle-t">${timingMode === 'meter' ? 'Auto-Roll' : 'Skill Meter'}</button>
            </div>
            <div class="timing-meta">
              <span style="color:var(--emerald);">Sweet Spot: ±${tp.sweetHalf}%</span>
              <span>Gear: +${tp.eqTimingBonus}</span>
              <span>Edge ${tp.playerEdge} vs ${tp.bowlerThreat}</span>
            </div>
            ${timingMode === 'meter' ? `<div class="timing-bar" style="background:${barBg};"><div class="timing-needle" id="pvp-timing-needle"></div></div>` : '<div style="font-size:0.8rem;color:var(--text-muted);">Auto-Roll enabled</div>'}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-emerald btn-lg" id="btn-pvp-submit" style="flex:1;" ${!selZone ? 'disabled' : ''}>
              ${selZone ? `🏏 SWING ➔ ${esc(selZone)} (SPACE)` : '👆 Pick a Direction Above or on Field'}
            </button>
            <button class="btn pvp-back-in">⬅️ Back</button>
          </div>
        ` : ''}
      `;
    }

    // Opponent bowler UI
    if (st.pendingDelivery) {
      return `<div style="padding:14px;color:var(--gold);">⏳ Delivery sent! Waiting for batter to swing... <button class="btn btn-sm" id="btn-pvp-refresh">🔄 Refresh</button></div>`;
    }
    return `
      <div class="grid-4" style="gap:8px;margin-bottom:12px;">
        <div class="step-crumb ${selLine ? 'done' : bowlStep === 'line' ? 'active' : ''}" data-pvp-bj="line"><div class="label" style="margin:0;">1. Line</div><div style="font-weight:700;font-size:0.8rem;">${esc(selLine || 'Pick')}</div></div>
        <div class="step-crumb ${selLength ? 'done' : bowlStep === 'length' ? 'active' : ''}" data-pvp-bj="length"><div class="label" style="margin:0;">2. Length</div><div style="font-weight:700;font-size:0.8rem;">${esc(selLength || 'Pick')}</div></div>
        <div class="step-crumb ${selVar ? 'done' : bowlStep === 'variation' ? 'active' : ''}" data-pvp-bj="variation"><div class="label" style="margin:0;">3. Craft</div><div style="font-weight:700;font-size:0.8rem;">${esc(selVar || 'Pick')}</div></div>
        <div class="step-crumb ${bowlStep === 'field' ? 'active' : ''}"><div class="label" style="margin:0;">4. Field</div><div style="font-weight:700;font-size:0.8rem;">${esc(selField)}</div></div>
      </div>
      ${bowlStep === 'line' ? `<div class="choice-grid-2">${['Stumps', 'Off Side', 'Leg Side', 'Wide'].map(v => `<button class="choice-card pvp-bl-btn" data-val="${v}"><span class="cc-title">${v}</span></button>`).join('')}</div>` : ''}
      ${bowlStep === 'length' ? `<div class="choice-grid-2">${['Yorker', 'Full', 'Good Length', 'Short'].map(v => `<button class="choice-card pvp-bln-btn" data-val="${v}"><span class="cc-title">${v}</span></button>`).join('')}</div><button class="btn btn-sm pvp-bb-line" style="margin-top:8px;">⬅️ Back</button>` : ''}
      ${bowlStep === 'variation' ? `<div class="choice-grid-2">${['Normal Delivery', 'Swing/Spin', 'Cutter/Googly', 'Slower Ball'].map(v => `<button class="choice-card pvp-bv-btn" data-val="${v}"><span class="cc-title">${v}</span></button>`).join('')}</div><button class="btn btn-sm pvp-bb-len" style="margin-top:8px;">⬅️ Back</button>` : ''}
      ${bowlStep === 'field' ? `
        <div class="choice-grid-3" style="margin-bottom:10px;">${['Balanced', 'Attacking', 'Defensive'].map(f => `<button class="choice-card ${selField === f ? 'selected' : ''} pvp-bf-btn" data-val="${f}"><span class="cc-title">${f}</span></button>`).join('')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-emerald btn-lg" id="btn-pvp-submit" style="flex:1;">🥎 DELIVER BALL (SPACE)</button><button class="btn pvp-bb-var">⬅️ Back</button></div>
      ` : ''}
    `;
  };

  const updatePanels = () => {
    if (showingFinalResult && duel.status !== 'active') {
      cleanup();
      hostEl.innerHTML = renderResultCardHTML() + `
        <div class="card">
          <h4 style="margin-bottom:8px;">🎙️ Duel Ball-by-Ball Log</h4>
          <div class="commentary-feed">${(duel.state?.log || []).map(l => `<div class="comm-item">${formatRichText(l)}</div>`).join('')}</div>
        </div>
      `;
      document.getElementById('btn-chal-dismiss').onclick = () => onCompleteDismiss(duel.id);
      return;
    }

    const st = duel.state || {};
    const sb = document.getElementById('pvp-scorebug');
    if (sb) {
      const rem = fmtTimeLeft(duel.expires_at);
      sb.innerHTML = `
        <div class="scoreboard-banner" style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                <span class="badge badge-gold">⚔️ LIVE 1-OVER CHALLENGE SHOWDOWN</span>
                ${rem ? `<span class="badge badge-crimson mono">⏱️ ${rem}</span>` : ''}
              </div>
              <h2 style="font-size:1.25rem;">${esc(duel.challenger_name)} vs ${esc(duel.opponent_name)}</h2>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <div class="score-big">${st.runs || 0}/${st.wickets || 0} <span style="font-size:0.95rem;color:var(--cyan);">(${st.balls || 0}/6b • Target ${st.targetRuns || duel.target_runs})</span></div>
              ${duel.status === 'active' ? `<button class="btn btn-danger btn-sm" id="btn-pvp-forfeit">🏳️ Forfeit</button>` : ''}
            </div>
          </div>
          <div class="over-pills" style="margin-top:10px;">
            <span class="label" style="margin:0 4px 0 0;">Over:</span>
            ${(st.recentBalls || []).map(rv => `<span class="ball-pill ball-${esc(rv)}">${rv === '0' ? '•' : esc(rv)}</span>`).join('') || '<span style="font-size:0.74rem;color:var(--text-muted);">Ball 1</span>'}
          </div>
        </div>
      `;
      const fBtn = document.getElementById('btn-pvp-forfeit');
      if (fBtn) fBtn.onclick = async () => {
        await api('/api/challenge/cancel', { method: 'POST', body: { challenge_id: duel.id } });
        cleanup();
        await onReloadHub();
      };
    }

    const ctrl = document.getElementById('pvp-controls-host');
    if (ctrl) {
      ctrl.innerHTML = renderControlsHTML();
      bindCtrlEvents();
    }

    const outHost = document.getElementById('pvp-outcome-host');
    if (outHost) {
      const isBatter = st.batterId === state.player.discord_id;
      const ended = duel.status !== 'active';
      const curDeliv = ended
        ? (st.lastBall?.delivery || null)
        : isBatter
          ? getCurrentDuelBallHint()
          : { line: selLine || 'Stumps', length: selLength || 'Good Length', speed: selSpeed || 'Fast' };
      const lengthOnly = !ended && isBatter && batStep !== 'zone' && Boolean(curDeliv);
      outHost.innerHTML = `
        ${renderOutcomeBanner(st.lastBall)}
        <div class="card" style="padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h4 style="font-size:0.95rem;">🎯 Pitch Map</h4>
            <span class="badge ${ended ? 'badge-muted' : 'badge-cyan'}">${ended ? 'Final Ball' : 'Current Ball'}</span>
          </div>
          ${renderHawkEyePitchSVG({ delivery: curDeliv, lengthOnly, battingHand: duel.batterHand || 'Right-hand bat' })}
          <div class="mono" style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:6px;">
            ${!curDeliv ? 'Awaiting opponent delivery' : lengthOnly ? `Length Hint: ${esc(curDeliv.length)} • Line reveals at Step 4` : `${esc(curDeliv.length)} • ${esc(curDeliv.line)} (${esc(curDeliv.speed)})`}
          </div>
        </div>
      `;
    }

    stopPoll();
    const isBatterTurnWait = duel.status === 'active' && st.batterId === state.player.discord_id && !st.pendingDelivery;
    const isBowlerTurnWait = duel.status === 'active' && st.bowlerId === state.player.discord_id && Boolean(st.pendingDelivery);
    if (isBatterTurnWait || isBowlerTurnWait) {
      pollTimer = setInterval(async () => {
        try {
          const hub = await api('/api/challenge/hub', { silent: true });
          const upd = hub.challenges?.find(c => c.id === duel.id);
          if (upd && (upd.status !== duel.status || Boolean(upd.state?.pendingDelivery) !== Boolean(duel.state?.pendingDelivery) || (upd.state?.balls || 0) !== (duel.state?.balls || 0))) {
            stopPoll();
            duel = upd;
            if (duel.status !== 'active') showingFinalResult = true;
            syncCanvasConfig();
            updatePanels();
          }
        } catch {}
      }, 3500);
    }

    const commHost = document.getElementById('pvp-comm-host');
    if (commHost) {
      commHost.innerHTML = `
        <div class="card">
          <h4>🎙️ Duel Commentary</h4>
          <div class="commentary-feed" style="margin-top:8px;">
            ${(st.log || []).map(l => `<div class="comm-item">${formatRichText(l)}</div>`).join('')}
          </div>
        </div>
      `;
    }
  };

  const bindCtrlEvents = () => {
    const showNow = document.getElementById('btn-chal-show-result-now');
    if (showNow) showNow.onclick = () => { showingFinalResult = true; updatePanels(); };

    const refBtn = document.getElementById('btn-pvp-refresh');
    if (refBtn) refBtn.onclick = () => { cleanup(); onReloadHub(); };

    document.querySelectorAll('.step-crumb.done[data-pvp-j]').forEach(c => c.onclick = () => {
      const t = c.dataset.pvpJ;
      batStep = t;
      if (t === 'stance') { selStance = null; selFootwork = null; selIntent = null; selZone = null; }
      else if (t === 'footwork') { selFootwork = null; selIntent = null; selZone = null; }
      else if (t === 'intent') { selIntent = null; selZone = null; }
      syncCanvasConfig(); updatePanels();
    });
    document.querySelectorAll('.step-crumb.done[data-pvp-bj]').forEach(c => c.onclick = () => {
      const t = c.dataset.pvpBj;
      bowlStep = t;
      if (t === 'line') { selLine = null; selLength = null; selVar = null; }
      else if (t === 'length') { selLength = null; selVar = null; }
      else if (t === 'variation') { selVar = null; }
      updatePanels();
    });

    document.querySelectorAll('.pvp-st-btn').forEach(b => b.onclick = () => { selStance = b.dataset.val; batStep = 'footwork'; cricketAudio.playUiTick(); syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-fw-btn').forEach(b => b.onclick = () => { selFootwork = b.dataset.val; batStep = selFootwork === 'Leave' ? 'leave_confirm' : 'intent'; cricketAudio.playUiTick(); syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-in-btn').forEach(b => b.onclick = () => { selIntent = b.dataset.val; batStep = selIntent === 'Leave' ? 'leave_confirm' : 'zone'; cricketAudio.playUiTick(); syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-z-btn').forEach(b => b.onclick = () => { selZone = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-back-st').forEach(b => b.onclick = () => { batStep = 'stance'; selStance = null; selFootwork = null; selZone = null; syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-back-fw').forEach(b => b.onclick = () => { batStep = 'footwork'; selFootwork = null; selIntent = null; selZone = null; syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-back-in').forEach(b => b.onclick = () => { batStep = 'intent'; selIntent = null; selZone = null; syncCanvasConfig(); updatePanels(); });

    document.querySelectorAll('.pvp-bl-btn').forEach(b => b.onclick = () => { selLine = b.dataset.val; bowlStep = 'length'; cricketAudio.playUiTick(); updatePanels(); });
    document.querySelectorAll('.pvp-bln-btn').forEach(b => b.onclick = () => { selLength = b.dataset.val; bowlStep = 'variation'; cricketAudio.playUiTick(); updatePanels(); });
    document.querySelectorAll('.pvp-bv-btn').forEach(b => b.onclick = () => { selVar = b.dataset.val; bowlStep = 'field'; cricketAudio.playUiTick(); updatePanels(); });
    document.querySelectorAll('.pvp-bf-btn').forEach(b => b.onclick = () => { selField = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updatePanels(); });
    document.querySelectorAll('.pvp-bb-line').forEach(b => b.onclick = () => { bowlStep = 'line'; selLine = null; updatePanels(); });
    document.querySelectorAll('.pvp-bb-len').forEach(b => b.onclick = () => { bowlStep = 'length'; selLength = null; updatePanels(); });
    document.querySelectorAll('.pvp-bb-var').forEach(b => b.onclick = () => { bowlStep = 'variation'; selVar = null; updatePanels(); });

    const tt = document.getElementById('btn-pvp-toggle-t');
    if (tt) tt.onclick = () => { timingMode = timingMode === 'meter' ? 'auto' : 'meter'; updatePanels(); };

    const sub = document.getElementById('btn-pvp-submit');
    if (sub) sub.onclick = submitPlay;

    const st = duel.state || {};
    const isBatter = st.batterId === state.player.discord_id;
    if (duel.status === 'active' && isBatter && st.pendingDelivery && batStep === 'zone' && timingMode === 'meter') {
      startNeedle();
    } else {
      stopNeedle();
    }
  };

  const onKeyDown = (e) => {
    if (duel.status !== 'active') return;
    const tag = String(document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((e.code === 'Space' || e.code === 'Enter') &&
        ((batStep === 'zone' || batStep === 'leave_confirm') || bowlStep === 'field')) {
      e.preventDefault();
      submitPlay();
    }
  };

  if (showingFinalResult) {
    updatePanels();
    return cleanup;
  }

  hostEl.innerHTML = `
    <div id="pvp-scorebug"></div>
    <div class="match-layout arcade-grid">
      <div class="card card-glow-emerald" style="padding:12px;">
        <div class="arcade-canvas-toolbar">
          <span class="badge badge-emerald">⚔️ LIVE DUEL</span>
          <button class="btn btn-sm" id="btn-pvp-mute">${cricketAudio.muted ? '🔇 Audio OFF' : '🔊 Audio ON'}</button>
        </div>
        <div class="arcade-canvas-shell">
          <canvas id="pvp-arcade-canvas" class="arcade-canvas"></canvas>
        </div>
        <div id="pvp-controls-host" style="margin-top:12px;"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div id="pvp-outcome-host"></div>
        <div id="pvp-comm-host"></div>
      </div>
    </div>
  `;

  renderer = new CricketArcadeRenderer(document.getElementById('pvp-arcade-canvas'), {
    onSelectZone: (z) => {
      if (batStep !== 'zone') return;
      selZone = z;
      syncCanvasConfig();
      updatePanels();
    },
    onSelectBowlSpot: ({ line, length }) => { selLine = line; selLength = length; if (bowlStep === 'line' || bowlStep === 'length') bowlStep = 'variation'; updatePanels(); }
  });
  document.getElementById('btn-pvp-mute').onclick = () => {
    const m = cricketAudio.toggleMute();
    document.getElementById('btn-pvp-mute').textContent = m ? '🔇 Audio OFF' : '🔊 Audio ON';
  };
  window.addEventListener('keydown', onKeyDown);
  syncCanvasConfig();
  updatePanels();

  return cleanup;
}
