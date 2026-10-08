export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const lerpPoint = (a, b, t) => ({ x: mix(a.x, b.x, t), z: mix(a.z, b.z, t) });
// Letter spacing is calculated after scaling so narrow glyphs still clear the lamp.
export function layoutLetters(glyphs,maxWidth=16.8) {
  const measured=scale=> {
    const widths=glyphs.map(g=>g.width*scale);
    const gaps=glyphs.map((g,i)=>i===0 ? 0 : Math.max(.42,1.18-Math.min(widths[i-1],widths[i])/2)+(g.extraGapBefore || 0)*scale);
    return {widths,gaps,width:widths.reduce((a,b)=>a+b,0)+gaps.reduce((a,b)=>a+b,0)};
  };
  let scale=1;
  if(measured(1).width>maxWidth) {
    let low=0,high=1;
    for(let i=0;i<24;i++) {const mid=(low+high)/2;if(measured(mid).width<=maxWidth) low=mid;else high=mid;}
    scale=low;
  }
  const {widths,gaps,width}=measured(scale);let cursor=-width/2;
  const members=glyphs.map((g,i)=> {cursor+=gaps[i];const x=cursor+widths[i]/2;cursor+=widths[i];return {...g,index:i,x,width:widths[i],height:g.height*scale};});
  return {scale,width,height:Math.max(0,...members.map(g=>g.height)),members};
}
// No horizontal displacement during preparation or landing. Flight is ballistic.
export function jumpSample(time, { from, to, fromY = 0, toY = 0, height = 1.5, flight = .46, prepare = .16, settle = .16 }) {
  if (time < prepare) return { ...from, y: fromY, compression: .62 * smooth(time / prepare), phase: 'PREPARE_JUMP', airborne: false, impact: 0 };
  const u = clamp((time - prepare) / flight);
  if (time < prepare + flight) {
    const point = lerpPoint(from, to, u);
    return { ...point, y: mix(fromY, toY, u) + 4 * height * u * (1 - u), compression: -.2 * Math.sin(Math.PI * u), phase: 'TRAVELING', airborne: true, impact: 0 };
  }
  const s = clamp((time - prepare - flight) / settle);
  return { ...to, y: toY, compression: .68 * Math.exp(-5 * s) * Math.cos(9 * s), phase: 'LANDING', airborne: false, impact: Math.exp(-7 * s) };
}
export function travelPlan(from, to, step = 1.85) {
  const n = Math.max(1, Math.ceil(distance(from, to) / step));
  return Array.from({ length: n }, (_, i) => lerpPoint(from, to, (i + 1) / n));
}
export function validPlacement(candidate, width, targets, lamp) {
  if (Math.abs(candidate.x) + width / 2 > 10.65 || candidate.z < -8.5 || candidate.z > 7.5) return false;
  if (distance(candidate, lamp) < 2.7) return false;
  // Each glyph has room for the lamp to land; flattened marks remain obstacles.
  return targets.every(t => Math.abs(candidate.x - t.x) > (width + t.width) / 2 + .65 || Math.abs(candidate.z - t.z) > 2.25);
}

// Inflate the physical footprints by the lamp's body clearance before planning.
export function obstacleRects(targets, clearance = 1.05) {
  return targets.filter(t => t.squash === undefined || t.squash > .3).map(t => ({
    id:t.id, left:t.x-t.width*(t.spread || 1)/2-clearance,
    right:t.x+t.width*(t.spread || 1)/2+clearance,
    back:t.z-.15-clearance, front:t.z+.15+clearance
  }));
}
export const insideRect = (p,r) => p.x>r.left+1e-6 && p.x<r.right-1e-6 && p.z>r.back+1e-6 && p.z<r.front-1e-6;
export function segmentHitsRect(a,b,r) {
  let enter=0,leave=1;
  for(const [origin,delta,low,high] of [[a.x,b.x-a.x,r.left+1e-6,r.right-1e-6],[a.z,b.z-a.z,r.back+1e-6,r.front-1e-6]]) {
    if(Math.abs(delta)<1e-9) { if(origin<=low || origin>=high) return false; }
    else { const t1=(low-origin)/delta,t2=(high-origin)/delta;enter=Math.max(enter,Math.min(t1,t2));leave=Math.min(leave,Math.max(t1,t2));if(enter>leave) return false; }
  }
  return enter<=leave;
}
export const clearSegment = (a,b,rects) => rects.every(r=>!segmentHitsRect(a,b,r));
// Visibility graph around rectangle corners; Dijkstra finds the shortest detour.
export function routeAround(from,to,rects) {
  if(rects.some(r=>insideRect(to,r) || insideRect(from,r))) return null;
  if(clearSegment(from,to,rects)) return [to];
  const nodes=[from,to],padding=.035;
  for(const r of rects) for(const x of [r.left-padding,r.right+padding]) for(const z of [r.back-padding,r.front+padding]) {
    const p={x,z};if(Math.abs(x)<=12.8 && Math.abs(z)<=10.5 && !rects.some(other=>insideRect(p,other))) nodes.push(p);
  }
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();costs[0]=0;
  for(let n=0;n<nodes.length;n++) {
    let at=-1;for(let i=0;i<nodes.length;i++) if(!visited.has(i) && (at<0 || costs[i]<costs[at])) at=i;
    if(at<0 || !Number.isFinite(costs[at])) break;if(at===1) break;visited.add(at);
    for(let i=0;i<nodes.length;i++) if(!visited.has(i) && clearSegment(nodes[at],nodes[i],rects)) {
      const cost=costs[at]+distance(nodes[at],nodes[i]);if(cost<costs[i]) {costs[i]=cost;previous[i]=at;}
    }
  }
  if(!Number.isFinite(costs[1])) return null;
  const path=[];for(let at=1;at!==0;at=previous[at]) path.unshift(nodes[at]);return path;
}
export function planApproach(from,target,targets) {
  const rects=obstacleRects(targets),halfWidth=target.width*(target.spread || 1)/2;
  const options=[{x:target.x,z:target.z+1.7},{x:target.x,z:target.z-1.7},{x:target.x-halfWidth-1.5,z:target.z},{x:target.x+halfWidth+1.5,z:target.z}];
  let best=null;
  for(const approach of options) {
    if(Math.abs(approach.x)>12.5 || Math.abs(approach.z)>10) continue;
    if(!clearSegment(approach,target,rects.filter(r=>r.id!==target.id))) continue;
    const route=routeAround(from,approach,rects);if(!route) continue;
    let cost=0,origin=from;for(const p of route) {cost+=distance(origin,p);origin=p;}cost+=distance(approach,target)*.35;
    if(!best || cost<best.cost) best={route,approach,cost};
  }
  return best;
}
