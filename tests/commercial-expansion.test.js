'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const clone = x => JSON.parse(JSON.stringify(x)), close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, a + ' != ' + b);
function runtime() {
  const g = { console, setTimeout, clearTimeout }; g.window = g;
  const context = vm.createContext(g);
  for (const name of ['data.js', 'expansion-data.js', 'sim-core.js', 'expansion.js', 'industrial-era.js', 'commercial-expansion.js', 'studio-visuals.js', 'commercial-ui.js', 'industrial-release.js', 'commercial-release.js', 'storage.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context, { filename: name });
  return g;
}
function car(overrides = {}) {
  return { id: 'v1', name: 'Commercial One', modelYear: 1970, generation: 1, active: true, productionStatus: 'production', productionEnabled: true, year: 1970, msrp: 4000, rampMonths: 6, engineId: 'e1', design: { body: 'sedan', trans: '4m', engineId: 'e1', wheelMaterial: 'steel' }, stats: { reliability: 82, quality: 75, handling: 60, comfort: 70, safety: 60, mpg: 25, unitCost: 2200, className: 'Family', power: 120, lb: 2500 }, lastMonthSales: 300, lastMonthDemand: 400, commercialForecast: 400, lastMonthProduced: 350, factoryInventory: 0, ...overrides };
}
function state(g, overrides = {}) {
  const s = { campaignId: 'commercial-regression', company: 'Commercial Motors', year: 1970, startYear: 1970, month: 0, day: 1, cash: 1e7, debt: 0, rep: 40, rp: 0, employees: 50, overhead: 0, difficulty: 'normal', industry: [], engines: [{ id: 'e1', name: 'Released Four', stats: { power: 120, reliability: 82 } }], vehicles: [car()], subsidiaries: [], unlocked: [], daysPlayed: 0, monthsPlayed: 0, lastMonthSummary: { profit: 1000, netProfit: 1000, revenue: 10000, operatingCashFlow: 800 }, ...overrides };
  g.MDX.normalize(s); g.MDXIndustry.ensure(s); g.MDXCommercial.ensure(s); s.budgetSystem.protectProjects = false; s.budgetSystem.protectOperations = false; return s;
}
function tick(s) { s.day++; s.daysPlayed++; if (s.day > 30) { s.day = 1; s.month++; s.monthsPlayed++; if (s.month > 11) { s.month = 0; s.year++; } } }
function finish(g, s, days) { for (let i = 0; i < days; i++) { g.MDXCommercial.processProjectsDay(s); tick(s); } }
function peers() {
  return [{ id: 'rival', name: 'Rival Motors', status: 'healthy', aiCars: [{ id: 'r1', name: 'Peer A', active: true, segment: 'Family', price: 3000, quality: 70, reliability: 70, mpg: 24, power: 110, comfort: 55, safety: 50, unitCost: 1800 }, { id: 'r2', name: 'Peer B', active: true, segment: 'Family', price: 5000, quality: 80, reliability: 90, mpg: 30, power: 140, comfort: 75, safety: 70, unitCost: 2500 }] }];
}
test('commercial migration preserves legacy cash, product specification, tutorial opt-out and neutral economics', () => {
  const g = runtime(), s = state(g, { tutorial: { enabled: false, optedIn: false } }), before = clone({ cash: s.cash, stats: s.vehicles[0].stats, design: s.vehicles[0].design, tutorial: s.tutorial });
  delete s.commercialExpansion; delete s.vehicles[0].commercial; for (const r of s.marketSystem.regions) delete r.salesSupport;
  g.MDXCommercial.ensure(s); assert.deepEqual(clone({ cash: s.cash, stats: s.vehicles[0].stats, design: s.vehicles[0].design, tutorial: s.tutorial }), before);
  assert.equal(g.MDXCommercial.processOperatingDay(s), 0); assert.equal(g.MDXCommercial.demandMultiplier(s, s.vehicles[0]), 1); assert.equal(g.MDXCommercial.warrantyFactor(s), 1); assert.equal(s.vehicles[0].supplyPlan.enabled, false);
});
test('study authorization validates targets, uniqueness, reserves and all ten distinct study types without upfront charges', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, opening = s.cash;
  assert.equal(Object.keys(C.STUDIES).length, 10); assert.equal(C.startJob(s, 'study', 'missing', 'pricing').ok, false); assert.equal(C.startJob(s, 'study', 'v1', 'unknown').ok, false);
  assert.equal(C.startJob(s, 'study', 'v1', 'pricing').ok, true); assert.equal(C.startJob(s, 'study', 'v1', 'pricing').ok, false); assert.equal(s.cash, opening);
  s.industrialEra.policy.reserve = s.cash; assert.equal(C.startJob(s, 'study', 'v1', 'customers').ok, false);
});
test('paid research settles exactly once across reload and preserves the actual captured peer data', () => {
  const g = runtime(), C = g.MDXCommercial; let s = state(g, { industry: peers() }); const opening = s.cash, q = C.quote(s, 'study', 'v1', 'pricing'); C.startJob(s, 'study', 'v1', 'pricing');
  for (let i = 0; i < q.days; i++) { const worked = C.processProjectsDay(s); close(worked.development, q.daily); assert.equal(C.processProjectsDay(s).duplicate, true); if (i === 6) s = clone(s); tick(s); }
  close(opening - s.cash, q.cost); close(s.mtdDevelopmentSpend, q.cost); assert.equal(s.commercialExpansion.jobs[0].status, 'complete'); assert.equal(s.commercialExpansion.research.length, 1);
  const report = s.commercialExpansion.research[0]; assert.equal(report.cost, q.cost); assert.equal(report.benchmark.metrics.price.median, 4000);
  s.industry[0].aiCars[0].price = 11000; assert.equal(C.benchmark(s, s.vehicles[0]).metrics.price.median, 8000); assert.equal(report.benchmark.metrics.price.median, 4000);
  assert.equal(C.quote(s, 'study', 'v1', 'pricing').available, false); for (let i = 0; i < 30; i++) tick(s); assert.equal(C.quote(s, 'study', 'v1', 'pricing').available, true);
});
test('each study captures its own actual observations and none increases vehicle specifications or releases a model', () => {
  const g = runtime(), s = state(g, { industry: peers() }), C = g.MDXCommercial, before = clone(s.vehicles[0].stats), v = s.vehicles[0]; C.setStudySlots(s, 3);
  for (const kind of Object.keys(C.STUDIES)) assert.equal(C.startJob(s, 'study', v.id, kind).ok, true);
  finish(g, s, 110); assert.equal(s.commercialExpansion.research.length, 10); assert.ok(s.commercialExpansion.research.every(r => r.observations.length > 0 && r.cost > 0)); assert.deepEqual(clone(v.stats), before);
  const launch = s.commercialExpansion.research.find(r => r.kind === 'launch'); assert.equal(launch.observations.length, 8);
});
test('commercial work respects pause, resume, cancellation, retained spending and a funded-day guard', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, p = C.startJob(s, 'study', 'v1', 'competition').job; C.processProjectsDay(s); const spent = p.spent, remaining = p.daysRemaining;
  C.jobAction(s, p.id, 'pause'); tick(s); C.processProjectsDay(s); assert.equal(p.daysRemaining, remaining); assert.equal(p.spent, spent);
  C.jobAction(s, p.id, 'resume'); tick(s); C.processProjectsDay(s); assert.ok(p.spent > spent); const actual = p.spent; C.jobAction(s, p.id, 'cancel'); tick(s); C.processProjectsDay(s); assert.equal(p.spent, actual); assert.equal(s.commercialExpansion.research.length, 0);
});
test('commercial concurrency and protected cash produce real queues and funding delays', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial; C.setStudySlots(s, 1); const a = C.startJob(s, 'study', 'v1', 'pricing').job, b = C.startJob(s, 'study', 'v1', 'customers').job;
  C.processProjectsDay(s); assert.ok(a.spent > 0); assert.equal(b.spent, 0); assert.equal(b.phase, 'QUEUED');
  tick(s); s.budgetSystem.protectProjects = true; s.budgetSystem.reserveFloor = s.cash; C.processProjectsDay(s); assert.equal(a.phase, 'WAITING FOR FUNDING'); assert.equal(C.processProjectsDay(clone(s)).duplicate, true);
});
test('good and poor product messages affect demand only on a funded day and neutral restoration removes the recurring cost', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, v = s.vehicles[0]; C.setPositioning(s, v.id, { strategy: 'dependable', monthlySupport: 60000 }); assert.equal(C.demandMultiplier(s, v), 1);
  const spent = C.processOperatingDay(s); assert.ok(spent > 0); assert.ok(C.demandMultiplier(s, v) > 1 && C.demandMultiplier(s, v) <= 1.045); tick(s); assert.equal(C.demandMultiplier(s, v), 1); assert.ok(C.positioning(s, v, s.commercialExpansion.lastOperatingDay).multiplier > 1);
  C.setPositioning(s, v.id, { strategy: 'performance', monthlySupport: 60000 }); v.stats.handling = 5; v.stats.power = 20; C.processOperatingDay(s); assert.ok(C.demandMultiplier(s, v) < 1 && C.demandMultiplier(s, v) >= .97);
  C.setPositioning(s, v.id, { strategy: 'neutral', monthlySupport: 60000 }); assert.equal(v.commercial.monthlySupport, 0); assert.equal(C.demandMultiplier(s, v), 1); assert.equal(C.positioning(s, v).monthlyCost, 0);
});
test('operating support reserves unavoidable costs and protected cash before granting any funded effects', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, v = s.vehicles[0]; C.setPositioning(s, v.id, { strategy: 'family', monthlySupport: 60000 }); s.cash = 1100; s.industrialEra.policy.reserve = 1000;
  assert.equal(C.processOperatingDay(s, { unavoidableDaily: 100 }), 0); assert.equal(C.demandMultiplier(s, v), 1); assert.equal(s.cash, 1100);
  tick(s); s.cash = 5000; const spent = C.processOperatingDay(s, { unavoidableDaily: 1000 }); assert.equal(spent, C.moneyEra(s, 60000, 'marketing') / 30); assert.ok(s.cash - 1000 - spent >= s.industrialEra.policy.reserve);
});
test('six paid sales standards require funded staffing for both regional demand and delivery warranty effects', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, r = s.marketSystem.regions.find(r => r.unlocked); C.setStudySlots(s, 3); const opening = s.cash;
  for (const kind of Object.keys(C.SALES_PROGRAMS)) assert.equal(C.startJob(s, 'sales', r.id, kind).ok, true); finish(g, s, 75);
  assert.equal(C.salesProfile(s, r).installed, 6); assert.ok(s.cash < opening); assert.equal(C.regionMultiplier(s, r), 1); assert.equal(C.warrantyFactor(s), 1); assert.equal(C.startJob(s, 'sales', r.id, 'delivery').ok, false);
  C.setSalesBudget(s, r.id, 350); const paid = C.processOperatingDay(s); assert.ok(paid > 0); assert.ok(C.regionMultiplier(s, r) > 1 && C.regionMultiplier(s, r) <= 1.035); assert.ok(C.warrantyFactor(s) < 1); tick(s); assert.equal(C.regionMultiplier(s, r), 1); assert.equal(C.warrantyFactor(s), 1); assert.ok(C.salesProfile(s, r, s.commercialExpansion.lastOperatingDay).multiplier > 1);
});
test('closed markets cannot authorize sales training or consume staffing expense', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, closed = s.marketSystem.regions.find(r => !r.unlocked);
  assert.equal(C.startJob(s, 'sales', closed.id, 'knowledge').ok, false); assert.equal(C.setSalesBudget(s, closed.id, 350).ok, false); closed.salesSupport.budgetPerDealer = 350; assert.equal(C.processOperatingDay(s), 0);
});
test('commercial recurring support flows through the real daily fixed-cost cash and expense ledger', () => {
  const g = runtime(), base = state(g), s = clone(base), C = g.MDXCommercial; C.setPositioning(s, 'v1', { strategy: 'dependable', monthlySupport: 60000 }); const r = s.marketSystem.regions.find(r => r.unlocked); C.setSalesBudget(s, r.id, 200);
  const expected = C.positioning(s, s.vehicles[0]).monthlyCost / 30 + C.salesProfile(s, r).monthlyCost / 30, opening = s.cash, original = g.MDX.processDailyFixedCosts(base), actual = g.MDX.processDailyFixedCosts(s);
  close(actual - original, expected); close(opening - s.cash, actual); close(s.mtdFixedBreakdown.commercial, expected); close(s.mtdFixedCosts, actual); close(C.summary(s).mtdSpend, expected);
});
test('study costs flow through the real daily project ledger without a second cash debit', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, p = C.startJob(s, 'study', 'v1', 'pricing').job, opening = s.cash, result = g.MDX.dailyProjects(s, () => {});
  close(opening - s.cash, p.budget / p.totalDays); close(result.development, p.budget / p.totalDays); close(result.total, result.development); close(s.mtdDevelopmentSpend, result.development);
});
test('the core product-marketing path preserves paid weak-fit demand penalties', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, v = s.vehicles[0]; v.productMarketing = 0; v.stats.handling = 0; v.stats.power = 10;
  C.setPositioning(s, v.id, { strategy: 'performance', monthlySupport: 60000 }); assert.equal(g.MDX.productMarketingMultiplier(s, v), 1); g.MDX.processDailyFixedCosts(s); assert.ok(g.MDX.productMarketingMultiplier(s, v) < 1); close(g.MDX.productMarketingMultiplier(s, v), C.demandMultiplier(s, v));
});
test('competitor benchmarks exclude inactive, acquired, other-segment and bankrupt products and retain missing specifications', () => {
  const g = runtime(), s = state(g, { industry: peers() }), C = g.MDXCommercial; s.industry[0].aiCars.push({ id: 'old', segment: 'Family', active: false, price: 1 }, { id: 'sport', segment: 'Sport', active: true, price: 1 }, { id: 'missing', segment: 'Family', active: true, price: 6000 });
  s.industry.push({ id: 'owned', acquired: true, aiCars: [{ active: true, segment: 'Family', price: 1 }] }, { id: 'closed', status: 'bankrupt', aiCars: [{ active: true, segment: 'Family', price: 1 }] });
  const b = C.benchmark(s, s.vehicles[0]); assert.equal(b.rivalCount, 3); assert.equal(b.metrics.price.median, 5000); assert.equal(b.metrics.quality.median, 75); assert.equal(b.metrics.quality.sample, 2); assert.equal(b.closest.find(c => c.id === 'rival:missing').values.quality, null); assert.equal(b.metrics.quality.favorablePercentile, .5);
});
test('benchmark plot input retains the entire real price range and nearby products are sorted by price distance', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial; s.industry = [{ id: 'many', name: 'Many Motors', aiCars: Array.from({ length: 100 }, (_, i) => ({ id: 'p' + i, name: 'Product ' + i, active: true, segment: 'Family', price: 1000 + i * 100 })) }];
  const b = C.benchmark(s, s.vehicles[0]); assert.equal(b.prices.length, 100); assert.equal(b.prices.at(-1).price, 10900); assert.equal(b.closest.length, 6); assert.equal(b.closest[0].values.price, s.vehicles[0].msrp);
});
test('native rival cost and lastSales fields provide real manufacturing medians and preserve recorded zero retail sales', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial; s.vehicles[0].stats.unitCost = 2200; s.industry = [{ id: 'native', name: 'Native Motors', aiCars: [{ id: 'one', name: 'One', active: true, segment: 'Family', price: 3500, cost: 1900, lastSales: 0 }, { id: 'two', name: 'Two', active: true, segment: 'Family', price: 4500, cost: 2500, lastSales: 400 }] }];
  const b = C.benchmark(s, s.vehicles[0]); assert.equal(b.metrics.cost.sample, 2); assert.equal(b.metrics.cost.median, 2200); assert.equal(b.metrics.cost.favorablePercentile, .5); assert.equal(b.closest.find(x => x.id === 'native:one').monthlySales, 0); assert.equal(b.closest.find(x => x.id === 'native:two').monthlySales, 400);
});
test('launch readiness responds to the actual engine, factory staff, coverage, pricing and cash gates', () => {
  const g = runtime(), s = state(g, { industry: peers() }), C = g.MDXCommercial, v = s.vehicles[0], r = s.marketSystem.regions.find(r => r.unlocked), f = s.operations.factories[0]; f.workers = 150; f.trainees = 0; f.morale = 75;
  let checks = C.readiness(s, v, r.id).checks; assert.equal(checks.length, 8); assert.equal(checks.find(x => x.id === 'powertrain').pass, true); assert.equal(checks.find(x => x.id === 'workforce').pass, true);
  s.engines = []; f.workers = 150; f.trainees = 130; f.morale = 30; v.msrp = 100; s.cash = 0; checks = C.readiness(s, v, r.id).checks;
  for (const key of ['powertrain', 'workforce', 'pricing', 'cash']) assert.equal(checks.find(x => x.id === key).pass, false, key);
  const closed = s.marketSystem.regions.find(r => !r.unlocked); assert.equal(C.readiness(s, v, closed.id).checks.find(x => x.id === 'coverage').pass, false);
});
test('unreleased prototypes and deleted launch targets remain safe and cannot apply production supply policy', () => {
  const g = runtime(), s = state(g, { vehicles: [] }), C = g.MDXCommercial, draft = car({ id: 'draft', productionStatus: 'development' }); s.vehiclePrograms = [{ id: 'vp', status: 'active', vehicle: draft }]; C.ensure(s);
  const d = C.dossier(s, draft); assert.equal(d.operations.capacity, 0); assert.equal(d.readiness.checks.find(x => x.id === 'release').pass, false); assert.equal(d.readiness.checks.find(x => x.id === 'capacity').pass, false);
  const plan = C.createPlan(s, { vehicleId: draft.id, regionId: s.marketSystem.regions[0].id, months: 1, volume: 100 }).plan; assert.equal(C.applyLaunchSupply(s, plan.id).ok, false);
  s.vehiclePrograms = []; s.month++; assert.doesNotThrow(() => C.agenda(s)); assert.doesNotThrow(() => C.processMonth(s));
});
test('BEV launch powertrain and showroom labels use the existing electrification architecture', () => {
  const g = runtime(), s = state(g, { engines: [] }), v = s.vehicles[0]; v.design.propulsion = 'bev'; v.electrification = { architecture: 'bev' };
  assert.equal(g.MDXCommercial.readiness(s, v).checks.find(x => x.id === 'powertrain').pass, true); assert.equal(g.MDXCommercial.dossier(s, v).engine, 'Electric propulsion');
});
test('launch targets use actual retail sales, close once and never grant money or automatically release products', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, v = s.vehicles[0], regionId = s.marketSystem.regions[0].id, opening = s.cash;
  const p = C.createPlan(s, { vehicleId: v.id, regionId, months: 1, volume: 500 }).plan; assert.equal(C.createPlan(s, { vehicleId: v.id, regionId, months: 1, volume: 500 }).ok, false);
  C.processMonth(s); assert.equal(p.status, 'planned'); s.month++; v.lastMonthSales = 400; C.processMonth(s); assert.equal(p.overdueLogged, true); const history = s.commercialExpansion.history.length; C.processMonth(clone(s)); assert.equal(s.commercialExpansion.history.length, history);
  s.month++; v.lastMonthSales = 500; C.processMonth(s); assert.equal(p.status, 'achieved'); assert.equal(p.actualSales, 500); assert.equal(s.cash, opening);
});
test('launch rescheduling and archive preserve actual work while launch supply uses the existing bounded policy', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, v = s.vehicles[0], p = C.createPlan(s, { vehicleId: v.id, regionId: s.marketSystem.regions[0].id, months: 3, volume: 100000 }).plan, opening = s.cash;
  C.applyLaunchSupply(s, p.id); assert.equal(v.supplyPlan.cover, 3); assert.equal(v.supplyPlan.enabled, true); C.planAction(s, p.id, 'reschedule', { months: 24 }); assert.equal(p.targetPeriod, C.period(s) + 24); C.planAction(s, p.id, 'archive'); assert.equal(p.status, 'archived'); assert.equal(s.cash, opening);
});
test('showroom paint and wheel finishes render differently, obey era gates and restore exact original appearance without stat changes', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial, v = s.vehicles[0], original = clone(v.design), stats = clone(v.stats), cash = s.cash, svg = d => g.MDXRenderLibrary.vehicleSVG(d, v.stats, { modelYear: 1970, name: v.name });
  assert.equal(Object.keys(C.PALETTES).length, 6); C.setAppearance(s, v.id, 'blue', 'steel'); const steel = svg(v.design); C.setAppearance(s, v.id, 'blue', 'chrome'); const chrome = svg(v.design); C.setAppearance(s, v.id, 'blue', 'alloy'); const alloy = svg(v.design);
  assert.notEqual(steel, chrome); assert.notEqual(chrome, alloy); assert.equal(v.design.wheelMaterial, 'steel'); assert.deepEqual(clone(v.stats), stats); assert.equal(s.cash, cash);
  C.setAppearance(s, v.id, 'original', ''); assert.deepEqual(clone(v.design), original); s.year = 1950; assert.equal(C.setAppearance(s, v.id, 'red', 'alloy').ok, false);
});
test('original custom paint and existing wheel presentation survive repeated cosmetic changes and save/reload', () => {
  const g = runtime(), C = g.MDXCommercial; let s = state(g), v = s.vehicles[0]; v.design.paintColor = '#abcdef'; v.design.presentationWheel = 'chrome'; const original = clone(v.design);
  C.setAppearance(s, v.id, 'red', 'alloy'); s = clone(s); C.setAppearance(s, 'v1', 'ivory', 'steel'); C.setAppearance(s, 'v1', 'original', ''); assert.deepEqual(clone(s.vehicles[0].design), original);
});
test('optional headquarters pinning stays off by default, survives reload, and validates an existing model', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial; assert.equal(s.commercialExpansion.ui.pinnedVehicleId, undefined); assert.equal(C.pin(s, 'missing').ok, false); C.pin(s, 'v1'); assert.equal(C.ensure(clone(s)).ui.pinnedVehicleId, 'v1'); C.pin(s, ''); assert.equal(s.commercialExpansion.ui.pinnedVehicleId, '');
});
test('monthly commercial reports capture exact funded operating expense once and CSV matches the saved close', () => {
  const g = runtime(), s = state(g), C = g.MDXCommercial; C.setPositioning(s, 'v1', { strategy: 'family', monthlySupport: 60000 }); const daily = g.MDX.processDailyFixedCosts(s); g.MDXIndustry.processMonth(s); C.processMonth(s);
  const row = s.commercialExpansion.monthly[0], spend = row.spend; assert.equal(spend, s.mtdFixedBreakdown.commercial); assert.equal(s.lastMonthSummary.commercialOperatingSpend, spend); assert.equal(C.summary(s).mtdSpend, 0); assert.equal(C.processMonth(clone(s)).duplicate, true);
  const csv = g.MDXCommercialUI.monthlyCSV(s).split('\n'); assert.equal(csv.length, 2); assert.equal(Number(csv[1].split(',').at(-1)), spend); assert.ok(daily >= spend);
});
test('commercial save validation rejects corrupt arrays and nonfinite nested numbers while legacy saves remain valid', () => {
  const g = runtime(), s = state(g); assert.equal(g.MDXStorage.validateState(s, { strict: true }).ok, true); const bad = clone(s); bad.commercialExpansion.research = {}; assert.equal(g.MDXStorage.validateState(bad).ok, false);
  const nonfinite = clone(s); nonfinite.vehicles[0].commercial.monthlySupport = Infinity; assert.equal(g.MDXStorage.validateState(nonfinite, { strict: true }).ok, false); const legacy = clone(s); delete legacy.commercialExpansion; assert.equal(g.MDXStorage.validateState(legacy).ok, true);
});
test('industrial queue priorities preserve budget, spent work, day guards and installed totals beyond a trimmed archive', () => {
  const g = runtime(), s = state(g), I = g.MDXIndustry, f = s.operations.factories[0]; I.setCompanyPolicy(s, { projectSlots: 1 }); const a = I.startProject(s, 'factory', f.id, 'fixtures').project, b = I.startProject(s, 'factory', f.id, 'lean').project;
  I.processProjectsDay(s); const spent = a.spent, budget = a.budget; assert.equal(I.projectAction(s, b.id, 'moveUp').ok, true); assert.equal(s.industrialEra.projects[0].id, b.id); assert.equal(I.processProjectsDay(s).duplicate, true); assert.equal(a.spent, spent); assert.equal(a.budget, budget);
  tick(s); I.processProjectsDay(s); assert.ok(b.spent > 0); I.projectAction(s, b.id, 'moveDown'); assert.equal(s.industrialEra.projects[0].id, a.id);
  s.industrialEra.projects = []; f.industrial.levels.fixtures = 2; f.industrial.levels.lean = 2; assert.equal(I.projectSummary(s).completed, 4);
});
test('release catalogue retains the earlier 127 entries and documents exactly eighty new additions with unique sequential IDs', () => {
  const g = runtime(); assert.equal(g.MDXCommercialRelease.length, 80); assert.equal(g.MDXIndustrialRelease.length, 207); assert.deepEqual(clone(g.MDXIndustrialRelease.map(x => x.id)), Array.from({ length: 207 }, (_, i) => i + 1)); assert.equal(new Set(g.MDXIndustrialRelease.map(x => x.title)).size, 207);
});
test('forty years of commercial decisions remain deterministic, bounded and valid through monthly save/reload', () => {
  const g = runtime(), C = g.MDXCommercial;
  function run() {
    let s = state(g, { year: 1940, startYear: 1940 }); const r = s.marketSystem.regions.find(r => r.unlocked); C.setPositioning(s, 'v1', { strategy: 'dependable', monthlySupport: 10000 }); C.setSalesBudget(s, r.id, 50); C.startJob(s, 'study', 'v1', 'launch'); C.startJob(s, 'sales', r.id, 'delivery');
    for (let month = 0; month < 480; month++) { for (let d = 0; d < 30; d++) { const operating = C.processOperatingDay(s); s.cash -= operating; C.processProjectsDay(s); if (d < 29) tick(s); } C.processMonth(s); s = clone(s); tick(s); if (month % 6 === 0) C.startJob(s, 'study', 'v1', 'pricing'); }
    return s;
  }
  const a = run(), b = run(); assert.equal(a.year, 1980); close(a.cash, b.cash); assert.deepEqual(a.commercialExpansion, b.commercialExpansion); assert.ok(a.commercialExpansion.monthly.length <= 120 && a.commercialExpansion.history.length <= 100 && a.commercialExpansion.research.length <= 80 && a.commercialExpansion.jobs.length <= 80); assert.equal(g.MDXStorage.validateState(a, { strict: true }).ok, true); assert.ok(a.commercialExpansion.research.some(r => r.kind === 'pricing')); assert.equal(a.marketSystem.regions.find(r => r.unlocked).salesSupport.levels.delivery, 1);
});
