import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { required } from '../../config.ts';

export const SESSION_COOKIE = 'deliveryproof-workspace';
export const SESSION_SECONDS = 8 * 60 * 60;
export function sessionSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = required(env, 'WORKSPACE_SESSION_SECRET');
  if (secret.length < 32) throw new Error('WORKSPACE_SESSION_SECRET must be at least 32 characters');
  return secret;
}
export function checkPassword(input: string, env: NodeJS.ProcessEnv = process.env) {
  const password = required(env, 'WORKSPACE_PASSWORD');
  if (password.length < 16) throw new Error('WORKSPACE_PASSWORD must be at least 16 characters');
  return timingSafeEqual(createHash('sha256').update(input).digest(), createHash('sha256').update(password).digest());
}
export function issueSession(secret: string, now = Date.now()) {
  const expires = String(now + SESSION_SECONDS * 1000);
  return `${expires}.${createHmac('sha256', secret).update(expires).digest('hex')}`;
}
export function validSession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match?.[1] || !match[2]) return false;
  const expires = Number(match[1]);
  if (expires <= now || expires > now + SESSION_SECONDS * 1000) return false;
  const expected = createHmac('sha256', secret).update(match[1]).digest();
  return timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  if (process.env.APP_ORIGIN) return origin === process.env.APP_ORIGIN;
  try {
    const supplied = new URL(origin);
    const host = request.headers.get('host') || new URL(request.url).host;
    return (supplied.protocol === 'https:' || supplied.protocol === 'http:') && supplied.host === host;
  } catch { return false; }
}

/** Single-process workspace limits; replace with a shared store before scaling. */
const buckets = new Map<string, { count: number; expires: number }>();
export function takeLimit(key: string, maximum: number, interval: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.expires <= now) {
    buckets.set(key, { count: 1, expires: now + interval });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count++;
  return true;
}
