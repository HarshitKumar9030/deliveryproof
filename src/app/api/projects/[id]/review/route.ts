import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { createServices } from '@/services/registry';
import { hasCurrentConfirmation } from '@/domain/handover';
import type { Project } from '@/domain/projects';
import type { EvidenceRecord } from '@/domain/evidence';
import { createHash } from 'node:crypto';

function fingerprint(project: Project) {
  return createHash('sha256').update(JSON.stringify({ scope: project.scope, paid: project.paid, deliveryLink: project.deliveryLink, confirmation: project.deliveryConfirmation, evidence: project.evidence })).digest('hex');
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  try {
    const db = await database();
    const project = await db.collection<Project & { ownerId: string }>('projects').findOne({ id, ownerId: session.user.id });
    if (!project) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    const saved = await db.collection('handoverReviews').findOne({ projectId: id, ownerId: session.user.id }, { sort: { createdAt: -1 }, projection: { _id: 0, review: 1, createdAt: 1, fingerprint: 1 } });
    return Response.json(saved ? { review: saved.review, createdAt: saved.createdAt, stale: saved.fingerprint !== fingerprint(project) } : { review: null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Unable to load the previous review.' }, { status: 503 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  if (!takeLimit('handover-review:' + session.user.id, 4, 60000)) return Response.json({ error: 'Wait a moment before another review.' }, { status: 429 });
  try {
    const db = await database();
    const project = await db.collection<Project & { ownerId: string }>('projects').findOne({ id, ownerId: session.user.id });
    if (!project) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    const scope = { ownerId: session.user.id, projectId: id };
    const records: EvidenceRecord[] = project.evidence.map(e => ({ ...scope, id: e.id, kind: e.kind.toLowerCase() as EvidenceRecord['kind'], occurredAt: e.date, text: e.excerpt, sourceRef: `project:${id}:${e.id}` }));
    const review = await createServices().ai().reviewHandover(scope, { title: project.title, scope: project.scope, paid: project.paid, deliveryLink: project.deliveryLink, confirmed: hasCurrentConfirmation(project) }, records);
    const current = await db.collection<Project & { ownerId: string }>('projects').findOne({ id, ownerId: session.user.id });
    if (!current || fingerprint(current) !== fingerprint(project)) return Response.json({ error: 'Project records changed during review. Refresh and run it again.' }, { status: 409 });
    const createdAt = new Date().toISOString();
    await db.collection('handoverReviews').insertOne({ ...scope, review, fingerprint: fingerprint(project), sourceIds: records.map(r => r.id), createdAt });
    return Response.json({ review, createdAt, sourceIds: records.map(r => r.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Delivery review could not complete. Check the AI configuration and try again.' }, { status: 502 });
  }
}
