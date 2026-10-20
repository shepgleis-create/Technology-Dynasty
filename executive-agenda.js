/* Executive Agenda: persistent player policy with daily cost, RP, reputation and audit. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const POLICY={
 balanced:{label:"Balanced",daily:0,rp:0,rep:0,desc:"No additional executive program spending."},
 engineering:{label:"Engineering first",daily:2600,rp:.20,rep:0,desc:"Fund research teams. Adds 0.20 RP each simulated day."},
 quality:{label:"Quality recovery",daily:1900,rp:0,rep:.008,desc:"Fund brand and quality outreach. Adds 0.008 reputation per simulated day."},
 austerity:{label:"Cost discipline",daily:0,rp:0,rep:-.003,desc:"Pause discretionary initiatives. Reputation slowly erodes."}
};
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function ensure(s){if(!s.executiveAgenda||!POLICY[s.executiveAgenda.policy])s.executiveAgenda={policy:"balanced",history:[],totalSpent:0,totalResearch:0,totalReputation:0,lastDay:null};const a=s.executiveAgenda;a.history=Array.isArray(a.history)?a.history:[];return a;}
function setPolicy(s,key){if(!s||!POLICY[key])return{ok:false,reason:"Invalid policy"};const a=ensure(s);if(a.policy===key)return{ok:true,unchanged:true};const old=a.policy;a.policy=key;a.history.unshift({year:s.year,month:s.month,day:s.day,kind:"policy",from:old,to:key});window.MDXHQManagement?.logDecision?.(s,"agenda","Executive agenda: "+POLICY[key].label,old,key);a.history.length=Math.min(80,a.history.length);return{ok:true};}
function processDay(s){if(!s)return 0;processRivalAgendas(s);const a=ensure(s),key=[s.year,s.month,s.day].join("-");if(a.lastDay===key)return 0;a.lastDay=key;const p=POLICY[a.policy],spend=Math.min(Math.max(0,num(s.cash)),p.daily);
 s.cash=num(s.cash)-spend;a.totalSpent+=spend;
 // Avoid fractional RP being lost in game code that expects integer values.
 a.researchRemainder=num(a.researchRemainder)+p.rp;
 const rp=Math.floor(a.researchRemainder+1e-9);a.researchRemainder-=rp;
 s.rp=num(s.rp)+rp;a.totalResearch+=rp;
 const oldRep=clamp(num(s.rep),0,100);s.rep=clamp(oldRep+p.rep*(p.daily===0||spend===p.daily?1:spend/p.daily),0,100);a.totalReputation+=s.rep-oldRep;
 if(spend<p.daily&&a.policy!=="balanced"){a.history.unshift({year:s.year,month:s.month,day:s.day,kind:"underfunded",policy:a.policy,shortfall:p.daily-spend});a.history.length=Math.min(80,a.history.length);}
 return spend;
}
function processRivalAgendas(s){
 if(!Array.isArray(s.industry))return 0;
 const month=[s.year,s.month].join("-");
 let updated=0;
 for(const rival of s.industry){
  if(!rival||rival.acquired||["bankrupt","liquidated","merged_into_player"].includes(String(rival.status||"")))continue;
  const old=rival.executiveAgendaAI||{};
  if(old.lastMonth===month)continue;
  const hasCash=Number.isFinite(Number(rival.cash))&&rival.cash!=null,cash=hasCash?Math.max(0,num(rival.cash)):0,profit=num(rival.monthProfit),rep=clamp(num(rival.rep??rival.reputation??50),0,100);
  const options=[
   {policy:"balanced",reason:"Preserve flexibility while cash and demand are stable",score:20},
   {policy:"engineering",reason:"Invest in engineering to compete on product capability",score:cash>2000000?35:5},
   {policy:"quality",reason:"Repair weak brand perception and customer confidence",score:rep<35&&cash>300000?60:10},
   {policy:"austerity",reason:"Protect liquidity following operating losses",score:profit<0&&cash<Math.abs(profit)*8?90:0}
  ];
  if(cash<100000)options[3].score=100;
  const choice=options.reduce((best,x)=>x.score>best.score?x:best,options[0]);
  const budget=Math.min(cash,choice.policy==="engineering"?60000:choice.policy==="quality"?40000:0);
  if(hasCash)rival.cash=cash-budget;
  if(choice.policy==="engineering")rival.engineeringInvestment=num(rival.engineeringInvestment)+budget;
  if(choice.policy==="quality")rival.reputation=clamp(rep+budget/400000,0,100);
  rival.executiveAgendaAI={policy:choice.policy,reason:choice.reason,lastMonth:month,lastSpend:budget,history:[...(old.history||[]).slice(-11),{year:s.year,month:s.month,policy:choice.policy,reason:choice.reason,spend:budget}]};
  updated++;
 }
 return updated;
}
function fmt(n){return "$"+Math.round(n).toLocaleString();}
function render(){
 const s=window.MDXGame?.getState?.(),home=$("view-home");if(!s||!home||!home.classList.contains("active"))return;
 let root=$("md-executive-agenda");if(!root){root=document.createElement("section");root.id="md-executive-agenda";root.className="panel md-executive-agenda";const anchor=$("md-risk-register")||$("dailyOps");if(anchor?.parentNode)anchor.parentNode.insertBefore(root,anchor);else home.appendChild(root);}
 const a=ensure(s),p=POLICY[a.policy],history=a.history.slice(0,5);
 root.innerHTML='<header><div><span class="eyebrow">EXECUTIVE POLICY</span><h3>Board agenda</h3><p>Choose a company-wide initiative. Spending and results apply as the simulation advances.</p></div><b>'+fmt(p.daily)+'/day</b></header><div class="md-agenda-options">'+Object.entries(POLICY).map(([k,v])=>'<button type="button" data-agenda-policy="'+k+'" aria-pressed="'+(a.policy===k)+'"><strong>'+v.label+'</strong><small>'+v.desc+'</small><em>'+fmt(v.daily)+'/day</em></button>').join("")+'</div><div class="md-agenda-foot"><span>Total invested <b>'+fmt(a.totalSpent)+'</b></span><span>Research earned <b>'+Math.round(a.totalResearch)+' RP</b></span><span>Reputation change <b>'+a.totalReputation.toFixed(2)+'</b></span></div><details><summary>Recent policy decisions</summary><ol>'+ (history.length?history.map(h=>'<li>'+[h.year,h.month,h.day].join('/')+' — '+(h.kind==="policy"?"Changed from "+POLICY[h.from]?.label+" to "+POLICY[h.to]?.label:"Insufficient cash to fully fund "+POLICY[h.policy]?.label)+'</li>').join(""):'<li>No decisions recorded.</li>')+'</ol></details>';
 root.querySelectorAll("[data-agenda-policy]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.agendaPolicy;if(k===a.policy)return;const result=setPolicy(s,k);if(result.ok){window.MDXGame?.save?.();render();}}));
}
function init(){document.addEventListener("click",e=>{if(e.target.closest('[data-view="home"]'))requestAnimationFrame(render);});window.addEventListener("mdx:state",render);window.addEventListener("mdx:ready",render);render();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.MDXExecutiveAgenda={POLICY,ensure,setPolicy,processDay,processRivalAgendas,render};
})();