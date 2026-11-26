import crypto from 'crypto';
import db from '../../src/database/db.js';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  getAuthUser,
  makeSessionCookieHeader,
  makeClearCookieHeader
} from '../lib/auth.js';
import { sendJson, parseJsonBody, getClientIp } from '../lib/http.js';
import { recordSystemLog } from '../../src/game/systemLog.js';

export async function handleAuthRoutes(req, res, pathname) {
  const ip = getClientIp(req);

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = await getAuthUser(req);
    if (!user) return sendJson(res, 200, { authenticated: false, user: null });
    const player = user.player_id
      ? await db.get('SELECT discord_id, name, level, primary_role FROM players WHERE discord_id = ?', user.player_id)
      : null;
    return sendJson(res, 200, { authenticated: true, user, hasPlayer: Boolean(player), playerSummary: player });
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return sendJson(res, 400, { error: 'Username must be 3–24 characters (letters, numbers, underscores only).' });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
    }

    const exists = await db.get('SELECT id FROM web_users WHERE username = ?', username);
    if (exists) {
      return sendJson(res, 409, { error: 'That username is already taken.' });
    }

    const playerId = `web_${crypto.randomBytes(6).toString('hex')}`;
    const passwordHash = hashPassword(password);

    const info = await db.run(
      `INSERT INTO web_users (username, password_hash, role, player_id, last_login)
       VALUES (?, ?, 'player', ?, datetime('now'))`,
      username,
      passwordHash,
      playerId
    );

    const user = await db.get('SELECT id, username, role, player_id, created_at, last_login FROM web_users WHERE id = ?', info.lastInsertRowid);
    const token = await signSessionToken(user);

    await recordSystemLog({
      level: 'AUTH',
      category: 'Auth',
      actor: user.username,
      title: 'New Web Account Created',
      details: { playerId, role: user.role },
      ip
    });

    return sendJson(res, 201, { user }, { 'Set-Cookie': makeSessionCookieHeader(token, req) });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return sendJson(res, 400, { error: 'Username and password are required.' });
    }

    const row = await db.get('SELECT * FROM web_users WHERE username = ?', username);
    if (!row || !verifyPassword(password, row.password_hash)) {
      await recordSystemLog({
        level: 'WARN',
        category: 'Auth',
        actor: username || 'unknown',
        title: 'Failed Login Attempt',
        details: 'Invalid username or password',
        ip
      });
      return sendJson(res, 401, { error: 'Invalid username or password.' });
    }

    await db.run("UPDATE web_users SET last_login = datetime('now') WHERE id = ?", row.id);
    const user = {
      id: row.id,
      username: row.username,
      role: row.role,
      player_id: row.player_id,
      created_at: row.created_at,
      last_login: new Date().toISOString()
    };
    const token = await signSessionToken(user);

    await recordSystemLog({
      level: row.role === 'admin' ? 'ADMIN' : 'AUTH',
      category: 'Auth',
      actor: user.username,
      title: row.role === 'admin' ? 'Admin Logged In' : 'Player Logged In',
      details: { role: user.role },
      ip
    });

    return sendJson(res, 200, { user }, { 'Set-Cookie': makeSessionCookieHeader(token, req) });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const user = await getAuthUser(req);
    if (user) {
      await recordSystemLog({
        level: 'AUTH',
        category: 'Auth',
        actor: user.username,
        title: 'User Logged Out',
        ip
      });
    }
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': makeClearCookieHeader(req) });
  }

  return false;
}
