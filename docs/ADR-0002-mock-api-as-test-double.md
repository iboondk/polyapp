# ADR-0002: A zero-dependency mock API as a labelled test double

- **Status:** Accepted
- **Date:** 2026-10

## Context

Tenantly needs Postgres, Redis and Docker. None of these were available on the build machine, so the clients could not be tested against Tenantly directly.

## Decision

`mock-api/` is a Node HTTP server (`node:http`, ESM `.mjs`, no dependencies) with in-memory state. It implements the same routes and error rules as the contract. Client tests run against it over real HTTP through vitest `globalSetup`, and `scripts/demo.sh` starts it on port 4010 by default.

The mock is always called a test double. It is never presented as Tenantly. Any client can be pointed at real Tenantly by setting `POLYAPP_API_URL`.

## Consequences

- Positive: tests need no external services, and the mock starts in milliseconds.
- Negative: the mock does not persist data, and its dev-token route is not real auth. A passing test shows only that the client matches the mock and the contract, not that Tenantly behaves the same way.
- Follow-up: run the same suite against Tenantly once it is available.
