import test from 'node:test';import assert from 'node:assert/strict';import Matter from 'matter-js';
import {SiegeWorld} from '../src/simulation.js';import {WORLD} from '../src/rules.js';
const empty=()=>{const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);w.armed=true;return w;};
test('starter shelters settle without harming any soldiers',()=>{const w=new SiegeWorld();w.armed=true;w.step(1200);assert.deepEqual(w.troops.map(t=>t.length),[3,3]);assert.ok(w.troops.flat().every(t=>t.health===8));w.dispose();});
test('snapping, bounds and overlap rules protect soldiers and limit construction',()=>{
 const w=new SiegeWorld();let p=w.placement(0,'brick',-500,900);assert.equal(p.x,306);assert.equal(p.y,795);assert.ok(p.valid);
 assert.equal(w.placement(0,'brick',470,790).valid,false);assert.equal(w.place(0,'brick',470,790),false);
 const placed=w.place(0,'brick',615,795);assert.ok(placed);assert.equal(w.placement(0,'brick',615,795).valid,false);w.dispose();
});
test('sleeping roof wakes and falls after support removal',()=>{
 const w=empty(),a=w.block(0,'wood',420,770,24,80),b=w.block(0,'wood',520,770,24,80),roof=w.block(0,'wood',470,720,160,20);
 w.step(240);const before=roof.body.position.y;assert.ok(roof.body.isSleeping);w.remove(a);w.remove(b);w.step(60);assert.ok(roof.body.position.y>before+40);w.dispose();
});
test('heavy falling stone crushes pinned soldiers through real collisions',()=>{
 const w=new SiegeWorld();w.armed=true;for(const e of [...w.entities.values()])if(e.side===0&&e.kind==='block')w.remove(e);
 w.block(0,'stone',470,560,180,36);w.step(240);assert.equal(w.troops[0].length,0);assert.equal(w.troops[1].length,3);assert.ok(w.history.some(h=>h.kind==='soldier'&&h.source==='block'));w.dispose();
});
test('sustained compression kills a soldier pinned under a settled heavy load',()=>{
 const w=empty();const soldier=w.soldier(0,470,WORLD.ground-15);w.block(0,'metal',470,WORLD.ground-42,110,20);w.step(180);
 assert.ok(!w.entities.has(soldier.body.id));assert.ok(w.history.some(h=>h.source==='compression'));w.dispose();
});
test('high-energy fracture conserves mass and leaves physical pieces',()=>{
 const w=empty(),e=w.block(0,'wood',470,600,120,30),mass=e.body.mass;
 Matter.Body.setVelocity(e.body,{x:3,y:1});w.hurt(e,1000,'test');w.step(7);
 const fragments=[...w.entities.values()].filter(e=>e.fragment);assert.equal(fragments.length,2);
 assert.ok(Math.abs(fragments.reduce((a,e)=>a+e.body.mass,0)-mass)<1e-8);assert.ok(fragments.every(e=>!e.body.isStatic));assert.ok(!w.entities.has(e.body.id));w.dispose();
});
test('steel survives a hit that fractures timber and brittle masonry',()=>{
 const outcomes={};for(const material of ['wood','stone','metal']){
  const w=empty(),t=w.block(1,material,1800,770,24,80);w.launch(0,{x:23,y:-4},'heavy');Matter.Body.setPosition(w.shot.entity.body,{x:1630,y:760});w.step(30);
  outcomes[material]=w.entities.has(t.body.id);assert.ok(w.history.some(h=>h.source==='projectile'));w.dispose();
 }assert.deepEqual(outcomes,{wood:false,stone:false,metal:true});
});
test('burst applies radial impulse and real damage, once',()=>{
 const w=empty(),e=w.block(1,'wood',1800,770,30,60);w.launch(0,{x:1,y:-1},'bomb');const bomb=w.shot.entity;Matter.Body.setPosition(bomb.body,{x:1770,y:770});
 w.explode(bomb);const health=e.health;assert.ok(health<e.maxHealth);assert.ok(e.body.velocity.x>0);w.explode(bomb);assert.equal(e.health,health);w.dispose();
});
test('fragment budget bounds physical growth and spent ammo is cleaned',()=>{
 const w=empty();for(let i=0;i<40;i++){const e=w.block(0,'wood',300+i*30,600,24,40);w.hurt(e,1000,'test');}w.step(7);assert.ok(w.fragmentCount<=60);assert.ok(w.entities.size<=70);
 w.launch(0,{x:10,y:-10});w.finishShot();assert.ok([...w.entities.values()].every(e=>e.kind!=='projectile'));w.dispose();
});
test('asymmetric wedges and rotated elbows fit their real bounds and match their preview',()=>{
 const w=empty();for(const id of ['wedge','brace'])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const check=w.placement(0,id,0,900,angle);assert.ok(check.valid);const e=w.place(0,id,check.x,check.y,angle);assert.ok(e);
  assert.ok(e.body.bounds.min.x>=270-.01);assert.ok(e.body.bounds.max.y<=810+.01);
  const actual=(e.body.parts.length>1?e.body.parts.slice(1):[e.body]).flatMap(b=>b.vertices.map(v=>[v.x,v.y]));const preview=check.vertices.flat().map(v=>[v.x,v.y]);assert.equal(actual.length,preview.length);actual.forEach((v,i)=>v.forEach((n,k)=>assert.ok(Math.abs(n-preview[i][k])<1e-8)));w.remove(e);
 }w.dispose();
});
