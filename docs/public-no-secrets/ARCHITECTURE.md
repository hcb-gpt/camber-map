# Public, no-secrets architecture (Option 2 runtime lineage)

Constraint: this repo is public → **no secrets in GitHub** (no Actions secrets, no committed tokens).

Goal: keep an **exhaustive, live, evidence-backed map** available to Orbit at all times.

## Design

### Source of truth
The live Supabase project is the source of truth.

- DB catalog + dependencies (tables/views/functions/extensions)
- Runtime lineage edges (evidence-backed) via `public.system_lineage_edges`
- (Optional) deployed Edge Function inventory

### Where generation runs
Run generation **inside Supabase** (Edge Function + DB cron), where secrets can live safely:

1) A Supabase Edge Function (e.g. `camber-map-generate`) connects to Postgres using built-in `SUPABASE_DB_URL`.
2) It generates:
   - `facts.json`
   - `map.json`
   - `map.md`
   - `map.graphml`
   - `map.schema.json`
3) It writes these to a **public Supabase Storage bucket** (e.g. `camber-map`) at stable paths.

### How it stays live
Use Supabase Cron (`pg_cron`) + `pg_net` to invoke the Edge Function on a schedule.
Store any call tokens in **Supabase Vault** (not GitHub).

### How this public repo stays updated (optional)
This repo can *mirror* the generated artifacts **without any secrets** by pulling from public URLs and committing.

- GitHub Action uses `curl` to download `https://<public-host>/facts.json`, `map.json`, etc.
- Commits only the generated `public/*` outputs.

If you don’t need mirroring, you can skip this and just point Orbit to the public bucket URLs.

## Security posture
- No GitHub secrets.
- No API keys in `index.html`.
- Public exposure is limited to the map outputs you intentionally publish.

If the map outputs are too sensitive to publish publicly, make the bucket private and distribute **signed URLs** or require auth.

## Required product work
- Apply runtime lineage migration: `docs/product_migrations/20260218_runtime_lineage_edges.sql`
- Emit evidence events with `metadata.edges` (see `docs/instrumentation/RUNTIME_LINEAGE.md`)

## What is NOT possible under the constraint
A GitHub Action cannot query your live DB or Supabase Management API without secrets.
Therefore, **live generation must happen inside the product** (or another private runner).
