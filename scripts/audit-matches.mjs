import {Match} from '../src/match.js';
import {performance} from 'node:perf_hooks';
import {writeFileSync,mkdirSync} from 'node:fs';
const quick=process.argv.includes('--quick'),results=[];
const terrains=quick?['valley']:['valley','ridge','steps','ravine','highlands'];
const difficulties=quick?['normal']:['easy','normal','hard'];
const seeds=quick?[17,71,1042]:[17,71,1042];
for(const scale of (process.argv.includes('--scales')?['skirmish','grand']:['siege']))for(const terrain of terrains)for(const difficulty of difficulties)for(const seed of seeds){
 const m=new Match({mode:'hotseat',seed,terrain,difficulty,scale}),times=[];let shots=0,peakBodies=0,firstLosses=0;
 const start=performance.now();
 for(let i=0;i<85000&&m.phase!=='over';i++){
  if(m.building){for(let j=0;j<30;j++){if(!m.cpuBuild())break;m.world.step(12);}m.ready();}
  if(m.phase==='aim'){const a=m.ammo[m.active];let kind=shots%3===1&&a.heavy?'heavy':shots%5===3&&a.bomb?'bomb':'bolt';let velocity=m.cpuAim(kind);if(!m.lastAimReachable){kind='bolt';velocity=m.cpuAim(kind);}if(m.fire(velocity,kind))shots++;}
  const t=performance.now();m.tick(1/60);times.push(performance.now()-t);peakBodies=Math.max(peakBodies,m.world.entities.size);
  if(shots===1)firstLosses=Math.max(firstLosses,3-Math.min(...m.counts()));
 }
 if(m.phase!=='over')throw new Error(`Stalled ${terrain}/${seed}/${difficulty}`);
 times.sort((a,b)=>a-b);
 const deaths=m.world.deaths.reduce((r,e)=>(r[e.source]=(r[e.source]??0)+1,r),{});
 const row={scale,terrain,difficulty,seed,shots,phases:Math.min(m.round,m.world.layout.scale.limit),survivors:m.counts(),winner:m.result.winner,beforeRepair:m.round===1,firstShotCatastrophe:firstLosses===3,deaths,peakBodies,p95StepMs:times[Math.floor(times.length*.95)],maxStepMs:times.at(-1),wallMs:performance.now()-start};results.push(row);console.log(JSON.stringify(row));m.dispose();
}
const total=results.length,summary={matches:total,averageShots:results.reduce((s,r)=>s+r.shots,0)/total,averagePhases:results.reduce((s,r)=>s+r.phases,0)/total,beforeFirstRepair:results.filter(r=>r.beforeRepair).length,firstShotCatastrophes:results.filter(r=>r.firstShotCatastrophe).length,peakBodies:Math.max(...results.map(r=>r.peakBodies)),deaths:results.reduce((all,r)=>{for(const[k,v]of Object.entries(r.deaths))all[k]=(all[k]??0)+v;return all;},{})};
mkdirSync('test-results/alpha2',{recursive:true});writeFileSync(process.argv.includes('--scales')?'test-results/alpha2/scale-audit.json':'test-results/alpha2/match-audit.json',JSON.stringify({summary,results},null,2));console.log('SUMMARY',summary);
