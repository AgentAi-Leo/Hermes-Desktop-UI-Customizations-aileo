#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const packageJson = process.env.PLAYWRIGHT_PACKAGE_JSON;
if (!packageJson) throw new Error('PLAYWRIGHT_PACKAGE_JSON is required');
const require = createRequire(packageJson);
const { chromium } = require('playwright');
const base = process.env.THREE_GOLD_BASE_URL || 'http://127.0.0.1:9127';
const evidence = process.env.THREE_GOLD_EVIDENCE_DIR || path.resolve(process.cwd(), 'evidence');
await fs.mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const consoleErrors = [];
const expectedAuthProbeErrors = [];
const unexpectedHttpErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => {
  if (message.type() !== 'error') return;
  const location = message.location();
  if (location.url === `${base}/api/auth/me` && /401 \(Unauthorized\)/.test(message.text())) {
    expectedAuthProbeErrors.push(message.text());
    return;
  }
  consoleErrors.push(`${location.url || 'unknown'}: ${message.text()}`);
});
page.on('response', response => {
  if (response.status() < 400) return;
  if (response.url() === `${base}/api/auth/me` && response.status() === 401) return;
  unexpectedHttpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
});
let checks = 0;
function ok(name, condition, detail = '') {
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  checks += 1;
  console.log(`PASS ${name}`);
}
async function authedJson(url) {
  return page.evaluate(async target => {
    const token = window.__HERMES_SESSION_TOKEN__;
    const response = await fetch(target, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`${target}: ${response.status} ${await response.text()}`);
    return response.json();
  }, url);
}
async function allFrameText() {
  const values = [];
  for (const frame of page.frames()) {
    try { values.push(await frame.locator('body').innerText({ timeout: 5000 })); } catch (_) {}
  }
  return values.join('\n');
}
async function waitForFrameText(needle) {
  for (let i = 0; i < 80; i += 1) {
    if ((await allFrameText()).includes(needle)) return;
    await page.waitForTimeout(125);
  }
  throw new Error(`frame text not found: ${needle}`);
}
try {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__HERMES_SESSION_TOKEN__));
  ok('session token injected', await page.evaluate(() => Boolean(window.__HERMES_SESSION_TOKEN__)));
  const plugins = await authedJson('/api/dashboard/plugins');
  const git = plugins.find(item => item.name === 'git-comments-v27-review');
  ok('Git Watch plugin discovered', git?.label === 'GIT WATCH' && git?.tab?.path === '/git-comments-v27-review');
  const customGroup = page.locator('[aria-labelledby="hermes-sidebar-custom-nav-heading"]');
  const customEntries = await customGroup.locator('a').evaluateAll(links => links.map(link => ({
    label: link.textContent?.trim(),
    path: new URL(link.href).pathname,
  })));
  const expectedCustomEntries = [
    { label: 'BRIEFS-AI', path: '/briefs-ai' },
    { label: 'BRIEF-STOCK', path: '/brief-stock' },
    { label: 'GIT WATCH', path: '/git-comments-v27-review' },
  ];
  ok(
    'exact CUSTOM labels and paths',
    JSON.stringify(customEntries) === JSON.stringify(expectedCustomEntries),
    JSON.stringify(customEntries),
  );
  const sectionOrder = await page.locator('#app-sidebar nav [role="group"]').evaluateAll(groups =>
    groups.map(group => group.getAttribute('aria-labelledby')),
  );
  const customAt = sectionOrder.indexOf('hermes-sidebar-custom-nav-heading');
  const hermesAt = sectionOrder.indexOf('hermes-sidebar-core-nav-heading');
  ok('CUSTOM precedes HERMES', customAt >= 0 && hermesAt === customAt + 1, JSON.stringify(sectionOrder));

  const aiApi = await authedJson('/api/briefs/ai');
  const stocksApi = await authedJson('/api/briefs/stock');
  const aiDates = aiApi.briefs?.map(item => item.date) || [];
  const stockDates = stocksApi.briefs?.map(item => item.date) || [];
  ok('AI API discovers five retained dates', aiApi.count === 5 && aiDates.length === 5, JSON.stringify(aiDates));
  ok('Stocks API discovers five retained dates', stocksApi.count === 5 && stockDates.length === 5, JSON.stringify(stockDates));
  ok('AI latest sealed date discovered', aiDates.includes('2026-07-20'));
  ok('Stocks latest sealed date discovered', stockDates.includes('2026-07-20'));
  ok('AI HTML routes available', aiApi.briefs.every(item => item.html_exists && item.html_route));
  ok('Stocks HTML routes available', stocksApi.briefs.every(item => item.html_exists && item.html_route));

  await page.goto(`${base}/briefs-ai`, { waitUntil: 'networkidle' });
  await page.getByText('BRIEFS-AI', { exact: true }).last().waitFor();
  await waitForFrameText('AI Morning Brief');
  const aiText = await allFrameText();
  ok('AI inner gold content renders', aiText.includes('AI Morning Brief'));
  ok('AI Takeaways renders', aiText.includes('FOUNDER TAKEAWAYS'));
  await page.screenshot({ path: path.join(evidence, 'candidate-ai.png'), fullPage: true });

  await page.goto(`${base}/brief-stock`, { waitUntil: 'networkidle' });
  await page.getByText('BRIEF-STOCK', { exact: true }).last().waitFor();
  await waitForFrameText('Portfolio Position Comparison');
  const stockText = await allFrameText();
  ok('Stocks Position Comparison renders', stockText.includes('Portfolio Position Comparison'));
  ok('Stocks summary renders', stockText.includes('Stock Brief'));
  await page.screenshot({ path: path.join(evidence, 'candidate-stocks.png'), fullPage: true });

  await page.goto(`${base}/git-comments-v27-review`, { waitUntil: 'networkidle' });
  await page.getByText('GIT WATCH', { exact: true }).last().waitFor();
  const gitData = await authedJson('/api/plugins/git-comments-v27-review/data');
  ok('Git Watch API schema loads', gitData.schema_version === 4);
  ok('Git Watch route renders', (await page.locator('body').innerText()).includes('GIT WATCH'));
  await page.screenshot({ path: path.join(evidence, 'candidate-git-watch.png'), fullPage: true });

  ok('isolated auth probe is explicitly classified', expectedAuthProbeErrors.length > 0, String(expectedAuthProbeErrors.length));
  ok('no unexpected HTTP errors', unexpectedHttpErrors.length === 0, unexpectedHttpErrors.join(' | '));
  ok('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
  ok('no unexpected console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  console.log(`THREE_GOLD_BROWSER=PASS CHECKS=${checks}`);
} finally {
  await browser.close();
}
