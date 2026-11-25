import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../career.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    discord_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    batting_hand TEXT NOT NULL,
    bowling_style TEXT NOT NULL,
    primary_role TEXT NOT NULL,
    nationality TEXT NOT NULL,
    academy_id TEXT NOT NULL,
    season INTEGER DEFAULT 1,
    coins INTEGER DEFAULT 100,
    training_tokens INTEGER DEFAULT 5,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    skill_points INTEGER DEFAULT 0,
    energy INTEGER DEFAULT 100,
    confidence INTEGER DEFAULT 50,
    form INTEGER DEFAULT 50,
    reputation INTEGER DEFAULT 0,
    current_chapter INTEGER DEFAULT 1,
    franchise_titles INTEGER DEFAULT 0,
    last_energy_update TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attributes (
    player_id TEXT PRIMARY KEY,
    power INTEGER DEFAULT 10,
    timing INTEGER DEFAULT 10,
    technique INTEGER DEFAULT 10,
    spin INTEGER DEFAULT 10,
    pace INTEGER DEFAULT 10,
    fitness INTEGER DEFAULT 10,
    mentality INTEGER DEFAULT 10,
    aggression INTEGER DEFAULT 10,
    defense INTEGER DEFAULT 10,
    running INTEGER DEFAULT 10,
    fielding INTEGER DEFAULT 10,
    reflex INTEGER DEFAULT 10,
    throw_accuracy INTEGER DEFAULT 10,
    swing INTEGER DEFAULT 10,
    seam INTEGER DEFAULT 10,
    spin_bowling INTEGER DEFAULT 10,
    accuracy INTEGER DEFAULT 10,
    variations INTEGER DEFAULT 10,
    stamina INTEGER DEFAULT 10,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rarity TEXT NOT NULL,
    bonuses TEXT NOT NULL, -- JSON string
    equipped INTEGER DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS skills (
    player_id TEXT NOT NULL,
    skill_key TEXT NOT NULL,
    PRIMARY KEY (player_id, skill_key),
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stats (
    player_id TEXT PRIMARY KEY,
    matches INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    balls INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    fifties INTEGER DEFAULT 0,
    hundreds INTEGER DEFAULT 0,
    double_hundreds INTEGER DEFAULT 0,
    ducks INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    overs REAL DEFAULT 0.0,
    runs_conceded INTEGER DEFAULT 0,
    catches INTEGER DEFAULT 0,
    run_outs INTEGER DEFAULT 0,
    stumpings INTEGER DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS match_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    opponent TEXT NOT NULL,
    match_type TEXT NOT NULL,
    runs INTEGER DEFAULT 0,
    balls INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    dismissal TEXT DEFAULT 'not out',
    wickets INTEGER DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    overs_bowled REAL DEFAULT 0.0,
    result TEXT NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    club_name TEXT NOT NULL,
    contract_type TEXT NOT NULL,
    salary_per_match INTEGER DEFAULT 0,
    term_seasons INTEGER DEFAULT 1,
    remaining_seasons INTEGER DEFAULT 1,
    active INTEGER DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS player_achievements (
    player_id TEXT NOT NULL,
    achievement_key TEXT NOT NULL,
    earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(player_id, achievement_key),
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS academies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rating INTEGER DEFAULT 1,
    reputation TEXT NOT NULL,
    history TEXT NOT NULL,
    specialty TEXT NOT NULL,
    coach_rating TEXT NOT NULL,
    training_bonus_text TEXT NOT NULL,
    bonuses_json TEXT NOT NULL,
    graduates_domestic INTEGER DEFAULT 0,
    graduates_international INTEGER DEFAULT 0,
    success_rate TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sponsors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    bonus_coins INTEGER DEFAULT 0,
    reputation_required INTEGER DEFAULT 0,
    perk_item_id TEXT,
    perk_item_name TEXT,
    perk_item_type TEXT,
    perk_item_bonuses_json TEXT
  );

  CREATE TABLE IF NOT EXISTS player_franchise (
    player_id TEXT PRIMARY KEY,
    league_id TEXT,
    team_id TEXT,
    status TEXT DEFAULT 'none', -- 'none', 'registered', 'auction', 'active', 'completed'
    contract_value INTEGER DEFAULT 0,
    contract_role TEXT DEFAULT 'Emerging Player',
    current_round INTEGER DEFAULT 0,
    cooldown_until INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    balls INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    dismissals INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    overs_bowled REAL DEFAULT 0.0,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS franchise_standings (
    player_id TEXT,
    league_id TEXT,
    team_id TEXT,
    played INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    nrr REAL DEFAULT 0.0,
    PRIMARY KEY(player_id, league_id, team_id),
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    team_id TEXT NOT NULL,
    league_id TEXT NOT NULL,
    skill_level INTEGER DEFAULT 50,
    runs INTEGER DEFAULT 0,
    balls INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    overs_bowled REAL DEFAULT 0.0,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS player_tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    tournament_id TEXT NOT NULL,
    won INTEGER DEFAULT 0,
    times_played INTEGER DEFAULT 0,
    high_score INTEGER DEFAULT 0,
    unlocked INTEGER DEFAULT 0,
    UNIQUE(player_id, tournament_id),
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS active_tournament_run (
    player_id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    user_team TEXT NOT NULL,
    current_round INTEGER DEFAULT 1,
    opponent_team TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    bracket_json TEXT,
    stats_json TEXT,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS player_settings (
    player_id TEXT PRIMARY KEY,
    display_mode TEXT DEFAULT 'graphic',
    field_radar INTEGER DEFAULT 1,
    dm_match INTEGER DEFAULT 1,
    commentary_level TEXT DEFAULT 'detailed',
    mention_ping INTEGER DEFAULT 1
  );
`);

// Seed default academies if table is empty
const acadCount = db.prepare('SELECT COUNT(*) as cnt FROM config').get().cnt; // Wait, let's query academies count safely
try {
  const acadExists = db.prepare('SELECT COUNT(*) as cnt FROM academies').get().cnt;
  if (acadExists === 0) {
    const defaultAcademies = [
      {
        id: 'elite',
        name: '🥇 Elite Cricket Academy',
        rating: 5,
        reputation: 'World Class',
        history: 'The training ground of dozens of international legends. Known for its state-of-the-art synthetic pitches and high-performance labs.',
        specialty: 'High-Tech Batting & Athleticism',
        coach_rating: 'Elite (Coach Arthur)',
        training_bonus_text: '+8% Batting XP, +5% Fitness XP',
        bonuses_json: JSON.stringify({ batting: 1.08, fitness: 1.05, bowling: 1.00 }),
        graduates_domestic: 41,
        graduates_international: 17,
        success_rate: '72%'
      },
      {
        id: 'national',
        name: '🏏 National High Performance Centre',
        rating: 4,
        reputation: 'National Standard',
        history: 'Directly funded by the national board. Focuses on core disciplines and building solid foundations for future state cricketers.',
        specialty: 'Balanced Fundamentals & Stamina',
        coach_rating: 'Excellent (Coach Shastri)',
        training_bonus_text: '+5% Batting XP, +5% Bowling XP, +3% Stamina XP',
        bonuses_json: JSON.stringify({ batting: 1.05, bowling: 1.05, stamina: 1.03 }),
        graduates_domestic: 29,
        graduates_international: 9,
        success_rate: '64%'
      },
      {
        id: 'spin_academy',
        name: '🌀 Dustbowl Spin Academy',
        rating: 3,
        reputation: 'Regional Speciality',
        history: 'Located in the subcontinental heartland, this academy features dry, turning wickets. Ideal for masters of spin and playing spin.',
        specialty: 'Spin Mastery & Footwork',
        coach_rating: 'Specialist (Coach Murali)',
        training_bonus_text: '+10% Spin Batting & Bowling XP',
        bonuses_json: JSON.stringify({ spin_batting: 1.10, spin_bowling: 1.10, fitness: 1.00 }),
        graduates_domestic: 19,
        graduates_international: 5,
        success_rate: '55%'
      },
      {
        id: 'pace_foundry',
        name: '⚡ Lightning Pace Foundry',
        rating: 4,
        reputation: 'Highly Renowned',
        history: 'Nestled in bouncy, green pastures, this foundry features raw clay pitches that help bowlers produce searing pace and bounce.',
        specialty: 'Fast Bowling & Aggression',
        coach_rating: 'Veteran (Coach Donald)',
        training_bonus_text: '+8% Pace Bowling XP, +5% Power XP',
        bonuses_json: JSON.stringify({ pace_bowling: 1.08, power: 1.05 }),
        graduates_domestic: 33,
        graduates_international: 11,
        success_rate: '68%'
      }
    ];
    const insertAcad = db.prepare(`
      INSERT INTO academies (id, name, rating, reputation, history, specialty, coach_rating, training_bonus_text, bonuses_json, graduates_domestic, graduates_international, success_rate)
      VALUES (@id, @name, @rating, @reputation, @history, @specialty, @coach_rating, @training_bonus_text, @bonuses_json, @graduates_domestic, @graduates_international, @success_rate)
    `);
    for (const acad of defaultAcademies) {
      insertAcad.run(acad);
    }
  }
} catch (e) {
  console.error('Error seeding academies:', e);
}

// Seed default sponsors if table is empty
try {
  const sponsorExists = db.prepare('SELECT COUNT(*) as cnt FROM sponsors').get().cnt;
  if (sponsorExists === 0) {
    const defaultSponsors = [
      {
        id: 'grip_co',
        name: 'Sponsor Rubber Grip Co.',
        description: 'Endorse their grip rubber for a technique boost.',
        bonus_coins: 250,
        reputation_required: 0,
        perk_item_id: 'sponsor_grip',
        perk_item_name: 'Sponsor Rubber Grip',
        perk_item_type: 'Grip',
        perk_item_bonuses_json: JSON.stringify({ technique: 3 })
      },
      {
        id: 'wood_works',
        name: 'WoodWorks Willow Ltd',
        description: 'Endorse their high quality willow bats.',
        bonus_coins: 500,
        reputation_required: 50,
        perk_item_id: 'woodworks_bat',
        perk_item_name: 'WoodWorks Grade 1 Bat',
        perk_item_type: 'Bat',
        perk_item_bonuses_json: JSON.stringify({ power: 4, timing: 4 })
      },
      {
        id: 'aero_shoes',
        name: 'Aero Running Gear',
        description: 'Promote their aerodynamic cricket spikes.',
        bonus_coins: 800,
        reputation_required: 150,
        perk_item_id: 'aero_shoes',
        perk_item_name: 'Aero Speed Spikes',
        perk_item_type: 'Shoes',
        perk_item_bonuses_json: JSON.stringify({ running: 5, fitness: 3 })
      },
      {
        id: 'apex_gloves',
        name: 'Apex Protective Equip',
        description: 'Endorse their professional batting gloves.',
        bonus_coins: 1200,
        reputation_required: 300,
        perk_item_id: 'apex_gloves',
        perk_item_name: 'Apex Carbon Gloves',
        perk_item_type: 'Gloves',
        perk_item_bonuses_json: JSON.stringify({ technique: 4, power: 2, reflex: 3 })
      }
    ];
    const insertSponsor = db.prepare(`
      INSERT INTO sponsors (id, name, description, bonus_coins, reputation_required, perk_item_id, perk_item_name, perk_item_type, perk_item_bonuses_json)
      VALUES (@id, @name, @description, @bonus_coins, @reputation_required, @perk_item_id, @perk_item_name, @perk_item_type, @perk_item_bonuses_json)
    `);
    for (const sp of defaultSponsors) {
      insertSponsor.run(sp);
    }
  }
} catch (e) {
  console.error('Error seeding sponsors:', e);
}

// Seed default emojis using INSERT OR IGNORE to add any missing default values
const defaults = {
  emoji_coin: '<:ascendcoins:1546110493381361745>',
  emoji_sp: '🌟',
  emoji_token: '<:ascendtickets:1546110558007197787>',
  emoji_energy: '⚡',
  emoji_confidence: '🔥',
  emoji_form: '📈',
  emoji_reputation: '🎖️',
  emoji_xp: '🏆',
  emoji_trophy: '🏆',
  emoji_bat: '🏏',
  emoji_gloves: '🧤',
  emoji_shoes: '👟',
  emoji_pads: '🛡️',
  emoji_grip: '🎗️',
  emoji_wicket: '🚨',
  emoji_match: '🏟️'
};
const insertStmt = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(defaults)) {
  insertStmt.run(k, v);
}

// Run migration to add sponsor column if it does not exist
try {
  db.exec("ALTER TABLE players ADD COLUMN sponsor TEXT DEFAULT 'None'");
} catch (e) {
  // Ignore error if column already exists
}

// Run migration to add last_challenge_timestamp column if it does not exist
try {
  db.exec("ALTER TABLE players ADD COLUMN last_challenge_timestamp INTEGER DEFAULT 0");
} catch (e) {
  // Ignore error if column already exists
}

// Run migration to add batting_order column to players table
try {
  db.exec("ALTER TABLE players ADD COLUMN batting_order TEXT DEFAULT NULL");
} catch (e) {
  // Ignore error if column already exists
}

// Run migration to add batting_order column to player_settings table
try {
  db.exec("ALTER TABLE player_settings ADD COLUMN batting_order TEXT DEFAULT 'auto'");
} catch (e) {
  // Ignore error if column already exists
}

// Run migration to add dismissals and matches_played to player_franchise table
try {
  db.exec("ALTER TABLE player_franchise ADD COLUMN dismissals INTEGER DEFAULT 0");
} catch (e) {
  // Ignore error if column already exists
}

try {
  db.exec("ALTER TABLE player_franchise ADD COLUMN matches_played INTEGER DEFAULT 0");
} catch (e) {
  // Ignore error if column already exists
}

// Create challenge_stats table
db.exec(`
  CREATE TABLE IF NOT EXISTS challenge_stats (
    player_id TEXT PRIMARY KEY,
    played INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );
`);

// Populate challenge_stats for any existing players
try {
  db.exec("INSERT OR IGNORE INTO challenge_stats (player_id) SELECT discord_id FROM players");
} catch (e) {
  console.error("Error populating challenge_stats:", e);
}

// Create custom_items table
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rarity TEXT NOT NULL,
    cost INTEGER NOT NULL,
    bonuses_json TEXT NOT NULL
  );
`);

// Create player_shot_presets table
db.exec(`
  CREATE TABLE IF NOT EXISTS player_shot_presets (
    player_id TEXT NOT NULL,
    combo_key TEXT NOT NULL,
    shot_id TEXT NOT NULL,
    PRIMARY KEY (player_id, combo_key),
    FOREIGN KEY(player_id) REFERENCES players(discord_id) ON DELETE CASCADE
  );
`);

// Add franchise_titles migration if missing from existing database
try {
  db.exec("ALTER TABLE players ADD COLUMN franchise_titles INTEGER DEFAULT 0;");
} catch (e) {
  // Column already exists
}

// Web Authentication, System Audit Logs, and Web PvP Challenges
db.exec(`
  CREATE TABLE IF NOT EXISTS web_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    player_id TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL DEFAULT 'INFO',
    category TEXT NOT NULL,
    actor TEXT NOT NULL,
    target TEXT,
    title TEXT NOT NULL,
    details TEXT,
    ip TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_admin_logs_ts ON admin_logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_admin_logs_cat ON admin_logs(category, level);

  CREATE TABLE IF NOT EXISTS web_challenges (
    id TEXT PRIMARY KEY,
    challenger_id TEXT NOT NULL,
    opponent_id TEXT NOT NULL,
    target_runs INTEGER DEFAULT 15,
    status TEXT DEFAULT 'pending',
    state_json TEXT,
    winner_id TEXT,
    expires_at INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE web_challenges ADD COLUMN expires_at INTEGER DEFAULT 0");
} catch (e) {
  // Ignore if column already exists
}
try {
  db.exec("UPDATE web_challenges SET status = 'expired', updated_at = datetime('now') WHERE status IN ('pending', 'active') AND (expires_at = 0 OR expires_at IS NULL) AND updated_at < datetime('now', '-30 minutes')");
} catch (e) {
  // Ignore startup sweep errors
}

// Unique human-readable Player ID (e.g., CA-1001) + custom avatar_url migration + backfill
try {
  db.exec("ALTER TABLE players ADD COLUMN public_id TEXT");
} catch (e) {
  // Ignore if column already exists
}
try {
  db.exec("ALTER TABLE players ADD COLUMN avatar_url TEXT DEFAULT NULL");
} catch (e) {
  // Ignore if column already exists
}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_players_public_id ON players(public_id)");
} catch (e) {
  // Ignore if index creation conflicts temporarily
}

export function generateUniquePublicId(database = db) {
  const rows = database.prepare("SELECT public_id FROM players WHERE public_id IS NOT NULL AND public_id != ''").all();
  let maxNum = 1000;
  const used = new Set();
  for (const r of rows) {
    const up = String(r.public_id).toUpperCase();
    used.add(up);
    const m = up.match(/^CA-(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  let candidate = `CA-${maxNum + 1}`;
  while (used.has(candidate)) {
    maxNum++;
    candidate = `CA-${maxNum + 1}`;
  }
  return candidate;
}

// Backfill any existing players missing a unique public_id
try {
  const missing = db.prepare("SELECT discord_id FROM players WHERE public_id IS NULL OR public_id = '' ORDER BY rowid ASC").all();
  if (missing.length > 0) {
    const upd = db.prepare("UPDATE players SET public_id = ? WHERE discord_id = ?");
    for (const row of missing) {
      upd.run(generateUniquePublicId(db), row.discord_id);
    }
  }
} catch (e) {
  console.error('Error backfilling public_id:', e);
}

export function resolvePlayerByIdentifier(database, identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  const cleanedTag = raw.replace(/^#/, '').toUpperCase();
  return database.prepare(
    "SELECT * FROM players WHERE discord_id = ? OR UPPER(public_id) = ?"
  ).get(raw, cleanedTag) || null;
}

function editDistance(a, b) {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[la][lb];
}

export function searchPlayersDirectory(database, queryStr = '', limit = 30) {
  const q = String(queryStr || '').trim();
  const rows = database.prepare(`
    SELECT p.discord_id, p.public_id, p.name, p.level, p.primary_role, p.nationality,
           p.reputation, p.current_chapter, p.batting_hand, p.bowling_style, p.avatar_url,
           COALESCE(s.matches, 0) as matches, COALESCE(s.runs, 0) as runs, COALESCE(s.wickets, 0) as wickets
    FROM players p
    LEFT JOIN stats s ON s.player_id = p.discord_id
    ORDER BY p.level DESC, p.reputation DESC
  `).all();

  if (!q) return rows.slice(0, limit).map(r => ({ ...r, matchScore: 100 }));

  const qLower = q.toLowerCase();
  const qTag = q.replace(/^#/, '').toUpperCase();
  const qTokens = qLower.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const r of rows) {
    const nameLower = String(r.name || '').toLowerCase();
    const pid = String(r.public_id || '').toUpperCase();
    const did = String(r.discord_id || '').toLowerCase();
    let score = 0;

    if (pid === qTag || did === qLower) score = 200;
    else if (pid.includes(qTag) && qTag.length >= 2) score = 160;
    else if (nameLower === qLower) score = 180;
    else if (nameLower.startsWith(qLower)) score = 150;
    else if (nameLower.includes(qLower)) score = 125;
    else {
      // Token + fuzzy similarity match for similar names
      const words = nameLower.split(/\s+/).filter(Boolean);
      let bestSim = 0;
      const distWhole = editDistance(qLower, nameLower.slice(0, Math.max(qLower.length + 2, nameLower.length)));
      const maxLenWhole = Math.max(qLower.length, nameLower.length, 1);
      bestSim = Math.max(bestSim, 1 - distWhole / maxLenWhole);

      for (const tok of qTokens) {
        if (nameLower.includes(tok)) bestSim = Math.max(bestSim, 0.8);
        for (const w of words) {
          const d = editDistance(tok, w);
          const sim = 1 - d / Math.max(tok.length, w.length, 1);
          if (sim > bestSim) bestSim = sim;
        }
      }
      if (bestSim >= 0.42) score = Math.round(bestSim * 100);
    }

    if (score > 0) {
      scored.push({ ...r, matchScore: score });
    }
  }

  scored.sort((a, b) => b.matchScore - a.matchScore || b.level - a.level || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}

export default db;
