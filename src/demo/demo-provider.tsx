'use client';
import {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  initialActivity,
  initialProjects,
  type Project,
  type Activity,
  type Evidence,
} from './data';
type State = { projects: Project[]; activity: Activity[] };
type Action =
  | { type: 'create'; project: Project }
  | {
      type: 'update';
      id: string;
      changes: Partial<Project>;
      evidence?: Evidence;
      activity: Activity;
    };
function reducer(state: State, action: Action): State {
  if (action.type === 'create')
    return {
      projects: [action.project, ...state.projects],
      activity: [
        {
          id: `activity-${action.project.id}`,
          title: 'Project created',
          client: action.project.client,
          time: 'Just now',
          kind: 'Agreement',
        },
        ...state.activity,
      ],
    };
  return {
    projects: state.projects.map((project) =>
      project.id === action.id
        ? {
            ...project,
            ...action.changes,
            evidence: action.evidence
              ? [...project.evidence, action.evidence]
              : project.evidence,
          }
        : project,
    ),
    activity: [action.activity, ...state.activity].slice(0, 12),
  };
}
type DemoContextValue = State & {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  notice: string;
  notify: (text: string) => void;
  createProject: (
    input: Pick<Project, 'client' | 'title' | 'scope' | 'amount'>,
  ) => string;
  updateProject: (
    id: string,
    changes: Partial<Project>,
    activityTitle: string,
    evidence?: Omit<Evidence, 'id' | 'date'>,
  ) => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    projects: initialProjects,
    activity: initialActivity,
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notice, notify] = useState('');
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => notify(''), 4500);
    return () => clearTimeout(timeout);
  }, [notice]);
  function createProject(
    input: Pick<Project, 'client' | 'title' | 'scope' | 'amount'>,
  ) {
    const id = `project-${crypto.randomUUID()}`;
    dispatch({
      type: 'create',
      project: {
        ...input,
        id,
        paid: false,
        status: 'awaiting-payment',
        deliveryLink: '',
        responsePrepared: false,
        evidence: [
          {
            id: `${id}-agreement`,
            kind: 'Agreement',
            title: 'Project scope saved',
            date: 'October 6, 2026',
            excerpt: input.scope,
          },
        ],
      },
    });
    notify('Demo project created. Start with the payment.');
    return id;
  }
  function updateProject(
    id: string,
    changes: Partial<Project>,
    activityTitle: string,
    evidence?: Omit<Evidence, 'id' | 'date'>,
  ) {
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;
    dispatch({
      type: 'update',
      id,
      changes,
      ...(evidence
        ? {
            evidence: {
              ...evidence,
              id: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
              date: 'October 6, 2026',
            },
          }
        : {}),
      activity: {
        id: crypto.randomUUID(),
        title: activityTitle,
        client: project.client,
        time: 'Just now',
        kind: evidence?.kind ?? 'Agreement',
      },
    });
  }
  return (
    <DemoContext.Provider
      value={{
        ...state,
        theme,
        toggleTheme: () =>
          setTheme((value) => (value === 'light' ? 'dark' : 'light')),
        notice,
        notify,
        createProject,
        updateProject,
      }}
    >
      <div className="theme-root" data-theme={theme}>
        {children}
      </div>
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is required');
  return context;
}
