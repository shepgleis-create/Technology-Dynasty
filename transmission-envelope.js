/* Motor Dynasty — transmission and driveline feasibility / funded release testing.
   CHECKLIST 501–600, additive: existing published gearboxes and saves are not rebalanced.
   All changes apply to a newly authorized gearbox development program. */
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const n=(x,d=0)=>x!==null&&x!==""&&Number.isFinite(Number(x))?Number(x):d;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const fixed=(x,p=1)=>Number(x.toFixed(p));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const flag=(list,message)=>{if(!list.includes(message))list.push(message);};
function evaluate(s,d,spec,architecture,catalogs={}){
 const year=n(s?.year,1970),errors=[],warnings=[],raw=Array.isArray(d?.gearRatios)?d.gearRatios:null,
  gears=Math.max(0,n(architecture?.gears,0)),type=String(architecture?.type||spec?.type||"");
 if(!architecture||!spec){return{ready:false,errors:["Transmission architecture is unavailable"],warnings,stress:100,measurements:{},extraDays:0,extraBudget:0};}
 if(year<n(architecture.minYear,1940))flag(errors,"Architecture cannot be produced before "+architecture.minYear);
 if(architecture.tech&&!Array.isArray(s?.unlocked))flag(errors,"Required transmission architecture research is missing");
 if(architecture.tech&&Array.isArray(s?.unlocked)&&!s.unlocked.includes(architecture.tech))flag(errors,"Research "+architecture.tech+" before authorizing this transmission");
 if(d?.base&&spec.architecture&&d.base!==spec.architecture)flag(errors,"Transmission architecture changed since engineering preview");
 for(const [field,entries] of Object.entries(catalogs||{})){
  if(!entries||typeof entries!=="object")continue;
  const selected=d?.[field]||spec[field];
  if(selected==null)continue;
  const part=entries[selected];
  if(!part){flag(errors,"Unrecognized "+field+" component");continue;}
  if(year<n(part.minYear,1900))flag(errors,field+" package is not available until "+part.minYear);
  if(field==="coupling"&&Array.isArray(part.types)&&!part.types.includes(type))flag(errors,"Selected coupling is incompatible with "+type);
  if(field==="controlSystem"){
   const valid=type==="Manual"||type==="Performance"||type==="Transaxle"?selected==="mechanical":
     type==="DCT"||type==="AMT"?["electronic","adaptive","performance"].includes(selected):
     type==="CVT"?["hydraulic","electronic","adaptive"].includes(selected):
     type==="eCVT"?["electronic","adaptive"].includes(selected):
     ["hydraulic","electronic","adaptive","performance"].includes(selected);
   if(!valid)flag(errors,"The selected shift controller does not support "+type);
  }
 }
 const ratios=Array.isArray(spec.ratios)?spec.ratios:[],validNumber=x=>Number.isFinite(Number(x))&&Number(x)>0,
  rawRatios=raw&&raw.length===gears?raw:null;
 if(gears&&ratios.length!==gears)flag(errors,"Gearset is missing ratios");
 if(raw&&gears&&raw.length!==gears)flag(errors,"Stored gearset has the wrong number of ratios");
 if(rawRatios&&rawRatios.some(x=>!validNumber(x)||Number(x)<.35||Number(x)>6.8))flag(errors,"Invalid gear ratios in saved draft");
 if(gears&&ratios.some((r,i)=>!validNumber(r)||r<.35||r>6.8||i>0&&r>=ratios[i-1]-.015))flag(errors,"Gear ratios must descend from first to top gear without overlap");
 if(spec.ratioOrderValid===false)flag(errors,"Transmission calculation reports invalid ratio sequencing");
 if(!gears&&ratios.length)flag(errors,"Variator must not contain stepped gear ratios");
 const engineId=String(d?.engineTargetId||"");
 const engine=engineId?(s?.engines||[]).find(e=>String(e.id)===engineId):null;
 if(engineId&&!engine)flag(warnings,"Previously selected engine target is missing; bench evaluation only");
 const engineTorque=engine?n(engine.stats?.torque,n(engine.stats?.tq)):0;
 const capacity=Math.max(1,n(spec.torque,1)),torqueMargin=engineTorque?(capacity/Math.max(engineTorque,1)-1)*100:null;
 if(engine&&engineTorque>capacity*1.2)flag(errors,"Selected engine torque exceeds gearbox capacity by more than 20%");
 else if(engine&&engineTorque>capacity)flag(warnings,"Selected engine torque exceeds rated gearbox capacity");
 const sampleTorque=engineTorque||Math.min(capacity,Math.max(120,capacity*.78)),
  inputKw=sampleTorque*2500/5252*.745699872;
 const eff=clamp(n(spec.eff,.93),.65,.999),
  drivelineLossKw=Math.max(0,inputKw*(1-eff)),
  coolingHeadroom=clamp(n(spec.heatTolerance,70),0,100),
  thermalStress=Math.max(0,drivelineLossKw-(coolingHeadroom/100)*16),
  ratioSpread=gears?ratios[0]/Math.max(.1,ratios[ratios.length-1]):n(spec.firstRatio,1)/Math.max(.1,n(spec.topRatio,1)),
  maxRpmDrop=gears?Math.max(0,...ratios.slice(1).map((x,i)=>(1-x/Math.max(.01,ratios[i]))*100)):0,
  manufacturingYield=n(spec.manufacturingYield,95),
  reliability=n(spec.reliability,85),
  warranty=n(spec.warrantyRisk,12),
  service=n(spec.serviceability,65),
  complexity=n(spec.complexity,50);
 if(maxRpmDrop>48)flag(warnings,"Wide RPM drops may leave the engine outside its useful torque band");
 if(thermalStress>7)flag(warnings,"Gearbox oil heat rejection is insufficient at the reference load");
 if(coolingHeadroom<45&&["DCT","Automatic","CVT","Heavy-Duty"].includes(type))flag(warnings,"High-heat architecture requires additional transmission cooling");
 if(manufacturingYield<86)flag(warnings,"Low first-pass manufacturing yield increases scrap and warranty exposure");
 if(reliability<70)flag(warnings,"Low projected gearbox reliability requires longer durability testing");
 if(service<40)flag(warnings,"Internal component accessibility is costly to service");
 if(ratioSpread>12)flag(warnings,"Very wide overall ratio spread increases geartrain packaging demands");
 // Deterministic risk envelope: not a claim of real-world certification.
 const stress=fixed(clamp(
   Math.max(0,87-reliability)*1.20+Math.max(0,85-manufacturingYield)*.48+
   Math.max(0,warranty-16)*.8+Math.max(0,complexity-72)*.4+
   thermalStress*2.6+Math.max(0,maxRpmDrop-43)*.25+
   Math.max(0,engineTorque-capacity)/capacity*72,0,100));
 const extraDays=stress<20?0:stress<40?2:stress<65?5:stress<85?9:14;
 const eraFactor=clamp(Math.pow(1.025,year-1970),.35,5);
 const extraBudget=extraDays?Math.max(500,Math.round((1400+stress*115)*eraFactor)):0;
 const measurements={architecture:type,gearCount:gears,ratioSpread:fixed(ratioSpread,2),
  maxRpmDropPct:fixed(maxRpmDrop,1),launchMultiplication:fixed(n(spec.launchMultiplication),2),
  cruiseMultiplication:fixed(n(spec.cruiseMultiplication),2),
  referenceLossKw:fixed(drivelineLossKw,2),referenceLoadRpm:2500,
  coolingHeadroom:fixed(coolingHeadroom),thermalStress:fixed(thermalStress,1),
  engineTargetId:engine?.id||null,engineTorqueLbFt:engineTorque,
  torqueMarginPct:torqueMargin===null?null:fixed(torqueMargin),
  gearboxCapacityLbFt:capacity,manufacturingYield:fixed(manufacturingYield)};
 return{ready:!errors.length,errors,warnings,stress,extraDays,extraBudget,measurements,
  summary:errors.length?"Unapproved engineering geometry":stress>=85?"Critical validation risk":stress>=65?"Major validation program":stress>=40?"Extended validation":stress>=20?"Targeted testing":"Standard validation"};
}
function enrichQuote(s,d,spec,plan,arch,parts){
 if(!plan)return plan;
 const report=evaluate(s,d,spec,arch,parts);
 const days=Math.max(1,Math.round(n(plan.days,1)+report.extraDays)),
 budget=Math.max(0,Math.round(n(plan.budget)+report.extraBudget));
 return{...plan,days,budget,daily:budget/days,transmissionValidation:report};
}
function render(root,s,d,spec,plan,arch,parts){
 if(!root)return;const report=evaluate(s,d,spec,arch,parts),m=report.measurements;
 const ratios=Array.isArray(spec?.ratios)?spec.ratios:[],len=ratios.length;
 const lines=len?ratios.map((x,i)=>{
  const px=17+i*(210/Math.max(1,len-1)),y=92-clamp(x/7,0,1)*76;
  return (i===0?"M":"L")+px.toFixed(1)+" "+y.toFixed(1);
 }).join(" "):"M17 20 L227 88";
 const chart='<svg viewBox="0 0 245 110" role="img" aria-label="Live transmission gear ratio progression"><path d="M17 12 V93 H235" stroke="currentColor" stroke-width="1" opacity=".33" fill="none"/><path d="'+lines+'" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
  (len?ratios.map((x,i)=>'<circle cx="'+(17+i*(210/Math.max(1,len-1))).toFixed(1)+'" cy="'+(92-clamp(x/7,0,1)*76).toFixed(1)+'" r="3.3" fill="currentColor"/>').join(""):'')+
  '<text x="19" y="106" fill="currentColor" font-size="9">1ST</text><text x="215" y="106" fill="currentColor" font-size="9">TOP</text></svg>';
 const box=(title,val)=>'<div><span>'+esc(title)+'</span><b>'+esc(val)+'</b></div>';
 root.innerHTML='<header><span>GEARBOX VALIDATION</span><strong>'+esc(report.summary)+'</strong><small>Risk '+report.stress+'/100 · Additional '+report.extraDays+' days / $'+report.extraBudget.toLocaleString()+'</small></header>'+
 '<div class="tx-envelope-data">'+chart+'<div class="tx-envelope-metrics">'+
 box("Ratio spread",m.ratioSpread.toFixed(2)+":1")+box("Maximum RPM drop",m.maxRpmDropPct+"%")+
 box("Loss at 2,500 rpm",m.referenceLossKw+" kW")+box("Thermal stress",m.thermalStress+"/100")+
 box("Paired engine",m.engineTorqueLbFt?m.engineTorqueLbFt+" lb-ft":"No engine selected")+
 box("Torque margin",m.torqueMarginPct!==null?m.torqueMarginPct+"%":"—")+
 '</div></div>'+
 (report.errors.length?'<p class="tx-envelope-error">'+report.errors.map(esc).join(' · ')+'</p>':'')+
 (report.warnings.length?'<p>'+report.warnings.slice(0,3).map(esc).join(' · ')+'</p>':'');
 root.dataset.ready=String(report.ready);root.dataset.risk=String(report.stress);
 const button=root.closest?.(".transmission-lab-layout")?.querySelector?.("#authorizeTransmissionProgram");
 if(button){button.disabled=!report.ready;button.title=report.ready?"Authorize funded development":"Fix the engineering issues shown above";}
}
function enginePicker(s,d){
 const engines=Array.isArray(s?.engines)?s.engines:[];
 if(!engines.length)return'<div class="tx-target-selector"><span>ENGINE COMPATIBILITY</span><small>Release an engine first to test a specific torque match.</small></div>';
 const options=engines.map(e=>'<option value="'+esc(e.id)+'" '+(String(d?.engineTargetId||"")===String(e.id)?"selected":"")+'>'+esc(e.name||"Engine")+' · '+Math.round(n(e.stats?.torque,n(e.stats?.tq)))+' lb-ft</option>').join("");
 return '<label class="tx-target-selector" for="txEngineTarget"><span>ENGINE TORQUE MATCH</span><small>Choose a released engine to validate actual input torque; changes do not alter existing vehicles.</small><select id="txEngineTarget"><option value="">Unpaired gearbox bench test</option>'+options+'</select></label>';
}
G.MDXTransmissionEnvelope=Object.freeze({VERSION:1,evaluate,enrichQuote,render,enginePicker});
})();
