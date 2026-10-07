'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight, LockKeyhole } from 'lucide-react';
import type { EvidenceAnalysis } from '@/domain/evidence';
import { Dialog } from './ui';

export function GeminiReview({ projectId, sourceIds, onDraft }: {
  projectId: string;
  sourceIds: string[];
  onDraft: (draft: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [analysis, setAnalysis] = useState<EvidenceAnalysis | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const [password, setPassword] = useState('');
  const controller = useRef<AbortController | null>(null);
  const selection = sourceIds.slice().sort().join('|');
  useEffect(() => {
    setAnalysis(null);
    setError('');
    setBusy(false);
    controller.current?.abort();
    return () => controller.current?.abort();
  }, [projectId, selection]);
  async function analyse() {
    setBusy(true);
    setError('');
    setAnalysis(null);
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch('/api/analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sourceIds, reason }), signal: request.signal,
      });
      const result = await response.json();
      if (response.status === 401) { setUnlock(true); return; }
      if (!response.ok) throw new Error(result.error || 'Analysis could not be completed.');
      setAnalysis(result.analysis);
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : 'Analysis could not be completed.');
    } finally { if (!request.signal.aborted) setBusy(false); }
  }
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/workspace/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json();
      setPassword('');
      if (!response.ok) throw new Error(result.error || 'Could not unlock workspace.');
      setUnlock(false);
      await analyse();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not unlock workspace.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="gemini-review">
      <div className="gemini-heading"><Sparkles size={18} aria-hidden="true" /><h3>Review the evidence with Gemini</h3><span>Human review required</span></div>
      <p>Find supported facts and missing evidence. Your selected demo records and dispute reason are sent to Gemini when you run analysis.</p>
      <label className="gemini-reason">Dispute reason<textarea rows={3} maxLength={2000} value={reason} placeholder="Describe the client's dispute, for example: the client says the agreed files were not delivered." onChange={event => { setReason(event.target.value); setAnalysis(null); }} disabled={busy} /></label>
      <button className="button secondary" disabled={busy || !sourceIds.length || reason.trim().length < 10} onClick={analyse}><Sparkles size={15} aria-hidden="true" />{busy ? 'Analysing selected records…' : 'Analyse with Gemini'}</button>
      {error && !unlock && <p className="form-error" role="alert">{error}</p>}
      {analysis && <div className="gemini-result" aria-live="polite">
        <h4>Evidence findings</h4><p>{analysis.summary}</p>
        <ul>{analysis.findings.map((finding, index) => <li key={index}><p>{finding.statement}</p><span>{finding.evidenceIds.join(' · ')}</span></li>)}</ul>
        {analysis.missingEvidence.length > 0 && <><h4>Evidence gaps</h4><ul>{analysis.missingEvidence.map((gap, index) => <li key={index}>{gap}</li>)}</ul></>}
        <button className="button primary" onClick={() => onDraft(`${analysis.summary}\n\n${analysis.findings.map(finding => `${finding.statement} ${finding.evidenceIds.map(id => `[${id}]`).join(' ')}`).join('\n\n')}\n\nEvidence gaps:\n${analysis.missingEvidence.length ? analysis.missingEvidence.join('\n') : 'No gaps identified by this analysis; verify against the original records.'}\n\nAI-assisted draft. Requires human review. Nothing has been submitted.`)}>Review these findings in a draft<ArrowRight size={15} aria-hidden="true" /></button>
      </div>}
      <Dialog open={unlock} onClose={() => { if (!busy) { setUnlock(false); setPassword(''); setError(''); } }} title="Unlock your workspace">
        <form onSubmit={login} className="form-stack">
          <p className="muted">Use the workspace password in your local environment file. Provider keys stay on the server.</p>
          <label>Workspace password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary" disabled={busy}><LockKeyhole size={15} aria-hidden="true" />{busy ? 'Unlocking…' : 'Unlock and analyse'}</button>
        </form>
      </Dialog>
    </div>
  );
}
