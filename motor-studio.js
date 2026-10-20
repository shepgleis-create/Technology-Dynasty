(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=x=>Number.isFinite(Number(x))?Number(x):0, count=x=>Math.round(num(x)).toLocaleString('en-US');
  const money=x=>{const n=num(x),a=Math.abs(n);return(n<0?'−':'')+'$'+(a>=1e9?(a/1e9).toFixed(2)+'B':a>=1e6?(a/1e6).toFixed(2)+'M':a>=1e3?(a/1e3).toFixed(1)+'K':Math.round(a).toLocaleString('en-US'));};
  const api=()=>window.MDXGame, state=()=>api()?.getState(), visuals=()=>window.MDXRenderLibrary;
  let observer,frame=0,sheetReturn=null,sheetCleanup=null;
  function navigate(view,tab){closeSheet();api()?.navigate(view,tab==='market'&&view==='finance'?'capital':tab);if(view==='finance'&&tab==='market')requestAnimationFrame(()=>{const panel=$('#corporateMarketPanel');if(panel){panel.closest('details').open=true;panel.closest('details').scrollIntoView({block:'start'});}});schedule();}
  function closeSheet(){const sheet=$('#studioSheet');if(!sheet)return;sheetCleanup?.();sheetCleanup=null;sheet.remove();document.body.classList.remove('studio-sheet-open');sheetReturn?.focus?.();}
  function sheet(title,content){closeSheet();sheetReturn=document.activeElement;const root=document.createElement('div');root.id='studioSheet';root.className='studio-sheet';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','studioSheetTitle');root.innerHTML=`<div class="studio-sheet-card"><div class="studio-sheet-head"><div><span class="eyebrow">MOTOR DYNASTY / ASSET FILE</span><h2 id="studioSheetTitle">${esc(title)}</h2></div><button class="icon-btn" data-sheet-close aria-label="Close details">×</button></div>${content}</div>`;document.body.append(root);document.body.classList.add('studio-sheet-open');root.querySelector('[data-sheet-close]').addEventListener('click',closeSheet);root.addEventListener('click',e=>{if(e.target===root)closeSheet();});root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeSheet();return;}if(e.key==='Tab'){const buttons=[...root.querySelectorAll('button,input,select,a,summary')].filter(x=>!x.disabled&&x.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});root.querySelector('[data-sheet-close]').focus();return root;}
  function grid(rows){return'<div class="studio-detail-grid">'+rows.filter(x=>x[1]!==undefined&&x[1]!==null).map(([label,value])=>`<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')+'</div>';}
  function assets(items,kind){return items.length?`<div class="studio-asset-list">${items.map(v=>`<button data-asset="${kind}:${esc(v.id)}"><b>${esc(v.name)}</b><span>${kind==='vehicle'?esc(v.modelYear||v.createdYear||''):esc(v.design?.config||v.type||'')} →</span></button>`).join('')}</div>`:'<p class="studio-detail-note">No released vehicles use this asset yet. Choose it in the vehicle studio after production release.</p>';}
  function bindAssets(root){root.querySelectorAll('[data-asset]').forEach(b=>b.addEventListener('click',()=>{const [kind,...id]=b.dataset.asset.split(':');openAsset(kind,id.join(':'));}));}
  function openAsset(kind,id){
    const s=state();if(!s)return;const collection=kind==='vehicle'?s.vehicles:kind==='engine'?s.engines:s.transmissions,entry=(collection||[]).find(v=>String(v.id)===String(id));if(!entry)return;
    const d=entry.design||entry,stats=entry.stats||entry,license=(s.powertrainMarket?.licenses||[]).find(l=>l.id===entry.licenseId);
    let content='',linked=[];
    if(kind==='vehicle'){
      const engine=(s.engines||[]).find(e=>String(e.id)===String(d.engineId)),tx=(s.transmissions||[]).find(t=>String(d.trans||entry.transmissionId||'').includes(String(t.id))),actualStatus=entry.productionStatus||(entry.active?'production':'preproduction'),life=entry.lifecycle||{},evo=entry.designEvolution||{};
      const statuses=['Concept','Development','Pre-production','Production','Yearly update','Facelift','New generation','Discontinued'],position=['retired','discontinued'].includes(actualStatus)?7:actualStatus==='development'?1:actualStatus==='preproduction'?2:entry.active?3:2;
      content=`<img class="studio-sheet-hero" src="${visuals().vehicleSrc(d,stats,{name:entry.name,modelYear:entry.modelYear||entry.createdYear||s.year,generation:entry.generation||1,visualSeed:entry.id})}" alt="${esc(entry.name)} vehicle design"><div class="studio-lifecycle" aria-label="Vehicle lifecycle">${statuses.map((t,i)=>`<span class="${i===position?'active':''}">${t}</span>`).join('')}</div>`;
      content+=grid([['Manufacturer',s.company],['Model year / generation',(entry.modelYear||entry.createdYear||s.year)+' / G'+(entry.generation||1)],['Body / segment',(d.body||'sedan')+' / '+(stats.className||d.target||entry.segment||'')],['Platform',(s.platforms||s.vehiclePlanning?.platforms||[]).find(p=>String(p.id)===String(d.platformId))?.name||(d.platformId==='new'?'Dedicated platform':d.platformId||'Dedicated platform')],['Engine',engine?.name||entry.engineName||(['ev','bev'].includes(d.propulsion)?'Electric drive':'External / legacy power unit')],['Transmission',tx?.name||entry.transmissionName||String(d.trans||'').toUpperCase()],['Drivetrain',d.drivetrain||'—'],['Power',Math.round(num(stats.power||stats.hp))+' hp'],['Torque',stats.torque||stats.tq?Math.round(num(stats.torque||stats.tq))+' lb-ft':undefined],['Mass',stats.mass||stats.weight?count(stats.mass||stats.weight)+' lb':undefined],['Efficiency',num(stats.mpg).toFixed(1)+' MPG'],['MSRP',money(entry.msrp||d.msrp)],['Manufacturing cost',money(stats.manufacturingUnitCost||stats.unitCost||stats.cost)],['Monthly production',count(entry.mtdProduced)],['Inventory',count(entry.inventory)],['Sales this month',count(entry.mtdSales)],['Lifetime sales',count(entry.lifetimeSales)],['Reliability',Math.round(num(stats.reliability||stats.rel))+' / 100'],['Quality',Math.round(num(stats.quality||d.quality))+' / 100'],['Reception',entry.launchReception?.rating||entry.launchReception?.verdict],['Lifecycle automation',life.autoUpdate===false?'Manual control':'See production plan'],['Refresh work',entry.refreshProgram?.status||evo.lastUpdateType||'No active refresh']] );
      const inv=num(entry.inventory),sales=num(entry.lastMonthSales||entry.mtdSales),months=sales>0?inv/sales:0;
      if(inv>0)content+=`<p class="studio-detail-note">${sales>0?`Inventory covers approximately ${months.toFixed(1)} months at the latest sales pace.`:'Inventory exists with no recorded recent sales. Check dealer reach, pricing, demand and production assignments in the production plan.'}</p>`;
      content+=`<div class="studio-product-actions"><button class="btn hero" data-manage-product>PRODUCTION & LIFECYCLE →</button>${engine?'<button class="btn secondary" data-linked-engine>ENGINE FILE →</button>':''}${tx?'<button class="btn secondary" data-linked-tx>GEARBOX FILE →</button>':''}</div>`;
      const root=sheet(entry.name,content);root.querySelector('[data-manage-product]').addEventListener('click',()=>{navigate('library','planning');requestAnimationFrame(()=>$(`[data-lifecycle-card="${CSS.escape(String(id))}"]`)?.scrollIntoView({block:'start'}));});root.querySelector('[data-linked-engine]')?.addEventListener('click',()=>openAsset('engine',engine.id));root.querySelector('[data-linked-tx]')?.addEventListener('click',()=>openAsset('transmission',tx.id));return;
    }
    if(kind==='engine'){
      linked=(s.vehicles||[]).filter(v=>String(v.design?.engineId||v.engineId)===String(id));
      content=`<img class="studio-sheet-hero" src="${visuals().engineSrc(d,stats)}" alt="${esc(d.config)} engine architecture">`+grid([['Architecture',d.config],['Displacement',num(stats.disp).toFixed(2)+' L'],['Power',Math.round(num(stats.power||stats.hp))+' hp'],['Torque',Math.round(num(stats.torque||stats.tq))+' lb-ft'],['Aspiration',d.aspiration||'Naturally aspirated'],['Fuel system',d.fuel],['Block / head',(d.block||'')+' / '+(d.headMaterial||d.head||'')],['Bore × stroke',d.bore+' × '+d.stroke+' mm'],['Redline',count(d.redline)+' rpm'],['Manufacturing cost',money(stats.cost)],['Mass',count(stats.mass)+' lb'],['Reliability',Math.round(num(stats.rel||stats.reliability))+' / 100'],['Generation / revision','G'+(entry.generation||1)+' / R'+(entry.revision||1)],['Production release',entry.createdYear],['Vehicles using engine',linked.length],['External units supplied',count(entry.externalUnits)]])+`<h3>Vehicle applications</h3>${assets(linked,'vehicle')}<p class="studio-detail-note">Supply contracts and licensing terms are available in Operations → Contracts.</p><button class="btn hero" data-open-contracts>CONTRACTS & LICENSING →</button>`;
    }else{
      linked=(s.vehicles||[]).filter(v=>String(v.design?.trans||v.transmissionId||'').includes(String(id)));
      content=`<img class="studio-sheet-hero" src="${visuals().transmissionSrc(d,stats)}" alt="${esc(entry.type)} transmission">`+grid([['Architecture',entry.type],['Ratios',entry.gears||'Continuously variable'],['Torque rating',count(entry.torque)+' lb-ft'],['Mechanical efficiency',(num(entry.eff)*100).toFixed(1)+'%'],['Mass',count(entry.mass)+' lb'],['Reliability',Math.round(num(entry.reliability))+' / 100'],['Unit cost',money(entry.cost)],['Shift quality',Math.round(num(entry.shift))+' / 100'],['Refinement',Math.round(num(entry.smoothness))+' / 100'],['Serviceability',Math.round(num(entry.serviceability))+' / 100'],['Compatible drivetrains',(entry.drivetrainCompat||[]).join(', ')],['Layouts',(entry.layoutCompat||[]).join(', ')],['Generation / revision','G'+(entry.generation||1)+' / R'+(entry.revision||1)],['Vehicles using gearbox',linked.length]])+`<h3>Vehicle applications</h3>${assets(linked,'vehicle')}<button class="btn hero" data-open-contracts>CONTRACTS & LICENSING →</button>`;
    }
    if(license)content+=grid([['Licensed from',license.licensorName],['License status',license.status],['Royalty / unit',money(license.royaltyPerUnit)],['License tooling',license.toolingStatus],['Licensed units produced',count(license.lifetimeLicensedUnits)]]);
    const root=sheet(entry.name,content);bindAssets(root);root.querySelector('[data-open-contracts]')?.addEventListener('click',()=>navigate('library','contracts'));
  }
  function engineeringSheet(kind){
    const root=$(`#view-${kind}`),rows=[...root.querySelectorAll('.spec-big,.spec-row')].map(x=>[x.querySelector('span')?.textContent,x.querySelector('b')?.textContent]);
    const warning=root.querySelector('.engineering-warning')?.textContent||'';
    const spec=kind==='engine'?api()?.engineSpec():api()?.vehicleSpec(),title=kind==='engine'?state()?.engineDraft?.name||'Live engine specification':state()?.vehicleDraft?.name||'Live vehicle specification';
    let content=grid(rows)+`<p class="studio-detail-note">${esc(warning)}</p>`;
    if(kind==='vehicle'){
      const benchmark=root.querySelector('.market-benchmark-control');if(benchmark)content+=`<div class="panel">${esc(benchmark.textContent)}</div>`;
    }
    if(spec?.warnings?.length)content+=`<p class="studio-detail-note">${spec.warnings.map(esc).join(' ')}</p>`;
    const technical=root.querySelector('.technical-details-body');if(technical){const clone=technical.cloneNode(true);clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));content+=`<details class="technical-board"><summary>Complete engineering sheet</summary>${clone.outerHTML}</details>`;}
    const assetSheet=sheet(title,content),interactive=root.querySelector('.technical-visual-toggle');
    if(interactive){const parent=interactive.parentNode,next=interactive.nextSibling;interactive.classList.add('studio-interactive-view');assetSheet.querySelector('.studio-sheet-card').append(interactive);sheetCleanup=()=>{interactive.open=false;interactive.classList.remove('studio-interactive-view');parent.insertBefore(interactive,next?.parentNode===parent?next:null);};}
  }
  function productCards(){
    const s=state();if(!s)return;
    $$('[data-route-type="vehicle"],[data-route-type="engine"],[data-route-type="transmission"]').filter(x=>x.classList.contains('engine-card')).forEach(card=>{
      if(card.querySelector('[data-studio-asset]'))return;const kind=card.dataset.routeType,id=card.dataset.routeId,collection=kind==='vehicle'?s.vehicles:kind==='engine'?s.engines:s.transmissions,entry=(collection||[]).find(e=>String(e.id)===String(id));if(!entry)return;
      if(kind==='transmission'&&!card.querySelector('.catalog-preview')){const preview=document.createElement('div');preview.className='catalog-preview';preview.innerHTML=`<img src="${visuals().transmissionSrc(entry,entry)}" alt="${esc(entry.type)} gearbox">`;card.querySelector('.engine-card-top')?.after(preview);}
      const button=document.createElement('button');button.type='button';button.className='btn secondary wide';button.dataset.studioAsset=kind+':'+id;button.textContent='OPEN '+(kind==='transmission'?'GEARBOX':kind.toUpperCase())+' FILE →';button.addEventListener('click',()=>openAsset(kind,id));card.querySelector('.catalog-preview')?.after(button)||card.append(button);
    });
  }
  function marketShortcut(){const root=$('#industrialOwnershipPanel');if(!root?.children.length||root.querySelector('[data-browse-market]'))return;const b=document.createElement('button');b.type='button';b.className='btn secondary';b.dataset.browseMarket='';b.textContent='BROWSE CORPORATE MARKET →';b.addEventListener('click',()=>navigate('finance','market'));root.querySelector('.budget-section-head')?.after(b)||root.prepend(b);}
  function transmissionStudio(){
    const s=state(),root=$('#opsExpansion'),lab=root?.querySelector('.transmission-lab-layout');if(!s||!lab)return;
    lab.classList.add('transmission-engineering');
    if(!root.querySelector('.studio-tx-hero')){const hero=document.createElement('div');hero.className='studio-tx-hero';hero.innerHTML='<img id="studioTxImage" alt="Live transmission architecture"><div><div id="studioTxReadout"></div></div>';lab.before(hero);}
    const spec=api()?.transmissionSpec();if(spec){const img=$('#studioTxImage'),src=visuals().transmissionSrc(s.transmissionDraft,spec);if(img.src!==src)img.src=src;const readout=$('#studioTxReadout'),content=grid([['TYPE',spec.type],['GEARS',spec.gears||'CVT'],['TORQUE',count(spec.torque)+' lb-ft'],['EFFICIENCY',(num(spec.eff)*100).toFixed(1)+'%'],['UNIT COST',money(spec.cost)],['MASS',count(spec.mass)+' lb']]);if(readout.innerHTML!==content)readout.innerHTML=content;}

  }
  function navigationState(){
    const view=$('.game-view.active')?.id.replace('view-','');
    $$('.command-nav button[data-view],.bottom-nav button[data-view]').forEach(b=>{
      const active=b.dataset.view===view;
      b.classList.toggle('active',active);
      if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
  }
  function engineeringButtons(){['engine','vehicle'].forEach(kind=>{const root=$(`#view-${kind} .render-preview-stage`);if(!root||root.querySelector('.studio-spec-button'))return;const b=document.createElement('button');b.className='studio-spec-button';b.type='button';b.textContent='SPECIFICATION ↗';b.addEventListener('click',()=>engineeringSheet(kind));root.append(b);});}
  function companyProfile(){
    const root=$('#manufacturerDetail');if(!root?.children.length||root.querySelector('.studio-profile-tabs'))return;
    const children=[...root.children],panes={overview:[],finance:[],products:[],engineering:[],strategy:[],history:[]};
    for(const node of children){const c=node.classList;if(c.contains('company-kpis'))panes.overview.push(node);else if(c.contains('company-history-panel'))panes.history.push(node);else if(c.contains('rival-lineup'))panes.products.push(node);else if(c.contains('rival-engineering'))panes.engineering.push(node);else if(c.contains('rival-intelligence-suite')||c.contains('rival-operating-decisions')||c.contains('rival-budget'))panes.strategy.push(node);else if(c.contains('rival-financials'))panes[/Strategy|ownership memory/.test(node.textContent)?'strategy':'finance'].push(node);else if(c.contains('notice')||c.contains('history-pressure'))panes.strategy.push(node);else if(c.contains('deal-route-grid')||c.contains('deal-actions'))panes.overview.push(node);}
    const tabs=document.createElement('div');tabs.className='studio-profile-tabs';tabs.setAttribute('role','tablist');
    const labels={overview:'Overview',finance:'Financials',products:'Lineup',engineering:'Powertrain',strategy:'Strategy',history:'History'};
    for(const [id,nodes] of Object.entries(panes)){if(!nodes.length)continue;const pane=document.createElement('div');pane.className='studio-profile-pane';pane.dataset.profilePane=id;nodes.forEach(n=>pane.append(n));root.append(pane);const b=document.createElement('button');b.type='button';b.textContent=labels[id];b.dataset.profileTab=id;b.setAttribute('role','tab');b.addEventListener('click',()=>{tabs.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',x===b);});root.querySelectorAll('[data-profile-pane]').forEach(x=>x.classList.toggle('active',x.dataset.profilePane===id));$('#rivalDetailModal .modal-card').scrollTop=0;});tabs.append(b);}
    const actions=root.querySelector('.rival-quick-actions');(actions||root.querySelector('h2')||root.firstChild).after(tabs);tabs.querySelector('button')?.click();
    const kpis=root.querySelector('.company-kpis');if(kpis?.children.length>9){const details=document.createElement('details');details.className='studio-profile-indicators';details.innerHTML='<summary>Complete company indicators</summary><div class="company-kpis"></div>';[...kpis.children].slice(9).forEach(n=>details.lastChild.append(n));kpis.after(details);}
  }
  function enhance(){
    frame=0;observer?.disconnect();
    try{engineeringButtons();companyProfile();marketShortcut();productCards();transmissionStudio();navigationState();}catch(error){console.error('Motor studio presentation',error);}
    observer?.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(enhance);}
  observer=new MutationObserver(schedule);
  window.addEventListener('mdx:state',schedule);window.addEventListener('mdx:ready',schedule);
  document.addEventListener('click',e=>{if(e.target.closest('[data-txchoice],[data-txbase]'))schedule();});document.addEventListener('input',e=>{if(e.target.closest('.transmission-lab-layout'))schedule();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
  window.MDXStudio={openAsset,closeSheet,refresh:schedule};
  enhance();
})();
