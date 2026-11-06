import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {ANIMALS,animalId} from './animal-catalog.mjs';
const templates=new Map();let loading;
export function loadAnimals(){
 if(loading)return loading;
 loading=Promise.all(Object.keys(ANIMALS).map(async id=>{
  const config=ANIMALS[id];
  const gltf=await new GLTFLoader().loadAsync(`/animals/${id}.glb`);
  if(config.externalTexture){
   const texture=await new THREE.TextureLoader().loadAsync(`/animals/${id}.webp`);
   // These UVs came from FBX. Exporting without embedded maps did not invert them.
   texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=config.flipY;texture.anisotropy=2;
   const material=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0});
   gltf.scene.traverse(o=>{if(o.isMesh)o.material=material;});
  }else{
   // Original glTF materials keep their own UV convention.
   gltf.scene.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;m.map.generateMipmaps=false;m.map.needsUpdate=true;}});
  }
  gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  gltf.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());
  templates.set(id,{...gltf,bounds,scale:1.7/Math.max(size.y,size.z)});
 }));return loading;
}
// Mesh, texture and clips are shared; each player has independent bones and mixer.
export class AnimalAvatar {
 constructor(id,phase=0){
  this.id=animalId(id);const t=templates.get(this.id);if(!t)throw Error('Animal assets are not ready');
  this.root=new THREE.Group();this.visual=clone(t.scene);this.root.add(this.visual);this.visual.scale.setScalar(t.scale);this.visual.position.y=-t.bounds.min.y*t.scale;
  this.mixer=new THREE.AnimationMixer(this.visual);this.actions=new Map(t.animations.map(c=>[c.name,this.mixer.clipAction(c)]));this.phase=phase;this.elapsed=phase;this.deferred=0;this.current='';this.setMotion('idle');this.mixer.update(phase%2);
 }
 setMotion(motion){
  const name=motion==='run'&&!this.actions.has('run')?'walk':motion;
  if(!this.actions.has(name))return;
  const key=motion+':'+name;if(key===this.current)return;
  const next=this.actions.get(name),old=this.action;
  if(old!==next){next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(old)old.fadeOut(.18);next.fadeIn(.18);}
  next.setEffectiveTimeScale(motion==='run'&&name==='walk'?1.6:1);
  next.setLoop(name==='jump'?THREE.LoopOnce:THREE.LoopRepeat,Infinity);next.clampWhenFinished=name==='jump';
  this.action=next;this.current=key;
 }
 update(dt,motion='idle',distance=0){
  this.elapsed+=dt;const idleVariant=(Math.floor((this.elapsed+this.phase)/6)%4===3)?'idle_alt':'idle';
  this.setMotion(motion==='idle'?idleVariant:motion);
  // Evaluate distant rigs at 15 Hz, preserving elapsed animation time.
  this.deferred+=dt;if(distance>22&&this.deferred<1/15)return;
  this.mixer.update(this.deferred);this.deferred=0;
  this.root.traverse(o=>{if(o.isMesh)o.castShadow=distance<18;});
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.visual);this.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});this.root.removeFromParent();}
}
