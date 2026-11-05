import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
export const gameScript=`
local clock=redis.call('TIME');local now=tonumber(clock[1])+tonumber(clock[2])/1000000; local id=ARGV[1]; local action=ARGV[2]
local outcome=nil
local raw=redis.call('GET',KEYS[2]); local game=raw and cjson.decode(raw) or nil
local all=redis.call('HGETALL',KEYS[1]); local players={}; local ids={}
for i=1,#all,2 do local p=cjson.decode(all[i+1]); if now-p.seen<=20 then players[all[i]]=p; table.insert(ids,all[i]) end end
local function clearPath(p,q)
 for i=1,9 do
  local t=i/10;local x=p.x+(q.x-p.x)*t;local z=p.z+(q.z-p.z)*t
  if p.scene.kind=='outside' and ((x>-37.4 and x<37.4 and z>-33.7 and z< -21.5) or (x>-37.4 and x< -25.7 and z> -22.2 and z<8.2)) then return false end
  if p.scene.kind=='hall' then
   local hall=(x>=-35.5 and x<=35.5 and z>=-5.5 and z<=6.5) or (x>=-35.5 and x<=-24.5 and z>=-5.5 and z<=33.5)
   local stairs=math.abs(x)>=27.5 and math.abs(x)<=36.4 and z>=-5 and z<=6
   if not hall and not stairs then return false end
  end
 end
 return true
end
if not players[id] then return cjson.encode({error='먼저 학교에 입장해 주세요.'}) end
if game and game.status=='playing' and now>=game.ends then game.status='ended';game.winner='도둑';game.reason='시간 종료' end
if action=='start' then
 if game and game.status=='playing' then return cjson.encode({error='이미 게임이 진행 중입니다.'}) end
 if #ids<2 then return cjson.encode({error='2명 이상 접속해야 시작할 수 있습니다.'}) end
 local order=cjson.decode(ARGV[3]); local roles={}; local names={};
 for _,who in ipairs(ids) do names[who]=players[who].name end local count=math.max(1,math.min(#ids-1,math.floor(#ids*.25+0.5)));
 for _,p in ipairs(ids) do roles[p]='thief' end
 for _,p in ipairs(order) do if roles[p] and count>0 then roles[p]='police';count=count-1 end end
 game={status='playing',starts=now+20,ends=now+20+tonumber(ARGV[4]),roles=roles,names=names,jailed={},holding={},protected={},scores={},lastTag={}}
elseif action=='stop' and game then
 game.status='ended';game.winner='종료';game.reason='교사가 중단했습니다'
elseif game and game.status=='playing' and now>=(game.starts or 0) then
 game.protected=game.protected or {};game.scores=game.scores or {};game.lastTag=game.lastTag or {}
 local role=game.roles[id]; local p=players[id]
 if action=='tag' and role=='police' and now-(game.lastTag[id] or 0)>=1 then
  outcome='miss'
  game.lastTag[id]=now
  local target=ARGV[3];local q=players[target]
  if q and game.roles[target]=='thief' and not game.jailed[target] and now>=(game.protected[target] or 0) and p.scene.kind==q.scene.kind and p.scene.floor==q.scene.floor and p.scene.room==q.scene.room and (p.x-q.x)^2+(p.y-q.y)^2+(p.z-q.z)^2<=2.25 and clearPath(p,q) then outcome='caught';game.jailed[target]=true;game.holding={};game.scores[id]=game.scores[id] or {tags=0,rescues=0};game.scores[id].tags=game.scores[id].tags+1 end
 end
 if action=='rescue_start' and next(game.jailed) and role=='thief' and not game.jailed[id] and p.scene.kind=='outside' and p.x*p.x+(p.z-5.5)^2<=25 then game.holding[id]=now end
 if action=='rescue_cancel' then game.holding[id]=nil end
 if game.holding[id] and next(game.jailed) and role=='thief' and not game.jailed[id] and p.scene.kind=='outside' and p.x*p.x+(p.z-5.5)^2<=25 then
  if now-game.holding[id]>=2 then
   for who,_ in pairs(game.jailed) do game.protected[who]=now+5 end
   game.protected[id]=now+5;game.jailed={};game.holding={};game.scores[id]=game.scores[id] or {tags=0,rescues=0};game.scores[id].rescues=game.scores[id].rescues+1
  end
 else game.holding[id]=nil end
 local thieves=0;local free=0
 for who,r in pairs(game.roles) do if r=='thief' and players[who] then thieves=thieves+1;if not game.jailed[who] then free=free+1 end end end
 if thieves>0 and free==0 then game.status='ended';game.winner='경찰';game.reason='모두 체포' end
end
if game then redis.call('SET',KEYS[2],cjson.encode(game),'EX',900) end
return cjson.encode({game=game or cjson.null,now=now,outcome=outcome or cjson.null})
`;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 try{
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'잘못된 요청입니다.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(JSON.stringify(body).length>1024||!['state','start','tag','stop','rescue_start','rescue_cancel'].includes(body.action))return res.status(400).json({error:'잘못된 요청입니다.'});
  const cookie=(req.headers.cookie||'').match(/(?:^|;\s*)school_session=([a-f0-9-]{36})(?:;|$)/);
  if(!cookie)return res.status(401).json({error:'먼저 입장해 주세요.'});
  const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token)return res.status(503).json({error:'공유 서버 설정이 필요합니다.'});
  if(body.action==='start'||body.action==='stop'){
   const secret=process.env.TEACHER_GAME_CODE;
   if(!secret)return res.status(503).json({error:'교사 게임 코드가 설정되지 않았습니다.'});
   const expected=Buffer.from(secret),actual=Buffer.from(String(body.code||''));
   if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return res.status(403).json({error:'교사 코드가 올바르지 않습니다.'});
   if(body.action==='start'&&![180,300,420,600].includes(body.duration))return res.status(400).json({error:'게임 시간을 선택해 주세요.'});
  }
  const id=createHash('sha256').update(cookie[1]).digest('hex');
  const cmd=async args=>{const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});const v=await r.json();if(!r.ok||v.error)throw Error('redis');return v.result;};
  let arg=body.target||'';
  if(body.action==='start'){
   const players=await cmd(['HKEYS','school:presence:v1']);
   const previousRaw=await cmd(['GET','school:game:v1']);
   const previous=previousRaw?JSON.parse(previousRaw):null;
   for(let i=players.length-1;i>0;i--){let j=randomInt(i+1);[players[i],players[j]]=[players[j],players[i]];}
   // 직전 라운드 경찰은 다음 무작위 배정에서 뒤로 보내 역할이 반복되는 것을 줄인다.
   players.sort((a,b)=>(previous?.roles?.[a]==='police'?1:0)-(previous?.roles?.[b]==='police'?1:0));
   arg=JSON.stringify(players);
  }
  if(body.action==='tag'&&!/^[a-f0-9]{64}$/.test(arg))return res.status(400).json({error:'대상을 선택해 주세요.'});
  const result=JSON.parse(await cmd(['EVAL',gameScript,'2','school:presence:v1','school:game:v1',id,body.action,arg,String(body.duration||0)]));
  if(result.error)return res.status(409).json(result);
  return res.status(200).json(result);
 }catch{return res.status(503).json({error:'게임 서버에 연결할 수 없습니다.'});}
}
