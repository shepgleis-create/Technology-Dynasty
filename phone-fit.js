/* Motor Dynasty: phone-only full engine report. No engine options replaced or removed. */
(()=>{
"use strict";
const W=window,D=document;
let dialog,trigger,placeholder,warningPlaceholder;
const get=id=>D.getElementById(id);
function close(){if(dialog)dialog.hidden=true;trigger?.focus?.({preventScroll:true});}
function init(){
 const envelope=get("engineEnvelope"),warning=get("engineWarning"),stage=D.querySelector("#view-engine .engine-stage");
 if(!envelope||!stage||get("mdxEngineReport"))return;
 placeholder=D.createComment("original mechanical envelope position");envelope.parentNode.insertBefore(placeholder,envelope);
 if(warning){warningPlaceholder=D.createComment("original engine warnings position");warning.parentNode.insertBefore(warningPlaceholder,warning);}
 dialog=D.createElement("div");dialog.id="mdxEngineReport";dialog.className="mdx-report-modal";dialog.hidden=true;dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","Engine mechanical report");
 dialog.innerHTML='<div class="mdx-report-card"><header><strong>ENGINE MECHANICAL REPORT</strong><button type="button" id="mdxReportClose">CLOSE ×</button></header><p>Piston speed, rod angles, load limits and fuel delivery update as you change the engine.</p><div id="mdxReportBody"></div></div>';
 D.body.append(dialog);
 trigger=D.createElement("button");trigger.type="button";trigger.id="mdxReportOpen";trigger.textContent="MECHANICAL DATA ↗";trigger.setAttribute("aria-label","Open detailed engine measurements and warnings");stage.append(trigger);
 trigger.addEventListener("click",()=>{if(W.innerWidth>700)return;dialog.hidden=false;get("mdxReportClose")?.focus();});
 get("mdxReportClose").addEventListener("click",close);
 dialog.addEventListener("click",e=>{if(e.target===dialog)close();});
 D.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)close();});
 function resize(){
  const onPhone=W.innerWidth<=700,box=get("mdxReportBody");
  if(onPhone){
   if(envelope.parentNode!==box)box.append(envelope);
   if(warning&&warning.parentNode!==box)box.append(warning);
  }else{
   close();
   if(envelope.parentNode!==placeholder.parentNode)placeholder.parentNode.insertBefore(envelope,placeholder.nextSibling);
   if(warning&&warningPlaceholder&&warning.parentNode!==warningPlaceholder.parentNode)warningPlaceholder.parentNode.insertBefore(warning,warningPlaceholder.nextSibling);
  }
  trigger.hidden=!onPhone;
 }
 W.addEventListener("resize",resize,{passive:true});resize();
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",init,{once:true});else init();
W.MDXPhoneReport={init,close};
})();