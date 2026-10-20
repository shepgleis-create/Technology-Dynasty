'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function engine(){const W={MDX:{modelActionBaseline:()=>({budget:1200000,days:150}),recordCashTransaction:(s,type,amount,name,detail)=>{s.cashTransactions=Array.isArray(s.cashTransactions)?s.cashTransactions:[];s.cashTransactions.push({type,amount,name,detail});}}};W.window=W;vm.runInNewContext(fs.readFileSync(path.join(root,'generation-release.js'),'utf8'),W,{filename:'generation-release.js'});return W.MDXGenerationRelease;}
const vehicle=()=>({id:'car1',name:'Vela',generation:1,createdYear:1979,modelYear:1979,active:true,productionStatus:'production',productionEnabled:true,platformId:'plat',engineId:'eng',transmissionId:'trans',msrp:14000,inventory:80,factoryInventory:25,stats:{unitCost:8000,quality:77,reliability:82},lifecycle:{ageMonths:48},lifetimeSales:92000,lastMonthSales:300,nameplateId:'np_v',launchMomentum:{multiplier:1.18}});
function state(v=vehicle()){return{year:1986,month:5,day:12,cash:6000000,vehicles:[v],nameplates:[{id:'np_v',heritage:33,cumulativeSales:92000,generations:[{generation:1,modelYear:1979,cumulativeSales:92000,endPeriod:null}]}],
 operations:{factories:[{active:true,status:'operating',lines:[{modelId:v.id}]},{active:true,status:'operating',lines:[{modelId:null}]}]},
 marketSystem:{regions:[{id:'north',inventory:{car1:22},franchiseInventory:{car1:10},companyInventory:{car1:4}}]},
 logistics:{inTransit:[{vehicleId:'car1',qty:7}]},modelActions:[]};}
const base={budget:1200000,days:150};
test('new saves use neutral new tooling, immediate market launch, and replacement without changing historic engineering costs',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],before=JSON.stringify(v),q=M.quote(s,v,base);
 assert.equal(q.budget,base.budget);assert.equal(q.days,base.days);assert.equal(q.holdCost,0);assert.equal(q.ramp,1);
 assert.equal(q.plan.replace,'replace');assert.equal(M.capture(s,v,{},q),null);assert.equal(JSON.stringify(v),before);
});
test('tooling reuse really reduces engineering funding but imposes capacity and reliability penalties',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];v.generationReleasePlan={tools:'reuse',launch:'now',replace:'replace'};
 const q=M.quote(s,v,base);assert.ok(q.saving>0);assert.ok(q.budget<base.budget);assert.ok(q.days>base.days);
 assert.ok(q.ramp<1);assert.ok(q.risk>0);
});
test('tooling reuse refuses missing old platform / production source',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];v.platformId=null;v.productionStatus='preproduction';
 v.generationReleasePlan={tools:'reuse'};const q=M.quote(s,v,base);
 assert.equal(q.ready,false);assert.ok(q.blocked.includes('tool'));
});
test('parallel manufacturing requires an operating factory and outgoing model production',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];v.generationReleasePlan={replace:'parallel'};
 s.operations.factories=[];assert.equal(M.quote(s,v,base).ready,false);
 s.operations.factories.push({status:'operating',lines:[{}]});
 v.productionStatus='retired';assert.equal(M.quote(s,v,base).ready,false);
});
test('launch holds have explicit budget and a saved immutable snapshot on authorized projects',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],action={id:'gen1'};
 v.generationReleasePlan={tools:'rework',launch:'month',replace:'parallel'};
 const q=M.quote(s,v,base);assert.equal(q.holdDays,30);assert.ok(q.holdCost>0);
 const cfg=M.capture(s,v,action,q);assert.equal(cfg.launch,'month');assert.equal(cfg.tools,'rework');assert.equal(cfg.sourceGeneration,1);
 v.generationReleasePlan.tools='new';assert.equal(action.generationReleaseSnapshot.tools,'rework');
});
test('outgoing generation keeps producing during a 30-day deferred market release without duplicate R&D expense',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],p={id:'gen2',status:'active',type:'generation',spent:800000,budget:800000,daysRemaining:0,generationReleaseSnapshot:{launch:'month',holdDays:30,holdCost:90000}};
 assert.equal(M.developmentReady(s,p,v),true);assert.equal(p.status,'awaiting_launch');
 assert.equal(v.productionStatus,'production');const budget=s.cash;
 for(let i=0;i<29;i++)assert.equal(M.tickHold(s,p,v),false);
 assert.equal(M.tickHold(s,p,v),true);assert.equal(p.releaseHold.remaining,0);assert.equal(p.releaseHold.status,'complete');
 assert.ok(s.cash<budget);assert.equal(p.spent,800000);assert.equal(s.cashTransactions.length,30);
});
test('launch delays pause on insufficient cash without aging the release schedule',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],p={id:'g1',status:'active',generationReleaseSnapshot:{holdDays:30,holdCost:3000}};
 M.developmentReady(s,p,v);s.cash=0;
 assert.equal(M.tickHold(s,p,v),false);assert.equal(p.releaseHold.remaining,30);assert.equal(p.releaseHold.status,'paused');
});
test('parallel old generation receives a distinct vehicle and inventory, while new car starts with zero old inventory',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],p={id:'gen1',generationReleaseSnapshot:{replace:'parallel',sourceGeneration:1}};
 const out=M.beforeLaunch(s,v,p);assert.equal(out.oldInventory,80);assert.equal(s.vehicles.length,2);
 const old=s.vehicles[1];assert.equal(old.inventory,80);assert.equal(old.productionEnabled,true);
 assert.equal(v.inventory,0);assert.equal(v.factoryInventory,0);assert.equal(old.lineageParentId,v.id);
 assert.equal(s.marketSystem.regions[0].inventory[v.id],undefined);
 assert.equal(s.marketSystem.regions[0].inventory[old.id],22);
 assert.equal(s.marketSystem.regions[0].franchiseInventory[old.id],10);
 assert.equal(s.logistics.inTransit[0].vehicleId,old.id);
 M.beforeLaunch(s,v,p);assert.equal(s.vehicles.length,2);
});
test('replacement keeps unsold previous generation saleable but stops new production for the outgoing model',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],p={id:'g2',generationReleaseSnapshot:{replace:'replace',sourceGeneration:1}};
 M.beforeLaunch(s,v,p);
 const outgoing=s.vehicles[1];
 assert.equal(outgoing.productionStatus,'production');assert.equal(outgoing.productionEnabled,false);
 assert.equal(outgoing.inventory,80);assert.equal(v.inventory,0);assert.equal(outgoing.oldGenerationSellThrough,true);
 assert.equal(s.marketSystem.regions[0].companyInventory[outgoing.id],4);
});
test('release affects actual post-launch tooling ramp once, preserves history and flags parallel lineage',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],p={id:'g3',generationReleaseSnapshot:{replace:'parallel',tools:'reuse',risk:4,ramp:.89,appeal:1.04,sourceGeneration:1}};
 M.beforeLaunch(s,v,p);v.generation=2;const outcome=M.afterLaunch(s,v,p);
 assert.ok(outcome);assert.equal(M.productionMultiplier(v),.89);assert.ok(v.stats.reliability<82);
 assert.equal(s.nameplates[0].generations[0].parallelProduction,true);
 const len=s.generationReleaseAudit.length;M.afterLaunch(s,v,p);assert.equal(s.generationReleaseAudit.length,len);
});
test('heritage archives are opt-in, consume actual cash once monthly and increase nameplate heritage',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],cash=s.cash,heritage=s.nameplates[0].heritage;
 assert.equal(M.setHeritage(s,v,'museum').ok,true);
 const r=M.settleMonth(s);assert.equal(r.count,1);assert.ok(s.cash<cash);assert.ok(s.nameplates[0].heritage>heritage);
 const cashAfter=s.cash;assert.equal(M.settleMonth(s).alreadySettled,true);assert.equal(s.cash,cashAfter);
 assert.ok(s.cashTransactions[0].amount<0);
});
test('heritage operations stop when cash is insufficient, preserving history with a clear pause reason',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];M.setHeritage(s,v,'restoration');s.cash=0;
 const r=M.settleMonth(s);assert.equal(r.spent,0);assert.equal(v.heritagePlan.lastStatus,'PAUSED — FUNDING');
});
test('tooling capacity ramps decay after three actual monthly settlements',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];v.toolingRampMultiplier=.89;v.toolingRampMonthsRemaining=3;
 for(let i=0;i<3;i++){s.month=i+5;M.settleMonth(s);}assert.equal(M.productionMultiplier(v),1);
});
test('AI director uses age, cash, plant count and sales and never commits without user selection',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],before=JSON.stringify(v),a=M.director(s,v);
 assert.ok(a.reason.includes('reliability'));assert.ok(M.tools[a.plan.tools]);assert.ok(M.replacements[a.plan.replace]);
 assert.equal(JSON.stringify(v),before);
});
test('tooling reuse is blocked without an operating factory and an old vehicle source',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];v.generationReleasePlan={tools:'reuse'};
 s.operations.factories=[{active:true,status:'closed',lines:[]}];
 const q=M.quote(s,v,base);assert.equal(q.ready,false);assert.ok(q.blocked.includes('operating factory'));
});
test('already authorized launch strategy stays visible even after editing the future draft',()=>{
 const M=engine(),s=state(),v=s.vehicles[0];v.generationReleasePlan={tools:'reuse',launch:'quarter',replace:'parallel'};
 const p={id:'next',type:'generation',vehicleId:v.id,status:'active',generationReleaseSnapshot:{tools:'new',launch:'now',replace:'replace'}};
 s.modelActions.push(p);const markup=M.markup(s,v);
 assert.ok(markup.includes('AUTHORIZED PLAN'));assert.ok(markup.includes('All-new stamping tools'));
 assert.ok(markup.includes('Release immediately'));assert.ok(markup.includes('apply only to a future program'));
});
test('phone controls and actual code integration cover four checklist departments',()=>{
 const M=engine(),s=state(),v=s.vehicles[0],html=M.markup(s,v)+M.heritageMarkup(s,v);
 for(const x of ['data-gr-option="tools"','data-gr-option="launch"','data-gr-option="replace"','data-gr-director','data-gr-heritage'])assert.ok(html.includes(x),x);
 const game=fs.readFileSync(path.join(root,'expansion.js'),'utf8'),
 lifecycle=fs.readFileSync(path.join(root,'lifecycle-strategy.js'),'utf8'),
 product=fs.readFileSync(path.join(root,'product-lifecycle.js'),'utf8'),
 index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const x of ['MDXGenerationRelease?.quote?','MDXGenerationRelease?.capture?','MDXGenerationRelease?.developmentReady?','MDXGenerationRelease?.tickHold?','MDXGenerationRelease?.beforeLaunch?','MDXGenerationRelease?.afterLaunch?','MDXGenerationRelease?.productionMultiplier?'])assert.ok(game.includes(x),x);
 assert.ok(lifecycle.includes('MDXGenerationRelease?.quote?'));
 assert.ok(product.includes('MDXGenerationRelease?.settleMonth?'));
 assert.ok(product.includes('MDXGenerationRelease?.wire?'));
 assert.ok(index.includes('/generation-release.js'));assert.ok(index.includes('/generation-release.css'));
});
