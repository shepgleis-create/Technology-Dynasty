'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function load(){
 const W={};W.window=W;
 vm.runInNewContext(fs.readFileSync(path.join(root,'lifecycle-strategy.js'),'utf8'),W,{filename:'lifecycle-strategy.js'});
 return W.MDXLifecycleStrategy;
}
function vehicle(){
 return{id:'v1',name:'Nova',target:'Family',active:true,productionEnabled:true,productionStatus:'production',generation:1,modelYear:1979,msrp:12500,customerSatisfaction:72,lastMonthSales:320,stats:{unitCost:7300,manufacturingUnitCost:7300,reliability:70,quality:66,comfort:63,luxury:24,safety:62,handling:59},lifecycle:{ageMonths:48,freshness:55}};
}
function game(){return{year:1985,month:4,day:9,cash:2300000,modelActions:[],vehicles:[]};}
const base={budget:120000,days:29};
test('old saves have truly neutral quality and budget, preserving production economics',()=>{
 const S=load(),v=vehicle(),state=game(),json=JSON.stringify({state,v,base}),q=S.quote(state,v,'modelyear',base);
 assert.equal(q.budget,base.budget);assert.equal(q.days,base.days);assert.equal(q.extraResearch,0);assert.equal(q.unitCostDelta,0);assert.equal(q.ready,true);
 assert.equal(S.plan(v).qualityTarget,50);assert.equal(JSON.stringify({state,v,base}),json);
});
test('approved equipment choices have incremental engineering funds and days',()=>{
 const S=load(),v=vehicle();
 v.lifecycleStrategy={type:'facelift',equipment:'safety',priceAimPct:3,qualityTarget:65};
 const q=S.quote(game(),v,'facelift',{budget:150000,days:63});
 assert.ok(q.ready);assert.ok(q.budget>150000);assert.ok(q.days>63);assert.ok(q.unitCostDelta>450);
 assert.equal(q.plan.equipment,'safety');assert.equal(q.plan.priceAimPct,3);
});
test('the forecast blocks technology introduced after the current historical year',()=>{
 const S=load(),v=vehicle(),state=game();state.year=1960;
 v.lifecycleStrategy={equipment:'technology',qualityTarget:50};
 const q=S.quote(state,v,'modelyear',base);
 assert.equal(q.ready,false);assert.ok(q.blocked.includes('1980'));assert.ok(q.warnings.some(x=>x.includes('1960')));
});
test('the quote enforces simultaneous program, retired model and initial cash blockers',()=>{
 const S=load(),v=vehicle(),state=game();
 state.cash=0;assert.equal(S.quote(state,v,'generation',base).ready,false);
 state.cash=1000000;state.modelActions.push({vehicleId:v.id,status:'active'});assert.equal(S.quote(state,v,'facelift',base).ready,false);
 state.modelActions=[];v.active=false;v.productionStatus='retired';assert.equal(S.quote(state,v,'modelyear',base).ready,false);
});
test('cost increase and price aim cannot create sales below a positive manufacturing margin',()=>{
 const S=load(),v=vehicle();v.msrp=8000;v.stats.unitCost=7900;v.lifecycleStrategy={equipment:'premium',priceAimPct:-8,qualityTarget:90};
 const state=game(),q=S.quote(state,v,'generation',{budget:950000,days:160});
 assert.ok(q.indicativeMsrp>=7900+q.unitCostDelta);assert.ok(q.estimatedMargin>0);
 const action={lifecycleStrategy:q.plan,budget:q.budget,spent:q.budget*.9};
 S.complete(state,v,'generation',action);
 assert.ok(v.msrp>=v.stats.unitCost*1.10);
});
test('finishing an authorized action changes actual build costs and attributes exactly once',()=>{
 const S=load(),v=vehicle(),state=game();v.lifecycleStrategy={type:'facelift',equipment:'safety',priceAimPct:6,qualityTarget:75};
 const q=S.quote(state,v,'facelift',{budget:300000,days:70});
 const action={lifecycleStrategy:q.plan,budget:q.budget,spent:123456};
 const original=JSON.parse(JSON.stringify(v));
 const first=S.complete(state,v,'facelift',action),cost=v.stats.unitCost,history=v.lifecycleStudioHistory.length;
 assert.ok(first);assert.ok(cost>original.stats.unitCost);
 assert.ok(v.stats.safety>original.stats.safety);assert.ok(v.stats.reliability>original.stats.reliability);
 assert.equal(state.lifecycleStudioAudits.length,1);assert.equal(history,1);
 assert.equal(action.lifecycleStrategyApplied,true);
 assert.equal(S.complete(state,v,'facelift',action),null);assert.equal(v.stats.unitCost,cost);assert.equal(v.lifecycleStudioHistory.length,history);
});
test('AI recommendation is explainable and changes based on age and target segment',()=>{
 const S=load(),v=vehicle(),state=game();
 let suggestion=S.evaluateDirector(state,v);
 assert.equal(suggestion.type,'facelift');assert.equal(suggestion.equipment,'comfort');
 v.lifecycle.ageMonths=102;v.lifecycle.freshness=21;suggestion=S.evaluateDirector(state,v);
 assert.equal(suggestion.type,'generation');assert.ok(suggestion.reason.includes('freshness'));
 v.target='Budget';v.lifecycle.ageMonths=5;v.lifecycle.freshness=95;suggestion=S.evaluateDirector(state,v);
 assert.equal(suggestion.type,'modelyear');assert.equal(suggestion.equipment,'value');
});
test('save and reload preserves strategy and archived action report',()=>{
 const S=load(),v=vehicle(),state=game();v.lifecycleStrategy={type:'generation',equipment:'premium',qualityTarget:80,priceAimPct:7};
 const action={lifecycleStrategy:S.quote(state,v,'generation',{budget:123000,days:120}).plan,spent:200000};
 S.complete(state,v,'generation',action);state.vehicles=[v];state.modelActions=[action];
 const restored=JSON.parse(JSON.stringify(state));
 assert.equal(S.plan(restored.vehicles[0]).equipment,'premium');assert.equal(restored.modelActions[0].lifecycleStrategyApplied,true);
 assert.equal(restored.vehicles[0].lifecycleStudioHistory.length,1);
});
test('model decisions render as first-class direct controls with economic readouts',()=>{
 const S=load(),v=vehicle(),markup=S.renderOne(game(),v,base);
 for(const target of ['data-ls-field="type"','data-ls-field="equipment"','data-ls-authorize','data-ls-advice','UNIT MARGIN EST.','PRICE AIM','QUALITY TARGET','ls-timeline'])assert.ok(markup.includes(target),target);
 assert.ok(!markup.includes('MORE MENU'));
});
test('archived nameplate retooling estimates match existing factory restart contract',()=>{
 const S=load(),v=vehicle(),state=game();v.active=false;v.productionStatus='retired';v.discontinuedYear=1981;
 state.operations={factories:[{active:true,status:'open'}]};const q=S.restartQuote(state,v);
 assert.equal(q.tooling,7300*(6+4*2));assert.equal(q.days,14+4*5);assert.equal(q.ready,true);
 assert.ok(S.renderOne(state,v,base).includes('data-ls-restart'));assert.ok(!S.renderOne(state,v,base).includes('data-ls-authorize'));
});
test('production restart blocks when factory is missing or company lacks tooling cash',()=>{
 const S=load(),v=vehicle(),state=game();v.active=false;v.productionStatus='retired';
 state.operations={factories:[]};assert.equal(S.restartQuote(state,v).ready,false);
 state.operations.factories=[{active:true,status:'operational'}];state.cash=0;
 assert.ok(S.restartQuote(state,v).blocked.includes('cash'));
});
test('active lineup offers model retirement, with persistent audit metadata support',()=>{
 const S=load(),v=vehicle(),state=game();assert.ok(S.renderOne(state,v,base).includes('data-ls-retire'));
 S.record(state,v,'production_retired',{inventory:44});
 assert.equal(state.lifecycleStudioAudits[0].event,'production_retired');assert.equal(v.lifecycleStudioHistory[0].details.inventory,44);
});
test('a retired car restarts after its actual factory tooling countdown without deleting inventory',()=>{
 const W={MDX_CORE:{},MDX:{recordCashTransaction:(state,category,amount,label,meta)=>{
  state.cashTransactions=state.cashTransactions||[];state.cashTransactions.push({category,amount,label,meta});
 }}};
 W.window=W;vm.runInNewContext(fs.readFileSync(path.join(root,'product-lifecycle.js'),'utf8'),W,{filename:'product-lifecycle.js'});
 const L=W.MDXProductLifecycle,v={id:'revive1',name:'Revive 1',active:false,productionStatus:'retired',productionEnabled:false,generation:1,modelYear:1978,discontinuedYear:1980,msrp:8200,stats:{unitCost:4200,quality:60,comfort:55,safety:60,reliability:72},inventory:11};
 const s={year:1984,month:5,day:2,cash:350000,vehicles:[v],modelActions:[],operations:{factories:[{id:'fac',active:true,status:'running'}]},nameplates:[]};
 const cashBefore=s.cash,result=L.restartVehicle(s,v.id);
 assert.equal(result.ok,true);assert.equal(s.cash,cashBefore-result.tooling);assert.equal(s.cashTransactions[0].amount,-result.tooling);
 for(let i=0;i<result.days;i++)L.advanceRelaunches(s);
 assert.equal(v.productionStatus,'production');assert.equal(v.productionEnabled,true);assert.equal(v.active,true);
 assert.equal(v.inventory,11);assert.equal(v.relaunchPlan.status,'completed');
});
test('model retirement cancels active programs but keeps unsold cars and lineage',()=>{
 const W={MDX_CORE:{}};W.window=W;vm.runInNewContext(fs.readFileSync(path.join(root,'product-lifecycle.js'),'utf8'),W,{filename:'product-lifecycle.js'});
 const L=W.MDXProductLifecycle,v=vehicle();v.inventory=33;
 const state=game();state.vehicles=[v];state.modelActions=[{id:'active',vehicleId:v.id,status:'active',daysRemaining:25}];state.nameplates=[];
 const worked=L.discontinueVehicle(state,v.id);
 assert.equal(worked,true);assert.equal(v.productionStatus,'retired');assert.equal(v.inventory,33);
 assert.equal(state.modelActions[0].status,'cancelled');
 assert.ok(v.nameplateId);
});
test('existing action creator uses shared preview quote and snapshots it before development starts',()=>{
 const expansion=fs.readFileSync(path.join(root,'expansion.js'),'utf8'),lifecycle=fs.readFileSync(path.join(root,'product-lifecycle.js'),'utf8'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const tag of ['function modelActionBaseline','modelActionBaseline,startEngineRevision','MDXLifecycleStrategy?.quote?.(state,v,"modelyear"','MDXLifecycleStrategy?.quote?.(state,v,"facelift"','MDXLifecycleStrategy?.quote?.(state,v,"generation"'])assert.ok(expansion.includes(tag),tag);
 assert.equal((expansion.match(/action.lifecycleStrategy=v.lifecycleStrategy&&strategy.plan\?/g)||[]).length,3);
 assert.ok(lifecycle.includes('MDXLifecycleStrategy?.complete?.(state,v,type,action)'));
 assert.ok(lifecycle.includes('MDXLifecycleStrategy?.renderOne?'));
 assert.ok(lifecycle.includes('MDXLifecycleStrategy?.wire?'));
 assert.ok(index.includes('/lifecycle-strategy.js'));assert.ok(index.includes('/lifecycle-strategy.css'));
});
