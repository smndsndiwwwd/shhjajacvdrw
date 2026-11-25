import { api, esc, formatRichText, toast } from '../api.js';
import { caIcon } from '../components/icons.js';
import { renderHawkEyePitchSVG } from '../components/gearSvg.js';
import { CricketArcadeRenderer, WAGON_ZONES } from '../engine/cricketCanvas.js';
import { cricketAudio } from '../engine/cricketAudio.js';

export function renderMatchView(container, state, onMatchUpdate, navigate) {
  let match = state.activeMatch;
  let shotMapCache = null;
  let arenaMounted = false;
  let renderer = null;
  let busy = false;
  let finishTimer = null;

  // Step-by-Step Selection State
  let batStep = 'stance'; // 'stance' -> 'footwork' -> 'intent' -> 'zone' | 'leave_confirm'
  let selStance = null;
  let selFootwork = null;
  let selIntent = null;
  let selZone = null;

  let bowlStep = 'line'; // 'line' -> 'length' -> 'variation' -> 'field'
  let selLine = null;
  let selLength = null;
  let selVar = null;
  let selField = 'Balanced';
  let selSpeed = match?.isSpinBowler ? 'Slow' : 'Fast';

  // Live Timing Meter State
  let timingMode = 'meter'; // 'meter' | 'auto'
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
    const tp = match?.timingProfile || { needleSpeed: 0.78 };
    const baseSpeed = tp.needleSpeed || 0.78;
    let lastTs = null;
    const tick = (ts) => {
      const el = document.getElementById('timing-needle');
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
    const tp = match?.timingProfile || { sweetHalf: 17, goodHalf: 38 };
    const dist = Math.abs(needlePos - 50);
    if (dist <= tp.sweetHalf) return 'Perfect';
    if (dist <= tp.goodHalf) return needlePos < 50 ? 'Slightly Early' : 'Slightly Late';
    return needlePos < 50 ? 'Very Early' : 'Very Late';
  };

  const resetBatSteps = () => {
    batStep = 'stance';
    selStance = null;
    selFootwork = null;
    selIntent = null;
    selZone = null;
  };

  const resetBowlSteps = () => {
    bowlStep = 'line';
    selLine = null;
    selLength = null;
    selVar = null;
    selField = 'Balanced';
    selSpeed = match?.isSpinBowler ? 'Slow' : 'Fast';
  };

  const cleanupAll = () => {
    stopNeedle();
    if (finishTimer) {
      clearTimeout(finishTimer);
      finishTimer = null;
    }
    window.removeEventListener('keydown', onKeyDown);
    if (renderer) {
      renderer.destroy();
      renderer = null;
    }
    arenaMounted = false;
  };

  api('/api/shotmap', { silent: true }).then(data => {
    shotMapCache = data;
    const box = document.getElementById('equipped-shot-preview');
    if (box) box.innerHTML = buildEquippedShotPreview();
  }).catch(() => {});

  const buildEquippedShotPreview = () => {
    if (!shotMapCache || !selFootwork || !selIntent || !selZone) return '';
    const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
    const key = isLeave ? `${selFootwork !== 'Leave' ? selFootwork : 'Front Foot'}_Leave_In Line` : `${selFootwork}_${selIntent}_${selZone}`;
    const pool = shotMapCache.catalog?.[key] || [];
    const eqId = shotMapCache.preset?.[key] || pool[0]?.id;
    const shot = pool.find(s => s.id === eqId) || pool[0];
    if (!shot) return '';
    return `
      <div class="equipped-shot-chip">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong style="color:var(--emerald);">🏏 Equipped Shot: ${esc(shot.num)} ${esc(shot.name)}</strong>
          <span class="badge badge-cyan">${esc(shot.style)}</span>
        </div>
      </div>
    `;
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
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;line-height:1.45;">${formatRichText(lb.commentary)}</div>
          </div>
        </div>
      </div>
    `;
  };

  const getCurrentBallHint = () => {
    if (match?.currentBallPreview?.length) return match.currentBallPreview;
    const rev = `${match?.fullDeliveryReveal || ''} ${match?.releaseCue || ''}`;
    let length = null;
    if (/full toss/i.test(rev)) length = 'Full Toss';
    else if (/yorker/i.test(rev)) length = 'Yorker';
    else if (/good length/i.test(rev)) length = 'Good Length';
    else if (/\bfull\b/i.test(rev)) length = 'Full';
    else if (/\bshort\b/i.test(rev)) length = 'Short';

    let line = null;
    if (/off side/i.test(rev)) line = 'Off Side';
    else if (/leg side/i.test(rev)) line = 'Leg Side';
    else if (/wide/i.test(rev)) line = 'Wide';
    else if (/stumps/i.test(rev)) line = 'Stumps';

    const speed = /\bfast\b/i.test(rev) ? 'Fast' : /\bslow\b/i.test(rev) ? 'Slow' : 'Medium';
    return length ? { length, line, speed } : null;
  };

  const syncCanvasConfig = () => {
    if (!renderer || !match) return;
    const isBat = match.phase === 'batting';
    const handStr = isBat ? match.battingHand : match.oppBatterHand;
    const isLeftHand = String(handStr || '').toLowerCase().includes('left');
    const curHint = isBat && !match.finished ? getCurrentBallHint() : null;
    renderer.updateConfig({
      phase: match.phase,
      pitch: match.pitch,
      fieldPreset: isBat ? (match.fieldPreset || 'Balanced') : selField,
      isPowerplay: Boolean(match.isPowerplay),
      isLeftHand,
      selectedStance: selStance || 'In Line',
      selectedFootwork: selFootwork || 'Front Foot',
      selectedIntent: selIntent || 'Stroke',
      selectedZone: (batStep === 'zone' && selZone) ? selZone : null,
      allowZoneClick: batStep === 'zone',
      currentBallHint: curHint ? { ...curHint, fullReveal: batStep === 'zone' } : null
    });
  };

  const scrollToStadiumCanvas = () => {
    const shell = document.getElementById('cricket-arcade-canvas')?.closest('.arcade-canvas-shell') || document.getElementById('cricket-arcade-canvas');
    if (shell && typeof shell.scrollIntoView === 'function') {
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const submitDelivery = async () => {
    if (busy || !match || match.finished) return;
    const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
    if (match.phase === 'batting' && !isLeave && batStep === 'zone' && !selZone) {
      toast('Pick a direction (Wagon Zone or click field) first!', 'info');
      return;
    }
    busy = true;
    cricketAudio.ensureContext();

    if (match.phase === 'batting') {
      const timingQuality = evaluateNeedle();
      const capturedNeedle = timingMode === 'meter' ? Math.round(needlePos * 10) / 10 : null;
      const usedZone = selZone || 'Cover';
      stopNeedle();
      try {
        const res = await api('/api/match/ball', {
          method: 'POST',
          body: {
            stance: selStance || 'In Line',
            footwork: selFootwork || 'Front Foot',
            intent: selIntent || 'Stroke',
            zone: usedZone,
            timingQuality,
            needlePos: capturedNeedle
          }
        });
        match = res.match;
        resetBatSteps();
        resetBowlSteps();
        syncCanvasConfig();
        scrollToStadiumCanvas();
        if (renderer && match.lastBall) {
          renderer.playBallAnimation(match.lastBall, { zone: match.lastBall.actualZone || usedZone });
        }
        updateArenaPanels();
        await onMatchUpdate(match);

        // If the match just finished on this ball, let the final delivery animate completely first!
        if (match.finished) {
          finishTimer = setTimeout(() => {
            if (!match) return;
            cleanupAll();
            renderFinishedView();
          }, 2600);
        }
      } catch {} finally {
        busy = false;
      }
    } else {
      try {
        const res = await api('/api/match/ball', {
          method: 'POST',
          body: {
            line: selLine || 'Stumps',
            length: selLength || 'Good Length',
            variation: selVar || 'Normal Delivery',
            fieldPreset: selField || 'Balanced',
            speed: selSpeed || (match.isSpinBowler ? 'Slow' : 'Fast')
          }
        });
        match = res.match;
        resetBowlSteps();
        syncCanvasConfig();
        scrollToStadiumCanvas();
        if (renderer && match.lastBall) renderer.playBallAnimation(match.lastBall, {});
        updateArenaPanels();
        await onMatchUpdate(match);

        if (match.finished) {
          finishTimer = setTimeout(() => {
            if (!match) return;
            cleanupAll();
            renderFinishedView();
          }, 2600);
        }
      } catch {} finally {
        busy = false;
      }
    }
  };

  const renderScorebug = () => {
    const b = match.batting;
    const bw = match.bowling;
    const isBat = match.phase === 'batting';
    const curVal = isBat ? b.teamRuns : bw.runsConceded;
    const tgtVal = isBat ? b.targetRuns : bw.targetRuns;
    const pct = Math.min(100, Math.round((curVal / Math.max(1, tgtVal)) * 100));
    const needRuns = Math.max(0, tgtVal - curVal);
    const ballsRem = isBat ? Math.max(0, b.ballsLimit - b.balls) : Math.max(0, bw.ballsLimit - bw.ballsBowled);
    const ballsDone = isBat ? b.balls : bw.ballsBowled;
    const crr = ballsDone > 0 ? ((curVal / ballsDone) * 6).toFixed(2) : '0.00';
    const rrr = ballsRem > 0 ? ((needRuns / ballsRem) * 6).toFixed(2) : '0.00';
    const recentBalls = match.recentBalls || [];

    return `
      <div class="scoreboard-banner" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <span class="badge ${isBat ? 'badge-cyan' : 'badge-crimson'}">${isBat ? '🏏 BATTING INNINGS' : '🥎 BOWLING INNINGS'}</span>
              <span class="badge badge-muted">${esc(match.pitch)}</span>
              ${b.freeHit && isBat ? '<span class="badge badge-crimson">🚨 FREE HIT</span>' : ''}
              ${match.isPowerplay ? '<span class="badge badge-gold">⚡ POWERPLAY</span>' : '<span class="badge badge-muted">OPEN FIELD</span>'}
            </div>
            <h2 style="font-size:1.25rem;">${esc(match.title)} <span style="color:var(--text-muted);font-weight:400;">vs ${esc(match.opponent)}</span></h2>
          </div>

          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="text-align:right;">
              <div class="score-big">${curVal}/${isBat ? b.teamWickets : bw.wicketsTaken} <span style="font-size:0.95rem;color:var(--cyan);">(${esc(match.currentOverText)} ov)</span></div>
              <div class="mono" style="font-size:0.76rem;color:var(--gold);">Target ${tgtVal} • Need ${needRuns} off ${ballsRem}b • CRR ${crr} | RRR ${rrr}</div>
            </div>
            ${!match.finished ? `<button class="btn btn-danger btn-sm" id="btn-forfeit">🏳️ Forfeit</button>` : ''}
          </div>
        </div>

        <div class="progress-track" style="margin-top:10px;">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:10px;">
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.8rem;color:var(--text-muted);">
            <span>⭐ <strong style="color:#fff;">You: ${b.runs}* (${b.balls}b)</strong> [${b.fours}x4, ${b.sixes}x6]</span>
            <span>👤 <strong style="color:#fff;">${esc(b.partnerName)}:</strong> ${b.partnerRuns}* (${b.partnerBalls}b)</span>
            <span>🥎 <strong style="color:#fff;">${esc(match.bowler?.name)}</strong> (${esc(match.bowler?.style)})</span>
          </div>
          <div class="over-pills">
            <span class="label" style="margin:0 4px 0 0;">Over:</span>
            ${recentBalls.length > 0
              ? recentBalls.map(rv => `<span class="ball-pill ball-${esc(rv)}">${rv === '0' ? '•' : esc(rv)}</span>`).join('')
              : '<span style="font-size:0.74rem;color:var(--text-muted);">Opening Ball</span>'}
          </div>
        </div>
      </div>
    `;
  };

  const renderControlsHTML = () => {
    if (match.finished) {
      const r = match.resultSummary || {};
      return `
        <div class="card ${r.won ? 'card-glow-emerald' : 'card-glow-crimson'}" style="text-align:center;padding:18px;">
          <span class="badge ${r.won ? 'badge-emerald' : 'badge-crimson'}">${r.won ? '🏆 MATCH VICTORY' : '💔 INNINGS ENDED'}</span>
          <h3 style="margin:8px 0 4px;">${esc(r.headline || 'Match Concluded!')}</h3>
          <p style="font-size:0.84rem;color:var(--text-muted);margin:0 0 12px;">Watch the final delivery replay above, then open your full scorecard!</p>
          <button class="btn btn-primary btn-lg" id="btn-view-final-summary" style="width:100%;">🏆 View Full Match Summary ➡️</button>
        </div>
      `;
    }

    if (match.phase === 'batting') {
      const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
      const tp = match.timingProfile || { sweetHalf: 17, goodHalf: 38, eqTimingBonus: 0, playerEdge: 30, bowlerThreat: 25 };
      const redL = Math.max(2, Math.round(50 - tp.goodHalf));
      const greenL = Math.max(redL + 4, Math.round(50 - tp.sweetHalf));
      const greenR = Math.min(96, Math.round(50 + tp.sweetHalf));
      const redR = Math.min(98, Math.round(50 + tp.goodHalf));
      const barBg = `linear-gradient(90deg, #ef4444 0%, #f59e0b ${redL}%, #10b981 ${greenL}%, #34d399 50%, #10b981 ${greenR}%, #f59e0b ${redR}%, #ef4444 100%)`;

      // Only reveal FULL delivery at Step 4 ('zone'); Steps 1–3 show ONLY subtle initial cue!
      const topBanner = batStep === 'zone'
        ? (match.fullDeliveryReveal || match.releaseHint || 'Delivery incoming!')
        : (match.releaseCue || '👀 *Bowler runs in...*');

      return `
        <div class="release-banner ${batStep === 'zone' ? 'is-full-reveal' : ''}" style="margin-bottom:12px;">
          ${formatRichText(topBanner)}
        </div>

        <!-- Clickable Step-by-Step Breadcrumbs -->
        <div class="grid-4" style="gap:8px;margin-bottom:14px;">
          <div class="step-crumb ${selStance ? 'done' : batStep === 'stance' ? 'active' : ''}" data-jump="stance">
            <div class="label" style="margin:0;">1. Stance</div>
            <div style="font-weight:700;font-size:0.82rem;">${esc(selStance || (batStep === 'stance' ? 'Pick Guard' : 'Pending'))}</div>
          </div>
          <div class="step-crumb ${selFootwork ? 'done' : batStep === 'footwork' ? 'active' : ''}" data-jump="footwork">
            <div class="label" style="margin:0;">2. Footwork</div>
            <div style="font-weight:700;font-size:0.82rem;">${esc(selFootwork || (batStep === 'footwork' ? 'Pick Move' : 'Pending'))}</div>
          </div>
          <div class="step-crumb ${selIntent ? 'done' : batStep === 'intent' ? 'active' : ''}" data-jump="intent">
            <div class="label" style="margin:0;">3. Intent</div>
            <div style="font-weight:700;font-size:0.82rem;">${isLeave ? 'Leave' : esc(selIntent || (batStep === 'intent' ? 'Pick Intent' : 'Pending'))}</div>
          </div>
          <div class="step-crumb ${batStep === 'zone' ? 'active' : ''}">
            <div class="label" style="margin:0;">4. Zone &amp; Swing</div>
            <div style="font-weight:700;font-size:0.82rem;">${isLeave ? 'Leave' : esc(batStep === 'zone' ? (selZone || 'Pick Zone') : 'Locked')}</div>
          </div>
        </div>

        ${batStep === 'stance' ? `
          <h3 style="margin-bottom:10px;">🧍 Step 1: Take Your Guard &amp; Stance</h3>
          <div class="choice-grid-3">
            ${[
              { id: 'Off Side', ico: '➡️', sub: 'Guard outside off stump' },
              { id: 'In Line', ico: '⚖️', sub: 'Middle-stump guard' },
              { id: 'Leg Side', ico: '⬅️', sub: 'Open leg-side guard' }
            ].map(st => `
              <button class="choice-card bat-stance-btn" data-val="${st.id}">
                <span class="cc-title">${st.ico} ${st.id}</span>
                <span class="cc-sub">${st.sub}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}

        ${batStep === 'footwork' ? `
          <h3 style="margin-bottom:10px;">👣 Step 2: Commit Your Footwork</h3>
          <div class="choice-grid-2">
            ${[
              { id: 'Front Foot', ico: '🦶', sub: 'Stride forward down the crease' },
              { id: 'Back Foot', ico: '🔙', sub: 'Weight shifted back inside crease' },
              { id: 'Advanced', ico: '⚡', sub: 'Dance down the pitch' },
              { id: 'Leave', ico: '🛡️', sub: 'Shoulder arms cleanly' }
            ].map(fw => `
              <button class="choice-card bat-fw-btn" data-val="${fw.id}">
                <span class="cc-title">${fw.ico} ${fw.id === 'Leave' ? 'Leave Ball' : fw.id}</span>
                <span class="cc-sub">${fw.sub}</span>
              </button>
            `).join('')}
          </div>
          <button class="btn btn-sm bat-back-stance" style="margin-top:10px;">⬅️ Back to Stance</button>
        ` : ''}

        ${batStep === 'intent' ? `
          <h3 style="margin-bottom:10px;">🎯 Step 3: Choose Shot Intent</h3>
          <div class="choice-grid-2">
            <button class="choice-card bat-intent-btn" data-val="Push"><span class="cc-title">🛡️ Push</span><span class="cc-sub">Controlled touch with soft hands</span></button>
            <button class="choice-card bat-intent-btn" data-val="Stroke"><span class="cc-title">🏏 Stroke</span><span class="cc-sub">Full-faced drive through the line</span></button>
            <button class="choice-card bat-intent-btn" data-val="Loft"><span class="cc-title">🚀 Loft</span><span class="cc-sub">Aerial swing elevating the ball</span></button>
            <button class="choice-card bat-intent-btn" data-val="Leave"><span class="cc-title">🧘 Leave</span><span class="cc-sub">Let delivery pass cleanly</span></button>
          </div>
          <button class="btn btn-sm bat-back-fw" style="margin-top:10px;">⬅️ Back to Footwork</button>
        ` : ''}

        ${batStep === 'leave_confirm' ? `
          <div class="card" style="padding:14px;background:rgba(8,13,27,0.85);">
            <h3 style="margin-bottom:6px;">🧘 Confirm Leave</h3>
            <p style="color:var(--text-muted);font-size:0.84rem;margin:0 0 12px;">Let the delivery pass safely through to the wicketkeeper.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-emerald btn-lg" id="btn-arcade-deliver">✅ Confirm Leave (SPACE)</button>
              <button class="btn bat-back-fw">⬅️ Back</button>
            </div>
          </div>
        ` : ''}

        ${batStep === 'zone' ? `
          <h3 style="margin-bottom:8px;">📐 Step 4: Aim Wagon Zone &amp; Time Your Swing</h3>
          <div class="grid-4" style="gap:6px;margin-bottom:8px;">
            ${WAGON_ZONES.map((z, idx) => `
              <button class="btn btn-sm ${selZone === z ? 'btn-gold' : ''} bat-zone-btn" data-val="${z}">Z${idx + 1} ${z}</button>
            `).join('')}
          </div>

          <div id="equipped-shot-preview">${buildEquippedShotPreview()}</div>

          <div class="timing-meter-wrap" style="margin:10px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span class="label" style="margin:0;">⏱️ Timing Release Meter (${timingMode === 'meter' ? 'Interactive Skill' : 'Auto RPG Roll'})</span>
              <button class="btn btn-sm" id="btn-toggle-timing">${timingMode === 'meter' ? 'Switch to Auto-Roll' : 'Switch to Skill Meter'}</button>
            </div>
            <div class="timing-meta">
              <span style="color:var(--emerald);border-color:rgba(16,185,129,0.4);">Sweet Spot: ±${tp.sweetHalf}%</span>
              <span>Gear Bonus: ${tp.eqTimingBonus >= 0 ? '+' : ''}${tp.eqTimingBonus}</span>
              <span>Edge ${tp.playerEdge} vs Bowler ${tp.bowlerThreat}</span>
            </div>
            ${timingMode === 'meter' ? `
              <div class="timing-bar" style="background:${barBg};">
                <div class="timing-needle" id="timing-needle"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:4px;">
                <span>Early</span><span>Slight Early</span><span style="color:var(--emerald);font-weight:700;">SWEET SPOT</span><span>Slight Late</span><span>Late</span>
              </div>
            ` : `<div style="font-size:0.82rem;color:var(--text-muted);">Auto-roll weighs Gear Timing (+${tp.eqTimingBonus}) &amp; Confidence vs Bowler (${tp.bowlerThreat}).</div>`}
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-emerald btn-lg" id="btn-arcade-deliver" style="flex:1;" ${!selZone ? 'disabled' : ''}>
              ${selZone ? `🏏 SWING SHOT ➔ ${esc(selZone)} (SPACE)` : '👆 Pick a Direction Above or on Field'}
            </button>
            <button class="btn bat-back-intent">⬅️ Back</button>
          </div>
        ` : ''}
      `;
    }

    // BOWLING STEP-BY-STEP FLOW (1. Line -> 2. Length -> 3. Craft -> 4. Field & Pace)
    const isSpin = match.isSpinBowler;
    return `
      <div class="grid-4" style="gap:8px;margin-bottom:14px;">
        <div class="step-crumb ${selLine ? 'done' : bowlStep === 'line' ? 'active' : ''}" data-bj="line">
          <div class="label" style="margin:0;">1. Line</div>
          <div style="font-weight:700;font-size:0.82rem;">${esc(selLine || (bowlStep === 'line' ? 'Pick Line' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selLength ? 'done' : bowlStep === 'length' ? 'active' : ''}" data-bj="length">
          <div class="label" style="margin:0;">2. Length</div>
          <div style="font-weight:700;font-size:0.82rem;">${esc(selLength || (bowlStep === 'length' ? 'Pick Length' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selVar ? 'done' : bowlStep === 'variation' ? 'active' : ''}" data-bj="variation">
          <div class="label" style="margin:0;">3. Craft</div>
          <div style="font-weight:700;font-size:0.82rem;">${esc(selVar || (bowlStep === 'variation' ? 'Pick Craft' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${bowlStep === 'field' ? 'active' : ''}">
          <div class="label" style="margin:0;">4. Field &amp; Speed</div>
          <div style="font-weight:700;font-size:0.82rem;">${esc(selField)} (${esc(selSpeed)})</div>
        </div>
      </div>

      ${bowlStep === 'line' ? `
        <h3 style="margin-bottom:10px;">📐 Step 1: Select Delivery Line (or Click Pitch)</h3>
        <div class="choice-grid-2">
          <button class="choice-card bowl-line-btn" data-val="Stumps"><span class="cc-title">🎯 Stumps</span><span class="cc-sub">Straight toward middle &amp; off</span></button>
          <button class="choice-card bowl-line-btn" data-val="Off Side"><span class="cc-title">➡️ Off Side</span><span class="cc-sub">Outside the off-stump channel</span></button>
          <button class="choice-card bowl-line-btn" data-val="Leg Side"><span class="cc-title">⬅️ Leg Side</span><span class="cc-sub">On the batter&apos;s leg side</span></button>
          <button class="choice-card bowl-line-btn" data-val="Wide"><span class="cc-title">🚫 Wide Outside Off</span><span class="cc-sub">Wide outside the off-stump line</span></button>
        </div>
      ` : ''}

      ${bowlStep === 'length' ? `
        <h3 style="margin-bottom:10px;">📏 Step 2: Select Pitch Length</h3>
        <div class="choice-grid-2">
          <button class="choice-card bowl-len-btn" data-val="Yorker"><span class="cc-title">🎯 Yorker</span><span class="cc-sub">Right at the popping crease</span></button>
          <button class="choice-card bowl-len-btn" data-val="Full"><span class="cc-title">🏏 Full Length</span><span class="cc-sub">Pitched well forward</span></button>
          <button class="choice-card bowl-len-btn" data-val="Good Length"><span class="cc-title">⚖️ Good Length</span><span class="cc-sub">Three-quarter pitch zone</span></button>
          <button class="choice-card bowl-len-btn" data-val="Short"><span class="cc-title">🚀 Short Pitch</span><span class="cc-sub">Halfway down the track</span></button>
        </div>
        <button class="btn btn-sm bowl-back-line" style="margin-top:10px;">⬅️ Back to Line</button>
      ` : ''}

      ${bowlStep === 'variation' ? `
        <h3 style="margin-bottom:10px;">🌀 Step 3: Select Bowling Craft</h3>
        <div class="choice-grid-2">
          <button class="choice-card bowl-var-btn" data-val="Normal Delivery"><span class="cc-title">⚖️ ${isSpin ? 'Stock Turn' : 'Stock Seam'}</span><span class="cc-sub">Standard natural release</span></button>
          <button class="choice-card bowl-var-btn" data-val="Swing/Spin"><span class="cc-title">🌀 ${isSpin ? 'Drift / Arm Ball' : 'Swing Ball'}</span><span class="cc-sub">Airborne lateral drift</span></button>
          <button class="choice-card bowl-var-btn" data-val="Cutter/Googly"><span class="cc-title">🔄 ${isSpin ? 'Doosra / Googly' : 'Off/Leg Cutter'}</span><span class="cc-sub">Turn/cut off the pitch</span></button>
          <button class="choice-card bowl-var-btn" data-val="Slower Ball"><span class="cc-title">🐢 ${isSpin ? 'Flighted Loop' : 'Slower Ball'}</span><span class="cc-sub">Change of pace</span></button>
        </div>
        <button class="btn btn-sm bowl-back-len" style="margin-top:10px;">⬅️ Back to Length</button>
      ` : ''}

      ${bowlStep === 'field' ? `
        <h3 style="margin-bottom:8px;">👥 Step 4: Field Setup &amp; Pace Effort</h3>
        <div class="label">Field Preset (${match.isPowerplay ? '⚡ Powerplay: Max 2 Out' : '🏟️ Open Field: Max 5 Out'})</div>
        <div class="choice-grid-3" style="margin-bottom:12px;">
          ${[
            { id: 'Balanced', sub: match.isPowerplay ? '2 Out • 7 In Ring' : '5 Out • 4 In Ring' },
            { id: 'Attacking', sub: '2 Out • Slips & Catchers' },
            { id: 'Defensive', sub: match.isPowerplay ? '2 Out • 7 In Ring' : '5 Out • Deep Savers' }
          ].map(f => `
            <button class="choice-card ${selField === f.id ? 'selected' : ''} bowl-fld-btn" data-val="${f.id}">
              <span class="cc-title">${f.id}</span>
              <span class="cc-sub">${f.sub}</span>
            </button>
          `).join('')}
        </div>
        <div class="label">Pace / Flight Effort</div>
        <div class="grid-3" style="margin-bottom:14px;">
          ${['Fast', 'Medium', 'Slow'].map(sp => `
            <button class="btn ${selSpeed === sp ? 'btn-gold' : ''} bowl-spd-btn" data-val="${sp}">${sp}</button>
          `).join('')}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-emerald btn-lg" id="btn-arcade-deliver" style="flex:1;">🥎 DELIVER BALL (SPACE)</button>
          <button class="btn bowl-back-var">⬅️ Back</button>
        </div>
      ` : ''}
    `;
  };

  const bindControlsEvents = () => {
    const forfeitBtn = document.getElementById('btn-forfeit');
    if (forfeitBtn) forfeitBtn.onclick = async () => {
      const res = await api('/api/match/forfeit', { method: 'POST' });
      toast('Match forfeited.', 'error');
      match = res.match;
      cleanupAll();
      await onMatchUpdate(match);
      renderFinishedView();
    };

    const viewSummaryBtn = document.getElementById('btn-view-final-summary');
    if (viewSummaryBtn) viewSummaryBtn.onclick = () => {
      cleanupAll();
      renderFinishedView();
    };

    document.querySelectorAll('.step-crumb.done[data-jump]').forEach(c => c.onclick = () => {
      const t = c.dataset.jump;
      batStep = t;
      if (t === 'stance') { selStance = null; selFootwork = null; selIntent = null; selZone = null; }
      else if (t === 'footwork') { selFootwork = null; selIntent = null; selZone = null; }
      else if (t === 'intent') { selIntent = null; selZone = null; }
      syncCanvasConfig();
      updateControlsOnly();
    });

    document.querySelectorAll('.step-crumb.done[data-bj]').forEach(c => c.onclick = () => {
      const t = c.dataset.bj;
      bowlStep = t;
      if (t === 'line') { selLine = null; selLength = null; selVar = null; }
      else if (t === 'length') { selLength = null; selVar = null; }
      else if (t === 'variation') { selVar = null; }
      updateBowlCanvasSpot();
      updateControlsOnly();
    });

    document.querySelectorAll('.bat-stance-btn').forEach(b => b.onclick = () => {
      selStance = b.dataset.val; batStep = 'footwork'; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-fw-btn').forEach(b => b.onclick = () => {
      selFootwork = b.dataset.val;
      batStep = selFootwork === 'Leave' ? 'leave_confirm' : 'intent';
      cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-back-stance').forEach(b => b.onclick = () => {
      batStep = 'stance'; selStance = null; selFootwork = null; syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-back-fw').forEach(b => b.onclick = () => {
      batStep = 'footwork'; selFootwork = null; selIntent = null; syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-intent-btn').forEach(b => b.onclick = () => {
      selIntent = b.dataset.val;
      batStep = selIntent === 'Leave' ? 'leave_confirm' : 'zone';
      cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-back-intent').forEach(b => b.onclick = () => {
      batStep = 'intent'; selIntent = null; selZone = null; syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-zone-btn').forEach(b => b.onclick = () => {
      selZone = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });

    document.querySelectorAll('.bowl-line-btn').forEach(b => b.onclick = () => {
      selLine = b.dataset.val; bowlStep = 'length'; cricketAudio.playUiTick(); updateBowlCanvasSpot(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-back-line').forEach(b => b.onclick = () => {
      bowlStep = 'line'; selLine = null; selLength = null; updateBowlCanvasSpot(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-len-btn').forEach(b => b.onclick = () => {
      selLength = b.dataset.val; bowlStep = 'variation'; cricketAudio.playUiTick(); updateBowlCanvasSpot(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-back-len').forEach(b => b.onclick = () => {
      bowlStep = 'length'; selLength = null; selVar = null; updateBowlCanvasSpot(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-var-btn').forEach(b => b.onclick = () => {
      selVar = b.dataset.val; bowlStep = 'field'; cricketAudio.playUiTick(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-back-var').forEach(b => b.onclick = () => {
      bowlStep = 'variation'; selVar = null; updateControlsOnly();
    });
    document.querySelectorAll('.bowl-fld-btn').forEach(b => b.onclick = () => {
      selField = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-spd-btn').forEach(b => b.onclick = () => {
      selSpeed = b.dataset.val; cricketAudio.playUiTick(); updateControlsOnly();
    });

    const toggleTiming = document.getElementById('btn-toggle-timing');
    if (toggleTiming) toggleTiming.onclick = () => {
      timingMode = timingMode === 'meter' ? 'auto' : 'meter';
      updateControlsOnly();
    };

    const deliverBtn = document.getElementById('btn-arcade-deliver');
    if (deliverBtn) deliverBtn.onclick = submitDelivery;

    if (!match.finished && match.phase === 'batting' && batStep === 'zone' && timingMode === 'meter') {
      startNeedle();
    } else {
      stopNeedle();
    }
  };

  const updateBowlCanvasSpot = () => {
    if (!renderer) return;
    const pt = renderer.deliveryToWorldPoint({ line: selLine || 'Stumps', length: selLength || 'Good Length' });
    renderer.updateConfig({
      bowlPitchTarget: { wx: pt.wx, wy: pt.wy, line: selLine || 'Stumps', length: selLength || 'Good Length' }
    });
  };

  const renderPitchMapHTML = () => {
    const isBat = match.phase === 'batting';
    const curDeliv = match.finished
      ? (match.lastBall?.delivery || null)
      : isBat
        ? getCurrentBallHint()
        : { line: selLine || 'Stumps', length: selLength || 'Good Length', speed: selSpeed || 'Fast' };
    const lengthOnly = !match.finished && isBat && batStep !== 'zone';
    const caption = !curDeliv
      ? 'Awaiting delivery'
      : lengthOnly
        ? `Length Hint: ${esc(curDeliv.length)} • Line reveals at Step 4`
        : `${esc(curDeliv.length)} • ${esc(curDeliv.line || 'Stumps')} (${esc(curDeliv.speed || 'Medium')})`;
    return `
      <div class="card" style="padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h4 style="font-size:0.95rem;">🎯 Pitch Map</h4>
          <span class="badge ${match.finished ? 'badge-muted' : 'badge-cyan'}">${match.finished ? 'Final Ball' : 'Current Ball'}</span>
        </div>
        ${renderHawkEyePitchSVG({
          delivery: curDeliv,
          lengthOnly,
          battingHand: isBat ? match.battingHand : match.oppBatterHand
        })}
        <div class="mono" style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:6px;">
          ${caption}
        </div>
      </div>
    `;
  };

  const updateControlsOnly = () => {
    const ctrlHost = document.getElementById('arcade-controls-host');
    if (!ctrlHost || !match) return;
    ctrlHost.innerHTML = renderControlsHTML();
    bindControlsEvents();
    const pmHost = document.getElementById('arcade-pitch-map-host');
    if (pmHost) pmHost.innerHTML = renderPitchMapHTML();
  };

  const updateArenaPanels = () => {
    const sb = document.getElementById('arcade-scorebug');
    if (sb) sb.innerHTML = renderScorebug();

    const outHost = document.getElementById('arcade-outcome-host');
    if (outHost) {
      outHost.innerHTML = `
        ${renderOutcomeBanner(match.lastBall)}
        <div id="arcade-pitch-map-host">${renderPitchMapHTML()}</div>
      `;
    }

    const commHost = document.getElementById('arcade-comm-host');
    if (commHost) {
      commHost.innerHTML = `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h4>🎙️ Live Commentary</h4>
            <span class="badge badge-muted">Ball-by-Ball</span>
          </div>
          <div class="commentary-feed">
            ${(match.commentaryLog || []).map(l => {
              const lower = String(l).toLowerCase();
              const cls = (lower.includes('wicket') || lower.includes('out!') || lower.includes('bowled') || lower.includes('caught') || lower.includes('lbw'))
                ? 'comm-wicket'
                : (lower.includes('four') || lower.includes('six') || lower.includes('boundary') || lower.includes('maximum'))
                  ? 'comm-boundary'
                  : '';
              return `<div class="comm-item ${cls}">${formatRichText(l)}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    updateControlsOnly();
  };

  const onKeyDown = (e) => {
    if (!match || match.finished) return;
    const tag = String(document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.code === 'KeyM') {
      const m = cricketAudio.toggleMute();
      const muteBtn = document.getElementById('btn-arcade-mute');
      if (muteBtn) muteBtn.textContent = m ? '🔇 Audio OFF' : '🔊 Audio ON';
      return;
    }

    if ((e.code === 'Space' || e.code === 'Enter') &&
        ((match.phase === 'batting' && (batStep === 'zone' || batStep === 'leave_confirm')) ||
         (match.phase === 'bowling' && bowlStep === 'field'))) {
      e.preventDefault();
      submitDelivery();
      return;
    }

    if (match.phase === 'batting' && batStep === 'zone') {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        selZone = WAGON_ZONES[(WAGON_ZONES.indexOf(selZone) + 1) % WAGON_ZONES.length];
        syncCanvasConfig();
        updateControlsOnly();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        selZone = WAGON_ZONES[(WAGON_ZONES.indexOf(selZone) - 1 + WAGON_ZONES.length) % WAGON_ZONES.length];
        syncCanvasConfig();
        updateControlsOnly();
      }
    }
  };

  const renderFinishedView = () => {
    const r = match.resultSummary || {};
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;max-width:920px;margin:0 auto;">
        <div class="card ${r.won ? 'card-glow-emerald' : 'card-glow-crimson'}" style="text-align:center;padding:28px;">
          <span class="badge ${r.won ? 'badge-emerald' : 'badge-crimson'}">${r.won ? '🏆 VICTORY' : '💔 MATCH COMPLETE'}</span>
          <h1 style="font-size:2rem;margin:10px 0 6px;">${esc(r.headline || match.title)}</h1>
          <p style="color:var(--text-muted);max-width:620px;margin:0 auto 18px;">${esc(r.reason || '')}</p>
          <div class="grid-4" style="max-width:740px;margin:0 auto;gap:10px;">
            <div class="card" style="padding:12px;"><div class="label">Batting</div><div class="stat-big" style="font-size:1.45rem;">${match.batting.runs} (${match.batting.balls}b)</div></div>
            <div class="card" style="padding:12px;"><div class="label">Bowling</div><div class="stat-big" style="font-size:1.45rem;">${match.bowling.wicketsTaken}/${match.bowling.runsConceded}</div></div>
            <div class="card" style="padding:12px;"><div class="label">XP Earned</div><div class="stat-big ic-val" style="font-size:1.45rem;color:var(--cyan);justify-content:center;">${caIcon('skill', 18)} +${r.xpEarned || 0}</div></div>
            <div class="card" style="padding:12px;"><div class="label">Coins Earned</div><div class="stat-big ic-val" style="font-size:1.45rem;color:var(--gold);justify-content:center;">${caIcon('coin', 18)} +${r.coinsEarned || 0}</div></div>
          </div>
          ${(r.extraNotes || []).length > 0 ? `<div style="margin-top:16px;color:var(--emerald);font-weight:600;">${r.extraNotes.map(n => `<div>• ${esc(n)}</div>`).join('')}</div>` : ''}
        </div>

        ${match.lastBall ? `
          <div>
            <div class="label" style="margin-bottom:6px;">🎬 Final Ball Outcome</div>
            ${renderOutcomeBanner(match.lastBall)}
          </div>
        ` : ''}

        ${match.storyEvent ? `
          <div class="card card-glow-gold" id="story-event-box">
            <span class="badge badge-gold">⚡ INTERACTIVE CAREER DECISION</span>
            <h3 style="margin:8px 0 6px;">${esc(match.storyEvent.title)}</h3>
            <p style="color:var(--text-muted);margin:0 0 14px;">${esc(match.storyEvent.description)}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${match.storyEvent.choices.map(c => `<button class="btn btn-gold story-choice-btn" data-idx="${c.index}">${esc(c.label)}</button>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="card">
          <h3 style="margin-bottom:10px;">🎙️ Match Commentary Highlights</h3>
          <div class="commentary-feed">${(match.commentaryLog || []).map(l => `<div class="comm-item">${formatRichText(l)}</div>`).join('')}</div>
          <div style="margin-top:16px;display:flex;justify-content:flex-end;">
            <button class="btn btn-primary btn-lg" id="btn-finish-clear">✅ Return to Career Hub</button>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.story-choice-btn').forEach(btn => {
      btn.onclick = async () => {
        try {
          const res = await api('/api/match/event', {
            method: 'POST',
            body: { event_id: match.storyEvent.id, choice_index: Number(btn.dataset.idx) }
          });
          match.storyEvent = null;
          document.getElementById('story-event-box').innerHTML = `
            <span class="badge badge-emerald">✅ Decision Recorded</span>
            <p style="margin:8px 0 0;"><strong>${esc(res.outcome.label)}</strong>: ${esc(res.outcome.resultText)}</p>
          `;
          toast('Career choice saved!', 'success');
        } catch {}
      };
    });

    document.getElementById('btn-finish-clear').onclick = async () => {
      await api('/api/match/clear', { method: 'POST' });
      await onMatchUpdate(null);
      navigate(match.mode === 'franchise' ? 'franchise' : match.mode === 'tournament' || match.mode === 'quick' ? 'tournaments' : 'dashboard');
    };
  };

  const mountOrRender = () => {
    if (!match) {
      cleanupAll();
      container.innerHTML = `
        <div class="card card-glow-cyan" style="max-width:680px;margin:20px auto;text-align:center;padding:36px;">
          <h2>🏟️ No Live Match in Progress</h2>
          <p style="color:var(--text-muted);margin:10px 0 22px;">Launch a Career Chapter, Practice Nets, Quick Exhibition, Tournament Knockout, or Franchise Match Day!</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-emerald" id="go-camp">🏏 Career &amp; Practice</button>
            <button class="btn btn-primary" id="go-tourn">🏆 Tournaments</button>
            <button class="btn btn-gold" id="go-fran">🏟️ Franchise League</button>
          </div>
        </div>
      `;
      document.getElementById('go-camp').onclick = () => navigate('campaign');
      document.getElementById('go-tourn').onclick = () => navigate('tournaments');
      document.getElementById('go-fran').onclick = () => navigate('franchise');
      return;
    }

    if (match.finished) {
      cleanupAll();
      renderFinishedView();
      return;
    }

    if (!arenaMounted) {
      arenaMounted = true;
      container.innerHTML = `
        <div>
          <div id="arcade-scorebug"></div>

          <div class="match-layout arcade-grid">
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div class="card card-glow-emerald" style="padding:12px;">
                <div class="arcade-canvas-toolbar">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="badge badge-emerald">🏟️ LIVE MATCH</span>
                    <span class="mono arcade-key-hint" style="font-size:0.72rem;color:var(--text-muted);">Click field to aim • Space: Play • M: Mute</span>
                  </div>
                  <button class="btn btn-sm" id="btn-arcade-mute">${cricketAudio.muted ? '🔇 Audio OFF' : '🔊 Audio ON'}</button>
                </div>

                <div class="arcade-canvas-shell">
                  <canvas id="cricket-arcade-canvas" class="arcade-canvas"></canvas>
                </div>

                <div id="arcade-controls-host" style="margin-top:12px;"></div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:14px;">
              <div id="arcade-outcome-host"></div>
              <div id="arcade-comm-host"></div>
            </div>
          </div>
        </div>
      `;

      const canvasEl = document.getElementById('cricket-arcade-canvas');
      renderer = new CricketArcadeRenderer(canvasEl, {
        onSelectZone: (zone) => {
          if (batStep !== 'zone') return;
          selZone = zone;
          syncCanvasConfig();
          updateControlsOnly();
        },
        onSelectBowlSpot: ({ line, length }) => {
          selLine = line;
          selLength = length;
          if (bowlStep === 'line' || bowlStep === 'length') bowlStep = 'variation';
          updateControlsOnly();
        }
      });

      document.getElementById('btn-arcade-mute').onclick = () => {
        const muted = cricketAudio.toggleMute();
        document.getElementById('btn-arcade-mute').textContent = muted ? '🔇 Audio OFF' : '🔊 Audio ON';
      };

      window.addEventListener('keydown', onKeyDown);
      syncCanvasConfig();
    }

    updateArenaPanels();
  };

  mountOrRender();
  return cleanupAll;
}
