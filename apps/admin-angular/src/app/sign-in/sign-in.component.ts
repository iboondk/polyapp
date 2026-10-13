import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PolyAppApi } from '../polyapp-api.service';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Sign in</h1>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="field">
        <label for="sign-in-email">Email</label>
        <input id="sign-in-email" type="email" formControlName="email" autocomplete="email" />
      </div>
      <button type="submit" [disabled]="busy()">Sign in</button>
    </form>
    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
})
export class SignInComponent {
  private readonly api = inject(PolyAppApi);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter a valid email address');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.signIn(this.form.getRawValue().email);
      await this.router.navigate(['/tenants/new']);
    } catch (e) {
      this.error.set(this.api.errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
