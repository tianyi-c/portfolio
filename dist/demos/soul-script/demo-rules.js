function analyze(text) {
  const rules = [
    ['peaceful', ['宁静','平静','安静','竹','清风','静','peace','calm','bamboo','river']],
    ['melancholic', ['雨','夜','孤独','思念','遗憾','落叶','rain','night','alone','miss']],
    ['bright', ['阳光','开心','快乐','希望','光','sun','joy','hope','bright']],
    ['warm', ['温暖','拥抱','朋友','家','爱','warm','love','home']],
    ['reflective', ['思考','记忆','时间','梦','问题','想','think','dream','memory','time','moment','seconds','eternity']]
  ];
  const lower = text.toLowerCase();
  const scores = rules.map(([mood, words]) => ({ mood, words: words.filter(w => lower.includes(w.toLowerCase())), score: words.filter(w => lower.includes(w.toLowerCase())).length }));
  scores.sort((a,b) => b.score-a.score);
  const mood = scores[0]?.score ? scores[0].mood : 'reflective';
  const tags = [...new Set(scores.flatMap(s => s.words))].slice(0,4);
  if(!tags.length)tags.push('Moment');
  return { mood, tags, method: 'local-rules' };
}
function graphData(items, includeEdges=true) {
  const vocabulary = {
    Nature:['nature','bamboo','tree','grass','mountain','自然','竹','树','山'],
    Moon:['moon','moonlight','月'], Water:['water','river','brook','pond','水','河','江'],
    Night:['night','midnight','夜'], Light:['light','glow','bright','光'],
    Rain:['rain','storm','雨'], Silence:['silence','quiet','stillness','静','安静'],
    Time:['time','hour','second','moment','eternity','时间','瞬间'],
    Memory:['memory','remember','miss','记忆','回忆','思念'],
    Dream:['dream','梦'], Sky:['sky','cloud','天空','云'],
    Flower:['flower','bloom','bud','flora','花'], Wind:['wind','breeze','风'],
    Sea:['sea','ocean','shore','海'], Bird:['bird','bee','wing','鸟'],
    Sun:['sun','sunrise','sunset','阳光','日落'], Love:['love','heart','爱','心'],
    Solitude:['solitude','alone','lonely','孤独'], Sound:['sound','bell','声音','钟'],
    Journey:['journey','walk','travel','路','旅行']
  };
  const counts=new Map();
  const nodes=items.map(x=>{
    const text=x.text.toLowerCase(), original=(x.tags||[]).map(t=>String(t).toLowerCase());
    const keywords=Object.entries(vocabulary).filter(([label,words])=>words.some(w=>/[a-z]/i.test(w)?new RegExp('\\b'+w+'(?:s|ing)?\\b','i').test(text)||original.includes(w):text.includes(w))).map(([label])=>label);
    for(const tag of keywords){if(!counts.has(tag))counts.set(tag,[]);counts.get(tag).push(x.id);}
    return {id:x.id,text:x.text,mood:x.mood,tags:keywords.length?keywords:x.tags||[],createdAt:x.createdAt,sourceName:x.sourceName||null};
  });
  const keywords=[...counts].filter(([,ids])=>ids.length>=2).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).slice(0,20).map(([label,recordIds])=>({id:'keyword:'+label,label,recordIds,count:recordIds.length}));
  const edges=[];
  if(includeEdges)for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    const shared=nodes[i].tags.filter(t=>nodes[j].tags.includes(t));
    if(shared.length)edges.push({sourceId:nodes[i].id,targetId:nodes[j].id,keywords:shared,reason:'共同意象：'+shared.join('、'),strength:Math.min(1,shared.length/3)});
  }
  return {nodes,edges,keywords,analysis:{method:'local-keyword-cooccurrence',description:'关键词来自原文和现有标签；连线基于共同意象，不代表已接入语义模型。'}};
}

export {analyze,graphData};
