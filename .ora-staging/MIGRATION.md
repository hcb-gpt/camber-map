# Camber-Map Ora Monorepo Migration Guide

## Pre-import cleanup (in ora repo, after `git subtree add`)

Delete the original workflows from the imported subtree — they don't run
from `apps/` and their presence would leak into the mirror via subtree split:

```bash
git rm -r apps/camber-map/.github/workflows/
git commit -m "chore: remove camber-map workflows (replaced by ora-root)"
```

## Install ora-root workflows

Copy the two workflow files to the ora repo root:

```bash
cp .ora-staging/workflows/camber-map-smoke.yml         .github/workflows/
cp .ora-staging/workflows/camber-map-build-and-mirror.yml .github/workflows/
```

## Required secrets (ora repo settings)

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Supabase connection for map generation |
| `SUPABASE_PROJECT_REF` | Supabase project ref |
| `SUPABASE_ACCESS_TOKEN` | Supabase access token |
| `MIRROR_PUSH_TOKEN` | PAT with `repo` scope for pushing to `hcb-gpt/camber-map` |

## How mirror publish works

1. Build job generates `apps/camber-map/public/*` artifacts and commits to ora
2. `git subtree split --prefix=apps/camber-map` extracts camber-map as standalone
3. `.github/workflows/` is stripped from the split (prevents self-mutating mirror)
4. Force push (with lease) to `hcb-gpt/camber-map` main branch

## Critical invariant

Orbit MCP map loader reads from `hcb-gpt/camber-map/public/*` via GitHub API.
Do NOT change `CAMBER_MAP_REPO` env var — keep it pointed at the public mirror.

## Verification checklist

- [ ] `ora/.github/workflows/camber-map-smoke.yml` triggers on PR touching `apps/camber-map/`
- [ ] `ora/.github/workflows/camber-map-build-and-mirror.yml` runs daily + on push
- [ ] Mirror at `hcb-gpt/camber-map` has NO `.github/workflows/` directory
- [ ] `camber_map_facts(force_refresh=true)` still returns data (MCP loader works)
