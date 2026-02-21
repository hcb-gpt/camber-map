# VP — Capability Health Report (generated)

## Overall Health

**8 healthy, 2 degraded** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |
| OK | Segmentation | chad | 100% | 36m ago | 2026-02-21 21:15:39Z |
| OK | Context Assembly | chad | 100% | 42m ago | 2026-02-21 21:10:49Z |
| OK | Project Attribution | chad | 100% | 6h ago | 2026-02-21 15:40:30Z |
| OK | Knowledge Extraction | chad | 100% | 6h ago | 2026-02-21 15:40:38Z |
| OK | Call Summarization | chad | 100% | 42m ago | 2026-02-21 21:10:54Z |
| OK | Signal Detection | chad | 100% | 42m ago | 2026-02-21 21:10:54Z |
| OK | Journal Consolidation | chad | 100% | 42m ago | 2026-02-21 21:10:59Z |
| OK | Embedding & Search | chad | 100% | 30m ago | 2026-02-21 21:19:40Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation

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
Generated: 2026-02-21T21:50:51Z
Git SHA: bbcccf779244e2c66ab4c164c2afa1508454e020
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
