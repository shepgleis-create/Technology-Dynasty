"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
global.window=global;
require("../design-dynamics.js");
global.MDXGame={getState:()=>({year:1970,month:0,day:1,cash:1000000,vehicleDraft:{body:"sedan",wheelbase:2700,trackWidth:1480,roofHeight:50,roofSlope:50,paintColor:"#697e90"}})};
require("../design-dynamics-ui.js");
const D=global.MDXDesignDynamics,U=global.MDXDesignDynamicsUI;
const clean=str=>str.replace(/aria-label="[^"]*"/g,'aria-label=""').replace(/<text[^>]*>[^<]*<\/text>/g,"").replace(/\s+/g," ");
const keys=["grille","headlight","taillight","bumper","hood","roofline","arches","windows","paint","wheels","wheelSize","tires","brakes","attachments","drag","downforce","distribution","rigidity","crash","frontSusp","rearSusp","springs","dampers","antiRoll","steering","rideHeight","durability","wheelbase","dimensions","suv","pickup","van","coupe"];
for(const key of keys)test(key+" has real geometry or styling change, not just a changing numeric label",()=>{
 const t=D.BY_KEY[key];assert.ok(t,key);const a=clean(U.renderPreviewSVG(MDXGame.getState(),t,t.min)),b=clean(U.renderPreviewSVG(MDXGame.getState(),t,t.max));assert.notEqual(a,b,key+" should redraw the visual when adjusted");
 assert.match(a,/<svg/);assert.match(b,/<\/svg>/);assert.ok(a.length>1100);
});
test("visible engineering preview reflects current body and wheel dimensions",()=>{
 const a=U.renderPreviewSVG(MDXGame.getState(),D.BY_KEY.roofline,40);
 assert.match(a,/WHEELBASE 2700 MM/);
 assert.match(a,/Live sedan silhouette/);
});
test("generated visualization keeps paint attribute safely escaped",()=>{
 global.MDXGame.getState=()=>({year:1970,month:0,day:1,cash:1000,vehicleDraft:{body:"sedan",paintColor:'\" onload=\"alert(1)'}});
 const svg=U.renderPreviewSVG(MDXGame.getState(),D.BY_KEY.paint,60);
 assert.doesNotMatch(svg,/onload="/);assert.ok(!svg.includes("<script"));
});
