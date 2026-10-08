import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('tests/evidence',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=> { if(m.type()==='error') errors.push(m.text()); });
const snap=()=>page.evaluate(()=>window.__PLAF__.snapshot());
await page.goto('http://127.0.0.1:4173');
await page.evaluate(async()=> {
  const {obstacleRects,clearSegment}=await import('/src/motion.js');
  window.__routeChecks={count:0,errors:[],press:[]};
  setInterval(()=> {
    const s=window.__PLAF__.snapshot();
    if(s.travelSegment) {window.__routeChecks.count++;if(!clearSegment(s.travelSegment.from,s.travelSegment.to,obstacleRects(s.targets))) window.__routeChecks.errors.push(s);}
    for(const t of s.targets) if(t.squash<1 && t.squash>.14) window.__routeChecks.press.push({text:t.text,squash:t.squash,rotation:t.rotation});
  },80);
});
await page.waitForFunction(()=>window.__PLAF__?.snapshot().hops>=2,{},{timeout:20000});
await page.screenshot({path:'tests/evidence/intro-travel.png'});
assert.equal(await page.locator('#controls').getAttribute('inert'),'');
await page.waitForFunction(()=>window.__PLAF__.snapshot().completed.includes('L'),{},{timeout:40000});
await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('controls')).opacity)>.99);
let s=await snap();assert.ok(s.hops>=8);assert.equal(s.targets.length,4);assert.equal(s.targets.find(t=>t.text==='L').squash,.14);
assert.equal(s.targets.find(t=>t.text==='L').stomps,3);
assert.ok(s.targets.filter(t=>t.text!=='L').every(t=>t.squash===1));
await page.screenshot({path:'tests/evidence/intro-final.png'});
console.log('PASS intro: hopping entry, exactly three stomps, flattened L remains',s.hops);
await page.locator('#letter-input').fill('G');await page.locator('#letter-input').press('Enter');
assert.equal(await page.locator('#letter-input').inputValue(),'');
await page.locator('#letter-input').fill('B');await page.locator('.add').click();
await page.locator('#letter-input').fill('HELLO');await page.locator('#letter-input').press('Enter');
s=await snap();assert.deepEqual(s.queue,['B','H','E','L','L','O']);
for(const target of s.targets.filter(t=>!t.initial)) { assert.ok(Math.hypot(target.x+2.45,target.z)>2.7); }
await page.waitForFunction(()=>window.__PLAF__.snapshot().completed.includes('O'),{},{timeout:120000});
s=await snap();assert.deepEqual(s.completed,['L','G','B','H','E','L','L','O']);assert.ok(s.targets.length>=5 && s.targets.length<=11);
assert.ok(s.completedDetails.every(t=>t.squash===.14 && t.stomps===3));
await page.screenshot({path:'tests/evidence/queued-final.png'});
console.log('PASS sequential G, B, HELLO; marks retained',s.completed);
assert.equal(s.lamp.size,1.12);
const pressed=await page.evaluate(()=>window.__routeChecks.press);
assert.ok(pressed.filter(t=>t.text==='L').length>5);
assert.ok(pressed.every(t=>t.rotation.every(v=>v===0)));
await page.waitForFunction(()=> {const t=window.__PLAF__.snapshot().targets.find(t=>t.sourceText==='HELLO' && t.index===4);return t && performance.now()-t.crushedAt>=9500;},{},{timeout:15000});
assert.equal((await snap()).targets.find(t=>t.sourceText==='HELLO' && t.index===4).opacity,1);
await page.waitForFunction(()=> {const t=window.__PLAF__.snapshot().targets.find(t=>t.sourceText==='HELLO' && t.index===4);return t && t.opacity>0 && t.opacity<.7;},{},{timeout:5000});
await page.screenshot({path:'tests/evidence/fade-mid.png'});
await page.waitForFunction(()=>!window.__PLAF__.snapshot().targets.some(t=>t.sourceText==='HELLO'),{},{timeout:5000});
s=await snap();assert.equal(s.targets.length,4);assert.equal(s.targets.find(t=>t.text==='L').squash,.14);assert.equal(s.lamp.y,0);
console.log('PASS progressive upright press, 12% larger lamp, 10-second hold and smooth fade, stable lamp after expiry');
await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
await page.locator('#reset').click();s=await snap();assert.equal(s.targets.length,4);assert.ok(s.targets.every(t=>t.squash===1));assert.equal(s.queue.length,0);
await page.locator('#letter-input').fill('G');await page.locator('#letter-input').press('Enter');
await page.waitForFunction(()=>window.__PLAF__.snapshot().hops>1);
await page.locator('#reset').click();s=await snap();assert.equal(s.state,'IDLE');assert.equal(s.targets.length,4);
console.log('PASS sound, reset, reset while traveling');
await page.locator('#letter-input').fill('빛');await page.locator('#letter-input').press('Enter');
await page.waitForFunction(()=>window.__PLAF__.snapshot().completed.includes('빛'),{},{timeout:35000});
assert.equal((await snap()).targets.find(t=>t.text==='빛').squash,.14);
await page.locator('#reset').click();console.log('PASS Korean character target and squash');
for(const [width,height] of [[1366,768],[1920,1080],[2560,1440],[3840,2160],[390,844]]) {
  await page.setViewportSize({width,height});
  await page.waitForFunction(()=>document.getElementById('scene').clientWidth===innerWidth && document.getElementById('scene').clientHeight===innerHeight);
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,rect:(()=>{const r=document.getElementById('controls').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom};})(),canvas:{w:document.getElementById('scene').clientWidth,h:document.getElementById('scene').clientHeight}}));
  assert.equal(layout.scroll,width);assert.ok(layout.rect.left>=0 && layout.rect.right<=width && layout.rect.bottom<=height);
  assert.equal(layout.canvas.w,width);assert.equal(layout.canvas.h,height);
  await page.screenshot({path:`tests/evidence/viewport-${width}.png`});
}
console.log('PASS 1366, 1920, 2560, 3840, mobile responsive sizes');
await page.setViewportSize({width:1920,height:1080});await page.locator('#replay').click();
await page.waitForFunction(()=>window.__PLAF__.snapshot().completed.includes('L'),{},{timeout:40000});
s=await snap();assert.equal(s.targets.length,4);assert.deepEqual(s.completed,['L']);
assert.equal(errors.length,0,errors.join('\n'));
const routing=await page.evaluate(()=>window.__routeChecks);assert.ok(routing.count>10);assert.equal(routing.errors.length,0,'Travel segment crossed an inflated letter obstacle');
await writeFile('tests/evidence/results.json',JSON.stringify({passed:true,errors,routingChecks:routing.count,pressSamples:routing.press.length,final:s},null,2));
console.log('PASS replay and no browser console errors');
await browser.close();
