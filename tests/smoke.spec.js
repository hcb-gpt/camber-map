import { test, expect } from '@playwright/test';

test('diagram loads from fetched JSON artifacts', async ({ page, request }) => {
  const [nodesResponse, connectionsResponse] = await Promise.all([
    request.get('/public/diagram.nodes.json'),
    request.get('/public/diagram.connections.json'),
  ]);

  expect(nodesResponse.ok()).toBeTruthy();
  expect(connectionsResponse.ok()).toBeTruthy();

  const nodesJson = await nodesResponse.json();
  const connectionsJson = await connectionsResponse.json();
  expect(Array.isArray(nodesJson)).toBeTruthy();
  expect(nodesJson.length).toBeGreaterThan(0);
  expect(Array.isArray(connectionsJson)).toBeTruthy();
  expect(connectionsJson.length).toBeGreaterThan(0);

  await page.goto('/');
  await page.waitForFunction(() => window.diagramLoadingState === 'ready', { timeout: 30000 });

  const renderedNodeCount = await page.locator('svg#diagram .node-group').count();
  expect(renderedNodeCount).toBeGreaterThan(0);
});

test('load diagnostics and screenshots', async ({ page }) => {
  const requiredPaths = new Set([
    '/public/facts.json',
    '/public/map.json',
    '/public/diagram.nodes.json',
    '/public/diagram.connections.json',
    '/public/map.schema.json',
    '/public/ajv.min.js',
  ]);

  const responseStatusByPath = new Map();
  const consoleMessages = [];

  page.on('response', (response) => {
    const url = new URL(response.url());
    const path = url.pathname;
    if (requiredPaths.has(path) || path === '/index.html') {
      responseStatusByPath.set(path, response.status());
    }
  });
  page.on('console', (message) => {
    consoleMessages.push(`[${message.type()}] ${message.text()}`);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForFunction(() => window.diagramLoadingState === 'ready', { timeout: 30000 });

  const missingPaths = [];
  for (const requiredPath of requiredPaths) {
    const status = responseStatusByPath.get(requiredPath);
    if (status !== 200) {
      missingPaths.push(`${requiredPath}:${status || 'missing'}`);
    }
  }
  expect(missingPaths).toEqual([]);

  await page.screenshot({ path: test.info().outputPath('01-camber-map-desktop-full.png'), fullPage: true });

  await page.locator('.canvas-zoom-btn').nth(1).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: test.info().outputPath('02-camber-map-zoomed.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => window.diagramLoadingState === 'ready', { timeout: 30000 });
  await page.screenshot({ path: test.info().outputPath('03-camber-map-mobile-list.png'), fullPage: true });

  const errorLogs = consoleMessages.filter((line) => line.startsWith('[error]')).slice(0, 20);
  const warningLogs = consoleMessages.filter((line) => line.startsWith('[warning]')).slice(0, 20);
  const summary = {
    required: Object.fromEntries(Array.from(responseStatusByPath.entries())),
    top_console_errors: errorLogs,
    top_console_warnings: warningLogs,
  };

  console.log('DIAGNOSTIC_SUMMARY ' + JSON.stringify(summary));
});

test('selected flow highlight stays stable while scrolling with stationary pointer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForFunction(() => window.diagramLoadingState === 'ready', { timeout: 30000 });

  const firstStage = page.locator('#sidebar-flow-nav .flow-nav-item[data-stage="1"]').first();
  await firstStage.click();

  await page.locator('svg#diagram .node-group').first().hover();
  await page.locator('#canvas-area').dispatchEvent('wheel', { deltaY: 200 });
  await page.waitForTimeout(200);

  const postState = await page.evaluate(() => {
    const activeNav = document.querySelectorAll('#sidebar-flow-nav .flow-nav-item[data-active="1"]').length;
    const dimmedNodes = document.querySelectorAll('svg#diagram .node-group.dimmed').length;
    return {
      activeNav,
      dimmedNodes,
      activeFlowStage: window.state && window.state.activeFlowStage,
      diagramLoadingState: window.diagramLoadingState,
      diagramErrorMessage: window.diagramErrorMessage || '',
    };
  });

  expect(postState.diagramLoadingState).toBe('ready');
  expect(postState.diagramErrorMessage).toBe('');
  expect(postState.activeFlowStage).toBe(1);
  expect(postState.activeNav).toBe(1);
  expect(postState.dimmedNodes).toBeGreaterThan(0);
});
