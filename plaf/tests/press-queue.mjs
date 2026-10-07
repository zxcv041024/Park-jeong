import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
await page.goto('http://127.0.0.1:4173');
await page.waitForFunction(()=>window.__PLAF__?.snapshot().completed.includes('L'),{},{timeout:40000});
await page.locator('#reset').click();
await page.locator('#letter-input').fill('G');await page.locator('#letter-input').press('Enter');
await page.locator('#letter-input').fill('I');
await page.waitForFunction(()=> {
  const s=window.__PLAF__.snapshot(),g=s.targets.find(t=>t.text==='G');
  return s.state==='STOMP_1' && s.lamp.airborne && g?.squash===1 && Math.hypot(s.lamp.x-g.x,s.lamp.z-g.z)<.9;
},{},{timeout:45000});
await page.locator('#letter-input').press('Enter');
assert.equal(await page.locator('#letter-input').inputValue(),'');
let s=await page.evaluate(()=>window.__PLAF__.snapshot());
assert.ok(s.targets.some(t=>t.text==='I'));assert.ok(s.queue.includes('I'));
await page.waitForFunction(()=>window.__PLAF__.snapshot().completed.includes('I'),{},{timeout:55000});
s=await page.evaluate(()=>window.__PLAF__.snapshot());assert.deepEqual(s.completed,['G','I']);
assert.equal(errors.length,0,errors.join('\n'));console.log('PASS new letters queue during an intentional stomp; G then I completed with no console errors');
await browser.close();
