/* Motor Dynasty HQ management suite.
   Implements persistent executive systems with real cash/RP/reputation effects,
   explainable rival decisions, mobile controls, audit history and save-safe state. */
(()=>{"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=s=>[num(s.year),num(s.month),num(s.day)].join("-");
const month=s=>[num(s.year),num(s.month)].join("-");
const money=v=>{const n=Math.abs(num(v)),p=num(v)<0?"−":"";return p+"$"+(n>=1e9?(n/1e9).toFixed(2)+"B":n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":Math.round(n).toLocaleString());};
const vehicleCount=s=>(Array.isArray(s.vehicles)?s.vehicles:[]).filter(v=>v&&v.active!==false&&!["retired","discontinued","archived"].includes(String(v.productionStatus||""))).length;
const factoryCount=s=>Array.isArray(s.operations?.factories)?s.operations.factories.filter(f=>f&&f.active!==false&&f.status!=="closed").length:num(s.factories);
const record=(o,s,system,kind,detail,before=null,after=null)=>{o.audit.unshift({date:date(s),year:num(s.year),month:num(s.month),day:num(s.day),system,kind,detail:String(detail||""),before,after});o.audit=o.audit.slice(0,220);};
const POLICY={
 brand:{
  heritage:{label:"Heritage",daily:550,rep:.004,rp:0,demand:.010,desc:"Craft, continuity and recognizable design language."},
  value:{label:"Value",daily:420,rep:.002,rp:0,demand:.016,desc:"Affordability, reliability and ownership value."},
  performance:{label:"Performance",daily:900,rep:.005,rp:.02,demand:.012,desc:"Driver appeal, motorsport credibility and engineering."},
  innovation:{label:"Innovation",daily:1100,rep:.004,rp:.04,demand:.011,desc:"Technology leadership and future-facing products."},
  premium:{label:"Premium",daily:1250,rep:.007,rp:0,demand:.008,desc:"Materials, service and prestige."}
 },
 positioning:{
  cost:{label:"Cost leader",daily:650,rep:.001,rp:0,margin:-.015,demand:.022},
  balanced:{label:"Balanced",daily:350,rep:.002,rp:.01,margin:0,demand:.010},
  premium:{label:"Premium",daily:900,rep:.006,rp:0,margin:.025,demand:.005},
  performance:{label:"Performance",daily:1000,rep:.004,rp:.03,margin:.015,demand:.009},
  technology:{label:"Technology",daily:1150,rep:.003,rp:.05,margin:.010,demand:.011}
 },
 culture:{
  craft:{label:"Craftsmanship",daily:500,rep:.005,rp:.01,eff:.002},
  efficiency:{label:"Operational efficiency",daily:450,rep:.001,rp:0,eff:.006},
  innovation:{label:"Innovation",daily:700,rep:.002,rp:.04,eff:.001},
  customer:{label:"Customer first",daily:550,rep:.006,rp:0,eff:.002}
 }
};
const DIVISIONS=["engineering","manufacturing","sales","finance","aftersales"];
const DELEGATION=["finance","engineering","operations","marketing"];
const MILESTONE_METRICS={
 cash:{label:"Cash reserve",value:s=>num(s.cash)},
 reputation:{label:"Reputation",value:s=>num(s.rep)},
 research:{label:"Research points",value:s=>num(s.rp)},
 models:{label:"Active models",value:s=>vehicleCount(s)}
};
function defaults(){
 return{
  audit:[],lastDay:null,lastMonth:null,lastYear:null,activeTool:"health",pendingCashRecognition:0,
  health:{plan:"balanced",dailyBudget:0,recoveryDays:0,score:50,history:[]},
  brand:{identity:"heritage",pending:null,budget:0,totalSpent:0,history:[]},
  divisions:{weights:{engineering:20,manufacturing:20,sales:20,finance:20,aftersales:20},scores:{engineering:55,manufacturing:55,sales:55,finance:55,aftersales:55},monthlyBudget:0,history:[]},
  leadership:{model:"balanced",developmentBudget:0,effectiveness:55,transitionDays:0,history:[]},
  risks:{appetite:"balanced",mitigations:{liquidity:false,debt:false,portfolio:false,reputation:false},reserveBudget:0,history:[]},
  decisions:{entries:[],consistency:50,reviewMode:"standard",reviewBudget:0,reviewDays:0,totalSpent:0},
  positioning:{strategy:"balanced",budget:0,history:[]},
  culture:{type:"craft",pending:null,history:[]},
  annual:{transparency:"standard",reports:[],lastFiledYear:null},
  fiveYear:{active:null,history:[]},
  emergency:{reserve:0,contribution:0,posture:"balanced",incidents:[],history:[]},
  delegation:{levels:{finance:1,engineering:1,operations:1,marketing:1},monthlyCap:0,history:[]},
  bottlenecks:{projects:[],history:[]},
  reputation:{components:{product:50,service:50,trust:50,employer:50},campaign:null,history:[]},
  brief:{lastGenerated:null,items:[],focus:null,focusDays:0,history:[]},
  milestones:{items:[],history:[],sequence:0}
 };
}
function ensure(s){
 if(!s.hqManagement||typeof s.hqManagement!=="object")s.hqManagement=defaults();
 const o=s.hqManagement,d=defaults();
 for(const k of Object.keys(d))if(o[k]==null)o[k]=d[k];
 o.audit=Array.isArray(o.audit)?o.audit:[];
 o.decisions.entries=Array.isArray(o.decisions?.entries)?o.decisions.entries:[];
 o.bottlenecks.projects=Array.isArray(o.bottlenecks?.projects)?o.bottlenecks.projects:[];
 o.milestones.items=Array.isArray(o.milestones?.items)?o.milestones.items:[];
 return o;
}
function spend(s,amount){
 const due=Math.max(0,Math.round(num(amount))),paid=Math.min(Math.max(0,num(s.cash)),due);
 s.cash=num(s.cash)-paid;return{paid,shortfall:due-paid};
}
function directSpend(s,o,amount,system){const r=spend(s,amount);if(r.paid){o.pendingCashRecognition=num(o.pendingCashRecognition)+r.paid;record(o,s,system||"management","cash_expense",money(r.paid));}return r;}
function pendingCashRecognition(s){return s?Math.max(0,num(ensure(s).pendingCashRecognition)):0;}
function healthScore(s,o){
 const cash=num(s.cash),profit=num(s.lastProfit??s.monthProfit),debt=Math.max(0,num(s.debt)),rep=clamp(num(s.rep),0,100),models=vehicleCount(s),plants=factoryCount(s);
 const liquidity=cash<=0?0:profit<0?clamp(cash/Math.max(1,-profit)/12*100,0,100):clamp(55+Math.log10(Math.max(10,cash))*6,0,100);
 const leverage=debt<=0?85:clamp(100-(debt/Math.max(1,cash))*24,0,100);
 const portfolio=clamp(models*18+(plants?10:0),0,100);
 return Math.round(liquidity*.30+leverage*.20+rep*.25+portfolio*.15+clamp(num(o.leadership.effectiveness),0,100)*.10);
}
function setHealthPlan(s,plan,budget){
 const o=ensure(s),allowed=["balanced","stabilize","growth","quality"];
 if(!allowed.includes(plan))return{ok:false,reason:"Unknown recovery plan"};
 budget=Number(budget);if(!Number.isSafeInteger(budget)||budget<0||budget>50000)return{ok:false,reason:"Daily budget must be a whole dollar amount from 0–50,000"};
 const before={plan:o.health.plan,budget:o.health.dailyBudget};o.health.plan=plan;o.health.dailyBudget=budget;o.health.recoveryDays=plan==="balanced"?0:90;
 record(o,s,"health","plan_changed",plan,before,{plan,budget});return{ok:true};
}
function setBrand(s,identity,budget){
 const o=ensure(s),p=POLICY.brand[identity];budget=Number(budget);
 if(!p)return{ok:false,reason:"Unknown brand identity"};
 if(!Number.isSafeInteger(budget)||budget<0||budget>25000)return{ok:false,reason:"Daily brand budget must be 0–25,000"};
 const before=o.brand.identity;o.brand.pending={identity,daysLeft:60,totalDays:60};o.brand.budget=budget;o.brand.history.unshift({date:date(s),kind:"rebrand_started",from:before,to:identity,budget,preview:{days:60,rep:p.rep,demand:p.demand}});o.brand.history=o.brand.history.slice(0,60);
 record(o,s,"brand","rebrand_started",identity,before,identity);return{ok:true,preview:{dailyCost:budget,days:60,rep:p.rep,demand:p.demand}};
}
function setDivisions(s,weights,monthlyBudget){
 const o=ensure(s),next={};let total=0;
 for(const k of DIVISIONS){const v=Number(weights?.[k]);if(!Number.isInteger(v)||v<0||v>100)return{ok:false,reason:"Division weights must be whole percentages"};next[k]=v;total+=v;}
 monthlyBudget=Number(monthlyBudget);
 if(total!==100)return{ok:false,reason:"Division allocations must total 100%"};
 if(!Number.isSafeInteger(monthlyBudget)||monthlyBudget<0||monthlyBudget>5000000)return{ok:false,reason:"Monthly division budget is invalid"};
 const before={...o.divisions.weights};o.divisions.weights=next;o.divisions.monthlyBudget=monthlyBudget;
 record(o,s,"divisions","allocation_changed",JSON.stringify(next),before,next);return{ok:true};
}
function setLeadership(s,model,budget){
 const o=ensure(s),allowed=["centralized","balanced","decentralized"];budget=Number(budget);
 if(!allowed.includes(model))return{ok:false,reason:"Unknown leadership model"};
 if(!Number.isSafeInteger(budget)||budget<0||budget>1000000)return{ok:false,reason:"Leadership budget is invalid"};
 const before={model:o.leadership.model,effectiveness:num(o.leadership.effectiveness),budget:num(o.leadership.developmentBudget)};o.leadership.model=model;o.leadership.developmentBudget=budget;o.leadership.transitionDays=45;o.leadership.history.unshift({date:date(s),kind:"model_changed",before,after:{model,budget,effectiveness:num(o.leadership.effectiveness)},transitionDays:45});o.leadership.history=o.leadership.history.slice(0,60);
 record(o,s,"leadership","model_changed",model,before,{model,budget});return{ok:true,preview:{days:45,currentEffectiveness:num(o.leadership.effectiveness),budget}};
}
function riskLevels(s,o){
 const cash=num(s.cash),debt=Math.max(0,num(s.debt)),profit=num(s.lastProfit??s.monthProfit),models=vehicleCount(s),rep=num(s.rep),burn=profit<0?-profit:0,runway=burn?cash/Math.max(1,burn):24;
 const mitigation=o.risks.mitigations||{},fund=clamp(num(o.risks.fundingRatio),0,1),consistencyBonus=Math.max(0,(num(o.decisions.consistency)-50)*.08);
 return{
  liquidity:clamp((runway<3?90:runway<6?70:runway<12?45:20)-(mitigation.liquidity?18*fund:0)-consistencyBonus,0,100),
  debt:clamp((debt>cash*2?85:debt>cash?65:debt>cash*.5?45:18)-(mitigation.debt?15*fund:0)-consistencyBonus,0,100),
  portfolio:clamp((models===0?90:models===1?72:models===2?48:22)-(mitigation.portfolio?15*fund:0)-consistencyBonus,0,100),
  reputation:clamp((rep<20?85:rep<40?60:rep<60?38:18)-(mitigation.reputation?18*fund:0)-consistencyBonus,0,100)
 };
}
function setRisk(s,appetite,mitigations,reserveBudget){
 const o=ensure(s),allowed=["conservative","balanced","aggressive"];if(!allowed.includes(appetite))return{ok:false,reason:"Unknown risk appetite"};
 reserveBudget=Number(reserveBudget);if(!Number.isSafeInteger(reserveBudget)||reserveBudget<0||reserveBudget>50000)return{ok:false,reason:"Risk budget is invalid"};
 const next={};for(const k of ["liquidity","debt","portfolio","reputation"])next[k]=!!mitigations?.[k];
 o.risks.appetite=appetite;o.risks.mitigations=next;o.risks.reserveBudget=reserveBudget;
 record(o,s,"risk","controls_changed",appetite,null,{appetite,mitigations:next,reserveBudget});return{ok:true};
}
function logDecision(s,system,summary,before=null,after=null){
 const o=ensure(s),e={id:"decision_"+date(s)+"_"+o.decisions.entries.length,date:date(s),system:String(system||"management"),summary:String(summary||"Decision"),before,after,outcome:"pending",days:0};
 o.decisions.entries.unshift(e);o.decisions.entries=o.decisions.entries.slice(0,120);return e;
}
function setDecisionReview(s,mode,budget){
 const o=ensure(s),allowed={light:{days:14,label:"Light"},standard:{days:30,label:"Standard"},forensic:{days:60,label:"Forensic"}};budget=Number(budget);
 if(!allowed[mode])return{ok:false,reason:"Unknown decision review mode"};
 if(!Number.isSafeInteger(budget)||budget<0||budget>25000)return{ok:false,reason:"Daily decision review budget must be 0–25,000"};
 if(mode!=="light"&&budget<1)return{ok:false,reason:"Standard and forensic reviews require a positive daily budget"};
 const before={mode:o.decisions.reviewMode,budget:o.decisions.reviewBudget};o.decisions.reviewMode=mode;o.decisions.reviewBudget=budget;o.decisions.reviewDays=allowed[mode].days;
 record(o,s,"decisions","review_started",allowed[mode].label,before,{mode,budget,days:o.decisions.reviewDays});return{ok:true,days:o.decisions.reviewDays};
}
function setPositioning(s,strategy,budget){
 const o=ensure(s),p=POLICY.positioning[strategy];budget=Number(budget);
 if(!p)return{ok:false,reason:"Unknown market position"};
 if(!Number.isSafeInteger(budget)||budget<0||budget>25000)return{ok:false,reason:"Daily positioning budget is invalid"};
 const before=o.positioning.strategy;o.positioning.strategy=strategy;o.positioning.budget=budget;
 record(o,s,"positioning","strategy_changed",strategy,before,strategy);logDecision(s,"positioning","Competitive position set to "+p.label,before,strategy);return{ok:true,preview:p};
}
function setCulture(s,type){
 const o=ensure(s),p=POLICY.culture[type];if(!p)return{ok:false,reason:"Unknown culture"};
 o.culture.pending={type,daysLeft:120,totalDays:120};record(o,s,"culture","change_started",p.label,o.culture.type,type);return{ok:true,days:120};
}
function fileAnnualReport(s,transparency="standard"){
 const o=ensure(s),allowed={minimal:5000,standard:12000,transparent:30000};if(!(transparency in allowed))return{ok:false,reason:"Unknown reporting standard"};
 if(o.annual.lastFiledYear===num(s.year))return{ok:false,reason:"Annual report already filed this year"};
 const cost=allowed[transparency];if(num(s.cash)<cost)return{ok:false,reason:"Insufficient cash for annual report",cost};const r=directSpend(s,o,cost,"annual");
 const report={year:num(s.year),filed:date(s),transparency,cash:num(s.cash),debt:num(s.debt),profit:num(s.lastProfit),reputation:num(s.rep),research:num(s.rp),models:vehicleCount(s),factories:factoryCount(s)};
 o.annual.transparency=transparency;o.annual.lastFiledYear=num(s.year);o.annual.reports.unshift(report);o.annual.reports=o.annual.reports.slice(0,20);
 if(transparency==="transparent")s.rep=clamp(num(s.rep)+.5,0,100);
 record(o,s,"annual","report_filed",transparency,null,report);return{ok:true,cost,report};
}
function setFiveYearPlan(s,targetCash,targetRep,targetModels,envelope){
 const o=ensure(s);targetCash=Number(targetCash);targetRep=Number(targetRep);targetModels=Number(targetModels);envelope=Number(envelope);
 if(!Number.isSafeInteger(targetCash)||targetCash<0||!Number.isFinite(targetRep)||targetRep<0||targetRep>100||!Number.isInteger(targetModels)||targetModels<0||targetModels>100||!Number.isSafeInteger(envelope)||envelope<0)return{ok:false,reason:"Five-year targets are invalid"};
 const plan={startYear:num(s.year),endYear:num(s.year)+5,start:{cash:num(s.cash),rep:num(s.rep),models:vehicleCount(s)},target:{cash:targetCash,rep:targetRep,models:targetModels},envelope,spent:0,status:"active",history:[]};
 o.fiveYear.active=plan;o.fiveYear.history.unshift({date:date(s),kind:"plan_started",target:plan.target,envelope});record(o,s,"fiveYear","plan_started","Targets set",null,plan.target);return{ok:true,plan};
}
function setEmergencyPolicy(s,posture,contribution){
 const o=ensure(s),allowed=["lean","balanced","resilient"];contribution=Number(contribution);
 if(!allowed.includes(posture)||!Number.isSafeInteger(contribution)||contribution<0||contribution>50000)return{ok:false,reason:"Emergency policy is invalid"};
 o.emergency.posture=posture;o.emergency.contribution=contribution;record(o,s,"emergency","policy_changed",posture,null,{posture,contribution});return{ok:true};
}
function respondEmergency(s,id,action){
 const o=ensure(s),incident=o.emergency.incidents.find(x=>x.id===id&&x.status==="active");if(!incident)return{ok:false,reason:"Incident is not active"};
 const costs={conserve:5000,recover:15000,full:40000},cost=costs[action];if(cost==null)return{ok:false,reason:"Unknown response"};
 const available=Math.max(0,num(s.cash));if(available<cost)return{ok:false,reason:"Insufficient cash for emergency response"};
 const fromReserve=Math.min(o.emergency.reserve,cost);o.emergency.reserve-=fromReserve;directSpend(s,o,cost,"emergency");
 incident.status="resolved";incident.action=action;incident.resolved=date(s);if(action==="full")s.rep=clamp(num(s.rep)+.4,0,100);else if(action==="conserve")s.rep=clamp(num(s.rep)-.1,0,100);
 o.emergency.history.unshift({date:date(s),kind:"resolved",id,action,cost});record(o,s,"emergency","incident_resolved",action,null,{id,cost});return{ok:true,cost};
}
function setDelegation(s,levels,monthlyCap){
 const o=ensure(s),next={};for(const k of DELEGATION){const v=Number(levels?.[k]);if(!Number.isInteger(v)||v<0||v>3)return{ok:false,reason:"Delegation levels must be 0–3"};next[k]=v;}
 monthlyCap=Number(monthlyCap);if(!Number.isSafeInteger(monthlyCap)||monthlyCap<0||monthlyCap>2000000)return{ok:false,reason:"Delegation budget is invalid"};
 o.delegation.levels=next;o.delegation.monthlyCap=monthlyCap;record(o,s,"delegation","levels_changed",JSON.stringify(next),null,next);return{ok:true};
}
function detectBottlenecks(s){
 const rows=[],plants=factoryCount(s),models=vehicleCount(s),cash=num(s.cash),rp=num(s.rp),rep=num(s.rep);
 if(plants===0&&models>0)rows.push({key:"factory",label:"No operating factory",severity:95,cost:50000,days:60});
 if(models===0)rows.push({key:"portfolio",label:"No active product",severity:85,cost:25000,days:45});
 if(cash<250000)rows.push({key:"liquidity",label:"Thin liquidity",severity:80,cost:10000,days:30});
 if(rp<10)rows.push({key:"research",label:"Low research reserve",severity:55,cost:15000,days:45});
 if(rep<35)rows.push({key:"reputation",label:"Weak brand trust",severity:60,cost:20000,days:60});
 return rows;
}
function fundBottleneck(s,key){
 const o=ensure(s),b=detectBottlenecks(s).find(x=>x.key===key);if(!b)return{ok:false,reason:"Bottleneck is not currently detected"};
 if(o.bottlenecks.projects.some(p=>p.key===key&&p.status==="active"))return{ok:false,reason:"Relief project already active"};
 if(num(s.cash)<b.cost)return{ok:false,reason:"Insufficient cash",cost:b.cost};
 directSpend(s,o,b.cost,"bottleneck");const p={key,label:b.label,cost:b.cost,daysLeft:b.days,totalDays:b.days,status:"active",started:date(s)};o.bottlenecks.projects.push(p);o.bottlenecks.history.unshift({date:date(s),kind:"funded",key,cost:b.cost});record(o,s,"bottleneck","relief_funded",b.label,null,p);return{ok:true,project:p};
}
function startReputationCampaign(s,focus,budget,days){
 const o=ensure(s),allowed=["product","service","trust","employer"];budget=Number(budget);days=Number(days);
 if(!allowed.includes(focus)||!Number.isSafeInteger(budget)||budget<0||budget>50000||!Number.isInteger(days)||days<30||days>365)return{ok:false,reason:"Campaign settings are invalid"};
 o.reputation.campaign={focus,budget,daysLeft:days,totalDays:days,spent:0};record(o,s,"reputation","campaign_started",focus,null,{budget,days});return{ok:true};
}
function generateBrief(s){
 const o=ensure(s),risks=riskLevels(s,o),items=[];
 const high=Object.entries(risks).sort((a,b)=>b[1]-a[1])[0];if(high&&high[1]>=50)items.push({kind:"risk",title:high[0]+" risk",detail:"Risk score "+Math.round(high[1])+"/100",priority:high[1]});
 const bottlenecks=detectBottlenecks(s);if(bottlenecks[0])items.push({kind:"bottleneck",title:bottlenecks[0].label,detail:"Operational constraint requires attention",priority:bottlenecks[0].severity});
 if(num(s.lastProfit)<0)items.push({kind:"finance",title:"Operating loss",detail:money(s.lastProfit)+" last reported result",priority:75});
 if(vehicleCount(s)<2)items.push({kind:"product",title:"Narrow product portfolio",detail:vehicleCount(s)+" active models",priority:60});
 if(!items.length)items.push({kind:"stable",title:"No critical executive alerts",detail:"Company indicators are inside normal ranges",priority:10});
 items.sort((a,b)=>b.priority-a.priority);o.brief.items=items.slice(0,6);o.brief.lastGenerated=date(s);return o.brief.items;
}
function focusBrief(s,kind){
 const o=ensure(s);if(!["risk","bottleneck","finance","product","stable"].includes(kind))return{ok:false,reason:"Unknown focus"};
 o.brief.focus=kind;o.brief.focusDays=14;record(o,s,"brief","focus_started",kind,null,{days:14});return{ok:true};
}
function addMilestone(s,metric,target,days,label){
 const o=ensure(s),def=MILESTONE_METRICS[metric];target=Number(target);days=Number(days);label=String(label||def?.label||"Milestone").trim();
 if(!def||!Number.isFinite(target)||target<0||!Number.isInteger(days)||days<1||days>3650||!label||label.length>60)return{ok:false,reason:"Milestone settings are invalid"};
 const m={id:"corp_milestone_"+(++o.milestones.sequence),metric,target,label,daysLeft:days,totalDays:days,start:def.value(s),latest:def.value(s),status:"active",created:date(s)};
 o.milestones.items.push(m);o.milestones.history.unshift({date:date(s),kind:"created",id:m.id,label,metric,target});record(o,s,"milestones","created",label,null,m);return{ok:true,milestone:m};
}
function cancelMilestone(s,id){const o=ensure(s),m=o.milestones.items.find(x=>x.id===id&&x.status==="active");if(!m)return false;m.status="cancelled";o.milestones.history.unshift({date:date(s),kind:"cancelled",id});record(o,s,"milestones","cancelled",m.label);return true;}
function processMonth(s,o){
 const stamp=month(s);if(o.lastMonth===stamp)return 0;o.lastMonth=stamp;let cost=0;
 // Division scorecards: underfunding hurts, focused funding raises departmental capability.
 const requested=Math.max(0,num(o.divisions.monthlyBudget)),pay=requested?spend(s,requested):{paid:0,shortfall:0};cost+=pay.paid;
 if(requested>0)for(const k of DIVISIONS){const w=num(o.divisions.weights[k]),share=pay.paid*(w/100),target=requested*(w/100),ratio=target?share/target:0;const drift=(ratio-0.65)*4+(w-20)*.08;o.divisions.scores[k]=clamp(num(o.divisions.scores[k],50)+drift,0,100);}
 const avg=DIVISIONS.reduce((a,k)=>a+num(o.divisions.scores[k]),0)/DIVISIONS.length;s.rp=num(s.rp)+Math.floor(Math.max(0,o.divisions.scores.engineering-50)/25);s.rep=clamp(num(s.rep)+(o.divisions.scores.aftersales-50)/500,0,100);
 o.divisions.history.unshift({month:stamp,paid:pay.paid,scores:{...o.divisions.scores}});o.divisions.history=o.divisions.history.slice(0,36);
 // Leadership development and effectiveness.
 const leadBudget=Math.max(0,num(o.leadership.developmentBudget)),leadPay=leadBudget?spend(s,leadBudget):{paid:0,shortfall:0};cost+=leadPay.paid;const leadRatio=leadBudget?leadPay.paid/leadBudget:0;
 const modelBase=o.leadership.model==="centralized"?56:o.leadership.model==="decentralized"?58:60,beforeLead=num(o.leadership.effectiveness);o.leadership.effectiveness=clamp(beforeLead+(leadBudget?(modelBase-beforeLead)*.16+(leadRatio-0.7)*2:-.25),0,100);o.leadership.history.unshift({month:stamp,kind:"monthly_review",model:o.leadership.model,before:beforeLead,after:o.leadership.effectiveness,budget:leadBudget,paid:leadPay.paid});o.leadership.history=o.leadership.history.slice(0,60);
 if(o.leadership.model==="decentralized")s.rp=num(s.rp)+1;if(o.leadership.model==="centralized")s.rep=clamp(num(s.rep)+.03,0,100);
 // Delegated manager actions use a capped real budget.
 let delegatedSpend=0;const perPoint=o.delegation.monthlyCap/Math.max(1,DELEGATION.reduce((a,k)=>a+num(o.delegation.levels[k]),0));
 for(const k of DELEGATION){const level=num(o.delegation.levels[k]);if(!level)continue;const p=spend(s,Math.min(50000,perPoint*level));delegatedSpend+=p.paid;if(k==="engineering")s.rp=num(s.rp)+Math.floor(p.paid/15000);if(k==="marketing")s.rep=clamp(num(s.rep)+p.paid/1000000,0,100);}
 cost+=delegatedSpend;o.delegation.history.unshift({month:stamp,spent:delegatedSpend,levels:{...o.delegation.levels},reason:"Autonomous managers applied approved departmental budgets"});o.delegation.history=o.delegation.history.slice(0,24);
 // Five-year plan consumes only its approved envelope, monthly.
 const fp=o.fiveYear.active;if(fp?.status==="active"){const remaining=Math.max(0,num(fp.envelope)-num(fp.spent)),months=Math.max(1,(num(fp.endYear)-num(s.year))*12-num(s.month)+1),planned=Math.min(remaining,Math.ceil(remaining/months)),p=spend(s,planned);fp.spent+=p.paid;cost+=p.paid;fp.history.push({month:stamp,cash:num(s.cash),rep:num(s.rep),models:vehicleCount(s),spent:fp.spent});fp.history=fp.history.slice(-60);}
 // Refresh brief monthly.
 generateBrief(s);
 return cost;
}
function processYear(s,o){
 if(o.lastYear===num(s.year))return;o.lastYear=num(s.year);
 const fp=o.fiveYear.active;if(fp?.status==="active"&&num(s.year)>=num(fp.endYear)){const ok=num(s.cash)>=fp.target.cash&&num(s.rep)>=fp.target.rep&&vehicleCount(s)>=fp.target.models;fp.status=ok?"completed":"missed";o.fiveYear.history.unshift({date:date(s),kind:fp.status,target:fp.target,actual:{cash:num(s.cash),rep:num(s.rep),models:vehicleCount(s)}});record(o,s,"fiveYear",fp.status,"Five-year plan "+fp.status);}
}
function processMilestones(s,o){
 for(const m of o.milestones.items){if(m.status!=="active")continue;m.daysLeft=Math.max(0,m.daysLeft-1);m.latest=MILESTONE_METRICS[m.metric].value(s);if(m.latest>=m.target){m.status="completed";m.finished=date(s);s.rep=clamp(num(s.rep)+.05,0,100);o.milestones.history.unshift({date:date(s),kind:"completed",id:m.id,actual:m.latest});record(o,s,"milestones","completed",m.label,m.start,m.latest);}else if(!m.daysLeft){m.status="missed";m.finished=date(s);o.milestones.history.unshift({date:date(s),kind:"missed",id:m.id,actual:m.latest});record(o,s,"milestones","missed",m.label,m.start,m.latest);}}
}
function processProjects(s,o){
 for(const p of o.bottlenecks.projects){if(p.status!=="active")continue;p.daysLeft=Math.max(0,p.daysLeft-1);if(!p.daysLeft){p.status="completed";p.finished=date(s);if(p.key==="research")s.rp=num(s.rp)+5;if(p.key==="reputation")s.rep=clamp(num(s.rep)+2,0,100);if(p.key==="liquidity")o.health.score=clamp(num(o.health.score)+5,0,100);o.bottlenecks.history.unshift({date:date(s),kind:"completed",key:p.key});record(o,s,"bottleneck","relief_completed",p.label);}}
}
function processDecisions(s,o){
 let cost=0;for(const d of o.decisions.entries){if(d.outcome!=="pending")continue;d.days++;if(d.days>=30){d.outcome=num(s.lastProfit)>=0?"positive":"mixed";d.resolved=date(s);}}
 const recent=o.decisions.entries.slice(0,10),changes=recent.filter(d=>d.outcome==="mixed").length,base=clamp(70-changes*4,0,100);
 if(o.decisions.reviewDays>0){const due=Math.max(0,num(o.decisions.reviewBudget)),p=spend(s,due);cost+=p.paid;o.decisions.totalSpent=num(o.decisions.totalSpent)+p.paid;const ratio=due?p.paid/due:1,gain=(o.decisions.reviewMode==="forensic"?.12:o.decisions.reviewMode==="standard"?.07:.03)*ratio;o.decisions.consistency=clamp(Math.max(base,num(o.decisions.consistency))+gain,0,100);o.decisions.reviewDays--;if(!o.decisions.reviewDays)record(o,s,"decisions","review_completed",o.decisions.reviewMode,null,{consistency:o.decisions.consistency});}
 else o.decisions.consistency=clamp((num(o.decisions.consistency)*.8)+(base*.2),0,100);
 return cost;
}
function processDay(s){
 if(!s)return 0;const o=ensure(s);processRivals(s);const today=date(s);if(o.lastDay===today)return 0;o.lastDay=today;let charged=Math.max(0,num(o.pendingCashRecognition));o.pendingCashRecognition=0;
 // Company health recovery plan.
 o.health.score=healthScore(s,o);const healthPay=spend(s,o.health.dailyBudget);charged+=healthPay.paid;
 if(o.health.plan==="stabilize"){if(num(s.cash)>0)s.rep=clamp(num(s.rep)+.002,0,100);}
 else if(o.health.plan==="growth"){s.rp=num(s.rp)+((num(s.day)%10===0&&healthPay.paid)?1:0);}
 else if(o.health.plan==="quality"){s.rep=clamp(num(s.rep)+(healthPay.paid?0.006:0),0,100);}
 if(o.health.recoveryDays>0)o.health.recoveryDays--;
 o.health.history.push({date:today,score:o.health.score,cash:num(s.cash),debt:num(s.debt),rep:num(s.rep)});o.health.history=o.health.history.slice(-120);
 // Risk controls require real daily funding; unfunded mitigations lose effectiveness.
 const riskDue=Math.max(0,num(o.risks.reserveBudget)),riskPay=spend(s,riskDue);charged+=riskPay.paid;o.risks.fundingRatio=riskDue?riskPay.paid/riskDue:0;if(riskDue&&riskPay.paid<riskDue)record(o,s,"risk","underfunded","Risk controls short by "+money(riskDue-riskPay.paid));
 if(o.leadership.transitionDays>0)o.leadership.transitionDays--;
 // Brand transition and identity spending.
 if(o.brand.pending){o.brand.pending.daysLeft--;if(o.brand.pending.daysLeft<=0){const completed=o.brand.pending.identity,from=o.brand.identity;o.brand.identity=completed;o.brand.pending=null;o.brand.history.unshift({date:today,kind:"rebrand_completed",from,to:completed,totalSpent:num(o.brand.totalSpent),reputation:num(s.rep)});o.brand.history=o.brand.history.slice(0,60);record(o,s,"brand","rebrand_completed",o.brand.identity,from,completed);}}
 const brandCfg=POLICY.brand[o.brand.pending?.identity||o.brand.identity]||POLICY.brand.heritage,brandDue=Math.max(0,num(o.brand.budget)),brandPay=spend(s,brandDue);charged+=brandPay.paid;o.brand.totalSpent+=brandPay.paid;const brandRatio=brandDue?brandPay.paid/brandDue:0;s.rep=clamp(num(s.rep)+brandCfg.rep*brandRatio,0,100);o.brand.researchRemainder=num(o.brand.researchRemainder)+brandCfg.rp*brandRatio;const brp=Math.floor(o.brand.researchRemainder);o.brand.researchRemainder-=brp;s.rp=num(s.rp)+brp;s.brandDemandModifier=brandCfg.demand;
 // Competitive positioning.
 const pos=POLICY.positioning[o.positioning.strategy]||POLICY.positioning.balanced,posDue=Math.max(0,num(o.positioning.budget)),posPay=spend(s,posDue);charged+=posPay.paid;const posRatio=posDue?posPay.paid/posDue:0;s.rep=clamp(num(s.rep)+pos.rep*posRatio,0,100);o.positioning.rpRemainder=num(o.positioning.rpRemainder)+pos.rp*posRatio;const prp=Math.floor(o.positioning.rpRemainder);o.positioning.rpRemainder-=prp;s.rp=num(s.rp)+prp;s.marketPositioning={strategy:o.positioning.strategy,demandModifier:pos.demand,marginModifier:pos.margin};
 // Corporate culture transition + program.
 if(o.culture.pending){o.culture.pending.daysLeft--;if(o.culture.pending.daysLeft<=0){o.culture.type=o.culture.pending.type;o.culture.pending=null;record(o,s,"culture","change_completed",o.culture.type);}}
 const cul=POLICY.culture[o.culture.pending?.type||o.culture.type]||POLICY.culture.craft,culPay=o.culture.pending?spend(s,cul.daily):{paid:0,shortfall:0};charged+=culPay.paid;const culRatio=o.culture.pending&&cul.daily?culPay.paid/cul.daily:0;s.rep=clamp(num(s.rep)+cul.rep*culRatio,0,100);o.culture.rpRemainder=num(o.culture.rpRemainder)+cul.rp*culRatio;const crp=Math.floor(o.culture.rpRemainder);o.culture.rpRemainder-=crp;s.rp=num(s.rp)+crp;s.cultureEfficiencyModifier=cul.eff;
 // Emergency reserve contribution is an internal transfer, not an expense.
 const reserveDue=Math.max(0,num(o.emergency.contribution));o.emergency.reserve=Math.min(Math.max(0,num(s.cash)),Math.max(0,num(o.emergency.reserve))+reserveDue);
 const risks=riskLevels(s,o),maxRisk=Math.max(...Object.values(risks));if(maxRisk>=85&&!o.emergency.incidents.some(x=>x.status==="active")){const id="incident_"+today,oops={id,date:today,type:Object.entries(risks).sort((a,b)=>b[1]-a[1])[0][0],severity:maxRisk,status:"active"};o.emergency.incidents.unshift(oops);o.emergency.incidents=o.emergency.incidents.slice(0,30);record(o,s,"emergency","incident_opened",oops.type,null,oops);}
 // Reputation campaign.
 const camp=o.reputation.campaign;if(camp){const p=spend(s,camp.budget);charged+=p.paid;camp.spent+=p.paid;camp.daysLeft--;const ratio=camp.budget?p.paid/camp.budget:1;o.reputation.components[camp.focus]=clamp(num(o.reputation.components[camp.focus])+0.025*ratio,0,100);if(camp.daysLeft<=0){o.reputation.history.unshift({date:today,kind:"campaign_completed",focus:camp.focus,spent:camp.spent});o.reputation.campaign=null;}}
 const comp=o.reputation.components,aggregate=(num(comp.product)+num(comp.service)+num(comp.trust)+num(comp.employer))/4;s.rep=clamp(num(s.rep)*.98+aggregate*.02,0,100);
 // Executive brief focus has a modest real cost and benefit.
 if(o.brief.focusDays>0){const p=spend(s,500);charged+=p.paid;o.brief.focusDays--;if(o.brief.focus==="product"&&p.paid)s.rp=num(s.rp)+((num(s.day)%7===0)?1:0);if(o.brief.focus==="risk"&&p.paid)o.health.score=clamp(num(o.health.score)+.03,0,100);if(!o.brief.focusDays)o.brief.focus=null;}
 processMilestones(s,o);processProjects(s,o);charged+=processDecisions(s,o);charged+=processMonth(s,o);processYear(s,o);
 return charged;
}
function processRivals(s){
 if(!Array.isArray(s.industry))return 0;const stamp=month(s);let count=0;
 for(const r of s.industry){
  if(!r||["bankrupt","liquidated","merged_into_player"].includes(String(r.status||"")))continue;
  const ai=r.hqManagementAI||{};if(ai.month===stamp)continue;
  const cash=Math.max(0,num(r.cash)),profit=num(r.monthProfit??r.monthNetProfit),rep=clamp(num(r.reputation??r.rep??50),0,100),models=Array.isArray(r.aiCars)?r.aiCars.filter(v=>v.active!==false).length:num(r.modelCount),rd=num(r.rd,50),debt=Math.max(0,num(r.debt));
  const healthPlan=cash<250000?"stabilize":profit<0?"quality":models<2?"growth":"balanced";
  const brand=rep<35?"value":models<=2?"innovation":profit>0?"premium":"heritage";
  const divisionFocus=profit<0?"finance":models<2?"engineering":rep<40?"sales":"manufacturing";
  const leadershipModel=cash<500000?"centralized":rd>70?"decentralized":"balanced";
  const risk=cash<250000||debt>cash?"conservative":profit>0&&cash>5000000?"aggressive":"balanced";
  const decisionPolicy=profit<0?"cash-first":models<2?"product-first":"balanced";
  const positioning=cash<500000?"cost":rep>65?"premium":models<3?"technology":"balanced";
  const culture=profit<0?"efficiency":rep<40?"customer":models<3?"innovation":"craft";
  const reporting=cash<200000?"minimal":rep<40?"transparent":"standard";
  const fiveYear=models<2?"portfolio-growth":cash<1000000?"liquidity-growth":rd>65?"technology-lead":"balanced-growth";
  const emergencyPosture=cash<500000||debt>cash?"resilient":profit>0?"balanced":"resilient";
  const delegation=cash>2000000?2:cash>500000?1:0;
  const bottleneck=cash<250000?"liquidity":models<2?"portfolio":rd<35?"research":rep<40?"reputation":"capacity";
  const reputationFocus=rep<35?"trust":profit<0?"employer":"product";
  const briefPriority=cash<250000?"finance":models<2?"product":rep<40?"market":"operations";
  const milestone=healthPlan==="stabilize"?"cash-reserve":models<2?"three-model-lineup":rep<40?"reputation-50":"profit-growth";
  const budget=Math.min(cash,Math.max(0,cash*.002)),paid=Math.round(budget);
  if(Number.isFinite(Number(r.cash)))r.cash=cash-paid;
  if(brand==="innovation"||culture==="innovation"||divisionFocus==="engineering")r.rd=rd+Math.min(1.5,paid/40000);
  if(brand==="premium"||culture==="customer"||reputationFocus==="trust")r.reputation=clamp(rep+Math.min(.35,paid/90000),0,100);
  if(divisionFocus==="finance"&&profit<0)r.monthProfit=profit+Math.min(Math.abs(profit)*.03,paid*.08);
  const reason=cash<500000?"Liquidity constrains corporate programs":rep<40?"Reputation weakness changes brand, culture and reporting priorities":models<3?"Thin product coverage drives engineering and portfolio growth":"Profitable scale supports balanced corporate investment";
  const decisions={healthPlan,brand,divisionFocus,leadershipModel,risk,decisionPolicy,positioning,culture,reporting,fiveYear,emergencyPosture,delegation,bottleneck,reputationFocus,briefPriority,milestone};
  r.hqManagementAI={month:stamp,...decisions,spend:paid,reason,history:[...(ai.history||[]).slice(-11),{month:stamp,...decisions,spend:paid,reason}]};
  count++;
 }
 return count;
}
function snapshot(s){
 const o=ensure(s);return{health:o.health.score,brand:o.brand.identity,divisionAverage:DIVISIONS.reduce((a,k)=>a+num(o.divisions.scores[k]),0)/DIVISIONS.length,leadership:o.leadership.effectiveness,risks:riskLevels(s,o),positioning:o.positioning.strategy,culture:o.culture.type,reputation:{...o.reputation.components},bottlenecks:detectBottlenecks(s),brief:generateBrief(s)};
}
function toolLabel(k){return({health:"Company Health",brand:"Brand Identity",divisions:"Division Performance",leadership:"Leadership Team",risks:"Risk Register",decisions:"Decision History",positioning:"Competitive Positioning",culture:"Corporate Culture",annual:"Annual Report",fiveYear:"Five-Year Plan",emergency:"Emergency Response",delegation:"Management Delegation",bottlenecks:"Operational Bottlenecks",reputation:"Company Reputation",brief:"Executive Brief",milestones:"Company Milestones"})[k]||k;}
const TOOLS=["health","brand","divisions","leadership","risks","decisions","positioning","culture","annual","fiveYear","emergency","delegation","bottlenecks","reputation","brief","milestones"];
function selectOptions(map,selected){return Object.entries(map).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===selected?'selected':'')+'>'+esc(v.label||k)+'</option>').join("");}
function meter(label,value){value=clamp(num(value),0,100);return'<div class="hq-suite-meter"><div><span>'+esc(label)+'</span><b>'+Math.round(value)+'</b></div><i><em style="width:'+value+'%"></em></i></div>';}
function bodyFor(tool,s,o){
 if(tool==="health"){const score=healthScore(s,o);return'<div class="hq-suite-kpis"><b>'+score+'<small>/100 health</small></b><span>'+money(s.cash)+' cash</span><span>'+money(s.debt)+' debt</span><span>'+vehicleCount(s)+' active models</span></div>'+meter("Company health",score)+'<div class="hq-suite-form"><label>Recovery plan<select data-hq-field="healthPlan"><option value="balanced">Balanced</option><option value="stabilize">Stabilize</option><option value="growth">Growth</option><option value="quality">Quality recovery</option></select></label><label>Daily recovery budget<input data-hq-field="healthBudget" type="number" min="0" max="50000" value="'+num(o.health.dailyBudget)+'"></label><button data-hq-action="health">APPLY HEALTH PLAN</button></div>';}
 if(tool==="brand"){const p=POLICY.brand[o.brand.pending?.identity||o.brand.identity];return'<div class="hq-suite-kpis"><b>'+esc(p.label)+'</b><span>'+money(o.brand.totalSpent)+' invested</span><span>'+((p.demand||0)*100).toFixed(1)+'% demand effect</span><span>'+(o.brand.pending?o.brand.pending.daysLeft+" days to rebrand":"Identity active")+'</span></div><div class="hq-suite-form"><label>Brand identity<select data-hq-field="brand">'+selectOptions(POLICY.brand,o.brand.identity)+'</select></label><label>Daily brand budget<input data-hq-field="brandBudget" type="number" min="0" max="25000" value="'+num(o.brand.budget)+'"></label><button data-hq-action="brand">START 60-DAY REBRAND</button></div><p>'+esc(p.desc)+'</p>';}
 if(tool==="divisions"){return'<div class="hq-suite-scorecards">'+DIVISIONS.map(k=>meter(k,o.divisions.scores[k])).join("")+'</div><div class="hq-suite-form hq-suite-allocation">'+DIVISIONS.map(k=>'<label>'+esc(k)+' %<input data-hq-division="'+k+'" type="number" min="0" max="100" value="'+num(o.divisions.weights[k])+'"></label>').join("")+'<label>Monthly budget<input data-hq-field="divisionBudget" type="number" min="0" max="5000000" value="'+num(o.divisions.monthlyBudget)+'"></label><button data-hq-action="divisions">SAVE ALLOCATION</button></div>';}
 if(tool==="leadership"){return meter("Leadership effectiveness",o.leadership.effectiveness)+'<div class="hq-suite-form"><label>Operating model<select data-hq-field="leadership"><option value="centralized" '+(o.leadership.model==="centralized"?"selected":"")+'>Centralized</option><option value="balanced" '+(o.leadership.model==="balanced"?"selected":"")+'>Balanced</option><option value="decentralized" '+(o.leadership.model==="decentralized"?"selected":"")+'>Decentralized</option></select></label><label>Monthly development budget<input data-hq-field="leadershipBudget" type="number" min="0" max="1000000" value="'+num(o.leadership.developmentBudget)+'"></label><button data-hq-action="leadership">UPDATE LEADERSHIP MODEL</button></div>';}
 if(tool==="risks"){const levels=riskLevels(s,o);return'<div class="hq-suite-scorecards">'+Object.entries(levels).map(([k,v])=>meter(k+" risk",v)).join("")+'</div><div class="hq-suite-form"><label>Risk appetite<select data-hq-field="riskAppetite"><option value="conservative" '+(o.risks.appetite==="conservative"?"selected":"")+'>Conservative</option><option value="balanced" '+(o.risks.appetite==="balanced"?"selected":"")+'>Balanced</option><option value="aggressive" '+(o.risks.appetite==="aggressive"?"selected":"")+'>Aggressive</option></select></label>'+Object.keys(levels).map(k=>'<label class="hq-suite-check"><input data-hq-mitigation="'+k+'" type="checkbox" '+(o.risks.mitigations[k]?"checked":"")+'>Mitigate '+esc(k)+'</label>').join("")+'<label>Daily controls budget<input data-hq-field="riskBudget" type="number" min="0" max="50000" value="'+num(o.risks.reserveBudget)+'"></label><button data-hq-action="risk">SAVE RISK CONTROLS</button></div>';}
 if(tool==="decisions"){return'<div class="hq-suite-kpis"><b>'+Math.round(o.decisions.consistency)+'<small>/100 consistency</small></b><span>'+o.decisions.entries.length+' recorded decisions</span><span>'+o.decisions.reviewDays+' review days left</span><span>'+money(o.decisions.totalSpent)+' review spend</span></div><div class="hq-suite-form"><label>Decision review<select data-hq-field="decisionReview"><option value="light" '+(o.decisions.reviewMode==="light"?"selected":"")+'>Light • 14 days</option><option value="standard" '+(o.decisions.reviewMode==="standard"?"selected":"")+'>Standard • 30 days</option><option value="forensic" '+(o.decisions.reviewMode==="forensic"?"selected":"")+'>Forensic • 60 days</option></select></label><label>Daily review budget<input data-hq-field="decisionBudget" type="number" min="0" max="25000" value="'+num(o.decisions.reviewBudget)+'"></label><button data-hq-action="decisions">START DECISION REVIEW</button></div><div class="hq-suite-ledger">'+(o.decisions.entries.length?o.decisions.entries.slice(0,30).map(d=>'<article><b>'+esc(d.summary)+'</b><small>'+esc(d.date)+' • '+esc(d.system)+' • '+esc(d.outcome)+'</small></article>').join(""):'<p>No major management decisions recorded yet.</p>')+'</div>';}
 if(tool==="positioning"){const p=POLICY.positioning[o.positioning.strategy];return'<div class="hq-suite-kpis"><b>'+esc(p.label)+'</b><span>'+((p.demand||0)*100).toFixed(1)+'% demand modifier</span><span>'+((p.margin||0)*100).toFixed(1)+'% margin intent</span></div><div class="hq-suite-form"><label>Competitive position<select data-hq-field="positioning">'+selectOptions(POLICY.positioning,o.positioning.strategy)+'</select></label><label>Daily execution budget<input data-hq-field="positioningBudget" type="number" min="0" max="25000" value="'+num(o.positioning.budget)+'"></label><button data-hq-action="positioning">SET POSITION</button></div>';}
 if(tool==="culture"){const p=POLICY.culture[o.culture.pending?.type||o.culture.type];return'<div class="hq-suite-kpis"><b>'+esc(p.label)+'</b><span>'+(o.culture.pending?o.culture.pending.daysLeft+" days remaining":"Culture established")+'</span><span>'+((p.eff||0)*100).toFixed(1)+'% efficiency effect</span></div><div class="hq-suite-form"><label>Culture<select data-hq-field="culture">'+selectOptions(POLICY.culture,o.culture.type)+'</select></label><button data-hq-action="culture">BEGIN CULTURE CHANGE</button></div>';}
 if(tool==="annual"){return'<div class="hq-suite-kpis"><b>'+o.annual.reports.length+'<small>reports on file</small></b><span>Last filed '+(o.annual.lastFiledYear??"never")+'</span></div><div class="hq-suite-form"><label>Disclosure standard<select data-hq-field="annual"><option value="minimal">Minimal • $5,000</option><option value="standard" selected>Standard • $12,000</option><option value="transparent">Transparent • $30,000</option></select></label><button data-hq-action="annual">FILE ANNUAL REPORT</button></div><div class="hq-suite-ledger">'+o.annual.reports.slice(0,10).map(r=>'<article><b>'+r.year+' annual report</b><small>'+esc(r.transparency)+' • '+money(r.cash)+' cash • '+money(r.profit)+' profit • '+r.models+' models</small></article>').join("")+'</div>';}
 if(tool==="fiveYear"){const p=o.fiveYear.active;return(p?'<div class="hq-suite-kpis"><b>'+esc(p.status.toUpperCase())+'</b><span>'+p.startYear+'–'+p.endYear+'</span><span>'+money(p.spent)+' / '+money(p.envelope)+' invested</span></div>':'<p>No active five-year plan.</p>')+'<div class="hq-suite-form"><label>Target cash<input data-hq-field="planCash" type="number" min="0" value="'+Math.max(1000000,num(s.cash))+'"></label><label>Target reputation<input data-hq-field="planRep" type="number" min="0" max="100" value="'+Math.max(65,Math.round(num(s.rep)))+'"></label><label>Target active models<input data-hq-field="planModels" type="number" min="0" max="100" value="'+Math.max(4,vehicleCount(s))+'"></label><label>5-year investment envelope<input data-hq-field="planEnvelope" type="number" min="0" value="500000"></label><button data-hq-action="fiveYear">APPROVE FIVE-YEAR PLAN</button></div>';}
 if(tool==="emergency"){const active=o.emergency.incidents.filter(i=>i.status==="active");return'<div class="hq-suite-kpis"><b>'+money(o.emergency.reserve)+'<small>emergency reserve</small></b><span>'+active.length+' active incidents</span></div><div class="hq-suite-form"><label>Response posture<select data-hq-field="posture"><option value="lean">Lean</option><option value="balanced" selected>Balanced</option><option value="resilient">Resilient</option></select></label><label>Daily reserve contribution<input data-hq-field="emergencyContribution" type="number" min="0" max="50000" value="'+num(o.emergency.contribution)+'"></label><button data-hq-action="emergencyPolicy">SAVE RESPONSE POLICY</button></div><div class="hq-suite-ledger">'+(active.length?active.map(i=>'<article><b>'+esc(i.type)+' incident • '+Math.round(i.severity)+'/100</b><small>'+esc(i.date)+'</small><div><button data-hq-response="'+esc(i.id)+'" data-response-type="conserve">Conserve</button><button data-hq-response="'+esc(i.id)+'" data-response-type="recover">Recover</button><button data-hq-response="'+esc(i.id)+'" data-response-type="full">Full response</button></div></article>').join(""):'<p>No active emergency incident.</p>')+'</div>';}
 if(tool==="delegation"){return'<div class="hq-suite-form hq-suite-allocation">'+DELEGATION.map(k=>'<label>'+esc(k)+' autonomy 0–3<input data-hq-delegate="'+k+'" type="range" min="0" max="3" step="1" value="'+num(o.delegation.levels[k])+'"></label>').join("")+'<label>Monthly autonomous budget cap<input data-hq-field="delegationCap" type="number" min="0" max="2000000" value="'+num(o.delegation.monthlyCap)+'"></label><button data-hq-action="delegation">SAVE DELEGATION</button></div><p>Managers spend only inside this cap and record an explainable monthly action.</p>';}
 if(tool==="bottlenecks"){const rows=detectBottlenecks(s);return'<div class="hq-suite-ledger">'+(rows.length?rows.map(b=>'<article><b>'+esc(b.label)+'</b><small>'+Math.round(b.severity)+'/100 severity • '+money(b.cost)+' • '+b.days+' days</small><button data-hq-bottleneck="'+esc(b.key)+'">FUND RELIEF</button></article>').join(""):'<p>No material bottlenecks detected.</p>')+'</div><h4>Active relief projects</h4><div class="hq-suite-ledger">'+o.bottlenecks.projects.filter(p=>p.status==="active").map(p=>'<article><b>'+esc(p.label)+'</b><small>'+p.daysLeft+' days remaining • '+money(p.cost)+'</small></article>').join("")+'</div>';}
 if(tool==="reputation"){const c=o.reputation.components;return'<div class="hq-suite-scorecards">'+Object.entries(c).map(([k,v])=>meter(k,v)).join("")+'</div><div class="hq-suite-form"><label>Campaign focus<select data-hq-field="repFocus">'+Object.keys(c).map(k=>'<option value="'+k+'">'+esc(k)+'</option>').join("")+'</select></label><label>Daily campaign budget<input data-hq-field="repBudget" type="number" min="0" max="50000" value="1000"></label><label>Campaign days<input data-hq-field="repDays" type="number" min="30" max="365" value="90"></label><button data-hq-action="reputation">START CAMPAIGN</button></div>';}
 if(tool==="brief"){const items=generateBrief(s);return'<div class="hq-suite-ledger">'+items.map(i=>'<article><b>'+esc(i.title)+'</b><small>'+esc(i.detail)+' • priority '+Math.round(i.priority)+'</small><button data-hq-focus="'+esc(i.kind)+'">FOCUS 14 DAYS</button></article>').join("")+'</div>';}
 if(tool==="milestones"){return'<div class="hq-suite-form"><label>Milestone label<input data-hq-field="milestoneLabel" maxlength="60" value="Growth milestone"></label><label>Metric<select data-hq-field="milestoneMetric">'+Object.entries(MILESTONE_METRICS).map(([k,v])=>'<option value="'+k+'">'+esc(v.label)+'</option>').join("")+'</select></label><label>Target<input data-hq-field="milestoneTarget" type="number" min="0" value="1000000"></label><label>Deadline days<input data-hq-field="milestoneDays" type="number" min="1" max="3650" value="365"></label><button data-hq-action="milestone">SET COMPANY MILESTONE</button></div><div class="hq-suite-ledger">'+o.milestones.items.slice().reverse().map(m=>'<article><b>'+esc(m.label)+'</b><small>'+esc(m.status)+' • '+Math.round(m.latest).toLocaleString()+' / '+Math.round(m.target).toLocaleString()+' • '+m.daysLeft+' days</small>'+(m.status==="active"?'<button data-hq-milestone-cancel="'+esc(m.id)+'">Cancel</button>':'')+'</article>').join("")+'</div>';}
 return"<p>Management system unavailable.</p>";
}
function render(){
 if(typeof document==="undefined")return;const s=G.MDXGame?.getState?.(),home=document.getElementById("view-home");if(!s||!home||!home.classList.contains("active"))return;const o=ensure(s);
 let root=document.getElementById("md-hq-suite");if(!root){root=document.createElement("section");root.id="md-hq-suite";root.className="panel md-hq-suite";home.appendChild(root);}
 const tool=TOOLS.includes(o.activeTool)?o.activeTool:"health",snap=snapshot(s);
 root.innerHTML='<header class="hq-suite-head"><div><span class="eyebrow">CORPORATE MANAGEMENT SYSTEM</span><h3>Executive control center</h3><p>Persistent management programs tied directly to cash, research, reputation and company state.</p></div><div class="hq-suite-health"><b>'+Math.round(snap.health)+'</b><span>COMPANY HEALTH</span></div></header><nav class="hq-suite-nav" aria-label="Corporate management tools">'+TOOLS.map(k=>'<button type="button" data-hq-tool="'+k+'" class="'+(k===tool?"active":"")+'">'+esc(toolLabel(k))+'</button>').join("")+'</nav><section class="hq-suite-body"><div class="hq-suite-title"><span>'+esc(toolLabel(tool).toUpperCase())+'</span><small>Saved to this company • decisions are audited</small></div>'+bodyFor(tool,s,o)+'<p class="hq-suite-message" role="status"></p></section><details class="hq-suite-audit"><summary>Management audit trail ('+o.audit.length+')</summary><ol>'+o.audit.slice(0,40).map(a=>'<li><b>'+esc(a.system)+'</b> '+esc(a.kind.replaceAll("_"," "))+' — '+esc(a.detail)+' <small>'+esc(a.date)+'</small></li>').join("")+'</ol></details>';
 const message=root.querySelector(".hq-suite-message"),field=k=>root.querySelector('[data-hq-field="'+k+'"]')?.value;
 root.querySelectorAll("[data-hq-tool]").forEach(b=>b.addEventListener("click",()=>{o.activeTool=b.dataset.hqTool;render();}));
 const done=r=>{if(r?.ok){G.MDXGame?.save?.();render();}else if(message)message.textContent=r?.reason||"Action could not be completed.";};
 root.querySelector('[data-hq-action="health"]')?.addEventListener("click",()=>done(setHealthPlan(s,field("healthPlan"),field("healthBudget"))));
 root.querySelector('[data-hq-action="brand"]')?.addEventListener("click",()=>done(setBrand(s,field("brand"),field("brandBudget"))));
 root.querySelector('[data-hq-action="divisions"]')?.addEventListener("click",()=>{const w={};DIVISIONS.forEach(k=>w[k]=root.querySelector('[data-hq-division="'+k+'"]').value);done(setDivisions(s,w,field("divisionBudget")));});
 root.querySelector('[data-hq-action="leadership"]')?.addEventListener("click",()=>done(setLeadership(s,field("leadership"),field("leadershipBudget"))));
 root.querySelector('[data-hq-action="risk"]')?.addEventListener("click",()=>{const m={};["liquidity","debt","portfolio","reputation"].forEach(k=>m[k]=root.querySelector('[data-hq-mitigation="'+k+'"]').checked);done(setRisk(s,field("riskAppetite"),m,field("riskBudget")));});
 root.querySelector('[data-hq-action="decisions"]')?.addEventListener("click",()=>done(setDecisionReview(s,field("decisionReview"),field("decisionBudget"))));
 root.querySelector('[data-hq-action="positioning"]')?.addEventListener("click",()=>done(setPositioning(s,field("positioning"),field("positioningBudget"))));
 root.querySelector('[data-hq-action="culture"]')?.addEventListener("click",()=>done(setCulture(s,field("culture"))));
 root.querySelector('[data-hq-action="annual"]')?.addEventListener("click",()=>done(fileAnnualReport(s,field("annual"))));
 root.querySelector('[data-hq-action="fiveYear"]')?.addEventListener("click",()=>done(setFiveYearPlan(s,field("planCash"),field("planRep"),field("planModels"),field("planEnvelope"))));
 root.querySelector('[data-hq-action="emergencyPolicy"]')?.addEventListener("click",()=>done(setEmergencyPolicy(s,field("posture"),field("emergencyContribution"))));
 root.querySelectorAll("[data-hq-response]").forEach(b=>b.addEventListener("click",()=>done(respondEmergency(s,b.dataset.hqResponse,b.dataset.responseType))));
 root.querySelector('[data-hq-action="delegation"]')?.addEventListener("click",()=>{const levels={};DELEGATION.forEach(k=>levels[k]=root.querySelector('[data-hq-delegate="'+k+'"]').value);done(setDelegation(s,levels,field("delegationCap")));});
 root.querySelectorAll("[data-hq-bottleneck]").forEach(b=>b.addEventListener("click",()=>done(fundBottleneck(s,b.dataset.hqBottleneck))));
 root.querySelector('[data-hq-action="reputation"]')?.addEventListener("click",()=>done(startReputationCampaign(s,field("repFocus"),field("repBudget"),field("repDays"))));
 root.querySelectorAll("[data-hq-focus]").forEach(b=>b.addEventListener("click",()=>done(focusBrief(s,b.dataset.hqFocus))));
 root.querySelector('[data-hq-action="milestone"]')?.addEventListener("click",()=>done(addMilestone(s,field("milestoneMetric"),field("milestoneTarget"),field("milestoneDays"),field("milestoneLabel"))));
 root.querySelectorAll("[data-hq-milestone-cancel]").forEach(b=>b.addEventListener("click",()=>{cancelMilestone(s,b.dataset.hqMilestoneCancel);G.MDXGame?.save?.();render();}));
}
function init(){if(typeof document==="undefined")return;G.addEventListener?.("mdx:ready",render);G.addEventListener?.("mdx:state",render);document.addEventListener("click",e=>{if(e.target.closest?.('[data-view="home"]'))requestAnimationFrame(render);});render();}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();}
G.MDXHQManagement={POLICY,DIVISIONS,DELEGATION,MILESTONE_METRICS,ensure,healthScore,riskLevels,detectBottlenecks,setHealthPlan,setBrand,setDivisions,setLeadership,setRisk,logDecision,setDecisionReview,setPositioning,setCulture,fileAnnualReport,setFiveYearPlan,setEmergencyPolicy,respondEmergency,setDelegation,fundBottleneck,startReputationCampaign,generateBrief,focusBrief,addMilestone,cancelMilestone,pendingCashRecognition,processDay,processRivals,snapshot,render};
})();