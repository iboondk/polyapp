import { createPolyAppClient, type Project } from '@polyapp/api-client';

export interface FetchProjectsOptions {
  apiUrl: string;
  token: string;
  tenantId: string;
  limit?: number;
}

// Loads a tenant's projects, newest first, and keeps at most `limit` of them.
export async function fetchProjects(opts: FetchProjectsOptions): Promise<Project[]> {
  const { apiUrl, token, tenantId, limit = 5 } = opts;
  const client = createPolyAppClient({ baseUrl: apiUrl, token });
  const items = await client.listProjects(tenantId);
  const newestFirst = [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return newestFirst.slice(0, limit);
}
