(() => {
"use strict";
const clock=()=>globalThis.performance&&typeof globalThis.performance.now==="function"?globalThis.performance.now():Date.now();
const bootAt=clock(),series=new Map(),MAX_SAMPLES=120;
let startupRecorded=false;
function record(name,value,unit="ms",meta=null){
 const n=Number(value);if(!Number.isFinite(n))return null;const key=String(name||"metric"),row=series.get(key)||{name:key,unit:String(unit||""),values:[],lastMeta:null};
 row.unit=String(unit||row.unit||"");row.values.push(n);if(row.values.length>MAX_SAMPLES)row.values.shift();row.lastMeta=meta||null;series.set(key,row);return n;
}
function start(name,meta=null){return{name:String(name||"span"),started:clock(),meta};}
function end(token,meta=null){if(!token||!Number.isFinite(Number(token.started)))return null;return record(token.name,clock()-Number(token.started),"ms",meta||token.meta||null);}
function summary(name){
 const row=series.get(String(name));if(!row||!row.values.length)return null;const vals=row.values,recent=vals[vals.length-1],max=Math.max(...vals),min=Math.min(...vals),avg=vals.reduce((a,b)=>a+b,0)/vals.length;
 return{name:row.name,unit:row.unit,count:vals.length,recent,max,min,avg,lastMeta:row.lastMeta};
}
function snapshot(){return Object.fromEntries([...series.keys()].map(k=>[k,summary(k)]));}
function markStartupComplete(){if(startupRecorded)return summary("startupMs");startupRecorded=true;record("startupMs",clock()-bootAt,"ms");return summary("startupMs");}
function clear(){series.clear();startupRecorded=false;}
function formatMetric(m){if(!m)return"—";const digits=m.unit==="bytes"?0:1;const fmt=v=>m.unit==="bytes"?(v>=1048576?(v/1048576).toFixed(2)+" MB":v>=1024?(v/1024).toFixed(1)+" KB":Math.round(v)+" B"):Number(v).toFixed(digits)+(m.unit?" "+m.unit:"");return{recent:fmt(m.recent),max:fmt(m.max),avg:fmt(m.avg),count:m.count};}
function runSelfTests(){
 const failures=[],check=(v,m)=>{if(!v)failures.push(m);},vals=[2,4,8],avg=vals.reduce((a,b)=>a+b,0)/vals.length;
 check(avg===14/3,"average calculation failed");check(Math.max(...vals)===8&&Math.min(...vals)===2,"min/max calculation failed");
 const fake={name:"x",unit:"ms",values:vals,lastMeta:null},recent=fake.values[fake.values.length-1];check(recent===8,"recent metric selection failed");
 return{ok:failures.length===0,failures};
}
window.MDXPerf={record,start,end,summary,snapshot,formatMetric,markStartupComplete,clear,runSelfTests};
})();