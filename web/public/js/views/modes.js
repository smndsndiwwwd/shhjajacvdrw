import { api, esc, formatRichText, toast, openModal, closeModal } from '../api.js';
import { caIcon } from '../components/icons.js';
import { openPlayerProfileModal } from '../components/profileCard.js';
import { mountChallengeDuelArena } from './challengeDuel.js';

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
  let arenaCleanup = null;
  const hub = await api('/api/challenge/hub');
  let dismissed = [];
  try { dismissed = JSON.parse(sessionStorage.getItem('ca_dismissed_challenges') || '[]'); } catch {}

  const activeDuel = hub.challenges.find(c => c.status === 'active');
  const recentEndedDuel = !activeDuel
    ? hub.challenges.find(c => ['completed', 'expired', 'forfeited'].includes(c.status) && !dismissed.includes(c.id))
    : null;
  const featuredDuel = activeDuel || recentEndedDuel;

  const myOngoingChallenge = hub.challenges.find(c =>
    c.status === 'active' || (c.status === 'pending' && c.challenger_id === state.player.discord_id)
  );

  const fmtTimeLeft = (expMs) => {
    if (!expMs || expMs <= 0) return '';
    const diff = Math.max(0, expMs - Date.now());
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${String(secs).padStart(2, '0')}s left`;
  };

  const minLvl = hub.minLevel || 5;
  const challengeLocked = (state.player.level || 1) < minLvl;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div id="challenge-arena-host"></div>

      ${challengeLocked ? `
        <div class="card card-glow-crimson" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <span class="badge badge-crimson">🔒 LOCKED FEATURE • REQUIRES LEVEL ${minLvl}</span>
              <h2 style="margin:8px 0 4px;">Challenge Mode Unlocks at Level ${minLvl}</h2>
              <p style="margin:0;color:var(--text-muted);font-size:0.88rem;">
                You are currently <strong>Level ${state.player.level || 1}</strong>. Build your skills in Career Chapters, Practice Nets, or Training to unlock head-to-head PvP duels!
              </p>
            </div>
            <div class="mono" style="font-size:1.4rem;color:var(--gold);font-weight:700;">LVL ${state.player.level || 1} / ${minLvl}</div>
          </div>
        </div>
      ` : ''}

      <div class="grid-2">
        <div class="card card-glow-cyan">
          <h3>⚔️ Issue 1-Over Challenge Duel</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;margin:6px 0 14px;">Challenge another registered player online or take on the AI Challenger Bot in a 6-ball shootout!</p>
          <div style="display:flex;flex-direction:column;gap:10px;opacity:${challengeLocked ? '0.5' : '1'};pointer-events:${challengeLocked ? 'none' : 'auto'};">
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
            ${myOngoingChallenge ? `
              <div style="padding:10px 12px;border-radius:10px;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.35);font-size:0.82rem;color:#fecdd3;">
                ⚠️ You already have an ongoing <strong>${esc(myOngoingChallenge.status)}</strong> challenge (${fmtTimeLeft(myOngoingChallenge.expires_at) || 'active'}). Complete or cancel it before creating another!
              </div>
            ` : ''}
            <button class="btn btn-primary" id="btn-create-chal" ${myOngoingChallenge || challengeLocked ? 'disabled' : ''}>${challengeLocked ? `🔒 Unlocks at Level ${minLvl}` : '⚔️ Launch Challenge'}</button>
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
          <div style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto;">
            ${hub.challenges.map(c => {
              const winLbl = c.winner_name ? `🏆 ${c.winner_name}` : '';
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-radius:8px;background:rgba(6,10,22,0.75);font-size:0.82rem;">
                  <div>
                    <strong>${esc(c.challenger_name)} ${c.challenger_public_id ? `[${esc(c.challenger_public_id)}]` : ''} vs ${esc(c.opponent_name)} ${c.opponent_public_id ? `[${esc(c.opponent_public_id)}]` : ''}</strong>
                    <span class="badge badge-muted">${esc(c.status)}</span>
                    ${winLbl ? `<span class="badge badge-emerald" style="margin-left:4px;">${esc(winLbl)}</span>` : ''}
                  </div>
                  ${c.status === 'pending' && c.opponent_id === state.player.discord_id ? `
                    <div style="display:flex;gap:6px;align-items:center;">
                      ${c.expires_at ? `<span class="mono" style="font-size:0.72rem;color:var(--gold);">${fmtTimeLeft(c.expires_at)}</span>` : ''}
                      <button class="btn btn-emerald btn-sm chal-resp" data-id="${c.id}" data-acc="1">Accept</button>
                      <button class="btn btn-danger btn-sm chal-resp" data-id="${c.id}" data-acc="0">Decline</button>
                    </div>
                  ` : c.status === 'pending' && c.challenger_id === state.player.discord_id ? `
                    <div style="display:flex;gap:6px;align-items:center;">
                      ${c.expires_at ? `<span class="mono" style="font-size:0.72rem;color:var(--gold);">${fmtTimeLeft(c.expires_at)}</span>` : ''}
                      <button class="btn btn-danger btn-sm chal-cancel" data-id="${c.id}">🚫 Cancel</button>
                    </div>
                  ` : `
                    <div style="display:flex;gap:6px;align-items:center;">
                      <span class="mono" style="color:var(--gold);">${c.state?.runs || 0}/${c.state?.wickets || 0} (T:${c.target_runs})</span>
                      ${['completed', 'expired', 'forfeited'].includes(c.status) ? `<button class="btn btn-sm chal-view-res" data-id="${c.id}">📜 Summary</button>` : ''}
                    </div>
                  `}
                </div>
              `;
            }).join('') || '<div style="color:var(--text-muted);font-size:0.84rem;">No challenges yet.</div>'}
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

  const mountDuel = (duelObj) => {
    if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
    const host = document.getElementById('challenge-arena-host');
    if (!duelObj || !host) { if (host) host.innerHTML = ''; return; }
    arenaCleanup = mountChallengeDuelArena(host, duelObj, state, {
      onCompleteDismiss: async (doneId) => {
        try {
          if (!dismissed.includes(doneId)) dismissed.push(doneId);
          sessionStorage.setItem('ca_dismissed_challenges', JSON.stringify(dismissed.slice(-20)));
        } catch {}
        if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
        await refresh();
        renderChallengeView(container, state, refresh);
      },
      onReloadHub: async () => {
        if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
        await refresh();
        renderChallengeView(container, state, refresh);
      }
    });
  };

  if (featuredDuel) mountDuel(featuredDuel);

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

  document.querySelectorAll('.chal-view-res').forEach(b => b.onclick = () => {
    const c = hub.challenges.find(x => x.id === b.dataset.id);
    if (c) mountDuel(c);
  });

  document.getElementById('btn-create-chal').onclick = async () => {
    const opponent_id = document.getElementById('chal-opp').value;
    const target_runs = Number(document.getElementById('chal-target').value) || 15;
    await api('/api/challenge/create', { method: 'POST', body: { opponent_id, target_runs } });
    toast('Challenge duel created!', 'success');
    if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
    renderChallengeView(container, state, refresh);
  };

  document.querySelectorAll('.chal-resp').forEach(b => b.onclick = async () => {
    await api('/api/challenge/respond', { method: 'POST', body: { challenge_id: b.dataset.id, accept: b.dataset.acc === '1' } });
    if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
    renderChallengeView(container, state, refresh);
  });

  document.querySelectorAll('.chal-cancel').forEach(b => b.onclick = async () => {
    await api('/api/challenge/cancel', { method: 'POST', body: { challenge_id: b.dataset.id } });
    toast('Challenge ended/cancelled.', 'info');
    if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
    renderChallengeView(container, state, refresh);
  });

  return () => {
    if (arenaCleanup) { arenaCleanup(); arenaCleanup = null; }
  };
}
