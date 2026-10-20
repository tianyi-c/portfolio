// One provenance rule is shared by the UI and the personal-writing analysis.
export function recordKind(item){
 if(item.sourceType==='restored'||item.analysisMethod==='restored')return 'sample';
 if(item.source_type==='personal')return 'personal';
 if(['imported_public','saved_inspiration'].includes(item.source_type))return 'collection';
 if(item.sourceType||item.sourceUrl||item.importedAt||item.analysisMethod==='imported')return 'collection';
 return 'personal';
}
export function recordCounts(items){
 const counts={all:items.length,personal:0,collection:0,sample:0};
 for(const item of items)counts[recordKind(item)]++;
 return counts;
}
