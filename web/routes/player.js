import db from '../../src/database/db.js';
import { getAuthUser } from '../lib/auth.js';
import { sendJson, parseJsonBody, getClientIp } from '../lib/http.js';
import { getPlayerTier, generateStartingAttributes } from '../lib/helpers.js';
import { generateAcademiesForNation } from '../../src/game/nationAcademies.js';
import { academies, loadAcademies } from '../../src/game/academies.js';
import { getPlayerChapters } from '../../src/game/chapters.js';
import { skillTree } from '../../src/game/skills.js';
import { shopEquipment, loadCustomItems } from '../../src/game/equipment.js';
import { getPlayerAchievements } from '../../src/game/achievements.js';
import {
  SHOT_CATALOG,
  FOOTWORK_OPTIONS,
  INTENT_OPTIONS,
  ZONE_OPTIONS,
  getComboKey,
  getPlayerCustomPreset,
  setPlayerEquippedShot,
  resetPlayerPreset
} from '../../src/game/shotmap.js';
import {
  getLevelRequiredXP,
  getEffectiveAttributes,
  getEquipmentBonuses,
  updateAndGetEnergy,
  consumeEnergy,
  addXP
} from '../../src/game/utils.js';
import {
  getPlayerSettings,
  updatePlayerSetting,
  resetPlayerSettings
} from '../../src/game/settings.js';
import { recordSystemLog } from '../../src/game/systemLog.js';

const SUPPORTED_NATIONS = [
  'India', 'Australia', 'England', 'Pakistan', 'South Africa',
  'New Zealand', 'West Indies', 'Sri Lanka', 'Bangladesh', 'Afghanistan'
];

function getPlayerOrFail(res, user) {
  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(user.player_id);
  if (!player) {
    sendJson(res, 404, { error: 'No career profile found. Create your cricketer first.' });
    return null;
  }
  return player;
}

export async function handlePlayerRoutes(req, res, pathname, query) {
  const user = getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized. Please log in.' });
    return true;
  }
  const ip = getClientIp(req);
  const playerId = user.player_id;

  // Bootstrap full state
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(playerId);
    if (!player) {
      return sendJson(res, 200, {
        user,
        player: null,
        nations: SUPPORTED_NATIONS
      });
    }

    const energy = updateAndGetEnergy(db, playerId);
    player.energy = energy;
    const tier = getPlayerTier(player.level);
    const reqXP = getLevelRequiredXP(player.level);
    const baseAttributes = db.prepare('SELECT * FROM attributes WHERE player_id = ?').get(playerId) || {};
    const effectiveAttributes = getEffectiveAttributes(db, playerId);
    const equipmentBonuses = getEquipmentBonuses(db, playerId);
    const unlockedSkills = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(playerId).map(r => r.skill_key);
    const stats = db.prepare('SELECT * FROM stats WHERE player_id = ?').get(playerId) || {};
    const settings = getPlayerSettings(playerId);
    const activeContract = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND active = 1').get(playerId);
    const tournamentsWon = db.prepare('SELECT tournament_id, won, high_score FROM player_tournaments WHERE player_id = ? AND won > 0').all(playerId);
    const activeTournament = db.prepare("SELECT * FROM active_tournament_run WHERE player_id = ? AND status = 'active'").get(playerId);
    const franchise = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId);
    const inventory = db.prepare('SELECT * FROM inventory WHERE player_id = ?').all(playerId).map(i => ({
      ...i,
      bonuses: JSON.parse(i.bonuses || '{}')
    }));
    loadAcademies();
    const academy = academies[player.academy_id] || db.prepare('SELECT * FROM academies WHERE id = ?').get(player.academy_id) || null;
    const achList = getPlayerAchievements(db, playerId);

    return sendJson(res, 200, {
      user,
      player,
      tier,
      requiredXP: reqXP,
      baseAttributes,
      effectiveAttributes,
      equipmentBonuses,
      unlockedSkills,
      stats,
      settings,
      academy,
      activeContract,
      tournamentsWon,
      activeTournament,
      franchise,
      inventory,
      achievementsUnlockedCount: achList.filter(a => a.unlocked).length,
      achievementsTotal: achList.length,
      nations: SUPPORTED_NATIONS
    });
  }

  // Nation Academies directory
  if (pathname === '/api/academies' && req.method === 'GET') {
    const nation = query.get('nation') || 'India';
    const list = generateAcademiesForNation(nation).map(ac => {
      const enrolled = db.prepare('SELECT COUNT(*) as cnt FROM players WHERE academy_id = ?').get(ac.id)?.cnt || 0;
      return { ...ac, enrolled, capacity: 40 };
    });
    return sendJson(res, 200, { nation, academies: list, nations: SUPPORTED_NATIONS });
  }

  // Begin Career
  if (pathname === '/api/career/begin' && req.method === 'POST') {
    const existing = db.prepare('SELECT discord_id FROM players WHERE discord_id = ?').get(playerId);
    if (existing) return sendJson(res, 409, { error: 'You already have an active career.' });

    const body = await parseJsonBody(req);
    const name = String(body.name || '').trim();
    const primaryRole = String(body.primary_role || '').trim();
    const battingHand = String(body.batting_hand || '').trim();
    const bowlingStyle = String(body.bowling_style || '').trim();
    const nationality = String(body.nationality || '').trim();
    const academyId = String(body.academy_id || '').trim();

    if (name.length < 2 || name.length > 28) {
      return sendJson(res, 400, { error: 'Player name must be 2–28 characters.' });
    }
    if (!['Batsman', 'Wicket-Keeper', 'Bowler', 'All-Rounder'].includes(primaryRole)) {
      return sendJson(res, 400, { error: 'Invalid primary role.' });
    }
    if (!['Right-hand bat', 'Left-hand bat'].includes(battingHand)) {
      return sendJson(res, 400, { error: 'Invalid batting hand.' });
    }
    if (!bowlingStyle || !nationality || !academyId) {
      return sendJson(res, 400, { error: 'Bowling style, nationality, and academy are required.' });
    }

    const nationList = generateAcademiesForNation(nationality);
    const academy = nationList.find(a => a.id === academyId);
    if (!academy) return sendJson(res, 400, { error: 'Selected academy not found for this nationality.' });

    const enrolled = db.prepare('SELECT COUNT(*) as cnt FROM players WHERE academy_id = ?').get(academyId)?.cnt || 0;
    if (enrolled >= 40) return sendJson(res, 400, { error: 'That academy is full (40/40 players).' });

    db.prepare(`
      INSERT OR REPLACE INTO academies (id, name, rating, reputation, history, specialty, coach_rating, training_bonus_text, bonuses_json, graduates_domestic, graduates_international, success_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      academy.id, academy.name, academy.rating, academy.reputation, academy.history,
      academy.specialty, academy.coachRating, academy.trainingBonusText,
      JSON.stringify(academy.bonuses), academy.graduatesDomestic, academy.graduatesInternational, academy.successRate
    );
    loadAcademies();

    const now = Date.now();
    db.prepare(`
      INSERT INTO players (discord_id, name, batting_hand, bowling_style, primary_role, nationality, academy_id, last_energy_update, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(playerId, name, battingHand, bowlingStyle, primaryRole, nationality, academyId, now);

    const attrs = generateStartingAttributes(primaryRole, bowlingStyle);
    db.prepare(`
      INSERT INTO attributes (
        player_id, power, timing, technique, spin, pace, fitness, mentality, aggression, defense,
        running, fielding, reflex, throw_accuracy, swing, seam, spin_bowling, accuracy, variations, stamina
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerId,
      attrs.power, attrs.timing, attrs.technique, attrs.spin, attrs.pace,
      attrs.fitness, attrs.mentality, attrs.aggression, attrs.defense,
      attrs.running, attrs.fielding, attrs.reflex, attrs.throw_accuracy,
      attrs.swing, attrs.seam, attrs.spin_bowling, attrs.accuracy, attrs.variations, attrs.stamina
    );
    db.prepare('INSERT INTO stats (player_id) VALUES (?)').run(playerId);
    db.prepare('INSERT INTO challenge_stats (player_id) VALUES (?)').run(playerId);

    db.prepare(`
      INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
      VALUES (?, 'club_willow', 'Club Willow Bat', 'Bat', 'Common', ?, 1)
    `).run(playerId, JSON.stringify({ power: 1, timing: 1 }));
    db.prepare(`
      INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
      VALUES (?, 'club_shoes', 'Academy Running Shoes', 'Shoes', 'Common', ?, 1)
    `).run(playerId, JSON.stringify({ running: 1 }));

    const xpRes = addXP(db, playerId, 0);

    recordSystemLog({
      level: 'INFO',
      category: 'Career',
      actor: user.username,
      target: name,
      title: 'New Career Player Created',
      details: { primaryRole, battingHand, bowlingStyle, nationality, academy: academy.name },
      ip
    });

    return sendJson(res, 201, { ok: true, achievementsUnlocked: xpRes.achievementsUnlocked });
  }

  // Retire Career
  if (pathname === '/api/career/retire' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    db.prepare('DELETE FROM players WHERE discord_id = ?').run(playerId);
    recordSystemLog({
      level: 'WARN',
      category: 'Career',
      actor: user.username,
      target: player.name,
      title: 'Player Retired Career',
      details: { level: player.level, season: player.season },
      ip
    });
    return sendJson(res, 200, { ok: true });
  }

  // Switch Academy
  if (pathname === '/api/academy/switch' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const nation = String(body.nationality || player.nationality);
    const academyId = String(body.academy_id || '');
    const list = generateAcademiesForNation(nation);
    const academy = list.find(a => a.id === academyId);
    if (!academy) return sendJson(res, 400, { error: 'Academy not found.' });

    const enrolled = db.prepare('SELECT COUNT(*) as cnt FROM players WHERE academy_id = ?').get(academyId)?.cnt || 0;
    if (enrolled >= 40) return sendJson(res, 400, { error: 'Academy is currently full (40/40).' });

    db.prepare(`
      INSERT OR REPLACE INTO academies (id, name, rating, reputation, history, specialty, coach_rating, training_bonus_text, bonuses_json, graduates_domestic, graduates_international, success_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      academy.id, academy.name, academy.rating, academy.reputation, academy.history,
      academy.specialty, academy.coachRating, academy.trainingBonusText,
      JSON.stringify(academy.bonuses), academy.graduatesDomestic, academy.graduatesInternational, academy.successRate
    );
    loadAcademies();
    db.prepare('UPDATE players SET academy_id = ? WHERE discord_id = ?').run(academyId, playerId);

    recordSystemLog({
      level: 'INFO',
      category: 'Academy',
      actor: user.username,
      target: academy.name,
      title: 'Transferred Academy',
      ip
    });
    return sendJson(res, 200, { ok: true, academy });
  }

  // Chapters roadmap
  if (pathname === '/api/chapters' && req.method === 'GET') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const list = getPlayerChapters(player, db).map(ch => {
      let reqLevel = 1, reqRep = 0, tier = 'Academy';
      if (ch.id >= 6 && ch.id <= 12) { reqLevel = 3; tier = 'Local Club'; }
      else if (ch.id >= 13 && ch.id <= 18) { reqLevel = 7; reqRep = 100; tier = 'District League'; }
      else if (ch.id >= 19 && ch.id <= 28) { reqLevel = 12; reqRep = 400; tier = 'State First-Class'; }
      else if (ch.id >= 29 && ch.id <= 38) { reqLevel = 18; reqRep = 800; tier = 'T20 Franchise'; }
      else if (ch.id >= 39) { reqLevel = 28; reqRep = 1800; tier = 'International'; }

      return {
        ...ch,
        tier,
        reqLevel,
        reqRep,
        completed: ch.id < player.current_chapter,
        current: ch.id === player.current_chapter,
        locked: ch.id > player.current_chapter,
        meetsReq: player.level >= reqLevel && player.reputation >= reqRep
      };
    });
    return sendJson(res, 200, { currentChapter: player.current_chapter, chapters: list });
  }

  // Training
  if (pathname === '/api/train' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const regime = String(body.regime || '');
    if (!['batting', 'bowling', 'fitness', 'fielding'].includes(regime)) {
      return sendJson(res, 400, { error: 'Invalid training regime.' });
    }

    const energy = updateAndGetEnergy(db, playerId);
    if (energy < 25) return sendJson(res, 400, { error: `Exhausted! Energy is ${energy}/100 (requires 25).` });
    if (player.training_tokens <= 0) return sendJson(res, 400, { error: 'No Training Tickets left!' });

    db.prepare('UPDATE players SET training_tokens = training_tokens - 1 WHERE discord_id = ?').run(playerId);
    consumeEnergy(db, playerId, 25);

    const currentAttrs = db.prepare('SELECT * FROM attributes WHERE player_id = ?').get(playerId) || {};
    loadAcademies();
    const bonuses = (academies[player.academy_id]?.bonuses) || {};
    let xpMult = 1.0;
    const gains = [];
    const updates = [];

    function rollBreakthrough(val, isPrimary, mult = 1.0) {
      const v = val || 10;
      if (v >= 99) return 0;
      let chance = 0.50;
      if (v < 45) chance = 0.70;
      else if (v < 60) chance = 0.50;
      else if (v < 75) chance = 0.32;
      else if (v < 85) chance = 0.18;
      else if (v < 95) chance = 0.08;
      else chance = 0.03;
      if (!isPrimary) chance *= 0.55;
      chance *= mult;
      return Math.random() < chance ? 1 : 0;
    }

    function applyAttr(key, isPrimary, mult) {
      const curr = currentAttrs[key] || 10;
      const g = rollBreakthrough(curr, isPrimary, mult);
      if (g > 0) {
        const nextVal = Math.min(99, curr + g);
        gains.push({ key, from: curr, to: nextVal, delta: g });
        updates.push(`${key} = MIN(99, ${key} + ${g})`);
      }
    }

    if (regime === 'batting') {
      xpMult = bonuses.batting || 1.0;
      const pPool = ['timing', 'technique'];
      const sPool = ['power', 'defense'];
      applyAttr(pPool[Math.floor(Math.random() * pPool.length)], true, xpMult);
      applyAttr(sPool[Math.floor(Math.random() * sPool.length)], false, xpMult);
    } else if (regime === 'bowling') {
      xpMult = bonuses.bowling || 1.0;
      const pPool = ['accuracy', 'variations'];
      const sec = (player.bowling_style || '').toLowerCase().includes('spin') ? 'spin_bowling' : (Math.random() < 0.5 ? 'swing' : 'seam');
      applyAttr(pPool[Math.floor(Math.random() * pPool.length)], true, xpMult);
      applyAttr(sec, false, xpMult);
    } else if (regime === 'fitness') {
      xpMult = bonuses.fitness || 1.0;
      const pPool = ['fitness', 'stamina'];
      const sPool = ['power', 'running'];
      applyAttr(pPool[Math.floor(Math.random() * pPool.length)], true, xpMult);
      applyAttr(sPool[Math.floor(Math.random() * sPool.length)], false, xpMult);
    } else {
      xpMult = bonuses.fielding || 1.0;
      const pPool = ['fielding', 'reflex'];
      const sPool = ['throw_accuracy', 'running'];
      applyAttr(pPool[Math.floor(Math.random() * pPool.length)], true, xpMult);
      applyAttr(sPool[Math.floor(Math.random() * sPool.length)], false, xpMult);
    }

    if (updates.length > 0) {
      db.prepare(`UPDATE attributes SET ${updates.join(', ')} WHERE player_id = ?`).run(playerId);
    }
    const xpEarned = Math.round(50 * xpMult);
    const xpRes = addXP(db, playerId, xpEarned);

    recordSystemLog({
      level: 'INFO',
      category: 'Training',
      actor: user.username,
      target: player.name,
      title: `Completed ${regime} training`,
      details: { xpEarned, gains },
      ip
    });

    return sendJson(res, 200, { ok: true, regime, xpEarned, gains, ...xpRes });
  }

  // Skills
  if (pathname === '/api/skills' && req.method === 'GET') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const unlocked = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(playerId).map(r => r.skill_key);
    return sendJson(res, 200, {
      skillPoints: player.skill_points,
      unlocked,
      skills: Object.values(skillTree)
    });
  }

  if (pathname === '/api/skills/unlock' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const key = String(body.skill_key || '');
    const node = skillTree[key];
    if (!node) return sendJson(res, 400, { error: 'Unknown skill.' });

    const unlocked = db.prepare('SELECT skill_key FROM skills WHERE player_id = ?').all(playerId).map(r => r.skill_key);
    if (unlocked.includes(key)) return sendJson(res, 400, { error: 'Skill already unlocked.' });
    if (node.requires && !unlocked.includes(node.requires)) {
      return sendJson(res, 400, { error: `Requires "${skillTree[node.requires]?.name || node.requires}" first.` });
    }
    if (player.skill_points < node.cost) {
      return sendJson(res, 400, { error: `Requires ${node.cost} Skill Points (you have ${player.skill_points}).` });
    }

    db.prepare('UPDATE players SET skill_points = skill_points - ? WHERE discord_id = ?').run(node.cost, playerId);
    db.prepare('INSERT INTO skills (player_id, skill_key) VALUES (?, ?)').run(playerId, key);

    recordSystemLog({
      level: 'INFO',
      category: 'Skills',
      actor: user.username,
      title: `Unlocked skill: ${node.name}`,
      ip
    });
    return sendJson(res, 200, { ok: true, skill: node });
  }

  // Shop & Inventory
  if (pathname === '/api/shop' && req.method === 'GET') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    loadCustomItems();
    const owned = db.prepare('SELECT item_id FROM inventory WHERE player_id = ?').all(playerId).map(i => i.item_id);
    return sendJson(res, 200, {
      coins: player.coins,
      items: Object.values(shopEquipment).map(item => ({
        ...item,
        owned: owned.includes(item.id)
      }))
    });
  }

  if (pathname === '/api/shop/buy' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    loadCustomItems();
    const body = await parseJsonBody(req);
    const item = shopEquipment[String(body.item_id || '')];
    if (!item) return sendJson(res, 404, { error: 'Item not found.' });
    if (player.coins < item.cost) return sendJson(res, 400, { error: `Not enough coins (costs ${item.cost}, you have ${player.coins}).` });

    db.prepare('UPDATE players SET coins = coins - ? WHERE discord_id = ?').run(item.cost, playerId);
    db.prepare(`
      INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(playerId, item.id, item.name, item.type, item.rarity, JSON.stringify(item.bonuses));

    recordSystemLog({
      level: 'ECONOMY',
      category: 'Shop',
      actor: user.username,
      target: item.name,
      title: `Purchased ${item.name}`,
      details: { cost: item.cost, rarity: item.rarity },
      ip
    });
    return sendJson(res, 200, { ok: true, item });
  }

  if (pathname === '/api/inventory/equip' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const invId = Number(body.inventory_id);
    const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND player_id = ?').get(invId, playerId);
    if (!item) return sendJson(res, 404, { error: 'Inventory item not found.' });

    if (item.equipped) {
      db.prepare('UPDATE inventory SET equipped = 0 WHERE id = ?').run(invId);
    } else {
      db.prepare('UPDATE inventory SET equipped = 0 WHERE player_id = ? AND type = ?').run(playerId, item.type);
      db.prepare('UPDATE inventory SET equipped = 1 WHERE id = ?').run(invId);
    }
    return sendJson(res, 200, { ok: true });
  }

  // Shot Map
  if (pathname === '/api/shotmap' && req.method === 'GET') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const customPreset = getPlayerCustomPreset(playerId);
    return sendJson(res, 200, {
      footworkOptions: FOOTWORK_OPTIONS,
      intentOptions: INTENT_OPTIONS,
      zoneOptions: ZONE_OPTIONS,
      catalog: SHOT_CATALOG,
      preset: customPreset
    });
  }

  if (pathname === '/api/shotmap/equip' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const { footwork, intent, zone, shotId } = body;
    const key = getComboKey(footwork, intent, zone);
    const pool = SHOT_CATALOG[key];
    if (!pool || !pool.find(s => s.id === shotId)) {
      return sendJson(res, 400, { error: 'Invalid shot selection for this combination.' });
    }
    setPlayerEquippedShot(playerId, footwork, intent, zone, shotId);
    return sendJson(res, 200, { ok: true, comboKey: key, shotId });
  }

  if (pathname === '/api/shotmap/reset' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    resetPlayerPreset(playerId);
    return sendJson(res, 200, { ok: true });
  }

  // Club, Contracts, Sponsors, Season
  if (pathname === '/api/club' && req.method === 'GET') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const activeContract = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND active = 1').get(playerId);
    const sponsors = db.prepare('SELECT * FROM sponsors ORDER BY reputation_required ASC').all().map(sp => ({
      ...sp,
      perk_item_bonuses: JSON.parse(sp.perk_item_bonuses_json || '{}'),
      unlocked: player.reputation >= sp.reputation_required,
      active: player.sponsor === sp.name
    }));
    const tier = getPlayerTier(player.level);
    return sendJson(res, 200, {
      player,
      tier,
      activeContract,
      sponsors
    });
  }

  if (pathname === '/api/contracts/offers' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    if (player.level < 4) return sendJson(res, 400, { error: 'Reach Level 4 to unlock Club Contract Draft offers.' });
    const baseVal = player.level * 15 + player.reputation * 0.2;
    const contractType = player.level >= 13 ? 'Domestic T20' : player.level >= 7 ? 'District Club' : 'Local Club';
    const offers = [
      { id: 'surrey', club: 'Surrey Stars CC', type: contractType, salary: Math.round(baseVal * 0.9 + 20), term: 2 },
      { id: 'mumbai', club: 'Mumbai Blasters', type: contractType, salary: Math.round(baseVal * 1.1 + 30), term: 1 },
      { id: 'sydney', club: 'Sydney Thunderbirds', type: contractType, salary: Math.round(baseVal * 1.0 + 25), term: 3 }
    ];
    return sendJson(res, 200, { offers });
  }

  if (pathname === '/api/contracts/sign' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const { club, type, salary, term } = body;
    if (!club || !salary || !term) return sendJson(res, 400, { error: 'Missing contract details.' });

    db.prepare('DELETE FROM contracts WHERE player_id = ?').run(playerId);
    db.prepare(`
      INSERT INTO contracts (player_id, club_name, contract_type, salary_per_match, term_seasons, remaining_seasons, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(playerId, String(club), String(type || 'Local Club'), Number(salary), Number(term), Number(term));

    recordSystemLog({
      level: 'ECONOMY',
      category: 'Contracts',
      actor: user.username,
      target: club,
      title: `Signed Club Contract with ${club}`,
      details: { salary, term },
      ip
    });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/sponsors/sign' && req.method === 'POST') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const body = await parseJsonBody(req);
    const sponsor = db.prepare('SELECT * FROM sponsors WHERE id = ?').get(String(body.sponsor_id || ''));
    if (!sponsor) return sendJson(res, 404, { error: 'Sponsor not found.' });
    if (player.reputation < sponsor.reputation_required) {
      return sendJson(res, 400, { error: `Requires ${sponsor.reputation_required} Reputation.` });
    }
    if (player.sponsor === sponsor.name) {
      return sendJson(res, 400, { error: 'You are already endorsed by this sponsor.' });
    }

    db.prepare('UPDATE players SET sponsor = ?, coins = coins + ? WHERE discord_id = ?')
      .run(sponsor.name, sponsor.bonus_coins || 0, playerId);

    if (sponsor.perk_item_id && sponsor.perk_item_name) {
      const hasItem = db.prepare('SELECT id FROM inventory WHERE player_id = ? AND item_id = ?').get(playerId, sponsor.perk_item_id);
      if (!hasItem) {
        db.prepare(`
          INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
          VALUES (?, ?, ?, ?, 'Rare', ?, 0)
        `).run(playerId, sponsor.perk_item_id, sponsor.perk_item_name, sponsor.perk_item_type || 'Grip', sponsor.perk_item_bonuses_json || '{}');
      }
    }

    recordSystemLog({
      level: 'ECONOMY',
      category: 'Sponsors',
      actor: user.username,
      target: sponsor.name,
      title: `Signed Sponsor Deal: ${sponsor.name}`,
      details: { bonusCoins: sponsor.bonus_coins },
      ip
    });
    return sendJson(res, 200, { ok: true, sponsor });
  }

  // Stats, History, Achievements, Leaderboards
  if (pathname === '/api/stats' && req.method === 'GET') {
    const player = getPlayerOrFail(res, user);
    if (!player) return true;
    const stats = db.prepare('SELECT * FROM stats WHERE player_id = ?').get(playerId) || {};
    const notOuts = db.prepare("SELECT COUNT(*) as c FROM match_history WHERE player_id = ? AND LOWER(dismissal) = 'not out'").get(playerId)?.c || 0;
    const dismissals = Math.max(1, (stats.matches || 0) - notOuts);
    const bestBowl = db.prepare('SELECT wickets, runs_conceded FROM match_history WHERE player_id = ? ORDER BY wickets DESC, runs_conceded ASC LIMIT 1').get(playerId);
    const history = db.prepare('SELECT * FROM match_history WHERE player_id = ? ORDER BY id DESC LIMIT 40').all(playerId);
    const achievementsList = getPlayerAchievements(db, playerId);

    return sendJson(res, 200, {
      stats,
      computed: {
        battingAvg: stats.matches > 0 ? (stats.runs / dismissals).toFixed(2) : '0.00',
        strikeRate: stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : '0.00',
        economy: stats.overs > 0 ? (stats.runs_conceded / stats.overs).toFixed(2) : '0.00',
        bowlingAvg: stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(2) : '0.00',
        bestBowling: bestBowl ? `${bestBowl.wickets}/${bestBowl.runs_conceded}` : 'N/A'
      },
      history,
      achievements: achievementsList
    });
  }

  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    const type = query.get('type') || 'level';
    let rows = [];
    if (type === 'runs') {
      rows = db.prepare(`
        SELECT p.discord_id, p.name, p.level, p.primary_role, s.runs as score, s.matches
        FROM stats s JOIN players p ON s.player_id = p.discord_id
        ORDER BY s.runs DESC LIMIT 25
      `).all();
    } else if (type === 'wickets') {
      rows = db.prepare(`
        SELECT p.discord_id, p.name, p.level, p.primary_role, s.wickets as score, s.matches
        FROM stats s JOIN players p ON s.player_id = p.discord_id
        ORDER BY s.wickets DESC LIMIT 25
      `).all();
    } else if (type === 'coins') {
      rows = db.prepare(`
        SELECT discord_id, name, level, primary_role, coins as score
        FROM players ORDER BY coins DESC LIMIT 25
      `).all();
    } else if (type === 'pvp') {
      rows = db.prepare(`
        SELECT p.discord_id, p.name, p.level, cs.won as score, cs.played, cs.runs
        FROM challenge_stats cs JOIN players p ON cs.player_id = p.discord_id
        ORDER BY cs.won DESC, cs.runs DESC LIMIT 25
      `).all();
    } else {
      rows = db.prepare(`
        SELECT discord_id, name, level, xp, primary_role, level as score
        FROM players ORDER BY level DESC, xp DESC LIMIT 25
      `).all();
    }
    return sendJson(res, 200, { type, rows });
  }

  // Settings
  if (pathname === '/api/settings' && req.method === 'GET') {
    return sendJson(res, 200, { settings: getPlayerSettings(playerId) });
  }

  if (pathname === '/api/settings/update' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const updated = updatePlayerSetting(playerId, String(body.key || ''), body.value);
    return sendJson(res, 200, { settings: updated });
  }

  if (pathname === '/api/settings/reset' && req.method === 'POST') {
    const updated = resetPlayerSettings(playerId);
    return sendJson(res, 200, { settings: updated });
  }

  return false;
}
