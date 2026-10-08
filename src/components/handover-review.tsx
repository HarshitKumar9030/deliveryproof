'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ScanText, ArrowRight, CheckCircle2, CircleDashed, CircleAlert, Copy, Check, LoaderCircle, Info } from 'lucide-react';
import type { Project } from '@/domain/projects';
import { hasCurrentConfirmation, type HandoverReview as Review } from '@/domain/handover';

const labels = { payment: 'Prepare payment link', delivery: 'Update delivery', confirmation: 'Request receipt', evidence: 'Inspect sources' };
export function HandoverReview({ project }: { project: Project }) {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const snapshot = JSON.stringify([project.scope, project.paid, project.deliveryLink, project.deliveryConfirmation, project.evidence]);
  useEffect(() => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setReview(null); setError(''); setBusy(false); setCopied(false);
    fetch(`/api/projects/${project.id}/review`, { signal: request.signal, cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) setStale(true); throw new Error(result.error); }
      setReview(result.review); setStale(!!result.stale);
    }).catch(failure => { if (!request.signal.aborted) setError(failure.message); });
    return () => request.abort();
  }, [project.id, snapshot]);
  async function run() {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError(''); setCopied(false);
    try {
      const response = await fetch(`/api/projects/${project.id}/review`, { method: 'POST', signal: request.signal });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) setStale(true); throw new Error(result.error); }
      setReview(result.review); setStale(false);
    } catch (failure) { if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : 'Review failed.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  async function copy() {
    if (!review) return;
    try { await navigator.clipboard.writeText(review.confirmationMessage); setCopied(true); }
    catch { setError('Select and copy the request text below.'); }
  }
  return <section className="handover-review-panel gradient-edge my-7 rounded-[28px] bg-paper p-5 sm:p-7" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-surface text-accent"><ScanText size={21} aria-hidden="true"/></span><div><span className="text-[9px] uppercase tracking-[0.18em] text-muted">AI-assisted evidence check</span><h2 className="mt-1 text-lg font-semibold tracking-tight">Delivery review</h2></div></div><button className="button secondary gap-2 !rounded-2xl !px-5 !py-2.5" disabled={busy} onClick={run}>{busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true"/> : <ScanText size={15} aria-hidden="true"/>}{busy ? 'Reviewing…' : review ? 'Review again' : 'Run review'}</button></div>
    <p className="mt-4 text-xs leading-relaxed text-muted">Every requirement, connected to its proof.</p>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted">
      {[['Payment', project.paid], ['Delivery link', !!project.deliveryLink], ['Receipt', hasCurrentConfirmation(project)]].map(([label, done]) => <span key={String(label)} className="flex items-center gap-1.5">{done ? <CheckCircle2 size={13} aria-hidden="true"/> : <CircleDashed size={13} aria-hidden="true"/>}{String(label)} {done ? 'recorded' : 'pending'}</span>)}
    </div>
    {error && <p className="form-error mt-4" role="alert">{error}</p>}
    {stale && <p className="mt-4 flex items-center gap-2 text-xs text-accent" role="status"><CircleAlert size={15} aria-hidden="true"/>Records changed. Run a fresh review before using these findings.</p>}
    {review && <div className="mt-5 grid gap-5" aria-live="polite">
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface p-4">{(['supported', 'partial', 'missing'] as const).map(status => <div key={status}><strong className="text-2xl font-medium tabular-nums tracking-tight">{review.checkpoints.filter(checkpoint => checkpoint.status === status).length}</strong><span className="mt-1 block text-[10px] uppercase tracking-wider text-muted">{status === 'missing' ? 'Gaps' : status}</span></div>)}</div>
      <div className="grid gap-2">{review.checkpoints.map((checkpoint, index) => <details key={index} className="rounded-2xl bg-surface px-4 py-3.5"><summary className="flex cursor-pointer list-none items-start gap-3 text-xs [&::-webkit-details-marker]:hidden">{checkpoint.status === 'supported' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true"/> : checkpoint.status === 'partial' ? <CircleDashed size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true"/> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true"/>}<span className="min-w-0 flex-1 leading-relaxed">{checkpoint.requirement}</span><span className="shrink-0 pt-0.5 text-[9px] uppercase tracking-wider text-muted">{checkpoint.status}</span></summary><p className="mt-3 text-xs leading-relaxed text-muted">{checkpoint.explanation}</p>{checkpoint.evidenceIds.map(id => <Link key={id} href={`/projects/${project.id}?tab=evidence`} className="mt-2 block text-[11px] text-accent">{project.evidence.find(source => source.id === id)?.title || id}</Link>)}</details>)}</div>
      {!stale && <div className="grid gap-2">{review.nextActions.filter(item => !(item.action === 'payment' && project.paid) && !(item.action === 'confirmation' && hasCurrentConfirmation(project))).map((item, index) => <Link key={index} href={`/projects/${project.id}?tab=${item.action === 'payment' ? 'overview' : item.action === 'evidence' ? 'evidence' : 'delivery'}`} className="flex items-center justify-between gap-4 rounded-2xl bg-paper px-4 py-3"><div><strong className="text-xs font-medium">{labels[item.action]}</strong><p className="mt-1 text-[11px] leading-relaxed text-muted">{item.reason}</p></div><ArrowRight size={16} className="shrink-0" aria-hidden="true"/></Link>)}</div>}
      <details className="text-xs"><summary className="cursor-pointer text-muted">Suggested client message</summary><p className="mt-3 leading-relaxed">{review.confirmationMessage}</p><button className="text-button mt-3 inline-flex items-center gap-2" onClick={copy} disabled={stale}>{copied ? <Check size={14} aria-hidden="true"/> : <Copy size={14} aria-hidden="true"/>}{copied ? 'Copied' : 'Copy request'}</button></details>
      <details className="text-xs"><summary className="cursor-pointer text-muted">Review summary</summary><p className="mt-3 leading-relaxed">{review.summary}</p></details>
    </div>}
    <details className="mt-4 text-[11px] text-muted"><summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"><Info size={13} aria-hidden="true"/>How this review works</summary><p className="mt-2 leading-relaxed">Running review sends this project’s scope and saved evidence to the configured AI model. Findings cite your original records. Links and file contents are not inspected. Review the suggestions before using them; payment and receipt status come from the app’s records.</p></details>
  </section>;
}
