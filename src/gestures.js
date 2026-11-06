/** Pointer arbitration shared by touch, pen and mouse. Once a second finger
 * arrives, no one-finger action can commit until the whole gesture ends. */
export class GestureSession {
  constructor(){this.points=new Map();this.action=null;this.multi=false;}
  down(id,point,action){
    this.points.set(id,{...point});
    if(this.points.size>1){this.multi=true;this.action=null;return 'camera';}
    if(this.multi)return 'camera';
    this.action={...action,id,start:{...point},last:{...point},moved:false};return action.type;
  }
  move(id,point){
    if(!this.points.has(id))return null;this.points.set(id,{...point});
    if(this.multi)return 'camera';
    if(this.action?.id!==id)return null;
    this.action.last={...point};if(Math.hypot(point.x-this.action.start.x,point.y-this.action.start.y)>6)this.action.moved=true;
    return this.action;
  }
  up(id){
    if(!this.points.has(id))return null;
    this.points.delete(id);
    const action=!this.multi&&this.action?.id===id?this.action:null;
    this.action=null;if(!this.points.size)this.multi=false;return action;
  }
  cancel(){this.points.clear();this.action=null;this.multi=false;}
}
export function pinchState(points){const[a,b]=[...points.values()];return a&&b?{distance:Math.max(12,Math.hypot(a.x-b.x,a.y-b.y)),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}:null;}
export function inRect(point,rect){return point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom;}
