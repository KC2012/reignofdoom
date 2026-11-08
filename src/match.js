import { ChaosRewards, initialAmmo, SPECIALS } from './chaos-rewards.js';
import { repairQueue } from './chaos.js';
import { SiegeWorld } from './simulation.js';
import { PIECES, SIDES, WORLD, AMMO, initialInventory, resultFor, random, clamp, solveShot, rangedShot, BALLISTICS } from './rules.js';
export class Match {
  constructor({mode='cpu',difficulty='normal',seed=1,terrain='valley',lab=false,scale='siege'}={}) {
    this.options={mode,difficulty,seed,terrain,lab,scale};this.rng=random(seed);this.world=new SiegeWorld(seed,terrain,scale);
    this.mode=mode;this.difficulty=difficulty;this.phase='build';this.active=0;this.round=1;this.volley=0;this.timer=this.world.layout.scale.build;
    this.inventories=[initialInventory(this.world.layout.scale.stock),initialInventory(this.world.layout.scale.stock)];this.ammo=[initialAmmo(),initialAmmo()];this.rewards=new ChaosRewards(seed);this.shotBefore=null;this.lastReward=null;this.manipulating=false;
    this.clearance=[3,3];this.soldierMoves=[1,1];this.queues=[[],[]];this.queueIndex=[0,0];this.discards=[0,0];this.launchOffsets=[0,0];this.result=null;this.paused=false;this.cpuClock=0;this.cpuPlacements=0;this.revision=0;
    this.message='Build around your three soldiers. Protect the supports.';this.lastShot=null;
  }
  isCPU(){return this.mode==='cpu'&&this.active===1;}
  get building(){return this.phase==='build'||this.phase==='repair';}
  counts(){return this.world.troops.map(t=>t.length);}
  place(id,x,y,angle=0) {
    if(!this.building||(this.phase==='repair'&&id!==this.currentRepair())||!(this.inventories[this.active][id]>0))return false;
    const e=this.world.place(this.active,id,x,y,angle);
    if(e){this.inventories[this.active][id]--;if(this.phase==='repair')this.advanceRepair();this.revision++;}return e;
  }
  currentRepair(){return this.queues[this.active][this.queueIndex[this.active]]??null;}
  beginRepairQueue(){
    const queue=repairQueue(this.rng);this.queues=[queue.slice(),queue.slice()];this.queueIndex=[0,0];this.discards=[0,0];
    this.inventories=[0,1].map(()=>Object.fromEntries(PIECES.map(p=>[p.id,0])));
    for(let side=0;side<2;side++)this.inventories[side][queue[0]]=1;
  }
  advanceRepair(){const side=this.active;for(const key of Object.keys(this.inventories[side]))this.inventories[side][key]=0;this.queueIndex[side]++;const next=this.currentRepair();if(next)this.inventories[side][next]=1;}
  discardRepair(){if(this.phase!=='repair'||!this.currentRepair())return false;this.timer=Math.max(0,this.timer-2);this.discards[this.active]++;this.advanceRepair();this.revision++;return true;}
  ready() {
    if(!this.building)return false;
    this.world.step(30);
    if(this.active===0){this.active=1;this.timer=this.phase==='build'?this.world.layout.scale.build:this.world.layout.scale.repair;this.cpuClock=0;this.cpuPlacements=0;}
    else {this.phase='aim';this.active=(this.round-1)%2;this.volley=0;this.timer=35;this.cpuClock=0;this.world.armed=true;this.message='Drag back from the ballista, then release. Hit the supports.';}
    this.revision++;return true;
  }
  fire(velocity,ammo='bolt') {
    if(this.phase!=='aim'||!AMMO[ammo])return false;
    const dir=this.world.sides[this.active].direction;
    if(velocity.x*dir<.5||velocity.y> -2||(!Number.isFinite(velocity.x)||!Number.isFinite(velocity.y)||Math.hypot(velocity.x,velocity.y)>BALLISTICS.maxSpeed*AMMO[ammo].scale+.01))return false;
    if(ammo!=='bolt'&&!(this.ammo[this.active][ammo]>0))return false;
    if(!this.world.launch(this.active,velocity,ammo,this.launchOffsets[this.active]))return false;
    if(ammo!=='bolt')this.ammo[this.active][ammo]--;
    this.shotBefore=this.rewards.observe(this.world,this.active);
    this.lastShot={side:this.active,velocity:{...velocity},ammo};this.phase='flight';this.timer=0;this.revision++;return true;
  }
  resolve() {
    if(this.phase!=='flight')return;
    this.lastReward=this.rewards.settle(this.world,this.active,this.round,this.ammo[this.active],this.shotBefore);this.shotBefore=null;
    this.world.finishShot();this.result=resultFor(this.counts(),this.round,this.world.layout.scale.limit);
    if(this.result){this.phase='over';this.revision++;return;}
    this.volley++;
    if(this.volley>=6) {
      this.round++;this.result=resultFor(this.counts(),this.round,this.world.layout.scale.limit);
      if(this.result){this.phase='over';this.revision++;return;}
      this.phase='repair';this.active=0;this.timer=this.world.layout.scale.repair;
      this.beginRepairQueue();this.clearance=[3,3];this.soldierMoves=[1,1];
      this.lastSupply=this.rewards.supply(this.ammo,this.round);
      this.message='Place the current piece or skip for two seconds. Watch what comes next.';
    } else {this.active=1-this.active;this.phase='aim';this.timer=35;}
    this.cpuClock=0;this.revision++;
  }
  cpuAim(ammo='bolt') {
    const enemy=1-this.active,world=this.world,targets=world.troops[enemy];
    const assessed=targets.map(t=>{
      const roofs=[...world.entities.values()].filter(e=>e.side===enemy&&e.kind==='block'&&!e.fragment&&!e.cracked&&e.body.position.y<t.body.position.y-25&&Math.abs(e.body.position.x-t.body.position.x)<65);
      roofs.sort((a,b)=>a.health-b.health);
      return {soldier:t,roof:roofs[0],score:roofs.length?roofs[0].health:0};
    }).sort((a,b)=>a.score-b.score);
    const chosen=assessed[0];
    let target=chosen?{...(chosen.roof??chosen.soldier).body.position}:{x:world.sides[enemy].center,y:780};
    if(ammo==='fire'){const timber=[...world.entities.values()].filter(e=>e.side===enemy&&e.kind==='block'&&e.material==='wood'&&!e.fragment&&!e.burnt);if(timber.length)target={...timber.sort((a,b)=>a.health-b.health)[0].body.position};}
    if(ammo==='vortex'){const upper=[...world.entities.values()].filter(e=>e.side===enemy&&e.kind==='block'&&!e.fragment&&e.body.position.y<world.foundation(enemy)-110);if(upper.length)target={...upper[Math.floor(this.rng()*upper.length)].body.position};}
    if(ammo==='bolt'&&this.rng()<.6){const support=[...world.entities.values()].find(e=>e.side===enemy&&e.kind==='block'&&!e.fragment&&e.h>e.w*1.6&&Math.abs(e.body.position.x-target.x)<100);if(support)target={x:support.body.position.x,y:support.body.position.y+support.h*.15};}
    const opportunity=[...world.entities.values()].find(e=>e.side===enemy&&(e.reactive==='volatile'||e.reactive==='fuse'));if(opportunity&&this.rng()<.35)target={...opportunity.body.position};
    const error=this.difficulty==='easy'?65:this.difficulty==='hard'?10:28;
    target.x+=(this.rng()-.5)*error*2;
    const s=world.sides[this.active],origin={x:s.launcher[0]+this.launchOffsets[this.active],y:s.launcher[1]-20};
    const solution=rangedShot(origin,target,43+this.rng()*12,ammo);this.lastAimReachable=solution.reachable;return solution.velocity;
  }
  moveSoldier(e,x,y){
    if(!this.building||e.kind!=='soldier'||e.side!==this.active||!this.world.entities.has(e.body.id))return false;
    if(this.phase==='repair'&&this.soldierMoves[this.active]<=0)return false;
    if(!this.world.moveSoldier(e,x,y))return false;
    if(this.phase==='repair')this.soldierMoves[this.active]--;this.revision++;return true;
  }
  clear(e){
    if(this.phase!=='repair'||this.clearance[this.active]<=0||!this.world.clearable(e,this.active))return false;
    this.world.remove(e);this.clearance[this.active]--;this.revision++;return true;
  }
  cpuBuild() {
    const side=this.active,c=this.world.sides[side].center,inv=this.inventories[side];
    if(this.phase==='build') {
      this.elevated??={};
      if(!this.elevated[side]){const floor=[...this.world.entities.values()].find(e=>e.side===side&&e.assembly&&e.w>100&&Math.abs(e.body.angle)<.1&&e.body.position.y<this.world.foundation(side)-140);if(floor){const soldier=this.world.troops[side][0];if(soldier&&this.moveSoldier(soldier,floor.body.position.x,floor.body.bounds.min.y-14)){this.elevated[side]=true;return true;}}}
      this.plans??={};
      if(!this.plans[side]) {
        const front=side===0?1:-1,fx=c+front*(250+Math.floor(this.rng()*25)),bx=c-front*260,g=this.world.foundation(side);
        this.plans[side]=[
          {id:'frame',x:c-front*150,y:g-240},
          {id:'platform',x:c+front*150,y:g-220},
          ...[0,1,2].map(i=>({id:'stone',x:fx,y:g-18-i*37})),
          {id:'steel',x:fx,y:g-3*37-9},
          {id:'beam',x:c+front*360,y:g-76,angle:Math.PI/2},
          ...[0,1,2,3].map(i=>({id:'brick',x:bx,y:g-15-i*31})),
          {id:'beam',x:bx,y:g-4*31-11},
          {id:'wedge',x:fx,y:g-3*37-40},
          {id:'wedge',x:bx,y:g-4*31-42},
          {id:'stone',x:fx+front*100,y:g-18},{id:'stone',x:fx+front*100,y:g-55},
          {id:'steel',x:fx+front*100,y:g-83},
          {id:'pillar',x:c-front*340,y:g-43},{id:'pillar',x:c-front*400,y:g-43},
          {id:'beam',x:c-front*370,y:g-98},
          {id:'brick',x:fx+front*100,y:g-110},{id:'brick',x:fx+front*100,y:g-141},
        ];
      }
      while(this.plans[side].length) {
        const p=this.plans[side].shift();
        if(inv[p.id]>0&&this.place(p.id,p.x,p.y,p.angle??0))return true;
      }
      return false;
    }
    if(this.phase==='repair'){
      const id=this.currentRepair();if(!id)return false;const p=PIECES.find(p=>p.id===id),g=this.world.foundation(side);
      const xs=id==='volatile'?[c+this.world.sides[side].direction*260,c-this.world.sides[side].direction*260]:[c-230,c+230,c,c-100,c+100];
      for(const angle of [0,Math.PI/2])for(const x of xs)for(let y=g-p.h/2;y>g-300;y-=20){const check=this.world.placement(side,p,x,y,angle);if(!check.valid||(id==='volatile'&&this.world.troops[side].some(t=>Math.hypot(t.body.position.x-check.x,t.body.position.y-check.y)<100)))continue;const bottom=Math.max(...check.vertices.flat().map(v=>v.y));const supported=bottom>g-5||[...this.world.entities.values()].some(e=>e.kind==='block'&&Math.abs(e.body.bounds.min.y-bottom)<14&&e.body.bounds.max.x>x-p.w/3&&e.body.bounds.min.x<x+p.w/3);if(supported&&this.place(id,x,y,angle))return true;}
      this.discardRepair();return !!this.currentRepair();
    }
    return false;
  }
  cpuAmmo(){const available=SPECIALS.filter(id=>this.ammo[this.active][id]>0),choices=['bolt','bolt',...available];return choices[Math.floor(this.rng()*choices.length)];}
  tick(dt) {
    if(this.paused||this.phase==='over')return;
    if(!(this.building&&this.manipulating))this.world.advance();
    if(this.phase==='flight') {if(this.world.shotFinished())this.resolve();return;}
    const outcome=this.world.armed?resultFor(this.counts(),this.round,this.world.layout.scale.limit):null;
    if(outcome){this.result=outcome;this.phase='over';this.revision++;return;}
    if(this.phase!=='aim'||this.isCPU())this.timer=Math.max(0,this.timer-dt);this.cpuClock+=dt;
    if(this.isCPU()) {
      if(this.building&&this.cpuClock>.32) {
        this.cpuClock=0;
        if(!this.cpuBuild()||++this.cpuPlacements>= (this.phase==='build'?22:8))this.ready();
      } else if(this.phase==='aim'&&this.cpuClock>1.6) {
        const ammo=this.cpuAmmo();
        const velocity=this.cpuAim(ammo);if(!this.lastAimReachable||!this.fire(velocity,ammo))this.fire(this.cpuAim('bolt'),'bolt');
      }
    }
    if(this.timer<=0) {
      if(this.building)this.ready();
      else if(this.phase==='aim')this.fire(this.cpuAim(),'bolt');
    }
  }
  dispose(){this.world.dispose();}
  snapshot(){return {phase:this.phase,active:this.active,round:this.round,volley:this.volley,timer:this.timer,counts:this.counts(),result:this.result,bodies:this.world.entities.size,ammo:structuredClone(this.ammo),inventory:{...this.inventories[this.active]},repairQueue:this.queues[this.active].slice(this.queueIndex[this.active]),discards:this.discards[this.active],chaos:this.rewards.snapshot(),lastSupply:this.lastSupply??null,history:this.world.history.slice(-20),scale:this.options.scale,clearance:this.clearance[this.active],soldierMoves:this.soldierMoves[this.active]};}
}
