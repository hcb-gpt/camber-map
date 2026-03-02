# VP — Capability Health Report (generated)

## Overall Health

**10 healthy** out of 10 capabilities (coverage: 100%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 18m ago | 2026-03-02 04:00:07Z |
| OK | Transcription | chad | 100% | 18m ago | 2026-03-02 04:00:07Z |
| OK | Segmentation | chad | 100% | 18m ago | 2026-03-02 04:00:14Z |
| OK | Context Assembly | chad | 100% | 18m ago | 2026-03-02 04:00:26Z |
| OK | Project Attribution | chad | 100% | 18m ago | 2026-03-02 04:00:26Z |
| OK | Knowledge Extraction | chad | 100% | 4h ago | 2026-03-02 00:41:23Z |
| OK | Call Summarization | chad | 100% | 4h ago | 2026-03-02 00:00:33Z |
| OK | Signal Detection | chad | 100% | 4h ago | 2026-03-02 00:42:19Z |
| OK | Journal Consolidation | chad | 100% | 0m ago | 2026-03-02 04:15:14Z |
| OK | Embedding & Search | chad | 100% | 4h ago | 2026-03-02 00:41:23Z |

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
Generated: 2026-03-02T04:17:59Z
Git SHA: unknown
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
