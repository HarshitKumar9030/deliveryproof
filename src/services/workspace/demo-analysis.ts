import { z } from 'zod';
import { initialProjects } from '../../demo/data.ts';
import type { EvidenceRecord } from '../../domain/evidence.ts';

export const AnalysisRequest = z.object({
  projectId: z.string().max(100),
  sourceIds: z.array(z.string().max(100)).min(1).max(30),
  reason: z.string().trim().min(10).max(2000),
}).strict();

/** Server-owned seed records only. Browser-provided evidence text is never trusted. */
export function resolveDemoEvidence(input: unknown) {
  const request = AnalysisRequest.parse(input);
  if (new Set(request.sourceIds).size !== request.sourceIds.length) throw new Error('Duplicate sources');
  const project = initialProjects.find(project => project.id === request.projectId && project.status === 'dispute');
  if (!project) throw new Error('This project is not available for server analysis');
  const selected = request.sourceIds.map(id => {
    const source = project.evidence.find(source => source.id === id);
    if (!source) throw new Error('Source does not belong to this project');
    const kind = source.kind.toLowerCase() as EvidenceRecord['kind'];
    return {
      ownerId: 'demo-workspace', projectId: project.id, id: source.id,
      kind, occurredAt: new Date(`${source.date} 00:00:00 UTC`).toISOString(),
      text: source.excerpt, sourceRef: `demo:${project.id}:${source.id}`,
    } satisfies EvidenceRecord;
  });
  return { scope: { ownerId: 'demo-workspace', projectId: project.id }, records: selected, reason: request.reason };
}
