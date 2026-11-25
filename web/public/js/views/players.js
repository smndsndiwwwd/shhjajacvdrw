import { api, esc, toast } from '../api.js';
import { renderCommonProfileGraphicCard } from '../components/profileCard.js';

export async function renderPlayersScoutView(container, state, navigate, refresh) {
  let query = '';
  let results = [];
  let selectedProfile = null;
  let searchTimer = null;

  const loadSearch = async (q) => {
    const data = await api(`/api/players/search?q=${encodeURIComponent(q)}`, { silent: true });
    results = data.results || [];
    renderList();
  };

  const inspectPlayer = async (identifier) => {
    const prof = await api(`/api/players/profile?id=${encodeURIComponent(identifier)}`);
    selectedProfile = prof;
    renderInspector();
  };

  const renderList = () => {
    const listEl = document.getElementById('scout-results-list');
    if (!listEl) return;

    if (results.length === 0) {
      listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);">No matching or similar player names found for "${esc(query)}". Try another name or ID (e.g., CA-1001).</div>`;
      return;
    }

    listEl.innerHTML = results.map(r => `
      <button class="choice-card scout-pick-btn" data-id="${esc(r.discord_id)}" style="display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong style="font-size:0.96rem;color:#fff;">${esc(r.name)}</strong>
            <span class="badge badge-cyan mono">${esc(r.public_id || r.discord_id)}</span>
            <span class="badge badge-gold mono">LVL ${r.level}</span>
            <span class="badge badge-muted">${esc(r.primary_role)}</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">
            🌍 ${esc(r.nationality)} • ${esc(r.tier?.name || 'Player')} • Matches: ${r.matches || 0} • Runs: ${r.runs || 0} • Wkts: ${r.wickets || 0}
          </div>
        </div>
        <span class="btn btn-sm btn-primary">Inspect ➡️</span>
      </button>
    `).join('');

    listEl.querySelectorAll('.scout-pick-btn').forEach(btn => {
      btn.onclick = () => inspectPlayer(btn.dataset.id);
    });
  };

  const renderInspector = () => {
    const host = document.getElementById('scout-profile-host');
    if (!host) return;
    if (!selectedProfile) {
      host.innerHTML = `
        <div class="card" style="text-align:center;padding:34px;color:var(--text-muted);">
          <h3>🔍 Select Any Cricketer to Inspect</h3>
          <p style="margin-top:6px;">Choose a player from the search list on the left to view their official Profile Graphic Image Card, career stats, attributes, and unique ID.</p>
        </div>
      `;
      return;
    }

    const p = selectedProfile.player;
    const isSelf = state.player && p.discord_id === state.player.discord_id;
    const attrs = selectedProfile.effectiveAttributes || {};
    const eqB = selectedProfile.equipmentBonuses || {};
    const recent = selectedProfile.recentMatches || [];

    host.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div id="scout-graphic-card"></div>
        <div class="grid-2" style="gap:14px;">
          <div class="card">
            <h4 style="margin-bottom:10px;">⚡ Top Effective Attributes</h4>
            <div class="grid-2" style="gap:8px;font-size:0.82rem;">
              ${['power', 'timing', 'technique', 'aggression', 'accuracy', 'swing', 'seam', 'spin_bowling', 'fitness', 'mentality'].map(k => `
                <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(8,13,27,0.75);">
                  <span>${k.replace('_', ' ')}</span>
                  <span class="mono"><strong>${attrs[k] || 10}</strong>${eqB[k] ? ` <span style="color:var(--emerald);">(+${eqB[k]})</span>` : ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card">
            <h4 style="margin-bottom:10px;">📜 Recent Matches</h4>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;font-size:0.82rem;">
              ${recent.map(m => `
                <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(8,13,27,0.75);">
                  <span>vs <strong>${esc(m.opponent)}</strong></span>
                  <span class="mono">${m.runs}(${m.balls}b) • ${m.wickets}w • <strong>${esc(m.result)}</strong></span>
                </div>
              `).join('') || '<div style="color:var(--text-muted);">No matches played yet.</div>'}
            </div>
          </div>
        </div>
      </div>
    `;

    renderCommonProfileGraphicCard(document.getElementById('scout-graphic-card'), selectedProfile, {
      isSelf,
      onNavigate: isSelf ? navigate : null,
      onChallenge: !isSelf && state.player ? async (target) => {
        try {
          await api('/api/challenge/create', {
            method: 'POST',
            body: { opponent_id: target.discord_id, target_runs: 15 }
          });
          toast(`PvP Challenge sent to ${target.name} (${target.public_id || target.discord_id})!`, 'success');
          navigate('challenge');
        } catch {}
      } : null
    });
  };

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="card card-glow-cyan">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="badge badge-cyan">🔍 PLAYER DIRECTORY &amp; SCOUTING</span>
            <h2 style="margin-top:6px;">Search Cricketers by Name or Unique ID</h2>
            <p style="font-size:0.84rem;color:var(--text-muted);margin:4px 0 0;">
              Find players even with similar or partial names. Each player displays their Unique ID, Level, Role, Nation &amp; Stats so you can pick the exact person!
            </p>
          </div>
          ${state.player ? `<span class="badge badge-gold mono">Your ID: ${esc(state.player.public_id || state.player.discord_id)}</span>` : ''}
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
          <input id="scout-search-input" class="input" style="flex:1;min-width:220px;" placeholder="Type player name, similar spelling, or ID (e.g. Virat or CA-1001)..." />
          <button class="btn btn-primary" id="scout-search-btn">🔍 Search</button>
        </div>
      </div>

      <div class="match-layout" style="grid-template-columns: 0.9fr 1.1fr;">
        <div class="card">
          <h4 style="margin-bottom:10px;">🏏 Matching Players</h4>
          <div id="scout-results-list" style="display:flex;flex-direction:column;gap:8px;max-height:600px;overflow-y:auto;">
            <div style="color:var(--text-muted);">Loading players...</div>
          </div>
        </div>
        <div id="scout-profile-host"></div>
      </div>
    </div>
  `;

  const inputEl = document.getElementById('scout-search-input');
  const btnEl = document.getElementById('scout-search-btn');

  inputEl.oninput = () => {
    query = inputEl.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadSearch(query), 180);
  };
  btnEl.onclick = () => { query = inputEl.value; loadSearch(query); };

  renderInspector();
  await loadSearch('');
}
