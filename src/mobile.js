// ── MOBILE-SPECIFIC UI ────────────────────────────
import { clearChildren, createEl } from './dom-helpers.js';
import { LAYERS, CONN_TYPES, MOBILE_STAGES } from './config.js';
import { state, nodes, connections } from './state.js';
import { viewNode, isNodeVisible, isPlainMode, layerLabel } from './canvas.js';
import { getStageHealth } from './panel.js';

export function getNodeById(id) {
  const n = nodes.find(function(n) { return n.id === id; }) || null;
  return viewNode(n);
}

export function visibleNodeIds() {
  const ids = {};
  nodes.filter(isNodeVisible).forEach(function(n) { ids[n.id] = true; });
  return ids;
}

export function getVisibleConnections() {
  const ids = visibleNodeIds();
  return connections.filter(function(c) {
    if (!state.conns[c.type]) return false;
    if (!ids[c.from] || !ids[c.to]) return false;
    return true;
  });
}

export function connLabel(type) {
  const map = {
    'data-flow': 'Data moves',
    'fire-forget': 'Triggers',
    'tool-call': 'External call',
    'event': 'Async event',
    'dependency': 'Depends on',
    'rpc': 'DB function'
  };
  return map[type] || (CONN_TYPES[type] ? CONN_TYPES[type].label : type);
}

export function _sentenceFirstMobile(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const i = t.indexOf('.');
  if (i > 40 && i < 180) return t.slice(0, i + 1);
  return (t.length > 160) ? (t.slice(0, 160).trim() + '\u2026') : t;
}

export function deriveSummary(n) {
  if (!n) return '';
  if (n.summary) return n.summary;

  const subtitle = (n.subtitle || '').trim();
  let first = _sentenceFirstMobile(n.desc || '');

  first = first
    .replace(/Supabase Edge Function/gi, 'backend service')
    .replace(/Edge Function/gi, 'backend service')
    .replace(/RPC/gi, 'database function')
    .replace(/webhook/gi, 'automated callback')
    .replace(/cron job/gi, 'scheduled job')
    .replace(/JSON/gi, 'structured data')
    .replace(/Postgres/gi, 'database')
    .replace(/SQL/gi, 'database query');

  let s = '';
  if (subtitle) {
    s = subtitle.charAt(0).toUpperCase() + subtitle.slice(1);
    if (first && first.toLowerCase().indexOf(subtitle.toLowerCase()) !== 0) s += '. ' + first;
  } else {
    s = first;
  }

  s = (s || '').trim();
  if (s.length > 220) s = s.slice(0, 220).trim() + '\u2026';
  return s;
}

export function ensureSummaries() {
  if (Array.isArray(nodes)) {
    nodes.forEach(function(n) {
      if (!n.summary) n.summary = deriveSummary(n);
    });
  }
  if (Array.isArray(MOBILE_STAGES)) {
    MOBILE_STAGES.forEach(function(s) {
      if (!s.summary) s.summary = s.purpose || s.why || '';
    });
  }
}

export function _escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function highlightMatch(text, query) {
  if (!query || !text) return _escapeHtml(text || '');
  const safe = _escapeHtml(text);
  const safeQ = _escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Search highlight uses pre-escaped content only
  return safe.replace(new RegExp('(' + safeQ + ')', 'gi'),
    '<span style="background:rgba(37,99,235,0.15);border-radius:2px;padding:0 2px;">$1</span>');
}

// ── RENDER MOBILE VIEW ────────────────────────────
export function renderMobileView() {
  const stagesEl = document.getElementById('mobile-stages');
  const explorerEl = document.getElementById('mobile-explorer');

  if (state.viewMode === 'flow') {
    if (explorerEl) explorerEl.classList.remove('active');
    if (stagesEl) stagesEl.style.display = '';
    renderMobileFlowCards();
  } else {
    if (stagesEl) stagesEl.style.display = 'none';
    if (explorerEl) explorerEl.classList.add('active');
    renderMobileExplorer();
  }
}

export function renderMobileFlowCards() {
  const container = document.getElementById('mobile-stages');
  if (!container) return;
  clearChildren(container);

  const searchBar = createEl('div', { className: 'mobile-flow-search-bar' });
  const searchInput = createEl('input', {
    className: 'mobile-search',
    id: 'mobile-flow-search',
    type: 'text',
    placeholder: 'Search stages, steps, or services\u2026'
  });
  searchInput.addEventListener('input', function() { filterNodesMobile(this.value); });
  if (state.searchFilter) searchInput.value = state.searchFilter;
  searchBar.appendChild(searchInput);
  container.appendChild(searchBar);

  const query = (state.searchFilter || '').toLowerCase();
  let visibleCount = 0;

  for (let s = 0; s < MOBILE_STAGES.length; s++) {
    const stage = MOBILE_STAGES[s];

    if (query) {
      let haystack = [stage.label, stage.purpose, stage.why || ''].join(' ');
      for (let ni = 0; ni < stage.nodes.length; ni++) {
        for (let ki = 0; ki < nodes.length; ki++) {
          if (nodes[ki].id === stage.nodes[ni]) {
            haystack += ' ' + (nodes[ki].label || '') + ' ' + (nodes[ki].subtitle || '') + ' ' + (nodes[ki].desc || '');
            break;
          }
        }
      }
      if (haystack.toLowerCase().indexOf(query) < 0) continue;
    }

    if (visibleCount > 0) {
      const arrow = createEl('div', { className: 'stage-arrow' }, '\u25bc');
      container.appendChild(arrow);
    }
    visibleCount++;

    const health = getStageHealth(stage);

    const card = createEl('div', { className: 'stage-card', 'data-stage': String(stage.num) });

    const header = createEl('div', { className: 'stage-header' });
    const headerTop = createEl('div', { className: 'stage-header-top' });
    const stageNum = createEl('div', { className: 'stage-num' }, 'Stage ' + stage.num);
    const stageLabel = createEl('div', { className: 'stage-label' }, stage.label);

    const stageHealth = createEl('div', { className: 'stage-health' });
    const dot = createEl('span', { className: 'health-dot ' + health.dotClass });
    dot.style.background = health.color;
    stageHealth.appendChild(dot);
    const healthText = createEl('span', { className: 'health-text' }, health.text);
    stageHealth.appendChild(healthText);

    headerTop.appendChild(stageNum);
    headerTop.appendChild(stageLabel);
    headerTop.appendChild(stageHealth);
    header.appendChild(headerTop);

    const stagePurpose = createEl('div', { className: 'stage-purpose' }, stage.purpose);
    header.appendChild(stagePurpose);

    (function(cardEl) {
      header.addEventListener('click', function() {
        const allCards = container.querySelectorAll('.stage-card');
        for (let i = 0; i < allCards.length; i++) {
          if (allCards[i] !== cardEl) allCards[i].classList.remove('expanded');
        }
        cardEl.classList.toggle('expanded');
      });
    })(card);

    card.appendChild(header);

    const stageWhy = createEl('div', { className: 'stage-why' }, stage.why);
    card.appendChild(stageWhy);

    const body = createEl('div', { className: 'stage-body' });

    for (let n = 0; n < stage.nodes.length; n++) {
      const nodeId = stage.nodes[n];
      let node = null;
      for (let k = 0; k < nodes.length; k++) {
        if (nodes[k].id === nodeId) { node = nodes[k]; break; }
      }
      if (!node) continue;

      const nodeEl = createEl('div', { className: 'stage-node' });
      const layerInfo = (node.layer && LAYERS[node.layer]) ? LAYERS[node.layer] : null;
      const layerDotEl = createEl('span', { className: 'stage-node-layer' });
      if (layerInfo) {
        layerDotEl.style.background = layerInfo.dot;
        layerDotEl.title = layerInfo.label;
      }
      nodeEl.appendChild(layerDotEl);

      const nodeLabelEl = createEl('span', { className: 'stage-node-label' }, node.label);
      nodeEl.appendChild(nodeLabelEl);

      if (node.subtitle) {
        const nodeSubEl = createEl('span', { className: 'stage-node-subtitle' }, node.subtitle);
        nodeEl.appendChild(nodeSubEl);
      }

      if (node.desc) {
        const descText = node.desc.length > 200 ? node.desc.slice(0, 200) + '...' : node.desc;
        const nodeDescEl = createEl('div', { className: 'stage-node-desc' }, descText);
        nodeEl.appendChild(nodeDescEl);
      }

      body.appendChild(nodeEl);
    }

    card.appendChild(body);
    container.appendChild(card);
  }

  if (query && visibleCount === 0) {
    const empty = createEl('div', { className: 'changes-empty' }, 'No stages match \u201c' + state.searchFilter + '\u201d');
    container.appendChild(empty);
  }

  const focusTarget = document.getElementById('mobile-flow-search');
  if (focusTarget && document.activeElement !== focusTarget && query) {
    focusTarget.focus();
    focusTarget.setSelectionRange(focusTarget.value.length, focusTarget.value.length);
  }
}

export function filterNodesMobile(query) {
  state.searchFilter = (query || '').toLowerCase().trim();
  renderMobileView();
}

export function renderMobileExplorer() {
  const listEl = document.getElementById('mobile-explorer-list');
  const searchEl = document.getElementById('mobile-search');
  if (!listEl) return;
  clearChildren(listEl);

  const modeClass = 'mode-system';

  if (searchEl && (searchEl.value || '') !== (state.searchFilter || '')) {
    if (!searchEl.value) searchEl.value = state.searchFilter || '';
  }

  const barEl = document.querySelector('.mobile-explorer-bar');
  let oldCountEl = barEl ? barEl.querySelector('.mx-search-count') : null;
  if (oldCountEl) oldCountEl.remove();
  if (barEl && state.searchFilter) {
    const filteredCount = nodes.filter(isNodeVisible).length;
    const countEl = createEl('div', { className: 'mx-search-count' });
    countEl.style.cssText = 'font-size:11px;color:var(--text-tertiary,#556677);font-family:monospace;padding:4px 16px;';
    countEl.textContent = filteredCount + ' results for \u2018' + state.searchFilter + '\u2019';
    barEl.appendChild(countEl);
  }

  if (barEl) {
    const oldHint = barEl.querySelector('.mx-mode-hint');
    if (oldHint) oldHint.remove();
    const hintText = 'All components and connections';
    const hint = createEl('div', { className: 'mx-mode-hint' }, hintText);
    barEl.appendChild(hint);
  }

  const visibleNodesArr = nodes.filter(isNodeVisible);
  const conns = getVisibleConnections();

  const layerOrder = ['external','pipeline','module','data','devops'];

  layerOrder.forEach(function(layerId) {
    if (!state.layers[layerId]) return;
    const group = visibleNodesArr.filter(function(n) { return n.layer === layerId; });
    if (!group.length) return;

    const sec = createEl('div', { className: 'mx-section' });
    const title = createEl('div', { className: 'mx-section-title ' + modeClass });
    title.appendChild(createEl('div', {}, layerLabel(layerId)));
    title.appendChild(createEl('div', { className: 'mx-count' }, String(group.length)));
    sec.appendChild(title);

    group.sort(function(a,b) {
      let aDeg = 0, bDeg = 0;
      conns.forEach(function(c) {
        if (c.from === a.id || c.to === a.id) aDeg++;
        if (c.from === b.id || c.to === b.id) bDeg++;
      });
      return bDeg - aDeg;
    });

    group.forEach(function(n0) {
      const n = viewNode(n0);
      const item = createEl('div', { className: 'mx-item ' + modeClass, role: 'button', tabindex: '0' });
      const titleEl = createEl('div', { className: 'mx-item-title' });
      if (state.searchFilter) {
        // highlightMatch uses pre-escaped content only (safe)
        titleEl.innerHTML = highlightMatch(n.label || n.id, state.searchFilter);
      } else {
        titleEl.textContent = n.label || n.id;
      }
      item.appendChild(titleEl);
      const blurb = (n.summary || deriveSummary(n) || n.subtitle || '').trim();
      if (blurb) {
        const subEl = createEl('div', { className: 'mx-item-sub' });
        if (state.searchFilter) {
          // highlightMatch uses pre-escaped content only (safe)
          subEl.innerHTML = highlightMatch(blurb, state.searchFilter);
        } else {
          subEl.textContent = blurb;
        }
        item.appendChild(subEl);
      }

      const meta = createEl('div', { className: 'mx-item-meta' });
      meta.appendChild(createEl('span', { className: 'pill dot ' + n.layer }, layerLabel(n.layer)));
      item.appendChild(meta);

      item.onclick = function() { openMobileSheet(n); };
      item.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMobileSheet(n); } };

      sec.appendChild(item);
    });

    listEl.appendChild(sec);
  });

  if (!listEl.children.length) {
    listEl.appendChild(createEl('div', { className: 'changes-empty', style: 'margin-top:18px;' }, 'No matches. Try a different search.'));
  }
}

export function openMobileSheet(node0) {
  const node = viewNode(node0);
  const sheet = document.getElementById('mobile-node-sheet');
  const titleEl = document.getElementById('mobile-sheet-title');
  const bodyEl = document.getElementById('mobile-sheet-body');
  if (!sheet || !titleEl || !bodyEl) return;

  titleEl.textContent = node.label || node.id;
  clearChildren(bodyEl);

  if (node.subtitle) bodyEl.appendChild(createEl('div', { className: 'mx-item-sub', style: 'margin-top:2px;' }, node.subtitle));

  const mode = state.viewMode || 'flow';
  const summary = (node.summary || deriveSummary(node) || '').trim();
  const desc = (node.desc || '').trim();
  const fullDesc = (mode === 'plain') ? ((node._technicalDesc || '').trim()) : desc;

  let p;
  if (summary) {
    p = createEl('div', { className: 'ms-desc' }, summary);
    bodyEl.appendChild(p);
  }

  if ((mode === 'system' || mode === 'plain') && (fullDesc || summary)) {
    let expanded = false;
    const more = createEl('button', {
      style: 'color:var(--interactive-primary);background:none;border:none;font-size:12px;cursor:pointer;padding:4px 0;display:inline-block;margin-top:6px;'
    });
    more.textContent = (mode === 'plain') ? 'Show technical details' : 'Show full details';
    more.onclick = function() {
      expanded = !expanded;
      if (!summary) {
        p = createEl('div', { className: 'ms-desc' }, expanded ? fullDesc : '');
        bodyEl.insertBefore(p, more);
      } else {
        p.textContent = expanded ? fullDesc : summary;
      }
      more.textContent = expanded ? 'Hide details' : ((mode === 'plain') ? 'Show technical details' : 'Show full details');
    };
    bodyEl.appendChild(more);
  }

  const conns = getVisibleConnections();
  const incoming = conns.filter(function(c) { return c.to === node.id; });
  const outgoing = conns.filter(function(c) { return c.from === node.id; });

  function renderLinks(title, list, dir) {
    const block = createEl('div', { className: 'ms-block' });
    block.appendChild(createEl('h4', {}, title));
    if (!list.length) {
      block.appendChild(createEl('div', { className: 'mx-item-sub' }, 'None'));
      bodyEl.appendChild(block);
      return;
    }
    list.slice(0, 40).forEach(function(c) {
      const otherId = (dir === 'in') ? c.from : c.to;
      const other = getNodeById(otherId) || { label: otherId, subtitle: '' };
      const row = createEl('div', { className: 'ms-link' });
      const top = createEl('div', { className: 'ms-link-top' });
      top.appendChild(createEl('div', { className: 'ms-link-title' }, other.label || otherId));
      top.appendChild(createEl('div', { className: 'ms-link-type' }, connLabel(c.type)));
      row.appendChild(top);
      const otherBlurb = (other.summary || deriveSummary(other) || other.subtitle || '').trim();
      if (otherBlurb) row.appendChild(createEl('div', { className: 'ms-link-sub' }, otherBlurb));
      if (c.label) row.appendChild(createEl('div', { className: 'ms-link-sub' }, c.label));
      row.onclick = function() { openMobileSheet(other); };
      block.appendChild(row);
    });
    bodyEl.appendChild(block);
  }

  const isSystem = (state.viewMode === 'system' || state.viewMode === 'plain');
  const upTitle = isSystem ? 'What leads here' : 'Upstream';
  const downTitle = isSystem ? 'What happens next' : 'Downstream';
  renderLinks(upTitle, incoming, 'in');
  renderLinks(downTitle, outgoing, 'out');

  sheet.classList.remove('expanded');
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  const scrim = document.getElementById('mobile-sheet-scrim');
  if (scrim) scrim.classList.add('open');
}

export function closeMobileSheet() {
  const sheet = document.getElementById('mobile-node-sheet');
  if (!sheet) return;
  sheet.classList.remove('open');
  sheet.classList.remove('expanded');
  sheet.setAttribute('aria-hidden', 'true');
  const scrim = document.getElementById('mobile-sheet-scrim');
  if (scrim) scrim.classList.remove('open');
}

export function initSheetGestures() {
  const handle = document.getElementById('mobile-sheet-handle');
  const sheet = document.getElementById('mobile-node-sheet');
  if (!handle || !sheet) return;
  let startY = 0;
  handle.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
  }, { passive: true });
  handle.addEventListener('touchend', function(e) {
    const dy = e.changedTouches[0].clientY - startY;
    if (dy < -30) {
      sheet.classList.add('expanded');
    } else if (dy > 30) {
      if (sheet.classList.contains('expanded')) {
        sheet.classList.remove('expanded');
      } else {
        closeMobileSheet();
      }
    }
  }, { passive: true });
}
