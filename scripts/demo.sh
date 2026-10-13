#!/usr/bin/env bash
# PolyApp end-to-end demo: lint, codegen, build, mock API, demo flow, tests.
# Each step is PASS, FAIL or SKIPPED. Exits 1 if any step FAILs. Does not use docker.
# Usage: bash scripts/demo.sh [--full]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Optional shared cache dir. Set
# POLYAPP_CACHE_DIR to redirect npm/pnpm/pip/go caches; existing values win.
# When unset (or the dir is missing) tool defaults are used.
CACHE_DIR="${POLYAPP_CACHE_DIR:-$HOME/.cache/polyapp}"
if [ -d "$CACHE_DIR" ]; then
  export npm_config_cache="${npm_config_cache:-$CACHE_DIR/npm}"
  export npm_config_store_dir="${npm_config_store_dir:-$CACHE_DIR/pnpm-store}"
  export PIP_CACHE_DIR="${PIP_CACHE_DIR:-$CACHE_DIR/pip}"
  export GOMODCACHE="${GOMODCACHE:-$CACHE_DIR/go}"
fi
export NEXT_TELEMETRY_DISABLED=1
export NG_CLI_ANALYTICS=false
export EXPO_NO_TELEMETRY=1

FULL=0
for arg in "$@"; do
  case "$arg" in
    --full) FULL=1 ;;
    -h|--help)
      echo "Usage: bash scripts/demo.sh [--full]"
      echo "  --full  also run storefront build, angular tests and angular build"
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

mkdir -p .tmp .tmp/logs

PORT="${PORT:-4010}"
API_URL="http://127.0.0.1:${PORT}"
export POLYAPP_API_URL="$API_URL"

PIDS=()
RESULT_NAMES=()
RESULT_STATUS=()
RESULT_NOTE=()

cleanup() {
  local pid
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT TERM

record() {
  RESULT_NAMES+=("$1")
  RESULT_STATUS+=("$2")
  RESULT_NOTE+=("$3")
}

slug() {
  echo "$1" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-'
}

# run_step NAME COMMAND [ARGS...]
# Runs the command with output going to .tmp/logs/<name>.log. PASS on exit 0, otherwise FAIL.
run_step() {
  local name="$1"
  shift
  local log=".tmp/logs/$(slug "$name").log"
  echo "==> $name"
  if "$@" >"$log" 2>&1; then
    record "$name" "PASS" "log: $log"
    echo "    PASS"
  else
    local code=$?
    record "$name" "FAIL" "exit $code, log: $log"
    echo "    FAIL (exit $code). Last lines of $log:"
    tail -n 20 "$log" | sed 's/^/    | /'
  fi
}

# skip_step NAME REASON
skip_step() {
  record "$1" "SKIPPED" "$2"
  echo "==> $1"
  echo "    SKIPPED: $2"
}

# Step 2: regenerate the client and fail if the committed schema changes.
step_codegen() {
  local name="regenerate client, no drift"
  local schema="packages/api-client/src/generated/schema.d.ts"
  local log=".tmp/logs/$(slug "$name").log"
  echo "==> $name"
  if [ ! -f "$schema" ]; then
    record "$name" "FAIL" "$schema not found"
    echo "    FAIL: $schema not found"
    return
  fi
  local before after
  before="$(shasum "$schema" | awk '{print $1}')"
  if ! pnpm gen >"$log" 2>&1; then
    record "$name" "FAIL" "pnpm gen failed, log: $log"
    echo "    FAIL: pnpm gen failed. Last lines of $log:"
    tail -n 20 "$log" | sed 's/^/    | /'
    return
  fi
  after="$(shasum "$schema" | awk '{print $1}')"
  if [ "$before" = "$after" ]; then
    record "$name" "PASS" "schema.d.ts unchanged after pnpm gen"
    echo "    PASS"
  else
    record "$name" "FAIL" "schema.d.ts changed after pnpm gen (drift), see git diff"
    echo "    FAIL: schema.d.ts changed after pnpm gen (drift)"
  fi
}

# Step 4: start the mock API on $PORT and wait for /healthz.
MOCK_OK=0
step_mock_start() {
  local name="mock api start"
  echo "==> $name on port $PORT"
  if curl -fsS "$API_URL/healthz" >/dev/null 2>&1; then
    record "$name" "FAIL" "port $PORT is already in use by another server, set PORT to a free port"
    echo "    FAIL: port $PORT is already in use"
    return
  fi
  node mock-api/server.mjs --port "$PORT" >.tmp/logs/mock-api.log 2>&1 &
  local pid=$!
  PIDS+=("$pid")
  local i
  for i in $(seq 1 50); do
    if curl -fsS "$API_URL/healthz" >/dev/null 2>&1; then
      MOCK_OK=1
      break
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done
  if [ "$MOCK_OK" = "1" ]; then
    record "$name" "PASS" "pid $pid, $API_URL/healthz answered"
    echo "    PASS (pid $pid)"
  else
    record "$name" "FAIL" "mock api did not answer /healthz, log: .tmp/logs/mock-api.log"
    echo "    FAIL: mock api did not answer /healthz"
  fi
}

echo "PolyApp demo (full=$FULL, api=$API_URL)"
echo

run_step "lint spec" pnpm lint:spec
step_codegen
run_step "build client" pnpm build:client
step_mock_start

if [ "$MOCK_OK" = "1" ]; then
  run_step "demo flow" node scripts/demo-flow.mjs
else
  skip_step "demo flow" "mock api not running"
fi

run_step "client tests" pnpm --filter @polyapp/api-client test
run_step "widget tests" pnpm --filter @polyapp/widget-vue test
run_step "storefront tests" pnpm --filter @polyapp/storefront-next test

if command -v php >/dev/null 2>&1 && command -v composer >/dev/null 2>&1; then
  if [ -d apps/webhook-laravel/vendor ]; then
    run_step "laravel adapter tests" bash -c "cd apps/webhook-laravel && vendor/bin/phpunit"
  else
    skip_step "laravel adapter tests" "apps/webhook-laravel/vendor missing, run composer install"
  fi
else
  skip_step "laravel adapter tests" "php/composer not installed"
fi

if [ -d apps/mobile-expo/node_modules ]; then
  run_step "mobile tests" bash -c "cd apps/mobile-expo && npm test"
else
  skip_step "mobile tests" "run npm install in apps/mobile-expo"
fi

if [ "$FULL" = "1" ]; then
  run_step "storefront build" pnpm --filter @polyapp/storefront-next build
  run_step "angular tests" pnpm --filter @polyapp/admin-angular exec ng test --watch=false
  run_step "angular build" pnpm --filter @polyapp/admin-angular build
else
  skip_step "storefront build" "use --full"
  skip_step "angular tests" "use --full"
  skip_step "angular build" "use --full"
fi

# Stop the mock API before the summary so no server outlives the script.
cleanup
PIDS=()

echo
echo "| Step | Result | Note |"
echo "| --- | --- | --- |"
FAILS=0
for i in "${!RESULT_NAMES[@]}"; do
  echo "| ${RESULT_NAMES[$i]} | ${RESULT_STATUS[$i]} | ${RESULT_NOTE[$i]} |"
  if [ "${RESULT_STATUS[$i]}" = "FAIL" ]; then
    FAILS=$((FAILS + 1))
  fi
done
echo
if [ "$FAILS" -gt 0 ]; then
  echo "$FAILS step(s) FAILED"
  exit 1
fi
echo "No failed steps (SKIPPED steps do not fail the run)"
exit 0
