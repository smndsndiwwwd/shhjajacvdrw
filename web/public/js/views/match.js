import { api, esc, formatRichText, toast } from '../api.js';
import { renderFieldRadarSVG } from '../components/radar.js';
import { renderHawkEyePitchSVG } from '../components/gearSvg.js';

export function renderMatchView(container, state, onMatchUpdate, navigate) {
  let match = state.activeMatch;
  let shotMapCache = null;

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
  let selSpeed = match?.isSpinBowler ? 'Slow' : 'Fast';

  // Live Timing Meter State
  let timingMode = 'meter'; // 'meter' | 'auto'
  let needlePos = 50;
  let needleDir = 1;
  let rafId = null;

  // Preload player's custom shotmap for live signature shot previews
  api('/api/shotmap', { silent: true }).then(data => {
    shotMapCache = data;
    if (match && !match.finished && match.phase === 'batting' && batStep === 'zone') {
      const box = document.getElementById('equipped-shot-preview');
      if (box) box.innerHTML = buildEquippedShotPreview();
    }
  }).catch(() => {});

  const buildEquippedShotPreview = () => {
    if (!shotMapCache || !selFootwork || !selIntent || !selZone) return '';
    const key = `${selFootwork}_${selIntent}_${selZone}`;
    const pool = shotMapCache.catalog?.[key] || [];
    const eqId = shotMapCache.preset?.[key] || pool[0]?.id;
    const shot = pool.find(s => s.id === eqId) || pool[0];
    if (!shot) return '';
    return `
      <div style="padding:10px 12px;border-radius:10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.35);margin-top:10px;font-size:0.82rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong style="color:var(--emerald);">🏏 Equipped Shot: ${esc(shot.num)} ${esc(shot.name)}</strong>
          <span class="badge badge-cyan">${esc(shot.style)}</span>
        </div>
        <div style="color:var(--text-muted);margin-top:4px;">${esc(shot.desc)}</div>
      </div>
    `;
  };

  const stopNeedle = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
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
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  };

  const evaluateNeedle = () => {
    if (timingMode === 'auto') return null;
    const tp = match?.timingProfile || { sweetHalf: 17, goodHalf: 38 };
    const dist = Math.abs(needlePos - 50);
    if (dist <= tp.sweetHalf) return 'Perfect';
    if (dist <= tp.goodHalf) return needlePos < 50 ? 'Slightly Early' : 'Slightly Late';
    return needlePos < 50 ? 'Very Early' : 'Very Late';
  };

  const resetBatSelection = () => {
    batStep = 'stance';
    selStance = null;
    selFootwork = null;
    selIntent = null;
    selZone = null;
  };

  const resetBowlSelection = () => {
    bowlStep = 'line';
    selLine = null;
    selLength = null;
    selVar = null;
    selField = 'Balanced';
    selSpeed = match?.isSpinBowler ? 'Slow' : 'Fast';
  };

  const renderOutcomeBanner = (lb) => {
    if (!lb) return '';
    let cls = '';
    let icon = String(lb.runs);
    let label = `${lb.runs} Run${lb.runs === 1 ? '' : 's'}`;
    if (lb.wicket) {
      cls = 'is-wicket';
      icon = 'W';
      label = 'WICKET!';
    } else if (lb.rebowl) {
      icon = 'WD';
      label = 'WIDE (+1)';
    } else if (lb.runs === 6) {
      cls = 'is-six';
      icon = '6!';
      label = 'MAXIMUM SIX!';
    } else if (lb.runs === 4) {
      cls = 'is-four';
      icon = '4!';
      label = 'CRACKING FOUR!';
    } else if (lb.runs === 0) {
      icon = '•';
      label = 'DOT BALL';
    }

    return `
      <div class="outcome-flash ${cls}">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="outcome-badge">${icon}</div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong>${label}</strong>
              <span class="badge badge-cyan">${esc(lb.timing)}</span>
              <span class="badge badge-muted">${esc(lb.shotName)}</span>
            </div>
            <div style="font-size:0.84rem;color:var(--text-secondary);margin-top:4px;line-height:1.45;">${formatRichText(lb.commentary)}</div>
          </div>
        </div>
      </div>
    `;
  };

  const paint = () => {
    stopNeedle();
    if (!match) {
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

    const isBat = match.phase === 'batting';
    const b = match.batting;
    const bw = match.bowling;

    const curVal = isBat ? (match.mode === 'chapter' || match.mode === 'practice' ? b.runs : b.teamRuns) : bw.runsConceded;
    const tgtVal = isBat ? b.targetRuns : bw.targetRuns;
    const pct = Math.min(100, Math.round((curVal / Math.max(1, tgtVal)) * 100));

    // Match Finished Screen
    if (match.finished && match.resultSummary) {
      const r = match.resultSummary;
      container.innerHTML = `
        <div class="card ${r.won ? 'card-glow-emerald' : 'card-glow-crimson'}" style="max-width:880px;margin:10px auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <span class="badge ${r.won ? 'badge-emerald' : 'badge-crimson'}">${r.won ? 'VICTORY' : 'DEFEAT'}</span>
              <h1 style="margin-top:8px;font-size:2rem;">${r.won ? '🏆 MATCH VICTORY!' : '💔 MATCH DEFEAT'}</h1>
              <p style="color:var(--text-muted);margin:4px 0 0;">${esc(match.title)} vs <strong>${esc(match.opponent)}</strong></p>
            </div>
            <button class="btn btn-primary btn-lg" id="btn-finish-clear">Continue ➡️</button>
          </div>

          <div class="grid-3" style="margin-top:20px;">
            <div class="card" style="padding:14px;">
              <div class="label">🏏 Batting Card</div>
              <div class="stat-big" style="font-size:1.6rem;">${r.batting.runs} <span style="font-size:0.9rem;color:var(--text-muted);">(${r.batting.balls}b)</span></div>
              <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">${r.batting.fours}x4 • ${r.batting.sixes}x6 • ${esc(r.batting.dismissal)}</div>
            </div>
            <div class="card" style="padding:14px;">
              <div class="label">🥎 Bowling Card</div>
              <div class="stat-big" style="font-size:1.6rem;">${r.bowling.wickets}/${r.bowling.runsConceded}</div>
              <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">Overs: ${r.bowling.overs}</div>
            </div>
            <div class="card" style="padding:14px;">
              <div class="label">✨ Match Rewards</div>
              <div class="mono" style="font-size:0.95rem;color:var(--emerald);">+${r.xpEarned} XP • +${r.coinsEarned} Coins</div>
              <div class="mono" style="font-size:0.82rem;color:var(--gold);margin-top:4px;">+${r.tokenReward} Tickets • +${r.repEarned} Rep</div>
            </div>
          </div>

          ${r.levelUp ? `<div class="card card-glow-gold" style="margin-top:14px;padding:14px;">🎉 <strong>LEVEL UP!</strong> You reached <strong>Level ${r.newLevel}</strong> (+1 Skill Point &amp; +1 Attribute boost)!</div>` : ''}
          ${r.achievementsUnlocked?.length ? `<div class="card card-glow-emerald" style="margin-top:12px;padding:14px;">🏆 <strong>Achievements Unlocked:</strong> ${esc(r.achievementsUnlocked.join(', '))}</div>` : ''}
          ${r.bonusNotes?.length ? `<div class="card" style="margin-top:12px;padding:14px;color:var(--cyan);">${r.bonusNotes.map(n => `<div>• ${esc(n)}</div>`).join('')}</div>` : ''}

          ${match.storyEvent ? `
            <div class="card card-glow-gold" style="margin-top:16px;" id="story-event-box">
              <span class="badge badge-gold">📜 Career Story Event</span>
              <h3 style="margin:8px 0;">${esc(match.storyEvent.title)}</h3>
              <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:14px;">${esc(match.storyEvent.description)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:10px;">
                ${match.storyEvent.choices.map(c => `
                  <button class="btn btn-primary story-choice-btn" data-idx="${c.index}">${esc(c.label)}</button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="margin-top:18px;">
            <div class="label">Ball-by-Ball Broadcast Feed</div>
            <div class="commentary-feed">
              ${(match.commentaryLog || []).map(l => `<div class="comm-item">${esc(l)}</div>`).join('')}
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
      return;
    }

    const needRuns = Math.max(0, tgtVal - curVal);
    const ballsRem = isBat ? Math.max(0, b.ballsLimit - b.balls) : Math.max(0, bw.ballsLimit - bw.ballsBowled);
    const ballsBowledPhase = isBat ? b.balls : bw.ballsBowled;
    const crr = ballsBowledPhase > 0 ? ((curVal / ballsBowledPhase) * 6).toFixed(2) : '0.00';
    const rrr = ballsRem > 0 ? ((needRuns / ballsRem) * 6).toFixed(2) : '0.00';
    const recentBalls = match.recentBalls || [];

    container.innerHTML = `
      <div>
        <!-- TV Broadcast Scorebug Header -->
        <div class="scoreboard-banner">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                <span class="badge ${isBat ? 'badge-cyan' : 'badge-crimson'}">${isBat ? '🏏 BATTING INNINGS' : '🥎 BOWLING INNINGS'}</span>
                <span class="badge badge-muted">${esc(match.pitch)}</span>
                ${b.freeHit && isBat ? '<span class="badge badge-crimson">🚨 FREE HIT</span>' : ''}
                ${match.isPowerplay ? '<span class="badge badge-gold">⚡ POWERPLAY</span>' : ''}
              </div>
              <h2 style="font-size:1.35rem;">${esc(match.title)} <span style="color:var(--text-muted);font-weight:400;">vs ${esc(match.opponent)}</span></h2>
            </div>

            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
              <div style="text-align:right;">
                <div class="score-big">${curVal}/${isBat ? b.teamWickets : bw.wicketsTaken} <span style="font-size:1rem;color:var(--cyan);">(${esc(match.currentOverText)} ov)</span></div>
                <div class="mono" style="font-size:0.78rem;color:var(--gold);">Target ${tgtVal} • Need ${needRuns} off ${ballsRem}b • CRR ${crr} | RRR ${rrr}</div>
              </div>
              <button class="btn btn-danger btn-sm" id="btn-forfeit">🏳️ Forfeit</button>
            </div>
          </div>

          <div class="progress-track" style="margin-top:12px;">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>

          <!-- Pair + Bowler + Recent Balls Ticker -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:12px;">
            <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:0.82rem;color:var(--text-muted);">
              <span>⭐ <strong style="color:#fff;">You: ${b.runs}* (${b.balls}b)</strong> [${b.fours}x4, ${b.sixes}x6]</span>
              <span>👤 <strong style="color:#fff;">${esc(b.partnerName)}:</strong> ${b.partnerRuns}* (${b.partnerBalls}b)</span>
              <span>🥎 <strong style="color:#fff;">${esc(match.bowler?.name)}</strong> (${esc(match.bowler?.style)})</span>
            </div>
            <div class="over-pills">
              <span class="label" style="margin:0 4px 0 0;">Recent:</span>
              ${recentBalls.length > 0
                ? recentBalls.map(rv => `<span class="ball-pill ball-${esc(rv)}">${rv === '0' ? '•' : esc(rv)}</span>`).join('')
                : '<span style="font-size:0.76rem;color:var(--text-muted);">Opening Ball</span>'}
            </div>
          </div>
        </div>

        ${renderOutcomeBanner(match.lastBall)}

        <div class="match-layout">
          <!-- Left: Tactical Step Controls -->
          <div class="card card-glow-emerald">
            ${isBat ? renderBattingControls() : renderBowlingControls()}
          </div>

          <!-- Right: Live 2D Field Radar + Hawk-Eye Pitch + Commentary -->
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="grid-2" style="gap:14px;">
              <div class="card" style="padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <h4 style="font-size:0.95rem;">📡 2D Field Radar</h4>
                  <span class="badge badge-cyan">${esc(isBat ? match.fieldPreset : selField)}</span>
                </div>
                ${renderFieldRadarSVG({
                  fieldPreset: isBat ? match.fieldPreset : selField,
                  selectedZone: isBat ? selZone : null,
                  isPowerplay: match.isPowerplay,
                  battingHand: isBat ? match.battingHand : match.oppBatterHand,
                  interactive: isBat && batStep === 'zone'
                })}
                ${isBat && batStep === 'zone' ? `<div style="text-align:center;font-size:0.74rem;color:var(--gold);margin-top:4px;">👆 Click zone directly on radar</div>` : ''}
              </div>

              <div class="card" style="padding:14px;display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <h4 style="font-size:0.95rem;">🎯 Hawk-Eye Pitch</h4>
                    <span class="badge badge-muted">Last Ball</span>
                  </div>
                  ${renderHawkEyePitchSVG({
                    delivery: match.lastBall?.delivery || null,
                    battingHand: isBat ? match.battingHand : match.oppBatterHand
                  })}
                </div>
                <div class="mono" style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:6px;">
                  ${match.lastBall?.delivery
                    ? `${esc(match.lastBall.delivery.length)} • ${esc(match.lastBall.delivery.line)} (${esc(match.lastBall.delivery.speed)})`
                    : 'No ball bowled yet'}
                </div>
              </div>
            </div>

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
          </div>
        </div>
      </div>
    `;

    bindEvents();
  };

  const renderBattingControls = () => {
    const isLeave = selFootwork === 'Leave' || selIntent === 'Leave';
    const tp = match.timingProfile || { sweetHalf: 17, goodHalf: 38, eqTimingBonus: 0, playerEdge: 30, bowlerThreat: 25 };
    const redL = Math.max(2, Math.round(50 - tp.goodHalf));
    const greenL = Math.max(redL + 4, Math.round(50 - tp.sweetHalf));
    const greenR = Math.min(96, Math.round(50 + tp.sweetHalf));
    const redR = Math.min(98, Math.round(50 + tp.goodHalf));
    const barBg = `linear-gradient(90deg, #ef4444 0%, #f59e0b ${redL}%, #10b981 ${greenL}%, #34d399 50%, #10b981 ${greenR}%, #f59e0b ${redR}%, #ef4444 100%)`;

    return `
      <div class="release-banner">
        ${formatRichText(match.releaseHint || 'Bowler runs in...')}
      </div>

      <!-- Clickable Tactical Breadcrumb Stepper -->
      <div class="grid-4" style="gap:8px;margin-bottom:16px;">
        <div class="step-crumb ${selStance ? 'done' : batStep === 'stance' ? 'active' : ''}" data-jump="stance">
          <div class="label" style="margin:0;">1. Stance</div>
          <div style="font-weight:700;font-size:0.84rem;">${esc(selStance || (batStep === 'stance' ? 'Choosing...' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selFootwork ? 'done' : batStep === 'footwork' ? 'active' : ''}" data-jump="footwork">
          <div class="label" style="margin:0;">2. Footwork</div>
          <div style="font-weight:700;font-size:0.84rem;">${esc(selFootwork || (batStep === 'footwork' ? 'Choosing...' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selIntent ? 'done' : batStep === 'intent' ? 'active' : ''}" data-jump="intent">
          <div class="label" style="margin:0;">3. Intent</div>
          <div style="font-weight:700;font-size:0.84rem;">${isLeave ? 'Leave' : esc(selIntent || (batStep === 'intent' ? 'Choosing...' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selZone ? 'done' : batStep === 'zone' ? 'active' : ''}">
          <div class="label" style="margin:0;">4. Zone</div>
          <div style="font-weight:700;font-size:0.84rem;">${isLeave ? 'In Line' : esc(selZone || (batStep === 'zone' ? 'Pick Zone' : 'Pending'))}</div>
        </div>
      </div>

      ${batStep === 'stance' ? `
        <h3 style="margin-bottom:10px;">🧍 Step 1: Take Your Guard &amp; Stance</h3>
        <div class="choice-grid-3">
          ${[
            { id: 'Off Side', ico: '➡️', sub: 'Guard set outside off stump' },
            { id: 'In Line', ico: '⚖️', sub: 'Balanced middle-stump guard' },
            { id: 'Leg Side', ico: '⬅️', sub: 'Open stance clearing the front pad' }
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
            { id: 'Front Foot', ico: '🦶', sub: 'Stride forward into the pitch of the ball' },
            { id: 'Back Foot', ico: '🔙', sub: 'Transfer weight back inside the crease' },
            { id: 'Advanced', ico: '⚡', sub: 'Use your feet and dance down the track' },
            { id: 'Leave', ico: '🛡️', sub: 'Shoulder arms and hold your bat high' }
          ].map(fw => `
            <button class="choice-card bat-fw-btn" data-val="${fw.id}">
              <span class="cc-title">${fw.ico} ${fw.id === 'Leave' ? 'Leave Ball' : fw.id}</span>
              <span class="cc-sub">${fw.sub}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-sm bat-back-stance" style="margin-top:12px;">⬅️ Back to Stance</button>
      ` : ''}

      ${batStep === 'intent' ? `
        <h3 style="margin-bottom:10px;">🎯 Step 3: Choose Shot Intent</h3>
        <div class="choice-grid-2">
          <button class="choice-card bat-intent-btn" data-val="Push">
            <span class="cc-title">🛡️ Push</span>
            <span class="cc-sub">Controlled touch with soft hands.</span>
          </button>
          <button class="choice-card bat-intent-btn" data-val="Stroke">
            <span class="cc-title">🏏 Stroke</span>
            <span class="cc-sub">Full-faced bat swing through the line.</span>
          </button>
          <button class="choice-card bat-intent-btn" data-val="Loft">
            <span class="cc-title">🚀 Loft</span>
            <span class="cc-sub">Aerial swing elevating the ball upward.</span>
          </button>
          <button class="choice-card bat-intent-btn" data-val="Leave">
            <span class="cc-title">🧘 Leave</span>
            <span class="cc-sub">Tuck the bat in and watch it pass.</span>
          </button>
        </div>
        <button class="btn btn-sm bat-back-fw" style="margin-top:12px;">⬅️ Back to Footwork</button>
      ` : ''}

      ${batStep === 'leave_confirm' ? `
        <div class="card" style="padding:16px;background:rgba(8,13,27,0.8);">
          <h3 style="margin-bottom:6px;">🧘 Confirm Leave</h3>
          <p style="color:var(--text-muted);font-size:0.88rem;margin:0 0 14px;">Watch the delivery pass cleanly through to the wicketkeeper.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-emerald btn-lg" id="btn-bat-deliver">✅ Confirm Leave</button>
            <button class="btn bat-back-fw">⬅️ Back</button>
          </div>
        </div>
      ` : ''}

      ${batStep === 'zone' ? `
        <h3 style="margin-bottom:10px;">📐 Step 4: Aim Wagon Zone &amp; Swing Timing</h3>
        <div class="grid-4" style="gap:8px;">
          ${['Fine Leg', 'Square Leg', 'Mid Wicket', 'Long On', 'Long Off', 'Cover', 'Point', 'Third Man'].map((z, idx) => `
            <button class="btn btn-sm ${selZone === z ? 'btn-gold' : ''} bat-zone-btn" data-val="${z}">Z${idx + 1} ${z}</button>
          `).join('')}
        </div>

        <div id="equipped-shot-preview">${buildEquippedShotPreview()}</div>

        <div class="timing-meter-wrap">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <span class="label" style="margin:0;">⏱️ Timing Release Meter (${timingMode === 'meter' ? 'Interactive Skill' : 'Auto RPG Roll'})</span>
            <button class="btn btn-sm" id="btn-toggle-timing">${timingMode === 'meter' ? 'Switch to Auto-Roll' : 'Switch to Skill Meter'}</button>
          </div>
          <div class="timing-meta">
            <span style="color:var(--emerald);border-color:rgba(16,185,129,0.4);">Sweet Spot: ±${tp.sweetHalf}%</span>
            <span>Gear Bonus: ${tp.eqTimingBonus >= 0 ? '+' : ''}${tp.eqTimingBonus}</span>
            <span>Your Edge: ${tp.playerEdge} vs Bowler ${tp.bowlerThreat}</span>
          </div>
          ${timingMode === 'meter' ? `
            <div class="timing-bar" style="background:${barBg};">
              <div class="timing-needle" id="timing-needle"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted);margin-top:5px;">
              <span>Very Early</span><span>Early</span><span style="color:var(--emerald);font-weight:700;">SWEET SPOT</span><span>Late</span><span>Very Late</span>
            </div>
          ` : `<div style="font-size:0.84rem;color:var(--text-muted);">Auto-roll weighs your Gear Timing (+${tp.eqTimingBonus}), Confidence &amp; Skills directly against the Bowler (${tp.bowlerThreat}).</div>`}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn btn-emerald btn-lg" id="btn-bat-deliver" ${!selZone ? 'disabled' : ''}>
            🏏 PLAY SHOT ${selZone ? `➔ ${esc(selZone)}` : '(Pick Zone)'}
          </button>
          <button class="btn bat-back-intent">⬅️ Back to Intent</button>
        </div>
      ` : ''}
    `;
  };

  const renderBowlingControls = () => {
    const isSpin = match.isSpinBowler;
    return `
      <div class="grid-4" style="gap:8px;margin-bottom:16px;">
        <div class="step-crumb ${selLine ? 'done' : bowlStep === 'line' ? 'active' : ''}" data-bj="line">
          <div class="label" style="margin:0;">1. Line</div>
          <div style="font-weight:700;font-size:0.84rem;">${esc(selLine || (bowlStep === 'line' ? 'Choosing...' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selLength ? 'done' : bowlStep === 'length' ? 'active' : ''}" data-bj="length">
          <div class="label" style="margin:0;">2. Length</div>
          <div style="font-weight:700;font-size:0.84rem;">${esc(selLength || (bowlStep === 'length' ? 'Choosing...' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${selVar ? 'done' : bowlStep === 'variation' ? 'active' : ''}" data-bj="variation">
          <div class="label" style="margin:0;">3. Craft</div>
          <div style="font-weight:700;font-size:0.84rem;">${esc(selVar || (bowlStep === 'variation' ? 'Choosing...' : 'Pending'))}</div>
        </div>
        <div class="step-crumb ${bowlStep === 'field' ? 'active' : ''}">
          <div class="label" style="margin:0;">4. Field &amp; Pace</div>
          <div style="font-weight:700;font-size:0.84rem;">${esc(selField)} (${esc(selSpeed)})</div>
        </div>
      </div>

      ${bowlStep === 'line' ? `
        <h3 style="margin-bottom:10px;">📐 Step 1: Select Delivery Line</h3>
        <div class="choice-grid-2">
          <button class="choice-card bowl-line-btn" data-val="Stumps"><span class="cc-title">🎯 Stumps</span><span class="cc-sub">Straight line toward middle &amp; off</span></button>
          <button class="choice-card bowl-line-btn" data-val="Off Side"><span class="cc-title">➡️ Off Side</span><span class="cc-sub">Outside the off-stump channel</span></button>
          <button class="choice-card bowl-line-btn" data-val="Leg Side"><span class="cc-title">⬅️ Leg Side</span><span class="cc-sub">On the batter&apos;s leg-side hip &amp; pads</span></button>
          <button class="choice-card bowl-line-btn" data-val="Wide"><span class="cc-title">🚫 Wide Outside Off</span><span class="cc-sub">Wide outside the off-stump tramline</span></button>
        </div>
      ` : ''}

      ${bowlStep === 'length' ? `
        <h3 style="margin-bottom:10px;">📏 Step 2: Select Pitch Length</h3>
        <div class="choice-grid-2">
          <button class="choice-card bowl-len-btn" data-val="Yorker"><span class="cc-title">🎯 Yorker</span><span class="cc-sub">Right at the popping crease</span></button>
          <button class="choice-card bowl-len-btn" data-val="Full"><span class="cc-title">🏏 Full Length</span><span class="cc-sub">Pitched up well forward</span></button>
          <button class="choice-card bowl-len-btn" data-val="Good Length"><span class="cc-title">⚖️ Good Length</span><span class="cc-sub">Three-quarter pitch zone</span></button>
          <button class="choice-card bowl-len-btn" data-val="Short"><span class="cc-title">🚀 Short Pitch</span><span class="cc-sub">Dug in halfway down the track</span></button>
        </div>
        <button class="btn btn-sm bowl-back-line" style="margin-top:12px;">⬅️ Back to Line</button>
      ` : ''}

      ${bowlStep === 'variation' ? `
        <h3 style="margin-bottom:10px;">🌀 Step 3: Select Bowling Craft</h3>
        <div class="choice-grid-2">
          <button class="choice-card bowl-var-btn" data-val="Normal Delivery"><span class="cc-title">⚖️ ${isSpin ? 'Stock Turn' : 'Stock Seam'}</span><span class="cc-sub">Standard natural release</span></button>
          <button class="choice-card bowl-var-btn" data-val="Swing/Spin"><span class="cc-title">🌀 ${isSpin ? 'Drift / Arm Ball' : 'Swing Ball'}</span><span class="cc-sub">Airborne lateral drift</span></button>
          <button class="choice-card bowl-var-btn" data-val="Cutter/Googly"><span class="cc-title">🔄 ${isSpin ? 'Doosra / Googly' : 'Off/Leg Cutter'}</span><span class="cc-sub">Sharp break off the surface</span></button>
          <button class="choice-card bowl-var-btn" data-val="Slower Ball"><span class="cc-title">🐢 ${isSpin ? 'Flighted Loop' : 'Slower Ball'}</span><span class="cc-sub">Pace variation through the air</span></button>
        </div>
        <button class="btn btn-sm bowl-back-len" style="margin-top:12px;">⬅️ Back to Length</button>
      ` : ''}

      ${bowlStep === 'field' ? `
        <h3 style="margin-bottom:10px;">👥 Step 4: Field Trap &amp; Effort</h3>
        <div class="label">Field Trap (${match.isPowerplay ? '⚡ Powerplay: Max 2 Outside Ring' : '🏟️ Open Field: Max 5 Outside Ring'})</div>
        <div class="choice-grid-3" style="margin-bottom:14px;">
          ${[
            { id: 'Balanced', sub: match.isPowerplay ? '2 Out • 7 In Ring' : '5 Out • 4 In Ring' },
            { id: 'Attacking', sub: '2 Out • Slips & Close Catchers' },
            { id: 'Defensive', sub: match.isPowerplay ? '2 Out • Boundary Saved' : '5 Out • Deep Riders' }
          ].map(f => `
            <button class="choice-card ${selField === f.id ? 'selected' : ''} bowl-fld-btn" data-val="${f.id}">
              <span class="cc-title">${f.id}</span>
              <span class="cc-sub">${f.sub}</span>
            </button>
          `).join('')}
        </div>
        <div class="label">Speed / Flight Effort</div>
        <div class="grid-3" style="margin-bottom:16px;">
          ${['Fast', 'Medium', 'Slow'].map(sp => `
            <button class="btn ${selSpeed === sp ? 'btn-gold' : ''} bowl-spd-btn" data-val="${sp}">${sp}</button>
          `).join('')}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-emerald btn-lg" id="btn-bowl-deliver">🥎 DELIVER BALL ⚡</button>
          <button class="btn bowl-back-var">⬅️ Back to Variation</button>
        </div>
      ` : ''}
    `;
  };

  const bindEvents = () => {
    const forfeitBtn = document.getElementById('btn-forfeit');
    if (forfeitBtn) forfeitBtn.onclick = async () => {
      const res = await api('/api/match/forfeit', { method: 'POST' });
      toast('Match forfeited.', 'error');
      match = res.match;
      await onMatchUpdate(match);
      paint();
    };

    document.querySelectorAll('.step-crumb.done[data-jump]').forEach(c => c.onclick = () => {
      const target = c.dataset.jump;
      batStep = target;
      if (target === 'stance') { selStance = null; selFootwork = null; selIntent = null; selZone = null; }
      else if (target === 'footwork') { selFootwork = null; selIntent = null; selZone = null; }
      else if (target === 'intent') { selIntent = null; selZone = null; }
      paint();
    });
    document.querySelectorAll('.step-crumb.done[data-bj]').forEach(c => c.onclick = () => {
      const target = c.dataset.bj;
      bowlStep = target;
      if (target === 'line') { selLine = null; selLength = null; selVar = null; }
      else if (target === 'length') { selLength = null; selVar = null; }
      else if (target === 'variation') { selVar = null; }
      paint();
    });
    document.querySelectorAll('.bat-stance-btn').forEach(b => b.onclick = () => { selStance = b.dataset.val; batStep = 'footwork'; paint(); });
    document.querySelectorAll('.bat-fw-btn').forEach(b => b.onclick = () => {
      selFootwork = b.dataset.val;
      batStep = selFootwork === 'Leave' ? 'leave_confirm' : 'intent';
      paint();
    });
    document.querySelectorAll('.bat-back-stance').forEach(b => b.onclick = () => { batStep = 'stance'; selStance = null; selFootwork = null; paint(); });
    document.querySelectorAll('.bat-back-fw').forEach(b => b.onclick = () => { batStep = 'footwork'; selFootwork = null; selIntent = null; selZone = null; paint(); });
    document.querySelectorAll('.bat-intent-btn').forEach(b => b.onclick = () => {
      selIntent = b.dataset.val;
      batStep = selIntent === 'Leave' ? 'leave_confirm' : 'zone';
      paint();
    });
    document.querySelectorAll('.bat-back-intent').forEach(b => b.onclick = () => { batStep = 'intent'; selIntent = null; selZone = null; paint(); });
    document.querySelectorAll('.bat-zone-btn').forEach(b => b.onclick = () => { selZone = b.dataset.val; paint(); });
    document.querySelectorAll('.radar-wedge.interactive').forEach(w => w.onclick = () => { selZone = w.dataset.zone; paint(); });

    const toggleTiming = document.getElementById('btn-toggle-timing');
    if (toggleTiming) toggleTiming.onclick = () => { timingMode = timingMode === 'meter' ? 'auto' : 'meter'; paint(); };

    if (match.phase === 'batting' && batStep === 'zone' && timingMode === 'meter') {
      startNeedle();
    }

    const deliverBatBtn = document.getElementById('btn-bat-deliver');
    if (deliverBatBtn) deliverBatBtn.onclick = async () => {
      const timingQuality = evaluateNeedle();
      const capturedNeedle = timingMode === 'meter' ? Math.round(needlePos * 10) / 10 : null;
      stopNeedle();
      deliverBatBtn.disabled = true;
      try {
        const res = await api('/api/match/ball', {
          method: 'POST',
          body: {
            stance: selStance,
            footwork: selFootwork,
            intent: selIntent,
            zone: selZone || 'Cover',
            timingQuality,
            needlePos: capturedNeedle
          }
        });
        match = res.match;
        resetBatSelection();
        resetBowlSelection();
        await onMatchUpdate(match);
        paint();
      } catch {
        deliverBatBtn.disabled = false;
      }
    };

    document.querySelectorAll('.bowl-line-btn').forEach(b => b.onclick = () => { selLine = b.dataset.val; bowlStep = 'length'; paint(); });
    document.querySelectorAll('.bowl-back-line').forEach(b => b.onclick = () => { bowlStep = 'line'; selLine = null; selLength = null; paint(); });
    document.querySelectorAll('.bowl-len-btn').forEach(b => b.onclick = () => { selLength = b.dataset.val; bowlStep = 'variation'; paint(); });
    document.querySelectorAll('.bowl-back-len').forEach(b => b.onclick = () => { bowlStep = 'length'; selLength = null; selVar = null; paint(); });
    document.querySelectorAll('.bowl-var-btn').forEach(b => b.onclick = () => { selVar = b.dataset.val; bowlStep = 'field'; paint(); });
    document.querySelectorAll('.bowl-back-var').forEach(b => b.onclick = () => { bowlStep = 'variation'; selVar = null; paint(); });
    document.querySelectorAll('.bowl-fld-btn').forEach(b => b.onclick = () => { selField = b.dataset.val; paint(); });
    document.querySelectorAll('.bowl-spd-btn').forEach(b => b.onclick = () => { selSpeed = b.dataset.val; paint(); });

    const deliverBowlBtn = document.getElementById('btn-bowl-deliver');
    if (deliverBowlBtn) deliverBowlBtn.onclick = async () => {
      deliverBowlBtn.disabled = true;
      try {
        const res = await api('/api/match/ball', {
          method: 'POST',
          body: { line: selLine, length: selLength, variation: selVar, fieldPreset: selField, speed: selSpeed }
        });
        match = res.match;
        resetBowlSelection();
        await onMatchUpdate(match);
        paint();
      } catch {
        deliverBowlBtn.disabled = false;
      }
    };
  };

  paint();
  return stopNeedle;
}
