/* Engineering evidence, funded revisions and connected operating decisions. */
(() => {
  'use strict';
  const G = window, D = () => G.MDXDepth, C = () => G.MDX_CORE;
  const n = (x, fallback = 0) => x !== null && x !== '' && Number.isFinite(Number(x)) ? Number(x) : fallback;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, n(x))), copy = x => JSON.parse(JSON.stringify(x));
  const period = s => n(s.year, 1970) * 12 + n(s.month), day = s => period(s) * 30 + n(s.day, 1);
  const date = s => ({ year: n(s.year, 1970), month: n(s.month), day: n(s.day, 1) });
  const fail = reason => ({ ok: false, reason }), obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const numeric = x => Object.fromEntries(Object.entries(x || {}).filter(([, v]) => typeof v === 'string' || typeof v === 'number' && Number.isFinite(v)));
  const era = (s, amount, category = 'research') => Math.max(1, Math.round(amount * (C()?.economicRelativeIndex?.(category, n(s.year, 1970), 1970) || Math.pow(1.03, n(s.year, 1970) - 1970))));
  const EXTRA_SETUPS = {
    calibration: { label: 'Powertrain calibration', min: -2, max: 2, step: 1, initial: 0, low: 'Economy', high: 'Output', group: 'powertrain', description: 'More output increases fuel use and heat; economy calibration reduces peak output.' },
    aero: { label: 'Aero refinement', min: 0, max: 3, step: 1, initial: 0, low: 'Original body', high: 'Refined airflow', group: 'chassis', description: 'Lower drag improves cruising efficiency but costs more to manufacture.' },
    tireGrip: { label: 'Tire compound', min: -2, max: 2, step: 1, initial: 0, low: 'Long life', high: 'Grip', group: 'chassis', description: 'More grip improves handling and braking but reduces tire life and economy.' },
    lightweight: { label: 'Lightweight construction', min: 0, max: 3, step: 1, initial: 0, low: 'Original mass', high: 'Lower mass', group: 'chassis', description: 'Reduces weight at higher unit cost, with a small durability and comfort tradeoff.' },
    nvh: { label: 'Cabin isolation', min: 0, max: 3, step: 1, initial: 0, low: 'Original cabin', high: 'Quiet cabin', group: 'durability', description: 'Adds comfort and insulation mass rather than free performance.' },
    corrosion: { label: 'Corrosion protection', min: 0, max: 3, step: 1, initial: 0, low: 'Original coating', high: 'Long exposure', group: 'durability', description: 'Improves salt-exposure endurance at a higher manufacturing cost.' },
    driveline: { label: 'Driveline reinforcement', min: 0, max: 3, step: 1, initial: 0, low: 'Original driveline', high: 'Higher load margin', group: 'powertrain', description: 'Adds load margin, durability, mass and unit cost.' },
    serviceability: { label: 'Service access', min: 0, max: 3, step: 1, initial: 0, low: 'Original packaging', high: 'Easier repairs', group: 'durability', description: 'Accessible packaging shortens estimated service time but costs more to build.' },
    weatherSealing: { label: 'Weather sealing', min: 0, max: 3, step: 1, initial: 0, low: 'Original seals', high: 'Wet / cold exposure', group: 'durability', description: 'Improves water and cold-start resilience with extra mass and manufacturing expense.' }
  };
  const EXTRA_TESTS = {
    highspeed: { name: 'Highway endurance', days: 18, cost: 29000, description: 'Sustained cruising RPM, heat, fuel economy and noise.', domain: 'thermal' },
    brakefade: { name: 'Repeated brake fade', days: 15, cost: 24000, description: 'Repeated stops expose brake capacity and tire limitations.', domain: 'braking' },
    corrosion: { name: 'Salt and corrosion exposure', days: 30, cost: 37000, description: 'Coatings, materials and seals under repeated wet / salt cycles.', domain: 'corrosion' },
    nvh: { name: 'Cabin noise and vibration', days: 14, cost: 21000, description: 'Cruising RPM, isolation, engine smoothness and ride.', domain: 'quietness' },
    economy: { name: 'Controlled economy route', days: 12, cost: 19000, description: 'Comparable fuel economy under the chosen load and climate.', domain: 'economy' },
    driveline: { name: 'Driveline load cycling', days: 22, cost: 33000, description: 'Engine torque, transmission rating and repeated launch load.', domain: 'driveline' },
    wet: { name: 'Wet handling and water ingress', days: 16, cost: 25000, description: 'Grip, alignment, stability and weather seals.', domain: 'wet' },
    roughroad: { name: 'Rough-road fatigue', days: 25, cost: 35000, description: 'Suspension, ride height, tire sidewall and structural endurance.', domain: 'durability' },
    service: { name: 'Service workshop trial', days: 14, cost: 20000, description: 'Packaging access, component complexity and repair labor.', domain: 'service' },
    emissions: { name: 'Emissions and control validation', days: 20, cost: 32000, minYear: 1970, description: 'Fuel calibration, catalyst / control equipment and combustion stress.', domain: 'emissions' }
  };
  const DOMAINS = { road: 'performance', endurance: 'durability', tow: 'towing', safety: 'safety', climate: 'thermal', circuit: 'handling' };
  const FACILITIES = {
    thermal: { name: 'Climate chamber', year: 1940, cost: 140000, days: 45, tests: ['climate', 'highspeed', 'wet'] },
    fatigue: { name: 'Fatigue and road-load rig', year: 1940, cost: 120000, days: 42, tests: ['endurance', 'roughroad', 'driveline'] },
    brakes: { name: 'Brake dynamometer', year: 1955, cost: 155000, days: 48, tests: ['safety', 'brakefade', 'circuit'] },
    acoustic: { name: 'Acoustic development cell', year: 1965, cost: 130000, days: 40, tests: ['nvh', 'service', 'road'] },
    aero: { name: 'Road-load and wind tunnel', year: 1970, cost: 240000, days: 60, tests: ['economy', 'highspeed', 'circuit'] },
    emissions: { name: 'Emissions laboratory', year: 1970, cost: 180000, days: 50, tests: ['emissions', 'economy', 'climate'] }
  };
  const CHANGEOVERS = {
    rolling: { name: 'Rolling line update', days: 7, capacity: .80, cost: 24000, description: 'Keep the old specification in production at 80% capacity during funded installation.' },
    planned: { name: 'Planned line stop', days: 3, capacity: 0, cost: 16000, description: 'Stop new assembly for three funded days; existing inventory can still sell.' },
    parallel: { name: 'Parallel tooling', days: 10, capacity: .97, cost: 56000, description: 'Higher tooling cost keeps 97% capacity available during installation.' },
    staged: { name: 'Staged commissioning', days: 12, capacity: .90, cost: 33000, description: 'A longer changeover retains 90% capacity and spreads tooling spend over more days.' }
  };
  const BRIEFS = {
    commuter: { name: 'Efficient commuter', targets: { economy: 74, service: 66, durability: 70 }, routes: ['economy', 'service', 'endurance'] },
    family: { name: 'Dependable family car', targets: { safety: 68, quietness: 70, durability: 75 }, routes: ['safety', 'nvh', 'endurance'] },
    touring: { name: 'Long-distance tourer', targets: { quietness: 75, thermal: 72, economy: 66 }, routes: ['nvh', 'highspeed', 'economy'] },
    sport: { name: 'Responsive sports car', targets: { performance: 74, handling: 75, braking: 72 }, routes: ['road', 'circuit', 'brakefade'] },
    utility: { name: 'Working utility vehicle', targets: { towing: 70, driveline: 76, durability: 73 }, routes: ['tow', 'driveline', 'roughroad'] },
    winter: { name: 'Cold-climate export', targets: { wet: 72, corrosion: 73, thermal: 72 }, routes: ['wet', 'corrosion', 'climate'] },
    endurance: { name: 'Endurance specialist', targets: { thermal: 78, durability: 80, braking: 74 }, routes: ['highspeed', 'endurance', 'brakefade'] },
    value: { name: 'Serviceable value car', targets: { service: 72, durability: 70, economy: 68 }, routes: ['service', 'endurance', 'economy'] }
  };
  const STYLE = {
    coachwork: { original: { name: 'Original silhouette', year: 1940 }, formal: { name: 'Formal roofline', year: 1940 }, flowing: { name: 'Flowing roofline', year: 1950 }, sporting: { name: 'Low sporting roofline', year: 1955 } },
    lighting: { original: { name: 'Original lights', year: 1940 }, round: { name: 'Single round lamps', year: 1940 }, quad: { name: 'Twin round lamps', year: 1957 }, rectangular: { name: 'Rectangular lamps', year: 1975 } },
    grille: { original: { name: 'Original grille', year: 1940 }, vertical: { name: 'Vertical brightwork', year: 1940 }, horizontal: { name: 'Horizontal bars', year: 1950 }, mesh: { name: 'Sport mesh', year: 1960 } }
  };
  const BOARD_METRICS = { cash: { name: 'Cash reserve', unit: '$', direction: 'min' }, debt: { name: 'Debt ceiling', unit: '$', direction: 'max' }, margin: { name: 'Net margin', unit: '%', direction: 'min' }, sales: { name: 'Monthly retail volume', unit: 'cars', direction: 'min' }, reliability: { name: 'Portfolio reliability', unit: '/100', direction: 'min' }, contracts: { name: 'Monthly powertrain revenue', unit: '$', direction: 'min' } };
  function ensure(s) {
    if (!s || typeof s !== 'object') return null;
    const e = s.engineeringExpansion = obj(s.engineeringExpansion); e.version = 1; e.nextId = Math.max(1, Math.floor(n(e.nextId, 1)));
    for (const key of ['projects', 'briefs', 'boardTargets', 'supplierReports', 'qualifications', 'history', 'monthly']) if (!Array.isArray(e[key])) e[key] = [];
    e.facilities = obj(e.facilities); e.policy = obj(e.policy); e.ui = obj(e.ui); e.supplyPolicies = obj(e.supplyPolicies); e.qualityPolicies = obj(e.qualityPolicies);
    e.policy.labSlots = Math.round(clamp(n(e.policy.labSlots, 2), 1, 4)); e.policy.supportSlots = Math.round(clamp(n(e.policy.supportSlots, 2), 1, 4)); e.policy.reserve = Math.max(0, n(e.policy.reserve)); e.policy.facilitySupport = clamp(n(e.policy.facilitySupport), 0, 100000);
    for (const key of ['lastProjectDay', 'lastOperatingDay', 'lastClosePeriod', 'facilityFundedDay']) e[key] = n(e[key], -1);
    for (const key of ['mtdDevelopment', 'mtdCapital', 'mtdOperating', 'lifetimeDevelopment', 'lifetimeCapital', 'lifetimeOperating']) e[key] = Math.max(0, n(e[key]));
    D()?.ensure(s); return e;
  }
  function id(s, prefix) { return 'engineering_' + prefix + '_' + ensure(s).nextId++; }
  function record(s, title, detail, hooks = {}) { const e = ensure(s); e.history.unshift({ id: id(s, 'event'), ...date(s), title, detail }); e.history.length = Math.min(e.history.length, 180); hooks.log?.(title + ': ' + detail); }
  function vehicles(s) { return G.MDXCommercial?.vehicles?.(s) || [...(s.vehicles || []), ...(s.vehiclePrograms || []).filter(p => p.status === 'active').map(p => p.vehicle).filter(Boolean)]; }
  function target(s, vehicleId) { return vehicles(s).find(v => String(v.id) === String(vehicleId)); }
  function reserve(s, operating = false) { const e = ensure(s); return Math.max(e.policy.reserve, n(s.industrialEra?.policy?.reserve), n(s.budgetSystem?.[operating ? 'protectOperations' : 'protectProjects'] ? s.budgetSystem.reserveFloor : 0)); }
  function fingerprint(v, s) { const design = numeric(v?.design); for (const key of ['paintColor', 'presentationWheel', 'name']) delete design[key]; const eng = s && engine(s, v), tx = s && transmission(s, v); return JSON.stringify([v?.id, v?.generation, v?.modelYear, v?.engineId, v?.transmissionId, numeric(v?.stats), design, s ? [numeric(eng?.design), numeric(eng?.stats), Object.fromEntries(['torque', 'eff', 'gears', 'type', 'mass', 'reliability'].filter(key => tx?.[key] != null).map(key => [key, tx[key]])), tx?.ratios || []] : null]); }
  function profile(v, draft) { return Object.fromEntries(Object.entries(D().SETUPS).map(([key, def]) => [key, clamp((draft || v?.engineeringSetup || {})[key] ?? def.initial, def.min, def.max)])); }
  function engine(s, v) { return (s.engines || []).find(x => String(x.id) === String(v.engineId || v.design?.engineId)) || v.stats?.engine || null; }
  function transmission(s, v) { return (s.transmissions || []).find(x => String(x.id) === String(v.transmissionId || v.design?.trans)) || G.MD_DATA?.TRANS?.[v.design?.trans] || v.stats?.transmission || null; }
  function electric(v) { return v?.design?.propulsion === 'bev' || v?.electrification?.architecture === 'bev'; }
  function enhanceTunedStats(v, result, draft) {
    const b = D().baseStats(v), t = profile(v, draft), allNeutral = Object.values(t).every(x => x === 0);
    if (allNeutral) return { ...b };
    const r = { ...result }, massFactor = 1 + t.nvh * .004 + t.corrosion * .003 + t.driveline * .007 + t.weatherSealing * .003 - t.lightweight * .012;
    const costFactor = 1 + t.aero * .010 + t.nvh * .014 + t.corrosion * .012 + t.lightweight * .028 + t.driveline * .016 + t.serviceability * .010 + t.weatherSealing * .009 + Math.abs(t.calibration) * .004 + Math.max(0, t.tireGrip) * .008;
    const internalBase = Math.max(1, n(b.manufacturingUnitCost ?? b.unitCost, 2000)), legacyFactor = 1 + t.cooling * .010 + t.brakes * .013 + t.materials * .022;
    r.manufacturingUnitCost = Math.round(internalBase * legacyFactor * costFactor); r.unitCost = r.manufacturingUnitCost + Math.max(0, n(b.unitCost, internalBase) - internalBase);
    const powerFactor = 1 + t.calibration * (electric(v) ? .018 : .025);
    if (Number.isFinite(b.power)) r.power = b.power * powerFactor; if (Number.isFinite(b.hp)) r.hp = b.hp * powerFactor;
    if (Number.isFinite(b.torque)) r.torque = b.torque * (1 + t.calibration * .020);
    r.lb = Math.round(n(result.lb, n(b.lb, 2600)) * massFactor); if (Number.isFinite(b.kg)) r.kg = r.lb / 2.20462;
    r.mpg = clamp(n(result.mpg, 20) * (1 - t.calibration * .017 + t.aero * .012 - t.tireGrip * .012 + t.lightweight * .005), 4, 180);
    r.zero = clamp(n(result.zero, 14) * massFactor / powerFactor, 2.2, 40); r.handling = clamp(n(b.handling, 55) + t.suspension * 2.5 + t.materials * .4 + t.tireGrip * 2.2 + t.lightweight * .8, 10, 99);
    r.comfort = clamp(n(b.comfort, 55) - t.suspension * 3 - t.brakes * .5 + t.nvh * 2 - Math.max(0, t.tireGrip) * .45 - t.lightweight * .6, 10, 99);
    r.quality = clamp(n(b.quality, 65) + t.materials * 1.3, 10, 99); r.safety = clamp(n(b.safety, 40) + t.brakes * 1.2 + t.materials * .5, 10, 99);
    r.reliability = clamp(n(b.reliability ?? b.rel, 70) + t.cooling * 1.2 + t.materials * 1.2 - Math.abs(t.gearing) * .4 + t.corrosion * .7 + t.weatherSealing * .7 + t.driveline * .65 - Math.max(0, t.calibration) * .45 - t.lightweight * .35, 10, 99); if (Number.isFinite(b.rel)) r.rel = r.reliability;
    r.brakingScore = clamp(n(b.brakingScore, n(b.safety, 45)) + t.brakes * 3 + t.tireGrip * 1.4 + t.lightweight * .4, 10, 99);
    r.coolingOpening = clamp(n(b.coolingOpening, n(v.design?.coolingOpening, 50)) + t.cooling * 7, 0, 100); r.aero = clamp(n(b.aero, .45) - t.aero * .009, .20, .80);
    r.tireLifeIndex = clamp(n(b.tireLifeIndex, 100) - t.tireGrip * 10, 30, 150); r.finalDrive = n(b.finalDrive, n(v.design?.finalDrive, 3.55)) * (1 + t.gearing * .055);
    if (Number.isFinite(b.highwayRpm)) r.highwayRpm = b.highwayRpm * (1 + t.gearing * .055);
    if (Number.isFinite(b.drivingRange)) r.drivingRange = b.drivingRange * r.mpg / Math.max(1, n(b.mpg, 20));
    if (electric(v) && Number.isFinite(b.rangeMiles)) r.rangeMiles = b.rangeMiles * (1 - t.calibration * .017 + t.aero * .012 - t.tireGrip * .012 + t.lightweight * .005);
    return r;
  }
  function telemetry(s, v, stats = v?.stats || {}, setup = profile(v)) {
    const eng = engine(s, v), tx = transmission(s, v), es = eng?.stats || {}, design = v?.design || {}, bev = electric(v);
    const hp = Math.max(0, n(stats.power ?? stats.hp, n(es.hp))), torque = Math.max(0, n(stats.torque, n(es.torque, hp * 1.1))), rating = Math.max(1, n(tx?.torque, n(stats.transmission?.torque, torque * 1.15))), torqueMargin = rating * (1 + setup.driveline * .035) / Math.max(1, torque);
    const redline = clamp(n(eng?.design?.redline, 5500), 2500, 12000), topRatio = n(tx?.ratios?.at(-1), bev ? 1 : .90), finalDrive = n(stats.finalDrive, n(design.finalDrive, 3.55)), diameter = Math.max(20, n(design.wheel, 14) + 2 * n(design.tireWidth, 185) * n(design.tireProfile, 75) / 100 / 25.4), cruiseRpm = bev ? null : Math.round(70 * 336 * topRatio * finalDrive / diameter);
    const comfort = n(stats.comfort, 55), reliability = n(stats.reliability ?? stats.rel, 70), brake = n(stats.brakingScore, n(stats.safety, 45)), cooling = n(stats.coolingOpening, n(design.coolingOpening, 50)), load = Math.max(25, hp / 4.2), margin = cooling - load;
    const thermal = clamp(71 + margin * .40 + (reliability - 70) * .30 - Math.max(0, setup.calibration) * 1.1, 10, 99), serviceHours = clamp(3.8 + (design.drivetrain === 'AWD' || design.drivetrain === '4WD' ? .7 : 0) + (eng?.design?.aspiration && eng.design.aspiration !== 'na' ? .5 : 0) - setup.serviceability * .28, 1.2, 8);
    const scores = {
      performance: clamp(105 - n(stats.zero, 14) * 3 + n(stats.handling, 55) * .23, 10, 99), handling: clamp(n(stats.handling, 55) * .80 + brake * .20, 10, 99),
      durability: clamp(reliability - Math.max(0, n(stats.alignmentWear, 1) - 1) * 8 + setup.corrosion * .4, 10, 99), thermal,
      braking: clamp(brake + setup.brakes * 1.4 - Math.max(0, n(stats.lb, 2600) - 3000) / 250, 10, 99),
      safety: clamp(n(stats.safety, 45) * .70 + brake * .30, 10, 99), corrosion: clamp(56 + reliability * .22 + setup.corrosion * 5 + setup.weatherSealing * 1.4, 10, 99),
      quietness: clamp(comfort * .80 + n(es.smoothness, 65) * .20 + setup.nvh * 1.2 - (cruiseRpm === null ? 0 : Math.max(0, cruiseRpm - 2500) / 450), 10, 99),
      economy: clamp(n(stats.mpg, bev ? 80 : 20) * (bev ? .8 : 2.2), 10, 99), driveline: clamp(65 + (torqueMargin - 1) * 65 + reliability * .12, 10, 99),
      wet: clamp(n(stats.handling, 55) * .55 + reliability * .30 + 10 + setup.weatherSealing * 2, 10, 99), service: clamp(100 - serviceHours * 11 + setup.serviceability * 2, 10, 99),
      towing: clamp(thermal * .5 + Math.min(45, n(stats.towingCapability, torque * 6) / 100) * .65 + Math.min(20, torqueMargin * 12), 10, 99),
      emissions: clamp(67 + (n(stats.mpg, 20) - 20) * .6 - Math.max(0, setup.calibration) * 3 + (design.catalyst ? 12 : 0), 10, 99)
    };
    const stoppingFeet = Math.round(clamp(180 - brake * .65 - Math.max(0, setup.tireGrip) * 2, 70, 190)), fadeRetention = clamp(.52 + brake * .004 + setup.brakes * .035, .50, .99);
    const curve = bev ? [] : Array.from({ length: 16 }, (_, i) => { const rpm = Math.round(1000 + i * (redline - 1000) / 15), x = rpm / redline, shape = clamp(.60 + Math.sin(Math.PI * x * .88) * .43 - Math.max(0, x - .78) * 1.25, .35, 1); const tq = Math.min(torque * shape, hp * 5252 / Math.max(1, rpm)); return { rpm, torque: Number(tq.toFixed(1)), power: Number((tq * rpm / 5252).toFixed(1)) }; });
    return { hp, torque, torqueMargin, cruiseRpm, tireDiameter: diameter, redline: bev ? null : redline, thermalMargin: margin, serviceHours, stoppingFeet, fadeRetention, tireLife: n(stats.tireLifeIndex, 100), scores, curve, estimated: true, electric: bev };
  }
  function labQuote(s, vehicleId, route, draft, input = {}) {
    ensure(s); const v = target(s, vehicleId), def = D().TESTS[route]; if (!v || !def) return null;
    const next = profile(v, draft), current = profile(v), verification = input.mode !== 'revision', severity = clamp(n(input.severity, 1), .8, 1.5), repeats = Math.round(clamp(n(input.repeats, 1), 1, 3));
    const changes = verification ? 0 : Object.keys(next).reduce((a, k) => a + Math.abs(next[k] - current[k]), 0), days = Math.ceil((def.days + changes * 1.5) * severity * (.65 + repeats * .35)), cost = era(s, (def.cost + changes * 5500) * severity * (.60 + repeats * .40));
    let reason = n(s.year) < n(def.minYear, 1940) ? 'This test unlocks in ' + def.minYear + '.' : v.active === false || v.productionStatus === 'retired' ? 'Choose an active vehicle or development prototype.' : '';
    if (!reason && !verification && changes === 0) reason = 'Change at least one engineering setting before authorizing a revision.';
    if (!reason && D().ensure(s).labPrograms.some(p => String(p.vehicleId) === String(v.id) && ['active', 'paused', 'review', 'commissioning'].includes(p.status))) reason = 'Resolve the existing test or revision for this vehicle first.';
    if (!reason && n(s.cash) - reserve(s) < cost / days) reason = 'Insufficient cash above the protected reserve.';
    const before = numeric(v.stats), after = verification ? before : numeric(D().tunedStats(v, next));
    return { route, name: def.name, days, cost, daily: cost / days, changes, mode: verification ? 'verify' : 'revision', severity, repeats, before, after, setup: verification ? current : next, telemetry: telemetry(s, v, after, verification ? current : next), available: !reason, reason };
  }
  function authorizeLab(s, vehicleId, route, draft, input = {}, hooks = {}) {
    const v = target(s, vehicleId), q = labQuote(s, vehicleId, route, draft, input); if (!q?.available) return fail(q?.reason || 'Choose a vehicle and valid test route.');
    const p = { id: id(s, 'lab'), detailed: true, vehicleId: v.id, vehicleName: v.name, name: q.name, type: route, mode: q.mode, status: 'active', phase: 'TEST PREPARATION', setup: q.setup, before: q.before, after: q.after, telemetry: q.telemetry, fingerprint: fingerprint(v, s), budget: q.cost, spent: 0, totalDays: q.days, daysRemaining: q.days, severity: q.severity, repeats: q.repeats, climate: ['temperate', 'hot', 'cold', 'wet'].includes(input.climate) ? input.climate : 'temperate', load: clamp(n(input.load, 100), 70, 150), started: date(s), delayedDays: 0 };
    D().ensure(s).labPrograms.push(p); record(s, q.mode === 'revision' ? 'Engineering revision authorized' : 'Validation test authorized', v.name + ' — ' + q.name + ', ' + q.days + ' working days; ' + q.cost + ' authorized, paid only as work is performed.', hooks); return { ok: true, program: p };
  }
  function labReport(s, p) {
    const def = D().TESTS[p.type], domain = def.domain || DOMAINS[p.type] || 'durability', t = p.telemetry, raw = n(t.scores[domain], 60), exposure = (p.severity - 1) * 9 + Math.max(0, p.load - 100) * .07 + (p.climate === 'hot' && ['thermal', 'durability', 'driveline'].includes(domain) ? 4 : p.climate === 'cold' && ['thermal', 'wet', 'service'].includes(domain) ? 3 : p.climate === 'wet' && ['wet', 'braking', 'corrosion'].includes(domain) ? 4 : 0), score = Math.round(clamp(raw - exposure, 10, 99)), threshold = Math.round(60 + Math.max(0, p.severity - 1) * 8), confidence = Math.round(clamp(68 + p.repeats * 7 + (p.severity - 1) * 9, 60, 96));
    const suggestions = { thermal: 'Review cooling headroom, power calibration and sustained-load gearing.', braking: 'Review brake durability, tire grip, rotor capacity and vehicle mass.', durability: 'Review material precision, alignment wear and lightweight-construction tradeoffs.', driveline: 'Review the real transmission torque rating and driveline reinforcement.', corrosion: 'Review coatings and weather sealing for this exposure.', quietness: 'Review cabin isolation, engine smoothness and cruising RPM.', economy: 'Review power calibration, aero refinement, tire compound and mass.', service: 'Review service access and powertrain packaging.', wet: 'Review tire grip, alignment, weather sealing and stability equipment.', safety: 'Review occupant protection and actual braking specification.', performance: 'Review power-to-weight, gearing and traction.', handling: 'Review suspension, tire grip and brake balance.', towing: 'Review cooling, torque rating and towing capability.', emissions: 'Review calibration and emissions-control equipment.' };
    return { id: p.id, detailed: true, vehicleId: p.vehicleId, vehicleName: p.vehicleName, type: p.type, name: p.name, mode: p.mode, domain, score, threshold, pass: score >= threshold, confidence, severity: p.severity, repeats: p.repeats, climate: p.climate, load: p.load, fingerprint: p.fingerprint, candidateFingerprint: JSON.stringify([p.after, p.setup]), before: copy(p.before), after: copy(p.after), setup: copy(p.setup), telemetry: copy(t), cost: p.spent, finding: score >= threshold ? 'This configuration met the selected simulated test threshold.' : suggestions[domain], ...date(s), completedDay: day(s), source: 'simulation_test' };
  }
  function completeLab(s, p, hooks) {
    const v = target(s, p.vehicleId); if (!v) { p.status = 'cancelled'; p.reason = 'The product no longer exists.'; return; }
    const r = labReport(s, p); D().ensure(s).labResults.unshift(r); D().ensure(s).labResults.length = Math.min(D().ensure(s).labResults.length, 120); p.completed = date(s); p.resultId = r.id;
    p.status = fingerprint(v, s) !== p.fingerprint ? 'stale' : p.mode === 'revision' ? 'review' : 'complete'; p.phase = p.status === 'review' ? 'AWAITING SIGNOFF' : p.status === 'stale' ? 'CONFIGURATION CHANGED' : 'RESULT RECORDED';
    record(s, 'Engineering test completed', p.vehicleName + ': ' + r.score + '/100, ' + (r.pass ? 'passed' : 'needs review') + '. Actual spend ' + Math.round(p.spent) + '. ' + (p.status === 'review' ? 'Current production specification is retained until you approve a changeover.' : ''), hooks);
  }
  function jobAction(s, programId, action, hooks = {}) {
    const p = D().ensure(s).labPrograms.find(x => x.id === programId && x.detailed) || ensure(s).projects.find(x => x.id === programId); if (!p) return fail('This program is no longer available.');
    if (action === 'pause' && ['active', 'commissioning'].includes(p.status)) { p.pausedFrom = p.status; p.status = 'paused'; p.phase = 'PAUSED BY MANAGEMENT'; }
    else if (action === 'resume' && p.status === 'paused') { p.status = p.pausedFrom || 'active'; p.phase = 'RESUMING'; }
    else if (action === 'cancel' && ['active', 'paused', 'review', 'commissioning', 'stale'].includes(p.status)) { p.status = 'cancelled'; p.phase = 'CANCELLED'; p.closed = date(s); }
    else if (action === 'up' && ['active', 'paused'].includes(p.status)) { const list = p.detailed ? D().ensure(s).labPrograms : ensure(s).projects, index = list.indexOf(p); if (index > 0) [list[index - 1], list[index]] = [list[index], list[index - 1]]; }
    else return fail('That action is not available for this program.');
    record(s, p.name + ' ' + action, 'Spent cost is retained. Unfinished work follows the selected funding state.', hooks); return { ok: true };
  }
  function changeoverQuote(s, p, method) { const def = CHANGEOVERS[method]; return def && p ? { ...def, method, budget: era(s, def.cost + n(p.budget) * .10, 'construction') } : null; }
  function approveRevision(s, programId, method, hooks = {}) {
    const p = D().ensure(s).labPrograms.find(x => x.id === programId && x.detailed), v = p && target(s, p.vehicleId); if (!p || p.status !== 'review' || !v) return fail('Choose a completed revision awaiting signoff.');
    if (fingerprint(v, s) !== p.fingerprint) { p.status = 'stale'; return fail('The base specification changed. Authorize a new revision against the current product.'); }
    if (!CHANGEOVERS[method]) return fail('Choose a valid changeover method.');
    if (v.productionStatus !== 'production') { applyRevision(s, p, hooks); return { ok: true }; }
    const q = changeoverQuote(s, p, method); if (n(s.cash) - reserve(s) < q.budget / q.days) return fail('Keep one funded tooling day above the protected reserve.');
    p.status = 'commissioning'; p.phase = 'TOOLING CHANGEOVER'; p.changeover = { ...q, spent: 0, daysRemaining: q.days, started: date(s), fundedDay: -1 }; record(s, 'Changeover approved', v.name + ' — ' + q.name + ', ' + q.days + ' funded days; tooling budget ' + q.budget + '.', hooks); return { ok: true };
  }
  function applyRevision(s, p, hooks = {}) {
    const v = target(s, p.vehicleId); if (!v || fingerprint(v, s) !== p.fingerprint) { p.status = 'stale'; p.phase = 'CONFIGURATION CHANGED'; return false; }
    v.engineeringBaseline = D().baseStats(v); v.engineeringSetup = copy(p.setup); v.stats = { ...v.stats, ...copy(p.after) }; v.engineeringApplied = copy(v.stats); v.engineeringRevision = n(v.engineeringRevision) + 1; p.status = 'complete'; p.phase = 'REVISED SPECIFICATION IN PRODUCTION'; p.applied = date(s); p.appliedFingerprint = fingerprint(v, s);
    const report = D().ensure(s).labResults.find(x => x.id === p.resultId); if (report) { report.applied = date(s); report.validatedFingerprint = p.appliedFingerprint; }
    record(s, 'Engineering revision entered production', v.name + ' revision ' + v.engineeringRevision + '. Development ' + Math.round(p.spent) + '; tooling ' + Math.round(n(p.changeover?.spent)) + '. No launch bonus or cash reward.', hooks); return true;
  }
  function facilitiesFor(s, route) { const e = ensure(s); return Object.entries(FACILITIES).filter(([key, d]) => e.facilities[key]?.installed && d.tests.includes(route)); }
  function projectQuote(s, type, targetId, kind) {
    const e = ensure(s), def = type === 'facility' ? FACILITIES[kind] : null, supplier = (s.industrialCompanies || []).find(x => String(x.id) === String(targetId));
    if (type !== 'facility' && !['audit', 'qualification'].includes(type)) return null;
    const days = def?.days || (type === 'audit' ? 18 : 32), cost = era(s, def?.cost || (type === 'audit' ? 27000 : 65000));
    let reason = type === 'facility' && !def ? 'Choose a facility.' : def && n(s.year) < def.year ? 'Available from ' + def.year + '.' : def && e.facilities[kind]?.installed ? 'This facility is already installed.' : type !== 'facility' && (!supplier || !eligibleSupplier(s, supplier)) ? 'Choose an operating physical-component supplier.' : '';
    if (!reason && e.projects.some(p => p.type === type && String(p.targetId) === String(targetId) && p.kind === kind && ['active', 'paused'].includes(p.status))) reason = 'This program is already authorized.';
    if (!reason && type === 'qualification' && e.qualifications.some(q => q.supplierId === targetId && q.expiresPeriod > period(s))) reason = 'This supplier qualification is still current.';
    if (!reason && n(s.cash) - reserve(s) < cost / days) reason = 'Insufficient cash above the protected reserve.';
    return { type, targetId, kind, days, cost, targetName: supplier?.name || s.company, category: def ? 'capital' : 'development', name: def?.name || (type === 'audit' ? 'Supplier process audit' : 'Backup source qualification'), available: !reason, reason };
  }
  function authorizeProject(s, type, targetId, kind, hooks = {}) { const q = projectQuote(s, type, targetId, kind); if (!q?.available) return fail(q?.reason || 'Choose a valid project.'); const p = { id: id(s, 'project'), ...q, status: 'active', spent: 0, totalDays: q.days, daysRemaining: q.days, started: date(s), delayedDays: 0 }; ensure(s).projects.push(p); record(s, q.name + ' authorized', q.days + ' funded days; budget ' + q.cost + '.', hooks); return { ok: true, project: p }; }
  function eligibleSupplier(s, c) { const p = G.MDX_CORP?.componentProfile?.(c.industry); return !!(c && p && p.physical !== false && !p.powertrain && n(s.year) >= Math.max(n(c.founded, 1900), n(p.startYear, 1940)) && !['bankrupt', 'liquidated', 'closed'].includes(c.status) && n(c.capacity) > 0 && n(c.factories, 1) > 0); }
  function suppliers(s) { return (s.industrialCompanies || []).filter(c => eligibleSupplier(s, c)); }
  function supplierSnapshot(s, c) { return { supplierId: c.id, supplierName: c.name, component: c.industry, quality: n(c.quality), reliability: n(c.reliability), cash: n(c.cash), debt: n(c.debt), capacity: n(c.capacity), availableCapacity: n(c.monthUnallocatedCapacity), deliveredCapacity: n(c.monthPlayerComponentCapacityPoints), shortfall: n(s.componentSupply?.lastMonthShortfall?.[c.industry]), stockKits: n(G.MDX_CORP?.componentStockVehicleEquivalent?.(s, c.industry)), contracts: (c.contracts || []).filter(x => x.status === 'active').length, costIndex: n(c.costIndex, 1), ...date(s), period: period(s) }; }
  function completeProject(s, p, hooks) {
    const e = ensure(s); p.status = 'complete'; p.closed = date(s);
    if (p.type === 'facility') e.facilities[p.kind] = { installed: true, cost: p.spent, installedAt: date(s) };
    else { const c = suppliers(s).find(x => String(x.id) === String(p.targetId)); if (!c) { p.status = 'cancelled'; p.phase = 'SUPPLIER NO LONGER OPERATING'; return; } const r = { id: p.id, type: p.type, ...supplierSnapshot(s, c), cost: p.spent, findings: [n(c.reliability) < 80 ? 'Delivery reliability needs a buffer or an alternative source.' : 'Current delivery reliability clears the qualification threshold.', n(c.quality) < 70 ? 'Component quality is below the preferred incoming-inspection standard.' : 'Current component quality meets the preferred process standard.', n(c.cash) < n(c.operatingExpenses) ? 'Cash covers less than one month of reported operating expense.' : 'Current cash covers the reported operating-expense threshold.'] }; e.supplierReports.unshift(r); if (p.type === 'qualification') e.qualifications.push({ supplierId: c.id, component: c.industry, qualifiedPeriod: period(s), expiresPeriod: period(s) + 24, reportId: r.id, cost: p.spent }); }
    p.phase = 'COMPLETE'; record(s, p.name + ' completed', 'Actual spend ' + Math.round(p.spent) + '. Reports preserve the conditions recorded at completion.', hooks);
  }
  function processProjectsDay(s, hooks = {}) {
    const e = ensure(s), now = day(s); if (e.lastProjectDay >= now) return { development: 0, capital: 0, duplicate: true }; e.lastProjectDay = now;
    let development = 0, capital = 0, labSlots = 0, supportSlots = 0; const staff = n(s.departments?.engineering?.staff, 0), usableSlots = Math.min(e.policy.labSlots, Math.max(0, Math.floor(staff / 8)));
    const spend = (p, amount, category) => { s.cash = n(s.cash) - amount; p.spent += amount; if (category === 'capital') { capital += amount; s.mtdCapitalSpend = n(s.mtdCapitalSpend) + amount; e.mtdCapital += amount; e.lifetimeCapital += amount; } else { development += amount; s.mtdDevelopmentSpend = n(s.mtdDevelopmentSpend) + amount; e.mtdDevelopment += amount; e.lifetimeDevelopment += amount; } };
    for (const p of D().ensure(s).labPrograms.filter(x => x.detailed && ['active', 'commissioning'].includes(x.status))) {
      const v = target(s, p.vehicleId); if (!v || v.active === false || v.productionStatus === 'retired') { p.status = 'cancelled'; p.phase = 'PRODUCT NO LONGER ACTIVE'; continue; }
      if (fingerprint(v, s) !== p.fingerprint) { p.status = 'stale'; p.phase = 'CONFIGURATION CHANGED'; continue; }
      if (p.status === 'commissioning') { const x = p.changeover, burn = Math.min(x.budget - x.spent, x.budget / x.days); if (n(s.cash) - reserve(s) < burn) { p.phase = 'CHANGEOVER WAITING FOR FUNDING'; p.delayedDays++; continue; } s.cash -= burn; x.spent += burn; capital += burn; s.mtdCapitalSpend = n(s.mtdCapitalSpend) + burn; e.mtdCapital += burn; e.lifetimeCapital += burn; x.fundedDay = now; x.daysRemaining = Math.max(0, x.daysRemaining - 1); if (!x.daysRemaining) applyRevision(s, p, hooks); continue; }
      if (labSlots >= usableSlots) { p.phase = usableSlots ? 'QUEUED — TEST SLOTS' : 'WAITING FOR ENGINEERS'; p.delayedDays++; continue; } labSlots++;
      const speed = e.facilityFundedDay === now ? 1 + Math.min(.24, facilitiesFor(s, p.type).length * .08) : 1, credit = Math.min(p.daysRemaining, speed), burn = Math.min(p.budget - p.spent, p.budget / p.totalDays * credit);
      if (n(s.cash) - reserve(s) < burn) { p.phase = 'WAITING FOR FUNDING'; p.delayedDays++; continue; }
      spend(p, burn, 'development'); p.daysRemaining = Math.max(0, p.daysRemaining - credit); p.phase = p.daysRemaining > p.totalDays * .35 ? 'INSTRUMENTED TEST CYCLES' : 'ANALYSIS AND REVIEW'; if (p.daysRemaining < .000001) { p.daysRemaining = 0; completeLab(s, p, hooks); }
    }
    for (const p of e.projects.filter(x => x.status === 'active')) {
      if (supportSlots >= e.policy.supportSlots) { p.phase = 'QUEUED — SUPPORT PROJECTS'; p.delayedDays++; continue; } supportSlots++;
      if (p.type !== 'facility' && !suppliers(s).some(x => String(x.id) === String(p.targetId))) { p.status = 'cancelled'; continue; }
      const burn = Math.min(p.cost - p.spent, p.cost / p.totalDays); if (n(s.cash) - reserve(s) < burn) { p.phase = 'WAITING FOR FUNDING'; p.delayedDays++; continue; }
      spend(p, burn, p.category); p.daysRemaining = Math.max(0, p.daysRemaining - 1); p.phase = p.daysRemaining > p.totalDays * .3 ? 'ENGINEERING AND INSTALLATION' : 'VALIDATION'; if (!p.daysRemaining) completeProject(s, p, hooks);
    }
    e.projects = e.projects.filter(x => ['active', 'paused'].includes(x.status)).concat(e.projects.filter(x => !['active', 'paused'].includes(x.status)).slice(-80)); e.supplierReports = e.supplierReports.slice(0, 80); return { development, capital, duplicate: false };
  }
  function setPolicy(s, input = {}) { const p = ensure(s).policy; for (const key of ['labSlots', 'supportSlots']) if (key in input) p[key] = Math.round(clamp(input[key], 1, 4)); if ('reserve' in input) p.reserve = Math.max(0, n(input.reserve)); if ('facilitySupport' in input) p.facilitySupport = clamp(input.facilitySupport, 0, 100000); return { ok: true }; }
  function qualityPolicy(s, vehicleId) { const e = ensure(s), p = e.qualityPolicies[vehicleId] = obj(e.qualityPolicies[vehicleId]); p.inspectionBudget = clamp(n(p.inspectionBudget), 0, 120000); p.holdUnsafe = !!p.holdUnsafe; p.fundedDay = n(p.fundedDay, -1); return p; }
  function setQualityPolicy(s, vehicleId, input) { if (!(s.vehicles || []).some(v => String(v.id) === String(vehicleId))) return fail('Choose a released vehicle.'); const p = qualityPolicy(s, vehicleId); p.inspectionBudget = clamp(input.inspectionBudget, 0, 120000); p.holdUnsafe = !!input.holdUnsafe; return { ok: true }; }
  function productionHold(s, v) { return !!(ensure(s).qualityPolicies[v.id]?.holdUnsafe && (v.defects || []).some(d => d.discovered && !d.recalled && (d.severity === 'critical' || d.safety === true))); }
  function capacityFactor(s, v) { if (productionHold(s, v)) return 0; const p = D().ensure(s).labPrograms.find(x => x.detailed && String(x.vehicleId) === String(v.id) && (x.status === 'commissioning' || x.status === 'paused' && x.pausedFrom === 'commissioning')); if (!p?.changeover) return 1; return p.changeover.method === 'planned' ? 0 : p.changeover.fundedDay === day(s) ? p.changeover.capacity : 1; }
  function qualityProfile(s, v, original) { const p = ensure(s).qualityPolicies[v?.id]; if (!p || p.fundedDay !== day(s) || p.inspectionBudget <= 0) return original; const boost = Math.min(.06, p.inspectionBudget / 120000 * .06); return { ...original, inspectionCatch: clamp(n(original.inspectionCatch) + boost, 0, .985), engineeringInspectionBoost: boost }; }
  function supplyPolicy(s, kind) { const e = ensure(s), p = e.supplyPolicies[kind] = obj(e.supplyPolicies[kind]); p.mode = ['market', 'strict', 'qualified'].includes(p.mode) ? p.mode : 'market'; p.budget = clamp(n(p.budget), 0, 50000); p.coverage = clamp(n(p.coverage, .30), .10, 1); p.paidDays = n(p.paidDays); p.paidPeriod = n(p.paidPeriod, -1); return p; }
  function setSupplyPolicy(s, kind, input) { const def = G.MDX_CORP?.componentProfile?.(kind); if (!def || def.powertrain || def.physical === false) return fail('Choose a physical component category.'); const p = supplyPolicy(s, kind); if (!['market', 'strict', 'qualified'].includes(input.mode)) return fail('Choose a valid fallback policy.'); if (input.mode === 'qualified' && !ensure(s).qualifications.some(q => q.supplierId === input.supplierId && q.component === kind && q.expiresPeriod > period(s))) return fail('Complete a current backup-source qualification first.'); Object.assign(p, { mode: input.mode, supplierId: input.supplierId || '', budget: clamp(input.budget, 0, 50000), coverage: clamp(input.coverage, .10, 1) }); return { ok: true }; }
  function processOperatingDay(s, hooks = {}) {
    const e = ensure(s), now = day(s); if (e.lastOperatingDay >= now) return 0; e.lastOperatingDay = now; let total = 0;
    const pay = base => { const amount = era(s, base, 'wages') / 30; if (amount <= 0 || n(s.cash) - reserve(s, true) - n(hooks.unavoidableDaily) - total < amount) return false; total += amount; return true; };
    if (e.policy.facilitySupport > 0 && Object.values(e.facilities).some(x => x.installed) && pay(e.policy.facilitySupport)) e.facilityFundedDay = now;
    for (const v of s.vehicles || []) { const p = e.qualityPolicies[v.id]; if (v.active !== false && v.productionStatus === 'production' && p?.inspectionBudget > 0 && pay(p.inspectionBudget)) p.fundedDay = now; }
    for (const [kind, p] of Object.entries(e.supplyPolicies)) { if (p.mode !== 'qualified' || p.budget <= 0) continue; if (p.paidPeriod !== period(s)) { p.paidPeriod = period(s); p.paidDays = 0; } if (pay(p.budget)) { p.paidDays++; p.fundedDay = now; } }
    e.mtdOperating += total; e.lifetimeOperating += total; e.lastDailyOperating = total; return total;
  }
  function contingency(s, kind, demand, ordinaryPoints) {
    const e = ensure(s), p = e.supplyPolicies[kind]; if (!p || p.mode === 'market') return null;
    if (p.mode === 'strict') return { points: 0, source: 'strict_contract_only', costPremium: 1 };
    const c = suppliers(s).find(x => x.id === p.supplierId && x.industry === kind), qualified = e.qualifications.some(q => q.supplierId === p.supplierId && q.component === kind && q.expiresPeriod > period(s));
    if (!c || !qualified || p.paidPeriod !== period(s) || p.paidDays < 20 || p.budget <= 0) return { points: 0, source: 'backup_unavailable', costPremium: 1 };
    const marketCoverage = s.difficulty === 'casual' ? .85 : s.difficulty === 'realistic' ? .22 : .42, points = Math.floor(Math.min(demand, Math.max(0, n(c.monthUnallocatedCapacity)), ordinaryPoints / marketCoverage * clamp(p.coverage, .10, 1))); c.monthUnallocatedCapacity = Math.max(0, n(c.monthUnallocatedCapacity) - points);
    return { points, source: 'qualified_backup', supplier: c, supplierId: c.id, supplierName: c.name, quality: n(c.quality, 70), reliability: n(c.reliability, 80), costPremium: 1.18 };
  }
  function createBrief(s, vehicleId, type, months = 12, hooks = {}) { const e = ensure(s), v = target(s, vehicleId), def = BRIEFS[type]; if (!v || !def) return fail('Choose a product and valid engineering brief.'); if (e.briefs.some(b => String(b.vehicleId) === String(vehicleId) && ['active', 'overdue'].includes(b.status))) return fail('This product already has an open engineering brief.'); const b = { id: id(s, 'brief'), vehicleId, vehicleName: v.name, type, name: def.name, targets: copy(def.targets), routes: [...def.routes], createdPeriod: period(s), targetPeriod: period(s) + Math.round(clamp(months, 1, 36)), status: 'active', started: date(s) }; e.briefs.push(b); record(s, 'Engineering brief set', v.name + ' — ' + def.name + '. Results must validate the current configuration.', hooks); return { ok: true, brief: b }; }
  function evidence(s, v) { const stamp = fingerprint(v, s); return D().ensure(s).labResults.filter(r => r.detailed && String(r.vehicleId) === String(v.id) && (r.mode === 'revision' ? r.validatedFingerprint === stamp : r.fingerprint === stamp)); }
  function briefProgress(s, b) { const v = target(s, b.vehicleId); if (!v) return { available: false, complete: false, checks: [] }; const reports = evidence(s, v), t = telemetry(s, v); const checks = Object.entries(b.targets).map(([key, goal]) => { const report = reports.filter(r => r.domain === key).sort((a, z) => z.completedDay - a.completedDay)[0]; return { domain: key, target: goal, estimate: Math.round(n(t.scores[key])), tested: report ? report.score : null, reportId: report?.id || null, pass: !!report && report.pass && report.score >= goal }; }); return { available: true, complete: checks.every(c => c.pass), checks }; }
  function actionBrief(s, briefId, action) { const b = ensure(s).briefs.find(x => x.id === briefId); if (!b || !['active', 'overdue'].includes(b.status) || action !== 'archive') return fail('This brief cannot be archived.'); b.status = 'archived'; return { ok: true }; }
  function ownedCompanies(s) { const rows = [{ id: 'parent', name: s.company || 'Parent company', type: 'parent' }]; for (const c of s.industry || []) if (c.playerSubsidiary || c.acquired && (s.subsidiaries || []).some(x => String(x.manufacturerId || x.id) === String(c.id))) rows.push({ id: 'manufacturer:' + c.id, name: c.name, type: 'manufacturer', entity: c }); for (const c of s.industrialCompanies || []) if (c.parentOwned) rows.push({ id: 'industrial:' + c.id, name: c.name, type: 'industrial', entity: c }); return rows; }
  function companyMetrics(s, companyId) {
    const row = ownedCompanies(s).find(x => x.id === companyId); if (!row) return null; const c = row.entity, parent = row.type === 'parent', summary = s.lastMonthSummary || {}, portfolio = parent ? (s.vehicles || []).filter(v => v.active !== false && v.productionStatus === 'production').map(v => v.stats?.reliability ?? v.stats?.rel) : row.type === 'manufacturer' ? (c.aiCars || []).filter(v => v.active !== false).map(v => v.reliability ?? v.stats?.reliability) : [c.reliability], values = portfolio.map(x => n(x, NaN)).filter(Number.isFinite);
    const revenue = parent ? n(summary.revenue) : n(c.revenue ?? c.monthRevenue), profit = parent ? n(summary.netProfit ?? summary.profit) : n(c.monthNetProfit ?? c.netProfit ?? c.monthProfit);
    return { companyId, name: row.name, type: row.type, cash: parent ? n(s.cash) : n(c.cash), debt: parent ? n(s.debt) : n(c.debt), margin: revenue > 0 ? profit / revenue * 100 : null, sales: row.type === 'industrial' ? null : parent ? (s.vehicles || []).reduce((a, v) => a + n(v.lastMonthSales), 0) : n(c.monthSales), reliability: values.length ? values.reduce((a, v) => a + v, 0) / values.length : null, contracts: parent ? n(s.engineSupply?.lastMonthRevenue) + n(s.transmissionSupply?.lastMonthRevenue) : row.type === 'manufacturer' ? n(c.monthAiPowertrainRevenue) + n(c.monthAiTransmissionRevenue) : n(c.monthContractRevenue), revenue, profit, ...date(s), period: period(s) };
  }
  function createBoardTarget(s, companyId, metric, value, months, hooks = {}) { const e = ensure(s), row = companyMetrics(s, companyId), def = BOARD_METRICS[metric]; if (!row || !def || row[metric] === null) return fail('This company has no recorded value for that target.'); if (e.boardTargets.some(x => x.companyId === companyId && x.metric === metric && ['active', 'overdue'].includes(x.status))) return fail('This company already has an open target for that measure.'); const goal = metric === 'margin' ? clamp(value, -10, 40) : metric === 'reliability' ? clamp(value, 30, 99) : Math.max(0, n(value)), b = { id: id(s, 'target'), companyId, companyName: row.name, metric, value: goal, baseline: row[metric], targetPeriod: period(s) + Math.round(clamp(months, 1, 36)), started: date(s), status: 'active', history: [] }; e.boardTargets.push(b); record(s, 'Board operating target set', row.name + ' — ' + def.name + ' ' + goal + def.unit + '. This records real outcomes and grants no cash reward.', hooks); return { ok: true, target: b }; }
  function boardAction(s, targetId, action) { const b = ensure(s).boardTargets.find(x => x.id === targetId); if (!b || action !== 'archive') return fail('Choose an operating target.'); b.status = 'archived'; return { ok: true }; }
  function setStyle(s, vehicleId, input, hooks = {}) { const v = target(s, vehicleId); if (!v) return fail('Choose a product.'); const selected = {}; for (const [key, choices] of Object.entries(STYLE)) { const value = input[key] || 'original', def = choices[value]; if (!def || n(s.year) < def.year) return fail('That style is not available in this era.'); selected[key] = value; } v.design = obj(v.design); v.design.presentationStyle = selected; record(s, 'Design identity updated', v.name + ' — cosmetic silhouette, lamps and grille. Engineering specification and manufacturing cost are retained.', hooks); return { ok: true }; }
  function processMonth(s, hooks = {}) {
    const e = ensure(s), p = period(s); if (e.lastClosePeriod >= p) return { duplicate: true }; e.lastClosePeriod = p;
    for (const b of e.briefs.filter(x => ['active', 'overdue'].includes(x.status))) { const progress = briefProgress(s, b); if (!progress.available) { b.status = 'archived'; continue; } b.lastChecks = progress.checks; if (progress.complete) { b.status = 'achieved'; b.completed = date(s); record(s, 'Engineering brief achieved', b.vehicleName + ' — ' + b.name + '; current configuration has passing evidence for every required target.', hooks); } else if (p >= b.targetPeriod && b.status !== 'overdue') { b.status = 'overdue'; record(s, 'Engineering brief needs review', b.vehicleName + ' still has unresolved engineering evidence.', hooks); } }
    for (const b of e.boardTargets.filter(x => ['active', 'overdue'].includes(x.status))) { const row = companyMetrics(s, b.companyId); if (!row) { b.status = 'archived'; continue; } b.actual = row[b.metric]; b.history.push({ period: p, actual: b.actual }); b.history = b.history.slice(-36); if (p < b.targetPeriod || b.actual === null) continue; if (BOARD_METRICS[b.metric].direction === 'max' ? b.actual <= b.value : b.actual >= b.value) { b.status = 'achieved'; b.completed = date(s); record(s, 'Board target achieved', b.companyName + ' — ' + BOARD_METRICS[b.metric].name + ': ' + b.actual.toFixed(1) + '.', hooks); } else if (b.status !== 'overdue') { b.status = 'overdue'; record(s, 'Board target overdue', b.companyName + ' — review the actual operating results before choosing another intervention.', hooks); } }
    const snapshot = { period: p, ...date(s), development: e.mtdDevelopment, capital: e.mtdCapital, operating: e.mtdOperating, testsCompleted: D().ensure(s).labResults.filter(r => r.detailed && r.year === s.year && r.month === s.month).length, currentEvidence: vehicles(s).reduce((a, v) => a + evidence(s, v).length, 0) }; e.monthly.push(snapshot); e.monthly = e.monthly.slice(-120); if (s.lastMonthSummary) Object.assign(s.lastMonthSummary, { engineeringDevelopmentSpend: e.mtdDevelopment, engineeringCapitalSpend: e.mtdCapital, engineeringOperatingSpend: e.mtdOperating }); e.mtdDevelopment = 0; e.mtdCapital = 0; e.mtdOperating = 0;
    e.briefs = e.briefs.filter(x => ['active', 'overdue'].includes(x.status)).concat(e.briefs.filter(x => !['active', 'overdue'].includes(x.status)).slice(-80)); e.boardTargets = e.boardTargets.filter(x => ['active', 'overdue'].includes(x.status)).concat(e.boardTargets.filter(x => !['active', 'overdue'].includes(x.status)).slice(-100)); e.qualifications = e.qualifications.filter(x => x.expiresPeriod > p - 24).slice(-160);
    return { duplicate: false, snapshot };
  }
  function forecast(s) {
    const e = ensure(s), jobs = D().ensure(s).labPrograms.filter(p => p.detailed && ['active', 'commissioning'].includes(p.status));
    let development = 0, capital = 0, support = 0;
    for (const p of jobs) { if (p.status === 'commissioning') capital += Math.min(Math.max(0, p.changeover.budget - p.changeover.spent), p.changeover.budget / p.changeover.days * 30); else development += Math.min(Math.max(0, p.budget - p.spent), p.budget / p.totalDays * 30); }
    for (const p of e.projects.filter(p => p.status === 'active')) { const burn = Math.min(Math.max(0, p.cost - p.spent), p.cost / p.totalDays * 30); if (p.category === 'capital') capital += burn; else development += burn; }
    if (Object.values(e.facilities).some(f => f.installed)) support += era(s, e.policy.facilitySupport, 'wages') * (e.policy.facilitySupport > 0 ? 1 : 0);
    for (const v of s.vehicles || []) if (v.active !== false && v.productionStatus === 'production') { const p = e.qualityPolicies[v.id]; if (p?.inspectionBudget > 0) support += era(s, p.inspectionBudget, 'wages'); }
    for (const p of Object.values(e.supplyPolicies)) if (p.mode === 'qualified' && p.budget > 0) support += era(s, p.budget, 'wages');
    return { development, capital, support, total: development + capital + support };
  }
  function summary(s) { const e = ensure(s), jobs = D().ensure(s).labPrograms.filter(x => x.detailed); return { activeTests: jobs.filter(x => ['active', 'paused'].includes(x.status)).length, awaitingSignoff: jobs.filter(x => x.status === 'review').length, changeovers: jobs.filter(x => x.status === 'commissioning' || x.status === 'paused' && x.pausedFrom === 'commissioning').length, development: e.mtdDevelopment, capital: e.mtdCapital, operating: e.mtdOperating, committedDevelopment: jobs.filter(x => ['active', 'paused'].includes(x.status) && x.pausedFrom !== 'commissioning').reduce((a, p) => a + Math.max(0, p.budget - p.spent), 0) + e.projects.filter(x => ['active', 'paused'].includes(x.status) && x.category === 'development').reduce((a, p) => a + p.cost - p.spent, 0), committedCapital: jobs.filter(x => ['commissioning', 'paused'].includes(x.status) && x.changeover).reduce((a, p) => a + p.changeover.budget - p.changeover.spent, 0) + e.projects.filter(x => ['active', 'paused'].includes(x.status) && x.category === 'capital').reduce((a, p) => a + p.cost - p.spent, 0), totalDevelopment: e.lifetimeDevelopment, totalCapital: e.lifetimeCapital, totalOperating: e.lifetimeOperating }; }
  function exportReport(s) { const e = ensure(s); return { company: s.company, date: date(s), costs: summary(s), jobs: copy(D().ensure(s).labPrograms.filter(x => x.detailed)), tests: copy(D().ensure(s).labResults.filter(x => x.detailed)), facilities: copy(e.facilities), briefs: copy(e.briefs), supplyPolicies: copy(e.supplyPolicies), supplierReports: copy(e.supplierReports), qualifications: copy(e.qualifications), boardTargets: copy(e.boardTargets), monthly: copy(e.monthly) }; }
  function testCSV(s) { const quote = x => '"' + String(x ?? '').replaceAll('"', '""') + '"'; return [['vehicle', 'test', 'mode', 'year', 'month', 'score', 'pass_threshold', 'passed', 'repeat_cycles', 'severity', 'load_pct', 'climate', 'actual_cost', 'finding'].join(','), ...D().ensure(s).labResults.filter(r => r.detailed).map(r => [r.vehicleName, r.name, r.mode, r.year, r.month + 1, r.score, r.threshold, r.pass, r.repeats, r.severity, r.load, r.climate, r.cost, r.finding].map(quote).join(','))].join('\n'); }
  G.MDXEngineering = { VERSION: 1, EXTRA_SETUPS, EXTRA_TESTS, FACILITIES, CHANGEOVERS, BRIEFS, STYLE, BOARD_METRICS, ensure, period, day, date, era, numeric, vehicles, target, fingerprint, profile, enhanceTunedStats, telemetry, labQuote, authorizeLab, labReport, jobAction, changeoverQuote, approveRevision, facilitiesFor, projectQuote, authorizeProject, eligibleSupplier, suppliers, supplierSnapshot, processProjectsDay, setPolicy, qualityPolicy, setQualityPolicy, productionHold, capacityFactor, qualityProfile, supplyPolicy, setSupplyPolicy, processOperatingDay, contingency, createBrief, briefProgress, evidence, actionBrief, ownedCompanies, companyMetrics, createBoardTarget, boardAction, setStyle, processMonth, forecast, summary, exportReport, testCSV };
  Object.assign(D().SETUPS, EXTRA_SETUPS); Object.assign(D().TESTS, EXTRA_TESTS);
})();
