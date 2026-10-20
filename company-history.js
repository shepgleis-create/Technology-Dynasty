(()=>{
"use strict";
const MAX_EVENTS=180;
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clean=v=>String(v??"").trim();
const period=(y,m)=>num(y)*12+num(m);
const money=v=>{const n=num(v);const a=Math.abs(n);if(a>=1e9)return"$"+(n/1e9).toFixed(a>=10e9?0:1)+"B";if(a>=1e6)return"$"+(n/1e6).toFixed(a>=10e6?0:1)+"M";if(a>=1e3)return"$"+(n/1e3).toFixed(a>=1e4?0:1)+"K";return"$"+Math.round(n).toLocaleString();};
function idFor(m,e,p){return clean(m?.id||m?.name)+"|"+e+"|"+p;}
function push(m,event){
 m.companyHistory=Array.isArray(m.companyHistory)?m.companyHistory:[];
 const e={id:event.id||idFor(m,event.type,event.period),year:num(event.year),month:num(event.month),period:num(event.period,period(event.year,event.month)),type:clean(event.type||"company"),title:clean(event.title||"Company event"),detail:clean(event.detail||""),importance:Math.max(1,Math.min(3,num(event.importance,1)))};
 if(m.companyHistory.some(x=>x.id===e.id))return false;
 m.companyHistory.push(e);m.companyHistory.sort((a,b)=>num(a.period)-num(b.period));if(m.companyHistory.length>MAX_EVENTS)m.companyHistory.splice(0,m.companyHistory.length-MAX_EVENTS);return true;
}
function activeVehicleIds(m){return (m?.aiCars||[]).filter(x=>x.active!==false).map(x=>String(x.id)).sort();}
function baseline(m,state){
 m.companyHistory=Array.isArray(m.companyHistory)?m.companyHistory:[];
 const founded=num(m.founded,state?.year||1970),entry=num(m.vehicleStart??m.founded,founded);
 push(m,{id:idFor(m,"founded",founded*12),year:founded,month:0,period:founded*12,type:"founded",title:"Company founded",detail:clean(m.country)+" • "+clean(m.focus),importance:3});
 if(entry>founded)push(m,{id:idFor(m,"auto_entry",entry*12),year:entry,month:0,period:entry*12,type:"auto_entry",title:"Entered automobile production",detail:"Automotive operations began in the simulation timeline.",importance:3});
 if(!m.companyHistorySnapshot){
  m.companyHistorySnapshot={status:clean(m.status||"active"),factories:num(m.factories),dealers:num(m.dealers),employees:num(m.employees),ownerId:clean(m.ownerId||m.aiParentId||""),vehicleIds:activeVehicleIds(m),engineCount:(m.aiEngines||[]).length,transmissionCount:(m.aiTransmissions||[]).length,platformCount:(m.aiPlatforms||[]).length,recordSales:Math.max(0,num(m.monthSales)),valuation:num(m.valuation),profit:num(m.monthNetProfit??m.monthProfit),strategy:clean(m.managementStrategy||"balanced")};
 }
 return m.companyHistory;
}
function crossedMilestone(before,after){
 const marks=[1e6,2e6,5e6,10e6,25e6,50e6,100e6,250e6,500e6,1e9,2e9,5e9,10e9,25e9,50e9,100e9];
 return marks.filter(v=>before<v&&after>=v).pop()||0;
}
function captureCompany(m,state){
 baseline(m,state);const snap=m.companyHistorySnapshot||{},y=num(state.year),mo=num(state.month),p=period(y,mo),status=clean(m.status||"active"),factories=num(m.factories),dealers=num(m.dealers),employees=num(m.employees),ownerId=clean(m.ownerId||m.aiParentId||""),vehicleIds=activeVehicleIds(m),vehicleSet=new Set(snap.vehicleIds||[]),newCars=(m.aiCars||[]).filter(c=>c.active!==false&&!vehicleSet.has(String(c.id))),engineCount=(m.aiEngines||[]).length,transmissionCount=(m.aiTransmissions||[]).length,platformCount=(m.aiPlatforms||[]).length,sales=Math.max(0,num(m.monthSales)),profit=num(m.monthNetProfit??m.monthProfit),valuation=Math.max(0,num(m.valuation)),strategy=clean(m.managementStrategy||"balanced");
 if(snap.status&&status!==snap.status)push(m,{year:y,month:mo,period:p,type:"status",title:"Status: "+status.replaceAll("_"," "),detail:"Company status changed from "+snap.status.replaceAll("_"," ")+" to "+status.replaceAll("_"," ")+".",importance:["bankrupt","liquidated","acquired_by_ai","discontinued"].includes(status)?3:2});
 if(Number.isFinite(Number(snap.factories))&&factories!==num(snap.factories))push(m,{year:y,month:mo,period:p,type:"factory",title:factories>num(snap.factories)?"Factory footprint expanded":"Factory footprint reduced",detail:num(snap.factories)+" → "+factories+" operating assembly plants.",importance:2});
 if(Number.isFinite(Number(snap.dealers))&&Math.abs(dealers-num(snap.dealers))>=Math.max(5,Math.round(Math.max(1,num(snap.dealers))*.08)))push(m,{year:y,month:mo,period:p,type:"dealers",title:dealers>num(snap.dealers)?"Dealer network expanded":"Dealer network contracted",detail:num(snap.dealers).toLocaleString()+" → "+dealers.toLocaleString()+" dealer points.",importance:1});
 for(const c of newCars.slice(0,3))push(m,{id:idFor(m,"launch:"+c.id,p),year:y,month:mo,period:p,type:"vehicle",title:"Launched "+clean(c.name||"new model"),detail:"MY "+num(c.modelYear??c.year,y)+" • "+clean(c.segment||"vehicle")+" • "+Math.round(num(c.hp))+" hp.",importance:2});
 if(ownerId!==clean(snap.ownerId||""))push(m,{year:y,month:mo,period:p,type:"ownership",title:ownerId?"Ownership changed":"Returned to independent control",detail:ownerId?"New controlling company: "+ownerId+".":"The company no longer has a controlling parent.",importance:3});
 if(strategy&&snap.strategy&&strategy!==snap.strategy)push(m,{year:y,month:mo,period:p,type:"strategy",title:"Strategy changed",detail:snap.strategy.replaceAll("_"," ")+" → "+strategy.replaceAll("_"," ")+".",importance:1});
 if(engineCount>num(snap.engineCount)||transmissionCount>num(snap.transmissionCount)||platformCount>num(snap.platformCount))push(m,{year:y,month:mo,period:p,type:"technology",title:"Engineering portfolio expanded",detail:"Engines "+num(snap.engineCount)+" → "+engineCount+" • transmissions "+num(snap.transmissionCount)+" → "+transmissionCount+" • platforms "+num(snap.platformCount)+" → "+platformCount+".",importance:1});
 const oldRecord=Math.max(0,num(snap.recordSales));if(sales>=100&&sales>Math.max(oldRecord+50,oldRecord*1.15))push(m,{year:y,month:mo,period:p,type:"sales",title:"Monthly sales record",detail:sales.toLocaleString()+" vehicles sold in one month.",importance:sales>=10000?3:2});
 if(num(snap.profit)<=0&&profit>0&&["distressed","restructuring"].includes(clean(snap.status||"")))push(m,{year:y,month:mo,period:p,type:"recovery",title:"Returned to monthly profit",detail:money(profit)+" net profit during recovery.",importance:2});
 const mark=crossedMilestone(Math.max(0,num(snap.valuation)),valuation);if(mark)push(m,{id:idFor(m,"value:"+mark,p),year:y,month:mo,period:p,type:"valuation",title:"Valuation crossed "+money(mark),detail:"Simulated enterprise value reached "+money(valuation)+".",importance:mark>=1e9?3:2});
 m.companyHistorySnapshot={status,factories,dealers,employees,ownerId,vehicleIds,engineCount,transmissionCount,platformCount,recordSales:Math.max(oldRecord,sales),valuation,profit,strategy};
 return m.companyHistory;
}
function capturePlayer(state){
 state.playerCompanyHistory=Array.isArray(state.playerCompanyHistory)?state.playerCompanyHistory:[];
 const proxy={id:"player:"+clean(state.campaignId||state.company),name:state.company,founded:num(state.foundingYear??state.startYear??state.year),vehicleStart:num(state.foundingYear??state.startYear??state.year),country:clean(state.hq||""),focus:"Player manufacturer",status:"active",factories:(state.operations?.factories||[]).filter(f=>f.status==="operating").length,dealers:(state.marketSystem?.regions||[]).reduce((a,r)=>a+num(r.franchiseDealers)+num(r.companyStores),0),employees:num(state.employees),ownerId:"",aiCars:(state.vehicles||[]).map(v=>({id:v.id,name:v.name,active:v.active!==false&&v.productionStatus!=="retired",year:v.modelYear||v.createdYear,modelYear:v.modelYear,segment:v.stats?.className,hp:v.stats?.hp})),aiEngines:state.engines||[],aiTransmissions:state.transmissions||[],aiPlatforms:state.platforms||[],monthSales:(state.vehicles||[]).reduce((a,v)=>a+num(v.lastMonthSales),0),monthProfit:num(state.lastMonthSummary?.netProfit??state.lastProfit),valuation:num(state.valuation),managementStrategy:"player"};
 proxy.companyHistory=state.playerCompanyHistory;proxy.companyHistorySnapshot=state.playerCompanyHistorySnapshot;captureCompany(proxy,state);state.playerCompanyHistory=proxy.companyHistory;state.playerCompanyHistorySnapshot=proxy.companyHistorySnapshot;return state.playerCompanyHistory;
}
function captureMonth(state,log=()=>{}){
 if(!state)return{companies:0,events:0};let before=0,after=0,companies=0;
 for(const m of state.industry||[]){before+=(m.companyHistory||[]).length;captureCompany(m,state);after+=(m.companyHistory||[]).length;companies++;}
 capturePlayer(state);const added=Math.max(0,after-before);if(added)log("[Company history] Recorded "+added+" new industry milestone"+(added===1?"":"s")+" this month.");return{companies,events:added};
}
function renderCompany(m,months){
 if(!m)return"";baseline(m,{year:num(m.currentYear??m.founded),month:num(m.currentMonth)});const names=Array.isArray(months)&&months.length?months:["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"],rows=(m.companyHistory||[]).slice().sort((a,b)=>num(b.period)-num(a.period)).slice(0,60);
 return"<details class='company-history-panel'><summary><span><b>COMPANY HISTORY</b><small>"+rows.length+" recorded milestones • this simulation's timeline</small></span><strong>"+(rows[0]?rows[0].year:"—")+"</strong></summary><div class='company-history-body'>"+(rows.length?rows.map(e=>"<article class='company-history-row importance-"+num(e.importance,1)+"'><time>"+(e.month!=null?names[Math.max(0,Math.min(11,num(e.month)))]+" ":"")+e.year+"</time><div><b>"+clean(e.title)+"</b><span>"+clean(e.detail)+"</span></div></article>").join(""):"<p class='muted'>No milestones recorded yet. The timeline grows as the simulation advances.</p>")+"</div></details>";
}
function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);};const state={year:1941,month:0,campaignId:"history-test",company:"Player",vehicles:[],engines:[],transmissions:[],platforms:[],operations:{factories:[]},marketSystem:{regions:[]},industry:[]},m={id:"maker",name:"Maker",country:"US",founded:1930,vehicleStart:1935,status:"active",valuation:9000000,factories:1,dealers:20,employees:1000,aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],monthSales:100,monthProfit:-1000,managementStrategy:"balanced"};captureCompany(m,state);m.aiCars.push({id:"car1",name:"One",active:true,modelYear:1941,segment:"Family",hp:80});m.factories=2;m.monthSales=500;m.valuation=11000000;state.month=1;captureCompany(m,state);check(m.companyHistory.some(x=>x.type==="vehicle"),"vehicle launch missing");check(m.companyHistory.some(x=>x.type==="factory"),"factory change missing");check(m.companyHistory.some(x=>x.type==="valuation"),"valuation milestone missing");check(renderCompany(m).includes("COMPANY HISTORY"),"history renderer missing");return{ok:failures.length===0,failures};
}
window.MDXCompanyHistory={baseline,captureCompany,capturePlayer,captureMonth,renderCompany,runSelfTests};
})();