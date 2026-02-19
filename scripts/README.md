# Build scripts

## generate_live_map.mjs

Generates the entire map and facts from live product signals.

### Outputs
- `public/facts.json`
- `public/map.json`

### Required env (live mode)
- `DATABASE_URL`

### Optional env (edge function inventory)
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`

### Run
```bash
npm ci
npm run generate:live
```

Repo-only (no DB) mode will generate an empty DB map but still produce files:
```bash
npm ci
npm run generate:live:repo
```
