# VP — Capability Health Report (generated)

## Overall Health

**6 healthy, 4 degraded** out of 10 capabilities (coverage: 90%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |
| WARN | Segmentation | chad | 0% | 6h ago | 2026-02-21 15:39:53Z |
| OK | Context Assembly | chad | 100% | 6m ago | 2026-02-21 21:10:49Z |
| OK | Project Attribution | chad | 100% | 6h ago | 2026-02-21 15:40:30Z |
| OK | Knowledge Extraction | chad | 100% | 6h ago | 2026-02-21 15:40:38Z |
| OK | Call Summarization | chad | 100% | 6m ago | 2026-02-21 21:10:54Z |
| OK | Signal Detection | chad | 100% | 6m ago | 2026-02-21 21:10:54Z |
| OK | Journal Consolidation | chad | 100% | 6m ago | 2026-02-21 21:10:59Z |
| WARN | Embedding & Search | chad | 100% | 2d ago | 2026-02-19 18:32:33Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation
- **WARN** Segmentation — blocks: context-assembly, summarization
- **WARN** Embedding & Search — blocks: context-assembly

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
Generated: 2026-02-21T21:14:13Z
Git SHA: 8ab57500c9bc76a82b918708d363d3e78a06cf91
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
