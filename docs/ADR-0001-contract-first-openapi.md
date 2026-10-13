# ADR-0001: Contract first with a hand-written OpenAPI 3.1 spec

- **Status:** Accepted
- **Date:** 2026-10

## Context

Tenantly is the real API, but it publishes no OpenAPI document. PolyApp has several clients (Next.js, Angular, Vue, Expo, Laravel) that must agree on routes, auth rules and error codes.

## Decision

`contracts/openapi.yaml` is an OpenAPI 3.1 document written in this repo. It mirrors the Tenantly HTTP surface that PolyApp clients use, plus the `webhooks.projectRequested` extension. Redocly lints it with `contracts/redocly.yaml`. The OAuth and GraphQL routes in Tenantly are left out because no PolyApp client uses them.

## Consequences

- Positive: one source of truth, and a single place to check error codes (`not_found`, `forbidden`, `unauthorized`, `invalid_request`, `conflict`, `rate_limited`).
- Negative: the spec can drift from Tenantly. The spec records a note for Tenantly: if its handlers return a different projects-list shape, Tenantly should change to match `{items: [...]}`.
- Follow-up: contract tests against a real Tenantly server (see WRITEUP.md, next steps).
