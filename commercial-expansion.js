/* Commercial Expansion: saved decisions, funded research and real market comparisons. */
(() => {
  'use strict';
  const G = window, n = (x, fallback = 0) => x !== null && x !== '' && Number.isFinite(Number(x)) ? Number(x) : fallback;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, n(x))), obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const period = s => n(s.year, 1970) * 12 + n(s.month), day = s => n(s.year, 1970) * 360 + n(s.month) * 30 + n(s.day, 1), date = s => ({ year: s.year, month: s.month, day: s.day });
  const moneyEra = (s, amount, category = 'research') => Math.max(0, Math.round(amount * (G.MDX_CORE?.economicIndex?.(category, n(s.year, 1970)) || Math.pow(1.03, n(s.year, 1970) - 1970))));
  const failure = reason => ({ ok: false, reason });
  const STUDIES = {
    pricing: { name: 'Price-position study', cost: 24000, days: 14, description: 'Compare your MSRP with real current products in the same segment.' },
    customers: { name: 'Customer fit study', cost: 29000, days: 18, description: 'Review comfort, safety, economy and reliability against the segment.' },
    competition: { name: 'Competitor product survey', cost: 36000, days: 21, description: 'Record the closest competing products and their available specifications.' },
    dealer: { name: 'Dealer launch readiness', cost: 18000, days: 12, description: 'Check selling coverage, service readiness and trained sales standards.' },
    factory: { name: 'Production feasibility study', cost: 32000, days: 21, description: 'Compare model capacity, forecast demand and tied-up stock cash.' },
    fleet: { name: 'Commercial buyer study', cost: 26000, days: 18, description: 'Review reliability, passenger utility, price and cost for fleet positioning.' },
    export: { name: 'Export route study', cost: 38000, days: 24, description: 'Record open and closed regions and current dealer coverage.' },
    warranty: { name: 'Warranty exposure review', cost: 30000, days: 20, description: 'Review actual reliability, quality, warranty spending and dealer support.' },
    portfolio: { name: 'Portfolio overlap study', cost: 28000, days: 18, description: 'Identify your same-segment models and their prices and recent sales.' },
    launch: { name: 'Complete launch review', cost: 42000, days: 28, description: 'Capture the eight launch gates and your current working-capital position.' }
  };
  const STRATEGIES = {
    neutral: { name: 'Neutral positioning', description: 'Use the original product marketing behavior.' },
    value: { name: 'Affordable value', description: 'Works best below the segment median price with useful fuel economy.' },
    family: { name: 'Family confidence', description: 'Emphasize comfort, safety and a practical body style.' },
    premium: { name: 'Premium craftsmanship', description: 'Emphasize quality and comfort in Premium or Luxury segments.' },
    performance: { name: 'Performance specialist', description: 'Emphasize handling and power in Sport or Track segments.' },
    fleet: { name: 'Fleet workhorse', description: 'Emphasize reliability, utility and affordable purchase cost.' },
    dependable: { name: 'Dependable ownership', description: 'Emphasize existing reliability, economy and service support.' }
  };
  const SALES_PROGRAMS = {
    knowledge: { name: 'Product knowledge school', cost: 40000, days: 24, weight: 9, description: 'Train sales staff to explain the actual product specification.' },
    preparation: { name: 'Showroom presentation standard', cost: 48000, days: 28, weight: 8, description: 'Introduce repeatable vehicle display and handover preparation.' },
    drives: { name: 'Demonstration-drive training', cost: 36000, days: 21, weight: 9, description: 'Train staff to demonstrate the right vehicle to prospective buyers.' },
    stock: { name: 'Inventory review desk', cost: 33000, days: 21, weight: 7, description: 'Train dealers to review the existing stock and sales reports.' },
    delivery: { name: 'Delivery inspection standard', cost: 44000, days: 28, weight: 8, warranty: .012, description: 'Train staff to check vehicles at handover; funded support reduces warranty cost.' },
    fleet: { name: 'Fleet sales desk', cost: 52000, days: 30, weight: 10, description: 'Train a regional commercial-buyer sales desk.' }
  };
  const PALETTES = {
    enamel: { name: 'Heritage green', color: '#35645c' }, ivory: { name: 'Warm ivory', color: '#d8ceb4' }, black: { name: 'Midnight black', color: '#252e38' },
    silver: { name: 'Machine silver', color: '#9ba8af' }, blue: { name: 'Atlantic blue', color: '#35658f' }, red: { name: 'Racing scarlet', color: '#9d3a35' }
  };
  const WHEELS = { steel: { name: 'Painted steel', year: 1940 }, chrome: { name: 'Chrome covers', year: 1940 }, alloy: { name: 'Alloy presentation', year: 1960 } };
  const BENCH_FIELDS = {
    price: { name: 'MSRP', own: v => positive(v.msrp), rival: c => positive(c.price ?? c.msrp), higher: false, unit: '$' },
    quality: { name: 'Quality', own: v => positive(v.stats?.quality), rival: c => positive(c.quality ?? c.stats?.quality), higher: true },
    reliability: { name: 'Reliability', own: v => positive(v.stats?.reliability ?? v.stats?.rel), rival: c => positive(c.reliability ?? c.stats?.reliability ?? c.stats?.rel), higher: true },
    mpg: { name: 'Fuel economy', own: v => positive(v.stats?.mpg), rival: c => positive(c.mpg ?? c.stats?.mpg), higher: true, unit: 'mpg' },
    power: { name: 'Power', own: v => positive(v.stats?.power ?? v.stats?.hp), rival: c => positive(c.power ?? c.hp ?? c.stats?.power ?? c.stats?.hp), higher: true, unit: 'hp' },
    safety: { name: 'Safety', own: v => positive(v.stats?.safety), rival: c => positive(c.safety ?? c.stats?.safety), higher: true },
    comfort: { name: 'Comfort', own: v => positive(v.stats?.comfort), rival: c => positive(c.comfort ?? c.stats?.comfort), higher: true },
    cost: { name: 'Base manufacturing cost', own: v => positive(v.stats?.unitCost), rival: c => positive(c.unitCost ?? c.stats?.unitCost ?? c.cost), higher: false, unit: '$' }
  };
  function positive(x) { return x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : null; }
  function recorded(x) { return x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : null; }
  function operationsReport(s, v) {
    G.MDXIndustry?.ensure?.(s);
    if (!(s.vehicles || []).some(x => String(x.id) === String(v.id))) return { capacity: 0, demand: 0, pipeline: 0, inventoryCost: 0, daysSupply: null, shortage: 0 };
    return G.MDXIndustry?.modelReport?.(s, v) || {};
  }
  function vehicles(s) { const seen = new Set(); return [...(s.vehicles || []), ...(s.vehiclePrograms || []).filter(p => p.status === 'active').map(p => p.vehicle)].filter(v => { if (!v?.id || seen.has(String(v.id))) return false; seen.add(String(v.id)); return true; }); }
  function selling(s) { return vehicles(s).filter(v => v.active !== false && v.productionStatus === 'production'); }
  function ensure(s) {
    if (!s || typeof s !== 'object') return null;
    const e = s.commercialExpansion = obj(s.commercialExpansion); e.version = 1;
    for (const key of ['jobs', 'research', 'plans', 'monthly', 'history']) if (!Array.isArray(e[key])) e[key] = [];
    e.nextId = Math.max(1, Math.floor(n(e.nextId, 1))); e.policy = obj(e.policy); e.ui = obj(e.ui);
    e.policy.studySlots = Math.round(clamp(n(e.policy.studySlots, 2), 1, 3));
    for (const key of ['lastProjectDay', 'lastOperatingDay', 'lastClosePeriod']) e[key] = n(e[key], -1);
    e.mtdSpend = Math.max(0, n(e.mtdSpend)); e.lastDailySpend = Math.max(0, n(e.lastDailySpend));
    for (const v of vehicles(s)) { const c = v.commercial = obj(v.commercial); c.strategy = STRATEGIES[c.strategy] ? c.strategy : 'neutral'; c.monthlySupport = clamp(n(c.monthlySupport), 0, 120000); c.observedSales = Math.max(0, n(c.observedSales)); c.supportSpend = Math.max(0, n(c.supportSpend)); c.appearance = obj(c.appearance); }
    for (const r of s.marketSystem?.regions || []) { const c = r.salesSupport = obj(r.salesSupport); c.levels = obj(c.levels); for (const key of Object.keys(SALES_PROGRAMS)) c.levels[key] = Math.round(clamp(n(c.levels[key]), 0, 1)); c.budgetPerDealer = clamp(n(c.budgetPerDealer), 0, 500); c.spent = Math.max(0, n(c.spent)); }
    return e;
  }
  function record(s, title, detail, hooks = {}) { const e = ensure(s); e.history.unshift({ id: 'commercial_event_' + e.nextId++, ...date(s), title, detail }); e.history = e.history.slice(0, 100); hooks.log?.(title + ': ' + detail); }
  function reserve(s, mode) { return Math.max(n(s.industrialEra?.policy?.reserve), n(s.budgetSystem?.[mode === 'project' ? 'protectProjects' : 'protectOperations'] ? s.budgetSystem.reserveFloor : 0)); }
  function target(s, type, id) { return (type === 'study' ? vehicles(s) : s.marketSystem?.regions || []).find(x => String(x.id) === String(id)); }
  function quote(s, type, targetId, kind) {
    const e = ensure(s), t = target(s, type, targetId), def = (type === 'study' ? STUDIES : SALES_PROGRAMS)[kind]; if (!t || !def || !['study', 'sales'].includes(type)) return null;
    const cost = moneyEra(s, def.cost * (type === 'sales' ? clamp(Math.sqrt(n(t.dealers, 1) / 6), .75, 2.5) : 1));
    const last = e.research.filter(x => String(x.vehicleId) === String(targetId) && x.kind === kind).at(-1);
    let reason = type === 'sales' && (!t.unlocked || n(t.dealers) < 1) ? 'Open dealers in this region first.' : type === 'sales' && t.salesSupport.levels[kind] ? 'This sales standard is installed.' : type === 'study' && last && day(s) - last.completedDay < 30 ? 'Repeat this study after 30 game days.' : '';
    if (!reason && e.jobs.some(x => x.type === type && String(x.targetId) === String(targetId) && x.kind === kind && ['active', 'paused'].includes(x.status))) reason = 'This work is already authorized.';
    if (!reason && n(s.cash) - reserve(s, 'project') < cost / def.days) reason = 'Insufficient cash above the protected reserve.';
    return { ...def, kind, type, targetId, cost, daily: cost / def.days, available: !reason, reason };
  }
  function startJob(s, type, targetId, kind, hooks = {}) {
    const q = quote(s, type, targetId, kind); if (!q?.available) return failure(q?.reason || 'Select a valid product or selling region.');
    const e = ensure(s), p = { id: 'commercial_job_' + e.nextId++, type, targetId, kind, name: q.name, status: 'active', phase: 'AUTHORIZED', totalDays: q.days, daysRemaining: q.days, budget: q.cost, spent: 0, delayedDays: 0, startedDay: day(s), started: date(s) };
    e.jobs.push(p); record(s, p.name + ' authorized', 'Funding occurs only on worked days; approved budget ' + q.cost + '.', hooks); return { ok: true, job: p };
  }
  function jobAction(s, id, action, hooks = {}) {
    const p = ensure(s).jobs.find(x => x.id === id); if (!p || !['active', 'paused'].includes(p.status)) return failure('This work has already closed.');
    if (action === 'pause') { p.status = 'paused'; p.phase = 'PAUSED'; } else if (action === 'resume') { p.status = 'active'; p.phase = 'RESUMING'; } else if (action === 'cancel') { p.status = 'cancelled'; p.phase = 'CANCELLED'; p.closed = date(s); } else return failure('Unknown job action.');
    record(s, p.name + ': ' + action, 'Actual spending stays recorded; unfinished work is not charged.', hooks); return { ok: true };
  }
  function rivalProducts(s, v) {
    const segment = v?.stats?.className || v?.target || v?.segment;
    return (s.industry || []).filter(m => !m.acquired && !m.playerSubsidiary && !['bankrupt', 'liquidated', 'merged_into_player'].includes(m.status)).flatMap(m => (m.aiCars || []).filter(c => c.active !== false && (!segment || (c.segment || c.stats?.className) === segment)).map(c => ({ id: String(m.id) + ':' + String(c.id || c.name), company: m.name, name: c.name || c.model || c.id, segment: c.segment, car: c, brandRep: positive(m.brandReputation), monthlySales: recorded(c.lastMonthSales ?? c.lastSales ?? c.monthlySales ?? c.sales) })));
  }
  function median(values) { const a = values.filter(x => x !== null).sort((x, y) => x - y); return !a.length ? null : a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; }
  function benchmark(s, v) {
    const rivals = rivalProducts(s, v), metrics = {};
    for (const [key, f] of Object.entries(BENCH_FIELDS)) { const own = f.own(v), values = rivals.map(x => f.rival(x.car)).filter(x => x !== null), mid = median(values), favorable = own === null || !values.length ? null : values.filter(x => f.higher ? x <= own : x >= own).length / values.length;
      metrics[key] = { name: f.name, value: own, median: mid, sample: values.length, favorablePercentile: favorable, gap: own !== null && mid > 0 ? own / mid - 1 : null, unit: f.unit || '', higher: f.higher };
    }
    const price = positive(v.msrp), closest = price ? rivals.filter(x => positive(x.car.price ?? x.car.msrp)).sort((a, b) => Math.abs((a.car.price ?? a.car.msrp) - price) - Math.abs((b.car.price ?? b.car.msrp) - price)).slice(0, 6) : rivals.slice(0, 6);
    return { vehicleId: v.id, name: v.name, segment: v.stats?.className || v.target, rivalCount: rivals.length, metrics, closest: closest.map(x => ({ id: x.id, company: x.company, name: x.name, segment: x.segment, values: Object.fromEntries(Object.entries(BENCH_FIELDS).map(([k, f]) => [k, f.rival(x.car)])), monthlySales: x.monthlySales })), prices: rivals.map(x => ({ company: x.company, name: x.name, price: positive(x.car.price ?? x.car.msrp) })).filter(x => x.price).sort((a, b) => a.price - b.price) };
  }
  function positioning(s, v, referenceDay = day(s)) {
    ensure(s); const c = v.commercial, st = v.stats || {}, segment = st.className || v.target, funded = referenceDay >= 0 && n(c.fundedDay, -1) === referenceDay, budget = moneyEra(s, c.monthlySupport, 'marketing');
    if (c.strategy === 'neutral') return { name: STRATEGIES.neutral.name, score: null, multiplier: 1, funded: false, monthlyCost: 0, reason: 'Original product marketing behavior.' };
    const priceMedian = positive(v.avgRivalPrice) || benchmark(s, v).metrics.price.median || positive(v.msrp), priceFit = priceMedian && positive(v.msrp) ? clamp(priceMedian / v.msrp, .3, 1.2) / 1.2 : .5;
    const reliable = clamp(n(st.reliability ?? st.rel) / 100, 0, 1), comfort = clamp(n(st.comfort) / 100, 0, 1), safety = clamp(n(st.safety) / 100, 0, 1), quality = clamp(n(st.quality) / 100, 0, 1), economy = clamp(n(st.mpg) / 40, 0, 1);
    const fits = { value: priceFit * .6 + economy * .4, family: comfort * .35 + safety * .4 + (['Family', 'Mainstream'].includes(segment) ? .25 : .05), premium: quality * .4 + comfort * .35 + (['Premium', 'Luxury'].includes(segment) ? .25 : .03), performance: clamp(n(st.handling) / 100, 0, 1) * .45 + clamp(n(st.power ?? st.hp) / 260, 0, 1) * .3 + (['Sport', 'Track'].includes(segment) ? .25 : .04), fleet: reliable * .5 + priceFit * .3 + (['Utility', 'Off-Road', 'Family', 'Mainstream'].includes(segment) ? .2 : .03), dependable: reliable * .7 + economy * .3 };
    const score = clamp(fits[c.strategy], 0, 1), strength = clamp(c.monthlySupport / 60000, 0, 1), multiplier = funded ? 1 + clamp((score - .55) * .1, -.03, .045) * strength : 1;
    return { name: STRATEGIES[c.strategy].name, score, multiplier, funded, monthlyCost: budget, reason: score < .55 ? 'The product is a weak fit for this message; paid positioning can reduce demand.' : 'Existing product attributes fit the selected message. Support works only on funded days.' };
  }
  function setPositioning(s, id, values, hooks = {}) {
    ensure(s); const v = vehicles(s).find(v => String(v.id) === String(id)); if (!v || !STRATEGIES[values.strategy]) return failure('Select a valid product positioning.');
    v.commercial.strategy = values.strategy; v.commercial.monthlySupport = values.strategy === 'neutral' ? 0 : clamp(n(values.monthlySupport), 0, 120000); v.commercial.fundedDay = -1;
    record(s, v.name + ' positioning updated', STRATEGIES[values.strategy].name + '; base monthly support ' + v.commercial.monthlySupport + ' in 1970 dollars.', hooks); return { ok: true };
  }
  function salesProfile(s, r, referenceDay = day(s)) {
    if (!r.salesSupport) ensure(s); const c = r.salesSupport, installed = Object.entries(SALES_PROGRAMS).reduce((a, [key, p]) => a + c.levels[key] * p.weight, 0), funded = referenceDay >= 0 && n(c.fundedDay, -1) === referenceDay, staff = clamp(c.budgetPerDealer / 350, 0, 1);
    return { score: clamp(40 + installed + (funded ? staff * 9 : 0), 0, 100), installed: Object.values(c.levels).reduce((a, b) => a + b, 0), funded, multiplier: funded ? 1 + Math.min(.035, installed / 1800) * staff : 1, warranty: funded && c.levels.delivery ? 1 - .012 * staff : 1, monthlyCost: moneyEra(s, c.budgetPerDealer * Math.max(0, n(r.dealers)), 'wages') };
  }
  function setSalesBudget(s, regionId, value) { ensure(s); const r = target(s, 'sales', regionId); if (!r?.unlocked || n(r.dealers) < 1) return failure('Open a selling region first.'); r.salesSupport.budgetPerDealer = clamp(value, 0, 500); r.salesSupport.fundedDay = -1; return { ok: true }; }
  function demandMultiplier(s, v) { return v.commercial?.strategy && v.commercial.strategy !== 'neutral' ? positioning(s, v).multiplier : 1; }
  function regionMultiplier(s, r) { return r.salesSupport ? salesProfile(s, r).multiplier : 1; }
  function warrantyFactor(s) { const rs = (s.marketSystem?.regions || []).filter(r => r.unlocked && n(r.dealers) > 0), total = rs.reduce((a, r) => a + n(r.dealers), 0); return total ? rs.reduce((a, r) => a + (r.salesSupport ? salesProfile(s, r).warranty : 1) * n(r.dealers) / total, 0) : 1; }
  function processOperatingDay(s, hooks = {}) {
    const e = ensure(s), now = day(s); if (e.lastOperatingDay >= now) return 0; e.lastOperatingDay = now; let spent = 0; const available = n(s.cash) - Math.max(0, n(hooks.unavoidableDaily)) - reserve(s, 'operating');
    for (const v of vehicles(s)) { const c = v.commercial; c.fundedDay = -1; const cost = v.active !== false && v.productionStatus === 'production' && c.strategy !== 'neutral' ? moneyEra(s, c.monthlySupport, 'marketing') / 30 : 0; if (cost > 0 && available - spent >= cost) { spent += cost; c.supportSpend += cost; c.fundedDay = now; } }
    for (const r of (s.marketSystem?.regions || []).filter(r => r.unlocked && n(r.dealers) > 0)) { r.salesSupport.fundedDay = -1; const cost = salesProfile(s, r).monthlyCost / 30; if (cost > 0 && available - spent >= cost) { spent += cost; r.salesSupport.spent += cost; r.salesSupport.fundedDay = now; } }
    e.lastDailySpend = spent; e.mtdSpend += spent; return spent;
  }
  function recordSalesDay(s, v, sold) { if (v.commercial && v.commercial.fundedDay === day(s) && n(v.commercial.lastSalesDay, -1) < day(s)) { v.commercial.observedSales += Math.max(0, n(sold)); v.commercial.lastSalesDay = day(s); } }
  function readiness(s, v, regionId) {
    ensure(s); const r = (s.marketSystem?.regions || []).find(r => String(r.id) === String(regionId)) || (s.marketSystem?.regions || []).find(r => r.unlocked), report = operationsReport(s, v), factories = (G.MDX?.factoryProductionMix?.(s, v.id) || []).map(x => x.factory).filter(Boolean), stats = v.stats || {}, electric = [v.powertrainType, v.design?.powertrainType, v.design?.propulsion, v.electrification?.architecture].some(x => ['ev', 'electric', 'bev'].includes(String(x).toLowerCase()));
    const powertrain = electric || (s.engines || []).some(e => String(e.id) === String(v.engineId || v.design?.engineId)), active = v.active !== false && v.productionStatus === 'production';
    const price = positive(v.msrp), unitCost = positive(stats.unitCost), mid = positive(v.avgRivalPrice) || benchmark(s, v).metrics.price.median;
    const checks = [
      { id: 'release', label: 'Production release', pass: active, detail: active ? 'This model is in serial production.' : 'Finish the existing vehicle development program.', view: 'library', tab: 'products' },
      { id: 'powertrain', label: 'Released powertrain', pass: powertrain, detail: electric ? 'Electric propulsion selected; normal battery procurement still applies.' : powertrain ? 'The referenced engine is in your released engine library.' : 'Release or procure the referenced engine.', view: 'library', tab: 'contracts' },
      { id: 'capacity', label: 'Allocated production capacity', pass: n(report.capacity) > 0, detail: Math.round(n(report.capacity)) + ' estimated available model units/month.', view: 'library', tab: 'factories' },
      { id: 'workforce', label: 'Operating factory staff', pass: factories.length > 0 && factories.every(f => n(f.workers) - n(f.trainees) >= 40 && n(f.morale, 65) >= 40), detail: 'Every allocated operating plant needs at least 40 trained workers and 40 morale.', view: 'library', tab: 'workforce' },
      { id: 'coverage', label: 'Target-market dealer coverage', pass: !!r?.unlocked && n(r.dealers) > 0, detail: r ? (G.MDX_DATA?.REGIONS?.find(x => x.id === r.id)?.name || r.id) + ': ' + n(r.dealers) + ' dealers.' : 'Choose and enter a selling region.', view: 'market', tab: 'regions' },
      { id: 'service', label: 'Regional service support', pass: !!r && n(G.MDXIndustry?.serviceProfile?.(s, r)?.score) >= 45, detail: 'The launch reference requires regional service readiness of 45/100.', view: 'market', tab: 'dealers' },
      { id: 'pricing', label: 'Commercial price viability', pass: price !== null && unitCost !== null && price > unitCost && (!mid || price <= mid * 1.5), detail: 'MSRP must exceed base unit cost and stay within 150% of the segment median when available.', view: 'market', tab: 'customers' },
      { id: 'cash', label: 'Thirty days of fixed-cost cash', pass: n(s.cash) > 0 && n(s.cash) >= Math.max(1, n(s.dailyFixedCost) * 30), detail: 'Uses actual current fixed daily costs, including funded support.', view: 'budget' }
    ];
    return { vehicleId: v.id, name: v.name, checks, score: Math.round(checks.filter(x => x.pass).length / checks.length * 100), ready: checks.every(x => x.pass), passed: checks.filter(x => x.pass).length, regionId: r?.id, report };
  }
  function makeResearch(s, v, kind) {
    const b = benchmark(s, v), r = operationsReport(s, v), gates = readiness(s, v), st = v.stats || {}, observations = [];
    const push = (label, value, detail = '') => observations.push({ label, value: value ?? null, detail });
    if (['pricing', 'competition', 'customers'].includes(kind)) { push('Segment median price', b.metrics.price.median, b.metrics.price.sample + ' available peer prices.'); push('Price gap to median', b.metrics.price.gap); push('Quality favorable percentile', b.metrics.quality.favorablePercentile, 'Higher indicates a more favorable comparison.'); }
    if (kind === 'customers') { push('Comfort', positive(st.comfort)); push('Safety', positive(st.safety)); push('Fuel economy', positive(st.mpg)); }
    if (kind === 'dealer') for (const rr of (s.marketSystem?.regions || []).filter(x => x.unlocked)) { push('Dealers: ' + rr.id, n(rr.dealers)); push('Service readiness: ' + rr.id, G.MDXIndustry?.serviceProfile?.(s, rr)?.score); push('Sales standards: ' + rr.id, salesProfile(s, rr).installed); }
    if (kind === 'factory') { push('Model capacity / month', n(r.capacity)); push('Current demand forecast', n(r.demand)); push('Pipeline working cash', n(r.inventoryCost)); push('Days of supply', r.daysSupply); }
    if (kind === 'fleet') { push('Reliability', positive(st.reliability ?? st.rel)); push('Base unit cost', positive(st.unitCost)); push('Fleet message fit', positioningFor(s, v, 'fleet').score); }
    if (kind === 'export') for (const rr of s.marketSystem?.regions || []) { push('Market: ' + rr.id, rr.unlocked ? 'OPEN' : 'CLOSED', n(rr.dealers) + ' current dealers.'); }
    if (kind === 'warranty') { push('Reliability', positive(st.reliability ?? st.rel)); push('Actual last-month warranty cost', v.lastMonthWarranty == null ? null : n(v.lastMonthWarranty)); push('Current warranty factor', (G.MDXIndustry?.warrantyFactor?.(s, v) || 1) * warrantyFactor(s)); }
    if (kind === 'portfolio') for (const other of vehicles(s).filter(x => (x.stats?.className || x.target) === (st.className || v.target))) push(other.name, positive(other.msrp), n(other.lastMonthSales) + ' last-month sales.');
    if (kind === 'launch') for (const check of gates.checks) push(check.label, check.pass ? 'PASS' : 'ACTION NEEDED', check.detail);
    return { vehicleId: v.id, vehicleName: v.name, kind, title: STUDIES[kind].name, captured: date(s), completedDay: day(s), observations, benchmark: ['competition', 'pricing', 'customers'].includes(kind) ? b : null, readiness: kind === 'launch' ? { score: gates.score, passed: gates.passed } : null };
  }
  function positioningFor(s, v, strategy) { const copy = { ...v, commercial: { ...v.commercial, strategy } }; return positioning(s, copy); }
  function processProjectsDay(s, hooks = {}) {
    const e = ensure(s), now = day(s); if (e.lastProjectDay >= now) return { development: 0, capital: 0, duplicate: true }; e.lastProjectDay = now; let development = 0, slots = 0;
    for (const p of e.jobs.filter(p => p.status === 'active')) { const t = target(s, p.type, p.targetId); if (!t || p.type === 'sales' && (!t.unlocked || n(t.dealers) < 1)) { p.phase = 'TARGET UNAVAILABLE'; p.delayedDays++; continue; } if (slots >= e.policy.studySlots) { p.phase = 'QUEUED'; p.delayedDays++; continue; } slots++;
      const remaining = Math.max(0, p.budget - p.spent), spend = p.daysRemaining <= 1 ? remaining : Math.min(remaining, p.budget / Math.max(1, p.totalDays)); if (n(s.cash) - reserve(s, 'project') < spend) { p.phase = 'WAITING FOR FUNDING'; p.delayedDays++; continue; }
      s.cash -= spend; development += spend; s.mtdDevelopmentSpend = n(s.mtdDevelopmentSpend) + spend; p.spent += spend; p.daysRemaining = Math.max(0, p.daysRemaining - 1); p.phase = p.daysRemaining > p.totalDays * .35 ? 'FIELDWORK AND TRAINING' : 'RESULT REVIEW';
      if (!p.daysRemaining) { p.status = 'complete'; p.phase = 'COMPLETE'; p.closed = date(s); if (p.type === 'study') { const report = makeResearch(s, t, p.kind); report.id = 'commercial_report_' + e.nextId++; report.jobId = p.id; report.cost = p.spent; e.research.push(report); } else t.salesSupport.levels[p.kind] = 1; record(s, p.name + ' completed', 'Actual funded development expense ' + Math.round(p.spent) + '.', hooks); }
    }
    e.jobs = e.jobs.filter(p => ['active', 'paused'].includes(p.status)).concat(e.jobs.filter(p => !['active', 'paused'].includes(p.status)).slice(-80)); e.research = e.research.slice(-80); return { development, capital: 0, duplicate: false };
  }
  function setStudySlots(s, slots) { ensure(s).policy.studySlots = Math.round(clamp(slots, 1, 3)); return { ok: true }; }
  function createPlan(s, values, hooks = {}) {
    const e = ensure(s), v = vehicles(s).find(v => String(v.id) === String(values.vehicleId)), r = (s.marketSystem?.regions || []).find(r => r.id === values.regionId); if (!v || !r) return failure('Select a product and a reference market.');
    if (e.plans.some(p => p.vehicleId === v.id && p.status === 'planned')) return failure('This product already has an open launch plan.');
    const p = { id: 'commercial_plan_' + e.nextId++, vehicleId: v.id, vehicleName: v.name, regionId: r.id, created: date(s), targetPeriod: period(s) + Math.round(clamp(values.months, 1, 24)), volumeGoal: Math.round(clamp(values.volume, 10, 100000)), status: 'planned' }; e.plans.push(p); record(s, v.name + ' launch plan saved', 'Target date ' + Math.floor(p.targetPeriod / 12) + '/' + (p.targetPeriod % 12 + 1) + '; monthly retail goal ' + p.volumeGoal + '.', hooks); return { ok: true, plan: p };
  }
  function planAction(s, planId, action, values = {}, hooks = {}) {
    const p = ensure(s).plans.find(p => p.id === planId); if (!p || p.status !== 'planned') return failure('This launch plan has closed.');
    if (action === 'reschedule') { p.targetPeriod = period(s) + Math.round(clamp(values.months, 1, 24)); p.overdueLogged = false; } else if (action === 'archive') { p.status = 'archived'; p.closed = date(s); } else return failure('Unknown plan action.'); record(s, p.vehicleName + ' launch plan ' + action, 'Planning does not spend cash or release a vehicle automatically.', hooks); return { ok: true };
  }
  function applyLaunchSupply(s, planId, hooks = {}) {
    const p = ensure(s).plans.find(p => p.id === planId && p.status === 'planned'), v = p && vehicles(s).find(v => v.id === p.vehicleId); if (!v || v.productionStatus !== 'production') return failure('Release this vehicle before applying a supply policy.');
    const forecast = Math.max(1, n(v.commercialForecast, n(v.lastMonthDemand, p.volumeGoal))); return G.MDXIndustry?.setPlan?.(s, v.id, { cover: clamp(p.volumeGoal / forecast, .3, 3), response: .65, reaction: .58, ceiling: 1, bias: 0, seasonal: false }, hooks) || failure('Supply planning is unavailable.');
  }
  function setAppearance(s, vehicleId, palette, wheel, hooks = {}) {
    ensure(s); const v = vehicles(s).find(v => String(v.id) === String(vehicleId)); if (!v) return failure('Choose a product first.'); if (palette !== 'original' && !PALETTES[palette]) return failure('Unknown presentation palette.'); if (wheel && (!WHEELS[wheel] || s.year < WHEELS[wheel].year)) return failure('That wheel presentation is not available in this era.');
    v.design = obj(v.design); const a = v.commercial.appearance; if (!a.captured) { a.basePaint = v.design.paintColor ?? null; a.baseWheel = v.design.presentationWheel ?? null; a.captured = true; }
    if (palette === 'original') { if (a.basePaint === null) delete v.design.paintColor; else v.design.paintColor = a.basePaint; if (a.baseWheel === null) delete v.design.presentationWheel; else v.design.presentationWheel = a.baseWheel; a.palette = 'original'; a.wheel = ''; }
    else { a.palette = palette; v.design.paintColor = PALETTES[palette].color; if (wheel) { a.wheel = wheel; v.design.presentationWheel = wheel; } }
    record(s, v.name + ' presentation updated', 'Cosmetic showroom paint and wheel finish; specification and manufacturing economics are unchanged.', hooks); return { ok: true };
  }
  function pin(s, vehicleId) { const e = ensure(s); if (vehicleId && !vehicles(s).some(v => String(v.id) === String(vehicleId))) return failure('Choose an existing product.'); e.ui.pinnedVehicleId = vehicleId || ''; return { ok: true }; }
  function dossier(s, v) {
    const engine = (s.engines || []).find(e => String(e.id) === String(v.engineId || v.design?.engineId)), rows = operationsReport(s, v), readinessReport = readiness(s, v);
    return { id: v.id, name: v.name, year: n(v.modelYear, n(v.createdYear, n(v.year, s.year))), generation: Math.max(1, n(v.generation, 1)), body: v.design?.body || v.body || 'sedan', segment: v.stats?.className || v.target || 'Other', engine: engine?.name || (readinessReport.checks.find(x => x.id === 'powertrain')?.detail.startsWith('Electric') ? 'Electric propulsion' : 'Referenced powertrain'), msrp: positive(v.msrp), stats: { ...(v.stats || {}) }, positioning: positioning(s, v), readiness: readinessReport, operations: rows, appearance: v.commercial.appearance };
  }
  function agenda(s) {
    ensure(s); const tasks = [], add = (severity, title, detail, view, tab) => tasks.push({ severity, title, detail, view, tab });
    for (const v of selling(s)) { const r = operationsReport(s, v); if (n(r.daysSupply) > 90) add(3, v.name + ': excess pipeline stock', Math.round(r.daysSupply) + ' days of supply. Review stock before adding builds.', 'library', 'planning'); if (n(r.shortage) > 100) add(2, v.name + ': unmet demand', Math.round(r.shortage) + ' estimated unserved monthly shoppers.', 'library', 'factories'); if (n(v.stats?.reliability ?? v.stats?.rel, 70) < 60) add(3, v.name + ': reliability exposure', 'Review existing quality, tests and dealer service support.', 'library', 'quality'); }
    const waiting = ensure(s).jobs.filter(j => j.status === 'active' && j.phase === 'WAITING FOR FUNDING'); if (waiting.length) add(3, waiting.length + ' commercial programs await funding', 'Protected reserves have stopped discretionary study or sales training work.', 'library', 'testing');
    for (const p of s.commercialExpansion.plans.filter(p => p.status === 'planned' && p.targetPeriod <= period(s))) add(2, p.vehicleName + ': launch target reached', readiness(s, vehicles(s).find(v => v.id === p.vehicleId) || { id: p.vehicleId, name: p.vehicleName, stats: {} }, p.regionId).passed + '/8 launch gates passed.', 'library', 'planning');
    if (n(s.cash) > 0 && n(s.dailyFixedCost) * 60 > n(s.cash)) add(4, 'Less than two months of fixed-cost cash', 'Review optional spending, project commitments and working capital.', 'budget'); return tasks.sort((a, b) => b.severity - a.severity).slice(0, 8);
  }
  function summary(s) { const e = ensure(s), jobs = e.jobs.filter(x => ['active', 'paused'].includes(x.status)), positioningCost = selling(s).reduce((a, v) => a + positioning(s, v).monthlyCost, 0), salesCost = (s.marketSystem?.regions || []).filter(r => r.unlocked && n(r.dealers) > 0).reduce((a, r) => a + salesProfile(s, r).monthlyCost, 0); return { commitments: jobs.reduce((a, p) => a + Math.max(0, p.budget - p.spent), 0), studyDaily: jobs.filter(x => x.status === 'active').slice(0, e.policy.studySlots).reduce((a, p) => a + p.budget / p.totalDays, 0), reports: e.research.length, plannedLaunches: e.plans.filter(p => p.status === 'planned').length, positioningCost, salesCost, lastDailySpend: e.lastDailySpend, mtdSpend: e.mtdSpend, lastMonthSpend: n(e.monthly.at(-1)?.spend) }; }
  function processMonth(s, hooks = {}) {
    const e = ensure(s), now = period(s); if (e.lastClosePeriod >= now) return { duplicate: true }; e.lastClosePeriod = now;
    e.monthly.push({ period: now, ...date(s), spend: e.mtdSpend, studyCommitments: summary(s).commitments, researchReports: e.research.length, supportedProducts: selling(s).filter(v => v.commercial.strategy !== 'neutral').length, trainedSalesRegions: (s.marketSystem?.regions || []).filter(r => salesProfile(s, r).installed > 0).length }); e.monthly = e.monthly.slice(-120); e.mtdSpend = 0;
    if (s.lastMonthSummary) s.lastMonthSummary.commercialOperatingSpend = e.monthly.at(-1).spend;
    for (const p of e.plans.filter(p => p.status === 'planned' && p.targetPeriod <= now)) { const v = vehicles(s).find(v => v.id === p.vehicleId); if (v && n(v.lastMonthSales) >= p.volumeGoal) { p.status = 'achieved'; p.closed = date(s); p.actualSales = v.lastMonthSales; record(s, p.vehicleName + ' launch volume achieved', p.actualSales + ' actual retail sales against a ' + p.volumeGoal + ' monthly goal.', hooks); } else if (!p.overdueLogged) { p.overdueLogged = true; record(s, p.vehicleName + ' launch plan needs review', 'The target month arrived; actual retail volume remains below the planned goal.', hooks); } }
    e.plans = e.plans.filter(p => p.status === 'planned').concat(e.plans.filter(p => p.status !== 'planned').slice(-40)); return { duplicate: false };
  }
  G.MDXCommercial = { VERSION: 1, STUDIES, STRATEGIES, SALES_PROGRAMS, PALETTES, WHEELS, BENCH_FIELDS, ensure, vehicles, selling, quote, startJob, jobAction, setStudySlots, benchmark, positioning, positioningFor, setPositioning, salesProfile, setSalesBudget, demandMultiplier, regionMultiplier, warrantyFactor, processOperatingDay, recordSalesDay, processProjectsDay, readiness, createPlan, planAction, applyLaunchSupply, setAppearance, pin, dossier, agenda, summary, processMonth, period, day, moneyEra };
})();
