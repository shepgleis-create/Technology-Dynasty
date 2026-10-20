/* Motor Dynasty — interactive vehicle visual studio, 801–900. */
(()=>{
"use strict";
const W=window,E=()=>W.MDXVisualEngineering;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=x=>"$"+Math.round(Number(x)||0).toLocaleString("en-US");
const cache=new Map();let hits=0,misses=0;
function cached(key,producer){
 if(cache.has(key)){const v=cache.get(key);cache.delete(key);cache.set(key,v);hits++;return v;}
 misses++;const value=producer();if(value){cache.set(key,value);if(cache.size>24)cache.delete(cache.keys().next().value);}return value;
}
function cacheStats(){return{items:cache.size,hits,misses,limit:24};}
function controls(){return'<div id="visual-studio-overlay" class="vs-overlay" hidden><section class="vs-dialog" role="dialog" aria-modal="true" aria-label="Vehicle Visual Studio">'+
 '<header class="vs-head"><div><span class="eyebrow">MOTOR DYNASTY · VISUAL ENGINEERING · CHECKLIST 801–900</span><h2 id="vs-name">Visual Studio</h2><small id="vs-status"></small></div><button type="button" id="vs-close" aria-label="Close visual studio">CLOSE</button></header>'+
 '<div class="vs-content"><nav class="vs-cameras" id="vs-cameras" aria-label="Camera views"></nav>'+
 '<div class="vs-stage"><canvas id="vs-canvas" aria-label="Procedural interactive 3D vehicle model"></canvas><div id="vs-scene-caption"></div></div>'+
 '<div class="vs-compare-options" id="vs-comparison-options" hidden><label>COMPARISON SOURCE<select id="vs-compare-source"><option value="production">Current production vehicle</option><option value="previous">Archived previous generation</option></select></label></div><div id="vs-comparison" class="vs-comparison" hidden><div><b>BEFORE / ARCHIVED</b><canvas id="vs-before"></canvas></div><div><b>PROPOSED</b><canvas id="vs-after"></canvas></div></div>'+
 '<div class="vs-viewtools"><label>SCENE<select id="vs-scene"></select></label><label>INSPECT<select id="vs-layer"></select></label><label>ZOOM<input id="vs-zoom" type="range" min=".65" max="1.6" step=".05" value="1"></label><label>HISTORIC STYLING<select id="vs-era"><option value="0">Actual model year</option><option value="1940">1940s</option><option value="1950">1950s</option><option value="1960">1960s</option><option value="1970">1970s</option><option value="1980">1980s</option><option value="1990">1990s</option><option value="2000">2000s</option><option value="2010">2010s</option><option value="2020">2020s</option></select></label><button type="button" class="btn secondary" id="vs-toggle-compare">COMPARE</button></div>'+
 '<div class="vs-section-title"><h3>Real vehicle design changes</h3><small>Preview now · develop through the existing factory and model programs</small></div>'+
 '<div class="vs-parts" id="vs-parts"></div>'+
 '<div class="vs-figures"><div><small>EST. UNIT COST</small><b id="vs-cost"></b></div><div><small>R&D ADDITION</small><b id="vs-research"></b></div>'+
 '<div><small>EXTRA DAYS</small><b id="vs-days"></b></div><div><small>MSRP GUIDANCE</small><b id="vs-msrp"></b></div></div>'+
 '<p id="vs-warning" class="vs-warning"></p>'+
 '<div class="vs-commands"><button type="button" class="btn secondary" id="vs-director">AI DESIGN ADVICE</button><button type="button" class="btn hero" id="vs-authorize">FUND VISUAL FACELIFT</button>'+
 '<button type="button" class="btn secondary" id="vs-export">EXPORT RENDER</button><button type="button" class="btn secondary" id="vs-brochure">BROCHURE ART</button><button type="button" class="btn secondary" id="vs-thumbnail">THUMBNAIL</button>'+
 '<button type="button" class="btn secondary" id="vs-reset">RESTORE DRAFT</button></div><div id="vs-audit" class="vs-audit"></div>'+
 '<p class="vs-disclaimer">Interactive procedural automotive model, not photorealistic. Engine bay and undercarriage are engineering inspections. Interior is schematic. Saved model appearance changes only after the funded development program completes.</p>'+
 '</div></section></div>';}
function button(v){return'<div class="vs-entry"><button class="btn hero" type="button" data-vs-open="'+esc(v.id)+'">VEHICLE VISUAL STUDIO</button>'+
 '<small>3D cameras · paint · wheels · interior · lighting · comparison · brochure</small></div>';}
function options(choices,selected,year){
 return Object.entries(choices).map(([id,x])=>'<option value="'+esc(id)+'"'+(id===selected?' selected':'')+
 (x.year>year?' disabled':'')+'>'+esc(x.label)+(x.year>year?' · from '+x.year:'')+'</option>').join("");
}
function watch(root,state,{save=()=>{},rerender=()=>{},log=()=>{},toast=()=>{}}={}){
 if(!root||!W.document||!E())return;
 const dialog=root.querySelector("#visual-studio-overlay");if(!dialog)return;
 let vehicle=null;const q=s=>dialog.querySelector(s),actual=()=>vehicle;
 function settings(){return E().viewSettings(actual()||{});}
 function publishSettings(field,value){
  if(!vehicle)return;vehicle.visualStudioView={...settings(),[field]:value};save();draw();
 }
 function chooseControls(){
  const v=actual();if(!v)return;
  const items=E().variants,selected=E().current(v);
  const labels={paint:"EXTERIOR PAINT",wheels:"WHEEL DESIGN",cabin:"INTERIOR FINISH",light:"HEADLIGHT DESIGN",grille:"GRILLE & FASCIA"};
  q("#vs-parts").innerHTML=Object.entries(items).map(([group,data])=>'<label class="vs-part"><span>'+labels[group]+'</span>'+
  '<select data-vs-choice="'+group+'">'+options(data,selected[group],Number(state.year))+'</select></label>').join("");
  q("#vs-parts").querySelectorAll("[data-vs-choice]").forEach(el=>el.addEventListener("change",()=>{
   v.visualStudioDraft={...E().current(v),[el.dataset.vsChoice]:el.value};save();draw();
  }));
 }
 function draw(){
  const v=actual();if(!v)return;
  const st=settings(),before=q("#vs-before"),after=q("#vs-after"),quote=E().quote(state,v);
  E().render(q("#vs-canvas"),state,v,st,true);
  q("#vs-comparison").hidden=!st.compare;q("#vs-comparison-options").hidden=!st.compare;
  if(st.compare){if(st.comparison==="previous"&&v.visualGenerations?.length)E().archivedModel(before,state,v,st);else E().render(before,state,v,st,false);E().render(after,state,v,st,true);}
  q("#vs-cameras").querySelectorAll("button").forEach(el=>el.classList.toggle("selected",el.dataset.vsView===st.view));
  q("#vs-scene-caption").textContent=E().views[st.view].toUpperCase()+" · "+E().scenes[st.scene].toUpperCase()+(st.eraYear?" · "+st.eraYear+" HISTORIC STYLING":"")+" · DRAG TO ROTATE";
  q("#vs-cost").textContent=money(quote.newUnitCost);
  q("#vs-research").textContent=money(quote.research);
  q("#vs-days").textContent=quote.days+" DAYS";
  q("#vs-msrp").textContent=money(quote.newMSRP);
  q("#vs-authorize").disabled=!quote.ready;
  q("#vs-warning").textContent=quote.blocked||quote.changes.length+" equipment changes · extra research is spent during actual vehicle program development.";
  q("#vs-audit").innerHTML=(v.visualStudioHistory||[]).slice(0,4).map(x=>'<p>'+esc(x.year+" · "+x.event+" · "+(x.details?.changes?.length||0)+" changes")+'</p>').join("");
 }
 function open(id){
  const v=(state.vehicles||[]).find(x=>String(x.id)===String(id));if(!v)return;vehicle=v;
  dialog.hidden=false;
  q("#vs-name").textContent=v.name+" · GENERATION "+(v.generation||1);
  q("#vs-status").textContent=(state.modelActions||[]).some(a=>a.vehicleId===v.id&&["active","awaiting_launch"].includes(a.status))?"DEVELOPMENT IN PROGRESS":"AVAILABLE FOR DESIGN REVIEW";
  q("#vs-cameras").innerHTML=Object.entries(E().views).map(([id,label])=>'<button type="button" data-vs-view="'+id+'">'+esc(label)+'</button>').join("");
  q("#vs-scene").innerHTML=Object.entries(E().scenes).map(([id,label])=>'<option value="'+id+'">'+esc(label)+'</option>').join("");
  q("#vs-layer").innerHTML=[["all","Full car"],["body","Bodywork"],["chassis","Underbody"],["wheels","Wheels and brakes"],["lighting","Lamps"]].map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join("");
  const st=settings();q("#vs-scene").value=st.scene;q("#vs-layer").value=st.layer;q("#vs-zoom").value=st.zoom;q("#vs-era").value=String(st.eraYear);q("#vs-compare-source").value=st.comparison;q("#vs-compare-source").querySelector('option[value="previous"]').disabled=!(v.visualGenerations?.length);
  q("#vs-cameras").querySelectorAll("[data-vs-view]").forEach(btn=>btn.addEventListener("click",()=>publishSettings("view",btn.dataset.vsView)));
  chooseControls();draw();q("#vs-close").focus();
 }
 function close(){dialog.hidden=true;vehicle=null;}
 root.querySelectorAll("[data-vs-open]").forEach(btn=>btn.addEventListener("click",()=>open(btn.dataset.vsOpen)));
 q("#vs-close").addEventListener("click",close);
 dialog.addEventListener("click",evt=>{if(evt.target===dialog)close();});
 q("#vs-scene").addEventListener("change",evt=>publishSettings("scene",evt.target.value));
 q("#vs-layer").addEventListener("change",evt=>publishSettings("layer",evt.target.value));
 q("#vs-zoom").addEventListener("input",evt=>publishSettings("zoom",Number(evt.target.value)));
 q("#vs-era").addEventListener("change",evt=>publishSettings("eraYear",Number(evt.target.value)));
 q("#vs-compare-source").addEventListener("change",evt=>publishSettings("comparison",evt.target.value));
 q("#vs-toggle-compare").addEventListener("click",()=>publishSettings("compare",!settings().compare));
 q("#vs-reset").addEventListener("click",()=>{delete vehicle.visualStudioDraft;save();chooseControls();draw();});
 q("#vs-director").addEventListener("click",()=>{
  const advice=E().suggest(state,vehicle);vehicle.visualStudioDraft=advice.draft;
  E().audit(state,vehicle,"director_proposal",advice);
  log(vehicle.name+" visual engineering: "+advice.reason);
  save();chooseControls();draw();
 });
 q("#vs-authorize").addEventListener("click",()=>{
  const summary=E().quote(state,vehicle);if(!summary.ready){toast(summary.blocked);return;}
  const fn=W.MDX?.startFacelift;if(typeof fn!=="function"){toast("Model development system unavailable");return;}
  if(!fn(state,vehicle.id,log)){toast("Unable to fund this design facelift");return;}
  E().audit(state,vehicle,"authorized_visual_facelift",{changes:summary.changes,research:summary.research,unitCost:summary.unitCost});
  save();close();rerender();
 });
 function saveImage(kind){
  if(!vehicle)return;
  const src=q("#vs-canvas");if(!src||!src.width)return;
  try{
   const key=JSON.stringify([vehicle.id,vehicle.generation,E().current(vehicle),settings(),kind]);
   const uri=cached(key,()=>{
    const target=W.document.createElement("canvas"),brochure=kind==="brochure",thumb=kind==="thumbnail";
    target.width=brochure?1200:thumb?640:src.width;
    target.height=brochure?820:thumb?420:src.height;
    const ctx=target.getContext("2d"),w=target.width,h=target.height;
    ctx.fillStyle="#0d1722";ctx.fillRect(0,0,w,h);
    const top=brochure?95:0,margin=brochure?65:0,showHeight=brochure?620:h;
    ctx.drawImage(src,margin,top,w-margin*2,showHeight);
    if(brochure){
     ctx.fillStyle="#e6f1f8";ctx.font="bold 40px system-ui";ctx.fillText(vehicle.name.toUpperCase().slice(0,40),65,62);
     ctx.fillStyle="#aac2cf";ctx.font="21px system-ui";
     ctx.fillText("MY "+(vehicle.modelYear||state.year)+"  ·  GEN "+(vehicle.generation||1)+"  ·  "+String(vehicle.design?.body||vehicle.body||"SEDAN").toUpperCase(),65,755);
     ctx.fillText("MOTOR DYNASTY  /  FACTORY PRODUCT BROCHURE",65,792);
    }
    return target.toDataURL("image/png");
   });
   const a=W.document.createElement("a");a.href=uri;a.download="motor-"+String(vehicle.name).toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+kind+".png";a.click();
   E().audit(state,vehicle,"image_export",{kind,view:settings().view,cache:cacheStats()});save();
  }catch(err){toast("This device could not export this canvas");}
 }
 q("#vs-export").addEventListener("click",()=>saveImage("render"));
 q("#vs-brochure").addEventListener("click",()=>saveImage("brochure"));
 q("#vs-thumbnail").addEventListener("click",()=>saveImage("thumbnail"));
}
W.MDXVehicleVisualStudio=Object.freeze({version:1,controls,button,watch,cacheStats});
})();
