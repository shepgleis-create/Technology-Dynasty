(() => {
"use strict";

const priorHost=(window.MDXNative&&typeof window.MDXNative==="object")?window.MDXNative:{};
const webkitHandler=window.webkit?.messageHandlers?.MDXNative||null;
const nativeInjected=priorHost.isNativeApp===true||typeof priorHost.platform==="string"||!!webkitHandler;
const HAPTIC_TYPES=Object.freeze({
  selection:"selection",
  confirmationLight:"light",
  commitmentMedium:"medium",
  success:"success",
  warning:"warning",
  error:"error"
});
const activityPreview=new Map();

function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0));}
function safeString(v,max=160){return String(v??"").slice(0,max);}
function callHost(method,payload){
  try{
    if(typeof priorHost[method]==="function") return priorHost[method](payload);
    if(webkitHandler&&typeof webkitHandler.postMessage==="function"){
      webkitHandler.postMessage({method,payload});
      return {queued:true};
    }
  }catch(error){
    window.dispatchEvent(new CustomEvent("mdx:native-error",{detail:{method,error:String(error?.message||error)}}));
  }
  return null;
}
function normalizeActivityPayload(input={}){
  const now=Date.now(),startRaw=Date.parse(input.start||""),endRaw=Date.parse(input.end||"");
  const related=Array.isArray(input.relatedObjectIds)?input.relatedObjectIds.map(x=>safeString(x,120)).filter(Boolean).slice(0,12):[];
  return{
    activityId:safeString(input.activityId||input.id||("activity_"+now),120),
    type:safeString(input.type||"project",48),
    title:safeString(input.title||"Motor Dynasty",120),
    subtitle:safeString(input.subtitle||"",180),
    progress:clamp(input.progress,0,1),
    start:Number.isFinite(startRaw)?new Date(startRaw).toISOString():null,
    end:Number.isFinite(endRaw)?new Date(endRaw).toISOString():null,
    status:safeString(input.status||"active",40),
    deepLink:safeString(input.deepLink||"",220),
    relatedObjectIds:related
  };
}
function activityRepresentations(payload){
  const p=normalizeActivityPayload(payload),pct=Math.round(p.progress*100);
  return{
    minimal:{activityId:p.activityId,label:pct+"%",progress:p.progress},
    compact:{activityId:p.activityId,title:p.title,progress:p.progress,status:p.status},
    expanded:{...p,progressLabel:pct+"%"}
  };
}
function developerEnabled(){
  try{
    const query=new URLSearchParams(location.search);
    return query.get("mdxdev")==="1"||localStorage.getItem("mdxDeveloperMode")==="1";
  }catch{return false;}
}
function cssInset(name){
  try{
    const probe=document.createElement("div");
    probe.style.cssText="position:fixed;visibility:hidden;padding-top:var("+name+");";
    document.body.appendChild(probe);
    const value=parseFloat(getComputedStyle(probe).paddingTop)||0;
    probe.remove();return value;
  }catch{return 0;}
}
const DEV={enabled:developerEnabled(),preset:"auto",orientation:"portrait",overlay:false};

function setSafeAreaDebug(enabled,preset=DEV.preset,orientation=DEV.orientation){
  DEV.overlay=!!enabled;DEV.preset=safeString(preset||"auto",32);DEV.orientation=orientation==="landscape"?"landscape":"portrait";
  document.documentElement.dataset.mdxSafePreset=DEV.preset;
  document.documentElement.dataset.mdxSafeOrientation=DEV.orientation;
  const overlay=document.getElementById("mdxSafeAreaDebug");
  if(overlay)overlay.classList.toggle("active",DEV.overlay);
  renderDeveloperReadout();
  return{enabled:DEV.overlay,preset:DEV.preset,orientation:DEV.orientation};
}
function renderDeveloperReadout(){
  const box=document.getElementById("mdxAppReadinessReadout");if(!box)return;
  const insets={top:cssInset("--safe-top"),right:cssInset("--safe-right"),bottom:cssInset("--safe-bottom"),left:cssInset("--safe-left")};
  box.innerHTML="<div><span>PLATFORM</span><b>"+(api.isNativeApp?safeString(api.platform||"native",30).toUpperCase():"WEB")+"</b></div>"+
    "<div><span>NATIVE BRIDGE</span><b>"+(api.isNativeApp?"AVAILABLE":"WEB FALLBACK")+"</b></div>"+
    "<div><span>SAFE AREA</span><b>"+Math.round(insets.top)+" / "+Math.round(insets.right)+" / "+Math.round(insets.bottom)+" / "+Math.round(insets.left)+" px</b></div>"+
    "<div><span>LIVE ACTIVITY</span><b>"+(api.capabilities.liveActivities?"NATIVE":"PREVIEW ONLY")+"</b></div>";
  const perfRoot=document.getElementById("mdxPerfReadout"),perf=window.MDXPerf?.snapshot?.()||{};if(perfRoot){const keys=["startupMs","saveBytes","monthCloseMs","aiIndustryMonthMs","archiveRenderMs","chartRenderMs"],rows=keys.map(k=>perf[k]).filter(Boolean);perfRoot.innerHTML=rows.length?rows.map(m=>{const f=window.MDXPerf?.formatMetric?.(m)||{};return"<div><span>"+m.name.replaceAll("Ms","").replaceAll(/([A-Z])/g," $1").toUpperCase()+"</span><b>"+(f.recent||"—")+"</b><small>MAX "+(f.max||"—")+" • AVG "+(f.avg||"—")+" • N "+m.count+"</small></div>";}).join(""):"<div><span>PERFORMANCE</span><b>WAITING FOR SAMPLES</b><small>Advance or render the simulation to collect timings.</small></div>";}
}
function ensureDeveloperUI(){
  if(!DEV.enabled||document.getElementById("mdxAppReadinessPanel"))return;
  const overlay=document.createElement("div");overlay.id="mdxSafeAreaDebug";overlay.innerHTML="<i class='safe-top'></i><i class='safe-right'></i><i class='safe-bottom'></i><i class='safe-left'></i><i class='dynamic-island-preview'></i>";document.body.appendChild(overlay);
  const panel=document.createElement("aside");panel.id="mdxAppReadinessPanel";panel.innerHTML=
   "<div class='mdx-dev-head'><b>MDX APP READINESS</b><button id='mdxDevClose'>×</button></div>"+
   "<div id='mdxAppReadinessReadout' class='mdx-dev-readout'></div><div class='mdx-dev-section-label'>PERFORMANCE</div><div id='mdxPerfReadout' class='mdx-perf-readout'></div>"+
   "<label>SAFE-AREA PRESET<select id='mdxSafePreset'><option value='auto'>AUTO / CURRENT</option><option value='compact'>COMPACT iPHONE</option><option value='pro'>iPHONE PRO</option><option value='promax'>PRO MAX</option><option value='ipad'>iPAD</option></select></label>"+
   "<label>ORIENTATION<select id='mdxSafeOrientation'><option value='portrait'>PORTRAIT</option><option value='landscape'>LANDSCAPE</option></select></label>"+
   "<div class='mdx-dev-actions'><button id='mdxToggleSafe'>SAFE OVERLAY</button><button id='mdxPreviewActivity'>ACTIVITY PREVIEW</button></div>"+
   "<div id='mdxLiveActivityPreview' class='mdx-live-preview'></div>";
  document.body.appendChild(panel);
  panel.querySelector("#mdxDevClose")?.addEventListener("click",()=>panel.classList.toggle("collapsed"));
  panel.querySelector("#mdxSafePreset")?.addEventListener("change",e=>setSafeAreaDebug(DEV.overlay,e.target.value,DEV.orientation));
  panel.querySelector("#mdxSafeOrientation")?.addEventListener("change",e=>setSafeAreaDebug(DEV.overlay,DEV.preset,e.target.value));
  panel.querySelector("#mdxToggleSafe")?.addEventListener("click",()=>setSafeAreaDebug(!DEV.overlay,DEV.preset,DEV.orientation));
  panel.querySelector("#mdxPreviewActivity")?.addEventListener("click",()=>{
    const sample=normalizeActivityPayload({activityId:"dev_program",type:"vehicle_program",title:"Vehicle Program",subtitle:"Validation • developer preview",progress:.64,status:"active",deepLink:"#/program/dev_program",relatedObjectIds:["dev_program"]});
    activityPreview.set(sample.activityId,sample);renderActivityPreview(sample);
  });
  renderDeveloperReadout();setInterval(()=>{if(document.visibilityState!=="hidden")renderDeveloperReadout();},1500);
}
function renderActivityPreview(payload){
  if(!DEV.enabled)return;const root=document.getElementById("mdxLiveActivityPreview");if(!root)return;
  const v=activityRepresentations(payload);
  root.innerHTML="<div class='live-min'><span>MINIMAL</span><b>"+v.minimal.label+"</b></div>"+
    "<div class='live-compact'><span>COMPACT</span><b>"+v.compact.title+"</b><i style='width:"+Math.round(v.compact.progress*100)+"%'></i></div>"+
    "<div class='live-expanded'><span>EXPANDED</span><b>"+v.expanded.title+"</b><small>"+v.expanded.subtitle+"</small><em>"+v.expanded.progressLabel+" • "+v.expanded.status.toUpperCase()+"</em></div>";
}
function receiveEvent(type,detail={}){
  const eventType=safeString(type,80);
  window.dispatchEvent(new CustomEvent("mdx:native-event",{detail:{type:eventType,...detail}}));
  window.dispatchEvent(new CustomEvent("mdx:native-"+eventType,{detail}));
  return true;
}
function haptic(kind){
  const mapped=HAPTIC_TYPES[kind]||safeString(kind,40);
  if(!api.isNativeApp||!api.capabilities.haptics)return false;
  return callHost("triggerHaptic",mapped)??false;
}
function startLiveActivity(payload){
  const p=normalizeActivityPayload(payload);activityPreview.set(p.activityId,p);if(DEV.enabled)renderActivityPreview(p);
  if(!api.isNativeApp||!api.capabilities.liveActivities)return{native:false,previewOnly:true,payload:p};
  return callHost("startLiveActivity",p)??{native:true,queued:false,payload:p};
}
function updateLiveActivity(payload){
  const p=normalizeActivityPayload(payload),prior=activityPreview.get(p.activityId)||{};const merged=normalizeActivityPayload({...prior,...p});activityPreview.set(merged.activityId,merged);if(DEV.enabled)renderActivityPreview(merged);
  if(!api.isNativeApp||!api.capabilities.liveActivities)return{native:false,previewOnly:true,payload:merged};
  return callHost("updateLiveActivity",merged)??{native:true,queued:false,payload:merged};
}
function endLiveActivity(input){
  const id=safeString(typeof input==="string"?input:input?.activityId,120);const prior=activityPreview.get(id)||normalizeActivityPayload({activityId:id,status:"ended"});const ended={...prior,status:"ended",progress:1};activityPreview.delete(id);if(DEV.enabled)renderActivityPreview(ended);
  if(!api.isNativeApp||!api.capabilities.liveActivities)return{native:false,previewOnly:true,payload:ended};
  return callHost("endLiveActivity",ended)??{native:true,queued:false,payload:ended};
}
function runSelfTests(){
  const failures=[],check=(ok,msg)=>{if(!ok)failures.push(msg);};
  const p=normalizeActivityPayload({activityId:"t",title:"T",progress:2,relatedObjectIds:["a","b"]});check(p.progress===1,"activity progress not clamped");check(p.relatedObjectIds.length===2,"activity related IDs lost");
  const reps=activityRepresentations({...p,progress:.42});check(reps.minimal.label==="42%"&&reps.expanded.progressLabel==="42%","activity representations disagree");
  const localPreview=new Map(),sample=normalizeActivityPayload({activityId:"selftest",progress:.1});localPreview.set(sample.activityId,sample);check(localPreview.get("selftest")?.progress===.1,"activity preview state failed");localPreview.delete("selftest");check(localPreview.size===0,"activity preview did not end cleanly");
  check(HAPTIC_TYPES.selection==="selection"&&HAPTIC_TYPES.commitmentMedium==="medium"&&HAPTIC_TYPES.error==="error","haptic taxonomy changed unexpectedly");
  check(typeof api.isNativeApp==="boolean"&&typeof api.platform==="string","bridge identity contract invalid");
  return{ok:failures.length===0,failures};
}
const capabilities=Object.freeze({
  haptics:!!(priorHost.triggerHaptic||webkitHandler),
  nativeStorage:!!(priorHost.saveLocal&&priorHost.loadLocal),
  sharing:!!(priorHost.share||navigator.share),
  liveActivities:!!(priorHost.startLiveActivity||webkitHandler),
  review:!!priorHost.requestReview,
  purchases:!!(priorHost.purchaseEntitlement&&priorHost.restorePurchases),
  settings:!!priorHost.openSettings
});
const api={
  isNativeApp:nativeInjected,
  platform:safeString(priorHost.platform||(nativeInjected?"ios":"web"),24),
  capabilities,
  triggerHaptic:haptic,
  saveLocal:state=>api.isNativeApp&&capabilities.nativeStorage?(callHost("saveLocal",state)??false):false,
  loadLocal:()=>api.isNativeApp&&capabilities.nativeStorage?(callHost("loadLocal",null)??null):null,
  deleteLocal:()=>api.isNativeApp&&typeof priorHost.deleteLocal==="function"?(callHost("deleteLocal",null)??false):false,
  listSlots:()=>api.isNativeApp&&typeof priorHost.listSlots==="function"?(callHost("listSlots",null)??[]):[],
  getStorageMetadata:()=>api.isNativeApp&&typeof priorHost.getStorageMetadata==="function"?(callHost("getStorageMetadata",null)??null):null,
  share:payload=>{
    if(api.isNativeApp&&priorHost.share)return callHost("share",payload);
    if(navigator.share)return navigator.share(payload).catch(()=>false);
    return false;
  },
  startLiveActivity,updateLiveActivity,endLiveActivity,
  requestReview:()=>api.isNativeApp&&capabilities.review?(callHost("requestReview",null)??false):false,
  purchaseEntitlement:product=>api.isNativeApp&&capabilities.purchases?(callHost("purchaseEntitlement",product)??false):false,
  restorePurchases:()=>api.isNativeApp&&capabilities.purchases?(callHost("restorePurchases",null)??false):false,
  openSettings:()=>api.isNativeApp&&capabilities.settings?(callHost("openSettings",null)??false):false,
  receiveEvent,
  normalizeActivityPayload,
  activityRepresentations
};
window.MDXNative=api;
window.MDXHaptics={types:HAPTIC_TYPES,trigger:haptic};
window.MDXAppReadiness={developer:DEV,setSafeAreaDebug,normalizeActivityPayload,activityRepresentations,getActivityPreview:id=>activityPreview.get(id)||null,runSelfTests};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureDeveloperUI,{once:true});else ensureDeveloperUI();
})();