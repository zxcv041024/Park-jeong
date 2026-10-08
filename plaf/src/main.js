import './style.css';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import serifData from 'three/examples/fonts/optimer_bold.typeface.json';
import { createLamp } from './lamp.js';
import { Foley } from './audio.js';
import { clamp, smooth, mix, distance, travelPlan, jumpSample, validPlacement, obstacleRects, clearSegment, planApproach,layoutLetters } from './motion.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), controls = $('controls'), input = $('letter-input');
const sound = new Foley();
const ANIMATION_SPEED=1.3;
const STOMP_SPEED=1.2;
const telemetry = { state: 'INTRO', completed: [], completedDetails:[],landings: 0, hops: 0, lastTarget: null, history: [] };
// Read-only snapshot for QA; animation has a single owner and a single clock.
window.__PLAF__ = { snapshot: () => ({ ...telemetry, animationSpeed:ANIMATION_SPEED,stompSpeed:STOMP_SPEED,fontFamily:'Optimer Bold',history: [...telemetry.history], completed: [...telemetry.completed],completedDetails:telemetry.completedDetails.map(t=>({...t})), queue: queue.map(t => t.text), lamp: { ...pose, size:1.12 }, travelSegment:travelSegment && {...travelSegment}, targets: targets.map(t => ({ id:t.id,text:t.text,groupId:t.groupId,index:t.index,sourceText:t.sourceText,x:t.x, z:t.z, width:t.width, height:t.height, spread:t.spread,squash:t.squash, stomps:t.stomps,status:t.status, initial:t.initial, opacity:t.mesh.material.opacity,rotation:[t.mesh.rotation.x,t.mesh.rotation.y,t.mesh.rotation.z],crushedAt:t.crushedAt })) }) };
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb7c8da);
scene.fog = new THREE.Fog(0xb7c8da, 42, 85);
const camera = new THREE.OrthographicCamera(-12,12,6.75,-6.75,.1,120);
const cameraHome = new THREE.Vector3(0, 14, 28), cameraAim = new THREE.Vector3(0,1.5,0);
camera.position.copy(cameraHome); camera.lookAt(cameraAim);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance' }); }
catch { $('loading').hidden = true; $('fatal').hidden = false; throw new Error('WebGL initialization failed'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
scene.add(new THREE.HemisphereLight(0xedf3ff, 0x798fa5, 2.4));
const key = new THREE.DirectionalLight(0xfffcf2, 3.1); key.position.set(-7,13,9); key.castShadow = true;
key.shadow.mapSize.set(2048,2048); Object.assign(key.shadow.camera,{ left:-19,right:19,top:15,bottom:-15,near:.1,far:40 });
key.shadow.bias = -.0003; key.shadow.normalBias = .025; key.shadow.radius = 4; key.shadow.intensity = .36; scene.add(key);
const fill = new THREE.DirectionalLight(0xc9ddff,.9); fill.position.set(9,5,-8); scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(240,240), new THREE.MeshStandardMaterial({ color:0x738fae,roughness:1,metalness:0 }));
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
const font = new FontLoader().parse(serifData);
const ink = new THREE.MeshStandardMaterial({ color:0x090b0f, roughness:.48,metalness:.08 });
function makeText(text) {
  if(Array.from(text).every(c=>c===' ' || font.data.glyphs[c])) {
    const geometry=new TextGeometry(text,{font,size:3.25,depth:.075,curveSegments:10,bevelEnabled:true,bevelThickness:.012,bevelSize:.006,bevelSegments:2});
    geometry.computeBoundingBox();const box=geometry.boundingBox;
    geometry.translate(-(box.max.x+box.min.x)/2,-box.min.y,0);
    return {mesh:new THREE.Mesh(geometry,ink),width:box.max.x-box.min.x,height:box.max.y-box.min.y};
  }
  // Keep Unicode input playable using a lit, alpha-tested serif glyph surface.
  const surface=document.createElement('canvas'),ctx=surface.getContext('2d');
  const typeface='700 256px Georgia, Batang, "Noto Serif KR", serif';ctx.font=typeface;
  const metrics=ctx.measureText(text),ascent=metrics.actualBoundingBoxAscent||230,descent=metrics.actualBoundingBoxDescent||5;
  surface.width=Math.ceil(metrics.width+32);surface.height=Math.ceil(ascent+descent+32);
  ctx.font=typeface;ctx.fillStyle='white';ctx.fillText(text,16,ascent+16);
  const height=2.95,width=surface.width/surface.height*height;
  const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map:texture,color:0x090b0f,roughness:.5,alphaTest:.12,side:THREE.DoubleSide});
  const geometry=new THREE.PlaneGeometry(width,height);geometry.translate(0,height/2,0);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:.12});
  return {mesh,width,height,ownedMaterial:true};
}
const lamp = createLamp(scene);
let targets = [], queue = [], actions = [], currentAction = null, actionTime = 0, activeTarget = null;
let intro = true, currentStanding = null, clock = 0, shake = 0, nextId = 0,nextGroupId=0, feedbackTimer,travelSegment=null,stompSegment=null;
const pose = { x:14, z:2.5, y:0, yaw:Math.PI, headYaw:0, headTilt:.86, compression:0, impact:0, airborne:false };
// View-space envelope includes the 1.12-scale lamp at every stomp compression/yaw.
// Fixed upper framing space preserves queue capacity; camera position/aim never change.
const STOMP_LAMP_ENVELOPE=3.25, MIN_STOMP_HEIGHT=.65, STOMP_TOP_LIMIT=.94;
const MIN_FRAME_HEIGHT=16, FRAME_UP_OFFSET=1.25;
const stompViewUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
function framedStompHeight(from,to,fromY,toY,height) {
  const project=(point,y)=>(point.x-cameraHome.x)*stompViewUp.x+(y-cameraHome.y)*stompViewUp.y+(point.z-cameraHome.z)*stompViewUp.z;
  const start=project(from,fromY),end=project(to,toY);
  const frameHeight=Math.min(camera.top-camera.bottom,MIN_FRAME_HEIGHT);
  const ceiling=Math.min(camera.top,MIN_FRAME_HEIGHT/2+FRAME_UP_OFFSET)-(1-STOMP_TOP_LIMIT)*frameHeight/2-STOMP_LAMP_ENVELOPE;
  const peak=h=> {
    const arc=4*h*stompViewUp.y;
    const u=arc>0 ? clamp((end-start+arc)/(2*arc)) : end>start ? 1 : 0;
    return mix(start,end,u)+arc*u*(1-u);
  };
  if(peak(0)>ceiling) return 0;
  if(peak(height)<=ceiling) return height;
  let low=0,high=height;
  for(let i=0;i<24;i++) {const mid=(low+high)/2;if(peak(mid)<=ceiling) low=mid;else high=mid;}
  return low;
}
function hasStompHeadroom(target,approach) {
  const firstMinimum=Math.max(MIN_STOMP_HEIGHT,(target.height+.035)/4+.35);
  return framedStompHeight(approach,target,0,target.height+.035,3.25)>=firstMinimum &&
    framedStompHeight(target,target,target.height*.7+.035,target.height*.7+.035,3.35)>=MIN_STOMP_HEIGHT &&
    framedStompHeight(target,target,target.height*.4+.035,target.height*.4+.035,3.85)>=MIN_STOMP_HEIGHT;
}
function state(value) {
  if (telemetry.state !== value) { telemetry.state = value; telemetry.history.push(value); if(telemetry.history.length > 150) telemetry.history.shift(); }
}
function showFeedback(text) { $('feedback').textContent = text; clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => $('feedback').textContent = '', 3500); }
function showControls() { controls.classList.add('visible'); controls.inert = false; }
function queueLabel() { $('queue-indicator').textContent = queue.length ? `${queue.length}개 기다리는 중` : '최대 8자'; }
function textObject(text, x, z, initial=false,options={}) {
  const glyph=makeText(text),originalWidth=glyph.width,height=glyph.height;
  const scale = options.scale ?? Math.min(1, 8.2/originalWidth);
  const mesh = glyph.mesh; mesh.scale.setScalar(scale); mesh.position.set(x,.025,z);
  if(!glyph.ownedMaterial) mesh.material=ink.clone();
  mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  const t = { id:nextId++, text,x,z,mesh,width:originalWidth*scale,height:height*scale,scale,squash:1,stomps:0,status:'waiting',initial,spread:1,spawn:initial ? 1 : 0,crushedAt:null,groupId:options.groupId ?? null,index:options.index ?? 0,sourceText:options.sourceText ?? text };
  if(!initial) {
    mesh.material.transparent=true;
    mesh.customDepthMaterial ||= new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
    t.fadeUniform={value:1};
    mesh.customDepthMaterial.onBeforeCompile=shader=> {
      shader.uniforms.fadeOpacity=t.fadeUniform;
      shader.fragmentShader='uniform float fadeOpacity;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)>fadeOpacity) discard;');
    };
    mesh.customDepthMaterial.customProgramCacheKey=()=> 'plaf-fading-shadow';
  }
  targets.push(t); return t;
}
function updateTarget(t, scaleY) {
  t.squash = scaleY;
  t.spread = 1 + (1-scaleY)*.10;
  t.mesh.rotation.set(0,0,0);
  t.mesh.scale.set(t.scale*t.spread,t.scale*scaleY,t.scale);
}
function disposeTarget(t) {
  scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.map?.dispose();t.mesh.material.dispose();t.mesh.customDepthMaterial?.dispose();
}
function clearStage() {
  for (const t of targets) disposeTarget(t);
  targets = []; queue = []; actions = []; currentAction = null; activeTarget = null; currentStanding = null; actionTime=0;
  telemetry.completed=[];telemetry.completedDetails=[]; telemetry.landings=0; telemetry.hops=0; telemetry.history=[];
  shake=0;travelSegment=null;stompSegment=null; queueLabel(); input.value=''; showFeedback('');
  return ['P','L','A','F'].map((s,i) => textObject(s,[-7.1,-2.45,2.45,7.1][i],0,true));
}
const idle = (duration, phase, update, done,rate=1) => ({ duration, phase, update, done,rate });
function addTravel(target) {
  let hop=null,hopStart=0,hopYawStart=0,hopYawEnd=0;
  const travel={duration:Infinity,phase:'PREPARE_JUMP',update(elapsed) {
    if(!hop) {
      const from={x:pose.x,z:pose.z},plan=planApproach(from,target,targets);
      if(!plan) {state('WAITING_FOR_PATH');return;}
      if(distance(from,plan.approach)<.04) {target.approach=plan.approach;travel.duration=elapsed;return;}
      const to=travelPlan(from,plan.route[0])[0];
      hopYawStart=pose.yaw;hopYawEnd=Math.atan2(-(to.z-from.z),to.x-from.x);pose.headYaw=0;
      hop=makeJump(from,to,pose.y,0,1.05+distance(from,to)*.19,.44);hopStart=elapsed;
      travelSegment={from,to};
    }
    const time=Math.min(elapsed-hopStart,hop.duration);hop.update(time);
    pose.yaw=hopYawStart+angleDiff(hopYawStart,hopYawEnd)*smooth(time/.17);
    if(time>=hop.duration) {hop.done();hop=null;travelSegment=null;}
  },done() {travelSegment=null;}};
  actions.push(travel);
}
function makeJump(from,to,fromY,toY,height,flight=.48,stomp=0,target=null) {
  const pressDuration=[.48,.62,.82][stomp-1] || .48;
  const prepare = stomp ? .26 : .17, settle = stomp ? pressDuration+.18 : .17;
  const opts = { from,to,fromY,toY,height,flight,prepare,settle };
  let impactDone=false, takeoffDone=false, squashStart;
  return {
    duration:prepare+flight+settle,rate:stomp ? STOMP_SPEED : 1,phase:stomp ? `STOMP_${stomp}` : 'PREPARE_JUMP',
    start() {if(stomp) {opts.from={x:pose.x,z:pose.z};opts.fromY=pose.y;opts.toY=target.height*target.squash+.035;opts.height=framedStompHeight(opts.from,opts.to,opts.fromY,opts.toY,height);if(stomp===1) stompSegment={from:opts.from,to:opts.to};}},
    update(t) {
      const p = jumpSample(t,opts); Object.assign(pose,p);
      if(!stomp) state(p.phase);
      if(t >= prepare && !takeoffDone) { takeoffDone=true; sound.play('jump'); telemetry.hops++; }
      if(t >= prepare+flight && !impactDone) {
        impactDone=true; telemetry.landings++; sound.play(stomp ? 'stomp':'land',stomp === 3 ? 1.5 : stomp===2 ? 1.05 : .7);
        if(stomp) { squashStart=target.squash;target.stomps++; target.status=`stomp-${stomp}`; shake = [.027,.048,.085][stomp-1]; }
      }
      if(stomp && impactDone) {
        const u=smooth((t-prepare-flight)/pressDuration), final=[.70,.40,.14][stomp-1];
        updateTarget(target,mix(squashStart,final,u)); pose.y=target.height*target.squash+.035;
        pose.compression=Math.max(pose.compression,.38*Math.sin(Math.PI*u));
      }
      pose.headTilt = mix(.82,.55,clamp(p.compression));
    },
    done() {
      Object.assign(pose,{ x:to.x,z:to.z,y:stomp ? target.height*target.squash+.035 : toY,compression:0,impact:0,airborne:false });
      if(stomp===3 && !target.initial) target.crushedAt=performance.now();
      if(stomp===1) stompSegment=null;
    }
  };
}
const angleDiff = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
const toward = t => Math.atan2(-(t.z-pose.z),t.x-pose.x);
function finishTarget(t) {
  t.status='flattened'; currentStanding=t; activeTarget=null; telemetry.completed.push(t.text); telemetry.lastTarget=t.text;
  telemetry.completedDetails.push({id:t.id,text:t.text,groupId:t.groupId,index:t.index,stomps:t.stomps,squash:t.squash});
  state('STANDING_ON_TARGET');
  if(intro) { intro=false; showControls(); }
  queueLabel();
}
function scheduleTarget(t, isIntro=false) {
  activeTarget=t; t.status='active'; currentStanding=null;
  const theta=toward(t), oldYaw=pose.yaw, delta=angleDiff(oldYaw,theta),oldHeadYaw=pose.headYaw,oldHeadTilt=pose.headTilt;
  const lookTilt=Math.atan2(distance(pose,t),Math.max(.25,pose.y+2.15-t.height*.42));
  actions.push(idle(isIntro ? 1.1 : .48,'IDLE',() => { pose.compression=0; pose.impact=0; }));
  actions.push(idle(.36,'LOOK_AT_TARGET',u => { const p=smooth(u/.36);pose.headYaw=oldHeadYaw+angleDiff(oldHeadYaw,delta)*p; pose.headTilt=mix(oldHeadTilt,lookTilt,p); },() => sound.play('hinge')));
  actions.push(idle(.28,'LOOK_AT_TARGET',u => { const p=smooth(u/.28); pose.yaw=oldYaw+delta*p; pose.headYaw=delta*(1-p); }));
  addTravel(t);
  actions.push(idle(.44,'APPROACHING_TARGET',u => {
    const theta2=toward(t), p=smooth(u/.44); pose.yaw += angleDiff(pose.yaw,theta2)*p*.18; pose.headTilt=.72; pose.compression=0;
  }));
  actions.push(makeJump({x:t.x,z:t.z+1.7},{x:t.x,z:t.z},0,t.height+.035,3.25,.72,1,t));
  actions.push(idle(.22,'STOMP_1',() => { pose.compression=0;pose.headTilt=.45; },undefined,STOMP_SPEED));
  actions.push(makeJump({x:t.x,z:t.z},{x:t.x,z:t.z},t.height*.7+.035,t.height*.7+.035,3.35,.77,2,t));
  actions.push(idle(.22,'STOMP_2',() => { pose.compression=0;pose.headTilt=.45; },undefined,STOMP_SPEED));
  actions.push(makeJump({x:t.x,z:t.z},{x:t.x,z:t.z},t.height*.4+.035,t.height*.4+.035,3.85,.85,3,t));
  let faceYaw;
  actions.push(idle(.90,'STANDING_ON_TARGET',u => {
    faceYaw ??= pose.yaw;
    const p=smooth(u/.9); pose.headTilt=mix(.55,1.50,p); pose.yaw=faceYaw+angleDiff(faceYaw,-.25)*p; pose.headYaw=angleDiff(pose.yaw,-Math.PI/2)*p; pose.compression=0;
  },() => finishTarget(t)));
  queueLabel();
}
function startIntro() {
  const letters=clearStage(); intro=true; controls.classList.remove('visible'); controls.inert=true;
  Object.assign(pose,{x:14,z:2.5,y:0,yaw:Math.PI,headYaw:0,headTilt:.86,compression:0,impact:0,airborne:false});
  state('INTRO'); scheduleTarget(letters[1],true);
}
function reset() {
  clearStage(); intro=false; Object.assign(pose,{x:-2.45,z:2.45,y:0,yaw:-.25,headYaw:-Math.PI/2+.25,headTilt:1.5,compression:0,impact:0,airborne:false});
  state('IDLE'); showControls();
}
function findPlacement(layout) {
  const {width,height}=layout;
  const rect=(x,z,w,h) => {
    const points=[new THREE.Vector3(x-w/2,.02,z),new THREE.Vector3(x+w/2,h,z)].map(v=>v.project(camera));
    return {left:points[0].x,right:points[1].x,bottom:points[0].y,top:points[1].y};
  };
  for(let i=0;i<600;i++) {
    const p={x:(Math.random()*2-1)*(10.1-width/2),z:-8.2+Math.random()*15.6};
    if(!validPlacement(p,width*1.2,targets.map(t=>({...t,width:t.width*t.spread})),pose)) continue;
    const proposed=layout.members.map((g,i)=>({id:-1-i,text:g.text,x:p.x+g.x,z:p.z,width:g.width,height:g.height,squash:1,spread:1}));
    const approaching=activeTarget && telemetry.state==='APPROACHING_TARGET' ? {from:pose,to:activeTarget} : null;
    if([travelSegment,stompSegment,approaching].some(segment=>segment && !clearSegment(segment.from,segment.to,obstacleRects(proposed)))) continue;
    const r=rect(p.x,p.z,width*1.2,height+.2);
    if(r.left<-.88 || r.right>.88 || r.top>.87 || r.bottom<-.70) continue;
    if(targets.some(t=> {
      const other=rect(t.x,t.z,t.width*t.spread,t.height*t.squash);
      const overlap=Math.max(0,Math.min(r.right,other.right)-Math.max(r.left,other.left))*Math.max(0,Math.min(r.top,other.top)-Math.max(r.bottom,other.bottom));
      const area=Math.min((r.right-r.left)*(r.top-r.bottom),(other.right-other.left)*(other.top-other.bottom));
      return overlap>area*.12;
    })) continue;
    const minX=(r.left+1)/2*innerWidth;
    const maxY=(1-r.bottom)/2*innerHeight;
    const ui=controls.getBoundingClientRect();
    if(minX>ui.left-35 && maxY>ui.top-70) continue;
    const future=[...targets,...proposed].map(t=>({...t}));
    if(activeTarget && activeTarget.squash===1 && currentAction?.phase!=='STOMP_1' && !planApproach(pose,future.find(t=>t.id===activeTarget.id),future)) continue;
    let origin={x:pose.x,z:pose.z};
    if(activeTarget) {const active=future.find(t=>t.id===activeTarget.id);active.squash=.14;active.spread=1.086;origin={x:active.x,z:active.z};}
    let reachable=true;
    for(const pending of [...queue,...proposed]) {
      const target=future.find(t=>t.id===pending.id);
      const plan=planApproach(origin,target,future);
      if(!plan || !hasStompHeadroom(target,plan.approach)) {reachable=false;break;}
      target.squash=.14;target.spread=1.086;origin={x:target.x,z:target.z};
    }
    if(!reachable) continue;
    return p;
  }
  return null;
}
function enqueue(raw) {
  const text=raw.trim().normalize('NFC').toUpperCase();
  if(!text) return false;
  const tokens=Array.from(new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(text),t=>t.segment);
  if(tokens.length>8) { showFeedback('한 번에 최대 8자까지 입력해 주세요.'); return false; }
  const glyphs=[];let extraGapBefore=0;
  for(const token of tokens) {
    if(/^\s+$/u.test(token)) {extraGapBefore+=1;continue;}
    const glyph=makeText(token);glyphs.push({text:token,width:glyph.width,height:glyph.height,extraGapBefore});extraGapBefore=0;
    glyph.mesh.geometry.dispose();
    if(glyph.ownedMaterial) {glyph.mesh.material.map.dispose();glyph.mesh.material.dispose();glyph.mesh.customDepthMaterial.dispose();}
  }
  if(!glyphs.length) return false;
  const layout=layoutLetters(glyphs),location=findPlacement(layout);
  if(!location) { showFeedback('무대가 가득 찼어요. Reset으로 새 무대를 열어 주세요.'); return false; }
  const groupId=nextGroupId++;
  const added=layout.members.map(g=>textObject(g.text,location.x+g.x,location.z,false,{scale:layout.scale,groupId,index:g.index,sourceText:text}));
  queue.push(...added); queueLabel();
  if(!activeTarget && !currentAction && actions.length===0) scheduleTarget(queue.shift());
  return true;
}
$('letter-form').addEventListener('submit',e=> { e.preventDefault(); if(enqueue(input.value)) { input.value='';input.focus(); } });
$('sound').addEventListener('click',async()=> {
  try { await sound.enable(!sound.enabled); $('sound').textContent=`Sound ${sound.enabled?'ON':'OFF'}`; $('sound').setAttribute('aria-pressed',String(sound.enabled)); sound.play('hinge'); }
  catch { showFeedback('브라우저에서 소리를 켜지 못했습니다.'); }
});
$('reset').addEventListener('click',reset); $('replay').addEventListener('click',startIntro);
function resize() {
  const aspect=innerWidth/innerHeight, h=Math.max(MIN_FRAME_HEIGHT,24/aspect);
  camera.left=-h*aspect/2; camera.right=h*aspect/2;camera.top=h/2+FRAME_UP_OFFSET;camera.bottom=-h/2+FRAME_UP_OFFSET; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',resize); resize();
let last=performance.now(), raf, hidden=false;
document.addEventListener('visibilitychange',()=> { hidden=document.hidden; last=performance.now(); });
function frame(now) {
  raf=requestAnimationFrame(frame);
  const dt=hidden ? 0 : Math.min((now-last)/1000,.045)*ANIMATION_SPEED; last=now;clock+=dt;
  if(hidden) return;
  for(const t of [...targets]) {
    if(t.spawn<1) { t.spawn=clamp(t.spawn+dt*4);t.mesh.scale.set(t.scale*t.spread,t.scale*t.squash*smooth(t.spawn),t.scale); }
    if(!t.initial && t.crushedAt!==null && activeTarget!==t) {
      const fading=clamp((now-t.crushedAt-10000)/2800),opacity=1-smooth(fading);
      t.mesh.material.opacity=opacity;t.fadeUniform.value=opacity;
      if(currentStanding===t && !currentAction && !activeTarget) pose.y=.035+t.height*t.squash*opacity;
      if(fading>=1) {disposeTarget(t);targets=targets.filter(other=>other!==t);if(currentStanding===t) {currentStanding=null;pose.y=0;state('IDLE');}}
    }
  }
  if(!currentAction && actions.length) { currentAction=actions.shift();actionTime=0;state(currentAction.phase);currentAction.start?.(); }
  if(currentAction) {
    actionTime=Math.min(actionTime+dt*(currentAction.rate || 1),currentAction.duration); currentAction.update?.(actionTime);
    if(actionTime>=currentAction.duration) { currentAction.done?.();currentAction=null; }
  } else if(!intro && !activeTarget && queue.length) { scheduleTarget(queue.shift()); }
  else if(!intro && !activeTarget) {
    pose.headTilt=1.50+Math.sin(clock*1.7)*.018;pose.compression=Math.sin(clock*2.1)*.015;
  }
  lamp.update(pose,clock);
  shake*=Math.exp(-dt*13);
  camera.position.copy(cameraHome); camera.position.x+=Math.sin(clock*89)*shake;camera.position.y+=Math.cos(clock*103)*shake;
  camera.lookAt(cameraAim); renderer.render(scene,camera);
}
startIntro(); $('loading').classList.add('finished'); raf=requestAnimationFrame(frame);
addEventListener('pagehide',e=> { if(e.persisted) return;cancelAnimationFrame(raf);sound.dispose();scene.traverse(o=> { if(o.isMesh) { o.geometry.dispose();o.customDepthMaterial?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]) { m.map?.dispose();m.dispose(); } } });renderer.dispose(); });
