'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const clone = x => JSON.parse(JSON.stringify(x)), close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
function runtime(options = {}) {
  const g = { console, setTimeout, clearTimeout }; g.window = g; const context = vm.createContext(g);
  const files = ['data.js', 'expansion-data.js', 'sim-core.js', 'expansion.js', 'corporate-economy.js', 'gameplay-depth.js', 'industrial-era.js', 'commercial-expansion.js', ...(options.legacy ? [] : ['engineering-systems.js']), 'studio-visuals.js', 'product-visualizer.js', ...(options.legacy ? [] : ['engineering-ui.js']), 'storage.js', 'industrial-release.js', 'commercial-release.js', ...(options.legacy ? [] : ['engineering-release.js'])];
  for (const name of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context, { filename: name });
  return g;
}
function car(overrides = {}) {
  return { id: 'v1', name: 'Atlas "Tourer"', active: true, productionStatus: 'production', productionEnabled: true, generation: 1, modelYear: 1970, year: 1970, engineId: 'e1', transmissionId: 't1', msrp: 4000, rampMonths: 6,
    design: { body: 'sedan', engineId: 'e1', trans: 't1', finalDrive: 3.55, wheel: 14, tireWidth: 185, tireProfile: 75, coolingOpening: 50, upholstery: 'cloth', belt: 'lap', seat: 'bench' },
    stats: { zero: 12, top: 100, reliability: 85, rel: 85, quality: 75, handling: 65, comfort: 75, safety: 65, mpg: 32, unitCost: 2300, manufacturingUnitCost: 2100, className: 'Family', power: 120, hp: 120, torque: 140, lb: 2500, finalDrive: 3.55, highwayRpm: 3000, brakingScore: 68 }, lastMonthSales: 300, lastMonthDemand: 400, lastMonthProduced: 350, factoryInventory: 20, ...overrides };
}
function supplier(overrides = {}) { return { id: 'tire1', name: 'Trace Tire Works', industry: 'tires', country: 'US', founded: 1900, status: 'active', quality: 86, reliability: 92, cash: 2e6, debt: 5e5, capacity: 1000, factories: 1, monthUnallocatedCapacity: 50, ...overrides }; }
function state(g, overrides = {}) {
  const s = { campaignId: 'engineering-regression', company: 'Engineering Motors', year: 1970, startYear: 1970, month: 0, day: 1, cash: 1e7, debt: 0, rep: 40, rp: 0, employees: 50, overhead: 0, balanceMigrationEraCosts47: true, enginePrograms: [], vehiclePrograms: [], difficulty: 'normal', industry: [], industrialCompanies: [supplier()], engines: [{ id: 'e1', design: { config: 'I4', aspiration: 'na', redline: 5500 }, stats: { hp: 120, power: 120, torque: 140, smoothness: 70 } }], transmissions: [{ id: 't1', torque: 220, ratios: [3.5, 2.2, 1.4, .9] }], vehicles: [car()], subsidiaries: [], unlocked: [], daysPlayed: 0, monthsPlayed: 0, lastMonthSummary: { profit: 1000, netProfit: 1000, revenue: 10000, operatingCashFlow: 800 }, componentSupply: { version: 2, openingSeeded: true, inventory: {}, lots: {} }, ...overrides };
  g.MDX.normalize(s); g.MDXIndustry.ensure(s); g.MDXCommercial.ensure(s); g.MDXDepth.ensure(s); g.MDXEngineering?.ensure(s); s.departments.engineering.staff = 32; s.budgetSystem.protectProjects = false; s.budgetSystem.protectOperations = false; return s;
}
function tick(s) { s.day++; s.daysPlayed++; if (s.day > 30) { s.day = 1; s.month++; s.monthsPlayed++; if (s.month > 11) { s.month = 0; s.year++; } } }
function finish(g, s, p, operating = false) { let guard = 500; while (['active', 'commissioning'].includes(p.status) && --guard) { if (operating) s.cash -= g.MDXEngineering.processOperatingDay(s); g.MDXEngineering.processProjectsDay(s); tick(s); } assert.ok(guard, p.phase); }
function revision(g, s, setup = { nvh: 1 }) { const p = g.MDXEngineering.authorizeLab(s, 'v1', 'nvh', setup, { mode: 'revision' }).program; assert.ok(p); finish(g, s, p); assert.equal(p.status, 'review'); return p; }
test('engineering migration is additive with no charges, bonuses, forced tutorial or neutral spec changes', () => {
  const g = runtime(), s = state(g, { tutorial: { enabled: false, optedIn: false } }), before = clone({ cash: s.cash, vehicles: s.vehicles, tutorial: s.tutorial }); delete s.engineeringExpansion;
  g.MDXEngineering.ensure(s); assert.deepEqual(clone({ cash: s.cash, vehicles: s.vehicles, tutorial: s.tutorial }), before); assert.equal(g.MDXEngineering.processOperatingDay(s), 0); assert.equal(g.MDXEngineering.capacityFactor(s, s.vehicles[0]), 1); assert.deepEqual(clone(g.MDXDepth.tunedStats(s.vehicles[0], {})), before.vehicles[0].stats);
});
test('fourteen calibration controls and sixteen routes enforce era and target restrictions', () => {
  const g = runtime(), s = state(g, { year: 1940 }), E = g.MDXEngineering; assert.equal(Object.keys(g.MDXDepth.SETUPS).length, 14); assert.equal(Object.keys(g.MDXDepth.TESTS).length, 16);
  assert.equal(E.labQuote(s, 'v1', 'emissions', {}).available, false); assert.equal(E.labQuote(s, 'missing', 'road', {}), null); assert.equal(E.labQuote(s, 'v1', 'missing', {}), null); assert.equal(E.labQuote(s, 'v1', 'road', {}, { mode: 'revision' }).available, false);
  assert.equal(E.projectQuote(s, 'facility', 'company', 'aero').available, false); assert.equal(E.projectQuote(s, 'facility', 'company', 'thermal').available, true);
});
test('calibration tradeoffs retain external gearbox cost and do not stack across repeated previews', () => {
  const g = runtime(), s = state(g), v = s.vehicles[0], D = g.MDXDepth, before = clone(v.stats), draft = { calibration: 2, gearing: 1, aero: 2, tireGrip: 2, lightweight: 2, nvh: 3, driveline: 1, corrosion: 2, serviceability: 2, weatherSealing: 2 };
  const after = D.tunedStats(v, draft); assert.ok(after.power > before.power && after.zero < before.zero); assert.ok(after.comfort > before.comfort); assert.ok(after.unitCost > before.unitCost); assert.equal(after.unitCost - after.manufacturingUnitCost, 200); assert.ok(after.tireLifeIndex < 100 && after.highwayRpm > before.highwayRpm);
  for (let i = 0; i < 25; i++) assert.deepEqual(clone(D.tunedStats(v, draft)), clone(after)); assert.deepEqual(clone(v.stats), before);
});
test('restoring neutral tuning preserves outside lifecycle changes and maximum legacy reliability', () => {
  const g = runtime(), s = state(g), v = s.vehicles[0], D = g.MDXDepth; v.stats.reliability = v.stats.rel = 99; const original = clone(v.stats), draft = { nvh: 2 };
  v.engineeringBaseline = D.baseStats(v); v.stats = D.tunedStats(v, draft); v.engineeringApplied = clone(v.stats); v.engineeringSetup = draft; const prior = v.stats.unitCost; v.stats.unitCost *= 1.10; v.stats.manufacturingUnitCost *= 1.10; v.stats.safety += 2;
  const reset = D.tunedStats(v, {}); close(reset.unitCost, original.unitCost * 1.10); assert.equal(reset.safety, original.safety + 2); assert.equal(reset.reliability, 99); assert.ok(prior > original.unitCost);
});
test('unrelated engineering refinements retain maximum reliability and protection without false legacy cap losses', () => {
  const g = runtime(), s = state(g), v = s.vehicles[0]; v.stats.reliability = v.stats.rel = v.stats.quality = v.stats.safety = v.stats.comfort = 99; const changed = g.MDXDepth.tunedStats(v, { nvh: 1, serviceability: 1 }); for (const key of ['reliability', 'quality', 'safety', 'comfort']) assert.equal(changed[key], 99); assert.ok(changed.unitCost > v.stats.unitCost);
});
test('derived telemetry uses actual tires, top gear and torque rating with explicitly estimated curves', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], t = E.telemetry(s, v); close(t.torqueMargin, 220 / 140); assert.equal(t.curve.length, 16); assert.equal(t.estimated, true); assert.ok(t.curve.every(p => p.power <= 120.1));
  s.transmissions[0].ratios[3] = .7; assert.ok(E.telemetry(s, v).cruiseRpm < t.cruiseRpm); s.transmissions[0].torque = 100; assert.ok(E.telemetry(s, v).scores.driveline < t.scores.driveline); assert.match(g.MDXEngineeringUI.curveSVG(t), /separate labeled scales/);
});
test('electric calibration changes range without inventing combustion RPM or torque curves', () => {
  const g = runtime(), s = state(g), v = s.vehicles[0]; v.design.propulsion = 'bev'; v.stats.rangeMiles = 200; const next = g.MDXDepth.tunedStats(v, { aero: 3, calibration: -1 }), t = g.MDXEngineering.telemetry(s, v, next); assert.ok(next.rangeMiles > 200); assert.equal(t.cruiseRpm, null); assert.equal(t.redline, null); assert.equal(t.curve.length, 0);
});
test('current specification validation ignores unsaved candidate controls and never applies a revision', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], before = clone(v.stats), cash = s.cash, q = E.labQuote(s, v.id, 'economy', { calibration: 2, nvh: 3 });
  assert.equal(q.setup.calibration, 0); assert.deepEqual(clone(q.after), before); const p = E.authorizeLab(s, v.id, 'economy', { calibration: 2, nvh: 3 }).program; assert.equal(s.cash, cash); finish(g, s, p); close(cash - s.cash, q.cost); assert.deepEqual(clone(v.stats), before); assert.equal(p.status, 'complete'); assert.equal(E.evidence(s, v).length, 1); assert.equal(s.gameplayDepth.labResults[0].setup.nvh, 0);
});
test('worked days are charged once after save reload and reconcile with the core project ledger', () => {
  const g = runtime(), E = g.MDXEngineering; let s = state(g); const p = E.authorizeLab(s, 'v1', 'road', {}).program, opening = s.cash, amount = p.budget / p.totalDays; const actual = g.MDX.dailyProjects(s, () => {}); close(actual.development, amount); close(opening - s.cash, amount); close(s.mtdDevelopmentSpend, amount);
  s = clone(s); assert.equal(E.processProjectsDay(s).duplicate, true); assert.equal(s.cash, opening - amount); tick(s); const next = E.processProjectsDay(s); close(next.development, amount); close(E.summary(s).totalDevelopment, amount * 2);
});
test('real engineering staffing, protected reserves and queue controls delay unpaid work safely', () => {
  const g = runtime(), s = state(g, { vehicles: [car(), car({ id: 'v2' })] }), E = g.MDXEngineering; E.setPolicy(s, { labSlots: 1 }); const a = E.authorizeLab(s, 'v1', 'road', {}).program, b = E.authorizeLab(s, 'v2', 'road', {}).program;
  E.processProjectsDay(s); assert.ok(a.spent > 0); assert.equal(b.spent, 0); assert.match(b.phase, /QUEUED/); E.jobAction(s, a.id, 'pause'); tick(s); E.processProjectsDay(s); assert.ok(b.spent > 0); E.jobAction(s, a.id, 'resume'); E.jobAction(s, b.id, 'up'); assert.equal(s.gameplayDepth.labPrograms[0].id, b.id);
  s.departments.engineering.staff = 0; tick(s); const paid = s.cash; E.processProjectsDay(s); assert.equal(s.cash, paid); assert.match(a.phase, /ENGINEERS/); s.departments.engineering.staff = 32; E.setPolicy(s, { reserve: s.cash }); tick(s); E.processProjectsDay(s); assert.equal(s.cash, paid); assert.match(b.phase, /FUNDING/);
});
test('revision testing retains current production until separate funded tooling completes', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], before = clone(v.stats), p = revision(g, s), testedCash = s.cash; assert.deepEqual(clone(v.stats), before); assert.equal(E.evidence(s, v).length, 0);
  const q = E.changeoverQuote(s, p, 'rolling'); assert.equal(E.approveRevision(s, p.id, 'rolling').ok, true); assert.equal(s.cash, testedCash); assert.equal(E.capacityFactor(s, v), 1); E.processProjectsDay(s); assert.equal(E.capacityFactor(s, v), .8); assert.deepEqual(clone(v.stats), before); tick(s); finish(g, s, p);
  close(testedCash - s.cash, q.budget); close(s.mtdCapitalSpend, q.budget); assert.equal(p.status, 'complete'); assert.ok(v.stats.comfort > before.comfort); assert.equal(v.engineeringRevision, 1); assert.equal(E.evidence(s, v).length, 1); assert.equal(E.capacityFactor(s, v), 1);
});
test('planned stop, paused commissioning and cancellation retain tooling spend and release assembly', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], before = clone(v.stats), p = revision(g, s); E.approveRevision(s, p.id, 'planned'); assert.equal(E.capacityFactor(s, v), 0); E.processProjectsDay(s); const paid = s.cash, spent = p.changeover.spent; E.jobAction(s, p.id, 'pause'); tick(s); E.processProjectsDay(s); assert.equal(s.cash, paid); assert.equal(E.capacityFactor(s, v), 0);
  E.jobAction(s, p.id, 'cancel'); assert.equal(E.capacityFactor(s, v), 1); assert.deepEqual(clone(v.stats), before); assert.equal(p.changeover.spent, spent); assert.equal(E.summary(s).committedCapital, 0);
});
test('new specifications invalidate old candidates while cosmetic paint and identity preserve evidence', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], p = revision(g, s), stamp = E.fingerprint(v); E.setStyle(s, v.id, { coachwork: 'sporting', lighting: 'quad', grille: 'mesh' }); v.design.paintColor = '#ffffff'; v.design.presentationWheel = 'chrome'; assert.equal(E.fingerprint(v), stamp);
  v.generation++; assert.equal(E.approveRevision(s, p.id, 'parallel').ok, false); assert.equal(p.status, 'stale'); assert.equal(v.engineeringRevision, undefined); assert.equal(s.gameplayDepth.labResults.length, 1); assert.equal(E.evidence(s, v).length, 0);
});
test('a changed released powertrain invalidates pending vehicle tests and historical evidence', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, p = E.authorizeLab(s, 'v1', 'nvh', {}).program; s.transmissions[0].externalRevenue = 1000; s.transmissions[0].externalUnits = 25; E.processProjectsDay(s); assert.equal(p.status, 'active'); tick(s); s.transmissions[0].ratios[3] = .7; E.processProjectsDay(s); assert.equal(p.status, 'stale'); assert.ok(p.spent > 0); E.jobAction(s, p.id, 'cancel'); const valid = E.authorizeLab(s, 'v1', 'nvh', {}).program; finish(g, s, valid); assert.equal(E.evidence(s, s.vehicles[0]).length, 1); s.engines[0].stats.torque += 10; assert.equal(E.evidence(s, s.vehicles[0]).length, 0);
});
test('approved prototypes avoid assembly tooling while retaining fully paid development costs', () => {
  const g = runtime(), s = state(g, { vehicles: [], vehiclePrograms: [{ id: 'dev1', status: 'active', vehicle: car({ productionStatus: 'prototype' }) }] }), E = g.MDXEngineering, p = revision(g, s), cash = s.cash;
  assert.equal(E.approveRevision(s, p.id, 'rolling').ok, true); assert.equal(p.status, 'complete'); assert.equal(s.cash, cash); assert.equal(s.mtdCapitalSpend || 0, 0); assert.equal(s.vehiclePrograms[0].vehicle.engineeringRevision, 1);
});
test('laboratory construction is capital paid exactly once and requires era and duplicate checks', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, opening = s.cash, p = E.authorizeProject(s, 'facility', 'company', 'thermal').project; assert.equal(s.cash, opening); assert.equal(E.authorizeProject(s, 'facility', 'company', 'thermal').ok, false); finish(g, s, p);
  close(opening - s.cash, p.cost); close(s.mtdCapitalSpend, p.cost); assert.equal(s.engineeringExpansion.facilities.thermal.installed, true); assert.ok(s.engineeringExpansion.facilities.thermal.installedAt); assert.equal(E.projectQuote(s, 'facility', 'company', 'thermal').available, false);
});
test('only funded matching facilities shorten calendar work and the authorized development budget remains exact', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering; s.engineeringExpansion.facilities.thermal = { installed: true }; const p = E.authorizeLab(s, 'v1', 'highspeed', {}).program; E.processProjectsDay(s); close(p.daysRemaining, p.totalDays - 1); tick(s); E.setPolicy(s, { facilitySupport: 30000 }); const beforeDays = p.daysRemaining; s.cash -= E.processOperatingDay(s); E.processProjectsDay(s); close(p.daysRemaining, beforeDays - 1.08); tick(s); finish(g, s, p, true); close(p.spent, p.budget); assert.ok(E.summary(s).totalOperating > 0);
});
test('paid inspection support uses the existing cash ledger once and catches no more than six extra percentage points', () => {
  const g = runtime(), base = state(g), s = clone(base), E = g.MDXEngineering; E.setQualityPolicy(s, 'v1', { inspectionBudget: 120000 }); const before = g.MDX.factoryQualityProfile(s, s.vehicles[0]), opening = s.cash, baselineCost = g.MDX.processDailyFixedCosts(base), cost = g.MDX.processDailyFixedCosts(s), after = g.MDX.factoryQualityProfile(s, s.vehicles[0]);
  close(cost - baselineCost, E.era(s, 120000, 'wages') / 30); close(opening - s.cash, cost); close(s.mtdFixedBreakdown.engineering, cost - baselineCost); close(after.engineeringInspectionBoost, .06); assert.ok(after.inspectionCatch > before.inspectionCatch && after.inspectionCatch <= .985); tick(s); assert.equal(g.MDX.factoryQualityProfile(s, s.vehicles[0]).engineeringInspectionBoost, undefined);
});
test('optional known-defect containment does not automatically hold undiscovered or repaired products', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0]; v.defects = [{ discovered: true, severity: 'critical', safety: true, recalled: false }]; assert.equal(E.productionHold(s, v), false); E.setQualityPolicy(s, v.id, { holdUnsafe: true }); assert.equal(E.capacityFactor(s, v), 0); assert.equal(v.factoryInventory, 20); v.defects[0].recalled = true; assert.equal(E.capacityFactor(s, v), 1); v.defects[0].recalled = false; v.defects[0].discovered = false; assert.equal(E.capacityFactor(s, v), 1);
});
test('operating controls respect unavoidable bills and reserve before granting paid inspection effects', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering; E.setQualityPolicy(s, 'v1', { inspectionBudget: 120000 }); s.cash = 1500; E.setPolicy(s, { reserve: 1000 }); assert.equal(E.processOperatingDay(s, { unavoidableDaily: 500 }), 0); assert.equal(E.qualityPolicy(s, 'v1').fundedDay, -1); assert.equal(s.cash, 1500);
});
test('supplier audits preserve dated actual observations and qualification expires after two years', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, c = s.industrialCompanies[0], before = clone(c), p = E.authorizeProject(s, 'qualification', c.id, 'process').project; finish(g, s, p); const report = s.engineeringExpansion.supplierReports[0], q = s.engineeringExpansion.qualifications[0];
  assert.equal(report.quality, before.quality); assert.equal(report.cash, before.cash); close(report.cost, p.cost); assert.equal(q.expiresPeriod - q.qualifiedPeriod, 24); assert.deepEqual(c, before); c.quality = 55; assert.equal(report.quality, before.quality); assert.equal(E.setSupplyPolicy(s, 'tires', { mode: 'qualified', supplierId: c.id, budget: 10000, coverage: .5 }).ok, true); s.year += 2; assert.equal(E.setSupplyPolicy(s, 'tires', { mode: 'qualified', supplierId: c.id, budget: 10000 }).ok, false);
});
test('qualified fallback needs twenty paid retainer days and never exceeds real unused supplier capacity', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, c = s.industrialCompanies[0]; s.engineeringExpansion.qualifications.push({ supplierId: c.id, component: 'tires', expiresPeriod: E.period(s) + 24 }); E.setSupplyPolicy(s, 'tires', { mode: 'qualified', supplierId: c.id, budget: 15000, coverage: .5 });
  for (let i = 0; i < 19; i++) { const cost = E.processOperatingDay(s); s.cash -= cost; tick(s); } assert.equal(E.contingency(s, 'tires', 1000, 100).points, 0); s.cash -= E.processOperatingDay(s); const delivery = E.contingency(s, 'tires', 1000, 100); assert.equal(delivery.points, 50); assert.equal(delivery.supplierId, c.id); assert.equal(delivery.quality, 86); assert.equal(c.monthUnallocatedCapacity, 0); assert.equal(E.contingency(s, 'tires', 1000, 100).points, 0);
});
test('qualified component deliveries create physical lots with provenance and cannot repeat after reload', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, c = s.industrialCompanies[0]; s.engineeringExpansion.qualifications.push({ supplierId: c.id, component: 'tires', expiresPeriod: E.period(s) + 24 }); E.setSupplyPolicy(s, 'tires', { mode: 'qualified', supplierId: c.id, budget: 15000, coverage: .5 }); const p = E.supplyPolicy(s, 'tires'); p.paidPeriod = E.period(s); p.paidDays = 20; const cash = s.cash;
  const result = g.MDX_CORP.finalizeComponentProcurementMonth(s, { tires: 1000 }); assert.equal(result.emergencyPoints, 50); assert.equal(s.componentSupply.inventory.tires, 200); assert.equal(s.componentSupply.lots.tires[0].supplierId, c.id); assert.equal(s.componentSupply.lots.tires[0].quality, c.quality); assert.equal(s.cash, cash); const restored = clone(s); g.MDX_CORP.finalizeComponentProcurementMonth(restored, { tires: 1000 }); assert.equal(restored.componentSupply.inventory.tires, 200);
  g.MDX_CORP.consumeVehicleComponents(s, s.vehicles[0], 5, 5); assert.equal(g.MDX_CORP.traceSupplierExposure(s, c.id, 'tires', 18)[0].units, 5);
});
test('default component fallback is unchanged while signed-supply-only leaves actual shortages', () => {
  const g = runtime(), old = runtime({ legacy: true }), s = state(g), legacy = clone(s); delete legacy.engineeringExpansion; const result = g.MDX_CORP.finalizeComponentProcurementMonth(s, { tires: 1000 }), prior = old.MDX_CORP.finalizeComponentProcurementMonth(legacy, { tires: 1000 }); assert.deepEqual(clone(result), clone(prior)); assert.deepEqual(clone(s.componentSupply.inventory), clone(legacy.componentSupply.inventory));
  const strict = state(g); g.MDXEngineering.setSupplyPolicy(strict, 'tires', { mode: 'strict' }); const stop = g.MDX_CORP.finalizeComponentProcurementMonth(strict, { tires: 1000 }); assert.equal(stop.emergencyPoints, 0); assert.equal(stop.totalShort, 1000); assert.equal(strict.componentSupply.inventory.tires || 0, 0);
});
test('engineering mission needs passing current-product evidence instead of preview scores or candidate reports', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], b = E.createBrief(s, v.id, 'commuter', 2).brief; assert.equal(E.briefProgress(s, b).complete, false);
  for (const route of ['economy', 'service', 'endurance']) { const p = E.authorizeLab(s, v.id, route, {}).program; finish(g, s, p); } assert.equal(E.briefProgress(s, b).checks.find(c => c.domain === 'economy').pass, false, '32 mpg is below the commuter score target');
  v.stats.mpg = 40; assert.equal(E.evidence(s, v).length, 0); assert.equal(E.createBrief(s, v.id, 'family').ok, false); E.actionBrief(s, b.id, 'archive'); assert.equal(E.createBrief(s, v.id, 'family').ok, true);
});
test('closed-month engineering briefs achieve only proven targets and never award bonus cash', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0]; v.stats.mpg = 40; v.engineeringSetup = { serviceability: 3 }; const b = E.createBrief(s, v.id, 'commuter', 1).brief;
  for (const route of ['economy', 'service', 'endurance']) { const p = E.authorizeLab(s, v.id, route, {}).program; finish(g, s, p); } assert.equal(E.briefProgress(s, b).complete, true); const cash = s.cash; E.processMonth(s); assert.equal(b.status, 'achieved'); assert.equal(s.cash, cash); const history = s.engineeringExpansion.history.length; E.processMonth(s); assert.equal(s.engineeringExpansion.history.length, history);
});
test('board targets are owned-company-only and use real due-month measures without changing cash', () => {
  const g = runtime(), s = state(g, { industry: [{ id: 'owned', name: 'Owned Motors', playerSubsidiary: true, cash: 2e6, debt: 1e5, monthRevenue: 1e6, monthNetProfit: 1e5, monthSales: 500, aiCars: [{ active: true, reliability: 88 }] }, { id: 'rival', name: 'Independent Motors', cash: 3e6 }] }), E = g.MDXEngineering;
  assert.equal(E.ownedCompanies(s).length, 2); assert.equal(E.createBoardTarget(s, 'manufacturer:rival', 'cash', 1000, 1).ok, false); close(E.companyMetrics(s, 'manufacturer:owned').margin, 10); const b = E.createBoardTarget(s, 'parent', 'cash', s.cash - 1000, 1).target, cash = s.cash; E.processMonth(s); assert.equal(b.status, 'active'); s.month++; E.processMonth(s); assert.equal(b.status, 'achieved'); assert.equal(s.cash, cash); assert.equal(b.history.length, 2); assert.equal(E.boardAction(s, b.id, 'archive').ok, true);
});
test('unrecorded or divested company measures cannot falsely achieve a target', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering; s.industrialCompanies[0].parentOwned = true; assert.equal(E.companyMetrics(s, 'industrial:tire1').sales, null); assert.equal(E.createBoardTarget(s, 'industrial:tire1', 'sales', 100, 1).ok, false); const b = E.createBoardTarget(s, 'industrial:tire1', 'cash', 2e6, 1).target; s.industrialCompanies[0].parentOwned = false; E.processMonth(s); assert.equal(b.status, 'archived');
});
test('styling changes both actual showroom renderers while preserving cost, spec, save identity and era', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, v = s.vehicles[0], before = clone(v.stats), cash = s.cash, identity = { name: v.name, modelYear: 1970, generation: 1, visualSeed: 'atlas' }, render = () => g.MDXRenderLibrary.vehicleSVG(v.design, v.stats, identity), svg = render(), mesh = clone(g.MDXProductVisualizer.buildVehicle(v.design, v.stats, identity));
  assert.equal(E.setStyle(s, v.id, { lighting: 'rectangular' }).ok, false); assert.equal(E.setStyle(s, v.id, { coachwork: 'sporting', lighting: 'quad', grille: 'mesh' }).ok, true); assert.notEqual(render(), svg); assert.match(render(), /data-light-style="quad"/); assert.match(render(), /data-grille-style="mesh"/); assert.notDeepEqual(clone(g.MDXProductVisualizer.buildVehicle(v.design, v.stats, identity).faces), mesh.faces); assert.deepEqual(clone(v.stats), before); assert.equal(s.cash, cash); E.setStyle(s, v.id, {}); assert.equal(render(), svg); assert.deepEqual(clone(g.MDXProductVisualizer.buildVehicle(v.design, v.stats, identity).faces), mesh.faces);
});
test('cabin view reflects actual equipment and escapes player names safely', () => {
  const g = runtime(), v = car({ name: '<script>alert(1)</script>' }); v.design.airbag = true; v.design.ac = true; v.design.upholstery = 'leather'; v.design.seat = 'bucket'; const svg = g.MDXEngineeringUI.interiorSVG(v); assert.match(svg, /SRS/); assert.match(svg, /A\/C/); assert.match(svg, /BUCKET SEATS/); assert.match(svg, /LEATHER/); assert.doesNotMatch(svg, /<script>/);
});
test('engineering commitments flow into runway without charging forecast reads and disappear on cancellation', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, baseline = g.MDX.budgetForecast(s), cash = s.cash; const p = E.authorizeLab(s, 'v1', 'road', {}).program, f = E.authorizeProject(s, 'facility', 'company', 'thermal').project; E.setQualityPolicy(s, 'v1', { inspectionBudget: 30000 }); const next = g.MDX.budgetForecast(s); close(next.total - baseline.total, E.forecast(s).total); assert.ok(next.engineeringDevelopment > 0 && next.engineeringCapital > 0 && next.engineeringSupport > 0); assert.equal(s.cash, cash); E.jobAction(s, p.id, 'cancel'); E.jobAction(s, f.id, 'cancel'); assert.equal(E.summary(s).committedDevelopment, 0); assert.equal(E.summary(s).committedCapital, 0);
});
test('actual monthly costs and export formats preserve quotes, snapshots and strict additive save shapes', () => {
  const g = runtime(), s = state(g), E = g.MDXEngineering, p = E.authorizeLab(s, 'v1', 'road', {}).program; finish(g, s, p); const cash = s.cash; E.processMonth(s); close(s.engineeringExpansion.monthly[0].development, p.budget); close(s.lastMonthSummary.engineeringDevelopmentSpend, p.budget); assert.equal(s.engineeringExpansion.mtdDevelopment, 0); assert.equal(s.cash, cash); assert.match(E.testCSV(s), /Atlas ""Tourer""/); assert.equal(E.exportReport(s).tests[0].cost, p.budget);
  const restored = clone(s); assert.equal(g.MDXStorage.validateState(restored, { strict: true }).ok, true); assert.equal(g.MDXStorage.validateState({ ...restored, engineeringExpansion: { projects: {}, policy: [] } }, { strict: true }).ok, false); restored.engineeringExpansion.projects.push({ cost: Infinity }); assert.equal(g.MDXStorage.validateState(restored, { strict: true }).ok, false);
});
test('legacy tests finish through their original scheduler while detailed tests retain the signoff requirement', () => {
  const g = runtime(), s = state(g, { vehicles: [car(), car({ id: 'v2' })] }), D = g.MDXDepth, E = g.MDXEngineering, old = D.startTest(s, 'v2', 'road', { cooling: 1 }).program; const detailed = E.authorizeLab(s, 'v1', 'road', { cooling: 1 }, { mode: 'revision' }).program;
  for (let i = 0; i < 20; i++) { D.processDay(s); E.processProjectsDay(s); tick(s); } assert.equal(old.status, 'complete'); assert.equal(detailed.status, 'review'); assert.equal(s.vehicles[0].engineeringRevision, undefined); assert.ok(s.vehicles[1].engineeringSetup.cooling > 0);
});
test('new catalogue preserves all 207 earlier additions and documents only unique new choices and details', () => {
  const g = runtime(), legacy = runtime({ legacy: true }), prefix = g.MDXIndustrialRelease.filter(r => r.id < 208); assert.deepEqual(clone(prefix), clone(legacy.MDXIndustrialRelease)); assert.equal(prefix.length, 207); assert.equal(g.MDXEngineeringRelease.length, 113); assert.equal(g.MDXIndustrialRelease.length, 320); const all = g.MDXIndustrialRelease; assert.equal(new Set(all.map(r => r.id)).size, all.length); assert.equal(new Set(g.MDXEngineeringRelease.map(r => r.title)).size, g.MDXEngineeringRelease.length);
});
test('engineering integration retains nine destinations, compact builders, offline assets and additive boot order', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), html = read('index.html'), sw = read('service-worker.js'), css = read('engineering-systems.css'); assert.ok(html.indexOf('/gameplay-depth.js') < html.indexOf('/engineering-systems.js')); assert.ok(html.indexOf('/engineering-systems.js') < html.indexOf('/game.js')); assert.ok(html.indexOf('/engineering-ui.js') > html.indexOf('/commercial-ui.js')); assert.match(html, /engineering-systems.css/); for (const file of ['engineering-ui.js', 'engineering-systems.js', 'engineering-release.js', 'engineering-systems.css']) assert.ok(sw.includes('"/' + file + '"')); assert.match(sw, /DEVICE_SAVE_CACHE="technology-dynasty-device-save-v1"/); assert.doesNotMatch(css, /#view-engine|#view-vehicle|\.builder|\.primary-nav/); assert.doesNotMatch(html, /mobileMoreBtn|id="moreModal"/); assert.match(css, /min-height:44px/);
});
test('forty-year saved engineering campaign stays finite with exact project and operating costs across monthly closes', () => {
  const g = runtime(), E = g.MDXEngineering; let s = state(g, { year: 1940, cash: 1e9 }); const opening = s.cash; let spent = 0; for (let m = 0; m < 480; m++) { if (m % 24 === 0) E.authorizeLab(s, 'v1', 'endurance', {}, { severity: 1, repeats: 1 }); if (m === 240) E.authorizeProject(s, 'facility', 'company', 'thermal'); for (let d = 0; d < 30; d++) { const op = E.processOperatingDay(s); s.cash -= op; const p = E.processProjectsDay(s); spent += op + p.development + p.capital; if (s.day === 30) E.processMonth(s); tick(s); } if (m % 12 === 0) s = clone(s); assert.ok(Number.isFinite(s.cash)); }
  close(opening - s.cash, spent); assert.equal(s.year, 1980); assert.equal(s.engineeringExpansion.monthly.length, 120); assert.equal(g.MDXStorage.validateState(s, { strict: true }).ok, true); close(E.summary(s).totalDevelopment + E.summary(s).totalCapital + E.summary(s).totalOperating, spent);
});
