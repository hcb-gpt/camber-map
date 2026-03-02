#!/usr/bin/env bash
set -euo pipefail

# Generates facts.json used by the architecture map UI.
# Works in two modes:
#  1) Repo-only (no secrets): derives counts from the repository.
#  2) Repo+DB (optional): if DATABASE_URL is set, queries Postgres for live counts.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

json_escape() {
  local py_bin=""
  if command -v python3 >/dev/null 2>&1; then
    py_bin="python3"
  elif command -v python >/dev/null 2>&1; then
    py_bin="python"
  else
    echo "ERROR: json_escape requires python3 or python" >&2
    return 127
  fi

  "$py_bin" -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

now_utc() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# --- Repo-derived counts (always available) ---
MIGRATIONS_REPO=0
if [ -d "supabase/migrations" ]; then
  MIGRATIONS_REPO=$(find supabase/migrations -maxdepth 1 -type f -name "*.sql" | wc -l | tr -d ' ')
fi

EDGE_FUNCS_REPO=0
if [ -d "supabase/functions" ]; then
  # Count function folders with an index.ts (exclude _shared)
  EDGE_FUNCS_REPO=$(find supabase/functions -mindepth 2 -maxdepth 2 -type f -name "index.ts" \
    | grep -v "/_shared/" | wc -l | tr -d ' ')
fi

# Basic TS+SQL LOC (rough; excludes node_modules, dist)
LOC_REPO=$(git ls-files "*.ts" "*.sql" 2>/dev/null | xargs -r wc -l | tail -n 1 | awk '{print $1}')
LOC_REPO=${LOC_REPO:-0}

# --- Optional live DB counts ---
APPLIED_MIGRATIONS_DB=null
TABLES_DB=null
VIEWS_DB=null
FUNCTIONS_DB=null
EXTENSIONS_DB=null

if [ -n "${DATABASE_URL:-}" ]; then
  if command -v psql >/dev/null 2>&1; then
    APPLIED_MIGRATIONS_DB=$(psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -tAc "select count(*)::int from supabase_migrations.schema_migrations;" 2>/dev/null || echo null)
    TABLES_DB=$(psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -tAc "select count(*)::int from information_schema.tables where table_schema='public' and table_type='BASE TABLE';" 2>/dev/null || echo null)
    VIEWS_DB=$(psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -tAc "select count(*)::int from information_schema.tables where table_schema='public' and table_type='VIEW';" 2>/dev/null || echo null)
    FUNCTIONS_DB=$(psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -tAc "select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';" 2>/dev/null || echo null)
    EXTENSIONS_DB=$(psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -tAc "select count(*)::int from pg_extension;" 2>/dev/null || echo null)
  else
    echo "WARN: DATABASE_URL set but psql not available; skipping DB counts" >&2
  fi
fi

UPDATED_AT="$(now_utc)"
GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

mkdir -p public
cat > public/facts.json <<EOF
{
  "updated_at": "${UPDATED_AT}",
  "git_sha": "${GIT_SHA}",
  "repo": {
    "edge_functions": ${EDGE_FUNCS_REPO},
    "migrations": ${MIGRATIONS_REPO},
    "loc": ${LOC_REPO}
  },
  "db": {
    "applied_migrations": ${APPLIED_MIGRATIONS_DB},
    "tables": ${TABLES_DB},
    "views": ${VIEWS_DB},
    "functions": ${FUNCTIONS_DB},
    "extensions": ${EXTENSIONS_DB}
  }
}
EOF

echo "Wrote public/facts.json"
