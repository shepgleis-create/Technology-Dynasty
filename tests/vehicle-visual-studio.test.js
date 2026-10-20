'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function scripts(){
 const w={addEventListener:()=>{},devicePixelRatio:1};
 w.window=w;w.document={getElementById:()=>null};
 for(const file of ['product-visualizer.js','visual-engineering.js','vehicle-visual-studio.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),w,{filename:file});
 }
 return w;
}
const vehicle=()=>({id:'car1',name:'Solara',generation:1,modelYear:1985,active:true,productionStatus:'production',
 engineId:'e1',msrp:19000,design:{body:'sedan',paintColor:'#805c26',headlightStyle:'round',presentationWheel:'chrome',grilleStyle:'narrow',wheelbase:2690,trackWidth:1490,wheel:15},
 stats:{unitCost:8500,manufacturingUnitCost:8500,safety:61,reliability:71,handling:68,quality:65,comfort:64,luxury:35},
 lifecycle:{ageMonths:50,freshness:59},reputationMemory:{design:63},designEvolution:{modelYearRevision:1}});
function state(v=vehicle()){return{year:1985,month:5,day:4,cash:2000000,vehicles:[v],engines:[{id:'e1',name:'I4',design:{config:'I4',block:'iron'},stats:{hp:120,disp:1.9}}],modelActions:[]};}
function canvas(){
 const grad={addColorStop:()=>{}},calls=[];
 const ctx=new Proxy({createLinearGradient:()=>grad,createRadialGradient:()=>grad,
  fillText:(...args)=>calls.push(args),setTransform:()=>{},fillRect:()=>{},strokeRect:()=>{}},
  {get:(obj,k)=>k in obj?obj[k]:()=>{}});
 return{width:0,height:0,_calls:calls,addEventListener:()=>{},setPointerCapture:()=>{},
 getBoundingClientRect:()=>({width:600,height:320}),getContext:()=>ctx,toDataURL:()=>'data:image/png;base64,AAAA'};
}
test('old save is neutral: opening visual studio makes no paid changes or unwanted repaint',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 const before=JSON.stringify(v),original=M.modelDesign(v,true);
 assert.equal(original.paintColor,'#805c26');assert.equal(original.presentationWheel,'chrome');
 assert.equal(M.quote(s,v).changes.length,0);
 assert.equal(M.pricedBase(s,v,{budget:170000,days:70},'facelift').budget,170000);
 assert.equal(JSON.stringify(v),before);
});
test('camera system has front, rear, both sides, three-quarter, overhead, underbody and engine bay',()=>{
 const W=scripts(),V=W.MDXVisualEngineering;
 for(const view of ['front','rear','left','right','threequarter','frontthreequarter','top','undercarriage','enginebay','interior'])assert.ok(V.views[view]);
});
test('LED lighting and premium paint are correctly era restricted',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 s.year=1950;v.visualStudioDraft={light:'led',paint:'pearl'};
 const q=M.quote(s,v);assert.equal(q.ready,false);assert.ok(q.warnings.some(x=>x.includes('1995')));assert.ok(q.warnings.some(x=>x.includes('1975')));
});
test('historically valid 1985 facelift creates live unit-cost, R&D and calendar effects',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 v.visualStudioDraft={paint:'red',wheels:'alloy',cabin:'sport',light:'quad',grille:'wide'};
 const q=M.quote(s,v),base={budget:165000,days:64},total=M.pricedBase(s,v,base,'facelift');
 assert.equal(q.ready,true);assert.ok(q.changes.length>=4);
 assert.ok(q.research>0);assert.ok(q.unitCost>500);assert.ok(total.budget>base.budget);assert.ok(total.days>base.days);
});
test('five real selected equipment categories produce uniquely identifiable manufacturing differences',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 for(const field of ['paint','wheels','cabin','light','grille']){
  v.visualStudioDraft={[field]:{paint:'red',wheels:'alloy',cabin:'luxury',light:'quad',grille:'wide'}[field]};
  const q=M.quote(s,v);assert.ok(q.changes.some(c=>c.field===field),field);
 }
});
test('a visual draft remains unfunded until a real model development action is started',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 v.visualStudioDraft={paint:'blue'};
 const before=JSON.stringify(v.design),q=M.quote(s,v);
 assert.ok(q.ready);assert.equal(JSON.stringify(v.design),before);assert.equal(s.cash,2000000);
});
test('snapshot locks approved visual engineering while drafts can change later',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 v.visualStudioDraft={wheels:'alloy',light:'quad'};
 const a={id:'fac1'},saved=M.snapshot(s,v,a);assert.ok(saved);
 v.visualStudioDraft={paint:'red',wheels:'steel',light:'period'};
 assert.equal(a.visualStudioSnapshot.choices.wheels,'alloy');assert.equal(a.visualStudioSnapshot.choices.light,'quad');
});
test('factory release is idempotent and changes actual unit manufacturing economics',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 v.visualStudioDraft={paint:'blue',cabin:'luxury',light:'quad'};
 const action={id:'action-2'};const snap=M.snapshot(s,v,action);assert.ok(snap);
 const cost=v.stats.unitCost,prevColor=v.design.paintColor;
 assert.ok(M.complete(s,v,action));assert.ok(v.stats.unitCost>cost);
 assert.notEqual(v.design.paintColor,prevColor);assert.ok(v.stats.luxury>35);assert.equal(action.visualStudioApplied,true);
 const afterCost=v.stats.unitCost;assert.equal(M.complete(s,v,action),null);
 assert.equal(v.stats.unitCost,afterCost);assert.equal(s.visualStudioAudits.length,1);
});
test('changing only wheels never overwrites prior painted finish, grille or headlight design',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v),original={...v.design};
 v.visualStudioDraft={wheels:'alloy'};
 const preview=M.modelDesign(v,true);assert.equal(preview.paintColor,original.paintColor);
 assert.equal(preview.grilleStyle,original.grilleStyle);assert.equal(preview.headlightStyle,original.headlightStyle);
 const action={id:'wheels-only'};M.snapshot(s,v,action);M.complete(s,v,action);
 assert.equal(v.design.paintColor,original.paintColor);assert.equal(v.design.headlightStyle,original.headlightStyle);
 assert.equal(v.design.grilleStyle,original.grilleStyle);assert.equal(v.design.presentationWheel,'alloy');
});
test('R&D caps preserve original maximum model year, facelift and generation schedules',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 v.visualStudioDraft={paint:'blue',wheels:'alloy',cabin:'luxury',light:'quad',grille:'wide'};
 assert.ok(M.pricedBase(s,v,{budget:500000,days:44},'modelyear').days<=45);
 assert.ok(M.pricedBase(s,v,{budget:500000,days:118},'facelift').days<=120);
 assert.ok(M.pricedBase(s,v,{budget:500000,days:178},'generation').days<=180);
});
test('player director is explainable, era-aware, and never spends money automatically',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);s.year=1945;
 const old=JSON.stringify(v),cash=s.cash,advice=M.suggest(s,v);
 assert.ok(advice.reason.includes('1945'));assert.ok(M.variants.light[advice.draft.light].year<=1945);
 assert.equal(JSON.stringify(v),old);assert.equal(s.cash,cash);
});
test('visual choices and development audits persist in ordinary JSON save state',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v);
 v.visualStudioDraft={paint:'red'};M.audit(s,v,'visual_review',{compare:true,range:'front'});
 const saved=JSON.parse(JSON.stringify(s));
 assert.equal(saved.vehicles[0].visualStudioDraft.paint,'red');assert.equal(saved.visualStudioAudits.length,1);
 assert.equal(saved.vehicles[0].visualStudioHistory[0].event,'visual_review');
});
test('scene settings include night lighting, showroom, factory, brochure and real damage inspection',()=>{
 const W=scripts(),M=W.MDXVisualEngineering;
 for(const k of ['studio','night','factory','showroom','brochure','damage'])assert.ok(M.scenes[k]);
});
test('3D procedural renderer creates real vehicle face geometry from model parameters',()=>{
 const W=scripts(),faces=W.MDXProductVisualizer.buildVehicle(vehicle().design,vehicle().stats,{generation:1,modelYear:1985,visualSeed:'s1'}).faces;
 assert.ok(faces.length>100);assert.ok(faces.some(f=>f.meta==='wheel'));assert.ok(faces.some(f=>f.meta==='body'));
});
test('vehicle viewers can rotate to front and rear rather than displaying the same fixed picture',()=>{
 const W=scripts(),v=vehicle(),s=state(v),c=canvas(),gfx=W.MDXProductVisualizer;
 W.MDXVisualEngineering.render(c,s,v,{view:'front',scene:'studio'},true);
 const f=gfx.setVehicleView(c,'front');const yaw=f.yaw;
 gfx.setVehicleView(c,'rear');assert.notEqual(f.yaw,yaw);assert.ok(c.width>0);assert.ok(c.height>0);
});
test('3D wheel and chassis inspection layers select relevant model faces',()=>{
 const W=scripts(),v=vehicle(),s=state(v),c=canvas();
 const a=W.MDXVisualEngineering.render(c,s,v,{view:'undercarriage',layer:'chassis'},true);
 assert.equal(a.layer,'chassis');assert.ok(a.faces>100);
 const b=W.MDXVisualEngineering.render(c,s,v,{view:'right',layer:'wheels'},true);
 assert.equal(b.layer,'wheels');
});
test('engine bay view uses actual owned engine layout and geometry',()=>{
 const W=scripts(),v=vehicle(),s=state(v),c=canvas(),result=W.MDXVisualEngineering.render(c,s,v,{view:'enginebay'},true);
 assert.ok(result.faces>35);assert.ok(result.title.includes('I4'));
});
test('interior view is an honest computed cockpit layout, not a static fake screenshot',()=>{
 const W=scripts(),v=vehicle(),s=state(v),c=canvas(),out=W.MDXVisualEngineering.render(c,s,v,{view:'interior'},true);
 assert.equal(out.kind,'interior-schematic');assert.ok(c._calls.some(x=>String(x[0]).includes('CABIN LAYOUT')));
});
test('real damage inspection reads model damage data and shows no damage on clean cars',()=>{
 const W=scripts(),v=vehicle(),s=state(v),c=canvas();
 W.MDXVisualEngineering.render(c,s,v,{view:'threequarter',scene:'damage'},true);
 assert.ok(c._calls.some(x=>String(x[0]).includes('NO RECORDED DAMAGE')));
});
test('existing vehicle cards open a full-screen mobile-first interactive studio',()=>{
 const W=scripts(),UI=W.MDXVehicleVisualStudio,html=UI.controls();
 assert.ok(UI.button(vehicle()).includes('data-vs-open'));
 for(const token of ['id="vs-cameras"','id="vs-scene"','id="vs-layer"','id="vs-zoom"','id="vs-toggle-compare"','id="vs-parts"','id="vs-authorize"'])
  assert.ok(html.includes(token),token);
});
test('photo outputs have render, brochure and thumbnail controls plus a bounded cache',()=>{
 const W=scripts(),UI=W.MDXVehicleVisualStudio,html=UI.controls();
 assert.ok(html.includes('id="vs-export"'));assert.ok(html.includes('id="vs-brochure"'));
 assert.ok(html.includes('id="vs-thumbnail"'));assert.equal(UI.cacheStats().limit,24);
});
test('genuine CSS mobile layout and scripts all load in existing Motor Dynasty, not a separate site',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),p=fs.readFileSync(path.join(root,'product-lifecycle.js'),'utf8'),
 exp=fs.readFileSync(path.join(root,'expansion.js'),'utf8'),css=fs.readFileSync(path.join(root,'vehicle-visual-studio.css'),'utf8');
 assert.ok(html.includes('/visual-engineering.js'));assert.ok(html.includes('/vehicle-visual-studio.js'));
 assert.ok(html.includes('/vehicle-visual-studio.css'));
 for(const token of ['MDXVehicleVisualStudio?.button?','MDXVehicleVisualStudio?.controls?','MDXVehicleVisualStudio?.watch?','MDXVisualEngineering?.complete?'])
  assert.ok(p.includes(token),token);
 for(const type of ['facelift','modelyear','generation'])assert.ok(exp.includes('MDXVisualEngineering?.pricedBase?.(state,v,'));
 assert.ok(css.includes('100dvh'));assert.ok(css.includes('vs-overlay'));
});
test('visual geometry is procedurally derived from real model styling not constant stock assets',()=>{
 const W=scripts(),gfx=W.MDXProductVisualizer,v=vehicle();
 const a=gfx.buildVehicle(v.design,v.stats,{generation:1,modelYear:1950,visualSeed:'s1'});
 const b=gfx.buildVehicle({...v.design,wheel:21,paintColor:'#ff2222'},v.stats,{generation:2,modelYear:1998,visualSeed:'s1'});
 assert.ok(a.faces.length>0&&b.faces.length>0);assert.notEqual(a.faces[0].color,b.faces[0].color);
});
test('new generation saves real predecessor styling and generation number for later comparisons',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v),action={id:'gen-2',type:'generation'};
 const prior=M.captureGeneration(s,v,action);assert.equal(prior.generation,1);assert.equal(prior.modelYear,1985);
 assert.equal(prior.design.paintColor,'#805c26');
 v.generation=2;v.modelYear=1990;v.design.paintColor='#555555';
 const stored=M.archiveGeneration(s,v,action);
 assert.equal(stored.design.paintColor,'#805c26');assert.equal(v.visualGenerations[0].generation,1);
 assert.equal(M.archiveGeneration(s,v,action),null);assert.equal(v.visualGenerations.length,1);
});
test('historic comparison renders archived predecessor actual model geometry and style',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v),a={id:'gen2',type:'generation'};
 M.captureGeneration(s,v,a);v.generation=2;v.modelYear=1995;v.design.paintColor='#dd2255';
 M.archiveGeneration(s,v,a);
 const c=canvas(),out=M.archivedModel(c,s,v,{view:'threequarter'});
 assert.ok(out);assert.ok(out.faces>100);assert.ok(out.title.includes('GEN 1'));
});
test('historical styling preview can render 1940 or 2000 era geometry without mutating the actual car',()=>{
 const W=scripts(),M=W.MDXVisualEngineering,v=vehicle(),s=state(v),c=canvas(),initial=JSON.stringify(v);
 const first=M.render(c,s,v,{view:'front',eraYear:1940},true);
 const second=M.render(c,s,v,{view:'rear',eraYear:2000},true);
 assert.ok(first.faces>0&&second.faces>0);assert.equal(JSON.stringify(v),initial);
 assert.equal(M.viewSettings({visualStudioView:{eraYear:1940}}).eraYear,1940);
});
test('previous-generation comparison and time-period controls appear without deep nested menus',()=>{
 const W=scripts(),html=W.MDXVehicleVisualStudio.controls();
 assert.ok(html.includes('id="vs-compare-source"'));
 assert.ok(html.includes('Archived previous generation'));
 assert.ok(html.includes('id="vs-era"'));
 assert.ok(html.includes('value="1940"')&&html.includes('value="2020"'));
});
test('changing mobile camera, light, layer, zoom and scene triggers one composite redraw',()=>{
 const W=scripts(),v=vehicle(),s=state(v),c=canvas(),gfx=W.MDXProductVisualizer;
 const viewer=gfx.renderVehicle(c,v.design,v.stats,{name:v.name,generation:1,modelYear:1985,visualSeed:v.id});
 let redraws=0;viewer.draw=()=>{redraws++;};
 gfx.setVehicleView(c,'front',{layer:'lighting',scene:'factory',light:'night',zoom:1.25,damage:.2});
 assert.equal(redraws,1);assert.equal(viewer.layer,'lighting');assert.equal(viewer.scene,'factory');
 assert.equal(viewer.zoom,1.25);assert.equal(viewer.damage,.2);
});
test('offline application shell explicitly includes new visual studio and generation lifecycle systems',()=>{
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const asset of ['/visual-engineering.js','/vehicle-visual-studio.js','/vehicle-visual-studio.css',
 '/generation-release.js','/prototype-lab.js','/parts-carryover.js','/cabin-engineering.js']){
  assert.ok(sw.includes('"'+asset+'"'),asset);
 }
 assert.ok(sw.includes('technology-dynasty-initial-reskin-v2'));
});
test('service worker upgrade retains the device-save cache and does not destroy offline saves',()=>{
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const pwa=fs.readFileSync(path.join(root,'pwa.js'),'utf8');
 assert.ok(sw.includes('DEVICE_SAVE_CACHE="technology-dynasty-device-save-v1"'));
 assert.ok(sw.includes('k!==CACHE&&k!==DEVICE_SAVE_CACHE'));
 assert.ok(pwa.includes('window.MDXGame?.save?.()'));
 assert.ok(!pwa.includes('window.location.reload()'));
});
test('live scripts are present in existing index and service worker cache rotates for this release',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const part of ['/product-visualizer.js?build=','/product-lifecycle.js?build=',
 '/lifecycle-strategy.js?build=','/expansion.js?build=','/pwa.js?build=']){
  assert.ok(html.includes(part),part);
 }
 assert.ok(sw.includes('technology-dynasty-initial-reskin-v2'));
});
test('visual-asset cache never appears in serialized company records by default',()=>{
 const W=scripts(),s=state(),before=JSON.stringify(s);assert.equal(W.MDXVehicleVisualStudio.cacheStats().items,0);
 assert.equal(JSON.stringify(s),before);
});
