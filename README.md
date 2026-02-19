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
- `public/map.md`
- `public/map.graphml`

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

## Automation
A scheduled build is required to keep the map live.

I cannot write `.github/workflows/*` from this environment due to GitHub restrictions.
Create a workflow using the template in `docs/workflows/build-live-map.yml.template`.

## Contract
See `docs/CONTRACT.md` for definitions of exhaustiveness, canonical IDs, and consumer guidance.
