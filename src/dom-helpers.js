// ── DOM HELPERS ────────────────────────────────────
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function createEl(tag, attrs, text) {
  const el = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(function(pair) {
    if (pair[0] === 'className') el.className = pair[1];
    else el.setAttribute(pair[0], pair[1]);
  });
  if (text !== undefined) el.textContent = text;
  return el;
}

export function createSvgEl(tag, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) Object.entries(attrs).forEach(function(pair) { el.setAttribute(pair[0], pair[1]); });
  if (text !== undefined) el.textContent = text;
  return el;
}
