import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { sameOrigin } from '@/services/workspace/session';
import { readJson } from '@/services/workspace/request';
const input = z.object({ client: z.string().trim().min(1).max(80), title: z.string().trim().min(1).max(100), scope: z.string().trim().min(1).max(2000), amount: z.number().int().min(1).max(1000000) }).strict();
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const db = await database();
    const projects = await db.collection('projects').find({ ownerId: session.user.id }, { projection: { _id: 0, ownerId: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return Response.json({ projects, activity: [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Database unavailable. Start npm run db:local.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  let parsed;
  try { parsed = input.safeParse(await readJson(request, 12000)); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }
  if (!parsed.success) return Response.json({ error: 'Invalid project details' }, { status: 400 });
  try {
    const db = await database();
    const id = randomUUID();
    const now = new Date().toISOString();
    const project = { ...parsed.data, id, ownerId: session.user.id, createdAt: now, paid: false, status: 'awaiting-payment', deliveryLink: '', responsePrepared: false,
      evidence: [{ id: randomUUID(), kind: 'Agreement', title: 'Seller-entered scope', date: now, excerpt: parsed.data.scope }],
    };
    await db.collection('projects').createIndex({ ownerId: 1, id: 1 }, { unique: true });
    await db.collection('projects').insertOne(project);
    const { ownerId, ...publicProject } = project;
    return Response.json(publicProject, { status: 201 });
  } catch { return Response.json({ error: 'Project could not be saved' }, { status: 503 }); }
}
