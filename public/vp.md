# VP — Capability Health Report (generated)

## Overall Health

**6 healthy, 4 degraded** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 5h ago | 2026-02-24 01:27:11Z |
| OK | Transcription | chad | 100% | 5h ago | 2026-02-24 01:27:11Z |
| OK | Segmentation | chad | 100% | 5h ago | 2026-02-24 01:27:22Z |
| OK | Context Assembly | chad | 100% | 5h ago | 2026-02-24 01:27:26Z |
| OK | Project Attribution | chad | 100% | 5h ago | 2026-02-24 01:27:26Z |
| WARN | Knowledge Extraction | chad | 100% | 25h ago | 2026-02-23 04:56:24Z |
| WARN | Call Summarization | chad | 100% | 27h ago | 2026-02-23 02:49:35Z |
| WARN | Signal Detection | chad | 100% | 27h ago | 2026-02-23 03:26:57Z |
| OK | Journal Consolidation | chad | 100% | 0m ago | 2026-02-24 06:15:31Z |
| WARN | Embedding & Search | chad | 100% | 31h ago | 2026-02-22 23:25:24Z |

## Bottlenecks

- **WARN** Knowledge Extraction — blocks: signal-detection, consolidation, embedding
- **WARN** Call Summarization — no downstream dependents
- **WARN** Signal Detection — no downstream dependents
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
Generated: 2026-02-24T06:16:16Z
Git SHA: 511167d261eefa0d44a0431250cb9995d5ab0974
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
