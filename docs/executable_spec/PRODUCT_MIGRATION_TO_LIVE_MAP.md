# Executable spec: migrate product → live, exhaustive Camber Map (no GitHub secrets)

Audience: another AI / engineer can execute this end-to-end.

## Outcome
The **live product** continuously publishes:
- `facts.json` (machine readable)
- `map.json` (machine readable)
- `map.md` (human readable)
- `map.graphml` (graph tools)
- `map.schema.json` (contract)

…and the map is **evidence-backed** and **exhaustive**:
- DB catalog + dependency edges from Postgres system catalogs
- Runtime lineage edges from real production execution (no inference)

Constraint: `hcb-gpt/camber-map` is a **public repo** → **no secrets in GitHub**.

## High-level design
1) Instrument live product to emit evidence-backed runtime edges into `public.system_lineage_edges`.
2) Generate artifacts inside the product (DB function + Edge Function).
3) Publish artifacts from product via a **public read endpoint** (either Storage bucket or a public DB table + Edge Function).
4) (Optional) Mirror artifacts into this public repo by **curling public URLs** (no secrets).

## Definitions
### Node IDs
Canonical `node_id` strings:
- `table:public.<name>`
- `view:public.<name>`
- `matview:public.<name>`
- `fn:public.<name>(<identity_args>)`
- `edge:<slug>`
- `router:<system>:<stable_id>`
- `ext:<extname>`

### Evidence-backed runtime edges
Runtime edges are upserted into `public.system_lineage_edges` from inserts into `public.evidence_events.metadata.edges`.

`public.evidence_events` columns (live product):
- `evidence_event_id uuid primary key default gen_random_uuid()`
- `source_type text not null`
- `source_id text not null`
- `occurred_at_utc timestamptz`
- `ingested_at timestamptz default now()`
- `metadata jsonb` (this is where `edges` lives)

`metadata.edges` schema:
```json
[
  {"from":"edge:persist_call_event","to":"table:public.calls_raw","type":"writes","meta":{"reason":"call ingestion"}}
]
```

## Phase 0 — Preconditions
- You have admin access to the Supabase project used by Camber Calls.
- You can run SQL migrations in the project.
- You can deploy Supabase Edge Functions in the project.

If any of these are missing, stop.

## Phase 1 — Database objects (migrations)

### 1.1 Enable required extensions (if not already)
Enable these extensions in the Supabase project:
- `pg_net` (needed to call Edge Functions from DB cron)
- `pg_cron` (needed to schedule generation)
- `vault` (store secrets, optional but recommended)

Notes:
- Supabase supports scheduling Edge Functions via `pg_cron` + `pg_net`.
- Vault is recommended for storing the function auth token and project URL.

### 1.2 Create runtime lineage edge table + trigger
Apply the SQL from:
- `docs/product_migrations/20260218_runtime_lineage_edges.sql`

Acceptance checks:
- table exists: `public.system_lineage_edges`
- trigger exists on `public.evidence_events`
- helper functions exist: `public.upsert_system_lineage_edge`, `public.trg_evidence_events_to_lineage_edges`

### 1.3 Create artifact storage table (public read)
Create a table to store the generated artifacts as blobs (text).
This avoids needing Storage and keeps publication simple.

Create:
- `public.camber_map_artifacts(artifact_key text pk, content_type text, body text, updated_at_utc timestamptz, meta jsonb)`
- Enable RLS
- Policy: allow `anon` to `select` (public read)

(If artifacts must NOT be public, do not create the anon policy. Instead serve via signed URLs or authenticated access.)

### 1.4 Create generator SQL function
Create a SECURITY DEFINER Postgres function:
- `public.camber_map_generate_json()` → returns `{facts, map}` as jsonb

Requirements:
- Builds DB catalog nodes from `pg_class`, `pg_proc`, `pg_extension`
- Builds DB dependency edges from `pg_depend` (views/matviews and functions)
- Appends runtime lineage edges from `public.system_lineage_edges`

NOTE: If you already installed a version of this function, keep it, but ensure it:
- Produces canonical node IDs
- Includes runtime edges in `map.edges`

### 1.5 Create artifact upsert helper
Create:
- `public.camber_map_upsert_artifact(p_key text, p_content_type text, p_body text, p_meta jsonb)`

Behavior:
- insert or update `public.camber_map_artifacts`
- update `updated_at_utc` on every write

Acceptance check:
- Upserting `facts.json` and reading it back via `anon` works.

## Phase 2 — Edge Functions (in product)

You will deploy TWO Edge Functions:
1) `camber-map-generate` (private) — generates artifacts, writes them into `public.camber_map_artifacts`
2) `camber-map-artifact` (public) — serves a single artifact by key

### 2.1 Auth model (no GitHub secrets)
Do NOT rely on GitHub secrets.
Do NOT rely on putting the anon key in GitHub.

Use ONE of these options:

Option A (recommended):
- `camber-map-generate` has `verify_jwt=false`
- It requires header `X-Camber-Map-Token: <token>`
- Token is stored in Supabase Vault and used by DB cron

Option B:
- `camber-map-generate` has `verify_jwt=true`
- Cron calls it with `Authorization: Bearer <anon_key>`
- Store the anon key in Vault (still no GitHub secrets)

This spec assumes Option A.

### 2.2 Deploy `camber-map-generate`
Create Edge Function:
- name: `camber-map-generate`
- set `verify_jwt=false`

Function behavior:
1) Validate `X-Camber-Map-Token` against `Deno.env.get('CAMBER_MAP_TOKEN')`
2) Call Postgres function `public.camber_map_generate_json()` (service role or DB URL)
3) Produce derived formats:
   - `facts.json` = pretty JSON
   - `map.json` = pretty JSON
   - `map.md` = markdown summary (see Phase 3)
   - `map.graphml` = graphml (Phase 3)
   - `map.schema.json` = schema contract (static file)
4) Upsert all artifacts into `public.camber_map_artifacts`
5) Return 200 with `generated_at`, sizes, node/edge counts

Implementation notes:
- Use the Edge runtime’s DB connection (e.g., postgres client via `SUPABASE_DB_URL`) OR a Supabase service role client.
- Do NOT emit secrets.

### 2.3 Deploy `camber-map-artifact`
Create Edge Function:
- name: `camber-map-artifact`
- set `verify_jwt=false`

Function behavior:
- Accept GET `/functions/v1/camber-map-artifact?key=facts.json`
- Read row from `public.camber_map_artifacts` by `artifact_key`
- Return body with correct `Content-Type`
- Add caching headers: `Cache-Control: public, max-age=60`

Acceptance:
- `curl` to the endpoint returns the artifact without auth.

## Phase 3 — Artifact formats

### 3.1 `facts.json`
Required keys:
- `updated_at` (UTC ISO)
- `mode` = `live_product`
- `db.applied_migrations`, `db.tables`, `db.views`, `db.functions`, `db.extensions`
- `runtime_lineage.count`

### 3.2 `map.json`
Required keys:
- `updated_at`
- `mode` = `live_product`
- `nodes[]` with `id`, `kind`, `schema?`, `name`, `title`, `group`
- `edges[]` with `from`, `to`, `type`, `meta?`
- `groups` (at least `db`, `runtime`)

### 3.3 `map.md` (human readable)
Generate markdown with:
- Timestamp
- Counts (nodes/edges)
- Top 25 nodes by indegree (high blast radius)
- Top 25 nodes by outdegree
- Staleness check: most recent `system_lineage_edges.last_seen_at_utc`
- Notes if runtime lineage count == 0

### 3.4 `map.graphml`
GraphML should include:
- node id
- node kind
- edge type

### 3.5 `map.schema.json`
Static schema contract for `facts.json` and `map.json`.

## Phase 4 — Scheduling (always live)

Use `pg_cron` + `pg_net` to invoke `camber-map-generate` every N minutes.

### 4.1 Store secrets in Vault
In Vault store:
- `project_url` = `https://<project-ref>.supabase.co`
- `camber_map_token` = random high-entropy string

Also set Edge Function env:
- `CAMBER_MAP_TOKEN` = same token

### 4.2 Create cron job
Schedule:
- Every 5 minutes (or 1 minute if you need near-real-time)

SQL outline:
- `cron.schedule('camber-map-generate', '*/5 * * * *', $$ select net.http_post(url:=..., headers:=..., body:='{}'::jsonb); $$);`

Headers must include:
- `Content-Type: application/json`
- `X-Camber-Map-Token: <vault secret>`

Acceptance:
- `cron.job` contains the job
- `cron.job_run_details` shows successes
- `public.camber_map_artifacts.updated_at_utc` advances

## Phase 5 — Runtime instrumentation (make it exhaustive)

This is the critical part. Without producers emitting `metadata.edges`, runtime lineage will remain empty.

### 5.1 Minimal required producers
At minimum, add edge emission to:
- Every Supabase Edge Function that handles production traffic
- Every webhook/router (Zapier/n8n/etc.) that triggers Edge Functions

### 5.2 What to emit
For each request/job, emit ONE `public.evidence_events` row with aggregated edges.

Edges to emit:
- Router → Edge Function: `{from:'router:<sys>:<id>', to:'edge:<slug>', type:'calls'}`
- Edge Function → DB table writes: `{from:'edge:<slug>', to:'table:public.<t>', type:'writes'}`
- Edge Function → DB table reads: `{from:'edge:<slug>', to:'table:public.<t>', type:'reads'}`
- Edge Function → RPC: `{from:'edge:<slug>', to:'fn:public.<rpc>(...)', type:'calls'}` (optional)

### 5.3 How to emit (generic)
Insert into `public.evidence_events` with:
- `source_type` = `'edge'` or `'router'`
- `source_id` = stable identifier (function slug, router id)
- `occurred_at_utc` = now()
- `metadata.edges` = array of edges

Example insert:
```sql
insert into public.evidence_events (source_type, source_id, occurred_at_utc, metadata)
values (
  'edge',
  'persist_call_event',
  now(),
  jsonb_build_object(
    'edges', jsonb_build_array(
      jsonb_build_object('from','edge:persist_call_event','to','table:public.calls_raw','type','writes')
    )
  )
);
```

Acceptance:
- After emitting, `public.system_lineage_edges` count increases.

## Phase 6 — Cutover (camber-map UI)

Goal: UI reads only files/artifacts; no inline data.

Change UI fetch base to the public Edge Function:
- `https://<project-ref>.supabase.co/functions/v1/camber-map-artifact?key=map.json`
- `...key=facts.json`

UI should:
- load `facts.json` first and show updated_at
- then load `map.json`

Acceptance:
- Deleting local `public/map.json` from repo does not break the live UI (it fetches from product).

## Phase 7 — Optional mirroring into this public repo
If you want the repo to always contain latest outputs, mirror from public URLs.

Use the template:
- `docs/public-no-secrets/mirror-public-artifacts.yml.template`

Set `MAP_BASE_URL` to the public host.

No secrets required.

## Validation checklist
Run these checks:
1) `facts.json` shows non-zero DB counts and current updated_at
2) `map.json` parses; node ids follow canonical format
3) `camber_map_artifacts` rows exist for all keys
4) Runtime lineage:
   - `system_lineage_edges` exists
   - count increases after a real request
   - `last_seen_at_utc` advances daily
5) Cron runs succeed; no repeated failures in `net._http_response`

## Rollback
- Disable cron job: `select cron.unschedule('<job_name>');`
- Remove public read policy if exposure is a concern.
- Leave lineage tables in place; they are additive.

## Notes / References
Supabase supports scheduling Edge Functions with `pg_cron` + `pg_net` and recommends Vault for storing auth tokens.
(See Supabase docs: Scheduling Edge Functions, pg_net, Cron, Vault.)
