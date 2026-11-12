'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, PackageCheck, ShieldCheck, TriangleAlert } from 'lucide-react';

type Concern = { state: 'open' | 'resolved'; text: string; raisedAt: string };
type Delivery = { title: string; client: string; deliveryLink: string; confirmedAt: string | null; held?: boolean; concern?: Concern | null };

/** While PayPal holds the payment, the client can pause release by reporting a problem, and lift it later. */
function ConcernPanel({ token, delivery, onChange }: { token: string; delivery: Delivery; onChange: (concern: Concern) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(body: object) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/delivery/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChange(result.concern); setOpen(false); setText('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save your concern.'); }
    finally { setBusy(false); }
  }
  const concern = delivery.concern;
  if (concern?.state === 'open') return <div className="mt-6 grid gap-3 rounded-2xl bg-surface p-4 text-xs leading-relaxed" role="status">
    <strong className="flex items-center gap-2 font-medium"><TriangleAlert size={14} aria-hidden="true"/>Payment paused by your concern</strong>
    <p className="text-muted">“{concern.text}”</p>
    <p className="text-muted">The seller cannot release your payment while this is open. Once it is sorted, lift the pause here.</p>
    <button className="button secondary justify-center" disabled={busy} onClick={() => send({ action: 'resolve' })}>{busy ? 'Saving…' : 'My concern is resolved'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
  if (!delivery.held) return concern?.state === 'resolved' ? <p className="mt-6 text-xs text-muted">You resolved your concern.</p> : null;
  return <div className="mt-6 text-xs">
    {concern?.state === 'resolved' && <p className="mb-3 text-muted">You resolved your earlier concern.</p>}
    {!open ? <button className="text-button inline-flex items-center gap-2" onClick={() => setOpen(true)}><TriangleAlert size={14} aria-hidden="true"/>Something wrong? Pause the payment</button>
      : <form className="grid gap-4 rounded-2xl bg-surface p-4" onSubmit={event => { event.preventDefault(); send({ action: 'concern', name, text }); }}>
        <p className="leading-relaxed text-muted">Describe what is missing or wrong. The seller sees your words, the payment stays held, and the AI review takes your report into account.</p>
        <label className="grid gap-2">Your name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)}/></label>
        <label className="grid gap-2">What is wrong?<textarea required minLength={10} maxLength={1000} rows={4} value={text} onChange={event => setText(event.target.value)} placeholder="For example: the brand guide has no typography section."/></label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="button primary" disabled={busy || name.trim().length < 2 || text.trim().length < 10}>{busy ? 'Sending…' : 'Pause payment'}</button>
          <button type="button" className="text-button" onClick={() => setOpen(false)}>Cancel</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>}
  </div>;
}
export function ClientDelivery({ token }: { token: string }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [name, setName] = useState('');
  const [received, setReceived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setDelivery(null); setName(''); setReceived(false); setError('');
    const controller = new AbortController();
    fetch(`/api/delivery/${token}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDelivery(result);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [token]);
  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !delivery) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/delivery/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, received }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDelivery({ ...delivery, confirmedAt: result.confirmedAt });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to confirm receipt.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-dvh w-full max-w-[560px] items-center px-5 py-12"><section className="w-full rounded-[32px] bg-paper p-7 sm:p-10">
    <div className="flex items-center justify-between"><Link href="/" className="text-xs font-medium">DeliveryProof</Link><ShieldCheck size={18} className="text-muted" aria-hidden="true"/></div>
    <div className="mt-9 mb-5 text-accent">{delivery?.confirmedAt ? <CheckCircle2 size={30} aria-hidden="true"/> : <PackageCheck size={30} aria-hidden="true"/>}</div>
    <h1 className="text-[28px] font-semibold tracking-tight">{delivery?.confirmedAt ? 'Receipt recorded.' : 'Confirm you received the files.'}</h1>
    {delivery ? <><p className="mt-3 text-sm">{delivery.title}</p><p className="mt-1 text-xs text-muted">For {delivery.client}</p>
      {!delivery.confirmedAt && <p className="mt-4 text-xs leading-relaxed text-muted">First open the delivered files. Then return here, enter your name and confirm receipt.</p>}
      {!delivery.confirmedAt && delivery.held && <p className="mt-3 rounded-2xl bg-surface p-3 text-xs leading-relaxed text-muted">Your payment is held by PayPal. Confirming receipt is one of the conditions for releasing it to the seller; the delivery must also pass a scope check. Only confirm once you have the files.</p>}
      <a className="button secondary mt-6 w-full justify-center gap-2" href={delivery.deliveryLink} target="_blank" rel="noreferrer">{delivery.confirmedAt ? 'Open delivered files' : '1. Open delivered files'}<ArrowUpRight size={16} aria-hidden="true"/></a>
      {delivery.confirmedAt ? <p className="mt-6 text-sm text-muted" role="status">Receipt acknowledged on {new Date(delivery.confirmedAt).toLocaleDateString()}. Your record has been saved.</p> : <form onSubmit={confirm} className="mt-6 grid gap-5">
        <label className="grid gap-2 text-xs">Your name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)}/></label>
        <label className="flex items-start gap-3 text-xs leading-relaxed"><input type="checkbox" className="mt-1 shrink-0 accent-[var(--accent)]" checked={received} onChange={event => setReceived(event.target.checked)} required/><span>I received the delivery linked above. This records receipt, not satisfaction or approval of the work.</span></label>
        <button className="button primary w-full justify-center gap-2" disabled={busy || !received || name.trim().length < 2}><CheckCircle2 size={16} aria-hidden="true"/>{busy ? 'Recording…' : '2. Confirm receipt'}</button>
        <p className="text-[11px] leading-relaxed text-muted">Your name and the time of acknowledgement will be shared with the sender. No payment is made here.</p>
      </form>}
      <ConcernPanel token={token} delivery={delivery} onChange={concern => setDelivery(current => current ? { ...current, concern } : current)}/></> : !error && <p className="mt-5 text-sm text-muted" role="status">Loading delivery…</p>}
    {error && <p className="form-error mt-5" role="alert">{error}</p>}
  </section></main>;
}
