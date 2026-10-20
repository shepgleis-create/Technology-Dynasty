/* Motor Dynasty — 781–800. Integrated with real model actions, factories and nameplates. */
(()=>{
"use strict";
const W=window;
const num=(x,d=0)=>x==null||x===""||!Number.isFinite(Number(x))?d:Number(x);
const cap=(x,a,b)=>Math.min(b,Math.max(a,num(x)));
const fmt=x=>"$"+Math.round(num(x)).toLocaleString("en-US");
const esc=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tools={
 new:{label:"All-new stamping tools",save:0,extraDays:0,ramp:1,risk:0},
 rework:{label:"Rework existing dies",save:.14,extraDays:6,ramp:.96,risk:1.4},
 reuse:{label:"Reuse factory tooling",save:.26,extraDays:13,ramp:.89,risk:3.8}
};
const launches={
 now:{label:"Release immediately",days:0,appeal:1},
 month:{label:"Hold 30 days",days:30,appeal:1.04},
 quarter:{label:"Coordinate 90-day launch",days:90,appeal:1.09}
};
const replacements={
 replace:{label:"Replace old generation"},
 parallel:{label:"Produce generations together"}
};
const museums={
 archive:{label:"Preserve historical archive",monthly:0,heritage:0},
 museum:{label:"Company museum",monthly:1200,heritage:.16},
 restoration:{label:"Historic restoration division",monthly:3300,heritage:.35}
};
const defaults={tools:"new",launch:"now",replace:"replace"};
function plan(v){
 const p=v?.generationReleasePlan||{};
 return{tools:tools[p.tools]?p.tools:defaults.tools,launch:launches[p.launch]?p.launch:defaults.launch,
 replace:replacements[p.replace]?p.replace:defaults.replace};
}
function factories(s){
 return(s.operations?.factories||[]).filter(f=>f.active!==false&&f.status==="operating");
}
function quote(s,v,base){
 const p=plan(v),t=tools[p.tools],l=launches[p.launch],b=Math.max(0,num(base?.budget)),
 days=Math.max(1,num(base?.days,150)),unit=Math.max(100,num(v?.stats?.unitCost??v?.stats?.manufacturingUnitCost,1000)),
 carrySource=!!(v?.platformId||v?.design?.platformId||v?.productionStatus==="production"),
 saving=Math.round(Math.min(b*.25,unit*100*t.save)),risk=t.risk*(num(v?.lifecycle?.ageMonths)>96?1.5:1),
 holdCost=Math.round((unit*.38+12000)*l.days/30);
 const warnings=[];
 if(p.replace==="parallel"&&factories(s).length<2)warnings.push("Production capacity will be divided between new and old generations");
 if(p.launch!=="now")warnings.push("Outgoing model remains on sale during launch preparation; marketing and inventory costs continue");
 if(p.tools==="reuse"&&num(v?.stats?.reliability,70)<65)warnings.push("Reuse of old equipment increases quality and warranty exposure");
 const blocked=p.tools!=="new"&&!carrySource?"No existing tool set can be reused":
 p.tools!=="new"&&!factories(s).length?"No operating factory can rework or reuse production tooling":
 p.replace==="parallel"&&v?.productionStatus!=="production"?"Outgoing model must be producing":
 p.replace==="parallel"&&!factories(s).length?"No working factory can support parallel production":null;
 return{plan:p,budget:Math.max(0,b-saving),days:days+t.extraDays,baseBudget:b,baseDays:days,
 saving,risk,holdDays:l.days,holdCost,ramp:t.ramp,appeal:l.appeal,warnings,blocked,ready:!blocked,
 factories:factories(s).length,monthlyHoldingCost:Math.round(unit*.38+12000)};
}
function director(s,v){
 const age=num(v?.lifecycle?.ageMonths)/12,rel=num(v?.stats?.reliability,70),f=factories(s).length,
 sales=num(v?.lastMonthSales),cash=num(s.cash),cost=num(v?.stats?.unitCost,1000);
 const p={tools:age<6&&rel>78?"reuse":age<11&&rel>65?"rework":"new",
 launch:cash<cost*50?"now":sales>150?"month":"quarter",
 replace:f>1&&cash>cost*140&&sales>130?"parallel":"replace"};
 return{plan:p,reason:"Model age "+age.toFixed(1)+" yr; reliability "+Math.round(rel)+"/100; "+f+" factories; "+
 Math.round(sales)+" recent sales; cash "+fmt(cash)};
}
function audit(s,v,type,details={}){
 s.generationReleaseAudit=Array.isArray(s.generationReleaseAudit)?s.generationReleaseAudit:[];
 const row={year:num(s.year),month:num(s.month),day:num(s.day,1),vehicleId:v.id,event:type,details:JSON.parse(JSON.stringify(details))};
 s.generationReleaseAudit.unshift(row);s.generationReleaseAudit.length=Math.min(150,s.generationReleaseAudit.length);
 v.generationReleaseHistory=Array.isArray(v.generationReleaseHistory)?v.generationReleaseHistory:[];
 v.generationReleaseHistory.unshift(row);v.generationReleaseHistory.length=Math.min(24,v.generationReleaseHistory.length);
 return row;
}
function capture(s,v,action,q){
 if(!v.generationReleasePlan)return null;
 action.generationReleaseSnapshot={...q.plan,risk:q.risk,ramp:q.ramp,appeal:q.appeal,
 holdDays:q.holdDays,holdCost:q.holdCost,monthlyHoldingCost:q.monthlyHoldingCost,
 toolingSaving:q.saving,sourceGeneration:num(v.generation,1)};
 audit(s,v,"development_authorized",action.generationReleaseSnapshot);
 return action.generationReleaseSnapshot;
}
function developmentReady(s,p,v,log=()=>{}){
 const cfg=p.generationReleaseSnapshot;
 if(!cfg?.holdDays)return false;
 if(p.releaseHold)return true;
 p.releaseHold={remaining:cfg.holdDays,total:cfg.holdDays,spent:0,budget:cfg.holdCost,status:"running"};
 p.status="awaiting_launch";p.phase="MARKET LAUNCH PREPARATION";
 audit(s,v,"development_finished",{holdDays:cfg.holdDays});
 log(v.name+" engineering finished; scheduling release in "+cfg.holdDays+" days. Current model stays in production.");
 return true;
}
function tickHold(s,p,v,log=()=>{}){
 const h=p.releaseHold;if(p.status!=="awaiting_launch"||!h)return false;
 const payment=Math.min(Math.max(0,num(h.budget)-num(h.spent)),num(h.budget)/Math.max(1,num(h.total)));
 if(num(s.cash)<payment){h.status="paused";p.phase="PAUSED — LAUNCH FINANCING";return false;}
 s.cash-=payment;h.spent+=payment;h.remaining=Math.max(0,num(h.remaining)-1);h.status="running";
 W.MDX?.recordCashTransaction?.(s,"marketing",-payment,"Scheduled model launch — "+v.name,{programId:p.id});
 if(h.remaining===0){h.status="complete";p.phase="READY TO RELEASE";log(v.name+" completed market launch preparations.");return true;}
 return false;
}
function beforeLaunch(s,v,p){
 if(p.generationReleasePrepared)return null;
 const cfg=p.generationReleaseSnapshot;
 if(!cfg)return null;
 const gen=num(v.generation,1),stock=Math.max(0,num(v.inventory)),newId=v.id+"-gen"+gen+"-legacy-"+p.id;
 const found=(s.vehicles||[]).find(x=>x.id===newId);
 if(!found){
  const old=JSON.parse(JSON.stringify(v));
  old.id=newId;old.name=v.name+" Gen "+gen+(cfg.replace==="parallel"?" Classic":" Outgoing");
  old.outgoingGeneration=true;old.lineageParentId=v.id;old.active=true;
  old.productionStatus="production";old.productionEnabled=cfg.replace==="parallel";
  old.oldGenerationSellThrough=cfg.replace==="replace";
  old.productAutomation={enabled:false};old.generationReleasePlan=null;
  old.partsCarryoverPlan=null;old.lifecycleStrategy=null;
  old.lastMonthSales=0;old.mtdSales=0;old.mtdProduced=0;old.lastMonthProduced=0;
  old.lifetimeSales=0;old.variantPrograms=[];
  old.inventory=stock;
  s.vehicles.push(old);
 }
 // Move inventory ownership to outgoing vehicle in every market and transit record.
 // Do not duplicate dealer units or classify them as newly redesigned cars.
 for(const r of(s.marketSystem?.regions||[])){
  for(const field of ["inventory","franchiseInventory","companyInventory","partnerInventory","dealerInventory"]){
   const bucket=r[field];if(!bucket||typeof bucket!=="object")continue;
   const qty=Math.max(0,num(bucket[v.id]));if(qty){bucket[newId]=num(bucket[newId])+qty;delete bucket[v.id];}
  }
 }
 for(const shipment of(s.logistics?.inTransit||[])){if(shipment.vehicleId===v.id)shipment.vehicleId=newId;}
 v.inventory=0;v.factoryInventory=0;v.mtdProduced=0;v.mtdSales=0;
 p.outgoingVehicleId=newId;p.generationReleasePrepared=true;
 audit(s,v,"old_generation_allocated",{mode:cfg.replace,oldInventory:stock,outgoingId:newId,
 sellThrough:cfg.replace==="replace"});
 return{oldInventory:stock,oldVehicleId:newId,mode:cfg.replace};
}
function afterLaunch(s,v,p,log=()=>{}){
 const cfg=p.generationReleaseSnapshot;if(!cfg||p.generationReleaseApplied)return null;
 p.generationReleaseApplied=true;
 v.toolingRampMultiplier=cfg.ramp;v.toolingRampMonthsRemaining=3;
 const before={quality:num(v.stats?.quality),reliability:num(v.stats?.reliability)};
 v.stats.quality=cap(before.quality-cfg.risk*.12,1,99);
 v.stats.reliability=cap(before.reliability-cfg.risk*.18,1,99);
 if(v.launchMomentum)v.launchMomentum.multiplier=cap(num(v.launchMomentum.multiplier,1)*cfg.appeal,1,1.3);
 const np=(s.nameplates||[]).find(x=>x.id===v.nameplateId);
 if(np&&p.outgoingVehicleId){const old=np.generations?.find(g=>num(g.generation)===num(cfg.sourceGeneration));if(old){old.endPeriod=null;old.parallelProduction=true;old.vehicleId=p.outgoingVehicleId;}}
 p.generationReleaseOutcome={before,after:{quality:v.stats.quality,reliability:v.stats.reliability},capacityMultiplier:cfg.ramp,outgoingVehicleId:p.outgoingVehicleId||null};
 audit(s,v,"generation_released",p.generationReleaseOutcome);
 log(v.name+" new generation released; tooling "+cfg.tools+", replacement "+cfg.replace+".");
 return p.generationReleaseOutcome;
}
function productionMultiplier(v){return num(v.toolingRampMonthsRemaining)>0?cap(num(v.toolingRampMultiplier,1),.6,1):1;}
function setHeritage(s,v,method){
 if(!museums[method])return{ok:false,reason:"Invalid archive program"};
 if(num(s.cash)<museums[method].monthly)return{ok:false,reason:"Insufficient cash for museum operations"};
 v.heritagePlan={method,enabled:method!=="archive",lastStatus:"AUTHORIZED"};
 audit(s,v,"heritage_policy",{method});
 return{ok:true};
}
function settleMonth(s,log=()=>{}){
 const period=num(s.year)*12+num(s.month);
 if(s.generationHeritageLastSettledPeriod===period)return{count:0,spent:0,alreadySettled:true};
 s.generationHeritageLastSettledPeriod=period;
 let count=0,spent=0;
 for(const v of(s.vehicles||[])){
  if(num(v.toolingRampMonthsRemaining)>0){v.toolingRampMonthsRemaining--;if(!v.toolingRampMonthsRemaining)v.toolingRampMultiplier=1;}
  const h=v.heritagePlan;if(!h?.enabled)continue;
  const kind=museums[h.method];if(!kind||!kind.monthly)continue;
  const age=Math.max(0,num(s.year)-num(v.createdYear||v.modelYear||s.year));
  if(age<7&&num(v.lifetimeSales)<30000&&v.active!==false)continue;
  const due=Math.round(kind.monthly*cap(Math.pow(1.025,num(s.year)-1970),.25,6));
  if(num(s.cash)<due){h.lastStatus="PAUSED — FUNDING";continue;}
  s.cash-=due;count++;spent+=due;h.lastStatus="FUNDED";
  const np=(s.nameplates||[]).find(x=>x.id===v.nameplateId);
  if(np)np.heritage=cap(num(np.heritage)+kind.heritage,0,100);
  W.MDX?.recordCashTransaction?.(s,"marketing",-due,"Historic vehicle collection — "+v.name,{vehicleId:v.id});
 }
 if(count)log(count+" heritage programs cost "+fmt(spent)+" this month.");
 return{count,spent};
}
function markup(s,v){
 if(!v||v.active===false||v.productionStatus==="retired")return"";
 const p=plan(v),base=W.MDX?.modelActionBaseline?.(s,v,"generation")||{budget:0,days:150},
 carry=W.MDXPartsCarryover?.quote?.(s,v,base)||base,q=quote(s,v,carry);
 const choices=(key,opts,title)=>'<label class="gr-control"><small>'+title+'</small><select data-gr-option="'+key+'" data-gr-model="'+esc(v.id)+'">'+
 Object.entries(opts).map(([id,x])=>'<option value="'+id+'"'+(p[key]===id?' selected':'')+'>'+esc(x.label)+'</option>').join("")+'</select></label>';
 const scheduled=(s.modelActions||[]).find(a=>a.vehicleId===v.id&&a.type==="generation"&&["active","awaiting_launch"].includes(a.status));
 const authorization=scheduled?.generationReleaseSnapshot?"<p class=\"gr-note\">AUTHORIZED PLAN: "+esc(tools[scheduled.generationReleaseSnapshot.tools]?.label||"New tooling")+" · "+esc(launches[scheduled.generationReleaseSnapshot.launch]?.label||"Immediate launch")+" · "+esc(replacements[scheduled.generationReleaseSnapshot.replace]?.label||"Replacement")+"; changes to controls apply only to a future program.</p>":"";
 const metrics=[["ENGINEERING CAPITAL",fmt(q.budget)],["TOOLING SAVING",fmt(q.saving)],["ENGINEERING DAYS",q.days+"d"],
 ["DEALER LAUNCH HOLD",q.holdDays+"d"],["HOLD EXPENSE",fmt(q.holdCost)],["RAMP CAPACITY",Math.round(q.ramp*100)+"%"]];
 return'<section class="gr-studio"><div class="gr-title"><div><span class="eyebrow">CHECKLIST 781–795</span><h4>Tooling / Launch / Replacement</h4></div><button class="btn secondary" type="button" data-gr-director="'+esc(v.id)+'">AI PLAN</button></div>'+
 '<div class="gr-options">'+choices("tools",tools,"FACTORY TOOLING")+choices("launch",launches,"MARKET RELEASE")+choices("replace",replacements,"OLD GENERATION")+'</div>'+
 '<div class="gr-stats">'+metrics.map(([t,x])=>'<div><small>'+t+'</small><b>'+x+'</b></div>').join("")+'</div>'+
 '<div class="gr-bar"><span>Factory output allocation</span><div><i style="width:'+(p.replace==="parallel"?50:100)+'%"></i></div><small>'+(p.replace==="parallel"?"Two models divide production capacity":"Successor generation replaces old production")+'</small></div>'+
 authorization+(q.blocked?'<p class="gr-error">'+esc(q.blocked)+'</p>':'')+(q.warnings.length?'<p class="gr-warning">'+q.warnings.map(esc).join(" · ")+'</p>':'')+
 '<p class="gr-note">Costs, development, delay and replacement are applied through the existing New Generation action. No change is authorized until you start that program.</p></section>';
}
function heritageMarkup(s,v){
 const choice=v.heritagePlan?.method||"archive",np=(s.nameplates||[]).find(x=>x.id===v.nameplateId),logs=(v.generationReleaseHistory||[]).slice(0,4);
 return'<section class="gr-studio heritage"><span class="eyebrow">CHECKLIST 796–800</span><h4>Heritage Archive</h4>'+
 '<div class="gr-options"><label class="gr-control"><small>PROGRAM</small><select data-gr-heritage="'+esc(v.id)+'">'+
 Object.entries(museums).map(([id,x])=>'<option value="'+id+'"'+(id===choice?' selected':'')+'>'+esc(x.label)+'</option>').join("")+'</select></label>'+
 '<div class="gr-control"><small>NAMEPLATE HERITAGE</small><b>'+Math.round(num(np?.heritage))+'/100</b><small>'+num(np?.cumulativeSales).toLocaleString("en-US")+' lifetime units</small></div></div>'+
 '<p class="gr-note">Museum and restoration programs spend real company cash each month in exchange for gradual heritage improvements, not artificial vehicle sales.</p>'+
 logs.map(x=>'<p class="gr-note">'+esc(x.event.replaceAll("_"," "))+' · '+x.year+'</p>').join("")+'</section>';
}
function wire(root,s,{save=()=>{},rerender=()=>{},log=()=>{},toast=()=>{}}={}){
 if(!root)return;const find=id=>(s.vehicles||[]).find(v=>String(v.id)===String(id));
 root.querySelectorAll("[data-gr-option]").forEach(el=>el.addEventListener("change",()=>{
  const v=find(el.dataset.grModel),key=el.dataset.grOption,options={tools,launch:launches,replace:replacements}[key];
  if(!v||!options?.[el.value])return;
  v.generationReleasePlan={...plan(v),[key]:el.value};save();rerender();
 }));
 root.querySelectorAll("[data-gr-director]").forEach(el=>el.addEventListener("click",()=>{
  const v=find(el.dataset.grDirector);if(!v)return;const advice=director(s,v);
  v.generationReleasePlan={...advice.plan};
  audit(s,v,"director_recommendation",{reason:advice.reason,plan:advice.plan});
  log("Engineering director: "+advice.reason);save();rerender();
 }));
 root.querySelectorAll("[data-gr-heritage]").forEach(el=>el.addEventListener("change",()=>{
  const v=find(el.dataset.grHeritage);if(!v)return;
  const r=setHeritage(s,v,el.value);if(!r.ok){toast(r.reason);rerender();return;}
  save();rerender();
 }));
}
W.MDXGenerationRelease=Object.freeze({version:1,tools,launches,replacements,museums,plan,quote,director,audit,capture,developmentReady,tickHold,beforeLaunch,afterLaunch,productionMultiplier,setHeritage,settleMonth,markup,heritageMarkup,wire});
})();
