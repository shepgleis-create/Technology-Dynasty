'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../transmission-envelope.js'),'utf8');
function system(){const g={};g.window=g;vm.runInNewContext(src,g,{filename:'transmission-envelope.js'});return g.MDXTransmissionEnvelope;}
const arch={type:'Manual',gears:4,minYear:1940,tech:null};
const d=(values={})=>({base:'4m',gearRatios:[3.42,2.05,1.36,1],finalDrive:3.55,torque:250,quality:60,controlSystem:'mechanical',coupling:'single_dry',...values});
const spec=(values={})=>({type:'Manual',architecture:'4m',gears:4,torque:250,eff:.94,ratios:[3.42,2.05,1.36,1],ratioOrderValid:true,
 reliability:91,heatTolerance:76,manufacturingYield:94,warrantyRisk:11,
 serviceability:80,complexity:43,launchMultiplication:12.14,cruiseMultiplication:3.55,...values});
const s=(year=1970,engines=[])=>({year,unlocked:[],engines});
test('baseline manual gearbox is feasible; validation costs are a real extension only when needed',()=>{
 const E=system(),state=s(),draft=d(),out=spec(),r=E.evaluate(state,draft,out,arch);
 assert.equal(r.ready,true);assert.equal(r.extraDays,0);
 const q=E.enrichQuote(state,draft,out,{days:30,budget:50000,daily:50000/30,reusePct:38},arch);
 assert.equal(q.days,30);assert.equal(q.budget,50000);assert.equal(q.reusePct,38);
});
test('future transmission families and technology are blocked even when loaded from saved drafts',()=>{
 const E=system(),future={type:'DCT',minYear:2003,tech:'dct',gears:6};
 const report=E.evaluate(s(1970),d({base:'dct'}),spec({type:'DCT',architecture:'dct',gears:6,ratios:[3.4,2.3,1.7,1.3,1,.7]}),future);
 assert.equal(report.ready,false);assert.ok(report.errors.some(x=>x.includes('2003')));
 assert.ok(report.errors.some(x=>x.includes('dct')));
});
test('invalid ascending, repeated, nonpositive and incomplete ratio sets cannot launch',()=>{
 const E=system();for(const raw of [[3,2,2,1],[3,2,3,1],[3,2,0,1],[3,2,1]]){
  const calc=spec({ratios:raw.length===4?raw.map(x=>Math.max(.35,x)):spec().ratios,ratioOrderValid:false});
  assert.equal(E.evaluate(s(),d({gearRatios:raw}),calc,arch).ready,false);
 }
});
test('component year and coupling incompatibility are rejected instead of silently downgraded',()=>{
 const E=system(),catalog={gearMaterial:{standard:{minYear:1900},future:{minYear:2005}},coupling:{single_dry:{types:['Manual']},steel_belt:{types:['CVT']}}};
 const r=E.evaluate(s(1970),d({gearMaterial:'future',coupling:'steel_belt'}),spec(),arch,catalog);
 assert.equal(r.ready,false);assert.ok(r.errors.some(x=>x.includes('2005')));assert.ok(r.errors.some(x=>x.includes('incompatible')));
});
test('target engine torque is actually compared with gearbox capacity and can block unsafe development',()=>{
 const E=system(),state=s(1990,[{id:'e1',name:'V8',stats:{torque:440}}]);
 const r=E.evaluate(state,d({engineTargetId:'e1'}),spec(),arch);
 assert.equal(r.ready,false);assert.equal(r.measurements.engineTorqueLbFt,440);assert.ok(r.errors.some(x=>x.includes('20%')));
 const ok=E.evaluate(state,d({engineTargetId:'e1'}),spec({torque:470}),arch);
 assert.equal(ok.ready,true);assert.ok(ok.measurements.torqueMarginPct>0);
});
test('high-stress gearbox needs funded additional validation and original quote and state stay unchanged',()=>{
 const E=system(),state=s(),draft=d(),out=spec({reliability:52,manufacturingYield:79,warrantyRisk:35,heatTolerance:32,complexity:94,eff:.72});
 const previous=JSON.stringify({state,draft,out}),base=Object.freeze({days:28,budget:95000,daily:95000/28,mode:'new_family'});
 const quote=E.enrichQuote(state,draft,out,base,arch);
 assert.ok(quote.days>base.days&&quote.budget>base.budget);
 assert.equal(quote.daily,quote.budget/quote.days);assert.equal(JSON.stringify({state,draft,out}),previous);
});
test('mobile graphic and engine selector are live and output is HTML escaped',()=>{
 const E=system(),root={dataset:{},innerHTML:''};
 E.render(root,s(),d(),spec(),{days:30,budget:50000},arch);
 assert.ok(root.innerHTML.includes('<svg'));assert.ok(root.innerHTML.includes('Ratio spread'));assert.equal(root.dataset.ready,'true');
 const old=root.innerHTML;E.render(root,s(),d(),spec({ratios:[3.5,2.5,1.5,1]}),null,arch);
 assert.notEqual(root.innerHTML,old);
 const picker=E.enginePicker(s(1990,[{id:'e1',name:'<b>Fake</b>',stats:{torque:350}}]),d());
 assert.ok(picker.includes('&lt;b&gt;Fake&lt;/b&gt;'));assert.ok(!picker.includes('<b>Fake</b>'));
});
test('integration of runtime expense, authorization, persistence and entrypoint',()=>{
 const game=fs.readFileSync(path.resolve(__dirname,'../game.js'),'utf8'),html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 for(const term of ['TX_VALIDATION_COMPONENTS','MDXTransmissionEnvelope?.evaluate','MDXTransmissionEnvelope?.render','MDXTransmissionEnvelope?.enrichQuote','entry.transmissionValidation','state.transmissionEngineeringAudits','txEngineTarget','txEnvelope'])assert.ok(game.includes(term),'Missing '+term);
 for(const term of ['/transmission-envelope.js','/transmission-envelope.css'])assert.ok(html.includes(term));
});
