"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
global.window=global;require("../industry-sim-client.js");
const fn=global.MDXIndustrySim.__test.fundWorkingCapital;
function small(value=1e15){
 return {id:"productive-credit-case",name:"Small Motors",valuation:value,cash:1000000,debt:0,workingCapitalDebt:0,currentYear:1970,currentMonth:0,volumeClass:"micro",factories:1,employees:350,dealers:32,monthRevenue:280000,monthProductionLiquidity:0,aiCars:[{id:"model",active:true,price:8500,currentUnitCost:5300,lastDemand:45,dealerThroughput:50}],aiBudget:{},status:"active",managementSkill:1,treasuryDiscipline:1,riskTolerance:1};
}
const opportunity={carId:"model",demand:45,throughput:50,unitRevenue:7800,unitCost:5300};
test("Trillion-dollar speculative equity creates no additional borrowable working capital",()=>{
 const a=small(12000000),b=small(1e15),cashA=a.cash,cashB=b.cash;
 const low=fn(a,1e12,[],opportunity),high=fn(b,1e12,[],opportunity);
 assert.equal(low,high,"bank credit is backed by identical production rather than quoted equity");
 assert.ok(high<12000000);assert.equal(a.cash-cashA,low);assert.equal(b.cash-cashB,high);
});
test("Working-capital advances are balanced by real debt and audit trail",()=>{
 const m=small(),before=m.cash;const amount=fn(m,1e12,[],opportunity);
 assert.ok(amount>=0&&Number.isFinite(amount));
 assert.equal(m.cash-before,amount);
 assert.equal(m.debt,amount);
 assert.equal(m.monthFinancingCashFlow,amount);
 assert.equal(m.monthWorkingCapitalBorrowing,amount);
});
test("Demand-backed facility cannot lend with no saleable customer orders",()=>{
 const m=small();m.factories=0;m.debt=90000000;
 const amount=fn(m,1e12,[],{...opportunity,demand:0,throughput:0,unitRevenue:0});
 assert.equal(amount,0);assert.equal(m.cash,1000000);assert.equal(m.debt,90000000);
});
test("Finance code no longer creates valuation-backed liquidity reserves or dealer receivables",()=>{
 const src=fs.readFileSync(path.resolve(__dirname,"../industry-sim-client.js"),"utf8");
 assert.match(src,/facilityBase=Math\.max\(operationalCapitalBase\(m\)/);
 assert.doesNotMatch(src,/facilityBase=Math\.max\(value,/);
 assert.match(src,/reserveTarget=Math\.max\(Math\.min\(Number\(b\.reserveTarget/);
 assert.doesNotMatch(src,/reserveTarget=Math\.max\(Number\(b\.reserveTarget\|\|0\)\*\.60,valuation\*/);
});
