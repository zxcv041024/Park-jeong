import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const before=process.env.PLAF_BEFORE==='1';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:2});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.addInitScript(()=>{
    window.__perf={draws:0,triangles:0,intervals:[],last:0};
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args){
      const gl=get.apply(this,args);
      if(gl && args[0]==='webgl2' && !gl.__profiled){
        gl.__profiled=true;const draw=gl.drawElements.bind(gl);
        gl.drawElements=(mode,count,...rest)=>{window.__perf.draws++;window.__perf.triangles+=count/3;return draw(mode,count,...rest);};
      }
      return gl;
    };
    const sample=t=>{if(window.__perf.last) window.__perf.intervals.push(t-window.__perf.last);window.__perf.last=t;requestAnimationFrame(sample);};
    requestAnimationFrame(sample);
  });
  await page.goto(process.env.PLAF_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(()=>window.__PLAF__?.snapshot().hops>=2,{}, {timeout:40000});
  if(!before) await page.waitForTimeout(6500);
  const start=await page.evaluate(()=>({draws:__perf.draws,triangles:__perf.triangles,n:__perf.intervals.length,time:performance.now()}));
  await page.waitForFunction(start=>performance.now()-start>5000,start.time,{timeout:10000});
  const perf=await page.evaluate(start=>{
    const intervals=__perf.intervals.slice(start.n).sort((a,b)=>a-b),seconds=(performance.now()-start.time)/1000;
    const canvas=document.querySelector('#scene'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {frames:intervals.length,medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],drawsPerSecond:(__perf.draws-start.draws)/seconds,trianglesPerSecond:(__perf.triangles-start.triangles)/seconds,canvas:[canvas.width,canvas.height],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'};
  },start);
  await page.waitForFunction(()=>window.__PLAF__.snapshot().completed.includes('L'),{}, {timeout:50000});
  await page.locator('#reset').click();
  await page.locator('#letter-input').fill('가');
  await page.evaluate(()=>{
    const input=document.querySelector('#letter-input');input.dispatchEvent(new CompositionEvent('compositionstart',{data:'ㄱ',bubbles:true}));
    document.querySelector('#letter-form').requestSubmit();
  });
  const premature=await page.evaluate(()=>window.__PLAF__.snapshot().targets.filter(t=>!t.initial).length);
  if(before) console.log('BEFORE: targets created during IME composition',premature);
  else {
    assert.equal(premature,0,'IME confirmation must not submit a partial Korean glyph');
    assert.equal(await page.locator('#letter-input').inputValue(),'가');
    await page.evaluate(()=>document.querySelector('#letter-input').dispatchEvent(new CompositionEvent('compositionend',{data:'가',bubbles:true})));
    await page.waitForTimeout(80);
    await page.locator('#letter-input').press('Enter');
    assert.equal(await page.locator('#letter-input').inputValue(),'');
    assert.deepEqual(await page.evaluate(()=>window.__PLAF__.snapshot().targets.filter(t=>!t.initial).map(t=>t.text)),['가']);
    await page.locator('#reset').click();
    await page.evaluate(()=>{livelyPropertyListener('letters','한글');livelyPropertyListener('add','추가');});
    assert.equal(await page.evaluate(()=>window.__PLAF__.snapshot().targets.filter(t=>!t.initial).length),0,'Property initialization must not enqueue');
    await page.evaluate(()=>livelyPropertyListener('add',true));
    assert.deepEqual(await page.evaluate(()=>window.__PLAF__.snapshot().targets.filter(t=>!t.initial).map(t=>t.text)),['한','글']);
    await page.waitForFunction(()=>window.__PLAF__.snapshot().completedDetails.filter(t=>t.groupId!==null).length===2,{}, {timeout:65000});
    assert.ok(await page.evaluate(()=>window.__PLAF__.snapshot().completedDetails.every(t=>t.stomps===3)));
    assert.ok(perf.canvas[0]<=1920 && perf.canvas[1]<=1080,'Pixel count must stay bounded on high-DPI screens');
    assert.ok(perf.medianMs<30,`Median frame interval remains too high: ${perf.medianMs}ms`);
  }
  assert.deepEqual(errors,[]);
  await mkdir('tests/evidence',{recursive:true});
  await writeFile(`tests/evidence/runtime-${before?'before':'after'}.json`,JSON.stringify({perf,premature,errors},null,2));
  console.log(JSON.stringify({before,perf,premature,errors}));
} finally {await browser.close();}
