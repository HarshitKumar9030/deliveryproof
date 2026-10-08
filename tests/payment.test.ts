import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedCapture, verifyApprovedOrder, verifyRefreshableOrder } from '../src/domain/payment.ts';
import { encrypt, decrypt } from '../src/services/paypal/merchant.ts';
const completed={id:'ORDER1',status:'COMPLETED',purchase_units:[{custom_id:'project1',amount:{currency_code:'USD',value:'125.00'},payments:{captures:[{id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:'USD',value:'125.00'}}]}}]};
test('refresh allows unpaid orders and rejects approved, completed, unknown, or mismatched orders',()=>{
 for(const status of ['CREATED','PAYER_ACTION_REQUIRED','VOIDED']) verifyRefreshableOrder({id:'ORDER1',status},'ORDER1');
 for(const status of ['APPROVED','COMPLETED','SAVED','UNKNOWN']) assert.throws(()=>verifyRefreshableOrder({id:'ORDER1',status},'ORDER1'));
 assert.throws(()=>verifyRefreshableOrder({id:'OTHER',status:'CREATED'},'ORDER1'));
});
test('capture must be completed and match order, project, amount, and currency',()=>{
 const expected={orderId:'ORDER1',projectId:'project1',value:'125.00'};
 const approved={...completed,status:'APPROVED',intent:'CAPTURE'};
 verifyApprovedOrder(approved,expected);
 assert.throws(()=>verifyApprovedOrder(approved,{...expected,value:'1.00'}));
 assert.equal(verifiedCapture(completed,expected).id,'CAPTURE1');
 for(const field of ['orderId','projectId','value']) assert.throws(()=>verifiedCapture(completed,{...expected,[field]:'wrong'}));
 assert.throws(()=>verifiedCapture({...completed,status:'APPROVED'},expected));
 const foreign=structuredClone(completed);foreign.purchase_units[0]!.payments.captures[0]!.amount.currency_code='EUR';assert.throws(()=>verifiedCapture(foreign,expected));
 const partial=structuredClone(completed);partial.purchase_units[0]!.payments.captures[0]!.status='PENDING';assert.throws(()=>verifiedCapture(partial,expected));
});
test('merchant secrets are authenticated ciphertext with independent nonces',()=>{
 const previous=process.env.APP_ENCRYPTION_KEY; process.env.APP_ENCRYPTION_KEY='a'.repeat(64);
 try {
  const first=encrypt('synthetic-test-secret');assert.notEqual(first,encrypt('synthetic-test-secret'));assert.equal(decrypt(first),'synthetic-test-secret');
  const parts=first.split('.');const bytes=Buffer.from(parts[2]!,'base64url');bytes[0]=bytes[0]!^1;parts[2]=bytes.toString('base64url');assert.throws(()=>decrypt(parts.join('.')));
 } finally {if(previous===undefined)delete process.env.APP_ENCRYPTION_KEY;else process.env.APP_ENCRYPTION_KEY=previous;}
});
