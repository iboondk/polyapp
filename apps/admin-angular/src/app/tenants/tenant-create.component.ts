import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PolyAppApi } from '../polyapp-api.service';

@Component({
  selector: 'app-tenant-create',
  imports: [ReactiveFormsModule],
  template: `
    <h1>New tenant</h1>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="field">
        <label for="tenant-name">Tenant name</label>
        <input id="tenant-name" type="text" formControlName="name" />
      </div>
      <button type="submit" [disabled]="busy()">Create tenant</button>
    </form>
    @if (createdId(); as id) {
      <p role="status">Created tenant <code>{{ id }}</code>. Opening its projects...</p>
    }
    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
})
export class TenantCreateComponent {
  private readonly api = inject(PolyAppApi);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
  });

  protected readonly busy = signal(false);
  protected readonly createdId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter a tenant name of 1 to 200 characters');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const tenant = await this.api.createTenant(this.form.getRawValue().name);
      this.createdId.set(tenant.id);
      await this.router.navigate(['/tenants', tenant.id]);
    } catch (e) {
      this.error.set(this.api.errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
