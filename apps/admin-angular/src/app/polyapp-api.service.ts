import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import {
  createPolyAppClient,
  PolyAppError,
  type Project,
  type Tenant,
} from '@polyapp/api-client';
import { environment } from '../environments/environment';

// The API base URL. app.config.ts provides it explicitly; the factory is the fallback.
export const POLYAPP_API_URL = new InjectionToken<string>('POLYAPP_API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

@Injectable({ providedIn: 'root' })
export class PolyAppApi {
  private readonly apiUrl = inject(POLYAPP_API_URL);

  // The bearer token from the most recent signIn. Null until the user signs in.
  readonly token = signal<string | null>(null);

  private readonly client = createPolyAppClient({
    baseUrl: this.apiUrl,
    token: () => this.token() ?? undefined,
  });

  async signIn(email: string): Promise<string> {
    const token = await this.client.devToken(email);
    this.token.set(token);
    return token;
  }

  createTenant(name: string): Promise<Tenant> {
    return this.client.createTenant(name);
  }

  listProjects(tenantId: string): Promise<Project[]> {
    return this.client.listProjects(tenantId);
  }

  createProject(tenantId: string, name: string): Promise<Project> {
    return this.client.createProject(tenantId, name);
  }

  // Maps an error from the API client to a message a person can read.
  errorMessage(e: unknown): string {
    if (e instanceof PolyAppError) {
      switch (e.code) {
        case 'not_found':
          return 'Tenant not found or you are not a member';
        case 'forbidden':
          return 'Your role cannot do this';
        case 'conflict':
          return 'A project with that name already exists';
        default:
          return e.message || 'Something went wrong';
      }
    }
    if (e instanceof Error) {
      return e.message || 'Something went wrong';
    }
    return 'Something went wrong';
  }
}
