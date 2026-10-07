'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Project, Activity, Evidence } from '@/domain/projects';
export type Account = { id: string; name: string; email: string };
type Context = {
  projects: Project[]; activity: Activity[]; user: Account | null; loading: boolean; loadError: string;
  theme: 'light' | 'dark'; toggleTheme: () => void; notice: string; notify: (text: string) => void;
  createProject: (input: Pick<Project, 'client' | 'title' | 'scope' | 'amount'>) => Promise<string>;
  updateProject: (id: string, changes: Partial<Project>, activityTitle: string, evidence?: Omit<Evidence, 'id' | 'date'>) => Promise<void>;
};
const WorkspaceContext = createContext<Context | null>(null);
export function WorkspaceProvider({ children, initialTheme = 'light', user }: { children: ReactNode; initialTheme?: 'light' | 'dark'; user: Account | null }) {
  const pathname = usePathname();
  const publicPage = pathname === '/' || pathname.startsWith('/pay/') || pathname === '/signin' || pathname === '/signup';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [theme, setTheme] = useState(initialTheme);
  const [notice, notify] = useState('');
  useEffect(() => {
    if (!user || publicPage) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setLoadError('');
    fetch('/api/projects', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (response.status === 401) { window.location.assign('/signin'); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load your workspace');
      setProjects(result.projects);
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, publicPage]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => notify(''), 4500); return () => clearTimeout(timer); }, [notice]);
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.cookie = `deliveryproof-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setTheme(next);
  }
  async function createProject(input: Pick<Project, 'client' | 'title' | 'scope' | 'amount'>) {
    const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Project could not be saved');
    setProjects(current => [result, ...current]); notify('Project saved.'); return result.id as string;
  }
  async function updateProject(id: string, changes: Partial<Project>) {
    const response = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Project could not be saved');
    setProjects(current => current.map(project => project.id === id ? result : project));
  }
  const activity: Activity[] = projects.flatMap(project => project.evidence.map(e => ({ id: e.id, title: e.title, client: project.client, time: e.date, kind: e.kind }))).sort((a,b) => b.time.localeCompare(a.time)).slice(0,12);
  return <WorkspaceContext.Provider value={{ projects, activity, user, loading, loadError, theme, toggleTheme, notice, notify, createProject, updateProject }}><div className="theme-root" data-theme={theme}>{children}</div></WorkspaceContext.Provider>;
}
export function useWorkspace() { const context = useContext(WorkspaceContext); if (!context) throw new Error('Workspace provider required'); return context; }
