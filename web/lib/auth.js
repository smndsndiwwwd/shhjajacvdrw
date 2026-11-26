import crypto from 'crypto';
import db from '../../src/database/db.js';
import { recordSystemLog } from '../../src/game/systemLog.js';

const COOKIE_NAME = 'ca_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let cachedSessionSecret = null;

async function getSessionSecret() {
  if (process.env.WEB_SESSION_SECRET) return process.env.WEB_SESSION_SECRET;
  if (cachedSessionSecret) return cachedSessionSecret;
  const row = await db.get("SELECT value FROM config WHERE key = 'web_session_secret'");
  if (!row) {
    const secret = crypto.randomBytes(48).toString('hex');
    await db.run("INSERT OR REPLACE INTO config (key, value) VALUES ('web_session_secret', ?)", secret);
    cachedSessionSecret = secret;
    return secret;
  }
  cachedSessionSecret = row.value;
  return cachedSessionSecret;
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

export async function signSessionToken(user) {
  const payload = {
    uid: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const secret = await getSessionSecret();
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const secret = await getSessionSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
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

export async function getAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await db.get('SELECT id, username, role, player_id, created_at, last_login FROM web_users WHERE id = ?', payload.uid);
  return user || null;
}

export function makeSessionCookieHeader(token, req = null) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const isHttps = Boolean(process.env.VERCEL || req?.headers?.['x-forwarded-proto'] === 'https');
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps ? '; Secure' : ''}`;
}

export function makeClearCookieHeader(req = null) {
  const isHttps = Boolean(process.env.VERCEL || req?.headers?.['x-forwarded-proto'] === 'https');
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isHttps ? '; Secure' : ''}`;
}

export async function ensureDefaultAdmin() {
  const existingAdmin = await db.get("SELECT id, username FROM web_users WHERE role = 'admin' LIMIT 1");
  if (!existingAdmin) {
    const adminUser = (process.env.WEB_ADMIN_USER || 'admin').trim();
    const adminPass = process.env.WEB_ADMIN_PASS || 'Admin@Cricket2026';
    const playerId = `web_admin_${crypto.randomBytes(4).toString('hex')}`;
    const hash = hashPassword(adminPass);
    await db.run(
      `INSERT INTO web_users (username, password_hash, role, player_id)
       VALUES (?, ?, 'admin', ?)`,
      adminUser,
      hash,
      playerId
    );

    await recordSystemLog({
      level: 'ADMIN',
      category: 'System',
      actor: 'system',
      target: adminUser,
      title: 'Default Admin Account Provisioned',
      details: `Provisioned initial admin account "${adminUser}". Update credentials cleanly inside environment settings.`
    });
    console.log(`🛡️ Seeded initial Admin account "${adminUser}".`);
  }
}
