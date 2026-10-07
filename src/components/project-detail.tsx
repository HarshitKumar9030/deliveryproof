'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Info, FolderSearch } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-provider';
import { money, type Project } from '@/domain/projects';
import { ClientMark, Status, EmptyState, TextLink } from './ui';
import { EvidenceList } from './evidence-list';
import { DeliveryPanel } from './delivery-panel';
import { ResponseBuilder } from './response-builder';
import { SlidingPill } from './motion';
import { ProjectPayment } from './project-payment';

const tabs = ['overview', 'delivery', 'evidence', 'response'] as const;
type Tab = (typeof tabs)[number];
function Progress({ project }: { project: Project }) {
  const stages = [
    {
      label: 'Agreement',
      done: project.evidence.some((source) => source.kind === 'Agreement'),
    },
    { label: 'Payment', done: project.paid },
    {
      label: 'Delivery',
      done: !!project.deliveryLink && project.status !== 'needs-link',
    },
    {
      label: 'Confirmation',
      done: project.evidence.some(
        (source) => source.kind === 'Acknowledgement',
      ),
    },
  ];
  const next = stages.findIndex((stage) => !stage.done);
  return (
    <ol className="project-progress" aria-label="Project progress">
      {stages.map((stage, index) => (
        <li
          className={stage.done ? 'done' : index === next ? 'next' : ''}
          key={stage.label}
        >
          <span>
            {stage.done ? <Check size={16} aria-hidden="true" /> : index + 1}
          </span>
          <strong>{stage.label}</strong>
          <small>
            {stage.done ? 'Recorded' : index === next ? 'Up next' : 'To come'}
          </small>
        </li>
      ))}
    </ol>
  );
}

export function ProjectDetail({
  id,
  requestedTab,
}: {
  id: string;
  requestedTab: string;
}) {
  const { projects } = useWorkspace();
  const project = projects.find((item) => item.id === id);
  if (!project)
    return (
      <>
        <Link href="/projects" className="back-link">
          <ArrowLeft size={17} />
          All projects
        </Link>
        <EmptyState
          icon={FolderSearch}
          title="This project isn’t available."
        >
          This project may not belong to your account. Return to your projects.
        </EmptyState>
      </>
    );
  const tab: Tab = tabs.includes(requestedTab as Tab)
    ? (requestedTab as Tab)
    : 'overview';
  return (
    <>
      <Link href="/projects" className="back-link">
        <ArrowLeft size={17} aria-hidden="true" />
        All projects
      </Link>
      <div className="project-detail-heading">
        <div className="detail-client">
          <ClientMark client={project.client} />
          <div>
            <span className="muted">{project.client}</span>
            <h1>{project.title}</h1>
          </div>
        </div>
        <div className="detail-payment">
          <strong>{money(project.amount)}</strong>
          <span>
            {project.paid ? 'Payment received' : 'Awaiting payment'} · USD
          </span>
        </div>
      </div>
      <div className="detail-status">
        <Status project={project} />
        <span className="caption">Your project</span>
      </div>
      <Progress project={project} />
      <nav className="detail-tabs t-tabs" aria-label="Project sections">
        <SlidingPill value={tab} />
        {tabs
          .filter((item) => item !== 'response' || project.status === 'dispute')
          .map((item) => (
            <Link
              className={`t-tab${tab === item ? ' active' : ''}`}
              href={`/projects/${id}?tab=${item}`}
              key={item}
              aria-current={tab === item ? 'page' : undefined}
            >
              {item === 'overview'
                ? 'Overview'
                : item === 'delivery'
                  ? 'Delivery'
                  : item === 'evidence'
                    ? `Evidence (${project.evidence.length})`
                    : 'Response'}
            </Link>
          ))}
      </nav>
      <div className="detail-content panel-enter" key={`${id}-${tab}`}>
        {tab === 'overview' && (
          <div className="detail-grid">
            <div>
              <section className="scope-section">
                <h2>The agreed work.</h2>
                <p>{project.scope}</p>
              </section>
              <section>
                <div className="section-heading">
                  <h2>Preserved records</h2>
                  <TextLink href={`/projects/${id}?tab=evidence`}>
                    View all
                  </TextLink>
                </div>
                <EvidenceList evidence={project.evidence.slice(0, 3)} />
              </section>
            </div>
            <aside className="next-panel detail-next">
              <h2>Up next</h2>
              {!project.paid ? (
                <><h3>Get paid through PayPal.</h3><p>A payment will appear here only after a verified PayPal capture. You can preserve the delivery link while payment is pending.</p><ProjectPayment projectId={id}/></>
              ) : project.status === 'dispute' ? (
                <>
                  <h3>Put your evidence in order.</h3>
                  <p>
                    Check the deadline in PayPal. Review the
                    sources, preserve the gaps, and prepare a draft.
                  </p>
                  <Link
                    className="button primary"
                    href={`/projects/${id}?tab=response`}
                  >
                    Review response
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </>
              ) : project.status === 'complete' ? (
                <>
                  <h3>Everything together.</h3>
                  <p>
                    Your handover is complete. Keep the records so you can
                    refer back to them.
                  </p>
                  <Link
                    className="button primary"
                    href={`/projects/${id}?tab=evidence`}
                  >
                    View evidence
                  </Link>
                </>
              ) : (
                <>
                  <h3>
                    {project.status === 'needs-link'
                      ? 'Restore the delivery link.'
                      : project.deliveryLink
                        ? 'Confirm the handover.'
                        : 'Share the final files.'}
                  </h3>
                  <p>
                    {project.status === 'needs-link'
                      ? 'Replace the expired link while keeping the original delivery record.'
                      : 'Save the delivery link and preserve the original records.'}
                  </p>
                  <Link
                    className="button primary"
                    href={`/projects/${id}?tab=delivery`}
                  >
                    Continue delivery
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </>
              )}
            </aside>
          </div>
        )}
        {tab === 'delivery' && (
          <DeliveryPanel key={project.id} project={project} />
        )}
        {tab === 'evidence' && (
          <>
            <div className="section-heading">
              <h2>A record of what happened.</h2>
              <span className="caption">{project.evidence.length} sources</span>
            </div>
            <p className="muted measure">
              Agreements, payments, deliveries, and confirmations stay separate.
              Open a record to see its source.
            </p>
            <EvidenceList evidence={project.evidence} />
            {!project.evidence.some(
              (source) => source.kind === 'Acknowledgement',
            ) && (
              <div className="inline-attention compact">
                <Info size={21} aria-hidden="true" />
                <p>
                  Client acknowledgement is missing. Delivery or page access
                  alone does not establish acceptance.
                </p>
              </div>
            )}
          </>
        )}
        {tab === 'response' && <ResponseBuilder key={project.id} project={project} />}
      </div>
    </>
  );
}
