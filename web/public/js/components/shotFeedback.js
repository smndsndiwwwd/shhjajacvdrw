import { esc, formatRichText } from '../api.js';

/**
 * Crisp non-blended CSS gradient for the pre-ball & post-ball timing bar.
 * Colors line up 1-to-1 with Ideal / Good / OK / Poor thresholds.
 */
export function buildTimingBarGradient(tp = {}) {
  const sweetHalf = Number(tp.sweetHalf || 16.5);
  const goodHalf = Number(tp.goodHalf || 37);
  const okSplit = sweetHalf + (goodHalf - sweetHalf) * 0.55;

  const poorL = Math.max(2, +(50 - goodHalf).toFixed(1));
  const okL = Math.max(poorL + 2, +(50 - okSplit).toFixed(1));
  const idealL = Math.max(okL + 2, +(50 - sweetHalf).toFixed(1));
  const idealR = Math.min(96, +(50 + sweetHalf).toFixed(1));
  const okR = Math.min(98, +(idealR + (okSplit - sweetHalf)).toFixed(1));
  const poorR = Math.min(99, +(50 + goodHalf).toFixed(1));

  return `linear-gradient(90deg, #dc2626 0%, #dc2626 ${poorL}%, #f59e0b ${poorL}%, #f59e0b ${okL}%, #84cc16 ${okL}%, #84cc16 ${idealL}%, #10b981 ${idealL}%, #10b981 ${idealR}%, #84cc16 ${idealR}%, #84cc16 ${okR}%, #f59e0b ${okR}%, #f59e0b ${poorR}%, #dc2626 ${poorR}%, #dc2626 100%)`;
}

function getGradeClass(grade = 'OK') {
  const g = String(grade).toLowerCase();
  if (g === 'ideal' || g === 'perfect') return 'grade-ideal';
  if (g === 'good') return 'grade-good';
  if (g === 'ok') return 'grade-ok';
  return 'grade-poor';
}

function deriveFallbackTiming(lb) {
  if (lb.timingFeedback) return lb.timingFeedback;
  const t = String(lb.timing || 'Perfect');
  const lower = t.toLowerCase();
  let grade = 'Ideal';
  let np = 50;
  if (lower.includes('very early')) { grade = 'Poor'; np = 7; }
  else if (lower.includes('very late')) { grade = 'Poor'; np = 93; }
  else if (lower.includes('slightly early')) { grade = 'Good'; np = 27; }
  else if (lower.includes('slightly late')) { grade = 'Good'; np = 73; }
  else if (lower.includes('left')) { grade = 'Ideal'; np = 50; }
  return { grade, label: t === 'Perfect' ? 'Ideal' : t, needlePos: np, sweetHalf: 16.5, goodHalf: 37 };
}

/**
 * Renders the Outcome Banner + Cricket-26-style Timing & Shot Selection feedback bars after each ball.
 */
export function renderOutcomeBannerWithFeedback(lb) {
  if (!lb) return '';
  let cls = '';
  let icon = String(lb.runs);
  let label = `${lb.runs} Run${lb.runs === 1 ? '' : 's'}`;
  if (lb.wicket) {
    cls = 'is-wicket';
    icon = 'W';
    const dt = String(lb.dismissalType || '').toUpperCase();
    label = dt && dt !== 'NOT OUT' ? `WICKET (${dt})!` : 'WICKET!';
  } else if (lb.extraType === 'no_ball') {
    icon = 'NB';
    const batRuns = Math.max(0, (lb.runs || 0) - 1);
    if (batRuns >= 6) { cls = 'is-six'; label = 'NO BALL + SIX!'; }
    else if (batRuns >= 4) { cls = 'is-four'; label = 'NO BALL + FOUR!'; }
    else label = `NO BALL (+${lb.runs || 1}) • FREE HIT!`;
  } else if (lb.rebowl) {
    icon = 'WD';
    label = 'WIDE (+1)';
  } else if (lb.runs === 6) { cls = 'is-six'; icon = '6!'; label = 'MAXIMUM SIX!'; }
  else if (lb.runs === 4) { cls = 'is-four'; icon = '4!'; label = 'CRACKING FOUR!'; }
  else if (lb.runs === 0) { icon = '•'; label = 'DOT BALL'; }

  const showBars = lb.extraType !== 'wide' && !(lb.rebowl && lb.extraType !== 'no_ball');
  const tf = deriveFallbackTiming(lb);
  const ss = lb.shotSelection || null;
  const timingBg = buildTimingBarGradient({ sweetHalf: tf.sweetHalf, goodHalf: tf.goodHalf });
  const timingPin = Math.max(2, Math.min(98, Number(tf.needlePos ?? 50)));
  const ssScore = ss ? Math.max(4, Math.min(98, Number(ss.score ?? 50))) : null;

  return `
    <div class="outcome-flash ${cls}" style="margin-bottom:12px;flex-direction:column;align-items:stretch;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="outcome-badge">${icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong>${label}</strong>
            <span class="badge badge-cyan">${esc(tf.label || lb.timing)}</span>
            <span class="badge badge-muted">${esc(lb.shotName)}</span>
          </div>
          <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;line-height:1.45;">${formatRichText(lb.commentary)}</div>
        </div>
      </div>

      ${showBars ? `
        <div class="c26-feedback-grid">
          <div class="c26-meter-row">
            <div class="c26-meter-head">
              <span class="c26-meter-title">⏱️ TIMING</span>
              <span class="c26-grade-pill ${getGradeClass(tf.grade)}">${esc(String(tf.grade).toUpperCase())} · ${esc(tf.label)}</span>
            </div>
            <div class="c26-track c26-timing-track" style="background:${timingBg};">
              <div class="c26-center-tick"></div>
              <div class="c26-pin" style="left:${timingPin}%;"></div>
            </div>
            <div class="c26-scale-labels">
              <span>Very Early</span><span>OK</span><span>Good</span><span style="color:#34d399;font-weight:700;">IDEAL</span><span>Good</span><span>OK</span><span>Very Late</span>
            </div>
          </div>

          ${ss ? `
            <div class="c26-meter-row">
              <div class="c26-meter-head">
                <span class="c26-meter-title">🎯 SHOT SELECTION <span class="c26-reason">(${esc(ss.reason)})</span></span>
                <span class="c26-grade-pill ${getGradeClass(ss.grade)}">${esc(String(ss.grade).toUpperCase())}</span>
              </div>
              <div class="c26-track c26-selection-track">
                <div class="c26-pin" style="left:${ssScore}%;"></div>
              </div>
              <div class="c26-scale-labels">
                <span>Poor</span><span>OK</span><span>Good</span><span style="color:#34d399;font-weight:700;">IDEAL</span>
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}
