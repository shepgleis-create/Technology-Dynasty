const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

global.window=global;

function loadSim(){
 delete require.cache[require.resolve("../industry-sim-client.js")];
 require("../industry-sim-client.js");
 return global.MDXIndustrySim;
}

test("a grown player subsidiary is not permanently trapped at its founding micro scale",()=>{
 const sim=loadSim();
 const hooks=sim.__test;
 const company={
  id:"scaled_crosley_case",name:"Scaled Crosley Case",country:"United States",founded:1900,vehicleStart:1900,
  volumeClass:"micro",seedScale:.05,share:.1,marketShare:.1,focus:"Value",
  valuation:220000000,valuationAnchor:220000000,cash:50000000,debt:20000000,
  employees:10643,factories:15,dealers:50,franchiseDealers:48,companyStores:2,
  rd:72,brandReputation:70,dealerHealth:70,qualityCulture:72,status:"active",
  acquired:true,playerSubsidiary:true,parentBudgetControl:"ai",parentAutonomy:"medium",
  parentOperatingModel:"balanced",parentProductMandate:"heritage",
  aiCars:[],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],
  aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},
  aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},
  recallHistory:[],powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:true,allowExternalTransmissions:true}
 };
 assert.equal(hooks.declaredVolumeProfile(company).id,"micro");
 assert.equal(hooks.footprintVolumeClass(company),"mass");
 assert.equal(hooks.volumeProfile(company).id,"mass","large acquired company remained stuck at micro demand/capacity scaling");

 const result=sim.simulateIndustryMonth({
  industry:[company],corporateUnits:[],industrialCompanies:[],year:1945,month:7,
  economy:{fuelPrice:.25,consumerConfidence:68,interestRate:4},
  player:{difficulty:"casual"}
 });
 const grown=result.industry[0];
 assert.equal(grown.operatingVolumeClass,"mass");
 assert.ok(Number(grown.monthEffectiveCapacity)>=10000,"effective assembly capacity did not reflect the grown workforce");
 assert.ok(Number(grown.monthProduction)>0&&Number(grown.monthSales)>0,"large acquired company stopped operating entirely");
 assert.ok(Number(grown.dealers)>=50&&Number(grown.dealers)<140,"Casual backing instantly inflated the dealer network instead of pacing commercial growth");
 assert.ok(Number(grown.monthSales)<Number(grown.monthEffectiveCapacity),"a small inherited retail network instantly sold at full 15-factory capacity");
 assert.ok(Number(grown.casualRetailScaleTarget||0)>Number(grown.dealers||0),"commercial expansion target should exist without being granted instantly");
});

test("legacy Casual hyper-growth is pulled back to a time-earned footprint",()=>{
 const sim=loadSim(),hooks=sim.__test,cars=Array.from({length:29},(_,i)=>({id:"car_"+i,name:"Car "+i,active:true,lastSales:2000-i*20,lifetimeSales:50000-i*500,ageMonths:12+i,inventory:2500,cost:2200}));
 const company={id:"legacy_crosley",name:"Crosley Motors",volumeClass:"micro",playerSubsidiary:true,casualParentGrowthGuarantee:true,casualParentBackingMonths:52,currentYear:1943,currentMonth:7,valuation:717900000,valuationAnchor:717900000,cash:911140000,monthRevenue:172260000,parentCapitalInjected:0,factories:14,employees:30239,dealers:1257,franchiseDealers:1200,companyStores:57,aiCars:cars,acquisitionOriginFactories:1,acquisitionOriginDealers:30,acquisitionOriginValuation:12000000};
 const repaired=hooks.repairLegacyCasualOvergrowth(company,[]);
 assert.equal(repaired,true);
 assert.ok(company.factories<=3,"micro subsidiary kept impossible factory sprawl after repair");
 assert.ok(company.dealers<=125,"micro subsidiary kept impossible dealer sprawl after repair");
 assert.ok(company.employees<=3600,"workforce remained scaled for the corrupted factory footprint");
 assert.ok(company.aiCars.filter(x=>x.active).length<=4,"duplicate active product lines were not retired");
 assert.ok(company.cash<20000000,"bug-created cash remained near a billion dollars");
 assert.ok(company.valuation<40000000,"bug-created valuation remained hundreds of millions in the early 1940s");
 assert.equal(company.casualEconomyBalanceRepairV5.applied,true);
 assert.equal(company.casualEconomyBalanceRepairV4.applied,true);
});

test("Group subsidiary cards separate vehicle and contract economics",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 assert.match(game,/lastVehicleRevenue=Number\(m\.monthVehicleRevenue\|\|0\)/);
 assert.match(game,/lastContractRevenue=Number\(m\.monthPowertrainSupplyRevenue/);
 assert.match(game,/lastContractUnits=Number\(m\.monthAiPowertrainUnitsSold\|\|0\)\+Number\(m\.monthAiTransmissionUnitsSold\|\|0\)/);
 for(const label of ["VEHICLE REVENUE","CONTRACT REVENUE","CONTRACT OUTPUT","TOTAL REVENUE","VEHICLE PRODUCTION"])assert.match(game,new RegExp(label));
 assert.match(game,/effectiveCapacity=Number\(m\.monthEffectiveCapacity\|\|0\)/);
});



test("Casual acquired mass automaker keeps producing through turnaround instead of falling into a zero-sales debt spiral",()=>{
 const sim=loadSim(),company={id:"owned_mass_recovery",name:"Owned Mass Recovery",country:"United States",founded:1903,vehicleStart:1903,volumeClass:"mass",seedScale:1,share:10,marketShare:10,focus:"Mass market",valuation:280000000,valuationAnchor:280000000,cash:12000000,debt:150000000,employees:3500,factories:2,dealers:120,franchiseDealers:115,companyStores:5,rd:60,brandReputation:55,dealerHealth:55,qualityCulture:60,status:"restructuring",acquired:true,playerSubsidiary:true,parentBudgetControl:"ai",parentAutonomy:"high",parentOperatingModel:"balanced",parentProductMandate:"heritage",casualParentGrowthGuarantee:true,casualParentBackingMonths:0,acquisitionOriginValuation:280000000,acquisitionOriginFactories:2,acquisitionOriginDealers:120,aiCars:[{id:"rec1",name:"Recovery Sedan",year:1940,modelYear:1940,generation:1,segment:"Family",price:3000,cost:1900,reliability:60,quality:60,safety:45,handling:55,comfort:50,active:true,ageMonths:12,inventory:300,lastSales:500,lastProduced:500,lifetimeSales:5000,fieldIssues:0,recalls:0},{id:"rec2",name:"Recovery Budget",year:1940,modelYear:1940,generation:1,segment:"Budget",price:2500,cost:1700,reliability:62,quality:60,safety:45,handling:52,comfort:45,active:true,ageMonths:12,inventory:250,lastSales:400,lastProduced:400,lifetimeSales:4000,fieldIssues:0,recalls:0}],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:true,allowExternalTransmissions:true}};
 let industry=[company],zeroSalesStreak=0,maxZeroStreak=0,last=null;
 for(let k=0;k<48;k++){const year=1942+Math.floor(k/12),month=k%12;industry=sim.simulateIndustryMonth({industry,corporateUnits:[],industrialCompanies:[],year,month,economy:{fuelPrice:.22,consumerConfidence:68,interestRate:4},player:{difficulty:"casual"}}).industry;last=industry[0];zeroSalesStreak=Number(last.monthSales||0)<=0?zeroSalesStreak+1:0;maxZeroStreak=Math.max(maxZeroStreak,zeroSalesStreak);}
 assert.notEqual(last.status,"bankrupt");assert.ok(last.monthSales>=2500,"large acquired automaker never recovered meaningful monthly sales");assert.ok(last.monthProduction>0,"production stayed dead despite active demand and factories");assert.ok(maxZeroStreak<4,"turnaround became trapped at zero sales for multiple months");assert.ok(Number(last.debt||0)<220000000,"Casual parent support still compounded into an uncontrolled debt spiral");
});

test("legacy Casual hyper-growth is normalized instead of compounding forever",()=>{
 const sim=loadSim();
 const cars=Array.from({length:29},(_,i)=>({id:"legacy_"+i,name:"Legacy "+i,active:true,year:1940,modelYear:1942,ageMonths:20+i,segment:i%2?"Mainstream":"Family",price:3200,cost:1700,reliability:88,quality:88,safety:75,handling:70,comfort:72,inventory:100,lastSales:1000+i*25,lastProduced:1000+i*25,lifetimeSales:25000+i*1000,fieldIssues:0,recalls:0}));
 const company={id:"legacy_runaway",name:"Legacy Runaway",country:"United States",founded:1900,vehicleStart:1900,volumeClass:"micro",seedScale:.05,share:.1,marketShare:.1,focus:"Value",valuation:720000000,valuationAnchor:720000000,cash:911000000,debt:0,employees:30000,factories:14,dealers:1257,franchiseDealers:1200,companyStores:57,rd:90,brandReputation:95,dealerHealth:100,qualityCulture:92,status:"active",acquired:true,playerSubsidiary:true,parentBudgetControl:"ai",parentAutonomy:"high",parentOperatingModel:"balanced",parentProductMandate:"heritage",casualParentGrowthGuarantee:true,acquisitionOriginValuation:12000000,acquisitionOriginFactories:1,acquisitionOriginDealers:30,aiCars:cars,aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:true,allowExternalTransmissions:true}};
 const result=sim.simulateIndustryMonth({industry:[company],corporateUnits:[],industrialCompanies:[],year:1943,month:7,economy:{fuelPrice:.25,consumerConfidence:68,interestRate:4},player:{difficulty:"casual"}});
 const repaired=result.industry[0];
 assert.equal(repaired.casualEconomyBalanceRepairV5?.applied,true);
 assert.ok(repaired.aiCars.filter(x=>x.active).length<=8,"legacy 29-model portfolio was not rationalized");
 assert.ok(Number(repaired.dealers)<=700,"legacy dealer explosion survived the balance repair");
 assert.ok(Number(repaired.cash)<50000000,"legacy free-cash explosion survived the balance repair");
 assert.ok(Number(repaired.valuation)<50000000,"legacy valuation explosion survived the balance repair");
 assert.ok(Number(repaired.factories)<14,"legacy excess factory footprint survived the balance repair");
});



test("Casual parent backing produces a slow turnaround without zero production or hyper-growth",()=>{
 const sim=loadSim();
 let company={id:"turnaround_micro",name:"Turnaround Micro",country:"United States",founded:1939,vehicleStart:1939,volumeClass:"micro",seedScale:.08,share:.018,marketShare:.018,focus:"Tiny affordable cars",valuation:75000000,valuationAnchor:75000000,cash:11000000,debt:8000000,employees:900,factories:1,dealers:30,franchiseDealers:28,companyStores:2,rd:55,brandReputation:52,dealerHealth:62,qualityCulture:58,status:"active",acquired:true,playerSubsidiary:true,parentBudgetControl:"ai",parentAutonomy:"high",parentOperatingModel:"balanced",parentProductMandate:"heritage",aiCars:[{id:"c1",name:"Sedan",year:1940,modelYear:1940,generation:1,segment:"Budget",price:1500,cost:850,reliability:60,quality:60,safety:45,handling:55,comfort:50,active:true,ageMonths:6,inventory:300,lastSales:350,lastProduced:400,lifetimeSales:3000,fieldIssues:0,recalls:0},{id:"c2",name:"Utility",year:1940,modelYear:1940,generation:1,segment:"Utility",price:1700,cost:980,reliability:58,quality:58,safety:45,handling:50,comfort:48,active:true,ageMonths:5,inventory:250,lastSales:220,lastProduced:260,lifetimeSales:1800,fieldIssues:0,recalls:0}],aiEngines:[],aiTransmissions:[],aiPlatforms:[],aiProjects:[],aiPowertrainContracts:[],aiPowertrainSales:[],externalEngineSupply:[],externalPowertrainInventory:{},aiTransmissionContracts:[],aiTransmissionSales:[],externalTransmissionSupply:[],externalTransmissionInventory:{},recallHistory:[],powertrainPolicy:{engineSales:"allow",transmissionSales:"allow",allowExternalEngines:true,allowExternalTransmissions:true}};
 let industry=[company],minProduction=Infinity,maxSales=0,profitableMonths=0;
 for(let n=0;n<60;n++){const year=1940+Math.floor(n/12),month=n%12;industry=sim.simulateIndustryMonth({industry,corporateUnits:[],industrialCompanies:[],year,month,economy:{fuelPrice:.2,consumerConfidence:68,interestRate:4},player:{difficulty:"casual"}}).industry;company=industry[0];if(n>=12){minProduction=Math.min(minProduction,Number(company.monthProduction||0));maxSales=Math.max(maxSales,Number(company.monthSales||0));if(Number(company.monthNetProfit||0)>0)profitableMonths++;}}
 assert.ok(minProduction>0,"parent-backed turnaround fell back into zero vehicle production");
 assert.ok(maxSales>=400,"parent-backed demand never matured enough to support a real recovery");
 assert.ok(profitableMonths>=1,"five-year turnaround never reached even one profitable month");
 assert.ok(Number(company.dealers)<100&&Number(company.factories)<=3,"turnaround recovered by recreating the old instant scale explosion");
 assert.ok(Number(company.debt)<25000000,"survival financing compounded into runaway debt instead of a controlled turnaround");
});

test("merger continuity, six-month successor rules and Concept entry points are encoded in the live game",()=>{
 const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
 const expansion=fs.readFileSync(path.join(__dirname,"..","expansion.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"..","style.css"),"utf8");
 assert.match(game,/function repairMergedVehicleContinuityV3\(/);
 assert.match(game,/function repairOwnedCasualSubsidiaryScaleOnLoad\(/);
 assert.match(game,/repairOwnedCasualSubsidiaryScaleOnLoad\(\);showScreen/);
 assert.match(game,/productionStatus="production";v\.productionEnabled=true/);
 assert.match(game,/mergeIntegrationVersion=4/);
 assert.match(game,/monthsRemaining:6,totalMonths:6/);
 assert.match(game,/newTotal=6/);
 assert.match(expansion,/function repairLiveModelPrograms\(state\)/);
 assert.match(expansion,/limits=\{modelyear:45,facelift:120,generation:180\}/);
 assert.match(expansion,/p\.backgroundProduction=true;p\.productionContinues=/);
 assert.match(expansion,/hardLimit>0&&p\.calendarDaysElapsed>=hardLimit/);
 assert.match(expansion,/backgroundProduction:true/);
 assert.match(game,/conceptNewProductLine/);
 assert.match(game,/conceptNewPlatform/);
 assert.match(game,/NEW PRODUCT LINE/);
 assert.match(game,/NEW PLATFORM/);
 assert.match(game,/hero\.insertAdjacentElement\("afterend",nav\)/);
 assert.match(css,/ECOSYSTEM REPAIR V6/);
 assert.match(fs.readFileSync(path.join(__dirname,"..","viewport-fit.js"),"utf8"),/classList\.remove\("builder-scrollable"\)/);
 assert.match(game,/subsidiary-manager-tabs/);
 assert.match(game,/function subsidiaryYearsHeld\(s\)/);
 assert.match(game,/acquiredMonth:state\.month/);
 assert.match(game,/casualSubsidiaryScaleRepairOnLoadV5/);
});;
