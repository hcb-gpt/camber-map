# Camber Map Live Contract

This repository is a **generated, authoritative system map**.

Goal: keep a **machine-readable** graph plus **human-readable** reference outputs that are **live, exhaustive, and continuously updated**.

## Outputs (generated)
All outputs live under `public/` and are overwritten by the build.

- `public/facts.json` — live inventory + counts + build metadata
- `public/map.json` — canonical graph (nodes/edges)
- `public/map.schema.json` — JSON Schema for `facts.json` + `map.json`
- `public/map.md` — human-readable summary (counts, top nodes, notable edges)
- `public/map.graphml` — GraphML export for tooling (yEd, Gephi)

## Canonical identifiers
Node IDs are stable:

- `table:public.<name>`
- `view:public.<name>`
- `matview:public.<name>`
- `fn:public.<name>(<identity_args>)`
- `ext:<name>`
- `edge:<slug>`

Edges:
- `depends_on` — view/matview dependency on a relation
- `reads_writes` — function dependency on a relation
- `calls` — runtime/instrumented call edge (future)

## Exhaustiveness definition
"Exhaustive" means:

1) **DB catalog complete** for target schemas (default: `public`), including tables, views, matviews, functions, extensions.
2) **Deployed edge function inventory complete** (when Supabase management API credentials are provided).
3) **Dependency edges complete** where determinable from Postgres catalog (`pg_depend`/`pg_rewrite`).
4) Optional: **runtime edges** (edge-function → db objects, webhook → edge-function, etc.) via instrumentation/audit. These are additive and should never be inferred without evidence.

## Freshness
Freshness is determined by:
- `facts.json.updated_at`
- `facts.json.git_sha`
- `facts.json.mode`

A scheduled build should update daily at minimum and on every merge to `main`.

## Consumer guidance (Orbit team)
Use `public/map.json` as the source of truth for automated reasoning.
Use `public/map.md` for quick human orientation.

Any local copies should be treated as stale unless their `updated_at` is within your acceptable window.
