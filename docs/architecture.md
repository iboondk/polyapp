# PolyApp architecture

PolyApp is one API with several clients. The API contract comes from **[Tenantly](https://github.com/iboondk/tenantly)**, a multi-tenant Go service with tenants and projects. Tenantly does not publish an OpenAPI document, so this repo writes one at `contracts/openapi.yaml`. Every client is built from that file:

- a **shared TypeScript client** generated from the spec (`packages/api-client`)
- a **Next.js storefront**, the public catalog of one tenant's projects
- an **Angular admin back-office**, where admins create tenants and projects
- a **React Native (Expo) app**, a mobile project browser
- a **Vue widget**, an embeddable `<polyapp-projects>` custom element
- a **Laravel webhook adapter**, which turns signed inbound webhooks into API calls

The repo also ships `scripts/demo.sh`, which starts the mock API, regenerates the client and runs an end-to-end flow through it, reporting each step as PASS, FAIL or SKIPPED.

---

## 1. Architecture

```
                         contracts/openapi.yaml  (OpenAPI 3.1, mirrors Tenantly HTTP surface
                                   │               + webhooks.projectRequested)
                 openapi-typescript│ (codegen: src/generated/schema.d.ts)
                                   ▼
                    packages/api-client  (@polyapp/api-client)
                    openapi-fetch + thin typed facade: createPolyAppClient()
          ┌──────────────┬─────────┴─────┬──────────────────┐
          ▼              ▼               ▼                  ▼
  apps/storefront-next  apps/admin-angular  apps/widget-vue  apps/mobile-expo
  (server components)   (services + forms)  (custom element) (standalone npm install,
                                                              file: dep on built client)
          │              │               │                  │
          └──────────────┴───── HTTP ────┴──────────────────┘
                                   ▼
          API = Tenantly (Go)  ── or, locally ──  mock-api/ (Node, zero deps, in-memory,
                                                     same routes, same error rules)
                                   ▲
                                   │  POST /v1/tenants/{id}/projects (service token)
  third-party system ──signed──►  apps/webhook-laravel  (Laravel package:
  X-PolyApp-Signature: sha256=…    verify HMAC → dedupe event id → map → call API)
```

### Why a mock API

Tenantly needs Postgres and Redis, and Docker may not be available in a development environment. To test the clients and run the demo, we use `mock-api/`. It is a Node HTTP server with no dependencies that implements the same routes and error rules as Tenantly, with in-memory state. The real Tenantly server can replace it at any time by setting `POLYAPP_API_URL`. The mock is a test double. It is never presented as Tenantly itself.

### The contract (Tenantly surface, written as OpenAPI 3.1)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/healthz` | none | none | 200 `{status:"ok"}` |
| POST | `/v1/auth/dev-token` | none (dev only) | `{email}` | 200 `{token}` |
| POST | `/v1/tenants` | bearer | `{name}` | 201 `Tenant{id,name}`, and the caller becomes owner |
| GET | `/v1/tenants/{tenantId}/projects` | bearer + member | none | 200 `{items: Project[]}` |
| POST | `/v1/tenants/{tenantId}/projects` | bearer + admin | `{name}` | 201 `Project` |
| GET | `/v1/tenants/{tenantId}/projects/{projectId}` | bearer + member | none | 200 `Project` |

- `Project` is `{id: uuid, tenant_id: uuid, name: string(1..200), created_at: date-time}`.
- `Error` is `{error: string, message: string}`.
- Error codes:
  - A non-member gets **404 `not_found`**.
  - A member whose role is too low gets **403 `forbidden`**.
  - A missing or bad token gets **401 `unauthorized`**.
  - A bad body gets **400 `invalid_request`**.
  - A duplicate project name gets **409 `conflict`**.
  - A rate-limited request gets **429 `rate_limited`**.
- The OAuth and GraphQL routes in Tenantly are deliberately left out of this spec. They are browser-redirect and GraphQL flows that no PolyApp client uses.
- `webhooks.projectRequested` is a PolyApp extension. It describes the inbound event that the Laravel adapter accepts:
  - Body: `{id: string, type: "project.requested", created_at: date-time, tenant_id: uuid, data: {name: string}}`
  - Header: `X-PolyApp-Signature: sha256=<hex HMAC-SHA256 of the raw body, keyed by POLYAPP_WEBHOOK_SECRET>`

**Note on Tenantly.** Tenantly does not fix the exact JSON shape of the projects list. This spec fixes it as `{items: [...]}`. If Tenantly's handlers return something else, they should be changed to match.

## 2. Technology choices

| Concern | Choice | Why |
|---|---|---|
| Monorepo | **pnpm workspaces** (pnpm 11) | Isolated `node_modules`, so the React versions used by Next and the Angular and Vue dependencies do not collide. |
| Spec lint | `@redocly/cli lint` | Catches broken `$ref`s and missing operationIds |
| Codegen | `openapi-typescript` → `schema.d.ts`, and `openapi-fetch` at runtime | Pure Node with no Java. The output is types only, so the runtime is a tiny fetch wrapper. Generated code is committed so that consumers do not need the codegen step |
| Client tests | `vitest` against `mock-api` started in `globalSetup` | Real HTTP round-trips, not fetch stubs |
| Mock API | `node:http`, ESM `.mjs`, no dependencies | Starts in about 50 ms and has nothing to install |
| Storefront | Next.js (App Router, latest stable), server components, `export const dynamic = "force-dynamic"` | Data fetches happen on the server, so the dev token never reaches the browser. `next build` does not need the API to be running |
| Admin | Angular (latest stable, standalone components, signals). `ng test` uses Vitest, which is the CLI default since Angular 21 | Uses the injectable `PolyAppApi` service, which wraps the shared client |
| Mobile | Expo SDK (latest stable), `blank-typescript` | Installed **outside** the pnpm workspace with plain npm. It depends on the client through `file:../../packages/api-client` (the built `dist`) and avoids Metro symlink problems. The logic is verified with vitest on a pure TS module, and the app with `tsc --noEmit`. No simulator is needed |
| Widget | Vue 3 + Vite library mode + `defineCustomElement`, tested with vitest, `@vue/test-utils` and happy-dom | A single `polyapp-widget.js` bundle that can be embedded with one `<script>` tag |
| Webhook adapter | Laravel package (`polyapp/webhook-adapter`): ServiceProvider, route, controller, `SignatureVerifier`, `ProjectRequestedMapper`, and API calls through the `Http` facade. Tests use `orchestra/testbench` with `Http::fake()` | A package is small enough to write by hand without `composer create-project` |
| Shared fixtures | `contracts/fixtures/webhook-project-requested.json` plus the expected signature, shared by the PHP tests and the Node tests | The Node side can check the fixture signature without a PHP toolchain |

**Secrets.** Only `.env.example` files with placeholders are committed. The demo uses `dev-token` and a webhook secret generated for each run.

## 3. Directory layout

```
polyapp/
  docs/architecture.md
  package.json                 private root; scripts: lint:spec, gen, test, build, demo
  pnpm-workspace.yaml          packages: packages/*, apps/storefront-next, apps/admin-angular,
                               apps/widget-vue, mock-api   (mobile-expo and webhook-laravel excluded)
  .npmrc                       (no absolute paths; store dir is passed via env)
  .gitignore                   node_modules, dist, .next, .angular, .expo, vendor, .tmp, .env
  .env.example
  LICENSE                      MIT, iboondk
  contracts/
    openapi.yaml
    redocly.yaml
    fixtures/
      webhook-project-requested.json
      webhook-project-requested.sig.txt     "sha256=<hex>" for secret "test-secret"
  mock-api/
    package.json               "@polyapp/mock-api", bin: server.mjs
    server.mjs                 createMockServer({port}) → {url, close()}; CLI: node server.mjs --port 4010
    server.test.mjs            node:test
  packages/api-client/
    package.json               "@polyapp/api-client"; exports dist/index.js + types
    tsconfig.json
    scripts/gen.mjs            openapi-typescript ../../contracts/openapi.yaml → src/generated/schema.d.ts
    src/generated/schema.d.ts  (generated, committed)
    src/index.ts               createPolyAppClient, PolyAppError, types re-export
    src/webhook.ts             signWebhook(body, secret) (Node crypto), used by tests and demo
    test/global-setup.ts       starts mock-api
    test/client.test.ts
    test/webhook-fixture.test.ts
  apps/
    storefront-next/           app/page.tsx, app/projects/[projectId]/page.tsx, lib/api.ts (+ test)
    admin-angular/             src/app/polyapp-api.service.ts, tenants/, projects/ (+ spec)
    widget-vue/                src/ProjectsWidget.ce.vue, src/main.ts, src/fetchProjects.ts (+ tests)
    mobile-expo/               App.tsx, src/projects.ts (+ test), package.json (npm, standalone)
    webhook-laravel/           composer.json, src/…, routes/webhooks.php, config/polyapp.php, tests/…
  scripts/
    demo.sh
    demo-flow.mjs
```

## 4. Testing rules

- A skipped step is reported as skipped, never as passed.
- No benchmark numbers are published until they are measured.
- No test talks to a real cloud service or uses real credentials.

## 5. Known limitations

- The Laravel adapter tests require `php` and `composer`; `scripts/demo.sh` reports them as SKIPPED when PHP is missing.
- Tenantly needs Postgres and Redis, so local runs use the in-memory mock API by default.
- The mobile app is checked with vitest and `tsc --noEmit`; it has not been exercised on a simulator.
