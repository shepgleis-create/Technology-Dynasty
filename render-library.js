(() => {
"use strict";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const data=svg=>"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
const hex=(c,fall="#44515d")=>/^#[0-9a-f]{6}$/i.test(String(c||""))?String(c):fall;
const shade=(c,p)=>{
 const n=parseInt(hex(c).slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,k=1+p;
 return "#"+[r,g,b].map(x=>Math.round(clamp(x*k,0,255)).toString(16).padStart(2,"0")).join("");
};
const yearEra=y=>y<1950?"1940s":y<1960?"1950s":y<1970?"1960s":y<1980?"1970s":y<1990?"1980s":y<2000?"1990s":y<2010?"2000s":"modern";
const normBody=b=>{
 const x=String(b||"sedan").toLowerCase();
 if(x.includes("minivan"))return"minivan";
 if(x.includes("van"))return"van";
 if(x.includes("pickup")||x.includes("truck"))return"pickup";
 if(x.includes("convert"))return"convertible";
 if(x.includes("wagon"))return"wagon";
 if(x.includes("hatch"))return"hatch";
 if(x.includes("suv")||x.includes("utility")||x.includes("off-road"))return"suv";
 if(x.includes("coupe")||x.includes("sport")||x.includes("gt")||x.includes("muscle"))return"coupe";
 return"sedan";
};
function vehicleBodyPath(body,t){
 const nose=128-(t.nose-50)*.55,rear=1074,roof=t.roof,shift=(t.cabin-50)*1.15,slope=(t.slope-50)*.75;
 const map={
  sedan:"M "+nose+" 474 C "+(nose+10)+" 416 "+(nose+62)+" 386 214 374 L 390 356 C 450 290 "+(500+shift)+" "+(240-roof)+" "+(598+shift)+" "+(230-roof)+" C "+(700+shift)+" "+(222-roof)+" "+(780+shift)+" "+(266-roof+slope)+" 844 "+(336+slope*.25)+" L 1030 372 C 1060 378 1074 402 "+rear+" 462 L 1040 500 L 154 500 Z",
  coupe:"M "+nose+" 476 C "+(nose+14)+" 420 "+(nose+68)+" 388 226 374 L 410 352 C "+(480+shift)+" 284 "+(555+shift)+" "+(244-roof)+" "+(646+shift)+" "+(242-roof)+" C "+(724+shift)+" "+(241-roof)+" "+(790+shift)+" "+(282-roof+slope)+" 862 "+(356+slope*.25)+" L 1032 380 C 1060 388 1074 412 "+rear+" 466 L 1040 500 L 154 500 Z",
  hatch:"M "+nose+" 476 C "+(nose+12)+" 420 "+(nose+66)+" 388 220 374 L 396 354 C 462 286 "+(522+shift)+" "+(238-roof)+" "+(620+shift)+" "+(230-roof)+" L "+(858+shift*.25)+" "+(242-roof+slope)+" L 1014 "+(370+slope*.3)+" C 1050 394 1070 420 "+rear+" 468 L 1038 500 L 154 500 Z",
  wagon:"M "+nose+" 476 C "+(nose+12)+" 420 "+(nose+64)+" 390 220 374 L 396 354 C 462 286 "+(520+shift)+" "+(240-roof)+" "+(612+shift)+" "+(232-roof)+" L 918 "+(236-roof+slope*.25)+" L 1038 374 C 1065 396 1074 424 "+rear+" 468 L 1038 500 L 154 500 Z",
  suv:"M "+nose+" 482 C "+(nose+8)+" 416 "+(nose+62)+" 374 220 360 L 394 342 C 450 266 "+(518+shift)+" "+(202-roof)+" "+(620+shift)+" "+(194-roof)+" L 916 "+(204-roof+slope*.2)+" L 1040 354 C 1064 384 1074 420 "+rear+" 474 L 1038 510 L 154 510 Z",
  pickup:"M "+nose+" 482 C "+(nose+8)+" 420 "+(nose+60)+" 382 216 366 L 398 348 C 460 282 "+(520+shift)+" "+(222-roof)+" "+(610+shift)+" "+(214-roof)+" L "+(724+shift*.35)+" "+(222-roof+slope*.2)+" L 748 370 L 1030 372 L 1074 456 L 1040 506 L 154 506 Z",
  convertible:"M "+nose+" 476 C "+(nose+14)+" 420 "+(nose+68)+" 388 226 374 L 414 350 C 488 300 "+(558+shift)+" "+(282-roof*.25)+" "+(636+shift)+" "+(282-roof*.25)+" L 812 "+(354+slope*.2)+" L 1030 380 C 1060 390 1074 416 "+rear+" 466 L 1040 500 L 154 500 Z",
  van:"M "+nose+" 486 C "+(nose+8)+" 430 "+(nose+52)+" 392 210 376 L 318 358 L 430 220 L 912 "+(210-roof*.3)+" L 1034 350 C 1064 382 1074 420 "+rear+" 478 L 1040 510 L 154 510 Z",
  minivan:"M "+nose+" 486 C "+(nose+8)+" 430 "+(nose+54)+" 394 210 378 L 338 356 C 398 286 470 "+(230-roof*.5)+" 580 "+(218-roof*.5)+" L 900 "+(226-roof*.45+slope*.2)+" L 1034 356 C 1064 384 1074 422 "+rear+" 478 L 1040 510 L 154 510 Z"
 };
 return map[body]||map.sedan;
}
function vehicleWindows(body,t){
 const shift=(t.cabin-50)*1.15,roof=t.roof,slope=(t.slope-50)*.75,green=(t.green-50)*.8;
 if(body==="pickup")return "<path d='M 420 344 C 474 282 "+(520+shift)+" "+(240-roof)+" "+(590+shift)+" "+(232-roof)+" L "+(700+shift*.35)+" "+(238-roof+slope*.18)+" L 718 350 Z' fill='url(#glass)'/>";
 if(body==="convertible")return "<path d='M 482 344 C 526 306 "+(564+shift)+" "+(292-roof*.22)+" "+(626+shift)+" "+(292-roof*.22)+" L 720 344 Z' fill='url(#glass)'/>";
 const rear=body==="wagon"||body==="suv"||body==="van"||body==="minivan"?900:820;
 const top=body==="suv"||body==="van"?222:250;
 return "<path d='M 414 346 C 468 290 "+(516+shift)+" "+(top-roof-green)+" "+(604+shift)+" "+(top-10-roof-green)+" L "+rear+" "+(top+6-roof-green+slope*.28)+" L "+(rear+22)+" 346 Z' fill='url(#glass)'/>";
}
function wheel(x,y,r=94,style="alloy",rimRatio=.56){
 const rim=Math.max(r*.40,Math.min(r*.72,r*rimRatio)),steel=style==="steel";
 const center="<circle r='"+rim+"' fill='url(#rim)'/><circle r='"+(rim*.34)+"' fill='#8f9aa2'/><circle r='"+(rim*.14)+"' fill='#27323a'/>";
 const spokes=steel
  ?"<circle r='"+(rim*.72)+"' fill='#57636a' stroke='#9aa4aa' stroke-width='5'/>"+Array.from({length:8},(_,i)=>"<circle cx='0' cy='"+(-rim*.48)+"' r='"+(rim*.08)+"' fill='#1d252a' transform='rotate("+(i*45)+")'/>").join("")
  :Array.from({length:style==="sport"?10:6},(_,i)=>"<rect x='-6' y='"+(-rim*.90)+"' width='12' height='"+(rim*.68)+"' rx='5' fill='"+(style==="sport"?"#d6dde0":"#c1c9ce")+"' transform='rotate("+(i*(style==="sport"?36:60))+")'/>").join("");
 return "<g transform='translate("+x+" "+y+")'><circle r='"+r+"' fill='#06080a'/><circle r='"+(r*.88)+"' fill='url(#tire)'/>"+center+spokes+"</g>";
}
function vehicleSVG(d={},stats={},identity={}){
 const body=normBody(d.body||stats.body),year=Math.round(Number(identity.modelYear||d.modelYear||1970)),era=yearEra(year),paint=hex(d.paintColor||"#46584a"),t={
  nose:clamp(d.noseLength??50,0,100),roof:(clamp(d.roofHeight??50,0,100)-50)*.95,slope:clamp(d.roofSlope??50,0,100),cabin:clamp(d.cabinPosition??50,0,100),green:clamp(d.greenhouse??50,0,100)
 };
 const ride=clamp(d.rideHeight??165,70,380),wheelSize=clamp(d.wheel??17,10,28),tireWidth=clamp(d.tireWidth??205,135,420),tireProfile=clamp(d.tireProfile??55,20,95),wr=86+(tireWidth-185)*.06+(tireProfile-55)*.24+(body==="suv"||body==="pickup"?8:0),wy=500-(ride-165)*.09,front=322,rear=884,rimRatio=clamp(.45+(wheelSize-13)*.022,.44,.72),wheelStyle=String(d.wheelMaterial||"alloy");
 const lamp=String(d.headlightStyle||"period"),round=lamp==="round"||lamp==="quad"||(lamp==="period"&&year<1975),quad=lamp==="quad",grille=String(d.grilleStyle||"standard"),grilleW=grille==="wide"?230:grille==="narrow"?110:168;
 const target=String(d.target||stats.className||"").toLowerCase(),fascia=String(d.fasciaStyle||"balanced"),lux=target.includes("lux")||target.includes("premium"),sport=fascia==="sport"||/sport|track|performance|gt|muscle/.test(target),offroad=/off-road|offroad/.test(target),utility=body==="suv"||body==="pickup"||body==="van"||body==="minivan";
 const chrome=year<1980||lux,bumper=year<1985?"#9ea9af":"#222b31";
 const name=esc(identity.name||d.name||"NEW MODEL"),sub=esc(era.toUpperCase()+" • "+body.toUpperCase()+" • "+(stats.hp?Math.round(stats.hp)+" HP":"DESIGN PREVIEW"));
 const headLights=quad
  ? [230,270].map(x=>"<circle cx='"+x+"' cy='413' r='18' fill='url(#lamp)' stroke='#e9efe9' stroke-width='3'/>").join("")
  : round?"<circle cx='250' cy='414' r='27' fill='url(#lamp)' stroke='#e9efe9' stroke-width='3'/>"
  : "<rect x='210' y='394' width='84' height='38' rx='8' fill='url(#lamp)' stroke='#dfe8e7' stroke-width='3'/>";
 const lower=sport?"<path d='M 184 455 Q 282 426 386 451 L 358 476 Q 272 464 194 483 Z' fill='#10161b' stroke='#40515d'/>":"";
 const rails=(utility||lux)?"<path d='M 486 217 L 828 217' stroke='"+(lux?"#aeb9bf":"#73818a")+"' stroke-width='"+(lux?4:7)+"' stroke-linecap='round' opacity='.72'/>":"";
 const spoiler=(sport||String(d.rearAero||"none")!=="none")?"<g><rect x='886' y='326' width='126' height='12' rx='5' fill='#20282d'/><rect x='908' y='334' width='10' height='34' fill='#20282d'/><rect x='982' y='334' width='10' height='34' fill='#20282d'/></g>":"";
 const cladding=offroad?"<path d='M 180 468 C 430 496 760 496 1046 460' fill='none' stroke='#1d2428' stroke-width='26' opacity='.95'/><path d='M 165 450 L 188 414 L 318 391 M 1040 442 L 1010 397 L 924 380' fill='none' stroke='#1d2428' stroke-width='14'/>":"";
 const skid=offroad?"<path d='M 160 473 L 332 452 L 310 493 L 176 506 Z' fill='#7e878c' stroke='#b0b7ba' stroke-width='4'/>":"";
 const bed=body==="pickup"?"<path d='M 750 367 L 1030 369 L 1008 414 L 760 414 Z' fill='"+shade(paint,-.08)+"' stroke='"+shade(paint,-.25)+"' stroke-width='4'/>":"";
 const chromeStrip=chrome?"<path d='M 216 435 C 420 455 704 448 1020 423' fill='none' stroke='#c4ccd0' stroke-width='5' opacity='.65'/>":"";
 const doorSeams=body!=="pickup"?"<path d='M 560 351 L 548 480 M 756 350 L 770 480' stroke='"+shade(paint,-.24)+"' stroke-width='3' opacity='.72'/>":"<path d='M 566 347 L 558 482' stroke='"+shade(paint,-.24)+"' stroke-width='3' opacity='.72'/>";
 const arch=vehicleBodyPath(body,t),fender=Math.max(0,clamp(d.fenderFlare??20,0,70)-20)/50;
 return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 720' role='img' aria-label='"+name+"'>"+
 "<defs><linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop stop-color='#0d1a25'/><stop offset='1' stop-color='#04080c'/></linearGradient>"+
 "<linearGradient id='body' x1='0' y1='0' x2='0.85' y2='1'><stop stop-color='"+shade(paint,.32)+"'/><stop offset='.38' stop-color='"+shade(paint,.08)+"'/><stop offset='.72' stop-color='"+paint+"'/><stop offset='1' stop-color='"+shade(paint,-.26)+"'/></linearGradient>"+
 "<linearGradient id='glass' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#8fc9e2' stop-opacity='.72'/><stop offset='.22' stop-color='#31576a' stop-opacity='.92'/><stop offset='1' stop-color='#0d1c26' stop-opacity='.98'/></linearGradient>"+
 "<radialGradient id='rim'><stop stop-color='#e4e8ea'/><stop offset='.42' stop-color='#89949b'/><stop offset='1' stop-color='#323c43'/></radialGradient>"+
 "<radialGradient id='tire'><stop stop-color='#22272a'/><stop offset='.72' stop-color='#111416'/><stop offset='1' stop-color='#020303'/></radialGradient>"+
 "<radialGradient id='lamp'><stop stop-color='#fffde9'/><stop offset='.55' stop-color='#e4e3bd'/><stop offset='1' stop-color='#9b986e'/></radialGradient>"+
 "<filter id='shadow' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='18'/></filter></defs>"+
 "<rect width='1200' height='720' rx='28' fill='url(#bg)'/><ellipse cx='610' cy='548' rx='480' ry='58' fill='#000' opacity='.55' filter='url(#shadow)'/>"+
 "<g transform='skewX(-2)'><path d='"+arch+"' fill='url(#body)' stroke='"+shade(paint,-.30)+"' stroke-width='5'/>"+bed+vehicleWindows(body,t)+rails+
 "<path d='M 174 385 C 356 340 704 338 1034 389' fill='none' stroke='"+shade(paint,.48)+"' stroke-width='8' opacity='.35'/>"+
 "<path d='M 190 474 C 428 492 760 492 1040 461' fill='none' stroke='"+shade(paint,-.36)+"' stroke-width='12' opacity='.46'/>"+
 doorSeams+chromeStrip+cladding+spoiler+skid+
 "<path d='M 160 455 L 170 421 Q 184 394 214 387 L 306 374 L 306 470 Z' fill='"+shade(paint,-.12)+"' opacity='.78'/>"+
 headLights+
 "<rect x='"+(315-grilleW/2)+"' y='413' width='"+grilleW+"' height='"+(fascia==="slim"?36:fascia==="sport"?74:54)+"' rx='12' fill='#131b20' stroke='#78858d' stroke-width='4'/>"+
 Array.from({length:7},(_,i)=>"<line x1='"+(330-grilleW/2+i*grilleW/7)+"' y1='420' x2='"+(330-grilleW/2+i*grilleW/7)+"' y2='"+(fascia==="sport"?474:460)+"' stroke='#64737b' stroke-width='4'/>").join("")+
 lower+
 "<path d='M 1000 398 L 1054 407 L 1058 444 L 1004 440 Z' fill='#8e2628' stroke='#d45a5d' stroke-width='3'/>"+
 "<rect x='164' y='470' width='155' height='18' rx='8' fill='"+bumper+"'/><rect x='922' y='468' width='142' height='18' rx='8' fill='"+bumper+"'/>"+
 "<path d='M 318 372 Q 334 "+(wy-74)+" 380 "+(wy-82)+"' fill='none' stroke='"+shade(paint,.18)+"' stroke-width='"+(9+fender*10)+"' opacity='.72'/>"+
 "<path d='M 842 "+(wy-82)+" Q 886 "+(wy-88)+" 920 386' fill='none' stroke='"+shade(paint,.18)+"' stroke-width='"+(9+fender*10)+"' opacity='.72'/>"+
 wheel(front,wy,wr,sport?"sport":wheelStyle,rimRatio)+wheel(rear,wy,wr,sport?"sport":wheelStyle,rimRatio)+"</g>"+
 "<text x='54' y='66' fill='#f4f8fb' font-family='system-ui,-apple-system,sans-serif' font-size='31' font-weight='800'>"+name+"</text>"+
 "<text x='56' y='99' fill='#7ea2bc' font-family='system-ui,-apple-system,sans-serif' font-size='17' font-weight='700' letter-spacing='2'>"+sub+"</text>"+
 "<text x='1142' y='66' text-anchor='end' fill='#5fc9ff' font-family='system-ui,-apple-system,sans-serif' font-size='15' font-weight='800' letter-spacing='2'>MOTOR DYNASTY RENDER</text></svg>";
}
function pulley(x,y,r){return "<g><circle cx='"+x+"' cy='"+y+"' r='"+r+"' fill='#1b2328' stroke='#75838c' stroke-width='8'/><circle cx='"+x+"' cy='"+y+"' r='"+(r*.38)+"' fill='#828f97'/></g>";}
function engineSVG(d={},stats={}){
 const cfg=String(d.config||"I4").toUpperCase(),cyl=Number((cfg.match(/\d+/)||[4])[0]),disp=Number(stats.disp||0),hp=Math.round(Number(stats.hp||0)),fuel=String(d.fuel||"carb").toLowerCase(),asp=String(d.aspiration||"na").toLowerCase(),year=Number(d.modelYear||d.year||1970),diesel=fuel.includes("diesel")||d.diesel===true,electric=cfg.includes("EV")||d.electric===true,hybrid=d.hybrid===true,rotary=cfg.includes("ROT")||cfg.includes("WANKEL")||d.rotary===true,flat=cfg.startsWith("F")||cfg.includes("BOX"),vr=cfg.startsWith("VR"),v=cfg.startsWith("V")&&!vr,w=cfg.startsWith("W"),inline=!electric&&!rotary&&!flat&&!vr&&!v&&!w;
 const metal=year<1970?"#6c7377":"#4c5961",cover=d.block==="aluminum"?"#87959d":"#53616a",accent=asp==="turbo"?"#355c7a":asp==="supercharged"?"#694c3f":diesel?"#475646":"#63383b";
 let core="";
 if(electric){
  core="<g><rect x='365' y='242' width='470' height='250' rx='70' fill='url(#metal)' stroke='#8fa0aa' stroke-width='8'/><circle cx='475' cy='367' r='112' fill='#26363f' stroke='#9baab2' stroke-width='14'/><circle cx='475' cy='367' r='56' fill='#627983'/><rect x='640' y='280' width='160' height='170' rx='24' fill='#2f444f' stroke='#72909d' stroke-width='6'/><path d='M 585 310 C 660 188 810 202 866 288' fill='none' stroke='#e97824' stroke-width='18'/><path d='M 586 420 C 680 538 826 520 874 430' fill='none' stroke='#e97824' stroke-width='18'/></g>";
 } else if(rotary){
  const n=Math.max(1,Math.min(4,Math.round(cyl/2)||2));core="<g>"+Array.from({length:n},(_,i)=>"<g transform='translate("+(385+i*145)+" 330)'><rect x='-72' y='-92' width='144' height='184' rx='42' fill='url(#metal)' stroke='#a5b0b6' stroke-width='7'/><path d='M 0 -48 L 48 35 L -48 35 Z' fill='#2b373d' stroke='#75858d' stroke-width='6'/><circle r='18' fill='#a5b0b6'/></g>").join("")+"</g>";
 } else if(flat){
  const bank=Math.max(250,220+(cyl/2)*34),left=400-bank,right=800;
  core="<g><rect x='430' y='318' width='340' height='120' rx='28' fill='url(#metal)' stroke='#89969e' stroke-width='7'/><g transform='rotate(-5 430 378)'><rect x='"+left+"' y='294' width='"+bank+"' height='168' rx='30' fill='url(#cover)' stroke='#8b989f' stroke-width='7'/></g><g transform='rotate(5 770 378)'><rect x='"+right+"' y='294' width='"+bank+"' height='168' rx='30' fill='url(#cover)' stroke='#8b989f' stroke-width='7'/></g></g>";
 } else if(vr){
  const width=360+Math.max(0,cyl-5)*34;core="<g><rect x='"+(600-width/2)+"' y='318' width='"+width+"' height='168' rx='30' fill='url(#metal)' stroke='#89979f' stroke-width='8'/><g transform='rotate(-7 600 300)'><rect x='"+(600-width/2+26)+"' y='205' width='"+(width-52)+"' height='132' rx='28' fill='url(#cover)' stroke='#9ba6ac' stroke-width='8'/></g><path d='M 452 344 L 750 318' stroke='#a8b4ba' stroke-width='7' opacity='.45'/></g>";
 } else if(v||w){
  const perBank=Math.max(2,Math.ceil(cyl/(w?4:2))),bankLen=220+perBank*26,spread=w?150:112;
  core="<g><rect x='425' y='330' width='350' height='150' rx='25' fill='url(#metal)' stroke='#84939b' stroke-width='7'/><g transform='rotate(-"+(w?26:18)+" 470 330)'><rect x='"+(500-bankLen)+"' y='190' width='"+bankLen+"' height='190' rx='28' fill='url(#cover)' stroke='#95a0a6' stroke-width='8'/></g><g transform='rotate("+(w?26:18)+" 730 330)'><rect x='700' y='190' width='"+bankLen+"' height='190' rx='28' fill='url(#cover)' stroke='#95a0a6' stroke-width='8'/></g>"+(w?"<rect x='500' y='184' width='200' height='182' rx='22' fill='"+shade(cover,.08)+"' stroke='#9aa6ad' stroke-width='7'/>":"")+"</g>";
 } else if(inline){
  const width=300+Math.min(6,cyl)*58;core="<g><rect x='"+(600-width/2)+"' y='305' width='"+width+"' height='180' rx='30' fill='url(#metal)' stroke='#89979f' stroke-width='8'/><rect x='"+(600-width/2+24)+"' y='205' width='"+(width-48)+"' height='138' rx='30' fill='url(#cover)' stroke='#9ba6ac' stroke-width='8'/></g>";
 }
 const runnerCount=Math.min(12,Math.max(3,cyl)),runnerSpan=runnerCount>1?390/(runnerCount-1):0,intakes=Array.from({length:runnerCount},(_,i)=>"<path d='M "+(405+i*runnerSpan)+" 238 C "+(405+i*runnerSpan)+" 170 "+(450+i*runnerSpan*.72)+" 150 "+(500+i*runnerSpan*.48)+" 185' fill='none' stroke='#737f85' stroke-width='"+(runnerCount>8?13:18)+"' stroke-linecap='round'/>").join("");
 const turbos=asp==="turbo"?"<g><circle cx='918' cy='312' r='70' fill='#62594f' stroke='#b4a28e' stroke-width='10'/><circle cx='918' cy='312' r='28' fill='#c0ad96'/><path d='M 860 352 C 804 420 804 468 706 486' fill='none' stroke='#786a5c' stroke-width='24'/></g>"+(cyl>=8?"<g><circle cx='282' cy='312' r='64' fill='#62594f' stroke='#b4a28e' stroke-width='10'/><circle cx='282' cy='312' r='25' fill='#c0ad96'/></g>":""):"";
 const supercharger=asp==="supercharged"?"<g><rect x='480' y='130' width='240' height='106' rx='24' fill='#38454d' stroke='#a1adb3' stroke-width='7'/><path d='M 510 154 H 690 M 510 180 H 690 M 510 206 H 690' stroke='#8b989f' stroke-width='10'/></g>":"";
 const carb=fuel==="carb"?"<g><circle cx='600' cy='172' r='58' fill='#323b40' stroke='#8c989e' stroke-width='8'/><circle cx='600' cy='172' r='31' fill='#151b1f'/></g>":"";
 const injection=fuel!=="carb"&&!electric?"<path d='M 408 240 H 792' stroke='"+(diesel?"#7a8a68":"#8d5960")+"' stroke-width='12'/><g fill='#aab5ba'>"+Array.from({length:Math.min(cyl,8)},(_,i)=>"<rect x='"+(430+i*(340/Math.max(1,Math.min(cyl,8)-1)) )+"' y='232' width='10' height='36' rx='4'/>").join("")+"</g>":"";
 const label=electric?"EV DRIVE UNIT":rotary?"ROTARY "+cfg:vr?"NARROW-ANGLE "+cfg:(flat?"BOXER ":"")+cfg+(diesel?" DIESEL":"");
 return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 720' role='img' aria-label='"+esc(label)+"'><defs>"+
 "<linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop stop-color='#0a1722'/><stop offset='1' stop-color='#03070a'/></linearGradient>"+
 "<linearGradient id='metal' x1='0' y1='0' x2='1' y2='1'><stop stop-color='"+shade(metal,.38)+"'/><stop offset='.35' stop-color='"+metal+"'/><stop offset='1' stop-color='"+shade(metal,-.34)+"'/></linearGradient>"+
 "<linearGradient id='cover' x1='0' y1='0' x2='1' y2='1'><stop stop-color='"+shade(cover,.32)+"'/><stop offset='.5' stop-color='"+cover+"'/><stop offset='1' stop-color='"+shade(cover,-.30)+"'/></linearGradient>"+
 "<filter id='shadow'><feGaussianBlur stdDeviation='20'/></filter></defs><rect width='1200' height='720' rx='28' fill='url(#bg)'/><ellipse cx='602' cy='538' rx='410' ry='58' fill='#000' opacity='.6' filter='url(#shadow)'/>"+
 "<g>"+core+(!electric?intakes:"")+turbos+supercharger+carb+injection+(hybrid?"<g><circle cx='860' cy='448' r='68' fill='#263943' stroke='#8ca2ad' stroke-width='8'/><path d='M 826 412 C 886 336 974 346 1016 414' fill='none' stroke='#e97824' stroke-width='14'/></g>":"")+pulley(470,486,52)+pulley(596,502,42)+pulley(714,486,52)+
 "<path d='M 420 492 C 500 540 692 548 785 492' fill='none' stroke='#222b30' stroke-width='18'/>"+
 "<rect x='365' y='470' width='470' height='56' rx='24' fill='#20292e' stroke='#69777f' stroke-width='6'/></g>"+
 "<text x='54' y='66' fill='#f4f8fb' font-family='system-ui,-apple-system,sans-serif' font-size='31' font-weight='800'>"+esc(label)+"</text>"+
 "<text x='56' y='100' fill='#79a4bf' font-family='system-ui,-apple-system,sans-serif' font-size='17' font-weight='700' letter-spacing='2'>"+(disp?disp.toFixed(2)+" L • ":"")+(hp?hp+" HP • ":"")+esc((asp==="na"?"NATURALLY ASPIRATED":asp.toUpperCase()))+"</text>"+
 "<text x='1142' y='66' text-anchor='end' fill='#5fc9ff' font-family='system-ui,-apple-system,sans-serif' font-size='15' font-weight='800' letter-spacing='2'>POWERTRAIN RENDER</text></svg>";
}
function turboAdd(asp){return asp==="turbo"?"<g><circle cx='918' cy='312' r='70' fill='#62594f' stroke='#b4a28e' stroke-width='10'/><circle cx='918' cy='312' r='28' fill='#c0ad96'/><path d='M 860 352 C 804 420 804 468 706 486' fill='none' stroke='#786a5c' stroke-width='24'/></g>":"";}
const vehicleSrcCache=new Map(),engineSrcCache=new Map();
function cacheSource(cache,key,build,limit){
 if(cache.has(key))return cache.get(key);
 const value=build();cache.set(key,value);
 if(cache.size>limit){const first=cache.keys().next().value;cache.delete(first);}
 return value;
}
function renderSignature(...parts){try{return JSON.stringify(parts);}catch{return String(parts.map(x=>x?.id||x?.name||x?.body||x?.config||"").join("|"));}}
function vehicleSrc(design,stats,identity){const key=renderSignature(design||{},stats||{},identity||{});return cacheSource(vehicleSrcCache,key,()=>data(vehicleSVG(design,stats,identity)),96);}
function engineSrc(design,stats){const key=renderSignature(design||{},stats||{});return cacheSource(engineSrcCache,key,()=>data(engineSVG(design,stats)),48);}
function renderVehicle(img,design,stats,identity){if(!img)return null;const src=vehicleSrc(design,stats,identity);if(img.src!==src)img.src=src;img.alt=(identity?.name||design?.name||"Vehicle")+" rendered preview";return img;}
function renderEngine(img,design,stats){if(!img)return null;const src=engineSrc(design,stats);if(img.src!==src)img.src=src;img.alt=(design?.name||design?.config||"Engine")+" rendered preview";return img;}
function renderVehicleEntry(img,v){const evo=v?.designEvolution||{};return renderVehicle(img,v?.design||v||{},v?.stats||{},{name:v?.name||"Vehicle",generation:Number(v?.generation||evo.generationTheme||1),modelYear:Number(v?.modelYear||evo.lastStyleYear||1970)});}
window.MDXRenderLibrary={vehicleSVG,engineSVG,vehicleSrc,engineSrc,renderVehicle,renderEngine,renderVehicleEntry};
})();