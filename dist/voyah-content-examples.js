// Reserved container for verified materials; native dialog provides focus trapping.
(()=>{
 const trigger=document.querySelector('#education .feature-examples-trigger');
 const dialog=document.getElementById('feature-examples-dialog');
 if(!trigger||!dialog)return;
 let previousOverflow='';
 trigger.addEventListener('click',()=>{
  if(dialog.open)return;
  previousOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';
 });
 dialog.querySelector('.feature-examples-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
 });
 dialog.addEventListener('close',()=>{
  document.body.style.overflow=previousOverflow;
  trigger.focus({preventScroll:true});
 });
})();
