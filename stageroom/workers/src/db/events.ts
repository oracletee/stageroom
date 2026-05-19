import { Env, Event, DonationConfig } from './schema';

export async function createEvent(db: D1Database, data: {
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  ticket_type?: string;
  ticket_price?: number;
  currency?: string;
  max_tickets?: number;
  livekit_room?: string;
  stream_url?: string;
  category?: string;
  poster_url?: string;
}): Promise<Event> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db.prepare(
    `INSERT INTO events (id, user_id, title, description, start_time, end_time, ticket_type, ticket_price, currency, max_tickets, livekit_room, stream_url, category, poster_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.user_id, data.title, data.description || null,
    data.start_time, data.end_time || null,
    data.ticket_type || 'free', data.ticket_price || 0,
    data.currency || 'USD', data.max_tickets || null,
    data.livekit_room || null, data.stream_url || null,
    data.category || null, data.poster_url || null,
    now, now
  ).run();

  return await getEvent(db, id)!;
}

export async function getEvent(db: D1Database, id: string): Promise<Event | null> {
  const result = await db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
  return result as Event | null;
}

export async function listEvents(db: D1Database, user_id: string, status?: string): Promise<Event[]> {
  let query = 'SELECT * FROM events WHERE user_id = ?';
  const params: any[] = [user_id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY start_time DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results as Event[];
}

export async function updateEvent(db: D1Database, id: string, data: Partial<Event>): Promise<Event | null> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
  if (data.start_time !== undefined) { fields.push('start_time = ?'); params.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push('end_time = ?'); params.push(data.end_time); }
  if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
  if (data.ticket_type !== undefined) { fields.push('ticket_type = ?'); params.push(data.ticket_type); }
  if (data.ticket_price !== undefined) { fields.push('ticket_price = ?'); params.push(data.ticket_price); }
  if (data.currency !== undefined) { fields.push('currency = ?'); params.push(data.currency); }
  if (data.max_tickets !== undefined) { fields.push('max_tickets = ?'); params.push(data.max_tickets); }
  if (data.qr_code_url !== undefined) { fields.push('qr_code_url = ?'); params.push(data.qr_code_url); }
  if (data.livekit_room !== undefined) { fields.push('livekit_room = ?'); params.push(data.livekit_room); }
  if (data.stream_url !== undefined) { fields.push('stream_url = ?'); params.push(data.stream_url); }
  if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
  if (data.poster_url !== undefined) { fields.push('poster_url = ?'); params.push(data.poster_url); }

  if (fields.length === 0) return await getEvent(db, id);

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
  return await getEvent(db, id);
}

export async function deleteEvent(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  return result.meta?.changes > 0;
}

export async function getDonationConfig(db: D1Database, event_id: string): Promise<DonationConfig | null> {
  const result = await db.prepare('SELECT * FROM donation_configs WHERE event_id = ?').bind(event_id).first();
  return result as DonationConfig | null;
}

export async function createDonationConfig(db: D1Database, event_id: string, config: {
  enabled?: boolean;
  tithe_enabled?: boolean;
  offering_enabled?: boolean;
  preset_amounts?: number[];
  custom_amount_enabled?: boolean;
}): Promise<DonationConfig> {
  const id = crypto.randomUUID();

  const result = await db.prepare(
    `INSERT INTO donation_configs (id, event_id, enabled, tithe_enabled, offering_enabled, preset_amounts, custom_amount_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, event_id,
    config.enabled ? 1 : 0,
    config.tithe_enabled ? 1 : 0,
    config.offering_enabled ? 1 : 0,
    config.preset_amounts ? JSON.stringify(config.preset_amounts) : null,
    config.custom_amount_enabled !== undefined ? (config.custom_amount_enabled ? 1 : 0) : 1
  ).run();

  return await getDonationConfig(db, event_id)!;
}

export async function updateDonationConfig(db: D1Database, event_id: string, config: Partial<DonationConfig>): Promise<DonationConfig | null> {
  const existing = await getDonationConfig(db, event_id);
  if (!existing) {
    return await createDonationConfig(db, event_id, config as any);
  }

  const fields: string[] = [];
  const params: any[] = [];

  if (config.enabled !== undefined) { fields.push('enabled = ?'); params.push(config.enabled); }
  if (config.tithe_enabled !== undefined) { fields.push('tithe_enabled = ?'); params.push(config.tithe_enabled); }
  if (config.offering_enabled !== undefined) { fields.push('offering_enabled = ?'); params.push(config.offering_enabled); }
  if (config.preset_amounts !== undefined) { fields.push('preset_amounts = ?'); params.push(config.preset_amounts); }
  if (config.custom_amount_enabled !== undefined) { fields.push('custom_amount_enabled = ?'); params.push(config.custom_amount_enabled); }

  if (fields.length === 0) return existing;

  params.push(event_id);

  await db.prepare(`UPDATE donation_configs SET ${fields.join(', ')} WHERE event_id = ?`).bind(...params).run();
  return await getDonationConfig(db, event_id);
}
