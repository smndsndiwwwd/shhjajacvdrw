import { api, esc, toast } from './api.js';
import { renderAuthView } from './views/auth.js';
import { renderBeginWizard } from './views/begin.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderMatchView } from './views/match.js';
import {
  renderCampaignView,
  renderTournamentsView,
  renderFranchiseView,
  renderChallengeView
} from './views/modes.js';
import { renderTrainingView, renderLockerView, renderClubAndStatsView } from './views/hubs.js';
import { renderPlayersScoutView } from './views/players.js';
import { renderAdminView } from './views/admin.js';

const appRoot = document.getElementById('app');

const state = {
  user: null,
  player: null,
  activeMatch: null,
  route: 'dashboard'
};

let cleanupActiveView = null;

async function refreshBootstrap() {
  const [boot, mState] = await Promise.all([
    api('/api/bootstrap'),
    api('/api/match/state')
  ]);
  Object.assign(state, boot);
  state.activeMatch = mState.match || null;
}

function navigate(nextRoute) {
  if (cleanupActiveView) {
    cleanupActiveView();
    cleanupActiveView = null;
  }
  state.route = nextRoute;
  renderShell();
}

async function launchMatch(options) {
  try {
    if (options.existingMatch) {
      state.activeMatch = options.existingMatch;
    } else {
      const res = await api('/api/match/start', { method: 'POST', body: options });
      if (res.benched) {
        toast(res.message, res.won ? 'success' : 'info');
        await refreshBootstrap();
        renderShell();
        return;
      }
      state.activeMatch = res.match;
    }
    navigate('match');
  } catch {}
}

async function renderShell() {
  if (!state.user) {
    return renderAuthView(appRoot, async () => {
      await refreshBootstrap();
      state.route = state.user.role === 'admin' && !state.player ? 'admin' : 'dashboard';
      renderShell();
    });
  }

  const isAdmin = state.user.role === 'admin';
  const hasPlayer = Boolean(state.player);

  if (!hasPlayer && state.route !== 'admin') {
    state.route = 'begin';
  }

  const navItems = [
    ...(hasPlayer ? [
      { section: 'Career Arena' },
      { id: 'dashboard', icon: '👤', label: 'Profile & Attributes' },
      ...(state.activeMatch ? [{ id: 'match', icon: '🔴', label: 'LIVE MATCH', pill: 'PLAYING' }] : []),
      { id: 'campaign', icon: '🏏', label: 'Chapters & Practice', pill: `CH ${Math.min(50, state.player.current_chapter)}` },
      { id: 'tournaments', icon: '🏆', label: 'Tournaments & Cups' },
      { id: 'franchise', icon: '🏟️', label: 'Franchise Leagues' },
      { id: 'challenge', icon: '⚔️', label: 'Challenge PvP' },
      { id: 'players', icon: '🔍', label: 'Scout Players' },
      { section: 'Development' },
      { id: 'training', icon: '🏋️', label: 'Train, Skills & Academy' },
      { id: 'locker', icon: '🎒', label: 'Shop, Locker & ShotMap' },
      { id: 'club', icon: '📊', label: 'Club, Stats & Settings' }
    ] : [
      { section: 'Onboarding' },
      { id: 'begin', icon: '🏏', label: 'Create Cricketer' }
    ]),
    ...(isAdmin ? [
      { section: 'Administration' },
      { id: 'admin', icon: '🛡️', label: 'Admin & System Logs', isAdmin: true }
    ] : [])
  ];

  appRoot.innerHTML = `
    <div class="shell">
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="brand-box">
          <div class="brand-logo"><img src="/bot-logo.png" alt="Cricket Ascend" class="brand-logo-img" /></div>
          <div>
            <div class="brand-title">Cricket Ascend</div>
            <div class="brand-sub">${isAdmin ? 'Admin + Career Web' : 'Career RPG Portal'}</div>
          </div>
        </div>

        ${navItems.map(item => item.section
          ? `<div class="nav-section-label">${esc(item.section)}</div>`
          : `
            <button class="nav-item ${item.isAdmin ? 'admin-nav' : ''} ${state.route === item.id ? 'active' : ''}" data-route="${item.id}">
              <span>${item.icon}</span>
              <span>${esc(item.label)}</span>
              ${item.pill ? `<span class="nav-pill">${esc(item.pill)}</span>` : ''}
            </button>
          `
        ).join('')}

        <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--border-subtle);">
          <div style="padding:8px 12px;font-size:0.8rem;color:var(--text-muted);">
            Signed in as <strong style="color:#fff;">${esc(state.user.username)}</strong>
            ${isAdmin ? ' <span class="badge badge-crimson">ADMIN</span>' : ''}
          </div>
          <button class="nav-item" id="btn-logout">🚪 Sign Out</button>
        </div>
      </aside>

      <div class="main-area">
        <header class="hud-bar">
          <div class="hud-vitals">
            <button class="btn btn-sm mobile-menu-btn" id="btn-mobile-menu">☰</button>
            <span class="hud-mobile-brand">
              <img src="/bot-logo.png" alt="CA" style="width:26px;height:26px;border-radius:7px;border:1px solid rgba(245,158,11,0.5);" />
              <span>CRICKET ASCEND</span>
            </span>
            ${hasPlayer ? `
              <div class="hud-chip">⚡ <strong>${state.player.energy}</strong>/100</div>
              <div class="hud-chip">🪙 <strong>${state.player.coins.toLocaleString()}</strong></div>
              <div class="hud-chip">🌟 LVL <strong>${state.player.level}</strong></div>
              <div class="hud-chip mono">🪪 <strong>${esc(state.player.public_id || state.player.discord_id)}</strong></div>
            ` : `<div class="hud-chip">👋 Welcome <strong>${esc(state.user.username)}</strong></div>`}
          </div>
          <div class="hud-actions">
            ${hasPlayer && state.route !== 'players' ? `<button class="btn btn-sm" id="hud-scout-players">🔍 Find Players</button>` : ''}
            ${state.activeMatch && state.route !== 'match' ? `<button class="btn btn-emerald btn-sm" id="hud-resume-match">🔴 Resume Live Match</button>` : ''}
            ${isAdmin && state.route !== 'admin' ? `<button class="btn btn-danger btn-sm" id="hud-go-admin">🛡️ Admin Logs</button>` : ''}
          </div>
        </header>

        <main class="content-wrap" id="view-root">
          <div class="card">Loading stadium broadcast...</div>
        </main>
      </div>
    </div>

    ${hasPlayer ? `
      <nav class="mobile-dock" aria-label="Mobile Navigation">
        <button class="dock-btn ${state.route === 'dashboard' ? 'active' : ''}" data-route="dashboard"><span class="dock-ico">👤</span><span>Profile</span></button>
        <button class="dock-btn ${state.route === (state.activeMatch ? 'match' : 'campaign') ? 'active' : ''}" data-route="${state.activeMatch ? 'match' : 'campaign'}"><span class="dock-ico">${state.activeMatch ? '🔴' : '🏏'}</span><span>${state.activeMatch ? 'Match' : 'Play'}</span></button>
        <button class="dock-btn ${state.route === 'tournaments' || state.route === 'franchise' ? 'active' : ''}" data-route="franchise"><span class="dock-ico">🏟️</span><span>Leagues</span></button>
        <button class="dock-btn ${state.route === 'locker' ? 'active' : ''}" data-route="locker"><span class="dock-ico">🎒</span><span>Locker</span></button>
        <button class="dock-btn ${state.route === (isAdmin ? 'admin' : 'club') ? 'active' : ''}" data-route="${isAdmin ? 'admin' : 'club'}"><span class="dock-ico">${isAdmin ? '🛡️' : '📊'}</span><span>${isAdmin ? 'Admin' : 'Stats'}</span></button>
      </nav>
    ` : ''}
  `;

  const closeSidebar = () => {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('open');
  };

  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.onclick = () => { closeSidebar(); navigate(btn.dataset.route); };
  });

  const mobBtn = document.getElementById('btn-mobile-menu');
  if (mobBtn) mobBtn.onclick = () => {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-backdrop')?.classList.toggle('open');
  };
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.onclick = closeSidebar;

  const resBtn = document.getElementById('hud-resume-match');
  if (resBtn) resBtn.onclick = () => navigate('match');

  const scoutHudBtn = document.getElementById('hud-scout-players');
  if (scoutHudBtn) scoutHudBtn.onclick = () => navigate('players');

  const admBtn = document.getElementById('hud-go-admin');
  if (admBtn) admBtn.onclick = () => navigate('admin');

  document.getElementById('btn-logout').onclick = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    state.user = null;
    state.player = null;
    state.activeMatch = null;
    navigate('auth');
  };

  const viewRoot = document.getElementById('view-root');
  try {
    if (state.route === 'begin') {
      renderBeginWizard(viewRoot, state, async () => {
        await refreshBootstrap();
        navigate('dashboard');
      });
    } else if (state.route === 'dashboard' && hasPlayer) {
      renderDashboardView(viewRoot, state, navigate, refreshBootstrap);
    } else if (state.route === 'match' && hasPlayer) {
      cleanupActiveView = renderMatchView(viewRoot, state, async (m) => {
        state.activeMatch = m;
        await refreshBootstrap();
      }, navigate);
    } else if (state.route === 'campaign' && hasPlayer) {
      await renderCampaignView(viewRoot, state, launchMatch);
    } else if (state.route === 'tournaments' && hasPlayer) {
      await renderTournamentsView(viewRoot, state, launchMatch, refreshBootstrap);
    } else if (state.route === 'franchise' && hasPlayer) {
      await renderFranchiseView(viewRoot, state, launchMatch, refreshBootstrap);
    } else if (state.route === 'challenge' && hasPlayer) {
      cleanupActiveView = await renderChallengeView(viewRoot, state, refreshBootstrap);
    } else if (state.route === 'players' && (hasPlayer || isAdmin)) {
      await renderPlayersScoutView(viewRoot, state, navigate, refreshBootstrap);
    } else if (state.route === 'training' && hasPlayer) {
      await renderTrainingView(viewRoot, state, refreshBootstrap);
    } else if (state.route === 'locker' && hasPlayer) {
      await renderLockerView(viewRoot, state, refreshBootstrap);
    } else if (state.route === 'club' && hasPlayer) {
      await renderClubAndStatsView(viewRoot, state, async () => {
        await refreshBootstrap();
        if (!state.player) navigate('begin');
      });
    } else if (state.route === 'admin' && isAdmin) {
      cleanupActiveView = await renderAdminView(viewRoot, state, refreshBootstrap);
    }
  } catch (err) {
    viewRoot.innerHTML = `<div class="card card-glow-crimson"><h3>Error loading view</h3><p>${esc(err.message)}</p></div>`;
  }
}

async function init() {
  try {
    const authRes = await api('/api/auth/me', { silent: true });
    if (authRes.authenticated) {
      await refreshBootstrap();
      if (state.activeMatch) state.route = 'match';
      else if (!state.player && state.user.role === 'admin') state.route = 'admin';
      else if (!state.player) state.route = 'begin';
    }
  } catch {}
  renderShell();
}

init();
