import { TestBed } from '@angular/core/testing';
import { PolyAppError } from '@polyapp/api-client';
import { createMockServer, type MockServer } from '@polyapp/mock-api';
import { POLYAPP_API_URL, PolyAppApi } from './polyapp-api.service';

describe('PolyAppApi (real HTTP against mock-api)', () => {
  let server: MockServer;
  let api: PolyAppApi;

  beforeAll(async () => {
    server = await createMockServer({ port: 0 });
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: POLYAPP_API_URL, useValue: server.url }],
    });
    api = TestBed.inject(PolyAppApi);
  });

  it('signs in, creates a tenant and a project, and lists projects', async () => {
    const token = await api.signIn('owner@example.test');
    expect(token).toMatch(/^dev\./);
    expect(api.token()).toBe(token);

    const tenant = await api.createTenant('Acme');
    expect(tenant.name).toBe('Acme');
    expect(tenant.id).toBeTruthy();

    const project = await api.createProject(tenant.id, 'Website');
    expect(project.name).toBe('Website');
    expect(project.tenant_id).toBe(tenant.id);

    const projects = await api.listProjects(tenant.id);
    expect(projects.map((p) => p.name)).toEqual(['Website']);
  });

  it('maps not_found from a non-member to a readable message', async () => {
    await api.signIn('outsider@example.test');
    const err = await api.listProjects('00000000-0000-4000-8000-000000000000').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PolyAppError);
    expect((err as PolyAppError).code).toBe('not_found');
    expect(api.errorMessage(err)).toBe('Tenant not found or you are not a member');
  });

  it('maps a duplicate project name to the conflict message', async () => {
    await api.signIn('dupes@example.test');
    const tenant = await api.createTenant('Dupes');
    await api.createProject(tenant.id, 'Same');
    const err = await api.createProject(tenant.id, 'Same').catch((e: unknown) => e);
    expect((err as PolyAppError).code).toBe('conflict');
    expect(api.errorMessage(err)).toBe('A project with that name already exists');
  });
});

describe('PolyAppApi.errorMessage', () => {
  let api: PolyAppApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: POLYAPP_API_URL, useValue: 'http://127.0.0.1:1' }],
    });
    api = TestBed.inject(PolyAppApi);
  });

  it('maps not_found', () => {
    expect(api.errorMessage(new PolyAppError(404, 'not_found', 'x'))).toBe(
      'Tenant not found or you are not a member',
    );
  });

  it('maps forbidden', () => {
    expect(api.errorMessage(new PolyAppError(403, 'forbidden', 'x'))).toBe('Your role cannot do this');
  });

  it('maps conflict', () => {
    expect(api.errorMessage(new PolyAppError(409, 'conflict', 'x'))).toBe(
      'A project with that name already exists',
    );
  });

  it('falls back to the error message for other codes', () => {
    expect(api.errorMessage(new PolyAppError(400, 'invalid_request', 'name is too long'))).toBe(
      'name is too long',
    );
  });

  it('handles non-PolyApp values', () => {
    expect(api.errorMessage(new Error('boom'))).toBe('boom');
    expect(api.errorMessage('weird')).toBe('Something went wrong');
  });
});
