import { api, esc, toast } from '../api.js';

export function renderBeginWizard(container, state, onComplete) {
  let step = 1;
  const form = {
    name: state.user?.username || '',
    primary_role: 'Batsman',
    batting_hand: 'Right-hand bat',
    bowling_style: 'Right-arm medium',
    nationality: 'India',
    academy_id: ''
  };
  let academiesList = [];

  const ROLES = [
    { id: 'Batsman', icon: '🏏', desc: 'High starting Power, Timing, Technique & Defense.' },
    { id: 'Wicket-Keeper', icon: '🧤', desc: 'Elite Reflexes & Fielding plus Top-Order Batting.' },
    { id: 'Bowler', icon: '🥎', desc: 'Lethal Accuracy, Variations, Swing/Seam or Spin.' },
    { id: 'All-Rounder', icon: '🌟', desc: 'Balanced Batting & Bowling skills for dual phases.' }
  ];

  const BOWL_STYLES = [
    'Right-arm fast', 'Left-arm fast', 'Right-arm medium', 'Left-arm medium',
    'Right-arm off-spin', 'Left-arm orthodox spin', 'Right-arm leg-spin'
  ];

  const loadAcademies = async () => {
    const res = await api(`/api/academies?nation=${encodeURIComponent(form.nationality)}`);
    academiesList = res.academies || [];
    if (!academiesList.find(a => a.id === form.academy_id)) {
      const open = academiesList.find(a => a.enrolled < a.capacity);
      form.academy_id = open ? open.id : (academiesList[0]?.id || '');
    }
  };

  const paint = async () => {
    if (step === 6 && academiesList.length === 0) {
      await loadAcademies();
    }

    container.innerHTML = `
      <div style="max-width:860px;margin:18px auto;">
        <div class="card card-glow-emerald">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <span class="badge badge-emerald">Step ${step} of 6</span>
              <h2 style="margin-top:8px;font-size:1.6rem;">🏏 Create Your Career Cricketer</h2>
            </div>
            <div class="progress-track" style="max-width:240px;">
              <div class="progress-fill" style="width:${Math.round((step / 6) * 100)}%"></div>
            </div>
          </div>

          ${step === 1 ? `
            <label class="label">Cricketer Display Name</label>
            <input id="wiz-name" class="input" value="${esc(form.name)}" maxlength="28" placeholder="Enter your player name..." />
            <p style="color:var(--text-muted);font-size:0.85rem;margin-top:10px;">
              This name appears on stadium scorecards, franchise auction boards, and global leaderboards.
            </p>
          ` : ''}

          ${step === 2 ? `
            <label class="label">Select Primary Career Role</label>
            <div class="grid-2" style="margin-top:10px;">
              ${ROLES.map(r => `
                <button type="button" class="card role-pick ${form.primary_role === r.id ? 'card-glow-cyan' : ''}" data-role="${r.id}" style="text-align:left;cursor:pointer;">
                  <div style="font-size:1.35rem;margin-bottom:6px;">${r.icon} <strong>${r.id}</strong></div>
                  <div style="font-size:0.84rem;color:var(--text-muted);">${r.desc}</div>
                </button>
              `).join('')}
            </div>
          ` : ''}

          ${step === 3 ? `
            <label class="label">Batting Hand Orientation</label>
            <div class="grid-2" style="margin-top:10px;">
              ${['Right-hand bat', 'Left-hand bat'].map(h => `
                <button type="button" class="card hand-pick ${form.batting_hand === h ? 'card-glow-cyan' : ''}" data-hand="${h}" style="text-align:center;cursor:pointer;padding:28px;">
                  <div style="font-size:1.4rem;font-weight:700;">🏏 ${h}</div>
                  <div style="font-size:0.82rem;color:var(--text-muted);margin-top:6px;">2D Field Radar &amp; Wagon Angles auto-orient to ${h}.</div>
                </button>
              `).join('')}
            </div>
          ` : ''}

          ${step === 4 ? `
            <label class="label">Bowling Style</label>
            <div class="grid-2" style="margin-top:10px;">
              ${BOWL_STYLES.map(s => `
                <button type="button" class="btn ${form.bowling_style === s ? 'btn-primary' : ''}" data-style="${s}" style="justify-content:flex-start;padding:14px;">
                  🥎 ${s}
                </button>
              `).join('')}
            </div>
          ` : ''}

          ${step === 5 ? `
            <label class="label">Representing Nation</label>
            <div class="grid-3" style="margin-top:10px;">
              ${(state.nations || []).map(n => `
                <button type="button" class="btn ${form.nationality === n ? 'btn-emerald' : ''}" data-nation="${n}" style="padding:14px;">
                  🌍 ${n}
                </button>
              `).join('')}
            </div>
          ` : ''}

          ${step === 6 ? `
            <label class="label">Select ${esc(form.nationality)} Training Academy</label>
            <div class="grid-2" style="max-height:420px;overflow-y:auto;padding-right:4px;margin-top:10px;">
              ${academiesList.map(ac => {
                const full = ac.enrolled >= ac.capacity;
                return `
                  <button type="button" class="card acad-pick ${form.academy_id === ac.id ? 'card-glow-gold' : ''}" data-acad="${ac.id}" ${full ? 'disabled' : ''} style="text-align:left;cursor:pointer;padding:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                      <strong style="color:#fff;">${esc(ac.name)}</strong>
                      <span class="badge badge-gold">${'★'.repeat(ac.rating)}</span>
                    </div>
                    <div style="font-size:0.78rem;color:var(--cyan);margin:4px 0;">${esc(ac.trainingBonusText)}</div>
                    <div style="font-size:0.76rem;color:var(--text-muted);">${esc(ac.specialty)} • ${esc(ac.coachRating)}</div>
                    <div class="mono" style="font-size:0.72rem;color:var(--emerald);margin-top:6px;">Spots: ${ac.enrolled}/${ac.capacity}</div>
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-subtle);">
            <button type="button" class="btn" id="wiz-prev" ${step === 1 ? 'disabled' : ''}>⬅️ Back</button>
            ${step < 6
              ? `<button type="button" class="btn btn-primary" id="wiz-next">Next Step ➡️</button>`
              : `<button type="button" class="btn btn-emerald btn-lg" id="wiz-finish">🚀 Sign Academy Contract &amp; Begin</button>`
            }
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.role-pick').forEach(b => b.onclick = () => { form.primary_role = b.dataset.role; paint(); });
    document.querySelectorAll('.hand-pick').forEach(b => b.onclick = () => { form.batting_hand = b.dataset.hand; paint(); });
    document.querySelectorAll('[data-style]').forEach(b => b.onclick = () => { form.bowling_style = b.dataset.style; paint(); });
    document.querySelectorAll('[data-nation]').forEach(b => b.onclick = async () => {
      form.nationality = b.dataset.nation;
      academiesList = [];
      paint();
    });
    document.querySelectorAll('.acad-pick').forEach(b => b.onclick = () => { form.academy_id = b.dataset.acad; paint(); });

    const prevBtn = document.getElementById('wiz-prev');
    if (prevBtn) prevBtn.onclick = () => { if (step > 1) { step--; paint(); } };

    const nextBtn = document.getElementById('wiz-next');
    if (nextBtn) nextBtn.onclick = async () => {
      if (step === 1) {
        form.name = document.getElementById('wiz-name').value.trim();
        if (form.name.length < 2) return toast('Name must be at least 2 characters.', 'error');
      }
      step++;
      if (step === 6) await loadAcademies();
      paint();
    };

    const finBtn = document.getElementById('wiz-finish');
    if (finBtn) finBtn.onclick = async () => {
      try {
        finBtn.disabled = true;
        const res = await api('/api/career/begin', { method: 'POST', body: form });
        toast(`Career started! Starter gear equipped.`, 'success');
        if (res.achievementsUnlocked?.length) {
          toast(`Unlocked: ${res.achievementsUnlocked.join(', ')}`, 'success');
        }
        onComplete();
      } catch {
        finBtn.disabled = false;
      }
    };
  };

  paint();
}
