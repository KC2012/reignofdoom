import {clamp} from './rules.js';
export function screenToWorld(point,viewport,camera){const scale=viewport.width/camera.width;return{x:(point.x-viewport.width/2)/scale+camera.x,y:(point.y-viewport.height/2)/scale+camera.y};}
export function worldToScreen(point,viewport,camera){const scale=viewport.width/camera.width;return{x:viewport.width/2+(point.x-camera.x)*scale,y:viewport.height/2+(point.y-camera.y)*scale};}
export function zoomCamera(camera,factor,anchor,viewport){const before=screenToWorld(anchor,viewport,camera);camera.width=clamp(camera.width*factor,440,8500);const after=screenToWorld(anchor,viewport,camera);camera.x+=before.x-after.x;camera.y+=before.y-after.y;return camera;}
export function phaseFrame(match,mode='auto'){
 const w=match.world,s=w.sides[match.active],enemy=w.sides[1-match.active];
 if(mode==='overview')return{x:w.layout.width/2,y:520,width:w.layout.width+140};
 if(mode==='enemy')return{x:enemy.center,y:610,width:1050};
 if(mode==='fort'||match.building)return{x:s.center,y:610,width:w.layout.scale.zone+250};
 if(match.phase==='flight'&&w.shot){const p=w.shot.entity.body.position,impact=w.shot.entity.hitAt||w.shot.entity.exploded;return{x:impact?clamp(p.x,enemy.center-360,enemy.center+360):p.x,y:impact?610:clamp(p.y+100,100,620),width:impact?1150:1500};}
 return{x:s.launcher[0]+s.direction*240,y:520,width:1500};
}
