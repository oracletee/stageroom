import { Env, Payment } from './schema';

export async function createPayment(db: D1Database, data: {
  provider: string;
  provider_payment_id: string;
  amount: number;
  currency?: string;
  status?: string;
  type: string;
  event_id?: string;
  guest_id?: string;
  metadata?: string;
}): Promise<Payment> {
  const id = crypto.randomUUID();

  await db.prepare(
    `INSERT INTO payments (id, provider, provider_payment_id, amount, currency, status, type, event_id, guest_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.provider, data.provider_payment_id, data.amount,
    data.currency || 'USD', data.status || 'pending', data.type,
    data.event_id || null, data.guest_id || null, data.metadata || null
  ).run();

  return await getPayment(db, id)!;
}

export async function getPayment(db: D1Database, id: string): Promise<Payment | null> {
  const result = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
  return result as Payment | null;
}

export async function getPaymentByProviderId(db: D1Database, provider: string, provider_payment_id: string): Promise<Payment | null> {
  const result = await db.prepare('SELECT * FROM payments WHERE provider = ? AND provider_payment_id = ?').bind(provider, provider_payment_id).first();
  return result as Payment | null;
}

export async function updatePaymentStatus(db: D1Database, id: string, status: string): Promise<Payment | null> {
  await db.prepare('UPDATE payments SET status = ? WHERE id = ?').bind(status, id).run();
  return await getPayment(db, id);
}

export async function listEventPayments(db: D1Database, event_id: string, type?: string): Promise<Payment[]> {
  let query = 'SELECT * FROM payments WHERE event_id = ?';
  const params: any[] = [event_id];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results as Payment[];
}

export async function sumEventRevenue(db: D1Database, event_id: string): Promise<{
  ticket_revenue: number;
  donation_revenue: number;
  total: number;
}> {
  const ticketResult = await db.prepare(
    'SELECT SUM(amount) as total FROM payments WHERE event_id = ? AND type = ? AND status = ?'
  ).bind(event_id, 'ticket', 'completed').first() as any;

  const donationResult = await db.prepare(
    'SELECT SUM(amount) as total FROM payments WHERE event_id = ? AND type = ? AND status = ?'
  ).bind(event_id, 'donation', 'completed').first() as any;

  return {
    ticket_revenue: ticketResult?.total || 0,
    donation_revenue: donationResult?.total || 0,
    total: (ticketResult?.total || 0) + (donationResult?.total || 0)
  };
}
