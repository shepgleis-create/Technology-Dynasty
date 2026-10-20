(() => {
"use strict";
if(!("serviceWorker" in navigator))return;
// Taking control must never reload an unsaved company-creation or engineering flow.
navigator.serviceWorker.addEventListener("controllerchange",()=>{
 window.MDXGame?.save?.();
 window.dispatchEvent(new Event("mdx:update-ready"));
});
window.addEventListener("load",async()=>{
 try{
  const storage=navigator.storage;if(storage){const before=await storage.persisted?.().catch(()=>false),granted=before||await storage.persist?.().catch(()=>false);window.__MDX_PERSISTENT_STORAGE__={supported:true,granted:!!granted};}
  else window.__MDX_PERSISTENT_STORAGE__={supported:false,granted:false};
 }catch{window.__MDX_PERSISTENT_STORAGE__={supported:false,granted:false};}
 navigator.serviceWorker.register("/service-worker.js?build=viewport-metric-20261019-v3").then(reg=>reg.update()).catch(()=>{});
});
})();


