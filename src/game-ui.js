import {RULES,captureTarget,inRange,lineClear} from './game-rules.mjs';
const phaseNames={FREE_EXPLORATION:'자유 탐험',GAME_WAITING:'참가 대기',ROLE_REVEAL:'역할 발표',ESCAPE_PHASE:'도둑 도망 준비',CHASE_PHASE:'경찰과 도둑',GAME_PAUSED:'일시정지',GAME_RESULT:'경기 결과'};
const teamNames={police:'경찰',thief:'도둑'};
const errors={NOT_AUTHORIZED:'선생님만 사용할 수 있어요.',NEED_TWO_STUDENTS:'학생 2명 이상이 필요해요.',INVALID_PHASE:'현재 단계에서는 사용할 수 없어요.',COOLDOWN:'잠시 기다린 후 다시 잡아 주세요.',INVALID_TARGET:'이미 잡혔거나 잡을 수 없는 대상이에요.',OUT_OF_REACH:'더 가까이 다가가세요. 벽 너머에서는 할 수 없어요.',PROTECTED:'구출 보호 시간이에요.',NO_PRISONER:'구출할 친구가 없어요.',NOT_POLICE_OR_PHASE:'추격 시간에 경찰만 잡을 수 있어요.',NOT_FREE_THIEF:'잡히지 않은 도둑만 구출할 수 있어요.'};
export function createGameUI({connection,toast}){
 const root=document.createElement('section');root.id='gamePanel';root.hidden=true;root.innerHTML='<div id="gameSummary" aria-live="polite"></div><p id="gameNotice"></p><div class="gameActions"><button id="gameReady">준비 완료</button><button id="gameCapture">잡기 · E</button><button id="gameRescue">구출 · E 2초 누르기</button></div><div id="teacherActions"></div><details id="gameRoster"><summary>학생 명단 · 현황</summary><div></div></details><details id="gameResults"><summary>경기 결과 · 개인 기록</summary><div></div></details>';document.body.append(root);
 const el=id=>root.querySelector('#'+id),send=m=>connection()?.send(m);let snapshot,me,target,offset=0,lastPhase='',lastRound=0,holding=false;
 const buttons={activate:'술래잡기 준비',start:'게임 시작',pause:'일시정지',resume:'재개',end:'강제 종료',free:'자유 탐험 / 취소',next:'다음 라운드 준비'};
 for(const [command,title] of Object.entries(buttons)){const b=document.createElement('button');b.textContent=title;b.dataset.command=command;b.onclick=()=>send({type:'teacherCommand',command});el('teacherActions').append(b);}
 el('gameReady').onclick=()=>send({type:'ready'});
 const capture=()=>{if(target&&!el('gameCapture').disabled)send({type:'capture',target:target.id});};el('gameCapture').onclick=capture;
 function release(){if(holding){holding=false;send({type:'rescue',action:'cancel'});}}
 function hold(){if(holding||el('gameRescue').disabled||el('gameRescue').hidden)return;holding=true;send({type:'rescue',action:'start'});}
 el('gameRescue').onpointerdown=e=>{e.preventDefault();el('gameRescue').setPointerCapture(e.pointerId);hold();};for(const e of ['pointerup','pointercancel','lostpointercapture'])el('gameRescue').addEventListener(e,release);addEventListener('blur',release);
 function key(down){if(!me||snapshot.game.phase==='FREE_EXPLORATION')return false;if(!down){release();return true;}if(me.team==='police')capture();else if(me.team==='thief')hold();return true;}
 function rows(node,items){node.replaceChildren(...items.map(text=>{const row=document.createElement('p');row.textContent=text;return row;}));}
 function state(s){snapshot=s;me=s.players.find(p=>p.id===connection()?.id);if(!me)return;offset=s.time-Date.now();root.hidden=false;document.body.classList.add('game-connected');const g=s.game;document.getElementById('modeLabel').textContent=phaseNames[g.phase];
  if(g.phase!==lastPhase||g.round!==lastRound){release();lastPhase=g.phase;lastRound=g.round;if(g.phase==='GAME_WAITING')toast('선생님이 경찰과 도둑 게임을 준비하고 있습니다!');if(g.phase==='ROLE_REVEAL'&&me.participant)toast(me.team==='police'?'당신은 경찰입니다! 도둑을 모두 잡으세요!':'당신은 도둑입니다! 도망치고 친구들을 구출하세요!');if(g.phase==='CHASE_PHASE')toast('경찰 출발! 술래잡기 시작!');}
  el('teacherActions').hidden=me.role!=='teacher';
  const allowed={activate:g.phase==='FREE_EXPLORATION',start:g.phase==='GAME_WAITING',pause:['ROLE_REVEAL','ESCAPE_PHASE','CHASE_PHASE'].includes(g.phase),resume:g.phase==='GAME_PAUSED',end:['ROLE_REVEAL','ESCAPE_PHASE','CHASE_PHASE','GAME_PAUSED'].includes(g.phase),free:g.phase!=='FREE_EXPLORATION',next:g.phase==='GAME_RESULT'};
  for(const b of el('teacherActions').children)b.hidden=!allowed[b.dataset.command];
  el('gameReady').hidden=g.phase!=='GAME_WAITING'||me.role==='teacher';el('gameReady').disabled=!!me.ready;
  el('gameRoster').hidden=me.role!=='teacher';const roster=g.roster||[];el('gameRoster').querySelector('summary').textContent=`학생 ${roster.filter(p=>p.connected).length}/32 · 준비 ${roster.filter(p=>p.ready).length} · 경찰 ${g.counts.police}명`;
  rows(el('gameRoster').querySelector('div'),roster.map(p=>`${p.id}번 ${p.name} · ${p.connected?'접속':'연결 끊김 · 유예'} · ${teamNames[p.team]||'대기'} · ${p.status==='CAPTURED'?'체포':p.ready?'준비 완료':p.participant?'참가':'다음 라운드 대기'}`));
  el('gameResults').hidden=g.phase!=='GAME_RESULT';if(g.phase==='GAME_RESULT'){el('gameResults').open=true;el('gameResults').querySelector('summary').textContent=g.winner?`${teamNames[g.winner]} 승리!`:'경기 종료';rows(el('gameResults').querySelector('div'),g.result.map(p=>`${p.id}번 ${p.name} · ${teamNames[p.team]} · 체포 ${p.captures} · 구출 ${p.rescues}${p.survived?' · 끝까지 생존':''}${p.status==='LEFT'?' · 연결 종료':''}`));}
 }
 function frame(position){if(!snapshot||!me)return null;const g=snapshot.game,now=Date.now()+offset,p={...me,...position};const seconds=Math.max(0,Math.ceil(((g.phase==='GAME_PAUSED'?g.remaining:g.endsAt-now)||0)/1000));
  el('gameSummary').textContent=`${phaseNames[g.phase]} · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · ${me.role==='teacher'?'교사':teamNames[me.team]||'대기'} · 생존 ${g.counts.alive} / 체포 ${g.counts.captured}`;
  const online=!!connection()?.connected;target=online?captureTarget(p,snapshot.players,g,now):null;const detected=captureTarget(p,snapshot.players,g,now,RULES.detectRange);
  el('gameCapture').hidden=me.team!=='police'||g.phase!=='CHASE_PHASE';el('gameCapture').disabled=!target;el('gameCapture').textContent=`${target?'잡기 가능!':'잡기'} · E · 체포 ${me.captures||0}회`;
  el('gameRescue').hidden=me.team!=='thief'||me.status!=='ACTIVE'||g.phase!=='CHASE_PHASE';el('gameRescue').disabled=!online||!g.counts.captured||!inRange(p,RULES.rescue,RULES.rescueRange)||!lineClear(p,RULES.rescue);
  el('gameRescue').textContent=me.rescuing?`구출 중 ${Math.min(100,Math.floor((now-me.rescuing.startedAt)/RULES.rescueMs*100))}%`:`구출 · E 2초 누르기 · ${me.rescues||0}회`;
  let notice='';if(g.phase==='GAME_WAITING')notice='선생님이 게임을 준비하고 있습니다! 곧 술래잡기가 시작됩니다!';else if(g.phase==='ROLE_REVEAL')notice=me.team==='police'?'당신은 경찰입니다! 도둑을 모두 잡으세요!':me.team==='thief'?'당신은 도둑입니다! 경찰을 피해 친구들을 구출하세요!':'교사 · 관전 중';else if(g.phase==='ESCAPE_PHASE')notice=me.team==='police'?'도둑이 달아나는 동안 기다려 주세요.':'지금 달아나세요!';else if(g.phase==='GAME_PAUSED')notice='선생님이 잠시 멈췄습니다.';
  if(me.status==='CAPTURED')notice='경찰에게 잡혔습니다! 감옥에서 구출을 기다려 주세요.';else if(now<me.protectedUntil)notice='구출 보호 중 · 3초간 재체포 불가';else if(g.phase==='CHASE_PHASE'&&me.team==='thief'&&snapshot.players.some(t=>t.team==='police'&&t.connected&&inRange(p,t,6)&&lineClear(p,t)))notice='⚠ 경찰이 가까이 있어요!';
  if(!me.participant&&me.role!=='teacher'&&!['FREE_EXPLORATION','GAME_WAITING'].includes(g.phase))notice='진행 중 입장 · 다음 라운드를 기다려 주세요.';if(!online)notice='연결 복구 중 · 행동을 잠시 기다려 주세요.';el('gameNotice').textContent=notice;return detected?.id||null;
 }
 let audio;function event(e){if(e.type==='commandRejected'){toast(errors[e.reason]||'현재 실행할 수 없는 요청이에요.');return;}if(e.kind==='capture'){if(e.actor===connection()?.id)toast('✨ 체포 성공!');else if(e.target===connection()?.id)toast('경찰에게 잡혔습니다!');}if(e.kind==='rescue')toast('✨ 도둑 1명이 구출되었습니다!');if(['capture','rescue'].includes(e.kind)){root.classList.remove('gameFlash');void root.offsetWidth;root.classList.add('gameFlash');try{audio||=new AudioContext();if(audio.state==='running'){const o=audio.createOscillator(),a=audio.createGain();o.connect(a);a.connect(audio.destination);o.frequency.value=e.kind==='rescue'?880:660;a.gain.setValueAtTime(.06,audio.currentTime);a.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.start();o.stop(audio.currentTime+.2);}}catch{}}}
 document.addEventListener('pointerdown',()=>{try{audio||=new AudioContext();audio.resume();}catch{}},{once:true});
 return {state,frame,event,key,release,get me(){return me;},get game(){return snapshot?.game||{phase:'FREE_EXPLORATION'};}};
}
