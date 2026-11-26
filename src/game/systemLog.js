import db from '../database/db.js';

/**
 * Records a structured audit/system log entry in SQLite `admin_logs`.
 */
export function recordSystemLog({
  level = 'INFO',
  category = 'System',
  actor = 'system',
  target = null,
  title = '',
  details = null,
  ip = null
}) {
  try {
    let serialized = null;
    if (details != null) {
      if (typeof details === 'string') {
        serialized = details;
      } else if (typeof details === 'object') {
        const clone = { ...details };
        for (const k of Object.keys(clone)) {
          if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret')) {
            clone[k] = '[REDACTED]';
          }
        }
        serialized = JSON.stringify(clone);
      } else {
        serialized = JSON.stringify(details);
      }
    }

    db.prepare(`
      INSERT INTO admin_logs (timestamp, level, category, actor, target, title, details, ip)
      VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(level).toUpperCase(),
      String(category),
      String(actor || 'system'),
      target ? String(target) : null,
      String(title || category),
      serialized,
      ip ? String(ip) : null
    );
  } catch (err) {
    console.warn('recordSystemLog failed:', err.message);
  }
}

export function getAdminLogInsights() {
  const loginsToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title IN ('Player Logged In', 'Admin Logged In')
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const uniqueLoginsToday = db.prepare(`
    SELECT COUNT(DISTINCT actor) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title IN ('Player Logged In', 'Admin Logged In')
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const failedLoginsToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title = 'Failed Login Attempt'
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const registrationsToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title = 'New Web Account Created'
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const careersCreatedToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Career'
      AND title = 'New Career Player Created'
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const matchesToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM match_history
    WHERE date(date) = date('now')
  `).get()?.cnt || 0;

  const economyToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE level IN ('ECONOMY', 'ADMIN')
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const alertsLast24h = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE level IN ('WARN', 'ERROR')
      AND timestamp >= datetime('now', '-24 hours')
  `).get()?.cnt || 0;

  const loginsLast7d = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title IN ('Player Logged In', 'Admin Logged In')
      AND timestamp >= datetime('now', '-7 days')
  `).get()?.cnt || 0;

  const topActorsToday = db.prepare(`
    SELECT actor, COUNT(*) as events
    FROM admin_logs
    WHERE date(timestamp) = date('now')
    GROUP BY actor
    ORDER BY events DESC
    LIMIT 6
  `).all();

  const categoryBreakdownToday = db.prepare(`
    SELECT category, COUNT(*) as cnt
    FROM admin_logs
    WHERE date(timestamp) = date('now')
    GROUP BY category
    ORDER BY cnt DESC
  `).all();

  const rawHourly = db.prepare(`
    SELECT strftime('%H', timestamp) as hr, COUNT(*) as cnt
    FROM admin_logs
    WHERE timestamp >= datetime('now', '-24 hours')
    GROUP BY hr
    ORDER BY hr ASC
  `).all();

  const hourMap = new Map(rawHourly.map(r => [Number(r.hr), r.cnt]));
  const currentUtcHour = new Date().getUTCHours();
  const hourlyActivity = [];
  for (let i = 23; i >= 0; i--) {
    const h = (currentUtcHour - i + 24) % 24;
    hourlyActivity.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      count: hourMap.get(h) || 0
    });
  }

  const recentLogins = db.prepare(`
    SELECT actor, title, ip, timestamp
    FROM admin_logs
    WHERE category = 'Auth' AND title IN ('Player Logged In', 'Admin Logged In', 'Failed Login Attempt')
    ORDER BY id DESC
    LIMIT 8
  `).all();

  const adminActionsToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE (level = 'ADMIN' OR category = 'Admin')
      AND date(timestamp) = date('now')
  `).get()?.cnt || 0;

  const recentAdminActions = db.prepare(`
    SELECT id, actor, target, title, details, ip, timestamp
    FROM admin_logs
    WHERE level = 'ADMIN' OR category = 'Admin'
    ORDER BY id DESC
    LIMIT 15
  `).all();

  return {
    loginsToday,
    uniqueLoginsToday,
    failedLoginsToday,
    registrationsToday,
    careersCreatedToday,
    matchesToday,
    economyToday,
    adminActionsToday,
    alertsLast24h,
    loginsLast7d,
    topActorsToday,
    categoryBreakdownToday,
    hourlyActivity,
    recentLogins,
    recentAdminActions
  };
}

export function querySystemLogs({
  level = '',
  category = '',
  search = '',
  limit = 100,
  offset = 0
} = {}) {
  const conditions = [];
  const params = [];

  if (level && level !== 'ALL') {
    conditions.push('level = ?');
    params.push(level.toUpperCase());
  }
  if (category && category !== 'ALL') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push('(title LIKE ? OR actor LIKE ? OR target LIKE ? OR details LIKE ?)');
    params.push(q, q, q, q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const logs = db.prepare(`
    SELECT * FROM admin_logs ${where}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, safeLimit, safeOffset);

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM admin_logs ${where}`).get(...params)?.cnt || 0;
  const countsByLevel = db.prepare(`SELECT level, COUNT(*) as cnt FROM admin_logs GROUP BY level`).all();
  const categories = db.prepare(`SELECT DISTINCT category FROM admin_logs ORDER BY category ASC`).all().map(r => r.category);
  const insights = getAdminLogInsights();

  return { logs, total, countsByLevel, categories, insights };
}
