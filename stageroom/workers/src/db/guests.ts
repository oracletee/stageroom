import { Env, Guest } from './schema';

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function registerGuest(db: D1Database, data: {
  event_id: string;
  name: string;
  email: string;
}): Promise<Guest> {
  const id = crypto.randomUUID();
  const access_code = generateAccessCode();

  await db.prepare(
    `INSERT INTO guests (id, event_id, name, email, access_code)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, data.event_id, data.name, data.email, access_code).run();

  return await getGuest(db, id)!;
}

export async function getGuest(db: D1Database, id: string): Promise<Guest | null> {
  const result = await db.prepare('SELECT * FROM guests WHERE id = ?').bind(id).first();
  return result as Guest | null;
}

export async function getGuestByAccessCode(db: D1Database, access_code: string): Promise<Guest | null> {
  const result = await db.prepare('SELECT * FROM guests WHERE access_code = ?').bind(access_code).first();
  return result as Guest | null;
}

export async function getGuestByEmail(db: D1Database, event_id: string, email: string): Promise<Guest | null> {
  const result = await db.prepare('SELECT * FROM guests WHERE event_id = ? AND email = ?').bind(event_id, email).first();
  return result as Guest | null;
}

export async function listEventGuests(db: D1Database, event_id: string): Promise<Guest[]> {
  const result = await db.prepare('SELECT * FROM guests WHERE event_id = ? ORDER BY created_at DESC').bind(event_id).all();
  return result.results as Guest[];
}

export async function markGuestJoined(db: D1Database, id: string): Promise<Guest | null> {
  await db.prepare('UPDATE guests SET joined_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
  return await getGuest(db, id);
}

export async function countEventGuests(db: D1Database, event_id: string): Promise<number> {
  const result = await db.prepare('SELECT COUNT(*) as count FROM guests WHERE event_id = ?').bind(event_id).first();
  return (result as any)?.count || 0;
}
