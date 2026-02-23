# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 12m ago | 2026-02-23 01:11:23Z |
| OK | Transcription | chad | 100% | 12m ago | 2026-02-23 01:11:23Z |
| OK | Segmentation | chad | 100% | 2h ago | 2026-02-22 23:35:47Z |
| OK | Context Assembly | chad | 100% | 6m ago | 2026-02-23 01:14:47Z |
| OK | Project Attribution | chad | 100% | 6m ago | 2026-02-23 01:14:47Z |
| OK | Knowledge Extraction | chad | 100% | 2h ago | 2026-02-22 23:25:24Z |
| OK | Call Summarization | chad | 100% | 2h ago | 2026-02-22 23:25:43Z |
| OK | Signal Detection | chad | 100% | 2h ago | 2026-02-22 23:39:01Z |
| OK | Journal Consolidation | chad | 100% | 6m ago | 2026-02-23 01:15:19Z |
| OK | Embedding & Search | chad | 100% | 2h ago | 2026-02-22 23:25:24Z |

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
Generated: 2026-02-23T01:21:08Z
Git SHA: cba12935293d8e72e96c78700a1879f74447b6a9
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
