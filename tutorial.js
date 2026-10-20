(() => {
  'use strict';
  const G = typeof window === 'undefined' ? globalThis : window;
  const active = rows => (rows || []).find(p => p.status === 'active');
  const releasedCar = s => (s.vehicles || []).some(v => v.productionStatus === 'production');
  const STEPS = [
    { id: 'engine', title: 'Design your first engine', text: 'Name your engine. Start with I4 and the era’s default parts. Check budget and timing in the specification, then press AUTHORIZE PROGRAM.', view: 'engine', target: '#saveEngine', action: 'OPEN ENGINES', condition: s => !!active(s.enginePrograms) || (s.engines || []).length > 0 },
    { id: 'engine-release', title: 'Finish engine development', text: 'Press ▶ in the time bar to run the calendar. Use 2×, 5× or 10× to speed up. Development spends the quoted budget over time; the engine becomes usable after release.', view: 'library', tab: 'products', target: '#pauseTime', action: 'VIEW ENGINE PROGRAM', condition: s => (s.engines || []).length > 0 },
    { id: 'vehicle', title: 'Build your first car', text: 'In Concept, choose a body and your released engine. In PRICE + LAUNCH, price near the market average. REVIEW & LAUNCH opens the budget and reveal choices; authorize the vehicle program there.', view: 'vehicle', target: '#saveVehicle', action: 'OPEN CAR STUDIO', condition: s => !!active(s.vehiclePrograms) || (s.vehicles || []).length > 0 },
    { id: 'production', title: 'Bring the car to production', text: 'Run time through engineering and pre-production. The program list shows the phase and funding. Your car starts building only after production readiness finishes.', view: 'library', tab: 'products', target: '#programLibrary', action: 'VIEW CAR PROGRAM', condition: releasedCar },
    { id: 'sales', title: 'Make your first sale', text: 'Keep time running. Cars move from the factory to dealers, then to customers. Markets shows your regional sales and dealer stock; a built car is not yet a sale.', view: 'market', tab: 'regions', target: '#marketExpansion', action: 'VIEW SALES', condition: s => releasedCar(s) && (Number(s.lifetimeUnits || 0) > 0 || (s.vehicles || []).some(v => Number(v.lifetimeSales || v.lastMonthSales || 0) > 0)) },
    { id: 'output', title: 'Match production to demand', text: 'Open Production Plan and compare output with sales and unsold stock. Lower output if inventory keeps growing; increase it when demand exceeds available cars.', view: 'library', tab: 'planning', target: '#opsExpansion', action: 'OPEN PRODUCTION PLAN', read: true },
    { id: 'cash', title: 'Check what your sales earned', text: 'Open Treasury. Compare revenue, operating costs and net profit. Keep a cash reserve before funding another engine, car or factory; sales alone do not mean profit.', view: 'budget', target: '#view-budget', action: 'OPEN TREASURY', read: true },
    { id: 'next', title: 'Choose your next project', text: 'Your first car is on sale. R&D unlocks new parts, Test Center improves a real car, and Vehicle Families adds related models. Open History to choose a campaign goal, or finish the guide and keep building.', view: 'library', tab: 'history', target: '#depthLegacy', action: 'VIEW CAMPAIGN GOALS', read: true, optional: true }
  ];
  function ensure(s) {
    const t = s.tutorial && typeof s.tutorial === 'object' && !Array.isArray(s.tutorial) ? s.tutorial : (s.tutorial = {});
    // The old guide was checked by default. It cannot establish an explicit choice.
    if (t.version !== 2) Object.assign(t, { version: 2, optedIn: false, enabled: false, index: 0, completed: [], skipped: [], visited: [], collapsed: false });
    t.optedIn = t.optedIn === true;
    t.index = Math.max(0, Math.min(STEPS.length, Math.round(Number(t.index) || 0)));
    for (const key of ['completed', 'skipped', 'visited']) t[key] = Array.isArray(t[key]) ? [...new Set(t[key].filter(id => STEPS.some(x => x.id === id)))] : [];
    t.finished = t.index >= STEPS.length; t.enabled = t.optedIn && t.enabled === true && !t.finished;
    t.collapsed = t.collapsed === true; return t;
  }
  // Each company starts with an unchecked choice, regardless of the last campaign.
  function preference() { return false; }
  function initialize(s, enabled = false) {
    s.tutorial = { version: 2, optedIn: enabled === true, enabled: enabled === true, index: 0, completed: [], skipped: [], visited: [], collapsed: false, finished: false };
    return s.tutorial;
  }
  function setEnabled(s, enabled) {
    const t = ensure(s);
    if (enabled && t.optedIn && t.finished) return restart(s);
    t.enabled = t.optedIn && enabled === true; return t;
  }
  function restart(s) { if (!ensure(s).optedIn) return false; return initialize(s, true); }
  function current(s) { return STEPS[ensure(s).index] || null; }
  function ready(s) {
    const t = ensure(s), step = current(s);
    return !!step && (step.read ? step.optional || t.visited.includes(step.id) : !!step.condition?.(s));
  }
  function advance(s, skip = false) {
    const t = ensure(s), step = current(s);
    if (!t.enabled || !step || (!skip && !ready(s))) return false;
    const list = skip ? t.skipped : t.completed; if (!list.includes(step.id)) list.push(step.id);
    t.index++; t.finished = t.index >= STEPS.length; if (t.finished) t.enabled = false; return true;
  }
  let root, observer, previousState = null, signature = '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  function save() { G.MDXGame?.save?.(); }
  function clearHighlight() { if (typeof document !== 'undefined') document.querySelectorAll('.tutorial-target').forEach(x => x.classList.remove('tutorial-target')); }
  function remove() {
    observer?.disconnect(); observer = null; root?.remove(); root = null; signature = ''; clearHighlight();
    if (typeof document !== 'undefined') { const main = document.querySelector('.game-main'); main?.classList.remove('has-tutorial'); main?.style.removeProperty('--tutorial-height'); document.querySelector('#depthHQ')?.remove(); }
  }
  function measure() {
    const main = root?.parentElement; if (main) main.style.setProperty('--tutorial-height', (Math.ceil(root.getBoundingClientRect().height) + 8) + 'px');
  }
  function matches(step) {
    if (!document.querySelector('#view-' + step.view + '.active')) return false;
    if (!step.tab) return true;
    const tab = document.querySelector(step.view === 'library' ? '#opsTabs button.active' : '#marketTabs button.active');
    return tab?.dataset[step.view === 'library' ? 'opstab' : 'markettab'] === step.tab;
  }
  function showStep(s) {
    const step = current(s); if (!step || !ensure(s).enabled) return;
    G.MDXGame?.navigate?.(step.view, step.tab);
    const t = ensure(s); if (!t.visited.includes(step.id)) t.visited.push(step.id);
    // Stay in the page. Never cover a control or silently run the clock.
    clearHighlight();
    const element = document.querySelector(step.target);
    if (element) {
      element.classList.add('tutorial-target');
      if (!['engine', 'vehicle'].includes(step.view) && step.target !== '#pauseTime') {
        const main = document.querySelector('.game-main'), top = element.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - (root?.getBoundingClientRect().height || 0) - 10;
        main.scrollTo({ top: Math.max(0, top), behavior: G.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }
    render(s, true); save();
  }
  function status(s, step) {
    const p = step.id === 'engine-release' ? active(s.enginePrograms) : step.id === 'production' ? active(s.vehiclePrograms) || (s.vehicles || []).find(v => v.productionStatus === 'preproduction') : null;
    if (p) {
      const days = Math.ceil(Number(p.daysRemaining ?? p.releaseDaysRemaining ?? 0)), paused = p.userPaused || /funding|paused/i.test(p.phase || p.releasePhase || '');
      return (p.name || p.vehicle?.name || 'Program') + ' · ' + (paused ? (p.userPaused ? 'Paused — resume in Products' : 'Waiting for funding — check Treasury') : days + ' work days left') + (p.budget ? ' · ' + money(p.spent) + ' / ' + money(p.budget) : '');
    }
    if (step.id === 'sales') return 'Cars ready · run the calendar to stock dealers and reach customers.';
    return '';
  }
  function render(s, force = false) {
    if (typeof document === 'undefined') return;
    if (!s || !document.querySelector('#screen-game.active') || !ensure(s).enabled) { remove(); return; }
    const t = ensure(s), step = current(s);
    if (previousState !== s) { signature = ''; previousState = s; clearHighlight(); }
    if (step.read && matches(step) && !t.visited.includes(step.id)) { t.visited.push(step.id); save(); }
    const isHere = matches(step), detail = status(s, step), canAdvance = ready(s), key = [t.index, t.collapsed, isHere, detail, canAdvance].join(':');
    if (root?.isConnected && !force && key === signature) return; signature = key;
    const main = document.querySelector('.game-main'); if (!main) return;
    if (!root?.isConnected) {
      root = document.createElement('aside'); root.id = 'tutorialGuide'; root.setAttribute('aria-label', 'Optional first-car tutorial'); main.prepend(root); main.classList.add('has-tutorial');
      if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(measure); observer.observe(root); }
    }
    root.className = 'tutorial-guide' + (t.collapsed ? ' collapsed' : '');
    const title = `<span class="tutorial-count">${t.index + 1}/${STEPS.length}</span><strong>${esc(step.title)}</strong>`;
    root.innerHTML = t.collapsed
      ? `<div class="tutorial-heading"><button type="button" class="tutorial-resume" data-guide-expand aria-label="Expand tutorial">${title}</button><button type="button" class="tutorial-off" data-guide-off>TURN OFF</button></div>`
      : `<div class="tutorial-heading"><div>${title}</div><button type="button" class="tutorial-off" data-guide-off>TURN OFF</button><button type="button" class="tutorial-minimize" data-guide-collapse aria-label="Minimize tutorial">−</button></div><p>${esc(step.text)}</p>${detail ? `<p class="tutorial-status" role="status">${esc(detail)}</p>` : ''}<div class="tutorial-actions"><button type="button" class="btn hero" data-guide-show>${esc(isHere ? 'HIGHLIGHT CONTROL' : step.action)} →</button>${step.read ? `<button type="button" class="btn secondary" data-guide-next ${canAdvance ? '' : 'disabled'}>${step.id === 'next' ? 'FINISH TUTORIAL' : 'CONTINUE'}</button>` : '<span class="tutorial-auto">Advances when you complete this action.</span>'}<button type="button" class="tutorial-skip" data-guide-skip>Skip step</button></div>`;
    root.onclick = e => {
      const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-guide-expand')) t.collapsed = false;
      if (b.hasAttribute('data-guide-collapse')) t.collapsed = true;
      if (b.hasAttribute('data-guide-show')) { showStep(s); return; }
      if (b.hasAttribute('data-guide-next')) advance(s);
      if (b.hasAttribute('data-guide-skip')) advance(s, true);
      if (b.hasAttribute('data-guide-off')) setEnabled(s, false);
      clearHighlight(); save(); render(s, true);
    };
    measure();
  }
  function tick(s) {
    if (!s) return;
    const t = ensure(s); let changed = false;
    while (t.enabled && current(s)?.condition && ready(s)) { advance(s); changed = true; }
    if (changed) { clearHighlight(); save(); }
    render(s);
  }
  function install() {
    if (typeof document === 'undefined') return;
    const checkbox = document.querySelector('#newGameTutorial'); if (checkbox) checkbox.checked = false;
    G.addEventListener('mdx:state', () => tick(G.MDXGame?.getState?.()));
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-opstab], [data-markettab]')) return;
      tick(G.MDXGame?.getState?.());
    });
  }
  G.MDXTutorial = { STEPS, ensure, preference, initialize, setEnabled, restart, current, ready, advance, render, tick, install };
})();
