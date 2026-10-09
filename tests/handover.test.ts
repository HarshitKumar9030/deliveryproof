import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GoogleGenAI } from '@google/genai';
import { validateHandoverReview, hasCurrentConfirmation } from '../src/domain/handover.ts';
import { AiEvidenceService } from '../src/services/ai/ai.service.ts';
import type { EvidenceRecord } from '../src/domain/evidence.ts';

const scope = { ownerId: 'seller-1', projectId: 'project-1' };
const record: EvidenceRecord = { ...scope, id: 'scope-1', kind: 'agreement', occurredAt: '2026-10-08T10:00:00Z', text: 'Deliver three logo exports.', sourceRef: 'project:1' };
const review = { summary: 'Exports are not documented.', checkpoints: [{ requirement: 'Three logo exports', status: 'missing', explanation: 'Only scope is recorded.', evidenceIds: ['scope-1'], fileCitations: [] }], nextActions: [{ action: 'delivery', reason: 'Preserve the export handover.' }], confirmationMessage: 'Please confirm receipt of the three logo exports, or tell us what is missing.' };

test('handover rejects invented citations and agreement-only delivery claims', () => {
  assert.deepEqual(validateHandoverReview(review, [record]), review);
  assert.throws(() => validateHandoverReview({ ...review, checkpoints: [{ ...review.checkpoints[0], evidenceIds: ['invented'] }] }, [record]), /Unknown handover citation/);
  assert.throws(() => validateHandoverReview({ ...review, checkpoints: [{ ...review.checkpoints[0], status: 'supported' }] }, [record]), /cannot establish delivery/);
  assert.throws(() => validateHandoverReview({ ...review, checkpoints: [{ ...review.checkpoints[0], status: 'partial', evidenceIds: [] }] }, [record]), /require evidence/);
});

test('changing the delivery invalidates the current receipt without erasing its history', () => {
  const confirmation = { deliveryLink: 'https://files.example/v1', name: 'Client', confirmedAt: '2026-10-08T10:00:00Z', method: 'share-link' as const };
  assert.equal(hasCurrentConfirmation({ deliveryLink: confirmation.deliveryLink, deliveryConfirmation: confirmation }), true);
  assert.equal(hasCurrentConfirmation({ deliveryLink: 'https://files.example/v2', deliveryConfirmation: confirmation }), false);
  assert.equal(hasCurrentConfirmation({ deliveryLink: '', deliveryConfirmation: confirmation }), false);
});

test('Gemini handover preserves evidence scope and rejects provider hallucinations', async () => {
  let response = review;
  let calls = 0;
  const client = { models: { generateContent: async () => { calls++; return { text: JSON.stringify(response) }; } } } as unknown as GoogleGenAI;
  const ai = new AiEvidenceService(client, 'test-model');
  const project = { title: 'Logo', scope: record.text, paid: false, deliveryLink: '', confirmed: false };
  assert.deepEqual(await ai.reviewHandover(scope, project, [record]), review);
  await assert.rejects(() => ai.reviewHandover(scope, project, [{ ...record, ownerId: 'another-seller' }]), /scope mismatch/);
  assert.equal(calls, 1);
  response = { ...review, checkpoints: [{ ...review.checkpoints[0]!, evidenceIds: ['invented'] }] };
  await assert.rejects(() => ai.reviewHandover(scope, project, [record]), /Unknown handover citation/);
});
