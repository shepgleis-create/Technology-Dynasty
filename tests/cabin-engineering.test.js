'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const moduleSource=fs.readFileSync(path.join(root,'cabin-engineering.js'),'utf8');
function load(){const win={};win.window=win;vm.runInNewContext(moduleSource,win,{filename:'cabin-engineering.js'});return win.MDXCabinEngineering;}
test('untouched 1940 vehicle has zero equipment cost/mass/comfort/safety/program changes',()=>{
 const C=load(),r=C.evaluate({year:1940},{});
 assert.equal(r.ready,true);
 for(const k of ['unitCostDelta','massKg','comfortDelta','luxuryDelta','safetyDelta','extraDays','extraBudget'])assert.equal(r[k],0,k);
 assert.equal(r.configuration.instrumentCluster,'analog');
});
test('historically unavailable infotainment, aids and clusters are blocked even in restored drafts',()=>{
 const C=load(),r=C.evaluate({year:1960},{instrumentCluster:'widescreen',infotainment:'connected',driverAssist:'advanced'});
 assert.equal(r.ready,false);assert.ok(r.errors.some(x=>x.includes('2010')));assert.ok(r.errors.some(x=>x.includes('2012')));
});
test('automatic and manual climate need actual installed air conditioning',()=>{
 const C=load(),r=C.evaluate({year:1980},{climateControl:'automatic',ac:false});
 assert.equal(r.ready,false);assert.ok(r.errors.some(x=>x.includes('Enable A/C')));
 assert.equal(C.evaluate({year:1980},{climateControl:'automatic',ac:true}).ready,true);
});
test('luxury packages increase unit cost, mass, comfort and validation budget',()=>{
 const C=load(),base=C.evaluate({year:2020},{}),premium=C.evaluate({year:2020},{dashLayout:'wraparound',instrumentCluster:'widescreen',infotainment:'connected',interiorLighting:'ambient',cabinMaterials:'artisan',cabinAssembly:'precision',ac:true,climateControl:'automatic'});
 assert.equal(base.unitCostDelta,0);
 assert.ok(premium.unitCostDelta>2000);assert.ok(premium.massKg>0);
 assert.ok(premium.luxuryDelta>15);assert.ok(premium.extraDays>0);assert.ok(premium.extraBudget>0);
});
test('rear room consumes load space, increases comfort and incurs package weight',()=>{
 const C=load(),cargo=C.evaluate({year:1980},{cargoPackaging:'space',rearSeatSpace:25}),room=C.evaluate({year:1980},{cargoPackaging:'space',rearSeatSpace:90});
 assert.ok(cargo.cargoDeltaPct>room.cargoDeltaPct);
 assert.ok(room.comfortDelta>cargo.comfortDelta);
 assert.ok(room.massKg>cargo.massKg);
 assert.ok(room.warnings.some(x=>x.includes('cargo packaging')));
});
test('driver-assistance safety accounts for incompatible ABS calibration',()=>{
 const C=load(),a=C.evaluate({year:2020},{driverAssist:'advanced',abs:false}),b=C.evaluate({year:2020},{driverAssist:'advanced',abs:true});
 assert.ok(b.safetyDelta>a.safetyDelta);assert.ok(a.warnings.some(x=>x.includes('ABS')));
});
test('malformed option IDs and impossible ergonomic input cannot authorize a design',()=>{
 const C=load(),a=C.evaluate({year:1970},{instrumentCluster:'telepathic'}),b=C.evaluate({year:1970},{rearSeatSpace:-15});
 assert.equal(a.ready,false);assert.equal(b.ready,false);
 assert.ok(a.errors.some(x=>x.includes('unknown')));assert.ok(b.errors.some(x=>x.includes('between')));
});
test('development quote increases funded days and budget without mutating input',()=>{
 const C=load(),state={year:2000},draft={dashLayout:'wraparound',instrumentCluster:'digital',cabinAssembly:'precision'},
 original={days:35,budget:160000,daily:160000/35},snapshot=JSON.stringify({state,draft,original});
 const quote=C.enrichQuote(state,draft,original);
 assert.ok(quote.days>original.days);assert.ok(quote.budget>original.budget);
 assert.equal(quote.daily,quote.budget/quote.days);
 assert.equal(snapshot,JSON.stringify({state,draft,original}));
});
test('AI cabin director respects historic selection and reasonable equipment cap',()=>{
 const C=load(),budget=C.recommend({year:1940},{target:'Budget',ac:false},250);
 assert.equal(budget.report.ready,true);assert.ok(budget.estimatedUnitCost<=250);
 const luxe=C.recommend({year:2020},{target:'Luxury',ac:true},2500);
 assert.equal(luxe.report.ready,true);assert.ok(luxe.estimatedUnitCost>=budget.estimatedUnitCost);
});
test('live mobile readout includes SVG, option IDs are escaped, and layouts change',()=>{
 const C=load(),root={innerHTML:'',dataset:{}};
 C.render(root,{year:1940},{});
 assert.ok(root.innerHTML.includes('<svg'));assert.equal(root.dataset.ready,'true');
 const old=root.innerHTML;
 C.render(root,{year:2020},{dashLayout:'wraparound',instrumentCluster:'widescreen'});
 assert.notEqual(root.innerHTML,old);
 const m=C.markup({year:1940},{});assert.ok(m.includes('data-cabin-opt'));assert.ok(m.includes('AUTO PLAN'));assert.ok(m.includes('disabled'));
});
test('existing game integrates cost, mass, safety, save audit, quote and freeze gate',()=>{
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const token of ['MDXCabinEngineering?.evaluate','cabin.massKg','cabin.unitCostDelta','cabin.comfortDelta','cabin.safetyDelta','cabin.luxuryDelta','cabin.qualityDelta','MDXCabinEngineering?.enrichQuote','MDXCabinEngineering?.markup','MDXCabinEngineering?.render','cabinEngineering:cabinReport','state.cabinEngineeringAudits','cabinReport&&!cabinReport.ready']){
  assert.ok(game.includes(token),token);
 }
 assert.ok(html.includes('/cabin-engineering.js'));assert.ok(html.includes('/cabin-engineering.css'));
});
