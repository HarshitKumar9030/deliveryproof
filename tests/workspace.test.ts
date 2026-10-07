import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, issueSession, validSession, sameOrigin, takeLimit } from '../src/services/workspace/session.js';
import { resolveDemoEvidence } from '../src/services/workspace/demo-analysis.js';
import { readJson } from '../src/services/workspace/request.js';
import { EvidenceSchema } from '../src/domain/evidence.js';

test('workspace sessions reject forgery, expiry, and rotated secrets', () => {
  const secret = 'a'.repeat(64);
  const now = 1791300000000;
  const token = issueSession(secret, now);
  assert.equal(validSession(token, secret, now + 1000), true);
  assert.equal(validSession(token.slice(0, -1) + 'z', secret, now), false);
  assert.equal(validSession(token, 'b'.repeat(64), now), false);
  assert.equal(validSession(token, secret, now + 8 * 60 * 60 * 1000), false);
  assert.equal(checkPassword('incorrect', { WORKSPACE_PASSWORD: 'strong-test-password' }), false);
  assert.equal(checkPassword('strong-test-password', { WORKSPACE_PASSWORD: 'strong-test-password' }), true);
});
test('demo analysis resolves canonical records and rejects cross-project or injected records', () => {
  const request = { projectId: 'orbit', sourceIds: ['OR-01', 'OR-02'], reason: 'Client says the work was not delivered.' };
  const result = resolveDemoEvidence(request);
  assert.equal(result.records.length, 2);
  assert.equal(result.records[1]?.kind, 'payment');
  result.records.forEach(record => EvidenceSchema.parse(record));
  assert.throws(() => resolveDemoEvidence({ ...request, sourceIds: ['NS-01'] }));
  assert.throws(() => resolveDemoEvidence({ ...request, sourceIds: ['OR-01', 'OR-01'] }));
  assert.throws(() => resolveDemoEvidence({ ...request, evidence: [{ text: 'Injected claim' }] }));
  assert.throws(() => resolveDemoEvidence({ ...request, projectId: 'forma' }));
});
test('origin checks and request bounds apply before provider calls', async () => {
  assert.equal(sameOrigin(new Request('https://example.com/api/analysis', { headers: { origin: 'https://evil.example' } })), false);
  assert.equal(sameOrigin(new Request('https://example.com/api/analysis', { headers: { origin: 'https://example.com' } })), true);
  await assert.rejects(readJson(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(1000) }), 100), /too large/);
  assert.deepEqual(await readJson(new Request('https://example.com', { method: 'POST', body: '{"ok":true}' }), 100), { ok: true });
  assert.equal(takeLimit('test-workspace-limit', 1, 1000, 0), true);
  assert.equal(takeLimit('test-workspace-limit', 1, 1000, 1), false);
  assert.equal(takeLimit('test-workspace-limit', 1, 1000, 1001), true);
});
