import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173');
await page.waitForFunction(()=>window.__PLAF__?.snapshot().completed.includes('L'),{},{timeout:40000});
await page.locator('#letter-input').fill('G');await page.locator('#letter-input').press('Enter');
await page.waitForFunction(()=> {
  const s=window.__PLAF__.snapshot(),g=s.targets.find(t=>t.text==='G');
  return s.state==='STANDING_ON_TARGET' && g?.stomps===3 && g.crushedAt!==null && !s.completed.includes('G');
},{},{timeout:40000});
await page.evaluate(()=> {
  window.__testHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__testHidden});
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(13200);
await page.evaluate(()=> {window.__testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
await page.waitForFunction(()=> {const s=window.__PLAF__.snapshot();return s.completed.includes('G') && !s.targets.some(t=>t.text==='G') && s.lamp.y===0;},{},{timeout:6000});
assert.equal(errors.length,0);console.log('PASS paused tab during final standing turn: completed target expires safely and lamp settles on floor');
await browser.close();
