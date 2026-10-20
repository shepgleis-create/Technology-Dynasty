/* Connected gameplay and optional tutorial, through UI and the real daily clock. */
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright'), { createServer } = require('./dev');
const out = path.resolve(__dirname, '../playtest-depth-output'); fs.mkdirSync(out, { recursive: true });
const report = { flows: [], errors: [], longRun: [] }; let browser, page, server;
const read = (fn, arg) => page.evaluate(fn, arg), go = (v, t) => page.evaluate(([v, t]) => MDXGame.navigate(v, t), [v, t]);
const advance = days => page.evaluate(n => MDXQA.advance(n), days);
async function check(name, fn) { console.log('Checking ' + name); await fn(); report.flows.push(name); }
async function snap(name) { await page.screenshot({ path: path.join(out, name + '.png') }); }
async function field(key, value) { const input = page.locator('[data-depth-field="' + key + '"]').filter({ visible: true }).first(); await input.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, value); }
async function click(action) { await page.locator('[data-depth-action="' + action + '"]').filter({ visible: true }).first().click(); }
async function reload() { await read(() => MDXGame.save()); await page.reload(); await page.locator('#continueBtn').click(); await page.locator('#screen-game.active').waitFor(); }
(async () => {
  server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ headless: true, ...(process.env.MOTOR_CHROMIUM_PATH ? { executablePath: process.env.MOTOR_CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); page.setDefaultTimeout(15000);
  page.on('pageerror', e => report.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); }); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:' + server.address().port);
  await check('New company enables an optional tutorial and campaign goal', async () => {
    await page.locator('#newCompanyBtn').click(); await page.locator('#companyName').fill('Depth Test Motors'); await page.locator('#founderName').fill('Playtester'); await page.locator('[data-start-year="1940"]').click(); await page.locator('#difficulty').selectOption('casual'); assert.equal(await page.locator('#newGameTutorial').isChecked(), false); await page.locator('#newGameTutorial').check(); await page.locator('#newGameChallenge').selectOption('builder'); await snap('new-company-phone');
    await page.locator('#toHQ').click(); await page.locator('#toSummary').click(); await page.locator('#foundBtn').click(); await page.locator('#screen-game.active').waitFor(); await page.locator('#tutorialGuide').waitFor(); assert.equal(await read(() => MDXGame.getState().gameplayDepth.challenge.type), 'builder'); assert.equal(await page.locator('#depthHQ').count(), 0); await snap('tutorial-phone');
  });
  await check('Tutorial follows real actions, minimizes, toggles off and resumes after reload', async () => {
    await page.locator('[data-guide-show]').click(); assert.equal(await page.locator('#view-engine.active').count(), 1); await page.locator('[data-guide-collapse]').click(); await page.locator('[data-guide-expand]').click();
    await page.locator('#engineName').fill('Guide I4'); await page.locator('#saveEngine').click(); await page.waitForFunction(() => MDXGame.getState().tutorial.index === 1); await page.locator('[data-guide-off]').click(); assert.equal(await page.locator('#tutorialGuide, #depthHQ').count(), 0); await reload(); assert.equal(await read(() => MDXGame.getState().tutorial.index), 1); assert.equal(await read(() => MDXGame.getState().tutorial.enabled), false);
    await go('finance'); await page.locator('#openStorageSettings').click(); await page.locator('[data-depth-field="tutorialEnabled"]').check(); assert.equal(await read(() => MDXGame.getState().tutorial.index), 1); await page.locator('[data-depth-field="tutorialEnabled"]').uncheck(); await page.locator('#closeStorage').click(); assert.equal(await page.locator('#tutorialGuide').count(), 0);
  });
  await check('Real engine and vehicle development unlock the new systems', async () => {
    await advance(await read(() => MDXGame.getState().enginePrograms[0].daysRemaining) + 1); await go('vehicle'); await page.locator('#vehicleName').fill('Dynasty One'); await page.locator('[data-vtab="production"]').click(); await page.locator('[data-vslider="msrp"]').evaluate(e => { e.value = 3000; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }); await page.locator('#saveVehicle').click(); await page.locator('#authorizeVehicleProgram').click(); await advance(await read(() => MDXGame.getState().vehiclePrograms[0].daysRemaining) + 45); assert.equal(await read(() => MDXGame.getState().vehicles[0].productionStatus), 'production');
  });
  await check('Detailed engineering revision requires funded testing, signoff and tooling before entering production', async () => {
    await go('library', 'testing');
    assert.equal(await page.locator('#engineeringLab').count(), 1);
    const before = await read(() => ({ ...MDXGame.getState().vehicles[0].stats }));
    await page.locator('#engineeringLab [data-engineering-field="labMode"]').selectOption('revision');
    const tuning = async (key, value) => page.locator('#engineeringLab [data-engineering-field="setup-' + key + '"]').evaluate((e, v) => {
      e.value = String(v);
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await tuning('gearing', 2);
    await tuning('suspension', 1);
    await tuning('cooling', 2);
    const quote = await read(() => {
      const s = MDXGame.getState(), v = s.vehicles[0], u = MDXEngineering.ensure(s).ui;
      return MDXEngineering.labQuote(s, v.id, 'road', u.drafts?.[v.id], { mode: 'revision' });
    });
    assert.equal(quote.available, true, quote.reason);
    assert.ok(quote.changes > 0);
    await snap('test-center-phone');
    await page.locator('#engineeringLab [data-engineering-action="authorize"]').click();
    const job = await read(() => MDXGame.getState().gameplayDepth.labPrograms.find(p => p.detailed && p.mode === 'revision'));
    assert.equal(job.status, 'active');
    assert.equal(await read(() => MDXGame.getState().vehicles[0].stats.zero), before.zero);
    await advance(Math.ceil(job.daysRemaining) + 3);
    const reviewed = await read(id => {
      const s = MDXGame.getState(), p = s.gameplayDepth.labPrograms.find(x => x.id === id);
      return { status: p.status, spent: p.spent, zero: s.vehicles[0].stats.zero };
    }, job.id);
    assert.equal(reviewed.status, 'review');
    assert.ok(reviewed.spent > 0);
    assert.equal(reviewed.zero, before.zero);
    await go('library', 'testing');
    await page.locator('#engineeringLab [data-engineering-action="approve"]').first().click();
    const changeover = await read(id => {
      const p = MDXGame.getState().gameplayDepth.labPrograms.find(x => x.id === id);
      return { status: p.status, days: p.changeover?.daysRemaining };
    }, job.id);
    assert.equal(changeover.status, 'commissioning');
    await advance(Math.ceil(changeover.days) + 3);
    const finished = await read(id => {
      const s = MDXGame.getState(), p = s.gameplayDepth.labPrograms.find(x => x.id === id);
      return { status: p.status, spent: p.spent, tooling: p.changeover?.spent, setup: s.vehicles[0].engineeringSetup, stats: s.vehicles[0].stats };
    }, job.id);
    assert.equal(finished.status, 'complete');
    assert.ok(finished.tooling > 0);
    assert.equal(finished.setup.gearing, 2);
    assert.ok(finished.stats.zero < before.zero);
    assert.ok(finished.stats.unitCost > before.unitCost);
    await reload();
    assert.equal(await read(() => MDXGame.getState().vehicles[0].engineeringSetup.gearing), 2);
    assert.ok(await read(() => MDXGame.getState().gameplayDepth.labResults.some(r => r.detailed && r.applied)));
  });
  await check('A related wagon goes through authorization and joins its family', async () => {
    await go('library', 'families'); await field('familyBody', 'wagon'); await click('build-variant'); assert.equal(await page.locator('#view-vehicle.active').count(), 1); assert.equal(await read(() => MDXGame.getState().vehicleDraft.familyId), await read(() => MDXDepth.familyKey(MDXGame.getState().vehicles[0]))); await page.locator('#saveVehicle').click(); await page.locator('#authorizeVehicleProgram').click(); await advance(await read(() => MDXGame.getState().vehiclePrograms.filter(p => p.status === 'active')[0].daysRemaining) + 35); await go('library', 'families'); assert.equal(await read(() => MDXDepth.familyGroups(MDXGame.getState())[0].variants.length), 2); await snap('vehicle-family-phone');
  });
  await check('Supplier proposals return actual counteroffers and real deposits', async () => {
    await go('library', 'contracts'); await field('minimum', 50); await field('discount', 12); await field('term', 6); await click('supplier-offer'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.negotiations[0].status), 'pending'); await advance(35); await go('library', 'contracts'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.negotiations[0].status), 'countered'); const before = await read(() => MDXGame.getState().cash); await click('supplier-sign'); const deposit = await read(() => MDXGame.getState().gameplayDepth.procurement[0].deposit); assert.ok(Math.abs(before - await read(() => MDXGame.getState().cash) - deposit) < .01); await reload(); assert.equal(await read(() => MDXGame.getState().gameplayDepth.procurement[0].depositBalance), deposit); await go('library', 'contracts'); await snap('supplier-contract-phone');
  });
  await check('Fleet negotiations sign into normal deliveries, suitability and margin rules', async () => {
    await go('library', 'contracts'); const options = await page.locator('[data-depth-field="fleetSource"] option').evaluateAll(es => es.map(e => e.value)); let found = false;
    for (const id of options) { const fit = await page.evaluate(id => { const s = MDXGame.getState(), o = s.marketSystem.fleetOffers.find(o => o.id === id); return !!MDX.fleetCandidateForOffer(s, o); }, id); if (fit) { await field('fleetSource', id); found = true; break; } }
    assert.equal(found, true); await field('fleetPrice', 98); await field('fleetUnits', 50); await click('fleet-offer'); await advance(35); await go('library', 'contracts'); await click('fleet-sign'); assert.ok(await read(() => MDXGame.getState().marketSystem.fleetContracts.some(c => c.negotiatedTerms))); await advance(35); assert.ok(await read(() => MDXGame.getState().marketSystem.fleetContracts.some(c => c.delivered > 0))); report.fleetDeliveries = await read(() => MDXGame.getState().marketSystem.fleetContracts.reduce((a, c) => a + (c.delivered || 0), 0));
  });
  await check('Racing completes a scored season and never charges finished rounds again', async () => {
    await go('market', 'motorsport'); await field('raceDriver', 'veteran'); await field('racePreparation', 1.3); await click('start-season'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.seasons[0].status), 'active'); await advance(190); await go('market', 'motorsport'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.seasons[0].status), 'complete'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.seasons[0].results.length), 6); const spend = await read(() => MDXGame.getState().gameplayDepth.seasons[0].spent); await reload(); await advance(35); assert.equal(await read(() => MDXGame.getState().gameplayDepth.seasons[0].spent), spend); await go('market', 'motorsport'); await snap('racing-season-phone'); report.racing = await read(() => ({ ...MDXGame.getState().gameplayDepth.seasons[0] }));
  });
  await check('Company manager approves and reviews a company-funded business plan', async () => {
    await go('finance', 'capital'); await page.locator('#corporateMarketPanel').evaluate(e => e.closest('details').open = true); await page.locator('[data-corp-buy^="market_transmission_"]').filter({ visible: true }).first().click(); await page.locator('#industrialModal:not(.hidden)').waitFor(); await field('planMonths', 6); await field('planBudget', 6000); await field('planType', 'technology'); await click('start-plan'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.plans[0].status), 'active'); await page.locator('#closeIndustrial').click(); await advance(190); const plan = await read(() => MDXGame.getState().gameplayDepth.plans[0]); report.plan = plan; assert.ok(['complete', 'missed'].includes(plan.status)); assert.ok(plan.spent > 0 && plan.spent <= plan.budget); assert.equal(plan.history.length, 6); report.plan = plan;
  });
  await check('HQ decisions, campaign goals and vehicle archive remain actionable', async () => {
    await go('finance'); await page.locator('#openStorageSettings').click(); await page.locator('[data-depth-field="tutorialEnabled"]').check(); await page.locator('#closeStorage').click(); await go('home'); await page.locator('[data-depth-action="decision-later"]').first().click(); assert.ok(await read(() => MDXGame.getState().gameplayDepth.decisions.some(d => d.status === 'deferred'))); await go('library', 'history'); assert.ok(await page.locator('#depthLegacy .depth-museum img').count()); await click('favorite'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.museum.some(v => v.favorite)), true); await field('challenge', 'survive'); await click('start-challenge'); assert.equal(await read(() => MDXGame.getState().gameplayDepth.challenge.type), 'survive'); await snap('goals-archive-phone');
  });
  await check('New surfaces fit phone and desktop screens without horizontal overflow', async () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) { await page.setViewportSize(viewport); for (const [v, t] of [['home'], ['library', 'testing'], ['library', 'families'], ['library', 'contracts'], ['market', 'motorsport'], ['library', 'history'], ['finance', 'group']]) { await go(v, t); assert.ok(await read(() => document.documentElement.scrollWidth - innerWidth <= 1)); assert.ok(await read(() => { const m = document.querySelector('.game-main'); return m.scrollWidth - m.clientWidth <= 1; })); } } await snap('archive-desktop');
  });
  if (process.env.MOTOR_SKIP_LONG_RUN !== '1') await check('1940–1980 daily simulation stays finite and preserves all new save records', async () => {
    await go('home'); const yearEndDays = 40 * 360;
    while (await read(() => MDXGame.getState().daysPlayed) < yearEndDays) { const days = Math.min(720, yearEndDays - await read(() => MDXGame.getState().daysPlayed)); await advance(days); const row = await read(() => { const s = MDXGame.getState(); return { year: s.year, month: s.month, days: s.daysPlayed, cash: s.cash, rep: s.rep, profit: s.lastProfit, sales: s.lifetimeUnits, residual: s.lastMonthSummary?.cashReconciliationResidual, closeComplete: __MDX_MONTH_CLOSE_TRACE__?.completed }; }); for (const k of ['cash', 'rep', 'profit', 'days']) assert.ok(Number.isFinite(row[k]), k + ' became non-finite'); assert.equal(row.closeComplete, true); assert.ok(Math.abs(row.residual || 0) < 1); report.longRun.push(row); console.log('Simulated through ' + row.year + ' / ' + (row.month + 1)); }
    const snapshot = await read(() => { const s = MDXGame.getState(); return { cash: s.cash, days: s.daysPlayed, depth: s.gameplayDepth, tutorial: s.tutorial, vehicles: s.vehicles.map(v => v.id) }; }); await reload(); assert.deepEqual(await read(() => { const s = MDXGame.getState(); return { cash: s.cash, days: s.daysPlayed, depth: s.gameplayDepth, tutorial: s.tutorial, vehicles: s.vehicles.map(v => v.id) }; }), snapshot); assert.equal(await read(() => MDXGame.getState().year), 1980);
  });
  assert.deepEqual(report.errors, []); report.ok = true; console.log('PASS: ' + report.flows.length + ' connected gameplay flows and optional tutorial' + (report.longRun.length ? ', including forty-year simulation.' : '.'));
})().catch(async error => { report.ok = false; report.failure = error.stack; console.error(error); if (page) { report.stateAtFailure = await read(() => ({ year: MDXGame?.getState()?.year, days: MDXGame?.getState()?.daysPlayed })).catch(() => null); fs.writeFileSync(path.join(out, 'failure-state.json'), JSON.stringify(await read(() => MDXGame.getState()).catch(() => null), null, 2)); await snap('failure').catch(() => {}); } process.exitCode = 1; }).finally(async () => { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser?.close(); server?.close(); });
