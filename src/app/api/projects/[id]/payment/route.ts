import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { encrypt, decrypt, merchant } from '@/services/paypal/merchant';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
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
    const payments=db.collection('payments');
    await payments.createIndex({ownerId:1,projectId:1},{unique:true});
    await payments.createIndex({tokenHash:1},{unique:true});
    const payment=await payments.findOneAndUpdate({ownerId:session.user.id,projectId:id},{$setOnInsert:{
      ownerId:session.user.id,projectId:id,tokenHash:createHash('sha256').update(token).digest('hex'),token:encrypt(token),
      createRequestId:randomUUID(),captureRequestId:randomUUID(),state:'pending',value:project.amount.toFixed(2),expiresAt:new Date(Date.now()+7*86400000),
    }},{upsert:true,returnDocument:'after'});
    if(!payment || payment.expiresAt.getTime()<Date.now()) return Response.json({error:'Payment link expired. Create a new project payment.'},{status:409});
    const origin=process.env.APP_ORIGIN || request.headers.get('origin')!;
    const paymentUrl=origin+'/pay/'+decrypt(payment.token);
    if(!payment.orderId) {
      const order=await paypal.createOrder({projectId:id,currency:'USD',value:payment.value,requestId:payment.createRequestId,returnUrl:paymentUrl+'?approved=1',cancelUrl:paymentUrl+'?cancelled=1'});
      const approvalUrl=order.links?.find(link=>link.rel==='payer-action'||link.rel==='approve')?.href;
      if(!approvalUrl || !['www.sandbox.paypal.com','sandbox.paypal.com'].includes(new URL(approvalUrl).hostname)) throw new Error('PayPal approval URL unavailable');
      await payments.updateOne({_id:payment._id},{$set:{orderId:order.id,approvalUrl}});
    }
    return Response.json({paymentUrl,mode:'sandbox'});
  } catch { return Response.json({error:'Could not create payment. Connect your PayPal sandbox app in Account settings, then retry.'},{status:502}); }
}
