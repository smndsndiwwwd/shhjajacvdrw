import { api, esc, formatRichText, toast, openModal, closeModal } from '../api.js';
import { renderFieldRadarSVG } from '../components/radar.js';
import { openPlayerProfileModal } from '../components/profileCard.js';

// ==========================================
// 1. CAREER CHAPTERS & PRACTICE VIEW
// ==========================================
export async function renderCampaignView(container, state, launchMatch) {
  const data = await api('/api/chapters');
  const { currentChapter, chapters } = data;
  const activeCh = chapters.find(c => c.id === currentChapter);
  let selectedTier = 'All';
  const tiers = ['All', 'Academy', 'Local Club', 'District League', 'State First-Class', 'T20 Franchise', 'International'];

  const paint = () => {
    const filtered = selectedTier === 'All' ? chapters : chapters.filter(c => c.tier === selectedTier);
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="grid-2">
          <div class="card card-glow-emerald">
            <span class="badge badge-emerald">Career Progression</span>
            <h2 style="margin:8px 0 4px;">🏏 ${activeCh ? `Chapter ${activeCh.id}: ${esc(activeCh.name)}` : 'All 50 Chapters Completed!'}</h2>
            ${activeCh ? `
              <p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:12px;">${esc(activeCh.description)}</p>
              <div style="font-size:0.84rem;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
                <div>⚔️ Opponent: <strong>${esc(activeCh.opponent)}</strong></div>
                <div>🌿 Pitch: <strong>${esc(activeCh.pitchCondition)}</strong></div>
                <div>🎯 Target: <strong>${activeCh.objective.target} runs in ${activeCh.objective.balls}b</strong></div>
                <div>🎁 Rewards: <strong style="color:var(--gold);">+${activeCh.rewards.xp} XP, +${activeCh.rewards.coins}c</strong></div>
              </div>
              ${!activeCh.meetsReq ? `<div style="color:var(--crimson);font-size:0.84rem;margin-bottom:10px;">⚠️ Requires Level ${activeCh.reqLevel} &amp; ${activeCh.reqRep} Rep</div>` : ''}
              <button class="btn btn-emerald btn-lg" id="btn-start-chapter" ${!activeCh.meetsReq ? 'disabled' : ''}>🏏 Play Chapter ${activeCh.id} (15 ⚡)</button>
            ` : `<p style="color:var(--gold);">🏆 Legend status achieved! Replay Exhibition or Franchise Leagues.</p>`}
          </div>

          <div class="card card-glow-cyan">
            <span class="badge badge-cyan">Grind &amp; Warmup</span>
            <h2 style="margin:8px 0 4px;">⚡ Practice Nets Match</h2>
            <p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:14px;">
              Unlimited casual matches scaled to your current level (${state.player.level}). Ideal for leveling up, building Reputation, and sharpening Timing!
            </p>
            <div style="font-size:0.84rem;margin-bottom:14px;">
              🎯 Target: <strong>${state.player.level * 3 + 12} runs in 12 balls</strong> &nbsp;|&nbsp; 🎁 <strong>+${state.player.level * 20 + 50} XP</strong>
            </div>
            <button class="btn btn-primary btn-lg" id="btn-start-practice">⚡ Start Practice Match (15 ⚡)</button>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
            <h3>📜 50-Chapter Campaign Roadmap</h3>
            <div class="subtabs" style="margin:0;">
              ${tiers.map(t => `<button class="subtab tier-pill ${selectedTier === t ? 'active' : ''}" data-tier="${t}">${t}</button>`).join('')}
            </div>
          </div>
          <div class="grid-3">
            ${filtered.map(ch => `
              <div class="card ${ch.current ? 'card-glow-emerald' : ''}" style="padding:14px;opacity:${ch.locked ? '0.62' : '1'};">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
                  <span class="mono" style="font-weight:700;font-size:0.82rem;">CH ${ch.id}</span>
                  <span class="badge ${ch.completed ? 'badge-emerald' : ch.current ? 'badge-gold' : 'badge-muted'}">
                    ${ch.completed ? '✅ Cleared' : ch.current ? '▶️ Active' : '🔒 Locked'}
                  </span>
                </div>
                <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${esc(ch.name)}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);">${esc(ch.tier)} • ${esc(ch.difficulty)}</div>
                <div class="mono" style="font-size:0.76rem;color:var(--cyan);margin-top:6px;">Goal: ${ch.objective.target} runs / ${ch.objective.balls}b</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.tier-pill').forEach(b => b.onclick = () => { selectedTier = b.dataset.tier; paint(); });
    const chBtn = document.getElementById('btn-start-chapter');
    if (chBtn) chBtn.onclick = () => launchMatch({ mode: 'chapter' });
    document.getElementById('btn-start-practice').onclick = () => launchMatch({ mode: 'practice' });
  };

  paint();
}

// ==========================================
// 2. TOURNAMENT ARENA VIEW
// ==========================================
export async function renderTournamentsView(container, state, launchMatch, refresh) {
  const hub = await api('/api/tournament/hub');

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <!-- Quick Exhibition & Active Run -->
      <div class="grid-2">
        <div class="card card-glow-emerald">
          <span class="badge badge-emerald">Always Unlocked • 10 ⚡</span>
          <h2 style="margin:8px 0 4px;">${esc(hub.quickMatch.name)}</h2>
          <p style="color:var(--text-muted);font-size:0.86rem;margin-bottom:12px;">${esc(hub.quickMatch.description)}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            ${hub.quickMatch.teams.map(t => `<span class="badge badge-muted">${esc(t.name)}</span>`).join('')}
          </div>
          <button class="btn btn-emerald" id="btn-quick-play">⚡ Play 5-Over Quick Match (+${hub.quickMatch.winXP} XP)</button>
        </div>

        <div class="card ${hub.activeRun ? 'card-glow-gold' : 'card-glow-cyan'}">
          ${hub.activeRun ? `
            <span class="badge badge-gold">Active Knockout Run</span>
            <h2 style="margin:8px 0 4px;">🏆 ${esc(hub.tournaments.find(t => t.id === hub.activeRun.tournament_id)?.name || hub.activeRun.tournament_id)}</h2>
            <p style="color:var(--text-muted);font-size:0.88rem;">
              Leading <strong>${esc(hub.activeRun.user_team)}</strong> • Next Opponent: <strong style="color:#fff;">${esc(hub.activeRun.opponent_team)}</strong>
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
              <button class="btn btn-gold" id="btn-tourn-play">▶️ Play Next Match (15 ⚡)</button>
              <button class="btn btn-danger btn-sm" id="btn-tourn-abandon">❌ Abandon Run</button>
            </div>
          ` : `
            <span class="badge badge-cyan">Knockout Cups</span>
            <h2 style="margin:8px 0 4px;">No Active Tournament</h2>
            <p style="color:var(--text-muted);font-size:0.88rem;">Select any unlocked competition below, pick your squad, and battle through Quarter-Finals, Semi-Finals, and the Grand Final!</p>
          `}
        </div>
      </div>

      ${hub.activeRun?.bracket ? `
        <div class="card">
          <h3 style="margin-bottom:12px;">📊 Live Knockout Bracket</h3>
          <div class="grid-3">
            ${hub.activeRun.bracket.rounds.map((r, rIdx) => `
              <div class="card" style="padding:14px;border-color:${rIdx === hub.activeRun.bracket.roundIndex ? 'var(--gold)' : ''};">
                <div class="badge ${rIdx === hub.activeRun.bracket.roundIndex ? 'badge-gold' : 'badge-muted'}" style="margin-bottom:8px;">${esc(r.name)}</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${r.matches.map(m => `
                    <div style="padding:8px 10px;border-radius:8px;background:rgba(6,10,22,0.85);font-size:0.8rem;border:1px solid ${m.isUserMatch ? 'var(--cyan)' : 'var(--border-subtle)'};">
                      <div>${m.isUserMatch ? '⭐ ' : ''}${esc(m.team1 || 'TBD')} <strong>vs</strong> ${esc(m.team2 || 'TBD')}</div>
                      ${m.winner ? `<div style="color:var(--emerald);font-size:0.75rem;">Winner: ${esc(m.winner)}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Tournament Directory -->
      <div class="card">
        <h3 style="margin-bottom:14px;">🌍 Global Knockout Tournaments</h3>
        <div class="grid-3">
          ${hub.tournaments.map(t => `
            <div class="card" style="border-color:${t.record?.won > 0 ? 'var(--gold)' : t.unlocked ? 'var(--border-glow)' : 'var(--border-subtle)'};opacity:${t.unlocked ? '1' : '0.68'};">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span class="badge badge-cyan">${esc(t.badge)}</span>
                <span class="badge ${t.record?.won > 0 ? 'badge-gold' : t.unlocked ? 'badge-emerald' : 'badge-crimson'}">
                  ${t.record?.won > 0 ? `🏆 Won x${t.record.won}` : t.unlocked ? '🔓 Unlocked' : `🔒 LVL ${t.requiredLevel}`}
                </span>
              </div>
              <h3 style="font-size:1.1rem;margin-bottom:4px;">${t.icon} ${esc(t.name)}</h3>
              <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 10px;">${esc(t.description)}</p>
              <div class="mono" style="font-size:0.76rem;color:var(--cyan);margin-bottom:10px;">
                ${t.teams.length} Teams • ${t.overs} Overs • ${esc(t.difficulty)}<br/>
                Prize: +${t.rewards.xp} XP • +${t.rewards.coins}c • +${t.rewards.reputation} Rep
              </div>
              <button class="btn btn-primary btn-sm enter-tourn-btn" data-id="${t.id}" ${!t.unlocked ? 'disabled' : ''}>
                ${t.unlocked ? 'Enter Competition ➡️' : `Requires LVL ${t.requiredLevel}`}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-quick-play').onclick = () => launchMatch({ mode: 'quick' });
  const tPlay = document.getElementById('btn-tourn-play');
  if (tPlay) tPlay.onclick = () => launchMatch({ mode: 'tournament' });
  const tAbandon = document.getElementById('btn-tourn-abandon');
  if (tAbandon) tAbandon.onclick = async () => {
    await api('/api/tournament/abandon', { method: 'POST' });
    toast('Tournament abandoned.', 'info');
    await refresh();
    renderTournamentsView(container, state, launchMatch, refresh);
  };

  document.querySelectorAll('.enter-tourn-btn').forEach(btn => {
    btn.onclick = () => {
      const t = hub.tournaments.find(x => x.id === btn.dataset.id);
      openModal(`
        <h2 style="margin-bottom:6px;">${t.icon} ${esc(t.name)}</h2>
        <p style="color:var(--text-muted);font-size:0.86rem;margin-bottom:14px;">Select the team you want to captain in the ${t.overs}-over knockout bracket:</p>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;">
          ${t.teams.map(tm => `
            <button class="btn pick-team-btn" data-team="${esc(tm.name)}" style="justify-content:space-between;padding:12px 14px;">
              <span>👕 <strong>${esc(tm.name)}</strong> <span style="color:var(--text-muted);font-size:0.78rem;">(${esc(tm.keyPlayer)})</span></span>
              <span class="badge badge-cyan">OVR ${tm.rating}</span>
            </button>
          `).join('')}
        </div>
      `);
      document.querySelectorAll('.pick-team-btn').forEach(tb => {
        tb.onclick = async () => {
          await api('/api/tournament/enter', { method: 'POST', body: { tournament_id: t.id, team_name: tb.dataset.team } });
          closeModal();
          toast(`Entered ${t.name} with ${tb.dataset.team}!`, 'success');
          await refresh();
          renderTournamentsView(container, state, launchMatch, refresh);
        };
      });
    };
  });
}

// ==========================================
// 3. T20 FRANCHISE LEAGUE VIEW
// ==========================================
export async function renderFranchiseView(container, state, launchMatch, refresh) {
  const hub = await api('/api/franchise/hub');
  const { leagues, pf, activeLeague, userTeam, standings, orangeCap, purpleCap, cooldownLeftMs, seasonFinishedReady } = hub;

  if (pf.status === 'active' && activeLeague) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="card card-glow-gold">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
            <div>
              <span class="badge badge-gold">${activeLeague.emoji} ${esc(activeLeague.name)}</span>
              <h1 style="margin:8px 0 4px;">${esc(userTeam?.name)} — ${esc(pf.contract_role)}</h1>
              <div class="mono" style="font-size:0.84rem;color:var(--cyan);">
                Contract: $${Number(pf.contract_value).toLocaleString()} • Round ${pf.current_round}/${activeLeague.seasonLength} (+Playoffs) • Stats: ${pf.runs}R (${pf.matches_played}M), ${pf.wickets}W
              </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${seasonFinishedReady
                ? `<button class="btn btn-gold btn-lg" id="btn-fran-finish">🏆 Finish Season &amp; Collect Awards</button>`
                : `<button class="btn btn-emerald btn-lg" id="btn-fran-play">🏏 Play Match Day (15 ⚡)</button>`
              }
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3 style="margin-bottom:12px;">📊 League Standings (Top 4 Qualify)</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th></tr></thead>
                <tbody>
                  ${standings.map(s => `
                    <tr style="${s.team_id === pf.team_id ? 'background:rgba(16,185,129,0.14);font-weight:700;' : ''}">
                      <td class="mono">${s.rank}</td>
                      <td>${s.rank <= 4 ? '🟢 ' : ''}${esc(s.teamName)}</td>
                      <td class="mono">${s.played}</td>
                      <td class="mono">${s.won}</td>
                      <td class="mono">${s.lost}</td>
                      <td class="mono" style="color:var(--gold);">${s.points}</td>
                      <td class="mono">${s.nrr >= 0 ? '+' : ''}${Number(s.nrr).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="card">
              <h3 style="margin-bottom:10px;color:var(--gold);">🍊 Orange Cap Race (Most Runs)</h3>
              ${orangeCap.map((p, idx) => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(148,163,184,0.08);font-size:0.86rem;">
                  <span>#${idx + 1} <strong style="color:${p.isUser ? 'var(--emerald)' : '#fff'}">${esc(p.name)}</strong></span>
                  <span class="mono" style="color:var(--gold);">${p.runs} runs</span>
                </div>
              `).join('')}
            </div>

            <div class="card">
              <h3 style="margin-bottom:10px;color:var(--purple);">🍇 Purple Cap Race (Most Wickets)</h3>
              ${purpleCap.map((p, idx) => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(148,163,184,0.08);font-size:0.86rem;">
                  <span>#${idx + 1} <strong style="color:${p.isUser ? 'var(--emerald)' : '#fff'}">${esc(p.name)}</strong></span>
                  <span class="mono" style="color:var(--purple);">${p.wickets} wkts</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    const playBtn = document.getElementById('btn-fran-play');
    if (playBtn) playBtn.onclick = async () => {
      try {
        const res = await api('/api/match/start', { method: 'POST', body: { mode: 'franchise' } });
        if (res.benched) {
          toast(res.message, res.won ? 'success' : 'info');
          await refresh();
          renderFranchiseView(container, state, launchMatch, refresh);
        } else {
          launchMatch({ existingMatch: res.match });
        }
      } catch {}
    };

    const finBtn = document.getElementById('btn-fran-finish');
    if (finBtn) finBtn.onclick = async () => {
      const res = await api('/api/franchise/end-season', { method: 'POST' });
      openModal(`
        <h2>🏆 Franchise Season Complete!</h2>
        <p style="margin:10px 0;">${res.wonTrophy ? `🎉 CHAMPIONS! Your team lifted the trophy (+${res.titlePrize} Coins)!` : `Season finished at Rank #${res.userRank}.`}</p>
        <div class="card" style="padding:12px;margin:10px 0;">
          <div>🍊 Orange Cap: <strong>${esc(res.orangeWinner)}</strong></div>
          <div>🍇 Purple Cap: <strong>${esc(res.purpleWinner)}</strong></div>
          <div style="margin-top:6px;color:var(--emerald);">Rewards: +${res.awardCoins} Coins • +${res.repGained} Reputation</div>
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('modal-bg').click()">Close</button>
      `);
      await refresh();
      renderFranchiseView(container, state, launchMatch, refresh);
    };
    return;
  }

  const daysLeft = cooldownLeftMs > 0 ? Math.ceil(cooldownLeftMs / (24 * 60 * 60 * 1000)) : 0;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div class="card card-glow-cyan">
        <span class="badge badge-cyan">Mega Auction Directory</span>
        <h2 style="margin:8px 0 4px;">🏟️ Global T20 Franchise Leagues</h2>
        <p style="color:var(--text-muted);font-size:0.88rem;margin:0;">
          Enter the televised Mega Auction for any premier global T20 league, earn match fees, win Orange/Purple caps, and battle in Top-4 playoffs.
          ${daysLeft > 0 ? `<br/><strong style="color:var(--gold);">⏳ Off-season cooldown: ${daysLeft} day(s) remaining (you can also enter via exhibition auction).</strong>` : ''}
        </p>
      </div>

      <div class="grid-3">
        ${leagues.map(l => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:1.25rem;">${l.emoji} <strong>${esc(l.shortName)}</strong></span>
              <span class="badge badge-gold">${'★'.repeat(l.prestige)}</span>
            </div>
            <h3 style="font-size:1.05rem;margin-bottom:6px;">${esc(l.name)}</h3>
            <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 12px;">${esc(l.history)}</p>
            <div class="mono" style="font-size:0.76rem;color:var(--cyan);margin-bottom:14px;">
              Difficulty: ${esc(l.difficulty)} • ${l.seasonLength} Rounds + Playoffs<br/>
              Prize Pool: 🪙 ${l.prizeMoney.toLocaleString()} • Avg Salary: 🪙 ${l.avgSalary}
            </div>
            <button class="btn btn-gold enter-auction-btn" data-league="${l.id}">🔨 Enter ${esc(l.shortName)} Auction</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('.enter-auction-btn').forEach(btn => {
    btn.onclick = async () => {
      try {
        const res = await api('/api/franchise/auction', {
          method: 'POST',
          body: { league_id: btn.dataset.league, bypass_cooldown: daysLeft > 0 }
        });
        openModal(`
          <h2>🔨 Live Televised Auction Broadcast</h2>
          <div id="auction-feed" style="display:flex;flex-direction:column;gap:8px;margin:14px 0;"></div>
          <div id="auction-footer" style="display:none;margin-top:14px;">
            <button class="btn btn-emerald" id="auction-done-btn">🏟️ Open Franchise Dashboard</button>
          </div>
        `);
        const feed = document.getElementById('auction-feed');
        for (let i = 0; i < res.steps.length; i++) {
          const item = document.createElement('div');
          item.className = 'comm-item';
          item.textContent = res.steps[i];
          feed.appendChild(item);
          await new Promise(r => setTimeout(r, 650));
        }
        document.getElementById('auction-footer').style.display = 'block';
        document.getElementById('auction-done-btn').onclick = async () => {
          closeModal();
          await refresh();
          renderFranchiseView(container, state, launchMatch, refresh);
        };
      } catch {}
    };
  });
}

// ==========================================
// 4. CHALLENGE MODE (PvP DUELS) VIEW
// ==========================================
export async function renderChallengeView(container, state, refresh) {
  const hub = await api('/api/challenge/hub');
  const activeDuel = hub.challenges.find(c => c.status === 'active');

  const paintDuelPlay = (duel) => {
    const st = duel.state;
    const isBatter = st.batterId === state.player.discord_id;
    return `
      <div class="card card-glow-gold" style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
          <div>
            <span class="badge badge-gold">⚔️ LIVE 1-OVER SHOWDOWN</span>
            <h2 style="margin-top:6px;">${esc(duel.challenger_name)} vs ${esc(duel.opponent_name)}</h2>
          </div>
          <div class="score-big" style="font-size:1.8rem;">${st.runs}/${st.wickets} <span style="font-size:0.9rem;color:var(--cyan);">(${st.balls}/6b • Target ${st.targetRuns})</span></div>
        </div>
        <div class="grid-2">
          <div>
            ${isBatter ? `
              ${st.pendingDelivery ? `
                <div style="padding:10px;border-radius:10px;background:rgba(56,189,248,0.12);margin-bottom:12px;font-size:0.86rem;">
                  🥎 Delivery incoming: <strong>${esc(st.pendingDelivery.speed)} ${esc(st.pendingDelivery.variation)}</strong> on <strong>${esc(st.pendingDelivery.line)}</strong> (${esc(st.pendingDelivery.length)})
                </div>
                <div class="grid-2" style="gap:8px;margin-bottom:10px;">
                  <div><label class="label">Stance</label><select id="pvp-stance" class="select"><option>In Line</option><option>Off Side</option><option>Leg Side</option></select></div>
                  <div><label class="label">Footwork</label><select id="pvp-fw" class="select"><option>Front Foot</option><option>Back Foot</option><option>Advanced</option><option>Leave</option></select></div>
                  <div><label class="label">Intent</label><select id="pvp-intent" class="select"><option>Stroke</option><option>Loft</option><option>Push</option><option>Leave</option></select></div>
                  <div><label class="label">Zone</label><select id="pvp-zone" class="select"><option>Cover</option><option>Long Off</option><option>Long On</option><option>Mid Wicket</option><option>Square Leg</option><option>Fine Leg</option><option>Point</option><option>Third Man</option></select></div>
                </div>
                <button class="btn btn-emerald" id="btn-pvp-bat" data-id="${duel.id}">🏏 Play Shot</button>
              ` : `<div style="color:var(--gold);">⏳ Waiting for opponent bowler to pick delivery... <button class="btn btn-sm" id="btn-pvp-poll">🔄 Refresh</button></div>`}
            ` : `
              ${!st.pendingDelivery ? `
                <div class="grid-2" style="gap:8px;margin-bottom:10px;">
                  <div><label class="label">Line</label><select id="pvp-line" class="select"><option>Stumps</option><option>Off Side</option><option>Leg Side</option><option>Wide</option></select></div>
                  <div><label class="label">Length</label><select id="pvp-len" class="select"><option>Good Length</option><option>Yorker</option><option>Full</option><option>Short</option></select></div>
                  <div><label class="label">Variation</label><select id="pvp-var" class="select"><option>Normal Delivery</option><option>Swing/Spin</option><option>Cutter/Googly</option><option>Slower Ball</option></select></div>
                  <div><label class="label">Field Trap</label><select id="pvp-fld" class="select"><option>Balanced</option><option>Attacking</option><option>Defensive</option></select></div>
                </div>
                <button class="btn btn-primary" id="btn-pvp-bowl" data-id="${duel.id}">🥎 Send Delivery</button>
              ` : `<div style="color:var(--gold);">⏳ Delivery sent! Waiting for batter to swing... <button class="btn btn-sm" id="btn-pvp-poll">🔄 Refresh</button></div>`}
            `}
          </div>
          <div>
            ${renderFieldRadarSVG({ fieldPreset: st.pendingDelivery?.fieldPreset || 'Balanced', isPowerplay: true, battingHand: state.player.batting_hand })}
          </div>
        </div>
        <div class="commentary-feed" style="margin-top:12px;">
          ${(st.log || []).map(l => `<div class="comm-item">${formatRichText(l)}</div>`).join('')}
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      ${activeDuel ? paintDuelPlay(activeDuel) : ''}

      <div class="grid-2">
        <div class="card card-glow-cyan">
          <h3>⚔️ Issue 1-Over Challenge Duel</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;margin:6px 0 14px;">Challenge another registered player online or take on the AI Challenger Bot in a 6-ball shootout!</p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div>
              <label class="label">Filter Rival (Name, Similar Name, or Unique ID)</label>
              <input id="chal-opp-filter" class="input" placeholder="Filter by name or ID (e.g. CA-1002)..." style="margin-bottom:8px;" />
              <label class="label">Select Opponent</label>
              <select id="chal-opp" class="select">
                <option value="ai_rival">🤖 AI Challenger Bot (Instant Play)</option>
                ${hub.rivals.map(r => `<option value="${esc(r.discord_id)}">${esc(r.name)} [${esc(r.public_id || r.discord_id)}] • LVL ${r.level} • ${esc(r.primary_role)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Target Runs (6–36)</label>
              <input id="chal-target" class="input" type="number" min="6" max="36" value="15" />
            </div>
            <button class="btn btn-primary" id="btn-create-chal">⚔️ Launch Challenge</button>
          </div>
        </div>

        <div class="card">
          <h3>📊 Your PvP Record</h3>
          <div class="grid-3" style="margin-top:12px;gap:10px;">
            <div class="card" style="padding:12px;"><div class="label">Played</div><div class="stat-big" style="font-size:1.5rem;">${hub.myStats.played}</div></div>
            <div class="card" style="padding:12px;"><div class="label">Won</div><div class="stat-big" style="font-size:1.5rem;color:var(--emerald);">${hub.myStats.won}</div></div>
            <div class="card" style="padding:12px;"><div class="label">Runs / Wkts</div><div class="stat-big" style="font-size:1.3rem;">${hub.myStats.runs} / ${hub.myStats.wickets}</div></div>
          </div>

          <h4 style="margin:16px 0 8px;">Recent &amp; Pending Duels</h4>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;">
            ${hub.challenges.map(c => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:rgba(6,10,22,0.75);font-size:0.82rem;">
                <div>
                  <strong>${esc(c.challenger_name)} ${c.challenger_public_id ? `[${esc(c.challenger_public_id)}]` : ''} vs ${esc(c.opponent_name)} ${c.opponent_public_id ? `[${esc(c.opponent_public_id)}]` : ''}</strong>
                  <span class="badge badge-muted">${esc(c.status)}</span>
                </div>
                ${c.status === 'pending' && c.opponent_id === state.player.discord_id ? `
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-emerald btn-sm chal-resp" data-id="${c.id}" data-acc="1">Accept</button>
                    <button class="btn btn-danger btn-sm chal-resp" data-id="${c.id}" data-acc="0">Decline</button>
                  </div>
                ` : `<span class="mono" style="color:var(--gold);">Target ${c.target_runs}</span>`}
              </div>
            `).join('') || '<div style="color:var(--text-muted);font-size:0.84rem;">No challenges yet.</div>'}
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">🏆 Global PvP Challenge Leaderboard</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Rank</th><th>Player</th><th>ID</th><th>Level</th><th>Played</th><th>Wins</th><th>Runs</th><th>Wickets</th><th></th></tr></thead>
            <tbody>
              ${hub.leaderboard.map((r, i) => `
                <tr>
                  <td class="mono">#${i + 1}</td>
                  <td><strong>${esc(r.name)}</strong></td>
                  <td class="mono"><span class="badge badge-cyan">${esc(r.public_id || r.discord_id)}</span></td>
                  <td class="mono">LVL ${r.level}</td>
                  <td class="mono">${r.played}</td>
                  <td class="mono" style="color:var(--emerald);">${r.won}</td>
                  <td class="mono">${r.runs}</td>
                  <td class="mono">${r.wickets}</td>
                  <td><button class="btn btn-sm pvp-view-prof" data-id="${esc(r.discord_id)}">👤 Card</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const oppFilter = document.getElementById('chal-opp-filter');
  const oppSel = document.getElementById('chal-opp');
  if (oppFilter && oppSel) {
    oppFilter.oninput = () => {
      const q = oppFilter.value.trim().toLowerCase();
      const filtered = hub.rivals.filter(r =>
        !q ||
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.public_id || r.discord_id || '').toLowerCase().includes(q) ||
        String(r.primary_role || '').toLowerCase().includes(q)
      );
      oppSel.innerHTML = `<option value="ai_rival">🤖 AI Challenger Bot (Instant Play)</option>` +
        filtered.map(r => `<option value="${esc(r.discord_id)}">${esc(r.name)} [${esc(r.public_id || r.discord_id)}] • LVL ${r.level} • ${esc(r.primary_role)}</option>`).join('');
    };
  }
  document.querySelectorAll('.pvp-view-prof').forEach(b => b.onclick = () => {
    openPlayerProfileModal(b.dataset.id, state.player.discord_id);
  });

  document.getElementById('btn-create-chal').onclick = async () => {
    const opponent_id = document.getElementById('chal-opp').value;
    const target_runs = Number(document.getElementById('chal-target').value) || 15;
    await api('/api/challenge/create', { method: 'POST', body: { opponent_id, target_runs } });
    toast('Challenge duel created!', 'success');
    renderChallengeView(container, state, refresh);
  };

  document.querySelectorAll('.chal-resp').forEach(b => b.onclick = async () => {
    await api('/api/challenge/respond', { method: 'POST', body: { challenge_id: b.dataset.id, accept: b.dataset.acc === '1' } });
    renderChallengeView(container, state, refresh);
  });

  const pollBtn = document.getElementById('btn-pvp-poll');
  if (pollBtn) pollBtn.onclick = () => renderChallengeView(container, state, refresh);

  const batBtn = document.getElementById('btn-pvp-bat');
  if (batBtn) batBtn.onclick = async () => {
    await api('/api/challenge/play', {
      method: 'POST',
      body: {
        challenge_id: batBtn.dataset.id,
        stance: document.getElementById('pvp-stance').value,
        footwork: document.getElementById('pvp-fw').value,
        intent: document.getElementById('pvp-intent').value,
        zone: document.getElementById('pvp-zone').value
      }
    });
    await refresh();
    renderChallengeView(container, state, refresh);
  };

  const bowlBtn = document.getElementById('btn-pvp-bowl');
  if (bowlBtn) bowlBtn.onclick = async () => {
    await api('/api/challenge/play', {
      method: 'POST',
      body: {
        challenge_id: bowlBtn.dataset.id,
        line: document.getElementById('pvp-line').value,
        length: document.getElementById('pvp-len').value,
        variation: document.getElementById('pvp-var').value,
        fieldPreset: document.getElementById('pvp-fld').value
      }
    });
    renderChallengeView(container, state, refresh);
  };
}
