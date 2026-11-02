/* Offline, accessible showcase interactions. Nothing submits to a backend. */
const $ = (id) => document.getElementById(id);
const php=(n)=>(n<0?'−':'')+'₱'+Math.abs(Math.round(n)).toLocaleString('en-PH');
let term=6,toastTimer=null,lastModalTrigger=null;
const toast=(message)=>{
  $('toast-message').textContent=message;$('toast').hidden=false;
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{$('toast').hidden=true},4500);
};
$('toast-close').addEventListener('click',()=>{$('toast').hidden=true});
$('toast-demo').addEventListener('click',()=>toast('This is a non-committing example action.'));
$('quiet-demo').addEventListener('click',()=>toast('Help information would appear here.'));
$('danger-demo').addEventListener('click',()=>toast('Destructive actions require explicit confirmation.'));
$('start-app-demo').addEventListener('click',()=>toast('This specimen does not create an application.'));
$('guide-demo').addEventListener('click',()=>toast('Guidance remains optional and dismissible.'));
$('save-demo').addEventListener('click',async()=>{
 const el=$('save-demo');el.disabled=true;const before=el.innerHTML;
 el.innerHTML='<span class="spinner" aria-hidden="true"></span> Saving example…';
 await new Promise(r=>setTimeout(r,800));el.innerHTML=before;el.disabled=false;
 toast('Example save completed (no data was stored).');
});
$('sample-form').addEventListener('submit',(event)=>{
 event.preventDefault();const name=$('fullname');const wrapper=$('name-field');
 const bad=!name.value.trim();wrapper.classList.toggle('invalid',bad);
 name.setAttribute('aria-invalid',String(bad));
 if(bad){name.focus();return}
 toast('Example form passed validation. No data was submitted.');
});
$('fullname').addEventListener('input',()=>{if($('fullname').value.trim()){$('name-field').classList.remove('invalid');$('fullname').setAttribute('aria-invalid','false')}});
const modal=$('modal');const cancel=()=>{modal.hidden=true;lastModalTrigger?.focus()};
$('modal-demo').addEventListener('click',(e)=>{lastModalTrigger=e.currentTarget;modal.hidden=false;$('modal-cancel').focus()});
$('modal-cancel').addEventListener('click',cancel);
$('modal-confirm').addEventListener('click',()=>{cancel();toast('Example navigation cancelled; no data was changed.')});
modal.addEventListener('click',(e)=>{if(e.target===modal)cancel()});
document.addEventListener('keydown',(e)=>{
 if(modal.hidden)return;
 if(e.key==='Escape'){cancel();return}
 if(e.key==='Tab'){let el=[...modal.querySelectorAll('button:not([disabled])')];const ix=el.indexOf(document.activeElement);if(e.shiftKey&&ix===0){e.preventDefault();el.at(-1).focus()}else if(!e.shiftKey&&ix===el.length-1){e.preventDefault();el[0].focus()}}
});
function updateScenario(){
 const principal=Number($('principal').value);const installment=principal/term;const left=10000-6500-installment;
 $('principal-value').textContent=php(principal);
 $('installment').textContent=php(installment);
 $('leftover').textContent=php(left);
 $('leftover').style.color=left<0?'var(--ag-danger)':'var(--ag-ink)';
 const n=$('scenario-notice');
 if(left<0){n.className='notice danger';n.innerHTML='<svg aria-hidden="true"><use href="#ic-alert"/></svg><div><p>Example shortfall: the monthly budget would be below zero. Check a different scenario.</p></div>'}
 else {n.className='notice info';n.innerHTML=`<svg aria-hidden="true"><use href="#ic-info"/></svg><div><p>Example assumes a ${term}-month principal split with no interest or fees.</p></div>`}
}
$('principal').addEventListener('input',updateScenario);
document.querySelectorAll('[data-months]').forEach(btn=>btn.addEventListener('click',()=>{term=Number(btn.dataset.months);document.querySelectorAll('[data-months]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));updateScenario()}));
const linkObserver=new IntersectionObserver((entries)=>{entries.forEach(x=>{if(x.isIntersecting){document.querySelectorAll('.side-link').forEach(a=>a.classList.toggle('active',a.hash==='#'+x.target.id))}})},{rootMargin:'-10% 0px -75% 0px'});
document.querySelectorAll('main[id],section[id]').forEach(el=>linkObserver.observe(el));
updateScenario();
