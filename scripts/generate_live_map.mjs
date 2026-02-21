#!/usr/bin/env node
/*
Generates ALL mapping + facts from live product signals.
Output files:
  - public/facts.json
  - public/map.json

LIVE SOURCES (preferred):
  - Postgres via DATABASE_URL (required for live mode)
  - Supabase Edge Functions via Supabase Management API (optional)
  - Runtime lineage edges via public.system_lineage_edges (optional but recommended)

ENV:
  DATABASE_URL                 (required for LIVE_MODE=live; optional otherwise)
  LIVE_MODE                    (live|repo) default=live

  SUPABASE_PROJECT_REF         (optional; enables edge function listing)
  SUPABASE_ACCESS_TOKEN        (optional; a Supabase personal access token)

Notes:
  - If function listing isn’t enabled, we still generate a complete DB map.
  - Runtime lineage edges are evidence-backed and come from `system_lineage_edges`.
  - No inline UI code/data: the website should only fetch these JSON files.
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

const LIVE_MODE = (process.env.LIVE_MODE || 'live').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || '';

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

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

function nodeId(kind, schema, name) {
  const s = schema ? `${schema}.` : '';
  return `${kind}:${s}${name}`;
}

async function dbConnect() {
  if (!DATABASE_URL) return null;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

async function safeScalarQuery(client, sql) {
  try {
    const res = await client.query(sql);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    const key = Object.keys(row)[0];
    return key ? row[key] : null;
  } catch {
    return null;
  }
}

async function dbCounts(client) {
  const migrations = await safeScalarQuery(client, `select count(*)::int as n from supabase_migrations.schema_migrations;`);
  const tables = await safeScalarQuery(client, `select count(*)::int as n from information_schema.tables where table_schema='public' and table_type='BASE TABLE';`);
  const views = await safeScalarQuery(client, `select count(*)::int as n from information_schema.tables where table_schema='public' and table_type='VIEW';`);
  const functions = await safeScalarQuery(client, `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';`);
  const extensions = await safeScalarQuery(client, `select count(*)::int as n from pg_extension;`);

  return {
    applied_migrations: migrations,
    tables,
    views,
    functions,
    extensions,
  };
}

async function dbMap(client) {
  const nodes = [];
  const edges = [];

  const rels = await client.query(`
    select c.oid,
           n.nspname as schema,
           c.relname as name,
           c.relkind as kind
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','v','m')
    order by kind, name;
  `);

  const oidToNode = new Map();
  for (const r of rels.rows) {
    const kind = r.kind === 'r' ? 'table' : (r.kind === 'v' ? 'view' : 'matview');
    const id = nodeId(kind, r.schema, r.name);
    nodes.push({ id, kind, schema: r.schema, name: r.name, title: `${r.schema}.${r.name}` });
    oidToNode.set(r.oid, id);
  }

  const procs = await client.query(`
    select p.oid,
           n.nspname as schema,
           p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
    order by p.proname;
  `);

  for (const p of procs.rows) {
    const id = nodeId('fn', p.schema, `${p.name}(${p.args})`);
    nodes.push({ id, kind: 'fn', schema: p.schema, name: p.name, title: `${p.schema}.${p.name}(${p.args})` });
    oidToNode.set(p.oid, id);
  }

  const viewDeps = await client.query(`
    select distinct v.oid as view_oid,
           d.refobjid as to_oid
    from pg_class v
    join pg_namespace vn on vn.oid=v.relnamespace
    join pg_rewrite r on r.ev_class=v.oid
    join pg_depend d on d.objid=r.oid
    where vn.nspname='public'
      and v.relkind in ('v','m')
      and d.refclassid='pg_class'::regclass;
  `);

  const fnDeps = await client.query(`
    select distinct p.oid as fn_oid,
           d.refobjid as to_oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    join pg_depend d on d.objid=p.oid
    where n.nspname='public'
      and d.refclassid='pg_class'::regclass;
  `);

  const edgeSet = new Set();
  const addEdge = (from, to, type) => {
    if (!from || !to) return;
    if (from === to) return;
    const key = `${from}\0${to}\0${type}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from, to, type });
  };

  for (const row of viewDeps.rows) addEdge(oidToNode.get(row.view_oid), oidToNode.get(row.to_oid), 'depends_on');
  for (const row of fnDeps.rows) addEdge(oidToNode.get(row.fn_oid), oidToNode.get(row.to_oid), 'reads_writes');

  const ext = await client.query(`select extname from pg_extension order by extname;`);
  for (const e of ext.rows) {
    nodes.push({ id: nodeId('ext', '', e.extname), kind: 'ext', schema: null, name: e.extname, title: `extension:${e.extname}` });
  }

  return { nodes, edges };
}

async function runtimeLineage(client) {
  // Optional: live edges emitted by the product into system_lineage_edges.
  // If table doesn’t exist, return empty.
  try {
    const res = await client.query(`
      select from_node_id as "from",
             to_node_id as "to",
             edge_type as type,
             last_seen_at_utc,
             seen_count
      from public.system_lineage_edges;
    `);
    return res.rows.map((r) => ({
      from: r.from,
      to: r.to,
      type: r.type,
      meta: {
        last_seen_at_utc: r.last_seen_at_utc,
        seen_count: r.seen_count,
      },
    }));
  } catch {
    return [];
  }
}

async function fetchSupabaseFunctions() {
  if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    return { enabled: false, functions: [] };
  }

  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Supabase API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return { enabled: true, functions: Array.isArray(data) ? data : [] };
}

async function build() {
  const updated_at = nowUtcIso();
  const git_sha = await readGitSha();

  await ensureDir(path.join(ROOT, 'public'));

  const facts = {
    updated_at,
    git_sha,
    mode: LIVE_MODE,
    db: null,
    edge_functions: null,
    runtime_lineage: null,
  };

  const map = {
    updated_at,
    git_sha,
    mode: LIVE_MODE,
    nodes: [],
    edges: [],
    groups: {
      db: { label: 'Database' },
      edge: { label: 'Edge Functions' },
      runtime: { label: 'Runtime Lineage' }
    },
  };

  let client = null;
  if (LIVE_MODE === 'live') {
    if (!DATABASE_URL) throw new Error('LIVE_MODE=live requires DATABASE_URL');
    client = await dbConnect();
  } else {
    if (DATABASE_URL) client = await dbConnect();
  }

  try {
    if (client) {
      facts.db = await dbCounts(client);
      const db = await dbMap(client);
      for (const n of db.nodes) n.group = 'db';
      map.nodes.push(...db.nodes);
      map.edges.push(...db.edges);

      const rtEdges = await runtimeLineage(client);
      facts.runtime_lineage = { count: rtEdges.length };
      // runtime edges can refer to nodes not in dbMap (e.g., router:*). We keep them as edges-only;
      // UI can choose to synthesize unknown nodes if desired.
      for (const e of rtEdges) {
        map.edges.push({ from: e.from, to: e.to, type: e.type, meta: e.meta });
      }
    }

    let fns = [];
    let edgeFunctionsEnabled = false;
    let edgeFunctionsFetchFailed = false;
    try {
      const result = await fetchSupabaseFunctions();
      edgeFunctionsEnabled = result.enabled;
      fns = result.functions;
    } catch (e) {
      fns = [];
      edgeFunctionsEnabled = true;
      edgeFunctionsFetchFailed = true;
      facts.edge_functions_error = String(e?.message || e);
    }

    if (edgeFunctionsEnabled) {
      facts.edge_functions = {
        enabled: true,
        count: edgeFunctionsFetchFailed ? null : fns.length,
      };
      for (const f of fns) {
        const id = nodeId('edge', '', f.slug || f.name || 'unknown');
        map.nodes.push({
          id,
          kind: 'edge',
          group: 'edge',
          name: f.slug || f.name,
          title: f.name || f.slug,
          meta: {
            verify_jwt: f.verify_jwt,
            status: f.status,
            version: f.version,
            updated_at: f.updated_at,
          },
        });
      }
    }

    await fs.writeFile(path.join(ROOT, 'public', 'facts.json'), JSON.stringify(facts, null, 2) + '\n');
    await fs.writeFile(path.join(ROOT, 'public', 'map.json'), JSON.stringify(map, null, 2) + '\n');

    console.log('Wrote public/facts.json and public/map.json');
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
