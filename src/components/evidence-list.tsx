'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  CreditCard,
  Link2,
  MousePointer2,
  MessageSquareCheck,
  ArrowUpRight,
} from 'lucide-react';
import type { Evidence, EvidenceKind } from '@/domain/projects';
import { Dialog } from './ui';

export const evidenceIcons: Record<EvidenceKind, typeof FileText> = {
  Agreement: FileText,
  Payment: CreditCard,
  Delivery: Link2,
  Access: MousePointer2,
  Acknowledgement: MessageSquareCheck,
};

export function SourcePreview({
  source,
  onClose,
}: {
  source: Evidence | null;
  onClose: () => void;
}) {
  const [lastSource, setLastSource] = useState(source);
  useEffect(() => {
    if (source) setLastSource(source);
  }, [source]);
  const displayed = source ?? lastSource;
  return (
    <Dialog
      open={!!source}
      onClose={onClose}
      title={displayed?.title ?? 'Source record'}
    >
      {displayed && (
        <>
          <div className="source-meta">
            <span>{displayed.kind}</span>
            <span>{displayed.date}</span>
          </div>
          <blockquote className="source-excerpt">
            {displayed.excerpt}
          </blockquote>
          <p className="caption">
            Source {displayed.id} · Preserved project record.
          </p>
        </>
      )}
    </Dialog>
  );
}

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  const [source, setSource] = useState<Evidence | null>(null);
  return (
    <>
      <div className="evidence-list">
        {evidence.map((item) => {
          const Icon = evidenceIcons[item.kind];
          return (
            <button
              key={item.id}
              className="evidence-row"
              onClick={() => setSource(item)}
            >
              <span className="evidence-icon">
                <Icon size={23} strokeWidth={1.7} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.kind} · {item.date}
                </span>
              </div>
              <span className="source-id">
                {item.id}
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <SourcePreview source={source} onClose={() => setSource(null)} />
    </>
  );
}
