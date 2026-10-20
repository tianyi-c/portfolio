import * as THREE from './vendor/three.module.js';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const blur=`uniform sampler2D tInput;uniform vec2 direction;uniform float threshold;varying vec2 vUv;vec3 sampleColor(vec2 uv){vec3 c=texture2D(tInput,uv).rgb;if(threshold>0.){float l=max(c.r,max(c.g,c.b));c*=smoothstep(threshold,threshold+.6,l);}return c;}void main(){vec3 c=sampleColor(vUv)*.227027;c+=(sampleColor(vUv+direction*1.384615)+sampleColor(vUv-direction*1.384615))*.316216;c+=(sampleColor(vUv+direction*3.230769)+sampleColor(vUv-direction*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`;
const composite=`uniform sampler2D tScene;uniform sampler2D tFine;uniform sampler2D tMedium;uniform sampler2D tWide;uniform float strength;uniform float exposure;varying vec2 vUv;void main(){vec3 base=texture2D(tScene,vUv).rgb;vec3 glow=texture2D(tFine,vUv).rgb*.72+texture2D(tMedium,vUv).rgb*.17+texture2D(tWide,vUv).rgb*.025;vec3 color=base+glow*strength;gl_FragColor=vec4(vec3(1.)-exp(-color*exposure),1.);
#include <colorspace_fragment>
}`;
export class NebulaBloom {
 constructor(renderer){
  this.renderer=renderer;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.geometry=new THREE.PlaneGeometry(2,2);
  const target=()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false});
  this.source=target();this.source.depthBuffer=true;this.levels=Array.from({length:3},()=>[target(),target()]);
  this.blur=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:blur,uniforms:{tInput:{value:null},direction:{value:new THREE.Vector2()},threshold:{value:0}},depthTest:false,depthWrite:false});
  this.composite=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:composite,uniforms:{tScene:{value:this.source.texture},tFine:{value:this.levels[0][1].texture},tMedium:{value:this.levels[1][1].texture},tWide:{value:this.levels[2][1].texture},strength:{value:.46},exposure:{value:.98}},depthTest:false,depthWrite:false});
  this.quad=new THREE.Mesh(this.geometry,this.blur);this.scene.add(this.quad);
 }
 setTheme(theme){this.theme=theme;}
 resize(width,height){const dpr=this.renderer.getPixelRatio();this.source.setSize(Math.ceil(width*dpr),Math.ceil(height*dpr));this.levels.forEach((pair,i)=>pair.forEach(t=>t.setSize(Math.max(1,Math.ceil(width*dpr/Math.pow(2,i+1))),Math.max(1,Math.ceil(height*dpr/Math.pow(2,i+1))))));}
 render(scene,camera,focused=false,dt=1/60){
  const r=this.renderer;if(this.theme==='light'){r.setRenderTarget(null);r.clear();r.render(scene,camera);return;}r.setRenderTarget(this.source);r.clear();r.render(scene,camera);this.quad.material=this.blur;let input=this.source.texture;
  this.levels.forEach(([horizontal,vertical],i)=>{this.blur.uniforms.tInput.value=input;this.blur.uniforms.direction.value.set((i===0?.8:.95)/horizontal.width,0);this.blur.uniforms.threshold.value=i===0?.88:0;r.setRenderTarget(horizontal);r.render(this.scene,this.camera);this.blur.uniforms.tInput.value=horizontal.texture;this.blur.uniforms.direction.value.set(0,(i===0?.8:.95)/vertical.height);this.blur.uniforms.threshold.value=0;r.setRenderTarget(vertical);r.render(this.scene,this.camera);input=vertical.texture;});
  this.quad.material=this.composite;const blend=1-Math.exp(-dt/.5);this.composite.uniforms.strength.value+=((focused?.52:.46)-this.composite.uniforms.strength.value)*blend;this.composite.uniforms.exposure.value+=(.98-this.composite.uniforms.exposure.value)*blend;r.setRenderTarget(null);r.render(this.scene,this.camera);
 }
 dispose(){this.source.dispose();this.levels.flat().forEach(t=>t.dispose());this.geometry.dispose();this.blur.dispose();this.composite.dispose();}
}
