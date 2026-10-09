'use client';
import { useRef, useState } from 'react';
import { FileText, Upload, Download, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { Project } from '@/domain/projects';
import { useWorkspace } from './workspace-provider';

export function ReviewFiles({ project }: { project: Project }) {
  const { refreshProjects } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.set('file', file);
      const response = await fetch(`/api/projects/${project.id}/artifacts`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refreshProjects();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Upload failed.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <section className="my-6 rounded-[28px] bg-paper p-5 sm:p-7" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><span className="text-[9px] uppercase tracking-[0.18em] text-muted">Step 1 · Your files</span><h2 className="mt-1 text-lg font-semibold tracking-tight">Upload files for review.</h2></div><button className="button secondary gap-2 !rounded-2xl" disabled={busy || (project.artifacts?.length || 0) >= 8} onClick={() => input.current?.click()}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Upload size={16}/>} {busy ? 'Preserving…' : 'Upload a file'}</button></div>
    <input ref={input} type="file" className="sr-only" aria-label="Choose an original review file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.svg" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }}/>
    <p className="mt-3 text-xs leading-relaxed text-muted">Step 1 · Upload the actual work you want AI to check. This does not send files to your client.</p>
    {!!project.artifacts?.length && <ul className="mt-5 grid gap-2">{project.artifacts.map(file => <li key={file.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4"><FileText size={19} className="shrink-0 text-muted"/><div className="min-w-0 flex-1"><strong className="block truncate text-xs font-medium">{file.name}</strong><span className="mt-1 block text-[10px] text-muted">{Math.max(1, Math.round(file.bytes / 1024))} KB{file.pages ? ` · ${file.pages} ${file.pages === 1 ? 'page' : 'pages'}` : file.lines ? ` · ${file.lines} lines` : ' · Image'} · Original preserved</span></div><a href={`/api/projects/${project.id}/artifacts/${file.id}`} className="text-muted transition-colors hover:text-ink" aria-label={`Download ${file.name}`}><Download size={17}/></a></li>)}</ul>}
    {error && <p role="alert" className="form-error mt-3">{error}</p>}
    <details className="mt-4 text-[11px] text-muted"><summary className="flex cursor-pointer list-none items-center gap-2"><ShieldCheck size={13}/>File types, limits and privacy</summary><p className="mt-2 leading-relaxed">PDFs, images and UTF-8 text. Up to 8 files, 4 MB each, 12 MB total; text files up to 256 KB. Originals are encrypted before storage, with a SHA-256 fingerprint. Only this account can download decrypted files. Running AI review sends these files to the configured model. Files are preserved as evidence; they do not change your client delivery link or mark receipt. Share the final work from the Delivery tab.</p></details>
  </section>;
}
