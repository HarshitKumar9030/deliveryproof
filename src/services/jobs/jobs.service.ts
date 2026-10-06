import type { EvidenceScope } from '../../domain/evidence.js';

export type EvidenceJob = EvidenceScope & {
  id: string;
  kind: 'index-evidence' | 'analyse-case' | 'export-packet';
  sourceId: string;
};

/** Port for a durable queue or Render Workflows. No in-memory fake durability. */
export interface JobDispatcher {
  dispatch(job: EvidenceJob): Promise<{ jobId: string }>;
}

/** Persist these atomically in the future database-backed event receiver. */
export interface WebhookEventRepository {
  recordOnce(eventId: string, payload: unknown): Promise<'new' | 'duplicate'>;
}
