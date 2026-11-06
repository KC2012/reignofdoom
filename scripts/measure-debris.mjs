import{SiegeWorld}from'../src/simulation.js';import{performance}from'node:perf_hooks';import{writeFileSync,mkdirSync}from'node:fs';
const w=new SiegeWorld(2026,'valley','grand');w.armed=true;
for(let row=0;row<9;row++)for(let col=0;col<16;col++)w.block(col<8?0:1,row%3===0?'stone':'wood',1800+col*38,650-row*35,36,32,0,'rect',col%3===0?{fragment:true,generation:1,maxHealth:12}:{});
const samples=[];let peak=w.entities.size;
for(let i=0;i<900;i++){const t=performance.now();w.advance();samples.push(performance.now()-t);peak=Math.max(peak,w.entities.size);}
samples.sort((a,b)=>a-b);const report={fixture:'144 falling structural blocks plus live Grand Siege shelters, 900 fixed steps with two physics substeps',peakBodies:peak,finalBodies:w.entities.size,fragments:w.fragmentCount,cleanupCount:w.cleanupCount,p50StepMs:samples[Math.floor(samples.length*.5)],p95StepMs:samples[Math.floor(samples.length*.95)],p99StepMs:samples[Math.floor(samples.length*.99)],maxStepMs:samples.at(-1),survivors:w.troops.map(t=>t.length)};
mkdirSync('test-results/alpha2',{recursive:true});writeFileSync('test-results/alpha2/debris-performance.json',JSON.stringify(report,null,2));console.log(report);w.dispose();
