import { api, esc, toast, openModal, closeModal } from '../api.js';
import { caIcon } from '../components/icons.js';
import { renderGearIconSVG } from '../components/gearSvg.js';
import { openPlayerProfileModal, openSetProfilePhotoModal } from '../components/profileCard.js';

// ==========================================
// 1. TRAINING, ACADEMIES & SKILL TREE
// ==========================================
export async function renderTrainingView(container, state, refresh) {
  let tab = 'train'; // 'train' | 'skills' | 'academy'
  const skillsData = await api('/api/skills');
  let selectedNation = state.player.nationality || 'India';
  let acadData = await api(`/api/academies?nation=${encodeURIComponent(selectedNation)}`);

  const paint = () => {
    container.innerHTML = `
      <div>
        <div class="subtabs">
          <button class="subtab ${tab === 'train' ? 'active' : ''}" data-t="train">🏋️ Training Drills</button>
          <button class="subtab ${tab === 'skills' ? 'active' : ''}" data-t="skills">🌟 Skill Tree (${skillsData.skillPoints} SP)</button>
          <button class="subtab ${tab === 'academy' ? 'active' : ''}" data-t="academy">🎓 Academies</button>
        </div>

        ${tab === 'train' ? `
          <div class="card card-glow-emerald" style="margin-bottom:18px;">
            <h3>Training Facilities</h3>
            <p style="color:var(--text-muted);font-size:0.88rem;margin:6px 0 0;">
              Each drill consumes <strong class="ic-val">${caIcon('energy', 14)} 25 Energy</strong> and <strong class="ic-val">${caIcon('ticket', 14)} 1 Training Ticket</strong>. Academy multipliers boost XP &amp; breakthrough odds!
              Current: <strong class="ic-val">${caIcon('energy', 14)} ${state.player.energy}/100</strong> • <strong class="ic-val">${caIcon('ticket', 14)} ${state.player.training_tokens}</strong>
            </p>
          </div>
          <div id="train-result"></div>
          <div class="grid-2">
            ${[
              { id: 'batting', title: '🏏 Nets Batting Practice', desc: 'Boosts Timing, Technique, Power, Defense & grants Batting XP.' },
              { id: 'bowling', title: '🥎 Target Bowling Drills', desc: 'Boosts Accuracy, Variations, Swing/Seam or Spin Craft.' },
              { id: 'fitness', title: '💪 Gym & Conditioning', desc: 'Boosts Fitness, Stamina, Power & Running Speed.' },
              { id: 'fielding', title: '🧤 Sprinting & Fielding Drills', desc: 'Boosts Fielding, Reflexes, Throw Accuracy & Running.' }
            ].map(r => `
              <div class="card">
                <h3>${r.title}</h3>
                <p style="color:var(--text-muted);font-size:0.86rem;margin:8px 0 14px;">${r.desc}</p>
                <button class="btn btn-primary train-btn" data-regime="${r.id}"><span class="ic-val">Start Session (${caIcon('energy', 14)} 25 + ${caIcon('ticket', 14)} 1)</span></button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${tab === 'skills' ? `
          <div class="card card-glow-cyan" style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h3 class="ic-val">${caIcon('skill', 18)} RPG Skill Tree</h3>
                <p style="color:var(--text-muted);font-size:0.86rem;margin:4px 0 0;">Earn Skill Points (+1 per Level Up) to unlock game-changing match abilities.</p>
              </div>
              <div class="stat-big ic-val" style="font-size:1.6rem;color:var(--gold);">${caIcon('skill', 20)} ${skillsData.skillPoints} SP</div>
            </div>
          </div>
          <div class="grid-3">
            ${skillsData.skills.map(sk => {
              const unlocked = skillsData.unlocked.includes(sk.key);
              const reqMet = !sk.requires || skillsData.unlocked.includes(sk.requires);
              return `
                <div class="card ${unlocked ? 'card-glow-emerald' : ''}">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span class="badge badge-cyan">${esc(sk.branch)}</span>
                    <span class="badge ${unlocked ? 'badge-emerald' : 'badge-gold'}">${unlocked ? '✅ Unlocked' : `${sk.cost} SP`}</span>
                  </div>
                  <h4 style="margin-bottom:6px;">${esc(sk.name)}</h4>
                  <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 12px;">${esc(sk.description)}</p>
                  ${sk.requires ? `<div style="font-size:0.74rem;color:var(--gold);margin-bottom:8px;">Requires: ${esc(skillsData.skills.find(x => x.key === sk.requires)?.name || sk.requires)}</div>` : ''}
                  ${!unlocked ? `<button class="btn btn-emerald btn-sm unlock-skill-btn" data-key="${sk.key}" ${!reqMet || skillsData.skillPoints < sk.cost ? 'disabled' : ''}>Unlock Ability</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${tab === 'academy' ? `
          <div class="card" style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <div>
                <h3>🎓 Current Academy: <span style="color:var(--gold);">${esc(state.academy?.name || state.player.academy_id)}</span></h3>
                <div style="font-size:0.84rem;color:var(--cyan);margin-top:4px;">${esc(state.academy?.trainingBonusText || '')} • ${esc(state.academy?.coachRating || '')}</div>
              </div>
              <div style="min-width:220px;">
                <label class="label">Browse Nation Academies</label>
                <select id="acad-nation-sel" class="select">
                  ${(state.nations || []).map(n => `<option value="${n}" ${n === selectedNation ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <div class="grid-3">
            ${acadData.academies.map(ac => {
              const isMine = ac.id === state.player.academy_id;
              return `
                <div class="card ${isMine ? 'card-glow-gold' : ''}">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span class="badge badge-gold">${'★'.repeat(ac.rating)}</span>
                    <span class="mono" style="font-size:0.75rem;color:var(--text-muted);">${ac.enrolled}/${ac.capacity}</span>
                  </div>
                  <h4 style="margin-bottom:4px;">${esc(ac.name)}</h4>
                  <div style="font-size:0.78rem;color:var(--cyan);margin-bottom:6px;">${esc(ac.trainingBonusText)}</div>
                  <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 12px;">${esc(ac.specialty)} • ${esc(ac.coachRating)}</p>
                  <button class="btn btn-sm ${isMine ? 'btn-gold' : 'btn-primary'} switch-acad-btn" data-id="${ac.id}" ${isMine || ac.enrolled >= ac.capacity ? 'disabled' : ''}>
                    ${isMine ? '✅ Enrolled' : ac.enrolled >= ac.capacity ? 'Full' : 'Transfer Academy'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.querySelectorAll('.subtab').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });

    document.querySelectorAll('.train-btn').forEach(b => b.onclick = async () => {
      try {
        const res = await api('/api/train', { method: 'POST', body: { regime: b.dataset.regime } });
        toast(`Training complete! +${res.xpEarned} XP`, 'success');
        await refresh();
        paint();
        const box = document.getElementById('train-result');
        if (box) {
          box.innerHTML = `
            <div class="card card-glow-cyan" style="margin-bottom:16px;">
              <strong>✅ Session Complete (+${res.xpEarned} XP)</strong>
              <div style="margin-top:6px;font-size:0.86rem;">
                ${res.gains.length > 0 ? res.gains.map(g => `• <strong>${esc(g.key)}</strong>: ${g.from} ➔ ${g.to} (+${g.delta})`).join('<br/>') : '• Great workout! Solidified form and earned XP.'}
                ${res.levelUp ? `<br/>🎉 <strong>Level Up! Reached Level ${res.newLevel}!</strong>` : ''}
              </div>
            </div>
          `;
        }
      } catch {}
    });

    document.querySelectorAll('.unlock-skill-btn').forEach(b => b.onclick = async () => {
      await api('/api/skills/unlock', { method: 'POST', body: { skill_key: b.dataset.key } });
      toast('Skill unlocked!', 'success');
      await refresh();
      const updatedSkills = await api('/api/skills');
      skillsData.skillPoints = updatedSkills.skillPoints;
      skillsData.unlocked = updatedSkills.unlocked;
      paint();
    });

    const natSel = document.getElementById('acad-nation-sel');
    if (natSel) natSel.onchange = async () => {
      selectedNation = natSel.value;
      acadData = await api(`/api/academies?nation=${encodeURIComponent(selectedNation)}`);
      paint();
    };

    document.querySelectorAll('.switch-acad-btn').forEach(b => b.onclick = async () => {
      await api('/api/academy/switch', { method: 'POST', body: { nationality: selectedNation, academy_id: b.dataset.id } });
      toast('Academy transferred!', 'success');
      await refresh();
      acadData = await api(`/api/academies?nation=${encodeURIComponent(selectedNation)}`);
      paint();
    });
  };

  paint();
}

// ==========================================
// 2. PRO SHOP, LOCKER & 72-COMBO SHOT MAP
// ==========================================
export async function renderLockerView(container, state, refresh) {
  let tab = 'inventory'; // 'inventory' | 'shop' | 'shotmap'
  const [shopData, shotData] = await Promise.all([api('/api/shop'), api('/api/shotmap')]);
  let selFw = 'Front Foot';
  let selInt = 'Stroke';
  let selZone = 'Cover';
  let invFilter = 'All';
  const GEAR_SLOTS = ['Bat', 'Grip', 'Gloves', 'Pads', 'Helmet', 'Shoes'];

  const paint = () => {
    const comboKey = selInt === 'Leave' ? `${selFw}_Leave_In Line` : `${selFw}_${selInt}_${selZone}`;
    const shotChoices = shotData.catalog[comboKey] || [];
    const equippedShotId = shotData.preset[comboKey] || shotChoices[0]?.id;

    const equippedItems = (state.inventory || []).filter(i => i.equipped);
    const backpackItems = (state.inventory || []).filter(i => !i.equipped);
    const filteredBackpack = invFilter === 'All' ? backpackItems : backpackItems.filter(i => i.type === invFilter);
    const eqBonuses = state.equipmentBonuses || {};

    container.innerHTML = `
      <div>
        <div class="subtabs">
          <button class="subtab ${tab === 'inventory' ? 'active' : ''}" data-t="inventory">🎒 Locker &amp; Equipped Kit (${state.inventory.length})</button>
          <button class="subtab ${tab === 'shop' ? 'active' : ''}" data-t="shop">🛒 Pro Equipment Shop</button>
          <button class="subtab ${tab === 'shotmap' ? 'active' : ''}" data-t="shotmap">🎯 72-Combo Shot Map</button>
        </div>

        ${tab === 'inventory' ? `
          <div class="card card-glow-emerald" style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <div>
                <span class="badge badge-emerald">ACTIVE MATCH LOADOUT</span>
                <h2 style="margin:6px 0 2px;">⭐ ${esc(state.player.name)}'s Equipment Kit</h2>
                <div style="font-size:0.84rem;color:var(--text-muted);">6 visual kit slots providing live attribute buffs in Career, Tournaments, Franchise &amp; PvP.</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${Object.entries(eqBonuses).length > 0
                  ? Object.entries(eqBonuses).map(([k, v]) => `<span class="badge badge-cyan">+${v} ${esc(k.replace('_', ' '))}</span>`).join('')
                  : '<span class="badge badge-muted">No active gear buffs</span>'}
              </div>
            </div>
          </div>

          <div class="locker-split">
            <!-- Left Panel: Visual 6-Slot Equipped Loadout -->
            <div class="card card-glow-cyan">
              <h3 style="margin-bottom:14px;">⭐ Equipped Gear Slots (${equippedItems.length}/6)</h3>
              <div class="kit-grid">
                ${GEAR_SLOTS.map(slotType => {
                  const eqItem = equippedItems.find(i => i.type === slotType);
                  if (eqItem) {
                    const bonusStr = Object.entries(eqItem.bonuses || {}).map(([k, v]) => `+${v} ${k.replace('_', ' ')}`).join(', ');
                    return `
                      <div class="kit-slot equipped rarity-${esc(eqItem.rarity)}">
                        <div class="kit-icon-wrap">${renderGearIconSVG(slotType, eqItem.rarity, true)}</div>
                        <div style="min-width:0;flex:1;">
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                            <span class="label" style="margin:0;">${slotType}</span>
                            <span class="badge badge-gold" style="font-size:0.62rem;">${esc(eqItem.rarity)}</span>
                          </div>
                          <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(eqItem.name)}</div>
                          <div class="mono" style="font-size:0.72rem;color:var(--emerald);margin:3px 0 6px;">${esc(bonusStr || 'Equipped')}</div>
                          <button class="btn btn-danger btn-sm equip-btn" data-id="${eqItem.id}">Unequip</button>
                        </div>
                      </div>
                    `;
                  }
                  return `
                    <div class="kit-slot empty">
                      <div class="kit-icon-wrap">${renderGearIconSVG(slotType, 'Common', false)}</div>
                      <div>
                        <div class="label" style="margin:0;">${slotType} Slot</div>
                        <div style="font-size:0.84rem;color:var(--text-muted);font-style:italic;">Locker Empty</div>
                        <div style="font-size:0.72rem;color:var(--text-muted);">Equip from backpack ➡️</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Right Panel: Backpack Contents -->
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                <h3>🎒 Backpack (${backpackItems.length})</h3>
                <div style="display:flex;gap:5px;flex-wrap:wrap;">
                  ${['All', ...GEAR_SLOTS].map(cat => `
                    <button class="btn btn-sm ${invFilter === cat ? 'btn-primary' : ''} inv-filter-btn" data-cat="${cat}">${cat}</button>
                  `).join('')}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:10px;max-height:460px;overflow-y:auto;">
                ${filteredBackpack.map(item => `
                  <div class="kit-slot rarity-${esc(item.rarity)}">
                    <div class="kit-icon-wrap">${renderGearIconSVG(item.type, item.rarity, false)}</div>
                    <div style="min-width:0;flex:1;">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                        <span class="badge badge-muted">${esc(item.type)}</span>
                        <span class="badge badge-gold">${esc(item.rarity)}</span>
                      </div>
                      <div style="font-weight:700;margin:4px 0 2px;">${esc(item.name)}</div>
                      <div class="mono" style="font-size:0.75rem;color:var(--emerald);">
                        ${Object.entries(item.bonuses || {}).map(([k, v]) => `+${v} ${k.replace('_', ' ')}`).join(', ') || 'Cosmetic'}
                      </div>
                    </div>
                    <button class="btn btn-emerald btn-sm equip-btn" data-id="${item.id}">Equip</button>
                  </div>
                `).join('') || `<div style="padding:24px;text-align:center;color:var(--text-muted);">No unequipped ${invFilter === 'All' ? '' : invFilter + ' '}gear in backpack. Check the Pro Shop!</div>`}
              </div>
            </div>
          </div>
        ` : ''}

        ${tab === 'shop' ? `
          <div class="card card-glow-gold" style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
              <h3>Pro Gear Catalog</h3>
              <div class="stat-big ic-val" style="font-size:1.45rem;color:var(--gold);">${caIcon('coin', 20)} ${state.player.coins.toLocaleString()} Coins</div>
            </div>
          </div>
          <div class="grid-3">
            ${shopData.items.map(it => `
              <div class="card rarity-${esc(it.rarity)}">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span class="badge badge-muted">${esc(it.type)}</span>
                  <span class="badge badge-gold">${esc(it.rarity)}</span>
                </div>
                <h4 style="margin-bottom:6px;">${esc(it.name)}</h4>
                <div class="mono" style="font-size:0.78rem;color:var(--emerald);margin-bottom:12px;">
                  ${Object.entries(it.bonuses || {}).map(([k, v]) => `+${v} ${k}`).join(', ')}
                </div>
                <button class="btn btn-sm ${it.owned ? 'btn-emerald' : 'btn-primary'} buy-btn" data-id="${it.id}" ${state.player.coins < it.cost ? 'disabled' : ''}>
                  <span class="ic-val">${caIcon('coin', 14)} Buy for ${it.cost.toLocaleString()} ${it.owned ? '(Owned)' : ''}</span>
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${tab === 'shotmap' ? `
          <div class="card card-glow-cyan" style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <div>
                <h3>🎯 Batting Shot Map &amp; Preset Editor</h3>
                <p style="color:var(--text-muted);font-size:0.84rem;margin:4px 0 0;">Customize your equipped shot for every Footwork × Intent × Zone combination.</p>
              </div>
              <button class="btn btn-danger btn-sm" id="btn-shotmap-reset">🔄 Reset Defaults</button>
            </div>
            <div class="grid-3" style="margin-top:14px;">
              <div>
                <label class="label">Footwork</label>
                <select id="sm-fw" class="select">${shotData.footworkOptions.map(o => `<option ${o === selFw ? 'selected' : ''}>${o}</option>`).join('')}</select>
              </div>
              <div>
                <label class="label">Intent</label>
                <select id="sm-int" class="select">${shotData.intentOptions.map(o => `<option ${o === selInt ? 'selected' : ''}>${o}</option>`).join('')}</select>
              </div>
              <div>
                <label class="label">Target Zone</label>
                <select id="sm-zone" class="select" ${selInt === 'Leave' ? 'disabled' : ''}>${shotData.zoneOptions.map(o => `<option ${o === selZone ? 'selected' : ''}>${o}</option>`).join('')}</select>
              </div>
            </div>
          </div>

          <div class="grid-2">
            ${shotChoices.map(s => {
              const isEq = s.id === equippedShotId;
              return `
                <div class="card ${isEq ? 'card-glow-emerald' : ''}">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span class="mono badge badge-cyan">${esc(s.num)} • ${esc(s.style)}</span>
                    <span class="badge ${s.risk === 'High' ? 'badge-crimson' : s.risk === 'Medium' ? 'badge-gold' : 'badge-emerald'}">Risk: ${esc(s.risk)}</span>
                  </div>
                  <h4 style="margin-bottom:6px;">${esc(s.name)}</h4>
                  <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 10px;">${esc(s.desc)}</p>
                  <div class="mono" style="font-size:0.78rem;color:var(--gold);margin-bottom:12px;">
                    Timing Mod: ${s.timingMod >= 0 ? '+' : ''}${s.timingMod} &nbsp;|&nbsp; Power Mod: ${s.powerMod >= 0 ? '+' : ''}${s.powerMod}
                  </div>
                  <button class="btn btn-sm ${isEq ? 'btn-emerald' : 'btn-primary'} sm-equip-btn" data-sid="${s.id}" ${isEq ? 'disabled' : ''}>
                    ${isEq ? '✅ Equipped for Combo' : 'Equip This Shot'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.querySelectorAll('.subtab').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
    document.querySelectorAll('.inv-filter-btn').forEach(b => b.onclick = () => { invFilter = b.dataset.cat; paint(); });

    document.querySelectorAll('.equip-btn').forEach(b => b.onclick = async () => {
      await api('/api/inventory/equip', { method: 'POST', body: { inventory_id: Number(b.dataset.id) } });
      toast('Gear updated!', 'success');
      await refresh();
      paint();
    });

    document.querySelectorAll('.buy-btn').forEach(b => b.onclick = async () => {
      await api('/api/shop/buy', { method: 'POST', body: { item_id: b.dataset.id } });
      toast('Item purchased and added to locker!', 'success');
      await refresh();
      const latestShop = await api('/api/shop');
      shopData.items = latestShop.items;
      paint();
    });

    const fwEl = document.getElementById('sm-fw');
    const intEl = document.getElementById('sm-int');
    const zoneEl = document.getElementById('sm-zone');
    if (fwEl) fwEl.onchange = () => { selFw = fwEl.value; paint(); };
    if (intEl) intEl.onchange = () => { selInt = intEl.value; paint(); };
    if (zoneEl) zoneEl.onchange = () => { selZone = zoneEl.value; paint(); };

    document.querySelectorAll('.sm-equip-btn').forEach(b => b.onclick = async () => {
      await api('/api/shotmap/equip', {
        method: 'POST',
        body: { footwork: selFw, intent: selInt, zone: selZone, shotId: b.dataset.sid }
      });
      shotData.preset[comboKey] = b.dataset.sid;
      toast('Shot equipped to combo!', 'success');
      paint();
    });

    const resetBtn = document.getElementById('btn-shotmap-reset');
    if (resetBtn) resetBtn.onclick = async () => {
      await api('/api/shotmap/reset', { method: 'POST' });
      const latest = await api('/api/shotmap');
      shotData.preset = latest.preset;
      toast('Shot map reset to defaults.', 'info');
      paint();
    };
  };

  paint();
}

// ==========================================
// 3. CLUB OFFICE, STATS, ACHIEVEMENTS, LEADERBOARDS, SETTINGS
// ==========================================
export async function renderClubAndStatsView(container, state, refresh) {
  let tab = 'stats'; // 'stats' | 'history' | 'achievements' | 'leaderboard' | 'club' | 'settings'
  let lbType = 'level';
  const [clubData, statsData, lbData] = await Promise.all([
    api('/api/club'),
    api('/api/stats'),
    api(`/api/leaderboard?type=${lbType}`)
  ]);

  const paint = () => {
    const s = statsData.stats;
    const c = statsData.computed;
    const st = state.settings;

    container.innerHTML = `
      <div>
        <div class="subtabs">
          <button class="subtab ${tab === 'stats' ? 'active' : ''}" data-t="stats">📊 Lifetime Stats</button>
          <button class="subtab ${tab === 'history' ? 'active' : ''}" data-t="history">📜 Match History</button>
          <button class="subtab ${tab === 'achievements' ? 'active' : ''}" data-t="achievements">🏅 Achievements</button>
          <button class="subtab ${tab === 'leaderboard' ? 'active' : ''}" data-t="leaderboard">🌍 Leaderboards</button>
          <button class="subtab ${tab === 'club' ? 'active' : ''}" data-t="club">💼 Contracts &amp; Sponsors</button>
          <button class="subtab ${tab === 'settings' ? 'active' : ''}" data-t="settings">⚙️ Settings &amp; Retire</button>
        </div>

        ${tab === 'stats' ? `
          <div class="grid-3">
            <div class="card card-glow-cyan">
              <h3 style="margin-bottom:12px;color:var(--cyan);">🏏 Batting Record</h3>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:0.88rem;">
                <div style="display:flex;justify-content:space-between;"><span>Matches</span><strong class="mono">${s.matches}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Runs Scored</span><strong class="mono">${s.runs}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Balls Faced</span><strong class="mono">${s.balls}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Average</span><strong class="mono">${c.battingAvg}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Strike Rate</span><strong class="mono">${c.strikeRate}%</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>4s / 6s</span><strong class="mono">${s.fours} / ${s.sixes}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>50s / 100s / Ducks</span><strong class="mono">${s.fifties} / ${s.hundreds} / ${s.ducks}</strong></div>
              </div>
            </div>
            <div class="card card-glow-emerald">
              <h3 style="margin-bottom:12px;color:var(--emerald);">🥎 Bowling Record</h3>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:0.88rem;">
                <div style="display:flex;justify-content:space-between;"><span>Wickets Taken</span><strong class="mono">${s.wickets}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Overs Bowled</span><strong class="mono">${Number(s.overs || 0).toFixed(1)}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Runs Conceded</span><strong class="mono">${s.runs_conceded}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Economy Rate</span><strong class="mono">${c.economy}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Bowling Avg</span><strong class="mono">${c.bowlingAvg}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Best Figures</span><strong class="mono">${esc(c.bestBowling)}</strong></div>
              </div>
            </div>
            <div class="card card-glow-gold">
              <h3 style="margin-bottom:12px;color:var(--gold);">🧤 Fielding &amp; Titles</h3>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:0.88rem;">
                <div style="display:flex;justify-content:space-between;"><span>Catches</span><strong class="mono">${s.catches}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Run Outs</span><strong class="mono">${s.run_outs}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Stumpings</span><strong class="mono">${s.stumpings}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Franchise Titles</span><strong class="mono">${state.player.franchise_titles || 0}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Tournaments Won</span><strong class="mono">${(state.tournamentsWon || []).reduce((a, x) => a + x.won, 0)}</strong></div>
              </div>
            </div>
          </div>
        ` : ''}

        ${tab === 'history' ? `
          <div class="card">
            <h3 style="margin-bottom:12px;">📜 Recent Match Scorecards</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Opponent</th><th>Batting</th><th>Bowling</th><th>Result</th></tr></thead>
                <tbody>
                  ${statsData.history.map(h => `
                    <tr>
                      <td class="mono" style="font-size:0.75rem;color:var(--text-muted);">${esc(h.date)}</td>
                      <td><span class="badge badge-cyan">${esc(h.match_type)}</span></td>
                      <td><strong>${esc(h.opponent)}</strong></td>
                      <td class="mono">${h.runs} (${h.balls}b) [${h.fours}x4, ${h.sixes}x6]</td>
                      <td class="mono">${h.wickets}/${h.runs_conceded} (${Number(h.overs_bowled).toFixed(1)}ov)</td>
                      <td><span class="badge ${String(h.result).toLowerCase() === 'won' ? 'badge-emerald' : 'badge-crimson'}">${esc(h.result)}</span></td>
                    </tr>
                  `).join('') || '<tr><td colspan="6" style="color:var(--text-muted);">No matches played yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${tab === 'achievements' ? `
          <div class="grid-3">
            ${statsData.achievements.map(a => `
              <div class="card ${a.unlocked ? 'card-glow-gold' : ''}" style="opacity:${a.unlocked ? '1' : '0.6'};">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span class="badge ${a.unlocked ? 'badge-emerald' : 'badge-muted'}">${a.unlocked ? '✅ Unlocked' : '🔒 Locked'}</span>
                  <span class="mono ic-val" style="color:var(--gold);">+${a.reward_coins} ${caIcon('coin', 14)}</span>
                </div>
                <h4>${esc(a.name)}</h4>
                <p style="font-size:0.82rem;color:var(--text-muted);margin:6px 0 0;">${esc(a.description)}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${tab === 'leaderboard' ? `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <h3>🌍 Global Career Leaderboards</h3>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${['level', 'runs', 'wickets', 'coins', 'pvp'].map(k => `
                  <button class="btn btn-sm ${lbType === k ? 'btn-primary' : ''} lb-btn" data-type="${k}">${k.toUpperCase()}</button>
                `).join('')}
              </div>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>#</th><th>Player</th><th>ID</th><th>Role</th><th>Level</th><th>Score</th><th></th></tr></thead>
                <tbody>
                  ${lbData.rows.map((r, idx) => `
                    <tr>
                      <td class="mono">#${idx + 1}</td>
                      <td><strong>${esc(r.name)}</strong></td>
                      <td class="mono"><span class="badge badge-cyan">${esc(r.public_id || r.discord_id)}</span></td>
                      <td>${esc(r.primary_role || 'PvP')}</td>
                      <td class="mono">LVL ${r.level}</td>
                      <td class="mono" style="color:var(--gold);">${Number(r.score).toLocaleString()}</td>
                      <td><button class="btn btn-sm inspect-lb-player" data-id="${esc(r.discord_id)}">👤 View</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${tab === 'club' ? `
          <div class="grid-2" style="margin-bottom:18px;">
            <div class="card card-glow-cyan">
              <h3>💼 Active Club Contract &amp; Drafts</h3>
              ${clubData.activeContract ? `
                <div style="margin:12px 0;font-size:0.9rem;">
                  <div>Club: <strong style="color:var(--gold);">${esc(clubData.activeContract.club_name)}</strong> (${esc(clubData.activeContract.contract_type)})</div>
                  <div>Salary: <strong class="ic-val" style="color:var(--emerald);">${caIcon('coin', 14)} ${clubData.activeContract.salary_per_match} / match</strong> • Remaining: <strong>${clubData.activeContract.remaining_seasons}</strong></div>
                </div>
              ` : `<p style="color:var(--text-muted);font-size:0.86rem;">Playing on Academy Stipend: <span class="ic-val">${caIcon('coin', 14)} ${clubData.tier.stipend}/match</span> (${esc(clubData.tier.name)}).</p>`}
              <button class="btn btn-primary" id="btn-req-offers" ${state.player.level < 4 ? 'disabled' : ''}>
                ${state.player.level < 4 ? 'Unlocks at Level 4' : '📋 Request Club Draft Offers'}
              </button>
              <div id="offers-box" style="margin-top:12px;"></div>
            </div>

            <div class="card card-glow-gold">
              <h3>👟 Endorsements &amp; Brand Sponsors</h3>
              <p style="color:var(--text-muted);font-size:0.84rem;margin:6px 0 12px;">Active Sponsor: <strong style="color:#fff;">${esc(state.player.sponsor || 'None')}</strong> • Your Reputation: <strong>${state.player.reputation}</strong></p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${clubData.sponsors.map(sp => `
                  <div style="padding:10px 12px;border-radius:10px;background:rgba(6,10,22,0.8);border:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div>
                      <strong>${esc(sp.name)}</strong> <span class="badge badge-gold">+🪙 ${sp.bonus_coins}</span>
                      <div style="font-size:0.76rem;color:var(--text-muted);">${esc(sp.description)} (Req Rep: ${sp.reputation_required})</div>
                    </div>
                    <button class="btn btn-sm ${sp.active ? 'btn-emerald' : 'btn-gold'} sign-sponsor-btn" data-id="${sp.id}" ${!sp.unlocked || sp.active ? 'disabled' : ''}>
                      ${sp.active ? 'Active' : sp.unlocked ? 'Sign Deal' : `Rep ${sp.reputation_required}`}
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${tab === 'settings' ? `
          <div class="grid-2">
            <div class="card card-glow-gold" style="grid-column:1 / -1;">
              <h3>Cricketer Identity &amp; Photo</h3>
              <p style="color:var(--text-muted);font-size:0.84rem;margin:4px 0 14px;">Manage your player card photo, display name, and batting stance shown across leaderboards and match broadcasts.</p>
              <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:14px;">
                  ${state.player.avatar_url
                    ? `<img src="${esc(state.player.avatar_url)}" alt="" style="width:68px;height:68px;border-radius:16px;object-fit:cover;border:2px solid rgba(0,229,255,0.45);" />`
                    : `<div style="width:68px;height:68px;border-radius:16px;background:linear-gradient(135deg,#12294a,#1e4478);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:1.35rem;color:var(--gold);border:2px solid rgba(255,196,0,0.45);">${esc((state.player.name || 'CR').slice(0, 2).toUpperCase())}</div>`
                  }
                  <div>
                    <div style="font-weight:700;font-size:1rem;">${esc(state.player.name)}</div>
                    <div class="badge badge-cyan" style="margin-top:4px;font-size:0.74rem;">${esc(state.player.public_id || '')}</div>
                    <div style="margin-top:8px;">
                      <button class="btn btn-sm btn-primary" id="btn-settings-photo">📷 ${state.player.avatar_url ? 'Change Photo' : 'Set Photo'}</button>
                    </div>
                  </div>
                </div>
                <div style="flex:1;min-width:230px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end;">
                  <div>
                    <label style="display:block;font-size:0.78rem;color:var(--text-muted);margin-bottom:4px;">Display Name (2–28 chars)</label>
                    <input class="input" id="set-player-name" maxlength="28" value="${esc(state.player.name || '')}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;color:var(--text-muted);margin-bottom:4px;">Batting Hand</label>
                    <select class="select" id="set-player-hand">
                      <option value="Right-hand bat" ${state.player.batting_hand !== 'Left-hand bat' ? 'selected' : ''}>Right-hand bat</option>
                      <option value="Left-hand bat" ${state.player.batting_hand === 'Left-hand bat' ? 'selected' : ''}>Left-hand bat</option>
                    </select>
                  </div>
                  <div>
                    <button class="btn btn-emerald" id="btn-save-identity" style="width:100%;">Save Identity</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="card card-glow-cyan">
              <h3>⚙️ Player Preferences</h3>
              <div style="display:flex;flex-direction:column;gap:14px;margin-top:14px;">
                <div>
                  <label class="label">Career Batting Position</label>
                  <select id="set-order" class="select">
                    ${[
                      ['auto', 'Auto (By Career Role)'], ['opener', 'Opener (No. 1 / 2)'],
                      ['top_order', 'Top Order (No. 3)'], ['middle_order', 'Middle Order (No. 4)'],
                      ['finisher', 'Finisher (No. 5)'], ['lower_order', 'Lower Order (No. 6+)']
                    ].map(([v, lbl]) => `<option value="${v}" ${st.batting_order === v ? 'selected' : ''}>${lbl}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="label">Commentary Depth</label>
                  <select id="set-comm" class="select">
                    <option value="detailed" ${st.commentary_level === 'detailed' ? 'selected' : ''}>Detailed Play-by-Play</option>
                    <option value="compact" ${st.commentary_level === 'compact' ? 'selected' : ''}>Compact Summary</option>
                  </select>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button class="btn ${st.field_radar ? 'btn-emerald' : ''}" id="set-radar">📡 Radar: ${st.field_radar ? 'ON' : 'OFF'}</button>
                  <button class="btn ${st.mention_ping ? 'btn-emerald' : ''}" id="set-ping">🔔 Pings: ${st.mention_ping ? 'ON' : 'OFF'}</button>
                  <button class="btn btn-danger" id="set-reset">🔄 Reset Defaults</button>
                </div>
              </div>
            </div>

            <div class="card card-glow-crimson">
              <h3>🚨 Retire Cricketer</h3>
              <p style="color:var(--text-muted);font-size:0.86rem;margin:8px 0 16px;">
                Retiring resets your current cricketer, stats, inventory, and career progression so you can start a brand-new player. Your web login account stays intact.
              </p>
              <button class="btn btn-danger" id="btn-retire">🚨 Retire Current Career</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.querySelectorAll('.subtab').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
    document.querySelectorAll('.lb-btn').forEach(b => b.onclick = async () => {
      lbType = b.dataset.type;
      const d = await api(`/api/leaderboard?type=${lbType}`);
      lbData.rows = d.rows;
      paint();
    });
    document.querySelectorAll('.inspect-lb-player').forEach(b => b.onclick = () => {
      openPlayerProfileModal(b.dataset.id, state.player.discord_id);
    });

    const reqOffersBtn = document.getElementById('btn-req-offers');
    if (reqOffersBtn) reqOffersBtn.onclick = async () => {
      const res = await api('/api/contracts/offers', { method: 'POST' });
      const box = document.getElementById('offers-box');
      box.innerHTML = res.offers.map(o => `
        <div style="padding:10px;border-radius:10px;background:rgba(6,10,22,0.8);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <div><strong>${esc(o.club)}</strong> (${esc(o.type)})<div class="mono" style="font-size:0.78rem;color:var(--emerald);">🪙 ${o.salary}/match • ${o.term} Seasons</div></div>
          <button class="btn btn-emerald btn-sm sign-offer-btn" data-club="${esc(o.club)}" data-type="${esc(o.type)}" data-sal="${o.salary}" data-term="${o.term}">Sign</button>
        </div>
      `).join('');
      document.querySelectorAll('.sign-offer-btn').forEach(sb => sb.onclick = async () => {
        await api('/api/contracts/sign', {
          method: 'POST',
          body: { club: sb.dataset.club, type: sb.dataset.type, salary: Number(sb.dataset.sal), term: Number(sb.dataset.term) }
        });
        toast(`Signed with ${sb.dataset.club}!`, 'success');
        const c2 = await api('/api/club');
        clubData.activeContract = c2.activeContract;
        await refresh();
        paint();
      });
    };

    document.querySelectorAll('.sign-sponsor-btn').forEach(b => b.onclick = async () => {
      await api('/api/sponsors/sign', { method: 'POST', body: { sponsor_id: b.dataset.id } });
      toast('Sponsor endorsement signed!', 'success');
      await refresh();
      const c2 = await api('/api/club');
      clubData.sponsors = c2.sponsors;
      paint();
    });

    const ord = document.getElementById('set-order');
    if (ord) ord.onchange = async () => {
      await api('/api/settings/update', { method: 'POST', body: { key: 'batting_order', value: ord.value } });
      await refresh(); toast('Batting order updated!', 'success');
    };
    const comm = document.getElementById('set-comm');
    if (comm) comm.onchange = async () => {
      await api('/api/settings/update', { method: 'POST', body: { key: 'commentary_level', value: comm.value } });
      await refresh(); toast('Commentary preference saved!', 'success');
    };
    const rad = document.getElementById('set-radar');
    if (rad) rad.onclick = async () => {
      await api('/api/settings/update', { method: 'POST', body: { key: 'field_radar', value: st.field_radar ? 0 : 1 } });
      await refresh(); paint();
    };
    const png = document.getElementById('set-ping');
    if (png) png.onclick = async () => {
      await api('/api/settings/update', { method: 'POST', body: { key: 'mention_ping', value: st.mention_ping ? 0 : 1 } });
      await refresh(); paint();
    };
    const photoBtn = document.getElementById('btn-settings-photo');
    if (photoBtn) photoBtn.onclick = () => {
      openSetProfilePhotoModal(state.player.avatar_url || '', async () => {
        await refresh(); paint();
      });
    };
    const saveIdBtn = document.getElementById('btn-save-identity');
    if (saveIdBtn) saveIdBtn.onclick = async () => {
      const name = document.getElementById('set-player-name')?.value?.trim() || '';
      const batting_hand = document.getElementById('set-player-hand')?.value || '';
      if (name.length < 2 || name.length > 28) { toast('Name must be 2–28 characters.', 'error'); return; }
      try {
        await api('/api/player/rename', { method: 'POST', body: { name, batting_hand } });
        await refresh(); toast('Identity updated!', 'success'); paint();
      } catch (e) { toast(e.message, 'error'); }
    };
    const rst = document.getElementById('set-reset');
    if (rst) rst.onclick = async () => {
      await api('/api/settings/reset', { method: 'POST' });
      await refresh(); toast('Settings reset.', 'info'); paint();
    };
    const ret = document.getElementById('btn-retire');
    if (ret) ret.onclick = () => {
      openModal(`
        <h2>🚨 Confirm Retirement</h2>
        <p style="color:var(--text-muted);margin:10px 0 18px;">This permanently deletes <strong>${esc(state.player.name)}</strong>, all attributes, gear, and history. Are you sure?</p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-danger" id="confirm-retire">Yes, Retire Career</button>
          <button class="btn" onclick="document.getElementById('modal-bg').click()">Cancel</button>
        </div>
      `);
      document.getElementById('confirm-retire').onclick = async () => {
        await api('/api/career/retire', { method: 'POST' });
        closeModal();
        toast('Career retired.', 'info');
        await refresh();
      };
    };
  };

  paint();
}
