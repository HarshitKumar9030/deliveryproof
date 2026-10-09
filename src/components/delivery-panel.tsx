'use client';
import { useState, type FormEvent } from 'react';
import { Link2, Save } from 'lucide-react';
import type { Project } from '@/domain/projects';
import { useWorkspace } from './workspace-provider';
import { DeliveryConfirmation } from './delivery-confirmation';
import Link from 'next/link';
export function DeliveryPanel({ project }: { project: Project }) {
  const { updateProject, notify } = useWorkspace();
  const [link, setLink] = useState(project.deliveryLink);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    setError(''); setSaving(true);
    try { await updateProject(project.id, { deliveryLink: link.trim() }, 'Delivery link saved'); notify('Delivery link saved. Client access is not yet confirmed.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save delivery'); }
    finally { setSaving(false); }
  }
  return <section className="delivery-panel"><div className="section-heading"><h2>1. Add the client’s delivery link.</h2><Link2 size={22} /></div><p className="muted">Paste a shareable link to the final work in Google Drive, Dropbox or your file host. Make sure the client has access. We’ll include this link on their receipt page.</p><Link href={`/projects/${project.id}?tab=review`} className="mt-3 inline-flex text-xs text-accent">Want AI to check the files first? Open AI review.</Link><form onSubmit={save} className="form-stack"><label>Final files · shared URL<input type="url" required maxLength={2000} value={link} onChange={event => setLink(event.target.value)} placeholder="https://your-storage.com/final-files" /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button primary gap-2" disabled={saving}><Save size={16} aria-hidden="true"/>{saving ? 'Saving…' : project.deliveryLink ? 'Update delivery link' : 'Save delivery link'}</button></form><DeliveryConfirmation project={project}/></section>;
}
