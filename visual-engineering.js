/* Vehicle Visual Studio — engineering simulation, checklist 801–900. */
(()=>{
"use strict";
const W=window;
const N=(x,d=0)=>x==null||x===""||!Number.isFinite(Number(x))?d:Number(x);
const cap=(x,a,b)=>Math.min(b,Math.max(a,N(x)));
const money=x=>"$"+Math.round(N(x)).toLocaleString("en-US");
const variants={
 paint:{
  graphite:{label:"Graphite metallic",hex:"#414e5b",year:1930,cost:160,rd:3400},
  silver:{label:"Satin silver",hex:"#a4b2bd",year:1930,cost:135,rd:3000},
  black:{label:"Obsidian black",hex:"#232832",year:1900,cost:80,rd:2000},
  pearl:{label:"Pearl white",hex:"#ddd9ce",year:1975,cost:330,rd:6800},
  red:{label:"Performance red",hex:"#a52f35",year:1930,cost:210,rd:4000},
  blue:{label:"Royal blue",hex:"#285e9c",year:1945,cost:145,rd:3500},
  green:{label:"Racing green",hex:"#244d38",year:1900,cost:125,rd:2500}
 },
 wheels:{
  steel:{label:"Stamped steel",year:1900,cost:0,rd:1000,handling:0},
  chrome:{label:"Chrome brightwork",year:1940,cost:130,rd:2700,handling:0},
  alloy:{label:"Alloy performance",year:1960,cost:330,rd:8800,handling:1}
 },
 cabin:{
  standard:{label:"Factory original",year:1900,cost:0,rd:0,luxury:0,comfort:0},
  sport:{label:"Sport interior",year:1950,cost:210,rd:7100,luxury:1,comfort:-.5},
  luxury:{label:"Luxury cabin",year:1935,cost:480,rd:9800,luxury:3,comfort:2},
  heritage:{label:"Period-correct heritage",year:1900,cost:275,rd:5100,luxury:1,comfort:1}
 },
 light:{
  period:{label:"Period lighting",year:1900,cost:0,rd:0,safety:0,quality:0},
  round:{label:"Round lamps",year:1900,cost:65,rd:1600,safety:0,quality:0},
  rect:{label:"Rectangular lamps",year:1960,cost:95,rd:2800,safety:.5,quality:.2},
  quad:{label:"Quad headlamps",year:1958,cost:125,rd:4100,safety:1,quality:.2},
  led:{label:"LED lighting",year:1995,cost:520,rd:14500,safety:2.3,quality:.8}
 },
 grille:{
  standard:{label:"Original grille",year:1900,cost:0,rd:0},
  wide:{label:"Wide fascia",year:1940,cost:90,rd:2200},
  narrow:{label:"Narrow fascia",year:1940,cost:95,rd:2300}
 }
};
const defaults={paint:"graphite",wheels:"steel",cabin:"standard",light:"period",grille:"standard"};
const views={threequarter:"Three-quarter",front:"Front",rear:"Rear",left:"Left side",right:"Right side",frontthreequarter:"Front angle",top:"Roof",undercarriage:"Undercarriage",enginebay:"Engine bay",interior:"Interior"};
const scenes={studio:"Design studio",night:"Night lighting",factory:"Factory",showroom:"Showroom",brochure:"Brochure",damage:"Damage inspection"};
function current(v){
 const p=v?.visualStudioDraft||{},base=released(v),obj={};
 for(const [k,choices]of Object.entries(variants))obj[k]=choices[p[k]]?p[k]:base[k];
 return obj;
}
function released(v){
 const d=v?.design||{},p=v?.visualStudioRelease;
 if(p){return{...defaults,...p};}
 const base={...defaults};
 for(const [id,paint]of Object.entries(variants.paint))if(paint.hex.toLowerCase()===String(d.paintColor||"").toLowerCase())base.paint=id;
 if(variants.wheels[d.presentationWheel])base.wheels=d.presentationWheel;
 if(variants.light[d.headlightStyle])base.light=d.headlightStyle;
 if(variants.grille[d.grilleStyle])base.grille=d.grilleStyle;
 return base;
}
function viewSettings(v){
 const p=v?.visualStudioView||{};
 return{view:views[p.view]?p.view:"threequarter",scene:scenes[p.scene]?p.scene:"studio",
 layer:["all","body","chassis","lighting","wheels"].includes(p.layer)?p.layer:"all",
 zoom:cap(p.zoom||1,.65,1.6),compare:!!p.compare,comparison:p.comparison==="previous"?"previous":"production",eraYear:[0,1940,1950,1960,1970,1980,1990,2000,2010,2020].includes(Number(p.eraYear))?Number(p.eraYear):0};
}
function quote(s,v,choices){
 const p=choices||current(v),y=N(s?.year,1970),old=released(v),changes=[],warnings=[];
 let unitCost=0,research=0,days=0;
 for(const [k,group]of Object.entries(variants)){
  const item=group[p[k]]||group[defaults[k]];
  if(y<item.year)warnings.push(item.label+" requires "+item.year+" or later");
  if(p[k]===old[k])continue;
  changes.push({field:k,from:old[k],to:p[k],name:item.label,perCar:item.cost});
  unitCost+=item.cost;research+=item.rd;days+=k==="light"?5:k==="cabin"?4:2;
 }
 const active=v?.active!==false&&v?.productionStatus!=="retired";
 const conflict=(s?.modelActions||[]).some(a=>a.vehicleId===v?.id&&["active","awaiting_launch"].includes(a.status));
 const blocked=warnings[0]||(!active?"Vehicle is discontinued":null)||(conflict?"Model program already active":null)||(!changes.length?"No visual changes selected":null);
 return{ready:!blocked,blocked,warnings,changes,choices:{...p},unitCost:Math.round(unitCost),
 research:Math.round(research*cap(Math.pow(1.025,y-1970),.24,5)),days:changes.length?Math.min(22,Math.max(3,days)):0,
 newUnitCost:Math.round(N(v?.stats?.unitCost)+unitCost),
 newMSRP:Math.ceil((N(v?.msrp)+unitCost*1.35)/50)*50,
 margin:N(v?.msrp)-N(v?.stats?.unitCost)-unitCost,appeal:Math.min(12,changes.length*2.1),
 qualityRisk:Math.max(0,changes.length-3)*.6};
}
function pricedBase(s,v,base,type){
 if(!v?.visualStudioDraft)return base;
 const q=quote(s,v);
 if(!q.changes.length||q.warnings.length)return base;
 const max=type==="modelyear"?45:type==="facelift"?120:180;
 return{...base,budget:N(base.budget)+q.research,days:Math.min(max,N(base.days)+q.days)};
}
function snapshot(s,v,action){
 if(!v?.visualStudioDraft)return null;
 const q=quote(s,v);
 if(!q.changes.length||q.warnings.length)return null;
 action.visualStudioSnapshot={choices:{...q.choices},changes:q.changes.map(x=>({...x})),cost:q.unitCost,
 research:q.research,appeal:q.appeal,qualityRisk:q.qualityRisk,year:N(s.year)};
 return action.visualStudioSnapshot;
}
function audit(s,v,event,details){
 s.visualStudioAudits=Array.isArray(s.visualStudioAudits)?s.visualStudioAudits:[];
 const row={year:N(s.year),month:N(s.month),vehicleId:v.id,event,details:JSON.parse(JSON.stringify(details||{}))};
 s.visualStudioAudits.unshift(row);s.visualStudioAudits.length=Math.min(120,s.visualStudioAudits.length);
 v.visualStudioHistory=Array.isArray(v.visualStudioHistory)?v.visualStudioHistory:[];
 v.visualStudioHistory.unshift(row);v.visualStudioHistory.length=Math.min(16,v.visualStudioHistory.length);
 return row;
}
function complete(s,v,action){
 const snap=action?.visualStudioSnapshot;if(!snap||action.visualStudioApplied)return null;
 const c=snap.choices,d=v.design=v.design&&typeof v.design==="object"?v.design:{};
 const stats=v.stats=v.stats||{};
 const before={paint:d.paintColor,unitCost:N(stats.unitCost),quality:N(stats.quality),safety:N(stats.safety),comfort:N(stats.comfort),luxury:N(stats.luxury)};
 const changed=new Set((snap.changes||[]).map(x=>x.field));
 if(changed.has("paint"))d.paintColor=variants.paint[c.paint].hex;
 if(changed.has("wheels"))d.presentationWheel=c.wheels;
 if(changed.has("light"))d.headlightStyle=c.light;
 if(changed.has("grille")){d.grilleStyle=c.grille;d.presentationStyle={...d.presentationStyle,grille:c.grille==="wide"?"horizontal":c.grille==="narrow"?"vertical":"original"};}
 stats.unitCost=Math.max(100,N(stats.unitCost)+snap.cost);
 if(Number.isFinite(Number(stats.manufacturingUnitCost)))stats.manufacturingUnitCost=Math.max(100,N(stats.manufacturingUnitCost)+snap.cost);
 stats.safety=cap(N(stats.safety,65)+N(variants.light[c.light].safety),1,99);
 stats.quality=cap(N(stats.quality,65)+N(variants.light[c.light].quality)-snap.qualityRisk*.4,1,99);
 stats.comfort=cap(N(stats.comfort,65)+N(variants.cabin[c.cabin].comfort),1,99);
 stats.luxury=cap(N(stats.luxury,45)+N(variants.cabin[c.cabin].luxury),1,99);
 stats.handling=cap(N(stats.handling,65)+N(variants.wheels[c.wheels].handling),1,99);
 if(v.reputationMemory)v.reputationMemory.design=cap(N(v.reputationMemory.design,65)+snap.appeal*.27,1,99);
 v.visualStudioRelease={...c,actionId:action.id,year:N(s.year)};
 action.visualStudioApplied=true;
 action.visualStudioOutcome={before,after:{paint:d.paintColor,unitCost:stats.unitCost,quality:stats.quality,safety:stats.safety,comfort:stats.comfort}};
 audit(s,v,"production_design_released",{actionId:action.id,outcome:action.visualStudioOutcome});
 return action.visualStudioOutcome;
}
function captureGeneration(s,v,action){
 if(!action||action.type!=="generation")return null;
 const copy=x=>JSON.parse(JSON.stringify(x||{}));
 action.visualGenerationSource={generation:N(v.generation,1),modelYear:N(v.modelYear,s.year),
 design:copy(v.design||v),stats:copy(v.stats),seed:v.visualIdentity?.seed||v.id,
 capturedYear:N(s.year),name:v.name};
 return action.visualGenerationSource;
}
function archiveGeneration(s,v,action){
 const source=action?.visualGenerationSource;
 if(!source||action.visualArchiveCommitted)return null;
 v.visualGenerations=Array.isArray(v.visualGenerations)?v.visualGenerations:[];
 if(!v.visualGenerations.some(x=>x.generation===source.generation&&x.modelYear===source.modelYear)){
  v.visualGenerations.unshift(source);v.visualGenerations.length=Math.min(12,v.visualGenerations.length);
 }
 action.visualArchiveCommitted=true;
 audit(s,v,"generation_archived",{generation:source.generation,modelYear:source.modelYear});
 return source;
}
function archivedModel(canvas,s,v,settings={}){
 const old=(v.visualGenerations||[])[0];if(!old)return render(canvas,s,v,settings,false);
 const gfx=W.MDXProductVisualizer;if(!gfx)return null;
 gfx.renderVehicle(canvas,old.design||{},old.stats||{},
  {name:old.name||v.name,generation:old.generation,modelYear:old.modelYear,visualSeed:old.seed||v.id});
 gfx.setVehicleView(canvas,settings.view||"threequarter",
  {layer:settings.view==="undercarriage"?"chassis":settings.layer||"all",
   light:settings.scene==="night"?"night":"studio",scene:settings.scene||"studio",zoom:settings.zoom||1});
 return gfx.inspectRender(canvas);
}
function suggest(s,v){
 const y=N(s.year,1970),age=N(v.lifecycle?.ageMonths)/12,segment=String(v.target||v.design?.body||"").toLowerCase(),
 limited=N(s.cash)<N(v.stats?.unitCost)*50;
 const draft={paint:age>5?"silver":"graphite",wheels:y>=1960?"alloy":y>=1940?"chrome":"steel",
 cabin:/luxury|premium/.test(segment)?"luxury":/sport|track/.test(segment)?"sport":"standard",
 light:y>=1995?"led":y>=1960?"rect":"round",grille:/sport/.test(segment)?"wide":"standard"};
 if(limited){draft.wheels="steel";draft.cabin="standard";draft.grille="standard";}
 for(const [k,opts]of Object.entries(variants))if(opts[draft[k]].year>y)draft[k]=defaults[k];
 return{draft,reason:"Year "+y+", model age "+age.toFixed(1)+" years, segment "+segment+", available cash "+money(s.cash)+". Requires human authorization."};
}
function modelDesign(v,isDraft=true){
 const d={...(v.design||v)};if(!isDraft||!v.visualStudioDraft)return d;
 const p=current(v),base=released(v),changed=new Set(Object.keys(p).filter(k=>p[k]!==base[k]));
 if(!changed.size)return d;
 const next={...d};
 if(changed.has("paint"))next.paintColor=variants.paint[p.paint].hex;
 if(changed.has("wheels"))next.presentationWheel=p.wheels;
 if(changed.has("light"))next.headlightStyle=p.light;
 if(changed.has("grille")){next.grilleStyle=p.grille;next.presentationStyle={...(d.presentationStyle||{}),grille:p.grille==="wide"?"horizontal":p.grille==="narrow"?"vertical":"original"};}
 return next;
}
function renderInterior(canvas,v,draft=true){
 const d=modelDesign(v,draft),stats=v.stats||{},ctx=canvas.getContext("2d");
 if(!ctx)return null;
 const bounds=canvas.getBoundingClientRect?.()||{width:560,height:310},scale=Math.min(2,W.devicePixelRatio||1);
 const w=Math.max(260,Math.round(bounds.width||560)),h=Math.max(170,Math.round(bounds.height||300));
 canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
 ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle="#07121e";ctx.fillRect(0,0,w,h);
 const X=p=>w*p,Y=p=>h*p;
 const rect=(x,y,ww,hh,color,r=0)=>{ctx.fillStyle=color;ctx.fillRect(X(x),Y(y),X(ww),Y(hh));};
 const line=(a,b,c,d,color)=>{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(a),Y(b));ctx.lineTo(X(c),Y(d));ctx.stroke();};
 const seat=(x,y)=>{rect(x,y,.19,.20,"#647282");rect(x+.015,y+.02,.16,.15,"#273c4b");rect(x-.01,y+.18,.21,.13,"#8b99a6");rect(x+.012,y+.19,.164,.10,"#334654");};
 rect(.08,.04,.84,.92,"#162d3b");
 rect(.17,.06,.66,.06,"#687e88");rect(.11,.83,.78,.08,"#6a7983");
 rect(.17,.12,.66,.20,"#304e60");rect(.19,.135,.62,.15,"#102839");
 seat(.19,.37);seat(.61,.37);seat(.19,.69);seat(.61,.69);
 rect(.40,.31,.20,.10,"#1e333f");rect(.42,.33,.16,.035,"#91a6b1");
 ctx.strokeStyle="#a8bec7";ctx.lineWidth=3;ctx.beginPath();ctx.arc(X(.28),Y(.33),X(.075),0,Math.PI*2);ctx.stroke();
 line(.28,.26,.28,.40,"#a8bec7");line(.21,.33,.35,.33,"#a8bec7");
 rect(.48,.12,.10,.11,"#6c96a2");rect(.495,.15,.07,.045,"#092531");
 const labels=[["DRIVER",.25,.63],["PASSENGER",.63,.63],["REAR SEATS",.43,.92]];
 ctx.fillStyle="#d1e4eb";ctx.font="700 "+Math.max(9,Math.round(h*.035))+"px system-ui";
 for(const item of labels)ctx.fillText(item[0],X(item[1]),Y(item[2]));
 ctx.fillStyle="#acc6d7";ctx.font="700 "+Math.max(10,Math.round(h*.047))+"px system-ui";
 ctx.fillText(String(v.name||"MODEL").toUpperCase()+"  /  CABIN LAYOUT",12,24);
 ctx.fillStyle="#8eaebd";ctx.font="600 "+Math.max(9,Math.round(h*.031))+"px system-ui";
 ctx.fillText("Comfort "+Math.round(N(stats.comfort,65))+"  ·  Luxury "+Math.round(N(stats.luxury,50))+
 "  ·  Trim "+String(draft?current(v).cabin:released(v).cabin).toUpperCase(),12,h-12);
 return{kind:"interior-schematic",comfort:N(stats.comfort),luxury:N(stats.luxury)};
}
function render(canvas,s,v,settings={},draft=true){
 if(!canvas||!v)return null;
 const gfx=W.MDXProductVisualizer;if(!gfx)return null;
 const view=settings.view||"threequarter";
 if(view==="interior")return renderInterior(canvas,v,draft);
 if(view==="enginebay"){
  const e=(s.engines||[]).find(x=>x.id===v.engineId),design=e?.design||e||{config:"I4"};
  gfx.renderEngine(canvas,design,e?.stats||{});
 }else{
  gfx.renderVehicle(canvas,modelDesign(v,draft),v.stats||{},{
    name:v.name,generation:v.generation||1,modelYear:settings.eraYear||v.modelYear||s.year,visualSeed:v.visualIdentity?.seed||v.id});
 }
 gfx.setVehicleView(canvas,view,{layer:view==="undercarriage"?"chassis":settings.layer||"all",
 light:settings.scene==="night"?"night":"studio",scene:settings.scene||"studio",damage:cap(N(v.bodyDamage?.severity||v.bodyDamagePercent||0)/100,0,1),zoom:settings.zoom||1});
 return gfx.inspectRender(canvas);
}
W.MDXVisualEngineering=Object.freeze({version:1,variants,defaults,views,scenes,current,released,viewSettings,quote,pricedBase,snapshot,complete,audit,suggest,captureGeneration,archiveGeneration,archivedModel,modelDesign,renderInterior,render});
})();
