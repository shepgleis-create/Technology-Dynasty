(() => {
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function money(v){const n=Math.abs(Number(v)||0),s=Number(v)<0?"-":"";if(n>=1e9)return s+"$"+(n/1e9).toFixed(n>=1e10?1:2)+"B";if(n>=1e6)return s+"$"+(n/1e6).toFixed(n>=1e7?1:2)+"M";if(n>=1e3)return s+"$"+Math.round(n/1e3)+"K";return s+"$"+Math.round(n).toLocaleString();}
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const SUB_INTEGRATIONS={
 treasury:{label:"Treasury",detail:"Coordinate liquidity, debt, cash reserves and parent funding rules.",levels:{independent:0,coordinated:.5,integrated:1}},
 procurement:{label:"Procurement",detail:"Use parent purchasing scale and industrial holdings while preserving subsidiary supplier autonomy.",levels:{independent:0,coordinated:.5,integrated:1}},
 engineering:{label:"Engineering",detail:"Share technical standards, testing, powertrains and selected engineering resources.",levels:{independent:0,coordinated:.5,integrated:1}},
 platforms:{label:"Platforms",detail:"Allow cross-company platforms and architectures while controlling brand differentiation.",levels:{independent:0,coordinated:.5,integrated:1}},
 dealers:{label:"Sales & Dealers",detail:"Coordinate dealer development, retail analytics, incentives and regional expansion.",levels:{independent:0,coordinated:.5,integrated:1}},
 people:{label:"People & HR",detail:"Share recruiting, training and leadership development while preserving local management.",levels:{independent:0,coordinated:.5,integrated:1}},
 quality:{label:"Quality",detail:"Use common quality systems, warranty analytics and supplier-quality audits.",levels:{independent:0,coordinated:.5,integrated:1}},
 services:{label:"Shared Services",detail:"Combine finance operations, legal, IT and back-office administration.",levels:{independent:0,coordinated:.5,integrated:1}}
};
const SUB_TARGETS={
 revenueGrowth:{label:"Revenue growth",unit:"%",min:-20,max:40,step:1,default:6},
 netMargin:{label:"Net margin",unit:"%",min:-10,max:25,step:1,default:5},
 marketShare:{label:"Market share",unit:"%",min:0,max:30,step:.5,default:3},
 cashReserve:{label:"Cash / value reserve",unit:"%",min:0,max:20,step:.5,default:4},
 debtValue:{label:"Maximum debt / value",unit:"%",min:0,max:100,step:5,default:45},
 quality:{label:"Quality score",unit:"/100",min:40,max:100,step:1,default:78},
 dealerHealth:{label:"Dealer health",unit:"/100",min:30,max:100,step:1,default:72},
 factoryUtilization:{label:"Factory utilization",unit:"%",min:20,max:100,step:2,default:75}
};
const IND_TARGETS={
 utilization:{label:"Factory utilization",unit:"%",min:20,max:100,step:2,default:78},
 margin:{label:"Net margin",unit:"%",min:-10,max:30,step:1,default:7},
 quality:{label:"Quality",unit:"/100",min:40,max:100,step:1,default:80},
 reliability:{label:"Reliability",unit:"/100",min:40,max:100,step:1,default:86},
 parentService:{label:"Parent fill rate",unit:"%",min:50,max:100,step:2,default:96},
 customerConcentration:{label:"Max customer concentration",unit:"%",min:10,max:80,step:5,default:35},
 debtValue:{label:"Maximum debt / value",unit:"%",min:0,max:100,step:5,default:50},
 externalRevenue:{label:"Third-party revenue mix",unit:"%",min:0,max:100,step:5,default:45}
};
function directorOptions(state){
 const office=state?.executiveOffice?.roles||{},rows=[["none","No executive sponsor"]];for(const [key,r] of Object.entries(office)){if(r?.candidateId)rows.push([key,(G.MDXDirectors?.ROLE_DEFS?.[key]?.short||key.toUpperCase())+" • "+(r.name||"Executive")]);}return rows;
}
function defaultSubGovernance(s){
 return{
  version:3,
  sponsorRole:"none",
  reviewCadence:"quarterly",
  boardModel:"strategic_control",
  approval:{capexPct:1.5,newFactory:true,newModel:false,debtPct:45,acquisition:true,brandChange:true},
  targets:Object.fromEntries(Object.entries(SUB_TARGETS).map(([k,d])=>[k,d.default])),
  integration:{treasury:"coordinated",procurement:"coordinated",engineering:"independent",platforms:"independent",dealers:"independent",people:"coordinated",quality:"coordinated",services:"coordinated"},
  independence:72,
  brandProtection:85,
  synergyPriority:"balanced",
  capitalPolicy:{cashFloorPct:4,parentFundingLimitPct:15,dividendPolicy:"balanced"},
  intervention:{reviewScore:55,managementReviewScore:38,missMonths:3,inventoryMonths:4},
  uiTab:"overview",
  scorecardHistory:[],riskHistory:[],boardHistory:[],approvalQueue:[],productDirectives:{},
  lastProcessedPeriod:-1,lastReviewPeriod:-1
 };
}
function defaultIndustrialGovernance(c){
 return{version:3,sponsorRole:"none",reviewCadence:"quarterly",mandate:"balanced_supplier",capacityReservationPct:35,thirdPartyTargetPct:50,transferPricing:"market_minus_8",serviceLevelTarget:96,inventoryBufferMonths:1.2,capexApprovalPct:5,strategyLock:false,technologyRoadmap:"balanced",customerPolicy:"diversify",uiTab:"mandate",targets:Object.fromEntries(Object.entries(IND_TARGETS).map(([k,d])=>[k,d.default])),scorecardHistory:[],riskHistory:[],boardHistory:[],lastProcessedPeriod:-1,lastReviewPeriod:-1};
}
function ensureSub(s){
 if(!s)return null;
 const d=defaultSubGovernance(s),g=s.groupGovernance&&typeof s.groupGovernance==="object"?s.groupGovernance:{};
 g.version=3;
 g.sponsorRole=g.sponsorRole||d.sponsorRole;
 g.reviewCadence=g.reviewCadence||d.reviewCadence;
 g.boardModel=g.boardModel||d.boardModel;
 g.approval={...d.approval,...(g.approval||{})};
 g.approval.capexPct=clamp(num(g.approval.capexPct,d.approval.capexPct),.25,10);
 g.approval.debtPct=clamp(num(g.approval.debtPct,d.approval.debtPct),0,100);
 g.targets={...d.targets,...(g.targets||{})};
 for(const [k,def] of Object.entries(SUB_TARGETS))g.targets[k]=clamp(num(g.targets[k],def.default),def.min,def.max);
 g.integration={...d.integration,...(g.integration||{})};
 for(const k of Object.keys(SUB_INTEGRATIONS))if(!["independent","coordinated","integrated"].includes(g.integration[k]))g.integration[k]=d.integration[k];
 g.independence=clamp(num(g.independence,d.independence),0,100);
 g.brandProtection=clamp(num(g.brandProtection,d.brandProtection),0,100);
 g.synergyPriority=["balanced","growth","profit","technology","turnaround","brand"].includes(g.synergyPriority)?g.synergyPriority:d.synergyPriority;
 g.capitalPolicy={...d.capitalPolicy,...(g.capitalPolicy||{})};
 g.capitalPolicy.cashFloorPct=clamp(num(g.capitalPolicy.cashFloorPct,d.capitalPolicy.cashFloorPct),0,20);
 g.capitalPolicy.parentFundingLimitPct=clamp(num(g.capitalPolicy.parentFundingLimitPct,d.capitalPolicy.parentFundingLimitPct),0,50);
 g.capitalPolicy.dividendPolicy=["none","balanced","aggressive"].includes(g.capitalPolicy.dividendPolicy)?g.capitalPolicy.dividendPolicy:d.capitalPolicy.dividendPolicy;
 g.intervention={...d.intervention,...(g.intervention||{})};
 g.intervention.reviewScore=clamp(num(g.intervention.reviewScore,d.intervention.reviewScore),20,90);
 g.intervention.managementReviewScore=clamp(num(g.intervention.managementReviewScore,d.intervention.managementReviewScore),10,g.intervention.reviewScore);
 g.intervention.missMonths=clamp(Math.round(num(g.intervention.missMonths,d.intervention.missMonths)),1,12);
 g.intervention.inventoryMonths=clamp(num(g.intervention.inventoryMonths,d.intervention.inventoryMonths),1,12);
 g.uiTab=["overview","authority","performance","integration","portfolio"].includes(g.uiTab)?g.uiTab:"overview";
 g.scorecardHistory=Array.isArray(g.scorecardHistory)?g.scorecardHistory:[];
 g.riskHistory=Array.isArray(g.riskHistory)?g.riskHistory:[];
 g.boardHistory=Array.isArray(g.boardHistory)?g.boardHistory:[];
 g.approvalQueue=Array.isArray(g.approvalQueue)?g.approvalQueue:[];
 g.productDirectives=g.productDirectives&&typeof g.productDirectives==="object"?g.productDirectives:{};
 g.lastProcessedPeriod=Number.isFinite(Number(g.lastProcessedPeriod))?Number(g.lastProcessedPeriod):-1;
 g.lastReviewPeriod=Number.isFinite(Number(g.lastReviewPeriod))?Number(g.lastReviewPeriod):-1;
 s.groupGovernance=g;
 return g;
}
function ensureIndustrial(c){if(!c)return null;const d=defaultIndustrialGovernance(c),g=c.groupGovernance&&typeof c.groupGovernance==="object"?c.groupGovernance:{};g.version=3;g.sponsorRole=g.sponsorRole||d.sponsorRole;g.reviewCadence=g.reviewCadence||d.reviewCadence;g.mandate=g.mandate||d.mandate;g.capacityReservationPct=clamp(num(g.capacityReservationPct,d.capacityReservationPct),0,100);g.thirdPartyTargetPct=clamp(num(g.thirdPartyTargetPct,d.thirdPartyTargetPct),0,100);g.transferPricing=g.transferPricing||d.transferPricing;g.serviceLevelTarget=clamp(num(g.serviceLevelTarget,d.serviceLevelTarget),50,100);g.inventoryBufferMonths=clamp(num(g.inventoryBufferMonths,d.inventoryBufferMonths),0,6);g.capexApprovalPct=clamp(num(g.capexApprovalPct,d.capexApprovalPct),0,25);g.strategyLock=!!g.strategyLock;g.technologyRoadmap=g.technologyRoadmap||d.technologyRoadmap;g.customerPolicy=g.customerPolicy||d.customerPolicy;g.uiTab=["mandate","capacity","targets","contracts"].includes(g.uiTab)?g.uiTab:"mandate";g.targets={...d.targets,...(g.targets||{})};for(const [k,def] of Object.entries(IND_TARGETS))g.targets[k]=clamp(num(g.targets[k],def.default),def.min,def.max);g.scorecardHistory=Array.isArray(g.scorecardHistory)?g.scorecardHistory:[];g.riskHistory=Array.isArray(g.riskHistory)?g.riskHistory:[];g.boardHistory=Array.isArray(g.boardHistory)?g.boardHistory:[];g.lastProcessedPeriod=Number.isFinite(Number(g.lastProcessedPeriod))?Number(g.lastProcessedPeriod):-1;g.lastReviewPeriod=Number.isFinite(Number(g.lastReviewPeriod))?Number(g.lastReviewPeriod):-1;c.groupGovernance=g;return g;}
function ensure(state){if(!state)return null;state.subsidiaries=Array.isArray(state.subsidiaries)?state.subsidiaries:[];state.industrialCompanies=Array.isArray(state.industrialCompanies)?state.industrialCompanies:[];for(const s of state.subsidiaries)ensureSub(s);for(const c of state.industrialCompanies)if(c.parentOwned)ensureIndustrial(c);state.groupGovernance=state.groupGovernance&&typeof state.groupGovernance==="object"?state.groupGovernance:{};state.groupGovernance.version=2;state.groupGovernance.history=Array.isArray(state.groupGovernance.history)?state.groupGovernance.history:[];return state.groupGovernance;}
function linkedCompany(state,s){return(state.industry||[]).find(x=>x.id===(s.operatingCompanyId||s.id))||null;}
function period(state){return num(state?.year,1970)*12+num(state?.month,0);}
function integrationValue(g,key){const v=g?.integration?.[key]||"independent";return num(SUB_INTEGRATIONS[key]?.levels?.[v],0);}
function executiveBoost(state,kind){const mod=state?.executiveModifiers||G.MDXDirectors?.computeModifiers?.(state)||{};return num(mod[kind],0);}
function applySubGovernance(state,s,m){
 const g=ensureSub(s),proc=integrationValue(g,"procurement"),eng=integrationValue(g,"engineering"),platform=integrationValue(g,"platforms"),dealers=integrationValue(g,"dealers"),people=integrationValue(g,"people"),quality=integrationValue(g,"quality"),services=integrationValue(g,"services"),treasury=integrationValue(g,"treasury"),independence=g.independence/100,brand=g.brandProtection/100;
 const priority={
  balanced:{cost:0,engineering:0,quality:0,dealer:0,admin:0,treasury:0},
  growth:{cost:0,engineering:.012,quality:.1,dealer:.45,admin:-.004,treasury:0},
  profit:{cost:.012,engineering:-.004,quality:0,dealer:-.08,admin:.018,treasury:.08},
  technology:{cost:0,engineering:.022,quality:.25,dealer:0,admin:-.003,treasury:0},
  turnaround:{cost:.01,engineering:.004,quality:.18,dealer:.18,admin:.022,treasury:.28},
  brand:{cost:0,engineering:.01,quality:.55,dealer:.2,admin:-.002,treasury:0}
 }[g.synergyPriority]||{};
 m.parentGovernance={sponsorRole:g.sponsorRole,reviewCadence:g.reviewCadence,boardModel:g.boardModel,approval:{...g.approval},targets:{...g.targets},independence:g.independence,brandProtection:g.brandProtection,synergyPriority:g.synergyPriority,capitalPolicy:{...g.capitalPolicy},intervention:{...g.intervention}};
 m.groupInputCostFactor=clamp(1-proc*(.018+executiveBoost(state,"subsidiaryEfficiency")*.03)-num(priority.cost),.88,1.03);
 m.groupEngineeringEfficiency=eng*(.035+executiveBoost(state,"engineeringEfficiency")*.04)+platform*.025+num(priority.engineering);
 m.groupQualityBoost=quality*(.5+executiveBoost(state,"qualityBoost")*.12)+num(priority.quality);
 m.groupDealerBoost=Math.max(0,dealers*(1.2+executiveBoost(state,"dealerEfficiency")*2)+num(priority.dealer));
 m.groupPeopleEfficiency=people*(.025+Math.max(0,1-num(state.executiveModifiers?.payrollFactor,1))*.15);
 m.groupAdminCostFactor=clamp(1-services*(.035+Math.max(0,1-num(state.executiveModifiers?.adminCostFactor,1))*.15)-num(priority.admin),.82,1.04);
 m.groupTreasurySpreadRelief=Math.max(0,treasury*(.35+Math.max(0,1-num(state.executiveModifiers?.interestCostFactor,1))*2.2)+num(priority.treasury));
 m.groupPlatformAccess=platform;m.groupIndependence=independence;m.groupBrandProtection=brand;
 m.groupDebtCeilingPct=num(g.targets.debtValue,45);m.groupFactoryApprovalRequired=!!g.approval.newFactory;m.groupAcquisitionApprovalRequired=!!g.approval.acquisition;m.groupBrandApprovalRequired=!!g.approval.brandChange;
 m.groupCashFloorPct=num(g.capitalPolicy.cashFloorPct,4);m.groupParentFundingLimitPct=num(g.capitalPolicy.parentFundingLimitPct,15);m.groupDividendPolicy=g.capitalPolicy.dividendPolicy;
 m.parentProductDirectives={...(g.productDirectives||{})};
}
function subMetrics(s,m){
 const rev=num(m?.monthRevenue,s.lastRevenue),profit=num(m?.monthNetProfit??m?.monthProfit,s.lastProfit),value=Math.max(1,num(m?.valuation,s.value)),cash=num(m?.cash,s.cash),debt=num(m?.debt,s.debt),sales=num(m?.monthSales,s.lastSales),util=num(m?.factoryUtilization,s.factoryUtilization)*100,quality=(m?.aiCars||[]).filter(x=>x.active).reduce((a,x,_,arr)=>a+num(x.quality,70)/Math.max(1,arr.length),0)||num(m?.qualityCulture,70),dealerHealth=num(m?.dealerHealth,s.dealerHealth),priorRev=num(gLast(s)?.revenue,rev),growth=priorRev>0?(rev/priorRev-1)*100:0;
 return{revenue:rev,profit,value,cash,debt,sales,revenueGrowth:growth,netMargin:rev?profit/rev*100:0,marketShare:num(m?.marketShare,s.marketShare),cashReserve:cash/value*100,debtValue:debt/value*100,quality,dealerHealth,factoryUtilization:util};
}
function gLast(s){const h=s?.groupGovernance?.scorecardHistory||[];return h[0]||null;}
function scoreTarget(actual,target,higher=true,tolerance=1){if(!Number.isFinite(Number(actual))||!Number.isFinite(Number(target)))return 50;if(higher)return clamp(50+(actual-target)/Math.max(tolerance,Math.abs(target)*.25)*25,0,100);return clamp(50+(target-actual)/Math.max(tolerance,Math.abs(target)*.25)*25,0,100);}
function subScore(g,metrics){const parts=[scoreTarget(metrics.revenueGrowth,g.targets.revenueGrowth,true,3),scoreTarget(metrics.netMargin,g.targets.netMargin,true,2),scoreTarget(metrics.marketShare,g.targets.marketShare,true,1),scoreTarget(metrics.cashReserve,g.targets.cashReserve,true,1),scoreTarget(metrics.debtValue,g.targets.debtValue,false,8),scoreTarget(metrics.quality,g.targets.quality,true,5),scoreTarget(metrics.dealerHealth,g.targets.dealerHealth,true,5),scoreTarget(metrics.factoryUtilization,g.targets.factoryUtilization,true,8)];return Math.round(parts.reduce((a,b)=>a+b,0)/parts.length);}
function subRisks(g,m,metrics){
 const risks=[];const add=(level,title,detail)=>risks.push({level,title,detail});
 const cashFloor=Math.max(1,num(g.targets.cashReserve,4),num(g.capitalPolicy?.cashFloorPct,4));
 if(metrics.cashReserve<cashFloor*.6)add("high","Liquidity below policy","Cash / value is "+metrics.cashReserve.toFixed(1)+"% against a "+cashFloor.toFixed(1)+"% policy floor.");
 if(metrics.debtValue>num(g.targets.debtValue,45))add("high","Leverage above board ceiling","Debt / value is "+metrics.debtValue.toFixed(1)+"% against a "+num(g.targets.debtValue,45)+"% ceiling.");
 if(metrics.factoryUtilization<45)add("medium","Underused factory base","Factory utilization is "+metrics.factoryUtilization.toFixed(0)+"%; fixed costs may be outrunning demand.");
 if(metrics.quality<num(g.targets.quality,78)-8)add("medium","Quality gap","Product / engineering quality is materially below the board target.");
 if(metrics.dealerHealth<num(g.targets.dealerHealth,72)-10)add("medium","Dealer health weak","Retail network health is below the group operating standard.");
 const active=(m?.aiCars||[]).filter(x=>x.active);if(!active.length)add("high","No active vehicle lineup","The subsidiary has no active vehicle product and depends on a relaunch / development program.");
 const invMonths=Math.max(1,num(g.intervention?.inventoryMonths,4));
 if(active.some(x=>num(x.inventory,0)>Math.max(500,num(x.lastSales,0)*invMonths)))add("medium","Inventory intervention threshold","At least one model is carrying more than roughly "+invMonths.toFixed(0)+" months of retail sales in inventory.");
 return risks.slice(0,8);
}
function industrialMetrics(c){
 const rev=num(c.ttmRevenue,num(c.revenue)*12),profit=num(c.ttmNetProfit,num(c.netProfit)*12),value=Math.max(1,num(c.value,1)),active=(c.contracts||[]).filter(x=>x.status==="active"),byCustomer={};for(const k of active)byCustomer[k.customerId||k.customerName||"other"]=num(byCustomer[k.customerId||k.customerName||"other"])+num(k.monthlyUnits,0)*num(k.unitPrice,0);const total=Object.values(byCustomer).reduce((a,b)=>a+b,0),max=total?Math.max(0,...Object.values(byCustomer))/total*100:0;const parentNeed=num(c.monthIntercompanySales,0),external=num(c.monthThirdPartyRevenue,0)+num(c.monthContractRevenue,0),mix=parentNeed+external>0?external/(parentNeed+external)*100:0;
 return{revenue:rev,profit,margin:rev?profit/rev*100:0,utilization:num(c.utilization)*100,quality:num(c.quality,70),reliability:num(c.reliability,80),debtValue:num(c.debt)/value*100,externalRevenue:mix,customerConcentration:max,parentService:num(c.parentFillRate,100)};
}
function industrialScore(g,m){const p=[scoreTarget(m.utilization,g.targets.utilization,true,8),scoreTarget(m.margin,g.targets.margin,true,3),scoreTarget(m.quality,g.targets.quality,true,5),scoreTarget(m.reliability,g.targets.reliability,true,5),scoreTarget(m.parentService,g.targets.parentService,true,5),scoreTarget(m.customerConcentration,g.targets.customerConcentration,false,10),scoreTarget(m.debtValue,g.targets.debtValue,false,10),scoreTarget(m.externalRevenue,g.targets.externalRevenue,true,12)];return Math.round(p.reduce((a,b)=>a+b,0)/p.length);}
function industrialRisks(g,c,m){const r=[],add=(level,title,detail)=>r.push({level,title,detail});if(m.utilization<45)add("medium","Low asset utilization","Factories are operating at "+m.utilization.toFixed(0)+"% utilization.");if(m.debtValue>num(g.targets.debtValue,50))add("high","Industrial leverage above limit","Debt / value exceeds the board target.");if(m.customerConcentration>num(g.targets.customerConcentration,35))add("medium","Customer concentration","Largest named customer represents roughly "+m.customerConcentration.toFixed(0)+"% of contracted revenue.");if(m.quality<num(g.targets.quality,80)-8)add("medium","Quality target missed","Industrial product quality is below board standard.");if(num(c.cash,0)<num(c.value,1)*.01)add("high","Thin operating liquidity","Cash is below 1% of company value.");if(["distressed","bankrupt"].includes(String(c.status)))add("high","Financial distress",String(c.status).toUpperCase()+" status requires parent action.");return r.slice(0,8);}
function cadenceMonths(value){return value==="monthly"?1:value==="semiannual"?6:value==="annual"?12:3;}
function processSubsidiaryMonth(state,s,m){
 const g=ensureSub(s),p=period(state);if(g.lastProcessedPeriod===p)return;applySubGovernance(state,s,m);const metrics=subMetrics(s,m),score=subScore(g,metrics),risks=subRisks(g,m,metrics),row={year:state.year,month:state.month,score,...metrics};g.scorecardHistory.unshift(row);g.scorecardHistory=g.scorecardHistory.slice(0,120);g.riskHistory.unshift({year:state.year,month:state.month,risks});g.riskHistory=g.riskHistory.slice(0,48);g.lastProcessedPeriod=p;
 if(p-g.lastReviewPeriod>=cadenceMonths(g.reviewCadence)){g.lastReviewPeriod=p;g.boardHistory.unshift({year:state.year,month:state.month,type:"board_review",text:"Board review closed at "+score+"/100",detail:risks.length?risks.length+" active governance risk"+(risks.length===1?"":"s")+" • "+g.synergyPriority+" synergy priority":"No material governance risk flagged."});g.boardHistory=g.boardHistory.slice(0,160);}
}
function processIndustrialMonth(state,c){
 const g=ensureIndustrial(c),p=period(state);if(g.lastProcessedPeriod===p)return;c.parentCapacityReservationPct=g.capacityReservationPct;c.thirdPartyTargetPct=g.thirdPartyTargetPct;c.transferPricingPolicy=g.transferPricing;c.parentServiceLevelTarget=g.serviceLevelTarget;c.inventoryBufferMonths=g.inventoryBufferMonths;c.strategyLockedByParent=g.strategyLock;c.technologyRoadmap=g.technologyRoadmap;c.customerPolicy=g.customerPolicy;c.parentCapexApprovalPct=g.capexApprovalPct;
 const metrics=industrialMetrics(c),score=industrialScore(g,metrics),risks=industrialRisks(g,c,metrics);g.scorecardHistory.unshift({year:state.year,month:state.month,score,...metrics});g.scorecardHistory=g.scorecardHistory.slice(0,120);g.riskHistory.unshift({year:state.year,month:state.month,risks});g.riskHistory=g.riskHistory.slice(0,48);g.lastProcessedPeriod=p;
 if(p-g.lastReviewPeriod>=cadenceMonths(g.reviewCadence)){g.lastReviewPeriod=p;g.boardHistory.unshift({year:state.year,month:state.month,type:"board_review",text:"Industrial board review closed at "+score+"/100",detail:risks.length?risks.length+" risk"+(risks.length===1?"":"s")+" active • mandate "+g.mandate.replaceAll("_"," "):"No material operating risk flagged."});g.boardHistory=g.boardHistory.slice(0,160);}
}
function processMonth(state,hooks={}){
 ensure(state);let subs=0,industrials=0;for(const s of state.subsidiaries||[]){const m=linkedCompany(state,s);if(!m||s.mergeStatus==="merged")continue;processSubsidiaryMonth(state,s,m);subs++;}for(const c of state.industrialCompanies||[]){if(!c.parentOwned)continue;processIndustrialMonth(state,c);industrials++;}return{subsidiaries:subs,industrials};
}
function sponsorSelect(state,value,attr){return "<select "+attr+">"+directorOptions(state).map(([v,l])=>"<option value='"+esc(v)+"' "+(value===v?"selected":"")+">"+esc(l)+"</option>").join("")+"</select>";}
function targetGrid(defs,targets,prefix){return "<div class='governance-target-grid'>"+Object.entries(defs).map(([k,d])=>"<label><span>"+esc(d.label)+"</span><div><input type='number' min='"+d.min+"' max='"+d.max+"' step='"+d.step+"' value='"+num(targets[k],d.default)+"' data-"+prefix+"-target='"+esc(k)+"'><b>"+esc(d.unit)+"</b></div></label>").join("")+"</div>";}
function scorecardBlock(history,risks,title){
 const h=history?.[0],prior=history?.[1],delta=h&&prior?num(h.score)-num(prior.score):0,rr=risks?.[0]?.risks||[];return "<section class='governance-scorecard'><div class='budget-section-head'><div><span class='eyebrow'>BOARD SCORECARD</span><h3>"+esc(title)+"</h3></div><span class='tag "+(num(h?.score,50)>=70?"positive":num(h?.score,50)<45?"negative":"")+"'>"+(h?Math.round(h.score)+"/100":"AWAITING CLOSE")+"</span></div>"+(h?"<div class='governance-score-main'><div><span>LATEST SCORE</span><b>"+Math.round(h.score)+"</b><small>"+(delta>=0?"+":"")+delta+" vs prior close</small></div><div><span>ACTIVE RISKS</span><b>"+rr.length+"</b><small>"+(rr.filter(x=>x.level==="high").length)+" high priority</small></div></div>":"<p class='muted'>Advance one month to establish the first board scorecard.</p>")+(rr.length?"<div class='governance-risk-grid'>"+rr.map(x=>"<article class='risk-"+esc(x.level)+"'><span>"+esc(x.level).toUpperCase()+"</span><b>"+esc(x.title)+"</b><small>"+esc(x.detail)+"</small></article>").join("")+"</div>":"")+"</section>";
}

function targetStatusGrid(defs,targets,metrics){
 const lowerBetter=new Set(["debtValue"]);
 return "<div class='gov2-target-grid'>"+Object.entries(defs).map(([k,d])=>{
  const target=clamp(num(targets[k],d.default),d.min,d.max),actual=num(metrics?.[k],0),good=lowerBetter.has(k)?actual<=target:actual>=target;
  const display=String(Math.abs(actual)>=100?Math.round(actual):actual.toFixed(1)).replace(/\.0$/,"");
  return "<label class='gov2-target "+(good?"on-track":"off-track")+"'><div class='gov2-target-head'><span>"+esc(d.label)+"</span><em>"+(good?"ON TRACK":"WATCH")+"</em></div><div class='gov2-target-current'><b>"+display+esc(d.unit)+"</b><small>current</small></div><div class='gov2-target-input'><span>12-mo target</span><div><input type='number' min='"+d.min+"' max='"+d.max+"' step='"+d.step+"' value='"+target+"' data-sub-gov-target='"+esc(k)+"'><b>"+esc(d.unit)+"</b></div></div><small class='gov2-range'>Allowed "+d.min+"–"+d.max+esc(d.unit)+"</small></label>";
 }).join("")+"</div>";
}
function integrationPercent(g){
 const keys=Object.keys(SUB_INTEGRATIONS);return Math.round(keys.reduce((a,k)=>a+integrationValue(g,k),0)/Math.max(1,keys.length)*100);
}
function integrationImpact(key,level){
 const map={
  treasury:{independent:"Subsidiary controls cash and borrowing.",coordinated:"Parent sets funding and liquidity guardrails.",integrated:"Group treasury actively coordinates funding and liquidity."},
  procurement:{independent:"Local teams choose suppliers and terms.",coordinated:"Group negotiates selected categories.",integrated:"Purchasing scale is centralized across the group."},
  engineering:{independent:"Engineering teams and standards stay local.",coordinated:"Testing, standards and selected resources are shared.",integrated:"Engineering capability is deeply pooled across companies."},
  platforms:{independent:"Architectures stay company-specific.",coordinated:"Selected architectures may be shared.",integrated:"Cross-company platform sharing is the default."},
  dealers:{independent:"Dealer strategy remains local.",coordinated:"Retail analytics and expansion are coordinated.",integrated:"Dealer strategy and incentives are group-managed."},
  people:{independent:"Hiring and leadership stay local.",coordinated:"Recruiting and leadership development are shared.",integrated:"People systems are managed as one group."},
  quality:{independent:"Quality systems stay company-specific.",coordinated:"Audits and warranty analytics are shared.",integrated:"Common quality systems govern the subsidiary."},
  services:{independent:"Back office remains standalone.",coordinated:"Selected finance, legal and IT are shared.",integrated:"Back-office operations are consolidated."}
 };
 return map[key]?.[level]||"";
}
function priorityLabel(v){return({balanced:"Balanced",growth:"Growth",profit:"Profit & cash",technology:"Technology",turnaround:"Turnaround",brand:"Brand & quality"})[v]||"Balanced";}
function boardModelLabel(v){return({strategic_control:"Strategic control",financial_control:"Financial control",operating_control:"Operating control",holding_company:"Holding company"})[v]||"Strategic control";}
function governanceSummary(g){
 const pct=integrationPercent(g),reserved=Object.values(g.approval||{}).filter(v=>v===true).length;
 const autonomy=g.independence>=75?"high autonomy":g.independence>=45?"balanced autonomy":"tight parent control";
 const integration=pct>=70?"deep group integration":pct>=35?"selective shared capability":"mostly standalone operations";
 return "This company currently runs with "+autonomy+", "+integration+", and "+reserved+" reserved decision"+(reserved===1?"":"s")+" requiring parent approval. Owner priority: "+priorityLabel(g.synergyPriority)+".";
}
function presetLabel(v){return({hands_off:"Hands-off",balanced:"Balanced group",integrated:"Integrated group",turnaround:"Turnaround"})[v]||v;}
function applyGovernancePreset(g,preset){
 if(preset==="hands_off"){
  g.independence=90;g.brandProtection=95;g.boardModel="holding_company";g.reviewCadence="quarterly";g.synergyPriority="brand";
  g.integration={treasury:"independent",procurement:"independent",engineering:"independent",platforms:"independent",dealers:"independent",people:"independent",quality:"coordinated",services:"independent"};
  g.approval={...g.approval,newFactory:false,newModel:false,acquisition:true,brandChange:true,capexPct:5,debtPct:65};
 }
 if(preset==="balanced"){
  g.independence=72;g.brandProtection=85;g.boardModel="strategic_control";g.reviewCadence="quarterly";g.synergyPriority="balanced";
  g.integration={treasury:"coordinated",procurement:"coordinated",engineering:"independent",platforms:"independent",dealers:"independent",people:"coordinated",quality:"coordinated",services:"coordinated"};
  g.approval={...g.approval,newFactory:true,newModel:false,acquisition:true,brandChange:true,capexPct:1.5,debtPct:45};
 }
 if(preset==="integrated"){
  g.independence=35;g.brandProtection=65;g.boardModel="operating_control";g.reviewCadence="monthly";g.synergyPriority="profit";
  g.integration={treasury:"integrated",procurement:"integrated",engineering:"coordinated",platforms:"integrated",dealers:"coordinated",people:"integrated",quality:"integrated",services:"integrated"};
  g.approval={...g.approval,newFactory:true,newModel:true,acquisition:true,brandChange:true,capexPct:1,debtPct:40};
 }
 if(preset==="turnaround"){
  g.independence=25;g.brandProtection=75;g.boardModel="operating_control";g.reviewCadence="monthly";g.synergyPriority="turnaround";
  g.integration={treasury:"integrated",procurement:"integrated",engineering:"coordinated",platforms:"coordinated",dealers:"coordinated",people:"coordinated",quality:"integrated",services:"integrated"};
  g.approval={...g.approval,newFactory:true,newModel:true,acquisition:true,brandChange:true,capexPct:.75,debtPct:35};
  g.intervention.reviewScore=60;g.intervention.managementReviewScore=40;g.intervention.missMonths=2;
 }
}
function renderSubsidiaryPanel(state,s,m){
 const g=ensureSub(s),directives=g.productDirectives||{},cars=(m?.aiCars||[]).filter(x=>x.active),hist=g.boardHistory.slice(0,8),metrics=subMetrics(s,m),score=subScore(g,metrics),risks=subRisks(g,m,metrics),activeTab=g.uiTab||"overview",integration=integrationPercent(g);
 const totalSales=cars.reduce((a,c)=>a+num(c.lastSales,0),0),totalStock=cars.reduce((a,c)=>a+num(c.inventory,0),0),stockMonths=totalSales?totalStock/totalSales:0;
 const tab=(id,label)=>"<button type='button' class='"+(activeTab===id?"active":"")+"' data-sub-gov-tab='"+id+"'>"+label+"</button>";
 const pane=(id,body)=>"<section class='gov2-panel "+(activeTab===id?"active":"")+"' data-sub-gov-panel='"+id+"'>"+body+"</section>";
 const priorityOptions=[["balanced","Balanced"],["growth","Growth"],["profit","Profit & cash"],["technology","Technology"],["turnaround","Turnaround"],["brand","Brand & quality"]];
 const integrationCards=Object.entries(SUB_INTEGRATIONS).map(([k,d])=>"<article class='gov2-integration-card'><div class='gov2-integration-copy'><span>"+esc(d.label)+"</span><b>"+esc((g.integration[k]||"independent").toUpperCase())+"</b><small>"+esc(integrationImpact(k,g.integration[k]||"independent"))+"</small></div><div class='segmented-control'>"+["independent","coordinated","integrated"].map(v=>"<button type='button' class='"+(g.integration[k]===v?"active":"")+"' data-sub-gov-integration='"+k+"' data-level='"+v+"'>"+v.toUpperCase()+"</button>").join("")+"</div></article>").join("");
 const portfolio=cars.length?"<div class='gov2-portfolio-grid'>"+cars.map(c=>{const v=directives[c.id]||"manage",sales=num(c.lastSales,0),stock=num(c.inventory,0),months=sales?stock/sales:0;return"<article class='gov2-model-card'><div class='gov2-model-head'><div><span>"+esc(c.segment||"MODEL")+" • MY "+num(c.modelYear||c.year,state.year)+"</span><b>"+esc(c.name)+"</b></div><em class='"+(months>g.intervention.inventoryMonths?"negative":"")+"'>"+(months?months.toFixed(1):"0")+" MO STOCK</em></div><div class='gov2-model-kpis'><span><b>"+sales.toLocaleString()+"</b> sold</span><span><b>"+stock.toLocaleString()+"</b> stock</span><span><b>"+money(c.price||0)+"</b> price</span></div><label><span>Parent directive</span><select data-sub-product-directive='"+esc(c.id)+"'>"+[["manage","Management discretion"],["invest","Invest / grow"],["protect","Protect / maintain"],["harvest","Harvest cash"],["replace","Replace next generation"],["exit","Exit / discontinue"]].map(([x,l])=>"<option value='"+x+"' "+(v===x?"selected":"")+">"+l+"</option>").join("")+"</select></label></article>"}).join("")+"</div>":"<div class='gov2-empty'>No active products to direct. Product governance will appear here when the subsidiary has an active lineup.</div>";
 return "<section class='group-governance-suite governance-v2'>"+
  "<header class='gov2-hero'><div><span class='eyebrow'>PARENT COMPANY • OWNER CONTROL</span><h3>"+esc(s.name)+" Control Center</h3><p>Control the subsidiary without digging through one giant wall of settings. Set authority, performance rules, group integration and product direction in separate workspaces.</p></div><div class='gov2-hero-score'><span>BOARD SCORE</span><b class='"+(score>=70?"positive":score<45?"negative":"")+"'>"+score+"</b><small>"+risks.length+" active risk"+(risks.length===1?"":"s")+"</small></div></header>"+
  "<div class='gov2-tabs'>"+tab("overview","Overview")+tab("authority","Authority")+tab("performance","Performance")+tab("integration","Integration")+tab("portfolio","Portfolio")+"</div>"+
  pane("overview",
   "<div class='gov2-kpi-grid'><article><span>Independence</span><b>"+Math.round(g.independence)+"%</b><small>"+(g.independence>=75?"Management-led":g.independence>=45?"Shared control":"Parent-led")+"</small></article><article><span>Integration</span><b>"+integration+"%</b><small>"+(integration>=70?"Deeply integrated":integration>=35?"Selective sharing":"Mostly standalone")+"</small></article><article><span>Brand protection</span><b>"+Math.round(g.brandProtection)+"%</b><small>"+(g.brandProtection>=80?"Identity protected":"Parent can reshape")+"</small></article><article><span>Inventory</span><b>"+stockMonths.toFixed(1)+" mo</b><small>"+totalStock.toLocaleString()+" units / "+totalSales.toLocaleString()+" monthly sales</small></article></div>"+
   "<section class='gov2-card gov2-command'><div class='gov2-section-head'><div><span>QUICK OPERATING MODEL</span><h4>Choose a starting point, then fine-tune it</h4></div></div><div class='gov2-preset-row'>"+["hands_off","balanced","integrated","turnaround"].map(p=>"<button type='button' data-sub-gov-preset='"+p+"'><b>"+presetLabel(p)+"</b><small>"+({hands_off:"Protect identity and let management run it.",balanced:"Parent guardrails with selective shared services.",integrated:"Centralize more of the group for scale.",turnaround:"Tight control for a distressed company."})[p]+"</small></button>").join("")+"</div></section>"+
   "<section class='gov2-card'><div class='gov2-section-head'><div><span>CURRENT MANDATE</span><h4>"+esc(priorityLabel(g.synergyPriority))+"</h4></div><button type='button' class='gov2-link' data-sub-gov-jump='authority'>EDIT CONTROL</button></div><p class='gov2-summary'>"+esc(governanceSummary(g))+"</p><div class='gov2-mandate-grid'><label><span>Owner priority</span><select data-sub-gov-priority>"+priorityOptions.map(([v,l])=>"<option value='"+v+"' "+(g.synergyPriority===v?"selected":"")+">"+l+"</option>").join("")+"</select><small>This changes which group benefits get emphasized.</small></label><label><span>Executive sponsor</span>"+sponsorSelect(state,g.sponsorRole,"data-sub-gov-sponsor")+"</label></div></section>"+
   "<section class='gov2-card gov2-alerts'><div class='gov2-section-head'><div><span>BOARD ATTENTION</span><h4>"+(risks.length?risks.length+" issue"+(risks.length===1?"":"s")+" need watching":"No material governance risks")+"</h4></div><button type='button' class='gov2-link' data-sub-gov-jump='performance'>VIEW SCORECARD</button></div>"+(risks.length?"<div class='gov2-alert-list'>"+risks.slice(0,3).map(x=>"<article class='risk-"+esc(x.level)+"'><span>"+esc(x.level).toUpperCase()+"</span><div><b>"+esc(x.title)+"</b><small>"+esc(x.detail)+"</small></div></article>").join("")+"</div>":"<p class='muted'>The current scorecard is inside board limits.</p>")+"</section>"
  )+
  pane("authority",
   "<div class='gov2-section-intro'><span>AUTHORITY & ESCALATION</span><h4>Decide who can do what</h4><p>These controls define management freedom, parent approval rights and when poor performance automatically becomes a board issue.</p></div>"+
   "<div class='gov2-two-col'><section class='gov2-card'><div class='gov2-section-head'><div><span>BOARD CHARTER</span><h4>Control structure</h4></div></div><label class='governance-select'><span>EXECUTIVE SPONSOR</span>"+sponsorSelect(state,g.sponsorRole,"data-sub-gov-sponsor")+"</label><label class='governance-select'><span>BOARD REVIEW</span><select data-sub-gov-cadence>"+["monthly","quarterly","semiannual","annual"].map(x=>"<option "+(g.reviewCadence===x?"selected":"")+">"+x+"</option>").join("")+"</select></label><label class='governance-select'><span>CONTROL MODEL</span><select data-sub-gov-board>"+[["strategic_control","Strategic control"],["financial_control","Financial control"],["operating_control","Operating control"],["holding_company","Holding company"]].map(([v,l])=>"<option value='"+v+"' "+(g.boardModel===v?"selected":"")+">"+l+"</option>").join("")+"</select></label><div class='gov2-control-readout'><span>Current model</span><b>"+boardModelLabel(g.boardModel)+"</b></div><div class='governance-slider'><div><span>OPERATING INDEPENDENCE</span><b>"+Math.round(g.independence)+"%</b></div><input type='range' min='0' max='100' step='5' value='"+g.independence+"' data-sub-gov-range='independence'><small>Higher = management makes more day-to-day decisions without parent involvement.</small></div><div class='governance-slider'><div><span>BRAND PROTECTION</span><b>"+Math.round(g.brandProtection)+"%</b></div><input type='range' min='0' max='100' step='5' value='"+g.brandProtection+"' data-sub-gov-range='brandProtection'><small>Higher = the marque resists platform, styling and positioning changes.</small></div></section>"+
   "<section class='gov2-card'><div class='gov2-section-head'><div><span>RESERVED MATTERS</span><h4>Requires your approval</h4></div></div><div class='gov2-reserved-grid'><label class='governance-check'><input type='checkbox' data-sub-gov-approval='newFactory' "+(g.approval.newFactory?"checked":"")+"><span><b>New factories</b><small>Management must ask before opening assembly plants.</small></span></label><label class='governance-check'><input type='checkbox' data-sub-gov-approval='newModel' "+(g.approval.newModel?"checked":"")+"><span><b>New model programs</b><small>Escalate major product commitments to the parent.</small></span></label><label class='governance-check'><input type='checkbox' data-sub-gov-approval='acquisition' "+(g.approval.acquisition?"checked":"")+"><span><b>M&A / minority stakes</b><small>Blocks autonomous acquisitions.</small></span></label><label class='governance-check'><input type='checkbox' data-sub-gov-approval='brandChange' "+(g.approval.brandChange?"checked":"")+"><span><b>Brand repositioning</b><small>Protects marque identity from major changes.</small></span></label></div><div class='gov2-number-row'><label class='governance-number'><span>CAPEX ESCALATION • % OF VALUE</span><input type='number' min='.25' max='10' step='.25' value='"+g.approval.capexPct+"' data-sub-gov-approval-number='capexPct'><small>Projects above this size escalate to parent approval.</small></label><label class='governance-number'><span>DEBT CEILING • % OF VALUE</span><input type='number' min='0' max='100' step='5' value='"+g.approval.debtPct+"' data-sub-gov-approval-number='debtPct'><small>Hard leverage guardrail for board review.</small></label></div></section></div>"+
   "<div class='gov2-two-col'><section class='gov2-card'><div class='gov2-section-head'><div><span>CAPITAL POLICY</span><h4>Cash and parent support</h4></div></div><div class='gov2-number-row'><label class='governance-number'><span>MINIMUM CASH / VALUE</span><input type='number' min='0' max='20' step='.5' value='"+g.capitalPolicy.cashFloorPct+"' data-sub-gov-capital='cashFloorPct'><small>Falling below this increases liquidity risk.</small></label><label class='governance-number'><span>PARENT FUNDING LIMIT • % OF VALUE</span><input type='number' min='0' max='50' step='1' value='"+g.capitalPolicy.parentFundingLimitPct+"' data-sub-gov-capital='parentFundingLimitPct'><small>Maximum policy envelope for parent support.</small></label></div><label class='governance-select'><span>DIVIDEND / CASH UPSTREAM POLICY</span><select data-sub-gov-dividend>"+[["none","Retain cash in subsidiary"],["balanced","Balanced reinvestment / upstream"],["aggressive","Aggressively upstream excess cash"]].map(([v,l])=>"<option value='"+v+"' "+(g.capitalPolicy.dividendPolicy===v?"selected":"")+">"+l+"</option>").join("")+"</select></label></section>"+
   "<section class='gov2-card'><div class='gov2-section-head'><div><span>INTERVENTION TRIGGERS</span><h4>When the board steps in</h4></div></div><div class='gov2-number-row'><label class='governance-number'><span>BOARD REVIEW BELOW SCORE</span><input type='number' min='20' max='90' step='1' value='"+g.intervention.reviewScore+"' data-sub-gov-intervention='reviewScore'><small>Performance below this opens a board attention flag.</small></label><label class='governance-number'><span>MANAGEMENT REVIEW BELOW</span><input type='number' min='10' max='"+g.intervention.reviewScore+"' step='1' value='"+g.intervention.managementReviewScore+"' data-sub-gov-intervention='managementReviewScore'><small>Severe underperformance escalates leadership review.</small></label><label class='governance-number'><span>CONSECUTIVE MISS MONTHS</span><input type='number' min='1' max='12' step='1' value='"+g.intervention.missMonths+"' data-sub-gov-intervention='missMonths'><small>How long weak performance can persist before escalation.</small></label><label class='governance-number'><span>INVENTORY TRIGGER • MONTHS</span><input type='number' min='1' max='12' step='.5' value='"+g.intervention.inventoryMonths+"' data-sub-gov-intervention='inventoryMonths'><small>Flags model inventory above this many months of sales.</small></label></div></section></div>"
  )+
  pane("performance",
   "<div class='gov2-section-intro'><span>12-MONTH PERFORMANCE CONTRACT</span><h4>Targets with actuals, not random raw boxes</h4><p>Every target shows the current result beside the board target. Existing out-of-range saves are automatically repaired to valid limits.</p></div>"+
   targetStatusGrid(SUB_TARGETS,g.targets,metrics)+scorecardBlock(g.scorecardHistory,g.riskHistory,s.name+" board performance")+
   (hist.length?"<section class='gov2-card'><div class='gov2-section-head'><div><span>BOARD LOG</span><h4>Recent governance decisions</h4></div></div><div class='sub-decision-list'>"+hist.map(x=>"<div class='sub-decision'><b>"+esc(x.text)+"</b><span>"+MONTHS[num(x.month,0)]+" "+num(x.year,state.year)+" • "+esc(x.detail)+"</span></div>").join("")+"</div></section>":"")
  )+
  pane("integration",
   "<div class='gov2-section-intro'><span>GROUP INTEGRATION</span><h4>"+integration+"% integrated</h4><p>Set each function separately. Every choice now explains what changes instead of making you guess what “independent / coordinated / integrated” means.</p></div><div class='gov2-integration-grid'>"+integrationCards+"</div>"
  )+
  pane("portfolio",
   "<div class='gov2-section-intro'><span>PRODUCT PORTFOLIO</span><h4>"+cars.length+" active model"+(cars.length===1?"":"s")+" • "+totalStock.toLocaleString()+" units in stock</h4><p>Give management a clear directive for every model without opening another screen.</p></div>"+portfolio
  )+
  "</section>";
}
function wireSubsidiary(state,root,s,m,hooks={}){
 if(!root||!s)return;
 const g=ensureSub(s);
 const save=(entry)=>{applySubGovernance(state,s,m);if(entry){g.boardHistory.unshift({year:state.year,month:state.month,type:entry.type||"governance",text:entry.text,detail:entry.detail||"Parent governance policy updated."});g.boardHistory=g.boardHistory.slice(0,160);}hooks.save?.();hooks.rerender?.();};
 root.querySelectorAll(".governance-v2 input[type='number']").forEach(i=>{const unit=(i.closest(".gov2-target")?.querySelector(".gov2-target-input b")?.textContent||i.closest(".governance-number")?.querySelector("span")?.textContent?.includes("%")?"%":"").trim(),read=document.createElement("b");read.className="gov2-inline-range-value";read.textContent=Number(i.value)+(unit?" "+unit:"");i.type="range";i.insertAdjacentElement("beforebegin",read);i.addEventListener("input",()=>{read.textContent=Number(i.value)+(unit?" "+unit:"");});});

 const selectTab=(id)=>{g.uiTab=id;root.querySelectorAll("[data-sub-gov-tab]").forEach(b=>b.classList.toggle("active",b.dataset.subGovTab===id));root.querySelectorAll("[data-sub-gov-panel]").forEach(p=>p.classList.toggle("active",p.dataset.subGovPanel===id));};
 root.querySelectorAll("[data-sub-gov-tab]").forEach(b=>b.addEventListener("click",()=>selectTab(b.dataset.subGovTab)));
 root.querySelectorAll("[data-sub-gov-jump]").forEach(b=>b.addEventListener("click",()=>selectTab(b.dataset.subGovJump)));
 root.querySelectorAll("[data-sub-gov-preset]").forEach(b=>b.addEventListener("click",()=>{applyGovernancePreset(g,b.dataset.subGovPreset);save({type:"preset",text:presetLabel(b.dataset.subGovPreset)+" governance preset applied",detail:"Authority, integration and review settings were updated together."});}));
 root.querySelectorAll("[data-sub-gov-sponsor]").forEach(el=>el.addEventListener("change",e=>{g.sponsorRole=e.target.value;save({text:"Executive sponsor updated",detail:e.target.options[e.target.selectedIndex]?.text||e.target.value});}));
 root.querySelector("[data-sub-gov-priority]")?.addEventListener("change",e=>{g.synergyPriority=e.target.value;save({type:"mandate",text:"Owner priority → "+priorityLabel(g.synergyPriority),detail:"Operating emphasis and group-support modifiers were updated."});});
 root.querySelector("[data-sub-gov-cadence]")?.addEventListener("change",e=>{g.reviewCadence=e.target.value;save({text:"Board review cadence → "+e.target.value});});
 root.querySelector("[data-sub-gov-board]")?.addEventListener("change",e=>{g.boardModel=e.target.value;save({text:"Control model → "+boardModelLabel(g.boardModel)});});
 root.querySelectorAll("[data-sub-gov-range]").forEach(i=>i.addEventListener("change",()=>{g[i.dataset.subGovRange]=clamp(Number(i.value),0,100);save({text:(i.dataset.subGovRange==="independence"?"Operating independence":"Brand protection")+" → "+g[i.dataset.subGovRange]+"%"});}));
 root.querySelectorAll("[data-sub-gov-approval]").forEach(i=>i.addEventListener("change",()=>{g.approval[i.dataset.subGovApproval]=i.checked;save({text:(i.checked?"Reserved matter enabled: ":"Reserved matter released: ")+i.dataset.subGovApproval});}));
 root.querySelectorAll("[data-sub-gov-approval-number]").forEach(i=>i.addEventListener("change",()=>{const k=i.dataset.subGovApprovalNumber,val=k==="capexPct"?clamp(Number(i.value),.25,10):clamp(Number(i.value),0,100);g.approval[k]=val;if(k==="debtPct")g.targets.debtValue=clamp(val,SUB_TARGETS.debtValue.min,SUB_TARGETS.debtValue.max);save({text:(k==="capexPct"?"CAPEX escalation":"Debt ceiling")+" → "+val+"%"});}));
 root.querySelectorAll("[data-sub-gov-target]").forEach(i=>i.addEventListener("change",()=>{const k=i.dataset.subGovTarget,d=SUB_TARGETS[k];g.targets[k]=clamp(Number(i.value),d.min,d.max);save({type:"target",text:d.label+" target → "+g.targets[k]+d.unit});}));
 root.querySelectorAll("[data-sub-gov-integration]").forEach(b=>b.addEventListener("click",()=>{g.integration[b.dataset.subGovIntegration]=b.dataset.level;save({type:"integration",text:SUB_INTEGRATIONS[b.dataset.subGovIntegration].label+" → "+b.dataset.level,detail:integrationImpact(b.dataset.subGovIntegration,b.dataset.level)});}));
 root.querySelectorAll("[data-sub-gov-capital]").forEach(i=>i.addEventListener("change",()=>{const k=i.dataset.subGovCapital,d=k==="cashFloorPct"?[0,20]:[0,50];g.capitalPolicy[k]=clamp(Number(i.value),d[0],d[1]);save({type:"capital",text:k.replace(/([A-Z])/g," $1")+" → "+g.capitalPolicy[k]+"%"});}));
 root.querySelector("[data-sub-gov-dividend]")?.addEventListener("change",e=>{g.capitalPolicy.dividendPolicy=e.target.value;save({type:"capital",text:"Dividend policy → "+e.target.options[e.target.selectedIndex]?.text});});
 root.querySelectorAll("[data-sub-gov-intervention]").forEach(i=>i.addEventListener("change",()=>{const k=i.dataset.subGovIntervention;let v=Number(i.value);if(k==="reviewScore")v=clamp(v,20,90);if(k==="managementReviewScore")v=clamp(v,10,g.intervention.reviewScore);if(k==="missMonths")v=clamp(Math.round(v),1,12);if(k==="inventoryMonths")v=clamp(v,1,12);g.intervention[k]=v;if(g.intervention.managementReviewScore>g.intervention.reviewScore)g.intervention.managementReviewScore=g.intervention.reviewScore;save({type:"intervention",text:"Intervention trigger updated",detail:k+" → "+v});}));
 root.querySelectorAll("[data-sub-product-directive]").forEach(sel=>sel.addEventListener("change",()=>{g.productDirectives[sel.dataset.subProductDirective]=sel.value;const car=(m?.aiCars||[]).find(x=>x.id===sel.dataset.subProductDirective);save({type:"portfolio",text:(car?.name||"Model")+" directive → "+sel.value,detail:"Parent portfolio instruction updated."});}));
}

function industrialSlider(label,value,min,max,step,attr,unit="",help=""){
 const v=clamp(num(value,min),min,max);
 return "<label class='gov2-slider-field'><div><span>"+esc(label)+"</span><b data-gov-slider-read>"+v+(unit||"")+"</b></div><input type='range' min='"+min+"' max='"+max+"' step='"+step+"' value='"+v+"' "+attr+"><small>"+esc(help)+"</small></label>";
}
function industrialTargetGrid(g,metrics){
 const lowerBetter=new Set(["debtValue","customerConcentration"]);
 return "<div class='gov2-target-grid'>"+Object.entries(IND_TARGETS).map(([k,d])=>{const actual=num(metrics?.[k],0),target=clamp(num(g.targets[k],d.default),d.min,d.max),good=lowerBetter.has(k)?actual<=target:actual>=target,display=String(Math.abs(actual)>=100?Math.round(actual):actual.toFixed(1)).replace(/\.0$/,"");return"<label class='gov2-target "+(good?"on-track":"off-track")+"'><div class='gov2-target-head'><span>"+esc(d.label)+"</span><em>"+(good?"ON TRACK":"WATCH")+"</em></div><div class='gov2-target-current'><b>"+display+esc(d.unit)+"</b><small>current</small></div><div class='gov2-target-input'><span>Board target • <b data-gov-slider-read>"+target+esc(d.unit)+"</b></span><input type='range' min='"+d.min+"' max='"+d.max+"' step='"+d.step+"' value='"+target+"' data-ind-gov-target='"+esc(k)+"'></div></label>"}).join("")+"</div>";
}
function industrialMandateInfo(v){
 return({
  captive_supplier:["PARENT FIRST","Reserve capacity for the group and prioritize internal supply continuity."],
  balanced_supplier:["BALANCED","Serve the parent while keeping a healthy third-party customer book."],
  merchant_growth:["MERCHANT GROWTH","Retain earnings and chase outside customers, capacity and market share."],
  technology_leader:["TECHNOLOGY","Bias investment toward R&D, quality and next-generation capability."],
  low_cost:["LOW COST","Protect margins with scale, utilization and cost discipline."]
 })[v]||["BALANCED","Balanced operating mandate."];
}
function renderIndustrialPanel(state,c){
 const g=ensureIndustrial(c),hist=g.boardHistory.slice(0,8),active=(c.contracts||[]).filter(x=>x.status==="active"),metrics=industrialMetrics(c),activeTab=g.uiTab||"mandate",mi=industrialMandateInfo(g.mandate),intercompany=num(c.monthIntercompanySales,0),external=num(c.monthThirdPartyRevenue,0)+num(c.monthContractRevenue,0),total=intercompany+external,parentMix=total?intercompany/total*100:0;
 const tab=(id,label)=>"<button type='button' class='"+(activeTab===id?"active":"")+"' data-ind-gov-tab='"+id+"'>"+label+"</button>";
 const pane=(id,body)=>"<section class='gov2-panel "+(activeTab===id?"active":"")+"' data-ind-gov-panel='"+id+"'>"+body+"</section>";
 const mandateCards=[["captive_supplier","Parent first","Internal supply continuity"],["balanced_supplier","Balanced","Group + outside customers"],["merchant_growth","Merchant growth","Grow outside revenue"],["technology_leader","Technology","R&D + capability"],["low_cost","Low cost","Scale + margin"]];
 const exposure=active.length?"<div class='industrial-contract-exposure'>"+active.map(k=>"<article><div><span>"+esc(k.kind||c.industry).toUpperCase()+" • "+num(k.remainingMonths,0)+" MO LEFT</span><b>"+esc(k.customerName||"Customer")+"</b><small>"+num(k.monthlyUnits,0).toLocaleString()+" units/mo • "+money(k.unitPrice||0)+"/unit</small></div><div><span>LIFETIME REVENUE</span><b>"+money(k.lifetimeRevenue||0)+"</b></div></article>").join("")+"</div>":"<div class='gov2-empty'>No named third-party contracts are active. Spot customers and parent-group demand can still generate operating sales.</div>";
 return "<section class='group-governance-suite governance-v2 industrial-governance-v2'><header class='gov2-hero'><div><span class='eyebrow'>INDUSTRIAL HOLDING • OWNER CONTROL</span><h3>"+esc(c.name)+" Board</h3><p>Simple controls on top; the supplier keeps its own customers, plants, workforce, debt, R&D and operating simulation underneath.</p></div><div class='gov2-hero-score'><span>BOARD SCORE</span><b>"+Math.round(industrialScore(g,metrics))+"</b><small>"+Math.round(metrics.utilization)+"% utilization</small></div></header>"+
 "<div class='gov2-tabs gov2-tabs-four'>"+tab("mandate","Mandate")+tab("capacity","Capacity")+tab("targets","Targets")+tab("contracts","Contracts")+"</div>"+
 pane("mandate","<div class='gov2-kpi-grid'><article><span>Parent sales mix</span><b>"+parentMix.toFixed(0)+"%</b><small>revenue tied to your group</small></article><article><span>Outside mix</span><b>"+metrics.externalRevenue.toFixed(0)+"%</b><small>third-party diversification</small></article><article><span>Quality</span><b>"+Math.round(metrics.quality)+"/100</b><small>operating quality</small></article><article><span>Debt / value</span><b>"+metrics.debtValue.toFixed(1)+"%</b><small>financial leverage</small></article></div><section class='gov2-card'><div class='gov2-section-head'><div><span>OPERATING MANDATE</span><h4>"+mi[0]+"</h4></div></div><p class='gov2-summary'>"+esc(mi[1])+" The choice changes how the industrial AI balances parent demand, outside customers, reinvestment and technology.</p><div class='industrial-mandate-grid'>"+mandateCards.map(x=>"<button type='button' class='"+(g.mandate===x[0]?"active":"")+"' data-ind-gov-mandate='"+x[0]+"'><span>"+x[2]+"</span><b>"+x[1]+"</b><small>"+industrialMandateInfo(x[0])[1]+"</small></button>").join("")+"</div></section><section class='gov2-card'><div class='gov2-section-head'><div><span>ADVANCED DIRECTION</span><h4>Management guardrails</h4></div></div><div class='gov2-mandate-grid'><label><span>Executive sponsor</span>"+sponsorSelect(state,g.sponsorRole,"data-ind-gov-sponsor")+"</label><label><span>Technology roadmap</span><select data-ind-gov-field='technologyRoadmap'>"+[["balanced","Balanced"],["cost_down","Cost-down engineering"],["quality","Quality / durability"],["next_generation","Next-generation technology"],["capacity","Manufacturability / capacity"]].map(([v,l])=>"<option value='"+v+"' "+(g.technologyRoadmap===v?"selected":"")+">"+l+"</option>").join("")+"</select></label><label><span>Customer policy</span><select data-ind-gov-field='customerPolicy'>"+[["diversify","Diversify external book"],["strategic","Prefer strategic OEMs"],["margin","Highest-margin business"],["volume","Highest-volume business"],["parent_first","Parent first"]].map(([v,l])=>"<option value='"+v+"' "+(g.customerPolicy===v?"selected":"")+">"+l+"</option>").join("")+"</select></label><label class='governance-check'><input type='checkbox' data-ind-gov-lock "+(g.strategyLock?"checked":"")+"><span><b>Lock parent strategy</b><small>Stops the annual autonomous strategy review from overriding this mandate.</small></span></label></div></section>")+
 pane("capacity","<div class='gov2-section-intro'><span>CAPACITY + COMMERCIAL POLICY</span><h4>Set the guardrails with sliders</h4><p>No keyboard entry. These limits feed the operating industrial simulation each month.</p></div><div class='industrial-slider-grid'>"+
 industrialSlider("PARENT CAPACITY RESERVATION",g.capacityReservationPct,0,100,5,"data-ind-gov-number='capacityReservationPct'","%","How much installed capacity management protects for your group.")+
 industrialSlider("THIRD-PARTY SALES TARGET",g.thirdPartyTargetPct,0,100,5,"data-ind-gov-number='thirdPartyTargetPct'","%","Target mix sold outside your corporate group.")+
 industrialSlider("PARENT SERVICE LEVEL",g.serviceLevelTarget,50,100,1,"data-ind-gov-number='serviceLevelTarget'","%","Target fill rate owed to your own factories.")+
 industrialSlider("BUFFER STOCK",g.inventoryBufferMonths,0,6,.1,"data-ind-gov-number='inventoryBufferMonths'"," mo","Inventory cushion before management treats supply as tight.")+
 industrialSlider("CAPEX ESCALATION",g.capexApprovalPct,0,25,.5,"data-ind-gov-number='capexApprovalPct'","%","Projects above this share of company value escalate to the parent.")+
 "<label class='gov2-slider-field'><div><span>INTERCOMPANY TRANSFER PRICE</span><b>"+esc(g.transferPricing.replaceAll("_"," ").toUpperCase())+"</b></div><select data-ind-gov-field='transferPricing'>"+[["cost","At production cost"],["cost_plus_5","Cost + 5%"],["market_minus_12","Market - 12%"],["market_minus_8","Market - 8%"],["market","Market price"]].map(([v,l])=>"<option value='"+v+"' "+(g.transferPricing===v?"selected":"")+">"+l+"</option>").join("")+"</select><small>Controls internal pricing between this supplier and your group companies.</small></label></div>")+
 pane("targets","<div class='gov2-section-intro'><span>INDUSTRIAL SCORECARD</span><h4>Actual result → board target</h4><p>Targets are sliders and show status immediately. They guide board review without requiring number entry.</p></div>"+industrialTargetGrid(g,metrics)+scorecardBlock(g.scorecardHistory,g.riskHistory,c.name+" industrial performance")+(hist.length?"<section class='gov2-card'><div class='gov2-section-head'><div><span>BOARD LOG</span><h4>Recent owner decisions</h4></div></div><div class='sub-decision-list'>"+hist.map(x=>"<div class='sub-decision'><b>"+esc(x.text)+"</b><span>"+MONTHS[num(x.month,0)]+" "+num(x.year,state.year)+" • "+esc(x.detail)+"</span></div>").join("")+"</div></section>":""))+
 pane("contracts","<div class='gov2-section-intro'><span>CUSTOMER EXPOSURE</span><h4>"+active.length+" active named contract"+(active.length===1?"":"s")+"</h4><p>See where outside revenue is concentrated without mixing it with parent-group demand.</p></div>"+exposure)+
 "</section>";
}
function wireIndustrial(state,root,c,hooks={}){
 if(!root||!c)return;const g=ensureIndustrial(c),save=(label)=>{c.parentCapacityReservationPct=g.capacityReservationPct;c.thirdPartyTargetPct=g.thirdPartyTargetPct;c.transferPricingPolicy=g.transferPricing;c.parentServiceLevelTarget=g.serviceLevelTarget;c.inventoryBufferMonths=g.inventoryBufferMonths;c.strategyLockedByParent=g.strategyLock;c.technologyRoadmap=g.technologyRoadmap;c.customerPolicy=g.customerPolicy;g.boardHistory.unshift({year:state.year,month:state.month,type:"owner_policy",text:label||"Industrial board policy updated",detail:"Policy feeds the operating industrial simulation."});g.boardHistory=g.boardHistory.slice(0,160);hooks.save?.();hooks.rerender?.();};
 const selectTab=id=>{g.uiTab=id;root.querySelectorAll("[data-ind-gov-tab]").forEach(b=>b.classList.toggle("active",b.dataset.indGovTab===id));root.querySelectorAll("[data-ind-gov-panel]").forEach(p=>p.classList.toggle("active",p.dataset.indGovPanel===id));};
 root.querySelectorAll("[data-ind-gov-tab]").forEach(b=>b.addEventListener("click",()=>selectTab(b.dataset.indGovTab)));
 root.querySelectorAll("[data-ind-gov-mandate]").forEach(b=>b.addEventListener("click",()=>{g.mandate=b.dataset.indGovMandate;save("Operating mandate → "+industrialMandateInfo(g.mandate)[0]);}));
 root.querySelector("[data-ind-gov-sponsor]")?.addEventListener("change",e=>{g.sponsorRole=e.target.value;save("Executive sponsor updated");});
 root.querySelectorAll("[data-ind-gov-field]").forEach(i=>i.addEventListener("change",()=>{g[i.dataset.indGovField]=i.value;save(i.dataset.indGovField.replaceAll("_"," ")+" → "+i.value.replaceAll("_"," "));}));
 root.querySelectorAll("[data-ind-gov-number]").forEach(i=>{const read=i.closest(".gov2-slider-field")?.querySelector("[data-gov-slider-read]"),refresh=()=>{const unit=i.dataset.indGovNumber==="inventoryBufferMonths"?" mo":"%";if(read)read.textContent=Number(i.value)+(unit);};i.addEventListener("input",refresh);i.addEventListener("change",()=>{g[i.dataset.indGovNumber]=Number(i.value);refresh();save(i.dataset.indGovNumber+" → "+i.value);});});
 root.querySelector("[data-ind-gov-lock]")?.addEventListener("change",e=>{g.strategyLock=e.target.checked;save(g.strategyLock?"Parent strategy lock enabled":"Autonomous annual strategy review enabled");});
 root.querySelectorAll("[data-ind-gov-target]").forEach(i=>{const read=i.closest(".gov2-target")?.querySelector("[data-gov-slider-read]"),refresh=()=>{const d=IND_TARGETS[i.dataset.indGovTarget];if(read)read.textContent=Number(i.value)+d.unit;};i.addEventListener("input",refresh);i.addEventListener("change",()=>{const k=i.dataset.indGovTarget,d=IND_TARGETS[k];g.targets[k]=clamp(Number(i.value),d.min,d.max);refresh();save(d.label+" target → "+g.targets[k]+d.unit);});});
}

function runSelfTests(){
 const s={year:1970,month:0,difficulty:"normal",subsidiaries:[{id:"sub",name:"Sub",value:1e8,cash:1e7,debt:2e7,lastRevenue:1e6,lastProfit:1e5,dealerHealth:70}],industry:[{id:"sub",valuation:1e8,cash:1e7,debt:2e7,monthRevenue:1e6,monthProfit:1e5,monthSales:500,marketShare:2,factoryUtilization:.7,dealerHealth:70,aiCars:[{id:"car",name:"Car",active:true,quality:80,lastSales:500,inventory:600,price:5000}]}],industrialCompanies:[{id:"steel",name:"Steel",parentOwned:true,value:5e7,cash:5e6,debt:5e6,revenue:2e6,netProfit:1e5,utilization:.8,quality:82,reliability:88,contracts:[]}]};const fail=[],check=(v,m)=>{if(!v)fail.push(m);};ensure(s);const sub=s.subsidiaries[0],m=s.industry[0];sub.groupGovernance.integration.procurement="integrated";processMonth(s);check(m.groupInputCostFactor<1,"subsidiary integration did not reach operating company");check(sub.groupGovernance.scorecardHistory.length===1,"subsidiary scorecard missing");const c=s.industrialCompanies[0];c.groupGovernance.capacityReservationPct=70;processIndustrialMonth({...s,month:1},c);check(c.parentCapacityReservationPct===70,"industrial capacity policy not propagated");check(c.groupGovernance.scorecardHistory.length>=1,"industrial scorecard missing");return{ok:fail.length===0,failures:fail};
}
G.MDXGroupControl={SUB_INTEGRATIONS,SUB_TARGETS,IND_TARGETS,ensure,ensureSub,ensureIndustrial,applySubGovernance,processMonth,renderSubsidiaryPanel,wireSubsidiary,renderIndustrialPanel,wireIndustrial,runSelfTests};
})();
