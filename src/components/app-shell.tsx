'use client';
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileCheck2,
  House,
  Folder,
  Files,
  ShieldCheck,
  Moon,
  Sun,
  Building2,
  Plus,
  Search,
  Menu,
} from 'lucide-react';
import { useDemo } from '@/demo/demo-provider';
import { NewProjectDialog } from './new-project-dialog';
import { SlidingPill, Toast } from './motion';
import { CommandPalette } from './command-palette';
import { Dialog } from './ui';
const navigation = [
  { href: '/', label: 'Overview', icon: House },
  { href: '/projects', label: 'Projects', icon: Folder },
  { href: '/deliveries', label: 'Deliveries', icon: Files },
  { href: '/disputes', label: 'Disputes', icon: ShieldCheck },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme, notice, projects } = useDemo();
  const openCases = projects.filter(
    (project) => project.status === 'dispute',
  ).length;
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [queuedCreate, setQueuedCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 761px)');
    const close = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (
          creating ||
          document.querySelector('dialog[open]:not(.command-palette)')
        )
          return;
        event.preventDefault();
        setSearching((value) => !value);
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [creating]);
  const current =
    navigation.find((item) =>
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
    )?.label ?? 'Workspace';
  return (
    <div className="app-shell flex min-h-dvh flex-col min-[761px]:grid min-[761px]:grid-cols-[260px_minmax(0,1fr)]">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="DeliveryProof home">
          <span className="brand-icon">
            <FileCheck2 size={21} strokeWidth={1.7} />
          </span>
          <span>DeliveryProof</span>
        </Link>
        <button
          className="command-trigger"
          onClick={() => setSearching(true)}
          aria-label="Search anything"
        >
          <Search size={16} />
          <span>Search anything…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <p className="nav-section-label">Workspace</p>
        <button
          className="icon-button mobile-menu-toggle"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <nav
          className="navigation t-tabs desktop-navigation"
          aria-label="Main navigation"
        >
          <SlidingPill value={current} />
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item t-tab${active ? ' selected' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={23} strokeWidth={1.7} />
                <span>{label}</span>
                {href === '/disputes' && openCases > 0 && (
                  <span className="nav-count">{openCases}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-label">
            <Building2 size={21} strokeWidth={1.7} />
            <span>Demo workspace</span>
          </div>
          <div className="account">
            <span className="avatar">AM</span>
            <span>Alex Morgan</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <span>{current}</span>
          </div>
          <div className="toolbar flex items-center gap-3.5">
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              <span
                className="t-icon-swap"
                data-state={theme === 'light' ? 'a' : 'b'}
                aria-hidden="true"
              >
                <span className="t-icon" data-icon="a">
                  <Moon size={21} />
                </span>
                <span className="t-icon" data-icon="b">
                  <Sun size={21} />
                </span>
              </span>
            </button>
            <button
              className="button primary gradient-edge"
              onClick={() => setCreating(true)}
            >
              <Plus size={17} className="mobile-plus" aria-hidden="true" />
              <span>New project</span>
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="route-enter" key={pathname}>
            {children}
          </div>
        </main>
        <footer className="app-footer">
          Demo data only. Nothing is sent to PayPal.
        </footer>
      </div>
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Workspace"
        className="mobile-menu"
      >
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="grid gap-2 py-3"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="mobile-menu-link flex items-center gap-3 rounded-2xl px-5 py-3 text-sm text-muted"
              aria-current={
                (href === '/' ? pathname === '/' : pathname.startsWith(href))
                  ? 'page'
                  : undefined
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {href === '/disputes' && openCases > 0 && (
                <span className="ml-auto text-xs">{openCases}</span>
              )}
            </Link>
          ))}
        </nav>
        <p className="caption">Demo workspace · Alex Morgan</p>
      </Dialog>
      <NewProjectDialog open={creating} onClose={() => setCreating(false)} />
      <CommandPalette
        open={searching}
        onClose={() => setSearching(false)}
        onCreate={() => {
          setQueuedCreate(true);
          setSearching(false);
        }}
        onClosed={() => {
          if (queuedCreate) {
            setQueuedCreate(false);
            setCreating(true);
          }
        }}
      />
      <Toast message={notice} />
    </div>
  );
}
