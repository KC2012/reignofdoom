import Matter from 'matter-js';
import { WORLD, SIDES, MATERIALS, PIECES, AMMO, STEP, clamp } from './rules.js';
import { battlefield } from './battlefields.js';
import { damageReaction } from './reactive.js';
import { assemblyParts } from './chaos.js';
import { ProjectileEffects } from './projectile-effects.js';
import { TOY_PHYSICS } from './physics-tuning.js';
import { contactImpact } from './impact.js';
const { Engine, Bodies, Body, Composite, Events, Query, Sleeping, Vector, Constraint } = Matter;
export class SiegeWorld {
  constructor(seed = 1, terrain = 'valley', scale='siege',physics=TOY_PHYSICS) {
    this.physics=physics;this.layout=battlefield(scale,terrain);this.sides=this.layout.sides;this.deaths=[];this.cleanupCount=0;
    this.engine=Engine.create({enableSleeping:true,positionIterations:10,velocityIterations:8});
    this.engine.gravity.y=.8; this.entities=new Map(); this.events=[]; this.time=0; this.armed=false;
    this.pending=new Map(); this.blasts=new Set(); this.shot=null; this.seed=seed; this.terrain=terrain;
    this.effects=new ProjectileEffects(this);this.links=[];this.reactionHistory=[];this.terrainBodies=[]; this.history=[]; this.fragmentCount=0;
    const width=this.layout.width,g=WORLD.ground;
    if(terrain==='ravine'){
      this.addTerrain(Bodies.rectangle(width/4-100,g+200,width/2-200,400,{isStatic:true,friction:.9}));
      this.addTerrain(Bodies.rectangle(width*3/4+100,g+200,width/2-200,400,{isStatic:true,friction:.9}));
    }else this.addTerrain(Bodies.rectangle(width/2,g+200,width+600,400,{isStatic:true,friction:.9}));
    if(terrain==='ridge')this.addTerrain(Bodies.trapezoid(width/2,g-85,520,170,.5,{isStatic:true,friction:.9}));
    this.sides.forEach(s=>{
      this.addTerrain(Bodies.rectangle(s.launcher[0],g-50,130,100,{isStatic:true,friction:.9}));
      if(terrain==='highlands')this.addTerrain(Bodies.rectangle(s.center,g-50,560,100,{isStatic:true,friction:.9}));
      if(terrain==='steps')for(const sign of [-1,1])this.addTerrain(Bodies.rectangle(s.center+sign*330,g-34,130,68,{isStatic:true,friction:.9}));
    });
    Events.on(this.engine,'collisionStart', e=>this.collisions(e.pairs));
    Events.on(this.engine,'collisionActive', e=>this.collisions(e.pairs));
    this.sides.forEach((s,side)=>this.starter(side));
    this.step(120);this.environment();this.events=[];
  }
  addTerrain(body) { body.label='terrain'; this.terrainBodies.push(body); Composite.add(this.engine.world,body); }
  add(body, meta) { const e={body,health:meta.maxHealth??40,maxHealth:meta.maxHealth??40,born:this.time,...meta}; body.plugin.entity=e; this.entities.set(body.id,e); Composite.add(this.engine.world,body); return e; }
  block(side, material, x,y,w,h,angle=0,shape='rect', extra={}) {
    const m=MATERIALS[material]; const options={density:m.density,friction:m.friction*this.physics.grip,frictionStatic:(m.friction+.15)*this.physics.grip,restitution:Math.max(m.restitution,.07),slop:.03,sleepThreshold:90};
    let body;
    if(assemblyParts(shape))body=Body.create({...options,parts:assemblyParts(shape).map(([dx,dy,pw,ph])=>Bodies.rectangle(x+dx,y+dy,pw,ph,options))});
    else if (shape==='wedge') body=Bodies.fromVertices(x,y,[[{x:-w/2,y:h/2},{x:w/2,y:h/2},{x:w/2,y:-h/2}]],options);
    else if (shape==='brace') body=Body.create({...options,parts:[Bodies.rectangle(x-w/2+10,y,20,h,options),Bodies.rectangle(x+10,y+h/2-10,w-20,20,options)]});
    else body=Bodies.rectangle(x,y,w,h,options);
    Body.setPosition(body,{x,y});
    Body.setAngle(body,angle);
    return this.add(body,{kind:'block',side,material,w,h,shape,maxHealth:m.health * (w*h/2160),...extra});
  }
  soldier(side,x,y) {
    return this.add(Bodies.rectangle(x,y,15,27,{density:this.physics.soldier.density,friction:this.physics.soldier.friction,restitution:this.physics.soldier.restitution,slop:.02,sleepThreshold:75,chamfer:{radius:this.physics.soldier.chamfer}}),{kind:'soldier',side,maxHealth:this.physics.soldier.health,w:15,h:27,crush:0});
  }
  starter(side) {
    const x=this.sides[side].center,g=this.foundation(side);
    // Three seeded silhouettes, all mirrored; height creates real floors, not bonuses.
    const style=this.seed%3;this.startStyle=['scaffold','bridge','keep'][style];
    const height=style===2?96:130;
    for(const dx of [-150,0,150]){
      for(const sign of [-1,1])this.block(side,'wood',x+dx+sign*48,g-height/2,20,height);
      this.block(side,'wood',x+dx,g-height-10,120,20);
      // A useful small ground shelter remains, so building low stays legitimate.
      if(dx===0)this.block(side,'stone',x,g-height-26,100,12);
      this.soldier(side,x+dx,g-15);
    }
    if(style===1)this.block(side,'wood',x+this.sides[side].direction*75,g-height-30,150,18);
    if(style===2){this.block(side,'wood',x-38,g-height-57,20,50);this.block(side,'wood',x+38,g-height-57,20,50);this.block(side,'wood',x,g-height-92,170,20);}
  }
  environment(){
    if(this.terrain==='powder')for(let side=0;side<2;side++){
      const s=this.sides[side],g=this.foundation(side);this.block(side,'wood',s.center+s.direction*270,g-20,40,40,0,'rect',{reactive:'volatile',maxHealth:26});
    }
    if(this.terrain==='scrap')for(let side=0;side<2;side++){const s=this.sides[side],g=this.foundation(side),x=s.center+s.direction*265;const spring=this.block(side,'metal',x,g-9,80,18,0,'rect',{reactive:'spring',fixed:true,throwDirection:-s.direction,maxHealth:90});Body.setStatic(spring.body,true);this.block(side,'wood',x,g-37,36,36,0,'rect',{reactive:'volatile',maxHealth:32});}
    if(this.terrain==='hanging')for(let side=0;side<2;side++)this.hangingWeight(side,this.sides[side].center+this.sides[side].direction*230,this.foundation(side));
  }
  hangingWeight(side,x,g){
    const anchor=this.block(side,'wood',x,g-100,24,200,0,'rect',{reactive:'fuse',maxHealth:35,fixed:true});
    Body.setStatic(anchor.body,true);
    const weight=this.block(side,'metal',x-this.sides[side].direction*72,g-72,42,42,0,'rect',{reactive:'weight',maxHealth:180,fixed:true});
    const constraint=Constraint.create({bodyA:anchor.body,pointA:{x:0,y:-96},bodyB:weight.body,length:140,stiffness:.95,damping:.06,render:{visible:false}});
    Composite.add(this.engine.world,constraint);this.links.push({anchor,weight,constraint});return{anchor,weight,constraint};
  }
  foundation(side){return WORLD.ground-(this.terrain==='highlands'?100:0);}
  get troops() { return [0,1].map(s=>[...this.entities.values()].filter(e=>e.kind==='soldier'&&e.side===s)); }
  remove(e) {
    if (!this.entities.has(e.body.id)) return;
    for(const link of [...this.links])if(link.anchor===e||link.weight===e){Composite.remove(this.engine.world,link.constraint);this.links.splice(this.links.indexOf(link),1);this.reactionHistory.push({type:'rope-release',cause:e.body.id,time:this.time});Sleeping.set(link.weight.body,false);}
    this.entities.delete(e.body.id); Composite.remove(this.engine.world,e.body);
    // Wake the connected dynamic island, including towers taller than a local
    // radius. Ground is excluded so two distant forts do not wake one another.
    const remaining=[...this.entities.values()],queue=[e.body],seen=new Set();
    while(queue.length){const base=queue.pop();for(const other of remaining){
      if(seen.has(other.body.id))continue;
      const a=base.bounds,b=other.body.bounds;
      const near=a.max.x>=b.min.x-2&&b.max.x>=a.min.x-2&&a.max.y>=b.min.y-2&&b.max.y>=a.min.y-2;
      if(near){seen.add(other.body.id);Sleeping.set(other.body,false);queue.push(other.body);}
    }}

  }
  emit(type,x,y,amount=1,material='wood') { this.events.push({type,x,y,amount,material,time:this.time}); if(this.events.length>100) this.events.shift(); }
  hurt(e,amount,source) {
    if(!this.entities.has(e.body.id)||!Number.isFinite(amount)||amount<=0) return;
    e.health-=amount;
    if(damageReaction(this,e,amount,source))return;
    this.history.push({kind:e.kind,side:e.side,amount,source,time:this.time}); if(this.history.length>200) this.history.shift();
    if(e.kind==='block'&&e.health<e.maxHealth*.55&&!e.weakened){e.weakened=true;e.body.friction*=.65;e.body.frictionStatic*=.7;this.emit('crack',e.body.position.x,e.body.position.y,2,e.material);}
    if(e.health<=0) {
      if(e.kind==='soldier') { this.deaths.push({side:e.side,source,time:this.time,shot:this.totalShots??0});this.emit('defeat',e.body.position.x,e.body.position.y,1); this.remove(e); }
      else if(e.kind==='block'&&e.reactive!=='volatile'&&!e.fractureAt) e.fractureAt=this.time+100;
    }
  }
  collisions(pairs) {
    if(!this.armed)return;
    for(const pair of pairs) {
      const a=pair.bodyA.parent,b=pair.bodyB.parent;
      if(a===b)continue;
      const ea=a.plugin.entity,eb=b.plugin.entity;
      const contactPoint=pair.collision.supports.find(Boolean)??{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2};
      for(const p of[ea,eb])if(p?.kind==='projectile')this.effects.contact(p,contactPoint);
      if(ea?.kind==='projectile'&&ea.ammo==='bomb'&&!ea.exploded)this.blasts.add(ea);
      if(eb?.kind==='projectile'&&eb.ammo==='bomb'&&!eb.exploded)this.blasts.add(eb);
      const point=pair.collision.supports.find(Boolean)??{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2};
      const impact=contactImpact(a,b,point,pair.collision.normal);
      this.effects.springContact(ea,eb,impact.closing);this.effects.springContact(eb,ea,impact.closing);
      if(impact.closing<1.4)continue;
      for(const [projectile,target]of [[ea,eb],[eb,ea]])if(projectile?.kind==='projectile'&&target?.kind==='block'){
        projectile.struck??=new Set();if(!projectile.struck.has(target.body.id)){projectile.struck.add(target.body.id);
          if(projectile.ammo==='bolt'&&!target.body.isStatic&&impact.closing>3){const direction=Vector.normalise(projectile.body.velocity),kick=Math.min(this.physics.kickCap,impact.energy/(target.body.mass+1)*this.physics.kick);Sleeping.set(target.body,false);Body.setVelocity(target.body,{x:target.body.velocity.x+direction.x*kick,y:target.body.velocity.y+direction.y*kick- .5*kick});Body.setAngularVelocity(target.body,target.body.angularVelocity+(point.y-target.body.position.y)*direction.x*.0007);this.reactionHistory.push({type:'smash-impulse',cause:projectile.body.id,target:target.body.id,time:this.time});}
          if(projectile.ammo==='heavy'&&projectile.struck.size<=3)projectile.pierce={target,velocity:{...projectile.body.velocity}};
        }
      }
      for(const [target,other,otherBody] of [[ea,eb,b],[eb,ea,a]]) {
        if(!target||target.kind==='projectile')continue;
        let damage=impact.energy*.09;
        if(target.kind==='block')damage/=MATERIALS[target.material].resistance;
        if(other?.kind==='projectile') damage*=other.ammo==='bolt'?this.physics.damage:AMMO[other.ammo].damage;
        if(target.kind==='soldier') {
          damage*=this.physics.soldierImpact;
          if(otherBody.isStatic&&impact.closing<4.5)damage=0;
          // Opposed ground reaction makes a pinned soldier absorb the descending load.
          if(other?.kind==='block'&&otherBody.position.y<target.body.position.y&&target.body.position.y>WORLD.ground-35&&otherBody.velocity.y>1.2)
            damage=Math.max(damage,otherBody.mass*otherBody.velocity.y*this.physics.soldier.pinned);
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
    if(this.fragmentCount>=160||e.generation>=3||w*h<180) {e.health=1;e.fractureAt=null;e.cracked=true;return;}
    const pos={...b.position},vel={...b.velocity},angle=b.angle,av=b.angularVelocity;
    this.remove(e); this.emit('break',pos.x,pos.y,Math.min(b.mass,10),material);
    const horizontal=w>=h;
    for(const sign of [-1,1]) {
      const offset=horizontal?{x:sign*w/4,y:0}:{x:0,y:sign*h/4}; const d=Vector.rotate(offset,angle);
      const f=this.block(side,material,pos.x+d.x,pos.y+d.y,horizontal?w/2-1:w,horizontal?h:h/2-1,angle,'rect',{generation:(e.generation??0)+1,fragment:true,burnUntil:e.burnUntil,burnOwner:e.burnOwner,spreadAt:this.time+650});
      f.health=f.maxHealth*=.25;Body.setMass(f.body,b.mass/2); Body.setVelocity(f.body,{x:vel.x-av*d.y,y:vel.y+av*d.x}); Body.setAngularVelocity(f.body,av); this.fragmentCount++;
    }
  }
  explode(e) {
    if(e.exploded||!this.entities.has(e.body.id))return; e.exploded=true;
    const pos={...e.body.position}; this.reactionHistory.push({type:'explosion',cause:e.body.id,trigger:e.reactionCause??'projectile-contact',time:this.time});this.emit('blast',pos.x,pos.y,145); this.remove(e);
    for(const t of [...this.entities.values()]) {
      const dx=t.body.position.x-pos.x,dy=t.body.position.y-pos.y,dist=Math.hypot(dx,dy);
      if(dist>145||t.kind==='projectile')continue;
      let f=1-dist/145;
      const shields=Query.ray([...this.entities.values()].filter(b=>b!==t&&b.kind==='block').map(b=>b.body),pos,t.body.position);if(shields.length)f*=.35; Sleeping.set(t.body,false);
      Body.setVelocity(t.body,{x:t.body.velocity.x+dx/(dist||1)*f*7,y:t.body.velocity.y+dy/(dist||1)*f*7-2*f});
      this.hurt(t,(t.kind==='soldier'?14:48)*f/(t.material?MATERIALS[t.material].resistance:1),'blast');
    }
  }
  launch(side,velocity,ammo='bolt',xOffset=0) {
    if(this.shot)return false; this.armed=true;this.totalShots=(this.totalShots??0)+1;
    const config=ammo==='bolt'?{...AMMO.bolt,radius:this.physics.radius,density:this.physics.density}:AMMO[ammo],s=this.sides[side];
    const body=Bodies.circle(s.launcher[0]+xOffset,s.launcher[1]-20,config.radius,{density:config.density,friction:.7,restitution:.08,frictionAir:.0002});
    const e=this.add(body,{kind:'projectile',ammo,side,maxHealth:1e6});
    Body.setVelocity(body,velocity); this.shot={entity:e,age:0,quiet:0,origin:{...body.position},trail:[]};
    this.emit('launch',body.position.x,body.position.y,1);return true;
  }
  advance() {
    this.time+=STEP;
    Engine.update(this.engine,STEP/2);Engine.update(this.engine,STEP/2);
    for(const {e,amount,source} of this.pending.values())this.hurt(e,amount,source);this.pending.clear();
    for(const projectile of this.entities.values())if(projectile.pierce){const {target,velocity}=projectile.pierce;delete projectile.pierce;if(target.health<=0&&this.entities.has(target.body.id)&&!target.reactive){this.fracture(target);Body.setVelocity(projectile.body,{x:velocity.x*.8,y:velocity.y*.8});this.reactionHistory.push({type:'penetration',cause:projectile.body.id,target:target.body.id,time:this.time});}}
    this.effects.update();
    for(const e of [...this.blasts]){this.blasts.delete(e);this.explode(e);}
    for(const e of [...this.entities.values()]) {
      if(e.fractureAt&&this.time>=e.fractureAt)this.fracture(e);
      if(e.kind==='soldier'&&e.body.position.y>WORLD.ground+100)this.hurt(e,100,'out-of-bounds');
      if(e.kind==='soldier'&&this.armed) {
        // Sustained compression: real contacts above and below, not proximity alone.
        const {above,below}=this.compressionLoad(e);
        if(below&&above>e.body.mass*2.8){e.crush+=STEP;e.lastLoad=above;e.lastCompression=this.time;}
        else if(this.time-(e.lastCompression??-Infinity)>100)e.crush=0;
        if(e.crush>350)this.hurt(e,(e.lastLoad??0)*.05,'compression');
      }
      if(e.kind!=='soldier'&&(e.body.position.y>1200||e.body.position.x< -300||e.body.position.x>this.layout.width+300))this.remove(e);
    }
    if(Math.round(this.time/STEP)%120===0)this.cleanDebris();if(this.reactionHistory.length>200)this.reactionHistory.splice(0,this.reactionHistory.length-200);
    if(this.shot) {
      const s=this.shot;s.age+=STEP;
      if(s.trail.length<220&&this.entities.has(s.entity.body.id)&&s.age%50<STEP)s.trail.push({...s.entity.body.position});
      if(s.entity.ammo==='bomb'&&s.age>10000&&!s.entity.exploded)this.explode(s.entity);
      const flying=this.entities.has(s.entity.body.id)&&!s.entity.hitAt&&s.entity.body.position.y<WORLD.ground+40;
      const moving=[...this.entities.values()].some(e=>!e.body.isSleeping&&(e.kind!=='projectile')&&(e.body.speed>.65||Math.abs(e.body.angularVelocity)>.025)||e.fractureAt||(e.kind==='soldier'&&e.crush>0));
      s.quiet=(!flying&&!moving&&!this.effects.busy&&!this.blasts.size)?s.quiet+STEP:0;
    }
  }
  step(n=1) { for(let i=0;i<n;i++)this.advance(); }
  shotFinished() {return !!this.shot&&!this.effects.busy&&!this.blasts.size&&(this.shot.quiet>650||(this.shot.age>14000&&![...this.entities.values()].some(e=>e.kind!=='projectile'&&(e.body.speed>1.8||Math.abs(e.body.angularVelocity)>.025||e.fractureAt||(e.kind==='soldier'&&e.crush>0)))));}
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
    const zone=this.sides[side].zone;
    x=clamp(x,zone[0]-offsets.left,zone[1]-offsets.right);
    y=clamp(y,WORLD.ground-this.layout.buildHeight-offsets.top,WORLD.ground-offsets.bottom);
    if(snap) {
      let bestX=11,bestY=11,px=x,py=y;
      const tryX=v=>{if(Math.abs(v-x)<bestX){bestX=Math.abs(v-x);px=v;}};
      const tryY=v=>{if(Math.abs(v-y)<bestY){bestY=Math.abs(v-y);py=v;}};
      tryY(WORLD.ground-offsets.bottom);
      for(const e of [...this.entities.values(),...this.terrainBodies.map(body=>({body,side,kind:'block'}))])if(e!==probe&&e.side===side&&e.kind==='block'){
        const b=e.body.bounds;
        if(y+offsets.bottom>b.min.y-12&&y+offsets.top<b.max.y+12){tryX(b.min.x-offsets.right-1);tryX(b.max.x-offsets.left+1);tryX((b.min.x+b.max.x-offsets.left-offsets.right)/2);}
        if(x+offsets.right>b.min.x-12&&x+offsets.left<b.max.x+12){tryY(b.min.y-offsets.bottom-1);tryY(b.max.y-offsets.top+1);}
      }
      x=clamp(px,zone[0]-offsets.left,zone[1]-offsets.right);
      y=clamp(py,WORLD.ground-this.layout.buildHeight-offsets.top,WORLD.ground-offsets.bottom);
    }
    Body.setPosition(probe.body,{x,y});
    const vertices=(probe.body.parts.length>1?probe.body.parts.slice(1):[probe.body]).map(part=>part.vertices.map(v=>({x:v.x,y:v.y})));
    Body.scale(probe.body,.96,.96);
    const collisions=Query.collides(probe.body,[...this.terrainBodies,...[...this.entities.values()].filter(e=>e!==probe).map(e=>e.body)]);
    this.entities.delete(probe.body.id);Composite.remove(this.engine.world,probe.body);
    const valid=!collisions.length;
    return {x,y,angle,valid,piece:p,vertices};
  }
  place(side,piece,x,y,angle=0) {
    const check=this.placement(side,piece,x,y,angle);if(!check.valid)return false;
    const p=check.piece;let e;
    if(assemblyParts(p.shape)){
      // Place a ready-made assembly as independent load-bearing timbers. The
      // preview shares its geometry, but no invisible joint holds a roof up.
      const probe=this.block(side,p.material,check.x,check.y,p.w,p.h,angle,p.shape);
      const positions=probe.body.parts.slice(1).map(b=>({...b.position}));
      this.entities.delete(probe.body.id);Composite.remove(this.engine.world,probe.body);
      assemblyParts(p.shape).forEach(([, ,pw,ph],i)=>{const part=positions[i],item=this.block(side,p.material,part.x,part.y,pw,ph,angle,'rect',{assembly:p.id});e??=item;});
    }
    else e=this.block(side,p.material,check.x,check.y,p.w,p.h,angle,p.shape,{reactive:p.reactive,...(p.reactive==='fuse'?{maxHealth:24}:{})});
    this.emit('place',check.x,check.y);return e;
  }
  compressionLoad(e){
    const bodies=[...this.terrainBodies,...[...this.entities.values()].map(t=>t.body)];
    const contacts=new Map(),loads=new Map();
    const touching=body=>{if(!contacts.has(body.id))contacts.set(body.id,Query.collides(body,bodies.filter(b=>b!==body)).filter(c=>Math.abs(c.normal.y)>.35).map(c=>c.bodyA.parent===body?c.bodyB.parent:c.bodyA.parent));return contacts.get(body.id);};
    const load=body=>{
      if(loads.has(body.id))return loads.get(body.id);
      let sum=body.mass;
      for(const upper of touching(body))if(!upper.isStatic&&upper.plugin.entity?.kind==='block'&&upper.position.y<body.position.y-8){
        const supports=touching(upper).filter(lower=>lower.position.y>upper.position.y+8);
        sum+=load(upper)/Math.max(1,supports.length);
      }
      loads.set(body.id,sum);return sum;
    };
    const below=touching(e.body).some(b=>b.position.y>e.body.position.y+7);
    return{above:load(e.body)-e.body.mass,below};
  }
  supported(e){
    const b=e.body.bounds;
    return [...this.entities.values()].some(t=>t!==e&&t.body.bounds.max.y>b.min.y-5&&t.body.bounds.min.y<b.max.y+5&&t.body.bounds.min.x<b.max.x+4&&t.body.bounds.max.x>b.min.x-4&&(t.kind==='soldier'||t.body.position.y<e.body.position.y));
  }
  clearable(e,side){
    return e?.side===side&&e.kind==='block'&&e.fragment&&e.body.isSleeping&&!e.fractureAt&&!this.supported(e);
  }
  cleanDebris(){
    for(const e of [...this.entities.values()])if(e.fragment&&e.w*e.h<650&&e.body.isSleeping&&this.time-e.born>3000&&!this.supported(e)){
      this.emit('dust',e.body.position.x,e.body.position.y,1,e.material);this.remove(e);this.cleanupCount++;
    }
    this.fragmentCount=[...this.entities.values()].filter(e=>e.fragment).length;
  }
  soldierPlacement(e,x,y){
    const zone=this.sides[e.side].zone;x=clamp(x,zone[0]+10,zone[1]-10);y=clamp(y,WORLD.ground-this.layout.buildHeight+16,WORLD.ground-14);
    // Snap feet to nearby physical floors, then require a real support surface.
    const surfaces=[...this.terrainBodies,...[...this.entities.values()].filter(t=>t!==e&&t.kind==='block').map(t=>t.body)];
    let best=25;
    for(const b of surfaces)if(x-5>b.bounds.min.x&&x+5<b.bounds.max.x){const candidate=b.bounds.min.y-14; if(Math.abs(candidate-y)<best){best=Math.abs(candidate-y);y=candidate;}}
    const probe=Bodies.rectangle(x,y,14,26);
    const overlapping=Query.collides(probe,[...surfaces,...this.troops.flat().filter(t=>t!==e).map(t=>t.body)]).some(c=>c.depth>1);
    const floor=Query.collides(Bodies.rectangle(x,y+15,10,4),surfaces).length>0;
    return {x,y,angle:0,valid:floor&&!overlapping,vertices:[probe.vertices.map(v=>({x:v.x,y:v.y}))],piece:{w:15,h:27}};
  }
  moveSoldier(e,x,y){
    const p=this.soldierPlacement(e,x,y);if(!p.valid)return false;
    Body.setPosition(e.body,p);Body.setAngle(e.body,0);Body.setVelocity(e.body,{x:0,y:0});Body.setAngularVelocity(e.body,0);Sleeping.set(e.body,false);e.crush=0;e.lastCompression=-Infinity;e.lastLoad=0;return true;
  }
  dispose() { this.effects.dispose();Events.off(this.engine);Composite.clear(this.engine.world,false);Engine.clear(this.engine);this.entities.clear(); }
}
