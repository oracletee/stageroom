import { UserSettings } from './schema';

export async function getUserSettings(db: D1Database, user_id: string): Promise<UserSettings | null> {
  const result = await db.prepare('SELECT * FROM user_settings WHERE user_id = ?').bind(user_id).first();
  return result as UserSettings | null;
}

export async function upsertUserSettings(db: D1Database, user_id: string, data: {
  paystack_secret_key?: string;
  paystack_public_key?: string;
  stripe_secret_key?: string;
  stripe_publishable_key?: string;
}): Promise<UserSettings> {
  const existing = await getUserSettings(db, user_id);

  if (existing) {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.paystack_secret_key !== undefined) { fields.push('paystack_secret_key = ?'); params.push(data.paystack_secret_key); }
    if (data.paystack_public_key !== undefined) { fields.push('paystack_public_key = ?'); params.push(data.paystack_public_key); }
    if (data.stripe_secret_key !== undefined) { fields.push('stripe_secret_key = ?'); params.push(data.stripe_secret_key); }
    if (data.stripe_publishable_key !== undefined) { fields.push('stripe_publishable_key = ?'); params.push(data.stripe_publishable_key); }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(user_id);

    await db.prepare(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`).bind(...params).run();
    return await getUserSettings(db, user_id)!;
  }

  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO user_settings (id, user_id, paystack_secret_key, paystack_public_key, stripe_secret_key, stripe_publishable_key) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    id, user_id,
    data.paystack_secret_key || null,
    data.paystack_public_key || null,
    data.stripe_secret_key || null,
    data.stripe_publishable_key || null
  ).run();

  return await getUserSettings(db, user_id)!;
}
