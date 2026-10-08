'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Copy, Send, RefreshCw, Info, LoaderCircle } from 'lucide-react';
import type { Project } from '@/domain/projects';
import { hasCurrentConfirmation } from '@/domain/handover';
import { useWorkspace } from './workspace-provider';

export function DeliveryConfirmation({ project }: { project: Project }) {
  const { refreshProjects, notify } = useWorkspace();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const confirmed = hasCurrentConfirmation(project);
  useEffect(() => { setUrl(''); setCopied(false); setError(''); }, [project.deliveryLink]);
  async function generate() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/projects/${project.id}/confirmation`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUrl(result.confirmationUrl);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to create link.'); }
    finally { setBusy(false); }
  }
  async function check() {
    setBusy(true); setError('');
    try { await refreshProjects(); notify('Latest delivery status loaded.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to refresh.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError('Copy the URL from Confirmation details below.'); }
  }
  return <section className="mt-8 rounded-[24px] bg-surface p-5 sm:p-6">
    <div className="flex items-center gap-3"><CheckCircle2 size={20} className="text-accent" aria-hidden="true"/><h3 className="text-base font-semibold">{confirmed ? 'Receipt acknowledged' : 'Confirm the handover'}</h3></div>
    <p className="mt-2 text-xs leading-relaxed text-muted">{confirmed ? `${project.deliveryConfirmation!.name} · ${new Date(project.deliveryConfirmation!.confirmedAt).toLocaleDateString()}` : 'Let your client acknowledge receipt of the current delivery.'}</p>
    {!confirmed && <div className="mt-4 flex flex-wrap items-center gap-3">
      {url ? <>
        <button className="button primary gap-2" onClick={copy}>{copied ? <Check size={16} aria-hidden="true"/> : <Copy size={16} aria-hidden="true"/>}{copied ? 'Copied' : 'Copy confirmation link'}</button>
        <a href={url} target="_blank" rel="noreferrer" className="auth-icon" aria-label="Preview client confirmation" title="Preview client confirmation"><ArrowUpRight size={18}/></a>
      </> : <button className="button primary gap-2" disabled={!project.deliveryLink || busy} onClick={generate}>{busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> : <Send size={16} aria-hidden="true"/>}Create confirmation link</button>}
      <button className="auth-icon" onClick={check} disabled={busy} aria-label="Check confirmation status" title="Check confirmation status"><RefreshCw size={17} className={busy ? 'animate-spin' : ''}/></button>
    </div>}
    {!project.deliveryLink && <p className="mt-3 text-xs text-muted">Save your delivery link to enable confirmation.</p>}
    {error && <p className="form-error mt-3" role="alert">{error}</p>}
    <details className="mt-4 text-xs text-muted"><summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"><Info size={14} aria-hidden="true"/>Confirmation details</summary><div className="grid gap-3 pt-3 leading-relaxed"><span>Share with your client. A link holder’s name and receipt acknowledgement are preserved; their identity is not independently verified. Receipt is separate from satisfaction or approval of the work.</span><span>The link expires in seven days and stops working if the delivery URL changes. You cannot confirm your own delivery while signed in as its seller.</span>{url && <input aria-label="Client confirmation link" readOnly value={url}/>}</div></details>
  </section>;
}
