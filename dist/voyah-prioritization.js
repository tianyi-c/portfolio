// All issue details and qualitative positions come from the supplied workbook.
(()=>{
 const root=document.querySelector('#workflow .priority-map-wrap');
 if(!root)return;
 const tip=root.querySelector('.priority-tooltip');
 const points=[...root.querySelectorAll('.priority-point')];
 const samePosition=point=>points.filter(peer=>peer.dataset.x===point.dataset.x&&peer.dataset.y===point.dataset.y);
 let active;
 tip.id='priority-map-tooltip';
 function close(){tip.hidden=true;active?.removeAttribute('aria-describedby');active=null;}
 function show(point){
  active?.removeAttribute('aria-describedby');
  active=point;point.setAttribute('aria-describedby',tip.id);
  const d=point.dataset;
  const field=(tag,value,cls)=>{const node=document.createElement(tag);node.textContent=value;if(cls)node.className=cls;return node;};
  const content=[field('strong',d.name),field('span','当前不便：'+d.problem,'tooltip-problem'),
   field('span','判断：'+d.judgment)];
  if(d.response&&point.classList.contains('is-response'))content.push(field('span','→ '+d.response,'tooltip-response'));
  if(d.trend==='true')content.push(field('span','↑ Industry Trend','tooltip-trend'));
  tip.replaceChildren(...content);tip.hidden=false;
  const circle=point.querySelector('.priority-dot').getBoundingClientRect(),box=root.getBoundingClientRect();
  const x=circle.left+circle.width/2-box.left,y=circle.top-box.top;
  const left=Math.max(4,Math.min(x+16,box.width-tip.offsetWidth-4));
  const preferred=y-tip.offsetHeight-14;
  const top=preferred<0?y+19:preferred;
  tip.style.left=left+'px';tip.style.top=Math.min(top,Math.max(0,box.height-tip.offsetHeight-4))+'px';
 }
 points.forEach(point=>{
  point.id='priority-issue-'+point.dataset.id;
  point.addEventListener('pointerenter',()=>show(point));
  point.addEventListener('pointerleave',close);
  point.addEventListener('focus',()=>show(point));point.addEventListener('blur',close);
  point.addEventListener('click',()=>{const peers=samePosition(point);show(peers.length>1?peers[(peers.indexOf(active)+1)%peers.length]:point)});
 });
 root.querySelector('.priority-map-scroll').addEventListener('scroll',close,{passive:true});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.priority-point'))close()});
 window.addEventListener('resize',()=>{if(active)show(active)});
})();
