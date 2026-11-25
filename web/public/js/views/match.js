import { api, esc, formatRichText, toast } from '../api.js';
import { renderHawkEyePitchSVG } from '../components/gearSvg.js';
import { CricketArcadeRenderer, WAGON_ZONES } from '../engine/cricketCanvas.js';
import { cricketAudio } from '../engine/cricketAudio.js';

export function renderMatchView(container, state, onMatchUpdate, navigate) {
  let match = state.activeMatch;
  let shotMapCache = null;
  let arenaMounted = false;
  let renderer = null;
  let busy = false;

  // Interactive Batting State (pre-selected clean defaults for instant arcade play)
  let selStance = 'In Line';
  let selFootwork = 'Front Foot';
  let selIntent = 'Stroke';
  let selZone = 'Cover';

  // Interactive Bowling State
  let selLine = 'Stumps';
  let selLength = 'Good Length';
  let selVar = 'Normal Delivery';
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

  const cleanupAll = () => {
    stopNeedle();
    window.removeEventListener('keydown', onKeyDown);
    if (renderer) {
      renderer.destroy();
      renderer = null;
    }
    arenaMounted = false;
  };

  // Preload player's custom shotmap
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
        <div style="color:var(--text-muted);font-size:0.78rem;margin-top:3px;">${esc(shot.desc)}</div>
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

  const syncCanvasConfig = () => {
    if (!renderer || !match) return;
    const isBat = match.phase === 'batting';
    const handStr = isBat ? match.battingHand : match.oppBatterHand;
    const isLeftHand = String(handStr || '').toLowerCase().includes('left');
    renderer.updateConfig({
      phase: match.phase,
      pitch: match.pitch,
      fieldPreset: isBat ? (match.fieldPreset || 'Balanced') : selField,
      isPowerplay: Boolean(match.isPowerplay),
      isLeftHand,
      selectedStance: selStance,
      selectedFootwork: selFootwork,
      selectedIntent: selIntent,
      selectedZone: selZone
    });
  };

  const submitDelivery = async () => {
    if (busy || !match || match.finished) return;
    busy = true;
    cricketAudio.ensureContext();

    if (match.phase === 'batting') {
      const timingQuality = evaluateNeedle();
      const capturedNeedle = timingMode === 'meter' ? Math.round(needlePos * 10) / 10 : null;
      stopNeedle();
      try {
        const res = await api('/api/match/ball', {
          method: 'POST',
          body: {
            stance: selStance,
            footwork: selFootwork,
            intent: selIntent,
            zone: selZone,
            timingQuality,
            needlePos: capturedNeedle
          }
        });
        match = res.match;
        const usedZone = selZone;
        if (match.finished) {
          cleanupAll();
          await onMatchUpdate(match);
          renderFinishedView();
          busy = false;
          return;
        }
        await onMatchUpdate(match);
        syncCanvasConfig();
        if (renderer && match.lastBall) renderer.playBallAnimation(match.lastBall, { zone: usedZone });
        updateArenaPanels();
      } catch {} finally {
        busy = false;
      }
    } else {
      try {
        const res = await api('/api/match/ball', {
          method: 'POST',
          body: {
            line: selLine,
            length: selLength,
            variation: selVar,
            fieldPreset: selField,
            speed: selSpeed
          }
        });
        match = res.match;
        if (match.finished) {
          cleanupAll();
          await onMatchUpdate(match);
          renderFinishedView();
          busy = false;
          return;
        }
        await onMatchUpdate(match);
        syncCanvasConfig();
        if (renderer && match.lastBall) renderer.playBallAnimation(match.lastBall, {});
        updateArenaPanels();
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
            <button class="btn btn-danger btn-sm" id="btn-forfeit">🏳️ Forfeit</button>
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
    if (match.phase === 'batting') {
      const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
      const tp = match.timingProfile || { sweetHalf: 17, goodHalf: 38, eqTimingBonus: 0, playerEdge: 30, bowlerThreat: 25 };
      const redL = Math.max(2, Math.round(50 - tp.goodHalf));
      const greenL = Math.max(redL + 4, Math.round(50 - tp.sweetHalf));
      const greenR = Math.min(96, Math.round(50 + tp.sweetHalf));
      const redR = Math.min(98, Math.round(50 + tp.goodHalf));
      const barBg = `linear-gradient(90deg, #ef4444 0%, #f59e0b ${redL}%, #10b981 ${greenL}%, #34d399 50%, #10b981 ${greenR}%, #f59e0b ${redR}%, #ef4444 100%)`;

      return `
        <div class="release-banner" style="margin-bottom:12px;">
          ${formatRichText(match.releaseHint || 'Bowler steaming in...')}
        </div>

        <div class="arcade-deck">
          <div>
            <div class="label">1. Stance Guard</div>
            <div class="pill-row">
              ${['Off Side', 'In Line', 'Leg Side'].map(st => `
                <button class="btn btn-sm ${selStance === st ? 'btn-primary' : ''} bat-stance-btn" data-val="${st}">${st}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <div class="label">2. Footwork</div>
            <div class="pill-row">
              ${['Front Foot', 'Back Foot', 'Advanced', 'Leave'].map(fw => `
                <button class="btn btn-sm ${selFootwork === fw ? 'btn-primary' : ''} bat-fw-btn" data-val="${fw}">${fw}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <div class="label">3. Shot Intent</div>
            <div class="pill-row">
              ${['Push', 'Stroke', 'Loft', 'Leave'].map(it => `
                <button class="btn btn-sm ${selIntent === it ? 'btn-emerald' : ''} bat-intent-btn" data-val="${it}">${it}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <div class="label">4. Direction Aim (Click Canvas or Select Zone)</div>
            <div class="grid-4" style="gap:6px;">
              ${WAGON_ZONES.map((z, idx) => `
                <button class="btn btn-sm ${!isLeave && selZone === z ? 'btn-gold' : ''} bat-zone-btn" data-val="${z}" ${isLeave ? 'disabled' : ''}>Z${idx + 1} ${z}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <div id="equipped-shot-preview">${buildEquippedShotPreview()}</div>

        ${!isLeave ? `
          <div class="timing-meter-wrap" style="margin:12px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span class="label" style="margin:0;">⏱️ Timing &amp; Power Meter (${timingMode === 'meter' ? 'Interactive Skill' : 'Auto RPG Roll'})</span>
              <button class="btn btn-sm" id="btn-toggle-timing">${timingMode === 'meter' ? 'Auto-Roll Mode' : 'Interactive Meter'}</button>
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
            ` : `<div style="font-size:0.82rem;color:var(--text-muted);">Auto-roll weighs your Gear Timing (+${tp.eqTimingBonus}) &amp; Confidence vs Bowler (${tp.bowlerThreat}).</div>`}
          </div>
        ` : `<div class="timing-meter-wrap" style="margin:12px 0;font-size:0.84rem;color:var(--text-muted);">Leaving delivery cleanly to pass through to keeper.</div>`}

        <button class="btn btn-emerald btn-lg" id="btn-arcade-deliver" style="width:100%;">
          ${isLeave ? '🛡️ CONFIRM LEAVE (SPACE)' : `🏏 SWING SHOT ➔ ${esc(selZone)} (SPACE)`}
        </button>
      `;
    }

    const isSpin = match.isSpinBowler;
    return `
      <div class="release-banner" style="margin-bottom:12px;">
        <strong>Interactive Bowling:</strong> Click directly on the <strong>22-Yard Pitch</strong> above to target Line &amp; Length, configure Craft &amp; Field Trap, and hit <strong>Deliver Ball</strong>!
      </div>

      <div class="arcade-deck">
        <div>
          <div class="label">1. Line Channel</div>
          <div class="pill-row">
            ${['Stumps', 'Off Side', 'Leg Side', 'Wide'].map(ln => `
              <button class="btn btn-sm ${selLine === ln ? 'btn-primary' : ''} bowl-line-btn" data-val="${ln}">${ln}</button>
            `).join('')}
          </div>
        </div>

        <div>
          <div class="label">2. Pitch Length</div>
          <div class="pill-row">
            ${['Yorker', 'Full', 'Good Length', 'Short'].map(le => `
              <button class="btn btn-sm ${selLength === le ? 'btn-primary' : ''} bowl-len-btn" data-val="${le}">${le}</button>
            `).join('')}
          </div>
        </div>

        <div>
          <div class="label">3. Delivery Craft</div>
          <div class="pill-row">
            ${[
              ['Normal Delivery', isSpin ? 'Stock Turn' : 'Stock Seam'],
              ['Swing/Spin', isSpin ? 'Drift / Arm' : 'Swing'],
              ['Cutter/Googly', isSpin ? 'Googly/Doosra' : 'Cutter'],
              ['Slower Ball', isSpin ? 'Loop' : 'Slower']
            ].map(([val, lbl]) => `
              <button class="btn btn-sm ${selVar === val ? 'btn-emerald' : ''} bowl-var-btn" data-val="${val}">${lbl}</button>
            `).join('')}
          </div>
        </div>

        <div class="grid-2" style="gap:10px;">
          <div>
            <div class="label">4. Field (${match.isPowerplay ? 'Max 2 Out' : 'Max 5 Out'})</div>
            <div class="pill-row">
              ${['Balanced', 'Attacking', 'Defensive'].map(fl => `
                <button class="btn btn-sm ${selField === fl ? 'btn-gold' : ''} bowl-fld-btn" data-val="${fl}">${fl}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="label">5. Effort Speed</div>
            <div class="pill-row">
              ${['Fast', 'Medium', 'Slow'].map(sp => `
                <button class="btn btn-sm ${selSpeed === sp ? 'btn-gold' : ''} bowl-spd-btn" data-val="${sp}">${sp}</button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <button class="btn btn-emerald btn-lg" id="btn-arcade-deliver" style="width:100%;margin-top:12px;">
        🥎 DELIVER BALL: ${esc(selLength)} ${esc(selLine)} (SPACE)
      </button>
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

    document.querySelectorAll('.bat-stance-btn').forEach(b => b.onclick = () => {
      selStance = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-fw-btn').forEach(b => b.onclick = () => {
      selFootwork = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-intent-btn').forEach(b => b.onclick = () => {
      selIntent = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });
    document.querySelectorAll('.bat-zone-btn').forEach(b => b.onclick = () => {
      selZone = b.dataset.val; cricketAudio.playUiTick(); syncCanvasConfig(); updateControlsOnly();
    });

    document.querySelectorAll('.bowl-line-btn').forEach(b => b.onclick = () => {
      selLine = b.dataset.val; cricketAudio.playUiTick(); updateBowlCanvasSpot(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-len-btn').forEach(b => b.onclick = () => {
      selLength = b.dataset.val; cricketAudio.playUiTick(); updateBowlCanvasSpot(); updateControlsOnly();
    });
    document.querySelectorAll('.bowl-var-btn').forEach(b => b.onclick = () => {
      selVar = b.dataset.val; cricketAudio.playUiTick(); updateControlsOnly();
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

    if (match.phase === 'batting' && timingMode === 'meter' && selFootwork !== 'Leave' && selIntent !== 'Leave') {
      startNeedle();
    } else {
      stopNeedle();
    }
  };

  const updateBowlCanvasSpot = () => {
    if (!renderer) return;
    const pt = renderer.deliveryToScreenPoint({ line: selLine, length: selLength });
    renderer.updateConfig({
      bowlPitchTarget: { x: pt.x, y: pt.y, line: selLine, length: selLength }
    });
  };

  const updateControlsOnly = () => {
    const ctrlHost = document.getElementById('arcade-controls-host');
    if (!ctrlHost || !match) return;
    ctrlHost.innerHTML = renderControlsHTML();
    bindControlsEvents();
  };

  const updateArenaPanels = () => {
    const sb = document.getElementById('arcade-scorebug');
    if (sb) sb.innerHTML = renderScorebug();

    const outHost = document.getElementById('arcade-outcome-host');
    if (outHost) {
      outHost.innerHTML = `
        ${renderOutcomeBanner(match.lastBall)}
        <div class="card" style="padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h4 style="font-size:0.95rem;">🎯 Hawk-Eye Pitch Tracker</h4>
            <span class="badge badge-muted">Last Ball</span>
          </div>
          ${renderHawkEyePitchSVG({
            delivery: match.lastBall?.delivery || null,
            battingHand: match.phase === 'batting' ? match.battingHand : match.oppBatterHand
          })}
          <div class="mono" style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:6px;">
            ${match.lastBall?.delivery
              ? `${esc(match.lastBall.delivery.length)} • ${esc(match.lastBall.delivery.line)} (${esc(match.lastBall.delivery.speed)})`
              : 'Awaiting delivery'}
          </div>
        </div>
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

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      submitDelivery();
      return;
    }

    if (match.phase === 'batting') {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        const i = WAGON_ZONES.indexOf(selZone);
        selZone = WAGON_ZONES[(i + 1) % WAGON_ZONES.length];
        syncCanvasConfig();
        updateControlsOnly();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        const i = WAGON_ZONES.indexOf(selZone);
        selZone = WAGON_ZONES[(i - 1 + WAGON_ZONES.length) % WAGON_ZONES.length];
        syncCanvasConfig();
        updateControlsOnly();
      } else if (e.key === '1') { selStance = 'Off Side'; syncCanvasConfig(); updateControlsOnly(); }
      else if (e.key === '2') { selStance = 'In Line'; syncCanvasConfig(); updateControlsOnly(); }
      else if (e.key === '3') { selStance = 'Leg Side'; syncCanvasConfig(); updateControlsOnly(); }
    } else {
      const lines = ['Stumps', 'Off Side', 'Leg Side', 'Wide'];
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        selLine = lines[(lines.indexOf(selLine) + 1) % lines.length];
        updateBowlCanvasSpot();
        updateControlsOnly();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        selLine = lines[(lines.indexOf(selLine) - 1 + lines.length) % lines.length];
        updateBowlCanvasSpot();
        updateControlsOnly();
      }
    }
  };

  const renderFinishedView = () => {
    const r = match.resultSummary || {};
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;max-width:920px;margin:0 auto;">
        <div class="card ${r.won ? 'card-glow-emerald' : 'card-glow-crimson'}" style="text-align:center;padding:30px;">
          <span class="badge ${r.won ? 'badge-emerald' : 'badge-crimson'}">${r.won ? '🏆 VICTORY' : '💔 MATCH COMPLETE'}</span>
          <h1 style="font-size:2.1rem;margin:10px 0 6px;">${esc(r.headline || match.title)}</h1>
          <p style="color:var(--text-muted);max-width:620px;margin:0 auto 18px;">${esc(r.reason || '')}</p>
          <div class="grid-4" style="max-width:740px;margin:0 auto;gap:10px;">
            <div class="card" style="padding:12px;"><div class="label">Batting</div><div class="stat-big" style="font-size:1.45rem;">${match.batting.runs} (${match.batting.balls}b)</div></div>
            <div class="card" style="padding:12px;"><div class="label">Bowling</div><div class="stat-big" style="font-size:1.45rem;">${match.bowling.wicketsTaken}/${match.bowling.runsConceded}</div></div>
            <div class="card" style="padding:12px;"><div class="label">XP Earned</div><div class="stat-big" style="font-size:1.45rem;color:var(--cyan);">+${r.xpEarned || 0}</div></div>
            <div class="card" style="padding:12px;"><div class="label">Coins Earned</div><div class="stat-big" style="font-size:1.45rem;color:var(--gold);">+${r.coinsEarned || 0}</div></div>
          </div>
          ${(r.extraNotes || []).length > 0 ? `<div style="margin-top:16px;color:var(--emerald);font-weight:600;">${r.extraNotes.map(n => `<div>• ${esc(n)}</div>`).join('')}</div>` : ''}
        </div>

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
            <!-- Persistent 60 FPS 2.5D Stadium Canvas + Controls -->
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div class="card card-glow-emerald" style="padding:12px;">
                <div class="arcade-canvas-toolbar">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="badge badge-emerald">🎮 2D STADIUM ARENA • 60 FPS</span>
                    <span class="mono" style="font-size:0.72rem;color:var(--text-muted);">Aim: Click Field / ◄ ► • Trigger: Space • Mute: M</span>
                  </div>
                  <button class="btn btn-sm" id="btn-arcade-mute">${cricketAudio.muted ? '🔇 Audio OFF' : '🔊 Audio ON'}</button>
                </div>

                <div class="arcade-canvas-shell">
                  <canvas id="cricket-arcade-canvas" class="arcade-canvas"></canvas>
                </div>

                <div id="arcade-controls-host" style="margin-top:12px;"></div>
              </div>
            </div>

            <!-- Right Column: Outcome Flash, Hawk-Eye Pitch & Commentary -->
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
          selZone = zone;
          updateControlsOnly();
        },
        onSelectBowlSpot: ({ line, length }) => {
          selLine = line;
          selLength = length;
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
