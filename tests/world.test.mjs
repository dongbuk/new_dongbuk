import test from 'node:test';import assert from 'node:assert/strict';import {collides,move,BOUNDS} from '../src/world.mjs';
test('spawn and main entry remain open',()=>{assert.equal(collides(0,4),false);assert.equal(collides(4,-15),false);});
test('solid school walls reject collision',()=>{assert.equal(collides(10,-25),true);const p={x:10,z:-22};move(p,0,-10);assert.ok(p.z>-24.2);});
test('large displacement does not tunnel through wall',()=>{const p={x:10,z:-22};move(p,0,-100);assert.ok(p.z>-24.2);});
test('world bounds prevent escape',()=>{const p={x:0,z:30};move(p,0,50);assert.ok(p.z<BOUNDS);});
test('diagonal movement slides along wall',()=>{const p={x:5,z:-24};move(p,2,-2);assert.ok(p.x>6);assert.ok(p.z>-24.2);});
