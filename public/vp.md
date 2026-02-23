# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 4h ago | 2026-02-23 02:49:22Z |
| OK | Transcription | chad | 100% | 4h ago | 2026-02-23 02:49:22Z |
| OK | Segmentation | chad | 100% | 1h ago | 2026-02-23 05:32:05Z |
| OK | Context Assembly | chad | 100% | 2h ago | 2026-02-23 04:57:19Z |
| OK | Project Attribution | chad | 100% | 2h ago | 2026-02-23 04:57:19Z |
| OK | Knowledge Extraction | chad | 100% | 2h ago | 2026-02-23 04:56:24Z |
| OK | Call Summarization | chad | 100% | 4h ago | 2026-02-23 02:49:35Z |
| OK | Signal Detection | chad | 100% | 3h ago | 2026-02-23 03:26:57Z |
| OK | Journal Consolidation | chad | 100% | 6m ago | 2026-02-23 06:30:45Z |
| OK | Embedding & Search | chad | 100% | 7h ago | 2026-02-22 23:25:24Z |

## Bottlenecks

No degraded or stale capabilities detected.

## Pipeline Flow

```
[Call Ingestion]
  |
  v
[Transcription]
  |
  v
[Segmentation]
  |    |
  v    v
[Context Assembly]  [Call Summarization]
  |    |    |    |    |
  v    v    v    v    v
[Project Attribution]  [Knowledge Extraction]  [Signal Detection]  [Journal Consolidation]  [Embedding & Search]
```

---
Generated: 2026-02-23T06:38:13Z
Git SHA: 547edf3875b74d276b0d891323fa8eb714b5e2de
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
