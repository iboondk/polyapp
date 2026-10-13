// Pure TypeScript: no react-native imports, so this module is testable under vitest in Node.
import { PolyAppError, type Project, type createPolyAppClient } from '@polyapp/api-client';

export interface ProjectRow {
  id: string;
  title: string;
  subtitle: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeAge(createdAt: string, now: Date): string {
  const created = new Date(createdAt).getTime();
  const days = Math.max(0, Math.floor((now.getTime() - created) / DAY_MS));
  if (days === 0) {
    return 'today';
  }
  if (days === 1) {
    return '1 day ago';
  }
  return `${days} days ago`;
}

export function toRows(projects: Project[], now: Date = new Date()): ProjectRow[] {
  return projects.map((project) => ({
    id: project.id,
    title: project.name,
    subtitle: relativeAge(project.created_at, now),
  }));
}

export async function loadProjects(
  client: ReturnType<typeof createPolyAppClient>,
  tenantId: string,
): Promise<ProjectRow[]> {
  const projects = await client.listProjects(tenantId);
  return toRows(projects);
}

export function describeError(e: unknown): string {
  if (e instanceof PolyAppError) {
    switch (e.code) {
      case 'not_found':
        return 'Tenant not found';
      case 'unauthorized':
        return 'Please sign in again';
      default:
        return 'Something went wrong';
    }
  }
  return 'Something went wrong';
}
