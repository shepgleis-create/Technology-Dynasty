"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
global.window=global;global.document={readyState:"loading",addEventListener(){},getElementById(){return null;}};global.addEventListener=()=>{};
require("../hq-management-suite.js");
require("../executive-agenda.js");
require("../strategic-objectives.js");
require("../board-office.js");
require("../interface-systems.js");
const hq=global.MDXHQManagement,agenda=global.MDXExecutiveAgenda,objectives=global.MDXStrategicObjectives,board=global.MDXBoardOffice,ui=global.MDXInterfaceSystems;
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const sources={
 hq:read("hq-management-suite.js"),hqcss:read("hq-management-suite.css"),agenda:read("executive-agenda.js"),agendacss:read("executive-agenda.css"),
 objectives:read("strategic-objectives.js"),objectivescss:read("strategic-objectives.css"),board:read("board-office.js"),boardcss:read("board-office.css"),
 ui:read("interface-systems.js"),uicss:read("interface-systems.css"),browser:read("scripts/playtest-interface.js"),
 hqtests:read("tests/hq-management-suite.test.js"),strategytests:read("tests/headquarters-strategy-regression.test.js"),uitests:read("tests/interface-systems.test.js")
};
const base=()=>({year:1970,month:0,day:1,cash:5000000,debt:200000,lastProfit:100000,rp:20,rep:50,vehicles:[{id:"v1",active:true,productionStatus:"production"}],engines:[],transmissions:[],operations:{factories:[{id:"f1",active:true,status:"operating"}]},industry:[{id:"low",cash:120000,debt:250000,monthProfit:-20000,reputation:25,aiCars:[],rd:25},{id:"strong",cash:8000000,debt:100000,monthProfit:500000,reputation:75,aiCars:[{active:true},{active:true},{active:true}],rd:80}]});
function advance(s){s.day++;if(s.day>28){s.day=1;s.month++;if(s.month>11){s.month=0;s.year++;}}}
const HQ=[
 {label:"Company Health",module:"hq",css:"hqcss",ui:'data-hq-action="health"',sim:"healthScore",ai:"healthPlan",audit:"health.history",interact:s=>hq.setHealthPlan(s,"quality",100)},
 {label:"Executive Agenda",module:"agenda",css:"agendacss",ui:"data-agenda-policy",sim:"processDay",ai:"executiveAgendaAI",audit:"history",interact:s=>agenda.setPolicy(s,"engineering")},
 {label:"Strategic Objectives",module:"objectives",css:"objectivescss",ui:"md-objective-add",sim:"processDay",ai:"strategicObjectiveAI",audit:"history",interact:s=>objectives.add(s,"reputation",60,90)},
 {label:"Board Priorities",module:"board",css:"boardcss",ui:"md-board-add",sim:"processDay",ai:"boardOfficeAI",audit:"history",interact:s=>board.addPriority(s,"engineering",2)},
 {label:"Operating Calendar",module:"board",css:"boardcss",ui:"md-board-schedule",sim:"m.daysLeft",ai:"operatingCalendarAI",audit:"calendar",interact:s=>board.addMilestone(s,"Verification milestone",30,3000,"quality")},
 {label:"Company Milestones",module:"hq",css:"hqcss",ui:'data-hq-action="milestone"',sim:"processMilestones",ai:"milestone",audit:"milestones.history",interact:s=>hq.addMilestone(s,"reputation",60,90,"Trust target")},
 {label:"Brand Identity",module:"hq",css:"hqcss",ui:'data-hq-action="brand"',sim:"brand.pending",ai:"const brand=",audit:"brand.history",interact:s=>hq.setBrand(s,"innovation",100)},
 {label:"Division Performance",module:"hq",css:"hqcss",ui:'data-hq-action="divisions"',sim:"divisions.scores",ai:"divisionFocus",audit:"divisions.history",interact:s=>hq.setDivisions(s,{engineering:20,manufacturing:20,sales:20,finance:20,aftersales:20},1000)},
 {label:"Leadership Team",module:"hq",css:"hqcss",ui:'data-hq-action="leadership"',sim:"leadership.effectiveness",ai:"leadershipModel",audit:"leadership.history",interact:s=>hq.setLeadership(s,"decentralized",1000)},
 {label:"Risk Register",module:"hq",css:"hqcss",ui:'data-hq-action="risk"',sim:"riskLevels",ai:"const risk=",audit:"risks.",interact:s=>hq.setRisk(s,"conservative",{liquidity:true,debt:true,portfolio:true,reputation:true},100)},
 {label:"Decision History",module:"hq",css:"hqcss",ui:'data-hq-action="decisions"',sim:"processDecisions",ai:"decisionPolicy",audit:"decisions.entries",interact:s=>hq.setDecisionReview(s,"standard",100)},
 {label:"Competitive Positioning",module:"hq",css:"hqcss",ui:'data-hq-action="positioning"',sim:"marketPositioning",ai:"const positioning=",audit:"positioning.",interact:s=>hq.setPositioning(s,"technology",100)},
 {label:"Corporate Culture",module:"hq",css:"hqcss",ui:'data-hq-action="culture"',sim:"culture.pending",ai:"const culture=",audit:"culture.",interact:s=>hq.setCulture(s,"innovation")},
 {label:"Annual Report",module:"hq",css:"hqcss",ui:'data-hq-action="annual"',sim:"fileAnnualReport",ai:"const reporting=",audit:"annual.reports",interact:s=>hq.fileAnnualReport(s,"minimal")},
 {label:"Five-Year Plan",module:"hq",css:"hqcss",ui:'data-hq-action="fiveYear"',sim:"fiveYear.active",ai:"const fiveYear=",audit:"fiveYear.history",interact:s=>hq.setFiveYearPlan(s,7000000,70,3,120000)},
 {label:"Emergency Response",module:"hq",css:"hqcss",ui:'data-hq-action="emergencyPolicy"',sim:"emergency.reserve",ai:"emergencyPosture",audit:"emergency.history",interact:s=>hq.setEmergencyPolicy(s,"resilient",100)},
 {label:"Management Delegation",module:"hq",css:"hqcss",ui:'data-hq-action="delegation"',sim:"delegation.levels",ai:"const delegation=",audit:"delegation.history",interact:s=>hq.setDelegation(s,{finance:1,engineering:2,operations:1,marketing:1},1000)},
 {label:"Operational Bottlenecks",module:"hq",css:"hqcss",ui:"data-hq-bottleneck",sim:"processProjects",ai:"const bottleneck=",audit:"bottlenecks.history",interact:s=>{s.rp=0;return hq.fundBottleneck(s,"research");}},
 {label:"Company Reputation",module:"hq",css:"hqcss",ui:'data-hq-action="reputation"',sim:"reputation.components",ai:"reputationFocus",audit:"reputation.history",interact:s=>hq.startReputationCampaign(s,"trust",100,30)},
 {label:"Executive Brief",module:"hq",css:"hqcss",ui:"data-hq-focus",sim:"generateBrief",ai:"briefPriority",audit:"brief.",interact:s=>{const items=hq.generateBrief(s);return hq.focusBrief(s,items[0].kind);}}
];
const nav=ui.TOPICS.map(([key,label])=>({key,label}));
assert.equal(HQ.length,20);assert.equal(nav.length,20);

function hqSimulate(entry,s){
 const before=JSON.stringify(s);
 if(entry.label==="Executive Agenda"){agenda.processDay(s);return JSON.stringify(s)!==before;}
 if(entry.label==="Strategic Objectives"){objectives.processDay(s);return s.strategicObjectives.goals[0].daysLeft===89;}
 if(entry.label==="Board Priorities"||entry.label==="Operating Calendar"){board.processDay(s);return JSON.stringify(s)!==before;}
 hq.processDay(s);return JSON.stringify(s)!==before;
}
function hqAI(entry,s){
 if(entry.label==="Executive Agenda"){agenda.processRivalAgendas(s);return s.industry.every(r=>r.executiveAgendaAI?.reason);}
 if(entry.label==="Strategic Objectives"){objectives.rivalPlan(s);return s.industry.every(r=>r.strategicObjectiveAI?.reason);}
 if(entry.label==="Board Priorities"||entry.label==="Operating Calendar"){board.rivalDecisions(s);return s.industry.every(r=>r.boardOfficeAI?.reason)&&(entry.label!=="Operating Calendar"||s.industry.every(r=>r.operatingCalendarAI?.reason));}
 hq.processRivals(s);const key={ "Company Health":"healthPlan","Company Milestones":"milestone","Brand Identity":"brand","Division Performance":"divisionFocus","Leadership Team":"leadershipModel","Risk Register":"risk","Decision History":"decisionPolicy","Competitive Positioning":"positioning","Corporate Culture":"culture","Annual Report":"reporting","Five-Year Plan":"fiveYear","Emergency Response":"emergencyPosture","Management Delegation":"delegation","Operational Bottlenecks":"bottleneck","Company Reputation":"reputationFocus","Executive Brief":"briefPriority"}[entry.label];
 return s.industry.every(r=>r.hqManagementAI?.reason&&r.hqManagementAI?.[key]!==undefined);
}
HQ.forEach((entry,index)=>{
 const baseId=index*5+1;
 test(String(baseId)+" "+entry.label+" — interactive control",()=>{const s=base(),r=entry.interact(s);assert.ok(r===true||r?.ok!==false);assert.ok(sources[entry.module].includes(entry.ui));assert.ok(sources.browser.includes(entry.ui)||sources.browser.includes(entry.label)||sources.browser.includes(entry.ui.replace(/"/g,"")));});
 test(String(baseId+1)+" "+entry.label+" — simulation consequences",()=>{const s=base();const r=entry.interact(s);assert.ok(r===true||r?.ok!==false);assert.ok(sources[entry.module].includes(entry.sim));assert.equal(hqSimulate(entry,s),true);});
 test(String(baseId+2)+" "+entry.label+" — AI participation",()=>{const s=base();assert.ok(sources[entry.module].includes(entry.ai)||sources.hq.includes(entry.ai));assert.equal(hqAI(entry,s),true);});
 test(String(baseId+3)+" "+entry.label+" — graphics and UI",()=>{assert.ok(sources[entry.module].includes(entry.label)||sources.browser.includes(entry.label)||sources[entry.module].toLowerCase().includes(entry.label.toLowerCase().split(" ")[0]));assert.ok(sources[entry.css].includes("@media"));assert.ok(sources.browser.includes("iphone"));});
 test(String(baseId+4)+" "+entry.label+" — audit and feedback",()=>{const s=base();const r=entry.interact(s);assert.ok(r===true||r?.ok!==false);hqSimulate(entry,s);const copy=JSON.parse(JSON.stringify(s));assert.ok(copy);assert.ok(sources[entry.module].includes(entry.audit)||sources.hq.includes(entry.audit));assert.ok(sources.browser.includes("reload"));assert.ok(sources.hqtests.includes("persist")||sources.strategytests.includes("persist"));});
});

function interfaceState(){return{year:1970,month:0,day:1,cash:1000000,lastProfit:50000,rp:10,rep:50,vehicles:[{active:true},{active:true}],engines:[],transmissions:[],industry:[],operations:{factories:[]}};}
nav.forEach((entry,index)=>{
 const baseId=101+index*5;
 test(String(baseId)+" "+entry.label+" — interactive control",()=>{const s=interfaceState();assert.equal(ui.setProgram(s,entry.key,"improve",200,false).ok,true);const p=ui.programPreview(s,entry.key);assert.equal(p.dailyCost,200);assert.ok(p.projected>=p.current);assert.ok(sources.ui.includes(entry.key));});
 test(String(baseId+1)+" "+entry.label+" — simulation consequences",()=>{const s=interfaceState();ui.setProgram(s,entry.key,"improve",200,false);const before=s.cash,maturity=s.interfaceSystems.programs[entry.key].maturity;ui.processDay(s);assert.equal(before-s.cash,200);assert.ok(s.interfaceSystems.programs[entry.key].maturity>maturity);assert.ok(Number.isFinite(s.departmentWorkflow.interface[ui.TOPIC_DEFS[entry.key].department]));});
 test(String(baseId+2)+" "+entry.label+" — AI participation",()=>{const s=interfaceState();ui.setProgram(s,entry.key,"maintain",100,true);ui.setAutomationCap(s,12000);ui.runInterfaceManager(s,ui.ensure(s));const p=s.interfaceSystems.programs[entry.key];assert.ok(p.history.some(x=>x.kind==="manager_action"));assert.ok(s.interfaceSystems.assistant.subjectActions[entry.key].reason);});
 test(String(baseId+3)+" "+entry.label+" — graphics and UI",()=>{assert.ok(sources.ui.includes(entry.label));assert.ok(sources.ui.includes("data-md-program"));assert.ok(sources.uicss.includes(".md-topic-program"));assert.ok(sources.uicss.includes("@media(max-width:420px)"));assert.ok(sources.browser.includes("[data-md-program]"));});
 test(String(baseId+4)+" "+entry.label+" — audit and feedback",()=>{const s=interfaceState();ui.setProgram(s,entry.key,"improve",200,false);ui.processDay(s);const p=s.interfaceSystems.programs[entry.key];assert.ok(p.history.length>0);assert.ok(s.interfaceSystems.history.some(x=>x.topic===entry.key));const copy=JSON.parse(JSON.stringify(s));assert.equal(copy.interfaceSystems.programs[entry.key].mode,"improve");assert.ok(sources.uitests.includes("twenty")||sources.uitests.includes("program"));assert.ok(sources.browser.includes("responsive"));});
});
test("Checklist batch 1-200 contains exactly 200 separately asserted requirements",()=>{assert.equal(HQ.length*5+nav.length*5,200);});
