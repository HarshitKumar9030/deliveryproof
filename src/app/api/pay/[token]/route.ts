import { createHash } from 'node:crypto';
import { database } from '@/services/database/mongodb';
import { merchant } from '@/services/paypal/merchant';
import { verifiedCapture, verifyApprovedOrder } from '@/domain/payment';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import type { Project } from '@/domain/projects';
async function lookup(token:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid link');
  const db=await database(); const payment=await db.collection('payments').findOne({tokenHash:createHash('sha256').update(token).digest('hex')});
  if(!payment || payment.expiresAt.getTime()<Date.now()) throw new Error('Expired link');
  const project=await db.collection('projects').findOne({ownerId:payment.ownerId,id:payment.projectId});
  if(!project) throw new Error('Project unavailable');
  return {db,payment,project};
}
export async function GET(_request:Request,context:{params:Promise<{token:string}>}) {
  try {
    const {token}=await context.params; const {payment,project}=await lookup(token);
    if(!project.paid && payment.orderId) {
      try {
        const order=await (await merchant(payment.ownerId)).getOrderIfAvailable(payment.orderId);
        if(!order) return Response.json({error:'This PayPal checkout has expired or is unavailable. Ask the seller to use New payment and share the fresh link.'},{status:410,headers:{'Cache-Control':'no-store'}});
      } catch {return Response.json({error:'PayPal is unavailable right now. Reload this page to try again.'},{status:502,headers:{'Cache-Control':'no-store'}});}
    }
    return Response.json({title:project.title,client:project.client,amount:payment.value,currency:'USD',paid:project.paid,approvalUrl:payment.approvalUrl,mode:'sandbox'},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'This payment link is unavailable or has expired.'},{status:404}); }
}
export async function POST(request:Request,context:{params:Promise<{token:string}>}) {
  if(!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  try {
    const {token}=await context.params; const {db,payment,project}=await lookup(token);
    if(project.paid) {
      await db.collection('payments').updateOne({_id:payment._id},{$set:{state:'complete'}});
      return Response.json({paid:true});
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
    if(order.status==='APPROVED') {
      verifyApprovedOrder(order,{orderId:payment.orderId,projectId:project.id,value:payment.value});
      order=await paypal.captureOrder(payment.orderId,payment.captureRequestId);
    }
    if(order.status!=='COMPLETED') return Response.json({error:'Approve the payment in PayPal before completing it here.'},{status:409});
    const capture=verifiedCapture(order,{orderId:payment.orderId,projectId:project.id,value:payment.value});
    await db.collection<Project & {ownerId:string}>('projects').updateOne({id:project.id,ownerId:payment.ownerId,paid:false},{$set:{paid:true,status:project.status==='dispute'?'dispute':project.deliveryLink?'delivered':'ready'},$push:{evidence:{id:capture.id,kind:'Payment',title:'PayPal sandbox payment captured',date:new Date().toISOString(),excerpt:`PayPal confirmed capture ${capture.id} for ${capture.amount.value} USD. Order ${payment.orderId}, project ${project.id}. Sandbox test funds.`}}});
    await db.collection('payments').updateOne({_id:payment._id},{$set:{state:'complete',captureId:capture.id,completedAt:new Date()}});
    await db.collection('projects').updateOne({id:project.id,ownerId:payment.ownerId,paid:true,status:{$ne:'dispute'},deliveryLink:{$ne:''},$expr:{$eq:['$deliveryLink','$deliveryConfirmation.deliveryLink']}},{$set:{status:'complete'}});
    return Response.json({paid:true});
  } catch { return Response.json({error:'Payment could not be verified. Retry to reconcile the same PayPal order; no new order will be created.'},{status:502}); }
}
