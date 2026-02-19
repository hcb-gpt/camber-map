# VP — Capability Health Report (generated)

## Overall Health

**3 degraded, 1 stale, 6 unknown** out of 10 capabilities (coverage: 0%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| ??? | Call Ingestion | chad | 0% | n/a | n/a |
| ALERT | Transcription | chad | 0% | 5d ago | 2026-02-14 22:24:47Z |
| ??? | Segmentation | chad | 0% | n/a | n/a |
| ??? | Context Assembly | chad | 0% | n/a | n/a |
| WARN | Project Attribution | chad | 0% | 42h ago | 2026-02-17 23:56:58Z |
| WARN | Knowledge Extraction | chad | 0% | 30m ago | 2026-02-19 17:35:56Z |
| ??? | Call Summarization | chad | 0% | n/a | n/a |
| ??? | Signal Detection | chad | 0% | n/a | n/a |
| ??? | Journal Consolidation | chad | 0% | n/a | n/a |
| WARN | Embedding & Search | chad | 0% | 41h ago | 2026-02-18 00:50:12Z |

## Bottlenecks

- **ALERT** Transcription — blocks: segmentation
- **WARN** Project Attribution — blocks: journal
- **WARN** Knowledge Extraction — blocks: signal-detection, consolidation, embedding
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
Generated: 2026-02-19T18:08:08Z
Git SHA: 15399426a5f3e7fd1423ffd440d49cf3f25504be
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
