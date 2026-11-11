'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, LoaderCircle, LockKeyhole, Undo2, Unlock, TriangleAlert, ArrowRight } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import type { Project } from '@/domain/projects';
import type { Gate, GateId, PaymentHold } from '@/domain/release';

type GateState = { hold: PaymentHold | null; gates: Gate[]; canRelease: boolean; warnings: string[]; dispute: boolean };
const fixes: Record<GateId, string> = { funds: 'overview', delivery: 'delivery', receipt: 'delivery', review: 'review', scope: 'review' };

/** Seller view of a proof-gated payment: funds stay with PayPal until every gate passes. */
export function ReleaseGate({ project }: { project: Project }) {
  const { refreshProjects, notify } = useWorkspace();
  const [state, setState] = useState<GateState | null>(null);
  const [busy, setBusy] = useState<'release' | 'return' | null>(null);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/release`, { signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setState(result); setError('');
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'Unable to check the release gate'); }
  }, [project.id]);
  // Re-evaluate whenever project records change (receipt, review, delivery).
  const version = `${project.evidence.length}:${project.deliveryLink}:${project.deliveryConfirmation?.confirmedAt ?? ''}:${project.hold?.state ?? ''}`;
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load, version]);

  async function act(action: 'release' | 'return') {
    if (busy) return;
    setBusy(action); setError('');
    try {
      const response = await fetch(`/api/projects/${project.id}/release`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      notify(action === 'release' ? 'Proof verified. PayPal released the held funds to you.' : 'Hold voided. The client’s funds were returned.');
      await refreshProjects();
    } catch (failure) {
      await load();
      setError(failure instanceof Error ? failure.message : 'PayPal request failed');
    } finally { setBusy(null); setConfirmReturn(false); }
  }

  const passed = state?.gates.filter(g => g.ok).length ?? 0;
  const total = state?.gates.length ?? 5;
  const value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(project.hold?.value ?? project.amount));
  if (project.hold?.state === 'returned') return <div className="grid gap-2"><h3>Funds returned.</h3><p>The PayPal authorization was voided; the client was not charged.</p></div>;
  return <div className="grid gap-3" aria-busy={!state || !!busy}>
    <h3>Release on proof.</h3>
    <p>PayPal is holding {value}. It moves to you only when every check passes.</p>
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(passed / total) * 100}%` }}/></div>
      <span className="text-[11px] tabular-nums text-muted">{passed}/{total}</span>
    </div>
    <ol className="grid gap-1.5" aria-label="Release gate">
      {state ? state.gates.map(gate => <li key={gate.id} className="flex items-start gap-3 rounded-2xl bg-paper px-3.5 py-2.5">
        {gate.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent" aria-label="Passed"/> : <CircleDashed size={16} className="mt-0.5 shrink-0 text-muted" aria-label="Not yet"/>}
        <div className="min-w-0 flex-1">
          <strong className="block text-xs font-medium">{gate.label}</strong>
          <span className="mt-0.5 block break-words text-[11px] leading-relaxed text-muted">{gate.detail}</span>
        </div>
        {!gate.ok && gate.id !== 'funds' && <Link href={`/projects/${project.id}?tab=${fixes[gate.id]}`} className="shrink-0 self-center text-muted" aria-label={`Fix: ${gate.label}`} title="Go fix this"><ArrowRight size={14}/></Link>}
      </li>) : <li className="flex items-center gap-2 text-xs text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden="true"/>Checking the gate…</li>}
    </ol>
    {state?.warnings.map(warning => <p key={warning} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted"><TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true"/>{warning}</p>)}
    {state?.dispute && <p className="text-[11px] text-accent">Release is paused while a dispute is open.</p>}
    <button className="button primary gap-2" disabled={!state?.canRelease || !!busy} onClick={() => act('release')}>
      {busy === 'release' ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> : state?.canRelease ? <Unlock size={16} aria-hidden="true"/> : <LockKeyhole size={16} aria-hidden="true"/>}
      {busy === 'release' ? 'Releasing…' : state?.canRelease ? `Release ${value}` : 'Locked until proven'}
    </button>
    {confirmReturn
      ? <div className="flex flex-wrap items-center gap-2 text-xs"><span className="text-muted">Void the hold and return the funds?</span><button className="text-button" disabled={!!busy} onClick={() => act('return')}>{busy === 'return' ? 'Returning…' : 'Yes, return'}</button><button className="text-button" onClick={() => setConfirmReturn(false)}>Cancel</button></div>
      : <button className="text-button inline-flex items-center gap-2 justify-self-start text-xs" disabled={!!busy} onClick={() => setConfirmReturn(true)}><Undo2 size={14} aria-hidden="true"/>Return funds to client</button>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
