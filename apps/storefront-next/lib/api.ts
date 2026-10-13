// Server-only data access for the storefront. Import this module only from server components,
// route handlers or server actions. It reads the dev token and the tenant id from the environment,
// so none of it is sent to the browser.
import { createPolyAppClient, PolyAppError, type Project } from '@polyapp/api-client';

export type { Project };

export interface StorefrontConfig {
  apiUrl: string;
  email: string;
  tenantId: string;
}

export type Env = Record<string, string | undefined>;

// Raised when required environment variables are missing. Pages catch it to show a message.
export class StorefrontConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorefrontConfigError';
  }
}

const DEFAULT_EMAIL = 'storefront@example.test';

// Reads and validates the storefront configuration. Names every missing required variable.
export function getConfig(env: Env = process.env): StorefrontConfig {
  const apiUrl = env.POLYAPP_API_URL?.trim() ?? '';
  const tenantId = env.POLYAPP_TENANT_ID?.trim() ?? '';

  const missing: string[] = [];
  if (!tenantId) missing.push('POLYAPP_TENANT_ID');
  if (!apiUrl) missing.push('POLYAPP_API_URL');
  if (missing.length > 0) {
    throw new StorefrontConfigError(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        'See apps/storefront-next/.env.example.',
    );
  }

  return {
    apiUrl,
    email: env.POLYAPP_DEV_EMAIL?.trim() || DEFAULT_EMAIL,
    tenantId,
  };
}

// Dev tokens cached per API URL and email, so each server process logs in once per pair.
const tokenCache = new Map<string, string>();

// Returns a client that sends a dev token for the configured email.
export async function getStorefrontClient(env: Env = process.env) {
  const { apiUrl, email } = getConfig(env);
  const key = `${apiUrl}|${email}`;

  let token = tokenCache.get(key);
  if (!token) {
    const bootstrap = createPolyAppClient({ baseUrl: apiUrl });
    token = await bootstrap.devToken(email);
    tokenCache.set(key, token);
  }

  return createPolyAppClient({ baseUrl: apiUrl, token });
}

// Lists every project in the configured tenant.
export async function loadCatalog(env: Env = process.env): Promise<{ tenantId: string; projects: Project[] }> {
  const { tenantId } = getConfig(env);
  const client = await getStorefrontClient(env);
  const projects = await client.listProjects(tenantId);
  return { tenantId, projects };
}

// Fetches one project in the configured tenant. Returns null when the API answers 404.
export async function loadProduct(projectId: string, env: Env = process.env): Promise<Project | null> {
  const { tenantId } = getConfig(env);
  const client = await getStorefrontClient(env);
  try {
    return await client.getProject(tenantId, projectId);
  } catch (error) {
    if (error instanceof PolyAppError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
