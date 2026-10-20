/* Exercise the opt-in boundary and the complete first-car guide with real programs. */
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright'), { createServer } = require('./dev');
const out = path.resolve(__dirname, '../playtest-depth-output'); fs.mkdirSync(out, { recursive: true });
const report = { flows: [], layouts: [], errors: [] }; let browser, server;
async function check(name, fn) { console.log('Checking ' + name); await fn(); report.flows.push(name); }
const state = p => p.evaluate(() => MDXGame.getState());
const go = (p, view, tab) => p.evaluate(([v, t]) => MDXGame.navigate(v, t), [view, tab]);
const advance = (p, days) => p.evaluate(n => MDXQA.advance(n), days);
async function reload(p) { await p.evaluate(() => MDXGame.save()); await p.reload(); await p.locator('#continueBtn').click(); await p.locator('#screen-game.active').waitFor(); }
async function found(p, help) {
  await p.locator('#newCompanyBtn').click(); assert.equal(await p.locator('#newGameTutorial').isChecked(), false);
  await p.locator('#companyName').fill(help ? 'Guided Test Motors' : 'Independent Test Motors');
  await p.locator('#founderName').fill('Playtester'); await p.locator('[data-start-year="1940"]').click(); await p.locator('#difficulty').selectOption('casual');
  if (help) await p.locator('#newGameTutorial').check();
  await p.locator('#toHQ').click(); await p.locator('#toSummary').click(); await p.locator('#foundBtn').click(); await p.locator('#screen-game.active').waitFor();
}
async function fresh(origin) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); p.setDefaultTimeout(15000);
  p.on('pageerror', e => report.errors.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => localStorage.setItem('motorDynastyTutorial', 'on'));
  await p.goto(origin); return p;
}
async function layout(p, view, width, height) {
  await p.setViewportSize({ width, height }); await go(p, view);
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const result = await p.evaluate(() => {
    const main = document.querySelector('.game-main'), guide = document.querySelector('#tutorialGuide'), view = main.querySelector('.game-view.active');
    const box = e => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; };
    const action = document.querySelector(view.id === 'view-engine' ? '#saveEngine' : '#saveVehicle');
    return { mainClass: main.className, reservedHeight: main.style.getPropertyValue('--tutorial-height'), main: box(main), guide: guide && box(guide), view: box(view), action: box(action), control: box(view.querySelector('.control-rail')), docOverflow: document.documentElement.scrollWidth - innerWidth, mainOverflow: main.scrollWidth - main.clientWidth, mainScroll: main.scrollHeight - main.clientHeight };
  });
  report.layouts.push({ builder: view, width, height, ...result });
  await p.screenshot({ path: path.join(out, 'guide-' + view + '-' + width + 'x' + height + '.png') });
  assert.ok(result.docOverflow <= 1 && result.mainOverflow <= 1, 'horizontal overflow');
  assert.ok(result.mainScroll <= 2, 'builder requires page scrolling');
  if (result.guide) assert.ok(result.view.top >= result.guide.bottom - 1, 'help covers the builder');
  assert.ok(result.action.top >= result.main.top && result.action.bottom <= result.main.bottom, 'authorization control is clipped');
  assert.ok(result.control.height >= 95 && result.control.bottom <= result.main.bottom + 2, 'controls are clipped');
}
(async () => {
  server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, ...(process.env.MOTOR_CHROMIUM_PATH ? { executablePath: process.env.MOTOR_CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const independent = await fresh(origin);
  await check('Unchecked setup creates a company with no guide or Company Brief', async () => {
    await found(independent, false); assert.equal((await state(independent)).tutorial.optedIn, false);
    for (const view of ['home', 'engine', 'vehicle', 'library', 'market', 'budget', 'research', 'companies', 'finance']) {
      await go(independent, view); assert.equal(await independent.locator('#tutorialGuide, #depthHQ').count(), 0);
    }
    await independent.locator('#openStorageSettings').click(); assert.equal(await independent.locator('#depthTutorialSettings').count(), 0); await independent.locator('#closeStorage').click();
    await advance(independent, 300); await go(independent, 'home'); assert.equal(await independent.locator('#tutorialGuide, #depthHQ').count(), 0);
    await independent.screenshot({ path: path.join(out, 'hq-help-off-phone.png') }); await reload(independent); assert.equal(await independent.locator('#tutorialGuide, #depthHQ').count(), 0);
  });
  await check('Existing saves lose default-on help without changing company progress', async () => {
    const before = await state(independent);
    await independent.evaluate(() => { MDXGame.getState().tutorial = { version: 1, enabled: true, index: 6, completed: ['welcome', 'budget'] }; });
    await reload(independent); const after = await state(independent);
    assert.equal(after.tutorial.enabled, false); assert.equal(after.tutorial.optedIn, false);
    for (const key of ['company', 'cash', 'daysPlayed', 'year']) assert.equal(after[key], before[key]);
    assert.equal(await independent.locator('#tutorialGuide, #depthHQ').count(), 0);
  });
  const guided = independent; await guided.goto(origin);
  await check('Explicit help opens one compact actionable step', async () => {
    await found(guided, true); await guided.locator('#tutorialGuide').waitFor(); assert.equal((await state(guided)).tutorial.optedIn, true);
    assert.equal(await guided.locator('#depthHQ').count(), 0, 'no empty or duplicate HQ brief'); assert.equal(await guided.locator('[data-guide-next]').count(), 0);
    await guided.locator('[data-guide-show]').click(); assert.equal(await guided.locator('#view-engine.active').count(), 1);
    assert.equal((await state(guided)).timeRunning, false, 'opening help must not run the clock');
    for (const [w, h] of [[390, 844], [375, 667], [1440, 1000]]) await layout(guided, 'engine', w, h);
    await guided.setViewportSize({ width: 390, height: 844 });
    await guided.locator('[data-guide-collapse]').click(); assert.equal(await guided.locator('#tutorialGuide.collapsed').count(), 1); await guided.locator('[data-guide-expand]').click();
    await guided.locator('#engineName').fill('Guide I4'); await guided.locator('#saveEngine').click();
    await guided.waitForFunction(() => MDXGame.getState().tutorial.index === 1);
    assert.equal((await state(guided)).enginePrograms.length, 1); assert.ok(await guided.locator('.tutorial-status').count());
  });
  await check('Turning help off removes every help panel and reload keeps it off', async () => {
    await guided.locator('[data-guide-off]').click(); assert.equal(await guided.locator('#tutorialGuide, #depthHQ').count(), 0);
    await go(guided, 'home'); assert.equal(await guided.locator('#tutorialGuide, #depthHQ').count(), 0); await reload(guided);
    assert.equal((await state(guided)).tutorial.index, 1); assert.equal((await state(guided)).tutorial.enabled, false);
    await go(guided, 'finance'); await guided.locator('#openStorageSettings').click(); await guided.locator('[data-depth-field="tutorialEnabled"]').check();
    await guided.locator('#closeStorage').click(); assert.equal((await state(guided)).tutorial.index, 1); assert.equal(await guided.locator('#tutorialGuide').count(), 1);
  });
  await check('Time controls and real engine release unlock the car step', async () => {
    await guided.locator('[data-guide-show]').click(); const day = (await state(guided)).daysPlayed;
    await guided.locator('#pauseTime').click(); await guided.waitForFunction(d => MDXGame.getState().daysPlayed > d, day); await guided.locator('#pauseTime').click();
    assert.equal((await state(guided)).timeRunning, false);
    await advance(guided, Math.ceil((await state(guided)).enginePrograms[0].daysRemaining) + 2);
    assert.equal((await state(guided)).tutorial.index, 2); assert.equal((await state(guided)).engines.length, 1);
    await guided.locator('[data-guide-show]').click(); assert.equal(await guided.locator('#view-vehicle.active').count(), 1);
    for (const [w, h] of [[390, 844], [375, 667], [1440, 1000]]) await layout(guided, 'vehicle', w, h);
    await guided.setViewportSize({ width: 390, height: 844 });
  });
  await check('The vehicle review, pre-production and a real sale advance the guide', async () => {
    await guided.locator('#vehicleName').fill('Guide One'); await guided.locator('[data-vtab="production"]').click();
    await guided.locator('[data-vslider="msrp"]').evaluate(e => { e.value = 3000; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
    await guided.locator('#saveVehicle').click(); assert.equal((await state(guided)).tutorial.index, 2, 'review alone does not authorize development');
    await guided.locator('#authorizeVehicleProgram').click(); await guided.waitForFunction(() => MDXGame.getState().tutorial.index === 3);
    await advance(guided, Math.ceil((await state(guided)).vehiclePrograms[0].daysRemaining) + 1);
    assert.equal((await state(guided)).vehicles[0].productionStatus, 'preproduction'); assert.equal((await state(guided)).tutorial.index, 3);
    await advance(guided, Math.ceil((await state(guided)).vehicles[0].releaseDaysRemaining));
    for (let i = 0; i < 60 && (await state(guided)).tutorial.index < 5; i++) await advance(guided, 1);
    const s = await state(guided); assert.equal(s.vehicles[0].productionStatus, 'production'); assert.ok(s.lifetimeUnits > 0); assert.equal(s.tutorial.index, 5);
  });
  await check('Production and cash steps require opening the controls; finishing removes help', async () => {
    await go(guided, 'home'); assert.equal(await guided.locator('[data-guide-next]').isDisabled(), true);
    await guided.locator('[data-guide-show]').click(); assert.equal(await guided.locator('#opsTabs [data-opstab="planning"].active').count(), 1); assert.equal(await guided.locator('[data-guide-next]').isDisabled(), false);
    await guided.locator('[data-guide-next]').click(); assert.equal((await state(guided)).tutorial.index, 6); assert.equal(await guided.locator('[data-guide-next]').isDisabled(), true);
    await guided.locator('[data-guide-show]').click(); assert.equal(await guided.locator('#view-budget.active').count(), 1); await guided.locator('[data-guide-next]').click();
    assert.equal((await state(guided)).tutorial.index, 7); await guided.locator('[data-guide-next]').click();
    assert.equal((await state(guided)).tutorial.finished, true); assert.equal(await guided.locator('#tutorialGuide, #depthHQ').count(), 0);
    await reload(guided); assert.equal((await state(guided)).tutorial.finished, true); assert.equal(await guided.locator('#tutorialGuide, #depthHQ').count(), 0);
  });
  await check('Choosing help once never checks it for the next company', async () => {
    await guided.reload(); await guided.locator('#newCompanyBtn').click(); assert.equal(await guided.locator('#newGameTutorial').isChecked(), false); assert.equal(await guided.locator('#tutorialGuide, #depthHQ').count(), 0);
  });
  await guided.close(); assert.deepEqual(report.errors, []); report.ok = true;
  console.log('PASS: ' + report.flows.length + ' tutorial flows and ' + report.layouts.length + ' builder layouts.');
})().catch(e => { report.ok = false; report.failure = e.stack; console.error(e); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(out, 'tutorial-report.json'), JSON.stringify(report, null, 2)); await browser?.close(); server?.close();
});
