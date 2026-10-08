import { z } from 'zod';
import type { EvidenceRecord } from './evidence.ts';
import type { Project } from './projects.ts';

export const HandoverReviewSchema = z.object({
  summary: z.string().min(1).max(1500),
  checkpoints: z.array(z.object({
    requirement: z.string().min(1).max(300),
    status: z.enum(['supported', 'partial', 'missing']),
    explanation: z.string().min(1).max(700),
    evidenceIds: z.array(z.string()).max(20),
  })).min(1).max(12),
  nextActions: z.array(z.object({
    action: z.enum(['payment', 'delivery', 'confirmation', 'evidence']),
    reason: z.string().min(1).max(400),
  })).max(4),
  confirmationMessage: z.string().min(1).max(1500),
});
export type HandoverReview = z.infer<typeof HandoverReviewSchema>;

export function validateHandoverReview(value: unknown, records: EvidenceRecord[]) {
  const review = HandoverReviewSchema.parse(value);
  const sources = new Map(records.map(record => [record.id, record]));
  for (const checkpoint of review.checkpoints) {
    if (checkpoint.evidenceIds.some(id => !sources.has(id))) throw new Error('Unknown handover citation');
    if (checkpoint.status !== 'missing' && !checkpoint.evidenceIds.length) throw new Error('Supported checkpoints require evidence');
    if (checkpoint.status === 'supported' && !checkpoint.evidenceIds.some(id => ['delivery', 'acknowledgement'].includes(sources.get(id)!.kind))) {
      throw new Error('An agreement or payment alone cannot establish delivery');
    }
  }
  return review;
}

export function hasCurrentConfirmation(project: Pick<Project, 'deliveryLink' | 'deliveryConfirmation'>) {
  return !!project.deliveryLink && project.deliveryConfirmation?.deliveryLink === project.deliveryLink;
}
