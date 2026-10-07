import { MongoServerError } from 'mongodb';
import { z } from 'zod';
import { database } from '@/services/database/mongodb';
import { hashPassword } from '@/services/database/password';
import { readJson } from '@/services/workspace/request';
import { sameOrigin } from '@/services/workspace/session';
const schema = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().pipe(z.email().max(254)).transform(s => s.toLowerCase()), password: z.string().min(12).max(128) }).strict();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Please submit from DeliveryProof.' }, { status: 403 });
  let parsed;
  try { parsed = schema.safeParse(await readJson(request, 4096)); } catch { return Response.json({ error: 'Check your details and try again.' }, { status: 400 }); }
  if (!parsed.success) return Response.json({ error: 'Use a valid email and a password of at least 12 characters.' }, { status: 400 });
  try {
    const db = await database();
    const limits = db.collection<{ _id: string; count: number; expiresAt: Date }>('registration_limits');
    await limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const bucket = Math.floor(Date.now() / 3600000);
    const limit = await limits.findOneAndUpdate({ _id: `registration-${bucket}` }, { $inc: { count: 1 }, $set: { expiresAt: new Date(Date.now() + 7200000) } }, { upsert: true, returnDocument: 'after' });
    if ((limit?.count ?? 0) > 100) return Response.json({ error: 'Account creation is busy. Please try later.' }, { status: 429 });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('login_limits').createIndex({ email: 1, bucket: 1 }, { unique: true });
    await db.collection('login_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const { password, ...profile } = parsed.data;
    await db.collection('users').insertOne({ ...profile, passwordHash: await hashPassword(password), createdAt: new Date() });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return Response.json({ error: 'Unable to create this account. Try signing in instead.' }, { status: 409 });
    return Response.json({ error: 'Account service unavailable. Please try again shortly.' }, { status: 503 });
  }
}
