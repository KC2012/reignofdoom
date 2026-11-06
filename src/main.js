import './style.css';
import Matter from 'matter-js';
import { Match } from './match.js';
import { WORLD, SIDES, MATERIALS, PIECES, AMMO, STEP, pullVelocity, clamp } from './rules.js';
import { Audio } from './audio.js';
const $=s=>document.querySelector(s),audio=new Audio();
$('#app').innerHTML=`
<header class="mast"><a id="brand" href="#" aria-label="Return to title">R<span class="brand-mark">/</span>D <small>REIGN OF DOOM</small></a><div class="edition"><i></i> ALPHA 01 <span>PHYSICAL CASTLE WARFARE</span></div><nav><button id="help" title="Controls">? <span>Field manual</span></button><button id="sound" aria-label="Toggle sound" aria-pressed="true">SOUND ON</button><button id="pause" aria-label="Pause game">II</button></nav></header>
<main id="arena"><div id="hud" hidden><div class="army ember"><span class="side-label">01 / EMBER</span><strong id="troops0"></strong></div><div class="phase-info"><span id="round"></span><h2 id="phase"></h2><p id="instruction"></p></div><div class="army tide"><span class="side-label">02 / TIDE</span><strong id="troops1"></strong></div></div>
<div id="viewport"><canvas id="game" aria-label="Castle siege battlefield. Use the construction tray to select a block, then place it on your fort. Aim using the angle and power controls or drag the ballista." tabindex="0"></canvas><div class="canvas-label"><span id="terrainLabel">SECTOR 01 / THE LOWLANDS</span><span id="seedLabel">MIRRORED GROUND · FAIR FIGHT</span></div><div id="view-tools" hidden><button id="view">◎ Overview <kbd>V</kbd></button><button id="follow" title="Return to automatic camera">Auto camera</button></div><div id="notice" aria-live="polite"></div><div id="pause-overlay" hidden><h2>HOLD YOUR FIRE.</h2><p>The siege is paused.</p><button class="primary" id="resume">Resume siege →</button><button id="quit">Return to title</button></div></div>
<div id="controls" hidden></div>
<section id="title"><div class="title-copy"><div class="eyebrow"><span class="tiny-cross">✳</span> A SMALL-SCALE WAR OF BIG IDEAS</div><h1>REIGN<br>OF <em>DOOM.</em></h1><p class="tagline">Little forts.<br>Loud consequences.</p><p class="intro">Build something clever. Knock theirs over.<br>Protect your tiny soldiers at all costs.</p><div class="menu-actions"><button class="primary" id="cpu">Play against CPU <span>→</span></button><button class="secondary" id="hotseat">Two players <span>LOCAL HOT-SEAT →</span></button></div><div class="menu-options"><label>BATTLEFIELD<select id="terrain"><option value="valley">01 / Lowlands</option><option value="ridge">02 / The divide</option><option value="steps">03 / Stepping stones</option></select></label><label>CPU<select id="difficulty"><option value="easy">Casual</option><option value="normal" selected>Standard</option><option value="hard">Veteran</option></select></label><label>SEED<input id="seed" type="number" min="1" max="999999" value="1042"></label></div><button id="lab" class="text-button">› Open the proving ground <span>PHYSICS LAB</span></button></div><aside class="title-note"><span class="note-number">FIELD NOTES / 001</span><svg viewBox="0 0 200 100" aria-hidden="true"><path d="M15 85h170M40 85V45h28v40m58 0V45h28v40M32 35h132v10H32zM58 34V15h30v19m15 0V15h30v19"/><path class="trajectory" d="M5 65Q90-40 180 52"/><path d="m174 44 8 10-12-1"/></svg><h3>Good walls fall.<br>Great stories don't.</h3><p>Every block has weight.<br>Every support matters.<br>Every shot is personal.</p><div class="note-bottom">BUILD / BOMBARD / REPAIR <span>→</span></div></aside></section>
<section id="result" hidden aria-live="polite"></section>
</main><footer><span>NO KINGS. JUST CONSEQUENCES.</span><span id="footerHint">2 SIDES / 3 SOLDIERS / ZERO SAFE BETS</span><span>EST. ALPHA 01 <b>✳</b></span></footer>
<dialog id="manual"><button class="dialog-close" aria-label="Close manual">×</button><div class="eyebrow">THE FIELD MANUAL</div><h2>Build. Break. Repeat.</h2><ol><li><b>BUILD / 45 SECONDS</b><p>Drag pieces out of the tray, or select one and click your build zone. R or right-click rotates; Esc cancels. Ghosts snap to nearby edges. Green fits, red overlaps. Click your blocks to move them during construction.</p></li><li><b>BOMBARD / ONE SHOT EACH</b><p>Pull back from the ballista and release. Longer pull = more power. Or set angle and power, then press Fire / Space. The dotted arc predicts flight, not destruction. V toggles the wide view.</p></li><li><b>REPAIR / 15 SECONDS</b><p>Fit five new pieces into the wreckage. Timber grips, stone shatters, steel carries weight, cork cushions. Repairs never revive soldiers.</p></li><li><b>WIN / PROTECT YOUR THREE</b><p>Eliminate the other side. Falling debris and heavy compression count. After 10 rounds, the side with more survivors wins; equal survivors draw. Breaker and Burst ammo replenish on alternating repairs.</p></li></ol><p class="manual-foot">CPU builds with the same stock and placement rules. Pause with P. Touch: drag a tray piece onto the fort, then use Rotate. Artillery: drag back anywhere on the battlefield.</p><button class="primary dialog-close">Back to the field →</button></dialog>`;
const canvas=$('#game'),ctx=canvas.getContext('2d');
let match=null,demo=new Match({seed:1042}),screen='title',selected='brick',rotation=0,preview=null,drag=null,pointer=null,particles=[],shake=0,lastRevision=-1,lastPhase='',lastTime=performance.now(),accumulator=0;
let interactionKey='';
let camera={x:1200,y:570,width:2400},targetCamera={...camera},viewMode='auto',aimAngle=43,aimPower=65,ammo='bolt',lastResult=false,lab=false,draggedEntity=null;
let width=1200,height=600,dpr=1;
const phaseTitle=()=>match.building?`${SIDES[match.active].name}, ${match.phase==='build'?'build your fort.':'make it hold.'}`:match.phase==='aim'?`${SIDES[match.active].name}, take your shot.`:match.phase==='flight'?'Incoming.': 'The dust settles.';
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;}
new ResizeObserver(resize).observe($('#viewport'));
function start(mode,isLab=false){
  match?.dispose();match=new Match({mode,difficulty:$('#difficulty').value,terrain:$('#terrain').value,seed:Number($('#seed').value)||1042,lab:isLab});
  screen='game';lab=isLab;viewMode='auto';selected='brick';rotation=0;preview=null;drag=null;particles=[];lastRevision=-1;lastPhase='';lastResult=false;ammo='bolt';
  $('#title').hidden=true;$('#hud').hidden=false;$('#controls').hidden=false;$('#view-tools').hidden=false;$('#result').hidden=true;$('#pause-overlay').hidden=true;
  $('#terrainLabel').textContent={valley:'SECTOR 01 / THE LOWLANDS',ridge:'SECTOR 02 / THE DIVIDE',steps:'SECTOR 03 / STEPPING STONES'}[match.options.terrain];
  $('#seedLabel').textContent=`SEED ${match.options.seed} · ${mode==='cpu'?'VS CPU':'LOCAL TWO-PLAYER'}${lab?' · PROVING GROUND':''}`;
  audio.unlock();updateUI();resize();
}
function title(){cancelDrag();screen='title';match?.dispose();match=null;$('#title').hidden=false;$('#hud').hidden=true;$('#controls').hidden=true;$('#view-tools').hidden=true;$('#result').hidden=true;$('#pause-overlay').hidden=true;viewMode='auto';}
$('#cpu').onclick=()=>start('cpu');$('#hotseat').onclick=()=>start('hotseat');$('#lab').onclick=()=>start('hotseat',true);
$('#brand').onclick=e=>{e.preventDefault();if(screen==='game'){setPause(true);}else title();};
$('#help').onclick=()=>{if(match)setPause(true);$('#manual').showModal();};
for(const b of document.querySelectorAll('.dialog-close'))b.onclick=()=>$('#manual').close();
$('#sound').onclick=()=>{audio.unlock();audio.enabled=!audio.enabled;$('#sound').textContent=`SOUND ${audio.enabled?'ON':'OFF'}`;$('#sound').setAttribute('aria-pressed',String(audio.enabled));};
function setPause(value){if(!match||match.phase==='over')return;cancelDrag();match.paused=value;$('#pause-overlay').hidden=!value;$('#pause').textContent=value?'Play':'II';}
$('#pause').onclick=()=>setPause(!match?.paused);$('#resume').onclick=()=>setPause(false);$('#quit').onclick=title;
$('#view').onclick=()=>{viewMode=viewMode==='overview'?'fort':'overview';preview=null;};$('#follow').onclick=()=>{viewMode='auto';};
function showNotice(text){$('#notice').textContent=text;$('#notice').classList.add('visible');clearTimeout(showNotice.timeout);showNotice.timeout=setTimeout(()=>$('#notice').classList.remove('visible'),2000);}
function bindPress(button,action){
  // Some mobile browsers suppress the first compatibility click after a captured
  // construction drag. Handle touch release directly and discard its later click.
  let lastTouch=-Infinity;
  button.onpointerup=e=>{if(e.pointerType==='touch'){lastTouch=performance.now();e.preventDefault();action();}};
  button.onclick=()=>{if(performance.now()-lastTouch>600)action();};
}
function updateUI(){
  if(!match)return;
  const m=match,s=SIDES[m.active];
  const nextKey=m.phase+':'+m.active;if(interactionKey&&interactionKey!==nextKey)cancelDrag();interactionKey=nextKey;
  $('#troops0').innerHTML=Array.from({length:3},(_,i)=>`<i class="troop ${i<m.counts()[0]?'alive':''}"><span></span></i>`).join('');
  $('#troops1').innerHTML=Array.from({length:3},(_,i)=>`<i class="troop ${i<m.counts()[1]?'alive':''}"><span></span></i>`).join('');
  $('#round').textContent=`ROUND ${String(m.round).padStart(2,'0')} / 10  ·  ${m.building?'CONSTRUCTION':`VOLLEY ${Math.min(2,m.volley+1)} / 2`}`;
  $('#phase').textContent=phaseTitle();$('#phase').style.color=s.color;
  $('#instruction').textContent=m.isCPU()?(m.building?'CPU is fitting its fort together…':'CPU is choosing a firing solution…'):m.phase==='flight'?'Watch the supports. The ground is part of the weapon.':m.building?'DRAG A PIECE · R TO ROTATE · CLICK TO PLACE':'DRAG BACK & RELEASE · OR USE THE FIRING CONTROLS';
  $('#footerHint').textContent=lab?'PROVING GROUND / L: CLEAR ENEMY SUPPORTS / K: LOAD TEST / N: NEXT PHASE':'R ROTATE / V VIEW / P PAUSE / ESC CANCEL';
  if(m.phase==='over'){showResult();return;}
  if(m.revision===lastRevision&&lastPhase===m.phase)return;
  const focus=document.activeElement?.id;lastRevision=m.revision;lastPhase=m.phase;
  const disabled=m.isCPU()||m.phase==='flight';
  if(m.building){
    if(!m.inventories[m.active][selected])selected=PIECES.find(p=>m.inventories[m.active][p.id]>0)?.id??'brick';
    $('#controls').innerHTML=`<div class="tray-meta"><span class="eyebrow">${m.phase==='build'?'YOUR SUPPLY':'REPAIR DROP'}</span><strong><span id="clock"></span><small> SECONDS</small></strong></div><div class="pieces">${PIECES.filter(p=>m.inventories[m.active][p.id]>0||(m.phase==='build'&&p.count>0)).map(p=>`<button class="piece ${selected===p.id?'selected':''}" data-piece="${p.id}" ${disabled||!m.inventories[m.active][p.id]?'disabled':''} title="${p.name}: ${MATERIALS[p.material].name}"><span class="piece-icon" style="color:${MATERIALS[p.material].color}">${p.icon}</span><span>${p.name.replace('Timber ','').replace(' block','').replace(' slab','').replace(' wedge','')}<small>× ${m.inventories[m.active][p.id]}</small></span></button>`).join('')}</div><div class="build-actions"><button id="rotate" ${disabled?'disabled':''}>↻ Rotate <kbd>R</kbd></button><button id="ready" class="primary" ${disabled?'disabled':''}>${m.phase==='build'?'Fort ready':'Repair done'} →</button></div>`;
    document.querySelectorAll('[data-piece]').forEach(b=>{
      b.onpointerdown=e=>{if(e.button!==0)return;audio.unlock();selected=b.dataset.piece;rotation=0;cancelDrag();drag={type:'piece',fromTray:true,id:e.pointerId};b.setPointerCapture?.(e.pointerId);document.querySelectorAll('[data-piece]').forEach(x=>x.classList.toggle('selected',x===b));e.preventDefault();};
      b.onclick=()=>{selected=b.dataset.piece;document.querySelectorAll('[data-piece]').forEach(x=>x.classList.toggle('selected',x===b));};
    });
    bindPress($('#rotate'),rotate);bindPress($('#ready'),()=>{cancelDrag();m.ready();viewMode='auto';updateUI();});
  }else{
    if(ammo!=='bolt'&&!m.ammo[m.active][ammo])ammo='bolt';
    $('#controls').innerHTML=`<div class="tray-meta"><span class="eyebrow">BALLISTA / ${m.active+1}</span><strong><span id="clock"></span><small> SECONDS</small></strong></div><div class="ammo">${Object.entries(AMMO).map(([id,a])=>`<button class="ammo-option ${ammo===id?'selected':''}" data-ammo="${id}" ${disabled||(id!=='bolt'&&!m.ammo[m.active][id])?'disabled':''}><span class="ammo-icon">${id==='bolt'?'→':id==='heavy'?'⬢':'✳'}</span><span>${a.name}<small>${id==='bolt'?'∞':m.ammo[m.active][id]} / ${a.subtitle.split('•')[1]}</small></span></button>`).join('')}</div><div class="aim-controls"><label>ANGLE <output id="angleLabel">${aimAngle}°</output><input id="angle" aria-label="Firing angle" type="range" min="15" max="78" value="${aimAngle}" ${disabled?'disabled':''}></label><label>POWER <output id="powerLabel">${aimPower}%</output><input id="power" aria-label="Firing power" type="range" min="35" max="100" value="${aimPower}" ${disabled?'disabled':''}></label></div><button id="fire" class="primary" ${disabled?'disabled':''}>${m.phase==='flight'?'In flight…':'Fire'} <span>→</span></button>`;
    document.querySelectorAll('[data-ammo]').forEach(b=>b.onclick=()=>{ammo=b.dataset.ammo;lastRevision=-1;updateUI();});
    $('#angle').oninput=e=>{aimAngle=+e.target.value;$('#angleLabel').textContent=aimAngle+'°';};
    $('#power').oninput=e=>{aimPower=+e.target.value;$('#powerLabel').textContent=aimPower+'%';};bindPress($('#fire'),fireControls);
  }
  if(focus&&document.getElementById(focus))document.getElementById(focus).focus({preventScroll:true});
}
function showResult(){
  if(lastResult)return;lastResult=true;audio.play('victory');
  const r=match.result,win=r.winner<0?'A glorious draw.':`${SIDES[r.winner].name} takes the field.`;
  $('#result').innerHTML=`<div class="eyebrow">THE SIEGE IS OVER / ROUND ${match.round}</div><h2>${win}</h2><p>${r.reason}. ${match.counts()[0]} — ${match.counts()[1]} soldiers standing.</p><div><button class="primary" id="rematch">One more siege →</button><button id="menu">Return to title</button></div>`;$('#result').hidden=false;
  $('#rematch').onclick=()=>start(match.mode,lab);$('#menu').onclick=title;
}
function velocity(){const angle=aimAngle*Math.PI/180,speed=24.975*aimPower/100*AMMO[ammo].scale;return{x:Math.cos(angle)*speed*SIDES[match.active].direction,y:-Math.sin(angle)*speed};}
function draggedVelocity(){if(drag?.type!=='aim')return null;return pullVelocity((drag.end.x-drag.start.x)*drag.factor,(drag.end.y-drag.start.y)*drag.factor,ammo);}
function fireControls(){if(!match||match.isCPU()||match.paused)return;cancelDrag();if(match.fire(velocity(),ammo)){viewMode='auto';updateUI();}}
function toWorld(e){const r=canvas.getBoundingClientRect(),scale=width/camera.width;return {x:(e.clientX-r.left-width/2)/scale+camera.x,y:(e.clientY-r.top-height/2)/scale+camera.y};}
function inCanvas(e){const r=canvas.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function makePreview(p){if(!match?.building)return;preview=match.world.placement(match.active,selected,p.x,p.y,rotation);}
function rotate(){if(!match?.building||match.isCPU())return;rotation=(rotation+Math.PI/2)%(Math.PI*2);if(pointer){if(draggedEntity)preview=match.world.placement(match.active,{w:draggedEntity.w,h:draggedEntity.h,material:draggedEntity.material,shape:draggedEntity.shape},pointer.x,pointer.y,rotation);else makePreview(pointer);}}
function cancelDrag(){
  if(draggedEntity&&match){Matter.Composite.add(match.world.engine.world,draggedEntity.body);match.world.entities.set(draggedEntity.body.id,draggedEntity);draggedEntity=null;}
  drag=null;preview=null;
}
function commitPiece(){
  if(!preview)return;
  if(draggedEntity){
    const e=draggedEntity,check=match.world.placement(match.active,{w:e.w,h:e.h,material:e.material,shape:e.shape},preview.x,preview.y,rotation);
    if(check.valid){Matter.Body.setPosition(e.body,{x:check.x,y:check.y});Matter.Body.setAngle(e.body,rotation);Matter.Body.setVelocity(e.body,{x:0,y:0});Matter.Body.setAngularVelocity(e.body,0);Matter.Composite.add(match.world.engine.world,e.body);match.world.entities.set(e.body.id,e);draggedEntity=null;match.world.emit('place',check.x,check.y);}else {showNotice('That piece overlaps. Try an open edge.');cancelDrag();}
  }else if(!preview.valid||!match.place(selected,preview.x,preview.y,rotation)){showNotice('Find an open edge. Green means it fits.');}
  drag=null;preview=null;updateUI();
}
canvas.onpointerdown=e=>{
  if(e.button!==0||!match||match.paused||match.isCPU()||$('#manual').open)return;
  audio.unlock();canvas.focus({preventScroll:true});pointer=toWorld(e);
  if(match.building){
    const found=[...match.world.entities.values()].reverse().find(x=>x.kind==='block'&&x.side===match.active&&Matter.Query.point([x.body],pointer).length);
    if(found){
      draggedEntity=found;Matter.Composite.remove(match.world.engine.world,found.body);match.world.entities.delete(found.body.id);rotation=found.body.angle;
      drag={type:'move',id:e.pointerId};preview=match.world.placement(match.active,{w:found.w,h:found.h,material:found.material,shape:found.shape},pointer.x,pointer.y,rotation);
    }else{drag={type:'piece',id:e.pointerId};makePreview(pointer);}
  }else if(match.phase==='aim')drag={type:'aim',start:pointer,end:pointer,id:e.pointerId,factor:Math.min(1,width/camera.width/.5)};
  canvas.setPointerCapture?.(e.pointerId);e.preventDefault();
};
window.addEventListener('pointermove',e=>{
  if(!match||match.paused)return;
  if(drag&&drag.id!==e.pointerId)return;
  if(inCanvas(e)){pointer=toWorld(e);if(match.building&&!match.isCPU()){
    if(draggedEntity)preview=match.world.placement(match.active,{w:draggedEntity.w,h:draggedEntity.h,material:draggedEntity.material,shape:draggedEntity.shape},pointer.x,pointer.y,rotation);
    else makePreview(pointer);
  }}else if(drag?.type!=='aim')preview=null;
  if(drag?.type==='aim')drag.end=toWorld(e);
});
window.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.type==='aim'){
    const v=draggedVelocity();
    if(v&&match.fire(v,ammo)){viewMode='auto';updateUI();}else if(v)showNotice('Pull away from the enemy and slightly down.');
    drag=null;
  }else if(inCanvas(e)&&preview)commitPiece();else cancelDrag();
});
window.addEventListener('pointercancel',cancelDrag);canvas.oncontextmenu=e=>{e.preventDefault();rotate();};canvas.onpointerleave=()=>{if(!drag)preview=null;};
window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT'].includes(e.target.tagName)||$('#manual').open)return;
  if(e.code==='Escape'){cancelDrag();return;}
  if(e.code==='KeyR')rotate();if(e.code==='KeyV')$('#view').click();if(e.code==='KeyP')setPause(!match?.paused);
  if(e.code==='Space'){e.preventDefault();fireControls();}
  if(lab&&match){
    if(e.code==='KeyN'){if(match.building)match.ready();else if(match.phase==='flight')match.resolve();}
    if(e.code==='KeyL')for(const x of [...match.world.entities.values()])if(x.side===1&&x.kind==='block'&&x.body.position.y>750)match.world.remove(x);
    if(e.code==='KeyK'){match.world.armed=true;match.world.block(0,'stone',SIDES[0].center,570,180,36);}
  }
});
window.addEventListener('blur',()=>{if(match&&!match.paused)setPause(true);cancelDrag();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&match)setPause(true);});

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
  if(e.health<e.maxHealth*.65||e.cracked){ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(-e.w*.25,-e.h*.45);ctx.lineTo(0,0);ctx.lineTo(-4,e.h*.2);ctx.lineTo(e.w*.3,e.h*.45);ctx.strokeStyle='#25333a';ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
function drawSoldier(e,t){
  const b=e.body,c=SIDES[e.side].color;
  ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
  ctx.fillStyle=c;ctx.fillRect(-6,-7,12,14);ctx.fillRect(-5,8,4,6);ctx.fillRect(2,8,4,6);
  polygon([{x:-9,y:-9},{x:-6,y:-17},{x:5,y:-17},{x:8,y:-9}],c,'#17242b',1.5);
  ctx.fillStyle='#17242b';ctx.fillRect(e.side===0?2:-5,-10,3,3);line(-9,-4,-9,5,c,3);line(9,-4,9,5,c,3);
  ctx.restore();
}
function drawLauncher(side,world){
  const s=SIDES[side],offset=match?.launchOffsets[side]??0,x=s.launcher[0]+offset,y=s.launcher[1],active=match?.active===side&&match?.phase==='aim';
  ctx.save();ctx.translate(x,y);ctx.scale(s.direction,1);
  line(-25,36,22,36,'#879a9d',4);line(-19,36,-7,2,'#c9b38b',7);line(19,36,5,2,'#c9b38b',7);
  let a=active?-aimAngle*Math.PI/180:-.58;if(drag?.type==='aim'&&active){const v=draggedVelocity();if(v)a=Math.atan2(v.y,v.x*s.direction);}
  if(match?.lastShot?.side===side&&world.shot){a=Math.atan2(match.lastShot.velocity.y,match.lastShot.velocity.x*s.direction);}
  const recoil=world.shot&&match?.lastShot?.side===side?-9*Math.exp(-world.shot.age/160)*Math.sin(world.shot.age/70):0;
  ctx.translate(0,-20);ctx.rotate(a);ctx.translate(recoil,0);
  polygon([{x:-29,y:-5},{x:35,y:-5},{x:40,y:5},{x:-29,y:5}],'#c9b38b');
  line(16,-24,26,0,s.color,4);line(26,0,16,24,s.color,4);line(16,-24,-15,0,'#dce5d9',1.5);line(-15,0,16,24,'#dce5d9',1.5);
  ctx.restore();
  if(active){ctx.setLineDash([4,6]);ctx.beginPath();ctx.arc(x,y-20,62,0,Math.PI*2);ctx.strokeStyle=s.color+'80';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);text('PULL BACK',x,y+71,14,s.color,'center');}
}
function drawTrajectory(v){
  if(!match||!v)return;let x=SIDES[match.active].launcher[0]+match.launchOffsets[match.active],y=SIDES[match.active].launcher[1]-20,vx=v.x,vy=v.y;
  ctx.fillStyle=SIDES[match.active].color;
  for(let i=0;i<240;i++){vx*=.9998;vy=vy*.9998+.8*.001*STEP*STEP;x+=vx;y+=vy;if(i%5===0){ctx.globalAlpha=Math.max(.12,.65-i/400);ctx.beginPath();ctx.arc(x,y,i<15?3:2,0,Math.PI*2);ctx.fill();}if(y>WORLD.ground)break;}ctx.globalAlpha=1;
}
function updateCamera(dt){
  const m=match;
  if(screen==='title'){targetCamera={x:1330,y:565,width:2400};}
  else if(drag){return;}
  else if(viewMode==='overview'){targetCamera={x:1200,y:565,width:2450};}
  else if(viewMode==='fort'||(viewMode==='auto'&&m.building)){targetCamera={x:SIDES[m.active].center,y:650,width:1050};}
  else if(m.phase==='flight'&&m.world.shot){
    const p=m.world.shot.entity.body.position,enemy=SIDES[1-m.active].center;
    if(Math.abs(p.x-enemy)<370||m.world.shot.entity.hitAt)targetCamera={x:clamp(p.x,420,1980),y:clamp(p.y-70,480,650),width:1300};
    else targetCamera={x:1200,y:535,width:2450};
  }else targetCamera={x:1200,y:565,width:2450};
  // Keep both ground and towers visible in wide/short windows.
  targetCamera.width=Math.max(targetCamera.width,(height?width/height:2)*(match?.building&&viewMode!=='overview'?500:680));
  const k=1-Math.exp(-dt*4);for(const key of ['x','y','width'])camera[key]+=(targetCamera[key]-camera[key])*k;
}
function draw(time,dt){
  updateCamera(dt);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101b23';ctx.fillRect(0,0,width,height);
  const scale=width/camera.width;
  ctx.translate(width/2+(Math.random()-.5)*shake,height/2+(Math.random()-.5)*shake*.6);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);shake*=.88;
  const world=match?.world??demo.world,g=WORLD.ground;
  // Survey grid, contour lines and distant cut-paper ridges.
  ctx.globalAlpha=.17;for(let x=0;x<=2400;x+=100)line(x,240,x,g,'#647783',1);for(let y=310;y<g;y+=100)line(0,y,2400,y,'#647783',1);ctx.globalAlpha=1;
  polygon([{x:-300,y:810},{x:-300,y:660},{x:110,y:585},{x:340,y:660},{x:770,y:540},{x:1150,y:660},{x:1540,y:560},{x:1870,y:640},{x:2260,y:540},{x:2700,y:650},{x:2700,y:810}],'#17262f',null);
  line(0,360,2400,360,'#263640',1);text('↔  2,400 / FIRING RANGE',1200,344,14,'#5a707c','center');
  for(const b of world.terrainBodies){polygon(b.vertices,'#1e3038','#536b70',2);}
  // Sparse strata below the ground line.
  for(let x=0;x<2400;x+=28)line(x,g+8,x-16,g+24,'#31454b',1);
  SIDES.forEach((s,side)=>{
    const build=match?.building&&match.active===side;
    ctx.fillStyle=s.color+(build?'0c':'04');ctx.fillRect(s.zone[0],g-330,s.zone[1]-s.zone[0],330);
    if(build){ctx.setLineDash([7,8]);ctx.strokeStyle=s.color+'70';ctx.lineWidth=1.5;ctx.strokeRect(s.zone[0],g-330,s.zone[1]-s.zone[0],330);ctx.setLineDash([]);text('CONSTRUCTION ZONE',s.center,g-350,13,s.color,'center');}
    text(`0${side+1} / ${s.name.toUpperCase()}`,s.center,g+57,18,s.color,'center');
    text('HOME GROUND',s.center,g+80,12,'#65818a','center');
    // Flag poles indicate ownership without adding colliders.
    line(s.center-182,g,s.center-182,g-136,s.color,2);polygon([{x:s.center-181,y:g-136},{x:s.center-138,y:g-130},{x:s.center-181,y:g-108}],s.color,null);
    drawLauncher(side,world);
  });
  for(const e of world.entities.values())if(e.kind==='block')drawBlock(e);
  for(const e of world.entities.values())if(e.kind==='soldier')drawSoldier(e,time);
  if(match?.phase==='aim'&&!match.isCPU()){
    let v=velocity();if(drag?.type==='aim')v=draggedVelocity();drawTrajectory(v);
    if(drag?.type==='aim'){const s=SIDES[match.active],p={x:s.launcher[0],y:s.launcher[1]-20},dx=clamp(drag.end.x-drag.start.x,-135/drag.factor,135/drag.factor),dy=clamp(drag.end.y-drag.start.y,-135/drag.factor,135/drag.factor);line(p.x,p.y,p.x+dx,p.y+dy,s.color,3);ctx.beginPath();ctx.arc(p.x+dx,p.y+dy,8,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();}
  }
  if(world.shot){const trail=world.shot.trail;for(let i=1;i<trail.length;i++)line(trail[i-1].x,trail[i-1].y,trail[i].x,trail[i].y,'#e9e4cf30',2);}
  for(const e of world.entities.values())if(e.kind==='projectile'){
    const b=e.body;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(Math.atan2(b.velocity.y,b.velocity.x));
    if(e.ammo==='bolt'){polygon([{x:16,y:0},{x:-11,y:-4},{x:-8,y:0},{x:-11,y:4}],AMMO[e.ammo].color);}
    else{ctx.beginPath();ctx.arc(0,0,AMMO[e.ammo].radius,0,Math.PI*2);ctx.fillStyle=AMMO[e.ammo].color;ctx.fill();line(-4,-5,4,5,'#17242b',2);line(-4,5,4,-5,'#17242b',2);}ctx.restore();
  }
  if(preview&&match?.building&&!match.isCPU()){
    const p=draggedEntity??preview.piece,c=preview.valid?'#9fdbaf':'#f37977';
    ctx.save();ctx.globalAlpha=.65;for(const vertices of preview.vertices)polygon(vertices,c,c,2);ctx.restore();
    const top=Math.min(...preview.vertices.flat().map(v=>v.y));
    text(preview.valid?'RELEASE TO PLACE':'OVERLAP',preview.x,top-14,12,c,'center');
  }
  for(const p of particles){p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=dt*10;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
}
function events(){
  if(!match)return;
  for(const e of match.world.events.splice(0)){
    audio.play(e.type,e.amount);
    if(e.type==='impact'||e.type==='hit'||e.type==='blast'||e.type==='break')shake=Math.max(shake,Math.min(7,e.type==='blast'?7:e.amount*.3));
    if(['impact','break','blast','defeat','place'].includes(e.type))for(let i=0;i<(e.type==='blast'?28:e.type==='place'?4:10);i++){
      const max=.3+Math.random()*.6;particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*5,vy:-Math.random()*5,life:max,max,size:e.type==='blast'?5:3,color:e.type==='defeat'?'#ffb478':MATERIALS[e.material]?.color??'#edf0db'});
    }
  }
  if(particles.length>180)particles.splice(0,particles.length-180);
}
function frame(now){const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  if(match&&!match.paused&&!$('#manual').open){accumulator+=dt*1000;let steps=0;while(accumulator>=STEP&&steps++<4){match.tick(STEP/1000);accumulator-=STEP;}events();updateUI();}
  else accumulator=0;
  if(match){const clock=$('#clock');if(clock)clock.textContent=match.phase==='flight'?'—':String(Math.ceil(match.timer)).padStart(2,'0');}
  draw(now/1000,dt);requestAnimationFrame(frame);
}
// Explicit development surface; no network, hidden scoring bonuses, or alternate physics.
window.__siege={get match(){return match;},start, snapshot:()=>match?.snapshot(),step(n=1){for(let i=0;i<n;i++)match?.tick(STEP/1000);updateUI();},worldToScreen(x,y){const r=canvas.getBoundingClientRect(),s=width/camera.width;return{x:r.left+width/2+(x-camera.x)*s,y:r.top+height/2+(y-camera.y)*s};},get camera(){return{...camera};}};
requestAnimationFrame(frame);
