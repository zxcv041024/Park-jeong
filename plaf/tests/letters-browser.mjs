import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('tests/evidence', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const snap = () => page.evaluate(() => window.__PLAF__.snapshot());
const submit = async text => {
  await page.locator('#letter-input').fill(text);
  await page.locator('#letter-input').press('Enter');
  const remaining = await page.locator('#letter-input').inputValue();
  if (remaining) {
    const feedback = await page.locator('#feedback').textContent();
    await writeFile('tests/evidence/letters-rejection.json', JSON.stringify({ text, feedback, snapshot: await snap() }, null, 2));
    await page.screenshot({ path: 'tests/evidence/letters-rejection.png' });
    assert.equal(remaining, '', `The stage rejected ${JSON.stringify(text)}: ${feedback}`);
  }
};
const groupTargets = (snapshot, text) => snapshot.targets.filter(target => !target.initial && target.sourceText === text).sort((a, b) => a.index - b.index);
const checkGroup = (targets, text) => {
  assert.deepEqual(targets.map(target => target.text), text);
  assert.equal(new Set(targets.map(target => target.id)).size, targets.length, 'Repeated letters need separate target IDs');
  assert.equal(new Set(targets.map(target => target.groupId)).size, 1);
  assert.ok(targets[0].groupId !== undefined && targets[0].groupId !== null);
  assert.ok(targets.every(target => target.width > 0 && target.height > 0));
  for (let index = 1; index < targets.length; index++) assert.ok(targets[index].x > targets[index - 1].x, 'Word letters must read from left to right');
};
const resizeCheck = async (width, height, screenshotPath) => {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(() => document.getElementById('scene').clientWidth === innerWidth && document.getElementById('scene').clientHeight === innerHeight);
  const layout = await page.evaluate(() => {
    const controls = document.getElementById('controls').getBoundingClientRect();
    return { scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, left: controls.left, right: controls.right, bottom: controls.bottom };
  });
  assert.equal(layout.scrollWidth, layout.viewportWidth, `Horizontal overflow at ${width}x${height}`);
  assert.ok(layout.left >= 0 && layout.right <= width && layout.bottom <= height, `Controls leave the viewport at ${width}x${height}`);
  if (screenshotPath) await page.screenshot({ path: screenshotPath });
};

try {
  await page.goto(process.env.PLAF_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(() => window.__PLAF__?.snapshot().completed.includes('L'), {}, { timeout: 40000 });
  await page.locator('#reset').click();
  let snapshot = await snap();
  assert.equal(snapshot.animationSpeed, 1.3);
  assert.equal(snapshot.stompSpeed, 1.2);
  assert.equal(snapshot.fontFamily, 'Optimer Bold');

  await submit('HELLO');
  snapshot = await snap();
  const hello = groupTargets(snapshot, 'HELLO');
  checkGroup(hello, ['H', 'E', 'L', 'L', 'O']);
  const helloGroup = hello[0].groupId;
  assert.deepEqual(hello.map(target => target.index), [0, 1, 2, 3, 4]);
  await page.evaluate(ids => {
    window.__letterChecks = { impacts: [], samples: [], previous: {}, ids };
    window.__letterChecksTimer = setInterval(() => {
      const snapshot = window.__PLAF__.snapshot(), checks = window.__letterChecks;
      const targets = snapshot.targets.filter(target => checks.ids.includes(target.id)).sort((a, b) => a.index - b.index);
      checks.samples.push(targets.map(target => ({ id: target.id, index: target.index, squash: target.squash, stomps: target.stomps })));
      for (const target of targets) {
        const previous = checks.previous[target.id] || 0;
        for (let impact = previous + 1; impact <= target.stomps; impact++) checks.impacts.push({ id: target.id, text: target.text, index: target.index, impact });
        checks.previous[target.id] = target.stomps;
      }
    }, 60);
  }, hello.map(target => target.id));
  await page.screenshot({ path: 'tests/evidence/letters-word.png' });
  await resizeCheck(1920, 1080, 'tests/evidence/letters-word-1920.png');
  await resizeCheck(2560, 1440, 'tests/evidence/letters-word-2560.png');
  await resizeCheck(1366, 768);
  await page.waitForFunction(id => {
    const target = window.__PLAF__.snapshot().targets.find(target => target.id === id);
    return target?.stomps === 1 && target.squash < .98 && target.squash > .15;
  }, hello[0].id, { timeout: 40000 });
  snapshot = await snap();
  const pressing = groupTargets(snapshot, 'HELLO');
  assert.ok(pressing[0].squash < 1 && pressing[0].squash > .14);
  assert.ok(pressing.slice(1).every(target => target.squash === 1 && target.stomps === 0), 'Only H should squash during its first press');
  await page.screenshot({ path: 'tests/evidence/letters-first-press.png' });

  await submit('ABC');
  snapshot = await snap();
  const abc = groupTargets(snapshot, 'ABC');
  checkGroup(abc, ['A', 'B', 'C']);
  assert.notEqual(abc[0].groupId, helloGroup);
  assert.deepEqual(snapshot.queue, ['E', 'L', 'L', 'O', 'A', 'B', 'C'], 'A new word must follow all remaining letters of the active word');
  assert.ok(abc.every(target => target.stomps === 0 && target.squash === 1));
  await page.waitForFunction(groupId => window.__PLAF__.snapshot().completedDetails.filter(target => target.groupId === groupId).length === 5, helloGroup, { timeout: 90000 });
  snapshot = await snap();
  const completed = snapshot.completedDetails.filter(target => target.groupId === helloGroup);
  assert.deepEqual(completed.map(target => target.id), hello.map(target => target.id));
  assert.deepEqual(completed.map(target => target.text), ['H', 'E', 'L', 'L', 'O']);
  assert.deepEqual(completed.map(target => target.index), [0, 1, 2, 3, 4]);
  assert.ok(completed.every(target => target.stomps === 3 && target.squash === .14), 'Every individual glyph needs exactly three impacts and the final squash');
  assert.deepEqual(snapshot.completed.slice(0, 5), ['H', 'E', 'L', 'L', 'O']);
  const checks = await page.evaluate(() => { clearInterval(window.__letterChecksTimer); return window.__letterChecks; });
  assert.deepEqual(checks.impacts, hello.flatMap(target => [1, 2, 3].map(impact => ({ id: target.id, text: target.text, index: target.index, impact }))));
  assert.ok(checks.samples.some(sample => sample.some(target => target.squash > .14 && target.squash < 1)));
  for (const sample of checks.samples) {
    assert.ok(sample.filter(target => target.squash > .14 && target.squash < 1).length <= 1, 'Two sibling letters squashed together');
    for (const target of sample.filter(target => target.stomps > 0)) {
      assert.ok(sample.filter(other => other.index < target.index).every(other => other.squash === .14 && other.stomps === 3), 'A later letter began before earlier letters finished');
    }
  }
  console.log('PASS HELLO: separate H/E/L/L/O targets, independent presses, exactly three impacts each, ABC queued behind the word');

  await page.locator('#reset').click();
  snapshot = await snap();
  assert.equal(snapshot.state, 'IDLE');
  assert.equal(snapshot.targets.length, 4);
  assert.ok(snapshot.targets.every(target => target.initial && target.squash === 1 && target.stomps === 0));
  assert.deepEqual(snapshot.queue, []);
  assert.deepEqual(snapshot.completed, []);
  assert.deepEqual(snapshot.completedDetails, []);

  await submit('A B');
  snapshot = await snap();
  checkGroup(groupTargets(snapshot, 'A B'), ['A', 'B']);
  assert.equal(snapshot.targets.filter(target => !target.initial).length, 2, 'Whitespace must not become an invisible stomp target');
  await page.locator('#reset').click();
  await submit('가가');
  snapshot = await snap();
  checkGroup(groupTargets(snapshot, '가가'), ['가', '가']);
  assert.equal(snapshot.targets.filter(target => !target.initial).length, 2, 'Repeated Korean glyphs must be created atomically');
  await page.screenshot({ path: 'tests/evidence/letters-korean.png' });
  await page.locator('#reset').click();
  snapshot = await snap();
  assert.equal(snapshot.state, 'IDLE');
  assert.equal(snapshot.targets.length, 4);
  assert.deepEqual(snapshot.queue, []);
  assert.deepEqual(snapshot.completedDetails, []);

  const emojiWord = '😀'.repeat(8), input = page.locator('#letter-input');
  await input.pressSequentially(emojiWord);
  assert.equal(await input.inputValue(), emojiWord, 'Native input must allow eight graphemes even when they use sixteen UTF-16 code units');
  await input.press('Enter');
  assert.equal(await input.inputValue(), '', 'Eight emoji graphemes must submit successfully');
  snapshot = await snap();
  checkGroup(groupTargets(snapshot, emojiWord), Array(8).fill('😀'));
  assert.equal(snapshot.targets.filter(target => !target.initial).length, 8, 'Eight emoji must become eight separate glyph targets');
  await page.locator('#reset').click();
  const tooMany = '😀'.repeat(9);
  await input.pressSequentially(tooMany);
  assert.equal(await input.inputValue(), tooMany, 'Native input must leave grapheme validation to the form');
  await input.press('Enter');
  assert.equal(await input.inputValue(), tooMany, 'Rejected text must remain available to edit');
  assert.match(await page.locator('#feedback').textContent(), /최대\s*8/, 'Nine graphemes need clear maximum-eight feedback');
  snapshot = await snap();
  assert.equal(snapshot.targets.filter(target => !target.initial).length, 0, 'A rejected word must not create a partial group');
  assert.deepEqual(snapshot.queue, []);
  await page.locator('#reset').click();
  snapshot = await snap();
  assert.equal(errors.length, 0, errors.join('\n'));
  await writeFile('tests/evidence/letters-results.json', JSON.stringify({ passed: true, errors, impactEvents: checks.impacts, sampleCount: checks.samples.length, completed, final: snapshot }, null, 2));
  console.log('PASS spaces, repeated Korean glyphs, eight-emoji native input, nine-grapheme rejection, 1920/2560 layouts, active reset, speeds, Optimer Bold, and no console errors');
} finally {
  await browser.close();
}
