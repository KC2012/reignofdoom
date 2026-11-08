/** Reactive identities are shared by rendering and the damage pipeline. */
export const REACTIVE={
 volatile:{symbol:'!',color:'#ef985c',impactDamage:10},
 fuse:{symbol:'×',color:'#e7c47b'},
 spring:{symbol:'∿',color:'#b8ce95'},
 weight:{symbol:'●',color:'#aad2cf'},
};
/** React to real damage. Scheduling, rather than recursion, preserves chain events. */
export function damageReaction(world,e,amount,source){
 const config=REACTIVE[e.reactive];if(!config)return false;
 if(e.reactive==='volatile'&&world.armed&&(amount>=config.impactDamage||e.health<=0)){
  e.reactionCause??={source,amount,time:world.time};world.blasts.add(e);
 }
 if(e.reactive==='spring'&&e.body.isStatic&&e.health<=0){world.emit('break',e.body.position.x,e.body.position.y,2,'metal');world.remove(e);return true;}
 if(e.reactive==='fuse'&&e.health<=0){
  world.reactionHistory.push({type:'support-break',id:e.body.id,source,time:world.time});
  world.emit('release',e.body.position.x,e.body.position.y,3);world.emit('break',e.body.position.x,e.body.position.y,2);
  world.remove(e);return true;
 }
 return false;
}
