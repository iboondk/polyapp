#!/usr/bin/env node
// Seeds a running PolyApp mock API with one tenant and three projects for the storefront.
// The storefront requests its dev token for POLYAPP_DEV_EMAIL (default storefront@example.test),
// so the tenant must be owned by that same email, or the API answers 404.
// Prints only the tenant id on stdout, so it can be captured:
//   export POLYAPP_TENANT_ID=$(node scripts/seed-storefront.mjs)
// Progress goes to stderr. Uses only the placeholder email and no real credentials.
// The mock keeps state in memory, so run this again after every mock restart.

const baseUrl = (process.env.POLYAPP_API_URL ?? 'http://127.0.0.1:4010').replace(/\/+$/, '');
const email = (process.env.POLYAPP_DEV_EMAIL ?? 'storefront@example.test').trim();
const tenantName = process.env.POLYAPP_SEED_TENANT_NAME ?? 'Storefront Demo';
const projectNames = ['Alpha', 'Beta', 'Gamma'];

function log(message) {
  process.stderr.write(`${message}\n`);
}

async function call(method, path, { token, body } = {}) {
  const headers = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`cannot reach ${baseUrl}: ${err.message}. Start the mock first.`);
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}: ${data.code ?? ''} ${data.message ?? ''}`.trim());
  }
  return data;
}

async function main() {
  log(`seeding ${baseUrl} for ${email}`);
  const { token } = await call('POST', '/v1/auth/dev-token', { body: { email } });
  const tenant = await call('POST', '/v1/tenants', { token, body: { name: tenantName } });
  log(`created tenant ${tenant.name}`);
  for (const name of projectNames) {
    await call('POST', `/v1/tenants/${tenant.id}/projects`, { token, body: { name } });
  }
  log(`created projects: ${projectNames.join(', ')}`);
  process.stdout.write(`${tenant.id}\n`);
}

main().catch((err) => {
  log(`seed failed: ${err.message}`);
  process.exit(1);
});
