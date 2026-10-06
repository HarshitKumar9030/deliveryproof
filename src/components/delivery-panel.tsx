'use client';

import { useState, type FormEvent } from 'react';
import { Link2, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Project } from '@/demo/data';
import { useDemo } from '@/demo/demo-provider';
import { SuccessCheck } from './motion';

export function DeliveryPanel({ project }: { project: Project }) {
  const { updateProject, notify } = useDemo();
  const [link, setLink] = useState(
    project.status === 'needs-link' ? '' : project.deliveryLink,
  );
  const [error, setError] = useState('');
  const expired = project.status === 'needs-link';
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = link.trim();
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('invalid');
    } catch {
      setError('Use a full HTTPS link, without a username or password.');
      return;
    }
    updateProject(
      project.id,
      {
        deliveryLink: value,
        status: project.status === 'dispute' ? 'dispute' : 'delivered',
      },
      expired ? 'Delivery link updated' : 'Demo delivery recorded',
      {
        kind: 'Delivery',
        title: expired
          ? 'Replacement delivery link saved'
          : 'Delivery link saved',
        excerpt: `A demo delivery link was recorded for ${project.client}: ${value}. This local action does not establish that the client accessed the files.`,
      },
    );
    setError('');
    notify(
      expired
        ? 'Demo link updated. Client access is still unconfirmed.'
        : 'Demo delivery recorded. Client confirmation is next.',
    );
  }
  if (!project.paid)
    return (
      <div className="soft-panel">
        <h2>Payment comes first.</h2>
        <p>
          Return to the overview and record a demo payment before starting the
          handover.
        </p>
      </div>
    );
  return (
    <section className="delivery-panel">
      {expired && (
        <div className="inline-attention">
          <Link2 size={24} aria-hidden="true" />
          <div>
            <h3>This delivery link has expired.</h3>
            <p>
              The original delivery record is preserved. Add a replacement to
              continue the demo.
            </p>
          </div>
        </div>
      )}
      <div className="section-heading">
        <h2>
          {project.status === 'complete'
            ? 'Handover complete.'
            : expired
              ? 'Restore access.'
              : 'Make the handover clear.'}
        </h2>
      </div>
      <p className="muted measure">
        {project.status === 'complete'
          ? 'The demo client has confirmed receipt. Your agreement, payment, delivery, and acknowledgement are kept together.'
          : 'Add the link to your final files. Delivery and acknowledgement are recorded as separate events.'}
      </p>
      <form className="form-stack delivery-form" onSubmit={save}>
        <label>
          Delivery link
          <input
            aria-describedby="link-help"
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://example.com/your-delivery"
            required
            maxLength={1000}
            disabled={project.status === 'complete'}
          />
        </label>
        <p id="link-help" className="caption">
          Demo only. Links are stored locally for this session; they aren’t
          checked or sent to clients.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {project.status !== 'complete' && (
          <div className="button-row">
            <button className="button primary" type="submit">
              {expired
                ? 'Save replacement link'
                : project.deliveryLink
                  ? 'Update demo link'
                  : 'Record demo delivery'}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setLink(`https://example.com/${project.id}/final-delivery`);
                setError('');
              }}
            >
              Use sample link
            </button>
          </div>
        )}
      </form>
      {project.deliveryLink && !expired && (
        <div className="confirmation-panel">
          <SuccessCheck key={project.status} size={28} />
          <div>
            <h3>
              {project.status === 'complete'
                ? 'Receipt confirmed.'
                : 'Next: client confirmation.'}
            </h3>
            <p>
              {project.status === 'complete'
                ? 'A synthetic acknowledgement is included in your evidence.'
                : 'A saved link isn’t proof of acceptance. Add a sample acknowledgement to see how that record completes the handover.'}
            </p>
            {project.status !== 'complete' && project.status !== 'dispute' && (
              <button
                className="text-button"
                onClick={() => {
                  updateProject(
                    project.id,
                    { status: 'complete' },
                    'Client acknowledgement recorded',
                    {
                      kind: 'Acknowledgement',
                      title: 'Demo client confirmed receipt',
                      excerpt: `Synthetic acknowledgement for ${project.client}: “I have received the final deliverables for ${project.title}.”`,
                    },
                  );
                  notify('Demo acknowledgement added. Project completed.');
                }}
              >
                Record demo acknowledgement
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
