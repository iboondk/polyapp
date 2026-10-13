// End-to-end demo flow against a running PolyApp API (the mock by default, or Tenantly).
// Each step is recorded as PASS or FAIL. The report goes to .tmp/demo-report.md.
// Exits 1 when any step fails. Never prints tokens or real secrets.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPolyAppClient, PolyAppError } from '../packages/api-client/dist/index.js';
import { signWebhook } from '../packages/api-client/dist/webhook.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEBHOOK_SECRET = 'test-secret'; // fixture secret only, shared with the PHP tests

const baseUrl = process.env.POLYAPP_API_URL;
if (!baseUrl) {
  console.error('POLYAPP_API_URL is required, for example http://127.0.0.1:4010');
  process.exit(1);
}

const results = [];

function record(step, status, detail) {
  results.push({ step, status, detail });
}

function describeError(err) {
  if (err instanceof PolyAppError) {
    return `PolyAppError ${err.status} ${err.code}${err.message ? `: ${err.message}` : ''}`;
  }
  return err instanceof Error ? err.message : String(err);
}

// Runs one step. The step passes when fn resolves, and the returned string becomes the detail.
async function step(name, fn) {
  try {
    const detail = await fn();
    record(name, 'PASS', detail ?? 'ok');
    return true;
  } catch (err) {
    record(name, 'FAIL', describeError(err));
    return false;
  }
}

function requireValue(value, what) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`prerequisite missing: ${what}`);
  }
  return value;
}

const anonymous = createPolyAppClient({ baseUrl });
const state = {
  ownerToken: undefined,
  owner: undefined,
  tenantId: undefined,
  projects: {},
};

await step('1 health', async () => {
  const body = await anonymous.health();
  if (body.status !== 'ok') throw new Error(`unexpected status: ${body.status}`);
  return `GET /healthz returned status "${body.status}"`;
});

await step('2 owner devToken', async () => {
  state.ownerToken = await anonymous.devToken('owner@example.test');
  requireValue(state.ownerToken, 'owner token');
  state.owner = createPolyAppClient({ baseUrl, token: state.ownerToken });
  return 'dev token issued for owner@example.test';
});

await step('3 createTenant', async () => {
  requireValue(state.owner, 'owner client');
  const tenant = await state.owner.createTenant('Demo Store');
  state.tenantId = requireValue(tenant.id, 'tenant id');
  return `tenant id ${tenant.id}`;
});

await step('4 createProject x3', async () => {
  const owner = requireValue(state.owner, 'owner client');
  const tenantId = requireValue(state.tenantId, 'tenant id');
  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    state.projects[name] = await owner.createProject(tenantId, name);
  }
  return 'created Alpha, Beta, Gamma';
});

await step('5 listProjects returns 3', async () => {
  const owner = requireValue(state.owner, 'owner client');
  const tenantId = requireValue(state.tenantId, 'tenant id');
  const items = await owner.listProjects(tenantId);
  if (items.length !== 3) throw new Error(`expected 3 projects, got ${items.length}`);
  return `listed ${items.length} projects`;
});

await step('6 getProject(Alpha) matches', async () => {
  const owner = requireValue(state.owner, 'owner client');
  const tenantId = requireValue(state.tenantId, 'tenant id');
  const alpha = requireValue(state.projects.Alpha, 'project Alpha');
  const fetched = await owner.getProject(tenantId, alpha.id);
  if (fetched.id !== alpha.id || fetched.name !== 'Alpha' || fetched.tenant_id !== tenantId) {
    throw new Error('fetched project does not match the created project');
  }
  return `project ${fetched.id} matches Alpha`;
});

// Step 7 passes only when the outsider is refused with 404 (not a member, per the contract).
{
  const name = '7 outsider listProjects is 404';
  try {
    const tenantId = requireValue(state.tenantId, 'tenant id');
    const outsiderToken = await anonymous.devToken('outsider@example.test');
    const outsider = createPolyAppClient({ baseUrl, token: outsiderToken });
    try {
      await outsider.listProjects(tenantId);
      record(name, 'FAIL', 'outsider could list the tenant projects');
    } catch (err) {
      if (err instanceof PolyAppError && err.status === 404) {
        record(name, 'PASS', `404 ${err.code} for non-member`);
      } else {
        record(name, 'FAIL', describeError(err));
      }
    }
  } catch (err) {
    record(name, 'FAIL', describeError(err));
  }
}

// Step 8 passes only when a duplicate project name is refused with 409.
{
  const name = '8 duplicate createProject is 409';
  try {
    const owner = requireValue(state.owner, 'owner client');
    const tenantId = requireValue(state.tenantId, 'tenant id');
    try {
      await owner.createProject(tenantId, 'Alpha');
      record(name, 'FAIL', 'duplicate project name was accepted');
    } catch (err) {
      if (err instanceof PolyAppError && err.status === 409) {
        record(name, 'PASS', `409 ${err.code} for duplicate name`);
      } else {
        record(name, 'FAIL', describeError(err));
      }
    }
  } catch (err) {
    record(name, 'FAIL', describeError(err));
  }
}

await step('9 webhook fixture signature', async () => {
  const bodyPath = join(ROOT, 'contracts/fixtures/webhook-project-requested.json');
  const sigPath = join(ROOT, 'contracts/fixtures/webhook-project-requested.sig.txt');
  const body = readFileSync(bodyPath);
  const expected = readFileSync(sigPath, 'utf8').trim();
  const actual = signWebhook(body, WEBHOOK_SECRET);
  if (actual !== expected) throw new Error('computed signature differs from .sig.txt');
  return 'computed HMAC matches contracts/fixtures .sig.txt';
});

// Report
const escapeCell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const failed = results.filter((r) => r.status === 'FAIL');
const lines = [
  '# PolyApp demo flow',
  '',
  `API: ${baseUrl}`,
  `Tenant id: ${state.tenantId ?? '(not created)'}`,
  '',
  '| Step | Result | Detail |',
  '| --- | --- | --- |',
  ...results.map((r) => `| ${escapeCell(r.step)} | ${r.status} | ${escapeCell(r.detail)} |`),
  '',
  `${results.length - failed.length} of ${results.length} steps passed.`,
  '',
];
const report = lines.join('\n');

const reportDir = join(ROOT, '.tmp');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'demo-report.md'), report);

console.log(report);
console.log(`Tenant id: ${state.tenantId ?? '(not created)'}`);
console.log(`Report written to ${join(reportDir, 'demo-report.md')}`);

process.exit(failed.length > 0 ? 1 : 0);
