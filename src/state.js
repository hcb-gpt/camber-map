// ── MUTABLE STATE ─────────────────────────────────
import { CONN_TYPES } from './config.js';

export let state = {
  preset: 'full',
  layers: { external: true, pipeline: true, module: true, data: true, devops: true },
  conns: {},
  comments: [],
  zoom: 0.65,
  panX: 0, panY: 0,
  searchFilter: '',
  viewMode: 'flow',
  activeFlowStage: null,
};
Object.keys(CONN_TYPES).forEach(function(k) { state.conns[k] = true; });

// Diagram source data
export let vpData = null;
export let factsData = null;
export let changesData = null;
export let mapData = null;
export let architectureSpec = null;
export let flowEdges = [];
export let nodes = [];
export let connections = [];
export let diagramNodesBase = [];
export let diagramConnectionsBase = [];
export let annotationData = null;
export let summaryGenerated = false;

// Validation
export let validationContext = null;
export let validationContextPromise = null;

// Loading state
export let diagramLoadingState = 'loading';
export let diagramErrorMessage = '';

// Hover state
export let connHoverTimer = null;
export let nodeHoverTimer = null;
export let hoveredNodeId = null;
export let hoveredConnKey = null;

// Panel state
export let infoLocked = false;
export let infoNode = null;
export let infoEdge = null;
export let modalNode = null;

// Pan state
export let isPanning = false;
export let panStartX = 0;
export let panStartY = 0;
export let lastPinchDist = 0;
export let pinchCenterX = 0;
export let pinchCenterY = 0;

// Map parity coverage
export let mapParityCoverage = { represented: [], missing: [] };

// Supabase
export let sbOffline = false;
export let sb = null;

// ── Setters (needed because ES module exports are read-only bindings) ──
export function setVpData(v) { vpData = v; }
export function setFactsData(v) { factsData = v; }
export function setChangesData(v) { changesData = v; }
export function setMapData(v) { mapData = v; }
export function setArchitectureSpec(v) { architectureSpec = v; }
export function setFlowEdges(v) { flowEdges = v; }
export function setNodes(v) { nodes = v; }
export function setConnections(v) { connections = v; }
export function setDiagramNodesBase(v) { diagramNodesBase = v; }
export function setDiagramConnectionsBase(v) { diagramConnectionsBase = v; }
export function setValidationContext(v) { validationContext = v; }
export function setValidationContextPromise(v) { validationContextPromise = v; }
export function setDiagramLoadingState(v) { diagramLoadingState = v; }
export function setDiagramErrorMessage(v) { diagramErrorMessage = v; }
export function setConnHoverTimer(v) { connHoverTimer = v; }
export function setNodeHoverTimer(v) { nodeHoverTimer = v; }
export function setHoveredNodeId(v) { hoveredNodeId = v; }
export function setHoveredConnKey(v) { hoveredConnKey = v; }
export function setInfoLocked(v) { infoLocked = v; }
export function setInfoNode(v) { infoNode = v; }
export function setInfoEdge(v) { infoEdge = v; }
export function setModalNode(v) { modalNode = v; }
export function setIsPanning(v) { isPanning = v; }
export function setPanStartX(v) { panStartX = v; }
export function setPanStartY(v) { panStartY = v; }
export function setLastPinchDist(v) { lastPinchDist = v; }
export function setPinchCenterX(v) { pinchCenterX = v; }
export function setPinchCenterY(v) { pinchCenterY = v; }
export function setMapParityCoverage(v) { mapParityCoverage = v; }
export function setSbOffline(v) { sbOffline = v; }
export function setSb(v) { sb = v; }
