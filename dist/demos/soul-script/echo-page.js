import {displayTextFor,sourceLabel,graphEchoExplanation} from './copy.zh-CN.js';
const DAY=86400000;
export function echoDate(value,{time=false}={}){
 if(!Number.isFinite(Date.parse(value)))return '';
 return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric',...(time?{hour:'2-digit',minute:'2-digit',hour12:false}:{})}).format(new Date(value));
}
export function echoDistance(current,old){
 const days=Math.floor((Date.parse(current)-Date.parse(old))/DAY);
 if(!Number.isFinite(days)||days<0)return '';
 if(days===0)return '同一天';if(days===1)return '1 天前';
 if(days<30)return days+' 天前';if(days<365)return Math.floor(days/30)+' 个月前';
 return Math.floor(days/365)+' 年前';
}
export function echoGraphHref(source,target){
 const query=new URLSearchParams({source,target});return '#graph?'+query.toString();
}
export function echoGraphRoute(hash){
 const [name,query='']=String(hash||'').split('?');if(name!=='#graph')return null;
 const p=new URLSearchParams(query),source=p.get('source'),target=p.get('target');
 return source&&target?{source,target}:null;
}
const recordMark='<svg class="icon echo-record-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h5"/></svg>';
const relationMark='<svg class="icon echo-relation-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
function photo(record,esc){
 const image=record.images?.[0];if(!image?.url)return '';
 return '<div class="echo-photo"><img src="'+esc(image.thumb||image.url)+'" alt="'+esc(image.alt||'记录配图')+'" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>';
}
export function renderEchoPage(state,{esc,icon}){
 const page=state.echoPage,loading=state.echoLoadStatus==='loading'&&!page,trigger=page?.trigger;
 const header='<header class="echo-header"><h1 class="page-title">回响</h1></header>';
 let current;
 if(loading)current='<div class="echo-loading" role="status"><i aria-hidden="true"></i>正在翻开这一笔…</div>';
 else if(trigger)current='<article class="echo-trigger" data-trigger-id="'+esc(trigger.id)+'"><div class="echo-card-meta"><span><i aria-hidden="true"></i>刚刚这一笔</span><time datetime="'+esc(trigger.created_at)+'">'+esc(echoDate(trigger.created_at,{time:true}))+'</time></div><p class="echo-current-text">'+esc(displayTextFor(trigger)||'留下了一幅画面。')+'</p>'+photo(trigger,esc)+'</article>';
 else current='<section class="echo-first-note"><span class="echo-section-label">刚刚这一笔</span><p>想起什么，就写下来。</p><button data-action="navigate" data-page="capture" class="echo-start">'+icon('plus',true)+' 记一笔</button></section>';
 const selected=page?.status==='ready'&&page.should_surface===true?(page.selected||[]).slice(0,2):[];
 let past;
 if(selected.length&&trigger){
  past='<section class="echo-past" aria-labelledby="echo-past-title"><div class="echo-section-heading"><i aria-hidden="true"></i><h2 id="echo-past-title">过去的回响</h2><span>'+selected.length+' 段旧文字</span></div><div class="echo-history">'+selected.map(record=>'<article class="echo-card echo-source-'+esc(record.source_type)+'" data-echo-note-id="'+esc(record.id)+'"><div class="echo-card-meta"><span class="echo-source-label">'+recordMark+esc(sourceLabel(record))+'</span><time datetime="'+esc(record.created_at)+'">'+esc(echoDistance(trigger.created_at,record.created_at))+'</time></div><p class="echo-history-text">'+esc(displayTextFor(record)||'曾经留存的一幅画面。')+'</p>'+photo(record,esc)+'<div class="echo-original-date">'+esc(echoDate(record.created_at))+'</div><div class="echo-card-actions"><button data-action="echo-graph" data-source="'+esc(trigger.id)+'" data-id="'+esc(record.id)+'">'+relationMark+'查看关联 '+icon('graph',true)+'</button><button data-action="echo-write" data-id="'+esc(record.id)+'">'+icon('pen',true)+' 从这里继续写</button></div></article>').join('')+'</div></section>';
 }else{
  const pending=page?.status==='pending';
  const unavailable=state.echoLoadStatus==='error'||['failed','stale','unavailable'].includes(page?.status);
  const title=trigger?'这一笔先静静留在这里。':'回响，从一笔开始。';
  const description=loading?'':pending?'这一笔已经留下，等旧文字慢慢靠近。':unavailable?'记录已妥善保存，暂时没有可展示的回响。':trigger?'暂时没有找到值得重新带回的旧记录。':'记下此刻，给旧文字一个重新相遇的机会。';
  past='<section class="echo-quiet" aria-label="'+(pending?'回响正在整理':'暂无回响')+'"><div class="echo-quiet-mark" aria-hidden="true"><i></i><i></i><span></span></div><h2>'+title+'</h2><p>'+description+'</p>'+(!loading&&!pending?'<p class="echo-mechanism-note">'+esc(graphEchoExplanation)+'</p>':'')+(unavailable?'<button data-action="echo-refresh">再翻一翻 '+icon('reload',true)+'</button>':'')+'</section>';
 }
 return '<main class="screen echo-screen" id="screen">'+header+'<div class="echo-content">'+current+past+'</div></main>';
}
export function watchEchoExposure(root,page,{mark,IntersectionObserverClass=globalThis.IntersectionObserver}={}){
 if(!root||!IntersectionObserverClass||page?.status!=='ready'||!page.should_surface||!page.trigger)return ()=>{};
 const allowed=new Set(page.selected.map(x=>x.id)),timers=new Map(),acknowledged=new Set();
 let closed=false;
 const observer=new IntersectionObserverClass(entries=>{
  for(const entry of entries){
   const id=entry.target.dataset.echoNoteId;
   if(!allowed.has(id)||acknowledged.has(id))continue;
   if(entry.isIntersecting&&entry.intersectionRatio>=.5){
    if(timers.has(id))continue;
    timers.set(id,setTimeout(()=>{
     timers.delete(id);if(closed||globalThis.document?.hidden)return;
     acknowledged.add(id);Promise.resolve().then(()=>mark(page.trigger.id,[id])).catch(()=>acknowledged.delete(id));
    },500));
   }else{clearTimeout(timers.get(id));timers.delete(id);}
  }
 },{threshold:[0,.5]});
 root.querySelectorAll('[data-echo-note-id]').forEach(node=>observer.observe(node));
 return ()=>{closed=true;observer.disconnect();for(const timer of timers.values())clearTimeout(timer);timers.clear();};
}
