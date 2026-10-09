import { z } from 'zod';
import type { EvidenceRecord } from './evidence.ts';
import type { Project } from './projects.ts';
import type { Artifact } from './artifacts.ts';

export const HandoverReviewSchema = z.object({
  summary: z.string().min(1).max(1500),
  checkpoints: z.array(z.object({
    requirement: z.string().min(1).max(300),
    status: z.enum(['supported', 'partial', 'missing']),
    explanation: z.string().min(1).max(700),
    evidenceIds: z.array(z.string()).max(20),
    fileCitations: z.array(z.object({
      fileId: z.string(),
      page: z.number().int().min(1).max(25).nullable(),
      line: z.number().int().min(1).max(262144).nullable(),
      observation: z.string().min(1).max(500),
    })).max(12),
  })).min(1).max(12),
  nextActions: z.array(z.object({
    action: z.enum(['payment', 'delivery', 'confirmation', 'evidence']),
    reason: z.string().min(1).max(400),
  })).max(4),
  confirmationMessage: z.string().min(1).max(1500),
});
export type HandoverReview = z.infer<typeof HandoverReviewSchema>;

export function validateHandoverReview(value: unknown, records: EvidenceRecord[], files: Artifact[] = []) {
  const review = HandoverReviewSchema.parse(value);
  const sources = new Map(records.map(record => [record.id, record]));
  const fileMap = new Map(files.map(file => [file.id, file]));
  for (const checkpoint of review.checkpoints) {
    if (checkpoint.evidenceIds.some(id => !sources.has(id))) throw new Error('Unknown handover citation');
    if (checkpoint.status !== 'missing' && !checkpoint.evidenceIds.length) throw new Error('Supported checkpoints require evidence');
    if (checkpoint.status === 'supported' && !checkpoint.evidenceIds.some(id => ['delivery', 'acknowledgement', 'artifact'].includes(sources.get(id)!.kind))) {
      throw new Error('An agreement or payment alone cannot establish delivery');
    }
    for (const citation of checkpoint.fileCitations) {
      const file = fileMap.get(citation.fileId);
      if (!file || !checkpoint.evidenceIds.includes(file.id)) throw new Error('Unknown inspected file citation');
      if (file.pages && (!citation.page || citation.page > file.pages || citation.line !== null)) throw new Error('Invalid PDF page citation');
      if (file.lines && (!citation.line || citation.line > file.lines || citation.page !== null)) throw new Error('Invalid text line citation');
      if (!file.pages && !file.lines && (citation.page !== null || citation.line !== null)) throw new Error('Image citations cannot invent pages or lines');
    }
    if (checkpoint.status === 'supported' && checkpoint.evidenceIds.some(id => sources.get(id)?.kind === 'artifact') && !checkpoint.fileCitations.length) throw new Error('File-supported findings need an inspected location');
  }
  return review;
}

export function hasCurrentConfirmation(project: Pick<Project, 'deliveryLink' | 'deliveryConfirmation'>) {
  return !!project.deliveryLink && project.deliveryConfirmation?.deliveryLink === project.deliveryLink;
}
