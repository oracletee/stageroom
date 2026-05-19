export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'organizer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  status TEXT DEFAULT 'draft',
  ticket_type TEXT DEFAULT 'free',
  ticket_price INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  max_tickets INTEGER,
  qr_code_url TEXT,
  livekit_room TEXT,
  stream_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT,
  guest_email TEXT,
  guest_name TEXT,
  status TEXT DEFAULT 'pending',
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tier TEXT NOT NULL,
  stripe_subscription_id TEXT,
  paystack_subscription_id TEXT,
  status TEXT DEFAULT 'active',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  guest_email TEXT,
  guest_name TEXT,
  amount INTEGER NOT NULL,
  type TEXT DEFAULT 'general',
  currency TEXT DEFAULT 'USD',
  payment_id TEXT NOT NULL,
  payment_provider TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donation_configs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  enabled INTEGER DEFAULT 0,
  tithe_enabled INTEGER DEFAULT 0,
  offering_enabled INTEGER DEFAULT 0,
  preset_amounts TEXT,
  custom_amount_enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  access_code TEXT UNIQUE,
  joined_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  type TEXT NOT NULL,
  event_id TEXT,
  guest_id TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  code TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  scan_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export async function runMigrations(db: D1Database): Promise<boolean> {
  try {
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
    if (tables.results && tables.results.length > 0) {
      return true;
    }

    const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await db.prepare(stmt.trim()).run();
      }
    }
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
