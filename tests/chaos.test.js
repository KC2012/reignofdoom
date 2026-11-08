import test from 'node:test';import assert from 'node:assert/strict';import Matter from 'matter-js';
import {SiegeWorld}from'../src/simulation.js';import{Match}from'../src/match.js';import{repairQueue,visibleTrajectory,assemblyParts}from'../src/chaos.js';import{random,predictFlight}from'../src/rules.js';
const empty=()=>{const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);w.armed=true;return w;};
test('every starter style and reactive arena stays inert without a physical cause',()=>{
 for(const seed of[1,2,3])for(const terrain of['valley','powder','hanging','scrap']){const w=new SiegeWorld(seed,terrain,'skirmish');const top=[...w.entities.values()].filter(e=>e.kind==='block'&&!e.reactive).sort((a,b)=>a.body.position.y-b.body.position.y)[0],height=top.body.position.y;w.armed=true;w.step(1200);assert.ok(Math.abs(top.body.position.y-height)<10,'Starter upper floor stays supported');assert.deepEqual(w.troops.map(t=>t.length),[3,3]);assert.ok(w.troops.flat().every(t=>t.health===t.maxHealth));assert.equal(w.reactionHistory.length,0);w.dispose();}
});
test('repair queues are seeded, bounded and bracket risks with usable basics',()=>{
 const sequences=new Set();for(let seed=1;seed<=100;seed++){const q=repairQueue(random(seed));assert.deepEqual(q,repairQueue(random(seed)));assert.equal(q.length,6);assert.equal(q[0],'beam');assert.equal(q[2],'brick');assert.equal(q[4],'beam');assert.equal(q.filter(id=>id==='volatile').length<=1,true);assert.ok(['volatile','fuse','spring'].includes(q[3]));sequences.add(q.join());}assert.ok(sequences.size>=10);
});
test('repair deals only the current piece, invalid placement is free and skip cannot lock a player',()=>{
 const m=new Match({mode:'hotseat'});m.phase='repair';m.beginRepairQueue();assert.deepEqual(m.queues[0],m.queues[1]);const before=m.snapshot();assert.equal(m.place('brick',600,795),false);assert.equal(m.place('beam',1000,796),false);assert.deepEqual(m.snapshot(),before);assert.ok(m.place('beam',600,790));assert.equal(m.queueIndex[0],1);for(let i=1;i<6;i++){const time=m.timer;assert.ok(m.discardRepair());assert.equal(m.timer,Math.max(0,time-2));}assert.equal(m.currentRepair(),null);assert.equal(m.discardRepair(),false);assert.equal(Object.values(m.inventories[0]).reduce((a,b)=>a+b),0);m.ready();assert.equal(m.active,1);assert.equal(m.currentRepair(),'beam');assert.equal(m.timer,m.world.layout.scale.repair);m.dispose();
});
test('CPU handles every queued piece in each new arena under the same placement rules',()=>{
 for(const terrain of['valley','powder','hanging','scrap'])for(const seed of[1,17,1042]){const m=new Match({mode:'cpu',terrain,seed,scale:'skirmish'});m.phase='repair';m.active=1;m.beginRepairQueue();for(let i=0;i<6;i++)m.cpuBuild();assert.equal(m.currentRepair(),null);assert.ok(m.discards[1]<=3);assert.ok(Object.values(m.inventories[1]).every(n=>n===0));m.dispose();}
});
test('rotated assemblies match their preview and create independent physical timbers',()=>{
 for(const id of['frame','platform'])for(const angle of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const w=empty(),p=w.placement(0,id,800,680,angle);assert.ok(p.valid);assert.ok(w.place(0,id,p.x,p.y,angle));const parts=[...w.entities.values()];assert.equal(parts.length,3);assert.ok(parts.every(e=>!e.body.isStatic&&e.assembly===id));for(let i=0;i<3;i++){const actual=parts[i].body.vertices;assert.equal(actual.length,p.vertices[i].length);for(let j=0;j<actual.length;j++)assert.ok(Math.hypot(actual[j].x-p.vertices[i][j].x,actual[j].y-p.vertices[i][j].y)<1e-6);assert.equal(parts[i].w,assemblyParts(id)[i][2]);}w.dispose();}
});
test('a soldier on a real elevated floor falls when its supports are broken',()=>{
 const w=empty();const a=w.block(0,'wood',1950,710,24,200),b=w.block(0,'wood',2050,710,24,200),floor=w.block(0,'wood',2000,600,150,20),s=w.soldier(0,2000,575);w.step(200);const y=s.body.position.y;assert.ok(y<600);w.remove(a);w.remove(b);w.step(160);assert.ok(!w.entities.has(s.body.id)||s.body.position.y>y+100);assert.ok(floor.body.position.y>650);w.dispose();
});
test('Smash displaces intact architecture while Piercer breaks a narrow support',()=>{
 const results={};for(const ammo of['bolt','heavy']){const w=empty(),a=w.block(1,'wood',2000,750,24,120),b=w.block(1,'wood',2100,750,24,120),roof=w.block(1,'wood',2050,680,150,20);w.step(200);w.launch(0,{x:24,y:-3},ammo);Matter.Body.setPosition(w.shot.entity.body,{x:1910,y:740});w.step(120);results[ammo]={roofX:roof.body.position.x,roofY:roof.body.position.y};assert.ok(w.entities.has(roof.body.id));assert.ok(roof.body.position.y>720);assert.ok(!w.entities.has(a.body.id));assert.ok(w.reactionHistory.some(e=>e.type===(ammo==='bolt'?'smash-impulse':'penetration')));w.dispose();}assert.ok(Math.hypot(results.bolt.roofX-2050,results.bolt.roofY-680)>50);assert.ok(Math.hypot(results.heavy.roofX-2050,results.heavy.roofY-680)>50);
});
test('volatile pieces resist light touches and propagate one causal explosion per crate',()=>{
 const w=empty(),a=w.block(0,'wood',2000,790,38,38,0,'rect',{reactive:'volatile'}),b=w.block(0,'wood',2050,790,38,38,0,'rect',{reactive:'volatile'});w.hurt(a,1,'gentle-contact');w.step(60);assert.equal(w.reactionHistory.length,0);w.hurt(a,15,'projectile');w.step(3);const blasts=w.reactionHistory.filter(e=>e.type==='explosion');assert.equal(blasts.length,2);assert.deepEqual(blasts.map(e=>e.cause),[a.body.id,b.body.id]);w.step(300);assert.equal(w.reactionHistory.filter(e=>e.type==='explosion').length,2);w.dispose();
});
test('a breakaway post releases its visible rope and the weight falls under gravity',()=>{
 const w=new SiegeWorld(3,'hanging','skirmish');w.armed=true;w.step(300);const {anchor,weight}=w.links[0],before=weight.body.position.y;w.hurt(anchor,100,'projectile');assert.equal(w.links.length,1);assert.ok(w.reactionHistory.some(e=>e.type==='support-break'));w.step(180);assert.ok(weight.body.position.y>before+30);assert.equal(weight.body.isStatic,false);assert.ok(w.reactionHistory.some(e=>e.type==='rope-release'&&e.cause===anchor.body.id));w.dispose();
});
test('a released weight can crush a soldier through an actual falling collision',()=>{
 const w=empty(),{anchor,weight}=w.hangingWeight(0,2000,810);w.step(200);const s=w.soldier(0,weight.body.position.x,795);w.hurt(anchor,100,'projectile');w.step(240);assert.ok(!w.entities.has(s.body.id));assert.ok(w.history.some(e=>e.kind==='soldier'&&['block','compression'].includes(e.source)));w.dispose();
});
test('prediction ends at three quarters of ground flight and never exposes the landing',()=>{
 const points=predictFlight({x:440,y:645},{x:24,y:-23}),ground=points.findIndex(p=>p.y>=810),shown=visibleTrajectory(points);assert.equal(shown.length,Math.floor((ground+1)*.75));assert.ok(shown.at(-1).x<points[ground].x-200);
});
test('a distributed thick bunker survives repeated ordinary hits without immunity rules',()=>{
 const w=empty();for(const x of[2000,2200,2400]){w.block(1,'stone',x-48,775,28,70);w.block(1,'stone',x+48,775,28,70);w.block(1,'stone',x,725,130,30);w.block(1,'wood',x,700,130,20);w.soldier(1,x,795);}w.step(200);const roof=[...w.entities.values()].find(e=>e.material==='stone'&&e.w===130),before=roof.health;
 for(let i=0;i<3;i++){w.launch(0,{x:23,y:-3},'bolt');Matter.Body.setPosition(w.shot.entity.body,{x:1850,y:748});w.step(240);w.finishShot();}assert.ok(w.troops[1].length>0);assert.ok(w.history.some(h=>h.source==='projectile'));assert.ok(roof.health<before||Math.abs(roof.body.position.x-2000)>15);w.dispose();
});
test('a falling upper floor transfers damage into another physical structure',()=>{
 const w=empty(),target=w.block(0,'wood',2000,780,60,60),support=w.block(0,'wood',1900,660,24,300),upper=w.block(0,'stone',2000,500,240,30);w.step(1);w.remove(support);w.step(200);assert.ok(upper.body.position.y>650);assert.ok(target.health<target.maxHealth);assert.ok(w.history.some(h=>h.source==='block'));w.dispose();
});
