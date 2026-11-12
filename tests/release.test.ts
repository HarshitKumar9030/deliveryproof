import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRelease, type PaymentHold } from '../src/domain/release.ts';
import { verifiedAuthorization, verifiedAuthorizationCapture, verifyApprovedOrder } from '../src/domain/payment.ts';
import type { HandoverReview } from '../src/domain/handover.ts';

const hold: PaymentHold = { orderId: 'ORDER1', authorizationId: 'AUTH1', value: '125.00', authorizedAt: '2026-11-01T00:00:00Z', expiresAt: '2026-11-30T00:00:00Z', state: 'held' };
const checkpoint = (status: 'supported' | 'partial' | 'missing', requirement = 'Logo files') =>
  ({ requirement, status, explanation: 'x', evidenceIds: ['e1'], fileCitations: [] });
const review = (...checkpoints: ReturnType<typeof checkpoint>[]): HandoverReview =>
  ({ summary: 's', checkpoints, nextActions: [], confirmationMessage: 'm' });
const ready = { hold, deliveryLink: 'https://example.com/files', confirmed: true, review: review(checkpoint('supported')), reviewStale: false, now: new Date('2026-11-11T00:00:00Z') };

test('release passes only when funds, delivery, receipt and a current complete review all pass', () => {
  assert.equal(evaluateRelease(ready).canRelease, true);
  const blocked = (changes: Partial<typeof ready>, gate: string) => {
    const decision = evaluateRelease({ ...ready, ...changes });
    assert.equal(decision.canRelease, false);
    assert.equal(decision.gates.find(g => g.id === gate)?.ok, false);
  };
  blocked({ hold: undefined }, 'funds');
  blocked({ hold: { ...hold, state: 'released' } }, 'funds');
  blocked({ hold: { ...hold, state: 'returned' } }, 'funds');
  blocked({ now: new Date('2026-12-01T00:00:00Z') }, 'funds');
  blocked({ deliveryLink: '' }, 'delivery');
  blocked({ confirmed: false }, 'receipt');
  blocked({ review: null }, 'review');
  blocked({ reviewStale: true }, 'scope');
  blocked({ review: review(checkpoint('supported'), checkpoint('missing', 'Brand guide PDF')) }, 'scope');
});

test('missing items are named; partial items warn without blocking; interrupted releases can retry', () => {
  const missing = evaluateRelease({ ...ready, review: review(checkpoint('missing', 'Brand guide PDF')) });
  assert.match(missing.gates.find(g => g.id === 'scope')!.detail, /Brand guide PDF/);
  const partial = evaluateRelease({ ...ready, review: review(checkpoint('partial', 'Icons')) });
  assert.equal(partial.canRelease, true);
  assert.deepEqual(partial.warnings, ['Partially evidenced: Icons']);
  assert.equal(evaluateRelease({ ...ready, hold: { ...hold, state: 'releasing' } }).canRelease, true);
});

const authorized = { id: 'ORDER1', status: 'COMPLETED', purchase_units: [{ custom_id: 'project1', amount: { currency_code: 'USD', value: '125.00' }, payments: { authorizations: [{ id: 'AUTH1', status: 'CREATED', expiration_time: '2026-11-30T00:00:00Z', amount: { currency_code: 'USD', value: '125.00' } }] } }] };

test('authorization must hold the exact project amount in USD', () => {
  const expected = { orderId: 'ORDER1', projectId: 'project1', value: '125.00' };
  assert.equal(verifiedAuthorization(authorized, expected).id, 'AUTH1');
  for (const field of ['orderId', 'projectId', 'value'] as const) assert.throws(() => verifiedAuthorization(authorized, { ...expected, [field]: 'wrong' }));
  const voided = structuredClone(authorized); voided.purchase_units[0]!.payments.authorizations[0]!.status = 'VOIDED'; assert.throws(() => verifiedAuthorization(voided, expected));
  const foreign = structuredClone(authorized); foreign.purchase_units[0]!.payments.authorizations[0]!.amount.currency_code = 'EUR'; assert.throws(() => verifiedAuthorization(foreign, expected));
  const approved = { ...authorized, status: 'APPROVED', intent: 'AUTHORIZE' };
  verifyApprovedOrder(approved, { ...expected, intent: 'AUTHORIZE' });
  assert.throws(() => verifyApprovedOrder(approved, expected), 'a CAPTURE check must reject an AUTHORIZE order');
});

test('released capture must be completed for the held amount', () => {
  assert.equal(verifiedAuthorizationCapture({ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '125.00' } }, '125.00').id, 'CAP1');
  assert.throws(() => verifiedAuthorizationCapture({ id: 'CAP1', status: 'PENDING', amount: { currency_code: 'USD', value: '125.00' } }, '125.00'));
  assert.throws(() => verifiedAuthorizationCapture({ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '1.00' } }, '125.00'));
});

test('an open client concern blocks release until the client resolves it', () => {
  const concern = { state: 'open' as const, name: 'Sam', text: 'No typography section.', raisedAt: '2026-11-11T00:00:00Z' };
  const blocked = evaluateRelease({ ...ready, concern });
  assert.equal(blocked.canRelease, false);
  const gate = blocked.gates.find(g => g.id === 'concern')!;
  assert.equal(gate.ok, false);
  assert.match(gate.detail, /No typography section/);
  assert.equal(evaluateRelease({ ...ready, concern: { ...concern, state: 'resolved' } }).canRelease, true);
  assert.equal(evaluateRelease(ready).gates.length, 6);
});
