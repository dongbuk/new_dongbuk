import {randomInt} from 'node:crypto';
import {RULES,inRange,lineClear,livePhases} from '../src/game-rules.mjs';
export function createGame(players,emit,{clock=Date.now,rules={}}={}){
 const config={...RULES,...rules},game={phase:'FREE_EXPLORATION',round:0,endsAt:0,winner:null,reason:null,result:[]};
 const students=()=>[...players.values()].filter(p=>p.role==='student');
 const participants=()=>students().filter(p=>p.participant);
 function reset(p){Object.assign(p,{stamina:100,exhausted:false,sprinting:false,participant:false,team:null,status:'WAITING',ready:false,captures:0,rescues:0,captureAt:0,protectedUntil:0,rescuing:null});}
 function init(p){reset(p);if(game.phase==='GAME_WAITING')p.participant=true;}
 function phase(value,duration=0){game.phase=value;game.endsAt=duration?clock()+duration:0;for(const p of players.values()){p.queue=[];p.rescuing=null;}emit({type:'gameEvent',kind:'phase',phase:value});}
 function finish(winner,reason){game.winner=winner;game.reason=reason;game.result=participants().map(p=>({id:p.id,name:p.name,team:p.team,status:p.status,captures:p.captures,rescues:p.rescues,survived:p.team==='thief'&&p.status==='ACTIVE'}));phase('GAME_RESULT');}
 function checkWin(){if(!['ESCAPE_PHASE','CHASE_PHASE'].includes(game.phase))return;const thieves=participants().filter(p=>p.team==='thief'&&p.status!=='LEFT');if(!thieves.length){finish(null,'NO_THIEVES');return;}if(thieves.every(p=>p.status==='CAPTURED'))finish('police','ALL_CAPTURED');else if(!participants().some(p=>p.team==='police'&&p.status!=='LEFT'))finish('thief','NO_POLICE');}
 function reject(reason){return {type:'commandRejected',reason};}
 function teacher(p,command){
  if(p.role!=='teacher')return reject('NOT_AUTHORIZED');
  if(command==='free'){for(const s of students()){if(s.status==='CAPTURED')Object.assign(s,{...config.exit,y:0,vy:0,teleport:(s.teleport||0)+1});reset(s);}game.winner=null;game.reason=null;game.result=[];phase('FREE_EXPLORATION');return;}
  if(command==='activate'||command==='next'){if(!['FREE_EXPLORATION','GAME_RESULT'].includes(game.phase))return reject('INVALID_PHASE');for(const s of students()){if(s.status==='CAPTURED')Object.assign(s,{...config.exit,y:0,vy:0,teleport:(s.teleport||0)+1});reset(s);s.participant=!!s.ws;}game.winner=null;game.reason=null;game.result=[];phase('GAME_WAITING');return;}
  if(command==='start'){
   if(game.phase!=='GAME_WAITING')return reject('INVALID_PHASE');const list=students().filter(s=>s.ws);if(list.length<2)return reject('NEED_TWO_STUDENTS');
   for(const s of students())reset(s);for(let i=list.length-1;i>0;i--){const j=randomInt(i+1);[list[i],list[j]]=[list[j],list[i]];}
   const police=Math.max(1,Math.min(list.length-1,Math.round(list.length/4)));list.forEach((s,i)=>{s.participant=true;s.team=i<police?'police':'thief';s.status='ACTIVE';});game.round++;phase('ROLE_REVEAL',config.revealMs);return;
  }
  if(command==='pause'){if(!['ROLE_REVEAL','ESCAPE_PHASE','CHASE_PHASE'].includes(game.phase))return reject('INVALID_PHASE');game.resumePhase=game.phase;game.remaining=Math.max(0,game.endsAt-clock());game.pausedAt=clock();phase('GAME_PAUSED');return;}
  if(command==='resume'){if(game.phase!=='GAME_PAUSED')return reject('INVALID_PHASE');const elapsed=clock()-game.pausedAt;for(const s of participants()){if(s.protectedUntil)s.protectedUntil+=elapsed;if(s.captureAt)s.captureAt+=elapsed;}phase(game.resumePhase,game.remaining);checkWin();return;}
  if(command==='end'){if(!livePhases.includes(game.phase))return reject('INVALID_PHASE');finish(null,'TEACHER_ENDED');return;}
  return reject('UNKNOWN_COMMAND');
 }
 function command(p,m){const now=clock();
  if(m.type==='teacherCommand')return teacher(p,m.command);
  if(m.type==='ready'){if(game.phase!=='GAME_WAITING'||p.role!=='student')return reject('INVALID_PHASE');p.ready=true;return;}
  if(m.type==='capture'){
   const t=players.get(String(m.target));
   if(game.phase!=='CHASE_PHASE'||!p.participant||p.team!=='police')return reject('NOT_POLICE_OR_PHASE');
   if(now<(p.captureAt||0))return reject('COOLDOWN');
   if(!t||!t.participant||t.team!=='thief'||t.status!=='ACTIVE'||!t.ws)return reject('INVALID_TARGET');
   if(now<t.protectedUntil)return reject('PROTECTED');
   if(!inRange(p,t,config.captureRange)||!lineClear(p,t))return reject('OUT_OF_REACH');
   p.captureAt=now+config.cooldownMs;p.captures++;Object.assign(t,{status:'CAPTURED',x:config.jail.x,z:config.jail.z,y:0,vy:0,rescuing:null,queue:[]});t.teleport=(t.teleport||0)+1;
   emit({type:'gameEvent',kind:'capture',actor:p.id,target:t.id});checkWin();return;
  }
  if(m.type==='rescue'){
   if(m.action==='cancel'){p.rescuing=null;return;}
   if(game.phase!=='CHASE_PHASE'||!p.participant||p.team!=='thief'||p.status!=='ACTIVE')return reject('NOT_FREE_THIEF');
   if(!inRange(p,config.rescue,config.rescueRange)||!lineClear(p,config.rescue))return reject('OUT_OF_REACH');
   if(!participants().some(s=>s.status==='CAPTURED'&&s.ws))return reject('NO_PRISONER');
   if(!p.rescuing)p.rescuing={x:p.x,z:p.z,y:p.y,startedAt:now};return;
  }
 }
 function tick(){const now=clock();
  if(game.phase==='ROLE_REVEAL'&&now>=game.endsAt)phase('ESCAPE_PHASE',config.escapeMs);
  else if(game.phase==='ESCAPE_PHASE'&&now>=game.endsAt)phase('CHASE_PHASE',config.chaseMs);
  else if(game.phase==='CHASE_PHASE'&&now>=game.endsAt){checkWin();if(game.phase==='CHASE_PHASE')finish('thief','TIME_UP');}
  if(game.phase!=='CHASE_PHASE')return;
  for(const p of participants())if(p.rescuing){const r=p.rescuing;if(!p.ws||p.status!=='ACTIVE'||Math.hypot(p.x-r.x,p.z-r.z)>.08||Math.abs(p.y-r.y)>.08||!inRange(p,config.rescue,config.rescueRange)){p.rescuing=null;continue;}
   if(now-r.startedAt>=config.rescueMs){p.rescuing=null;const t=participants().find(s=>s.status==='CAPTURED'&&s.ws);if(!t)continue;Object.assign(t,{status:'ACTIVE',...config.exit,y:0,vy:0,protectedUntil:now+config.protectionMs,queue:[]});t.teleport=(t.teleport||0)+1;p.protectedUntil=now+config.protectionMs;p.rescues++;emit({type:'gameEvent',kind:'rescue',actor:p.id,target:t.id});}
  }checkWin();
 }
 function leave(p){if(p.participant){p.status='LEFT';p.rescuing=null;checkWin();}}
 function snapshot(){return {...game,counts:{police:participants().filter(p=>p.team==='police'&&p.status!=='LEFT').length,alive:participants().filter(p=>p.team==='thief'&&p.status==='ACTIVE').length,captured:participants().filter(p=>p.status==='CAPTURED').length},roster:students().map(p=>({id:p.id,name:p.name,connected:!!p.ws,ready:p.ready,participant:p.participant,team:p.team,status:p.status,captures:p.captures,rescues:p.rescues}))};}
 return {game,init,command,tick,leave,snapshot,config};
}
