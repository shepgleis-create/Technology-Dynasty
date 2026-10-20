(() => {
"use strict";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const DEG=Math.PI/180;
const v3=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b)=>v3(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a,b)=>v3(a.x-b.x,a.y-b.y,a.z-b.z);
const cross=(a,b)=>v3(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=a=>{const n=Math.hypot(a.x,a.y,a.z)||1;return v3(a.x/n,a.y/n,a.z/n);};
const shade=(hex,f)=>{
 const raw=String(hex||"#789").replace("#",""),full=raw.length===3?raw.split("").map(x=>x+x).join(""):raw.padEnd(6,"0").slice(0,6);
 const n=parseInt(full,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,k=clamp(f,.18,1.35);
 return "rgb("+Math.round(clamp(r*k,0,255))+","+Math.round(clamp(g*k,0,255))+","+Math.round(clamp(b*k,0,255))+")";
};
function rotatePoint(p,yaw,pitch){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const x=p.x*cy-p.z*sy,z=p.x*sy+p.z*cy;
 return v3(x,p.y*cp-z*sp,p.y*sp+z*cp);
}
function rotateZ(p,a,cx=0,cy=0){const x=p.x-cx,y=p.y-cy,c=Math.cos(a),s=Math.sin(a);return v3(cx+x*c-y*s,cy+x*s+y*c,p.z);}
function tiltFaces(faces,a,cx=0,cy=0){return(faces||[]).map(f=>({...f,pts:f.pts.map(p=>rotateZ(p,a,cx,cy))}));}
function face(pts,color,meta=""){return{pts,color,meta};}
function boxFaces(cx,cy,cz,sx,sy,sz,color,meta=""){
 const x=sx/2,y=sy/2,z=sz/2,pts=[
  v3(cx-x,cy-y,cz-z),v3(cx+x,cy-y,cz-z),v3(cx+x,cy+y,cz-z),v3(cx-x,cy+y,cz-z),
  v3(cx-x,cy-y,cz+z),v3(cx+x,cy-y,cz+z),v3(cx+x,cy+y,cz+z),v3(cx-x,cy+y,cz+z)
 ];
 return [
  [0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]
 ].map(idx=>({pts:idx.map(i=>pts[i]),color,meta}));
}
function cylinderFaces(cx,cy,cz,r,length,axis,color,segments=12,meta=""){
 const faces=[],rings=[[],[]];
 for(let j=0;j<2;j++){
  const q=(j?1:-1)*length/2;
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,u=Math.cos(a)*r,w=Math.sin(a)*r;
   rings[j].push(axis==="x"?v3(cx+q,cy+u,cz+w):axis==="z"?v3(cx+u,cy+w,cz+q):v3(cx+u,cy+q,cz+w));
  }
 }
 for(let i=0;i<segments;i++){const n=(i+1)%segments;faces.push({pts:[rings[0][i],rings[0][n],rings[1][n],rings[1][i]],color,meta});}
 faces.push({pts:[...rings[0]].reverse(),color,meta});faces.push({pts:[...rings[1]],color,meta});
 return faces;
}
function prismFaces(profile,width,color,meta=""){
 const l=profile.map(([z,y])=>v3(-width/2,y,z)),r=profile.map(([z,y])=>v3(width/2,y,z)),faces=[];
 faces.push({pts:[...l].reverse(),color,meta},{pts:[...r],color,meta});
 for(let i=0;i<profile.length;i++){const n=(i+1)%profile.length;faces.push({pts:[l[i],l[n],r[n],r[i]],color,meta});}
 return faces;
}
function smoothProfile(profile,iterations=1){
 let pts=(profile||[]).map(p=>[Number(p[0]),Number(p[1])]);
 for(let k=0;k<iterations;k++){
  const next=[];
  for(let i=0;i<pts.length;i++){
   const a=pts[i],b=pts[(i+1)%pts.length];
   next.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);
  }
  pts=next;
 }
 return pts;
}
class Viewer{
 constructor(canvas,kind){
  this.canvas=canvas;this.kind=kind;this.ctx=canvas.getContext("2d");this.yaw=kind==="engine"?-35*DEG:-32*DEG;this.pitch=kind==="engine"?22*DEG:15*DEG;this.drag=null;this.faces=[];this.labels=[];this.last={};this.zoom=1;this.layer="all";this.lightMode="studio";this.scene="studio";this.damage=0;
  this.bind();this.resize();this.draw();
 }
 bind(){
  const c=this.canvas;
  c.addEventListener("pointerdown",e=>{this.drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};c.setPointerCapture?.(e.pointerId);});
  c.addEventListener("pointermove",e=>{if(!this.drag)return;this.yaw=this.drag.yaw+(e.clientX-this.drag.x)*.009;this.pitch=clamp(this.drag.pitch-(e.clientY-this.drag.y)*.007,-1.0,1.0);this.draw();});
  const end=()=>{this.drag=null;};c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end);
  c.addEventListener("dblclick",()=>this.reset());
  if("ResizeObserver" in window)new ResizeObserver(()=>this.resize()).observe(c);else window.addEventListener("resize",()=>this.resize(),{passive:true});
 }
 setView(name){
  const angles={front:[180,5],rear:[0,5],left:[90,4],right:[-90,4],threequarter:[-34,15],frontthreequarter:[146,13],top:[0,83],undercarriage:[0,-80],interior:[-22,17],enginebay:[154,26]};
  const a=angles[name]||angles.threequarter;
  this.yaw=a[0]*DEG;this.pitch=a[1]*DEG;this.last={...this.last,view:name};this.draw();return this;
 }
 setZoom(z){this.zoom=clamp(z,.62,1.65);this.draw();return this;}
 setLayer(layer){this.layer=String(layer||"all");this.draw();return this;}
 setLight(light){this.lightMode=light==="night"?"night":"studio";this.draw();return this;}
 setScene(scene){this.scene=["factory","showroom","brochure","damage","night"].includes(scene)?scene:"studio";this.draw();return this;}
 setDamage(level){this.damage=clamp(level,0,1);this.draw();return this;}
 configure(view,options={}){
   const presets={front:[180,5],rear:[0,5],left:[90,4],right:[-90,4],threequarter:[-34,15],
    frontthreequarter:[146,13],top:[0,83],undercarriage:[0,-80],interior:[-22,17],enginebay:[154,26]};
   const angles=presets[view]||presets.threequarter;
   this.yaw=angles[0]*DEG;this.pitch=angles[1]*DEG;
   this.last={...this.last,view:view||"threequarter"};
   if(options.layer)this.layer=String(options.layer);
   if(options.light)this.lightMode=options.light==="night"?"night":"studio";
   if(options.scene)this.scene=["factory","showroom","brochure","damage","night"].includes(options.scene)?options.scene:"studio";
   if(options.damage!=null)this.damage=clamp(options.damage,0,1);
   if(options.zoom!=null)this.zoom=clamp(options.zoom,.62,1.65);
   this.draw();return this;
 }
 reset(){this.yaw=this.kind==="engine"?-35*DEG:-32*DEG;this.pitch=this.kind==="engine"?22*DEG:15*DEG;this.zoom=1;this.layer="all";this.lightMode="studio";this.scene="studio";this.damage=0;this.draw();}
 resize(){
  const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(260,Math.round(rect.width||560)),h=Math.max(170,Math.round(rect.height||300));
  if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
  this.ctx.setTransform(dpr,0,0,dpr,0,0);this.w=w;this.h=h;this.draw();
 }
 setModel(faces,labels=[],meta={}){this.faces=faces||[];this.labels=labels||[];this.last=meta;this.draw();}
 draw(){
  const ctx=this.ctx;if(!ctx||!this.w)return;
  ctx.clearRect(0,0,this.w,this.h);
  const grad=ctx.createLinearGradient(0,0,0,this.h);
  const bg=this.scene==="factory"?["#293d48","#070e16"]:this.scene==="showroom"?["#18364d","#08131e"]:
  this.scene==="brochure"?["#283c46","#111922"]:this.lightMode==="night"?["#030914","#090a16"]:["#101a23","#05080c"];
  grad.addColorStop(0,bg[0]);grad.addColorStop(1,bg[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,this.w,this.h);
  ctx.strokeStyle=this.scene==="factory"?"rgba(185,218,234,.19)":"rgba(120,155,180,.09)";ctx.lineWidth=1;for(let x=0;x<this.w;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.h);ctx.stroke();}for(let y=0;y<this.h;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.w,y);ctx.stroke();}
  const selected=this.layer==="all"?this.faces:this.faces.filter(f=>this.layer==="body"?["body","hood","decklid","glass","side-glass","windshield","rear-glass","bumper","grille","lamp","rear-lamp","wheel","wheel-rim","fender-flare","grille-slat","front-aero","rear-aero"].includes(f.meta):this.layer==="chassis"?["chassis","wheel","wheel-rim","brake-rotor","brake-caliper","underbody-panel","diffuser-fin","brake-duct"].includes(f.meta):this.layer==="lighting"?["lamp","rear-lamp","indicator"].includes(f.meta):this.layer==="wheels"?["wheel","wheel-rim","brake-rotor","brake-caliper"].includes(f.meta):f.meta===this.layer);
  const visible=selected.length?selected:this.faces;
  const allPts=visible.flatMap(f=>f.pts.map(p=>rotatePoint(p,this.yaw,this.pitch))),maxX=Math.max(1,...allPts.map(p=>Math.abs(p.x))),maxY=Math.max(1,...allPts.map(p=>Math.abs(p.y))),scale=Math.min(this.w/(maxX*2.75),this.h/(maxY*2.85))*1.02*this.zoom,cx=this.w*.50,cy=this.h*.53,camera=8.5;
  ctx.save();ctx.fillStyle="rgba(0,0,0,.30)";ctx.beginPath();ctx.ellipse(cx,cy+this.h*.26,Math.min(this.w*.32,maxX*scale*.85),Math.max(10,this.h*.045),0,0,Math.PI*2);ctx.fill();ctx.restore();
  const project=p=>{const q=clamp(camera/(camera+p.z),.62,1.55);return[cx+p.x*scale*q,cy-p.y*scale*q];};
  const projected=visible.map(f=>{
   const pts=f.pts.map(p=>rotatePoint(p,this.yaw,this.pitch)),center=pts.reduce((a,p)=>add(a,p),v3());center.x/=pts.length;center.y/=pts.length;center.z/=pts.length;
   const n=norm(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]))),light=norm(v3(-.55,.85,-.75)),lit=(this.lightMode==="night"?.18:.42)+(this.lightMode==="night"?.38:.58)*Math.abs(dot(n,light));
   return{...f,depth:center.z,screen:pts.map(project),fill:shade(f.color,lit)};
  }).sort((a,b)=>b.depth-a.depth);
  for(const f of projected){ctx.beginPath();f.screen.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=this.scene==="damage"&&this.damage>0&&["body","hood","bumper","decklid"].includes(f.meta)?shade(f.color,Math.max(.20,.82-this.damage*.54)):f.fill;ctx.fill();ctx.strokeStyle=f.meta==="glass"||f.meta==="side-glass"||f.meta==="windshield"||f.meta==="rear-glass"?"rgba(175,215,235,.18)":"rgba(215,230,240,.11)";ctx.stroke();}
  if(this.scene==="factory"){
    ctx.fillStyle="rgba(190,225,234,.55)";ctx.font="700 10px system-ui";
    ctx.fillText("FINAL ASSEMBLY / QUALITY BAY",12,this.h-30);
  }else if(this.scene==="damage"){
    ctx.fillStyle=this.damage>0?"rgba(245,166,142,.85)":"rgba(170,212,209,.72)";
    ctx.font="700 10px system-ui";
    ctx.fillText(this.damage>0?"RECORDED BODY CONDITION / "+Math.round(this.damage*100)+"%":"BODY INSPECTION / NO RECORDED DAMAGE",12,this.h-30);
  }
  ctx.fillStyle="rgba(225,235,242,.72)";ctx.font="700 10px system-ui,-apple-system,sans-serif";ctx.fillText("DRAG TO ROTATE • DOUBLE TAP TO RESET",12,this.h-12);
  if(this.last.title){ctx.fillStyle="#eaf1f5";ctx.font="800 13px system-ui,-apple-system,sans-serif";ctx.fillText(this.last.title,12,20);}
  if(this.last.sub){ctx.fillStyle="rgba(190,205,215,.72)";ctx.font="600 10px system-ui,-apple-system,sans-serif";ctx.fillText(this.last.sub,12,36);}
 }
}
function engineRows(config,cyl){
 const c=String(config||"I4").toUpperCase();
 if(c.startsWith("W"))return 4;
 if(c.startsWith("V")||c.startsWith("VR")||c.startsWith("F"))return 2;
 return 1;
}
function buildEngine(d={},stats={}){
 const cfg=String(d.config||"I4").toUpperCase(),cyl=Number((cfg.match(/\d+/)||[4])[0]),rows=engineRows(cfg,cyl),per=Math.ceil(cyl/rows),bore=clamp(d.bore||86,60,120),stroke=clamp(d.stroke||86,55,130),disp=Number(stats.disp||0),fuel=String(d.fuel||"carb"),head=String(d.head||"ohv"),aspiration=String(d.aspiration||"na"),blockDeck=String(d.blockDeck||"open"),intake=String(d.intake||"standard"),exhaust=String(d.exhaust||"cast"),oiling=String(d.oiling||"wet"),oilCooler=String(d.oilCooler||"none"),ignition=String(d.ignition||"distributor"),faces=[];
 const long=Math.max(1.5,per*(bore/86)*.72),height=.78+(stroke/86)*.34,width=rows===1?.92:rows===2?1.62:2.08,flat=cfg.startsWith("F");
 faces.push(...boxFaces(0,-.08,0,width,height,long,d.block==="aluminum"?"#78838a":"#4f5c65","block"));
 const panHeight=oiling==="dry"?.12:oiling==="baffled"?.19:.22,panWidth=oiling==="dry"?width*.62:width*.82;
 faces.push(...boxFaces(0,-.57,0,panWidth,panHeight,long*.78,"#252c31","oil-pan"));
 if(oiling==="dry"){faces.push(...cylinderFaces(-width*.82,-.12,long*.18,.17,.56,"y","#58636a",14,"dry-sump-reservoir"));faces.push(...cylinderFaces(-width*.72,-.20,-long*.14,.045,.62,"z","#30383d",10,"oil-line"));}
 if(blockDeck!=="open"){const rail="#68747b";faces.push(...boxFaces(-width*.36,.37,0,.10,.10,long*.84,rail,"deck-reinforcement"));faces.push(...boxFaces(width*.36,.37,0,.10,.10,long*.84,rail,"deck-reinforcement"));if(blockDeck==="closed")faces.push(...boxFaces(0,.40,0,width*.58,.07,long*.76,"#5e6a71","closed-deck-bridge"));}
 faces.push(...boxFaces(0,-.04,long*.57,width*.78,height*.72,.34,"#343d43","bellhousing"));
 const rowOffsets=rows===1?[0]:rows===2?[-.47,.47]:[-.76,-.25,.25,.76];
 let made=0;
 for(let r=0;r<rows;r++){
  const count=Math.min(per,cyl-made),x=rowOffsets[r];
  for(let i=0;i<count;i++,made++){
   const z=(i-(count-1)/2)*(bore/86)*.72,y=flat?.08:.38+Math.abs(x)*.08,bank=flat?0:rows===1?0:rows===2?(cfg.startsWith("VR")?(x<0?-12:12):(x<0?-30:30))*DEG:([-42,-15,15,42][r]||0)*DEG;
   let cylFaces=cylinderFaces(x,y,z,.22*(bore/86),.44*(stroke/86),flat?"x":"y",r%2?"#717d85":"#85929a",12,"cylinder");
   if(bank)cylFaces=tiltFaces(cylFaces,bank,x,y);faces.push(...cylFaces);
  }
  const coverY=flat?.30:.70+Math.abs(x)*.08,coverWidth=rows===1?1.02:rows===2?.62:.46,bank=flat?0:rows===1?0:rows===2?(cfg.startsWith("VR")?(x<0?-12:12):(x<0?-30:30))*DEG:([-42,-15,15,42][r]||0)*DEG;
  let cover=boxFaces(x,coverY,0,coverWidth,head==="ohv"?.18:.24,long*.90,head==="dohc"?"#222a30":"#39434b","valve-cover");if(bank)cover=tiltFaces(cover,bank,x,coverY);faces.push(...cover);
  if(head==="dohc"){
   let c1=boxFaces(x-coverWidth*.22,coverY+.16,0,coverWidth*.18,.11,long*.82,"#505b63","cam-cover"),c2=boxFaces(x+coverWidth*.22,coverY+.16,0,coverWidth*.18,.11,long*.82,"#505b63","cam-cover");if(bank){c1=tiltFaces(c1,bank,x,coverY);c2=tiltFaces(c2,bank,x,coverY);}faces.push(...c1,...c2);
  }else if(head==="sohc"){let cam=boxFaces(x,coverY+.13,0,coverWidth*.22,.10,long*.82,"#4a555d","cam-cover");if(bank)cam=tiltFaces(cam,bank,x,coverY);faces.push(...cam);}
 }
 const intakeY=flat?.58:1.00,intakeWidth=rows===1?.70:Math.min(1.12,width*.62);
 if(fuel==="carb"){
  faces.push(...boxFaces(0,intakeY,0,intakeWidth,.22,Math.min(.78,long*.48),"#596168","carburetor"));
  faces.push(...cylinderFaces(0,intakeY+.18,0,.34,.13,"y","#262d32",18,"air-cleaner"));
 }else{
  faces.push(...boxFaces(0,intakeY,0,intakeWidth,.20,long*.58,fuel==="efi"?"#38464f":"#4b5358","intake-plenum"));
  const railX=rows===1?.38:Math.min(width*.34,.62);
  faces.push(...boxFaces(-railX,intakeY-.18,0,.07,.08,long*.72,"#806f55","fuel-rail"));
  faces.push(...boxFaces(railX,intakeY-.18,0,.07,.08,long*.72,"#806f55","fuel-rail"));
  faces.push(...cylinderFaces(0,intakeY+.02,-long*.36,.16,.22,"z","#2b343a",12,"throttle-body"));
 }
 if(intake==="tuned"){faces.push(...boxFaces(0,intakeY+.12,-long*.06,intakeWidth*.78,.10,long*.78,"#45545d","tuned-runner-plenum"));for(let i=0;i<Math.min(cyl,8);i++){const z=(i-(Math.min(cyl,8)-1)/2)*(long/Math.max(3,Math.min(cyl,8)));faces.push(...cylinderFaces(0,intakeY-.03,z,.055,.34,"y","#53636c",10,"intake-runner"));}}
 if(intake==="itb"){let madeStacks=0;for(let r=0;r<rows;r++){const count=Math.min(per,cyl-madeStacks),x=rowOffsets[r]*.62;for(let i=0;i<count;i++,madeStacks++){const z=(i-(count-1)/2)*(bore/86)*.72;faces.push(...cylinderFaces(x,intakeY+.17,z,.075,.24,"y","#89969e",12,"itb-stack"));}}}
 if(ignition==="coilpack"){let coils=0;for(let r=0;r<rows;r++){const count=Math.min(per,cyl-coils),x=rowOffsets[r]*.72;for(let i=0;i<count;i++,coils++){const z=(i-(count-1)/2)*(bore/86)*.72;faces.push(...boxFaces(x,.83+Math.abs(x)*.05,z,.09,.12,.15,"#20282e","coil-pack"));}}}
 const exhaustX=rows===1?width*.62:width*.70,headerMode=exhaust==="header"||exhaust==="performance";
 for(const side of [-1,1]){
  if(headerMode){const runners=Math.min(4,Math.max(2,per));for(let j=0;j<runners;j++){const z=(j-(runners-1)/2)*(long*.56/Math.max(1,runners-1));faces.push(...cylinderFaces(side*(exhaustX+.03),.31,z,.055+(exhaust==="performance"?.012:0),.42,"y",exhaust==="performance"?"#8b7159":"#725f4f",10,"header-runner"));}}
  else faces.push(...boxFaces(side*exhaustX,.28,0,.13,.18,long*.68,"#695747","exhaust-manifold"));
  faces.push(...cylinderFaces(side*(exhaustX+.08),.20,long*.38,.08+(exhaust==="performance"?.02:0),.38,"z","#5c4c3f",10,"exhaust-runner"));
 }
 if(aspiration==="turbo"){
  const twins=cyl>=8&&rows>1?2:1,turboScale=.72+clamp(d.turboSize??50,15,100)/125;
  for(let i=0;i<twins;i++){const side=twins===2?(i?1:-1):1;faces.push(...cylinderFaces(side*width*.78,.20,(i-.5)*.42,.28*turboScale,.36*turboScale,"x","#8b765d",14,"turbo"));faces.push(...cylinderFaces(side*width*.88,.20,(i-.5)*.42,.13*turboScale,.22*turboScale,"x","#b1a07f",12,"compressor"));}
  if(d.intercooler)faces.push(...boxFaces(0,.02,-long*.62,width*.72,.38,.12,"#667984","intercooler"));
 }
 if(aspiration==="supercharged"){
  faces.push(...boxFaces(0,intakeY+.26,0,.74,.30,long*.54,"#6e7478","supercharger"));
  faces.push(...cylinderFaces(.44,intakeY+.26,-long*.18,.12,.62,"z","#232a30",12,"supercharger-drive"));
 }
 faces.push(...cylinderFaces(width*.58,-.30,-long*.36,.23,.18,"x","#1d252b",16,"crank-pulley"));
 faces.push(...cylinderFaces(width*.58,-.03,-long*.39,.15,.14,"x","#273139",14,"accessory-pulley"));
 faces.push(...cylinderFaces(-width*.58,.08,-long*.34,.16,.24,"x","#5f696f",14,"alternator"));
 faces.push(...boxFaces(-width*.53,-.35,long*.22,.24,.20,.34,"#30383d","starter"));
 if(oilCooler!=="none"){const scale=oilCooler==="race"?1.28:1;faces.push(...boxFaces(width*.72,.02,-long*.48,.10,.34*scale,.38*scale,"#596a73","oil-cooler"));for(let i=-2;i<=2;i++)faces.push(...boxFaces(width*.775,.02+i*.052,-long*.48,.012,.025,.34*scale,"#91a0a8","oil-cooler-fin"));}
 faces.push(...boxFaces(0,-.50,-long*.28,width*.54,.10,.30,"#6c4d3b","engine-mount"));
 const title=cfg+" • "+(disp?disp.toFixed(2)+"L":"LIVE POWER UNIT"),fuelLabel=fuel==="efi"?"EFI":fuel==="mech"?"MECH INJECTION":"CARB",airLabel=aspiration==="turbo"?"TURBO":aspiration==="supercharged"?"SUPERCHARGED":"NATURALLY ASPIRATED",sub=cyl+" cylinders • "+head.toUpperCase()+" • "+fuelLabel+" • "+airLabel;
 return{faces,title,sub,details:{cylinders:cyl,rows,fuel,head,aspiration,packageLength:long,packageWidth:width}};
}
function stableUnit(seed,salt=""){
 const raw=String(seed??"1")+"|"+String(salt),n=raw.split("").reduce((h,ch)=>Math.imul(h^ch.charCodeAt(0),16777619)>>>0,2166136261);
 return n/4294967295;
}
function eraVehicleDNA(year=1970){
 const y=Number(year)||1970;
 if(y<1950)return{label:"1940s",roof:.15,hood:.09,glass:-.16,bumper:.10,wheel:.08,chrome:1,lampRound:true,grilleTall:.16};
 if(y<1960)return{label:"1950s",roof:.09,hood:.06,glass:-.08,bumper:.08,wheel:.06,chrome:.9,lampRound:true,grilleTall:.10};
 if(y<1970)return{label:"1960s",roof:.03,hood:.04,glass:.01,bumper:.07,wheel:.03,chrome:.7,lampRound:true,grilleTall:.04};
 if(y<1980)return{label:"1970s",roof:0,hood:0,glass:.04,bumper:.08,wheel:0,chrome:.45,lampRound:y<1975,grilleTall:0};
 if(y<1990)return{label:"1980s",roof:-.04,hood:-.03,glass:.08,bumper:.10,wheel:-.01,chrome:.20,lampRound:false,grilleTall:-.03};
 return{label:y<2000?"1990s":y<2010?"2000s":"MODERN",roof:-.07,hood:-.05,glass:.12,bumper:.06,wheel:-.02,chrome:.08,lampRound:false,grilleTall:-.05};
}
function generationDesignDNA(seed,gen){
 const g=Math.max(1,Math.round(Number(gen)||1)),u=s=>stableUnit(seed,"gen:"+g+":"+s);
 return{
  nose:(u("nose")-.5)*.24,
  rear:(u("rear")-.5)*.20,
  hood:(u("hood")-.5)*.20,
  roof:(u("roof")-.5)*.17,
  roofShift:(u("roofShift")-.5)*.24,
  belt:(u("belt")-.5)*.09,
  width:(u("width")-.5)*.10,
  glass:(u("glass")-.5)*.18,
  fascia:(u("fascia")-.5)*.16
 };
}
function vehicleProfile(d={},wb,gen,seed,year=1970){
 const body=String(d.body||"sedan"),len=wb/2700,dna=generationDesignDNA(seed,gen),era=eraVehicleDNA(year),quirk=(stableUnit(seed,"body:"+body)-.5)*.018;
 const tune=(value,span)=>((clamp(value??50,0,100)-50)/50)*span,noseTune=tune(d.noseLength,.22),roofTune=tune(d.roofHeight,.18),slopeTune=tune(d.roofSlope,.18),cabinTune=tune(d.cabinPosition,.18),greenhouseTune=tune(d.greenhouse,.12);
 const nose=(-1.55+dna.nose-era.hood-noseTune)*len,rear=(1.55+dna.rear)*len,hood=(-.72+dna.hood-era.hood*.35-noseTune*.38)*len,cowl=(-.25+dna.hood*.35+cabinTune*.18)*len,roofFront=(.03+dna.roofShift+cabinTune*.45)*len,roofRear=(.72+dna.roofShift*.45+cabinTune*.30)*len,roof=dna.roof+era.roof+roofTune,belt=dna.belt,glass=era.glass+greenhouseTune;
 const profiles={
  sedan:[[nose,.20],[nose+.16,.49+belt],[hood,.64+belt],[cowl,.69+belt],[roofFront,1.16+roof],[roofRear,1.14+roof-slopeTune*.72],[1.03*len,.71+belt-slopeTune*.20],[rear-.05,.63+belt],[rear,.34],[rear-.10,.18]],
  coupe:[[nose,.20],[nose+.18,.48+belt],[hood,.62+belt],[cowl,.67+belt],[.10*len+dna.roofShift+cabinTune*.40,1.05+roof],[.60*len+dna.roofShift*.5+cabinTune*.25,.98+roof-slopeTune],[1.12*len,.59+belt-slopeTune*.24],[rear,.33],[rear-.10,.18]],
  hatch:[[nose,.20],[nose+.17,.49+belt],[hood,.63+belt],[cowl,.68+belt],[.05*len+dna.roofShift+cabinTune*.35,1.10+roof],[.86*len+dna.roofShift*.35+cabinTune*.20,1.05+roof-slopeTune*.58],[rear-.05,.70+belt-slopeTune*.12],[rear,.29],[rear-.10,.18]],
  wagon:[[nose,.20],[nose+.17,.52+belt],[hood,.65+belt],[cowl,.69+belt],[.02*len+dna.roofShift+cabinTune*.28,1.13+roof],[1.10*len,1.12+roof-slopeTune*.30],[rear,.70+belt],[rear,.28],[rear-.10,.18]],
  suv:[[nose,.24],[nose+.14,.59+belt],[hood,.73+belt],[cowl,.78+belt],[.02*len+dna.roofShift+cabinTune*.24,1.34+roof],[1.06*len,1.31+roof-slopeTune*.22],[rear,.79+belt],[rear,.30],[rear-.10,.20]],
  convertible:[[nose,.20],[nose+.18,.48+belt],[hood,.61+belt],[cowl,.65+belt],[.10*len,.76+roof*.15],[.80*len,.68+roof*.12],[rear,.39],[rear-.10,.18]],
  pickup:[[nose,.23],[nose+.15,.57+belt],[hood,.70+belt],[cowl,.74+belt],[-.05*len+dna.roofShift+cabinTune*.22,1.21+roof],[.46*len+dna.roofShift*.35+cabinTune*.15,1.18+roof-slopeTune*.25],[.58*len,.64+belt],[rear,.63+belt],[rear,.26],[rear-.10,.19]],
  van:[[nose,.24],[nose+.12,.60+belt],[hood*.72,.74+belt],[cowl*.45,.83+belt],[-.16*len+dna.roofShift+cabinTune*.18,1.42+roof],[1.12*len,1.40+roof-slopeTune*.18],[rear,.82+belt],[rear,.30],[rear-.10,.20]],
  minivan:[[nose,.22],[nose+.14,.56+belt],[hood*.82,.69+belt],[cowl*.60,.77+belt],[-.05*len+dna.roofShift+cabinTune*.20,1.31+roof],[1.07*len,1.29+roof-slopeTune*.22],[rear,.76+belt],[rear,.29],[rear-.10,.19]]
 };
 const raw=(profiles[body]||profiles.sedan).map(([z,y],i)=>[z,y+glass*(i>=3&&i<=6?.42:0)+(i%3===0?quirk:0)]);
 return smoothProfile(raw,["sedan","coupe","hatch","convertible"].includes(body)?2:1);
}
function buildVehicle(d={},stats={},identity={}){
 const styling=d.presentationStyle||{};
 if(styling.coachwork && styling.coachwork!=="original"){const shift=styling.coachwork==="formal"?12:styling.coachwork==="flowing"?-6:-20;d={...d,roofHeight:clamp(Number(d.roofHeight??50)+shift,0,100),roofSlope:clamp(Number(d.roofSlope??50)+(styling.coachwork==="flowing"?15:0),0,100)};}
 if(styling.lighting && styling.lighting!=="original")d={...d,headlightStyle:styling.lighting==="rectangular"?"rect":styling.lighting};
 if(Number.isFinite(Number(d.rooflineCurve)))d={...d,roofSlope:clamp(Number(d.roofSlope??50)+(Number(d.rooflineCurve)-50)*.55,0,100)};
 const body=String(d.body||"sedan"),wb=clamp(d.wheelbase||2700,2100,3600),track=clamp(d.trackWidth||1480,1200,2000),ride=clamp(d.rideHeight||165,70,380),rim=clamp(d.wheel||14,10,28),tireWidth=clamp(d.tireWidth||185,120,420),tireProfile=clamp(d.tireProfile||75,20,95),gen=Math.max(1,Math.round(Number(identity.generation)||1)),modelYear=Math.round(Number(identity.modelYear)||1970),seed=identity.visualSeed??identity.seed??identity.name??"1",dna=generationDesignDNA(seed,gen),era=eraVehicleDNA(modelYear),width=1.48*(track/1480)*(1+dna.width),lift=(ride-165)/520,len=wb/2700*clamp(Number(d.platformLength??(wb*1.67))/(wb*1.67),.78,1.3);
 const paints=["#65727c","#35485b","#6f3f42","#46584a","#7a715f","#2f3338","#6d6f72"],originalPaint=String(d.paintColor||paints[Math.floor(stableUnit(seed,"paint:"+gen)*paints.length)%paints.length]),paint=shade(originalPaint,clamp(.88+Number(d.paintFinish??40)*.003,.84,1.20));
 const profile=vehicleProfile(d,wb,gen,seed,modelYear),faces=prismFaces(profile,width,paint,"body");
 faces.push(...boxFaces(0,.28+lift,0,width*.92,.16,len*2.55,"#252d33","chassis"));
 const overallMm=rim*25.4+2*tireWidth*(tireProfile/100),baseOverall=14*25.4+2*185*.75,wheelR=.30*(overallMm/baseOverall)*(1+era.wheel),wheelZ=len*1.05,wheelX=width*.55,wheelDepth=.15*(tireWidth/185),rotorScale=clamp(Number(d.rotorSize||260)/260,.68,1.35),caliperScale=String(d.caliper||"single")==="fourpiston"?1.35:1;
 for(const z of [-wheelZ,wheelZ])for(const x of [-wheelX,wheelX]){
  faces.push(...cylinderFaces(x,.26+lift,z,wheelR,wheelDepth,"x",Number(d.tireCompoundGrade??50)>70?"#12191c":"#111518",18,"wheel"));
  faces.push(...cylinderFaces(x+(x>0?wheelDepth*.52:-wheelDepth*.52),.26+lift,z,wheelR*.55,.025,"x",d.presentationWheel==="chrome"?"#c5d1d8":d.presentationWheel==="steel"?"#4c5962":d.presentationWheel==="alloy"?"#9aa2a6":d.wheelMaterial==="alloy"?"#9aa2a6":modelYear<1970?"#b2b6b8":"#69767e",16,"wheel-rim"));
  faces.push(...cylinderFaces(x+(x>0?wheelDepth*.57:-wheelDepth*.57),.26+lift,z,wheelR*.37*rotorScale,.014,"x","#777c7f",16,"brake-rotor"));
  faces.push(...boxFaces(x+(x>0?wheelDepth*.60:-wheelDepth*.60),.29+lift,z-wheelR*.22,.035,.10*caliperScale,.12*caliperScale,String(d.caliper||"single")==="fourpiston"?"#6c3b34":"#4c555b","brake-caliper"));
  const spokeCount=Math.max(4,Math.min(12,Math.round(4+Number(d.wheelDesign??45)/13)));
  for(let spoke=0;spoke<spokeCount;spoke++){const angle=spoke/spokeCount*Math.PI*2,outer=wheelR*.46,inner=wheelR*.10,sy=.26+lift,sideX=x+(x>0?wheelDepth*.60:-wheelDepth*.60);faces.push(face([v3(sideX,sy+Math.sin(angle)*inner,z+Math.cos(angle)*inner),v3(sideX,sy+Math.sin(angle-.075)*outer,z+Math.cos(angle-.075)*outer),v3(sideX,sy+Math.sin(angle+.075)*outer,z+Math.cos(angle+.075)*outer)],Number(d.wheelDesign??45)>72?"#ccd2d2":"#8b9599","wheel-spoke"));}
 }
 const flare=clamp(d.fenderFlare??0,0,70)/70;if(flare>.02){for(const z of [-wheelZ,wheelZ])for(const side of [-1,1])faces.push(...boxFaces(side*width*(.505+flare*.028),.49+lift,z,.035+flare*.045,.16+flare*.08,wheelR*1.25,shade(paint,.92),"fender-flare"));}
 const greenhouseTune=((clamp(d.greenhouse??50,0,100)-50)/50),cabinTune=((clamp(d.cabinPosition??50,0,100)-50)/50),glassY=(body==="van"?1.20:body==="minivan"?1.10:body==="suv"?1.12:body==="wagon"||body==="hatch"?1.00:.95)+dna.roof*.35+era.roof*.45+greenhouseTune*.08+(body==="suv"?(Number(d.suvStance??60)-60)*.003:0)+(body==="van"?(Number(d.vanCargoHeight??60)-60)*.003:0),glassLen=(body==="coupe"?.75:body==="pickup"?.55:body==="van"?1.20:body==="minivan"?1.15:1.05)*(1+dna.glass+era.glass+greenhouseTune*.12)*(body==="pickup"?clamp(1-(Number(d.pickupBedRatio??55)-55)/190,.65,1.30):body==="hatch"?clamp(1+(Number(d.hatchCargoRatio??52)-52)/200,.77,1.25):1),roofY=glassY+.22;
 if(body!=="convertible"){
  faces.push(...boxFaces(dna.roofShift*.55+cabinTune*.10,glassY+lift,.22,width*(.76+greenhouseTune*.06),.16,Math.max(.42,glassLen),"#203847","glass"));
  const cowlZ=-len*.28,roofFrontZ=-len*.02,roofRearZ=body==="pickup"?len*.43:body==="van"||body==="minivan"?len*.86:len*.63,rearDeckZ=["wagon","hatch","suv","van","minivan"].includes(body)?len*1.12:len*.98;
  faces.push(face([v3(-width*.39,.72+lift,cowlZ),v3(width*.39,.72+lift,cowlZ),v3(width*.34,roofY+lift,roofFrontZ),v3(-width*.34,roofY+lift,roofFrontZ)],"#294654","windshield"));
  faces.push(face([v3(-width*.34,roofY+lift,roofRearZ),v3(width*.34,roofY+lift,roofRearZ),v3(width*.39,.74+lift,rearDeckZ),v3(-width*.39,.74+lift,rearDeckZ)],"#263f4c","rear-glass"));
  for(const side of [-1,1]){
   faces.push(...boxFaces(side*width*.47,glassY-.08+lift,.10,.032,.42,Math.max(.34,glassLen*.42),"#1a303d","side-glass"));
   faces.push(...boxFaces(side*width*.475,glassY-.08+lift,.58,.032,.42,Math.max(.28,glassLen*.32),"#1b313e","side-glass"));
   faces.push(...boxFaces(side*width*.49,glassY-.02+lift,.41,.022,.47,.035,"#161d22","b-pillar"));
  }
 }
 const yearPhase=(modelYear%5),frontZ=-len*(1.49+dna.fascia*.10),rearZ=len*(1.47+dna.rear*.06),bumperDepth=(.07+era.bumper)*(1+Number(d.bumperSculpt??40)/280);
 faces.push(...boxFaces(0,.31+lift,frontZ-.045,width*.92,.10,bumperDepth,modelYear<1980?"#91979a":"#343d43","bumper"));
 faces.push(...boxFaces(0,.30+lift,rearZ+.045,width*.90,.10,bumperDepth,modelYear<1980?"#91979a":"#343d43","bumper"));
 faces.push(...boxFaces(0,.67+lift,-len*.78,width*.72,.035,len*.44,shade(paint,1.08),"hood"));
 if(!["hatch","wagon","suv","pickup"].includes(body))faces.push(...boxFaces(0,.62+lift,len*1.05,width*.68,.035,len*.34,shade(paint,1.04),"decklid"));
 const lampWidth=(.20+yearPhase*.018+Math.abs(dna.fascia)*.10)*(0.82+Number(d.headlightGeometry??50)/270),lampHeight=(.095+(yearPhase%2)*.018)*(0.83+Number(d.headlightGeometry??50)/285),lampDepth=.075+gen*.006,requestedLamp=String(d.headlightStyle||"period"),lampStyle=requestedLamp==="period"?(era.lampRound?"round":"rect"):requestedLamp;
 for(const x of [-width*.32,width*.32]){
  if(lampStyle==="quad"){for(const q of [-.065,.065])faces.push(...cylinderFaces(x+q,.50+lift,frontZ,.085+yearPhase*.003,lampDepth,"z","#ddd9b8",14,"lamp"));}
  else if(lampStyle==="round")faces.push(...cylinderFaces(x,.50+lift,frontZ,(.13+yearPhase*.006)*(0.82+Number(d.headlightGeometry??50)/275),lampDepth,"z","#ddd9b8",18,"lamp"));
  else faces.push(...boxFaces(x,.50+lift,frontZ,lampWidth,lampHeight,lampDepth,"#d5d4b0","lamp"));
  faces.push(...boxFaces(x*.78,.39+lift,frontZ-.015,.10,.055,.05,"#b98542","indicator"));
 }
 const grilleStyle=String(d.grilleStyle||"standard"),fasciaStyle=String(d.fasciaStyle||"balanced"),taper=((clamp(d.bodyTaper??50,0,100)-50)/50),grilleFactor=grilleStyle==="wide"?1.24:grilleStyle==="narrow"?.72:1,grilleWidth=width*(.34+Math.abs(dna.fascia)*.24)*grilleFactor*(1-taper*.05)+yearPhase*.018,grilleHeight=(.11+era.grilleTall+yearPhase%3*.012)*(fasciaStyle==="slim"?.78:fasciaStyle==="sport"?1.18:1),cooling=clamp(d.coolingOpening??50,0,100)/100;
 faces.push(...boxFaces(0,.40+lift,frontZ-.012,grilleWidth,grilleHeight*(.72+cooling*.55),.055,modelYear<1970?"#7c858a":"#202a31","grille"));
 if(styling.grille==="horizontal")for(let i=-2;i<=2;i++)faces.push(...boxFaces(0,.40+lift+i*grilleHeight*.14,frontZ-.045,grilleWidth*.92,.014,.018,"#8b9499","grille-slat"));
 else if(styling.grille==="mesh"){for(let i=-3;i<=3;i++)faces.push(...boxFaces(i*grilleWidth*.12,.40+lift,frontZ-.045,.009,grilleHeight*(.62+cooling*.48),.018,"#596b76","grille-slat"));for(let i=-2;i<=2;i++)faces.push(...boxFaces(0,.40+lift+i*grilleHeight*.14,frontZ-.045,grilleWidth*.92,.009,.018,"#596b76","grille-slat"));}
 else if(styling.grille==="vertical")for(let i=-3;i<=3;i++)faces.push(...boxFaces(i*grilleWidth*.12,.40+lift,frontZ-.045,.022,grilleHeight*(.62+cooling*.48),.018,"#b1bec6","grille-slat"));
 else for(let i=-2;i<=2;i++)faces.push(...boxFaces(i*grilleWidth*.13,.40+lift,frontZ-.045,.018,grilleHeight*(.62+cooling*.48),.018,"#8b9499","grille-slat"));
 if(fasciaStyle==="sport")faces.push(...boxFaces(0,.28+lift,frontZ-.065,width*.56,.075,.06,"#11191f","lower-intake"));
 if(fasciaStyle==="slim")faces.push(...boxFaces(0,.34+lift,frontZ-.07,width*.44,.035,.045,"#5e6b73","fascia-trim"));
 const rearLampWidth=(.16+(modelYear%4)*.014)*(0.78+Number(d.taillightGeometry??50)/240);
 faces.push(...boxFaces(-width*.34,.48+lift,rearZ,rearLampWidth,.10,.06,"#7a2929","rear-lamp"));
 faces.push(...boxFaces(width*.34,.48+lift,rearZ,rearLampWidth,.10,.06,"#7a2929","rear-lamp"));
 if(modelYear>=1960)for(const side of [-1,1])faces.push(...boxFaces(side*width*.57,.86+lift,-len*.24,.11,.07,.10,modelYear<1980?"#858b8e":"#303a40","mirror"));
 if(body!=="convertible")for(const side of [-1,1]){
  faces.push(...boxFaces(side*width*.515,.61+lift,-len*.03,.025,.025,.18,"#a7abad","door-handle"));
  faces.push(...boxFaces(side*width*.515,.61+lift,len*.63,.025,.025,.18,"#a7abad","door-handle"));
  faces.push(...boxFaces(side*width*.518,.42+lift,.34,.016,.022,len*1.45,shade(paint,.72),"rocker"));
 }
 if(era.chrome>.35)for(const side of [-1,1])faces.push(...boxFaces(side*width*.515,.53+lift,.18,.018,.018,len*1.72,"#a9adaf","body-trim"));
 const propulsion=String(d.propulsion||"ice").toLowerCase(),isEV=!!d.evArchitecture||propulsion==="bev"||propulsion==="ev",isHybrid=!!d.hybridArchitecture||propulsion.includes("hybrid");
 if(isEV||isHybrid){
  const packLen=len*(isEV?1.62:1.00),packWidth=width*(isEV?.66:.48);faces.push(...boxFaces(0,.08+lift,.08,packWidth,.12,packLen,isEV?"#35525c":"#46525b","battery-pack"));
  const frontMotor=Number(d.motorKw||0)>0||isEV||isHybrid,rearMotor=Number(d.rearMotorKw||0)>0||String(d.drivetrain||"").includes("AWD");
  if(frontMotor)faces.push(...cylinderFaces(0,.20+lift,-wheelZ*.72,.18,.46,"x","#53636c",16,"e-motor"));
  if(rearMotor)faces.push(...cylinderFaces(0,.20+lift,wheelZ*.72,.18,.46,"x","#53636c",16,"e-motor"));
 }else{
  faces.push(...cylinderFaces(-width*.24,.10+lift,.10,.055,len*1.72,"z","#5b5e60",12,"exhaust"));
  faces.push(...boxFaces(-width*.24,.10+lift,len*.70,.28,.16,.44,"#4d5052","muffler"));
 }
 const drive=String(d.drivetrain||"RWD");if(["RWD","AWD","4WD"].includes(drive))faces.push(...cylinderFaces(0,.14+lift,.03,.055,len*1.45,"z","#343b40",12,"driveshaft"));
 if(["RWD","AWD","4WD"].includes(drive))faces.push(...cylinderFaces(0,.17+lift,wheelZ*.72,.16,.34,"x","#3e474d",14,"rear-differential"));
 if(["AWD","4WD"].includes(drive))faces.push(...cylinderFaces(0,.17+lift,-wheelZ*.72,.15,.32,"x","#3e474d",14,"front-differential"));
 const underbody=String(d.underbody||"open");if(underbody!=="open"){faces.push(...boxFaces(0,.12+lift,.12,width*.72,.035,len*(underbody==="partial"?.92:1.82),"#1f272c","underbody-panel"));if(underbody==="diffuser")for(const side of [-1,0,1])faces.push(...boxFaces(side*width*.23,.14+lift,rearZ-.26,.025,.12,.38,"#2c3439","diffuser-fin"));}
 if(String(d.brakeCooling||"basic")!=="basic"){faces.push(...boxFaces(-width*.37,.28+lift,frontZ+.12,.12,.08,.26,"#252e34","brake-duct"));faces.push(...boxFaces(width*.37,.28+lift,frontZ+.12,.12,.08,.26,"#252e34","brake-duct"));}
 const frontAero=String(d.frontAero||"none"),rearAero=String(d.rearAero||"none");
 if(frontAero!=="none")faces.push(...boxFaces(0,.21+lift,frontZ-.10,width*.84,.045,.16,"#20262a","front-aero"));
 if(rearAero!=="none"){faces.push(...boxFaces(0,.78+lift,rearZ-.18,width*.62,.045,.24,"#252b2f","rear-aero"));faces.push(...boxFaces(-width*.24,.66+lift,rearZ-.18,.035,.22,.035,"#252b2f","rear-aero"));faces.push(...boxFaces(width*.24,.66+lift,rearZ-.18,.035,.22,.035,"#252b2f","rear-aero"));}
 const downforce=clamp(Number(d.downforceSetting??20),0,100),aeroAttachments=clamp(Number(d.aeroAttachments??25),0,100),crash=clamp(Number(d.crashProtection??45),0,100),weightBalance=clamp(Number(d.weightDistribution??53),40,64);
 if(downforce>35){const wingScale=(downforce-35)/65;faces.push(...boxFaces(0,.98+lift,rearZ-.27,width*(.46+wingScale*.37),.04,.16,"#1d2830","variable-downforce-wing"));for(const side of [-1,1])faces.push(...boxFaces(side*width*.24,.84+lift,rearZ-.26,.025,.22,.09,"#2b343b","wing-upright"));}
 if(aeroAttachments>40){faces.push(...boxFaces(0,.20+lift,frontZ-.16,width*(.40+aeroAttachments/230),.030,.20,"#182129","aero-splitter"));if(aeroAttachments>70)for(const side of [-1,1])faces.push(...boxFaces(side*width*.36,.16+lift,rearZ-.16,.038,.12,.34,"#262e37","diffuser-endplate"));}
 if(crash>35){const bracing=(crash-35)/65;for(const side of [-1,1])faces.push(...boxFaces(side*width*.31,.26+lift,frontZ+.40,width*.035+.02*bracing,.10+.07*bracing,.52,"#546269","crash-rail"));}
 const frontPrecision=clamp(Number(d.frontSuspPrecision??45),0,100),rearPrecision=clamp(Number(d.rearSuspPrecision??45),0,100);
 for(const position of [{z:-wheelZ,value:frontPrecision,tag:"front-suspension"},{z:wheelZ,value:rearPrecision,tag:"rear-suspension"}]){
  if(position.value>20){for(const side of [-1,1])faces.push(...boxFaces(side*width*.32,.19+lift,position.z,.20+position.value/500,.032,.24,"#6b7881",position.tag));}
 }
 const torsion=clamp(Number(d.chassisRigidity??50),0,100);
 if(torsion>55)for(const side of [-1,1])faces.push(...boxFaces(side*width*.33,.22+lift,.0,.028+(torsion-55)/1200,.038,len*1.42,"#6b7177","body-rigidity-rail"));
 if(Number(d.nvhTune??50)>65)faces.push(...boxFaces(0,.36+lift,.20,width*.69,.028,len*1.08,"#4b6b78","cabin-isolation"));
 if(Number(d.durabilityValidation??50)>70)faces.push(...boxFaces(0,.10+lift,.20,width*.62,.033,len*1.25,"#343e45","durability-underbody-protection"));
 faces.push(...boxFaces((weightBalance-53)/45,.28+lift,.02,.11,.035,.11,weightBalance>55?"#be8c52":"#9fbdac","center-of-mass-marker"));

 faces.push(...boxFaces(0,.34+lift,frontZ-.085,.22,.08,.025,"#d9dbd9","front-plate"));
 faces.push(...boxFaces(0,.34+lift,rearZ+.085,.22,.08,.025,"#d9dbd9","rear-plate"));
 const title=String(identity.name||d.name||"LIVE VEHICLE").toUpperCase()+" • GEN "+gen,driveLabel=isEV?"EV":isHybrid?"HYBRID":String(d.drivetrain||"RWD"),sub=era.label+" • "+body.toUpperCase()+" • "+driveLabel+" • "+Math.round(wb)+" mm";
 return{faces,title,sub,designDNA:dna,eraDNA:era,modelYear,generation:gen};
}
const viewers=new WeakMap();
function getViewerForCanvas(canvas,kind){
 if(!canvas)return null;let v=viewers.get(canvas);
 if(!v){v=new Viewer(canvas,kind);viewers.set(canvas,v);}
 return v;
}
function renderEngine(canvas,draft,stats={}){const v=getViewerForCanvas(canvas,"engine");if(!v)return null;const model=buildEngine(draft,stats);v.setModel(model.faces,[],{title:model.title,sub:model.sub});return v;}
function renderVehicle(canvas,draft,stats={},identity={}){const v=getViewerForCanvas(canvas,"vehicle");if(!v)return null;const model=buildVehicle(draft,stats,identity);v.setModel(model.faces,[],{title:model.title,sub:model.sub});return v;}
function updateEngine(draft,stats){return renderEngine(document.getElementById("engine3dPreview")||document.getElementById("engine3dCanvas"),draft,stats);}
function updateVehicle(draft,stats,identity={}){return renderVehicle(document.getElementById("vehicle3dPreview")||document.getElementById("vehicle3dCanvas"),draft,stats,identity);}
function renderVehiclePreview(canvas,vehicle){
 if(!canvas||!vehicle)return null;const evo=vehicle.designEvolution||{},design={...(vehicle.design||vehicle),visualRevision:Number(evo.modelYearRevision||0),generationVariant:Number(evo.generationTheme||vehicle.generation||1)},stats=vehicle.stats||{},identity={name:vehicle.name,generation:Number(vehicle.generation||evo.generationTheme||1),modelYear:Number(vehicle.modelYear||evo.lastStyleYear||0),visualSeed:vehicle.visualIdentity?.seed||vehicle.visualSeed||vehicle.id||vehicle.name||1};return renderVehicle(canvas,design,stats,identity);
}
function resetCanvas(canvas){viewers.get(canvas)?.reset();}
function setVehicleView(canvas,view,options={}){
 const instance=getViewerForCanvas(canvas,"vehicle");if(!instance)return null;
 return instance.configure(view,options);
}
function inspectRender(canvas){
 const v=viewers.get(canvas);
 return v?{view:v.last.view||"threequarter",layer:v.layer,light:v.lightMode,zoom:v.zoom,faces:v.faces.length,title:v.last.title}:null;
}
function exportFrame(canvas,mime="image/png"){
 if(!canvas||typeof canvas.toDataURL!=="function")return null;
 return canvas.toDataURL(mime);
}
window.MDXProductVisualizer={renderEngine,renderVehicle,updateEngine,updateVehicle,renderVehiclePreview,resetCanvas,setVehicleView,inspectRender,exportFrame,buildEngine,buildVehicle};
})();
