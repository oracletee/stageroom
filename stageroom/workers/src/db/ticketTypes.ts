import { TicketType } from './schema';

export async function createTicketType(db: D1Database, data: {
  event_id: string;
  name: string;
  type?: string;
  price?: number;
  currency?: string;
  max_quantity?: number;
}): Promise<TicketType> {
  const id = crypto.randomUUID();

  await db.prepare(
    'INSERT INTO ticket_types (id, event_id, name, type, price, currency, max_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, data.event_id, data.name,
    data.type || 'free', data.price || 0,
    data.currency || 'USD', data.max_quantity || null
  ).run();

  return await getTicketType(db, id)!;
}

export async function getTicketType(db: D1Database, id: string): Promise<TicketType | null> {
  const result = await db.prepare('SELECT * FROM ticket_types WHERE id = ?').bind(id).first();
  return result as TicketType | null;
}

export async function listEventTicketTypes(db: D1Database, event_id: string): Promise<TicketType[]> {
  const result = await db.prepare('SELECT * FROM ticket_types WHERE event_id = ? ORDER BY created_at ASC').bind(event_id).all();
  return result.results as TicketType[];
}

export async function updateTicketType(db: D1Database, id: string, data: Partial<TicketType>): Promise<TicketType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.type !== undefined) { fields.push('type = ?'); params.push(data.type); }
  if (data.price !== undefined) { fields.push('price = ?'); params.push(data.price); }
  if (data.currency !== undefined) { fields.push('currency = ?'); params.push(data.currency); }
  if (data.max_quantity !== undefined) { fields.push('max_quantity = ?'); params.push(data.max_quantity); }
  if (data.sold_count !== undefined) { fields.push('sold_count = ?'); params.push(data.sold_count); }

  if (fields.length === 0) return await getTicketType(db, id);

  params.push(id);

  await db.prepare(`UPDATE ticket_types SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
  return await getTicketType(db, id);
}

export async function deleteTicketType(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM ticket_types WHERE id = ?').bind(id).run();
  return result.meta?.changes > 0;
}

export async function deleteEventTicketTypes(db: D1Database, event_id: string): Promise<boolean> {
  await db.prepare('DELETE FROM ticket_types WHERE event_id = ?').bind(event_id).run();
  return true;
}
