import test from'node:test';import assert from'node:assert/strict';import Matter from'matter-js';import{SiegeWorld}from'../src/simulation.js';import{Match}from'../src/match.js';import{ChaosRewards,initialAmmo,SPECIALS}from'../src/chaos-rewards.js';
const empty=()=>{const w=new SiegeWorld(17,'valley','skirmish');for(const e of [...w.entities.values()])w.remove(e);w.armed=true;return w;};
const launch=(w,ammo,x=1920,y=750)=>{w.launch(0,{x:22,y:-3},ammo);Matter.Body.setPosition(w.shot.entity.body,{x,y});};
test('Fire is contact activated, burns timber over time and cannot ignite steel',()=>{
 const w=empty(),wood=w.block(1,'wood',2000,745,50,130),steel=w.block(1,'metal',2070,745,50,130);launch(w,'fire');w.step(18);assert.ok(wood.burnUntil>w.time);assert.ok(!steel.burnUntil);assert.ok(w.reactionHistory.some(r=>r.type==='fire-impact'));const hp=wood.health;w.step(90);assert.ok(wood.health<hp);assert.ok(w.history.some(h=>h.source==='fire'));assert.ok(!steel.burnUntil);w.dispose();
});
test('Fire spreads only between touching combustible pieces and expires',()=>{
 const w=empty(),a=w.block(1,'wood',2000,770,40,80),b=w.block(1,'wood',2042,770,40,80),far=w.block(1,'wood',2250,770,40,80);w.step(180);assert.ok(w.effects.ignite(a,0));w.step(70);assert.ok(b.burnUntil>w.time);assert.ok(!far.burnUntil);w.step(600);assert.equal(w.effects.busy,false);assert.equal(w.effects.ignite(a,0),false);w.dispose();
});
test('Burning powder creates an explosion with a recorded fire cause, not a timer trigger',()=>{
 const w=empty(),crate=w.block(1,'wood',2000,790,38,38,0,'rect',{reactive:'volatile',maxHealth:20});w.effects.ignite(crate,0);w.step(100);const explosion=w.reactionHistory.find(r=>r.type==='explosion');assert.ok(explosion);assert.equal(explosion.trigger.source,'fire');assert.ok(!w.entities.has(crate.body.id));w.dispose();
});
test('Vortex lifts and twists real bodies without applying explosion damage',()=>{
 const w=empty(),block=w.block(1,'wood',2000,780,60,60);w.step(120);const start={...block.body.position};launch(w,'vortex');w.step(45);assert.ok(w.reactionHistory.some(r=>r.type==='vortex'));assert.ok(block.body.position.y<start.y-8);assert.ok(Math.abs(block.body.angle)>.02);assert.equal(w.reactionHistory.some(r=>r.type==='explosion'),false);assert.equal(w.history.some(h=>h.source==='vortex'),false);w.step(180);assert.equal(w.effects.fields.length,0);w.dispose();
});
test('Persistent effects and pending chains keep a shot open until their consequences finish',()=>{
 const w=empty(),wood=w.block(1,'wood',2000,745,50,130);launch(w,'fire');w.step(30);w.shot.quiet=10000;assert.equal(w.shotFinished(),false);assert.ok(w.effects.busy);w.step(650);assert.equal(w.effects.busy,false);w.dispose();
});
test('A spring releases once after a real hard collision, never from a resting load',()=>{
 const w=empty(),spring=w.block(1,'metal',2000,801,80,18,0,'rect',{reactive:'spring',maxHealth:90,throwDirection:-1});Matter.Body.setStatic(spring.body,true);const load=w.block(1,'wood',2000,650,36,36);let fired=false;for(let n=0;n<150;n++){w.step();if(spring.spent){fired=true;assert.ok(load.body.velocity.y< -4);break;}}assert.ok(fired);w.step(600);assert.equal(w.reactionHistory.filter(r=>r.type==='spring-release').length,1);w.dispose();
});
test('Chaos ignores friendly material, terrain, fragments and repeated stationary damage',()=>{
 const w=empty(),own=w.block(0,'wood',1800,780,60,60),enemy=w.block(1,'wood',2000,780,60,60),chip=w.block(1,'wood',2100,780,30,30,0,'rect',{fragment:true});const rewards=new ChaosRewards(71),stock=initialAmmo();let before=rewards.observe(w,0);w.hurt(own,50,'test');w.hurt(chip,50,'test');assert.equal(rewards.settle(w,0,1,stock,before).points,0);before=rewards.observe(w,0);w.hurt(enemy,enemy.health/2,'projectile');assert.ok(rewards.settle(w,0,1,stock,before).points>0);const stored=rewards.meter[0];before=rewards.observe(w,0);assert.equal(rewards.settle(w,0,1,stock,before).points,0);assert.equal(rewards.meter[0],stored);w.dispose();
});
test('Chaos has per-target movement credit, bounded awards and an equal repair supply sequence',()=>{
 const w=empty(),rewards=new ChaosRewards(9),stock=initialAmmo(),enemy=w.block(1,'wood',2000,780,60,60);let before=rewards.observe(w,0);Matter.Body.translate(enemy.body,{x:120,y:0});const first=rewards.settle(w,0,1,stock,before).points;assert.ok(first>0);before=rewards.observe(w,0);Matter.Body.translate(enemy.body,{x:120,y:0});assert.equal(rewards.settle(w,0,1,stock,before).points,0);
 rewards.meter[0]=40;let outcome=rewards.settle(w,0,1,stock,new Map());assert.ok(outcome.award);assert.equal(rewards.earned[0],1);rewards.meter[0]=40;assert.equal(rewards.settle(w,0,1,stock,new Map()).award,null);const full=Object.fromEntries(SPECIALS.map(id=>[id,3]));assert.equal(rewards.give(full,'fire'),null);const a=initialAmmo(),b=initialAmmo();assert.deepEqual(rewards.supply([a,b],2),[rewards.bag[0],rewards.bag[0]]);assert.deepEqual(a,b);w.dispose();
});
test('All five ammunition types enforce stocks, pause safely and settle complete turns',()=>{
 for(const ammo of['bolt',...SPECIALS]){const m=new Match({mode:'hotseat',seed:71,scale:'skirmish'});m.ready();m.ready();const stock=m.ammo[0][ammo];assert.ok(m.fire(m.cpuAim(ammo),ammo));if(ammo!=='bolt')assert.equal(m.ammo[0][ammo],stock-1);m.paused=true;const before=m.world.time;m.tick(1);assert.equal(m.world.time,before);m.paused=false;for(let n=0;n<2400&&m.phase==='flight';n++)m.tick(1/60);assert.notEqual(m.phase,'flight',ammo+' must settle');m.dispose();}
});
test('Construction assistance holds physics only during manipulation, while the clock keeps running',()=>{
 const m=new Match({mode:'hotseat'}),t=m.timer,time=m.world.time;m.manipulating=true;m.tick(1/60);assert.equal(m.world.time,time);assert.ok(m.timer<t);m.manipulating=false;m.tick(1/60);assert.ok(m.world.time>time);m.dispose();
});
test('A light timber roof is survivable but a sustained heavy steel load still crushes',()=>{
 for(const material of['wood','metal']){const w=empty(),s=w.soldier(0,2000,795);w.block(0,material,2000,768,110,20);w.step(500);assert.equal(w.entities.has(s.body.id),material==='wood');w.dispose();}
});
test('A charged pad launches its resting load when a contacting projectile trips it',()=>{
 const w=empty(),pad=w.block(1,'metal',2000,801,80,18,0,'rect',{reactive:'spring',maxHealth:300});Matter.Body.setStatic(pad.body,true);const load=w.block(1,'wood',2000,773,36,36);w.step(100);assert.equal(pad.spent,undefined);launch(w,'heavy',1920,780);Matter.Body.setVelocity(w.shot.entity.body,{x:16,y:6});let fired=false;for(let n=0;n<60;n++){w.step();if(pad.spent){fired=true;assert.ok(load.body.velocity.y< -2);break;}}assert.ok(fired);w.dispose();
});
test('Blasts damage fixed mechanisms without assigning ghost velocity that stalls a turn',()=>{
 const w=empty(),anchor=w.block(1,'metal',2000,710,24,200,0,'rect',{reactive:'spring',fixed:true,maxHealth:1000});Matter.Body.setStatic(anchor.body,true);launch(w,'bomb',1970,700);w.explode(w.shot.entity);assert.equal(anchor.body.speed,0);assert.ok(anchor.health<anchor.maxHealth);w.step(180);assert.equal(w.shotFinished(),true);w.dispose();
});
test('Support failure releases a weight into powder, then a spring launches the physical wreckage',()=>{
 const w=empty(),{anchor}=w.hangingWeight(1,2000,810),pad=w.block(1,'metal',2000,801,80,18,0,'rect',{reactive:'spring',fixed:true,maxHealth:160,throwDirection:1});Matter.Body.setStatic(pad.body,true);w.block(1,'wood',2000,773,36,36,0,'rect',{reactive:'volatile',maxHealth:32});w.armed=false;w.step(180);w.armed=true;assert.equal(w.reactionHistory.length,0);
 w.hurt(anchor,100,'projectile-fixture');w.step(600);const types=w.reactionHistory.map(e=>e.type);assert.ok(types.includes('rope-release'));assert.ok(types.includes('explosion'));assert.ok(types.includes('spring-release'));assert.equal(w.reactionHistory.find(e=>e.type==='explosion').trigger.source,'heavy-impact');w.dispose();
});
test('Odd rubble counts cannot exceed the physical fragment budget and freed space is reusable',()=>{
 const w=empty();for(let i=0;i<159;i++)w.block(1,'wood',1200+i*4,700,3,3,0,'rect',{fragment:true});const intact=w.block(1,'wood',2200,700,80,40);w.fracture(intact);assert.equal(w.fragmentCount,159);assert.ok(w.entities.has(intact.body.id));w.remove([...w.entities.values()].find(e=>e.fragment));w.fracture(intact);assert.equal(w.fragmentCount,160);assert.ok(!w.entities.has(intact.body.id));w.dispose();
});
test('Vortex produces broad visible lift across separate loose timber pieces',()=>{
 const w=empty(),blocks=[1930,2000,2070].map(x=>w.block(1,'wood',x,790,50,40));w.step(120);const heights=blocks.map(e=>e.body.position.y);w.effects.fields.push({x:2000,y:780,radius:190,age:0,duration:1700,owner:0});w.step(60);assert.ok(blocks.every((e,i)=>e.body.position.y<heights[i]-30));assert.equal(w.reactionHistory.some(e=>e.type==='explosion'),false);w.dispose();
});
test('Every toy-lab rig remains stable until a player acts',async()=>{
 const {loadRig}=await import('../src/laboratory.js');for(const kind of['tower','bunker','chain']){const m=new Match({mode:'hotseat',scale:'skirmish',seed:1042});loadRig(m,kind);m.world.step(600);assert.deepEqual(m.counts(),[3,3]);assert.ok(m.world.troops.flat().every(t=>t.health===t.maxHealth));assert.equal(m.world.reactionHistory.length,0);m.dispose();}
});
