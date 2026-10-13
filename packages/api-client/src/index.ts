import createClient, { type Client, type Middleware } from 'openapi-fetch';
import type { components, paths } from './generated/schema.js';

export type { paths, components, webhooks } from './generated/schema.js';

export type Project = components['schemas']['Project'];
export type Tenant = components['schemas']['Tenant'];
export type ProjectList = components['schemas']['ProjectList'];
export type ApiErrorBody = components['schemas']['Error'];
export type ProjectRequestedEvent = components['schemas']['ProjectRequestedEvent'];

export class PolyAppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PolyAppError';
  }
}

export interface PolyAppClientOptions {
  baseUrl: string;
  token?: string | (() => string | undefined);
  fetch?: typeof fetch;
}

// Converts a non-2xx response into a PolyAppError using the documented error body.
function toError(response: Response, error: unknown): PolyAppError {
  const body = typeof error === 'object' && error !== null ? (error as Partial<ApiErrorBody>) : {};
  return new PolyAppError(response.status, body.error ?? 'unknown', body.message ?? '');
}

function unwrap<T>(response: Response, data: T | undefined, error: unknown): T {
  if (!response.ok || data === undefined) {
    throw toError(response, error);
  }
  return data;
}

export function createPolyAppClient(opts: PolyAppClientOptions) {
  const raw: Client<paths> = createClient<paths>({ baseUrl: opts.baseUrl, fetch: opts.fetch });

  const authMiddleware: Middleware = {
    onRequest({ request }) {
      const token = typeof opts.token === 'function' ? opts.token() : opts.token;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
  };
  raw.use(authMiddleware);

  return {
    raw,

    async health(): Promise<{ status: string }> {
      const { data, error, response } = await raw.GET('/healthz');
      return unwrap(response, data, error);
    },

    async devToken(email: string): Promise<string> {
      const { data, error, response } = await raw.POST('/v1/auth/dev-token', {
        body: { email },
      });
      return unwrap(response, data, error).token;
    },

    async createTenant(name: string): Promise<Tenant> {
      const { data, error, response } = await raw.POST('/v1/tenants', {
        body: { name },
      });
      return unwrap(response, data, error);
    },

    async listProjects(tenantId: string): Promise<Project[]> {
      const { data, error, response } = await raw.GET('/v1/tenants/{tenantId}/projects', {
        params: { path: { tenantId } },
      });
      return unwrap(response, data, error).items;
    },

    async createProject(tenantId: string, name: string): Promise<Project> {
      const { data, error, response } = await raw.POST('/v1/tenants/{tenantId}/projects', {
        params: { path: { tenantId } },
        body: { name },
      });
      return unwrap(response, data, error);
    },

    async getProject(tenantId: string, projectId: string): Promise<Project> {
      const { data, error, response } = await raw.GET('/v1/tenants/{tenantId}/projects/{projectId}', {
        params: { path: { tenantId, projectId } },
      });
      return unwrap(response, data, error);
    },
  };
}
