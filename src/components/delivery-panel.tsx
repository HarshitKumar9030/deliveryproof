'use client';
import { useState, type FormEvent } from 'react';
import { Link2, Save } from 'lucide-react';
import type { Project } from '@/domain/projects';
import { useWorkspace } from './workspace-provider';
import { DeliveryConfirmation } from './delivery-confirmation';
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
  return <section className="delivery-panel"><div className="section-heading"><h2>A clear handover.</h2><Link2 size={22} /></div><p className="muted">Preserve the original files, then ask your client to confirm receipt.</p><form onSubmit={save} className="form-stack"><label>Delivery link<input type="url" required maxLength={2000} value={link} onChange={event => setLink(event.target.value)} placeholder="https://your-storage.com/final-files" /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button primary gap-2" disabled={saving}><Save size={16} aria-hidden="true"/>{saving ? 'Saving…' : project.deliveryLink ? 'Update delivery link' : 'Save delivery link'}</button></form><DeliveryConfirmation project={project}/></section>;
}
