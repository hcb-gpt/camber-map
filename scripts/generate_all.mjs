#!/usr/bin/env node
/*
One-shot generator:
  1) generate_live_map.mjs -> public/facts.json, public/map.json
  2) render_outputs.mjs    -> public/map.md, public/map.graphml
  3) generate_vp.mjs       -> public/vp.json (+ vp.prev.json backup)
  4) render_vp.mjs         -> public/vp.md, public/changes.json, public/changes.md

Use this as the single build entry.
*/

import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

run('node', ['scripts/generate_live_map.mjs']);
run('node', ['scripts/render_outputs.mjs']);
run('node', ['scripts/generate_vp.mjs']);
run('node', ['scripts/render_vp.mjs']);
