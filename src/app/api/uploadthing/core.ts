import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';

const f = createUploadthing();
export const uploadRouter = {
  evidence: f({ image: { maxFileSize: '8MB', maxFileCount: 4 }, pdf: { maxFileSize: '8MB', maxFileCount: 4 } })
    .input(z.object({ projectId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user?.id) throw new UploadThingError('Sign in to upload evidence');
      const db = await database();
      if (!await db.collection('users').findOne({ _id: new ObjectId(session.user.id) })) throw new UploadThingError('Account unavailable');
      if (!await db.collection('projects').findOne({ id: input.projectId, ownerId: session.user.id })) throw new UploadThingError('Project unavailable');
      return { ownerId: session.user.id, projectId: input.projectId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const db = await database();
      await db.collection('uploads').createIndex({ key: 1 }, { unique: true });
      await db.collection('uploads').updateOne({ key: file.key }, { $setOnInsert: {
        ...metadata, key: file.key, name: file.name, size: file.size, type: file.type,
        uploadedAt: new Date(),
      } }, { upsert: true });
      return { key: file.key };
    }),
} satisfies FileRouter;
export type UploadRouter = typeof uploadRouter;
