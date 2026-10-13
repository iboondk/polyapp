import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockServer, type MockServer } from '@polyapp/mock-api';
import { createPolyAppClient } from '@polyapp/api-client';
import { getConfig, loadCatalog, loadProduct } from '../lib/api';

const EMAIL = 'storefront@example.test';

describe('storefront data access against the mock API', () => {
  let server: MockServer;
  let tenantId: string;

  beforeAll(async () => {
    server = await createMockServer({ port: 0 });

    // Seed one tenant and two projects through the public client, as the tenant owner.
    const bootstrap = createPolyAppClient({ baseUrl: server.url });
    const token = await bootstrap.devToken(EMAIL);
    const client = createPolyAppClient({ baseUrl: server.url, token });
    const tenant = await client.createTenant('Storefront Test Tenant');
    tenantId = tenant.id;
    await client.createProject(tenantId, 'Alpha');
    await client.createProject(tenantId, 'Beta');
  });

  afterAll(async () => {
    await server?.close();
  });

  const env = () => ({
    POLYAPP_API_URL: server.url,
    POLYAPP_TENANT_ID: tenantId,
    POLYAPP_DEV_EMAIL: EMAIL,
  });

  it('loadCatalog returns the two seeded projects', async () => {
    const catalog = await loadCatalog(env());
    expect(catalog.tenantId).toBe(tenantId);
    expect(catalog.projects).toHaveLength(2);
    expect(catalog.projects.map((p) => p.name).sort()).toEqual(['Alpha', 'Beta']);
  });

  it('loadProduct returns null for an unknown project id', async () => {
    const product = await loadProduct(randomUUID(), env());
    expect(product).toBeNull();
  });

  it('getConfig throws an error that names the missing POLYAPP_TENANT_ID', () => {
    expect(() => getConfig({})).toThrow(/POLYAPP_TENANT_ID/);
  });
});
