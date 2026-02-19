# Improvements spec: make the live map VP-useful in real time (aligned to product vision)

Audience: STRAT-VP (and any AI/engineer implementing for STRAT-VP).

This spec extends `PRODUCT_MIGRATION_TO_LIVE_MAP.md` so the system map is not just a DB dependency graph, but a **living product model**:
- explains the product at the *capability + customer value* layer
- shows *real-time health* of each capability
- shows *coverage/completeness* of instrumentation (so “exhaustive” is measurable)
- enables fast “what changed?” + “what’s breaking?” comprehension

Constraint reminder: the repo is public → **no GitHub secrets**. Generation and sensitive calls happen inside the product.

---

## 1) Add a VP layer: semantic nodes + capability map

### 1.1 New tables (authoritative product model)
Create these tables in Postgres:

1) `public.camber_capabilities`
- `capability_id text primary key` (stable slug, e.g., `ingest_call`, `transcribe`, `extract_commitments`, `notify_team`, `close_loop`)
- `title text not null`
- `description text not null`
- `north_star_relation text null` (how it ties to vision / NSM)
- `owner text null` (team/person)
- `status text not null default 'active'` (active|beta|deprecated|planned)
- `tags text[] null`

2) `public.camber_capability_edges`
- `from_capability_id text not null`
- `to_capability_id text not null`
- `edge_type text not null` (depends_on|feeds|triggers)
- PK `(from_capability_id,to_capability_id,edge_type)`

3) `public.camber_capability_links`
Links capabilities to technical nodes.
- `capability_id text not null`
- `node_id text not null` (canonical node id, e.g., `edge:persist_call_event`, `table:public.calls_raw`)
- `link_type text not null` (implements|uses|writes|reads|depends_on)
- PK `(capability_id,node_id,link_type)`

4) `public.camber_node_metadata`
Human helpful context for technical nodes.
- `node_id text primary key`
- `title_override text null`
- `description text null`
- `owner text null`
- `runbook_url text null`
- `tags text[] null`
- `sensitivity text not null default 'internal'` (public|internal|restricted)

### 1.2 Merge semantics into `map.json`
Update generation so `map.json` includes both layers:
- add new node kinds:
  - `capability:<slug>` nodes (kind = `capability`, group = `capability`)
- add new edge types:
  - `implements` capability → edge function/table/fn
  - `depends_on_capability` capability → capability

Add `facts.json.capabilities` summary:
- total capabilities
- by status

### 1.3 VP-focused outputs
Generate two additional artifacts:
- `vp.json` (machine readable)
- `vp.md` (human readable)

`vp.json` should include:
- `updated_at`
- `nsm` (north star metric name + current value + trend)
- `top_capabilities` (by volume/impact)
- `risk_capabilities` (by errors/latency)
- `coverage` (instrumentation coverage score)
- `changes` (last 24h summary)

`vp.md` should read like an exec dashboard.

---

## 2) Make “exhaustive” measurable: coverage & staleness

Right now, the map can be technically correct but still incomplete if producers don’t emit edges.

### 2.1 Expected producers table
Create:

`public.camber_expected_producers`
- `producer_id text primary key` (e.g., `edge:persist_call_event`, `router:zaps:zap_123`)
- `producer_type text not null` (edge|router|worker|cron)
- `required boolean not null default true`
- `expected_min_events_per_day int null` (optional)
- `last_seen_at_utc timestamptz null` (maintained)

### 2.2 Maintain `last_seen_at_utc`
On insert to `public.evidence_events`, upsert producer heartbeat:
- If `source_type='edge'`, producer_id = `edge:<source_id>`
- If `source_type='router'`, producer_id = `router:<source_id>`

### 2.3 Coverage score
During generation compute:
- `coverage.required_producers_total`
- `coverage.required_producers_seen_recently` (e.g., last 24h)
- `coverage.score` = seen/total
- `coverage.missing` list

Add these to:
- `facts.json.coverage`
- `vp.json.coverage`
- `vp.md` section “Coverage gaps”

### 2.4 Staleness detection
Track:
- most recent `system_lineage_edges.last_seen_at_utc`
- most recent `evidence_events.ingested_at`

If stale beyond threshold (e.g., 15 minutes), mark:
- `facts.json.health.state = degraded`
- `vp.json.alerts[]` includes staleness alert

---

## 3) Real-time operational truth: volume, latency, error rate per capability

STRAT-VP needs to answer: “Is the product healthy?” and “Where is the bottleneck?”

### 3.1 Metrics table
Create a small rollup table:

`public.camber_metrics_rollup`
- `metric_time_utc timestamptz not null`
- `scope_type text not null` (capability|producer|system)
- `scope_id text not null` (capability slug or node id)
- `metric_name text not null` (events, errors, latency_p50_ms, latency_p95_ms, queue_depth, etc.)
- `metric_value numeric not null`
- PK `(metric_time_utc, scope_type, scope_id, metric_name)`

### 3.2 How to populate metrics (minimum viable)
On each request/job (in producers): add `metadata.metrics` in `evidence_events`, e.g.:
```json
{"latency_ms": 142, "status": "ok", "capability": "ingest_call"}
```

Then a DB job aggregates into `camber_metrics_rollup` every 1–5 minutes.

### 3.3 VP outputs
In `vp.json` and `vp.md`, include:
- system throughput (last hour/day)
- error rate (last hour/day)
- worst 5 capabilities by p95 latency
- worst 5 by error rate
- backlog indicators (queue depth / retries)

---

## 4) “What changed?”: diffs, deployments, schema drift

VPs need a short, accurate changelog.

### 4.1 Artifact history
Instead of overwriting artifacts only, keep a minimal history:

`public.camber_map_artifact_versions`
- `version_id bigserial primary key`
- `artifact_key text not null`
- `body_sha256 text not null`
- `updated_at_utc timestamptz not null default now()`
- `body text not null`

Store only last N versions per key (e.g., 50) using a cleanup job.

### 4.2 Diff artifact
During generation, compute diffs vs last version:
- nodes added/removed (by kind)
- edges added/removed (by type)
- top 20 most impacted nodes

Publish:
- `changes.json`
- `changes.md`

Include a summary in `vp.md`.

### 4.3 Deployment signals
If you can’t call the Supabase Management API, rely on live signals:
- migrations count changed
- evidence producers newly seen
- function definitions changed (optional via `pg_proc` hash)

---

## 5) Better mapping to “product vision” (not just components)

Add one more table that STRAT-VP can edit without touching code:

`public.camber_vision`
- `key text primary key` (e.g., `north_star_metric`, `vision_statement`, `target_customer`, `activation_definition`)
- `value jsonb not null`

Generation should embed `camber_vision` into `vp.json` and `vp.md`.

---

## 6) Publication strategy (public repo, no secrets)

### 6.1 Recommended publication
Use the product to publish:
- `camber-map-artifact` serves artifacts publicly by key
- Add endpoints for `vp.json`, `vp.md`, `changes.json`, `changes.md`

Cache:
- `Cache-Control: public, max-age=30` for vp/status
- `max-age=60` for map

### 6.2 Optional mirroring to GitHub
Only if desired: mirror public URLs into the repo (no secrets) using the existing curl workflow template.

---

## 7) Acceptance criteria (STRAT-VP)

A STRAT-VP should be able to answer in under 60 seconds:
1) “Is the product healthy right now?” (vp.md headline + alerts)
2) “What’s the biggest risk/bottleneck?” (worst capabilities by latency/errors)
3) “Did anything change recently?” (changes.md)
4) “If we change X table/function, what breaks?” (blast radius view from map.json)
5) “Are we truly instrumented/exhaustive?” (coverage score + missing producers)

---

## 8) Implementation order (minimal friction)

1) Add capability tables + links (1.1) and start with a small curated set.
2) Add expected producers + heartbeats (2.1–2.2).
3) Add coverage + staleness into facts/vp outputs.
4) Add vp.md/vp.json generation (exec dashboard).
5) Add diffs (changes.*).
6) Add metrics rollup when ready.

This order yields immediate VP utility before full metrics rollups exist.
