/* Display translation only: underlying proven simulation IDs stay unchanged. */
(()=>{
 const rules=[
  [/Motor Dynasty/gi,"Technology Dynasty"],[/Automotive/gi,"Technology"],[/Motoring/gi,"Technology"],
  [/Powertrain/gi,"Processor Platform"],[/Transmissions/gi,"System Architectures"],[/Transmission/gi,"System Architecture"],
  [/Engines/gi,"Processors"],[/Engine/gi,"Processor"],[/Vehicles/gi,"Devices"],[/Vehicle/gi,"Device"],
  [/Cars/gi,"Devices"],[/Car\b/gi,"Device"],[/Dealerships/gi,"Distributors"],[/Dealership/gi,"Distribution Network"],
  [/Dealers/gi,"Distributors"],[/Dealer/gi,"Distributor"],[/Manufacturers/gi,"Technology Companies"],
  [/Manufacturer/gi,"Technology Company"],[/Fleet/gi,"Enterprise"],[/Fuel Economy/gi,"Power Efficiency"],
  [/Displacement/gi,"Silicon Capacity"],[/Horsepower/gi,"Processing Performance"],
  [/Torque/gi,"Compute Throughput"],[/Redline/gi,"Maximum Clock"],[/Cylinders/gi,"Cores"],
  [/Cylinder/gi,"Core"],[/Exhaust/gi,"Cooling"],[/Chassis/gi,"Device Frame"],
  [/Body Styles/gi,"Form Factors"],[/Body Style/gi,"Form Factor"],[/Bodywork/gi,"Enclosure"],
  [/Drivetrain/gi,"Hardware Platform"],[/Suspension/gi,"Thermal Management"],
  [/Motor(s)?\b/gi,"Technology"],[/\bhp\/L\b/gi,"pts/unit"],[/\bhp\b/gi,"pts"],[/\blb-ft\b/gi,"pts"],[/\brpm\b/gi,"MHz"]
 ];
 function translate(s){let out=s;for(const [regex,repl] of rules)out=out.replace(regex,repl);return out;}
 function textNode(node){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE)$/.test(parent.tagName))return;const updated=translate(node.nodeValue);if(updated!==node.nodeValue)node.nodeValue=updated;}
 function walk(root){
  if(root.nodeType===3){textNode(root);return;}
  if(root.nodeType!==1)return;
  if(/^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE)$/.test(root.tagName))return;
  for(const attr of ["placeholder","title","aria-label","alt"]){if(root.hasAttribute(attr)){const previous=root.getAttribute(attr),next=translate(previous);if(previous!==next)root.setAttribute(attr,next);}}
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode()))textNode(n);
 }
 function apply(){walk(document.body);}
 apply();
 const observer=new MutationObserver(records=>{for(const record of records){if(record.type==="characterData")textNode(record.target);else for(const node of record.addedNodes)walk(node);}});
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 window.TD_INDUSTRY.translateUI=apply;
})();
