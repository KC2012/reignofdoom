import { SiegeWorld } from './simulation.js';
import { PIECES, SIDES, WORLD, AMMO, initialInventory, repairInventory, resultFor, random, clamp } from './rules.js';
export class Match {
  constructor({mode='cpu',difficulty='normal',seed=1,terrain='valley',lab=false}={}) {
    this.options={mode,difficulty,seed,terrain,lab};this.rng=random(seed);this.world=new SiegeWorld(seed,terrain);
    this.mode=mode;this.difficulty=difficulty;this.phase='build';this.active=0;this.round=1;this.volley=0;this.timer=45;
    this.inventories=[initialInventory(),initialInventory()];this.ammo=[{heavy:2,bomb:2},{heavy:2,bomb:2}];
    this.launchOffsets=[0,0];this.result=null;this.paused=false;this.cpuClock=0;this.cpuPlacements=0;this.revision=0;
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
    if(this.active===0){this.active=1;this.timer=this.phase==='build'?45:15;this.cpuClock=0;this.cpuPlacements=0;}
    else {this.phase='aim';this.active=(this.round-1)%2;this.volley=0;this.timer=35;this.cpuClock=0;this.world.armed=true;this.message='Drag back from the ballista, then release. Hit the supports.';}
    this.revision++;return true;
  }
  fire(velocity,ammo='bolt') {
    if(this.phase!=='aim'||!AMMO[ammo])return false;
    const dir=SIDES[this.active].direction;
    if(velocity.x*dir<.5||velocity.y> -2||Math.hypot(velocity.x,velocity.y)>26)return false;
    if(ammo!=='bolt'&&this.ammo[this.active][ammo]<=0)return false;
    if(!this.world.launch(this.active,velocity,ammo,this.launchOffsets[this.active]))return false;
    if(ammo!=='bolt')this.ammo[this.active][ammo]--;
    this.lastShot={side:this.active,velocity:{...velocity},ammo};this.phase='flight';this.timer=0;this.revision++;return true;
  }
  resolve() {
    if(this.phase!=='flight')return;
    this.world.finishShot();this.result=resultFor(this.counts(),this.round);
    if(this.result){this.phase='over';this.revision++;return;}
    this.volley++;
    if(this.volley>=2) {
      this.round++;this.result=resultFor(this.counts(),this.round);
      if(this.result){this.phase='over';this.revision++;return;}
      this.phase='repair';this.active=0;this.timer=15;
      this.inventories=[repairInventory(this.rng),repairInventory(this.rng)];
      for(const a of this.ammo){const kind=this.round%2===0?'heavy':'bomb';a[kind]=Math.min(3,a[kind]+1);}
      this.message='Five fresh pieces. Patch a gap or catch falling debris.';
    } else {this.active=1-this.active;this.phase='aim';this.timer=35;}
    this.cpuClock=0;this.revision++;
  }
  cpuAim() {
    const enemy=1-this.active,targets=this.world.troops[enemy];
    const target=targets[Math.floor(this.rng()*targets.length)]?.body.position??{x:SIDES[enemy].center,y:790};
    const error=this.difficulty==='easy'?90:this.difficulty==='hard'?8:32;
    const tx=target.x+(this.rng()-.5)*error*2;
    const x=SIDES[this.active].launcher[0]+this.launchOffsets[this.active],y=SIDES[this.active].launcher[1]-20;
    const dx=Math.abs(tx-x),angle=(37+this.rng()*19)*Math.PI/180;
    const v=Math.sqrt(.8*.001*(1000/60)**2*dx*dx/(2*Math.cos(angle)**2*(dx*Math.tan(angle)+(target.y-y))));
    return {x:Math.cos(angle)*v*SIDES[this.active].direction,y:-Math.sin(angle)*v};
  }
  cpuBuild() {
    const side=this.active,c=SIDES[side].center,inv=this.inventories[side];
    if(this.phase==='build') {
      this.plans??={};
      if(!this.plans[side]) {
        const front=side===0?1:-1,fx=c+front*(143+Math.floor(this.rng()*5)),bx=c-front*145,g=WORLD.ground;
        this.plans[side]=[
          ...[0,1,2].map(i=>({id:'stone',x:fx,y:g-18-i*37})),
          {id:'steel',x:fx,y:g-3*37-9},
          {id:'beam',x:c+front*190,y:g-76,angle:Math.PI/2},
          ...[0,1,2,3].map(i=>({id:'brick',x:bx,y:g-15-i*31})),
          {id:'beam',x:bx,y:g-4*31-11},
          {id:'wedge',x:fx,y:g-3*37-40},
          {id:'wedge',x:bx,y:g-4*31-42},
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
    const choices=PIECES.filter(p=>inv[p.id]>0).sort(()=>this.rng()-.5);
    for(const p of choices) {
      const front=side===0?1:-1;
      const xs=[c+front*155,c-front*155,c+front*190,c-front*190];
      if(this.rng()<.5)xs.reverse();
      for(const x of xs) {
        for(let y=WORLD.ground-p.h/2;y>WORLD.ground-270;y-=p.h+2) {
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
    const outcome=this.world.armed?resultFor(this.counts(),this.round):null;
    if(outcome){this.result=outcome;this.phase='over';this.revision++;return;}
    this.timer=Math.max(0,this.timer-dt);this.cpuClock+=dt;
    if(this.isCPU()) {
      if(this.building&&this.cpuClock>.32) {
        this.cpuClock=0;
        if(!this.cpuBuild()||++this.cpuPlacements>= (this.phase==='build'?13:5))this.ready();
      } else if(this.phase==='aim'&&this.cpuClock>1.6) {
        const stock=this.ammo[this.active],r=this.rng();
        const ammo=stock.heavy>0&&r<.5?'heavy':stock.bomb>0&&r<.8?'bomb':'bolt';
        this.fire(this.cpuAim(),ammo);
      }
    }
    if(this.timer<=0) {
      if(this.building)this.ready();
      else if(this.phase==='aim')this.fire(this.cpuAim(),'bolt');
    }
  }
  dispose(){this.world.dispose();}
  snapshot(){return {phase:this.phase,active:this.active,round:this.round,volley:this.volley,timer:this.timer,counts:this.counts(),result:this.result,bodies:this.world.entities.size,ammo:structuredClone(this.ammo),inventory:{...this.inventories[this.active]},history:this.world.history.slice(-20)};}
}
