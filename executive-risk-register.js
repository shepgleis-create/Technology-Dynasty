/* Executive risk register — live, save-derived indicators and direct navigation.
   Read-only; does not modify save format or invent financial figures. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>{const v=Math.abs(x),u=v>=1e9?["B",1e9]:v>=1e6?["M",1e6]:v>=1e3?["K",1e3]:["",1];return (x<0?"−":"")+"$"+(v/u[1]).toFixed(v>=u[1]*10?1:2)+u[0];};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function evaluate(s){
 const cash=num(s.cash),debt=Math.max(0,num(s.debt)),profit=num(s.lastProfit),vehicles=Array.isArray(s.vehicles)?s.vehicles:[],industry=Array.isArray(s.industry)?s.industry:[],rep=num(s.rep);
 const monthlyBurn=profit<0?-profit:0,runway=monthlyBurn>0?cash/monthlyBurn:Infinity;
 const risks=[
 {name:"Liquidity",score:cash<=0?100:runway<3?90:runway<6?72:runway<12?47:15,detail:monthlyBurn>0?(Number.isFinite(runway)?runway.toFixed(1)+" months of cash at last reported monthly loss":"No remaining cash"):"No monthly loss in latest result",view:"budget"},
 {name:"Debt exposure",score:debt>cash*3?88:debt>cash?65:debt>cash*.5?42:14,detail:money(debt)+" debt against "+money(cash)+" cash",view:"budget"},
 {name:"Product concentration",score:vehicles.length===0?85:vehicles.length===1?68:vehicles.length===2?42:20,detail:vehicles.length+" vehicle records in portfolio",view:"library"},
 {name:"Brand strength",score:rep<15?82:rep<30?60:rep<50?40:18,detail:rep.toFixed(0)+" / 100 reputation",view:"market"},
 {name:"Industry distress",score:industry.length?Math.min(100,Math.round(100*industry.filter(c=>["distressed","bankrupt","liquidated"].includes(c.status)).length/industry.length)*2):0,detail:industry.filter(c=>["distressed","bankrupt","liquidated"].includes(c.status)).length+" distressed / "+industry.length+" tracked companies",view:"companies"}
 ];
 return risks.map(r=>({...r,level:r.score>=70?"CRITICAL":r.score>=40?"WATCH":"STABLE"}));
}
function render(){
 const home=$("view-home"),root=$("md-risk-register");if(!home||!root||!home.classList.contains("active"))return;
 const s=window.MDXGame?.getState?.();if(!s)return;
 const risks=evaluate(s),count=risks.filter(r=>r.score>=70).length;
 root.innerHTML='<header class="md-risk-head"><div><span class="eyebrow">EXECUTIVE INTELLIGENCE</span><h3>Operating risk register</h3><p>Live indicators calculated from your current save. Select a risk to inspect its department.</p></div><strong class="md-risk-count">'+count+' HIGH</strong></header><div class="md-risk-grid">'+risks.map(r=>'<button type="button" class="md-risk-item" data-risk-view="'+esc(r.view)+'"><span class="md-risk-title">'+esc(r.name)+'</span><span class="md-risk-level '+(r.score>=70?"high":r.score>=40?"medium":"low")+'">'+r.level+'</span><span class="md-risk-track"><i style="width:'+r.score+'%"></i></span><small>'+esc(r.detail)+'</small><em>OPEN '+esc(r.view.toUpperCase())+' →</em></button>').join("")+'</div>';
 root.querySelectorAll("[data-risk-view]").forEach(btn=>btn.addEventListener("click",()=>{const target=btn.dataset.riskView;const nav=document.querySelector('.bottom-nav [data-view="'+target+'"],.command-nav [data-view="'+target+'"]');nav?.click();}));
}
function mount(){const home=$("view-home");if(!home||$("md-risk-register"))return;const root=document.createElement("section");root.id="md-risk-register";root.className="panel md-risk-register";const anchor=$("dailyOps")||$("homePrograms");if(anchor)anchor.parentNode.insertBefore(root,anchor);else home.appendChild(root);render();}
document.addEventListener("DOMContentLoaded",()=>{mount();document.addEventListener("click",e=>{if(e.target.closest('[data-view="home"]'))requestAnimationFrame(render);});});
window.MDXExecutiveRisk={evaluate,render};
})();
