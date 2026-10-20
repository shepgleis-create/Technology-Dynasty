/* Checklist 741–760: playable vehicle variant programs; no separate app, no removed legacy trims. */
(()=>{
"use strict";
const W=window;
const n=(v,f=0)=>v==null||v===""||!Number.isFinite(Number(v))?f:Number(v);
const lim=(v,a,b)=>Math.max(a,Math.min(b,n(v)));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>"$"+Math.round(n(v)).toLocaleString("en-US");
const kindDefs={
 special:{label:"Limited special edition",year:1940,research:62000,days:28,defaultUnits:400,price:.16,cost:.075,appeal:1.07,role:"luxury",quality:2,comfort:2,performance:1,desc:"Limited run, premium finish and measurable collector scarcity"},
 performance:{label:"Performance variant",year:1940,research:125000,days:55,defaultUnits:600,price:.20,cost:.125,appeal:1.08,role:"performance",quality:1,comfort:-2,performance:8,desc:"Sport suspension, tire and powertrain configuration"},
 regional:{label:"Regional variant",year:1940,research:48000,days:30,defaultUnits:900,price:.035,cost:.03,appeal:1.035,role:"mid",quality:1,comfort:1,performance:0,desc:"Region-specific equipment and inventory allocation"},
 fleet:{label:"Commercial / fleet variant",year:1940,research:35000,days:22,defaultUnits:1500,price:-.10,cost:-.06,appeal:.95,role:"fleet",quality:0,comfort:-2,performance:-1,desc:"Durable simplified equipment at volume-contract pricing"}
};
const active=v=>v?.active!==false&&v?.productionStatus==="production"&&v?.productionEnabled!==false;
const regions=state=>(state?.marketSystem?.regions||[]).filter(r=>r.unlocked!==false&&r.id).map(r=>({id:String(r.id),name:String(r.name||r.id)}));
function draft(v){
 const d=v?.variantDraft||{};
 return{kind:kindDefs[d.kind]?d.kind:"special",name:String(d.name||"").slice(0,48),limitedUnits:Math.round(lim(d.limitedUnits??400,100,10000)),
 region:String(d.region||"all"),priceAdj:lim(d.priceAdj,-10,20),monthlyCap:Math.round(lim(d.monthlyCap??200,20,2000)),engineId:d.engineId||v?.engineId||null};
}
function quote(state,v,raw={}){
 const d={...draft(v),...raw},kind=kindDefs[d.kind]||kindDefs.special,year=n(state?.year,1970),priceAdj=lim(d.priceAdj,-10,20)/100,
 qty=Math.round(lim(d.limitedUnits,100,10000)),monthly=Math.min(qty,Math.round(lim(d.monthlyCap,20,2000))),
 baseCost=Math.max(1,n(v?.stats?.unitCost??v?.stats?.manufacturingUnitCost,1)),basePrice=Math.max(1,n(v?.msrp,1)),
 region=String(d.region||"all"),validRegion=region==="all"||regions(state).some(x=>x.id===region),
 selectedEngine=kind.role==="performance"?(state?.engines||[]).find(e=>String(e.id)===String(d.engineId||v?.engineId)&&!["development","cancelled","failed","prototype"].includes(String(e.status||"released"))):null,
 baseEngine=(state?.engines||[]).find(e=>String(e.id)===String(v?.engineId)),
 engineBonus=kind.role==="performance"&&selectedEngine&&baseEngine?Math.max(0,n(selectedEngine.stats?.hp)-n(baseEngine.stats?.hp)):0,
 engineCost=kind.role==="performance"&&selectedEngine&&baseEngine?Math.max(0,n(selectedEngine.stats?.cost)-n(baseEngine.stats?.cost)):0,
 configurationCostPct=d.kind==="special"?.014:d.kind==="performance"?.030:d.kind==="fleet"?.004:0,
 configurationPricePct=d.kind==="special"?.025:d.kind==="performance"?.055:d.kind==="fleet"?.010:0,
 enginePricePct=kind.role==="performance"&&selectedEngine&&baseEngine&&selectedEngine.id!==baseEngine.id?engineCost*1.7/basePrice+lim(engineBonus/1400,-.03,.08):0,
 extraCost=baseCost*(kind.cost+configurationCostPct)+engineCost,priceDelta=kind.price+priceAdj,
 unitPrice=basePrice*(1+priceDelta+configurationPricePct+enginePricePct),unitCost=baseCost+extraCost,
 inflation=lim(Math.pow(1.027,year-1970),.20,5),days=Math.round(kind.days/Math.max(.62,n(W.MDX?.engineeringSpeed?.(state),1))),
 tooling=Math.round((kind.research+Math.min(10000,qty)*baseCost*.48)*inflation),
 unitMargin=unitPrice-unitCost,committed=Math.round(tooling),prior=(v?.variantPrograms||[]).filter(p=>p.status==="development").length;
 const warnings=[];
 if(d.kind==="regional"&&region==="all")warnings.push("Select a specific open market region to reserve regional allocation");
 if(kind.role==="performance"&&!selectedEngine)warnings.push("Performance edition needs an available engine");
 if(kind.role==="performance"&&engineBonus===0)warnings.push("Performance gain relies on chassis tuning; select a released higher-output engine for engine gains");
 if(unitMargin<unitCost*.12)warnings.push("Low unit margin creates a warranty and sales risk");
 if(qty<monthly)warnings.push("Monthly cap exceeds edition lifetime quota");
 const blocked=!active(v)?"Vehicle must be in active production":year<kind.year?"Technology not available until "+kind.year:
 (state?.variantPrograms||[]).some(p=>p.vehicleId===v?.id&&p.status==="development")?"Variant engineering already underway":
 !validRegion||d.kind==="regional"&&region==="all"?"Select an available regional market":
 kind.role==="performance"&&!selectedEngine?"Select a released engine first":
 prior>0?"Only one variant can be developed per model at a time":
 n(state?.cash)<Math.min(committed*.1,committed)?"Insufficient available R&D cash":
 unitPrice<=unitCost?"Variant would sell below cost":null;
 return{ready:!blocked,blocked,warnings,draft:{kind:d.kind,name:String(d.name||"").trim().slice(0,48),limitedUnits:qty,monthlyCap:monthly,region,priceAdj:lim(d.priceAdj,-10,20),engineId:d.engineId||v?.engineId||null},days,budget:committed,advanceCash:Math.round(committed*.10),
 unitCost:Math.round(unitCost),unitPrice:Math.round(unitPrice),unitMargin:Math.round(unitMargin),
 priceDeltaPct:priceDelta,costDeltaPct:kind.cost,configurationCostPct,configurationPricePct,enginePricePct,engineBonus,engineCost,
 productionCeiling:qty,monthlyCap:monthly,kind};
}
function suggest(state,v){
 const segment=String(v?.target||v?.stats?.className||"").toLowerCase(),gross=n(v?.msrp)-n(v?.stats?.unitCost),strength=gross/Math.max(1,n(v?.msrp)),
 kind=/track|sport/.test(segment)?"performance":/budget|utility/.test(segment)?"fleet":n(v?.lifetimeSales)>10000?"special":"regional",
 region=regions(state)[0]?.id||"all",reason=/track|sport/.test(segment)?"Sport buyers support a higher-output and chassis-focused edition":/budget|utility/.test(segment)?"Simplified fleet spec improves fleet unit economics":kind==="special"?"Established model can support a scarce special edition":"Newer nameplate can test a regional allocation";
 return{kind,region,limitedUnits:kind==="special"?300:kind==="fleet"?1500:650,monthlyCap:kind==="special"?80:kind==="fleet"?250:130,
 priceAdj:strength<.14?3:0,name:(v?.name||"Model")+" "+(kind==="special"?"Limited":kind==="performance"?"Sport":kind==="regional"?"Region": "Fleet"),reason};
}
function add(state,v,raw){
 const q=quote(state,v,raw);if(!q.ready)return{ok:false,reason:q.blocked};
 state.variantPrograms=Array.isArray(state.variantPrograms)?state.variantPrograms:[];
 const index=state.variantPrograms.length+1,p={id:"variant_"+n(state.year)+"_"+n(state.month)+"_"+index,vehicleId:v.id,
 name:q.draft.name||v.name+" "+q.kind.label,kind:q.draft.kind,status:"development",year:n(state.year),month:n(state.month),
 totalDays:q.days,daysRemaining:q.days,spent:0,budget:q.budget,dailySpend:q.budget/Math.max(1,q.days),draft:q.draft,
 summary:{unitCost:q.unitCost,unitPrice:q.unitPrice,unitMargin:q.unitMargin,priceDeltaPct:q.priceDeltaPct,
 costDeltaPct:q.costDeltaPct,configurationCostPct:q.configurationCostPct,configurationPricePct:q.configurationPricePct,enginePricePct:q.enginePricePct,engineCost:q.engineCost,engineBonus:q.engineBonus},warnings:q.warnings,vehicleGeneration:n(v.generation,1)};
 state.variantPrograms.push(p);
 v.variantPrograms=Array.isArray(v.variantPrograms)?v.variantPrograms:[];
 v.variantPrograms.push(p.id);
 log(state,v,"development_authorized",p);
 return{ok:true,program:p,quote:q};
}
function log(state,v,event,p){
 state.variantAudit=Array.isArray(state.variantAudit)?state.variantAudit:[];
 state.variantAudit.unshift({period:n(state.year)*12+n(state.month),year:n(state.year),vehicleId:v.id,
 name:String(v.name),event,programId:p?.id||null,kind:p?.kind||null,cash:n(state.cash),
 spent:n(p?.spent),budget:n(p?.budget),remaining:n(p?.daysRemaining)});
 if(state.variantAudit.length>160)state.variantAudit.length=160;
}
function release(state,v,p){
 if(p.status!=="development")return false;
 v.trims=Array.isArray(v.trims)?v.trims:[];
 const kind=kindDefs[p.kind],baseCost=Math.max(1,n(v?.stats?.unitCost,1)),opts=p.draft;
 const t={id:"trim_"+p.id,name:p.name,role:kind.role,variantKind:p.kind,variantProgramId:p.id,
 active:true,priceDeltaPct:n(p.summary.priceDeltaPct),costDeltaPct:n(p.summary.costDeltaPct),configCostPct:n(p.summary.configurationCostPct)+n(p.summary.engineCost)/baseCost,configPricePct:n(p.summary.configurationPricePct)+n(p.summary.enginePricePct),configAppeal:1,
 targetMix:p.kind==="special"?8:p.kind==="performance"?13:p.kind==="regional"?12:18,
 appeal:kind.appeal,qualityDelta:kind.quality,performanceDelta:kind.performance+Math.min(12,n(p.summary.engineBonus)/20),
 comfortDelta:kind.comfort,engineId:opts.engineId||v.engineId,transmissionId:v.transmissionId,
 interiorGrade:p.kind==="special"?"premium":p.kind==="fleet"?"value":"standard",
 suspensionTune:p.kind==="performance"?"sport":p.kind==="fleet"?"heavy":"balanced",
 wheelPackage:p.kind==="performance"?"performance":"standard",technologyLevel:"standard",equipmentLevel:"standard",
 limitedUnits:opts.limitedUnits,maxMonthlyUnits:opts.monthlyCap,regionId:opts.region||"all",lifetimeProduced:0,lastMonthProduced:0,
 lifetimeSales:0,lastMonthSales:0,editionStartYear:n(state.year),editionEndStatus:"available"};
 v.trims.push(t);p.trimId=t.id;p.status="released";p.completedPeriod=n(state.year)*12+n(state.month);
 p.initialProductionBudget=p.budget;
 if(W.MDXProductLifecycle?.ensureVehicle)W.MDXProductLifecycle.ensureVehicle(state,v);
 log(state,v,"variant_released",p);
 return true;
}
function processDay(state,notice=()=>{}){
 state.variantPrograms=Array.isArray(state.variantPrograms)?state.variantPrograms:[];
 let spent=0,released=0,paused=0;
 for(const p of state.variantPrograms){
  if(p.status!=="development")continue;
  const v=(state.vehicles||[]).find(x=>x.id===p.vehicleId);
  if(!v||v.productionStatus==="retired"){p.status="cancelled";p.stopReason="model_retired";continue;}
  const remaining=Math.max(0,n(p.budget)-n(p.spent)),cost=Math.min(n(p.dailySpend),remaining);
  if(n(state.cash)<cost){p.haltedForCash=true;paused++;continue;}
  p.haltedForCash=false;state.cash-=cost;p.spent=n(p.spent)+cost;spent+=cost;
  p.daysRemaining=Math.max(0,n(p.daysRemaining)-1);
  if(p.daysRemaining===0){p.status="ready_to_release";p.totalSpent=p.spent;
   if(releaseFromReady(state,v,p)){released++;notice("Released "+p.name+" as a real selectable variant with "+p.draft.limitedUnits+" lifetime units.");}}
 }
 return{spent,released,paused};
}
function releaseFromReady(state,v,p){if(p.status!=="ready_to_release")return false;p.status="development";return release(state,v,p);}
function allocateProduction(state,v){
 const p=n(state.year)*12+n(state.month);if(v.variantProductionLastPeriod===p)return;
 v.variantProductionLastPeriod=p;const produced=Math.max(0,Math.round(n(v.lastMonthProduced,v.mtdProduced||0)));
 const limited=(v.trims||[]).filter(t=>t.active!==false&&t.variantProgramId&&n(t.lifetimeProduced)<n(t.limitedUnits));
 const basis=Math.max(1,(v.trims||[]).filter(t=>t.active!==false).reduce((a,t)=>a+Math.max(0,n(t.targetMix)),0));
 let available=produced;
 for(const t of limited){const limit=Math.min(Math.max(0,n(t.limitedUnits)-n(t.lifetimeProduced)),Math.max(0,n(t.maxMonthlyUnits,2000))),w=Math.max(0,n(t.targetMix))/basis;
  const count=Math.min(available,limit,Math.max(0,Math.round(produced*w)));
  t.lastMonthProduced=count;t.lifetimeProduced=n(t.lifetimeProduced)+count;available-=count;
 }
 for(const t of (v.trims||[]).filter(t=>t.variantProgramId&&!limited.includes(t)))t.lastMonthProduced=0;
}
function regionalCap(state,v,t){if(t.regionId==="all")return Infinity;
 const r=(state?.marketSystem?.regions||[]).find(x=>String(x.id)===String(t.regionId));if(!r||r.unlocked===false)return 0;
 const sample=r.mtdSales?.[v.id]??r.sales?.[v.id];return Number.isFinite(Number(sample))?Math.max(0,Math.round(Number(sample))):0;
}
function allocation(sales,trims,weight,normal,state,v){
 if(!trims.some(t=>t.variantProgramId))return normal(sales,trims,weight);
 let pending=Math.max(0,Math.floor(n(sales))),ans=trims.map(t=>({row:t,units:0})),eligible=ans.filter(x=>x.row.active!==false),loop=0;
 while(pending>0&&eligible.length&&loop++<20){
  const usable=eligible.filter(x=>!x.row.limitedUnits||x.units<Math.max(0,n(x.row.limitedUnits)-n(x.row.lifetimeSales))&&x.units<n(x.row.maxMonthlyUnits,Infinity));
  if(!usable.length)break;
  const proposed=normal(pending,usable.map(x=>x.row),weight);
  let added=0;
  for(const q of proposed){
   const item=usable.find(x=>x.row===q.row);if(!item)continue;
   const life=item.row.limitedUnits?Math.max(0,n(item.row.limitedUnits)-n(item.row.lifetimeSales)-item.units):Infinity;
   const monthly=item.row.variantProgramId?Math.max(0,n(item.row.maxMonthlyUnits,Infinity)-item.units):Infinity;
   const stock=item.row.variantProgramId?Math.max(0,n(item.row.lifetimeProduced)-n(item.row.lifetimeSales)-item.units):Infinity;
   const region=item.row.variantProgramId?Math.max(0,regionalCap(state,v,item.row)-item.units):Infinity;
   const count=Math.min(q.units,life,monthly,stock,region);
   if(count>0){item.units+=count;added+=count;}
  }
  if(!added)break;pending-=added;
 }
 if(pending>0){
  const regular=ans.filter(x=>!x.row.variantProgramId);
  if(regular.length){const more=normal(pending,regular.map(x=>x.row),weight);for(const x of more){const row=regular.find(v=>v.row===x.row);if(row)row.units+=x.units;}pending=0;}
 }
 return ans;
}
function month(state,v,alloc){
 const released=(v.trims||[]).filter(t=>t.variantProgramId);
 if(!released.length)return null;
 let units=0;for(const t of released){
  if(t.limitedUnits&&n(t.lifetimeSales)>=n(t.limitedUnits))t.editionEndStatus="sold_out";
  if(!t.variantHistory)t.variantHistory=[];
  t.variantHistory.push({period:n(state.year)*12+n(state.month),units:n(t.lastMonthSales),lifetime:n(t.lifetimeSales),remaining:Math.max(0,n(t.limitedUnits)-n(t.lifetimeSales))});
  if(t.variantHistory.length>36)t.variantHistory.splice(0,t.variantHistory.length-36);
  units+=n(t.lastMonthSales);
 }
 return{units};
}
function html(state,v){
 if(!active(v))return"";
 const d=draft(v),q=quote(state,v,d),p=(state.variantPrograms||[]).find(x=>x.vehicleId===v.id&&x.status==="development");
 const select=(name,attr,options)=>'<label class="variant-field"><small>'+name+'</small><select data-variant-field="'+attr+'" data-variant-car="'+esc(v.id)+'">'+options.map(o=>'<option value="'+esc(o.id)+'" '+(String(d[attr])===String(o.id)?"selected":"")+'>'+esc(o.name)+'</option>').join("")+'</select></label>';
 const chosen=(v.trims||[]).filter(x=>x.variantProgramId);
 return'<section class="variant-studio"><div class="variant-head"><div><span class="eyebrow">CHECKLIST 741–760 / ACTIVE MODEL</span><h4>Special Editions & Variants</h4></div><button type="button" class="btn secondary" data-variant-auto="'+esc(v.id)+'">AI PLAN</button></div>'+
 '<div class="variant-grid">'+select("EDITION TYPE","kind",Object.entries(kindDefs).map(([id,x])=>({id,name:x.label})))+
 '<label class="variant-field"><small>EDITION NAME</small><input data-variant-field="name" data-variant-car="'+esc(v.id)+'" value="'+esc(d.name)+'" maxlength="48" placeholder="New edition name"></label>'+
 '<label class="variant-field"><small>LIFETIME BUILD LIMIT</small><input type="number" min="100" max="10000" step="100" data-variant-field="limitedUnits" data-variant-car="'+esc(v.id)+'" value="'+d.limitedUnits+'"></label>'+
 '<label class="variant-field"><small>MONTHLY SUPPLY CAP</small><input type="number" min="20" max="2000" step="10" data-variant-field="monthlyCap" data-variant-car="'+esc(v.id)+'" value="'+d.monthlyCap+'"></label>'+
 select("SALE REGION","region",[{id:"all",name:"All enabled markets"},...regions(state)])+
 (d.kind==="performance"?select("RELEASED ENGINE","engineId",(state.engines||[]).filter(e=>e.id&&e.stats&&e.status!=="development").map(e=>({id:e.id,name:String(e.name||e.id)+" · "+Math.round(n(e.stats.hp))+" hp"}))):"")+
 '<label class="variant-field"><small>PRICE ADJUSTMENT (%)</small><input type="number" min="-10" max="20" step="1" data-variant-field="priceAdj" data-variant-car="'+esc(v.id)+'" value="'+d.priceAdj+'"></label></div>'+
 '<div class="variant-metrics"><div><small>R&D / TOOLING</small><strong>'+money(q.budget)+'</strong></div><div><small>DEVELOPMENT DAYS</small><strong>'+q.days+'</strong></div><div><small>UNIT SELLING PRICE</small><strong>'+money(q.unitPrice)+'</strong></div><div><small>UNIT COST</small><strong>'+money(q.unitCost)+'</strong></div><div><small>CONTRIBUTION/UNIT</small><strong>'+money(q.unitMargin)+'</strong></div><div><small>ENGINE DELTA</small><strong>+'+Math.round(q.engineBonus)+' hp</strong></div></div>'+
 (q.warnings.length?'<p class="variant-warnings">'+q.warnings.map(esc).join(" • ")+'</p>':"")+
 (q.blocked?'<p class="variant-blocked">'+esc(q.blocked)+'</p>':"")+
 '<button type="button" class="btn hero variant-authorize" data-variant-start="'+esc(v.id)+'" '+(q.ready&&!p?"":"disabled")+'>FUND VARIANT PROGRAM</button>'+
 (p?'<p class="variant-process">Engineering: '+esc(p.name)+' • '+p.daysRemaining+' days remaining / '+money(p.spent)+' spent</p>':"")+
 (chosen.length?'<div class="variant-existing"><b>Released variants</b>'+chosen.map(t=>'<p>'+esc(t.name)+' · '+n(t.lifetimeSales).toLocaleString()+' / '+n(t.limitedUnits).toLocaleString()+' units sold · '+esc(t.editionEndStatus||"available")+'</p>').join("")+'</div>':"")+'</section>';
}
function wire(root,state,{save=()=>{},rerender=()=>{},logEvent=()=>{},toast=()=>{}}={}){
 if(!root)return;
 const find=id=>(state.vehicles||[]).find(v=>String(v.id)===String(id));
 root.querySelectorAll("[data-variant-field]").forEach(el=>el.addEventListener("change",()=>{
  const v=find(el.dataset.variantCar),key=el.dataset.variantField;if(!v||!["kind","name","limitedUnits","monthlyCap","region","priceAdj","engineId"].includes(key))return;
  v.variantDraft={...draft(v),[key]:["limitedUnits","monthlyCap","priceAdj"].includes(key)?Number(el.value):el.value};
  save();rerender();
 }));
 root.querySelectorAll("[data-variant-auto]").forEach(b=>b.addEventListener("click",()=>{
  const v=find(b.dataset.variantAuto);if(!v)return;const proposed=suggest(state,v);v.variantDraft={...draft(v),...proposed};
  state.variantDirectorAudits=Array.isArray(state.variantDirectorAudits)?state.variantDirectorAudits:[];
  state.variantDirectorAudits.unshift({year:state.year,vehicleId:v.id,proposed:{...v.variantDraft},reason:proposed.reason});
  logEvent("Product director proposes "+proposed.kind+" edition: "+proposed.reason);save();rerender();
 }));
 root.querySelectorAll("[data-variant-start]").forEach(b=>b.addEventListener("click",()=>{
  const v=find(b.dataset.variantStart);if(!v)return;
  const result=add(state,v,draft(v));
  if(!result.ok){toast(result.reason);return;}
  logEvent("Funded "+result.program.name+": "+money(result.program.budget)+" R&D, "+result.program.totalDays+" days; production remains active.");
  save();rerender();
 }));
}
W.MDXVariants=Object.freeze({version:1,kindDefs,draft,quote,suggest,add,processDay,allocateProduction,allocation,month,html,wire});
})();