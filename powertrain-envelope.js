/* Motor Dynasty — engine architecture release envelope (checklist 401–500).
   Game estimates, not engineering certification. Pure review until the player authorizes.
   No migration, retroactive charge, or mutation of existing engines/saves. */
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const num=(value,fallback=0)=>value!==null&&value!==""&&Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=(value,places=1)=>Number(value.toFixed(places));
const configCyl={I2:2,I3:3,I4:4,I5:5,I6:6,V4:4,V6:6,V8:8,V10:10,V12:12,V16:16,F4:4,F6:6,VR5:5,VR6:6,W8:8,W12:12,W16:16};
const configYear={I2:1940,I3:1950,I4:1940,I5:1974,I6:1940,V4:1940,V6:1950,V8:1940,V10:1988,V12:1950,V16:1960,F4:1940,F6:1964,VR5:1991,VR6:1991,W8:2001,W12:2001,W16:2005};
const requiredResearch={
"block:aluminum":"al_block","head:sohc":"sohc","head:dohc":"dohc","valves:4":"four_valve",
"fuel:mech":"mech_inj","fuel:efi":"efi","ignition:electronic":"electronic_ignition",
"aspiration:turbo":"turbo","intercooler:true":"intercooler","cooling:high":"high_capacity_cooling",
"cooling:race":"high_capacity_cooling","crank:forged":"forged_crank","rods:forged":"forged_rods",
"pistons:forged":"forged_piston","bearings:performance":"performance_bearings"
};
function researchSet(s){
 const values=Array.isArray(s?.unlocked)?s.unlocked:[];
 return new Set(values.map(v=>typeof v==="object"?String(v.id||v.techId||""):String(v)));
}
function evaluate(s,draft,out){
 const d=draft||{},e=out||{},year=num(s?.year,1970),errors=[],warnings=[],research=researchSet(s);
 const cylinders=configCyl[d.config],bore=num(d.bore,NaN),stroke=num(d.stroke,NaN),
  rpm=num(d.redline,NaN),ratio=num(d.rodRatio,NaN),compression=num(d.compression,NaN);
 if(!cylinders)errors.push("Unknown cylinder architecture");
 else if(year<configYear[d.config])errors.push(d.config+" architecture is unavailable until "+configYear[d.config]);
 for(const [field,value] of Object.entries(d)){
  const tech=requiredResearch[field+":"+String(value)];
  if(tech&&!research.has(tech))errors.push(field+" requires completed "+tech+" research");
 }
 // The legacy builder accepts slider values; a restored draft may not. Never launch invalid arithmetic.
 for(const [label,value,low,high] of [["bore",bore,65,110],["stroke",stroke,60,115],["redline",rpm,4000,9000],["rod ratio",ratio,1.35,2.10],["compression",compression,7,13.5]]){
  if(!Number.isFinite(value)||value<low-0.00001||value>high+0.00001)errors.push("Invalid "+label+" specification");
 }
 const displacementL=Number.isFinite(bore*stroke)&&cylinders?Math.PI/4*bore*bore*stroke*cylinders/1e6:0;
 const meanPistonSpeed=Number.isFinite(stroke*rpm)?2*(stroke/1000)*rpm/60:0;
 const maxRodAngle=ratio>0?Math.asin(clamp(1/(2*ratio),0,1))*180/Math.PI:0;
 const torqueNm=num(e.tq)*1.3558179483;
 const bmepBar=displacementL>0?4*Math.PI*torqueNm/(displacementL*0.001)/100000:0;
 const octane=({regular:87,premium:93,race:100})[d.fuelGrade]||87;
 const boost=d.aspiration==="na"?0:Math.max(0,num(d.boost));
 const chargeHeat=boost*(d.intercooler?0.70:1);
 const knockLoad=(compression-8.5)*2.0+chargeHeat*.76+Math.max(0,num(d.ignitionTiming,50)-65)*.11-(octane-87)*.8;
 const vSpringLimit=num(e.springLimit,6500),bottomLimit=num(e.bottomLimit,6500),thermal=num(e.thermalMargin,55),delivery=num(e.fuelDeliveryFactor,1);
 const stress=round(clamp(
   Math.max(0,meanPistonSpeed-17)*3.1+Math.max(0,knockLoad-5)*3.6+
   Math.max(0,rpm-Math.min(vSpringLimit,bottomLimit))/125+
   Math.max(0,48-thermal)*.48+Math.max(0,.98-delivery)*95+
   Math.max(0,bmepBar-13)*1.15,0,100));
 if(meanPistonSpeed>20)warnings.push("High piston travel speed increases bearing, ring and cylinder wear");
 if(maxRodAngle>20)warnings.push("Rod geometry produces high side-thrust near mid-stroke");
 if(knockLoad>7)warnings.push("Cylinder pressure and fuel octane require knock validation");
 if(boost>0&&d.intercooler!==true&&boost>12)warnings.push("Charge heat rises sharply without an intercooler");
 if(bmepBar>19)warnings.push("High BMEP requires stronger bottom-end and combustion validation");
 if(rpm>Math.min(vSpringLimit,bottomLimit))warnings.push("Requested RPM exceeds an identified valvetrain or bottom-end limit");
 if(thermal<38)warnings.push("Sustained load has a narrow thermal margin");
 if(delivery<.95)warnings.push("Fuel delivery limits the authorized power target");
 const testDays=stress<25?0:stress<50?2:stress<75?5:9;
 const testCost=stress<25?0:Math.round((1200+stress*105)*Math.pow(1.024,year-1970));
 const measures={cylinders:cylinders||0,displacementL:round(displacementL,3),
  meanPistonSpeed:round(meanPistonSpeed,2),maxRodAngleDeg:round(maxRodAngle,1),
  brakeMeanEffectivePressureBar:round(bmepBar,1),knockLoadIndex:round(knockLoad),
  indicatedThermalMargin:round(thermal),indicatedFuelDeliveryPct:round(delivery*100),testDays,testCost};
 return {version:1,ready:errors.length===0,errors,warnings,stress,measurements:measures,
  summary:errors.length?"Technology or geometry invalid":stress>=75?"High-risk validation":stress>=50?"Extended validation":stress>=25?"Targeted validation":"Routine release review"};
}
function enrichQuote(s,draft,e,base){
 const report=evaluate(s,draft,e);if(!base||!Number.isFinite(Number(base.budget)))return base;
 // Cost / days are actually charged by the existing daily program, not taken upfront.
 const days=Math.max(1,Math.round(num(base.days,1)+report.measurements.testDays));
 const budget=Math.max(0,Math.round(num(base.budget)+report.measurements.testCost));
 return {...base,days,budget,daily:budget/days,validationReview:report};
}
function render(root,s,draft,out,quote){
 if(!root)return;const report=evaluate(s,draft,out),m=report.measurements;
 const escape=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 // Geometry: visual piston travel and rod motion at a meaningful 60-degree crank angle.
 const crank=60*Math.PI/180,stroke=num(draft?.stroke,86),rod=stroke*num(draft?.rodRatio,1.65);
 const throwRadius=stroke/2,vertical=throwRadius*Math.cos(crank)+Math.sqrt(Math.max(0,rod*rod-throwRadius*throwRadius*Math.sin(crank)**2));
 const normalized=rod+throwRadius>0?clamp(1-vertical/(rod+throwRadius),0,1):0;
 const y=24+normalized*80,x=80+throwRadius*Math.sin(crank)*.42;
 const chart='<svg viewBox="0 0 160 140" role="img" aria-label="Illustrative piston and connecting rod geometry at 60 degrees of crank rotation"><rect x="47" y="9" width="66" height="88" rx="5" fill="none" stroke="currentColor" opacity=".45"/><rect x="52" y="'+round(y,1)+'" width="56" height="15" rx="2" fill="currentColor" opacity=".8"/><path d="M80 '+round(y+13,1)+' L'+round(x,1)+' 119" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="'+round(x,1)+'" cy="119" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="80" cy="119" r="2.5" fill="currentColor"/></svg>';
 root.innerHTML='<header><span>MECHANICAL ENVELOPE</span><strong>'+escape(report.summary)+'</strong><small>'+report.stress+'/100 load-risk index · extra tests '+m.testDays+' d / $'+m.testCost.toLocaleString()+'</small></header><div class="engine-envelope-body">'+chart+'<div class="engine-envelope-metrics"><div><span>Piston speed</span><b>'+m.meanPistonSpeed+' m/s</b></div><div><span>Peak rod angle</span><b>'+m.maxRodAngleDeg+'°</b></div><div><span>BMEP</span><b>'+m.brakeMeanEffectivePressureBar+' bar</b></div><div><span>Fuel delivery</span><b>'+m.indicatedFuelDeliveryPct+'%</b></div></div></div>'+
 (report.errors.length?'<p class="engine-envelope-error">'+report.errors.map(escape).join(' · ')+'</p>':'')+
 (report.warnings.length?'<p>'+report.warnings.slice(0,3).map(escape).join(' · ')+'</p>':'');
 root.dataset.ready=String(report.ready);root.dataset.stress=String(report.stress);
}
G.MDXPowertrainEnvelope=Object.freeze({VERSION:1,evaluate,enrichQuote,render});
})();