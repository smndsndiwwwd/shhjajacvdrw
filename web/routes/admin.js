import crypto from 'crypto';
import db, { resolvePlayerByIdentifier } from '../../src/database/db.js';
import { getAuthUser, hashPassword } from '../lib/auth.js';
import { sendJson, parseJsonBody, getClientIp } from '../lib/http.js';
import { addXP } from '../../src/game/utils.js';
import { loadCustomItems } from '../../src/game/equipment.js';
import { loadAcademies } from '../../src/game/academies.js';
import { loadEmojis, updateEmojiInDb } from '../../src/game/emojis.js';
import { querySystemLogs, recordSystemLog } from '../../src/game/systemLog.js';

export async function handleAdminRoutes(req, res, pathname, query) {
  const user = getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized.' });
    return true;
  }
  if (user.role !== 'admin') {
    recordSystemLog({
      level: 'WARN',
      category: 'Admin',
      actor: user.username,
      title: 'Unauthorized Admin Access Attempt',
      details: pathname,
      ip: getClientIp(req)
    });
    sendJson(res, 403, { error: 'Forbidden: Administrator role required.' });
    return true;
  }
  const ip = getClientIp(req);

  // 1. Full System Logs Console
  if (pathname === '/api/admin/logs' && req.method === 'GET') {
    const result = querySystemLogs({
      level: query.get('level') || 'ALL',
      category: query.get('category') || 'ALL',
      search: query.get('search') || '',
      limit: query.get('limit') || 150,
      offset: query.get('offset') || 0
    });
    return sendJson(res, 200, result);
  }

  if (pathname === '/api/admin/logs' && req.method === 'DELETE') {
    db.prepare('DELETE FROM admin_logs').run();
    recordSystemLog({
      level: 'ADMIN',
      category: 'Admin',
      actor: user.username,
      title: 'Cleared System Audit Logs',
      ip
    });
    return sendJson(res, 200, { ok: true });
  }

  // 2. Overview Metrics
  if (pathname === '/api/admin/overview' && req.method === 'GET') {
    const webUsers = db.prepare('SELECT COUNT(*) as cnt FROM web_users').get()?.cnt || 0;
    const admins = db.prepare("SELECT COUNT(*) as cnt FROM web_users WHERE role = 'admin'").get()?.cnt || 0;
    const players = db.prepare('SELECT COUNT(*) as cnt FROM players').get()?.cnt || 0;
    const totalCoins = db.prepare('SELECT COALESCE(SUM(coins), 0) as s FROM players').get()?.s || 0;
    const totalMatches = db.prepare('SELECT COUNT(*) as cnt FROM match_history').get()?.cnt || 0;
    const totalLogs = db.prepare('SELECT COUNT(*) as cnt FROM admin_logs').get()?.cnt || 0;
    const warnLogs = db.prepare("SELECT COUNT(*) as cnt FROM admin_logs WHERE level IN ('WARN', 'ERROR')").get()?.cnt || 0;

    return sendJson(res, 200, {
      metrics: { webUsers, admins, players, totalCoins, totalMatches, totalLogs, warnLogs }
    });
  }

  // 3. Users & Players Management
  if (pathname === '/api/admin/users' && req.method === 'GET') {
    const webUsers = db.prepare(`
      SELECT u.id, u.username, u.role, u.player_id, u.created_at, u.last_login,
             p.public_id, p.name as player_name, p.level, p.coins, p.energy, p.reputation, p.current_chapter, p.primary_role
      FROM web_users u
      LEFT JOIN players p ON u.player_id = p.discord_id
      ORDER BY u.id DESC
    `).all();
    const allPlayers = db.prepare(`
      SELECT discord_id, public_id, name, level, xp, coins, training_tokens, energy, confidence, form, reputation, skill_points, current_chapter, primary_role, created_at
      FROM players ORDER BY level DESC, created_at DESC LIMIT 200
    `).all();
    return sendJson(res, 200, { webUsers, allPlayers });
  }

  if (pathname === '/api/admin/users/create' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = body.role === 'admin' ? 'admin' : 'player';
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return sendJson(res, 400, { error: 'Username must be 3–24 alphanumeric/underscore chars.' });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
    }
    if (db.prepare('SELECT id FROM web_users WHERE username = ?').get(username)) {
      return sendJson(res, 409, { error: 'Username already exists.' });
    }
    const playerId = `web_${role}_${crypto.randomBytes(5).toString('hex')}`;
    db.prepare('INSERT INTO web_users (username, password_hash, role, player_id) VALUES (?, ?, ?, ?)')
      .run(username, hashPassword(password), role, playerId);

    recordSystemLog({
      level: 'ADMIN',
      category: 'Admin',
      actor: user.username,
      target: username,
      title: `Created ${role.toUpperCase()} Account: ${username}`,
      ip
    });
    return sendJson(res, 201, { ok: true });
  }

  if (pathname === '/api/admin/users/role' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const targetId = Number(body.user_id);
    const newRole = body.role === 'admin' ? 'admin' : 'player';
    if (targetId === user.id) {
      return sendJson(res, 400, { error: 'Cannot change your own role while logged in.' });
    }
    const target = db.prepare('SELECT username FROM web_users WHERE id = ?').get(targetId);
    if (!target) return sendJson(res, 404, { error: 'User not found.' });
    db.prepare('UPDATE web_users SET role = ? WHERE id = ?').run(newRole, targetId);

    recordSystemLog({
      level: 'ADMIN',
      category: 'Admin',
      actor: user.username,
      target: target.username,
      title: `Changed User Role to ${newRole.toUpperCase()}`,
      ip
    });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/users' && req.method === 'DELETE') {
    const targetId = Number(query.get('id'));
    if (targetId === user.id) return sendJson(res, 400, { error: 'Cannot delete your own active admin account.' });
    const target = db.prepare('SELECT username, player_id FROM web_users WHERE id = ?').get(targetId);
    if (!target) return sendJson(res, 404, { error: 'User not found.' });
    db.prepare('DELETE FROM web_users WHERE id = ?').run(targetId);
    if (target.player_id?.startsWith('web_')) {
      db.prepare('DELETE FROM players WHERE discord_id = ?').run(target.player_id);
    }
    recordSystemLog({
      level: 'ADMIN',
      category: 'Admin',
      actor: user.username,
      target: target.username,
      title: `Deleted User Account: ${target.username}`,
      ip
    });
    return sendJson(res, 200, { ok: true });
  }

  // 4. Resource Grants (Admin & Owner Give)
  if (pathname === '/api/admin/give' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const rawTarget = String(body.player_id || '');
    const type = String(body.type || '');
    const amount = Number(body.amount);

    const resolvedPlayer = resolvePlayerByIdentifier(db, rawTarget);
    const targetPlayerId = resolvedPlayer ? resolvedPlayer.discord_id : rawTarget;
    const targetPlayer = resolvedPlayer || db.prepare('SELECT name FROM players WHERE discord_id = ?').get(targetPlayerId);
    if (!targetPlayer) return sendJson(res, 404, { error: 'Target career player not found.' });
    if (isNaN(amount)) return sendJson(res, 400, { error: 'Amount must be a number.' });

    let summary = '';
    if (type === 'coins') {
      db.prepare('UPDATE players SET coins = MAX(0, coins + ?) WHERE discord_id = ?').run(amount, targetPlayerId);
      summary = `${amount} Coins`;
    } else if (type === 'training_tokens') {
      db.prepare('UPDATE players SET training_tokens = MAX(0, training_tokens + ?) WHERE discord_id = ?').run(amount, targetPlayerId);
      summary = `${amount} Training Tickets`;
    } else if (type === 'xp') {
      const xpRes = addXP(db, targetPlayerId, amount);
      summary = `${amount} XP (Level ${xpRes.newLevel})`;
    } else if (type === 'reputation') {
      db.prepare('UPDATE players SET reputation = MAX(0, reputation + ?) WHERE discord_id = ?').run(amount, targetPlayerId);
      summary = `${amount} Reputation`;
    } else if (type === 'confidence') {
      db.prepare('UPDATE players SET confidence = MIN(100, MAX(10, confidence + ?)) WHERE discord_id = ?').run(amount, targetPlayerId);
      summary = `${amount} Confidence`;
    } else if (type === 'form') {
      db.prepare('UPDATE players SET form = MIN(100, MAX(20, form + ?)) WHERE discord_id = ?').run(amount, targetPlayerId);
      summary = `${amount} Form`;
    } else if (type === 'skill_points') {
      db.prepare('UPDATE players SET skill_points = MAX(0, skill_points + ?) WHERE discord_id = ?').run(amount, targetPlayerId);
      summary = `${amount} Skill Points`;
    } else if (type === 'energy') {
      const val = Math.min(100, Math.max(0, amount));
      db.prepare('UPDATE players SET energy = ?, last_energy_update = ? WHERE discord_id = ?').run(val, Date.now(), targetPlayerId);
      summary = `Energy set to ${val}/100`;
    } else {
      return sendJson(res, 400, { error: 'Invalid resource type.' });
    }

    const targetLabel = targetPlayer.public_id
      ? `${targetPlayer.name} [${targetPlayer.public_id}]`
      : targetPlayer.name;
    recordSystemLog({
      level: 'ADMIN',
      category: 'Admin',
      actor: user.username,
      target: targetLabel,
      title: `Admin Gave ${summary} ➔ ${targetPlayer.name}`,
      details: { targetPlayerId, publicId: targetPlayer.public_id || null, type, amount },
      ip
    });
    return sendJson(res, 200, { ok: true, summary });
  }

  // 5. Custom Shop Items
  if (pathname === '/api/admin/items' && req.method === 'GET') {
    return sendJson(res, 200, { items: db.prepare('SELECT * FROM custom_items').all() });
  }
  if (pathname === '/api/admin/items' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const id = String(body.id || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!id || !body.name || !body.type || !body.rarity) return sendJson(res, 400, { error: 'Missing required fields.' });
    const bonuses = typeof body.bonuses === 'string' ? body.bonuses : JSON.stringify(body.bonuses || {});
    db.prepare('INSERT OR REPLACE INTO custom_items (id, name, type, rarity, cost, bonuses_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, String(body.name), String(body.type), String(body.rarity), Number(body.cost) || 100, bonuses);
    loadCustomItems();
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: body.name, title: `Saved Custom Shop Item (${id})`, ip });
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/admin/items' && req.method === 'DELETE') {
    const id = query.get('id');
    db.prepare('DELETE FROM custom_items WHERE id = ?').run(id);
    loadCustomItems();
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: id, title: `Deleted Custom Shop Item (${id})`, ip });
    return sendJson(res, 200, { ok: true });
  }

  // 6. Academies Editor
  if (pathname === '/api/admin/academies' && req.method === 'GET') {
    return sendJson(res, 200, { academies: db.prepare('SELECT * FROM academies').all() });
  }
  if (pathname === '/api/admin/academies' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const id = String(body.id || '').trim();
    if (!id || !body.name) return sendJson(res, 400, { error: 'Academy id and name required.' });
    const bonusesJson = typeof body.bonuses_json === 'string' ? body.bonuses_json : JSON.stringify(body.bonuses || { batting: 1.05 });
    db.prepare(`
      INSERT OR REPLACE INTO academies (id, name, rating, reputation, history, specialty, coach_rating, training_bonus_text, bonuses_json, graduates_domestic, graduates_international, success_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, body.name, Number(body.rating) || 4, body.reputation || 'Elite', body.history || 'Custom Academy',
      body.specialty || 'Balanced', body.coach_rating || 'Elite Coach', body.training_bonus_text || '+5% Batting XP',
      bonusesJson, Number(body.graduates_domestic) || 10, Number(body.graduates_international) || 2, body.success_rate || '60%'
    );
    loadAcademies();
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: body.name, title: `Saved Academy (${id})`, ip });
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/admin/academies' && req.method === 'DELETE') {
    const id = query.get('id');
    db.prepare('DELETE FROM academies WHERE id = ?').run(id);
    loadAcademies();
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: id, title: `Deleted Academy (${id})`, ip });
    return sendJson(res, 200, { ok: true });
  }

  // 7. Sponsors Editor
  if (pathname === '/api/admin/sponsors' && req.method === 'GET') {
    return sendJson(res, 200, { sponsors: db.prepare('SELECT * FROM sponsors').all() });
  }
  if (pathname === '/api/admin/sponsors' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const id = String(body.id || '').trim();
    if (!id || !body.name) return sendJson(res, 400, { error: 'Sponsor id and name required.' });
    db.prepare(`
      INSERT OR REPLACE INTO sponsors (id, name, description, bonus_coins, reputation_required, perk_item_id, perk_item_name, perk_item_type, perk_item_bonuses_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, body.name, body.description || 'Brand Endorsement', Number(body.bonus_coins) || 250,
      Number(body.reputation_required) || 0, body.perk_item_id || '', body.perk_item_name || '',
      body.perk_item_type || 'Grip', body.perk_item_bonuses_json || '{}'
    );
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: body.name, title: `Saved Sponsor (${id})`, ip });
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/admin/sponsors' && req.method === 'DELETE') {
    const id = query.get('id');
    db.prepare('DELETE FROM sponsors WHERE id = ?').run(id);
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: id, title: `Deleted Sponsor (${id})`, ip });
    return sendJson(res, 200, { ok: true });
  }

  // 8. Emoji Config
  if (pathname === '/api/admin/emojis' && req.method === 'GET') {
    loadEmojis();
    const rows = db.prepare("SELECT key, value FROM config WHERE key LIKE 'emoji_%' ORDER BY key ASC").all();
    return sendJson(res, 200, { emojis: rows });
  }
  if (pathname === '/api/admin/emojis' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const key = String(body.key || '');
    const value = String(body.value || '');
    if (!key.startsWith('emoji_') || !value) return sendJson(res, 400, { error: 'Valid emoji_* key and value required.' });
    updateEmojiInDb(key, value);
    recordSystemLog({ level: 'ADMIN', category: 'Admin', actor: user.username, target: key, title: `Updated Emoji Config (${key})`, details: value, ip });
    return sendJson(res, 200, { ok: true });
  }

  return false;
}
