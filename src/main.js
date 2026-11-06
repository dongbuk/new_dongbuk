import * as THREE from 'three';
import './style.css';
import {loadAnimals,AnimalAvatar} from './animals.js';
import {ANIMALS,animalId,motionFor} from './animal-catalog.mjs';
import {STEP} from './motion.mjs';
import {gameMove,canMove,RULES} from './game-rules.mjs';
import {createGameUI} from './game-ui.js';
import {SchoolConnection} from './network.js';
import {walls,benches,move,zone,BOUNDS} from './world.mjs';
const $=id=>document.getElementById(id);
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false}); } catch(error) {
  const notice=document.createElement('p');
  notice.setAttribute('role','alert');
  notice.style.cssText='color:#984e36;background:#fff0e5;padding:12px;border-radius:10px;font-size:13px';
  notice.textContent='3D 화면을 열 수 없어요. WebGL 2를 지원하는 최신 브라우저에서 하드웨어 가속을 켜고 다시 열어주세요. 학교 기기에서는 선생님께 알려주세요.';
  $('enter').before(notice);
  $('enter').disabled=true;
  $('enter').textContent='3D 그래픽 지원이 필요해요';
  $('enter').style.opacity='.55';
  throw new Error('WebGL 2 unavailable: displayed accessible recovery instructions.',{cause:error});
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#d5e9dc');scene.fog=new THREE.Fog('#d5e9dc',55,125);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,160);
scene.add(new THREE.HemisphereLight('#fff9df','#8db895',2.6));const sun=new THREE.DirectionalLight('#fff5d5',3);sun.position.set(-25,45,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:100});sun.shadow.bias=-.001;scene.add(sun);
const materials=new Map();function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color);}
const occluders=[];
function box(x,y,z,w,h,d,color,collider=false){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(collider)occluders.push(m);return m;}
function ball(x,y,z,r,color,parent=scene){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function label(text,x,y,z,size=2.8){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fffdf2';ctx.beginPath();ctx.roundRect(6,12,500,104,24);ctx.fill();ctx.fillStyle='#46634b';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,80);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:true}));s.position.set(x,y,z);s.scale.set(size,size/4,1);scene.add(s);return s;}
box(0,-.22,0,74,.4,74,'#a9c986');box(0,-.025,7,12,.08,58,'#e4d7b5');box(0,0,-7,58,.09,7,'#e4d7b5');box(0,.01,4,18,.1,16,'#eee5cd');box(0,.01,24,26,.1,17,'#d8b484');
// Field lines.
for(const x of [-12,12])box(x,.08,24,.09,.02,15,'#fff3d6');for(const z of [16.5,31.5,24])box(0,.08,z,24,.02,.09,'#fff3d6');
const ring=new THREE.Mesh(new THREE.RingGeometry(2.9,3,48),mat('#fff3d6'));ring.rotation.x=-Math.PI/2;ring.position.set(0,.09,24);scene.add(ring);
box(0,.03,-20,42,.1,10,'#f3e8d4');box(-22,.03,-9,12,.1,20,'#d7c9a5');box(22,.03,-9,12,.1,20,'#e6d7bd');
for(const o of walls){if(o.kind==='tree'){box(o.x,1,o.z,.55,2,.55,'#94735b',true);ball(o.x,3,o.z,2.05,'#72a766');ball(o.x-.7,3.5,o.z+.2,1.5,'#8ebc72');continue;}if(o.kind==='bench'){box(o.x,.55,o.z,o.w,.2,.8,'#b68150',true);box(o.x,1.05,o.z-.32,o.w,.6,.16,'#c18c58',true);for(const dx of [-.8,.8])box(o.x+dx,.25,o.z,.16,.5,.6,'#6b765b');continue;}if(o.kind==='fence'){for(let x=o.x-o.w/2;x<=o.x+o.w/2;x+=.6)for(let z=o.z-o.d/2;z<=o.z+o.d/2;z+=.6)box(x,1,z,.11,2,.11,'#9eaaa2',true);box(o.x,1.6,o.z,o.w,.1,o.d,'#9eaaa2',true);continue;}box(o.x,o.h/2,o.z,o.w,o.h,o.d,'#f4e8cc',true);box(o.x,o.h+.12,o.z,o.w+.25,.24,o.d+.25,'#699783',true);}
// Front facade windows and warm pillars keep the ground-floor route open.
for(const x of [-18,-14,-10,10,14,18]){box(x,2.6,-14.46,2,1.6,.07,'#9ec7c6');box(x,2.6,-14.4,.09,1.6,.08,'#fff8de');}
for(const x of [-18,-10,10,18])box(x,4.8,-15,.35,.35,1.2,'#d5bc83');
label('동 북 초 등 학 교',0,6.6,-25,9);label('체육관',-22,4,1,4);label('도서관',22,4,1,4);label('초록 정원',-24,3,15,4);label('운동장',0,.9,32.5,3);label('친구 구출 구역',25,3.2,30,4.5);
// Low perimeter and main gate, constrained by the shared movement bounds.
for(const x of [-35,35])box(x,.65,0,.3,1.3,70,'#adc0a1');box(0,.65,-35,70,1.3,.3,'#adc0a1');box(-21,.65,35,28,1.3,.3,'#adc0a1');box(21,.65,35,28,1.3,.3,'#adc0a1');for(const x of [-7,7])box(x,1.4,35,.7,2.8,.7,'#e6d8b8');label('어서 와요!',0,3.3,35,3);
for(let i=0;i<22;i++){const x=-32+(i*7.31)%20,z=9+(i*3.71)%21;ball(x,.18,z,.18,['#fff6cf','#f2ab98','#eac5e7'][i%3]);}
// Furniture in classrooms/library; collision geometry remains authoritative and shared.
for(const x of [18,21,24]){box(x,.55,-16,1.5,1,1,'#b7996c');}
const player=new THREE.Group();scene.add(player);let avatar=null,previewAvatar=null,assetsReady=false;
const previewScene=new THREE.Scene();previewScene.background=new THREE.Color('#e5efdf');
previewScene.add(new THREE.HemisphereLight('#fffbe9','#899d83',3));const previewLight=new THREE.DirectionalLight('#ffffff',2);previewLight.position.set(3,5,4);previewScene.add(previewLight);
const previewCamera=new THREE.PerspectiveCamera(35,2,0.1,30);previewCamera.position.set(2,1.6,3.4);previewCamera.lookAt(0,.7,0);
const previewRenderer=new THREE.WebGLRenderer({canvas:$('animalpreview'),antialias:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));previewRenderer.setSize(320,160,false);
function selectAnimal(id){id=animalId(id);avatar?.dispose();avatar=new AnimalAvatar(id);player.add(avatar.root);previewAvatar?.dispose();previewAvatar=new AnimalAvatar(id);previewScene.add(previewAvatar.root);$('avatar').textContent=ANIMALS[id].icon;}
$('animal').replaceChildren(...Object.entries(ANIMALS).map(([id,c])=>new Option(`${c.icon} ${c.name}`,id)));
$('enter').disabled=true;$('assetstatus').textContent='동물 친구들을 불러오고 있어요…';
loadAnimals().then(()=>{assetsReady=true;selectAnimal($('animal').value);$('enter').disabled=false;$('assetstatus').textContent='동물마다 이동 속도와 충돌 범위는 같아요.';}).catch(()=>{$('assetstatus').textContent='동물 파일을 불러오지 못했어요. 페이지를 새로고침해 주세요.';});
$('animal').onchange=()=>{if(assetsReady)selectAnimal($('animal').value);};
let nameLabel=label('학교 탐험가',0,2.25,4,2.3);const pos={x:0,z:4};let y=0,vy=0,yaw=0,pitch=.62,distance=12,active=false,sitting=false,emote='',emoteUntil=0;const keys=new Set();let stick={x:0,y:0};let runningTouch=false;let toastTimer;
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2700);}
function jump(){if(active&&!sitting&&y===0){if(net)jumpRequested=true;else vy=6;}}
function nearestBench(){return benches.find(b=>Math.hypot(pos.x-b.x,pos.z-b.z)<2.4);}
function interact(){if(!active)return;if(sitting){sitting=false;toast('다시 출발!');return;}if(nearestBench()){sitting=true;toast('잠깐 쉬어 가요. E를 누르면 일어나요.');}}
let stamina=100,exhausted=false,sprinting=false;
let net=null,jumpRequested=false,accumulator=0;const remote=new Map();
const gameUI=createGameUI({connection:()=>net,toast});
const targetMark=new THREE.Mesh(new THREE.RingGeometry(.65,.78,24),new THREE.MeshBasicMaterial({color:0xff3838,side:THREE.DoubleSide}));targetMark.rotation.x=-Math.PI/2;targetMark.visible=false;scene.add(targetMark);
const rescueMark=new THREE.Mesh(new THREE.RingGeometry(1.35,1.5,32),new THREE.MeshBasicMaterial({color:0x40bca0,side:THREE.DoubleSide}));rescueMark.rotation.x=-Math.PI/2;rescueMark.position.set(RULES.rescue.x,.12,RULES.rescue.z);rescueMark.visible=false;scene.add(rescueMark);

$('serverurl').value=import.meta.env.VITE_GAME_SERVER_URL||'ws://localhost:2567/school';
$('connection').onchange=()=>{$('numberfield').hidden=$('connection').value==='teacher';$('codefield').hidden=$('connection').value!=='teacher';};
$('connection').onchange();
function enterWorld(){const name=$('nickname').value.trim().slice(0,12)||'학교 탐험가';$('playername').textContent=name;scene.remove(nameLabel);nameLabel.material.map.dispose();nameLabel.material.dispose();nameLabel=label(name,pos.x,2.25,pos.z,2.5);$('welcome').style.display='none';active=true;$('sprintHud').hidden=false;}
function networkState(state){
 const me=state.players.find(p=>p.id===net.id);if(!me)return;
 const previousMe=gameUI.me,previousPhase=gameUI.game.phase;gameUI.state(state);if(previousMe&&(previousMe.teleport!==me.teleport||previousPhase!==state.game.phase)){net.pending=[];jumpRequested=false;}
 if(!['FREE_EXPLORATION','GAME_WAITING'].includes(state.game.phase)&&wardrobe.open)wardrobe.close();
 if(avatar.id!==animalId(me.animal)){$('animal').value=animalId(me.animal);selectAnimal(me.animal);}
 if(!active&&$('welcome').style.display!=='none')enterWorld();
 net.pending=net.pending.filter(i=>i.seq>me.ack);const predicted={...me};for(const i of net.pending)gameMove(predicted,i,state.game);
 Object.assign(pos,{x:predicted.x,z:predicted.z});y=predicted.y;vy=predicted.vy;stamina=predicted.stamina;exhausted=predicted.exhausted;sprinting=predicted.sprinting;
 $('netstatus').textContent=`학생 ${state.players.filter(p=>p.role==='student'&&p.connected).length}/32 · 교사 ${state.players.some(p=>p.role==='teacher'&&p.connected)?'접속':'미접속'}`;
 const ids=new Set();for(const p of state.players){if(p.id===net.id)continue;ids.add(p.id);let r=remote.get(p.id);
  if(!r||r.animal.id!==animalId(p.animal)){if(r){r.animal.dispose();scene.remove(r.tag);r.tag.material.map.dispose();r.tag.material.dispose();}const animal=new AnimalAvatar(p.animal,Number(p.id)||7),model=animal.root;const tag=label(`${p.role==='teacher'?'교사':p.id+'번'} ${p.name}`,p.x,2.4,p.z,2.7);model.position.set(p.x,p.y,p.z);scene.add(model);r={model,tag,animal};remote.set(p.id,r);}r.state=p;
 }
 for(const [id,r] of remote)if(!ids.has(id)){scene.remove(r.model,r.tag);r.animal.dispose();r.tag.material.map.dispose();r.tag.material.dispose();remote.delete(id);}
}
$('enter').onclick=()=>{
 if(net||!assetsReady)return;const role=$('connection').value;
 let url;try{url=new URL($('serverurl').value);if(!['ws:','wss:'].includes(url.protocol)||(location.protocol==='https:'&&url.protocol!=='wss:'))throw Error();}catch{$('connectmessage').textContent='서버 주소를 확인해 주세요. HTTPS 화면에서는 wss:// 주소가 필요해요.';return;}
 const number=Number($('number').value);if(role==='student'&&(!Number.isInteger(number)||number<1||number>32)){$('connectmessage').textContent='학생 번호는 1~32번이에요.';return;}
 net=new SchoolConnection(url.href,networkState,message=>{$('netstatus').textContent=message;$('connectmessage').textContent=message;if(net?.stopped){net=null;$('enter').disabled=false;}},event=>gameUI.event(event));
 $('enter').disabled=true;net.connect({role,number,name:$('nickname').value,animal:$('animal').value,code:$('teachercode').value});$('teachercode').value='';
};
const wardrobe=document.createElement('dialog');wardrobe.innerHTML='<h2>동물 바꾸기 🎨</h2><label>함께할 동물<select id="wardrobeAnimal"></select></label><p>게임 시작 전에는 자유롭게 바꿀 수 있어요.</p><button id="closeWardrobe" class="primary">돌아가기</button>';document.body.append(wardrobe);
$('wardrobeAnimal').replaceChildren(...Object.entries(ANIMALS).map(([id,c])=>new Option(`${c.icon} ${c.name}`,id)));
$('wardrobeAnimal').onchange=()=>{const id=$('wardrobeAnimal').value;if(net){if(!net.connected){toast('다시 연결된 후 변경해 주세요.');return;}net.ws.send(JSON.stringify({type:'appearance',animal:id}));}else{$('animal').value=id;selectAnimal(id);}};
$('closeWardrobe').onclick=()=>wardrobe.close();
$('style').onclick=()=>{if(!assetsReady)return;if(net&&!['FREE_EXPLORATION','GAME_WAITING'].includes(gameUI.game.phase)){toast('게임 시작 전 대기 시간에 바꿀 수 있어요.');return;}keys.clear();stick={x:0,y:0};$('wardrobeAnimal').value=avatar.id;wardrobe.showModal();};$('help').onclick=()=>{gameUI.release();$('guide').showModal();keys.clear();};$('closeguide').onclick=()=>$('guide').close();$('jump').onclick=jump;$('interact').onclick=interact;
for(const id of ['wave','happy','dance'])$(id).onclick=()=>{emote=id;emoteUntil=performance.now()+2800;toast({wave:'👋 안녕, 친구들!',happy:'✨ 오늘도 즐거운 하루!',dance:'🎵 둠칫 둠칫!'}[id]);};
addEventListener('keydown',e=>{if(!active||$('guide').open||wardrobe.open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='Space')jump();if(!e.repeat&&e.code==='KeyE'&&!gameUI.key(true))interact();});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyE')gameUI.key(false);});addEventListener('blur',()=>{keys.clear();stick={x:0,y:0};runningTouch=false;});
let drag=null;$('world').addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);});$('world').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(.18,Math.min(1.2,pitch+(e.clientY-drag.y)*.004));drag={id:e.pointerId,x:e.clientX,y:e.clientY};});for(const ev of ['pointerup','pointercancel'])$('world').addEventListener(ev,()=>drag=null);$('world').addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(5,Math.min(18,distance+e.deltaY*.01));},{passive:false});
const joy=$('joystick');function joyMove(e){const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/40,y=(e.clientY-r.top-r.height/2)/40;const l=Math.max(1,Math.hypot(x,y));stick={x:x/l,y:y/l};joy.firstElementChild.style.transform=`translate(${stick.x*30}px,${stick.y*30}px)`;}joy.onpointerdown=e=>{joy.setPointerCapture(e.pointerId);joyMove(e);};joy.onpointermove=e=>{if(joy.hasPointerCapture(e.pointerId))joyMove(e);};for(const ev of ['pointerup','pointercancel'])joy.addEventListener(ev,()=>{stick={x:0,y:0};joy.firstElementChild.style.transform='';});$('run').onpointerdown=e=>{runningTouch=true;$('run').setPointerCapture(e.pointerId);};for(const ev of ['pointerup','pointercancel'])$('run').addEventListener(ev,()=>runningTouch=false);
const raycaster=new THREE.Raycaster();const target=new THREE.Vector3();const desired=new THREE.Vector3();const direction=new THREE.Vector3();const clock=new THREE.Clock();let frame=0,previousZone='';
function drawMap(){const c=$('minimap'),ctx=c.getContext('2d'),s=2.3,ox=95,oy=83;ctx.fillStyle='#e4ecd6';ctx.fillRect(0,0,190,172);ctx.fillStyle='#d8bf91';ctx.fillRect(ox-13*s,oy+15*s,26*s,17*s);ctx.fillStyle='#fff5dc';ctx.fillRect(ox-21*s,oy-25*s,42*s,10*s);ctx.fillRect(ox-28*s,oy-19*s,12*s,20*s);ctx.fillRect(ox+16*s,oy-19*s,12*s,20*s);ctx.fillStyle='#6d9c68';for(const o of walls.filter(o=>o.kind==='tree')){ctx.beginPath();ctx.arc(ox+o.x*s,oy+o.z*s,4,0,7);ctx.fill();}ctx.fillStyle='#7d9177';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('본관',95,35);ctx.fillText('운동장',95,140);ctx.fillStyle='#eaa454';ctx.beginPath();ctx.arc(ox+pos.x*s,oy+pos.z*s,5,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=performance.now()/1000;let ix=0,iz=0;if(active&&!$('guide').open&&!wardrobe.open){ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x;iz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+stick.y;}
const amount=Math.min(1,Math.hypot(ix,iz)),n=Math.max(1,Math.hypot(ix,iz));const dx=(ix*Math.cos(yaw)+iz*Math.sin(yaw))/n,dz=(-ix*Math.sin(yaw)+iz*Math.cos(yaw))/n;const run=keys.has('ShiftLeft')||keys.has('ShiftRight')||runningTouch;
if(net){accumulator=Math.min(accumulator+dt,.1);while(accumulator>=STEP){accumulator-=STEP;const input={x:dx,z:dz,run,jump:jumpRequested};jumpRequested=false;if(net.input(input)){const p={...pos,y,vy,stamina,exhausted,sprinting,facing:player.rotation.y};Object.assign(p,gameUI.me?{role:gameUI.me.role,team:gameUI.me.team,status:gameUI.me.status,participant:gameUI.me.participant}:{});gameMove(p,input,gameUI.game);pos.x=p.x;pos.z=p.z;y=p.y;vy=p.vy;stamina=p.stamina;exhausted=p.exhausted;sprinting=p.sprinting;player.rotation.y=p.facing;}}}
else{if(amount>.05){move(pos,dx*dt*(run?7:4),dz*dt*(run?7:4));player.rotation.y=Math.atan2(dx,dz);}if(y>0||vy>0){vy-=16*dt;y=Math.max(0,y+vy*dt);if(y===0)vy=0;}}
if(amount>.05)sitting=false;
for(const r of remote.values()){const p=r.state;if(r.teleport!==p.teleport){r.model.position.set(p.x,p.y,p.z);r.teleport=p.teleport;}else r.model.position.lerp(new THREE.Vector3(p.x,p.y,p.z),1-Math.exp(-dt*14));r.tag.material.color.set(p.status==='CAPTURED'?'#b4b4b4':p.team==='police'?'#a0cfff':p.team==='thief'?'#ffc3aa':'#ffffff');r.model.rotation.y=p.facing;const distance=r.model.position.distanceTo(camera.position);r.model.visible=p.connected&&distance<65;r.tag.visible=p.connected&&distance<45;if(r.model.visible)r.animal.update(dt,p.motion||motionFor(0,p.y),distance);r.tag.position.copy(r.model.position).add(new THREE.Vector3(0,2.35,0));}
$('sprintGauge').value=stamina;$('sprintPercent').textContent=`${Math.round(stamina)}%`;$('sprintHint').textContent=exhausted?'지쳤어요 · 20% 회복 후 다시 달려요':sprinting?'달리는 중 · 초당 20% 사용':'쉬거나 걸으면 초당 12% 회복';
const marked=gameUI.frame({...pos,y});targetMark.visible=!!marked;if(marked){const r=remote.get(marked);if(r)targetMark.position.set(r.model.position.x,.15,r.model.position.z);}rescueMark.visible=net&&gameUI.game.phase==='CHASE_PHASE';
player.position.set(pos.x,y,pos.z);
if(avatar){let motion=motionFor(amount*(sprinting?7:4),y);if(net&&(!net.connected||(gameUI.me&&!canMove(gameUI.me,gameUI.game))))motion='idle';if(sitting&&motion==='idle')motion='sit';if(motion==='idle'&&performance.now()<emoteUntil)motion=emote==='wave'?'call':'idle_alt';avatar.update(dt,motion);}
if(previewAvatar&&$('welcome').style.display!=='none'){previewAvatar.update(dt,'idle');previewRenderer.render(previewScene,previewCamera);}
nameLabel.position.set(pos.x,player.position.y+2.35,pos.z);target.set(pos.x,1.2+y,pos.z);desired.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance).add(target);direction.copy(desired).sub(target);const full=direction.length();direction.normalize();raycaster.set(target,direction);raycaster.far=full;const hit=raycaster.intersectObjects(occluders,false)[0];if(hit)desired.copy(target).addScaledVector(direction,Math.max(.65,hit.distance-.35));camera.position.copy(desired);camera.lookAt(target);
if(frame++%12===0){const area=zone(pos.x,pos.z);if(area!==previousZone){$('location').textContent=area;$('area').textContent=area;previousZone=area;}$('interact').hidden=(net&&gameUI.game.phase!=='FREE_EXPLORATION')||!active||(!sitting&&!nearestBench());$('interact').innerHTML=sitting?'일어나기 <kbd>E</kbd>':'잠깐 쉬기 <kbd>E</kbd>';drawMap();}renderer.render(scene,camera);}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();animate();
