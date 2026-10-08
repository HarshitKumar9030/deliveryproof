import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import type { Client } from '@elastic/elasticsearch';
import type { GoogleGenAI } from '@google/genai';
import { createServices } from '../src/services/registry.js';
import { PayPalService } from '../src/services/paypal/paypal.service.js';
import { ElasticEvidenceService } from '../src/services/elastic/elastic.service.js';
import { AiEvidenceService } from '../src/services/ai/ai.service.js';
import { LocalEvidenceStorage } from '../src/services/storage/storage.service.js';
import { validateCitations } from '../src/domain/evidence.js';
import type { EvidenceRecord } from '../src/domain/evidence.js';

const scope = { ownerId: 'user-1', projectId: 'project-1' };
const record: EvidenceRecord = { ...scope, id: 'source-1', kind: 'access',
  occurredAt: '2026-10-06T09:00:00Z', text: 'Client accessed logo version 2.', sourceRef: 'event:access-1' };
const config = { clientId: 'test-id', clientSecret: 'test-secret' };

test('missing credentials fail lazily, without fake provider results', () => {
  const services = createServices({});
  assert.throws(() => services.paypal(), /PAYPAL_CLIENT_ID/);
  assert.throws(() => services.elastic(), /ELASTIC_URL/);
  assert.throws(() => services.ai(), /GEMINI_API_KEY/);
  assert.ok(services.storage());
});

test('PayPal order preserves decimal strings, sandbox URL and operation ID; caches token', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json(String(input).endsWith('/token')
      ? { access_token: 'test-token', expires_in: 3600 } : { id: 'ORDER-1', status: 'CREATED' });
  };
  const service = new PayPalService(config, fetcher);
  const input = { projectId: 'project-1', currency: 'USD', value: '500.00', requestId: 'operation-1' };
  await service.createOrder(input);
  await service.createOrder(input);
  assert.equal(calls.filter(call => call.url.endsWith('/token')).length, 1);
  assert.ok(calls.every(call => call.url.startsWith('https://api-m.sandbox.paypal.com/')));
  const order = calls[1]!;
  assert.equal(new Headers(order.init?.headers).get('PayPal-Request-Id'), 'operation-1');
  assert.equal(JSON.parse(order.init?.body as string).purchase_units[0].amount.value, '500.00');
});

test('invalid money is rejected before network access', async () => {
  const service = new PayPalService(config, async () => { throw new Error('Unexpected network'); });
  for (const value of ['0.00', '-5.00', '1e3', '12.345']) {
    await assert.rejects(() => service.createOrder({ projectId: 'p', currency: 'USD', value, requestId: 'r' }));
  }
});

test('only a confirmed missing order permits refresh recovery; other failures stay errors', async () => {
  for(const scenario of [
    {status:404,body:{name:'RESOURCE_NOT_FOUND',details:[{issue:'INVALID_RESOURCE_ID'}]},missing:true},
    {status:403,body:{name:'NOT_AUTHORIZED'},missing:false},
    {status:500,body:{name:'INTERNAL_SERVER_ERROR'},missing:false},
    {status:404,body:{name:'unexpected-provider-body'},missing:false},
  ]) {
    const service=new PayPalService(config,async input=>String(input).endsWith('/token')
      ?Response.json({access_token:'t',expires_in:3600})
      :Response.json(scenario.body,{status:scenario.status}));
    if(scenario.missing) {
      assert.equal(await service.getOrderIfAvailable('OLD-ORDER'),null);
      await assert.rejects(()=>service.getOrder('OLD-ORDER'));
    } else await assert.rejects(()=>service.getOrderIfAvailable('OLD-ORDER'));
  }
});

test('webhook verification fails closed on provider FAILURE', async () => {
  let verificationBody: Record<string, unknown> | undefined;
  const service = new PayPalService({ ...config, webhookId: 'WH-1' }, async (input, init) => {
    if (String(input).endsWith('/token')) return Response.json({ access_token: 't', expires_in: 3600 });
    verificationBody = JSON.parse(init?.body as string);
    return Response.json({ verification_status: 'FAILURE' });
  });
  const headers = new Headers({ 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/cert',
    'paypal-transmission-id': 'id', 'paypal-transmission-sig': 'sig', 'paypal-transmission-time': 'time' });
  assert.equal(await service.verifyWebhook(headers, { id: 'event-1' }), false);
  assert.equal(verificationBody?.webhook_id, 'WH-1');
  await assert.rejects(() => service.verifyWebhook(new Headers(), {}), /Missing webhook header/);
});

test('PayPal errors do not leak provider response bodies', async () => {
  const service = new PayPalService(config, async () => new Response('sensitive-provider-body', { status: 401 }));
  await assert.rejects(() => service.getDispute('case-1'), error => {
    assert.equal((error as Error).message, 'PayPal authentication failed (401)');
    return true;
  });
});

test('PayPal evidence uses multipart JSON and PDF attachments', async () => {
  let form: FormData | undefined;
  const service = new PayPalService(config, async (input, init) => {
    if (String(input).endsWith('/token')) return Response.json({ access_token: 't', expires_in: 3600 });
    form = init?.body as FormData;
    assert.equal(new Headers(init?.headers).has('Content-Type'), false);
    return Response.json({ links: [] });
  });
  await service.provideEvidence('case-1', { notes: 'Delivery evidence', file: new TextEncoder().encode('%PDF-1.7'),
    filename: 'evidence.pdf', evidenceType: 'PROOF_OF_FULFILLMENT' });
  assert.ok(form?.get('input') instanceof Blob);
  assert.ok(form?.get('file1') instanceof Blob);
  const body = JSON.parse(await (form!.get('input') as Blob).text());
  assert.equal(body.evidences[0].evidence_type, 'PROOF_OF_FULFILLMENT');
});

test('Elastic retrieval always filters user and project', async () => {
  let request: any;
  const client = { search: async (input: unknown) => {
    request = input;
    return { hits: { hits: [{ _source: record }] } };
  } } as unknown as Client;
  assert.deepEqual(await new ElasticEvidenceService(client, 'evidence').search(scope, 'logo'), [record]);
  assert.deepEqual(request.query.bool.filter, [{ term: { ownerId: 'user-1' } }, { term: { projectId: 'project-1' } }]);
});

test('Elastic rejects a provider result from another project', async () => {
  const client = { search: async () => ({ hits: { hits: [{ _source: { ...record, projectId: 'other' } }] } }) } as unknown as Client;
  await assert.rejects(() => new ElasticEvidenceService(client, 'evidence').search(scope, 'logo'), /scope mismatch/);
});

test('AI rejects mixed-project evidence before calling model', async () => {
  const client = { models: { generateContent: async () => { throw new Error('Unexpected model call'); } } } as unknown as GoogleGenAI;
  await assert.rejects(() => new AiEvidenceService(client, 'configured-model').analyse(scope, 'not received',
    [{ ...record, ownerId: 'someone-else' }]), /scope mismatch/);
});

test('AI rejects invented citations returned by a model', async () => {
  const client = { models: { generateContent: async () => ({ text: JSON.stringify({
    summary: 'Draft', findings: [{ statement: 'Delivered', evidenceIds: ['invented'] }], missingEvidence: [],
  }) }) } } as unknown as GoogleGenAI;
  await assert.rejects(() => new AiEvidenceService(client, 'configured-model').analyse(scope, 'not received', [record]), /Unknown evidence citation/);
});

test('Gemini uses the configured model and structured schema, then validates its evidence', async () => {
  let request: any;
  const analysis = { summary: 'Access recorded', findings: [{ statement: 'Access recorded', evidenceIds: [record.id] }], missingEvidence: [] };
  const client = { models: { generateContent: async (input: unknown) => {
    request = input;
    return { text: JSON.stringify(analysis) };
  } } } as unknown as GoogleGenAI;
  const result = await new AiEvidenceService(client, 'chosen-gemini-model').analyse(scope, 'not received', [record]);
  assert.deepEqual(result, analysis);
  assert.equal(request.model, 'chosen-gemini-model');
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.equal(request.config.responseJsonSchema.type, 'object');
  assert.equal(JSON.parse(request.contents).evidence[0].id, record.id);
  assert.ok(request.config.abortSignal instanceof AbortSignal);
});

test('Gemini empty or malformed output fails without leaking response content', async () => {
  for (const text of [undefined, '', '   ', 'sensitive invalid provider output']) {
    const client = { models: { generateContent: async () => ({ text }) } } as unknown as GoogleGenAI;
    await assert.rejects(() => new AiEvidenceService(client, 'configured-model').analyse(scope, 'not received', [record]),
      text?.trim() ? /Gemini returned invalid JSON/ : /Gemini returned no structured analysis/);
  }
});

test('empty citations are rejected; known citations are accepted', () => {
  assert.throws(() => validateCitations({ summary: '', findings: [{ statement: 'Delivered', evidenceIds: [] }], missingEvidence: [] }, [record]));
  const result = validateCitations({ summary: 'Access recorded', findings: [{ statement: 'Access recorded', evidenceIds: [record.id] }], missingEvidence: [] }, [record]);
  assert.equal(result.findings.length, 1);
});

test('storage keeps content-addressed originals and blocks path traversal / cross-project reads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'deliveryproof-test-'));
  try {
    const storage = new LocalEvidenceStorage(root);
    const bytes = new TextEncoder().encode('original agreement');
    const saved = await storage.put(scope, bytes);
    assert.equal(saved.hash.length, 64);
    assert.deepEqual(await storage.put(scope, bytes), saved);
    assert.equal((await storage.get(scope, saved.hash)).toString(), 'original agreement');
    await assert.rejects(() => storage.get({ ...scope, projectId: 'other' }, saved.hash));
    await assert.rejects(() => storage.put({ ...scope, projectId: '../escape' }, bytes));
    await assert.rejects(() => storage.get(scope, '../escape'));
  } finally {
    const target = resolve(root);
    const tempPrefix = resolve(tmpdir()) + sep + 'deliveryproof-test-';
    assert.ok(target.startsWith(tempPrefix), 'Cleanup target must be inside the generated test temp directory');
    await rm(target, { recursive: true, force: true });
  }
});
