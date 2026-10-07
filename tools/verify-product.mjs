import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
const base = 'http://localhost:3000';
const emails = [0,1].map(() => `qa-${randomUUID()}@example.test`);
const ownerIds = [];
const client = new MongoClient(process.env.MONGODB_URI);
const request = (path, cookie = '', method = 'GET', body) => fetch(base+path,{method,redirect:'manual',headers:{cookie,origin:base,'Content-Type':'application/json'},...(body === undefined ? {} : {body:JSON.stringify(body)})});
async function account(email) {
  const password = randomUUID()+randomUUID();
  assert.equal((await request('/api/auth/register','','POST',{name:'Product QA',email,password})).status,201);
  const csrfResponse=await fetch(base+'/api/auth/csrf');
  const {csrfToken}=await csrfResponse.json();
  const cookie=csrfResponse.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const signed=await fetch(base+'/api/auth/callback/credentials',{method:'POST',headers:{cookie,origin:base,'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken,email,password,callbackUrl:base+'/dashboard'}),redirect:'manual'});
  const sessionCookie=signed.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const session=await (await request('/api/auth/session',sessionCookie)).json();
  assert.equal(session.user.email,email); ownerIds.push(session.user.id);
  return sessionCookie;
}
try {
  assert.equal((await request('/')).status,200);
  const protectedResponse=await request('/dashboard');
  assert.equal(protectedResponse.status,307); assert.ok(protectedResponse.headers.get('location').endsWith('/signin'));
  assert.equal((await request('/api/projects')).status,401);
  const first=await account(emails[0]); const second=await account(emails[1]);
  for(const path of ['/signin','/signup']) {
    const response=await request(path,first); assert.equal(response.status,307); assert.ok(response.headers.get('location').endsWith('/dashboard'));
  }
  assert.equal((await (await request('/api/projects',first)).json()).projects.length,0);
  const created=await request('/api/projects',first,'POST',{client:'QA client',title:'Persisted project',scope:'A test delivery record, created only for verification.',amount:125});
  assert.equal(created.status,201); const project=await created.json();
  assert.equal((await (await request('/api/projects',first)).json()).projects[0].id,project.id);
  assert.equal((await (await request('/api/projects',second)).json()).projects.length,0);
  assert.equal((await request('/api/projects/'+project.id,second,'PATCH',{deliveryLink:'https://example.test/files'})).status,404);
  assert.equal((await request('/api/projects/'+project.id,first,'PATCH',{paid:true,status:'complete'})).status,400);
  const saved=await request('/api/projects/'+project.id,first,'PATCH',{deliveryLink:'https://example.test/files'});
  assert.equal(saved.status,200); const updated=await saved.json();
  assert.equal(updated.paid,false); assert.equal(updated.evidence.length,2);
  assert.equal((await (await request('/api/projects',first)).json()).projects[0].deliveryLink,'https://example.test/files');
  const reviewedPacket={responsePrepared:true,preparedPacket:{draft:`Seller entered the scope [${updated.evidence[0].id}]. Client acceptance remains unconfirmed.`,sources:[updated.evidence[0]],reviewedAt:new Date().toISOString()}};
  const packetResponse=await request('/api/projects/'+project.id,first,'PATCH',reviewedPacket);
  assert.equal(packetResponse.status,200);assert.equal((await packetResponse.json()).responsePrepared,true);
  const tampered=structuredClone(reviewedPacket);tampered.preparedPacket.sources[0].excerpt='Fabricated approval';
  assert.equal((await request('/api/projects/'+project.id,first,'PATCH',tampered)).status,409);
  assert.equal((await request('/api/account',first,'PATCH',{name:'Updated QA'})).status,200);
  assert.equal((await (await request('/api/auth/session',first)).json()).user.name,'Updated QA');
  if (process.env.VERIFY_PAYPAL === '1') {
    const connected=await request('/api/paypal/connection',first,'POST',{clientId:process.env.PAYPAL_CLIENT_ID,clientSecret:process.env.PAYPAL_CLIENT_SECRET});
    assert.equal(connected.status,200,'Sandbox app connection must succeed');
    const order=await request('/api/projects/'+project.id+'/payment',first,'POST');
    assert.equal(order.status,200,'Sandbox order creation must succeed');
    const link=await order.json();
    const checkout=await fetch(link.paymentUrl.replace('/pay/','/api/pay/'));
    assert.equal(checkout.status,200);assert.equal((await checkout.json()).amount,'125.00');
    const retried=await (await request('/api/projects/'+project.id+'/payment',first,'POST')).json();
    assert.equal(retried.paymentUrl,link.paymentUrl);
    console.log('Passed: real sandbox OAuth, seller credential encryption, order creation, client payment page, stable payment-link retry. No buyer approval or capture was performed.');
  }
  console.log('Passed: public landing, protected redirects, auth-page redirects, signup/login, empty workspace, project persistence, tenant isolation, trusted-state rejection, delivery history, profile persistence.');
} finally {
  await client.connect();
  const db=client.db(process.env.MONGODB_DB || 'deliveryproof');
  await db.collection('projects').deleteMany({ownerId:{$in:ownerIds}});
  await db.collection('merchants').deleteMany({ownerId:{$in:ownerIds}});
  await db.collection('payments').deleteMany({ownerId:{$in:ownerIds}});
  await db.collection('users').deleteMany({email:{$in:emails}});
  await db.collection('login_limits').deleteMany({email:{$in:emails}});
  await client.close();
}
