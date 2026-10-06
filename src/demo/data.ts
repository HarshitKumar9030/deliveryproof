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
const source = (
  id: string,
  kind: EvidenceKind,
  title: string,
  date: string,
  excerpt: string,
): Evidence => ({ id, kind, title, date, excerpt });
export const initialProjects: Project[] = [
  {
    id: 'northstar',
    client: 'Northstar Studio',
    title: 'Brand identity',
    amount: 2400,
    scope:
      'A complete visual identity: primary logo, secondary mark, color palette, typography, and a 12-page brand guide. Two rounds of revisions included.',
    paid: true,
    status: 'needs-link',
    deliveryLink: 'https://example.com/northstar/expired',
    responsePrepared: false,
    evidence: [
      source(
        'NS-01',
        'Agreement',
        'Approved project scope',
        'October 1, 2026',
        'Northstar Studio approved the brand identity scope for $2,400, including two rounds of revisions.',
      ),
      source(
        'NS-02',
        'Payment',
        'Payment received',
        'October 2, 2026',
        'Demo PayPal capture NS-CAPTURE-001: $2,400 USD. Project reference: northstar. Status: completed.',
      ),
      source(
        'NS-03',
        'Delivery',
        'Brand files shared',
        'October 5, 2026',
        'A delivery link for the logo files and brand guide was shared with Northstar Studio. The demo link is now expired; client access has not been confirmed.',
      ),
    ],
  },
  {
    id: 'forma',
    client: 'Forma',
    title: 'Website redesign',
    amount: 3200,
    scope:
      'A responsive five-page website, design source files, and a handover guide. Final delivery follows the approved preview.',
    paid: true,
    status: 'ready',
    deliveryLink: '',
    responsePrepared: false,
    evidence: [
      source(
        'FO-01',
        'Agreement',
        'Website scope approved',
        'September 28, 2026',
        'Forma approved a five-page responsive website redesign and source-file handover for $3,200.',
      ),
      source(
        'FO-02',
        'Payment',
        'Payment received',
        'October 1, 2026',
        'Demo PayPal capture FO-CAPTURE-001: $3,200 USD. Status: completed.',
      ),
      source(
        'FO-03',
        'Access',
        'Preview opened',
        'October 6, 2026',
        'Forma opened the website preview on October 6 at 9:42 AM. This records preview access, not final delivery acceptance.',
      ),
    ],
  },
  {
    id: 'orbit',
    client: 'Orbit Labs',
    title: 'Product illustrations',
    amount: 1850,
    scope:
      'Eight original product illustrations, supplied as SVG and PNG files, with one revision round. Delivery due October 4.',
    paid: true,
    status: 'dispute',
    deliveryLink: 'https://example.com/orbit/illustrations',
    responsePrepared: false,
    evidence: [
      source(
        'OR-01',
        'Agreement',
        'Illustration scope approved',
        'September 26, 2026',
        'Orbit Labs approved eight original product illustrations, SVG and PNG formats, for $1,850. Delivery was due October 4.',
      ),
      source(
        'OR-02',
        'Payment',
        'Payment received',
        'September 27, 2026',
        'Demo PayPal capture OR-CAPTURE-001: $1,850 USD. Project reference: orbit. Status: completed.',
      ),
      source(
        'OR-03',
        'Delivery',
        'Eight illustrations delivered',
        'October 4, 2026',
        'Eight SVG files and eight PNG files were made available through the project delivery link on October 4. The delivery message included the file list.',
      ),
      source(
        'OR-04',
        'Access',
        'Delivery page opened',
        'October 4, 2026',
        'The demo delivery page recorded a client-session open at 3:18 PM on October 4. A page open does not establish acceptance or prove every file was downloaded.',
      ),
    ],
  },
  {
    id: 'acme',
    client: 'Acme Digital',
    title: 'Motion system',
    amount: 1000,
    scope:
      'Six interface motion studies, animation specifications, and source files for the Acme mobile application.',
    paid: true,
    status: 'complete',
    deliveryLink: 'https://example.com/acme/motion',
    responsePrepared: false,
    evidence: [
      source(
        'AC-01',
        'Agreement',
        'Motion scope saved',
        'October 3, 2026',
        'Acme Digital approved six interface motion studies and source-file delivery for $1,000.',
      ),
      source(
        'AC-02',
        'Payment',
        'Payment received',
        'October 3, 2026',
        'Demo PayPal capture AC-CAPTURE-001: $1,000 USD. Status: completed.',
      ),
      source(
        'AC-03',
        'Delivery',
        'Motion files delivered',
        'October 5, 2026',
        'The six motion studies and source files were shared with Acme Digital.',
      ),
      source(
        'AC-04',
        'Acknowledgement',
        'Client confirmed receipt',
        'October 5, 2026',
        'Synthetic client message: “Received the motion studies and source files. Everything is here, thank you.”',
      ),
    ],
  },
];
export const initialActivity: Activity[] = [
  {
    id: 'activity-1',
    title: 'Preview opened',
    client: 'Forma',
    time: 'Today, 9:42 AM',
    kind: 'Access',
  },
  {
    id: 'activity-2',
    title: 'Payment received',
    client: 'Northstar Studio',
    time: 'Yesterday',
    kind: 'Payment',
  },
  {
    id: 'activity-3',
    title: 'Agreement saved',
    client: 'Acme Digital',
    time: 'October 3',
    kind: 'Agreement',
  },
];
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
