import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { sameOrigin } from '@/services/workspace/session';
import { readJson } from '@/services/workspace/request';
import type { Project } from '@/domain/projects';
import { hasCurrentConfirmation } from '@/domain/handover';
const delivery = z.object({ deliveryLink: z.url().max(2000).refine(s => { const url = new URL(s); return url.protocol === 'https:' && !url.username && !url.password; }) }).strict();
const packet = z.object({ responsePrepared: z.literal(true), preparedPacket: z.object({ draft: z.string().trim().min(1).max(30000), sources: z.array(z.object({ id: z.string(), kind: z.string(), title: z.string(), date: z.string(), excerpt: z.string() }).strict()).min(1).max(100), reviewedAt: z.string() }).strict() }).strict();
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  let body;
  try { body = await readJson(request, 300000); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }
  const link = delivery.safeParse(body);
  const reviewed = packet.safeParse(body);
  if (!link.success && !reviewed.success) return Response.json({ error: 'Only delivery links and reviewed drafts can be saved here.' }, { status: 400 });
  try {
    const db = await database();
    const collection = db.collection<Project & { ownerId: string }>('projects');
    const filter = { id, ownerId: session.user.id };
    const project = await collection.findOne(filter);
    if (!project) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    if (link.success) {
      await collection.updateOne(filter, { $set: { deliveryLink: link.data.deliveryLink, status: project.status === 'dispute' ? 'dispute' : project.paid && hasCurrentConfirmation({ ...project, deliveryLink: link.data.deliveryLink }) ? 'complete' : 'delivered' }, $push: { evidence: { id: randomUUID(), kind: 'Delivery', title: 'Delivery link saved by seller', date: new Date().toISOString(), excerpt: `Seller saved this delivery URL: ${link.data.deliveryLink}. This does not establish client access or acceptance.` } } });
      await collection.updateOne({ ...filter, paid: true, status: { $ne: 'dispute' }, $expr: { $eq: ['$deliveryLink', '$deliveryConfirmation.deliveryLink'] } }, { $set: { status: 'complete' } });
    } else if (reviewed.success) {
      const input = reviewed.data.preparedPacket;
      const ids = input.sources.map(s => s.id);
      const sources = project.evidence.filter(e => ids.includes(e.id));
      if (new Set(ids).size !== ids.length || sources.length !== ids.length || input.sources.some(s => !sources.some(e => e.id === s.id && JSON.stringify(e) === JSON.stringify(s)))) return Response.json({ error: 'Evidence changed. Review the original records again.' }, { status: 409 });
      const cited = [...input.draft.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
      if (cited.some(citation => !ids.includes(citation!))) return Response.json({ error: 'Draft contains an unknown citation' }, { status: 400 });
      await collection.updateOne(filter, { $set: { responsePrepared: true, preparedPacket: { draft: input.draft, sources, reviewedAt: new Date().toISOString() } } });
    }
    const updated = await collection.findOne(filter, { projection: { _id: 0, ownerId: 0 } });
    return Response.json(updated);
  } catch { return Response.json({ error: 'Unable to save the project. Please try again.' }, { status: 503 }); }
}
