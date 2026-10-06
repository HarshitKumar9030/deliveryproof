'use client';
import Link from 'next/link';
import { ArrowRight, Files, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useDemo } from '@/demo/demo-provider';
import { money } from '@/demo/data';
import { ProjectList } from './project-list';
import { ClientMark, Status, EmptyState } from './ui';
export function ProjectsPage() {
  const { projects } = useDemo();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Projects</h1>
          <p>From the first agreement to the final handover.</p>
        </div>
      </div>
      <ProjectList projects={projects} searchable />
    </>
  );
}
export function DeliveriesPage() {
  const { projects } = useDemo();
  const deliveries = projects.filter((project) => project.paid);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Deliveries</h1>
          <p>Keep delivery links and client confirmations in one place.</p>
        </div>
      </div>
      <div className="list-heading">
        <h2>Deliveries</h2>
        <span className="caption">{deliveries.length} projects</span>
      </div>
      <div className="delivery-list">
        {deliveries.length ? (
          deliveries.map((project) => (
            <Link
              className="delivery-row"
              href={`/projects/${project.id}?tab=delivery`}
              key={project.id}
            >
              <ClientMark client={project.client} />
              <div className="delivery-description">
                <strong>{project.title}</strong>
                <span>{project.client}</span>
              </div>
              <Status project={project} />
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <EmptyState icon={Files} title="Ready when you are.">
            Record a demo payment on a project to begin its delivery.
          </EmptyState>
        )}
      </div>
      <div className="quiet-note">
        <CheckCircle2 size={20} aria-hidden="true" />
        <p>
          A shared link, a recorded access, and a client acknowledgement each
          tell a different part of the story.
        </p>
      </div>
    </>
  );
}
export function DisputesPage() {
  const { projects } = useDemo();
  const disputes = projects.filter((project) => project.status === 'dispute');
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Disputes</h1>
          <p>Build a response from your records. Review every claim.</p>
        </div>
      </div>
      <div className="list-heading">
        <h2>Open cases</h2>
        <span className="caption">
          {disputes.length} case{disputes.length !== 1 ? 's' : ''}
        </span>
      </div>
      {disputes.length ? (
        disputes.map((project) => (
          <section className="case-panel" key={project.id}>
            <div className="case-summary">
              <ClientMark client={project.client} />
              <div>
                <h2>{project.client}</h2>
                <p>
                  {project.title} · {money(project.amount)}
                </p>
              </div>
              <span className="case-deadline caption">
                Demo case · Response due October 9
              </span>
            </div>
            <div className="case-body">
              <div>
                <h3>“Item not received”</h3>
                <p>
                  The client says the final illustrations weren’t received. Your
                  records include the agreed scope, payment, delivery, and page
                  access. Client acknowledgement is missing.
                </p>
              </div>
              <Link
                className="button primary"
                href={`/projects/${project.id}?tab=response`}
              >
                {project.responsePrepared
                  ? 'View prepared draft'
                  : 'Prepare response'}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </section>
        ))
      ) : (
        <EmptyState icon={ShieldCheck} title="No open cases.">
          Keep preserving evidence as your projects move forward.
        </EmptyState>
      )}
      <p className="caption page-note">
        Demo case and deadline. A prepared draft does not resolve a dispute or
        submit evidence.
      </p>
    </>
  );
}
