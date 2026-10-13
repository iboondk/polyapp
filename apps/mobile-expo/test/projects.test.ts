import { describe, expect, it } from 'vitest';
import { PolyAppError, type Project, type createPolyAppClient } from '@polyapp/api-client';

import { describeError, loadProjects, toRows } from '../src/projects';

const NOW = new Date('2026-10-14T12:00:00Z');

function project(id: string, name: string, createdAt: string): Project {
  return { id, tenant_id: '11111111-1111-4111-8111-111111111111', name, created_at: createdAt } as Project;
}

describe('toRows', () => {
  it('maps name to title and computes relative age from a fixed now', () => {
    const rows = toRows(
      [
        project('p1', 'Today project', '2026-10-14T01:00:00Z'),
        project('p2', 'Yesterday project', '2026-10-13T12:00:00Z'),
        project('p3', 'Old project', '2026-10-04T12:00:00Z'),
      ],
      NOW,
    );
    expect(rows).toEqual([
      { id: 'p1', title: 'Today project', subtitle: 'today' },
      { id: 'p2', title: 'Yesterday project', subtitle: '1 day ago' },
      { id: 'p3', title: 'Old project', subtitle: '10 days ago' },
    ]);
  });

  it('returns an empty array for no projects', () => {
    expect(toRows([], NOW)).toEqual([]);
  });

  it('treats a created_at in the future as today', () => {
    const rows = toRows([project('p4', 'Future', '2026-10-15T12:00:00Z')], NOW);
    expect(rows[0].subtitle).toBe('today');
  });
});

describe('describeError', () => {
  it('maps not_found to a tenant message', () => {
    expect(describeError(new PolyAppError(404, 'not_found', 'nope'))).toBe('Tenant not found');
  });

  it('maps unauthorized to a sign-in message', () => {
    expect(describeError(new PolyAppError(401, 'unauthorized', 'bad token'))).toBe('Please sign in again');
  });

  it('falls back to a generic message for other codes', () => {
    expect(describeError(new PolyAppError(403, 'forbidden', 'no'))).toBe('Something went wrong');
    expect(describeError(new PolyAppError(500, 'unknown', ''))).toBe('Something went wrong');
  });

  it('falls back to a generic message for non-PolyApp errors', () => {
    expect(describeError(new Error('network down'))).toBe('Something went wrong');
    expect(describeError('boom')).toBe('Something went wrong');
  });
});

describe('loadProjects', () => {
  it('calls listProjects with the tenant id and returns rows', async () => {
    const calls: string[] = [];
    const fake = {
      listProjects: async (tenantId: string) => {
        calls.push(tenantId);
        return [project('p1', 'Fake', new Date().toISOString())];
      },
    } as unknown as ReturnType<typeof createPolyAppClient>;

    const rows = await loadProjects(fake, 'tenant-abc');

    expect(calls).toEqual(['tenant-abc']);
    expect(rows).toEqual([{ id: 'p1', title: 'Fake', subtitle: 'today' }]);
  });

  it('propagates errors from the client', async () => {
    const fake = {
      listProjects: async () => {
        throw new PolyAppError(404, 'not_found', 'missing');
      },
    } as unknown as ReturnType<typeof createPolyAppClient>;

    await expect(loadProjects(fake, 'missing')).rejects.toBeInstanceOf(PolyAppError);
  });
});
