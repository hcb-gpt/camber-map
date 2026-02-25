// ── SVG RENDERING, HOVER, VIEW TRANSFORMS ──
import { createSvgEl } from './dom-helpers.js';
import { LAYERS, CONN_TYPES, ROW_LABELS, VIEW_MODES, FRIENDLY_COPY, isFlowParityNode } from './config.js';
import { applyActiveFlowStage } from './canvas-interactions.js';
import {
  state, nodes, connections, flowEdges,
  hoveredNodeId, hoveredConnKey, connHoverTimer, nodeHoverTimer,
  infoLocked, setInfoLocked,
  setConnHoverTimer, setNodeHoverTimer,
  setHoveredNodeId, setHoveredConnKey,
} from './state.js';

let _showInfo = null, _showEdgeInfo = null, _hideInfo = null;
export function registerPanelCallbacks(cbs) {
  _showInfo = cbs.showInfo;
  _showEdgeInfo = cbs.showEdgeInfo;
  _hideInfo = cbs.hideInfo;
}
export function isPlainMode() { return state && state.viewMode === 'plain'; }

const PLAIN_LAYER = { external:'Outside service', pipeline:'Pipeline step', module:'Building block', data:'Stored data', devops:'Tooling' };
const LAYER_LABEL = { external:'Outside services', pipeline:'Main pipeline steps', module:'Supporting building blocks', data:'Stored data', devops:'Tools & automation' };
export function layerLabel(id) { return LAYER_LABEL[id] || (LAYERS[id] ? LAYERS[id].label : id); }
export function _plainLayerLabel(id) { return PLAIN_LAYER[id] || layerLabel(id); }

export function _deJargon(s) {
  return (s || '')
    .replace(/Supabase Edge Function/gi, 'backend step')
    .replace(/Edge Function/gi, 'backend step')
    .replace(/RPC/gi, 'database function')
    .replace(/webhook/gi, 'automated callback')
    .replace(/cron job/gi, 'scheduled job')
    .replace(/JSON/gi, 'structured data')
    .replace(/Postgres/gi, 'database')
    .replace(/SQL/gi, 'database query');
}

export function _sentenceFirst(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const i = t.indexOf('.');
  if (i > 40 && i < 180) return t.slice(0, i + 1);
  return (t.length > 160) ? (t.slice(0, 160).trim() + '\u2026') : t;
}

export function derivePlainDesc(n) {
  if (!n) return '';
  let t = (n.desc || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/\(v[^\)]*\)/g, '').replace(/\(\d{1,3}(,\d{3})* lines\)/gi, '');
  let first = _sentenceFirst(t);
  first = _deJargon(first);
  if (first && first.length < 90) {
    const rest = t.slice(first.length).trim();
    if (rest) {
      let second = _sentenceFirst(rest);
      second = _deJargon(second);
      if (second && second.toLowerCase() !== first.toLowerCase()) {
        first = (first + ' ' + second).trim();
      }
    }
  }
  return first;
}

export function viewNode(n) {
  if (!n) return n;
  if (!isPlainMode()) return n;
  const c = FRIENDLY_COPY[n.id] || {};
  const v = Object.assign({}, n);
  v._technicalLabel = n.label;
  v._technicalSubtitle = n.subtitle;
  v._technicalDesc = n.desc;
  v.label = c.label || n.label;
  v.subtitle = c.subtitle || (_plainLayerLabel(n.layer) + ' \u00b7 ' + n.id);
  v.summary = c.summary || derivePlainDesc(n);
  v.desc = c.desc || v.summary || '';
  return v;
}

export function isNodeVisible(n) {
  const vm = VIEW_MODES[state.viewMode];
  const flowParityOverride = (state.viewMode === 'flow' && isFlowParityNode(n.id));
  if (vm && vm.hideNodes && vm.hideNodes.indexOf(n.id) >= 0 && !flowParityOverride) return false;
  if (!state.layers[n.layer] && !flowParityOverride) return false;
  if (state.searchFilter) {
    const vn = viewNode(n);
    const hay = [
      vn.label || '', vn.subtitle || '', vn.desc || '',
      n.label || '', n.subtitle || '', n.desc || ''
    ].join(' ').toLowerCase();
    if (hay.indexOf(state.searchFilter) < 0) return false;
  }
  return true;
}

export function resetHoverInteractionState() {
  if (connHoverTimer) { clearTimeout(connHoverTimer); setConnHoverTimer(null); }
  if (nodeHoverTimer) { clearTimeout(nodeHoverTimer); setNodeHoverTimer(null); }
  setHoveredNodeId(null);
  setHoveredConnKey(null);
}

export function applyHoverState() {
  const svg = document.getElementById('diagram');
  if (!svg) return;
  const nl = svg.querySelector('.node-layer'), cl = svg.querySelector('.conn-layer'), ll = svg.querySelector('.label-layer');
  if (!nl || !cl) return;
  const currentHoveredNodeId = hoveredNodeId;
  const currentHoveredConnKey = hoveredConnKey;
  if (currentHoveredNodeId) {
    const nid = currentHoveredNodeId;
    nl.querySelectorAll('.node-group').forEach(function(el) { el.classList.add('dimmed'); });
    cl.querySelectorAll('.conn-group').forEach(function(el) { el.classList.add('dimmed'); });
    const ng = nl.querySelector('.node-group[data-node-id="'+nid+'"]');
    if (ng) {
      ng.classList.remove('dimmed');
      ng.classList.add('node-active');
      const r = ng.querySelector('.node-rect');
      if (r) r.setAttribute('fill', r.getAttribute('data-active-fill') || r.getAttribute('fill'));
    }
    const connGroups = cl.querySelectorAll('.conn-group[data-from="'+nid+'"], .conn-group[data-to="'+nid+'"]');
    const peerIds = {};
    connGroups.forEach(function(cg) {
      cg.classList.remove('dimmed');
      cg.classList.add('conn-active');
      const f = cg.getAttribute('data-from'), t = cg.getAttribute('data-to');
      if (f && f !== nid) peerIds[f] = true;
      if (t && t !== nid) peerIds[t] = true;
    });
    Object.keys(peerIds).forEach(function(pid) {
      const pg = nl.querySelector('.node-group[data-node-id="'+pid+'"]');
      if (!pg) return;
      pg.classList.remove('dimmed');
      pg.classList.add('node-active');
      const pr = pg.querySelector('.node-rect');
      if (pr) pr.setAttribute('fill', pr.getAttribute('data-active-fill') || pr.getAttribute('fill'));
    });
    if (ll) {
      const lbls = ll.querySelectorAll('.conn-label-group[data-from="'+nid+'"], .conn-label-group[data-to="'+nid+'"]');
      lbls.forEach(function(l) { l.classList.add('label-active'); });
    }
  } else if (currentHoveredConnKey) {
    const parts = currentHoveredConnKey.split('\u2192');
    const fromId = parts[0], toId = parts[1];
    cl.querySelectorAll('.conn-group').forEach(function(cg) { cg.classList.add('dimmed'); });
    nl.querySelectorAll('.node-group').forEach(function(ng) { ng.classList.add('dimmed'); });
    const cg = cl.querySelector('.conn-group[data-from="'+fromId+'"][data-to="'+toId+'"]');
    if (cg) cg.classList.remove('dimmed');
    [fromId, toId].forEach(function(nid) {
      const ng = nl.querySelector('.node-group[data-node-id="'+nid+'"]');
      if (!ng) return;
      ng.classList.remove('dimmed');
      ng.classList.add('node-active');
      const r = ng.querySelector('.node-rect');
      if (r) r.setAttribute('fill', r.getAttribute('data-active-fill') || r.getAttribute('fill'));
    });
    if (ll) {
      const lbl = ll.querySelector('.conn-label-group[data-from="'+fromId+'"][data-to="'+toId+'"]');
      if (lbl) lbl.classList.add('label-active');
    }
  }
}

export function clearHoverState() {
  const svg = document.getElementById('diagram');
  if (!svg) return;
  const nl = svg.querySelector('.node-layer'), cl = svg.querySelector('.conn-layer'), ll = svg.querySelector('.label-layer');
  if (cl) cl.querySelectorAll('.dimmed, .conn-active').forEach(function(el) { el.classList.remove('dimmed', 'conn-active'); });
  if (nl) {
    nl.querySelectorAll('.dimmed, .node-active').forEach(function(el) {
      el.classList.remove('dimmed', 'node-active');
      const ar = el.querySelector('.node-rect');
      if (ar) ar.setAttribute('fill', ar.getAttribute('data-base-fill') || ar.getAttribute('fill'));
    });
  }
  if (ll) ll.querySelectorAll('.label-active').forEach(function(l) { l.classList.remove('label-active'); });
}

export function drawConn(g, c, lblLayer) {
  const from = nodes.find(function(n) { return n.id === c.from; });
  const to = nodes.find(function(n) { return n.id === c.to; });
  if (!from || !to) return;
  const ct = CONN_TYPES[c.type];
  if (!ct) return;

  const R = 6;
  let x1, y1, x2, y2, mx, my, d;
  let arrowDir = 'down';

  const fromCx = from.x + from.w/2, fromCy = from.y + from.h/2;
  const toCx = to.x + to.w/2, toCy = to.y + to.h/2;

  if (from.y + from.h <= to.y) {
    arrowDir = 'down';
    x1 = fromCx; y1 = from.y + from.h;
    x2 = toCx;   y2 = to.y;
    my = (y1 + y2) / 2;
    mx = (x1 + x2) / 2;
    if (Math.abs(x1 - x2) < 2) {
      d = 'M'+x1+','+y1+' L'+x2+','+y2;
    } else {
      d = 'M'+x1+','+y1
        +' L'+x1+','+(my-R)
        +' Q'+x1+','+my+' '+(x1 < x2 ? x1+R : x1-R)+','+my
        +' L'+(x2 < x1 ? x2+R : x2-R)+','+my
        +' Q'+x2+','+my+' '+x2+','+(my+R)
        +' L'+x2+','+y2;
    }
  } else if (from.y >= to.y + to.h) {
    arrowDir = 'up';
    x1 = fromCx; y1 = from.y;
    x2 = toCx;   y2 = to.y + to.h;
    my = (y1 + y2) / 2;
    mx = (x1 + x2) / 2;
    if (Math.abs(x1 - x2) < 2) {
      d = 'M'+x1+','+y1+' L'+x2+','+y2;
    } else {
      d = 'M'+x1+','+y1
        +' L'+x1+','+(my+R)
        +' Q'+x1+','+my+' '+(x1 < x2 ? x1+R : x1-R)+','+my
        +' L'+(x2 < x1 ? x2+R : x2-R)+','+my
        +' Q'+x2+','+my+' '+x2+','+(my-R)
        +' L'+x2+','+y2;
    }
  } else {
    const goRight = fromCx <= toCx;
    arrowDir = goRight ? 'right' : 'left';
    x1 = goRight ? from.x + from.w : from.x;
    y1 = fromCy;
    x2 = goRight ? to.x : to.x + to.w;
    y2 = toCy;
    mx = (x1 + x2) / 2;
    my = (y1 + y2) / 2;
    if (Math.abs(y1 - y2) < 2) {
      d = 'M'+x1+','+y1+' L'+x2+','+y2;
    } else {
      d = 'M'+x1+','+y1
        +' L'+(mx-R)+','+y1
        +' Q'+mx+','+y1+' '+mx+','+(y1 < y2 ? y1+R : y1-R)
        +' L'+mx+','+(y2 < y1 ? y2+R : y2-R)
        +' Q'+mx+','+y2+' '+(mx < x2 ? mx+R : mx-R)+','+y2
        +' L'+x2+','+y2;
    }
  }

  const grp = createSvgEl('g', { class: 'conn-group', 'data-from': c.from, 'data-to': c.to });

  grp.addEventListener('pointerenter', function() {
    if (state.activeFlowStage) {
      resetHoverInteractionState();
      if (!infoLocked && _showEdgeInfo) _showEdgeInfo(c);
      return;
    }
    if (connHoverTimer) { clearTimeout(connHoverTimer); setConnHoverTimer(null); }
    setHoveredConnKey(c.from + '\u2192' + c.to);
    setHoveredNodeId(null);
    clearHoverState();
    applyHoverState();
    if (!infoLocked && _showEdgeInfo) _showEdgeInfo(c);
  });
  grp.addEventListener('pointerleave', function() {
    if (state.activeFlowStage) {
      if (connHoverTimer) { clearTimeout(connHoverTimer); setConnHoverTimer(null); }
      return;
    }
    if (connHoverTimer) { clearTimeout(connHoverTimer); }
    const capturedKey = c.from + '\u2192' + c.to;
    setConnHoverTimer(setTimeout(function() {
      setConnHoverTimer(null);
      if (hoveredConnKey !== capturedKey) return;
      setHoveredConnKey(null);
      clearHoverState();
      if (!infoLocked && _hideInfo) _hideInfo();
    }, 300));
  });
  grp.addEventListener('click', function(e) {
    e.stopPropagation();
    setInfoLocked(true);
    if (_showEdgeInfo) _showEdgeInfo(c);
  });

  const hit = createSvgEl('path', { class: 'conn-hit', d: d });
  grp.appendChild(hit);

  const path = createSvgEl('path', { class: 'conn-path', d: d, fill: 'none', stroke: ct.color, 'stroke-width': '2' });
  if (ct.dash) path.setAttribute('stroke-dasharray', ct.dash);
  grp.appendChild(path);

  const AW = 3, AH = 7;
  let arrowPts;
  if (arrowDir === 'down') {
    arrowPts = (x2-AW)+','+(y2-AH)+' '+x2+','+y2+' '+(x2+AW)+','+(y2-AH);
  } else if (arrowDir === 'up') {
    arrowPts = (x2-AW)+','+(y2+AH)+' '+x2+','+y2+' '+(x2+AW)+','+(y2+AH);
  } else if (arrowDir === 'right') {
    arrowPts = (x2-AH)+','+(y2-AW)+' '+x2+','+y2+' '+(x2-AH)+','+(y2+AW);
  } else {
    arrowPts = (x2+AH)+','+(y2-AW)+' '+x2+','+y2+' '+(x2+AH)+','+(y2+AW);
  }
  grp.appendChild(createSvgEl('polygon', { class: 'conn-arrow', points: arrowPts, fill: ct.color }));

  g.appendChild(grp);

  if (c.label && lblLayer) {
    const labelGrp = createSvgEl('g', { class: 'conn-label-group', 'data-from': c.from, 'data-to': c.to });
    const pillW = c.label.length * 5 + 8;
    const pillH = 14;
    labelGrp.appendChild(createSvgEl('rect', { x: mx - pillW/2, y: my - 4 - pillH/2, width: pillW, height: pillH, rx: '3', ry: '3', fill: '#FFFFFF', stroke: '#D5D7DA', 'stroke-width': '1' }));
    labelGrp.appendChild(createSvgEl('text', { x: mx, y: my - 4, 'text-anchor': 'middle', fill: ct.color, 'font-size': '8', 'font-family': 'system-ui', 'dominant-baseline': 'central' }, c.label));
    lblLayer.appendChild(labelGrp);

    labelGrp.addEventListener('pointerenter', function(e) {
      e.stopPropagation();
      if (state.activeFlowStage) return;
      if (connHoverTimer) { clearTimeout(connHoverTimer); setConnHoverTimer(null); }
      labelGrp.classList.add('label-active');
    });
    labelGrp.addEventListener('pointerleave', function() {
      if (state.activeFlowStage) return;
      try { grp.dispatchEvent(new PointerEvent('pointerleave')); } catch (e) {}
    });
    labelGrp.addEventListener('click', function(e) {
      e.stopPropagation();
      setInfoLocked(true);
      if (_showEdgeInfo) _showEdgeInfo(c);
    });
  }
}

export function renderDiagram() {
  const svg = document.getElementById('diagram');
  const toRemove = [];
  for (let i = 0; i < svg.children.length; i++) {
    if (svg.children[i].tagName !== 'defs') toRemove.push(svg.children[i]);
  }
  toRemove.forEach(function(c) { svg.removeChild(c); });

  const g = createSvgEl('g', { transform: 'translate('+state.panX+','+state.panY+') scale('+state.zoom+')' });

  ROW_LABELS.forEach(function(rl) {
    const anyVisible = nodes.some(function(n) {
      return isNodeVisible(n) && Math.abs(n.y - (rl.y + 5)) < 65;
    });
    if (!anyVisible) return;
    g.appendChild(createSvgEl('text', { class: 'row-label', x: rl.x, y: rl.y, 'text-anchor': 'start' }, rl.text));
    const laneLineX1 = rl.x + rl.text.length * 7.5 + 20;
    g.appendChild(createSvgEl('line', { x1: laneLineX1, y1: rl.y, x2: 2000, y2: rl.y, stroke: '#D5D7DA', 'stroke-width': '0.75', 'stroke-dasharray': '6 4', 'stroke-opacity': '0.7' }));
  });

  const visibleNodes = nodes.filter(isNodeVisible);
  const visibleIds = {};
  visibleNodes.forEach(function(n0) {
    const n = viewNode(n0); visibleIds[n.id] = true; });

  const connLayer = createSvgEl('g', { class: 'conn-layer' });
  const nodeLayer = createSvgEl('g', { class: 'node-layer' });
  const labelLayer = createSvgEl('g', { class: 'label-layer' });
  g.appendChild(connLayer);
  g.appendChild(nodeLayer);
  g.appendChild(labelLayer);

  const drawnEdges = {};
  connections.forEach(function(c) {
    if (!state.conns[c.type]) return;
    if (!visibleIds[c.from] || !visibleIds[c.to]) return;
    drawConn(connLayer, c, labelLayer);
    drawnEdges[c.from + '\u2192' + c.to] = true;
  });

  if (state.viewMode === 'flow' && flowEdges.length > 0) {
    flowEdges.forEach(function(fe) {
      const key = fe.from + '\u2192' + fe.to;
      if (drawnEdges[key]) return;
      const fromNode = nodes.find(function(n) { return n.id === fe.from; });
      const toNode = nodes.find(function(n) { return n.id === fe.to; });
      if (!fromNode || !toNode) return;
      drawConn(connLayer, fe, labelLayer);
      drawnEdges[key] = true;
    });
  }

  visibleNodes.forEach(function(n0) {
    const n = viewNode(n0);
    const layer = LAYERS[n.layer];
    const hasComment = state.comments.some(function(c) { return c.target === n.id; });
    const isSearchMatch = state.searchFilter && (n.label.toLowerCase().indexOf(state.searchFilter) >= 0);

    const ng = createSvgEl('g', { class: 'node-group', 'data-node-id': n.id });

    ng.appendChild(createSvgEl('rect', {
      class: 'node-hit',
      x: n.x,
      y: n.y,
      width: n.w,
      height: n.h
    }));

    const rect = createSvgEl('rect', {
      class: 'node-rect' + (hasComment ? ' commented' : ''),
      'data-base-fill': layer.color,
      'data-active-fill': layer.colorActive,
      x: n.x, y: n.y, width: n.w, height: n.h,
      fill: layer.color,
      stroke: hasComment ? '#D97706' : (isSearchMatch ? '#22d3ee' : layer.stroke),
      'stroke-opacity': hasComment ? '1' : (isSearchMatch ? '1' : '0.6'),
      'stroke-width': isSearchMatch ? '2.5' : '1.5'
    });
    ng.appendChild(rect);

    const maxChars = Math.floor((n.w - 16) / 6.5);
    const subtitleText = n.subtitle.length > maxChars ? n.subtitle.slice(0, maxChars-2)+'..' : n.subtitle;
    ng.appendChild(createSvgEl('text', { class: 'node-title', x: n.x + 8, y: n.y + 16 }, n.label));
    ng.appendChild(createSvgEl('text', { class: 'node-sub', x: n.x + 8, y: n.y + 29 }, subtitleText));

    if (hasComment) {
      const count = state.comments.filter(function(c) { return c.target === n.id; }).length;
      ng.appendChild(createSvgEl('circle', { class: 'node-badge', cx: n.x + n.w - 6, cy: n.y + 6, r: 5, fill: '#D97706' }));
      ng.appendChild(createSvgEl('text', {
        class: 'node-badge-text',
        x: n.x + n.w - 6,
        y: n.y + 9,
        'text-anchor': 'middle',
        fill: '#FFFFFF',
        'font-size': '7',
        'font-weight': '700'
      }, String(count)));
    }

    ng.addEventListener('click', function(e) {
      e.stopPropagation();
      setInfoLocked(true);
      if (_showInfo) _showInfo(n);
    });
    ng.addEventListener('pointerenter', function() {
      if (state.activeFlowStage) {
        resetHoverInteractionState();
        if (!infoLocked && _showInfo) _showInfo(n);
        return;
      }
      if (nodeHoverTimer) { clearTimeout(nodeHoverTimer); setNodeHoverTimer(null); }
      setHoveredNodeId(n.id);
      setHoveredConnKey(null);
      if (!infoLocked && _showInfo) _showInfo(n);
      applyHoverState();
    });
    ng.addEventListener('pointerleave', function() {
      if (state.activeFlowStage) {
        if (nodeHoverTimer) { clearTimeout(nodeHoverTimer); setNodeHoverTimer(null); }
        return;
      }
      if (nodeHoverTimer) { clearTimeout(nodeHoverTimer); }
      const capturedId = n.id;
      setNodeHoverTimer(setTimeout(function() {
        setNodeHoverTimer(null);
        if (hoveredNodeId !== capturedId) return;
        setHoveredNodeId(null);
        clearHoverState();
        if (!infoLocked && _hideInfo) _hideInfo();
      }, 120));
    });

    nodeLayer.appendChild(ng);
  });

  svg.appendChild(g);
  if (!state.activeFlowStage && (hoveredNodeId || hoveredConnKey)) applyHoverState();
  applyActiveFlowStage();
}

export {
  getDiagramBounds, fitToScreen, zoomIn, zoomOut, zoomReset,
  initCanvasInteractions,
  clearFlowStageFocus, applyActiveFlowStage,
  registerInteractionCallbacks,
} from './canvas-interactions.js';
