# Runtime lineage (Option 2)

This document defines the **live product** contract for emitting evidence-backed edges used by `camber-map`.

## Goal
Produce a continuously-updated, exhaustive graph of how the live system behaves:
- Edge Function → DB objects touched
- Webhooks / routers → Edge Functions
- Pipeline steps → downstream artifacts

Edges must be **evidence-backed** (no inference).

## Canonical edge format
Edges are recorded as rows in `public.system_lineage_edges`.

Each edge is:
- `from_node_id`: canonical node id (see `docs/CONTRACT.md`)
- `to_node_id`: canonical node id
- `edge_type`: string (recommended: `touches`, `calls`, `emits`, `reads`, `writes`)
- `first_seen_at_utc`, `last_seen_at_utc`, `seen_count`
- `last_evidence_event_id` (uuid) – points back to `public.evidence_events`
- `meta` (jsonb) – optional, may include `{ "sample": {...}, "confidence": "evidence" }`

## Where evidence comes from
The live system should emit `public.evidence_events` records for meaningful events. When an event contains an `edges` array in `metadata`, the DB trigger will upsert corresponding rows into `system_lineage_edges`.

### `evidence_events.metadata.edges` schema
```json
[
  {
    "from": "edge:persist_call_event",
    "to": "table:public.calls_raw",
    "type": "writes",
    "meta": { "reason": "call ingestion" }
  }
]
```

## Emission guidance
### Edge Functions
Wrap your Supabase client so each `from('<table>')` and `rpc('<fn>')` automatically emits edges.

Minimum viable: at the end of the request, emit a single evidence event with aggregated edges.

### Webhook routers (Zapier/n8n)
When a router invokes an Edge Function, emit:
- `from`: `router:<system>:<zap_id>` (or other stable id)
- `to`: `edge:<function_slug>`
- `type`: `calls`

## Exhaustiveness rule
If it can touch production, it must emit edges.

The map generator is exhaustive if:
- all producers emit `evidence_events` with edges, and
- the DB trigger keeps `system_lineage_edges` updated.

## Operational checks
- `system_lineage_edges.last_seen_at_utc` should advance daily.
- If not, instrumentation is broken; treat the map as stale.
