import Matter from 'matter-js';
import { SPECIALS } from './chaos-rewards.js';
/** Repeatable rigs use ordinary match bodies and effects; no scripted destruction. */
export function loadRig(match,kind='tower'){
 const w=match.world,side=1,c=w.sides[side].center,g=w.foundation(side);
 w.finishShot();w.effects.dispose();for(const e of [...w.entities.values()])if(e.side===side)w.remove(e);
 w.armed=false;
 for(const dx of[-150,0,150]){
  const h=kind==='bunker'?70:170,material=kind==='bunker'?'stone':'wood';
  for(const sign of[-1,1])w.block(side,material,c+dx+sign*48,g-h/2,24,h);
  w.block(side,'wood',c+dx,g-h-10,140,20);
  if(kind==='bunker')w.block(side,'stone',c+dx,g-h-30,130,20);
  w.soldier(side,c+dx,g-15);
 }
 if(kind==='chain'){
  const x=c-260,{weight,constraint}=w.hangingWeight(side,x,g);Matter.Body.setPosition(weight.body,{x:x+72,y:g-135});constraint.length=95;
  const spring=w.block(side,'metal',x+72,g-9,80,18,0,'rect',{reactive:'spring',fixed:true,throwDirection:1,maxHealth:90});Matter.Body.setStatic(spring.body,true);
  w.block(side,'wood',c-80,g-22,40,40,0,'rect',{reactive:'volatile',maxHealth:25});
 }
 w.step(180);w.armed=true;w.events=[];w.reactionHistory=[];
 match.ammo=[Object.fromEntries(SPECIALS.map(id=>[id,3])),Object.fromEntries(SPECIALS.map(id=>[id,3]))];
 match.phase='aim';match.active=0;match.result=null;match.paused=false;match.volley=0;match.round=1;match.timer=35;match.revision++;
 match.rig=kind;return match;
}
