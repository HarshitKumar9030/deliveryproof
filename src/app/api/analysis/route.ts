import { cookies } from 'next/headers';
import { readJson } from '@/services/workspace/request';
import { ConfigurationError } from '@/config';
import { createServices } from '@/services/registry';
import { resolveDemoEvidence } from '@/services/workspace/demo-analysis';
import { SESSION_COOKIE, sameOrigin, sessionSecret, takeLimit, validSession } from '@/services/workspace/session';

export const runtime = 'nodejs';
let busy = false;
export async function POST(request: Request) {
  const reply = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!sameOrigin(request)) return reply('Request origin rejected.', 403);
  try {
    if (!validSession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret())) return reply('Unlock your workspace to use Gemini.', 401);
  } catch { return reply('Workspace access is not configured. Run npm run setup:local first.', 503); }
  if (Number(request.headers.get('content-length')) > 8192) return reply('Request too large.', 413);
  let input;
  try {
    input = resolveDemoEvidence(await readJson(request, 8192));
  } catch { return reply('Choose valid records from the demo dispute and provide a dispute reason.', 400); }
  let ai;
  try { ai = createServices().ai(); }
  catch (error) { return reply(error instanceof ConfigurationError ? 'Add GEMINI_API_KEY and GEMINI_MODEL to .env.local, then restart the dev server.' : 'Gemini configuration is invalid.', 503); }
  if (busy || !takeLimit('analysis', 6, 60_000)) return reply('Analysis is busy. Please try again shortly.', 429);
  busy = true;
  try {
    const analysis = await ai.analyse(input.scope, input.reason, input.records);
    return Response.json({ analysis, sourceIds: input.records.map(record => record.id), demo: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return reply('Gemini could not complete a validated analysis. Check your model, key, and quota, then retry.', 502); }
  finally { busy = false; }
}
