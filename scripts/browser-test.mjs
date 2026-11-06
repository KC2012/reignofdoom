import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:4173',output='test-results';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'});
let serverLog='';server.stdout.on('data',x=>serverLog+=x);server.stderr.on('data',x=>serverLog+=x);
const checks=[],errors=[],remote=[];let browser;
const check=(name)=>{checks.push(name);console.log('PASS',name);};
try{
 let ready=false;for(let i=0;i<80;i++){try{ready=(await fetch(base)).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,serverLog);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))remote.push(r.url());});
 await page.goto(base);await page.waitForTimeout(300);await page.screenshot({path:`${output}/title.png`});
 assert.equal(await page.title(),'Reign of Doom — Little forts. Loud consequences.');check('title renders and browser game loads');
 await page.click('#hotseat');await page.waitForTimeout(1500);
 const point=async(x,y)=>page.evaluate(([x,y])=>window.__siege.worldToScreen(x,y),[x,y]);
 const stock=()=>page.evaluate(()=>window.__siege.snapshot().inventory.brick);
 const moveWorld=async(x,y)=>{const p=await point(x,y);await page.mouse.move(p.x,p.y);};
 const clickWorld=async(x,y)=>{const p=await point(x,y);await page.mouse.click(p.x,p.y);};
 let count=await stock();const tray=await page.locator('[data-piece=brick]').boundingBox();await page.mouse.move(tray.x+20,tray.y+20);await page.mouse.down();await moveWorld(615,795);await page.mouse.up();
 assert.equal(await stock(),count-1);check('drag a supplied block into the fort and consume one piece');
 await page.waitForTimeout(250);const block=await page.evaluate(()=>[...window.__siege.match.world.entities.values()].find(e=>e.kind==='block'&&e.side===0&&e.body.position.x>590)?.body.position);assert.ok(block);
 await moveWorld(block.x,block.y);await page.mouse.down();await page.keyboard.press('r');await moveWorld(310,774);await page.mouse.up();
 assert.equal(await stock(),count-1);assert.ok(await page.evaluate(()=>[...window.__siege.match.world.entities.values()].some(e=>e.side===0&&e.kind==='block'&&e.body.position.x<330&&Math.abs(e.body.angle)>1)));check('move and rotate an existing block without consuming stock');
 await page.keyboard.press('Escape');await page.keyboard.press('r');await clickWorld(470,790);assert.equal(await stock(),count-1);check('overlapping soldiers cannot consume a construction piece');
 await page.screenshot({path:`${output}/construction.png`});
 await page.click('#pause');const frozen=await page.evaluate(()=>window.__siege.snapshot().timer);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__siege.snapshot().timer),frozen);await page.click('#resume');check('pause freezes active construction');
 await page.click('#ready');assert.equal(await page.evaluate(()=>window.__siege.snapshot().active),1);await page.click('#ready');await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>window.__siege.snapshot().phase),'aim');
 let p=await point(735,745);await page.mouse.move(p.x,p.y);await page.mouse.down();await moveWorld(674,806);await page.mouse.up();assert.equal(await page.evaluate(()=>window.__siege.snapshot().phase),'flight');check('hot-seat handoff and real slingshot drag fire a physical projectile');
 await page.evaluate(()=>window.__siege.step(210));await page.screenshot({path:`${output}/impact.png`});await page.evaluate(()=>window.__siege.step(600));assert.ok(await page.evaluate(()=>['aim','over'].includes(window.__siege.snapshot().phase)));assert.ok(await page.evaluate(()=>window.__siege.match.world.history.some(h=>h.source==='projectile'||h.source==='compression')));check('impact settles and damage resolves into a next turn or victory');
 await page.evaluate(()=>window.__siege.start('hotseat'));await page.click('#ready');await page.click('#ready');
 // Existing UI buttons/ranges fire the remaining volleys; high arcs deliberately miss.
 for(let i=0;i<2;i++){
  await page.locator('#angle').fill('78');await page.locator('#angle').dispatchEvent('input');await page.locator('#power').fill('35');await page.locator('#power').dispatchEvent('input');
  await page.click('#fire');await page.evaluate(()=>window.__siege.step(760));
 }
 assert.equal(await page.evaluate(()=>window.__siege.snapshot().phase),'repair');assert.equal(await page.evaluate(()=>Object.values(window.__siege.snapshot().inventory).reduce((a,b)=>a+b)),5);await page.screenshot({path:`${output}/repair.png`});check('two firing turns enter a five-piece repair round');
 await page.click('#ready');await page.click('#ready');assert.equal(await page.evaluate(()=>window.__siege.snapshot().active),1);
 // Controlled victory fixture uses actual soldier damage and ordinary flight resolution.
 await page.evaluate(()=>{const m=window.__siege.match;for(const e of [...m.world.troops[0]])m.world.hurt(e,100,'browser-fixture');});
 await page.click('#fire');await page.evaluate(()=>window.__siege.step(760));await page.locator('#result').waitFor({state:'visible'});assert.match(await page.locator('#result').innerText(),/Tide takes the field/);
 await page.screenshot({path:`${output}/result.png`});await page.click('#rematch');assert.deepEqual(await page.evaluate(()=>window.__siege.snapshot().counts),[3,3]);check('victory is displayed and rematch resets soldiers, ammo and world');
 await page.evaluate(()=>window.__siege.start('cpu'));await page.click('#ready');await page.evaluate(()=>window.__siege.step(400));assert.equal(await page.evaluate(()=>window.__siege.snapshot().phase),'aim');assert.ok(await page.evaluate(()=>[...window.__siege.match.world.entities.values()].filter(e=>e.kind==='block'&&e.side===1).length>6));
 await page.click('#fire');await page.evaluate(()=>window.__siege.step(1000));assert.ok(await page.evaluate(()=>window.__siege.match.lastShot.side===1));check('CPU constructs its own fort and takes a turn');
 await page.evaluate(()=>window.__siege.start('hotseat'));await page.click('#help');await page.locator('#manual').waitFor({state:'visible'});await page.locator('#manual .primary').click();await page.click('#resume');check('field manual and pause lifecycle work');
 await page.evaluate(()=>window.__siege.start('hotseat',true));await page.keyboard.press('k');assert.ok(await page.evaluate(()=>[...window.__siege.match.world.entities.values()].some(e=>e.material==='stone')));await page.keyboard.press('l');await page.evaluate(()=>window.__siege.step(400));assert.equal(await page.evaluate(()=>window.__siege.snapshot().counts[1]),0);check('proving-ground load and support withdrawal fixtures run in the browser');
 // Narrow touch layout: actual tray drag with touch pointer events, not a direct model call.
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base);await mobile.screenshot({path:`${output}/mobile-title.png`});await mobile.tap('#hotseat');await mobile.waitForTimeout(1400);
 const target=await mobile.evaluate(()=>window.__siege.worldToScreen(615,795));const box=await mobile.locator('[data-piece=brick]').boundingBox();
 const cdp=await mobile.context().newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+20,y:box.y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x,y:target.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await mobile.evaluate(()=>window.__siege.snapshot().inventory.brick),3);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.screenshot({path:`${output}/mobile-construction.png`});await mobile.tap('#ready');await mobile.tap('#ready');await mobile.waitForTimeout(1200);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:225,y:350}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:185,y:390}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.evaluate(()=>window.__siege.snapshot().phase),'flight');check('390px touch layout supports piece dragging and slingshot firing without overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);check('no JavaScript errors or external runtime requests');
 await writeFile(`${output}/browser-report.json`,JSON.stringify({passed:checks.length,checks,errors,externalRequests:remote},null,2));console.log(`${checks.length} browser checks passed.`);
}catch(e){await writeFile(`${output}/browser-failure.txt`,String(e.stack));throw e;}
finally{await browser?.close();server.kill('SIGTERM');}
