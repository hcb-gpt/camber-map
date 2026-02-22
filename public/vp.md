# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 0m ago | 2026-02-22 18:20:32Z |
| OK | Transcription | chad | 100% | 0m ago | 2026-02-22 18:20:32Z |
| OK | Segmentation | chad | 100% | 0m ago | 2026-02-22 18:20:36Z |
| OK | Context Assembly | chad | 100% | 0m ago | 2026-02-22 18:21:00Z |
| OK | Project Attribution | chad | 100% | 0m ago | 2026-02-22 18:21:00Z |
| OK | Knowledge Extraction | chad | 100% | 0m ago | 2026-02-22 18:20:52Z |
| OK | Call Summarization | chad | 100% | 0m ago | 2026-02-22 18:21:09Z |
| OK | Signal Detection | chad | 100% | 0m ago | 2026-02-22 18:21:08Z |
| OK | Journal Consolidation | chad | 100% | 0m ago | 2026-02-22 18:21:06Z |
| OK | Embedding & Search | chad | 100% | 11h ago | 2026-02-22 07:25:24Z |

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
Generated: 2026-02-22T18:21:40Z
Git SHA: eedc09ecb5748f0cb8258e5e79f92d9a0da58dde
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
