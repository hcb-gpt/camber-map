# VP — Capability Health Report (generated)

## Overall Health

**1 healthy, 5 degraded, 4 unknown** out of 10 capabilities (coverage: 60%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 30h ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 30h ago | 2026-02-19 18:32:33Z |
| WARN | Segmentation | chad | 100% | 30h ago | 2026-02-19 18:32:33Z |
| ??? | Context Assembly | chad | 0% | n/a | n/a |
| WARN | Project Attribution | chad | 100% | 30h ago | 2026-02-19 18:32:33Z |
| OK | Knowledge Extraction | chad | 100% | 5h ago | 2026-02-20 19:23:01Z |
| ??? | Call Summarization | chad | 0% | n/a | n/a |
| ??? | Signal Detection | chad | 0% | n/a | n/a |
| ??? | Journal Consolidation | chad | 0% | n/a | n/a |
| WARN | Embedding & Search | chad | 100% | 30h ago | 2026-02-19 18:32:33Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation
- **WARN** Segmentation — blocks: context-assembly, summarization
- **WARN** Project Attribution — blocks: journal
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
Generated: 2026-02-21T00:33:13Z
Git SHA: 09aa669d4e42f52735d7ff6cdd0c4bfe4db84d77
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
