"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");

class MemoryStorage{
 constructor(){this.values=new Map();}
 getItem(key){return this.values.has(key)?this.values.get(key):null;}
 setItem(key,value){this.values.set(key,String(value));}
 removeItem(key){this.values.delete(key);}
}

class QuotaStorage extends MemoryStorage{
 constructor(limit){super();this.limit=limit;}
 setItem(key,value){
  const next=String(value),prior=this.values.get(key),size=[...this.values.entries()].reduce((sum,[k,v])=>sum+(k===key?0:String(k).length+String(v).length),0)+String(key).length+next.length;
  if(size>this.limit){const error=new Error("Quota exceeded");error.name="QuotaExceededError";throw error;}
  this.values.set(key,next);
 }
}

const storage=new MemoryStorage();
global.window=global;
global.localStorage=storage;
global.MDXPerf={record(){}};
require("../storage.js");
require("../sim-core.js");
require("../world-events.js");
require("../company-history.js");
require("../product-lifecycle.js");
require("../product-visualizer.js");
require("../render-library.js");
require("../brand-evolution.js");
require("../powertrain-families.js");
require("../transmission-families.js");
require("../powertrain-compatibility.js");
require("../powertrain-market.js");
require("../electrification.js");
require("../customer-market.js");
require("../market-quality.js");

function state(overrides={}){
 return{company:"Regression Motors",campaignId:"phase1-regression",year:1970,month:0,day:1,cash:10000000,debt:0,factories:1,vehicles:[],engines:[],transmissions:[],subsidiaries:[],industry:[],saveRevision:1,saveSchemaVersion:9,version:21,lastLocalSaveAt:"2026-01-01T00:00:00.000Z",...overrides};
}

test("storage module self-tests pass",()=>{
 const result=global.MDXStorage.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("strict validation rejects malformed nested production and contract data",()=>{
 const result=global.MDXStorage.validateState(state({operations:{factories:{}},engineSupply:{contracts:{}},transmissionSupply:{contracts:[]}}),{strict:true});
 assert.equal(result.ok,false);
 assert.ok(result.errors.includes("operations.factories must be an array"));
 assert.ok(result.errors.includes("engineSupply.contracts must be an array"));
 const customerMalformed=global.MDXStorage.validateState(state({customerMarket:{regions:[],segments:{}}}),{strict:true});
 assert.equal(customerMalformed.ok,false);
 assert.ok(customerMalformed.errors.includes("customerMarket.regions must be an object"));
 assert.ok(customerMalformed.errors.includes("customerMarket.segments must be an array"));
 const qualityMalformed=global.MDXStorage.validateState(state({marketQuality:[]}),{strict:true});
 assert.equal(qualityMalformed.ok,false);
 assert.ok(qualityMalformed.errors.includes("marketQuality must be an object"));
 const normalized=global.MDXStorage.validateState(state({operations:{factories:[],projects:[],suppliers:{}}}),{strict:true});
 assert.equal(normalized.ok,true,normalized.errors.join("\n"));
});

test("merger vehicle normalization keeps demand math finite",()=>{
 const stats=global.MDX_CORE.normalizeVehicleStats({segment:"Family",cost:2400,reliability:74,hp:125},{unitCost:2400});
 assert.equal(stats.className,"Family");
 for(const key of ["unitCost","manufacturingUnitCost","reliability","quality","mpg","hp"])assert.equal(Number.isFinite(stats[key]),true,key+" must be finite");
});

test("reputation core recovers null or N/A saves and records movement",()=>{
 assert.equal(global.MDX_CORE.normalizeReputation(null,20),20);
 assert.equal(global.MDX_CORE.normalizeReputation("N/A",20),20);
 assert.equal(global.MDX_CORE.normalizeReputation(undefined,40),40);
 const campaign={company:"Reputation Motors",year:1973,month:11,day:19,rep:null};
 const change=global.MDX_CORE.adjustReputation(campaign,1.25,{fallback:20,reason:"Vehicle launch",source:"test"});
 assert.equal(change.before,20);
 assert.equal(campaign.rep,21.25);
 assert.equal(campaign.reputationLedger.length,1);
 assert.equal(campaign.reputationLedger[0].reason,"Vehicle launch");
});

test("reputation recovery is a non-destructive save migration",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_11_reputation_recovery_and_progression/);
 assert.match(game,/Legacy reputation state repaired from campaign history/);
 assert.match(game,/launchReputationApplied/);
 assert.match(game,/applyLaunchReputation\(v\)/);
 assert.match(game,/assertSaveContinuity\(continuity,saveContinuitySnapshot\(state\),loadedSchema>=10&&loadedVersion>=21\)/);
 assert.match(game,/cash changed during reputation migration/);
 assert.match(game,/vehicle roster changed during reputation migration/);
 assert.match(game,/owned \/ merged company state changed during reputation migration/);
 assert.doesNotMatch(game,/s\.rep=clamp\(Number\.isFinite\(Number\(s\.rep\)\)\?Number\(s\.rep\)/);
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/function settleVehicleReputationMonth\(state,log\)/);
 assert.match(expansion,/Customer ownership experience/);
 assert.match(expansion,/Recent Reputation Changes/);
 assert.match(expansion,/ownSales/);
 assert.match(expansion,/inheritedSales/);
});

test("reputation migration preserves an exact previous-save recovery snapshot",()=>{
 const memory=new MemoryStorage(),adapter=new global.MDXStorage.WebLocalAdapter(memory,{enableVault:false});
 const before=state({saveSchemaVersion:10,rep:null,cash:18456231,debt:1200000,year:1974,month:6,day:17,vehicles:[{id:"merged_car",name:"Inherited Model",lifetimeSales:842},{id:"native_car",name:"Own Model",lifetimeSales:31}],engines:[{id:"eng1"}],transmissions:[{id:"tx1"}],subsidiaries:[{id:"sub1"}],industry:[{id:"maker1",acquired:true,status:"merged_into_player"}],operations:{factories:[{id:"plant1"}],projects:[],suppliers:{}}});
 adapter.save(before);
 const migrated=JSON.parse(JSON.stringify(before));migrated.saveSchemaVersion=11;migrated.rep=24.5;migrated.reputationLedger=[{reason:"Legacy reputation state repaired from campaign history"}];migrated.vehicles.forEach(v=>{v.launchReputationApplied=true;});
 adapter.save(migrated);
 const recovery=adapter.loadRecovery();
 assert.ok(recovery,"pre-migration recovery snapshot must remain available");
 for(const key of ["campaignId","company","year","month","day","cash","debt"])assert.equal(recovery[key],before[key],key+" changed in recovery snapshot");
 assert.deepEqual(recovery.vehicles,before.vehicles);
 assert.deepEqual(recovery.engines,before.engines);
 assert.deepEqual(recovery.transmissions,before.transmissions);
 assert.deepEqual(recovery.subsidiaries,before.subsidiaries);
 assert.deepEqual(recovery.industry,before.industry);
 assert.deepEqual(recovery.operations,before.operations);
 assert.equal(recovery.saveSchemaVersion,10);
 assert.equal(adapter.load().saveSchemaVersion,11);
});

test("deep engine and vehicle builders remain save-compatible and dense",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(game,/blockDeck:"open"/);
 assert.match(game,/oiling:"wet"/);
 assert.match(game,/tolerance:"standard"/);
 assert.match(game,/structure:"unibody"/);
 assert.match(game,/wheelbase:2700/);
 assert.match(game,/tractionControl:false/);
 assert.match(game,/ENGINE_BLOCK_DECKS/);
 assert.match(game,/ENGINE_OILING/);
 assert.match(game,/ENGINE_TOLERANCES/);
 assert.match(game,/VEHICLE_STRUCTURES/);
 assert.match(game,/VEHICLE_STEERING/);
 assert.match(game,/VEHICLE_ASSEMBLY/);
 assert.match(game,/s\.engineDraft=\{\.\.\.DEFAULT_ENGINE_DRAFT,\.\.\.\(s\.engineDraft\|\|\{\}\)\}/);
 assert.match(game,/s\.vehicleDraft=\{\.\.\.DEFAULT_VEHICLE_DRAFT,\.\.\.\(s\.vehicleDraft\|\|\{\}\)\}/);
 assert.match(game,/function generatedTransmissionName\(\)/);
 assert.match(game,/id='generateTransmissionName'/);
 assert.match(game,/generatedCandidateUnique/);
 assert.match(game,/function compactSelectMarkup\(/);
 assert.match(game,/manufacturingYield/);
 assert.match(game,/towingCapability/);
 assert.match(css,/engineering-control-dense\{max-height:none!important;overflow:visible!important/);
 assert.match(css,/#view-engine \.control-content,#view-vehicle \.control-content\{max-height:none!important;overflow:visible!important/);
 assert.match(css,/\.tx-live-strip\{padding:4px 5px!important/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(game,/view\.dataset\.builderTab=engineTab/);
 assert.match(game,/view\.dataset\.builderTab=vehicleTab/);
 assert.match(css,/BUILD 41 — phone engineering focus mode/);
 assert.match(css,/#view-vehicle\[data-builder-tab="concept"\] \.vehicle-stage/);
 assert.match(css,/#view-vehicle\[data-builder-tab="chassis"\] \.vehicle-stage/);
 assert.match(game,/headMaterial:"iron"/);
 assert.match(game,/combustionChamber:"wedge"/);
 assert.match(game,/porting:"standard"/);
 assert.match(game,/mixture:52/);
 assert.match(game,/ignitionTiming:50/);
 assert.match(game,/exhaustDiameter:50/);
 assert.match(game,/revLimiter:"mechanical"/);
 assert.match(game,/ENGINE_HEAD_MATERIALS/);
 assert.match(game,/ENGINE_COMBUSTION_CHAMBERS/);
 assert.match(game,/ENGINE_PORTING/);
 assert.match(game,/ENGINE_REV_LIMITERS/);
 assert.match(game,/enginePlacement:"front"/);
 assert.match(game,/springRate:50/);
 assert.match(game,/damperTune:50/);
 assert.match(game,/steeringRatio:50/);
 assert.match(game,/rotorSize:260/);
 assert.match(game,/brakeCooling:"basic"/);
 assert.match(game,/fuelTank:60/);
 assert.match(game,/weightDistributionFront/);
 assert.match(game,/drivingRange/);
 assert.match(game,/brakingScore/);
 assert.match(game,/rodRatio:1\.65/);
 assert.match(game,/flywheel:"standard"/);
 assert.match(game,/coolingReserve:50/);
 assert.match(game,/coolingOpening:50/);
 assert.match(game,/camLift:50/);
 assert.match(game,/camDuration:50/);
 assert.match(game,/VALVE LIFT/);
 assert.match(game,/CAM DURATION/);
 assert.match(game,/camTopEnd/);
 assert.match(game,/camLowEnd/);
 assert.match(game,/frontCamber:-0\.5/);
 assert.match(game,/frontToe:0\.05/);
 assert.match(game,/caster:5\.5/);
 assert.match(game,/diffLock:35/);
 assert.match(game,/FRONT CAMBER/);
 assert.match(game,/FRONT TOE/);
 assert.match(game,/CASTER/);
 assert.match(game,/LSD LOCK/);
 assert.match(game,/alignmentWear/);
 assert.match(game,/diffLaunch/);
 assert.match(game,/rearCamber:-0\.8/);
 assert.match(game,/rearToe:0\.10/);
 assert.match(game,/antiRollBalance:52/);
 assert.match(game,/tirePressureFront:32/);
 assert.match(game,/tirePressureRear:32/);
 assert.match(game,/REAR CAMBER/);
 assert.match(game,/REAR TOE/);
 assert.match(game,/ROLL STIFFNESS • FRONT SHARE/);
 assert.match(game,/FRONT TIRE PRESSURE/);
 assert.match(game,/REAR TIRE PRESSURE/);
 assert.match(game,/tireLifeIndex/);
 assert.match(game,/pressureMpg/);
 assert.match(game,/rollBalanceHandling/);
 assert.match(game,/headGasket:"composite"/);
 assert.match(game,/oilCooler:"none"/);
 assert.match(game,/intakeRunner:50/);
 assert.match(game,/fuelSystemCapacity:50/);
 assert.match(game,/ENGINE_HEAD_GASKETS/);
 assert.match(game,/ENGINE_OIL_COOLERS/);
 assert.match(game,/fuelSystemCapacityHp/);
 assert.match(game,/fuelDeliveryFactor/);
 assert.match(game,/bushings:"rubber"/);
 assert.match(game,/brakePads:"organic"/);
 assert.match(game,/corrosionProtection:"basic"/);
 assert.match(game,/durabilityValidation:50/);
 assert.match(game,/nvhTune:50/);
 assert.match(game,/VEHICLE_BUSHINGS/);
 assert.match(game,/VEHICLE_BRAKE_PADS/);
 assert.match(game,/VEHICLE_CORROSION_PROTECTION/);
 assert.match(game,/DURABILITY VALIDATION/);
 assert.match(game,/NVH \/ ISOLATION TARGET/);
 assert.match(game,/ROD \/ STROKE RATIO/);
 assert.match(game,/Flywheel inertia/);
 assert.match(game,/COOLING RESERVE/);
 assert.match(game,/COOLING AIRFLOW/);
 assert.match(game,/NAME_BANK_EXPANDED/);
 assert.match(game,/generatedNameHistory/);
 assert.match(game,/function rememberGeneratedName\(kind,name\)/);
 assert.match(game,/if\(list\.length>500\)list\.length=500/);
 assert.match(game,/generatedCandidateUnique\(kind,build,used,current="",attempts=256\)/);
 assert.match(game,/generatedCandidateUnique\("company"/);
 assert.match(game,/generatedCandidateUnique\("engine"/);
 assert.match(game,/generatedCandidateUnique\("vehicle"/);
 assert.match(game,/generatedCandidateUnique\("transmission"/);
 assert.match(css,/#view-vehicle\[data-builder-tab="chassis"\] \.engineering-slider-grid\{grid-template-columns:repeat\(3/);
 assert.match(css,/BUILD 42 — compact sticky transmission telemetry/);
 assert.match(css,/\.tx-live-strip\{padding:3px 4px!important/);
 assert.match(css,/BUILD 43 — no-scroll phone concept\/chassis pass/);
 assert.match(css,/#view-vehicle\[data-builder-tab="concept"\] \.option span/);
 assert.match(css,/#view-vehicle\[data-builder-tab="chassis"\] \.transmission-readout span/);
 assert.match(css,/BUILD 44 — readable no-scroll Concept\/Chassis phone layout/);
 assert.match(css,/BUILD 44 — usable phone Concept\/Chassis \+ visible subsidiary controls/);
 assert.match(fs.readFileSync(path.join(__dirname,"..","viewport-fit.js"),"utf8"),/classList\.remove\("builder-scrollable"\)/);
 assert.match(css,/#view-vehicle\[data-builder-tab="concept"\]>\.view-head>div/);
 assert.match(css,/font-size:6\.5px!important/);
 assert.match(css,/font-size:8\.6px!important/);
});

test("global manufacturer expansion is save-safe and AI integrated",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const data=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
 const industry=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(game,/schema_12_global_manufacturer_expansion/);
 assert.match(game,/preservedExistingCompanies:true/);
 assert.match(game,/globalManufacturerExpansionV1/);
 assert.match(game,/HISTORICAL DNA/);
 assert.match(game,/PRE-AUTOMOTIVE/);
 for(const id of ["aichi_machine","mitsuoka","tommykaira","takeoka","yulon","china_motor","iran_khodro","saipa","force_motors","tata_motors","tofas","otosan_anadol","gurgel","puma_brazil","vam_mexico","ika_argentina","namco","santana_motor","donkervoort","monteverdi","bricklin","asia_motors","motor_holdings_trekka","perodua","chery"])assert.match(data,new RegExp('id:"'+id+'"'),id+" missing from manufacturer data");
 assert.match(data,/vehicleStart:/);
 assert.match(data,/volumeClass:"micro"/);
 assert.match(data,/preferredSegments:/);
 assert.match(data,/historyNote:/);
 assert.match(industry,/function autoStartYear\(m\)/);
 assert.match(industry,/function volumeProfile\(m\)/);
 assert.match(industry,/function seededModelCount\(m\)/);
 assert.match(industry,/vp\.demand/);
 assert.match(industry,/vp\.dealerThroughput/);
 assert.match(industry,/vp\.minCapacity/);
 assert.match(industry,/m\.preferredSegments/);
});


test("funded distressed, restructured, bankrupt, and liquidated acquisitions resume real operations",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 assert.ok(global.MDXIndustrySim?.simulateIndustryMonth,"industry simulator did not load");
 const recoveredAcquisition=(origin)=>({
  id:"recovery_"+origin,name:origin+" Recovery Motors",country:"United States",founded:1903,volumeClass:"regional",share:2,marketShare:2,focus:"Value • reliability",seedScale:.5,
  valuation:300000000,valuationAnchor:300000000,cash:26000000,debt:190000000,employees:0,factories:0,dealers:120,franchiseDealers:115,companyStores:5,
  rd:62,brandReputation:"N/A",dealerHealth:"N/A",status:"restructuring",acquired:true,playerSubsidiary:true,parentBudgetControl:"ai",parentAutonomy:"medium",
  parentOperatingModel:"lean",parentProductMandate:"heritage",managementTransitionMonths:24,managementTransitionTotal:24,managementTransitionStage:"assessment",parentCapitalInjected:26000000,
  acquisitionOriginStatus:origin,acquisitionOriginCash:0,acquisitionOriginDebt:450000000,acquisitionOriginFactories:0,
  aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},
  aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:false,allowExternalTransmissions:false}
 });
 for(const origin of ["distressed","restructuring","bankrupt","liquidated"]){
  let industry=[recoveredAcquisition(origin)],firstProductionMonth=null,profitableMonths=0,interestPaid=false;
  for(let n=0;n<36;n++){
   const result=global.MDXIndustrySim.simulateIndustryMonth({industry,corporateUnits:[],year:1970+Math.floor(n/12),month:n%12,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{}});
   industry=result.industry;const company=industry[0];
   if(firstProductionMonth===null&&Number(company.monthProduction||0)>0)firstProductionMonth=n;
   if(Number(company.monthNetProfit||0)>0)profitableMonths++;
   if(Number(company.monthInterestExpense||0)>0)interestPaid=true;
  }
  const company=industry[0];
  assert.equal(firstProductionMonth,0,origin+" acquisition did not resume production in its first operating month");
  assert.ok(profitableMonths>=24,origin+" acquisition never established sustained profitability");
  assert.ok(Number(company.monthSales||0)>0&&Number(company.monthProduction||0)>0,origin+" acquisition returned to zero activity");
  assert.ok(!["bankrupt","liquidated"].includes(company.status),origin+" acquisition failed back into insolvency");
  assert.ok(company.factories>=1&&company.employees>50,origin+" acquisition never restored a viable operating footprint");
  assert.ok(interestPaid&&Number(company.debt||0)>0,origin+" acquisition erased debt or interest instead of paying it");
 }
});

test("Casual-owned subsidiaries get permanent parent backing without inflating contract prices",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const maker=(id,name,owned=false)=>({
  id,name,country:"United States",founded:1900,volumeClass:"regional",share:2,marketShare:2,focus:"Reliability",seedScale:.5,
  valuation:500000000,valuationAnchor:500000000,cash:owned?1000000:150000000,debt:owned?360000000:20000000,employees:owned?900:5000,factories:1,dealers:owned?90:300,franchiseDealers:owned?85:290,companyStores:5,
  rd:owned?42:70,brandReputation:owned?34:62,dealerHealth:owned?38:65,qualityCulture:owned?40:68,status:owned?"restructuring":"active",acquired:owned,playerSubsidiary:owned,parentBudgetControl:"ai",parentAutonomy:"medium",parentOperatingModel:"balanced",parentProductMandate:"heritage",
  aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],
  powertrainPolicy:{engineSales:"off",transmissionSales:"off",allowExternalEngines:false,allowExternalTransmissions:false}
 });
 let industry=[maker("casual_owned","Casual Owned Motors",true),maker("buyer_a","Buyer A"),maker("buyer_b","Buyer B")];
 industry=global.MDXIndustrySim.simulateIndustryMonth({industry,corporateUnits:[],year:1970,month:0,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{difficulty:"casual"}}).industry;
 let seller=industry.find(x=>x.id==="casual_owned"),engine=seller.aiEngines[0],transmission=seller.aiTransmissions[0];
 assert.ok(engine&&transmission,"owned subsidiary engineering catalog did not initialize");
 for(const buyerId of ["buyer_a","buyer_b"]){
  const buyer=industry.find(x=>x.id===buyerId),suffix=buyerId.slice(-1),start=1970*12+1;
  const engineContract={id:"backed_engine_"+suffix,status:"active",buyerId:buyer.id,buyerName:buyer.name,supplierId:seller.id,supplierName:seller.name,engineId:engine.id,engineName:engine.name,monthlyUnits:5000,unitPrice:1200,engineCost:Number(engine.cost||900),termMonths:36,startPeriod:start,endPeriod:start+36,remainingMonths:36,lifetimeUnits:0,lifetimeSpend:0,shortfallMonths:0};
  buyer.aiPowertrainContracts.push({...engineContract});seller.aiPowertrainSales.push({...engineContract});
  const transmissionContract={id:"backed_tx_"+suffix,status:"active",buyerId:buyer.id,buyerName:buyer.name,supplierId:seller.id,supplierName:seller.name,transmissionId:transmission.id,transmissionName:transmission.name,monthlyUnits:5000,unitPrice:1500,transmissionCost:Number(transmission.cost||1000),termMonths:36,startPeriod:start,endPeriod:start+36,remainingMonths:36,lifetimeUnits:0,lifetimeSpend:0,shortfallMonths:0};
  buyer.aiTransmissionContracts.push({...transmissionContract});seller.aiTransmissionSales.push({...transmissionContract});
 }
 industry=global.MDXIndustrySim.simulateIndustryMonth({industry,corporateUnits:[],year:1970,month:1,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{difficulty:"casual"}}).industry;
 seller=industry.find(x=>x.id==="casual_owned");
 const contractRevenue=Number(seller.monthAiPowertrainRevenue||0)+Number(seller.monthAiTransmissionRevenue||0);
 assert.equal(seller.casualParentGrowthGuarantee,true);
 assert.ok(!["bankrupt","liquidated"].includes(String(seller.status||"")),"Casual backing allowed the subsidiary to fail terminally during stabilization");
 assert.ok([seller.brandReputation,seller.qualityCulture,seller.rd,seller.dealerHealth].every(x=>Number.isFinite(Number(x))&&Number(x)>0&&Number(x)<=100),"parent backing produced invalid operating/engineering state");
 assert.ok(seller.aiEngines.every(x=>Number.isFinite(Number(x.reliability))&&Number(x.reliability)>=45&&Number(x.reliability)<=99),"engine reliability state became invalid");
 assert.ok(seller.aiTransmissions.every(x=>Number.isFinite(Number(x.reliability))&&Number(x.reliability)>=45&&Number(x.reliability)<=99&&Number.isFinite(Number(x.smoothness))),"transmission engineering state became invalid");
 assert.ok(seller.aiCars.filter(x=>x.active).every(x=>Number.isFinite(Number(x.quality))&&Number(x.quality)>=38&&Number(x.quality)<=99&&Number.isFinite(Number(x.reliability))&&Number(x.reliability)>=38&&Number(x.reliability)<=99),"vehicle engineering state became invalid");
 assert.ok(Number(seller.monthAiPowertrainCapacity)>0&&Number(seller.monthAiTransmissionCapacity)>0,"backed supplier lost real production capacity");
 assert.ok(Number(seller.monthAiPowertrainCapacity)<10000&&Number(seller.monthAiTransmissionCapacity)<10000,"Casual backing magically created enough supply capacity to cover oversized contracts");
 assert.ok(Number(seller.monthAiPowertrainUnitsSold)>0&&Number(seller.monthAiTransmissionUnitsSold)>0,"backed supplier stopped fulfilling contracts entirely");
 assert.ok(Number(seller.monthAiPowertrainUnitsSold)<=Number(seller.monthAiPowertrainCapacity)&&Number(seller.monthAiTransmissionUnitsSold)<=Number(seller.monthAiTransmissionCapacity),"contract fulfillment exceeded physical capacity");
 assert.ok(contractRevenue>0&&contractRevenue<25000000,"contract revenue should be positive but constrained by real delivered volume");
 assert.equal(Number(seller.factories),1,"Casual backing created a free factory instead of waiting for funded expansion");
 assert.ok(Number(seller.employees)>=900,"Casual backing cut the operating workforce during stabilization");
 assert.ok(Number.isFinite(Number(seller.cash))&&Number.isFinite(Number(seller.debt)),"Casual stabilization produced invalid liquidity state");
 assert.ok(Number(seller.debt)>=0&&Number(seller.monthCasualParentGuarantee||0)===0,"Casual stabilization should not create untracked free parent cash");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/valuation:state\.valuation,difficulty:state\.difficulty/);
});

test("Standard difficulty does not activate the Casual subsidiary guarantee",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 let industry=[{id:"standard_owned",name:"Standard Owned",country:"United States",founded:1900,volumeClass:"regional",share:2,marketShare:2,focus:"Reliability",seedScale:.5,valuation:300000000,valuationAnchor:300000000,cash:50000000,debt:30000000,employees:3000,factories:1,dealers:180,franchiseDealers:175,companyStores:5,rd:55,brandReputation:40,dealerHealth:60,qualityCulture:55,status:"active",acquired:true,playerSubsidiary:true,aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],powertrainPolicy:{engineSales:"off",transmissionSales:"off",allowExternalEngines:false,allowExternalTransmissions:false}}];
 industry=global.MDXIndustrySim.simulateIndustryMonth({industry,year:1970,month:0,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{difficulty:"normal"}}).industry;
 assert.notEqual(industry[0].casualParentGrowthGuarantee,true);
 assert.ok(Number(industry[0].brandReputation)<82,"Standard subsidiary incorrectly received Casual reputation floor");
});

test("expired engine and transmission contracts cannot pin an acquired car at zero production",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 let industry=[{
  id:"orphan_supply",name:"Orphan Supply Motors",country:"United States",founded:1900,volumeClass:"regional",share:2,marketShare:2,focus:"Reliability",seedScale:.5,
  valuation:300000000,valuationAnchor:300000000,cash:100000000,debt:20000000,employees:4000,factories:1,dealers:300,franchiseDealers:290,companyStores:10,
  rd:68,brandReputation:60,dealerHealth:65,status:"active",acquired:true,playerSubsidiary:true,aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],
  aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],
  powertrainPolicy:{engineSales:"off",transmissionSales:"off",allowExternalEngines:false,allowExternalTransmissions:false}
 }];
 industry=global.MDXIndustrySim.simulateIndustryMonth({industry,year:1970,month:0,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{}}).industry;
 let company=industry[0],car=company.aiCars.find(x=>x.active);assert.ok(car,"seed vehicle missing");
 car.externalEngineContractId="dead_engine";car.externalEngineSupplier="Failed Engine Co";car.externalEngineUnitPrice=1200;car.externalTransmissionContractId="dead_transmission";car.externalTransmissionSupplier="Failed Gear Co";car.externalTransmissionUnitPrice=900;
 company.externalPowertrainInventory.dead_engine=0;company.externalTransmissionInventory.dead_transmission=0;company.aiPowertrainContracts.push({id:"dead_engine",status:"terminated",endPeriod:1970*12,remainingMonths:0});company.aiTransmissionContracts.push({id:"dead_transmission",status:"terminated",endPeriod:1970*12,remainingMonths:0});
 industry=global.MDXIndustrySim.simulateIndustryMonth({industry,year:1970,month:1,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{}}).industry;company=industry[0];car=company.aiCars.find(x=>x.id===car.id);
 assert.equal(car.externalEngineContractId,null,"dead engine contract remained attached");
 assert.equal(car.externalTransmissionContractId,null,"dead transmission contract remained attached");
 assert.ok(Number(car.lastProduced||0)>0&&Number(company.monthProduction||0)>0,"vehicle stayed at zero production after supply contract ended");
});

test("subsidiary powertrain policy blocks purchases and prioritizes owned supply sales",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const maker=(id,name,powertrainPolicy)=>({id,name,country:"United States",founded:1900,volumeClass:"regional",share:2,marketShare:2,focus:"Reliability",seedScale:.5,valuation:450000000,valuationAnchor:450000000,cash:140000000,debt:30000000,employees:6000,factories:2,dealers:400,franchiseDealers:390,companyStores:10,rd:72,brandReputation:64,dealerHealth:66,status:"active",aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],powertrainPolicy});
 let industry=[maker("priority_supplier","Priority Supply",{engineSales:"prioritize",transmissionSales:"prioritize",allowExternalEngines:false,allowExternalTransmissions:false}),maker("blocked_buyer","Blocked Buyer",{engineSales:"off",transmissionSales:"off",allowExternalEngines:false,allowExternalTransmissions:false}),maker("open_buyer","Open Buyer",{engineSales:"off",transmissionSales:"off",allowExternalEngines:true,allowExternalTransmissions:true})];
 for(let n=0;n<36;n++)industry=global.MDXIndustrySim.simulateIndustryMonth({industry,year:1970+Math.floor(n/12),month:n%12,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{}}).industry;
 const supplier=industry.find(x=>x.id==="priority_supplier"),blocked=industry.find(x=>x.id==="blocked_buyer"),open=industry.find(x=>x.id==="open_buyer");
 assert.equal(blocked.aiPowertrainContracts.length,0,"blocked subsidiary signed a new engine purchase contract");
 assert.equal(blocked.aiTransmissionContracts.length,0,"blocked subsidiary signed a new transmission purchase contract");
 assert.ok(supplier.aiPowertrainSales.length>0&&supplier.aiTransmissionSales.length>0,"prioritized subsidiary did not win engine and transmission customers");
 assert.ok(open.aiPowertrainContracts.length>0&&open.aiTransmissionContracts.length>0,"open buyer never sourced from the prioritized owned supplier");
});

test("subsidiary turnaround command center exposes measurable recovery milestones and real owner actions",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(game,/function subsidiaryTurnaroundSnapshot\(s,m\)/);
 assert.match(game,/BALANCE SHEET/);
 assert.match(game,/PLANTS \+ WORKFORCE/);
 assert.match(game,/SELLABLE LINEUP/);
 assert.match(game,/DEALER NETWORK/);
 assert.match(game,/SUSTAINED PROFIT/);
 assert.match(game,/Replace management/);
 assert.match(game,/Rebuild dealers/);
 assert.match(game,/Reopen factory/);
 assert.match(game,/Cut weakest models/);
 assert.match(game,/recordCash\("subsidiary_turnaround",-n/);
 assert.match(game,/implements for 3 months/i);
 assert.match(css,/\.turnaround-blocker-grid/);
 assert.match(css,/\.turnaround-actions-v2/);
});

test("live acquisition and subsidiary controls require funded turnarounds and expose contract policy",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function turnaroundCapitalPlan\(/);
 assert.match(game,/state\.cash-=debtPaydown;m\.debt=Math\.max/);
 assert.match(game,/FUND COMPLETE TURNAROUND/);
 assert.match(game,/POWERTRAIN CONTRACT POLICY/);
 assert.match(game,/SELL AGGRESSIVELY/);
 assert.match(game,/BLOCK NEW/);
 assert.match(game,/m\.aiSubsidiary=false;m\.aiParentId=null;m\.ownerId=null/);
});

test("subsidiary owner controls expose immediate cash and operating effects instead of silent buttons",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(game,/PARENT CASH AVAILABLE/);
 assert.match(game,/LAST ACTION/);
 assert.match(game,/function turnaroundOwnerSnapshot\(m\)/);
 assert.match(game,/function recordTurnaroundOwnerImpact\(/);
 assert.match(game,/showToast\(turnaroundImpactToast\(s\.name,impact\)\)/);
 assert.match(game,/m\.lastParentInjectionPeriod=state\.year\*12\+state\.month/);
 assert.match(game,/data-sub-fund-turnaround>FUND COMPLETE TURNAROUND/);
 assert.doesNotMatch(game,/data-sub-fund-turnaround[^>]*disabled/);
 assert.match(game,/IMPLEMENTING /);
 assert.match(sim,/hasPendingParentRequest=m\.parentCapitalRequest\?\.status==="pending"/);
 assert.match(sim,/recentParentFunding=monthsSinceParentFunding>=0&&monthsSinceParentFunding<3/);
 assert.match(sim,/!hasPendingParentRequest&&\(!recentParentFunding\|\|severeParentEmergency\)/);
});

test("persistent world events have duration and real segment/economic effects",()=>{
 const result=global.MDXWorldEvents.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\\n"));
 const s={year:1973,month:0,worldEconomy:{activeEvents:[{id:"oil_crisis",remainingMonths:8,totalMonths:10}],eventHistory:[]}};
 const e=global.MDXWorldEvents.effects(s);
 assert.ok(e.fuel>1.4);
 assert.ok(global.MDXWorldEvents.segmentMultiplier(s,"Utility")<global.MDXWorldEvents.segmentMultiplier(s,"Budget"));
});

test("rival company histories persist simulation milestones",()=>{
 const result=global.MDXCompanyHistory.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\\n"));
 const src=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(src,/MDXCompanyHistory\?\.captureMonth/);
 assert.match(src,/MDXCompanyHistory\?\.renderCompany/);
});

test("vehicle nameplates preserve full generation lineage instead of overwriting the previous generation",()=>{
 const lifecycle=fs.readFileSync(path.join(__dirname,"..","product-lifecycle.js"),"utf8");
 assert.match(lifecycle,/function normalizeGenerationRecord\(/);
 assert.match(lifecycle,/function generationLineageMarkup\(/);
 assert.match(lifecycle,/predecessorGeneration/);
 assert.match(lifecycle,/successorGeneration/);
 assert.match(lifecycle,/cumulativeRevenue/);
 assert.match(lifecycle,/peakMonthlySales/);
 assert.match(lifecycle,/launchReputation/);
 assert.match(lifecycle,/endReputation/);
 assert.match(lifecycle,/NAMEPLATE GENERATIONS/);
});

test("product management exposes the full vehicle life journey as a drilldown",()=>{
 const lifecycle=fs.readFileSync(path.join(__dirname,"..","product-lifecycle.js"),"utf8");
 assert.match(lifecycle,/function vehicleJourney\(/);
 assert.match(lifecycle,/PRODUCT LIFE JOURNEY/);
 assert.match(lifecycle,/CONCEPT/);assert.match(lifecycle,/PROTOTYPE/);assert.match(lifecycle,/TESTING/);assert.match(lifecycle,/PRESS PREVIEW/);assert.match(lifecycle,/FACTORY RAMP/);assert.match(lifecycle,/DEALER LAUNCH/);assert.match(lifecycle,/IN MARKET/);assert.match(lifecycle,/REFRESH \/ NEXT GEN/);assert.match(lifecycle,/RETIRED/);
});

test("turnaround phase 2 is a timed recovery campaign with powertrain quality and monthly checkpoints",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function ensureSubsidiaryTurnaroundProgram\(/);
 assert.match(game,/targetMonths:severity/);
 assert.match(game,/function recordSubsidiaryTurnaroundCheckpoint\(/);
 assert.match(game,/POWERTRAIN CONTINUITY/);
 assert.match(game,/QUALITY RECOVERY/);
 assert.match(game,/Secure outside powertrain/);
 assert.match(game,/emergencyPowertrainSourcingUntilPeriod=period\+18/);
 assert.match(game,/All recoverable .* factories are already open/);
 assert.match(game,/RECOVERY COMMAND/);
 assert.match(game,/RISK/);
 assert.match(game,/ACTION HISTORY/);
});

test("turnaround command supports workforce rebuilding and negotiated debt relief",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(game,/actionCard\("workforce","Rehire \+ retrain"/);
 assert.match(game,/actionCard\("debt","Renegotiate debt"/);
 assert.match(game,/Rehire \+ retrain/);
 assert.match(game,/Renegotiate debt/);
 assert.match(game,/debtRestructuringSpreadRelief/);
 assert.match(sim,/effectiveBorrowingRate/);
 assert.match(sim,/debtRestructuringMonths/);
});


test("subsidiary cash moves during the month and reconciles before monthly AI close",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function accruePlayerSubsidiaryCashDay\(\)/);
 assert.match(game,/function reconcilePlayerSubsidiaryLiveCashAccruals\(\)/);
 assert.match(game,/function refreshSubsidiaryLiveMetrics\(\)/);
 assert.match(game,/accruePlayerSubsidiaryCashDay\(\);const subsidiaryDistributionToday/);
 assert.match(game,/subsidiary_live_cash_reconciliation/);
 assert.match(game,/data-sub-live='cash'/);
 assert.match(game,/liveCashAccrualMtd/);
});

test("paid subsidiary turnaround actions keep their effects through later AI months",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const t=global.MDXIndustrySim.__test,m={playerSubsidiary:true,currentYear:1942,currentMonth:1,managementSkill:.90,recoverySkill:.91,treasuryDiscipline:.92,turnaroundManagementBoostMonths:3,turnaroundManagementSkillFloor:1.08,turnaroundRecoverySkillFloor:1.11,turnaroundTreasuryFloor:1.07,factories:0,turnaroundFactoryBoostMonths:3,turnaroundFactoryFloor:2,employees:100,turnaroundWorkforceBoostMonths:3,turnaroundEmployeeFloor:650,dealers:4,franchiseDealers:2,dealerHealth:30,turnaroundDealerBoostMonths:3,turnaroundDealerFloor:24,turnaroundDealerHealthFloor:62,qualityCulture:40,turnaroundQualityBoostMonths:3,turnaroundQualityFloor:68,turnaroundOperatingRestartMonths:3,productionSuspended:true,aiCars:[{active:true,reliability:50,quality:52,turnaroundReliabilityFloor:75,turnaroundQualityFloor:74}]};
 assert.equal(t.enforcePlayerTurnaroundModifiers(m),true);
 assert.equal(m.factories,2);assert.equal(m.employees,650);assert.equal(m.dealers,24);assert.equal(m.dealerHealth,62);assert.equal(m.qualityCulture,68);assert.equal(m.managementSkill,1.08);assert.equal(m.recoverySkill,1.11);assert.equal(m.treasuryDiscipline,1.07);assert.equal(m.productionSuspended,false);assert.equal(m.aiCars[0].reliability,75);assert.equal(m.aiCars[0].quality,74);
 assert.equal(t.agePlayerTurnaroundModifiers(m),true);assert.equal(m.turnaroundManagementBoostMonths,2);assert.equal(m.turnaroundWorkforceBoostMonths,2);assert.equal(m.turnaroundDealerBoostMonths,2);assert.equal(m.turnaroundQualityBoostMonths,2);assert.equal(m.turnaroundFactoryBoostMonths,2);assert.equal(m.turnaroundOperatingRestartMonths,2);
 assert.equal(t.agePlayerTurnaroundModifiers(m),false);assert.equal(m.turnaroundManagementBoostMonths,2,"turnaround boosts aged twice in one month");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/turnaroundManagementBoostMonths/);assert.match(game,/turnaroundEmployeeFloor/);assert.match(game,/turnaroundDealerFloor/);assert.match(game,/turnaroundQualityFloor/);assert.match(game,/turnaroundFactoryFloor/);assert.match(game,/turnaroundOperatingRestartMonths/);
});


test("simulation play starts optional music and the music preference persists",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 assert.match(html,/id="musicToggle"/);
 assert.match(game,/function ensureMusicEngine\(\)/);
 assert.match(game,/function startGameMusic\(\)/);
 assert.match(game,/function stopGameMusic\(\)/);
 assert.match(game,/function toggleMusic\(\)/);
 assert.match(game,/musicEnabled=s\.musicEnabled!==false/);
 assert.match(game,/timeRunning:false,musicEnabled:true/);
 assert.match(game,/function setSpeed\(v\).*syncGameMusic\(\)/s);
 assert.match(game,/function toggleTime\(\).*syncGameMusic\(\)/s);
 assert.match(game,/musicToggle.*toggleMusic/);
});

test("all buttons give visible tap confirmation",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(game,/closest\?\.\("button"\)/);
 assert.match(game,/classList\.add\("ui-pressed"\)/);
 assert.match(css,/button\.ui-pressed:not\(:disabled\)/);
 assert.match(css,/outline:2px solid var\(--accent\)/);
});


test("authorized development programs no longer freeze behind the general cash reserve",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(expansion,/function projectCanSpend\(state,amount,options=\{\}\)/);
 assert.match(expansion,/options&&options\.committed===true/);
 assert.match(expansion,/projectCanSpend\(state,burn,\{committed:true\}\)/);
 const committed=(game.match(/projectCanSpend\(state,burn,\{committed:true\}\)/g)||[]).length;
 assert.ok(committed>=4,"engine, vehicle, transmission and pre-production programs are not all using committed funding");
 assert.doesNotMatch(game,/p\.phase=\(state\.budgetSystem\?\.protectProjects\?"PAUSED — CASH RESERVE":"PAUSED — FUNDING"\)/);
});

test("mobile active development cards are forced inside a single viewport column",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(html,/id="programLibrary" class="program-library"/);
 assert.match(css,/\.program-library\{width:100%;min-width:0;max-width:100%\}/);
 assert.match(css,/@media\(max-width:820px\)[\s\S]*?\.program-library\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/\.program-library>\.program-card\{width:100%!important;min-width:0!important;max-width:100%!important/);
});

test("current-month saleable demand can reopen working-capital production after a zero-sales month",()=>{
 global.window=global;delete require.cache[require.resolve("../industry-sim-client.js")];require("../industry-sim-client.js");
 const company={id:"restart_demand",name:"Restart Demand Motors",country:"United States",founded:1900,vehicleStart:1900,volumeClass:"regional",seedScale:.5,share:1.2,marketShare:1.2,focus:"Mainstream",valuation:240000000,valuationAnchor:240000000,cash:-1500000,debt:150000000,employees:2600,factories:2,dealers:180,franchiseDealers:175,companyStores:5,rd:62,brandReputation:62,dealerHealth:64,qualityCulture:62,status:"active",aiBudget:{mode:"cost_control",rd:120000,quality:70000,marketing:90000,dealer:40000,admin:70000,capex:30000,reserveTarget:1500000},aiBudgetHistory:[],aiDecisionLog:[],aiCars:[{id:"restart_car",name:"Restart Car",active:true,year:1970,modelYear:1970,ageMonths:12,segment:"Mainstream",price:4300,cost:2200,reliability:68,quality:66,safety:60,handling:58,comfort:62,inventory:0,lastDemand:0,lastSales:0,lastProduced:0,lifetimeSales:12000,fieldIssues:0,recalls:0}],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[]};
 const result=global.MDXIndustrySim.simulateIndustryMonth({industry:[company],corporateUnits:[],industrialCompanies:[],year:1970,month:0,economy:{fuelPrice:.36,consumerConfidence:68,interestRate:7},player:{difficulty:"normal"}}).industry[0];
 assert.ok(Number(result.aiCars[0].lastDemand||0)>0,"test company did not have live demand");
 assert.ok(Number(result.monthProduction||0)>0,"current demand failed to fund any production after prior zero sales");
 assert.ok(Number(result.monthSales||0)>0,"company remained in a zero-sales lock despite viable current demand");
 assert.ok(Number(result.demandBackedWorkingCapitalLimit||0)>0,"viable demand did not create a revolving working-capital limit");
});

test("rivals stop building into extreme unsold inventory and parent overflow respects retail sell-through",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/sellableDemand=Math\.max\(0,Math\.min\(demand,dealerThroughput\)\)/);
 assert.match(sim,/freezeProduction=openingInv>Math\.max\(250,targetInv\*1\.8,sellableDemand\*2\.25\)/);
 assert.match(sim,/plannedProduction=freezeProduction\?0:/);
 assert.match(sim,/stock>Math\.max\(target\*1\.25,retailCeiling\*\.75\)\?0/);
 assert.match(sim,/retailCeiling-Number\(c\.lastSales\|\|0\)/);
});

test("industrial market has multiple competitors mixed ownership and direct parent cash controls",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(corp,/function industrialMarketSeeds\(state\)/);
 assert.match(corp,/\["engine","transmission","steel","electronics"\]\.includes\(kind\)\?5:4/);
 assert.match(corp,/function seedIndustrialOpeningOwnership\(state\)/);
 assert.match(corp,/ownerType="automaker"/);
 assert.match(corp,/ownerType=roll<\.36\?"private_equity":"private_holding"/);
 assert.match(corp,/function processAiIndustrialOwnership\(state,log\)/);
 assert.match(corp,/function withdrawIndustrialCash\(state,id,amount="max",log\)/);
 assert.match(corp,/function divestIndustrial\(state,id,log\)/);
 assert.match(corp,/SWEEP EXCESS CASH/);
 assert.match(corp,/SELL COMPANY/);
 assert.match(game,/data-industrial-withdraw/);
 assert.match(game,/SELL ENTIRE COMPANY/);
});

test("AI automakers can blend in-house and owned industrial powertrains",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(game,/industrialCompanies:state\.industrialCompanies\|\|\[\]/);
 assert.match(sim,/function ownedIndustrialSupplier\(industrialCompanies,ownerId,kind\)/);
 assert.match(sim,/function applyOwnedIndustrialPowertrainChoice\(m,car,engineSupplier,transmissionSupplier,year\)/);
 assert.match(sim,/engineSourceType=car\.externalEngineContractId\?"external_contract":useEngine\?"owned_industrial_supplier":"in_house"/);
 assert.match(sim,/transmissionSourceType=car\.externalTransmissionContractId\?"external_contract":useTransmission\?"owned_industrial_supplier":"in_house"/);
 assert.match(sim,/industrialPowertrainIntegration=/);
});


test("industrial manager uses dark non-rubber-band mobile controls and exposes every owned company",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(game,/ownedPeers=\(state\.industrialCompanies\|\|\[\]\)\.filter\(x=>x\.parentOwned\)/);
 assert.match(game,/data-industrial-company=/);
 assert.match(game,/SELECT ANY COMPANY TO MANAGE/);
 assert.match(game,/scrollTop=Math\.min\(scrollTop,card\.scrollHeight-card\.clientHeight\)/);
 assert.match(css,/#industrialModal \.industrial-tabs\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/#industrialModal \.industrial-tabs button\{[\s\S]*?background:linear-gradient\(180deg,#10202d,#0a151e\)!important/);
 assert.match(css,/@media\(max-width:820px\)[\s\S]*?#industrialModal \.industrial-tabs\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/#industrialModal \.subsidiary-manager-card\{[\s\S]*?overflow-y:auto!important/);
});

test("expanded industrial market repairs duplicate generated names without collapsing same-industry companies",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/usedNames=new Set\(base\.map/);
 assert.match(corp,/industrial-name-offset\|/);
 assert.match(corp,/if\(!usedNames\.has\(candidate\.toLowerCase\(\)\)\)/);
 assert.match(corp,/marketNamingVersion:2/);
 assert.match(corp,/previousGeneratedNames/);
 assert.match(corp,/const uniqueById=new Map\(\)/);
 assert.match(corp,/canonicalOwned=\[\.\.\.new Set\(state\.industrialCompanies\.filter\(c=>c\.parentOwned\)\.map\(c=>c\.id\)\)\]/);
 assert.match(corp,/const owned=state\.industrialCompanies\.filter\(c=>c\.parentOwned\)/);
});

test("game music mix is materially louder than the original near-silent mix",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function musicVoice\(freq,start,duration,gain=\.045,type="triangle"\)/);
 assert.match(game,/musicVoice\(chord\[0\]\/2,now,1\.55,\.065,"sine"\)/);
 assert.match(game,/musicVoice\(melody,now\+\.22,1\.0,\.028,"sine"\)/);
 assert.match(game,/exponentialRampToValueAtTime\(\.88,now\+\.35\)/);
});

test("historical corporate layer no longer double-ages rival bankruptcy or restores 1970-era value floors",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8"),start=game.indexOf("function processHistoricalCorporateWorld"),end=game.indexOf("\\nfunction ",start+20),block=game.slice(start,end);
 assert.match(game,/function historicalCorporateFloor\(/);
 assert.doesNotMatch(block,/m\.bankruptcyMonths=Number\(m\.bankruptcyMonths\|\|0\)\+1/);
 assert.doesNotMatch(block,/Math\.max\(8e6,u\.valuation/);
 assert.doesNotMatch(block,/Math\.max\(5e6,Number\(m\.valuation/);
});

test("independent bankrupt rivals progress into liquidation and keep falling toward salvage value",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const m={id:"estate_lifecycle",name:"Estate Lifecycle Motors",country:"USA",status:"bankrupt",valuation:12000000,currentYear:1970,currentMonth:0,volumeClass:"niche",factories:0,preBankruptcyFactories:1,employees:80,preBankruptcyEmployees:700,dealers:2,preBankruptcyDealers:24,debt:9000000,cash:-500000,rd:45,brandReputation:38,aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],patents:2,corporateMemory:{},boardDecisions:[]};
 const events=[];const opening=m.valuation;
 for(let n=0;n<8;n++){m.currentMonth=n%12;global.MDXIndustrySim.__test.advanceBankruptcyLifecycle(m,[],events);}
 assert.equal(m.status,"liquidated");
 assert.ok(m.valuation<opening,"bankrupt rival value did not decay before liquidation");
 assert.ok(Number(m.bankruptcyEstate.askingPrice)>0,"liquidation estate lost its asking price");
 assert.equal(m.bankruptcyEstate.valuationMethod,"distressed_salvage");
 assert.ok(events.some(x=>/liquidation/i.test(x)),"liquidation event was not emitted");
});

test("rival screen exposes distress filters, low-to-high value sorting and estate asks",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(html,/data-company-filter="distress"/);
 assert.match(html,/data-company-filter="estate"/);
 assert.match(html,/value="value-asc"/);
 assert.match(game,/function companyMarketBucket\(/);
 assert.match(game,/ESTATE ASK/);
 assert.match(game,/companyMarketValue/);
 assert.doesNotMatch(game,/function corporateUnitPurchasePrice\(u\)\{[^}]*Math\.max\(5e6/);
});

test("1940 player economy scales payroll factories retail R&D and tooling below 1970 nominal costs",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const engineFamilies=fs.readFileSync(path.join(__dirname,"..","powertrain-families.js"),"utf8");
 const txFamilies=fs.readFileSync(path.join(__dirname,"..","transmission-families.js"),"utf8");
 assert.ok(global.MDX_CORE.economicIndex("wages",1940)<global.MDX_CORE.economicIndex("wages",1970));
 assert.ok(global.MDX_CORE.economicIndex("construction",1940)<global.MDX_CORE.economicIndex("construction",1970));
 assert.ok(global.MDX_CORE.economicIndex("retailOperations",1940)<global.MDX_CORE.economicIndex("retailOperations",1970));
 assert.match(expansion,/function eraIndex\(state,category="industrialAssets"\)/);
 assert.match(expansion,/wage=Math\.max\(120,Math\.round\(780\*eraIndex\(state,"wages"\)\/5\)\*5\)/);
 assert.match(expansion,/balanceMigrationEarlyEraPayrollV1/);
 assert.match(expansion,/eraMoney\(state,18500000(?:\*spec\.overhead)?,"construction"/);
 assert.match(expansion,/eraMoney\(state,425000,"marketing"/);
 assert.match(expansion,/eraMoney\(state,18000,"retailOperations"/);
 assert.match(expansion,/eraMoney\(state,1450000,"construction"/);
 assert.match(expansion,/eraMoney\(state,5000000,"industrialAssets"/);
 assert.match(expansion,/eraMoney\(state,t\.dev,"research"/);
 assert.match(expansion,/plantEra=eraIndex\(state,"construction"\)/);
 assert.match(game,/CORE\?\.economicIndex\?CORE\.economicIndex\("industrialAssets",Number\(state\.year\|\|1970\)\)/);
 assert.match(engineFamilies,/CORE\.economicIndex\?CORE\.economicIndex\("industrialAssets",year\)/);
 assert.match(txFamilies,/CORE\.economicIndex\?CORE\.economicIndex\("industrialAssets",year\)/);
});

test("pre-1970 rival treasury no longer budgets payroll plants or emergency financing in 1970 dollars",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/inflation=nominalIndex\(year\)/);
 assert.match(sim,/Math\.max\(8000000\*nominalIndex\(year\),valuation\*\.045\)/);
 assert.match(sim,/Math\.max\(5000000\*nominalIndex\(Number\(m\.currentYear\|\|1970\)\),value\*\.10\)/);
 assert.doesNotMatch(sim,/inflation=Math\.pow\(1\.032,Math\.max\(0,year-1970\)\)/);
});


test("legacy early-era valuation-only repair now restores the whole viable automaker instead of creating a bankruptcy cascade",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const hooks=global.MDXIndustrySim.__test,car=(id)=>({id,name:id,year:1940,modelYear:1940,segment:"Mainstream",price:2800,cost:1750,active:false,ageMonths:40,inventory:0,lastSales:0,lastDemand:0,lifetimeSales:5000,fieldIssues:0,recalls:0});
 const reference={id:"legacy_major",name:"Legacy Major",valuation:320000000,debt:46000000,cash:52000000,factories:6,employees:26000,dealers:760,monthSales:18000,modelCount:4,aiBudget:{rd:170000,quality:90000,marketing:130000,dealer:60000,admin:100000,capex:80000}};
 const broken={id:"legacy_major",name:"Legacy Major",currentYear:1944,currentMonth:4,volumeClass:"mass",seedScale:1,valuation:300000000,valuationAnchor:300000000,cash:-42000000,debt:1350000000,factories:0,employees:80,dealers:42,franchiseDealers:40,companyStores:2,monthSales:0,status:"bankrupt",lossMonths:18,distressMonths:12,restructuringMonths:0,bankruptcyMonths:5,rd:62,brandReputation:72,dealerHealth:40,qualityCulture:65,aiCars:[car("A"),car("B"),car("C")],aiBudget:{mode:"austerity",rd:9000000,quality:7000000,marketing:12000000,dealer:6000000,admin:8000000,capex:5000000},aiDecisionLog:[]};
 assert.equal(hooks.repairLegacyEarlyEraScaleDamage(broken,reference,[]),true);
 assert.equal(broken.status,"active");assert.ok(broken.debt<broken.valuation*.60,"legacy debt was not rebased with value");assert.ok(broken.cash>0,"liquidity was not restored");assert.ok(broken.factories>=4&&broken.employees>=16000&&broken.dealers>=500,"operating footprint remained collapsed");assert.ok(broken.aiCars.some(c=>c.active),"saleable products were not restored");assert.ok(broken.aiBudget.marketing<1000000,"1970-dollar legacy budget survived repair");
 const historical={...broken,id:"historical_fail",name:"Historical Fail",status:"bankrupt",historical:{type:"bankruptcy",year:1943},legacyEarlyEraScaleDamageRepair:null};assert.equal(hooks.repairLegacyEarlyEraScaleDamage(historical,{...reference,id:"historical_fail"},[]),false,"a due historical bankruptcy should not be silently resurrected");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");assert.match(game,/function repairLegacyEarlyEraCorporateEconomyV2\(\)/);assert.match(game,/earlyEraCorporateEconomyRepairV2/);assert.match(game,/repairLegacyEarlyEraCorporateEconomyV2\(\);repairSystemicAutomakerScaleV4\(\);repairOwnedCasualSubsidiaryScaleOnLoad/);
});

test("1940 rival and industrial economics use real pre-1970 scaling instead of 1970-dollar floors",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const hooks=global.MDXIndustrySim.__test;
 assert.ok(hooks.nominalIndex(1940)<.45,"1940 rival nominal index is still effectively using 1970 dollars");
 assert.ok(hooks.nominalIndex(1950)<hooks.nominalIndex(1960));
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(game,/function historicalIndustryMaturity\(year=1970\)/);
 assert.match(game,/function historicalIndustryValueScale\(seedYear=1970,activationYear=1970\)/);
 assert.match(game,/\[\[1940,\.10\],\[1950,\.20\],\[1960,\.42\],\[1970,1\]\]/);
 assert.match(game,/repairEarlyEraCorporateValues\(\)/);
 assert.match(corp,/function industrialEraIndex\(state,category="industrialAssets"\)/);
 assert.match(corp,/function industrialValuationTarget\(state,c,revenue,net,basePrice\)/);
 assert.match(corp,/move=clamp\(gap\*\.18,-\.10,\.08\)/);
 assert.match(corp,/priceEra=industrialEraIndex\(state,"manufacturing"\)/);
 assert.doesNotMatch(corp,/c\.value=Math\.max\(500000,Math\.round\(\(Math\.max\(0,revenue\)\*\.45/);
});

test("industrial valuation cannot jump from a small 1940 supplier into a hundred-million company in one month",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/updateIndustrialValuation\(state,c,revenue,net,base\)/);
 assert.match(corp,/monthlyValueMove=move/);
 assert.match(corp,/ttmRevenue/);
 assert.match(corp,/ttmNetProfit/);
 assert.match(corp,/productiveAssets/);
});

test("rival valuations can fall below the old forty-million hard floor",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const floor=global.MDXIndustrySim.__test.rivalValuationFloor({id:"tiny",status:"distressed",volumeClass:"niche",factories:0,currentYear:1970});
 assert.ok(floor>0&&floor<40000000,"dynamic rival floor still behaves like the old $40M clamp");
 const industry=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.doesNotMatch(industry,/m\.valuation=Math\.max\(40000000,prior\*\(1\+move\)\)/);
});

test("funded acquisitions expose total cash and fair full-buy offers are not randomly rejected",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/fullAcquisition=mode==="subsidiary"/);
 assert.match(game,/if\(p>=requiredPremium\)return 1/);
 assert.match(game,/TOTAL CASH REQUIRED NOW/);
 assert.match(game,/Need "\+money\(totalCashRequired\)\+" total cash to start this acquisition/);
});

test("bankruptcy estates are valued as distressed salvage instead of inheriting a forty-million style floor",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/valuationMethod:"distressed_salvage"/);
 assert.match(game,/distressFactor=status==="liquidated"\?\.42:\.58/);
 assert.match(game,/askingFloor=Math\.max\(250000\*era,v\*\.10\)/);
 assert.doesNotMatch(game,/askingPrice:Math\.max\(5000000/);
 assert.match(game,/targetCash=Math\.max\(750000,value\*\.035,monthlyFixed\*3\)/);
});

test("finance UI exposes a reconciled cash-origin audit and explicit integrity corrections",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/WHERE DID THE MONEY COME FROM\?/);
 assert.match(game,/Cash Origin Audit/);
 assert.match(game,/UNEXPLAINED \/ UNTRACED CASH/);
 assert.match(game,/recordCash\("cashIntegrityCorrection",-correction/);
 assert.match(game,/A non-zero untraced amount is treated as a simulation bug signal, not income/);
});

test("M&A cash is reserved in escrow and failed deals release it",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function pendingDealEscrowTotal\(/);
 assert.match(game,/function refundDealEscrow\(/);
 assert.match(game,/function consumeDealEscrow\(/);
 assert.match(game,/recordCash\("dealEscrow",-escrowCash/);
 assert.match(game,/refundDealEscrow\(d,"seller rejected the offer"\)/);
 assert.match(game,/RESTRICTED M&A ESCROW/);
 assert.match(game,/Escrow protection:/);
 assert.match(game,/dealEscrowRefund/);
});

test("M&A escrow movements reconcile as investing cash flow",()=>{
 const r=global.MDX_CORE.cashReconciliation({
  openingCash:100,
  closingCash:70,
  dailyRows:[],
  transactionRows:[
   {category:"dealEscrow",amount:-40},
   {category:"dealEscrowRefund",amount:10}
  ],
  summary:{}
 });
 assert.equal(r.cashChange,-30);
 assert.equal(r.investingCashFlow,-30);
 assert.equal(r.cashReconciliationResidual,0);
});

test("idle pre-revenue companies are protected from unsupported cash and valuation windfalls",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function hasPlayerCommercialIncomeSource\(/);
 assert.match(game,/function correctIdleCompanyCashWindfall\(/);
 assert.match(game,/idleCashCorrection=correctIdleCompanyCashWindfall/);
 assert.match(game,/const preRevenue=Number\(state\.lifetimeRevenue\|\|0\)<=0&&!hasPlayerCommercialIncomeSource\(\)/);
});

test("large established rival does not enter a valuation-driven bankruptcy loop",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 let industry=[{
  id:"legacy_mass",name:"Legacy Global Motors",country:"Japan",founded:1937,share:10.2,marketShare:10.2,focus:"Reliability • manufacturing efficiency",seedScale:1,
  valuation:11200000000,valuationAnchor:11200000000,cash:1600000000,debt:2100000000,employees:92000,factories:8,dealers:2600,franchiseDealers:2580,companyStores:20,
  rd:78,brandReputation:"N/A",dealerHealth:74,status:"active",aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],
  externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[]
 }];
 for(let n=0;n<60;n++){
  const year=1970+Math.floor(n/12),month=n%12,result=global.MDXIndustrySim.simulateIndustryMonth({industry,corporateUnits:[],year,month,economy:{fuelPrice:.36,consumerConfidence:66,interestRate:7},player:{}});
  industry=result.industry;
 }
 const company=industry[0];
 assert.ok(!["bankrupt","liquidated"].includes(company.status),"established mass-market rival entered an artificial bankruptcy loop");
 assert.ok(Number.isFinite(company.valuation)&&company.valuation>=1000000,"valuation became invalid");
 assert.ok(Number.isFinite(company.brandReputation),"brand reputation became invalid");
 assert.ok(Number(company.monthSales||0)>0,"established rival stopped selling vehicles");
});


test("mixed rival industry remains broadly healthy across a decade instead of collapsing into a bankruptcy spiral",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 assert.ok(global.MDXIndustrySim?.simulateIndustryMonth,"industry simulator did not load");
 const maker=(id,volumeClass,index)=>{
  const mass=volumeClass==="mass",regional=volumeClass==="regional";
  const valuation=mass?(4200000000+index*850000000):regional?(850000000+index*160000000):(180000000+index*55000000);
  const factories=mass?6+(index%4):regional?2+(index%3):1+(index%2);
  const employees=mass?36000+index*5200:regional?6200+index*1250:950+index*420;
  const dealers=mass?1450+index*170:regional?430+index*85:95+index*35;
  return{
   id,name:"Long Run "+volumeClass+" "+index,country:index%2?"United States":"Japan",founded:1900+index,
   volumeClass,share:mass?6.8+index*.35:regional?1.9+index*.18:.35+index*.06,marketShare:mass?6.8+index*.35:regional?1.9+index*.18:.35+index*.06,
   focus:mass?"Mass market • reliability":regional?"Regional mainstream • value":"Specialist niche • engineering",
   seedScale:mass?1:regional?.62:.26,valuation,valuationAnchor:valuation,cash:valuation*(mass?.20:regional?.18:.22),debt:valuation*(mass?.13:regional?.12:.08),
   employees,factories,dealers,franchiseDealers:Math.max(1,dealers-10),companyStores:Math.min(10,dealers),rd:mass?74:index%2?66:59,
   brandReputation:index%5===0?"N/A":mass?72:regional?61:54,dealerHealth:index%7===0?"N/A":mass?75:regional?66:58,status:"active",
   aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},
   aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[]
  };
 };
 let industry=[
  ...Array.from({length:6},(_,i)=>maker("mass_"+i,"mass",i)),
  ...Array.from({length:6},(_,i)=>maker("regional_"+i,"regional",i)),
  ...Array.from({length:6},(_,i)=>maker("niche_"+i,"niche",i))
 ];
 const sold=new Set();let peakDead=0;
 for(let n=0;n<120;n++){
  const year=1970+Math.floor(n/12),month=n%12,cycle=Math.sin(n/13),economy={fuelPrice:.38+Math.max(0,cycle)*.22,consumerConfidence:64+cycle*9,interestRate:6.5+Math.max(0,-cycle)*2.2};
  const result=global.MDXIndustrySim.simulateIndustryMonth({industry,corporateUnits:[],year,month,economy,player:{}});
  industry=result.industry;
  for(const m of industry)if(Number(m.monthSales||0)>0)sold.add(m.id);
  peakDead=Math.max(peakDead,industry.filter(m=>["bankrupt","liquidated"].includes(String(m.status||""))).length);
 }
 const alive=industry.filter(m=>!["bankrupt","liquidated"].includes(String(m.status||"")));
 const aliveMass=alive.filter(m=>m.volumeClass==="mass").length,aliveRegional=alive.filter(m=>m.volumeClass==="regional").length,aliveNiche=alive.filter(m=>m.volumeClass==="niche").length;
 assert.ok(peakDead<=6,"systemic bankruptcy spiral killed more than one-third of rivals at the same time");
 assert.ok(alive.length>=12,"fewer than two-thirds of mixed rivals survived the decade");
 assert.ok(aliveMass>=5,"too many large mass-market manufacturers failed");
 assert.ok(aliveRegional>=4,"regional manufacturers collapsed too broadly");
 assert.ok(aliveNiche>=3,"niche manufacturers collapsed too broadly");
 assert.ok(sold.size>=14,"too many rivals never managed to sell vehicles during the decade");
 for(const m of alive){
  assert.ok(Number.isFinite(Number(m.brandReputation))&&Number(m.brandReputation)>=15,m.name+" has invalid/poisoned reputation");
  assert.ok(Number(m.factories||0)>=1,m.name+" lost all vehicle-production factories while still alive");
  assert.ok(Number.isFinite(Number(m.valuation))&&Number(m.valuation)>=1000000,m.name+" has invalid valuation");
 }
});

test("established dealer networks retain a realistic minimum sales channel without making bad products immune to demand loss",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];require("../industry-sim-client.js");
 const demand=global.MDXIndustrySim.__test.productDemand,company={id:"continuity_mass",name:"Continuity Motors",volumeClass:"mass",seedScale:1,valuation:5000000000,brandReputation:72,dealerHealth:62,dealers:2400,franchiseDealers:2350,aiBudget:{marketing:1200000},openingFinancialBaseline:{monthSales:52000},aiCars:[]},cars=Array.from({length:4},(_,i)=>({id:"continuity_car_"+i,segment:i===0?"Budget":"Mainstream",ageMonths:105,cost:5200,price:12200,reliability:58,quality:57}));
 company.aiCars=cars.map(c=>({...c,active:true}));const total=company.aiCars.reduce((sum,car)=>sum+demand(car,company,{fuelPrice:.65,consumerConfidence:58,interestRate:9},{}),0);
 assert.ok(total>=6000,"large established dealer network collapsed to implausibly tiny monthly sales");
 assert.ok(total<52000,"continuity floor erased product-age/value penalties instead of merely preventing a simulation deadlock");
});

test("healthy-liquidity restructuring advances its clock and exits instead of remaining stuck forever",()=>{
 delete require.cache[require.resolve("../industry-sim-client.js")];require("../industry-sim-client.js");
 const finance=global.MDXIndustrySim.__test.financeCompany,company={id:"turnaround_clock",name:"Turnaround Clock",status:"restructuring",valuation:600000000,valuationAnchor:600000000,cash:90000000,debt:90000000,workingCapitalDebt:0,demandBackedWorkingCapitalDebt:0,monthLiquidityReserve:25000000,monthRevenue:42000000,monthProfit:500000,monthOperatingCashFlow:1200000,monthFinancingCashFlow:0,monthSales:4800,lossMonths:0,distressMonths:4,restructuringMonths:6,recoveryProfitMonths:0,restructuringHealthyLiquidityMonths:0,employees:4800,factories:3,dealers:260,franchiseDealers:250,companyStores:10,aiCars:[{active:true,lastDemand:1500}],aiBudget:{reserveTarget:25000000},managementSkill:1,recoverySkill:1,treasuryDiscipline:1,riskTolerance:1,currentYear:1975,currentMonth:0,corporateMemory:{},aiDecisionLog:[]};
 for(let month=0;month<8&&company.status==="restructuring";month++){company.currentMonth=month%12;company.monthProfit=500000;company.monthOperatingCashFlow=1200000;finance(company,[],{interestRate:7},[company],[]);}
 assert.equal(company.status,"active","solvent turnaround remained indefinitely stuck in restructuring");
});

test("merger liquidity bridge is debt-sized and bounded",()=>{
 const bridge=global.MDX_CORE.mergerLiquidityBridge({cash:0,valuation:231000000,hasMergedOperations:true});
 assert.equal(bridge.draw,4620000);
 assert.equal(bridge.targetCash,4620000);
 assert.equal(global.MDX_CORE.mergerLiquidityBridge({cash:6000000,valuation:231000000,hasMergedOperations:true}).draw,0);
 assert.equal(global.MDX_CORE.mergerLiquidityBridge({cash:0,valuation:231000000,hasMergedOperations:false}).draw,0);
});

test("zero-cash merger repair is wired into the live game",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/repairMergerZeroCashSoftlock\(\)/);
 assert.match(game,/Post-merger working-capital facility/);
 assert.match(game,/ensureMergerOperatingLiquidity\("merger_close"\)/);
});

test("poisoned merger cash recovers from the latest finite cash ledger balance",()=>{
 const poisoned={cash:null,monthOpeningCash:null,cashLedger:[{ending:null},{ending:4321000}],year:1972,month:0,day:17};
 const result=global.MDX_CORE.repairNonFiniteCash(poisoned,6000000);
 assert.equal(result.repaired,true);
 assert.equal(result.source,"cash ledger");
 assert.equal(poisoned.cash,4321000);
 assert.equal(poisoned.monthOpeningCash,4321000);
});

test("Continue metadata cannot outlive the active save",()=>{
 const memory=new MemoryStorage();
 memory.setItem("motorDynastyRebuild02.meta",JSON.stringify({company:"Phantom Motors",revision:42}));
 const adapter=new global.MDXStorage.WebLocalAdapter(memory,{enableVault:false});
 assert.equal(adapter.load(),null);
 assert.equal(adapter.getMetadata(),null);
});

test("an interrupted verified candidate is promoted exactly once",()=>{
 const memory=new MemoryStorage();
 const adapter=new global.MDXStorage.WebLocalAdapter(memory,{enableVault:false});
 adapter.save(state({saveRevision:4}));
 const candidate=state({cash:9000000,saveRevision:5,lastLocalSaveAt:"2026-01-01T00:05:00.000Z"});
 memory.setItem("motorDynastyRebuild02.tmp",JSON.stringify(candidate));
 assert.equal(adapter.load().saveRevision,5);
 assert.equal(adapter.load().cash,9000000);
 assert.equal(memory.getItem("motorDynastyRebuild02.tmp"),null);
});

test("New Company atomically replaces a large active campaign without duplicating it",()=>{
 const old=state({company:"Old Campaign",campaignId:"old-campaign",year:1975,history:[{text:"x".repeat(2400)}]});
 const replacement=state({company:"Alder Motors",campaignId:"new-campaign",cash:60000000,history:[]});
 const oldBytes=JSON.stringify(old).length,replacementBytes=JSON.stringify(replacement).length;
 const memory=new QuotaStorage(oldBytes*3+2000),adapter=new global.MDXStorage.WebLocalAdapter(memory,{enableVault:false});
 adapter.save(old);
 memory.limit=Math.max(oldBytes,replacementBytes)+900;
 assert.throws(()=>adapter.save(replacement),/Outgoing campaign could not be archived|Quota exceeded/);
 assert.equal(adapter.load().company,"Old Campaign");
 const result=adapter.save(replacement,{replaceActiveCampaign:true});
 assert.equal(result.replaced,true);
 assert.equal(adapter.load().company,"Alder Motors");
 assert.equal(memory.getItem("motorDynastyRebuild02.tmp"),null);
 assert.equal(memory.getItem("motorDynastyRebuild02.recovery"),null);
 assert.equal(memory.getItem("motorDynastyRebuild02.campaignArchives"),null);
 assert.throws(()=>adapter.save({...replacement,month:99},{replaceActiveCampaign:true}),/Invalid month/);
 assert.equal(adapter.load().company,"Alder Motors");
});

test("commercial demand repairs corrupted legacy reputation without replacing the campaign",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const start=game.indexOf("function monthlyDemandEstimate(v){"),end=game.indexOf("\nfunction processVehicleOperationsDay(){",start);
 assert.ok(start>=0&&end>start,"monthlyDemandEstimate must remain in game.js");
 const source=game.slice(start,end);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const simState={year:1973,rep:-250,dealers:240,difficulty:"normal",industry:[]};
 const economySnapshot=()=>({consumerConfidence:67});
 const productMarketingLift=()=>3.4;
 const difficultyRules=()=>({rep:20,demand:1});
 const demandFn=new Function("CORE","clamp","state","economySnapshot","productMarketingLift","difficultyRules",source+";return monthlyDemandEstimate;")(global.MDX_CORE,clamp,simState,economySnapshot,productMarketingLift,difficultyRules);
 const priorMDX=global.MDX;global.MDX={};
 try{
  const vehicle={segment:"Luxury",msrp:8500,rampMonths:3,stats:{className:"Luxury",unitCost:4661,manufacturingUnitCost:4661,quality:72,reliability:72,rel:72,mpg:18,hp:160}};
  const demand=demandFn(vehicle);
  assert.ok(Number.isFinite(demand)&&demand>100,"corrupted legacy reputation must not collapse a healthy marketed luxury model to the six-unit floor");
  assert.equal(vehicle.demandDiagnostics.reputationUsed,1);
  assert.equal(vehicle.demandDiagnostics.reputationRepaired,true);
 }finally{global.MDX=priorMDX;}
 assert.match(game,/CORE\?\.normalizeReputation\?CORE\.normalizeReputation\(s\.rep,p\.rep\)/);
 assert.match(game,/v\.commercialForecast\?\?monthlyDemandEstimate\(v\)/);
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/finite\(region\.partnerPromoMultiplier,1\)/);
 assert.match(expansion,/Number\.isFinite\(result\)&&result>0\?clamp\(result/);
});


test("product planning workspace is compact and business cases open the real vehicle designer",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const planning=fs.readFileSync(path.join(__dirname,"..","vehicle-planning.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(expansion,/CREATE \+ DESIGN/);
 assert.match(expansion,/data-open-proposal/);
 assert.match(expansion,/mdx:open-product-proposal/);
 assert.match(expansion,/ops-compact-details/);
 assert.match(expansion,/platform-create-details/);
 assert.match(game,/mdx:open-product-proposal/);
 assert.match(game,/proposalId:p\.id/);
 assert.match(planning,/const reusable=\(state\.productPlanning\.proposals\|\|\[\]\)\.find/);
 assert.match(css,/PRODUCT PLANNING COMPACT PASS V2/);
});

test("Vercel/browser saves use an IndexedDB active slot instead of localStorage only",()=>{
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(storageSource,/ACTIVE_STORE="activeSave"/);
 assert.match(storageSource,/VAULT_VERSION=3/);
 assert.match(storageSource,/async function putActiveDurable\(state,reason="autosave",prepared=null\)/);
 assert.match(storageSource,/async function putActiveDurableFast\(state,reason="autosave"\)/);
 assert.match(storageSource,/async function loadActiveDurable\(\)/);
 assert.match(storageSource,/ACTIVE_BACKUP_ID="previous"/);
 assert.match(storageSource,/DEVICE_CACHE="motor-dynasty-device-save-v1"/);
 assert.match(storageSource,/function chooseDurableActive\(rows=\[\]\)/);
 assert.match(storageSource,/function chooseCacheDurable\(rows=\[\]\)/);
 assert.match(storageSource,/async function putCacheDurable\(state,reason="autosave",prepared=null\)/);
 assert.match(storageSource,/Cache active-save verification failed/);
 assert.match(storageSource,/IndexedDB active-save verification failed/);
 assert.match(storageSource,/await this\.checkpointDurable\(next\.state,next\.reason\)/);
 assert.match(storageSource,/queueDurableSave\(state,reason="autosave"\)/);
 assert.match(storageSource,/preferStateCandidate/);
 assert.match(game,/STORAGE\?\.queueDurableSave/);
 assert.match(game,/Browser localStorage is full\/unavailable • saving to durable device storage/);
 assert.match(game,/await STORAGE\.flushDurableSave\(\)/);
 assert.match(game,/resolved=await STORAGE\.load\(\)/);
 assert.match(game,/REDUNDANT DEVICE SAVE/);
 assert.match(game,/SAVE_HEARTBEAT_MS=60000,SAVE_ACTION_DELAY_MS=12000/);
 assert.match(game,/function runQueuedSave\(\)/);
 assert.match(game,/requestIdleCallback\(persist,\{timeout:3000\}\)/);
 assert.match(game,/saveGame\("heartbeat"\)/);
 assert.match(storageSource,/const prepared=\{encoded,snapshot,valid\}/);
 assert.match(storageSource,/globalThis\.indexedDB&&!fullVerify/);
 assert.match(game,/rolling durable snapshot/);
 assert.match(game,/async function verifyCurrentSave\(\)/);
 assert.match(game,/SAVE \+ VERIFY/);
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(sw,/DEVICE_SAVE_CACHE="technology-dynasty-device-save-v1"/);
 assert.match(sw,/k!==DEVICE_SAVE_CACHE/);
});


test("vehicle launch completion never auto-locks or pauses mobile gameplay",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 assert.doesNotMatch(game,/setTimeout\(\(\)=>showLaunchReception\(v\),80\)/);
 const start=game.indexOf("function showLaunchReception(v){"),end=game.indexOf("\nfunction saveVehicle(){",start);
 assert.ok(start>=0&&end>start,"launch review viewer missing");
 const launchViewer=game.slice(start,end);
 assert.doesNotMatch(launchViewer,/state\.timeRunning=false/);
 assert.match(game,/v\.launchReceptionUnread=true/);
 assert.match(game,/data-review-product/);
 assert.match(index,/game\.js\?build=viewport-metric-20261019-v3/);
});

test("first production day after a new car launch stays responsive and demand work is cached",()=>{
 if(!global.MDX_DATA)require("../expansion-data.js");
 delete require.cache[require.resolve("../expansion.js")];
 require("../expansion.js");
 assert.ok(global.MDX?.dailyVehicleOps,"production simulator did not load");
 const s={company:"Launch Soak Motors",campaignId:"launch-freeze-soak",year:1970,month:0,day:12,daysPlayed:100,monthsPlayed:0,difficulty:"normal",hq:"usa",cash:1000000000,debt:0,valuation:120000000,rep:55,employees:300,factories:1,lifetimeRevenue:0,lifetimeUnits:0,vehicles:[{id:"launch_car",name:"Launch Car",year:1970,createdYear:1970,modelYear:1970,generation:1,body:"sedan",target:"Family",engineId:null,transmissionId:null,msrp:5200,active:true,productionEnabled:true,productionStatus:"production",productionStartsAfterDay:101,autoProduction:true,inventory:0,lifetimeSales:0,regionalInventory:{},regionalSales:{},regionalWaitlist:{},defects:[],customerSatisfaction:72,design:{body:"sedan",target:"Family",propulsion:"ice"},stats:{className:"Family",power:110,hp:110,weight:1250,mpg:24,handling:58,comfort:66,luxury:30,safety:60,reliability:78,quality:76,unitCost:3100,manufacturingUnitCost:3100}}],engines:[],transmissions:[],subsidiaries:[],industry:[],industrialCompanies:[],vehiclePrograms:[],enginePrograms:[],transmissionPrograms:[],platformPrograms:[],modelActions:[],engineActions:[],researchProjects:[],testingSystem:{activeTests:[]},qualitySystem:{recalls:[]},historyArchive:[],pressSystem:{reviews:[],hype:{}},marketSystem:null,operations:null,logistics:null,worldEconomy:null};
 global.MDX.normalize(s);
 let demandCalls=0;const helpers={stochasticRound:n=>Math.max(0,Math.round(Number(n)||0)),monthlyDemandEstimate:()=>{demandCalls++;return 1200;}};
 const launchDayStart=Date.now();global.MDX.dailyVehicleOps(s,helpers);const launchDayMs=Date.now()-launchDayStart;
 assert.equal(Number(s.dailyTotals.produced||0),0,"new vehicle must not enter the full production pipeline on the same tick that release completes");
 s.daysPlayed=101;s.day=13;demandCalls=0;const start=Date.now();global.MDX.dailyVehicleOps(s,helpers);const elapsed=Date.now()-start;
 assert.equal(demandCalls,1,"monthly demand should be computed once per vehicle per simulation day");
 assert.match(fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8"),/let batteryKwhUsed=Number\(state\.electrification/,"battery production accumulator must remain mutable");
 assert.ok(Number.isFinite(Number(s.dailyTotals.produced))&&Number.isFinite(Number(s.dailyTotals.demand)),"first live production day generated invalid totals");
 assert.ok(elapsed<1500,"first production day took "+elapsed+"ms and risks freezing mobile Safari");
 assert.ok(launchDayMs<750,"launch transition tick took "+launchDayMs+"ms and risks freezing mobile Safari");
});

test("10x mobile simulation does not rebuild vehicle catalogs on every tick",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const refreshStart=game.indexOf("function refreshActiveSimulationView(force=false){"),refreshEnd=game.indexOf("\n$(\"newCompanyBtn\")",refreshStart),refresh=game.slice(refreshStart,refreshEnd);
 const libStart=game.indexOf("function renderLibrary(){"),libEnd=game.indexOf("\nfunction closeRivalDetail",libStart),library=game.slice(libStart,libEnd);
 assert.ok(refreshStart>=0&&refreshEnd>refreshStart,"active simulation refresh function missing");
 assert.match(refresh,/homeInterval=mobileViewport\?5000:1800/);
 assert.match(refresh,/fastMobile=mobileViewport&&state\?\.timeRunning&&Number\(state\?\.timeSpeed\|\|1\)>1/);
 assert.match(refresh,/if\(!fastMobile&&now-lastHomeLiveRefreshAt>=homeInterval\)/);
 assert.match(refresh,/heavyMobileInterval=mobileViewport&&state\?\.timeRunning&&Number\(state\?\.timeSpeed\|\|1\)>1\?15000:8000/);
 assert.match(refresh,/if\(editing\|\|modalOpen\|\|recentTouch\|\|userScrolling\)return;/);
 assert.ok(refresh.indexOf("if(editing||modalOpen||recentTouch||userScrolling)return;")<refresh.indexOf("renderHomeProducts()"),"heavy home product rendering still runs before mobile interaction guards");
 assert.match(game,/minUiYield=window\.innerWidth<=700\?28:16/);
 assert.match(game,/function renderLibraryCatalogPreviews\(root=document\)/);
 const renderLib=fs.readFileSync(path.join(__dirname,"..","render-library.js"),"utf8");
 assert.match(renderLib,/const vehicleSrcCache=new Map\(\),engineSrcCache=new Map\(\)/);
 assert.match(renderLib,/cacheSource\(vehicleSrcCache,key,\(\)=>data\(vehicleSVG/);
 assert.match(library,/renderLibraryCatalogPreviews\(\);/);
 assert.equal((library.match(/renderVehicleEntry\?\.\(img,v\)/g)||[]).length,0,"renderLibrary still eagerly renders vehicle SVGs instead of the lazy preview helper");
 assert.equal((library.match(/qsa\(\"\[data-manage-production\]\"\)/g)||[]).length,1,"production controls are double-bound in one library render");
 assert.equal((library.match(/wireLibrary\?\.\(ew,state/g)||[]).length,1,"powertrain library is double-wired in one render");
});

test("iPhone freeze protection moves rival simulation off-thread and avoids hidden 3D work",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const industry=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 const worker=fs.readFileSync(path.join(__dirname,"..","industry-worker.js"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/new Worker\("\/industry-worker\.js\?build=living-world-v1"\)/);
 assert.match(game,/simulateIndustryOffThread\(input\)/);
 assert.match(game,/if\(force&&mobileViewport&&now-lastHeavyRefreshAt<heavyMobileInterval\)return/);
 assert.match(game,/techDetails\?\.open/);
 assert.match(industry,/globalThis\.MDXIndustrySim=/);
 assert.match(worker,/importScripts\("\/industry-sim-client\.js\?build=living-world-v1"\)/);
 assert.match(worker,/self\.postMessage\(\{id,ok:true,result\}\)/);
 assert.match(sw,/"\/industry-worker\.js"/);
});

test("factories persist geography specialization age condition and modernization",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/const FACTORY_SPECIALIZATIONS=/);
 assert.match(expansion,/const FACTORY_REGION_PROFILES=/);
 assert.match(expansion,/function normalizeFactoryState\(state,f\)/);
 assert.match(expansion,/function factoryAgeYears\(state,f\)/);
 assert.match(expansion,/function factoryModernizationFactor\(f\)/);
 assert.match(expansion,/specialization:"flex"/);
 assert.match(expansion,/plantCondition:100/);
 assert.match(expansion,/data-factory-spec=/);
 assert.match(expansion,/data-modernize-factory=/);
 assert.match(expansion,/type:"modernization"/);
 assert.match(expansion,/PLANT MODERNIZATION/);
});

test("factory specialization materially changes assembly powertrain quality and overhead economics",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/assembly:\{id:"assembly",label:"High-Volume Assembly",assembly:1\.18,powertrain:\.82/);
 assert.match(expansion,/powertrain:\{id:"powertrain",label:"Powertrain Center",assembly:\.78,powertrain:1\.38/);
 assert.match(expansion,/premium:\{id:"premium",label:"Premium \/ Low-Volume",assembly:\.82,powertrain:\.94,quality:1\.12/);
 assert.match(expansion,/spec\.powertrain\*region\.productivity\*age\*modern\*condition/);
 assert.match(expansion,/spec\.assembly\*region\.productivity\*age\*modern\*condition/);
 assert.match(expansion,/plantQuality=fs\.length\?/);
 assert.match(expansion,/region\.labor\*diff\.operatingCost/);
});

test("new factory construction records plant mission and modernization completes through real projects",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/function startFactory\(state,name,regionId,specialization="flex",log=\(\)=>\{\}\)/);
 assert.match(expansion,/if\(typeof specialization==="function"\)/);
 assert.match(expansion,/f\.specialization=spec\.id/);
 assert.match(expansion,/f\.openedYear=Number\(state\.year\|\|1970\)\+2/);
 assert.match(expansion,/if\(p\.type==="modernization"\)/);
 assert.match(expansion,/f\.modernizationLevel=clamp\(Number\(f\.modernizationLevel\|\|0\)\+1,0,4\)/);
 assert.match(expansion,/f\.plantCondition=100/);
});

test("factory workforce targets now ramp through hiring training shifts layoffs and learning",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/const FACTORY_ROLE_SHARES=/);
 assert.match(expansion,/function factoryRoleTargets\(f,total\)/);
 assert.match(expansion,/function factoryEffectiveWorkers\(f\)/);
 assert.match(expansion,/function factoryAssemblyStaffingFactor\(f\)/);
 assert.match(expansion,/function factoryMinimumStaffForShifts\(f,shifts\)/);
 assert.match(expansion,/function factoryTurnoverRate\(state,f\)/);
 assert.match(expansion,/function processFactoryWorkforceDay\(state,log=/);
 assert.match(expansion,/function executeFactoryLayoff\(state,f,log=/);
 assert.match(expansion,/f\.staffingTarget=Math\.max\(100,Number\(s\.value\)\)/);
 assert.doesNotMatch(expansion,/data-fworkers-range[\s\S]{0,420}f\.workers=Number\(s\.value\)/);
 assert.doesNotMatch(expansion,/data-central-factory-workers[\s\S]{0,420}f\.workers=Number\(s\.value\)/);
 assert.match(expansion,/f\.hiringPipeline=Math\.max\(0,f\.staffingTarget-f\.workers\)/);
 assert.match(expansion,/f\.trainees\+=intake/);
 assert.match(expansion,/f\.shiftTarget=clamp\(Number\(s\.value\),1,3\)/);
 assert.match(expansion,/f\.shiftRampDays/);
 assert.match(expansion,/factoryMinimumStaffForShifts\(f,next\)/);
 assert.match(expansion,/f\.fatigue=clamp\(Number\(f\.fatigue\|\|0\)\+\.72/);
 assert.match(expansion,/f\.experience=clamp/);
 assert.match(expansion,/severancePer=/);
 assert.match(expansion,/LAY OFF TO TARGET/);
 assert.match(expansion,/factoryAssemblyStaffingFactor\(f\)/);
 assert.match(expansion,/factoryExperienceFactor\(f\)/);
 assert.match(expansion,/factoryFatigueFactor\(f\)/);
 assert.match(expansion,/processFactoryWorkforceDay\(state,log\)/);
 assert.match(expansion,/factoryRoleTargets,factoryEffectiveWorkers,factoryAssemblyStaffingFactor/);
});


test("factory quality is driven by process capability rework inspection and escaped defects",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const quality=fs.readFileSync(path.join(__dirname,"..","market-quality.js"),"utf8");
 assert.match(expansion,/function factoryQualityProfile\(state,v,componentMix=null\)/);
 assert.match(expansion,/function recordFactoryQualityDay\(state,v,m\)/);
 assert.match(expansion,/firstPass=helpers\.stochasticRound\(scheduled\*qualityProfile\.firstPassYield\)/);
 assert.match(expansion,/caughtDefects=helpers\.stochasticRound\(processDefects\*qualityProfile\.inspectionCatch\)/);
 assert.match(expansion,/fieldEscapes=Math\.max\(0,processDefects-caughtDefects\)/);
 assert.match(expansion,/rework=helpers\.stochasticRound\(caughtDefects\*qualityProfile\.reworkRecovery\)/);
 assert.match(expansion,/manufacturingQualityRisk=clamp/);
 assert.match(expansion,/closeFactoryQualityMonth\(state\)/);
 assert.match(quality,/manufacturing=v\?clamp\(num\(v\.manufacturingQualityRisk,1\)/);
 assert.match(quality,/base\*manufacturing/);
 assert.match(quality,/FACTORY FPY/);
 assert.match(quality,/FIELD ESCAPE/);
});

test("factory maintenance uses real daily planned and unplanned downtime instead of month-long fake days",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/function processFactoryMaintenanceDay\(state,log=/);
 assert.match(expansion,/function scheduleFactoryMaintenance\(state,f,log=/);
 assert.match(expansion,/f\.plannedMaintenanceDays=3/);
 assert.match(expansion,/f\.maintenanceActiveToday=f\.plannedMaintenanceDays>0/);
 assert.match(expansion,/f\.breakdownActiveToday=f\.breakdownDays>0/);
 assert.match(expansion,/f\.mtdPlannedDowntime\+\+/);
 assert.match(expansion,/f\.mtdUnplannedDowntime\+\+/);
 assert.match(expansion,/if\(f\.breakdownActiveToday&&f\.breakdownDays>0\)f\.breakdownDays--/);
 assert.match(expansion,/processFactoryMaintenanceDay\(state,log\)/);
 assert.match(expansion,/data-maintain-factory=/);
 assert.match(expansion,/3-DAY PREVENTIVE MAINT/);
 assert.match(expansion,/\*condition\*downtime/);
 assert.match(expansion,/\*fatigue\*planned/);
 assert.doesNotMatch(expansion,/else f\.breakdownDays=Math\.max\(0,f\.breakdownDays-1\)/);
});

test("title screen exposes the canonical save flow only",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 assert.match(html,/id="newCompanyBtn"/);
 assert.match(html,/id="continueBtn"/);
 assert.doesNotMatch(html,/id="(?:importSave|recoverSave|saveSlot|loadSlot)/i);
});

test("rival save-load normalization repairs reputation and active factory baselines immediately",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/brandReputationLoadRepair/);
 assert.match(game,/invalid rival reputation on save load/);
 assert.match(game,/merged\.brandReputation=clamp\(rawRep,15,100\)/);
 assert.match(game,/rivalFactoryLoadRepair=true/);
 assert.match(game,/Number\(s\.year\|\|1970\)>=founded&&!terminal&&Number\(merged\.factories\|\|0\)<1/);
 assert.match(game,/merged\.employees=Math\.max\(50,Number\(merged\.employees\|\|0\)\)/);
});


test("Phase 3 Systems 062-070 product lifecycle self-tests pass",()=>{
 const result=global.MDXProductLifecycle.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("Phase 3 lifecycle is wired into saves, demand, production, concepts and model programs",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const lifecycle=fs.readFileSync(path.join(__dirname,"..","product-lifecycle.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_13_product_lifecycle_trims_nameplates_concepts/);
 assert.match(game,/MDXProductLifecycle\?\.lifecycleDemandMultiplier/);
 assert.match(game,/MDXProductLifecycle\?\.vehicleEconomics/);
 assert.match(expansion,/MDXProductLifecycle\?\.processDay/);
 assert.match(expansion,/MDXProductLifecycle\?\.settleMonth/);
 assert.match(expansion,/MDXProductLifecycle\?\.onModelActionComplete/);
 assert.match(expansion,/MDXProductLifecycle\?\.renderManagement/);
 assert.match(lifecycle,/TRIM_ARCHETYPES/);
 assert.match(lifecycle,/optionPackages/);
 assert.match(lifecycle,/nameplates/);
 assert.match(lifecycle,/reputationMemory/);
 assert.match(lifecycle,/collectorStatus/);
 assert.match(lifecycle,/conceptPrograms/);
 assert.match(lifecycle,/reviveCancelledProgram/);
 assert.match(lifecycle,/setTrimConfig/);
 assert.match(lifecycle,/addPackage/);
 assert.match(lifecycle,/setFaceliftScope/);
 assert.match(lifecycle,/INTERIOR_LEVELS/);
 assert.match(lifecycle,/SUSPENSION_LEVELS/);
 assert.match(expansion,/scopeFactor=\.52\+selected\*\.17/);
 assert.match(storageSource,/"nameplates","conceptPrograms","modelActions"/);
 assert.match(html,/product-lifecycle\.js\?build=/);
 assert.match(sw,/"\/product-lifecycle\.js"/);
});

test("trim sales and package economics reconcile to real sold units",()=>{
 const s={company:"Lifecycle Test",campaignId:"phase3-reconcile",year:1995,month:4,day:1,cash:50000000,rep:65,vehicles:[{id:"car",name:"Apex",createdYear:1994,modelYear:1994,generation:1,productionStatus:"production",active:true,msrp:20000,lifetimeSales:15000,lastMonthSales:137,customerSatisfaction:78,stats:{className:"Sport",unitCost:11000,manufacturingUnitCost:11000,reliability:80,quality:78,safety:70,handling:82,comfort:65,mpg:25,hp:220}}],vehiclePrograms:[],enginePrograms:[],transmissionPrograms:[],platformPrograms:[],modelActions:[],engineActions:[],testingSystem:{activeTests:[]},qualitySystem:{recalls:[]},motorsport:{trophies:0},industry:[]};
 global.MDXProductLifecycle.ensure(s);
 const before=s.cash,result=global.MDXProductLifecycle.settleMonth(s,()=>{}),v=s.vehicles[0];
 assert.equal(Object.values(v.lastMonthTrimSales).reduce((a,b)=>a+b,0),137);
 assert.equal(result.trimUnits,137);
 assert.ok(v.lastMonthConfigurationRevenue>0);
 assert.ok(v.lastMonthConfigurationCost>0);
 assert.equal(s.cash,before,"month settlement must report configuration economics without double-booking cash already recognized in daily sales");
});


test("Phase 3 Systems 071 and 080-082 engine family self-tests pass",()=>{
 const result=global.MDXPowertrainFamilies.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("engine families are wired into saves design production contracts maturity and plants",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const families=fs.readFileSync(path.join(__dirname,"..","powertrain-families.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_14_engine_families_maturity_calibration_tooling/);
 assert.match(game,/MDXPowertrainFamilies\?\.quote/);
 assert.match(game,/MDXPowertrainFamilies\?\.authorizeProgram/);
 assert.match(game,/MDXPowertrainFamilies\?\.onEngineReleased/);
 assert.match(game,/renderFamilyLibrary/);
 assert.match(expansion,/MDXPowertrainFamilies\?\.recordInternalProduction/);
 assert.match(expansion,/MDXPowertrainFamilies\?\.recordExternalDelivery/);
 assert.match(expansion,/MDXPowertrainFamilies\?\.engineCapacity/);
 assert.match(expansion,/MDXPowertrainFamilies\?\.onEngineRevisionComplete/);
 assert.match(expansion,/MDXPowertrainFamilies\?\.processDay/);
 assert.match(expansion,/MDXPowertrainFamilies\?\.settleMonth/);
 assert.match(families,/function compatibility/);
 assert.match(families,/function startCalibration/);
 assert.match(families,/function startPlantTooling/);
 assert.match(families,/function familyCapacity/);
 assert.match(families,/productionUnits/);
 assert.match(families,/fieldVehicleMonths/);
 assert.match(storageSource,/"engineFamilies","engineCalibrationPrograms","engineToolingProjects"/);
 assert.match(html,/powertrain-families\.js\?build=/);
 assert.match(sw,/"\/powertrain-families\.js"/);
 assert.doesNotMatch(expansion,/const value=clamp\(avg\(v=>100-Math\.min\(90,Math\.max\(0,\(saleMsrp/);
});

test("engine family maturity requires real testing production or field use",()=>{
 const state={year:2000,month:0,day:1,cash:100000000,engines:[{id:"e",name:"Core 2.0",createdYear:2000,revision:1,design:{config:"I4",bore:86,stroke:86,block:"iron",blockDeck:"open",liners:"cast",head:"dohc",headMaterial:"aluminum",assembly:"standard",tolerance:"standard"},stats:{disp:2,hp:150,torque:145,rel:78,cost:1400}}],enginePrograms:[],engineSupply:{contracts:[]},vehicles:[],operations:{factories:[{id:"plant",name:"Engine Plant",status:"operating",workers:1000,shifts:2,maintenance:1,shops:{powertrain:900}}]}};
 global.MDXPowertrainFamilies.ensure(state);
 const family=state.engineFamilies[0],before=family.maturityScore;
 state.month=6;global.MDXPowertrainFamilies.settleMonth(state);
 assert.equal(family.maturityScore,before,"passive calendar time must not mature an engine family");
 global.MDXPowertrainFamilies.recordInternalProduction(state,"e",10000);
 assert.ok(family.maturityScore>before,"real production volume must mature the family");
});


test("Phase 3 System 083 persistent transmission family self-tests pass",()=>{
 const result=global.MDXTransmissionFamilies.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("transmission families persist maturity tooling and physical OEM supply capacity",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const corporate=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const families=fs.readFileSync(path.join(__dirname,"..","transmission-families.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_15_transmission_families_maturity_tooling/);
 assert.match(game,/MDXTransmissionFamilies\?\.quote/);
 assert.match(game,/MDXTransmissionFamilies\?\.authorizeProgram/);
 assert.match(game,/MDXTransmissionFamilies\?\.onReleased/);
 assert.match(game,/renderFamilyLibrary/);
 assert.match(expansion,/MDXTransmissionFamilies\?\.recordInternalProduction/);
 assert.match(expansion,/MDXTransmissionFamilies\?\.learningFactor/);
 assert.match(expansion,/MDXTransmissionFamilies\?\.processDay/);
 assert.match(expansion,/MDXTransmissionFamilies\?\.settleMonth/);
 assert.match(corporate,/MDXTransmissionFamilies\?\.transmissionCapacity/);
 assert.match(corporate,/MDXTransmissionFamilies\?\.recordExternalDelivery/);
 assert.match(families,/function maturityScore/);
 assert.match(families,/function startPlantTooling/);
 assert.match(families,/function familyCapacity/);
 assert.match(families,/fieldVehicleMonths/);
 assert.match(storageSource,/"transmissionFamilies","transmissionToolingProjects"/);
 assert.match(html,/transmission-families\.js\?build=/);
 assert.match(sw,/"\/transmission-families\.js"/);
});

test("mobile corporate market keeps acquisition actions on-screen and yields vertical touch scrolling",()=>{
 const corporate=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(corporate,/corp-market-mobile/);
 assert.match(corporate,/data-corp-buy/);
 assert.match(corporate,/ACQUIRE •/);
 assert.match(corporate,/TOTAL CASH REQUIRED/);
 assert.match(css,/MOBILE SCROLL OWNERSHIP \+ CORPORATE MARKET FIX/);
 assert.match(css,/\.table-wrap\{\s*touch-action:auto!important/);
 assert.match(css,/\.corp-market-desktop\{display:none!important\}/);
 assert.match(css,/\.corp-market-mobile\{display:grid!important/);
 assert.match(css,/\.game-main\{[\s\S]*?overflow-y:auto!important;[\s\S]*?overflow-x:hidden!important;/);
});

test("transmission maturity comes from work and volume rather than passive calendar time",()=>{
 const state={year:1990,month:0,day:1,cash:100000000,transmissions:[{id:"tx",name:"Road 5",familyId:"roadfam",familyName:"Road Family",createdYear:1990,generation:1,revision:1,releaseStatus:"released",type:"Manual",architecture:"5m",gears:5,torque:300,eff:.95,reliability:88,shift:70,cost:800,controlSystem:"mechanical",housing:"aluminum"}],transmissionPrograms:[],transmissionSupply:{contracts:[]},vehicles:[],operations:{factories:[{id:"plant",name:"Powertrain",status:"operating",workers:900,shifts:2,maintenance:1,shops:{powertrain:800}}]}};
 global.MDXTransmissionFamilies.ensure(state);
 const family=global.MDXTransmissionFamilies.familyForTransmission(state,"tx"),before=family.maturityScore;
 state.month=8;global.MDXTransmissionFamilies.settleMonth(state);
 assert.equal(family.maturityScore,before,"passive time must not mature a transmission family");
 global.MDXTransmissionFamilies.recordInternalProduction(state,"tx",12000);
 assert.ok(family.maturityScore>before,"real manufactured volume must mature a transmission family");
});


test("System 089 deterministic powertrain compatibility self-tests pass",()=>{
 const result=global.MDXPowertrainCompatibility.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("powertrain compatibility is saved, blocks impossible design freeze, and consumes real engineering cash",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const compatibility=fs.readFileSync(path.join(__dirname,"..","powertrain-compatibility.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_16_powertrain_compatibility_graph/);
 assert.match(game,/MDXPowertrainCompatibility\?\.assess/);
 assert.match(game,/Powertrain integration engineering must be completed before design freeze/);
 assert.match(game,/powertrainCompatibility:compatibilitySnapshot/);
 assert.match(expansion,/MDXPowertrainCompatibility\?\.processDay/);
 assert.match(expansion,/powertrainAdapterProjects/);
 assert.match(compatibility,/function startAdapterProject/);
 assert.match(compatibility,/Transmission torque rating is below 75% of engine output/);
 assert.match(compatibility,/bellhousing, mounts and controls/);
 assert.match(storageSource,/"powertrainAdapterProjects"/);
 assert.match(html,/powertrain-compatibility\.js\?build=phase3-electrification-v1/);
 assert.match(sw,/"\/powertrain-compatibility\.js"/);
});

test("custom transmission family production is constrained by real family tooling capacity",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(expansion,/vehicleTxFamily=window\.MDXTransmissionFamilies\?\.familyForTransmission/);
 assert.match(expansion,/vehicleTxRemaining=vehicleTxFamily\?Math\.max\(0,vehicleTxToDate-Number\(txFamilyUsed\[vehicleTxFamily\.id\]\|\|0\)\):Infinity/);
 assert.match(expansion,/familyTransmissionShortfall=Math\.max\(0,unconstrainedQuality-transmissionLimitedOutput\)/);
});


test("Contracts tab keeps dropdown state across full DOM rerenders",()=>{
 const corporate=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const market=fs.readFileSync(path.join(__dirname,"..","powertrain-market.js"),"utf8");
 assert.match(corporate,/contractDropdownOpenByCampaign=new Map/);
 assert.match(corporate,/captureContractDropdownState\(state,root\)/);
 assert.match(corporate,/restoreContractDropdownState\(state,root\)/);
 assert.match(corporate,/saved\.add\(key\)/);
 assert.match(corporate,/saved\.delete\(key\)/);
 assert.doesNotMatch(corporate,/root\.dataset\.contractOpenKeys/);
 assert.match(corporate,/OEM CONTRACT CENTER/);
 assert.match(corporate,/CONTRACT OVERVIEW/);
 assert.match(corporate,/TRANSMISSION MARKET READINESS/);
 assert.match(corporate,/OEM REQUESTS/);
 assert.match(corporate,/ACTIVE TRANSMISSION SALES/);
 assert.match(market,/SUPPLY CONTRACTS/);
 assert.match(market,/DESIGN LICENSING/);
 assert.match(market,/ROYALTY DASHBOARD/);
 assert.match(market,/JOINT DEVELOPMENT/);
 assert.match(market,/ptm-subdrop/);
});

test("Systems 090-093 powertrain commerce self-tests pass",()=>{
 const result=global.MDXPowertrainMarket.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("System 090 supply contracts settle physical inventory and duplicate-safe receipts",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const corporate=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const market=fs.readFileSync(path.join(__dirname,"..","powertrain-market.js"),"utf8");
 assert.match(expansion,/recordPhysicalDelivery\?\.\(state,"engine"/);
 assert.match(corporate,/recordPhysicalDelivery\?\.\(state,"transmission"/);
 assert.match(market,/externalPowertrainInventory/);
 assert.match(market,/externalTransmissionInventory/);
 assert.match(market,/deliveryReceiptKeys/);
 assert.match(market,/capacityReservation/);
 assert.match(market,/toolingContribution/);
 assert.match(market,/warrantyResponsibility/);
 assert.match(market,/earlyCancellationPenalty/);
 assert.match(expansion,/settleContractClose\?\.\(state,"engine"/);
 assert.match(corporate,/settleContractClose\?\.\(state,"transmission"/);
});

test("Systems 091 and 092 license real engine and transmission designs with tooling and per-unit royalties",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const market=fs.readFileSync(path.join(__dirname,"..","powertrain-market.js"),"utf8");
 const engineFamilies=fs.readFileSync(path.join(__dirname,"..","powertrain-families.js"),"utf8");
 const txFamilies=fs.readFileSync(path.join(__dirname,"..","transmission-families.js"),"utf8");
 const industry=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_17_powertrain_contracts_licensing_joint_development/);
 assert.match(market,/function acceptInboundLicense/);
 assert.match(market,/function acceptOutboundLicenseOffer/);
 assert.match(market,/function settleLicensesMonth/);
 assert.match(market,/royaltyPerUnit/);
 assert.match(market,/toolingDaysRemaining/);
 assert.match(market,/annualVolumeCap/);
 assert.match(market,/architectureChangesAllowed:false/);
 assert.match(engineFamilies,/legacyImport=!\(e\.licensedDesign\|\|e\.jointDevelopmentId\)/);
 assert.match(txFamilies,/legacyImport=!\(t\.licensedDesign\|\|t\.jointDevelopmentId\)/);
 assert.match(industry,/licensedEngine=p\.licenseId/);
 assert.match(industry,/licensedTx=p\.licenseId/);
});

test("System 093 joint development charges both partners and stores negotiated IP, tooling, capacity, scope and exit terms",()=>{
 const market=fs.readFileSync(path.join(__dirname,"..","powertrain-market.js"),"utf8");
 assert.match(market,/function createJointProgram/);
 assert.match(market,/playerSharePct/);
 assert.match(market,/objective/);
 assert.match(market,/scope/);
 assert.match(market,/ipModel/);
 assert.match(market,/toolingResponsibility/);
 assert.match(market,/permittedVariants/);
 assert.match(market,/ipRights/);
 assert.match(market,/capacityAllocation/);
 assert.match(market,/exclusivityMode/);
 assert.match(market,/exitClause/);
 assert.match(market,/partner\.cash=num\(partner\.cash\)-partnerDaily/);
 assert.match(market,/function exitJointProgram/);
 assert.match(market,/jointDevelopmentCredits/);
 assert.match(market,/ptm-subdrop/);
 assert.doesNotMatch(market,/<details class='ptm-drop' open>/);
});

test("powertrain commerce is loaded, cached, rendered in the existing contract marketplace, and settled after rival production",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const corporate=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(corporate,/MDXPowertrainMarket\?\.renderSupplement/);
 assert.match(expansion,/MDXPowertrainMarket\?\.processDay/);
 assert.match(game,/rival_industry_simulation[\s\S]*?powertrain_market_settlement/);
 assert.match(game,/powertrainRoyaltyIncome/);
 assert.match(game,/powertrainRoyaltyExpense/);
 assert.match(storageSource,/"powertrainMarket"/);
 assert.match(html,/powertrain-market\.js\?build=/);
 assert.match(sw,/"\/powertrain-market\.js"/);
});


test("Phase 3 Systems 094-097 electrification self-tests pass",()=>{
 const result=global.MDXElectrification.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("hybrid EV battery and charging systems are wired into saves vehicles production and regional demand",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const compatibility=fs.readFileSync(path.join(__dirname,"..","powertrain-compatibility.js"),"utf8");
 const electrification=fs.readFileSync(path.join(__dirname,"..","electrification.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_18_hybrid_ev_battery_charging/);
 assert.match(game,/propulsion:"ice"/);
 assert.match(game,/Single-Speed EV Reduction Drive/);
 assert.match(game,/MDXElectrification\?\.applyVehicle/);
 assert.match(game,/MDXElectrification\?\.registerVehiclePack/);
 assert.match(game,/if\(!isBEV&&!v\.engine\)/);
 assert.match(expansion,/MDXElectrification\?\.regionSuitability/);
 assert.match(expansion,/MDXElectrification\?\.productionConstraint/);
 assert.match(expansion,/MDXElectrification\?\.recordBatteryProduction/);
 assert.match(expansion,/MDXElectrification\?\.warrantyRate/);
 assert.match(expansion,/MDXElectrification\?\.regionalReadinessMarkup/);
 assert.match(expansion,/MDXElectrification\?\.batteryLibraryMarkup/);
 assert.match(compatibility,/Battery-electric architecture requires an electric reduction drive/);
 assert.match(electrification,/function packMetrics/);
 assert.match(electrification,/function regionSuitability/);
 assert.match(electrification,/function batteryCapacityKwh/);
 assert.match(storageSource,/electrification\.batteryPacks must be an array/);
 assert.match(html,/electrification\.js\?build=phase3-electrification-v1/);
 assert.match(sw,/"\/electrification\.js"/);
});

test("Phase 3 Systems 098-110 customer market self-tests pass",()=>{
 const result=global.MDXCustomerMarket.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("customer conquest retention climate fuel and cannibalization are wired into persistent retail simulation",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const customer=fs.readFileSync(path.join(__dirname,"..","customer-market.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_19_customer_conquest_retention_climate_fuel_cannibalization/);
 assert.match(game,/MDXCustomerMarket\?\.cannibalizationMultiplier/);
 assert.match(game,/MDXCustomerMarket\?\.ensure/);
 assert.match(expansion,/MDXCustomerMarket\?\.regionalDemandFactors/);
 assert.match(expansion,/MDXCustomerMarket\?\.recordRetailSale/);
 assert.match(expansion,/MDXCustomerMarket\?\.settleMonth/);
 assert.match(customer,/function climateMultiplier/);
 assert.match(customer,/function fuelPriceMultiplier/);
 assert.match(customer,/function customerDemandMultiplier/);
 assert.match(customer,/function cannibalizationMultiplier/);
 assert.match(customer,/function createSegment/);
 assert.match(customer,/function effectiveRetailPrice/);
 assert.match(customer,/function recordAppearanceSales/);
 assert.match(customer,/function fleetFloorFactor/);
 assert.match(customer,/data-create-segment/);
 assert.match(customer,/data-price-strategy/);
 assert.match(customer,/data-color-plan/);
 assert.match(customer,/data-material-plan/);
 assert.match(storageSource,/customerMarket\.regions must be an object/);
 assert.match(storageSource,/customerMarket\.segments must be an array/);
 assert.match(html,/customer-market\.js\?build=phase3-electrification-v1/);
 assert.match(sw,/"\/customer-market\.js"/);
 assert.match(game,/\["customers","CUSTOMERS"\]/);
 assert.match(expansion,/if\(tab==="customers"\)/);
 assert.match(expansion,/effectiveRetailPrice\?\.\(state,v,r\.id,modelIncentive2\)/);
 assert.match(expansion,/pricingSupport\+=dealerPricingSupport/);
 assert.match(expansion,/fleetFloorFactor\?\.\(v\)/);
 assert.match(expansion,/BELOW YOUR FLEET FLOOR/);
});

test("Phase 3 Systems 111-124 market quality self-tests pass",()=>{
 const result=global.MDXMarketQuality.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
});

test("market quality systems are wired into saves demand warranty press recalls used values and commercial fleets",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const customer=fs.readFileSync(path.join(__dirname,"..","customer-market.js"),"utf8");
 const quality=fs.readFileSync(path.join(__dirname,"..","market-quality.js"),"utf8");
 const storageSource=fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_20_price_reviews_awards_warranty_lemon_commercial_quality/);
 assert.match(game,/MDXMarketQuality\?\.ensure/);
 assert.match(storageSource,/"marketQuality"/);
 assert.match(html,/market-quality\.js\?build=supplier-components-v1/);
 assert.match(sw,/"\/market-quality\.js"/);
 assert.match(customer,/awardDemandMultiplier/);
 assert.match(customer,/lemonDemandMultiplier/);
 assert.match(customer,/COMPETITIVE INDEX/);
 assert.match(customer,/PRICE ELASTICITY EFFECT/);
 assert.match(quality,/function competitiveComparison/);
 assert.match(quality,/function reviewBreakdown/);
 assert.match(quality,/function maybeAwards/);
 assert.match(quality,/function updateUsedValue/);
 assert.match(quality,/function recordFleetDelivery/);
 assert.match(quality,/function fleetSuitability/);
 assert.match(quality,/function fleetMinimumSuitability/);
 assert.match(quality,/function recordWarranty/);
 assert.match(quality,/function updateLemon/);
 assert.match(quality,/function qualityRiskMultiplier/);
 assert.match(quality,/function investigateDefect/);
 assert.match(quality,/function serviceCampaign/);
 assert.match(expansion,/MDXMarketQuality\?\.awardReputationHalo/);
 assert.match(expansion,/MDXMarketQuality\?\.warrantyRiskMultiplier/);
 assert.match(expansion,/MDXMarketQuality\?\.recordWarranty/);
 assert.match(expansion,/MDXMarketQuality\?\.recordFleetDelivery/);
 assert.match(expansion,/MDXMarketQuality\?\.qualityRiskMultiplier/);
 assert.match(expansion,/MDXMarketQuality\?\.recallCostMultiplier/);
 assert.match(expansion,/MDXMarketQuality\?\.settleMonth/);
 assert.match(expansion,/data-investigate/);
 assert.match(expansion,/data-service-campaign/);
 assert.match(expansion,/pressMarkup/);
 assert.match(expansion,/LEMON STATUS/);
 assert.match(expansion,/National Rental Company/);
 assert.match(expansion,/Parcel & Logistics Fleet/);
 assert.match(expansion,/buyerType:"rental"/);
 assert.match(expansion,/buyerType:"commercial"/);
 assert.match(expansion,/function fleetCandidateForOffer/);
 assert.match(expansion,/VEHICLE FIT TOO LOW/);
 assert.doesNotMatch(expansion,/score=Math\.round\(\(v\.stats\.quality\+v\.stats\.handling\+v\.stats\.comfort\+v\.stats\.safety\+v\.customerSatisfaction\)\/5\)/);
});

test("BEV calculation responds to battery size mass charging and pack thermal management",()=>{
 const state={year:2020,month:0,day:1,difficulty:"normal"};
 const base={power:0,kg:1450,mpg:0,drivingRange:0,aero:.28,unitCost:15000,manufacturingUnitCost:15000,reliability:82,quality:80,handling:72,comfort:68,safety:72,zero:99,top:0};
 const common={propulsion:"bev",batteryChemistry:"nmc",motorKw:180,rearMotorKw:0,usableBufferPct:8,batteryCooling:"liquid",inverterGrade:"advanced",regenKw:85,acChargeKw:11,dcFastChargeKw:150,packVoltage:400,trans:"ev1"};
 const small=global.MDXElectrification.applyVehicle(state,{...common,batteryKwh:45},base);
 const large=global.MDXElectrification.applyVehicle(state,{...common,batteryKwh:90},base);
 assert.ok(large.electrification.electricRange>small.electrification.electricRange);
 assert.ok(large.electrification.packMassKg>small.electrification.packMassKg);
 const passive=global.MDXElectrification.packMetrics(state,{...common,batteryKwh:75,batteryCooling:"passive"});
 const liquid=global.MDXElectrification.packMetrics(state,{...common,batteryKwh:75,batteryCooling:"liquid"});
 assert.ok(passive.warrantyRisk>liquid.warrantyRisk);
 assert.ok(liquid.charge10to80Min>0);
});

test("BEV compatibility permits an engine-free electric reduction drive",()=>{
 const state={year:2020,month:0,day:1,engines:[],transmissions:[],powertrainCompatibilityGraph:{version:1,edges:{}},powertrainAdapterProjects:[]};
 const tx={id:"ev1",type:"Reduction",torque:900,cost:1500,electric:true,hybrid:false,controlSystem:"electronic",drivetrainCompat:["RWD","FWD","AWD"],layoutCompat:["longitudinal","transverse"]};
 const result=global.MDXPowertrainCompatibility.assess(state,{engine:null,transmission:tx,transmissionId:"ev1",design:{propulsion:"bev",evArchitecture:true,hybridArchitecture:false,drivetrain:"RWD",enginePlacement:"front"}});
 assert.equal(result.hardReasons.includes("No released engine selected"),false);
 assert.notEqual(result.status,"impossible");
});

test("battery production capacity creates a physical output constraint instead of decorative EV supply",()=>{
 const state={year:2000,month:0,day:15,difficulty:"normal"};
 const v={electrification:{architecture:"bev",batteryKwh:80}};
 const capacity=global.MDXElectrification.batteryCapacityKwh(state);
 const result=global.MDXElectrification.productionConstraint(state,v,100000,0);
 assert.ok(Number.isFinite(capacity)&&capacity>0);
 assert.ok(result.units<100000);
 assert.ok(result.shortfall>0);
 assert.equal(result.kwhUsed,result.units*80);
});


test("era starts, research gates, product automation and unified 3D renderer stay wired",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const data=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
 const lifecycle=fs.readFileSync(path.join(__dirname,"..","product-lifecycle.js"),"utf8");
 const visualizer=fs.readFileSync(path.join(__dirname,"..","product-visualizer.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 for(const year of [1940,1950,1960,1970])assert.match(index,new RegExp('<option value="'+year+'"'));
 assert.match(index,/id="engine3dPreview"/);
 assert.match(index,/id="vehicle3dPreview"/);
 assert.match(index,/product-visualizer\.js\?build=engineering-20261008-v1/);
 assert.match(index,/brand-evolution\.js\?build=living-world-v1/);
 assert.doesNotMatch(index,/design-visualizer\.js/);
 assert.match(game,/const START_YEARS=\[1940,1950,1960,1970\]/);
 assert.match(game,/\["exterior","EXTERIOR"\]/);
 assert.match(game,/NOSE \/ HOOD LENGTH/);
 assert.match(game,/CABIN POSITION/);
 assert.match(game,/headlightStyle/);
 assert.match(game,/year:startYear/);
 assert.match(game,/foundingYear:startYear/);
 assert.match(game,/industrySeed\(startYear\)/);
 assert.match(game,/eraEngineDraft\(startYear\)/);
 assert.match(game,/eraVehicleDraft\(startYear\)/);
 assert.match(game,/eraTransmissionDraft\(startYear\)/);
 assert.match(data,/id:"forged_crank".*year:1940/);
 assert.match(data,/id:"sohc".*year:1948/);
 assert.match(data,/id:"turbo".*year:1962/);
 assert.match(data,/id:"efi".*year:1978/);
 assert.match(data,/id:"honda_acura",name:"Acura"/);
 assert.match(data,/id:"toyota_lexus",name:"Lexus"/);
 assert.match(data,/id:"nissan_infiniti",name:"Infiniti"/);
 assert.match(data,/id:"hyundai_genesis",name:"Genesis"/);
 assert.match(data,/id:"chrysler_simca",name:"Simca",parentId:"chrysler",parentSince:1963/);
 assert.match(data,/id:"bl_austin",name:"Austin",parentId:"british_leyland",parentSince:1968/);
 assert.match(data,/id:"fiat_ferrari",name:"Ferrari",parentId:"fiat",parentSince:1969/);
 assert.match(data,/id:"nissan_prince",name:"Prince Motor",parentId:"nissan",parentSince:1966/);
 assert.match(data,/van:\{name:"Van"/);
 assert.match(data,/minivan:\{name:"Minivan"/);
 assert.match(game,/activeParents=new Set/);
 assert.match(game,/corporateUnitActivationPeriod\(u\)<=p&&\(!u\.parentId\|\|activeParents\.has\(String\(u\.parentId\)\)\)/);
 assert.match(data,/id:"precision_machining".*year:1948/);
 assert.match(data,/id:"performance_lubrication".*year:1950/);
 assert.match(data,/id:"advanced_casting".*year:1952/);
 assert.match(game,/tech:"advanced_casting"/);
 assert.match(game,/researchLock=!!\(o\.tech&&!hasTech\(o\.tech\)\)/);
 assert.match(game,/vehicleCurated/);
 assert.match(game,/generatedCandidateUnique\("vehicle"/);
 assert.match(game,/used,current,1400/);
 assert.match(game,/data-manage-production/);
 assert.match(game,/data-product-discontinue/);
 assert.match(game,/MARKET AVERAGE/);
 assert.match(game,/MARKET AVG/);
 assert.match(lifecycle,/data-model-discontinue/);
 assert.match(lifecycle,/data-gen/);
 assert.match(lifecycle,/data-my/);
 assert.match(lifecycle,/function marketAveragePrice/);
 assert.match(lifecycle,/function applyLifecyclePricing/);
 assert.match(lifecycle,/data-field='autoFacelift'/);
 assert.match(lifecycle,/data-field='faceliftYears'/);
 assert.match(lifecycle,/function setProductAutomation/);
 assert.match(lifecycle,/function scheduleProductAutomation/);
 assert.match(lifecycle,/function renameVehicle/);
 assert.match(lifecycle,/function discontinueVehicle/);
 assert.match(lifecycle,/data-model-discontinue/);
 assert.match(lifecycle,/data-product-auto/);
 assert.match(lifecycle,/MDXProductVisualizer\?\.renderVehiclePreview/);
 assert.doesNotMatch(lifecycle,/MDXDesignVisualizer/);
 assert.match(visualizer,/function generationDesignDNA/);
 assert.match(visualizer,/function renderEngine\(canvas,draft,stats/);
 assert.match(visualizer,/function renderVehicle\(canvas,draft,stats/);
 assert.match(css,/BUILD 47 — compact production library/);
 assert.match(css,/BUILD 48 — 3D-first engineering studio/);
 assert.match(css,/BUILD 49 — Products-to-Production handoff/);
 assert.match(css,/BUILD 50 — era engineering context/);
 assert.match(css,/BUILD 51 — product dropdown catalog/);
 assert.match(css,/BUILD 52 — historical campaign era picker/);
 assert.match(css,/BUILD 53 — Products catalog dropdown cleanup/);
 assert.match(css,/BUILD 54 — premium HQ shell \+ icon dock/);
 assert.match(css,/BUILD 55 — blue technical lab visual system/);
 assert.match(css,/BUILD 56 — HQ fidelity correction/);
 assert.match(css,/PHASE 3 — biggest refinement/);
 assert.match(index,/render-library\.js\?build=launch-freeze-v6/);
 assert.match(index,/id="vehicleRenderPreview"/);
 assert.match(index,/id="engineRenderPreview"/);
 assert.match(index,/DESIGN STUDY/);
 assert.match(index,/ENGINE ARCHITECTURE/);
 assert.doesNotMatch(index,/LIVE 3D VEHICLE/);
 assert.doesNotMatch(index,/LIVE 3D ENGINE/);
 assert.doesNotMatch(index,/id="vehicleHeroCar"/);
 assert.doesNotMatch(index,/class="engine-glyph"/);
 assert.match(game,/window\.MDXRenderLibrary\?\.renderVehicle\?\.\(\$\("vehicleRenderPreview"\)/);
 assert.match(game,/window\.MDXRenderLibrary\?\.renderEngine\?\.\(\$\("engineRenderPreview"\)/);
 assert.match(game,/launchCarMarkup\(entry\).*MDXRenderLibrary\?\.vehicleSrc/s);
 assert.match(game,/data-rival-car-render/);
 assert.match(game,/data-rival-engine-render/);
 assert.match(index,/class="phase3-hq"/);
 assert.doesNotMatch(index,/class="phase3-hq-actions"/);
 assert.doesNotMatch(index,/aria-label="Headquarters quick actions"/);
 assert.match(index,/phase3-project-card/);
 assert.match(index,/id="executiveMetrics"/);
 assert.match(index,/dock-icon"><svg viewBox="0 0 24 24"/);
 assert.doesNotMatch(index,/dock-icon">(?:▥|⚗|⚙|◆|▰|✦|\$|♟|⬡|⚑|⇄)/);
 assert.doesNotMatch(index,/conceptShellImage/);
 assert.doesNotMatch(index,/conceptProjectDetails/);
 assert.doesNotMatch(index,/concept-portrait-gate/);
 assert.doesNotMatch(index,/concept-live-shell/);
 assert.doesNotMatch(game,/async function loadApprovedConcept\(\)/);
 assert.doesNotMatch(game,/assets\/concept\/b64-/);
 assert.doesNotMatch(game,/mdEngineV8DataUri/);
 assert.match(game,/PHASE3_VISUAL_OVERHAUL=true/);
 assert.match(css,/#view-engine #engine3dPreview\{opacity:1!important/);
 assert.match(index,/phase3-global-dock nine/);
 assert.equal((index.match(/data-dock-key=/g)||[]).length,9,"Mobile dock must expose all nine direct company views");
 const dockPairs=[["hq","home"],["research","research"],["engine","engine"],["vehicle","vehicle"],["operations","library"],["market","market"],["budget","budget"],["companies","companies"],["finance","finance"]];
 for(const [key,view] of dockPairs){assert.match(index,new RegExp('data-dock-key="'+key+'"[^>]+data-view="'+view+'"'));assert.match(index,new RegExp('id="view-'+view+'"'));}
 assert.doesNotMatch(index,/mobileMoreBtn|id="moreModal"|id="opsModal"/);
 assert.match(index,/data-finance-pane="group"/);
 assert.match(index,/data-finance-pane="holdings"/);
 assert.match(index,/data-finance-pane="deals"/);
 assert.match(index,/data-finance-pane="capital"/);
 assert.match(css,/PHASE 3 GLOBAL SHELL — full visual reskin v1/);
 assert.match(game,/\.bottom-nav button\[data-view\],\.command-nav button\[data-view\]/);
 assert.match(game,/setFinanceWorkspacePane/);
 assert.match(game,/function renderHQScene\(\)/);
 assert.match(game,/function companyQualityScore\(\)/);
 assert.match(game,/dataset\.opsTab/);
 assert.match(game,/dataset\.marketTab/);
 assert.match(game,/RELEASED ENGINE CATALOG/);
 assert.match(game,/ENGINEERING \+ HARDWARE/);
 assert.match(game,/SUPPLY \+ COMMERCIAL/);
 assert.match(game,/DEVELOPMENT \+ REVISION HISTORY/);
 assert.match(game,/VEHICLE CATALOG/);
 assert.match(game,/function eraEngineeringStrip/);
 assert.match(game,/MDXBrandEvolution\?\.processYear/);
 assert.match(game,/state\.year>=Number\(x\.vehicleStart\?\?x\.founded\?\?0\)/);
});

test("later-born marque evolution is funded, parent-linked and records heritage",()=>{
 const result=global.MDXBrandEvolution.runSelfTests();
 assert.equal(result.ok,true,result.failures.join("\n"));
 const s={campaignId:"later-brand",year:2005,month:0,corporateUnits:[],industry:[]};
 const parent={id:"p",name:"Pioneer Motors",country:"United States",founded:1940,vehicleStart:1940,status:"active",valuation:9e9,cash:1.2e9,brandReputation:82,rd:86,marketShare:9,dealers:1000,factories:9,brands:1,monthProfit:50e6,lossMonths:0,aiDecisionLog:[]};s.industry=[parent];
 const unit=global.MDXBrandEvolution.createMarque(s,parent,"technology",{name:"Helix Motorworks",cost:120e6});
 assert.ok(unit);assert.equal(unit.parentId,parent.id);assert.equal(unit.founded,2005);assert.equal(unit.createdBySimulation,true);assert.ok(unit.heritage?.reason);assert.equal(parent.cash,1.08e9);
});

test("procedural 3D geometry responds to cylinder count, generation and model year",()=>{
 const viz=global.MDXProductVisualizer;
 assert.ok(viz);
 const i2=viz.buildEngine({config:"I2",bore:78,stroke:92,head:"ohv",aspiration:"na"},{disp:1.8,hp:62,tq:105});
 const v12=viz.buildEngine({config:"V12",bore:88,stroke:80,head:"dohc",aspiration:"na"},{disp:5.8,hp:420,tq:390});
 const cylinders=model=>model.faces.filter(f=>f.meta==="cylinder").length;
 assert.ok(cylinders(v12)>cylinders(i2),"V12 should render materially more cylinder geometry than I2");
 const carb=viz.buildEngine({config:"I4",bore:86,stroke:86,head:"ohv",fuel:"carb",aspiration:"na"},{disp:2,hp:90,tq:120});
 const efiTurbo=viz.buildEngine({config:"I4",bore:86,stroke:86,head:"dohc",fuel:"efi",aspiration:"turbo",intercooler:true},{disp:2,hp:240,tq:250});
 assert.ok(carb.faces.some(f=>f.meta==="air-cleaner")&&!carb.faces.some(f=>f.meta==="fuel-rail"),"carbureted engine should show carb / air-cleaner hardware");
 assert.ok(efiTurbo.faces.some(f=>f.meta==="fuel-rail")&&efiTurbo.faces.some(f=>f.meta==="turbo")&&efiTurbo.faces.some(f=>f.meta==="intercooler"),"EFI turbo hardware should be visible in 3D");
 const hardware=viz.buildEngine({config:"V8",bore:92,stroke:88,head:"dohc",fuel:"efi",ignition:"coilpack",intake:"itb",exhaust:"header",blockDeck:"closed",oiling:"dry",oilCooler:"race",aspiration:"na"},{disp:4.7,hp:410,tq:390});
 for(const meta of ["closed-deck-bridge","dry-sump-reservoir","itb-stack","coil-pack","header-runner","oil-cooler"])assert.ok(hardware.faces.some(f=>f.meta===meta),meta+" should visibly change the engine model");

 const design={body:"sedan",wheelbase:2750,trackWidth:1510,rideHeight:155,wheel:17,drivetrain:"RWD"};
 const gen1=viz.buildVehicle(design,{hp:180},{name:"Regent",generation:1,modelYear:1970,visualSeed:"regent"});
 const gen2=viz.buildVehicle(design,{hp:180},{name:"Regent",generation:2,modelYear:1970,visualSeed:"regent"});
 const my71=viz.buildVehicle(design,{hp:180},{name:"Regent",generation:1,modelYear:1971,visualSeed:"regent"});
 const body=model=>model.faces.filter(f=>f.meta==="body").map(f=>f.pts);
 const fascia=model=>model.faces.filter(f=>["lamp","grille","rear-lamp"].includes(f.meta)).map(f=>f.pts);
 assert.notDeepEqual(body(gen1),body(gen2),"new generations should change the vehicle silhouette");
 assert.deepEqual(body(gen1),body(my71),"model-year refreshes should preserve the core generation silhouette");
 assert.notDeepEqual(fascia(gen1),fascia(my71),"model-year refreshes should visibly revise lights or fascia");
 const prewar=viz.buildVehicle(design,{hp:85},{name:"Regent",generation:1,modelYear:1940,visualSeed:"regent"});
 assert.notDeepEqual(body(prewar),body(gen1),"1940s and 1970s versions should carry different era proportions");
 assert.ok(prewar.faces.some(f=>f.meta==="bumper")&&prewar.faces.some(f=>f.meta==="body-trim"),"period vehicle detailing should include bumpers and brightwork");
 const shaped=viz.buildVehicle({...design,noseLength:78,roofHeight:30,roofSlope:78,cabinPosition:68,greenhouse:35,bodyTaper:70,fenderFlare:60,fasciaStyle:"sport",headlightStyle:"quad",grilleStyle:"wide"},{hp:240},{name:"Regent Custom",generation:1,modelYear:1970,visualSeed:"regent"});
 assert.notDeepEqual(body(shaped),body(gen1),"Phase 3 exterior controls should reshape the actual vehicle silhouette");
 assert.ok(shaped.faces.some(f=>f.meta==="fender-flare")&&shaped.faces.some(f=>f.meta==="lower-intake"),"Phase 3 exterior hardware should appear on the procedural model");
 assert.ok(shaped.faces.filter(f=>f.meta==="lamp").length>gen1.faces.filter(f=>f.meta==="lamp").length,"quad lamps should materially change front-end geometry");
 const trackCar=viz.buildVehicle({...design,drivetrain:"AWD",rotorSize:380,caliper:"fourpiston",underbody:"diffuser",brakeCooling:"performance"},{hp:420},{name:"Regent RS",generation:3,modelYear:2001,visualSeed:"regent-rs"});
 for(const meta of ["brake-caliper","underbody-panel","diffuser-fin","front-differential","rear-differential","brake-duct"])assert.ok(trackCar.faces.some(f=>f.meta===meta),meta+" should be visible on the configured chassis");
});

test("Phase 3 render library gives real body and engine families distinct image outputs",()=>{
 const r=global.MDXRenderLibrary;assert.ok(r);
 const sedan=r.vehicleSVG({body:"sedan",paintColor:"#46584a",wheel:17,rideHeight:155},{hp:180,className:"Family"},{name:"Regent",modelYear:1970});
 const pickup=r.vehicleSVG({body:"pickup",paintColor:"#6f3f42",wheel:19,rideHeight:210,fenderFlare:55},{hp:260,className:"Utility"},{name:"Hauler",modelYear:1970});
 const van=r.vehicleSVG({body:"van",paintColor:"#35485b",wheel:16,rideHeight:170},{hp:140,className:"Utility"},{name:"Carrier",modelYear:1970});
 assert.notEqual(sedan,pickup);assert.notEqual(sedan,van);assert.match(pickup,/PICKUP/);assert.match(van,/VAN/);
 const i4=r.engineSVG({config:"I4",aspiration:"na",fuel:"carb"},{disp:2,hp:95});
 const v12=r.engineSVG({config:"V12",aspiration:"na",fuel:"efi"},{disp:5.8,hp:420});
 const vr6=r.engineSVG({config:"VR6",aspiration:"turbo",fuel:"efi"},{disp:2.8,hp:330});
 const flat6=r.engineSVG({config:"F6",aspiration:"na",fuel:"efi"},{disp:3,hp:250});
 assert.notEqual(i4,v12);assert.notEqual(v12,vr6);assert.notEqual(vr6,flat6);
 assert.match(i4,/I4/);assert.match(v12,/V12/);assert.match(vr6,/NARROW-ANGLE VR6/);assert.match(flat6,/BOXER F6/);
});

test("lineup management can rename automate and discontinue without deleting history",()=>{
 const s={company:"Lineup Motors",campaignId:"lineup-test",year:1970,month:0,day:1,cash:10000000,rep:50,vehicles:[{id:"v1",name:"Falcon",createdYear:1969,modelYear:1970,generation:1,productionStatus:"production",productionEnabled:true,active:true,msrp:5000,lifetimeSales:1200,lastMonthSales:100,stats:{className:"Mainstream",unitCost:3200,reliability:70,quality:68,safety:55,handling:55,comfort:60,mpg:22,hp:110}}],engines:[],transmissions:[],vehiclePrograms:[],enginePrograms:[],transmissionPrograms:[],platformPrograms:[],modelActions:[],engineActions:[],testingSystem:{activeTests:[]},qualitySystem:{recalls:[]},motorsport:{trophies:0},industry:[]};
 global.MDXProductLifecycle.ensure(s);
 const v=s.vehicles[0],nameplateId=v.nameplateId;
 assert.ok(global.MDXProductLifecycle.renameVehicle(s,v.id,"Regent"));
 assert.equal(v.name,"Regent");
 assert.equal(s.nameplates.find(n=>n.id===nameplateId).name,"Regent");
 const auto=global.MDXProductLifecycle.setProductAutomation(s,v.id,{enabled:true,yearlyRefresh:true,autoGeneration:true,generationYears:4});
 assert.equal(auto.enabled,true);assert.equal(auto.yearlyRefresh,true);assert.equal(auto.autoGeneration,true);assert.equal(auto.generationYears,4);
 const historyBefore=s.nameplates.length;
 assert.ok(global.MDXProductLifecycle.discontinueVehicle(s,v.id));
 assert.equal(v.productionStatus,"retired");assert.equal(v.productionEnabled,false);assert.equal(v.active,false);
 assert.equal(s.nameplates.length,historyBefore);
});


test("model-year facelift and generation programs keep the outgoing car on sale and have hard calendar caps",()=>{
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const lifecycle=fs.readFileSync(path.join(__dirname,"..","product-lifecycle.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(expansion,/maxCalendarDays:45/);
 assert.match(expansion,/maxCalendarDays:120/);
 assert.match(expansion,/maxCalendarDays:180/);
 assert.match(expansion,/backgroundProduction:true/);
 assert.match(expansion,/current car stays on sale/);
 assert.match(lifecycle,/action\.productionContinues=productionContinues/);
 assert.match(game,/schema_23_background_generations_and_subsidiary_scale_repair/);
 assert.match(game,/resumedMergedVehicles/);
});

test("vehicle concept builder tolerates legacy engines and platforms with incomplete data",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/Array\.isArray\(p\.bodies\)\?p\.bodies:\[\]/);
 assert.match(game,/e\.stats\?\.hp/);
 assert.match(game,/NO RELEASED ENGINE — BUILD \/ RELEASE ONE FIRST/);
});

test("new generations create a temporary real demand boost instead of decorative hype only",()=>{
 const s={company:"Momentum Motors",campaignId:"momentum-test",year:1974,month:4,day:1,cash:20000000,rep:60,vehicles:[{id:"v1",name:"Nova",createdYear:1970,modelYear:1974,generation:2,productionStatus:"production",productionEnabled:true,active:true,msrp:6200,lifetimeSales:50000,lastMonthSales:1200,stats:{className:"Mainstream",unitCost:4100,reliability:72,quality:70,safety:58,handling:60,comfort:62,mpg:23,hp:125}}],engines:[],transmissions:[],vehiclePrograms:[],enginePrograms:[],transmissionPrograms:[],platformPrograms:[],modelActions:[],engineActions:[],testingSystem:{activeTests:[]},qualitySystem:{recalls:[]},motorsport:{trophies:0},industry:[],pressSystem:{hype:{}}};
 global.MDXProductLifecycle.ensure(s);const v=s.vehicles[0],baseline=global.MDXProductLifecycle.demandMultiplier(s,v);
 global.MDXProductLifecycle.onModelActionComplete(s,v,"generation",{});
 const boosted=global.MDXProductLifecycle.demandMultiplier(s,v);
 assert.equal(v.launchMomentum.type,"generation");
 assert.equal(v.launchMomentum.remainingMonths,6);
 assert.equal(v.launchMomentum.multiplier,1.18);
 assert.ok(boosted>baseline,"generation launch momentum should increase real lifecycle demand");
});


test("products catalog uses compact native dropdown menus and renders saved engines",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/data-engine-product-preview/);
 assert.match(game,/product-detail-menu/);
 assert.match(game,/ENGINEERING \+ HARDWARE/);
 assert.match(game,/SUPPLY \+ COMMERCIAL/);
 assert.match(game,/DEVELOPMENT \+ REVISION HISTORY/);
 assert.match(game,/SALES \+ INVENTORY/);
 assert.match(game,/PRODUCTION \+ FINANCIALS/);
 assert.doesNotMatch(game,/data-product-expand/);
});

test("enhanced procedural vehicles expose real powertrain and aero hardware",()=>{
 const viz=global.MDXProductVisualizer,base={body:"sedan",wheelbase:2800,trackWidth:1550,rideHeight:150,wheel:18,tireWidth:235,tireProfile:45,drivetrain:"AWD",frontAero:"splitter",rearAero:"wing"};
 const ev=viz.buildVehicle({...base,propulsion:"bev",evArchitecture:true,motorKw:180,rearMotorKw:120},{hp:400},{name:"Volt",generation:2,modelYear:2020,visualSeed:"volt"});
 assert.ok(ev.faces.some(f=>f.meta==="battery-pack"),"EV preview should show the underfloor battery pack");
 assert.ok(ev.faces.filter(f=>f.meta==="e-motor").length>=2,"AWD EV preview should show front and rear motors");
 assert.ok(ev.faces.some(f=>f.meta==="front-aero")&&ev.faces.some(f=>f.meta==="rear-aero"),"selected aero hardware should appear in the rendered vehicle");
 assert.ok(ev.faces.some(f=>f.meta==="windshield")&&ev.faces.some(f=>f.meta==="rear-glass"),"vehicle should render dedicated glazing surfaces");
 const ice=viz.buildVehicle({...base,propulsion:"ice",evArchitecture:false,hybridArchitecture:false},{hp:220},{name:"Touring",generation:1,modelYear:1975,visualSeed:"touring"});
 assert.ok(ice.faces.some(f=>f.meta==="exhaust")&&ice.faces.some(f=>f.meta==="muffler"),"ICE preview should expose exhaust hardware");
 assert.equal(ice.faces.some(f=>f.meta==="battery-pack"),false);
});

test("V and W engines render visibly banked cylinder geometry",()=>{
 const viz=global.MDXProductVisualizer;
 const i6=viz.buildEngine({config:"I6",bore:84,stroke:88,head:"dohc",fuel:"efi",aspiration:"na"},{disp:2.9,hp:220,tq:210});
 const v8=viz.buildEngine({config:"V8",bore:92,stroke:86,head:"dohc",fuel:"efi",aspiration:"na"},{disp:4.6,hp:360,tq:340});
 const cylinderVectors=model=>model.faces.filter(f=>f.meta==="cylinder").slice(0,8).flatMap(f=>f.pts.slice(0,2).map(p=>[Number(p.x.toFixed(3)),Number(p.y.toFixed(3))]));
 assert.notDeepEqual(cylinderVectors(i6),cylinderVectors(v8),"V-engine cylinder banks should not use inline-engine geometry");
 assert.ok(v8.faces.some(f=>f.meta==="alternator")&&v8.faces.some(f=>f.meta==="starter"),"engine render should include visible accessories");
});


test("historical campaign start picker is obvious and all four eras stay wired",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 for(const year of [1940,1950,1960,1970])assert.match(index,new RegExp('data-start-year="'+year+'"'));
 assert.match(index,/class="start-era-grid"/);
 assert.match(game,/function syncStartYearPicker/);
 assert.match(game,/qsa\("\[data-start-year\]"\)/);
 assert.match(game,/industrySeed\(startYear\)/);
});

test("historical world excludes future automakers and activates them on their automotive entry year",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const data=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
 assert.match(game,/D\.MANUFACTURERS\.filter\(m=>manufacturerActivationYear\(m\)<=seedYear\)/);
 assert.match(game,/function syncHistoricalIndustryEntrants/);
 assert.match(game,/schema_21_historical_company_activation_timeline/);
 assert.match(data,/id:"honda".*vehicleStart:1963/);
 assert.match(data,/id:"kia".*vehicleStart:1974/);
 assert.match(data,/id:"porsche".*vehicleStart:1948/);
 assert.match(data,/id:"tesla".*vehicleStart:2008/);
});

test("manufacturer expansion adds major historical independents and modern niche entrants",()=>{
 const data=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
 const ids=["studebaker","packard","hudson","nash","kaiser_frazer","willys_overland","tucker","crosley","borgward","nsu","panhard","facel_vega","mclaren","bugatti_automobili","koenigsegg","pagani","rimac","nio","vinfast","rivian","lucid"];
 for(const id of ids)assert.match(data,new RegExp('id:"'+id+'"'));
 const block=data.slice(data.indexOf("MANUFACTURERS:["),data.indexOf("CORPORATE_UNITS:["));
 const count=(block.match(/\{id:"/g)||[]).length;
 assert.ok(count>=114,"global manufacturer roster should include the expanded historical and modern field");
 assert.match(data,/id:"tucker".*vehicleStart:1948.*year:1949/);
 assert.match(data,/id:"crosley".*year:1952/);
 assert.match(data,/id:"hudson".*buyerId:"amc"/);
 assert.match(data,/id:"mclaren".*vehicleStart:1992/);
 assert.match(data,/id:"bugatti_automobili".*vehicleStart:1991.*year:1995/);
 assert.match(data,/id:"mercedes_smart".*vehicleStart:1998.*operatingMarque:true/);
 assert.match(data,/id:"vw_bugatti".*vehicleStart:2005.*operatingMarque:true/);
});

test("Acura Lexus Infiniti Genesis and other scheduled marques become full rival AI companies",()=>{
 const data=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
 const brand=fs.readFileSync(path.join(__dirname,"..","brand-evolution.js"),"utf8");
 for(const row of [["honda_acura",1986],["toyota_lexus",1989],["nissan_infiniti",1989],["mercedes_smart",1994],["vw_bugatti",1998],["hyundai_genesis",2015]])assert.match(data,new RegExp('id:"'+row[0]+'".*founded:'+row[1]+'.*operatingMarque:true'));
 assert.match(brand,/aiSubsidiary:true/);
 assert.match(brand,/aiParentId:parent\.id/);
 assert.match(brand,/operatingMarque:true/);
 assert.match(brand,/function activateHistoricalMarques/);
 const s={campaignId:"scheduled-marque-test",year:1986,month:2,corporateUnits:[{id:"acura_test2",name:"Acura",parentId:"honda_test2",country:"United States",founded:1986,launchMonth:2,valuation:450e6,cash:40e6,employees:800,factories:1,dealers:80,rd:80,operatingMarque:true,operatingMarqueType:"luxury"}],industry:[{id:"honda_test2",name:"Honda",country:"Japan",valuation:5e9,cash:700e6,brandReputation:82,rd:84,marketShare:7,dealers:700,factories:8,status:"active"}]};
 const made=global.MDXBrandEvolution.activateHistoricalMarques(s,()=>{});
 assert.equal(made.length,1);
 const acura=s.industry.find(x=>x.id==="acura_test2");
 assert.ok(acura&&acura.aiSubsidiary&&acura.aiParentId==="honda_test2");
 assert.ok(acura.factories>=1&&acura.dealers>=1);
});

test("historical shutdown status is terminal for rival AI",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(sim,/bankrupt","liquidated","discontinued","merged_into_player/);
 assert.match(game,/h\.type==="discontinue"/);
 assert.match(game,/m\.status="discontinued"/);
 assert.match(game,/h\.exact\?0/);
});


test("mobile navigation stays direct and the founding flow remains vertically scrollable",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const style=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 const expected=[
  ["hq","home"],["research","research"],["engine","engine"],["vehicle","vehicle"],
  ["operations","library"],["market","market"],["budget","budget"],["companies","companies"],["finance","finance"]
 ];
 for(const [dock,view] of expected){
  assert.match(index,new RegExp('data-dock-key="'+dock+'"[^>]*data-view="'+view+'"'));
 }
 assert.equal((index.match(/class="bottom-nav mobile-command-nav dynasty-dock phase3-global-dock nine"/g)||[]).length,1);
 assert.doesNotMatch(index,/id="mobileMoreBtn"/);
 assert.doesNotMatch(index,/id="designModal"/);
 assert.doesNotMatch(index,/id="opsModal"/);
 assert.doesNotMatch(index,/id="moreModal"/);
 assert.doesNotMatch(game,/openModal\("moreModal"\)/);
 assert.match(style,/\.create-screen\.active\{[\s\S]*overflow:visible!important/);
 assert.match(style,/body\{overflow-x:hidden!important;overflow-y:auto!important\}/);
 assert.match(style,/\.bottom-nav\.phase3-global-dock\.nine\{[\s\S]*repeat\(9,minmax\(0,1fr\)\)/);
});

test("every direct mobile dock target maps to a real game view",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const dock=[...index.matchAll(/<button[^>]+data-dock-key="([^"]+)"[^>]+data-view="([^"]+)"/g)];
 assert.equal(dock.length,9);
 const viewIds=new Set([...index.matchAll(/id="view-([^"]+)"/g)].map(m=>m[1]));
 for(const [,dockKey,view] of dock){
  assert.ok(viewIds.has(view),"dock "+dockKey+" points to missing view "+view);
 }
});


test("mobile shell clears stale modal locks and closes alerts when navigating",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const style=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(game,/function clearStaleModalLock\(\)/);
 assert.match(game,/if\(name!=="game"\)\{qsa\("\.modal"\)\.forEach\(m=>m\.classList\.add\("hidden"\)\);clearStaleModalLock\(\);\}/);
 assert.match(game,/function setView\(name\)\{const target=.*toggleNotificationDrawer\(false\)/);
 assert.match(game,/window\.addEventListener\("pageshow",\(\)=>\{clearStaleModalLock\(\);\}\)/);
 assert.match(style,/\.notification-drawer\{[\s\S]*top:72px!important;[\s\S]*bottom:calc\(112px \+ env\(safe-area-inset-bottom\)\)!important/);
});


test("save and recovery tools stay reachable without reintroducing More",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(index,/id="openStorageSettings"[^>]*>SETTINGS & SAVE<\/button>/);
 assert.match(index,/id="storageModal"/);
 assert.match(game,/\$\("openStorageSettings"\)\?\.addEventListener\("click",\(\)=>\{openModal\("storageModal"\);renderStorageHealth\(\);\}\)/);
 assert.doesNotMatch(index,/id="mobileMoreBtn"|id="moreModal"/);
});


test("mobile engine and vehicle builders keep usable touch targets",()=>{
 const style=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(style,/#view-engine \.engineering-tabs button,[\s\S]*#view-vehicle \.engineering-tabs button\{[\s\S]*min-height:38px!important/);
 assert.match(style,/#view-engine \.option,[\s\S]*#view-vehicle \.option\{[\s\S]*min-height:40px!important/);
 assert.match(style,/#view-engine \.touch-range button,[\s\S]*#view-vehicle \.touch-range button\{[\s\S]*min-height:38px!important/);
 assert.match(style,/#view-engine \.engineering-select select,[\s\S]*#view-vehicle \.engineering-select select\{[\s\S]*height:40px!important/);
});


test("Rivals explains historical manufacturer availability instead of making future companies look deleted",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(index,/id="industryTimelineStatus"/);
 assert.match(game,/function renderIndustryTimelineStatus\(\)/);
 assert.match(game,/ACTIVE AUTOMAKERS/);
 assert.match(game,/FUTURE ENTRANTS/);
 assert.match(game,/NEXT INDUSTRY ENTRANTS/);
 assert.match(game,/manufacturerActivationYear\(m\)>year/);
 assert.match(game,/renderIndustryTimelineStatus\(\);renderManufacturerDetail/);
});


test("independent industrial companies cap treasury hoarding and normalize legacy cash-driven valuations",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/function rebalanceIndependentIndustrialTreasury\(state,c,expenses=0,net=0,reserve=0\)/);
 assert.match(corp,/function repairLegacyIndependentIndustrialTreasuryOnLoad\(state,c\)/);
 assert.match(corp,/legacyIndependentTreasuryRepairV1/);
 assert.match(corp,/recipientType:"external_private_owners"/);
 assert.match(corp,/legacy_excess_cash_overhang/);
 assert.match(corp,/rebalanceIndependentIndustrialTreasury\(state,c,expenses,net,reserve\)/);
 assert.match(corp,/repairLegacyIndependentIndustrialTreasuryOnLoad\(state,c\)/);
});

test("industrial companies seed with coherent pre-campaign financial history and richer M&A states",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/function industrialOpeningBaseline\(state,s,value,cap\)/);
 assert.match(corp,/openingFinancialBaseline:active\?\{\.\.\.baseline,source:"deterministic_pre_campaign_history"\}:null/);
 assert.match(corp,/revenue:active\?baseline\.monthlyRevenue:0,operatingExpenses:active\?baseline\.operatingExpenses:0,operatingProfit:active\?baseline\.operatingProfit:0,netProfit:active\?baseline\.netProfit:0/);
 assert.match(corp,/TTM REVENUE/);
 assert.match(corp,/PRIVATE — APPROACH OWNER/);
 assert.match(corp,/BANKRUPTCY ESTATE/);
 assert.match(corp,/NOT YET FOUNDED/);
 assert.match(corp,/OWNED BY /);
 assert.match(corp,/function approachIndustrial\(state,id,log\)/);
 assert.match(corp,/function acceptIndustrialCounter\(state,id,log\)/);
 assert.match(corp,/data-corp-offer/);
 assert.match(corp,/data-corp-counter/);
});

test("industrial legacy zero-history saves get a one-time opening baseline repair without overwriting real history",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/const hasHistory=Number\(c\.lifetimeRevenue\|\|0\)>0\|\|\(Array\.isArray\(c\.valuationHistory\)&&c\.valuationHistory\.length>0\)\|\|Number\(c\.revenue\|\|0\)>0/);
 assert.match(corp,/if\(c\.openingFinancialBaseline\?\.version>=1\|\|hasHistory\)return false/);
 assert.match(corp,/applyIndustrialOpeningBaseline\(state,c,src\|\|\{\}\)/);
});


test("future industrial companies remain dormant until founded, then receive opening history",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/active=Number\(state\.year\|\|1970\)>=founded/);
 assert.match(corp,/revenue:active\?baseline\.monthlyRevenue:0/);
 assert.match(corp,/openingFinancialBaseline:active\?\{\.\.\.baseline,source:"deterministic_pre_campaign_history"\}:null/);
 assert.match(corp,/applyIndustrialOpeningBaseline\(state,c,src\|\|\{\}\)/);
});


test("historical industry seeding capacity-aligns plants and repairs existing save scale profiles",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/capacityAlignedOperatingFootprint/);
 assert.match(game,/seedCapacityAlignmentV3/);
 assert.match(game,/function repairManufacturerScaleProfilesV3\(\)/);
 assert.match(game,/function repairSystemicAutomakerScaleV4\(\)/);
 assert.match(game,/repairManufacturerScaleProfilesV3\(\);repairEarlyEraCorporateValues\(\);/);
});

test("expanded manufacturer world contains exactly 200 unique historical manufacturers with AI identity data",()=>{
 const vm=require("node:vm"),context={window:{},console:{warn(){},log(){},error(){}}};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8"),context,{filename:"data.js"});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","manufacturer-world.js"),"utf8"),context,{filename:"manufacturer-world.js"});
 const makers=context.window.MD_DATA.MANUFACTURERS;
 assert.equal(makers.length,200);
 assert.equal(new Set(makers.map(m=>m.id)).size,200);
 assert.equal(context.window.MD_DATA.MANUFACTURER_WORLD_ADDITIONS,86);
 for(const m of makers){
  assert.equal(Number.isFinite(Number(m.founded)),true,m.name+" founded");
  assert.equal(Number.isFinite(Number(m.vehicleStart??m.founded)),true,m.name+" vehicleStart");
  assert.ok(m.volumeClass,m.name+" volumeClass");
  assert.ok(m.corporatePersonality,m.name+" corporatePersonality");
  assert.ok(Array.isArray(m.preferredSegments)&&m.preferredSegments.length,m.name+" preferredSegments");
  assert.ok(Array.isArray(m.engineeringStrengths)&&m.engineeringStrengths.length,m.name+" engineeringStrengths");
  assert.ok(m.brandIdentity,m.name+" brandIdentity");
  assert.equal(Number.isFinite(Number(m.manufacturingCapability)),true,m.name+" manufacturingCapability");
  assert.equal(Number.isFinite(Number(m.engineeringCapability)),true,m.name+" engineeringCapability");
  assert.equal(Number.isFinite(Number(m.qualityTendency)),true,m.name+" qualityTendency");
  assert.equal(Number.isFinite(Number(m.reliabilityTendency)),true,m.name+" reliabilityTendency");
  assert.equal(Number.isFinite(Number(m.technologyAppetite)),true,m.name+" technologyAppetite");
 }
 const active1940=makers.filter(m=>Math.max(Number(m.founded||0),Number(m.vehicleStart??m.founded??0))<=1940);
 const active1970=makers.filter(m=>Math.max(Number(m.founded||0),Number(m.vehicleStart??m.founded??0))<=1970);
 assert.ok(active1940.length<active1970.length,"historical timeline should expand between 1940 and 1970");
 assert.ok(active1970.length<makers.length,"future manufacturers must remain locked after 1970");
 assert.ok(makers.some(m=>m.id==="faw"&&m.vehicleStart===1958));
 assert.ok(makers.some(m=>m.id==="bolwell"&&m.vehicleStart===1962));
 assert.ok(makers.some(m=>m.id==="xpeng"&&m.vehicleStart===2018));
});


test("production script order keeps the manufacturer roster at exactly 200 instead of loading both expansion packs to 237",()=>{
 const vm=require("node:vm"),context={window:{},console:{warn(){},log(){},error(){}}};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8"),context,{filename:"data.js"});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","manufacturer-expansion.js"),"utf8"),context,{filename:"manufacturer-expansion.js"});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","manufacturer-world.js"),"utf8"),context,{filename:"manufacturer-world.js"});
 const makers=context.window.MD_DATA.MANUFACTURERS;assert.equal(makers.length,200);assert.equal(new Set(makers.map(x=>x.id)).size,200);assert.equal(context.window.MD_DATA.MANUFACTURER_WORLD_VERSION,4);
});

test("legacy famous manufacturers infer realistic commercial size instead of all defaulting to mass scale",()=>{
 const vm=require("node:vm"),context={window:{},console:{warn(){},log(){},error(){}}};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8"),context,{filename:"data.js"});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","manufacturer-expansion.js"),"utf8"),context,{filename:"manufacturer-expansion.js"});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","manufacturer-world.js"),"utf8"),context,{filename:"manufacturer-world.js"});
 const byId=new Map(context.window.MD_DATA.MANUFACTURERS.map(m=>[m.id,m])),ford=byId.get("ford"),bmw=byId.get("bmw"),porsche=byId.get("porsche"),lotus=byId.get("lotus");
 assert.equal(ford.volumeClass,"mass");
 assert.equal(bmw.volumeClass,"regional");
 assert.equal(porsche.volumeClass,"niche");
 assert.equal(lotus.volumeClass,"micro");
 assert.ok(ford.seedScale>bmw.seedScale&&bmw.seedScale>porsche.seedScale&&porsche.seedScale>lotus.seedScale);
 assert.equal(context.window.MD_DATA.MANUFACTURER_WORLD_VERSION,4);
});

test("capacity alignment gives a high-volume historical automaker enough plants and workforce to support its opening sales",()=>{
 global.window=global;delete require.cache[require.resolve("../industry-sim-client.js")];require("../industry-sim-client.js");
 const hooks=global.MDXIndustrySim.__test,company={id:"historical_mass",name:"Historical Mass",volumeClass:"mass",seedScale:1,factories:1,employees:9000};
 const footprint=hooks.capacityAlignedOperatingFootprint(company,{monthSales:32000,factories:1,employees:9000});
 assert.ok(footprint.factories>=4,"32k monthly opening sales still received a one-plant bottleneck");
 assert.ok(footprint.employees>=16000,"workforce remained far below the volume implied by opening sales");
 assert.ok(footprint.monthlyCapacity>=32000*.95,"aligned plant capacity still cannot support the opening commercial scale");
});

test("systemic scale repair revives an artificially collapsed historical mass automaker",()=>{
 global.window=global;delete require.cache[require.resolve("../industry-sim-client.js")];require("../industry-sim-client.js");
 const hooks=global.MDXIndustrySim.__test,reference={id:"scale_ref",name:"Scale Reference",volumeClass:"mass",seedScale:1,seedEraYear:1940,valuation:550000000,cash:65000000,debt:80000000,factories:5,employees:18000,dealers:650,modelCount:3,monthSales:30000,openingFinancialBaseline:{monthSales:30000,monthlyRevenue:48000000}},company={id:"scale_ref",name:"Scale Reference",volumeClass:"mass",seedScale:1,status:"bankrupt",cash:-18000000,debt:620000000,factories:0,employees:80,dealers:30,monthSales:0,valuation:170000000,currentYear:1944,currentMonth:4,aiBudget:{},aiCars:[{id:"a",name:"A",modelYear:1943,active:false,ageMonths:24,inventory:0},{id:"b",name:"B",modelYear:1942,active:false,ageMonths:30,inventory:0}],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[]};
 const repaired=hooks.repairSystemicAutomakerScale(company,reference,[]);
 assert.equal(repaired,true);assert.equal(company.status,"active");assert.ok(company.factories>=4);assert.ok(company.employees>=13000);assert.ok(company.dealers>=450);assert.ok(company.aiCars.some(c=>c.active));assert.ok(company.debt<620000000);
});

test("monthly industry close immediately rechecks systemic automaker scale instead of waiting for a reload",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function repairSystemicAutomakerScaleAfterIndustryMonth\(\)/);
 assert.match(game,/if\(Array\.isArray\(data\?\.industry\)\)\{state\.industry=data\.industry;repairSystemicAutomakerScaleAfterIndustryMonth\(\);\}/);
 assert.match(game,/systemicAutomakerScaleRepairV5/);
});


test("player-owned bankrupt automaker resumes production and sales under normal difficulty",()=>{
 global.window=global;delete require.cache[require.resolve("../industry-sim-client.js")];require("../industry-sim-client.js");
 const sim=global.MDXIndustrySim,car={id:"owned_car",name:"Owned Car",active:false,year:1969,modelYear:1969,ageMonths:24,segment:"Mainstream",price:4200,cost:2200,reliability:72,quality:70,safety:65,handling:62,comfort:65,inventory:0,lastSales:0,lastProduced:0,lifetimeSales:18000,fieldIssues:0,recalls:0},company={id:"owned_bankrupt",name:"Owned Bankrupt",country:"United States",founded:1910,vehicleStart:1910,volumeClass:"regional",seedScale:.5,share:1.5,marketShare:0,focus:"Mainstream",valuation:220000000,valuationAnchor:220000000,cash:0,debt:160000000,employees:80,factories:0,dealers:18,franchiseDealers:18,companyStores:0,rd:60,brandReputation:58,dealerHealth:55,qualityCulture:60,status:"bankrupt",acquired:true,playerSubsidiary:true,preBankruptcyFactories:3,preBankruptcyEmployees:4200,preBankruptcyDealers:180,acquisitionOriginFactories:3,acquisitionOriginEmployees:4200,acquisitionOriginDealers:180,bankruptcyEstate:{activeCarIds:["owned_car"],factories:3,employees:4200,dealers:180},aiCars:[car],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[]};
 let industry=[company];for(let n=0;n<18;n++){industry=sim.simulateIndustryMonth({industry,corporateUnits:[],industrialCompanies:[],year:1970+Math.floor(n/12),month:n%12,economy:{fuelPrice:.36,consumerConfidence:67,interestRate:7},player:{difficulty:"normal"}}).industry;}
 const owned=industry[0];assert.ok(!["bankrupt","liquidated"].includes(String(owned.status)),"owned company remained permanently frozen in bankruptcy");assert.ok(Number(owned.factories||0)>=1);assert.ok(Number(owned.monthSales||0)>0,"owned company still sold zero vehicles after restart");assert.ok(Number(owned.monthProduction||0)>0,"owned company still produced zero vehicles after restart");assert.ok((owned.aiCars||[]).some(c=>c.active),"owned company restart did not preserve or restore a saleable model");
});

test("global manufacturer expansion reaches exactly 200 unique companies with era-correct activation",()=>{
 const before=global.MD_DATA;
 delete require.cache[require.resolve("../data.js")];
 delete require.cache[require.resolve("../manufacturer-expansion.js")];
 require("../data.js");
 require("../manufacturer-expansion.js");
 const makers=global.MD_DATA.MANUFACTURERS;
 assert.equal(makers.length,200);
 assert.equal(new Set(makers.map(x=>x.id)).size,200);
 const countAt=year=>makers.filter(m=>Math.max(Number(m.founded||0),Number(m.vehicleStart??m.founded??0))<=year).length;
 assert.equal(countAt(1940),42);
 assert.equal(countAt(1950),53);
 assert.equal(countAt(1960),86);
 assert.equal(countAt(1970),113);
 const required=["faw","saic","changan","maserati","ssangyong","ac_cars","agrale","pars_khodro","bolwell","saker"];
 for(const id of required)assert.ok(makers.some(m=>m.id===id),id+" missing from expanded world");
 const added=makers.filter(m=>m.worldExpansionV1===true);
 assert.equal(added.length,86);
 for(const m of added){
  assert.ok(Number.isFinite(Number(m.valuation))&&Number(m.valuation)>0,m.id+" invalid valuation");
  assert.ok(Number.isFinite(Number(m.cash))&&Number(m.cash)>0,m.id+" invalid cash");
  assert.ok(Array.isArray(m.preferredSegments)&&m.preferredSegments.length>0,m.id+" missing preferred segments");
  assert.ok(typeof m.corporatePersonality==="string"&&m.corporatePersonality.length>0,m.id+" missing corporate personality");
  assert.ok(Number.isFinite(Number(m.technologyAppetite)),m.id+" missing technology appetite");
 }
 global.MD_DATA=before;
});

test("manufacturer expansion loads before simulation and is cached for iPhone/PWA builds",()=>{
 const index=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");
 assert.ok(index.indexOf("/manufacturer-expansion.js")>index.indexOf("/data.js"));
 assert.ok(index.indexOf("/manufacturer-expansion.js")<index.indexOf("/game.js"));
 assert.match(sw,/\/manufacturer-expansion\.js/);
});


test("AI corporate personalities drive different strategy biases and competitive reactions",()=>{
 global.window=global;
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const hooks=global.MDXIndustrySim.__test;
 assert.ok(hooks);
 for(const p of ["engineering_purist","cost_leader","performance_specialist","utility_specialist","technology_leader","aggressive_conglomerate"]){
  assert.ok(hooks.CORPORATE_PERSONALITIES.includes(p),p+" missing from personality roster");
 }
 const base={id:"test_ai",name:"Test AI",cash:120000000,valuation:1000000000,engineeringCapability:82,technologyAppetite:84,preferredSegments:["Sport"],corporateMemory:{competitorResponses:[],profitableSegments:{},unprofitableSegments:{}}};
 const perf={...base,corporatePersonality:"performance_specialist"};
 const conservative={...base,corporatePersonality:"conservative_family"};
 assert.ok(hooks.personalityBias(perf,"reaction")>hooks.personalityBias(conservative,"reaction"));
 assert.ok(hooks.personalityBias(perf,"rd")>hooks.personalityBias(conservative,"rd"));
 const reaction=hooks.competitorReactionPlan(perf,{hotSegment:"Sport",segmentPressure:.9},1970);
 assert.equal(reaction.segment,"Sport");
 assert.ok(reaction.score>.5);
 const engineering={...base,corporatePersonality:"engineering_purist",focus:"advanced engineering",managementStrategy:null,managementSince:0};
 const cost={...base,corporatePersonality:"cost_leader",focus:"low-cost compact cars",managementStrategy:null,managementSince:0};
 assert.notEqual(hooks.strategyFor(engineering,1970),undefined);
 assert.notEqual(hooks.strategyFor(cost,1970),undefined);
});

test("AI memory contains product wins, failures, segment learning and competitor responses",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/successfulModels/);
 assert.match(sim,/failedProducts/);
 assert.match(sim,/profitableSegments/);
 assert.match(sim,/unprofitableSegments/);
 assert.match(sim,/competitorResponses/);
 assert.match(sim,/function rememberProductOutcome\(/);
 assert.match(sim,/function updateSegmentMemory\(/);
 assert.match(sim,/rememberCorporate\(m,"competitorResponses"/);
 assert.match(sim,/rememberCorporate\(m,"marketWins"/);
});


test("AI executive brain uses company capability metadata and persistent product memory",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function capability100\(v,fallback=60\)/);
 assert.match(sim,/function ensureExecutiveBrain\(m,year\)/);
 assert.match(sim,/technologyAppetite/);
 assert.match(sim,/manufacturingCapability/);
 assert.match(sim,/engineeringCapability/);
 assert.match(sim,/qualityBias/);
 assert.match(sim,/reliabilityBias/);
 assert.match(sim,/function updateProductMemory\(m,year\)/);
 assert.match(sim,/profitableSegments\[segment\]/);
 assert.match(sim,/unprofitableSegments\[segment\]/);
 assert.match(sim,/successfulModels/);
 assert.match(sim,/failedProducts/);
 assert.match(sim,/car\.monthGrossContribution=/);
});

test("AI vehicle planning scores heritage memory and competitor pressure instead of blindly copying the player",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function segmentOpportunityScore\(m,segment,player,year,reaction\)/);
 assert.match(sim,/function chooseVehicleSegment\(m,player,year,reaction\)/);
 assert.match(sim,/recentFailures/);
 assert.match(sim,/recentWins/);
 assert.match(sim,/playerBoost/);
 assert.match(sim,/segmentPersonalityFit/);
 assert.match(sim,/Approved .* vehicle program/);
 assert.match(sim,/memory and corporate identity informed the decision/);
});

test("AI capability normalization treats 0-to-1 technology appetite as percentages",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/return clamp\(n<=1\?n\*100:n,0,100\)/);
 assert.doesNotMatch(sim,/Number\(m\.technologyAppetite\|\|60\)\/100/);
});


test("schema 22 migrates existing saves into the expanded AI company world without resetting player state",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/SAVE_SCHEMA_VERSION=24/);
 assert.match(game,/schema_22_ai_company_world_memory_financial_baselines/);
 assert.match(game,/syncHistoricalIndustryEntrants\(s\)/);
 assert.match(game,/MDXManufacturerWorld\?\.enrich\?\.\(m\)/);
 assert.match(game,/MDX_CORP\?\.normalize\?\.\(s\)/);
 assert.match(game,/successfulModels/);
 assert.match(game,/competitorResponses/);
 assert.match(game,/unprofitableSegments/);
 assert.match(game,/player cash changed during AI company world migration/);
 assert.match(game,/vehicle roster changed during AI company world migration/);
 assert.match(game,/owned company roster changed during AI company world migration/);
 assert.match(game,/player factory count changed during AI company world migration/);
});


test("zero-factory automakers cannot magically produce vehicles or powertrains",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.doesNotMatch(sim,/m\.factories=1;m\.factorySurvivalFloorRepair=true/);
 assert.match(sim,/physicalCapacity=plantCount>0\?/);
 assert.match(sim,/capacityTotal=plantCount>0\?/);
 assert.match(sim,/baseCap=plantCount>0\?Math\.max\(20/);
 assert.match(sim,/m\.productionSuspended=true;maybeRestartClosedFactory/);
});

test("funded acquisitions explicitly restore operating assets instead of relying on free monthly factory floors",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function restoreFundedAcquisitionPlant\(m,events\)/);
 assert.match(sim,/parentCapitalInjected/);
 assert.match(sim,/factoryRestartFromAcquisition=true/);
 assert.match(sim,/Post-acquisition capitalization restored a viable operating footprint/);
 assert.match(sim,/function maybeRestartClosedFactory\(m,events\)/);
 assert.match(sim,/m\.cash=cash-restartCost/);
});

test("AI boards can make strategic healthy-company acquisitions with traceable reasons",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function strategicAutomakerFit\(buyer,target\)/);
 assert.match(sim,/function maybeStrategicAutomakerAcquisition\(industry,year,month,events\)/);
 assert.match(sim,/\[5,11\]\.includes/);
 assert.match(sim,/strategic_ai_acquisition/);
 assert.match(sim,/strategy review identified/);
 assert.match(sim,/failedAcquisitions/);
 assert.match(sim,/maybeStrategicAutomakerAcquisition\(industry,year,month,events\)/);
});


test("established automakers start with finite non-zero pre-campaign financial history",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/function manufacturerOpeningFinancials\(/);
 assert.match(game,/function applyManufacturerOpeningFinancials\(/);
 assert.match(game,/monthRevenue:opening\.monthlyRevenue/);
 assert.match(game,/ttmRevenue:opening\.annualizedRevenue/);
 assert.match(game,/lastYearRevenue:opening\.lastYearRevenue/);
 assert.match(game,/lifetimeRevenue:opening\.lifetimeRevenue/);
 assert.match(game,/openingFinancialBaseline:\{\.\.\.opening,source:"deterministic_pre_campaign_automaker_history"\}/);
 assert.match(game,/financialBaselinesRepaired/);
 assert.doesNotMatch(game,/underutilizedMonths:0,lossMonths:0,monthRevenue:0,monthProfit:0,monthSales:0/);
});


test("zero-factory automakers cannot produce until a real plant is restored or reopened",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/plantCount=Math\.max\(0,Number\(m\.factories\|\|0\)\)/);
 assert.match(sim,/physicalCapacity=plantCount>0\?/);
 assert.match(sim,/capacityTotal=plantCount>0\?/);
 assert.match(sim,/baseCap=plantCount>0\?Math\.max\(20/);
 assert.doesNotMatch(sim,/\(m\.factories\|\|1\)\*9500/);
 assert.match(sim,/function maybeRestartClosedFactory\(m,events\)/);
 assert.match(sim,/m\.cash=cash-restartCost;m\.factories=1/);
});

test("legacy acquired automakers recover viable operating plants without reviving independent zero-factory firms",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/historyFactories=Math\.max\(0,Number\(target\.preAcquisitionFactories/);
 assert.match(sim,/restoredFactories=recordedFactories>0\?recordedFactories:Math\.max\(1/);
 assert.match(sim,/target\.factories=restoredFactories/);
 assert.match(sim,/factoryMigrationRepair=recordedFactories<1/);
 assert.match(sim,/target\.productionSuspended=false/);
});

test("strategic AI automaker M&A runs only at board-review cadence and records rationale",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function strategicAutomakerFitBreakdown\(buyer,target\)/);
 assert.match(sim,/function aiAutomakerAcquisitionTerms\(buyer,target,year,month\)/);
 assert.match(sim,/function maybeStrategicAutomakerAcquisition\(industry,year,month,events\)/);
 assert.match(sim,/if\(!\[5,11\]\.includes\(Number\(month\|\|0\)\)\)return null/);
 assert.match(sim,/rationale=fit\.reasons\.join/);
 assert.match(sim,/maybeStrategicAutomakerAcquisition\(industry,year,month,events\)/);
});


test("industrial AI contracts extend beyond engines and transmissions",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/function genericIndustrialProduct\(c,state,index=0\)/);
 assert.match(corp,/buyer\.industrialSupplyContracts/);
 assert.match(corp,/monthIndustrialSupplyPurchases/);
 assert.match(corp,/monthIndustrialSupplyQuality/);
 assert.doesNotMatch(corp,/if\(!POWERTRAIN_INDUSTRIES\.has\(c\.industry\)\|\|c\.status!==\"active\"/);
});

test("industrial suppliers now create real category-specific component inventory and production constraints",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(corp,/const COMPONENT_FLOW_PROFILE=/);
 assert.match(corp,/steel:\{label:"Body \/ chassis steel",unit:"kg",usagePerVehicle:780,outputPerCapacity:780/);
 assert.match(corp,/tires:\{label:"Tires",unit:"tires",usagePerVehicle:4,outputPerCapacity:4/);
 assert.match(corp,/function normalizeComponentSupply\(state,seed=true\)/);
 assert.match(corp,/function registerComponentDelivery\(state,c,capacityPoints,meta=/);
 assert.match(corp,/function componentProductionConstraint\(state,v,requested\)/);
 assert.match(corp,/function previewVehicleComponents\(state,v,vehicles\)/);
 assert.match(corp,/function consumeVehicleComponents\(state,v,vehicles,provenanceUnits=vehicles\)/);
 assert.match(corp,/monthAvailableCapacity=available/);
 assert.match(corp,/monthUnallocatedCapacity=Math\.max\(0,available-units\)/);
 assert.match(corp,/monthPlayerComponentRevenue\+=interco\.revenue/);
 assert.match(corp,/monthPlayerComponentRevenue\+=spot\*price/);
 assert.match(corp,/deliveryLedger\.unshift/);
 assert.match(expansion,/componentProductionConstraint\?\.\(state,v,rawScheduled\)/);
 assert.match(expansion,/previewVehicleComponents\?\.\(state,v,scheduled\)/);
 assert.match(expansion,/consumeVehicleComponents\?\.\(state,v,componentConsumed,produced\)/);
 assert.match(expansion,/state\.dailyTotals\.componentShortage\+=v\.todayComponentShortage/);
});

test("supplier quality defects are lot-traceable instead of global random penalties",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const quality=fs.readFileSync(path.join(__dirname,"..","market-quality.js"),"utf8");
 assert.match(corp,/componentProvenance\.unshift/);
 assert.match(corp,/function traceSupplierExposure\(state,supplierId,kind=null,months=18\)/);
 assert.match(corp,/some\(x=>x\.supplierId===supplierId&&\(!kind\|\|x\.kind===kind\)\)/);
 assert.match(corp,/function maybeSupplierQualityIncidents\(state,log=/);
 assert.match(corp,/affectedModels:exposure\.map/);
 assert.match(corp,/v\.supplierDefectRisk=clamp/);
 assert.match(expansion,/componentQuality=clamp\(Number\(componentMix\?\.quality/);
 assert.match(expansion,/componentReliability=clamp\(Number\(componentMix\?\.reliability/);
 assert.match(quality,/supplierIncident=v\?clamp\(1\+num\(v\.supplierDefectRisk,0\)/);
 assert.match(quality,/base\*manufacturing\*supplierIncident/);
});

test("supplier shortages use bounded emergency sourcing rather than magical unlimited capacity",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 assert.match(corp,/coverage=state\.difficulty==="casual"\?\.85:state\.difficulty==="realistic"\?\.22:\.42/);
 assert.match(corp,/const ordinaryPoints=Math\.min\(demand,Math\.ceil\(componentVehicleDemandTarget\(state\)\*coverage\)\)/);
 assert.match(corp,/lastMonthShortfall\[kind\]=left/);
 assert.match(corp,/costPressure=clamp\(1\+/);
 assert.match(expansion,/componentCostPressure=clamp\(Number\(state\.componentSupply\?\.costPressure\|\|1\),1,1\.24\)/);
 assert.match(expansion,/cost:\(1-discount\)\*commodityCost\*componentCostPressure/);
});

test("industrial AI reviews strategy develops products and cuts chronically underused capacity",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/function industrialStrategyReview\(state,c\)/);
 assert.match(corp,/next=\"technology\"/);
 assert.match(corp,/c\.managementStrategy=next/);
 assert.match(corp,/underutilizedMonths=net<0&&c\.utilization<\.38/);
 assert.match(corp,/c\.factories=Math\.max\(1,c\.factories-1\)/);
 assert.match(corp,/c\.capacity=Math\.max\(100,Math\.round\(c\.capacity\*\.86\)\)/);
 assert.match(corp,/Industrial R&D program replaced an aging/);
});


test("generic industrial procurement is charged once to buyer profit",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/const priorProfit=Number\(buyer\.monthProfit\|\|0\),priorNet=/);
 assert.match(corp,/buyer\.monthProfit=priorProfit-payment/);
 assert.match(corp,/buyer\.monthNetProfit=priorNet-payment/);
 assert.doesNotMatch(corp,/monthNetProfit=Number\(buyer\.monthNetProfit\|\|buyer\.monthProfit\|\|0\)-payment/);
});


test("heavy AI supplier searches are deterministically staggered for the 200-company world",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function strategicCohort\(m,year,month,mod=4,stream="strategy"\)/);
 assert.match(sim,/strategicCohort\(buyer,year,month,4,"engine-contract-search"\)/);
 assert.match(sim,/strategicCohort\(buyer,year,month,4,"transmission-contract-search"\)/);
});

test("zero-factory AI suppliers cannot win new powertrain contracts",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/sellerPolicy\.engineSales===\"off\"\|\|Number\(seller\.factories\|\|0\)<1/);
 assert.match(sim,/sellerPolicy\.transmissionSales===\"off\"\|\|Number\(seller\.factories\|\|0\)<1/);
 assert.doesNotMatch(sim,/\(best\.seller\.factories\|\|1\)\*3200/);
 assert.doesNotMatch(sim,/\(best\.seller\.factories\|\|1\)\*2800/);
});

test("AI automaker and industrial company finances repair NaN and Infinity before persistence",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(sim,/function repairAiCompanyFiniteState\(m,year,month,events\)/);
 assert.match(sim,/repairAiCompanyFiniteState\(m,year,month,events\)/);
 assert.match(corp,/function repairIndustrialFiniteState\(c\)/);
 assert.match(corp,/repairIndustrialFiniteState\(c\);c\.valuationHistory\.unshift/);
});


test("AI difficulty changes financial consequences without changing decision intelligence",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function aiFinancialDifficulty\(m\)/);
 assert.match(sim,/reserveMultiplier:\.84/);
 assert.match(sim,/reserveMultiplier:1\.18/);
 assert.match(sim,/leverageDelta:\.08/);
 assert.match(sim,/leverageDelta:-\.07/);
 assert.match(sim,/distressMonths:6/);
 assert.match(sim,/distressMonths:3/);
 assert.match(sim,/insolvencyLossMonths:12/);
 assert.match(sim,/insolvencyLossMonths:7/);
 assert.match(sim,/m\.simDifficulty=String\(player\.difficulty\|\|\"normal\"\)/);
 const reaction=sim.slice(sim.indexOf("function competitorReactionPlan"),sim.indexOf("function segmentPersonalityFit"));
 assert.doesNotMatch(reaction,/simDifficulty|aiFinancialDifficulty/);
 const planning=sim.slice(sim.indexOf("function chooseVehicleSegment"),sim.indexOf("function advanceProjects"));
 assert.doesNotMatch(planning,/simDifficulty|aiFinancialDifficulty/);
});

test("industrial company failure and financing thresholds respect difficulty",()=>{
 const corp=fs.readFileSync(path.join(__dirname,"..","corporate-economy.js"),"utf8");
 assert.match(corp,/function industrialFinancialDifficulty\(state\)/);
 assert.match(corp,/bankruptcyMonths:13/);
 assert.match(corp,/bankruptcyMonths:8/);
 assert.match(corp,/debtCeiling:\.62/);
 assert.match(corp,/debtCeiling:\.48/);
 assert.match(corp,/c\.distressMonths>=difficulty\.distressMonths/);
 assert.match(corp,/c\.distressMonths>=difficulty\.bankruptcyMonths/);
});


test("AI aging models launch explicit replacement generations without a lineup gap",()=>{
 global.window=global;
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 const hooks=global.MDXIndustrySim.__test,events=[];
 const engine=i=>({id:"e"+i,name:"E"+i,active:true,hp:145+i*10,cost:1200,disp:2.0,reliability:84,config:"I4",turbo:false});
 const trans=i=>({id:"t"+i,name:"T"+i,active:true,type:"automatic",gears:5,torque:320,cost:650,reliability:86,efficiency:.92,smoothness:78});
 const platform=i=>({id:"p"+i,name:"P"+i,active:true,bodies:["Budget","Family","Mainstream","Premium","Luxury","Sport","Utility","Off-Road"],maturity:82,drive:"RWD",models:0});
 const old={id:"old_atlas",name:"Atlas",year:1972,modelYear:1978,generation:2,segment:"Family",active:true,ageMonths:102,lastSales:90,lifetimeSales:85000,cost:9000,price:16000,inventory:300,quality:78,safety:75};
 const newer={id:"newer_city",name:"City",year:1978,modelYear:1978,generation:1,segment:"Budget",active:true,ageMonths:24,lastSales:420,lifetimeSales:35000,cost:7000,price:12000,inventory:150,quality:74,safety:70};
 const m={id:"lineage_motors",name:"Lineage Motors",country:"United States",status:"active",focus:"Family • reliability",corporatePersonality:"conservative_family",preferredSegments:["Family"],cash:600000000,debt:80000000,valuation:2400000000,valuationAnchor:2400000000,employees:18000,factories:4,dealers:900,rd:82,qualityCulture:82,brandReputation:72,dealerHealth:75,managementSkill:1.05,riskTolerance:.9,recoverySkill:1.05,treasuryDiscipline:1.05,aiBudget:{mode:"balanced",rd:2000000,quality:900000,marketing:900000,dealer:500000,admin:700000,capex:800000,reserveTarget:30000000},aiProjects:[],aiCars:[old,newer],aiEngines:[engine(0),engine(1),engine(2)],aiTransmissions:[trans(0),trans(1),trans(2)],aiPlatforms:[platform(0),platform(1)],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],corporateMemory:{competitorResponses:[],profitableSegments:{Family:.8},unprofitableSegments:{},successfulModels:[],failedProducts:[],supplierWins:[],supplierFailures:[],acquisitions:[],failedAcquisitions:[],divestitures:[],technologyWins:[],marketExits:[],marketWins:[],marketFailures:[],formerPartners:[],formerSubsidiaries:[],qualityIncidents:[],executiveWins:[],restructuringOutcomes:[]}};
 hooks.maybeStartProjects(m,1980,events,{hotSegment:"Sport",segmentPressure:.95});
 const replacement=m.aiProjects.find(p=>p.type==="vehicle"&&p.replacementForId===old.id);
 assert.ok(replacement,"aging model did not trigger an explicit replacement project");
 assert.equal(replacement.segment,"Family","replacement abandoned the outgoing model segment");
 hooks.manageProductLifecycle(m,1980,events);
 assert.equal(old.active,true,"outgoing generation was retired before its replacement launched");
 replacement.monthsRemaining=1;replacement.totalMonths=Math.max(1,replacement.totalMonths||1);
 hooks.advanceProjects(m,1980,events);
 const successor=m.aiCars.find(c=>c.previousGenerationId===old.id);
 assert.ok(successor,"completed replacement project did not create a successor generation");
 assert.equal(successor.name,"Atlas");
 assert.equal(successor.segment,"Family");
 assert.equal(successor.generation,3);
 assert.equal(old.active,false,"outgoing generation remained active after successor launch");
 assert.equal(old.replacedById,successor.id);
 assert.equal(successor.lineageRootId,old.id);
});

test("approved AI vehicle segment drives engine transmission and platform selection",()=>{
 const sim=fs.readFileSync(path.join(__dirname,"..","industry-sim-client.js"),"utf8");
 assert.match(sim,/function createCar\(m,year,index,forcedSegment=null\)/);
 assert.match(sim,/forcedSegment&&SEGMENTS\.includes\(forcedSegment\)\?forcedSegment:segmentFor/);
 assert.match(sim,/createCar\(m,year,m\.aiCars\.length,p\.segment\)/);
});


