import { Env, Ticket } from './schema';

export async function createTicket(db: D1Database, data: {
  event_id: string;
  user_id?: string;
  guest_email?: string;
  guest_name?: string;
  payment_id?: string;
}): Promise<Ticket> {
  const id = crypto.randomUUID();

  const result = await db.prepare(
    `INSERT INTO tickets (id, event_id, user_id, guest_email, guest_name, payment_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.event_id, data.user_id || null,
    data.guest_email || null, data.guest_name || null,
    data.payment_id || null, 'pending'
  ).run();

  return await getTicket(db, id)!;
}

export async function getTicket(db: D1Database, id: string): Promise<Ticket | null> {
  const result = await db.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first();
  return result as Ticket | null;
}

export async function listEventTickets(db: D1Database, event_id: string): Promise<Ticket[]> {
  const result = await db.prepare('SELECT * FROM tickets WHERE event_id = ? ORDER BY created_at DESC').bind(event_id).all();
  return result.results as Ticket[];
}

export async function confirmTicket(db: D1Database, id: string): Promise<Ticket | null> {
  await db.prepare('UPDATE tickets SET status = ? WHERE id = ?').bind('confirmed', id).run();
  return await getTicket(db, id);
}

export async function cancelTicket(db: D1Database, id: string): Promise<Ticket | null> {
  await db.prepare('UPDATE tickets SET status = ? WHERE id = ?').bind('cancelled', id).run();
  return await getTicket(db, id);
}

export async function countEventTickets(db: D1Database, event_id: string, status?: string): Promise<number> {
  let query = 'SELECT COUNT(*) as count FROM tickets WHERE event_id = ?';
  const params: any[] = [event_id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  const result = await db.prepare(query).bind(...params).first();
  return (result as any)?.count || 0;
}
