import './style.css';
import Matter from 'matter-js';
import { Match } from './match.js';
import { WORLD, MATERIALS, PIECES, AMMO, STEP, pullVelocity, clamp, BALLISTICS, predictFlight, rangedShot } from './rules.js';
import { REACTIVE } from './reactive.js';
import { visibleTrajectory } from './chaos.js';
import { FIELDS } from './battlefields.js';
import { phaseFrame, zoomCamera, fitFrame } from './camera.js';
import { GestureSession, pinchState, inRect } from './gestures.js';
import { markup, pieceLabel } from './interface.js';
import { Audio } from './audio.js';
const $=s=>document.querySelector(s),audio=new Audio();$('#app').innerHTML=markup;
const canvas=$('#game'),ctx=canvas.getContext('2d'),gesture=new GestureSession();
let match=null,demo=new Match({seed:1042}),screen='title',selected='brick',rotation=0,preview=null,drag=null,pointer=null,particles=[],waves=[],shake=0,lastRevision=-1,lastPhase='',lastTime=performance.now(),accumulator=0;
const sides=()=> (match??demo).world.sides;
let clearMode=false,pinch=null,lastSecond=-1,lastTouchActivation=-Infinity,selectedEntity=null,held=null,interactionKey='',countsKey='';
let camera={x:3500,y:650,width:1500},targetCamera={...camera},viewMode='auto',aimAngle=43,aimPower=80,ammo='bolt',lastResult=false,lab=false;
let width=1200,height=600,dpr=1,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){const r=canvas.getBoundingClientRect();if(Math.abs(width-r.width)>1||Math.abs(height-r.height)>1)cancelAll();width=r.width;height=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(match&&viewMode!=='manual'&&!drag)camera=activityFrame();}
new ResizeObserver(resize).observe($('#viewport'));window.visualViewport?.addEventListener('resize',resize);
function activityFrame(){return phaseFrame(match,viewMode,{width,height});}
function bindPress(button,action){
 let pressed=null;
 button.onpointerdown=e=>{if(e.button===0)pressed=e.pointerId;};
 button.onpointercancel=()=>pressed=null;
 button.onpointerup=e=>{if(e.pointerType==='touch'&&pressed===e.pointerId&&inRect({x:e.clientX,y:e.clientY},button.getBoundingClientRect())){pressed=null;lastTouchActivation=performance.now();e.preventDefault();action();}};
 button.onclick=e=>{if(performance.now()-lastTouchActivation>600||e.detail===0)action();};
}
function showNotice(message){$('#notice').textContent=message;$('#notice').classList.add('visible');clearTimeout(showNotice.timeout);showNotice.timeout=setTimeout(()=>$('#notice').classList.remove('visible'),2100);}
function toast(message){$('#turn-toast').textContent=message;$('#turn-toast').classList.add('visible');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>$('#turn-toast').classList.remove('visible'),900);}
function start(mode='hotseat',isLab=false){
 cancelAll();match?.dispose();match=new Match({mode,difficulty:$('#difficulty').value,terrain:$('#terrain').value,seed:Number($('#seed').value)||1042,lab:isLab,scale:$('#matchScale').value});
 screen='game';lab=isLab;$('#lab-actions').hidden=!lab;$('#notice').classList.remove('visible');selected='brick';rotation=0;preview=null;drag=null;clearMode=false;selectedEntity=null;particles=[];waves=[];lastRevision=-1;lastPhase='';lastResult=false;ammo='bolt';interactionKey='';countsKey='';viewMode='auto';
 $('#app').classList.add('playing');$('#title').hidden=true;$('#gamebar').hidden=false;$('#controls').hidden=false;$('#view-tools').hidden=false;$('#result').hidden=true;$('#pause-overlay').hidden=true;
 resize();camera=activityFrame();rangeAim();audio.unlock();updateUI();toast('Ember builds first');
}
function title(){cancelAll();match?.dispose();match=null;screen='title';viewMode='auto';$('#app').classList.remove('playing');$('#title').hidden=false;$('#gamebar').hidden=true;$('#controls').hidden=true;$('#view-tools').hidden=true;$('#context-tools').hidden=true;$('#result').hidden=true;$('#pause-overlay').hidden=true;}
function devLoad(){if(!lab||!match)return;cancelAll();match.world.armed=true;match.world.block(0,'stone',sides()[0].center,570,180,36);setPause(false);}
function devSupports(){if(!lab||!match)return;cancelAll();for(const e of [...match.world.entities.values()])if(e.side===1&&e.kind==='block'&&e.body.position.y>match.world.foundation(1)-65)match.world.remove(e);setPause(false);}
function devNext(){if(!lab||!match)return;cancelAll();if(match.building)match.ready();else if(match.phase==='flight')match.resolve();setPause(false);updateUI();}
bindPress($('#lab-load'),devLoad);bindPress($('#lab-supports'),devSupports);bindPress($('#lab-next'),devNext);
function rangeAim(){if(!match)return;const s=sides()[match.active],enemy=sides()[1-match.active],solution=rangedShot({x:s.launcher[0],y:s.launcher[1]-20},{x:enemy.center,y:match.world.foundation(1-match.active)-55},43,ammo);aimAngle=solution.angle;aimPower=clamp(solution.power,35,100);}
function setPause(value){if(!match||match.phase==='over')return;cancelAll();match.paused=value;$('#pause-overlay').hidden=!value;}
bindPress($('#hotseat'),()=>start('hotseat'));bindPress($('#cpu'),()=>start('cpu'));bindPress($('#lab'),()=>start('hotseat',true));
bindPress($('#pause'),()=>setPause(true));bindPress($('#resume'),()=>{audio.unlock();setPause(false);});bindPress($('#quit'),title);
bindPress($('#help'),()=>$('#manual').showModal());bindPress($('#close-manual'),()=>{$('#manual').close();setPause(false);});
bindPress($('#sound'),()=>{audio.unlock();audio.enabled=!audio.enabled;$('#sound').textContent=`Sound ${audio.enabled?'on':'off'}`;$('#sound').setAttribute('aria-pressed',String(audio.enabled));});
bindPress($('#ready'),()=>{if(match&&!match.isCPU()&&match.building){cancelAll();match.ready();updateUI();}});
function setView(mode){cancelAll();viewMode=mode;camera=activityFrame();}
bindPress($('#follow'),()=>setView(match?.building?'fort':'follow'));bindPress($('#enemy'),()=>setView('enemy'));bindPress($('#view'),()=>setView('overview'));
function zoom(factor,anchor={x:width/2,y:height/2}){viewMode='manual';zoomCamera(camera,factor,anchor,{width,height});}
bindPress($('#zoom-in'),()=>{cancelAll();zoom(.8);});bindPress($('#zoom-out'),()=>{cancelAll();zoom(1.25);});
canvas.addEventListener('wheel',e=>{if(!match)return;e.preventDefault();if(drag&&(drag.type==='piece'||drag.type==='move')){rotate();return;}cancelAll();const r=canvas.getBoundingClientRect();zoom(Math.exp(e.deltaY*.001),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
bindPress($('#cancel'),()=>{cancelAll();selectedEntity=null;preview=null;updateContext();});
function updateContext(){const has=!!selectedEntity||!!preview||!!held;$('#context-tools').hidden=!match?.building||match.isCPU()||!has;if($('#rotate'))$('#rotate').disabled=selectedEntity?.kind==='soldier'||held?.kind==='soldier';}
function updateUI(){
 if(!match)return;const m=match,s=sides()[m.active],key=m.phase+':'+m.active;
 if(interactionKey!==key){const previous=interactionKey;cancelAll();clearMode=false;selectedEntity=null;viewMode='auto';interactionKey=key;if(m.phase!=='flight'){camera=activityFrame();rangeAim();}if(previous){audio.play('phase');if(m.building)toast(`${s.name} · ${m.phase==='repair'?'Repair':'Build'}`);else if(m.phase==='aim')toast(`${s.name} · Shot ${Math.floor(m.volley/2)+1} of 3`);}}
 document.documentElement.style.setProperty('--turn',s.color);$('#round').textContent=`${m.phase==='repair'?'Repair':m.phase==='build'?'Build':`Round ${m.round}`} · ${m.mode==='cpu'&&m.active===1?'CPU':'Player '+(m.active+1)}`;
 $('#phase').textContent=m.phase==='flight'?`${s.name} · Incoming!`:m.building?`${s.name}, ${m.phase==='build'?'build':'repair'}.`:`${s.name}, take your shot.`;
 const countStamp=m.counts().join(':');if(countStamp!==countsKey){countsKey=countStamp;for(let side=0;side<2;side++){$('#troops'+side).innerHTML=`<b>${sides()[side].name}</b>`+Array.from({length:3},(_,i)=>`<i class="soldier-dot ${i<m.counts()[side]?'alive':''}"></i>`).join('');$('#troops'+side).setAttribute('aria-label',`${sides()[side].name}: ${m.counts()[side]} soldiers`);}}
 $('#ready').hidden=!m.building;$('#ready').disabled=m.isCPU();$('#ready').textContent=m.phase==='repair'?'Repair done →':'Ready →';
 $('#instruction').textContent=lab?`LAB · ${m.world.entities.size} bodies · K load / L supports / N phase`:m.isCPU()?(m.building?'CPU is building…':'CPU is taking its shot…'):m.phase==='flight'?'Watch it fall.':m.building?(m.phase==='repair'?(m.currentRepair()==='volatile'?'Powder: hard hits detonate · Isolate it, trap, or Skip −2s':`${m.soldierMoves[m.active]} soldier move · Place current piece or Skip −2s`):'Drag pieces · Tap a soldier, then a floor · My fort zooms in'):'Pull the ring back, then let go · Two fingers move & zoom';
 $('#follow').textContent=m.phase==='aim'?'Ballista':m.phase==='flight'?'Follow shot':'My fort';
 if(m.phase==='over'){showResult();updateContext();return;}
 if(m.revision===lastRevision&&m.phase===lastPhase){updateContext();return;}lastRevision=m.revision;lastPhase=m.phase;
 const disabled=m.isCPU()||m.phase==='flight';
 $('#controls').className=m.phase;
 if(m.building){
  if(m.phase==='repair')selected=m.currentRepair()??'brick';
  if(!m.inventories[m.active][selected])selected=PIECES.find(p=>m.inventories[m.active][p.id]>0)?.id??'brick';
  $('#controls').innerHTML=`<div class="pieces" aria-label="Construction supply">${PIECES.filter(p=>m.inventories[m.active][p.id]>0||(m.phase==='build'&&p.count>0)).map(p=>`<button class="piece ${selected===p.id?'selected':''}" data-piece="${p.id}" aria-label="${p.name}, ${m.inventories[m.active][p.id]} remaining" ${disabled||!m.inventories[m.active][p.id]?'disabled':''}><span class="piece-icon" style="color:${MATERIALS[p.material].color}">${p.icon}</span><span>${pieceLabel(p)}</span><small>${m.inventories[m.active][p.id]}</small></button>`).join('')}</div>${m.phase==='repair'?`<span class="queue-next">Next: ${PIECES.find(p=>p.id===m.queues[m.active][m.queueIndex[m.active]+1])?.name??'done'}</span><button id="discard" ${disabled||!m.currentRepair()?'disabled':''}>Skip −2s</button><button id="clear" class="${clearMode?'selected':''}" ${disabled?'disabled':''}>Clear <small>${m.clearance[m.active]}</small></button>`:''}<button id="rotate" ${disabled?'disabled':''}>Rotate ↻</button>`;
  for(const b of document.querySelectorAll('[data-piece]'))b.onpointerdown=e=>{
   if(e.button!==0||m.paused)return;audio.unlock();cancelAll();if(selected!==b.dataset.piece)rotation=0;selected=b.dataset.piece;selectedEntity=null;clearMode=false;
   document.querySelectorAll('[data-piece]').forEach(x=>x.classList.toggle('selected',x===b));
   beginPointer(e,{type:'piece',fromTray:true,piece:selected});e.preventDefault();
  };
  if($('#discard'))bindPress($('#discard'),()=>{cancelAll();selectedEntity=null;m.discardRepair();updateUI();});
  if($('#clear'))bindPress($('#clear'),()=>{cancelAll();selectedEntity=null;clearMode=!clearMode;$('#clear').classList.toggle('selected',clearMode);showNotice(clearMode?'Tap a settled fragment to clear it.':'Back to building.');});
  bindPress($('#rotate'),rotate);
 }else{
  if(ammo!=='bolt'&&!m.ammo[m.active][ammo])ammo='bolt';
  $('#controls').innerHTML=`<div class="ammo" aria-label="Ammunition">${Object.entries(AMMO).map(([id,a])=>`<button class="ammo-option ${ammo===id?'selected':''}" data-ammo="${id}" ${disabled||(id!=='bolt'&&!m.ammo[m.active][id])?'disabled':''}><span class="ammo-icon">${id==='bolt'?'↗':id==='heavy'?'⬢':'✳'}</span><span>${a.name}</span><small>${id==='bolt'?'∞':m.ammo[m.active][id]}</small></button>`).join('')}</div><p class="phase-tip">${m.phase==='flight'?'Physical wreckage stays.':'Pull to fire. Aim for a support.'}</p>`;
  for(const b of document.querySelectorAll('[data-ammo]'))bindPress(b,()=>{cancelAll();ammo=b.dataset.ammo;rangeAim();lastRevision=-1;updateUI();});
 }
 updateContext();
}
function showResult(){if(lastResult)return;lastResult=true;cancelAll();audio.play('victory');const r=match.result;$('#result').innerHTML=`<div class="panel"><div class="eyebrow">THE SIEGE IS OVER</div><h2>${r.winner<0?'A glorious draw.':sides()[r.winner].name+' takes the field.'}</h2><p>${match.counts()[0]} — ${match.counts()[1]} soldiers standing.<br>${r.reason}.</p><button class="primary" id="rematch">Again! →</button><button id="menu">Return to title</button></div>`;$('#result').hidden=false;bindPress($('#rematch'),()=>start(match.mode,lab));bindPress($('#menu'),title);}
function velocity(){const angle=aimAngle*Math.PI/180,speed=BALLISTICS.maxSpeed*aimPower/100*AMMO[ammo].scale;return{x:Math.cos(angle)*speed*sides()[match.active].direction,y:-Math.sin(angle)*speed};}
function draggedVelocity(){return drag?.type==='aim'?pullVelocity(drag.last.x-drag.start.x,drag.last.y-drag.start.y,ammo):null;}
function fireControls(){if(!match||match.isCPU()||match.paused||match.phase!=='aim')return;cancelAll();if(match.fire(velocity(),ammo))updateUI();}
function toWorld(point){const r=canvas.getBoundingClientRect(),scale=width/camera.width;return{x:(point.x-r.left-width/2)/scale+camera.x,y:(point.y-r.top-height/2)/scale+camera.y};}
function local(point){const r=canvas.getBoundingClientRect();return{x:point.x-r.left,y:point.y-r.top};}
function worldScreen(point){const scale=width/camera.width;return{x:width/2+(point.x-camera.x)*scale,y:height/2+(point.y-camera.y)*scale};}
function launcherScreen(){const s=sides()[match.active];return worldScreen({x:s.launcher[0],y:s.launcher[1]-20});}
function inCanvas(point){return inRect(point,canvas.getBoundingClientRect());}
function restoreHeld(){if(held){Matter.Composite.add(match.world.engine.world,held.body);match.world.entities.set(held.body.id,held);held=null;}preview=null;}
function cancelAll(){restoreHeld();gesture.cancel();drag=null;pinch=null;updateContext();}
function previewAt(point,action){pointer=toWorld(point);if(action.entity){const e=action.entity,x=pointer.x+(action.offset?.x??0),y=pointer.y+(action.offset?.y??0);preview=e.kind==='soldier'?match.world.soldierPlacement(e,x,y):match.world.placement(match.active,{w:e.w,h:e.h,material:e.material,shape:e.shape},x,y,rotation);}else{preview=match.world.placement(match.active,selected,pointer.x,pointer.y,rotation);}updateContext();}
function rotate(){if(!match?.building||match.isCPU()||match.paused)return;
 if(selectedEntity?.kind==='soldier')return;
 rotation=(rotation+Math.PI/2)%(Math.PI*2);
 if(selectedEntity&&!drag){const e=selectedEntity;match.world.remove(e);held=e;const p=match.world.placement(match.active,{w:e.w,h:e.h,material:e.material,shape:e.shape},e.body.position.x,e.body.position.y,rotation);if(p.valid){Matter.Body.setPosition(e.body,p);Matter.Body.setAngle(e.body,rotation);}else showNotice('That rotation needs more space.');restoreHeld();}
 else if(drag?.last&&match.building)previewAt(drag.last,drag);
}
function commit(action){
 if(action.entity&&!action.moved&&!action.tapPlace){selectedEntity=action.entity;rotation=action.entity.body.angle;updateContext();return;}
 if(!preview)return;
 if(action.entity){const e=action.entity;if(e.kind==='soldier'){if(!match.moveSoldier(e,preview.x,preview.y))showNotice('A soldier needs a clear floor.');}
 else if(preview.valid){Matter.Body.setPosition(e.body,preview);Matter.Body.setAngle(e.body,rotation);Matter.Body.setVelocity(e.body,{x:0,y:0});Matter.Body.setAngularVelocity(e.body,0);Matter.Composite.add(match.world.engine.world,e.body);match.world.entities.set(e.body.id,e);held=null;match.world.emit('place',preview.x,preview.y);}else showNotice('That piece needs an open edge.');selectedEntity=e;
 }else if(!action.fromTray||action.moved){if(!match.place(selected,preview.x,preview.y,rotation))showNotice('Green fits. Try an open edge.');}
 restoreHeld();preview=null;updateUI();
}
function beginPointer(e,action){
 const point={x:e.clientX,y:e.clientY};const result=gesture.down(e.pointerId,point,action);
 try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
 if(result==='camera'){restoreHeld();drag=null;pinch=pinchState(gesture.points);viewMode='manual';}
 else {drag=gesture.action;if(action.fromTray)previewAt(point,drag);}
}
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&gesture.points.size&&e.target!==canvas&&!gesture.points.has(e.pointerId)){if(e.target.closest('#rotate')){e.preventDefault();e.stopImmediatePropagation();lastTouchActivation=performance.now();rotate();}else cancelAll();}},true);
canvas.onpointerdown=e=>{
 if(!match||match.paused||match.phase==='over'||$('#manual').open)return;
 if(e.button!==0&&e.button!==1)return;
 audio.unlock();const point={x:e.clientX,y:e.clientY},p=toWorld(point),q=local(point);
 if(gesture.points.size){beginPointer(e,{type:'camera'});e.preventDefault();return;}
 let action={type:'pan'};
 if(e.button===1||e.shiftKey||match.isCPU()||match.phase==='flight')action={type:'pan'};
 else if(match.building){
  if(clearMode){action={type:'clear'};}else{
   const entities=[...match.world.entities.values()].filter(x=>x.side===match.active&&!x.fixed&&(x.kind==='block'||x.kind==='soldier'));
   const soldier=entities.find(x=>x.kind==='soldier'&&Math.hypot(x.body.position.x-p.x,x.body.position.y-p.y)<Math.max(16,22*camera.width/width));
   const found=soldier??entities.reverse().find(x=>Matter.Query.point([x.body],p).length);
   action=selectedEntity?.kind==='soldier'&&!soldier?{type:'move',entity:selectedEntity,offset:{x:0,y:0},tapPlace:true}:found?{type:'move',entity:found,offset:{x:found.body.position.x-p.x,y:found.body.position.y-p.y}}:{type:'piece'};
  }
 }else if(match.phase==='aim'){const ring=launcherScreen();if(Math.hypot(q.x-ring.x,q.y-ring.y)<=54)action={type:'aim'};}
 beginPointer(e,action);if(action.type==='pan')viewMode='manual';if(action.entity){selectedEntity=action.entity;rotation=action.entity.body.angle;}canvas.focus({preventScroll:true});e.preventDefault();
};
window.addEventListener('pointermove',e=>{
 const point={x:e.clientX,y:e.clientY},old=pinch,result=gesture.move(e.pointerId,point);if(!result)return;
 if(result==='camera'){const next=pinchState(gesture.points);if(old&&next){zoom(old.distance/next.distance,local(next.mid));camera.x-=(next.mid.x-old.mid.x)*camera.width/width;camera.y-=(next.mid.y-old.mid.y)*camera.width/width;}pinch=next;return;}
 drag=result;
 if(drag.type==='pan'){const previous=drag.panPoint??drag.start;camera.x-=(point.x-previous.x)*camera.width/width;camera.y-=(point.y-previous.y)*camera.width/width;drag.panPoint=point;return;}
 if(drag.type==='aim'){audio.play('tension');return;}
 if(match.building&&inCanvas(point)&&(drag.type==='piece'||drag.type==='move')){
  if(drag.entity?.kind==='block'&&drag.moved&&!held){match.world.remove(drag.entity);held=drag.entity;}
  if(!drag.entity||drag.moved)previewAt(point,drag);
 }
},{passive:false});
window.addEventListener('pointerup',e=>{
 const point={x:e.clientX,y:e.clientY},action=gesture.up(e.pointerId);pinch=pinchState(gesture.points);
 if(!action){if(!gesture.points.size){restoreHeld();drag=null;}return;}
 if(!match||match.paused||!inCanvas(point)){restoreHeld();drag=null;return;}
 if(action.type==='aim'){const v=pullVelocity(point.x-action.start.x,point.y-action.start.y,ammo);if(action.moved&&v&&match.fire(v,ammo)){drag=null;updateUI();}else{drag=null;if(action.moved)showNotice('Pull away from the enemy and slightly down.');}}
 else if(action.type==='clear'){const p=toWorld(point),e=[...match.world.entities.values()].find(x=>Matter.Query.point([x.body],p).length&&match.world.clearable(x,match.active));if(!e||!match.clear(e))showNotice('Only settled fragments with nothing resting on them.');drag=null;updateUI();}
 else if(action.type==='piece'||action.type==='move'){if(!preview&&!(action.entity&&!action.moved&&!action.tapPlace))previewAt(point,action);drag=null;commit(action);}
 else drag=null;
 updateContext();
});
window.addEventListener('pointercancel',cancelAll);window.addEventListener('lostpointercapture',e=>{if(gesture.points.has(e.pointerId))cancelAll();});
canvas.oncontextmenu=e=>{e.preventDefault();rotate();};window.addEventListener('contextmenu',e=>{if(!e.defaultPrevented&&match?.building&&drag&&(drag.type==='piece'||drag.type==='move')){e.preventDefault();rotate();}});
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT'].includes(e.target.tagName)||$('#manual').open)return;
 if(e.code==='Escape'){cancelAll();selectedEntity=null;updateContext();}
 if(e.code==='KeyR')rotate();if(e.code==='KeyV')setView(viewMode==='overview'?'auto':'overview');if(e.code==='KeyP')setPause(!match?.paused);
 if(e.code==='Space'&&match?.phase==='aim'&&!match.paused&&e.target.tagName!=='BUTTON'){e.preventDefault();fireControls();}
 if(match?.phase==='aim'){if(e.code==='ArrowUp'){aimAngle=clamp(aimAngle+1,15,78);e.preventDefault();}if(e.code==='ArrowDown'){aimAngle=clamp(aimAngle-1,15,78);e.preventDefault();}if(e.code==='ArrowRight'){aimPower=clamp(aimPower+2,10,100);e.preventDefault();}if(e.code==='ArrowLeft'){aimPower=clamp(aimPower-2,10,100);e.preventDefault();}}
 if(lab&&match){if(e.code==='KeyN')devNext();if(e.code==='KeyL')devSupports();if(e.code==='KeyK')devLoad();}
});
window.addEventListener('blur',()=>{if(match&&!match.paused)setPause(true);cancelAll();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&match)setPause(true);});
function polygon(vertices,fill,stroke='#14232b',line=2){ctx.beginPath();vertices.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function text(str,x,y,size,color='#91a2a9',align='left'){ctx.fillStyle=color;ctx.font=`500 ${size}px "Courier New",monospace`;ctx.textAlign=align;ctx.fillText(str,x,y);}
function drawBlock(e){
  const b=e.body,m=MATERIALS[e.material];
  for(const part of b.parts.length>1?b.parts.slice(1):[b])polygon(part.vertices,m.color,'#18262c',2);
  ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
  ctx.strokeStyle='#27363c';ctx.lineWidth=1.3;ctx.globalAlpha=.5;
  if(e.shape!=='wedge'&&e.shape!=='brace'){
    if(e.material==='wood'){line(-e.w*.36,0,e.w*.36,0,'#38423d',1);line(-e.w*.3,-e.h*.24,e.w*.18,-e.h*.24,'#38423d',1);}
    if(e.material==='stone'){line(-e.w*.15,-e.h*.4,-e.w*.15,e.h*.4,'#56636a',1);line(-e.w*.15,0,e.w*.44,0,'#56636a',1);}
    if(e.material==='metal'){for(const x of [-1,1]){ctx.fillStyle='#35454b';ctx.fillRect(x*(e.w/2-6)-1,-2,3,3);}}
    if(e.material==='foam'){for(let x=-e.w*.3;x<e.w*.4;x+=12){ctx.fillStyle='#4c654b';ctx.fillRect(x,-2,2,2);}}
  }
  if(e.reactive){ctx.globalAlpha=1;ctx.strokeStyle=REACTIVE[e.reactive].color;ctx.lineWidth=2;ctx.strokeRect(-e.w/2+2,-e.h/2+2,e.w-4,e.h-4);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText(REACTIVE[e.reactive].symbol,0,7);}
  if(e.health<e.maxHealth*.65||e.cracked){ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(-e.w*.25,-e.h*.45);ctx.lineTo(0,0);ctx.lineTo(-4,e.h*.2);ctx.lineTo(e.w*.3,e.h*.45);ctx.strokeStyle='#25333a';ctx.lineWidth=2;ctx.stroke();if(e.health<e.maxHealth*.35){line(0,0,e.w*.3,-e.h*.4,'#25333a',2);line(0,0,-e.w*.35,e.h*.35,'#25333a',2);}}
  ctx.restore();
}
function drawSoldier(e,t){
  const b=e.body,c=sides()[e.side].color;
  ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
  ctx.fillStyle=c;ctx.fillRect(-6,-7,12,14);ctx.fillRect(-5,8,4,6);ctx.fillRect(2,8,4,6);
  polygon([{x:-9,y:-9},{x:-6,y:-17},{x:5,y:-17},{x:8,y:-9}],c,'#17242b',1.5);
  ctx.fillStyle='#17242b';ctx.fillRect(e.side===0?2:-5,-10,3,3);line(-9,-4,-9,5,c,3);line(9,-4,9,5,c,3);
  ctx.restore();
}
function drawLauncher(side,world){
  const s=sides()[side],offset=match?.launchOffsets[side]??0,x=s.launcher[0]+offset,y=s.launcher[1],active=match?.active===side&&match?.phase==='aim';
  ctx.save();ctx.translate(x,y);ctx.scale(s.direction,1);
  line(-25,36,22,36,'#879a9d',4);line(-19,36,-7,2,'#c9b38b',7);line(19,36,5,2,'#c9b38b',7);
  let a=active?-aimAngle*Math.PI/180:-.58;if(drag?.type==='aim'&&active){const v=draggedVelocity();if(v)a=Math.atan2(v.y,v.x*s.direction);}
  if(match?.lastShot?.side===side&&world.shot){a=Math.atan2(match.lastShot.velocity.y,match.lastShot.velocity.x*s.direction);}
  const recoil=world.shot&&match?.lastShot?.side===side?-9*Math.exp(-world.shot.age/160)*Math.sin(world.shot.age/70):0;
  ctx.translate(0,-20);ctx.rotate(a);ctx.translate(recoil,0);
  polygon([{x:-29,y:-5},{x:35,y:-5},{x:40,y:5},{x:-29,y:5}],'#c9b38b');
  line(16,-24,26,0,s.color,4);line(26,0,16,24,s.color,4);line(16,-24,-15,0,'#dce5d9',1.5);line(-15,0,16,24,'#dce5d9',1.5);
  ctx.restore();

}
function drawTrajectory(v){
  if(!match||!v)return;const s=sides()[match.active],points=predictFlight({x:s.launcher[0],y:s.launcher[1]-20},v);
  ctx.fillStyle=s.color;for(let i=0,shown=visibleTrajectory(points);i<shown.length;i+=7){const p=shown[i];ctx.globalAlpha=.5*Math.min(1,(shown.length-i)/Math.max(1,shown.length*.25));ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function updateCamera(dt){
 if(drag||viewMode==='manual')return;
 targetCamera=screen==='title'?{x:demo.world.sides[1].center-300,y:640,width:1500}:activityFrame();
 const k=reducedMotion?1:1-Math.exp(-dt*6);for(const key of ['x','y','width'])camera[key]+=(targetCamera[key]-camera[key])*k;
}
function drawAimRing(){
 if(!match||match.phase!=='aim'||match.isCPU()||match.paused)return;
 const p=launcherScreen();if(p.x<15||p.x>width-15||p.y<15||p.y>height-15)return;
 ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);const color=sides()[match.active].color;
 ctx.beginPath();ctx.arc(p.x,p.y,43,0,Math.PI*2);ctx.fillStyle=color+'0c';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=color;ctx.stroke();
 ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillStyle=color;
 if(drag?.type==='aim'){const dx=clamp(drag.last.x-drag.start.x,-135,135),dy=clamp(drag.last.y-drag.start.y,-135,135),v=draggedVelocity();line(p.x,p.y,p.x+dx,p.y+dy,color,3);ctx.beginPath();ctx.arc(p.x+dx,p.y+dy,12,0,Math.PI*2);ctx.fill();const power=v?Math.round(Math.hypot(v.x,v.y)/(BALLISTICS.maxSpeed*AMMO[ammo].scale)*100):0;ctx.fillText(power+'%',p.x+dx,p.y+dy-20);}
 else ctx.fillText('PULL',p.x,p.y+65);
 ctx.restore();
}
function targetPreview(){
 if(!match||match.phase!=='aim'||match.isCPU()||camera.width>2600)return;
 const iw=Math.min(240,width*.32),ih=Math.min(145,height*.25),left=width-iw-12,top=62,enemy=sides()[1-match.active],scale=iw/650;
 ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101b23f5';ctx.fillRect(left,top,iw,ih);ctx.strokeStyle=enemy.color;ctx.lineWidth=1;ctx.strokeRect(left,top,iw,ih);ctx.beginPath();ctx.rect(left+1,top+1,iw-2,ih-2);ctx.clip();
 ctx.translate(left+iw/2,top+ih*.55);ctx.scale(scale,scale);ctx.translate(-enemy.center,-(match.world.foundation(1-match.active)-80));
 for(const b of match.world.terrainBodies)polygon(b.vertices,'#243640');
 for(const e of match.world.entities.values())if(e.side===1-match.active){if(e.kind==='block')drawBlock(e);if(e.kind==='soldier')drawSoldier(e,0);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=enemy.color;ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText('TARGET / '+enemy.name.toUpperCase(),left+8,top+14);ctx.restore();
}
function draw(time,dt){
  updateCamera(dt);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101b23';ctx.fillRect(0,0,width,height);
  const scale=width/camera.width;
  const visualShake=reducedMotion?0:shake;ctx.translate(width/2+(Math.random()-.5)*visualShake,height/2+(Math.random()-.5)*visualShake*.6);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);shake=reducedMotion?0:shake*.88;
  const world=match?.world??demo.world,g=WORLD.ground,ww=world.layout.width;
  // Survey grid, contour lines and distant cut-paper ridges.
  ctx.globalAlpha=.17;for(let x=0;x<=ww;x+=100)line(x,240,x,g,'#647783',1);for(let y=310;y<g;y+=100)line(0,y,ww,y,'#647783',1);ctx.globalAlpha=1;
  const contour=[{x:-300,y:g},{x:-300,y:650}];for(let x=0;x<=ww+400;x+=400)contour.push({x,y:570+Math.cos(x/440)*65});contour.push({x:ww+400,y:g});polygon(contour,'#17262f',null);
  line(0,360,ww,360,'#263640',1);text(ww.toLocaleString()+' / FIRING RANGE',ww/2,344,14,'#5a707c','center');
  for(const b of world.terrainBodies){polygon(b.vertices,'#1e3038','#536b70',2);}
  // Sparse strata below the ground line.
  for(let x=0;x<ww;x+=28)line(x,g+8,x-16,g+24,'#31454b',1);
  sides().forEach((s,side)=>{
    const build=match?.building&&match.active===side;
    ctx.fillStyle=s.color+(build?'0c':'04');ctx.fillRect(s.zone[0],g-world.layout.buildHeight,s.zone[1]-s.zone[0],world.layout.buildHeight);
    if(build){ctx.setLineDash([7,8]);ctx.strokeStyle=s.color+'70';ctx.lineWidth=1.5;ctx.strokeRect(s.zone[0],g-world.layout.buildHeight,s.zone[1]-s.zone[0],world.layout.buildHeight);ctx.setLineDash([]);text('CONSTRUCTION ZONE',s.center,g-world.layout.buildHeight-20,13,s.color,'center');}
    // Flag poles indicate ownership without adding colliders.
    line(s.center-182,g,s.center-182,g-136,s.color,2);polygon([{x:s.center-181,y:g-136},{x:s.center-138,y:g-130},{x:s.center-181,y:g-108}],s.color,null);
    drawLauncher(side,world);
  });
  for(const e of world.entities.values())if(e.kind==='block')drawBlock(e);
  for(const link of world.links){const a=link.anchor.body,p=Matter.Vector.add(a.position,Matter.Vector.rotate(link.constraint.pointA,a.angle));line(p.x,p.y,link.weight.body.position.x,link.weight.body.position.y,'#aad2cf',2);}
  for(const e of world.entities.values())if(e.kind==='soldier')drawSoldier(e,time);
  if(match?.phase==='aim'&&!match.isCPU()){
    let v=velocity();if(drag?.type==='aim')v=draggedVelocity();drawTrajectory(v);

  }
  if(world.shot){const trail=world.shot.trail;for(let i=1;i<trail.length;i++)line(trail[i-1].x,trail[i-1].y,trail[i].x,trail[i].y,'#e9e4cf30',2);}
  for(const e of world.entities.values())if(e.kind==='projectile'){
    const b=e.body;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(Math.atan2(b.velocity.y,b.velocity.x));
    if(e.ammo==='bolt'){polygon([{x:16,y:0},{x:-11,y:-4},{x:-8,y:0},{x:-11,y:4}],AMMO[e.ammo].color);}
    else{ctx.beginPath();ctx.arc(0,0,AMMO[e.ammo].radius,0,Math.PI*2);ctx.fillStyle=AMMO[e.ammo].color;ctx.fill();line(-4,-5,4,5,'#17242b',2);line(-4,5,4,-5,'#17242b',2);}ctx.restore();
  }
  if(preview&&match?.building&&!match.isCPU()){
    const p=held??selectedEntity??preview.piece,c=preview.valid?'#9fdbaf':'#f37977';
    ctx.save();ctx.globalAlpha=.65;for(const vertices of preview.vertices)polygon(vertices,c,c,2);ctx.restore();
    const top=Math.min(...preview.vertices.flat().map(v=>v.y));
    text(preview.valid?'RELEASE TO PLACE':'OVERLAP',preview.x,top-14,12,c,'center');
  }
  for(const wave of waves){wave.life-=dt;ctx.globalAlpha=Math.max(0,wave.life/.5);ctx.beginPath();ctx.arc(wave.x,wave.y,wave.radius*(1-wave.life/.5),0,Math.PI*2);ctx.strokeStyle='#ef985c';ctx.lineWidth=3;ctx.stroke();}waves=waves.filter(w=>w.life>0);ctx.globalAlpha=1;
  for(const p of particles){p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=dt*10;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
  if(selectedEntity&&match?.building&&match.world.entities.has(selectedEntity.body.id)){ctx.save();ctx.strokeStyle=sides()[match.active].color;ctx.lineWidth=3/(width/camera.width);ctx.setLineDash([5,3]);for(const part of selectedEntity.body.parts.length>1?selectedEntity.body.parts.slice(1):[selectedEntity.body]){ctx.beginPath();part.vertices.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.stroke();}ctx.restore();}
  targetPreview();drawAimRing();
}
function events(){
  if(!match)return;
  for(const e of match.world.events.splice(0)){
    if(e.type==='defeat')showNotice('Soldier lost. Protect the survivors.');
    audio.play(e.type,e.amount);
    if(e.type==='blast')waves.push({x:e.x,y:e.y,radius:e.amount,life:.5});
    if(e.type==='impact'||e.type==='hit'||e.type==='blast'||e.type==='break')shake=Math.max(shake,Math.min(7,e.type==='blast'?7:e.amount*.3));
    if(['impact','break','blast','defeat','place'].includes(e.type))for(let i=0;i<(e.type==='blast'?28:e.type==='place'?4:10);i++){
      const max=.3+Math.random()*.6;particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*5,vy:-Math.random()*5,life:max,max,size:e.type==='blast'?5:3,color:e.type==='defeat'?'#ffb478':MATERIALS[e.material]?.color??'#edf0db'});
    }
  }
  if(particles.length>180)particles.splice(0,particles.length-180);
}
let observedShot=null,firstImpactAt=0;
function frame(now){const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
 if(match&&!match.paused&&!$('#manual').open){
  const shot=match.world.shot;if(shot!==observedShot){observedShot=shot;firstImpactAt=0;}if(shot&&(shot.entity.hitAt||shot.entity.exploded)&&!firstImpactAt)firstImpactAt=now;
  const speed=match.phase==='flight'?(firstImpactAt?1:1.2):1;
  accumulator+=dt*1000*speed;let steps=0;
  while(accumulator>=STEP&&steps++<8){if(match.building&&held&&match.timer<=STEP/1000)cancelAll();if(match.phase==='flight'&&firstImpactAt&&now-firstImpactAt<950&&match.world.shotFinished())match.world.advance();else match.tick(STEP/1000);accumulator-=STEP;}
  events();updateUI();
 }else accumulator=0;
 if(match){const second=Math.ceil(match.timer);if(second!==lastSecond&&second<=5&&second>0&&!match.paused&&match.building)audio.play('countdown');lastSecond=second;$('#clock').textContent=match.building?String(second):`${Math.min(3,Math.floor(match.volley/2)+1)}/3`;}
 draw(now/1000,dt);requestAnimationFrame(frame);
}
window.__siege={get match(){return match;},start,snapshot:()=>match?.snapshot(),step(n=1){for(let i=0;i<n;i++)match?.tick(STEP/1000);updateUI();},worldToScreen(x,y){const p=worldScreen({x,y}),r=canvas.getBoundingClientRect();return{x:r.left+p.x,y:r.top+p.y};},get camera(){return{...camera};},get gesture(){return{points:gesture.points.size,multi:gesture.multi,type:gesture.action?.type??null};},get ring(){return match?launcherScreen():null;},get selected(){return selectedEntity?.body.id??null;},get playback(){return{firstImpactAt,observedShot:!!observedShot};}};
requestAnimationFrame(frame);
