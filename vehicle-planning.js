(() => {
"use strict";
const CORE=window.MDX_CORE||{},DATA=window.MDX_DATA||{},clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0)),num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const SEGMENTS=["Budget","Family","Premium","Luxury","Sport","Track","Utility","Off-Road"];
const DISCIPLINES={
 architecture:{label:"Vehicle Architecture",share:.18},
 chassis:{label:"Chassis",share:.14},
 powertrain:{label:"Powertrain",share:.18},
 electrical:{label:"Electrical / Software",share:.12},
 validation:{label:"Validation",share:.15},
 manufacturing:{label:"Manufacturing Engineering",share:.13},
 design:{label:"Design",share:.10}
};
const PROGRAM_WEIGHTS={
 vehicle:{architecture:.23,chassis:.17,powertrain:.13,electrical:.10,validation:.17,manufacturing:.12,design:.08},
 engine:{architecture:.08,chassis:0,powertrain:.50,electrical:.08,validation:.22,manufacturing:.12,design:0},
 transmission:{architecture:.08,chassis:.04,powertrain:.48,electrical:.12,validation:.18,manufacturing:.10,design:0},
 platform:{architecture:.34,chassis:.20,powertrain:.04,electrical:.06,validation:.14,manufacturing:.16,design:.06},
 model:{architecture:.12,chassis:.12,powertrain:.08,electrical:.08,validation:.22,manufacturing:.16,design:.22},
 engineRevision:{architecture:.03,chassis:0,powertrain:.48,electrical:.10,validation:.27,manufacturing:.12,design:0},
 test:{architecture:0,chassis:.10,powertrain:.10,electrical:.08,validation:.67,manufacturing:.05,design:0},
 research:{architecture:.12,chassis:.10,powertrain:.22,electrical:.18,validation:.20,manufacturing:.08,design:.10}
};
const PLATFORM_DIMENSIONS={
 compact:{wheelbase:[2350,2750],track:[1420,1580],mass:[700,1500],serviceLife:10,electrical:"compact-standard",hardpoints:["strut","torsion","irs"]},
 midsize:{wheelbase:[2600,3050],track:[1480,1660],mass:[1050,1900],serviceLife:11,electrical:"midsize-standard",hardpoints:["strut","double","irs","multilink"]},
 utility:{wheelbase:[2750,3700],track:[1550,1900],mass:[1400,2800],serviceLife:14,electrical:"utility-standard",hardpoints:["double","live","irs"]},
 premium:{wheelbase:[2650,3250],track:[1500,1720],mass:[1200,2200],serviceLife:10,electrical:"premium-standard",hardpoints:["double","irs","multilink","air"]}
};
function period(state){return num(state?.year,1970)*12+num(state?.month);}
function rid(state,prefix){return CORE.randomId?CORE.randomId(state,prefix,"ids"):prefix+"_"+period(state)+"_"+Math.floor(Math.random()*99999);}
function realResearchBudget(state,budget){
 const rel=CORE.economicRelativeIndex?CORE.economicRelativeIndex("research",num(state?.year,1970),1970):1;
 return num(budget)/Math.max(.1,rel);
}
function ensure(state){
 if(!state||typeof state!=="object")return null;
 const pp=state.productPlanning=state.productPlanning&&typeof state.productPlanning==="object"?state.productPlanning:{};
 pp.version=1;pp.proposals=Array.isArray(pp.proposals)?pp.proposals:[];pp.reviewHistory=Array.isArray(pp.reviewHistory)?pp.reviewHistory:[];pp.lastReviewPeriod=pp.lastReviewPeriod==null?null:(Number.isFinite(Number(pp.lastReviewPeriod))?Number(pp.lastReviewPeriod):null);pp.replacementCycleYears=clamp(num(pp.replacementCycleYears,6),3,12);
 const eo=state.engineeringOrganization=state.engineeringOrganization&&typeof state.engineeringOrganization==="object"?state.engineeringOrganization:{};
 eo.version=1;eo.disciplineShares=eo.disciplineShares&&typeof eo.disciplineShares==="object"?eo.disciplineShares:{};
 for(const [k,v] of Object.entries(DISCIPLINES))eo.disciplineShares[k]=clamp(num(eo.disciplineShares[k],v.share),.02,.6);
 const shareSum=Object.values(eo.disciplineShares).reduce((a,b)=>a+b,0)||1;if(Math.abs(shareSum-1)>.000001){for(const k of Object.keys(eo.disciplineShares))eo.disciplineShares[k]=Number((eo.disciplineShares[k]/shareSum).toFixed(6));}
 eo.contractorFte=clamp(Math.round(num(eo.contractorFte,0)),0,500);eo.history=Array.isArray(eo.history)?eo.history:[];eo.lastSnapshotPeriod=eo.lastSnapshotPeriod==null?null:(Number.isFinite(Number(eo.lastSnapshotPeriod))?Number(eo.lastSnapshotPeriod):null);
 state.platforms=Array.isArray(state.platforms)?state.platforms:[];state.platformPrograms=Array.isArray(state.platformPrograms)?state.platformPrograms:[];
 for(const p of state.platforms)normalizePlatform(state,p);
 for(const p of state.platformPrograms)if(p?.platform)normalizePlatform(state,p.platform);
 for(const row of allPrograms(state))normalizeProgram(row.program,row.type,state);
 return{productPlanning:pp,engineeringOrganization:eo};
}
function normalizeProgram(p,type,state){
 if(!p||typeof p!=="object")return p;
 p.programGovernance=p.programGovernance&&typeof p.programGovernance==="object"?p.programGovernance:{};
 const g=p.programGovernance;g.type=g.type||type;g.originalBudget=num(g.originalBudget,p.budget);g.approvedChanges=Array.isArray(g.approvedChanges)?g.approvedChanges:[];g.contingencyPct=clamp(num(g.contingencyPct,.10),0,.50);g.scopeReduction=clamp(num(g.scopeReduction,0),0,.35);g.scopeRisk=clamp(num(g.scopeRisk,0),0,8);g.stageHistory=Array.isArray(g.stageHistory)?g.stageHistory:[];g.lastStage=g.lastStage||p.phase||"PROGRAM START";g.cancelled=!!g.cancelled;
 if(!g.stageHistory.length)g.stageHistory.push({period:period(state),phase:g.lastStage,spent:num(p.spent),remaining:num(p.daysRemaining)});
 if(p.phase&&p.phase!==g.lastStage){g.lastStage=p.phase;g.stageHistory.push({period:period(state),phase:p.phase,spent:num(p.spent),remaining:num(p.daysRemaining)});if(g.stageHistory.length>30)g.stageHistory.splice(0,g.stageHistory.length-30);}
 return p;
}
function normalizePlatform(state,p){
 if(!p||typeof p!=="object")return p;
 const d=PLATFORM_DIMENSIONS[p.type]||PLATFORM_DIMENSIONS.midsize,a=p.asset=p.asset&&typeof p.asset==="object"?p.asset:{};
 a.launchYear=num(a.launchYear,p.createdYear||state.year);a.wheelbaseRange=Array.isArray(a.wheelbaseRange)?a.wheelbaseRange:[...d.wheelbase];a.trackWidthRange=Array.isArray(a.trackWidthRange)?a.trackWidthRange:[...d.track];a.massRange=Array.isArray(a.massRange)?a.massRange:[Math.min(d.mass[0],num(p.baseMass)*4||d.mass[0]),num(p.maxWeight,d.mass[1])];a.driveLayouts=Array.isArray(a.driveLayouts)?a.driveLayouts:[...(p.supportedDrives||[p.drive||"RWD"])];a.electricalArchitecture=a.electricalArchitecture||d.electrical;a.suspensionHardpoints=Array.isArray(a.suspensionHardpoints)?a.suspensionHardpoints:[...d.hardpoints];a.plannedServiceLifeYears=clamp(num(a.plannedServiceLifeYears,d.serviceLife),5,25);a.modernizationHistory=Array.isArray(a.modernizationHistory)?a.modernizationHistory:[];a.derivatives=Array.isArray(a.derivatives)?a.derivatives:[];a.toolingCompatibility=Array.isArray(a.toolingCompatibility)?a.toolingCompatibility:[...(p.bodies||[])];a.cumulativeVolume=num(a.cumulativeVolume,0);a.technicalAge=Math.max(0,num(state.year)-a.launchYear);a.maturity=clamp(35+Math.min(40,num(p.models?.length)*8)+Math.min(25,a.cumulativeVolume/50000),20,100);
 return p;
}
function allPrograms(state){
 const rows=[],add=(arr,type)=>{for(const p of arr||[])if(p&&["active","development"].includes(String(p.status||"active"))&&!p.userPaused)rows.push({program:p,type});};
 add(state.vehiclePrograms,"vehicle");add(state.enginePrograms,"engine");add(state.transmissionPrograms,"transmission");add(state.platformPrograms,"platform");add(state.modelActions,"model");add(state.engineActions,"engineRevision");add(state.testingSystem?.activeTests,"test");add(state.researchProjects,"research");return rows;
}
function programFteDemand(state,p,type){
 const real=Math.max(0,realResearchBudget(state,p?.budget||p?.prototypeCost||0)),base=clamp(7+Math.sqrt(real/100000)*4,7,48),complexity=type==="vehicle"?1.15:type==="platform"?1.1:type==="engine"?1.02:type==="transmission"?.95:type==="test"?.6:type==="model"?.65:type==="engineRevision"?.55:.55;
 return base*complexity;
}
function capacitySummary(state){
 ensure(state);const total=Math.max(1,num(state.departments?.engineering?.staff,30)),contractors=num(state.engineeringOrganization.contractorFte),effective=total+contractors*.82,cap={},demand={};for(const k of Object.keys(DISCIPLINES)){cap[k]=effective*num(state.engineeringOrganization.disciplineShares[k]);demand[k]=0;}
 const programs=allPrograms(state);for(const {program,type} of programs){const fte=programFteDemand(state,program,type),weights=PROGRAM_WEIGHTS[type]||PROGRAM_WEIGHTS.vehicle;for(const k of Object.keys(DISCIPLINES))demand[k]+=fte*num(weights[k]);}
 const rows=Object.keys(DISCIPLINES).map(k=>({id:k,label:DISCIPLINES[k].label,capacity:cap[k],demand:demand[k],utilization:cap[k]>0?demand[k]/cap[k]:99})),bottleneck=rows.slice().sort((a,b)=>b.utilization-a.utilization)[0];
 return{employeeFte:total,contractorFte:contractors,effectiveFte:effective,rows,bottleneck,activePrograms:programs.length,overloaded:rows.some(x=>x.utilization>1)};
}
function programCapacityFactor(state,p,typeHint){
 ensure(state);const type=typeHint||allPrograms(state).find(x=>x.program===p||x.program.id===p?.id)?.type||p?.programGovernance?.type||"vehicle",summary=capacitySummary(state),weights=PROGRAM_WEIGHTS[type]||PROGRAM_WEIGHTS.vehicle,fte=programFteDemand(state,p,type);
 let factor=0,weightSum=0;for(const [k,w] of Object.entries(weights)){if(w<=0)continue;const row=summary.rows.find(x=>x.id===k),ownDemand=fte*w,totalDemand=Math.max(ownDemand,num(row?.demand)),ratio=num(row?.capacity)/Math.max(.01,totalDemand);factor+=w*clamp(.42+.58*ratio,.42,1.06);weightSum+=w;}return clamp(factor/Math.max(.01,weightSum),.42,1.06);
}
function capacityQualityDelta(state,p,typeHint){
 const f=programCapacityFactor(state,p,typeHint),g=p?.programGovernance||{};return clamp((f<.75?-(.75-f)*7:0)-num(g.scopeRisk),-5,0);
}
function contractorMonthlyCost(state){
 ensure(state);const salary=num(state.departments?.engineering?.salary,6500);return num(state.engineeringOrganization.contractorFte)*salary*1.65;
}
function setContractors(state,count){
 ensure(state);state.engineeringOrganization.contractorFte=clamp(Math.round(num(count)),0,500);return state.engineeringOrganization.contractorFte;
}
function programBudgetSummary(state,p){
 normalizeProgram(p,p?.programGovernance?.type||"vehicle",state);const g=p.programGovernance,base=CORE.programForecast?CORE.programForecast(p):{forecast:num(p.spent)+num(p.daysRemaining)*num(p.dailySpend),overrun:0,calendarDays:num(p.daysRemaining)},capacity=programCapacityFactor(state,p,g.type),calendarDays=Math.ceil(num(base.calendarDays)/Math.max(.05,capacity)),forecast=num(p.spent)+calendarDays*num(base.dailySpend),approved=num(p.budget),contingency=g.originalBudget*g.contingencyPct;
 return{originalBudget:g.originalBudget,approvedBudget:approved,spent:num(p.spent),forecastAtCompletion:forecast,contingency,capacityFactor:capacity,forecastOverrun:forecast-approved,approvedChanges:g.approvedChanges};
}
function approveContingency(state,p,amount){
 normalizeProgram(p,p?.programGovernance?.type||"vehicle",state);const g=p.programGovernance,max=g.originalBudget*.5,used=g.approvedChanges.reduce((a,x)=>a+num(x.amount),0),add=clamp(num(amount),0,Math.max(0,max-used));if(add<=0)return false;p.budget=num(p.budget)+add;g.approvedChanges.push({period:period(state),type:"contingency",amount:add});return add;
}
function reduceScope(state,p,pct=.08){
 normalizeProgram(p,p?.programGovernance?.type||"vehicle",state);const g=p.programGovernance,cut=clamp(num(pct,.08),.02,.15);if(g.scopeReduction+cut>.35)return false;g.scopeReduction+=cut;g.scopeRisk=clamp(g.scopeRisk+cut*10,0,8);p.daysRemaining=Math.max(1,num(p.daysRemaining)*(1-cut));g.approvedChanges.push({period:period(state),type:"scope_reduction",pct:cut});return true;
}
function cancelProgram(state,p,reason="Management cancelled program"){
 normalizeProgram(p,p?.programGovernance?.type||"vehicle",state);if(!p||!["active","development"].includes(String(p.status||"")))return false;const g=p.programGovernance,remaining=Math.max(0,num(p.budget)-num(p.spent)),termination=Math.min(remaining*.02,g.originalBudget*.025);if(num(state.cash)<termination)return false;state.cash-=termination;p.status="cancelled";p.userPaused=true;g.cancelled=true;g.cancelledPeriod=period(state);g.cancelReason=reason;g.sunkCost=num(p.spent);g.terminationCost=termination;g.stageHistory.push({period:period(state),phase:"CANCELLED",spent:num(p.spent),remaining:num(p.daysRemaining)});return{sunkCost:g.sunkCost,terminationCost:termination};
}
function recordStage(state,p,type){
 normalizeProgram(p,type,state);return p.programGovernance;
}
function salesHistory(state,vehicleId){
 const rows=[];for(const h of state.historyArchive||[]){const v=(h.vehicles||[]).find(x=>x.id===vehicleId);if(v)rows.push({period:num(h.period,num(h.year)*12+num(h.month)),sales:num(v.sales),production:num(v.production)});}return rows.slice(-12);
}
function vehiclePortfolioRow(state,v){
 const hist=salesHistory(state,v.id),recent=hist.slice(-3),prior=hist.slice(-6,-3),recentAvg=recent.length?recent.reduce((a,x)=>a+x.sales,0)/recent.length:num(v.lastMonthSales),priorAvg=prior.length?prior.reduce((a,x)=>a+x.sales,0)/prior.length:recentAvg,trend=priorAvg>0?(recentAvg-priorAvg)/priorAvg:0,age=Math.max(0,num(state.year)-num(v.modelYear||v.year||state.year)),margin=num(v.msrp)-num(v.stats?.unitCost),cycle=num(state.productPlanning?.replacementCycleYears,6),replacementYear=num(v.modelYear||v.year||state.year)+cycle+(trend>.15?1:trend<-.2?-1:0);
 return{id:v.id,name:v.name,segment:v.target||v.stats?.className||"Mainstream",body:v.body,platformId:v.platformId||null,modelYear:num(v.modelYear||v.year),ageYears:age,lastSales:num(v.lastMonthSales),salesTrend:trend,unitMargin:margin,plannedReplacementYear:replacementYear,productionStatus:v.productionStatus,active:v.active!==false};
}
function segmentMarketWeight(state,segment){
 const regions=(DATA.REGIONS||[]),unlocked=new Set((state.marketSystem?.regions||[]).filter(r=>r.unlocked).map(r=>r.id));let total=0;for(const r of regions){if(unlocked.size&&!unlocked.has(r.id))continue;total+=num(r.market,1)*num(r.prefs?.[segment],1);}return total||1;
}
function analyzePortfolio(state){
 ensure(state);const rows=(state.vehicles||[]).map(v=>vehiclePortfolioRow(state,v)),activePrograms=(state.vehiclePrograms||[]).filter(p=>p.status==="active").map(p=>p.vehicle?.target||p.vehicle?.stats?.className).filter(Boolean),gaps=[];
 for(const seg of SEGMENTS){const existing=rows.filter(r=>r.segment===seg&&r.active),programs=activePrograms.filter(x=>x===seg).length,marketWeight=segmentMarketWeight(state,seg),oldest=existing.slice().sort((a,b)=>b.ageYears-a.ageYears)[0],weak=existing.slice().sort((a,b)=>a.unitMargin-b.unitMargin)[0];let reason="coverage",score=marketWeight/(1+existing.length*.8+programs*.7);
  if(!existing.length&&!programs){reason="portfolio_gap";score*=1.65;}else if(oldest?.ageYears>=num(state.productPlanning.replacementCycleYears,6)){reason="aging_replacement";score*=1.45;}else if(weak&&weak.unitMargin<=0){reason="margin_repair";score*=1.35;}
  gaps.push({segment:seg,score,reason,marketWeight,currentModels:existing.length,activePrograms:programs,oldestAge:oldest?.ageYears||0,weakestMargin:weak?.unitMargin??null});
 }
 gaps.sort((a,b)=>b.score-a.score);return{rows,gaps,activePrograms:(state.vehiclePrograms||[]).filter(p=>p.status==="active").length};
}
function segmentDefaultBody(segment){
 return segment==="Utility"||segment==="Off-Road"?"suv":segment==="Sport"||segment==="Track"?"coupe":segment==="Family"?"sedan":segment==="Budget"?"hatch":"sedan";
}
function segmentBasePrice(segment){
 return{Budget:9000,Family:15000,Mainstream:17000,Premium:26000,Luxury:38000,Sport:28000,Utility:24000,"Off-Road":27000,Track:45000}[segment]||18000;
}
function comparablePrices(state,segment){
 const prices=[];for(const v of state.vehicles||[])if((v.target||v.stats?.className)===segment&&num(v.msrp)>0)prices.push(num(v.msrp));
 for(const m of state.industry||[])for(const c of m.aiCars||[])if(c.active&&String(c.segment)===segment&&num(c.price)>0)prices.push(num(c.price));
 return prices.sort((a,b)=>a-b);
}
function createProposal(state,segment,reason){
 ensure(state);if(!SEGMENTS.includes(segment))return null;const reusable=(state.productPlanning.proposals||[]).find(p=>p.targetSegment===segment&&String(p.status||"")==="proposed"&&!p.linkedVehicleId&&!p.linkedProgramId);if(reusable)return reusable;const analysis=analyzePortfolio(state),gap=analysis.gaps.find(x=>x.segment===segment),comps=comparablePrices(state,segment),marketPrice=comps.length?comps[Math.floor(comps.length/2)]:segmentBasePrice(segment)*(CORE.economicRelativeIndex?CORE.economicRelativeIndex("vehiclePrice",state.year,1970):1),dev=155000*(CORE.economicRelativeIndex?CORE.economicRelativeIndex("research",state.year,1970):1)*(segment==="Luxury"||segment==="Track"?1.55:segment==="Premium"||segment==="Sport"?1.28:1),tooling=dev*.48,contribution=Math.max(500,marketPrice*.22),breakEven=Math.ceil((dev+tooling)/contribution),marketWeight=gap?.marketWeight||segmentMarketWeight(state,segment),baseVolume=Math.max(100,Math.round(1800*marketWeight*(.55+clamp((CORE.normalizeReputation?CORE.normalizeReputation(state.rep,50):num(state.rep,50))/100,.25,1)))),proposal={id:rid(state,"proposal"),status:"proposed",createdPeriod:period(state),targetSegment:segment,targetBody:segmentDefaultBody(segment),rationale:reason||gap?.reason||"portfolio_gap",assumptions:{marketPrice,developmentBudget:dev,toolingBudget:tooling,expectedVolumeLow:Math.round(baseVolume*.65),expectedVolumeBase:baseVolume,expectedVolumeHigh:Math.round(baseVolume*1.35),contributionPerUnit:contribution,breakEvenVolume:breakEven},linkedVehicleId:null,linkedProgramId:null};
 state.productPlanning.proposals.push(proposal);return proposal;
}
function linkProposal(state,proposalId,vehicle,program){
 ensure(state);const p=state.productPlanning.proposals.find(x=>x.id===proposalId);if(!p)return false;p.status="development";p.linkedVehicleId=vehicle?.id||null;p.linkedProgramId=program?.id||null;p.authorizedPeriod=period(state);return p;
}
function closeProposalForVehicle(state,vehicleId,status="launched"){
 ensure(state);const p=state.productPlanning.proposals.find(x=>x.linkedVehicleId===vehicleId);if(!p)return false;p.status=status;p.closedPeriod=period(state);return p;
}
function reviewPortfolio(state){
 ensure(state);const p=period(state);if(state.productPlanning.lastReviewPeriod===p)return analyzePortfolio(state);const a=analyzePortfolio(state);state.productPlanning.lastReviewPeriod=p;state.productPlanning.reviewHistory.push({period:p,topGaps:a.gaps.slice(0,5).map(x=>({segment:x.segment,score:x.score,reason:x.reason})),models:a.rows.length});if(state.productPlanning.reviewHistory.length>120)state.productPlanning.reviewHistory.splice(0,state.productPlanning.reviewHistory.length-120);return a;
}
function platformHealth(state,p){
 normalizePlatform(state,p);const a=p.asset,age=Math.max(0,num(state.year)-num(a.launchYear)),life=Math.max(1,num(a.plannedServiceLifeYears)),ageRatio=age/life,maturity=clamp(num(a.maturity)+Math.min(10,num(p.models?.length)*1.5),20,100),technicalAge=clamp(ageRatio*100-Math.min(30,a.modernizationHistory.length*12),0,160),amortization=clamp(20+Math.min(80,num(p.models?.length)*14+num(a.cumulativeVolume)/15000),0,100);
 return{ageYears:age,maturity,technicalAge,toolingAmortization:amortization,serviceLifeYears:life,modernizationOpportunities:technicalAge>55?["electrical","materials","manufacturing_flexibility"]:technicalAge>35?["electrical","manufacturing_flexibility"]:[]};
}
function modernizePlatform(state,p,scope="electrical"){
 normalizePlatform(state,p);const h=platformHealth(state,p),base=125000*(CORE.economicRelativeIndex?CORE.economicRelativeIndex("research",state.year,1970):1),cost=base*(scope==="materials"?1.5:scope==="manufacturing_flexibility"?1.25:1),days=scope==="materials"?90:60;if(num(state.cash)<cost*.05)return null;
 const project={id:rid(state,"platmodern"),type:"platform_modernization",platformId:p.id,scope,status:"active",phase:"ENGINEERING",totalDays:days,daysRemaining:days,budget:cost,spent:0,dailySpend:cost/days,pace:"balanced",started:{day:state.day,month:state.month,year:state.year},healthBefore:h};return project;
}
function recordPlatformVolume(state,platformId,units){
 const p=(state.platforms||[]).find(x=>x.id===platformId);if(!p)return false;normalizePlatform(state,p);p.asset.cumulativeVolume+=Math.max(0,num(units));return p.asset.cumulativeVolume;
}
function runSelfTests(){
 const failures=[],check=(x,m)=>{if(!x)failures.push(m);},s={year:1970,month:0,campaignId:"vehicle-plan",rep:50,cash:1e7,departments:{engineering:{staff:30,salary:6000}},vehiclePrograms:[],enginePrograms:[],transmissionPrograms:[],platformPrograms:[],modelActions:[],engineActions:[],researchProjects:[],testingSystem:{activeTests:[]},vehicles:[],platforms:[],industry:[],marketSystem:{regions:[]},historyArchive:[]};
 ensure(s);check(s.productPlanning&&s.engineeringOrganization,"planning foundation missing");const a=analyzePortfolio(s);check(a.gaps.length===SEGMENTS.length&&a.gaps[0].reason==="portfolio_gap","portfolio gap analysis missing");const p=createProposal(s,"Family");check(p?.assumptions?.breakEvenVolume>0&&p.status==="proposed","business case proposal invalid");
 const program={id:"p1",status:"active",budget:500000,spent:0,totalDays:100,daysRemaining:100,phase:"DESIGN"};s.vehiclePrograms=[program];ensure(s);const c=capacitySummary(s);check(c.activePrograms===1&&c.rows.every(x=>Number.isFinite(x.utilization)),"engineering capacity invalid");const factor=programCapacityFactor(s,program,"vehicle");check(factor>=.42&&factor<=1.06,"capacity factor invalid");const b=programBudgetSummary(s,program);check(b.originalBudget===500000&&b.forecastAtCompletion>0,"program budget state invalid");const add=approveContingency(s,program,25000);check(add===25000&&program.budget===525000,"contingency authorization failed");
 const platform={id:"plat",type:"midsize",createdYear:1970,drive:"RWD",supportedDrives:["RWD"],bodies:["sedan"],maxWeight:1900,baseMass:180,models:[]};s.platforms=[platform];normalizePlatform(s,platform);const ph=platformHealth(s,platform);check(platform.asset.wheelbaseRange.length===2&&ph.maturity>=20,"platform asset enrichment failed");
 return{ok:failures.length===0,failures};
}
window.MDXVehiclePlanning={SEGMENTS,DISCIPLINES,ensure,normalizeProgram,normalizePlatform,allPrograms,capacitySummary,programCapacityFactor,capacityQualityDelta,contractorMonthlyCost,setContractors,programBudgetSummary,approveContingency,reduceScope,cancelProgram,recordStage,analyzePortfolio,createProposal,linkProposal,closeProposalForVehicle,reviewPortfolio,platformHealth,modernizePlatform,recordPlatformVolume,runSelfTests};
})();