'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, Download, Info } from 'lucide-react';
import type { Project, Evidence } from '@/demo/data';
import { useDemo } from '@/demo/demo-provider';
import { evidenceIcons, SourcePreview } from './evidence-list';
import { MotionCheckbox, SuccessCheck } from './motion';

export function ResponseBuilder({ project }: { project: Project }) {
  const { updateProject, notify } = useDemo();
  const [step, setStep] = useState(project.preparedPacket ? 3 : 1);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      const heading = contentRef.current?.querySelector('h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
      previousStep.current = step;
    }
  }, [step]);
  const [selected, setSelected] = useState(
    () =>
      new Set(
        project.preparedPacket?.sources.map((source) => source.id) ??
          project.evidence.map((source) => source.id),
      ),
  );
  const [draft, setDraft] = useState(project.preparedPacket?.draft ?? '');
  const [reviewed, setReviewed] = useState(false);
  const [preview, setPreview] = useState<Evidence | null>(null);
  const sources = project.evidence.filter((source) => selected.has(source.id));
  const citationIds = Array.from(
    draft.matchAll(/\[([^\]]+)\]/g),
    (match) => match[1],
  );
  const unknownCitation = citationIds.some((id) => !id || !selected.has(id));
  const missingKinds = [
    'Agreement',
    'Payment',
    'Delivery',
    'Acknowledgement',
  ].filter((kind) => !sources.some((source) => source.kind === kind));

  function beginReview() {
    setDraft(
      `Demo response for ${project.client}\n\nThe following selected records describe the project:\n\n${sources.map((source) => `${source.excerpt} [${source.id}]`).join('\n\n')}\n\n${missingKinds.length ? `Evidence gaps: ${missingKinds.join(', ')}. These gaps remain unresolved.\n\n` : ''}These records should be assessed together. Page access alone does not prove acceptance. This is a demo draft for human review, not a finding about the dispute.`,
    );
    setReviewed(false);
    setStep(2);
  }
  function prepare() {
    if (!reviewed || !draft.trim() || unknownCitation || !sources.length)
      return;
    updateProject(
      project.id,
      {
        responsePrepared: true,
        preparedPacket: {
          draft,
          sources,
          reviewedAt: new Date().toISOString(),
        },
      },
      'Demo response prepared',
    );
    setStep(3);
    notify('Reviewed demo packet prepared. Nothing was submitted.');
  }
  function download() {
    const packet = project.preparedPacket;
    if (!packet) return;
    const file = new Blob(
      [
        JSON.stringify(
          {
            demo: true,
            submitted: false,
            projectId: project.id,
            client: project.client,
            ...packet,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `deliveryproof-${project.id}-demo.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Demo JSON packet downloaded.');
  }
  return (
    <section className="response-builder">
      <ol className="response-steps" aria-label="Response preparation steps">
        {['Choose sources', 'Review draft', 'Prepare packet'].map(
          (label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? 'step' : undefined}
              className={step >= index + 1 ? 'current' : ''}
            >
              <span>
                {step > index + 1 ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </li>
          ),
        )}
      </ol>
      <div
        className="response-step-content panel-enter"
        ref={contentRef}
        tabIndex={-1}
        key={step}
      >
        {step === 1 && (
          <>
            <div className="section-heading">
              <h2>Start with the records.</h2>
              <span className="caption">{sources.length} selected</span>
            </div>
            <p className="muted measure">
              Choose the sources to include. Open any record to check exactly
              what it says.
            </p>
            <div className="source-selection">
              {project.evidence.map((source) => {
                const Icon = evidenceIcons[source.kind];
                return (
                  <div className="select-source" key={source.id}>
                    <label className="source-checkbox">
                      <MotionCheckbox
                        checked={selected.has(source.id)}
                        onChange={(event) =>
                          setSelected((value) => {
                            const next = new Set(value);
                            if (event.target.checked) next.add(source.id);
                            else next.delete(source.id);
                            return next;
                          })
                        }
                      />
                      <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                      <span>
                        <strong>{source.title}</strong>
                        <small>
                          {source.kind} · {source.date}
                        </small>
                      </span>
                    </label>
                    <button
                      className="text-button source-preview-button"
                      onClick={() => setPreview(source)}
                    >
                      View source
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="inline-attention compact">
              <Info size={21} aria-hidden="true" />
              <p>
                {missingKinds.length
                  ? `Missing from the selected records: ${missingKinds.join(', ')}. The draft will explicitly preserve these gaps.`
                  : 'All key record types are selected. Still review the details before preparing a response.'}
              </p>
            </div>
            <div className="button-row">
              <button
                className="button primary"
                disabled={!sources.length}
                onClick={beginReview}
              >
                Review demo draft
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <span className="caption">
                Locally assembled from sample records.
              </span>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="section-heading">
              <h2>Every claim deserves a source.</h2>
              <span className="caption">Demo draft</span>
            </div>
            <p className="muted measure">
              Check the wording and its references. You can edit the draft
              before confirming your review.
            </p>
            <label className="draft-label">
              Response draft
              <textarea
                className="response-draft"
                rows={15}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setReviewed(false);
                }}
              />
            </label>
            <div className="citation-links" aria-label="Selected sources">
              {sources.map((source) => (
                <button
                  className="citation-link"
                  key={source.id}
                  onClick={() => setPreview(source)}
                >
                  {source.id.startsWith('DEMO-') ? source.kind : source.id}
                </button>
              ))}
            </div>
            {unknownCitation && (
              <p className="form-error" role="alert">
                The draft references a source outside your selection. Correct
                the reference before preparing the packet.
              </p>
            )}
            <label className="review-confirmation">
              <MotionCheckbox
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              <span>
                I’ve reviewed the draft and its selected sources. I understand
                this prepares a demo packet only.
              </span>
            </label>
            <div className="button-row">
              <button className="button secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={17} aria-hidden="true" />
                Choose sources
              </button>
              <button
                className="button primary"
                disabled={!reviewed || !draft.trim() || unknownCitation}
                onClick={prepare}
              >
                Prepare demo packet
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <div className="packet-success">
            <span className="success-icon">
              <SuccessCheck size={46} />
            </span>
            <h2>Your draft is ready.</h2>
            <p>
              Your reviewed wording and{' '}
              {project.preparedPacket?.sources.length ?? sources.length} source
              records are together in a demo packet. Nothing has been sent to
              PayPal.
            </p>
            <div className="packet-meta">
              <span>
                Format<strong>JSON demo packet</strong>
              </span>
              <span>
                Review<strong>Confirmed by you</strong>
              </span>
              <span>
                Submission<strong>Not submitted</strong>
              </span>
            </div>
            <div className="button-row">
              <button className="button primary" onClick={download}>
                <Download size={17} aria-hidden="true" />
                Download demo packet
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setReviewed(false);
                  setStep(2);
                }}
              >
                Review again
              </button>
            </div>
            <p className="caption">
              The open case stays open. This demo packet is not a
              submission-ready PDF.
            </p>
          </div>
        )}
      </div>
      <SourcePreview source={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
