// ── ZOOM, PAN, TOUCH, FLOW-STAGE FOCUS ────────────
import { ROW_LABELS, MOBILE_STAGES } from './config.js';
import {
  state, nodes,
  infoLocked,
  isPanning, panStartX, panStartY, lastPinchDist,
  setIsPanning, setPanStartX, setPanStartY,
  setLastPinchDist, setPinchCenterX, setPinchCenterY,
} from './state.js';

// Callbacks set by main.js to break circular deps with canvas.js
let _hideInfo = null;
let _isNodeVisible = null;
let _renderDiagram = null;
let _resetHoverInteractionState = null;
let _clearHoverState = null;

export function registerInteractionCallbacks(cbs) {
  if (cbs.hideInfo) _hideInfo = cbs.hideInfo;
  if (cbs.isNodeVisible) _isNodeVisible = cbs.isNodeVisible;
  if (cbs.renderDiagram) _renderDiagram = cbs.renderDiagram;
  if (cbs.resetHoverInteractionState) _resetHoverInteractionState = cbs.resetHoverInteractionState;
  if (cbs.clearHoverState) _clearHoverState = cbs.clearHoverState;
}

// ── Zoom / Pan ────────────────────────────────────
export function getDiagramBounds() {
  const vis = nodes.filter(_isNodeVisible);
  if (vis.length === 0) return { x: 0, y: 0, w: 1400, h: 1100 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  vis.forEach(function(n) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.w > maxX) maxX = n.x + n.w;
    if (n.y + n.h > maxY) maxY = n.y + n.h;
  });
  ROW_LABELS.forEach(function(rl) {
    if (rl.y >= minY - 20 && rl.y <= maxY + 20) {
      if (rl.x < minX) minX = rl.x;
      if (rl.y < minY) minY = rl.y;
    }
  });
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function fitToScreen() {
  const canvas = document.getElementById('canvas-area');
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (cw === 0 || ch === 0) return;
  const b = getDiagramBounds();
  const isMobile = window.innerWidth <= 1024;
  const pad = isMobile ? 20 : 30;
  const zx = (cw - pad * 2) / b.w;
  const zy = (ch - pad * 2) / b.h;
  const minReadableZoom = isMobile ? 0.35 : 0.25;
  state.zoom = Math.max(minReadableZoom, Math.min(1.5, Math.min(zx, zy)));
  state.panX = (cw - b.w * state.zoom) / 2 - b.x * state.zoom;
  if (isMobile) {
    state.panY = pad - b.y * state.zoom;
  } else {
    state.panY = (ch - b.h * state.zoom) / 2 - b.y * state.zoom;
  }
  _renderDiagram();
}

export function zoomIn()    { state.zoom = Math.min(3, state.zoom + 0.1); _renderDiagram(); }
export function zoomOut()   { state.zoom = Math.max(0.15, state.zoom - 0.1); _renderDiagram(); }
export function zoomReset() { fitToScreen(); }

// ── Canvas interactions (pan/zoom) ─────────────────
export function initCanvasInteractions() {
  const canvasArea = document.getElementById('canvas-area');

  canvasArea.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'rect') return;
    setIsPanning(true);
    setPanStartX(e.clientX - state.panX);
    setPanStartY(e.clientY - state.panY);
  });
  canvasArea.addEventListener('mousemove', function(e) {
    if (!isPanning) return;
    state.panX = e.clientX - panStartX;
    state.panY = e.clientY - panStartY;
    _renderDiagram();
  });
  canvasArea.addEventListener('mouseup', function() { setIsPanning(false); });
  canvasArea.addEventListener('mouseleave', function() { setIsPanning(false); });
  canvasArea.addEventListener('click', function(e) {
    if (e.target.tagName !== 'rect' && infoLocked && _hideInfo) _hideInfo();
  });
  canvasArea.addEventListener('wheel', function(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    state.zoom = Math.max(0.15, Math.min(3, state.zoom + delta));
    _renderDiagram();
  }, { passive: false });

  // Touch: pinch-to-zoom + single-finger pan
  canvasArea.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPanning(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastPinchDist(Math.sqrt(dx * dx + dy * dy));
      setPinchCenterX((e.touches[0].clientX + e.touches[1].clientX) / 2);
      setPinchCenterY((e.touches[0].clientY + e.touches[1].clientY) / 2);
    } else if (e.touches.length === 1) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'rect') return;
      setIsPanning(true);
      setPanStartX(e.touches[0].clientX - state.panX);
      setPanStartY(e.touches[0].clientY - state.panY);
    }
  }, { passive: false });
  canvasArea.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (lastPinchDist > 0) {
        const scale = dist / lastPinchDist;
        const newZoom = Math.max(0.15, Math.min(3, state.zoom * scale));
        const ratio = newZoom / state.zoom;
        state.panX = cx - (cx - state.panX) * ratio;
        state.panY = cy - (cy - state.panY) * ratio;
        state.zoom = newZoom;
        _renderDiagram();
      }
      setLastPinchDist(dist);
      setPinchCenterX(cx);
      setPinchCenterY(cy);
    } else if (e.touches.length === 1 && isPanning) {
      state.panX = e.touches[0].clientX - panStartX;
      state.panY = e.touches[0].clientY - panStartY;
      _renderDiagram();
    }
  }, { passive: false });
  canvasArea.addEventListener('touchend', function() {
    setIsPanning(false);
    setLastPinchDist(0);
  }, { passive: true });
}

// ── Flow stage focus ──────────────────────────────
export function clearFlowStageFocus() {
  const svg = document.getElementById('diagram');
  if (!svg) return;
  svg.removeAttribute('data-flow-stage-active');
  _resetHoverInteractionState();
  _clearHoverState();
  const nl = svg.querySelector('.node-layer');
  const cl = svg.querySelector('.conn-layer');
  const ll = svg.querySelector('.label-layer');
  if (nl) nl.querySelectorAll('.node-group').forEach(function(ng) { ng.classList.remove('dimmed', 'node-active'); });
  if (cl) cl.querySelectorAll('.conn-group').forEach(function(cg) { cg.classList.remove('dimmed'); });
  if (ll) ll.querySelectorAll('.conn-label-group').forEach(function(lg) { lg.classList.remove('dimmed'); });

  const nav = document.getElementById('sidebar-flow-nav');
  if (nav) nav.querySelectorAll('.flow-nav-item').forEach(function(el) {
    el.style.borderColor = '';
    el.removeAttribute('data-active');
  });
}

export function applyActiveFlowStage() {
  if (!state.activeFlowStage || state.viewMode !== 'flow') {
    clearFlowStageFocus();
    return;
  }

  const stage = MOBILE_STAGES.find(function(s) { return s.num === state.activeFlowStage; });
  if (!stage || !Array.isArray(stage.nodes) || stage.nodes.length === 0) {
    state.activeFlowStage = null;
    clearFlowStageFocus();
    return;
  }

  const svg = document.getElementById('diagram');
  if (!svg) return;
  svg.setAttribute('data-flow-stage-active', '1');
  const nl = svg.querySelector('.node-layer');
  const cl = svg.querySelector('.conn-layer');
  const ll = svg.querySelector('.label-layer');
  if (!nl || !cl) return;

  _resetHoverInteractionState();
  _clearHoverState();

  nl.querySelectorAll('.node-group').forEach(function(ng) { ng.classList.add('dimmed'); ng.classList.remove('node-active'); });
  cl.querySelectorAll('.conn-group').forEach(function(cg) { cg.classList.add('dimmed'); });
  if (ll) ll.querySelectorAll('.conn-label-group').forEach(function(lg) { lg.classList.add('dimmed'); });

  const stageSet = {};
  stage.nodes.forEach(function(nid) { stageSet[nid] = true; });
  stage.nodes.forEach(function(nid) {
    const ng = nl.querySelector('.node-group[data-node-id="'+nid+'"]');
    if (ng) { ng.classList.remove('dimmed'); ng.classList.add('node-active'); }

    cl.querySelectorAll('.conn-group[data-from="'+nid+'"], .conn-group[data-to="'+nid+'"]').forEach(function(cg) {
      const f = cg.getAttribute('data-from');
      const t = cg.getAttribute('data-to');
      if (stageSet[f] || stageSet[t]) {
        cg.classList.remove('dimmed');
        if (ll) {
          const lbl = ll.querySelector('.conn-label-group[data-from="'+f+'"][data-to="'+t+'"]');
          if (lbl) lbl.classList.remove('dimmed');
        }
      }
    });
  });

  const nav = document.getElementById('sidebar-flow-nav');
  if (nav) {
    nav.querySelectorAll('.flow-nav-item').forEach(function(el) {
      const isActive = el.getAttribute('data-stage') === String(stage.num);
      if (isActive) {
        el.style.borderColor = 'var(--interactive-primary)';
        el.setAttribute('data-active', '1');
      } else {
        el.style.borderColor = '';
        el.removeAttribute('data-active');
      }
    });
  }
}
