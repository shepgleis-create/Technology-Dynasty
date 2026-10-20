(() => {
"use strict";
const CORE=window.MDX_CORE||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clean=v=>String(v??"").trim();
const period=s=>num(s?.year,1970)*12+num(s?.month,0);
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"family";
const uid=(s,p)=>CORE.randomId?CORE.randomId(s,p,"powertrain"):p+"_"+period(s)+"_"+Math.floor(Math.random()*1e9);
const money=v=>{v=num(v);const neg=v<0,a=Math.abs(v),t=a>=1e9?"$"+(a/1e9).toFixed(2)+"B":a>=1e6?"$"+(a/1e6).toFixed(2)+"M":a>=1e3?"$"+(a/1e3).toFixed(1)+"K":"$"+Math.round(a).toLocaleString();return neg?"-"+t:t;};
const cylForConfig=config=>{const m=String(config||"").match(/(\d+)/);return m?Math.max(1,Number(m[1])):4;};
const displacement=(design={})=>Math.PI/4*num(design.bore,86)**2*num(design.stroke,86)*cylForConfig(design.config)/1e6;
function familyLimits(design={}){
 const bore=num(design.bore,86),stroke=num(design.stroke,86),cyl=cylForConfig(design.config),boreSpacing=Math.round((bore+Math.max(9,bore*.13))*10)/10,minBore=bore*.93,maxBore=bore*1.07,minStroke=stroke*.87,maxStroke=stroke*1.14;
 return{boreSpacing,minBore,maxBore,minStroke,maxStroke,minDisp:Math.PI/4*minBore**2*minStroke*cyl/1e6,maxDisp:Math.PI/4*maxBore**2*maxStroke*cyl/1e6};
}
function maturityScore(f){
 const tests=clamp(Math.log10(1+num(f.testHours))*13,0,28),production=clamp(Math.log10(1+num(f.productionUnits))*12,0,42),field=clamp(Math.log10(1+num(f.fieldVehicleMonths))*14,0,22),issues=clamp(num(f.knownIssuesResolved)*2.2,0,8);
 return clamp(tests+production+field+issues,0,100);
}
function updateMaturity(f){f.maturityScore=Number(maturityScore(f).toFixed(2));f.manufacturingLearning=clamp(f.maturityScore/100,0,1);return f.maturityScore;}
function familyFromEngine(state,e,legacy=false){
 const d=e.design||{},lim=familyLimits(d),fid="engfam_"+slug(e.name)+"_"+String(e.id||uid(state,"engine")).slice(-6);
 return{id:fid,name:clean(e.familyName)||clean(e.name)+" Family",createdYear:num(e.createdYear,state.year),createdPeriod:period(state),generation:1,status:"active",architecture:d.config||"I4",cylinders:cylForConfig(d.config),blockMaterial:d.block||"iron",blockDeck:d.blockDeck||"open",liners:d.liners||"cast",headMaterial:d.headMaterial||"iron",manufacturingProcess:d.assembly||"standard",tolerance:d.tolerance||"standard",baseBore:num(d.bore,86),baseStroke:num(d.stroke,86),...lim,compatibleValvetrains:[d.head||"ohv"],technologyGeneration:1,variantIds:[e.id],programIds:[],primaryEngineId:e.id,toolingPlantIds:[],toolingHistory:[],testHours:Math.max(20,num(e.programOutcome?.calendarDays)*5),productionUnits:Math.max(0,num(e.internalUnits)+num(e.externalUnits)),internalUnits:Math.max(0,num(e.internalUnits)),externalUnits:Math.max(0,num(e.externalUnits)),fieldVehicleMonths:0,knownIssuesResolved:Math.max(0,num(e.revision,1)-1),revisionHistory:[],maturityScore:0,manufacturingLearning:0,lifetimeRevenue:Math.max(0,num(e.externalRevenue)),lifetimeProfit:Math.max(0,num(e.externalProfit)),developmentSpend:Math.max(0,num(e.programOutcome?.actualSpend??e.prototypeCost)),legacyImported:legacy,autoTooledLegacy:legacy};
}
function ensureFactoryTooling(state,f,legacyFamilies){
 f.engineFamilyTooling=Array.isArray(f.engineFamilyTooling)?f.engineFamilyTooling:[];
 if(legacyFamilies&&num(f.shops?.powertrain)>0&&f.status==="operating"){
  for(const fam of legacyFamilies)if(!f.engineFamilyTooling.some(x=>x.familyId===fam.id))f.engineFamilyTooling.push({familyId:fam.id,status:"active",installedPeriod:period(state),legacy:true,ramp:1});
 }
}
function ensure(state){
 if(!state||typeof state!=="object")return state;
 state.engineFamilies=Array.isArray(state.engineFamilies)?state.engineFamilies:[];
 state.engineCalibrationPrograms=Array.isArray(state.engineCalibrationPrograms)?state.engineCalibrationPrograms:[];
 state.engineToolingProjects=Array.isArray(state.engineToolingProjects)?state.engineToolingProjects:[];
 const byId=new Map(state.engineFamilies.map(f=>[f.id,f]));
 for(const e of state.engines||[]){
  let f=e.familyId?byId.get(e.familyId):null;
  if(!f){const legacyImport=!(e.licensedDesign||e.jointDevelopmentId);f=familyFromEngine(state,e,legacyImport);while(byId.has(f.id))f.id+="_2";state.engineFamilies.push(f);byId.set(f.id,f);e.familyId=f.id;e.variantType=e.variantType||(legacyImport?"legacy_hardware":e.licensedDesign?"licensed_hardware":"joint_development_hardware");}
  f.variantIds=Array.isArray(f.variantIds)?f.variantIds:[];if(!f.variantIds.includes(e.id))f.variantIds.push(e.id);
  e.familyId=f.id;e.calibrationId=e.calibrationId||null;e.familyGeneration=Math.max(1,num(e.familyGeneration,f.generation||1));
 }
 for(const p of state.enginePrograms||[]){const e=p.entry;if(!e)continue;if(e.familyId&&byId.has(e.familyId)){const f=byId.get(e.familyId);f.programIds=Array.isArray(f.programIds)?f.programIds:[];if(!f.programIds.includes(p.id))f.programIds.push(p.id);continue;}if(e.design?.familyId&&byId.has(e.design.familyId)){e.familyId=e.design.familyId;const f=byId.get(e.familyId);f.programIds=Array.isArray(f.programIds)?f.programIds:[];if(!f.programIds.includes(p.id))f.programIds.push(p.id);}}
 for(const f of state.engineFamilies){f.variantIds=Array.isArray(f.variantIds)?f.variantIds:[];f.programIds=Array.isArray(f.programIds)?f.programIds:[];f.toolingPlantIds=Array.isArray(f.toolingPlantIds)?f.toolingPlantIds:[];f.toolingHistory=Array.isArray(f.toolingHistory)?f.toolingHistory:[];f.revisionHistory=Array.isArray(f.revisionHistory)?f.revisionHistory:[];f.compatibleValvetrains=Array.isArray(f.compatibleValvetrains)&&f.compatibleValvetrains.length?f.compatibleValvetrains:["ohv"];updateMaturity(f);}
 const legacy=state.engineFamilies.filter(f=>f.autoTooledLegacy);
 for(const fac of state.operations?.factories||[])ensureFactoryTooling(state,fac,legacy);
 for(const f of state.engineFamilies){for(const fac of state.operations?.factories||[]){if((fac.engineFamilyTooling||[]).some(x=>x.familyId===f.id&&x.status==="active")&&!f.toolingPlantIds.includes(fac.id))f.toolingPlantIds.push(fac.id);}}
 return state;
}
function compatibility(state,design,family){
 ensure(state);if(!family)return{compatible:false,score:0,reasons:["Family not found"]};const d=design||{},reasons=[],sameArch=String(d.config||"")===String(family.architecture||"");if(!sameArch)reasons.push("cylinder architecture changes");
 if(String(d.block||"iron")!==String(family.blockMaterial||"iron"))reasons.push("block material changes");
 if(String(d.blockDeck||"open")!==String(family.blockDeck||"open"))reasons.push("deck architecture changes");
 const bore=num(d.bore,86),stroke=num(d.stroke,86),disp=displacement(d);if(bore<family.minBore||bore>family.maxBore)reasons.push("bore outside family tooling range");if(stroke<family.minStroke||stroke>family.maxStroke)reasons.push("stroke outside crankcase range");if(disp<family.minDisp||disp>family.maxDisp)reasons.push("displacement outside family range");
 const valvetrain=String(d.head||"ohv"),headCompatible=family.compatibleValvetrains.includes(valvetrain)||family.compatibleValvetrains.length<3;
 if(!headCompatible)reasons.push("valvetrain architecture requires a new head family");
 const compatible=reasons.length===0,geometry=compatible?1-clamp(Math.abs(bore-family.baseBore)/Math.max(1,family.baseBore)*2+Math.abs(stroke-family.baseStroke)/Math.max(1,family.baseStroke)*1.3,0,.7):0,score=compatible?clamp(70+geometry*20+num(family.maturityScore)*.1,0,100):0;
 return{compatible,score:Number(score.toFixed(1)),reasons,displacement:disp};
}
function compatibleFamilies(state,design){ensure(state);return state.engineFamilies.map(f=>({family:f,...compatibility(state,design,f)})).filter(x=>x.compatible).sort((a,b)=>b.score-a.score);}
function selectedFamily(state,design){ensure(state);const id=design?.familyId;if(!id)return null;const f=state.engineFamilies.find(x=>x.id===id);return f&&compatibility(state,design,f).compatible?f:null;}
function quote(state,design,base){
 ensure(state);const f=selectedFamily(state,design);if(!f)return{...base,familyId:null,reuse:false,reuseLabel:"NEW FAMILY",maturityBonus:0};
 const maturity=clamp(num(f.maturityScore)/100,0,1),geometry=compatibility(state,design,f).score/100,daysFactor=clamp(.78-maturity*.18+(1-geometry)*.12,.52,.82),budgetFactor=clamp(.68-maturity*.22+(1-geometry)*.14,.38,.74),days=Math.max(10,Math.ceil(num(base.days)*daysFactor)),budget=Math.max(25000,Math.round(num(base.budget)*budgetFactor)),maturityBonus=clamp(maturity*3.5,0,3.5);
 return{...base,days,budget,daily:budget/Math.max(1,days),familyId:f.id,reuse:true,reuseLabel:"REUSE "+f.name.toUpperCase(),maturityBonus,baseDays:base.days,baseBudget:base.budget,savings:Math.max(0,num(base.budget)-budget)};
}
function createFamily(state,entry){
 const f=familyFromEngine(state,entry,false);f.id=uid(state,"engfam");f.name=clean(entry.design?.familyName)||clean(entry.name)+" Family";f.variantIds=[];f.primaryEngineId=null;f.testHours=0;f.productionUnits=0;f.internalUnits=0;f.externalUnits=0;f.developmentSpend=0;f.autoTooledLegacy=false;state.engineFamilies.push(f);entry.familyId=f.id;return f;
}
function authorizeProgram(state,entry,program,quoteInfo){
 ensure(state);let f=quoteInfo?.familyId?state.engineFamilies.find(x=>x.id===quoteInfo.familyId):null;if(!f)f=createFamily(state,entry);
 entry.familyId=f.id;entry.familyGeneration=f.generation||1;entry.variantType=quoteInfo?.reuse?"hardware_variant":"family_launch";entry.familyReuse=!!quoteInfo?.reuse;entry.familyMaturityBonus=num(quoteInfo?.maturityBonus);program.familyId=f.id;program.familyReuse=!!quoteInfo?.reuse;program.familySavings=num(quoteInfo?.savings);program.baseBudget=num(quoteInfo?.baseBudget,program.budget);program.baseDays=num(quoteInfo?.baseDays,program.totalDays);
 f.programIds.push(program.id);f.developmentSpend+=0;return f;
}
function choosePrimaryPlant(state,f){
 const candidates=(state.operations?.factories||[]).filter(x=>x.status==="operating"&&num(x.shops?.powertrain)>0).sort((a,b)=>num(b.shops?.powertrain)-num(a.shops?.powertrain));return candidates[0]||null;
}
function installToolingImmediate(state,f,reason="engine_release"){
 const fac=choosePrimaryPlant(state,f);if(!fac)return null;ensureFactoryTooling(state,fac,[]);
 let row=fac.engineFamilyTooling.find(x=>x.familyId===f.id);if(!row){row={familyId:f.id,status:"active",installedPeriod:period(state),ramp:.65,reason};fac.engineFamilyTooling.push(row);}else{row.status="active";row.ramp=Math.max(.65,num(row.ramp,.65));}
 if(!f.toolingPlantIds.includes(fac.id))f.toolingPlantIds.push(fac.id);f.toolingHistory.push({period:period(state),factoryId:fac.id,type:"initial_tooling",reason});return fac;
}
function onEngineReleased(state,e,program){
 ensure(state);let f=state.engineFamilies.find(x=>x.id===e.familyId);if(!f){f=createFamily(state,e);e.familyId=f.id;}
 if(!f.variantIds.includes(e.id))f.variantIds.push(e.id);if(!f.primaryEngineId)f.primaryEngineId=e.id;e.variantType=e.variantType||"hardware_variant";e.familyGeneration=f.generation||1;
 const programDays=num(program?.calendarDaysElapsed,program?.totalDays),maturityBonus=num(e.familyMaturityBonus||program?.entry?.familyMaturityBonus);e.stats.rel=clamp(num(e.stats.rel)+maturityBonus,20,99);e.stats.cost=Math.max(1,num(e.stats.cost)*(1-clamp(num(f.maturityScore)/100*.035,0,.035)));f.testHours+=Math.max(12,programDays*6);f.developmentSpend+=num(program?.spent);if(e.design?.head&&!f.compatibleValvetrains.includes(e.design.head))f.compatibleValvetrains.push(e.design.head);
 if(!f.toolingPlantIds.length)installToolingImmediate(state,f,"included_in_family_release");updateMaturity(f);return f;
}
function familyForEngine(state,engineId){ensure(state);const e=(state.engines||[]).find(x=>x.id===engineId);return e?.familyId?state.engineFamilies.find(f=>f.id===e.familyId)||null:null;}
function learningFactor(state,engineId){const f=familyForEngine(state,engineId);return f?clamp(1-num(f.maturityScore)/100*.08,.92,1):1;}
function recordInternalProduction(state,engineId,units){
 units=Math.max(0,num(units));if(!units)return;const e=(state.engines||[]).find(x=>x.id===engineId),f=familyForEngine(state,engineId);if(!e||!f)return;e.internalUnits=num(e.internalUnits)+units;f.internalUnits=num(f.internalUnits)+units;f.productionUnits=num(f.productionUnits)+units;updateMaturity(f);
}
function recordExternalDelivery(state,engineId,units,revenue,profit){
 units=Math.max(0,num(units));const e=(state.engines||[]).find(x=>x.id===engineId),f=familyForEngine(state,engineId);if(!e||!f)return;e.externalProfit=num(e.externalProfit)+num(profit);f.externalUnits=num(f.externalUnits)+units;f.productionUnits=num(f.productionUnits)+units;f.lifetimeRevenue=num(f.lifetimeRevenue)+num(revenue);f.lifetimeProfit=num(f.lifetimeProfit)+num(profit);updateMaturity(f);
}
function settleMonth(state){
 ensure(state);const p=period(state);if(state.engineFamilyLastSettledPeriod===p)return;
 for(const f of state.engineFamilies){const engineIds=new Set(f.variantIds||[]),vehicles=(state.vehicles||[]).filter(v=>engineIds.has(v.engineId)),sales=vehicles.reduce((a,v)=>a+Math.max(0,num(v.lastMonthSales)),0);if(sales>0){f.fieldVehicleMonths+=vehicles.filter(v=>num(v.lastMonthSales)>0).length;f.fieldSales=num(f.fieldSales)+sales;}const revisions=vehicles.reduce((a,v)=>a+(v.defects||[]).filter(d=>d.recalled||d.resolved).length,0);if(revisions>num(f._knownIssueSignal))f.knownIssuesResolved+=Math.min(2,revisions-num(f._knownIssueSignal));f._knownIssueSignal=revisions;updateMaturity(f);}
 state.engineFamilyLastSettledPeriod=p;
}
function startCalibration(state,engineId,mode="balanced",log=()=>{}){
 ensure(state);const base=(state.engines||[]).find(x=>x.id===engineId),f=familyForEngine(state,engineId);if(!base||!f||state.engineCalibrationPrograms.some(p=>p.baseEngineId===engineId&&p.mode===mode&&p.status==="active"))return null;
 const configs={economy:{label:"ECONOMY",hp:.92,tq:.96,cost:.99,rel:1.5,fuel:"regular",days:.55,budget:.42},balanced:{label:"BALANCED",hp:1,tq:1,cost:1,rel:.5,days:.62,budget:.48},performance:{label:"PERFORMANCE",hp:1.10,tq:1.08,cost:1.015,rel:-1.2,fuel:"premium",days:.68,budget:.55},fleet:{label:"FLEET / DURABILITY",hp:.88,tq:.94,cost:.985,rel:3,days:.58,budget:.46}},cfg=configs[mode]||configs.balanced,baseDev=Math.max(120000,num(base.prototypeCost,base.stats.cost*120)),maturity=clamp(num(f.maturityScore)/100,0,1),days=Math.max(12,Math.ceil(42*cfg.days*(1-maturity*.22))),budget=Math.max(35000,Math.round(baseDev*cfg.budget*(1-maturity*.30)));if(num(state.cash)<budget*.08)return null;
 const pr={id:uid(state,"engcal"),name:base.name+" "+cfg.label+" Calibration",familyId:f.id,baseEngineId:base.id,mode,status:"active",phase:"CALIBRATION MAP",totalDays:days,daysRemaining:days,budget,spent:0,dailySpend:budget/days,userPaused:false,started:{year:state.year,month:state.month,day:state.day},calendarDaysElapsed:0,config:cfg};state.engineCalibrationPrograms.push(pr);log(pr.name+" started. Hardware stays in "+f.name+"; "+money(budget)+" is authorized for calibration, emissions and durability validation.");return pr;
}
function completeCalibration(state,p,log){
 const base=state.engines.find(x=>x.id===p.baseEngineId),f=state.engineFamilies.find(x=>x.id===p.familyId);if(!base||!f)return null;const cfg=p.config||{},e=JSON.parse(JSON.stringify(base));e.id=uid(state,"eng");e.name=base.name+" "+String(cfg.label||p.mode).replace(" / "," ");e.createdYear=state.year;e.revision=1;e.releaseStatus="released";e.familyId=f.id;e.familyGeneration=f.generation||1;e.variantType="calibration";e.calibrationId=p.id;e.calibrationMode=p.mode;e.parentEngineId=base.id;e.stats.hp=num(base.stats.hp)*num(cfg.hp,1);e.stats.torque=num(base.stats.torque)*num(cfg.tq,1);e.stats.cost=num(base.stats.cost)*num(cfg.cost,1);e.stats.rel=clamp(num(base.stats.rel)+num(cfg.rel),20,99);if(cfg.fuel)e.design.fuelGrade=cfg.fuel;e.programOutcome={paceLabel:"CALIBRATION",actualSpend:p.spent,calendarDays:p.calendarDaysElapsed,qualityDelta:num(cfg.rel)};state.engines.push(e);f.variantIds.push(e.id);f.testHours+=p.calendarDaysElapsed*5;f.developmentSpend+=p.spent;updateMaturity(f);p.status="complete";p.phase="RELEASED";p.resultEngineId=e.id;log(e.name+" released as a shared-hardware calibration variant of "+base.name+".");return e;
}
function toolingQuote(state,f,factory){
 const year=num(state.year,1970),era=CORE.economicIndex?CORE.economicIndex("industrialAssets",year):clamp(Math.pow(1.03,year-1970),.18,16),capacity=Math.max(100,num(factory?.shops?.powertrain,500)),maturity=clamp(num(f?.maturityScore)/100,0,1),budget=Math.round(Math.max(450000*era,capacity*1500*era)*(1-maturity*.18)),days=Math.max(25,Math.ceil(75*(1-maturity*.20)));return{budget,days,daily:budget/days};
}
function startPlantTooling(state,familyId,factoryId,log=()=>{}){
 ensure(state);const f=state.engineFamilies.find(x=>x.id===familyId),factory=state.operations?.factories?.find(x=>x.id===factoryId);if(!f||!factory||factory.status!=="operating"||num(factory.shops?.powertrain)<=0)return null;if((factory.engineFamilyTooling||[]).some(x=>x.familyId===f.id&&x.status==="active"))return null;if(state.engineToolingProjects.some(x=>x.familyId===familyId&&x.factoryId===factoryId&&x.status==="active"))return null;const q=toolingQuote(state,f,factory);if(num(state.cash)<q.daily*4)return null;const p={id:uid(state,"engtool"),familyId:f.id,factoryId:factory.id,name:f.name+" tooling — "+factory.name,status:"active",phase:"TOOL DESIGN",totalDays:q.days,daysRemaining:q.days,budget:q.budget,spent:0,dailySpend:q.daily,userPaused:false,calendarDaysElapsed:0,started:{year:state.year,month:state.month,day:state.day}};state.engineToolingProjects.push(p);log("Tooling conversion started at "+factory.name+" for "+f.name+" • "+money(q.budget)+" authorized.");return p;
}
function processDay(state,log=()=>{}){
 ensure(state);let spend=0;
 for(const p of state.engineCalibrationPrograms){if(p.status!=="active"||p.userPaused)continue;const burn=Math.min(num(p.dailySpend),Math.max(0,num(p.budget)-num(p.spent)));if(num(state.cash)<burn){p.phase="PAUSED — FUNDING";continue;}state.cash-=burn;p.spent+=burn;spend+=burn;p.calendarDaysElapsed++;p.daysRemaining=Math.max(0,p.daysRemaining-1);const progress=1-p.daysRemaining/Math.max(1,p.totalDays);p.phase=progress<.38?"CALIBRATION MAP":progress<.72?"DYNO + EMISSIONS":"DURABILITY VALIDATION";if(p.daysRemaining<=0)completeCalibration(state,p,log);}
 for(const p of state.engineToolingProjects){if(p.status!=="active"||p.userPaused)continue;const burn=Math.min(num(p.dailySpend),Math.max(0,num(p.budget)-num(p.spent)));if(num(state.cash)<burn){p.phase="PAUSED — FUNDING";continue;}state.cash-=burn;p.spent+=burn;spend+=burn;p.calendarDaysElapsed++;p.daysRemaining=Math.max(0,p.daysRemaining-1);const progress=1-p.daysRemaining/Math.max(1,p.totalDays);p.phase=progress<.35?"TOOL DESIGN":progress<.75?"MACHINING + FIXTURES":"PILOT RUN";if(p.daysRemaining<=0){p.status="complete";p.phase="PRODUCTION READY";const f=state.engineFamilies.find(x=>x.id===p.familyId),fac=state.operations?.factories?.find(x=>x.id===p.factoryId);if(f&&fac){ensureFactoryTooling(state,fac,[]);let row=fac.engineFamilyTooling.find(x=>x.familyId===f.id);if(!row){row={familyId:f.id,status:"active",installedPeriod:period(state),ramp:.70};fac.engineFamilyTooling.push(row);}else{row.status="active";row.ramp=Math.max(.70,num(row.ramp));}if(!f.toolingPlantIds.includes(fac.id))f.toolingPlantIds.push(fac.id);f.toolingHistory.push({period:period(state),factoryId:fac.id,type:"tooling_project",spend:p.spent});log(f.name+" tooling reached production readiness at "+fac.name+".");}}}
 return{spend};
}
function rampToolingMonth(state){
 ensure(state);for(const fac of state.operations?.factories||[])for(const row of fac.engineFamilyTooling||[])if(row.status==="active")row.ramp=clamp(num(row.ramp,.65)+.10,.65,1);
}
function familyCapacity(state,familyId,globalCapacity=0){
 ensure(state);const f=state.engineFamilies.find(x=>x.id===familyId);if(!f)return Math.max(0,num(globalCapacity));const plants=(state.operations?.factories||[]).filter(fac=>fac.status==="operating"&&(fac.engineFamilyTooling||[]).some(t=>t.familyId===f.id&&t.status==="active"));if(!plants.length)return f.autoTooledLegacy?Math.max(0,num(globalCapacity)):0;let cap=0;for(const fac of plants){const tool=fac.engineFamilyTooling.find(t=>t.familyId===f.id&&t.status==="active"),shift=fac.shifts===1?1:fac.shifts===2?1.7:2.3,maint=clamp(num(fac.maintenance,1),.65,1.08),power=num(fac.shops?.powertrain),workers=Math.max(100,num(fac.workers,100)),required=Math.max(120,power*.37*shift),staffing=clamp(.55+.45*Math.sqrt(workers/required),.35,3.6);cap+=power*shift*maint*.82*staffing*clamp(num(tool?.ramp,1),.4,1);}return Math.max(0,Math.round(cap));
}
function engineCapacity(state,engineId,globalCapacity=0){const f=familyForEngine(state,engineId);return f?familyCapacity(state,f.id,globalCapacity):Math.max(0,num(globalCapacity));}
function onEngineRevisionComplete(state,e,action){
 ensure(state);const f=familyForEngine(state,e.id);if(!f)return;f.testHours+=Math.max(15,num(action?.calendarDaysElapsed)*4);f.knownIssuesResolved+=1;f.revisionHistory.push({period:period(state),engineId:e.id,revision:e.revision,spend:num(action?.spent),type:"engineering_revision"});f.developmentSpend+=num(action?.spent);updateMaturity(f);e.stats.cost=Math.max(1,num(e.stats.cost)*(1-clamp(num(f.maturityScore)/100*.012,0,.012)));
}
function familyUse(state,f){
 const ids=new Set(f.variantIds||[]),vehicles=(state.vehicles||[]).filter(v=>ids.has(v.engineId)),contracts=(state.engineSupply?.contracts||[]).filter(c=>ids.has(c.engineId)&&c.status==="active"),customers=[...new Set(contracts.map(c=>c.buyerName).filter(Boolean))];return{vehicles,contracts,customers};
}
function builderMarkup(state,design){
 ensure(state);const compat=compatibleFamilies(state,design),selected=design?.familyId||"",selectedInfo=selected?compat.find(x=>x.family.id===selected):null;
 return"<div class='control-section compact-section engine-family-builder'><h4>Engine family strategy</h4><label class='engineering-select'><span>HARDWARE FAMILY</span><select data-engine-family-select><option value=''>NEW CLEAN-SHEET FAMILY</option>"+compat.map(x=>"<option value='"+x.family.id+"' "+(x.family.id===selected?"selected":"")+">REUSE "+x.family.name+" • "+Math.round(x.family.maturityScore)+"/100 mature</option>").join("")+"</select><small>"+(selectedInfo?"Compatible hardware reuse cuts development/tooling while retaining family maturity.":"New family creates new block/crankcase tooling. Compatible existing families appear here automatically.")+"</small></label>"+(selectedInfo?"<div class='engineering-derived-grid'><div class='derived'><span>FAMILY MATURITY</span><b>"+Math.round(selectedInfo.family.maturityScore)+"/100</b></div><div class='derived'><span>SUPPORTED DISPLACEMENT</span><b>"+selectedInfo.family.minDisp.toFixed(1)+"–"+selectedInfo.family.maxDisp.toFixed(1)+" L</b></div></div>":"")+"</div>";
}
function wireBuilder(root,state,design,onChange){root?.querySelector("[data-engine-family-select]")?.addEventListener("change",ev=>{design.familyId=ev.target.value||null;if(onChange)onChange();});}
function renderFamilyLibrary(state,moneyFn=money){
 ensure(state);if(!state.engineFamilies.length)return"";
 return"<div class='engine-family-library'>"+state.engineFamilies.map(f=>{const use=familyUse(state,f),variants=(f.variantIds||[]).map(id=>state.engines.find(e=>e.id===id)).filter(Boolean),plants=(state.operations?.factories||[]).filter(x=>(x.engineFamilyTooling||[]).some(t=>t.familyId===f.id&&t.status==="active")),availablePlants=(state.operations?.factories||[]).filter(x=>x.status==="operating"&&num(x.shops?.powertrain)>0&&!plants.some(p=>p.id===x.id));return"<article class='engine-family-card'><div class='engine-card-top'><div><span class='tag'>FAMILY • "+f.createdYear+" • GEN "+f.generation+"</span><h3>"+f.name+"</h3><span class='tag'>"+f.architecture+" • "+f.minDisp.toFixed(1)+"–"+f.maxDisp.toFixed(1)+" L • "+Math.round(f.maturityScore)+"/100 maturity</span></div><b class='status-badge'>"+variants.length+" VARIANT"+(variants.length===1?"":"S")+"</b></div><div class='mini-kpis'><div><span>LIFETIME VOLUME</span><b>"+Math.round(f.productionUnits).toLocaleString()+"</b></div><div><span>TEST HOURS</span><b>"+Math.round(f.testHours).toLocaleString()+"</b></div><div><span>FIELD LEARNING</span><b>"+Math.round(f.fieldVehicleMonths)+" model-mo</b></div><div><span>EXTERNAL REVENUE</span><b>"+moneyFn(f.lifetimeRevenue)+"</b></div><div><span>EXTERNAL PROFIT</span><b>"+moneyFn(f.lifetimeProfit)+"</b></div><div><span>TOOLED PLANTS</span><b>"+plants.length+"</b></div></div><div class='family-variant-list'>"+variants.map(e=>"<div><span>"+(e.variantType||"hardware").replaceAll("_"," ").toUpperCase()+"</span><b>"+e.name+"</b><small>"+Math.round(e.stats.hp)+" hp • "+e.stats.disp.toFixed(2)+"L • "+Math.round(e.stats.rel)+"/100 • "+moneyFn(e.stats.cost)+"</small><div class='family-actions'><button class='btn secondary' data-engine-cal='"+e.id+":economy'>ECONOMY CAL</button><button class='btn secondary' data-engine-cal='"+e.id+":performance'>PERFORMANCE CAL</button><button class='btn secondary' data-engine-cal='"+e.id+":fleet'>FLEET CAL</button></div></div>").join("")+"</div><div class='family-meta'><span>VEHICLES: "+(use.vehicles.map(v=>v.name).join(", ")||"None yet")+"</span><span>OEM CUSTOMERS: "+(use.customers.join(", ")||"None")+"</span></div>"+(availablePlants.length?"<div class='family-tooling'><span>ADD PRODUCTION PLANT</span><div>"+availablePlants.map(p=>"<button class='btn secondary' data-engine-tool='"+f.id+":"+p.id+"'>TOOL "+p.name.toUpperCase()+"</button>").join("")+"</div></div>":"")+"</article>";}).join("")+"</div>";
}
function activeProgramsMarkup(state,moneyFn=money){
 ensure(state);const rows=[...state.engineCalibrationPrograms.filter(p=>p.status==="active").map(p=>({...p,kind:"CALIBRATION"})),...state.engineToolingProjects.filter(p=>p.status==="active").map(p=>({...p,kind:"ENGINE PLANT TOOLING"}))];if(!rows.length)return"";return"<div class='powertrain-family-programs'>"+rows.map(p=>{const progress=Math.round(100*(1-num(p.daysRemaining)/Math.max(1,num(p.totalDays))));return"<article class='program-card'><div class='program-head'><div><span class='tag'>"+p.kind+"</span><h3>"+p.name+"</h3></div><b>"+Math.ceil(p.daysRemaining)+" DAYS</b></div><div class='program-phase'>"+p.phase+"</div><div class='process-bar'><i style='width:"+progress+"%'></i></div><div class='program-meta'><span>"+progress+"% complete</span><span>"+moneyFn(p.spent)+" spent</span><span>"+moneyFn(Math.max(0,p.budget-p.spent))+" remaining</span></div></article>";}).join("")+"</div>";
}
function wireLibrary(root,state,h={}){
 const log=h.log||(()=>{}),save=h.save||(()=>{}),rerender=h.rerender||(()=>{}),toast=h.toast||(()=>{});
 root?.querySelectorAll("[data-engine-cal]").forEach(b=>b.addEventListener("click",()=>{const [engineId,mode]=b.dataset.engineCal.split(":");const p=startCalibration(state,engineId,mode,log);if(!p){toast("Calibration program could not be started.");return;}save();rerender();}));
 root?.querySelectorAll("[data-engine-tool]").forEach(b=>b.addEventListener("click",()=>{const raw=b.dataset.engineTool,cut=raw.indexOf(":");const p=startPlantTooling(state,raw.slice(0,cut),raw.slice(cut+1),log);if(!p){toast("Factory tooling program could not be started.");return;}save();rerender();}));
}
function runSelfTests(){
 const failures=[],check=(x,m)=>{if(!x)failures.push(m);},state={year:1995,month:0,day:1,cash:1e8,engines:[],enginePrograms:[],engineSupply:{contracts:[]},vehicles:[],engineFamilies:[],engineCalibrationPrograms:[],engineToolingProjects:[],operations:{factories:[{id:"f1",name:"Powertrain One",status:"operating",workers:1200,shifts:2,maintenance:1,shops:{powertrain:1000}}]}};
 const e={id:"e1",name:"Atlas 2.0",createdYear:1994,revision:1,design:{config:"I4",bore:86,stroke:86,block:"iron",blockDeck:"open",liners:"cast",head:"dohc",headMaterial:"aluminum",assembly:"standard",tolerance:"standard"},stats:{disp:2,hp:150,torque:145,rel:78,cost:1400},programOutcome:{calendarDays:50,actualSpend:1e6}};state.engines.push(e);ensure(state);const f=familyForEngine(state,e.id);check(!!f&&f.variantIds.includes(e.id),"legacy released engine did not migrate into a family");check(f.toolingPlantIds.includes("f1"),"legacy family did not preserve production tooling capacity");
 const d={...e.design,bore:87,stroke:90,familyId:f.id};const comp=compatibility(state,d,f);check(comp.compatible,"compatible geometry rejected family reuse");const q=quote(state,d,{days:100,budget:2e6,daily:20000});check(q.reuse&&q.days<100&&q.budget<2e6,"family reuse did not reduce program time/tooling cost");
 const bad={...d,config:"V8"};check(!compatibility(state,bad,f).compatible,"structural architecture change incorrectly reused family");
 const p=startCalibration(state,e.id,"performance",()=>{});check(!!p,"calibration program did not start");for(let i=0;i<100&&p.status==="active";i++)processDay(state,()=>{});const cal=state.engines.find(x=>x.id===p.resultEngineId);check(p.status==="complete"&&cal?.familyId===f.id&&cal?.parentEngineId===e.id,"calibration did not release shared-hardware family variant");
 const prior=f.productionUnits;recordInternalProduction(state,e.id,5000);check(f.productionUnits>=prior+5000&&f.maturityScore>0,"actual engine production did not improve family maturity");
 const f2={...familyFromEngine(state,{...e,id:"e2",name:"Nova",design:{...e.design,config:"I6"},stats:{...e.stats}},false),id:"fam2",autoTooledLegacy:false,toolingPlantIds:[],variantIds:[]};state.engineFamilies.push(f2);const tp=startPlantTooling(state,f2.id,"f1",()=>{});check(!!tp,"plant tooling project did not start");for(let i=0;i<200&&tp.status==="active";i++)processDay(state,()=>{});check(tp.status==="complete"&&familyCapacity(state,f2.id,0)>0,"completed family tooling did not create real engine capacity");
 return{ok:!failures.length,failures};
}
window.MDXPowertrainFamilies={ensure,compatibility,compatibleFamilies,quote,authorizeProgram,onEngineReleased,onEngineRevisionComplete,familyForEngine,learningFactor,recordInternalProduction,recordExternalDelivery,settleMonth,rampToolingMonth,startCalibration,startPlantTooling,processDay,familyCapacity,engineCapacity,builderMarkup,wireBuilder,renderFamilyLibrary,activeProgramsMarkup,wireLibrary,runSelfTests};
})();