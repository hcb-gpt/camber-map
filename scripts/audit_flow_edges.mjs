#!/usr/bin/env node
/**
 * audit_flow_edges.mjs
 *
 * Validates that index.html's nodes[] and connections[] satisfy every required
 * flow edge in config/architecture_flow.json, and that must_be_disconnected
 * nodes have no inbound data-flow connections.
 *
 * Exit 0 = pass, Exit 1 = drift detected.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load architecture spec ──────────────────────────
const specPath = resolve(ROOT, 'config/architecture_flow.json');
let spec;
try {
  spec = JSON.parse(readFileSync(specPath, 'utf-8'));
} catch (e) {
  console.error('FAIL: Cannot read architecture spec at', specPath);
  console.error(e.message);
  process.exit(1);
}

// ── Parse index.html ────────────────────────────────
const htmlPath = resolve(ROOT, 'index.html');
let html;
try {
  html = readFileSync(htmlPath, 'utf-8');
} catch (e) {
  console.error('FAIL: Cannot read index.html at', htmlPath);
  process.exit(1);
}

/**
 * Bracket-depth state machine to extract a JS array literal from the source.
 * Finds `var <name> = [` and reads until the matching `]`.
 */
function extractArray(src, varName) {
  const marker = new RegExp('var\\s+' + varName + '\\s*=\\s*\\[');
  const match = marker.exec(src);
  if (!match) return null;

  let depth = 0;
  let start = match.index + match[0].length - 1; // position of '['
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = start; i < src.length; i++) {
    const ch = src[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }

    if (inString) {
      if (ch === stringChar) inString = false;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        return src.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Parse a JS object-literal array (with single-quoted keys, unquoted keys,
 * trailing commas) into JSON-parseable form.
 */
function jsArrayToJSON(raw) {
  let s = raw;
  // Remove single-line comments
  s = s.replace(/\/\/[^\n]*/g, '');
  // Remove multi-line comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  // Replace single quotes with double quotes
  s = s.replace(/'/g, '"');
  // Add quotes around unquoted keys: { key: ... } -> { "key": ... }
  s = s.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
  // Remove trailing commas before ] or }
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

// ── Extract nodes and connections ───────────────────
const nodesRaw = extractArray(html, 'nodes');
const connsRaw = extractArray(html, 'connections');

if (!nodesRaw) {
  console.error('FAIL: Could not extract nodes[] from index.html');
  process.exit(1);
}
if (!connsRaw) {
  console.error('FAIL: Could not extract connections[] from index.html');
  process.exit(1);
}

let nodesParsed, connsParsed;
try {
  nodesParsed = JSON.parse(jsArrayToJSON(nodesRaw));
} catch (e) {
  console.error('FAIL: Could not parse nodes[] as JSON');
  console.error('Parse error:', e.message);
  process.exit(1);
}
try {
  connsParsed = JSON.parse(jsArrayToJSON(connsRaw));
} catch (e) {
  console.error('FAIL: Could not parse connections[] as JSON');
  console.error('Parse error:', e.message);
  process.exit(1);
}

const nodeIds = new Set(nodesParsed.map(n => n.id));
const connSet = new Set(connsParsed.map(c => c.from + '\u2192' + c.to));
const dataFlowConns = new Set(
  connsParsed.filter(c => c.type === 'data-flow').map(c => c.from + '\u2192' + c.to)
);

// ── Canonicalize helper ─────────────────────────────
const aliases = spec.aliases || {};
function canon(id) { return aliases[id] || id; }

// ── Audit ───────────────────────────────────────────
let failures = [];

// Check required flow edges
const requiredEdges = spec.required_flow_edges || [];
for (const edge of requiredEdges) {
  const from = canon(edge.from);
  const to = canon(edge.to);
  const key = from + '\u2192' + to;

  if (!nodeIds.has(from)) {
    failures.push('Edge #' + edge.id + ' (' + key + '): source node "' + from + '" not found in nodes[]');
    continue;
  }
  if (!nodeIds.has(to)) {
    failures.push('Edge #' + edge.id + ' (' + key + '): target node "' + to + '" not found in nodes[]');
    continue;
  }
  if (!connSet.has(key)) {
    failures.push('Edge #' + edge.id + ' (' + key + '): no connection found in connections[]');
  }
}

// Check must_be_disconnected
const disconnected = (spec.exceptions && spec.exceptions.must_be_disconnected) || [];
for (const nodeId of disconnected) {
  const cid = canon(nodeId);
  const inbound = connsParsed.filter(c => c.to === cid && c.type === 'data-flow');
  if (inbound.length > 0) {
    for (const c of inbound) {
      failures.push('"' + cid + '" must be disconnected but has inbound data-flow from "' + c.from + '"');
    }
  }
}

// ── Report ──────────────────────────────────────────
console.log('Architecture Flow Audit');
console.log('=======================');
console.log('Spec: ' + requiredEdges.length + ' required edges, ' + disconnected.length + ' must-disconnect nodes');
console.log('HTML: ' + nodesParsed.length + ' nodes, ' + connsParsed.length + ' connections');
console.log();

if (failures.length === 0) {
  console.log('PASS: All required flow edges present. No drift detected.');
  process.exit(0);
} else {
  console.log('FAIL: ' + failures.length + ' issue(s) found:\n');
  for (const f of failures) {
    console.log('  - ' + f);
  }
  console.log();
  process.exit(1);
}
