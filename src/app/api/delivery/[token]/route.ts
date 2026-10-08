import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { readJson } from '@/services/workspace/request';
import { confirmationTokenPattern, hashConfirmationToken, type ConfirmationLink } from '@/services/workspace/confirmation';
import { hasCurrentConfirmation } from '@/domain/handover';
import type { Project } from '@/domain/projects';

const acknowledgement = z.object({ name: z.string().trim().min(2).max(100), received: z.literal(true) }).strict();
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
async function resolve(token: string) {
  if (!confirmationTokenPattern.test(token)) return null;
  const db = await database();
  const link = await db.collection<ConfirmationLink>('confirmationLinks').findOne({ tokenHash: hashConfirmationToken(token), expiresAt: { $gt: new Date() } });
  if (!link) return null;
  const project = await db.collection<Project & { ownerId: string }>('projects').findOne({ id: link.projectId, ownerId: link.ownerId, deliveryLink: link.deliveryLink });
  return project ? { db, link, project } : null;
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const result = await resolve((await context.params).token);
    if (!result) return reply({ error: 'This link expired or the delivery changed. Ask the sender for a new link.' }, 404);
    const { project } = result;
    return reply({ title: project.title, client: project.client, deliveryLink: project.deliveryLink, confirmedAt: hasCurrentConfirmation(project) ? project.deliveryConfirmation!.confirmedAt : null });
  } catch { return reply({ error: 'Unable to load this delivery.' }, 503); }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
  let input;
  try { input = acknowledgement.parse(await readJson(request, 4096)); } catch { return reply({ error: 'Enter your name and confirm you received the delivery.' }, 400); }
  try {
    const result = await resolve((await context.params).token);
    if (!result) return reply({ error: 'This confirmation link is no longer available.' }, 404);
    const { db, link, project } = result;
    const session = await auth();
    if (session?.user?.id === project.ownerId) return reply({ error: 'Send this link to your client. You cannot acknowledge your own delivery.' }, 403);
    if (hasCurrentConfirmation(project)) return reply({ confirmedAt: project.deliveryConfirmation!.confirmedAt });
    if (!takeLimit('acknowledgement:' + link.tokenHash, 5, 60000)) return reply({ error: 'Please wait and try again.' }, 429);
    const confirmedAt = new Date().toISOString();
    const updated = await db.collection<Project & { ownerId: string }>('projects').findOneAndUpdate(
      { id: project.id, ownerId: link.ownerId, deliveryLink: link.deliveryLink, 'deliveryConfirmation.deliveryLink': { $ne: link.deliveryLink } },
      { $set: { deliveryConfirmation: { deliveryLink: link.deliveryLink, name: input.name, confirmedAt, method: 'share-link' } }, $push: { evidence: { id: randomUUID(), kind: 'Acknowledgement', title: 'Receipt acknowledged through delivery link', date: confirmedAt, excerpt: `${input.name} acknowledged receipt of ${link.deliveryLink} through a shared confirmation link. Name is self-declared; identity is not verified. Receipt does not establish satisfaction or contractual acceptance.` } } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      const current = await db.collection<Project & { ownerId: string }>('projects').findOne({ id: project.id, ownerId: link.ownerId, deliveryLink: link.deliveryLink });
      return current && hasCurrentConfirmation(current) ? reply({ confirmedAt: current.deliveryConfirmation!.confirmedAt }) : reply({ error: 'The delivery changed. Ask for a fresh confirmation link.' }, 409);
    }
    // Recheck payment inside the atomic update; a capture can arrive concurrently.
    await db.collection('projects').updateOne({ id: project.id, ownerId: link.ownerId, deliveryLink: link.deliveryLink, paid: true, status: { $ne: 'dispute' } }, { $set: { status: 'complete' } });
    return reply({ confirmedAt });
  } catch { return reply({ error: 'Unable to record receipt. Please try again.' }, 503); }
}
