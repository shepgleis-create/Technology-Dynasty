'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','powertrain-envelope.js'),'utf8');
function runtime(){
 const w={};w.window=w;vm.runInNewContext(code,w,{filename:'powertrain-envelope.js'});return w.MDXPowertrainEnvelope;
}
function draft(patch={}){return{config:'I4',bore:86,stroke:86,redline:6000,rodRatio:1.65,compression:9,quality:60,fuel:'carb',fuelGrade:'regular',ignitionTiming:50,aspiration:'na',cooling:'standard',intercooler:false,...patch};}
function output(patch={}){return{tq:130,springLimit:6500,bottomLimit:6500,thermalMargin:60,fuelDeliveryFactor:1,...patch};}
const state=(year=1970,unlocked=[])=>({year,unlocked});
test('401-430: correct displacement, piston velocity, rod angle and BMEP from actual draft numbers',()=>{
 const e=runtime().evaluate(state(),draft(),output());
 const m=e.measurements,expected=Math.PI/4*86*86*86*4/1e6;
 assert.equal(e.ready,true);assert.ok(Math.abs(m.displacementL-expected)<.001);
 assert.equal(m.meanPistonSpeed,17.2);assert.ok(m.maxRodAngleDeg>15&&m.maxRodAngleDeg<20);
 assert.ok(m.brakeMeanEffectivePressureBar>0&&m.brakeMeanEffectivePressureBar<20);
});
test('409-446: future-era architectures and unresearched materials cannot be authorized through restored drafts',()=>{
 const e=runtime(),s=state(1940);
 assert.ok(e.evaluate(s,draft({config:'W16'}),output()).errors.some(x=>x.includes('2005')));
 assert.ok(e.evaluate(s,draft({block:'aluminum'}),output()).errors.some(x=>x.includes('al_block')));
 assert.equal(e.evaluate(state(1970,['al_block']),draft({block:'aluminum'}),output()).ready,true);
 assert.ok(e.evaluate(state(1970,['sohc']),draft({head:'dohc',valves:4}),output()).errors.length>=2);
});
test('440-480: turbo boost, octane, cooling and forged components affect risk consistently',()=>{
 const E=runtime(),s=state(1990,['turbo','intercooler']),rough=draft({aspiration:'turbo',boost:20,compression:12,ignitionTiming:80,redline:8500,stroke:105});
 const high=E.evaluate(s,rough,output({springLimit:6500,bottomLimit:6400,thermalMargin:22,fuelDeliveryFactor:.82,tq:450}));
 const better=E.evaluate(s,{...rough,compression:8.5,ignitionTiming:50,boost:8,redline:6000,stroke:86,intercooler:true,fuelGrade:'race'},output({springLimit:7000,bottomLimit:7000,thermalMargin:75,fuelDeliveryFactor:1,tq:230}));
 assert.ok(high.stress>better.stress);assert.ok(high.warnings.length>=3);
 assert.equal(high.measurements.testDays,9);
});
test('402/407: test costs increase actual development budget and schedule, leaving state and draft unchanged',()=>{
 const E=runtime(),s=state(),d=draft({compression:12.6,redline:8500,stroke:110}),e=output({tq:430,thermalMargin:19,springLimit:6400,bottomLimit:6400});
 const before=JSON.stringify({s,d,e});
 const q=E.enrichQuote(s,d,e,{days:40,budget:100000,daily:2500,reuse:true});
 assert.ok(q.days>40&&q.budget>100000);assert.equal(q.daily,q.budget/q.days);assert.equal(q.reuse,true);
 assert.equal(JSON.stringify({s,d,e}),before);
});
test('strict malformed draft validation never returns launch authorization',()=>{
 const E=runtime();for(const x of [NaN,-10,2000,Infinity])assert.equal(E.evaluate(state(),draft({bore:x}),output()).ready,false);
 assert.equal(E.evaluate(state(),draft({config:'unknown'}),output()).ready,false);
});
test('render output is an illustrated live physical comparison, not an inert mockup',()=>{
 const E=runtime(),root={dataset:{},innerHTML:''},d=draft(),out=output();
 E.render(root,state(),d,out,{days:42,budget:10000});assert.ok(root.innerHTML.includes('<svg'));assert.ok(root.innerHTML.includes('Piston speed'));
 assert.equal(root.dataset.ready,'true');const before=root.innerHTML;
 E.render(root,state(),{...d,stroke:110},out,{days:42,budget:10000});assert.notEqual(root.innerHTML,before);
});
test('integration: existing game uses report at live preview, authorization gate, budget and recorded engine entries',()=>{
 const script=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const term of ['MDXPowertrainEnvelope?.render','MDXPowertrainEnvelope?.evaluate','MDXPowertrainEnvelope?.enrichQuote','entry.engineeringEnvelope','state.engineEngineeringAudits'])assert.ok(script.includes(term),term);
 assert.ok(html.includes('id="engineEnvelope"'));assert.ok(html.includes('/powertrain-envelope.js'));
});
