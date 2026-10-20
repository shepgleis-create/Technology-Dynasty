"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
global.window=global;
require("../product-lifecycle.js");
const lifecycle=global.MDXProductLifecycle;
const base=()=>({year:1970,month:0,day:1,cash:100000,vehicles:[{id:"revival",name:"Heritage",active:false,productionStatus:"retired",generation:1,modelYear:1968,stats:{unitCost:1200},lifecycleEvents:[]}],operations:{factories:[{id:"factory-1",active:true,status:"operating"}]},factories:1});
test("restart uses operational factory array even when state.factories is a count",()=>{
 const s=base(),cash=s.cash;const r=lifecycle.restartVehicle(s,"revival");assert.equal(r.ok,true);assert.ok(r.tooling>0);assert.equal(s.cash,cash-r.tooling);assert.equal(s.vehicles[0].productionStatus,"preproduction");assert.equal(s.vehicles[0].relaunchPlan.status,"tooling");
});
test("restart is denied when no factory operates, without charging cash",()=>{
 const s=base();s.operations.factories[0].status="closed";const r=lifecycle.restartVehicle(s,"revival");assert.equal(r.ok,false);assert.match(r.reason,/factory/i);assert.equal(s.cash,100000);
});
test("restart is denied without sufficient tooling funds",()=>{
 const s=base();s.cash=10;const r=lifecycle.restartVehicle(s,"revival");assert.equal(r.ok,false);assert.match(r.reason,/cash/i);assert.equal(s.cash,10);
});
test("restart cannot charge an already active vehicle",()=>{
 const s=base();s.vehicles[0].active=true;s.vehicles[0].productionStatus="production";const r=lifecycle.restartVehicle(s,"revival");assert.equal(r.ok,false);assert.equal(s.cash,100000);
});
test("restart preserves original vehicle and generation",()=>{
 const s=base(),original=s.vehicles[0];const r=lifecycle.restartVehicle(s,"revival");assert.equal(r.ok,true);assert.equal(s.vehicles[0],original);assert.equal(original.generation,1);assert.equal(original.relaunchPlan.originalGeneration,1);
});
