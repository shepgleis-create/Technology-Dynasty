"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
global.window=global;
global.MDX_CORE={random:()=>.5};
global.MDX_DATA={REGIONS:[{id:"us_south",reg:"us",fuel:1,income:1},{id:"west_eu",reg:"eu",fuel:1,income:1}]};
require("../economy-system.js");
function state(){return{year:1970,month:1,hq:"usa",cash:1e7,debt:1e6,valuation:2e7,worldEconomy:{fx:{usd:1,eur:1.2,jpy:0.01,gbp:1.3,krw:0.001},tariff:0,benchmarkRate:7.2},industry:[]};}
test("foreign supplier's currency is inferred when not specified",()=>{
 const s=state();const quote=global.MDXEconomy.landedImportMultiplier(s,{sourceCountry:"West Germany",destinationRegion:"us_south"});
 assert.equal(quote.sourceCurrency,"eur");assert.equal(quote.reportingCurrency,"usd");
 assert.ok(Math.abs(quote.multiplier-1.2)<1e-9);
});
test("explicit contract currency overrides supplier-country inference",()=>{
 const s=state();const quote=global.MDXEconomy.landedImportMultiplier(s,{sourceCountry:"West Germany",currency:"gbp",destinationRegion:"us_south"});
 assert.equal(quote.sourceCurrency,"gbp");assert.ok(Math.abs(quote.multiplier-1.3)<1e-9);
});
test("domestic supply incurs no currency conversion or foreign tariff",()=>{
 const s=state();s.worldEconomy.tariff=.15;
 const quote=global.MDXEconomy.landedImportMultiplier(s,{sourceCountry:"United States",destinationRegion:"us_south"});
 assert.equal(quote.multiplier,1);assert.equal(quote.tariff,0);
});
test("regional economy updates are idempotent per month",()=>{
 const s=state();global.MDXEconomy.processRegionalMonth(s);
 const before=JSON.stringify(s.worldEconomy.regions);
 global.MDXEconomy.processRegionalMonth(s);
 assert.equal(JSON.stringify(s.worldEconomy.regions),before);
});
test("module self-tests pass",()=>{const r=global.MDXEconomy.runSelfTests();assert.deepEqual(r.failures,[]);assert.equal(r.ok,true);});
