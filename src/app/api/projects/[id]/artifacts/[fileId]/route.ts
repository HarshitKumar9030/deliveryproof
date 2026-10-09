import { auth } from '@/auth';
import { database } from '@/services/database/mongodb';
import { readArtifact } from '@/services/storage/artifacts';
import type { Artifact } from '@/domain/artifacts';

export async function GET(_request: Request, context: { params: Promise<{ id: string; fileId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const { id, fileId } = await context.params;
  try {
    const db = await database();
    const file = await db.collection<Artifact & { key: string; ownerId: string; projectId: string }>('artifacts').findOne({ id: fileId, projectId: id, ownerId: session.user.id });
    if (!file || !await db.collection('projects').findOne({ id, ownerId: session.user.id, 'artifacts.id': fileId })) return Response.json({ error: 'File unavailable' }, { status: 404 });
    const { content } = await readArtifact(file, file.key);
    return new Response(Uint8Array.from(content), { headers: { 'Content-Type': file.mimeType, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch { return Response.json({ error: 'Original file could not be retrieved.' }, { status: 503 }); }
}
