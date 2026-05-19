async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const usedSalt = salt || btoa(crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  const keyMaterial = encoder.encode(password + usedSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash, salt: usedSalt };
}

async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
}

async function generateJWT(payload: { id: string; email: string; name?: string }, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 86400 * 7 };

  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '');
  const payloadEncoded = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '');
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${signatureEncoded}`;
}

async function verifyJWT(token: string, secret: string): Promise<{ id: string; email: string; name?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signature = new Uint8Array(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => c.charCodeAt(0)));

    const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;

    return { id: payload.id, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

function getAuthToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (header && header.startsWith('Bearer ')) return header.substring(7);
  return null;
}

export { hashPassword, verifyPassword, generateJWT, verifyJWT, getAuthToken };
