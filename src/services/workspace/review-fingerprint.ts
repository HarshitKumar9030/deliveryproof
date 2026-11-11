import { createHash } from 'node:crypto';
import type { Project } from '../../domain/projects.ts';

/** Any change to scope, payment, delivery, receipt, evidence or files makes a saved AI review stale. */
export function reviewFingerprint(project: Project) {
  return createHash('sha256').update(JSON.stringify({ scope: project.scope, paid: project.paid, deliveryLink: project.deliveryLink, confirmation: project.deliveryConfirmation, evidence: project.evidence, artifacts: project.artifacts })).digest('hex');
}
