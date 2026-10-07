import { cookies } from 'next/headers';
import { readJson } from '@/services/workspace/request';
import { SESSION_COOKIE, SESSION_SECONDS, checkPassword, issueSession, sameOrigin, sessionSecret, takeLimit } from '@/services/workspace/session';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request origin rejected.' }, { status: 403 });
  if (!takeLimit('login', 10, 60_000)) return Response.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
  if (Number(request.headers.get('content-length')) > 4096) return Response.json({ error: 'Request too large.' }, { status: 413 });
  let input: { password?: unknown };
  try {
    const body = await readJson(request, 4096);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    input = body as { password?: unknown };
  } catch { return Response.json({ error: 'Enter a valid workspace login request.' }, { status: 400 }); }
  try {
    if (typeof input.password !== 'string') return Response.json({ error: 'Enter your workspace password.' }, { status: 400 });
    const secret = sessionSecret();
    if (!checkPassword(input.password)) return Response.json({ error: 'Incorrect workspace password.' }, { status: 401 });
    (await cookies()).set(SESSION_COOKIE, issueSession(secret), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
    return Response.json({ authenticated: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Workspace access is not configured. Run npm run setup:local first.' }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request origin rejected.' }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ authenticated: false });
}
