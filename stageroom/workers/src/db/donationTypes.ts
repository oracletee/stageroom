import { DonationType } from './schema';

export async function createDonationType(db: D1Database, data: {
  event_id: string;
  name: string;
  preset_amounts?: number[];
  custom_amount_enabled?: boolean;
  currency?: string;
}): Promise<DonationType> {
  const id = crypto.randomUUID();

  await db.prepare(
    'INSERT INTO donation_types (id, event_id, name, preset_amounts, custom_amount_enabled, currency) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    id, data.event_id, data.name,
    data.preset_amounts ? JSON.stringify(data.preset_amounts) : null,
    data.custom_amount_enabled !== undefined ? (data.custom_amount_enabled ? 1 : 0) : 1,
    data.currency || 'USD'
  ).run();

  return await getDonationType(db, id)!;
}

export async function getDonationType(db: D1Database, id: string): Promise<DonationType | null> {
  const result = await db.prepare('SELECT * FROM donation_types WHERE id = ?').bind(id).first();
  return result as DonationType | null;
}

export async function listEventDonationTypes(db: D1Database, event_id: string): Promise<DonationType[]> {
  const result = await db.prepare('SELECT * FROM donation_types WHERE event_id = ? ORDER BY created_at ASC').bind(event_id).all();
  return result.results as DonationType[];
}

export async function updateDonationType(db: D1Database, id: string, data: Partial<DonationType>): Promise<DonationType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.preset_amounts !== undefined) { fields.push('preset_amounts = ?'); params.push(data.preset_amounts); }
  if (data.custom_amount_enabled !== undefined) { fields.push('custom_amount_enabled = ?'); params.push(data.custom_amount_enabled); }

  if (fields.length === 0) return await getDonationType(db, id);

  params.push(id);

  await db.prepare(`UPDATE donation_types SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
  return await getDonationType(db, id);
}

export async function deleteDonationType(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM donation_types WHERE id = ?').bind(id).run();
  return result.meta?.changes > 0;
}

export async function deleteEventDonationTypes(db: D1Database, event_id: string): Promise<boolean> {
  await db.prepare('DELETE FROM donation_types WHERE event_id = ?').bind(event_id).run();
  return true;
}
