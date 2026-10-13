import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPolyAppClient } from '@polyapp/api-client';
import { createMockServer, type MockServer } from '@polyapp/mock-api';
import { fetchProjects } from '../src/fetchProjects';

describe('fetchProjects against mock-api', () => {
  let server: MockServer;
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    server = await createMockServer({ port: 0 });
    const client = createPolyAppClient({ baseUrl: server.url });
    token = await client.devToken('widget@example.test');
    const authed = createPolyAppClient({ baseUrl: server.url, token });
    const tenant = await authed.createTenant('Widget tenant');
    tenantId = tenant.id;
    for (let i = 1; i <= 7; i += 1) {
      await authed.createProject(tenantId, `project-${i}`);
    }
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns at most `limit` projects, newest first', async () => {
    const projects = await fetchProjects({ apiUrl: server.url, token, tenantId, limit: 5 });
    expect(projects).toHaveLength(5);
    expect(projects.map((p) => p.name)).toEqual([
      'project-7',
      'project-6',
      'project-5',
      'project-4',
      'project-3',
    ]);
  });

  it('defaults to 5 projects when no limit is given', async () => {
    const projects = await fetchProjects({ apiUrl: server.url, token, tenantId });
    expect(projects).toHaveLength(5);
  });

  it('returns every project when the limit is larger than the count', async () => {
    const projects = await fetchProjects({ apiUrl: server.url, token, tenantId, limit: 50 });
    expect(projects).toHaveLength(7);
    expect(projects[0].name).toBe('project-7');
  });
});
