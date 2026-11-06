import {move} from './world.mjs';
export const STEP=1/30;
export const SPRINT={max:100,drain:20,recover:12,restart:20};
export function simulate(p,i){
  p.stamina=Math.max(0,Math.min(SPRINT.max,p.stamina??SPRINT.max));
  if(p.stamina<=0)p.exhausted=true;
  if(p.exhausted&&p.stamina>=SPRINT.restart)p.exhausted=false;
  p.sprinting=!!i.run&&Math.hypot(i.x,i.z)>.05&&!p.exhausted;
  p.stamina=p.sprinting?Math.max(0,p.stamina-SPRINT.drain*STEP):Math.min(SPRINT.max,p.stamina+SPRINT.recover*STEP);
  if(p.stamina<1e-7){p.stamina=0;p.exhausted=true;}

  const norm=Math.max(1,Math.hypot(i.x,i.z)),speed=p.sprinting?7:4;
  move(p,i.x/norm*speed*STEP,i.z/norm*speed*STEP);
  if(Math.hypot(i.x,i.z)>.05)p.facing=Math.atan2(i.x,i.z);
  if(i.jump&&p.y===0)p.vy=6;
  p.vy-=16*STEP;p.y=Math.max(0,p.y+p.vy*STEP);if(!p.y)p.vy=0;
}
export function validInput(i){return i&&Number.isSafeInteger(i.seq)&&i.seq>=0&&['x','z'].every(k=>Number.isFinite(i[k])&&Math.abs(i[k])<=1)&&typeof i.run==='boolean'&&typeof i.jump==='boolean';}
