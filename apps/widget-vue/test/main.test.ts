import { flushPromises } from '@vue/test-utils';
import type { Project } from '@polyapp/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProjects } from '../src/fetchProjects';
import { ProjectsElement } from '../src/main';

vi.mock('../src/fetchProjects', () => ({
  fetchProjects: vi.fn(),
}));

const mocked = vi.mocked(fetchProjects);

const sample: Project[] = [
  { id: 'p1', tenant_id: 'tenant-1', name: 'Alpha', created_at: '2026-03-02T00:00:00Z' },
];

describe('<polyapp-projects> registration', () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue(sample);
    document.body.innerHTML = '';
  });

  it('registers the custom element with the browser', () => {
    expect(customElements.get('polyapp-projects')).toBe(ProjectsElement);
    expect(typeof ProjectsElement).toBe('function');
  });

  it('renders its heading and project list inside its shadow root', async () => {
    const el = document.createElement('polyapp-projects');
    el.setAttribute('api-url', 'http://127.0.0.1:4010');
    el.setAttribute('token', 'test-token');
    el.setAttribute('tenant-id', 'tenant-1');
    document.body.appendChild(el);
    await flushPromises();

    const root = el.shadowRoot;
    expect(root).not.toBeNull();
    expect(root?.querySelector('h2')?.textContent).toBe('Latest projects');
    const names = Array.from(root?.querySelectorAll('li') ?? []).map((li) => li.textContent);
    expect(names).toEqual(['Alpha']);
    expect(mocked).toHaveBeenCalledWith({
      apiUrl: 'http://127.0.0.1:4010',
      token: 'test-token',
      tenantId: 'tenant-1',
      limit: 5,
    });
  });
});
