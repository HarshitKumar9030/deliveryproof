'use client';
import { useState, type FormEvent } from 'react';
import { Link2 } from 'lucide-react';
import type { Project } from '@/domain/projects';
import { useWorkspace } from './workspace-provider';
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
  return <section className="delivery-panel"><div className="section-heading"><h2>A clear handover.</h2><Link2 size={22} /></div><p className="muted">Save the HTTPS link to the original deliverables. This creates a seller-entered record; it does not establish client access or acceptance.</p><form onSubmit={save} className="form-stack"><label>Delivery link<input type="url" required maxLength={2000} value={link} onChange={event => setLink(event.target.value)} placeholder="https://your-storage.com/final-files" /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button primary" disabled={saving}>{saving ? 'Saving…' : project.deliveryLink ? 'Update delivery link' : 'Save delivery link'}</button></form>{project.deliveryLink && <p className="caption page-note">Link preserved. Client receipt remains unconfirmed until a genuine acknowledgement is recorded.</p>}</section>;
}
