import {WebSocket} from 'ws';
import {createSchool} from '../server/index.mjs';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import fs from 'node:fs';
const remote=process.env.LOAD_TEST_URL,seconds=Number(process.env.LOAD_TEST_SECONDS||30),origin=process.env.LOAD_TEST_ORIGIN||'http://localhost:5173';
if(!Number.isFinite(seconds)||seconds<2||seconds>3600)throw Error('Duration must be 2..3600 seconds');
const local=remote?null:createSchool({teacherCode:'local-load-test',origins:[origin]});
if(local)await new Promise(r=>local.http.listen(0,'127.0.0.1',r));
const url=remote||`ws://127.0.0.1:${local.http.address().port}/school`;
if(remote&&!process.env.LOAD_TEST_TEACHER_CODE)throw Error('Set LOAD_TEST_TEACHER_CODE for your own test server');
const lag=monitorEventLoopDelay({resolution:10});lag.enable();const clients=[],rtt=[],intervals=[],gaps=[];const phases=new Set();let bytes=0,snapshots=0,errors=0;
try{
 for(let i=0;i<33;i++){
  await new Promise((resolve,reject)=>{
   const ws=new WebSocket(url,{origin});clients.push(ws);let seq=0,last=0;const timeout=setTimeout(()=>reject(Error('Join timed out')),120000);
   ws.on('error',reject);ws.on('open',()=>ws.send(JSON.stringify({type:'join',role:i===32?'teacher':'student',number:i+1,name:`load-${i+1}`,code:remote?process.env.LOAD_TEST_TEACHER_CODE:'local-load-test',animal:['cat','fox','owl','gecko'][i%4]})));
   ws.on('message',raw=>{bytes+=raw.length;const m=JSON.parse(raw);if(m.type==='error'){errors++;clearTimeout(timeout);reject(Error(m.message));}
    if(m.type==='welcome'){clearTimeout(timeout);intervals.push(setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'input',seq:++seq,x:Math.sin(seq/40+i),z:Math.cos(seq/40+i),run:seq%120<60,jump:seq%150===0}));},1000/30));intervals.push(setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'ping',time:Date.now()}));},1000));resolve();}
    if(m.type==='state'){if(m.game)phases.add(m.game.phase);snapshots++;if(last)gaps.push(Date.now()-last);last=Date.now();}
    if(m.type==='pong')rtt.push(Date.now()-m.time);
   });
  });
 }
 const teacher=clients[32];teacher.send(JSON.stringify({type:'teacherCommand',command:'activate'}));await new Promise(r=>setTimeout(r,100));teacher.send(JSON.stringify({type:'teacherCommand',command:'start'}));
 const initialTransport=clients.reduce((n,w)=>n+(w._socket?.bytesRead||0),0);const start=Date.now();await new Promise(r=>setTimeout(r,seconds*1000));
 const percentile=(a,p)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]:null;
 const result={scope:remote?'remote network bots; no browser GPU':'local loopback bots; not Render performance',clients:clients.length,connected:clients.filter(w=>w.readyState===1).length,seconds:(Date.now()-start)/1000,errors,snapshots,decodedBytes:bytes,transportBytes:clients.reduce((n,w)=>n+(w._socket?.bytesRead||0),0)-initialTransport,estimatedTransportGBPerHour:(clients.reduce((n,w)=>n+(w._socket?.bytesRead||0),0)-initialTransport)/seconds*3600/1e9,compression:clients.every(w=>w.extensions.includes('permessage-deflate')),gamePhases:[...phases],rttMs:{p50:percentile(rtt,.5),p95:percentile(rtt,.95)},snapshotGapMs:{p50:percentile(gaps,.5),p95:percentile(gaps,.95)},localProcess:{rssMiB:process.memoryUsage().rss/1048576,eventLoopP95Ms:lag.percentile(95)/1e6}};
 console.log(JSON.stringify(result,null,2));if(process.env.LOAD_TEST_REPORT)fs.writeFileSync(process.env.LOAD_TEST_REPORT,JSON.stringify(result,null,2)+'\n');
 if(result.connected!==33||errors||!snapshots)process.exitCode=1;
}finally{intervals.forEach(clearInterval);clients.forEach(w=>w.terminate());lag.disable();if(local)await local.close();}
