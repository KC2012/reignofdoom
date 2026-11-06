import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {random,initialInventory,repairInventory,pullVelocity,resultFor,MATERIALS,PIECES} from '../src/rules.js';
import {contactImpact} from '../src/impact.js';
test('seeded supply is repeatable and repairs contain exactly six pieces',()=>{
 const a=random(42),b=random(42);for(let i=0;i<20;i++)assert.deepEqual(repairInventory(a),repairInventory(b));
 const inv=repairInventory(random(13));assert.equal(Object.values(inv).reduce((a,b)=>a+b),6);assert.equal(inv.brace,1);
 assert.equal(initialInventory().steel,1);assert.equal(initialInventory().brace,0);
});
test('slingshot rejects taps and caps launch velocity without changing direction',()=>{
 assert.equal(pullVelocity(2,3),null);let v=pullVelocity(-300,200);assert.ok(Math.abs(Math.hypot(v.x,v.y)-35.775)<.001);assert.ok(v.x>0&&v.y<0);
 assert.ok(Math.hypot(...Object.values(pullVelocity(-100,60,'heavy')))<Math.hypot(...Object.values(pullVelocity(-100,60,'bolt'))));
});
test('win, mutual elimination and siege-limit draws are explicit',()=>{
 assert.equal(resultFor([3,3],2),null);assert.equal(resultFor([0,2],1).winner,1);assert.equal(resultFor([1,0],1).winner,0);
 assert.equal(resultFor([0,0],1).winner,-1);assert.equal(resultFor([2,2],11).winner,-1);assert.equal(resultFor([2,1],11).winner,0);
});
test('materials have distinct inertia, contact and rebound properties',()=>{
 assert.ok(MATERIALS.metal.density>MATERIALS.stone.density);assert.ok(MATERIALS.stone.density>MATERIALS.wood.density);
 assert.ok(MATERIALS.foam.restitution>MATERIALS.wood.restitution);assert.notEqual(MATERIALS.stone.friction,MATERIALS.metal.friction);
 assert.equal(new Set(PIECES.map(p=>p.shape??'rect')).size,3);
});
test('contact model excludes tangential sliding and includes angular closing',()=>{
 const a=Matter.Bodies.rectangle(0,0,40,40),b=Matter.Bodies.rectangle(40,0,40,40);
 Matter.Body.setVelocity(a,{x:0,y:10});assert.equal(contactImpact(a,b,{x:20,y:0},{x:-1,y:0}).energy,0);
 Matter.Body.setVelocity(a,{x:8,y:0});assert.ok(contactImpact(a,b,{x:20,y:0},{x:-1,y:0}).energy>0);
 Matter.Body.setVelocity(a,{x:0,y:0});Matter.Body.setAngularVelocity(a,-.5);assert.ok(contactImpact(a,b,{x:20,y:10},{x:-1,y:0}).energy>0);
});
