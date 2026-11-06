import {Match} from '../src/match.js';import {writeFileSync,mkdirSync} from 'node:fs';
const results=[];
for(const terrain of ['valley','ridge','steps'])for(const seed of [17,71,1042,2026]){
 const m=new Match({mode:'hotseat',seed,terrain,difficulty:'normal'});let buildTicks=0,shots=0,maxBodies=0,firstCounts;
 for(let i=0;i<60000&&m.phase!=='over';i++){
  if(m.building){if(++buildTicks%20===0){if(!m.cpuBuild()||Object.values(m.inventories[m.active]).every(n=>!n)){m.ready();buildTicks=0;}}}
  if(m.phase==='aim'){
   firstCounts??=m.counts();const stock=m.ammo[m.active];m.fire(m.cpuAim(),stock.heavy?'heavy':stock.bomb?'bomb':'bolt');shots++;
  }
  m.tick(1/60);maxBodies=Math.max(maxBodies,m.world.entities.size);
 }
 if(m.phase!=='over')throw new Error(`Match stalled ${terrain}/${seed}`);
 if(firstCounts.some(n=>n!==3))throw new Error('Starting fort killed soldiers');
 const row={terrain,seed,shots,rounds:m.round,survivors:m.counts(),result:m.result,peakBodies:maxBodies};results.push(row);console.log(JSON.stringify(row));m.dispose();
}
mkdirSync('test-results',{recursive:true});writeFileSync('test-results/match-audit.json',JSON.stringify({matches:results.length,results},null,2));
