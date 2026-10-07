import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jumpSample, travelPlan, distance, validPlacement, obstacleRects, clearSegment, routeAround,planApproach } from '../src/motion.js';

test('preparation and landing never slide along the floor', () => {
  const options={from:{x:0,z:0},to:{x:1.8,z:1},height:1.5,flight:.46,prepare:.17,settle:.17};
  for(let t=0;t<.17;t+=.001) { const p=jumpSample(t,options);assert.equal(p.x,0);assert.equal(p.z,0);assert.equal(p.y,0); }
  for(let t=.63;t<.80;t+=.001) { const p=jumpSample(t,options);assert.equal(p.x,1.8);assert.equal(p.z,1);assert.equal(p.y,0); }
  const apex=jumpSample(.17+.46/2,options);assert.equal(apex.y,1.5);assert.equal(apex.x,.9);
});
test('distance determines hop count and every hop stays within the step length', () => {
  const from={x:10,z:3},to={x:-9,z:-4};
  const hops=travelPlan(from,to);assert.equal(hops.length,Math.ceil(distance(from,to)/1.85));
  let point=from;for(const hop of hops) { assert.ok(distance(point,hop)<=1.850001);point=hop; } assert.deepEqual(point,to);
  assert.ok(travelPlan(from,{x:9,z:3}).length<hops.length);
});
test('placements reject the lamp, existing targets and off-stage coordinates', () => {
  const targets=[{x:0,z:0,width:2}],lamp={x:8,z:3};
  assert.equal(validPlacement({x:8,z:3},2,targets,lamp),false);
  assert.equal(validPlacement({x:0,z:0},2,targets,lamp),false);
  assert.equal(validPlacement({x:10.5,z:3},3,targets,lamp),false);
  assert.equal(validPlacement({x:-6,z:-5},2,targets,lamp),true);
});

test('a blocking word causes a detour with full lamp clearance on every segment',()=> {
  const rects=obstacleRects([{id:1,x:0,z:0,width:5,squash:1}]);
  const from={x:-8,z:0},to={x:8,z:0},route=routeAround(from,to,rects);
  assert.ok(route.length>=3);let p=from,total=0;
  for(const next of route) {assert.ok(clearSegment(p,next,rects));total+=distance(p,next);p=next;}
  assert.ok(total>distance(from,to));assert.deepEqual(p,to);
});
test('approach avoids the target itself until the intentional stomp',()=> {
  const from={x:0,z:3},target={id:2,x:0,z:-5,width:3,squash:1};
  const targets=[{id:1,x:0,z:0,width:6,squash:1},target];
  const plan=planApproach(from,target,targets);assert.ok(plan);
  const rects=obstacleRects(targets);let p=from;
  for(const next of plan.route) {assert.ok(clearSegment(p,next,rects));p=next;}
  assert.ok(distance(p,target)>=1.7-1e-6);
});
test('removing a flattened obstacle allows a shorter path; new obstacles reroute it',()=> {
  const from={x:-7,z:0},to={x:7,z:0},obstacle={id:1,x:0,z:0,width:3,squash:1};
  assert.ok(routeAround(from,to,obstacleRects([obstacle])).length>1);
  assert.deepEqual(routeAround(from,to,obstacleRects([{...obstacle,squash:.14}])),[to]);
  assert.ok(routeAround(from,to,obstacleRects([obstacle])).length>1);
});
