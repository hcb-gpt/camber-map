#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CONFIG_DIR = path.join(ROOT, 'config');
const OUT_BASE = path.join(ROOT, 'test-results');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function parseArgs(argv) {
  const opts = {
    strict: true,
    outDir: null,
    printJson: false,
  };
  for (const arg of argv) {
    if (arg === '--strict') opts.strict = true;
    else if (arg === '--no-strict') opts.strict = false;
    else if (arg === '--print-json') opts.printJson = true;
    else if (arg.startsWith('--out-dir=')) opts.outDir = arg.slice('--out-dir='.length);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const outDir = opts.outDir
  ? path.resolve(opts.outDir)
  : path.join(OUT_BASE, `acceptance-proof-${stamp}`);

const laneDefinitions = [
  {
    id: 'sms_ingestion',
    label: 'SMS ingestion',
    mapKeywords: ['sms', 'openphone', 'zapier'],
    mapRequiredIds: ['table:public.openphone_threads', 'view:public.v_calls_raw_zapier_lineage'],
    checks: [
      { kind: 'nodeAny', min: 3, ids: ['openphone', 'sms-openphone-sync', 'zapier-sms-ingest', 'db-core'] },
      { kind: 'edgeAny', min: 2, edges: [['openphone', 'sms-openphone-sync'], ['sms-openphone-sync', 'zapier-sms-ingest'], ['zapier-sms-ingest', 'db-core']] },
      { kind: 'edgeLabelRegex', min: 1, regex: 'sms' },
    ],
  },
  {
    id: 'brief_scheduler',
    label: 'Brief / scheduler',
    mapKeywords: ['brief', 'scheduler'],
    checks: [
      { kind: 'nodeAny', min: 1, ids: ['generate-summary', 'morning-digest', 'db-core'] },
      { kind: 'edgeLabelRegex', min: 1, regex: 'scheduler' },
    ],
  },
  {
    id: 'finance_cost_code',
    label: 'Finance / cost-code',
    mapKeywords: ['finance', 'cost_code', 'cost code', 'cost-code'],
    mapRequiredIds: ['matview:public.vendor_cost_code_summary', 'table:public.cost_code_taxonomy'],
    checks: [
      { kind: 'nodeAny', min: 2, ids: ['claim-guard', 'cost-code-taxonomy', 'vendor-cost-code-summary'] },
      { kind: 'edgeAny', min: 2, edges: [['process-call', 'claim-guard'], ['claim-guard', 'cost-code-taxonomy'], ['cost-code-taxonomy', 'vendor-cost-code-summary']] },
      { kind: 'edgeLabelRegex', min: 1, regex: 'cost|finance|financial|taxonomy|vendor' },
    ],
  },
  {
    id: 'belief_journal_promotion',
    label: 'Belief / journal promotion',
    mapKeywords: ['belief', 'journal', 'promote_journal_claims_to_belief'],
    checks: [
      { kind: 'nodeAny', min: 2, ids: ['journal-extract', 'journal-consolidate', 'db-journal'] },
      { kind: 'edgeAny', min: 1, edges: [['journal-extract', 'journal-consolidate']] },
    ],
  },
  {
    id: 'timeline_events',
    label: 'Timeline / events',
    mapKeywords: ['timeline', 'event'],
    checks: [
      { kind: 'nodeAny', min: 1, ids: ['db-pipeline-aux', 'db-review', 'morning-digest'] },
      { kind: 'edgeLabelRegex', min: 1, regex: 'event' },
    ],
  },
  {
    id: 'review_queue',
    label: 'Review queue',
    mapKeywords: ['review_queue', 'review'],
    checks: [
      { kind: 'nodeAny', min: 2, ids: ['review-triage', 'review-resolve', 'db-review'] },
      { kind: 'edgeAny', min: 1, edges: [['ai-router', 'review-triage'], ['ai-router', 'db-review'], ['review-resolve', 'db-review']] },
    ],
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256ForFile(filePath) {
  const hasher = crypto.createHash('sha256');
  hasher.update(fs.readFileSync(filePath));
  return hasher.digest('hex');
}

function uniqueStrings(values) {
  return Array.from(new Set(values)).sort();
}

function parseQuotedStringList(src) {
  return Array.from(src.matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

async function parseFlowViewConfig(configJsPath) {
  const mod = await import(pathToFileURL(configJsPath).href);
  const flow = mod && mod.VIEW_MODES && mod.VIEW_MODES.flow ? mod.VIEW_MODES.flow : null;
  if (!flow) throw new Error('Unable to load VIEW_MODES.flow from src/config.js');

  const hideNodes = new Set(Array.isArray(flow.hideNodes) ? flow.hideNodes : []);
  const layers = new Set(Array.isArray(flow.layers) ? flow.layers : ['pipeline', 'data']);
  const forceVisibleNodes = new Set(Array.isArray(mod.FLOW_PARITY_NODE_ALLOWLIST) ? mod.FLOW_PARITY_NODE_ALLOWLIST : []);

  return { hideNodes, layers, forceVisibleNodes };
}

function mapCoverageForLane(mapJson, lane) {
  const keywords = lane.mapKeywords.map((k) => k.toLowerCase());
  const hits = (mapJson.nodes || []).filter((n) => {
    const blob = `${n.id || ''} ${n.name || ''} ${n.title || ''}`.toLowerCase();
    return keywords.some((k) => blob.includes(k));
  });
  return {
    map_nodes_matched_count: hits.length,
    map_nodes_sample: hits.slice(0, 8).map((n) => n.id),
  };
}

function evaluateMapRequirements(mapJson, lane) {
  const requiredIds = lane.mapRequiredIds || [];
  if (requiredIds.length === 0) {
    return { pass: true, found: [], missing: [] };
  }
  const nodeIds = new Set((mapJson.nodes || []).map((n) => n.id));
  const found = requiredIds.filter((id) => nodeIds.has(id));
  const missing = requiredIds.filter((id) => !nodeIds.has(id));
  return {
    pass: missing.length === 0,
    found: uniqueStrings(found),
    missing: uniqueStrings(missing),
  };
}

function evaluateCheck(modeData, check) {
  if (check.kind === 'nodeAny') {
    const present = check.ids.filter((id) => modeData.nodeIds.includes(id));
    return {
      pass: present.length >= check.min,
      detail: `nodeAny min=${check.min} present=${present.length}`,
      present,
      missing: check.ids.filter((id) => !present.includes(id)),
    };
  }
  if (check.kind === 'edgeAny') {
    const present = check.edges
      .filter(([from, to]) => modeData.edgeKeys.has(`${from}→${to}`))
      .map(([from, to]) => `${from}→${to}`);
    return {
      pass: present.length >= check.min,
      detail: `edgeAny min=${check.min} present=${present.length}`,
      present,
      missing: check.edges
        .map(([from, to]) => `${from}→${to}`)
        .filter((k) => !present.includes(k)),
    };
  }
  if (check.kind === 'edgeLabelRegex') {
    const re = new RegExp(check.regex, 'i');
    const present = modeData.edgeLabels
      .filter((e) => re.test(e.label || ''))
      .map((e) => `${e.from}→${e.to}:${e.label}`);
    return {
      pass: present.length >= check.min,
      detail: `edgeLabelRegex /${check.regex}/ min=${check.min} present=${present.length}`,
      present,
      missing: [`label~/${check.regex}/`],
    };
  }
  return {
    pass: false,
    detail: `unknown check kind ${check.kind}`,
    present: [],
    missing: [],
  };
}

function evaluateLane(modeData, lane) {
  const checks = lane.checks.map((check) => evaluateCheck(modeData, check));
  return {
    pass: checks.every((c) => c.pass),
    evidence: uniqueStrings(checks.flatMap((c) => c.present)),
    missing: uniqueStrings(checks.filter((c) => !c.pass).flatMap((c) => c.missing)),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Acceptance Proof: Flow + Plain (Static Render Audit)');
  lines.push('');
  lines.push(`Generated at UTC: ${report.generated_at_utc}`);
  lines.push(`Overall result: ${report.overall_pass ? 'PASS' : 'FAIL'}`);
  lines.push(`Execution mode: ${report.execution.mode}`);
  lines.push(`Strict gate: ${report.execution.strict ? 'ON' : 'OFF'}`);
  lines.push(`Flow screenshot: ${report.artifacts.flow_screenshot}`);
  lines.push(`Plain screenshot: ${report.artifacts.plain_screenshot}`);
  lines.push('');
  lines.push('## Checklist');
  lines.push('');
  lines.push('| Lane | Flow | Plain | Overall |');
  lines.push('|---|---:|---:|---:|');
  for (const lane of report.lanes) {
    lines.push(`| ${lane.label} | ${lane.flow_pass ? 'PASS' : 'FAIL'} | ${lane.plain_pass ? 'PASS' : 'FAIL'} | ${lane.overall_pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  lines.push('## Fail Report');
  lines.push('');
  const failing = report.lanes.filter((l) => !l.overall_pass);
  if (failing.length === 0) {
    lines.push('No lane failures detected.');
  } else {
    for (const lane of failing) {
      lines.push(`### ${lane.label}`);
      for (const miss of lane.failures) {
        lines.push(`- ${miss.mode}: missing ${miss.missing.join(', ')}`);
      }
      lines.push('');
    }
  }
  lines.push('');
  lines.push('## Before/After Delta');
  lines.push('');
  const delta = report.comparison_to_previous || { has_previous: false, reason: 'missing_delta' };
  if (!delta.has_previous) {
    lines.push(`No previous report comparison available (${delta.reason || 'unknown'}).`);
  } else {
    lines.push(`Previous report: ${delta.previous_report_dir || 'UNKNOWN'}`);
    lines.push(`Previous generated at UTC: ${delta.previous_generated_at_utc || 'UNKNOWN'}`);
    lines.push(`Lane status changes: ${delta.lane_changes_count}`);
    if (delta.lane_changes_count === 0) {
      lines.push('- none');
    } else {
      for (const change of delta.lane_changes) {
        lines.push(`- ${change.id}: ${change.before} -> ${change.after}`);
      }
    }
    lines.push(`Render metric changes: ${delta.render_changes_count}`);
    if (delta.render_changes_count === 0) {
      lines.push('- none');
    } else {
      for (const change of delta.render_changes) {
        lines.push(`- ${change.metric}: ${String(change.before)} -> ${String(change.after)}`);
      }
    }
    lines.push(`Input fingerprint changes: ${delta.input_hash_changes_count}`);
    if (delta.input_hash_changes_count === 0) {
      lines.push('- none');
    } else {
      for (const change of delta.input_hash_changes) {
        lines.push(`- ${change.path}: ${change.before} -> ${change.after}`);
      }
    }
  }
  lines.push('');
  lines.push('## Metric -> Decision');
  lines.push('');
  lines.push('| Metric | Value | Decision | Reliability/UX Impact |');
  lines.push('|---|---:|---|---|');
  for (const signal of report.decision_signals || []) {
    lines.push(`| ${signal.metric} | ${signal.value} | ${signal.decision} | ${signal.impact} |`);
  }
  lines.push('## Notes');
  lines.push(`- ${report.execution.note}`);
  lines.push('');
  lines.push('## Re-run');
  lines.push(`- cwd: ${report.rerun.cwd}`);
  lines.push(`- command: ${report.rerun.command}`);
  lines.push('');
  lines.push('## Input Fingerprints (sha256)');
  for (const input of report.input_fingerprints) {
    lines.push(`- ${input.path}: ${input.sha256}`);
  }
  return lines.join('\n');
}

function writeModeSnapshot(filePath, modeData) {
  const lines = [];
  lines.push(`MODE=${modeData.mode}`);
  lines.push(`NODES=${modeData.nodeIds.length}`);
  lines.push(`EDGES=${modeData.edges.length}`);
  lines.push('');
  lines.push('VISIBLE_NODES');
  lines.push(...modeData.nodeIds.sort());
  lines.push('');
  lines.push('VISIBLE_EDGES');
  for (const edge of modeData.edges) {
    lines.push(`${edge.from}→${edge.to} | ${edge.type} | ${edge.label}`);
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

function formatLaneState(lane) {
  return `FLOW=${lane.flow_pass ? 'PASS' : 'FAIL'} PLAIN=${lane.plain_pass ? 'PASS' : 'FAIL'} OVERALL=${lane.overall_pass ? 'PASS' : 'FAIL'}`;
}

function readPreviousReport(latestPointerPath, currentOutDir) {
  if (!fs.existsSync(latestPointerPath)) {
    return { has_previous: false, reason: 'latest_pointer_missing' };
  }

  const previousDirRaw = fs.readFileSync(latestPointerPath, 'utf8').trim();
  if (!previousDirRaw) {
    return { has_previous: false, reason: 'latest_pointer_empty' };
  }

  const previousDir = path.resolve(previousDirRaw);
  if (previousDir === path.resolve(currentOutDir)) {
    return { has_previous: false, reason: 'latest_pointer_points_to_current', previous_report_dir: previousDir };
  }

  const previousReportPath = path.join(previousDir, 'acceptance_report.json');
  if (!fs.existsSync(previousReportPath)) {
    return { has_previous: false, reason: 'previous_report_missing', previous_report_dir: previousDir };
  }

  try {
    return {
      has_previous: true,
      previous_report_dir: previousDir,
      report: readJson(previousReportPath),
    };
  } catch (err) {
    return {
      has_previous: false,
      reason: 'previous_report_invalid_json',
      previous_report_dir: previousDir,
      error: err && err.message ? err.message : String(err),
    };
  }
}

function buildComparison(previousMeta, currentReport) {
  if (!previousMeta.has_previous) {
    return {
      has_previous: false,
      reason: previousMeta.reason || 'unknown',
      previous_report_dir: previousMeta.previous_report_dir || null,
      previous_generated_at_utc: null,
      lane_changes: [],
      lane_changes_count: 0,
      render_changes: [],
      render_changes_count: 0,
      input_hash_changes: [],
      input_hash_changes_count: 0,
    };
  }

  const previousReport = previousMeta.report || {};
  const previousLanes = new Map((previousReport.lanes || []).map((lane) => [lane.id, lane]));
  const currentLanes = new Map((currentReport.lanes || []).map((lane) => [lane.id, lane]));

  const laneChanges = [];
  for (const lane of currentReport.lanes || []) {
    const previousLane = previousLanes.get(lane.id);
    if (!previousLane) {
      laneChanges.push({
        id: lane.id,
        label: lane.label,
        before: 'MISSING',
        after: formatLaneState(lane),
      });
      continue;
    }
    const beforeState = formatLaneState(previousLane);
    const afterState = formatLaneState(lane);
    if (beforeState !== afterState) {
      laneChanges.push({
        id: lane.id,
        label: lane.label,
        before: beforeState,
        after: afterState,
      });
    }
  }

  for (const previousLane of previousReport.lanes || []) {
    if (!currentLanes.has(previousLane.id)) {
      laneChanges.push({
        id: previousLane.id,
        label: previousLane.label || previousLane.id,
        before: formatLaneState(previousLane),
        after: 'MISSING',
      });
    }
  }

  const previousFlow = previousReport.render_snapshot?.flow || {};
  const previousPlain = previousReport.render_snapshot?.plain || {};
  const currentFlow = currentReport.render_snapshot?.flow || {};
  const currentPlain = currentReport.render_snapshot?.plain || {};
  const renderPairs = [
    ['flow.node_count', previousFlow.node_count, currentFlow.node_count],
    ['flow.edge_count', previousFlow.edge_count, currentFlow.edge_count],
    ['flow.label_count', previousFlow.label_count, currentFlow.label_count],
    ['plain.node_count', previousPlain.node_count, currentPlain.node_count],
    ['plain.edge_count', previousPlain.edge_count, currentPlain.edge_count],
    ['plain.label_count', previousPlain.label_count, currentPlain.label_count],
  ];
  const renderChanges = renderPairs
    .filter(([, before, after]) => before !== after)
    .map(([metric, before, after]) => ({ metric, before, after }));

  const previousInputs = new Map((previousReport.input_fingerprints || []).map((fp) => [fp.path, fp.sha256]));
  const currentInputs = new Map((currentReport.input_fingerprints || []).map((fp) => [fp.path, fp.sha256]));
  const inputPaths = Array.from(new Set([...previousInputs.keys(), ...currentInputs.keys()])).sort();
  const inputHashChanges = inputPaths
    .map((inputPath) => ({
      path: inputPath,
      before: previousInputs.has(inputPath) ? previousInputs.get(inputPath) : 'MISSING',
      after: currentInputs.has(inputPath) ? currentInputs.get(inputPath) : 'MISSING',
    }))
    .filter((item) => item.before !== item.after);

  return {
    has_previous: true,
    reason: null,
    previous_report_dir: previousMeta.previous_report_dir || null,
    previous_generated_at_utc: previousReport.generated_at_utc || null,
    lane_changes: laneChanges,
    lane_changes_count: laneChanges.length,
    render_changes: renderChanges,
    render_changes_count: renderChanges.length,
    input_hash_changes: inputHashChanges,
    input_hash_changes_count: inputHashChanges.length,
  };
}

function renderDeltaMarkdown(delta) {
  const lines = [];
  lines.push('# Acceptance Delta (Before vs After)');
  lines.push('');
  if (!delta.has_previous) {
    lines.push(`No previous report available for comparison (${delta.reason || 'unknown'}).`);
    return lines.join('\n');
  }

  lines.push(`Previous report: ${delta.previous_report_dir || 'UNKNOWN'}`);
  lines.push(`Previous generated at UTC: ${delta.previous_generated_at_utc || 'UNKNOWN'}`);
  lines.push('');

  lines.push('## Lane Changes');
  if (delta.lane_changes_count === 0) {
    lines.push('- none');
  } else {
    for (const change of delta.lane_changes) {
      lines.push(`- ${change.id}: ${change.before} -> ${change.after}`);
    }
  }
  lines.push('');

  lines.push('## Render Changes');
  if (delta.render_changes_count === 0) {
    lines.push('- none');
  } else {
    for (const change of delta.render_changes) {
      lines.push(`- ${change.metric}: ${String(change.before)} -> ${String(change.after)}`);
    }
  }
  lines.push('');

  lines.push('## Input Fingerprint Changes');
  if (delta.input_hash_changes_count === 0) {
    lines.push('- none');
  } else {
    for (const change of delta.input_hash_changes) {
      lines.push(`- ${change.path}: ${change.before} -> ${change.after}`);
    }
  }

  return lines.join('\n');
}

function buildDecisionSignals({ overallPass, failedLaneIds, comparison, strict }) {
  const failedLaneCount = failedLaneIds.length;
  const laneDeltaCount = comparison.lane_changes_count || 0;
  const renderDeltaCount = comparison.render_changes_count || 0;
  const inputHashDeltaCount = comparison.input_hash_changes_count || 0;

  return [
    {
      metric: 'failing_lane_count',
      value: failedLaneCount,
      decision: failedLaneCount > 0 ? 'BLOCK_RELEASE_AND_FIX_FAILING_LANES' : 'ALLOW_RELEASE_CANDIDATE',
      impact: failedLaneCount > 0
        ? 'Prevents broken customer-visible flows from shipping.'
        : 'Maintains reliable delivery cadence with validated lane coverage.',
    },
    {
      metric: 'delta_lane_changes',
      value: laneDeltaCount,
      decision: laneDeltaCount > 0 ? 'RUN_TARGETED_LANE_REGRESSION_CHECKS' : 'NO_EXTRA_LANE_REGRESSION_REQUIRED',
      impact: laneDeltaCount > 0
        ? 'Focuses verification on changed user journeys to reduce regression risk.'
        : 'Avoids redundant checks while preserving confidence in unchanged flows.',
    },
    {
      metric: 'delta_render_changes',
      value: renderDeltaCount,
      decision: renderDeltaCount > 0 ? 'RUN_VISUAL_REVIEW_FOR_FLOW_AND_PLAIN_MODES' : 'NO_VISUAL_REVIEW_REQUIRED',
      impact: renderDeltaCount > 0
        ? 'Catches readability or discoverability drift before it affects users.'
        : 'Confirms no view-level drift impacting operator experience.',
    },
    {
      metric: 'delta_input_hash_changes',
      value: inputHashDeltaCount,
      decision: inputHashDeltaCount > 0 ? 'REQUIRE_CHANGE_REVIEW_AND_TRACEABILITY_NOTE' : 'NO_CONFIG_DRIFT_ACTION_REQUIRED',
      impact: inputHashDeltaCount > 0
        ? 'Improves reliability by ensuring config/data changes are intentional and reviewed.'
        : 'Signals stable inputs and lowers risk of hidden behavior changes.',
    },
    {
      metric: 'strict_gate_enabled',
      value: strict ? 1 : 0,
      decision: strict ? 'KEEP_STRICT_GATE_ON' : 'ENABLE_STRICT_GATE_FOR_RELEASE_BRANCHES',
      impact: strict
        ? 'Enforces hard fail behavior that protects production reliability.'
        : 'Prevents non-blocking failures from silently degrading user experience.',
    },
    {
      metric: 'overall_gate_pass',
      value: overallPass ? 1 : 0,
      decision: overallPass ? 'PROMOTE_TO_NEXT_STAGE' : 'OPEN_RELIABILITY_INCIDENT',
      impact: overallPass
        ? 'Moves validated changes forward with evidence-backed confidence.'
        : 'Triggers rapid correction before customers are affected.',
    },
  ];
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const mapJsonPath = path.join(PUBLIC_DIR, 'map.json');
  const diagramNodesPath = path.join(PUBLIC_DIR, 'diagram.nodes.json');
  const diagramConnectionsPath = path.join(PUBLIC_DIR, 'diagram.connections.json');
  const flowSpecPath = path.join(CONFIG_DIR, 'architecture_flow.json');
  const configJsPath = path.join(ROOT, 'src', 'config.js');

  const mapJson = readJson(mapJsonPath);
  const nodes = readJson(diagramNodesPath);
  const connections = readJson(diagramConnectionsPath);
  const flowSpec = readJson(flowSpecPath);
  const flowView = await parseFlowViewConfig(configJsPath);

  const nodeIdsAll = new Set(nodes.map((n) => n.id));
  const flowVisibleNodeIds = nodes
    .filter((n) => {
      const layerAllowed = flowView.layers.has(n.layer);
      const forcedVisible = flowView.forceVisibleNodes.has(n.id);
      if (!layerAllowed && !forcedVisible) return false;
      if (flowView.hideNodes.has(n.id) && !forcedVisible) return false;
      return true;
    })
    .map((n) => n.id);
  const plainVisibleNodeIds = nodes.map((n) => n.id);

  const flowConnTypes = new Set(['data-flow']);
  const flowEdgesBase = connections.filter(
    (c) => flowConnTypes.has(c.type) && flowVisibleNodeIds.includes(c.from) && flowVisibleNodeIds.includes(c.to)
  );
  const drawn = new Set(flowEdgesBase.map((c) => `${c.from}→${c.to}`));

  const aliases = flowSpec.aliases || {};
  const canon = (id) => aliases[id] || id;
  const extraFlowEdges = (flowSpec.required_flow_edges || [])
    .map((e) => ({ from: canon(e.from), to: canon(e.to), type: 'data-flow', label: e.label || '' }))
    .filter((e) => nodeIdsAll.has(e.from) && nodeIdsAll.has(e.to) && !drawn.has(`${e.from}→${e.to}`));

  const flowEdges = [...flowEdgesBase, ...extraFlowEdges];
  const plainEdges = [...connections];

  const flowModeData = {
    mode: 'flow',
    nodeIds: flowVisibleNodeIds,
    edges: flowEdges,
    edgeKeys: new Set(flowEdges.map((e) => `${e.from}→${e.to}`)),
    edgeLabels: flowEdges.filter((e) => e.label).map((e) => ({ from: e.from, to: e.to, label: e.label })),
  };
  const plainModeData = {
    mode: 'plain',
    nodeIds: plainVisibleNodeIds,
    edges: plainEdges,
    edgeKeys: new Set(plainEdges.map((e) => `${e.from}→${e.to}`)),
    edgeLabels: plainEdges.filter((e) => e.label).map((e) => ({ from: e.from, to: e.to, label: e.label })),
  };

  const flowSnapshotPath = path.join(outDir, 'flow_view_snapshot.txt');
  const plainSnapshotPath = path.join(outDir, 'plain_view_snapshot.txt');
  writeModeSnapshot(flowSnapshotPath, flowModeData);
  writeModeSnapshot(plainSnapshotPath, plainModeData);

  const resultsByMode = { flow: {}, plain: {} };
  for (const lane of laneDefinitions) {
    resultsByMode.flow[lane.id] = evaluateLane(flowModeData, lane);
    resultsByMode.plain[lane.id] = evaluateLane(plainModeData, lane);
  }

  const lanes = laneDefinitions.map((lane) => {
    const flowResult = resultsByMode.flow[lane.id];
    const plainResult = resultsByMode.plain[lane.id];
    const mapRequirement = evaluateMapRequirements(mapJson, lane);
    const mapCoverage = mapCoverageForLane(mapJson, lane);
    const failures = [];
    if (!flowResult.pass) failures.push({ mode: 'flow', missing: flowResult.missing });
    if (!plainResult.pass) failures.push({ mode: 'plain', missing: plainResult.missing });
    if (!mapRequirement.pass) failures.push({ mode: 'map_source', missing: mapRequirement.missing });
    return {
      id: lane.id,
      label: lane.label,
      map_coverage: {
        ...mapCoverage,
        required_ids: lane.mapRequiredIds || [],
        required_found: mapRequirement.found,
        required_missing: mapRequirement.missing,
      },
      flow_pass: flowResult.pass,
      plain_pass: plainResult.pass,
      map_required_pass: mapRequirement.pass,
      overall_pass: flowResult.pass && plainResult.pass && mapRequirement.pass,
      flow_evidence: flowResult.evidence,
      plain_evidence: plainResult.evidence,
      failures,
    };
  });
  const overallPass = lanes.every((lane) => lane.overall_pass);
  const failedLaneIds = lanes.filter((lane) => !lane.overall_pass).map((lane) => lane.id);

  const defaultFlowScreenshot = path.join(
    ROOT,
    'test-results',
    'smoke-load-diagnostics-and-screenshots',
    '01-camber-map-desktop-full.png'
  );
  const flowScreenshot = fs.existsSync(defaultFlowScreenshot)
    ? defaultFlowScreenshot
    : 'UNAVAILABLE';
  const latestPointerPath = path.join(OUT_BASE, 'acceptance-proof-latest.txt');
  const previousReportMeta = readPreviousReport(latestPointerPath, outDir);
  const deltaMdPath = path.join(outDir, 'acceptance_delta.md');

  const baseReport = {
    generated_at_utc: new Date().toISOString(),
    overall_pass: overallPass,
    failed_lane_ids: failedLaneIds,
    execution: {
      mode: 'static_render_audit',
      strict: opts.strict,
      note: 'Chromium launch is blocked in this sandbox, so view checks are computed from src/config.js visibility rules + diagram/config JSON.',
    },
    rerun: {
      cwd: ROOT,
      command: 'node scripts/acceptance_proof_after_patch.mjs --strict',
    },
    input_fingerprints: [
      { path: configJsPath, sha256: sha256ForFile(configJsPath) },
      { path: flowSpecPath, sha256: sha256ForFile(flowSpecPath) },
      { path: diagramNodesPath, sha256: sha256ForFile(diagramNodesPath) },
      { path: diagramConnectionsPath, sha256: sha256ForFile(diagramConnectionsPath) },
      { path: mapJsonPath, sha256: sha256ForFile(mapJsonPath) },
    ],
    artifacts: {
      directory: outDir,
      flow_screenshot: flowScreenshot,
      plain_screenshot: 'UNAVAILABLE_IN_SANDBOX',
      flow_snapshot: flowSnapshotPath,
      plain_snapshot: plainSnapshotPath,
      delta_report: deltaMdPath,
    },
    render_snapshot: {
      flow: {
        node_count: flowModeData.nodeIds.length,
        edge_count: flowModeData.edges.length,
        label_count: flowModeData.edgeLabels.length,
      },
      plain: {
        node_count: plainModeData.nodeIds.length,
        edge_count: plainModeData.edges.length,
        label_count: plainModeData.edgeLabels.length,
      },
    },
    lanes,
  };
  const comparison = buildComparison(previousReportMeta, baseReport);
  const decisionSignals = buildDecisionSignals({
    overallPass,
    failedLaneIds,
    comparison,
    strict: opts.strict,
  });
  const report = {
    ...baseReport,
    comparison_to_previous: comparison,
    decision_signals: decisionSignals,
  };

  const reportJsonPath = path.join(outDir, 'acceptance_report.json');
  const reportMdPath = path.join(outDir, 'acceptance_report.md');
  fs.writeFileSync(deltaMdPath, renderDeltaMarkdown(comparison));
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(reportMdPath, renderMarkdown(report));
  fs.writeFileSync(latestPointerPath, `${outDir}\n`);

  console.log(`ACCEPTANCE_PROOF_DIR ${outDir}`);
  console.log(`ACCEPTANCE_PROOF_JSON ${reportJsonPath}`);
  console.log(`ACCEPTANCE_PROOF_MD ${reportMdPath}`);
  console.log(`ACCEPTANCE_DELTA_MD ${deltaMdPath}`);
  console.log(`ACCEPTANCE_PROOF_LATEST ${latestPointerPath}`);
  console.log(`GATE_RESULT ${overallPass ? 'PASS' : 'FAIL'}`);
  if (comparison.has_previous) {
    console.log(`DELTA_PREVIOUS ${comparison.previous_report_dir}`);
  } else {
    console.log(`DELTA_PREVIOUS UNAVAILABLE (${comparison.reason})`);
  }
  console.log(`DELTA_LANE_CHANGES ${comparison.lane_changes_count}`);
  console.log(`DELTA_RENDER_CHANGES ${comparison.render_changes_count}`);
  console.log(`DELTA_INPUT_HASH_CHANGES ${comparison.input_hash_changes_count}`);
  for (const signal of decisionSignals) {
    console.log(`DECISION metric=${signal.metric} value=${signal.value} action=${signal.decision}`);
  }
  console.log(`FLOW_SNAPSHOT ${flowSnapshotPath}`);
  console.log(`PLAIN_SNAPSHOT ${plainSnapshotPath}`);
  for (const lane of report.lanes) {
    console.log(`LANE ${lane.id} FLOW=${lane.flow_pass ? 'PASS' : 'FAIL'} PLAIN=${lane.plain_pass ? 'PASS' : 'FAIL'} OVERALL=${lane.overall_pass ? 'PASS' : 'FAIL'}`);
  }
  if (opts.printJson) {
    console.log(JSON.stringify(report, null, 2));
  }

  if (opts.strict && !overallPass) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('ACCEPTANCE_PROOF_ERROR', err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
});
