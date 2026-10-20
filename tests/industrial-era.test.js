'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const clone = x => JSON.parse(JSON.stringify(x));
function runtime() {
  const g = { console }; g.window = g; const context = vm.createContext(g);
  for (const name of ['data.js', 'expansion-data.js', 'sim-core.js', 'expansion.js', 'industrial-era.js', 'storage.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context, { filename: name });
  return g;
}
function state(g, overrides = {}) {
  const s = { campaignId: 'industrial-regression', company: 'Industrial Motors', year: 1970, startYear: 1970, month: 0, day: 1, cash: 1e7, debt: 0, rep: 40, rp: 0, employees: 50, overhead: 0, difficulty: 'normal', industry: [], engines: [], vehicles: [], subsidiaries: [], unlocked: [], daysPlayed: 0, monthsPlayed: 0, lastMonthSummary: { profit: 1000, netProfit: 1000, revenue: 10000, operatingCashFlow: 800 }, ...overrides };
  g.MDX.normalize(s); g.MDXIndustry.ensure(s); s.budgetSystem.protectProjects = false; s.budgetSystem.protectOperations = false; return s;
}
function car(overrides = {}) {
  return { id: 'v1', name: 'Industrial One', active: true, productionStatus: 'production', productionEnabled: true, year: 1970, msrp: 4000, rampMonths: 6, engineId: 'e1', design: { body: 'sedan', trans: '4m', engineId: 'e1' }, stats: { reliability: 82, quality: 75, handling: 60, comfort: 70, safety: 60, mpg: 25, unitCost: 2200, className: 'Family', power: 120, lb: 2500 }, lastMonthSales: 300, lastMonthDemand: 400, commercialForecast: 400, lastMonthProduced: 350, lastMonthContribution: 500000, factoryInventory: 0, ...overrides };
}
function tick(s) { s.day++; s.daysPlayed++; if (s.day > 30) { s.day = 1; s.month++; s.monthsPlayed++; if (s.month > 11) { s.month = 0; s.year++; } } }
test('legacy state migration is additive, preserves cash and products, and keeps original supply behavior', () => {
  const g = runtime(), s = state(g, { vehicles: [car()], tutorial: { enabled: false, optedIn: false } }), before = clone({ cash: s.cash, vehicles: s.vehicles, tutorial: s.tutorial });
  delete s.industrialEra; delete s.operations.factories[0].industrial; delete s.vehicles[0].supplyPlan; g.MDXIndustry.ensure(s);
  assert.equal(s.cash, before.cash); assert.equal(s.vehicles[0].msrp, before.vehicles[0].msrp); assert.deepEqual(clone(s.vehicles[0].stats), before.vehicles[0].stats); assert.deepEqual(s.tutorial, before.tutorial); assert.equal(s.vehicles[0].supplyPlan.enabled, false);
  assert.equal(g.MDXIndustry.supplyTarget(s, s.vehicles[0], { capacity: 500, forecast: 400, pipeline: 0, wait: 0 }), null);
  const f = s.operations.factories[0], x = g.MDXIndustry.factoryEffects(s, f); assert.equal(x.capacity, 1); assert.equal(x.cost, 1); assert.equal(x.inspection, 0);
});
test('all plant programs enforce era, funding, target and unique active authorization', () => {
  const g = runtime(), s = state(g, { year: 1940 }), I = g.MDXIndustry, f = s.operations.factories[0];
  assert.equal(Object.keys(I.PROGRAMS).length, 16); assert.equal(I.startProject(s, 'factory', f.id, 'robotics').ok, false); assert.equal(I.startProject(s, 'factory', 'missing', 'lean').ok, false);
  const q = I.quote(s, 'factory', f.id, 'lean'), opening = s.cash, p = I.startProject(s, 'factory', f.id, 'lean'); assert.equal(p.ok, true); assert.equal(s.cash, opening); assert.equal(p.project.daysRemaining, q.days); assert.equal(I.startProject(s, 'factory', f.id, 'lean').ok, false); assert.equal(f.industrial.levels.lean, 0);
  s.cash = 0; assert.equal(I.startProject(s, 'factory', f.id, 'energy').ok, false);
  s.cash = opening; f.status = 'construction'; assert.equal(I.startProject(s, 'factory', f.id, 'energy').ok, false);
});
test('funded capital completion, reload, cancellation and two-level limits settle exactly once', () => {
  const g = runtime(), I = g.MDXIndustry; let s = state(g), f = s.operations.factories[0], q = I.quote(s, 'factory', f.id, 'fixtures'), opening = s.cash;
  I.startProject(s, 'factory', f.id, 'fixtures');
  for (let i = 0; i < q.days; i++) { const result = I.processProjectsDay(s); assert.ok(result.capital > 0); assert.equal(result.development, 0); assert.equal(I.processProjectsDay(s).capital, 0); if (i === 7) s = clone(s); tick(s); }
  f = s.operations.factories[0]; assert.equal(f.industrial.levels.fixtures, 1); assert.ok(Math.abs(opening - s.cash - q.cost) < .0001); assert.ok(Math.abs(s.mtdCapitalSpend - q.cost) < .0001);
  const once = s.cash; I.processProjectsDay(s); assert.equal(s.cash, once);
  const second = I.startProject(s, 'factory', f.id, 'fixtures'); for (let i = 0; i < second.project.totalDays; i++) { tick(s); I.processProjectsDay(s); }
  assert.equal(f.industrial.levels.fixtures, 2); assert.equal(I.startProject(s, 'factory', f.id, 'fixtures').ok, false);
  const partial = I.startProject(s, 'factory', f.id, 'lean'); tick(s); I.processProjectsDay(s); const spent = partial.project.spent; assert.ok(spent > 0); assert.equal(I.projectAction(s, partial.project.id, 'cancel').ok, true); const balance = s.cash; tick(s); I.processProjectsDay(s); assert.equal(s.cash, balance); assert.equal(f.industrial.levels.lean, 0); assert.equal(partial.project.spent, spent);
});
test('process development is expense and capital equipment is investment in the real daily scheduler', () => {
  const g = runtime(), I = g.MDXIndustry, s = state(g), f = s.operations.factories[0];
  I.startProject(s, 'factory', f.id, 'crossTraining'); I.startProject(s, 'factory', f.id, 'energy'); const opening = s.cash;
  const result = g.MDX.dailyProjects(s, () => {}); assert.ok(result.development > 0); assert.ok(result.capital > 0); assert.ok(Math.abs(opening - s.cash - result.total) < 1e-6); assert.ok(s.mtdDevelopmentSpend > 0 && s.mtdCapitalSpend > 0);
  assert.equal(I.processProjectsDay(s).duplicate, true);
});
test('cash reserve, pause, resume and commissioning queue preserve unfinished work', () => {
  const g = runtime(), s = state(g), I = g.MDXIndustry, f = s.operations.factories[0]; I.setCompanyPolicy(s, { projectSlots: 1, reserve: 1e6 });
  const a = I.startProject(s, 'factory', f.id, 'fixtures').project, b = I.startProject(s, 'factory', f.id, 'lean').project;
  I.processProjectsDay(s); assert.ok(a.spent > 0); assert.equal(b.spent, 0); assert.match(b.phase, /QUEUED/);
  I.projectAction(s, a.id, 'pause'); tick(s); I.processProjectsDay(s); assert.ok(b.spent > 0); const days = a.daysRemaining; I.projectAction(s, a.id, 'resume'); s.cash = 1e6; tick(s); I.processProjectsDay(s); assert.equal(a.daysRemaining, days); assert.match(a.phase, /FUNDING/); assert.equal(s.cash, 1e6);
  assert.equal(I.projectSummary(s).queued, 1);
});
test('completed improvements modify actual manufacturing capacity, quality and cash costs without stat stacking', () => {
  const g = runtime(), s = state(g, { vehicles: [car()] }), I = g.MDXIndustry, v = s.vehicles[0], f = s.operations.factories[0];
  const capacity = g.MDX.factoryMonthlyCapacity(s), cost = g.MDX.vehicleTransmissionEconomics(s, v, { cost: 1 }).internalCashCost, quality = g.MDX.factoryQualityProfile(s, v), stats = clone(v.stats);
  f.industrial.levels.lean = 2; f.industrial.levels.fixtures = 2; f.industrial.levels.metrology = 2;
  assert.ok(g.MDX.factoryMonthlyCapacity(s) > capacity); assert.ok(g.MDX.vehicleTransmissionEconomics(s, v, { cost: 1 }).internalCashCost < cost);
  const enhanced = g.MDX.factoryQualityProfile(s, v); assert.ok(enhanced.firstPassYield > quality.firstPassYield); assert.ok(enhanced.inspectionCatch > quality.inspectionCatch);
  const first = clone(I.factoryEffects(s, f)); for (let i = 0; i < 100; i++) { I.factoryEffects(s, f); g.MDX.factoryMonthlyCapacity(s); }
  assert.deepEqual(clone(I.factoryEffects(s, f)), first); assert.deepEqual(clone(v.stats), stats);
  I.setFactoryPolicy(s, f.id, { reserveCapacity: .25, inspection: 3 }); assert.ok(g.MDX.factoryMonthlyCapacity(s) < capacity);
});
test('crew fatigue safeguards, improved maintenance, and commissioning effects are applied on actual days', () => {
  const g = runtime(), s = state(g), I = g.MDXIndustry, f = s.operations.factories[0]; f.fatigue = 90; f.overtime = true; f.plantCondition = 90; f.maintenanceBacklog = 10;
  I.setFactoryPolicy(s, f.id, { fatigueLimit: 70, crewRotation: true }); f.industrial.levels.maintenance = 2; f.industrial.levels.crossTraining = 2;
  const before = { fatigue: f.fatigue, condition: f.plantCondition, backlog: f.maintenanceBacklog }; I.processProjectsDay(s); assert.equal(f.overtime, false); assert.ok(f.fatigue < before.fatigue); assert.ok(f.plantCondition > before.condition); assert.ok(f.maintenanceBacklog < before.backlog);
  const p = I.startProject(s, 'factory', f.id, 'lean').project; p.phase = 'COMMISSIONING'; const factor = I.factoryEffects(s, f).capacity; assert.equal(factor, .96); I.projectAction(s, p.id, 'pause'); assert.equal(I.factoryEffects(s, f).capacity, 1);
});
test('stock policy adjusts live auto-production, caps every target, prevents overstock and preserves original fallback', () => {
  const g = runtime(), s = state(g, { vehicles: [car()] }), I = g.MDXIndustry, v = s.vehicles[0];
  assert.equal(I.setPlan(s, v.id, { preset: 'cash' }).ok, true); const data = { capacity: 123, forecast: 400, pipeline: 0, wait: 200 }, target = I.supplyTarget(s, v, data); assert.ok(target <= Math.floor(data.capacity * .8)); assert.ok(target >= 0);
  const overflow = I.supplyTarget(s, v, { capacity: 500, forecast: 100, pipeline: 3000, wait: 0 }); assert.equal(overflow, 0); assert.equal(v.supplyPlan.lastEstimate.stockBrake, true);
  I.setPlan(s, v.id, { ceiling: .25, cover: 1 }); g.MDX.dailyVehicleOps(s, { monthlyDemandEstimate: () => 500, stochasticRound: Math.round }); assert.ok(v.autoProductionTarget <= v.supplyPlan.lastEstimate.capacity); assert.equal(v.supplyPlan.enabled, true);
  I.setPlan(s, v.id, { enabled: false }); assert.equal(I.supplyTarget(s, v, data), null);
});
test('seasonality only changes an explicitly enabled production plan, not selling demand or vehicle prices', () => {
  const g = runtime(), s = state(g, { vehicles: [car({ design: { body: 'convertible' } })] }), I = g.MDXIndustry, v = s.vehicles[0], before = clone(v.stats), price = v.msrp;
  assert.equal(I.seasonFactor(s, v), 1); I.setPlan(s, v.id, { seasonal: true }); s.month = 4; assert.ok(I.seasonFactor(s, v) > 1); s.month = 11; assert.ok(I.seasonFactor(s, v) < 1); assert.equal(v.msrp, price); assert.deepEqual(clone(v.stats), before);
});
test('campaigns enforce era, product, network, reliability and one active campaign per model', () => {
  const g = runtime(), s = state(g, { year: 1940, vehicles: [car({ stats: { ...car().stats, reliability: 70 } })] }), I = g.MDXIndustry, v = s.vehicles[0];
  assert.equal(Object.keys(I.CAMPAIGNS).length, 8); assert.equal(I.startCampaign(s, v.id, 'television').ok, false); assert.equal(I.startCampaign(s, v.id, 'durability').ok, false); assert.equal(I.startCampaign(s, v.id, 'exportShow').ok, false);
  const q = I.campaignQuote(s, v.id, 'roadshow'), before = s.cash; assert.equal(I.startCampaign(s, v.id, 'roadshow').ok, true); assert.equal(s.cash, before); assert.equal(I.campaignMultiplier(s, v), 1); assert.equal(I.startCampaign(s, v.id, 'radio').ok, false); assert.ok(q.cost > 0);
});
test('campaign demand support is funded, finite and correctly included in daily operating expenses', () => {
  const g = runtime(), s = state(g, { vehicles: [car()] }), I = g.MDXIndustry, v = s.vehicles[0];
  const campaign = I.startCampaign(s, v.id, 'roadshow').campaign, before = s.cash;
  const fixed = g.MDX.processDailyFixedCosts(s); assert.ok(fixed >= campaign.budget / campaign.totalDays); assert.ok(I.campaignMultiplier(s, v) > 1); assert.ok(Math.abs(s.mtdFixedBreakdown.industrial - campaign.budget / campaign.totalDays) < .0001); assert.ok(Math.abs(before - s.cash - fixed) < .0001);
  I.recordSalesDay(s, v, 7); I.recordSalesDay(s, v, 7); assert.equal(campaign.observedSales, 7); assert.equal(I.processOperatingDay(s), 0);
  tick(s); s.cash = 0; const remaining = campaign.daysRemaining; g.MDX.processDailyFixedCosts(s); assert.equal(campaign.daysRemaining, remaining); assert.equal(I.campaignMultiplier(s, v), 1);
  tick(s); I.setCompanyPolicy(s, { reserve: 100000 }); s.cash = 100000 + s.dailyFixedCost + campaign.budget / campaign.totalDays / 2;
  g.MDX.processDailyFixedCosts(s); assert.equal(campaign.daysRemaining, remaining); assert.ok(s.cash >= 100000, 'Unavoidable operating costs are reserved before funding campaign support.');
  I.setCompanyPolicy(s, { reserve: 0 });
  s.cash = 1e7; while (campaign.daysRemaining > 0) { tick(s); g.MDX.processDailyFixedCosts(s); }
  assert.equal(campaign.status, 'complete'); assert.ok(Math.abs(campaign.spent - campaign.budget) < .0001); tick(s); assert.equal(I.campaignMultiplier(s, v), 1); const spent = campaign.spent; g.MDX.processDailyFixedCosts(s); assert.equal(campaign.spent, spent);
});
test('campaign cancellation immediately removes support and prevents future charges across reload', () => {
  const g = runtime(), s = state(g, { vehicles: [car()] }), I = g.MDXIndustry, v = s.vehicles[0]; const c = I.startCampaign(s, v.id, 'radio').campaign; g.MDX.processDailyFixedCosts(s); const spent = c.spent;
  I.cancelCampaign(s, c.id); assert.equal(I.campaignMultiplier(s, v), 1); const restored = clone(s); tick(restored); I.processOperatingDay(restored); assert.equal(restored.industrialEra.campaigns[0].spent, spent);
});
test('regional service requires dealers, era and funded development with separate capital and training costs', () => {
  const g = runtime(), s = state(g, { year: 1940 }), I = g.MDXIndustry, r = s.marketSystem.regions.find(r => r.unlocked), opening = s.cash;
  assert.equal(Object.keys(I.SERVICE_PROGRAMS).length, 7); assert.equal(I.startProject(s, 'service', r.id, 'ev').ok, false); assert.equal(I.startProject(s, 'service', 'japan', 'mechanics').ok, false);
  const p = I.startProject(s, 'service', r.id, 'mechanics').project, q = I.quote(s, 'service', r.id, 'parts'); assert.ok(q.available); assert.equal(p.category, 'development'); assert.equal(s.cash, opening);
  for (let i = 0; i < p.totalDays; i++) { I.processProjectsDay(s); tick(s); }
  assert.equal(r.aftercare.levels.mechanics, 1); assert.ok(I.serviceProfile(s, r).score > 40); assert.equal(I.startProject(s, 'service', r.id, 'mechanics').ok, false);
});
test('aftercare is a real recurring operating expense and exhausted funds suspend staffing support', () => {
  const g = runtime(), s = state(g, { vehicles: [car()] }), I = g.MDXIndustry, r = s.marketSystem.regions.find(r => r.unlocked), v = s.vehicles[0];
  r.aftercare.levels.warranty = 1; assert.equal(I.setAftercare(s, r.id, { budgetPerDealer: 300, responseDays: 2 }).ok, true);
  const quote = I.serviceProfile(s, r), opening = s.cash; const fixed = g.MDX.processDailyFixedCosts(s); assert.ok(fixed >= quote.monthlyCost / 30); assert.ok(Math.abs(opening - s.cash - fixed) < .001); assert.equal(I.serviceProfile(s, r).funded, true); const warranty = I.warrantyFactor(s, v); assert.ok(warranty < 1);
  tick(s); s.cash = 0; g.MDX.processDailyFixedCosts(s); assert.equal(I.serviceProfile(s, r).funded, false); assert.equal(r.aftercare.lastDailySpend, 0); assert.ok(I.warrantyFactor(s, v) > warranty);
  I.setAftercare(s, r.id, { budgetPerDealer: 0 }); assert.equal(I.serviceProfile(s, r).monthlyCost, 0);
});
test('reports use factory, dealer and in-transit inventory once and scenarios cannot alter the save', () => {
  const g = runtime(), s = state(g, { vehicles: [car({ factoryInventory: 20 })] }), I = g.MDXIndustry, v = s.vehicles[0], r = s.marketSystem.regions.find(r => r.unlocked); r.inventory[v.id] = 30; s.logistics.inTransit.push({ vehicleId: v.id, qty: 10 });
  const report = I.modelReport(s, v); assert.equal(report.pipeline, 60); assert.equal(report.daysSupply, 6); assert.ok(report.breakEven >= 0);
  I.startProject(s, 'factory', s.operations.factories[0].id, 'energy'); s.lastMonthSummary.revenue = 1200000; const before = JSON.stringify(s), q = I.scenario(s, { demand: -.4, price: -.1, material: .3, payroll: .2 }); assert.equal(JSON.stringify(s), before); assert.ok(q.estimatedProfit < q.baselineProfit); assert.ok(Number.isFinite(q.cashAtHorizon));
  const baseline = I.scenario(s, {}); assert.equal(baseline.estimatedProfit, s.lastMonthSummary.netProfit, 'Capital investments must not become P&L expenses in the sensitivity estimate.');
});
test('monthly snapshots and operating milestones do not settle twice or award money', () => {
  const g = runtime(), s = state(g, { vehicles: [car()] }), I = g.MDXIndustry, opening = s.cash; s.industrialEra.projects.push({ id: 'done', type: 'factory', status: 'complete', spent: 1000 });
  I.processMonth(s); assert.equal(s.cash, opening); assert.equal(s.industrialEra.totalBuilt, 350); assert.equal(s.industrialEra.snapshots.length, 1); assert.ok(s.industrialEra.milestones.some(x => x.id === 'first-improvement'));
  const restored = clone(s); I.processMonth(restored); assert.equal(restored.industrialEra.totalBuilt, 350); assert.equal(restored.industrialEra.snapshots.length, 1); assert.equal(restored.cash, opening);
  for (let i = 0; i < 5; i++) { s.month++; I.processMonth(s); } assert.ok(s.industrialEra.milestones.some(x => x.id === 'six-profits'));
});
test('strict save validation catches invalid industrial records and nested non-finite values', () => {
  const g = runtime(), s = state(g); assert.equal(g.MDXStorage.validateState(s, { strict: true }).ok, true);
  const invalid = clone(s); invalid.industrialEra.projects = {}; assert.equal(g.MDXStorage.validateState(invalid).ok, false);
  const infinite = clone(s); infinite.industrialEra.policy.reserve = Infinity; assert.equal(g.MDXStorage.validateState(infinite, { strict: true }).ok, false);
  const corrupt = clone(s); corrupt.industrialEra.snapshots = 'bad'; corrupt.industrialEra.policy = []; g.MDXIndustry.ensure(corrupt); assert.ok(Array.isArray(corrupt.industrialEra.snapshots)); assert.equal(corrupt.industrialEra.policy.projectSlots, 2);
});
test('40 years of funded industrial operation remain finite, bounded and deterministic after saved reloads', () => {
  const g = runtime(), I = g.MDXIndustry; let a = state(g, { year: 1940, vehicles: [car()] }); const f = a.operations.factories[0], r = a.marketSystem.regions.find(r => r.unlocked);
  I.startProject(a, 'factory', f.id, 'lean'); I.startProject(a, 'factory', f.id, 'apprenticeship'); I.startProject(a, 'service', r.id, 'mechanics'); I.startCampaign(a, a.vehicles[0].id, 'roadshow'); I.setAftercare(a, r.id, { budgetPerDealer: 100 }); I.setPlan(a, a.vehicles[0].id, { preset: 'balanced' }); let b = clone(a);
  for (let i = 0; i < 14400; i++) {
    for (const s of [a, b]) { const cost = I.processOperatingDay(s); s.cash -= cost; I.processProjectsDay(s); I.supplyTarget(s, s.vehicles[0], { capacity: 500, forecast: 400, pipeline: 500, wait: 20 }); if (s.day === 30) I.processMonth(s); tick(s); }
    if (i % 360 === 0) { a = clone(a); b = clone(b); }
  }
  assert.equal(a.year, 1980); assert.deepEqual(a.industrialEra, b.industrialEra); assert.equal(a.cash, b.cash); assert.equal(g.MDXStorage.validateState(a, { strict: true }).ok, true); assert.ok(a.industrialEra.snapshots.length <= 120 && a.industrialEra.history.length <= 100); assert.ok(a.industrialEra.totalBuilt >= 10000); assert.equal(a.operations.factories[0].industrial.levels.lean, 1); assert.ok(a.cash < 1e7);
});
