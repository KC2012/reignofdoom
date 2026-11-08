import Matter from 'matter-js';
import { AMMO, STEP, clamp } from './rules.js';
const { Body, Sleeping }=Matter;
const combustible=e=>e?.kind==='block'&&(e.material==='wood'||e.material==='foam');
const gap=(a,b)=>Math.hypot(Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x),Math.max(0,a.min.y-b.max.y,b.min.y-a.max.y));
/** Contact queues keep world mutations outside Matter's collision solver. */
export class ProjectileEffects {
 constructor(world){this.world=world;this.pending=new Map();this.springs=new Map();this.fields=[];}
 contact(projectile,point){
  const effect=AMMO[projectile?.ammo]?.effect;
  if(!effect||projectile.activated)return;
  projectile.activated=true;projectile.hitAt=this.world.time;
  this.pending.set(projectile.body.id,{projectile,point:{x:point.x,y:point.y},effect});
 }
 springContact(spring,target,closing){
  if(spring?.reactive!=='spring'||!target||target.body.isStatic||spring.spent||closing<3)return;
  if(!this.springs.has(spring.body.id))this.springs.set(spring.body.id,{spring,target,closing});
 }
 ignite(e,owner,until=this.world.time+4200){
  const w=this.world;
  if(!combustible(e)||e.burnt||e.burnUntil||[...w.entities.values()].filter(t=>t.burnUntil>w.time).length>=32)return false;
  e.burnUntil=until;e.burnOwner=owner;e.spreadAt=w.time+650;
  w.emit('ignite',e.body.position.x,e.body.position.y,1,e.material);
  w.reactionHistory.push({type:'ignition',target:e.body.id,owner,time:w.time});return true;
 }
 update(){
  const w=this.world,dt=STEP/1000;
  for(const {projectile,point,effect} of this.pending.values()){
   if(!w.entities.has(projectile.body.id))continue;
   if(effect==='fire'){
    const targets=[...w.entities.values()].filter(combustible).sort((a,b)=>Math.hypot(a.body.position.x-point.x,a.body.position.y-point.y)-Math.hypot(b.body.position.x-point.x,b.body.position.y-point.y));
    for(const e of targets.slice(0,12))if(Math.hypot(e.body.position.x-point.x,e.body.position.y-point.y)<115)this.ignite(e,projectile.side);
    w.emit('fire-hit',point.x,point.y,100);w.reactionHistory.push({type:'fire-impact',cause:projectile.body.id,time:w.time});
   }else if(effect==='vortex'){
    if(this.fields.length<2)this.fields.push({x:point.x,y:point.y,radius:190,age:0,duration:1700,owner:projectile.side});
    w.emit('vortex',point.x,point.y,190);w.reactionHistory.push({type:'vortex',cause:projectile.body.id,time:w.time});
   }
   w.remove(projectile);
  }
  this.pending.clear();
  for(const {spring,target,closing}of this.springs.values()){
   if(spring.spent)continue;
   spring.spent=true;
   const targets=[...w.entities.values()].filter(e=>!e.body.isStatic&&e!==spring&&(e===target||gap(spring.body.bounds,e.body.bounds)<4)).slice(0,8);
   const mass=targets.reduce((sum,e)=>sum+e.body.mass,0),kick=Math.min(10,4+closing*.6)*Math.min(1,Math.sqrt(18/Math.max(1,mass))),direction=spring.throwDirection??0;
   for(const e of targets){Sleeping.set(e.body,false);Body.setVelocity(e.body,{x:e.body.velocity.x+direction*kick*.55,y:Math.min(e.body.velocity.y,-kick)});}
   if(!spring.body.isStatic&&w.entities.has(spring.body.id)){Sleeping.set(spring.body,false);Body.setVelocity(spring.body,{x:spring.body.velocity.x-direction*kick*.2,y:spring.body.velocity.y+kick*.25});}
   w.emit('spring',spring.body.position.x,spring.body.position.y,kick);w.reactionHistory.push({type:'spring-release',cause:target.body.id,spring:spring.body.id,time:w.time});
  }
  this.springs.clear();
  // A queued force is consumed by the first of two Matter substeps.
  for(const field of this.fields){
   field.age+=STEP;const envelope=Math.sin(Math.PI*clamp(field.age/field.duration,0,1));
   for(const e of w.entities.values()){
    if(e.body.isStatic||e.kind==='projectile')continue;
    const dx=e.body.position.x-field.x,dy=e.body.position.y-field.y,d=Math.hypot(dx,dy);if(d>=field.radius)continue;
    const f=(1-d/field.radius)*envelope,denom=Math.max(35,d),force=.003*2*Math.min(e.body.mass,6)*f;
    Sleeping.set(e.body,false);Body.applyForce(e.body,e.body.position,{x:(-dx/denom*.4+dy/denom*.8)*force,y:(-1.2-dx/denom*.35)*force});
    Body.setAngularVelocity(e.body,clamp(e.body.angularVelocity+f*.001,-.18,.18));
   }
  }
  this.fields=this.fields.filter(f=>f.age<f.duration);
  const burning=[...w.entities.values()].filter(e=>e.burnUntil>w.time);
  for(const e of [...w.entities.values()])if(e.burnUntil&&e.burnUntil<=w.time){e.burnUntil=0;e.burnt=true;}
  const troops=w.troops.flat();
  for(const e of burning){
   if(!w.entities.has(e.body.id))continue;
   w.hurt(e,(e.material==='foam'?24:18)*dt,'fire');
   for(const soldier of troops)if(gap(e.body.bounds,soldier.body.bounds)<10)w.hurt(soldier,3*dt,'fire');
   if(w.time>=e.spreadAt){e.spreadAt=w.time+650;for(const other of w.entities.values())if(other!==e&&combustible(other)&&gap(e.body.bounds,other.body.bounds)<6)this.ignite(other,e.burnOwner,Math.min(w.time+2800,e.burnUntil+900));}
  }
 }
 get busy(){return this.pending.size>0||this.fields.length>0||[...this.world.entities.values()].some(e=>e.burnUntil>this.world.time);}
 dispose(){this.pending.clear();this.springs.clear();this.fields=[];}
}
