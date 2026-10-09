import { z } from 'zod';
import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { sameOrigin, takeLimit } from '@/services/workspace/session';
import { ArtifactError, boundedBytes, inspectArtifact, storeArtifact, assertReviewBudget } from '@/services/storage/artifacts';
import { MAX_ARTIFACT_BYTES, MAX_ARTIFACTS } from '@/domain/artifacts';
import type { Project } from '@/domain/projects';

export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await context.params; const ownerId = session.user.id;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Project unavailable' }, { status: 404 });
  if (!takeLimit('artifact:' + ownerId, 12, 60000)) return Response.json({ error: 'Please wait before uploading again.' }, { status: 429 });
  try {
    const db = await database(); const projects = db.collection<Project & { ownerId: string }>('projects');
    const project = await projects.findOne({ id, ownerId });
    if (!project) return Response.json({ error: 'Project unavailable' }, { status: 404 });
    if ((project.artifacts?.length || 0) >= MAX_ARTIFACTS) throw new ArtifactError('Up to eight original files can be preserved per project.');
    const body = await boundedBytes(request.body, MAX_ARTIFACT_BYTES + 16384);
    const form = await new Response(body, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
    const file = form.get('file');
    if (!(file instanceof File) || form.getAll('file').length !== 1) throw new ArtifactError('Choose one file to upload.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const artifact = await inspectArtifact(file.name, bytes);
    assertReviewBudget([...(project.artifacts || []), artifact]);
    const key = await storeArtifact(artifact, bytes);
    // Preserve the original before attaching it; a racing upload cannot exceed project limits.
    await db.collection('artifacts').insertOne({ ...artifact, key, ownerId, projectId: id });
    const updated = await projects.updateOne({ id, ownerId, artifacts: project.artifacts ?? { $exists: false } }, { $push: { artifacts: artifact, evidence: { id: artifact.id, kind: 'Artifact', title: artifact.name, date: artifact.uploadedAt, excerpt: `Original review file: ${artifact.name}. ${artifact.bytes} bytes. SHA-256: ${artifact.sha256}. Uploaded by the seller; this alone does not establish client receipt.` } } });
    if (!updated.modifiedCount) return Response.json({ error: 'Project changed during upload. Refresh before trying again.' }, { status: 409 });
    return Response.json({ artifact }, { status: 201 });
  } catch (error) {
    console.error('Artifact upload failed:', error instanceof Error ? error.name : 'Unknown error');
    return Response.json({ error: error instanceof ArtifactError ? error.message : 'Upload failed. Check file storage and encryption configuration and try again.' }, { status: error instanceof ArtifactError ? 400 : 503 });
  }
}
