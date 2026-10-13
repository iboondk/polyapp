# PolyApp write-up

## Problem

Tenantly is a multi-tenant Go service with tenants and projects. It publishes no OpenAPI document, yet a storefront, an admin back-office, a widget, a mobile app and a webhook adapter all need to call it. Tenantly also needs Postgres, Redis and Docker, which were not available for this build.

## Architecture

The contract comes first. `contracts/openapi.yaml` (OpenAPI 3.1) mirrors the Tenantly routes the clients use, plus the inbound `projectRequested` webhook. Redocly lints it, and `openapi-typescript` generates types for `packages/api-client`. That package adds `openapi-fetch` and a `createPolyAppClient()` facade. The storefront, admin, widget and mobile apps all use this one client. The Laravel adapter verifies webhook HMAC signatures, deduplicates events and calls the API. A zero-dependency Node server, `mock-api/`, implements the same routes and errors in memory.

## Key decisions

- **Contract first.** The spec is the source of truth. If Tenantly differs, Tenantly should change. See ADR-0001.
- **Mock as test double.** The mock is labelled as a stand-in and can be replaced through `POLYAPP_API_URL`. See ADR-0002.
- **Generated types, thin runtime.** Generated code is committed, and CI fails on drift. See ADR-0003.
- **Expo outside the workspace.** Plain npm and a `file:` dependency avoid Metro symlink problems. See ADR-0004.
- **Server-side fetching.** The storefront fetches on the server, so the dev token never reaches the browser.

## Results

Checks run locally in the final audit pass:

- `pnpm lint:spec` validates the spec.
- `pnpm test:mock`: 12 of 12 mock API tests pass.
- `bash scripts/demo.sh --full`: no failed steps. The end-to-end flow passed 9 of 9 steps, including the cross-tenant 404, the duplicate-name 409 and the fixture signature check. Client (9 tests), widget (10), storefront (3), Angular admin (11) and mobile (9) suites passed, and the Angular and storefront production builds succeeded. Laravel was skipped because PHP is not installed.

The Laravel tests are written but have not run, and the CI workflow has not run on GitHub. No benchmark numbers are claimed.

## What I would do next

1. Run the Laravel tests where PHP and Composer exist, and confirm the CI job passes.
2. Run the same flow against a real Tenantly server.
3. Replace the dev-token route with real authentication before any non-local use.
4. Add a container image per app, so `docker compose up` covers the whole stack.
5. Run contract tests against both the mock and Tenantly, to catch drift automatically.
