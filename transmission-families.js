(() => {
"use strict";
const CORE=window.MDX_CORE||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clean=v=>String(v??"").trim();
const period=s=>num(s?.year,1970)*12+num(s?.month,0);
const uid=(s,p)=>CORE.randomId?CORE.randomId(s,p,"transmissionFamilies"):p+"_"+period(s)+"_"+Math.floor(Math.random()*1e9);
const money=v=>{v=num(v);const neg=v<0,a=Math.abs(v),t=a>=1e9?"$"+(a/1e9).toFixed(2)+"B":a>=1e6?"$"+(a/1e6).toFixed(2)+"M":a>=1e3?"$"+(a/1e3).toFixed(1)+"K":"$"+Math.round(a).toLocaleString();return neg?"-"+t:t;};

function maturityScore(f){
 const testing=clamp(Math.log10(1+num(f.testHours))*13,0,27);
 const production=clamp(Math.log10(1+num(f.productionUnits))*12,0,43);
 const field=clamp(Math.log10(1+num(f.fieldVehicleMonths))*14,0,22);
 const revisions=clamp(num(f.revisionsReleased)*2,0,8);
 return clamp(testing+production+field+revisions,0,100);
}
function updateMaturity(f){f.maturityScore=Number(maturityScore(f).toFixed(2));f.manufacturingLearning=clamp(f.maturityScore/100,0,1);return f.maturityScore;}

function familyFromTransmission(state,t,legacy=false){
 const familyId=String(t.familyId||t.id||uid(state,"txfam"));
 return{
  id:familyId,name:clean(t.familyName)||clean(t.name)||"Transmission Family",
  createdYear:num(t.createdYear,state.year),createdPeriod:period(state),
  architecture:String(t.type||"Manual"),architectureId:String(t.architecture||""),
  generation:Math.max(1,num(t.generation,1)),status:"active",
  minTorque:Math.max(0,num(t.torque)*.72),maxTorque:Math.max(1,num(t.torque)*1.28),
  minGears:Math.max(0,num(t.gears)),maxGears:Math.max(0,num(t.gears)),
  controlArchitecture:String(t.controlSystem||"mechanical"),
  caseArchitecture:String(t.housing||"aluminum"),
  orientationCompat:Array.isArray(t.layoutCompat)?[...t.layoutCompat]:["longitudinal","transverse"],
  drivetrainCompat:Array.isArray(t.drivetrainCompat)?[...t.drivetrainCompat]:["RWD","FWD"],
  variantIds:[t.id],programIds:[],primaryTransmissionId:t.id,
  toolingPlantIds:[],toolingHistory:[],
  testHours:Math.max(12,num(t.programOutcome?.calendarDays)*5),
  productionUnits:Math.max(0,num(t.internalUnits)+num(t.externalUnits)),
  internalUnits:Math.max(0,num(t.internalUnits)),externalUnits:Math.max(0,num(t.externalUnits)),
  fieldVehicleMonths:0,revisionsReleased:Math.max(0,num(t.revision,1)-1),
  developmentSpend:Math.max(0,num(t.programOutcome?.actualSpend)),
  lifetimeRevenue:Math.max(0,num(t.externalRevenue)),lifetimeProfit:Math.max(0,num(t.externalProfit)),
  maturityScore:0,manufacturingLearning:0,legacyImported:legacy,autoTooledLegacy:legacy
 };
}
function ensureFactoryTooling(state,fac,legacyFamilies){
 fac.transmissionFamilyTooling=Array.isArray(fac.transmissionFamilyTooling)?fac.transmissionFamilyTooling:[];
 if(legacyFamilies&&fac.status==="operating"&&num(fac.shops?.powertrain)>0){
  for(const f of legacyFamilies)if(!fac.transmissionFamilyTooling.some(x=>x.familyId===f.id))fac.transmissionFamilyTooling.push({familyId:f.id,status:"active",installedPeriod:period(state),legacy:true,ramp:1});
 }
}
function ensure(state){
 if(!state||typeof state!=="object")return state;
 state.transmissionFamilies=Array.isArray(state.transmissionFamilies)?state.transmissionFamilies:[];
 state.transmissionToolingProjects=Array.isArray(state.transmissionToolingProjects)?state.transmissionToolingProjects:[];
 const map=new Map(state.transmissionFamilies.map(f=>[String(f.id),f]));
 for(const t of state.transmissions||[]){
  let fid=String(t.familyId||t.id),f=map.get(fid);
  if(!f){const legacyImport=!(t.licensedDesign||t.jointDevelopmentId);f=familyFromTransmission(state,t,legacyImport);fid=f.id;state.transmissionFamilies.push(f);map.set(fid,f);}
  t.familyId=f.id;t.familyName=t.familyName||f.name;
  f.variantIds=Array.isArray(f.variantIds)?f.variantIds:[];if(!f.variantIds.includes(t.id))f.variantIds.push(t.id);
  f.generation=Math.max(num(f.generation,1),num(t.generation,1));
  f.minTorque=Math.min(num(f.minTorque,t.torque),num(t.torque));f.maxTorque=Math.max(num(f.maxTorque,t.torque),num(t.torque));
  const gears=Math.max(0,num(t.gears));if(gears){f.minGears=f.minGears?Math.min(f.minGears,gears):gears;f.maxGears=Math.max(num(f.maxGears),gears);}
 }
 for(const p of state.transmissionPrograms||[]){const e=p.entry;if(!e)continue;let f=map.get(String(e.familyId||p.parentFamilyId||""));if(!f&&e.familyId){f=familyFromTransmission(state,e,false);f.id=e.familyId;f.variantIds=[];f.primaryTransmissionId=null;f.testHours=0;f.productionUnits=0;f.internalUnits=0;f.externalUnits=0;f.autoTooledLegacy=false;state.transmissionFamilies.push(f);map.set(f.id,f);}if(f){f.programIds=Array.isArray(f.programIds)?f.programIds:[];if(!f.programIds.includes(p.id))f.programIds.push(p.id);}}
 for(const f of state.transmissionFamilies){f.variantIds=Array.isArray(f.variantIds)?f.variantIds:[];f.programIds=Array.isArray(f.programIds)?f.programIds:[];f.toolingPlantIds=Array.isArray(f.toolingPlantIds)?f.toolingPlantIds:[];f.toolingHistory=Array.isArray(f.toolingHistory)?f.toolingHistory:[];updateMaturity(f);}
 const legacy=state.transmissionFamilies.filter(f=>f.autoTooledLegacy);
 for(const fac of state.operations?.factories||[])ensureFactoryTooling(state,fac,legacy);
 for(const f of state.transmissionFamilies)for(const fac of state.operations?.factories||[])if((fac.transmissionFamilyTooling||[]).some(x=>x.familyId===f.id&&x.status==="active")&&!f.toolingPlantIds.includes(fac.id))f.toolingPlantIds.push(fac.id);
 return state;
}
function familyForTransmission(state,id){ensure(state);const t=(state.transmissions||[]).find(x=>x.id===id);return t?state.transmissionFamilies.find(f=>f.id===t.familyId)||null:null;}
function draftFamily(state,d){ensure(state);if(!d?.familyId)return null;return state.transmissionFamilies.find(f=>f.id===d.familyId)||null;}
function quote(state,d,spec,basePlan){
 ensure(state);const f=draftFamily(state,d);if(!f||!d?.familyId)return{...basePlan,familyMaturity:0,maturitySavings:0};
 const maturity=clamp(num(f.maturityScore)/100,0,1),generation=d.evolutionMode==="generation",revision=!generation;
 const maturityCost=revision?1-maturity*.22:1-maturity*.10,maturityTime=revision?1-maturity*.18:1-maturity*.08;
 const budget=Math.max(25000,Math.round(num(basePlan.budget)*maturityCost)),days=Math.max(revision?6:10,Math.ceil(num(basePlan.days)*maturityTime));
 return{...basePlan,budget,days,daily:budget/Math.max(1,days),familyMaturity:f.maturityScore,maturitySavings:Math.max(0,num(basePlan.budget)-budget),familyId:f.id};
}
function authorizeProgram(state,entry,program){
 ensure(state);let f=state.transmissionFamilies.find(x=>x.id===entry.familyId);
 if(!f){f=familyFromTransmission(state,entry,false);f.id=entry.familyId||entry.id;f.name=entry.familyName||entry.name;f.variantIds=[];f.primaryTransmissionId=null;f.testHours=0;f.productionUnits=0;f.internalUnits=0;f.externalUnits=0;f.developmentSpend=0;f.autoTooledLegacy=false;state.transmissionFamilies.push(f);}
 f.programIds=Array.isArray(f.programIds)?f.programIds:[];if(!f.programIds.includes(program.id))f.programIds.push(program.id);
 program.familyId=f.id;program.familyMaturityAtStart=f.maturityScore;return f;
}
function choosePlant(state){return(state.operations?.factories||[]).filter(x=>x.status==="operating"&&num(x.shops?.powertrain)>0).sort((a,b)=>num(b.shops?.powertrain)-num(a.shops?.powertrain))[0]||null;}
function installImmediate(state,f,reason="release"){
 const fac=choosePlant(state);if(!fac)return null;ensureFactoryTooling(state,fac,[]);
 let row=fac.transmissionFamilyTooling.find(x=>x.familyId===f.id);if(!row){row={familyId:f.id,status:"active",installedPeriod:period(state),ramp:.65,reason};fac.transmissionFamilyTooling.push(row);}else{row.status="active";row.ramp=Math.max(.65,num(row.ramp,.65));}
 if(!f.toolingPlantIds.includes(fac.id))f.toolingPlantIds.push(fac.id);f.toolingHistory.push({period:period(state),factoryId:fac.id,type:"initial_tooling",reason});return fac;
}
function onReleased(state,t,program){
 ensure(state);let f=state.transmissionFamilies.find(x=>x.id===t.familyId);if(!f){f=familyFromTransmission(state,t,false);state.transmissionFamilies.push(f);t.familyId=f.id;}
 if(!f.variantIds.includes(t.id))f.variantIds.push(t.id);if(!f.primaryTransmissionId)f.primaryTransmissionId=t.id;
 f.generation=Math.max(num(f.generation,1),num(t.generation,1));f.revisionsReleased=Math.max(num(f.revisionsReleased),num(t.revision,1)-1);
 f.testHours+=Math.max(10,num(program?.calendarDaysElapsed,program?.totalDays)*5);f.developmentSpend+=num(program?.spent);
 f.minTorque=Math.min(num(f.minTorque,t.torque),num(t.torque));f.maxTorque=Math.max(num(f.maxTorque,t.torque),num(t.torque));
 const gears=Math.max(0,num(t.gears));if(gears){f.minGears=f.minGears?Math.min(f.minGears,gears):gears;f.maxGears=Math.max(num(f.maxGears),gears);}
 const maturity=clamp(num(f.maturityScore)/100,0,1);t.reliability=clamp(num(t.reliability)+maturity*2.5,20,99);t.cost=Math.max(1,num(t.cost)*(1-maturity*.035));
 if(!f.toolingPlantIds.length)installImmediate(state,f,"included_in_transmission_release");updateMaturity(f);return f;
}
function learningFactor(state,id){const f=familyForTransmission(state,id);return f?clamp(1-num(f.maturityScore)/100*.075,.925,1):1;}
function recordInternalProduction(state,id,units){units=Math.max(0,num(units));if(!units)return;const t=(state.transmissions||[]).find(x=>x.id===id),f=familyForTransmission(state,id);if(!t||!f)return;t.internalUnits=num(t.internalUnits)+units;f.internalUnits=num(f.internalUnits)+units;f.productionUnits=num(f.productionUnits)+units;updateMaturity(f);}
function recordExternalDelivery(state,id,units,revenue,profit){units=Math.max(0,num(units));const t=(state.transmissions||[]).find(x=>x.id===id),f=familyForTransmission(state,id);if(!t||!f)return;t.externalProfit=num(t.externalProfit)+num(profit);f.externalUnits=num(f.externalUnits)+units;f.productionUnits=num(f.productionUnits)+units;f.lifetimeRevenue=num(f.lifetimeRevenue)+num(revenue);f.lifetimeProfit=num(f.lifetimeProfit)+num(profit);updateMaturity(f);}
function settleMonth(state){ensure(state);const p=period(state);if(state.transmissionFamilyLastSettledPeriod===p)return;for(const f of state.transmissionFamilies){const ids=new Set(f.variantIds||[]),vehicles=(state.vehicles||[]).filter(v=>ids.has(v.transmissionId||v.design?.trans));if(vehicles.some(v=>num(v.lastMonthSales)>0))f.fieldVehicleMonths+=vehicles.filter(v=>num(v.lastMonthSales)>0).length;updateMaturity(f);}state.transmissionFamilyLastSettledPeriod=p;}
function toolingQuote(state,f,fac){const year=num(state.year,1970),era=CORE.economicIndex?CORE.economicIndex("industrialAssets",year):clamp(Math.pow(1.03,year-1970),.18,16),cap=Math.max(100,num(fac?.shops?.powertrain,500)),m=clamp(num(f?.maturityScore)/100,0,1),budget=Math.round(Math.max(380000*era,cap*1250*era)*(1-m*.16)),days=Math.max(22,Math.ceil(68*(1-m*.18)));return{budget,days,daily:budget/days};}
function startPlantTooling(state,familyId,factoryId,log=()=>{}){
 ensure(state);const f=state.transmissionFamilies.find(x=>x.id===familyId),fac=state.operations?.factories?.find(x=>x.id===factoryId);if(!f||!fac||fac.status!=="operating"||num(fac.shops?.powertrain)<=0)return null;if((fac.transmissionFamilyTooling||[]).some(x=>x.familyId===f.id&&x.status==="active"))return null;if(state.transmissionToolingProjects.some(x=>x.familyId===familyId&&x.factoryId===factoryId&&x.status==="active"))return null;const q=toolingQuote(state,f,fac);if(num(state.cash)<q.daily*4)return null;const p={id:uid(state,"txtool"),familyId:f.id,factoryId:fac.id,name:f.name+" tooling — "+fac.name,status:"active",phase:"CASE + GEARSET TOOL DESIGN",totalDays:q.days,daysRemaining:q.days,budget:q.budget,spent:0,dailySpend:q.daily,userPaused:false,calendarDaysElapsed:0};state.transmissionToolingProjects.push(p);log("Transmission tooling started at "+fac.name+" for "+f.name+" • "+money(q.budget)+" authorized.");return p;
}
function processDay(state,log=()=>{}){ensure(state);let spend=0;for(const p of state.transmissionToolingProjects){if(p.status!=="active"||p.userPaused)continue;const burn=Math.min(num(p.dailySpend),Math.max(0,num(p.budget)-num(p.spent)));if(num(state.cash)<burn){p.phase="PAUSED — FUNDING";continue;}state.cash-=burn;p.spent+=burn;spend+=burn;p.calendarDaysElapsed++;p.daysRemaining=Math.max(0,p.daysRemaining-1);const x=1-p.daysRemaining/Math.max(1,p.totalDays);p.phase=x<.35?"CASE + GEARSET TOOL DESIGN":x<.75?"MACHINING / ASSEMBLY FIXTURES":"PILOT GEARBOX RUN";if(p.daysRemaining<=0){p.status="complete";p.phase="PRODUCTION READY";const f=state.transmissionFamilies.find(x=>x.id===p.familyId),fac=state.operations?.factories?.find(x=>x.id===p.factoryId);if(f&&fac){ensureFactoryTooling(state,fac,[]);let row=fac.transmissionFamilyTooling.find(x=>x.familyId===f.id);if(!row){row={familyId:f.id,status:"active",installedPeriod:period(state),ramp:.70};fac.transmissionFamilyTooling.push(row);}else{row.status="active";row.ramp=Math.max(.70,num(row.ramp));}if(!f.toolingPlantIds.includes(fac.id))f.toolingPlantIds.push(fac.id);f.toolingHistory.push({period:period(state),factoryId:fac.id,type:"tooling_project",spend:p.spent});log(f.name+" transmission tooling reached production readiness at "+fac.name+".");}}}return{spend};}
function rampMonth(state){ensure(state);for(const fac of state.operations?.factories||[])for(const row of fac.transmissionFamilyTooling||[])if(row.status==="active")row.ramp=clamp(num(row.ramp,.65)+.10,.65,1);}
function familyCapacity(state,familyId,globalCapacity=0){ensure(state);const f=state.transmissionFamilies.find(x=>x.id===familyId);if(!f)return Math.max(0,num(globalCapacity));const plants=(state.operations?.factories||[]).filter(fac=>fac.status==="operating"&&(fac.transmissionFamilyTooling||[]).some(t=>t.familyId===f.id&&t.status==="active"));if(!plants.length)return f.autoTooledLegacy?Math.max(0,num(globalCapacity)):0;let cap=0;for(const fac of plants){const t=fac.transmissionFamilyTooling.find(x=>x.familyId===f.id&&x.status==="active"),shift=fac.shifts===1?1:fac.shifts===2?1.7:2.3,maint=clamp(num(fac.maintenance,1),.65,1.08),power=num(fac.shops?.powertrain),workers=Math.max(100,num(fac.workers,100)),req=Math.max(120,power*.37*shift),staff=clamp(.55+.45*Math.sqrt(workers/req),.35,3.6);cap+=power*shift*maint*.76*staff*clamp(num(t.ramp,1),.4,1);}return Math.max(0,Math.round(cap));}
function transmissionCapacity(state,id,globalCapacity=0){const f=familyForTransmission(state,id);return f?familyCapacity(state,f.id,globalCapacity):Math.max(0,num(globalCapacity));}
function familyUse(state,f){const ids=new Set(f.variantIds||[]);return{vehicles:(state.vehicles||[]).filter(v=>ids.has(v.transmissionId||v.design?.trans)),contracts:(state.transmissionSupply?.contracts||[]).filter(c=>ids.has(c.transmissionId)&&c.status==="active")};}
function renderFamilyLibrary(state,moneyFn=money){ensure(state);if(!state.transmissionFamilies.length)return"";return"<section class='tx-family-overview'><div class='panel-title'><div><span class='eyebrow'>SYSTEM 083 • TRANSMISSION FAMILY ARCHITECTURE</span><h3>Persistent Transmission Families</h3></div></div><div class='tx-family-grid'>"+state.transmissionFamilies.map(f=>{const use=familyUse(state,f),variants=(f.variantIds||[]).map(id=>state.transmissions.find(t=>t.id===id)).filter(Boolean),plants=(state.operations?.factories||[]).filter(x=>(x.transmissionFamilyTooling||[]).some(t=>t.familyId===f.id&&t.status==="active")),available=(state.operations?.factories||[]).filter(x=>x.status==="operating"&&num(x.shops?.powertrain)>0&&!plants.some(p=>p.id===x.id));return"<article class='tx-family-summary-card'><div class='engine-card-top'><div><span class='tag'>"+String(f.architecture).toUpperCase()+" • GEN "+f.generation+"</span><h3>"+f.name+"</h3><small>"+Math.round(f.minTorque)+"–"+Math.round(f.maxTorque)+" lb-ft • "+(f.minGears||"VAR")+"–"+(f.maxGears||"VAR")+" ratios</small></div><b class='status-badge'>"+Math.round(f.maturityScore)+"/100 MATURE</b></div><div class='mini-kpis'><div><span>LIFETIME VOLUME</span><b>"+Math.round(f.productionUnits).toLocaleString()+"</b></div><div><span>TEST HOURS</span><b>"+Math.round(f.testHours).toLocaleString()+"</b></div><div><span>FIELD LEARNING</span><b>"+Math.round(f.fieldVehicleMonths)+" model-mo</b></div><div><span>VARIANTS</span><b>"+variants.length+"</b></div><div><span>OEM CONTRACTS</span><b>"+use.contracts.length+"</b></div><div><span>TOOLED PLANTS</span><b>"+plants.length+"</b></div></div><div class='tx-family-variants'>"+variants.map(t=>"<div><b>"+t.name+"</b><span>GEN "+num(t.generation,1)+" • R"+num(t.revision,1)+" • "+Math.round(t.torque)+" lb-ft • "+(t.eff*100).toFixed(1)+"% • "+moneyFn(t.cost)+"</span></div>").join("")+"</div>"+(available.length?"<div class='family-tooling'><span>ADD FAMILY PRODUCTION PLANT</span><div>"+available.map(p=>"<button class='btn secondary' data-tx-family-tool='"+f.id+":"+p.id+"'>TOOL "+p.name.toUpperCase()+"</button>").join("")+"</div></div>":"")+"</article>";}).join("")+"</div></section>";}
function activeProgramsMarkup(state,moneyFn=money){ensure(state);const rows=state.transmissionToolingProjects.filter(p=>p.status==="active");if(!rows.length)return"";return"<div class='powertrain-family-programs'>"+rows.map(p=>{const progress=Math.round(100*(1-num(p.daysRemaining)/Math.max(1,num(p.totalDays))));return"<article class='program-card'><span class='tag'>TRANSMISSION PLANT TOOLING</span><h3>"+p.name+"</h3><div class='program-phase'>"+p.phase+"</div><div class='process-bar'><i style='width:"+progress+"%'></i></div><div class='program-meta'><span>"+progress+"% complete</span><span>"+moneyFn(p.spent)+" spent</span><span>"+Math.ceil(p.daysRemaining)+" days</span></div></article>";}).join("")+"</div>";}
function wireLibrary(root,state,h={}){const log=h.log||(()=>{}),save=h.save||(()=>{}),rerender=h.rerender||(()=>{}),toast=h.toast||(()=>{});root?.querySelectorAll("[data-tx-family-tool]").forEach(b=>b.addEventListener("click",()=>{const raw=b.dataset.txFamilyTool,i=raw.indexOf(":");const p=startPlantTooling(state,raw.slice(0,i),raw.slice(i+1),log);if(!p){toast("Transmission tooling project could not be started.");return;}save();rerender();}));}
function runSelfTests(){
 const fail=[],check=(x,m)=>{if(!x)fail.push(m);},s={year:1990,month:0,day:1,cash:1e8,transmissions:[{id:"t1",name:"M40",familyId:"fam",familyName:"M40 Family",createdYear:1989,generation:1,revision:1,releaseStatus:"released",type:"Manual",architecture:"5m",gears:5,torque:300,eff:.95,reliability:88,shift:70,cost:800,controlSystem:"mechanical",housing:"aluminum"}],transmissionPrograms:[],transmissionSupply:{contracts:[]},vehicles:[],operations:{factories:[{id:"p1",name:"Powertrain",status:"operating",workers:1000,shifts:2,maintenance:1,shops:{powertrain:900}}]}};
 ensure(s);const f=familyForTransmission(s,"t1");check(!!f&&f.variantIds.includes("t1"),"released transmission did not migrate into family");check(f.toolingPlantIds.includes("p1"),"legacy family lost production tooling");const q=quote(s,{familyId:f.id,evolutionMode:"revision"},s.transmissions[0],{days:50,budget:500000,daily:10000,reusePct:38});check(q.days<50&&q.budget<500000,"maturity did not reduce family revision work");const before=f.maturityScore;s.month=6;settleMonth(s);check(f.maturityScore===before,"passive time matured transmission family");recordInternalProduction(s,"t1",7000);check(f.maturityScore>before,"real production did not mature transmission family");const f2={...familyFromTransmission(s,{...s.transmissions[0],id:"t2",familyId:"fam2",familyName:"Auto Family",name:"A50",type:"Automatic",architecture:"5a"},false),id:"fam2",variantIds:[],autoTooledLegacy:false,toolingPlantIds:[]};s.transmissionFamilies.push(f2);const p=startPlantTooling(s,"fam2","p1",()=>{});check(!!p,"tooling project did not start");for(let i=0;i<150&&p.status==="active";i++)processDay(s,()=>{});check(p.status==="complete"&&familyCapacity(s,"fam2",0)>0,"tooling did not create family capacity");return{ok:!fail.length,failures:fail};
}
window.MDXTransmissionFamilies={ensure,familyForTransmission,quote,authorizeProgram,onReleased,learningFactor,recordInternalProduction,recordExternalDelivery,settleMonth,startPlantTooling,processDay,rampMonth,familyCapacity,transmissionCapacity,renderFamilyLibrary,activeProgramsMarkup,wireLibrary,runSelfTests};
})();