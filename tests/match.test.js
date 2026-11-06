import test from 'node:test';import assert from 'node:assert/strict';import {Match} from '../src/match.js';
const aim=options=>{const m=new Match({mode:'hotseat',...options});m.ready();m.ready();return m;};
const finishFlight=m=>{let steps=0;while(m.phase==='flight'&&steps++<900)m.tick(1/60);assert.notEqual(m.phase,'flight');};
test('two builders hand off to firing; pause freezes timers and physics',()=>{
 const m=new Match();assert.equal(m.phase,'build');m.ready();assert.equal(m.active,1);m.ready();assert.equal(m.phase,'aim');
 m.paused=true;const before=m.snapshot(),time=m.world.time;for(let i=0;i<50;i++)m.tick(1/60);assert.deepEqual(m.snapshot(),before);assert.equal(m.world.time,time);m.dispose();
});
test('inventory is consumed only after valid placement',()=>{const m=new Match();assert.equal(m.place('brick',470,790),false);assert.equal(m.inventories[0].brick,4);assert.ok(m.place('brick',615,795));assert.equal(m.inventories[0].brick,3);m.dispose();});
test('turn ownership, direction and special ammo stock are enforced',()=>{
 const m=aim();assert.equal(m.fire({x:-10,y:-10}),false);assert.equal(m.fire({x:50,y:-10}),false);assert.equal(m.fire({x:10,y:-10},'unknown'),false);
 assert.ok(m.fire({x:5,y:-18},'heavy'));assert.equal(m.ammo[0].heavy,1);assert.equal(m.fire({x:5,y:-18}),false);finishFlight(m);assert.equal(m.active,1);assert.equal(m.volley,1);m.dispose();
});
test('two missed shots lead to short repairs, supply and alternate opening side',()=>{
 const m=aim();for(let i=0;i<2;i++){assert.ok(m.fire({x:(m.active? -1:1)*3.5,y:-20}));finishFlight(m);}
 assert.equal(m.phase,'repair');assert.equal(m.round,2);assert.equal(m.timer,15);assert.equal(m.active,0);
 assert.equal(Object.values(m.inventories[0]).reduce((a,b)=>a+b),5);m.ready();m.ready();assert.equal(m.phase,'aim');assert.equal(m.active,1);m.dispose();
});
test('victory resolves after physical consequences and can be rematched cleanly',()=>{
 const m=aim();for(const e of [...m.world.troops[1]])m.world.hurt(e,100,'test');assert.ok(m.fire({x:4,y:-20}));finishFlight(m);
 assert.equal(m.phase,'over');assert.equal(m.result.winner,0);m.dispose();const fresh=new Match();assert.deepEqual(fresh.counts(),[3,3]);assert.equal(fresh.world.entities.size,20);fresh.dispose();
});
test('CPU constructs legally with finite stock and fires without user help',()=>{
 const m=new Match({mode:'cpu',seed:1042});m.ready();let i=0;while(m.phase==='build'&&i++<800)m.tick(1/60);
 assert.equal(m.phase,'aim');assert.equal(m.active,0);assert.ok([...m.world.entities.values()].filter(e=>e.side===1&&e.kind==='block').length>6);
 assert.ok(Object.values(m.inventories[1]).every(n=>n>=0));m.fire({x:4,y:-20});finishFlight(m);
 for(i=0;i<150&&m.phase==='aim';i++)m.tick(1/60);assert.equal(m.phase,'flight');assert.equal(m.lastShot.side,1);m.dispose();
});
test('same seeded CPU duel has repeatable outcome and terminates with bounded bodies',()=>{
 function duel(){const m=aim({seed:71,difficulty:'normal'});let max=0,shots=0;
  for(let i=0;i<30000&&m.phase!=='over';i++){
   if(m.building){for(let j=0;j<5;j++)m.cpuBuild();m.ready();}
   if(m.phase==='aim'){m.fire(m.cpuAim(),m.ammo[m.active].heavy?'heavy':'bolt');shots++;}
   m.tick(1/60);max=Math.max(max,m.world.entities.size);
  }assert.equal(m.phase,'over');assert.ok(max<200);const result={counts:m.counts(),result:m.result,shots};m.dispose();return result;}
 assert.deepEqual(duel(),duel());
});
test('low-power high-angle shots allowed by the controls still launch',()=>{const m=aim();const angle=78*Math.PI/180,speed=24.975*.35;assert.ok(m.fire({x:Math.cos(angle)*speed,y:-Math.sin(angle)*speed}));m.dispose();});
test('a last soldier dying from compression cannot leave an empty side in aiming',()=>{
 const m=aim();for(const e of [...m.world.troops[1]])m.world.hurt(e,100,'compression');m.tick(1/60);assert.equal(m.phase,'over');assert.equal(m.result.winner,0);m.dispose();
});
