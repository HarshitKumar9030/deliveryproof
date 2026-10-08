import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { readJson } from '@/services/workspace/request';
import { createServices } from '@/services/registry';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import type { Project } from '@/domain/projects';
import type { EvidenceRecord } from '@/domain/evidence';
const schema = z.object({ projectId: z.uuid(), sourceIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)).min(1).max(100), reason: z.string().trim().min(10).max(2000) }).strict();
export async function POST(request: Request) {
 const reply = (error: string, status: number) => Response.json({error}, {status});
 if (!sameOrigin(request)) return reply('Invalid origin',403);
 const session = await auth(); if (!session?.user?.id) return reply('Sign in required',401);
 let input;
 try { input = schema.parse(await readJson(request,16384)); } catch { return reply('Choose your evidence and provide a dispute reason.',400); }
 if (new Set(input.sourceIds).size !== input.sourceIds.length) return reply('Choose distinct records.',400);
 if (!takeLimit('analysis:'+session.user.id,6,60000)) return reply('Please wait before another analysis.',429);
 try {
  const db = await database();
  const project = await db.collection<Project & {ownerId:string}>('projects').findOne({id:input.projectId,ownerId:session.user.id});
  if (!project) return reply('Project unavailable',404);
  const sources = project.evidence.filter(e=>input.sourceIds.includes(e.id));
  if (sources.length !== input.sourceIds.length) return reply('Evidence unavailable',400);
  const scope = {ownerId:session.user.id,projectId:project.id};
  const records: EvidenceRecord[] = sources.map(e=>({...scope,id:e.id,kind:e.kind.toLowerCase() as EvidenceRecord['kind'],occurredAt:e.date,text:e.excerpt,sourceRef:'project:'+project.id+':'+e.id}));
  const analysis = await createServices().ai().analyse(scope,input.reason,records);
  await db.collection('analyses').insertOne({...scope,sourceIds:input.sourceIds,reason:input.reason,analysis,createdAt:new Date()});
  return Response.json({analysis,sourceIds:input.sourceIds},{headers:{'Cache-Control':'no-store'}});
 } catch { return reply('Analysis could not complete. Check database and AI configuration, then retry.',502); }
}
