"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
global.window=global;
require("../design-dynamics.js");
require("../design-dynamics-packaging.js");
const D=global.MDXDesignDynamics,P=global.MDXDesignPackaging;
const state=()=>({year:1970,month:0,day:1,cash:5000000,vehicleDraft:{name:"Sedan",body:"sedan",wheel:14,wheelbase:2700,platformLength:4500,trackWidth:1480,rotorSize:260,rideHeight:165,chassisRigidity:50,brakeBias:62},vehicles:[],industry:[]});
function tick(s,days){for(let i=0;i<days;i++){D.processDay(s);s.day++;if(s.day>28){s.day=1;s.month++;if(s.month>11){s.month=0;s.year++;}}}}
test("Brake rotor cannot be larger than actual inner wheel barrel",()=>{
 const s=state();const result=D.quote(s,"brakes",410);
 assert.equal(result.ok,false);assert.match(result.reason,/rotor does not fit/i);
 assert.equal(D.commission(s,"brakes",410).ok,false);assert.equal(s.cash,5000000);
});
test("A larger real wheel allows previously incompatible rotor package",()=>{
 const s=state();s.vehicleDraft.wheel=20;const p=D.quote(s,"brakes",410);
 assert.equal(p.ok,true);assert.ok(p.packaging.measurements.wheelBrakeClearanceMm>0);
});
test("Changing wheel diameter must not strand an installed brake disc",()=>{
 const s=state();const p=D.quote(s,"wheelSize",12);
 assert.equal(p.ok,false);assert.match(p.reason,/Increase wheel size/);
});
test("Platform length cannot shrink below wheelbase and structural overhang",()=>{
 const s=state();s.vehicleDraft.wheelbase=3100;const bad=D.quote(s,"dimensions",3600);
 assert.equal(bad.ok,false);assert.match(bad.reason,/Wheelbase cannot fit/);
});
test("Overhang close to legal minimum raises warnings and an elevated risk score",()=>{
 const s=state();s.vehicleDraft.wheelbase=3000;const p=D.quote(s,"dimensions",3650);
 assert.equal(p.ok,true);assert.ok(p.packaging.warnings.some(x=>x.includes("700 mm")));
 assert.ok(p.packaging.measurements.packagingRisk>=10);
});
test("No unrelated cosmetic input is charged for a failed structural package",()=>{
 const s=state();s.vehicleDraft.wheel=12;const before=s.cash;
 const q=D.quote(s,"paint",65);assert.equal(q.ok,false,"invalid current build needs rectification before approval");
 assert.equal(s.cash,before);
});
test("In-flight programs pause when another completed change invalidates their package",()=>{
 const s=state();s.vehicleDraft.wheel=20;
 const wheel=D.commission(s,"wheelSize",15);assert.equal(wheel.ok,true);
 const brakes=D.commission(s,"brakes",350);assert.equal(brakes.ok,true);
 const days=Math.max(wheel.program.days,brakes.program.days);
 tick(s,days+1);
 assert.equal(wheel.program.status,"completed");
 assert.equal(brakes.program.status,"paused_dependency");
 assert.ok(brakes.program.lastDependencyErrors.some(x=>x.includes("Brake rotor")));
 const spent=brakes.program.spent,cash=s.cash;
 tick(s,2);assert.equal(brakes.program.spent,spent);assert.equal(s.cash,cash);
 assert.equal(D.commission(s,"brakes",360).ok,false,"paused contract remains exclusive");
 const cancel=D.cancel(s,brakes.program.id);assert.equal(cancel.ok,true);
 assert.equal(brakes.program.status,"cancelled");
});
test("Cumulative specification physics are path-independent, including repeated redesigns",()=>{
 const s=state(),t=D.BY_KEY.roofline;
 const direct=D.effects(t,50,60),a=D.effects(t,50,70),b=D.effects(t,70,60);
 for(const k of ["handling","comfort","safety","appeal","aero","reliability"]){
  assert.ok(Math.abs(direct[k]-a[k]-b[k])<0.0002,k);
 }
 const first=D.commission(s,"roofline",70);assert.equal(first.ok,true);tick(s,first.program.days);
 const second=D.commission(s,"roofline",60);assert.equal(second.ok,true);tick(s,second.program.days);
 const record=D.entry(s,"draft").appliedModifiers.roofline;
 assert.ok(Math.abs(record.aero-direct.aero)<.0002);
 assert.ok(Math.abs(record.handling-direct.handling)<.0002);
});
test("Packaging status and project audit survive JSON save/reload without granting free work",()=>{
 const s=state();s.vehicleDraft.wheel=20;
 D.commission(s,"wheelSize",15);D.commission(s,"brakes",350);
 tick(s,23);
 const copy=JSON.parse(JSON.stringify(s));
 const paused=copy.designDynamics.programs.find(x=>x.topic==="brakes");
 assert.equal(paused.status,"paused_dependency");
 assert.equal(D.processDay(copy),0,"same-date simulation must not pay twice");
 assert.ok(copy.designDynamics.audit.some(x=>x.action==="dependency_paused"));
});
test("Real saved production model revisions also enforce actual rotor fit",()=>{
 const s=state();s.vehicles.push({id:"built",name:"Built car",productionStatus:"production",design:{body:"sedan",wheel:14,rotorSize:260,wheelbase:2700,platformLength:4500},stats:{handling:50,comfort:50,safety:50,unitCost:3000,lb:2900}});
 const bad=D.quote(s,"brakes",410,"built");assert.equal(bad.ok,false);
 const okay=D.quote(s,"brakes",295,"built");assert.equal(okay.ok,true);
 assert.equal(D.commission(s,"brakes",295,"built").ok,true);
});
test("Interface declares a real packaging measurement panel and accessible dependency status",()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,"../design-dynamics-ui.js"),"utf8");
 const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
 assert.match(ui,/md-lab-homologation/);assert.match(ui,/wheelBrakeClearanceMm/);assert.match(ui,/PAUSED — PACKAGING CONFLICT/);
 assert.match(html,/design-dynamics-packaging\.js/);
});
