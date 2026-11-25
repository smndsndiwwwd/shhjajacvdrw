import { api, esc, toast, openModal } from '../api.js';

export async function renderAdminView(container, state, refresh) {
  let tab = 'logs'; // 'logs' | 'players' | 'economy' | 'config'
  let filterLevel = 'ALL';
  let filterCategory = 'ALL';
  let searchQuery = '';
  let autoRefresh = false;
  let pollTimer = null;

  let overview = await api('/api/admin/overview');
  let logsData = await api('/api/admin/logs?limit=150');
  let usersData = await api('/api/admin/users');
  let itemsData = { items: [] };
  let acadData = { academies: [] };
  let sponsorData = { sponsors: [] };
  let emojiData = { emojis: [] };

  const stopPoll = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  const loadEconomyData = async () => {
    const [i, a, s, e] = await Promise.all([
      api('/api/admin/items'),
      api('/api/admin/academies'),
      api('/api/admin/sponsors'),
      api('/api/admin/emojis')
    ]);
    itemsData = i;
    acadData = a;
    sponsorData = s;
    emojiData = e;
  };

  const fetchLogs = async () => {
    const qs = new URLSearchParams({
      level: filterLevel,
      category: filterCategory,
      search: searchQuery,
      limit: '150'
    });
    const [ov, lg] = await Promise.all([
      api('/api/admin/overview'),
      api(`/api/admin/logs?${qs.toString()}`)
    ]);
    overview = ov;
    logsData = lg;
  };

  const levelBadgeClass = (lvl) => {
    if (lvl === 'ERROR' || lvl === 'WARN') return 'badge-crimson';
    if (lvl === 'ADMIN') return 'badge-gold';
    if (lvl === 'AUTH') return 'badge-cyan';
    if (lvl === 'MATCH') return 'badge-emerald';
    if (lvl === 'ECONOMY') return 'badge-purple';
    return 'badge-muted';
  };

  const paint = () => {
    const m = overview.metrics;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <!-- Admin Overview Metrics -->
        <div class="card card-glow-crimson">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <span class="badge badge-crimson">🛡️ ADMINISTRATOR COMMAND CENTER</span>
              <h1 style="margin:8px 0 2px;font-size:1.75rem;">System Audit Logs &amp; Governance</h1>
              <div style="font-size:0.84rem;color:var(--text-muted);">Signed in as Admin <strong>${esc(state.user.username)}</strong> • Monitors both Web Portal &amp; Discord Bot activity.</div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <div class="hud-chip">Users: <strong>${m.webUsers}</strong> (${m.admins} Admin)</div>
              <div class="hud-chip">Cricketers: <strong>${m.players}</strong></div>
              <div class="hud-chip">Matches: <strong>${m.totalMatches}</strong></div>
              <div class="hud-chip">Logs: <strong>${m.totalLogs}</strong> (<span style="color:var(--crimson);">${m.warnLogs} alerts</span>)</div>
            </div>
          </div>
        </div>

        <div class="subtabs">
          <button class="subtab ${tab === 'logs' ? 'active' : ''}" data-t="logs">📜 Full System Logs (${logsData.total})</button>
          <button class="subtab ${tab === 'players' ? 'active' : ''}" data-t="players">👥 Users, Roles &amp; Grants</button>
          <button class="subtab ${tab === 'economy' ? 'active' : ''}" data-t="economy">🛒 Items, Academies &amp; Sponsors</button>
          <button class="subtab ${tab === 'config' ? 'active' : ''}" data-t="config">⚙️ Emoji Config</button>
        </div>

        ${tab === 'logs' ? `
          ${(() => {
            const ins = logsData.insights || {};
            const hourly = ins.hourlyActivity || [];
            const maxHr = Math.max(1, ...hourly.map(h => h.count));
            return `
              <!-- Live Insights Command Strip -->
              <div class="grid-4" style="gap:12px;">
                <div class="card card-glow-cyan" style="padding:14px;">
                  <div class="label">🔐 Logins Today</div>
                  <div class="stat-big" style="font-size:1.75rem;color:var(--cyan);">${ins.loginsToday ?? 0}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Unique users: <strong style="color:#fff;">${ins.uniqueLoginsToday ?? 0}</strong> • 7d: <strong>${ins.loginsLast7d ?? 0}</strong></div>
                </div>
                <div class="card card-glow-emerald" style="padding:14px;">
                  <div class="label">🏏 New Signups &amp; Matches Today</div>
                  <div class="stat-big" style="font-size:1.75rem;color:var(--emerald);">${ins.matchesToday ?? 0} <span style="font-size:0.85rem;">Matches</span></div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Accounts: <strong style="color:#fff;">+${ins.registrationsToday ?? 0}</strong> • Careers: <strong style="color:#fff;">+${ins.careersCreatedToday ?? 0}</strong></div>
                </div>
                <div class="card card-glow-gold" style="padding:14px;">
                  <div class="label">🪙 Economy &amp; Admin Ops Today</div>
                  <div class="stat-big" style="font-size:1.75rem;color:var(--gold);">${ins.economyToday ?? 0}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Shop, Auctions, Contracts &amp; Grants</div>
                </div>
                <div class="card ${((ins.failedLoginsToday || 0) + (ins.alertsLast24h || 0)) > 0 ? 'card-glow-crimson' : ''}" style="padding:14px;">
                  <div class="label">🚨 Security &amp; Alerts (24h)</div>
                  <div class="stat-big" style="font-size:1.75rem;color:${(ins.failedLoginsToday || 0) > 0 ? 'var(--crimson)' : 'var(--emerald)'};">${ins.failedLoginsToday ?? 0} <span style="font-size:0.85rem;">Failed Logins</span></div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Total WARN/ERR (24h): <strong style="color:#fff;">${ins.alertsLast24h ?? 0}</strong></div>
                </div>
              </div>

              <!-- 24h Activity Chart + Active Users & Auth Feed -->
              <div class="grid-3" style="gap:14px;">
                <div class="card" style="padding:14px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <h4 style="font-size:0.92rem;">📈 24-Hour Event Activity (UTC)</h4>
                    <span class="badge badge-muted">Hourly</span>
                  </div>
                  <div class="spark-wrap">
                    ${hourly.map((h, i) => `
                      <div class="spark-col" title="${h.hour} UTC: ${h.count} events">
                        <div class="spark-bar" style="height:${Math.max(5, Math.round((h.count / maxHr) * 100))}%;"></div>
                        <div class="spark-lbl">${i % 4 === 0 ? h.hour.slice(0, 2) : ''}</div>
                      </div>
                    `).join('')}
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
                    ${(ins.categoryBreakdownToday || []).map(c => `<span class="badge badge-muted">${esc(c.category)}: ${c.cnt}</span>`).join('') || '<span style="font-size:0.76rem;color:var(--text-muted);">No events logged today yet.</span>'}
                  </div>
                </div>

                <div class="card" style="padding:14px;">
                  <h4 style="font-size:0.92rem;margin-bottom:8px;">🔥 Most Active Users Today</h4>
                  ${(ins.topActorsToday || []).length > 0 ? (ins.topActorsToday || []).map((a, idx) => `
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.08);font-size:0.82rem;">
                      <span>#${idx + 1} <strong style="color:var(--cyan);">${esc(a.actor)}</strong></span>
                      <span class="mono" style="color:var(--gold);">${a.events} events</span>
                    </div>
                  `).join('') : '<div style="font-size:0.8rem;color:var(--text-muted);">No user activity today yet.</div>'}
                </div>

                <div class="card" style="padding:14px;">
                  <h4 style="font-size:0.92rem;margin-bottom:8px;">🔑 Recent Login Activity</h4>
                  <div style="display:flex;flex-direction:column;gap:6px;max-height:155px;overflow-y:auto;">
                    ${(ins.recentLogins || []).map(rl => `
                      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.76rem;padding:4px 0;border-bottom:1px solid rgba(148,163,184,0.08);">
                        <span>
                          <span class="badge ${rl.title === 'Failed Login Attempt' ? 'badge-crimson' : 'badge-emerald'}" style="font-size:0.62rem;">${rl.title === 'Failed Login Attempt' ? 'FAIL' : 'OK'}</span>
                          <strong style="margin-left:4px;">${esc(rl.actor)}</strong>
                        </span>
                        <span class="mono" style="color:var(--text-muted);">${esc(rl.timestamp.slice(11, 16))} • ${esc(rl.ip || '')}</span>
                      </div>
                    `).join('') || '<div style="font-size:0.8rem;color:var(--text-muted);">No logins recorded.</div>'}
                  </div>
                </div>
              </div>
            `;
          })()}

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${['ALL', 'AUTH', 'ADMIN', 'MATCH', 'ECONOMY', 'INFO', 'WARN', 'ERROR'].map(l => `
                  <button class="btn btn-sm ${filterLevel === l ? 'btn-primary' : ''} log-lvl-btn" data-lvl="${l}">${l}</button>
                `).join('')}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm ${autoRefresh ? 'btn-emerald' : ''}" id="btn-log-auto">${autoRefresh ? '🟢 Live Stream: ON' : '⚪ Live Stream: OFF'}</button>
                <button class="btn btn-sm btn-primary" id="btn-log-refresh">🔄 Refresh</button>
                <button class="btn btn-sm btn-gold" id="btn-log-export">⬇️ Export JSON</button>
                <button class="btn btn-sm btn-danger" id="btn-log-clear">🗑️ Clear Logs</button>
              </div>
            </div>

            <div class="grid-2" style="margin-bottom:14px;">
              <div>
                <label class="label">Category Filter</label>
                <select id="log-cat-sel" class="select">
                  <option value="ALL">All Categories</option>
                  ${(logsData.categories || []).map(c => `<option value="${esc(c)}" ${filterCategory === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="label">Search Logs (Actor, Target, Title, Details)</label>
                <div style="display:flex;gap:8px;">
                  <input id="log-search-inp" class="input" value="${esc(searchQuery)}" placeholder="Search username, event, IP..." />
                  <button class="btn btn-primary" id="btn-log-search">Search</button>
                </div>
              </div>
            </div>

            <div class="table-wrap" style="max-height:520px;overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr><th>ID</th><th>Timestamp (UTC)</th><th>Level</th><th>Category</th><th>Actor</th><th>Target</th><th>Event Title</th><th>Details</th></tr>
                </thead>
                <tbody>
                  ${logsData.logs.map((row, idx) => `
                    <tr>
                      <td class="mono" style="color:var(--text-muted);">#${row.id}</td>
                      <td class="mono" style="font-size:0.75rem;white-space:nowrap;">${esc(row.timestamp)}</td>
                      <td><span class="badge ${levelBadgeClass(row.level)}">${esc(row.level)}</span></td>
                      <td><span class="badge badge-muted">${esc(row.category)}</span></td>
                      <td class="mono" style="color:var(--cyan);">${esc(row.actor)}</td>
                      <td class="mono">${esc(row.target || '—')}</td>
                      <td><strong>${esc(row.title)}</strong></td>
                      <td>
                        ${row.details || row.ip ? `<button class="btn btn-sm inspect-log-btn" data-idx="${idx}">Inspect</button>` : '—'}
                      </td>
                    </tr>
                  `).join('') || '<tr><td colspan="8" style="color:var(--text-muted);">No matching log entries.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${tab === 'players' ? `
          <div class="grid-2" style="margin-bottom:18px;">
            <div class="card card-glow-gold">
              <h3>🎁 Admin / Owner Resource Grant</h3>
              <form id="admin-give-form" style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
                <div>
                  <label class="label">Select Player</label>
                  <select id="give-player" class="select" required>
                    ${usersData.allPlayers.map(p => `<option value="${esc(p.discord_id)}">${esc(p.name)} (LVL ${p.level} • ${p.coins}c)</option>`).join('')}
                  </select>
                </div>
                <div class="grid-2">
                  <div>
                    <label class="label">Resource Type</label>
                    <select id="give-type" class="select">
                      <option value="coins">Coins</option>
                      <option value="xp">XP</option>
                      <option value="training_tokens">Training Tickets</option>
                      <option value="energy">Set Energy (0-100)</option>
                      <option value="reputation">Reputation</option>
                      <option value="confidence">Confidence</option>
                      <option value="form">Form</option>
                      <option value="skill_points">Skill Points</option>
                    </select>
                  </div>
                  <div>
                    <label class="label">Amount</label>
                    <input id="give-amt" class="input" type="number" value="500" required />
                  </div>
                </div>
                <button class="btn btn-gold" type="submit">⚡ Execute Resource Grant</button>
              </form>
            </div>

            <div class="card card-glow-cyan">
              <h3>➕ Create Web Account (Admin / Player)</h3>
              <form id="admin-create-user" style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
                <div>
                  <label class="label">Username</label>
                  <input id="cu-name" class="input" placeholder="3-24 chars" required />
                </div>
                <div class="grid-2">
                  <div>
                    <label class="label">Password</label>
                    <input id="cu-pass" class="input" type="password" placeholder="Min 6 chars" required />
                  </div>
                  <div>
                    <label class="label">Role</label>
                    <select id="cu-role" class="select"><option value="player">Player</option><option value="admin">Admin</option></select>
                  </div>
                </div>
                <button class="btn btn-primary" type="submit">Create Account</button>
              </form>
            </div>
          </div>

          <div class="card">
            <h3 style="margin-bottom:12px;">🔐 Registered Web Accounts &amp; Roles</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Username</th><th>Role</th><th>Cricketer</th><th>LVL / Coins</th><th>Last Login</th><th>Actions</th></tr></thead>
                <tbody>
                  ${usersData.webUsers.map(u => `
                    <tr>
                      <td><strong>${esc(u.username)}</strong></td>
                      <td><span class="badge ${u.role === 'admin' ? 'badge-crimson' : 'badge-cyan'}">${esc(u.role)}</span></td>
                      <td>${esc(u.player_name || 'No Career')}</td>
                      <td class="mono">${u.level ? `LVL ${u.level} • ${u.coins}c` : '—'}</td>
                      <td class="mono" style="font-size:0.74rem;">${esc(u.last_login || 'Never')}</td>
                      <td style="display:flex;gap:6px;">
                        ${u.id !== state.user.id ? `
                          <button class="btn btn-sm toggle-role-btn" data-id="${u.id}" data-role="${u.role === 'admin' ? 'player' : 'admin'}">
                            ${u.role === 'admin' ? 'Demote' : 'Make Admin'}
                          </button>
                          <button class="btn btn-danger btn-sm del-user-btn" data-id="${u.id}">Delete</button>
                        ` : '<span class="badge badge-muted">Current Session</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${tab === 'economy' ? `
          <div class="grid-2">
            <div class="card">
              <h3>🏏 Custom Shop Items</h3>
              <form id="adm-add-item" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;">
                <input id="ai-id" class="input" placeholder="id (e.g. titan_bat)" required />
                <input id="ai-name" class="input" placeholder="Display Name" required />
                <select id="ai-type" class="select"><option>Bat</option><option>Grip</option><option>Gloves</option><option>Pads</option><option>Helmet</option><option>Shoes</option></select>
                <select id="ai-rar" class="select"><option>Common</option><option>Rare</option><option>Epic</option><option>Legendary</option></select>
                <input id="ai-cost" class="input" type="number" placeholder="Cost (coins)" value="1000" required />
                <input id="ai-bonuses" class="input" placeholder='{"power":10,"timing":8}' value='{"power":10}' required />
                <button class="btn btn-emerald" type="submit" style="grid-column:span 2;">➕ Save Custom Item</button>
              </form>
              <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;">
                ${itemsData.items.map(it => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(6,10,22,0.75);border-radius:8px;font-size:0.82rem;">
                    <span><strong>${esc(it.name)}</strong> (${esc(it.type)} • 🪙${it.cost})</span>
                    <button class="btn btn-danger btn-sm del-item-btn" data-id="${esc(it.id)}">Delete</button>
                  </div>
                `).join('') || '<div style="color:var(--text-muted);font-size:0.82rem;">No custom items yet.</div>'}
              </div>
            </div>

            <div class="card">
              <h3>👟 Brand Sponsors</h3>
              <form id="adm-add-sp" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;">
                <input id="sp-id" class="input" placeholder="id (e.g. zenith)" required />
                <input id="sp-name" class="input" placeholder="Brand Name" required />
                <input id="sp-coins" class="input" type="number" placeholder="Bonus Coins" value="750" required />
                <input id="sp-rep" class="input" type="number" placeholder="Req Reputation" value="100" required />
                <input id="sp-desc" class="input" placeholder="Description" style="grid-column:span 2;" required />
                <button class="btn btn-gold" type="submit" style="grid-column:span 2;">➕ Save Sponsor</button>
              </form>
              <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;">
                ${sponsorData.sponsors.map(sp => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(6,10,22,0.75);border-radius:8px;font-size:0.82rem;">
                    <span><strong>${esc(sp.name)}</strong> (Rep ${sp.reputation_required} • 🪙${sp.bonus_coins})</span>
                    <button class="btn btn-danger btn-sm del-sp-btn" data-id="${esc(sp.id)}">Delete</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:16px;">
            <h3>🎓 Academies in Database (${acadData.academies.length})</h3>
            <div class="grid-3" style="margin-top:10px;max-height:260px;overflow-y:auto;">
              ${acadData.academies.map(ac => `
                <div style="padding:10px;border-radius:10px;background:rgba(6,10,22,0.75);display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:0.8rem;">
                  <div><strong>${esc(ac.name)}</strong><div style="color:var(--text-muted);">${esc(ac.id)} • ${esc(ac.training_bonus_text)}</div></div>
                  <button class="btn btn-danger btn-sm del-ac-btn" data-id="${esc(ac.id)}">Del</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${tab === 'config' ? `
          <div class="card">
            <h3>⚙️ Global Emoji Configuration</h3>
            <div class="grid-3" style="margin-top:14px;">
              ${emojiData.emojis.map(em => `
                <div style="display:flex;gap:8px;align-items:center;padding:10px;border-radius:10px;background:rgba(6,10,22,0.75);">
                  <div style="flex:1;"><div class="label" style="margin:0;">${esc(em.key)}</div><input class="input emoji-inp" data-key="${esc(em.key)}" value="${esc(em.value)}" style="margin-top:4px;padding:7px 10px;" /></div>
                  <button class="btn btn-sm btn-primary save-emoji-btn" data-key="${esc(em.key)}">Save</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Bind events
    document.querySelectorAll('.subtab').forEach(b => b.onclick = async () => {
      tab = b.dataset.t;
      if (tab === 'economy' || tab === 'config') await loadEconomyData();
      if (tab === 'players') usersData = await api('/api/admin/users');
      paint();
    });

    document.querySelectorAll('.log-lvl-btn').forEach(b => b.onclick = async () => {
      filterLevel = b.dataset.lvl;
      await fetchLogs();
      paint();
    });

    const catSel = document.getElementById('log-cat-sel');
    if (catSel) catSel.onchange = async () => { filterCategory = catSel.value; await fetchLogs(); paint(); };

    const srchBtn = document.getElementById('btn-log-search');
    if (srchBtn) srchBtn.onclick = async () => {
      searchQuery = document.getElementById('log-search-inp').value;
      await fetchLogs();
      paint();
    };

    const refBtn = document.getElementById('btn-log-refresh');
    if (refBtn) refBtn.onclick = async () => { await fetchLogs(); paint(); toast('Logs refreshed.', 'info'); };

    const autoBtn = document.getElementById('btn-log-auto');
    if (autoBtn) autoBtn.onclick = () => {
      autoRefresh = !autoRefresh;
      stopPoll();
      if (autoRefresh) {
        pollTimer = setInterval(async () => {
          if (tab !== 'logs' || !document.getElementById('btn-log-auto')) return stopPoll();
          await fetchLogs();
          paint();
        }, 3000);
      }
      paint();
    };

    const expBtn = document.getElementById('btn-log-export');
    if (expBtn) expBtn.onclick = () => {
      const blob = new Blob([JSON.stringify(logsData.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cricket-ascend-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const clrBtn = document.getElementById('btn-log-clear');
    if (clrBtn) clrBtn.onclick = async () => {
      await api('/api/admin/logs', { method: 'DELETE' });
      await fetchLogs();
      paint();
      toast('Logs cleared.', 'info');
    };

    document.querySelectorAll('.inspect-log-btn').forEach(b => b.onclick = () => {
      const row = logsData.logs[Number(b.dataset.idx)];
      let formatted = row.details || '';
      try { formatted = JSON.stringify(JSON.parse(row.details), null, 2); } catch {}
      openModal(`
        <h3>📜 Log Entry #${row.id}</h3>
        <div class="mono" style="font-size:0.8rem;color:var(--cyan);margin:8px 0;">${esc(row.timestamp)} • ${esc(row.level)} • ${esc(row.category)} • IP: ${esc(row.ip || 'N/A')}</div>
        <div style="margin-bottom:8px;"><strong>Actor:</strong> ${esc(row.actor)} &nbsp;|&nbsp; <strong>Target:</strong> ${esc(row.target || 'None')}</div>
        <pre class="mono" style="background:#050811;padding:12px;border-radius:10px;border:1px solid var(--border-subtle);overflow-x:auto;font-size:0.78rem;white-space:pre-wrap;">${esc(formatted || 'No extra details.')}</pre>
      `);
    });

    const giveForm = document.getElementById('admin-give-form');
    if (giveForm) giveForm.onsubmit = async (e) => {
      e.preventDefault();
      const res = await api('/api/admin/give', {
        method: 'POST',
        body: {
          player_id: document.getElementById('give-player').value,
          type: document.getElementById('give-type').value,
          amount: Number(document.getElementById('give-amt').value)
        }
      });
      toast(`Grant issued: ${res.summary}`, 'success');
      usersData = await api('/api/admin/users');
      await refresh();
      paint();
    };

    const cuForm = document.getElementById('admin-create-user');
    if (cuForm) cuForm.onsubmit = async (e) => {
      e.preventDefault();
      await api('/api/admin/users/create', {
        method: 'POST',
        body: {
          username: document.getElementById('cu-name').value.trim(),
          password: document.getElementById('cu-pass').value,
          role: document.getElementById('cu-role').value
        }
      });
      toast('Account created!', 'success');
      usersData = await api('/api/admin/users');
      paint();
    };

    document.querySelectorAll('.toggle-role-btn').forEach(b => b.onclick = async () => {
      await api('/api/admin/users/role', { method: 'POST', body: { user_id: Number(b.dataset.id), role: b.dataset.role } });
      toast('User role updated!', 'success');
      usersData = await api('/api/admin/users');
      paint();
    });

    document.querySelectorAll('.del-user-btn').forEach(b => b.onclick = async () => {
      await api(`/api/admin/users?id=${b.dataset.id}`, { method: 'DELETE' });
      toast('Account deleted.', 'info');
      usersData = await api('/api/admin/users');
      paint();
    });

    const addIt = document.getElementById('adm-add-item');
    if (addIt) addIt.onsubmit = async (e) => {
      e.preventDefault();
      await api('/api/admin/items', {
        method: 'POST',
        body: {
          id: document.getElementById('ai-id').value,
          name: document.getElementById('ai-name').value,
          type: document.getElementById('ai-type').value,
          rarity: document.getElementById('ai-rar').value,
          cost: Number(document.getElementById('ai-cost').value),
          bonuses: document.getElementById('ai-bonuses').value
        }
      });
      toast('Custom shop item saved!', 'success');
      await loadEconomyData(); paint();
    };
    document.querySelectorAll('.del-item-btn').forEach(b => b.onclick = async () => {
      await api(`/api/admin/items?id=${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
      await loadEconomyData(); paint();
    });

    const addSp = document.getElementById('adm-add-sp');
    if (addSp) addSp.onsubmit = async (e) => {
      e.preventDefault();
      await api('/api/admin/sponsors', {
        method: 'POST',
        body: {
          id: document.getElementById('sp-id').value,
          name: document.getElementById('sp-name').value,
          bonus_coins: Number(document.getElementById('sp-coins').value),
          reputation_required: Number(document.getElementById('sp-rep').value),
          description: document.getElementById('sp-desc').value
        }
      });
      toast('Sponsor saved!', 'success');
      await loadEconomyData(); paint();
    };
    document.querySelectorAll('.del-sp-btn').forEach(b => b.onclick = async () => {
      await api(`/api/admin/sponsors?id=${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
      await loadEconomyData(); paint();
    });
    document.querySelectorAll('.del-ac-btn').forEach(b => b.onclick = async () => {
      await api(`/api/admin/academies?id=${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
      await loadEconomyData(); paint();
    });
    document.querySelectorAll('.save-emoji-btn').forEach(b => b.onclick = async () => {
      const inp = document.querySelector(`.emoji-inp[data-key="${b.dataset.key}"]`);
      await api('/api/admin/emojis', { method: 'POST', body: { key: b.dataset.key, value: inp.value } });
      toast(`Saved ${b.dataset.key}`, 'success');
    });
  };

  paint();
  return stopPoll;
}
