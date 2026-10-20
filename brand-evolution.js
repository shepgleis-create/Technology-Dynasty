(() => {
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
function hash(text){let n=2166136261;for(const ch of String(text)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return(n>>>0)/4294967295;}
function period(s){return num(s?.year,1970)*12+num(s?.month,0);}
const TYPE_DEFS={
 luxury:{label:"Luxury",minYear:1955,minRep:62,minRd:48,minValue:900e6,focus:"Luxury • premium engineering • flagship vehicles",names:["Aurelius","Valmont","Regent","Clarion","Sterling","Echelon","Sovereign","Aurelia","Cavell","Belgrave","Montreux","Ascendant","Valorian","Kingswell","Paragon","Lucent"]},
 performance:{label:"Performance",minYear:1960,minRep:54,minRd:68,minValue:650e6,focus:"Performance • motorsport • high-output engineering",names:["Velocity","Apex","Veloce","Redline","Kestrel","Corsair","Strada","Ardent","Vector","Falconer","Tempest","Raven","Grand Sport","Competition Works"]},
 value:{label:"Value",minYear:1965,minRep:48,minRd:42,minValue:1200e6,focus:"Value • compact cars • high-volume affordability",names:["Metro","Coda","Pace","Vela","Mira","Canto","Via","Aster","Nexa","Luma","Tera","Brio","Cityline","Daystar"]},
 technology:{label:"Technology",minYear:1985,minRep:58,minRd:76,minValue:1800e6,focus:"Advanced technology • alternative powertrains • experimental vehicles",names:["Ion","Vectora","Nova","Helix","Polaris","Vertex","Pulse","Axiom","Arc","Voltair","Nexis","Quanta","Lucidra","Eon"]},
 electric:{label:"Electric",minYear:2000,minRep:55,minRd:72,minValue:2200e6,focus:"Electric vehicles • batteries • software-led mobility",names:["Eon","Ampere","Voltara","Ionis","Flux","Electra","Nexa E","Arcadia EV","Vektor","Current","Lumina","Charge","Kinetic","Aurora E"]}
};
function ensure(state){
 if(!state)return null;
 const x=state.marqueEvolution&&typeof state.marqueEvolution==="object"?state.marqueEvolution:{};
 x.history=Array.isArray(x.history)?x.history:[];x.lastProcessedYear=Number.isFinite(Number(x.lastProcessedYear))?Number(x.lastProcessedYear):null;x.totalCreated=num(x.totalCreated,0);
 state.marqueEvolution=x;state.corporateUnits=Array.isArray(state.corporateUnits)?state.corporateUnits:[];state.industry=Array.isArray(state.industry)?state.industry:[];return x;
}
function focusHas(unit,type){
 const f=String(unit?.focus||"").toLowerCase();
 if(type==="luxury")return f.includes("luxury")||f.includes("premium");
 if(type==="performance")return f.includes("performance")||f.includes("sport")||f.includes("racing");
 if(type==="value")return f.includes("value")||f.includes("budget")||f.includes("small car")||f.includes("compact");
 if(type==="technology")return f.includes("technology")||f.includes("experimental")||f.includes("advanced");
 if(type==="electric")return f.includes("electric")||f.includes("battery")||f.includes("ev");
 return false;
}
function reservedHistoricalType(state,parent,type){
 const year=num(state.year,1970),rows=globalThis.MD_DATA?.CORPORATE_UNITS||[];
 return rows.some(u=>u.operatingMarque&&u.parentId===parent.id&&String(u.operatingMarqueType||"")===type&&num(u.founded,9999)>year);
}
function eligibleTypes(state,parent){
 ensure(state);const year=num(state.year,1970),units=state.corporateUnits.filter(u=>u.parentId===parent.id&&String(u.status||"active")!=="discontinued"),operating=state.industry.filter(m=>m.aiParentId===parent.id&&m.operatingMarque),value=num(parent.valuation),rep=num(parent.brandReputation,50),rd=num(parent.rd,50),share=num(parent.marketShare??parent.share,0);
 return Object.entries(TYPE_DEFS).filter(([type,d])=>{
  if(year<d.minYear||value<d.minValue||rep<d.minRep||rd<d.minRd)return false;
  if(units.some(u=>focusHas(u,type))||operating.some(u=>String(u.marqueType||"")===type)||reservedHistoricalType(state,parent,type))return false;
  if(type==="value"&&share<2.5)return false;
  if(type==="electric"&&year<2000)return false;
  return true;
 }).map(([type])=>type);
}
function launchCost(state,parent,type){
 const idx=window.MDX_CORE?.economicIndex?window.MDX_CORE.economicIndex("general",state.year):Math.max(.45,Math.pow(1.03,num(state.year,1970)-1970));
 const base={luxury:90e6,performance:70e6,value:80e6,technology:140e6,electric:220e6}[type]||90e6;
 return Math.round(Math.max(base*idx,num(parent.valuation)*.008)/1000000)*1000000;
}
function uniqueName(state,parent,type){
 const def=TYPE_DEFS[type]||TYPE_DEFS.luxury,used=new Set([...(state.industry||[]),...(state.corporateUnits||[])].map(x=>String(x.name||"").toLowerCase())),start=Math.floor(hash((state.campaignId||"c")+"|"+parent.id+"|"+type+"|"+state.year)*def.names.length);
 for(let i=0;i<def.names.length;i++){const n=def.names[(start+i)%def.names.length];if(!used.has(n.toLowerCase()))return n;}
 return String(parent.name||"Motor").split(/\s+/)[0]+" "+def.label;
}
function operatingBudget(value,scale=.16){
 const base=Math.max(180000,value*.0007*Math.max(.12,scale));
 return{mode:"balanced",rd:base*1.08,quality:base*.70,marketing:base*.92,dealer:base*.45,admin:base*.56,capex:base*.52,reserveTarget:value*.02,lastChanged:0};
}
function ensureOperatingMarque(state,unit,parent,type,options={}){
 ensure(state);if(!unit||!parent)return null;const year=num(unit.vehicleStart??unit.founded,state.year),id=String(unit.id),existing=state.industry.find(m=>m.id===id);
 if(existing){existing.aiSubsidiary=true;existing.aiParentId=parent.id;existing.ownerId=parent.id;existing.operatingMarque=true;existing.marqueType=type||existing.marqueType||unit.operatingMarqueType||"luxury";unit.operatingCompanyId=existing.id;return existing;}
 const value=Math.max(25e6,num(unit.valuation,25e6)),cash=Math.max(2e6,num(unit.cash,value*.05)),employees=Math.max(120,num(unit.employees,Math.round(value/180000))),factories=Math.max(1,num(unit.factories,1)),dealers=Math.max(8,num(unit.dealers,20)),rd=clamp(num(unit.rd,num(parent.rd,55)+4),30,98),shares=100000000,parentShare=Math.max(.05,num(parent.marketShare??parent.share,.5)),shareFactor={luxury:.09,performance:.055,value:.14,technology:.045,electric:.045}[type]||.07,marketShare=Math.max(.015,parentShare*shareFactor),budget=operatingBudget(value,Math.max(.08,marketShare/Math.max(.1,parentShare)));
 const row={id,name:unit.name,country:unit.country||parent.country||"Unknown",founded:year,vehicleStart:year,activationYear:year,valuation:value,valuationAnchor:value,cash,debt:Math.max(0,num(unit.debt,0)),employees,factories,dealers,franchiseDealers:Math.max(1,Math.round(dealers*.96)),companyStores:Math.max(0,dealers-Math.round(dealers*.96)),dealerHealth:clamp(68+num(parent.brandReputation,55)*.12,55,88),dealerFloorplan:0,dealerInterest:0,aiBudget:budget,aiBudgetHistory:[],aiDecisionLog:[],capexReserve:0,underutilizedMonths:0,lossMonths:0,monthRevenue:0,monthProfit:0,monthSales:0,rd,brands:1,patents:Math.max(6,Math.round(rd*1.8)),marketShare,modelCount:type==="value"?2:1,shares,sharePrice:value/shares,acquired:false,monthlyMove:0,publicCompany:false,parentOwnership:100,publicFloat:0,historicalResolved:false,status:"active",focus:unit.focus||(TYPE_DEFS[type]?.focus||"Focused automotive marque"),aiSubsidiary:true,aiParentId:parent.id,ownerId:parent.id,parentAutonomy:"high",parentBudgetControl:"ai",parentProductMandate:type||"heritage",parentOperatingModel:"grow",parentBacking:num(parent.cash),operatingMarque:true,marqueType:type||unit.operatingMarqueType||"luxury",originCorporateUnitId:unit.id,createdBySimulation:!!unit.createdBySimulation,createdByHistoricalTimeline:!!options.historical,powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:true,allowExternalTransmissions:true}};
 if(unit.historical)row.historical={...unit.historical};
 state.industry.push(row);unit.operatingCompanyId=row.id;unit.aiOperated=true;return row;
}
function ensureHistoricalOperatingMarque(state,unit,log=()=>{}){
 ensure(state);if(!unit?.operatingMarque)return null;const launchPeriod=num(unit.founded,9999)*12+num(unit.launchMonth,0);if(period(state)<launchPeriod)return null;
 const parent=state.industry.find(m=>m.id===unit.parentId&&["active","restructuring","distressed"].includes(String(m.status||"active"))&&!m.acquired);if(!parent)return null;
 const existing=state.industry.find(m=>m.id===unit.id),row=ensureOperatingMarque(state,unit,parent,String(unit.operatingMarqueType||"luxury"),{historical:true});
 if(row&&!existing&&!unit.historicalLaunchAnnounced){unit.historicalLaunchAnnounced=true;log("[Brand launch] "+parent.name+" launched "+unit.name+" as a dedicated "+String(TYPE_DEFS[row.marqueType]?.label||row.marqueType).toLowerCase()+" marque. It now runs its own products, factories, dealers and AI management inside the parent group.");}
 return row;
}
function activateHistoricalMarques(state,log=()=>{}){
 ensure(state);const created=[];for(const unit of state.corporateUnits){const before=state.industry.some(m=>m.id===unit.id);const row=ensureHistoricalOperatingMarque(state,unit,log);if(row&&!before)created.push(row);}return created;
}
function createMarque(state,parent,type,options={}){
 ensure(state);const def=TYPE_DEFS[type];if(!parent||!def)return null;const year=num(state.year,1970),cost=num(options.cost,launchCost(state,parent,type));
 if(options.charge!==false&&num(parent.cash)<cost)return null;
 const name=String(options.name||uniqueName(state,parent,type)).trim(),id=String(options.id||("marque_"+parent.id+"_"+type+"_"+year+"_"+Math.floor(hash(name)*1e6))),existing=state.corporateUnits.find(u=>u.id===id||String(u.name).toLowerCase()===name.toLowerCase());
 if(existing){ensureOperatingMarque(state,existing,parent,type,{historical:!!options.historical});return existing;}
 if(options.charge!==false)parent.cash=num(parent.cash)-cost;
 const setupCash=Math.round(cost*.26),valuation=Math.max(25e6,Math.round(cost*(1.75+hash(id+"value")*.75))),employees=Math.max(120,Math.round(cost/180000*(.75+hash(id+"staff")*.45))),dealers=Math.max(8,Math.round(num(parent.dealers,40)*({luxury:.13,performance:.09,value:.20,technology:.08,electric:.07}[type]||.10))),factories=type==="technology"||type==="electric"?1:Math.max(1,Math.round(num(parent.factories,1)*.12));
 const reason=type==="luxury"?"reach premium buyers without pushing the parent badge further upscale":type==="performance"?"turn engineering and motorsport credibility into a dedicated performance marque":type==="value"?"cover lower-price buyers without weakening the parent company's core positioning":type==="electric"?"separate a new electric/software identity from the parent company's combustion-era image":"commercialize advanced engineering under a focused technology marque";
 const unit={id,name,parentId:parent.id,country:parent.country||"Unknown",founded:year,vehicleStart:year,valuation,debt:0,cash:setupCash,focus:def.focus,ownership:100,owner:"parent",status:"active",employees,factories,dealers,rd:clamp(num(parent.rd,55)+(type==="technology"||type==="electric"?8:type==="performance"?5:2),30,98),marqueType:type,operatingMarque:true,operatingMarqueType:type,createdBySimulation:true,origin:"parent_launched_marque",monthRevenue:0,monthProfit:0,factoryUtilization:0,historyNote:"Founded in "+year+" by "+parent.name+" as a "+def.label.toLowerCase()+" marque to "+reason+".",heritage:{foundedYear:year,parentId:parent.id,parentName:parent.name,type,reason,launchInvestment:cost,milestones:[{year,month:num(state.month,0),type:"founded",text:name+" established by "+parent.name+"."}]}};
 state.corporateUnits.push(unit);ensureOperatingMarque(state,unit,parent,type);parent.brands=Math.max(1,num(parent.brands,1))+1;parent.aiDecisionLog=Array.isArray(parent.aiDecisionLog)?parent.aiDecisionLog:[];parent.aiDecisionLog.unshift({year,month:num(state.month,0),type:"brand",text:"Created "+name+" as a "+def.label.toLowerCase()+" marque.",reason});
 const evo=ensure(state);evo.totalCreated++;evo.history.unshift({year,month:num(state.month,0),parentId:parent.id,parentName:parent.name,unitId:id,name,type,cost,reason});if(evo.history.length>80)evo.history.length=80;
 return unit;
}
function processYear(state,log=()=>{}){
 const evo=ensure(state),year=num(state.year,1970),historical=activateHistoricalMarques(state,log);if(num(state.month,0)!==0||evo.lastProcessedYear===year)return{created:historical};evo.lastProcessedYear=year;
 if(year<1955)return{created:historical};const existingCreated=state.corporateUnits.filter(u=>u.createdBySimulation).length;if(existingCreated>=20)return{created:historical};
 const parents=(state.industry||[]).filter(m=>year>=num(m.vehicleStart??m.founded,9999)&&["active","restructuring"].includes(String(m.status||"active"))&&!m.acquired&&!m.operatingMarque).sort((a,b)=>num(b.valuation)-num(a.valuation)),created=[...historical];
 for(const parent of parents){
  if(created.length>historical.length)break;const types=eligibleTypes(state,parent);if(!types.length)continue;
  const type=types[Math.floor(hash((state.campaignId||"c")+"|"+parent.id+"|type|"+year)*types.length)],cost=launchCost(state,parent,type),cash=num(parent.cash),profitable=num(parent.monthProfit)>=0||num(parent.lossMonths)<=1;
  if(cash<cost*2.2||!profitable)continue;
  const gate=hash((state.campaignId||"c")+"|"+parent.id+"|brand-launch|"+year),ambition=clamp(.18+num(parent.brandReputation,50)/260+num(parent.rd,50)/330+Math.min(.12,num(parent.marketShare,0)/80),.30,.72);
  if(gate>ambition)continue;
  const unit=createMarque(state,parent,type,{cost});if(!unit)continue;created.push(state.industry.find(m=>m.id===unit.id)||unit);log("[New marque] "+parent.name+" launched "+unit.name+" as a "+TYPE_DEFS[type].label.toLowerCase()+" brand after investing "+Math.round(cost/1e6)+"M.");
 }
 return{created};
}

function playerResearchStrength(state){
 const staff=num(state?.departments?.engineering?.staff,0),unlocked=(state?.unlocked||[]).length,rp=num(state?.rp,0);return clamp(38+Math.sqrt(Math.max(0,staff))*2.2+Math.min(22,unlocked*.65)+Math.min(12,rp/40),35,98);
}
function playerParentProxy(state){
 return{id:"player",name:String(state.company||"Parent Company"),country:String(state.hq||"Player"),valuation:num(state.valuation,1),cash:num(state.cash,0),brandReputation:num(state.rep,50),rd:playerResearchStrength(state),marketShare:num(state.marketShare,0),dealers:num(state.dealers,0),factories:num(state.factories,1),brands:Math.max(1,num(state.brands,1)),aiDecisionLog:[],status:"active"};
}
function playerEligibleTypes(state){
 const proxy=playerParentProxy(state),year=num(state.year,1970),existing=(state.subsidiaries||[]).filter(x=>x.sourceType==="player_marque"),units=(state.corporateUnits||[]).filter(x=>x.parentId==="player"&&x.operatingMarque);
 return Object.entries(TYPE_DEFS).filter(([type,d])=>year>=d.minYear&&proxy.valuation>=d.minValue&&proxy.brandReputation>=d.minRep&&proxy.rd>=d.minRd&&!existing.some(x=>x.marqueType===type)&&!units.some(x=>String(x.marqueType||x.operatingMarqueType)===type)).map(([type])=>type);
}
function createPlayerMarque(state,type,options={}){
 ensure(state);state.subsidiaries=Array.isArray(state.subsidiaries)?state.subsidiaries:[];const def=TYPE_DEFS[type],proxy=playerParentProxy(state);if(!def)return{ok:false,reason:"Unknown marque type"};if(!playerEligibleTypes(state).includes(type))return{ok:false,reason:def.label+" marque requirements are not currently met"};const cost=launchCost(state,proxy,type);if(num(state.cash)<cost)return{ok:false,reason:"Need "+Math.round(cost/1e6)+"M of parent cash to launch this marque"};
 const name=String(options.name||uniqueName(state,proxy,type)).trim();if(!name)return{ok:false,reason:"Brand name required"};if([...(state.industry||[]),...(state.corporateUnits||[])].some(x=>String(x.name||"").toLowerCase()===name.toLowerCase()))return{ok:false,reason:"That company / marque name is already in use"};
 state.cash=num(state.cash)-cost;const unit=createMarque(state,proxy,type,{name,cost,charge:false});if(!unit){state.cash+=cost;return{ok:false,reason:"Marque launch failed"};}
 unit.parentId="player";unit.owner="player";unit.ultimateOwner="player";unit.origin="player_launched_marque";unit.playerCreated=true;unit.marqueType=type;unit.heritage={...(unit.heritage||{}),parentId:"player",parentName:state.company,launchInvestment:cost};
 const m=(state.industry||[]).find(x=>x.id===unit.id);if(!m){state.cash+=cost;return{ok:false,reason:"Operating company creation failed"};}
 m.aiParentId="player";m.ownerId=null;m.parentId=null;m.parentCompanyId=null;m.acquired=true;m.playerSubsidiary=true;m.parentOwnership=100;m.parentBudgetControl="ai";m.parentAutonomy="high";m.parentProductMandate=type==="luxury"?"premium":type==="performance"?"performance":type==="value"?"value":"heritage";m.parentOperatingModel=type==="value"?"volume":type==="technology"||type==="electric"?"growth":"balanced";m.parentBacking=state.cash;m.operatingMarque=true;m.marqueType=type;m.status="active";
 const sub={id:m.id,name:m.name,value:num(m.valuation),cash:num(m.cash),debt:num(m.debt),employees:num(m.employees),factories:num(m.factories),dealers:num(m.dealers),rd:num(m.rd,50),brands:1,patents:num(m.patents),modelCount:(m.aiCars||[]).filter(c=>c.active).length,marketShare:num(m.marketShare),mode:"subsidiary",autonomy:"high",budgetControl:"ai",profitSweepPct:20,parentSupportMonthly:0,lastDividend:0,lastParentSupport:0,parentOwnership:100,publicFloat:0,publicCompany:false,acquiredYear:state.year,acquiredMonth:state.month,sourceType:"player_marque",restructuring:false,productMandate:m.parentProductMandate,operatingModel:m.parentOperatingModel,managementTransitionMonths:12,managementTransitionTotal:12,managementTransitionStage:"launch",parentCapitalInjected:cost,powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:true,allowExternalTransmissions:true},operatingCompanyId:m.id,marqueType:type,launchInvestment:cost};
 state.subsidiaries.push(sub);state.brands=Math.max(1,num(state.brands,1))+1;state.history=Array.isArray(state.history)?state.history:[];state.history.unshift({date:(["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][num(state.month,0)]||"JAN")+" "+state.year,text:"[Brand launch] "+state.company+" founded "+name+" as a dedicated "+def.label.toLowerCase()+" marque after investing "+Math.round(cost/1e6)+"M."});return{ok:true,unit,company:m,subsidiary:sub,cost};
}
function renderPlayerStudio(state,root,hooks={}){
 if(!root)return;ensure(state);const eligible=new Set(playerEligibleTypes(state)),proxy=playerParentProxy(state),playerUnits=(state.corporateUnits||[]).filter(u=>u.parentId==="player"||u.playerCreated),rows=Object.entries(TYPE_DEFS).map(([type,d])=>{const cost=launchCost(state,proxy,type),ok=eligible.has(type),reasons=[];if(state.year<d.minYear)reasons.push("available "+d.minYear);if(proxy.valuation<d.minValue)reasons.push("value "+Math.round(d.minValue/1e6)+"M+");if(proxy.brandReputation<d.minRep)reasons.push("reputation "+d.minRep+"+");if(proxy.rd<d.minRd)reasons.push("R&D "+d.minRd+"+");if(playerUnits.some(x=>String(x.marqueType||x.operatingMarqueType)===type))reasons.push("type already active");return"<article class='player-marque-card "+(ok?"eligible":"locked")+"'><div><span>"+d.label.toUpperCase()+" MARQUE</span><h4>"+d.focus+"</h4><small>"+(ok?"Board requirements met. Launch creates a separately managed automotive subsidiary with its own products, cash, dealers and factories.":reasons.join(" • "))+"</small></div><div><b>"+Math.round(cost/1e6)+"M LAUNCH</b><button type='button' class='btn "+(ok?"hero":"secondary")+"' data-player-marque='"+type+"' "+(ok?"":"disabled")+">CREATE "+d.label.toUpperCase()+" BRAND</button></div></article>"}).join("");
 const hierarchy=(state.subsidiaries||[]).filter(x=>x.sourceType==="player_marque").map(x=>"<div class='marque-hierarchy-row'><span>↳</span><div><b>"+x.name+"</b><small>"+String(x.marqueType||"marque").toUpperCase()+" • "+String(x.autonomy||"high").toUpperCase()+" AUTONOMY • "+Math.round(num(x.parentOwnership,100))+"% OWNED</small></div><strong>"+Math.round(num(x.value)/1e6)+"M</strong></div>").join("");
 root.insertAdjacentHTML("beforeend","<section class='player-brand-studio'><div class='budget-section-head'><div><span class='eyebrow'>BRAND ARCHITECTURE • PARENT COMPANY</span><h3>Create a New Marque</h3></div><span class='tag'>R&D "+Math.round(proxy.rd)+"/100</span></div><p class='muted'>Build a true separately positioned brand instead of stretching the parent badge into every market. The new marque becomes a live AI-managed subsidiary and can later use the same governance, capital, product, powertrain and merger tools as an acquired company.</p>"+(hierarchy?"<div class='marque-hierarchy'><div class='marque-parent-row'><span>◆</span><div><b>"+String(state.company)+"</b><small>PARENT COMPANY</small></div></div>"+hierarchy+"</div>":"")+"<div class='player-marque-grid'>"+rows+"</div></section>");
 root.querySelectorAll("[data-player-marque]").forEach(b=>b.addEventListener("click",()=>{const type=b.dataset.playerMarque,def=TYPE_DEFS[type],suggested=uniqueName(state,proxy,type),name=typeof prompt==="function"?prompt("Name the new "+def.label+" marque:",suggested):suggested;if(name==null)return;const r=createPlayerMarque(state,type,{name});hooks.log?.(r.ok?"Founded "+r.unit.name+" as a "+def.label.toLowerCase()+" marque.":r.reason);hooks.save?.();hooks.toast?.(r.ok?r.unit.name+" founded":r.reason);hooks.rerender?.();}));
}

function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);},s={campaignId:"brand-test",year:1990,month:0,corporateUnits:[],industry:[],marqueEvolution:{history:[]}},p={id:"parent",name:"Parent Motors",country:"United States",valuation:8e9,cash:1e9,brandReputation:78,rd:82,marketShare:8,dealers:900,factories:8,brands:1,aiDecisionLog:[],status:"active"};
 s.industry=[p];const before=p.cash,u=createMarque(s,p,"luxury",{name:"Aurelius Test",cost:100e6});check(!!u,"marque creation failed");check(p.cash===before-100e6,"parent did not fund marque creation");check(u.parentId===p.id&&u.heritage?.foundedYear===1990,"marque heritage or parent linkage missing");check(s.marqueEvolution.history.length===1,"marque history missing");const op=s.industry.find(x=>x.id===u.id);check(!!op&&op.aiSubsidiary===true&&op.aiParentId===p.id&&op.operatingMarque===true,"new marque did not become a full AI operating automaker");check(eligibleTypes(s,p).every(x=>x!=="luxury"),"duplicate luxury marque remained eligible");
 const hs={campaignId:"history-brand",year:1986,month:2,corporateUnits:[{id:"acura_test",name:"Acura",parentId:"honda_test",country:"United States",founded:1986,launchMonth:2,valuation:400e6,cash:40e6,employees:900,factories:1,dealers:80,rd:78,operatingMarque:true,operatingMarqueType:"luxury"}],industry:[{id:"honda_test",name:"Honda",country:"Japan",valuation:5e9,cash:600e6,brandReputation:80,rd:84,marketShare:7,dealers:700,factories:7,status:"active"}]};const h=activateHistoricalMarques(hs,()=>{});check(h.length===1&&hs.industry.some(x=>x.id==="acura_test"&&x.aiParentId==="honda_test"),"historical marque did not activate into smart AI");
 return{ok:failures.length===0,failures};
}
window.MDXBrandEvolution={ensure,eligibleTypes,launchCost,createMarque,playerEligibleTypes,createPlayerMarque,renderPlayerStudio,processYear,activateHistoricalMarques,ensureHistoricalOperatingMarque,ensureOperatingMarque,runSelfTests,TYPE_DEFS};
})();