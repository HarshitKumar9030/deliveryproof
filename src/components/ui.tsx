'use client';
import { useLayoutEffect, useRef, useId, type ReactNode } from 'react';
import { X, ArrowRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { statusLabels, type Project } from '@/domain/projects';
export function ClientMark({
  client,
  small = false,
}: {
  client: string;
  small?: boolean;
}) {
  return (
    <span aria-hidden="true" className={`client-mark${small ? ' small' : ''}`}>
      {client.slice(0, 2).toUpperCase()}
    </span>
  );
}
export function Status({ project }: { project: Project }) {
  return (
    <span
      className={`status ${project.status === 'needs-link' || project.status === 'dispute' ? 'attention' : ''}`}
    >
      {project.responsePrepared && project.status === 'dispute'
        ? 'Draft prepared'
        : statusLabels[project.status]}
    </span>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon size={32} strokeWidth={1.6} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  className = '',
  onClosed,
  closeIcon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  onClosed?: () => void;
  closeIcon?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      dialog.classList.remove('is-closing');
      if (!dialog.open) dialog.showModal();
      void dialog.offsetWidth;
      dialog.classList.add('is-open');
    } else if (dialog.open) {
      dialog.classList.remove('is-open');
      dialog.classList.add('is-closing');
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      const duration = reduced
        ? 0
        : parseFloat(
            getComputedStyle(dialog).getPropertyValue('--modal-close-dur'),
          ) || 150;
      timeout = setTimeout(() => {
        dialog.close();
        dialog.classList.remove('is-closing');
      }, duration);
    }
    return () => clearTimeout(timeout);
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog t-modal ${className}`}
      onClose={onClosed}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const bounds = ref.current.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          {closeIcon ?? <X size={20} />}
        </button>
      </div>
      {children}
    </dialog>
  );
}
