import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {TextureLoader,Texture,MeshStandardMaterial,Box3,Vector3} from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
// Offline conversion only: material images are emitted separately, avoiding browser APIs.
globalThis.window={URL};TextureLoader.prototype.load=()=>new Texture();
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const source=process.argv[2];if(!source)throw Error('Pass the extracted Animals directory');
fs.mkdirSync('public/animals',{recursive:true});const report=[];
for(const id of ['cat','fox','owl']){
 const b=fs.readFileSync(path.join(source,'FBX',`animal_${id}.fbx`));const root=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const remove=[];root.traverse(o=>{if(o.isMesh&&o.name.endsWith('LOD0'))remove.push(o);if(o.isBone&&o.parent?.name===o.name)o.name+='_end';});remove.forEach(o=>o.removeFromParent());
 root.traverse(o=>{if(o.isMesh)o.material=new MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});});
 // Keep the supplied animation; reduce only redundant constant keys.
 root.animations.forEach(a=>a.optimize());root.updateMatrixWorld(true);const box=new Box3().setFromObject(root);let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 const output=await new GLTFExporter().parseAsync(root,{binary:true,animations:root.animations});fs.writeFileSync(`public/animals/${id}.glb`,Buffer.from(output));
 report.push({id,sourceSHA256:createHash('sha256').update(b).digest('hex'),sourceBytes:b.length,glbBytes:output.byteLength,triangles,bounds:{min:box.min.toArray(),max:box.max.toArray()},animations:root.animations.map(a=>a.name)});
}
fs.writeFileSync('public/animals/manifest.json',JSON.stringify(report,null,2)+'\n');console.log(report);
