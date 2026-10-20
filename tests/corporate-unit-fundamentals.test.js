"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
global.window=global;require("../corporate-unit-fundamentals.js");
const E=global.MDXCorporateUnitFundamentals.evaluate;
const context={year:1970,month:5,confidence:1,parentReputation:60,annualInterestRate:7};
const unit=()=>({id:"unit-a",operatingMarque:true,valuation:150000000,cash:10000000,debt:10000000,employees:1200,factories:2,dealers:90,rd:65,status:"active"});
test("corporate unit monthly revenue is independent of speculative parent valuation",()=>{
 const normal=E(unit(),context),speculative=E({...unit(),valuation:1500000000000},context);
 assert.equal(normal.monthlyRevenue,speculative.monthlyRevenue);
 assert.equal(normal.monthProfit,speculative.monthProfit);
 assert.equal(normal.drivers.equityTarget,speculative.drivers.equityTarget);
 assert.ok(speculative.valuation<1500000000000,"the 1.5 trillion fictional value should converge down");
});
test("corporate unit volume is constrained by real factories, retail and workforce",()=>{
 const u={...unit(),employees:9000,dealers:200},normal=E(u,context),less=E({...u,factories:1},context),noDealers=E({...u,dealers:0},context);
 assert.ok(normal.units>less.units);
 assert.equal(noDealers.units,0);
 assert.equal(noDealers.drivers.vehicleRevenue,0);
 assert.ok(normal.drivers.vehicleCapacity>0);
});
test("corporate unit operating revenue does not grow merely because parent's share price rises",()=>{
 const u=unit(),rows=[];
 for(let month=0;month<240;month++){const year=1970+Math.floor(month/12),m=month%12;
  const r=E(u,{...context,year,month:m,parentReputation:60});
  rows.push({...r,year});
  u.valuation=r.valuation;
  u.cash=Math.max(0,u.cash+r.monthProfit*.72);
 }
 assert.ok(rows.every(r=>Number.isFinite(r.valuation)&&Number.isFinite(r.monthlyRevenue)&&Number.isFinite(r.monthProfit)));
 const a=E(u,{...context,year:1990,month:1,parentReputation:60});
 const b=E(u,{...context,year:1990,month:1,parentReputation:60,parentValuation:1e15,parentShareMove:.045});
 assert.equal(a.drivers.equityTarget,b.drivers.equityTarget);
 assert.equal(a.monthlyRevenue,b.monthlyRevenue);
 assert.equal(a.valuation,b.valuation);
});
test("non-automotive corporate units earn service revenue from workforce rather than nonexistent vehicles",()=>{
 const u={...unit(),operatingMarque:false,factories:0,dealers:0};
 const r=E(u,context);
 assert.equal(r.units,0);assert.equal(r.drivers.vehicleRevenue,0);
 assert.ok(r.monthlyRevenue>0);
});
test("closed historical businesses stop generating operating sales",()=>{
 const r=E({...unit(),status:"discontinued"},context);
 assert.equal(r.monthlyRevenue,0);assert.equal(r.units,0);
});
test("real productive expansion raises revenue but does not invent cash",()=>{
 const a=E(unit(),context),b=E({...unit(),factories:4,employees:3200,dealers:200},context);
 assert.ok(b.monthlyRevenue>a.monthlyRevenue);
 assert.equal(b.drivers.cash,a.drivers.cash);
 assert.ok(b.drivers.factoryAssets>a.drivers.factoryAssets);
});
test("valuation is a blend of earned fundamental equity and previous value, not an arbitrary trillion-dollar ceiling",()=>{
 const r=E(unit(),context);
 assert.ok(Math.abs(r.valuation-(r.drivers.previous+(r.drivers.equityTarget-r.drivers.previous)*.12))<.001);
 assert.ok(r.drivers.equityTarget>0);
});
test("finite valuation and profit for near-zero enterprise with no revenue",()=>{
 const r=E({id:"dormant",valuation:1000000,cash:0,debt:0,employees:0,dealers:0,factories:0,status:"active"},context);
 assert.ok(Number.isFinite(r.valuation)&&Number.isFinite(r.monthProfit));assert.equal(r.monthlyRevenue,0);
});

test("unspecified non-automotive corporate units never fabricate vehicle sales",()=>{
 const u={...unit(),operatingMarque:undefined};const r=E(u,context);
 assert.equal(r.units,0);assert.equal(r.drivers.vehicleRevenue,0);
 assert.ok(r.monthlyRevenue>0);assert.ok(r.drivers.serviceCapacity>0);
});
test("non-automotive unit revenue responds to worker capacity rather than dealership count",()=>{
 const u={...unit(),operatingMarque:false},low=E({...u,employees:500},context),high=E({...u,employees:2500},context),shops=E({...u,employees:500,dealers:10000},context);
 assert.ok(high.monthlyRevenue>low.monthlyRevenue);
 assert.equal(low.monthlyRevenue,shops.monthlyRevenue);
});
