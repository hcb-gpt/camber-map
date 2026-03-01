# VP — Capability Health Report (generated)

## Overall Health

**10 degraded** out of 10 capabilities (coverage: 0%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 0% | 2h ago | 2026-02-27 04:00:03Z |
| WARN | Transcription | chad | 0% | 2h ago | 2026-02-27 04:00:03Z |
| WARN | Segmentation | chad | 0% | 2h ago | 2026-02-27 04:00:10Z |
| WARN | Context Assembly | chad | 0% | 2h ago | 2026-02-27 04:00:21Z |
| WARN | Project Attribution | chad | 0% | 2h ago | 2026-02-27 04:00:21Z |
| WARN | Knowledge Extraction | chad | 0% | 26h ago | 2026-02-26 04:01:26Z |
| WARN | Call Summarization | chad | 0% | 26h ago | 2026-02-26 04:01:46Z |
| WARN | Signal Detection | chad | 0% | 26h ago | 2026-02-26 04:01:46Z |
| WARN | Journal Consolidation | chad | 0% | 25h ago | 2026-02-26 04:45:37Z |
| WARN | Embedding & Search | chad | 0% | 26h ago | 2026-02-26 04:01:26Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation
- **WARN** Segmentation — blocks: context-assembly, summarization
- **WARN** Context Assembly — blocks: attribution
- **WARN** Project Attribution — blocks: journal
- **WARN** Knowledge Extraction — blocks: signal-detection, consolidation, embedding
- **WARN** Call Summarization — no downstream dependents
- **WARN** Signal Detection — no downstream dependents
- **WARN** Journal Consolidation — no downstream dependents
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
Generated: 2026-02-27T06:08:50Z
Git SHA: c44f0359999620bd6caf11a5d1c5da49229a2ac5
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
