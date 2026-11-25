import crypto from 'crypto';
import db from '../../src/database/db.js';
import { recordSystemLog } from '../../src/game/systemLog.js';

const COOKIE_NAME = 'ca_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret() {
  if (process.env.WEB_SESSION_SECRET) return process.env.WEB_SESSION_SECRET;
  let row = db.prepare("SELECT value FROM config WHERE key = 'web_session_secret'").get();
  if (!row) {
    const secret = crypto.randomBytes(48).toString('hex');
    db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('web_session_secret', ?)").run(secret);
    return secret;
  }
  return row.value;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHex] = storedHash.split(':');
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

export function signSessionToken(user) {
  const payload = {
    uid: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function getAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = db.prepare('SELECT id, username, role, player_id, created_at, last_login FROM web_users WHERE id = ?').get(payload.uid);
  return user || null;
}

export function makeSessionCookieHeader(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function makeClearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function ensureDefaultAdmin() {
  const existingAdmin = db.prepare("SELECT id, username FROM web_users WHERE role = 'admin' LIMIT 1").get();
  if (!existingAdmin) {
    const adminUser = (process.env.WEB_ADMIN_USER || 'admin').trim();
    const adminPass = process.env.WEB_ADMIN_PASS || 'Admin@Cricket2026';
    const playerId = `web_admin_${crypto.randomBytes(4).toString('hex')}`;
    const hash = hashPassword(adminPass);
    db.prepare(`
      INSERT INTO web_users (username, password_hash, role, player_id)
      VALUES (?, ?, 'admin', ?)
    `).run(adminUser, hash, playerId);

    recordSystemLog({
      level: 'ADMIN',
      category: 'System',
      actor: 'system',
      target: adminUser,
      title: 'Default Admin Account Provisioned',
      details: `Provisioned initial admin account "${adminUser}". Change password or create additional admins inside the Admin Console.`
    });
    console.log(`🛡️ Seeded default Admin account: username="${adminUser}" password="${adminPass}"`);
  }
}
