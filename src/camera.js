import {clamp} from './rules.js';
export function screenToWorld(point,viewport,camera){const scale=viewport.width/camera.width;return{x:(point.x-viewport.width/2)/scale+camera.x,y:(point.y-viewport.height/2)/scale+camera.y};}
export function worldToScreen(point,viewport,camera){const scale=viewport.width/camera.width;return{x:viewport.width/2+(point.x-camera.x)*scale,y:viewport.height/2+(point.y-camera.y)*scale};}
export function zoomCamera(camera,factor,anchor,viewport){const before=screenToWorld(anchor,viewport,camera);camera.width=clamp(camera.width*factor,440,8500);const after=screenToWorld(anchor,viewport,camera);camera.x+=before.x-after.x;camera.y+=before.y-after.y;return camera;}
export function fitFrame(bounds,viewport={width:1440,height:700},padding=60){const aspect=viewport.width/Math.max(1,viewport.height);return{x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2,width:Math.max(bounds.maxX-bounds.minX+padding*2,(bounds.maxY-bounds.minY+padding*2)*aspect,600)};}
function fortFrame(match,side,viewport){
 const w=match.world,s=w.sides[side],g=w.foundation(side),b={minX:s.zone[0],maxX:s.zone[1],minY:g-280,maxY:g+45};
 for(const e of w.entities.values())if(e.side===side&&e.kind!=='projectile'&&Math.abs(e.body.position.x-s.center)<w.layout.scale.zone/2+240){b.minX=Math.min(b.minX,e.body.bounds.min.x);b.maxX=Math.max(b.maxX,e.body.bounds.max.x);b.minY=Math.min(b.minY,e.body.bounds.min.y);b.maxY=Math.max(b.maxY,Math.min(g+80,e.body.bounds.max.y));}
 return fitFrame(b,viewport,35);
}
export function phaseFrame(match,mode='auto',viewport={width:1440,height:700}){
 const w=match.world,s=w.sides[match.active],enemy=w.sides[1-match.active],aspect=viewport.width/Math.max(1,viewport.height);
 if(mode==='overview'||mode==='auto')return fitFrame({minX:200,maxX:w.layout.width-200,minY:260,maxY:880},viewport,60);
 if(mode==='enemy')return fortFrame(match,1-match.active,viewport);
 if(mode==='fort'||match.building)return fortFrame(match,match.active,viewport);
 if(match.phase==='flight'&&w.shot){
  const p=w.shot.entity.body.position,impact=w.shot.entity.hitAt||w.shot.entity.exploded;
  if(impact&&Math.abs(p.x-enemy.center)<w.layout.scale.zone/2+450)return fortFrame(match,1-match.active,viewport);
  return {x:p.x+s.direction*(impact?0:100),y:impact?Math.min(710,p.y-70):clamp(p.y+90,-350,630),width:Math.max(impact?850:1250,aspect*(impact?420:520))};
 }
 const frameWidth=Math.max(1100,aspect*500);return{x:s.launcher[0]+s.direction*170,y:s.launcher[1]-20-.12*viewport.height*frameWidth/viewport.width,width:frameWidth};
}
