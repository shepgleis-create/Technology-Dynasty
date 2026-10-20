"use strict";

const assert=require("node:assert/strict");
const test=require("node:test");

global.window=global;
require("../sim-core.js");
global.MDX_DATA={SUPPLIERS:[]};
delete require.cache[require.resolve("../corporate-economy.js")];
require("../corporate-economy.js");

function supplier(){
 return{
  id:"trace_tire_supplier",name:"Trace Tire Works",industry:"tires",country:"US",founded:1900,status:"active",
  quality:86,reliability:92,products:[{id:"trace_tire_v1",name:"Trace Touring Tire",engineeringKind:"tires",quality:86,reliability:92,generation:1}],
  capacity:1000,factories:1
 };
}
function state(){
 const c=supplier(),v={id:"trace_car",name:"Trace Car",productionStatus:"production",componentProvenance:[]},other={id:"other_car",name:"Other Car",productionStatus:"production",componentProvenance:[]};
 return{
  year:1976,month:4,day:10,difficulty:"normal",vehicles:[v,other],industrialCompanies:[c],
  componentSupply:{version:2,openingSeeded:true,inventory:{},lots:{},shortages:{},todayShortages:{},lastMonthReceipts:{},lifetimeReceipts:{},lifetimeConsumed:{},lastMonthEmergency:{},lastMonthShortfall:{},deliveryLedger:[]}
 };
}

test("supplier capacity becomes category-specific physical inventory without duplication",()=>{
 const s=state(),c=s.industrialCompanies[0],api=global.MDX_CORP;
 api.normalizeComponentSupply(s,false);
 const lot=api.registerComponentDelivery(s,c,10,{source:"test_contract",unitPrice:180,amount:1800});
 assert.equal(s.componentSupply.inventory.tires,40,"10 supplier capacity points should create four tires per vehicle-set point");
 assert.equal(lot.quantityOriginal,40);
 assert.equal(s.componentSupply.deliveryLedger.length,1);
 assert.equal(s.componentSupply.deliveryLedger[0].capacityPoints,10);
 assert.equal(s.componentSupply.deliveryLedger[0].amount,1800);
 const cap=api.componentProductionConstraint(s,s.vehicles[0],14);
 assert.equal(cap.units,10);
 assert.equal(cap.shortage,4);
 const used=api.consumeVehicleComponents(s,s.vehicles[0],6,6);
 assert.equal(used.units,6);
 assert.equal(s.componentSupply.inventory.tires,16);
 assert.equal(api.componentStockVehicleEquivalent(s,"tires"),4);
});

test("supplier exposure follows consumed lots and excludes unrelated models",()=>{
 const s=state(),c=s.industrialCompanies[0],api=global.MDX_CORP;
 api.normalizeComponentSupply(s,false);
 api.registerComponentDelivery(s,c,12,{source:"test_batch"});
 api.consumeVehicleComponents(s,s.vehicles[0],5,5);
 const rows=api.traceSupplierExposure(s,c.id,"tires",18);
 assert.equal(rows.length,1);
 assert.equal(rows[0].vehicleId,"trace_car");
 assert.equal(rows[0].units,5);
 assert.equal(rows.some(x=>x.vehicleId==="other_car"),false);
});

test("emergency market coverage is bounded and leaves a real shortage",()=>{
 const s=state(),api=global.MDX_CORP;
 api.normalizeComponentSupply(s,false);
 const result=api.finalizeComponentProcurementMonth(s,{tires:1000},()=>{});
 assert.ok(result.emergencyPoints>0);
 assert.ok(result.emergencyPoints<1000,"normal difficulty should not magically fill an arbitrarily large shortage");
 assert.ok(result.totalShort>0);
 assert.equal(s.componentSupply.lastMonthShortfall.tires,result.totalShort);
 assert.ok(s.componentSupply.costPressure>1);
});
