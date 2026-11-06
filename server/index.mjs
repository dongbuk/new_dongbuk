import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {animalId,motionFor} from '../src/animal-catalog.mjs';
import {validInput} from '../src/motion.mjs';
import {gameMove} from '../src/game-rules.mjs';
import {createGame} from './game.mjs';
export function createSchool({teacherCode=process.env.TEACHER_CODE,origins=(process.env.ALLOWED_ORIGINS||'http://localhost:5173').split(',').map(s=>s.trim()).filter(Boolean),grace=30000,gameOptions={}}={}){
 const players=new Map(),attempts=new Map();

 const http=createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:req.url==='/health'}));});
 const wss=new WebSocketServer({server:http,path:'/school',maxPayload:2048,perMessageDeflate:{threshold:512,concurrencyLimit:4}});
 const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<128000)ws.send(JSON.stringify(data));};
 const engine=createGame(players,event=>{for(const p of players.values())if(p.ws)send(p.ws,event);},gameOptions),game=engine.game;
 const fail=(ws,message)=>{send(ws,{type:'error',message});ws.close(1008);};
 wss.on('connection',(ws,req)=>{
  if(!origins.includes(req.headers.origin)){ws.close(1008);return;}
  if(wss.clients.size>40){ws.close(1013);return;}
  let p,windowStart=Date.now(),count=0;const timeout=setTimeout(()=>ws.close(1008),5000);
  ws.on('message',raw=>{
   if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}if(++count>90)return fail(ws,'요청이 너무 많아요.');
   let m;try{m=JSON.parse(raw);}catch{return fail(ws,'잘못된 메시지입니다.');}if(!m||typeof m!=='object')return fail(ws,'잘못된 메시지입니다.');
   if(!p){
    if(m.type!=='join')return fail(ws,'먼저 입장해 주세요.');
    const teacher=m.role==='teacher',id=teacher?'teacher':String(m.number);
    if(!teacher&&(!Number.isInteger(m.number)||m.number<1||m.number>32))return fail(ws,'학생 번호는 1~32번이에요.');
    const old=players.get(id);
    if(old&&typeof m.token==='string'&&m.token===old.token){
     if(old.ws&&old.ws.readyState!==WebSocket.CLOSED)return fail(ws,'이미 다른 화면에서 접속 중이에요.');
     p=old;
    }else{
     if(old)return fail(ws,'사용 중인 번호예요. 기존 기기로 다시 접속해 주세요.');
     if(teacher){
      const ip=req.socket.remoteAddress,a=attempts.get(ip)||{n:0,until:Date.now()+60000};if(a.until<Date.now()){a.n=0;a.until=Date.now()+60000;}attempts.set(ip,a);
      if(++a.n>5)return fail(ws,'잠시 후 다시 시도해 주세요.');
      const aCode=Buffer.from(String(m.code||'')),bCode=Buffer.from(teacherCode||'');
      if(!teacherCode||aCode.length!==bCode.length||!timingSafeEqual(aCode,bCode))return fail(ws,'교사 코드를 확인해 주세요.');
     }
     p={id,animal:animalId(m.animal),motion:'idle',role:teacher?'teacher':'student',name:String(m.name||'탐험가').slice(0,12),color:/^#[0-9a-f]{6}$/i.test(m.color)?m.color:'#e9ae69',hat:['cap','flower','none'].includes(m.hat)?m.hat:'cap',token:randomBytes(24).toString('hex'),x:0,z:4,y:0,vy:0,facing:0,ack:0};engine.init(p);players.set(id,p);
    }
    p.ws=ws;p.queue=[];p.lastSeen=Date.now();p.lastSeq=p.ack;clearTimeout(timeout);send(ws,{type:'welcome',id:p.id,token:p.token,ack:p.ack});return;
   }
   p.lastSeen=Date.now();
   if(m.type==='input'&&validInput(m)&&m.seq>p.lastSeq&&p.queue.length<6){p.lastSeq=m.seq;p.queue.push(m);}
   if(['capture','rescue','teacherCommand','ready'].includes(m.type)){const reply=engine.command(p,m);if(reply)send(ws,reply);return;}
   if(m.type==='appearance'&&['FREE_EXPLORATION','GAME_WAITING'].includes(game.phase)&&animalId(m.animal)===m.animal)p.animal=m.animal;
   if(m.type==='ping')send(ws,{type:'pong',time:m.time});
  });
  ws.on('error',()=>{});
  ws.on('close',()=>{clearTimeout(timeout);if(p&&p.ws===ws){p.ws=null;p.queue=[];p.rescuing=null;p.lastSeen=Date.now();}});
 });
 let tick=0;const timer=setInterval(()=>{
  const now=Date.now();for(const [id,p] of players){
   if(!p.ws){if(now-p.lastSeen>grace){engine.leave(p);players.delete(id);}continue;}
   if(now-p.lastSeen>10000){p.ws.terminate();continue;}
   const before={x:p.x,z:p.z};const i=p.queue.shift();if(i&&p.rescuing&&(Math.hypot(i.x,i.z)>.01||i.jump))p.rescuing=null;gameMove(p,i||{x:0,z:0,run:false,jump:false},game);if(i)p.ack=i.seq;p.motion=motionFor(Math.hypot(p.x-before.x,p.z-before.z)*30,p.y);
  }
  engine.tick();
  for(const [ip,a] of attempts)if(a.until<now)attempts.delete(ip);
  if(++tick%2)return;
  const state={type:'state',time:now,game:engine.snapshot(),players:[...players.values()].map(({id,role,name,color,hat,animal,motion,x,z,y,vy,facing,ack,ws,team,status,participant,captures,rescues,captureAt,protectedUntil,rescuing,teleport,stamina,exhausted,sprinting})=>({id,role,name,color,hat,animal,motion,x,z,y,vy,facing,ack,team,status,participant,captures,rescues,captureAt,protectedUntil,rescuing,teleport,stamina,exhausted,sprinting,connected:!!ws}))};
  for(const p of players.values())if(p.ws)send(p.ws,state);
 },1000/30);
 return {http,players,game,engine,async close(){clearInterval(timer);for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>http.close(r));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.env.NODE_ENV==='production'&&(!process.env.TEACHER_CODE||!process.env.ALLOWED_ORIGINS))throw Error('Set TEACHER_CODE and ALLOWED_ORIGINS before production startup');
 const s=createSchool();s.http.listen(Number(process.env.PORT)||2567,'0.0.0.0',()=>console.log('School WebSocket server ready'));
 process.once('SIGTERM',()=>s.close().then(()=>process.exit(0)));
}
