import { Env, Donation } from './schema';

export async function createDonation(db: D1Database, data: {
  event_id: string;
  guest_email?: string;
  guest_name?: string;
  amount: number;
  type?: string;
  currency?: string;
  payment_id: string;
  payment_provider: string;
}): Promise<Donation> {
  const id = crypto.randomUUID();

  await db.prepare(
    `INSERT INTO donations (id, event_id, guest_email, guest_name, amount, type, currency, payment_id, payment_provider)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.event_id, data.guest_email || null, data.guest_name || null,
    data.amount, data.type || 'general', data.currency || 'USD',
    data.payment_id, data.payment_provider
  ).run();

  return await getDonation(db, id)!;
}

export async function getDonation(db: D1Database, id: string): Promise<Donation | null> {
  const result = await db.prepare('SELECT * FROM donations WHERE id = ?').bind(id).first();
  return result as Donation | null;
}

export async function listEventDonations(db: D1Database, event_id: string, type?: string): Promise<Donation[]> {
  let query = 'SELECT * FROM donations WHERE event_id = ?';
  const params: any[] = [event_id];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results as Donation[];
}

export async function sumEventDonations(db: D1Database, event_id: string, type?: string): Promise<number> {
  let query = 'SELECT SUM(amount) as total FROM donations WHERE event_id = ?';
  const params: any[] = [event_id];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  const result = await db.prepare(query).bind(...params).first();
  return (result as any)?.total || 0;
}

export async function getDonationStats(db: D1Database, event_id: string): Promise<{
  total: number;
  count: number;
  by_type: { type: string; total: number; count: number }[];
}> {
  const totalResult = await db.prepare(
    'SELECT SUM(amount) as total, COUNT(*) as count FROM donations WHERE event_id = ?'
  ).bind(event_id).first() as any;

  const byTypeResult = await db.prepare(
    'SELECT type, SUM(amount) as total, COUNT(*) as count FROM donations WHERE event_id = ? GROUP BY type'
  ).bind(event_id).all();

  return {
    total: totalResult?.total || 0,
    count: totalResult?.count || 0,
    by_type: byTypeResult.results as any[]
  };
}
