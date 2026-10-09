import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { inspectArtifact, boundedBytes, assertReviewBudget, encryptArtifact, decryptArtifact } from '../src/services/storage/artifacts.ts';
import { validateHandoverReview } from '../src/domain/handover.ts';
import { AiEvidenceService } from '../src/services/ai/ai.service.ts';
import type { GoogleGenAI } from '@google/genai';
import type { EvidenceRecord } from '../src/domain/evidence.ts';

test('original inspection validates formats, PDF pages and bounded streamed bodies', async () => {
  const pdf = await PDFDocument.create(); pdf.addPage();
  const inspected = await inspectArtifact('delivery.pdf', await pdf.save());
  assert.equal(inspected.pages, 1); assert.equal(inspected.sha256.length, 64);
  await assert.rejects(() => inspectArtifact('spoof.pdf', Buffer.from('not a pdf')), /Supported/);
  await assert.rejects(() => inspectArtifact('binary.txt', Buffer.from([0, 1])), /Binary/);
  await assert.rejects(() => inspectArtifact('invalid.txt', Buffer.from([255])), /UTF-8/);
  await assert.rejects(() => inspectArtifact('large.png', new Uint8Array(4 * 1024 * 1024 + 1)), /under 4 MB/);
  await assert.rejects(() => boundedBytes(new Response('12345').body, 4), /limit/);
  assert.throws(() => assertReviewBudget([{ ...inspected, bytes: 13 * 1024 * 1024 }]), /12 MB/);
});

test('AI receives real numbered contents and rejects invented file locations or changed originals', async () => {
  const content = Buffer.from('Logo export specification\nPrimary colour: #224466\nNo typography guide included.');
  const file = await inspectArtifact('brand.md', content);
  const scope = { ownerId: 'seller', projectId: 'project' };
  const record: EvidenceRecord = { ...scope, id: file.id, kind: 'artifact', text: 'Original brand file', occurredAt: file.uploadedAt, sourceRef: file.id };
  const checkpoint = { requirement: 'Primary colour', status: 'supported', explanation: 'A colour is present.', evidenceIds: [file.id], fileCitations: [{ fileId: file.id, page: null, line: 2, observation: 'Primary colour #224466.' }] };
  const review = { summary: 'Colour is documented; typography is missing.', checkpoints: [checkpoint], nextActions: [], confirmationMessage: 'Please confirm receipt.' };
  let sent = '';
  const client = { models: { generateContent: async (input: unknown) => { sent = JSON.stringify(input); return { text: JSON.stringify(review) }; } } } as unknown as GoogleGenAI;
  const ai = new AiEvidenceService(client, 'test-model');
  await ai.reviewHandover(scope, { title: 'Brand', scope: 'Colour and typography guide', paid: false, confirmed: false, deliveryLink: '' }, [record], [{ ...file, content }]);
  assert.ok(sent.includes('2: Primary colour: #224466'));
  assert.throws(() => validateHandoverReview({ ...review, checkpoints: [{ ...checkpoint, fileCitations: [{ ...checkpoint.fileCitations[0], line: 99 }] }] }, [record], [file]), /Invalid text/);
  assert.throws(() => validateHandoverReview({ ...review, checkpoints: [{ ...checkpoint, fileCitations: [] }] }, [record], [file]), /inspected location/);
  assert.throws(() => validateHandoverReview(review, [record], []), /Unknown inspected/);
  await assert.rejects(() => ai.reviewHandover(scope, { title: 'Brand', scope: 'Colour', paid: false, confirmed: false, deliveryLink: '' }, [record], [{ ...file, content: Buffer.from('tampered') }]), /integrity/);
});


test('stored ciphertext authenticates the original and its project file identity', async () => {
  const previous = process.env.APP_ENCRYPTION_KEY;
  process.env.APP_ENCRYPTION_KEY = 'ab'.repeat(32);
  try {
    const content = Buffer.from('Confidential original content');
    const file = await inspectArtifact('private.txt', content);
    const encrypted = encryptArtifact(file, content);
    assert.equal(encrypted.includes(content), false);
    assert.deepEqual(decryptArtifact(file, encrypted), content);
    assert.notDeepEqual(encryptArtifact(file, content), encrypted);
    assert.throws(() => decryptArtifact({ ...file, id: 'different-file' }, encrypted));
    encrypted[encrypted.length - 1] ^= 1;
    assert.throws(() => decryptArtifact(file, encrypted));
  } finally {
    if (previous === undefined) delete process.env.APP_ENCRYPTION_KEY;
    else process.env.APP_ENCRYPTION_KEY = previous;
  }
});
