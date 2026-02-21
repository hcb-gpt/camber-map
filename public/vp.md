# VP — Capability Health Report (generated)

## Overall Health

**3 healthy, 6 degraded, 1 unknown** out of 10 capabilities (coverage: 60%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 32h ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 32h ago | 2026-02-19 18:32:33Z |
| OK | Segmentation | chad | 100% | 6h ago | 2026-02-20 21:19:24Z |
| WARN | Context Assembly | chad | 0% | 6h ago | 2026-02-20 21:19:32Z |
| OK | Project Attribution | chad | 100% | 6h ago | 2026-02-20 21:19:32Z |
| OK | Knowledge Extraction | chad | 100% | 8h ago | 2026-02-20 19:23:01Z |
| WARN | Call Summarization | chad | 0% | 6h ago | 2026-02-20 21:19:01Z |
| WARN | Signal Detection | chad | 0% | 6h ago | 2026-02-20 21:19:37Z |
| ??? | Journal Consolidation | chad | 0% | n/a | n/a |
| WARN | Embedding & Search | chad | 100% | 32h ago | 2026-02-19 18:32:33Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation
- **WARN** Context Assembly — blocks: attribution
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
Generated: 2026-02-21T02:52:41Z
Git SHA: 450dc5aa5aac929ea043758a529b24458f6d37ea
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
