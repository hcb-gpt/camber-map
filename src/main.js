// ── BOOTSTRAP MODULE ──────────────────────────────
import './styles/layout.css';
import './styles/components.css';
import './styles/diagram.css';
import './styles/mobile.css';

import {
  state,
  diagramLoadingState, diagramErrorMessage,
  hoveredNodeId, hoveredConnKey,
  infoLocked, infoNode,
} from './state.js';

import { renderDiagram, fitToScreen, zoomIn, zoomOut, initCanvasInteractions } from './canvas.js';
import { registerPanelCallbacks as registerCanvasPanelCallbacks, registerInteractionCallbacks } from './canvas.js';
import {
  renderControls, filterNodes, toggleSidebar, applyViewMode, renderFlowNav, renderStatBar,
  registerSidebarCallbacks,
} from './sidebar.js';
import {
  showInfo, hideInfo, showEdgeInfo, openModal, closeModal, saveComment, deleteComment,
  showOfflineBanner, setDiagramStatusBanner, renderNowBar, toggleChangesDrawer,
  registerPanelCallbacks,
} from './panel.js';
import {
  renderMobileView, filterNodesMobile, closeMobileSheet, initSheetGestures, ensureSummaries,
} from './mobile.js';
import {
  initSupabase, loadAnnotations, setupRealtimeSubscription,
  loadDiagramData, retryLoadDiagramData, fetchVPData, fetchArchitectureSpec,
  registerCallbacks as registerDataCallbacks,
} from './data-loader.js';

// ── updateAll ─────────────────────────────────────
function updateAll() { renderControls(); renderDiagram(); }

// ── Register callbacks to break circular dependencies ──
registerDataCallbacks({
  updateAll,
  renderDiagram,
  setDiagramStatusBanner,
  renderNowBar,
  renderStatBar,
  renderMobileView,
  renderFlowNav,
  showOfflineBanner,
  ensureSummaries,
});

registerCanvasPanelCallbacks({
  showInfo,
  showEdgeInfo,
  hideInfo,
});

registerSidebarCallbacks({
  updateAll,
  renderMobileView,
  toggleSidebar,
});

registerPanelCallbacks({
  updateAll,
});

import { isNodeVisible, resetHoverInteractionState, clearHoverState } from './canvas.js';

registerInteractionCallbacks({
  hideInfo,
  isNodeVisible,
  renderDiagram,
  resetHoverInteractionState,
  clearHoverState,
});

// ── Initialize Supabase ───────────────────────────
initSupabase();

// ── Expose globals for Playwright tests ───────────
window.state = state;

Object.defineProperty(window, 'diagramLoadingState', {
  get() { return diagramLoadingState; },
  enumerable: true,
});
Object.defineProperty(window, 'hoveredNodeId', {
  get() { return hoveredNodeId; },
  enumerable: true,
});
Object.defineProperty(window, 'hoveredConnKey', {
  get() { return hoveredConnKey; },
  enumerable: true,
});
Object.defineProperty(window, 'diagramErrorMessage', {
  get() { return diagramErrorMessage; },
  enumerable: true,
});

// ── Expose onclick handlers for inline HTML handlers ──
window.toggleSidebar = toggleSidebar;
window.applyViewMode = applyViewMode;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.fitToScreen = fitToScreen;
window.filterNodes = filterNodes;
window.filterNodesMobile = filterNodesMobile;
window.hideInfo = hideInfo;
window.closeModal = closeModal;
window.saveComment = saveComment;
window.deleteComment = deleteComment;
window.closeMobileSheet = closeMobileSheet;
window.toggleChangesDrawer = toggleChangesDrawer;
window.retryLoadDiagramData = retryLoadDiagramData;

// ── Keyboard listener ─────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (infoLocked && infoNode) { hideInfo(); return; }
    if (document.querySelector('.sidebar').classList.contains('open')) toggleSidebar();
    closeModal();
  }
  if (e.key === 'Enter' && document.getElementById('modal').classList.contains('show') && e.metaKey) saveComment();
});

// ── Resize listener ───────────────────────────────
window.addEventListener('resize', function() { fitToScreen(); });

let _lastMobileState = window.innerWidth <= 1024;
window.addEventListener('resize', function() {
  const nowMobile = window.innerWidth <= 1024;
  if (nowMobile !== _lastMobileState) {
    _lastMobileState = nowMobile;
    applyViewMode(state.viewMode);
  }
});

// ── Canvas interactions (pan/zoom) ─────────────────
initCanvasInteractions();

// ── Sheet gestures ────────────────────────────────
initSheetGestures();

// ── Initial render + data load ─────────────────────
updateAll();
loadAnnotations();
setupRealtimeSubscription();
setDiagramStatusBanner();

requestAnimationFrame(function() {
  ensureSummaries();
  applyViewMode('flow');
  loadDiagramData()
    .then(function() { return fetchVPData(); })
    .catch(function() { return fetchVPData(); });
  fetchArchitectureSpec();
});

// iOS Safari needs extra time
requestAnimationFrame(function() {
  fitToScreen();
  setTimeout(fitToScreen, 300);
});

// Refresh VP data every 5 minutes
setInterval(fetchVPData, 5 * 60 * 1000);
