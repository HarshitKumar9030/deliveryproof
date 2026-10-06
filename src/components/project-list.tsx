'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FolderCheck, Search } from 'lucide-react';
import { money, needsAttention, type Project } from '@/demo/data';
import { ClientMark, Status, EmptyState } from './ui';
import { SlidingPill } from './motion';
export function ProjectList({
  projects,
  searchable = false,
}: {
  projects: Project[];
  searchable?: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'attention'>('all');
  const [query, setQuery] = useState('');
  const displayed = projects.filter(
    (project) =>
      (filter === 'all' || needsAttention(project)) &&
      `${project.client} ${project.title}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <section className="project-section" aria-label="Projects">
      <div className="section-heading">
        <div className="heading-group">
          <h2>Projects</h2>
          <span className="caption">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>
        <div className="segmented t-tabs" aria-label="Project filter">
          <SlidingPill value={filter} />
          <button
            aria-pressed={filter === 'all'}
            className={`t-tab${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            aria-pressed={filter === 'attention'}
            className={`t-tab${filter === 'attention' ? ' active' : ''}`}
            onClick={() => setFilter('attention')}
          >
            Needs attention
          </button>
        </div>
      </div>
      {searchable && (
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search projects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by client or project"
            type="search"
          />
        </label>
      )}
      <div className="project-table">
        <div className="project-columns caption" aria-hidden="true">
          <span>Project</span>
          <span>Payment</span>
          <span>Status</span>
          <span />
        </div>
        {displayed.length ? (
          displayed.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              key={project.id}
              className="project-row"
            >
              <div className="project-name">
                <ClientMark client={project.client} />
                <div>
                  <strong>{project.client}</strong>
                  <span>{project.title}</span>
                </div>
              </div>
              <span className="project-payment">
                {money(project.amount)}
                <span className="sr-only">
                  {project.paid ? ' paid' : ' awaiting payment'}
                </span>
              </span>
              <Status project={project} />
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <EmptyState
            icon={FolderCheck}
            title={query ? 'No matching projects.' : 'All clear.'}
          >
            {query
              ? 'Try another client or project name.'
              : 'No projects need your attention right now.'}
          </EmptyState>
        )}
      </div>
    </section>
  );
}
