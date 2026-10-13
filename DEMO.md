# Demo script: recording a GIF or Loom

This script records a short walkthrough of PolyApp against the local mock API. It uses only placeholder data and no real credentials. Each step lists the command or screen to show and what the viewer should see. The expected lines come from the demo output and are not timings or benchmarks.

## Before you record

1. Use a clean terminal with a large font, around 16 pt, and a dark or light theme with good contrast.
2. Set the working directory to the repo root.
3. Make sure nothing listens on port 4010: `lsof -i :4010` should print nothing.
4. Close notifications and hide any shell history that shows real tokens or hostnames.
5. Start the recorder at a 1280 x 720 or 1440 x 900 region, and use 10 to 15 frames per second for GIFs.

## Scene 1: the one-line promise (about 10 s)

- Show the README title and the architecture diagram.
- Narration: "One OpenAPI contract generates the client for web, admin, widget, mobile and a webhook adapter."

## Scene 2: start the API (about 15 s)

Run:

```bash
docker compose up
```

If Docker is not available, run instead:

```bash
node mock-api/server.mjs --port 4010
```

In a second terminal, run:

```bash
curl -s http://127.0.0.1:4010/healthz
```

Expected output: `{"status":"ok"}`.

Narration: "The mock API stands in for Tenantly. It is a test double, not Tenantly."

Stop the server before Scene 3. Press Ctrl-C in the first terminal (or run `docker compose down`), then confirm the port is free:

```bash
lsof -i :4010   # must print nothing
```

`scripts/demo.sh` starts its own mock on port 4010 and records FAIL if that port is already in use.

## Scene 3: run the full demo (about 45 s)

With port 4010 free, run:

```bash
bash scripts/demo.sh
```

Show the table at the end. Each row must read PASS, FAIL or SKIPPED. Point out the SKIPPED rows for the Laravel tests (PHP missing) and for the `--full` steps. Do not edit the output. If a row shows FAIL, stop and re-record after fixing the cause. Never cut a FAIL from the recording.

## Scene 4: the end-to-end flow (about 20 s)

Open `.tmp/demo-report.md` and show the steps:

1. health
2. dev token for the owner
3. create a tenant
4. create three projects
5. list projects
6. get one project
7. a non-member gets 404
8. a duplicate name gets 409
9. the webhook fixture signature matches

Narration: "A non-member gets a 404, not a 403, so the API does not reveal that a tenant exists."

## Scene 5: the storefront (optional, about 20 s)

The mock from Scene 3 has stopped, and its tenants were in memory only, so the tenant from Scene 4 does not exist here. Seed a fresh tenant on a new mock.

In a terminal at the repo root, start the mock and leave it running:

```bash
node mock-api/server.mjs --port 4010
```

In a second terminal at the repo root, seed the tenant that the storefront's dev email (`storefront@example.test`) owns. The script prints only the tenant id:

```bash
export POLYAPP_TENANT_ID=$(node scripts/seed-storefront.mjs)
```

Then run the storefront against the mock with the variables from `apps/storefront-next/.env.example`:

```bash
cd apps/storefront-next
POLYAPP_API_URL=http://127.0.0.1:4010 POLYAPP_DEV_EMAIL=storefront@example.test POLYAPP_TENANT_ID=$POLYAPP_TENANT_ID pnpm dev
```

Open `http://localhost:3000` and show the project list (Alpha, Beta, Gamma). Then open one project. Note that the dev token is fetched on the server, so it never reaches the browser.

Rehearse this scene once before recording and confirm the list renders. If it shows an error, check that the mock is running and that the seed script succeeded.

## Scene 6: close (about 5 s)

- Show `WRITEUP.md` or the CI badge placeholder.
- Narration: "Contract first, generated clients, a mock that is labelled as a mock, and honest reporting of what did not run."

## Editing and export

- **GIF:** trim to under 60 seconds, then export at 800 px wide with about 10 fps to keep the file small. Check that every PASS and FAIL row is readable.
- **Loom:** record with the camera off, and add chapters at Scenes 2, 3 and 4.
- Before publishing, check that no real token, email or hostname appears in the frame. The demo uses `example.test` addresses and a dev token only.

## Checklist before publishing

- [ ] The recording shows the demo table with no FAIL rows, or the FAIL is explained on screen.
- [ ] No real credentials, tokens or private hostnames appear.
- [ ] The narration does not claim that Tenantly was tested. The mock is a stand-in.
- [ ] No performance or benchmark numbers are shown or narrated.
