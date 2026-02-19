# VP Layer: Capability Map + Real-Time Health

**Date:** 2026-02-19
**Status:** Executing

## Problem

The camber-map shows the **technical graph** (tables, views, functions, edges).
STRAT-VP needs a **product graph** — business capabilities with health signals,
coverage scores, and staleness alerts. The current map answers "what exists?"
but not "is it healthy?", "what changed?", or "where's the bottleneck?"

## Deliverables

### Immediate (this sprint)

| Artifact | Path | Purpose |
|----------|------|---------|
| Capability config | `config/capabilities.json` | Semantic overlay mapping business capabilities to tech nodes |
| VP generator | `scripts/generate_vp.mjs` | Queries DB + reads map.json + capabilities → `public/vp.json` |
| VP renderer | `scripts/render_vp.mjs` | Reads vp.json → `public/vp.md` + `public/changes.json` + `public/changes.md` |
| Schema update | `public/map.schema.json` | Add VP/capability definitions |
| Build wiring | `scripts/generate_all.mjs` | Add VP generation to build pipeline |

### Output Files (generated)

| File | Consumer | Content |
|------|----------|---------|
| `public/vp.json` | Machines / chat | Capabilities, health, coverage, staleness, capability edges |
| `public/vp.md` | STRAT-VP / humans | Executive summary: healthy/degraded/stale, bottlenecks, changes |
| `public/changes.json` | Machines | Diff between current and previous build |
| `public/changes.md` | Humans | What changed since last build |

## Data Contracts

### capabilities.json (config, checked in)

```json
{
  "capabilities": [
    {
      "id": "call-ingestion",
      "name": "Call Ingestion",
      "description": "Ingest calls from OpenPhone via Zapier webhooks into calls_raw",
      "owner": "chad",
      "tags": ["core", "pipeline"],
      "tech_nodes": ["edge:zapier-call-ingest", "edge:persist-call-event", "table:public.calls_raw"],
      "expected_producers": ["edge:zapier-call-ingest"],
      "health_queries": {
        "row_count": "SELECT count(*)::int AS n FROM public.calls_raw",
        "last_insert": "SELECT max(created_at) AS ts FROM public.calls_raw"
      },
      "depends_on": []
    }
  ],
  "capability_edges": [
    { "from": "call-ingestion", "to": "transcription", "type": "feeds" }
  ]
}
```

### vp.json (generated)

```json
{
  "updated_at": "2026-02-19T...",
  "git_sha": "...",
  "capabilities": [
    {
      "id": "call-ingestion",
      "name": "Call Ingestion",
      "owner": "chad",
      "tags": ["core", "pipeline"],
      "tech_node_count": 3,
      "coverage": { "expected": 1, "observed": 1, "pct": 1.0 },
      "staleness": { "hours_since_last_activity": 2.3, "status": "fresh" },
      "health": {
        "status": "healthy",
        "row_count": 1234,
        "last_activity_at": "2026-02-19T15:30:00Z"
      },
      "depends_on": []
    }
  ],
  "capability_edges": [...],
  "summary": {
    "total": 10,
    "healthy": 8,
    "degraded": 1,
    "stale": 1,
    "unknown": 0,
    "overall_coverage_pct": 0.85
  }
}
```

### Staleness Thresholds

| Status | Hours since last activity |
|--------|--------------------------|
| fresh | < 24 |
| aging | 24–72 |
| stale | > 72 |

### Coverage Definition

`coverage = observed_producers / expected_producers`

Where `observed_producers` = expected_producers that appear as `from` in
`system_lineage_edges` with `last_seen_at_utc` within the staleness window.

## Architecture

```
generate_all.mjs
  ├── generate_live_map.mjs  → facts.json, map.json
  ├── render_outputs.mjs     → map.md, map.graphml
  └── generate_vp.mjs        → vp.json          (NEW)
      └── render_vp.mjs      → vp.md, changes.json, changes.md  (NEW)
```

## Capability Definitions (for Camber)

| ID | Name | Key Tech Nodes | Expected Producers |
|----|------|---------------|-------------------|
| call-ingestion | Call Ingestion | zapier-call-ingest, persist-call-event, calls_raw | edge:zapier-call-ingest |
| transcription | Transcription | transcribe-deepgram, transcripts_comparison | edge:transcribe-deepgram |
| segmentation | Segmentation | segment-llm, call_spans | edge:segment-llm |
| context-assembly | Context Assembly | context-assembly, context-assembly-v2 | edge:context-assembly |
| attribution | Project Attribution | ai-router, projects | edge:ai-router |
| journal | Knowledge Extraction | journal-extract, journal_claims | edge:journal-extract |
| summarization | Call Summarization | generate-summary | edge:generate-summary |
| signal-detection | Signal Detection | striking-detect, chain-detect, loop-closure | edge:striking-detect |
| consolidation | Journal Consolidation | journal-consolidate | edge:journal-consolidate |
| embedding | Embedding & Search | embed-facts, journal-embed-backfill | edge:embed-facts |

## Non-goals (this sprint)

- Full metrics rollup (throughput/error_rate/latency_p95) — requires instrumentation
- Interactive VP dashboard in index.html — future
- Automatic runbook linking — future
- Sensitivity classification — future
