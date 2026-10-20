(()=>{
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const TEMPLATES=[
 {id:"oil_crisis",name:"Oil Supply Crisis",minYear:1940,duration:[7,16],weight:1.0,effects:{demand:.94,finance:.98,material:1.04,shipping:1.03,fuel:1.55,production:.98,segments:{Budget:1.14,Family:1.06,Mainstream:1.03,Premium:.94,Luxury:.90,Sport:.86,Utility:.79,"Off-Road":.76}},detail:"Fuel prices surge. Efficient small cars gain demand while fuel-hungry segments lose shoppers."},
 {id:"steel_shortage",name:"Steel Shortage",minYear:1940,duration:[4,10],weight:1.05,effects:{demand:.98,finance:1,material:1.18,shipping:1.04,fuel:1,production:.91,segments:{}},detail:"Steel availability tightens, raising manufacturing cost and reducing effective factory throughput."},
 {id:"port_strike",name:"Port & Freight Disruption",minYear:1940,duration:[3,8],weight:.85,effects:{demand:.98,finance:1,material:1.05,shipping:1.42,fuel:1.03,production:.95,segments:{}},detail:"Ports and freight networks slow. Cross-region logistics become more expensive and less reliable."},
 {id:"recession",name:"Industry Recession",minYear:1940,duration:[8,18],weight:.9,effects:{demand:.80,finance:.86,material:.95,shipping:.96,fuel:.94,production:.92,segments:{Budget:1.08,Family:.98,Mainstream:.94,Premium:.84,Luxury:.74,Sport:.78,Utility:.88,"Off-Road":.88}},detail:"Households cut major purchases and credit tightens. Premium and discretionary vehicles take the largest hit."},
 {id:"credit_squeeze",name:"Credit Squeeze",minYear:1950,duration:[5,12],weight:.75,effects:{demand:.91,finance:.76,material:1,shipping:1,fuel:1,production:.98,segments:{Budget:1.04,Family:.98,Mainstream:.96,Premium:.88,Luxury:.82,Sport:.84,Utility:.93}},detail:"Lenders tighten standards and financing costs rise, hurting expensive vehicles and leveraged companies."},
 {id:"consumer_boom",name:"Consumer Boom",minYear:1940,duration:[6,14],weight:.8,effects:{demand:1.15,finance:1.04,material:1.03,shipping:1.04,fuel:1.03,production:1.04,segments:{Budget:1.03,Family:1.08,Mainstream:1.10,Premium:1.12,Luxury:1.10,Sport:1.09,Utility:1.08}},detail:"Strong confidence and household spending lift new-car demand across most segments."},
 {id:"supplier_wave",name:"Supplier Capacity Crunch",minYear:1940,duration:[4,9],weight:.7,effects:{demand:.99,finance:1,material:1.09,shipping:1.06,fuel:1,production:.86,segments:{}},detail:"Tier suppliers struggle to meet demand. Production capacity and component availability fall until the bottleneck clears."}
];
function ensure(state){
 const w=state.worldEconomy=state.worldEconomy||{};w.activeEvents=Array.isArray(w.activeEvents)?w.activeEvents:[];w.eventHistory=Array.isArray(w.eventHistory)?w.eventHistory:[];return w;
}
function template(id){return TEMPLATES.find(x=>x.id===id)||null;}
function effects(state){
 const w=ensure(state),out={demand:1,finance:1,material:1,shipping:1,fuel:1,production:1,segments:{}};
 for(const e of w.activeEvents){const t=template(e.id);if(!t)continue;for(const k of ["demand","finance","material","shipping","fuel","production"])out[k]*=num(t.effects[k],1);for(const [seg,m] of Object.entries(t.effects.segments||{}))out.segments[seg]=(out.segments[seg]||1)*num(m,1);}
 out.demand=clamp(out.demand,.55,1.45);out.finance=clamp(out.finance,.55,1.30);out.material=clamp(out.material,.65,1.75);out.shipping=clamp(out.shipping,.65,2.10);out.fuel=clamp(out.fuel,.60,2.20);out.production=clamp(out.production,.60,1.20);for(const k of Object.keys(out.segments))out.segments[k]=clamp(out.segments[k],.55,1.45);return out;
}
function segmentMultiplier(state,segment){const e=effects(state);return e.demand*num(e.segments?.[String(segment)]??1,1);}
function beginEvent(state,t,randomInt,log){
 const w=ensure(state),duration=Math.max(2,randomInt(t.duration[0],t.duration[1])),p=num(state.year)*12+num(state.month),row={id:t.id,name:t.name,startedYear:num(state.year),startedMonth:num(state.month),startedPeriod:p,remainingMonths:duration,totalMonths:duration,detail:t.detail};
 w.activeEvents.push(row);w.eventHistory.unshift({...row,type:"started"});w.eventHistory=w.eventHistory.slice(0,60);w.events=Array.isArray(w.events)?w.events:[];w.events.unshift({year:state.year,month:state.month,name:t.name,type:"persistent",duration,detail:t.detail});w.events=w.events.slice(0,36);log?.("World event started: "+t.name+" — "+t.detail+" Expected duration: about "+duration+" months.");return row;
}
function processMonth(state,opts={}){
 const w=ensure(state),p=num(state.year)*12+num(state.month);if(num(w.lastPersistentEventPeriod,-1)===p)return{active:w.activeEvents,effects:effects(state),started:null,ended:[]};
 const random=typeof opts.random==="function"?opts.random:Math.random,randomInt=typeof opts.randomInt==="function"?opts.randomInt:(a,b)=>Math.floor(a+random()*(b-a+1)),log=opts.log||(()=>{}),ended=[];
 for(const e of w.activeEvents)e.remainingMonths=Math.max(0,num(e.remainingMonths)-1);
 for(const e of w.activeEvents.filter(x=>num(x.remainingMonths)<=0)){ended.push(e);w.eventHistory.unshift({...e,endedYear:num(state.year),endedMonth:num(state.month),type:"ended"});log("World event ended: "+e.name+".");}
 w.activeEvents=w.activeEvents.filter(x=>num(x.remainingMonths)>0);
 const chance=w.activeEvents.length?.022:.055;let started=null;
 if(random()<chance){const active=new Set(w.activeEvents.map(x=>x.id)),eligible=TEMPLATES.filter(t=>num(state.year)>=num(t.minYear)&&!active.has(t.id));if(eligible.length){const total=eligible.reduce((a,t)=>a+num(t.weight,1),0),roll=random()*total;let acc=0,pick=eligible[eligible.length-1];for(const t of eligible){acc+=num(t.weight,1);if(roll<=acc){pick=t;break;}}started=beginEvent(state,pick,randomInt,log);}}
 w.eventHistory=w.eventHistory.slice(0,60);w.lastPersistentEventPeriod=p;w.currentEventEffects=effects(state);return{active:w.activeEvents,effects:w.currentEventEffects,started,ended};
}
function render(state){
 const w=ensure(state),active=w.activeEvents||[],e=effects(state);
 return"<details class='world-event-panel' "+(active.length?"open":"")+"><summary><span><b>ACTIVE WORLD EVENTS</b><small>"+active.length+" active • real demand, financing, materials, freight and production effects</small></span><strong>"+(active.length?Math.round(e.demand*100)+"% DEMAND":"STABLE")+"</strong></summary><div class='world-event-body'>"+(active.length?active.map(x=>{const t=template(x.id);return"<article class='world-event-card'><div><span>"+x.name.toUpperCase()+"</span><b>"+num(x.remainingMonths)+" MO REMAIN</b></div><p>"+x.detail+"</p><small>Demand "+Math.round(num(t?.effects?.demand,1)*100)+"% • finance "+Math.round(num(t?.effects?.finance,1)*100)+"% • materials "+Math.round(num(t?.effects?.material,1)*100)+"% • production "+Math.round(num(t?.effects?.production,1)*100)+"%</small></article>"}).join(""):"<p class='muted'>No persistent global disruption is active. Normal macro conditions still move every month.</p>")+"<div class='mini-kpis'><div><span>TOTAL DEMAND EFFECT</span><b>"+Math.round(e.demand*100)+"%</b></div><div><span>FINANCE EFFECT</span><b>"+Math.round(e.finance*100)+"%</b></div><div><span>MATERIAL COST</span><b>"+Math.round(e.material*100)+"%</b></div><div><span>FREIGHT COST</span><b>"+Math.round(e.shipping*100)+"%</b></div><div><span>FACTORY THROUGHPUT</span><b>"+Math.round(e.production*100)+"%</b></div></div></div></details>";
}
function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);},s={year:1973,month:0,worldEconomy:{activeEvents:[{id:"oil_crisis",remainingMonths:6,totalMonths:10}],eventHistory:[]}};const e=effects(s);check(e.fuel>1.4,"oil event did not raise fuel pressure");check(segmentMultiplier(s,"Utility")<segmentMultiplier(s,"Budget"),"oil crisis did not shift segment demand");const before=s.worldEconomy.activeEvents[0].remainingMonths;processMonth(s,{random:()=>1,randomInt:(a)=>a});check(s.worldEconomy.activeEvents[0].remainingMonths===before-1,"event duration did not advance");const snapshot=JSON.stringify(s.worldEconomy);processMonth(s,{random:()=>0});check(JSON.stringify(s.worldEconomy)===snapshot,"same-period event processing was not idempotent");return{ok:failures.length===0,failures};
}
window.MDXWorldEvents={TEMPLATES,ensure,effects,segmentMultiplier,processMonth,render,runSelfTests};
})();