import { createHash } from 'node:crypto';
import { database } from '@/services/database/mongodb';
import { merchant } from '@/services/paypal/merchant';
import { verifiedAuthorization, verifiedCapture, verifyApprovedOrder } from '@/domain/payment';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import type { Project } from '@/domain/projects';
import type { PaymentHold } from '@/domain/release';
async function lookup(token:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid link');
  const db=await database(); const payment=await db.collection('payments').findOne({tokenHash:createHash('sha256').update(token).digest('hex')});
  if(!payment || payment.expiresAt.getTime()<Date.now()) throw new Error('Expired link');
  const project=await db.collection<Project & {ownerId:string}>('projects').findOne({ownerId:payment.ownerId,id:payment.projectId});
  if(!project) throw new Error('Project unavailable');
  return {db,payment,project};
}
export async function GET(_request:Request,context:{params:Promise<{token:string}>}) {
  try {
    const {token}=await context.params; const {payment,project}=await lookup(token);
    // Once PayPal reports the buyer's approval, the checkout must not offer approval again.
    let approved=false;
    if(!project.paid && !project.hold && payment.orderId) {
      try {
        const order=await (await merchant(payment.ownerId)).getOrderIfAvailable(payment.orderId);
        if(!order) return Response.json({error:'This PayPal checkout has expired or is unavailable. Ask the seller to use New payment and share the fresh link.'},{status:410,headers:{'Cache-Control':'no-store'}});
        approved=['APPROVED','COMPLETED'].includes(order.status);
      } catch {return Response.json({error:'PayPal is unavailable right now. Reload this page to try again.'},{status:502,headers:{'Cache-Control':'no-store'}});}
    }
    return Response.json({title:project.title,client:project.client,amount:payment.value,currency:'USD',paid:project.paid,
      intent:payment.intent??'CAPTURE',hold:project.hold?{state:project.hold.state,expiresAt:project.hold.expiresAt??null}:null,
      approved,approvalUrl:approved?null:payment.approvalUrl,mode:'sandbox'},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'This payment link is unavailable or has expired.'},{status:404}); }
}
export async function POST(request:Request,context:{params:Promise<{token:string}>}) {
  if(!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  try {
    const {token}=await context.params; const {db,payment,project}=await lookup(token);
    const hold=payment.intent==='AUTHORIZE';
    if(project.paid || project.hold) {
      await db.collection('payments').updateOne({_id:payment._id},{$set:{state:project.paid?'complete':'held'}});
      return Response.json({paid:project.paid,held:!!project.hold});
    }
    if(!payment.orderId) throw new Error('Order unavailable');
    if(!takeLimit('capture:'+payment.orderId,6,60000)) return Response.json({error:'Please wait before trying again'},{status:429});
    const paypal=await merchant(payment.ownerId);
    let order=await paypal.getOrder(payment.orderId);
    if(!['APPROVED','COMPLETED'].includes(order.status)) return Response.json({error:'Approve the payment in PayPal before completing it here.'},{status:409});
    // Atomically exclude link replacement. Keep this marker even after a
    // timeout: the same order is the only safe capture retry target.
    const claimed=await db.collection('payments').updateOne({_id:payment._id,tokenHash:payment.tokenHash,orderId:payment.orderId,
      $or:[{refreshUntil:{$exists:false}},{refreshUntil:{$lte:new Date()}}],
    },{$set:{captureAttemptedAt:new Date()}});
    if(!claimed.matchedCount) return Response.json({error:'This link was refreshed or is being updated. Ask the seller for the latest payment link.'},{status:409});
    const expected={orderId:payment.orderId,projectId:project.id,value:payment.value};
    if(hold) {
      // Proof-gated: PayPal holds the funds. Nothing reaches the seller until the release gate passes.
      if(order.status==='APPROVED') {
        verifyApprovedOrder(order,{...expected,intent:'AUTHORIZE'});
        order=await paypal.authorizeOrder(payment.orderId,payment.captureRequestId);
      }
      if(order.status!=='COMPLETED') return Response.json({error:'Approve the payment in PayPal before completing it here.'},{status:409});
      const authorization=verifiedAuthorization(order,expected);
      const now=new Date().toISOString();
      const record:PaymentHold={orderId:payment.orderId,authorizationId:authorization.id,value:authorization.amount.value,authorizedAt:now,expiresAt:authorization.expiration_time,state:'held'};
      await db.collection<Project & {ownerId:string}>('projects').updateOne({id:project.id,ownerId:payment.ownerId,paid:false,hold:{$exists:false}},{$set:{hold:record,status:project.status==='dispute'?'dispute':project.deliveryLink?'delivered':'ready'},$push:{evidence:{id:authorization.id,kind:'Payment',title:'PayPal funds authorized and held',date:now,excerpt:`PayPal authorized ${authorization.amount.value} USD (authorization ${authorization.id}, order ${payment.orderId}) for project ${project.id}. Funds are held, not captured: they are released to the seller only after delivery, client receipt and a current AI scope review pass the release gate. Sandbox test funds.`}}});
      await db.collection('payments').updateOne({_id:payment._id},{$set:{state:'held',authorizationId:authorization.id,authorizedAt:new Date()}});
      return Response.json({paid:false,held:true});
    }
    if(order.status==='APPROVED') {
      verifyApprovedOrder(order,expected);
      order=await paypal.captureOrder(payment.orderId,payment.captureRequestId);
    }
    if(order.status!=='COMPLETED') return Response.json({error:'Approve the payment in PayPal before completing it here.'},{status:409});
    const capture=verifiedCapture(order,expected);
    await db.collection<Project & {ownerId:string}>('projects').updateOne({id:project.id,ownerId:payment.ownerId,paid:false},{$set:{paid:true,status:project.status==='dispute'?'dispute':project.deliveryLink?'delivered':'ready'},$push:{evidence:{id:capture.id,kind:'Payment',title:'PayPal sandbox payment captured',date:new Date().toISOString(),excerpt:`PayPal confirmed capture ${capture.id} for ${capture.amount.value} USD. Order ${payment.orderId}, project ${project.id}. Sandbox test funds.`}}});
    await db.collection('payments').updateOne({_id:payment._id},{$set:{state:'complete',captureId:capture.id,completedAt:new Date()}});
    await db.collection('projects').updateOne({id:project.id,ownerId:payment.ownerId,paid:true,status:{$ne:'dispute'},deliveryLink:{$ne:''},$expr:{$eq:['$deliveryLink','$deliveryConfirmation.deliveryLink']}},{$set:{status:'complete'}});
    return Response.json({paid:true});
  } catch { return Response.json({error:'Payment could not be verified. Retry to reconcile the same PayPal order; no new order will be created.'},{status:502}); }
}
