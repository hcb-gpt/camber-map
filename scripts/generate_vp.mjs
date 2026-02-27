#!/usr/bin/env node
/*
Generates the VP (Value Proposition) capability health overlay.
Output: public/vp.json

Reads:
  - config/capabilities.json  (capability definitions)
  - public/map.json            (tech graph for node validation)
  - public/vp.json             (previous run, copied to vp.prev.json for diffing)

Live sources:
  - Postgres via DATABASE_URL  (health queries + lineage edges)

ENV:
  DATABASE_URL  (required)
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import pg from 'pg';
const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DATABASE_URL = process.env.DATABASE_URL || '';

function nowUtcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readGitSha() {
  try {
    const head = (await fs.readFile(path.join(ROOT, '.git/HEAD'), 'utf8')).trim();
    if (head.startsWith('ref:')) {
      const refPath = head.split(' ')[1];
      const sha = (await fs.readFile(path.join(ROOT, '.git', refPath), 'utf8')).trim();
      return sha;
    }
    return head;
  } catch {
    return 'unknown';
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function dbConnect() {
  if (!DATABASE_URL) return null;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

// Run a single health query, returning the scalar value or null on failure.
async function safeQuery(client, sql) {
  try {
    const res = await client.query(sql);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    // Return the first column value
    const keys = Object.keys(row);
    return keys.length ? row[keys[0]] : null;
  } catch {
    return null;
  }
}

// Fetch lineage edges for coverage computation.
async function fetchLineageEdges(client) {
  try {
    const res = await client.query(`
      SELECT from_node_id, to_node_id, edge_type, last_seen_at_utc
      FROM public.system_lineage_edges;
    `);
    return res.rows;
  } catch {
    return [];
  }
}

function hoursSince(isoString) {
  if (!isoString) return null;
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return null;
  return (Date.now() - then.getTime()) / (1000 * 60 * 60);
}

function stalenessStatus(hours, thresholds) {
  if (hours === null) return 'unknown';
  if (hours < thresholds.fresh_hours) return 'fresh';
  if (hours <= thresholds.aging_hours) return 'aging';
  return 'stale';
}

function healthStatus(stalenessStr, coveragePct) {
  if (stalenessStr === 'unknown') return 'unknown';
  if (stalenessStr === 'stale') return 'stale';
  if (stalenessStr === 'aging' || coveragePct < 0.8) return 'degraded';
  return 'healthy';
}

async function build() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

  const updated_at = nowUtcIso();
  const git_sha = await readGitSha();

  await ensureDir(path.join(ROOT, 'public'));

  // 1. Read config
  const config = await readJson(path.join(ROOT, 'config', 'capabilities.json'));
  const thresholds = config.staleness_thresholds || { fresh_hours: 24, aging_hours: 72 };

  // 2. Read map.json for tech node validation
  let mapNodes = new Set();
  try {
    const map = await readJson(path.join(ROOT, 'public', 'map.json'));
    for (const n of (map.nodes || [])) mapNodes.add(n.id);
  } catch {
    console.warn('Warning: could not read public/map.json — tech_nodes_in_graph will be 0');
  }

  // 3. Copy previous vp.json for diffing
  const vpPath = path.join(ROOT, 'public', 'vp.json');
  const vpPrevPath = path.join(ROOT, 'public', 'vp.prev.json');
  if (await fileExists(vpPath)) {
    await fs.copyFile(vpPath, vpPrevPath);
  }

  // 4. Connect to DB
  const client = await dbConnect();

  try {
    // Pre-fetch lineage edges once
    const lineageEdges = await fetchLineageEdges(client);

    const capabilities = [];
    const summary = { total: 0, healthy: 0, degraded: 0, stale: 0, unknown: 0, overall_coverage_pct: 0 };
    let totalCoverage = 0;

    for (const cap of config.capabilities) {
      const entry = {
        id: cap.id,
        name: cap.name,
        description: cap.description,
        owner: cap.owner,
        tags: cap.tags || [],
        tech_node_count: (cap.tech_nodes || []).length,
        tech_nodes_in_graph: (cap.tech_nodes || []).filter(n => mapNodes.has(n)).length,
        coverage: { expected: 0, observed: 0, pct: 0 },
        staleness: { hours_since_last_activity: null, status: 'unknown' },
        health: { status: 'unknown', row_count: null, last_activity_at: null },
        depends_on: cap.depends_on || [],
      };

      // 5a. Run health_queries
      const hq = cap.health_queries || {};
      let rowCount = null;
      let lastInsertTs = null;

      if (hq.row_count) {
        rowCount = await safeQuery(client, hq.row_count);
      }
      if (hq.last_insert) {
        const ts = await safeQuery(client, hq.last_insert);
        if (ts) lastInsertTs = new Date(ts).toISOString();
      }

      // 5b. Check lineage edges for expected_producers
      const expectedProducers = cap.expected_producers || [];
      const now = Date.now();
      const stalenessWindowMs = thresholds.aging_hours * 60 * 60 * 1000;

      let observedCount = 0;
      let latestLineageTs = null;

      for (const producer of expectedProducers) {
        const match = lineageEdges.find(e =>
          e.from_node_id === producer &&
          e.last_seen_at_utc &&
          (now - new Date(e.last_seen_at_utc).getTime()) < stalenessWindowMs
        );
        if (match) {
          observedCount++;
          const ts = new Date(match.last_seen_at_utc);
          if (!latestLineageTs || ts > latestLineageTs) latestLineageTs = ts;
        }
      }

      // 5d. Staleness — use latest of last_insert or lineage last_seen_at_utc
      let latestActivityAt = null;
      if (lastInsertTs) latestActivityAt = new Date(lastInsertTs);
      if (latestLineageTs && (!latestActivityAt || latestLineageTs > latestActivityAt)) {
        latestActivityAt = latestLineageTs;
      }

      const hoursSinceActivity = latestActivityAt ? hoursSince(latestActivityAt.toISOString()) : null;
      const stalenessStr = stalenessStatus(hoursSinceActivity, thresholds);

      entry.staleness.hours_since_last_activity = hoursSinceActivity !== null
        ? Math.round(hoursSinceActivity * 10) / 10
        : null;
      entry.staleness.status = stalenessStr;

      // Determine if health_queries were configured
      const hasQueries = Object.keys(hq).length > 0;

      // 5c. Coverage
      //
      // Coverage was originally defined as: "did each expected producer emit a recent
      // runtime lineage edge?". In practice, many producers are not instrumented yet,
      // so coverage can read 0% even while the capability is clearly active.
      //
      // Minimal wiring fix: if we have health activity (last_insert) within the same
      // staleness window, treat the capability as "observed" for monitoring purposes.
      if (
        expectedProducers.length > 0 &&
        observedCount === 0 &&
        hasQueries &&
        latestActivityAt &&
        (now - latestActivityAt.getTime()) < stalenessWindowMs
      ) {
        observedCount = 1;
      }

      entry.coverage.expected = expectedProducers.length;
      entry.coverage.observed = observedCount;
      entry.coverage.pct = expectedProducers.length > 0
        ? Math.round((observedCount / expectedProducers.length) * 100) / 100
        : 0;

      // 5e. Health status
      if (!hasQueries && expectedProducers.length === 0) {
        entry.health.status = 'unknown';
      } else {
        entry.health.status = healthStatus(stalenessStr, entry.coverage.pct);
      }
      entry.health.row_count = rowCount;
      entry.health.last_activity_at = latestActivityAt ? latestActivityAt.toISOString() : null;

      capabilities.push(entry);

      // Accumulate summary
      summary.total++;
      summary[entry.health.status]++;
      totalCoverage += entry.coverage.pct;
    }

    summary.overall_coverage_pct = summary.total > 0
      ? Math.round((totalCoverage / summary.total) * 100) / 100
      : 0;

    // 7. Write vp.json
    const vp = {
      updated_at,
      git_sha,
      capabilities,
      capability_edges: config.capability_edges || [],
      summary,
    };

    await fs.writeFile(vpPath, JSON.stringify(vp, null, 2) + '\n');
    console.log('Wrote public/vp.json');
    console.log(`Summary: ${summary.healthy} healthy, ${summary.degraded} degraded, ${summary.stale} stale, ${summary.unknown} unknown (${summary.total} total)`);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
