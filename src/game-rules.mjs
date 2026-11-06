import {walls} from './world.mjs';
import {simulate} from './motion.mjs';
export const RULES=Object.freeze({revealMs:3000,escapeMs:20000,chaseMs:300000,captureRange:1.5,detectRange:2,heightRange:.85,cooldownMs:1500,rescueMs:2000,protectionMs:3000,rescueRange:1.5,jail:{x:25,z:27,minX:21.2,maxX:28.8,minZ:24.5,maxZ:29.2},rescue:{x:25,z:22.8},exit:{x:25,z:21}});
export const livePhases=['ROLE_REVEAL','ESCAPE_PHASE','CHASE_PHASE','GAME_PAUSED'];
// Decorative library furniture already present in main.js also blocks reach.
const reachObstacles=[...walls,...[18,21,24].map(x=>({x,z:-16,w:1.5,d:1}))];
export function lineClear(a,b){
 // Segment against the same solid collision rectangles used by movement.
 return !reachObstacles.some(o=>{let lo=0,hi=1;for(const [key,half] of [['x',o.w/2],['z',o.d/2]]){const delta=b[key]-a[key],min=o[key]-half,max=o[key]+half;if(Math.abs(delta)<1e-9){if(a[key]<min||a[key]>max)return false;}else{let t1=(min-a[key])/delta,t2=(max-a[key])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}}return true;});
}
export function inRange(a,b,range){return Math.hypot(a.x-b.x,a.z-b.z,(a.y||0)-(b.y||0))<=range&&Math.abs((a.y||0)-(b.y||0))<=RULES.heightRange;}
export function canMove(p,game){if(p.role==='teacher')return true;if(['ROLE_REVEAL','GAME_PAUSED','GAME_RESULT'].includes(game.phase))return false;if(livePhases.includes(game.phase)&&!p.participant)return false;return !(game.phase==='ESCAPE_PHASE'&&p.team==='police');}
export function gameMove(p,input,game){
 if(!canMove(p,game)){p.sprinting=false;return;}simulate(p,input);
 if(p.status==='CAPTURED'&&livePhases.includes(game.phase)){const j=RULES.jail;p.x=Math.max(j.minX,Math.min(j.maxX,p.x));p.z=Math.max(j.minZ,Math.min(j.maxZ,p.z));p.y=0;p.vy=0;}
}
export function captureTarget(p,players,game,now,range=RULES.captureRange){if(game.phase!=='CHASE_PHASE'||!p.participant||p.team!=='police'||now<(p.captureAt||0))return null;return players.filter(t=>t.participant&&t.team==='thief'&&t.status==='ACTIVE'&&t.connected&&now>=(t.protectedUntil||0)&&inRange(p,t,range)&&lineClear(p,t)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;}
