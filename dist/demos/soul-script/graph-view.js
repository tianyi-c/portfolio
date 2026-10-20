import {DEFAULT_VISIBLE_NODE_COUNT,GRAPH_VIEW_SEED} from './graph-view-config.js';
import {getGraphIndex} from './graph-connections.js';
import {matchesText} from './copy.zh-CN.js';

const cache=new WeakMap();
const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const increment=(map,key)=>map.set(key,(map.get(key)||0)+1);
const monthOf=node=>(node.created_at||node.createdAt||'').slice(0,7);
const authorOf=node=>node.sourceUrl?.match(/\/profile\/([^/]+)/)?.[1]||node.id;
const fingerprint=node=>node.text.toLowerCase().replace(/\s+/g,' ').trim();

export function matchesGraphRecord(node,{mood='all',query='',keyword=null}={}){
 return (mood==='all'||node.mood===mood)&&(!query||matchesText(node,query))&&(!keyword||node.tags?.includes(keyword));
}

// Deterministic theme/month strata; author/text/image diversity only affects presentation.
export function sampleVisibleNodes(data,candidates,{count=DEFAULT_VISIBLE_NODE_COUNT,seed=0}={}){
 count=Math.max(0,Math.floor(Number(count)||0));
 if(candidates.length<=count)return [...candidates];
 const buckets=new Map(),themes=new Map(),months=new Map(),authors=new Map(),texts=new Map();
 const imageRatio=candidates.filter(n=>n.has_image).length/candidates.length;
 for(const node of candidates){
  const theme=data.samplingThemes?.[node.id]||'unassigned',month=monthOf(node),key=theme+'|'+month;
  if(!buckets.has(key))buckets.set(key,{theme,month,chosen:0,tie:hash(GRAPH_VIEW_SEED+seed+key),items:[]});
  buckets.get(key).items.push({node,author:authorOf(node),text:fingerprint(node),tie:hash(GRAPH_VIEW_SEED+seed+node.id)});
 }
 const result=[];let imageCount=0;
 while(result.length<count){
  const available=[...buckets.values()].filter(b=>b.items.length);
  if(!available.length)break;
  available.sort((a,b)=>(themes.get(a.theme)||0)-(themes.get(b.theme)||0)||(months.get(a.month)||0)-(months.get(b.month)||0)||a.chosen-b.chosen||a.tie-b.tie);
  const bucket=available[0],wantImage=imageCount<Math.round((result.length+1)*imageRatio);
  const cost=item=>(texts.get(item.text)||0)*10000+(authors.get(item.author)||0)*100+(!!item.node.has_image===wantImage?0:10);
  bucket.items.sort((a,b)=>cost(a)-cost(b)||a.tie-b.tie);
  const item=bucket.items.shift();result.push(item.node);bucket.chosen++;
  increment(themes,bucket.theme);increment(months,bucket.month);increment(authors,item.author);increment(texts,item.text);
  if(item.node.has_image)imageCount++;
 }
 return result;
}

export function selectGraphView(data,{count=DEFAULT_VISIBLE_NODE_COUNT,seed=0,mood='all',query='',keyword=null,selected=null}={}){
 let memo=cache.get(data);if(!memo){memo={bases:new Map(),views:new Map()};cache.set(data,memo);}
 const key=JSON.stringify([count,seed,mood,query,keyword]);
 let base=memo.bases.get(key);
 if(!base){
  const candidates=data.nodes.filter(n=>matchesGraphRecord(n,{mood,query,keyword}));
  const nodes=sampleVisibleNodes(data,candidates,{count,seed});
  base={nodes,ids:new Set(nodes.map(n=>n.id)),matchedCount:candidates.length};
  if(memo.bases.size>=24){memo.bases.clear();memo.views.clear();}
  memo.bases.set(key,base);
 }
 const index=getGraphIndex(data),selection=index.selectionFor(selected);
 const requested=selection?[...selection.ids]:index.nodesById.has(selected)?[selected]:[];
 const temporaryIds=requested.filter(id=>!base.ids.has(id));
 const viewKey=key+'|'+[...temporaryIds].sort().join(',');
 if(memo.views.has(viewKey))return memo.views.get(viewKey);
 const nodes=[...base.nodes,...temporaryIds.map(id=>index.nodesById.get(id))],ids=new Set(nodes.map(n=>n.id));
 const view={nodes,baseIds:[...base.ids],temporaryIds,matchedCount:base.matchedCount,fullCount:data.nodes.length,
  layoutLinks:(data.layoutLinks||[]).filter(edge=>ids.has(edge.sourceId)&&ids.has(edge.targetId))};
 if(memo.views.size>=48)memo.views.clear();
 memo.views.set(viewKey,view);return view;
}
