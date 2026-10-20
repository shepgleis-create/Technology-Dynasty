(() => {
"use strict";
const VERSION=2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const defs=()=>window.MDX_DATA?.REGIONS||[];
const regionDef=id=>defs().find(x=>x.id===id)||{};
const className=v=>String(v?.stats?.className||v?.segment||v?.target||"Other");
const msrp=v=>Math.max(500,num(window.MDXProductLifecycle?.vehicleEconomics?.(v)?.blendedMsrp??v?.msrp,500));
const propulsion=v=>String(v?.design?.propulsion||v?.propulsion||"ice").toLowerCase();
const period=s=>num(s?.year,1970)*12+num(s?.month,0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const PRICING_STRATEGIES={
 penetration:{name:"Penetration",priceAdj:-.05,desc:"Trade margin for faster conquest and launch share."},
 balanced:{name:"Balanced",priceAdj:0,desc:"Hold close to sticker and let product strength drive demand."},
 premium:{name:"Premium",priceAdj:.02,desc:"Protect transaction price and margin."},
 skimming:{name:"Launch Skimming",priceAdj:.015,launchAdj:.035,desc:"Charge early adopters more, then normalize after launch."}
};
const COLOR_PLANS={
 balanced:{black:20,white:20,silver:20,blue:16,red:14,green:10},
 conservative:{black:25,white:24,silver:25,blue:14,red:7,green:5},
 sport:{black:24,white:12,silver:10,blue:20,red:26,green:8},
 luxury:{black:32,white:21,silver:19,blue:12,red:8,green:8}
};
const MATERIAL_PLANS={
 value:{cloth:62,vinyl:30,leather:8},
 balanced:{cloth:44,vinyl:24,leather:32},
 premium:{cloth:12,vinyl:16,leather:72}
};
function platformDrive(state,v){
 const direct=String(v?.design?.drive||v?.drivetrain||v?.drive||"").toUpperCase();
 if(direct)return direct;
 const p=(state?.platforms||[]).find(x=>x.id===v?.platformId);
 return String(p?.drive||"RWD").toUpperCase();
}
function emptyFlow(){return{sales:0,retained:0,conquest:0,newToMarket:0};}
function emptyMix(){return{colors:{},materials:{}};}
function ensurePricing(v){
 v.pricing=v.pricing&&typeof v.pricing==="object"?v.pricing:{};
 const p=v.pricing;p.strategy=PRICING_STRATEGIES[p.strategy]?p.strategy:"balanced";p.launchDiscountPct=clamp(num(p.launchDiscountPct),0,15);p.fleetFloorPct=clamp(num(p.fleetFloorPct,78),70,100);p.regionalAdjustments=p.regionalAdjustments&&typeof p.regionalAdjustments==="object"?p.regionalAdjustments:{};
 return p;
}
function ensureAppearance(v){
 const c=ensureVehicle(v);c.appearance=c.appearance&&typeof c.appearance==="object"?c.appearance:{};
 const a=c.appearance,cls=className(v);a.colorStrategy=COLOR_PLANS[a.colorStrategy]?a.colorStrategy:(["Luxury","Premium"].includes(cls)?"luxury":cls==="Sport"?"sport":"balanced");a.materialStrategy=MATERIAL_PLANS[a.materialStrategy]?a.materialStrategy:(["Luxury","Premium"].includes(cls)?"premium":cls==="Budget"?"value":"balanced");a.mtd=a.mtd&&typeof a.mtd==="object"?a.mtd:emptyMix();a.lastMonth=a.lastMonth&&typeof a.lastMonth==="object"?a.lastMonth:emptyMix();a.lifetime=a.lifetime&&typeof a.lifetime==="object"?a.lifetime:emptyMix();a.mtd.colors=a.mtd.colors||{};a.mtd.materials=a.mtd.materials||{};a.lastMonth.colors=a.lastMonth.colors||{};a.lastMonth.materials=a.lastMonth.materials||{};a.lifetime.colors=a.lifetime.colors||{};a.lifetime.materials=a.lifetime.materials||{};return a;
}
function ensureRegion(cm,id){
 if(!cm.regions[id]||typeof cm.regions[id]!=="object")cm.regions[id]={};
 const r=cm.regions[id];r.activeOwners=Math.max(0,num(r.activeOwners));r.mtd={...emptyFlow(),...(r.mtd||{})};r.lastMonth={...emptyFlow(),...(r.lastMonth||{})};r.lifetime={...emptyFlow(),...(r.lifetime||{})};r.segmentOwners=r.segmentOwners&&typeof r.segmentOwners==="object"?r.segmentOwners:{};r.lastClosePeriod=Number.isFinite(Number(r.lastClosePeriod))?Number(r.lastClosePeriod):-1;return r;
}
function ensureVehicle(v){
 if(!v)return null;
 const c=v.customerMarket&&typeof v.customerMarket==="object"?v.customerMarket:{};c.activeOwners=Math.max(0,num(c.activeOwners));c.mtd={...emptyFlow(),...(c.mtd||{})};c.lastMonth={...emptyFlow(),...(c.lastMonth||{})};c.lifetime={...emptyFlow(),...(c.lifetime||{})};c.byRegion=c.byRegion&&typeof c.byRegion==="object"?c.byRegion:{};c.cannibalizationIndex=clamp(num(c.cannibalizationIndex,1),.45,1);v.customerMarket=c;ensurePricing(v);return c;
}
function ensure(state){
 if(!state||typeof state!=="object")return state;
 state.customerMarket=state.customerMarket&&typeof state.customerMarket==="object"?state.customerMarket:{};
 const cm=state.customerMarket;cm.version=Math.max(VERSION,num(cm.version,VERSION));cm.regions=cm.regions&&typeof cm.regions==="object"?cm.regions:{};cm.totals={...emptyFlow(),...(cm.totals||{})};cm.lastMonth={...emptyFlow(),...(cm.lastMonth||{})};cm.segments=Array.isArray(cm.segments)?cm.segments:[];
 const ids=new Set([...(state.marketSystem?.regions||[]).map(r=>r.id),...defs().map(r=>r.id)]);for(const id of ids)ensureRegion(cm,id);for(const v of state.vehicles||[]){ensureVehicle(v);ensureAppearance(v);}
 return state;
}
function climateMultiplier(state,v,regionId){
 ensure(state);const def=regionDef(regionId),weather=String(def.weather||"mixed"),drive=platformDrive(state,v),cls=className(v),rel=clamp(num(v?.stats?.reliability??v?.stats?.rel,65),1,100),safety=clamp(num(v?.stats?.safety,65),1,100);let m=1;
 if(weather==="cold"){if(drive.includes("AWD")||drive.includes("4WD"))m+=.09;else if(drive.includes("FWD"))m+=.035;else if(drive.includes("RWD"))m-=.035;if(["Utility","Off-Road"].includes(cls))m+=.045;m+=(rel-65)/900+(safety-65)/1100;}
 else if(weather==="warm"){if(["Sport","Utility","Off-Road"].includes(cls))m+=.025;m+=(rel-65)/1300;}
 else{if(drive.includes("AWD"))m+=.018;m+=(rel-65)/1800;}
 if((v.completedTests||[]).includes("climate"))m+=.025;const result=clamp(m,.82,1.18);ensureVehicle(v).lastClimateFit=result;return result;
}
function fuelPriceMultiplier(state,v,regionId){
 ensure(state);const def=regionDef(regionId),months=Math.max(0,num(state?.monthsPlayed)),trend=.36+months*.002+(num(state?.year,1970)>=1973?.12:0),world=Math.max(.12,num(state?.worldEconomy?.fuelPrice,trend)),regionalPressure=clamp(world/Math.max(.12,trend)*num(def.fuel,1),.50,3.25),type=propulsion(v);
 if(type==="bev"){const result=clamp(1+Math.max(-.20,regionalPressure-1)*.11,.92,1.22);ensureVehicle(v).lastFuelFit=result;return result;}
 const mpg=clamp(num(v?.stats?.mpg,20),5,150),eff=clamp(mpg/22,.40,2.75),response=Math.exp(Math.log(regionalPressure)*clamp((eff-1)*.48,-.52,.58)),hybrid=["mhev","parallel","powersplit","series","phev"].includes(type)?1+Math.max(0,regionalPressure-1)*.035:1,result=clamp(response*hybrid,.72,1.34);ensureVehicle(v).lastFuelFit=result;return result;
}
function cannibalizationMultiplier(state,v){
 ensure(state);const cls=className(v),price=msrp(v),siblings=(state.vehicles||[]).filter(x=>x!==v&&x.productionStatus==="production"&&x.active!==false&&className(x)===cls);let overlap=0;
 for(const x of siblings){const ratio=Math.max(price,msrp(x))/Math.max(500,Math.min(price,msrp(x))),priceOverlap=Math.exp(-Math.max(0,ratio-1)*2.8),sameBody=String(x.body||x.design?.body||"")===String(v.body||v.design?.body||"")?1:.72;overlap+=priceOverlap*sameBody;}
 const result=clamp(1/(1+overlap*.18),.60,1);const c=ensureVehicle(v);c.cannibalizationIndex=result;c.overlapModels=siblings.length;return result;
}
function segmentForVehicle(state,v){ensure(state);return state.customerMarket.segments.find(x=>x.id===v?.marketSegmentId)||null;}
function segmentDemandMultiplier(state,v){
 const seg=segmentForVehicle(state,v);if(!seg)return 1;const age=Math.max(0,period(state)-num(seg.createdPeriod,period(state))),sales=Math.max(0,num(seg.lifetimeSales)),validation=clamp(Math.log1p(sales)/12,0,.18),awareness=clamp(.90+Math.min(.08,age*.008)+validation+(seg.validated?.04:0),.88,1.20);seg.awareness=awareness;return awareness;
}
function segmentCreationCost(state){const idx=window.MDX_CORE?.economicIndex?window.MDX_CORE.economicIndex("marketing",num(state?.year,1970)):Math.pow(1.03,Math.max(0,num(state?.year,1970)-1970));return Math.round(250000*idx/1000)*1000;}
function createSegment(state,vehicleId,name,log){
 ensure(state);const v=(state.vehicles||[]).find(x=>x.id===vehicleId),clean=String(name||"").trim().replace(/\s+/g," ").slice(0,42);if(!v||clean.length<3||v.marketSegmentId)return{ok:false,reason:"invalid"};
 if(state.customerMarket.segments.some(x=>String(x.name).toLowerCase()===clean.toLowerCase()))return{ok:false,reason:"duplicate"};
 const cost=segmentCreationCost(state);if(num(state.cash)<cost)return{ok:false,reason:"cash",cost};
 state.cash-=cost;window.MDX?.recordCashTransaction?.(state,"marketing",-cost,"New market segment launch — "+clean,{vehicleId:v.id});const seg={id:"seg_"+String(v.id||Date.now()).replace(/[^a-z0-9_-]/gi,"_")+"_"+period(state),name:clean,vehicleId:v.id,vehicleName:v.name,baseClass:className(v),createdPeriod:period(state),mtdSales:0,lastMonthSales:0,lifetimeSales:0,validated:false,awareness:.90};state.customerMarket.segments.push(seg);v.marketSegmentId=seg.id;if(typeof log==="function")log(v.name+" launched the new "+clean+" segment with "+seg.baseClass+" as its underlying market class.");return{ok:true,cost,segment:seg};
}
function strategyAdjustment(v){const p=ensurePricing(v),s=PRICING_STRATEGIES[p.strategy]||PRICING_STRATEGIES.balanced;return num(s.priceAdj)+(Number(v?.rampMonths||0)<4?num(s.launchAdj):0);}
function effectiveRetailPrice(state,v,regionId,incentive=0){
 const p=ensurePricing(v),base=msrp(v),regional=clamp(num(p.regionalAdjustments?.[regionId]),-.10,.10),launch=Number(v?.rampMonths||0)<4?clamp(num(p.launchDiscountPct)/100,0,.15):0;
 return Math.max(500,base*(1+strategyAdjustment(v)+regional-launch)-Math.max(0,num(incentive)));
}
function pricingDemandMultiplier(state,v,regionId){
 const base=msrp(v),effective=effectiveRetailPrice(state,v,regionId,0),elasticity={Budget:1.15,Mainstream:1.0,Family:.92,Premium:.72,Luxury:.55,Sport:.78,Track:.52,Utility:.86,"Off-Road":.78}[className(v)]||.88,result=Math.pow(base/Math.max(500,effective),elasticity);return clamp(result,.78,1.30);
}
function fleetFloorFactor(v){return clamp(num(ensurePricing(v).fleetFloorPct,78)/100,.70,1);}
function customerDemandMultiplier(state,v,regionId){
 ensure(state);const rm=ensureRegion(state.customerMarket,regionId),owners=Math.max(0,num(rm.activeOwners)),last=rm.lastMonth||emptyFlow(),sales=Math.max(1,num(last.sales)),ownerPull=Math.min(.12,Math.sqrt(owners)/2700),retentionRate=num(last.retained)/sales,conquestRate=num(last.conquest)/sales,quality=(clamp(num(v?.customerSatisfaction,70),10,100)-70)/700,retentionMomentum=clamp((retentionRate-.10)*.18,-.025,.055),conquestMomentum=clamp((conquestRate-.48)*.12,-.045,.045),result=clamp(1+ownerPull+quality+retentionMomentum+conquestMomentum,.86,1.25);ensureVehicle(v).lastCustomerPull=result;return result;
}
function regionalDemandFactors(state,v,regionId){
 const climate=climateMultiplier(state,v,regionId),fuel=fuelPriceMultiplier(state,v,regionId),customer=customerDemandMultiplier(state,v,regionId),pricing=pricingDemandMultiplier(state,v,regionId),segment=segmentDemandMultiplier(state,v),award=window.MDXMarketQuality?.awardDemandMultiplier?.(state,v)??1,lemon=window.MDXMarketQuality?.lemonDemandMultiplier?.(state,v)??1,total=clamp(climate*fuel*customer*pricing*segment*award*lemon,.42,2.20);return{climate,fuel,customer,pricing,segment,award,lemon,total};
}
function normalizeWeights(weights){const entries=Object.entries(weights).map(([k,v])=>[k,Math.max(0,num(v))]),sum=entries.reduce((a,[,v])=>a+v,0)||1;return Object.fromEntries(entries.map(([k,v])=>[k,v/sum]));}
function weightedAllocation(qty,weights){
 const norm=normalizeWeights(weights),rows=Object.entries(norm).map(([k,w])=>({k,raw:qty*w,n:Math.floor(qty*w)})),used=rows.reduce((a,x)=>a+x.n,0);rows.sort((a,b)=>(b.raw-b.n)-(a.raw-a.n));for(let i=0;i<qty-used;i++)rows[i%rows.length].n++;return Object.fromEntries(rows.map(x=>[x.k,x.n]));
}
function appearanceWeights(v,regionId){
 const a=ensureAppearance(v),def=regionDef(regionId),colors={...COLOR_PLANS[a.colorStrategy]},materials={...MATERIAL_PLANS[a.materialStrategy]},weather=String(def.weather||"mixed"),cls=className(v);
 if(weather==="warm"){colors.white*=1.22;colors.silver*=1.12;colors.black*=.88;}if(weather==="cold"){colors.black*=1.12;colors.blue*=1.10;colors.white*=.94;}if(cls==="Sport")colors.red*=1.25;if(["Luxury","Premium"].includes(cls)){colors.black*=1.15;materials.leather*=1.25;}if(cls==="Budget"){materials.cloth*=1.15;materials.leather*=.75;}
 return{colors,materials};
}
function recordAppearanceSales(v,regionId,qty){
 const a=ensureAppearance(v),w=appearanceWeights(v,regionId),colors=weightedAllocation(qty,w.colors),materials=weightedAllocation(qty,w.materials);
 for(const [k,n] of Object.entries(colors)){a.mtd.colors[k]=num(a.mtd.colors[k])+n;a.lifetime.colors[k]=num(a.lifetime.colors[k])+n;}for(const [k,n] of Object.entries(materials)){a.mtd.materials[k]=num(a.mtd.materials[k])+n;a.lifetime.materials[k]=num(a.lifetime.materials[k])+n;}return{colors,materials};
}
function recordRetailSale(state,v,regionId,units){
 ensure(state);const qty=Math.max(0,Math.round(num(units)));if(!qty||!v)return{sales:0,retained:0,conquest:0,newToMarket:0};
 const rm=ensureRegion(state.customerMarket,regionId),vm=ensureVehicle(v),def=regionDef(regionId),market=Math.max(.15,num(def.market,1)),priorOwners=Math.max(0,num(rm.activeOwners)),satisfaction=clamp(num(v.customerSatisfaction,70),10,100),rep=clamp(num(state.rep,40),1,100),maturity=priorOwners/(priorOwners+24000*market),retentionPropensity=clamp(.06+maturity*.48+(satisfaction-65)/260+(rep-50)/600,.03,.68),replacementMonths=clamp(78-(satisfaction-65)*.16,54,90),replacementCapacity=priorOwners/Math.max(1,replacementMonths*30)*2.2,retained=Math.min(qty,Math.max(0,Math.round(Math.min(qty*retentionPropensity,replacementCapacity)))),remaining=Math.max(0,qty-retained),competitive=clamp(num(v.competitionIndex,1),.55,1.55),conquestShare=clamp(.48+(competitive-1)*.20+(satisfaction-70)/420+(rep-50)/700,.30,.82),conquest=Math.min(remaining,Math.max(0,Math.round(remaining*conquestShare))),newToMarket=Math.max(0,remaining-conquest),flow={sales:qty,retained,conquest,newToMarket};
 for(const bucket of [rm.mtd,rm.lifetime,state.customerMarket.totals,vm.mtd,vm.lifetime])for(const k of Object.keys(flow))bucket[k]=num(bucket[k])+flow[k];
 const rb=vm.byRegion[regionId]&&typeof vm.byRegion[regionId]==="object"?vm.byRegion[regionId]:{...emptyFlow(),owners:0};for(const k of Object.keys(flow))rb[k]=num(rb[k])+flow[k];rb.owners=Math.max(0,num(rb.owners)+conquest+newToMarket);vm.byRegion[regionId]=rb;rm.activeOwners=Math.max(0,priorOwners+conquest+newToMarket);vm.activeOwners=Math.max(0,num(vm.activeOwners)+conquest+newToMarket);const baseSeg=className(v);rm.segmentOwners[baseSeg]=Math.max(0,num(rm.segmentOwners[baseSeg])+conquest+newToMarket);
 const seg=segmentForVehicle(state,v);if(seg){seg.mtdSales=num(seg.mtdSales)+qty;seg.lifetimeSales=num(seg.lifetimeSales)+qty;if(seg.lifetimeSales>=2500)seg.validated=true;}recordAppearanceSales(v,regionId,qty);return flow;
}
function settleMonth(state){
 ensure(state);const p=period(state),closed=emptyFlow();
 for(const rm of Object.values(state.customerMarket.regions)){if(Number(rm.lastClosePeriod)===p)continue;rm.lastMonth={...emptyFlow(),...rm.mtd};for(const k of Object.keys(closed))closed[k]+=num(rm.lastMonth[k]);rm.mtd=emptyFlow();rm.activeOwners=Math.max(0,Math.round(rm.activeOwners*.994));for(const k of Object.keys(rm.segmentOwners))rm.segmentOwners[k]=Math.max(0,Math.round(num(rm.segmentOwners[k])*.994));rm.lastClosePeriod=p;}
 for(const v of state.vehicles||[]){const vm=ensureVehicle(v),a=ensureAppearance(v);vm.lastMonth={...emptyFlow(),...vm.mtd};vm.mtd=emptyFlow();vm.activeOwners=Math.max(0,Math.round(vm.activeOwners*.994));a.lastMonth={colors:{...a.mtd.colors},materials:{...a.mtd.materials}};a.mtd=emptyMix();}
 for(const seg of state.customerMarket.segments){seg.lastMonthSales=num(seg.mtdSales);seg.mtdSales=0;}
 state.customerMarket.lastMonth=closed;return closed;
}
function topMix(obj,count=3){return Object.entries(obj||{}).sort((a,b)=>num(b[1])-num(a[1])).slice(0,count);}
function regionSummary(state,regionId){
 ensure(state);const rm=ensureRegion(state.customerMarket,regionId),last=rm.lastMonth||emptyFlow(),sales=Math.max(0,num(last.sales));return{activeOwners:Math.round(rm.activeOwners),sales:Math.round(sales),retained:Math.round(num(last.retained)),conquest:Math.round(num(last.conquest)),newToMarket:Math.round(num(last.newToMarket)),retentionRate:sales?num(last.retained)/sales:0,conquestRate:sales?num(last.conquest)/sales:0,weather:String(regionDef(regionId).weather||"mixed")};
}
function vehicleSummary(state,v){
 ensure(state);const vm=ensureVehicle(v),last=vm.lastMonth||emptyFlow(),sales=Math.max(0,num(last.sales)),a=ensureAppearance(v),seg=segmentForVehicle(state,v),p=ensurePricing(v);return{activeOwners:Math.round(vm.activeOwners),sales:Math.round(sales),retained:Math.round(num(last.retained)),conquest:Math.round(num(last.conquest)),retentionRate:sales?num(last.retained)/sales:0,conquestRate:sales?num(last.conquest)/sales:0,cannibalization:cannibalizationMultiplier(state,v),climateFit:num(vm.lastClimateFit,1),fuelFit:num(vm.lastFuelFit,1),customerPull:num(vm.lastCustomerPull,1),segment:seg,pricing:p,topColors:topMix(a.lastMonth.colors),topMaterials:topMix(a.lastMonth.materials),colorStrategy:a.colorStrategy,materialStrategy:a.materialStrategy};
}
function render(state,root,h={}){
 ensure(state);const models=(state.vehicles||[]).filter(v=>v.productionStatus==="production"),last=state.customerMarket.lastMonth||emptyFlow(),totalOwners=Object.values(state.customerMarket.regions).reduce((a,r)=>a+num(r.activeOwners),0),pct=(a,b)=>b?Math.round(a/b*100):0,unlocked=(state.marketSystem?.regions||[]).filter(r=>r.unlocked);
 root.innerHTML="<div class='sim-summary'><div><span>ACTIVE BRAND OWNERS</span><b>"+Math.round(totalOwners).toLocaleString()+"</b></div><div><span>LAST-MONTH RETAIL</span><b>"+num(last.sales).toLocaleString()+"</b></div><div><span>REPEAT BUYERS</span><b>"+pct(num(last.retained),num(last.sales))+"%</b></div><div><span>CONQUEST SALES</span><b>"+pct(num(last.conquest),num(last.sales))+"%</b></div><div><span>CREATED SEGMENTS</span><b>"+state.customerMarket.segments.length+"</b></div></div><div class='notice'><b>CUSTOMER MARKET:</b> real retail deliveries now build an owner base. Repeat buyers, competitor conquest, climate, fuel prices, model overlap, segment awareness and transaction pricing all feed future demand.</div><div class='sim-card-grid customer-market-grid'>"+(models.length?models.map(v=>{const s=vehicleSummary(state,v),a=ensureAppearance(v),p=ensurePricing(v),homeRegion=unlocked[0]?.id||null,competitive=window.MDXMarketQuality?.competitiveComparison?.(state,v)||{score:100,peerCount:0},effective=homeRegion?effectiveRetailPrice(state,v,homeRegion,0):msrp(v),elasticity=homeRegion?pricingDemandMultiplier(state,v,homeRegion):1,colors=s.topColors.length?s.topColors.map(([k,n])=>k.toUpperCase()+" "+n.toLocaleString()).join(" • "):"No closed-month mix yet",materials=s.topMaterials.length?s.topMaterials.map(([k,n])=>k.toUpperCase()+" "+n.toLocaleString()).join(" • "):"No closed-month mix yet",seg=s.segment;return"<article class='sim-card' data-customer-card='"+esc(v.id)+"'><div class='sim-card-head'><div><span class='tag'>"+esc(seg?.name||className(v))+"</span><h3>"+esc(v.name)+"</h3></div><b>"+money(msrp(v))+" MSRP</b></div><div class='mini-kpis'><div><span>ACTIVE OWNERS</span><b>"+s.activeOwners.toLocaleString()+"</b></div><div><span>REPEAT BUYERS</span><b>"+Math.round(s.retentionRate*100)+"%</b></div><div><span>CONQUEST</span><b>"+Math.round(s.conquestRate*100)+"%</b></div><div><span>CANNIBALIZATION</span><b>"+Math.round(s.cannibalization*100)+"%</b></div><div><span>CUSTOMER PULL</span><b>"+Math.round(s.customerPull*100)+"%</b></div><div><span>SEGMENT AWARENESS</span><b>"+Math.round((seg?.awareness||1)*100)+"%</b></div><div><span>COMPETITIVE INDEX</span><b>"+Math.round(Number(competitive.score||100))+"/100</b></div><div><span>RIVAL PEERS</span><b>"+Number(competitive.peerCount||0)+"</b></div></div><div class='commercial-readout'><div><span>REFERENCE TRANSACTION</span><b>"+money(effective)+"</b></div><div><span>PRICE ELASTICITY EFFECT</span><b>"+(elasticity>=1?"+":"")+((elasticity-1)*100).toFixed(1)+"% demand</b></div></div>"+(!seg?"<div class='create-box compact'><input data-segment-name='"+esc(v.id)+"' maxlength='42' placeholder='New segment name'><button class='btn secondary' data-create-segment='"+esc(v.id)+"'>CREATE SEGMENT • "+money(segmentCreationCost(state))+"</button></div>":"<div class='notice'><b>CREATED SEGMENT:</b> "+esc(seg.name)+" • "+num(seg.lifetimeSales).toLocaleString()+" lifetime sales • "+(seg.validated?"validated by customers":"still proving demand")+".</div>")+"<div class='control-grid-four'><label><span>PRICING STRATEGY</span><select data-price-strategy='"+esc(v.id)+"'>"+Object.entries(PRICING_STRATEGIES).map(([k,x])=>"<option value='"+k+"' "+(p.strategy===k?"selected":"")+">"+x.name+"</option>").join("")+"</select></label><label><span>LAUNCH DISCOUNT</span><input class='management-range' type='range' min='0' max='15' step='1' value='"+p.launchDiscountPct+"' data-launch-discount='"+esc(v.id)+"'><b data-launch-discount-read='"+esc(v.id)+"'>"+p.launchDiscountPct.toFixed(0)+"%</b></label><label><span>FLEET PRICE FLOOR</span><input class='management-range' type='range' min='70' max='100' step='1' value='"+p.fleetFloorPct+"' data-fleet-floor='"+esc(v.id)+"'><b data-fleet-floor-read='"+esc(v.id)+"'>"+p.fleetFloorPct.toFixed(0)+"% MSRP</b></label><label><span>COLOR PLAN</span><select data-color-plan='"+esc(v.id)+"'>"+Object.keys(COLOR_PLANS).map(k=>"<option value='"+k+"' "+(a.colorStrategy===k?"selected":"")+">"+k.toUpperCase()+"</option>").join("")+"</select></label><label><span>INTERIOR MIX</span><select data-material-plan='"+esc(v.id)+"'>"+Object.keys(MATERIAL_PLANS).map(k=>"<option value='"+k+"' "+(a.materialStrategy===k?"selected":"")+">"+k.toUpperCase()+"</option>").join("")+"</select></label></div><details><summary>REGIONAL TRANSACTION PRICING</summary><div class='control-grid-four'>"+unlocked.map(r=>{const d=regionDef(r.id),adj=clamp(num(p.regionalAdjustments[r.id]),-.10,.10)*100;return"<label><span>"+esc(d.name||r.id)+"</span><input class='management-range' type='range' min='-10' max='10' step='1' value='"+adj+"' data-regional-price='"+esc(v.id)+"' data-region='"+esc(r.id)+"'><b data-regional-price-read='"+esc(v.id)+"-"+esc(r.id)+"'>"+(adj>=0?"+":"")+adj.toFixed(0)+"%</b></label>"}).join("")+"</div></details><div class='commercial-readout'><div><span>LAST-MONTH COLOR MIX</span><b>"+colors+"</b></div><div><span>LAST-MONTH INTERIOR MIX</span><b>"+materials+"</b></div></div></article>"}).join(""):"<div class='empty-library'>Release a production vehicle to start building a customer base.</div>")+"</div>";
 root.querySelectorAll("[data-create-segment]").forEach(b=>b.onclick=()=>{const id=b.dataset.createSegment,input=root.querySelector("[data-segment-name='"+CSS.escape(id)+"']"),res=createSegment(state,id,input?.value||"",h.log);if(res.ok){h.save?.();h.rerender?.();h.toast?.("New market segment launched");}else h.toast?.(res.reason==="cash"?"Not enough cash for the segment launch":res.reason==="duplicate"?"That segment name already exists":"Enter a valid new segment name");});
 root.querySelectorAll("[data-price-strategy]").forEach(x=>x.onchange=()=>{const v=state.vehicles.find(v=>v.id===x.dataset.priceStrategy);if(v){ensurePricing(v).strategy=x.value;h.save?.();h.rerender?.();}});
 root.querySelectorAll("[data-launch-discount]").forEach(x=>{x.oninput=()=>{const v=state.vehicles.find(v=>v.id===x.dataset.launchDiscount);if(!v)return;ensurePricing(v).launchDiscountPct=Number(x.value);const r=root.querySelector("[data-launch-discount-read='"+CSS.escape(v.id)+"']");if(r)r.textContent=Number(x.value).toFixed(0)+"%";};x.onchange=()=>{x.oninput();h.save?.();};});
 root.querySelectorAll("[data-fleet-floor]").forEach(x=>{x.oninput=()=>{const v=state.vehicles.find(v=>v.id===x.dataset.fleetFloor);if(!v)return;ensurePricing(v).fleetFloorPct=Number(x.value);const r=root.querySelector("[data-fleet-floor-read='"+CSS.escape(v.id)+"']");if(r)r.textContent=Number(x.value).toFixed(0)+"% MSRP";};x.onchange=()=>{x.oninput();h.save?.();};});
 root.querySelectorAll("[data-color-plan]").forEach(x=>x.onchange=()=>{const v=state.vehicles.find(v=>v.id===x.dataset.colorPlan);if(v){ensureAppearance(v).colorStrategy=x.value;h.save?.();h.rerender?.();}});
 root.querySelectorAll("[data-material-plan]").forEach(x=>x.onchange=()=>{const v=state.vehicles.find(v=>v.id===x.dataset.materialPlan);if(v){ensureAppearance(v).materialStrategy=x.value;h.save?.();h.rerender?.();}});
 root.querySelectorAll("[data-regional-price]").forEach(x=>{x.oninput=()=>{const v=state.vehicles.find(v=>v.id===x.dataset.regionalPrice);if(!v)return;ensurePricing(v).regionalAdjustments[x.dataset.region]=Number(x.value)/100;const key=CSS.escape(v.id)+"-"+CSS.escape(x.dataset.region),r=root.querySelector("[data-regional-price-read='"+key+"']");if(r)r.textContent=(Number(x.value)>=0?"+":"")+Number(x.value).toFixed(0)+"%";};x.onchange=()=>{x.oninput();h.save?.();};});
}
function money(v){v=num(v);const a=Math.abs(v),s=a>=1e9?"$"+(a/1e9).toFixed(2)+"B":a>=1e6?"$"+(a/1e6).toFixed(2)+"M":a>=1e3?"$"+(a/1e3).toFixed(1)+"K":"$"+Math.round(a).toLocaleString();return v<0?"-"+s:s;}
function runSelfTests(){
 const failures=[],check=(ok,msg)=>{if(!ok)failures.push(msg);};const mk=(id,drive,mpg,cls="Family",prop="ice")=>({id,name:id,msrp:22000,productionStatus:"production",active:true,platformId:id+"_p",design:{propulsion:prop},stats:{className:cls,mpg,reliability:80,safety:78,quality:80},customerSatisfaction:82,completedTests:["climate"],rampMonths:1});
 const efficient=mk("efficient","FWD",38),thirsty=mk("thirsty","RWD",12),s={year:1975,month:0,monthsPlayed:60,rep:72,cash:5000000,worldEconomy:{fuelPrice:1.35},marketSystem:{regions:[{id:"us_midwest",unlocked:true}]},platforms:[{id:"efficient_p",drive:"AWD"},{id:"thirsty_p",drive:"RWD"}],vehicles:[efficient,thirsty]};
 ensure(s);const ef=fuelPriceMultiplier(s,efficient,"us_midwest"),tf=fuelPriceMultiplier(s,thirsty,"us_midwest");check(ef>tf,"fuel-price response does not favor efficient vehicles when fuel is expensive");const ec=climateMultiplier(s,efficient,"us_midwest"),tc=climateMultiplier(s,thirsty,"us_midwest");check(ec>tc,"cold-climate fit does not reward AWD / durable vehicles");
 const first=recordRetailSale(s,efficient,"us_midwest",1000);check(first.sales===1000&&first.conquest>0&&s.customerMarket.regions.us_midwest.activeOwners>0,"customer conquest did not create a persistent owner base");s.customerMarket.regions.us_midwest.activeOwners=250000;const repeat=recordRetailSale(s,efficient,"us_midwest",1000);check(repeat.retained>0,"mature owner base did not generate retained buyers");
 const rival=mk("efficient2","FWD",35);rival.msrp=22500;s.platforms.push({id:"efficient2_p",drive:"FWD"});s.vehicles.push(rival);const cannibal=cannibalizationMultiplier(s,efficient);check(cannibal<1&&cannibal>=.60,"same-segment overlap did not create bounded cannibalization");
 const seg=createSegment(s,efficient.id,"Eco Touring",()=>{});check(seg.ok&&segmentForVehicle(s,efficient)?.name==="Eco Touring","new segment creation did not persist a vehicle market position");
 ensurePricing(efficient).strategy="penetration";ensurePricing(efficient).launchDiscountPct=5;const discounted=effectiveRetailPrice(s,efficient,"us_midwest",0);check(discounted<msrp(efficient)&&pricingDemandMultiplier(s,efficient,"us_midwest")>1,"penetration / launch pricing did not lower transaction price and lift demand");
 const beforeMix=ensureAppearance(efficient).mtd,beforeColors=Object.values(beforeMix.colors).reduce((a,b)=>a+num(b),0),beforeMaterials=Object.values(beforeMix.materials).reduce((a,b)=>a+num(b),0);recordAppearanceSales(efficient,"us_midwest",137);const mix=ensureAppearance(efficient).mtd,colors=Object.values(mix.colors).reduce((a,b)=>a+num(b),0)-beforeColors,materials=Object.values(mix.materials).reduce((a,b)=>a+num(b),0)-beforeMaterials;check(colors===137&&materials===137,"color/material mix did not reconcile exactly to sold units");
 const settled=settleMonth(s);check(settled.sales>=2000&&s.customerMarket.regions.us_midwest.mtd.sales===0&&s.customerMarket.regions.us_midwest.lastMonth.sales>=2000,"customer market month close did not roll actual sales");check(ensureAppearance(efficient).lastMonth.colors&&Object.values(ensureAppearance(efficient).lastMonth.colors).reduce((a,b)=>a+b,0)>=137,"appearance mix did not close into last month");
 return{ok:failures.length===0,failures};
}
window.MDXCustomerMarket={VERSION,ensure,ensurePricing,ensureAppearance,climateMultiplier,fuelPriceMultiplier,cannibalizationMultiplier,customerDemandMultiplier,regionalDemandFactors,recordRetailSale,settleMonth,regionSummary,vehicleSummary,segmentForVehicle,segmentDemandMultiplier,segmentCreationCost,createSegment,effectiveRetailPrice,pricingDemandMultiplier,fleetFloorFactor,render,runSelfTests};
})();