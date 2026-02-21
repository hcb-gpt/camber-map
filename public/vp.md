# VP — Capability Health Report (generated)

## Overall Health

**3 healthy, 6 degraded, 1 unknown** out of 10 capabilities (coverage: 60%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 47h ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 47h ago | 2026-02-19 18:32:33Z |
| OK | Segmentation | chad | 100% | 6m ago | 2026-02-21 17:46:25Z |
| WARN | Context Assembly | chad | 0% | 2h ago | 2026-02-21 15:40:30Z |
| OK | Project Attribution | chad | 100% | 2h ago | 2026-02-21 15:40:30Z |
| OK | Knowledge Extraction | chad | 100% | 6m ago | 2026-02-21 17:46:35Z |
| WARN | Call Summarization | chad | 0% | 2h ago | 2026-02-21 15:40:41Z |
| WARN | Signal Detection | chad | 0% | 6m ago | 2026-02-21 17:46:37Z |
| ??? | Journal Consolidation | chad | 0% | n/a | n/a |
| WARN | Embedding & Search | chad | 100% | 47h ago | 2026-02-19 18:32:33Z |

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
Generated: 2026-02-21T17:52:50Z
Git SHA: 576037a7eabd9e0231ffa752a97a2e3b1a22cec9
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
