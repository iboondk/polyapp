import { Routes } from '@angular/router';

import { SignInComponent } from './sign-in/sign-in.component';
import { TenantCreateComponent } from './tenants/tenant-create.component';
import { ProjectsPageComponent } from './projects/projects-page.component';

export const routes: Routes = [
  { path: '', component: SignInComponent },
  { path: 'tenants/new', component: TenantCreateComponent },
  { path: 'tenants/:tenantId', component: ProjectsPageComponent },
];
