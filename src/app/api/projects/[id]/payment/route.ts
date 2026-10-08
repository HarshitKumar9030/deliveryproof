import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { encrypt, decrypt, merchant } from '@/services/paypal/merchant';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { verifyRefreshableOrder } from '@/domain/payment';
type PaymentRecord = {
  ownerId:string; projectId:string; tokenHash:string; token:string;
  createRequestId:string; captureRequestId:string; state:string; value:string;
  expiresAt:Date; orderId?:string; approvalUrl?:string;
  refreshLock?:string; refreshUntil?:Date; refreshedAt?:Date; captureAttemptedAt?:Date;
  previousOrders?:{orderId:string;replacedAt:Date}[];
};
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {
  if(!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  const session=await auth(); if(!session?.user?.id) return Response.json({error:'Sign in required'},{status:401});
  const {id}=await context.params;
  if(!takeLimit('order:'+session.user.id,10,60000)) return Response.json({error:'Please try again shortly'},{status:429});
  try {
    const db=await database(); const project=await db.collection('projects').findOne({id,ownerId:session.user.id});
    if(!project) return Response.json({error:'Project unavailable'},{status:404});
    if(project.paid) return Response.json({error:'This project is already paid'},{status:409});
    const paypal=await merchant(session.user.id);
    const token=randomBytes(32).toString('base64url');
    const payments=db.collection<PaymentRecord>('payments');
    await payments.createIndex({ownerId:1,projectId:1},{unique:true});
    await payments.createIndex({tokenHash:1},{unique:true});
    let payment=await payments.findOneAndUpdate({ownerId:session.user.id,projectId:id},{$setOnInsert:{
      ownerId:session.user.id,projectId:id,tokenHash:createHash('sha256').update(token).digest('hex'),token:encrypt(token),
      createRequestId:randomUUID(),captureRequestId:randomUUID(),state:'pending',value:project.amount.toFixed(2),expiresAt:new Date(Date.now()+7*86400000),
    }},{upsert:true,returnDocument:'after'});
    if(!payment) throw new Error('Payment unavailable');
    const refresh=new URL(request.url).searchParams.get('refresh')==='1';
    const lockId=randomUUID();
    // Capture claims the same document before talking to PayPal. Once attempted,
    // its outcome must be reconciled rather than replaced with a second order.
    const locked=await payments.findOneAndUpdate({_id:payment._id,
      ...(refresh?{captureAttemptedAt:{$exists:false},state:'pending'}:{}),
      $or:[{refreshUntil:{$exists:false}},{refreshUntil:{$lte:new Date()}}],
    },{$set:{refreshLock:lockId,refreshUntil:new Date(Date.now()+120000)}},{returnDocument:'after'});
    if(!locked) return Response.json({error:'A payment is being processed. Complete or reconcile the existing payment before refreshing.'},{status:409});
    payment=locked;
    try {
    if(refresh && payment.orderId) {
      try {
        const previousOrder=await paypal.getOrderIfAvailable(payment.orderId);
        if(previousOrder) verifyRefreshableOrder(previousOrder,payment.orderId);
      }
      catch {return Response.json({error:'The existing payment is approved, completed, or could not be checked. Complete or verify it before generating another.'},{status:409});}
      const freshToken=randomBytes(32).toString('base64url');
      payment=await payments.findOneAndUpdate({_id:payment._id,refreshLock:lockId,refreshUntil:{$gt:new Date()},captureAttemptedAt:{$exists:false}},{$set:{
        tokenHash:createHash('sha256').update(freshToken).digest('hex'),token:encrypt(freshToken),
        createRequestId:randomUUID(),captureRequestId:randomUUID(),value:project.amount.toFixed(2),
        expiresAt:new Date(Date.now()+7*86400000),refreshedAt:new Date(),
      },$unset:{orderId:'',approvalUrl:''},$push:{previousOrders:{orderId:payment.orderId,replacedAt:new Date()}}},{returnDocument:'after'});
      if(!payment) throw new Error('Payment changed');
    }
    else if(refresh && !payment.orderId) {
      // Retry an interrupted creation with its original idempotency key.
      const expiresAt=new Date(Date.now()+7*86400000);
      await payments.updateOne({_id:payment._id,refreshLock:lockId},{$set:{expiresAt}});
      payment.expiresAt=expiresAt;
    }
    if(payment.expiresAt.getTime()<Date.now()) return Response.json({error:'Payment link expired. Use New payment to generate a fresh checkout.'},{status:409});
    const origin=process.env.APP_ORIGIN || request.headers.get('origin')!;
    const paymentUrl=origin+'/pay/'+decrypt(payment.token);
    if(!payment.orderId) {
      const order=await paypal.createOrder({projectId:id,currency:'USD',value:payment.value,requestId:payment.createRequestId,returnUrl:paymentUrl+'?approved=1',cancelUrl:paymentUrl+'?cancelled=1'});
      const approvalUrl=order.links?.find(link=>link.rel==='payer-action'||link.rel==='approve')?.href;
      if(!approvalUrl || !['www.sandbox.paypal.com','sandbox.paypal.com'].includes(new URL(approvalUrl).hostname)) throw new Error('PayPal approval URL unavailable');
      const saved=await payments.updateOne({_id:payment._id,refreshLock:lockId},{$set:{orderId:order.id,approvalUrl}});
      if(!saved.matchedCount) throw new Error('Payment changed');
    }
    return Response.json({paymentUrl,mode:'sandbox'});
    } finally {await payments.updateOne({_id:locked._id,refreshLock:lockId},{$unset:{refreshLock:'',refreshUntil:''}});}
  } catch { return Response.json({error:'Could not create payment. Connect your PayPal sandbox app in Account settings, then retry.'},{status:502}); }
}
