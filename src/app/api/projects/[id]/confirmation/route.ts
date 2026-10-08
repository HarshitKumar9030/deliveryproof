import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { hashConfirmationToken, type ConfirmationLink } from '@/services/workspace/confirmation';
import { hasCurrentConfirmation } from '@/domain/handover';
import type { Project } from '@/domain/projects';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  if (!takeLimit('confirmation-link:' + session.user.id, 12, 60000)) return Response.json({ error: 'Please wait before creating another link.' }, { status: 429 });
  try {
    const db = await database();
    const project = await db.collection<Project & { ownerId: string }>('projects').findOne({ id, ownerId: session.user.id });
    if (!project) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    if (!project.deliveryLink) return Response.json({ error: 'Save a delivery link first.' }, { status: 409 });
    if (hasCurrentConfirmation(project)) return Response.json({ error: 'Receipt is already acknowledged for this delivery.' }, { status: 409 });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    const links = db.collection<ConfirmationLink>('confirmationLinks');
    await links.createIndex({ tokenHash: 1 }, { unique: true });
    await links.insertOne({ tokenHash: hashConfirmationToken(token), ownerId: session.user.id, projectId: id, deliveryLink: project.deliveryLink, expiresAt });
    return Response.json({ confirmationUrl: `${process.env.APP_ORIGIN || new URL(request.url).origin}/delivery/${token}`, expiresAt: expiresAt.toISOString() }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Unable to create a confirmation link.' }, { status: 503 }); }
}
