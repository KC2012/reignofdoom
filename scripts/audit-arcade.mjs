import{Match}from'../src/match.js';import{writeFileSync,mkdirSync}from'node:fs';
const results=[];
for(const scale of ['skirmish','siege','grand'])for(const seed of [17,71,1042]){
 const m=new Match({mode:'hotseat',scale,seed});let shots=0,flightSeconds=0,impactSeconds=0,shotWall=0,peak=0;
 for(let i=0;i<180000&&m.phase!=='over';i++){
  if(m.building){for(let n=0;n<30;n++){if(!m.cpuBuild())break;m.world.step(12);}m.ready();}
  if(m.phase==='aim'){let kind=m.ammo[m.active].heavy&&shots%3===1?'heavy':'bolt';let v=m.cpuAim(kind);if(!m.lastAimReachable){kind='bolt';v=m.cpuAim(kind);}if(m.fire(v,kind)){shots++;shotWall=0;impactSeconds=0;}}
  const flying=m.phase==='flight';if(flying){const hit=m.world.shot.entity.hitAt||m.world.shot.entity.exploded,speed=hit?(impactSeconds<.9?1:1.4):2.4;const wall=1/60/speed;shotWall+=wall;flightSeconds+=wall;if(hit)impactSeconds+=wall;}
  m.tick(1/60);if(flying&&m.phase!=='flight'&&impactSeconds>0&&impactSeconds<.95)flightSeconds+=.95-impactSeconds;peak=Math.max(peak,m.world.entities.size);
 }
 if(m.phase!=='over')throw new Error(`Stalled ${scale}/${seed}`);
 // Explicit Ready-time assumptions, not observed human duration.
 const repairs=Math.min(m.round-1,m.world.layout.scale.limit-1),assumedReady=40+repairs*16;
 results.push({scale,seed,shots,bombardments:Math.min(m.round,m.world.layout.scale.limit),winner:m.result.winner,survivors:m.counts(),peakBodies:peak,estimatedCombatPlaybackSeconds:flightSeconds,assumedInitialBuildSecondsPerPlayer:20,assumedRepairSecondsPerPlayer:8,estimatedTotalWithThoseReadyTimes:flightSeconds+assumedReady});m.dispose();
}
mkdirSync('test-results/alpha21',{recursive:true});writeFileSync('test-results/alpha21/pacing-audit.json',JSON.stringify({description:'Natural fixed-step machine matches. Presentation time estimated from 2.4x travel, 1x initial impact, 1.4x later impact, and minimum .95s impact hold. Initial build/repair times are stated assumptions, not human measurement.',results},null,2));console.log(results.map(r=>({scale:r.scale,seed:r.seed,shots:r.shots,phases:r.bombardments,estimatedSeconds:Math.round(r.estimatedTotalWithThoseReadyTimes)})));
