import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../src/motion.mjs';
import {gameMove} from '../src/game-rules.mjs';
const input={x:1,z:0,run:true,jump:false};
const player=()=>({x:0,z:4,y:0,vy:0,role:'student',participant:true,status:'ACTIVE',stamina:100});
test('sprint drains 20 per second, exhausts after five seconds, then walks and recovers',()=>{const p=player();for(let i=0;i<30;i++)simulate(p,input);assert.ok(Math.abs(p.stamina-80)<1e-6);assert.ok(Math.abs(p.x-7)<1e-6);for(let i=0;i<120;i++)simulate(p,input);assert.equal(p.stamina,0);assert.equal(p.exhausted,true);p.x=0;simulate(p,input);assert.equal(p.sprinting,false);assert.ok(Math.abs(p.x-4/30)<1e-6);assert.ok(p.stamina>0);});
test('walking or standing recovers 12 per second capped at 100; Shift standing does not consume',()=>{const p=player();p.stamina=50;for(let i=0;i<30;i++)simulate(p,{...input,x:0});assert.ok(Math.abs(p.stamina-62)<1e-6);for(let i=0;i<300;i++)simulate(p,{...input,run:false});assert.equal(p.stamina,100);});
test('exhaustion restarts at 20 percent, paused movement freezes gauge',()=>{const p=player();p.stamina=0;for(let i=0;i<30;i++)simulate(p,input);assert.equal(p.sprinting,false);for(let i=0;i<30;i++)simulate(p,input);assert.equal(p.sprinting,true);const before=p.stamina;gameMove(p,input,{phase:'GAME_PAUSED'});assert.equal(p.stamina,before);assert.equal(p.sprinting,false);});
