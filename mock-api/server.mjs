// PolyApp mock API: a zero-dependency, in-memory stand-in for Tenantly.
// It implements the same routes and error rules as contracts/openapi.yaml.
// It is a test double. It is not Tenantly itself.

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 1024 * 1024;
const NAME_MIN = 1;
const NAME_MAX = 200;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function createState() {
  return {
    usersByEmail: new Map(), // email -> userId
    tokens: new Map(), // bearer token -> userId
    tenants: new Map(), // tenantId -> { id, name }
    memberships: new Map(), // tenantId -> Map(userId -> role)
    projects: [], // { id, tenant_id, name, created_at, seq }
    seq: 0,
  };
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, error, message) {
  send(res, status, { error, message });
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooBig = true;
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve(tooBig ? null : Buffer.concat(chunks)));
    req.on('error', () => resolve(null));
  });
}

// Returns the parsed JSON object, or null when the body is missing, not an object, or invalid.
function parseJsonObject(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw.toString('utf8') || 'null');
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function isValidName(name) {
  return typeof name === 'string' && [...name].length >= NAME_MIN && [...name].length <= NAME_MAX;
}

function authenticate(state, req) {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.authorization ?? '');
  if (!match) return null;
  const token = match[1];
  const serviceToken = process.env.POLYAPP_SERVICE_TOKEN;
  if (serviceToken && token === serviceToken) return { kind: 'service' };
  const userId = state.tokens.get(token);
  return userId ? { kind: 'user', userId } : null;
}

// The role of the caller in a tenant, or null when the caller is not a member (or the tenant is unknown).
function roleFor(state, caller, tenantId) {
  if (!state.tenants.has(tenantId)) return null;
  if (caller.kind === 'service') return 'admin';
  return state.memberships.get(tenantId)?.get(caller.userId) ?? null;
}

function toPublicProject(project) {
  return { id: project.id, tenant_id: project.tenant_id, name: project.name, created_at: project.created_at };
}

function handleDevToken(state, raw, res) {
  const body = parseJsonObject(raw);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return sendError(res, 400, 'invalid_request', 'email must be a string containing "@"');
  }
  if (!state.usersByEmail.has(email)) {
    state.usersByEmail.set(email, randomUUID());
  }
  const userId = state.usersByEmail.get(email);
  const token = `dev.${randomUUID()}`;
  state.tokens.set(token, userId);
  return send(res, 200, { token });
}

function handleCreateTenant(state, caller, raw, res) {
  if (caller.kind === 'service') {
    return sendError(res, 403, 'forbidden', 'a service token cannot create tenants');
  }
  const body = parseJsonObject(raw);
  if (!body || !isValidName(body.name)) {
    return sendError(res, 400, 'invalid_request', `name must be a string of ${NAME_MIN}..${NAME_MAX} characters`);
  }
  const tenant = { id: randomUUID(), name: body.name };
  state.tenants.set(tenant.id, tenant);
  state.memberships.set(tenant.id, new Map([[caller.userId, 'owner']]));
  return send(res, 201, { id: tenant.id, name: tenant.name });
}

function handleListProjects(state, caller, tenantId, res) {
  if (!roleFor(state, caller, tenantId)) {
    return sendError(res, 404, 'not_found', 'tenant not found');
  }
  const items = state.projects
    .filter((project) => project.tenant_id === tenantId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.seq - a.seq))
    .map(toPublicProject);
  return send(res, 200, { items });
}

function handleCreateProject(state, caller, tenantId, raw, res) {
  const role = roleFor(state, caller, tenantId);
  if (!role) {
    return sendError(res, 404, 'not_found', 'tenant not found');
  }
  if (role !== 'admin' && role !== 'owner') {
    return sendError(res, 403, 'forbidden', 'the admin or owner role is required');
  }
  const body = parseJsonObject(raw);
  if (!body || !isValidName(body.name)) {
    return sendError(res, 400, 'invalid_request', `name must be a string of ${NAME_MIN}..${NAME_MAX} characters`);
  }
  if (state.projects.some((project) => project.tenant_id === tenantId && project.name === body.name)) {
    return sendError(res, 409, 'conflict', 'a project with this name already exists in the tenant');
  }
  state.seq += 1;
  const project = {
    id: randomUUID(),
    tenant_id: tenantId,
    name: body.name,
    created_at: new Date().toISOString(),
    seq: state.seq,
  };
  state.projects.push(project);
  return send(res, 201, toPublicProject(project));
}

function handleGetProject(state, caller, tenantId, projectId, res) {
  if (!roleFor(state, caller, tenantId)) {
    return sendError(res, 404, 'not_found', 'tenant not found');
  }
  const project = state.projects.find((p) => p.id === projectId && p.tenant_id === tenantId);
  if (!project) {
    return sendError(res, 404, 'not_found', 'project not found');
  }
  return send(res, 200, toPublicProject(project));
}

function handleTenants(state, req, pathname, raw, res) {
  const caller = authenticate(state, req);
  if (!caller) {
    return sendError(res, 401, 'unauthorized', 'a valid bearer token is required');
  }

  if (pathname === '/v1/tenants') {
    if (req.method === 'POST') return handleCreateTenant(state, caller, raw, res);
    return sendError(res, 404, 'not_found', 'route not found');
  }

  const projectsMatch = /^\/v1\/tenants\/([^/]+)\/projects$/.exec(pathname);
  if (projectsMatch) {
    const tenantId = projectsMatch[1];
    if (req.method === 'GET') return handleListProjects(state, caller, tenantId, res);
    if (req.method === 'POST') return handleCreateProject(state, caller, tenantId, raw, res);
    return sendError(res, 404, 'not_found', 'route not found');
  }

  const projectMatch = /^\/v1\/tenants\/([^/]+)\/projects\/([^/]+)$/.exec(pathname);
  if (projectMatch && req.method === 'GET') {
    return handleGetProject(state, caller, projectMatch[1], projectMatch[2], res);
  }

  return sendError(res, 404, 'not_found', 'route not found');
}

async function handleRequest(state, req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const raw = await readBody(req);
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

  if (pathname === '/healthz') {
    if (req.method === 'GET') return send(res, 200, { status: 'ok' });
    return sendError(res, 404, 'not_found', 'route not found');
  }

  if (pathname === '/v1/auth/dev-token') {
    if (req.method === 'POST') return handleDevToken(state, raw, res);
    return sendError(res, 404, 'not_found', 'route not found');
  }

  if (pathname === '/v1/tenants' || pathname.startsWith('/v1/tenants/')) {
    return handleTenants(state, req, pathname, raw, res);
  }

  return sendError(res, 404, 'not_found', 'route not found');
}

export async function createMockServer({ port = 0, host = '127.0.0.1' } = {}) {
  const state = createState();
  const server = http.createServer((req, res) => {
    handleRequest(state, req, res).catch(() => {
      if (!res.headersSent) {
        sendError(res, 500, 'internal_error', 'unexpected server error');
      } else {
        res.end();
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const { port: boundPort } = server.address();
  const url = `http://${host}:${boundPort}`;

  return {
    url,
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        server.closeAllConnections();
      });
    },
  };
}

function parsePortArg(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--port') return argv[i + 1];
    if (argv[i].startsWith('--port=')) return argv[i].slice('--port='.length);
  }
  return undefined;
}

async function main() {
  const rawPort = parsePortArg(process.argv.slice(2));
  const port = rawPort === undefined ? 4010 : Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`invalid --port value: ${rawPort}`);
    process.exit(2);
  }
  const server = await createMockServer({ port });
  console.log(`mock-api listening on ${server.url}`);
  const shutdown = () => {
    server.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
