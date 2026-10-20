"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright"),{createServer}=require("./dev");
const folder=path.resolve(__dirname,"../playtest-economy-output");fs.mkdirSync(folder,{recursive:true});
const snapshot=s=>({year:s.year,month:s.month,day:s.day,daysPlayed:s.daysPlayed,cash:s.cash,debt:s.debt,rp:s.rp,rep:s.rep,employees:s.employees,industry:(s.industry||[]).map(c=>[c.id,c.cash,c.debt,c.monthRevenue,c.monthProfit,c.valuation,c.monthSales,c.factories,c.employees,c.dealers,c.status]),economy:s.worldEconomy,ledger:(s.cashLedger||[]).slice(0,4).map(r=>[r.date,r.net,r.ending]),projects:(s.enginePrograms||[]).map(x=>[x.id,x.status,x.daysRemaining]),research:(s.researchProjects||[]).map(x=>[x.techId,x.status,x.daysRemaining])});
(async()=>{
 const server=createServer();await new Promise(res=>server.listen(0,"127.0.0.1",res));let browser;
 try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const page=await browser.newPage();page.setDefaultTimeout(15000);
  await page.goto("http://127.0.0.1:"+server.address().port);
  await page.locator("#newCompanyBtn").click();await page.locator("#companyName").fill("Fast Forward Consistency");
  await page.locator("#founderName").fill("QA");await page.locator('[data-start-year="1970"]').click();
  await page.locator("#difficulty").selectOption("normal");await page.locator("#newGameTutorial").uncheck();
  await page.locator("#toHQ").click();await page.locator("#toSummary").click();await page.locator("#foundBtn").click();
  await page.locator("#screen-game.active").waitFor();
  const fixture=await page.evaluate(()=>structuredClone(MDXGame.getState()));
  const classic=await page.evaluate(async()=>{await MDXQA.advance(60);return structuredClone(MDXGame.getState())});
  const fast=await page.evaluate(async fixture=>{MDXQA.restoreFixture(fixture);const q=await MDXQA.advanceFast(60);if(q.completed!==60)throw new Error("Fast forward did not process all days");return structuredClone(MDXGame.getState())},fixture);
  const baseline=snapshot(classic),candidate=snapshot(fast);
  const differences=[];
  function compare(a,b,path="root"){if(typeof a!=="object"||a===null||b===null||typeof b!=="object"){if(typeof a==="number"&&typeof b==="number"){if(Math.abs(a-b)>Math.max(1e-7,Math.abs(a)*1e-9))differences.push({path,normal:a,fast:b})}else if(a!==b)differences.push({path,normal:a,fast:b});return;}
   if(Array.isArray(a)!==Array.isArray(b)){differences.push({path,normal:a,fast:b});return;}
   for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+"."+k);
  }
  compare(baseline,candidate);
  fs.writeFileSync(path.join(folder,"fast-equivalence.json"),JSON.stringify({passed:!differences.length,days:60,normal:baseline,fast:candidate,differences:differences.slice(0,50)},null,2));
  assert.deepEqual(differences,[],"Test-only fast mode must preserve financial and competitive outcomes");
  console.log("60-day full and accelerated economy simulations produce identical economics and company state.");
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
