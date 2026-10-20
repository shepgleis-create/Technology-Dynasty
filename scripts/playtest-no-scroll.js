/* Real Chromium mobile acceptance suite for the user's repeated no-scroll defect.
 * Exercises the existing company creation, original tabs and Products workflow.
 * Run: npm run playtest:no-scroll
 */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright"),{createServer}=require("./dev");
const output=path.resolve(__dirname,"../playtest-no-scroll-output");fs.mkdirSync(output,{recursive:true});
const screens=[{name:"iphone-se",width:375,height:667},{name:"iphone",width:390,height:844},{name:"iphone-large",width:430,height:932}];
const errors=[];
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function createCompany(page){
 await page.locator("#newCompanyBtn").click();
 await page.locator("#companyName").fill("Phone Layout Verification Motors");
 await page.locator("#founderName").fill("QA");
 await page.locator('[data-start-year="1940"]').click();
 await page.locator("#difficulty").selectOption("casual");
 await page.locator("#newGameTutorial").uncheck();
 await page.locator("#toHQ").click();await page.locator("#toSummary").click();await page.locator("#foundBtn").click();
 await page.locator("#screen-game.active").waitFor();
}
async function metrics(page,mode){
 return page.evaluate(mode=>{
  const main=document.querySelector(".game-main"),view=document.querySelector(".game-view.active");
  const host=mode==="engine"?document.querySelector("#engineControls"):mode==="vehicle"?document.querySelector("#vehicleControls"):document.querySelector("#view-library .ops-panel.active");
  const scroller=[main,view,host,host?.closest(".control-rail")].filter(Boolean).map(el=>{
   const c=getComputedStyle(el);
   return{name:el.id||el.className,scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,overflowY:c.overflowY};
  });
  const d=window.MDXViewport?.getDiagnostics?.();
  return{active:view?.id,mode,locked:document.body.classList.contains("mdx-viewport-locked"),
   host:!!host,diag:d,scroller,tabs:mode==="engine"?document.querySelectorAll("#engineTabs button").length:mode==="vehicle"?document.querySelectorAll("#vehicleTabs button").length:document.querySelectorAll("#opsTabs button").length};
 },mode);
}
async function verify(page,mode,label){
 await settle(page);await page.waitForTimeout(80);await settle(page);
 const m=await metrics(page,mode);
 assert.equal(m.locked,true,label+": viewport not locked");
 assert.equal(m.active,"view-"+(mode==="library"?"library":mode),label+": wrong workspace");
 assert.ok(m.host,label+": missing current controls");
 assert.ok(m.diag&&m.diag.mode===mode,label+": viewport not measured");
 assert.equal(m.diag.hiddenVerticalOverflow,false,label+": scaled controls still exceed viewport: "+JSON.stringify(m.diag));
 for(const el of m.scroller)assert.ok(!/^(auto|scroll)$/.test(el.overflowY)||el.scrollHeight<=el.clientHeight+3,label+": "+el.name+" scrollable "+JSON.stringify(el));
 const before=await page.evaluate(()=>({main:document.querySelector(".game-main").scrollTop,root:document.querySelector(".game-view.active").scrollTop}));
 await page.mouse.move(340,440);await page.mouse.wheel(0,530);await settle(page);
 const after=await page.evaluate(()=>({main:document.querySelector(".game-main").scrollTop,root:document.querySelector(".game-view.active").scrollTop}));
 assert.deepEqual(after,before,label+": wheel caused movement");
 return m;
}
(async()=>{
 let browser,server;
 try{
  server=createServer();await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const page=await browser.newPage({viewport:screens[0],hasTouch:true,isMobile:true,deviceScaleFactor:2});
  page.setDefaultTimeout(20000);
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:"+server.address().port);
  await createCompany(page);
  for(const size of screens){
   await page.setViewportSize({width:size.width,height:size.height});
   for(const [mode,button,tabSelector] of [["engine",'[data-dock-key="engine"]',"#engineTabs [data-etab]"],["vehicle",'[data-dock-key="vehicle"]',"#vehicleTabs [data-vtab]"]]){
    await page.locator(button).click();await verify(page,mode,size.name+"-"+mode+"-initial");
    const all=await page.locator(tabSelector).evaluateAll(nodes=>nodes.map(x=>x.dataset.etab||x.dataset.vtab));
    for(const label of all){
     const attr=mode==="engine"?"data-etab":"data-vtab";
     await page.locator("["+attr+'="'+label+'"]').click();
     await verify(page,mode,size.name+"-"+mode+"-"+label);
     if(["architecture","concept","geometry","suspension"].includes(label))
      await page.screenshot({path:path.join(output,size.name+"-"+mode+"-"+label+".png")});
    }
   }
   await page.locator('[data-dock-key="operations"]').click();
   await verify(page,"library",size.name+"-ops-products");
   await page.screenshot({path:path.join(output,size.name+"-ops-products.png")});
   const original=await page.locator("#opsTabs button").evaluateAll(nodes=>nodes.map(x=>x.dataset.opstab));
   assert.equal(original.length,14,"original 14 Operations tabs are missing");
   for(const category of original){
    await page.locator('#opsTabs [data-opstab="'+category+'"]').evaluate(node=>node.click());
    await verify(page,"library",size.name+"-ops-"+category);
   }
  }
  assert.deepEqual(errors,[],"uncaught browser errors during phone layout playtest");
  console.log("PASS: 3 iPhone viewport sizes; all Engine/Vehicle and 14 Operations tabs; original controls; no vertical overflow or wheel scrolling.");
 }catch(error){console.error("FAIL no-scroll browser acceptance:",error);process.exitCode=1;}
 finally{await browser?.close();await new Promise(r=>server?.close(r));}
})();
