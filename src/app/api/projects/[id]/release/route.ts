import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { merchant } from '@/services/paypal/merchant';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { readJson } from '@/services/workspace/request';
import { reviewFingerprint } from '@/services/workspace/review-fingerprint';
import { hasCurrentConfirmation, type HandoverReview } from '@/domain/handover';
import { evaluateRelease } from '@/domain/release';
import { verifiedAuthorizationCapture } from '@/domain/payment';
import type { Project } from '@/domain/projects';

type StoredProject = Project & { ownerId: string; hold?: Project['hold'] & { releaseRequestId?: string; returnRequestId?: string } };

async function load(ownerId: string, id: string) {
  const db = await database();
  const projects = db.collection<StoredProject>('projects');
  const project = await projects.findOne({ id, ownerId });
  if (!project) return null;
  const saved = await db.collection<{ review: HandoverReview; fingerprint: string; createdAt: string }>('handoverReviews')
    .findOne({ projectId: id, ownerId }, { sort: { createdAt: -1 } });
  const decision = evaluateRelease({
    hold: project.hold, deliveryLink: project.deliveryLink, confirmed: hasCurrentConfirmation(project),
    review: saved?.review ?? null, reviewStale: !!saved && saved.fingerprint !== reviewFingerprint(project),
  });
  if (project.status === 'dispute') decision.canRelease = false;
  return { db, projects, project, decision, reviewedAt: saved?.createdAt ?? null };
}

function publicHold(project: StoredProject) {
  if (!project.hold) return null;
  const { releaseRequestId: _r, returnRequestId: _v, ...hold } = project.hold;
  return hold;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  try {
    const state = await load(session.user.id, id);
    if (!state) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    return Response.json({ hold: publicHold(state.project), ...state.decision, reviewedAt: state.reviewedAt, dispute: state.project.status === 'dispute' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Unable to check the release gate.' }, { status: 503 }); }
}

const Body = z.object({ action: z.enum(['release', 'return']) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const ownerId = session.user.id;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  const body = Body.safeParse(await readJson(request, 1000).catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid request' }, { status: 400 });
  if (!takeLimit('release:' + ownerId, 6, 60000)) return Response.json({ error: 'Please wait before trying again.' }, { status: 429 });
  const action = body.data.action;
  try {
    const state = await load(ownerId, id);
    if (!state) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    const { projects, project, decision } = state;
    const hold = project.hold;
    if (!hold) return Response.json({ error: 'No held payment exists for this project.' }, { status: 409 });
    if (action === 'release' && !decision.canRelease) {
      return Response.json({ error: 'The release gate has not passed.', gates: decision.gates }, { status: 409 });
    }
    // Resolve the seller's PayPal connection before claiming, so a missing connection cannot strand the hold.
    let paypal;
    try { paypal = await merchant(ownerId); }
    catch { return Response.json({ error: 'Connect your PayPal sandbox app in Account settings, then retry.' }, { status: 409 }); }
    // Persist the idempotency key before calling PayPal. A retry after a timeout
    // reuses it, so PayPal cannot capture or void the authorization twice.
    const requestKey = action === 'release' ? 'releaseRequestId' : 'returnRequestId';
    const requestId = hold[requestKey] ?? randomUUID();
    const pending = action === 'release' ? 'releasing' : 'returning';
    const claimed = await projects.findOneAndUpdate(
      { id, ownerId, paid: false, 'hold.authorizationId': hold.authorizationId, 'hold.state': { $in: ['held', pending] } },
      { $set: { 'hold.state': pending, [`hold.${requestKey}`]: requestId } },
      { returnDocument: 'after' });
    if (!claimed) return Response.json({ error: 'This payment has already been released or returned, or is being processed.' }, { status: 409 });
    const now = new Date().toISOString();
    if (action === 'release') {
      let capture;
      try {
        capture = verifiedAuthorizationCapture(await paypal.captureAuthorization(hold.authorizationId, {
          requestId, value: hold.value, note: `Released by DeliveryProof after verified delivery: ${project.title}`.slice(0, 255),
        }), hold.value);
      } catch (error) {
        await projects.updateOne({ id, ownerId, 'hold.state': 'releasing' }, { $set: { 'hold.state': 'held' } });
        throw error;
      }
      const passed = decision.gates.map(g => `${g.label}: ${g.detail}`).join(' | ');
      await projects.updateOne({ id, ownerId, 'hold.state': 'releasing' }, {
        $set: { paid: true, 'hold.state': 'released', 'hold.releasedAt': now, 'hold.captureId': capture.id, status: project.status === 'dispute' ? 'dispute' : hasCurrentConfirmation(project) ? 'complete' : 'delivered' },
        $push: { evidence: { id: capture.id, kind: 'Payment', title: 'Held funds released after proof gate passed', date: now, excerpt: `PayPal captured authorization ${hold.authorizationId} as capture ${capture.id} for ${capture.amount.value} USD. Release gate: ${passed}`.slice(0, 2000) } },
      });
      await state.db.collection('payments').updateOne({ ownerId, projectId: id }, { $set: { state: 'complete', captureId: capture.id, completedAt: new Date() } });
      return Response.json({ released: true, captureId: capture.id });
    }
    try { await paypal.voidAuthorization(hold.authorizationId, requestId); }
    catch (error) {
      await projects.updateOne({ id, ownerId, 'hold.state': 'returning' }, { $set: { 'hold.state': 'held' } });
      throw error;
    }
    await projects.updateOne({ id, ownerId, 'hold.state': 'returning' }, {
      $set: { 'hold.state': 'returned', 'hold.returnedAt': now },
      $push: { evidence: { id: randomUUID(), kind: 'Payment', title: 'Held funds returned to client', date: now, excerpt: `Seller voided PayPal authorization ${hold.authorizationId}; ${hold.value} USD was released back to the client without capture.` } },
    });
    await state.db.collection('payments').updateOne({ ownerId, projectId: id }, { $set: { state: 'returned' } });
    return Response.json({ returned: true });
  } catch (error) {
    console.error('Release action failed:', error instanceof Error ? error.name : 'Unknown error');
    return Response.json({ error: action === 'release' ? 'PayPal could not release the held funds. Retry; the same request will be reused.' : 'PayPal could not return the held funds. Retry; the same request will be reused.' }, { status: 502 });
  }
}
