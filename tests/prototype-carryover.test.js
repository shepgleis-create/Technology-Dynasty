'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'..');
function load(which,extra={}){const W={MDX:{engineeringSpeed:()=>1,modelActionBaseline:()=>({budget:1200000,days:155})},...extra};W.window=W;
 vm.runInNewContext(fs.readFileSync(path.join(dir,which),'utf8'),W,{filename:which});return W;}
function vehicle(){return{id:'v1',name:'Aurora',active:true,productionEnabled:true,productionStatus:'production',modelYear:1980,generation:1,createdYear:1980,platformId:'p1',engineId:'e1',transmissionId:'t1',target:'Mainstream',msrp:17000,stats:{unitCost:8900,manufacturingUnitCost:8900,reliability:75,quality:78,safety:65,handling:70},lifecycle:{ageMonths:48,freshness:64},lifetimeSales:18000};}
function state(){const v=vehicle();return{year:1985,month:2,day:4,cash:4000000,rep:70,vehicles:[v],conceptPrograms:[{id:'concept1',name:'Future Sedan',status:'complete',feedback:{overall:65,forecastConfidence:50},spent:90000,budget:90000}],modelActions:[],industry:[],nameplates:[{id:'np1',name:'Aurora',cumulativeSales:15000,heritage:23,generations:[{generation:1,modelYear:1980,cumulativeSales:15000,launchMsrp:15500,lastMsrp:17000,endPeriod:null}]}]};}
test('prototype exposes four testing disciplines and eligible vehicle/concept subjects',()=>{
 const W=load('prototype-lab.js'),lab=W.MDXPrototypeLab,s=state();assert.equal(Object.keys(lab.disciplines).length,4);
 assert.equal(lab.subjects(s).length,2);assert.equal(lab.quote(s,'model:v1','durability','standard').ready,true);
 assert.equal(lab.quote(s,'concept:concept1','market','standard').ready,true);
});
test('historic prototype techniques are gated to their period',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state();s.year=1920;
 assert.equal(lab.quote(s,'model:v1','safety','standard').ready,false);
 assert.equal(lab.quote(s,'model:v1','market','standard').ready,false);
 assert.equal(lab.quote(s,'model:v1','durability','standard').ready,true);
});
test('research spends budget over real days, pauses when funds run out and does not duplicate work',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state(),p=lab.start(s,'model:v1','durability','standard').program;
 assert.equal(p.status,'active');assert.equal(lab.start(s,'model:v1','durability','standard').ok,false);
 const cash=s.cash;const tick=lab.processDay(s);assert.ok(tick.spent>0);assert.equal(s.cash,cash-tick.spent);
 const remaining=p.daysRemaining;s.cash=0;const halt=lab.processDay(s);assert.equal(halt.paused,1);assert.equal(p.daysRemaining,remaining);
});
test('model durability report changes actual saved engineering metrics at completion exactly once',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state(),v=s.vehicles[0],before=v.stats.reliability;
 const p=lab.start(s,'model:v1','durability','extended').program;
 for(let i=0;i<p.totalDays;i++)lab.processDay(s);
 assert.equal(p.status,'complete');assert.equal(s.prototypeAudit.filter(x=>x.event==='completed').length,1);
 assert.ok(v.stats.reliability>before);assert.equal(v.prototypeHistory.length,1);
 const val=v.stats.reliability;lab.processDay(s);assert.equal(v.stats.reliability,val);
});
test('concept prototype evidence updates completed concept confidence and saves report',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state(),c=s.conceptPrograms[0],before=c.feedback.forecastConfidence;
 const p=lab.start(s,'concept:concept1','market','standard').program;
 for(let i=0;i<p.totalDays;i++)lab.processDay(s);
 assert.equal(p.status,'complete');assert.ok(c.feedback.forecastConfidence>before);
 assert.equal(c.prototypeEvidence.length,1);assert.equal(JSON.parse(JSON.stringify(s)).conceptPrograms[0].prototypeEvidence.length,1);
});
test('prototype director recommends extended fatigue testing for weak existing model',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state();s.vehicles[0].stats.reliability=48;
 const advice=lab.director(s);assert.equal(advice.subject,'model:v1');assert.equal(advice.environment,'extended');assert.equal(advice.discipline,'durability');
});
test('prototype autonomy is off on old saves and never spends or starts a program without consent',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state();s.month=3;s.day=1;
 assert.equal(lab.processDay(s).autoStarted,0);assert.equal(s.prototypePrograms?.length||0,0);
});
test('opt-in director authorizes one affordable quarterly prototype and records research accounting',()=>{
 const ledger=[],W=load('prototype-lab.js',{MDX:{recordCashTransaction:(state,kind,amount,label,meta)=>ledger.push({kind,amount,label,meta})}});
 const lab=W.MDXPrototypeLab,s=state();s.month=3;s.day=1;
 s.prototypeDirector={enabled:true,maxBudget:150000};
 const r=lab.processDay(s);assert.equal(r.autoStarted,1);
 assert.equal(s.prototypePrograms.length,1);assert.equal(ledger.length,1);
 assert.equal(ledger[0].kind,'research');assert.ok(ledger[0].amount<0);
 assert.equal(lab.autoDirector(s).started,0);assert.equal(s.prototypePrograms.length,1);
});
test('autonomous R&D refuses unaffordable budget limits without charging cash',()=>{
 const lab=load('prototype-lab.js').MDXPrototypeLab,s=state(),cash=s.cash;
 s.month=3;s.day=1;s.prototypeDirector={enabled:true,maxBudget:1000};
 const r=lab.processDay(s);assert.equal(r.autoStarted,0);assert.equal(s.prototypePrograms?.length||0,0);
 assert.equal(s.cash,cash);assert.ok(s.prototypeDirector.lastDecision);
});
test('old vehicle saves have neutral no-carryover budget and cannot use nonexistent parts',()=>{
 const C=load('parts-carryover.js').MDXPartsCarryover,s=state(),v=s.vehicles[0],base={budget:1200000,days:155};
 let q=C.quote(s,v,base);assert.equal(q.budget,base.budget);assert.equal(q.days,base.days);assert.equal(q.productionSaving,0);
 v.partsCarryoverPlan={platform:'retain',engine:'new',transmission:'new',cabin:'new'};
 assert.ok(C.quote(s,v,base).budget<base.budget);
 v.platformId=null;assert.equal(C.quote(s,v,base).ready,false);
});
test('part reuse saves real generation funding/time but introduces inherited-aging risk',()=>{
 const C=load('parts-carryover.js').MDXPartsCarryover,s=state(),v=s.vehicles[0],base={budget:1200000,days:155};
 v.partsCarryoverPlan={platform:'retain',engine:'refine',transmission:'retain',cabin:'refine'};
 const q=C.quote(s,v,base);assert.ok(q.ready);assert.ok(q.developmentSaving>250000);assert.ok(q.daysSaved>15);
 assert.ok(q.productionSaving>0);assert.ok(q.riskScore>0);
 v.lifecycle.ageMonths=144;v.stats.reliability=59;
 const old=C.quote(s,v,base);assert.ok(old.qualityRisk>q.qualityRisk);assert.ok(old.warnings.length>0);
});
test('funded generation snapshot is applied once with cash saving, manufacturing saving and audit',()=>{
 const C=load('parts-carryover.js').MDXPartsCarryover,s=state(),v=s.vehicles[0],base={budget:1200000,days:150};
 v.partsCarryoverPlan={platform:'retain',engine:'refine',transmission:'retain',cabin:'new'};
 const q=C.quote(s,v,base);
 v.nameplateId='np1';v.generation=2;
 s.nameplates[0].generations.push({generation:2,modelYear:1985,cumulativeSales:0});
 const action={lifecycleSnapshot:{generation:1},partsCarryoverSnapshot:{plan:q.plan,originalBudget:base.budget,originalDays:base.days,sourceAgeMonths:48,sourceReliability:75}};
 const before=v.stats.unitCost,res=C.complete(s,v,action);assert.ok(res);
 assert.ok(v.stats.unitCost<before);assert.equal(action.partsCarryoverApplied,true);
 assert.equal(s.carryoverAudits.length,1);assert.equal(s.nameplates[0].generations[1].partsCarryover.generation,2);
 C.complete(s,v,action);assert.equal(s.carryoverAudits.length,1);
});
test('nameplate history and parts UI contain working filtering and budget controls',()=>{
 const C=load('parts-carryover.js').MDXPartsCarryover,s=state(),v=s.vehicles[0];v.nameplateId='np1';
 const history=C.historyMarkup(s,v),editor=C.markup(s,v);
 assert.ok(history.includes('data-lineage-filter="generations"'));
 assert.ok(history.includes('15,000 historic sales'));
 assert.ok(editor.includes('data-carry-field="platform"'));
 assert.ok(editor.includes('DEVELOPMENT SAVING'));
});
test('real engine, lifecycle strategy and Product screen reference the same carryover quote',()=>{
 const expansion=fs.readFileSync(path.join(dir,'expansion.js'),'utf8'),product=fs.readFileSync(path.join(dir,'product-lifecycle.js'),'utf8'),strategy=fs.readFileSync(path.join(dir,'lifecycle-strategy.js'),'utf8'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 for(const token of ['MDXPartsCarryover?.quote?.(state,v,base)','action.partsCarryoverSnapshot','MDXPartsCarryover?.complete?.(state,v,action)','MDXPartsCarryover?.markup?','MDXPartsCarryover?.historyMarkup?','MDXPrototypeLab?.processDay?','MDXPrototypeLab?.wire?'])assert.ok((expansion+product).includes(token),token);
 assert.ok(strategy.includes('W.MDXPartsCarryover?.quote?.(state,v,baseline)'));
 assert.ok(html.includes('/prototype-lab.js'));assert.ok(html.includes('/parts-carryover.js'));
});
