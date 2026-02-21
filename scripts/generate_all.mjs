#!/usr/bin/env node
/*
One-shot generator:
  1) generate_live_map.mjs -> public/facts.json, public/map.json
  2) render_outputs.mjs    -> public/map.md, public/map.graphml
  3) generate_vp.mjs       -> public/vp.json (+ vp.prev.json backup)
  4) render_vp.mjs         -> public/vp.md, public/changes.json, public/changes.md

Use this as the single build entry.

Mode behavior:
  - If DATABASE_URL is present, defaults to LIVE_MODE=live.
  - If DATABASE_URL is absent, defaults to LIVE_MODE=repo.
  - Set LIVE_MODE explicitly to override.
*/

import { spawnSync } from 'node:child_process';

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const liveMode = (process.env.LIVE_MODE || (hasDatabaseUrl ? 'live' : 'repo')).toLowerCase();

run('node', ['scripts/generate_live_map.mjs'], { LIVE_MODE: liveMode });
run('node', ['scripts/render_outputs.mjs']);

if (hasDatabaseUrl && liveMode !== 'repo') {
  run('node', ['scripts/generate_vp.mjs']);
  run('node', ['scripts/render_vp.mjs']);
} else {
  console.log('Skipping VP generation/render: DATABASE_URL missing or LIVE_MODE=repo.');
}
