/* Motor Dynasty interface systems.
   Direct navigation, global search, filters/sorts, accessible controls, undo,
   contextual help, keyboard/touch navigation, recovery, responsive audit and
   persistent interface preferences. */
(()=>{"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const TOPICS=[
 ["bottomNav","Bottom Navigation"],["hierarchy","Screen Hierarchy"],["transitions","Tab Transitions"],["search","Search"],["filters","Filter Controls"],["sorting","Sorting"],["sliders","Sliders"],["dropdowns","Dropdowns"],["selection","Selection Cards"],["confirm","Confirmation Dialogs"],["undo","Undo Actions"],["help","Context Help"],["tooltips","Data Tooltips"],["keyboard","Keyboard Controls"],["touch","Touch Gestures"],["loading","Loading Feedback"],["empty","Empty States"],["recovery","Error Recovery"],["accessibility","Accessibility"],["responsive","Responsive Layouts"]
];
const VIEWS=[["home","HQ"],["research","R&D"],["engine","Engine"],["vehicle","Vehicle"],["library","Operations"],["market","Markets"],["budget","Treasury"],["companies","Industry"],["finance","Corporate"]];
const PROGRAM_MODES={
 off:{label:"Off",rollout:0,gain:0},
 maintain:{label:"Maintain",rollout:14,gain:.035},
 improve:{label:"Improve",rollout:45,gain:.075},
 transform:{label:"Transform",rollout:90,gain:.12}
};
const TOPIC_DEFS={
 bottomNav:{department:"operations",dependency:null,baseBudget:180,benefit:"Faster primary-department access reduces administrative friction."},
 hierarchy:{department:"operations",dependency:"bottomNav",baseBudget:160,benefit:"Clear hierarchy reduces staff navigation and handoff errors."},
 transitions:{department:"operations",dependency:"hierarchy",baseBudget:90,benefit:"Predictable transitions reduce workflow interruption."},
 search:{department:"research",dependency:"hierarchy",baseBudget:260,benefit:"Search shortens research and corporate information retrieval."},
 filters:{department:"research",dependency:"search",baseBudget:180,benefit:"Filters reduce time spent screening product and market records."},
 sorting:{department:"finance",dependency:"search",baseBudget:150,benefit:"Sorting improves prioritization of financial and operating records."},
 sliders:{department:"engineering",dependency:"hierarchy",baseBudget:190,benefit:"Live controls reduce engineering iteration overhead."},
 dropdowns:{department:"engineering",dependency:"hierarchy",baseBudget:130,benefit:"Validated choices reduce configuration mistakes."},
 selection:{department:"engineering",dependency:"dropdowns",baseBudget:170,benefit:"Selection cards improve configuration comparison quality."},
 confirm:{department:"finance",dependency:"selection",baseBudget:110,benefit:"Confirmation controls reduce costly accidental decisions."},
 undo:{department:"finance",dependency:"confirm",baseBudget:140,benefit:"Undo capability lowers recovery cost from reversible mistakes."},
 help:{department:"people",dependency:"hierarchy",baseBudget:150,benefit:"Context help reduces training burden and onboarding time."},
 tooltips:{department:"people",dependency:"help",baseBudget:90,benefit:"Data tooltips improve comprehension without leaving the active task."},
 keyboard:{department:"operations",dependency:"hierarchy",baseBudget:120,benefit:"Keyboard controls improve expert workflow throughput."},
 touch:{department:"operations",dependency:"bottomNav",baseBudget:170,benefit:"Touch workflows improve mobile operating speed."},
 loading:{department:"operations",dependency:"transitions",baseBudget:100,benefit:"Loading feedback reduces duplicated actions during processing."},
 empty:{department:"people",dependency:"help",baseBudget:80,benefit:"Empty states guide inexperienced staff toward useful next actions."},
 recovery:{department:"finance",dependency:"confirm",baseBudget:220,benefit:"Recovery tooling limits disruption from interface faults."},
 accessibility:{department:"people",dependency:"help",baseBudget:210,benefit:"Accessibility broadens effective workforce participation."},
 responsive:{department:"operations",dependency:"touch",baseBudget:240,benefit:"Responsive layouts protect mobile productivity across devices."}
};
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now=s=>[num(s?.year),num(s?.month),num(s?.day)].join("-");
const STORAGE="motor_dynasty_interface_v2";
const HELP={
 home:["Executive Office","Review company health, strategy, risks, milestones and management programs."],
 research:["Research & Development","Spend research points on technologies that unlock stronger engineering choices."],
 engine:["Engine Engineering","Design, validate and release powertrains. Cost, durability and production readiness are connected."],
 vehicle:["Vehicle Studio","Engineer the complete vehicle. Packaging, powertrain, price and market position determine results."],
 library:["Operations","Manage factories, production, product lifecycles, suppliers, quality and workforce."],
 market:["Market Intelligence","Review customers, regions, dealers, regulation, competitors and demand."],
 budget:["Treasury","Track cash, debt, operating results and financial obligations."],
 companies:["Industry","Inspect rival manufacturers, ownership, distress and acquisition opportunities."],
 finance:["Corporate","Manage directors, holdings, subsidiaries, deals and group capital."]
};
function defaultState(){return{
 version:2,history:[],errors:[],searchHistory:[],lastView:"home",lastDay:null,lastMonth:null,
 preferences:{dockLabels:true,transitions:true,reducedMotion:false,highContrast:false,largeText:false,largeTargets:false,swipeNavigation:true,tooltips:true,helpHints:true,loadingFeedback:true,compact:false},
 search:{filter:"all",sort:"relevance",lastQuery:""},usage:Object.fromEntries(TOPICS.map(([k])=>[k,0])),
 assistant:{month:null,strategy:"balanced",recommendedView:"home",query:"",reason:"",subjectActions:{}},
 responsive:{lastAudit:null,overflowCount:0,lastWidth:0},undoDepth:0,
 programs:Object.fromEntries(TOPICS.map(([k])=>[k,{mode:"off",budget:0,maturity:0,rolloutDays:0,totalDays:0,totalSpent:0,auto:false,warning:"",history:[],lastSnapshot:null}])),
 automationCap:0,automationSpentMonth:0,automationMonth:null,departmentWorkflow:{operations:0,research:0,finance:0,engineering:0,people:0}
};}
function ensure(s){
 if(!s.interfaceSystems||typeof s.interfaceSystems!=="object")s.interfaceSystems=defaultState();
 const o=s.interfaceSystems,d=defaultState();
 for(const [k,v] of Object.entries(d))if(o[k]==null)o[k]=v;
 o.preferences={...d.preferences,...(o.preferences||{})};o.search={...d.search,...(o.search||{})};o.usage={...d.usage,...(o.usage||{})};
 o.history=Array.isArray(o.history)?o.history:[];o.errors=Array.isArray(o.errors)?o.errors:[];o.searchHistory=Array.isArray(o.searchHistory)?o.searchHistory:[];
 o.programs=o.programs&&typeof o.programs==="object"?o.programs:{};
 for(const [k] of TOPICS){const p=o.programs[k]&&typeof o.programs[k]==="object"?o.programs[k]:{};o.programs[k]={mode:PROGRAM_MODES[p.mode]?p.mode:"off",budget:Math.max(0,num(p.budget)),maturity:Math.max(0,Math.min(100,num(p.maturity))),rolloutDays:Math.max(0,Math.round(num(p.rolloutDays))),totalDays:Math.max(0,Math.round(num(p.totalDays))),totalSpent:Math.max(0,num(p.totalSpent)),auto:!!p.auto,warning:String(p.warning||""),history:Array.isArray(p.history)?p.history:[],lastSnapshot:p.lastSnapshot||null};}
 o.automationCap=Math.max(0,num(o.automationCap));o.departmentWorkflow=o.departmentWorkflow&&typeof o.departmentWorkflow==="object"?o.departmentWorkflow:{operations:0,research:0,finance:0,engineering:0,people:0};
 return o;
}
function audit(s,topic,action,detail=""){const o=ensure(s);o.history.unshift({date:now(s),time:Date.now(),topic,action,detail:String(detail||"")});o.history=o.history.slice(0,240);o.usage[topic]=num(o.usage[topic])+1;}
function savePrefs(s){try{localStorage.setItem(STORAGE,JSON.stringify(ensure(s).preferences));}catch{}G.MDXGame?.save?.();}
function restorePrefs(s){try{const p=JSON.parse(localStorage.getItem(STORAGE)||"null");if(p&&typeof p==="object")ensure(s).preferences={...ensure(s).preferences,...p};}catch{}applyPrefs(s);}
function applyPrefs(s){
 const p=ensure(s).preferences;if(typeof document==="undefined")return;
 const root=document.documentElement;root.classList.toggle("md-reduced-motion",!!p.reducedMotion);root.classList.toggle("md-high-contrast",!!p.highContrast);root.classList.toggle("md-large-text",!!p.largeText);root.classList.toggle("md-large-targets",!!p.largeTargets);root.classList.toggle("md-compact-ui",!!p.compact);root.classList.toggle("md-no-transitions",!p.transitions);
 document.querySelector(".dynasty-dock")?.classList.toggle("md-hide-dock-labels",!p.dockLabels);
}
function activeView(){if(typeof document==="undefined")return"home";return document.querySelector(".game-view.active")?.id?.replace("view-","")||"home";}
function recordNavigation(s,view,source="direct"){
 const o=ensure(s);if(o.lastView===view)return;o.lastView=view;audit(s,"bottomNav","navigate",view+" via "+source);audit(s,"hierarchy","active_screen",view);
}
function assistant(s){
 const o=ensure(s),stamp=[num(s.year),num(s.month)].join("-");if(o.assistant.month===stamp)return o.assistant;
 const cash=num(s.cash),profit=num(s.lastProfit),rep=num(s.rep),models=(Array.isArray(s.vehicles)?s.vehicles:[]).filter(v=>v.active!==false).length,rp=num(s.rp);
 let strategy="balanced",recommendedView="home",query="",reason="Company state is balanced";
 if(cash<250000||profit<0){strategy="financial";recommendedView="budget";query="cash debt profit";reason="Liquidity or profitability needs management attention";}
 else if(models<2){strategy="product";recommendedView="vehicle";query="vehicle platform production";reason="Product portfolio is too narrow";}
 else if(rp>25){strategy="innovation";recommendedView="research";query="research technology";reason="Research reserve supports technology investment";}
 else if(rep<35){strategy="market";recommendedView="market";query="customers reputation dealers";reason="Weak reputation makes market execution a priority";}
 const subjectActions={};for(const [k] of TOPICS)subjectActions[k]={strategy,reason,budget:1,constraints:{cash,profit,rep,models,rp},action:k==="sorting"?"prioritize "+recommendedView:k==="filters"?"focus "+recommendedView:k==="search"?"query "+query:"support "+recommendedView};
 o.assistant={month:stamp,strategy,recommendedView,query,reason,attentionBudget:3,constraints:{cash,profit,rep,models,rp},subjectActions};audit(s,"search","assistant_refresh",reason);return o.assistant;
}
function setProgram(s,topic,mode,budget,auto=false){
 const o=ensure(s),def=TOPIC_DEFS[topic],cfg=PROGRAM_MODES[mode];budget=Number(budget);
 if(!def||!cfg)return{ok:false,reason:"Unknown interface program"};
 if(!Number.isSafeInteger(budget)||budget<0||budget>5000)return{ok:false,reason:"Daily interface budget must be a whole dollar amount from 0–5,000"};
 if(mode!=="off"&&budget<1)return{ok:false,reason:"Active programs require a positive daily budget"};
 const p=o.programs[topic],before={mode:p.mode,budget:p.budget,maturity:p.maturity,auto:p.auto};
 p.mode=mode;p.budget=mode==="off"?0:budget;p.auto=!!auto;p.totalDays=cfg.rollout;p.rolloutDays=cfg.rollout;p.warning="";
 p.history.unshift({date:now(s),kind:"program_changed",before,after:{mode:p.mode,budget:p.budget,maturity:p.maturity,auto:p.auto}});p.history=p.history.slice(0,36);
 audit(s,topic,"program_changed",mode+" • $"+p.budget+"/day • auto="+p.auto);return{ok:true,preview:programPreview(s,topic)};
}
function setAutomationCap(s,cap){const o=ensure(s);cap=Number(cap);if(!Number.isSafeInteger(cap)||cap<0||cap>2000000)return{ok:false,reason:"Monthly automation cap must be 0–2,000,000"};const before=o.automationCap;o.automationCap=cap;audit(s,"search","automation_cap",before+"→"+cap);return{ok:true};}
function programPreview(s,topic){
 const o=ensure(s),p=o.programs[topic],def=TOPIC_DEFS[topic],cfg=PROGRAM_MODES[p.mode]||PROGRAM_MODES.off,dep=def.dependency?o.programs[def.dependency]:null,dependencyFactor=(dep&&dep.maturity<30)?0.55:1;
 const dailyGain=cfg.gain*dependencyFactor*(p.budget>0?Math.min(1,p.budget/Math.max(1,def.baseBudget)):0),projected=Math.min(100,p.maturity+dailyGain*Math.max(1,p.rolloutDays||cfg.rollout));
 return{current:p.maturity,projected,dailyCost:p.budget,rolloutDays:p.rolloutDays||cfg.rollout,department:def.department,dependency:def.dependency,dependencyReady:!dep||dep.maturity>=30,benefit:def.benefit};
}
function runInterfaceManager(s,o){
 const stamp=[num(s.year),num(s.month)].join("-");if(o.automationMonth===stamp)return 0;o.automationMonth=stamp;o.automationSpentMonth=0;const a=assistant(s),autoTopics=TOPICS.map(x=>x[0]).filter(k=>o.programs[k].auto);
 if(!autoTopics.length||o.automationCap<=0){for(const k of autoTopics)audit(s,k,"manager_constrained","Automation cap is zero");return 0;}
 let assigned=0;const per=Math.max(1,Math.floor(o.automationCap/30/autoTopics.length));
 for(const k of autoTopics){const def=TOPIC_DEFS[k],p=o.programs[k],mode=a.strategy==="financial"?"maintain":a.strategy==="innovation"||a.strategy==="product"?"transform":"improve",budget=Math.min(5000,Math.max(1,Math.min(per,Math.round(def.baseBudget*(mode==="transform"?1.5:mode==="improve"?1.15:.8)))));
  const before={mode:p.mode,budget:p.budget};p.mode=mode;p.budget=budget;p.totalDays=PROGRAM_MODES[mode].rollout;p.rolloutDays=Math.max(p.rolloutDays,p.totalDays);p.history.unshift({date:now(s),kind:"manager_action",before,after:{mode,budget},reason:a.reason});p.history=p.history.slice(0,36);assigned+=budget*30;audit(s,k,"manager_action",mode+" • "+budget+"/day • "+a.reason);
 }
 o.automationSpentMonth=Math.min(o.automationCap,assigned);return autoTopics.length;
}
function processDay(s){
 if(!s)return 0;const o=ensure(s),d=now(s);if(o.lastDay===d)return 0;o.lastDay=d;assistant(s);runInterfaceManager(s,o);let charged=0;
 const dept={operations:[],research:[],finance:[],engineering:[],people:[]};
 for(const [topic] of TOPICS){const p=o.programs[topic],def=TOPIC_DEFS[topic],cfg=PROGRAM_MODES[p.mode]||PROGRAM_MODES.off;if(p.mode==="off"||p.budget<=0){dept[def.department].push(p.maturity);continue;}
  const due=p.budget,paid=Math.min(Math.max(0,num(s.cash)),due);s.cash=num(s.cash)-paid;charged+=paid;p.totalSpent+=paid;const funding=due?paid/due:0,dep=def.dependency?o.programs[def.dependency]:null,dependencyFactor=(dep&&dep.maturity<30)?0.55:1,gain=cfg.gain*funding*dependencyFactor*Math.min(1.4,p.budget/Math.max(1,def.baseBudget));
  const before=p.maturity;p.maturity=Math.min(100,p.maturity+gain);if(funding>0&&p.rolloutDays>0)p.rolloutDays--;p.warning=paid<due?"Underfunded by $"+Math.round(due-paid):dep&&dep.maturity<30?"Dependency "+def.dependency+" below 30 maturity":"";
  if(!p.lastSnapshot||num(s.day)===1||p.rolloutDays===0){p.history.unshift({date:d,kind:"simulation",before,after:p.maturity,cost:paid,warning:p.warning});p.history=p.history.slice(0,36);p.lastSnapshot=d;}
  dept[def.department].push(p.maturity);
 }
 for(const k of Object.keys(dept))o.departmentWorkflow[k]=dept[k].length?dept[k].reduce((a,b)=>a+b,0)/dept[k].length:0;
 const avg=Object.values(o.departmentWorkflow).reduce((a,b)=>a+b,0)/Object.keys(o.departmentWorkflow).length;s.interfaceWorkflowCostFactor=Math.max(.98,1-avg*.0002);s.departmentWorkflow={...(s.departmentWorkflow||{}),interface:{...o.departmentWorkflow}};
 return charged;
}
function assets(s){
 const out=[];const push=(type,title,subtitle,view,id="")=>out.push({type,title:String(title||"Untitled"),subtitle:String(subtitle||""),view,id});
 for(const v of Array.isArray(s.vehicles)?s.vehicles:[])push("vehicle",v.name||v.model||"Vehicle",[v.segment,v.productionStatus,v.modelYear].filter(Boolean).join(" • "),"library",v.id);
 for(const e of Array.isArray(s.engines)?s.engines:[])push("engine",e.name||e.familyName||"Engine",[e.layout,e.fuel,e.status].filter(Boolean).join(" • "),"library",e.id);
 for(const t of Array.isArray(s.transmissions)?s.transmissions:[])push("transmission",t.name||t.familyName||"Transmission",[t.type,t.gears&&t.gears+"-speed"].filter(Boolean).join(" • "),"library",t.id);
 for(const c of Array.isArray(s.industry)?s.industry:[])push("company",c.name||"Manufacturer",[c.country,c.focus,c.status].filter(Boolean).join(" • "),"companies",c.id);
 for(const f of Array.isArray(s.operations?.factories)?s.operations.factories:[])push("factory",f.name||"Factory",[f.location,f.status].filter(Boolean).join(" • "),"library",f.id);
 out.push(...VIEWS.map(([v,l])=>({type:"screen",title:l,subtitle:"Open "+l,view:v,id:""})));return out;
}
function search(s,query,filter="all",sort="relevance"){
 query=String(query||"").trim().toLowerCase();const tokens=query.split(/\s+/).filter(Boolean);let rows=assets(s).map(x=>{const hay=(x.title+" "+x.subtitle+" "+x.type).toLowerCase(),score=tokens.reduce((a,t)=>a+(hay.includes(t)?hay.startsWith(t)?3:1:0),0);return{...x,score};});
 if(query)rows=rows.filter(x=>x.score>0);if(filter!=="all")rows=rows.filter(x=>x.type===filter);
 if(sort==="name")rows.sort((a,b)=>a.title.localeCompare(b.title));else if(sort==="type")rows.sort((a,b)=>a.type.localeCompare(b.type)||a.title.localeCompare(b.title));else rows.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
 return rows.slice(0,60);
}
function openSearch(){
 const s=G.MDXGame?.getState?.();if(!s||typeof document==="undefined")return;const o=ensure(s);closeOverlay();audit(s,"search","open");audit(s,"filters","open");audit(s,"sorting","open");
 const root=document.createElement("div");root.id="md-command-palette";root.className="md-overlay";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label","Search Motor Dynasty");
 root.innerHTML='<div class="md-overlay-card md-search-card"><header><div><span class="eyebrow">COMMAND SEARCH</span><h2>Find anything</h2></div><button data-md-close aria-label="Close">×</button></header><div class="md-search-tools"><input id="md-search-input" type="search" autocomplete="off" placeholder="Vehicles, engines, companies, factories, screens…" value="'+esc(o.search.lastQuery)+'"><select id="md-search-filter" aria-label="Filter results"><option value="all">All types</option><option value="vehicle">Vehicles</option><option value="engine">Engines</option><option value="transmission">Transmissions</option><option value="company">Companies</option><option value="factory">Factories</option><option value="screen">Screens</option></select><select id="md-search-sort" aria-label="Sort results"><option value="relevance">Relevance</option><option value="name">Name</option><option value="type">Type</option></select></div><div id="md-search-results" class="md-search-results"></div></div>';
 document.body.appendChild(root);const input=root.querySelector("#md-search-input"),filter=root.querySelector("#md-search-filter"),sort=root.querySelector("#md-search-sort"),results=root.querySelector("#md-search-results");filter.value=o.search.filter;sort.value=o.search.sort;
 const draw=()=>{const q=input.value;o.search={lastQuery:q,filter:filter.value,sort:sort.value};const rows=search(s,q,filter.value,sort.value);results.innerHTML=rows.length?rows.map((x,i)=>'<button class="md-search-result" data-md-result="'+i+'"><span><b>'+esc(x.title)+'</b><small>'+esc(x.type.toUpperCase())+' • '+esc(x.subtitle)+'</small></span><em>'+esc(VIEWS.find(v=>v[0]===x.view)?.[1]||x.view)+'</em></button>').join(""):'<div class="md-empty-state"><b>No results</b><span>Try a broader phrase or switch the filter to All types.</span><button data-md-clear-search>Clear search</button></div>';results.querySelector("[data-md-clear-search]")?.addEventListener("click",()=>{input.value="";filter.value="all";draw();});results.querySelectorAll("[data-md-result]").forEach((b,i)=>b.addEventListener("click",()=>{const x=rows[i];o.searchHistory.unshift({date:now(s),query:q,type:x.type,title:x.title});o.searchHistory=o.searchHistory.slice(0,60);audit(s,"search","result_opened",x.type+":"+x.title);audit(s,"filters","filter_used",filter.value);audit(s,"sorting","sort_used",sort.value);closeOverlay();G.MDXGame?.navigate?.(x.view);G.MDXGame?.save?.();}));};
 input.addEventListener("input",draw);filter.addEventListener("change",draw);sort.addEventListener("change",draw);root.addEventListener("click",e=>{if(e.target===root||e.target.closest("[data-md-close]"))closeOverlay();});root.addEventListener("keydown",trapDialog);draw();input.focus();
}
function openHelp(){
 const s=G.MDXGame?.getState?.();if(!s||typeof document==="undefined")return;closeOverlay();const view=activeView(),h=HELP[view]||["Motor Dynasty","Context help is available for the active department."];audit(s,"help","open",view);
 const root=document.createElement("div");root.id="md-help-overlay";root.className="md-overlay";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.innerHTML='<div class="md-overlay-card md-help-card"><header><div><span class="eyebrow">CONTEXT HELP</span><h2>'+esc(h[0])+'</h2></div><button data-md-close aria-label="Close">×</button></header><p>'+esc(h[1])+'</p><div class="md-help-grid"><article><b>Keyboard</b><span>/ Search • ? Help • 1–9 open primary departments • Esc closes overlays.</span></article><article><b>Touch</b><span>Swipe from the left or right edge to move between primary departments when swipe navigation is enabled.</span></article><article><b>Recovery</b><span>Errors are captured in Interface Center with a direct Return to HQ recovery action.</span></article></div></div>';document.body.append(root);root.addEventListener("click",e=>{if(e.target===root||e.target.closest("[data-md-close]"))closeOverlay();});root.addEventListener("keydown",trapDialog);root.querySelector("[data-md-close]").focus();
}
function openCenter(){
 const s=G.MDXGame?.getState?.();if(!s||typeof document==="undefined")return;closeOverlay();const o=ensure(s),a=assistant(s);audit(s,"responsive","interface_center_open");
 const root=document.createElement("div");root.id="md-interface-center";root.className="md-overlay";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label","Interface Center");
 root.innerHTML='<div class="md-overlay-card md-interface-card"><header><div><span class="eyebrow">INTERFACE CENTER</span><h2>Controls & accessibility</h2><p>Every interface system is persistent, auditable and mobile-first.</p></div><button data-md-close aria-label="Close">×</button></header><section class="md-assistant-card"><b>Autonomous interface assistant: '+esc(a.strategy)+'</b><span>'+esc(a.reason)+'</span><button data-md-assistant-view>OPEN '+esc(VIEWS.find(v=>v[0]===a.recommendedView)?.[1]||a.recommendedView)+'</button><label class="md-automation-cap">Monthly automation cap ($)<input data-md-automation-cap type="number" min="0" max="2000000" value="'+Math.round(num(o.automationCap))+'"><button data-md-save-automation>SAVE CAP</button></label></section><div class="md-interface-grid">'+TOPICS.map(([k,label])=>'<article data-md-topic="'+k+'"><div><b>'+esc(label)+'</b><small>'+num(o.usage[k])+' recorded interactions</small></div>'+topicControl(k,o)+'</article>').join("")+'</div><details><summary>Interface audit ('+o.history.length+')</summary><ol>'+o.history.slice(0,50).map(h=>'<li><b>'+esc(h.topic)+'</b> '+esc(h.action)+' — '+esc(h.detail)+' <small>'+esc(h.date)+'</small></li>').join("")+'</ol></details></div>';
 document.body.append(root);bindCenter(root,s,o);root.addEventListener("click",e=>{if(e.target===root||e.target.closest("[data-md-close]"))closeOverlay();});root.addEventListener("keydown",trapDialog);root.querySelector("[data-md-close]").focus();
}
function topicSpecificControl(k,o){
 const p=o.preferences;
 if(k==="bottomNav")return toggle("dockLabels","Show dock labels",p.dockLabels);
 if(k==="hierarchy")return'<button data-md-hierarchy-preview>Preview hierarchy path</button><span class="md-topic-note">Breadcrumb follows the active department and navigation history.</span>';
 if(k==="transitions")return toggle("transitions","Animate tab changes",p.transitions);
 if(k==="search")return'<button data-md-open-search>Open global search</button>';
 if(k==="filters")return'<button data-md-open-search>Open filtered search</button><span class="md-topic-note">Current filter: '+esc(o.search.filter)+'</span>';
 if(k==="sorting")return'<button data-md-open-search>Compare sort orders</button><span class="md-topic-note">Current sort: '+esc(o.search.sort)+'</span>';
 if(k==="sliders")return'<label>Preview slider <output data-md-demo-output>50</output><input data-md-demo-slider type="range" min="0" max="100" value="50"></label>';
 if(k==="dropdowns")return'<select data-md-demo-select><option>Mobile-safe choice A</option><option>Mobile-safe choice B</option><option>Mobile-safe choice C</option></select>';
 if(k==="selection")return'<div class="md-choice-row" role="radiogroup"><button role="radio" aria-checked="true" data-md-choice="A">A</button><button role="radio" aria-checked="false" data-md-choice="B">B</button></div>';
 if(k==="confirm")return'<button data-md-demo-confirm>Test confirmation</button>';
 if(k==="undo")return'<button data-md-demo-undo>Create undoable change</button>';
 if(k==="help")return'<button data-md-open-help>Open context help</button>';
 if(k==="tooltips")return toggle("tooltips","Enable data tooltips",p.tooltips);
 if(k==="keyboard")return'<button data-md-keyboard-preview>Show shortcut guide</button><span class="md-topic-note">/ search • ? help • 1–9 navigation • Esc close</span>';
 if(k==="touch")return toggle("swipeNavigation","Enable edge swipe navigation",p.swipeNavigation);
 if(k==="loading")return toggle("loadingFeedback","Show loading feedback",p.loadingFeedback);
 if(k==="empty")return'<button data-md-demo-empty>Preview empty state</button>';
 if(k==="recovery")return'<button data-md-recover>Return safely to HQ</button>';
 if(k==="accessibility")return toggle("reducedMotion","Reduced motion",p.reducedMotion)+toggle("highContrast","High contrast",p.highContrast)+toggle("largeText","Larger text",p.largeText)+toggle("largeTargets","Larger touch targets",p.largeTargets);
 if(k==="responsive")return'<span class="md-topic-note">'+num(o.responsive.overflowCount)+' overflow issues in last audit</span><button data-md-responsive-audit>Run layout audit</button>';
 return"";
}
function programControl(k,o){
 const p=o.programs[k],def=TOPIC_DEFS[k],preview={current:p.maturity,projected:p.maturity,dailyCost:p.budget,rolloutDays:p.rolloutDays,department:def.department,dependency:def.dependency,benefit:def.benefit};
 const recent=p.history[0],history=recent?'<small class="md-program-history">Last: '+esc(recent.kind)+' • '+esc(recent.date)+' • '+Math.round(num(recent.before?.maturity??recent.before??p.maturity))+'→'+Math.round(num(recent.after?.maturity??recent.after??p.maturity))+'</small>':'<small class="md-program-history">No program history yet.</small>';
 return'<div class="md-topic-program" data-md-program="'+k+'"><div class="md-program-head"><b>Workflow program</b><span>'+Math.round(p.maturity)+'/100 maturity</span></div><div class="md-program-meter"><i style="width:'+Math.max(0,Math.min(100,p.maturity))+'%"></i></div><div class="md-program-fields"><label>Mode<select data-md-program-mode>'+Object.entries(PROGRAM_MODES).map(([key,v])=>'<option value="'+key+'" '+(p.mode===key?"selected":"")+'>'+esc(v.label)+'</option>').join("")+'</select></label><label>Daily budget<input data-md-program-budget type="number" min="0" max="5000" value="'+Math.round(p.budget)+'"></label><label class="md-toggle"><input data-md-program-auto type="checkbox" '+(p.auto?"checked":"")+'>Autonomous manager</label><button data-md-program-save>APPLY</button></div><div class="md-program-preview" data-md-program-preview><span>Current '+Math.round(preview.current)+' → projected '+Math.round(preview.projected)+'</span><span>'+esc(def.department)+' • '+(def.dependency?"depends on "+esc(def.dependency):"no dependency")+'</span><small>'+esc(def.benefit)+'</small></div>'+(p.warning?'<strong class="md-program-warning">'+esc(p.warning)+'</strong>':'')+history+'</div>';
}
function topicControl(k,o){return topicSpecificControl(k,o)+programControl(k,o);}
function toggle(key,label,on){return '<label class="md-toggle"><input type="checkbox" data-md-pref="'+key+'" '+(on?"checked":"")+'><span>'+esc(label)+'</span></label>';}
function bindCenter(root,s,o){
 root.querySelectorAll("[data-md-pref]").forEach(x=>x.addEventListener("change",()=>{o.preferences[x.dataset.mdPref]=x.checked;audit(s,x.dataset.mdPref==="swipeNavigation"?"touch":x.dataset.mdPref==="loadingFeedback"?"loading":x.dataset.mdPref==="tooltips"?"tooltips":"accessibility","preference_changed",x.dataset.mdPref+"="+x.checked);applyPrefs(s);savePrefs(s);}));
 root.querySelectorAll("[data-md-open-search]").forEach(x=>x.addEventListener("click",openSearch));root.querySelectorAll("[data-md-open-help]").forEach(x=>x.addEventListener("click",openHelp));
 root.querySelector("[data-md-demo-slider]")?.addEventListener("input",e=>{root.querySelector("[data-md-demo-output]").textContent=e.target.value;audit(s,"sliders","live_preview",e.target.value);});
 root.querySelector("[data-md-demo-select]")?.addEventListener("change",e=>audit(s,"dropdowns","selection",e.target.value));
 root.querySelectorAll("[data-md-choice]").forEach(b=>b.addEventListener("click",()=>{root.querySelectorAll("[data-md-choice]").forEach(x=>x.setAttribute("aria-checked",String(x===b)));audit(s,"selection","selected",b.dataset.mdChoice);}));
 root.querySelector("[data-md-demo-confirm]")?.addEventListener("click",()=>confirmAction("Confirm test action","This demonstrates the shared, keyboard-safe confirmation dialog.",()=>audit(s,"confirm","confirmed","test")));
 root.querySelector("[data-md-demo-undo]")?.addEventListener("click",()=>{const old=o.preferences.compact;o.preferences.compact=!old;applyPrefs(s);pushUndo("Interface density changed",()=>{o.preferences.compact=old;applyPrefs(s);savePrefs(s);});audit(s,"undo","created","density");savePrefs(s);});
 root.querySelector("[data-md-demo-empty]")?.addEventListener("click",()=>toast("Nothing here yet","Empty states include a clear explanation and recovery action.","info"));
 root.querySelector("[data-md-recover]")?.addEventListener("click",()=>{audit(s,"recovery","return_hq");closeOverlay();G.MDXGame?.navigate?.("home");});
 root.querySelector("[data-md-responsive-audit]")?.addEventListener("click",()=>{auditResponsive(s);openCenter();});
 root.querySelector("[data-md-assistant-view]")?.addEventListener("click",()=>{audit(s,"hierarchy","assistant_navigation",o.assistant.recommendedView);closeOverlay();G.MDXGame?.navigate?.(o.assistant.recommendedView);});
 root.querySelector("[data-md-save-automation]")?.addEventListener("click",()=>{const input=root.querySelector("[data-md-automation-cap]"),r=setAutomationCap(s,input?.value);if(r.ok){G.MDXGame?.save?.();toast("Automation budget saved","Autonomous interface programs will stay within the approved monthly cap.","info");}else toast("Automation budget rejected",r.reason,"error");});
 root.querySelectorAll("[data-md-program]").forEach(card=>{
  const topic=card.dataset.mdProgram,mode=card.querySelector("[data-md-program-mode]"),budget=card.querySelector("[data-md-program-budget]"),auto=card.querySelector("[data-md-program-auto]"),preview=card.querySelector("[data-md-program-preview]");
  const update=()=>{const prior=o.programs[topic],temp={...prior,mode:mode.value,budget:Number(budget.value)||0};o.programs[topic]=temp;const p=programPreview(s,topic);o.programs[topic]=prior;preview.innerHTML='<span>Current '+Math.round(p.current)+' → projected '+Math.round(p.projected)+'</span><span>'+esc(p.department)+' • '+(p.dependency?(p.dependencyReady?"dependency ready":"dependency below maturity target")+": "+esc(p.dependency):"no dependency")+'</span><small>'+esc(p.benefit)+' • '+Math.round(p.rolloutDays)+' day rollout • $'+Math.round(p.dailyCost).toLocaleString()+'/day</small>';};
  mode.addEventListener("change",update);budget.addEventListener("input",update);
  card.querySelector("[data-md-program-save]").addEventListener("click",()=>{const r=setProgram(s,topic,mode.value,budget.value,auto.checked);if(r.ok){G.MDXGame?.save?.();openCenter();}else toast("Program not applied",r.reason,"error");});update();
 });
 root.querySelector("[data-md-hierarchy-preview]")?.addEventListener("click",()=>toast("Hierarchy preview","Motor Dynasty › "+(VIEWS.find(v=>v[0]===activeView())?.[1]||activeView()),"info"));
 root.querySelector("[data-md-keyboard-preview]")?.addEventListener("click",openHelp);
}
function confirmAction(title,message,onConfirm){
 if(typeof document==="undefined"){onConfirm?.();return;}closeNested("md-confirm-dialog");const root=document.createElement("div");root.id="md-confirm-dialog";root.className="md-confirm-layer";root.setAttribute("role","alertdialog");root.setAttribute("aria-modal","true");root.innerHTML='<div><h3>'+esc(title)+'</h3><p>'+esc(message)+'</p><footer><button data-md-cancel>Cancel</button><button data-md-confirm>Confirm</button></footer></div>';document.body.append(root);root.querySelector("[data-md-cancel]").onclick=()=>root.remove();root.querySelector("[data-md-confirm]").onclick=()=>{root.remove();onConfirm?.();};root.addEventListener("keydown",trapDialog);root.querySelector("[data-md-cancel]").focus();
}
const undoStack=[];
function pushUndo(label,fn){undoStack.unshift({label,fn});undoStack.splice(5);const s=G.MDXGame?.getState?.();if(s){ensure(s).undoDepth=undoStack.length;audit(s,"undo","push",label);}toast(label,"Undo is available for 8 seconds.","undo",()=>{const x=undoStack.shift();x?.fn?.();if(s){ensure(s).undoDepth=undoStack.length;audit(s,"undo","applied",label);}});}
function toast(title,message,type="info",action=null){
 if(typeof document==="undefined")return;document.querySelector("#md-toast")?.remove();const t=document.createElement("div");t.id="md-toast";t.className="md-toast md-toast-"+type;t.setAttribute("role","status");t.innerHTML='<div><b>'+esc(title)+'</b><span>'+esc(message)+'</span></div>'+(action?'<button data-md-toast-action>UNDO</button>':'')+'<button data-md-toast-close aria-label="Close">×</button>';document.body.append(t);t.querySelector("[data-md-toast-close]").onclick=()=>t.remove();if(action)t.querySelector("[data-md-toast-action]").onclick=()=>{action();t.remove();};setTimeout(()=>t.remove(),8000);
}
function loading(on,label="Loading"){
 if(typeof document==="undefined")return;let e=document.querySelector("#md-loading-feedback");if(on){if(!e){e=document.createElement("div");e.id="md-loading-feedback";e.className="md-loading-feedback";e.setAttribute("role","status");document.body.append(e);}e.innerHTML='<i></i><span>'+esc(label)+'</span>';e.hidden=false;}else if(e)e.hidden=true;
}
function closeNested(id){document.getElementById(id)?.remove();}
function closeOverlay(){for(const id of ["md-command-palette","md-help-overlay","md-interface-center"])document.getElementById(id)?.remove();}
function trapDialog(e){if(e.key==="Escape"){e.preventDefault();e.currentTarget.remove();return;}if(e.key!=="Tab")return;const focus=[...e.currentTarget.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.getClientRects().length);if(!focus.length)return;const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
function auditResponsive(s){
 if(typeof document==="undefined")return 0;const o=ensure(s),els=[...document.querySelectorAll(".game-view.active *")],bad=els.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>window.innerWidth+3||r.left<-3)&&getComputedStyle(el).position!=="fixed";});o.responsive={lastAudit:Date.now(),overflowCount:bad.length,lastWidth:window.innerWidth};audit(s,"responsive","audit",bad.length+" overflow elements at "+window.innerWidth+"px");return bad.length;
}
function updateHierarchy(s){
 if(typeof document==="undefined")return;const view=activeView(),label=VIEWS.find(v=>v[0]===view)?.[1]||view,active=document.querySelector(".game-view.active .view-head, .game-view.active .phase3-hq-hero");if(!active)return;let crumb=active.querySelector(":scope > .md-breadcrumb");if(!crumb){crumb=document.createElement("div");crumb.className="md-breadcrumb";active.prepend(crumb);}const labelNode=crumb.querySelector("b");if(!labelNode||labelNode.textContent!==label){crumb.innerHTML='<button data-md-home>Motor Dynasty</button><span>›</span><b>'+esc(label)+'</b>';crumb.querySelector("[data-md-home]").onclick=()=>G.MDXGame?.navigate?.("home");}recordNavigation(s,view,"observer");
 if(ensure(s).preferences.transitions&&lastAnimatedView!==view){lastAnimatedView=view;const v=document.querySelector(".game-view.active");v?.classList.remove("md-view-enter");requestAnimationFrame(()=>v?.classList.add("md-view-enter"));}
}
function enhanceControls(s){
 if(typeof document==="undefined")return;
 document.querySelectorAll('input[type="range"]').forEach(input=>{if(input.dataset.mdRangeBound)return;input.dataset.mdRangeBound="1";const output=input.closest("label")?.querySelector("output");input.addEventListener("input",()=>{if(output&&!output.hasAttribute("data-depth-read"))output.textContent=input.value;const state=G.MDXGame?.getState?.();if(state)audit(state,"sliders","change",input.id||input.name||"range");});});
 document.querySelectorAll("select").forEach(x=>{x.classList.add("md-safe-select");if(!x.dataset.mdSelectBound){x.dataset.mdSelectBound="1";x.addEventListener("change",()=>{const state=G.MDXGame?.getState?.();if(state)audit(state,"dropdowns","change",x.id||x.name||"select");});}});
 document.querySelectorAll("[data-tip],[data-tooltip],[title]").forEach(x=>{if(x.dataset.mdTipBound)return;x.dataset.mdTipBound="1";x.addEventListener("focus",()=>{const state=G.MDXGame?.getState?.();if(state)audit(state,"tooltips","focus",x.getAttribute("data-tip")||x.getAttribute("data-tooltip")||x.getAttribute("title")||"");});});
}
function scanEmptyStates(){
 if(typeof document==="undefined")return;const ids=["programLibrary","engineLibrary","vehicleLibrary"];for(const id of ids){const el=document.getElementById(id);if(!el||el.children.length||el.textContent.trim())continue;el.innerHTML='<div class="md-empty-state" data-md-generated-empty><b>No records yet</b><span>This area will populate as you create and release assets.</span></div>';}
}
function recordError(error){
 const s=G.MDXGame?.getState?.();if(!s)return;const o=ensure(s),msg=String(error?.message||error||"Unknown interface error");o.errors.unshift({date:now(s),message:msg,view:activeView()});o.errors=o.errors.slice(0,30);audit(s,"recovery","captured_error",msg);toast("Interface problem captured","Your game is still open. Use Interface Center → Error Recovery if needed.","error");
}
let touchStart=null,observer=null,observerQueued=false,lastAnimatedView="";
function bindGlobal(){
 if(typeof document==="undefined"||document.documentElement.dataset.mdInterfaceBound)return;document.documentElement.dataset.mdInterfaceBound="1";
 const addButtons=()=>{if(!document.getElementById("md-global-tools")){const bar=document.createElement("div");bar.id="md-global-tools";bar.className="md-global-tools";bar.innerHTML='<button id="md-global-search" aria-label="Search">⌕<span>Search</span></button><button id="md-global-help" aria-label="Context help">?<span>Help</span></button><button id="md-global-interface" aria-label="Interface Center">⚙<span>Interface</span></button>';document.body.append(bar);bar.querySelector("#md-global-search").onclick=openSearch;bar.querySelector("#md-global-help").onclick=openHelp;bar.querySelector("#md-global-interface").onclick=openCenter;}};
 addButtons();
 document.addEventListener("click",e=>{const nav=e.target.closest?.("[data-view]");if(!nav)return;const state=G.MDXGame?.getState?.();if(state){audit(state,"loading","navigation_start",nav.dataset.view||"");if(ensure(state).preferences.loadingFeedback){loading(true,"Opening "+(VIEWS.find(v=>v[0]===nav.dataset.view)?.[1]||"screen"));setTimeout(()=>loading(false),180);}}});
 document.addEventListener("keydown",e=>{const tag=document.activeElement?.tagName;if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;if(e.key==="/"){e.preventDefault();openSearch();}else if(e.key==="?"){e.preventDefault();openHelp();}else if(e.key==="Escape"){closeOverlay();closeNested("md-confirm-dialog");}else if(/^[1-9]$/.test(e.key)){const row=VIEWS[Number(e.key)-1];if(row){e.preventDefault();const s=G.MDXGame?.getState?.();if(s)audit(s,"keyboard","navigate",row[0]);G.MDXGame?.navigate?.(row[0]);}}});
 document.addEventListener("touchstart",e=>{if(e.touches.length!==1)return;const t=e.touches[0];touchStart={x:t.clientX,y:t.clientY,time:Date.now()};},{passive:true});
 document.addEventListener("touchend",e=>{const s=G.MDXGame?.getState?.();if(!s||!ensure(s).preferences.swipeNavigation||!touchStart)return;const t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y,startX=touchStart.x;touchStart=null;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return;if(startX>28&&startX<window.innerWidth-28)return;const current=VIEWS.findIndex(v=>v[0]===activeView()),next=dx<0?Math.min(VIEWS.length-1,current+1):Math.max(0,current-1);if(next!==current){audit(s,"touch","edge_swipe",VIEWS[next][0]);G.MDXGame?.navigate?.(VIEWS[next][0]);}},{passive:true});
 G.addEventListener?.("error",e=>recordError(e.error||e.message));G.addEventListener?.("unhandledrejection",e=>recordError(e.reason));
 observer=new MutationObserver(()=>{if(observerQueued)return;observerQueued=true;requestAnimationFrame(()=>{observerQueued=false;const s=G.MDXGame?.getState?.();if(!s)return;updateHierarchy(s);enhanceControls(s);scanEmptyStates();});});observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"],childList:true});
 G.addEventListener?.("resize",()=>{const s=G.MDXGame?.getState?.();if(s)clearTimeout(G.__mdResizeTimer),G.__mdResizeTimer=setTimeout(()=>auditResponsive(s),180);});
}
function init(){
 const s=G.MDXGame?.getState?.();if(!s){setTimeout(init,100);return;}ensure(s);restorePrefs(s);bindGlobal();updateHierarchy(s);enhanceControls(s);scanEmptyStates();auditResponsive(s);assistant(s);
 G.addEventListener?.("mdx:state",()=>{const state=G.MDXGame?.getState?.();if(state){ensure(state);applyPrefs(state);assistant(state);enhanceControls(state);}});
}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();}
G.MDXInterfaceSystems={TOPICS,VIEWS,HELP,TOPIC_DEFS,PROGRAM_MODES,ensure,applyPrefs,assistant,setProgram,setAutomationCap,programPreview,runInterfaceManager,processDay,assets,search,openSearch,openHelp,openCenter,confirmAction,pushUndo,toast,loading,auditResponsive,recordError};
})();
