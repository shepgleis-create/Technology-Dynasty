/* Motor Dynasty — production engineering packaging & homologation gate.
   Works with both saved production models and new vehicle drafts.
   Deterministic constraints; no fake eligibility, silent autobuild or cash changes. */
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const n=(v,d=0)=>v!==null&&v!==""&&Number.isFinite(Number(v))?Number(v):d;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const RULE_VERSION=1;
function inspect(s,v,key,proposed,id="draft"){
 const D=G.MDXDesignDynamics,topic=D?.BY_KEY?.[key];
 if(!topic||!v)return{ok:false,errors:["Vehicle or engineering subsystem missing"],warnings:[],measurements:{}};
 const model=v.design&&typeof v.design==="object"?v.design:v;
 const at=(subject,defaultValue)=>{
  const t=D.BY_KEY[subject];
  if(!t)return defaultValue;
  if(subject===key)return n(proposed,defaultValue);
  const r=D.ensure(s)?.records?.[id==="draft"?"draft":"vehicle:"+id];
  if(r&&Number.isFinite(Number(r.values?.[subject])))return n(r.values[subject],defaultValue);
  return n(model[t.field],defaultValue);
 };
 const errors=[],warnings=[];
 const wb=at("wheelbase",n(model.wheelbase,2700)),
  length=at("dimensions",n(model.platformLength,4500)),
  wheels=at("wheelSize",n(model.wheel,14)),
  rotor=at("brakes",n(model.rotorSize,260)),
  innerBarrel=wheels*25.4-55,
  clearance=innerBarrel-rotor,
  overhang=length-wb,
  clearanceMin=20;
 if(overhang<590){
  errors.push("Wheelbase cannot fit the platform. Front and rear crash/overhang space requires at least 590 mm.");
 }else if(overhang<700){
  warnings.push("Less than 700 mm total body overhang leaves limited crash and bumper packaging space.");
 }
 if(clearance<0){
  errors.push("Brake rotor does not fit inside the wheel. Increase wheel size or reduce rotor diameter.");
 }else if(clearance<clearanceMin){
  warnings.push("Brake-to-wheel clearance below 20 mm requires high-cost caliper packaging review.");
 }
 const body=String(model.body||"sedan").toLowerCase();
 const height=at("rideHeight",n(model.rideHeight,165));
 if(["pickup","suv"].includes(body)&&height<130)warnings.push("Low utility-vehicle ride height reduces approach, departure and breakover clearance.");
 const rigidity=at("rigidity",n(model.chassisRigidity,50));
 if(rigidity>88)warnings.push("Extreme body rigidity needs extra tooling and durability revalidation.");
 const brakeBias=n(model.brakeBias,62);
 if(rotor>=380&&brakeBias>72)warnings.push("Large rotors with extreme front brake bias may overheat front tires and destabilize braking.");
 const distribution=at("distribution",n(model.weightDistribution,53));
 if(distribution>=62&&String(model.drivetrain||"RWD")==="RWD")warnings.push("Front-heavy rear-drive layout may lose traction under launch and corner exit.");
 if(distribution<=42&&String(model.drivetrain||"FWD")==="FWD")warnings.push("Rear-heavy front-drive layout reduces driven-axle loading.");
 const downforce=at("downforce",n(model.downforceSetting,20));
 const attachment=at("attachments",n(model.aeroAttachments,25));
 if(downforce>70&&attachment<35)warnings.push("High downforce target is difficult without a corresponding splitter, diffuser or wing package.");
 if(n(s?.year,1970)<1955&&rotor>340)warnings.push("Large multi-piston high-performance brakes are experimental for this production era.");
 const risk=clamp((clearance<clearanceMin?14:0)+(overhang<700?12:0)+(rigidity>88?8:0)+(height<130&&["pickup","suv"].includes(body)?10:0),0,100);
 return {
  ok:errors.length===0,errors,warnings,version:RULE_VERSION,
  measurements:{wheelbaseMm:wb,overallLengthMm:length,totalOverhangMm:overhang,
   wheelDiameterIn:wheels,brakeRotorMm:rotor,wheelBrakeClearanceMm:Math.round(clearance*10)/10,
   rideHeightMm:height,frontWeightPercent:distribution,
   structuralRigidityPercent:rigidity,packagingRisk:risk},
  dependencies:["wheelbase","dimensions","wheelSize","brakes","rideHeight","rigidity","distribution","downforce","attachments"],
  explanation:"Engineering packaging checked against body length, crash space, wheel barrel, rotor diameter, suspension clearance and era."
 };
}
G.MDXDesignPackaging={RULE_VERSION,evaluate:inspect};
})();
