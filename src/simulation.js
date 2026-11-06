import Matter from 'matter-js';
import { WORLD, SIDES, MATERIALS, PIECES, AMMO, STEP, clamp } from './rules.js';
import { contactImpact } from './impact.js';
const { Engine, Bodies, Body, Composite, Events, Query, Sleeping, Vector } = Matter;
export class SiegeWorld {
  constructor(seed = 1, terrain = 'valley') {
    this.engine=Engine.create({enableSleeping:true,positionIterations:10,velocityIterations:8});
    this.engine.gravity.y=.8; this.entities=new Map(); this.events=[]; this.time=0; this.armed=false;
    this.pending=new Map(); this.blasts=new Set(); this.shot=null; this.seed=seed; this.terrain=terrain;
    this.terrainBodies=[]; this.history=[]; this.fragmentCount=0;
    this.addTerrain(Bodies.rectangle(1200,910,2700,200,{isStatic:true,friction:.9}));
    if (terrain==='ridge') this.addTerrain(Bodies.trapezoid(1200,780,280,160,.5,{isStatic:true,friction:.9}));
    if (terrain==='steps') {
      this.addTerrain(Bodies.rectangle(1125,787,120,46,{isStatic:true}));
      this.addTerrain(Bodies.rectangle(1275,770,120,80,{isStatic:true}));
    }
    Events.on(this.engine,'collisionStart', e=>this.collisions(e.pairs));
    Events.on(this.engine,'collisionActive', e=>this.collisions(e.pairs));
    SIDES.forEach((s,side)=>this.starter(side));
    this.step(120); this.events=[];
  }
  addTerrain(body) { body.label='terrain'; this.terrainBodies.push(body); Composite.add(this.engine.world,body); }
  add(body, meta) { const e={body,health:meta.maxHealth??40,maxHealth:meta.maxHealth??40,born:this.time,...meta}; body.plugin.entity=e; this.entities.set(body.id,e); Composite.add(this.engine.world,body); return e; }
  block(side, material, x,y,w,h,angle=0,shape='rect', extra={}) {
    const m=MATERIALS[material]; const options={density:m.density,friction:m.friction,frictionStatic:m.friction+ .15,restitution:m.restitution,slop:.03,sleepThreshold:90};
    let body;
    if (shape==='wedge') body=Bodies.fromVertices(x,y,[[{x:-w/2,y:h/2},{x:w/2,y:h/2},{x:w/2,y:-h/2}]],options);
    else if (shape==='brace') body=Body.create({...options,parts:[Bodies.rectangle(x-w/2+10,y,20,h,options),Bodies.rectangle(x+10,y+h/2-10,w-20,20,options)]});
    else body=Bodies.rectangle(x,y,w,h,options);
    Body.setPosition(body,{x,y});
    Body.setAngle(body,angle);
    return this.add(body,{kind:'block',side,material,w,h,shape,maxHealth:m.health * Math.sqrt(w*h/2160),...extra});
  }
  soldier(side,x,y) {
    return this.add(Bodies.rectangle(x,y,15,27,{density:.0018,friction:.9,restitution:0,slop:.02,sleepThreshold:75,chamfer:{radius:4}}),{kind:'soldier',side,maxHealth:8,w:15,h:27,crush:0});
  }
  starter(side) {
    const x=SIDES[side].center,g=WORLD.ground;
    // Three independent bays turn a support failure into a local breach.
    // Adjacent roofs touch separate halves of shared posts, with no rigid joints.
    [-96,-32,32,96].forEach(d=>this.block(side,'wood',x+d,g-39,16,78));
    [-64,0,64].forEach(d=>this.block(side,'wood',x+d,g-89,63,22));
    [-64,0,64].forEach(d=>this.soldier(side,x+d,g-15));
  }
  get troops() { return [0,1].map(s=>[...this.entities.values()].filter(e=>e.kind==='soldier'&&e.side===s)); }
  remove(e) {
    if (!this.entities.has(e.body.id)) return;
    this.entities.delete(e.body.id); Composite.remove(this.engine.world,e.body);
    // Wake sleeping contact islands when a support disappears.
    for (const other of this.entities.values()) if (Math.abs(other.body.position.x-e.body.position.x)<Math.max(e.w??40,other.w??40)+80 && Math.abs(other.body.position.y-e.body.position.y)<180) Sleeping.set(other.body,false);
  }
  emit(type,x,y,amount=1,material='wood') { this.events.push({type,x,y,amount,material,time:this.time}); if(this.events.length>100) this.events.shift(); }
  hurt(e,amount,source) {
    if(!this.entities.has(e.body.id)||!Number.isFinite(amount)||amount<=0) return;
    e.health-=amount;
    this.history.push({kind:e.kind,side:e.side,amount,source,time:this.time}); if(this.history.length>200) this.history.shift();
    if(e.health<=0) {
      if(e.kind==='soldier') { this.emit('defeat',e.body.position.x,e.body.position.y,1); this.remove(e); }
      else if(e.kind==='block'&&!e.fractureAt) e.fractureAt=this.time+100;
    }
  }
  collisions(pairs) {
    if(!this.armed)return;
    for(const pair of pairs) {
      const a=pair.bodyA.parent,b=pair.bodyB.parent;
      if(a===b)continue;
      const ea=a.plugin.entity,eb=b.plugin.entity;
      if(ea?.kind==='projectile'&&ea.ammo==='bomb'&&!ea.exploded)this.blasts.add(ea);
      if(eb?.kind==='projectile'&&eb.ammo==='bomb'&&!eb.exploded)this.blasts.add(eb);
      const point=pair.collision.supports.find(Boolean)??{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2};
      const impact=contactImpact(a,b,point,pair.collision.normal);
      if(impact.closing<1.4)continue;
      for(const [target,other,otherBody] of [[ea,eb,b],[eb,ea,a]]) {
        if(!target||target.kind==='projectile')continue;
        let damage=impact.energy*.11;
        if(target.kind==='block')damage/=MATERIALS[target.material].resistance;
        if(other?.kind==='projectile') damage*=AMMO[other.ammo].damage*1.7;
        if(target.kind==='soldier') {
          damage*=2.1;
          if(otherBody.isStatic&&impact.closing<3.8)damage=0;
          // Opposed ground reaction makes a pinned soldier absorb the descending load.
          if(other?.kind==='block'&&otherBody.position.y<target.body.position.y&&target.body.position.y>WORLD.ground-35&&otherBody.velocity.y>1.2)
            damage=Math.max(damage,otherBody.mass*otherBody.velocity.y*.8);
        }
        const old=this.pending.get(target.body.id);
        if(!old||damage>old.amount)this.pending.set(target.body.id,{e:target,amount:damage,source:other?.kind??'ground'});
      }
      if(impact.closing>3) this.emit('impact',point.x,point.y,Math.min(impact.energy*.05,18),ea?.material??eb?.material);
      for(const p of [ea,eb])if(p?.kind==='projectile'&&!p.hitAt){p.hitAt=this.time; this.emit('hit',point.x,point.y,impact.energy*.02);}
    }
  }
  fracture(e) {
    const {body:b,w,h,material,side}=e;
    if(this.fragmentCount>=60||e.generation>=1||Math.min(w,h)<12) {e.health=1;e.fractureAt=null;e.cracked=true;return;}
    const pos={...b.position},vel={...b.velocity},angle=b.angle,av=b.angularVelocity;
    this.remove(e); this.emit('break',pos.x,pos.y,Math.min(b.mass,10),material);
    const horizontal=w>=h;
    for(const sign of [-1,1]) {
      const offset=horizontal?{x:sign*w/4,y:0}:{x:0,y:sign*h/4}; const d=Vector.rotate(offset,angle);
      const f=this.block(side,material,pos.x+d.x,pos.y+d.y,horizontal?w/2-1:w,horizontal?h:h/2-1,angle,'rect',{generation:1,fragment:true});
      Body.setMass(f.body,b.mass/2); Body.setVelocity(f.body,{x:vel.x-av*d.y,y:vel.y+av*d.x}); Body.setAngularVelocity(f.body,av); this.fragmentCount++;
    }
  }
  explode(e) {
    if(e.exploded||!this.entities.has(e.body.id))return; e.exploded=true;
    const pos={...e.body.position}; this.emit('blast',pos.x,pos.y,140); this.remove(e);
    for(const t of [...this.entities.values()]) {
      const dx=t.body.position.x-pos.x,dy=t.body.position.y-pos.y,dist=Math.hypot(dx,dy);
      if(dist>150)continue;
      const f=1-dist/150; Sleeping.set(t.body,false);
      Body.setVelocity(t.body,{x:t.body.velocity.x+dx/(dist||1)*f*10,y:t.body.velocity.y+dy/(dist||1)*f*10-2*f});
      this.hurt(t,(t.kind==='soldier'?16:50)*f/(t.material?MATERIALS[t.material].resistance:1),'blast');
    }
  }
  launch(side,velocity,ammo='bolt',xOffset=0) {
    if(this.shot)return false; this.armed=true;
    const config=AMMO[ammo],s=SIDES[side];
    const body=Bodies.circle(s.launcher[0]+xOffset,s.launcher[1]-20,config.radius,{density:config.density,friction:.7,restitution:.08,frictionAir:.0002});
    const e=this.add(body,{kind:'projectile',ammo,side,maxHealth:1e6});
    Body.setVelocity(body,velocity); this.shot={entity:e,age:0,quiet:0,origin:{...body.position},trail:[]};
    this.emit('launch',body.position.x,body.position.y,1);return true;
  }
  advance() {
    this.time+=STEP;
    Engine.update(this.engine,STEP);
    for(const {e,amount,source} of this.pending.values())this.hurt(e,amount,source);this.pending.clear();
    for(const e of this.blasts)this.explode(e);this.blasts.clear();
    for(const e of [...this.entities.values()]) {
      if(e.fractureAt&&this.time>=e.fractureAt)this.fracture(e);
      if(e.kind==='soldier'&&e.body.position.y>WORLD.ground+100)this.hurt(e,100,'out-of-bounds');
      if(e.kind==='soldier'&&this.armed) {
        // Sustained compression: real contacts above and below, not proximity alone.
        let above=0,below=false;
        // Sleeping pairs stop emitting active events. Query their current geometry so
        // a settled load remains a load; tolerate brief solver contact flicker.
        const contacts=Query.collides(e.body,[...this.terrainBodies,...[...this.entities.values()].filter(t=>t!==e&&t.kind==='block').map(t=>t.body)]);
        for(const contact of contacts) {
          const a=contact.bodyA.parent,b=contact.bodyB.parent;
          const o=a===e.body?b:b===e.body?a:null;if(!o)continue;
          if(o.position.y>e.body.position.y+7)below=true;
          if(o.position.y<e.body.position.y-8&&o.plugin.entity?.kind==='block')above+=o.mass;
        }
        if(below&&above>e.body.mass*2.8){e.crush+=STEP;e.lastLoad=above;e.lastCompression=this.time;}
        else if(this.time-(e.lastCompression??-Infinity)>100)e.crush=0;
        if(e.crush>350)this.hurt(e,(e.lastLoad??0)*.05,'compression');
      }
      if(e.kind!=='soldier'&&(e.body.position.y>1200||e.body.position.x< -300||e.body.position.x>2700))this.remove(e);
    }
    if(this.shot) {
      const s=this.shot;s.age+=STEP;
      if(s.trail.length<220&&this.entities.has(s.entity.body.id)&&s.age%50<STEP)s.trail.push({...s.entity.body.position});
      if(s.entity.ammo==='bomb'&&s.age>5200&&!s.entity.exploded)this.explode(s.entity);
      const flying=this.entities.has(s.entity.body.id)&&!s.entity.hitAt&&s.entity.body.position.y<WORLD.ground+40;
      const moving=[...this.entities.values()].some(e=>!e.body.isSleeping&&(e.kind!=='projectile')&&(e.body.speed>.65||Math.abs(e.body.angularVelocity)>.025)||e.fractureAt||(e.kind==='soldier'&&e.crush>0));
      s.quiet=(!flying&&!moving)?s.quiet+STEP:0;
    }
  }
  step(n=1) { for(let i=0;i<n;i++)this.advance(); }
  shotFinished() {return !!this.shot&&(this.shot.quiet>650||this.shot.age>12000);}
  finishShot() {
    // Keep all structural debris. Only spent ammunition is removed between turns.
    for(const e of [...this.entities.values()])if(e.kind==='projectile')this.remove(e);
    this.shot=null;
  }
  placement(side,piece,x,y,angle=0,snap=true) {
    const p=typeof piece==='string'?PIECES.find(p=>p.id===piece):piece;
    const probe=this.block(side,p.material,x,y,p.w,p.h,angle,p.shape);
    // Bounds come from the actual rotated shape, including asymmetric wedges
    // and compound repair elbows, rather than a nominal rectangular footprint.
    const bounds=probe.body.bounds;
    const offsets={left:bounds.min.x-x,right:bounds.max.x-x,top:bounds.min.y-y,bottom:bounds.max.y-y};
    const zone=SIDES[side].zone;
    x=clamp(x,zone[0]-offsets.left,zone[1]-offsets.right);
    y=clamp(y,WORLD.ground-330-offsets.top,WORLD.ground-offsets.bottom);
    if(snap) {
      let bestX=11,bestY=11,px=x,py=y;
      const tryX=v=>{if(Math.abs(v-x)<bestX){bestX=Math.abs(v-x);px=v;}};
      const tryY=v=>{if(Math.abs(v-y)<bestY){bestY=Math.abs(v-y);py=v;}};
      tryY(WORLD.ground-offsets.bottom);
      for(const e of this.entities.values())if(e!==probe&&e.side===side&&e.kind==='block'){
        const b=e.body.bounds;
        if(y+offsets.bottom>b.min.y-12&&y+offsets.top<b.max.y+12){tryX(b.min.x-offsets.right-1);tryX(b.max.x-offsets.left+1);tryX((b.min.x+b.max.x-offsets.left-offsets.right)/2);}
        if(x+offsets.right>b.min.x-12&&x+offsets.left<b.max.x+12){tryY(b.min.y-offsets.bottom-1);tryY(b.max.y-offsets.top+1);}
      }
      x=clamp(px,zone[0]-offsets.left,zone[1]-offsets.right);
      y=clamp(py,WORLD.ground-330-offsets.top,WORLD.ground-offsets.bottom);
    }
    Body.setPosition(probe.body,{x,y});
    const vertices=(probe.body.parts.length>1?probe.body.parts.slice(1):[probe.body]).map(part=>part.vertices.map(v=>({x:v.x,y:v.y})));
    Body.scale(probe.body,.96,.96);
    const collisions=Query.collides(probe.body,[...this.entities.values()].filter(e=>e!==probe).map(e=>e.body));
    this.entities.delete(probe.body.id);Composite.remove(this.engine.world,probe.body);
    const valid=!collisions.length;
    return {x,y,angle,valid,piece:p,vertices};
  }
  place(side,piece,x,y,angle=0) {
    const check=this.placement(side,piece,x,y,angle);if(!check.valid)return false;
    const p=check.piece; const e=this.block(side,p.material,check.x,check.y,p.w,p.h,angle,p.shape);
    this.emit('place',check.x,check.y);return e;
  }
  dispose() { Events.off(this.engine);Composite.clear(this.engine.world,false);Engine.clear(this.engine);this.entities.clear(); }
}
