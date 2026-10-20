"use strict";
importScripts("/industry-sim-client.js?build=living-world-v1");

self.onmessage=event=>{
 const payload=event.data||{},id=payload.id,input=payload.input;
 if(!id)return;
 try{
  if(!self.MDXIndustrySim?.simulateIndustryMonth)throw new Error("Industry simulator unavailable in worker");
  const result=self.MDXIndustrySim.simulateIndustryMonth(input||{});
  self.postMessage({id,ok:true,result});
 }catch(error){
  self.postMessage({id,ok:false,error:String(error?.message||error||"Industry worker failed")});
 }
};