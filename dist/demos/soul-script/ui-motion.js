import {demoDocument as document} from "./demo-context.js?v=original-dark-1";
export const MOTION = Object.freeze({
  pageIn:360,pageOut:220,sheetIn:420,sheetOut:300,
  panelIn:320,panelOut:220,backdropIn:220,backdropOut:220,
  contentIn:240,toastIn:240,toastOut:220,toastHold:3200,toastLongHold:5200,
  ease:'cubic-bezier(.22,1,.36,1)',exitEase:'cubic-bezier(.4,0,.2,1)'
});

export class AppMotion {
 constructor(root){
  this.root=root;this.previous=null;this.scrollPositions=new Map();this.active=new WeakMap();this.ghosts=new Set();
  this.preference=matchMedia('(prefers-reduced-motion: reduce)');
  this.preference.addEventListener('change',()=>{if(this.preference.matches){for(const el of this.root.querySelectorAll('*'))for(const a of el.getAnimations())try{a.finish();}catch{a.cancel();}for(const ghost of this.ghosts)ghost.remove();this.ghosts.clear();}});
  this.root.dataset.motionSystem='soft';
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pauseToast();else this.resumeToast();});
 }
 get reduced(){return this.preference.matches;}
 specs(state){
  const pageKey=state.page+':'+(state.page==='home'?state.tab+':'+state.wallView:state.page==='detail'?state.detailId:'');
  const specs=[{key:'page:'+pageKey,selector:state.page==='capture'?':scope > .capture':state.page==='detail'?':scope > .detail':':scope > .screen',kind:['capture','detail'].includes(state.page)?'sheet':'page'}];
  if(state.modal){specs.push({key:'modal:'+state.modal,selector:'.modal-cover',kind:'backdrop'});specs.push({key:'modal-body:'+state.modal,selector:'.modal',kind:'dialog',exit:false});}
  if(state.page==='graph'){
   for(const [flag,key,selector] of [['filterOpen','filter','.constellation-filter'],['graphInfo','info','.constellation-info'],['graphList','list','.constellation-list'],['selectedNode','record','.constellation-record']])if(state[flag])specs.push({key,selector,kind:'panel'});
   if(state.graphMood!=='all'||state.graphKeyword||state.graphSearch)specs.push({key:'graph-focus',selector:'.graph-focus-banner',kind:'content',exit:false});
  }
  if(state.page==='home'&&state.tab==='circle')specs.push({key:'circle:'+state.circleStatus,selector:'.circle-content',kind:'content',exit:false});
  if(state.page==='capture'){
   if(state.captureImage)specs.push({key:'attachment',selector:'.attachment',kind:'content',exit:false});
   if(state.capturePrompt)specs.push({key:'prompt',selector:'.prompt-bubble',kind:'content',exit:false});
   if(state.captureSent){specs.push({key:'sent',selector:'.bubble.user',kind:'content',exit:false});specs.push({key:'reply',selector:'.assistant-row',kind:'content',exit:false});}
  }
  if(state.page==='detail'&&state.editing)specs.push({key:'edit',selector:'.edit-area',kind:'content',exit:false});
  return specs;
 }
 anchor(el){
  if(!el||!this.root.contains(el))return null;
  if(el.id)return '#'+CSS.escape(el.id);
  if(el.dataset?.action)return '[data-action="'+CSS.escape(el.dataset.action)+'"]'+['id','page','key','value','mood','tab','keyword','scope'].map(key=>el.dataset[key]?'[data-'+key+'="'+CSS.escape(el.dataset[key])+'"]':'').join('');
  if(el.getAttribute('aria-label'))return '[aria-label="'+CSS.escape(el.getAttribute('aria-label'))+'"]';
  return null;
 }
 snapshot(el){
  const clone=el.cloneNode(true);clone.inert=true;clone.setAttribute('aria-hidden','true');
  clone.removeAttribute('id');for(const child of clone.querySelectorAll('[id]'))child.removeAttribute('id');
  const scrolls=[],sourceChildren=[...el.querySelectorAll('*')],cloneChildren=[...clone.querySelectorAll('*')];for(let i=0;i<sourceChildren.length;i++){if(sourceChildren[i].scrollTop||sourceChildren[i].scrollLeft)scrolls.push({el:cloneChildren[i],top:sourceChildren[i].scrollTop,left:sourceChildren[i].scrollLeft});}
  const sourceInputs=el.querySelectorAll('input,textarea');clone.querySelectorAll('input,textarea').forEach((input,i)=>input.value=sourceInputs[i].value);
  clone.querySelectorAll('canvas').forEach(canvas=>canvas.remove());
  let left=0,top=0,parent=el;while(parent&&parent!==this.root){left+=parent.offsetLeft;top+=parent.offsetTop;parent=parent.offsetParent;}
  Object.assign(clone.style,{position:'absolute',left:left+'px',top:top+'px',right:'auto',bottom:'auto',width:el.offsetWidth+'px',height:el.offsetHeight+'px',margin:'0',pointerEvents:'none',zIndex:el.classList.contains('modal-cover')?'72':'60'});
  clone.classList.add('motion-ghost');clone.dataset.motionState='exiting';
  const style=getComputedStyle(el),body=el.querySelector('.modal'),bodyStyle=body?getComputedStyle(body):null;
  return {clone,scroll:el.scrollTop,scrolls,appearance:{opacity:Number(style.opacity),transform:style.transform},bodyAppearance:bodyStyle?{opacity:Number(bodyStyle.opacity),transform:bodyStyle.transform}:null};
 }
 before(state){
  const nextSpecs=this.specs(state),keys=new Set(nextSpecs.map(s=>s.key)),old=new Map(),exits=[],revival=new Map();
  for(const ghost of this.ghosts){if(keys.has(ghost.dataset.motionKey)){const style=getComputedStyle(ghost);revival.set(ghost.dataset.motionKey,{opacity:Number(style.opacity),transform:style.transform});const body=ghost.querySelector('.modal');if(body){const bodyStyle=getComputedStyle(body);revival.set('modal-body:'+state.modal,{opacity:Number(bodyStyle.opacity),transform:bodyStyle.transform});}}ghost.remove();}this.ghosts.clear();
  const controls=new Map();for(const el of this.root.querySelectorAll('.choice-row button,.preset,.sentiment-grid button,.filter-moods button,.bottom-nav button,.segmented button,.connection-toggle,.graph-filter,.switch,.post-like')){const anchor=this.anchor(el);if(anchor){const style=getComputedStyle(el);controls.set(anchor,{color:style.color,backgroundColor:style.backgroundColor,borderColor:style.borderColor});}}
  const focused=document.activeElement,anchor=this.anchor(focused);
  if(state.modal&&!this.previous?.modal)this.modalReturn=anchor;
  const focusedInfo={anchor,start:focused?.selectionStart,end:focused?.selectionEnd};
  if(this.previous)for(const spec of this.specs(this.previous)){
   const el=this.root.querySelector(spec.selector);if(!el)continue;
   const scrolls=[{selector:null,top:el.scrollTop,left:el.scrollLeft},...['.detail-main','.capture-body'].flatMap(selector=>{const region=el.querySelector(selector);return region?[{selector,top:region.scrollTop,left:region.scrollLeft}]:[];})];this.scrollPositions.set(spec.key,scrolls);
   const running=this.active.get(el);old.set(spec.key,{...spec,progress:running&&running.animation.playState==='running'?{frames:running.frames,timing:running.timing,time:running.animation.currentTime}:null});
   if(!keys.has(spec.key)&&spec.exit!==false&&!this.reduced)exits.push({...spec,...this.snapshot(el)});
  }
  const search=this.root.querySelector('#search-wrap'),searchHeight=search?.offsetHeight||0,searchOpacity=search?Number(getComputedStyle(search).opacity):0;
  const toast=this.toastState?.el;if(toast?.isConnected)toast.remove();
  return {state:{...state},old,exits,focusedInfo,toast,revival,controls,searchHeight,searchOpacity};
 }
 frames(kind,out=false){
  if(kind==='backdrop')return [{opacity:out?1:0},{opacity:out?0:1}];
  const offset=kind==='sheet'?36:kind==='page'?8:kind==='content'?5:10;
  const scale=['panel','dialog'].includes(kind)?'.985':'1';
  const hidden={opacity:0,transform:'translate3d(0,'+offset+'px,0) scale('+scale+')'},visible={opacity:1,transform:'translate3d(0,0,0) scale(1)'};
  return out?[visible,hidden]:[hidden,visible];
 }
 timing(kind,out=false){
  const duration=kind==='sheet'?(out?MOTION.sheetOut:MOTION.sheetIn):kind==='page'?(out?MOTION.pageOut:MOTION.pageIn):kind==='backdrop'?(out?MOTION.backdropOut:MOTION.backdropIn):kind==='content'?MOTION.contentIn:(out?MOTION.panelOut:MOTION.panelIn);
  return {duration,easing:out?MOTION.exitEase:MOTION.ease,fill:'both'};
 }
 play(el,frames,timing,startTime=null){
  this.active.get(el)?.animation.cancel();
  if(this.reduced||!el.animate){el.dataset.motionState='idle';return Promise.resolve();}
  const animation=el.animate(frames,timing),record={animation,frames,timing};this.active.set(el,record);
  el.dataset.motionDuration=String(timing.duration);el.dataset.motionState='entering';
  if(startTime!==null)animation.currentTime=startTime;
  return animation.finished.then(()=>{if(this.active.get(el)===record){this.active.delete(el);el.dataset.motionState='idle';animation.cancel();}}).catch(()=>{});
 }
 after(ticket){
  const state=ticket.state,pageSpec=this.specs(state)[0],pageChanged=!ticket.old.has(pageSpec.key);
  for(const spec of this.specs(state)){
   const el=this.root.querySelector(spec.selector);if(!el)continue;
   const old=ticket.old.get(spec.key);
   for(const scroll of this.scrollPositions.get(spec.key)||[]){
    if(scroll.selector==='.capture-body'&&state.captureSent!==this.previous?.captureSent)continue;
    const region=scroll.selector?el.querySelector(scroll.selector):el;if(region){region.scrollTop=scroll.top;region.scrollLeft=scroll.left;}
   }
   if(old?.progress)this.play(el,old.progress.frames,old.progress.timing,old.progress.time);
   else if(!old&&(!pageChanged||!['content','panel'].includes(spec.kind))){const frames=this.frames(spec.kind);if(ticket.revival.has(spec.key))frames[0]=ticket.revival.get(spec.key);this.play(el,frames,this.timing(spec.kind));}
   else el.dataset.motionState='idle';
  }
  if(!pageChanged&&state.page==='home'&&state.tab==='mine'&&!!state.searchVisible!==!!this.previous?.searchVisible){const search=this.root.querySelector('#search-wrap');if(search)this.play(search,[{height:ticket.searchHeight+'px',opacity:ticket.searchOpacity},{height:(state.searchVisible?search.scrollHeight:0)+'px',opacity:state.searchVisible?1:0}],{duration:260,easing:MOTION.ease,fill:'both'});}
  for(const spec of ticket.exits){
   // A departing page already contains its panels; don't duplicate those panels.
   if(pageChanged&&['panel','content'].includes(spec.kind))continue;
   const ghost=spec.clone;ghost.dataset.motionKey=spec.key;this.root.appendChild(ghost);ghost.scrollTop=spec.scroll;for(const item of spec.scrolls||[]){if(item.el){item.el.scrollTop=item.top;item.el.scrollLeft=item.left;}}this.ghosts.add(ghost);
   if(spec.kind==='backdrop'){const body=ghost.querySelector('.modal');if(body){const frames=this.frames('dialog',true);if(spec.bodyAppearance)frames[0]=spec.bodyAppearance;this.play(body,frames,this.timing('dialog',true));}}
   const exitFrames=this.frames(spec.kind,true);exitFrames[0]=spec.appearance;this.play(ghost,exitFrames,this.timing(spec.kind,true)).finally(()=>{ghost.remove();this.ghosts.delete(ghost);});ghost.dataset.motionState='exiting';
  }
  if(!pageChanged)for(const [anchor,before] of ticket.controls){const el=this.root.querySelector(anchor);if(!el)continue;const style=getComputedStyle(el),after={color:style.color,backgroundColor:style.backgroundColor,borderColor:style.borderColor};if(Object.keys(after).some(key=>before[key]!==after[key]))this.play(el,[before,after],{duration:220,easing:MOTION.ease,fill:'both'});}
  if(ticket.toast&&this.toastState?.el===ticket.toast)this.root.appendChild(ticket.toast);
  const dialog=this.root.querySelector('.modal-cover:not(.motion-ghost) .modal');
  if(dialog){
   for(const child of this.root.children)if(!child.classList.contains('modal-cover')&&!child.classList.contains('toast'))child.inert=true;
   const same=state.modal===this.previous?.modal,restore=same&&ticket.focusedInfo.anchor?this.root.querySelector(ticket.focusedInfo.anchor):null;
   (restore||dialog.querySelector('input,[data-action="cancel-modal"],button'))?.focus({preventScroll:true});
  }else if(this.previous?.modal&&!state.modal){this.root.querySelector(this.modalReturn||'__no_anchor__')?.focus({preventScroll:true});this.modalReturn=null;}
  else if(!pageChanged&&ticket.focusedInfo.anchor){
   const el=this.root.querySelector(ticket.focusedInfo.anchor);if(el){el.focus({preventScroll:true});if(typeof ticket.focusedInfo.start==='number')try{el.setSelectionRange(ticket.focusedInfo.start,ticket.focusedInfo.end);}catch{}}
  }
  this.previous=state;
 }
 refresh(el){if(el)this.play(el,[{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:MOTION.contentIn,easing:MOTION.ease,fill:'both'});}
 trapFocus(event){
  const dialog=this.root.querySelector('.modal-cover:not(.motion-ghost) .modal');if(!dialog||event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,a[href]')];if(!items.length)return;
  const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 toast(message){
  message=String(message);let state=this.toastState;
  if(state){
   this.pauseToast();const style=getComputedStyle(state.el),from={opacity:Number(style.opacity),transform:style.transform};
   state.revision++;state.closing=false;state.entering=true;state.hover=state.el.matches(':hover');
   if(state.el.querySelector('.toast-message').textContent!==message)state.el.querySelector('.toast-message').textContent=message;
   state.remaining=message.length>36?MOTION.toastLongHold:MOTION.toastHold;this.revealToast(state,from);return;
  }
  const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');
  const text=document.createElement('span');text.className='toast-message';text.textContent=message;
  const close=document.createElement('button');close.type='button';close.setAttribute('aria-label','关闭提示');close.textContent='×';el.append(text,close);
  state={el,returnFocus:this.anchor(document.activeElement),remaining:message.length>36?MOTION.toastLongHold:MOTION.toastHold,timer:null,started:0,closing:false,entering:true,revision:1,hover:false};this.toastState=state;this.root.appendChild(el);
  close.addEventListener('click',()=>this.dismissToast(state));el.addEventListener('pointerenter',()=>{state.hover=true;this.pauseToast();});el.addEventListener('pointerleave',()=>{state.hover=false;this.resumeToast();});
  el.addEventListener('focusin',()=>this.pauseToast());el.addEventListener('focusout',()=>queueMicrotask(()=>this.resumeToast()));
  this.revealToast(state,{opacity:0,transform:'translate(-50%,10px)'});
 }
 revealToast(state,from){
  const revision=state.revision;state.el.dataset.toastState='entering';
  this.play(state.el,[from,{opacity:1,transform:'translate(-50%,0)'}],{duration:MOTION.toastIn,easing:MOTION.ease,fill:'both'}).then(()=>{
   if(this.toastState!==state||state.revision!==revision||state.closing)return;state.entering=false;this.resumeToast();
  });
 }
 pauseToast(){
  const state=this.toastState;if(!state)return;
  if(state.timer){clearTimeout(state.timer);state.timer=null;state.remaining=Math.max(0,state.remaining-(performance.now()-state.started));}
  if(!state.entering&&!state.closing)state.el.dataset.toastState='paused';
 }
 resumeToast(){
  const state=this.toastState;if(!state||state.timer||state.closing||state.entering)return;
  if(state.hover||document.hidden||state.el.contains(document.activeElement)){state.el.dataset.toastState='paused';return;}
  state.el.dataset.toastState='reading';state.started=performance.now();state.timer=setTimeout(()=>{state.timer=null;state.remaining=0;this.dismissToast(state);},state.remaining);
 }
 dismissToast(state=this.toastState){
  if(!state||state!==this.toastState||state.closing)return;
  this.pauseToast();state.closing=true;state.entering=false;const revision=++state.revision,style=getComputedStyle(state.el);
  this.play(state.el,[{opacity:Number(style.opacity),transform:style.transform},{opacity:0,transform:'translate(-50%,6px)'}],{duration:MOTION.toastOut,easing:MOTION.exitEase,fill:'both'}).then(()=>{
   if(this.toastState===state&&state.closing&&state.revision===revision){const restore=state.el.contains(document.activeElement);state.el.remove();this.toastState=null;if(restore&&state.returnFocus)this.root.querySelector(state.returnFocus)?.focus({preventScroll:true});}
  });state.el.dataset.toastState='exiting';
 }
}
