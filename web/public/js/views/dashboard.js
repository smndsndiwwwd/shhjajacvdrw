import { esc } from '../api.js';

const ATTR_GROUPS = [
  {
    title: '🏏 Batting Attributes',
    color: 'var(--cyan)',
    keys: [
      ['power', 'Power'], ['timing', 'Timing'], ['technique', 'Technique'],
      ['defense', 'Defense'], ['aggression', 'Aggression'], ['spin', 'Playing Spin'], ['pace', 'Playing Pace']
    ]
  },
  {
    title: '🥎 Bowling Attributes',
    color: 'var(--crimson)',
    keys: [
      ['accuracy', 'Accuracy'], ['swing', 'Swing'], ['seam', 'Seam'],
      ['spin_bowling', 'Spin Craft'], ['variations', 'Variations']
    ]
  },
  {
    title: '⚡ Athleticism & Mental',
    color: 'var(--emerald)',
    keys: [
      ['fitness', 'Fitness'], ['stamina', 'Stamina'], ['running', 'Running Speed'],
      ['fielding', 'Fielding'], ['reflex', 'Reflexes'], ['throw_accuracy', 'Throw Acc'], ['mentality', 'Mentality']
    ]
  }
];

export function renderDashboardView(container, state, navigate) {
  const { player, tier, requiredXP, baseAttributes, effectiveAttributes, equipmentBonuses, academy, stats, activeContract, tournamentsWon, inventory, achievementsUnlockedCount, achievementsTotal } = state;
  const xpPct = Math.min(100, Math.round((player.xp / Math.max(1, requiredXP)) * 100));
  const equipped = (inventory || []).filter(i => i.equipped);
  const totalTourneyWins = (tournamentsWon || []).reduce((acc, t) => acc + (t.won || 0), 0);

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <!-- Hero Player Card -->
      <div class="card card-glow-cyan" style="background:linear-gradient(135deg, rgba(14,22,44,0.94), rgba(8,14,28,0.94));">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:18px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="badge badge-cyan">${esc(tier.badge)} • ${esc(tier.name)}</span>
              <span class="badge badge-gold">Season ${player.season}</span>
              <span class="badge badge-emerald">Chapter ${Math.min(50, player.current_chapter)}/50</span>
            </div>
            <h1 style="font-size:2.1rem;">${esc(player.name)}</h1>
            <p style="color:var(--text-muted);margin:6px 0 0;font-size:0.92rem;">
              ${esc(player.primary_role)} • ${esc(player.batting_hand)} • ${esc(player.bowling_style)} • 🌍 ${esc(player.nationality)}
            </p>
            <p style="color:var(--cyan);margin:4px 0 0;font-size:0.84rem;">
              🎓 ${esc(academy?.name || player.academy_id)} &nbsp;|&nbsp; 🏆 Tournaments Won: <strong>${totalTourneyWins}</strong> &nbsp;|&nbsp; 👑 Franchise Titles: <strong>${player.franchise_titles || 0}</strong>
            </p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-emerald" id="dash-go-chapter">🏏 Play Chapter Match</button>
            <button class="btn btn-primary" id="dash-go-train">🏋️ Train</button>
            <button class="btn btn-gold" id="dash-go-franchise">🏟️ Franchise</button>
          </div>
        </div>

        <!-- Level & XP Bar -->
        <div style="margin-top:18px;">
          <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:6px;">
            <span class="mono">LEVEL <strong>${player.level}</strong></span>
            <span class="mono" style="color:var(--text-muted);">${player.xp} / ${requiredXP} XP (${xpPct}%)</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${xpPct}%"></div></div>
        </div>
      </div>

      <!-- Vitals & Career Quick Metrics -->
      <div class="grid-4">
        <div class="card">
          <div class="label">⚡ Energy &amp; Vitals</div>
          <div class="stat-big" style="font-size:1.7rem;color:var(--emerald);">${player.energy}<span style="font-size:0.9rem;color:var(--text-muted);">/100</span></div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">Confidence: <strong style="color:#fff;">${player.confidence}</strong> • Form: <strong style="color:#fff;">${player.form}</strong></div>
        </div>
        <div class="card">
          <div class="label">🪙 Economy &amp; Points</div>
          <div class="stat-big" style="font-size:1.7rem;color:var(--gold);">${player.coins.toLocaleString()} <span style="font-size:0.85rem;">Coins</span></div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">Tickets: <strong style="color:#fff;">${player.training_tokens}</strong> • SP: <strong style="color:var(--cyan);">${player.skill_points}</strong></div>
        </div>
        <div class="card">
          <div class="label">📊 Career Totals</div>
          <div class="stat-big" style="font-size:1.7rem;color:#fff;">${stats.runs || 0} <span style="font-size:0.85rem;color:var(--text-muted);">Runs</span> / ${stats.wickets || 0} <span style="font-size:0.85rem;color:var(--text-muted);">Wkts</span></div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">Matches: <strong style="color:#fff;">${stats.matches || 0}</strong> • Rep: <strong style="color:var(--gold);">${player.reputation}</strong></div>
        </div>
        <div class="card">
          <div class="label">💼 Club &amp; Achievements</div>
          <div style="font-weight:700;font-size:1rem;color:var(--cyan);margin-top:4px;">${esc(activeContract ? activeContract.club_name : 'Academy Trainee')}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">Sponsor: <strong style="color:#fff;">${esc(player.sponsor || 'None')}</strong> • Badges: <strong>${achievementsUnlockedCount}/${achievementsTotal}</strong></div>
        </div>
      </div>

      <!-- Equipped Gear Strip -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3>🎒 Equipped Gear Loadout</h3>
          <button class="btn btn-sm" id="dash-go-locker">Manage Locker &amp; Shop ➡️</button>
        </div>
        <div class="grid-3">
          ${equipped.length > 0 ? equipped.map(item => `
            <div style="padding:12px;border-radius:12px;background:rgba(8,13,27,0.7);border:1px solid var(--border-subtle);" class="rarity-${esc(item.rarity)}">
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);">
                <span>${esc(item.type)}</span>
                <span style="color:var(--gold);">${esc(item.rarity)}</span>
              </div>
              <div style="font-weight:700;margin:4px 0;">${esc(item.name)}</div>
              <div class="mono" style="font-size:0.76rem;color:var(--emerald);">
                ${Object.entries(item.bonuses || {}).map(([k, v]) => `+${v} ${k}`).join(', ') || 'No bonuses'}
              </div>
            </div>
          `).join('') : '<div style="color:var(--text-muted);font-size:0.88rem;">No gear equipped yet. Visit the Locker!</div>'}
        </div>
      </div>

      <!-- Full 19-Attribute Matrix -->
      <div class="grid-3">
        ${ATTR_GROUPS.map(g => `
          <div class="card">
            <h3 style="margin-bottom:14px;color:${g.color};">${g.title}</h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${g.keys.map(([key, label]) => {
                const base = baseAttributes[key] || 10;
                const eff = effectiveAttributes[key] || base;
                const bonus = equipmentBonuses[key] || 0;
                const pct = Math.min(100, eff);
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                      <span>${label}</span>
                      <span class="mono"><strong>${eff}</strong>${bonus > 0 ? ` <span style="color:var(--emerald);">(+${bonus})</span>` : ''}</span>
                    </div>
                    <div class="progress-track" style="height:7px;">
                      <div class="progress-fill" style="width:${pct}%;background:${g.color};"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('dash-go-chapter').onclick = () => navigate('campaign');
  document.getElementById('dash-go-train').onclick = () => navigate('training');
  document.getElementById('dash-go-franchise').onclick = () => navigate('franchise');
  document.getElementById('dash-go-locker').onclick = () => navigate('locker');
}
