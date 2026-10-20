/* Mobile-first editor for all forty checklist 201–400 design disciplines. */
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const D=()=>G.MDXDesignDynamics,S=()=>G.MDXGame?.getState?.();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const price=v=>"$"+Math.round(n(v)).toLocaleString();
const fmt=(v,unit)=>Number(v).toLocaleString("en-US",{maximumFractionDigits:1})+(unit?" "+unit:"");
let focus={group:"body",topic:"sedan",target:"draft",proposal:null},root=null;
let exitButton=null,returnFocus=null;
function closeLab(){
 if(!root)return;
 root.classList.remove("md-design-overlay");
 document.body.classList.remove("md-design-overlay-active");
 exitButton?.remove();
 root.hidden=true;
 returnFocus?.focus?.({preventScroll:true});
 returnFocus=null;
}
function openLab(group="body"){
 if(group==="body"||group==="chassis")focus.group=group;
 render();
 const el=ensureRoot();if(!el)return;
 returnFocus=document.activeElement;
 if(!exitButton){
  exitButton=document.createElement("button");
  exitButton.type="button";exitButton.className="md-design-overlay-exit";
  exitButton.setAttribute("aria-label","Close design and chassis workbench");
  exitButton.textContent="CLOSE DESIGN ×";
  exitButton.addEventListener("click",closeLab);
 }
 document.body.append(el,exitButton);
 el.hidden=false;
 el.classList.add("md-design-overlay");
 document.body.classList.add("md-design-overlay-active");
 el.scrollTop=0;exitButton.focus({preventScroll:true});
}
if(typeof document!=="undefined")document.addEventListener("keydown",e=>{if(e.key==="Escape"&&root?.classList.contains("md-design-overlay"))closeLab();});
function bodyGroup(){
 const topic=D().BY_KEY[focus.topic];
 if(topic?.group!==focus.group)focus.topic=D().TOPICS.find(t=>t.group===focus.group)?.key||"sedan";
}
function ensureRoot(){
 const slot=document.getElementById("view-vehicle");if(!slot)return null;
 if(root&&!root.isConnected)root=null;
 if(!root){root=document.createElement("section");root.id="md-design-dynamics";root.className="md-design-lab";root.setAttribute("aria-label","Body Design and Chassis Dynamics engineering studio");
 const head=slot.querySelector(".view-head"),shell=slot.querySelector(".vehicle-shell");root.hidden=true;document.body.append(root);
 if(head&&!head.querySelector("#md-open-design")){const quick=document.createElement("button");quick.type="button";quick.id="md-open-design";quick.textContent="ADVANCED DESIGN + DYNAMICS ↓";quick.setAttribute("aria-controls","md-design-dynamics");quick.addEventListener("click",()=>openLab());head.querySelector("div")?.append(quick);}
 root.addEventListener("click",onClick);root.addEventListener("change",onChange);root.addEventListener("input",onInput);}
 return root;
}
function activeTopic(){bodyGroup();return D().BY_KEY[focus.topic];}
function source(){
 const s=S();if(!s)return null;
 const v=D().vehicle(s,focus.target);
 if(!v){focus.target="draft";return D().vehicle(s,"draft");}
 return v;
}
function topicsMarkup(){
 return D().TOPICS.filter(t=>t.group===focus.group).map(t=>'<option value="'+esc(t.key)+'" '+(focus.topic===t.key?"selected":"")+'>'+esc(t.label)+'</option>').join("");
}
function targetsMarkup(s){
 return '<option value="draft" '+(focus.target==="draft"?"selected":"")+'>New vehicle design (prototype)</option>'+
 (s.vehicles||[]).filter(v=>v.id).map(v=>'<option value="'+esc(v.id)+'" '+(String(focus.target)===String(v.id)?"selected":"")+'>'+esc(v.name||"Unnamed production car")+' — '+esc(v.productionStatus||"released")+'</option>').join("");
}
function currentQuote(s,t,desired){
 return D().quote(s,t.key,desired,focus.target);
}
function svg(s,t,desired){
 const v=source(),design=v?.design||v||{},w=470,h=192;
 const widthPct=(n(design.trackWidth,1480)-1280)/640,wb=n(t.key==="wheelbase"?desired:design.wheelbase,2700);
 const platformMm=n(t.key==="dimensions"?desired:design.platformLength,wb*1.67),length=365+(wb-2700)/14+(platformMm-wb*1.67)/27,roof=n(t.field==="roofHeight"?desired:design.roofHeight,50),slope=n(design.roofSlope,50),rooflineCurve=n(t.key==="roofline"?desired:design.rooflineCurve,50);
 const rise=55+(roof-50)*.36,topY=105-rise;
 const front=55,rear=Math.min(428,front+length),cx=front+length*.53;
 const frontWheel=front+76,rearWheel=rear-72;
 const body=String(design.body||"sedan"),isTruck=["pickup","suv","van"].includes(body);
 const paint=String(design.paintColor||"#81959b");
 const height=isTruck?118:129;
 const r=14+(n(t.field==="wheel"?desired:design.wheel,14)-14)*.4;
 const shape=`M ${front} 125 Q ${front+10} 119 ${front+38} 117 L ${front+80} ${topY+24} Q ${front+110} ${topY} ${cx-slope*.12} ${topY} L ${isTruck?cx+84:cx+50} ${topY+4} Q ${rear-65} ${topY+32} ${rear-36} 116 L ${rear} 126 L ${rear-10} 148 L ${front+4} 148 Z`;
 const windows=`M ${front+95} ${topY+19} Q ${front+121} ${topY+7} ${cx-slope*.14} ${topY+9} L ${cx+43} ${topY+13} L ${rear-83} ${topY+26} Z`;
 const ratio=Math.max(0,Math.min(1,(desired-t.min)/Math.max(1,t.max-t.min))),active=t.key;
 const relevant=(...keys)=>keys.includes(active);
 const pen=(x1,y1,x2,y2,color="#f0c48a",size=2)=>`<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="${size}" stroke-linecap="round"/>`;
 const spoke=(x,y,length,num,color="#afc4cc")=>Array.from({length:num},(_,i)=>{const a=Math.PI*2*i/num;return pen(x,y,x+Math.cos(a)*length,y+Math.sin(a)*length,color,1.5);}).join("");
 const fog=`<rect x="${front+6}" y="135" width="${10+ratio*18}" height="5" rx="2" fill="#ffdf9d" opacity=".7"/>`;
 const grill=`<rect x="${front+6}" y="${127-ratio*5}" width="${10+ratio*19}" height="${8+ratio*8}" rx="${ratio*4}" fill="#081a23" stroke="#9cbdc5" stroke-width="1"/>`+Array.from({length:2+Math.round(ratio*5)},(_,i)=>pen(front+9+i*(2+ratio),128-ratio*3,front+9+i*(2+ratio),133+ratio*2,"#d2e1df",.9)).join("");
 const taillamp=`<path d="M ${rear-27} ${125-ratio*5} L ${rear-11} ${127-ratio*3}" stroke="#ff886f" stroke-width="${2+ratio*5}" stroke-linecap="round"/>`;
 const frontlamp=`<path d="M ${front+11} ${127-ratio*5} L ${front+28+ratio*8} ${125-ratio*2}" stroke="#fff6c7" stroke-width="${2+ratio*4}" stroke-linecap="round"/>`;
 const horizontalArrow=(x,y,to,color)=>pen(x,y,to,y,color,1.5)+`<path d="M ${to-6} ${y-4} L ${to} ${y} L ${to-6} ${y+4}" stroke="${color}" stroke-width="1.5" fill="none"/>`;
 const suspension=(x,y,number)=>`<path d="M ${x-18} ${y-8} L ${x-11} ${y-15} L ${x-4} ${y-8} L ${x+3} ${y-15} L ${x+10} ${y-8} L ${x+17} ${y-15}" stroke="#f6be79" stroke-width="2" fill="none" transform="translate(0,${-number*7})"/>`;
 let visual="";
 if(relevant("grille"))visual+=grill;
 if(relevant("headlight"))visual+=frontlamp;
 if(relevant("taillight"))visual+=taillamp;
 if(relevant("bumper"))visual+=`<path d="M ${front+2} ${138-ratio*2} L ${front+9+ratio*22} ${140+ratio*4} M ${rear-30-ratio*10} ${138-ratio*2} L ${rear-2} ${142+ratio*5}" stroke="#eac291" stroke-width="${2+ratio*4}" stroke-linecap="round"/>`;
 if(relevant("hood"))visual+=pen(front+23,117-ratio*12,front+89,110-ratio*10);
 if(relevant("arches"))visual+=`<path d="M ${frontWheel-r-10-ratio*5} 147 A ${r+8+ratio*7} ${r+7+ratio*6} 0 0 1 ${frontWheel+r+10+ratio*5} 147 M ${rearWheel-r-10-ratio*5} 147 A ${r+8+ratio*7} ${r+7+ratio*6} 0 0 1 ${rearWheel+r+10+ratio*5} 147" stroke="#e5af74" stroke-width="${2+ratio*3}" fill="none"/>`;
 if(relevant("windows"))visual+=`<path d="M ${front+110+ratio*15} ${topY+12} L ${front+106+ratio*15} ${topY+27} M ${cx+38-ratio*15} ${topY+15} L ${cx+50-ratio*15} ${topY+35}" stroke="#e4b77e" stroke-width="2"/>`;
 if(relevant("roofline"))visual+=`<path d="M ${front+100} ${topY+2} Q ${cx} ${topY-11-(rooflineCurve-10)/80*12} ${rear-73} ${topY+21}" fill="none" stroke="#e1b47d" stroke-dasharray="5 5" stroke-width="2"/>`;
 if(relevant("paint"))visual+=`<path d="M ${front+40} 116 Q ${cx} ${91-ratio*15} ${rear-60} 118" fill="none" stroke="#f2e7d4" stroke-width="${1+ratio*5}" opacity="${.2+ratio*.7}"/>`;
 if(relevant("wheels","wheelSize","tires"))visual+=spoke(frontWheel,145,r*.7,4+Math.round(ratio*8)) + spoke(rearWheel,145,r*.7,4+Math.round(ratio*8));
 if(relevant("brakes"))visual+=`<circle cx="${frontWheel}" cy="145" r="${r*(.45+ratio*.45)}" stroke="#f3b568" stroke-width="${2+ratio*3}" fill="none"/><circle cx="${rearWheel}" cy="145" r="${r*(.45+ratio*.45)}" stroke="#f3b568" stroke-width="${2+ratio*3}" fill="none"/>`;
 if(relevant("attachments","drag","downforce"))visual+=horizontalArrow(front+45,94,rear-25,"#b6e6dc")+horizontalArrow(front+65,80,rear-45,"#b6e6dc") + `<path d="M ${rear-25} 115 L ${rear-15+ratio*15} ${115-ratio*16}" stroke="#efc184" stroke-width="${2+ratio*4}"/>`;
 if(relevant("distribution"))visual+=`<circle cx="${frontWheel+(rearWheel-frontWheel)*ratio}" cy="110" r="10" fill="#eea773" opacity=".85"/><path d="M ${frontWheel+(rearWheel-frontWheel)*ratio-6} 110 h12 M ${frontWheel+(rearWheel-frontWheel)*ratio} 104 v12" stroke="#19272c" stroke-width="2"/>`;
 if(relevant("rigidity","crash"))visual+=pen(front+65,121,cx,topY+8-ratio*10,"#f3c684",1.4+ratio*3.6)+pen(cx,topY+8-ratio*10,rear-62,121,"#f3c684",1.4+ratio*3.6)+pen(front+65,121-ratio*5,rear-62,121-ratio*5,"#f3c684",1.4+ratio*3.6);
 if(relevant("frontSusp","rearSusp","springs","dampers","antiRoll","steering"))visual+=suspension(frontWheel,104,ratio)+suspension(rearWheel,104,ratio);
 if(relevant("rideHeight"))visual+=pen(frontWheel,145+r+7,frontWheel,175-ratio*10,"#f7c17b",2)+horizontalArrow(frontWheel+7,173-ratio*10,frontWheel+38,"#f7c17b");
 if(relevant("nvh","interior","colorways"))visual+=`<path d="M ${cx-70} ${topY+38} Q ${cx} ${topY+31-ratio*7} ${cx+55} ${topY+38}" fill="none" stroke="#f2bf93" stroke-width="${1+ratio*4}"/>`;
 if(relevant("suv","pickup","van"))visual+=`<path d="M ${cx+55} ${topY+15} L ${rear-55} ${topY+20}" stroke="#f4be85" stroke-width="${1+ratio*5}"/>`;
 if(relevant("sedan","coupe","hatch","wagon","era"))visual+=`<path d="M ${front+95} ${topY+4} L ${cx+45+ratio*20} ${topY+4}" stroke="#f4c587" stroke-width="2" stroke-dasharray="4 3"/>`;
 if(relevant("durability"))visual+=`<rect x="${cx-14-ratio*9}" y="${115-ratio*3}" width="${28+ratio*18}" height="${22+ratio*6}" rx="${3+ratio*2}" fill="#173037" stroke="#f2c082" stroke-width="${2+ratio*3}"/><text x="${cx}" y="130" text-anchor="middle" font-size="10" fill="#ffcf8f">${Math.round(ratio*100)}%</text>`;
 if(relevant("track","dimensions","wheelbase"))visual+=pen(frontWheel,167,rearWheel,167,"#f2be83",2.5);
 return `<svg class="md-lab-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Live ${esc(body)} silhouette with ${esc(t.label)} at ${esc(fmt(desired,t.unit))}">
 <defs><linearGradient id="md-lab-metal" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${esc(paint)}"/><stop offset=".7" stop-color="#4d656c"/><stop offset="1" stop-color="#223841"/></linearGradient></defs>
 <rect width="470" height="192" rx="14" fill="#09151d"/>
 <path d="M 22 156 L 448 156" stroke="#46616a" stroke-width="2"/>
 <path d="${shape}" fill="url(#md-lab-metal)" stroke="#b8cad0" stroke-width="2"/>
 <path d="${windows}" fill="#0a1c26" stroke="#a8c6d0" stroke-width="1.5"/>
 <path d="M ${cx-8} 84 L ${cx-8} 146" stroke="#0c2330" stroke-width="2"/>
 <circle cx="${frontWheel}" cy="145" r="${r+7}" fill="#08131b" stroke="#8a9aa4" stroke-width="3"/>
 <circle cx="${rearWheel}" cy="145" r="${r+7}" fill="#08131b" stroke="#8a9aa4" stroke-width="3"/>
 <circle cx="${frontWheel}" cy="145" r="${r-1}" fill="#748b94" stroke="#d0d7d8" stroke-width="2"/>
 <circle cx="${rearWheel}" cy="145" r="${r-1}" fill="#748b94" stroke="#d0d7d8" stroke-width="2"/>
 <path d="M ${frontWheel} 177 L ${rearWheel} 177 M ${frontWheel} 172 V 182 M ${rearWheel} 172 V 182" stroke="#d3ab76" stroke-width="1.5"/>
 <text x="${(frontWheel+rearWheel)/2}" y="190" text-anchor="middle" font-size="10" fill="#e7c490">${t.key==="dimensions"?"PLATFORM LENGTH "+Math.round(platformMm)+" MM":"WHEELBASE "+Math.round(wb)+" MM"}</text>
 <text x="22" y="24" font-size="11" fill="#d5e3e7" font-weight="700">${esc(t.label.toUpperCase())}</text>
 <text x="448" y="24" text-anchor="end" font-size="11" fill="#e2b779">${esc(fmt(desired,t.unit))}</text>
 <path d="M ${rear-27} 127 L ${rear-12} 128" stroke="#d8a36b" stroke-width="3"/>
 <path d="M ${front+9} 128 L ${front+24} 126" stroke="#e9edc4" stroke-width="3"/>
 ${visual}
 </svg>`;
}
function statGrid(q){
 const eff=q?.performance;if(!eff)return'<p>Select a new specification to calculate cost, time and physical consequences.</p>';
 const fields=[["Handling",eff.handling,"pts"],["Comfort",eff.comfort,"pts"],["Safety",eff.safety,"pts"],["Aerodynamics",eff.aero,"pts"],["Mass",eff.massKg,"kg"],["Unit cost",eff.unitCost,"USD"]];
 return '<div class="md-lab-stats">'+fields.map(([title,value,unit])=>'<div><span>'+esc(title)+'</span><strong class="'+(value<0?"negative":value>0?"positive":"")+'">'+(value>0?"+":"")+Number(value).toFixed(unit==="pts"?1:0)+' '+unit+'</strong></div>').join("")+'</div>';
}
function render(){
 const s=S();if(!ensureRoot())return;
 if(!s||!D()){root.innerHTML='<div class="md-lab-empty">Body design and chassis controls become available once you create or resume a company.</div>';return;}
 D().ensure(s);const t=activeTopic(),v=source();if(!v){root.innerHTML='<div class="md-lab-empty">Create a vehicle draft to begin engineering.</div>';return;}
 const current=D().value(s,t.key,focus.target);
 const target=t.step===1?current:Math.round((current-t.min)/t.step)*t.step+t.min;
 const proposed=focus.proposal?.topic===t.key&&focus.proposal?.target===focus.target?focus.proposal.value:target;
 const q=currentQuote(s,t,proposed),running=D().ensure(s).programs.filter(p=>["active","paused_funding","paused_dependency"].includes(p.status)&&String(p.target)===String(focus.target));
 const hist=D().audit(s,t.key,focus.target),body=String(v.design?.body||v.body||"sedan");
 root.innerHTML=`<header class="md-lab-head"><div><span>PRODUCT DEVELOPMENT / NEXT-GEN DESIGN</span><h3>Body Design & Chassis Dynamics</h3><p>40 funded engineering disciplines. Edits must be paid for, developed and validated before changing vehicle specifications.</p></div><span class="md-lab-count">CHECKLIST 201–400</span></header>
 <div class="md-lab-groups" role="group" aria-label="Engineering department"><button data-md-lab-group="body" aria-pressed="${focus.group==="body"}">BODY + STYLE / 20</button><button data-md-lab-group="chassis" aria-pressed="${focus.group==="chassis"}">CHASSIS + DYNAMICS / 20</button></div>
 <div class="md-lab-controls"><label>Work on vehicle<select data-md-lab="target">${targetsMarkup(s)}</select></label><label>Subsystem<select data-md-lab="topic">${topicsMarkup()}</select></label></div>
 <div class="md-lab-grid"><section class="md-lab-work"><div class="md-lab-subtitle"><span>DESIGN WORKBENCH / ${t.firstId}–${t.firstId+4}</span><b>${esc(t.label)}</b></div>
 <p class="md-lab-help">${esc(t.label)} governs <b>${esc(t.discipline)}</b>. The current vehicle is a ${esc(body)}. Values are engineering settings, not cosmetic bonuses; extreme changes require more validation.</p>
 <label class="md-lab-range"><span>Requested specification <output data-md-lab-output>${esc(fmt(proposed,t.unit))}</output></span><input type="range" data-md-lab="value" min="${t.min}" max="${t.max}" step="${t.step}" value="${proposed}" aria-label="Adjust ${esc(t.label)}"></label>
 <div class="md-lab-comparison"><div><span>CURRENT</span><b>${esc(fmt(current,t.unit))}</b></div><div><span>REQUESTED</span><b data-md-lab-requested>${esc(fmt(proposed,t.unit))}</b></div><div><span>DELTA</span><b data-md-lab-delta>${esc(fmt(proposed-current,t.unit))}</b></div></div>
 <div data-md-lab-preview class="md-lab-preview">${svg(s,t,proposed)}</div></section>
 <section class="md-lab-quote" aria-live="polite"><div class="md-lab-subtitle"><span>ENGINEERING GATE</span><b>Funded approval</b></div>
 <div data-md-lab-quote>${quoteMarkup(q)}</div><div data-md-lab-stats>${statGrid(q)}</div>
 <button class="md-lab-commit" data-md-lab-action="commission" ${!q.ok?"disabled":""}>AUTHORIZE ENGINEERING CHANGE</button></section></div>
 <div class="md-lab-history"><section><h4>Funded work queue (${running.length})</h4><div data-md-lab-queue>${queueMarkup(running)}</div></section><section><h4>Before / after & audit — ${esc(t.label)}</h4><div data-md-lab-audit>${auditMarkup(hist)}</div></section></div>
 <details class="md-lab-ai"><summary>Competitor design priorities & spending</summary>${aiMarkup(s,t)}</details>
 <p class="md-lab-notice" data-md-lab-notice role="status" aria-live="polite"></p>`;
}
function quoteMarkup(q){
 if(!q.ok)return'<p class="md-lab-blocked">'+esc(q.reason)+'</p>';
 const p=q.packaging,m=p?.measurements||{};
 return '<div class="md-lab-quote-grid"><div><span>ENGINEERING + TOOLING</span><b>'+price(q.budget)+'</b></div><div><span>DEVELOPMENT TIME</span><b>'+q.days+' game days</b></div><div><span>DAILY CASH</span><b>'+price(q.costPerDay)+'</b></div></div><p class="md-lab-warning">'+esc(q.performance.warning)+'</p>'+
  (q.dependencyWarning?'<p class="md-lab-warning">'+esc(q.dependencyWarning)+'</p>':'')+
  (p?'<div class="md-lab-homologation"><strong>Packaging + homologation</strong><span>Brake-to-wheel clearance: '+n(m.wheelBrakeClearanceMm).toFixed(1)+' mm</span><span>Body overhang: '+Math.round(n(m.totalOverhangMm))+' mm</span><span>Risk score: '+Math.round(n(m.packagingRisk))+' / 100</span>'+
   p.warnings.map(w=>'<p class="md-lab-warning">'+esc(w)+'</p>').join('')+'</div>':'');
}
function queueMarkup(rows){return rows.length?rows.slice(-8).map(p=>'<article><div><strong>'+esc(D().BY_KEY[p.topic]?.label||p.topic)+'</strong><small>'+(p.status==="paused_funding"?'PAUSED — FUNDING REQUIRED • ':p.status==="paused_dependency"?'PAUSED — PACKAGING CONFLICT • ':'')+p.remaining+' days remaining • '+price(p.spent)+' / '+price(p.budget)+'</small></div><button data-md-lab-action="cancel" data-id="'+esc(p.id)+'">CANCEL</button><progress max="'+p.days+'" value="'+(p.days-p.remaining)+'"></progress></article>').join(""):'<p class="md-lab-muted">No active funded revisions for this vehicle.</p>';}
function auditMarkup(a){
 return a.history.length?a.history.slice(0,6).map(h=>'<article><b>'+esc(h.from)+' → '+esc(h.to)+'</b><small>'+h.year+' / '+(h.month+1)+' / '+h.day+' • '+price(h.spent)+' • handling '+(h.deltas?.handling||0).toFixed(1)+' • safety '+(h.deltas?.safety||0).toFixed(1)+'</small></article>').join(""):'<p class="md-lab-muted">No completed changes yet. Approved changes are retained in the saved vehicle and company audit trail.</p>';
}
function aiMarkup(s,t){
 const rows=D().ensure(s).aiLog.filter(x=>x.topic===t.key).slice(0,10);
 return rows.length?'<div class="md-lab-ai-rows">'+rows.map(x=>'<article><strong>'+esc(x.name)+'</strong><span>'+esc(x.strategy)+' • '+esc(x.reason)+'</span><b>'+price(x.budget)+'</b></article>').join("")+'</div>':'<p class="md-lab-muted">Rival design plans are audited after a company-month closes. Each rival considers a different discipline and protects its operating cash reserve.</p>';
}
function notify(msg){const node=root?.querySelector("[data-md-lab-notice]");if(node)node.textContent=msg;}
function onClick(e){
 const g=e.target.closest("[data-md-lab-group]");if(g){focus.group=g.dataset.mdLabGroup;focus.topic=focus.group==="body"?"sedan":"dimensions";focus.proposal=null;render();return;}
 const b=e.target.closest("[data-md-lab-action]");if(!b)return;const s=S();if(!s)return;
 if(b.dataset.mdLabAction==="commission"){
  const t=activeTopic(),next=n(root.querySelector('[data-md-lab="value"]')?.value,t.initial),r=D().commission(s,t.key,next,focus.target);
  if(r.ok){G.MDXGame?.save?.();focus.proposal=null;render();notify("Engineering authorized. "+price(r.quote.budget)+" scheduled over "+r.quote.days+" game days.");}
  else notify(r.reason);return;
 }
 if(b.dataset.mdLabAction==="cancel"){const r=D().cancel(s,b.dataset.id);if(r.ok){G.MDXGame?.save?.();render();notify("Program cancelled. Costs already incurred remain charged.");}else notify(r.reason);}
}
function onChange(e){
 if(!e.target.matches("[data-md-lab]"))return;
 if(e.target.dataset.mdLab==="target"){focus.target=e.target.value;focus.proposal=null;render();}
 if(e.target.dataset.mdLab==="topic"){focus.topic=e.target.value;focus.proposal=null;render();}
}
function onInput(e){
 if(e.target.dataset.mdLab!=="value")return;
 const s=S(),t=activeTopic();if(!s)return;
 const proposed=n(e.target.value,t.initial),before=D().value(s,t.key,focus.target),q=currentQuote(s,t,proposed);
 focus.proposal={topic:t.key,target:focus.target,value:proposed};
 const put=(sel,text)=>{const n=root.querySelector(sel);if(n)n.textContent=text};
 put("[data-md-lab-output]",fmt(proposed,t.unit));put("[data-md-lab-requested]",fmt(proposed,t.unit));put("[data-md-lab-delta]",fmt(proposed-before,t.unit));
 const preview=root.querySelector("[data-md-lab-preview]");if(preview)preview.innerHTML=svg(s,t,proposed);
 const quoteEl=root.querySelector("[data-md-lab-quote]");if(quoteEl)quoteEl.innerHTML=quoteMarkup(q);
 const stats=root.querySelector("[data-md-lab-stats]");if(stats)stats.innerHTML=statGrid(q);
 const action=root.querySelector('[data-md-lab-action="commission"]');if(action)action.disabled=!q.ok;
}
function init(){ensureRoot();render();}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
 document.addEventListener("click",e=>{if(e.target.closest?.("#vehicleChassisOpen,[data-md-open-design]")){e.preventDefault();openLab();return;}if(e.target.closest?.('[data-view="vehicle"],[data-dock-key="vehicle"],#newCompanyBtn,#continueBtn'))setTimeout(render,0);});
}
G.MDXDesignDynamicsUI={render,open:openLab,close:closeLab,renderPreviewSVG:svg,focus:()=>({...focus}),choose:(group,topic,target="draft")=>{focus={group,topic,target,proposal:null};render();}};
})();
