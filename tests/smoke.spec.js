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
