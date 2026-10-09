import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { UTApi } from 'uploadthing/server';

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.APP_ORIGIN || 'http://localhost:3000';
const client = new MongoClient(process.env.MONGODB_URI);
const owners = [];
const emails = [];
const request = (path, cookie = '', method = 'GET', body) => fetch(base + path, {
  method, redirect: 'manual', signal: AbortSignal.timeout(90000),
  headers: { cookie, origin: base, 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
async function account() {
  const email = `handover-qa-${randomUUID()}@example.test`;
  emails.push(email);
  const password = randomUUID() + randomUUID();
  assert.equal((await request('/api/auth/register', '', 'POST', { name: 'Handover QA', email, password })).status, 201);
  const csrfResponse = await request('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  const signed = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST', redirect: 'manual',
    headers: { origin: base, cookie: csrfResponse.headers.getSetCookie().map(s => s.split(';')[0]).join('; '), 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: base + '/dashboard' }),
  });
  const cookie = signed.headers.getSetCookie().map(s => s.split(';')[0]).join('; ');
  const session = await (await request('/api/auth/session', cookie)).json();
  assert.equal(session.user.email, email);
  owners.push(session.user.id);
  return cookie;
}
try {
  const seller = await account();
  const other = await account();
  const created = await request('/api/projects', seller, 'POST', { client: 'Test client', title: 'Logo handover verification', scope: 'Deliver three logo exports in SVG, PNG, and PDF. Provide a colour guide.', amount: 100 });
  assert.equal(created.status, 201);
  const project = await created.json();
  const path = `/api/projects/${project.id}`;
  assert.equal((await request(path + '/confirmation', '', 'POST')).status, 401);
  assert.equal((await request(path + '/confirmation', other, 'POST')).status, 404);
  assert.equal((await request(path + '/confirmation', seller, 'POST')).status, 409);
  assert.equal((await request(path, seller, 'PATCH', { deliveryLink: 'https://files.example.test/logo-v1' })).status, 200);
  const generated = await request(path + '/confirmation', seller, 'POST');
  assert.equal(generated.status, 201);
  const { confirmationUrl } = await generated.json();
  const token = new URL(confirmationUrl).pathname.split('/').at(-1);
  const receiptPath = `/api/delivery/${token}`;
  assert.equal((await request(new URL(confirmationUrl).pathname)).status, 200);
  assert.equal((await request(receiptPath)).status, 200);
  assert.equal((await request(receiptPath, '', 'POST', { name: 'Test client', received: false })).status, 400);
  assert.equal((await request(receiptPath, seller, 'POST', { name: 'Seller', received: true })).status, 403);
  const receipts = await Promise.all([0, 1].map(() => request(receiptPath, '', 'POST', { name: 'Test client', received: true })));
  assert.ok(receipts.every(response => response.status === 200));
  const saved = (await (await request('/api/projects', seller)).json()).projects.find(p => p.id === project.id);
  assert.equal(saved.evidence.filter(e => e.kind === 'Acknowledgement').length, 1);
  assert.equal(saved.paid, false);
  assert.notEqual(saved.status, 'complete');
  assert.equal(saved.deliveryConfirmation.name, 'Test client');
  assert.ok((await (await request(receiptPath)).json()).confirmedAt);
  assert.equal((await request(path, seller, 'PATCH', { deliveryLink: 'https://files.example.test/logo-v2' })).status, 200);
  assert.equal((await request(receiptPath)).status, 404);
  assert.equal((await request(receiptPath, '', 'POST', { name: 'Test client', received: true })).status, 404);
  assert.equal((await request(path + '/confirmation', seller, 'POST')).status, 201);
  assert.equal((await request(path + '/review', other, 'POST')).status, 404);
  assert.equal((await request(path + '/review')).status, 401);
  if (process.argv.includes('--files')) {
    const pdf = await PDFDocument.create(); const page = pdf.addPage([600, 400]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText('ACME brand delivery', { x: 40, y: 340, size: 24, font });
    page.drawText('Primary colour: #224466', { x: 40, y: 290, size: 16, font });
    page.drawText('Typography: not included in this delivery.', { x: 40, y: 250, size: 16, font });
    const bytes = await pdf.save();
    const form = new FormData(); form.set('file', new File([bytes], 'brand-delivery.pdf', { type: 'application/pdf' }));
    const upload = (cookie) => fetch(base + path + '/artifacts', { method: 'POST', headers: { cookie, origin: base }, body: form });
    assert.equal((await upload(other)).status, 404);
    const uploaded = await upload(seller); const result = await uploaded.json();
    assert.equal(uploaded.status, 201, result.error);
    const filePath = path + '/artifacts/' + result.artifact.id;
    assert.equal((await request(filePath)).status, 401);
    assert.equal((await request(filePath, other)).status, 404);
    const downloaded = await request(filePath, seller);
    assert.equal(downloaded.status, 200);
    assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), bytes);
    assert.equal((await (await request('/api/projects', seller)).json()).projects.find(p => p.id === project.id).paid, false);
    console.log('Private PDF upload, exact original download, ownership isolation and unchanged payment state passed.');
  }
  if (process.argv.includes('--ai')) {
    const reviewed = await request(path + '/review', seller, 'POST');
    assert.equal(reviewed.status, 200, 'Live Gemini review did not succeed');
    const { review } = await reviewed.json();
    assert.ok(review.checkpoints.length > 0);
    if (process.argv.includes('--files')) assert.ok(review.checkpoints.some(item => item.fileCitations.length > 0), 'Actual PDF observations must cite a page');
    console.log(`Live Gemini produced ${review.checkpoints.length} cited checkpoints and ${review.nextActions.length} actions.`);
    assert.equal((await (await request(path + '/review', seller)).json()).stale, false);
    await request(path, seller, 'PATCH', { deliveryLink: 'https://files.example.test/logo-v3' });
    assert.equal((await (await request(path + '/review', seller)).json()).stale, true);
  }
  console.log('Handover flow passed: ownership, explicit receipt, idempotency, unpaid state, changed-link invalidation, and public client page.');
} finally {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'deliveryproof');
  const stored = await db.collection('artifacts').find({ ownerId: { $in: owners } }).toArray();
  if (stored.length) await new UTApi().deleteFiles(stored.map(file => file.key));
  for (const collection of ['projects', 'confirmationLinks', 'handoverReviews', 'artifacts']) await db.collection(collection).deleteMany({ ownerId: { $in: owners } });
  await db.collection('users').deleteMany({ email: { $in: emails } });
  await db.collection('login_limits').deleteMany({ email: { $in: emails } });
  await client.close();
}
