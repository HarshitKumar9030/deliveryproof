'use client';

import { useId, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { BarChart3, CreditCard, ArrowUpRight } from 'lucide-react';
import { money, type Project } from '@/domain/projects';
import { CanvasAccent } from './canvas-accent';
import { hasCurrentConfirmation } from '@/domain/handover';

export function WorkspaceStatistics({ projects }: { projects: Project[] }) {
  const [view, setView] = useState<'records' | 'payments'>('records');
  const id = useId().replace(/:/g, '');
  const values = projects.map((project) => view === 'records' ? project.evidence.length : project.paid ? project.amount : 0);
  const maximum = Math.max(view === 'records' ? 5 : 1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <section className="statistics-chart" aria-label="Workspace statistics">
      <div className="statistics-heading">
        <div>
          <span className="workspace-eyebrow">WORKSPACE STATISTICS</span>
          <h2>{view === 'records' ? 'Every record, in view.' : 'Payments, project by project.'}</h2>
          <p>{view === 'records' ? 'Preserved evidence across your projects' : 'Received payments in this workspace'}</p>
        </div>
        <div className="statistics-switch" aria-label="Chart metric">
          <button aria-pressed={view === 'records'} onClick={() => setView('records')}><BarChart3 size={15} aria-hidden="true" />Records</button>
          <button aria-pressed={view === 'payments'} onClick={() => setView('payments')}><CreditCard size={15} aria-hidden="true" />Payments</button>
        </div>
      </div>
      <div className="statistics-total" aria-live="polite">
        <strong>{view === 'records' ? total : money(total)}</strong>
        <span>{view === 'records' ? 'preserved records' : 'received · USD'}</span>
      </div>
      <div className="statistics-plot" key={`${view}-${values.join('-')}`}>
        <CanvasAccent replayKey={view} />
        <div className="statistics-gridlines" aria-hidden="true"><span /><span /><span /></div>
        <div className="statistics-columns">
          {projects.map((project, index) => {
            const value = values[index] ?? 0;
            const clipId = `${id}-bar-${index}`;
            return (
              <Link className="statistics-column" key={project.id} href={`/projects/${project.id}?tab=${view === 'records' ? 'evidence' : 'overview'}`} aria-label={`${project.client}: ${view === 'records' ? `${value} evidence records` : `${money(value)} received`}`} style={{ '--bar-delay': `${Math.min(index, 6) * 55}ms` } as CSSProperties}>
                <span className="statistics-bar-value">{view === 'records' ? value : money(value)}</span>
                <div className="statistics-bar-space">
                  <svg className="statistics-shard" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true" style={{height: `${value / maximum * 100}%`}}>
                    <defs><clipPath id={clipId}><rect className="statistics-clip" width="100" height="120" /></clipPath></defs>
                    <g clipPath={`url(#${clipId})`}>
                      <polygon className="shard-front" points="0,28 60,40 60,120 0,104" />
                      <polygon className="shard-side" points="60,40 100,24 100,100 60,120" />
                      <polygon className="shard-top" points="0,28 60,0 100,24 60,40" />
                      <path className="statistics-shard-seam" d="M60 40V120M0 28L60 40L100 24" />
                    </g>
                  </svg>
                </div>
                <span className="statistics-project-label">{project.client.split(' ')[0]}<ArrowUpRight size={11} aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </div>
      {!projects.length && <p className="statistics-empty">Add a project to start building your workspace statistics.</p>}
      <div className="statistics-footnote"><span className="statistics-legend-dot" />{view === 'records' ? 'Record count · open a project to inspect its sources' : 'Completed verified payments · open a project for details'}</div>
    </section>
  );
}

export function ConfirmationStatistics({ projects }: { projects: Project[] }) {
  const confirmed = projects.filter(hasCurrentConfirmation).length;
  const ratio = projects.length ? confirmed / projects.length : 0;
  return (
    <section className="confirmation-statistics" aria-label="Client confirmations">
      <div className="confirmation-ring">
        <CanvasAccent variant="orbit" replayKey={`${confirmed}-${projects.length}`} />
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="confirmation-ring-track" cx="50" cy="50" r="42" />
          <circle key={`${confirmed}-${projects.length}`} className="confirmation-ring-fill" cx="50" cy="50" r="42" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - ratio * 100} style={{ '--ring-offset': 100 - ratio * 100 } as CSSProperties} />
        </svg>
        <strong>{Math.round(ratio * 100)}<small>%</small></strong>
      </div>
      <div><span className="workspace-eyebrow">CLIENT CONFIRMATIONS</span><h2>{confirmed} of {projects.length} projects</h2><p>Have a preserved acknowledgement. Page access alone is not acceptance.</p></div>
    </section>
  );
}
