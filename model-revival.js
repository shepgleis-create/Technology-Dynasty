(()=>{'use strict';
const game=()=>window.MDXGame;
const lifecycle=()=>window.MDXProductLifecycle;
const vehicle=id=>game()?.getState()?.vehicles?.find(v=>String(v.id)===String(id));
const currency=n=>'$'+Math.round(Number(n)||0).toLocaleString();
function preview(id){
 const s=game()?.getState(),v=vehicle(id);
 if(!s||!v||!lifecycle()?.restartVehicle)return{ok:false,reason:'Vehicle or lifecycle system unavailable'};
 // Isolated shallow draft: the same restart function determines exact cost/readiness
 // without debiting the live company or changing a saved vehicle.
 const copy={...s,vehicles:s.vehicles.map(x=>String(x.id)===String(id)?{...x,productAutomation:x.productAutomation?{...x.productAutomation}:null,lifecycleEvents:[...(x.lifecycleEvents||[])]}:x)};
 return lifecycle().restartVehicle(copy,id);
}
function revive(id){
 const s=game()?.getState();if(!s)return false;
 const result=lifecycle()?.restartVehicle?.(s,id);
 if(!result?.ok){showNotice(result?.reason||'Production restart unavailable','error');return false;}
 game().save();window.dispatchEvent(new Event('mdx:state'));
 showNotice('Tooling funded: '+currency(result.tooling)+' • '+result.days+' days until production resumes.','success');
 return true;
}
function showNotice(message,type='info'){
 let el=document.getElementById('md-revival-notice');
 if(!el){el=document.createElement('div');el.id='md-revival-notice';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el);}
 el.className='md-revival-notice '+type;el.textContent=message;
 clearTimeout(showNotice.timer);showNotice.timer=setTimeout(()=>el.remove(),6000);
}
function isRetired(v){return v&&(['retired','discontinued','archived'].includes(String(v.productionStatus||'').toLowerCase())||v.active===false);}
function attach(){
 document.querySelectorAll('[data-manage-production]').forEach(button=>{
  const id=button.dataset.manageProduction,v=vehicle(id);
  if(!isRetired(v))return;
  const parent=button.parentElement;if(!parent||parent.querySelector('[data-revive-model]'))return;
  const group=document.createElement('div');group.className='md-revival-actions';group.dataset.reviveModel=id;
  const details=document.createElement('div');details.className='md-revival-preview';
  const quote=preview(id);
  const title=document.createElement('strong');title.textContent='RESTORE '+(v.name||'MODEL').toUpperCase();
  const summary=document.createElement('span');summary.textContent=quote.ok?'Tooling '+currency(quote.tooling)+' • '+quote.days+' days • factory ready':(quote.reason||'Restart unavailable')+(quote.tooling?' • tooling '+currency(quote.tooling):'');
  details.append(title,summary);
  const action=document.createElement('button');action.type='button';action.className='btn hero';action.textContent='RESUME PRODUCTION';action.disabled=!quote.ok;
  action.addEventListener('click',()=>{
   const fresh=preview(id);
   if(!fresh.ok){showNotice(fresh.reason||'Restart unavailable','error');return;}
   if(!window.confirm('Fund '+currency(fresh.tooling)+' in tooling to restart '+(v.name||'this model')+'? Estimated readiness: '+fresh.days+' days.'))return;
   if(revive(id)){action.textContent='RESTART FUNDED';action.disabled=true;game()?.navigate('library','planning');}
  });
  group.append(details,action);parent.prepend(group);
 });
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(game()?.getState())attach();});}
function start(){
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
 window.addEventListener('mdx:state',schedule);
 window.addEventListener('mdx:ready',schedule);
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.MDXModelRevival={revive,preview};
})();