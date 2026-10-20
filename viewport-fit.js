/* Motor Dynasty: one viewport controller for the ORIGINAL engineering and operations UI.
 * No new navigation, no pagers, no dropdown replacement and no save schema changes.
 * Geometry is based on the actual rendered phone viewport, not guessed CSS breakpoints.
 */
(()=>{
"use strict";
const W=window,D=document;
let active="",scheduled=false,pending=false,observer=null,geometryObserver=null,lastFit=null;
const small=()=>W.matchMedia("(max-width: 700px)").matches;
const $=sel=>D.querySelector(sel);
const workspace=mode=>D.getElementById("view-"+mode);
function enter(mode){
 active=mode||"";
 const enabled=small()&&["engine","vehicle","library"].includes(active);
 D.body.classList.toggle("mdx-viewport-locked",enabled);
 D.body.classList.toggle("mdx-builder-locked",enabled&&(active==="engine"||active==="vehicle"));
 D.body.classList.toggle("mdx-operations-locked",enabled&&active==="library");
 const main=$(".game-main");
 if(main){
  main.classList.remove("builder-scrollable");
  if(enabled)main.scrollTop=0;
 }
 if(!enabled){
  D.querySelectorAll("#engineControls,#vehicleControls,#opsProducts,#opsExpansion").forEach(n=>{
   n.style.removeProperty("transform");n.style.removeProperty("transform-origin");
   n.style.removeProperty("width");n.style.removeProperty("zoom");
  });
  return;
 }
 watch();
 schedule();
}
function limitFor(mode,host){
 if(mode==="library"){
  const p=workspace("library"),tabs=$("#opsTabs"),header=p?.querySelector(":scope > .view-head");
  const hostTop=host?.getBoundingClientRect().top||0;
  return Math.max(80,(p?.getBoundingClientRect().bottom||W.innerHeight)-hostTop-5);
 }
 const rail=host?.closest(".control-rail"),tabs=rail?.querySelector(".engineering-tabs");
 const bottom=rail?.getBoundingClientRect().bottom||W.innerHeight;
 const top=host?.getBoundingClientRect().top||0;
 return Math.max(80,bottom-top-5);
}
function fitNode(host,mode){
 if(!host||!host.isConnected||!small())return;
 const height=limitFor(mode,host);
 // An actual 100%-wide measurement is required before fitting.
 host.style.setProperty("transform","none","important");
 host.style.setProperty("transform-origin","top left","important");
 host.style.setProperty("width","100%","important");
 host.style.removeProperty("zoom");
 const test=(scale)=>{
  host.style.setProperty("width",(100/scale).toFixed(3)+"%","important");
  // scale() does not alter layout height, so the raw scrollHeight is an honest measurement.
  const h=Math.max(host.scrollHeight,host.offsetHeight,1);
  return h*scale;
 };
 const full=test(1);
 let scale=1;
 if(full>height+1){
  let lo=.14,hi=1;
  for(let i=0;i<13;i++){
   const mid=(lo+hi)/2;
   if(test(mid)<=height-3)lo=mid;else hi=mid;
  }
  scale=Math.max(.14,Math.min(1,lo));
 }
 host.style.setProperty("width",(100/scale).toFixed(3)+"%","important");
 host.style.setProperty("transform","scale("+scale.toFixed(4)+")","important");
 host.dataset.viewportScale=scale.toFixed(3);
 host.dataset.viewportHeight=String(Math.round(height));
 const actual=host.scrollHeight*scale;
 host.dataset.viewportOverflow=actual>height+3?"1":"0";
 lastFit={mode,scale,availableHeight:Math.round(height),displayedHeight:Math.round(actual),hiddenVerticalOverflow:actual>height+3};
}
function fit(){
 scheduled=false;
 if(!small()||!workspace(active)?.classList.contains("active"))return;
 const main=$(".game-main");
 if(main&&main.scrollTop)main.scrollTop=0;
 if(active==="engine"||active==="vehicle"){
  const id=active==="engine"?"engineControls":"vehicleControls";
  fitNode(D.getElementById(id),active);
 }else if(active==="library"){
  // Keep all ORIGINAL tabs and the three Products sections. Fit only current operations content.
  const host=D.querySelector("#view-library .ops-panel.active");
  if(host)fitNode(host,"library");
 }
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 W.requestAnimationFrame(()=>W.requestAnimationFrame(fit));
}
function watch(){
 if(observer)return;
 observer=new MutationObserver(mutations=>{
  // Only structural DOM changes: do not react to fit() setting styles.
  if(mutations.some(m=>m.type==="childList"))schedule();
 });
 for(const id of ["view-engine","view-vehicle","view-library"]){
  const host=D.getElementById(id);
  if(host)observer.observe(host,{childList:true,subtree:true});
 }
 geometryObserver=new ResizeObserver(()=>schedule());
 for(const sel of [".game-main","#view-engine .control-rail","#view-vehicle .control-rail","#opsTabs"]){
  const el=$(sel);if(el)geometryObserver.observe(el);
 }
}
function blockScroll(e){
 if(!small()||!D.body.classList.contains("mdx-viewport-locked"))return;
 const from=e.target;
 if(!from?.closest?.(".game-main"))return;
 // Preserve native slider drag gestures and platform select pickers.
 if(from.closest('input[type="range"],input[type="color"],select,textarea,canvas,#opsTabs'))return;
 if(e.cancelable)e.preventDefault();
}
function lockScrollPosition(e){
 if(!D.body.classList.contains("mdx-viewport-locked")||!e.target?.closest?.(".game-main"))return;
 const node=e.target;
 if(node.scrollTop)node.scrollTop=0;
}
function init(){
 D.addEventListener("touchmove",blockScroll,{passive:false,capture:true});
 D.addEventListener("wheel",blockScroll,{passive:false,capture:true});
 D.addEventListener("scroll",lockScrollPosition,{passive:true,capture:true});
 W.addEventListener("resize",()=>enter(active),{passive:true});
 W.visualViewport?.addEventListener("resize",schedule,{passive:true});
 const current=$(".game-view.active");
 if(current)enter(current.id.slice(5));
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",init,{once:true});else init();
W.MDXViewport=Object.freeze({enter,fit,schedule,getDiagnostics:()=>lastFit});
})();