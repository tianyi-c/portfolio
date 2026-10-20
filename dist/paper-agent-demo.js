(()=>{
 const stage=document.querySelector('.paper-demo-stage');
 const frame=stage?.querySelector('iframe');
 const button=document.querySelector('.paper-demo-fullscreen');
 const openLink=document.querySelector('.paper-demo-actions a[target="_blank"]');
 if(!stage||!frame||!button)return;

 const resize=()=>stage.style.setProperty('--paper-demo-scale',String(stage.clientWidth/1280));
 new ResizeObserver(resize).observe(stage);resize();
 if(!document.fullscreenEnabled)button.hidden=true;
 button.addEventListener('click',async()=>{
  try{await stage.requestFullscreen();}catch{window.open(frame.src,'_blank','noopener');}
 });

 // 就绪信号：Vue 应用挂载并完成画作数据加载后发 postMessage({type:'paper-agent-ready'})
 // 超时兜底：18 秒后仍未收到信号，切换为 fallback（含重新加载按钮）
 // 迟到恢复：超时后如信号迟到，立刻移除 fallback，恢复正常状态
 // 懒加载感知：iframe 设有 loading="lazy"，进入视口后才开始加载，
 //             用 IntersectionObserver 感知可见后再启动计时，避免过早超时

 const FRAME_ORIGIN=(()=>{try{return new URL(frame.src).origin;}catch{return null;}})();
 const TIMEOUT_MS=18000;
 let mask=null,timer=null,ready=false,observed=false;

 function removeMask(){if(mask){mask.remove();mask=null;}}

 function ensureSpinStyle(){
  if(document.getElementById('paper-spin-kf'))return;
  const s=document.createElement('style');s.id='paper-spin-kf';
  s.textContent='@keyframes paper-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){@keyframes paper-spin{to{transform:none}}}';
  document.head.appendChild(s);
 }

 function showLoading(){
  if(ready)return;
  removeMask();ensureSpinStyle();
  mask=document.createElement('div');
  mask.dataset.paperState='loading';
  mask.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--surface,#faf7f0);font-size:12px;color:var(--muted,#999);pointer-events:none';
  mask.innerHTML='<span style="width:20px;height:20px;border:2px solid var(--line,#e0d8cc);border-top-color:var(--teal,#2a9d8f);border-radius:50%;animation:paper-spin .8s linear infinite" aria-hidden="true"></span><span>加载中…</span>';
  stage.appendChild(mask);
 }

 function showFallback(){
  if(ready)return;
  removeMask();
  mask=document.createElement('div');
  mask.dataset.paperState='error';
  mask.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--surface,#faf7f0);font-size:13px;line-height:20px;color:var(--muted,#888);text-align:center;padding:24px';
  const openHtml=openLink?'<a href="'+openLink.href+'" target="_blank" rel="noopener" style="color:var(--teal,#2a9d8f);text-decoration:none">独立打开演示系统 ↗</a>':'';
  mask.innerHTML='<span>演示系统未能响应，可能是网络原因或浏览器限制。</span>'
   +'<div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center">'
   +'<button style="color:var(--teal,#2a9d8f);background:none;border:none;font:inherit;cursor:pointer;text-decoration:underline;padding:0" data-retry>重新加载</button>'
   +openHtml+'</div>';
  mask.querySelector('[data-retry]')?.addEventListener('click',retryLoad);
  stage.appendChild(mask);
 }

 function markReady(){
  ready=true;clearTimeout(timer);removeMask();
 }

 function startTimer(){
  clearTimeout(timer);
  timer=setTimeout(showFallback,TIMEOUT_MS);
 }

 function retryLoad(){
  ready=false;
  showLoading();
  const src=frame.src||openLink?.href||'';
  const clean=src.replace(/[?&]_retry=\d+/,'');
  const sep=clean.includes('?')?'&':'?';
  frame.src=clean+sep+'_retry='+Date.now();
  startTimer();
 }

 // 校验消息来源：origin 必须与 iframe src 一致，且消息必须来自 iframe 本身
 window.addEventListener('message',(e)=>{
  if(!FRAME_ORIGIN||e.origin!==FRAME_ORIGIN)return;
  if(e.source!==frame.contentWindow)return;
  if(e.data?.type==='paper-agent-ready')markReady();
 });

 // IntersectionObserver：iframe 进入视口后再显示 loading 并启动计时
 // 这样即使页面很长，用户滚动到 demo 区才开始等待，不会提前超时
 const io=new IntersectionObserver((entries)=>{
  if(!observed&&entries[0].isIntersecting){
   observed=true;io.disconnect();
   showLoading();startTimer();
  }
 },{threshold:0.1});
 io.observe(stage);
})();
