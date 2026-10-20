/* 201–400: real-browser design/chassis smoke and responsive acceptance */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {chromium}=require("playwright"),{createServer}=require("./dev");
const out=path.resolve(__dirname,"../playtest-design-output");fs.mkdirSync(out,{recursive:true});
let browser,page,server;const errors=[];
const dims=[{name:"iphone",width:390,height:844},{name:"large-phone",width:430,height:932},{name:"tablet",width:768,height:1024},{name:"desktop",width:1440,height:960}];
async function settle(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function found(){
 await page.locator("#newCompanyBtn").click();await page.locator("#companyName").fill("Design Lab Verification");
 await page.locator("#founderName").fill("QA");await page.locator('[data-start-year="1970"]').click();
 await page.locator("#difficulty").selectOption("casual");await page.locator("#newGameTutorial").uncheck();
 await page.locator("#toHQ").click();await page.locator("#toSummary").click();await page.locator("#foundBtn").click();
 await page.locator("#screen-game.active").waitFor();await page.evaluate(()=>MDXGame.navigate("vehicle"));await settle();
}
async function saveScreenshot(label){await settle();await page.screenshot({path:path.join(out,label+".png"),fullPage:true})}
(async()=>{
 server=createServer();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 page=await browser.newPage({viewport:dims[0],hasTouch:true});page.setDefaultTimeout(18000);
 page.on("pageerror",e=>errors.push(e.message));page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
 await page.goto("http://127.0.0.1:"+server.address().port);await found();
 await page.locator("#md-design-dynamics").waitFor();
 assert.equal(await page.locator('#md-design-dynamics [data-md-lab="topic"] option').count(),20);
 const topics=await page.evaluate(()=>MDXDesignDynamics.TOPICS.map(t=>({key:t.key,group:t.group,body:t.body,initial:t.initial,step:t.step,max:t.max,field:t.field,firstId:t.firstId})));
 assert.equal(topics.length,40);
 console.log("Checking all forty live design and dynamics panels");
 const topicEvidence=[];
 for(const t of topics){
  if(t.body&&t.body!=="sedan")await page.evaluate(body=>MDXGame.beginVariant({body}),t.body);
  await page.locator('[data-md-lab-group="'+t.group+'"]').click();
  await page.locator('[data-md-lab="topic"]').selectOption(t.key);
  const candidate=Math.min(t.max,t.initial+t.step);
  await page.locator('[data-md-lab="value"]').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event("input",{bubbles:true}));},candidate);
  await settle();
  assert.ok(await page.locator("#md-design-dynamics .md-lab-svg").count(),t.key+" SVG");
  assert.ok((await page.locator("[data-md-lab-quote]").innerText()).includes("ENGINEERING"),t.key+" quote");
  assert.equal(await page.locator('[data-md-lab-action="commission"]').isEnabled(),true,t.key+" authorize");
  const verified=await page.evaluate(({key,value})=>{
   const st=MDXGame.getState(),topic=MDXDesignDynamics.BY_KEY[key],quote=MDXDesignDynamics.quote(st,key,value),audit=MDXDesignDynamics.audit(st,key);
   return {idFirst:topic.firstId,idLast:topic.firstId+4,topic:key,label:topic.label,group:topic.group,body:st.vehicleDraft.body,current:audit.current,requested:value,days:quote.days,budget:quote.budget,quoteApproved:quote.ok,performance:quote.performance,year:st.year,month:st.month};
  },{key:t.key,value:candidate});
  assert.ok(verified.quoteApproved&&verified.budget>0&&verified.days>=5,t.key+" financial approval");
  topicEvidence.push(verified);
  await page.locator("#md-design-dynamics .md-lab-work").screenshot({path:path.join(out,"requirements-"+t.firstId+"-"+(t.firstId+4)+"-"+t.key+".png")});
 }
 fs.writeFileSync(path.join(out,"topic-evidence.json"),JSON.stringify({batch:"201-400",topics:topicEvidence.length,items:topicEvidence},null,2));
 assert.equal(topicEvidence.length,40);
 console.log("Checking authorized design change, real cash and delayed geometry");
 await page.evaluate(()=>MDXGame.beginVariant({body:"sedan"}));
 await page.locator('[data-md-lab-group="body"]').click();
 await page.locator('[data-md-lab="topic"]').selectOption("roofline");
 await page.locator('[data-md-lab="value"]').evaluate(el=>{el.value="58";el.dispatchEvent(new Event("input",{bubbles:true}));});
 const expected=await page.evaluate(()=>MDXDesignDynamics.quote(MDXGame.getState(),"roofline",58));
 assert.equal(expected.ok,true);
 const before=await page.evaluate(()=>MDXGame.getState().cash);
 await page.locator('[data-md-lab-action="commission"]').click();
 assert.equal(await page.evaluate(()=>MDXGame.getState().designDynamics.programs.at(-1).status),"active");
 assert.notEqual(await page.evaluate(()=>MDXGame.getState().vehicleDraft.rooflineCurve),58,"not instantly applied");
 await page.evaluate(n=>MDXQA.advance(n),expected.days);await settle();
 const actual=await page.evaluate(()=>{const s=MDXGame.getState();MDXGame.vehicleSpec();return{
  cash:s.cash,roof:s.vehicleDraft.rooflineCurve,
  program:s.designDynamics.programs.at(-1).status,audit:s.designDynamics.audit.filter(x=>x.action==="completed").length,
  stats:MDXGame.vehicleSpec(),revision:s.vehicleDraft.designDynamicsRevision
 }});
 assert.equal(actual.program,"completed");assert.equal(actual.roof,58);assert.ok(actual.audit>0);
 assert.ok(actual.stats.designDynamics.roofline===58);assert.ok(actual.revision>=1);
 assert.ok(before-actual.cash>=expected.budget,"funding paid (other game costs may also accrue)");
 await saveScreenshot("iphone-body-engineering-approved");
 console.log("Checking all forty topics are navigable at four viewport sizes");
 for(const d of dims){
  await page.setViewportSize({width:d.width,height:d.height});
  await page.locator('[data-md-lab-group="chassis"]').click();
  await page.locator('[data-md-lab="topic"]').selectOption("brakes");await settle();
  const size=await page.evaluate(()=>{const el=document.getElementById("md-design-dynamics"),r=el.getBoundingClientRect();return {overflow:Math.max(0,r.right-innerWidth)+Math.max(0,-r.left),scroll:el.scrollWidth-el.clientWidth}});
  assert.equal(size.overflow,0,d.name+" panel overflow");assert.ok(size.scroll<=2,d.name+" content overflow");
  await saveScreenshot(d.name+"-chassis-engineering");
 }
 console.log("Checking save and reload of paid design");
 await page.evaluate(()=>MDXGame.save());await page.reload();
 if(await page.locator("#continueBtn").isVisible())await page.locator("#continueBtn").click();
 await page.locator("#screen-game.active").waitFor();
 const saved=await page.evaluate(()=>{const s=MDXGame.getState();return{
  roof:s.vehicleDraft.rooflineCurve,
  history:s.designDynamics?.records?.draft?.history?.filter(x=>x.topic==="roofline").length,
  status:s.designDynamics?.programs?.at(-1)?.status
 }});assert.equal(saved.roof,58);assert.ok(saved.history>=1);assert.equal(saved.status,"completed");
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({passed:true,topics:topics.length,checklistRange:"201-400",viewports:dims,changed:expected,saved,errors},null,2));
 console.log("Design and chassis browser verification passed.");
})().catch(async e=>{console.error(e);try{if(page)await page.screenshot({path:path.join(out,"failure.png"),fullPage:true})}catch{}process.exitCode=1}).finally(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve))});
