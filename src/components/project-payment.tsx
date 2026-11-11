'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, CreditCard, Copy, Check, ArrowUpRight, Info, Settings2, LoaderCircle, LockKeyhole } from 'lucide-react';

export function ProjectPayment({ projectId }: { projectId: string }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<'create' | 'refresh' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  // Proof-gated by default: PayPal authorizes and holds funds until the release gate passes.
  const [hold, setHold] = useState(true);
  async function create(refresh = false) {
    if (busy) return;
    setBusy(refresh ? 'refresh' : 'create'); setError(''); setCopied(false); setRefreshed(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/payment?hold=${hold ? 1 : 0}${refresh ? '&refresh=1' : ''}`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUrl(result.paymentUrl); setRefreshed(refresh);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to create payment');
      if (refresh) setUrl('');
    } finally { setBusy(null); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError('Copy the URL from Payment help below.'); }
  }
  return <div className="grid gap-3" aria-busy={!!busy}>
    <p className="text-xs leading-relaxed text-muted">{url ? (hold ? 'Send this link to your client. PayPal holds their payment; you release it once delivery is proven.' : 'Copy this link and send it to your client. They approve in PayPal, then complete payment on the checkout page.') : 'Create a checkout for this project’s amount. Connect your seller sandbox app in Account first.'}</p>
    {!url && <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-xs"><input type="checkbox" className="mt-0.5" checked={hold} onChange={event => setHold(event.target.checked)}/><span><strong className="flex items-center gap-1.5 font-medium"><LockKeyhole size={13} aria-hidden="true"/>Hold until delivery is proven</strong><span className="mt-1 block leading-relaxed text-muted">PayPal authorizes the payment now. Funds are captured only after receipt and an AI scope check pass.</span></span></label>}
    {url ? <div className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-xs">{hold ? <LockKeyhole size={16} className="shrink-0" aria-hidden="true"/> : <CreditCard size={16} className="shrink-0" aria-hidden="true"/>}{hold ? 'Held checkout ready' : 'Checkout ready'}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button className="auth-icon" onClick={copy} title={copied ? 'Copied' : 'Copy payment link'} aria-label={copied ? 'Payment link copied' : 'Copy payment link'}>{copied ? <Check size={17}/> : <Copy size={17}/>}</button>
        <a className="auth-icon" href={url} target="_blank" rel="noreferrer" title="Open client checkout" aria-label="Open client checkout"><ArrowUpRight size={18}/></a>
        <button className="auth-icon" disabled={!!busy} onClick={() => create(true)} title="Replace unpaid checkout" aria-label="Replace unpaid checkout">{busy ? <LoaderCircle size={16} className="animate-spin"/> : <RefreshCw size={16}/>}</button>
      </div>
    </div> : <button className="button primary gap-2" disabled={!!busy} onClick={() => create()}>{busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> : <CreditCard size={16} aria-hidden="true"/>}{busy ? 'Preparing checkout…' : 'Create payment link'}</button>}
    {(copied || refreshed) && <span role="status" className="text-[11px] text-muted">{copied ? 'Link copied.' : 'Fresh checkout ready.'}</span>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <details className="text-xs text-muted">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden"><Info size={14} aria-hidden="true"/>Payment help</summary>
      <div className="grid gap-3 pb-1 pt-2 leading-relaxed">
        <span>Sandbox · Test funds only. Payment is recorded after a verified PayPal capture. Held payments use a PayPal authorization, valid for up to 29 days.</span>
        <span>Replace checkout generates a fresh link and invalidates the old app link. Approved payments must be completed first.</span>
        <Link href="/account" className="inline-flex items-center gap-2 text-ink"><Settings2 size={14} aria-hidden="true"/>PayPal connection<ArrowUpRight size={13} aria-hidden="true"/></Link>
        {url && <input aria-label="Client payment link" readOnly value={url} className="min-w-0 text-xs"/>}
      </div>
    </details>
  </div>;
}
