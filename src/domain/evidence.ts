import { z } from 'zod';

export const ScopeSchema = z.object({
  ownerId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  projectId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
});
export type EvidenceScope = z.infer<typeof ScopeSchema>;

export const EvidenceSchema = ScopeSchema.extend({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  kind: z.enum(['agreement', 'delivery', 'access', 'acknowledgement', 'message']),
  occurredAt: z.iso.datetime(),
  text: z.string().min(1).max(100_000),
  sourceRef: z.string().min(1),
});
export type EvidenceRecord = z.infer<typeof EvidenceSchema>;

export const AnalysisSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    statement: z.string(),
    evidenceIds: z.array(z.string()).min(1),
  })),
  missingEvidence: z.array(z.string()),
});
export type EvidenceAnalysis = z.infer<typeof AnalysisSchema>;

export function validateCitations(analysis: unknown, evidence: EvidenceRecord[]): EvidenceAnalysis {
  const parsed = AnalysisSchema.parse(analysis);
  const ids = new Set(evidence.map(record => record.id));
  for (const finding of parsed.findings) {
    for (const id of finding.evidenceIds) {
      if (!ids.has(id)) throw new Error(`Unknown evidence citation: ${id}`);
    }
  }
  return parsed;
}
