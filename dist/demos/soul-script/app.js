import {demoDocument as document,demoWindow as window,demoLocation as location,demoHistory as history,registerNavigation,shareState} from "./demo-context.js?v=original-dark-1";
import {renderEchoPage,watchEchoExposure,echoGraphHref,echoGraphRoute} from './echo-page.js?v=echo-reference-layout-v1';
import { textFor, displayTextFor, graphEchoExplanation, tagLabel, authorLabel, sourceLabel, originalFor, hasTranslation, matchesText, curateCircle } from './copy.zh-CN.js';
import { api } from './api-client.js';
import { getGraphIndex } from './graph-connections.js';
import { matchesGraphRecord } from './graph-view.js';
import { imageSrc, renderSearch, renderTraces, personaCard, insightStardust, mountMasonry, collectionTraceItems, traceDate, TRACE_DEFAULT_MONTH, TRACE_PREVIEW_MONTH, traceAvailableMonths, traceMonthForMode } from './product-features.js?v=search-clean-1';
import { AppMotion } from './ui-motion.js';

const app = document.getElementById('app');
const uiMotion = new AppMotion(app);
let disposeCapture=null;
let memoryTimer=null,memorySyncing=false,dataReadVersion=0;
let graphView=null, graphElement=null, graphModulePromise=null, graphPose=null;
let disposeWall=null,disposeEchoExposure=null,echoTimer=null,echoRequestVersion=0;
let graphPreferences={};try{graphPreferences=JSON.parse(localStorage.getItem('soul-graph-preferences')||'{}')||{};}catch{}
const draftKey = 'soul-script-draft-v1';
const moodNames = { peaceful:'宁静', melancholic:'低回', bright:'明朗', warm:'温暖', reflective:'沉思' };
const moodColors = { peaceful:'#43d5a4', melancholic:'#9696ff', bright:'#ffd447', warm:'#ff6b89', reflective:'#c8c7c5' };
const promptList = [
  '有没有一个很短的瞬间，你却记了很久？',
  '今天有什么微小的画面，让你停下了脚步？',
  '如果此刻的心情是一种天气，它会是什么？',
  '记录一个你还没来得及说出口的念头。',
  '描述一种声音，以及它唤起的记忆。'
];
const icons = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  spark:'<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  graph:'<circle cx="5" cy="5" r="2"/><circle cx="12" cy="17" r="2"/><circle cx="19" cy="6" r="2"/><path d="M5 7v14M12 3v12M12 19v2M19 8v3c0 3-7 2-7 5"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 3-7 8-7s8 3 8 7"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 5 5"/>',
  close:'<path d="M5 5l14 14M19 5 5 19"/>',
  arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
  back:'<path d="m15 5-7 7 7 7"/>',
  send:'<path d="m4 12 16-8-4 16-4-6-8-2zM12 14l8-10"/>',
  mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  filter:'<path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  external:'<path d="M13 4h7v7M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
  pen:'<path d="m4 20 4.5-1 11-11a2 2 0 0 0-3-3l-11 11L4 20zM14 7l3 3"/>',
  moon:'<path d="M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M20 4l-2 2M6 18l-2 2"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cloud:'<path d="M6 18h12a4 4 0 0 0 .4-8A6 6 0 0 0 7 8a5 5 0 0 0-1 10Z"/>',
  comment:'<path d="M21 11a9 9 0 0 1-9 9H3l2-5A9 9 0 1 1 21 11Z"/>',
  archive:'<path d="M4 8v11h16V8M12 3v12m-4-4 4 4 4-4"/>',
  reload:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 10a8 8 0 0 1 14-3l1 5M4 12l1 5a8 8 0 0 0 14-3"/>'
};
function icon(name, small=false){ return '<svg class="icon'+(small?' sm':'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.spark)+'</svg>'; }
function esc(value){ return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function short(value,n){const s=String(value||'');return s.length>n?s.slice(0,n)+'…':s;}
function fmtDate(value){try{return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(new Date(value));}catch{return '';}}
function fmtFull(value){try{return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(new Date(value));}catch{return '';}}
function dayKey(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function currentPrompt(){return promptList[Math.floor(Date.now()/86400000)%promptList.length];}
const state = {
  page:location.hash.split('?')[0]==='#graph'?'graph':location.hash==='#traces'?'traces':['#echo','#insights'].includes(location.hash)?'insights':'home', tab:'mine', previous:'home', inspirations:[], preferences:{ theme:'light',style:'ink',preset:'p1',opacity:85,blur:0,displayName:'漫游诗人' },
  weather:null,weatherStatus:'idle',weatherError:'',searchQuery:'',searchScope:'all',searchFrom:null,traceMonth:TRACE_DEFAULT_MONTH,traceMode:'display',traceDate:'',
  echoPage:null,echoLoadStatus:'idle',echoGraphTarget:echoGraphRoute(location.hash)?.target||null,
  memoryRevision:null,memoryPending:0,insights:null, graph:null, circle:[], circleStatus:'idle', circleError:'', circleNotice:'', search:'', detailId:null,
  captureText:localStorage.getItem(draftKey)||'', captureImage:null, captureSent:null,
  captureReturn:null,captureSession:0,captureQuestionOpen:false,captureFocusRequested:false,capturePrompt:'', captureSource:null, graphWriteReturn:null, editing:false, modal:null, filterOpen:false, graphMood:'all', selectedNode:echoGraphRoute(location.hash)?.source||null,
  homeScroll:0, busy:false, wallView:'grid',connections:graphPreferences.connections??true,graphZoom:1,graphSearch:'',graphViewSeed:0,graphKeyword:null,graphRotate:graphPreferences.rotate??true,graphInfo:false,graphList:false,graphExpanded:false,weights:{semantic:60,structural:30,serendipity:38,...graphPreferences.weights}
};
function note(id){const node=getGraphIndex(state.graph).nodesById.get(id);return node?.source_type==='personal'?(state.inspirations.find(x=>x.id===id)||node):node||state.inspirations.find(x=>x.id===id);}
function related(id){return getGraphIndex(state.graph).selectionFor(id)?.connections||[];}
function publicImages(x,preview=false){return (x.images||[]).slice(0,preview?1:4).map(image=>`<img src="${esc(preview?(image.thumb||image.url):image.url)}" alt="${esc(image.alt||'公开帖子配图')}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`).join('');}
function connectionCards(id,{compact=false}={}){return `<section class="${compact?'sheet-related':'detail-related'}" aria-label="相关灵感"><h2>相关灵感</h2><div class="record-connections">${related(id).map(c=>{const target=note(c.targetId);return `<button data-action="graph-locate" data-id="${esc(c.targetId)}" data-rank="${c.rank}" aria-label="探索相关灵感：${esc(short(displayTextFor(target),80))}"><i class="connection-bullet" aria-hidden="true"></i><p>${esc(short(displayTextFor(target),compact?140:280))}</p><small class="connection-source">${esc(sourceLabel(target))}</small></button>`;}).join('')}</div></section>`;}
function graphSelectionSheet(selected){return `<aside class="constellation-record graph-selection-sheet" data-source-id="${esc(selected.id)}" data-echo-target-id="${esc(state.echoGraphTarget||'')}" aria-label="选中灵感"><div class="sheet-heading"><span><i class="mood-dot mood-${selected.mood}"></i>${esc(sourceLabel(selected))}</span><time datetime="${esc(selected.createdAt)}">${fmtDate(selected.createdAt)}</time><button data-action="dismiss-node" aria-label="关闭灵感摘要">×</button></div><button class="sheet-excerpt" data-action="open-note" data-id="${esc(selected.id)}" aria-label="打开当前记录">${esc(short(displayTextFor(selected),300))}</button>${connectionCards(selected.id,{compact:true})}<div class="sheet-actions"><button data-action="open-note" data-id="${esc(selected.id)}">打开记录 <span aria-hidden="true">↗</span></button><button data-action="graph-continue" data-id="${esc(selected.id)}">${icon('pen',true)} 从这里继续写</button></div></aside>`;}

async function refreshData(){
  const version=++dataReadVersion;
  const [items,insights,graph]=await Promise.all([api.inspirations(),api.insights(),api.graph().catch(error=>({nodes:[],keywords:[],edges:[],error:error.message}))]);
  if(version!==dataReadVersion)return false;
  state.inspirations=items;state.insights=insights;
  if(!graph.memory||graph.memory.revision!==state.memoryRevision||state.graph?.error)state.graph=graph;
  if(graph.memory){state.memoryRevision=graph.memory.revision;state.memoryPending=graph.memory.pending;}
  scheduleMemorySync();return true;
}
function scheduleMemorySync(){
 if(memoryTimer||memorySyncing||(!state.memoryPending&&state.page!=='graph'))return;
 memoryTimer=setTimeout(syncMemory,1800);
}
async function syncMemory(){
 if(memoryTimer)clearTimeout(memoryTimer);memoryTimer=null;if(memorySyncing)return;memorySyncing=true;
 try{
  if(document.hidden)return;
  const status=await api.memoryStatus();state.memoryPending=status.pending;
  if(status.revision!==state.memoryRevision){
   const changed=await refreshData();
   // Do not replace the user's active editor or composition while inference finishes.
   if(changed&&(state.page==='graph'||state.page==='home'||(state.page==='detail'&&!state.editing)))render();
  }
 }catch{}finally{memorySyncing=false;scheduleMemorySync();}
}
function scheduleEchoRefresh(){
 if(echoTimer||state.page!=='insights'||document.hidden||state.echoPage?.status!=='pending')return;
 echoTimer=setTimeout(()=>{echoTimer=null;void refreshEchoPage({quiet:true});},2000);
}
async function refreshEchoPage({quiet=false}={}){
 const version=++echoRequestVersion;
 if(echoTimer)clearTimeout(echoTimer);echoTimer=null;
 if(!quiet&&!state.echoPage){state.echoLoadStatus='loading';if(state.page==='insights')render();}
 try{
  const result=await api.echoLatest();if(version!==echoRequestVersion)return;
  const changed=JSON.stringify(result)!==JSON.stringify(state.echoPage)||state.echoLoadStatus!=='ready';
  state.echoPage=result;state.echoLoadStatus='ready';
  if(state.page==='insights'&&changed){const top=document.getElementById('screen')?.scrollTop||0;render();document.getElementById('screen').scrollTop=top;}
 }catch{if(version!==echoRequestVersion)return;state.echoLoadStatus='error';if(state.page==='insights')render();}
 finally{if(version===echoRequestVersion)scheduleEchoRefresh();}
}
async function boot(){
  try {
    const [prefs]=await Promise.all([api.preferences(),refreshData()]);
    state.preferences=prefs;
    render();scheduleGraphWarmup();if(state.page==='insights')void refreshEchoPage();
  } catch(e) {
    app.innerHTML='<div class="page-pad"><h1>暂时无法连接本地服务</h1><p>'+esc(e.message)+'</p><button class="primary" data-action="reload">重新连接</button></div>';
  }
}
function brandMark(){return '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>';}
function topbar(){
 const tabs=[['mine','我的随记'],['circle','灵感小集']].map(([key,label])=>'<button class="'+(state.tab===key?'active':'')+'" data-action="tab" data-tab="'+key+'" aria-pressed="'+(state.tab===key)+'">'+label+'</button>').join('');
 return '<div class="topbar home-toolbar"><h1 class="page-title visually-hidden">'+(state.tab==='mine'?'我的随记':'灵感小集')+'</h1><button class="icon-btn layout-btn" data-action="wall-view" aria-label="切换灵感墙视图">'+icon(state.wallView==='grid'?'grid':state.wallView==='timeline'?'reload':'image',true)+'</button><div class="segmented" aria-label="灵感墙内容">'+tabs+'</div><button class="icon-btn" data-action="toggle-search" aria-label="搜索">'+icon('search')+'</button></div>';
}

function nav(){
 const items=[['home','home','灵感墙'],['insights','spark','回响'],['capture','plus','记录'],['graph','graph','星图'],['profile','user','我的']];
 return '<nav class="bottom-nav '+(state.page==='graph'?'on-graph':'')+'" aria-label="主导航">'+items.map(([page,ico,label])=>'<button data-action="navigate" data-page="'+page+'" class="'+(page==='capture'?'create':state.page===page?'active':'')+'" aria-label="'+label+'" aria-current="'+(state.page===page?'page':'false')+'">'+icon(ico)+'</button>').join('')+'</nav>';
}

function noteCard(x){
 const sizes={'/demos/soul-script/assets/lake-hd.jpg':[1800,1013],'/demos/soul-script/assets/ocean-hd.jpg':[1800,2700],'/demos/soul-script/assets/cliff-hd.jpg':[1800,1200],'/demos/soul-script/assets/cliff-hd.jpg':[174,160]};
 const [imageWidth,imageHeight]=sizes[imageSrc(x.image)]||[800,1000];
 return '<button class="note-card" data-action="open-note" data-id="'+esc(x.id)+'" aria-label="查看灵感 '+esc(short(displayTextFor(x),30))+'">'+(x.image?'<img class="note-art" src="'+esc(imageSrc(x.image))+'" width="'+imageWidth+'" height="'+imageHeight+'" alt="灵感配图" loading="lazy" decoding="async">':'')+'<div class="note-copy"><p>'+esc(displayTextFor(x))+'</p><div class="card-foot"><span>'+esc(sourceLabel(x))+' · '+fmtDate(x.displayDate||x.createdAt)+'</span><span class="mood-dot mood-'+esc(x.mood||'reflective')+'"></span></div></div></button>';
}

function homeResults(){
 const query=state.search.trim().toLowerCase();
 const items=state.inspirations.filter(x=>!query||matchesText(x,query));
 if(!items.length)return '<div class="empty"><h2>先记下一点日常</h2><p>一句话，一张照片，都可以。</p><button class="primary" data-action="navigate" data-page="capture">'+icon('plus',true)+' 记一笔</button></div>';
 if(state.wallView==='timeline')return '<div class="timeline">'+items.map(x=>'<div class="timeline-entry"><span>'+String(x.displayDate||x.createdAt).slice(0,10)+'</span>'+noteCard(x)+'</div>').join('')+'</div>';
 if(state.wallView==='folder')return '<div class="folder-view">'+Object.entries(moodNames).map(([m,label])=>'<section class="folder"><header>'+icon('image')+'<div><strong>'+label+'</strong><small>'+items.filter(x=>x.mood===m).length+' 条随记</small></div></header>'+items.filter(x=>x.mood===m).map(x=>'<button data-action="open-note" data-id="'+esc(x.id)+'"><p>'+esc(short(displayTextFor(x),90))+'</p><small>'+esc(sourceLabel(x))+' · '+fmtDate(x.displayDate||x.createdAt)+'</small></button>').join('')+'</section>').join('')+'</div>';
 return '<div class="masonry">'+items.map(noteCard).join('')+'</div>';
}

function renderHome(){
 return '<main class="screen home-screen" id="screen"><header class="wall-header">'+topbar()+'</header>'+(state.tab==='mine'?'<div class="wall-content"><div id="search-wrap" class="search-reveal '+(state.searchVisible?'is-open':'')+'" aria-hidden="'+(!state.searchVisible)+'" '+(!state.searchVisible?'inert':'')+'><label class="searchbox">'+icon('search',true)+'<input id="search-input" type="search" placeholder="找一段写过的话…" value="'+esc(state.search)+'" aria-label="搜索灵感"></label><span id="result-count" hidden></span></div><div id="home-results">'+homeResults()+'</div></div>':renderCircle())+'</main>';
}

function renderCircle(){
 let content='';
 if(state.circleStatus==='loading')content='<div class="loading"><div><div class="pulse"></div>正在翻开诗集…</div></div>';
 else if(state.circleStatus==='error')content='<div class="empty"><p>'+esc(state.circleError)+'</p><button class="secondary" data-action="retry-circle">再试一次</button></div>';
 else content=state.circle.map(postCard).join('');
 return '<div class="circle-content">'+content+'<p class="circle-source">'+esc(state.circleNotice||'公开诗文 · 附有原作出处')+'</p></div>';
}

function postCard(x){
 return '<article class="post"><div class="post-top"><span class="avatar">'+(x.avatar?'<img src="'+esc(x.avatar)+'" alt="">':esc((x.author||'?').slice(0,1)))+'</span><div class="post-user"><div class="post-author">'+esc(authorLabel(x.author))+'</div><div class="post-time">'+esc(x.kind==='archive'?'诗作节选 · 中文试译':fmtFull(x.publishedAt))+'</div></div><button class="icon-btn" data-action="collect-post" data-id="'+esc(x.id)+'" aria-label="收藏这篇灵感">'+icon('archive',true)+'</button></div><p>'+esc(displayTextFor(x))+'</p><div class="post-bottom"><button data-action="like-post" data-id="'+esc(x.id)+'" class="post-like '+(localStorage.getItem('liked:'+x.id)?'liked':'')+'" aria-label="喜欢">'+icon('heart',true)+'<span>'+((x.favourites||0)+(localStorage.getItem('liked:'+x.id)?1:0)||'')+'</span></button><a href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+icon('comment',true)+' '+(x.kind==='archive'?'读原作':'查看出处')+'</a><span class="post-source">'+esc(sourceLabel(x))+'</span></div></article>';
}

function renderInsights(){
 const info=state.insights||{total:0,byDay:{}},today=new Date(),dayMoods={},traceCounts={};
 const [traceYear,traceMonth]=TRACE_PREVIEW_MONTH.split('-').map(Number),traceEnd=new Date(Date.UTC(traceYear,traceMonth,0,4));
 for(const item of collectionTraceItems(state.inspirations)){
  const key=traceDate(item,'display');if(!key)continue;
  const mood=Object.hasOwn(moodNames,item.mood)?item.mood:'reflective';
  traceCounts[key]=(traceCounts[key]||0)+1;dayMoods[key]??={};dayMoods[key][mood]=(dayMoods[key][mood]||0)+1;
 }
 let cells='',activeDays=0;for(let col=0;col<12;col++)for(let row=0;row<7;row++){
  const d=new Date(traceEnd);d.setUTCDate(d.getUTCDate()-(11-col)*7-(6-row));const key=dayKey(d),n=traceCounts[key]||0;
  if(n)activeDays++;
  const tone=n?Object.keys(moodNames).sort((a,b)=>(dayMoods[key]?.[b]||0)-(dayMoods[key]?.[a]||0))[0]:'';
  cells+=`<span class="heatmap-cell ${n?'l'+Math.min(4,n)+' trace-tone-'+tone:''}" data-count="${n}" title="${key} · ${n} 条${n?' · '+moodNames[tone]:''}"></span>`;
 }
 const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'}).format(today);
 return `<main class="screen insights-screen insights-editorial" id="screen"><header class="insights-header"><div><h1>洞察</h1><p>在文字里，慢慢认识自己</p></div><time datetime="${dayKey(today)}">${date}</time></header><div class="insights-content"><section class="insight-hero" aria-labelledby="daily-question">${insightStardust('prompt')}<div class="prompt-label"><span><i aria-hidden="true"></i>今日一问</span><small>日常片刻</small></div><h2 id="daily-question">${currentPrompt().split(/(?<=[，。？])/u).filter(Boolean).map(part=>`<span class="prompt-clause">${esc(part)}</span>`).join('')}</h2><div class="prompt-bottom"><span>留一点时间，给自己。</span><button class="primary" data-action="prompt-write">${icon('pen',true)} 写几句</button></div></section>${personaCard(state,{esc,icon})}<section class="heatmap" aria-labelledby="traces-title">${insightStardust('traces')}<div class="insight-section-heading"><h2 id="traces-title">收藏足迹 <small class="trace-period">2025 年 12 月</small></h2><button class="traces-link" data-action="open-traces" aria-label="查看收藏足迹">翻一翻 ${icon('arrow',true)}</button></div><button class="trace-chart" data-action="open-traces" aria-label="查看截至2025年12月的12周收藏足迹，${activeDays}天有记录"><span class="heatmap-grid" aria-hidden="true">${cells}</span></button><div class="trace-legend" aria-label="颜色代表当天记录最多的情绪，亮度代表记录条数">${Object.entries(moodNames).map(([key,label])=>`<span class="trace-key trace-tone-${key}"><i aria-hidden="true"></i>${label}</span>`).join('')}</div><div class="heatmap-total"><span>已留下的随记与收藏</span><strong>${info.total} <small>条</small></strong></div></section></div></main>`;
}

function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function graphMatches(x){return matchesGraphRecord(x,{mood:state.graphMood,query:state.graphSearch,keyword:state.graphKeyword});}
function graphOptions(){return {theme:state.preferences.theme,viewSeed:state.graphViewSeed,mood:state.graphMood,query:state.graphSearch,keyword:state.graphKeyword,selected:state.selectedNode,connections:state.connections,rotate:state.graphRotate,weights:state.weights};}
function saveGraphPrefs(){localStorage.setItem('soul-graph-preferences',JSON.stringify({connections:state.connections,rotate:state.graphRotate,weights:state.weights}));}
function mountGraph(){
 const placeholder=document.getElementById('constellation-stage');if(!placeholder)return;
 if(graphView&&graphElement){graphElement.removeAttribute('style');graphElement.id='constellation-stage';placeholder.replaceWith(graphElement);graphView.resize();graphView.setData(state.graph);graphView.updateOptions(graphOptions());graphView.resume();app.dataset.graphPaused='false';return;}
 graphModulePromise=loadGraphModule();
 graphModulePromise.then(({MindGraph})=>{
  if(state.page!=='graph'||graphView)return;
  const host=document.getElementById('constellation-stage');if(!host)return;
  try{createGraphScene(host,MindGraph)}
  catch(e){graphElement=null;host.innerHTML='<div class="graph-render-error"><h3>三维场景暂时无法开启</h3><p>'+esc(e.message)+'</p><button class="secondary" data-action="graph-retry">重试三维渲染</button><button class="secondary" data-action="graph-list">浏览全部灵感</button></div>';}
 }).catch(e=>{const host=document.getElementById('constellation-stage');if(host)host.innerHTML='<div class="graph-render-error">三维模块加载失败。<button class="secondary" data-action="reload">重新加载</button></div>';});
}
function renderGraph(){
 const all=state.graph?.nodes||[],keywords=state.graph?.keywords||[],matches=all.filter(graphMatches),selected=note(state.selectedNode);
 const graphMoodLabels={all:'全部',peaceful:'宁静',melancholic:'靛蓝',bright:'琥珀',warm:'朱砂',reflective:'沉思'};
 const moodButton=(key,check=false)=>`<button class="${state.graphMood===key?'active':''}" data-action="graph-mood" data-mood="${key}" aria-pressed="${state.graphMood===key}"><i style="background:${key==='reflective'?'#9fe7ff':moodColors[key]||'#aaa7bc'}"></i><span>${graphMoodLabels[key]}</span>${check?`<b>${state.graphMood===key?'✓':''}</b>`:`<small>${key==='all'?all.length:all.filter(x=>x.mood===key).length}</small>`}</button>`;
 const hasFilter=state.graphMood!=='all'||state.graphKeyword||state.graphSearch;
 return `<main class="screen graph-screen constellation-screen ${selected?'has-selection':''}" id="screen">
  <header class="constellation-header">
   <div><h1 class="page-title">思维<br>星图</h1><p><button class="graph-library-link" data-action="graph-list" aria-label="浏览全部创作记忆">${all.length} 条创作记忆 <span aria-hidden="true">↗</span></button></p></div>
   <div class="constellation-actions">
    <label class="constellation-search">${icon('search',true)}<input id="graph-search" value="${esc(state.graphSearch)}" placeholder="搜索…" aria-label="搜索星图"></label>
    <button data-action="wander" class="constellation-wander" aria-label="漫游星图"><span class="wander-mark">≋</span><span>漫游</span><span class="wander-chevron">⌄</span></button>
    <button class="graph-filter ${state.filterOpen||hasFilter?'active':''}" data-action="filter" aria-label="筛选星图" aria-expanded="${state.filterOpen}" aria-controls="graph-control-panel">${icon('filter',true)}</button>
   </div>
  </header>
  <div id="constellation-stage" class="constellation-stage"><div class="constellation-loading">正在整理星图…</div></div>
  <div class="graph-gesture-hint">拖动旋转 · 双指缩放</div>
  ${hasFilter?`<div class="graph-focus-banner"><div><span>${state.graphKeyword?'# '+esc(tagLabel(state.graphKeyword)):state.graphSearch?'搜索结果':graphMoodLabels[state.graphMood]}</span><small>${matches.length} 条对应灵感 · 点击星点查看</small></div><button data-action="graph-clear" aria-label="清除星图筛选">×</button></div>`:''}
  ${all.length===0?`<div class="graph-empty"><h2>公开星图暂未加载</h2><p>${esc(state.graph?.error||'请刷新页面后再试。')}</p><button class="secondary" data-action="navigate" data-page="capture">记录灵感</button></div>`:hasFilter&&!matches.length?'<div class="graph-no-results">没有找到对应的灵感。<button data-action="graph-clear">清除筛选</button></div>':''}
  <div class="constellation-tools">
   <button data-action="graph-reset" aria-label="重置星图" title="回到全景">${icon('reload',true)}</button>
   <button data-action="graph-rotate" aria-label="${state.graphRotate?'暂停自动旋转':'开启自动旋转'}" class="${state.graphRotate?'enabled':''}">${state.graphRotate?'Ⅱ':'▷'}</button>
   <button data-action="graph-fullscreen" aria-label="${state.graphExpanded?'退出全屏星图':'全屏星图'}">⛶</button><button data-action="graph-info" aria-label="星图说明">?</button>
  </div>
  <div class="constellation-zoom"><button data-action="graph-in" aria-label="放大星图">+</button><button data-action="graph-out" aria-label="缩小星图">−</button></div>
  <div class="keyword-rail" aria-label="关键词星群"><span>关键词</span>${keywords.map(k=>`<button class="${state.graphKeyword===k.label?'active':''}" data-action="graph-keyword" data-keyword="${esc(k.label)}" aria-label="探索关键词 ${esc(tagLabel(k.label))}">${esc(tagLabel(k.label))}<small>${k.count}</small></button>`).join('')}</div>
  ${selected?graphSelectionSheet(selected):''}
  ${state.filterOpen?`<aside class="filter-panel constellation-filter" id="graph-control-panel" aria-label="星图控制">
   <div class="filter-title">节点控制</div><button class="connection-toggle" data-action="connections" role="switch" aria-checked="${state.connections}" aria-label="显示关联连线">${icon('external',true)} 关联连线<span class="mini-switch ${state.connections?'on':''}"></span></button>
   <div class="filter-title">情绪筛选</div><div class="filter-moods">${Object.keys(graphMoodLabels).map(key=>moodButton(key,true)).join('')}</div>
   <button class="keyword-lock ${state.graphKeyword?'locked':''}" data-action="${state.graphKeyword?'graph-unlock':'keyword'}">${icon('search',true)}<span>${state.graphKeyword?'已聚焦 · '+esc(tagLabel(state.graphKeyword)):'关键词聚焦'}</span>${state.graphKeyword?'<small>解除</small>':''}</button>
   <div class="filter-title">星场权重</div>${[['semantic','意象共鸣'],['structural','星群聚合'],['serendipity','自由散布']].map(([key,label])=>`<div class="weight ${key}"><div>${label}<span>${state.weights[key]}%</span></div><input type="range" min="0" max="100" data-graph="${key}" value="${state.weights[key]}" aria-label="${label}"></div>`).join('')}
  </aside>`:''}
  ${state.graphInfo?'<aside class="constellation-info"><button data-action="graph-info" aria-label="关闭说明">×</button><h3>在星图里，翻一翻旧随记</h3><p>每颗彩色星点对应一条内容，可能是个人随记、收藏灵感或公开参考；来源可在摘要中查看。</p><p>拖动旋转，双指缩放。点击情绪进行高亮，点击关键词飞向星群，点击星点阅读内容。</p><p>'+esc(graphEchoExplanation)+'</p><small>选中星点后，三条连线指向与这段内容最相近的历史内容。关键词与色彩仅供浏览筛选；背景星尘只是装饰。</small></aside>':''}
  ${state.graphList?`<aside class="constellation-list"><header><span>${matches.length} 条对应灵感</span><button data-action="graph-list" aria-label="关闭灵感列表">×</button></header>${matches.map(x=>`<button data-action="graph-locate" data-id="${esc(x.id)}"><i class="mood-dot mood-${x.mood}"></i><span>${esc(short(displayTextFor(x),95))}</span><small>${esc(sourceLabel(x))} ↗</small></button>`).join('')}</aside>`:''}
 </main>`;
}

function renderProfile(){
 const p=state.preferences,info=state.insights||{total:0,days:1},name=p.displayName==='WANDERING POET'?'漫游诗人':p.displayName;
 return `<main class="screen profile-screen" id="screen"><h1 class="page-title visually-hidden">我的</h1><div class="profile-header">${insightStardust('profile')}<div class="profile-avatar">${icon('user')}</div><div><button class="profile-name" data-action="rename">${esc(name)}</button><small><i></i> 在这里，慢慢写</small></div></div><div class="profile-stats"><div class="profile-stat stat-records">${insightStardust('profile-records')}<span class="stat-symbol" aria-hidden="true">${icon('archive',true)}</span><strong>${info.total}</strong><span>随记与收藏</span></div><div class="profile-stat stat-days">${insightStardust('profile-days')}<span class="stat-symbol" aria-hidden="true">${icon('sun',true)}</span><strong>${info.days}</strong><span>使用天数</span></div></div><div class="preferences-label">阅读偏好</div><section class="settings-card reading-settings">${insightStardust('preferences')}<div class="settings-title">${icon('spark',true)} 喜欢的样子</div><div class="choice-row"><button class="${p.style==='ink'?'active':''}" data-action="pref" data-key="style" data-value="ink">淡墨</button><button class="${p.style==='minimal'?'active':''}" data-action="pref" data-key="style" data-value="minimal">素简</button></div><div class="canvas-label"><span>一张底图</span><button data-action="draw">${icon('image',true)} 配图</button></div><div class="preset-row"><button class="preset none" data-action="no-canvas">留白</button>${['p1','p2','p3'].map((v,i)=>`<button class="preset ${v} ${p.preset===v?'active':''}" style="background-image:url(/demos/soul-script/assets/${['lake-hd.jpg','ocean-hd.jpg','cliff-hd.jpg'][i]})" data-action="pref" data-key="preset" data-value="${v}" aria-label="${['山间静湖','海上暮色','岸边落日'][i]}">${p.preset===v?'✓':''}</button>`).join('')}<button class="preset upload" data-action="preset-upload" aria-label="上传自己的底图">${icon('archive',true)}</button></div><div class="range-line"><div><label for="opacity">底图浓淡</label><span>${p.opacity}%</span></div><input type="range" min="0" max="100" id="opacity" data-key="opacity" style="--range-progress:${p.opacity}%" value="${p.opacity}"></div><div class="range-line"><div><label for="blur">柔和程度</label><span>${p.blur} 像素</span></div><input type="range" min="0" max="20" id="blur" data-key="blur" style="--range-progress:${p.blur*5}%" value="${p.blur}"></div></section><section class="settings-card dark-setting"><div class="toggle-line"><span>${icon(p.theme==='dark'?'moon':'sun')} 夜读</span><button class="switch ${p.theme==='dark'?'on':''}" data-action="theme" role="switch" aria-checked="${p.theme==='dark'}" aria-label="夜读模式"></button></div></section><p class="collection-note">随记和设置都保存在这台设备。</p><input type="file" id="canvas-input" accept="image/png,image/jpeg,image/webp" hidden></main>`;
}

function renderCapture(){
 return `<section class="full-screen capture capture-notebook" aria-label="记一笔">
  <header class="capture-top"><button class="icon-btn" data-action="close-capture" aria-label="关闭">${icon('close')}</button><span>记一笔</span><span class="header-spacer" aria-hidden="true"></span></header>
  <div class="capture-body"><div class="capture-writing">
   ${state.capturePrompt?`<aside class="capture-context" aria-label="记录线索"><p>${esc(state.capturePrompt)}</p><button data-action="clear-capture-context" aria-label="移除记录线索">×</button></aside>`:''}
   <textarea id="capture-text" class="capture-page-input" rows="1" placeholder="此刻，想记下什么？" aria-label="灵感内容" enterkeyhint="enter" spellcheck="false">${esc(state.captureText)}</textarea>
   ${state.captureImage?`<div class="attachment capture-attachment"><img src="${esc(state.captureImage)}" alt="待保存的图片"><span>图片已添加</span><button data-action="remove-image" aria-label="移除图片">移除</button></div>`:''}
   <details class="capture-question" ${state.captureQuestionOpen?'open':''}><summary>没有想法？看看今日一问 <span aria-hidden="true">↗</span></summary><div class="capture-question-content"><p>${esc(currentPrompt())}</p><button data-action="use-capture-question">用这个问题开始记录 <span aria-hidden="true">↗</span></button></div></details>
  </div></div>
  <footer class="capture-toolbar"><div class="capture-tools"><button data-action="image" aria-label="添加图片">${icon('image',true)}<span>图片</span></button><button data-action="voice" aria-label="语音输入">${icon('mic',true)}<span>语音</span></button></div><button class="send-btn capture-save" data-action="save" ${state.busy||(!state.captureText.trim()&&!state.captureImage)?'disabled':''} aria-label="保存灵感">${state.busy?'保存中…':'保存'}</button></footer>
  <input type="file" id="image-input" accept="image/png,image/jpeg,image/webp" hidden>
 </section>`;
}

function rememberCaptureOrigin(){
 state.captureReturn={page:state.page,previous:state.previous,detailId:state.detailId,tab:state.tab,selectedNode:state.selectedNode};
 state.captureSession++;state.captureQuestionOpen=false;state.captureFocusRequested=true;
}
function leaveCapture(){
 const from=state.captureReturn||state.graphWriteReturn||{page:state.previous};
 state.captureReturn=null;state.graphWriteReturn=null;state.captureSent=null;state.capturePrompt='';state.captureSource=null;state.captureQuestionOpen=false;
 state.page=from.page&&from.page!=='capture'?from.page:'home';state.previous=from.previous||'home';
 if(from.tab)state.tab=from.tab;if('detailId' in from)state.detailId=from.detailId;
 if('selectedNode' in from)state.selectedNode=from.selectedNode;
 history.replaceState(null,'',location.pathname+location.search+(state.page==='graph'?'#graph':state.page==='insights'?'#echo':''));
 render();
}
function updateCaptureSaveButton(){
 const button=document.querySelector('.capture-notebook .capture-save');if(!button)return;
 button.disabled=state.busy||(!state.captureText.trim()&&!state.captureImage);button.textContent=state.busy?'保存中…':'保存';
}
function sizeCaptureInput(reveal=false){
 const input=document.getElementById('capture-text'),body=document.querySelector('.capture-notebook .capture-body');if(!input||!body)return;
 const previousTop=body.scrollTop;
 input.style.flex='none';input.style.height='0px';input.style.height=Math.max(144,input.scrollHeight)+'px';input.style.flex='';
 body.scrollTop=previousTop;
 if(reveal&&input===document.activeElement&&input.selectionEnd===input.value.length){
  const end=input.offsetTop+input.offsetHeight-body.offsetTop;
  if(end>body.scrollTop+body.clientHeight-24)body.scrollTop=Math.max(0,end-body.clientHeight+24);
 }
 updateCaptureSaveButton();
}
function mountCaptureEditor(focus){
 const page=document.querySelector('.capture-notebook'),input=document.getElementById('capture-text');if(!page||!input)return ()=>{};
 let frame=0;const viewport=window.visualViewport;
 const fit=()=>{
  frame=0;const rect=app.getBoundingClientRect(),top=viewport?.offsetTop||0,height=viewport?.height||window.innerHeight;
  const offset=0,bottom=app.clientHeight;
  page.style.top=offset+'px';page.style.height=Math.max(0,bottom-offset)+'px';
  page.dataset.keyboard=String(height<window.innerHeight-100);sizeCaptureInput(true);
 };
 const onViewport=()=>{if(!frame)frame=requestAnimationFrame(fit);};
 fit();
 viewport?.addEventListener('resize',onViewport);viewport?.addEventListener('scroll',onViewport);window.addEventListener('resize',onViewport);
 if(focus){input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);state.captureFocusRequested=false;sizeCaptureInput(true);}
 return ()=>{if(frame)cancelAnimationFrame(frame);viewport?.removeEventListener('resize',onViewport);viewport?.removeEventListener('scroll',onViewport);window.removeEventListener('resize',onViewport);};
}

function renderDetail(){
 const x=note(state.detailId);if(!x){state.page='home';return renderHome();}
 if(x.readOnly)return renderPublicDetail(x);
 const restoredPhoto=x.collectionOrder===2&&x.image==='/demos/soul-script/assets/cliff.jpg',translated=hasTranslation(x);
 const bg=x.mood==='peaceful'?'#22372f':x.mood==='bright'?'#3a3228':x.mood==='warm'?'#3b2c30':'#302e3e';
 const back=state.previous==='insights'?'返回回响':state.previous==='traces'?'返回收藏足迹':state.previous==='search'?'返回搜索':state.previous==='graph'?'返回星图':'返回灵感墙';
 return `<div class="detail-backdrop" inert>${renderHome()}</div><section class="full-screen detail" style="background:${bg};--canvas-opacity:${state.preferences.opacity/100};--canvas-blur:${state.preferences.blur}px" aria-label="灵感详情"><button class="sheet-handle" data-action="close-detail" aria-label="${back}"></button><div class="detail-main">${x.image?`<div class="detail-art"><img src="${esc(imageSrc(restoredPhoto?'/demos/soul-script/assets/lake.jpg':x.image))}" alt="灵感配图"><button data-action="edit-note">${icon('pen',true)} 编辑</button></div>`:''}<div class="detail-meta"><span><i class="mood-dot mood-${esc(x.mood)}"></i> ${esc(moodNames[x.mood]||'沉思')}</span><time>${fmtFull(state.previous==='traces'?traceDate(collectionTraceItems(state.inspirations).find(item=>item.id===x.id)||x,state.traceMode):(x.displayDate||x.createdAt))}</time></div>${state.editing?`<textarea id="edit-text" class="edit-area" aria-label="编辑灵感">${esc(x.text)}</textarea><button class="primary" data-action="save-edit">保存修改</button>`:`<p class="detail-text" lang="${state.showOriginal?'en':'zh-CN'}">${esc(displayTextFor(x,{original:state.showOriginal}))}</p>`}${translated&&!state.editing?`<div class="translation-tools"><span>${state.showOriginal?(x.sourceType==='restored'?'复原底稿':'原文'):(x.sourceType==='restored'?'中文复原':'中文试译')}</span><button data-action="toggle-original">${state.showOriginal?'读中文':'读原文'}</button></div>`:''}${!x.image?`<button class="sketch-dream" data-action="image">${icon('image',true)} 为这段话添张图</button>`:''}<div class="detail-source">${x.author?esc(authorLabel(x.author))+' · ':''}${esc(sourceLabel(x))}${(x.displayDateKind==='collection-layout'||state.previous==='traces'&&state.traceMode==='display'&&x.sourceType==='restored')?'<small>展示日期与保存日期不同，可在收藏足迹中切换查看。</small>':''}${x.sourceUrl?`<a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原作出处 ↗</a>`:''}</div>${related(x.id).length?connectionCards(x.id):''}<input type="file" id="image-input" accept="image/png,image/jpeg,image/webp" hidden></div><div class="detail-foot"><button class="icon-btn" data-action="confirm-delete" aria-label="删除">${icon('trash')}</button><button class="icon-btn" data-action="share" aria-label="分享">${icon('share')}</button><button class="primary" data-action="expand">${icon('pen')} 接着写</button></div></section>`;
}

function renderPublicDetail(x){
 return `<div class="detail-backdrop" inert>${renderHome()}</div><section class="full-screen detail public-detail" aria-label="灵感详情"><button class="sheet-handle" data-action="close-detail" aria-label="返回星图"></button><div class="detail-main"><div class="detail-meta"><span>${esc(sourceLabel(x))}</span><time>${fmtFull(x.createdAt)}</time></div><p class="detail-text" lang="${esc(x.language?.[0]||'en')}">${esc(displayTextFor(x))}</p>${x.has_image?`<div class="public-detail-images">${publicImages(x)}</div>`:''}<div class="detail-source">Bluesky · ${esc(sourceLabel(x))} <a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原帖 ↗</a></div>${connectionCards(x.id)}</div><div class="detail-foot"><button class="secondary" data-action="close-detail">返回星图</button><button class="icon-btn" data-action="share" aria-label="分享">${icon('share')}</button><button class="primary" data-action="graph-continue" data-id="${esc(x.id)}">从这里继续写</button></div></section>`;
}

function renderModal(){
  if(!state.modal)return '';
  if(state.modal==='delete')return '<div class="modal-cover"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">删除这条随记？</h3><p>删除后，这条随记会从灵感墙和星图移除，且无法恢复。</p><div class="modal-actions"><button class="secondary" data-action="cancel-modal">再想想</button><button class="primary" data-action="delete-note">确定删除</button></div></div></div>';
  if(state.modal==='rename')return '<div class="modal-cover"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">怎么称呼你？</h3><p>这个名称只用于本机的个人页面。</p><input id="rename-input" aria-label="个人名称" class="searchbox" style="width:100%" maxlength="30" value="'+esc(state.preferences.displayName)+'"><div class="modal-actions"><button class="secondary" data-action="cancel-modal">取消</button><button class="primary" data-action="save-name">保存</button></div></div></div>';
  return '';
}
function render(){
 disposeEchoExposure?.();disposeEchoExposure=null;
 if(state.page!=='insights'&&echoTimer){clearTimeout(echoTimer);echoTimer=null;}
  const wasCapture=!!disposeCapture;disposeCapture?.();disposeCapture=null;
  const motionTicket=uiMotion.before(state);
  if(graphView){graphPose=graphView.captureCamera();graphView.suspend();graphElement.remove();app.dataset.graphPaused=String(state.page!=='graph');}
  app.className='app-shell '+(state.graphExpanded&&state.page==='graph'?'expanded-graph ':'')+(state.preferences.theme==='dark'?'dark':'')+' style-'+state.preferences.style;
  applyTheme();
  app.dataset.expanded=String(state.graphExpanded&&state.page==='graph');
  let html='';
  if(state.page==='home')html=renderHome()+nav();
  if(state.page==='insights')html=renderEchoPage(state,{esc,icon})+nav();
  if(state.page==='graph')html=renderGraph()+nav();
  if(state.page==='profile')html=renderProfile()+nav();
  if(state.page==='search')html=renderSearch(state,{esc,icon,noteCard,postCard});
  if(state.page==='traces')html=renderTraces(state,{esc,icon,noteCard});
  if(state.page==='capture')html=renderCapture();
  if(state.page==='detail')html=renderDetail();
  app.style.setProperty('--custom-canvas',state.preferences.canvasImage?'url('+state.preferences.canvasImage+')':'url(/demos/soul-script/assets/'+({p1:'lake-hd.jpg',p2:'ocean-hd.jpg',p3:'cliff-hd.jpg'}[state.preferences.preset]||'lake-hd.jpg')+')');
  app.style.setProperty('--custom-opacity',(state.preferences.opacity||0)/100);
  app.style.setProperty('--custom-blur',(state.preferences.blur||0)+'px');
  disposeWall?.();disposeWall=null;
  app.innerHTML=html+renderModal();
  disposeWall=mountMasonry(app.querySelector('.masonry'));
  if(state.page==='graph')mountGraph();
  if(state.page==='home'&&state.tab==='mine')document.getElementById('screen').scrollTop=state.homeScroll;
  uiMotion.after(motionTicket);
  if(state.page==='insights'){disposeEchoExposure=watchEchoExposure(app.querySelector('.echo-screen'),state.echoPage,{mark:(id,ids)=>api.echoSurfaced(id,ids)});scheduleEchoRefresh();}
  if(state.page==='capture')disposeCapture=mountCaptureEditor(!wasCapture||state.captureFocusRequested);
}
function toast(message){uiMotion.toast(message);}

function navigate(page){
  if(state.page==='home'&&state.tab==='mine')state.homeScroll=document.getElementById('screen')?.scrollTop||0;
  if(page==='capture'){rememberCaptureOrigin();state.previous=state.page;state.captureSent=null;state.capturePrompt='';}
  state.page=page;if(page!=='graph'){state.graphExpanded=false;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}history.replaceState(null,'',location.pathname+location.search+(page==='graph'?'#graph':page==='insights'?'#echo':''));state.selectedNode=null;state.filterOpen=false;state.modal=null;render();if(page==='graph'){void syncMemory();}if(page==='insights')void refreshEchoPage();
}
async function fetchCircle(){
  state.circleStatus='loading';state.circleError='';render();
  try{const data=await api.circle();state.circle=curateCircle(data.items||[]);state.circleNotice=data.notice||'';state.circleStatus='ready';}
  catch(e){state.circleStatus='error';state.circleError=e.message;}
  if((state.page==='home'&&state.tab==='circle')||state.page==='search')render();
}
async function save(){
  const text=document.getElementById('capture-text')?.value.trim()||'';
  if(!text&&!state.captureImage)return toast('先写下一点什么吧');
  if(state.busy)return;
  const session=state.captureSession,image=state.captureImage,sourceId=state.captureSource;
  state.busy=true;updateCaptureSaveButton();
  try{
    const created=await api.create({text,image,sourceId});
    dataReadVersion++;state.inspirations=[created,...state.inspirations.filter(n=>n.id!==created.id)];
    if(created.embedding_status==='pending')state.memoryPending++;
    const sameDraft=session===state.captureSession&&state.captureText.trim()===text&&state.captureImage===image;
    if(sameDraft){
     state.captureSent=created;state.captureSource=null;state.captureText='';state.captureImage=null;localStorage.removeItem(draftKey);
     if(state.page==='capture')leaveCapture();else if(!state.editing)render();
    }else if(state.page!=='capture'&&!state.editing)render();
    toast('✓ 已保存');scheduleMemorySync();
    void refreshData().then(changed=>{if(changed&&state.page!=='capture'&&state.page!=='search'&&!state.editing)render();if(changed&&state.page==='insights')void refreshEchoPage({quiet:true});}).catch(()=>{});
  }catch(e){toast(e.message);}
  finally{state.busy=false;updateCaptureSaveButton();}
}

function applyTheme(){
 const dark=state.preferences.theme==='dark';app.classList.toggle('dark',dark);
 document.documentElement.style.colorScheme=dark?'dark':'light';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#090908':'#f2efe7');
 if(graphView)graphView.updateOptions(graphOptions());
}
let themeSaveQueue=Promise.resolve(),themeSaveVersion=0,confirmedTheme=null;
async function updateThemePreference(theme){
 const version=++themeSaveVersion;confirmedTheme??=state.preferences.theme;
 state.preferences={...state.preferences,theme};applyTheme();
 if(state.page==='profile'){const scroll=document.getElementById('screen')?.scrollTop||0;render();document.getElementById('screen').scrollTop=scroll;}
 // Queue preference writes so rapid toggles cannot persist in the wrong order.
 const request=themeSaveQueue.then(()=>api.savePreferences({theme}));themeSaveQueue=request.catch(()=>{});
 try{const preferences=await request;confirmedTheme=preferences.theme;if(version!==themeSaveVersion)return;state.preferences=preferences;applyTheme();}
 catch(error){if(version!==themeSaveVersion)return;state.preferences={...state.preferences,theme:confirmedTheme};applyTheme();if(state.page==='profile')render();toast(error.message);}
}
async function updatePref(payload){
  const scroll=document.getElementById('screen')?.scrollTop||0;
  try{state.preferences=await api.savePreferences(payload);render();if(state.page==='profile')document.getElementById('screen').scrollTop=scroll;}
  catch(e){toast(e.message);}
}
async function onAction(button){
  const action=button.dataset.action;
  if(action==='wall-view'){state.wallView=state.wallView==='grid'?'timeline':state.wallView==='timeline'?'folder':'grid';state.homeScroll=0;render();return;}
  if(action==='no-canvas')return updatePref({opacity:0,canvasImage:null});
  if(action==='graph-keyword'){state.graphKeyword=state.graphKeyword===button.dataset.keyword?null:button.dataset.keyword;state.selectedNode=null;state.graphList=false;render();if(state.graphKeyword)graphView?.focusKeyword(state.graphKeyword);else graphView?.reset();return;}
  if(action==='graph-mood'){state.graphMood=button.dataset.mood;state.selectedNode=null;state.filterOpen=false;render();graphView?.reset();return;}
  if(action==='graph-clear'){state.graphKeyword=null;state.graphSearch='';state.graphMood='all';state.selectedNode=null;render();graphView?.reset();return;}
  if(action==='graph-rotate'){state.graphRotate=!state.graphRotate;saveGraphPrefs();render();return;}
  if(action==='graph-info'){state.graphInfo=!state.graphInfo;state.selectedNode=null;state.graphList=false;render();return;}
  if(action==='graph-list'){state.graphList=!state.graphList;state.selectedNode=null;render();return;}
  if(action==='graph-locate'){state.selectedNode=button.dataset.id;state.page='graph';state.graphList=false;render();graphView?.focusRecord(state.selectedNode);return;}
  if(action==='graph-retry'){graphModulePromise=null;graphElement=null;mountGraph();return;}
  if(action==='graph-fullscreen'){state.graphExpanded=!state.graphExpanded;render();try{if(!state.graphExpanded&&document.fullscreenElement)await document.exitFullscreen();else if(state.graphExpanded&&app.requestFullscreen)await app.requestFullscreen();}catch{}graphView?.resize();return;}
  if(action==='connections'){state.connections=!state.connections;saveGraphPrefs();render();return;}
  if(action==='dismiss-node'){state.selectedNode=null;render();return;}
  if(action==='graph-reset'){state.graphViewSeed=0;state.graphKeyword=null;state.graphSearch='';state.graphMood='all';state.selectedNode=null;render();graphView?.reset();return;}
  if(action==='graph-in'||action==='graph-out'){graphView?.zoom(action==='graph-in'?1:-1);return;}
  if(action==='keyword'){state.filterOpen=false;render();document.getElementById('graph-search')?.focus();return;}
  if(action==='graph-unlock'){state.graphKeyword=null;state.selectedNode=null;render();graphView?.reset();return;}
  if(action==='draw'){toast('先挑一张喜欢的照片吧。生成配图稍后开放。');return;}
  if(action==='preset-upload'){document.getElementById('canvas-input')?.click();return;}
  if(action==='like-post'){const key='liked:'+button.dataset.id;localStorage.getItem(key)?localStorage.removeItem(key):localStorage.setItem(key,'1');render();return;}
  if(action==='collect-post'){const post=state.circle.find(x=>x.id===button.dataset.id);if(post){state.captureSource=post.id;state.captureText=textFor(post);localStorage.setItem(draftKey,state.captureText);navigate('capture');}return;}
  if(action==='reload')return location.reload();
  if(action==='navigate')return navigate(button.dataset.page);
  if(action==='echo-refresh')return refreshEchoPage();
  if(action==='echo-graph'){
   const page=state.echoPage,target=page?.selected?.find(record=>record.id===button.dataset.id);
   if(!page?.trigger||!target||!page.should_surface)return;
   if(!getGraphIndex(state.graph).selectionFor(page.trigger.id))await refreshData();
   state.graphMood='all';state.graphSearch='';state.graphKeyword=null;state.graphList=false;state.graphInfo=false;state.filterOpen=false;
   state.connections=true;state.echoGraphTarget=target.id;state.selectedNode=page.trigger.id;state.page='graph';
   history.replaceState(null,'',location.pathname+location.search+echoGraphHref(page.trigger.id,target.id));
   render();graphView?.focusRecord(state.selectedNode);return;
  }
  if(action==='echo-write'){
   const target=state.echoPage?.selected?.find(record=>record.id===button.dataset.id);if(!target||!state.echoPage.should_surface)return;
   rememberCaptureOrigin();state.previous=state.page;state.capturePrompt='从这段旧灵感继续……\n'+short(displayTextFor(target),140);
   state.captureSource=null;state.captureSent=null;state.page='capture';render();return;
  }
  if(action==='tab'){state.tab=button.dataset.tab;state.homeScroll=0;render();if(state.tab==='circle'&&state.circleStatus==='idle')fetchCircle();return;}
  if(action==='toggle-search'||action==='open-search'){state.searchFrom={page:state.page,tab:state.tab};state.searchQuery='';state.searchScope=state.tab==='circle'?'circle':'mine';state.page='search';render();document.getElementById('discovery-query')?.focus();if(state.circleStatus==='idle')fetchCircle();return;}
  if(action==='close-search'){const from=state.searchFrom||{page:'home',tab:'mine'};state.page=from.page;state.tab=from.tab;render();return;}
  if(action==='search-scope'){state.searchScope=button.dataset.scope;render();if(state.circleStatus==='idle'&&state.searchScope!=='mine')fetchCircle();return;}
  if(action==='search-clear'){state.searchQuery='';render();document.getElementById('discovery-query')?.focus();return;}
  if(action==='persona-write'){state.previous='insights';state.capturePrompt='今天有什么微小的画面，让你停下了脚步？';state.captureSent=null;state.page='capture';render();return;}
  if(action==='persona-evidence'){state.personaExpanded=!state.personaExpanded;render();if(state.personaExpanded)uiMotion.refresh(document.querySelector('.persona-evidence-content'));return;}
  
  if(action==='open-traces'){state.traceMode='display';state.traceDate=button.dataset.date||'';state.traceMonth=state.traceDate?state.traceDate.slice(0,7):TRACE_DEFAULT_MONTH;state.page='traces';history.replaceState(null,'',location.pathname+location.search+'#traces');render();return;}
  if(action==='close-traces'){state.page='insights';history.replaceState(null,'',location.pathname+location.search+'#echo');render();void refreshEchoPage();return;}
  if(action==='trace-mode'){state.traceMode=button.dataset.mode==='created'?'created':'display';state.traceMonth=traceMonthForMode(state.inspirations,state.traceMode,state.traceMode==='display'?TRACE_DEFAULT_MONTH:state.traceMonth);state.traceDate='';render();return;}
  if(action==='trace-month'){const months=traceAvailableMonths(state.inspirations,state.traceMode),current=traceMonthForMode(state.inspirations,state.traceMode,state.traceMonth),index=months.indexOf(current),next=Math.max(0,Math.min(months.length-1,index+Number(button.dataset.step)));state.traceMonth=months[next]||current;state.traceDate='';render();return;}
  if(action==='trace-jump'){if(!['2025-11','2025-12','2026-01'].includes(button.dataset.month))return;state.traceMode='display';state.traceMonth=button.dataset.month;state.traceDate='';render();return;}
  if(action==='trace-day'){state.traceDate=state.traceDate===button.dataset.date?'':button.dataset.date;render();return;}
  if(action==='trace-clear'){state.traceDate='';render();return;}
  if(action==='clear-search'){state.search='';state.searchVisible=false;render();return;}
  if(action==='retry-circle')return fetchCircle();
  if(action==='open-note'){if(state.page==='home')state.homeScroll=document.getElementById('screen')?.scrollTop||0;state.previous=state.page;state.detailId=button.dataset.id;state.page='detail';state.editing=false;state.showOriginal=false;render();return;}
  if(action==='close-detail'){state.page=['graph','search','traces','insights'].includes(state.previous)?state.previous:'home';state.detailId=null;state.editing=false;render();return;}
  if(action==='graph-continue'){const x=note(button.dataset.id);if(!x)return;rememberCaptureOrigin();state.graphWriteReturn={page:state.page,previous:state.previous,detailId:state.detailId};state.previous=state.page;state.capturePrompt='从这条灵感继续：'+short(displayTextFor(x),100);state.captureSource=null;state.captureSent=null;state.page='capture';render();return;}
  if(action==='close-capture')return leaveCapture();
  if(action==='use-capture-question'){state.capturePrompt=currentPrompt();state.captureQuestionOpen=false;state.captureFocusRequested=true;render();return;}
  if(action==='clear-capture-context'){state.capturePrompt='';state.captureFocusRequested=true;render();return;}
  if(action==='save')return save();
  if(action==='view-sent'){state.detailId=state.captureSent?.id;state.previous='home';state.page='detail';render();return;}
  if(action==='clear-draft'){state.captureText='';localStorage.removeItem(draftKey);render();return;}
  if(action==='image')return document.getElementById('image-input')?.click();
  if(action==='remove-image'){state.captureImage=null;render();return;}
  if(action==='voice')return voiceInput();
  if(action==='prompt-write'){rememberCaptureOrigin();state.previous='insights';state.capturePrompt=currentPrompt();state.captureSent=null;state.page='capture';render();return;}
  if(action==='wander'){state.graphViewSeed++;state.graphKeyword=null;state.graphSearch='';state.graphMood='all';state.selectedNode=null;state.filterOpen=false;state.graphList=false;state.graphInfo=false;render();graphView?.reset();return;}
  if(action==='filter'){state.filterOpen=!state.filterOpen;render();return;}
  if(action==='select-node'){state.selectedNode=button.dataset.id;state.filterOpen=false;render();return;}
  if(action==='toggle-original'){state.showOriginal=!state.showOriginal;render();return;}
  if(action==='edit-note'){state.editing=!state.editing;render();return;}
  if(action==='save-edit'){const text=document.getElementById('edit-text')?.value.trim()||'';if(!text)return toast('内容不能为空');try{await api.update(state.detailId,{text});await refreshData();state.editing=false;render();toast('已保存修改');}catch(e){toast(e.message);}return;}
  if(action==='confirm-delete'){state.modal='delete';render();return;}
  if(action==='cancel-modal'){state.modal=null;render();return;}
  if(action==='delete-note'){try{await api.remove(state.detailId);await refreshData();state.modal=null;state.detailId=null;state.page='home';state.tab='mine';render();toast('灵感已删除');}catch(e){toast(e.message);}return;}
  if(action==='share')return shareNote();
  if(action==='expand'){const x=note(state.detailId);rememberCaptureOrigin();state.previous='detail';state.capturePrompt='从这条灵感继续：'+short(x?displayTextFor(x):'',70);state.captureSent=null;state.page='capture';render();return;}
  if(action==='pref'){return updatePref({[button.dataset.key]:button.dataset.value});}
  if(action==='theme')return updateThemePreference(state.preferences.theme==='dark'?'light':'dark');
  if(action==='rename'){state.modal='rename';render();document.getElementById('rename-input')?.focus();return;}
  if(action==='save-name'){const displayName=document.getElementById('rename-input')?.value.trim();state.modal=null;return updatePref({displayName});}
}
async function shareNote(){
  const x=note(state.detailId);if(!x)return;
  try{
    if(navigator.share)await navigator.share({title:'心笺 · Soul Script',text:x.text});
    else {await navigator.clipboard.writeText(x.text);toast('内容已复制');}
  }catch(e){if(e.name!=='AbortError')toast('分享暂时不可用');}
}
function voiceInput(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition)return toast('当前浏览器暂不支持语音输入');
  const recognition=new Recognition();recognition.lang='zh-CN';recognition.interimResults=false;
  recognition.onresult=e=>{state.captureText=(state.captureText?state.captureText+' ':'')+e.results[0][0].transcript;localStorage.setItem(draftKey,state.captureText);render();toast('语音已转成文字');};
  recognition.onerror=()=>toast('语音输入未完成，请改用文字');
  recognition.start();toast('正在聆听…');
}
const pendingActions=new Set();
async function dispatchAction(target){
 const action=target.dataset.action,key=action+':'+(target.dataset.key||target.dataset.id||'');
 const saving=['save','save-edit','save-name','delete-note','pref','theme','no-canvas'].includes(action);
 if(saving&&pendingActions.has(key))return;
 if(saving){pendingActions.add(key);target.disabled=true;target.setAttribute('aria-busy','true');}
 try{await onAction(target);}catch(error){toast(error.message||'暂时没有完成，请再试一次');}
 finally{if(saving){pendingActions.delete(key);if(target.isConnected){target.disabled=false;target.removeAttribute('aria-busy');}if(action==='save')updateCaptureSaveButton();}}
}
app.addEventListener('click',e=>{
 if(e.target.classList.contains('modal-cover')){onAction({dataset:{action:'cancel-modal'}});return;}
 const target=e.target.closest('[data-action]');
 const closeFilter=state.filterOpen&&!e.target.closest('.constellation-filter')&&target?.dataset.action!=='filter';
 if(closeFilter)state.filterOpen=false;
 if(target)dispatchAction(target);else if(closeFilter)render();
});
app.addEventListener('input',e=>{
  if(e.target.id==='capture-text'){state.captureText=e.target.value;localStorage.setItem(draftKey,state.captureText);sizeCaptureInput(true);const chip=document.querySelector('.draft-chip');if(chip)chip.style.display=state.captureText?'flex':'none';}
  if(e.target.id==='discovery-query'){state.searchQuery=e.target.value;const template=document.createElement('template');template.innerHTML=renderSearch(state,{esc,icon,noteCard,postCard});document.getElementById('discovery-results').innerHTML=template.content.querySelector('#discovery-results').innerHTML;document.querySelector('[data-action="search-clear"]').hidden=!state.searchQuery;uiMotion.refresh(document.getElementById('discovery-results'));}
  if(e.target.id==='search-input'){state.search=e.target.value;disposeWall?.();document.getElementById('home-results').innerHTML=homeResults();disposeWall=mountMasonry(document.querySelector('#home-results .masonry'));uiMotion.refresh(document.getElementById('home-results'));document.getElementById('result-count').textContent=state.inspirations.filter(x=>matchesText(x,state.search)).length+' 枚碎片';}
  if(e.target.type==='range'&&e.target.dataset.key){e.target.style.setProperty('--range-progress',((Number(e.target.value)-Number(e.target.min))/(Number(e.target.max)-Number(e.target.min))*100)+'%');e.target.previousElementSibling.querySelector('span').textContent=e.target.value+(e.target.dataset.key==='opacity'?'%':' 像素');}
  if(e.target.dataset.graph){state.weights[e.target.dataset.graph]=Number(e.target.value);e.target.previousElementSibling.querySelector('span').textContent=e.target.value+'%';}
  if(e.target.id==='graph-search'){state.graphSearch=e.target.value;state.selectedNode=null;const v=e.target.value,found=(state.graph?.nodes||[]).filter(graphMatches);if(v.trim()&&found.length===1)state.selectedNode=found[0].id;render();const input=document.getElementById('graph-search');input.focus();input.setSelectionRange(v.length,v.length);if(state.selectedNode)graphView?.focusRecord(state.selectedNode);}
});
app.addEventListener('toggle',e=>{if(e.target.matches?.('.capture-question'))state.captureQuestionOpen=e.target.open;},true);
app.addEventListener('change',async e=>{
  if(e.target.name==='graphMood'){state.graphMood=e.target.value;state.selectedNode=null;render();}
  if(e.target.dataset.graph){saveGraphPrefs();render();return;}
  if(e.target.type==='range'&&e.target.dataset.key)updatePref({[e.target.dataset.key]:Number(e.target.value)});
  if(e.target.id==='canvas-input'){const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024)return toast('图片稍大，请选一张 2MB 以内的照片');const r=new FileReader();r.onload=()=>updatePref({canvasImage:r.result,opacity:25});r.readAsDataURL(file);return;}
  if(e.target.id==='image-input'){
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024)return toast('图片请控制在 2MB 以内');
    const reader=new FileReader();reader.onload=async()=>{if(state.page==='detail'){try{await api.update(state.detailId,{text:note(state.detailId).text,image:reader.result});await refreshData();render();}catch(e){toast(e.message);}}else{state.captureImage=reader.result;render();}};reader.readAsDataURL(file);
  }
});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&state.graphExpanded){state.graphExpanded=false;render();}});
app.addEventListener('keydown',e=>{
 uiMotion.trapFocus(e);
 if(e.key==='Enter'&&e.target.id==='graph-search'&&state.graphSearch.trim()){const found=(state.graph?.nodes||[]).filter(graphMatches);if(found.length){e.preventDefault();state.selectedNode=found[0].id;state.graphList=false;render();graphView?.focusRecord(state.selectedNode);}return;}
 if(e.key==='Escape'){
  const graphAction=state.page==='graph'?(state.filterOpen?'filter':state.graphInfo?'graph-info':state.graphList?'graph-list':state.selectedNode?'dismiss-node':state.graphExpanded?'graph-fullscreen':null):null;
  const action=state.modal?'cancel-modal':state.page==='capture'?'close-capture':state.page==='detail'?'close-detail':state.page==='search'?'close-search':state.page==='traces'?'close-traces':graphAction||(state.page==='home'&&state.searchVisible?'toggle-search':null);
  if(action){e.preventDefault();onAction({dataset:{action}});return;}
 }
 if(e.key==='Enter'&&!e.isComposing&&e.target.id==='capture-text'&&(e.ctrlKey||e.metaKey)){e.preventDefault();save();}
 if(e.key==='Enter'&&e.target.classList.contains('graph-node'))onAction(e.target);
});

document.addEventListener('visibilitychange',()=>{if(state.page==='insights'){if(document.hidden){if(echoTimer)clearTimeout(echoTimer);echoTimer=null;disposeEchoExposure?.();disposeEchoExposure=null;}else{render();void refreshEchoPage({quiet:true});}}});
app.addEventListener('error',event=>{
 const image=event.target;if(image.tagName==='IMG'&&image.closest('.echo-photo')){const fallback=document.createElement('span');fallback.className='echo-image-unavailable';fallback.textContent='图片暂未加载';image.replaceWith(fallback);return;}if(image.tagName!=='IMG'||!image.closest('.public-record,.public-detail'))return;
 const fallback=document.createElement('span');fallback.className='public-image-unavailable';fallback.textContent=image.alt&&image.alt!=='公开帖子配图'?'图片暂不可用 · '+image.alt:'原帖图片暂不可用';image.replaceWith(fallback);
},true);
boot();



function createGraphScene(host,MindGraph){graphElement=host;graphView=new MindGraph(host,{data:state.graph,pose:graphPose,options:graphOptions(),onSelect:id=>{state.selectedNode=id;state.graphInfo=false;state.graphList=false;render();},onKeyword:label=>{state.graphKeyword=label;state.selectedNode=null;state.graphList=false;render();graphView?.focusKeyword(label);},onReady:()=>host.querySelector('.constellation-loading')?.remove(),onInteraction:()=>document.querySelector('.graph-gesture-hint')?.classList.add('used')});graphView.updateOptions(graphOptions());if(state.selectedNode)graphView.focusRecord(state.selectedNode);app.dataset.graphWarmup='ready';}
// Appended to the original front end by prepare_soul_demo.mjs.
// Prepare one real scene in idle time, then retain it without running hidden frames.
let graphWarmRequested=false;
function loadGraphModule(){
 if(!graphModulePromise){
  graphModulePromise=import('./mind-graph.js?v=graph-warm-1').catch(error=>{graphModulePromise=null;throw error;});
 }
 return graphModulePromise;
}
function scheduleGraphWarmup(){
 if(graphWarmRequested||graphView||!state.graph?.nodes?.length)return;
 graphWarmRequested=true;app.dataset.graphWarmup='loading';
 loadGraphModule().then(({MindGraph})=>{
  const prepare=()=>{
   if(graphView||state.page==='graph'||document.hidden||!app.isConnected){graphWarmRequested=false;return;}
   const host=document.createElement('div');host.className='constellation-stage';
   host.style.cssText='position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none;width:'+app.clientWidth+'px;height:'+Math.max(240,app.clientHeight-230)+'px';
   app.appendChild(host);
   try{
    createGraphScene(host,MindGraph);
    graphView.suspend();host.remove();
    app.dataset.graphWarmup='ready';app.dataset.graphPaused='true';
   }catch{
    graphView?.dispose();graphView=null;graphElement=null;host.remove();
    graphWarmRequested=false;app.dataset.graphWarmup='deferred';
   }
  };
  if(window.requestIdleCallback)window.requestIdleCallback(prepare,{timeout:1800});
  else setTimeout(prepare,250);
 }).catch(()=>{graphWarmRequested=false;app.dataset.graphWarmup='deferred';});
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)graphView?.suspend();
 else if(state.page==='graph')graphView?.resume();
 else scheduleGraphWarmup();
});

registerNavigation(async page=>{if(!['home','capture','graph','insights'].includes(page))return;if(!state.insights)await boot();if(state.insights)await onAction({dataset:{action:'navigate',page}});});
new MutationObserver(()=>shareState(state.page)).observe(app,{childList:true});
