'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Info, FolderSearch, CreditCard, PackageCheck, FileCheck2, ScanText } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-provider';
import { money, type Project } from '@/domain/projects';
import { ClientMark, Status, EmptyState, TextLink } from './ui';
import { EvidenceList } from './evidence-list';
import { DeliveryPanel } from './delivery-panel';
import { ResponseBuilder } from './response-builder';
import { SlidingPill } from './motion';
import { ProjectPayment } from './project-payment';
import { HandoverReview } from './handover-review';
import { hasCurrentConfirmation } from '@/domain/handover';

const tabs = ['overview', 'delivery', 'evidence', 'review', 'response'] as const;
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
      done: hasCurrentConfirmation(project),
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
                    : item === 'review' ? <span className="inline-flex items-center gap-1.5"><ScanText size={13} aria-hidden="true"/>AI review</span> : 'Response'}
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
              <HandoverReview project={project} compact/>
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
            <aside className="next-panel detail-next !rounded-[24px]">
              <div className="flex items-center justify-between"><h2>Up next</h2>{!project.paid ? <CreditCard size={18} className="text-accent" aria-hidden="true"/> : project.status === 'dispute' ? <FileCheck2 size={18} className="text-accent" aria-hidden="true"/> : <PackageCheck size={18} className="text-accent" aria-hidden="true"/>}</div>
              {!project.paid ? (
                <><h3>Get paid.</h3><p>Share a secure PayPal checkout.</p><ProjectPayment projectId={id}/><Link href={`/projects/${id}?tab=delivery`} className="mt-4 inline-flex items-center gap-2 text-xs text-muted"><PackageCheck size={15} aria-hidden="true"/>{project.deliveryLink ? 'Request delivery confirmation' : 'Add delivery'}<ArrowRight size={13} aria-hidden="true"/></Link></>
              ) : project.status === 'dispute' ? (
                <>
                  <h3>Put your evidence in order.</h3>
                  <p>
                    Review sources and prepare your draft.
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
                    Payment and receipt are recorded.
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
                      : project.deliveryLink ? 'Ask your client to acknowledge receipt.' : 'Save the original delivery link.'}
                  </p>
                  <Link
                    className="button primary"
                    href={`/projects/${id}?tab=delivery`}
                  >
                    {project.deliveryLink ? 'Confirm delivery' : 'Continue delivery'}
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
            {!hasCurrentConfirmation(project) && (
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
        {tab === 'review' && <HandoverReview project={project}/>}
      </div>
    </>
  );
}
