#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const nodesPath = path.join(repoRoot, "public", "diagram.nodes.json");
const connectionsPath = path.join(repoRoot, "public", "diagram.connections.json");

const requiredNodes = [
  "sms-openphone-sync",
  "zapier-sms-ingest",
  "cost-code-taxonomy",
  "vendor-cost-code-summary",
  "journal-promote",
  "timeline-append",
];

const requiredEdges = [
  { from: "openphone", to: "sms-openphone-sync", label: "sms thread sync" },
  { from: "sms-openphone-sync", to: "zapier-sms-ingest", label: "sms payload forward" },
  { from: "zapier", to: "zapier-sms-ingest", label: "sms webhook POST" },
  { from: "zapier-sms-ingest", to: "db-core", label: "sms_messages write" },
  { from: "claim-guard", to: "cost-code-taxonomy", label: "taxonomy validation read" },
  { from: "cost-code-taxonomy", to: "vendor-cost-code-summary", label: "vendor rollup source" },
  { from: "vendor-cost-code-summary", to: "claim-guard", label: "finance preflight evidence" },
  { from: "journal-consolidate", to: "journal-promote", label: "promotion trigger" },
  { from: "journal-promote", to: "world-model", label: "belief_claims + claim_pointers" },
  { from: "journal-promote", to: "db-review", label: "journal_review_queue writes" },
  { from: "process-call", to: "timeline-append", label: "timeline append" },
  { from: "timeline-append", to: "db-core", label: "project_timeline_events write" },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const nodes = readJson(nodesPath);
const connections = readJson(connectionsPath);

const nodeResults = requiredNodes.map((id) => ({
  id,
  present: nodes.some((n) => n.id === id),
}));

const edgeResults = requiredEdges.map((edge) => ({
  ...edge,
  present: connections.some(
    (e) => e.from === edge.from && e.to === edge.to && (e.label ?? "") === edge.label,
  ),
}));

const missingNodes = nodeResults.filter((r) => !r.present);
const missingEdges = edgeResults.filter((r) => !r.present);
const pass = missingNodes.length === 0 && missingEdges.length === 0;

const now = new Date().toISOString();
const lines = [];
lines.push("# Flow Gap Closure Proof");
lines.push("");
lines.push(`Generated UTC: ${now}`);
lines.push(`Nodes file: ${nodesPath}`);
lines.push(`Connections file: ${connectionsPath}`);
lines.push("");
lines.push("## Nodes");
for (const r of nodeResults) {
  lines.push(`- ${r.id}: ${r.present ? "PASS" : "FAIL"}`);
}
lines.push("");
lines.push("## Edges");
for (const r of edgeResults) {
  lines.push(`- ${r.from} -> ${r.to} (${r.label}): ${r.present ? "PASS" : "FAIL"}`);
}
lines.push("");
lines.push(`OVERALL: ${pass ? "PASS" : "FAIL"}`);

console.log(lines.join("\n"));

if (!pass) {
  process.exitCode = 1;
}
