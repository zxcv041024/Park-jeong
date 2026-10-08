import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createLamp } from '../src/lamp.js';
import { clamp, mix, smooth, jumpSample, validPlacement, planApproach } from '../src/motion.js';

// Exercise the production framing helpers without starting the browser scene.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const framingSource=source.slice(source.indexOf('// View-space envelope'),source.indexOf('function state(value)'));
const camera=new THREE.OrthographicCamera(-12,12,6.75,-6.75,.1,120);
const cameraHome=new THREE.Vector3(0,14,28);
camera.position.copy(cameraHome);camera.lookAt(0,1.5,0);camera.updateMatrixWorld(true);
const context=vm.createContext({THREE,camera,cameraHome,clamp,mix});
vm.runInContext(framingSource+'\nglobalThis.framing={framedStompHeight,hasStompHeadroom,STOMP_LAMP_ENVELOPE,MIN_STOMP_HEIGHT,MIN_FRAME_HEIGHT,FRAME_UP_OFFSET};',context);
const {framedStompHeight,hasStompHeadroom,STOMP_LAMP_ENVELOPE,MIN_STOMP_HEIGHT,MIN_FRAME_HEIGHT,FRAME_UP_OFFSET}=context.framing;

// Only the procedural contact-shadow texture requires a canvas in createLamp.
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const lamp=createLamp(new THREE.Scene());
const meshes=[];
lamp.root.traverse(mesh=> {
  if(!mesh.isMesh || mesh.material.opacity<.1) return; // Exclude the decorative light beam.
  mesh.geometry.computeBoundingBox();
  meshes.push(mesh);
});
const point=new THREE.Vector3();
function visitBounds(visitor) {
  for(const mesh of meshes) {
    const {min,max}=mesh.geometry.boundingBox;
    for(const x of [min.x,max.x]) for(const y of [min.y,max.y]) for(const z of [min.z,max.z]) {
      point.set(x,y,z).applyMatrix4(mesh.matrixWorld);visitor(point);
    }
  }
}
function setFrame(width,height) {
  const aspect=width/height,h=Math.max(MIN_FRAME_HEIGHT,24/aspect);
  camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2+FRAME_UP_OFFSET;camera.bottom=-h/2+FRAME_UP_OFFSET;
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
const font=new FontLoader().parse(JSON.parse(readFileSync(new URL('../node_modules/three/examples/fonts/optimer_bold.typeface.json',import.meta.url),'utf8')));
function glyph(text,id,x,z) {
  const geometry=new TextGeometry(text,{font,size:3.25,depth:.075,curveSegments:10,bevelEnabled:true,bevelThickness:.012,bevelSize:.006,bevelSegments:2});
  geometry.computeBoundingBox();const {min,max}=geometry.boundingBox;
  const target={id,text,x,z,width:max.x-min.x,height:max.y-min.y,squash:1,spread:1};
  geometry.dispose();return target;
}
const originals=['P','L','A','F'].map((text,i)=>glyph(text,i,[-7.1,-2.45,2.45,7.1][i],0));
const origin={x:-2.45,z:2.45};

test('cached lamp envelope contains actual articulated mesh bounds throughout stomp poses and yaw',()=> {
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  let maximum=0;
  for(let step=0;step<=128;step++) {
    const compression=-.2+.88*step/128;
    lamp.update({x:0,y:0,z:0,yaw:0,headYaw:0,headTilt:mix(.82,.55,clamp(compression)),compression,impact:0,airborne:true},step/128);
    // Radial support is the maximum view height across every yaw, not just sampled turns.
    visitBounds(v=> {maximum=Math.max(maximum,up.y*v.y+Math.hypot(up.x,up.z)*Math.hypot(v.x,v.z));});
  }
  assert.ok(maximum<STOMP_LAMP_ENVELOPE,`${maximum} exceeds envelope ${STOMP_LAMP_ENVELOPE}`);
});

test('placement rejects a tall glyph that cannot support a meaningful hop, including portrait-to-landscape resize',()=> {
  const target={...glyph('H',4,0,-7),height:6},plan=planApproach(origin,target,[...originals,target]);
  assert.ok(validPlacement(target,target.width*1.2,originals,origin));assert.ok(plan);
  for(const [width,height] of [[1366,768],[1920,1080],[2560,1440],[3840,2160],[390,844]]) {
    setFrame(width,height);
    assert.equal(hasStompHeadroom(target,plan.approach),false,`${width}x${height} must reserve the landscape frame`);
  }
});

test('legal back-row H keeps all three full stomp animations and actual lamp bounds in the responsive frame',()=> {
  const target=glyph('H',4,0,-7),plan=planApproach(origin,target,[...originals,target]);
  assert.ok(validPlacement(target,target.width*1.2,originals,origin));assert.ok(plan);
  for(const [width,height] of [[1366,768],[1920,1080],[2560,1440],[3840,2160],[390,844]]) {
    setFrame(width,height);assert.ok(hasStompHeadroom(target,plan.approach));
    for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]) for(let stomp=1;stomp<=3;stomp++) {
      const from=stomp===1?plan.approach:target;
      const squash=[1,.7,.4][stomp-1],fromY=stomp===1?0:target.height*squash+.035,toY=target.height*squash+.035;
      const heightCap=framedStompHeight(from,target,fromY,toY,[3.25,3.35,3.85][stomp-1]);
      assert.ok(heightCap>=MIN_STOMP_HEIGHT,`stomp ${stomp} retains a meaningful hop`);
      assert.ok(heightCap>(toY-fromY)/4,`stomp ${stomp} descends before impact`);
      const flight=[.72,.77,.85][stomp-1],press=[.48,.62,.82][stomp-1],duration=.26+flight+press+.18;
      let maximum=-Infinity;
      for(let sample=0;sample<=128;sample++) {
        const time=duration*sample/128;
        const p=jumpSample(time,{from,to:target,fromY,toY,height:heightCap,flight,prepare:.26,settle:press+.18});
        if(time>=.26+flight) {
          const u=smooth((time-.26-flight)/press);
          p.y=target.height*mix(squash,[.7,.4,.14][stomp-1],u)+.035;
          p.compression=Math.max(p.compression,.38*Math.sin(Math.PI*u));
        }
        lamp.update({...p,yaw,headYaw:0,headTilt:mix(.82,.55,clamp(p.compression))},time);
        visitBounds(v=> {maximum=Math.max(maximum,v.project(camera).y);});
      }
      assert.ok(maximum<=.94,`${width}x${height}, yaw ${yaw}, stomp ${stomp}: top ${maximum}`);
    }
  }
});

test('front-row stomp heights keep their original arcs',()=> {
  setFrame(1920,1080);const target={x:0,z:4,height:3};
  assert.equal(framedStompHeight({x:0,z:5.7},target,0,3.035,3.25),3.25);
  assert.equal(framedStompHeight(target,target,2.135,2.135,3.35),3.35);
  assert.equal(framedStompHeight(target,target,1.235,1.235,3.85),3.85);
});
