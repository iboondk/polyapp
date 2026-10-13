import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockServer } from './server.mjs';

let server;
let base;

async function call(method, path, { token, body, rawBody, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (token) init.headers.authorization = `Bearer ${token}`;
  if (rawBody !== undefined) {
    init.body = rawBody;
    init.headers['content-type'] = 'application/json';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['content-type'] = 'application/json';
  }
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
}

async function devToken(email) {
  const res = await call('POST', '/v1/auth/dev-token', { body: { email } });
  assert.equal(res.status, 200);
  return res.json.token;
}

before(async () => {
  server = await createMockServer({ port: 0 });
  base = server.url;
});

after(async () => {
  await server.close();
});

describe('mock api', () => {
  it('GET /healthz returns ok', async () => {
    const res = await call('GET', '/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/json');
    assert.deepEqual(res.json, { status: 'ok' });
  });

  it('POST /v1/auth/dev-token issues a token and rejects a bad email', async () => {
    const token = await devToken('dev-token-check@example.test');
    assert.match(token, /^dev\.[0-9a-f-]{36}$/);

    const missing = await call('POST', '/v1/auth/dev-token', { body: {} });
    assert.equal(missing.status, 400);
    assert.equal(missing.json.error, 'invalid_request');

    const noAt = await call('POST', '/v1/auth/dev-token', { body: { email: 'not-an-email' } });
    assert.equal(noAt.status, 400);
    assert.equal(noAt.json.error, 'invalid_request');
  });

  it('POST /v1/tenants creates a tenant and returns 201', async () => {
    const token = await devToken('tenant-creator@example.test');
    const res = await call('POST', '/v1/tenants', { token, body: { name: 'Acme' } });
    assert.equal(res.status, 201);
    assert.equal(res.json.name, 'Acme');
    assert.match(res.json.id, /^[0-9a-f-]{36}$/);
  });

  it('the owner creates projects and lists them newest first', async () => {
    const token = await devToken('owner-flow@example.test');
    const tenant = (await call('POST', '/v1/tenants', { token, body: { name: 'Owner Co' } })).json;

    const first = await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, body: { name: 'Alpha' } });
    assert.equal(first.status, 201);
    assert.equal(first.json.tenant_id, tenant.id);
    assert.equal(first.json.name, 'Alpha');
    assert.ok(!Number.isNaN(Date.parse(first.json.created_at)));

    const second = await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, body: { name: 'Beta' } });
    assert.equal(second.status, 201);

    const list = await call('GET', `/v1/tenants/${tenant.id}/projects`, { token });
    assert.equal(list.status, 200);
    assert.deepEqual(
      list.json.items.map((p) => p.name),
      ['Beta', 'Alpha'],
    );

    const single = await call('GET', `/v1/tenants/${tenant.id}/projects/${first.json.id}`, { token });
    assert.equal(single.status, 200);
    assert.equal(single.json.id, first.json.id);
  });

  it('a non-member gets 404 on another tenant list and get', async () => {
    const ownerToken = await devToken('first-owner@example.test');
    const outsiderToken = await devToken('outsider@example.test');
    const tenant = (await call('POST', '/v1/tenants', { token: ownerToken, body: { name: 'Private' } })).json;
    const project = (
      await call('POST', `/v1/tenants/${tenant.id}/projects`, { token: ownerToken, body: { name: 'Secret' } })
    ).json;

    const list = await call('GET', `/v1/tenants/${tenant.id}/projects`, { token: outsiderToken });
    assert.equal(list.status, 404);
    assert.equal(list.json.error, 'not_found');

    const get = await call('GET', `/v1/tenants/${tenant.id}/projects/${project.id}`, { token: outsiderToken });
    assert.equal(get.status, 404);
    assert.equal(get.json.error, 'not_found');

    const unknown = await call('GET', `/v1/tenants/00000000-0000-4000-8000-000000000000/projects`, {
      token: outsiderToken,
    });
    assert.equal(unknown.status, 404);
  });

  it('returns 401 unauthorized without a known bearer token', async () => {
    const none = await call('POST', '/v1/tenants', { body: { name: 'No Token' } });
    assert.equal(none.status, 401);
    assert.deepEqual(none.json.error, 'unauthorized');
    assert.equal(typeof none.json.message, 'string');

    const unknown = await call('GET', '/v1/tenants/00000000-0000-4000-8000-000000000000/projects', {
      token: 'dev.not-issued',
    });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.json.error, 'unauthorized');
  });

  it('returns 400 invalid_request for an empty project name', async () => {
    const token = await devToken('empty-name@example.test');
    const tenant = (await call('POST', '/v1/tenants', { token, body: { name: 'Validation' } })).json;

    const res = await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, body: { name: '' } });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, 'invalid_request');
    assert.equal(typeof res.json.message, 'string');

    const malformed = await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, rawBody: '{not json' });
    assert.equal(malformed.status, 400);
  });

  it('returns 409 conflict for a duplicate project name in the same tenant', async () => {
    const token = await devToken('dupes@example.test');
    const tenant = (await call('POST', '/v1/tenants', { token, body: { name: 'Dupes' } })).json;

    const created = await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, body: { name: 'Same' } });
    assert.equal(created.status, 201);

    const dup = await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, body: { name: 'Same' } });
    assert.equal(dup.status, 409);
    assert.equal(dup.json.error, 'conflict');
  });

  it('returns 404 when a project is fetched under the wrong tenant', async () => {
    const token = await devToken('two-tenants@example.test');
    const tenantA = (await call('POST', '/v1/tenants', { token, body: { name: 'Tenant A' } })).json;
    const tenantB = (await call('POST', '/v1/tenants', { token, body: { name: 'Tenant B' } })).json;
    const project = (
      await call('POST', `/v1/tenants/${tenantA.id}/projects`, { token, body: { name: 'In A' } })
    ).json;

    const wrong = await call('GET', `/v1/tenants/${tenantB.id}/projects/${project.id}`, { token });
    assert.equal(wrong.status, 404);
    assert.equal(wrong.json.error, 'not_found');

    const right = await call('GET', `/v1/tenants/${tenantA.id}/projects/${project.id}`, { token });
    assert.equal(right.status, 200);
  });

  it('accepts the service token as admin of every tenant', async () => {
    const previous = process.env.POLYAPP_SERVICE_TOKEN;
    process.env.POLYAPP_SERVICE_TOKEN = 'service-test-token';
    try {
      const ownerToken = await devToken('svc-owner@example.test');
      const tenant = (await call('POST', '/v1/tenants', { token: ownerToken, body: { name: 'Svc' } })).json;

      const created = await call('POST', `/v1/tenants/${tenant.id}/projects`, {
        token: 'service-test-token',
        body: { name: 'From Webhook' },
      });
      assert.equal(created.status, 201);

      const list = await call('GET', `/v1/tenants/${tenant.id}/projects`, { token: 'service-test-token' });
      assert.equal(list.status, 200);
      assert.equal(list.json.items.length, 1);
    } finally {
      if (previous === undefined) delete process.env.POLYAPP_SERVICE_TOKEN;
      else process.env.POLYAPP_SERVICE_TOKEN = previous;
    }
  });

  it('returns 404 not_found for an unknown route', async () => {
    const res = await call('GET', '/v1/nope');
    assert.equal(res.status, 404);
    assert.equal(res.json.error, 'not_found');
  });

  it('answers CORS preflight with 204 and the allow headers', async () => {
    const res = await fetch(`${base}/v1/tenants`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.match(res.headers.get('access-control-allow-headers'), /authorization/);
  });
});
