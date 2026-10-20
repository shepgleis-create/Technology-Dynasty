'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const origin = process.argv[2] || 'https://motor-eta-six.vercel.app';
const out = path.resolve(__dirname, '../playtest-depth-output'); fs.mkdirSync(out, { recursive: true });
const proxy = process.env.MOTOR_USE_SYSTEM_PROXY === '1' ? process.env.HTTPS_PROXY || process.env.HTTP_PROXY : null;
const go = (p, view, tab) => p.evaluate(([v, t]) => MDXGame.navigate(v, t), [view, tab]);
async function found(p, help) {
  await p.locator('#newCompanyBtn').click(); assert.equal(await p.locator('#newGameTutorial').isChecked(), false);
  await p.locator('#companyName').fill(help ? 'Live Guide Check' : 'Live Independent Check'); await p.locator('#founderName').fill('Playtest'); await p.locator('#difficulty').selectOption('casual');
  if (help) await p.locator('#newGameTutorial').check();
  await p.locator('#toHQ').click(); await p.locator('#toSummary').click(); await p.locator('#foundBtn').click(); await p.locator('#screen-game.active').waitFor();
}
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.MOTOR_CHROMIUM_PATH ? { executablePath: process.env.MOTOR_CHROMIUM_PATH } : {}), ...(proxy ? { proxy: { server: proxy } } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, ignoreHTTPSErrors: !!proxy }); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  const files = ['index.html', 'game.js', 'gameplay-depth.js', 'gameplay-ui.js', 'gameplay-depth.css', 'tutorial.js', 'sim-core.js', 'expansion.js', 'industry-sim-client.js', 'service-worker.js', 'pwa.js'];
  const hash = s => crypto.createHash('sha256').update(s).digest('hex');
  for (const file of files) {
    const response = await page.request.get(origin + '/' + file + '?verify=guide-20261003-v2', { timeout: 30000 });
    assert.equal(response.status(), 200, file + ' unavailable'); assert.equal(hash(await response.body()), hash(fs.readFileSync(path.join(__dirname, '..', file))), file + ' does not match the verified build');
  }
  console.log('Verified ' + files.length + ' live source files.');
  await page.addInitScript(() => localStorage.setItem('motorDynastyTutorial', 'on'));
  await page.goto(origin); await found(page, false);
  assert.equal(await page.locator('#tutorialGuide, #depthHQ').count(), 0); assert.equal(await page.evaluate(() => MDXGame.getState().tutorial.optedIn), false);
  assert.equal(await page.locator('.bottom-nav [data-view]').count(), 9); await page.screenshot({ path: path.join(out, 'live-hq-help-off-phone.png') });
  await go(page, 'finance'); await page.locator('#openStorageSettings').click(); assert.equal(await page.locator('#depthTutorialSettings').count(), 0); await page.locator('#closeStorage').click();
  await page.evaluate(() => MDXGame.save()); await page.reload(); await page.locator('#continueBtn').click(); await page.locator('#screen-game.active').waitFor(); assert.equal(await page.locator('#tutorialGuide, #depthHQ').count(), 0);
  await page.reload(); await found(page, true); await page.locator('#tutorialGuide').waitFor(); assert.equal(await page.locator('#depthHQ').count(), 0);
  await page.locator('[data-guide-show]').click(); assert.equal(await page.locator('#view-engine.active').count(), 1); await page.screenshot({ path: path.join(out, 'live-guide-engine-phone.png') });
  await page.locator('#engineName').fill('Live Guide I4'); await page.locator('#saveEngine').click(); await page.waitForFunction(() => MDXGame.getState().tutorial.index === 1);
  await page.locator('[data-guide-off]').click(); assert.equal(await page.locator('#tutorialGuide, #depthHQ').count(), 0);
  await go(page, 'finance'); await page.locator('#openStorageSettings').click(); await page.locator('[data-depth-field="tutorialEnabled"]').check(); assert.equal(await page.evaluate(() => MDXGame.getState().tutorial.enabled), true);
  await page.locator('[data-depth-field="tutorialEnabled"]').uncheck(); await page.locator('#closeStorage').click(); await page.evaluate(() => MDXGame.save());
  await page.reload(); await page.locator('#continueBtn').click(); await page.locator('#screen-game.active').waitFor(); assert.equal(await page.evaluate(() => MDXGame.getState().tutorial.enabled), false); assert.equal(await page.evaluate(() => MDXGame.getState().tutorial.index), 1);
  await go(page, 'home'); assert.equal(await page.locator('#depthHQ').count(), 0);
  for (const [view, tab, selector] of [['library', 'testing', '#depthLab'], ['library', 'families', '#depthFamilies'], ['library', 'contracts', '#depthNegotiations'], ['market', 'motorsport', '#depthRacing'], ['library', 'history', '#depthLegacy'], ['finance', 'group', '#depthGroupPlans']]) {
    await go(page, view, tab); assert.equal(await page.locator(selector).count(), 1); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  assert.deepEqual(errors, []); console.log(JSON.stringify({ ok: true, origin, assetsMatch: files.length, directPages: 9, helpDefaultOff: true, explicitOptIn: true, hiddenWhenOff: true, realEngineStep: true, saveReload: true, gameplaySurfaces: 6, errors }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
