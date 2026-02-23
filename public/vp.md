# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 6h ago | 2026-02-22 18:20:32Z |
| OK | Transcription | chad | 100% | 6h ago | 2026-02-22 18:20:32Z |
| OK | Segmentation | chad | 100% | 54m ago | 2026-02-22 23:35:47Z |
| OK | Context Assembly | chad | 100% | 6m ago | 2026-02-23 00:21:01Z |
| OK | Project Attribution | chad | 100% | 6m ago | 2026-02-23 00:21:01Z |
| OK | Knowledge Extraction | chad | 100% | 1h ago | 2026-02-22 23:25:24Z |
| OK | Call Summarization | chad | 100% | 1h ago | 2026-02-22 23:25:43Z |
| OK | Signal Detection | chad | 100% | 48m ago | 2026-02-22 23:39:01Z |
| OK | Journal Consolidation | chad | 100% | 12m ago | 2026-02-23 00:15:16Z |
| OK | Embedding & Search | chad | 100% | 1h ago | 2026-02-22 23:25:24Z |

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
Generated: 2026-02-23T00:29:32Z
Git SHA: 52c311b2f4a28084bff123e3fe85329295f0ff13
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
