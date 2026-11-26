import { api, esc, toast } from '../api.js';

export function renderAuthView(container, onAuthenticated) {
  let mode = 'login'; // 'login' | 'register'

  const paint = () => {
    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-container">
          <div class="auth-hero">
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:26px;">
                <div class="brand-logo" style="width:58px;height:58px;"><img src="/bot-logo.png" alt="Cricket Ascend Logo" class="brand-logo-img" /></div>
                <div>
                  <div class="brand-title" style="font-size:1.5rem;">CRICKET ASCEND</div>
                  <div class="brand-sub">Career Cricket RPG</div>
                </div>
              </div>
              <h1 style="font-size:2.15rem;line-height:1.15;margin-bottom:14px;">
                From Academy Nets to <span style="color:var(--emerald);">World Championships</span>
              </h1>
              <p style="color:var(--text-muted);line-height:1.6;font-size:0.95rem;">
                Create your custom cricketer, configure a 72-shot batting repertoire, compete in 50 career chapters,
                enter televised T20 franchise auctions, duel real players in 1-over PvP showdowns, and climb global leaderboards.
              </p>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px;">
              <div class="card" style="padding:14px;">
                <div class="badge badge-emerald" style="margin-bottom:6px;">50 Chapters</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">Academy, Club, District, State, T20 &amp; International tiers</div>
              </div>
              <div class="card" style="padding:14px;">
                <div class="badge badge-cyan" style="margin-bottom:6px;">Live Matchplay</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">Step-by-step batting, bowling &amp; interactive timing meter</div>
              </div>
              <div class="card" style="padding:14px;">
                <div class="badge badge-gold" style="margin-bottom:6px;">Franchise Auctions</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">6 global T20 leagues, NRR standings, Orange &amp; Purple caps</div>
              </div>
              <div class="card" style="padding:14px;">
                <div class="badge badge-crimson" style="margin-bottom:6px;">Admin Audit Console</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">Full real-time system logs, player grants &amp; economy tools</div>
              </div>
            </div>
          </div>

          <div class="auth-form-pane">
            <div class="mobile-auth-brand">
              <div class="brand-logo" style="width:44px;height:44px;"><img src="/bot-logo.png" alt="Cricket Ascend" class="brand-logo-img" /></div>
              <div>
                <div class="brand-title" style="font-size:1.15rem;">CRICKET ASCEND</div>
                <div class="brand-sub">Career RPG &amp; Broadcast Arena</div>
              </div>
            </div>
            <div class="tab-switch">
              <button class="tab-btn ${mode === 'login' ? 'active' : ''}" id="tab-login">Sign In</button>
              <button class="tab-btn ${mode === 'register' ? 'active' : ''}" id="tab-register">Create Account</button>
            </div>

            <h2 style="margin-bottom:6px;font-size:1.5rem;">
              ${mode === 'login' ? 'Welcome Back, Skipper' : 'Join the Stadium'}
            </h2>
            <p style="color:var(--text-muted);font-size:0.88rem;margin:0 0 20px;">
              ${mode === 'login'
                ? 'Log in with your player or administrator username and password.'
                : 'Create a free account to start your cricket career.'}
            </p>

            <form id="auth-form" style="display:flex;flex-direction:column;gap:14px;">
              <div>
                <label class="label" for="auth-user">Username</label>
                <input class="input" id="auth-user" type="text" placeholder="e.g. virat_18 or admin" autocomplete="username" required />
              </div>
              <div>
                <label class="label" for="auth-pass">Password</label>
                <input class="input" id="auth-pass" type="password" placeholder="Enter password (min 6 chars)" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required />
              </div>
              <div id="auth-err" style="display:none;padding:10px 12px;border-radius:10px;background:var(--crimson-soft);border:1px solid rgba(244,63,94,0.4);color:#fecdd3;font-size:0.85rem;"></div>
              <button type="submit" class="btn ${mode === 'login' ? 'btn-primary' : 'btn-emerald'} btn-lg" style="margin-top:6px;">
                ${mode === 'login' ? '🔓 Login to Arena' : '🚀 Create Account'}
              </button>
            </form>

            <div style="margin-top:20px;padding:12px 14px;border-radius:12px;background:rgba(15,23,42,0.75);border:1px solid var(--border-subtle);font-size:0.78rem;color:var(--text-muted);line-height:1.5;">
              <strong style="color:var(--gold);">Administrator Access:</strong> Sign in with an authorized administrator account to open System Audit Logs, Player Grants &amp; Economy Controls.
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('tab-login').onclick = () => { mode = 'login'; paint(); };
    document.getElementById('tab-register').onclick = () => { mode = 'register'; paint(); };

    document.getElementById('auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('auth-err');
      errBox.style.display = 'none';
      const username = document.getElementById('auth-user').value.trim();
      const password = document.getElementById('auth-pass').value;

      try {
        const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const data = await api(endpoint, {
          method: 'POST',
          body: { username, password },
          silent: true
        });
        toast(`Welcome, ${esc(data.user.username)}!`, 'success');
        onAuthenticated(data.user);
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
    };
  };

  paint();
}
