# VP — Capability Health Report (generated)

## Overall Health

**7 healthy, 2 degraded, 1 stale** out of 10 capabilities (coverage: 90%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |
| OK | Segmentation | chad | 100% | 0m ago | 2026-02-21 21:15:39Z |
| OK | Context Assembly | chad | 100% | 6m ago | 2026-02-21 21:10:49Z |
| OK | Project Attribution | chad | 100% | 6h ago | 2026-02-21 15:40:30Z |
| OK | Knowledge Extraction | chad | 100% | 6h ago | 2026-02-21 15:40:38Z |
| OK | Call Summarization | chad | 100% | 6m ago | 2026-02-21 21:10:54Z |
| OK | Signal Detection | chad | 100% | 6m ago | 2026-02-21 21:10:54Z |
| OK | Journal Consolidation | chad | 100% | 6m ago | 2026-02-21 21:10:59Z |
| ALERT | Embedding & Search | chad | 0% | 4d ago | 2026-02-18 00:50:12Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation
- **ALERT** Embedding & Search — blocks: context-assembly

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
Generated: 2026-02-21T21:18:09Z
Git SHA: dc3e375a78f55f950b1ad922ece90553ea7d6d73
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
