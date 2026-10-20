(() => {
"use strict";
const CORE=window.MDX_CORE||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clean=v=>String(v??"").trim();
const period=s=>num(s?.year,1970)*12+num(s?.month,0);
const uid=(s,p)=>CORE.randomId?CORE.randomId(s,p,"compatibility"):p+"_"+period(s)+"_"+Math.floor(Math.random()*1e9);
const money=v=>{v=num(v);const a=Math.abs(v),t=a>=1e6?"$"+(a/1e6).toFixed(2)+"M":a>=1e3?"$"+(a/1e3).toFixed(1)+"K":"$"+Math.round(a).toLocaleString();return v<0?"-"+t:t;};

function ensure(state){
 if(!state||typeof state!=="object")return state;
 state.powertrainCompatibilityGraph=state.powertrainCompatibilityGraph&&typeof state.powertrainCompatibilityGraph==="object"?state.powertrainCompatibilityGraph:{version:1,edges:{}};
 state.powertrainCompatibilityGraph.edges=state.powertrainCompatibilityGraph.edges&&typeof state.powertrainCompatibilityGraph.edges==="object"?state.powertrainCompatibilityGraph.edges:{};
 state.powertrainAdapterProjects=Array.isArray(state.powertrainAdapterProjects)?state.powertrainAdapterProjects:[];
 return state;
}
function layoutFor(design={}){return design.drivetrain==="FWD"?"transverse":"longitudinal";}
function keyFor(input){
 const d=input.design||{},engineId=input.engineId||input.engine?.id||"none",txId=input.transmissionId||input.transmission?.id||d.trans||"none";
 return [engineId,txId,d.drivetrain||"RWD",layoutFor(d),d.enginePlacement||"front",input.platform?.id||d.platformId||"new",d.propulsion||"ice"].join("|");
}
function signature(input){
 const e=input.engine||{},t=input.transmission||{},d=input.design||{},p=input.platform||{};
 return JSON.stringify([e.id,num(e.stats?.torque),num(e.stats?.disp),num(e.stats?.mass),e.familyId,t.id,t.familyId,t.type,num(t.torque),t.controlSystem,t.coupling,t.hybrid,t.electric,t.drivetrainCompat,t.layoutCompat,d.drivetrain,d.enginePlacement,d.propulsion||"ice",d.hybridArchitecture===true,d.evArchitecture===true,p.id,p.drive,p.maxDisp,p.maxEngineMass]);
}
function assess(state,input={}){
 ensure(state);window.MDXPowertrainFamilies?.ensure?.(state);window.MDXTransmissionFamilies?.ensure?.(state);const e=input.engine,t=input.transmission,d=input.design||{},platform=input.platform||null,key=keyFor(input),sig=signature(input),prior=state.powertrainCompatibilityGraph.edges[key],hard=[],soft=[],notes=[],propulsion=String(d.propulsion||"ice"),isBEV=propulsion==="bev",isHybrid=!["ice","bev"].includes(propulsion)||d.hybridArchitecture===true;
 if(!e&&!isBEV)hard.push("No released engine selected");
 if(!t)hard.push("No transmission selected");
 const engineTorque=Math.max(0,num(e?.stats?.torque)),txTorque=Math.max(1,num(t?.torque,1)),torqueMargin=engineTorque>0?txTorque/engineTorque:1,vehicleLayout=layoutFor(d);
 const driveOk=!Array.isArray(t?.drivetrainCompat)||t.drivetrainCompat.includes(d.drivetrain||"RWD");
 const layoutOk=!Array.isArray(t?.layoutCompat)||t.layoutCompat.includes(vehicleLayout);
 if(!driveOk)hard.push("Transmission architecture does not support "+(d.drivetrain||"RWD"));
 if(!layoutOk)hard.push("Transmission case/orientation does not support "+vehicleLayout+" installation");
 if(engineTorque>0&&torqueMargin<.75)hard.push("Transmission torque rating is below 75% of engine output");
 else if(engineTorque>0&&torqueMargin<1.05)soft.push("Torque margin needs durability validation / upgraded coupling");
 if(isBEV&&t&&!t.electric)hard.push("Battery-electric architecture requires an electric reduction drive");
 if(isBEV&&t?.hybrid)hard.push("Battery-electric architecture requires a dedicated reduction drive rather than a hybrid eCVT");
 if(t?.hybrid&&!isHybrid)hard.push("eCVT / hybrid transmission requires a compatible hybrid architecture");
 if(t?.electric&&!isBEV&&!isHybrid)hard.push("Electric reduction drive requires an EV or hybrid architecture");
 if(propulsion==="powersplit"&&t&&!t.hybrid)hard.push("Power-split hybrid requires a compatible hybrid / eCVT transmission");
 const engineCustom=!!e&&(state.engines||[]).some(x=>x.id===e.id),txCustom=!!(state.transmissions||[]).some(x=>x.id===t?.id);
 if(!isBEV&&engineCustom&&txCustom&&e?.familyId&&t?.familyId&&!(prior?.approved&&prior.signature===sig))soft.push("Engine-to-transmission bellhousing, mounts and controls need interface engineering");
 const electronic=["electronic","adaptive","performance"].includes(String(t?.controlSystem||""));
 const oldEngineControl=["magneto","distributor","points"].includes(String(e?.design?.ignition||""));
 if(!isBEV&&electronic&&oldEngineControl)soft.push("Transmission electronics require a control interface / sensor package");
 if(platform){
   const disp=isBEV?0:num(e?.stats?.disp),massKg=isBEV?0:num(e?.stats?.mass)*.453592,dispLimit=Math.max(.1,num(platform.maxDisp,99)),massLimit=Math.max(1,num(platform.maxEngineMass,9999));
   if(disp>dispLimit*1.20||massKg>massLimit*1.20)hard.push("Powertrain exceeds platform physical envelope");
   else if(disp>dispLimit||massKg>massLimit)soft.push("Platform mounts/cooling need packaging engineering");
   if(platform.drive&&platform.drive!==(d.drivetrain||"RWD"))soft.push("Platform driveline architecture needs adaptation");
 }
 const engineFamily=!isBEV?window.MDXPowertrainFamilies?.familyForEngine?.(state,e?.id):null,txFamily=window.MDXTransmissionFamilies?.familyForTransmission?.(state,t?.id);
 if(engineFamily&&!engineFamily.toolingPlantIds?.length)notes.push("Engine family still needs production tooling");
 if(txFamily&&!txFamily.toolingPlantIds?.length)notes.push("Transmission family still needs production tooling");
 const approved=!!(prior?.approved&&prior.signature===sig),status=hard.length?"impossible":soft.length&&!approved?"engineering":"compatible",reasonCount=soft.length,baseCost=Math.max(25000,num(e?.stats?.cost)*28+num(t?.cost)*42),integrationCost=status==="engineering"?Math.round(baseCost*(.55+reasonCount*.22)):0,integrationDays=status==="engineering"?Math.max(7,Math.ceil(8+reasonCount*5)):0;
 const torqueStress=engineTorque>0?Math.max(0,(engineTorque-txTorque)/txTorque):0,stress=status==="impossible"?Math.max(.35,torqueStress+.20):status==="engineering"?Math.max(.08,torqueStress+.08):Math.max(0,torqueStress);
 return{key,signature:sig,status,approved,hardReasons:hard,engineeringReasons:soft,notes,engineId:e?.id||null,transmissionId:t?.id||d.trans||null,drivetrain:d.drivetrain||"RWD",layout:vehicleLayout,enginePlacement:d.enginePlacement||"front",platformId:platform?.id||null,propulsion,torqueMargin:Number(torqueMargin.toFixed(3)),torqueStress,stress,drivetrainCompatible:driveOk,layoutCompatible:layoutOk,integrationCost,integrationDays};
}
function persist(state,assessment,meta={}){
 ensure(state);if(!assessment?.key)return null;const prior=state.powertrainCompatibilityGraph.edges[assessment.key]||{};
 const row={...prior,key:assessment.key,signature:assessment.signature,status:assessment.status,approved:assessment.approved||prior.approved===true,engineId:assessment.engineId,transmissionId:assessment.transmissionId,drivetrain:assessment.drivetrain,layout:assessment.layout,enginePlacement:assessment.enginePlacement,platformId:assessment.platformId,torqueMargin:assessment.torqueMargin,hardReasons:[...assessment.hardReasons],engineeringReasons:[...assessment.engineeringReasons],notes:[...assessment.notes],lastAssessedPeriod:period(state),...meta};
 state.powertrainCompatibilityGraph.edges[assessment.key]=row;return row;
}
function startAdapterProject(state,assessment,log=()=>{}){
 ensure(state);if(!assessment||assessment.status!=="engineering")return null;
 const existing=state.powertrainAdapterProjects.find(p=>p.compatibilityKey===assessment.key&&p.signature===assessment.signature&&p.status==="active");if(existing)return existing;
 const budget=Math.max(25000,num(assessment.integrationCost)),days=Math.max(7,num(assessment.integrationDays));if(num(state.cash)<budget*.08)return null;
 persist(state,assessment);
 const p={id:uid(state,"ptadapter"),name:"Powertrain integration • "+String(assessment.engineId)+" + "+String(assessment.transmissionId),compatibilityKey:assessment.key,signature:assessment.signature,status:"active",phase:"INTERFACE DESIGN",totalDays:days,daysRemaining:days,budget,spent:0,dailySpend:budget/days,userPaused:false,calendarDaysElapsed:0,reasons:[...assessment.engineeringReasons],started:{year:state.year,month:state.month,day:state.day}};
 state.powertrainAdapterProjects.push(p);log("Powertrain integration engineering started: "+days+" days • "+money(budget)+" authorized. "+p.reasons.join("; ")+".");return p;
}
function processDay(state,log=()=>{}){
 ensure(state);let spend=0;
 for(const p of state.powertrainAdapterProjects){if(p.status!=="active"||p.userPaused)continue;const burn=Math.min(num(p.dailySpend),Math.max(0,num(p.budget)-num(p.spent)));if(num(state.cash)<burn){p.phase="PAUSED — FUNDING";continue;}state.cash-=burn;p.spent+=burn;spend+=burn;p.calendarDaysElapsed++;p.daysRemaining=Math.max(0,p.daysRemaining-1);const x=1-p.daysRemaining/Math.max(1,p.totalDays);p.phase=x<.35?"INTERFACE DESIGN":x<.72?"MOUNTS / CONTROLS / COOLING":"DURABILITY VALIDATION";if(p.daysRemaining<=0){p.status="complete";p.phase="VALIDATED";const edge=state.powertrainCompatibilityGraph.edges[p.compatibilityKey]||{};state.powertrainCompatibilityGraph.edges[p.compatibilityKey]={...edge,key:p.compatibilityKey,signature:p.signature,approved:true,status:"compatible",adapterProjectId:p.id,approvedPeriod:period(state),integrationSpend:p.spent};log("Powertrain integration validation completed. This exact engine / transmission / driveline combination is now approved.");}}
 return{spend};
}
function vehicleSnapshot(state,input){const a=assess(state,input);persist(state,a,{vehicleLocked:true});return JSON.parse(JSON.stringify(a));}
function markup(assessment){
 if(!assessment)return"";const cls=assessment.status==="compatible"?"positive":assessment.status==="impossible"?"negative":"warning",title=assessment.status==="compatible"?"COMPATIBLE":assessment.status==="impossible"?"IMPOSSIBLE":"REQUIRES ENGINEERING",reasons=[...assessment.hardReasons,...assessment.engineeringReasons,...assessment.notes];
 return"<div class='powertrain-compat-card "+assessment.status+"'><div class='powertrain-compat-head'><span>SYSTEM 089 • POWERTRAIN COMPATIBILITY</span><b class='"+cls+"'>"+title+"</b></div><div class='mini-kpis'><div><span>TORQUE MARGIN</span><b>"+Math.round(assessment.torqueMargin*100)+"%</b></div><div><span>LAYOUT</span><b>"+assessment.layout.toUpperCase()+"</b></div><div><span>DRIVELINE</span><b>"+assessment.drivetrain+"</b></div><div><span>INTERFACE</span><b>"+(assessment.approved?"VALIDATED":assessment.status==="compatible"?"STANDARD":"CHECK")+"</b></div></div>"+(reasons.length?"<div class='compat-reasons'>"+reasons.map(x=>"<span>"+x+"</span>").join("")+"</div>":"<p class='muted'>No unresolved interface, torque, orientation or platform conflicts.</p>")+(assessment.status==="engineering"?"<div class='compat-engineering'><div><span>INTEGRATION PROGRAM</span><b>"+assessment.integrationDays+" days • "+money(assessment.integrationCost)+" authorized</b></div><button type='button' class='btn hero' data-powertrain-adapter>ENGINEER + VALIDATE</button></div>":"")+"</div>";
}
function wire(root,state,getAssessment,h={}){
 const log=h.log||(()=>{}),save=h.save||(()=>{}),rerender=h.rerender||(()=>{}),toast=h.toast||(()=>{});
 root?.querySelector("[data-powertrain-adapter]")?.addEventListener("click",()=>{const a=getAssessment?.();const p=startAdapterProject(state,a,log);if(!p){toast("Powertrain integration program could not be started.");return;}save();rerender();});
}
function activeProgramsMarkup(state,moneyFn=money){ensure(state);const rows=state.powertrainAdapterProjects.filter(p=>p.status==="active");if(!rows.length)return"";return"<div class='powertrain-adapter-programs'>"+rows.map(p=>{const x=Math.round(100*(1-num(p.daysRemaining)/Math.max(1,num(p.totalDays))));return"<article class='program-card'><span class='tag'>POWERTRAIN INTEGRATION</span><h3>"+p.name+"</h3><div class='program-phase'>"+p.phase+"</div><div class='process-bar'><i style='width:"+x+"%'></i></div><div class='program-meta'><span>"+x+"% complete</span><span>"+moneyFn(p.spent)+" spent</span><span>"+Math.ceil(p.daysRemaining)+" days</span></div></article>";}).join("")+"</div>";}
function runSelfTests(){
 const failures=[],check=(x,m)=>{if(!x)failures.push(m);},s={year:1995,month:0,day:1,cash:1e7,engines:[{id:"e",familyId:"ef",design:{ignition:"ecu"},stats:{torque:300,disp:3,mass:400,cost:1800}}],transmissions:[{id:"t",familyId:"tf",type:"Manual",torque:360,cost:900,controlSystem:"mechanical",drivetrainCompat:["RWD"],layoutCompat:["longitudinal"]}],powertrainCompatibilityGraph:{version:1,edges:{}},powertrainAdapterProjects:[]};
 let a=assess(s,{engine:s.engines[0],transmission:s.transmissions[0],design:{drivetrain:"RWD",enginePlacement:"front"}});check(a.status==="engineering","first custom engine/transmission interface should require engineering");const p=startAdapterProject(s,a,()=>{});check(!!p,"adapter project did not start");for(let i=0;i<60&&p.status==="active";i++)processDay(s,()=>{});a=assess(s,{engine:s.engines[0],transmission:s.transmissions[0],design:{drivetrain:"RWD",enginePlacement:"front"}});check(a.status==="compatible"&&a.approved,"completed adapter did not persist deterministic compatibility");
 const badTx={...s.transmissions[0],id:"weak",torque:150};a=assess(s,{engine:s.engines[0],transmission:badTx,design:{drivetrain:"RWD"}});check(a.status==="impossible","severe torque mismatch was not rejected");
 a=assess(s,{engine:s.engines[0],transmission:s.transmissions[0],design:{drivetrain:"FWD"}});check(a.status==="impossible","unsupported driveline orientation was not rejected");
 return{ok:!failures.length,failures};
}
window.MDXPowertrainCompatibility={ensure,assess,persist,startAdapterProject,processDay,vehicleSnapshot,markup,wire,activeProgramsMarkup,runSelfTests};
})();