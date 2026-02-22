# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 12m ago | 2026-02-22 18:00:29Z |
| OK | Transcription | chad | 100% | 12m ago | 2026-02-22 18:00:29Z |
| OK | Segmentation | chad | 100% | 11h ago | 2026-02-22 07:25:10Z |
| OK | Context Assembly | chad | 100% | 11h ago | 2026-02-22 07:25:17Z |
| OK | Project Attribution | chad | 100% | 11h ago | 2026-02-22 07:25:17Z |
| OK | Knowledge Extraction | chad | 100% | 11h ago | 2026-02-22 07:25:24Z |
| OK | Call Summarization | chad | 100% | 19h ago | 2026-02-21 23:24:07Z |
| OK | Signal Detection | chad | 100% | 11h ago | 2026-02-22 07:25:27Z |
| OK | Journal Consolidation | chad | 100% | 11h ago | 2026-02-22 07:30:46Z |
| OK | Embedding & Search | chad | 100% | 11h ago | 2026-02-22 07:25:24Z |

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
Generated: 2026-02-22T18:10:13Z
Git SHA: 86d6071a2ddb15bc6fed6e3f2fcefcf69beba4af
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
