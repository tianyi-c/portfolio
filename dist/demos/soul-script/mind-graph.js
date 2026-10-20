import {demoDocument as document,demoWindow as window} from "./demo-context.js?v=original-dark-1";
import {graphTheme} from './graph-theme.js';
import { tagLabel, displayTextFor, sourceLabel, matchesText } from './copy.zh-CN.js';
import { getGraphIndex } from './graph-connections.js';
import { selectGraphView } from './graph-view.js';
import { GRAPH_PARTICLE_BUDGET } from './graph-view-config.js';
import * as THREE from './vendor/three.module.js';
import { NebulaBloom } from './nebula-bloom.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const palette={peaceful:'#64e5b9',melancholic:'#ad9bfa',bright:'#f7cc7b',warm:'#f293bb',reflective:'#8ed5ef'};
const stardustTones=Object.values(palette);
const dustTint=(record,index)=>new THREE.Color(stardustTones[hash(record.id)%5]).lerp(new THREE.Color(palette[record.mood]||palette.reflective),index%5===0?.38:.08).getHexString();
const keywordTint=node=>stardustTones[hash(node.label)%5];
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=seed=>{let n=hash(seed);return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};};
const contain=(p,r=100)=>{const length=Math.hypot(p.x,p.y,p.z);if(length>r){p.x*=r/length;p.y*=r/length;p.z*=r/length;}return p;};
const ease=t=>t*t*t*(t*(t*6-15)+10);
// Every point has its own long, smooth light cycle. Reduced motion freezes it.
const vertex=`
attribute vec3 aColor;
attribute float aScale;
attribute float aOpacity;
attribute float aPhase;
attribute float aDrift;
attribute float aShimmer;
varying vec3 vColor;
varying float vOpacity;
varying float vPearl;
uniform float uPixelRatio;
uniform float uTime;
uniform float uMotion;
void main(){
 float t=uTime*uMotion;
 float slowWave=sin(t*(.38+.22*aShimmer)+aPhase);
 float glintWave=.5+.5*sin(t*(.32+.16*aShimmer)+aPhase*2.13);
 float glint=pow(glintWave,6.0)*aShimmer;
 float light=1.0+uMotion*(.085*slowWave+.28*glint);
 float breath=1.0+uMotion*(.018*slowWave+.035*glint);
 vColor=aColor;
 vOpacity=aOpacity*light;
 vPearl=.16+.16*glint*uMotion;
 vec3 drift=vec3(sin(t*.21+aPhase)-sin(aPhase),sin(t*.17+aPhase*1.7)-sin(aPhase*1.7),sin(t*.19+aPhase*2.3)-sin(aPhase*2.3))*aDrift*uMotion;
 vec4 mv=modelViewMatrix*vec4(position+drift,1.0);
 gl_PointSize=clamp(aScale*breath*350.0/max(35.0,-mv.z)*uPixelRatio,1.2,64.0);
 gl_Position=projectionMatrix*mv;
}`;
const fragment=`
varying vec3 vColor;
varying float vOpacity;
varying float vPearl;
uniform float uLightTheme;
uniform float uLayerOpacity;
void main(){
 vec2 p=gl_PointCoord*2.0-1.0;
 float r=dot(p,p);
 if(r>1.0)discard;
 float core=exp(-r*mix(52.0,24.0,uLightTheme));
 float halo=exp(-r*10.0)*mix(.36,.13,uLightTheme);
 float feather=exp(-r*4.0)*.025*(1.0-smoothstep(.45,1.0,r))*(1.0-uLightTheme);
 vec3 pearl=mix(vColor,vec3(.94,.97,1.0),core*vPearl*(1.0-uLightTheme));
 gl_FragColor=vec4(pearl*mix(1.52,1.0,uLightTheme),(core+halo+feather)*vOpacity*uLayerOpacity);
}`;

export class MindGraph {
 constructor(host,{data,onSelect,onKeyword,onReady,onInteraction,pose,options={}}={}){
  this.host=host;this.callbacks={onSelect,onKeyword,onReady,onInteraction};this.options={mood:'all',query:'',keyword:null,selected:null,connections:true,rotate:true,weights:{semantic:60,structural:30,serendipity:38},viewSeed:0,theme:'dark',...options};this.previousSelection=this.options.selected;
  this.animationClock=0;this.lastFrame=performance.now();this.orbitSpeed=0;this.motionPreference=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.motionPreference.matches;this.destroyed=false;this.isVisible=true;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(44,1,.1,2500);this.camera.position.set(16,12,450);
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setClearColor(0x000000,0);this.renderer.info.autoReset=false;this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  this.renderer.domElement.setAttribute('aria-label','三维思维星图：拖动旋转，双指或滚轮缩放，点击星点查看记录');this.renderer.domElement.tabIndex=0;
  this.host.appendChild(this.renderer.domElement);this.bloom=new NebulaBloom(this.renderer);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.055;this.controls.enablePan=true;this.controls.minDistance=40;this.controls.maxDistance=900;this.controls.rotateSpeed=.43;this.controls.zoomSpeed=.64;this.controls.autoRotateSpeed=.18;
  this.controls.addEventListener('start',()=>{this.flight=null;this.userActive=true;this.callbacks.onInteraction?.();});this.controls.addEventListener('end',()=>{this.userActive=false;});
  this.tooltip=document.createElement('div');this.tooltip.className='constellation-tooltip';this.tooltip.hidden=true;this.host.appendChild(this.tooltip);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.visibilityObserver=new IntersectionObserver(entries=>{this.isVisible=entries[0]?.isIntersecting!==false;});this.visibilityObserver.observe(host);
  this.onDown=e=>{this.down={x:e.clientX,y:e.clientY,time:performance.now()};};
  this.onUp=e=>{if(this.down&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<7&&performance.now()-this.down.time<700){const picked=this.pick(e.clientX,e.clientY);if(picked?.kind==='keyword'){this.callbacks.onKeyword?.(picked.label);}else if(picked){this.callbacks.onSelect?.(picked.id);this.focusRecord(picked.id);}else {this.tooltip.hidden=true;if(this.options.selected)this.callbacks.onSelect?.(null);}}this.down=null;};
  this.onMove=e=>{if(e.pointerType==='touch'||this.down)return;const picked=this.pick(e.clientX,e.clientY);this.renderer.domElement.style.cursor=picked?'pointer':'grab';if(!picked){this.tooltip.hidden=true;return;}this.tooltip.textContent=picked.kind==='keyword'?'# '+tagLabel(picked.label)+' · '+picked.count+' 条灵感':sourceLabel(picked)+' · '+displayTextFor(picked).slice(0,80);this.tooltip.hidden=false;const r=this.host.getBoundingClientRect();this.tooltip.style.left=Math.min(r.width-220,Math.max(6,e.clientX-r.left+12))+'px';this.tooltip.style.top=Math.max(10,e.clientY-r.top-45)+'px';};
  this.onLeave=()=>{this.tooltip.hidden=true;};
  this.onKey=e=>{if(e.key==='Home'){e.preventDefault();this.reset();}if(e.key==='+'||e.key==='='){e.preventDefault();this.zoom(1);}if(e.key==='-'){e.preventDefault();this.zoom(-1);}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const o=this.camera.position.clone().sub(this.controls.target);o.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'? .12:-.12);this.camera.position.copy(this.controls.target).add(o);}};
  const canvas=this.renderer.domElement;canvas.addEventListener('pointerdown',this.onDown);canvas.addEventListener('pointerup',this.onUp);canvas.addEventListener('pointermove',this.onMove);canvas.addEventListener('pointerleave',this.onLeave);canvas.addEventListener('keydown',this.onKey);
  canvas.addEventListener('webglcontextlost',this.onLost=e=>{e.preventDefault();this.host.dataset.status='context-lost';});
  canvas.addEventListener('webglcontextrestored',this.onRestored=()=>{this.host.dataset.status='ready';});
  this.setData(data||{nodes:[],edges:[],keywords:[]});this.resize();
  const initialPose=!this.options.selected&&pose?.roamPose?pose.roamPose:pose;
  if(initialPose){this.camera.position.fromArray(initialPose.position);this.controls.target.fromArray(initialPose.target);this.roamPose=this.options.selected?pose?.roamPose||null:null;}else this.reset(false);
  if(this.options.selected&&!this.roamPose)this.roamPose=this.captureCamera();
  this.host.dataset.renderer='webgl';this.host.dataset.particleStyle='points';this.host.dataset.colorStyle='five-tone';this.host.dataset.motionStyle='slow-starlight';this.host.dataset.lightStyle='pearl-points';this.host.dataset.dimensions='3';this.host.dataset.status='ready';
  this.onMotionPreference=()=>{this.reduced=this.motionPreference.matches;this.core.material.uniforms.uMotion.value=this.reduced?0:1;this.cloud.material.uniforms.uMotion.value=this.reduced?0:1;this.ambient.material.uniforms.uMotion.value=this.reduced?0:1;this.controls.autoRotate=this.options.rotate&&!this.reduced&&!this.options.selected;if(this.reduced&&this.flight){this.camera.position.copy(this.flight.to);this.controls.target.copy(this.flight.target);this.flight=null;}this.lastFrame=performance.now();};this.motionPreference.addEventListener('change',this.onMotionPreference);
  this.start=performance.now();this.animate();this.callbacks.onReady?.();
 }
 resize(){if(this.destroyed)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.bloom.resize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 disposeObjects(){
  if(this.group){this.scene.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});}
 }
 setData(data){
  if(data===this.data)return;
  const connectionGraph=!!data.connectionIndex;
  if(this.group&&connectionGraph!==this.connectionGraph){this.disposeObjects();this.group=null;this.core=this.cloud=this.ambient=this.lines=null;}
  this.data=data;this.connectionGraph=connectionGraph;this.graphIndex=getGraphIndex(data);
  this.syncVisibleGraph();this.updateOptions(this.options);
  for(const object of [this.core,this.cloud,this.ambient,this.lines])for(const attr of Object.values(object.geometry.attributes))if(attr.soulTarget){attr.array.set(attr.soulTarget);attr.needsUpdate=true;}
  this.attributesSettling=false;
 }
 syncVisibleGraph(force=false){
  const view=this.connectionGraph?selectGraphView(this.data,{seed:this.options.viewSeed,mood:this.options.mood,query:this.options.query,keyword:this.options.keyword,selected:this.options.selected}):this.data;
  if(view===this.view&&!force)return false;
  const started=performance.now(),previous=this.index,baseSignature=this.connectionGraph?view.baseIds.join('|'):null;
  const keepBase=this.connectionGraph&&!force&&baseSignature===this.baseSignature;
  this.baseSignature=baseSignature;this.view=view;this.optionSignature=null;
  if(!this.group){this.group=new THREE.Group();this.scene.add(this.group);}
  this.records=(view.nodes||[]).map(x=>({...x,kind:'record'}));this.keywords=(this.data.keywords||[]).map(x=>({...x,kind:'keyword'}));
  this.recordOffsets=new Map(this.records.map((x,i)=>[x.id,i]));
  this.index=new Map(this.records.map(x=>[x.id,x]));this.keywordIndex=new Map(this.keywords.map(x=>[x.label,x]));
  const n=Math.max(1,this.keywords.length),baseIds=new Set(view.baseIds||[]);
  this.keywords.forEach((k,i)=>{const y=1-2*(i+.5)/n,a=i*2.399963;const radial=Math.sqrt(1-y*y);k.x=Math.cos(a)*radial*79;k.y=y*79;k.z=Math.sin(a)*radial*79;k.fx=k.x;k.fy=k.y;k.fz=k.z;});
  this.records.forEach(record=>{
   const random=rng(record.id);
   if(this.connectionGraph){
    const a=random()*Math.PI*2,u=random()*2-1,r=74*Math.cbrt(.12+.88*random()),v=Math.sqrt(1-u*u);
    record.anchor={x:Math.cos(a)*v*r,y:u*r,z:Math.sin(a)*v*r};
    Object.assign(record,record.anchor);
    const old=previous?.get(record.id);
    if(old){record.x=old.x;record.y=old.y;record.z=old.z;if(keepBase&&baseIds.has(record.id)){record.fx=old.x;record.fy=old.y;record.fz=old.z;}}
   }else{
    const choices=record.tags.filter(t=>this.keywordIndex.has(t)),label=choices.slice().sort((a,b)=>this.keywordIndex.get(a).count-this.keywordIndex.get(b).count)[0];record.anchor=this.keywordIndex.get(label);
    record.x=(record.anchor?.x||0)+(random()-.5)*27;record.y=(record.anchor?.y||0)+(random()-.5)*27;record.z=(record.anchor?.z||0)+(random()-.5)*27;
   }
  });
  this.layout();this.makePoints();this.makeLinks();
  this.host.dataset.fullRecordCount=String(this.data.nodes.length);
  this.host.dataset.baseRecordCount=String(view.baseIds?.length||0);
  this.host.dataset.baseRecordIds=JSON.stringify(view.baseIds||[]);
  this.host.dataset.temporaryRecordIds=JSON.stringify(view.temporaryIds||[]);
  this.host.dataset.visibleRecordIds=JSON.stringify(this.records.map(n=>n.id));
  this.host.dataset.viewSeed=String(this.options.viewSeed);
  this.host.dataset.viewBuildMs=(performance.now()-started).toFixed(1);
  return true;
 }

 layout(){
  const d3=window.d3;if(!d3?.forceSimulation)throw new Error('三维布局模块未加载');
  const layoutStart=performance.now();
  const nodes=this.connectionGraph?this.records:[...this.keywords,...this.records],links=this.connectionGraph?this.view.layoutLinks.map(x=>({source:x.sourceId,target:x.targetId})):[];
  if(!this.connectionGraph)for(const record of this.records)for(const label of record.tags){const keyword=this.keywordIndex.get(label);if(keyword)links.push({source:keyword.id,target:record.id});}
  const semantic=this.options.weights.semantic/100,structural=this.options.weights.structural/100;
  const simulation=d3.forceSimulation(nodes,3).stop().randomSource(rng('soul-constellation'))
   .force('charge',d3.forceManyBody().strength(node=>node.kind==='keyword'?-12:this.connectionGraph?-11:-7))
   .force('link',d3.forceLink(links).id(n=>n.id).distance((this.connectionGraph?36:18)+(1-semantic)*22).strength(link=>this.connectionGraph ? .018 : link.target.anchor?.id===link.source.id? .12+semantic*.16:.012))
   .force('x',d3.forceX(node=>node.anchor?.x||node.fx||0).strength(.08+structural*.1))
   .force('y',d3.forceY(node=>node.anchor?.y||node.fy||0).strength(.08+structural*.1))
   .force('z',d3.forceZ(node=>node.anchor?.z||node.fz||0).strength(.08+structural*.1))
   .force('collision',d3.forceCollide(this.connectionGraph?5:4).strength(.65));
  for(let i=0;i<(this.connectionGraph?80:110);i++)simulation.tick();simulation.stop();this.records.forEach(record=>{contain(record,89);delete record.fx;delete record.fy;delete record.fz;});this.host.dataset.layoutNodeCount=String(nodes.length);this.host.dataset.layoutMs=(performance.now()-layoutStart).toFixed(1);this.host.dataset.layoutLinkCount=String(links.length);
 }
 pointObject(points,previous){
  const geometry=new THREE.BufferGeometry(),positions=[],colors=[],scales=[],opacities=[],phases=[],drifts=[],shimmers=[];
  for(const p of points){positions.push(p.x,p.y,p.z);colors.push(...new THREE.Color(p.color||'#ddd').toArray());scales.push(p.scale||2);opacities.push(p.opacity?? .6);phases.push((hash(String(p.recordId||p.id)+p.x+p.y)%6283)/1000);drifts.push(p.recordId?.length ? .45+(hash(p.recordId+p.x)%65)/100:0);const sparkleSeed=hash(String(p.recordId||p.id)+':shimmer:'+p.x+':'+p.y);shimmers.push(p.sparkle??(sparkleSeed%100<18?.65+(sparkleSeed%35)/100:.1+(sparkleSeed%20)/100));}
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aColor',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('aScale',new THREE.Float32BufferAttribute(scales,1));geometry.setAttribute('aOpacity',new THREE.Float32BufferAttribute(opacities,1));geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));geometry.setAttribute('aDrift',new THREE.Float32BufferAttribute(drifts,1));geometry.setAttribute('aShimmer',new THREE.Float32BufferAttribute(shimmers,1));
  if(previous){previous.geometry.dispose();previous.geometry=geometry;return previous;}
  const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uPixelRatio:{value:Math.min(devicePixelRatio||1,2)},uTime:{value:0},uMotion:{value:this.reduced?0:1},uLightTheme:{value:0},uLayerOpacity:{value:1}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const object=new THREE.Points(geometry,material);object.frustumCulled=false;this.group.add(object);return object;
 }
 makePoints(){
  this.motifs=[];
  for(const record of this.records){const random=rng('motifs:'+record.id);for(let i=0;i<(this.connectionGraph?GRAPH_PARTICLE_BUDGET.motifs:6);i++){const a=random()*Math.PI*2,u=random()*2-1,r=6+random()*14,v=Math.sqrt(1-u*u);this.motifs.push(contain({...record,id:'motif:'+record.id+':'+i,recordId:record.id,kind:'motif',x:record.x+Math.cos(a)*v*r,y:record.y+u*r,z:record.z+Math.sin(a)*v*r},98));}}
  this.pointNodes=[...this.records,...(this.connectionGraph?[]:this.keywords),...this.motifs];this.core=this.pointObject(this.pointNodes.map(n=>({...n,color:n.kind==='keyword'?keywordTint(n):palette[n.mood]||palette.reflective,scale:n.kind==='keyword'?12:n.kind==='motif'?6.8:18,opacity:.95,sparkle:n.kind==='record'?.85:n.kind==='keyword'?.65:.35})),this.core);
  this.dust=[];
  for(const record of this.records){const random=rng('words:'+record.id),tokens=record.text.match(/[\p{L}\p{N}]{2,}/gu)||[];const words=tokens.slice(0,this.connectionGraph?GRAPH_PARTICLE_BUDGET.words:55);
   words.forEach((word,i)=>{const a=random()*Math.PI*2,u=random()*2-1,r=3+Math.pow(random(),.6)*(12+this.options.weights.serendipity*.09),v=Math.sqrt(1-u*u);const dot={x:record.x+Math.cos(a)*v*r,y:record.y+u*r,z:record.z+Math.sin(a)*v*r,recordId:record.id,mood:record.mood,word,color:'#'+dustTint(record,i),scale:i%4===0?4.6:2.8,opacity:i%4===0?1:.59};this.dust.push(dot);});
  }
  this.wordCount=this.dust.length;const satellites=[];for(const word of this.dust){const random=rng(word.recordId+word.word+word.x);for(let i=1;i<Math.min(this.connectionGraph?2:5,word.word.length);i++)satellites.push({...word,x:word.x+(random()-.5)*4,y:word.y+(random()-.5)*4,z:word.z+(random()-.5)*4,scale:i%3===0?1.9:1.3,opacity:word.opacity*.75});}this.dust.push(...satellites);
  for(const record of this.records){const random=rng('nucleus:'+record.id),letters=[...record.text].filter(c=>/[\p{L}\p{N}]/u.test(c)).slice(0,this.connectionGraph?GRAPH_PARTICLE_BUDGET.letters:16);letters.forEach((letter,i)=>{const angle=i*2.399963,r=1.5+random()*4.8;this.dust.push({x:record.x+Math.cos(angle)*r,y:record.y+Math.sin(angle)*r,z:record.z+(random()-.5)*6,recordId:record.id,mood:record.mood,word:letter,color:i%4===0?palette[record.mood]:'#'+dustTint(record,i),scale:3.4+random()*2.6,opacity:.95});});}

  this.dust.forEach(dot=>contain(dot,101));this.cloud=this.pointObject(this.dust,this.cloud);
  if(!this.ambient){
  const random=rng('spherical-atmosphere'),atmosphere=[];
  for(let i=0;i<(this.connectionGraph?GRAPH_PARTICLE_BUDGET.ambient:1600);i++){const a=random()*Math.PI*2,u=random()*2-1,r=101*Math.cbrt(random()),v=Math.sqrt(1-u*u);atmosphere.push({id:'ambient:'+i,x:Math.cos(a)*v*r,y:u*r,z:Math.sin(a)*v*r,color:stardustTones[i%5],scale:i%11===0?4.5:1.9+random()*1.8,opacity:.25+random()*.45});}
  this.ambient=this.pointObject(atmosphere);
  }
  this.host.dataset.shape='sphere';this.host.dataset.motifCount=String(this.motifs.length);this.host.dataset.ambientCount=String(this.ambient.geometry.attributes.position.count);
  this.host.dataset.corePointCount=String(this.core.geometry.attributes.position.count);this.host.dataset.particleCount=String(this.dust.length);
  this.host.dataset.recordCount=String(this.records.length);this.host.dataset.keywordCount=String(this.keywords.length);this.host.dataset.wordCount=String(this.wordCount);
 }
 makeLinks(){
  if(this.connectionGraph){
   this.relationships=[];
   if(this.lines){this.lines.geometry.setDrawRange(0,0);return;}
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18),3));
   geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(18),3));
   geometry.setDrawRange(0,0);
   this.lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.94,blending:THREE.AdditiveBlending,depthWrite:false}));
   this.lines.frustumCulled=false;this.group.add(this.lines);return;
  }
  this.relationships=this.motifs.map(node=>({source:this.index.get(node.recordId),target:node,recordIds:[node.recordId],derived:true}));
  for(const record of this.records)for(const label of record.tags){const keyword=this.keywordIndex.get(label);if(keyword)this.relationships.push({source:keyword,target:record,recordIds:[record.id],keyword:label});}
  for(const edge of this.data.edges||[]){const a=this.index.get(edge.sourceId),b=this.index.get(edge.targetId);if(a&&b)this.relationships.push({source:a,target:b,recordIds:[a.id,b.id],keywords:edge.keywords||[]});}
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(this.relationships.length*6),colors=new Float32Array(this.relationships.length*6);
  this.relationships.forEach((edge,i)=>{positions.set([edge.source.x,edge.source.y,edge.source.z,edge.target.x,edge.target.y,edge.target.z],i*6);});
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  this.lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.68,blending:THREE.AdditiveBlending,depthWrite:false}));this.group.add(this.lines);
 }
 applyTheme(){
  const name=this.options.theme==='light'?'light':'dark',changed=this.appliedTheme!==name;
  const theme=graphTheme(name),light=name==='light';this.theme=theme;this.appliedTheme=name;
  this.scene.background=light?new THREE.Color(theme.background):null;
  this.renderer.setClearColor(light?theme.background:0x000000,light?1:0);this.bloom.setTheme(name);
  for(const [object,opacity] of [[this.core,1],[this.cloud,theme.cloudOpacity],[this.ambient,theme.ambientOpacity]]){
   if(!object)continue;const material=object.material,blending=light?THREE.NormalBlending:THREE.AdditiveBlending;
   if(material.blending!==blending){material.blending=blending;material.needsUpdate=true;}
   material.uniforms.uLightTheme.value=light?1:0;material.uniforms.uLayerOpacity.value=opacity;
  }
  if(this.lines){const material=this.lines.material,blending=light?THREE.NormalBlending:THREE.AdditiveBlending;
   if(material.blending!==blending){material.blending=blending;material.needsUpdate=true;}
   material.opacity=this.connectionGraph?theme.lineOpacity:theme.legacyLineOpacity;
  }
  this.host.dataset.theme=name;this.host.dataset.particleBlending=light?'normal':'additive';
  this.host.dataset.connectionOpacity=String(this.lines?.material.opacity||0);
  return changed;
 }
 matches(record){const {mood,query,keyword}=this.options;if(mood!=='all'&&record.mood!==mood)return false;if(query&&!matchesText(record,query))return false;if(keyword&&!record.tags.includes(keyword))return false;return true;}
 updateOptions(options){
  const weightsChanged=JSON.stringify(this.options.weights)!==JSON.stringify(options.weights||this.options.weights);this.options={...this.options,...options,weights:{...this.options.weights,...options.weights}};
  const rebuilt=this.syncVisibleGraph(weightsChanged);
  if(!this.core)return;
  const themeChanged=this.applyTheme(),theme=this.theme,light=this.appliedTheme==='light';
  const optionSignature=JSON.stringify(this.options);if(optionSignature===this.optionSignature)return;this.optionSignature=optionSignature;
  const selected=this.options.selected,previous=this.previousSelection;
  this.selection=this.graphIndex.selectionFor(selected);this.focusIds=this.selection?.ids||new Set();
  if(this.connectionGraph&&selected&&!previous){this.roamPose=this.captureCamera();}
  if(this.connectionGraph&&!selected&&previous&&this.roamPose){this.restoreRoaming(this.roamPose);this.roamPose=null;}
  this.previousSelection=selected;
  this.updateFocusPositions();
  if(this.connectionGraph){
   // Layout links are never used as display links. Only the fixed outgoing Top3 is rendered.
   this.relationships=(this.selection?.connections||[]).map(c=>({source:this.index.get(selected),target:this.index.get(c.targetId),rank:c.rank}));
   const position=this.lines.geometry.attributes.position;
   this.syncLineEndpoints();
   position.needsUpdate=true;this.lines.geometry.setDrawRange(0,this.relationships.length*2);
  }
  const filtered=this.options.mood!=='all'||this.options.query||this.options.keyword;
  this.matching=this.data.nodes.filter(x=>this.matches(x));const matches=new Set(this.matching.map(x=>x.id));
  const focused=this.connectionGraph&&!!this.selection;
  const target=(geometry,name)=>{const attr=geometry.attributes[name];attr.soulTarget??=attr.array.slice();return {setX:(i,x)=>attr.soulTarget[i]=x,setXYZ:(i,x,y,z)=>attr.soulTarget.set([x,y,z],i*3)};};
  const coreColors=target(this.core.geometry,'aColor'),opacity=target(this.core.geometry,'aOpacity'),scale=target(this.core.geometry,'aScale');
  this.pointNodes.forEach((node,i)=>{
   const id=node.recordId||node.id,match=node.kind==='keyword'?(!this.options.keyword||node.label===this.options.keyword)&&node.recordIds.some(id=>matches.has(id)):matches.has(id);
   const active=id===selected,connected=this.focusIds.has(id),emphasized=focused?connected:match;
   coreColors.setXYZ(i,...new THREE.Color(light&&active?theme.selected:emphasized?node.kind==='keyword'?(light?theme.palette.reflective:keywordTint(node)):theme.palette[node.mood]||theme.palette.reflective:theme.dim).toArray());
   opacity.setX(i,(focused?(active?1:connected?.95:.08):match?1:filtered?.12:.8)*(node.kind==='motif'?.6:1));
   scale.setX(i,node.kind==='motif'?(active?8.2:connected?7.6:6.8):active?32:focused&&connected?24:node.kind==='keyword'?12:match&&filtered?24:18);
  });
  const dustColors=target(this.cloud.geometry,'aColor'),dustOpacity=target(this.cloud.geometry,'aOpacity');
  this.dust.forEach((dot,i)=>{const match=matches.has(dot.recordId),connected=this.focusIds.has(dot.recordId),emphasized=focused?connected:match;
   dot.baseColor??=new THREE.Color(dot.color).toArray();
   dot.lightColor??=new THREE.Color(dot.color).multiplyScalar(graphTheme('light').dustGain).toArray();
   dustColors.setXYZ(i,...(emphasized?(light?dot.lightColor:dot.baseColor):light?[.22,.25,.23]:[.082,.074,.118]));
   dustOpacity.setX(i,focused?(connected?Math.min(1,dot.opacity*1.2):dot.opacity*.07):match?filtered?Math.min(1,dot.opacity*1.65):dot.opacity:filtered?.10:dot.opacity);
  });
  const ambientColors=target(this.ambient.geometry,'aColor');
  this.ambientDarkColors??=this.ambient.geometry.attributes.aColor.array.slice();
  for(let i=0;i<this.ambient.geometry.attributes.aColor.count;i++){const c=Array.from(this.ambientDarkColors.subarray(i*3,i*3+3));ambientColors.setXYZ(i,...c.map(v=>v*(light?theme.dustGain:1)));}
  const ambientOpacity=target(this.ambient.geometry,'aOpacity');for(let i=0;i<this.ambient.geometry.attributes.aOpacity.count;i++)ambientOpacity.setX(i,focused?.11:filtered?.12:.34);
  const lineColors=target(this.lines.geometry,'color');
  this.relationships.forEach((edge,i)=>{
   if(this.connectionGraph){
    for(const [side,node] of [edge.source,edge.target].entries()){
     const color=new THREE.Color(side?theme.palette[node.mood]||theme.palette.reflective:theme.lineSource).multiplyScalar(light?1:1.05);
     lineColors.setXYZ(i*2+side,...color.toArray());
    }
   }else{
    const adjacent=selected&&edge.recordIds.includes(selected),keywordMatch=this.options.keyword&&(edge.keyword===this.options.keyword||edge.keywords?.includes(this.options.keyword));
    const visible=!filtered||edge.recordIds.every(id=>matches.has(id)),intensity=(adjacent||keywordMatch) ? .78 : visible?(edge.derived?.13:.25):.012;
    const neutral=new THREE.Color(light?'#416575':adjacent||keywordMatch?'#add8f5':'#7097b0');
    for(const [side,node] of [edge.source,edge.target].entries())lineColors.setXYZ(i*2+side,...neutral.clone().lerp(new THREE.Color(theme.palette[node.mood]||theme.palette.reflective),.14).multiplyScalar(intensity).toArray());
   }
  });
  this.lines.visible=this.options.connections&&(!this.connectionGraph||!!this.selection);
  this.attributesSettling=true;
  if(rebuilt||themeChanged){for(const object of [this.core,this.cloud,this.ambient,this.lines])for(const attr of Object.values(object.geometry.attributes))if(attr.soulTarget){attr.array.set(attr.soulTarget);attr.needsUpdate=true;}this.attributesSettling=false;}
  this.controls.autoRotate=this.options.rotate&&!this.reduced&&!this.options.selected&&!this.flight;
  this.host.dataset.matchedCount=String(this.matching.length);this.host.dataset.activeKeyword=this.options.keyword||'';this.host.dataset.activeMood=this.options.mood;
  // DOM diagnostics reflect the same IDs used above for highlight attributes and line geometry.
  this.host.dataset.selectedId=selected||'';this.host.dataset.highlightedTargetIds=JSON.stringify((this.selection?.targets||[]).filter(x=>this.core.geometry.attributes.aOpacity.soulTarget[this.recordOffsets.get(x.id)]>=.9).map(x=>x.id));
  this.host.dataset.renderedConnectionIds=JSON.stringify(this.connectionGraph&&this.lines.visible?this.relationships.map(x=>x.target.id):[]);
  this.host.dataset.connectionLineCount=String(this.connectionGraph&&this.lines.visible?this.lines.geometry.drawRange.count/2:0);
 }
 updateFocusPositions(force=false){
  if(!this.connectionGraph)return;
  const selected=this.options.selected;
  if(!force&&this.positionSelection===selected&&this.positionGeometry===this.core.geometry)return;
  this.positionSelection=selected;this.positionGeometry=this.core.geometry;this.displayOffsets=new Map();
  const source=this.index.get(selected),selection=this.graphIndex.selectionFor(selected);
  if(source&&selection){
   const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion),forward=new THREE.Vector3(0,0,1).applyQuaternion(this.camera.quaternion),angles=[];
   selection.targets.forEach((item,i)=>{
    const target=this.index.get(item.id);if(!target)return;
    const delta=new THREE.Vector3(target.x-source.x,target.y-source.y,target.z-source.z);
    let angle=Math.atan2(delta.dot(up),delta.dot(right));
    for(let attempt=0;attempt<8&&angles.some(a=>Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<.95);attempt++)angle+=Math.PI/3;
    angles.push(angle);
    const point=new THREE.Vector3(source.x,source.y,source.z).addScaledVector(right,Math.cos(angle)*(48+i*4)).addScaledVector(up,Math.sin(angle)*(48+i*4)).addScaledVector(forward,THREE.MathUtils.clamp(delta.dot(forward)*.2,-14,14));
    this.displayOffsets.set(target.id,point.sub(new THREE.Vector3(target.x,target.y,target.z)));
   });
  }
  for(const [object,points] of [[this.core,this.pointNodes],[this.cloud,this.dust]]){
   const attr=object.geometry.attributes.position;attr.soulTarget??=attr.array.slice();
   points.forEach((point,i)=>{const offset=this.displayOffsets.get(point.recordId||point.id);attr.soulTarget.set([point.x+(offset?.x||0),point.y+(offset?.y||0),point.z+(offset?.z||0)],i*3);});
  }
  this.attributesSettling=true;
 }
 renderPosition(node){
  if(node.kind==='record'&&this.recordOffsets.has(node.id)){
   const i=this.recordOffsets.get(node.id)*3,p=this.core.geometry.attributes.position.array;return new THREE.Vector3(p[i],p[i+1],p[i+2]);
  }
  const offset=this.displayOffsets?.get(node.recordId||node.id);return new THREE.Vector3(node.x+(offset?.x||0),node.y+(offset?.y||0),node.z+(offset?.z||0));
 }
 syncLineEndpoints(){
  if(!this.connectionGraph||!this.relationships.length)return;
  const attr=this.lines.geometry.attributes.position;
  this.relationships.forEach((edge,i)=>{const a=this.renderPosition(edge.source),b=this.renderPosition(edge.target);attr.array.set([a.x,a.y,a.z,b.x,b.y,b.z],i*6);});attr.needsUpdate=true;
 }

 restoreRoaming(pose){
  const to=new THREE.Vector3().fromArray(pose.position),target=new THREE.Vector3().fromArray(pose.target);
  if(this.reduced){this.camera.position.copy(to);this.controls.target.copy(target);this.flight=null;return;}
  this.flight={start:performance.now(),from:this.camera.position.clone(),to,oldTarget:this.controls.target.clone(),target,duration:1850};
  this.host.dataset.cameraFocus='overview';
 }

 pick(x,y){
  const rect=this.host.getBoundingClientRect();this.camera.updateMatrixWorld();let best=null,distance=18;
  // The four bright stars take precedence over nearby dim background points.
  for(const id of this.focusIds||[]){const node=this.index.get(id);if(!node)continue;const v=this.renderPosition(node).project(this.camera);if(v.z<0||v.z>1)continue;const d=Math.hypot(x-((v.x*.5+.5)*rect.width+rect.left),y-((-v.y*.5+.5)*rect.height+rect.top));if(d<distance){distance=d;best=node;}}
  if(best)return best;distance=24;
  for(const node of this.pointNodes){if(node.kind!=='keyword'&&!this.matches(node)&&!this.focusIds?.has(node.recordId||node.id))continue;const v=this.renderPosition(node).project(this.camera);if(v.z<0||v.z>1)continue;const px=(v.x*.5+.5)*rect.width+rect.left,py=(-v.y*.5+.5)*rect.height+rect.top,d=Math.hypot(x-px,y-py);if(d<distance){distance=d;best=node.kind==='motif'?this.index.get(node.recordId):node;}}
  return best;
 }
 flyTo(target,distance=90){
  const direction=this.camera.position.clone().sub(this.controls.target).normalize();if(!direction.lengthSq())direction.set(0,0,1);const goal=new THREE.Vector3(target.x,target.y,target.z);
  if(this.reduced){this.controls.target.copy(goal);this.camera.position.copy(goal).addScaledVector(direction,distance);return;}
  this.flight={start:performance.now(),from:this.camera.position.clone(),to:goal.clone().addScaledVector(direction,distance),oldTarget:this.controls.target.clone(),target:goal,duration:1850};this.controls.autoRotate=false;
 }
 focusKeyword(label){const k=this.keywordIndex.get(label);if(!k)return;const records=this.records.filter(n=>n.tags.includes(label)&&this.matches(n));if(!records.length)return;const box=new THREE.Box3();if(!this.connectionGraph)box.expandByPoint(new THREE.Vector3(k.x,k.y,k.z));for(const n of records)box.expandByPoint(new THREE.Vector3(n.x,n.y,n.z));const sphere=box.getBoundingSphere(new THREE.Sphere());const distance=THREE.MathUtils.clamp((sphere.radius+18)/(Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*Math.min(1,this.camera.aspect))*1.1,145,this.defaultDistance||450);this.flyTo(sphere.center,distance);this.host.dataset.cameraFocus=label;}
 focusRecord(id){
  const n=this.index.get(id);if(!n)return;
  const selection=this.graphIndex.selectionFor(id);
  if(selection){
   this.updateFocusPositions(true);
   const stage=this.host.getBoundingClientRect(),sheet=this.host.parentElement.querySelector('.graph-selection-sheet')?.getBoundingClientRect();
   const visibleFraction=sheet?THREE.MathUtils.clamp((sheet.top-stage.top-12)/stage.height,.4,1):1;
   const tangent=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
   // The selected record stays central; a local, still-3D focus brings its exact targets into reach.
   const distance=THREE.MathUtils.clamp((this.defaultDistance||450)*.84,290,480);
   const up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
   const goal=new THREE.Vector3(n.x,n.y,n.z).addScaledVector(up,-distance*tangent*(1-visibleFraction));
   this.flyTo(goal,distance);
  }else this.flyTo(n,105);
  this.host.dataset.cameraFocus=id;
 }
 reset(animate=true){const aspect=this.camera.aspect||.65;const distance=110/(Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*Math.min(1,aspect));this.defaultDistance=Math.min(650,Math.max(290,distance));if(animate)this.flyTo({x:0,y:0,z:0},this.defaultDistance);else{this.controls.target.set(0,0,0);this.camera.position.set(12,8,this.defaultDistance);}this.host.dataset.cameraFocus='overview';}
 zoom(direction){const offset=this.camera.position.clone().sub(this.controls.target);offset.multiplyScalar(direction>0? .88:1/.88);const distance=THREE.MathUtils.clamp(offset.length(),this.controls.minDistance,this.controls.maxDistance);this.flyTo(this.controls.target,distance);}
 captureCamera(){return {position:this.camera.position.toArray(),target:this.controls.target.toArray(),...(this.roamPose?{roamPose:this.roamPose}:{})};}
 suspend(){if(this.destroyed)return;this.suspended=true;cancelAnimationFrame(this.frame);}
 resume(){if(this.destroyed||!this.suspended)return;this.suspended=false;this.isVisible=true;this.lastFrame=performance.now();this.resize();this.animate();}
 animate(){
  if(this.destroyed)return;this.frame=requestAnimationFrame(()=>this.animate());const now=performance.now();
  if(document.hidden||!this.isVisible||!this.host.isConnected){if(this.flight)this.flight.start+=now-this.lastFrame;this.lastFrame=now;return;}
  const frameDelta=Math.max(0,(now-this.lastFrame)/1000),dt=Math.min(.1,frameDelta);this.lastFrame=now;this.animationClock+=dt*1000;
  if(this.flight){const t=Math.min(1,(now-this.flight.start)/this.flight.duration),f=ease(t);this.camera.position.lerpVectors(this.flight.from,this.flight.to,f);this.controls.target.lerpVectors(this.flight.oldTarget,this.flight.target,f);if(t===1){this.flight=null;this.controls.autoRotate=this.options.rotate&&!this.reduced&&!this.options.selected;}}
  const speed=this.options.rotate&&!this.reduced&&!this.options.selected&&!this.flight&&!this.userActive ? .18 : 0;this.orbitSpeed+=(speed-this.orbitSpeed)*(1-Math.exp(-dt/1.1));this.controls.autoRotateSpeed=this.orbitSpeed;this.controls.update(dt);
  const time=this.reduced?0:this.animationClock/1000;this.core.material.uniforms.uTime.value=time;this.cloud.material.uniforms.uTime.value=time;this.ambient.material.uniforms.uTime.value=time;
  const blend=this.reduced?1:1-Math.exp(-Math.min(.5,frameDelta)/.38);
  if(this.attributesSettling){
   let unsettled=false;
   for(const object of [this.core,this.cloud,this.ambient,this.lines])for(const attr of Object.values(object.geometry.attributes)){
    if(!attr.soulTarget)continue;const values=attr.array,target=attr.soulTarget;
    for(let i=0;i<values.length;i++){const delta=target[i]-values[i];if(Math.abs(delta)>.001){values[i]+=delta*blend;unsettled=true;}else values[i]=target[i];}
    attr.needsUpdate=true;
   }
   this.attributesSettling=unsettled;
  }
  this.syncLineEndpoints();
  this.renderer.info.reset();this.bloom.render(this.scene,this.camera,!!(this.options.keyword||this.options.selected||this.options.mood!=='all'),Math.min(.5,frameDelta));this.host.dataset.postprocessing=this.appliedTheme==='light'?'normal-color':'three-scale-bloom';this.host.dataset.cameraDistance=this.camera.position.distanceTo(this.controls.target).toFixed(1);this.host.dataset.drawCalls=String(this.renderer.info.render.calls);
  if(!this.lastDiagnostic||now-this.lastDiagnostic>200){this.host.dataset.cameraPosition=JSON.stringify(this.camera.position.toArray().map(x=>+x.toFixed(2)));this.host.dataset.cameraTarget=JSON.stringify(this.controls.target.toArray().map(x=>+x.toFixed(2)));this.host.dataset.particleCount=String(this.dust.length);this.host.dataset.corePointCount=String(this.core.geometry.attributes.position.count);this.host.dataset.geometryCount=String(this.renderer.info.memory.geometries);this.host.dataset.motionTime=time.toFixed(2);
   if(this.selection){const rect=this.host.getBoundingClientRect();this.host.dataset.focusScreenPoints=JSON.stringify([...this.selection.ids].map(id=>{const n=this.index.get(id),p=this.renderPosition(n).project(this.camera);return {id,x:+(rect.left+(p.x*.5+.5)*rect.width).toFixed(1),y:+(rect.top+(-p.y*.5+.5)*rect.height).toFixed(1)};}));}else this.host.dataset.focusScreenPoints='[]';
   this.lastDiagnostic=now;}
 }
 dispose(){if(this.destroyed)return;this.destroyed=true;cancelAnimationFrame(this.frame);this.motionPreference.removeEventListener('change',this.onMotionPreference);this.resizeObserver.disconnect();this.visibilityObserver.disconnect();this.controls.dispose();const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.onDown);c.removeEventListener('pointerup',this.onUp);c.removeEventListener('pointermove',this.onMove);c.removeEventListener('pointerleave',this.onLeave);c.removeEventListener('keydown',this.onKey);c.removeEventListener('webglcontextlost',this.onLost);c.removeEventListener('webglcontextrestored',this.onRestored);this.disposeObjects();this.bloom.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.host.replaceChildren();}
}
