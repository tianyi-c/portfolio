import {mountContext,navigateDemo} from './demo-context.js?v=original-dark-1';
const sheets=['styles.css','chinese-editorial.css','insights-editorial.css','graph-connection-detail.css','echo-page.css','theme.css','circle-typography.css','search-typography.css'];
class SoulScriptDemo extends HTMLElement{
 connectedCallback(){
  if(this.started)return;this.started=true;
  this.ready=this.start();
 }
 async start(){
  this.dataset.status='loading';
  try{
   const styles=await Promise.all(sheets.map(async name=>{const response=await fetch(new URL(name,import.meta.url));if(!response.ok)throw new Error('样式资源未成功加载');return response.text();}));
   const shadow=this.attachShadow({mode:'open'});
   const style=document.createElement('style');
   // Keep all six original stylesheets intact; only fit their outer shell to the embed.
   style.textContent=styles.join('\n').replace(/:root/g,':host').replace(/(?<![\w-])(?:html|body)(?![\w-])/g,':host')+'\n:host{display:block;width:100%;height:760px;min-height:0!important;max-width:100%;overflow:hidden;position:relative;background:#090908}.app-shell{width:100%!important;height:100%!important;margin:0!important;border-radius:0!important;box-shadow:none!important}.desktop-scene{display:none!important}';
   const app=document.createElement('div');app.id='app';app.className='app-shell';
   shadow.append(style,app);mountContext(shadow,this);
   const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{observer.disconnect();reject(new Error('演示加载超时'));},15000);
    const observer=new MutationObserver(()=>{
     if(app.querySelector('#screen')){clearTimeout(timer);observer.disconnect();resolve();}
     else if(app.querySelector('.page-pad')){clearTimeout(timer);observer.disconnect();reject(new Error(app.textContent.trim()));}
    });observer.observe(app,{childList:true});
   });
   // Attach rejection handling before loading modules, including their dependencies.
   const completed=ready.catch(error=>({error}));
   await import('./vendor/d3-layout.js');
   await import('./app.js?v=graph-warm-1');
   const result=await completed;if(result?.error)throw result.error;
   this.dataset.status='ready';
   this.dispatchEvent(new CustomEvent('soul-demo-ready',{bubbles:true,composed:true}));
  }catch(error){
   this.dataset.status='error';
   this.dispatchEvent(new CustomEvent('soul-demo-error',{detail:{message:error.message},bubbles:true,composed:true}));
  }
 }
 async navigate(page){await this.ready;if(this.dataset.status==='ready')await navigateDemo(page);}
}
if(!customElements.get('soul-script-demo'))customElements.define('soul-script-demo',SoulScriptDemo);
