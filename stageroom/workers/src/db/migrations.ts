export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'organizer',
  password_hash TEXT,
  password_salt TEXT,
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
  category TEXT,
  poster_url TEXT,
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

CREATE TABLE IF NOT EXISTS donation_types (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  preset_amounts TEXT,
  custom_amount_enabled INTEGER DEFAULT 1,
  currency TEXT DEFAULT 'USD',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'free',
  price INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  max_quantity INTEGER,
  sold_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  paystack_secret_key TEXT,
  paystack_public_key TEXT,
  stripe_secret_key TEXT,
  stripe_publishable_key TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  source_ids TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scene_id TEXT REFERENCES scenes(id),
  type TEXT NOT NULL,
  label TEXT,
  config TEXT,
  live_input_uid TEXT,
  playback_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_studio_config (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  selected_scene_id TEXT,
  program_scene_id TEXT,
  stage_mode TEXT DEFAULT 'ted-talk',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stream_destinations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  rtmp_url TEXT,
  stream_key TEXT,
  is_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stream_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  live_input_uid TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  platform TEXT,
  platform_broadcast_id TEXT
);

CREATE TABLE IF NOT EXISTS scheduled_streams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  platform_config TEXT,
  scheduled_time DATETIME NOT NULL,
  duration INTEGER,
  status TEXT DEFAULT 'scheduled',
  live_input_uid TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export async function runMigrations(db: D1Database): Promise<boolean> {
  try {
    const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await db.prepare(stmt.trim()).run();
      }
    }

    const { results: hasSceneId } = await db.prepare("PRAGMA table_info(sources)").all();
    const hasSceneIdCol = (hasSceneId as any[])?.some((col: any) => col.name === 'scene_id');
    if (!hasSceneIdCol) {
      await db.prepare("ALTER TABLE sources ADD COLUMN scene_id TEXT REFERENCES scenes(id)").run();
    }

    const { results: hasPlaybackUrl } = await db.prepare("PRAGMA table_info(sources)").all();
    const hasPlaybackUrlCol = (hasPlaybackUrl as any[])?.some((col: any) => col.name === 'playback_url');
    if (!hasPlaybackUrlCol) {
      await db.prepare("ALTER TABLE sources ADD COLUMN playback_url TEXT").run();
    }

    const { results: hasIsActive } = await db.prepare("PRAGMA table_info(sources)").all();
    const hasIsActiveCol = (hasIsActive as any[])?.some((col: any) => col.name === 'is_active');
    if (!hasIsActiveCol) {
      await db.prepare("ALTER TABLE sources ADD COLUMN is_active INTEGER DEFAULT 1").run();
    }

    const { results: hasEventId } = await db.prepare("PRAGMA table_info(scheduled_streams)").all();
    const hasEventIdCol = (hasEventId as any[])?.some((col: any) => col.name === 'event_id');
    if (!hasEventIdCol) {
      await db.prepare("ALTER TABLE scheduled_streams ADD COLUMN event_id TEXT REFERENCES events(id)").run();
    }

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
