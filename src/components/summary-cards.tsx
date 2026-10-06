'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CreditCard,
  Folder,
  CircleAlert,
  Plus,
  Minus,
} from 'lucide-react';
import { useDemo } from '@/demo/demo-provider';
import { money, needsAttention, statusLabels } from '@/demo/data';
import { AnimatedValue } from './motion';

export function SummaryCards() {
  const { projects } = useDemo();
  const [expanded, setExpanded] = useState<string | null>(null);
  const id = useId();
  const paid = projects.filter((project) => project.paid);
  const active = projects.filter((project) => project.status !== 'complete');
  const attention = projects.filter(needsAttention);
  const cards = [
    {
      key: 'payments',
      label: 'Payments received',
      value: money(paid.reduce((sum, project) => sum + project.amount, 0)),
      icon: CreditCard,
      detail: `${paid.length} recorded payments`,
      rows: paid,
      payment: true,
    },
    {
      key: 'active',
      label: 'Active projects',
      value: active.length,
      icon: Folder,
      detail: 'Work currently in progress',
      rows: active,
      payment: false,
    },
    {
      key: 'attention',
      label: 'Need attention',
      value: attention.length,
      icon: CircleAlert,
      detail: 'Review the next step',
      rows: attention,
      payment: false,
    },
  ];
  return (
    <section
      className="metric-grid"
      data-expanded={expanded ?? 'none'}
      aria-label="Workspace summary"
    >
      {cards.map((card) => {
        const open = expanded === card.key;
        const ToggleIcon = open ? Minus : Plus;
        return (
          <article
            className="metric-card squircle"
            data-expanded={open}
            key={card.key}
          >
            <button
              className="metric-trigger"
              aria-expanded={open}
              aria-controls={`${id}-${card.key}`}
              onClick={() => setExpanded(open ? null : card.key)}
            >
              <span className="metric-label">
                <card.icon size={16} aria-hidden="true" />
                {card.label}
              </span>
              <span className="metric-value">
                <AnimatedValue value={card.value} />
              </span>
              <span className="metric-hint">
                {open ? 'Hide details' : 'View details'}
                <ToggleIcon size={15} aria-hidden="true" />
              </span>
            </button>
            <div
              className="metric-details"
              id={`${id}-${card.key}`}
              inert={!open}
              aria-hidden={!open}
            >
              <div className="metric-detail-clip">
                <div className="metric-detail-content">
                  <p>{card.detail}</p>
                  {card.rows.length ? (
                    <ul>
                      {card.rows.map((project) => (
                        <li key={project.id}>
                          <Link
                            href={`/projects/${project.id}${card.key === 'attention' ? `?tab=${project.status === 'dispute' ? 'response' : 'delivery'}` : ''}`}
                          >
                            <span>{project.client}</span>
                            <span>
                              {card.payment
                                ? money(project.amount)
                                : statusLabels[project.status]}
                            </span>
                            <ArrowUpRight size={13} aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="metric-empty">
                      All clear. No outstanding items.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
