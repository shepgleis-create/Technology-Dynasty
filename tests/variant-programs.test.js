'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.join(__dirname,'..');
function load(extra={}){const W={MDX:{engineeringSpeed:()=>1},...extra};W.window=W;vm.runInNewContext(fs.readFileSync(path.join(ROOT,'variant-programs.js'),'utf8'),W,{filename:'variant-programs.js'});return W.MDXVariants;}
function vehicle(){return{id:'v',name:'Falcon',target:'Mainstream',active:true,productionEnabled:true,productionStatus:'production',generation:1,engineId:'e1',transmissionId:'t1',msrp:12500,stats:{unitCost:7300,reliability:70,quality:70},lastMonthProduced:420,trims:[{id:'base',name:'Base',role:'base',active:true,targetMix:80,priceDeltaPct:0,costDeltaPct:0,appeal:1,lifetimeSales:0,lastMonthSales:0}]};}
function state(v=vehicle()){return{year:1985,month:3,day:1,cash:18000000,vehicles:[v],variantPrograms:[],marketSystem:{regions:[{id:'north',name:'North',unlocked:true,mtdSales:{v:60}},{id:'south',name:'South',unlocked:true,mtdSales:{v:190}}]},engines:[{id:'e1',name:'Basic I4',status:'released',stats:{hp:115,cost:1300}},{id:'e2',name:'Sport V6',status:'released',stats:{hp:220,cost:2400}}]};}
function weighted(total,items,score){if(!items.length)return[];let values=items.map(row=>({row,w:Math.max(.01,Number(score(row)))})),sum=values.reduce((a,x)=>a+x.w,0),left=total;return values.map((x,i)=>{let units=i===values.length-1?left:Math.min(left,Math.floor(total*x.w/sum));left-=units;return{row:x.row,units};});}
test('four required checklist edition types exist with distinct research economics',()=>{const M=load(),v=vehicle(),s=state(v);for(const k of ['special','performance','regional','fleet'])assert.ok(M.kindDefs[k]);const sp=M.quote(s,v,{kind:'special'}),fl=M.quote(s,v,{kind:'fleet'});assert.notEqual(sp.budget,fl.budget);assert.ok(fl.unitPrice<sp.unitPrice);});
test('a new special edition has sensible saved-neutral defaults and a valid quote',()=>{const M=load(),v=vehicle(),s=state(v),d=M.draft(v);assert.equal(d.limitedUnits,400);assert.equal(d.monthlyCap,200);assert.equal(M.quote(s,v,d).ready,true);});
test('funding is blocked for discontinued or unfunded vehicles and duplicate active engineering',()=>{const M=load(),v=vehicle(),s=state(v);s.cash=0;assert.equal(M.add(s,v,{kind:'special'}).ok,false);s.cash=18000000;let r=M.add(s,v,{kind:'special'});assert.equal(r.ok,true);assert.equal(M.add(s,v,{kind:'special'}).ok,false);v.productionStatus='retired';assert.equal(M.quote(s,v,{kind:'special'}).ready,false);});
test('regional variants must choose a listed unlocked region',()=>{const M=load(),v=vehicle(),s=state(v);assert.equal(M.quote(s,v,{kind:'regional',region:'all'}).ready,false);assert.equal(M.quote(s,v,{kind:'regional',region:'imaginary'}).ready,false);assert.equal(M.quote(s,v,{kind:'regional',region:'north'}).ready,true);});
test('performance engines are selected from released technology and affect actual trim economics',()=>{const M=load(),v=vehicle(),s=state(v),q=M.quote(s,v,{kind:'performance',engineId:'e2'});assert.ok(q.ready);assert.equal(q.engineBonus,105);assert.ok(q.engineCost>0);assert.ok(q.costDeltaPct>.10);});
test('unreleased engines cannot be selected for a performance edition by editing a save',()=>{
 const M=load(),v=vehicle(),s=state(v);
 s.engines.push({id:'future',name:'Test Prototype',status:'development',stats:{hp:900,cost:3000}});
 const q=M.quote(s,v,{kind:'performance',engineId:'future'});
 assert.equal(q.ready,false);assert.ok(q.blocked.includes('released'));
});
test('performance variant quote matches actual engineering trim price and cost without counting parts twice',()=>{
 const W={MDX:{engineeringSpeed:()=>1},MDX_CORE:{}};W.window=W;
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'variant-programs.js'),'utf8'),W);
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'product-lifecycle.js'),'utf8'),W);
 const M=W.MDXVariants,L=W.MDXProductLifecycle,v=vehicle(),s=state(v),d={kind:'performance',engineId:'e2',name:'Falcon Sport',limitedUnits:400,monthlyCap:60};
 const q=M.quote(s,v,d);assert.ok(q.ready);
 const result=M.add(s,v,d);assert.equal(result.ok,true);
 for(let i=0;i<result.program.totalDays;i++)M.processDay(s);
 const t=v.trims.find(x=>x.variantProgramId===result.program.id);assert.ok(t);
 const econ=L.vehicleEconomics(v),row=econ.trimRows.find(x=>x.trim.id===t.id);assert.ok(row);
 assert.ok(Math.abs(row.cost-q.unitCost)<2,'Cost quoted '+q.unitCost+' actual '+row.cost);
 assert.ok(Math.abs(row.msrp-q.unitPrice)<2,'Price quoted '+q.unitPrice+' actual '+row.msrp);
});
test('R&D cash is charged daily, never all upfront, and pauses safely when cash is exhausted',()=>{const M=load(),v=vehicle(),s=state(v),r=M.add(s,v,{kind:'special',name:'Commemorative'});assert.ok(r.ok);const before=s.cash;let first=M.processDay(s);assert.ok(first.spent>0);assert.equal(s.cash,before-first.spent);s.cash=0;first=M.processDay(s);assert.equal(first.paused,1);assert.equal(first.spent,0);assert.equal(r.program.status,'development');});
test('completed development creates a real production variant trim and persistent audit',()=>{const M=load(),v=vehicle(),s=state(v),r=M.add(s,v,{kind:'special',name:'Series 400',limitedUnits:400,monthlyCap:90});assert.ok(r.ok);for(let i=0;i<r.program.totalDays;i++)M.processDay(s);assert.equal(r.program.status,'released');const t=v.trims.find(x=>x.variantProgramId===r.program.id);assert.ok(t);assert.equal(t.limitedUnits,400);assert.equal(t.maxMonthlyUnits,90);assert.equal(t.name,'Series 400');assert.ok(s.variantAudit.some(x=>x.event==='variant_released'));});
test('production reserves edition inventory without manufacturing additional vehicles',()=>{const M=load(),v=vehicle(),s=state(v);v.trims.push({id:'edition',variantProgramId:'var1',limitedUnits:100,maxMonthlyUnits:40,active:true,targetMix:20,lifetimeSales:0,lifetimeProduced:0});v.trims[0].targetMix=80;v.lastMonthProduced=200;M.allocateProduction(s,v);assert.equal(v.trims[1].lastMonthProduced,40);assert.equal(v.trims[1].lifetimeProduced,40);M.allocateProduction(s,v);assert.equal(v.trims[1].lifetimeProduced,40);});
test('actual edition sales obey monthly and lifetime produced-stock caps and conserve all vehicle sales',()=>{const M=load(),v=vehicle(),s=state(v);const edition={id:'edition',variantProgramId:'var1',limitedUnits:35,maxMonthlyUnits:15,active:true,targetMix:60,lifetimeSales:0,lifetimeProduced:24,regionId:'all'};v.trims[0].targetMix=40;v.trims.push(edition);
const a=M.allocation(120,v.trims,t=>t.targetMix,weighted,s,v);assert.equal(a.reduce((x,r)=>x+r.units,0),120);assert.ok(a.find(x=>x.row===edition).units<=15);
edition.lifetimeSales=21;const b=M.allocation(120,v.trims,t=>t.targetMix,weighted,s,v);assert.ok(b.find(x=>x.row===edition).units<=3);});
test('regional edition monthly sales are bound by selected market demand',()=>{const M=load(),v=vehicle(),s=state(v);const ed={id:'regional',variantProgramId:'var2',limitedUnits:1000,maxMonthlyUnits:250,active:true,targetMix:90,lifetimeSales:0,lifetimeProduced:500,regionId:'north'};v.trims[0].targetMix=10;v.trims.push(ed);let rows=M.allocation(400,v.trims,t=>t.targetMix,weighted,s,v);assert.ok(rows.find(x=>x.row===ed).units<=60);assert.equal(rows.reduce((a,x)=>a+x.units,0),400);});
test('sold-out edition remains in saved car history and cannot exceed the 100-unit limit',()=>{const M=load(),v=vehicle(),s=state(v),t={id:'ed',variantProgramId:'p',limitedUnits:100,maxMonthlyUnits:60,active:true,targetMix:50,lifetimeSales:100,lifetimeProduced:100,regionId:'all',lastMonthSales:20};v.trims.push(t);const rows=M.allocation(130,v.trims,x=>x.targetMix,weighted,s,v);assert.equal(rows.find(x=>x.row===t).units,0);M.month(s,v,rows);assert.equal(t.editionEndStatus,'sold_out');assert.equal(JSON.parse(JSON.stringify(s.vehicles[0])).trims[1].editionEndStatus,'sold_out');});
test('full released performance edition reconciles with real monthly model sales and inventory',()=>{
 const W={MDX:{engineeringSpeed:()=>1},MDX_CORE:{}};W.window=W;
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'variant-programs.js'),'utf8'),W);
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'product-lifecycle.js'),'utf8'),W);
 const M=W.MDXVariants,L=W.MDXProductLifecycle,v=vehicle(),s=state(v);
 v.target='Sport';v.lastMonthSales=80;v.lastMonthProduced=120;v.lifetimeSales=80;
 s.rep=65;s.industry=[];s.nameplates=[];s.qualitySystem={recalls:[]};s.motorsport={trophies:0};
 const quote=M.quote(s,v,{kind:'performance',engineId:'e2',name:'Falcon GT',limitedUnits:100,monthlyCap:20});
 assert.ok(quote.ready);
 const started=M.add(s,v,quote.draft);
 for(let i=0;i<started.program.totalDays;i++)M.processDay(s);
 const edition=v.trims.find(t=>t.variantProgramId===started.program.id);assert.ok(edition);
 L.ensure(s);
 const actual=L.vehicleEconomics(v).trimRows.find(x=>x.trim.id===edition.id);
 assert.ok(actual);
 assert.ok(Math.abs(actual.cost-quote.unitCost)<2);
 assert.ok(Math.abs(actual.msrp-quote.unitPrice)<2);
 const report=L.settleMonth(s);
 assert.equal(report.trimUnits,80);
 assert.equal(v.lastMonthTrimSales.base+v.lastMonthTrimSales[edition.id],80);
 assert.ok(edition.lastMonthSales<=edition.lastMonthProduced);
 assert.ok(edition.lastMonthSales<=20);
 assert.ok(edition.lifetimeSales<=edition.lifetimeProduced);
 assert.ok(Number.isFinite(report.configurationContribution));
});
test('all changed source files and existing DOM controls are integrated in one app',()=>{const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),l=fs.readFileSync(path.join(ROOT,'product-lifecycle.js'),'utf8');assert.ok(html.includes('/variant-programs.js'));assert.ok(html.includes('/variant-programs.css'));for(const token of ['MDXVariants?.html','MDXVariants?.wire','MDXVariants?.processDay','MDXVariants?.allocation','MDXVariants?.allocateProduction','MDXVariants?.month'])assert.ok(l.includes(token),token);});
