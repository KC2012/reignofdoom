import test from 'node:test';import assert from 'node:assert/strict';import Matter from 'matter-js';
import{Match}from'../src/match.js';import{SiegeWorld}from'../src/simulation.js';
import{battlefield}from'../src/battlefields.js';import{predictFlight,solveShot}from'../src/rules.js';
import{worldToScreen,screenToWorld,zoomCamera,phaseFrame}from'../src/camera.js';
test('all scale/layout combinations have mirrored, wider territories and stable shelters',()=>{
 for(const scale of ['skirmish','siege','grand'])for(const terrain of ['valley','ridge','steps','ravine','highlands']){
  const w=new SiegeWorld(17,terrain,scale),[a,b]=w.sides;assert.equal(a.center+b.center,w.layout.width);assert.ok(b.launcher[0]-a.launcher[0]>2800);assert.equal(a.zone[1]-a.zone[0],b.zone[1]-b.zone[0]);w.armed=true;w.step(180);assert.deepEqual(w.troops.map(t=>t.length),[3,3]);w.dispose();
 }
});
test('six alternating shots precede repairs and the next opener switches',()=>{
 const m=new Match({mode:'hotseat'});m.ready();m.ready();const owners=[];
 for(let i=0;i<6;i++){owners.push(m.active);assert.ok(m.fire({x:(m.active?-1:1)*2,y:-6}));while(m.phase==='flight')m.tick(1/60);if(i<5)assert.equal(m.phase,'aim');}
 assert.deepEqual(owners,[0,1,0,1,0,1]);assert.equal(m.phase,'repair');m.ready();m.ready();assert.equal(m.active,1);m.dispose();
});
test('three centered standard bolts produce damage without deleting a starting army',()=>{
 const m=new Match({mode:'hotseat',seed:17});m.ready();m.ready();
 for(let i=0;i<3;i++){m.active=0;const s=m.world.sides[0],t=m.world.sides[1];assert.ok(m.fire(solveShot({x:s.launcher[0],y:s.launcher[1]-20},{x:t.center,y:740},48)));while(m.phase==='flight')m.tick(1/60);}
 assert.ok(m.counts()[1]>0);assert.ok(m.world.history.some(h=>h.side===1&&h.source==='projectile'));m.dispose();
});
test('long range prediction matches both substeps of the actual projectile',()=>{
 const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);const s=w.sides[0],origin={x:s.launcher[0],y:s.launcher[1]-20};const velocity=solveShot(origin,{x:3800,y:740},48),prediction=predictFlight(origin,velocity);w.launch(0,velocity);w.step(150);const actual=w.shot.entity.body.position;assert.ok(Math.hypot(actual.x-prediction[149].x,actual.y-prediction[149].y)<.01);w.dispose();
});
test('maximum speed projectile does not tunnel through a thin plate',()=>{
 const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);w.block(1,'metal',2000,500,12,120);w.launch(0,{x:35,y:-2});Matter.Body.setPosition(w.shot.entity.body,{x:1930,y:500});w.step(8);assert.ok(w.history.some(h=>h.source==='projectile'));w.dispose();
});
test('damage reduces grip before physical fracture and fragments can fracture again',()=>{
 const w=new SiegeWorld(),e=w.block(0,'wood',1300,500,120,30);w.hurt(e,e.maxHealth*.6,'test');assert.ok(e.weakened);assert.ok(e.body.friction<.7);w.hurt(e,1000,'test');w.step(7);const f=[...w.entities.values()].find(t=>t.fragment);assert.ok(f);w.hurt(f,1000,'test');w.step(7);assert.ok([...w.entities.values()].some(t=>t.generation===2));w.dispose();
});
test('soldiers can move onto ground and platforms, with no midair or enemy placement',()=>{
 const m=new Match(),s=m.world.troops[0][0];assert.ok(m.moveSoldier(s,1400,796));assert.equal(m.moveSoldier(s,1400,500),false);const floor=m.world.block(0,'wood',1320,750,100,20);assert.ok(m.moveSoldier(s,1320,726));assert.ok(s.body.position.y<750);assert.equal(m.moveSoldier(m.world.troops[1][0],1300,796),false);m.dispose();
});
test('repair allows exactly one valid soldier move, while cancellation consumes nothing',()=>{
 const m=new Match();m.phase='repair';const e=m.world.troops[0][0];assert.equal(m.moveSoldier(e,1400,400),false);assert.equal(m.soldierMoves[0],1);assert.ok(m.moveSoldier(e,1400,796));assert.equal(m.moveSoldier(e,1320,796),false);assert.equal(m.soldierMoves[0],0);m.dispose();
});
test('clearance removes only safe settled fragments and has a per-repair quota',()=>{
 const m=new Match();m.phase='repair';for(let i=0;i<4;i++){const e=m.world.block(0,'wood',1300+i*30,804,20,12,0,'rect',{fragment:true});Matter.Sleeping.set(e.body,true);assert.equal(m.clear(e),i<3);}assert.equal(m.clearance[0],0);m.dispose();
});
test('cleanup preserves dangerous compression loads and intact fallen blocks',()=>{
 const w=new SiegeWorld();const intact=w.block(0,'wood',1300,795,40,30),s=w.troops[0][0],load=w.block(0,'stone',s.body.position.x,s.body.position.y-20,40,12,0,'rect',{fragment:true});
 Matter.Sleeping.set(load.body,true);load.born=-20000;w.cleanDebris();assert.ok(w.entities.has(load.body.id));assert.ok(w.entities.has(intact.body.id));assert.equal(w.clearable(load,0),false);w.dispose();
});
test('small old settled fragments clear without erasing structural wreckage',()=>{
 const w=new SiegeWorld(),chip=w.block(0,'wood',1400,804,20,12,0,'rect',{fragment:true});chip.born=-20000;Matter.Sleeping.set(chip.body,true);w.cleanDebris();assert.ok(!w.entities.has(chip.body.id));assert.equal(w.cleanupCount,1);w.dispose();
});
test('camera conversions round trip and anchored zoom preserves the pointed location',()=>{
 const camera={x:3800,y:600,width:1300},vp={width:390,height:440},p={x:3980,y:750};assert.deepEqual(screenToWorld(worldToScreen(p,vp,camera),vp,camera),p);const anchor={x:110,y:160},before=screenToWorld(anchor,vp,camera);zoomCamera(camera,.6,anchor,vp);const after=screenToWorld(anchor,vp,camera);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1e-8);
});
test('camera has separate construction, launch, flight and impact frames',()=>{
 const m=new Match();assert.equal(phaseFrame(m,'follow').x,m.world.sides[0].center);m.ready();m.ready();assert.ok(phaseFrame(m,'follow').x<m.world.sides[0].center);m.fire(m.cpuAim());assert.ok(Math.abs(phaseFrame(m,'follow').x-m.world.shot.entity.body.position.x)<=150);m.world.shot.entity.hitAt=1;Matter.Body.setPosition(m.world.shot.entity.body,{x:3800,y:750});assert.ok(phaseFrame(m,'follow').width>600);m.dispose();
});
test('heavy stacked rubble transmits crushing through a light intervening fragment',()=>{
 const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);w.armed=true;
 const soldier=w.soldier(0,2000,795);w.block(0,'wood',2000,776,40,12,0,'rect',{fragment:true});w.block(0,'stone',2000,759,80,20,0,'rect',{fragment:true});w.step(300);
 assert.ok(!w.entities.has(soldier.body.id));assert.ok(w.history.some(e=>e.source==='compression'));w.dispose();
});
test('intervening structural cover attenuates a Burst blast',()=>{
 function blast(shield){const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);const s=w.soldier(1,2070,780);if(shield)w.block(1,'wood',2035,740,20,90);w.launch(0,{x:1,y:-1},'bomb');const b=w.shot.entity;Matter.Body.setPosition(b.body,{x:2000,y:700});w.explode(b);const damage=s.maxHealth-s.health;w.dispose();return damage;}
 assert.ok(blast(false)>blast(true)*3);
});
test('ranging adjusts unreachable steep/flat angles and respects special-ammunition speed',async()=>{
 const {rangedShot,BALLISTICS,AMMO}=await import('../src/rules.js');
 for(const scale of ['skirmish','siege','grand'])for(const ammo of ['bolt','heavy','bomb'])for(const angle of [15,78]){
  const map=battlefield(scale),s=map.sides[0],solution=rangedShot({x:s.launcher[0],y:s.launcher[1]-20},{x:map.sides[1].center,y:740},angle,ammo);
  assert.ok(solution.reachable);assert.ok(solution.power<=100.001);assert.ok(Math.hypot(solution.velocity.x,solution.velocity.y)<=BALLISTICS.maxSpeed*AMMO[ammo].scale+.001);if(angle===78)assert.notEqual(solution.angle,angle);
 }
});
test('withdrawing a support wakes a connected tower above the old local wake radius',()=>{
 const w=new SiegeWorld();for(const e of [...w.entities.values()])w.remove(e);const base=w.block(0,'wood',2000,775,60,70);let top;
 for(let i=0;i<10;i++)top=w.block(0,'wood',2000,730-i*20,52,20);w.step(300);const y=top.body.position.y;assert.ok(top.body.isSleeping);w.remove(base);assert.equal(top.body.isSleeping,false);w.step(100);assert.ok(top.body.position.y>y+25);w.dispose();
});
test('Grand Siege CPU falls back to a reachable bolt instead of stalling on heavy ammo',()=>{
 const m=new Match({mode:'cpu',scale:'grand'});m.ready();m.ready();m.active=1;m.rng=()=>0;for(const e of m.world.troops[0].slice(1))m.world.remove(e);m.ammo[1].bomb=0;
 for(let i=0;i<130&&m.phase==='aim';i++)m.tick(1/60);assert.equal(m.phase,'flight');assert.equal(m.lastShot.side,1);assert.equal(m.lastShot.ammo,'bolt');m.dispose();
});
