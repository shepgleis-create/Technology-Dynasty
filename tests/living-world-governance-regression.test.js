const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

global.window=global;
global.MDX_CORE=global.MDX_CORE||{
  economicIndex:()=>1,
  economicRelativeIndex:()=>1
};
global.MD_DATA=global.MD_DATA||{CORPORATE_UNITS:[]};

for(const file of ["executive-directors.js","group-control.js","living-world.js","brand-evolution.js"]){
  require(path.join("..",file));
}

test("executive directors system has optional real roles and mechanical benefits",()=>{
  const result=global.MDXDirectors.runSelfTests();
  assert.equal(result.ok,true,result.failures.join("\n"));
  const casual={campaignId:"casual-exec",company:"A",year:1970,month:0,difficulty:"casual",cash:100e6,rp:0,rep:50,boardConfidence:50};
  const normal={campaignId:"normal-exec",company:"A",year:1970,month:0,difficulty:"normal",cash:100e6,rp:0,rep:50,boardConfidence:50};
  global.MDXDirectors.ensure(casual);global.MDXDirectors.ensure(normal);
  const cc=casual.executiveOffice.candidates.cmo[0],nc=normal.executiveOffice.candidates.cmo[0];
  assert.equal(global.MDXDirectors.hire(casual,"cmo",cc.id).ok,true);
  assert.equal(global.MDXDirectors.hire(normal,"cmo",nc.id).ok,true);
  for(const d of ["brand","launches","pricing"]) {
    if(!casual.executiveOffice.roles.cmo.duties.includes(d))global.MDXDirectors.toggleDuty(casual,"cmo",d);
    if(!normal.executiveOffice.roles.cmo.duties.includes(d))global.MDXDirectors.toggleDuty(normal,"cmo",d);
  }
  assert.ok(global.MDXDirectors.computeModifiers(casual).demandMultiplier>global.MDXDirectors.computeModifiers(normal).demandMultiplier,"Casual executive benefits must be materially stronger");
  assert.ok(Object.keys(global.MDXDirectors.ROLE_DEFS).length>=10,"C-suite catalog is not detailed enough");
});

test("subsidiary and industrial governance propagate into operating state",()=>{
  const result=global.MDXGroupControl.runSelfTests();
  assert.equal(result.ok,true,result.failures.join("\n"));
  const subDefs=global.MDXGroupControl.SUB_INTEGRATIONS;
  assert.ok(Object.keys(subDefs).length>=8,"subsidiary integration map lost required depth");
  assert.ok(Object.keys(global.MDXGroupControl.SUB_TARGETS).length>=8,"subsidiary scorecard target set lost depth");
  assert.ok(Object.keys(global.MDXGroupControl.IND_TARGETS).length>=8,"industrial scorecard target set lost depth");
});

test("owned company scorecards render metrics at or above 100 without disabling management",()=>{
  const industrial={id:"gear",name:"Gear Works",industry:"transmission",parentOwned:true,value:1e6,cash:20e6,debt:2e6,revenue:1e6,netProfit:1.5e6,utilization:1.2,quality:88,reliability:90,contracts:[]};
  const subsidiary={id:"sub",name:"Sub",value:1e6,cash:20e6,debt:2e6,lastRevenue:1e6,lastProfit:1.5e6,dealerHealth:70};
  const operating={...subsidiary,valuation:1e6,monthRevenue:1e6,monthProfit:1.5e6,monthSales:500,marketShare:2,factoryUtilization:1.2,aiCars:[]};
  const state={year:1940,month:0,difficulty:"casual",subsidiaries:[subsidiary],industry:[operating],industrialCompanies:[industrial]};
  let html;assert.doesNotThrow(()=>html=global.MDXGroupControl.renderIndustrialPanel(state,industrial));assert.match(html,/gov2-target/);assert.doesNotMatch(html,/NaN|undefined/);
  assert.doesNotThrow(()=>global.MDXGroupControl.renderSubsidiaryPanel(state,subsidiary,operating));
});

test("living world evolves market, creates news and supports corporate relationships",()=>{
  const result=global.MDXLivingWorld.runSelfTests();
  assert.equal(result.ok,true,result.failures.join("\n"));
  const p1995=global.MDXLivingWorld.eraProfile(1995);
  const p2025=global.MDXLivingWorld.eraProfile(2025);
  assert.notEqual(p1995.label,p2025.label);
  assert.ok(p1995.segments.Utility>1,"1990s SUV/utility rise missing");
  assert.ok(p2025.segments.Utility>1,"modern utility/crossover demand missing");
});

test("player can found a real separately operated marque when requirements are met",()=>{
  const state={campaignId:"player-brand",company:"Parent Motor",year:2005,month:0,cash:2e9,valuation:6e9,rep:85,rp:500,departments:{engineering:{staff:120}},unlocked:Array(50).fill("tech"),industry:[],corporateUnits:[],subsidiaries:[],history:[],dealers:800,factories:8,brands:1};
  const eligible=global.MDXBrandEvolution.playerEligibleTypes(state);
  assert.ok(eligible.includes("luxury"),"qualified parent should be able to create luxury marque");
  const result=global.MDXBrandEvolution.createPlayerMarque(state,"luxury",{name:"Regent Test"});
  assert.equal(result.ok,true,result.reason);
  assert.ok(state.subsidiaries.some(x=>x.name==="Regent Test"&&x.sourceType==="player_marque"));
  assert.ok(state.industry.some(x=>x.name==="Regent Test"&&x.playerSubsidiary&&x.operatingMarque));
  assert.ok(state.cash<2e9,"marque must consume real parent capital");
});

test("game shell wires new systems into real simulation paths",()=>{
  const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
  const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
  const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
  const industry=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
  const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
  assert.match(html,/data-finance-pane="directors"/);
  assert.match(html,/id="directorsPanel"/);
  for(const file of ["executive-directors.js","group-control.js","living-world.js"])assert.ok(html.includes(file),file+" not loaded");
  assert.match(game,/MDXGroupControl\?\.processMonth/);
  assert.match(game,/MDXDirectors\?\.processMonth/);
  assert.match(game,/MDXLivingWorld\?\.processMonth/);
  assert.match(game,/INDUSTRY NEWS/);
  assert.match(expansion,/factoryCapacityMultiplier/);
  assert.match(expansion,/interestCostFactor/);
  assert.match(corp,/parentCapacityReservationPct/);
  assert.match(corp,/transferPricingPolicy/);
  assert.match(industry,/parentProductDirectives/);
  assert.match(industry,/groupDebtCeilingPct/);
  for(const file of ["/executive-directors.js","/group-control.js","/living-world.js"])assert.ok(sw.includes(file),file+" missing from offline shell");
});

test("partnership cash is recognized in month-close reconciliation",()=>{
  const core=fs.readFileSync(path.join(__dirname,"..","sim-core.js"),"utf8");
  assert.match(core,/operatingTransactionKeys=\[[^\]]*"technology_royalty"/);
  assert.match(core,/nonOperatingExpenseKeys=\[[^\]]*"strategic_partnership"/);
});
