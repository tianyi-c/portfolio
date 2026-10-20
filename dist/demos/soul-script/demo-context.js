// Module-scoped DOM facade: prototype queries stay inside its own shadow root.
const pageWindow=globalThis.window;
const pageDocument=globalThis.document;
let root,host,navigate;
export function mountContext(shadow,element){root=shadow;host=element;}
export function registerNavigation(callback){navigate=callback;}
export async function navigateDemo(page){if(navigate)await navigate(page);}
export function shareState(page){host?.dispatchEvent(new CustomEvent('soul-demo-state',{detail:{page},bubbles:true,composed:true}));}
const localLocation={hash:'',pathname:'/demos/soul-script/',search:'',origin:pageWindow?.location.origin,reload:()=>pageWindow.location.reload()};
export const demoHistory={replaceState(_state,_unused,url){const next=new URL(url,localLocation.origin);localLocation.hash=next.hash;localLocation.search=next.search;}};
export const demoLocation=localLocation;
export const demoDocument=new Proxy({}, {get(_target,key){
 if(key==='getElementById')return id=>root.getElementById(id);
 if(key==='querySelector')return selector=>root.querySelector(selector);
 if(key==='querySelectorAll')return selector=>root.querySelectorAll(selector);
 if(key==='documentElement'||key==='body')return host;
 if(key==='activeElement')return root.activeElement;
 if(key==='fullscreenElement')return root.fullscreenElement||pageDocument.fullscreenElement;
 if(key==='addEventListener'||key==='removeEventListener')return (event,callback,options)=>{const target=['visibilitychange','fullscreenchange'].includes(event)?pageDocument:root;return target[key](event,callback,options);};
 const value=pageDocument[key];return typeof value==='function'?value.bind(pageDocument):value;
}});
export const demoWindow=new Proxy({}, {get(_target,key){
 if(key==='document')return demoDocument;
 if(key==='location')return localLocation;
 if(key==='history')return demoHistory;
 if(key==='innerHeight')return host?.clientHeight||760;
 if(key==='innerWidth')return host?.clientWidth||390;
 if(key==='visualViewport')return null;
 const value=pageWindow[key];return typeof value==='function'?value.bind(pageWindow):value;
}});
