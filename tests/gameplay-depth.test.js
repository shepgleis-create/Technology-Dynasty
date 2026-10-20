'use strict';
const assert = require('node:assert/strict'), test = require('node:test'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function runtime() {
  const values = new Map(), g = { console, localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)) } };
  g.window = g; const context = vm.createContext(g);
  for (const file of ['data.js', 'expansion-data.js', 'sim-core.js', 'group-control.js', 'expansion.js', 'gameplay-depth.js', 'tutorial.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  return g;
}
function state(overrides = {}) {
  return { campaignId: 'depth-regression', company: 'Test Motors', year: 1970, month: 0, day: 1, cash: 1e7, rep: 40, rp: 0, industry: [], subsidiaries: [], engines: [], vehiclePrograms: [], enginePrograms: [], vehicles: [car()], marketSystem: { regions: [], fleetOffers: [], fleetContracts: [] }, lastMonthSummary: { netProfit: 1000 }, ...overrides };
}
function car(overrides = {}) { return { id: 'car1', name: 'Test One', active: true, productionStatus: 'production', msrp: 4000, generation: 1, design: { body: 'sedan', engineId: 'e1', trans: '4m' }, stats: { zero: 14, mpg: 25, top: 100, handling: 60, comfort: 65, reliability: 75, quality: 65, safety: 50, unitCost: 2100, power: 120, torque: 130, lb: 2500 }, lastMonthProduced: 500, lastMonthSales: 300, lifetimeSales: 5000, ...overrides }; }
const clone = s => JSON.parse(JSON.stringify(s));
function nextMonth(s) { s.month++; if (s.month >= 12) { s.month = 0; s.year++; } s.day = 1; s.lastMonthSummary = { netProfit: 1000 }; }
test('funded tuning takes time, changes real tradeoffs once, and survives reload', () => {
  const g = runtime(), s = state(), D = g.MDXDepth, before = clone(s.vehicles[0].stats), initialCash = s.cash;
  const quote = D.testQuote(s, 'car1', 'road', { gearing: 2, suspension: 2, cooling: 3, brakes: 2, materials: 2 });
  assert.ok(quote.after.zero < before.zero && quote.after.mpg < before.mpg && quote.after.comfort < before.comfort && quote.after.unitCost > before.unitCost);
  const started = D.startTest(s, 'car1', 'road', { gearing: 2, suspension: 2, cooling: 3, brakes: 2, materials: 2 }); assert.equal(started.ok, true); assert.deepEqual(s.vehicles[0].stats, before); assert.equal(D.startTest(s, 'car1', 'road').ok, false);
  let restored = s;
  for (let i = 0; i < quote.days; i++) { restored.day++; if (restored.day > 30) nextMonth(restored); D.processDay(restored); if (i === 4) restored = clone(restored); }
  assert.equal(restored.gameplayDepth.labResults.length, 1); assert.ok(Math.abs(initialCash - restored.cash - quote.cost) < .01); assert.ok(Math.abs(restored.mtdDevelopmentSpend - quote.cost) < .01);
  const after = clone(restored.vehicles[0].stats), cashAfter = restored.cash; D.processDay(restored); assert.equal(restored.cash, cashAfter); assert.deepEqual(clone(restored.vehicles[0].stats), after);
  const repeat = D.testQuote(restored, 'car1', 'road', D.setup(restored.vehicles[0])); assert.deepEqual(clone(repeat.after), after, 'same setup must not compound a stat bonus');
});
test('cash exhaustion pauses tests and cancellation retains current engineering', () => {
  const g = runtime(), s = state(), before = clone(s.vehicles[0].stats); assert.equal(g.MDXDepth.startTest(s, 'car1', 'endurance').ok, true);
  s.cash = 0; s.day++; g.MDXDepth.processDay(s); const p = s.gameplayDepth.labPrograms[0]; assert.equal(p.spent, 0); assert.equal(p.phase, 'Waiting for funding'); assert.equal(g.MDXDepth.cancelTest(s, p.id).ok, true); assert.deepEqual(s.vehicles[0].stats, before);
});
test('supplier counteroffers, deposits and early termination reconcile without duplicate expenses', () => {
  const g = runtime(), s = state(), D = g.MDXDepth, openingCash = s.cash;
  const p = D.proposeProcurement(s, { component: 'steel', minimum: 100, quality: 80, discount: 12, term: 6 }); assert.equal(p.ok, true); assert.equal(D.acceptProcurement(s, p.offer.id).ok, false);
  nextMonth(s); D.processMonth(s); const o = s.gameplayDepth.negotiations[0]; assert.equal(o.status, 'countered'); assert.ok(o.discount < 12); assert.equal(D.acceptProcurement(s, o.id).ok, true); const c = s.gameplayDepth.procurement[0]; assert.equal(s.cash, openingCash - c.deposit); assert.ok(D.procurementModifier(s).cost < 1);
  nextMonth(s); D.processMonth(s); assert.equal(c.shortfallCost, 0); const current = s.cash; D.processMonth(s); assert.equal(s.cash, current);
  const result = D.cancelProcurement(s, c.id); assert.equal(result.ok, true); assert.equal(s.cash, openingCash - result.fee); assert.equal(D.cancelProcurement(s, c.id).ok, false);
  const rec = g.MDX_CORE.cashReconciliation({ openingCash, closingCash: s.cash, transactionRows: s.cashTransactions, dailyRows: [], summary: {} }); assert.ok(Math.abs(rec.cashReconciliationResidual) < .01); assert.equal(rec.oneTimeOperatingNet, -result.fee); assert.equal(rec.investingCashFlow, 0);
});
test('supplier minimum volume charges and deposit returns settle once across saves', () => {
  const g = runtime(), D = g.MDXDepth; let s = state({ vehicles: [car({ lastMonthProduced: 0 })] }); const p = D.proposeProcurement(s, { component: 'tires', minimum: 50, term: 6 }); nextMonth(s); D.processMonth(s); D.acceptProcurement(s, p.offer.id); const c = s.gameplayDepth.procurement[0];
  nextMonth(s); D.processMonth(s); assert.ok(c.shortfallCost > 0); s = clone(s); const cash = s.cash; D.processMonth(s); assert.equal(s.cash, cash);
  while (D.period(s) < c.endPeriod) { nextMonth(s); D.processMonth(s); } const finished = s.gameplayDepth.procurement[0]; assert.equal(finished.status, 'complete'); assert.equal(finished.depositBalance, 0); const returned = s.cash; D.processMonth(s); assert.equal(s.cash, returned); assert.equal(s.cashTransactions.filter(t => t.category === 'procurement_return').length, 1);
});
test('racing is era gated, funded, deterministic, finite, and awards no idle windfalls', () => {
  const g = runtime(), D = g.MDXDepth, s = state({ year: 1940 }); assert.equal(D.startSeason(s, { seriesId: 'gt', vehicleId: 'car1', driverId: 'veteran' }).ok, false);
  const quote = D.raceQuote(s, 'club', 'professional', 1), r = D.startSeason(s, { seriesId: 'club', vehicleId: 'car1', driverId: 'professional', preparation: 1 }); assert.equal(r.ok, true);
  const replay = clone(s), initialCash = s.cash;
  for (let i = 0; i < quote.rounds; i++) { nextMonth(s); nextMonth(replay); D.processMonth(s); D.processMonth(replay); assert.deepEqual(clone(s.gameplayDepth.seasons), clone(replay.gameplayDepth.seasons)); const cash = s.cash; D.processMonth(s); assert.equal(s.cash, cash); }
  assert.equal(r.season.status, 'complete'); assert.equal(initialCash - s.cash, quote.perRound * quote.rounds); assert.ok(s.rp <= quote.rounds); const finalCash = s.cash, finalRP = s.rp; nextMonth(s); D.processMonth(s); assert.equal(s.cash, finalCash); assert.equal(s.rp, finalRP);
  const unfunded = state(); D.startSeason(unfunded, { seriesId: 'club', vehicleId: 'car1', driverId: 'rookie' }); unfunded.cash = 0; nextMonth(unfunded); D.processMonth(unfunded); assert.equal(unfunded.rp, 0); assert.equal(unfunded.gameplayDepth.seasons[0].points, 0); assert.match(unfunded.gameplayDepth.seasons[0].results[0].reason, /DNS/);
});
test('family variants preserve platform compatibility and enter normal development as drafts', () => {
  const g = runtime(), s = state(); s.vehicles[0].platformId = 'p1'; s.platforms = [{ id: 'p1', bodies: ['sedan', 'wagon'] }]; const result = g.MDXDepth.variantDraft(s, 'car1', 'wagon'); assert.equal(result.ok, true); assert.equal(result.draft.platformId, 'p1'); assert.equal(result.draft.familyId, 'car1'); assert.equal(result.draft.engineId, 'e1'); assert.equal(g.MDXDepth.variantDraft(s, 'car1', 'truck').ok, false); assert.equal(s.vehicles.length, 1); assert.equal(s.cash, 1e7);
  s.vehicles.push(car({ id: 'car2', design: result.draft })); assert.equal(g.MDXDepth.familyGroups(s)[0].variants.length, 2);
});
test('company business plans spend subsidiary cash and respect minority ownership and failed targets', () => {
  const g = runtime(), D = g.MDXDepth, s = state({ subsidiaries: [{ id: 'sub1', name: 'Subsidiary', parentOwnership: 60, cash: 2e6, lastProfit: 10000 }], industry: [{ id: 'sub1', name: 'Subsidiary', acquired: true, status: 'active', cash: 2e6, valuation: 2e6, monthProfit: 10000, monthNetProfit: 10000, monthSales: 100, qualityCulture: 80, aiCars: [{ id: 'c1', active: true, quality: 80 }] }] });
  assert.equal(D.startPlan(s, 'unowned', 'turnaround').ok, false); const plan = D.startPlan(s, 'sub1', 'expansion', { months: 6, budget: 6000, salesGrowth: 30 }); assert.equal(plan.ok, true); assert.equal(s.industry[0].parentProductDirectives.preferredSegment, 'Family'); const parentCash = s.cash;
  nextMonth(s); D.processMonth(s); assert.equal(s.industry[0].cash, 1999000); assert.equal(s.cash, parentCash); assert.equal(s.lastMonthSummary.subsidiaryPlanExpense, 600); const once = s.industry[0].cash; D.processMonth(s); assert.equal(s.industry[0].cash, once);
  for (let i = 0; i < 5; i++) { nextMonth(s); s.industry[0].monthProfit = s.industry[0].monthNetProfit = 10000; D.processMonth(s); } assert.equal(plan.plan.status, 'missed', 'profitable company still has to meet its sales-growth target'); assert.ok(plan.plan.spent <= plan.plan.budget);
});
test('delegation requires the installed responsible director and returns unfunded work for review', () => {
  const g = runtime(), D = g.MDXDepth, s = state({ vehicles: [car({ inventory: 5000 })] }); D.generateDecisions(s); const q = s.gameplayDepth.decisions.find(x => x.type === 'inventory'); assert.equal(q.role, 'cmo'); assert.equal(D.resolveDecision(s, q.id, 'delegate').ok, false); s.executiveOffice = { roles: { cmo: { candidateId: 'director1', name: 'Director' } } }; assert.equal(D.resolveDecision(s, q.id, 'delegate').ok, true); nextMonth(s); D.processMonth(s); assert.equal(s.vehicles[0].msrp, 3840); D.processMonth(s); assert.equal(s.vehicles[0].msrp, 3840);
});
test('help requires a fresh explicit choice before founding and ignores old preferences', () => {
  const g = runtime(), T = g.MDXTutorial;
  g.localStorage.setItem('motorDynastyTutorial', 'on'); assert.equal(T.preference(), false);
  const s = state(); T.initialize(s); assert.equal(s.tutorial.enabled, false); assert.equal(s.tutorial.optedIn, false);
  T.setEnabled(s, true); assert.equal(s.tutorial.enabled, false); assert.equal(T.restart(s), false);
  const legacy = state({ tutorial: { version: 1, enabled: true, index: 5, completed: ['welcome'] } });
  const before = { company: legacy.company, cash: legacy.cash, vehicles: clone(legacy.vehicles) };
  assert.equal(T.ensure(legacy).enabled, false); assert.equal(legacy.tutorial.optedIn, false);
  assert.deepEqual({ company: legacy.company, cash: legacy.cash, vehicles: legacy.vehicles }, before);
});
test('tutorial advances only from real engine, release, car and sale milestones', () => {
  const g = runtime(), T = g.MDXTutorial, s = state({ vehicles: [] }); T.initialize(s, true);
  assert.equal(T.advance(s), false); s.enginePrograms.push({ id: 'cancelled', status: 'cancelled' }); T.tick(s); assert.equal(s.tutorial.index, 0);
  s.enginePrograms.push({ id: 'e1', status: 'active' }); T.tick(s); assert.equal(s.tutorial.index, 1); assert.equal(T.advance(s), false);
  s.engines.push({ id: 'e1' }); T.tick(s); assert.equal(s.tutorial.index, 2); assert.equal(T.advance(s), false);
  s.vehiclePrograms.push({ id: 'v1', status: 'active' }); T.tick(s); assert.equal(s.tutorial.index, 3);
  s.vehicles.push(car({ productionStatus: 'preproduction', lifetimeSales: 0, lastMonthSales: 0 })); T.tick(s); assert.equal(s.tutorial.index, 3);
  s.vehicles[0].productionStatus = 'production'; T.tick(s); assert.equal(s.tutorial.index, 4); assert.equal(T.advance(s), false);
  s.vehicles[0].lifetimeSales = 1; T.tick(s); assert.equal(s.tutorial.index, 5);
  assert.equal(T.advance(s), false, 'production plan must be opened before continuing'); s.tutorial.visited.push('output'); assert.equal(T.advance(s), true);
  s.tutorial.visited.push('cash'); assert.equal(T.advance(s), true); assert.equal(T.advance(s), true); assert.equal(s.tutorial.finished, true); assert.equal(s.tutorial.enabled, false);
});
test('tutorial can pause, resume, skip and restart without changing a company or save', () => {
  const g = runtime(), T = g.MDXTutorial, s = state({ vehicles: [] }); T.initialize(s, true); assert.equal(T.advance(s, true), true);
  T.setEnabled(s, false); const restored = clone(s); T.ensure(restored); assert.equal(restored.tutorial.index, 1); assert.equal(restored.tutorial.enabled, false);
  restored.engines.push({ id: 'e1' }); T.tick(restored); assert.equal(restored.tutorial.index, 1, 'paused guide stays paused');
  T.setEnabled(restored, true); T.tick(restored); assert.equal(restored.tutorial.index, 2);
  const company = { cash: restored.cash, company: restored.company, engines: clone(restored.engines) }; T.restart(restored);
  assert.equal(restored.tutorial.index, 0); assert.equal(restored.tutorial.optedIn, true); assert.deepEqual({ cash: restored.cash, company: restored.company, engines: restored.engines }, company);
  assert.equal(T.preference(), false, 'the next company still starts with help unchecked');
});
test('challenge region goals use actual retail deliveries and museum archives old generations', () => {
  const g = runtime(), D = g.MDXDepth, s = state({ lifetimeUnits: 20000, marketSystem: { regions: ['a', 'b', 'c'].map(id => ({ id, unlocked: true })), fleetContracts: [] }, customerMarket: { regions: Object.fromEntries(['a', 'b', 'c'].map(id => [id, { lifetime: { sales: 100 } }])) } }); D.startChallenge(s, 'global'); assert.equal(D.challengeProgress(s).complete, true); const initialCash = s.cash; D.processMonth(s); assert.equal(s.gameplayDepth.challenge.status, 'complete'); assert.equal(s.cash, initialCash); s.vehicles[0].generation = 2; nextMonth(s); D.processMonth(s); assert.equal(s.gameplayDepth.museum.find(x => x.generation === 1).retired, true); assert.equal(s.gameplayDepth.museum.find(x => x.generation === 2).retired, false);
});
test('retuning preserves engineering improvements made by later lifecycle programs', () => {
  const g = runtime(), D = g.MDXDepth, s = state(); D.startTest(s, 'car1', 'road'); for (let i = 0; i < 10; i++) { s.day++; D.processDay(s); }
  s.vehicles[0].stats.quality += 4; s.vehicles[0].stats.comfort += 3; const updated = clone(s.vehicles[0].stats); const quote = D.testQuote(s, 'car1', 'road', D.setup(s.vehicles[0])); assert.equal(quote.after.quality, updated.quality); assert.equal(quote.after.comfort, updated.comfort);
  D.startTest(s, 'car1', 'road'); for (let i = 0; i < 10; i++) { s.day++; D.processDay(s); } assert.equal(s.vehicles[0].stats.quality, updated.quality); assert.equal(s.vehicles[0].stats.comfort, updated.comfort);
});
test('a negotiation responds on day thirty independent of the monthly close date', () => {
  const g = runtime(), D = g.MDXDepth, s = state({ day: 2, daysPlayed: 121 }); const proposal = D.proposeProcurement(s, { component: 'brakes' });
  for (let i = 0; i < 29; i++) { s.daysPlayed++; s.day++; if (s.day > 30) nextMonth(s); D.processDay(s); } assert.equal(proposal.offer.status, 'pending'); s.daysPlayed++; s.day++; D.processDay(s); assert.equal(proposal.offer.status, 'countered');
});
test('goal accounting waits for final net profit and plan budgets cannot overrun', () => {
  const g = runtime(), D = g.MDXDepth, s = state(); D.startChallenge(s, 'survive'); D.processMonth(s, { deferGoals: true }); assert.equal(s.gameplayDepth.challenge.profitableMonths, 0); s.lastMonthSummary.netProfit = -500; D.finalizeMonth(s); assert.equal(s.gameplayDepth.challenge.profitableMonths, 0); D.finalizeMonth(s); assert.equal(s.gameplayDepth.challenge.profitableMonths, 0);
  const owned = state({ industrialCompanies: [{ id: 'owned', parentOwned: true, cash: 1e6, value: 1e6, netProfit: 10000, quality: 75 }] }); const plan = D.startPlan(owned, 'owned', 'turnaround', { months: 6, budget: 6000 }).plan;
  for (let i = 0; i < 7; i++) { D.processMonth(owned); nextMonth(owned); } assert.ok(plan.spent <= 6000); assert.equal(plan.reviewed, 6);
});
test('daily replacement hiring and transmission cash remain visible in the cash bridge', () => {
  const g = runtime(), rec = g.MDX_CORE.cashReconciliation({ openingCash: 100000, closingCash: 104945, dailyRows: [{ net: 4945, vehicle: 4000, transmission: 2000, fixed: 1000 }], transactionRows: [], summary: {} });
  assert.equal(rec.cashReconciliationResidual, 0); assert.equal(rec.cashBreakdown.transmission, 2000); assert.equal(rec.cashBreakdown.otherDailyOperations, -55); assert.equal(rec.operatingCashFlow, 4945);
  const sweep = g.MDX_CORE.cashReconciliation({ openingCash: 100000, closingCash: 100100, dailyRows: [{ net: 100, subsidiaryDistribution: 100 }], transactionRows: [{ category: 'subsidiary_distribution', amount: 100 }], summary: {} });
  assert.equal(sweep.cashReconciliationResidual, 0); assert.equal(sweep.internalCashFlow, 100); assert.equal(sweep.operatingCashFlow, 0);
});
