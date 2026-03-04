import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicDir = path.join(appRoot, 'public');
const distDir = path.join(appRoot, 'dist');
const outPublicDir = path.join(distDir, 'public');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dst) {
  // Node >=16.7 supports fs.cp; fall back to manual copy if needed.
  if (typeof fs.cpSync === 'function') {
    fs.cpSync(src, dst, { recursive: true, force: true });
    return;
  }

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      ensureDir(dstPath);
      copyDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(dstPath));
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function verifyRequiredAssets() {
  const required = [
    'tokens.css',
    'ajv.min.js',
    'map.schema.json',
    'diagram.schema.json',
    'diagram.nodes.json',
    'diagram.connections.json',
    'facts.json',
    'map.json',
  ];

  const missing = required.filter((rel) => !exists(path.join(outPublicDir, rel)));
  if (missing.length) {
    const detail = missing.map((m) => `- dist/public/${m}`).join('\n');
    throw new Error(`camber-map build guard failed: missing required runtime assets:\n${detail}`);
  }
}

if (!exists(distDir)) {
  throw new Error('camber-map build guard failed: dist/ not found (vite build did not produce output)');
}
if (!exists(publicDir)) {
  throw new Error('camber-map build guard failed: public/ not found');
}

ensureDir(outPublicDir);
copyDir(publicDir, outPublicDir);
verifyRequiredAssets();

process.stdout.write('[postbuild] public assets copied to dist/public and verified\n');

