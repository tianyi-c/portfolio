// Browser-only portfolio adapter. The original Node/model backend is not deployed.
import {analyze,graphData} from './demo-rules.js';
import {writingPersona} from './persona-service.mjs';
import {recordCounts} from './record-origin.js';
const KEY='portfolio:soul-script:demo:v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const now=()=>new Date().toISOString();
function initial(){
 const old=new Date(Date.now()-35*86400000).toISOString();
 const samples=[
  {id:'demo-rain-memory',text:'今天傍晚回家的时候下雨了，路灯在湿漉漉的地面上留下了很长的倒影。',createdAt:old},
  {id:'demo-window',text:'窗边的雨声，让我想起一段还没写完的故事。',createdAt:new Date(Date.now()-20*86400000).toISOString()},
  {id:'demo-light',text:'阳光穿过树叶，在纸上落下细小的光。想把这幅画面放进下一次创作。',createdAt:new Date(Date.now()-6*86400000).toISOString()},
  {id:'demo-current',text:'今天又下雨了。',createdAt:now()},
 ].map(n=>({...n,...analyze(n.text),source_type:'personal',sourceType:'restored',sourceName:'预置演示示例',image:null,images:[]}));
 return {inspirations:samples,preferences:{theme:'dark',style:'ink',preset:'p1',opacity:85,blur:0,displayName:'演示访客'},presentationVersion:'original-dark-v1',firstUsedAt:now(),revision:1};
}
let store;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');store=saved&&Array.isArray(saved.inspirations)&&saved.preferences?saved:initial();}catch{store=initial();}
// Apply the new dark default once for existing visitors, keeping their notes.
// Later choices made with the original night-reading switch remain persistent.
if(store.presentationVersion!=='original-dark-v1'){
 store={...store,preferences:{...store.preferences,theme:'dark'},presentationVersion:'original-dark-v1'};
 try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}
}
function save(next){
 // Commit in-memory state only after persistent storage succeeds.
 try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('浏览器保存失败，请减少图片大小或检查可用存储空间。');}
 store=next;
}
let graphPromise,poemsPromise;
async function readAsset(name){const res=await fetch(new URL(name,import.meta.url));if(!res.ok)throw new Error('演示资源暂未加载成功，请刷新重试。');return res.json();}
function publicGraph(){return graphPromise??=readAsset('public-graph.json').catch(e=>{graphPromise=null;throw e;});}
function poems(){return poemsPromise??=readAsset('assets/poetry-collection.json').catch(e=>{poemsPromise=null;throw e;});}
function items(){return clone(store.inspirations).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
function record(payload,previous=null){
 const text=String(payload.text??previous?.text??'').trim();
 if(text.length>5000)throw new Error('文字超过 5000 字符，请分段保存。');
 const image=payload.image===undefined?previous?.image||null:payload.image;
 if(image&&!/^data:image\/(png|jpeg|webp);base64,/.test(image))throw new Error('请选择 PNG、JPEG 或 WebP 图片。');
 if(image?.length>2800000)throw new Error('演示图片过大，请压缩后再试。');
 if(!text&&!image)throw new Error('先写下一点什么吧。');
 return {...previous,id:previous?.id||crypto.randomUUID(),text,image,images:image?[{url:image,alt:''}]:[],createdAt:previous?.createdAt||now(),updatedAt:now(),source_type:previous?.source_type||(payload.sourceType?'saved_inspiration':'personal'),...analyze(text),sourceId:payload.sourceId||previous?.sourceId||null,...(payload.sourceType?{sourceType:payload.sourceType,sourceUrl:payload.sourceUrl,sourceName:payload.sourceName,author:payload.author,originalText:payload.originalText}:{}),embedding_status:'demo-local-rules',connection_status:'ready'};
}
function related(source,candidates){
 const tags=new Set(analyze(source.text).tags.filter(t=>t!=='Moment'));
 return candidates.filter(n=>n.id!==source.id).map(n=>({note:n,shared:analyze(n.text).tags.filter(t=>tags.has(t)).length})).filter(n=>n.shared>0).sort((a,b)=>b.shared-a.shared).slice(0,3);
}
async function graph(){
 const base=clone(await publicGraph());
 const own=graphData(store.inspirations,false);
 const nodes=own.nodes.map(n=>({...store.inspirations.find(x=>x.id===n.id),...n}));
 base.nodes.push(...nodes);base.keywords=[...own.keywords,...base.keywords].filter((n,i,all)=>all.findIndex(x=>x.id===n.id)===i).slice(0,20);
 for(const source of nodes){
  const matches=related(source,base.nodes);
  base.connectionIndex[source.id]=matches.map(({note},i)=>({targetId:note.id,rank:i+1}));
  base.layoutLinks.push(...matches.map(({note})=>({sourceId:source.id,targetId:note.id})));
 }
 base.memory={revision:store.revision,pending:0};
 base.analysis={method:'portfolio-demo',description:'公开内容使用项目已有的预计算关联；演示新记录使用关键词匹配，不调用实时模型。'};
 return base;
}
export const api={
 inspirations:async()=>items(),
 create:async payload=>{const source=payload.sourceId?(await poems()).find(p=>p.id===payload.sourceId):null;if(source)payload={...payload,sourceType:'public-poetry',sourceName:source.sourceName,sourceUrl:source.sourceUrl,author:source.author,originalText:source.text};const n=record(payload);save({...store,revision:store.revision+1,inspirations:[n,...store.inspirations]});return clone(n);},
 update:async(id,payload)=>{const previous=store.inspirations.find(n=>n.id===id);if(!previous)throw new Error('未找到这条演示记录。');const n=record({...payload,sourceType:previous.sourceType},previous);save({...store,revision:store.revision+1,inspirations:store.inspirations.map(x=>x.id===id?n:x)});return clone(n);},
 remove:async id=>{save({...store,revision:store.revision+1,inspirations:store.inspirations.filter(x=>x.id!==id)});return {deleted:true,id};},
 preferences:async()=>clone(store.preferences),
 savePreferences:async payload=>{save({...store,preferences:{...store.preferences,...payload}});return clone(store.preferences);},
 insights:async()=>{const notes=items(),byDay={},moods={},collectionByDay={};for(const n of notes){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(n.createdAt));byDay[day]=(byDay[day]||0)+1;moods[n.mood]=(moods[n.mood]||0)+1;if(n.displayDate){const date=n.displayDate.slice(0,10);collectionByDay[date]=(collectionByDay[date]||0)+1;}}return {total:notes.length,days:Math.max(1,Math.ceil((Date.now()-Date.parse(store.firstUsedAt))/86400000)),byDay,moods,collectionByDay,counts:recordCounts(notes),persona:writingPersona(notes)};},
 graph,
 echoLatest:async()=>{const notes=items();const trigger=notes.find(n=>n.source_type==='personal');if(!trigger)return {status:'empty_history',trigger:null,should_surface:false,selected:[]};const selected=related(trigger,notes).map(x=>x.note).slice(0,2);const decorate=n=>({...n,created_at:n.createdAt});return {status:'ready',trigger:decorate(trigger),should_surface:!!selected.length,selected:selected.map(decorate)};},
 echoSurfaced:async()=>({ok:true}),
 memoryStatus:async()=>({revision:store.revision,pending:0}),
 retryMemory:async()=>({pending:0}),
 circle:async()=>({items:await poems(),live:false,notice:'项目自带的公开诗文档案，保留出处与原文。'}),
 weather:async()=>{throw new Error('作品集演示未接入实时天气。');},
 analyze:async text=>analyze(String(text)),
 exportBackup:async()=>clone(store),
};
