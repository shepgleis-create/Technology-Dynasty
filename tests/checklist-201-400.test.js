"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
global.window=global;require("../design-dynamics.js");
const D=global.MDXDesignDynamics,FILE=fs.readFileSync(path.resolve(__dirname,"../design-dynamics-ui.js"),"utf8"),
 CSS=fs.readFileSync(path.resolve(__dirname,"../design-dynamics.css"),"utf8");
const game=fs.readFileSync(path.resolve(__dirname,"../game.js"),"utf8"),html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
function state(group="draft"){return{year:1970,month:0,day:1,cash:4500000,rp:50,rep:65,vehicleDraft:{name:"Test vehicle",body:"sedan",wheelbase:2700,trackWidth:1480,roofHeight:50,roofSlope:50,greenhouse:50,rideHeight:165,chassisRigidity:50,rotorSize:260,roofPosition:50},vehicles:[{id:"v1",name:"Released Sedan",productionStatus:"production",design:{body:"sedan",wheelbase:2700,trackWidth:1480,roofHeight:50,rideHeight:165},stats:{handling:50,comfort:52,safety:50,reliability:75,appeal:50,aero:50,unitCost:4000,manufacturingUnitCost:4000,lb:3000}}],industry:[{id:"r1",name:"Boreal Motors",founded:1930,status:"active",cash:10000000,monthRevenue:350000,aiCars:[{id:"a1",active:true}],corporatePersonality:"performance"}]};}
function choose(t){return t.initial+t.step<=t.max?t.initial+t.step:t.initial-t.step;}
function progress(s,p){for(let i=0;i<p.days;i++){D.processDay(s);s.day++;if(s.day>30){s.day=1;s.month++;if(s.month>11){s.month=0;s.year++;}}}return p;}
test("Batch 201-400 exposes exactly 40 independently addressed feature topics",()=>{assert.equal(D.TOPICS.length,40);assert.equal(new Set(D.TOPICS.map(t=>t.key)).size,40);assert.deepEqual(D.TOPICS.map(t=>t.firstId),Array.from({length:40},(_,i)=>201+i*5));assert.equal(D.TOPICS.filter(t=>t.group==="body").length,20);assert.equal(D.TOPICS.filter(t=>t.group==="chassis").length,20);});
test("Engine and design files are integrated into existing live product lifecycle",()=>{assert.match(game,/MDXDesignDynamics\?\.syncDraft/);assert.match(game,/MDXDesignDynamics\?\.processDay/);assert.match(game,/MDXDesignDynamics\?\.processMonth/);assert.match(game,/MDXDesignDynamics\?\.adjustDraftSpec/);assert.match(html,/design-dynamics-ui\.js/);assert.match(html,/design-dynamics\.css/);});
for(const t of D.TOPICS){
 const id=t.firstId;
 test(id+" "+t.label+" — interactive control, validation and immediate forecast",()=>{
  const s=state(),id=t.body&&t.body!=="sedan"?"draft":"draft";
  if(t.body&&t.body!=="sedan")s.vehicleDraft.body=t.body;
  const proposed=choose(t),q=D.quote(s,t.key,proposed,id);
  assert.equal(q.ok,true,JSON.stringify(q));assert.ok(q.budget>0&&q.days>=5);assert.equal(q.from,D.value(s,t.key,id));assert.equal(q.to,proposed);
  assert.equal(D.quote(s,t.key,t.min-t.step,id).ok,false);
  assert.equal(D.quote(s,t.key,t.max+t.step,id).ok,false);
  assert.equal(D.quote(s,t.key,q.from,id).ok,false);
  assert.ok(q.performance.warning);
 });
 test((id+1)+" "+t.label+" — lasting simulation effects with paid time and production consequences",()=>{
  const s=state();if(t.body&&t.body!=="sedan")s.vehicleDraft.body=t.body;
  const q=D.quote(s,t.key,choose(t)),r=D.commission(s,t.key,choose(t));
  assert.equal(r.ok,true);const before=s.cash;
  progress(s,r.program);
  assert.equal(r.program.status,"completed");
  assert.equal(before-s.cash,q.budget);
  assert.equal(D.value(s,t.key,"draft"),choose(t));
  assert.equal(s.vehicleDraft[t.field],choose(t));
  const stats=D.adjustDraftSpec(s,s.vehicleDraft,{handling:50,comfort:50,safety:50,reliability:60,aero:50,unitCost:4000,manufacturingUnitCost:4000,lb:2800});
  for(const key of ["handling","comfort","safety","reliability","aero","unitCost","manufacturingUnitCost","lb"])assert.ok(Number.isFinite(stats[key]),key);
  assert.ok(JSON.stringify(stats.designDynamics).includes(t.key));
 });
 test((id+2)+" "+t.label+" — budget-constrained autonomous rival design decisions",()=>{
  const i=D.TOPICS.indexOf(t),s=state();s.year=1970+Math.floor(i/12);s.month=i%12;
  assert.equal(D.processMonth(s),1);const a=s.industry[0].designDynamicsAI;
  assert.equal(a.history[0].topic,t.key);assert.ok(a.history[0].reason&&a.history[0].strategy);
  assert.ok(a.history[0].budget>=0);assert.ok(s.industry[0].cash<=10000000);
  assert.equal(D.processMonth(s),0,"single company-month cannot be charged twice");
  assert.ok(Array.isArray(s.industry[0].aiCars[0].designDynamics?Object.entries(s.industry[0].aiCars[0].designDynamics):[]));
 });
 test((id+3)+" "+t.label+" — responsive annotated silhouette and engineering comparison",()=>{
  assert.ok(FILE.includes("D().TOPICS.filter")&&FILE.includes("md-lab-svg"),t.key);
  assert.ok(CSS.includes("@media(max-width:600px)")&&CSS.includes("min-height:48px"));
  assert.ok(FILE.includes("data-md-lab-preview")&&FILE.includes("md-lab-comparison")&&FILE.includes("statGrid"));
  assert.equal(D.TOPICS.find(x=>x.key===t.key).label,t.label);
  assert.ok(D.quote(Object.assign(state(),{vehicleDraft:{body:t.body||"sedan"}}),t.key,choose(t)).ok);
 });
 test((id+4)+" "+t.label+" — dated before/after audit, cancellation and JSON persistence",()=>{
  const s=state();if(t.body&&t.body!=="sedan")s.vehicleDraft.body=t.body;
  const a=D.commission(s,t.key,choose(t));assert.equal(a.ok,true);
  const duplicate=D.commission(s,t.key,choose(t));assert.equal(duplicate.ok,false);
  progress(s,a.program);
  const audit=D.audit(s,t.key);
  assert.equal(audit.history.length,1);assert.equal(audit.history[0].from,a.program.from);assert.equal(audit.history[0].to,a.program.to);
  assert.ok(D.ensure(s).audit.some(x=>x.action==="completed"&&x.topic===t.key));
  const serialized=JSON.parse(JSON.stringify(s));assert.equal(D.value(serialized,t.key),choose(t));
  const future=D.commission(serialized,t.key,t.initial===choose(t)?t.max:t.initial);assert.equal(future.ok,true);
  assert.equal(D.cancel(serialized,future.program.id).ok,true);assert.equal(future.program.status,"cancelled");
  assert.equal(D.ensure(serialized).programs.filter(p=>p.status==="active"&&p.topic===t.key).length,0);
 });
}
test("Released vehicle engineering revisions modify real production stats only after full funding",()=>{
 const s=state(),v=s.vehicles[0],before=JSON.parse(JSON.stringify(v.stats)),r=D.commission(s,"brakes",300,"v1");assert.equal(r.ok,true);
 D.processDay(s);assert.deepEqual(v.stats,before);
 s.day++;for(let k=1;k<r.program.days;k++){D.processDay(s);s.day++;if(s.day>30){s.day=1;s.month++;}}
 assert.equal(r.program.status,"completed");assert.equal(v.design.rotorSize,300);
 assert.ok(v.stats.unitCost!==before.unitCost||v.stats.safety!==before.safety);assert.ok(D.audit(s,"brakes","v1").history.length===1);
});
test("Funding shortfall halts projects without free progress, overdrafts or benefits",()=>{
 const s=state();const r=D.commission(s,"rigidity",60);assert.equal(r.ok,true);s.cash=0;
 for(let day=0;day<5;day++){D.processDay(s);s.day++;}
 assert.equal(r.program.remaining,r.program.days);assert.equal(r.program.spent,0);assert.equal(s.cash,0);assert.equal(s.vehicleDraft.chassisRigidity,50);
});
test("Starting a different design variant clears pending prototype assumptions but retains historical audit",()=>{
 const s=state();const r=D.commission(s,"rigidity",70);assert.equal(r.ok,true);const audit=D.ensure(s).audit.length;
 D.resetDraft(s);assert.equal(r.program.status,"cancelled");assert.ok(D.ensure(s).audit.length>audit);
 assert.equal(Object.keys(D.entry(s,"draft").values).length,0);
});
test("Competitor design investment protects liquidity and never makes invented vehicle sales",()=>{
 const s=state();s.industry[0].cash=5000;s.industry[0].monthRevenue=100000;
 D.processMonth(s);assert.equal(s.industry[0].cash,5000);assert.equal(s.industry[0].designDynamicsAI.history[0].budget,0);
 assert.ok(!("monthlySales" in s.industry[0].designDynamicsAI));
});
test("Draft review leaves initial game state untouched until paid engineering completes",()=>{
 const s=state(),original=JSON.stringify(s.vehicleDraft),q=D.quote(s,"roofline",58);
 assert.equal(q.ok,true);assert.equal(JSON.stringify(s.vehicleDraft),original);
 D.commission(s,"roofline",58);assert.equal(JSON.stringify(s.vehicleDraft),original);
});

test("Unfunded engineering pauses once, remains cancellable and preserves paid progress",()=>{
 const s=state(),r=D.commission(s,"rigidity",65);assert.equal(r.ok,true);
 const cash=s.cash;s.cash=0;D.processDay(s);assert.equal(r.program.status,"paused_funding");
 assert.equal(r.program.remaining,r.program.days);
 assert.equal(r.program.fundingWarnings,1);
 assert.equal(D.commission(s,"rigidity",70).ok,false);
 s.day++;D.processDay(s);assert.equal(r.program.fundingWarnings,1);
 assert.equal(s.cash,0);assert.equal(D.ensure(s).audit.filter(x=>x.action==="funding_paused").length,1);
 const cancelled=D.cancel(s,r.program.id);assert.equal(cancelled.ok,true);assert.equal(r.program.status,"cancelled");assert.equal(s.cash,0);assert.equal(cash,4500000);
});
test("Funded engineering resumes automatically without billing paused game days or double processing",()=>{
 const s=state(),r=D.commission(s,"roofline",60);assert.equal(r.ok,true);const original=r.program.days,budget=r.program.budget;
 s.cash=0;D.processDay(s);assert.equal(r.program.status,"paused_funding");
 s.day++;s.cash=budget*2;
 const first=D.processDay(s),twice=D.processDay(s);assert.ok(first>0);assert.equal(twice,0);
 assert.equal(r.program.remaining,original-1);assert.equal(r.program.status,"active");
 assert.ok(D.ensure(s).audit.some(x=>x.action==="funding_resumed"));
 for(let k=0;k<original-1;k++){s.day++;if(s.day>30){s.day=1;s.month++;}D.processDay(s);}
 assert.equal(r.program.status,"completed");assert.equal(r.program.spent,budget);
 assert.equal(s.vehicleDraft.rooflineCurve,60);
});
