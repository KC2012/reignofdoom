// Repeatable physics workload, not an iPad performance claim.
import{SiegeWorld}from'../src/simulation.js';import{performance}from'node:perf_hooks';import{mkdirSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';
const results=[];
for(const terrain of['valley','powder','hanging','scrap']){
 const w=new SiegeWorld(17,terrain,'skirmish');w.armed=true;const g=810;
 for(let i=0;i<60;i++){const e=w.block(i%2,'wood',720+(i%12)*26+(i%2?2000:0),g-110-Math.floor(i/12)*24,24,20);w.hurt(e,1000,'rubble-workload');}
 const combustible=[...w.entities.values()].find(e=>e.side===1&&e.material==='wood');if(combustible)w.effects.ignite(combustible,0);w.effects.fields.push({x:2900,y:720,radius:190,age:0,duration:1700,owner:0});
 const ms=[];let peak=w.entities.size;
 for(let frame=0;frame<900;frame++){const before=performance.now();w.advance();ms.push(performance.now()-before);peak=Math.max(peak,w.entities.size);for(const e of w.entities.values())assert.ok(Number.isFinite(e.body.position.x+e.body.position.y+e.body.angle));}
 ms.sort((a,b)=>a-b);results.push({terrain,simulatedSeconds:15,peakBodies:peak,finalBodies:w.entities.size,cleanupCount:w.cleanupCount,medianPhysicsStepMs:ms[Math.floor(ms.length*.5)],p95PhysicsStepMs:ms[Math.floor(ms.length*.95)],maxPhysicsStepMs:ms.at(-1)});assert.ok(peak<350);assert.ok(w.fragmentCount<=160);w.dispose();
}
mkdirSync('test-results/alpha3',{recursive:true});writeFileSync('test-results/alpha3/physics-workload.json',JSON.stringify({runtime:process.version,hardware:'Cloud CPU; no rendering, touch or iPad thermal/GPU measurement',results},null,2));console.log(results);
