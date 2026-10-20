import {demoDocument as document} from "./demo-context.js?v=original-dark-1";
import { textFor, tagLabel, matchesText } from './copy.zh-CN.js';
export function imageSrc(src){
 return {'/demos/soul-script/assets/lake.jpg':'/demos/soul-script/assets/lake-hd.jpg','/demos/soul-script/assets/ocean.jpg':'/demos/soul-script/assets/ocean-hd.jpg','/demos/soul-script/assets/cliff.jpg':'/demos/soul-script/assets/cliff-hd.jpg'}[src]||src;
}
export function renderSearch(state,h){
 const {esc,icon,noteCard,postCard}=h,q=state.searchQuery.trim().toLowerCase(),scope=state.searchScope;
 const privateItems=state.inspirations.filter(x=>!q||matchesText(x,q));
 const publicItems=state.circle.filter(x=>!q||matchesText(x,q));
 const showMine=scope!=='circle',showCircle=scope!=='mine';
 let results='';
 if(showMine&&privateItems.length)results+='<section class="discovery-group"><div class="discovery-result-title"><h2>'+(q?'我的随记':'最近的随记')+'</h2><span>'+privateItems.length+' 条</span></div><div class="search-note-list">'+privateItems.slice(0,q?80:6).map(noteCard).join('')+'</div></section>';
 if(showCircle){
  if(state.circleStatus==='loading')results+='<div class="loading" role="status"><div class="pulse"></div>正在翻开诗集…</div>';
  else if(state.circleStatus==='error')results+='<div class="empty"><p>'+esc(state.circleError)+'</p><button class="secondary" data-action="retry-circle">再翻一次</button></div>';
  else if(publicItems.length)results+='<section class="discovery-group"><div class="discovery-result-title"><h2>'+(q?'小集里的诗文':'小集选读')+'</h2><span>'+publicItems.length+' 条</span></div>'+publicItems.slice(0,q?80:6).map(postCard).join('')+'</section>';
 }
 if(!results)results='<div class="discovery-empty"><span>'+icon('search')+'</span><h2>'+'没有找到对应内容'+'</h2><p>'+'试试其他关键词，或切换搜索范围。'+'</p></div>';
 return '<main class="screen discovery-screen" id="screen"><header class="feature-header"><button class="icon-btn" data-action="close-search" aria-label="返回搜索来源">'+icon('back')+'</button><div><h1 class="page-title">搜索</h1><p>找一段曾经打动你的话</p></div></header><div class="discovery-content"><label class="discovery-input">'+icon('search',true)+'<input id="discovery-query" type="search" value="'+esc(state.searchQuery)+'" placeholder="'+(scope==='circle'?'找诗文，或一位作者…':'搜索灵感或关键词…')+'" aria-label="搜索内容" autocomplete="off"><button data-action="search-clear" aria-label="清除搜索" '+(!state.searchQuery?'hidden':'')+'>×</button></label><div class="search-scopes" aria-label="搜索范围">'+[['all','全部'],['mine','我的随记'],['circle','灵感小集']].map(([key,label])=>'<button class="'+(scope===key?'active':'')+'" data-action="search-scope" data-scope="'+key+'" aria-pressed="'+(scope===key)+'">'+label+'</button>').join('')+'</div><div id="discovery-results">'+results+'</div></div></main>';
}
// Presentation dates for existing collections and restored samples only; never rewrite saved timestamps or memory data.
export const TRACE_DEFAULT_MONTH='2026-01';
export const TRACE_PREVIEW_MONTH='2025-12';
const traceSlots=[
 ['2025-11',[[2,1],[4,1],[6,2],[8,1],[10,1],[12,2],[14,1],[16,1],[18,2],[20,1],[22,1],[24,1],[26,1],[29,2]]],
 ['2025-12',[[1,1],[3,1],[5,2],[7,1],[9,1],[11,2],[13,1],[15,1],[17,2],[19,1],[21,1],[23,1],[25,2],[27,1],[30,1]]],
 ['2026-01',[[2,1],[4,1],[6,2],[8,1],[10,1],[12,2],[14,1],[16,1],[18,2],[20,1],[22,1],[24,2],[26,1],[29,1]]]
].flatMap(([month,days])=>days.flatMap(([day,count])=>Array(count).fill(month+'-'+String(day).padStart(2,'0')+'T04:00:00.000Z')));
export function collectionTraceItems(items){
 const collection=items.filter(item=>item.sourceType==='restored'||(item.displayDateKind==='collection-layout'&&(item.sourceType==='public-poetry'||item.source_type==='saved_inspiration')))
  .slice().sort((a,b)=>(a.collectionOrder??0)-(b.collectionOrder??0)||a.id.localeCompare(b.id));
 const displayDates=new Map(collection.map((item,index)=>[item.id,traceSlots[index%traceSlots.length]]));
 return items.map(item=>displayDates.has(item.id)?{...item,displayDate:displayDates.get(item.id)}:item);
}
export function traceDate(item,mode='created'){
 const value=mode==='display'?(item.displayDate||item.createdAt):item.createdAt;
 if(!value||!Number.isFinite(Date.parse(value)))return '';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export const TRACE_COLLECTION_MONTHS=['2025-11','2025-12','2026-01'];
export function traceAvailableMonths(items,mode='display'){
 return [...new Set(collectionTraceItems(items).map(item=>traceDate(item,mode).slice(0,7)).filter(Boolean))].sort();
}
export function traceMonthForMode(items,mode,requested){
 const months=traceAvailableMonths(items,mode);
 if(months.includes(requested))return requested;
 return mode==='display'&&months.includes(TRACE_DEFAULT_MONTH)?TRACE_DEFAULT_MONTH:months.at(-1)||TRACE_DEFAULT_MONTH;
}
export function renderTraces(state,h){
 const {esc,icon,noteCard}=h,mode=state.traceMode==='created'?'created':'display',month=traceMonthForMode(state.inspirations,mode,state.traceMonth);
 const available=traceAvailableMonths(state.inspirations,mode),monthIndex=available.indexOf(month);
 const displayItems=collectionTraceItems(state.inspirations),totals=Object.fromEntries(TRACE_COLLECTION_MONTHS.map(key=>[key,displayItems.filter(item=>traceDate(item,'display').startsWith(key)).length]));
 const shortcuts='<div class="trace-month-shortcuts" aria-label="收藏月份">'+TRACE_COLLECTION_MONTHS.map(key=>{const [y,m]=key.split('-').map(Number);return '<button data-action="trace-jump" data-month="'+key+'" class="'+(mode==='display'&&month===key?'active':'')+'" aria-pressed="'+(mode==='display'&&month===key)+'"><strong>'+y+'年'+m+'月</strong><small>'+totals[key]+' 条</small></button>';}).join('')+'</div>';
 const [year,m]=month.split('-').map(Number),first=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7,days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const groups=new Map();for(const item of collectionTraceItems(state.inspirations)){const date=traceDate(item,mode);if(date.startsWith(month)){if(!groups.has(date))groups.set(date,[]);groups.get(date).push(item);}}
 const monthTotal=[...groups.values()].reduce((sum,x)=>sum+x.length,0),allDates=[...groups.keys()].sort().reverse(),dates=state.traceDate?[state.traceDate]:allDates;
 let calendar=Array.from({length:first},()=>'<span class="calendar-blank"></span>').join('');
 for(let d=1;d<=days;d++){const date=month+'-'+String(d).padStart(2,'0'),count=groups.get(date)?.length||0;calendar+='<button class="calendar-day '+(count?'has-records':'')+' '+(date===state.traceDate?'selected':'')+'" data-count="'+count+'" data-density="'+(!count?'none':count===1?'low':count<=3?'medium':'high')+'" data-action="trace-day" data-date="'+date+'" aria-label="'+date+'，'+count+' 条灵感" aria-pressed="'+(date===state.traceDate)+'" '+(!count?'disabled':'')+'><span>'+d+'</span>'+(count?'<i></i>':'')+'</button>';}
 const list=dates.filter(date=>groups.has(date)).map(date=>'<section class="trace-day-section"><header><strong>'+esc(date)+'</strong><span>'+groups.get(date).length+' 条</span></header>'+groups.get(date).map(item=>noteCard({...item,displayDate:traceDate(item,mode)})).join('')+'</section>').join('');
 return '<main class="screen traces-screen" id="screen"><header class="feature-header"><button class="icon-btn" data-action="close-traces" aria-label="返回回响">'+icon('back')+'</button><div><h1 class="page-title">收藏足迹</h1><p>按日子，慢慢翻阅</p></div></header><div class="traces-content"><div class="trace-mode">'+[['display','收藏足迹'],['created','实际保存']].map(([key,label])=>'<button data-action="trace-mode" data-mode="'+key+'" class="'+(mode===key?'active':'')+'">'+label+'</button>').join('')+'</div><p class="trace-explanation">'+(mode==='created'?'这里保留每条内容实际保存的时间。':'按收藏编排的日期翻阅，真实保存时间可在「实际保存」查看。')+'</p>'+shortcuts+'<section class="calendar-card"><div class="calendar-heading"><button data-action="trace-month" data-step="-1" aria-label="上一个有记录的月份" '+(monthIndex<=0?'disabled':'')+'>'+icon('back',true)+'</button><h2>'+year+' 年 '+m+' 月</h2><button data-action="trace-month" data-step="1" aria-label="下一个有记录的月份" '+(monthIndex<0||monthIndex>=available.length-1?'disabled':'')+'>'+icon('arrow',true)+'</button></div><div class="calendar-weekdays">'+['一','二','三','四','五','六','日'].map(day=>'<span>'+day+'</span>').join('')+'</div><div class="calendar-grid">'+calendar+'</div><div class="trace-summary"><span>本月 <strong>'+monthTotal+'</strong> 条</span><span><strong>'+groups.size+'</strong> 天有记录</span></div></section><div class="trace-list-heading"><h2>'+(state.traceDate?esc(state.traceDate):'这个月的灵感')+'</h2>'+(state.traceDate?'<button data-action="trace-clear">查看整月</button>':'')+'</div><div class="trace-list">'+(list||'<div class="discovery-empty"><h2>这个月还没有记录</h2><p>可以切换月份，或记录此刻的灵感。</p></div>')+'</div></div></main>';
}

// Decorative only: fixed positions never imply extra records or persona evidence.
export function insightStardust(kind='persona'){
 const tones=['#64e5b9','#ad9bfa','#f7cc7b','#f293bb','#8ed5ef'];
 const [count,initialSeed]=({persona:[64,2701],prompt:[28,5309],traces:[32,9173],profile:[24,7441],'profile-records':[14,3181],'profile-days':[12,6841],preferences:[18,4219]})[kind]||[24,9173];
 let seed=initialSeed;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const points=Array.from({length:count},(_,i)=>{
  const angle=random()*Math.PI*2,radius=Math.sqrt(random()),x=50+Math.cos(angle)*radius*45,y=50+Math.sin(angle)*radius*40;
  const main=i%11===0,size=main?2.4: .7+random()*1.05;
  const alpha=main?.9:.28+random()*.42,duration=11+random()*7,delay=-random()*18;
  return '<i class="insight-star'+(main?' is-main':'')+'" style="--star-x:'+x.toFixed(2)+'%;--star-y:'+y.toFixed(2)+'%;--star-size:'+size.toFixed(2)+'px;--star-color:'+tones[i%5]+';--star-alpha:'+alpha.toFixed(2)+';--star-cycle:'+duration.toFixed(2)+'s;--star-delay:'+delay.toFixed(2)+'s"></i>';
 }).join('');
 return '<span class="insight-stardust stardust-'+kind+'" aria-hidden="true">'+points+'</span>';
}

export function personaCard(state,h){
 const {esc,icon}=h,p=state.insights?.persona||{status:'empty',recordCount:0,authoredTotal:0,excludedCount:state.inspirations.length,keywords:[],evidenceIds:[]};
 const kinds={peaceful:{title:'安静的观察者',en:'THE QUIET OBSERVER',icon:'cloud',tone:'宁静',copy:'文字里有更多停留与观察，平常的细节被你慢慢拾起。'},melancholic:{title:'听雨的人',en:'THE RAIN LISTENER',icon:'cloud',tone:'低回',copy:'较低回的文字色彩更常出现。你留下一些细微而有余韵的片刻，值得慢慢回看。'},bright:{title:'微光捕手',en:'THE LIGHT SEEKER',icon:'sun',tone:'明亮',copy:'文字里更常出现轻快、期待与明亮的色彩，细小的发现成为了新的灵感。'},warm:{title:'温度的收藏者',en:'THE WARM COLLECTOR',icon:'heart',tone:'温暖',copy:'文字里更常出现人与人之间的温度。你把那些被触动的瞬间留了下来。'},reflective:{title:'沉思的漫游者',en:'THE QUIET THINKER',icon:'moon',tone:'沉思',copy:'文字里有更多追问、联想与停顿。散落的念头，正在逐渐找到彼此。'}};
 const type=kinds[p.dominantMood]||{title:'交汇中的思绪',en:'A CHANGING LANDSCAPE',icon:'spark',tone:'交汇',copy:'这些记录呈现了多种文字色彩，暂时没有明显占优的倾向。'},ready=p.status==='ready',growing=p.status==='growing';
 const title=ready?type.title:growing?'思绪，正在慢慢成形':'从一段日常开始';
 const description=ready?type.copy:growing?'已经记下 '+p.recordCount+' 段话。再写一点，就能回看最近常想些什么。':'写下看见的、想到的。过些日子，再回来看。';
 const evidence=(p.evidenceIds||[]).map(id=>state.inspirations.find(item=>item.id===id)).filter(Boolean);
 const context='<p>依据近 30 天个人记录的情绪标签与关键词整理。'+(p.excludedCount?esc(p.excludedCount)+' 条示例与收藏未计入。':'')+'</p>';
 const details=ready?'<button class="persona-evidence-toggle" data-action="persona-evidence" aria-expanded="'+!!state.personaExpanded+'" aria-controls="persona-evidence">'+(state.personaExpanded?'收起依据':'看看依据')+' <span>'+(state.personaExpanded?'−':'+')+'</span></button>'+(state.personaExpanded?'<div class="persona-evidence-content" id="persona-evidence">'+context+evidence.map(item=>'<button data-action="open-note" data-id="'+esc(item.id)+'">'+esc(textFor(item).slice(0,90))+(textFor(item).length>90?'…':'')+'</button>').join('')+'</div>':''):'<details class="persona-method"><summary>如何整理'+icon('plus',true)+'</summary>'+context+'</details>';
 return '<section class="persona writing-persona '+(ready?'persona-'+esc(p.dominantMood||'mixed'):'persona-waiting')+'" aria-labelledby="thoughts-title">'+insightStardust('persona')+'<div class="persona-icon" aria-hidden="true">'+icon(ready?type.icon:'cloud')+'</div><div class="eyebrow" id="thoughts-title">书写画像</div><h3>'+esc(ready?title:growing?'思绪渐成形':'静待第一笔')+'</h3><small>近 30 天 · '+p.recordCount+' 条个人记录</small><p class="persona-description">'+esc(description)+'</p>'+(ready&&p.keywords.length?'<div class="persona-keywords">'+p.keywords.map(term=>'<span># '+esc(tagLabel(term.label))+'</span>').join('')+'</div>':'')+'<div class="persona-basis">'+(ready?'<span>从最近的文字中整理</span>':'<button class="persona-start" data-action="persona-write">写下此刻 '+icon('arrow',true)+'</button>')+'</div>'+details+'</section>';
}


// Measure the rendered cards instead of estimating their text or image height.
export function mountMasonry(host){
 if(!host)return ()=>{};
 const cards=[...host.children],gap=10;
 let stopped=false,frame=0,lastKey='';
 const layout=()=>{
  frame=0;if(stopped||!host.isConnected||!host.clientWidth)return;
  const width=host.clientWidth,columnWidth=(width-gap)/2;
  host.style.setProperty('--masonry-card-width',columnWidth+'px');
  host.classList.add('is-positioned');
  const sizes=cards.map(card=>Math.ceil(card.offsetHeight));
  const key=width+':'+sizes.join(',');if(key===lastKey)return;lastKey=key;
  const heights=[0,0];
  cards.forEach((card,index)=>{
   const column=heights[0]<=heights[1]?0:1;
   card.style.left=(column*(columnWidth+gap))+'px';
   card.style.top=heights[column]+'px';
   heights[column]+=sizes[index]+gap;
  });
  host.style.height=Math.max(0,Math.max(...heights)-gap)+'px';
 };
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(layout);};
 layout();
 const observer=new ResizeObserver(schedule);observer.observe(host);cards.forEach(card=>observer.observe(card));
 host.addEventListener('load',schedule,true);host.addEventListener('error',schedule,true);
 document.fonts?.ready.then(schedule);
 return ()=>{stopped=true;observer.disconnect();cancelAnimationFrame(frame);host.removeEventListener('load',schedule,true);host.removeEventListener('error',schedule,true);};
}
