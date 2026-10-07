'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Link2,
  MessageSquare,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-provider';
import { money, type EvidenceKind } from '@/domain/projects';
import { ProjectList } from './project-list';
import { SummaryCards } from './summary-cards';
import { WorkspaceStatistics, ConfirmationStatistics } from './workspace-statistics';

const icons: Record<EvidenceKind, typeof FileText> = {
  Agreement: FileText,
  Payment: CreditCard,
  Delivery: FileText,
  Access: ArrowUpRight,
  Acknowledgement: CheckCircle2,
};
export function Overview() {
  const { projects, activity, user } = useWorkspace();
  const broken = projects.find((p) => p.status === 'needs-link');
  const dispute = projects.find((p) => p.status === 'dispute');
  const progress = [
    {
      label: 'Agreement',
      count: projects.filter((p) =>
        p.evidence.some((e) => e.kind === 'Agreement'),
      ).length,
    },
    { label: 'Payment', count: projects.filter((p) => p.paid).length },
    {
      label: 'Delivery',
      count: projects.filter((p) => p.deliveryLink && p.status !== 'needs-link')
        .length,
    },
    {
      label: 'Confirmation',
      count: projects.filter((p) =>
        p.evidence.some((e) => e.kind === 'Acknowledgement'),
      ).length,
    },
  ];
  return (
    <div className="overview-minimal">
      <div className="page-heading">
        <div>
          <span className="workspace-eyebrow">YOUR WORKSPACE</span>
          <h1>Welcome back, {user?.name.split(' ')[0]}</h1>
          <p>A clear view of your work, from payment to proof.</p>
        </div>
        <span className="date caption">{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <SummaryCards />
      <div className="grid items-start gap-[18px] min-[1001px]:grid-cols-[minmax(0,1fr)_270px] min-[1001px]:max-[1150px]:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0">
          <WorkspaceStatistics projects={projects} />
          <ProjectList projects={projects} />
        </div>
        <aside className="squircle grid min-w-0 gap-7 rounded-[28px] bg-paper px-[21px] py-6 min-[481px]:max-[1000px]:grid-cols-2 min-[1001px]:block">
          <ConfirmationStatistics projects={projects} />
          <section className="attention-section" aria-label="Needs attention">
            <h2>Needs attention</h2>
            {broken && (
              <Link
                className="attention-row"
                href={`/projects/${broken.id}?tab=delivery`}
              >
                <span className="attention-icon">
                  <Link2 size={19} strokeWidth={1.7} />
                </span>
                <div>
                  <strong>
                    {`${broken.client} has an expired link`}
                  </strong>
                  <span>
                    {broken.title} · {money(broken.amount)}
                  </span>
                </div>
                <span className="attention-action">
                  Review delivery
                  <ArrowRight size={17} />
                </span>
              </Link>
            )}
            {dispute && (
              <Link
                className="attention-row"
                href={`/projects/${dispute.id}?tab=response`}
              >
                <span className="attention-icon">
                  <MessageSquare size={19} strokeWidth={1.7} />
                </span>
                <div>
                  <strong>
                    {dispute.responsePrepared
                      ? `${dispute.client} has a prepared draft`
                      : `${dispute.client} needs a response`}
                  </strong>
                  <span>
                    {dispute.responsePrepared
                      ? 'Case still open · Not submitted'
                      : 'Check deadline in PayPal'}{' '}
                    · {money(dispute.amount)}
                  </span>
                </div>
                <span className="attention-action">
                  Review case
                  <ArrowRight size={17} />
                </span>
              </Link>
            )}
            {!broken && !dispute && (
              <div className="attention-clear">
                <CheckCircle2 size={18} />
                <p>All clear. No outstanding link or response issues.</p>
              </div>
            )}
          </section>
          <div className="overview-bottom">
            <section className="compact-progress">
              <h2>Handover progress</h2>
              <div className="progress-rows">
                {progress.map((stage) => (
                  <div className="progress-row" key={stage.label}>
                    <span>{stage.label}</span>
                    <div
                      className="stage-track"
                      role="meter"
                      aria-label={`${stage.label} recorded`}
                      aria-valuemin={0}
                      aria-valuemax={projects.length}
                      aria-valuenow={stage.count}
                    >
                      <span
                        style={{
                          width: `${(stage.count / Math.max(projects.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <small>
                      {stage.count} / {projects.length}
                    </small>
                  </div>
                ))}
              </div>
            </section>
            <section className="compact-activity">
              <h2>Recent activity</h2>
              <ol>
                {activity.slice(0, 2).map((event) => {
                  const Icon = icons[event.kind];
                  return (
                    <li key={event.id}>
                      <Icon size={18} strokeWidth={1.7} />
                      <div>
                        <strong>
                          {event.client} · {event.title.toLowerCase()}
                        </strong>
                        <small>{event.time}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
