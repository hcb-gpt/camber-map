# VP — Capability Health Report (generated)

## Overall Health

**6 healthy, 4 unknown** out of 10 capabilities (coverage: 60%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 36m ago | 2026-02-19 18:32:33Z |
| OK | Transcription | chad | 100% | 36m ago | 2026-02-19 18:32:33Z |
| OK | Segmentation | chad | 100% | 36m ago | 2026-02-19 18:32:33Z |
| ??? | Context Assembly | chad | 0% | n/a | n/a |
| OK | Project Attribution | chad | 100% | 36m ago | 2026-02-19 18:32:33Z |
| OK | Knowledge Extraction | chad | 100% | 36m ago | 2026-02-19 18:32:33Z |
| ??? | Call Summarization | chad | 0% | n/a | n/a |
| ??? | Signal Detection | chad | 0% | n/a | n/a |
| ??? | Journal Consolidation | chad | 0% | n/a | n/a |
| OK | Embedding & Search | chad | 100% | 36m ago | 2026-02-19 18:32:33Z |

## Bottlenecks

No degraded or stale capabilities detected.

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
Generated: 2026-02-19T19:11:09Z
Git SHA: 12c0c9be3f60aecb82fdd8f5b56efde0b5485748
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
