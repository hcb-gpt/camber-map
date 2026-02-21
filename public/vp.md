# VP — Capability Health Report (generated)

## Overall Health

**3 healthy, 4 degraded, 3 unknown** out of 10 capabilities (coverage: 60%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| WARN | Call Ingestion | chad | 100% | 31h ago | 2026-02-19 18:32:33Z |
| WARN | Transcription | chad | 100% | 31h ago | 2026-02-19 18:32:33Z |
| OK | Segmentation | chad | 100% | 4h ago | 2026-02-20 21:19:24Z |
| ??? | Context Assembly | chad | 0% | n/a | n/a |
| OK | Project Attribution | chad | 100% | 4h ago | 2026-02-20 21:19:32Z |
| OK | Knowledge Extraction | chad | 100% | 6h ago | 2026-02-20 19:23:01Z |
| ??? | Call Summarization | chad | 0% | n/a | n/a |
| WARN | Signal Detection | chad | 0% | 4h ago | 2026-02-20 21:19:37Z |
| ??? | Journal Consolidation | chad | 0% | n/a | n/a |
| WARN | Embedding & Search | chad | 100% | 31h ago | 2026-02-19 18:32:33Z |

## Bottlenecks

- **WARN** Call Ingestion — blocks: transcription
- **WARN** Transcription — blocks: segmentation
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
Generated: 2026-02-21T01:39:10Z
Git SHA: 27ea28b8787d7e1903d119cfca01f1ad82109c92
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
