/* Motor Dynasty - accessible release workbench, never starts a replacement game. */
(()=>{
"use strict";
const W=window,D=document;
const BUILD="ENGINEERING UPDATE · OCT 2026";
const count=(items)=>Array.isArray(items)?items.length:0;
let host=null;
function ensure(){
 if(host?.isConnected)return host;
 const home=D.querySelector("#view-home .phase3-hq");
 const hero=home?.querySelector(".phase3-hq-hero");
 if(!hero)return null;
 host=D.createElement("section");
 host.id="mdEngineeringAccess";
 host.className="md-engineering-access";
 host.setAttribute("aria-label","Motor Dynasty active engineering workbenches");
 host.innerHTML='<div class="md-access-head"><div><span class="md-access-eyebrow">WORKBENCHES · LIVE GAME SYSTEMS</span><h3>Engineering floor</h3><p>Open the real designers and operating tools directly. No new company or save required.</p></div><span class="md-access-version">'+BUILD+'</span></div>'+
 '<div class="md-access-grid">'+
 '<button type="button" data-md-workbench="engine"><span class="md-access-icon">01</span><b>ENGINE LAB</b><small>Physical validation, funded R&D and dyno</small><strong id="md-access-engines">0 ENGINES</strong></button>'+
 '<button type="button" data-md-workbench="design"><span class="md-access-icon">02</span><b>BODY + CHASSIS</b><small>Open full-screen vehicle design and dynamics</small><strong>OPEN DESIGN LAB →</strong></button>'+
 '<button type="button" data-md-workbench="visual"><span class="md-access-icon">03</span><b>VEHICLE VISUAL STUDIO</b><small>Inspect released cars and change generations</small><strong id="md-access-visual">REQUIRES A RELEASED CAR</strong></button>'+
 '<button type="button" data-md-workbench="models"><span class="md-access-icon">04</span><b>MODEL LIFECYCLE</b><small>Facelifts, editions, restarts and tooling</small><strong id="md-access-models">OPEN OPERATIONS →</strong></button>'+
 '</div><p class="md-access-feedback" id="md-access-feedback" aria-live="polite">The same company and saved game continue in every workbench.</p>';
 hero.insertAdjacentElement("afterend",host);
 host.addEventListener("click",onSelect);
 return host;
}
function feedback(message){
 const slot=ensure()?.querySelector("#md-access-feedback");
 if(slot)slot.textContent=message;
}
function render(state){
 const root=ensure();if(!root)return;
 const engines=count(state?.engines),vehicles=count(state?.vehicles);
 const e=root.querySelector("#md-access-engines"),v=root.querySelector("#md-access-visual"),m=root.querySelector("#md-access-models");
 if(e)e.textContent=engines+" RELEASED ENGINE"+(engines===1?"":"S");
 if(v)v.textContent=vehicles?vehicles+" MODEL"+(vehicles===1?"":"S")+" · OPEN 3D →":"RELEASE A VEHICLE FIRST";
 if(m)m.textContent=vehicles?"MANAGE "+vehicles+" MODEL"+(vehicles===1?"":"S")+" →":"START YOUR FIRST CAR →";
 root.dataset.engines=String(engines);root.dataset.vehicles=String(vehicles);
}
function navigate(view,tab){
 if(typeof W.MDXGame?.navigate!=="function"){feedback("Finish loading or continue your company to open the workbench.");return false;}
 W.MDXGame.navigate(view,tab);return true;
}
function onSelect(e){
 const action=e.target.closest("[data-md-workbench]")?.dataset.mdWorkbench;
 if(!action)return;
 const state=W.MDXGame?.getState?.();
 if(!state){feedback("Continue or found a company first. Your saved company will not be replaced.");return;}
 if(action==="engine"){navigate("engine");return;}
 if(action==="design"){
  if(navigate("vehicle"))W.MDXDesignDynamicsUI?.open?.("body");
  return;
 }
 if(action==="models"){
  navigate(count(state.vehicles)?"library":"vehicle","products");
  return;
 }
 if(action==="visual"){
  const car=(state.vehicles||[]).find(v=>v?.id);
  if(!car){feedback("Visual Studio edits released vehicles. First authorize and release a car in Vehicle Studio.");navigate("vehicle");return;}
  if(!navigate("library","products"))return;
  W.requestAnimationFrame(()=>{
   const target=[...D.querySelectorAll("#opsProducts [data-vs-open]")].find(b=>String(b.dataset.vsOpen)===String(car.id));
   if(target)target.click();
   else feedback("Open the released model in Operations > Products and select Vehicle Visual Studio.");
  });
 }
}
async function refreshBuild(){
 const button=D.querySelector("#mdCheckBuild");
 if(button)button.disabled=true;
 try{
  if(W.MDXGame?.getState?.())await Promise.resolve(W.MDXGame.save?.());
  const registration=await W.navigator.serviceWorker?.getRegistration?.();
  await registration?.update?.();
  W.location.reload();
 }catch(err){
  if(button)button.disabled=false;
  feedback("Could not refresh automatically. Reopen the game in Safari while connected to the internet.");
 }
}
function init(){
 ensure();
 D.querySelector("#mdCheckBuild")?.addEventListener("click",refreshBuild);
 render(W.MDXGame?.getState?.());
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",init,{once:true});else init();
W.MDXEngineeringAccess=Object.freeze({render,refreshBuild,build:BUILD});
})();