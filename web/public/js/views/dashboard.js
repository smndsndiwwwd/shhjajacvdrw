import { esc } from '../api.js';
import { caIcon } from '../components/icons.js';
import { renderGearIconSVG } from '../components/gearSvg.js';
import { renderCommonProfileGraphicCard } from '../components/profileCard.js';

const ATTR_GROUPS = [
  {
    title: '🏏 Batting',
    color: 'var(--cyan)',
    keys: [
      ['power', 'Power'], ['timing', 'Timing'], ['technique', 'Technique'],
      ['defense', 'Defense'], ['aggression', 'Aggression'], ['spin', 'Playing Spin'], ['pace', 'Playing Pace']
    ]
  },
  {
    title: '🥎 Bowling',
    color: 'var(--crimson)',
    keys: [
      ['accuracy', 'Accuracy'], ['swing', 'Swing'], ['seam', 'Seam'],
      ['spin_bowling', 'Spin Craft'], ['variations', 'Variations']
    ]
  },
  {
    title: '⚡ Athleticism',
    color: 'var(--emerald)',
    keys: [
      ['fitness', 'Fitness'], ['stamina', 'Stamina'], ['running', 'Running Speed'],
      ['fielding', 'Fielding'], ['reflex', 'Reflexes'], ['throw_accuracy', 'Throw Acc'], ['mentality', 'Mentality']
    ]
  }
];

function computeRating(attrs, keys, level = 1) {
  const sum = keys.reduce((acc, k) => acc + (attrs[k] || 10), 0);
  const avg = sum / Math.max(1, keys.length);
  return Math.min(99, Math.max(40, Math.round(38 + avg * 0.85 + level * 0.45)));
}

export function renderDashboardView(container, state) {
  const {
    player,
    tier,
    requiredXP,
    baseAttributes,
    effectiveAttributes,
    equipmentBonuses,
    stats,
    activeContract,
    tournamentsWon,
    inventory,
    achievementsUnlockedCount,
    achievementsTotal
  } = state;

  const xpPct = Math.min(100, Math.round((player.xp / Math.max(1, requiredXP)) * 100));
  const equipped = (inventory || []).filter(i => i.equipped);
  const totalTourneyWins = (tournamentsWon || []).reduce((acc, t) => acc + (t.won || 0), 0);

  const batOvr = computeRating(effectiveAttributes, ['power', 'timing', 'technique', 'defense', 'spin', 'pace'], player.level);
  const bowlOvr = computeRating(effectiveAttributes, ['accuracy', 'swing', 'seam', 'spin_bowling', 'variations'], player.level);
  const athOvr = computeRating(effectiveAttributes, ['fitness', 'stamina', 'running', 'fielding', 'reflex', 'mentality'], player.level);
  const overallOvr = Math.min(99, Math.round((batOvr + bowlOvr + athOvr) / 3));

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <!-- Main Career Profile Card -->
      <div id="dash-graphic-card-host"></div>

      <!-- AAA Ratings, Vault & Honors Showcase -->
      <div class="grid-3 profile-showcase-grid">
        <div class="card card-glow-emerald" style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div>
            <div class="label">Player Rating</div>
            <div style="font-weight:700;font-size:1.05rem;color:#fff;margin-bottom:8px;">${esc(tier.name)}</div>
            <div style="display:flex;gap:12px;font-size:0.8rem;color:var(--text-muted);">
              <span>BAT <strong class="mono" style="color:var(--cyan);">${batOvr}</strong></span>
              <span>BWL <strong class="mono" style="color:var(--crimson);">${bowlOvr}</strong></span>
              <span>ATH <strong class="mono" style="color:var(--emerald);">${athOvr}</strong></span>
            </div>
          </div>
          <div class="ovr-ring">
            <div class="ovr-num">${overallOvr}</div>
            <div class="ovr-sub">OVR</div>
          </div>
        </div>

        <div class="card">
          <div class="label">Vitals &amp; Currencies</div>
          <div class="grid-2" style="gap:10px;margin-top:8px;">
            <div class="vault-pill ic-val">${caIcon('energy', 18)} <div><div class="label" style="margin:0;">Energy</div><strong class="mono">${player.energy}/100</strong></div></div>
            <div class="vault-pill ic-val">${caIcon('coin', 18)} <div><div class="label" style="margin:0;">Coins</div><strong class="mono" style="color:var(--gold);">${player.coins.toLocaleString()}</strong></div></div>
            <div class="vault-pill ic-val">${caIcon('ticket', 18)} <div><div class="label" style="margin:0;">Tickets</div><strong class="mono" style="color:var(--cyan);">${player.training_tokens}</strong></div></div>
            <div class="vault-pill ic-val">${caIcon('skill', 18)} <div><div class="label" style="margin:0;">Skill Pts</div><strong class="mono" style="color:var(--purple);">${player.skill_points}</strong></div></div>
          </div>
        </div>

        <div class="card card-glow-gold">
          <div class="label">Honors &amp; Affiliation</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;font-size:0.85rem;">
            <div class="ic-val">${caIcon('trophy', 17)} <span>Cups: <strong>${totalTourneyWins}</strong> • Franchise Titles: <strong>${player.franchise_titles || 0}</strong></span></div>
            <div class="ic-val">${caIcon('rep', 17)} <span>Reputation: <strong>${player.reputation}</strong> • Badges: <strong>${achievementsUnlockedCount}/${achievementsTotal}</strong></span></div>
            <div style="color:var(--text-muted);font-size:0.8rem;">
              Club: <strong style="color:#fff;">${esc(activeContract ? activeContract.club_name : 'Academy Trainee')}</strong> • Sponsor: <strong style="color:#fff;">${esc(player.sponsor || 'None')}</strong>
            </div>
            <div style="margin-top:2px;">
              <div style="display:flex;justify-content:space-between;font-size:0.74rem;color:var(--text-muted);margin-bottom:4px;">
                <span>Chapter ${Math.min(50, player.current_chapter)}/50</span>
                <span class="mono">XP ${xpPct}%</span>
              </div>
              <div class="progress-track" style="height:6px;"><div class="progress-fill" style="width:${xpPct}%;"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipped Kit Showcase -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3>Equipped Matchday Kit</h3>
          <span class="badge badge-muted">${equipped.length}/6 Slots Active</span>
        </div>
        <div class="grid-3">
          ${equipped.length > 0 ? equipped.map(item => `
            <div class="kit-slot equipped rarity-${esc(item.rarity)}">
              <div class="kit-icon-wrap">${renderGearIconSVG(item.type, item.rarity, true)}</div>
              <div style="min-width:0;flex:1;">
                <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted);">
                  <span>${esc(item.type)}</span>
                  <span style="color:var(--gold);">${esc(item.rarity)}</span>
                </div>
                <div style="font-weight:700;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.name)}</div>
                <div class="mono" style="font-size:0.74rem;color:var(--emerald);">
                  ${Object.entries(item.bonuses || {}).map(([k, v]) => `+${v} ${k.replace('_', ' ')}`).join(', ') || 'Cosmetic'}
                </div>
              </div>
            </div>
          `).join('') : '<div style="color:var(--text-muted);font-size:0.88rem;">No gear equipped yet.</div>'}
        </div>
      </div>

      <!-- 19-Attribute Breakdown -->
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

  renderCommonProfileGraphicCard(document.getElementById('dash-graphic-card-host'), state, { isSelf: true });
}
