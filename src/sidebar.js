// ── SIDEBAR CONTROLS ──────────────────────────────
import { clearChildren, createEl } from './dom-helpers.js';
import { LAYERS, CONN_TYPES, PRESETS, VIEW_MODES, MOBILE_STAGES } from './config.js';
import { state, factsData, setInfoLocked } from './state.js';
import {
  renderDiagram, fitToScreen, clearFlowStageFocus, applyActiveFlowStage,
  resetHoverInteractionState
} from './canvas.js';
import { getStageHealth } from './panel.js';

// Set by main.js
let _updateAll = null;
let _renderMobileView = null;
let _toggleSidebar = null;

export function registerSidebarCallbacks(cbs) {
  _updateAll = cbs.updateAll;
  _renderMobileView = cbs.renderMobileView;
  _toggleSidebar = cbs.toggleSidebar;
}

let _filterDebounce = null;
export function filterNodes(query) {
  if (_filterDebounce) clearTimeout(_filterDebounce);
  _filterDebounce = setTimeout(function() {
    state.searchFilter = query.toLowerCase().trim();
    renderDiagram();
  }, 150);
}

export function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('hamburger');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
  btn.textContent = sidebar.classList.contains('open') ? '\u2715' : '\u2630';
}

export function applyPreset(id) {
  const p = PRESETS.find(function(pr) { return pr.id === id; });
  state.preset = id;
  Object.keys(state.layers).forEach(function(k) { state.layers[k] = p.layers.indexOf(k) >= 0; });
  Object.keys(state.conns).forEach(function(k) { state.conns[k] = p.conns.indexOf(k) >= 0; });
  if (_updateAll) _updateAll();
}

export function toggleLayer(k, v) { state.layers[k] = v; state.preset = ''; if (_updateAll) _updateAll(); }
export function toggleConn(k, v)  { state.conns[k] = v; state.preset = ''; if (_updateAll) _updateAll(); }

export function renderControls() {
  const presetsEl = document.getElementById('presets');
  clearChildren(presetsEl);
  PRESETS.forEach(function(p) {
    const btn = createEl('button', { className: 'preset-btn' + (state.preset===p.id?' active':'') }, p.label);
    btn.addEventListener('click', function() { applyPreset(p.id); if (window.innerWidth <= 1024) toggleSidebar(); });
    presetsEl.appendChild(btn);
  });

  const layerEl = document.getElementById('layer-toggles');
  clearChildren(layerEl);
  Object.entries(LAYERS).forEach(function(pair) {
    const k = pair[0], v = pair[1];
    const label = createEl('label', { className: 'layer-toggle' });
    const cb = createEl('input', { type: 'checkbox' });
    cb.checked = state.layers[k];
    cb.addEventListener('change', function() { toggleLayer(k, this.checked); });
    const dot = createEl('span', { className: 'layer-dot', style: 'background:' + v.dot });
    label.appendChild(cb);
    label.appendChild(dot);
    label.appendChild(document.createTextNode(v.label));
    layerEl.appendChild(label);
  });

  const connEl = document.getElementById('conn-toggles');
  clearChildren(connEl);
  Object.entries(CONN_TYPES).forEach(function(pair) {
    const k = pair[0], v = pair[1];
    const label = createEl('label', { className: 'conn-toggle' });
    const cb = createEl('input', { type: 'checkbox' });
    cb.checked = state.conns[k];
    cb.addEventListener('change', function() { toggleConn(k, this.checked); });
    const line = createEl('span', { className: 'conn-line', style: v.dash ? 'border-top:2px dashed '+v.color+';background:none' : 'background:'+v.color });
    label.appendChild(cb);
    label.appendChild(line);
    label.appendChild(document.createTextNode(v.label));
    connEl.appendChild(label);
  });

  const commEl = document.getElementById('comments-list');
  clearChildren(commEl);
  document.getElementById('comment-count').textContent = state.comments.length;
  if (state.comments.length === 0) {
    commEl.appendChild(createEl('div', { className: 'empty-comments' }, 'Click a component to comment'));
  } else {
    state.comments.forEach(function(c, i) {
      const item = createEl('div', { className: 'comment-item' });
      const del = createEl('button', { className: 'comment-del' }, 'x');
      del.addEventListener('click', function() { window.deleteComment(i); });
      const lbl = createEl('div', { className: 'comment-label' }, c.targetLabel);
      const meta = createEl('div', { className: 'comment-meta' });
      meta.textContent = (c.author || 'anonymous') + (c.created_at ? ' \u00b7 ' + new Date(c.created_at).toLocaleDateString() : '');
      const txt = createEl('div', { className: 'comment-text' }, c.text);
      item.appendChild(del);
      item.appendChild(lbl);
      item.appendChild(meta);
      item.appendChild(txt);
      commEl.appendChild(item);
    });
  }
}

export function renderFlowNav() {
  const nav = document.getElementById('sidebar-flow-nav');
  if (!nav) return;
  clearChildren(nav);
  MOBILE_STAGES.forEach(function(stage) {
    const item = createEl('div', { className: 'flow-nav-item' });
    item.setAttribute('data-stage', String(stage.num));

    const num = createEl('span', { className: 'flow-nav-num' }, String(stage.num));
    const label = createEl('span', {}, stage.label);
    const healthDot = createEl('span', { className: 'flow-nav-health' });
    const healthInfo = getStageHealth(stage);
    healthDot.style.background = healthInfo.color;
    healthDot.title = healthInfo.text || 'Unknown';

    const healthLabel = createEl('span', { className: 'flow-nav-health-label' });
    healthLabel.textContent = healthInfo.text || 'Unknown';
    healthLabel.style.cssText = 'font-size:9px;color:#64748b;margin-left:4px;flex-shrink:0;';

    item.appendChild(num);
    item.appendChild(label);
    item.appendChild(healthDot);
    item.appendChild(healthLabel);

    item.addEventListener('click', function() {
      if (state.activeFlowStage === stage.num) {
        state.activeFlowStage = null;
        clearFlowStageFocus();
        return;
      }
      const stageNodes = stage.nodes || [];
      if (!stageNodes.length) return;
      state.activeFlowStage = stage.num;
      applyActiveFlowStage();

      if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('show');
      }
    });

    nav.appendChild(item);
  });
}

export function applyViewMode(mode) {
  state.viewMode = mode;
  const svg = document.getElementById('diagram');
  if (svg) svg.setAttribute('data-view-mode', mode);
  const vm = VIEW_MODES[mode];

  if (vm.preset) {
    state.preset = vm.preset;
    const p = PRESETS.find(function(pr) { return pr.id === vm.preset; });
    if (p) {
      Object.keys(state.layers).forEach(function(k) {
        state.layers[k] = p.layers.indexOf(k) >= 0;
      });
      Object.keys(state.conns).forEach(function(k) {
        state.conns[k] = p.conns.indexOf(k) >= 0;
      });
    }
  }
  if (vm.layers) {
    Object.keys(state.layers).forEach(function(k) {
      state.layers[k] = vm.layers.indexOf(k) >= 0;
    });
  }
  if (vm.conns) {
    Object.keys(state.conns).forEach(function(k) {
      state.conns[k] = vm.conns.indexOf(k) >= 0;
    });
  }

  const isMobile = window.innerWidth <= 1024;
  const mobileView = document.getElementById('mobile-view');
  const layoutEls = document.querySelectorAll('.layout');

  if (isMobile) {
    if (mobileView) {
      mobileView.classList.add('active');
      mobileView.scrollTop = 0;
    }
    layoutEls.forEach(function(el) { el.classList.add('hidden-mobile'); });
    if (_renderMobileView) _renderMobileView();
  } else {
    if (mobileView) mobileView.classList.remove('active');
    layoutEls.forEach(function(el) { el.classList.remove('hidden-mobile'); });
    document.body.style.overflow = '';
  }

  const toggleBtns = document.querySelectorAll('.mode-toggle button');
  toggleBtns.forEach(function(btn) {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const sidebarFlowNav   = document.getElementById('sidebar-flow-nav');
  const presetsSection   = document.getElementById('presets-section');
  const layersSection    = document.getElementById('layers-section');
  const connsSection     = document.getElementById('conns-section');
  const commentsSection  = document.getElementById('comments-section');
  const statBar          = document.getElementById('stat-bar');
  const nowBarDesktop    = document.getElementById('now-bar-desktop');

  function showEl(el)  { if (el) el.style.display = ''; }
  function hideEl(el)  { if (el) el.style.display = 'none'; }

  if (mode === 'flow') {
    showEl(sidebarFlowNav);
    hideEl(presetsSection);
    hideEl(layersSection);
    hideEl(connsSection);
    hideEl(commentsSection);
    hideEl(statBar);
    renderFlowNav();
  } else {
    hideEl(sidebarFlowNav);
    showEl(presetsSection);
    showEl(layersSection);
    showEl(connsSection);
    showEl(commentsSection);
    showEl(statBar);
  }

  if (!isMobile && nowBarDesktop) {
    nowBarDesktop.classList.add('active');
  }

  if (_updateAll) _updateAll();
  if (!isMobile) fitToScreen();
}

export function renderStatBar() {
  if (!factsData) return;
  const el = document.getElementById('stat-bar');
  if (!el) return;
  const d = factsData.db || {};
  let ef = 'n/a';
  if (factsData.edge_functions && typeof factsData.edge_functions.count === 'number') {
    ef = String(factsData.edge_functions.count);
  }
  const rl = (factsData.runtime_lineage && factsData.runtime_lineage.count) || 0;
  const tables = d.tables || 0;
  const views = d.views || 0;
  const migrations = d.applied_migrations || 0;
  const fns = d.functions || 0;
  el.textContent = '';
  el.appendChild(document.createTextNode(
    ef + ' Edge Functions \u00b7 ' + fns + ' DB functions \u00b7 ' + rl + ' lineage chains'));
  el.appendChild(document.createElement('br'));
  el.appendChild(document.createTextNode(
    tables + ' tables \u00b7 ' + views + ' views \u00b7 ' + migrations + ' migrations'));
}
