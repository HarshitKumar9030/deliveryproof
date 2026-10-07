'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, Download, Info, FileCheck2 } from 'lucide-react';
import type { Project, Evidence } from '@/domain/projects';
import { useWorkspace } from '@/components/workspace-provider';
import { evidenceIcons, SourcePreview } from './evidence-list';
import { MotionCheckbox, SuccessCheck } from './motion';
import { GeminiReview } from './gemini-review';

export function ResponseBuilder({ project }: { project: Project }) {
  const { updateProject, notify } = useWorkspace();
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
  const [draftSources, setDraftSources] = useState(
    () => project.preparedPacket?.sources.map((source) => source.id).sort().join('|') ?? '',
  );
  const [reviewed, setReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Evidence | null>(null);
  const sources = project.evidence.filter((source) => selected.has(source.id));
  const selectionKey = sources.map((source) => source.id).sort().join('|');
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
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
    if (!draft.trim() || draftSources !== selectionKey) {
      setDraft(
      `Response for ${project.client}\n\nThe following selected records describe the project:\n\n${sources.map((source) => `${source.excerpt} [${source.id}]`).join('\n\n')}\n\n${missingKinds.length ? `Evidence gaps: ${missingKinds.join(', ')}. These gaps remain unresolved.\n\n` : ''}These records should be assessed together. Page access alone does not prove acceptance. This is a draft for human review, not a finding about the dispute.`,
      );
      setDraftSources(selectionKey);
    }
    setReviewed(false);
    setStep(2);
  }
  async function prepare() {
    if (saving || !reviewed || !draft.trim() || unknownCitation || !sources.length)
      return;
    setSaving(true);
    try { await updateProject(
      project.id,
      {
        responsePrepared: true,
        preparedPacket: {
          draft,
          sources,
          reviewedAt: new Date().toISOString(),
        },
      },
      'Response prepared',
    ); } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save reviewed packet');
      return;
    } finally { setSaving(false); }
    setStep(3);
    notify('Reviewed packet prepared. Nothing was submitted.');
  }
  function download() {
    const packet = project.preparedPacket;
    if (!packet) return;
    const file = new Blob(
      [
        JSON.stringify(
          {

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
    anchor.download = `deliveryproof-${project.id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('JSON packet downloaded.');
  }
  return (
    <section className="response-builder">
      <div className="response-intro">
        <div>
          <span className="workspace-eyebrow">{project.status === 'dispute' ? 'DISPUTE RESPONSE' : 'EVIDENCE REVIEW'}</span>
          <h2>A clear record. A considered response.</h2>
          <p>Choose the evidence, review the wording, then keep everything together.</p>
        </div>
        <span className="response-workspace-tag"><FileCheck2 size={15} aria-hidden="true" /> Your workspace</span>
      </div>
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
              <div className="response-step-label">
                <strong>{label}</strong>
                <small>{['Gather the facts', 'Check every claim', 'Keep a reviewed copy'][index]}</small>
              </div>
            </li>
          ),
        )}
      </ol>
      <div className="response-workspace">
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
              <div className="source-list-toolbar">
                <span>{project.evidence.length} preserved records</span>
                <button className="text-button" onClick={() => {
                  setSelected(selected.size === project.evidence.length ? new Set() : new Set(project.evidence.map((source) => source.id)));
                  setReviewed(false);
                }}>{selected.size === project.evidence.length ? 'Clear selection' : 'Select all'}</button>
              </div>
              <div className="source-selection">
                {project.evidence.map((source) => {
                  const Icon = evidenceIcons[source.kind];
                  return (
                    <div className="select-source" data-selected={selected.has(source.id)} key={source.id}>
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
                      <p className="source-card-excerpt">{source.excerpt}</p>
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
              <div className="button-row response-actions">
                <button
                  className="button primary"
                  disabled={!sources.length}
                  onClick={beginReview}
                >
                  Review draft
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <span className="caption">
                  Locally assembled from sample records.
                </span>
              </div>
              <GeminiReview projectId={project.id} sourceIds={sources.map(source => source.id)} onDraft={(value) => {
                setDraft(value);
                setDraftSources(selectionKey);
                setReviewed(false);
                setStep(2);
              }} />
            </>
          )}
          {step === 2 && (
            <>
              <div className="section-heading">
                <h2>Every claim deserves a source.</h2>
                <span className="caption">Draft</span>
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
              <div className="draft-editor-meta">
                <span>{wordCount} words · {sources.length} selected sources</span>
                <span>{unknownCitation ? 'Check source references' : 'References match selected sources'}</span>
              </div>
              <div className="citation-links" aria-label="Selected sources">
                {sources.map((source) => (
                  <button
                    className="citation-link"
                    key={source.id}
                    onClick={() => setPreview(source)}
                  >
                    {source.id}
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
                  this prepares a reviewed packet only.
                </span>
              </label>
              <div className="button-row response-actions">
                <button className="button secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={17} aria-hidden="true" />
                  Choose sources
                </button>
                <button
                  className="button primary"
                  disabled={saving || !reviewed || !draft.trim() || unknownCitation}
                  onClick={prepare}
                >
                  {saving ? 'Saving packet…' : 'Prepare reviewed packet'}
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
                records are together in a reviewed packet. Nothing has been sent to
                PayPal.
              </p>
              <div className="packet-meta">
                <span>
                  Format<strong>JSON reviewed packet</strong>
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
                  Download reviewed packet
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
                The open case stays open. This reviewed packet is not a
                submission-ready PDF.
              </p>
            </div>
          )}
        </div>
        <aside className="response-context" aria-label="Response summary">
          <span className="workspace-eyebrow">RESPONSE WORKSPACE</span>
          <h2>{step === 3 ? 'Packet prepared' : 'Build a clear response'}</h2>
          <p>Keep the facts, their sources, and any gaps together.</p>
          <dl className="response-context-stats">
            <div><dt>Sources included</dt><dd>{sources.length} of {project.evidence.length}</dd></div>
            <div><dt>Review</dt><dd>{step === 3 ? 'Confirmed' : reviewed ? 'Confirmed' : 'Pending'}</dd></div>
            <div><dt>Submission</dt><dd>Not submitted</dd></div>
          </dl>
          <h3>Evidence coverage</h3>
          <div className="coverage-track" aria-hidden="true">
            {['Agreement', 'Payment', 'Delivery', 'Acknowledgement'].map((kind) => (
              <span key={kind} data-covered={!missingKinds.includes(kind)} />
            ))}
          </div>
          <ul className="response-coverage">
            {['Agreement', 'Payment', 'Delivery', 'Acknowledgement'].map((kind) => (
              <li key={kind}>
                {missingKinds.includes(kind) ? <Info size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                <span>{kind}</span>
                <small>{missingKinds.includes(kind) ? 'Missing' : 'Included'}</small>
              </li>
            ))}
          </ul>
          {step === 2 && (
            <div className="review-source-index">
              <h3>Inspect a reference</h3>
              {sources.map((source) => (
                <button key={source.id} onClick={() => setPreview(source)}>
                  <span>{source.id}</span><strong>{source.title}</strong><ArrowRight size={13} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <p className="response-context-note">Page access is a useful record. It does not establish client acceptance.</p>
        </aside>
      </div>
      <SourcePreview source={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
