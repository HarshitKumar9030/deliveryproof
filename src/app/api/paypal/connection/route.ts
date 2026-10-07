import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { encrypt } from '@/services/paypal/merchant';
import { PayPalService } from '@/services/paypal/paypal.service';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { readJson } from '@/services/workspace/request';
import { z } from 'zod';
export async function GET() {
  const session=await auth(); if(!session?.user?.id) return Response.json({error:'Sign in required'},{status:401});
  try { const db=await database(); return Response.json({connected:!!await db.collection('merchants').findOne({ownerId:session.user.id}),mode:'sandbox'}); }
  catch { return Response.json({error:'Database unavailable'},{status:503}); }
}
export async function POST(request:Request) {
  if(!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  const session=await auth(); if(!session?.user?.id) return Response.json({error:'Sign in required'},{status:401});
  if(!takeLimit('merchant:'+session.user.id,5,60000)) return Response.json({error:'Please try again shortly'},{status:429});
  try {
    const input=z.object({clientId:z.string().trim().min(10).max(512),clientSecret:z.string().trim().min(10).max(512)}).strict().parse(await readJson(request,4096));
    const db=await database();
    if(await db.collection('payments').findOne({ownerId:session.user.id,state:{$ne:'complete'}})) return Response.json({error:'Finish your pending payment before changing the PayPal app.'},{status:409});
    await new PayPalService(input).checkConnection();
    await db.collection('merchants').createIndex({ownerId:1},{unique:true});
    await db.collection('merchants').updateOne({ownerId:session.user.id},{$set:{clientId:encrypt(input.clientId),clientSecret:encrypt(input.clientSecret),updatedAt:new Date()}},{upsert:true});
    return Response.json({connected:true,mode:'sandbox'});
  } catch { return Response.json({error:'Unable to connect. Check your sandbox app credentials and try again.'},{status:400}); }
}
