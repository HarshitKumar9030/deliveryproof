import { database } from '@/services/database/mongodb';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await (await database()).command({ ping: 1 });
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); }
}
