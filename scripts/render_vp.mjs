#!/usr/bin/env node
/*
Reads public/vp.json (and optionally public/vp.prev.json) and emits:
  - public/vp.md         (executive summary for STRAT-VP / humans)
  - public/changes.json  (structured diff for machines)
  - public/changes.md    (human-readable changes)

No UI inline data required; UI should fetch vp.json.
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function readJsonSafe(p) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

function statusEmoji(status) {
  switch (status) {
    case 'healthy': return 'OK';
    case 'degraded': return 'WARN';
    case 'stale': return 'ALERT';
    default: return '???';
  }
}

function pad(s, len) {
  return String(s).padEnd(len);
}

function fmtPct(n) {
  return `${Math.round((n ?? 0) * 100)}%`;
}

function fmtStaleness(cap) {
  if (!cap.staleness) return 'n/a';
  const h = cap.staleness.hours_since_last_activity;
  if (h == null) return 'n/a';
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 48) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function fmtLastActivity(cap) {
  if (!cap.health?.last_activity_at) return 'n/a';
  return cap.health.last_activity_at.replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

// ---------------------------------------------------------------------------
// vp.md — Executive Summary
// ---------------------------------------------------------------------------

function renderVpMd(vp) {
  const lines = [];
  const s = vp.summary || {};

  // Header
  lines.push('# VP — Capability Health Report (generated)');
  lines.push('');

  // 1. Overall health — one-line status
  const parts = [];
  if (s.healthy) parts.push(`${s.healthy} healthy`);
  if (s.degraded) parts.push(`${s.degraded} degraded`);
  if (s.stale) parts.push(`${s.stale} stale`);
  if (s.unknown) parts.push(`${s.unknown} unknown`);
  lines.push(`## Overall Health`);
  lines.push('');
  lines.push(`**${parts.join(', ')}** out of ${s.total ?? 0} capabilities (coverage: ${fmtPct(s.overall_coverage_pct)})`);
  lines.push('');

  // 2. Capability table
  lines.push('## Capabilities');
  lines.push('');
  lines.push(`| Status | Capability | Owner | Coverage | Staleness | Last Activity |`);
  lines.push(`|--------|------------|-------|----------|-----------|---------------|`);

  for (const cap of vp.capabilities || []) {
    const status = statusEmoji(cap.health?.status);
    const name = cap.name || cap.id;
    const owner = cap.owner || '—';
    const coverage = fmtPct(cap.coverage?.pct);
    const staleness = fmtStaleness(cap);
    const lastAct = fmtLastActivity(cap);
    lines.push(`| ${status} | ${name} | ${owner} | ${coverage} | ${staleness} | ${lastAct} |`);
  }
  lines.push('');

  // 3. Bottlenecks — degraded/stale capabilities and their dependents
  const troubled = (vp.capabilities || []).filter(
    (c) => c.health?.status === 'degraded' || c.health?.status === 'stale'
  );

  lines.push('## Bottlenecks');
  lines.push('');

  if (troubled.length === 0) {
    lines.push('No degraded or stale capabilities detected.');
  } else {
    const edgeMap = buildDownstreamMap(vp.capability_edges || []);
    for (const cap of troubled) {
      const downstream = edgeMap.get(cap.id) || [];
      const depStr = downstream.length > 0
        ? `blocks: ${downstream.join(', ')}`
        : 'no downstream dependents';
      lines.push(`- **${statusEmoji(cap.health?.status)}** ${cap.name || cap.id} — ${depStr}`);
    }
  }
  lines.push('');

  // 4. Pipeline flow — ASCII representation of capability_edges
  lines.push('## Pipeline Flow');
  lines.push('');
  lines.push('```');
  lines.push(renderAsciiPipeline(vp.capabilities || [], vp.capability_edges || []));
  lines.push('```');
  lines.push('');

  // 5. Footer
  lines.push('---');
  lines.push(`Generated: ${vp.updated_at || new Date().toISOString()}`);
  if (vp.git_sha) lines.push(`Git SHA: ${vp.git_sha}`);
  lines.push('**Do not edit** — regenerate with `node scripts/render_vp.mjs`');

  return lines.join('\n') + '\n';
}

function buildDownstreamMap(edges) {
  const map = new Map();
  for (const e of edges) {
    if (!map.has(e.from)) map.set(e.from, []);
    map.get(e.from).push(e.to);
  }
  return map;
}

function renderAsciiPipeline(capabilities, edges) {
  // Build adjacency and find roots (no incoming edges)
  const incoming = new Set();
  const downstream = new Map();
  for (const e of edges) {
    incoming.add(e.to);
    if (!downstream.has(e.from)) downstream.set(e.from, []);
    downstream.get(e.from).push(e.to);
  }
  const capIds = capabilities.map((c) => c.id);
  const roots = capIds.filter((id) => !incoming.has(id));

  // Kahn's algorithm — topological level assignment (cycle-safe)
  const level = new Map();
  const inDegree = new Map();
  for (const id of capIds) inDegree.set(id, 0);
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }
  const queue = capIds.filter((id) => inDegree.get(id) === 0);
  for (const r of queue) level.set(r, 0);

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const next of downstream.get(cur) || []) {
      level.set(next, Math.max(level.get(next) ?? 0, level.get(cur) + 1));
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Nodes still with inDegree > 0 are in cycles; place them at the end
  const maxAssigned = Math.max(...[...level.values()], 0);
  for (const id of capIds) {
    if (!level.has(id)) level.set(id, maxAssigned + 1);
  }

  // Group by level
  const levels = new Map();
  for (const [id, lv] of level.entries()) {
    if (!levels.has(lv)) levels.set(lv, []);
    levels.get(lv).push(id);
  }

  // Build name lookup
  const nameOf = new Map();
  for (const c of capabilities) nameOf.set(c.id, c.name || c.id);

  // Render each level as a row
  const lines = [];
  const maxLevel = Math.max(...levels.keys(), 0);
  for (let lv = 0; lv <= maxLevel; lv++) {
    const ids = levels.get(lv) || [];
    const labels = ids.map((id) => `[${nameOf.get(id) || id}]`);
    const row = labels.join('  ');
    if (lv > 0) {
      // Draw arrows from previous level
      const prevIds = levels.get(lv - 1) || [];
      const arrows = ids.map((id) => {
        const sources = edges
          .filter((e) => e.to === id && prevIds.includes(e.from))
          .map((e) => nameOf.get(e.from) || e.from);
        return sources.length > 0 ? '  |' : '  |';
      });
      lines.push(arrows.join('  '));
      lines.push(arrows.map(() => '  v').join('  '));
    }
    lines.push(row);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// changes.json — Structured diff between current and previous VP
// ---------------------------------------------------------------------------

function computeChanges(vp, prev) {
  if (!prev) {
    return {
      updated_at: vp.updated_at || new Date().toISOString(),
      has_previous: false,
      changes: [],
    };
  }

  const changes = [];
  const prevCapMap = new Map();
  for (const c of prev.capabilities || []) prevCapMap.set(c.id, c);

  const curCapMap = new Map();
  for (const c of vp.capabilities || []) curCapMap.set(c.id, c);

  // Check for new capabilities
  for (const c of vp.capabilities || []) {
    if (!prevCapMap.has(c.id)) {
      changes.push({ type: 'new_capability', capability: c.id });
    }
  }

  // Check for removed capabilities
  for (const c of prev.capabilities || []) {
    if (!curCapMap.has(c.id)) {
      changes.push({ type: 'removed_capability', capability: c.id });
    }
  }

  // Check for health changes and coverage changes
  for (const c of vp.capabilities || []) {
    const pc = prevCapMap.get(c.id);
    if (!pc) continue;

    const curHealth = c.health?.status;
    const prevHealth = pc.health?.status;
    if (curHealth && prevHealth && curHealth !== prevHealth) {
      changes.push({
        type: 'health_change',
        capability: c.id,
        from: prevHealth,
        to: curHealth,
      });
    }

    const curCov = c.coverage?.pct;
    const prevCov = pc.coverage?.pct;
    if (curCov != null && prevCov != null && curCov !== prevCov) {
      changes.push({
        type: 'coverage_change',
        capability: c.id,
        from: prevCov,
        to: curCov,
      });
    }
  }

  // Node count change (total tech_node_count across capabilities)
  const curTotal = (vp.capabilities || []).reduce((s, c) => s + (c.tech_node_count || 0), 0);
  const prevTotal = (prev.capabilities || []).reduce((s, c) => s + (c.tech_node_count || 0), 0);
  if (curTotal !== prevTotal) {
    changes.push({ type: 'node_count_change', from: prevTotal, to: curTotal });
  }

  return {
    updated_at: vp.updated_at || new Date().toISOString(),
    has_previous: true,
    changes,
  };
}

// ---------------------------------------------------------------------------
// changes.md — Human-readable changes
// ---------------------------------------------------------------------------

function renderChangesMd(changesObj) {
  const lines = [];
  lines.push('# VP Changes (generated)');
  lines.push('');

  if (!changesObj.has_previous) {
    lines.push('First build — no changes to report.');
    lines.push('');
    lines.push('---');
    lines.push(`Generated: ${changesObj.updated_at}`);
    lines.push('**Do not edit** — regenerate with `node scripts/render_vp.mjs`');
    return lines.join('\n') + '\n';
  }

  if (changesObj.changes.length === 0) {
    lines.push('No changes detected since last build.');
    lines.push('');
    lines.push('---');
    lines.push(`Generated: ${changesObj.updated_at}`);
    lines.push('**Do not edit** — regenerate with `node scripts/render_vp.mjs`');
    return lines.join('\n') + '\n';
  }

  for (const ch of changesObj.changes) {
    switch (ch.type) {
      case 'health_change':
        lines.push(`- **${ch.capability}**: health changed from \`${ch.from}\` to \`${ch.to}\``);
        break;
      case 'coverage_change':
        lines.push(`- **${ch.capability}**: coverage changed from ${fmtPct(ch.from)} to ${fmtPct(ch.to)}`);
        break;
      case 'new_capability':
        lines.push(`- **${ch.capability}**: new capability added`);
        break;
      case 'removed_capability':
        lines.push(`- **${ch.capability}**: capability removed`);
        break;
      case 'node_count_change':
        lines.push(`- Tech node count changed from ${ch.from} to ${ch.to}`);
        break;
      default:
        lines.push(`- ${ch.type}: ${JSON.stringify(ch)}`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push(`Generated: ${changesObj.updated_at}`);
  lines.push('**Do not edit** — regenerate with `node scripts/render_vp.mjs`');
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const vpPath = path.join(ROOT, 'public', 'vp.json');
  const prevPath = path.join(ROOT, 'public', 'vp.prev.json');

  const vp = await readJson(vpPath);
  const prev = await readJsonSafe(prevPath);

  // 1. VP markdown
  const vpMd = renderVpMd(vp);
  await fs.writeFile(path.join(ROOT, 'public', 'vp.md'), vpMd);

  // 2. Changes JSON
  const changesObj = computeChanges(vp, prev);
  await fs.writeFile(
    path.join(ROOT, 'public', 'changes.json'),
    JSON.stringify(changesObj, null, 2) + '\n'
  );

  // 3. Changes markdown
  const changesMd = renderChangesMd(changesObj);
  await fs.writeFile(path.join(ROOT, 'public', 'changes.md'), changesMd);

  console.log('Wrote public/vp.md, public/changes.json, public/changes.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
