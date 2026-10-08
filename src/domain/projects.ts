export type ProjectStatus =
  | 'needs-link'
  | 'ready'
  | 'delivered'
  | 'dispute'
  | 'complete'
  | 'awaiting-payment';
export type EvidenceKind =
  'Agreement' | 'Payment' | 'Delivery' | 'Access' | 'Acknowledgement';
export type Evidence = {
  id: string;
  kind: EvidenceKind;
  title: string;
  date: string;
  excerpt: string;
};
export type Project = {
  id: string;
  client: string;
  title: string;
  scope: string;
  amount: number;
  paid: boolean;
  status: ProjectStatus;
  deliveryLink: string;
  deliveryConfirmation?: { deliveryLink: string; name: string; confirmedAt: string; method: 'share-link' };
  evidence: Evidence[];
  responsePrepared: boolean;
  preparedPacket?: { draft: string; sources: Evidence[]; reviewedAt: string };
};
export type Activity = {
  id: string;
  title: string;
  client: string;
  time: string;
  kind: EvidenceKind;
};
export const statusLabels: Record<ProjectStatus, string> = {
  'needs-link': 'Link expired',
  ready: 'Ready to deliver',
  delivered: 'Awaiting confirmation',
  dispute: 'Response due',
  complete: 'Completed',
  'awaiting-payment': 'Awaiting payment',
};
export const needsAttention = (project: Project) =>
  project.status === 'needs-link' || project.status === 'dispute';
export const money = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
