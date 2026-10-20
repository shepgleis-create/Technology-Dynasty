(() => {
  'use strict';
  const G = typeof window === 'undefined' ? globalThis : window;
  const n = (v, d = 0) => v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, n(v)));
  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const period = s => n(s.year, 1940) * 12 + n(s.month);
  const day = s => period(s) * 30 + n(s.day, 1);
  const date = s => ({ year: s.year, month: s.month, day: s.day });
  const plants = s => (s.operations?.factories || []).filter(f => f.status === 'operating' && n(f.constructionDays) <= 0);
  const models = s => (s.vehicles || []).filter(v => v.active !== false && v.productionStatus === 'production');
  const failure = reason => ({ ok: false, reason });
  const economic = (s, value, category = 'construction') => Math.max(0, Math.round(value * (G.MDX_CORE?.economicIndex?.(category, n(s.year, 1940)) || Math.pow(1.03, n(s.year, 1940) - 1970))));
  const PROGRAMS = {
    fixtures: { name: 'Precision assembly fixtures', year: 1940, cost: 145000, days: 45, category: 'capital', description: 'Better alignment reduces process defects and manufacturing waste.', effects: { yield: .004, cost: .007 } },
    lean: { name: 'Lean plant layout', year: 1940, cost: 185000, days: 60, category: 'capital', description: 'Shorter material paths raise line throughput and reduce unit cost.', effects: { capacity: .035, cost: .009 } },
    crossTraining: { name: 'Cross-training school', year: 1940, cost: 65000, days: 45, category: 'development', description: 'Train workers for multiple stations, reducing fatigue and increasing process consistency.', effects: { fatigue: .045, yield: .002, skill: .006 } },
    apprenticeship: { name: 'Skilled trades apprenticeship', year: 1940, cost: 95000, days: 90, category: 'development', description: 'A longer training program improves plant skill and rework recovery.', effects: { skill: .012, recovery: .02 } },
    energy: { name: 'Heat and energy recovery', year: 1940, cost: 225000, days: 75, category: 'capital', description: 'Recover process energy and reduce the energy portion of manufacturing cost.', effects: { cost: .009, energy: .08 } },
    paint: { name: 'Paint material recovery', year: 1940, cost: 155000, days: 60, category: 'capital', description: 'Recover paint and improve finishing repeatability.', effects: { cost: .006, yield: .003, energy: .025 } },
    quickTooling: { name: 'Quick-change tooling', year: 1940, cost: 205000, days: 60, category: 'capital', description: 'Raise output during real tooling changeovers and support a flexible model mix.', effects: { changeover: .15, capacity: .015 } },
    metrology: { name: 'Metrology and inspection lab', year: 1940, cost: 125000, days: 45, category: 'capital', description: 'Catch manufacturing defects before vehicles reach customers.', effects: { inspection: .035, recovery: .015 } },
    safety: { name: 'Ergonomic workstation program', year: 1940, cost: 85000, days: 45, category: 'development', description: 'Safer, better organized stations reduce sustained fatigue.', effects: { fatigue: .06, yield: .001 } },
    kitting: { name: 'Sequenced parts kitting', year: 1940, cost: 110000, days: 40, category: 'capital', description: 'Prepare components in assembly order to improve throughput.', effects: { capacity: .025, cost: .005 } },
    maintenance: { name: 'Equipment reliability program', year: 1940, cost: 175000, days: 60, category: 'capital', description: 'Maintenance procedures reduce condition loss and maintenance backlog over time.', effects: { condition: .007, backlog: .025 } },
    statistical: { name: 'Statistical process control', year: 1950, cost: 135000, days: 60, category: 'development', description: 'Use measured process variation to raise first-pass yield.', effects: { yield: .005, cost: .004 } },
    flexible: { name: 'Flexible assembly cells', year: 1960, cost: 320000, days: 90, category: 'capital', description: 'Flexible cells raise throughput and ease model changeovers.', effects: { capacity: .035, changeover: .10 } },
    traceability: { name: 'Component traceability', year: 1970, cost: 190000, days: 65, category: 'capital', description: 'Track incoming parts and improve defect containment and warranty cost.', effects: { inspection: .035, warranty: .025 } },
    scheduling: { name: 'Computerized shop scheduling', year: 1980, cost: 285000, days: 75, category: 'capital', description: 'Coordinate work stations and material deliveries for more consistent output.', effects: { capacity: .025, cost: .007 } },
    robotics: { name: 'Robot calibration cell', year: 1985, cost: 420000, days: 90, category: 'capital', description: 'Era-appropriate robot calibration improves repeatability and capacity.', effects: { capacity: .025, yield: .004 } }
  };
  const CAMPAIGNS = {
    roadshow: { name: 'Regional roadshow', year: 1940, cost: 45000, days: 30, lift: .035, description: 'Let customers experience the car. A modest general demand lift.' },
    print: { name: 'Magazine and newspaper launch', year: 1940, cost: 65000, days: 45, lift: .05, description: 'A longer launch campaign in the automotive press.' },
    radio: { name: 'Radio advertising', year: 1940, cost: 85000, days: 60, lift: .06, description: 'Reach a wider audience with a sustained radio campaign.' },
    television: { name: 'Television launch', year: 1950, cost: 185000, days: 60, lift: .085, description: 'A larger campaign available in the television era.' },
    durability: { name: 'Durability demonstration tour', year: 1940, cost: 55000, days: 45, lift: .055, minReliability: 75, description: 'Demonstrate an already reliable car; requires reliability of at least 75.' },
    fleetDemo: { name: 'Commercial buyer demonstrations', year: 1940, cost: 45000, days: 30, lift: .05, segments: ['Utility', 'Off-Road', 'Family', 'Mainstream'], description: 'Target practical products at commercial and family buyers.' },
    dealerTraining: { name: 'Dealer product training', year: 1940, cost: 40000, days: 45, lift: .035, description: 'Teach the network the product. Requires an open selling region.' },
    exportShow: { name: 'International motor show', year: 1940, cost: 125000, days: 45, lift: .075, minRegions: 2, description: 'Support an international launch after entering two regions.' }
  };
  const SERVICE_PROGRAMS = {
    mechanics: { name: 'Dealer mechanic academy', year: 1940, cost: 75000, days: 60, category: 'development', score: 7, warranty: .02, description: 'Train dealer technicians on the company’s cars.' },
    parts: { name: 'Regional parts depot', year: 1940, cost: 245000, days: 90, category: 'capital', score: 9, warranty: .015, description: 'Improve parts availability in an active selling region.' },
    roadside: { name: 'Roadside support network', year: 1950, cost: 115000, days: 60, category: 'development', score: 6, warranty: 0, description: 'Organize regional assistance for owners.' },
    warranty: { name: 'Warranty diagnosis training', year: 1940, cost: 65000, days: 45, category: 'development', score: 4, warranty: .025, description: 'Improve diagnosis and reduce avoidable warranty work.' },
    hotline: { name: 'Technical support hotline', year: 1960, cost: 95000, days: 45, category: 'capital', score: 5, warranty: .015, description: 'Give dealers a regional technical support channel.' },
    diagnostics: { name: 'Electronic diagnostic equipment', year: 1975, cost: 190000, days: 75, category: 'capital', score: 7, warranty: .025, description: 'Equip service centers for increasingly electronic cars.' },
    ev: { name: 'High-voltage service readiness', year: 2010, cost: 285000, days: 90, category: 'development', score: 7, warranty: .02, description: 'Train service staff for electrified powertrains.' }
  };
  const PRESETS = {
    cash: { name: 'Protect working cash', cover: .6, response: .4, reaction: .4, ceiling: .8, bias: -.05, seasonal: false },
    balanced: { name: 'Balanced supply', cover: 1.15, response: .65, reaction: .58, ceiling: 1, bias: 0, seasonal: false },
    growth: { name: 'Build for growth', cover: 1.8, response: .85, reaction: .75, ceiling: 1, bias: .08, seasonal: true }
  };
  function ensure(s) {
    if (!s || typeof s !== 'object') return null;
    const e = s.industrialEra = obj(s.industrialEra); e.version = 1;
    for (const k of ['projects', 'campaigns', 'history', 'snapshots', 'milestones']) if (!Array.isArray(e[k])) e[k] = [];
    e.nextId = Math.max(1, Math.floor(n(e.nextId, 1)));
    for (const k of ['lastProjectDay', 'lastOperatingDay', 'lastClosePeriod']) e[k] = n(e[k], -1);
    e.policy = obj(e.policy); e.policy.projectSlots = Math.round(clamp(n(e.policy.projectSlots, 2), 1, 4));
    e.policy.reserve = Math.max(0, n(e.policy.reserve)); e.policy.autoMaintenance = !!e.policy.autoMaintenance;
    e.policy.maintenanceTrigger = clamp(n(e.policy.maintenanceTrigger, 45), 10, 80);
    e.lastOperatingSpend = Math.max(0, n(e.lastOperatingSpend)); e.mtdOperatingSpend = Math.max(0, n(e.mtdOperatingSpend));
    e.totalBuilt = Math.max(0, n(e.totalBuilt)); e.profitStreak = Math.max(0, Math.floor(n(e.profitStreak)));
    for (const f of s.operations?.factories || []) {
      const a = f.industrial = obj(f.industrial); a.levels = obj(a.levels); a.policy = obj(a.policy);
      a.policy.inspection = Math.round(clamp(n(a.policy.inspection, 1), 0, 3));
      a.policy.reserveCapacity = clamp(n(a.policy.reserveCapacity), 0, .25);
      a.policy.fatigueLimit = clamp(n(a.policy.fatigueLimit, 80), 30, 100);
      a.policy.crewRotation = !!a.policy.crewRotation;
      for (const id of Object.keys(PROGRAMS)) a.levels[id] = Math.round(clamp(n(a.levels[id]), 0, 2));
    }
    for (const v of s.vehicles || []) normalizePlan(s, v);
    for (const r of s.marketSystem?.regions || []) {
      const a = r.aftercare = obj(r.aftercare); a.levels = obj(a.levels);
      for (const id of Object.keys(SERVICE_PROGRAMS)) a.levels[id] = Math.round(clamp(n(a.levels[id]), 0, 1));
      a.budgetPerDealer = clamp(n(a.budgetPerDealer), 0, 500); a.responseDays = clamp(n(a.responseDays, 7), 2, 30);
      a.lastDailySpend = Math.max(0, n(a.lastDailySpend)); a.lifetimeSpend = Math.max(0, n(a.lifetimeSpend));
    }
    return e;
  }
  function normalizePlan(s, v) {
    const p = v.supplyPlan = obj(v.supplyPlan);
    p.enabled = !!p.enabled;
    p.cover = clamp(n(p.cover, s.difficulty === 'casual' ? 1.55 : s.difficulty === 'realistic' ? .85 : 1.15), .3, 3);
    p.response = clamp(n(p.response, .65), 0, 1); p.reaction = clamp(n(p.reaction, s.difficulty === 'casual' ? .82 : s.difficulty === 'realistic' ? .38 : .58), .15, .9);
    p.ceiling = clamp(n(p.ceiling, 1), .25, 1); p.bias = clamp(n(p.bias), -.25, .25); p.seasonal = !!p.seasonal;
    return p;
  }
  function id(s, prefix) { return 'industrial_' + prefix + '_' + ensure(s).nextId++; }
  function record(s, title, detail, meta = {}, hooks = {}) {
    const e = ensure(s), row = { id: id(s, 'event'), ...date(s), title, detail, ...meta };
    e.history.unshift(row); e.history.length = Math.min(e.history.length, 100); hooks.log?.(title + ': ' + detail); return row;
  }
  function entity(s, type, targetId) {
    const rows = type === 'factory' ? s.operations?.factories : s.marketSystem?.regions;
    return (rows || []).find(x => String(x.id) === String(targetId));
  }
  function quote(s, type, targetId, programId) {
    ensure(s); const target = entity(s, type, targetId), def = (type === 'factory' ? PROGRAMS : SERVICE_PROGRAMS)[programId];
    if (!target || !def || !['factory', 'service'].includes(type)) return null;
    const level = n(type === 'factory' ? target.industrial.levels[programId] : target.aftercare.levels[programId]);
    const scale = type === 'factory' ? clamp(Math.sqrt(n(target.workers, 320) / 320), .75, 2.5) * (1 + level * .45) : clamp(Math.sqrt(Math.max(1, n(target.dealers)) / 6), .75, 2.5);
    const cost = economic(s, def.cost * scale, def.category === 'development' ? 'research' : 'construction');
    const days = Math.ceil(def.days * (1 + level * .2));
    const active = ensure(s).projects.find(p => p.type === type && String(p.targetId) === String(targetId) && p.programId === programId && ['active', 'paused'].includes(p.status));
    const max = type === 'factory' ? 2 : 1;
    let reason = n(s.year) < def.year ? 'Available from ' + def.year + '.' : level >= max ? 'Program already fully installed.' : active ? 'This program is already underway.' : type === 'factory' && !plants(s).includes(target) ? 'The plant must be operating.' : type === 'service' && (!target.unlocked || n(target.dealers) < 1) ? 'Open a dealer network in this region first.' : '';
    const reserve = Math.max(n(s.budgetSystem?.protectProjects ? s.budgetSystem.reserveFloor : 0), ensure(s).policy.reserve);
    if (!reason && n(s.cash) - reserve < cost / days) reason = 'Available cash must cover one day of work above the protected reserve.';
    return { type, targetId, programId, name: def.name, cost, days, daily: cost / days, level, max, available: !reason, reason, category: def.category, effects: def.effects || {}, description: def.description, year: def.year };
  }
  function startProject(s, type, targetId, programId, hooks = {}) {
    const q = quote(s, type, targetId, programId); if (!q || !q.available) return failure(q?.reason || 'Choose a valid program and operating target.');
    const e = ensure(s), project = { id: id(s, 'program'), type, targetId, programId, name: q.name, status: 'active', phase: 'AUTHORIZED', budget: q.cost, spent: 0, totalDays: q.days, daysRemaining: q.days, category: q.category, targetLevel: q.level + 1, authorized: date(s), startedDay: day(s), delayedDays: 0 };
    e.projects.push(project); record(s, q.name + ' authorized', 'Funding is spent as work is performed; ' + q.days + ' working days planned.', { projectId: project.id }, hooks);
    return { ok: true, project };
  }
  function projectAction(s, projectId, action, hooks = {}) {
    const e = ensure(s), p = e.projects.find(x => x.id === projectId); if (!p || !['active', 'paused'].includes(p.status)) return failure('This program is no longer active.');
    if (['moveUp', 'moveDown'].includes(action)) {
      const open = e.projects.filter(x => ['active', 'paused'].includes(x.status)), i = open.indexOf(p), other = open[i + (action === 'moveUp' ? -1 : 1)];
      if (!other) return failure('This program is already at the end of the queue.');
      const a = e.projects.indexOf(p), b = e.projects.indexOf(other); [e.projects[a], e.projects[b]] = [e.projects[b], e.projects[a]];
      record(s, p.name + ' priority changed', 'Program moved ' + (action === 'moveUp' ? 'earlier' : 'later') + ' in the funding queue; budget and completed work are preserved.', { projectId }, hooks); return { ok: true };
    }
    if (action === 'pause') { p.status = 'paused'; p.phase = 'PAUSED BY MANAGEMENT'; }
    else if (action === 'resume') { p.status = 'active'; p.phase = 'RESUMING'; }
    else if (action === 'cancel') { p.status = 'cancelled'; p.phase = 'CANCELLED'; p.closed = date(s); }
    else return failure('Unknown program action.');
    record(s, p.name + ' ' + ({ pause: 'paused', resume: 'resumed', cancel: 'cancelled' }[action]), 'Actual spend remains recorded. Remaining work has not been charged.', { projectId }, hooks); return { ok: true };
  }
  function factoryEffects(s, f) {
    if (!f) return { capacity: 1, cost: 1, yield: 0, inspection: 0, recovery: 0, changeover: 0, fatigue: 0, skill: 0, condition: 0, backlog: 0, warranty: 1, energy: 1 };
    if (!f.industrial) ensure(s);
    const raw = {}; for (const [key, def] of Object.entries(PROGRAMS)) for (const [k, v] of Object.entries(def.effects)) raw[k] = n(raw[k]) + v * n(f.industrial.levels[key]);
    const p = f.industrial.policy, inspectionDelta = (p.inspection - 1) * .035;
    const commissioning = ensure(s).projects.some(x => x.type === 'factory' && String(x.targetId) === String(f.id) && x.status === 'active' && x.category === 'capital' && x.phase === 'COMMISSIONING') ? .96 : 1;
    return { capacity: clamp((1 + n(raw.capacity)) * (1 - p.reserveCapacity) * (1 - Math.max(0, p.inspection - 1) * .015) * commissioning, .65, 1.3), cost: clamp(1 - n(raw.cost) + Math.max(0, p.inspection - 1) * .004, .88, 1.02), yield: clamp(n(raw.yield), 0, .025), inspection: clamp(n(raw.inspection) + inspectionDelta, -.04, .15), recovery: clamp(n(raw.recovery), 0, .10), changeover: clamp(n(raw.changeover), 0, .6), fatigue: n(raw.fatigue) + (p.crewRotation ? .07 : 0), skill: clamp(n(raw.skill), 0, .045), condition: n(raw.condition), backlog: n(raw.backlog), warranty: clamp(1 - n(raw.warranty), .9, 1), energy: clamp(1 - n(raw.energy), .65, 1) };
  }
  function productionCostFactor(s, v) {
    const mix = G.MDX?.factoryProductionMix?.(s, v.id) || []; return mix.length ? mix.reduce((a, x) => a + factoryEffects(s, x.factory).cost * x.weight, 0) : 1;
  }
  function qualityProfile(s, v, profile) {
    const mix = profile.mix || []; if (!mix.length) return profile;
    const weighted = key => mix.reduce((a, x) => a + factoryEffects(s, x.factory)[key] * x.weight, 0);
    return { ...profile, firstPassYield: clamp(profile.firstPassYield + weighted('yield'), .8, .998), inspectionCatch: clamp(profile.inspectionCatch + weighted('inspection'), .44, .985), reworkRecovery: clamp(profile.reworkRecovery + weighted('recovery'), .58, .985) };
  }
  function setFactoryPolicy(s, targetId, values) {
    ensure(s); const f = entity(s, 'factory', targetId); if (!f) return failure('Factory not found.');
    const p = f.industrial.policy;
    if (values.inspection != null) p.inspection = Math.round(clamp(values.inspection, 0, 3));
    if (values.reserveCapacity != null) p.reserveCapacity = clamp(values.reserveCapacity, 0, .25);
    if (values.fatigueLimit != null) p.fatigueLimit = clamp(values.fatigueLimit, 30, 100);
    if (values.crewRotation != null) p.crewRotation = !!values.crewRotation;
    return { ok: true, policy: p };
  }
  function setCompanyPolicy(s, values) {
    const p = ensure(s).policy;
    if (values.projectSlots != null) p.projectSlots = Math.round(clamp(values.projectSlots, 1, 4));
    if (values.reserve != null) p.reserve = Math.max(0, n(values.reserve));
    if (values.autoMaintenance != null) p.autoMaintenance = !!values.autoMaintenance;
    if (values.maintenanceTrigger != null) p.maintenanceTrigger = clamp(values.maintenanceTrigger, 10, 80);
    return { ok: true, policy: p };
  }
  function setPlan(s, vehicleId, values, hooks = {}) {
    const v = (s.vehicles || []).find(x => String(x.id) === String(vehicleId)); if (!v) return failure('Vehicle not found.');
    const p = normalizePlan(s, v), preset = PRESETS[values.preset];
    const next = preset || values;
    for (const k of ['cover', 'response', 'reaction', 'ceiling', 'bias']) if (next[k] != null) p[k] = n(next[k], p[k]);
    if (next.seasonal != null) p.seasonal = !!next.seasonal;
    p.enabled = values.enabled !== false; normalizePlan(s, v);
    record(s, v.name + ' supply policy updated', p.enabled ? 'Target stock cover ' + p.cover.toFixed(2) + ' months; production ceiling ' + Math.round(p.ceiling * 100) + '% of available capacity.' : 'Original demand-based production policy restored.', { vehicleId: v.id }, hooks);
    return { ok: true, plan: p };
  }
  function seasonFactor(s, v) {
    if (!normalizePlan(s, v).seasonal) return 1;
    const m = Math.round(clamp(s.month, 0, 11)), body = v.design?.body || v.body || 'sedan';
    const seasonal = ['convertible', 'coupe'].includes(body) ? [.87, .89, 1.04, 1.13, 1.16, 1.15, 1.09, 1.02, .97, .94, .89, .85] : ['suv', 'truck', 'van'].includes(body) ? [1.05, 1.02, .98, .95, .96, .98, 1, 1.02, 1.04, 1.04, 1, .96] : [.94, .94, 1.02, 1.04, 1.05, 1.02, 1, 1.02, 1.05, 1.04, .98, .9];
    return seasonal[m];
  }
  function supplyTarget(s, v, data) {
    const p = normalizePlan(s, v); if (!p.enabled) return null;
    const capacity = Math.max(0, n(data.capacity)) * p.ceiling, forecast = Math.max(0, n(data.forecast)) * (1 + p.bias) * seasonFactor(s, v), pipeline = Math.max(0, n(data.pipeline)), wait = Math.max(0, n(data.wait)), targetStock = forecast * p.cover;
    const raw = Math.max(0, forecast + wait * p.response + targetStock - pipeline), prior = n(v.autoProductionTarget, raw), smoothed = prior * (1 - p.reaction) + raw * p.reaction;
    const overflow = pipeline > targetStock + forecast * 1.25;
    const target = overflow ? Math.max(0, forecast - (pipeline - targetStock) * .75) : Math.max(pipeline < forecast * .28 ? Math.min(capacity, forecast * .72) : 0, smoothed);
    const units = Math.min(Math.floor(capacity), Math.max(0, Math.round(clamp(target, 0, capacity) / 10) * 10));
    v.supplyPlan.lastEstimate = { forecast, pipeline, targetStock, capacity, units, stockBrake: overflow, period: period(s), day: s.day };
    v.targetInventory = Math.round(targetStock); v.commercialForecast = Math.round(forecast); return units;
  }
  function campaignQuote(s, vehicleId, type) {
    ensure(s); const v = models(s).find(x => String(x.id) === String(vehicleId)), def = CAMPAIGNS[type]; if (!v || !def) return null;
    const regions = (s.marketSystem?.regions || []).filter(r => r.unlocked && n(r.dealers) > 0).length;
    let reason = n(s.year) < def.year ? 'Available from ' + def.year + '.' : regions < n(def.minRegions, 1) ? 'This campaign requires ' + n(def.minRegions, 1) + ' active selling regions.' : n(v.stats?.reliability) < n(def.minReliability) ? 'Requires reliability of ' + def.minReliability + ' or better.' : def.segments && !def.segments.includes(v.stats?.className || v.target) ? 'Choose a practical family or commercial model.' : '';
    if (!reason && ensure(s).campaigns.some(c => String(c.vehicleId) === String(vehicleId) && c.status === 'active')) reason = 'This model already has an active campaign.';
    const cost = economic(s, def.cost, 'marketing'); if (!reason && n(s.cash) - ensure(s).policy.reserve < cost / def.days) reason = 'Insufficient cash above your protected reserve.';
    return { ...def, type, vehicleId, cost, daily: cost / def.days, available: !reason, reason };
  }
  function startCampaign(s, vehicleId, type, hooks = {}) {
    const q = campaignQuote(s, vehicleId, type); if (!q?.available) return failure(q?.reason || 'Release a car and open its selling network first.');
    const c = { id: id(s, 'campaign'), vehicleId, type, name: q.name, budget: q.cost, spent: 0, totalDays: q.days, daysRemaining: q.days, status: 'active', lift: q.lift, fundedDay: -1, started: date(s), baselineSales: n((s.vehicles || []).find(v => String(v.id) === String(vehicleId))?.lastMonthSales), observedSales: 0 };
    ensure(s).campaigns.push(c); record(s, q.name + ' approved', 'Demand support applies only on funded days; ' + q.days + ' working days budgeted.', { campaignId: c.id }, hooks); return { ok: true, campaign: c };
  }
  function cancelCampaign(s, campaignId, hooks = {}) {
    const c = ensure(s).campaigns.find(x => x.id === campaignId && x.status === 'active'); if (!c) return failure('Campaign is no longer running.');
    c.status = 'cancelled'; c.fundedDay = -1; record(s, c.name + ' cancelled', 'Future spending stopped; past costs remain recorded.', { campaignId }, hooks); return { ok: true };
  }
  function campaignMultiplier(s, v) {
    const rows = s.industrialEra?.campaigns || []; const lift = rows.filter(c => String(c.vehicleId) === String(v.id) && n(c.fundedDay, -1) === day(s) && ['active', 'complete'].includes(c.status)).reduce((a, c) => a + n(c.lift), 0);
    return 1 + Math.min(.10, lift);
  }
  function setAftercare(s, regionId, values) {
    ensure(s); const r = entity(s, 'service', regionId); if (!r?.unlocked || n(r.dealers) < 1) return failure('Open dealers in this region first.');
    if (values.budgetPerDealer != null) r.aftercare.budgetPerDealer = clamp(values.budgetPerDealer, 0, 500);
    if (values.responseDays != null) r.aftercare.responseDays = clamp(values.responseDays, 2, 30);
    return { ok: true, settings: r.aftercare };
  }
  function serviceProfile(s, r) {
    if (!r?.aftercare) ensure(s); const a = r?.aftercare || { levels: {} }, levelScore = Object.entries(SERVICE_PROGRAMS).reduce((sum, [key, p]) => sum + p.score * n(a.levels[key]), 0), staff = clamp(n(a.budgetPerDealer) / 500, 0, 1), response = n(a.responseDays, 7), responseSupport = Math.min(staff, (30 - response) / 28);
    const funded = n(a.fundedDay, -1) === day(s), score = clamp(40 + levelScore + (funded ? staff * 16 + responseSupport * 4 : 0), 0, 100);
    const saving = Object.entries(SERVICE_PROGRAMS).reduce((sum, [key, p]) => sum + p.warranty * n(a.levels[key]), 0);
    return { score, programs: Object.values(a.levels).reduce((x, y) => x + n(y), 0), warranty: clamp(1 - saving * (funded ? 1 : .45), .85, 1), demand: 1 + Math.min(.045, levelScore / 1800 + (funded ? staff * .016 : 0)), monthlyCost: economic(s, n(a.budgetPerDealer) * Math.max(0, n(r.dealers)) * (1 + Math.max(0, 7 - response) * .05), 'wages'), funded, response };
  }
  function warrantyFactor(s, v) {
    const mix = G.MDX?.factoryProductionMix?.(s, v.id) || [], plant = mix.length ? mix.reduce((a, x) => a + factoryEffects(s, x.factory).warranty * x.weight, 0) : 1;
    const regions = (s.marketSystem?.regions || []).filter(r => r.unlocked && n(r.dealers) > 0), total = regions.reduce((a, r) => a + n(r.dealers), 0);
    const service = total ? regions.reduce((a, r) => a + serviceProfile(s, r).warranty * n(r.dealers) / total, 0) : 1;
    return clamp(plant * service, .8, 1);
  }
  function processOperatingDay(s, hooks = {}) {
    const e = ensure(s), now = day(s); if (e.lastOperatingDay >= now) return 0; e.lastOperatingDay = now;
    const reserve = Math.max(e.policy.reserve, n(s.budgetSystem?.protectOperations ? s.budgetSystem.reserveFloor : 0)), availableCash = n(s.cash) - Math.max(0, n(hooks.unavoidableDaily)); let spent = 0;
    for (const c of e.campaigns.filter(c => c.status === 'active')) {
      c.fundedDay = -1; const v = models(s).find(v => String(v.id) === String(c.vehicleId));
      if (!v) { c.status = 'cancelled'; continue; }
      const cost = Math.min(Math.max(0, c.budget - c.spent), c.budget / c.totalDays);
      if (availableCash - spent - reserve < cost) { c.phase = 'WAITING FOR FUNDING'; continue; }
      spent += cost; c.spent += cost; c.daysRemaining = Math.max(0, c.daysRemaining - 1); c.fundedDay = now; c.phase = 'RUNNING';
      if (c.daysRemaining === 0) { c.status = 'complete'; c.closed = date(s); record(s, c.name + ' completed', 'Actual campaign spending ' + Math.round(c.spent) + '. Sales during the campaign include normal market activity.', { campaignId: c.id }, hooks); }
    }
    for (const r of (s.marketSystem?.regions || []).filter(r => r.unlocked && n(r.dealers) > 0)) {
      const a = r.aftercare, cost = a.budgetPerDealer > 0 ? serviceProfile(s, r).monthlyCost / 30 : 0; a.fundedDay = -1; a.lastDailySpend = 0;
      if (cost > 0 && availableCash - spent - reserve >= cost) { spent += cost; a.lastDailySpend = cost; a.lifetimeSpend += cost; a.fundedDay = now; }
    }
    e.lastOperatingSpend = spent; e.mtdOperatingSpend += spent; return spent;
  }
  function recordSalesDay(s, v, sold) {
    const now = day(s);
    for (const c of s.industrialEra?.campaigns || []) if (String(c.vehicleId) === String(v.id) && c.fundedDay === now && n(c.lastSalesDay, -1) < now) { c.observedSales += Math.max(0, n(sold)); c.lastSalesDay = now; }
  }
  function processProjectsDay(s, hooks = {}) {
    const e = ensure(s), now = day(s); if (e.lastProjectDay >= now) return { capital: 0, development: 0, duplicate: true }; e.lastProjectDay = now;
    let capital = 0, development = 0, slots = 0;
    const reserve = Math.max(e.policy.reserve, n(s.budgetSystem?.protectProjects ? s.budgetSystem.reserveFloor : 0));
    for (const p of e.projects.filter(p => p.status === 'active')) {
      const target = entity(s, p.type, p.targetId);
      if (!target || (p.type === 'factory' ? !plants(s).includes(target) : !target.unlocked)) { p.phase = 'WAITING FOR OPERATING TARGET'; p.delayedDays++; continue; }
      if (slots >= e.policy.projectSlots) { p.phase = 'QUEUED — PROGRAM SLOTS'; p.delayedDays++; continue; }
      slots++; const burn = Math.min(Math.max(0, p.budget - p.spent), p.budget / Math.max(1, p.totalDays));
      if (n(s.cash) - reserve < burn) { p.phase = 'WAITING FOR FUNDING'; p.delayedDays++; continue; }
      s.cash -= burn; p.spent += burn; p.daysRemaining = Math.max(0, p.daysRemaining - 1);
      p.phase = p.daysRemaining > p.totalDays * .65 ? 'PROCESS DESIGN' : p.daysRemaining > p.totalDays * .2 ? 'INSTALLATION AND TRAINING' : 'COMMISSIONING';
      if (p.category === 'capital') { capital += burn; s.mtdCapitalSpend = n(s.mtdCapitalSpend) + burn; } else { development += burn; s.mtdDevelopmentSpend = n(s.mtdDevelopmentSpend) + burn; }
      if (p.daysRemaining === 0) {
        p.status = 'complete'; p.phase = 'IN SERVICE'; p.closed = date(s);
        const levels = p.type === 'factory' ? target.industrial.levels : target.aftercare.levels;
        levels[p.programId] = Math.min(p.type === 'factory' ? 2 : 1, Math.max(n(levels[p.programId]), p.targetLevel));
        record(s, p.name + ' entered service', 'Actual funded spend ' + Math.round(p.spent) + '; the operating effects are now applied.', { projectId: p.id }, hooks);
      }
    }
    for (const f of plants(s)) {
      const x = factoryEffects(s, f), p = f.industrial.policy;
      f.fatigue = clamp(n(f.fatigue) - x.fatigue, 0, 100); f.experience = clamp(n(f.experience, .92) + x.skill / 360, .68, 1.18);
      f.plantCondition = clamp(n(f.plantCondition, 100) + x.condition, 35, 100); f.maintenanceBacklog = clamp(n(f.maintenanceBacklog) - x.backlog, 0, 100);
      if (f.overtime && n(f.fatigue) >= p.fatigueLimit) { f.overtime = false; record(s, f.name + ' overtime stopped', 'The plant reached its management fatigue limit of ' + p.fatigueLimit + '.', { factoryId: f.id }, hooks); }
      if (e.policy.autoMaintenance && n(f.maintenanceBacklog) >= e.policy.maintenanceTrigger && !f.plannedMaintenanceDays && !f.breakdownDays) {
        const estimated = economic(s, 180000 * (1 + n(f.modernizationLevel) * .1));
        if (n(s.cash) - reserve >= estimated + 1000) G.MDX?.scheduleFactoryMaintenance?.(s, f, hooks.log);
      }
    }
    e.projects = e.projects.filter(p => ['active', 'paused'].includes(p.status)).concat(e.projects.filter(p => !['active', 'paused'].includes(p.status)).slice(-80));
    e.campaigns = e.campaigns.filter(c => c.status === 'active').concat(e.campaigns.filter(c => c.status !== 'active').slice(-40));
    return { capital, development, duplicate: false };
  }
  function projectSummary(s) {
    const e = ensure(s), open = e.projects.filter(p => ['active', 'paused'].includes(p.status)), active = open.filter(p => p.status === 'active'), working = active.slice(0, e.policy.projectSlots);
    const remaining = open.reduce((a, p) => a + Math.max(0, p.budget - p.spent), 0), daily = working.reduce((a, p) => a + p.budget / Math.max(1, p.totalDays), 0);
    const installed = plants(s).reduce((a, f) => a + Object.values(f.industrial.levels).reduce((b, level) => b + n(level), 0), 0) + (s.marketSystem?.regions || []).reduce((a, r) => a + Object.values(r.aftercare.levels).reduce((b, level) => b + n(level), 0), 0);
    return { active: active.length, paused: open.length - active.length, queued: Math.max(0, active.length - e.policy.projectSlots), committed: remaining, daily, monthly: daily * 30, spent: e.projects.reduce((a, p) => a + n(p.spent), 0), completed: Math.max(installed, e.projects.filter(p => p.status === 'complete').length), coverage: remaining ? clamp(Math.max(0, n(s.cash) - e.policy.reserve) / remaining, 0, 9) : null };
  }
  function modelReport(s, v) {
    ensure(s); const demand = Math.max(0, n(v.commercialForecast, v.lastMonthDemand)), sales = Math.max(0, n(v.lastMonthSales)), factory = Math.max(0, n(v.factoryInventory)), dealer = (s.marketSystem?.regions || []).reduce((a, r) => a + Math.max(0, n(r.inventory?.[v.id])), 0), transit = (s.logistics?.inTransit || []).filter(x => String(x.vehicleId) === String(v.id)).reduce((a, x) => a + Math.max(0, n(x.qty)), 0), pipeline = factory + dealer + transit;
    const cost = n(v.stats?.unitCost) * productionCostFactor(s, v), price = n(v.msrp), contribution = n(v.lastMonthContribution), inventoryCost = pipeline * cost, capacity = G.MDX?.factoryMonthlyCapacity?.(s) || 0;
    const supply = G.MDX?.supplierFactor?.(s) || { capacity: 1 }, workforce = G.MDX?.workforceFactor?.(s) || { productivity: 1 };
    const ownCap = Math.max(0, n(G.MDX?.vehicleFactoryCapacity?.(s, v.id), capacity / Math.max(1, models(s).length)) * supply.capacity * workforce.productivity);
    const cover = sales > 0 ? pipeline / sales : null, forecastCover = demand > 0 ? pipeline / demand : null;
    const breakEven = price > cost ? Math.ceil((n(s.dailyFixedCost) * 30 / Math.max(1, models(s).length)) / (price - cost)) : null;
    const returnOnStock = inventoryCost > 0 ? contribution / inventoryCost : null;
    return { id: v.id, name: v.name, body: v.design?.body || v.body || 'sedan', segment: v.stats?.className || v.target || 'Other', sales, demand, factory, dealer, transit, pipeline, cost, price, inventoryCost, capacity: ownCap, cover, forecastCover, daysSupply: cover === null ? null : cover * 30, sellThrough: n(v.lastMonthProduced) > 0 ? sales / v.lastMonthProduced : null, contribution, margin: price > 0 ? (price - cost) / price : null, breakEven, returnOnStock, waitlist: n(v.waitlist), shortage: Math.max(0, demand - sales), utilization: ownCap > 0 ? n(v.lastMonthProduced) / ownCap : 0, forecastError: demand > 0 ? (sales - demand) / demand : null, season: seasonFactor(s, v), policy: v.supplyPlan, campaign: eCampaign(s, v), stockBrake: !!v.supplyPlan.lastEstimate?.stockBrake };
  }
  function eCampaign(s, v) { return (s.industrialEra?.campaigns || []).find(c => String(c.vehicleId) === String(v.id) && c.status === 'active') || null; }
  function factoryReport(s, f) {
    ensure(s); const x = factoryEffects(s, f), stages = ['stamping', 'body', 'paint', 'final'].map(key => ({ key, label: key === 'final' ? 'Final assembly' : key[0].toUpperCase() + key.slice(1), capacity: n(f.shops?.[key]) })), bottleneck = stages.slice().sort((a, b) => a.capacity - b.capacity)[0], q = f.lastQuality || {}, improvements = Object.values(f.industrial.levels).reduce((a, k) => a + n(k), 0);
    const produced = Math.max(0, n(q.produced)), shift = n(f.shifts, 1) === 1 ? 1 : n(f.shifts) === 2 ? 1.78 : 2.45;
    const ratedLines = (f.lines || []).reduce((a, l) => a + n(G.MDX?.factoryLineEffective?.(s, f, l), l.capacity), 0);
    const capacity = Math.min(ratedLines, n(bottleneck?.capacity) * shift * x.capacity) * n(G.MDX?.difficultyProfile?.(s)?.productionCapacity, 1);
    const wage = n(f.wage) * n(f.workers), staffed = n(f.workers) - n(f.trainees), lines = (f.lines || []).length;
    return { id: f.id, name: f.name, stages, bottleneck, effects: x, improvements, capacity, produced, utilization: capacity ? produced / capacity : 0, reserveUnits: capacity * f.industrial.policy.reserveCapacity, trainedShare: n(f.workers) > 0 ? staffed / f.workers : 0, laborPerUnit: produced > 0 ? wage / produced : null, yieldLoss: n(q.scheduled) > 0 ? 1 - n(q.firstPassYield, 1) : null, quality: q, assignedLines: (f.lines || []).filter(l => l.modelId).length, flexibleLines: (f.lines || []).filter(l => !l.modelId).length, lines, backlogDays: n(f.maintenanceBacklog) / Math.max(.1, .055), activeProjects: s.industrialEra.projects.filter(p => String(p.targetId) === String(f.id) && ['active', 'paused'].includes(p.status)), policy: f.industrial.policy };
  }
  function treasuryReport(s) {
    ensure(s); const l = s.lastMonthSummary || {}, cash = n(s.cash), monthlyFixed = Math.max(0, n(s.dailyFixedCost) * 30), burn = Math.max(0, -n(l.netProfit ?? l.profit)), ps = projectSummary(s), stock = models(s).map(v => modelReport(s, v)).reduce((a, r) => a + r.inventoryCost, 0), service = (s.marketSystem?.regions || []).filter(r => r.unlocked).reduce((a, r) => a + (r.aftercare.budgetPerDealer > 0 ? serviceProfile(s, r).monthlyCost : 0), 0), campaign = s.industrialEra.campaigns.filter(c => c.status === 'active').reduce((a, c) => a + Math.max(0, c.budget - c.spent), 0);
    return { cash, monthlyFixed, burn, runway: burn > 0 ? Math.max(0, cash) / burn : null, reserveMonths: monthlyFixed > 0 ? Math.max(0, cash) / monthlyFixed : null, available: Math.max(0, cash - s.industrialEra.policy.reserve), stock, committed: ps.committed, campaignCommitted: campaign, monthlyService: service, coverage: ps.coverage, revenue: n(l.revenue), profit: n(l.netProfit ?? l.profit), margin: n(l.revenue) > 0 ? n(l.netProfit ?? l.profit) / l.revenue : null, cashConversion: n(l.netProfit ?? l.profit) !== 0 ? n(l.operatingCashFlow) / n(l.netProfit ?? l.profit) : null, industrialSpend: n(l.industrialOperatingSpend), history: s.industrialEra.snapshots };
  }
  function scenario(s, values = {}) {
    const t = treasuryReport(s), sales = models(s).reduce((a, v) => a + n(v.lastMonthSales), 0), unitCost = sales > 0 ? models(s).reduce((a, v) => a + n(v.lastMonthSales) * n(v.stats?.unitCost), 0) / sales : 0;
    const demand = clamp(n(values.demand, 0), -.4, .4), price = clamp(n(values.price, 0), -.15, .15), material = clamp(n(values.material, 0), -.3, .5), payroll = clamp(n(values.payroll, 0), -.2, .4), months = Math.round(clamp(n(values.months, 6), 1, 24));
    const baselineRevenue = t.revenue, volume = sales * (1 + demand), revenue = baselineRevenue * (1 + demand) * (1 + price), variableCostDelta = (volume * (1 + material) - sales) * unitCost, revenueDelta = revenue - baselineRevenue, payrollDelta = n(s.lastMonthSummary?.fixedBreakdown?.labor) * payroll;
    const estimatedProfit = t.profit + revenueDelta - variableCostDelta - payrollDelta;
    const work = s.industrialEra.projects.filter(p => ['active', 'paused'].includes(p.status));
    const capitalCommitment = work.filter(p => p.category === 'capital').reduce((a, p) => a + Math.max(0, p.budget - p.spent), 0);
    const baselineCashFlow = Number.isFinite(Number(s.lastMonthSummary?.operatingCashFlow)) ? n(s.lastMonthSummary.operatingCashFlow) : t.profit;
    const estimatedCashFlow = baselineCashFlow + revenueDelta - variableCostDelta - payrollDelta;
    return { sales: Math.round(volume), revenue, estimatedProfit, months, cashAtHorizon: t.cash + estimatedCashFlow * months - capitalCommitment, downside: estimatedProfit < 0, baselineProfit: t.profit, changes: { demand, price, material, payroll }, assumptions: 'Static sensitivity estimate from the last closed month. Cash uses baseline operating cash flow and conservatively deducts all remaining authorized equipment investment. It does not simulate dealer capacity, competitors, debt refinancing, or future launches. The company save stays unchanged.' };
  }
  const MILESTONES = [
    { id: 'first-improvement', name: 'The improved assembly line', detail: 'Complete a funded factory improvement.', test: s => s.industrialEra.projects.some(p => p.type === 'factory' && p.status === 'complete') },
    { id: 'ten-thousand-builds', name: 'Ten thousand new builds', detail: 'Produce 10,000 vehicles after this expansion was installed.', test: s => s.industrialEra.totalBuilt >= 10000 },
    { id: 'regional-service', name: 'Owners have support', detail: 'Complete a regional service program.', test: s => s.industrialEra.projects.some(p => p.type === 'service' && p.status === 'complete') },
    { id: 'lean-master', name: 'A lean manufacturing base', detail: 'Complete both levels of lean layout at one plant.', test: s => plants(s).some(f => f.industrial.levels.lean >= 2) },
    { id: 'cash-six-months', name: 'A six-month cash cushion', detail: 'Close a selling month with cash covering six months of current fixed costs.', test: s => models(s).some(v => v.lastMonthSales > 0) && n(s.dailyFixedCost) > 0 && n(s.cash) >= n(s.dailyFixedCost) * 180 },
    { id: 'three-markets', name: 'An international operating business', detail: 'Record vehicle sales in three open regions.', test: s => (s.marketSystem?.regions || []).filter(r => r.unlocked && Object.values(r.sales || {}).some(v => n(v) > 0)).length >= 3 },
    { id: 'healthy-margin', name: 'Volume with margin', detail: 'Sell 500 vehicles in a month with a positive net margin of at least 15%.', test: s => models(s).reduce((a, v) => a + n(v.lastMonthSales), 0) >= 500 && n(s.lastMonthSummary?.revenue) > 0 && n(s.lastMonthSummary?.netProfit) / s.lastMonthSummary.revenue >= .15 },
    { id: 'controlled-stock', name: 'Stock under control', detail: 'Sell 200 vehicles while every selling model holds less than 90 days of pipeline stock.', test: s => { const rows = models(s).map(v => modelReport(s, v)); return rows.reduce((a, r) => a + r.sales, 0) >= 200 && rows.every(r => r.daysSupply !== null && r.daysSupply <= 90); } },
    { id: 'skilled-plant', name: 'A skilled plant', detail: 'Reach 1.05 plant experience after completing cross-training.', test: s => plants(s).some(f => f.industrial.levels.crossTraining > 0 && n(f.experience) >= 1.05) },
    { id: 'clean-month', name: 'A dependable production month', detail: 'An improved operating plant produces 100 vehicles with no unplanned downtime.', test: s => plants(s).some(f => n(f.lastQuality?.produced) >= 100 && Object.values(f.industrial.levels).some(x => x > 0) && n(f.lastMonthUnplannedDowntime) === 0) },
    { id: 'six-profits', name: 'Sustained profitability', detail: 'Close six consecutive profitable months after installing this expansion.', test: s => s.industrialEra.profitStreak >= 6 },
    { id: 'five-products', name: 'A complete selling range', detail: 'Record monthly sales on five active vehicle models.', test: s => models(s).filter(v => n(v.lastMonthSales) > 0).length >= 5 }
  ];
  function processMonth(s, hooks = {}) {
    const e = ensure(s), p = period(s); if (e.lastClosePeriod >= p) return { duplicate: true }; e.lastClosePeriod = p;
    const l = s.lastMonthSummary || {}, built = models(s).reduce((a, v) => a + n(v.lastMonthProduced), 0); e.totalBuilt += built;
    e.profitStreak = n(l.netProfit ?? l.profit) > 0 ? e.profitStreak + 1 : 0;
    l.industrialOperatingSpend = e.mtdOperatingSpend; e.mtdOperatingSpend = 0;
    const t = treasuryReport(s), rows = models(s).map(v => modelReport(s, v));
    e.snapshots.push({ period: p, year: s.year, month: s.month, cash: t.cash, profit: t.profit, revenue: t.revenue, built, sold: rows.reduce((a, r) => a + r.sales, 0), inventory: rows.reduce((a, r) => a + r.pipeline, 0), inventoryValue: t.stock, projectCommitment: t.committed, industrialOperatingSpend: l.industrialOperatingSpend, serviceScore: (s.marketSystem?.regions || []).filter(r => r.unlocked).map(r => ({ id: r.id, score: serviceProfile(s, r).score })), completedProjects: projectSummary(s).completed });
    e.snapshots = e.snapshots.slice(-120);
    for (const m of MILESTONES) if (!e.milestones.some(x => x.id === m.id) && m.test(s)) { e.milestones.push({ id: m.id, ...date(s), name: m.name }); record(s, m.name, m.detail, { milestoneId: m.id }, hooks); }
    return { duplicate: false, built, milestones: e.milestones.length };
  }
  G.MDXIndustry = { VERSION: 1, PROGRAMS, CAMPAIGNS, SERVICE_PROGRAMS, PRESETS, MILESTONES, ensure, economic, period, day, plants, models, quote, startProject, projectAction, factoryEffects, productionCostFactor, qualityProfile, setFactoryPolicy, setCompanyPolicy, setPlan, seasonFactor, supplyTarget, campaignQuote, startCampaign, cancelCampaign, campaignMultiplier, setAftercare, serviceProfile, warrantyFactor, processOperatingDay, recordSalesDay, processProjectsDay, projectSummary, modelReport, factoryReport, treasuryReport, scenario, processMonth };
})();
