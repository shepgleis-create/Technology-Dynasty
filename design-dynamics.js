/* Motor Dynasty — Body Design & Chassis Dynamics, checklist 201-400.
   Real funded design programs, permanent specification consequences,
   competitor engineering choices, audit history and save-safe state. */
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const N=(x,f=0)=>x!==null&&x!==""&&Number.isFinite(Number(x))?Number(x):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DATA=[
["sedan","Sedan Proportions",35,75,53,"%","roofHeight","family", "sedan"],
["coupe","Coupe Proportions",20,70,45,"%","roofSlope","sport","coupe"],
["hatch","Hatchback Proportions",25,75,52,"%","hatchCargoRatio","practical","hatch"],
["wagon","Wagon Proportions",30,85,58,"%","cabinPosition","practical","wagon"],
["suv","SUV Proportions",25,90,60,"%","suvStance","utility","suv"],
["pickup","Pickup Proportions",25,90,55,"%","pickupBedRatio","utility","pickup"],
["van","Van Proportions",20,90,60,"%","vanCargoHeight","practical","van"],
["grille","Grille Geometry",15,90,50,"%","coolingOpening","cooling",null],
["headlight","Headlight Geometry",15,90,50,"%","headlightGeometry","style",null],
["taillight","Taillight Geometry",15,90,50,"%","taillightGeometry","style",null],
["bumper","Bumper Sculpting",0,90,40,"%","bumperSculpt","safety",null],
["hood","Hood Contours",15,90,48,"%","noseLength","aero",null],
["roofline","Roofline",10,90,50,"%","rooflineCurve","aero",null],
["arches","Wheel Arches",0,85,30,"%","fenderFlare","sport",null],
["windows","Window Shapes",15,90,50,"%","greenhouse","practical",null],
["paint","Paint Finishes",0,100,40,"%","paintFinish","appeal",null],
["wheels","Wheel Designs",0,100,45,"%","wheelDesign","sport",null],
["attachments","Aero Attachments",0,90,25,"%","aeroAttachments","aero",null],
["colorways","Interior Colorways",0,100,50,"%","interiorColorways","comfort",null],
["era","Design-Era Language",0,100,50,"%","eraDesignLanguage","appeal",null],
["dimensions","Platform Dimensions",3500,5900,4500,"mm","platformLength","practical",null],
["wheelbase","Wheelbase",2150,3600,2700,"mm","wheelbase","stability",null],
["track","Track Width",1280,1920,1480,"mm","trackWidth","handling",null],
["distribution","Weight Distribution",40,64,53,"% front","weightDistribution","handling",null],
["rigidity","Body Rigidity",20,95,50,"%","chassisRigidity","safety",null],
["frontSusp","Front Suspension",0,100,45,"%","frontSuspPrecision","handling",null],
["rearSusp","Rear Suspension",0,100,45,"%","rearSuspPrecision","handling",null],
["springs","Spring Rates",15,90,50,"%","springRate","handling",null],
["dampers","Damper Tuning",15,90,50,"%","damperTune","comfort",null],
["antiRoll","Anti-Roll Bars",0,95,35,"%","antiRoll","handling",null],
["steering","Steering Geometry",15,90,50,"%","steeringRatio","handling",null],
["brakes","Brake Sizing",220,410,260,"mm","rotorSize","safety",null],
["tires","Tire Compounds",0,100,50,"%","tireCompoundGrade","handling",null],
["wheelSize","Wheel Sizing",12,23,14,"in","wheel","sport",null],
["drag","Aerodynamic Drag",15,70,45,"%","aeroRefinement","aero",null],
["downforce","Downforce",0,85,20,"%","downforceSetting","handling",null],
["rideHeight","Ride Height",85,340,165,"mm","rideHeight","utility",null],
["nvh","NVH Isolation",0,100,50,"%","nvhTune","comfort",null],
["crash","Crash Structures",15,95,45,"%","crashProtection","safety",null],
["durability","Durability Testing",10,100,50,"%","durabilityValidation","reliability",null]
];
const TOPICS=Object.freeze(DATA.map(([key,label,min,max,initial,unit,field,discipline,body],i)=>Object.freeze({
 key,label,min,max,initial,unit,field,discipline,body,group:i<20?"body":"chassis",firstId:201+i*5,
 step:unit==="mm"?5:unit==="in"?1:1})));
const BY_KEY=Object.fromEntries(TOPICS.map(t=>[t.key,t]));
const AXES={
 family:{handling:-.10,comfort:.50,safety:.16,appeal:.22,aero:-.20,cost:.35,weight:.25},
 sport:{handling:.85,comfort:-.15,safety:.02,appeal:.42,aero:.05,cost:.55,weight:.12},
 practical:{handling:-.18,comfort:.40,safety:.18,appeal:.14,aero:-.30,cost:.42,weight:.40},
 utility:{handling:-.32,comfort:.05,safety:.30,appeal:.10,aero:-.42,cost:.55,weight:.52},
 cooling:{handling:.03,comfort:.01,safety:.02,appeal:.30,aero:-.27,cost:.25,weight:.08},
 style:{handling:0,comfort:0,safety:.06,appeal:.74,aero:-.06,cost:.35,weight:.02},
 aero:{handling:.08,comfort:.07,safety:.02,appeal:.23,aero:.80,cost:.40,weight:-.08},
 safety:{handling:-.04,comfort:.06,safety:.84,appeal:.14,aero:-.08,cost:.56,weight:.28},
 appeal:{handling:0,comfort:.10,safety:0,appeal:.90,aero:0,cost:.30,weight:.02},
 comfort:{handling:-.18,comfort:.90,safety:.08,appeal:.22,aero:0,cost:.42,weight:.40},
 stability:{handling:.56,comfort:.29,safety:.23,appeal:.06,aero:-.06,cost:.50,weight:.34},
 handling:{handling:.95,comfort:-.26,safety:.15,appeal:.10,aero:.02,cost:.55,weight:.08},
 reliability:{handling:0,comfort:.06,safety:.33,appeal:.12,aero:0,cost:.38,weight:.10}
};
const date=s=>({year:N(s.year,1970),month:N(s.month),day:N(s.day,1)});
const stamp=s=>N(s.year,1970)*372+N(s.month)*31+N(s.day,1);
const month=s=>N(s.year,1970)*12+N(s.month);
const hash=str=>{let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)/4294967295};
const safeState=s=>s&&typeof s==="object"?s:null;
const targetKey=id=>id==null||id==="draft"?"draft":"vehicle:"+String(id);
function ensure(s){
 if(!safeState(s))return null;
 const d=s.designDynamics&&typeof s.designDynamics==="object"?s.designDynamics:{};
 d.version=1;d.records=d.records&&typeof d.records==="object"?d.records:{};
 d.programs=Array.isArray(d.programs)?d.programs:[];
 d.audit=Array.isArray(d.audit)?d.audit:[];
 d.aiLog=Array.isArray(d.aiLog)?d.aiLog:[];
 d.lastDay=N(d.lastDay,-1);d.lastMonth=N(d.lastMonth,-1);
 d.nextId=Math.max(1,Math.floor(N(d.nextId,1)));
 s.designDynamics=d;return d;
}
function record(s,action,detail){
 const d=ensure(s),row={id:d.nextId++,...date(s),action,...detail};
 d.audit.unshift(row);d.audit=d.audit.slice(0,600);return row;
}
function vehicle(s,id){
 return id==null||id==="draft"?s.vehicleDraft:(Array.isArray(s.vehicles)?s.vehicles:[]).find(v=>String(v.id)===String(id));
}
function entry(s,id){
 const d=ensure(s),k=targetKey(id);
 if(!d.records[k])d.records[k]={values:{},history:[],revision:0,appliedModifiers:{}};
 return d.records[k];
}
function value(s,key,id){
 const t=BY_KEY[key],v=vehicle(s,id),r=entry(s,id);
 if(!t)return null;
 if(Number.isFinite(Number(r.values[key])))return Number(r.values[key]);
 const design=v?.design||v||{};
 return Number.isFinite(Number(design[t.field]))?clamp(N(design[t.field]),t.min,t.max):t.initial;
}
function effects(t,oldValue,newValue){
 const range=Math.max(1,t.max-t.min),p=(newValue-oldValue)/range,a=AXES[t.discipline],ext=Math.pow(Math.abs((newValue-t.initial)/range),2)-Math.pow(Math.abs((oldValue-t.initial)/range),2);
 const delta=x=>Number((p*x).toFixed(4));
 return {handling:delta(a.handling*12)-ext*2,comfort:delta(a.comfort*12)-ext*.8,safety:delta(a.safety*10),
  appeal:delta(a.appeal*14),aero:delta(a.aero*8),reliability:delta((a.safety+a.comfort)*2),
  massKg:Math.round(p*a.weight*95),unitCost:Math.round(p*a.cost*460),complexity:Math.round(ext*25),
  warning:Math.abs((newValue-t.initial)/range)>.36?"Extreme specification: confirm packaging, homologation and production tooling":"Within normal engineering envelope"};
}
function quote(s,key,next,id="draft"){
 const t=BY_KEY[key],v=vehicle(s,id);if(!t)return{ok:false,reason:"Unknown design or chassis subsystem"};
 if(!v)return{ok:false,reason:"Vehicle is not available"};
 const n=N(next,NaN);if(!Number.isFinite(n)||n<t.min||n>t.max||Math.abs((n-t.min)/t.step-Math.round((n-t.min)/t.step))>.001)return{ok:false,reason:"Outside the permitted engineering range or increment"};
 const before=value(s,key,id);
 if(Math.abs(before-n)<1e-8)return{ok:false,reason:"Specification is unchanged"};
 const body=String(v.design?.body||v.body||"sedan").toLowerCase();
 const compatible=!t.body||t.body===body||(t.body==="hatch"&&body==="hatchback");
 if(!compatible)return{ok:false,reason:t.label+" requires a "+t.body+" body; current vehicle is "+body};
 const packaging=G.MDXDesignPackaging?.evaluate?.(s,v,key,n,id);
 if(packaging?.ok===false)return{ok:false,reason:packaging.errors.join(" "),packaging};
 const currentYear=N(s.year,1970),era=clamp(Math.pow(1.03,currentYear-1970),.19,10),
 released=id!=="draft",move=Math.abs(n-before)/Math.max(1,t.max-t.min),
 complexity=t.discipline==="safety"||t.discipline==="reliability"?1.3:1;
 const days=Math.max(5,Math.ceil((released?30:9)+(released?46:25)*move*complexity));
 const budget=Math.round(((released?85000:12000)+(released?110000:27000)*move*complexity)*era/100)*100;
 const costPerDay=Math.ceil(budget/days),performance=effects(t,before,n);
 const dependencyWarning=t.group==="chassis"&&released&&v.productionStatus!=="production"?"Production tooling is not yet active":null;
 return {ok:true,topic:t.key,title:t.label,target:id,from:before,to:n,days,budget,costPerDay,unit:t.unit,performance,dependencyWarning,packaging,
  explanation:t.label+" alters "+t.discipline+" and creates real engineering, tooling and production consequences"};
}
function commission(s,key,next,id="draft"){
 const q=quote(s,key,next,id);if(!q.ok)return q;const d=ensure(s);
 if(d.programs.some(p=>["active","paused_funding","paused_dependency"].includes(p.status)&&p.topic===key&&p.target===id))return{ok:false,reason:"There is already an active engineering revision for this subsystem"};
 if(N(s.cash)<q.costPerDay)return{ok:false,reason:"Not enough cash to fund the first day of engineering"};
 const row={id:"dd"+d.nextId++,target:id,topic:key,from:q.from,to:q.to,days:q.days,remaining:q.days,budget:q.budget,spent:0,status:"active",started:date(s),lastStamp:null,history:[]};
 d.programs.push(row);record(s,"commissioned",{topic:key,target:id,from:q.from,to:q.to,budget:q.budget,days:q.days});
 return{ok:true,program:row,quote:q};
}
function cancel(s,id){
 const d=ensure(s),p=d.programs.find(x=>x.id===id);if(!p||!["active","paused_funding","paused_dependency"].includes(p.status))return{ok:false,reason:"Active or paused project not found"};
 p.status="cancelled";record(s,"cancelled",{program:p.id,topic:p.topic,target:p.target,spent:p.spent});
 return{ok:true,spent:p.spent};
}
function addStats(v,e,reverse=1){
 if(!v.stats||typeof v.stats!=="object")return;
 for(const [src,dst,low,high] of [["handling","handling",0,100],["comfort","comfort",0,100],["safety","safety",0,100],["reliability","reliability",0,100],["appeal","appeal",0,100]]){
  if(Number.isFinite(Number(v.stats[dst])))v.stats[dst]=clamp(N(v.stats[dst])+reverse*N(e[src]),low,high);
 }
 if(Number.isFinite(Number(v.stats.lb)))v.stats.lb=Math.max(700,N(v.stats.lb)+reverse*N(e.massKg)*2.20462);
 if(Number.isFinite(Number(v.stats.unitCost)))v.stats.unitCost=Math.max(0,N(v.stats.unitCost)+reverse*N(e.unitCost));
 if(Number.isFinite(Number(v.stats.manufacturingUnitCost)))v.stats.manufacturingUnitCost=Math.max(0,N(v.stats.manufacturingUnitCost)+reverse*N(e.unitCost));
 if(Number.isFinite(Number(v.stats.aero)))v.stats.aero=clamp(N(v.stats.aero)+reverse*N(e.aero),0,100);
}
function finish(s,p){
 const t=BY_KEY[p.topic],v=vehicle(s,p.target),r=entry(s,p.target);
 if(!v){p.status="cancelled";record(s,"missing_vehicle",{program:p.id,topic:p.topic});return;}
 const prev=Number.isFinite(Number(r.values[p.topic]))?Number(r.values[p.topic]):p.from;
 const delta=effects(t,prev,p.to);
 r.baselines=r.baselines&&typeof r.baselines==="object"?r.baselines:{};
 if(!Number.isFinite(Number(r.baselines[p.topic])))r.baselines[p.topic]=p.from;
 if(p.target==="draft"){
  const d=v.design||v;d[t.field]=p.to;
  v.designDynamicsRevision=(N(v.designDynamicsRevision)+1);
 }else{
  v.design=v.design&&typeof v.design==="object"?v.design:{};
  v.design[t.field]=p.to;
  addStats(v,delta,1);
  v.designDynamicsRevision=N(v.designDynamicsRevision)+1;
  v.designDynamicsModifiers=v.designDynamicsModifiers||{};
  v.designDynamicsModifiers[p.topic]=p.to;
 }
 r.values[p.topic]=p.to;r.revision++;
 const row={...date(s),topic:p.topic,from:p.from,to:p.to,spent:p.spent,deltas:delta,program:p.id};
 r.history.unshift(row);r.history=r.history.slice(0,100);r.appliedModifiers[p.topic]=effects(t,r.baselines[p.topic],p.to);
 p.remaining=0;p.status="completed";p.completed=date(s);
 record(s,"completed",{topic:p.topic,target:p.target,from:p.from,to:p.to,spent:p.spent,performance:delta,program:p.id});
}
function processDay(s){
 const d=ensure(s);if(!d)return 0;const today=stamp(s);if(d.lastDay===today)return 0;
 d.lastDay=today;let paid=0;
 for(const p of d.programs.filter(x=>["active","paused_funding","paused_dependency"].includes(x.status))){
  const live=vehicle(s,p.target),check=live?G.MDXDesignPackaging?.evaluate?.(s,live,p.topic,p.to,p.target):null;
  if(check?.ok===false){
   if(p.status!=="paused_dependency"){
    p.status="paused_dependency";p.dependencyWarnings=N(p.dependencyWarnings)+1;
    record(s,"dependency_paused",{program:p.id,topic:p.topic,reason:check.errors.join(" "),spent:p.spent});
   }
   p.lastDependencyErrors=[...check.errors];continue;
  }
  if(p.status==="paused_dependency"){
   p.status="active";p.lastDependencyErrors=[];record(s,"dependency_resumed",{program:p.id,topic:p.topic});
  }
  const remainingCost=Math.max(0,p.budget-p.spent),daily=Math.min(remainingCost,Math.ceil(remainingCost/Math.max(1,p.remaining)));
  if(daily>N(s.cash)+.001){if(p.status!=="paused_funding"){p.status="paused_funding";p.fundingWarnings=N(p.fundingWarnings)+1;record(s,"funding_paused",{program:p.id,topic:p.topic,needed:daily,available:Math.max(0,N(s.cash)),spent:p.spent});}continue;}if(p.status==="paused_funding"){p.status="active";record(s,"funding_resumed",{program:p.id,topic:p.topic,spent:p.spent});}
  s.cash-=daily;p.spent+=daily;paid+=daily;p.remaining--;
  p.lastStamp=today;
  if(p.remaining<=0&&p.spent+1>=p.budget)finish(s,p);
 }
 return paid;
}
function processMonth(s){
 const d=ensure(s);if(!d)return 0;const now=month(s);if(d.lastMonth===now)return 0;d.lastMonth=now;
 let decisions=0;const rivals=Array.isArray(s.industry)?s.industry:[];
 rivals.forEach((r,i)=>{
  if(!r||["bankrupt","liquidated","merged_into_player"].includes(String(r.status||""))||N(r.founded,1900)>N(s.year,1970))return;
  const index=(now+i*7)%TOPICS.length,t=TOPICS[index],identity=String(r.id||r.name||i);
  const strategy=/sport|race|performance/i.test(r.corporatePersonality||"")?"performance":/luxury|premium/i.test(r.name||"")?"luxury":N(r.cash)<3000000?"cost":"balanced";
  const direction=strategy==="performance"?(["sport","handling","aero"].includes(t.discipline)?1:-.4):strategy==="luxury"?(["comfort","appeal","safety"].includes(t.discipline)?1:.3):strategy==="cost"?-.6:.45;
  const before=N(r.designDynamicsAI?.values?.[t.key],t.initial),change=t.step*Math.max(1,Math.round((t.max-t.min)/t.step*.07)),after=clamp(before+change*direction,t.min,t.max);
  const request=Math.round(Math.max(6000,11000+Math.abs(after-before)/Math.max(1,t.max-t.min)*60000)*clamp(Math.pow(1.03,N(s.year,1970)-1970),.18,10));
  const reserve=Math.max(100000,N(r.monthRevenue)*.7),approved=N(r.cash)>request+reserve?request:0;
  const reason=approved?strategy+" design program: "+t.label+" aligned with "+t.discipline+" without breaching cash reserves":"Deferred "+t.label+" because company cash did not exceed required reserve";
  r.designDynamicsAI=r.designDynamicsAI||{values:{},history:[]};
  r.designDynamicsAI.values=r.designDynamicsAI.values||{};
  r.designDynamicsAI.history=Array.isArray(r.designDynamicsAI.history)?r.designDynamicsAI.history:[];
  if(approved&&after!==before){
   r.cash=N(r.cash)-approved;r.designDynamicsAI.values[t.key]=after;
   const activeCar=(Array.isArray(r.aiCars)?r.aiCars:[]).find(x=>x.active!==false);
   if(activeCar){activeCar.designDynamics=activeCar.designDynamics||{};activeCar.designDynamics[t.key]=after;activeCar.designStyle=activeCar.designStyle||{};activeCar.designStyle[t.field]=after;}
  }
  const ev={...date(s),topic:t.key,strategy,from:before,to:approved?after:before,budget:approved,reason,modelCount:(r.aiCars||[]).length};
  r.designDynamicsAI.history.unshift(ev);r.designDynamicsAI.history=r.designDynamicsAI.history.slice(0,48);
  d.aiLog.unshift({manufacturer:identity,name:String(r.name||identity),...ev});decisions++;
 });
 d.aiLog=d.aiLog.slice(0,300);return decisions;
}
function resetDraft(s){
 const d=ensure(s);if(!d)return;
 for(const p of d.programs.filter(p=>["active","paused_funding"].includes(p.status)&&p.target==="draft")){
  p.status="cancelled";record(s,"cancelled_new_variant",{program:p.id,topic:p.topic,spent:p.spent});
 }
 const old=d.records.draft;
 d.records.draft={values:{},history:[],baselines:{},revision:N(old?.revision,0)+1,appliedModifiers:{}};
 record(s,"new_design_variant",{previousChanges:Object.keys(old?.values||{}).length});
}
function syncDraft(s,car){
 if(!s||!car)return car;const d=ensure(s),r=d.records.draft;if(!r||car.designDynamicsRevision===r.revision)return car;
 for(const [key,val] of Object.entries(r.values)){const t=BY_KEY[key];if(t&&Number.isFinite(Number(val)))car[t.field]=val;}
 car.designDynamicsRevision=r.revision;return car;
}
function adjustDraftSpec(s,car,spec){
 const r=ensure(s)?.records?.draft;if(!r||!spec)return spec;
 const adjustments={handling:0,comfort:0,safety:0,appeal:0,aero:0,reliability:0,massKg:0,unitCost:0};
 for(const row of Object.values(r.appliedModifiers||{}))for(const k of Object.keys(adjustments))adjustments[k]+=N(row[k]);
 return {...spec,handling:clamp(N(spec.handling)+adjustments.handling,0,100),
  comfort:clamp(N(spec.comfort)+adjustments.comfort,0,100),
  safety:clamp(N(spec.safety)+adjustments.safety,0,100),
  reliability:clamp(N(spec.reliability)+adjustments.reliability,0,100),
  aero:clamp(N(spec.aero)+adjustments.aero,0,100),
  unitCost:Math.max(0,N(spec.unitCost)+adjustments.unitCost),
  manufacturingUnitCost:Math.max(0,N(spec.manufacturingUnitCost)+adjustments.unitCost),
  lb:Math.max(700,N(spec.lb)+adjustments.massKg*2.20462),
  designDynamics:{...r.values}};
}
function audit(s,key,id="draft"){
 const r=entry(s,id);return{topic:key,target:id,current:value(s,key,id),history:r.history.filter(x=>x.topic===key),programs:ensure(s).programs.filter(x=>x.topic===key&&x.target===id),rivals:ensure(s).aiLog.filter(x=>x.topic===key).slice(0,12)};
}
G.MDXDesignDynamics={TOPICS,BY_KEY,AXES,ensure,entry,value,effects,quote,commission,cancel,processDay,processMonth,resetDraft,syncDraft,adjustDraftSpec,audit,vehicle};
})();
