(() => {
"use strict";
const CORE=window.MDX_CORE||{},DATA=window.MDX_DATA||{},REGIONS=Array.isArray(DATA.REGIONS)?DATA.REGIONS:[],clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0)),num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function period(s){return num(s?.year,1970)*12+num(s?.month);}
function rnd(s,k){return CORE.random?CORE.random(s,"economy-regional:"+k):.5;}
function drift(v,target,speed,noise,s,k,min,max){return clamp(num(v,target)+(target-num(v,target))*speed+(rnd(s,k)-.5)*noise,min,max);}
function regionBias(def){
 const id=String(def?.id||""),reg=String(def?.reg||"us");let growth=0,inflation=0,unemployment=0,rate=0,fuel=1,confidence=0,currency="usd";
 if(reg==="eu"){growth=-.003;inflation=.001;unemployment=.010;rate=-.4;fuel=1.60;confidence=-2;currency="eur";}
 else if(reg==="jp"){growth=-.002;inflation=-.004;unemployment=-.017;rate=-1.4;fuel=1.42;confidence=1;currency="jpy";}
 else if(reg==="uk"){growth=-.002;inflation=.002;unemployment=.001;rate=-.1;fuel=1.52;currency="gbp";}
 else if(id==="canada"){growth=.001;unemployment=.004;rate=-.1;fuel=1.12;}
 else if(id==="mexico"){growth=.004;inflation=.010;unemployment=-.003;rate=1.3;fuel=.84;confidence=-3;}
 if(id.includes("us_south"))growth+=.002;if(id.includes("us_ne"))fuel*=1.06;if(id.includes("us_west"))fuel*=1.10;
 return{growth,inflation,unemployment,rate,fuel,confidence,currency};
}
function eraFuelBase(year){
 const y=num(year,1970);if(y<1980)return .38+Math.max(0,y-1973)*.035;if(y<1990)return .72;if(y<2000)return 1.05;if(y<2010)return 1.65;if(y<2020)return 2.55;if(y<2025)return 3.05;return 3.15*Math.pow(1.022,y-2025);
}
function ensure(state){
 if(!state||typeof state!=="object")return null;
 const w=state.worldEconomy=state.worldEconomy&&typeof state.worldEconomy==="object"?state.worldEconomy:{};
 w.fx=w.fx&&typeof w.fx==="object"?w.fx:{usd:1,eur:1,jpy:1,gbp:1,krw:1};for(const k of ["usd","eur","jpy","gbp","krw"])w.fx[k]=num(w.fx[k],1);
 w.commodities=w.commodities&&typeof w.commodities==="object"?w.commodities:{};
 Object.assign(w.commodities,{steel:num(w.steel,w.commodities.steel??1),aluminum:num(w.aluminum,w.commodities.aluminum??1),oil:num(w.oil,w.commodities.oil??1),shipping:num(w.shipping,w.commodities.shipping??1),petrochem:num(w.commodities.petrochem,w.oil||1),lithium:num(w.commodities.lithium,1),nickel:num(w.commodities.nickel,1)});
 w.trade=w.trade&&typeof w.trade==="object"?w.trade:{globalTariff:num(w.tariff),regional:{}};w.trade.globalTariff=clamp(num(w.tariff,w.trade.globalTariff),0,.45);w.trade.regional=w.trade.regional&&typeof w.trade.regional==="object"?w.trade.regional:{};
 w.regions=w.regions&&typeof w.regions==="object"?w.regions:{};
 for(const def of REGIONS){
  const b=regionBias(def),r=w.regions[def.id]||{},globalConfidence=num(w.consumerConfidence,67),globalGdp=num(w.gdpGrowth,.028),globalInflation=num(w.inflationRate,.055),globalUnemployment=num(w.unemploymentRate,.049);
  w.regions[def.id]={id:def.id,gdpGrowth:num(r.gdpGrowth,globalGdp+b.growth),inflationRate:num(r.inflationRate,globalInflation+b.inflation),unemploymentRate:num(r.unemploymentRate,globalUnemployment+b.unemployment),consumerConfidence:num(r.consumerConfidence,globalConfidence+b.confidence),interestModifier:num(r.interestModifier,b.rate),fuelPrice:num(r.fuelPrice,eraFuelBase(state.year)*b.fuel*(def.fuel||1)*num(w.oil,1)),incomeIndex:num(r.incomeIndex,def.income||1),creditAccess:num(r.creditAccess,.74),importFriction:num(r.importFriction,w.trade.globalTariff),currency:r.currency||b.currency};
  const t=w.trade.regional[def.id]||{};w.trade.regional[def.id]={tariff:clamp(num(t.tariff,w.trade.globalTariff),0,.55),quota:clamp(num(t.quota,1),.45,1),localContent:clamp(num(t.localContent,0),0,.75)};
 }
 w.regionalHistory=Array.isArray(w.regionalHistory)?w.regionalHistory:[];w.stabilityHistory=Array.isArray(w.stabilityHistory)?w.stabilityHistory:[];w.lastRegionalPeriod=Number.isFinite(Number(w.lastRegionalPeriod))?Number(w.lastRegionalPeriod):null;
 return w;
}
function syncCommodities(state){
 const w=ensure(state),c=w.commodities;c.steel=num(w.steel,c.steel);c.aluminum=num(w.aluminum,c.aluminum);c.oil=num(w.oil,c.oil);c.shipping=num(w.shipping,c.shipping);
 c.petrochem=drift(c.petrochem,.70+c.oil*.30,.14,.04,state,"petrochem",.45,2.8);
 c.lithium=drift(c.lithium,state.year<1995?.82:1,.08,.08,state,"lithium",.40,3.2);
 c.nickel=drift(c.nickel,1,.08,.07,state,"nickel",.45,2.8);
}
function processRegionalMonth(state){
 const w=ensure(state),p=period(state);if(w.lastRegionalPeriod===p)return regionalSnapshot(state);
 syncCommodities(state);const globalGdp=num(w.gdpGrowth,.028),globalInf=num(w.inflationRate,.055),globalUnemp=num(w.unemploymentRate,.049),globalConf=num(w.consumerConfidence,67),rate=num(w.benchmarkRate,7.2),creditTight=clamp(num(w.creditTightness,1),.5,1.8);
 for(const def of REGIONS){
  const b=regionBias(def),r=w.regions[def.id],id=def.id,t=w.trade.regional[id];
  r.gdpGrowth=drift(r.gdpGrowth,globalGdp+b.growth,.18,.006,state,"gdp:"+id,-.10,.12);
  r.inflationRate=drift(r.inflationRate,globalInf+b.inflation,.18,.004,state,"inflation:"+id,-.02,.22);
  r.unemploymentRate=drift(r.unemploymentRate,globalUnemp+b.unemployment,.16,.003,state,"jobs:"+id,.015,.24);
  r.consumerConfidence=drift(r.consumerConfidence,globalConf+b.confidence,.18,2.2,state,"confidence:"+id,20,105);
  r.interestModifier=drift(r.interestModifier,b.rate,.18,.10,state,"rate:"+id,-3,5);
  r.fuelPrice=drift(r.fuelPrice,eraFuelBase(state.year)*b.fuel*(def.fuel||1)*num(w.oil,1),.18,.035,state,"fuel:"+id,.15,14);
  r.incomeIndex=Math.max(.30,r.incomeIndex*(1+clamp((r.inflationRate*.42+r.gdpGrowth*.30)/12,-.008,.015)));
  t.tariff=drift(t.tariff,w.trade.globalTariff,.20,.008,state,"tariff:"+id,0,.55);t.quota=clamp(t.quota,.45,1);t.localContent=clamp(t.localContent,0,.75);
  r.importFriction=clamp(t.tariff+(1-t.quota)*.25+t.localContent*.08,0,.75);
  r.creditAccess=clamp(1-(creditTight-.75)*.46-(r.unemploymentRate-.05)*2.0+(r.consumerConfidence-67)*.004,.18,1.08);
 }
 w.lastRegionalPeriod=p;
 const snap={period:p,year:num(state.year),month:num(state.month),regions:Object.fromEntries(REGIONS.map(d=>{const r=w.regions[d.id];return[d.id,{gdpGrowth:r.gdpGrowth,inflationRate:r.inflationRate,unemploymentRate:r.unemploymentRate,consumerConfidence:r.consumerConfidence,fuelPrice:r.fuelPrice,creditAccess:r.creditAccess,importFriction:r.importFriction}];}))};
 w.regionalHistory.push(snap);if(w.regionalHistory.length>120)w.regionalHistory.splice(0,w.regionalHistory.length-120);
 const diag=stabilityDiagnostics(state);w.stabilityHistory.push(diag);if(w.stabilityHistory.length>240)w.stabilityHistory.splice(0,w.stabilityHistory.length-240);return snap;
}
function region(state,id){return ensure(state)?.regions?.[id]||null;}
function regionalSnapshot(state){const w=ensure(state);return{period:period(state),regions:w.regions};}
function demandMultiplier(state,id){
 const r=region(state,id);if(!r)return 1;const growth=clamp(1+(r.gdpGrowth-.025)*2.8,.72,1.25),confidence=clamp(.80+r.consumerConfidence/335,.84,1.16),jobs=clamp(1-(r.unemploymentRate-.055)*2.5,.72,1.12),credit=clamp(.80+r.creditAccess*.26,.84,1.08),event=window.MDXWorldEvents?.effects?.(state)?.demand||1;return growth*confidence*jobs*credit*event;
}
function financingMultiplier(state,id){
 const w=ensure(state),r=region(state,id),annualRate=num(w.benchmarkRate,7.2)+num(r?.interestModifier),credit=r?.creditAccess??.74,event=window.MDXWorldEvents?.effects?.(state)?.finance||1;return clamp((1-(annualRate-7)*.018+(credit-.74)*.12)*event,.52,1.24);
}
function materialMultiplier(state){
 const c=ensure(state).commodities,event=window.MDXWorldEvents?.effects?.(state)?.material||1;return clamp((num(c.steel,1)*.40+num(c.aluminum,1)*.17+num(c.petrochem,1)*.18+num(c.oil,1)*.08+num(c.shipping,1)*.07+.10)*event,.45,3.2);
}
function creditProfile(state){
 const w=ensure(state),cash=Math.max(0,num(state.cash)),debt=Math.max(0,num(state.debt)),value=Math.max(1,num(state.valuation,cash+1)),profit=num(state.lastProfit),leverage=debt/value,liquidity=cash/value,macroSpread=Math.max(0,(num(w.creditTightness,1)-1)*2.2);
 let tier="B",spread=4.5;if(leverage<.20&&liquidity>.08&&profit>0){tier="A";spread=1.8;}else if(leverage<.38&&profit>=0){tier="BBB";spread=2.7;}else if(leverage<.55&&liquidity>.025){tier="BB";spread=3.6;}else if(leverage>.75||cash<=0){tier="CCC";spread=8.2;}
 spread+=macroSpread;const annual=clamp(num(w.benchmarkRate,7.2)+spread,.5,28),monthly=annual/100/12,capacity=Math.max(0,value*clamp(.58-leverage,0,.58)*clamp(1-(num(w.creditTightness,1)-.75)*.35,.35,1));
 return{tier,spread,annualRate:annual,monthlyRate:monthly,leverage,liquidity,borrowingCapacity:capacity};
}
function tradeForRegion(state,id){const w=ensure(state);return w.trade.regional[id]||{tariff:w.trade.globalTariff,quota:1,localContent:0};}
function countryGroup(country){
 const c=String(country||"").toLowerCase();if(c.includes("united states")||c==="usa"||c==="us")return"us";if(c.includes("german")||c.includes("ital")||c.includes("france")||c.includes("sweden")||c.includes("europe"))return"eu";if(c.includes("japan"))return"jp";if(c.includes("kingdom")||c.includes("brit"))return"uk";if(c.includes("korea"))return"kr";return"other";
}
function currencyForCountry(country){const g=countryGroup(country);return g==="eu"?"eur":g==="jp"?"jpy":g==="uk"?"gbp":g==="kr"?"krw":"usd";}
function reportingCurrency(state){return state?.hq==="germany"||state?.hq==="italy"?"eur":state?.hq==="japan"?"jpy":state?.hq==="uk"?"gbp":state?.hq==="korea"?"krw":"usd";}
function reportingGroup(state){return state?.hq==="germany"||state?.hq==="italy"?"eu":state?.hq==="japan"?"jp":state?.hq==="uk"?"uk":state?.hq==="korea"?"kr":"us";}
function homeRegionId(state){return({usa:"us_south",japan:"japan",germany:"west_eu",italy:"west_eu",uk:"uk",korea:"japan"})[state?.hq]||"us_south";}
function fxRate(state,currency){const w=ensure(state),key=String(currency||"usd").toLowerCase();return Math.max(.05,num(w.fx?.[key],1));}
function fxMultiplier(state,fromCurrency,toCurrency=reportingCurrency(state)){return clamp(fxRate(state,fromCurrency)/fxRate(state,toCurrency),.25,4);}
function landedImportMultiplier(state,{sourceCountry="",currency=null,destinationRegion=null}={}){
 const sourceGroup=countryGroup(sourceCountry),destGroup=reportingGroup(state),sourceCurrency=currency||currencyForCountry(sourceCountry),fx=fxMultiplier(state,sourceCurrency),regionId=destinationRegion||homeRegionId(state),trade=tradeForRegion(state,regionId),tariff=sourceGroup!=="other"&&sourceGroup!==destGroup?clamp(num(trade.tariff),0,.55):0;
 return{fx,tariff,multiplier:fx*(1+tariff),sourceCurrency,reportingCurrency:reportingCurrency(state),destinationRegion:regionId};
}
function regulationCalendar(state,horizon=5){const y=num(state?.year,1970),rules=Array.isArray(DATA.REGULATIONS)?DATA.REGULATIONS:[];return rules.filter(r=>num(r.year)>=y&&num(r.year)<=y+horizon).map(r=>({...r,status:num(r.year)<=y?"active":"announced"}));}
function affordabilityIndex(state,id){
 const r=region(state,id),price=CORE.economicRelativeIndex?CORE.economicRelativeIndex("vehiclePrice",state.year,1970):1;return clamp(num(r?.incomeIndex,1)/Math.max(.2,price),.25,3);
}
function industrySnapshot(state){
 const w=ensure(state),home=REGIONS.find(x=>x.id===Object.keys(w.regions)[0])?.id,r=region(state,home),event=window.MDXWorldEvents?.effects?.(state)||{demand:1,finance:1,material:1,shipping:1,fuel:1,production:1,segments:{}};return{fuelPrice:num(w.fuelPrice,r?.fuelPrice||.5)*num(event.fuel,1),consumerConfidence:num(w.consumerConfidence,67),interestRate:num(w.benchmarkRate,7.2),benchmarkRate:num(w.benchmarkRate,7.2),gdpGrowth:num(w.gdpGrowth,.028),inflationRate:num(w.inflationRate,.055),unemploymentRate:num(w.unemploymentRate,.049),creditTightness:num(w.creditTightness,1),worldEventDemand:num(event.demand,1),worldEventFinance:num(event.finance,1),worldEventMaterial:num(event.material,1),worldEventProduction:num(event.production,1),segmentDemand:{...(event.segments||{})}};
}
function stabilityDiagnostics(state){
 const companies=(state?.industry||[]).filter(x=>!x.acquired&&!["liquidated","merged_into_parent"].includes(String(x.status||""))),active=companies.filter(x=>String(x.status)!=="bankrupt"),bankrupt=companies.length-active.length;
 const vals=active.map(x=>Math.max(0,num(x.valuation))).sort((a,b)=>b-a),totalVal=vals.reduce((a,b)=>a+b,0),top4=totalVal?vals.slice(0,4).reduce((a,b)=>a+b,0)/totalVal:0;
 const margins=active.map(x=>num(x.monthRevenue)>0?num(x.monthProfit)/num(x.monthRevenue):0).filter(Number.isFinite).sort((a,b)=>a-b),median=margins.length?margins[Math.floor(margins.length/2)]:0,debt=active.reduce((a,x)=>a+num(x.debt),0),value=active.reduce((a,x)=>a+Math.max(1,num(x.valuation)),0),utils=active.map(x=>num(x.factoryUtilization)).filter(x=>x>0),avgUtil=utils.length?utils.reduce((a,b)=>a+b,0)/utils.length:0,w=ensure(state),flags=[];
 if(top4>.78)flags.push("high_concentration");if(companies.length&&bankrupt/companies.length>.35)flags.push("bankruptcy_wave");if(num(w.inflationRate)>.12)flags.push("runaway_inflation");if(avgUtil>.96)flags.push("capacity_overheat");if(avgUtil>0&&avgUtil<.35)flags.push("industry_underutilization");
 return{period:period(state),activeCompanies:active.length,bankruptCompanies:bankrupt,top4Concentration:top4,medianMargin:median,debtToValue:value?debt/value:0,avgFactoryUtilization:avgUtil,flags};
}
function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);},a={year:1970,month:0,campaignId:"econ-deep",worldEconomy:{gdpGrowth:.028,inflationRate:.055,unemploymentRate:.049,consumerConfidence:67,benchmarkRate:7.2,creditTightness:1,steel:1,aluminum:1,oil:1,shipping:1,tariff:0,fx:{usd:1,eur:1,jpy:1,gbp:1}},industry:[],cash:1e7,debt:1e6,valuation:2e7},b=JSON.parse(JSON.stringify(a));
 processRegionalMonth(a);processRegionalMonth(b);check(JSON.stringify(a.worldEconomy.regions)===JSON.stringify(b.worldEconomy.regions),"regional economy replay mismatch");const before=JSON.stringify(a.worldEconomy.regions);processRegionalMonth(a);check(JSON.stringify(a.worldEconomy.regions)===before,"regional economy processed twice in one period");check(materialMultiplier(a)>.4,"material multiplier invalid");const baseCredit=creditProfile(a),tight=JSON.parse(JSON.stringify(a));tight.worldEconomy.benchmarkRate=12;tight.worldEconomy.creditTightness=1.45;const tightCredit=creditProfile(tight);check(baseCredit.monthlyRate>0,"credit rate invalid");check(tightCredit.annualRate>baseCredit.annualRate,"higher benchmark/credit tightness did not raise borrowing rate");check(tightCredit.borrowingCapacity<baseCredit.borrowingCapacity,"credit tightening did not reduce borrowing capacity");const highlyLevered=JSON.parse(JSON.stringify(a));highlyLevered.debt=highlyLevered.valuation*.70;check(creditProfile(highlyLevered).borrowingCapacity<baseCredit.borrowingCapacity,"higher leverage did not reduce additional borrowing capacity");check(!REGIONS.length||Number.isFinite(region(a,REGIONS[0].id)?.fuelPrice),"regional fuel price missing");a.hq="usa";a.worldEconomy.fx.eur=1.2;if(a.worldEconomy.trade?.regional?.us_south)a.worldEconomy.trade.regional.us_south.tariff=.10;const imported=landedImportMultiplier(a,{sourceCountry:"West Germany",currency:"eur",destinationRegion:"us_south"}),domestic=landedImportMultiplier(a,{sourceCountry:"United States",currency:"usd",destinationRegion:"us_south"});check(Math.abs(imported.fx-1.2)<.001&&Math.abs(imported.tariff-.10)<.001&&Math.abs(imported.multiplier-1.32)<.002,"FX/tariff landed import multiplier did not reconcile");check(Math.abs(domestic.multiplier-1)<.001,"domestic sourcing incorrectly received FX/tariff friction");const inferred=landedImportMultiplier(a,{sourceCountry:"West Germany",destinationRegion:"us_south"});check(Math.abs(inferred.fx-1.2)<.001&&Math.abs(inferred.multiplier-1.32)<.002,"inferred supplier currency did not affect landed import cost");check(reportingCurrency({...a,hq:"japan"})==="jpy"&&currencyForCountry("South Korea")==="krw","currency mapping failed");return{ok:failures.length===0,failures};
}
window.MDXEconomy={ensure,processRegionalMonth,region,regionalSnapshot,demandMultiplier,financingMultiplier,materialMultiplier,creditProfile,tradeForRegion,countryGroup,currencyForCountry,reportingCurrency,fxRate,fxMultiplier,landedImportMultiplier,regulationCalendar,affordabilityIndex,industrySnapshot,stabilityDiagnostics,runSelfTests};
})();