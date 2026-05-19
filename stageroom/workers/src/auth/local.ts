import { Env, User } from '../db/schema';
import { hashPassword, verifyPassword, generateJWT, verifyJWT, getAuthToken } from './crypto';

export async function signUp(db: D1Database, jwtSecret: string, data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ user: User; token: string } | { error: string }> {
  const existing = await db.prepare('SELECT * FROM users WHERE email = ?').bind(data.email).first() as User | null;
  if (existing) return { error: 'Email already registered' };

  const { hash, salt } = await hashPassword(data.password);
  const id = crypto.randomUUID();

  await db.prepare(
    'INSERT INTO users (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, data.email, data.name || null, hash, salt).run();

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first() as User;
  const token = await generateJWT({ id: user.id, email: user.email, name: user.name || undefined }, jwtSecret);

  return { user, token };
}

export async function signIn(db: D1Database, jwtSecret: string, data: {
  email: string;
  password: string;
}): Promise<{ user: User; token: string } | { error: string }> {
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(data.email).first() as User | null;
  if (!user) return { error: 'Invalid email or password' };

  const valid = await verifyPassword(data.password, user.password_hash, user.password_salt);
  if (!valid) return { error: 'Invalid email or password' };

  const token = await generateJWT({ id: user.id, email: user.email, name: user.name || undefined }, jwtSecret);

  return { user, token };
}

export async function authenticateRequest(request: Request, db: D1Database, jwtSecret: string): Promise<User | null> {
  const token = getAuthToken(request);
  if (!token) return null;

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) return null;

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(payload.id).first() as User | null;
  return user;
}
