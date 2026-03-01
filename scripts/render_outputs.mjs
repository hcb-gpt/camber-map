#!/usr/bin/env node
/*
Reads public/map.json and public/facts.json and emits:
  - public/map.md (human readable)
  - public/map.graphml (machine readable for graph tools)

No UI inline data required; UI should fetch map.json.
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

function summarize(map, facts) {
  const byKind = new Map();
  for (const n of map.nodes) byKind.set(n.kind, (byKind.get(n.kind) || 0) + 1);

  const edgeTypes = new Map();
  for (const e of map.edges) edgeTypes.set(e.type, (edgeTypes.get(e.type) || 0) + 1);

  const topKinds = [...byKind.entries()].sort((a,b)=>b[1]-a[1]);
  const topEdgeTypes = [...edgeTypes.entries()].sort((a,b)=>b[1]-a[1]);

  return { topKinds, topEdgeTypes };
}

function toMarkdown(map, facts) {
  const { topKinds, topEdgeTypes } = summarize(map, facts);

  const lines = [];
  lines.push(`# Camber Map (generated)`);
  lines.push('');
  lines.push(`Updated: ${facts.updated_at}`);
  lines.push(`Mode: ${facts.mode}`);
  lines.push(`Git: ${facts.git_sha}`);
  lines.push('');

  if (facts.db) {
    lines.push('## Live DB facts');
    lines.push(`- Applied migrations: ${facts.db.applied_migrations}`);
    lines.push(`- Tables: ${facts.db.tables}`);
    lines.push(`- Views: ${facts.db.views}`);
    lines.push(`- Functions: ${facts.db.functions}`);
    lines.push(`- Extensions: ${facts.db.extensions}`);
    lines.push('');
  }

  if (facts.edge_functions) {
    lines.push('## Edge Functions');
    lines.push(`- Deployed: ${facts.edge_functions.count}`);
    lines.push('');
  }

  lines.push('## Graph summary');
  lines.push(`- Nodes: ${map.nodes.length}`);
  lines.push(`- Edges: ${map.edges.length}`);
  lines.push('');

  lines.push('### Node kinds');
  for (const [k, c] of topKinds) lines.push(`- ${k}: ${c}`);
  lines.push('');

  lines.push('### Edge types');
  for (const [t, c] of topEdgeTypes) lines.push(`- ${t}: ${c}`);
  lines.push('');

  lines.push('## Notes');
  lines.push('- This file is generated. Do not edit.');
  lines.push('- Canonical source: public/map.json');

  return lines.join('\n') + '\n';
}

function toGraphML(map) {
  // Minimal GraphML with labels.
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<graphml xmlns="http://graphml.graphdrawing.org/xmlns"`);
  lines.push(`  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`);
  lines.push(`  xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">`);
  lines.push(`  <key id="d0" for="node" attr.name="label" attr.type="string"/>`);
  lines.push(`  <key id="d1" for="node" attr.name="kind" attr.type="string"/>`);
  lines.push(`  <key id="d2" for="edge" attr.name="type" attr.type="string"/>`);
  lines.push(`  <graph id="G" edgedefault="directed">`);

  for (const n of map.nodes) {
    lines.push(`    <node id="${escXml(n.id)}">`);
    lines.push(`      <data key="d0">${escXml(n.title || n.id)}</data>`);
    lines.push(`      <data key="d1">${escXml(n.kind)}</data>`);
    lines.push(`    </node>`);
  }

  let i = 0;
  for (const e of map.edges) {
    lines.push(`    <edge id="e${i++}" source="${escXml(e.from)}" target="${escXml(e.to)}">`);
    lines.push(`      <data key="d2">${escXml(e.type)}</data>`);
    lines.push(`    </edge>`);
  }

  lines.push(`  </graph>`);
  lines.push(`</graphml>`);
  return lines.join('\n') + '\n';
}

async function main() {
  const factsPath = path.join(ROOT, 'public', 'facts.json');
  const mapPath = path.join(ROOT, 'public', 'map.json');

  const facts = await readJson(factsPath);
  const map = await readJson(mapPath);

  await fs.writeFile(path.join(ROOT, 'public', 'map.md'), toMarkdown(map, facts));
  await fs.writeFile(path.join(ROOT, 'public', 'map.graphml'), toGraphML(map));

  console.log('Wrote public/map.md and public/map.graphml');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
