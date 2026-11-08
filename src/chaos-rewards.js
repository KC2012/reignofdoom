import { random, clamp } from './rules.js';
export const SPECIALS=['heavy','bomb','fire','vortex'];
export const CHAOS_TARGET=40,MAX_SPECIAL_STOCK=8,MAX_KIND_STOCK=3;
export function initialAmmo(){return {heavy:2,bomb:1,fire:1,vortex:1};}
/** Rewards use original enemy structures, never fragments or the player's own rubble. */
export class ChaosRewards {
 constructor(seed=1){this.meter=[0,0];this.earned=[0,0];this.ledger=[new Map(),new Map()];this.awardedRound=[0,0];this.last=null;
  const rng=random(seed^0x43a05);this.bag=SPECIALS.slice();for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
 }
 observe(world,side){return new Map([...world.entities.values()].filter(e=>e.side!==side&&!e.fragment&&(e.kind==='block'||e.kind==='soldier')).map(e=>[e.body.id,{entity:e,x:e.body.position.x,y:e.body.position.y,health:Math.max(0,e.health)}]));}
 give(stock,preferred){
  if(SPECIALS.reduce((sum,id)=>sum+stock[id],0)>=MAX_SPECIAL_STOCK)return null;
  const id=[preferred,...this.bag.filter(id=>id!==preferred)].find(id=>stock[id]<MAX_KIND_STOCK);if(!id)return null;stock[id]++;return id;
 }
 supply(stocks,round){const preferred=this.bag[(round-2)%this.bag.length];return stocks.map(stock=>this.give(stock,preferred));}
 settle(world,side,round,stock,before){
  let total=0;const ledger=this.ledger[side];
  for(const [id,b]of before??[]){const e=b.entity,alive=world.entities.has(id),old=ledger.get(id)??0;
   const displacement=Math.hypot(e.body.position.x-b.x,e.body.position.y-b.y),loss=clamp((b.health-(alive?Math.max(0,e.health):0))/e.maxHealth,0,1);
   const previous=typeof old==='object'?old:{damage:0,movement:0,broken:0,soldier:0};
   const next=e.kind==='soldier'?{...previous,soldier:Math.max(previous.soldier,!alive?10:0)}:{damage:Math.min(6,previous.damage+loss*6),movement:Math.max(previous.movement,displacement>100?12:displacement>35?7:0),broken:Math.max(previous.broken,!alive?6:0),soldier:0};
   const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);total+=Math.min(16,sum(next))-Math.min(16,sum(previous));ledger.set(id,next);
  }
  // One reward per bombardment, bounded progress, and slower gains while ahead.
  const counts=world.troops.map(t=>t.length),factor=counts[side]>counts[1-side]? .65 :counts[side]<counts[1-side]?1.15:1;
  const points=Math.round(Math.min(28,total)*factor);this.meter[side]=Math.min(CHAOS_TARGET,this.meter[side]+points);
  let award=null;
  if(this.meter[side]>=CHAOS_TARGET&&this.awardedRound[side]!==round){award=this.give(stock,this.bag[this.earned[side]%this.bag.length]);if(award){this.meter[side]-=CHAOS_TARGET;this.earned[side]++;this.awardedRound[side]=round;}}
  this.last={side,points,award,meter:this.meter[side],round};return this.last;
 }
 snapshot(){return {meter:this.meter.slice(),earned:this.earned.slice(),last:this.last?{...this.last}:null,target:CHAOS_TARGET};}
}
