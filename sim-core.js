(()=>{
const M=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const period=(year,month)=>Number(year)*12+Number(month||0);
const periodParts=p=>({year:Math.floor(Number(p)/12),month:((Number(p)%12)+12)%12});
const periodLabel=p=>{const x=periodParts(p);return M[x.month]+" "+x.year;};
function hash32(value){let h=2166136261>>>0;for(const ch of String(value??"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function rngSeedHint(state){return [state?.campaignId||"",state?.company||"Motor Dynasty",state?.founder||"",state?.hq||"",Number(state?.year||1970),Number(state?.month||0)].join("|");}
function ensureRngState(state,seedHint){
 if(!state||typeof state!=="object")return null;
 const current=state.rngState&&typeof state.rngState==="object"?state.rngState:{};
 let seed=Number(current.seed);
 if(!Number.isFinite(seed)||seed<=0)seed=hash32(seedHint||rngSeedHint(state))||0x6d2b79f5;
 current.seed=seed>>>0;current.streams=current.streams&&typeof current.streams==="object"?current.streams:{};current.counters=current.counters&&typeof current.counters==="object"?current.counters:{};current.version=1;
 state.rngState=current;return current;
}
function random(state,stream="simulation"){
 const rng=ensureRngState(state),key=String(stream||"simulation");if(!rng)return Math.random();
 let x=Number(rng.streams[key]);if(!Number.isFinite(x))x=hash32(rng.seed+":"+key)||0x6d2b79f5;
 x=(x+0x6D2B79F5)>>>0;rng.streams[key]=x;
 let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;
}
function randomInt(state,stream,min,max){const lo=Math.ceil(Number(min)||0),hi=Math.floor(Number(max)||0);if(hi<=lo)return lo;return lo+Math.floor(random(state,stream)*(hi-lo+1));}
function randomId(state,prefix="id",stream="ids"){
 const rng=ensureRngState(state),key=String(stream||"ids");if(!rng)return prefix+"_"+Date.now()+"_"+Math.floor(Math.random()*99999);
 const n=(Number(rng.counters[key])||0)+1;rng.counters[key]=n;const token=hash32(rng.seed+":"+key+":"+n).toString(36);return String(prefix)+"_"+n.toString(36)+"_"+token;
}
const ECONOMIC_INDEX_DEFS=Object.freeze({
 general:Object.freeze({baseYear:1970,base:.42,growth:.032,min:.14,max:2.60,label:"General development / program costs"}),
 manufacturing:Object.freeze({baseYear:1970,base:.30,growth:.037,min:.10,max:2.45,label:"Vehicle and powertrain manufacturing"}),
 wages:Object.freeze({baseYear:1970,base:1,growth:.032,min:.18,max:18,label:"Plant labor market"}),
 corporatePayroll:Object.freeze({baseYear:1970,base:1,growth:.030,min:.18,max:16,label:"Corporate and subsidiary payroll"}),
 construction:Object.freeze({baseYear:1970,base:1,growth:.032,min:.18,max:18,label:"Industrial construction and capacity"}),
 retailOperations:Object.freeze({baseYear:1970,base:1,growth:.028,min:.18,max:14,label:"Dealer / retail operations"}),
 industrialAssets:Object.freeze({baseYear:1970,base:1,growth:.030,min:.18,max:16,label:"Industrial asset acquisition"}),
 marketing:Object.freeze({baseYear:1970,base:1,growth:.032,min:.18,max:18,label:"Marketing and commercial programs"}),
 executiveComp:Object.freeze({baseYear:1970,base:1,growth:.034,min:.18,max:20,label:"Executive compensation"}),
 vehiclePrice:Object.freeze({baseYear:1970,base:1,growth:.033,min:.18,max:18,label:"Vehicle price norm"}),
 research:Object.freeze({baseYear:1970,base:1,growth:.032,min:.18,max:18,label:"Research and tooling"})
});
function economicIndex(category="general",year=1970){
 const def=ECONOMIC_INDEX_DEFS[category]||ECONOMIC_INDEX_DEFS.general,y=Number.isFinite(Number(year))?Number(year):def.baseYear,delta=y-def.baseYear,raw=def.base*Math.pow(1+def.growth,delta);
 return clamp(raw,def.min,def.max);
}
function economicRelativeIndex(category="general",year=1970,baseYear=1970){
 const now=economicIndex(category,year),base=economicIndex(category,baseYear);return base>0?now/base:1;
}
function convertNominal(value,fromYear,toYear,category="vehiclePrice"){
 const v=Number(value||0),from=economicIndex(category,fromYear),to=economicIndex(category,toYear);return from>0?v*(to/from):v;
}
function economicIndexSnapshot(year=1970){
 const out={year:Number(year)};for(const key of Object.keys(ECONOMIC_INDEX_DEFS))out[key]=economicIndex(key,year);return out;
}
function ensureCalendarContract(c,year,month){
 const now=period(year,month),term=Math.max(1,Math.round(Number(c.termMonths||12)));
 let start=Number.isFinite(Number(c.startPeriod))?Number(c.startPeriod):null;
 if(start==null&&Number.isFinite(Number(c.startYear))&&Number.isFinite(Number(c.startMonth)))start=period(c.startYear,c.startMonth);
 if(start==null&&Number.isFinite(Number(c.endPeriod)))start=Number(c.endPeriod)-term;
 if(start==null){const oldRemain=Math.max(0,Number(c.monthsRemaining??term));start=now-Math.max(0,term-oldRemain);}
 c.termMonths=term;c.startPeriod=start;c.endPeriod=Number.isFinite(Number(c.endPeriod))?Number(c.endPeriod):start+term;
 c.startYear=periodParts(start).year;c.startMonth=periodParts(start).month;
 c.endYear=periodParts(c.endPeriod).year;c.endMonth=periodParts(c.endPeriod).month;
 c.monthsRemaining=c.status==="complete"||c.status==="terminated"?0:Math.max(0,c.endPeriod-now);
 return c;
}
function contractClock(c,year,month){
 ensureCalendarContract(c,year,month);const now=period(year,month),remaining=Math.max(0,c.endPeriod-now),elapsed=clamp(now-c.startPeriod,0,c.termMonths);
 return{startPeriod:c.startPeriod,endPeriod:c.endPeriod,startLabel:periodLabel(c.startPeriod),endLabel:periodLabel(c.endPeriod),termMonths:c.termMonths,monthsRemaining:remaining,yearsRemaining:remaining/12,elapsedMonths:elapsed,active:c.status==="active"&&now<c.endPeriod,finalMonth:now===c.endPeriod-1};
}
function closeContractMonth(c,year,month){
 const x=contractClock(c,year,month),next=period(year,month)+1;c.monthsRemaining=Math.max(0,c.endPeriod-next);
 if(c.status==="active"&&next>=c.endPeriod)c.status="complete";
 return{...x,monthsRemaining:c.monthsRemaining,completed:c.status==="complete"};
}
function firstMonthCommitment(c,year,month,day){
 ensureCalendarContract(c,year,month);const now=period(year,month),first=now===c.startPeriod,startDay=clamp(Number(c.startDay||1),1,30),days=first?Math.max(1,31-startDay):30;
 return Math.max(1,Math.round(Number(c.monthlyUnits||0)*days/30));
}
function corporateRoute(target,companies=[]){const owner=target?.ownerId?(companies||[]).find(x=>x.id===target.ownerId)||null:null,ownedByPlayer=!!target?.acquired;return{owner,ownerId:owner?.id||null,ownerName:owner?.name||null,ownedByPlayer,independent:!owner&&!ownedByPlayer,ownershipLabel:ownedByPlayer?"YOUR GROUP":owner?"OWNED BY "+String(owner.name||"").toUpperCase():target?.publicCompany?"PUBLIC COMPANY":"PRIVATE COMPANY",acquisitionCounterparty:owner?.name||null,mergerCounterparty:owner?.name||null};}
function archiveMergedCompany(m,year,month){if(!m)return null;const snapshot={year:Number(year||0),month:Number(month||0),valuation:Number(m.valuation||0),cash:Number(m.cash||0),debt:Number(m.debt||0),employees:Number(m.employees||0),factories:Number(m.factories||0),dealers:Number(m.dealers||0),franchiseDealers:Number(m.franchiseDealers||0),companyStores:Number(m.companyStores||0),marketShare:Number(m.marketShare||0),inventoryValue:Number(m.inventoryValue||0),monthSales:Number(m.monthSales||0),monthRevenue:Number(m.monthRevenue||0),monthProfit:Number(m.monthNetProfit??m.monthProfit??0),rd:Number(m.rd||0),patents:Number(m.patents||0),modelCount:Number(m.modelCount||0),brands:Number(m.brands||0),activeProducts:(m.aiCars||[]).filter(x=>x.active).length,activeEngines:(m.aiEngines||[]).filter(x=>x.active).length,activePlatforms:(m.aiPlatforms||[]).filter(x=>x.active).length};m.mergerSnapshot=snapshot;m.cash=0;m.debt=0;m.employees=0;m.factories=0;m.dealers=0;m.franchiseDealers=0;m.companyStores=0;m.marketShare=0;m.inventoryValue=0;m.monthSales=0;m.monthRevenue=0;m.monthProfit=0;m.monthOperatingProfit=0;m.monthNetProfit=0;m.monthOperatingCashFlow=0;m.monthNetCashFlow=0;m.monthProductionCash=0;m.monthInventoryWorkingCapital=0;m.factoryUtilization=0;m.productionFundingFactor=0;(m.aiCars||[]).forEach(x=>{x.active=false;x.productionPlan=0;x.lastProduced=0;x.lastSales=0;x.lastDemand=0;});(m.aiProjects||[]).forEach(x=>{if(x.status==="active")x.status="absorbed";});(m.aiEngines||[]).forEach(x=>{if(x.active)x.active=false;});(m.aiPlatforms||[]).forEach(x=>{if(x.active)x.active=false;});m.externalPowertrainInventory={};return snapshot;}
function finiteNumber(...values){for(const value of values){if(value===null||value===undefined||value==="")continue;const n=Number(value);if(Number.isFinite(n))return n;}return null;}
function normalizeReputation(value,fallback=20){
 const n=finiteNumber(value),f=finiteNumber(fallback,20)??20;
 return clamp(n===null?f:n,1,100);
}
function adjustReputation(state,delta,meta={}){
 if(!state||typeof state!=="object")return{before:normalizeReputation(null,meta.fallback),after:normalizeReputation(null,meta.fallback),requestedDelta:0,appliedDelta:0};
 const fallback=finiteNumber(meta.fallback,20)??20,before=normalizeReputation(state.rep,fallback),requestedDelta=finiteNumber(delta,0)??0,after=clamp(before+requestedDelta,1,100),appliedDelta=after-before;
 state.rep=after;
 if(meta.record!==false&&Math.abs(appliedDelta)>.000001){
  state.reputationLedger=Array.isArray(state.reputationLedger)?state.reputationLedger:[];
  state.reputationLedger.unshift({year:Number(state.year||1970),month:Number(state.month||0),day:Number(state.day||1),before,after,delta:appliedDelta,requestedDelta,reason:String(meta.reason||"Reputation change"),source:String(meta.source||"system"),vehicleId:meta.vehicleId||null,vehicleName:meta.vehicleName||null});
  if(state.reputationLedger.length>120)state.reputationLedger.length=120;
 }
 return{before,after,requestedDelta,appliedDelta};
}
function normalizeVehicleStats(vehicle={},currentStats=null){
 const source=vehicle&&typeof vehicle==="object"?vehicle:{},existing=currentStats&&typeof currentStats==="object"?currentStats:(source.stats&&typeof source.stats==="object"?source.stats:{});
 const unitCost=Math.max(1,finiteNumber(existing.unitCost,existing.manufacturingUnitCost,source.currentUnitCost,source.cost,source.unitCost,1200)??1200),manufacturingUnitCost=Math.max(1,finiteNumber(existing.manufacturingUnitCost,source.currentUnitCost,source.cost,existing.unitCost,unitCost)??unitCost),reliability=clamp(finiteNumber(existing.reliability,existing.rel,source.reliability,60)??60,1,100),quality=clamp(finiteNumber(existing.quality,source.quality,reliability,60)??60,1,100),mpg=clamp(finiteNumber(existing.mpg,source.mpg,20)??20,5,120),hp=Math.max(1,finiteNumber(existing.hp,source.hp,80)??80);
 return{...existing,unitCost,manufacturingUnitCost,hp,rel:reliability,reliability,quality,mpg,className:String(existing.className||source.segment||source.className||"Other")};
}
function repairNonFiniteCash(state,fallback=0){
 if(!state||typeof state!=="object")return{repaired:false,value:0,source:"none"};
 const before=state.cash,current=finiteNumber(before);if(current!==null){state.cash=current;return{repaired:false,value:current,source:"cash"};}
 let value=null,source="";for(const row of (Array.isArray(state.cashLedger)?state.cashLedger:[])){const n=finiteNumber(row?.ending);if(n!==null){value=n;source="cash ledger";break;}}
 if(value===null){const n=finiteNumber(state.lastMonthSummary?.closingCash);if(n!==null){value=n;source="last month close";}}
 if(value===null){const n=finiteNumber(state.monthOpeningCash);if(n!==null){value=n;source="month opening cash";}}
 if(value===null){value=finiteNumber(fallback)??0;source="campaign cash fallback";}
 state.cash=value;if(finiteNumber(state.monthOpeningCash)===null)state.monthOpeningCash=value;state.cashIntegrityRepair={repaired:true,source,value,year:Number(state.year||1970),month:Number(state.month||0),day:Number(state.day||1),invalidValue:before==null?null:String(before)};return{repaired:true,value,source};
}
function mergerLiquidityBridge(input={}){
 const hasMergedOperations=!!input.hasMergedOperations,cash=finiteNumber(input.cash)??0,valuation=Math.max(0,finiteNumber(input.valuation)??0);if(!hasMergedOperations||valuation<=0)return{draw:0,targetCash:0,maxDraw:0};
 const targetCash=clamp(valuation*.02,1000000,15000000),maxDraw=clamp(valuation*.05,2000000,25000000),shortfall=Math.max(0,targetCash-cash),draw=Math.min(shortfall,maxDraw);return{draw,targetCash,maxDraw};
}
function channelAllocation(input){
 const factory=Math.max(0,Math.floor(Number(input.factoryInventory||0))),difficulty=input.difficulty||"normal",daysTarget=difficulty==="casual"?55:difficulty==="realistic"?32:42,regions=input.regions||[];
 const rows=regions.map(r=>{const demand=Math.max(0,Number(r.monthlyDemand||0)),stock=Math.max(0,Number(r.ownDealer||0)+Number(r.partnerDealer||0)+Number(r.companyStore||0)),transit=Math.max(0,Number(r.inTransit||0)),desired=demand*daysTarget/30,short=Math.max(0,desired-stock-transit),velocity=Math.max(1,Number(r.recentSales||demand*.75)),priority=short*(1+Math.min(1.5,velocity/Math.max(1,demand)));return{...r,demand,desired,short,priority};});
 const total=rows.reduce((a,r)=>a+r.priority,0);let left=factory;
 const allocations=rows.map((r,i)=>{const qty=total<=0?0:(i===rows.length-1?Math.min(left,Math.round(factory*r.priority/total)):Math.min(left,Math.floor(factory*r.priority/total)));left-=qty;const partnerCap=Math.max(0,Number(r.partnerCapacity||0)),ownCap=Math.max(0,Number(r.ownCapacity||0)),corpCap=Math.max(0,Number(r.companyCapacity||0)),capTotal=partnerCap+ownCap+corpCap||1,partner=Math.round(qty*partnerCap/capTotal),company=Math.round(qty*corpCap/capTotal),own=Math.max(0,qty-partner-company);return{id:r.id,qty,partner,company,own,desired:Math.round(r.desired),shortage:Math.round(r.short)};});
 return{allocations,unallocated:left,targetDays:daysTarget};
}
const PROGRAM_PACES={
 lean:{id:"lean",label:"LEAN",speed:.72,spend:.70,quality:-1.0,description:"Protect cash; slower engineering and slightly weaker validation outcome."},
 balanced:{id:"balanced",label:"BALANCED",speed:1,spend:1,quality:0,description:"Baseline schedule, spend and engineering outcome."},
 rush:{id:"rush",label:"RUSH",speed:1.45,spend:1.55,quality:-2.0,description:"Pull the launch forward with heavy daily burn and more release risk."},
 validate:{id:"validate",label:"VALIDATE",speed:.82,spend:1.25,quality:2.5,description:"Spend more time and money on validation for a stronger release."}
};
function programPace(id){return PROGRAM_PACES[id]||PROGRAM_PACES.balanced;}
function programForecast(p={}){
 const pace=programPace(p.pace),total=Math.max(1,Number(p.totalDays||1)),remaining=Math.max(0,Number(p.daysRemaining||0)),spent=Math.max(0,Number(p.spent||0)),baseDaily=Math.max(0,Number(p.budget||0))/total,dailySpend=baseDaily*pace.spend,calendarDays=Math.ceil(remaining/Math.max(.01,pace.speed)),forecast=spent+calendarDays*dailySpend,qualityAccrued=Number(p.qualityAdjustmentAccrued||0),projectedQualityDelta=qualityAccrued+pace.quality*(remaining/total);
 return{pace,dailySpend,calendarDays,forecast,authorizedBudget:Number(p.budget||0),overrun:forecast-Number(p.budget||0),qualityAccrued,projectedQualityDelta};
}
function profitabilityDiagnostics(input){
 const s=input||{},rows=[];
 const neg=(label,val,why)=>{val=Math.max(0,Number(val||0));if(val>0)rows.push({type:"cost",label,value:-val,why});};
 const pos=(label,val,why)=>{val=Math.max(0,Number(val||0));if(val>0)rows.push({type:"offset",label,value:val,why});};
 pos("Vehicle contribution",Number(s.vehicleRevenue??s.revenue??0)-Number(s.vehicleCogs??s.cogs??0)-Number(s.warranty||0)-Number(s.productMarketing||0),"recognized vehicle revenue less recognized COGS, warranty and model marketing");
 pos("Engine contracts",s.engineSupplyProfit,"recurring OEM engine-supply gross profit");pos("Transmission contracts",s.transmissionSupplyProfit,"recurring OEM transmission-supply gross profit");
 pos("Licensing + finance",Number(s.royaltyIncome||s.royalties||0)+Number(s.financeArmProfit||s.financeProfit||0),"technology royalties and captive-finance contribution");const subEarn=Number(s.subsidiaryEarnings||0);if(subEarn>=0)pos("Owned subsidiary earnings",subEarn,"ownership share of separately operated automotive-subsidiary net profit");else neg("Owned subsidiary losses",-subEarn,"ownership share of separately operated automotive-subsidiary net losses");const indEarn=Number(s.industrialEarnings||0);if(indEarn>=0)pos("Industrial holding earnings",indEarn,"ownership share of operating supplier and industrial-company net profit");else neg("Industrial holding losses",-indEarn,"ownership share of supplier and industrial-company net losses");
 neg("Factory + payroll",Number(s.labor||0)+Number(s.plant||0)+Number(s.departmentPayroll||0)+Number(s.baseOverhead||0),"plant labor, factory operations, corporate departments and base overhead");
 neg("Development",s.development,"engineering, testing and launch programs");neg("One-time operating items",s.oneTimeOperatingItems,"recalls, one-time marketing and motorsport-entry expense");
 neg("Commercial overhead",Number(s.regionalMarketing||0)+Number(s.companyRetailCost||0)+Number(s.discretionaryBudget||0)+Number(s.commercialExpansionSpend||0),"regional marketing, company retail network, dealer expansion and discretionary budget programs");neg("Inventory carrying cost",s.inventoryCarryingCost,"financing/storage pressure from stale unsold inventory");
 neg("Logistics",s.logistics,"vehicle freight and logistics");
 neg("Interest",s.interest,"cost of parent-company borrowing");neg("Public-company compliance",s.publicCompliance,"recurring reporting, audit, governance and legal administration for a public company");neg("Regulatory penalties",Number(s.regulatoryPenalties||s.penalties||0),"itemized enforcement costs from selling products below an active jurisdictional rule");neg("Corporate transaction costs",s.nonOperatingExpenseItems,"M&A advisory, diligence and equity-market preparation costs");neg("Motorsport",s.motorsportCost,"active racing programs");neg("Licensing royalties paid",s.royaltyExpense,"per-unit royalties on licensed engine and transmission production");
 const target=Number(s.netProfit??s.profit??0),known=rows.reduce((a,r)=>a+Number(r.value||0),0),other=target-known;if(Math.abs(other)>1)rows.push({type:other>=0?"offset":"cost",label:"Other operating / corporate items",value:other,why:"remaining reported items required to reconcile exactly to net profit"});rows.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
 return rows;
}
function cashReconciliation(input={}){
 const s=input.summary||{},dailyRows=Array.isArray(input.dailyRows)?input.dailyRows:[],transactionRows=Array.isArray(input.transactionRows)?input.transactionRows:[],openingCash=Number(input.openingCash||0),closingCash=Number(input.closingCash||0),cashChange=closingCash-openingCash;
 const dailyLedgerNet=dailyRows.reduce((a,x)=>a+Number(x.net||0),0),dailyDevelopment=dailyRows.reduce((a,x)=>a+Number(x.development||0),0),dailyCapital=dailyRows.reduce((a,x)=>a+Number(x.capital||0),0),dailyCommercial=dailyRows.reduce((a,x)=>a+Number(x.commercialExpansion||0),0);
 const transactionSums=transactionRows.reduce((a,x)=>{const k=String(x.category||"otherTransaction");a[k]=Number(a[k]||0)+Number(x.amount||0);return a;},{}),managementCash=Object.values(transactionSums).reduce((a,v)=>a+Number(v||0),0);
 const totalDevelopment=Math.max(dailyDevelopment,Number(s.development||0)),monthEndAdjustments=cashChange-dailyLedgerNet,offLedgerDevelopment=Math.max(0,totalDevelopment-dailyDevelopment),offLedgerCapital=Math.max(0,Number(s.capitalSpend||0)-dailyCapital),offLedgerCommercial=Math.max(0,Number(s.commercialExpansionSpend||0)-dailyCommercial);
 const dailySubsidiaryAdvances=dailyRows.reduce((a,x)=>a+Number(x.subsidiaryDistribution||0),0);
 const namedMonthEnd=Number(s.integrationNet||0)+Number(s.subsidiaryContribution||0)-Number(s.companyRetailCost||0)-Number(s.regionalMarketing||0)-Number(s.regulatoryPenalties||0)+Number(s.financeArmProfit||0)-Number(s.motorsportCost||0)+Number(s.royaltyIncome||0)-Number(s.royaltyExpense||0)-Number(s.fleetPenaltyCost||0)-Number(s.laborStrikeCost||0)-offLedgerDevelopment-offLedgerCapital-offLedgerCommercial+managementCash-dailySubsidiaryAdvances;
 const otherDailyOperations=dailyRows.reduce((a,x)=>a+(Number.isFinite(Number(x.net))?Number(x.net)-Number(x.vehicle||0)-Number(x.engine||0)-Number(x.transmission||0)-Number(x.subsidiaryDistribution||0)+Number(x.fixed||0)+Number(x.budget||0)+Number(x.development||0)+Number(x.capital||0)+Number(x.commercialExpansion||0):0),0);
 const otherMonthEnd=monthEndAdjustments-namedMonthEnd,cashBreakdown={vehicle:dailyRows.reduce((a,x)=>a+Number(x.vehicle||0),0),engine:dailyRows.reduce((a,x)=>a+Number(x.engine||0),0),transmission:dailyRows.reduce((a,x)=>a+Number(x.transmission||0),0),otherDailyOperations,fixed:-dailyRows.reduce((a,x)=>a+Number(x.fixed||0),0),budget:-dailyRows.reduce((a,x)=>a+Number(x.budget||0),0),development:-totalDevelopment,capital:-Number(s.capitalSpend||0),commercialExpansion:-Number(s.commercialExpansionSpend||0),...transactionSums,integration:Number(s.integrationNet||0),subsidiaries:Number(s.subsidiaryContribution||0),companyRetail:-Number(s.companyRetailCost||0),regionalMarketing:-Number(s.regionalMarketing||0),regulatory:-Number(s.regulatoryPenalties||0),financeArm:Number(s.financeArmProfit||0),motorsport:-Number(s.motorsportCost||0),royalties:Number(s.royaltyIncome||0)-Number(s.royaltyExpense||0),fleetPenalties:-Number(s.fleetPenaltyCost||0),laborStrikes:-Number(s.laborStrikeCost||0),otherMonthEnd};
 const cashReconciliationResidual=cashChange-Object.values(cashBreakdown).reduce((a,v)=>a+Number(v||0),0),operatingTransactionKeys=["quality","marketing","motorsportEntry","technology_royalty","contract_penalty"],nonOperatingExpenseKeys=["transactionFees","equityFees","strategic_partnership"],oneTimeOperatingNet=operatingTransactionKeys.reduce((a,k)=>a+Number(transactionSums[k]||0),0),nonOperatingExpenseNet=nonOperatingExpenseKeys.reduce((a,k)=>a+Number(transactionSums[k]||0),0),operatingCashKeys=["vehicle","engine","transmission","transmissionProcurement","supplierExternal","otherDailyOperations","fixed","budget","development","commercialExpansion","companyRetail","regionalMarketing","regulatory","financeArm","motorsport","royalties","fleetPenalties","laborStrikes",...operatingTransactionKeys],operatingCashFlow=operatingCashKeys.reduce((a,k)=>a+Number(cashBreakdown[k]||0),0),capitalCashFlow=Number(cashBreakdown.capital||0)+Number(cashBreakdown.capitalInvestment||0)+Number(cashBreakdown.commercialInvestment||0),investingCashFlow=capitalCashFlow+["acquisition","investment","assetSale","acquiredCash","transactionFees","subsidiary_sale","dealEscrow","dealEscrowRefund","procurement_deposit","procurement_return"].reduce((a,k)=>a+Number(cashBreakdown[k]||0),0),financingCashFlow=["financing","debtService","equityFinancing","equityFees","dividends"].reduce((a,k)=>a+Number(cashBreakdown[k]||0),0),internalKeys=["internalSubsidiaryTransfer","subsidiary_distribution","subsidiary_dividend","industrial_dividend","intercompany_transfer","capital_injection","intercompany_loan"],internalCashFlow=internalKeys.reduce((a,k)=>a+Number(cashBreakdown[k]||0),0),freeCashFlow=operatingCashFlow+capitalCashFlow;
 return{cashChange,dailyLedgerNet,monthEndAdjustments,transactionSums,managementCash,otherMonthEnd,cashBreakdown,cashReconciliationResidual,oneTimeOperatingNet,nonOperatingExpenseNet,operatingCashFlow,capitalCashFlow,investingCashFlow,financingCashFlow,internalCashFlow,freeCashFlow};
}
function settleDistribution(input={}){
 const netProfit=Number(input.netProfit||0),pct=clamp(Number(input.distributionPct||0)/100,0,1),ownership=clamp(Number(input.ownershipPct??100)/100,0,1),cashBefore=Number(input.subsidiaryCash||0),parentCashBefore=Number(input.parentCash||0),reserve=Math.max(0,Number(input.reserveTarget||0)),eligible=Math.max(0,netProfit)*ownership*pct,available=Math.max(0,cashBefore-reserve),amount=Math.min(eligible,available);let reason="";
 if(netProfit<=0)reason="Negative earnings";else if(pct<=0)reason="Management retained earnings";else if(available<=0)reason=String(input.reserveReason||"Cash reserve protection");else if(amount+1<eligible)reason=String(input.reserveReason||"Working-capital requirement");
 return{netProfit,distributionPct:pct*100,ownershipPct:ownership*100,grossEligibleDistribution:eligible,amount,subsidiaryCashBefore:cashBefore,subsidiaryCashAfter:cashBefore-amount,parentCashBefore,parentCashAfter:parentCashBefore+amount,reserveTarget:reserve,reason};
}
function distributionSummary(rows=[],year=1970,month=0,day=1){
 const nowSerial=period(year,month)*30+clamp(Number(day||1),1,30)-1,nowPeriod=period(year,month),ytdStart=period(year,0)*30;
 const paid=(rows||[]).filter(x=>Number(x.amount||0)>0&&["subsidiary_distribution","subsidiary_dividend","industrial_dividend"].includes(String(x.category||"")));
 const sum=f=>paid.filter(f).reduce((a,x)=>a+Number(x.amount||0),0),serial=x=>Number.isFinite(Number(x.serialDay))?Number(x.serialDay):(Number(x.period??period(x.year,x.month))*30+clamp(Number(x.day||1),1,30)-1);
 const byCompany={};for(const x of paid){const k=String(x.companyId||x.targetId||x.companyName||x.label||"unknown");if(!byCompany[k])byCompany[k]={companyId:k,companyName:x.companyName||x.subsidiaryName||x.label||k,amount:0,count:0};byCompany[k].amount+=Number(x.amount||0);byCompany[k].count++;}
 return{today:sum(x=>serial(x)===nowSerial),week:sum(x=>serial(x)>=nowSerial-6&&serial(x)<=nowSerial),month:sum(x=>Number(x.period??period(x.year,x.month))===nowPeriod),ytd:sum(x=>serial(x)>=ytdStart&&serial(x)<=nowSerial),lifetime:sum(()=>true),byCompany:Object.values(byCompany).sort((a,b)=>b.amount-a.amount)};
}
function reconcileLegacySubsidiaryCash(input={}){
 const subsidiaryCash=Number(input.subsidiaryCash),companyCash=Number(input.companyCash),lastDividend=Math.max(0,Number(input.lastDividend||0));
 if(!Number.isFinite(subsidiaryCash)||!Number.isFinite(companyCash))return{repaired:false,canonicalCash:Number.isFinite(companyCash)?companyCash:subsidiaryCash,reason:"Insufficient legacy cash evidence"};
 const delta=companyCash-subsidiaryCash,tolerance=Math.max(1,lastDividend*.00001);
 if(lastDividend>0&&Math.abs(delta-lastDividend)<=tolerance)return{repaired:true,canonicalCash:subsidiaryCash,companyCashBefore:companyCash,subsidiaryCashBefore:subsidiaryCash,matchedAmount:lastDividend,reason:"Legacy operating-company cash was still pre-distribution; reconciled to the post-distribution subsidiary cash mirror"};
 return{repaired:false,canonicalCash:companyCash,companyCashBefore:companyCash,subsidiaryCashBefore:subsidiaryCash,matchedAmount:0,reason:"No exact legacy transfer evidence; cash left unchanged"};
}
function intercompanyElimination(input={}){
 const units=Math.max(0,Number(input.units||0)),transferPrice=Math.max(0,Number(input.transferPrice||0)),unitCost=Math.max(0,Number(input.unitCost||0)),ownership=clamp(Number(input.ownershipPct??100)/100,0,1),sales=units*transferPrice,cost=units*unitCost,gross=sales-cost;
 return{units,intercompanySales:sales,supplierRevenue:sales,buyerCogs:sales,productionCost:cost,supplierGrossProfit:gross,consolidatedRevenueElimination:-sales,consolidatedCogsElimination:-sales,consolidatedProfitImpact:0,minorityEconomicShare:gross*(1-ownership)};
}
function rescaleProgramTimeline(totalDays,daysRemaining,scale=1,floor=1){const oldTotal=Math.max(1,Number(totalDays||daysRemaining||1)),oldRemaining=clamp(Number(daysRemaining??oldTotal),0,oldTotal),progress=clamp(1-oldRemaining/oldTotal,0,1),newTotal=Math.max(Number(floor||1),Math.ceil(oldTotal*Math.max(.05,Number(scale||1)))),newRemaining=oldRemaining<=0?0:Math.max(1,Math.ceil(newTotal*(1-progress)));return{totalDays:newTotal,daysRemaining:newRemaining,progress};}
function inventoryAgeBuckets(batches,currentPeriod){
 const out={"0-30":0,"31-60":0,"61-90":0,"91-120":0,"120+":0};
 for(const b of batches||[]){const age=Math.max(0,(Number(currentPeriod)-Number(b.bornPeriod||currentPeriod))*30),qty=Math.max(0,Number(b.qty||0)),k=age<=30?"0-30":age<=60?"31-60":age<=90?"61-90":age<=120?"91-120":"120+";out[k]+=qty;}return out;
}
function runSelfTests(){
 const failures=[],assert=(ok,msg)=>{if(!ok)failures.push(msg);};
 const c={status:"active",termMonths:60,startYear:1972,startMonth:2,startDay:10,monthlyUnits:1300};
 ensureCalendarContract(c,1972,2);assert(c.endPeriod===period(1977,2),"60-month end period");
 for(let i=0;i<59;i++){const p=period(1972,2)+i,x=periodParts(p);const r=closeContractMonth(c,x.year,x.month);if(i<59)assert(c.status==="active","contract active through month "+(i+1));}
 const p59=periodParts(period(1972,2)+59);closeContractMonth(c,p59.year,p59.month);assert(c.status==="complete","contract completes only after month 60");
 const p={status:"active",termMonths:60,startYear:1972,startMonth:2,startDay:10,monthlyUnits:1300};assert(firstMonthCommitment(p,1972,2,10)===910,"first month prorates 21/30");const legacy={status:"active",termMonths:60,startYear:1972,startMonth:2,monthsRemaining:5};const repaired=contractClock(legacy,1973,2);assert(repaired.monthsRemaining===48&&repaired.endLabel==="MAR 1977","legacy corrupted mutable timer repaired from original start date");
 const migrated=rescaleProgramTimeline(50,25,.70,10);assert(migrated.totalDays===35&&migrated.daysRemaining===18&&Math.abs(migrated.progress-.5)<.001,"program timeline migration preserves completion percentage");const atlas={id:"atlas",name:"Atlas Motor Corporation"},briar={id:"briar",name:"Briar Motor Works",ownerId:"atlas",status:"acquired_by_ai"},route=corporateRoute(briar,[atlas,briar]),privateRoute=corporateRoute({id:"private",name:"Private Motors",publicCompany:false},[atlas,briar]);assert(route.ownerId==="atlas"&&route.ownerName==="Atlas Motor Corporation","controlled-company M&A routes to actual parent");assert(route.ownershipLabel==="OWNED BY ATLAS MOTOR CORPORATION","controlled-company ownership label uses actual parent");assert(privateRoute.ownershipLabel==="PRIVATE COMPANY"&&privateRoute.independent,"independent private company never exposes internal AI ownership wording");const absorbed={cash:50000000,debt:60000000,employees:4000,factories:2,dealers:300,franchiseDealers:298,companyStores:2,marketShare:2.5,inventoryValue:7000000,monthSales:900,monthRevenue:4000000,monthProfit:300000,aiCars:[{active:true,productionPlan:500,lastProduced:480,lastSales:450,lastDemand:520}],aiEngines:[{active:true}],aiPlatforms:[{active:true}],aiProjects:[{status:"active"}],externalPowertrainInventory:{c1:200}},absorbedSnap=archiveMergedCompany(absorbed,1975,3);assert(absorbedSnap.cash===50000000&&absorbedSnap.debt===60000000&&absorbedSnap.activeProducts===1,"merger archive preserves pre-close balance sheet");assert(absorbed.cash===0&&absorbed.debt===0&&absorbed.employees===0&&absorbed.factories===0&&absorbed.dealers===0&&absorbed.aiCars.every(x=>!x.active),"merged company live operating balances are retired");
 const repState={rep:null,year:1973,month:11,day:19},repFix=adjustReputation(repState,1.25,{fallback:20,reason:"Regression launch",source:"launch"});assert(normalizeReputation(null,20)===20&&normalizeReputation("N/A",20)===20,"null / non-numeric reputation did not recover to the campaign baseline");assert(Math.abs(repFix.before-20)<.001&&Math.abs(repState.rep-21.25)<.001&&repState.reputationLedger.length===1,"reputation adjustment did not recover poisoned state and record the applied change");
 const malformedStats=normalizeVehicleStats({segment:"Family",cost:2400,reliability:74,hp:125},{unitCost:2400});assert(Number.isFinite(malformedStats.quality)&&Number.isFinite(malformedStats.mpg)&&malformedStats.className==="Family","merged vehicle stats normalization must fill demand-critical fields");const poisonedCash={cash:null,monthOpeningCash:null,cashLedger:[{ending:null},{ending:4321000}],year:1972,month:0,day:17},cashRepair=repairNonFiniteCash(poisonedCash,6000000);assert(cashRepair.repaired&&cashRepair.value===4321000&&poisonedCash.cash===4321000,"non-finite cash repair must recover the latest finite ledger balance");
 const plan=channelAllocation({difficulty:"casual",factoryInventory:3000,regions:[{id:"a",monthlyDemand:1800,ownDealer:200,partnerDealer:100,companyStore:0,inTransit:0,recentSales:1500,partnerCapacity:1500,ownCapacity:500,companyCapacity:0},{id:"b",monthlyDemand:900,ownDealer:500,partnerDealer:0,companyStore:0,inTransit:100,recentSales:700,partnerCapacity:0,ownCapacity:600,companyCapacity:0}]});assert(plan.allocations.reduce((a,x)=>a+x.qty,0)<=3000,"allocation never exceeds factory inventory");assert(plan.allocations[0].partner>plan.allocations[0].own,"strong partner gets meaningful stock");
 const rec=cashReconciliation({openingCash:10000000,closingCash:12000000,dailyRows:[{net:-500000,vehicle:300000,engine:0,fixed:300000,budget:200000,development:300000,capital:0,commercialExpansion:0}],transactionRows:[{category:"financing",amount:2500000}],summary:{capitalSpend:0,commercialExpansionSpend:0}});assert(Math.abs(rec.cashReconciliationResidual)<1,"cash bridge reconciles management financing");assert(rec.cashBreakdown.financing===2500000,"management transaction categorized");assert(rec.operatingCashFlow===-500000,"financing excluded from operating cash flow");const devRec=cashReconciliation({openingCash:10000000,closingCash:9600000,dailyRows:[{net:-300000,development:300000}],transactionRows:[],summary:{development:400000,capitalSpend:0,commercialExpansionSpend:0}});assert(Math.abs(devRec.cashReconciliationResidual)<1&&devRec.cashBreakdown.development===-400000,"off-ledger launch development reconciles");const opRec=cashReconciliation({openingCash:10000000,closingCash:9900000,dailyRows:[],transactionRows:[{category:"quality",amount:-100000}],summary:{capitalSpend:0,commercialExpansionSpend:0}});assert(opRec.oneTimeOperatingNet===-100000&&opRec.operatingCashFlow===-100000,"one-time operating transaction classified");const rush=programForecast({pace:"rush",budget:100000,totalDays:20,daysRemaining:20,spent:0}),validate=programForecast({pace:"validate",budget:100000,totalDays:20,daysRemaining:20,spent:0});assert(rush.calendarDays<20&&rush.dailySpend>5000&&rush.overrun>0,"rush program tradeoff");assert(validate.calendarDays>20&&validate.forecast>100000&&validate.pace.quality>0,"validation program tradeoff");assert(rush.projectedQualityDelta===-2&&validate.projectedQualityDelta===2.5,"full-program quality posture");const mixed=programForecast({pace:"validate",budget:100000,totalDays:20,daysRemaining:10,spent:60000,qualityAdjustmentAccrued:-1});assert(Math.abs(mixed.projectedQualityDelta-.25)<.001,"mixed program quality is weighted across postures");
 const dist=settleDistribution({netProfit:10000000,distributionPct:50,ownershipPct:100,subsidiaryCash:25000000,parentCash:40000000,reserveTarget:5000000});assert(dist.amount===5000000&&dist.subsidiaryCashAfter===20000000&&dist.parentCashAfter===45000000,"50% subsidiary distribution transfers real cash on both balance sheets");
 const protectedDist=settleDistribution({netProfit:10000000,distributionPct:75,ownershipPct:100,subsidiaryCash:7000000,parentCash:40000000,reserveTarget:5000000});assert(protectedDist.amount===2000000&&protectedDist.reason==="Working-capital requirement","distribution respects subsidiary liquidity reserve");
 const drows=[{category:"subsidiary_distribution",amount:500000,year:1970,month:2,day:10,period:period(1970,2),companyId:"a",companyName:"A"},{category:"subsidiary_distribution",amount:250000,year:1970,month:2,day:5,period:period(1970,2),companyId:"b",companyName:"B"},{category:"capital_injection",amount:-100000,year:1970,month:2,day:10,period:period(1970,2)}],ds=distributionSummary(drows,1970,2,10);assert(ds.today===500000&&ds.week===750000&&ds.month===750000&&ds.lifetime===750000,"distribution windows only count actual paid ledger entries");
 const legacyCash=reconcileLegacySubsidiaryCash({subsidiaryCash:81763.5537,companyCash:148661.0067,lastDividend:66897.453});assert(legacyCash.repaired&&Math.abs(legacyCash.canonicalCash-81763.5537)<.01,"legacy subsidiary cash repair only accepts an exact prior distribution mismatch");const ambiguousCash=reconcileLegacySubsidiaryCash({subsidiaryCash:80000,companyCash:150000,lastDividend:12000});assert(!ambiguousCash.repaired&&ambiguousCash.canonicalCash===150000,"ambiguous legacy cash mismatch is never guessed or rewritten");
 const elim=intercompanyElimination({units:50000,transferPrice:400,unitCost:280,ownershipPct:100});assert(elim.intercompanySales===20000000&&elim.consolidatedProfitImpact===0&&elim.supplierGrossProfit===6000000,"intercompany sale eliminates internal revenue/cost without free consolidated profit");
 const bridge=mergerLiquidityBridge({cash:0,valuation:231000000,hasMergedOperations:true}),fundedBridge=mergerLiquidityBridge({cash:6000000,valuation:231000000,hasMergedOperations:true}),noMergerBridge=mergerLiquidityBridge({cash:0,valuation:231000000,hasMergedOperations:false});assert(bridge.draw===4620000&&bridge.targetCash===4620000,"post-merger liquidity bridge restores operating cash");assert(fundedBridge.draw===0&&noMergerBridge.draw===0,"merger liquidity bridge stays inactive when no bridge is needed");
 const subRec2=cashReconciliation({openingCash:10000000,closingCash:15000000,dailyRows:[],transactionRows:[{category:"subsidiary_distribution",amount:5000000}],summary:{capitalSpend:0,commercialExpansionSpend:0}});assert(subRec2.internalCashFlow===5000000&&subRec2.operatingCashFlow===0&&subRec2.freeCashFlow===0,"subsidiary distribution is internal cash, not operating income");
 const rngA={campaignId:"regression-seed",company:"RNG Motors",year:1970,month:0},rngB=JSON.parse(JSON.stringify(rngA));const seqA=[random(rngA,"market"),random(rngA,"market"),random(rngA,"quality")],seqB=[random(rngB,"market"),random(rngB,"market"),random(rngB,"quality")];assert(JSON.stringify(seqA)===JSON.stringify(seqB),"seeded RNG replay mismatch");const checkpoint=JSON.parse(JSON.stringify(rngA)),nextA=random(rngA,"market"),nextB=random(checkpoint,"market");assert(nextA===nextB,"save/load changed RNG continuation");const isolated={campaignId:"stream-isolation",company:"RNG Motors"};random(isolated,"cosmetic");const econAfterCosmetic=random(isolated,"economy"),isolatedControl={campaignId:"stream-isolation",company:"RNG Motors"},econControl=random(isolatedControl,"economy");assert(econAfterCosmetic===econControl,"cosmetic RNG changed economy stream");
 const oldGeneral=y=>clamp(.42*Math.pow(1.032,Math.max(0,Number(y)-1970)),.40,2.6),oldManufacturing=y=>clamp(.30*Math.pow(1.037,Math.max(0,Number(y)-1970)),.28,2.45);
 for(const y of [1970,1990,2010,2030]){assert(Math.abs(economicIndex("general",y)-oldGeneral(y))<1e-10,"general economic index changed legacy era-cost output for "+y);assert(Math.abs(economicIndex("manufacturing",y)-oldManufacturing(y))<1e-10,"manufacturing economic index changed legacy output for "+y);}
 assert(economicIndex("wages",1990)>economicIndex("wages",1970)&&economicIndex("construction",2010)>economicIndex("construction",1990),"historical economic indices are not monotonic");
 const nominal=23500,base=convertNominal(nominal,2010,1970,"vehiclePrice"),roundTrip=convertNominal(base,1970,2010,"vehiclePrice");assert(Math.abs(roundTrip-nominal)<.01,"nominal/base-year economic conversion did not round-trip");
 const snap=economicIndexSnapshot(1990);assert(snap.year===1990&&snap.wages>1&&snap.vehiclePrice>1,"economic index snapshot missing canonical categories");
 return{ok:failures.length===0,failures};
}
window.MDX_CORE={period,periodParts,periodLabel,hash32,ensureRngState,random,randomInt,randomId,ECONOMIC_INDEX_DEFS,economicIndex,economicRelativeIndex,convertNominal,economicIndexSnapshot,ensureCalendarContract,contractClock,closeContractMonth,firstMonthCommitment,corporateRoute,archiveMergedCompany,finiteNumber,normalizeReputation,adjustReputation,normalizeVehicleStats,repairNonFiniteCash,mergerLiquidityBridge,channelAllocation,programPace,programForecast,profitabilityDiagnostics,cashReconciliation,settleDistribution,distributionSummary,reconcileLegacySubsidiaryCash,intercompanyElimination,rescaleProgramTimeline,inventoryAgeBuckets,runSelfTests};
})();
