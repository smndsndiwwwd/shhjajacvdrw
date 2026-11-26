import db from '../database/db.js';

/**
 * Records a structured audit/system log entry in SQLite `admin_logs`.
 */
export async function recordSystemLog({
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

    await db.run(
      `INSERT INTO admin_logs (timestamp, level, category, actor, target, title, details, ip)
       VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?)`,
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

export async function getAdminLogInsights() {
  const loginsToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title IN ('Player Logged In', 'Admin Logged In')
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const uniqueLoginsToday = (await db.get(`
    SELECT COUNT(DISTINCT actor) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title IN ('Player Logged In', 'Admin Logged In')
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const failedLoginsToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title = 'Failed Login Attempt'
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const registrationsToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title = 'New Web Account Created'
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const careersCreatedToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Career'
      AND title = 'New Career Player Created'
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const matchesToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM match_history
    WHERE date(date) = date('now')
  `))?.cnt || 0;

  const economyToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE level IN ('ECONOMY', 'ADMIN')
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const alertsLast24h = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE level IN ('WARN', 'ERROR')
      AND timestamp >= datetime('now', '-24 hours')
  `))?.cnt || 0;

  const loginsLast7d = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE category = 'Auth'
      AND title IN ('Player Logged In', 'Admin Logged In')
      AND timestamp >= datetime('now', '-7 days')
  `))?.cnt || 0;

  const topActorsToday = await db.all(`
    SELECT actor, COUNT(*) as events
    FROM admin_logs
    WHERE date(timestamp) = date('now')
    GROUP BY actor
    ORDER BY events DESC
    LIMIT 6
  `);

  const categoryBreakdownToday = await db.all(`
    SELECT category, COUNT(*) as cnt
    FROM admin_logs
    WHERE date(timestamp) = date('now')
    GROUP BY category
    ORDER BY cnt DESC
  `);

  const rawHourly = await db.all(`
    SELECT strftime('%H', timestamp) as hr, COUNT(*) as cnt
    FROM admin_logs
    WHERE timestamp >= datetime('now', '-24 hours')
    GROUP BY hr
    ORDER BY hr ASC
  `);

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

  const recentLogins = await db.all(`
    SELECT actor, title, ip, timestamp
    FROM admin_logs
    WHERE category = 'Auth' AND title IN ('Player Logged In', 'Admin Logged In', 'Failed Login Attempt')
    ORDER BY id DESC
    LIMIT 8
  `);

  const adminActionsToday = (await db.get(`
    SELECT COUNT(*) as cnt FROM admin_logs
    WHERE (level = 'ADMIN' OR category = 'Admin')
      AND date(timestamp) = date('now')
  `))?.cnt || 0;

  const recentAdminActions = await db.all(`
    SELECT id, actor, target, title, details, ip, timestamp
    FROM admin_logs
    WHERE level = 'ADMIN' OR category = 'Admin'
    ORDER BY id DESC
    LIMIT 15
  `);

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

export async function querySystemLogs({
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

  const logs = await db.all(
    `SELECT * FROM admin_logs ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    ...params,
    safeLimit,
    safeOffset
  );

  const total = (await db.get(`SELECT COUNT(*) as cnt FROM admin_logs ${where}`, ...params))?.cnt || 0;
  const countsByLevel = await db.all(`SELECT level, COUNT(*) as cnt FROM admin_logs GROUP BY level`);
  const categories = (await db.all(`SELECT DISTINCT category FROM admin_logs ORDER BY category ASC`)).map(r => r.category);
  const insights = await getAdminLogInsights();

  return { logs, total, countsByLevel, categories, insights };
}
