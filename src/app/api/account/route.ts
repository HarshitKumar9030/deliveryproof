import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { readJson } from '@/services/workspace/request';
import { sameOrigin } from '@/services/workspace/session';
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  const session = await auth();
  if (!session?.user?.id) return Response.json({error:'Sign in required'},{status:401});
  let input;
  try { input = z.object({name:z.string().trim().min(1).max(80)}).strict().parse(await readJson(request,4096)); }
  catch { return Response.json({error:'Enter a name between 1 and 80 characters.'},{status:400}); }
  try {
    const db = await database();
    const result = await db.collection('users').updateOne({_id:new ObjectId(session.user.id)},{$set:{name:input.name}});
    if (!result.matchedCount) return Response.json({error:'Account unavailable'},{status:404});
    return Response.json({ok:true});
  } catch { return Response.json({error:'Unable to save your account.'},{status:503}); }
}
