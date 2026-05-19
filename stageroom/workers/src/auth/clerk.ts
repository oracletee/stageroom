import { Env, User } from './schema';

export async function verifyClerkToken(env: Env, token: string): Promise<{ userId: string; email: string; name?: string } | null> {
  try {
    const response = await fetch(`https://api.clerk.com/v1/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      userId: data.id,
      email: data.email_addresses?.[0]?.email_address || '',
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export async function syncUserToDB(db: D1Database, clerkUser: { userId: string; email: string; name?: string }): Promise<User> {
  const existing = await db.prepare('SELECT * FROM users WHERE clerk_id = ?').bind(clerkUser.userId).first() as User | null;

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO users (id, clerk_id, email, name) VALUES (?, ?, ?, ?)'
  ).bind(id, clerkUser.userId, clerkUser.email, clerkUser.name || null).run();

  return await getUserByClerkId(db, clerkUser.userId)!;
}

export async function getUserByClerkId(db: D1Database, clerk_id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE clerk_id = ?').bind(clerk_id).first();
  return result as User | null;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return result as User | null;
}

export function getClerkAuthHeader(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}
