import { flushPromises, mount } from '@vue/test-utils';
import type { Project } from '@polyapp/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsWidget from '../src/ProjectsWidget.ce.vue';
import { fetchProjects } from '../src/fetchProjects';

vi.mock('../src/fetchProjects', () => ({
  fetchProjects: vi.fn(),
}));

const mocked = vi.mocked(fetchProjects);

const baseProps = {
  apiUrl: 'http://127.0.0.1:4010',
  token: 'test-token',
  tenantId: 'tenant-1',
};

const sample: Project[] = [
  { id: 'p1', tenant_id: 'tenant-1', name: 'Alpha', created_at: '2026-03-02T00:00:00Z' },
  { id: 'p2', tenant_id: 'tenant-1', name: 'Beta', created_at: '2026-03-01T00:00:00Z' },
];

describe('ProjectsWidget', () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  it('shows the loading state before the request settles', () => {
    mocked.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(ProjectsWidget, { props: baseProps });
    expect(wrapper.text()).toContain('Loading projects');
  });

  it('renders the project list with the default heading', async () => {
    mocked.mockResolvedValue(sample);
    const wrapper = mount(ProjectsWidget, { props: baseProps });
    await flushPromises();

    expect(wrapper.find('h2').text()).toBe('Latest projects');
    const names = wrapper.findAll('li').map((li) => li.text());
    expect(names).toEqual(['Alpha', 'Beta']);
    expect(mocked).toHaveBeenCalledWith({
      apiUrl: 'http://127.0.0.1:4010',
      token: 'test-token',
      tenantId: 'tenant-1',
      limit: 5,
    });
  });

  it('shows the empty state when there are no projects', async () => {
    mocked.mockResolvedValue([]);
    const wrapper = mount(ProjectsWidget, { props: baseProps });
    await flushPromises();

    expect(wrapper.text()).toContain('No projects yet');
    expect(wrapper.findAll('li')).toHaveLength(0);
  });

  it('shows the error state when the request fails', async () => {
    mocked.mockRejectedValue(new Error('network down'));
    const wrapper = mount(ProjectsWidget, { props: baseProps });
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('Could not load projects');
    expect(wrapper.findAll('li')).toHaveLength(0);
  });

  it('uses a custom heading and limit when given', async () => {
    mocked.mockResolvedValue(sample);
    const wrapper = mount(ProjectsWidget, {
      props: { ...baseProps, heading: 'Recent work', limit: 2 },
    });
    await flushPromises();

    expect(wrapper.find('h2').text()).toBe('Recent work');
    expect(mocked.mock.calls[0][0].limit).toBe(2);
  });
});
