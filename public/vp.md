# VP — Capability Health Report (generated)

## Overall Health

**10 degraded** out of 10 capabilities (coverage: 0%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 0% | 43h ago | 2026-02-24 01:27:11Z |
| WARN | Transcription | chad | 0% | 43h ago | 2026-02-24 01:27:11Z |
| WARN | Segmentation | chad | 0% | 23h ago | 2026-02-24 21:25:52Z |
| WARN | Context Assembly | chad | 0% | 22h ago | 2026-02-24 22:02:56Z |
| WARN | Project Attribution | chad | 0% | 22h ago | 2026-02-24 22:02:56Z |
| WARN | Knowledge Extraction | chad | 0% | 22h ago | 2026-02-24 21:59:10Z |
| WARN | Call Summarization | chad | 0% | 3d ago | 2026-02-23 02:49:35Z |
| WARN | Signal Detection | chad | 0% | 3d ago | 2026-02-23 03:26:57Z |
| WARN | Journal Consolidation | chad | 0% | 12m ago | 2026-02-25 19:45:30Z |
| WARN | Embedding & Search | chad | 0% | 22h ago | 2026-02-24 21:59:10Z |

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
Generated: 2026-02-25T19:56:25Z
Git SHA: 0f8476a966bbcc34afcd11bf37c0b819dc101d57
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
