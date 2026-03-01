# Acceptance Proof Gate

Purpose: reduce release uncertainty by producing reproducible, file-backed evidence for major lane visibility in both Flow and Plain modes.

## Run

```bash
cd /Users/chadbarlow/gh/hcb-gpt/camber-map
npm run proof:acceptance
```

Equivalent:

```bash
node scripts/acceptance_proof_after_patch.mjs --strict
```

## Pass/Fail Contract

- Exit code `0`: all lanes pass in both modes.
- Exit code `2`: one or more lanes fail (strict gate failure).
- Exit code `1`: script/runtime error.

Console includes:

- `GATE_RESULT PASS|FAIL`
- per-lane lines (`LANE <id> FLOW=... PLAIN=... OVERALL=...`)
- artifact paths for the report and snapshots.
- before/after delta counters (`DELTA_LANE_CHANGES`, `DELTA_RENDER_CHANGES`, `DELTA_INPUT_HASH_CHANGES`)
- decision lines mapping metrics to actions (`DECISION metric=... value=... action=...`)

## Evidence Artifacts

Each run writes:

- `test-results/acceptance-proof-<timestamp>/acceptance_report.json`
- `test-results/acceptance-proof-<timestamp>/acceptance_report.md`
- `test-results/acceptance-proof-<timestamp>/acceptance_delta.md`
- `test-results/acceptance-proof-<timestamp>/flow_view_snapshot.txt`
- `test-results/acceptance-proof-<timestamp>/plain_view_snapshot.txt`

Latest-run pointer:

- `test-results/acceptance-proof-latest.txt`

## Reproducibility Metadata

`acceptance_report.json` includes:

- strict gate mode (`execution.strict`)
- deterministic rerun command (`rerun.command`)
- input file SHA-256 fingerprints (`input_fingerprints`)
- explicit failing lane IDs (`failed_lane_ids`)
- comparison-to-previous metadata (`comparison_to_previous`) for clear before/after review
- metric-to-action guidance (`decision_signals`) so each number implies a reliability/UX decision
