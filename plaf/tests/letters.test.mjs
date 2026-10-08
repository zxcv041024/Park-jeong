import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { layoutLetters, obstacleRects, clearSegment, planApproach } from '../src/motion.js';

const font = new FontLoader().parse(JSON.parse(readFileSync(new URL('../node_modules/three/examples/fonts/optimer_bold.typeface.json', import.meta.url), 'utf8')));
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} versus ${expected}`);
function glyph(text) {
  const geometry = new TextGeometry(text, { font, size: 3.25, depth: .075, curveSegments: 10, bevelEnabled: true, bevelThickness: .012, bevelSize: .006, bevelSegments: 2 });
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const result = { text, width: max.x - min.x, height: max.y - min.y };
  geometry.dispose();
  return result;
}

function checkLayout(descriptors, maxWidth = 16.8) {
  const result = layoutLetters(descriptors, maxWidth);
  assert.equal(result.members.length, descriptors.length);
  assert.ok(result.scale > 0 && result.scale <= 1);
  assert.ok(result.width <= maxWidth + 1e-6);
  close(result.height, Math.max(...descriptors.map(d => d.height)) * result.scale, 'Common word height');
  result.members.forEach((member, index) => {
    assert.equal(member.text, descriptors[index].text);
    assert.equal(member.index, index);
    close(member.width, descriptors[index].width * result.scale, 'Common horizontal scale');
    close(member.height, descriptors[index].height * result.scale, 'Common vertical scale');
    if (index) {
      const previous = result.members[index - 1];
      const gap = member.x - previous.x - (member.width + previous.width) / 2;
      const minimum = Math.max(.42, 1.18 - Math.min(member.width, previous.width) / 2);
      assert.ok(gap >= minimum - 1e-6, `Letters ${index - 1}/${index} need ${minimum} clearance; got ${gap}`);
    }
  });
  const first = result.members[0], last = result.members.at(-1);
  close(first.x - first.width / 2, -result.width / 2, 'Left edge centered');
  close(last.x + last.width / 2, result.width / 2, 'Right edge centered');
  return result;
}

test('individual letters share a scale, keep their order, and center the word', () => {
  const descriptors = ['H', 'E', 'L', 'L', 'O'].map(glyph);
  const before = structuredClone(descriptors);
  const result = checkLayout(descriptors);
  assert.deepEqual(descriptors, before, 'Layout must not modify reusable glyph measurements');
  assert.deepEqual(result.members.map(m => m.index), [0, 1, 2, 3, 4]);
  assert.ok(result.members[2].x < result.members[3].x, 'Repeated L glyphs remain separate members');
});

test('whitespace adds a scaled gap without creating a target', () => {
  const descriptors = ['A', 'B'].map(glyph);
  const ordinary = checkLayout(descriptors, 100);
  const spaced = checkLayout([descriptors[0], { ...descriptors[1], extraGapBefore: 1.2 }], 100);
  assert.equal(spaced.members.length, 2);
  close(spaced.scale, ordinary.scale, 'Unconstrained common scale');
  close(spaced.width - ordinary.width, 1.2 * spaced.scale, 'Whitespace advance');
});

for (const text of ['III', 'IIIIIIII', 'WWWWWWWW']) {
  test(`${text}: every sequential stomp has a clear approach from the previous crushed letter`, () => {
    const result = checkLayout(Array.from(text, glyph));
    if (text === 'WWWWWWWW') assert.ok(result.scale < 1, 'Eight wide letters must fit through shared scaling');
    const targets = result.members.map((member, index) => ({ ...member, id: index + 1, z: 0, spread: 1, squash: 1 }));
    let from = { x: result.width / 2 + 3, z: 3 };
    for (const target of targets) {
      const plan = planApproach(from, target, targets);
      assert.ok(plan, `No approach to ${text}[${target.index}] from the previous letter center`);
      const rects = obstacleRects(targets);
      let point = from;
      for (const next of plan.route) {
        assert.ok(clearSegment(point, next, rects), `Travel crosses an upright glyph before index ${target.index}`);
        point = next;
      }
      assert.ok(clearSegment(plan.approach, target, rects.filter(r => r.id !== target.id)), 'Intentional stomp must clear upright siblings');
      target.squash = .14;
      from = { x: target.x, z: target.z };
    }
  });
}

test('repeated Unicode fallback glyphs retain separate positions and safe routing', () => {
  const result = checkLayout(Array.from({ length: 8 }, () => ({ text: '가', width: 2.8, height: 2.95 })));
  const targets = result.members.map((member, index) => ({ ...member, id: index + 1, z: -3, squash: 1, spread: 1 }));
  let from = { x: -10, z: 2 };
  for (const target of targets) {
    assert.ok(planApproach(from, target, targets), `Repeated Unicode member ${target.index} must remain reachable`);
    target.squash = .14;
    from = target;
  }
});
