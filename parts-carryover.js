/* Motor Dynasty — checklist 771–780: lineage visualization and genuine generation parts reuse. */
(()=>{
"use strict";
const W=window,N=(x,d=0)=>x==null||x===""||!Number.isFinite(Number(x))?d:Number(x),bound=(x,a,b)=>Math.min(b,Math.max(a,N(x))),money=x=>"$"+Math.round(N(x)).toLocaleString("en-US"),escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PARTS={
 platform:{name:"Platform and floorpan",saving:.18,days:12,unit:.028,risk:2.0,asset:"platformId"},
 engine:{name:"Engine family",saving:.11,days:6,unit:.012,risk:2.6,asset:"engineId"},
 transmission:{name:"Transmission",saving:.07,days:4,unit:.007,risk:1.8,asset:"transmissionId"},
 cabin:{name:"Cabin and instrumentation",saving:.05,days:3,unit:.006,risk:1.6,asset:null}
};
const MODES={
 new:{title:"All-new design",saving:0,days:0,risk:0,quality:2},
 refine:{title:"Refine existing",saving:.50,days:.45,risk:.40,quality:1},
 retain:{title:"Carry over exact part",saving:1,days:1,risk:1,quality:0}
};
const defaults=Object.freeze({platform:"new",engine:"new",transmission:"new",cabin:"new"});
function plan(v){const p=v?.partsCarryoverPlan||{};return Object.fromEntries(Object.keys(PARTS).map(k=>[k,MODES[p[k]]?p[k]:"new"]));}
function available(v,key){
 if(key==="cabin")return true;
 const id=key==="platform"?v.platformId||v.design?.platformId:key==="engine"?v.engineId:v.transmissionId;
 return !!id;
}
function director(v){
 const age=Math.max(0,N(v?.lifecycle?.ageMonths)/12),reliability=N(v?.stats?.reliability,70),quality=N(v?.stats?.quality,70),volume=N(v?.lifetimeSales);
 const p={...defaults};
 if(available(v,"platform"))p.platform=age>8?"new":quality>=68?"refine":"new";
 if(available(v,"engine"))p.engine=reliability<65?"new":age>10?"refine":volume>8000?"retain":"refine";
 if(available(v,"transmission"))p.transmission=reliability<58?"new":"refine";
 p.cabin=age<3&&quality>75?"refine":"new";
 return{plan:p,reason:"Model age "+age.toFixed(1)+" yr · powertrain reliability "+Math.round(reliability)+"/100 · historical volume "+Math.round(volume)+" units; preserve proven components and redesign risky ones"};
}
function quote(s,v,base){
 const explicit=v?.partsCarryoverPlan&&typeof v.partsCarryoverPlan==="object",p=plan(v),originalBudget=Math.max(0,N(base?.budget)),originalDays=Math.max(1,N(base?.days,150));
 let savings=0,daysSaved=0,unitPct=0,risk=0,errors=[],lines=[];
 const age=Math.max(0,N(v?.lifecycle?.ageMonths)/12),reliability=N(v?.stats?.reliability,70);
 for(const [key,part] of Object.entries(PARTS)){
  const mode=MODES[p[key]],used=mode.saving>0;
  if(used&&!available(v,key))errors.push(part.name+" cannot carry over: no certified source component");
  if(used){
   savings+=part.saving*mode.saving;
   daysSaved+=part.days*mode.days;
   unitPct+=part.unit*mode.saving;
   risk+=part.risk*mode.risk*(1+Math.max(0,age-5)*.08+(reliability<60?.35:0));
  }
  lines.push({part:key,title:part.name,mode:p[key],budgetSaved:Math.round(originalBudget*part.saving*mode.saving),risk:Number((part.risk*mode.risk).toFixed(1))});
 }
 // Retain major OEM assembly integration savings but charge increased carryover warranty risk.
 const budget=Math.round(originalBudget*(1-bound(savings,0,.39)));
 const days=Math.max(90,Math.round(originalDays-daysSaved));
 const beforeCost=Math.max(0,N(v?.stats?.unitCost??v?.stats?.manufacturingUnitCost));
 const productionSaving=Math.round(beforeCost*bound(unitPct,0,.08));
 const qualityRisk=Math.max(0,age-8)*.08+Math.max(0,65-reliability)*.06+risk*.22;
 const warnings=[];
 if(age>=10&&savings>.18)warnings.push("High carryover on an old architecture: watch NVH, emissions, safety and warranty exposure");
 if(reliability<65&&["retain","refine"].includes(p.engine))warnings.push("Powertrain reuse inherits historical reliability weaknesses");
 const blocked=errors[0]||null;
 return{ready:!blocked,blocked,active:!!explicit,plan:p,budget,days,
 originalBudget,originalDays,developmentSaving:originalBudget-budget,daysSaved:originalDays-days,
 productionSaving,estimatedNewUnitCost:Math.max(100,beforeCost-productionSaving),riskScore:Number(risk.toFixed(1)),
 qualityRisk:Number(qualityRisk.toFixed(2)),warnings,lines};
}
function audit(state,v,action,r){
 state.carryoverAudits=Array.isArray(state.carryoverAudits)?state.carryoverAudits:[];
 const row={period:N(state.year)*12+N(state.month),year:N(state.year),nameplateId:v.nameplateId,vehicleId:v.id,generation:N(v.generation),
 sourceGeneration:action?.lifecycleSnapshot?.generation||Math.max(1,N(v.generation)-1),budgetSaving:r.developmentSaving,daysSaved:r.daysSaved,
 productionSaving:r.productionSaving,riskScore:r.riskScore,parts:r.lines.map(x=>({part:x.part,mode:x.mode}))};
 state.carryoverAudits.unshift(row);state.carryoverAudits.length=Math.min(100,state.carryoverAudits.length);
 v.carryoverHistory=Array.isArray(v.carryoverHistory)?v.carryoverHistory:[];
 v.carryoverHistory.unshift(row);v.carryoverHistory.length=Math.min(25,v.carryoverHistory.length);
 const np=(state.nameplates||[]).find(x=>x.id===v.nameplateId),g=np?.generations?.find(g=>N(g.generation)===N(v.generation));
 if(g)g.partsCarryover={...row};
 return row;
}
function complete(s,v,action){
 if(!action?.partsCarryoverSnapshot||action.partsCarryoverApplied)return null;
 const snap=action.partsCarryoverSnapshot,base={budget:snap.originalBudget,days:snap.originalDays};
 const source={...v,partsCarryoverPlan:snap.plan,lifecycle:{...v.lifecycle,ageMonths:snap.sourceAgeMonths},stats:{...v.stats,reliability:snap.sourceReliability}};
 const q=quote(s,source,base);
 // Complete only when the real successor generation was released and accepted.
 if(q.blocked)return{blocked:q.blocked};
 const st=v.stats||{},before=Math.max(100,N(st.unitCost??st.manufacturingUnitCost,1000));
 st.unitCost=Math.max(100,before-q.productionSaving);
 if(Number.isFinite(Number(st.manufacturingUnitCost)))st.manufacturingUnitCost=Math.max(100,N(st.manufacturingUnitCost)-q.productionSaving);
 const fatigue=q.qualityRisk*.09;
 st.reliability=bound(N(st.reliability,70)-fatigue,1,99);
 st.quality=bound(N(st.quality,70)+Object.values(q.plan).filter(mode=>mode==="new").length*.12-fatigue*.4,1,99);
 action.partsCarryoverApplied=true;action.partsCarryoverOutcome={beforeUnitCost:before,afterUnitCost:st.unitCost,productionSaving:q.productionSaving,qualityRisk:q.qualityRisk};
 audit(s,v,action,q);
 return action.partsCarryoverOutcome;
}
function markup(s,v){
 if(!v||v.active===false||v.productionStatus==="retired")return"";
 const p=plan(v),base=W.MDX?.modelActionBaseline?.(s,v,"generation")||{budget:0,days:150},q=quote(s,v,base),advice=director(v);
 const fields=Object.entries(PARTS).map(([key,x])=>'<label class="carry-field"><span>'+escape(x.name)+'</span><select data-carry-field="'+key+'" data-carry-id="'+escape(v.id)+'">'+
 Object.entries(MODES).map(([mode,o])=>'<option value="'+mode+'"'+(p[key]===mode?' selected':'')+(mode!=="new"&&!available(v,key)?' disabled':'')+'>'+escape(o.title)+'</option>').join("")+'</select></label>').join("");
 const metrics=[["GENERATION R&D",money(q.budget)],["DEVELOPMENT SAVING",money(q.developmentSaving)],["DAYS TO RELEASE",q.days+" d"],["BUILD COST SAVING",money(q.productionSaving)+"/car"],["REUSE RISK",q.riskScore.toFixed(1)+"/20"],["WARRANTY EXPOSURE",q.qualityRisk.toFixed(1)]];
 return'<section class="carry-studio" data-carry-panel="'+escape(v.id)+'"><div class="carry-head"><div><span class="eyebrow">CHECKLIST 776–780</span><h4>Next-Generation Parts Strategy</h4></div><button type="button" class="btn secondary" data-carry-director="'+escape(v.id)+'">AI DESIGN</button></div>'+
 '<div class="carry-grid">'+fields+'</div><div class="carry-metrics">'+metrics.map(([label,value])=>'<div><small>'+escape(label)+'</small><b>'+escape(value)+'</b></div>').join("")+'</div>'+
 (q.warnings.length?'<p class="carry-warnings">'+q.warnings.map(escape).join(" · ")+'</p>':"")+
 (q.blocked?'<p class="carry-error">'+escape(q.blocked)+'</p>':"")+
 '<p class="carry-note">Each design choice changes actual next-generation development funding and its equipment/quality consequences. Existing production and saves are preserved.</p></section>';
}
function historyMarkup(s,v){
 const np=(s.nameplates||[]).find(x=>x.id===v.nameplateId);if(!np)return"";
 const generations=(np.generations||[]).slice().sort((a,b)=>N(a.generation)-N(b.generation));
 const rows=generations.map(g=>'<div class="lineage-row" data-lineage-kind="generations"><span>GEN '+Math.max(1,N(g.generation))+' · '+Math.round(N(g.modelYear))+'</span><strong>'+N(g.cumulativeSales).toLocaleString("en-US")+' sold</strong><small>MSRP '+money(g.launchMsrp)+' → '+money(g.lastMsrp)+' · '+(g.endPeriod?"Retired":"Current")+'</small></div>').join("");
 const changes=(v.carryoverHistory||[]).slice(0,6).map(a=>'<div class="lineage-row" data-lineage-kind="engineering"><span>'+Math.round(N(a.year))+' · GEN '+N(a.generation)+'</span><strong>'+money(a.budgetSaving)+' saved</strong><small>'+a.parts.map(x=>escape(x.part)+": "+escape(x.mode)).join(" · ")+'</small></div>').join("");
 return'<section class="lineage-studio" data-lineage-id="'+escape(v.id)+'"><div class="carry-head"><div><span class="eyebrow">CHECKLIST 771–775 / NAMEPLATE ARCHIVE</span><h4>Generation History & Engineering Lineage</h4></div></div>'+
 '<div class="lineage-switch"><button type="button" data-lineage-filter="all" class="active">ALL</button><button type="button" data-lineage-filter="generations">GENERATIONS</button><button type="button" data-lineage-filter="engineering">ENGINEERING</button></div>'+
 '<div class="lineage-rows">'+rows+changes+'</div><div class="lineage-bottom">'+N(np.cumulativeSales).toLocaleString("en-US")+' historic sales · heritage '+Math.round(N(np.heritage))+'/100 · '+generations.length+' generations</div></section>';
}
function wire(root,s,{save=()=>{},rerender=()=>{},toast=()=>{},log=()=>{}}={}){
 if(!root)return;const car=id=>(s.vehicles||[]).find(v=>String(v.id)===String(id));
 root.querySelectorAll("[data-carry-field]").forEach(x=>x.addEventListener("change",()=>{
  const v=car(x.dataset.carryId),key=x.dataset.carryField;if(!v||!PARTS[key]||!MODES[x.value]||x.value!=="new"&&!available(v,key))return;
  v.partsCarryoverPlan={...plan(v),[key]:x.value};save();rerender();
 }));
 root.querySelectorAll("[data-carry-director]").forEach(x=>x.addEventListener("click",()=>{
  const v=car(x.dataset.carryDirector);if(!v)return;const a=director(v);v.partsCarryoverPlan=a.plan;
  s.carryoverDirectorAudits=Array.isArray(s.carryoverDirectorAudits)?s.carryoverDirectorAudits:[];
  s.carryoverDirectorAudits.unshift({vehicleId:v.id,period:N(s.year)*12+N(s.month),reason:a.reason,plan:{...a.plan}});
  log(v.name+" engineering director: "+a.reason);save();rerender();
 }));
 root.querySelectorAll(".lineage-studio").forEach(studio=>studio.querySelectorAll("[data-lineage-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  const mode=btn.dataset.lineageFilter;
  studio.querySelectorAll("[data-lineage-filter]").forEach(b=>b.classList.toggle("active",b===btn));
  studio.querySelectorAll("[data-lineage-kind]").forEach(x=>{x.hidden=mode!=="all"&&x.dataset.lineageKind!==mode;});
 })));
}
W.MDXPartsCarryover=Object.freeze({version:1,PARTS,MODES,plan,director,available,quote,complete,markup,historyMarkup,wire});
})();
