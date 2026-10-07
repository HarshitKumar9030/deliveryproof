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
    if(order.status==='APPROVED') {
      verifyApprovedOrder(order,{orderId:payment.orderId,projectId:project.id,value:payment.value});
      order=await paypal.captureOrder(payment.orderId,payment.captureRequestId);
    }
    if(order.status!=='COMPLETED') return Response.json({error:'Approve the payment in PayPal before completing it here.'},{status:409});
    const capture=verifiedCapture(order,{orderId:payment.orderId,projectId:project.id,value:payment.value});
    await db.collection<Project & {ownerId:string}>('projects').updateOne({id:project.id,ownerId:payment.ownerId,paid:false},{$set:{paid:true,status:project.status==='dispute'?'dispute':project.deliveryLink?'delivered':'ready'},$push:{evidence:{id:capture.id,kind:'Payment',title:'PayPal sandbox payment captured',date:new Date().toISOString(),excerpt:`PayPal confirmed capture ${capture.id} for ${capture.amount.value} USD. Order ${payment.orderId}, project ${project.id}. Sandbox test funds.`}}});
    await db.collection('payments').updateOne({_id:payment._id},{$set:{state:'complete',captureId:capture.id,completedAt:new Date()}});
    return Response.json({paid:true});
  } catch { return Response.json({error:'Payment could not be verified. Retry to reconcile the same PayPal order; no new order will be created.'},{status:502}); }
}
