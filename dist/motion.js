// Draw our own small line icons, leaving text and layout untouched.
function drawInkIcon(svg,name){
  const symbol=document.getElementById(`icon-${name}`);
  if(!symbol)return;
  svg.replaceChildren(...[...symbol.children].map(child=>child.cloneNode(true)));
  svg.setAttribute('viewBox',symbol.getAttribute('viewBox')||'0 0 24 24');
  svg.classList.add('motion-icon');
  svg.dataset.kind=name;
}
document.querySelectorAll('svg.icon use').forEach(use=>{
  const name=use.getAttribute('href')?.replace('#icon-','');
  if(name)drawInkIcon(use.parentElement,name);
});

// Navigation has one continuous indicator, with a static underline fallback.
const navigation=document.querySelector('nav');
const navigationLinks=[...navigation.querySelectorAll('a')];
const marker=document.createElement('span');
marker.className='nav-marker';marker.setAttribute('aria-hidden','true');
navigation.append(marker);navigation.classList.add('has-marker');
let hoveredNavigation=null;
function positionMarker(){
  const selected=hoveredNavigation||navigation.querySelector('a[aria-current]')||navigationLinks[0];
  marker.style.width=`${selected.offsetWidth}px`;
  marker.style.transform=`translateX(${selected.offsetLeft}px)`;
  marker.style.opacity='1';
}
function markNavigation(id){
  const destination=['experience','research','undergrad'].includes(id)?'#experience':`#${id}`;
  navigationLinks.forEach(link=>{
    if(link.hash===destination)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  positionMarker();
}
navigationLinks.forEach(link=>{
  link.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hoveredNavigation=link;positionMarker()}});
  link.addEventListener('focus',()=>{hoveredNavigation=link;positionMarker()});
  link.addEventListener('blur',()=>{hoveredNavigation=null;positionMarker()});
  link.addEventListener('click',()=>markNavigation(link.hash.slice(1)));
});
navigation.addEventListener('pointerleave',()=>{hoveredNavigation=null;positionMarker()});
positionMarker();
requestAnimationFrame(()=>navigation.classList.add('marker-ready'));
if('ResizeObserver'in window)new ResizeObserver(positionMarker).observe(navigation);
document.fonts.ready.then(positionMarker);
if('IntersectionObserver'in window){
  const sections=[...document.querySelectorAll('#education,#experience,#research,#undergrad,#contact')];
  const visible=new Set();
  const tracker=new IntersectionObserver(entries=>{
    entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));
    const section=sections.find(item=>visible.has(item));
    if(section)markNavigation(section.id);
  },{rootMargin:'-8% 0px -58% 0px',threshold:0});
  sections.forEach(section=>tracker.observe(section));
}

// Link previews show actual document context, without changing link actions.
const linkPreview=document.querySelector('#link-preview');
const previewContent={
  resume:{icon:'note',title:'陈天仪 · 简历',description:'教育背景、岚图实习与设计研究。',meta:'Word 文档 · 下载'},
  portfolio:{icon:'book',title:'本科作品集',description:'文化研究、服务设计与交互实践。',meta:'PDF · 在新窗口查看'}
};
let previewAnchor=null,previewShowTimer,previewHideTimer;
function hideLinkPreview(){
  clearTimeout(previewShowTimer);clearTimeout(previewHideTimer);
  previewAnchor?.removeAttribute('aria-describedby');
  previewAnchor=null;linkPreview.hidden=true;
}
function positionLinkPreview(anchor){
  const bounds=anchor.getBoundingClientRect(),width=linkPreview.offsetWidth,height=linkPreview.offsetHeight;
  const above=bounds.top>=height+22;
  linkPreview.style.left=`${Math.max(12,Math.min(bounds.left,innerWidth-width-12))}px`;
  linkPreview.style.top=`${Math.max(12,Math.min(above?bounds.top-height-12:bounds.bottom+12,innerHeight-height-12))}px`;
}
function showLinkPreview(anchor){
  const data=previewContent[anchor.dataset.linkPreview];
  if(!data)return;
  previewAnchor?.removeAttribute('aria-describedby');previewAnchor=anchor;
  drawInkIcon(linkPreview.querySelector('svg'),data.icon);
  linkPreview.querySelector('.preview-title').textContent=data.title;
  linkPreview.querySelector('.preview-description').textContent=data.description;
  linkPreview.querySelector('.preview-meta').textContent=data.meta;
  linkPreview.hidden=false;anchor.setAttribute('aria-describedby','link-preview');
  positionLinkPreview(anchor);
}
function schedulePreviewClose(){clearTimeout(previewShowTimer);previewHideTimer=setTimeout(hideLinkPreview,100)}
document.querySelectorAll('[data-link-preview]').forEach(anchor=>{
  anchor.addEventListener('pointerenter',event=>{
    if(event.pointerType!=='mouse')return;
    clearTimeout(previewHideTimer);clearTimeout(previewShowTimer);
    previewShowTimer=setTimeout(()=>showLinkPreview(anchor),linkPreview.hidden?220:0);
  });
  anchor.addEventListener('pointerleave',schedulePreviewClose);
  anchor.addEventListener('focus',()=>{clearTimeout(previewHideTimer);showLinkPreview(anchor)});
  anchor.addEventListener('blur',hideLinkPreview);
  anchor.addEventListener('click',hideLinkPreview);
});
linkPreview.addEventListener('pointerenter',()=>clearTimeout(previewHideTimer));
linkPreview.addEventListener('pointerleave',schedulePreviewClose);
window.addEventListener('scroll',()=>{
  if(previewAnchor&&document.activeElement===previewAnchor){
    const bounds=previewAnchor.getBoundingClientRect();
    if(bounds.top>=0&&bounds.bottom<=innerHeight){positionLinkPreview(previewAnchor);return}
  }
  hideLinkPreview();
},{passive:true});
window.addEventListener('resize',hideLinkPreview);
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideLinkPreview()});

