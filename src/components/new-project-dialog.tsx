'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/components/workspace-provider';
import { Dialog } from './ui';
export function NewProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createProject } = useWorkspace();
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const client = String(data.get('client') ?? '').trim();
    const title = String(data.get('title') ?? '').trim();
    const scope = String(data.get('scope') ?? '').trim();
    const amount = Number(data.get('amount'));
    if (
      !client ||
      !title ||
      !scope ||
      !Number.isFinite(amount) ||
      amount < 1 ||
      amount > 1000000
    ) {
      setError(
        'Add a client, project name, scope, and an amount between $1 and $1,000,000.',
      );
      return;
    }
    setSaving(true);
    let id: string;
    try { id = await createProject({ client, title, scope, amount }); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save project'); return; }
    finally { setSaving(false); }
    form.reset();
    setError('');
    onClose();
    router.push(`/projects/${id}`);
  }
  return (
    <Dialog open={open} onClose={onClose} title="A new beginning.">
      <p className="muted">Start with the work you agreed to deliver.</p>
      <form onSubmit={submit} className="form-stack">
        <label>
          Client
          <input
            name="client"
            autoComplete="organization"
            placeholder="e.g. Northstar Studio"
            required
            maxLength={80}
          />
        </label>
        <div className="form-row">
          <label>
            Project name
            <input
              name="title"
              placeholder="e.g. Brand identity"
              required
              maxLength={100}
            />
          </label>
          <label className="amount-field">
            Amount · USD
            <input
              name="amount"
              type="number"
              min={1}
              max={1000000}
              step={1}
              placeholder="2400"
              required
            />
          </label>
        </div>
        <label>
          Agreed scope
          <textarea
            name="scope"
            rows={4}
            placeholder="What will you deliver, and when?"
            required
            maxLength={2000}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="caption">
          Saved to your account. Your scope is a seller-entered record.
        </p>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary gradient-edge" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create project'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
