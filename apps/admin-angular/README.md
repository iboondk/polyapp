# @polyapp/admin-angular

Angular standalone admin back-office for PolyApp: sign in with a dev token, create tenants, and list or create a tenant's projects. All HTTP goes through `@polyapp/api-client` (see `src/app/polyapp-api.service.ts`).

## Run against the mock API

From the repo root:

```bash
pnpm install --frozen-lockfile
pnpm build:client
node mock-api/server.mjs --port 4010          # terminal 1
pnpm --filter @polyapp/admin-angular start    # terminal 2, http://localhost:4200
```

The API base URL is set in `src/environments/environment.ts` (default `http://127.0.0.1:4010`).

## Test and build

```bash
pnpm --filter @polyapp/admin-angular exec ng test --watch=false   # Vitest + jsdom
pnpm --filter @polyapp/admin-angular build
```

See the root [README](../../README.md) for the full architecture.
