const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const game=fs.readFileSync(path.join(root,"game.js"),"utf8");
const css=fs.readFileSync(path.join(root,"style.css"),"utf8");

test("Products dropdown state survives live simulation rerenders",()=>{
 assert.match(game,/const openProductCards=new Set\(\)/);
 assert.match(game,/function captureOpenProductDetails\(\)/);
 assert.match(game,/function restorePersistentProductDetails\(\)/);
 assert.match(game,/function renderLibrary\(\)\{\s*captureOpenProductDetails\(\);/);
 assert.match(game,/restorePersistentProductDetails\(\);\s*renderLibraryCatalogPreviews\(\);/);
 assert.match(game,/function renderLibraryCatalogPreviews\(root=document\)/);
});

test("phone ENG and CAR builders lock the outer page and fit the workbench",()=>{
 assert.match(game,/classList\.toggle\("builder-no-scroll",name==="engine"\|\|name==="vehicle"\)/);
 assert.match(game,/function fitEngineeringWorkbench\(\)/);
 assert.match(game,/function renderEngine\(full\)\{[^\n]*fitEngineeringWorkbench\(\);\}/);
 assert.match(game,/function renderVehicle\(full\)\{[^\n]*fitEngineeringWorkbench\(\);\}/);
 assert.match(css,/STABILITY PASS V5 — persistent Products details \+ no-scroll phone ENG\/CAR workbench/);
 assert.match(css,/\.game-main\.builder-no-scroll\{[\s\S]*?overflow:hidden!important;/);
 assert.match(css,/#engineTabs\{grid-template-columns:repeat\(8,minmax\(0,1fr\)\)!important\}/);
 assert.match(css,/#vehicleTabs\{grid-template-columns:repeat\(9,minmax\(0,1fr\)\)!important\}/);
 assert.match(css,/\.game-main\.builder-no-scroll #view-engine\.active::after,[\s\S]*?content:none!important;/);
});
