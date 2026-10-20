/* Long-horizon economic regression: run against the actual shipped simulation. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createServer}=require('./dev');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../playtest-economy-output');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#newCompanyBtn').click();
  await page.locator('#companyName').fill('Economy Audit Motors');
  await page.locator('#founderName').fill('Audit');
  await page.locator('[data-start-year="1940"]').click();
  await page.locator('#difficulty').selectOption('normal');
  await page.locator('#newGameTutorial').uncheck();
  await page.locator('#toHQ').click();await page.locator('#toSummary').click();await page.locator('#foundBtn').click();
  await page.locator('#screen-game.active').waitFor();
  await page.evaluate(()=>MDXGame.save());
  const results=[];
  for(let year=1940;year<2020;year++){
   await page.evaluate(()=>MDXQA.advanceFast(360));
   const row=await page.evaluate(()=>{
    const s=MDXGame.getState(),r=s.industry||[];
    const values=r.map(x=>Number(x.valuation||0)),losses=r.filter(x=>Number(x.monthProfit||0)<0).length,leader=r.reduce((top,x)=>Number(x.valuation||0)>Number(top?.valuation||0)?x:top,null),worst=r.reduce((low,x)=>Number(x.monthProfit||0)<Number(low?.monthProfit??0)?x:low,null);
    return {year:s.year,cash:s.cash,debt:s.debt,playerProfit:s.lastProfit,companies:r.length,
     maxValuation:Math.max(0,...values),distressed:r.filter(x=>x.status==='distressed').length,
     losses,topCompany:leader?{id:leader.id,name:leader.name,valuation:leader.valuation,cash:leader.cash,debt:leader.debt,monthRevenue:leader.monthRevenue,monthProfit:leader.monthProfit,factories:leader.factories,employees:leader.employees,dealers:leader.dealers,modelCount:(leader.aiCars||[]).filter(v=>v.active).length,monthIndustrialDividends:leader.monthIndustrialDividends,industrialHoldings:(s.industrialCompanies||[]).filter(c=>c.ownerId===leader.id).map(c=>({name:c.name,kind:c.industry,capacity:c.capacity,monthUnits:c.monthUnits,monthThirdPartyRevenue:c.monthThirdPartyRevenue,monthUnservedThirdPartyDemand:c.monthUnservedThirdPartyDemand,monthMarketClearedThirdPartyUnits:c.monthMarketClearedThirdPartyUnits,netProfit:c.netProfit,cash:c.cash,value:c.value,lifetimeDividends:c.lifetimeDividends})).slice(0,18),industryMarket:s.lastIndustrialMarketClearing,monthSubsidiaryDistributions:leader.monthSubsidiaryDistributions,monthEquityFinancing:leader.monthEquityFinancing,monthFinancingCashFlow:leader.monthFinancingCashFlow,monthWorkingCapitalBorrowing:leader.monthWorkingCapitalBorrowing,monthParentInjection:leader.monthParentInjection,monthOperatingCashFlow:leader.monthOperatingCashFlow,lifetimeParentDistributions:leader.lifetimeParentDistributions,corporateMemory:leader.corporateMemory,corporateRescuePlan:leader.corporateRescuePlan,aiSubsidiaries:r.filter(x=>x.aiParentId===leader.id||x.ownerId===leader.id).map(x=>({id:x.id,name:x.name,cash:x.cash,valuation:x.valuation,monthProfit:x.monthProfit})).slice(0,12),corporateUnits:(s.corporateUnits||[]).filter(x=>x.parentId===leader.id).map(x=>({name:x.name,cash:x.cash,valuation:x.valuation,monthProfit:x.monthProfit})).slice(0,20),drivers:leader.lastValuationDrivers}:null,extremeLosses:r.filter(x=>Number(x.monthProfit||0)<-1e10).length,worstCompany:worst?{id:worst.id,name:worst.name,year:s.year,month:s.month,status:worst.status,cash:worst.cash,debt:worst.debt,valuation:worst.valuation,monthProfit:worst.monthProfit,monthOperatingProfit:worst.monthOperatingProfit,monthOperatingCashFlow:worst.monthOperatingCashFlow,monthRevenue:worst.monthRevenue,monthVehicleRevenue:worst.monthVehicleRevenue,monthCogs:worst.monthCogs,monthPayroll:worst.monthPayroll,monthPlantCost:worst.monthPlantCost,monthRetailNetworkCost:worst.monthRetailNetworkCost,monthBudgetSpend:worst.monthBudgetSpend,monthRecallCost:worst.monthRecallCost,monthWarrantyCost:worst.monthWarrantyCost,interestExpense:worst.monthInterestExpense,monthProductionCash:worst.monthProductionCash,monthFinancingCashFlow:worst.monthFinancingCashFlow,monthSales:worst.monthSales,factories:worst.factories,employees:worst.employees,dealers:worst.dealers,companyStores:worst.companyStores,modelCount:(worst.aiCars||[]).filter(v=>v.active).length,scaleRepair:worst.systemicAutomakerScaleRepairV4,drivers:worst.lastValuationDrivers}:null,
     invalid:r.filter(x=>![x.cash,x.debt,x.valuation,x.monthProfit].every(v=>Number.isFinite(Number(v||0)))).length};
   });
   results.push(row);const {topCompany,worstCompany,...summary}=row;console.log(JSON.stringify(summary));if(row.extremeLosses>0)console.log("EXTREME LOSS DIAGNOSTIC "+JSON.stringify(worstCompany));if(row.maxValuation>1e10)console.log("VALUATION DIAGNOSTIC "+JSON.stringify(topCompany));fs.writeFileSync(path.join(out,"report-progress.json"),JSON.stringify({ok:false,years:results.length,results,last:row},null,2));
   assert.equal(row.invalid,0,'non-finite rival finances in '+row.year);
   assert.ok(Number.isFinite(row.cash),'non-finite player cash in '+row.year);
   assert.ok(row.maxValuation<1e12,'rival valuation exceeds $1 trillion in '+row.year);
   assert.equal(row.extremeLosses,0,'rival monthly losses exceed $10 billion in '+row.year);
  }
  const finalState=await page.evaluate(()=>{const s=MDXGame.getState();return{year:s.year,month:s.month,day:s.day,cash:s.cash,debt:s.debt,profit:s.lastProfit,companies:(s.industry||[]).length};});
  assert.ok(finalState.year>=2020,'simulation did not reach 2020');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({ok:true,years:results.length,startYear:1940,endYear:finalState.year,results,finalState},null,2));
  await page.screenshot({path:path.join(out,'economy-2020.png'),fullPage:true});
  console.log('80-year economic regression passed');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
