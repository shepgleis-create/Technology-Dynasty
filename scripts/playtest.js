/* Real browser gameplay: UI authorizations, unmodified daily simulation, and save/reload. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./dev');
const out=path.resolve(__dirname,'../playtest-output');fs.mkdirSync(out,{recursive:true});
const report={flows:[],responsive:[],errors:[]};
const viewports=[{name:'iphone',width:390,height:844},{name:'large-phone',width:430,height:932},{name:'tablet',width:768,height:1024},{name:'compact-desktop',width:1363,height:936},{name:'desktop',width:1440,height:1000}];
const routes=[['home'],['engine'],['vehicle'],['research'],['budget'],['companies'],
 ...['products','transmissions','contracts','planning','families','testing','factories','workforce','departments','quality','platforms','inspector','history'].map(t=>['library',t]),
 ...['regions','industry','customers','dealers','economy','finance','regulation','press','used','motorsport','patents','fleet'].map(t=>['market',t]),
 ...['group','directors','holdings','deals','capital'].map(t=>['finance',t])];
let page,browser,server;
async function settle(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function go(view,tab){await page.evaluate(([v,t])=>MDXGame.navigate(v,t),[view,tab]);await settle();}
async function advance(days){await page.evaluate(n=>MDXQA.advance(n),days);await settle();}
async function reveal(selector){await page.locator(selector).first().evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});}
async function read(fn){return page.evaluate(fn);}
async function check(name,fn){console.log('Checking '+name);await fn();report.flows.push(name);}
async function snap(name){await settle();await page.screenshot({path:path.join(out,name+'.png')});}
async function createCompany(){
 await page.locator('#newCompanyBtn').click();await page.locator('#companyName').fill('Studio Regression Motors');await page.locator('#founderName').fill('Studio QA');
 await page.locator('[data-start-year="1940"]').click();await page.locator('#difficulty').selectOption('casual');await page.locator('#newGameTutorial').uncheck();
 await page.locator('#toHQ').click();await page.locator('#toSummary').click();await page.locator('#foundBtn').click();await page.locator('#screen-game.active').waitFor();await settle();
 assert.equal(await read(()=>MDXGame.getState().year),1940);assert.equal(await read(()=>__MDX_REGRESSION__.ok),true);
}
(async()=>{
 server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,...(process.env.MOTOR_CHROMIUM_PATH?{executablePath:process.env.MOTOR_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.MOTOR_CHROMIUM_PATH?['--single-process','--no-zygote','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
 page=await browser.newPage({viewport:viewports[0],hasTouch:true});page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port);await snap('startup');
 await check('1940 company creation and HQ',createCompany);
 await check('Direct phone navigation opens pages without department menus',async()=>{
  for(const view of ['research','vehicle','library','market','budget','companies','finance','home','engine']){
   await page.locator('.bottom-nav [data-view="'+view+'"]').click();await settle();
   assert.equal(await read(()=>document.querySelector('.game-view.active').id),'view-'+view);
   assert.equal(await page.locator('#studioSheet,#studioDock,.studio-section-picker').count(),0);
  }
  await page.locator('.bottom-nav [data-view="library"]').click();
  await page.locator('#opsTabs [data-opstab="contracts"]').click();
  assert.ok(await page.locator('#opsExpansion [data-ptm-field]').count());
  await page.locator('.bottom-nav [data-view="engine"]').click();
 });
 await check('Engine configuration, authorization, and production release',async()=>{
  const inline=await page.locator('#engineRenderPreview').getAttribute('src');await page.locator('[data-eopt="config"][data-value="V8"]').click();assert.notEqual(await page.locator('#engineRenderPreview').getAttribute('src'),inline);
  await page.locator('[data-eopt="config"][data-value="I4"]').click();await page.locator('#engineName').fill('Studio I4');await page.locator('#saveEngine').click();
  const days=await read(()=>MDXGame.getState().enginePrograms[0].daysRemaining);assert.ok(days>0);await advance(days+1);assert.equal(await read(()=>MDXGame.getState().engines[0].releaseStatus),'released');
 });
 await check('Transmission configuration, authorization, and release',async()=>{
  await go('library','transmissions');assert.equal(await page.locator('#studioTxImage').count(),1);await page.locator('#txFamilyName').fill('Studio M40');await page.locator('[data-txbase="3m"]').click();
  await page.locator('#authorizeTransmissionProgram').click();await advance(await read(()=>MDXGame.getState().transmissionPrograms[0].daysRemaining)+1);assert.equal(await read(()=>MDXGame.getState().transmissions[0].releaseStatus),'released');
 });
 await check('Vehicle configuration, powertrain integration, launch, and production',async()=>{
  await go('vehicle');await page.locator('#vehicleName').fill('Studio Forty');await page.locator('[data-vopt="body"][data-value="sedan"]').click();
  await page.locator('[data-vtab="chassis"]').click();await page.locator('[data-vselect="trans"]').selectOption(await read(()=>MDXGame.getState().transmissions[0].id));await page.locator('[data-powertrain-adapter]').click();
  await advance(await read(()=>MDXGame.getState().powertrainAdapterProjects[0].daysRemaining)+1);await page.locator('[data-vtab="production"]').click();
  await page.locator('[data-vslider="msrp"]').evaluate(e=>{e.value=3000;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.match(await page.locator('#vehicleControls').innerText(),/MARKET AVERAGE/);await page.locator('#saveVehicle').click();await page.locator('#authorizeVehicleProgram').click();
  await advance(await read(()=>MDXGame.getState().vehiclePrograms[0].daysRemaining)+35);assert.equal(await read(()=>MDXGame.getState().vehicles[0].productionStatus),'production');
 });
 await check('Production, dealers, actual sales, and monthly financial close',async()=>{
  await advance(120);const facts=await read(()=>{const s=MDXGame.getState(),v=s.vehicles[0];return{sold:v.lifetimeSales,produced:v.lastMonthProduced,revenue:s.lastMonthSummary.revenue,cash:s.cash,ai:s.industry.some(c=>c.monthSales>0)};});
  assert.ok(facts.sold>0&&facts.produced>0&&facts.revenue>0&&facts.ai);report.sales=facts;
 });
 await check('Vehicle, engine, and transmission asset files with linked applications',async()=>{
  await go('library','products');await reveal('[data-studio-asset^="vehicle:"]');await page.locator('[data-studio-asset^="vehicle:"]').first().click();assert.match(await page.locator('#studioSheet').innerText(),/Studio I4/);const power=await read(()=>Math.round(MDXGame.getState().vehicles[0].stats.power));assert.ok(power>0);assert.ok((await page.locator('#studioSheet').innerText()).includes(power+' pts'));
  await page.locator('[data-linked-engine]').click();assert.match(await page.locator('#studioSheet').innerText(),/Studio Forty/);await page.locator('[data-sheet-close]').click();
  await read(()=>MDXStudio.openAsset('transmission',MDXGame.getState().transmissions[0].id));assert.match(await page.locator('#studioSheet').innerText(),/Studio Forty/);await page.locator('[data-sheet-close]').click();
 });
 await check('Two industrial businesses in one category remain separately manageable',async()=>{
  await go('finance','capital');await page.locator('#corporateMarketPanel').evaluate(e=>e.closest('details').open=true);
  const ids=await page.locator('#corporateMarketPanel [data-corp-buy]').evaluateAll(es=>[...new Set(es.filter(e=>e.offsetHeight&&e.dataset.corpBuy.startsWith('market_transmission_')).map(e=>e.dataset.corpBuy))]);assert.ok(ids.length>=2);
  for(const id of ids.slice(0,2)){await go('finance','capital');await page.locator('#corporateMarketPanel').evaluate(e=>e.closest('details').open=true);await page.locator('[data-corp-buy="'+id+'"]').filter({visible:true}).click();await page.locator('#industrialModal:not(.hidden)').waitFor();assert.match(await page.locator('#industrialModal').innerText(),/INDUSTRIAL COMPANY CONTROL/);await page.locator('#closeIndustrial').click();}
  await go('finance','holdings');for(const id of ids.slice(0,2)){await page.locator('[data-industrial-manage="'+id+'"]').first().click();assert.ok(await page.locator('[data-industrial-company="'+id+'"].active').count());await page.locator('[data-industrial-tab="financials"]').click();await page.locator('#closeIndustrial').click();}
  await page.locator('[data-industrial-manage="'+ids[0]+'"]').first().click();await page.locator('[data-industrial-company="'+ids[1]+'"]').click();assert.ok(await page.locator('[data-industrial-company="'+ids[1]+'"].active').count());await page.locator('[data-industrial-tab="financials"]').click();
  const before=await read(()=>MDXGame.getState().cash);await page.locator('[data-industrial-withdraw]').first().click();assert.ok(await read(()=>MDXGame.getState().cash)>before);await page.locator('#closeIndustrial').click();report.industrialIds=ids.slice(0,2);
 });
 await check('Model-year update, facelift, and new generation retain outgoing sales',async()=>{
  for(const selector of ['[data-my]','[data-face]','[data-gen]']){await go('library','planning');await reveal(selector);const old=await read(()=>MDXGame.getState().vehicles[0].lifetimeSales);await page.locator(selector).first().click();
   const action=await read(()=>MDXGame.getState().modelActions.find(p=>p.status==='active'));assert.ok(action);assert.equal(await read(()=>MDXGame.getState().vehicles[0].active),true);await advance(Math.ceil(action.daysRemaining)+10);assert.ok(await read(()=>MDXGame.getState().vehicles[0].lifetimeSales)>old);
  }assert.ok(await read(()=>MDXGame.getState().vehicles[0].generation)>=2);
 });
 await check('Concept and shared platform development',async()=>{
  await go('library','planning');await page.locator('#conceptProgramName').fill('Project Horizon');await page.locator('#startConceptProgram').click();
  await go('library','platforms');await reveal('#platformName');await page.locator('#platformName').fill('Studio P40');await page.locator('#createPlatform').click();
  const days=await read(()=>Math.max(...MDXGame.getState().conceptPrograms.map(p=>p.daysRemaining),...MDXGame.getState().platformPrograms.map(p=>p.daysRemaining)));await advance(Math.ceil(days)+1);
  assert.ok(await read(()=>MDXGame.getState().conceptPrograms.some(p=>p.status==='complete')));assert.ok(await read(()=>MDXGame.getState().platforms.some(p=>p.name==='Studio P40')));
 });
 await check('Engine supply contract acceptance and revenue/cost reporting',async()=>{
  for(let i=0;i<6;i++){await go('library','contracts');if(await page.locator('[data-contract-accept]').count())break;await advance(60);}
  assert.ok(await page.locator('[data-contract-accept]').count());await page.locator('[data-contract-accept]').first().click();await advance(65);
  const totals=await read(()=>({revenue:MDXGame.getState().lastMonthSummary.engineSupplyRevenue,cost:MDXGame.getState().lastMonthSummary.engineSupplyCost}));assert.ok(totals.revenue>0&&totals.cost>0);report.contract=totals;
 });
 await check('Competitor inspection, acquisition closing, and subsidiary management',async()=>{
  await go('companies');const id=await read(()=>MDXGame.getState().industry.filter(c=>!c.acquired&&!c.ownerId&&c.status==='active').sort((a,b)=>a.valuation-b.valuation)[0].id);
  await page.locator('[data-mfg="'+id+'"]').click();await page.locator('.studio-profile-tabs').waitFor();await page.locator('[data-profile-tab="products"]').click();await page.locator('[data-profile-tab="finance"]').click();await page.locator('#subQuickBtn').click();
  await page.locator('[data-dealslider="premium"]').evaluate(e=>{e.value=55;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#startDealBtn').click();await advance(150);
  const acquisitionDebug=await read(()=>{const st=MDXGame.getState(),dd=st.pendingDeals||[];return {year:st.year,month:st.month,daysPlayed:st.daysPlayed,cash:st.cash,deals:dd.slice(-5).map(x=>({id:x.id,targetId:x.targetId,status:x.status,phase:x.phase,acceptanceChance:x.acceptanceChance,sellerApproval:x.sellerApproval,monthsRemaining:x.monthsRemaining,escrowCash:x.escrowCash})),industry:st.industry.filter(x=>dd.some(d=>d.targetId===x.id)).map(x=>({name:x.name,status:x.status,acquired:x.acquired,ownerId:x.ownerId,valuation:x.valuation})),history:(st.history||[]).slice(0,12).map(x=>x.text||String(x))}});if(!(await read(()=>MDXGame.getState().subsidiaries.length)))console.log('ACQUISITION DIAGNOSTIC',JSON.stringify(acquisitionDebug));
  assert.ok(await read(()=>MDXGame.getState().subsidiaries.length));await go('finance','group');await page.locator('[data-sub-open]').first().click();await page.locator('#subsidiaryModal button').filter({hasText:'FINANCIALS'}).first().click();
  const before=await read(()=>MDXGame.getState().cash);await page.locator('[data-sub-inject]').first().click();assert.equal(Math.round(before-await read(()=>MDXGame.getState().cash)),1000000);await page.locator('#closeSubsidiary').click();
 });
 await check('Contracts selectors preserve focus and scroll during simulation',async()=>{
  await go('library','contracts');await reveal('#opsExpansion [data-ptm-field="ptmJvPartner"]');const select=page.locator('#opsExpansion [data-ptm-field="ptmJvPartner"]');await select.selectOption({index:12});await select.focus();const val=await select.inputValue();const y=await page.locator('.game-main').evaluate(e=>e.scrollTop);await advance(3);assert.equal(await select.inputValue(),val);assert.equal(await read(()=>document.activeElement.dataset.ptmField),'ptmJvPartner');assert.equal(await page.locator('.game-main').evaluate(e=>e.scrollTop),y);await select.evaluate(e=>e.blur());
 });
 await check('Every primary department at five viewport sizes',async()=>{
  for(const viewport of viewports){await page.setViewportSize(viewport);for(const [view,tab] of routes){await go(view,tab);const sizes=await read(()=>({body:document.documentElement.scrollWidth-innerWidth,main:document.querySelector('.game-main').scrollWidth-document.querySelector('.game-main').clientWidth}));assert.ok(sizes.body<=1&&sizes.main<=1,viewport.name+'/'+view+'/'+tab+' overflow '+JSON.stringify(sizes));if(['engine','vehicle'].includes(view)){const controls=await page.locator('#'+view+'Controls').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(controls.scroll<=controls.width+1,viewport.name+'/'+view+' control overflow '+JSON.stringify(controls));}report.responsive.push(viewport.name+'/'+view+(tab?'/'+tab:''));await snap(viewport.name+'-'+view+(tab?'-'+tab:''));}
   await go('engine');const bounds=await page.locator('#engineRenderPreview').boundingBox();assert.ok(bounds.width>200&&bounds.height>130);await page.locator('.studio-spec-button').first().click();await snap(viewport.name+'-spec-sheet');await page.locator('[data-sheet-close]').click();
  }
 });
 await check('Normal play/pause control advances and stops the clock',async()=>{
  await go('home');const old=await read(()=>MDXGame.getState().daysPlayed);await page.locator('#pauseTime').click();await page.waitForFunction(n=>MDXGame.getState().daysPlayed>n,old);await page.locator('#pauseTime').click();assert.equal(await read(()=>MDXGame.getState().timeRunning),false);
 });
 await check('Manual vehicle discontinuation archives products and stops production',async()=>{
  await go('library','planning');await page.locator('[data-model-discontinue]').first().click();assert.equal(await read(()=>MDXGame.getState().vehicles[0].productionStatus),'retired');await advance(7);assert.equal(await read(()=>MDXGame.getState().vehicles[0].active),false);
 });
 await check('Durable save/reload preserves cash, roster, factories, and acquired companies',async()=>{
  const snapshot=()=>{const s=MDXGame.getState();return{cash:s.cash,day:s.daysPlayed,vehicles:s.vehicles.map(v=>v.id),engines:s.engines.map(v=>v.id),transmissions:s.transmissions.map(v=>v.id),factories:s.operations.factories.map(v=>v.id),subs:s.subsidiaries.map(v=>v.id),holdings:s.industrialCompanies.filter(c=>c.parentOwned).map(c=>c.id)};};
  const before=await read(snapshot);await read(()=>MDXGame.save());await page.reload();await page.locator('#continueBtn').click();await page.locator('#screen-game.active').waitFor();assert.deepEqual(await read(snapshot),before);assert.equal(await read(()=>__MDX_REGRESSION__.ok),true);report.finalDate=await read(()=>({year:MDXGame.getState().year,month:MDXGame.getState().month,days:MDXGame.getState().daysPlayed}));
 });
 assert.deepEqual(report.errors,[]);report.ok=true;console.log('PASS: '+report.flows.length+' gameplay flows; '+report.responsive.length+' responsive department checks.');
})().catch(async error=>{report.ok=false;report.failure=error.stack;console.error(error);if(page)await snap('failure').catch(()=>{});process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server?.close();});

