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
import { useDemo } from '@/demo/demo-provider';
import { money, type EvidenceKind } from '@/demo/data';
import { ProjectList } from './project-list';
import { SummaryCards } from './summary-cards';

const icons: Record<EvidenceKind, typeof FileText> = {
  Agreement: FileText,
  Payment: CreditCard,
  Delivery: FileText,
  Access: ArrowUpRight,
  Acknowledgement: CheckCircle2,
};
export function Overview() {
  const { projects, activity } = useDemo();
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
          <h1>Welcome back, Alex</h1>
          <p>A clear view of your work, from payment to proof.</p>
        </div>
        <span className="date caption">Oct 6, 2026</span>
      </div>
      <SummaryCards />
      <div className="grid items-start gap-[18px] min-[1001px]:grid-cols-[minmax(0,1fr)_270px] min-[1001px]:max-[1150px]:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0">
          <section className="evidence-chart" aria-label="Evidence coverage">
            <div className="chart-heading">
              <div>
                <h2>Evidence coverage</h2>
                <p>Preserved records across your projects</p>
              </div>
              <span className="caption">
                {projects.reduce((sum, p) => sum + p.evidence.length, 0)}{' '}
                records
              </span>
            </div>
            <div className="evidence-bars">
              {projects.map((project) => (
                <Link
                  className="evidence-bar-group"
                  href={`/projects/${project.id}?tab=evidence`}
                  key={project.id}
                  aria-label={`${project.client}: ${project.evidence.length} evidence records`}
                >
                  <span className="bar-count">{project.evidence.length}</span>
                  <div className="evidence-bar-track">
                    <span
                      className="evidence-shard"
                      style={{
                        height: `${Math.min((project.evidence.length / Math.max(5, ...projects.map((p) => p.evidence.length))) * 100, 100)}%`,
                      }}
                    >
                      <svg
                        viewBox="0 0 100 120"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <polygon
                          className="shard-front"
                          points="0,28 60,40 60,120 0,104"
                        />
                        <polygon
                          className="shard-side"
                          points="60,40 100,24 100,100 60,120"
                        />
                        <polygon
                          className="shard-top"
                          points="0,28 60,0 100,24 60,40"
                        />
                        <polygon
                          className="shard-glint"
                          points="5,33 12,35 12,102 5,100"
                        />
                      </svg>
                    </span>
                  </div>
                  <span className="bar-label">
                    {project.client.split(' ')[0]}
                  </span>
                </Link>
              ))}
            </div>
            <p className="chart-footnote">
              A record shows what happened. Confirmation shows acceptance.
            </p>
          </section>
          <ProjectList projects={projects} />
        </div>
        <aside className="squircle grid min-w-0 gap-7 rounded-[28px] bg-paper px-[21px] py-6 min-[481px]:max-[1000px]:grid-cols-2 min-[1001px]:block">
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
                    {broken.id === 'northstar'
                      ? 'Northstar’s delivery link has expired'
                      : `${broken.client} has an expired link`}
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
                      : 'Due October 9'}{' '}
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
                          width: `${(stage.count / projects.length) * 100}%`,
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
