// ── DATA LOADING, VALIDATION, SYNC ────────────────
import { CONNECTION_LABEL_DESC_MAP, MAP_PARITY_ALIAS_POLICY, MOBILE_STAGES } from './config.js';
import {
  state, nodes, connections, diagramNodesBase, diagramConnectionsBase, mapData,
  vpData, factsData, changesData, architectureSpec, flowEdges,
  diagramLoadingState, diagramErrorMessage, sb, sbOffline,
  validationContext, validationContextPromise, mapParityCoverage,
  setVpData, setFactsData, setChangesData, setMapData,
  setArchitectureSpec, setFlowEdges, setNodes, setConnections,
  setDiagramNodesBase, setDiagramConnectionsBase,
  setValidationContext, setValidationContextPromise,
  setDiagramLoadingState, setDiagramErrorMessage,
  setSbOffline, setSb, setMapParityCoverage,
} from './state.js';

// These will be set by main.js to break circular dependency
let _updateAll = null;
let _renderDiagram = null;
let _setDiagramStatusBanner = null;
let _renderNowBar = null;
let _renderStatBar = null;
let _renderMobileView = null;
let _renderFlowNav = null;
let _showOfflineBanner = null;
let _ensureSummaries = null;

export function registerCallbacks(cbs) {
  _updateAll = cbs.updateAll;
  _renderDiagram = cbs.renderDiagram;
  _setDiagramStatusBanner = cbs.setDiagramStatusBanner;
  _renderNowBar = cbs.renderNowBar;
  _renderStatBar = cbs.renderStatBar;
  _renderMobileView = cbs.renderMobileView;
  _renderFlowNav = cbs.renderFlowNav;
  _showOfflineBanner = cbs.showOfflineBanner;
  _ensureSummaries = cbs.ensureSummaries;
}

export function _connKey(from, to, label) {
  return String(from || '') + '\u2192' + String(to || '') + '|' + String(label || '');
}

export function attachConnectionDescs(list) {
  if (!Array.isArray(list)) return;
  list.forEach(function(c) {
    const k = _connKey(c.from, c.to, c.label);
    if (!c.desc && CONNECTION_LABEL_DESC_MAP[k]) c.desc = CONNECTION_LABEL_DESC_MAP[k];
  });
}

export function mapParityAliasFor(nodeId) {
  if (!nodeId) return nodeId;
  return MAP_PARITY_ALIAS_POLICY[nodeId] || nodeId;
}

export function mapEdgeToConnectionType(edgeType) {
  if (edgeType === 'writes') return 'data-flow';
  if (edgeType === 'reads') return 'rpc';
  return 'dependency';
}

export function syncRenderDataFromSources() {
  let baseNodes = Array.isArray(diagramNodesBase) ? diagramNodesBase.slice() : [];
  let baseConnections = Array.isArray(diagramConnectionsBase) ? diagramConnectionsBase.slice() : [];
  const nodeIndex = {};
  baseNodes.forEach(function(n) { nodeIndex[n.id] = true; });

  const canonicalConnectionSeen = new Set();
  baseConnections = baseConnections
    .map(function(c) {
      return Object.assign({}, c, {
        from: mapParityAliasFor(c.from),
        to: mapParityAliasFor(c.to)
      });
    })
    .filter(function(c) {
      if (!nodeIndex[c.from] || !nodeIndex[c.to] || c.from === c.to) return false;
      const k = _connKey(c.from, c.to, c.label);
      if (canonicalConnectionSeen.has(k)) return false;
      canonicalConnectionSeen.add(k);
      return true;
    });

  const coverage = { represented: [], missing: [] };
  Object.keys(MAP_PARITY_ALIAS_POLICY).forEach(function(mapNodeId) {
    const alias = mapParityAliasFor(mapNodeId);
    if (nodeIndex[alias]) coverage.represented.push(mapNodeId + '\u2192' + alias);
    else coverage.missing.push(mapNodeId + '\u2192' + alias);
  });
  setMapParityCoverage(coverage);

  // Pull map-backed links into the rendered graph
  const currentMapData = mapData;
  if (currentMapData && Array.isArray(currentMapData.edges)) {
    const existing = new Set(baseConnections.map(function(c) { return _connKey(c.from, c.to, c.label); }));
    currentMapData.edges.forEach(function(e) {
      const fromAlias = mapParityAliasFor(e.from);
      const toAlias = mapParityAliasFor(e.to);
      if (!nodeIndex[fromAlias] || !nodeIndex[toAlias] || fromAlias === toAlias) return;

      const label = 'map:' + String(e.type || 'depends_on');
      const key = _connKey(fromAlias, toAlias, label);
      if (existing.has(key)) return;

      baseConnections.push({
        from: fromAlias,
        to: toAlias,
        type: mapEdgeToConnectionType(e.type),
        label: label,
        desc: 'Map parity edge from public/map.json (' + String(e.type || 'depends_on') + ')'
      });
      existing.add(key);
    });
  }

  setNodes(baseNodes);
  setConnections(baseConnections);
  attachConnectionDescs(baseConnections);
  window.__mapParityCoverage = coverage;
}

// ── Validation helpers ────────────────────────────
export function getAjvCtor() {
  if (typeof window === 'undefined') return null;
  if (window.Ajv) return window.Ajv;
  if (window.ajv7) {
    if (typeof window.ajv7 === 'function') return window.ajv7;
    if (window.ajv7.default) return window.ajv7.default;
    if (window.ajv7.Ajv) return window.ajv7.Ajv;
  }
  return null;
}

export function toValidationMessage(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return 'validation failed';
  const first = errors[0];
  const path = first.instancePath || '(root)';
  const detail = first.message || 'invalid value';
  return path + ' ' + detail;
}

export function fetchJsonRequired(path, label) {
  return fetch(path + '?t=' + Date.now())
    .then(function(r) {
      if (!r.ok) throw new Error(label + ' fetch failed (HTTP ' + r.status + ')');
      return r.json();
    })
    .catch(function(e) {
      throw new Error((e && e.message) ? e.message : (label + ' fetch failed'));
    });
}

export function fetchJsonOptional(path) {
  return fetch(path + '?t=' + Date.now())
    .then(function(r) { return r.ok ? r.json() : null; })
    .catch(function() { return null; });
}

export function ensureValidationContext() {
  if (validationContext) return Promise.resolve(validationContext);
  if (validationContextPromise) return validationContextPromise;

  const promise = Promise.all([
    fetchJsonRequired('./public/map.schema.json', 'map schema'),
    fetchJsonRequired('./public/diagram.schema.json', 'diagram schema')
  ]).then(function(schemas) {
    const mapSchema = schemas[0];
    const diagramSchema = schemas[1];
    const AjvCtor = getAjvCtor();
    if (!AjvCtor) throw new Error('Ajv runtime unavailable');

    const ajv = new AjvCtor({ allErrors: true, strict: false });
    const defs = mapSchema && mapSchema.definitions ? mapSchema.definitions : {};
    const diagramDefs = diagramSchema && diagramSchema.definitions ? diagramSchema.definitions : {};
    const diagramNodeSchema = diagramDefs.DiagramNodes
      ? { $ref: '#/definitions/DiagramNodes', definitions: diagramDefs }
      : {
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
          additionalProperties: true
        }
      };
    const diagramConnectionSchema = diagramDefs.DiagramConnections
      ? { $ref: '#/definitions/DiagramConnections', definitions: diagramDefs }
      : {
        type: 'array',
        items: {
          type: 'object',
          required: ['from', 'to'],
          properties: { from: { type: 'string' }, to: { type: 'string' } },
          additionalProperties: true
        }
      };

    const ctx = {
      facts: ajv.compile({ $ref: '#/definitions/Facts', definitions: defs }),
      map: ajv.compile({ $ref: '#/definitions/Map', definitions: defs }),
      vp: ajv.compile({ $ref: '#/definitions/VP', definitions: defs }),
      changes: ajv.compile({ $ref: '#/definitions/Changes', definitions: defs }),
      diagramNodes: ajv.compile(diagramNodeSchema),
      diagramConnections: ajv.compile(diagramConnectionSchema)
    };

    setValidationContext(ctx);
    return ctx;
  })
    .catch(function(e) {
      setValidationContextPromise(null);
      throw e;
    });

  setValidationContextPromise(promise);
  return promise;
}

export function validateOrThrow(ctx, key, payload, fileLabel) {
  const validate = ctx[key];
  if (!validate) throw new Error(fileLabel + ' validator unavailable');
  if (!validate(payload)) {
    throw new Error(fileLabel + ' failed schema validation: ' + toValidationMessage(validate.errors));
  }
}

export function failDiagramLoad(message) {
  setDiagramLoadingState('error');
  setDiagramErrorMessage(message || 'Unknown diagram load failure');
  setNodes([]);
  setConnections([]);
  if (_updateAll) _updateAll();
  if (_setDiagramStatusBanner) _setDiagramStatusBanner();
}

export function loadDiagramData() {
  setDiagramLoadingState('loading');
  setDiagramErrorMessage('');
  if (_renderDiagram) _renderDiagram();
  if (_setDiagramStatusBanner) _setDiagramStatusBanner();

  return Promise.all([
    ensureValidationContext(),
    fetchJsonRequired('./public/diagram.nodes.json', 'diagram.nodes.json'),
    fetchJsonRequired('./public/diagram.connections.json', 'diagram.connections.json')
  ]).then(function(results) {
    const ctx = results[0];
    const nextNodes = results[1];
    const nextConnections = results[2];
    validateOrThrow(ctx, 'diagramNodes', nextNodes, 'public/diagram.nodes.json');
    validateOrThrow(ctx, 'diagramConnections', nextConnections, 'public/diagram.connections.json');

    setDiagramNodesBase(nextNodes);
    setDiagramConnectionsBase(nextConnections);
    syncRenderDataFromSources();

    if (window.innerWidth <= 1024 && state.viewMode === 'flow' && _renderFlowNav) {
      _renderFlowNav();
    }
    if (_ensureSummaries) _ensureSummaries();

    setDiagramLoadingState('ready');
    setDiagramErrorMessage('');
    if (_updateAll) _updateAll();
    if (_setDiagramStatusBanner) _setDiagramStatusBanner();
  }).catch(function(e) {
    failDiagramLoad((e && e.message) ? e.message : 'Unknown diagram load failure');
  });
}

export function retryLoadDiagramData() {
  return loadDiagramData();
}

export function fetchVPData() {
  return Promise.all([
    ensureValidationContext(),
    fetchJsonOptional('./public/vp.json'),
    fetchJsonRequired('./public/facts.json', 'facts.json'),
    fetchJsonOptional('./public/changes.json'),
    fetchJsonRequired('./public/map.json', 'map.json')
  ]).then(function(results) {
    const ctx = results[0];
    const nextVp = results[1];
    const nextFacts = results[2];
    const nextChanges = results[3];
    const nextMap = results[4];

    validateOrThrow(ctx, 'facts', nextFacts, 'public/facts.json');
    validateOrThrow(ctx, 'map', nextMap, 'public/map.json');
    if (nextVp) validateOrThrow(ctx, 'vp', nextVp, 'public/vp.json');
    if (nextChanges) validateOrThrow(ctx, 'changes', nextChanges, 'public/changes.json');

    setVpData(nextVp);
    setFactsData(nextFacts);
    setChangesData(nextChanges);
    setMapData(nextMap);
    syncRenderDataFromSources();

    if (_renderNowBar) _renderNowBar();
    if (_renderStatBar) _renderStatBar();

    if (window.innerWidth <= 1024 && state.viewMode === 'flow') {
      if (_renderMobileView) _renderMobileView();
      if (_renderFlowNav) _renderFlowNav();
    }
  }).catch(function(e) {
    failDiagramLoad((e && e.message) ? e.message : 'JSON validation failed');
  });
}

export function fetchArchitectureSpec() {
  return fetch('./config/architecture_flow.json')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(spec) {
      if (!spec) return;
      setArchitectureSpec(spec);
      const aliases = spec.aliases || {};
      function canon(id) { return aliases[id] || id; }
      const edges = (spec.required_flow_edges || []).map(function(e) {
        return { from: canon(e.from), to: canon(e.to), type: 'data-flow', label: e.label };
      });
      attachConnectionDescs(edges);
      setFlowEdges(edges);

      if (state.viewMode === 'flow' && _renderDiagram) _renderDiagram();
    })
    .catch(function() { /* graceful degradation */ });
}

// ── ANNOTATIONS ───────────────────────────────────
export async function loadAnnotations() {
  // Import current values from state
  const currentSb = sb;
  const currentSbOffline = sbOffline;
  if (!currentSb || currentSbOffline) return;
  try {
    const result = await currentSb.from('map_annotations').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    // Need to use the current nodes from state
    const currentNodes = nodes;
    state.comments = result.data.map(function(a) {
      const node = currentNodes.find(function(n) { return n.id === a.node_id; });
      return {
        id: a.id, target: a.node_id,
        targetLabel: node ? node.label : a.node_id,
        targetFile: node ? node.subtitle : '',
        text: a.content, author: a.author || 'anonymous',
        created_at: a.created_at
      };
    });
    if (_updateAll) _updateAll();
  } catch(e) {
    setSbOffline(true);
    if (_showOfflineBanner) _showOfflineBanner();
  }
}

export function setupRealtimeSubscription() {
  const currentSb = sb;
  if (!currentSb) return;
  currentSb.channel('annotations-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'map_annotations' }, function(payload) {
      const a = payload.new;
      const already = state.comments.some(function(c) { return c.id === a.id; });
      if (already) return;
      const currentNodes = nodes;
      const node = currentNodes.find(function(n) { return n.id === a.node_id; });
      state.comments.unshift({
        id: a.id, target: a.node_id,
        targetLabel: node ? node.label : a.node_id,
        targetFile: node ? node.subtitle : '',
        text: a.content, author: a.author || 'anonymous',
        created_at: a.created_at
      });
      if (_updateAll) _updateAll();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'map_annotations' }, function(payload) {
      const delId = payload.old.id;
      state.comments = state.comments.filter(function(c) { return c.id !== delId; });
      if (_updateAll) _updateAll();
    })
    .subscribe();
}

export function initSupabase() {
  try {
    if (window.supabase) {
      const client = window.supabase.createClient(
        'https://rjhdwidddtfetbwqolof.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaGR3aWRkZHRmZXRid3FvbG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTYwNDQsImV4cCI6MjA4MDY5MjA0NH0.m0BArfDxAMQrX2-50_IgircX_SwWLe5VccxewGmuWio'
      );
      setSb(client);
    }
  } catch(e) {
    setSbOffline(true);
  }
}
