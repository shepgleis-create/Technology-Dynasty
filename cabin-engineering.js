/* Motor Dynasty / cabin engineering: additive engineering controls and actual program economics.
   Built for checklist 601–700. Existing released cars and saved drafts retain their previous values. */
(()=>{
"use strict";
const G=typeof window==="object"?window:globalThis, num=(x,d=0)=>x==null||x===""||!Number.isFinite(Number(x))?d:Number(x),
  bound=(x,min,max)=>Math.min(max,Math.max(min,x)),safe=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const OPTIONS=Object.freeze({
 dashLayout:{title:"Dashboard architecture",options:{
  traditional:{name:"Traditional dashboard",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"Simple center-mounted controls"},
  driver:{name:"Driver-oriented cockpit",year:1960,cost:115,mass:2,comfort:1.1,luxury:1.5,safety:1,complexity:2,desc:"Controls aimed toward the driver"},
  wraparound:{name:"Wraparound cockpit",year:1980,cost:320,mass:5,comfort:3,luxury:6,safety:0,complexity:5,desc:"Sweeping trim and integrated controls"},
  modular:{name:"Modular dashboard",year:1995,cost:240,mass:1,comfort:2,luxury:3,safety:2,complexity:5,desc:"Shared, repairable electronic modules"}
 }},
 instrumentCluster:{title:"Instrument cluster",options:{
  analog:{name:"Analog gauges",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"Traditional mechanical readouts"},
  electronic:{name:"Electronic gauges",year:1975,cost:130,mass:1,comfort:1,luxury:2,safety:1,complexity:2,desc:"More instruments and diagnostics"},
  digital:{name:"Digital information cluster",year:1985,cost:410,mass:2,comfort:2,luxury:6,safety:2,complexity:7,desc:"Software-calibrated driver information"},
  widescreen:{name:"Reconfigurable display",year:2010,cost:850,mass:3,comfort:3,luxury:10,safety:3,complexity:12,desc:"High-resolution integrated display"}
 }},
 infotainment:{title:"Infotainment",options:{
  none:{name:"No infotainment",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"No extra consumer electronics"},
  cassette:{name:"Entertainment head unit",year:1965,cost:100,mass:1,comfort:1,luxury:1,safety:0,complexity:1,desc:"Basic media and driver controls"},
  navigation:{name:"Built-in navigation",year:1992,cost:620,mass:4,comfort:4,luxury:5,safety:0,complexity:8,desc:"Integrated route display and electronics"},
  connected:{name:"Connected infotainment",year:2012,cost:1050,mass:5,comfort:6,luxury:10,safety:1,complexity:12,desc:"Connected cabin interface, complex software"}
 }},
 climateControl:{title:"Climate system controls",options:{
  vents:{name:"Manual ventilation",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"Simple vents without climate automation"},
  manual:{name:"Manual A/C controls",year:1948,cost:55,mass:1,comfort:2,luxury:1,safety:0,complexity:1,requiresAc:true,desc:"Cabin temperature adjusted manually"},
  automatic:{name:"Automatic climate",year:1965,cost:270,mass:3,comfort:5,luxury:4,safety:1,complexity:5,requiresAc:true,desc:"Sensor-controlled air mixing"},
  multizone:{name:"Multizone climate",year:1995,cost:580,mass:6,comfort:8,luxury:9,safety:0,complexity:9,requiresAc:true,desc:"Separate front/rear control zones"}
 }},
 interiorLighting:{title:"Cabin lighting",options:{
  incandescent:{name:"Basic lighting",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"Mechanical switches, basic interior lamps"},
  reading:{name:"Reading lights",year:1960,cost:35,mass:.5,comfort:1,luxury:1,safety:0,complexity:1,desc:"Front and rear map lighting"},
  ambient:{name:"Ambient lighting",year:2000,cost:155,mass:1,comfort:2,luxury:5,safety:0,complexity:3,desc:"Integrated low-energy accents"},
  adaptive:{name:"Adaptive LED lighting",year:2012,cost:280,mass:2,comfort:3,luxury:7,safety:1,complexity:5,desc:"Door and footwell illumination"}
 }},
 cargoPackaging:{title:"Cargo packaging",options:{
  balanced:{name:"Balanced layout",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,cargo:0,desc:"Standard load floor and fixed partitions"},
  space:{name:"Extra cargo space",year:1940,cost:100,mass:3,comfort:-2,luxury:0,safety:0,complexity:2,cargo:15,desc:"More space, less rear occupant legroom"},
  flexible:{name:"Fold-flat seating",year:1970,cost:260,mass:8,comfort:1,luxury:2,safety:0,complexity:5,cargo:22,desc:"Configurable rear seats and load floor"},
  premium:{name:"Powered cargo access",year:2000,cost:580,mass:13,comfort:2,luxury:7,safety:0,complexity:7,cargo:10,desc:"Powered lid and a reconfigurable floor"}
 }},
 driverAssist:{title:"Driver assistance",options:{
  none:{name:"No driver aids",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"Fully manual driving"},
  cruise:{name:"Cruise control",year:1958,cost:140,mass:2,comfort:2,luxury:2,safety:0,complexity:2,desc:"Steady-speed highway support"},
  parking:{name:"Parking assistance",year:1990,cost:290,mass:2,comfort:1,luxury:3,safety:2,complexity:5,desc:"Ultrasonic proximity warnings"},
  advanced:{name:"Active assistance",year:2010,cost:1250,mass:7,comfort:4,luxury:8,safety:6,complexity:15,desc:"Camera/radar lane and braking support"}
 }},
 cabinMaterials:{title:"Interior material sourcing",options:{
  standard:{name:"Standard supply",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,desc:"Conventional mass-market trim"},
  recycled:{name:"Recycled textiles",year:1990,cost:85,mass:-1,comfort:1,luxury:0,safety:0,complexity:2,desc:"Reprocessed materials and supplier audits"},
  acoustic:{name:"Acoustic composites",year:1980,cost:250,mass:5,comfort:4,luxury:3,safety:0,complexity:4,desc:"Multilayer cabin absorption"},
  artisan:{name:"Artisan finishing",year:1930,cost:620,mass:7,comfort:2,luxury:9,safety:0,complexity:8,desc:"Low-volume timber and hand-finished trim"}
 }},
 cabinAssembly:{title:"Interior assembly",options:{
  standard:{name:"Standard assembly",year:1900,cost:0,mass:0,comfort:0,luxury:0,safety:0,complexity:0,quality:0,desc:"Existing line assembly sequence"},
  simplified:{name:"Low-cost modular trim",year:1965,cost:-85,mass:-2,comfort:-1,luxury:-2,safety:0,complexity:-2,quality:-1,desc:"Less labor but reduced fit finish"},
  precision:{name:"Precision fit and finish",year:1980,cost:220,mass:1,comfort:2,luxury:4,safety:0,complexity:5,quality:2,desc:"Higher inspection and fitting time"},
  bespoke:{name:"Hand-fitted cabin",year:1950,cost:880,mass:4,comfort:3,luxury:9,safety:0,complexity:12,quality:3,desc:"Extensive low-volume finishing"}
 }}
});
const DEFAULTS=Object.freeze({dashLayout:"traditional",instrumentCluster:"analog",infotainment:"none",
 climateControl:"vents",interiorLighting:"incandescent",cargoPackaging:"balanced",driverAssist:"none",cabinMaterials:"standard",cabinAssembly:"standard",rearSeatSpace:50,cabinErgonomics:50});
const ENGINED_FIELDS=Object.keys(OPTIONS);
function evaluate(state={},draft={}){
 const year=num(state.year,1970),errors=[],warnings=[],scores=[],configuration={};
 let cost=0,mass=0,comfort=0,luxury=0,safety=0,complexity=0,cargo=0,quality=0;
 for(const [field,data] of Object.entries(OPTIONS)){
  const raw=draft[field]??DEFAULTS[field],o=data.options[raw];
  if(!o){errors.push(data.title+": unknown option");continue;}
  configuration[field]=raw;
  if(year<o.year)errors.push(o.name+" is unavailable before "+o.year);
  if(o.requiresAc&&!draft.ac)errors.push("Enable A/C before selecting "+o.name);
  cost+=o.cost;mass+=o.mass;comfort+=o.comfort;luxury+=o.luxury;safety+=o.safety;complexity+=o.complexity;
  cargo+=o.cargo||0;quality+=o.quality||0;
  scores.push({field,name:o.name,cost:o.cost});
 }
 for(const field of ["rearSeatSpace","cabinErgonomics"]){
  const v=num(draft[field],DEFAULTS[field]);
  if(v<0||v>100)errors.push(field+" setting must be between 0 and 100");
  configuration[field]=bound(v,0,100);
 }
 const rear=configuration.rearSeatSpace,erg=configuration.cabinErgonomics;
 comfort+=(rear-50)*.12+(erg-50)*.09;
 luxury+=(erg-50)*.045;
 cost+=(rear-50)*4+(erg-50)*3;mass+=(rear-50)*.09;
 cargo-=(rear-50)*.28;safety+=(erg-50)*.035;
 if(draft.cargoPackaging==="space"&&rear>70)warnings.push("Extra rear legroom conflicts with maximum cargo packaging");
 if(draft.driverAssist==="advanced"&&!draft.abs)warnings.push("Advanced assistance relies on ABS; braking assist cannot be fully effective");
 if(draft.seat==="bucket"&&rear>78)warnings.push("Performance seats limit second-row packaging");
 if(draft.cabinAssembly==="bespoke"&&(draft.production||0)>700)warnings.push("Hand-fitted interiors will constrain high-volume manufacturing");
 if(complexity>=19)warnings.push("Complex interior electronics increase prototype testing and supplier qualification");
 // Adaptive assistance does not deliver all its safety potential without ABS.
 if(draft.driverAssist==="advanced"&&!draft.abs)safety-=4;
 const days=Math.ceil(Math.max(0,complexity)/5),developmentBudget=Math.round(Math.max(0,complexity)*800+Math.max(0,cost)*4.2);
 const report={ready:!errors.length,errors,warnings,configuration,
  unitCostDelta:Math.round(cost),massKg:Number(mass.toFixed(2)),
  comfortDelta:Number(comfort.toFixed(2)),luxuryDelta:Number(luxury.toFixed(2)),
  safetyDelta:Number(safety.toFixed(2)),qualityDelta:Number(quality.toFixed(2)),
  cargoDeltaPct:Number(cargo.toFixed(1)),complexity,extraDays:days,extraBudget:developmentBudget,items:scores};
 return report;
}
function enrichQuote(state,draft,original){
 if(!original)return original;
 const report=evaluate(state,draft),days=Math.max(1,Math.ceil(num(original.days,1)+report.extraDays)),budget=Math.max(0,Math.round(num(original.budget)+report.extraBudget));
 return{...original,days,budget,daily:budget/days,cabinEngineering:report};
}
function markup(state,draft){
 const year=num(state?.year,1970),rep=evaluate(state,draft),selected=rep.configuration;
 const groups=Object.entries(OPTIONS).map(([key,data])=>
  '<section class="cabin-choice-group"><h5>'+safe(data.title)+'</h5><div class="cabin-choice-options">'+
  Object.entries(data.options).map(([id,o])=>'<button type="button" data-cabin-opt="'+safe(key)+':'+safe(id)+'" class="cabin-opt '+(selected[key]===id?'selected ':'')+(year<o.year?'locked':'')+'" '+(year<o.year?'disabled':'')+
  '><b>'+safe(o.name)+'</b><small>'+safe(o.desc)+(year<o.year?' · '+o.year:'')+'</small></button>').join('')+'</div></section>'
 ).join('');
 const slider=(key,label)=>'<label class="cabin-range">'+safe(label)+'<span data-cabin-value="'+key+'">'+Number(selected[key]).toFixed(0)+'/100</span><input type="range" min="0" max="100" step="5" data-cabin-slider="'+key+'" value="'+selected[key]+'"></label>';
 return'<section class="cabin-engineering"><div class="cabin-engineering-title"><div><span class="eyebrow">INTERIOR ENGINEERING • 601–700</span><h4>Cabin Architecture</h4><p>Real cost, weight, comfort, packaging and program schedule consequences. Historical equipment is year-gated.</p></div><button type="button" class="btn secondary" id="cabinDirector">AUTO PLAN</button></div>'+
  '<div id="cabinReadout" class="cabin-readout" aria-live="polite"></div>'+
  '<div class="cabin-package-grid">'+groups+'</div><div class="cabin-range-grid">'+slider("rearSeatSpace","Rear-seat priority")+slider("cabinErgonomics","Driver ergonomics")+'</div>'+
  '<div class="cabin-director-note" id="cabinDirectorNote">Auto Plan applies a year-appropriate, target-specific equipment package. It does not spend cash until you authorize the vehicle.</div></section>';
}
function render(root,state,draft){
 if(!root)return;const r=evaluate(state,draft),cost=r.unitCostDelta;
 const metrics=[["Extra unit cost",(cost>=0?"+":"−")+"$"+Math.abs(cost).toLocaleString()],["Mass",(r.massKg>=0?"+":"")+r.massKg.toFixed(1)+" kg"],["Comfort",(r.comfortDelta>=0?"+":"")+r.comfortDelta.toFixed(1)],["Luxury",(r.luxuryDelta>=0?"+":"")+r.luxuryDelta.toFixed(1)],["Cargo",(r.cargoDeltaPct>=0?"+":"")+r.cargoDeltaPct.toFixed(1)+"%"],["Development","+"+r.extraDays+" d / $"+r.extraBudget.toLocaleString()]];
 const gauges=['dashLayout','instrumentCluster','infotainment','climateControl'].map((key,i)=>{
  const x=15+i*57,o=OPTIONS[key].options[r.configuration[key]]||{},active=(o.cost||0)>0;
  return'<rect x="'+x+'" y="39" width="49" height="19" rx="5" fill="'+(active?'#6d99b8':'#3c596e')+'" opacity="'+(active?'.96':'.55')+'"/><text x="'+(x+24.5)+'" y="52" fill="#fff" font-size="8" text-anchor="middle">'+safe(i===0?'DASH':i===1?'GAUGES':i===2?'MEDIA':'CLIMATE')+'</text>';
 }).join('');
 root.innerHTML='<div class="cabin-metrics">'+metrics.map(([n,v])=>'<div><span>'+safe(n)+'</span><b>'+safe(v)+'</b></div>').join('')+'</div>'+
 '<svg viewBox="0 0 260 95" role="img" aria-label="Live cabin architecture schematic" class="cabin-schematic"><path d="M9 34Q130 3 251 34L245 77H15Z" fill="#1b3243" stroke="#729bb4" stroke-width="2"/>'+
 '<path d="M22 32L42 19Q130 -1 218 19L238 32" stroke="#a1bed0" fill="none" stroke-width="2"/>'+gauges+
 '<circle cx="54" cy="74" r="15" stroke="#95b6c8" stroke-width="4" fill="none"/><path d="M43 74H65M54 63V85" stroke="#95b6c8" stroke-width="2"/>'+
 '<path d="M117 72H247" stroke="#496b80" stroke-width="3"/><text x="130" y="91" text-anchor="middle" fill="#b5cfdc" font-size="8">DRIVER-ORIENTED PACKAGING</text></svg>'+
 (r.warnings.length?'<p class="cabin-warnings">'+r.warnings.map(safe).join(' · ')+'</p>':'')+
 (r.errors.length?'<p class="cabin-errors">'+r.errors.map(safe).join(' · ')+'</p>':'');
 root.dataset.ready=String(r.ready);
}
function recommend(state,draft,budget=650){
 const year=num(state?.year,1970),segment=String(draft.target||"Family").toLowerCase(),luxury=/luxury|premium/.test(segment),sport=/sport|track/.test(segment),utility=/utility|off-road/.test(segment),economy=/budget/.test(segment);
 const priorities=luxury?{luxury:1.9,comfort:1.4,safety:.4}:sport?{luxury:.3,comfort:.8,safety:.4}:economy?{luxury:.35,comfort:.8,safety:.7}:utility?{luxury:.5,comfort:1.1,safety:1.2}:{luxury:.75,comfort:1.3,safety:1.3};
 const cap=Number.isFinite(Number(budget))?Math.max(0,Number(budget)):650,next={...draft};
 const chosen=[],pool=[];
 for(const [field,group] of Object.entries(OPTIONS)){
  next[field]=DEFAULTS[field];
  for(const [id,item] of Object.entries(group.options)){
   if(id===DEFAULTS[field]||item.year>year||item.requiresAc&&!draft.ac)continue;
   const benefit=(item.comfort||0)*priorities.comfort+(item.luxury||0)*priorities.luxury+(item.safety||0)*priorities.safety+(item.cargo||0)*(utility?.1:.04)+(item.quality||0)*.7;
   const cost=Math.max(1,(item.cost||0)+Math.max(0,item.complexity||0)*18);
   pool.push({field,id,item,score:benefit/cost,benefit,cost});
  }
 }
 pool.sort((a,b)=>b.score-a.score);let used=0;
 for(const item of pool){
  if(chosen.some(x=>x.field===item.field)||used+item.cost>cap||item.benefit<=0)continue;
  next[item.field]=item.id;used+=item.cost;chosen.push(item);
 }
 const out=evaluate(state,next);
 return{draft:next,budgetCap:cap,estimatedUnitCost:out.unitCostDelta,choices:chosen.map(x=>x.field+" → "+x.item.name),report:out,strategy:luxury?"Luxury and refinement":sport?"Performance ergonomics":economy?"Low-cost usability":utility?"Durable utility":"Comfort and safety"};
}
G.MDXCabinEngineering=Object.freeze({VERSION:1,OPTIONS,DEFAULTS,evaluate,enrichQuote,markup,render,recommend});
})();