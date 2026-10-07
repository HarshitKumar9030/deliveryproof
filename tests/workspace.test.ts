import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin, takeLimit } from '../src/services/workspace/session.js';
import { readJson } from '../src/services/workspace/request.js';

test('origin checks and request bounds apply before provider calls', async () => {
  assert.equal(sameOrigin(new Request('https://example.com/api/analysis', { headers: { origin: 'https://evil.example' } })), false);
  assert.equal(sameOrigin(new Request('https://example.com/api/analysis', { headers: { origin: 'https://example.com' } })), true);
  await assert.rejects(readJson(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(1000) }), 100), /too large/);
  assert.deepEqual(await readJson(new Request('https://example.com', { method: 'POST', body: '{"ok":true}' }), 100), { ok: true });
  assert.equal(takeLimit('test-workspace-limit', 1, 1000, 0), true);
  assert.equal(takeLimit('test-workspace-limit', 1, 1000, 1), false);
  assert.equal(takeLimit('test-workspace-limit', 1, 1000, 1001), true);
});
