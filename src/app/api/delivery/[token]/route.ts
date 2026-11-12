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
const concernInput = z.object({ action: z.literal('concern'), name: z.string().trim().min(2).max(100), text: z.string().trim().min(10).max(1000) }).strict();
const resolveInput = z.object({ action: z.literal('resolve') }).strict();
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
    return reply({ title: project.title, client: project.client, deliveryLink: project.deliveryLink, confirmedAt: hasCurrentConfirmation(project) ? project.deliveryConfirmation!.confirmedAt : null, held: project.hold?.state === 'held', concern: project.concern ? { state: project.concern.state, text: project.concern.text, raisedAt: project.concern.raisedAt } : null });
  } catch { return reply({ error: 'Unable to load this delivery.' }, 503); }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
  let body: unknown;
  try { body = await readJson(request, 4096); } catch { return reply({ error: 'Invalid request.' }, 400); }
  const concern = concernInput.safeParse(body); const resolution = resolveInput.safeParse(body);
  if (concern.success || resolution.success) return clientConcern(request, (await context.params).token, concern.success ? concern.data : null);
  let input;
  try { input = acknowledgement.parse(body); } catch { return reply({ error: 'Enter your name and confirm you received the delivery.' }, 400); }
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

/** Lets the link-holding client pause a held payment, or lift their own pause. The seller cannot do either. */
async function clientConcern(_request: Request, token: string, raise: z.infer<typeof concernInput> | null) {
  try {
    const result = await resolve(token);
    if (!result) return reply({ error: 'This link is no longer available.' }, 404);
    const { db, link, project } = result;
    const session = await auth();
    if (session?.user?.id === project.ownerId) return reply({ error: 'Only the client can raise or resolve a concern.' }, 403);
    if (!takeLimit('concern:' + link.tokenHash, 5, 60000)) return reply({ error: 'Please wait and try again.' }, 429);
    const projects = db.collection<Project & { ownerId: string }>('projects');
    const filter = { id: project.id, ownerId: link.ownerId, deliveryLink: link.deliveryLink };
    const now = new Date().toISOString();
    if (raise) {
      // Only a payment that is still held can be paused; released or returned funds have already moved.
      const updated = await projects.findOneAndUpdate({ ...filter, 'hold.state': 'held', 'concern.state': { $ne: 'open' } }, {
        $set: { concern: { state: 'open', name: raise.name, text: raise.text, raisedAt: now } },
        $push: { evidence: { id: randomUUID(), kind: 'Message', title: 'Client raised a concern before release', date: now, excerpt: `${raise.name} (self-declared, via the delivery link) reported: ${raise.text}` } },
      }, { returnDocument: 'after' });
      if (!updated) return reply({ error: project.concern?.state === 'open' ? 'A concern is already open.' : 'This payment is no longer held, so it cannot be paused here.' }, 409);
      return reply({ concern: { state: 'open', text: raise.text, raisedAt: now } });
    }
    const updated = await projects.findOneAndUpdate({ ...filter, 'concern.state': 'open' }, {
      $set: { 'concern.state': 'resolved', 'concern.resolvedAt': now },
      $push: { evidence: { id: randomUUID(), kind: 'Message', title: 'Client marked their concern resolved', date: now, excerpt: `The client marked this concern resolved: ${project.concern?.text ?? ''}` } },
    }, { returnDocument: 'after' });
    if (!updated) return reply({ error: 'There is no open concern to resolve.' }, 409);
    return reply({ concern: { state: 'resolved', text: updated.concern!.text, raisedAt: updated.concern!.raisedAt } });
  } catch { return reply({ error: 'Unable to save your concern. Please try again.' }, 503); }
}
