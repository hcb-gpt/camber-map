# camber-map

This repo is the **always-up-to-date, exhaustive system map** for Camber Calls.

It is intended to be:
- **Machine-readable** (canonical graph + schema)
- **Human-readable** (generated summary)
- **Live** (built on a schedule and on every merge)

## Generated outputs
All outputs are generated into `public/`:
- `public/facts.json`
- `public/map.json`
- `public/map.schema.json`
- `public/diagram.nodes.json`
- `public/diagram.connections.json`
- `public/diagram.schema.json`
- `public/map.md`
- `public/map.graphml`
- `public/vp.json`
- `public/vp.prev.json`
- `public/vp.md`
- `public/changes.json`
- `public/changes.md`

Do not hand-edit generated outputs.

## Build (local)
Requirements: Node 18+

```bash
npm ci
DATABASE_URL=... \
SUPABASE_PROJECT_REF=... \
SUPABASE_ACCESS_TOKEN=... \
node scripts/generate_all.mjs
```

If `DATABASE_URL` is not set, `generate_all.mjs` still generates map outputs and skips VP/changes outputs.

## Automation
A scheduled build keeps artifacts live. The repository workflow is:

- `.github/workflows/build-live-map.yml` (daily + on push to `main`)
- uses workflow `concurrency` to avoid overlapping runs
- commits refreshed `public/*` artifacts when outputs change

Template copy for reuse in other repos: `docs/workflows/build-live-map.yml.template`.

## Architecture is source of truth

The Flow view in `index.html` renders pipeline dependencies from a single canonical spec:

```
config/architecture_flow.json
```

The node and connection datasets are loaded at runtime from machine-readable files:

```
public/diagram.nodes.json
public/diagram.connections.json
```

This file defines:
- **`required_flow_edges`** — every pipeline dependency that must render as a blue flow line
- **`exceptions.must_be_disconnected`** — nodes that must have no inbound flow edges (e.g. cron-triggered, human-initiated)
- **`aliases`** — maps legacy short IDs to canonical slugs

To add or remove a pipeline edge, edit `architecture_flow.json` and run:

```bash
npm run audit:flow
```

The audit script (`scripts/audit_flow_edges.mjs`) parses `config/architecture_flow.json`, `public/diagram.nodes.json`, and `public/diagram.connections.json`, then validates that every required edge exists and disconnected nodes remain disconnected. It exits non-zero on drift.

## Contract
See `docs/CONTRACT.md` for definitions of exhaustiveness, canonical IDs, and consumer guidance.

<!-- last-rebuild-trigger: 2026-02-21T00:00Z -->
