"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("original Engine, Vehicle, and Operations tabs are kept, never rebuilt into a pager or dropdown",()=>{
 const g=read("game.js"),html=read("index.html"),v=read("viewport-fit.js");
 assert.match(g,/ENGINE_TABS\.map/);assert.match(g,/VEHICLE_TABS\.map/);
 assert.match(g,/function renderOpsTabs\(\)/);
 assert.match(g,/data-opstab/);
 assert.match(html,/id="opsTabs"/);
 assert.match(v,/\["engine","vehicle","library"\]/);
 assert.doesNotMatch(html,/mdOpsSelect|md-pagebar|data-md-page|mobile-cleanroom/);
});
test("the controller measures every currently rendered control set and solves a fitted transform",()=>{
 const v=read("viewport-fit.js");
 assert.match(v,/function fitNode\(host,mode\)/);
 assert.match(v,/host\.scrollHeight/);
 assert.match(v,/host\?\.getBoundingClientRect/);
 assert.match(v,/for\(let i=0;i<13;i\+\+\)/);
 assert.match(v,/host\.style\.setProperty\("transform","scale\("/);
 assert.match(v,/dataset\.viewportOverflow/);
 assert.match(v,/ResizeObserver/);
 assert.match(v,/MutationObserver/);
 assert.match(v,/getDiagnostics/);
});
test("all three active phone workspaces disable vertical page and nested scrolling, while keeping native selects and sliders",()=>{
 const v=read("viewport-fit.js"),css=read("viewport-fit.css");
 assert.match(css,/body\.mdx-viewport-locked \.game-main/);
 assert.match(css,/body\.mdx-builder-locked/);
 assert.match(css,/body\.mdx-operations-locked/);
 assert.match(css,/overflow-y:hidden!important/);
 assert.match(v,/if\(e\.cancelable\)e\.preventDefault\(\)/);
 assert.match(v,/input\[type="range"\]/);
 assert.match(v,/#opsTabs/);
 assert.match(css,/#engineControls/);assert.match(css,/#vehicleControls/);
 assert.match(css,/#opsProducts/);
});
test("saved companies, component simulations, and all original panels still load",()=>{
 const html=read("index.html"),g=read("game.js"),sw=read("service-worker.js");
 for(const id of ["engineControls","vehicleControls","opsTabs","opsProducts","opsExpansion","engineEnvelope","vehicleSummary"])
  assert.ok(html.includes('id="'+id+'"'),id+" missing");
 assert.match(g,/function saveEngine\(/);assert.match(g,/function saveVehicle\(/);
 assert.match(g,/window\.MDXViewport\?\.enter\?\.\(name\)/);
 assert.match(sw,/DEVICE_SAVE_CACHE="motor-dynasty-device-save-v1"/);
 assert.match(sw,/technology-dynasty-initial-reskin-v2/);
 for(const p of ["viewport-fit.js","viewport-fit.css"]){assert.ok(sw.includes('"/'+p+'"'));assert.ok(html.includes("/"+p+"?build="));}
});
test("browser workflow runs real Chromium no-scroll tests and saves screenshots",()=>{
 const pkg=JSON.parse(read("package.json")),flow=read(".github/workflows/browser-playtest.yml"),script=read("scripts/playtest-no-scroll.js");
 assert.equal(pkg.scripts["playtest:no-scroll"],"node scripts/playtest-no-scroll.js");
 assert.match(flow,/npm run playtest:no-scroll/);
 assert.match(flow,/playtest-no-scroll-output/);
 for(const size of [375,390,430])assert.match(script,new RegExp("width:"+size));
 assert.match(script,/scrollHeight/);assert.match(script,/getDiagnostics/);
 assert.match(script,/page\.screenshot/);
});
