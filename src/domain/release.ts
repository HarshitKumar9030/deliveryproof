import type { HandoverReview } from './handover.ts';

export type HoldState = 'held' | 'releasing' | 'released' | 'returning' | 'returned';
export type PaymentHold = {
  orderId: string;
  authorizationId: string;
  value: string;
  authorizedAt: string;
  expiresAt?: string;
  state: HoldState;
  releasedAt?: string;
  returnedAt?: string;
  captureId?: string;
};
const usd = (value: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
export type GateId = 'funds' | 'delivery' | 'receipt' | 'review' | 'scope';
export type Gate = { id: GateId; label: string; ok: boolean; detail: string };
export type ReleaseDecision = { gates: Gate[]; canRelease: boolean; warnings: string[] };

/**
 * Deterministic release policy. Gemini judges whether the files meet the agreed
 * scope; this function decides whether money may move. A model cannot release
 * funds on its own, and a missing scope checkpoint always blocks release.
 */
export function evaluateRelease(input: {
  hold?: PaymentHold;
  deliveryLink: string;
  confirmed: boolean;
  review: HandoverReview | null;
  reviewStale: boolean;
  now?: Date;
}): ReleaseDecision {
  const now = input.now ?? new Date();
  const hold = input.hold;
  const expired = !!hold?.expiresAt && new Date(hold.expiresAt).getTime() <= now.getTime();
  const current = !!input.review && !input.reviewStale;
  const missing = input.review?.checkpoints.filter(c => c.status === 'missing') ?? [];
  const partial = input.review?.checkpoints.filter(c => c.status === 'partial') ?? [];
  const gates: Gate[] = [
    {
      id: 'funds', label: 'Funds held by PayPal',
      // 'releasing' stays eligible so an interrupted release can be retried with its saved request ID.
      ok: (hold?.state === 'held' || hold?.state === 'releasing') && !expired,
      detail: !hold ? 'The client has not authorized a held payment yet.'
        : expired ? 'The PayPal authorization has expired. Create a new held payment.'
        : hold.state === 'held' ? `${usd(hold.value)} USD authorized and held${hold.expiresAt ? ` until ${hold.expiresAt.slice(0, 10)}` : ''}.`
        : `Hold is ${hold.state}.`,
    },
    {
      id: 'delivery', label: 'Work handed over',
      ok: !!input.deliveryLink,
      detail: input.deliveryLink ? 'A delivery link is recorded.' : 'Save the client-facing delivery link.',
    },
    {
      id: 'receipt', label: 'Client acknowledged receipt',
      ok: input.confirmed,
      detail: input.confirmed ? 'The client confirmed receipt of the current delivery.' : 'Send a confirmation link and wait for the client to acknowledge.',
    },
    {
      id: 'review', label: 'AI review is current',
      ok: current,
      detail: !input.review ? 'Run the AI delivery review against the agreed scope.'
        : input.reviewStale ? 'Records changed after the last review. Run it again.'
        : `Gemini checked ${input.review.checkpoints.length} scope checkpoints.`,
    },
    {
      id: 'scope', label: 'Every scope item evidenced',
      ok: current && missing.length === 0,
      detail: !current ? 'Waiting for a current AI review.'
        : missing.length ? `Missing: ${missing.map(c => c.requirement).join('; ')}`
        : 'No agreed scope item is missing evidence.',
    },
  ];
  const warnings = current ? partial.map(c => `Partially evidenced: ${c.requirement}`) : [];
  return { gates, canRelease: gates.every(g => g.ok), warnings };
}
