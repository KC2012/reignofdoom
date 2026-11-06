import { SiegeWorld } from './simulation.js';
import { PIECES, SIDES, WORLD, AMMO, initialInventory, repairInventory, resultFor, random, clamp, solveShot, rangedShot, BALLISTICS } from './rules.js';
export class Match {
  constructor({mode='cpu',difficulty='normal',seed=1,terrain='valley',lab=false,scale='siege'}={}) {
    this.options={mode,difficulty,seed,terrain,lab,scale};this.rng=random(seed);this.world=new SiegeWorld(seed,terrain,scale);
    this.mode=mode;this.difficulty=difficulty;this.phase='build';this.active=0;this.round=1;this.volley=0;this.timer=this.world.layout.scale.build;
    this.inventories=[initialInventory(this.world.layout.scale.stock),initialInventory(this.world.layout.scale.stock)];this.ammo=[{heavy:2,bomb:2},{heavy:2,bomb:2}];
    this.clearance=[3,3];this.soldierMoves=[1,1];this.launchOffsets=[0,0];this.result=null;this.paused=false;this.cpuClock=0;this.cpuPlacements=0;this.revision=0;
    this.message='Build around your three soldiers. Protect the supports.';this.lastShot=null;
  }
  isCPU(){return this.mode==='cpu'&&this.active===1;}
  get building(){return this.phase==='build'||this.phase==='repair';}
  counts(){return this.world.troops.map(t=>t.length);}
  place(id,x,y,angle=0) {
    if(!this.building||!(this.inventories[this.active][id]>0))return false;
    const e=this.world.place(this.active,id,x,y,angle);
    if(e){this.inventories[this.active][id]--;this.revision++;}return e;
  }
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
    if(ammo!=='bolt'&&this.ammo[this.active][ammo]<=0)return false;
    if(!this.world.launch(this.active,velocity,ammo,this.launchOffsets[this.active]))return false;
    if(ammo!=='bolt')this.ammo[this.active][ammo]--;
    this.lastShot={side:this.active,velocity:{...velocity},ammo};this.phase='flight';this.timer=0;this.revision++;return true;
  }
  resolve() {
    if(this.phase!=='flight')return;
    this.world.finishShot();this.result=resultFor(this.counts(),this.round,this.world.layout.scale.limit);
    if(this.result){this.phase='over';this.revision++;return;}
    this.volley++;
    if(this.volley>=6) {
      this.round++;this.result=resultFor(this.counts(),this.round,this.world.layout.scale.limit);
      if(this.result){this.phase='over';this.revision++;return;}
      this.phase='repair';this.active=0;this.timer=this.world.layout.scale.repair;
      this.inventories=[repairInventory(this.rng),repairInventory(this.rng)];this.clearance=[3,3];this.soldierMoves=[1,1];
      for(const a of this.ammo){const kind=this.round%2===0?'heavy':'bomb';a[kind]=Math.min(3,a[kind]+1);}
      this.message='Six fresh pieces. Patch a gap or catch falling debris.';
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
      this.plans??={};
      if(!this.plans[side]) {
        const front=side===0?1:-1,fx=c+front*(250+Math.floor(this.rng()*25)),bx=c-front*260,g=this.world.foundation(side);
        this.plans[side]=[
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
    // Repairs reinforce exposed flanks rather than stacking heavy loads over troops.
    // The same stock, bounds and overlap rules apply to CPU.
    for(const soldier of this.world.troops[side]){
      const x=soldier.body.position.x,roofY=soldier.body.position.y-55;
      const covered=[...this.world.entities.values()].some(e=>e.kind==='block'&&Math.abs(e.body.position.x-x)<65&&e.body.position.y<soldier.body.position.y&&e.body.position.y>soldier.body.position.y-130);
      if(!covered&&inv.pillar>0)for(const sign of [-1,1])if(this.place('pillar',x+sign*65,this.world.foundation(side)-43))return true;
      if(!covered&&inv.beam>0){const p=this.world.placement(side,'beam',x,roofY);const bottom=Math.max(...p.vertices.flat().map(v=>v.y));if(p.valid&&[...this.world.entities.values()].some(e=>e.kind==='block'&&Math.abs(e.body.bounds.min.y-bottom)<20&&Math.abs(e.body.position.x-x)<80)&&this.place('beam',x,p.y))return true;}
    }
    const choices=PIECES.filter(p=>inv[p.id]>0).sort(()=>this.rng()-.5);
    for(const p of choices) {
      const front=side===0?1:-1;
      const xs=[c+front*270,c-front*270,c+front*360,c-front*360];
      if(this.rng()<.5)xs.reverse();
      for(const x of xs) {
        for(let y=WORLD.ground-p.h/2;y>WORLD.ground-this.world.layout.buildHeight;y-=p.h+2) {
          const check=this.world.placement(side,p,x,y,0);
          if(!check.valid)continue;
          // Require ground or an actual nearby support, rather than dropping floating pieces.
          const bottom=Math.max(...check.vertices.flat().map(v=>v.y));
          const support=bottom>WORLD.ground-4||[...this.world.entities.values()].some(e=>e.kind==='block'&&Math.abs(e.body.bounds.min.y-bottom)<16&&e.body.bounds.max.x>check.x-p.w/2+5&&e.body.bounds.min.x<check.x+p.w/2-5);
          if(support&&this.place(p.id,check.x,check.y,0))return true;
        }
      }
    }
    return false;
  }
  tick(dt) {
    if(this.paused||this.phase==='over')return;
    this.world.advance();
    if(this.phase==='flight') {if(this.world.shotFinished())this.resolve();return;}
    const outcome=this.world.armed?resultFor(this.counts(),this.round,this.world.layout.scale.limit):null;
    if(outcome){this.result=outcome;this.phase='over';this.revision++;return;}
    this.timer=Math.max(0,this.timer-dt);this.cpuClock+=dt;
    if(this.isCPU()) {
      if(this.building&&this.cpuClock>.32) {
        this.cpuClock=0;
        if(!this.cpuBuild()||++this.cpuPlacements>= (this.phase==='build'?22:8))this.ready();
      } else if(this.phase==='aim'&&this.cpuClock>1.6) {
        const stock=this.ammo[this.active],r=this.rng();
        const ammo=stock.heavy>0&&r<.5?'heavy':stock.bomb>0&&r<.8?'bomb':'bolt';
        const velocity=this.cpuAim(ammo);if(!this.lastAimReachable||!this.fire(velocity,ammo))this.fire(this.cpuAim('bolt'),'bolt');
      }
    }
    if(this.timer<=0) {
      if(this.building)this.ready();
      else if(this.phase==='aim')this.fire(this.cpuAim(),'bolt');
    }
  }
  dispose(){this.world.dispose();}
  snapshot(){return {phase:this.phase,active:this.active,round:this.round,volley:this.volley,timer:this.timer,counts:this.counts(),result:this.result,bodies:this.world.entities.size,ammo:structuredClone(this.ammo),inventory:{...this.inventories[this.active]},history:this.world.history.slice(-20),scale:this.options.scale,clearance:this.clearance[this.active],soldierMoves:this.soldierMoves[this.active]};}
}
