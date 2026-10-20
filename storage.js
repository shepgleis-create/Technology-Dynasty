(() => {
"use strict";
const MAIN_KEY="motorDynastyRebuild02",LEGACY_KEY="motorDynastyRebuild01",TEMP_KEY="motorDynastyRebuild02.tmp",RECOVERY_KEY="motorDynastyRebuild02.recovery",META_KEY="motorDynastyRebuild02.meta",CAMPAIGN_ARCHIVE_KEY="motorDynastyRebuild02.campaignArchives",MAX_CAMPAIGN_ARCHIVES=4;
function parse(raw){if(!raw)return null;try{return JSON.parse(raw);}catch{return null;}}
function isRecord(v){return!!v&&typeof v==="object"&&!Array.isArray(v);}
function checksumText(value){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,"0");}
function findNonFinite(value,path="state",errors=[],seen=new Set()){
 if(errors.length>=12||value==null)return errors;
 if(typeof value==="number"&&!Number.isFinite(value)){errors.push(path+" must be finite");return errors;}
 if(typeof value!=="object")return errors;if(seen.has(value))return errors;seen.add(value);
 if(Array.isArray(value)){for(let i=0;i<value.length&&errors.length<12;i++)findNonFinite(value[i],path+"["+i+"]",errors,seen);}
 else for(const [key,nested] of Object.entries(value))if(errors.length<12)findNonFinite(nested,path+"."+key,errors,seen);
 return errors;
}
function validateState(s,options={}){
 const errors=[],warnings=[],strict=options.strict===true;
 if(!s||typeof s!=="object"||Array.isArray(s))errors.push("State must be an object");
 if(s&&(!String(s.company||"").trim()||String(s.company).length>200))errors.push("Invalid company");
 const year=Number(s?.year),month=Number(s?.month),day=Number(s?.day);
 if(!Number.isFinite(year)||year<1800||year>3000)errors.push("Invalid year");
 if(!Number.isFinite(month)||month<0||month>11)errors.push("Invalid month");
 if(!Number.isFinite(day)||day<1||day>30)errors.push("Invalid day");
 for(const k of ["cash","debt","factories","saveRevision","saveSchemaVersion","version"]){if(s&&s[k]!=null&&!Number.isFinite(Number(s[k])))errors.push("Invalid "+k);}
 if(s&&s.factories!=null&&Number(s.factories)<0)errors.push("Invalid factories");
 const arrays=["vehicles","engines","transmissions","subsidiaries","industry","corporateUnits","pendingDeals","integrations","products","contracts","executives","automationRules","nameplates","conceptPrograms","modelActions","engineActions","platformPrograms","engineFamilies","engineCalibrationPrograms","engineToolingProjects","transmissionFamilies","transmissionToolingProjects","powertrainAdapterProjects"];
 for(const k of arrays)if(s&&s[k]!=null&&!Array.isArray(s[k]))errors.push(k+" must be an array");
 for(const k of ["operations","engineSupply","transmissionSupply","productPlanning","automation","powertrainMarket","electrification","customerMarket","marketQuality","industrialEra","commercialExpansion","engineeringExpansion"]){if(s&&s[k]!=null&&!isRecord(s[k]))errors.push(k+" must be an object");}if(isRecord(s?.powertrainMarket)){for(const k of ["deliveryReceipts","licenseOffers","licenses","jointOffers","jointPrograms","cashLedger"])if(s.powertrainMarket[k]!=null&&!Array.isArray(s.powertrainMarket[k]))errors.push("powertrainMarket."+k+" must be an array");}if(isRecord(s?.electrification)){if(s.electrification.batteryPacks!=null&&!Array.isArray(s.electrification.batteryPacks))errors.push("electrification.batteryPacks must be an array");if(s.electrification.regions!=null&&!isRecord(s.electrification.regions))errors.push("electrification.regions must be an object");if(s.electrification.batterySupply!=null&&!isRecord(s.electrification.batterySupply))errors.push("electrification.batterySupply must be an object");}if(isRecord(s?.customerMarket)){if(s.customerMarket.regions!=null&&!isRecord(s.customerMarket.regions))errors.push("customerMarket.regions must be an object");if(s.customerMarket.totals!=null&&!isRecord(s.customerMarket.totals))errors.push("customerMarket.totals must be an object");if(s.customerMarket.lastMonth!=null&&!isRecord(s.customerMarket.lastMonth))errors.push("customerMarket.lastMonth must be an object");if(s.customerMarket.segments!=null&&!Array.isArray(s.customerMarket.segments))errors.push("customerMarket.segments must be an array");}
 if(isRecord(s?.industrialEra)){
  for(const k of ["projects","campaigns","history","snapshots","milestones"]){if(s.industrialEra[k]!=null&&!Array.isArray(s.industrialEra[k]))errors.push("industrialEra."+k+" must be an array");}
  for(const k of ["policy","ui"]){if(s.industrialEra[k]!=null&&!isRecord(s.industrialEra[k]))errors.push("industrialEra."+k+" must be an object");}
 }
 if(isRecord(s?.commercialExpansion)){
  for(const k of ["jobs","research","plans","monthly","history"]){if(s.commercialExpansion[k]!=null&&!Array.isArray(s.commercialExpansion[k]))errors.push("commercialExpansion."+k+" must be an array");}
  for(const k of ["policy","ui"]){if(s.commercialExpansion[k]!=null&&!isRecord(s.commercialExpansion[k]))errors.push("commercialExpansion."+k+" must be an object");}
 }
 if(isRecord(s?.engineeringExpansion)){
  for(const k of ["projects","briefs","boardTargets","supplierReports","qualifications","history","monthly"]){if(s.engineeringExpansion[k]!=null&&!Array.isArray(s.engineeringExpansion[k]))errors.push("engineeringExpansion."+k+" must be an array");}
  for(const k of ["facilities","policy","ui","supplyPolicies","qualityPolicies"]){if(s.engineeringExpansion[k]!=null&&!isRecord(s.engineeringExpansion[k]))errors.push("engineeringExpansion."+k+" must be an object");}
 }
 if(isRecord(s?.operations)){
  for(const k of ["factories","projects"]){if(s.operations[k]!=null&&!Array.isArray(s.operations[k]))errors.push("operations."+k+" must be an array");}
  if(s.operations.suppliers!=null&&!isRecord(s.operations.suppliers))errors.push("operations.suppliers must be an object");
 }
 for(const domain of ["engineSupply","transmissionSupply"]){const value=s?.[domain];if(isRecord(value))for(const k of ["offers","contracts","purchaseContracts"]){if(value[k]!=null&&!Array.isArray(value[k]))errors.push(domain+"."+k+" must be an array");}}
 if(strict&&s){
  findNonFinite(s,"state",errors);
  for(const k of arrays){const rows=s[k];if(!Array.isArray(rows))continue;const ids=new Set();for(const row of rows){if(!isRecord(row))continue;const id=String(row.id||"").trim();if(!id)continue;if(ids.has(id)){warnings.push(k+" contains duplicate id "+id);break;}ids.add(id);}}
 }
 return{ok:errors.length===0,errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function metaFromState(s,updatedAt,source,encoded=null){return{source,updatedAt:updatedAt||s?.lastLocalSaveAt||null,campaignId:s?.campaignId||null,revision:Number(s?.saveRevision||0),company:s?.company||"",year:Number(s?.year||0),month:Number(s?.month||0),schemaVersion:Number(s?.saveSchemaVersion||0),gameVersion:Number(s?.version||0),byteLength:typeof encoded==="string"?encoded.length:null,checksum:typeof encoded==="string"?checksumText(encoded):null};}
function campaignIdentity(s){const id=String(s?.campaignId||"").trim();return id?"id:"+id:"legacy:"+String(s?.company||"").trim().toLowerCase();}
function readCampaignArchives(storage){const rows=parse(storage.getItem(CAMPAIGN_ARCHIVE_KEY));return(Array.isArray(rows)?rows:[]).filter(x=>x&&x.id&&x.state&&validateState(x.state).ok);}
function writeCampaignArchives(storage,rows){const safe=rows.slice(0,MAX_CAMPAIGN_ARCHIVES);try{storage.setItem(CAMPAIGN_ARCHIVE_KEY,JSON.stringify(safe));return true;}catch(e){try{storage.setItem(CAMPAIGN_ARCHIVE_KEY,JSON.stringify(safe.slice(0,1)));return true;}catch{return false;}}}
function archiveCampaignSnapshot(storage,state,reason="campaign-switch"){
 const valid=validateState(state);if(!valid.ok)return null;const snapshot=JSON.parse(JSON.stringify(state)),identity=campaignIdentity(snapshot),savedAt=new Date().toISOString(),meta=metaFromState(snapshot,savedAt,"campaign-archive"),id="campaign_archive_"+String(snapshot.campaignId||snapshot.company||"legacy").replace(/[^a-z0-9_-]+/gi,"_")+"_"+Date.now();
 let rows=readCampaignArchives(storage).filter(x=>String(x.identity||campaignIdentity(x.state))!==identity);rows.unshift({id,identity,savedAt,reason,meta,state:snapshot});if(!writeCampaignArchives(storage,rows))return null;return{id,...meta,reason,savedAt};
}

const VAULT_DB="motorDynastySaveVault",VAULT_STORE="snapshots",ACTIVE_STORE="activeSave",VAULT_VERSION=3,MAX_VAULT_SNAPSHOTS=20,MAX_VAULT_PER_CAMPAIGN=4,VAULT_META_KEY="motorDynastyRebuild02.vaultMeta",ACTIVE_ID="current",ACTIVE_BACKUP_ID="previous",DEVICE_CACHE="motor-dynasty-device-save-v1",CACHE_ACTIVE_URL="/__motor_dynasty_save__/active",CACHE_BACKUP_URL="/__motor_dynasty_save__/previous";
function openVaultDb(){return new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(new Error("IndexedDB unavailable"));return;}const req=indexedDB.open(VAULT_DB,VAULT_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(VAULT_STORE))db.createObjectStore(VAULT_STORE,{keyPath:"id"});if(!db.objectStoreNames.contains(ACTIVE_STORE))db.createObjectStore(ACTIVE_STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("IndexedDB open failed"));});}
function vaultRequest(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("IndexedDB request failed"));});}
function stateMetaComparable(s,source="unknown"){return metaFromState(s,s?.lastLocalSaveAt||null,source);}
function preferStateCandidate(current,candidate){
 if(!candidate)return false;if(!current)return true;
 const a=stateMetaComparable(current.state||current,current.source||"current"),b=stateMetaComparable(candidate.state||candidate,candidate.source||"candidate"),same=!!a.campaignId&&a.campaignId===b.campaignId;
 if(same&&b.revision!==a.revision)return b.revision>a.revision;
 const at=timestamp(a.updatedAt),bt=timestamp(b.updatedAt);if(bt!==at)return bt>at;
 if(!same&&b.revision!==a.revision)return b.revision>a.revision;
 return false;
}
function durableRowCandidate(row,source="indexeddb-active"){
 if(!row?.state)return null;const valid=validateState(row.state,{strict:true});if(!valid.ok)return null;
 let encoded="";try{encoded=JSON.stringify(row.state);}catch{return null;}
 if(row.meta?.checksum&&row.meta.checksum!==checksumText(encoded))return null;
 const state=JSON.parse(encoded),meta={...(row.meta||metaFromState(state,row.savedAt,source,encoded)),source};
 return{state,meta,reason:row.reason||null,slot:row.id||null,source};
}
function chooseDurableActive(rows=[]){
 let chosen=null;for(const row of rows){const source=row?.id===ACTIVE_BACKUP_ID?"indexeddb-previous":"indexeddb-active",candidate=durableRowCandidate(row,source);if(candidate&&(!chosen||preferStateCandidate(chosen,candidate)))chosen=candidate;}return chosen;
}
async function readActiveRows(db){
 const tx=db.transaction(ACTIVE_STORE,"readonly"),store=tx.objectStore(ACTIVE_STORE),[current,previous]=await Promise.all([vaultRequest(store.get(ACTIVE_ID)),vaultRequest(store.get(ACTIVE_BACKUP_ID))]);return[current,previous].filter(Boolean);
}
async function putActiveDurable(state,reason="autosave",prepared=null){
 const encoded=prepared?.encoded||JSON.stringify(state),snapshot=prepared?.snapshot||parse(encoded),valid=prepared?.valid||validateState(snapshot,{strict:true});if(!snapshot||!valid.ok)throw new Error(valid?.errors?.join("; ")||"Invalid durable save snapshot");
 const savedAt=snapshot.lastLocalSaveAt||new Date().toISOString(),row={id:ACTIVE_ID,state:snapshot,reason,savedAt,meta:metaFromState(snapshot,savedAt,"indexeddb-active",encoded)};
 const db=await openVaultDb();
 try{
  const rows=await readActiveRows(db),prior=rows.find(x=>x?.id===ACTIVE_ID),tx=db.transaction(ACTIVE_STORE,"readwrite"),store=tx.objectStore(ACTIVE_STORE);
  if(prior&&durableRowCandidate(prior,"indexeddb-active"))store.put({...prior,id:ACTIVE_BACKUP_ID,reason:"previous-before-"+reason,meta:{...(prior.meta||{}),source:"indexeddb-previous"}});
  store.put(row);
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("IndexedDB active-save write failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB active-save write aborted"));});
  const verifyRows=await readActiveRows(db),verified=durableRowCandidate(verifyRows.find(x=>x?.id===ACTIVE_ID),"indexeddb-active");
  if(!verified||String(verified.meta?.campaignId||"")!==String(row.meta.campaignId||"")||Number(verified.meta?.revision||0)!==Number(row.meta.revision||0)||verified.meta?.checksum!==row.meta.checksum)throw new Error("IndexedDB active-save verification failed");
  return row.meta;
 }finally{db.close();}
}
async function putActiveDurableFast(state,reason="autosave"){
 const valid=validateState(state);if(!valid.ok)throw new Error(valid.errors.join("; "));
 const savedAt=state.lastLocalSaveAt||new Date().toISOString(),meta=metaFromState(state,savedAt,"indexeddb-active"),row={id:ACTIVE_ID,state,reason,savedAt,meta};
 const db=await openVaultDb();
 try{
  const rows=await readActiveRows(db),prior=rows.find(x=>x?.id===ACTIVE_ID),tx=db.transaction(ACTIVE_STORE,"readwrite"),store=tx.objectStore(ACTIVE_STORE);
  if(prior?.state)store.put({...prior,id:ACTIVE_BACKUP_ID,reason:"previous-before-"+reason,meta:{...(prior.meta||{}),source:"indexeddb-previous"}});
  store.put(row);
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("IndexedDB fast-save write failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB fast-save write aborted"));});
  return meta;
 }finally{db.close();}
}
async function loadActiveDurable(){
 const db=await openVaultDb();try{return chooseDurableActive(await readActiveRows(db));}finally{db.close();}
}
async function deleteActiveDurable(){const db=await openVaultDb(),tx=db.transaction(ACTIVE_STORE,"readwrite"),store=tx.objectStore(ACTIVE_STORE);store.delete(ACTIVE_ID);store.delete(ACTIVE_BACKUP_ID);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("IndexedDB active-save delete failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB active-save delete aborted"));});db.close();return true;}
function cacheDurableCandidate(raw,source="cache-active"){
 const row=typeof raw==="string"?parse(raw):raw;if(!row?.state)return null;const valid=validateState(row.state,{strict:true});if(!valid.ok)return null;
 let encoded="";try{encoded=JSON.stringify(row.state);}catch{return null;}if(row.meta?.checksum&&row.meta.checksum!==checksumText(encoded))return null;
 const state=JSON.parse(encoded),meta={...(row.meta||metaFromState(state,row.savedAt,source,encoded)),source};return{state,meta,reason:row.reason||null,slot:row.slot||null,source};
}
function chooseCacheDurable(rows=[]){
 let chosen=null;for(const row of rows){const candidate=cacheDurableCandidate(row,row?.slot==="previous"?"cache-previous":"cache-active");if(candidate&&(!chosen||preferStateCandidate(chosen,candidate)))chosen=candidate;}return chosen;
}
async function loadCacheRows(){
 if(!globalThis.caches)return[];const cache=await caches.open(DEVICE_CACHE),[currentRes,previousRes]=await Promise.all([cache.match(CACHE_ACTIVE_URL),cache.match(CACHE_BACKUP_URL)]),rows=[];
 if(currentRes){const raw=await currentRes.text();const row=parse(raw);if(row)rows.push({...row,slot:"active"});}
 if(previousRes){const raw=await previousRes.text();const row=parse(raw);if(row)rows.push({...row,slot:"previous"});}
 return rows;
}
async function putCacheDurable(state,reason="autosave",prepared=null){
 if(!globalThis.caches)throw new Error("Cache Storage unavailable");const encoded=prepared?.encoded||JSON.stringify(state),snapshot=prepared?.snapshot||parse(encoded),valid=prepared?.valid||validateState(snapshot,{strict:true});if(!snapshot||!valid.ok)throw new Error(valid?.errors?.join("; ")||"Invalid durable save snapshot");
 const savedAt=snapshot.lastLocalSaveAt||new Date().toISOString(),row={slot:"active",state:snapshot,reason,savedAt,meta:metaFromState(snapshot,savedAt,"cache-active",encoded)},cache=await caches.open(DEVICE_CACHE);
 const priorRes=await cache.match(CACHE_ACTIVE_URL);if(priorRes){const priorRaw=await priorRes.text(),prior=parse(priorRaw);if(cacheDurableCandidate(prior,"cache-active"))await cache.put(CACHE_BACKUP_URL,new Response(JSON.stringify({...prior,slot:"previous",reason:"previous-before-"+reason,meta:{...(prior.meta||{}),source:"cache-previous"}}),{headers:{"Content-Type":"application/json"}}));}
 await cache.put(CACHE_ACTIVE_URL,new Response(JSON.stringify(row),{headers:{"Content-Type":"application/json"}}));
 const verifyRes=await cache.match(CACHE_ACTIVE_URL),verified=verifyRes?cacheDurableCandidate(await verifyRes.text(),"cache-active"):null;
 if(!verified||String(verified.meta?.campaignId||"")!==String(row.meta.campaignId||"")||Number(verified.meta?.revision||0)!==Number(row.meta.revision||0)||verified.meta?.checksum!==row.meta.checksum)throw new Error("Cache active-save verification failed");
 return row.meta;
}
async function loadCacheDurable(){return chooseCacheDurable(await loadCacheRows());}
async function deleteCacheDurable(){if(!globalThis.caches)return false;return caches.delete(DEVICE_CACHE);}
async function pruneVault(db){
 const rows=await vaultRequest(db.transaction(VAULT_STORE,"readonly").objectStore(VAULT_STORE).getAll()),sorted=(rows||[]).sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0)),counts=new Map(),keep=new Set();let total=0;
 for(const row of sorted){const ident=String(row.identity||row.campaignId||row.company||"legacy"),n=counts.get(ident)||0;if(n<MAX_VAULT_PER_CAMPAIGN&&total<MAX_VAULT_SNAPSHOTS){keep.add(row.id);counts.set(ident,n+1);total++;}}
 const remove=sorted.filter(row=>!keep.has(row.id));if(!remove.length)return;const tx=db.transaction(VAULT_STORE,"readwrite"),store=tx.objectStore(VAULT_STORE);for(const row of remove)store.delete(row.id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("IndexedDB prune failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB prune aborted"));});
}
function shouldVaultCheckpoint(storage,state){const prior=parse(storage.getItem(VAULT_META_KEY))||{},same=String(prior.campaignId||"")===String(state?.campaignId||""),rev=Math.max(0,Number(state?.saveRevision||0)),priorRev=Math.max(0,Number(prior.revision||0)),age=Date.now()-Number(prior.at||0);return!same||rev-priorRev>=10||age>=300000;}
function markVaultCheckpoint(storage,state){try{storage.setItem(VAULT_META_KEY,JSON.stringify({campaignId:state?.campaignId||null,revision:Math.max(0,Number(state?.saveRevision||0)),at:Date.now()}));}catch{}}
async function putVaultSnapshot(state,reason="checkpoint"){
 const valid=validateState(state);if(!valid.ok)return null;const db=await openVaultDb(),snapshot=JSON.parse(JSON.stringify(state)),savedAt=new Date().toISOString(),identity=campaignIdentity(snapshot),revision=Math.max(0,Number(snapshot.saveRevision||0)),id="vault_"+identity.replace(/[^a-z0-9_-]+/gi,"_")+"_"+revision+"_"+Date.now(),row={id,identity,campaignId:snapshot.campaignId||null,company:snapshot.company||"",year:Number(snapshot.year||0),month:Number(snapshot.month||0),day:Number(snapshot.day||0),revision,savedAt,reason,state:snapshot};
 const tx=db.transaction(VAULT_STORE,"readwrite");tx.objectStore(VAULT_STORE).put(row);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("IndexedDB write failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB write aborted"));});await pruneVault(db);db.close();return{id,campaignId:row.campaignId,company:row.company,year:row.year,month:row.month,day:row.day,revision:row.revision,savedAt,reason};
}
async function listVaultSnapshots(){const db=await openVaultDb(),rows=await vaultRequest(db.transaction(VAULT_STORE,"readonly").objectStore(VAULT_STORE).getAll());db.close();return(rows||[]).sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0)).map(({state,...meta})=>meta);}
async function loadVaultSnapshot(id){const db=await openVaultDb(),row=await vaultRequest(db.transaction(VAULT_STORE,"readonly").objectStore(VAULT_STORE).get(id));db.close();const s=row?.state||null;return s&&validateState(s).ok?JSON.parse(JSON.stringify(s)):null;}
async function loadLatestVaultCandidate(campaignId=null){
 const rows=await listVaultSnapshots(),wanted=campaignId?String(campaignId):null;
 for(const meta of rows){
  if(["storage_test","storage_test_2"].includes(String(meta.campaignId||""))||["Storage Regression","Second Campaign"].includes(String(meta.company||"")))continue;
  if(wanted&&String(meta.campaignId||"")!==wanted)continue;
  const state=await loadVaultSnapshot(meta.id);if(state)return{state,meta:{...meta,source:"indexeddb-checkpoint"}};
 }
 return null;
}
async function cleanupSyntheticVault(){
 try{
  const marker="motorDynastyRebuild02.syntheticCleanupV1";if(globalThis.localStorage?.getItem(marker)==="1")return 0;
  const db=await openVaultDb(),rows=await vaultRequest(db.transaction(VAULT_STORE,"readonly").objectStore(VAULT_STORE).getAll()),synthetic=(rows||[]).filter(r=>["storage_test","storage_test_2"].includes(String(r?.campaignId||""))||["Storage Regression","Second Campaign"].includes(String(r?.company||"")));
  if(synthetic.length){const tx=db.transaction(VAULT_STORE,"readwrite"),store=tx.objectStore(VAULT_STORE);for(const row of synthetic)store.delete(row.id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("Synthetic cleanup failed"));tx.onabort=()=>reject(tx.error||new Error("Synthetic cleanup aborted"));});}
  db.close();globalThis.localStorage?.setItem(marker,"1");return synthetic.length;
 }catch{return 0;}
}
function journalCandidate(raw,source){const state=parse(raw);if(!state||!validateState(state).ok)return null;const savedAt=Date.parse(state.lastLocalSaveAt||"");return{raw,state,source,identity:campaignIdentity(state),revision:Math.max(0,Number(state.saveRevision||0)),savedAt:Number.isFinite(savedAt)?savedAt:0};}
function preferInterruptedCandidate(current,candidate){
 if(!candidate)return false;if(!current)return true;
 if(candidate.identity===current.identity){if(candidate.revision!==current.revision)return candidate.revision>current.revision;return candidate.savedAt>current.savedAt;}
 return candidate.savedAt>0&&candidate.savedAt>current.savedAt;
}
class WebLocalAdapter{
 constructor(storage=globalThis.localStorage,options={}){this.storage=storage;this.enableVault=options.enableVault!==false;}
 reconcileJournal(){
  const main=journalCandidate(this.storage.getItem(MAIN_KEY),"main"),legacy=journalCandidate(this.storage.getItem(LEGACY_KEY),"legacy"),temp=journalCandidate(this.storage.getItem(TEMP_KEY),"temp");let chosen=main||legacy,blockedTemp=false;
  if(preferInterruptedCandidate(chosen,temp)){
   if(main&&main.identity!==temp.identity&&!archiveCampaignSnapshot(this.storage,main.state,"interrupted-campaign-switch"))blockedTemp=true;
   else chosen=temp;
  }
  if(!chosen){try{this.storage.removeItem(META_KEY);}catch{}return{state:null,meta:null,source:null,recovered:false};}
  let recovered=chosen.source!=="main";
  if(recovered){
   try{this.storage.setItem(MAIN_KEY,chosen.raw);if(this.storage.getItem(MAIN_KEY)!==chosen.raw)throw new Error("Journal promotion verification failed");}
   catch{if(main){chosen=main;recovered=false;}else return{state:null,meta:null,source:null,recovered:false};}
  }
  try{this.storage.removeItem(LEGACY_KEY);if(!blockedTemp&&(chosen.source==="temp"||temp&&chosen.source!=="temp"))this.storage.removeItem(TEMP_KEY);}catch{}
  const storedMeta=parse(this.storage.getItem(META_KEY)),updatedAt=chosen.state.lastLocalSaveAt||storedMeta?.updatedAt||null,meta=metaFromState(chosen.state,updatedAt,"local",chosen.raw);
  try{if(JSON.stringify(storedMeta)!==JSON.stringify(meta))this.storage.setItem(META_KEY,JSON.stringify(meta));}catch{}
  return{state:chosen.state,meta,source:chosen.source,recovered};
 }
 save(state,options={}){
  const valid=validateState(state,{strict:true});if(!valid.ok)throw new Error(valid.errors.join("; "));
  const encoded=JSON.stringify(state),roundTrip=parse(encoded),encodedValid=validateState(roundTrip,{strict:true});if(!roundTrip||!encodedValid.ok)throw new Error("Serialized save failed validation: "+encodedValid.errors.join("; "));window.MDXPerf?.record?.("saveBytes",encoded.length,"bytes",{adapter:"web-local"});
  const replaceActiveCampaign=options?.replaceActiveCampaign===true,prior=this.reconcileJournal(),previous=this.storage.getItem(MAIN_KEY),previousState=prior.state;
  if(replaceActiveCampaign){
   try{
    this.storage.setItem(MAIN_KEY,encoded);const committed=this.storage.getItem(MAIN_KEY);if(committed!==encoded||!validateState(parse(committed),{strict:true}).ok)throw new Error("Replacement save verification failed");
   }catch(error){try{if(previous)this.storage.setItem(MAIN_KEY,previous);else this.storage.removeItem(MAIN_KEY);}catch{}throw error;}
   const updatedAt=state.lastLocalSaveAt||new Date().toISOString(),meta=metaFromState(state,updatedAt,"local",encoded);try{this.storage.setItem(META_KEY,JSON.stringify(meta));}catch{}try{this.storage.removeItem(TEMP_KEY);this.storage.removeItem(LEGACY_KEY);this.storage.removeItem(RECOVERY_KEY);this.storage.removeItem(CAMPAIGN_ARCHIVE_KEY);}catch{}
   if(this.enableVault&&previousState&&validateState(previousState).ok&&campaignIdentity(previousState)!==campaignIdentity(state))putVaultSnapshot(previousState,"campaign-replaced").catch(()=>{});if(this.enableVault&&shouldVaultCheckpoint(this.storage,state))putVaultSnapshot(state,"checkpoint").then(()=>markVaultCheckpoint(this.storage,state)).catch(()=>{});return{ok:true,meta,replaced:true,warnings:valid.warnings};
  }
  if(previous&&previous!==encoded&&previousState&&validateState(previousState).ok){
   if(campaignIdentity(previousState)!==campaignIdentity(state)){if(!archiveCampaignSnapshot(this.storage,previousState,"campaign-switch"))throw new Error("Outgoing campaign could not be archived; active save was preserved");}
   else this.storage.setItem(RECOVERY_KEY,previous);
  }
  try{
   this.storage.setItem(TEMP_KEY,encoded);if(this.storage.getItem(TEMP_KEY)!==encoded)throw new Error("Local temporary save verification failed");
   this.storage.setItem(MAIN_KEY,encoded);const committed=this.storage.getItem(MAIN_KEY);if(committed!==encoded||!validateState(parse(committed),{strict:true}).ok)throw new Error("Local committed save verification failed");
  }catch(error){try{if(previous)this.storage.setItem(MAIN_KEY,previous);else this.storage.removeItem(MAIN_KEY);this.storage.removeItem(TEMP_KEY);}catch{}throw error;}
  const updatedAt=state.lastLocalSaveAt||new Date().toISOString(),meta=metaFromState(state,updatedAt,"local",encoded);try{this.storage.setItem(META_KEY,JSON.stringify(meta));}catch{}try{this.storage.removeItem(TEMP_KEY);this.storage.removeItem(LEGACY_KEY);}catch{}
  if(this.enableVault&&previousState&&validateState(previousState).ok&&campaignIdentity(previousState)!==campaignIdentity(state))putVaultSnapshot(previousState,"campaign-switch").catch(()=>{});if(this.enableVault&&shouldVaultCheckpoint(this.storage,state))putVaultSnapshot(state,"checkpoint").then(()=>markVaultCheckpoint(this.storage,state)).catch(()=>{});return{ok:true,meta,warnings:valid.warnings};
 }
 load(){return this.reconcileJournal().state;}
 loadRecovery(){const s=parse(this.storage.getItem(RECOVERY_KEY));return s&&validateState(s).ok?s:null;}
 listCampaignBackups(){return readCampaignArchives(this.storage).map(x=>({id:x.id,reason:x.reason||"campaign-archive",savedAt:x.savedAt||x.meta?.updatedAt||null,...(x.meta||metaFromState(x.state,x.savedAt,"campaign-archive"))}));}
 loadCampaignBackup(id){const row=readCampaignArchives(this.storage).find(x=>x.id===id),s=row?.state||null;return s&&validateState(s).ok?JSON.parse(JSON.stringify(s)):null;}
 archiveCampaign(state,reason="manual-archive"){const local=archiveCampaignSnapshot(this.storage,state,reason);if(this.enableVault)putVaultSnapshot(state,reason).catch(()=>{});return local;}
 restoreCampaignBackup(id){const backup=this.loadCampaignBackup(id);if(!backup)return null;const current=this.load();if(current&&campaignIdentity(current)!==campaignIdentity(backup))archiveCampaignSnapshot(this.storage,current,"pre-restore");this.save(backup);return this.load();}
 async listDurableBackups(){try{return await listVaultSnapshots();}catch{return[];}}
 async loadDurableBackup(id){try{return await loadVaultSnapshot(id);}catch{return null;}}
 async restoreDurableBackup(id){const backup=await this.loadDurableBackup(id);if(!backup)return null;const current=this.load();if(current&&campaignIdentity(current)!==campaignIdentity(backup))this.archiveCampaign(current,"pre-durable-restore");this.save(backup);return this.load();}
 async recoverLatestBackup(){
  const active=this.load();if(active)return active;
  const recovery=this.loadRecovery();if(recovery){this.save(recovery);return this.load();}
  const archives=this.listCampaignBackups().slice().sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0));for(const meta of archives){const s=this.loadCampaignBackup(meta.id);if(s){this.save(s);return this.load();}}
  const durable=await this.listDurableBackups();for(const meta of durable){if(["storage_test","storage_test_2"].includes(String(meta.campaignId||""))||["Storage Regression","Second Campaign"].includes(String(meta.company||"")))continue;const s=await this.loadDurableBackup(meta.id);if(s){this.save(s);return this.load();}}
  return null;
 }
 deleteSlot(options={}){const purgeRecovery=options?.purgeRecovery===true,purgeArchives=options?.purgeArchives===true;for(const k of [MAIN_KEY,LEGACY_KEY,TEMP_KEY,META_KEY])this.storage.removeItem(k);if(purgeRecovery)this.storage.removeItem(RECOVERY_KEY);if(purgeArchives)this.storage.removeItem(CAMPAIGN_ARCHIVE_KEY);return{ok:true,recoveryPreserved:!purgeRecovery,archivesPreserved:!purgeArchives};}
 listSlots(){const s=this.load();return s?[metaFromState(s,this.getMetadata()?.updatedAt,"local")]:[];}
 getMetadata(){return this.reconcileJournal().meta;}
}
class HatchableCloudAdapter{
 async load(){const r=await fetch("/api/game-save",{credentials:"same-origin"});if(!r.ok)throw new Error("Cloud load "+r.status);const b=await r.json();return b.save||null;}
 async loadRecovery(){const r=await fetch("/api/game-save?recovery=1",{credentials:"same-origin"});if(!r.ok)throw new Error("Recovery load "+r.status);const b=await r.json();return b.save||null;}
 async save(state,options={}){const valid=validateState(state);if(!valid.ok)throw new Error(valid.errors.join("; "));const r=await fetch("/api/game-save",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({state}),keepalive:!!options.keepalive});if(!r.ok){let detail="";try{detail=(await r.json()).error||"";}catch{}throw new Error(detail||("Cloud save "+r.status));}return r.json();}
 async deleteSlot(){const r=await fetch("/api/game-save",{method:"DELETE",credentials:"same-origin"});if(!r.ok)throw new Error("Cloud delete "+r.status);return r.json();}
 async getMetadata(){const r=await fetch("/api/game-save?metadata=1",{credentials:"same-origin"});if(!r.ok)throw new Error("Cloud metadata "+r.status);return r.json();}
 async listSlots(){const m=await this.getMetadata();return m.save?[m.save]:[];}
}
class IOSNativeAdapter{
 available(){return !!(globalThis.MDXNative&&globalThis.MDXNative.isNativeApp);}
 async save(state){if(!this.available()||typeof MDXNative.saveLocal!=="function")throw new Error("Native storage unavailable");return MDXNative.saveLocal(state);}
 async load(){if(!this.available()||typeof MDXNative.loadLocal!=="function")return null;return MDXNative.loadLocal();}
 async deleteSlot(){if(!this.available()||typeof MDXNative.deleteLocal!=="function")return{ok:false};return MDXNative.deleteLocal();}
 async listSlots(){if(!this.available()||typeof MDXNative.listSlots!=="function")return[];return MDXNative.listSlots();}
 async getMetadata(){if(!this.available()||typeof MDXNative.getStorageMetadata!=="function")return null;return MDXNative.getStorageMetadata();}
}
function timestamp(v){const n=Date.parse(v||"");return Number.isFinite(n)?n:0;}
class StorageCoordinator{
 constructor(){this.local=new WebLocalAdapter();this.cloud=(globalThis.__HATCHABLE__&&globalThis.__HATCHABLE__.api)?new HatchableCloudAdapter():null;this.native=new IOSNativeAdapter();this.cloudEnabled=!!this.cloud;this._durablePending=null;this._durableDrain=null;this._lastDurableMeta=null;this._durableMirrors={indexeddb:false,cache:false};this._lastDurableCheckpointAt=0;this._lastDurableCheckpointRevision=0;this._lastDurableCheckpointCampaign=null;}
 shouldDurableCheckpoint(state,reason="autosave"){
  const campaign=String(state?.campaignId||""),revision=Math.max(0,Number(state?.saveRevision||0)),now=Date.now(),critical=new Set(["new_campaign","manual","visibility_hidden","pagehide","background","migration","recovery_restore","verify"]);
  if(this._lastDurableCheckpointCampaign===null){this._lastDurableCheckpointCampaign=campaign;this._lastDurableCheckpointRevision=revision;this._lastDurableCheckpointAt=now;return critical.has(String(reason||""));}
  if(campaign!==this._lastDurableCheckpointCampaign)return true;
  if(critical.has(String(reason||"")))return true;
  if(reason==="month_close"&&revision-this._lastDurableCheckpointRevision>=60)return true;
  return now-this._lastDurableCheckpointAt>=600000;
 }
 async checkpointDurable(state,reason="autosave"){
  if(!globalThis.indexedDB||!this.shouldDurableCheckpoint(state,reason))return null;
  try{const meta=await putVaultSnapshot(state,"durable-"+reason);if(meta){this._lastDurableCheckpointAt=Date.now();this._lastDurableCheckpointRevision=Math.max(0,Number(state?.saveRevision||0));this._lastDurableCheckpointCampaign=String(state?.campaignId||"");}return meta;}catch{return null;}
 }
 async writeDurableMirrors(state,reason="autosave"){
  const fullVerify=new Set(["new_campaign","manual","visibility_hidden","pagehide","background","migration","recovery_restore","verify"]).has(String(reason||""));
  if(globalThis.indexedDB&&!fullVerify){
   const meta=await putActiveDurableFast(state,reason);this._durableMirrors={indexeddb:true,cache:false};this._lastDurableMeta=meta;return meta;
  }
  const encoded=JSON.stringify(state),snapshot=parse(encoded),valid=validateState(snapshot,{strict:true});if(!snapshot||!valid.ok)throw new Error(valid?.errors?.join("; ")||"Invalid durable save snapshot");const prepared={encoded,snapshot,valid};
  const jobs=[];if(globalThis.indexedDB)jobs.push(["indexeddb",putActiveDurable(snapshot,reason,prepared)]);if(globalThis.caches)jobs.push(["cache",putCacheDurable(snapshot,reason,prepared)]);if(!jobs.length)throw new Error("No durable browser storage API is available");
  const settled=await Promise.all(jobs.map(async([kind,promise])=>{try{return{kind,ok:true,meta:await promise};}catch(error){return{kind,ok:false,error};}})),success=settled.filter(x=>x.ok);
  this._durableMirrors={indexeddb:success.some(x=>x.kind==="indexeddb"),cache:success.some(x=>x.kind==="cache")};
  if(!success.length)throw new Error(settled.map(x=>x.kind+": "+String(x.error?.message||x.error||"failed")).join(" • "));
  let best=null;for(const x of success){const candidate={state,source:x.kind==="cache"?"cache-active":"indexeddb-active",meta:x.meta};if(!best||preferStateCandidate(best,candidate))best=candidate;}
  this._lastDurableMeta=best?.meta||success[0].meta;return this._lastDurableMeta;
 }
 queueDurableSave(state,reason="autosave"){
  if(!state||(!globalThis.indexedDB&&!globalThis.caches))return null;
  const candidate={state,reason,source:"queued-durable"};
  if(!this._durablePending||preferStateCandidate(this._durablePending,candidate))this._durablePending=candidate;
  if(!this._durableDrain)this._durableDrain=(async()=>{try{await new Promise(resolve=>setTimeout(resolve,0));while(this._durablePending){const next=this._durablePending;this._durablePending=null;await this.writeDurableMirrors(next.state,next.reason);await this.checkpointDurable(next.state,next.reason);}return this._lastDurableMeta;}finally{this._durableDrain=null;if(this._durablePending)this.queueDurableSave(this._durablePending.state,this._durablePending.reason);}})();
  return this._durableDrain;
 }
 async flushDurableSave(){if(this._durableDrain)await this._durableDrain;if(this._durablePending){this.queueDurableSave(this._durablePending.state,this._durablePending.reason);if(this._durableDrain)await this._durableDrain;}return this._lastDurableMeta;}
 async getDurableStatus(){
  let indexeddb=null,cache=null;try{indexeddb=await loadActiveDurable();}catch{}try{cache=await loadCacheDurable();}catch{}return{indexeddb:indexeddb?.meta||null,cache:cache?.meta||null,indexeddbSource:indexeddb?.source||null,cacheSource:cache?.source||null};
 }
 async getDurableActive(){
  let best=null;try{const row=await loadActiveDurable();if(row)best=row;}catch{}try{const row=await loadCacheDurable();if(row&&(!best||preferStateCandidate(best,row)))best=row;}catch{}return best;
 }
 async getDurableMetadata(){const row=await this.getDurableActive();return row?.meta||null;}
 async deleteDurableActive(){
  try{this._durablePending=null;if(this._durableDrain)await this._durableDrain;const results=await Promise.allSettled([globalThis.indexedDB?deleteActiveDurable():Promise.resolve(false),globalThis.caches?deleteCacheDurable():Promise.resolve(false)]);return results.some(x=>x.status==="fulfilled"&&x.value!==false);}catch{return false;}
 }
 async load(){
  let local=this.local.load(),localMeta=this.local.getMetadata(),localSource="local",nativeError=null,durable=null,checkpoint=null;
  try{durable=await this.getDurableActive();}catch{}
  try{checkpoint=await loadLatestVaultCandidate(local?.campaignId||durable?.state?.campaignId||null);}catch{}
  if(checkpoint?.state&&preferStateCandidate(local?{state:local,source:localSource}:null,{state:checkpoint.state,source:"indexeddb-checkpoint"})){local=checkpoint.state;localMeta=checkpoint.meta||metaFromState(local,null,"indexeddb-checkpoint");localSource="indexeddb-checkpoint";}
  if(durable?.state&&preferStateCandidate(local?{state:local,source:localSource}:null,durable)){local=durable.state;localMeta=durable.meta||metaFromState(local,null,durable.source||"durable");localSource=durable.source||"durable";try{this.local.save(local);}catch{}}
  else if(local&&(!durable?.state||preferStateCandidate(durable,{state:local,source:localSource})))this.queueDurableSave(local,localSource==="indexeddb-checkpoint"?"checkpoint-promote":"local-mirror");
  if(this.native.available()){
   try{const nativeState=await this.native.load(),nativeMeta=await this.native.getMetadata();if(nativeState&&validateState(nativeState).ok&&preferStateCandidate(local?{state:local,source:localSource}:null,{state:nativeState,source:"native"})){local=nativeState;localMeta=nativeMeta||metaFromState(nativeState,null,"native");localSource="native";this.queueDurableSave(nativeState,"native-mirror");}}catch(e){nativeError=String(e?.message||e);}
  }
  let cloud=null,cloudMeta=null,cloudError=null;
  if(this.cloud){try{cloudMeta=await this.cloud.getMetadata();if(cloudMeta?.save)cloud=await this.cloud.load();}catch(e){cloudError=String(e?.message||e);}}
  if(!local&&!cloud)return{state:null,source:null,offline:!!cloudError,conflict:false,nativeError,cloudEnabled:this.cloudEnabled};
  if(local&&!cloud)return{state:local,source:localSource,offline:!!cloudError,conflict:false,pendingCloud:!!this.cloud,nativeError,cloudEnabled:this.cloudEnabled,durableMeta:durable?.meta||this._lastDurableMeta};
  if(cloud&&!local){this.queueDurableSave(cloud,"cloud-mirror");return{state:cloud,source:"cloud",offline:false,conflict:false,nativeError};}
  const lm=localMeta||metaFromState(local,null,localSource),cm=cloudMeta?.save||metaFromState(cloud,cloudMeta?.updated_at,"cloud"),sameCampaign=!!lm.campaignId&&lm.campaignId===cm.campaignId;
  let pick=localSource;
  if(sameCampaign&&cm.revision>lm.revision)pick="cloud";
  else if(sameCampaign&&cm.revision===lm.revision&&lm.updatedAt&&timestamp(cm.updatedAt||cloudMeta?.updated_at)>timestamp(lm.updatedAt))pick="cloud";
  else if(!sameCampaign&&lm.updatedAt&&timestamp(cm.updatedAt||cloudMeta?.updated_at)>timestamp(lm.updatedAt))pick="cloud";
  const chosen=pick==="cloud"?cloud:local;if(pick==="cloud")this.queueDurableSave(chosen,"cloud-mirror");
  return{state:chosen,source:pick,offline:false,conflict:!sameCampaign||cm.revision!==lm.revision,conflictResolution:"newer-"+pick,localMeta:lm,cloudMeta:cm,pendingCloud:pick!=="cloud"&&sameCampaign&&cm.revision<lm.revision,nativeError,durableMeta:durable?.meta||this._lastDurableMeta};
 }
}
function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);};
 const memory=new class{constructor(){this.m=new Map();}getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}}(),adapter=new WebLocalAdapter(memory,{enableVault:false});
 const a={company:"Storage Regression",year:1970,month:0,day:1,cash:10000000,debt:0,vehicles:[],engines:[],subsidiaries:[],industry:[],saveRevision:1,saveSchemaVersion:2,version:19,campaignId:"storage_test"};
 adapter.save(a);const b={...a,cash:9000000,saveRevision:2};adapter.save(b);
 check(adapter.load()?.cash===9000000,"current local snapshot mismatch");check(adapter.loadRecovery()?.cash===10000000,"previous local recovery snapshot missing");check(memory.getItem(TEMP_KEY)===null,"temporary local snapshot was not cleared after verified commit");adapter.deleteSlot();check(adapter.load()===null&&adapter.loadRecovery()?.cash===10000000,"deleteSlot erased the recovery snapshot");adapter.save(b);
 let invalidRejected=false;try{adapter.save({...b,month:99});}catch{invalidRejected=true;}check(invalidRejected&&adapter.load()?.cash===9000000,"invalid save replaced known-good local snapshot");
 const corrupt=memory.getItem(MAIN_KEY);memory.setItem(MAIN_KEY,"{broken");check(adapter.load()===null,"malformed JSON was treated as valid");memory.setItem(MAIN_KEY,corrupt);check(adapter.load()?.cash===9000000,"known-good snapshot could not be restored after malformed-write simulation");
 const c={...b,company:"Second Campaign",campaignId:"storage_test_2",year:1975,month:4,day:9,saveRevision:1,cash:7000000};adapter.save(c);const archived=adapter.listCampaignBackups();check(archived.some(x=>x.campaignId==="storage_test"&&x.company==="Storage Regression"),"campaign switch did not archive outgoing campaign");adapter.save({...c,cash:6500000,saveRevision:2});check(adapter.listCampaignBackups().some(x=>x.campaignId==="storage_test"),"new-campaign autosave overwrote archived prior campaign");const old=adapter.listCampaignBackups().find(x=>x.campaignId==="storage_test");check(!!old&&adapter.restoreCampaignBackup(old.id)?.company==="Storage Regression","archived campaign could not be restored");adapter.deleteSlot();check(adapter.listCampaignBackups().length>0,"deleteSlot erased campaign archive");
 memory.setItem(META_KEY,JSON.stringify({company:"Phantom Save",revision:99}));check(adapter.getMetadata()===null,"stale metadata exposed a phantom Continue save");
 const journalBase={...a,company:"Journal Motors",campaignId:"journal_test",saveRevision:4,lastLocalSaveAt:"2026-01-01T00:00:00.000Z"},journalNext={...journalBase,cash:8000000,saveRevision:5,lastLocalSaveAt:"2026-01-01T00:01:00.000Z"};adapter.save(journalBase);memory.setItem(TEMP_KEY,JSON.stringify(journalNext));check(adapter.load()?.cash===8000000&&parse(memory.getItem(MAIN_KEY))?.saveRevision===5&&memory.getItem(TEMP_KEY)===null,"valid interrupted write was not promoted from the journal");
 const nestedInvalid=validateState({...journalNext,operations:{factories:{}},engineSupply:{contracts:{}}},{strict:true});check(!nestedInvalid.ok&&nestedInvalid.errors.some(x=>x.includes("operations.factories"))&&nestedInvalid.errors.some(x=>x.includes("engineSupply.contracts")),"nested save structures were not validated");
 const numericInvalid=validateState({...journalNext,operations:{factories:[{id:"f1",capacity:Infinity}]}},{strict:true});check(!numericInvalid.ok&&numericInvalid.errors.some(x=>x.includes("capacity")),"non-finite nested simulation value passed strict validation");
 const meta=adapter.getMetadata();check(meta?.checksum===checksumText(memory.getItem(MAIN_KEY))&&meta?.byteLength===memory.getItem(MAIN_KEY).length,"active-save checksum metadata was not verified");
 const newerA={state:{...journalBase,saveRevision:7,lastLocalSaveAt:"2026-01-01T00:07:00.000Z"},source:"local"},newerB={state:{...journalBase,saveRevision:8,lastLocalSaveAt:"2026-01-01T00:06:00.000Z"},source:"indexeddb-active"};check(preferStateCandidate(newerA,newerB),"durable active save chooser did not prefer the newer revision");check(!preferStateCandidate(newerB,newerA),"durable active save chooser moved backward to an older revision");
 const durableCurrentState={...journalBase,saveRevision:12,lastLocalSaveAt:"2026-01-01T00:12:00.000Z"},durablePreviousState={...journalBase,saveRevision:11,lastLocalSaveAt:"2026-01-01T00:11:00.000Z"},durableCurrentText=JSON.stringify(durableCurrentState),durablePreviousText=JSON.stringify(durablePreviousState),durableCurrent={id:ACTIVE_ID,state:durableCurrentState,savedAt:durableCurrentState.lastLocalSaveAt,meta:metaFromState(durableCurrentState,durableCurrentState.lastLocalSaveAt,"indexeddb-active",durableCurrentText)},durablePrevious={id:ACTIVE_BACKUP_ID,state:durablePreviousState,savedAt:durablePreviousState.lastLocalSaveAt,meta:metaFromState(durablePreviousState,durablePreviousState.lastLocalSaveAt,"indexeddb-previous",durablePreviousText)};
 check(chooseDurableActive([durableCurrent,durablePrevious])?.state?.saveRevision===12,"durable active chooser did not select the newest verified slot");durableCurrent.meta.checksum="corrupt";check(chooseDurableActive([durableCurrent,durablePrevious])?.state?.saveRevision===11,"durable active chooser did not fall back to the previous verified slot");
  const faultMemory=new class extends memory.constructor{constructor(){super();this.corruptNextMain=false;}setItem(k,v){if(k===MAIN_KEY&&this.corruptNextMain){this.corruptNextMain=false;super.setItem(k,"{broken");return;}super.setItem(k,v);}}(),faultAdapter=new WebLocalAdapter(faultMemory,{enableVault:false});faultAdapter.save(journalBase);faultMemory.corruptNextMain=true;let commitRejected=false;try{faultAdapter.save(journalNext);}catch{commitRejected=true;}check(commitRejected&&faultAdapter.load()?.saveRevision===4,"failed committed-write verification did not preserve the last good save");
 return{ok:failures.length===0,failures};
}
window.MDXStorage={validateState,WebLocalAdapter,HatchableCloudAdapter,IOSNativeAdapter,StorageCoordinator,preferStateCandidate,chooseDurableActive,chooseCacheDurable,putActiveDurable,loadActiveDurable,putCacheDurable,loadCacheDurable,deleteActiveDurable,deleteCacheDurable,loadLatestVaultCandidate,coordinator:new StorageCoordinator(),runSelfTests,cleanupSyntheticVault};cleanupSyntheticVault();
})();
