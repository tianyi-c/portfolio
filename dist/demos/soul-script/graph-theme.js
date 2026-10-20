// Presentation only. The existing preference is the sole theme state; no storage or data access.
export const GRAPH_THEMES={
 dark:{background:null,palette:{peaceful:'#64e5b9',melancholic:'#ad9bfa',bright:'#f7cc7b',warm:'#f293bb',reflective:'#8ed5ef'},selected:null,dim:'#817b92',lineSource:'#e6e5ff',lineOpacity:.94,legacyLineOpacity:.68,dustGain:1,cloudOpacity:1,ambientOpacity:1,bloom:true},
 light:{background:'#e8e4da',palette:{peaceful:'#23694f',melancholic:'#6e5393',bright:'#986322',warm:'#974968',reflective:'#30657c'},selected:'#214e60',dim:'#74766f',lineSource:'#3b5e6b',lineOpacity:.78,legacyLineOpacity:.40,dustGain:.30,cloudOpacity:.90,ambientOpacity:.32,bloom:false}
};
export function graphTheme(name){return GRAPH_THEMES[name==='light'?'light':'dark'];}
