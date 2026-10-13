import { describe, expect, inject, it } from 'vitest';
import { createPolyAppClient, PolyAppError } from '../src/index.js';

const baseUrl = inject('apiUrl');
const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function ownerClient() {
  const anon = createPolyAppClient({ baseUrl });
  const token = await anon.devToken(`owner-${runId}@example.test`);
  return createPolyAppClient({ baseUrl, token });
}

describe('@polyapp/api-client against the mock API', () => {
  it('health reports ok', async () => {
    const client = createPolyAppClient({ baseUrl });
    await expect(client.health()).resolves.toEqual({ status: 'ok' });
  });

  it('devToken returns a string token', async () => {
    const client = createPolyAppClient({ baseUrl });
    const token = await client.devToken(`dev-${runId}@example.test`);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('owner can create a tenant and project, list them, and get the project', async () => {
    const owner = await ownerClient();
    const tenant = await owner.createTenant(`Tenant ${runId}`);
    expect(tenant.name).toBe(`Tenant ${runId}`);

    const project = await owner.createProject(tenant.id, `Project ${runId}`);
    expect(project.tenant_id).toBe(tenant.id);

    const projects = await owner.listProjects(tenant.id);
    expect(projects.map((p) => p.id)).toContain(project.id);

    const fetched = await owner.getProject(tenant.id, project.id);
    expect(fetched).toEqual(project);
  });

  it('a user who is not a member gets 404 not_found for the tenant', async () => {
    const owner = await ownerClient();
    const tenant = await owner.createTenant(`Private ${runId}`);

    const anon = createPolyAppClient({ baseUrl });
    const otherToken = await anon.devToken(`other-${runId}@example.test`);
    const other = createPolyAppClient({ baseUrl, token: otherToken });

    const err = await other.listProjects(tenant.id).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(PolyAppError);
    expect(err).toMatchObject({ status: 404, code: 'not_found' });
  });

  it('a duplicate project name returns 409 conflict', async () => {
    const owner = await ownerClient();
    const tenant = await owner.createTenant(`Dupes ${runId}`);
    await owner.createProject(tenant.id, 'Same Name');

    const err = await owner.createProject(tenant.id, 'Same Name').then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(PolyAppError);
    expect(err).toMatchObject({ status: 409, code: 'conflict' });
  });

  it('createTenant without a token returns 401', async () => {
    const anon = createPolyAppClient({ baseUrl });
    const err = await anon.createTenant(`Anon ${runId}`).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(PolyAppError);
    expect(err).toMatchObject({ status: 401, code: 'unauthorized' });
  });
});
