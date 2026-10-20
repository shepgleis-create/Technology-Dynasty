(() => {
"use strict";
const MAX_MONTHS=120,MAX_YEARS=100;
const num=v=>Number.isFinite(Number(v))?Number(v):0;
function periodOf(x){return num(x?.period??(num(x?.year)*12+num(x?.month)));}
function ensureArchive(state){
 if(!state||typeof state!=="object")return null;
 state.historyArchive=Array.isArray(state.historyArchive)?state.historyArchive:[];
 state.historyYearArchive=Array.isArray(state.historyYearArchive)?state.historyYearArchive:[];
 if(state.financialArchive&&typeof state.financialArchive==="object"){
  for(const m of state.financialArchive.months||[]){const p=periodOf(m);if(!state.historyArchive.some(x=>periodOf(x)===p))state.historyArchive.push({...m,period:p,migratedFinancialArchive:true});}
  for(const y of state.financialArchive.years||[]){if(!state.historyYearArchive.some(x=>Number(x.year)===Number(y.year)))state.historyYearArchive.push({...y,migratedFinancialArchive:true});}
  delete state.financialArchive;
 }
 state.historyArchive.sort((a,b)=>periodOf(a)-periodOf(b));state.historyYearArchive.sort((a,b)=>num(a.year)-num(b.year));
 while(state.historyArchive.length>MAX_MONTHS)mergeYear(state,state.historyArchive.shift());
 if(state.historyYearArchive.length>MAX_YEARS)state.historyYearArchive.splice(0,state.historyYearArchive.length-MAX_YEARS);
 return{months:state.historyArchive,years:state.historyYearArchive};
}
function profitComponents(s={}){
 const out=[
  ["vehicle_revenue","Vehicle revenue",num(s.revenue)],["vehicle_cogs","Vehicle production COGS",-num(s.cogs)],["warranty","Warranty",-num(s.warranty)],
  ["product_marketing","Product marketing",-num(s.productMarketing)],["development","Development",-num(s.development)],["fixed_costs","Fixed operating costs",-num(s.fixedCosts)],
  ["integration","Integration / restructuring",num(s.integrationNet)],["commercial_expansion","Dealer / commercial expansion",-num(s.commercialExpansionSpend)],["inventory_carry","Inventory carrying cost",-num(s.inventoryCarryingCost)],
  ["engine_supply","OEM engine supply profit",num(s.engineSupplyProfit)],["transmission_supply","OEM transmission supply profit",num(s.transmissionSupplyProfit)],["subsidiaries","Subsidiary earnings",num(s.subsidiaryEarnings)],
  ["industrial","Industrial earnings",num(s.industrialEarnings)],["logistics","Logistics",-num(s.logistics)],["discretionary","Discretionary budget",-num(s.discretionaryBudget)],
  ["company_retail","Company-store operations",-num(s.companyRetailCost)],["regional_marketing","Regional marketing",-num(s.regionalMarketing)],["regulatory","Regulatory penalties",-num(s.regulatoryPenalties)],
  ["motorsport","Motorsport",-num(s.motorsportCost)],["labor_disruption","Labor disruption",-num(s.laborStrikeCost)],["one_time_operating","One-time operating items",num(s.oneTimeOperatingNet)],
  ["non_operating","Non-operating items",num(s.nonOperatingExpenseNet)]
 ].map(([key,label,amount])=>({key,label,amount}));
 const target=num(s.netProfit??s.profit),known=out.reduce((a,x)=>a+x.amount,0),residual=target-known;if(Math.abs(residual)>.5)out.push({key:"other_reconciled",label:"Other reconciled operating effects",amount:residual});
 return out.filter(x=>Math.abs(x.amount)>.005);
}
function explainProfit(current={},previous=null){
 const cur=profitComponents(current),prev=previous?profitComponents(previous):[],pm=new Map(prev.map(x=>[x.key,x])),cm=new Map(cur.map(x=>[x.key,x])),keys=new Set([...pm.keys(),...cm.keys()]);
 const currentNet=num(current.netProfit??current.profit),previousNet=previous?num(previous.netProfit??previous.profit):null,delta=previousNet==null?null:currentNet-previousNet;
 const contributions=[...keys].map(key=>{const c=cm.get(key),p=pm.get(key),change=num(c?.amount)-num(p?.amount);return{key,label:c?.label||p?.label||key,current:num(c?.amount),previous:num(p?.amount),change};}).filter(x=>Math.abs(x.change)>.005).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
 const residual=delta==null?0:delta-contributions.reduce((a,x)=>a+x.change,0);if(delta!=null&&Math.abs(residual)>.5)contributions.push({key:"delta_reconciliation",label:"Reconciliation",current:0,previous:0,change:residual});
 return{currentNet,previousNet,delta,components:cur,contributions};
}
function explainCash(summary={}){
 const change=num(summary.cashChange??(num(summary.closingCash)-num(summary.openingCash))),b=summary.cashBreakdown&&typeof summary.cashBreakdown==="object"?summary.cashBreakdown:{};
 const labels={vehicle:"Vehicle operations",engine:"Engine contracts",transmission:"Transmission contracts",fixed:"Fixed operating costs",budget:"Discretionary budgets",development:"Development",capital:"Capital investment",commercialExpansion:"Dealer / commercial expansion",integration:"Integration activity",subsidiaries:"Subsidiary cash movement",companyRetail:"Company retail network",regionalMarketing:"Regional marketing",regulatory:"Regulatory penalties",financeArm:"Finance arm",motorsport:"Motorsport",royalties:"Licensing royalties",fleetPenalties:"Fleet penalties",laborStrikes:"Labor disruption",quality:"Recall / quality campaigns",transactionFees:"Transaction fees",acquisition:"Acquisition consideration",financing:"Debt financing",debtService:"Debt principal repayment",assetSale:"Asset / subsidiary sales",equityFinancing:"Equity financing",dividends:"Shareholder dividends",capital_injection:"Capital injection",industrial_dividend:"Industrial distribution",subsidiary_distribution:"Subsidiary distribution"};
 const contributions=Object.entries(b).map(([key,amount])=>({key,label:labels[key]||key.replaceAll("_"," ").replace(/\b\w/g,m=>m.toUpperCase()),amount:num(amount)})).filter(x=>Math.abs(x.amount)>.005).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount));
 const residual=change-contributions.reduce((a,x)=>a+x.amount,0);if(Math.abs(residual)>.5)contributions.push({key:"reconciliation",label:"Reconciliation",amount:residual});
 return{change,openingCash:num(summary.openingCash),closingCash:num(summary.closingCash),contributions};
}
function recordOperationalSnapshot(state,input={}){
 const a=ensureArchive(state);if(!a)return null;const period=num(input.period??(num(input.year??state.year)*12+num(input.month??state.month))),year=Math.floor(period/12),month=period%12;
 let row=a.months.find(x=>periodOf(x)===period);if(!row){row={period,year,month};a.months.push(row);a.months.sort((x,z)=>periodOf(x)-periodOf(z));}
 Object.assign(row,{period,year,month,cash:num(input.cash??state.cash),debt:num(input.debt??state.debt),valuation:num(input.valuation??state.valuation),employees:num(input.employees),factories:num(input.factories),vehicles:Array.isArray(input.vehicles)?input.vehicles:row.vehicles||[],engines:Array.isArray(input.engines)?input.engines:row.engines||[],fleetMpg:num(input.fleetMpg),operationalSnapshot:true});
 while(a.months.length>MAX_MONTHS)mergeYear(state,a.months.shift());return row;
}
function mergeYear(state,m){
 const a={months:state.historyArchive,years:state.historyYearArchive},year=num(m.year),existing=a.years.find(x=>num(x.year)===year);
 const y=existing||{year,months:0,revenue:0,units:0,produced:0,operatingProfit:0,netProfit:0,operatingCashFlow:0,freeCashFlow:0,avgFactoryUtilization:0,closingCash:0,closingDebt:0,closingValuation:0,peakEmployees:0,peakFactories:0,modelsSeen:0};
 const prior=y.months;y.months++;y.revenue+=num(m.revenue);y.units+=num(m.units);y.produced+=num(m.produced);y.operatingProfit+=num(m.operatingProfit);y.netProfit+=num(m.netProfit??m.profit);y.operatingCashFlow+=num(m.operatingCashFlow);y.freeCashFlow+=num(m.freeCashFlow);y.avgFactoryUtilization=(y.avgFactoryUtilization*prior+num(m.factoryUtilization))/y.months;y.closingCash=num(m.cash);y.closingDebt=num(m.debt);y.closingValuation=num(m.valuation);y.peakEmployees=Math.max(num(y.peakEmployees),num(m.employees));y.peakFactories=Math.max(num(y.peakFactories),num(m.factories));y.modelsSeen=Math.max(num(y.modelsSeen),Array.isArray(m.vehicles)?m.vehicles.length:num(m.modelsSeen));
 if(!existing)a.years.push(y);a.years.sort((x,z)=>num(x.year)-num(z.year));if(a.years.length>MAX_YEARS)a.years.splice(0,a.years.length-MAX_YEARS);return y;
}
function archiveMonth(state,summary){
 const a=ensureArchive(state);if(!a||!summary)return null;const period=num(summary.year)*12+num(summary.month);let row=a.months.find(x=>periodOf(x)===period);
 if(!row)row=recordOperationalSnapshot(state,{period,year:summary.year,month:summary.month,cash:summary.closingCash??state.cash,debt:state.debt,valuation:state.valuation,employees:state.employees,factories:state.operations?.factories?.length||0,vehicles:[],engines:[]});
 if(row.financialFinalized)return row;
 const previousSummary=state.previousMonthSummaryForExplanation||null,profit=explainProfit(summary,previousSummary),cash=explainCash(summary);summary.explanations={profit,cash};
 state.previousMonthSummaryForExplanation={...summary,explanations:undefined,diagnostics:undefined};
 Object.assign(row,{revenue:num(summary.revenue)+num(summary.engineSupplyRevenue)+num(summary.transmissionSupplyRevenue),vehicleRevenue:num(summary.revenue),units:num(summary.units),produced:num(summary.produced),operatingProfit:num(summary.operatingProfit??summary.profit),netProfit:num(summary.netProfit??summary.profit),profit:num(summary.netProfit??summary.profit),operatingCashFlow:num(summary.operatingCashFlow),freeCashFlow:num(summary.freeCashFlow),cash:num(summary.closingCash??state.cash),debt:num(state.debt),valuation:num(state.valuation),factoryUtilization:num(summary.factoryUtilization),inventoryWorkingCapital:num(summary.inventoryWorkingCapital),explanations:{profit:{currentNet:profit.currentNet,previousNet:profit.previousNet,delta:profit.delta,contributions:profit.contributions.slice(0,10)},cash:{change:cash.change,contributions:cash.contributions.slice(0,10)}},financialFinalized:true});
 while(a.months.length>MAX_MONTHS)mergeYear(state,a.months.shift());return row;
}
function range(state,months){const a=ensureArchive(state);if(!a)return[];if(months==="ALL")return[...a.years,...a.months];const n=Math.max(1,Number(months)||12);return a.months.slice(-n);}
function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);};
 const prev={year:1970,month:0,revenue:1000,cogs:600,warranty:20,productMarketing:30,development:50,fixedCosts:100,netProfit:200,profit:200},cur={year:1970,month:1,revenue:1200,cogs:650,warranty:25,productMarketing:35,development:60,fixedCosts:110,netProfit:320,profit:320};
 const p=explainProfit(cur,prev);check(Math.abs(p.contributions.reduce((a,x)=>a+x.change,0)-p.delta)<1,"profit explanation does not reconcile");
 const c=explainCash({openingCash:1000,closingCash:1250,cashChange:250,cashBreakdown:{operations:300,capex:-50}});check(Math.abs(c.contributions.reduce((a,x)=>a+x.amount,0)-250)<1,"cash explanation does not reconcile");
 const s={cash:1000,debt:100,valuation:2000,employees:20,operations:{factories:[]},historyArchive:[],historyYearArchive:[]};for(let i=0;i<121;i++){recordOperationalSnapshot(s,{period:1970*12+i,employees:20,factories:1,vehicles:[],engines:[]});archiveMonth(s,{year:1970+Math.floor(i/12),month:i%12,revenue:100,cogs:50,netProfit:20,profit:20,openingCash:1000,closingCash:1000,cashChange:0,cashBreakdown:{},units:1,produced:1});}check(s.historyArchive.length===120&&s.historyYearArchive.length===1,"retention rollup failed");check(s.historyArchive.every(x=>x.financialFinalized),"operational and financial archive rows did not unify");
 const before=s.historyArchive.length,last=s.historyArchive[s.historyArchive.length-1];archiveMonth(s,{year:last.year,month:last.month,revenue:999,netProfit:999,profit:999});check(s.historyArchive.length===before&&s.historyArchive[s.historyArchive.length-1].netProfit===20,"duplicate month was not idempotent");
 return{ok:failures.length===0,failures};
}
window.MDXHistory={ensureArchive,profitComponents,explainProfit,explainCash,recordOperationalSnapshot,archiveMonth,range,runSelfTests};
})();