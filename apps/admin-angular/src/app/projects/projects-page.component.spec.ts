import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Project } from '@polyapp/api-client';
import { PolyAppApi } from '../polyapp-api.service';
import { ProjectsPageComponent } from './projects-page.component';

describe('ProjectsPageComponent', () => {
  let fixture: ComponentFixture<ProjectsPageComponent>;

  const projects: Project[] = [
    { id: '1', tenant_id: 't1', name: 'Alpha', created_at: '2026-01-02T00:00:00Z' },
    { id: '2', tenant_id: 't1', name: 'Beta', created_at: '2026-01-01T00:00:00Z' },
  ];

  beforeEach(async () => {
    const stub = {
      listProjects: vi.fn(() => Promise.resolve(projects)),
      createProject: vi.fn(() => Promise.resolve(projects[0])),
      errorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong'),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectsPageComponent],
      providers: [{ provide: PolyAppApi, useValue: stub as unknown as PolyAppApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.componentRef.setInput('tenantId', 't1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the project names from the stubbed API', () => {
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ul[aria-label="Projects"] li'),
    ).map((li) => li.textContent?.trim());
    expect(items).toEqual(['Alpha', 'Beta']);
  });

  it('reloads the list when tenantId changes on a reused component', async () => {
    const api = TestBed.inject(PolyAppApi) as unknown as { listProjects: ReturnType<typeof vi.fn> };
    const other: Project[] = [
      { id: '9', tenant_id: 't2', name: 'Gamma', created_at: '2026-02-01T00:00:00Z' },
    ];
    api.listProjects.mockImplementation((tenantId: string) =>
      Promise.resolve(tenantId === 't2' ? other : projects),
    );

    fixture.componentRef.setInput('tenantId', 't2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.listProjects).toHaveBeenLastCalledWith('t2');
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ul[aria-label="Projects"] li'),
    ).map((li) => li.textContent?.trim());
    expect(items).toEqual(['Gamma']);
  });
});
