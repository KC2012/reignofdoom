/** Seeded, bounded repair choices: usable basics bracket more demanding pieces. */
export function repairQueue(rng){
 const geometric=['frame','platform','brace','wedge'];
 const queue=['beam',geometric[Math.floor(rng()*geometric.length)],'brick',['volatile','volatile','fuse','spring'][Math.floor(rng()*4)],'beam','platform'];
 if(rng()<.5)[queue[1],queue[5]]=[queue[5],queue[1]];
 return queue;
}
export const COMPONENTS={
 frame:{name:'Tower frame',role:'An open floor without a solid wall',parts:[[-55,0,20,120],[55,0,20,120],[0,-70,160,20]]},
 platform:{name:'Raised deck',role:'A ready floor on two supports',parts:[[-55,15,20,50],[55,15,20,50],[0,-22,180,24]]},
};
export function assemblyParts(shape){return COMPONENTS[shape]?.parts;}
export function visibleTrajectory(points,ground=810){const end=points.findIndex(p=>p.y>=ground),path=points.slice(0,end<0?points.length:end+1);return path.slice(0,Math.floor(path.length*.75));}
