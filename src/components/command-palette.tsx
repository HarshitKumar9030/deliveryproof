'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  House,
  Folder,
  Files,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-provider';
import { Dialog } from './ui';

export function CommandPalette({
  open,
  onClose,
  onCreate,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onClosed: () => void;
}) {
  const router = useRouter();
  const { projects } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      inputRef.current?.focus();
    }
  }, [open]);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const commands = [
    {
      id: 'new',
      title: 'Create project',
      detail: 'Action',
      icon: Plus,
      run: onCreate,
    },
    {
      id: 'overview',
      title: 'Overview',
      detail: 'Go to',
      icon: House,
      run: () => go('/dashboard'),
    },
    {
      id: 'projects',
      title: 'Projects',
      detail: 'Go to',
      icon: Folder,
      run: () => go('/projects'),
    },
    {
      id: 'deliveries',
      title: 'Deliveries',
      detail: 'Go to',
      icon: Files,
      run: () => go('/deliveries'),
    },
    {
      id: 'disputes',
      title: 'Disputes',
      detail: 'Go to',
      icon: ShieldCheck,
      run: () => go('/disputes'),
    },
    ...projects.map((project) => ({
      id: project.id,
      title: project.client,
      detail: project.title,
      icon: Folder,
      run: () => go(`/projects/${project.id}`),
    })),
  ];
  const results = commands.filter((item) =>
    `${item.title} ${item.detail}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const active = Math.min(selected, Math.max(0, results.length - 1));
  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, listId, open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      title="Search anything"
      className="command-palette"
    >
      <div className="command-input">
        <Search size={19} aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus
          role="combobox"
          aria-label="Search projects and commands"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            results.length ? `${listId}-${active}` : undefined
          }
          placeholder="Search projects and commands…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected((value) =>
                results.length
                  ? (value +
                      (event.key === 'ArrowDown' ? 1 : -1) +
                      results.length) %
                    results.length
                  : 0,
              );
            }
            if (event.key === 'Enter' && results[active]) {
              event.preventDefault();
              results[active].run();
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div
        className="command-results"
        role="listbox"
        id={listId}
        aria-label="Commands and projects"
      >
        {results.length ? (
          results.map((item, index) => (
            <button
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={active === index}
              tabIndex={-1}
              className="command-result"
              key={item.id}
              onPointerMove={() => setSelected(index)}
              onClick={item.run}
            >
              <item.icon size={17} strokeWidth={1.7} aria-hidden="true" />
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
              {active === index && (
                <CornerDownLeft size={14} aria-hidden="true" />
              )}
            </button>
          ))
        ) : (
          <p className="command-empty">No matching projects or commands.</p>
        )}
      </div>
      <div className="command-footer">
        <span>
          <ArrowUp size={12} />
          <ArrowDown size={12} />
          Navigate
        </span>
        <span>
          <CornerDownLeft size={13} />
          Open
        </span>
        <span>{results.length} results</span>
      </div>
    </Dialog>
  );
}
