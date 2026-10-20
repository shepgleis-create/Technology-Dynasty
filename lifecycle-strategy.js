/* Motor Dynasty — lifecycle program planner, integrated with existing model actions.
   Does not create parallel game state or move players to another application. */
(()=>{
"use strict";
const W=typeof window==="object"?window:globalThis;
const n=(value,fallback=0)=>value==null||value===""||!Number.isFinite(Number(value))?fallback:Number(value);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,n(v)));
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=value=>"$"+Math.round(n(value)).toLocaleString("en-US");
const types={modelyear:{name:"Annual update",maxDays:45,description:"Equipment and price refresh; preserve the generation"},facelift:{name:"Midcycle facelift",maxDays:120,description:"Restyle and improve the current generation"},generation:{name:"New generation",maxDays:180,description:"Fund the next complete generation while sales continue"}};
const packages={
 carry:{name:"Carry over",from:1900,cost:0,research:0,days:0,comfort:0,luxury:0,safety:0,handling:0,reliability:0,quality:0,desc:"Keep existing specification"},
 value:{name:"Value engineering",from:1940,cost:-85,research:4500,days:2,comfort:-1,luxury:-1,safety:0,handling:0,reliability:0,quality:0,desc:"Simpler finish; better affordability"},
 comfort:{name:"Comfort package",from:1940,cost:240,research:12500,days:3,comfort:3,luxury:1,safety:0,handling:0,reliability:0,quality:1,desc:"Seats and cabin isolation"},
 sport:{name:"Sport package",from:1955,cost:380,research:20500,days:5,comfort:-1,luxury:1,safety:0,handling:3,reliability:0,quality:1,desc:"Supportive seating and suspension tuning"},
 safety:{name:"Safety upgrade",from:1965,cost:440,research:36000,days:6,comfort:0,luxury:0,safety:3,handling:0,reliability:.5,quality:1,desc:"Impact protection and validation"},
 technology:{name:"Technology upgrade",from:1980,cost:620,research:58000,days:9,comfort:1,luxury:3,safety:1,handling:0,reliability:-.5,quality:2,desc:"More electronics and software validation"},
 premium:{name:"Premium equipment",from:1950,cost:740,research:38000,days:6,comfort:2,luxury:5,safety:0,handling:0,reliability:0,quality:2,desc:"Premium upholstery and finish"}
};
const neutral=Object.freeze({type:"modelyear",equipment:"carry",priceAimPct:0,qualityTarget:50});
function plan(vehicle){
 const raw=vehicle?.lifecycleStrategy&&typeof vehicle.lifecycleStrategy==="object"?vehicle.lifecycleStrategy:{};
 return {type:types[raw.type]?raw.type:neutral.type,equipment:packages[raw.equipment]?raw.equipment:neutral.equipment,
 priceAimPct:clamp(raw.priceAimPct,-8,12),qualityTarget:clamp(raw.qualityTarget??neutral.qualityTarget,35,90)};
}
function quote(state,vehicle,type,base){
 const p=plan(vehicle),kind=types[type]||types.modelyear,year=n(state?.year,1970),pkg=packages[p.equipment]||packages.carry;
 const enabled=year>=pkg.from;
 const target=enabled?pkg:packages.carry;
 const qualityChange=p.qualityTarget-50,stageFactor=type==="generation"?1.65:type==="facelift"?1.15:1;
 const baseBudget=Math.max(0,n(base?.budget)),baseDays=Math.max(1,n(base?.days,30));
 const extra=Math.max(0,Math.round((target.research*stageFactor+Math.abs(qualityChange)*1500)*Math.max(.18,Math.pow(1.027,year-1970))));
 const additionalDays=Math.max(0,Math.round((target.days+Math.max(0,qualityChange)/8)*(type==="generation"?1.2:1)));
 const budget=Math.round(baseBudget+extra),days=Math.min(kind.maxDays,Math.ceil(baseDays+additionalDays));
 const active=vehicle?.active!==false&&vehicle?.productionStatus!=="retired"&&vehicle?.productionStatus!=="discontinued";
 const blocked=base?.blocked||(!active?"Model is discontinued — use Production Restart first":(state?.modelActions||[]).some(a=>a.vehicleId===vehicle?.id&&["active","awaiting_launch"].includes(a.status))?"Another model program is already active":!enabled?pkg.name+" requires "+pkg.from+" or later":n(state?.cash)<budget*.08?"Insufficient initial development funding":null);
 const unitCostDelta=Math.round(target.cost+(qualityChange>0?qualityChange*9:qualityChange*4));
 const pricingPct=p.priceAimPct/100;
 const beforeMsrp=Math.max(0,n(vehicle?.msrp)),beforeUnit=Math.max(0,n(vehicle?.stats?.unitCost??vehicle?.stats?.manufacturingUnitCost));
 const effectiveNewCost=Math.max(100,beforeUnit+unitCostDelta);
 const indicativeMsrp=Math.max(effectiveNewCost*1.12,beforeMsrp*(1+pricingPct+(type==="generation"?.06:type==="facelift"?.03:.015)));
 const estimatedMargin=Math.round(indicativeMsrp-effectiveNewCost);
 const warnings=[];
 if(!enabled)warnings.push("Selected equipment is not available in "+year);
 if(pricingPct<0&&indicativeMsrp>beforeMsrp)warnings.push("Cost floor may override a requested price reduction");
 if(estimatedMargin<effectiveNewCost*.12)warnings.push("Thin contribution margin");
 if(additionalDays+baseDays>kind.maxDays)warnings.push("Program schedule capped at "+kind.maxDays+" days");
 if(p.equipment==="technology"&&year<1990)warnings.push("Early vehicle electronics increase validation risk");
 if(p.qualityTarget<45)warnings.push("Low quality target increases future warranty risk");
 return{type,budget,days,baseBudget,baseDays,extraResearch:extra,unitCostDelta,estimatedMargin,indicativeMsrp:Math.round(indicativeMsrp/50)*50,minimumCash:Math.round(budget*.08),plan:{...p,type,equipment:enabled?p.equipment:"carry",programBudget:budget},warnings,blocked,ready:!blocked,equipment:target,qualityChange};
}
function evaluateDirector(state,vehicle){
 const year=n(state?.year,1970),age=Math.max(0,n(vehicle?.lifecycle?.ageMonths)),freshness=n(vehicle?.lifecycle?.freshness,75),moneyAvailable=n(state?.cash),unit=n(vehicle?.stats?.unitCost,6000),msrp=n(vehicle?.msrp,9000),sales=n(vehicle?.lastMonthSales),retired=vehicle?.active===false||vehicle?.productionStatus==="retired";
 if(retired)return{type:"modelyear",equipment:"carry",priceAimPct:0,qualityTarget:50,reason:"Retired vehicle: assess factory retooling and a restart before launching an update",risk:"high"};
 const typescore=age>=80||freshness<31?"generation":age>=37||freshness<58?"facelift":"modelyear";
 const segment=String(vehicle?.target||vehicle?.stats?.className||"").toLowerCase();
 let equipment=/luxury|premium/.test(segment)?"premium":/sport|track/.test(segment)?"sport":/family/.test(segment)?"comfort":/utility|off-road/.test(segment)?"safety":"value";
 if(packages[equipment].from>year)equipment="comfort";
 if(typescore==="modelyear"&&moneyAvailable<unit*30)equipment="carry";
 const margin=(msrp-unit)/Math.max(1,msrp),priceAimPct=margin<.18?5:sales<80?-2:2;
 const qualityTarget=clamp(Math.round(56+(n(vehicle?.stats?.reliability,75)<65?12:0)+(n(vehicle?.customerSatisfaction,70)<60?8:0)),35,90);
 return{type:typescore,equipment,priceAimPct,qualityTarget,reason:"Product age "+Math.round(age/12*10)/10+" years, freshness "+Math.round(freshness)+"/100, prior sales "+Math.round(sales)+"/month and "+Math.round(margin*100)+"% gross margin",risk:moneyAvailable<unit*80?"funding constrained":"normal"};
}
function record(state,vehicle,event,details){
 const row={period:n(state?.year,1970)*12+n(state?.month),year:n(state?.year),vehicleId:vehicle.id,model:String(vehicle?.name||""),event,details:JSON.parse(JSON.stringify(details||{}))};
 state.lifecycleStudioAudits=Array.isArray(state.lifecycleStudioAudits)?state.lifecycleStudioAudits:[];
 state.lifecycleStudioAudits.unshift(row);state.lifecycleStudioAudits.length=Math.min(180,state.lifecycleStudioAudits.length);
 vehicle.lifecycleStudioHistory=Array.isArray(vehicle.lifecycleStudioHistory)?vehicle.lifecycleStudioHistory:[];
 vehicle.lifecycleStudioHistory.unshift(row);vehicle.lifecycleStudioHistory.length=Math.min(18,vehicle.lifecycleStudioHistory.length);
 return row;
}
function complete(state,vehicle,type,action){
 const p=action?.lifecycleStrategy;if(!p||!packages[p.equipment])return null;
 // The base lifecycle completion has already applied a market-aware MSRP update.
 // This is the incremental, approved program strategy; never apply it twice.
 if(action.lifecycleStrategyApplied)return null;
 const pkg=packages[p.equipment],change=clamp(p.qualityTarget,35,90)-50;
 const v=vehicle.stats||{},prev={msrp:n(vehicle.msrp),unitCost:n(v.unitCost??v.manufacturingUnitCost),comfort:n(v.comfort),luxury:n(v.luxury),safety:n(v.safety),handling:n(v.handling),reliability:n(v.reliability),quality:n(v.quality)};
 const costDelta=Math.round(pkg.cost+(change>0?change*9:change*4));
 const freshCost=Math.max(100,prev.unitCost+costDelta);
 v.unitCost=freshCost;if(Number.isFinite(Number(v.manufacturingUnitCost)))v.manufacturingUnitCost=Math.max(100,n(v.manufacturingUnitCost)+costDelta);
 const score=(a,x)=>clamp(n(a,60)+x,1,99);
 v.comfort=score(v.comfort,pkg.comfort);v.luxury=score(v.luxury,pkg.luxury);v.safety=score(v.safety,pkg.safety);v.handling=score(v.handling,pkg.handling);
 v.reliability=score(v.reliability,pkg.reliability+change*.09);v.quality=score(v.quality,pkg.quality+change*.12);
 const autoMsrp=n(vehicle.msrp),proposed=autoMsrp*(1+clamp(p.priceAimPct,-8,12)/100),floor=freshCost*1.12;
 vehicle.msrp=Math.round(Math.max(floor,proposed)/50)*50;
 if(vehicle.design&&typeof vehicle.design==="object")vehicle.design.msrp=vehicle.msrp;
 if(vehicle.lastLifecyclePriceChange){vehicle.lastLifecyclePriceChange.strategyApplied=true;vehicle.lastLifecyclePriceChange.after=vehicle.msrp;vehicle.lastLifecyclePriceChange.changePct=(vehicle.msrp/Math.max(1,vehicle.lastLifecyclePriceChange.before))-1;}
 if(vehicle.lifecycle&&typeof vehicle.lifecycle==="object")vehicle.lifecycle.lastStudioProgram={type,year:n(state.year),equipment:p.equipment,qualityTarget:p.qualityTarget,priceAimPct:p.priceAimPct};
 action.lifecycleStrategyApplied=true;action.lifecycleStrategyOutcome={previous:prev,after:{msrp:vehicle.msrp,unitCost:v.unitCost,comfort:v.comfort,luxury:v.luxury,safety:v.safety,handling:v.handling,reliability:v.reliability,quality:v.quality}};
 record(state,vehicle,"completed_"+type,{plan:p,before:prev,after:action.lifecycleStrategyOutcome.after,spent:n(action.spent),budget:n(action.budget)});
 return action.lifecycleStrategyOutcome;
}
function restartQuote(state,v){
 const active=v?.active!==false&&!["retired","discontinued","archived"].includes(String(v?.productionStatus||""));
 const rows=Array.isArray(state?.operations?.factories)?state.operations.factories:Array.isArray(state?.factories)?state.factories:[];
 const usable=rows.filter(f=>f.active!==false&&f.status!=="closed").length;
 const unit=Math.max(100,n(v?.stats?.unitCost||v?.stats?.manufacturingUnitCost||v?.stats?.cost,1000));
 const age=Math.max(0,n(state?.year)-n(v?.discontinuedYear||v?.modelYear||state?.year));
 const tooling=Math.round(unit*(6+Math.min(30,age*2))),days=Math.round(14+Math.min(90,age*5)+(usable?0:30));
 const blocked=active?"Vehicle already producing":!usable?"No operational factory available":n(state?.cash)<tooling?"Insufficient cash for tooling":null;
 return{tooling,days,factories:usable,age,ready:!blocked,blocked,inventory:n(v?.inventory),currentGeneration:n(v?.generation,1)};
}
function retiredMarkup(state,v,asMoney){
 const q=restartQuote(state,v);
 return'<section class="ls-panel ls-retired" data-ls-panel="'+escape(v.id)+'"><div class="ls-heading"><div><span class="eyebrow">ARCHIVED NAMEPLATE / PRODUCTION RESTART</span><h4>Restart the existing '+escape(v.name)+'</h4></div></div>'+
 '<p class="ls-ai-reason">This reopens the same generation and engineering specification. Unsold inventory remains saleable; tooling is funded now, and production restarts after factory validation.</p>'+
 '<div class="ls-metrics"><div><small>RETOOLING COST</small><b>'+escape(asMoney(q.tooling))+'</b></div><div><small>FACTORY READINESS</small><b>'+q.factories+' active</b></div><div><small>CALENDAR DAYS</small><b>'+q.days+'</b></div><div><small>AVAILABLE STOCK</small><b>'+q.inventory.toLocaleString()+'</b></div><div><small>MODEL GENERATION</small><b>Gen '+q.currentGeneration+'</b></div><div><small>DISCONTINUED AGE</small><b>'+q.age+' yr</b></div></div>'+
 (q.blocked?'<p class="ls-error">'+escape(q.blocked)+'</p>':'')+
 '<div class="ls-actions"><button class="btn hero" type="button" data-ls-restart="'+escape(v.id)+'" '+(!q.ready?'disabled':'')+'>RESTART EXACT GENERATION</button></div></section>';
}
function renderOne(state,v,baseline,asMoney=money){
 if(v?.active===false||["retired","discontinued","archived"].includes(String(v?.productionStatus||"")))return retiredMarkup(state,v,asMoney);
 const p=plan(v),foundation=p.type==="generation"?(W.MDXGenerationRelease?.quote?.(state,v,W.MDXPartsCarryover?.quote?.(state,v,baseline)||baseline)||W.MDXPartsCarryover?.quote?.(state,v,baseline)||baseline):baseline,adjustedBase=W.MDXVisualEngineering?.pricedBase?.(state,v,foundation,p.type)||foundation,q=quote(state,v,p.type,adjustedBase||{budget:0,days:30}),suggest=evaluateDirector(state,v),history=(v.lifecycleStudioHistory||[]).slice(0,3);
 const item=(key,label,opts)=>'<label class="ls-field"><span>'+label+'</span><select data-ls-field="'+key+'" data-ls-id="'+escape(v.id)+'">'+opts.map(([id,title,disabled])=>'<option value="'+escape(id)+'" '+(String(p[key])===String(id)?'selected':'')+' '+(disabled?'disabled':'')+'>'+escape(title)+'</option>').join('')+'</select></label>';
 const selectTypes=item("type","PROGRAM",[...Object.entries(types)].map(([id,x])=>[id,x.name,false]));
 const selectEquipment=item("equipment","EQUIPMENT",[...Object.entries(packages)].map(([id,x])=>[id,x.name+(n(state.year)<x.from?" · from "+x.from:""),n(state.year)<x.from]));
 const slider=(field,label,min,max,step,v)=>'<label class="ls-field ls-range"><span>'+label+'</span><strong>'+escape(field==="priceAimPct"?(v>0?'+':'')+v+'%':v+'/100')+'</strong><input type="range" data-ls-field="'+field+'" data-ls-id="'+escape(p.vehicleId||this?.id||"")+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></label>';
 const changeMarkup='<label class="ls-field ls-range"><span>PRICE AIM</span><strong>'+(p.priceAimPct>0?'+':'')+p.priceAimPct+'%</strong><input type="range" data-ls-field="priceAimPct" data-ls-id="'+escape(v.id)+'" min="-8" max="12" step="1" value="'+p.priceAimPct+'"></label>'+
 '<label class="ls-field ls-range"><span>QUALITY TARGET</span><strong>'+p.qualityTarget+'/100</strong><input type="range" data-ls-field="qualityTarget" data-ls-id="'+escape(v.id)+'" min="35" max="90" step="5" value="'+p.qualityTarget+'"></label>';
 return'<section class="ls-panel" data-ls-panel="'+escape(v.id)+'"><div class="ls-heading"><div><span class="eyebrow">MODEL PROGRAM PLANNER • 701–740</span><h4>Next model decision</h4></div><button class="btn secondary" type="button" data-ls-advice="'+escape(v.id)+'">AI PROPOSAL</button></div>'+
 '<div class="ls-control-grid">'+selectTypes+selectEquipment+changeMarkup+'</div>'+
 '<div class="ls-consequence"><div class="ls-strategy-text">'+escape(types[p.type].description)+'</div><div class="ls-metrics">'+
 '<div><small>EST. DEVELOPMENT</small><b>'+escape(asMoney(q.budget))+'</b></div><div><small>DAYS TO COMPLETE</small><b>'+q.days+'</b></div><div><small>UNIT COST CHANGE</small><b>'+(q.unitCostDelta>=0?'+':'')+escape(asMoney(q.unitCostDelta))+'</b></div><div><small>POST-UPDATE MSRP*</small><b>'+escape(asMoney(q.indicativeMsrp))+'</b></div><div><small>APPROVAL CASH</small><b>'+escape(asMoney(q.minimumCash))+'</b></div><div><small>UNIT MARGIN EST.</small><b>'+escape(asMoney(q.estimatedMargin))+'</b></div></div>'+
 '<div class="ls-timeline"><span>DESIGN</span><i></i><span>VALIDATE</span><i></i><span>RETOOL</span><i></i><span>RELAUNCH</span></div>'+
 (q.warnings.length?'<p class="ls-alert">'+q.warnings.map(escape).join(' • ')+'</p>':'')+
 (q.blocked?'<p class="ls-error">'+escape(q.blocked)+'</p>':'')+
 '<p class="ls-disclaimer">*Illustrative, subject to live rival prices and actual market conditions at completion. Current model remains on sale during normal development.</p>'+
 '<div class="ls-actions"><button type="button" class="btn hero" data-ls-authorize="'+escape(v.id)+'" '+(!q.ready?'disabled':'')+'>AUTHORIZE '+escape(types[p.type].name.toUpperCase())+'</button></div></div>'+
 '<div class="ls-retirement-action"><button type="button" class="btn secondary" data-ls-retire="'+escape(v.id)+'">END PRODUCTION / ARCHIVE</button><small>Stop building the car without erasing its inventory, sales, generations or historic record.</small></div>'+ 
 '<p class="ls-ai-reason" data-ls-note="'+escape(v.id)+'">AI suggestion: '+escape(types[suggest.type].name)+' / '+escape(packages[suggest.equipment].name)+' — '+escape(suggest.reason)+'</p>'+
 (history.length?'<div class="ls-history"><b>Recent model program decisions</b>'+history.map(x=>'<p>'+escape(String(x.year))+' · '+escape(x.event.replaceAll("_"," "))+' · '+escape((x.details?.plan?.equipment)||"equipment archived")+'</p>').join('')+'</div>':'')+'</section>';
}
function wire(root,state,h={}){
 if(!root)return;
 const save=h.save||(()=>{}),rerender=h.rerender||(()=>{}),toast=h.toast||(()=>{}),log=h.log||(()=>{});
 const find=id=>(state.vehicles||[]).find(v=>String(v.id)===String(id));
 root.querySelectorAll("[data-ls-field]").forEach(el=>el.addEventListener("change",()=>{
  const vehicle=find(el.dataset.lsId),field=el.dataset.lsField;if(!vehicle||!["type","equipment","priceAimPct","qualityTarget"].includes(field))return;
  const value=el.tagName==="SELECT"?el.value:Number(el.value),current=plan(vehicle);
  if(field==="equipment"&&(!packages[value]||n(state.year)<packages[value].from))return;
  if(field==="type"&&!types[value])return;
  vehicle.lifecycleStrategy={...current,[field]:value};save();rerender();
 }));
 root.querySelectorAll("[data-ls-advice]").forEach(button=>button.addEventListener("click",()=>{
  const vehicle=find(button.dataset.lsAdvice);if(!vehicle)return;
  const ai=evaluateDirector(state,vehicle);vehicle.lifecycleStrategy={...plan(vehicle),type:ai.type,equipment:ai.equipment,priceAimPct:ai.priceAimPct,qualityTarget:ai.qualityTarget};
  record(state,vehicle,"director_proposal",{reason:ai.reason,selected:vehicle.lifecycleStrategy});
  log("Product director proposed "+types[ai.type].name+" for "+vehicle.name+" based on market age, margin and product freshness.");
  save();rerender();
 }));
 root.querySelectorAll("[data-ls-retire]").forEach(button=>button.addEventListener("click",()=>{
  const v=find(button.dataset.lsRetire);if(!v)return;
  if(typeof W.confirm==="function"&&!W.confirm("End production of "+v.name+"? Existing inventory and model history will remain available."))return;
  if(!W.MDXProductLifecycle?.discontinueVehicle?.(state,v.id)){toast("Production could not be ended.");return;}
  record(state,v,"production_retired",{inventory:n(v.inventory),generation:n(v.generation)});
  log(v.name+" production ended; remaining inventory and historic nameplate retained.");save();rerender();
 }));
 root.querySelectorAll("[data-ls-restart]").forEach(button=>button.addEventListener("click",()=>{
  const v=find(button.dataset.lsRestart);if(!v)return;
  const q=restartQuote(state,v);if(!q.ready){toast(q.blocked);return;}
  const result=W.MDXProductLifecycle?.restartVehicle?.(state,v.id,{type:"restart"});
  if(!result?.ok){toast(result?.reason||"Tooling could not begin");return;}
  record(state,v,"production_restarted",{toolingCost:result.tooling,days:result.days,generation:n(v.generation),cashAfter:n(state.cash)});
  log(v.name+" approved for exact-generation production restart: "+money(result.tooling)+" tooling and "+result.days+" days; existing inventory retained.");
  save();rerender();
 }));
 root.querySelectorAll("[data-ls-authorize]").forEach(button=>button.addEventListener("click",()=>{
  const vehicle=find(button.dataset.lsAuthorize);if(!vehicle)return;
  const type=plan(vehicle).type,base=W.MDX?.modelActionBaseline?.(state,vehicle,type);if(!base){toast("The lifecycle development department is unavailable.");return;}
  const foundation=type==="generation"?(W.MDXGenerationRelease?.quote?.(state,vehicle,W.MDXPartsCarryover?.quote?.(state,vehicle,base)||base)||W.MDXPartsCarryover?.quote?.(state,vehicle,base)||base):base,adjusted=W.MDXVisualEngineering?.pricedBase?.(state,vehicle,foundation,type)||foundation,q=quote(state,vehicle,type,adjusted);if(!q.ready){toast(q.blocked);rerender();return;}
  const start={modelyear:W.MDX?.startModelYear,facelift:W.MDX?.startFacelift,generation:W.MDX?.startGeneration}[type];
  if(typeof start!=="function"||!start(state,vehicle.id,log)){toast("Unable to authorize. Check current cash and active programs.");return;}
  const action=(state.modelActions||[]).slice().reverse().find(a=>a.vehicleId===vehicle.id&&a.status==="active"&&a.type===type);
  if(action)record(state,vehicle,"authorized_"+type,{plan:action.lifecycleStrategy||q.plan,budget:action.budget,days:action.totalDays});
  save();rerender();
 }));
}
W.MDXLifecycleStrategy=Object.freeze({version:1,types,packages,plan,quote,restartQuote,complete,evaluateDirector,record,renderOne,wire});
})();