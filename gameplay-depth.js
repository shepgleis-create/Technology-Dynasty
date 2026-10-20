/* Saveable gameplay rules. Every action uses the existing vehicles, cash and company records. */
(() => {
  'use strict';
  const G = typeof window === 'undefined' ? globalThis : window;
  const n = (v, fallback = 0) => v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, n(v)));
  const period = s => n(s.year, 1970) * 12 + n(s.month);
  const date = s => ({ year: n(s.year, 1970), month: n(s.month), day: n(s.day, 1) });
  const hash = value => { let h = 2166136261; for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const roll = (s, key) => hash(String(s.campaignId || s.company) + ':' + key) / 4294967296;
  const copy = x => JSON.parse(JSON.stringify(x));
  const failure = reason => ({ ok: false, reason });
  const economic = (s, base, category = 'research') => Math.max(100, Math.round(base * (G.MDX_CORE?.economicIndex?.(category, n(s.year, 1970)) || Math.pow(1.035, n(s.year, 1970) - 1970))));
  const SETUPS = {
    gearing: { label: 'Gearing', min: -2, max: 2, step: 1, initial: 0, low: 'Economy', high: 'Acceleration' },
    suspension: { label: 'Suspension', min: -2, max: 2, step: 1, initial: 0, low: 'Comfort', high: 'Handling' },
    cooling: { label: 'Cooling headroom', min: 0, max: 3, step: 1, initial: 0, low: 'Standard', high: 'Heavy duty' },
    brakes: { label: 'Brake durability', min: 0, max: 2, step: 1, initial: 0, low: 'Standard', high: 'Fade resistant' },
    materials: { label: 'Material precision', min: 0, max: 2, step: 1, initial: 0, low: 'Standard', high: 'Higher cost' }
  };
  const TESTS = {
    road: { name: 'Road & acceleration', days: 10, cost: 16000, description: 'Acceleration, fuel economy, ride and braking on the same route.' },
    endurance: { name: 'Durability cycle', days: 24, cost: 31000, description: 'Repeated heat and load expose wear and undiscovered defects.' },
    tow: { name: 'Towing & gradients', days: 14, cost: 19000, description: 'Gearing, thermal headroom and load capacity on steep gradients.' },
    safety: { name: 'Safety & braking', days: 18, cost: 26000, description: 'Brake fade, stopping distance and occupant protection.' },
    climate: { name: 'Hot / cold validation', days: 16, cost: 23000, description: 'Cold starts, temperature control and reliability under climate stress.' },
    circuit: { name: 'Circuit development', days: 12, cost: 22000, description: 'Grip, balance, acceleration and repeatability under race loads.' }
  };
  const SERIES = {
    club: { name: 'Club Championship', minYear: 1940, rounds: 6, difficulty: 57, entry: 18000, roundCost: 6500, emphasis: 'handling' },
    touring: { name: 'Touring Championship', minYear: 1950, rounds: 8, difficulty: 66, entry: 38000, roundCost: 14000, emphasis: 'handling' },
    rally: { name: 'Rally Championship', minYear: 1955, rounds: 7, difficulty: 69, entry: 42000, roundCost: 17000, emphasis: 'reliability' },
    endurance: { name: 'Endurance Championship', minYear: 1960, rounds: 6, difficulty: 74, entry: 68000, roundCost: 25000, emphasis: 'reliability' },
    gt: { name: 'Grand Touring Championship', minYear: 1970, rounds: 8, difficulty: 78, entry: 105000, roundCost: 38000, emphasis: 'power' }
  };
  const DRIVERS = [
    { id: 'rookie', name: 'Promising newcomer', skill: 63, consistency: 65, salary: 2100 },
    { id: 'professional', name: 'Experienced professional', skill: 76, consistency: 81, salary: 5900 },
    { id: 'veteran', name: 'Championship veteran', skill: 86, consistency: 91, salary: 11500 }
  ];
  const PLAN_TYPES = {
    turnaround: { name: 'Turnaround', priority: 'turnaround', segment: 'Mainstream', horizon: 18, description: 'Restore a saleable lineup, healthier dealers and three profitable months.' },
    budget: { name: 'Affordable volume brand', priority: 'profit', segment: 'Budget', horizon: 18, description: 'Use shared procurement and platforms to sell affordable cars at a positive margin.' },
    premium: { name: 'Premium specialist', priority: 'brand', segment: 'Premium', horizon: 24, description: 'Protect brand identity, improve quality and build profitable premium products.' },
    technology: { name: 'Engineering center', priority: 'technology', segment: 'Sport', horizon: 24, description: 'Coordinate engineering and quality; develop useful products and powertrains.' },
    expansion: { name: 'Regional growth', priority: 'growth', segment: 'Family', horizon: 18, description: 'Rebuild distribution and grow sales without abandoning cash-reserve limits.' }
  };
  const CHALLENGES = {
    free: { name: 'Free play', description: 'Build your own story. Optional challenges can be started later.' },
    builder: { name: 'Build a vehicle dynasty', months: 60, description: 'Launch three related body styles and sell 10,000 vehicles.', target: 10000 },
    fleet: { name: 'Become a fleet supplier', months: 48, description: 'Deliver 2,000 vehicles through signed fleet contracts.', target: 2000 },
    racing: { name: 'Win a championship', months: 48, description: 'Develop a car and win a complete racing championship.', target: 1 },
    turnaround: { name: 'Rescue a manufacturer', months: 72, description: 'Acquire a company and complete a turnaround plan with three profitable months.', target: 1 },
    global: { name: 'Build an international brand', months: 60, description: 'Sell in three regions and reach 20,000 lifetime sales.', target: 20000 },
    survive: { name: 'Survive the pressure', months: 24, description: 'Complete 24 months with positive cash and at least three profitable closes.', target: 24 }
  };

  function ensure(s) {
    if (!s || typeof s !== 'object') return null;
    const d = s.gameplayDepth && typeof s.gameplayDepth === 'object' ? s.gameplayDepth : (s.gameplayDepth = {});
    d.version = 1; d.nextId = Math.max(1, Math.round(n(d.nextId, 1)));
    for (const key of ['decisions', 'labPrograms', 'labResults', 'seasons', 'procurement', 'negotiations', 'plans', 'journal', 'museum', 'campaigns']) if (!Array.isArray(d[key])) d[key] = [];
    for (const key of ['lastClosePeriod', 'lastDecisionPeriod', 'lastDay']) d[key] = n(d[key], -1);
    d.journal = d.journal.slice(0, 180); d.labResults = d.labResults.slice(0, 120);
    d.museum = d.museum.slice(0, 160); d.seasons = d.seasons.slice(-30);
    d.decisions = d.decisions.filter(x => x && typeof x === 'object').slice(-60);
    d.familyNames = d.familyNames && typeof d.familyNames === 'object' ? d.familyNames : {};
    d.challenge = d.challenge && typeof d.challenge === 'object' ? d.challenge : { type: 'free', status: 'inactive' };
    return d;
  }
  function id(s, prefix) { const d = ensure(s); return prefix + '_' + d.nextId++; }
  function journal(s, title, detail, extra = {}, hooks = {}) {
    const d = ensure(s), row = { id: id(s, 'story'), ...date(s), title, detail, ...extra };
    d.journal.unshift(row); d.journal.length = Math.min(d.journal.length, 180);
    hooks.log?.(title + ': ' + detail); return row;
  }
  function cash(s, amount, category, label, extra = {}) {
    s.cash = n(s.cash) + amount;
    G.MDX?.recordCashTransaction?.(s, category, amount, label, { source: 'gameplay-depth', ...extra });
  }
  function spend(s, amount, category, label, extra) {
    const value = Math.max(0, n(amount)); if (n(s.cash) < value) return false;
    cash(s, -value, category, label, extra); return true;
  }
  function vehicles(s) { return [...(s.vehicles || []), ...(s.vehiclePrograms || []).filter(p => p.status === 'active').map(p => p.vehicle).filter(Boolean)]; }
  function target(s, vehicleId) { return vehicles(s).find(v => String(v.id) === String(vehicleId)); }
  function liveVehicles(s) { return (s.vehicles || []).filter(v => v.active !== false && v.productionStatus === 'production'); }
  function setup(v) {
    const out = {}; for (const [key, def] of Object.entries(SETUPS)) out[key] = clamp(v?.engineeringSetup?.[key] ?? def.initial, def.min, def.max);
    return out;
  }
  function baseStats(v) {
    const base = copy(v?.engineeringBaseline || v?.stats || {}), prior = v?.engineeringApplied, current = v?.stats || {};
    if (prior) for (const [key, value] of Object.entries(current)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(prior[key])) continue;
      if (Math.abs(value - prior[key]) < .000001) continue;
      base[key] = ['zero', 'mpg', 'top', 'lb', 'mass', 'unitCost', 'manufacturingUnitCost'].includes(key) && prior[key] > 0
        ? n(base[key], value) * value / prior[key] : n(base[key], value) + value - prior[key];
    }
    return base;
  }
  function tunedStats(v, draft = setup(v)) {
    const b = baseStats(v), t = {}; for (const [key, def] of Object.entries(SETUPS)) t[key] = clamp(draft[key], def.min, def.max);
    const g = t.gearing, suspension = t.suspension, cooling = t.cooling, brakes = t.brakes, materials = t.materials;
    const cost = Math.max(1, n(b.manufacturingUnitCost ?? b.unitCost ?? b.cost, 2000));
    const weight = 1 + cooling * .008 + brakes * .004 - materials * .004;
    const result = { ...b,
      zero: Math.max(2.2, n(b.zero, 14) * (1 - g * .022) * weight),
      mpg: clamp(n(b.mpg, 20) * (1 - g * .028 - cooling * .003), 4, 180),
      top: Math.max(35, n(b.top, 90) * (1 - g * .012)),
      handling: clamp(n(b.handling, 55) + suspension * 2.5 + materials * .4, 10, 98),
      comfort: clamp(n(b.comfort, 55) - suspension * 3 - brakes * .5, 10, 98),
      safety: clamp(n(b.safety, 40) + brakes * 1.2 + materials * .5, 10, 98),
      reliability: clamp(n(b.reliability ?? b.rel, 70) + cooling * 1.2 + materials * 1.2 - Math.abs(g) * .4, 10, 98),
      quality: clamp(n(b.quality, 65) + materials * 1.3, 10, 98),
      unitCost: Math.round(cost * (1 + cooling * .010 + brakes * .013 + materials * .022)),
      lb: Math.round(n(b.lb ?? b.mass, 2600) * weight)
    };
    result.manufacturingUnitCost = result.unitCost;
    result.rel = result.reliability;
    return G.MDXEngineering?.enhanceTunedStats?.(v, result, draft) || result;
  }
  function testQuote(s, vehicleId, type, draft) {
    const v = target(s, vehicleId), def = TESTS[type]; if (!v || !def) return null;
    const current = setup(v), next = draft || current;
    const changes = Object.keys(SETUPS).reduce((sum, key) => sum + Math.abs(n(next[key]) - current[key]), 0);
    const days = def.days + Math.ceil(changes * 1.5), cost = economic(s, def.cost + changes * 5500);
    return { days, cost, dailySpend: cost / days, changes, before: copy(v.stats || {}), after: tunedStats(v, next) };
  }
  function startTest(s, vehicleId, type, draft = null, hooks = {}) {
    const d = ensure(s), v = target(s, vehicleId), quote = testQuote(s, vehicleId, type, draft);
    if (!v || !quote) return failure('Choose a vehicle or prototype and a valid test.');
    if (d.labPrograms.some(p => p.vehicleId === v.id && p.status === 'active')) return failure('This vehicle already has a development test running.');
    if (n(s.cash) < quote.dailySpend * 3) return failure('Keep at least three days of test funding available.');
    const next = {}; for (const [key, def] of Object.entries(SETUPS)) next[key] = clamp((draft || setup(v))[key], def.min, def.max);
    v.engineeringBaseline = baseStats(v); v.engineeringApplied = copy(v.stats || {});
    const row = { id: id(s, 'lab'), vehicleId: v.id, vehicleName: v.name, type, name: TESTS[type].name, status: 'active', setup: next, before: copy(v.stats || {}), budget: quote.cost, spent: 0, totalDays: quote.days, daysRemaining: quote.days, started: date(s) };
    d.labPrograms.push(row); journal(s, 'Engineering test authorized', v.name + ' — ' + row.name + ', ' + quote.days + ' days, budget ' + quote.cost + '.', { vehicleId: v.id, programId: row.id }, hooks);
    return { ok: true, program: row };
  }
  function finishTest(s, p, hooks) {
    const d = ensure(s), v = target(s, p.vehicleId);
    if (!v) { p.status = 'cancelled'; p.reason = 'The vehicle program no longer exists.'; return; }
    v.engineeringBaseline = baseStats(v); v.engineeringApplied = copy(v.stats || {});
    v.engineeringSetup = copy(p.setup); v.stats = tunedStats(v, p.setup); v.engineeringApplied = copy(v.stats);
    const stats = v.stats, thermal = clamp(n(stats.reliability, 70) + p.setup.cooling * 4, 0, 99);
    const tow = Math.round(Math.max(0, n(stats.torque, n(stats.power ?? stats.hp, 80) * 1.1)) * (6 + p.setup.gearing * .5) * (1 + p.setup.cooling * .035));
    const scores = { road: clamp(105 - stats.zero * 3 + stats.handling * .23, 10, 99), endurance: stats.reliability,
      tow: clamp(thermal * .6 + Math.min(36, tow / 100), 10, 99), safety: stats.safety * .75 + stats.handling * .25,
      climate: thermal, circuit: clamp(stats.handling * .65 + (110 - stats.zero * 4) * .35, 10, 99) };
    let finding = 'No reproducible defect in this test cycle.';
    const hidden = (v.defects || []).find(x => !x.discovered && !x.recalled);
    if (hidden && roll(s, p.id + ':defect') < (p.type === 'endurance' ? .85 : .40)) { hidden.discovered = true; finding = hidden.part + ' weakness reproduced. Investigate it in Quality.'; }
    else if (n(scores[p.type]) < 60) finding = 'Weak ' + TESTS[p.type].name.toLowerCase() + ' result. Review the setup and underlying design before launch.';
    const result = { id: p.id, vehicleId: v.id, vehicleName: v.name, type: p.type, name: p.name, score: Math.round(clamp(scores[p.type], 10, 99)), before: p.before, after: copy(stats), setup: copy(p.setup), cost: p.spent, thermal: Math.round(thermal), tow, stoppingFeet: Math.round(180 - stats.safety * .55 - p.setup.brakes * 3), finding, ...date(s) };
    d.labResults.unshift(result); d.labResults.length = Math.min(d.labResults.length, 120);
    p.status = 'complete'; p.completed = date(s); v.completedTests = [...new Set([...(v.completedTests || []), 'development_' + p.type])];
    journal(s, 'Engineering result', v.name + ': ' + result.score + '/100. ' + finding, { vehicleId: v.id, resultId: p.id, cost: p.spent }, hooks);
  }
  function cancelTest(s, programId, hooks = {}) {
    const p = ensure(s).labPrograms.find(x => x.id === programId && x.status === 'active'); if (!p) return failure('No active test to cancel.');
    p.status = 'cancelled'; journal(s, 'Test cancelled', p.vehicleName + ': ' + p.spent.toFixed(0) + ' spent; original setup retained.', { vehicleId: p.vehicleId }, hooks); return { ok: true };
  }
  function familyKey(v) { return v?.design?.familyId || v?.familyId || v?.nameplateId || v?.id; }
  function familyGroups(s) {
    const d = ensure(s), groups = new Map();
    for (const v of vehicles(s)) {
      const key = familyKey(v); if (!key) continue;
      if (!groups.has(key)) groups.set(key, { id: key, name: d.familyNames[key] || v.design?.familyName || v.name, variants: [], sales: 0, revenue: 0, contribution: 0 });
      const g = groups.get(key); g.variants.push(v); g.sales += n(v.lastMonthSales); g.revenue += n(v.lastMonthRevenue); g.contribution += n(v.lastMonthContribution);
    }
    return [...groups.values()];
  }
  function variantDraft(s, sourceId, body) {
    const source = target(s, sourceId); if (!source) return failure('Choose an existing vehicle.');
    const allowed = G.MDXDepth?.bodyOptions?.(s, source) || ['sedan', 'coupe', 'wagon', 'truck', 'suv', 'hatch', 'van', 'convertible'];
    if (!allowed.includes(body)) return failure('This platform does not support that body style.');
    const fid = familyKey(source), d = ensure(s); d.familyNames[fid] = d.familyNames[fid] || source.name;
    const draft = { ...copy(source.design || {}), name: d.familyNames[fid] + ' ' + body.charAt(0).toUpperCase() + body.slice(1), body, familyId: fid, familyName: d.familyNames[fid], sourceVehicleId: source.id, platformId: source.platformId || source.design?.platformId || 'new', msrp: n(source.msrp, 4000) };
    return { ok: true, draft };
  }
  function bodyOptions(s, v) {
    const p = (s.platforms || []).find(x => x.id === (v?.platformId || v?.design?.platformId));
    const catalog = Object.keys(G.MDX_BASE_DATA?.BODY || G.MD_DATA?.BODY || { sedan: 1, coupe: 1, wagon: 1, hatch: 1, suv: 1, truck: 1, van: 1, convertible: 1 });
    return (Array.isArray(p?.bodies) ? p.bodies : catalog).filter(x => catalog.includes(x));
  }

  function raceQuote(s, seriesId, driverId, preparation = 1) {
    const series = SERIES[seriesId], driver = DRIVERS.find(x => x.id === driverId); if (!series || !driver) return null;
    const prep = clamp(preparation, .6, 1.5), perRound = economic(s, series.roundCost * prep + driver.salary, 'marketing');
    return { entry: economic(s, series.entry, 'marketing'), perRound, total: economic(s, series.entry, 'marketing') + perRound * series.rounds, rounds: series.rounds };
  }
  function startSeason(s, input, hooks = {}) {
    const d = ensure(s), series = SERIES[input.seriesId], v = liveVehicles(s).find(x => x.id === input.vehicleId), driver = DRIVERS.find(x => x.id === input.driverId), quote = raceQuote(s, input.seriesId, input.driverId, input.preparation);
    if (!series || n(s.year) < series.minYear) return failure('That championship is not available in this era.');
    if (!v || !driver || !quote) return failure('Choose a production car and a driver.');
    if (d.seasons.some(x => x.status === 'active')) return failure('Finish or withdraw from your active season first.');
    if (!spend(s, quote.entry, 'motorsportEntry', series.name + ' season entry')) return failure('Insufficient cash for the entry fee.');
    const rivals = (s.industry || []).filter(m => !m.acquired && !['liquidated', 'bankrupt', 'merged_into_player'].includes(m.status)).sort((a, b) => hash(a.id + input.seriesId) - hash(b.id + input.seriesId)).slice(0, 7).map(m => ({ id: m.id, name: m.name, points: 0, pace: clamp(series.difficulty + (hash(m.id) % 15) - 7, 40, 96) }));
    while (rivals.length < 7) rivals.push({ id: 'privateer_' + rivals.length, name: 'Independent Racing ' + (rivals.length + 1), points: 0, pace: series.difficulty - 3 + rivals.length });
    const row = { id: id(s, 'season'), seriesId: input.seriesId, vehicleId: v.id, vehicleName: v.name, driverId: driver.id, driverName: driver.name, preparation: clamp(input.preparation ?? 1, .6, 1.5), status: 'active', enteredYear: n(s.year), startPeriod: period(s), lastRacePeriod: -1, round: 0, points: 0, wins: 0, spent: quote.entry, rivals, results: [], learning: 0 };
    d.seasons.push(row); journal(s, 'Racing season entered', v.name + ' with ' + driver.name + ' in ' + series.name + '.', { seasonId: row.id, vehicleId: v.id }, hooks);
    return { ok: true, season: row };
  }
  function setRacePreparation(s, seasonId, value) {
    const r = ensure(s).seasons.find(x => x.id === seasonId && x.status === 'active'); if (!r) return failure('Season is no longer active.');
    r.preparation = clamp(value, .6, 1.5); return { ok: true };
  }
  function withdrawSeason(s, seasonId, hooks = {}) {
    const r = ensure(s).seasons.find(x => x.id === seasonId && x.status === 'active'); if (!r) return failure('No active season.');
    r.status = 'withdrawn'; journal(s, 'Race team withdrawn', SERIES[r.seriesId].name + ': future rounds cancelled; spent entry and preparation costs remain.', { seasonId: r.id }, hooks); return { ok: true };
  }
  function processRacing(s, hooks) {
    const d = ensure(s), p = period(s);
    for (const season of d.seasons.filter(x => x.status === 'active')) {
      if (season.lastRacePeriod >= p) continue;
      const series = SERIES[season.seriesId], driver = DRIVERS.find(x => x.id === season.driverId), v = target(s, season.vehicleId), quote = raceQuote(s, season.seriesId, season.driverId, season.preparation);
      if (!series || !driver || !v || !quote || v.active === false || v.productionStatus === 'retired') { season.status = 'withdrawn'; continue; }
      season.lastRacePeriod = p; season.round++;
      let place = 8, retired = false, reason = '', spent = 0, pace = 0;
      const rivalPaces = season.rivals.map(r => ({ ...r, racePace: r.pace + (roll(s, season.id + ':' + r.id + ':' + season.round) - .5) * 10 }));
      const funded = spend(s, quote.perRound, 'motorsportEntry', series.name + ' round ' + season.round, { seasonId: season.id });
      if (!funded) reason = 'DNS — preparation and driver funding unavailable.';
      else {
        spent = quote.perRound; season.spent += spent;
        const stats = v.stats || {}, reliability = clamp(n(stats.reliability, 70) + setup(v).cooling * 2 + season.preparation * 2, 20, 98);
        retired = roll(s, season.id + ':' + season.round + ':failure') > reliability / 100;
        const performance = series.emphasis === 'power' ? clamp(n(stats.power ?? stats.hp, 80) / 3, 20, 98) : n(stats[series.emphasis], 60);
        pace = performance * .38 + driver.skill * .30 + n(stats.handling, 60) * .18 + driver.consistency * .07 + season.preparation * 4 + Math.min(3, season.learning) + (roll(s, season.id + ':' + season.round + ':pace') - .5) * 8;
        if (!retired) place = 1 + rivalPaces.filter(r => r.racePace > pace).length;
        reason = retired ? 'DNF — reliability failed under race load.' : 'P' + place + ' — car ' + Math.round(performance) + ', driver ' + driver.skill + ', preparation ' + season.preparation.toFixed(1) + '.';
        if (!retired) { season.learning = Math.min(3, season.learning + .35); s.rp = n(s.rp) + 1; }
      }
      const points = funded && !retired ? [25, 18, 15, 12, 10, 8, 6, 4][place - 1] || 0 : 0;
      season.points += points; if (place === 1 && funded && !retired) season.wins++;
      for (const r of season.rivals) { const race = rivalPaces.find(x => x.id === r.id), position = 1 + rivalPaces.filter(o => o.id !== r.id && o.racePace > race.racePace).length + (funded && !retired && pace >= race.racePace ? 1 : 0); r.points += [25, 18, 15, 12, 10, 8, 6, 4][position - 1] || 0; }
      season.results.push({ round: season.round, ...date(s), place, points, spent, retired, reason });
      journal(s, series.name + ' round ' + season.round, season.vehicleName + ': ' + reason, { seasonId: season.id, vehicleId: season.vehicleId, points }, hooks);
      if (season.round >= series.rounds) {
        season.status = 'complete'; season.position = 1 + season.rivals.filter(r => r.points > season.points).length; season.completed = date(s);
        if (season.position === 1) { s.motorsport = s.motorsport || { entries: [], trophies: 0 }; s.motorsport.trophies = n(s.motorsport.trophies) + 1; G.MDX_CORE?.adjustReputation?.(s, 1.5, { reason: 'Won ' + series.name, source: 'race_championship' }); }
        journal(s, 'Championship completed', series.name + ': P' + season.position + ', ' + season.points + ' points, ' + season.wins + ' wins; actual spend ' + Math.round(season.spent) + '.', { seasonId: season.id, championship: season.position === 1 }, hooks);
      }
    }
  }

  const COMPONENTS = { steel: { name: 'Body steel', share: .12 }, tires: { name: 'Tires', share: .045 }, brakes: { name: 'Brake components', share: .055 }, electronics: { name: 'Electrical components', share: .05 } };
  function procurementQuote(s, input) {
    const component = COMPONENTS[input.component]; if (!component || (input.component === 'electronics' && n(s.year) < 1950)) return null;
    const models = liveVehicles(s), unitBase = models.length ? models.reduce((a, v) => a + n(v.stats?.unitCost, 2000), 0) / models.length : economic(s, 2400, 'vehiclePrice');
    const minimum = Math.round(clamp(input.minimum ?? 250, 50, 5000)), quality = clamp(input.quality ?? 80, 60, 95), term = Math.round(clamp(input.term ?? 12, 6, 36)), discount = clamp(input.discount ?? 6, 0, 12), exclusive = !!input.exclusive;
    const unitPrice = Math.max(1, Math.round(unitBase * component.share * (1 - discount / 100) * (1 + (quality - 80) * .002)));
    const deposit = Math.round(minimum * unitPrice * (exclusive ? .15 : .08));
    const tolerance = clamp(4 + minimum / 900 + term / 9 + (exclusive ? 2 : 0) - Math.max(0, quality - 80) * .18, 2, 12);
    return { component: input.component, minimum, quality, term, discount, exclusive, unitPrice, deposit, tolerance, estimatedMonthly: unitPrice * minimum };
  }
  function proposeProcurement(s, input, hooks = {}) {
    const d = ensure(s), quote = procurementQuote(s, input); if (!quote) return failure('Choose an available component.');
    const occupied = d.procurement.find(c => c.component === quote.component && c.status === 'active'); if (occupied) return failure('This component already has an active supply agreement.');
    if (d.negotiations.some(c => c.kind === 'supplier' && c.component === quote.component && ['pending', 'countered'].includes(c.status))) return failure('Wait for the supplier response before submitting again.');
    const row = { id: id(s, 'offer'), kind: 'supplier', ...quote, supplierName: input.supplierName || COMPONENTS[quote.component].name + ' Cooperative', status: 'pending', proposedPeriod: period(s), responsePeriod: period(s) + 1, responseDay: Number.isFinite(Number(s.daysPlayed)) ? Number(s.daysPlayed) + 30 : null };
    d.negotiations.push(row); journal(s, 'Supplier counteroffer sent', row.supplierName + ': ' + quote.minimum + ' units/month, ' + quote.term + ' months, requested discount ' + quote.discount + '%.', { negotiationId: row.id }, hooks); return { ok: true, offer: row };
  }
  function acceptProcurement(s, offerId, hooks = {}) {
    const d = ensure(s), offer = d.negotiations.find(x => x.id === offerId && x.kind === 'supplier' && x.status === 'countered');
    if (!offer) return failure('The supplier must respond before you can sign.');
    if (period(s) > offer.expiresPeriod) return failure('This counteroffer has expired.');
    if (d.procurement.some(c => c.component === offer.component && c.status === 'active')) return failure('A supply agreement is already active for this component.');
    if (!spend(s, offer.deposit, 'procurement_deposit', 'Refundable supplier deposit — ' + offer.supplierName)) return failure('Insufficient cash for the refundable deposit.');
    const c = { ...copy(offer), id: id(s, 'supply'), status: 'active', startPeriod: period(s), endPeriod: period(s) + offer.term, lastSettledPeriod: -1, delivered: 0, shortfallCost: 0, depositBalance: offer.deposit, lastInvoice: 0, lastDelivered: 0, lastFill: 100, lastSaving: 0 };
    offer.status = 'signed'; d.procurement.push(c); journal(s, 'Supply agreement signed', c.supplierName + ': ' + c.discount + '% discount, quality ' + c.quality + ', ' + c.minimum + ' minimum units/month. Deposit is returned at completion.', { contractId: c.id }, hooks); return { ok: true, contract: c };
  }
  function cancelProcurement(s, contractId, hooks = {}) {
    const c = ensure(s).procurement.find(x => x.id === contractId && x.status === 'active'); if (!c) return failure('No active supply agreement.');
    const remaining = Math.max(0, c.endPeriod - period(s)), fee = Math.min(n(c.depositBalance), Math.round(c.minimum * c.unitPrice * .03 * Math.min(remaining, 6))), returned = Math.max(0, n(c.depositBalance) - fee);
    if (n(c.depositBalance) > 0) cash(s, n(c.depositBalance), 'procurement_return', 'Supplier deposit released — ' + c.supplierName);
    if (fee > 0) cash(s, -fee, 'contract_penalty', 'Early supply cancellation — ' + c.supplierName);
    c.depositBalance = 0; c.status = 'cancelled'; journal(s, 'Supplier contract cancelled', c.supplierName + ': ' + returned + ' deposit returned after ' + fee + ' termination expense.', { contractId: c.id }, hooks); return { ok: true, returned, fee };
  }
  function procurementModifier(s) {
    const d = s?.gameplayDepth; if (!d) return { cost: 1, capacity: 1, reliability: 1 };
    const active = (d.procurement || []).filter(c => c.status === 'active' && period(s) < c.endPeriod);
    let saving = 0, quality = 0, capacity = 1;
    for (const c of active) { saving += n(COMPONENTS[c.component]?.share) * (n(c.discount) / 100 - (n(c.quality, 80) - 80) * .002); quality += (n(c.quality, 80) - 80) * .0004; if (n(c.lastFill, 100) < 85 && c.exclusive) capacity *= .95; }
    return { cost: clamp(1 - saving, .96, 1.03), capacity: clamp(capacity, .85, 1), reliability: clamp(1 + quality, .98, 1.025) };
  }
  function proposeFleet(s, offerId, input, hooks = {}) {
    const d = ensure(s); G.MDX?.generateFleetOffers?.(s);
    const o = (s.marketSystem?.fleetOffers || []).find(x => x.id === offerId && x.status === 'offer'); if (!o) return failure('Choose an open fleet offer.');
    if (d.negotiations.some(x => x.kind === 'fleet' && x.offerId === offerId && ['pending', 'countered'].includes(x.status))) return failure('A negotiation for this offer is already open.');
    const row = { id: id(s, 'fleetoffer'), kind: 'fleet', offerId, buyerName: o.name, basePrice: o.priceFactor, baseUnits: o.units, priceFactor: clamp(input.priceFactor ?? o.priceFactor, .70, .98), units: Math.round(clamp(input.units ?? o.units, 50, Math.max(100, o.units * 1.5))), months: Math.round(clamp(input.months ?? o.months, 6, 36)), status: 'pending', proposedPeriod: period(s), responsePeriod: period(s) + 1, responseDay: Number.isFinite(Number(s.daysPlayed)) ? Number(s.daysPlayed) + 30 : null };
    d.negotiations.push(row); journal(s, 'Fleet counteroffer sent', o.name + ': ' + row.units + ' vehicles/month at ' + Math.round(row.priceFactor * 100) + '% of MSRP.', { negotiationId: row.id }, hooks); return { ok: true, offer: row };
  }
  function acceptFleet(s, negotiationId, hooks = {}) {
    const d = ensure(s), offer = d.negotiations.find(x => x.id === negotiationId && x.kind === 'fleet' && x.status === 'countered');
    if (!offer || period(s) > offer.expiresPeriod) return failure('No current fleet counteroffer.');
    const original = (s.marketSystem?.fleetOffers || []).find(x => x.id === offer.offerId && x.status === 'offer'); if (!original) return failure('The fleet offer is no longer open.');
    const before = copy(original); Object.assign(original, { priceFactor: offer.priceFactor, units: offer.units, months: offer.months });
    if (!G.MDX?.acceptFleetContract?.(s, original.id, hooks.log || (() => {}))) { Object.assign(original, before); return failure('Your vehicle does not meet buyer suitability or pricing-floor requirements. Review your lineup and fleet pricing.'); }
    original.negotiatedTerms = { negotiationId: offer.id, agreedPeriod: period(s), priceFactor: offer.priceFactor, units: offer.units, months: offer.months };
    offer.status = 'signed'; journal(s, 'Negotiated fleet contract signed', original.name + ': delivery obligations are now active in the existing fleet system.', { contractId: original.id }, hooks); return { ok: true, contract: original };
  }
  function declineOffer(s, offerId) { const o = ensure(s).negotiations.find(x => x.id === offerId && ['pending', 'countered'].includes(x.status)); if (!o) return failure('Offer is no longer open.'); o.status = 'declined'; return { ok: true }; }
  function processResponses(s, hooks) {
    const d = ensure(s), p = period(s);
    for (const o of d.negotiations) {
      if (o.status === 'countered' && p > o.expiresPeriod) { o.status = 'expired'; continue; }
      if (o.status !== 'pending' || (o.responseDay != null ? n(s.daysPlayed) < o.responseDay : p < o.responsePeriod)) continue;
      if (o.kind === 'supplier') {
        o.discount = Math.min(o.discount, Math.floor(o.tolerance));
        const q = procurementQuote(s, o); Object.assign(o, q); o.reason = 'Supplier balanced volume, quality, term and exclusivity against the requested discount.';
      } else {
        const concession = Math.min(.035, .012 + Math.max(0, o.baseUnits - o.units) / Math.max(1, o.baseUnits) * .025 + (o.months - 12) * .0005);
        o.priceFactor = Math.min(o.priceFactor, o.basePrice + concession); o.reason = 'Buyer accepted a limited price concession in return for your delivery schedule.';
      }
      o.status = 'countered'; o.expiresPeriod = p + 2; journal(s, 'Negotiation response', (o.supplierName || o.buyerName) + ': ' + o.reason, { negotiationId: o.id }, hooks);
    }
  }
  function processNegotiations(s, hooks) {
    const d = ensure(s), p = period(s); processResponses(s, hooks);
    const units = liveVehicles(s).reduce((a, v) => a + n(v.lastMonthProduced), 0);
    for (const c of d.procurement.filter(x => x.status === 'active')) {
      if (c.lastSettledPeriod >= p) continue; c.lastSettledPeriod = p;
      if (p >= c.endPeriod) { cash(s, n(c.depositBalance), 'procurement_return', 'Supply contract deposit returned — ' + c.supplierName); c.depositBalance = 0; c.status = 'complete'; journal(s, 'Supply term completed', c.supplierName + ': deposit returned and contract closed.', { contractId: c.id }, hooks); continue; }
      const event = (s.worldEconomy?.activeEvents || []).some(x => ['steel_shortage', 'supplier_wave', 'port_strike'].includes(x.id));
      const fill = event && roll(s, c.id + ':' + p) > .55 ? .80 : 1;
      const delivered = Math.round(units * fill), under = Math.max(0, c.minimum - units), shortfallCost = Math.round(under * c.unitPrice * .08);
      if (shortfallCost > 0) cash(s, -shortfallCost, 'contract_penalty', 'Supplier minimum-volume charge — ' + c.supplierName, { contractId: c.id });
      c.delivered += delivered; c.lastDelivered = delivered; c.lastFill = Math.round(fill * 100); c.lastInvoice = delivered * c.unitPrice; c.lastSaving = Math.round(c.lastInvoice * c.discount / Math.max(1, 100 - c.discount)); c.shortfallCost += shortfallCost;
      c.lastExplanation = units === 0 ? 'No vehicle production. Minimum-volume charge applies; avoid signing before your factory is ready.' : under > 0 ? 'Production was below the signed minimum; unused commitment created an expense.' : fill < 1 ? 'World disruption reduced supplier service. An exclusive deal will reduce next month’s throughput.' : 'Production met commitment. Component saving is already included in vehicle manufacturing costs.';
    }
  }

  function company(s, companyId) { const sub = (s.subsidiaries || []).find(x => x.id === companyId), m = sub && (s.industry || []).find(x => x.id === (sub.operatingCompanyId || sub.id)); const industrial = (s.industrialCompanies || []).find(x => x.id === companyId && (x.parentOwned || (s.ownedSuppliers || []).includes(x.id) || (s.industrialHoldings?.owned || []).includes(x.id))); return { sub, m, industrial }; }
  function startPlan(s, companyId, type, input = {}, hooks = {}) {
    const d = ensure(s), definition = PLAN_TYPES[type], c = company(s, companyId);
    if (!definition || (!c.sub && !c.industrial) || (c.sub && !c.m)) return failure('Choose a company you currently control.');
    if (d.plans.some(x => x.companyId === companyId && x.status === 'active')) return failure('Review or cancel the active business plan before replacing it.');
    const entity = c.m || c.industrial, available = Math.max(0, n(entity.cash, c.sub?.cash)), budget = Math.round(clamp(input.budget ?? available * .05, 0, Math.max(0, available * .3))), months = Math.round(clamp(input.months ?? definition.horizon, 6, 36));
    const row = { id: id(s, 'plan'), companyId, companyName: entity.name || c.sub?.name, type, name: definition.name, status: 'active', startPeriod: period(s), endPeriod: period(s) + months, months, budget, spent: 0, reviewed: 0, profitStreak: 0, baseline: { sales: n(entity.monthSales, c.sub?.lastSales), dealers: n(entity.dealers), quality: n(entity.qualityCulture ?? entity.quality, 65), profit: n(entity.monthProfit ?? entity.netProfit, c.sub?.lastProfit), products: (entity.aiCars || []).filter(x => x.active).length, cash: available }, history: [], targets: { salesGrowth: clamp(input.salesGrowth ?? (type === 'expansion' ? 20 : 10), 0, 60), quality: clamp(input.quality ?? (type === 'premium' ? 82 : 74), 50, 95) } };
    if (c.sub) {
      const g = G.MDXGroupControl?.ensureSub?.(c.sub); if (!g) return failure('Company governance is unavailable.');
      row.priorPolicy = copy({ synergyPriority: g.synergyPriority, integration: g.integration, targets: g.targets, productDirectives: g.productDirectives, dividendPolicy: g.capitalPolicy.dividendPolicy });
      g.synergyPriority = definition.priority; g.productDirectives = { ...(g.productDirectives || {}), preferredSegment: definition.segment, focusSegment: definition.segment };
      g.integration.procurement = 'integrated'; g.integration.services = 'integrated'; g.integration.dealers = type === 'expansion' || type === 'turnaround' ? 'integrated' : 'coordinated'; g.integration.engineering = type === 'technology' ? 'integrated' : 'coordinated'; g.integration.platforms = type === 'budget' ? 'integrated' : 'coordinated'; g.targets.quality = row.targets.quality; g.targets.revenueGrowth = row.targets.salesGrowth / (months / 12); g.capitalPolicy.dividendPolicy = type === 'turnaround' ? 'retain' : 'balanced';
      G.MDXGroupControl.applySubGovernance(s, c.sub, c.m);
    } else {
      const g = G.MDXGroupControl?.ensureIndustrial?.(c.industrial); if (g) { row.priorPolicy = copy({ mandate: g.mandate, technologyRoadmap: g.technologyRoadmap, targets: g.targets }); g.mandate = type === 'technology' ? 'technology_leader' : 'balanced_supplier'; g.targets.quality = row.targets.quality; g.technologyRoadmap = type === 'technology' ? 'next_generation' : 'balanced'; }
    }
    d.plans.push(row); journal(s, 'Company business plan approved', row.companyName + ': ' + row.name + ', ' + months + ' months. Budget is paid by the company from available cash.', { planId: row.id, companyId }, hooks); return { ok: true, plan: row };
  }
  function cancelPlan(s, planId, hooks = {}) {
    const plan = ensure(s).plans.find(x => x.id === planId && x.status === 'active'); if (!plan) return failure('No active business plan.');
    const c = company(s, plan.companyId);
    if (c.sub && plan.priorPolicy) { const g = G.MDXGroupControl.ensureSub(c.sub); for (const key of ['synergyPriority', 'integration', 'targets', 'productDirectives']) g[key] = copy(plan.priorPolicy[key]); g.capitalPolicy.dividendPolicy = plan.priorPolicy.dividendPolicy; if (c.m) G.MDXGroupControl.applySubGovernance(s, c.sub, c.m); }
    if (c.industrial && plan.priorPolicy) Object.assign(G.MDXGroupControl.ensureIndustrial(c.industrial), copy(plan.priorPolicy));
    plan.status = 'cancelled'; journal(s, 'Company plan cancelled', plan.companyName + ': remaining budget stopped and previous governance restored.', { companyId: plan.companyId }, hooks); return { ok: true };
  }
  function processPlans(s, hooks) {
    const d = ensure(s), p = period(s);
    for (const plan of d.plans.filter(x => x.status === 'active')) {
      const c = company(s, plan.companyId), entity = c.m || c.industrial;
      if (!entity || (c.sub?.mergeStatus === 'merged') || entity.status === 'liquidated') { plan.status = 'closed'; plan.reason = 'Company was sold, merged or liquidated.'; continue; }
      if (plan.lastPeriod >= p) continue; plan.lastPeriod = p; plan.reviewed++;
      const monthly = Math.min(plan.budget / Math.max(1, plan.months), Math.max(0, plan.budget - plan.spent)), floor = Math.max(0, n(entity.valuation ?? entity.value) * .025), available = Math.max(0, n(entity.cash, c.sub?.cash) - floor), funded = Math.min(monthly, available), beforeCash = n(entity.cash, c.sub?.cash);
      entity.cash = beforeCash - funded; plan.spent += funded;
      if (c.sub) { c.sub.cash = entity.cash; entity.monthProfit = n(entity.monthProfit) - funded; entity.monthNetProfit = n(entity.monthNetProfit, entity.monthProfit + funded) - funded; c.sub.lastProfit = n(c.sub.lastProfit) - funded; const ownership = clamp(c.sub.parentOwnership ?? c.sub.ownershipPct ?? c.sub.percent ?? 100, 0, 100) / 100; if (s.lastMonthSummary) s.lastMonthSummary.subsidiaryPlanExpense = n(s.lastMonthSummary.subsidiaryPlanExpense) + funded * ownership; }
      else { entity.netProfit = n(entity.netProfit) - funded; if (s.lastMonthSummary) s.lastMonthSummary.industrialPlanExpense = n(s.lastMonthSummary.industrialPlanExpense) + funded * clamp(c.industrial.parentOwnership ?? 100, 0, 100) / 100; }
      const intensity = monthly > 0 ? funded / monthly : 0, qualityMove = intensity * .22;
      if (plan.type === 'technology' || plan.type === 'premium') { if (c.m) { c.m.qualityCulture = clamp(n(c.m.qualityCulture, 65) + qualityMove, 20, 95); for (const v of c.m.aiCars || []) if (v.active) v.quality = clamp(n(v.quality, 65) + qualityMove * .5, 20, 95); } else entity.quality = clamp(n(entity.quality, 65) + qualityMove, 20, 95); }
      if (c.m && ['turnaround', 'expansion'].includes(plan.type)) c.m.dealerHealth = clamp(n(c.m.dealerHealth, 50) + intensity * .45, 10, 95);
      const profit = n(entity.monthNetProfit ?? entity.monthProfit ?? entity.netProfit, c.sub?.lastProfit), sales = n(entity.monthSales, c.sub?.lastSales), quality = n(entity.qualityCulture ?? entity.quality, 65), products = (entity.aiCars || []).filter(x => x.active).length, salesGrowth = plan.baseline.sales > 0 ? (sales / plan.baseline.sales - 1) * 100 : sales > 0 ? 100 : 0;
      plan.profitStreak = profit > 0 ? plan.profitStreak + 1 : 0;
      const reasons = []; if (funded + 1 < monthly) reasons.push('Budget throttled to protect company cash reserves.'); if (!c.industrial && products === 0) reasons.push('No saleable lineup; approve development in the company manager.'); if (profit <= 0) reasons.push('Operating losses remain.'); if (salesGrowth < plan.targets.salesGrowth) reasons.push('Sales growth is below target.'); if (quality < plan.targets.quality) reasons.push('Quality remains below target.');
      plan.history.unshift({ ...date(s), cash: entity.cash, profit, sales, quality, products, salesGrowth, spent: funded, reason: reasons.join(' ') || 'Current operating targets met.' }); plan.history.length = Math.min(36, plan.history.length);
      plan.progress = clamp(Math.min(1, plan.reviewed / plan.months) * 35 + Math.min(1, plan.profitStreak / 3) * 30 + Math.min(1, Math.max(0, salesGrowth) / Math.max(1, plan.targets.salesGrowth)) * 20 + Math.min(1, quality / plan.targets.quality) * 15, 0, 100);
      if (p >= plan.endPeriod || plan.reviewed >= plan.months) { const met = plan.profitStreak >= 3 && (c.industrial || products > 0) && (plan.type !== 'premium' && plan.type !== 'technology' || quality >= plan.targets.quality) && (!['budget', 'expansion'].includes(plan.type) || salesGrowth >= plan.targets.salesGrowth); plan.status = met ? 'complete' : 'missed'; plan.completed = date(s); journal(s, 'Company plan reviewed', plan.companyName + ': ' + (met ? 'targets achieved.' : 'term ended below target. ' + reasons.join(' ')), { planId: plan.id, companyId: plan.companyId }, hooks); }
    }
  }

  function challengeProgress(s, challenge = ensure(s).challenge) {
    const d = ensure(s), type = challenge.type, elapsed = Math.max(0, period(s) - n(challenge.startPeriod, period(s)));
    const familyBodies = Math.max(0, ...familyGroups(s).map(g => new Set(g.variants.filter(v => v.productionStatus === 'production').map(v => v.design?.body || 'sedan')).size));
    const sales = n(s.lifetimeUnits, (s.vehicles || []).reduce((a, v) => a + n(v.lifetimeSales), 0)), fleet = (s.marketSystem?.fleetContracts || []).reduce((a, c) => a + n(c.delivered), 0) - n(challenge.baselineFleet), championships = d.seasons.filter(x => x.status === 'complete' && x.position === 1 && x.startPeriod >= n(challenge.startPeriod)).length;
    const rescues = d.plans.filter(x => x.type === 'turnaround' && x.status === 'complete' && x.startPeriod >= n(challenge.startPeriod)).length;
    const regions = (s.marketSystem?.regions || []).filter(r => r.unlocked && (n(r.lastMonthSales) > 0 || Object.values(r.mtdSales || {}).some(x => n(x) > 0) || n(s.customerMarket?.regions?.[r.id]?.lifetime?.sales) > 0)).length;
    const checks = type === 'builder' ? [{ label: 'Related body styles in production', actual: familyBodies, target: 3 }, { label: 'Lifetime vehicles sold', actual: sales, target: 10000 }] : type === 'fleet' ? [{ label: 'Fleet deliveries since challenge began', actual: Math.max(0, fleet), target: 2000 }] : type === 'racing' ? [{ label: 'Championships won', actual: championships, target: 1 }] : type === 'turnaround' ? [{ label: 'Successful turnaround plans', actual: rescues, target: 1 }] : type === 'global' ? [{ label: 'Regions with customer sales', actual: regions, target: 3 }, { label: 'Lifetime vehicles sold', actual: sales, target: 20000 }] : type === 'survive' ? [{ label: 'Months completed', actual: elapsed, target: 24 }, { label: 'Profitable closes', actual: n(challenge.profitableMonths), target: 3 }, { label: 'Positive cash', actual: n(s.cash) > 0 ? 1 : 0, target: 1 }] : [];
    return { checks, progress: checks.length ? Math.round(checks.reduce((a, c) => a + clamp(c.actual / c.target, 0, 1), 0) / checks.length * 100) : 0, elapsed, remaining: Math.max(0, n(challenge.endPeriod, period(s)) - period(s)), complete: checks.length > 0 && checks.every(c => c.actual >= c.target) };
  }
  function startChallenge(s, type, hooks = {}) {
    const d = ensure(s), def = CHALLENGES[type]; if (!def) return failure('Choose a valid challenge.');
    d.challenge = { type, name: def.name, status: type === 'free' ? 'inactive' : 'active', startPeriod: period(s), endPeriod: period(s) + n(def.months), profitableMonths: 0, baselineFleet: (s.marketSystem?.fleetContracts || []).reduce((a, c) => a + n(c.delivered), 0), started: date(s) };
    if (type !== 'free') journal(s, 'Challenge started', def.name + ': ' + def.description, { challenge: type }, hooks); return { ok: true };
  }
  function captureMuseum(s) {
    const d = ensure(s);
    for (const entry of d.museum) { const current = (s.vehicles || []).find(v => v.id === entry.vehicleId); if (!current || n(current.generation, 1) > entry.generation) entry.retired = true; }
    for (const v of s.vehicles || []) {
      const retired = ['retired', 'discontinued'].includes(v.productionStatus) || v.active === false;
      const key = v.id + ':' + n(v.generation, 1);
      let entry = d.museum.find(x => x.key === key);
      if (!entry) { entry = { key, vehicleId: v.id, name: v.name, launched: n(v.createdYear ?? v.modelYear, s.year), generation: n(v.generation, 1), design: copy(v.design || {}), stats: copy(v.stats || {}), favorite: false }; d.museum.unshift(entry); }
      entry.sales = n(v.lifetimeSales); entry.revenue = n(v.lifetimeRevenue); entry.retired = retired; entry.lastYear = n(s.year); entry.body = v.design?.body || 'sedan'; entry.familyId = familyKey(v); entry.reception = v.launchReception?.verdict || v.reputationMemory?.label || ''; entry.recalls = (v.defects || []).filter(x => x.recalled).length;
    }
    d.museum.length = Math.min(d.museum.length, 160);
  }
  function favorite(s, key) { const entry = ensure(s).museum.find(x => x.key === key); if (!entry) return failure('Vehicle archive missing.'); entry.favorite = !entry.favorite; return { ok: true }; }

  function generateDecisions(s) {
    const d = ensure(s), p = period(s);
    for (const q of d.decisions.filter(x => ['open', 'deferred', 'delegated'].includes(x.status))) {
      const v = q.vehicleId && target(s, q.vehicleId);
      const fulfilled = q.type === 'first_engine' ? (s.engines || []).length || (s.enginePrograms || []).some(x => x.status === 'active')
        : q.type === 'first_vehicle' ? (s.vehicles || []).length || (s.vehiclePrograms || []).some(x => x.status === 'active')
        : q.type === 'validation' ? !v || d.labResults.some(x => x.vehicleId === q.vehicleId) || d.labPrograms.some(x => x.vehicleId === q.vehicleId && x.status === 'active')
        : q.type === 'inventory' ? !v || n(v.inventory) <= Math.max(150, n(v.lastMonthSales) * 3)
        : q.type === 'racing' ? d.seasons.some(x => x.status === 'active')
        : q.type === 'subsidiary' ? d.plans.some(x => x.companyId === q.companyId && x.status === 'active') : false;
      if (fulfilled) { q.status = 'resolved'; q.resolvedPeriod = p; }
    }
    if (d.lastDecisionPeriod === p) return;
    d.lastDecisionPeriod = p;
    for (const q of d.decisions) if (q.status === 'deferred' && p >= q.returnPeriod) q.status = 'open';
    const open = d.decisions.filter(q => ['open', 'delegated'].includes(q.status)); if (open.length >= 4) return;
    const candidates = [];
    if (!(s.engines || []).length && !(s.enginePrograms || []).some(x => x.status === 'active')) candidates.push({ type: 'first_engine', role: 'cto', title: 'Authorize your first engine', detail: 'Engineering needs a released engine before your first combustion vehicle can enter development.', view: 'engine', cost: 0, duration: 'Your chosen development program', risk: 'Development uses cash every day.' });
    if (!(s.vehicles || []).length && !(s.vehiclePrograms || []).some(x => x.status === 'active')) candidates.push({ type: 'first_vehicle', role: 'cpo', title: 'Build your first vehicle', detail: 'Choose a body, powertrain and price, then approve its prototype program.', view: 'vehicle', cost: 0, duration: 'Quoted in the vehicle studio', risk: 'Price and production readiness determine commercial success.' });
    const models = liveVehicles(s);
    for (const v of models) {
      if (n(v.inventory) > Math.max(150, n(v.lastMonthSales) * 3)) candidates.push({ type: 'inventory', role: 'cmo', vehicleId: v.id, title: v.name + ' inventory is building', detail: 'Stock ' + Math.round(n(v.inventory)) + ', last month sales ' + Math.round(n(v.lastMonthSales)) + '. Consider a 4% price reduction and a production-plan review.', cost: 0, duration: 'Price changes immediately', risk: 'Lower contribution per vehicle; sales response depends on actual demand.' });
      if (!d.labResults.some(r => r.vehicleId === v.id)) candidates.push({ type: 'validation', role: 'cto', vehicleId: v.id, title: 'Validate ' + v.name, detail: 'Engineering recommends a durability cycle before field failures grow.', cost: economic(s, TESTS.endurance.cost), duration: TESTS.endurance.days + ' days', risk: 'The test may reveal a costly weakness instead of a passing result.' });
    }
    const r = (s.marketSystem?.regions || []).find(x => x.unlocked && n(x.dealerHealth, 70) < 60);
    if (r) candidates.push({ type: 'dealers', role: 'cmo', regionId: r.id, title: 'Support struggling dealers', detail: 'Dealer health in ' + r.id + ' is ' + Math.round(n(r.dealerHealth)) + '/100. Fund three months of extra regional marketing.', cost: economic(s, 12000, 'marketing') * 3, duration: 'Three monthly budgets', risk: 'Marketing spending can exceed the margin on extra sales.' });
    if ((s.worldEconomy?.activeEvents || []).length) { const e = s.worldEconomy.activeEvents[0]; candidates.push({ type: 'world', role: 'cso', title: 'Respond to ' + e.name, detail: e.detail, view: 'market', tab: 'economy', cost: 0, duration: n(e.remainingMonths) + ' months expected', risk: 'Event effects already change demand and factory costs.' }); }
    const weakest = (s.subsidiaries || []).find(x => n(x.lastProfit) < 0);
    if (weakest) candidates.push({ type: 'subsidiary', role: 'cso', companyId: weakest.id, title: 'Review ' + weakest.name + ' losses', detail: 'The company needs a funded plan and a saleable lineup. Inspect its results and approve a turnaround.', cost: 0, duration: 'Plan horizon 6–36 months', risk: 'Recovery depends on actual products, distribution and cash.' });
    if (models.length && !d.seasons.some(x => x.status === 'active')) candidates.push({ type: 'racing', role: 'cmo', title: 'Put your engineering on the track', detail: 'Use a production car in an era-appropriate championship. Choose driver and preparation before entering.', view: 'market', tab: 'motorsport', cost: 0, duration: '6–8 monthly rounds', risk: 'Entry, driver and preparation costs are quoted before signing.' });
    if (models.length) candidates.push({ type: 'family', role: 'cpo', title: 'Expand a vehicle family', detail: 'Reuse a proven design and a compatible platform for another body style.', view: 'library', tab: 'families', cost: 0, duration: 'Normal vehicle development', risk: 'Variants share engineering but may compete for the same buyers.' });
    for (const candidate of candidates) {
      if (d.decisions.filter(x => ['open', 'delegated'].includes(x.status)).length >= 4) break;
      if (d.decisions.some(x => x.type === candidate.type && x.vehicleId === candidate.vehicleId && x.regionId === candidate.regionId && p - n(x.createdPeriod) < 3 && x.status !== 'dismissed')) continue;
      const decisionId = id(s, 'decision');
      d.decisions.push({ ...candidate, id: decisionId, status: 'open', createdPeriod: p, ...date(s) });
    }
  }
  function resolveDecision(s, decisionId, choice, hooks = {}) {
    const d = ensure(s), q = d.decisions.find(x => x.id === decisionId && ['open', 'delegated'].includes(x.status)); if (!q) return failure('This decision is already resolved.');
    if (choice === 'dismiss') { q.status = 'dismissed'; return { ok: true }; }
    if (choice === 'later') { q.status = 'deferred'; q.returnPeriod = period(s) + 2; return { ok: true }; }
    if (choice === 'delegate') {
      const role = s.executiveOffice?.roles?.[q.role]; if (!role?.candidateId) return failure('Hire the responsible director before delegating this decision.');
      if (!['inventory', 'validation', 'dealers'].includes(q.type)) return failure('This strategic decision needs your direct approval.');
      q.status = 'delegated'; q.delegatePeriod = period(s) + 1; q.approvedLimit = q.cost; q.directorName = role.name || q.role; return { ok: true };
    }
    const v = q.vehicleId && target(s, q.vehicleId);
    if (q.type === 'inventory') { if (!v) return failure('Vehicle no longer exists.'); q.before = v.msrp; v.msrp = Math.round(n(v.msrp) * .96); if (v.design) v.design.msrp = v.msrp; q.result = 'MSRP reduced 4%. Review subsequent sales and contribution.'; }
    else if (q.type === 'validation') { const test = startTest(s, q.vehicleId, 'endurance', null, hooks); if (!test.ok) return test; q.result = 'Durability test funded through the engineering program.'; }
    else if (q.type === 'dealers') { const region = (s.marketSystem?.regions || []).find(x => x.id === q.regionId); if (!region) return failure('Region missing.'); const increment = q.cost / 3; if (n(s.cash) < increment) return failure('Insufficient cash for the first month of regional marketing.'); d.campaigns.push({ id: id(s, 'campaign'), regionId: region.id, remaining: 3, increment, previous: n(region.marketing) }); region.marketing = n(region.marketing) + increment; q.result = 'Three-month marketing budget added to this region.'; }
    else { q.status = 'reviewed'; return { ok: true, navigate: q.view, tab: q.tab, companyId: q.companyId }; }
    q.status = 'approved'; q.resolvedPeriod = period(s); journal(s, 'HQ decision approved', q.title + '. ' + q.result, { decisionId: q.id }, hooks); return { ok: true };
  }
  function processDay(s, hooks = {}) {
    const d = ensure(s), day = period(s) * 30 + n(s.day, 1); if (d.lastDay >= day) return { spend: 0 };
    d.lastDay = day; processResponses(s, hooks); generateDecisions(s); let spent = 0;
    for (const p of d.labPrograms.filter(x => x.status === 'active' && !x.detailed && !x.userPaused)) {
      if (!target(s, p.vehicleId)) { p.status = 'cancelled'; continue; }
      const burn = Math.min(Math.max(0, p.budget - p.spent), p.budget / p.totalDays);
      if (n(s.cash) < burn || (G.MDX?.projectCanSpend && !G.MDX.projectCanSpend(s, burn))) { p.phase = 'Waiting for funding'; continue; }
      s.cash -= burn; p.spent += burn; spent += burn; s.mtdDevelopmentSpend = n(s.mtdDevelopmentSpend) + burn; p.daysRemaining--; p.phase = p.daysRemaining > p.totalDays * .5 ? 'Instrumented testing' : 'Validation & analysis';
      if (p.daysRemaining <= 0) finishTest(s, p, hooks);
    }
    return { spend: spent };
  }
  function processMonth(s, hooks = {}) {
    const d = ensure(s), p = period(s); if (d.lastClosePeriod >= p) return { duplicate: true };
    d.lastClosePeriod = p;
    for (const q of d.decisions.filter(x => x.status === 'delegated' && x.delegatePeriod <= p)) {
      const role = s.executiveOffice?.roles?.[q.role]; if (!role?.candidateId || n(q.cost) > n(q.approvedLimit) || n(s.cash) < n(q.cost) / (q.type === 'dealers' ? 3 : 1)) { q.status = 'open'; q.result = 'Returned for review: director or approved funding unavailable.'; continue; }
      const result = resolveDecision(s, q.id, 'approve', hooks); if (!result.ok) { q.status = 'open'; q.result = result.reason; }
    }
    for (const c of d.campaigns.filter(x => x.remaining > 0)) { c.remaining--; if (!c.remaining) { const r = (s.marketSystem?.regions || []).find(x => x.id === c.regionId); if (r) r.marketing = Math.max(0, n(r.marketing) - c.increment); } }
    processRacing(s, hooks); processNegotiations(s, hooks); processPlans(s, hooks); captureMuseum(s);
    if (!hooks.deferGoals) finalizeMonth(s, hooks);
    d.labPrograms = d.labPrograms.filter(x => ['active', 'paused', 'review', 'commissioning'].includes(x.status)).concat(d.labPrograms.filter(x => !['active', 'paused', 'review', 'commissioning'].includes(x.status)).slice(-80));
    d.negotiations = d.negotiations.filter(x => ['pending', 'countered'].includes(x.status)).concat(d.negotiations.filter(x => !['pending', 'countered'].includes(x.status)).slice(-40));
    return { duplicate: false, activeDecisions: d.decisions.filter(x => x.status === 'open').length };
  }
  function finalizeMonth(s, hooks = {}) {
    const d = ensure(s), p = period(s); if (n(d.lastGoalsPeriod, -1) >= p) return;
    d.lastGoalsPeriod = p;
    if (d.challenge.status === 'active') {
      if (n(s.lastMonthSummary?.netProfit ?? s.lastMonthSummary?.profit) > 0) d.challenge.profitableMonths++;
      const progress = challengeProgress(s);
      if (progress.complete) { d.challenge.status = 'complete'; d.challenge.completed = date(s); journal(s, 'Challenge completed', d.challenge.name + ' achieved through actual company results.', { challenge: d.challenge.type }, hooks); }
      else if (p >= d.challenge.endPeriod) { d.challenge.status = 'missed'; journal(s, 'Challenge term ended', d.challenge.name + ': ' + progress.progress + '% of targets reached. Your company continues.', { challenge: d.challenge.type }, hooks); }
    }
  }
  function initialize(s, options = {}) { ensure(s); if (options.challenge && options.challenge !== 'free') startChallenge(s, options.challenge); generateDecisions(s); return s.gameplayDepth; }
  G.MDXDepth = { VERSION: 1, SETUPS, TESTS, SERIES, DRIVERS, PLAN_TYPES, CHALLENGES, COMPONENTS, ensure, initialize, economic, period, journal, target, liveVehicles, setup, baseStats, tunedStats, testQuote, startTest, cancelTest, familyKey, familyGroups, variantDraft, bodyOptions, raceQuote, startSeason, setRacePreparation, withdrawSeason, procurementQuote, proposeProcurement, acceptProcurement, cancelProcurement, procurementModifier, proposeFleet, acceptFleet, declineOffer, company, startPlan, cancelPlan, startChallenge, challengeProgress, favorite, generateDecisions, resolveDecision, processDay, processMonth, finalizeMonth };
})();

