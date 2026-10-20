/* INDUSTRIAL MARKET CLEARING
   Physical suppliers may sell to real contracts, internal buyers, and an
   external market bounded by estimated worldwide vehicle production.
   The former sales loop assumed that every factory's unused capacity found
   a buyer every month, causing self-funded industrial dividends and
   manufacturer cash inflation across decades.
   This model conserves the finite outside-market demand pool by category.
*/
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PERIOD=s=>Math.floor(n(s?.year,1970))*12+Math.floor(n(s?.month));
const INVALID_STATUS=new Set(["bankrupt","liquidated","discontinued"]);
const MONTHLY_BASE_VOLUME_1940=250000;
const REPLACEMENT={tires:1.34,brakes:1.25,glass:1.10,lighting:1.28,battery:1.24,steel:1.09,aluminum:1.09,safety:1.06,interior:1.12,electronics:1.16,engine:1.06,transmission:1.06};
function historicalVolume(year){
 const elapsed=Math.max(0,n(year,1970)-1940);
 // Demand growth slows as the global automotive market matures.
 return MONTHLY_BASE_VOLUME_1940*Math.pow(1.053,Math.min(40,elapsed))*Math.pow(1.030,Math.max(0,elapsed-40));
}
function estimatedWorldVolume(state){
 const sales=(Array.isArray(state?.industry)?state.industry:[]).reduce((total,m)=>total+Math.max(0,n(m?.monthSales)),0);
 const player=Math.max(0,n(state?.lastMonthSummary?.units??state?.monthUnitsSold));
 const demand=Math.max(historicalVolume(state?.year),1.20*(sales+player));
 const confidence=clamp(n(state?.worldEconomy?.confidence,1),.68,1.32);
 return Math.max(0,Math.round(demand*confidence));
}
function supplierWeight(c){
 if(!c||INVALID_STATUS.has(String(c.status||"active"))||n(c.factories)<=0)return 0;
 const capacity=Math.max(0,n(c.capacity)),quality=clamp(n(c.quality,70),20,100),reliability=clamp(n(c.reliability,80),20,100);
 const weight=Math.sqrt(capacity)*(0.55+quality/200+reliability/250);
 return Number.isFinite(weight)?Math.max(0,weight):0;
}
function ensure(state){
 const period=PERIOD(state),o=state.industrialExternalMarket||{};
 if(o.period!==period){
  state.industrialExternalMarket={period,worldVolume:estimatedWorldVolume(state),markets:{},audit:[],totalUnits:0,priorMonth:o.period??null};
 }
 return state.industrialExternalMarket;
}
function market(state,industry){
 const o=ensure(state),key=String(industry||"general");
 if(!o.markets[key]){
  const suppliers=(Array.isArray(state.industrialCompanies)?state.industrialCompanies:[]).filter(c=>String(c.industry||"general")===key&&!INVALID_STATUS.has(String(c.status||"active"))&&n(c.factories)>0&&n(state.year,1970)>=n(c.founded,1900));
  const weights=Object.fromEntries(suppliers.map(c=>[String(c.id),supplierWeight(c)]));
  const totalWeight=Object.values(weights).reduce((s,v)=>s+v,0);
  const demand=Math.max(0,Math.round(o.worldVolume*n(REPLACEMENT[key],1.10)));
  o.markets[key]={demand,remaining:demand,allocated:0,weights,totalWeight,companies:{},unserved:0};
 }
 return o.markets[key];
}
function preview(state,c){
 const m=market(state,c?.industry),weight=m.weights[String(c?.id)]||0;
 const fairShare=m.totalWeight>0?Math.floor(m.demand*weight/m.totalWeight):0;
 const already=m.companies[String(c?.id)]||0;
 return {industry:String(c?.industry||"general"),period:PERIOD(state),worldVehicleDemand:ensure(state).worldVolume,categoryDemand:m.demand,
  remaining:m.remaining,weight,totalWeight:m.totalWeight,fairShare,alreadyServed:already,availableShare:Math.max(0,fairShare-already)};
}
function allocate(state,c,wanted){
 if(!state||!c)return 0;
 const desired=Math.max(0,Math.floor(n(wanted))),m=market(state,c.industry),weight=m.weights[String(c.id)]||0;
 const already=m.companies[String(c.id)]||0,share=m.totalWeight>0?Math.floor(m.demand*weight/m.totalWeight):0;
 // Do not borrow other firms' share until those firms have had the chance
 // to fulfil their own demand. Unfilled orders remain unsold this month.
 const available=Math.max(0,Math.min(m.remaining,share-already));
 const granted=Math.min(desired,available);
 m.remaining-=granted;m.allocated+=granted;m.companies[String(c.id)]=already+granted;
 const o=ensure(state);o.totalUnits+=granted;
 if(granted<desired){o.audit.unshift({industry:String(c.industry||""),supplierId:String(c.id),period:o.period,
  proposed:desired,cleared:granted,unsold:desired-granted,reason:weight?"Demand allocated to other suppliers":"Supplier has no active productive capacity"});
  o.audit=o.audit.slice(0,60);}
 return granted;
}
function summary(state){const o=ensure(state);return{period:o.period,worldVehicleDemand:o.worldVolume,totalUnits:o.totalUnits,
  industries:Object.fromEntries(Object.entries(o.markets).map(([k,v])=>[k,{demand:v.demand,sold:v.allocated,unserved:v.remaining}])),audit:o.audit.slice(0,12)};}
G.MDXIndustrialMarket={MONTHLY_BASE_VOLUME_1940,REPLACEMENT,historicalVolume,estimatedWorldVolume,supplierWeight,ensure,preview,allocate,summary};
})();
