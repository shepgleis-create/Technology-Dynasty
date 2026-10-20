(() => {
"use strict";
const TYPES=new Set(["company","vehicle","engine","transmission","factory","contract","executive","news","program"]);
let resolver=null,pending=null,suppress=false;

function clean(v,max=180){return String(v??"").trim().slice(0,max);}
function parse(input){
  if(input&&typeof input==="object"&&input.type)return normalize(input);
  let raw=clean(input||location.hash||"",600);
  if(raw.startsWith("#"))raw=raw.slice(1);
  if(raw.startsWith("/"))raw=raw.slice(1);
  if(!raw)return null;
  const q=raw.indexOf("?"),path=q>=0?raw.slice(0,q):raw,queryRaw=q>=0?raw.slice(q+1):"",parts=path.split("/").filter(Boolean);
  if(parts.length<2)return null;
  const type=clean(decodeURIComponent(parts[0]),40),id=clean(decodeURIComponent(parts.slice(1).join("/")),180);
  if(!TYPES.has(type)||!id)return null;
  const params={};for(const [k,v] of new URLSearchParams(queryRaw))params[clean(k,60)]=clean(v,180);
  return{type,id,params};
}
function normalize(route){
  const type=clean(route?.type,40),id=clean(route?.id,180),params=route?.params&&typeof route.params==="object"?Object.fromEntries(Object.entries(route.params).map(([k,v])=>[clean(k,60),clean(v,180)])):{};
  return TYPES.has(type)&&id?{type,id,params}:null;
}
function build(type,id,params={}){
  const r=normalize({type,id,params});if(!r)return"";
  const q=new URLSearchParams(r.params).toString();
  return"#/"+encodeURIComponent(r.type)+"/"+encodeURIComponent(r.id)+(q?"?"+q:"");
}
function dispatch(route){
  const r=normalize(route);if(!r)return false;
  if(!resolver){pending=r;return false;}
  try{
    const result=resolver(r);
    if(result&&typeof result.then==="function"){result.then(ok=>{if(ok)pending=null;else pending=r;}).catch(()=>{pending=r;});return true;}
    if(result){pending=null;return true;}
    pending=r;return false;
  }catch{pending=r;return false;}
}
function navigate(type,id,options={}){
  const hash=build(type,id,options.params||{});if(!hash)return false;
  const route=parse(hash);
  if(options.replace&&history?.replaceState){suppress=true;history.replaceState(null,"",hash);suppress=false;return dispatch(route);}
  if(location.hash===hash)return dispatch(route);
  location.hash=hash;return true;
}
function registerResolver(fn){resolver=typeof fn==="function"?fn:null;if(resolver&&(pending||parse(location.hash)))queueMicrotask(()=>resolvePending());}
function resolvePending(){const r=pending||parse(location.hash);return r?dispatch(r):false;}
function current(){return parse(location.hash);}
function clear(options={}){pending=null;if(!location.hash)return;if(options.replace&&history?.replaceState)history.replaceState(null,"",location.pathname+location.search);else location.hash="";}
function runSelfTests(){
  const failures=[],check=(v,m)=>{if(!v)failures.push(m);};
  const a=parse("#/vehicle/car_1?tab=history");check(a?.type==="vehicle"&&a.id==="car_1"&&a.params.tab==="history","route parse failed");
  check(build("company","maker a",{tab:"financials"})==="#/company/maker%20a?tab=financials","route build failed");
  check(parse("#/unknown/x")===null&&build("unknown","x")==="","unknown route accepted");
  const encoded=parse(build("program","id/with/slash"));check(encoded?.id==="id/with/slash","encoded route ID did not round-trip");
  return{ok:failures.length===0,failures};
}
window.addEventListener("hashchange",()=>{if(!suppress)dispatch(parse(location.hash));});
window.MDXRouter={types:[...TYPES],parse,build,navigate,current,clear,registerResolver,resolvePending,runSelfTests};
const initial=parse(location.hash);if(initial)pending=initial;
})();