#!/usr/bin/env node
/**
 * audit_flow_edges.mjs
 *
 * Validates that public/diagram.nodes.json and public/diagram.connections.json
 * satisfy every required flow edge in config/architecture_flow.json, and that
 * nodes in exceptions.must_be_disconnected have no inbound data-flow edges.
 *
 * Exit 0 = pass, Exit 1 = drift detected.
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`FAIL: Cannot read ${label} at`, filePath);
    console.error(e.message);
    process.exit(1);
  }
}

// ── Load inputs ─────────────────────────────────────
const spec = readJson(resolve(ROOT, 'config/architecture_flow.json'), 'architecture spec');
const nodes = readJson(resolve(ROOT, 'public/diagram.nodes.json'), 'diagram nodes JSON');
const connections = readJson(resolve(ROOT, 'public/diagram.connections.json'), 'diagram connections JSON');

if (!Array.isArray(nodes)) {
  console.error('FAIL: diagram.nodes.json must be an array');
  process.exit(1);
}
if (!Array.isArray(connections)) {
  console.error('FAIL: diagram.connections.json must be an array');
  process.exit(1);
}

const nodeIds = new Set(nodes.map((node) => node && node.id));

const connectionKeys = new Set();
for (const connection of connections) {
  if (!connection || !connection.from || !connection.to) continue;
  connectionKeys.add(`${connection.from}→${connection.to}`);
}

// ── Canonicalize helper ───────────────────────────
const aliases = spec.aliases || {};
function canon(id) {
  return aliases[id] || id;
}

// ── Audit ────────────────────────────────────────
let failures = [];

const requiredEdges = spec.required_flow_edges || [];
for (let i = 0; i < requiredEdges.length; i++) {
  const edge = requiredEdges[i];
  const from = canon(edge.from);
  const to = canon(edge.to);
  const key = `${from}→${to}`;
  const edgeLabel = `Edge #${edge.id || (i + 1)} (${edge.from || edge.id || from}->${edge.to || to})`;

  if (!nodeIds.has(from)) {
    failures.push(`${edgeLabel}: source node "${from}" not found in diagram.nodes.json`);
    continue;
  }
  if (!nodeIds.has(to)) {
    failures.push(`${edgeLabel}: target node "${to}" not found in diagram.nodes.json`);
    continue;
  }

  if (!connectionKeys.has(key)) {
    failures.push(`${edgeLabel}: no connection from "${from}" to "${to}"`);
    continue;
  }
}

const disconnected = (spec.exceptions && spec.exceptions.must_be_disconnected) || [];
for (const nodeId of disconnected) {
  const canonicalNode = canon(nodeId);
  for (const connection of connections) {
    if (!connection || connection.type !== 'data-flow') continue;
    if (connection.to === canonicalNode) {
      failures.push(
        `"${canonicalNode}" must be disconnected but has inbound data-flow from "${connection.from}"`
      );
    }
  }
}

console.log('Architecture Flow Audit');
console.log('=======================');
console.log('Spec: ' + requiredEdges.length + ' required edges, ' + disconnected.length + ' must-disconnect nodes');
console.log('Diagram: ' + nodes.length + ' nodes, ' + connections.length + ' connections');
console.log();

if (failures.length === 0) {
  console.log('PASS: All required flow edges present. No drift detected.');
  process.exit(0);
}

console.log('FAIL: ' + failures.length + ' issue(s) found:\n');
for (const failure of failures) {
  console.log('  - ' + failure);
}
console.log();
process.exit(1);
