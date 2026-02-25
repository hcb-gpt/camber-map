// ── INFO PANEL, MODALS, ANNOTATIONS, NOW BAR, CHANGES ──
import { clearChildren, createEl } from './dom-helpers.js';
import { CONNECTION_LABEL_DESC_MAP, HEALTH_PRIORITY } from './config.js';
import {
  state, nodes, vpData, factsData, changesData,
  sb, sbOffline, infoLocked, infoNode, infoEdge, modalNode,
  diagramLoadingState, diagramErrorMessage,
  setInfoLocked, setInfoNode, setInfoEdge, setModalNode,
  setSbOffline,
} from './state.js';
import { viewNode, isPlainMode, _sentenceFirst, _deJargon } from './canvas.js';
import { _connKey } from './data-loader.js';

// Set by main.js
let _updateAll = null;
let _openModal = null;

export function registerPanelCallbacks(cbs) {
  _updateAll = cbs.updateAll;
}

export function showEdgeInfo(c) {
  setInfoEdge(c);
  setInfoNode(null);

  const fromNode = nodes.find(function(n) { return n.id === c.from; });
  const toNode = nodes.find(function(n) { return n.id === c.to; });
  const fromLabel = fromNode ? viewNode(fromNode).label : c.from;
  const toLabel = toNode ? viewNode(toNode).label : c.to;

  const titleEl = document.getElementById('info-title');
  const descEl = document.getElementById('info-desc');
  titleEl.textContent = (c.label || 'Link') + ' \u2014 ' + fromLabel + ' \u2192 ' + toLabel;

  clearChildren(descEl);
  const body = c.desc || CONNECTION_LABEL_DESC_MAP[_connKey(c.from, c.to, c.label)] || 'No description yet.';
  descEl.appendChild(document.createTextNode(body));

  document.getElementById('info-panel').classList.add('show');
}

export function showInfo(n0) {
  setInfoNode(n0);
  const n = viewNode(n0);
  const titleEl = document.getElementById('info-title');
  const descEl = document.getElementById('info-desc');
  titleEl.textContent = (n.label || n.id) + ' \u2014 ' + (n.subtitle || '');

  function renderBody(showTech) {
    clearChildren(descEl);

    let mainText = '';
    if (isPlainMode()) {
      mainText = showTech ? (n._technicalDesc || n.desc || '') : (n.desc || '');
    } else {
      mainText = n.desc || '';
    }
    descEl.appendChild(document.createTextNode(mainText || 'No description'));

    if (isPlainMode() && (n._technicalDesc || '').trim()) {
      const more = createEl('button', {
        style: 'color:var(--interactive-primary);background:none;border:none;font-size:12px;cursor:pointer;padding:6px 0;display:inline-block;'
      }, showTech ? 'Hide technical details' : 'Show technical details');
      more.addEventListener('click', function(e) {
        e.stopPropagation();
        renderBody(!showTech);
      });
      descEl.appendChild(more);
    }

    if (infoLocked && infoNode) {
      const btn = createEl('button', { className: 'info-comment-btn' }, '+ Comment');
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        hideInfo();
        openModal(n0);
      });
      descEl.appendChild(btn);
    }
  }

  renderBody(false);
  document.getElementById('info-panel').classList.add('show');
}

export function hideInfo() {
  setInfoLocked(false);
  setInfoNode(null);
  setInfoEdge(null);
  document.getElementById('info-panel').classList.remove('show');
}

export function openModal(n0) {
  const n = viewNode(n0);
  setModalNode(n);
  document.getElementById('modal-title').textContent = n.label || n.id;
  document.getElementById('modal-path').textContent = n.subtitle || '';
  document.getElementById('modal-text').value = '';
  document.getElementById('modal').classList.add('show');
  document.body.classList.add('overlay-open');
  setTimeout(function() { document.getElementById('modal-text').focus(); }, 50);
}

export function closeModal() {
  document.getElementById('modal').classList.remove('show');
  document.body.classList.remove('overlay-open');
  setModalNode(null);
}

export async function saveComment() {
  const text = document.getElementById('modal-text').value.trim();
  if (!text) { closeModal(); return; }
  const author = localStorage.getItem('camber_map_author') || 'anonymous';
  const currentModalNode = modalNode;
  if (sb && !sbOffline) {
    try {
      const result = await sb.from('map_annotations').insert({
        node_id: currentModalNode.id, author: author, content: text
      }).select();
      if (result.error) throw result.error;
      const a = result.data[0];
      state.comments.push({ id: a.id, target: a.node_id, targetLabel: currentModalNode.label, targetFile: currentModalNode.subtitle, text: a.content, author: a.author, created_at: a.created_at });
    } catch(e) {
      setSbOffline(true); showOfflineBanner();
      state.comments.push({ id: Date.now(), target: currentModalNode.id, targetLabel: currentModalNode.label, targetFile: currentModalNode.subtitle, text: text, author: author });
    }
  } else {
    state.comments.push({ id: Date.now(), target: currentModalNode.id, targetLabel: currentModalNode.label, targetFile: currentModalNode.subtitle, text: text, author: author });
  }
  closeModal();
  if (_updateAll) _updateAll();
}

export async function deleteComment(i) {
  const comment = state.comments[i];
  if (sb && !sbOffline && typeof comment.id === 'string') {
    try {
      const result = await sb.from('map_annotations').delete().eq('id', comment.id);
      if (result.error) throw result.error;
    } catch(e) { /* remove locally anyway */ }
  }
  state.comments.splice(i, 1);
  if (_updateAll) _updateAll();
}

export function showOfflineBanner() {
  if (document.getElementById('offline-banner')) return;
  const banner = createEl('div', { id: 'offline-banner', className: 'offline-banner' }, 'Offline mode \u2014 annotations are local only');
  const list = document.getElementById('comments-list');
  list.parentNode.insertBefore(banner, list);
}

export function setDiagramStatusBanner() {
  const banner = document.getElementById('diagram-status-banner');
  const text = document.getElementById('diagram-status-banner-text');
  const retry = document.getElementById('diagram-status-banner-retry');
  if (!banner || !text || !retry) return;

  if (diagramLoadingState === 'ready' && !diagramErrorMessage) {
    banner.className = 'diagram-status-banner';
    banner.classList.remove('show');
    text.textContent = '';
    retry.style.display = 'none';
    return;
  }

  const isError = diagramLoadingState === 'error' || !!diagramErrorMessage;
  const stateClass = isError ? 'diagram-status-banner--error' : 'diagram-status-banner--loading';
  const stateText = isError ? 'Unable to load diagram data.' : 'Loading architecture map...';
  const detail = isError ? (diagramErrorMessage || 'Refresh this page to retry.') : 'Please wait while diagram nodes and connections are loaded.';

  banner.className = 'diagram-status-banner show ' + stateClass;
  text.textContent = stateText + ' ' + detail;
  retry.style.display = isError ? 'inline-block' : 'none';
}

// ── NOW BAR ───────────────────────────────────────
export function renderNowBar() {
  const bars = [
    document.getElementById('now-bar'),
    document.getElementById('now-bar-desktop')
  ];

  bars.forEach(function(bar) {
    if (!bar) return;
    clearChildren(bar);

    // Badge 1 - Data Freshness
    const freshnessEl = createEl('span', { className: 'now-badge' });
    freshnessEl.style.cursor = 'pointer';
    const dotEl = createEl('span', { className: 'dot' });
    const textEl = createEl('span', {});
    const liveDetailEl = createEl('span', { className: 'now-badge-live-detail' });

    let isLive = false;
    if (factsData && factsData.updated_at) {
      const updatedAt = new Date(factsData.updated_at);
      const nowMs = Date.now();
      const hoursAgo = (nowMs - updatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursAgo <= 2) {
        dotEl.style.background = '#059669';
        isLive = true;
      } else if (hoursAgo <= 8) {
        dotEl.style.background = '#D97706';
      } else {
        dotEl.style.background = '#DC2626';
      }

      let agoText;
      if (hoursAgo < 1) {
        agoText = '<1h ago';
      } else {
        agoText = Math.floor(hoursAgo) + 'h ago';
      }
      textEl.textContent = 'Data: ' + agoText;

      const timestamp = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      liveDetailEl.textContent = isLive
        ? ' \u2014 Pipeline live \u2014 data current as of ' + timestamp
        : ' \u2014 Pipeline data as of ' + timestamp;
    } else {
      dotEl.style.background = '#9CA3AF';
      textEl.textContent = 'Data: unknown';
      liveDetailEl.textContent = ' \u2014 No pipeline data available';
    }

    freshnessEl.appendChild(dotEl);
    freshnessEl.appendChild(textEl);
    freshnessEl.appendChild(liveDetailEl);
    freshnessEl.addEventListener('click', function(e) {
      e.stopPropagation();
      freshnessEl.classList.toggle('live-expanded');
    });
    bar.appendChild(freshnessEl);

    // Badge 2 - Pipeline Health
    const healthEl = createEl('span', { className: 'now-badge' });
    const healthDot = createEl('span', { className: 'dot' });
    const healthText = createEl('span', {});

    if (vpData && vpData.summary) {
      const total = vpData.summary.total || 0;
      const healthy = vpData.summary.healthy || 0;
      const healthRatio = total > 0 ? healthy / total : 0;

      if (healthRatio === 1) {
        healthDot.style.background = '#059669';
      } else if (healthRatio > 0.5) {
        healthDot.style.background = '#D97706';
      } else {
        healthDot.style.background = '#DC2626';
      }
      healthText.textContent = healthy + '/' + total + ' healthy';
      healthText.style.color = (healthy === total) ? '#059669' : '#D97706';
    } else {
      healthDot.style.background = '#9CA3AF';
      healthText.textContent = '?/? healthy';
    }

    healthEl.appendChild(healthDot);
    healthEl.appendChild(healthText);
    bar.appendChild(healthEl);

    // Badge 3 - Coverage
    const coverageEl = createEl('span', { className: 'now-badge' });
    const coverageNum = createEl('strong', {});
    const coverageSuffix = createEl('span', {});

    if (vpData && vpData.summary && vpData.summary.overall_coverage_pct != null) {
      const pct = Math.round(vpData.summary.overall_coverage_pct * 100);
      coverageNum.textContent = pct;
      coverageSuffix.textContent = '% coverage';
      coverageNum.style.color = (pct >= 80) ? '#059669' : '#D97706';
    } else {
      coverageNum.textContent = '?';
      coverageSuffix.textContent = '% coverage';
    }

    coverageEl.appendChild(coverageNum);
    coverageEl.appendChild(coverageSuffix);
    bar.appendChild(coverageEl);

    // Badge 4 - Mode
    const modeEl = createEl('span', { className: 'now-badge' });
    const modeDot = createEl('span', { className: 'dot' });
    modeDot.style.background = '#2563EB';
    const modeText = createEl('span', {});
    modeText.textContent = (factsData && factsData.mode) ? factsData.mode : 'unknown';

    modeEl.appendChild(modeDot);
    modeEl.appendChild(modeText);
    bar.appendChild(modeEl);
  });

  // Changes badge
  const changesBadge = document.getElementById('now-changes-badge');
  if (changesBadge) {
    if (changesData && changesData.changes && changesData.changes.length > 0) {
      changesBadge.classList.add('has-changes');
      changesBadge.textContent = changesData.changes.length;
    } else {
      changesBadge.classList.remove('has-changes');
    }
  }
}

// ── CHANGES DRAWER ────────────────────────────────
export function toggleChangesDrawer() {
  const drawer = document.getElementById('changes-drawer');
  if (!drawer) return;

  const isOpen = drawer.classList.toggle('open');

  if (isOpen) {
    const content = document.getElementById('changes-content');
    if (!content) return;
    clearChildren(content);

    if (!changesData || !changesData.changes || changesData.changes.length === 0) {
      const emptyEl = createEl('div', { className: 'changes-empty' });
      const headingEl = createEl('div', { className: 'changes-empty-heading' }, 'No changes detected');
      const subtextEl = createEl('div', { className: 'changes-empty-subtext' }, 'This panel tracks schema migrations, new edge functions, and config changes between map builds.');
      const lastCheckedEl = createEl('div', { className: 'changes-last-checked', style: 'font-size: 11px; color: var(--text-disabled, #3A4655); margin-top: 8px; font-family: monospace;' }, 'Last checked: just now');
      emptyEl.appendChild(headingEl);
      emptyEl.appendChild(subtextEl);
      emptyEl.appendChild(lastCheckedEl);
      content.appendChild(emptyEl);
      return;
    }

    changesData.changes.forEach(function(change) {
      const itemEl = createEl('div', { className: 'change-item' });

      if (change.type) {
        const typeEl = createEl('span', { className: 'change-type change-type--' + change.type }, change.type);
        itemEl.appendChild(typeEl);
      }

      if (change.id || change.name) {
        const nameEl = createEl('span', { className: 'change-name' }, change.name || change.id);
        itemEl.appendChild(nameEl);
      }

      if (change.description || change.summary) {
        const descEl = createEl('p', { className: 'change-desc' }, change.description || change.summary);
        itemEl.appendChild(descEl);
      }

      content.appendChild(itemEl);
    });
  }
}

// ── STAGE HEALTH ──────────────────────────────────
export function getStageHealth(stage) {
  if (!vpData || !stage.capabilities || stage.capabilities.length === 0) {
    return { status: 'unknown', color: '#9CA3AF', text: 'Unknown', dotClass: 'dot-unknown' };
  }

  let worst = null;
  let worstPriority = -1;
  let worstHours = null;

  for (let i = 0; i < stage.capabilities.length; i++) {
    const capId = stage.capabilities[i];
    let cap = null;
    for (let j = 0; j < vpData.capabilities.length; j++) {
      if (vpData.capabilities[j].id === capId) {
        cap = vpData.capabilities[j];
        break;
      }
    }
    if (!cap) continue;

    const status = (cap.staleness && cap.staleness.status) ? cap.staleness.status : 'unknown';
    const priority = (HEALTH_PRIORITY[status] !== undefined) ? HEALTH_PRIORITY[status] : 0;

    if (priority > worstPriority) {
      worstPriority = priority;
      worst = status;
      worstHours = (cap.staleness && cap.staleness.hours_since_last_activity != null)
        ? cap.staleness.hours_since_last_activity
        : null;
    }
  }

  if (!worst) {
    return { status: 'unknown', color: '#9CA3AF', text: 'Unknown', dotClass: 'dot-unknown' };
  }

  if (worst === 'fresh') {
    const hoursText = (worstHours != null) ? (Math.round(worstHours * 10) / 10) + 'h ago' : '';
    return {
      status: 'fresh',
      color: '#059669',
      text: hoursText ? 'Fresh ' + hoursText : 'Fresh',
      dotClass: 'dot-fresh'
    };
  }
  if (worst === 'aging') {
    return { status: 'aging', color: '#D97706', text: 'Aging', dotClass: 'dot-aging' };
  }
  if (worst === 'stale') {
    return { status: 'stale', color: '#DC2626', text: 'Stale', dotClass: 'dot-stale' };
  }
  return { status: 'unknown', color: '#9CA3AF', text: 'Unknown', dotClass: 'dot-unknown' };
}
