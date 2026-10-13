# ADR-0004: Expo mobile app outside the pnpm workspace

- **Status:** Accepted
- **Date:** 2026-10

## Context

Expo and Metro resolve dependencies differently from the other apps, and symlinked workspace packages can break Metro bundling. The mobile app also needs its own React version, which must not collide with the Next.js React version.

## Decision

`apps/mobile-expo` is excluded from `pnpm-workspace.yaml`. It is installed with plain npm (`npm ci`, using its own `package-lock.json`). It depends on the client through `"file:../../packages/api-client"`, which uses the built `dist` folder. The logic lives in `src/projects.ts`, which vitest tests without a simulator. `tsc --noEmit` checks the app.

## Consequences

- Positive: no Metro symlink problems, and no dependency conflicts with the web apps.
- Negative: the client must be built (`pnpm build:client`) before the mobile install, and CI runs them in that order. The mobile install does not share the pnpm store.
