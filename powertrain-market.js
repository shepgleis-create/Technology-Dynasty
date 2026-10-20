(() => {
"use strict";

const CORE=window.MDX_CORE||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const period=s=>num(s?.year,1970)*12+num(s?.month,0);
const serialDay=s=>period(s)*30+Math.max(0,num(s?.day,1)-1);
const uid=(s,p)=>CORE.randomId?CORE.randomId(s,p,"powertrainMarket"):p+"_"+period(s)+"_"+Math.floor(hash((s?.campaignId||"")+p+period(s))*1e9);
const hash=str=>{let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return((h>>>0)%1000000)/1000000;};
const money=v=>{v=num(v);const neg=v<0,a=Math.abs(v),t=a>=1e9?"$"+(a/1e9).toFixed(2)+"B":a>=1e6?"$"+(a/1e6).toFixed(2)+"M":a>=1e3?"$"+(a/1e3).toFixed(1)+"K":"$"+Math.round(a).toLocaleString();return neg?"-"+t:t;};
const activeMaker=m=>m&&["active","restructuring"].includes(String(m.status||"active"))&&!m.acquired&&!m.playerSubsidiary;

function enrichJointProgram(p){
 if(!p||typeof p!=="object")return p;
 p.objective=p.objective||"balanced";
 p.scope=p.scope||"major_revision";
 p.ipModel=p.ipModel||"proportional";
 p.toolingResponsibility=p.toolingResponsibility||"shared";
 p.exclusivityMode=p.exclusivityMode||"shared_nonexclusive";
 p.permittedVariants=Array.isArray(p.permittedVariants)&&p.permittedVariants.length?p.permittedVariants:["base","efficiency","performance"];
 p.ownership=p.ownership&&typeof p.ownership==="object"?p.ownership:{player:num(p.playerSharePct,50),partner:100-num(p.playerSharePct,50)};
 p.capacityAllocation=p.capacityAllocation&&typeof p.capacityAllocation==="object"?p.capacityAllocation:{player:num(p.playerSharePct,50),partner:100-num(p.playerSharePct,50)};
 p.governance=p.governance||"joint_committee";
 p.programRisk=p.programRisk||({evolution:"LOW",major_revision:"MEDIUM",clean_sheet:"HIGH"}[p.scope]||"MEDIUM");
 p.variantRights=p.variantRights||"shared_all";
 return p;
}

function ensure(state){
 if(!state||typeof state!=="object")return state;
 const pm=state.powertrainMarket=state.powertrainMarket&&typeof state.powertrainMarket==="object"?state.powertrainMarket:{};
 pm.version=Math.max(1,num(pm.version,1));
 pm.deliveryReceipts=Array.isArray(pm.deliveryReceipts)?pm.deliveryReceipts:[];
 pm.deliveryReceiptKeys=pm.deliveryReceiptKeys&&typeof pm.deliveryReceiptKeys==="object"?pm.deliveryReceiptKeys:{};
 pm.licenseOffers=Array.isArray(pm.licenseOffers)?pm.licenseOffers:[];
 pm.licenses=Array.isArray(pm.licenses)?pm.licenses:[];
 pm.jointOffers=Array.isArray(pm.jointOffers)?pm.jointOffers:[];
 pm.jointPrograms=Array.isArray(pm.jointPrograms)?pm.jointPrograms:[];
 pm.cashLedger=Array.isArray(pm.cashLedger)?pm.cashLedger:[];
 pm.lastLicenseReviewPeriod=Number.isFinite(Number(pm.lastLicenseReviewPeriod))?Number(pm.lastLicenseReviewPeriod):-999;
 pm.lastJointReviewPeriod=Number.isFinite(Number(pm.lastJointReviewPeriod))?Number(pm.lastJointReviewPeriod):-999;
 pm.lastRoyaltyIncome=num(pm.lastRoyaltyIncome);
 pm.lastRoyaltyExpense=num(pm.lastRoyaltyExpense);
 pm.lifetimeRoyaltyIncome=num(pm.lifetimeRoyaltyIncome);
 pm.lifetimeRoyaltyExpense=num(pm.lifetimeRoyaltyExpense);
 pm.jointDevelopmentCredits=Array.isArray(pm.jointDevelopmentCredits)?pm.jointDevelopmentCredits:[];
 for(const p of pm.jointPrograms)enrichJointProgram(p);
 enrichAllSupplyTerms(state);
 return state;
}

function contractDefaults(state,kind,c){
 const component=kind==="engine"?(state.engines||[]).find(x=>x.id===c.engineId):(state.transmissions||[]).find(x=>x.id===c.transmissionId);
 const rel=kind==="engine"?num(component?.stats?.rel,c.reliability||78):num(component?.reliability,c.reliability||78);
 const units=Math.max(1,num(c.monthlyUnits||c.originalMonthlyUnits,100)),term=Math.max(12,num(c.termMonths||c.originalTermMonths,36)),price=Math.max(1,num(c.unitPrice,kind==="engine"?component?.stats?.cost:component?.cost));
 const seed=String(c.id||c.offerId||c.buyerId||"contract")+"|"+kind;
 const highVolume=units>=900,quality=Math.round(clamp(rel-6+(hash(seed+"q")-.5)*5,55,96));
 return{
  specificationRevision:Math.max(1,num(component?.revision,1)),
  annualVolume:Math.round(units*12),
  minimumAnnualVolume:Math.round(units*12*(highVolume?.82:.72)),
  capacityReservation:Math.round(units*(highVolume?1.20:1.12)),
  deliveryCadence:"monthly",
  qualityRequirement:Math.max(num(c.qualityRequirement),quality),
  warrantyResponsibility:c.warrantyResponsibility||"supplier_component_defects",
  exclusivity:c.exclusivity===true,
  exclusivityScope:c.exclusivityScope||"none",
  toolingContribution:Math.max(0,num(c.toolingContribution,highVolume?Math.round(price*units*1.8):0)),
  developmentContribution:Math.max(0,num(c.developmentContribution,0)),
  deliveryPenalty:Math.max(0,num(c.deliveryPenalty,Math.round(price*.10))),
  earlyCancellationPenalty:Math.max(0,num(c.earlyCancellationPenalty,Math.round(price*units*1.25))),
  terminationShortfallMonths:Math.max(2,num(c.terminationShortfallMonths,state.difficulty==="realistic"?3:5)),
  terminationQualityBreaches:Math.max(2,num(c.terminationQualityBreaches,3)),
  termMonths:term
 };
}
function enrichTerms(state,kind,c){if(!c)return c;const d=contractDefaults(state,kind,c);for(const [k,v] of Object.entries(d))if(c[k]===undefined||c[k]===null)c[k]=v;c.contractSystemVersion=Math.max(2,num(c.contractSystemVersion));return c;}
function enrichAllSupplyTerms(state){
 for(const c of state.engineSupply?.offers||[])enrichTerms(state,"engine",c);
 for(const c of state.engineSupply?.contracts||[])enrichTerms(state,"engine",c);
 for(const c of state.transmissionSupply?.offers||[])enrichTerms(state,"transmission",c);
 for(const c of state.transmissionSupply?.contracts||[])enrichTerms(state,"transmission",c);
}
function canOfferComponent(state,kind,componentId,buyerId){
 ensure(state);const list=kind==="engine"?(state.engineSupply?.contracts||[]):(state.transmissionSupply?.contracts||[]);
 const active=list.filter(c=>c.status==="active"&&(kind==="engine"?c.engineId:c.transmissionId)===componentId);
 const exclusive=active.find(c=>c.exclusivity===true&&c.buyerId!==buyerId);
 if(exclusive)return false;
 const reserved=active.reduce((a,c)=>a+num(c.capacityReservation,c.monthlyUnits),0);
 let cap=Infinity;
 if(kind==="engine")cap=window.MDXPowertrainFamilies?.engineCapacity?.(state,componentId,window.MDX?.engineSupplyCapacity?.(state)||reserved*1.25)||Infinity;
 else cap=window.MDXTransmissionFamilies?.transmissionCapacity?.(state,componentId,window.MDX_CORP?.transmissionCapacity?.(state)||reserved*1.25)||Infinity;
 return !Number.isFinite(cap)||reserved<cap*.92;
}
function cashEntry(state,type,amount,label,meta={}){
 ensure(state);const row={id:uid(state,"ptm_cash"),period:period(state),year:state.year,month:state.month,day:state.day,type,amount,label,...meta};state.powertrainMarket.cashLedger.unshift(row);if(state.powertrainMarket.cashLedger.length>500)state.powertrainMarket.cashLedger.length=500;
 const category=type==="license_upfront"?"licensing":type.startsWith("supply_contract")?"supplierExternal":type.startsWith("joint_")?"transactionFees":null;
 if(category&&window.MDX?.recordCashTransaction)window.MDX.recordCashTransaction(state,category,amount,label,{system:"powertrain_market",marketType:type,...meta});
 return row;
}
function settleContractActivation(state,kind,contract,buyer){
 ensure(state);enrichTerms(state,kind,contract);if(contract.activationSettled)return 0;
 const contribution=Math.max(0,num(contract.toolingContribution)+num(contract.developmentContribution));
 if(contribution>0&&buyer){buyer.cash=num(buyer.cash)-contribution;state.cash=num(state.cash)+contribution;cashEntry(state,"supply_contract_contribution",contribution,(contract.buyerName||buyer.name)+" tooling/development contribution",{kind,contractId:contract.id,buyerId:buyer.id});}
 contract.activationSettled=true;contract.activationContribution=contribution;return contribution;
}
function deliveryReceiptKey(state,kind,contract,units,cumulative){
 return [kind,contract.id,period(state),num(state.day,1),Math.round(num(cumulative)),Math.round(num(units))].join(":");
}
function recordPhysicalDelivery(state,kind,contract,buyer,units,meta={}){
 ensure(state);units=Math.max(0,Math.round(num(units)));if(!buyer||!contract||units<=0)return{added:0,duplicate:false};
 const cumulative=num(meta.cumulativeDelivered,kind==="engine"?contract.mtdDelivered:contract.mtdDelivered),key=deliveryReceiptKey(state,kind,contract,units,cumulative);
 if(state.powertrainMarket.deliveryReceiptKeys[key])return{added:0,duplicate:true,key};
 const stockKey=kind==="engine"?"externalPowertrainInventory":"externalTransmissionInventory";
 buyer[stockKey]=buyer[stockKey]&&typeof buyer[stockKey]==="object"?buyer[stockKey]:{};
 buyer[stockKey][contract.id]=num(buyer[stockKey][contract.id])+units;
 const receipt={id:uid(state,"delivery_receipt"),key,kind,contractId:contract.id,buyerId:buyer.id,buyerName:buyer.name,componentId:kind==="engine"?contract.engineId:contract.transmissionId,componentName:kind==="engine"?contract.engineName:contract.transmissionName,units,unitPrice:num(contract.unitPrice),amount:units*num(contract.unitPrice),period:period(state),year:state.year,month:state.month,day:state.day,cumulativeDelivered:cumulative};
 state.powertrainMarket.deliveryReceipts.unshift(receipt);if(state.powertrainMarket.deliveryReceipts.length>1000)state.powertrainMarket.deliveryReceipts.length=1000;state.powertrainMarket.deliveryReceiptKeys[key]=receipt.id;
 return{added:units,duplicate:false,key,receipt};
}
function settleContractClose(state,kind,contract,buyer,delivered,commitment,log=()=>{}){
 ensure(state);enrichTerms(state,kind,contract);const p=period(state),key=kind+":"+contract.id+":"+p;if(contract.lastTermsSettlementKey===key)return{penalty:0,warranty:0,duplicate:true};
 const short=Math.max(0,num(commitment)-num(delivered)),penalty=short>0?Math.min(short*num(contract.deliveryPenalty),num(contract.earlyCancellationPenalty)*1.5):0;
 let warranty=0,quality=kind==="engine"?num((state.engines||[]).find(e=>e.id===contract.engineId)?.stats?.rel,contract.reliability):num((state.transmissions||[]).find(t=>t.id===contract.transmissionId)?.reliability,contract.reliability);
 if(num(delivered)>0&&quality<num(contract.qualityRequirement)){const gap=clamp((num(contract.qualityRequirement)-quality)/25,0,.5);warranty=num(delivered)*num(contract.unitPrice)*gap*.08;contract.qualityBreaches=num(contract.qualityBreaches)+1;}else contract.qualityBreaches=Math.max(0,num(contract.qualityBreaches)-1);
 const transfer=penalty+warranty;if(transfer>0){state.cash=num(state.cash)-transfer;if(buyer)buyer.cash=num(buyer.cash)+transfer;cashEntry(state,"supply_contract_charge",-transfer,(contract.buyerName||buyer?.name||"OEM")+" contract service charge",{kind,contractId:contract.id,deliveryPenalty:penalty,warranty});}
 if(contract.status==="terminated"&&!contract.terminationSettled){const early=Math.max(0,num(contract.earlyCancellationPenalty));state.cash=num(state.cash)-early;if(buyer)buyer.cash=num(buyer.cash)+early;contract.terminationSettled=true;contract.terminationCharge=early;cashEntry(state,"supply_contract_termination",-early,"Early termination settlement — "+(contract.buyerName||buyer?.name||"OEM"),{kind,contractId:contract.id});}
 contract.lastTermsSettlementKey=key;contract.lastDeliveryPenalty=penalty;contract.lastWarrantyCharge=warranty;if((penalty||warranty)&&log)log((contract.buyerName||"OEM")+" contract terms settled: "+money(penalty)+" delivery penalty and "+money(warranty)+" component warranty charge.");
 return{penalty,warranty,duplicate:false};
}

/* -------------------- 091 / 092 licensing -------------------- */
function engineSourceFromPlayer(state,id){return(state.engines||[]).find(x=>x.id===id)||null;}
function transmissionSourceFromPlayer(state,id){return(state.transmissions||[]).find(x=>x.id===id)||null;}
function sourceCost(kind,src){return kind==="engine"?Math.max(1,num(src?.stats?.cost,500)):Math.max(1,num(src?.cost,700));}
function sourceReliability(kind,src){return kind==="engine"?num(src?.stats?.rel,70):num(src?.reliability,70);}
function sourceName(src){return String(src?.name||"Powertrain Design");}
function licenseTerms(state,kind,src,buyer,sellerName,direction){
 const cost=sourceCost(kind,src),volume=Math.max(300,Math.round(Math.max(num(buyer?.monthSales)*1.15,num(buyer?.dealers)*4.2,num(buyer?.factories)*900,600)/50)*50),maturity=kind==="engine"?num(window.MDXPowertrainFamilies?.familyForEngine?.(state,src?.id)?.maturityScore):num(window.MDXTransmissionFamilies?.familyForTransmission?.(state,src?.id)?.maturityScore),seed=(buyer?.id||"player")+"|"+(src?.id||"src")+"|"+kind+"|"+direction,royalty=Math.max(20,Math.round(cost*(.045+Math.max(0,maturity-65)*.0004)/5)*5),upfront=Math.max(100000,Math.round(cost*volume*(.45+hash(seed+"fee")*.35)/10000)*10000),toolingBudget=Math.max(250000,Math.round(cost*volume*(kind==="engine"?1.15:.95)/10000)*10000),toolingDays=Math.max(30,Math.round((kind==="engine"?80:70)*(1-clamp(maturity/100,0,.25)))),term=[36,48,60,72][Math.floor(hash(seed+"term")*4)%4];
 return{upfrontFee:upfront,royaltyPerUnit:royalty,termMonths:term,annualVolumeCap:Math.round(volume*12*1.35),expectedMonthlyVolume:volume,region:buyer?.country||state.hq||"Global",modificationRights:kind==="engine"?"calibration_and_accessories":"ratios_and_calibration",architectureChangesAllowed:false,toolingBudget,toolingDays,qualityMinimum:Math.round(clamp(sourceReliability(kind,src)-5,55,94)),sellerName,direction};
}
function makeOutboundOffer(state,kind,src,buyer){
 const terms=licenseTerms(state,kind,src,buyer,state.company,"out"),id=uid(state,"licoffer");
 return{id,status:"open",direction:"out",kind,licensorType:"player",licensorId:"player",licensorName:state.company,licenseeType:"ai",licenseeId:buyer.id,licenseeName:buyer.name,sourceId:src.id,sourceName:src.name,sourceRevision:num(src.revision,1),createdPeriod:period(state),expiresPeriod:period(state)+3,...terms};
}
function generateLicenseOffers(state,log=()=>{}){
 ensure(state);const pm=state.powertrainMarket,p=period(state);pm.licenseOffers=pm.licenseOffers.filter(o=>o.status!=="open"||num(o.expiresPeriod)>=p);
 if(p-pm.lastLicenseReviewPeriod<3)return;pm.lastLicenseReviewPeriod=p;
 const openOut=pm.licenseOffers.filter(o=>o.status==="open"&&o.direction==="out").length;if(openOut>=3)return;
 const buyers=(state.industry||[]).filter(activeMaker).sort((a,b)=>num(b.monthSales)-num(a.monthSales)||num(b.valuation)-num(a.valuation)),candidates=[];
 for(const buyer of buyers){
  const highVolume=Math.max(num(buyer.monthSales),num(buyer.dealers)*5,num(buyer.factories)*1000)>=900;if(!highVolume)continue;
  for(const e of (state.engines||[])){if(e.releaseStatus==="development")continue;if(pm.licenses.some(l=>l.status==="active"&&l.direction==="out"&&l.kind==="engine"&&l.licenseeId===buyer.id&&l.sourceId===e.id))continue;const rel=sourceReliability("engine",e),score=rel+num(e.stats?.hp)/12-sourceCost("engine",e)/420+num(buyer.factories)*2;if(score>63)candidates.push({kind:"engine",src:e,buyer,score});}
  for(const t of (state.transmissions||[])){if(t.releaseStatus==="development")continue;if(pm.licenses.some(l=>l.status==="active"&&l.direction==="out"&&l.kind==="transmission"&&l.licenseeId===buyer.id&&l.sourceId===t.id))continue;const score=sourceReliability("transmission",t)+num(t.torque)/80+num(t.shift)/15-sourceCost("transmission",t)/500+num(buyer.factories)*2;if(score>66)candidates.push({kind:"transmission",src:t,buyer,score});}
 }
 candidates.sort((a,b)=>b.score-a.score);
 for(const c of candidates.slice(0,Math.max(0,3-openOut))){if(hash(c.buyer.id+c.src.id+p+"license")<(state.difficulty==="casual"?.48:.31))continue;const o=makeOutboundOffer(state,c.kind,c.src,c.buyer);pm.licenseOffers.push(o);log(c.buyer.name+" proposed licensing "+c.src.name+" instead of buying complete "+c.kind+(c.kind==="engine"?"s":"s")+" because its projected volume can justify local tooling.");}
}
function aiEngineToPlayer(state,seller,src,license){
 const hp=num(src.hp,100),redline=Math.max(3500,num(src.redline,5500)),torque=Math.max(70,Math.round(hp*5252/(redline*.68))),cyl=num(src.cylinders,4),disp=num(src.disp,2),mass=Math.round(170+disp*35+cyl*8);
 return{id:"lic_eng_"+license.id,name:src.name+" — Licensed",familyId:"lic_eng_family_"+license.id,familyName:src.name+" Licensed Family",generation:1,revision:1,createdYear:state.year,releaseStatus:"released",licensedDesign:true,licenseId:license.id,licenseToolingComplete:true,design:{config:src.config||"I4",bore:86,stroke:86,block:"iron",blockDeck:"open",head:String(src.valvetrain||"OHV").toLowerCase(),aspiration:src.turbo?"turbo":"na",compression:num(src.compression,9),redline,quality:Math.round(num(src.reliability,75))},stats:{hp,torque,rel:num(src.reliability,75),cost:Math.max(100,Math.round(num(src.cost,500)*.90)),disp,mass}};
}
function aiTransmissionToPlayer(state,seller,src,license){
 const typeText=String(src.type||"manual").toLowerCase(),type=typeText.includes("dct")?"DCT":typeText.includes("ecvt")?"eCVT":typeText.includes("cvt")?"CVT":typeText.includes("automatic")?"Automatic":"Manual",gears=num(src.gears,4),drive=String(src.driveCompatibility||"multi"),driveCompat=drive==="FWD"?["FWD"]:drive==="RWD"?["RWD","AWD"]:["RWD","FWD","AWD","4WD"],layout=drive==="FWD"?["transverse"]:drive==="RWD"?["longitudinal"]:["longitudinal","transverse"];
 return{id:"lic_tx_"+license.id,name:src.name+" — Licensed",familyId:"lic_tx_family_"+license.id,familyName:src.name+" Licensed Family",createdYear:state.year,releaseStatus:"released",licensedDesign:true,licenseId:license.id,licenseToolingComplete:true,type,architecture:"licensed",gears,torque:num(src.torque,300),eff:num(src.efficiency,.92),reliability:num(src.reliability,78),shift:num(src.shift,65),quality:num(src.reliability,78),cost:Math.max(150,Math.round(num(src.cost,700)*.90)),mass:Math.round(95+Math.max(0,gears-4)*7),smoothness:num(src.smoothness,65),serviceability:num(src.serviceability,70),heatTolerance:num(src.heatTolerance,75),performanceRating:clamp(num(src.shift,65)*.65+num(src.torque,300)/18,30,98),luxuryRefinement:num(src.smoothness,65),maxVehicleWeight:Math.max(1800,num(src.torque,300)*8),baseFinal:3.55,ratios:gears?Array.from({length:gears},(_,i)=>Number((3.5*Math.pow(.72,i)).toFixed(2))):[],drivetrainCompat:driveCompat,layoutCompat:layout,controlSystem:type==="Automatic"||type==="DCT"?"electronic":"mechanical",housing:"aluminum"};
}
function playerEngineToAi(state,src,license){
 return{id:"lic_ai_eng_"+license.id,name:src.name+" License",year:state.year,config:src.design?.config||"I4",cylinders:Number(String(src.design?.config||"I4").match(/\d+/)?.[0]||4),disp:num(src.stats?.disp,2),turbo:String(src.design?.aspiration||"").includes("turbo"),valvetrain:String(src.design?.head||"ohv").toUpperCase(),compression:num(src.design?.compression,9),redline:num(src.design?.redline,5500),hp:num(src.stats?.hp,100),reliability:num(src.stats?.rel,75),cost:Math.max(100,Math.round(num(src.stats?.cost,500)*.90)),revision:num(src.revision,1),active:true,licenseId:license.id,licensedFromPlayer:true};
}
function playerTransmissionToAi(state,src,license){
 return{id:"lic_ai_tx_"+license.id,name:src.name+" License",year:state.year,type:src.type||"Manual",gears:num(src.gears,4),torque:num(src.torque,300),efficiency:num(src.eff,.92),shift:num(src.shift,65),smoothness:num(src.smoothness,65),reliability:num(src.reliability,75),cost:Math.max(150,Math.round(num(src.cost,700)*.90)),driveCompatibility:Array.isArray(src.drivetrainCompat)&&src.drivetrainCompat.length===1?src.drivetrainCompat[0]:"multi",heatTolerance:num(src.heatTolerance,75),serviceability:num(src.serviceability,70),revision:num(src.revision,1),generation:num(src.generation,1),active:true,licenseId:license.id,licensedFromPlayer:true};
}
function choosePlayerPlant(state){return(state.operations?.factories||[]).filter(f=>f.status==="operating"&&num(f.shops?.powertrain)>0).sort((a,b)=>num(b.shops?.powertrain)-num(a.shops?.powertrain))[0]||null;}
function installPlayerLicensedTooling(state,license,asset){
 const fac=choosePlayerPlant(state);if(!fac)return false;
 if(license.kind==="engine"){
  window.MDXPowertrainFamilies?.ensure?.(state);const fam=window.MDXPowertrainFamilies?.familyForEngine?.(state,asset.id);if(!fam)return false;fac.engineFamilyTooling=Array.isArray(fac.engineFamilyTooling)?fac.engineFamilyTooling:[];if(!fac.engineFamilyTooling.some(x=>x.familyId===fam.id))fac.engineFamilyTooling.push({familyId:fam.id,status:"active",installedPeriod:period(state),ramp:.70,licenseId:license.id});fam.toolingPlantIds=Array.isArray(fam.toolingPlantIds)?fam.toolingPlantIds:[];if(!fam.toolingPlantIds.includes(fac.id))fam.toolingPlantIds.push(fac.id);fam.autoTooledLegacy=false;
 }else{
  window.MDXTransmissionFamilies?.ensure?.(state);const fam=window.MDXTransmissionFamilies?.familyForTransmission?.(state,asset.id);if(!fam)return false;fac.transmissionFamilyTooling=Array.isArray(fac.transmissionFamilyTooling)?fac.transmissionFamilyTooling:[];if(!fac.transmissionFamilyTooling.some(x=>x.familyId===fam.id))fac.transmissionFamilyTooling.push({familyId:fam.id,status:"active",installedPeriod:period(state),ramp:.70,licenseId:license.id});fam.toolingPlantIds=Array.isArray(fam.toolingPlantIds)?fam.toolingPlantIds:[];if(!fam.toolingPlantIds.includes(fac.id))fam.toolingPlantIds.push(fac.id);fam.autoTooledLegacy=false;
 }return true;
}
function activateLicense(state,license,log=()=>{}){
 if(license.assetId)return license.assetId;
 if(license.direction==="out"){
  const buyer=(state.industry||[]).find(x=>x.id===license.licenseeId);if(!buyer)return null;
  if(license.kind==="engine"){const src=engineSourceFromPlayer(state,license.sourceId);if(!src)return null;buyer.aiEngines=Array.isArray(buyer.aiEngines)?buyer.aiEngines:[];const a=playerEngineToAi(state,src,license);buyer.aiEngines.push(a);license.assetId=a.id;}
  else{const src=transmissionSourceFromPlayer(state,license.sourceId);if(!src)return null;buyer.aiTransmissions=Array.isArray(buyer.aiTransmissions)?buyer.aiTransmissions:[];const a=playerTransmissionToAi(state,src,license);buyer.aiTransmissions.push(a);license.assetId=a.id;}
  buyer.aiProjects=Array.isArray(buyer.aiProjects)?buyer.aiProjects:[];if(!buyer.aiProjects.some(p=>p.status==="active"&&p.licenseId===license.id)){const seg=String(buyer.focus||"").toLowerCase().includes("sport")?"Sport":String(buyer.focus||"").toLowerCase().includes("luxury")?"Premium":"Mainstream";buyer.aiProjects.push({id:"licensed_vehicle_"+license.id,type:"vehicle",segment:seg,monthsRemaining:Math.max(5,Math.round(10-num(buyer.rd,50)/20)),totalMonths:Math.max(5,Math.round(10-num(buyer.rd,50)/20)),status:"active",budget:Math.max(250000,num(buyer.valuation)*.0025),startedYear:state.year,licenseId:license.id,phase:"LICENSED POWERTRAIN INTEGRATION"});}
 }else{
  const seller=(state.industry||[]).find(x=>x.id===license.licensorId);if(!seller)return null;
  if(license.kind==="engine"){const src=(seller.aiEngines||[]).find(x=>x.id===license.sourceId);if(!src)return null;const a=aiEngineToPlayer(state,seller,src,license);state.engines=Array.isArray(state.engines)?state.engines:[];state.engines.push(a);license.assetId=a.id;window.MDXPowertrainFamilies?.ensure?.(state);installPlayerLicensedTooling(state,license,a);}
  else{const src=(seller.aiTransmissions||[]).find(x=>x.id===license.sourceId);if(!src)return null;const a=aiTransmissionToPlayer(state,seller,src,license);state.transmissions=Array.isArray(state.transmissions)?state.transmissions:[];state.transmissions.push(a);license.assetId=a.id;window.MDXTransmissionFamilies?.ensure?.(state);installPlayerLicensedTooling(state,license,a);}
 }
 license.toolingStatus="complete";license.status="active";license.activationPeriod=period(state);license.startPeriod=period(state);license.endPeriod=license.startPeriod+num(license.termMonths,48);log(sourceName({name:license.sourceName})+" licensing tooling reached production readiness for "+license.licenseeName+".");return license.assetId;
}
function acceptOutboundLicenseOffer(state,id,log=()=>{}){
 ensure(state);const o=state.powertrainMarket.licenseOffers.find(x=>x.id===id&&x.status==="open"&&x.direction==="out");if(!o)return null;const buyer=(state.industry||[]).find(x=>x.id===o.licenseeId);if(!buyer)return null;const initial=Math.max(0,num(o.upfrontFee));if(num(buyer.cash)<initial+num(o.toolingBudget)*.05)return null;
 buyer.cash=num(buyer.cash)-initial;state.cash=num(state.cash)+initial;o.status="accepted";const lic={...o,id:uid(state,"license"),offerId:o.id,status:"tooling",toolingStatus:"active",toolingSpent:0,toolingDaysRemaining:num(o.toolingDays),toolingTotalDays:num(o.toolingDays),royaltyPeriods:{},lifetimeLicensedUnits:0,lifetimeRoyalties:0};state.powertrainMarket.licenses.push(lic);cashEntry(state,"license_upfront",initial,"License upfront fee — "+o.licenseeName+" / "+o.sourceName,{licenseId:lic.id,direction:"in"});log(o.licenseeName+" licensed "+o.sourceName+" from "+state.company+" for "+money(initial)+" upfront plus "+money(o.royaltyPerUnit)+" per produced unit.");return lic;
}
function inboundCatalog(state,kind){
 ensure(state);const rows=[];for(const seller of (state.industry||[]).filter(activeMaker)){const assets=kind==="engine"?(seller.aiEngines||[]):(seller.aiTransmissions||[]);for(const src of assets.filter(x=>x.active)){const t=licenseTerms(state,kind,src,state,seller.name,"in");const finishedCost=sourceCost(kind,src)*1.38,localCost=sourceCost(kind,src)*.90+t.royaltyPerUnit,score=(finishedCost-localCost)*t.expectedMonthlyVolume-t.upfrontFee/48;rows.push({kind,seller,src,terms:t,finishedCost,localCost,score});}}return rows.sort((a,b)=>b.score-a.score).slice(0,8);
}
function acceptInboundLicense(state,kind,sellerId,sourceId,log=()=>{}){
 ensure(state);const seller=(state.industry||[]).find(x=>x.id===sellerId);if(!seller)return null;const src=(kind==="engine"?seller.aiEngines:seller.aiTransmissions||[]).find(x=>x.id===sourceId);if(!src)return null;if(state.powertrainMarket.licenses.some(l=>["tooling","active"].includes(l.status)&&l.direction==="in"&&l.kind===kind&&l.licensorId===sellerId&&l.sourceId===sourceId))return null;
 const terms=licenseTerms(state,kind,src,state,seller.name,"in");if(num(state.cash)<terms.upfrontFee+terms.toolingBudget*.05)return null;state.cash=num(state.cash)-terms.upfrontFee;seller.cash=num(seller.cash)+terms.upfrontFee;
 const lic={id:uid(state,"license"),status:"tooling",direction:"in",kind,licensorType:"ai",licensorId:seller.id,licensorName:seller.name,licenseeType:"player",licenseeId:"player",licenseeName:state.company,sourceId:src.id,sourceName:src.name,sourceRevision:num(src.revision,1),createdPeriod:period(state),toolingStatus:"active",toolingSpent:0,toolingDaysRemaining:terms.toolingDays,toolingTotalDays:terms.toolingDays,royaltyPeriods:{},lifetimeLicensedUnits:0,lifetimeRoyalties:0,...terms};state.powertrainMarket.licenses.push(lic);cashEntry(state,"license_upfront",-terms.upfrontFee,"License acquisition — "+seller.name+" / "+src.name,{licenseId:lic.id,direction:"out"});log(state.company+" licensed "+src.name+" from "+seller.name+" for "+money(terms.upfrontFee)+" upfront plus "+money(terms.royaltyPerUnit)+" per produced unit; local tooling is now required.");return lic;
}
function declineLicenseOffer(state,id){ensure(state);const o=state.powertrainMarket.licenseOffers.find(x=>x.id===id&&x.status==="open");if(!o)return false;o.status="declined";return true;}
function settleLicenseRoyalty(state,lic,units,counterparty,log=()=>{}){
 units=Math.max(0,Math.round(num(units)));const due=units*num(lic.royaltyPerUnit);if(units<=0)return 0;
 if(lic.direction==="out"){counterparty.cash=num(counterparty.cash)-due;state.cash=num(state.cash)+due;state.powertrainMarket.lastRoyaltyIncome+=due;state.powertrainMarket.lifetimeRoyaltyIncome+=due;cashEntry(state,"license_royalty",due,"Royalty income — "+lic.licenseeName+" / "+lic.sourceName,{licenseId:lic.id,units});}
 else{state.cash=num(state.cash)-due;counterparty.cash=num(counterparty.cash)+due;state.powertrainMarket.lastRoyaltyExpense+=due;state.powertrainMarket.lifetimeRoyaltyExpense+=due;cashEntry(state,"license_royalty",-due,"Royalty expense — "+lic.licensorName+" / "+lic.sourceName,{licenseId:lic.id,units});}
 lic.lifetimeLicensedUnits=num(lic.lifetimeLicensedUnits)+units;lic.lifetimeRoyalties=num(lic.lifetimeRoyalties)+due;log((lic.direction==="out"?lic.licenseeName:state.company)+" produced "+units.toLocaleString()+" units under the "+lic.sourceName+" license; "+money(due)+" royalty settled.");return due;
}
function settleLicensesMonth(state,log=()=>{}){
 ensure(state);const pm=state.powertrainMarket,p=period(state);pm.lastRoyaltyIncome=0;pm.lastRoyaltyExpense=0;
 for(const lic of pm.licenses){if(lic.status!=="active"||!lic.assetId)continue;if(p>=num(lic.endPeriod)){lic.status="complete";continue;}lic.royaltyPeriods=lic.royaltyPeriods&&typeof lic.royaltyPeriods==="object"?lic.royaltyPeriods:{};if(lic.royaltyPeriods[p])continue;
  let units=0,counterparty=null;
  if(lic.direction==="out"){counterparty=(state.industry||[]).find(x=>x.id===lic.licenseeId);if(!counterparty)continue;for(const car of counterparty.aiCars||[]){if(lic.kind==="engine"&&car.engineId===lic.assetId)units+=num(car.lastProduced);if(lic.kind==="transmission"&&car.transmissionId===lic.assetId)units+=num(car.lastProduced);}}
  else{counterparty=(state.industry||[]).find(x=>x.id===lic.licensorId);if(!counterparty)continue;for(const v of state.vehicles||[]){const used=lic.kind==="engine"?v.engineId===lic.assetId:(v.transmissionId||v.design?.trans)===lic.assetId;if(used)units+=num(v.lastMonthProduced);}}
  units=Math.min(units,Math.max(0,num(lic.annualVolumeCap,Infinity)));const due=settleLicenseRoyalty(state,lic,units,counterparty,log);lic.royaltyPeriods[p]={units,due};lic.lastMonthUnits=units;lic.lastMonthRoyalty=due;
 }
 return{income:pm.lastRoyaltyIncome,expense:pm.lastRoyaltyExpense,net:pm.lastRoyaltyIncome-pm.lastRoyaltyExpense};
}

/* -------------------- 093 joint development -------------------- */
function jvBudget(state,kind,src,partner){const base=sourceCost(kind,src),era=Math.pow(1.03,Math.max(0,num(state.year,1970)-1970)),scale=kind==="engine"?520:440;return Math.max(900000,Math.round((base*scale+num(partner?.valuation)*.0015)*era/10000)*10000);}
function createJointProgram(state,partnerId,kind,sourceId,playerSharePct=50,options={},log=()=>{}){
 if(typeof options==="function"){log=options;options={};}
 ensure(state);
 const partner=(state.industry||[]).find(x=>x.id===partnerId);
 const src=kind==="engine"?engineSourceFromPlayer(state,sourceId):transmissionSourceFromPlayer(state,sourceId);
 if(!partner||!src||!activeMaker(partner))return null;

 playerSharePct=clamp(playerSharePct,25,75);
 const objective=["balanced","performance","efficiency","reliability","cost"].includes(options.objective)?options.objective:"balanced";
 const scope=["evolution","major_revision","clean_sheet"].includes(options.scope)?options.scope:"major_revision";
 const ipModel=["proportional","equal","player_lead","partner_lead"].includes(options.ipModel)?options.ipModel:"proportional";
 const toolingResponsibility=["shared","player","partner"].includes(options.toolingResponsibility)?options.toolingResponsibility:"shared";
 const exclusivityMode=["shared_nonexclusive","player_first_36m","partner_first_36m"].includes(options.exclusivityMode)?options.exclusivityMode:"shared_nonexclusive";
 const variantRights=["shared_all","player_performance","partner_efficiency"].includes(options.variantRights)?options.variantRights:"shared_all";
 const capacityPlayer=clamp(num(options.capacityPlayerPct,playerSharePct),20,80);

 const scopeBudget={evolution:.82,major_revision:1,clean_sheet:1.38}[scope];
 const scopeDays={evolution:.80,major_revision:1,clean_sheet:1.28}[scope];
 const objectiveBudget={balanced:1,performance:1.14,efficiency:1.10,reliability:1.08,cost:.94}[objective];
 const toolingBudget=toolingResponsibility==="player"?1.08:toolingResponsibility==="partner"?.94:1;
 const totalBudget=Math.max(750000,Math.round(jvBudget(state,kind,src,partner)*scopeBudget*objectiveBudget*toolingBudget/10000)*10000);
 const days=Math.max(75,Math.round((kind==="engine"?150:125)*scopeDays));
 const playerShare=playerSharePct/100,partnerShare=1-playerShare;
 if(num(state.cash)<totalBudget*playerShare/days*5||num(partner.cash)<totalBudget*partnerShare/days*5)return null;

 let playerIp=playerSharePct;
 if(ipModel==="equal")playerIp=50;
 if(ipModel==="player_lead")playerIp=Math.max(60,playerSharePct);
 if(ipModel==="partner_lead")playerIp=Math.min(40,playerSharePct);

 const p=enrichJointProgram({
  id:uid(state,"jv"),
  name:sourceName(src)+" Joint Next Generation",
  status:"active",
  kind,
  partnerId:partner.id,
  partnerName:partner.name,
  sourceId:src.id,
  sourceName:src.name,
  totalBudget,
  totalDays:days,
  daysRemaining:days,
  spent:0,
  playerSpent:0,
  partnerSpent:0,
  playerSharePct,
  partnerSharePct:100-playerSharePct,
  objective,
  scope,
  ipModel,
  ownership:{player:playerIp,partner:100-playerIp},
  toolingResponsibility,
  exclusivityMode,
  variantRights,
  permittedVariants:variantRights==="player_performance"?["base","performance"]:variantRights==="partner_efficiency"?["base","efficiency"]:["base","efficiency","performance"],
  ipRights:ipModel==="player_lead"?"player_lead_joint_license":ipModel==="partner_lead"?"partner_lead_joint_license":"joint_family_shared_modification_rights",
  capacityAllocation:{player:capacityPlayer,partner:100-capacityPlayer},
  governance:ipModel==="player_lead"?"player_program_lead":ipModel==="partner_lead"?"partner_program_lead":"joint_committee",
  exitClause:"Exiting party pays 10% of its remaining contribution; completed work remains governed by the negotiated IP and exclusivity terms.",
  phase:"ARCHITECTURE ALIGNMENT",
  missedPartnerDays:0,
  started:{year:state.year,month:state.month,day:state.day}
 });

 state.powertrainMarket.jointPrograms.push(p);
 log(state.company+" and "+partner.name+" signed a "+scope.replaceAll("_"," ")+" "+kind+" joint-development agreement focused on "+objective+": "+money(totalBudget)+" total budget, "+playerSharePct+"/"+(100-playerSharePct)+" cost share, "+p.ownership.player+"/"+p.ownership.partner+" IP.");
 return p;
}

function jointOutcome(kind,p){
 const scope={evolution:.75,major_revision:1,clean_sheet:1.35}[p.scope]||1;
 if(kind==="engine"){
  const x={
   balanced:{hp:.04,torque:.035,rel:1.5,cost:-.02},
   performance:{hp:.10,torque:.08,rel:.7,cost:.03},
   efficiency:{hp:.025,torque:.03,rel:2,cost:-.04},
   reliability:{hp:.02,torque:.02,rel:4,cost:.01},
   cost:{hp:.01,torque:.01,rel:1,cost:-.10}
  }[p.objective]||{hp:.04,torque:.035,rel:1.5,cost:-.02};
  return{hp:1+x.hp*scope,torque:1+x.torque*scope,rel:x.rel*scope,cost:Math.max(.78,1+x.cost*scope)};
 }
 const x={
  balanced:{torque:.05,eff:.006,rel:1.5,cost:-.02},
  performance:{torque:.11,eff:.002,rel:.7,cost:.03},
  efficiency:{torque:.03,eff:.018,rel:1.8,cost:-.01},
  reliability:{torque:.02,eff:.004,rel:4,cost:.01},
  cost:{torque:.01,eff:.002,rel:1,cost:-.10}
 }[p.objective]||{torque:.05,eff:.006,rel:1.5,cost:-.02};
 return{torque:1+x.torque*scope,eff:x.eff*scope,rel:x.rel*scope,cost:Math.max(.78,1+x.cost*scope)};
}

function completeJointProgram(state,p,log=()=>{}){
 enrichJointProgram(p);
 const partner=(state.industry||[]).find(x=>x.id===p.partnerId),src=p.kind==="engine"?engineSourceFromPlayer(state,p.sourceId):transmissionSourceFromPlayer(state,p.sourceId);
 if(!partner||!src){p.status="failed";return;}
 const gain=jointOutcome(p.kind,p);

 if(p.kind==="engine"){
  const e=JSON.parse(JSON.stringify(src));
  e.id="jv_eng_"+p.id;e.name=p.name;e.familyId="jv_eng_family_"+p.id;e.familyName=p.name+" Family";e.createdYear=state.year;e.revision=1;e.generation=num(src.generation,1)+1;e.jointDevelopmentId=p.id;e.jointOwnershipPct=p.ownership.player;e.releaseStatus="released";
  e.stats={...e.stats,hp:Math.round(num(e.stats?.hp)*gain.hp),torque:Math.round(num(e.stats?.torque)*gain.torque),rel:clamp(num(e.stats?.rel)+gain.rel,20,99),cost:Math.max(1,Math.round(num(e.stats?.cost)*gain.cost))};
  state.engines.push(e);p.playerAssetId=e.id;
  partner.aiEngines=Array.isArray(partner.aiEngines)?partner.aiEngines:[];
  const ai=playerEngineToAi(state,e,{id:p.id});ai.id="jv_ai_eng_"+p.id;ai.name=p.name;ai.jointDevelopmentId=p.id;partner.aiEngines.push(ai);p.partnerAssetId=ai.id;
  window.MDXPowertrainFamilies?.ensure?.(state);
 }else{
  const t=JSON.parse(JSON.stringify(src));
  t.id="jv_tx_"+p.id;t.name=p.name;t.familyId="jv_tx_family_"+p.id;t.familyName=p.name+" Family";t.createdYear=state.year;t.revision=1;t.generation=num(src.generation,1)+1;t.jointDevelopmentId=p.id;t.jointOwnershipPct=p.ownership.player;t.releaseStatus="released";
  t.torque=Math.round(num(t.torque)*gain.torque);t.eff=clamp(num(t.eff,.90)+gain.eff,.70,.99);t.reliability=clamp(num(t.reliability)+gain.rel,20,99);t.cost=Math.max(1,Math.round(num(t.cost)*gain.cost));
  state.transmissions.push(t);p.playerAssetId=t.id;
  partner.aiTransmissions=Array.isArray(partner.aiTransmissions)?partner.aiTransmissions:[];
  const ai=playerTransmissionToAi(state,t,{id:p.id});ai.id="jv_ai_tx_"+p.id;ai.name=p.name;ai.jointDevelopmentId=p.id;partner.aiTransmissions.push(ai);p.partnerAssetId=ai.id;
  window.MDXTransmissionFamilies?.ensure?.(state);
 }

 p.status="complete";p.phase="PRODUCTION RELEASE";p.completedPeriod=period(state);
 log(p.name+" joint development reached production release. Objective: "+p.objective+". IP ownership: "+p.ownership.player+"% "+state.company+" / "+p.ownership.partner+"% "+p.partnerName+".");
}
function exitJointProgram(state,id,side="player",log=()=>{}){
 ensure(state);const p=state.powertrainMarket.jointPrograms.find(x=>x.id===id&&x.status==="active");if(!p)return false;const remaining=Math.max(0,num(p.totalBudget)-num(p.spent)),share=side==="player"?p.playerSharePct/100:p.partnerSharePct/100,fee=remaining*share*.10,partner=(state.industry||[]).find(x=>x.id===p.partnerId);
 if(side==="player"){state.cash=num(state.cash)-fee;if(partner)partner.cash=num(partner.cash)+fee;p.exitOutcome="Player exited; partner receives the exit fee and retains all completed technical work. No production family is released to the player.";}
 else{if(partner)partner.cash=num(partner.cash)-fee;state.cash=num(state.cash)+fee;p.exitOutcome="Partner exited after funding failure; player receives the exit fee and keeps documented work as future engineering reuse, but no joint production asset is released.";state.powertrainMarket.jointDevelopmentCredits.push({id:uid(state,"jvcredit"),kind:p.kind,sourceId:p.sourceId,reusePct:Math.round(clamp((1-p.daysRemaining/Math.max(1,p.totalDays))*45,5,40)),createdPeriod:period(state),sourceProgramId:p.id});}
 p.status="terminated";p.phase="PARTNER EXIT";p.exitSide=side;p.exitFee=fee;cashEntry(state,"joint_exit",side==="player"?-fee:fee,"Joint-development exit settlement — "+p.name,{jointProgramId:p.id,exitSide:side});log(p.name+" joint development ended after "+(side==="player"?state.company:p.partnerName)+" exited. "+p.exitOutcome);return true;
}
function generateJointOffers(state,log=()=>{}){
 ensure(state);const pm=state.powertrainMarket,p=period(state);pm.jointOffers=pm.jointOffers.filter(o=>o.status!=="open"||num(o.expiresPeriod)>=p);if(p-pm.lastJointReviewPeriod<6)return;pm.lastJointReviewPeriod=p;if(pm.jointOffers.some(o=>o.status==="open"))return;
 const partners=(state.industry||[]).filter(activeMaker).filter(m=>num(m.factories)>0&&num(m.valuation)>50000000),sources=[...(state.engines||[]).filter(e=>e.releaseStatus!=="development").map(src=>({kind:"engine",src})),...(state.transmissions||[]).filter(t=>t.releaseStatus!=="development").map(src=>({kind:"transmission",src}))];if(!partners.length||!sources.length)return;
 const rows=[];for(const partner of partners){const stressed=num(partner.cash)<num(partner.valuation)*.03||String(partner.corporatePersonality)==="technology_leader"||String(partner.corporatePersonality)==="asset_light";if(!stressed)continue;for(const s of sources){const budget=jvBudget(state,s.kind,s.src,partner),soloBurden=budget/Math.max(1,num(partner.cash));const score=soloBurden+(sourceReliability(s.kind,s.src)-65)/60+num(partner.rd,50)/180;if(score>.42)rows.push({partner,...s,score,budget});}}
 rows.sort((a,b)=>b.score-a.score);const c=rows[0];if(!c||hash(c.partner.id+c.src.id+p+"jv")<.42)return;pm.jointOffers.push({id:uid(state,"jvoffer"),status:"open",partnerId:c.partner.id,partnerName:c.partner.name,kind:c.kind,sourceId:c.src.id,sourceName:c.src.name,totalBudget:c.budget,playerSharePct:40+Math.round(hash(c.partner.id+c.src.id+"share")*20),createdPeriod:p,expiresPeriod:p+4});log(c.partner.name+" proposed sharing the cost and IP of a next-generation "+c.sourceName+" program rather than funding the full risk alone.");}
function acceptJointOffer(state,id,log=()=>{}){
 ensure(state);const o=state.powertrainMarket.jointOffers.find(x=>x.id===id&&x.status==="open");if(!o)return null;const p=createJointProgram(state,o.partnerId,o.kind,o.sourceId,o.playerSharePct,log);if(p)o.status="accepted";return p;
}
function declineJointOffer(state,id){ensure(state);const o=state.powertrainMarket.jointOffers.find(x=>x.id===id&&x.status==="open");if(!o)return false;o.status="declined";return true;}

function processDay(state,log=()=>{}){
 ensure(state);let playerSpend=0;
 for(const lic of state.powertrainMarket.licenses){if(lic.status!=="tooling"||lic.toolingStatus!=="active")continue;const daily=num(lic.toolingBudget)/Math.max(1,num(lic.toolingTotalDays)),payer=lic.direction==="out"?(state.industry||[]).find(x=>x.id===lic.licenseeId):state;if(!payer){lic.status="cancelled";continue;}if(num(payer.cash)<daily){lic.toolingPhase="PAUSED — FUNDING";continue;}payer.cash=num(payer.cash)-daily;lic.toolingSpent=num(lic.toolingSpent)+daily;lic.toolingDaysRemaining=Math.max(0,num(lic.toolingDaysRemaining)-1);lic.toolingPhase=lic.toolingDaysRemaining>lic.toolingTotalDays*.55?"PRODUCTION PROCESS DESIGN":lic.toolingDaysRemaining>lic.toolingTotalDays*.20?"TOOLING + PILOT RUN":"VALIDATION";if(lic.direction==="in")playerSpend+=daily;if(lic.toolingDaysRemaining<=0)activateLicense(state,lic,log);}
 for(const p of state.powertrainMarket.jointPrograms){if(p.status!=="active")continue;const partner=(state.industry||[]).find(x=>x.id===p.partnerId);if(!partner){exitJointProgram(state,p.id,"partner",log);continue;}const totalDaily=num(p.totalBudget)/Math.max(1,num(p.totalDays)),playerDaily=totalDaily*p.playerSharePct/100,partnerDaily=totalDaily*p.partnerSharePct/100;if(num(state.cash)<playerDaily){p.phase="PAUSED — PLAYER FUNDING";continue;}if(num(partner.cash)<partnerDaily){p.missedPartnerDays=num(p.missedPartnerDays)+1;p.phase="PAUSED — PARTNER FUNDING";if(p.missedPartnerDays>=10)exitJointProgram(state,p.id,"partner",log);continue;}p.missedPartnerDays=0;state.cash=num(state.cash)-playerDaily;partner.cash=num(partner.cash)-partnerDaily;p.playerSpent=num(p.playerSpent)+playerDaily;p.partnerSpent=num(p.partnerSpent)+partnerDaily;p.spent=num(p.spent)+totalDaily;playerSpend+=playerDaily;p.daysRemaining=Math.max(0,num(p.daysRemaining)-1);const x=1-p.daysRemaining/Math.max(1,p.totalDays);p.phase=x<.25?"ARCHITECTURE ALIGNMENT":x<.55?"SHARED PROTOTYPE ENGINEERING":x<.82?"DURABILITY + CALIBRATION":"PRODUCTION VALIDATION";if(p.daysRemaining<=0)completeJointProgram(state,p,log);}
 return{spend:playerSpend};
}
function processMonth(state,log=()=>{}){
 ensure(state);generateLicenseOffers(state,log);generateJointOffers(state,log);return settleLicensesMonth(state,log);
}

/* -------------------- UI -------------------- */
function termBadges(c){return"<div class='contract-terms-grid'><span>REV R"+num(c.specificationRevision,1)+"</span><span>"+num(c.minimumAnnualVolume).toLocaleString()+" MIN/YR</span><span>"+num(c.capacityReservation).toLocaleString()+"/MO RESERVED</span><span>Q "+num(c.qualityRequirement)+"/100</span><span>"+(c.exclusivity?"EXCLUSIVE":"NON-EXCLUSIVE")+"</span><span>"+money(c.deliveryPenalty)+" / SHORT UNIT</span></div>";}
function licenseOfferCard(o){return"<article class='ptm-card'><span class='tag'>"+o.kind.toUpperCase()+" LICENSE REQUEST • "+o.licenseeName+"</span><h3>"+o.sourceName+"</h3><div class='mini-kpis'><div><span>UPFRONT</span><b>"+money(o.upfrontFee)+"</b></div><div><span>ROYALTY</span><b>"+money(o.royaltyPerUnit)+"/unit</b></div><div><span>TERM</span><b>"+o.termMonths+" mo</b></div><div><span>LOCAL VOLUME</span><b>~"+num(o.expectedMonthlyVolume).toLocaleString()+"/mo</b></div></div><p class='muted'>Licensee funds "+money(o.toolingBudget)+" of local tooling. Rights cover revision R"+o.sourceRevision+" with "+String(o.modificationRights).replaceAll("_"," ")+"; architecture changes remain restricted.</p><div class='offer-actions'><button class='btn hero' data-lic-accept='"+o.id+"'>ACCEPT LICENSE</button><button class='btn secondary' data-lic-decline='"+o.id+"'>DECLINE</button></div></article>";}
function licenseRow(l){const progress=l.toolingStatus==="active"?Math.round(100*(1-num(l.toolingDaysRemaining)/Math.max(1,num(l.toolingTotalDays)))):100;return"<article class='ptm-card'><span class='tag'>"+l.kind.toUpperCase()+" LICENSE • "+(l.direction==="out"?"LICENSED OUT":"LICENSED IN")+"</span><h3>"+l.sourceName+"</h3><div class='mini-kpis'><div><span>COUNTERPARTY</span><b>"+(l.direction==="out"?l.licenseeName:l.licensorName)+"</b></div><div><span>STATUS</span><b>"+String(l.status).toUpperCase()+"</b></div><div><span>ROYALTY</span><b>"+money(l.royaltyPerUnit)+"/unit</b></div><div><span>LIFETIME UNITS</span><b>"+num(l.lifetimeLicensedUnits).toLocaleString()+"</b></div></div>"+(l.status==="tooling"?"<div class='process-bar'><i style='width:"+progress+"%'></i></div><small>"+progress+"% tooling • "+Math.ceil(num(l.toolingDaysRemaining))+" days remaining</small>":"")+"</article>";}
function jvCard(p){
 enrichJointProgram(p);
 const progress=Math.round(100*(1-num(p.daysRemaining)/Math.max(1,num(p.totalDays))));
 const status=String(p.phase||p.status).toUpperCase();
 return"<details class='ptm-contract-row'><summary><span><b>"+p.name+"</b><small>"+p.kind.toUpperCase()+" • "+p.partnerName+"</small></span><i>"+status+" • "+progress+"%</i></summary><div class='ptm-contract-body'>"+
 "<div class='mini-kpis'><div><span>OBJECTIVE</span><b>"+String(p.objective).replaceAll("_"," ").toUpperCase()+"</b></div><div><span>SCOPE</span><b>"+String(p.scope).replaceAll("_"," ").toUpperCase()+"</b></div><div><span>COST SHARE</span><b>"+p.playerSharePct+"% / "+p.partnerSharePct+"%</b></div><div><span>IP OWNERSHIP</span><b>"+p.ownership.player+"% / "+p.ownership.partner+"%</b></div><div><span>CAPACITY RIGHTS</span><b>"+p.capacityAllocation.player+"% / "+p.capacityAllocation.partner+"%</b></div><div><span>PROGRAM RISK</span><b>"+p.programRisk+"</b></div><div><span>PLAYER SPEND</span><b>"+money(p.playerSpent)+"</b></div><div><span>DAYS LEFT</span><b>"+Math.ceil(num(p.daysRemaining))+"</b></div></div>"+
 "<div class='process-bar'><i style='width:"+progress+"%'></i></div>"+
 "<div class='jv-terms'><span>Tooling: <b>"+String(p.toolingResponsibility).replaceAll("_"," ")+"</b></span><span>Governance: <b>"+String(p.governance).replaceAll("_"," ")+"</b></span><span>Exclusivity: <b>"+String(p.exclusivityMode).replaceAll("_"," ")+"</b></span><span>Variant rights: <b>"+String(p.variantRights).replaceAll("_"," ")+"</b></span></div>"+
 "<p class='muted'>"+p.exitClause+"</p>"+
 (p.status==="active"?"<button class='btn secondary' data-jv-exit='"+p.id+"'>EXIT JOINT PROGRAM</button>":"")+
 "</div></details>";
}

function supplyContractRow(kind,c){
 const name=kind==="engine"?c.engineName:c.transmissionName;
 return"<details class='ptm-contract-row'><summary><span><b>"+name+"</b><small>"+kind.toUpperCase()+" • "+c.buyerName+"</small></span><i>"+num(c.monthlyUnits).toLocaleString()+"/mo • "+money(c.unitPrice)+" ea</i></summary><div class='ptm-contract-body'>"+
 termBadges(c)+
 "<div class='mini-kpis'><div><span>UNIT PRICE</span><b>"+money(c.unitPrice)+"</b></div><div><span>TERM</span><b>"+c.termMonths+" mo</b></div><div><span>TOOLING CONTRIBUTION</span><b>"+money(c.toolingContribution)+"</b></div><div><span>BACKLOG</span><b>"+num(c.backlog).toLocaleString()+"</b></div></div>"+
 "</div></details>";
}

function renderSupplement(state,root,h={}){
 ensure(state);
 generateLicenseOffers(state,h.log||(()=>{}));
 generateJointOffers(state,h.log||(()=>{}));

 const pm=state.powertrainMarket;
 const activeSupply=[
  ...(state.engineSupply?.contracts||[]).filter(x=>x.status==="active").map(c=>({kind:"engine",c})),
  ...(state.transmissionSupply?.contracts||[]).filter(x=>x.status==="active").map(c=>({kind:"transmission",c}))
 ];
 const openLic=pm.licenseOffers.filter(x=>x.status==="open");
 const activeLic=pm.licenses.filter(x=>["tooling","active"].includes(x.status));
 const activeJv=pm.jointPrograms.filter(x=>["active","complete","terminated"].includes(x.status)).slice(-10).reverse();
 const jvOffers=pm.jointOffers.filter(x=>x.status==="open");
 const engCat=inboundCatalog(state,"engine").slice(0,5);
 const txCat=inboundCatalog(state,"transmission").slice(0,5);
 const partners=(state.industry||[]).filter(activeMaker).slice().sort((a,b)=>num(b.valuation)-num(a.valuation)).slice(0,20);
 const bases=[
  ...(state.engines||[]).filter(e=>e.releaseStatus!=="development").map(x=>({kind:"engine",id:x.id,name:x.name})),
  ...(state.transmissions||[]).filter(t=>t.releaseStatus!=="development").map(x=>({kind:"transmission",id:x.id,name:x.name}))
 ];

 const supplyRows=activeSupply.length
  ?activeSupply.map(({kind,c})=>supplyContractRow(kind,c)).join("")
  :"<div class='empty-library'>No active OEM powertrain supply contracts.</div>";

 const licenseRequests=openLic.length
  ?"<div class='ptm-grid'>"+openLic.map(licenseOfferCard).join("")+"</div>"
  :"<div class='empty-library'>No OEM licensing proposals are waiting.</div>";

 const inboundRows=[...engCat,...txCat].length
  ?"<div class='ptm-grid'>"+[...engCat,...txCat].map(x=>"<article class='ptm-card'><span class='tag'>"+x.kind.toUpperCase()+" • "+x.seller.name+"</span><h3>"+x.src.name+"</h3><div class='mini-kpis'><div><span>BUY COMPLETE EQUIV.</span><b>"+money(x.finishedCost)+"/unit</b></div><div><span>LOCAL BUILD + ROYALTY</span><b>"+money(x.localCost)+"/unit</b></div><div><span>UPFRONT</span><b>"+money(x.terms.upfrontFee)+"</b></div><div><span>TOOLING</span><b>"+money(x.terms.toolingBudget)+"</b></div></div><button class='btn secondary wide' data-lic-in='"+x.kind+":"+x.seller.id+":"+x.src.id+"'>LICENSE DESIGN</button></article>").join("")+"</div>"
  :"<div class='empty-library'>No rival designs are currently available to license.</div>";

 const licensePortfolio=activeLic.length
  ?"<div class='ptm-grid'>"+activeLic.map(licenseRow).join("")+"</div>"
  :"<div class='empty-library'>No active licenses.</div>";

 const proposalRows=jvOffers.length
  ?"<div class='ptm-grid'>"+jvOffers.map(o=>"<article class='ptm-card'><span class='tag'>JV PROPOSAL • "+o.partnerName+"</span><h3>"+o.sourceName+" Next Generation</h3><p class='muted'>Partner proposes "+o.playerSharePct+"% player cost share on a "+money(o.totalBudget)+" development program.</p><div class='offer-actions'><button class='btn hero' data-jv-accept='"+o.id+"'>ACCEPT JV</button><button class='btn secondary' data-jv-decline='"+o.id+"'>DECLINE</button></div></article>").join("")+"</div>"
  :"<div class='empty-library'>No partner proposals are waiting.</div>";

 const programRows=activeJv.length
  ?"<div class='ptm-contract-stack'>"+activeJv.map(jvCard).join("")+"</div>"
  :"<div class='empty-library'>No joint programs yet.</div>";

 const html=
 "<section class='ptm-system'>"+
  "<div class='budget-section-head'><div><span class='eyebrow'>POWERTRAIN PARTNERSHIPS</span><h3>Contracts, Licensing & Joint Development</h3><p class='muted ptm-intro'>Three different business systems: supply complete components, license design rights, or co-develop new technology with another manufacturer.</p></div><span class='tag'>ALL SECTIONS COLLAPSED BY DEFAULT</span></div>"+

  "<details class='ptm-drop'><summary><span><b>SUPPLY CONTRACTS</b><small>You physically manufacture and deliver engines or transmissions to another automaker.</small></span><i>"+activeSupply.length+" ACTIVE</i></summary><div class='ptm-body'>"+
   "<details class='ptm-subdrop'><summary><span><b>HOW SUPPLY CONTRACTS WORK</b><small>You keep manufacturing responsibility; the buyer pays per delivered unit.</small></span><i>INFO</i></summary><div class='ptm-subbody'><p class='muted'>A supply contract means another company is buying finished engines or transmissions from you. Revenue only arrives when real components are produced and delivered. Capacity reservations, quality targets, tooling contributions, penalties, warranty responsibility and exclusivity all matter.</p></div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>ACTIVE SUPPLY AGREEMENTS</b><small>Current OEM engine and transmission delivery deals.</small></span><i>"+activeSupply.length+"</i></summary><div class='ptm-subbody'><div class='ptm-contract-stack'>"+supplyRows+"</div></div></details>"+
  "</div></details>"+

  "<details class='ptm-drop'><summary><span><b>DESIGN LICENSING</b><small>Sell or buy legal rights to manufacture a powertrain design without shipping every finished unit.</small></span><i>"+activeLic.length+" ACTIVE</i></summary><div class='ptm-body'>"+
   "<details class='ptm-subdrop'><summary><span><b>ROYALTY DASHBOARD</b><small>Income, expense and lifetime licensing performance.</small></span><i>FINANCE</i></summary><div class='ptm-subbody'><div class='sim-summary'><div><span>LAST ROYALTY INCOME</span><b>"+money(pm.lastRoyaltyIncome)+"</b></div><div><span>LAST ROYALTY EXPENSE</span><b>"+money(pm.lastRoyaltyExpense)+"</b></div><div><span>LIFETIME LICENSE INCOME</span><b>"+money(pm.lifetimeRoyaltyIncome)+"</b></div></div></div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>WHAT LICENSING MEANS</b><small>The other company builds the design itself and pays for the rights.</small></span><i>INFO</i></summary><div class='ptm-subbody'><p class='muted'>Licensing is different from a supply contract. You are selling the right to use a design or buying that right from somebody else. The licensee usually pays an upfront fee plus royalties per unit and handles its own local tooling and production. The agreement controls term, volume limits, modification rights, quality standards and architecture restrictions.</p></div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>OEM LICENSE REQUESTS</b><small>Companies asking to license one of your designs.</small></span><i>"+openLic.length+"</i></summary><div class='ptm-subbody'>"+licenseRequests+"</div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>LICENSE A RIVAL DESIGN</b><small>Acquire production rights instead of buying complete components.</small></span><i>"+(engCat.length+txCat.length)+" OPTIONS</i></summary><div class='ptm-subbody'>"+inboundRows+"</div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>LICENSE PORTFOLIO</b><small>Active inbound and outbound design licenses.</small></span><i>"+activeLic.length+"</i></summary><div class='ptm-subbody'>"+licensePortfolio+"</div></details>"+
  "</div></details>"+

  "<details class='ptm-drop'><summary><span><b>JOINT DEVELOPMENT</b><small>Co-fund and co-own a next-generation engine or transmission program with another automaker.</small></span><i>"+pm.jointPrograms.filter(x=>x.status==="active").length+" ACTIVE</i></summary><div class='ptm-body'>"+
   "<details class='ptm-subdrop'><summary><span><b>HOW JOINT DEVELOPMENT WORKS</b><small>Negotiate cost, IP, capacity, tooling, scope, objective and exclusivity.</small></span><i>INFO</i></summary><div class='ptm-subbody'><p class='muted'>A joint-development program creates a new shared powertrain generation instead of simply buying or licensing an existing one. Both companies fund engineering over time. You can negotiate who pays more, who controls more IP, who receives more production capacity, whether one side gets early exclusivity, who handles tooling and whether the project is an evolution, major revision or clean-sheet program.</p></div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>PARTNER PROPOSALS</b><small>Incoming shared-development offers from other manufacturers.</small></span><i>"+jvOffers.length+"</i></summary><div class='ptm-subbody'>"+proposalRows+"</div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>NEGOTIATE NEW JOINT PROGRAM</b><small>Build the agreement before engineering starts.</small></span><i>CREATE</i></summary><div class='ptm-subbody'>"+
    "<div class='jv-editor jv-editor-expanded'>"+
     "<label>PARTNER<select data-ptm-field='ptmJvPartner'>"+partners.map(p=>"<option value='"+p.id+"'>"+p.name+"</option>").join("")+"</select></label>"+
     "<label>BASE POWERTRAIN<select data-ptm-field='ptmJvBase'>"+bases.map(b=>"<option value='"+b.kind+":"+b.id+"'>"+b.name+" • "+b.kind+"</option>").join("")+"</select></label>"+
     "<label>PROGRAM OBJECTIVE<select data-ptm-field='ptmJvObjective'><option value='balanced'>Balanced</option><option value='performance'>Performance</option><option value='efficiency'>Efficiency</option><option value='reliability'>Reliability</option><option value='cost'>Cost Reduction</option></select></label>"+
     "<label>PROGRAM SCOPE<select data-ptm-field='ptmJvScope'><option value='evolution'>Evolution</option><option value='major_revision' selected>Major Revision</option><option value='clean_sheet'>Clean Sheet</option></select></label>"+
     "<label>IP CONTROL<select data-ptm-field='ptmJvIp'><option value='proportional'>Proportional to cost share</option><option value='equal'>50 / 50</option><option value='player_lead'>Player-led IP</option><option value='partner_lead'>Partner-led IP</option></select></label>"+
     "<label>TOOLING RESPONSIBILITY<select data-ptm-field='ptmJvTooling'><option value='shared'>Shared</option><option value='player'>Player-led tooling</option><option value='partner'>Partner-led tooling</option></select></label>"+
     "<label>EXCLUSIVITY<select data-ptm-field='ptmJvExclusivity'><option value='shared_nonexclusive'>Shared / non-exclusive</option><option value='player_first_36m'>Player first 36 months</option><option value='partner_first_36m'>Partner first 36 months</option></select></label>"+
     "<label>VARIANT RIGHTS<select data-ptm-field='ptmJvVariants'><option value='shared_all'>Shared all variants</option><option value='player_performance'>Player performance rights</option><option value='partner_efficiency'>Partner efficiency rights</option></select></label>"+
     "<label>YOUR COST SHARE <b data-ptm-field='ptmJvShareRead'>50%</b><input data-ptm-field='ptmJvShare' class='management-range' type='range' min='25' max='75' step='5' value='50'></label>"+
     "<label>YOUR CAPACITY RIGHTS <b data-ptm-field='ptmJvCapacityRead'>50%</b><input data-ptm-field='ptmJvCapacity' class='management-range' type='range' min='20' max='80' step='5' value='50'></label>"+
     "<div data-ptm-field='ptmJvPreview' class='jv-preview'></div>"+
     "<button data-ptm-field='ptmStartJv' class='btn hero' "+(!partners.length||!bases.length?"disabled":"")+">SIGN & START JOINT PROGRAM</button>"+
    "</div>"+
   "</div></details>"+
   "<details class='ptm-subdrop'><summary><span><b>JOINT PROGRAM PORTFOLIO</b><small>Active, completed and terminated shared-development programs.</small></span><i>"+activeJv.length+"</i></summary><div class='ptm-subbody'>"+programRows+"</div></details>"+
  "</div></details>"+
 "</section>";

 root.insertAdjacentHTML("beforeend",html);
 wire(root,state,h);
}

function wire(root,state,h={}){
 const log=h.log||(()=>{}),save=h.save||(()=>{}),rerender=h.rerender||(()=>{}),toast=h.toast||(()=>{});

 root.querySelectorAll("[data-lic-accept]").forEach(b=>b.onclick=()=>{const x=acceptOutboundLicenseOffer(state,b.dataset.licAccept,log);if(!x){toast("License could not be funded or is no longer available.");return;}save();rerender();});
 root.querySelectorAll("[data-lic-decline]").forEach(b=>b.onclick=()=>{declineLicenseOffer(state,b.dataset.licDecline);save();rerender();});
 root.querySelectorAll("[data-lic-in]").forEach(b=>b.onclick=()=>{const [kind,seller,source]=b.dataset.licIn.split(":");const x=acceptInboundLicense(state,kind,seller,source,log);if(!x){toast("Need more cash or that license is already active.");return;}save();rerender();});
 root.querySelectorAll("[data-jv-accept]").forEach(b=>b.onclick=()=>{const x=acceptJointOffer(state,b.dataset.jvAccept,log);if(!x){toast("JV could not be funded.");return;}save();rerender();});
 root.querySelectorAll("[data-jv-decline]").forEach(b=>b.onclick=()=>{declineJointOffer(state,b.dataset.jvDecline);save();rerender();});
 root.querySelectorAll("[data-jv-exit]").forEach(b=>b.onclick=()=>{if(exitJointProgram(state,b.dataset.jvExit,"player",log)){save();rerender();}});

 const share=root.querySelector("[data-ptm-field='ptmJvShare']");
 const shareRead=root.querySelector("[data-ptm-field='ptmJvShareRead']");
 const capacity=root.querySelector("[data-ptm-field='ptmJvCapacity']");
 const capacityRead=root.querySelector("[data-ptm-field='ptmJvCapacityRead']");
 const preview=root.querySelector("[data-ptm-field='ptmJvPreview']");

 const updatePreview=()=>{
  if(share&&shareRead)shareRead.textContent=share.value+"%";
  if(capacity&&capacityRead)capacityRead.textContent=capacity.value+"%";
  if(!preview)return;

  const partnerId=root.querySelector("[data-ptm-field='ptmJvPartner']")?.value;
  const raw=root.querySelector("[data-ptm-field='ptmJvBase']")?.value||"";
  const cut=raw.indexOf(":");
  const kind=raw.slice(0,cut),sourceId=raw.slice(cut+1);
  const partner=(state.industry||[]).find(x=>x.id===partnerId);
  const src=kind==="engine"?engineSourceFromPlayer(state,sourceId):transmissionSourceFromPlayer(state,sourceId);
  if(!partner||!src){preview.innerHTML="<span>Select a partner and base powertrain.</span>";return;}

  const objective=root.querySelector("[data-ptm-field='ptmJvObjective']")?.value||"balanced";
  const scope=root.querySelector("[data-ptm-field='ptmJvScope']")?.value||"major_revision";
  const tooling=root.querySelector("[data-ptm-field='ptmJvTooling']")?.value||"shared";
  const ip=root.querySelector("[data-ptm-field='ptmJvIp']")?.value||"proportional";
  const pct=num(share?.value,50);

  const scopeBudget={evolution:.82,major_revision:1,clean_sheet:1.38}[scope]||1;
  const scopeDays={evolution:.80,major_revision:1,clean_sheet:1.28}[scope]||1;
  const objectiveBudget={balanced:1,performance:1.14,efficiency:1.10,reliability:1.08,cost:.94}[objective]||1;
  const toolingBudget=tooling==="player"?1.08:tooling==="partner"?.94:1;
  const budget=Math.max(750000,Math.round(jvBudget(state,kind,src,partner)*scopeBudget*objectiveBudget*toolingBudget/10000)*10000);
  const days=Math.max(75,Math.round((kind==="engine"?150:125)*scopeDays));

  let playerIp=pct;
  if(ip==="equal")playerIp=50;
  if(ip==="player_lead")playerIp=Math.max(60,pct);
  if(ip==="partner_lead")playerIp=Math.min(40,pct);

  preview.innerHTML="<div><span>EST. PROGRAM</span><b>"+money(budget)+"</b></div><div><span>YOUR COMMITMENT</span><b>"+money(budget*pct/100)+"</b></div><div><span>DURATION</span><b>"+days+" days</b></div><div><span>IP OWNERSHIP</span><b>"+playerIp+"% / "+(100-playerIp)+"%</b></div>";
 };

 [share,capacity,root.querySelector("[data-ptm-field='ptmJvPartner']"),root.querySelector("[data-ptm-field='ptmJvBase']"),root.querySelector("[data-ptm-field='ptmJvObjective']"),root.querySelector("[data-ptm-field='ptmJvScope']"),root.querySelector("[data-ptm-field='ptmJvIp']"),root.querySelector("[data-ptm-field='ptmJvTooling']"),root.querySelector("[data-ptm-field='ptmJvExclusivity']"),root.querySelector("[data-ptm-field='ptmJvVariants']")].filter(Boolean).forEach(el=>{el.addEventListener("input",updatePreview);el.addEventListener("change",updatePreview);});
 updatePreview();

 root.querySelector("[data-ptm-field='ptmStartJv']")?.addEventListener("click",()=>{
  const partner=root.querySelector("[data-ptm-field='ptmJvPartner']")?.value;
  const raw=root.querySelector("[data-ptm-field='ptmJvBase']")?.value||"";
  const cut=raw.indexOf(":");
  const kind=raw.slice(0,cut),src=raw.slice(cut+1);
  const pct=num(root.querySelector("[data-ptm-field='ptmJvShare']")?.value,50);
  const options={
   objective:root.querySelector("[data-ptm-field='ptmJvObjective']")?.value||"balanced",
   scope:root.querySelector("[data-ptm-field='ptmJvScope']")?.value||"major_revision",
   ipModel:root.querySelector("[data-ptm-field='ptmJvIp']")?.value||"proportional",
   toolingResponsibility:root.querySelector("[data-ptm-field='ptmJvTooling']")?.value||"shared",
   exclusivityMode:root.querySelector("[data-ptm-field='ptmJvExclusivity']")?.value||"shared_nonexclusive",
   variantRights:root.querySelector("[data-ptm-field='ptmJvVariants']")?.value||"shared_all",
   capacityPlayerPct:num(root.querySelector("[data-ptm-field='ptmJvCapacity']")?.value,50)
  };
  const p=createJointProgram(state,partner,kind,src,pct,options,log);
  if(!p){toast("JV could not be funded or configured.");return;}
  save();rerender();
 });
}

function runSelfTests(){
 const failures=[],check=(ok,msg)=>{if(!ok)failures.push(msg);};
 const buyer={id:"buyer",name:"Buyer Motor",status:"active",cash:5e7,valuation:1e9,factories:3,dealers:500,monthSales:2400,aiCars:[],aiEngines:[],aiTransmissions:[],aiProjects:[]};
 const seller={id:"seller",name:"Seller Motor",status:"active",cash:5e7,valuation:1e9,factories:3,dealers:400,monthSales:1800,aiCars:[],aiEngines:[{id:"ae",name:"AE20",active:true,config:"I4",cylinders:4,disp:2,hp:140,reliability:88,cost:700,revision:1,redline:6000}],aiTransmissions:[{id:"at",name:"AT6",active:true,type:"6-speed automatic",gears:6,torque:450,efficiency:.94,shift:86,smoothness:88,reliability:87,cost:1200,revision:1,generation:1}]};
 const state={campaignId:"ptm-test",year:2005,month:2,day:5,difficulty:"normal",hq:"usa",company:"Player Motor",cash:1e8,valuation:2e9,industry:[buyer,seller],engines:[{id:"e",name:"Player I4",revision:2,releaseStatus:"released",design:{config:"I4",head:"dohc",aspiration:"na",compression:10,redline:6500},stats:{hp:180,torque:170,rel:90,cost:900,disp:2,mass:330}}],transmissions:[{id:"t",name:"Player 6M",revision:2,generation:1,releaseStatus:"released",type:"Manual",gears:6,torque:420,eff:.96,reliability:91,shift:75,cost:950,smoothness:65,serviceability:80,heatTolerance:84,drivetrainCompat:["RWD"],layoutCompat:["longitudinal"]}],engineSupply:{offers:[],contracts:[]},transmissionSupply:{offers:[],contracts:[]},operations:{factories:[{id:"plant",name:"Plant",status:"operating",workers:1000,shifts:2,maintenance:1,shops:{powertrain:1000}}]},vehicles:[]};
 ensure(state);
 const c={id:"c1",buyerId:buyer.id,buyerName:buyer.name,engineId:"e",engineName:"Player I4",monthlyUnits:500,unitPrice:1400,termMonths:36,status:"active",mtdDelivered:100};enrichTerms(state,"engine",c);check(c.capacityReservation>=500&&c.qualityRequirement>0&&c.deliveryPenalty>0,"System 090 terms were not populated");
 let r=recordPhysicalDelivery(state,"engine",c,buyer,100,{cumulativeDelivered:100}),r2=recordPhysicalDelivery(state,"engine",c,buyer,100,{cumulativeDelivered:100});check(r.added===100&&r2.duplicate===true&&buyer.externalPowertrainInventory.c1===100,"physical delivery receipt was not idempotent");
 const before=state.cash,bBuyer=buyer.cash;c.toolingContribution=100000;c.developmentContribution=50000;settleContractActivation(state,"engine",c,buyer);settleContractActivation(state,"engine",c,buyer);check(state.cash-before===150000&&bBuyer-buyer.cash===150000,"contract contribution did not settle exactly once");
 const inLic=acceptInboundLicense(state,"engine","seller","ae",()=>{});check(!!inLic&&state.cash<before+150000,"incoming license upfront did not move cash");for(let i=0;i<200&&inLic.status==="tooling";i++)processDay(state,()=>{});check(inLic.status==="active"&&!!inLic.assetId&&(state.engines||[]).some(e=>e.id===inLic.assetId),"incoming engine license did not require tooling and activate a local design");
 const car={id:"v",engineId:inLic.assetId,transmissionId:"t",lastMonthProduced:120,design:{trans:"t"}};state.vehicles=[car];const royaltyBefore=state.cash;settleLicensesMonth(state,()=>{});const once=state.cash;settleLicensesMonth(state,()=>{});check(once<royaltyBefore&&state.cash===once,"license royalty was not based on real units or settled more than once");
 const jv=createJointProgram(state,"buyer","engine","e",50,()=>{});check(!!jv,"JV did not start");const cash0=state.cash,b0=buyer.cash;processDay(state,()=>{});check(state.cash<cash0&&buyer.cash<b0&&jv.playerSpent>0&&jv.partnerSpent>0,"JV did not charge both partners real cash");
 const exitFeeBefore=state.cash;exitJointProgram(state,jv.id,"player",()=>{});check(jv.status==="terminated"&&state.cash<exitFeeBefore&&jv.exitFee>0,"JV player exit consequences did not settle");
 return{ok:!failures.length,failures};
}

window.MDXPowertrainMarket={ensure,enrichTerms,enrichAllSupplyTerms,canOfferComponent,settleContractActivation,recordPhysicalDelivery,settleContractClose,generateLicenseOffers,acceptOutboundLicenseOffer,acceptInboundLicense,declineLicenseOffer,settleLicensesMonth,createJointProgram,exitJointProgram,generateJointOffers,acceptJointOffer,declineJointOffer,processDay,processMonth,renderSupplement,runSelfTests};
})();