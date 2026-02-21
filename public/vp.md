# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 7h ago | 2026-02-21 15:39:47Z |
| OK | Transcription | chad | 100% | 1h ago | 2026-02-21 21:11:06Z |
| OK | Segmentation | chad | 100% | 1h ago | 2026-02-21 21:15:39Z |
| OK | Context Assembly | chad | 100% | 1h ago | 2026-02-21 21:10:49Z |
| OK | Project Attribution | chad | 100% | 7h ago | 2026-02-21 15:40:30Z |
| OK | Knowledge Extraction | chad | 100% | 7h ago | 2026-02-21 15:40:38Z |
| OK | Call Summarization | chad | 100% | 1h ago | 2026-02-21 21:10:54Z |
| OK | Signal Detection | chad | 100% | 1h ago | 2026-02-21 21:10:54Z |
| OK | Journal Consolidation | chad | 100% | 1h ago | 2026-02-21 21:10:59Z |
| OK | Embedding & Search | chad | 100% | 1h ago | 2026-02-21 21:19:40Z |

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
Generated: 2026-02-21T22:16:49Z
Git SHA: a7d1e882f2415bbf973fcb2a9956ca62c64cba49
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
