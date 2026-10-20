import {recordKind} from './record-origin.js';
// A transparent snapshot of writing patterns, separate from imported collections.
export function writingPersona(items,now=Date.now()){
 const excluded=item=>recordKind(item)!=='personal';
 const authored=items.filter(item=>!excluded(item));
 const recent=authored.filter(item=>{const at=Date.parse(item.createdAt);return Number.isFinite(at)&&at<=now&&at>=now-30*86400000;});
 const moods={},terms=new Map();
 for(const item of recent){if(item.mood)moods[item.mood]=(moods[item.mood]||0)+1;for(const tag of new Set(item.tags||[])){const label=String(tag).trim();if(label)terms.set(label,(terms.get(label)||0)+1);}}
 const ranks=Object.entries(moods).sort((a,b)=>b[1]-a[1]),top=ranks[0],tied=!!top&&ranks[1]?.[1]===top[1];
 const status=recent.length===0?'empty':recent.length<3?'growing':'ready';
 return {status,windowDays:30,recordCount:recent.length,authoredTotal:authored.length,excludedCount:items.length-authored.length,dominantMood:status==='ready'&&!tied?top?.[0]||null:null,moods,keywords:[...terms].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,4).map(([label,count])=>({label,count})),evidenceIds:recent.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,3).map(item=>item.id),method:'local-text-patterns',generatedAt:new Date(now).toISOString()};
}
