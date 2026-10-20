"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
globalThis.window=globalThis;
require("../industry-sim-client.js");
const sim=globalThis.MDXIndustrySim;
const credit=sim.documentScaleRepairCredit;
const specimen=()=>({id:"failing-rival",name:"Legacy Rival",currentYear:1981,currentMonth:5,valuation:1.5e12,cash:1000000,debt:4000000,monthRevenue:780000,workingCapitalDebt:300000,monthFinancingCashFlow:0,monthScaleRepairBorrowing:0});
const assets={factories:1,employees:232,dealers:37};
test("A trillion-dollar paper valuation cannot create rescue cash without equivalent debt",()=>{
 const m=specimen(),before={cash:m.cash,debt:m.debt},proof=credit(m,{monthRevenue:780000},1e10,assets);
 assert.ok(proof.borrowed<1e7);assert.ok(proof.borrowed>=0);
 assert.ok(Math.abs(m.cash-before.cash-(m.debt-before.debt))<1e-6);
 assert.equal(m.valuation,1.5e12);
 assert.equal(m.monthFinancingCashFlow,proof.borrowed);
 assert.equal(m.monthScaleRepairBorrowing,proof.borrowed);
});
test("Documented rescue borrowing is identical regardless of equity market valuation",()=>{
 const a=specimen(),b={...specimen(),valuation:75000000};
 const x=credit(a,{monthRevenue:780000},1e10,assets),y=credit(b,{monthRevenue:780000},1e10,assets);
 assert.equal(x.borrowed,y.borrowed);
 assert.equal(a.cash,b.cash);assert.equal(a.debt,b.debt);
});
test("Borrowing cannot exceed collateral, revenue and outstanding debt headroom",()=>{
 const m=specimen(),r=credit(m,{monthRevenue:0},1e12,{factories:0,employees:0,dealers:0});
 assert.equal(r.borrowed,0);assert.equal(m.cash,1000000);
 assert.equal(m.debt,4000000);
});
test("Already sufficiently funded legacy rival never receives duplicate rescue cash",()=>{
 const m=specimen();m.cash=20000000;
 const r=credit(m,{monthRevenue:780000},15000000,assets);
 assert.equal(r.borrowed,0);
 assert.equal(m.cash,20000000);
 assert.equal(m.debt,4000000);
});
test("Rescue borrowing is written to a save-safe debt and cash provenance ledger",()=>{
 const m=specimen();const r=credit(m,{monthRevenue:780000},1e9,assets);
 const copy=JSON.parse(JSON.stringify(m));
 assert.equal(copy.scaleRepairFinancingHistory.length,1);
 assert.equal(copy.scaleRepairFinancingHistory[0].borrowed,r.borrowed);
 assert.equal(copy.workingCapitalDebt,300000+r.borrowed);
 assert.ok(copy.scaleRepairFinancingHistory[0].source.includes("secured"));
});
test("Invalid or non-finite legacy cash inputs cannot create limitless free cash",()=>{
 const m=specimen();m.cash=Number.NaN;m.debt=Number.POSITIVE_INFINITY;
 const r=credit(m,{monthRevenue:750000},1e12,assets);
 assert.ok(Number.isFinite(m.cash)&&Number.isFinite(m.debt));
 assert.equal(r.cashAfter-r.cashBefore,r.debtAfter-r.debtBefore);
});
