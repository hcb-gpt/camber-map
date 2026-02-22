# VP — Capability Health Report (generated)

## Overall Health

**9 healthy, 1 stale** out of 10 capabilities (coverage: 90%)

## Capabilities

| Status | Capability | Owner | Coverage | Staleness | Last Activity |
|--------|------------|-------|----------|-----------|---------------|
| OK | Call Ingestion | chad | 100% | 7h ago | 2026-02-21 23:23:34Z |
| OK | Transcription | chad | 100% | 9h ago | 2026-02-21 21:11:06Z |
| OK | Segmentation | chad | 100% | 7h ago | 2026-02-21 23:23:40Z |
| OK | Context Assembly | chad | 100% | 7h ago | 2026-02-21 23:23:59Z |
| OK | Project Attribution | chad | 100% | 7h ago | 2026-02-21 23:23:59Z |
| OK | Knowledge Extraction | chad | 100% | 7h ago | 2026-02-21 23:23:53Z |
| OK | Call Summarization | chad | 100% | 7h ago | 2026-02-21 23:24:07Z |
| OK | Signal Detection | chad | 100% | 7h ago | 2026-02-21 23:24:06Z |
| OK | Journal Consolidation | chad | 100% | 9h ago | 2026-02-21 21:10:59Z |
| ALERT | Embedding & Search | chad | 0% | 4d ago | 2026-02-18 00:50:12Z |

## Bottlenecks

- **ALERT** Embedding & Search — blocks: context-assembly

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
Generated: 2026-02-22T06:07:11Z
Git SHA: 1c2aaf0575f9d9d2dee7e4db7b2f5c39e10425f8
**Do not edit** — regenerate with `node scripts/render_vp.mjs`
