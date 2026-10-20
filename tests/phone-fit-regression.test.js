"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base=path.resolve(__dirname,".."),read=name=>fs.readFileSync(path.join(base,name),"utf8");
test("engine and car workbenches retain original tabs, not a numbered pager",()=>{
 const g=read("game.js"),html=read("index.html"),fit=read("phone-fit.css");
 assert.match(g,/ENGINE_TABS\.map/);
 assert.match(g,/VEHICLE_TABS\.map/);
 assert.match(read("viewport-fit.js"),/main\.classList\.remove\("builder-scrollable"\)/);
 assert.match(g,/MDXViewport\?\.schedule/);
 assert.match(read("viewport-fit.js"),/function fitNode\(host,mode\)/);
 assert.match(fit,/\.game-main\.builder-no-scroll #view-engine\.active/);
 assert.match(fit,/\.game-main\.builder-no-scroll #view-vehicle\.active/);
 assert.match(fit,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(html,/mobile-cleanroom|mdOpsSelect|md-pagebar|data-md-page/);
 assert.ok(!fs.existsSync(path.join(base,"mobile-cleanroom.js")));
});
test("operations use original clickable tabs; never select dropdown",()=>{
 const g=read("game.js"),html=read("index.html"),fit=read("phone-fit.css");
 assert.match(g,/data-opstab=/);
 assert.match(html,/id="opsTabs"/);
 assert.doesNotMatch(fit,/#opsTabs button/);
 assert.doesNotMatch(fit,/md-ops-chooser|mdOpsSelect|mdProductsChooser/);
 assert.doesNotMatch(fit,/\.game-main\.mdx-ops-fit/);
});
test("mobile controls never provide a vertically scrollable main builder; whole control panel shrinks to fit",()=>{
 const fit=read("phone-fit.css"),g=read("game.js");
 assert.match(fit,/overscroll-behavior:none!important/);
 assert.match(fit,/overflow-y:hidden!important/);
 assert.match(fit,/grid-template-rows:100px minmax\(0,1fr\)/);
 assert.match(read("viewport-fit.js"),/host\.style\.setProperty\("width"/);
 assert.match(read("viewport-fit.js"),/const full=test\(1\)/);
});
test("advanced chassis is hidden by default but can open from the original dedicated button",()=>{
 const ui=read("design-dynamics-ui.js"),fit=read("phone-fit.css"),html=read("index.html");
 assert.match(ui,/root\.hidden=true;document\.body\.append\(root\)/);
 assert.match(ui,/el\.hidden=false/);
 assert.match(ui,/root\.hidden=true/);
 assert.match(html,/id="vehicleChassisOpen"/);
 assert.match(fit,/#md-design-dynamics\[hidden\]/);
 assert.match(ui,/open:openLab,close:closeLab/);
});
test("engine load calculations remain; report is optional and does not modify draft",()=>{
 const js=read("phone-fit.js"),g=read("game.js"),fit=read("phone-fit.css");
 assert.match(g,/MDXPowertrainEnvelope\?\.render\?\.\(\$\("engineEnvelope"\)/);
 assert.match(js,/placeholder=D\.createComment/);
 assert.match(js,/dialog\.hidden=true/);
 assert.match(js,/box\.append\(envelope\)/);
 assert.match(fit,/\.mdx-report-modal\[hidden\]/);
});
test("no fixed tools obscure builders and spinner respects hidden, existing device saves remain",()=>{
 const css=read("phone-fit.css"),sw=read("service-worker.js"),html=read("index.html");
 assert.match(css,/\.md-loading-feedback\[hidden\]/);
 assert.match(css,/#md-global-tools\{display:none!important\}/);
 assert.match(sw,/DEVICE_SAVE_CACHE="technology-dynasty-device-save-v1"/);
 assert.match(sw,/technology-dynasty-initial-reskin-v2/);
 for(const asset of ["phone-fit.js","phone-fit.css"]) {assert.ok(sw.includes('"/'+asset+'"'));assert.ok(html.includes("/"+asset+"?build="));}
});
