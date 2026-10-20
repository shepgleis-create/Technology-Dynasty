/* Operating-unit valuation based on productive activity, not the parent's share price.
   Corporate units without an active manufacturer mirror use independently measured
   factories, workforce, dealers, sales and debt, preventing recursive group valuations. */
(()=>{
"use strict";
const G=typeof window!=="undefined"?window:globalThis;
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const hash=(v)=>{let h=2166136261;for(const c of String(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)/4294967295;};
function evaluate(unit,context={}){
 const year=n(context.year,1970),month=n(context.month),era=clamp(Math.pow(1.032,year-1970),.18,16),
   employees=Math.max(0,n(unit.employees)),factories=Math.max(0,n(unit.factories)),
   dealers=Math.max(0,n(unit.dealers)),debt=Math.max(0,n(unit.debt)),
   cash=n(unit.cash),reputation=clamp(n(context.parentReputation,55),0,100),
   confidence=clamp(n(context.confidence,1),.65,1.35),
   management=clamp(.88+reputation/500,.88,1.08);
 const seasonal=.92+hash(unit.id+"|unit-demand|"+year+"-"+month)*.16;
 const active= !["discontinued","liquidated","bankrupt","merged_into_parent"].includes(String(unit.status||"active"));
 const vehicleCapacity=Math.min(factories*900,employees/3.5,dealers*24);
 // Product revenue is bounded by output and retail throughput, not the value
 // an investor assigns to the parent or subsidiary.
 const units=active&&unit.operatingMarque===true?Math.max(0,Math.floor(vehicleCapacity*confidence*seasonal*management)):0;
 const vehicleRevenue=units*4200*era*(.80+clamp(n(unit.rd,50),0,100)/250);
 const serviceCapacity=unit.operatingMarque!==true?employees*1550*era*(.8+Math.min(1,factories)/5):0;
 const monthlyRevenue=active?vehicleRevenue+serviceCapacity*confidence*seasonal:0;
 const labor=active?employees*740*era:0;
 const plant=active?factories*52000*era:0;
 const retail=active?dealers*180*era:0;
 const variableCost=vehicleRevenue*.51+serviceCapacity*.38;
 const interest=debt*clamp(n(context.annualInterestRate,6.5),1.5,25)/1200;
 const monthProfit=monthlyRevenue-variableCost-labor-plant-retail-interest;
 const factoryAssets=factories*9000000*era;
 const equipmentAssets=employees*1900*era;
 const dealerAssets=dealers*4000*era;
 const techAssets=Math.max(0,n(unit.researchAssets));
 const assets=factoryAssets+equipmentAssets+dealerAssets+techAssets;
 const annualProfit=monthProfit*12,annualRevenue=monthlyRevenue*12;
 const earningsValue=Math.max(0,annualProfit)*6.4;
 const revenueValue=annualRevenue*.36;
 const operatingValue=Math.max(assets*.65,earningsValue*.55+revenueValue*.45);
 const equityTarget=Math.max(250000*era,operatingValue+cash-debt);
 const previous=Math.max(250000*era,n(unit.valuation,250000*era));
 const valuation=previous+(equityTarget-previous)*.12;
 return {year,month,units,monthlyRevenue,monthProfit,monthlyMove:(valuation-previous)/previous,valuation,drivers:{
  vehicleCapacity,units,vehicleRevenue,serviceCapacity,variableCost,labor,plant,retail,interest,
  factoryAssets,equipmentAssets,dealerAssets,techAssets,assets,annualProfit,annualRevenue,
  earningsValue,revenueValue,operatingValue,cash,debt,equityTarget,previous
 }};
}
G.MDXCorporateUnitFundamentals={evaluate};
})();
