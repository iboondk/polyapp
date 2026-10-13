import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Project } from '@polyapp/api-client';
import { PolyAppApi } from '../polyapp-api.service';

@Component({
  selector: 'app-projects-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Projects</h1>
    <p class="muted">Tenant <code>{{ tenantId() }}</code></p>

    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }

    @if (loading()) {
      <p role="status">Loading projects...</p>
    } @else if (projects().length === 0) {
      <p>No projects yet.</p>
    } @else {
      <ul aria-label="Projects">
        @for (project of projects(); track project.id) {
          <li>{{ project.name }}</li>
        }
      </ul>
    }

    <h2>Create project</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="field">
        <label for="project-name">Project name</label>
        <input id="project-name" type="text" formControlName="name" />
      </div>
      <button type="submit" [disabled]="busy()">Create project</button>
    </form>
  `,
})
export class ProjectsPageComponent {
  private readonly api = inject(PolyAppApi);

  // Bound from the route parameter :tenantId (withComponentInputBinding in app.config.ts).
  readonly tenantId = input.required<string>();

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
  });

  protected readonly projects = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private requestId = 0;

  constructor() {
    // Reload whenever tenantId changes. The router can reuse this component when moving from one
    // /tenants/:tenantId to another, so ngOnInit alone would keep the previous tenant's list.
    effect(() => {
      const id = this.tenantId();
      untracked(() => void this.load(id));
    });
  }

  protected async load(tenantId: string): Promise<void> {
    const request = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.api.listProjects(tenantId);
      if (request !== this.requestId) return; // a newer tenant or request has replaced this one
      this.projects.set(items);
    } catch (e) {
      if (request !== this.requestId) return;
      this.error.set(this.api.errorMessage(e));
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter a project name of 1 to 200 characters');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const tenantId = this.tenantId();
      await this.api.createProject(tenantId, this.form.getRawValue().name);
      this.form.reset({ name: '' });
      await this.load(tenantId);
    } catch (e) {
      this.error.set(this.api.errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
