/* Motor Dynasty, checklist 761–770. Prototype validation for existing models and concept cars. */
(()=>{
"use strict";
const W=window,N=(x,d=0)=>x==null||x===""||!Number.isFinite(Number(x))?d:Number(x),cap=(x,a,b)=>Math.min(b,Math.max(a,N(x))),safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),money=n=>"$"+Math.round(N(n)).toLocaleString("en-US");
const disciplines={
 durability:{name:"Durability and fatigue",year:1900,days:28,budget:45000,reliability:2.5,safety:.3,performance:0,confidence:5,desc:"Accelerated fatigue cycles and failure isolation"},
 powertrain:{name:"Powertrain validation",year:1900,days:36,budget:65000,reliability:1.5,safety:0,performance:1.8,confidence:3,desc:"Thermal endurance, driveline load and calibration"},
 safety:{name:"Safety engineering",year:1940,days:40,budget:95000,reliability:.5,safety:2.9,performance:0,confidence:3,desc:"Instrumented controlled structural testing"},
 market:{name:"Customer and concept validation",year:1930,days:22,budget:32000,reliability:0,safety:0,performance:0,confidence:8,desc:"Pilot audiences, usability, and concept research"}
};
const environments={
 standard:{name:"Standard facility",days:1,budget:1,risk:0,signal:1},
 accelerated:{name:"Accelerated cycles",days:.72,budget:1.38,risk:8,signal:.9},
 extended:{name:"Long-duration reliability",days:1.55,budget:1.45,risk:-9,signal:1.2}
};
function subjects(s){
 const v=(s.vehicles||[]).filter(v=>v.id&&v.active!==false&&v.productionStatus!=="retired").map(v=>({key:"model:"+v.id,name:v.name+" · vehicle",kind:"model",id:v.id}));
 const c=(s.conceptPrograms||[]).filter(c=>c.id&&["active","complete"].includes(c.status)).map(c=>({key:"concept:"+c.id,name:c.name+" · concept",kind:"concept",id:c.id}));
 return [...v,...c];
}
function quote(s,subject,discipline="durability",environment="standard"){
 const row=subjects(s).find(x=>x.key===subject),kind=disciplines[discipline],env=environments[environment],year=N(s.year,1970),era=cap(Math.pow(1.026,year-1970),.25,6);
 const days=kind&&env?Math.max(8,Math.round(kind.days*env.days)):0,budget=kind&&env?Math.round(kind.budget*env.budget*era):0;
 const blocked=!row?"Choose an eligible model or concept":!kind||!env?"Choose a valid test":year<kind.year?"Available from "+kind.year:
 (s.prototypePrograms||[]).some(p=>p.subject===subject&&p.status==="active")?"Subject already under active validation":N(s.cash)<Math.ceil(budget*.08)?"Insufficient prototype funding":null;
 const failureRisk=kind&&env?cap(14+env.risk+(discipline==="powertrain"?3:0),2,40):0;
 return{ready:!blocked,blocked,row,kind,days,budget,discipline,environment,advance:Math.ceil(budget*.08),failureRisk,
 expectedReliability:kind?.reliability||0,expectedSafety:kind?.safety||0,expectedConfidence:kind?.confidence||0,
 warnings:environment==="accelerated"?["Higher residual failure risk due to compressed cycles"]:[]};
}
function fingerprint(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)/4294967296;}
function audit(s,p,event,details={}){
 s.prototypeAudit=Array.isArray(s.prototypeAudit)?s.prototypeAudit:[];
 s.prototypeAudit.unshift({id:p.id,event,subject:p.subject,period:N(s.year)*12+N(s.month),details:JSON.parse(JSON.stringify(details))});s.prototypeAudit.length=Math.min(150,s.prototypeAudit.length);
}
function start(s,subject,discipline,environment,log=()=>{}){
 const q=quote(s,subject,discipline,environment);if(!q.ready)return{ok:false,reason:q.blocked};
 s.prototypePrograms=Array.isArray(s.prototypePrograms)?s.prototypePrograms:[];
 const p={id:"prototype_"+N(s.year)+"_"+N(s.month)+"_"+N(s.day)+"_"+s.prototypePrograms.length,subject,kind:q.row.kind,subjectId:q.row.id,subjectName:q.row.name,discipline,environment,
 status:"active",phase:"ENGINEERING",year:N(s.year),totalDays:q.days,daysRemaining:q.days,budget:q.budget,spent:0,dailySpend:q.budget/q.days,risk:q.failureRisk,report:null,haltedForCash:false};
 s.prototypePrograms.push(p);audit(s,p,"authorized",{budget:q.budget,days:q.days});
 log("Authorized "+q.kind.name+" validation for "+q.row.name+". "+money(q.budget)+" allocated across "+q.days+" days.");
 return{ok:true,program:p};
}
function finish(s,p,log=()=>{}){
 const d=disciplines[p.discipline],env=environments[p.environment],missed=fingerprint(p.id+"|"+p.subject+"|"+p.discipline)<p.risk/100;
 const signal=(missed?.45:1)*env.signal,quality=Math.round(cap(73+signal*16-(missed?24:0),28,96));
 p.report={quality,missedFailureRisk:missed,signal:Number(signal.toFixed(3)),
 reliabilityDelta:Number((d.reliability*signal).toFixed(2)),safetyDelta:Number((d.safety*signal).toFixed(2)),
 performanceDelta:Number((d.performance*signal).toFixed(2)),confidenceDelta:Number((d.confidence*signal).toFixed(2)),
 spent:p.spent,completedYear:N(s.year)};
 p.status="complete";p.phase="REPORT READY";
 if(p.kind==="model"){
  const v=(s.vehicles||[]).find(x=>x.id===p.subjectId);
  if(v?.stats){
   v.stats.reliability=cap(N(v.stats.reliability,65)+p.report.reliabilityDelta,1,99);
   v.stats.safety=cap(N(v.stats.safety,65)+p.report.safetyDelta,1,99);
   v.stats.quality=cap(N(v.stats.quality,65)+quality*.012,1,99);
   v.stats.handling=cap(N(v.stats.handling,60)+p.report.performanceDelta,1,99);
   v.prototypeHistory=Array.isArray(v.prototypeHistory)?v.prototypeHistory:[];
   v.prototypeHistory.unshift({id:p.id,discipline:p.discipline,report:p.report});v.prototypeHistory.length=Math.min(24,v.prototypeHistory.length);
  }
 }else{
  const c=(s.conceptPrograms||[]).find(x=>x.id===p.subjectId);
  if(c){
   c.prototypeEvidence=Array.isArray(c.prototypeEvidence)?c.prototypeEvidence:[];
   c.prototypeEvidence.unshift({id:p.id,report:p.report});c.prototypeEvidence.length=Math.min(12,c.prototypeEvidence.length);
   if(c.feedback){c.feedback.forecastConfidence=cap(N(c.feedback.forecastConfidence,50)+p.report.confidenceDelta,0,95);
    c.feedback.overall=cap(N(c.feedback.overall,55)+(quality-60)*.045,0,96);}
  }
 }
 audit(s,p,"completed",p.report);log("Prototype report for "+p.subjectName+" completed: "+quality+"/100 confidence.");
}
function autoDirector(s,log=()=>{}){
 const cfg=s.prototypeDirector;if(!cfg?.enabled)return{started:0,reason:"disabled"};
 const now=N(s.year)*12+N(s.month);
 if(N(s.day,1)!==1||N(s.month)%3!==0||cfg.lastReviewPeriod===now)return{started:0,reason:"not_due"};
 cfg.lastReviewPeriod=now;
 const advice=director(s);
 if(!advice){cfg.lastDecision="No eligible engineering subject";return{started:0,reason:"no_subject"};}
 const q=quote(s,advice.subject,advice.discipline,advice.environment);
 const capValue=Math.max(0,N(cfg.maxBudget,150000));
 if(!q.ready||q.budget>capValue){
  cfg.lastDecision=q.blocked||"Recommended study exceeds authorized budget";
  return{started:0,reason:cfg.lastDecision};
 }
 const r=start(s,advice.subject,advice.discipline,advice.environment,log);
 if(r.ok){
  cfg.lastDecision=advice.reason;
  cfg.lastProgramId=r.program.id;
  return{started:1,programId:r.program.id};
 }
 cfg.lastDecision=r.reason;return{started:0,reason:r.reason};
}
function processDay(s,log=()=>{}){
 const managed=autoDirector(s,log);
 let spent=0,completed=0,paused=0;
 for(const p of(s.prototypePrograms||[])){
  if(p.status!=="active")continue;
  if(!subjects(s).some(x=>x.key===p.subject)){p.status="cancelled";p.phase="SUBJECT UNAVAILABLE";audit(s,p,"cancelled");continue;}
  const cost=Math.min(Math.max(0,N(p.budget)-N(p.spent)),Math.max(0,N(p.dailySpend)));
  if(N(s.cash)+1e-7<cost){p.haltedForCash=true;p.phase="PAUSED — FUNDING";paused++;continue;}
  p.haltedForCash=false;s.cash-=cost;W.MDX?.recordCashTransaction?.(s,"research",-cost,"Prototype R&D — "+p.subjectName,{programId:p.id,discipline:p.discipline});p.spent=N(p.spent)+cost;spent+=cost;
  p.daysRemaining=Math.max(0,N(p.daysRemaining)-1);
  if(!p.daysRemaining){finish(s,p,log);completed++;}else{const progress=1-p.daysRemaining/Math.max(1,N(p.totalDays));
   p.phase=progress<.35?"SETUP":progress<.75?"VALIDATION":"ANALYSIS";}
 }
 return{spent,completed,paused,autoStarted:managed.started};
}
function director(s){
 const v=(s.vehicles||[]).filter(v=>v.active!==false).sort((a,b)=>N(a.stats?.reliability,70)-N(b.stats?.reliability,70))[0];
 if(v&&N(v.stats?.reliability,70)<72)return{subject:"model:"+v.id,discipline:"durability",environment:"extended",reason:"Lower than targeted model reliability requires extended fatigue tests"};
 const c=(s.conceptPrograms||[]).find(c=>c.status==="complete"&&!(c.prototypeEvidence||[]).length);
 if(c)return{subject:"concept:"+c.id,discipline:"market",environment:"standard",reason:"Completed concept needs customer evidence before its production proposal"};
 if(v)return{subject:"model:"+v.id,discipline:"powertrain",environment:"standard",reason:"Run routine powertrain validation before model renewal"};
 return null;
}
function markup(s){
 const list=subjects(s),programs=(s.prototypePrograms||[]).slice(-6).reverse();
 const opt=rows=>rows.map(x=>'<option value="'+safe(x.id)+'"'+(x.disabled?' disabled':'')+'>'+safe(x.name)+'</option>').join("");
 const form=list.length?'<div class="proto-fields"><label>TEST SUBJECT<select id="protoSubject">'+opt(list.map(x=>({id:x.key,name:x.name})))+'</select></label>'+
 '<label>VALIDATION TYPE<select id="protoType">'+opt(Object.entries(disciplines).map(([id,d])=>({id,name:d.name,disabled:N(s.year)<d.year})))+'</select></label>'+
 '<label>TEST DURATION<select id="protoDuration">'+opt(Object.entries(environments).map(([id,d])=>({id,name:d.name})))+'</select></label></div>'+
 '<div id="protoQuote" class="proto-quote"></div><div class="proto-buttons"><button type="button" class="btn secondary" id="protoDirector">DIRECTOR PROPOSAL</button><button type="button" class="btn hero" id="protoStart">FUND TEST</button></div>':
 '<p class="muted">Create a vehicle or concept program to enable prototype validation.</p>';
 const cfg=s.prototypeDirector||{enabled:false,maxBudget:150000};
 const autonomy='<div class="proto-automation"><label><input id="protoAuto" type="checkbox"'+(cfg.enabled?' checked':'')+'> Allow engineering director to authorize one validation study per quarter</label>'+
 '<label>MAX R&D PER STUDY <select id="protoAutoBudget">'+[50000,150000,350000,1000000].map(amount=>'<option value="'+amount+'"'+(N(cfg.maxBudget,150000)===amount?' selected':'')+'>'+money(amount)+'</option>').join("")+'</select></label>'+
 '<small>Off by default. Director only acts when explicitly enabled, the study meets your budget and cash is sufficient. Last decision: '+safe(cfg.lastDecision||"None")+'</small></div>';
 const history=programs.length?'<div class="proto-programs">'+programs.map(p=>'<div><b>'+safe(p.subjectName)+'</b><small>'+safe(disciplines[p.discipline]?.name)+' · '+safe(p.phase)+' · '+Math.round(N(p.daysRemaining))+' days left / '+money(p.spent)+' spent</small>'+(p.report?'<small>Validated '+p.report.quality+'/100 · '+(p.report.missedFailureRisk?'Residual risk warning':'Test report recorded')+'</small>':'')+'</div>').join("")+'</div>':"";
 return'<section class="panel proto-studio" id="protoStudio"><div class="budget-section-head"><div><span class="eyebrow">CHECKLIST 761–770 / ENGINEERING VALIDATION</span><h3>Prototype Lab</h3><p class="muted">Fund and test prototypes for real vehicles and concept programs; record engineering outcomes before launch.</p></div></div>'+form+autonomy+history+'</section>';
}
function wire(root,s,h={}){
 if(!root)return;const get=x=>root.querySelector(x),save=h.save||(()=>{}),rerender=h.rerender||(()=>{}),log=h.log||(()=>{}),toast=h.toast||(()=>{});
 const update=()=>{const q=quote(s,get("#protoSubject")?.value,get("#protoType")?.value,get("#protoDuration")?.value),r=get("#protoQuote");
  if(r)r.textContent=q.ready?money(q.budget)+" budget · "+q.days+" days · "+q.failureRisk.toFixed(0)+"% residual risk · est. reliability +"+q.expectedReliability.toFixed(1):q.blocked;
  const start=get("#protoStart");if(start)start.disabled=!q.ready;
 };
 for(const field of ["#protoSubject","#protoType","#protoDuration"])get(field)?.addEventListener("change",update);
 get("#protoDirector")?.addEventListener("click",()=>{const a=director(s);if(!a){toast("No eligible work");return;}
  if(get("#protoSubject"))get("#protoSubject").value=a.subject;
  if(get("#protoType"))get("#protoType").value=a.discipline;
  if(get("#protoDuration"))get("#protoDuration").value=a.environment;
  update();toast(a.reason);
 });
 get("#protoAuto")?.addEventListener("change",e=>{s.prototypeDirector={...s.prototypeDirector,enabled:!!e.target.checked,maxBudget:N(get("#protoAutoBudget")?.value,150000)};save();rerender();});
 get("#protoAutoBudget")?.addEventListener("change",e=>{s.prototypeDirector={...s.prototypeDirector,enabled:!!get("#protoAuto")?.checked,maxBudget:N(e.target.value,150000)};save();rerender();});
 get("#protoStart")?.addEventListener("click",()=>{const r=start(s,get("#protoSubject")?.value,get("#protoType")?.value,get("#protoDuration")?.value,log);
  if(!r.ok){toast(r.reason);return;}save();rerender();
 });
 update();
}
W.MDXPrototypeLab=Object.freeze({version:1,disciplines,environments,subjects,quote,start,processDay,director,autoDirector,markup,wire});
})();
