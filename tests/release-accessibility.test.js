/* Prove released features are actually exposed to iPhone players, not only present as scripts. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const source=p=>fs.readFileSync(path.join(root,p),"utf8");
test("a visible build marker and safe app update action exist on the title screen",()=>{
 const html=source("index.html"),client=source("engineering-access.js");
 assert.match(html,/id="mdCheckBuild"/);
 assert.match(html,/ENGINEERING UPDATE/);
 assert.match(client,/MDXGame\.save\?\.\(\)/);
 assert.match(client,/registration\?\.update/);
 assert.match(client,/location\.reload\(\)/);
});
test("HQ opens real engineering workbenches, not fake standalone views",()=>{
 const html=source("index.html"),module=source("engineering-access.js"),game=source("game.js");
 assert.match(html,/\/engineering-access\.js/);
 assert.match(game,/MDXEngineeringAccess\?\.render\?\.\(state\)/);
 for(const action of ["engine","design","visual","models"])assert.match(module,new RegExp('data-md-workbench="'+action+'"'));
 assert.match(module,/MDXGame\.navigate/);
 assert.match(module,/\[data-vs-open\]/);
 assert.match(module,/MDXDesignDynamicsUI\?\.open/);
});
test("the real body-and-chassis lab can escape the clipped iPhone workbench",()=>{
 const html=source("index.html"),ui=source("design-dynamics-ui.js"),css=source("engineering-access.css");
 assert.match(html,/id="vehicleChassisOpen"/);
 assert.match(ui,/document\.body\.append\(el,exitButton\)/);
 assert.match(ui,/open:openLab,close:closeLab/);
 assert.match(ui,/key==="Escape"/);
 assert.match(css,/#md-design-dynamics\.md-design-overlay/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/touch-action:pan-y!important/);
});
test("offline cache rotates, carries actual release assets, and retains durable save cache",()=>{
 const sw=source("service-worker.js"),pwa=source("pwa.js");
 assert.match(sw,/technology-dynasty-initial-reskin-v2/);
 assert.match(sw,/DEVICE_SAVE_CACHE="technology-dynasty-device-save-v1"/);
 assert.match(pwa,/viewport-metric-20261019-v3/);
 for(const asset of ["engineering-access.js","engineering-access.css","design-dynamics.js","design-dynamics-ui.js","powertrain-envelope.js","transmission-envelope.js","vehicle-visual-studio.js"]){
  assert.ok(sw.includes('"/'+asset+'"'),asset+" must be available offline");
  assert.ok(fs.existsSync(path.join(root,asset)),asset+" must exist");
 }
});
