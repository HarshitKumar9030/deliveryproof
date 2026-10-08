'use client';
import { usePathname } from 'next/navigation';
import { AppShell } from './app-shell';
import { useWorkspace } from './workspace-provider';
import { useEffect } from 'react';
export function RouteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, loading, loadError } = useWorkspace();
  const publicPage = path === '/' || path.startsWith('/pay/') || path.startsWith('/delivery/') || path === '/signin' || path === '/signup';
  useEffect(() => { if (!publicPage && !user) window.location.replace('/signin'); }, [publicPage, user]);
  if (publicPage) return children;
  if (!user) return <div className="grid min-h-dvh place-items-center text-muted">Opening sign in…</div>;
  return <AppShell>{loading ? <div role="status" className="soft-panel">Loading your workspace…</div> : loadError ? <div role="alert" className="soft-panel"><h2>Couldn’t load your workspace.</h2><p>{loadError}</p><button className="button secondary" onClick={() => window.location.reload()}>Try again</button></div> : children}</AppShell>;
}
