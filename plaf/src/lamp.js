import * as THREE from 'three';

export function createLamp(scene) {
  const root = new THREE.Group(); scene.add(root);
  const size=1.12;root.scale.setScalar(size);
  const enamel = new THREE.MeshStandardMaterial({ color: 0xe4e5df, roughness: .3, metalness: .48 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x66717b, roughness: .35, metalness: .8 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb3a487, roughness: .3, metalness: .7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x424952, roughness: .85 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xfff4d9, roughness: .55, side: THREE.BackSide });
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xfff8df, emissive: 0xffedc2, emissiveIntensity: 3 });
  const mesh = (geo, mat, parent, pos = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const base = new THREE.Group(); root.add(base);
  mesh(new THREE.CylinderGeometry(.53, .58, .065, 48), rubber, base, [0, .035, 0]);
  const dome = mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), enamel, base, [0, .065, 0]);
  dome.scale.set(.58, .15, .48);
  mesh(new THREE.CylinderGeometry(.105, .14, .19, 24), metal, base, [0, .23, 0]);
  const lower = new THREE.Group(); lower.position.y = .31; root.add(lower);
  const upper = new THREE.Group(); upper.position.y = 1.06; lower.add(upper);
  const neck = new THREE.Group(); neck.position.y = 1.03; upper.add(neck);
  const headTurn = new THREE.Group(); neck.add(headTurn);
  const head = new THREE.Group(); headTurn.add(head);
  function joint(parent, y, r = .115) {
    const axle = mesh(new THREE.CylinderGeometry(r, r, .29, 24), metal, parent, [0, y, 0]); axle.rotation.x = Math.PI / 2;
    for (const z of [-.16, .16]) {
      const cap = mesh(new THREE.CylinderGeometry(r * .58, r * .58, .025, 20), brass, parent, [0, y, z]); cap.rotation.x = Math.PI / 2;
    }
  }
  joint(lower, 0); joint(upper, 0); joint(neck, 0, .09);
  for (const [parent, length] of [[lower, 1.06], [upper, 1.03]]) {
    for (const z of [-.11, .11]) mesh(new THREE.BoxGeometry(.065, length, .045), enamel, parent, [0, length / 2, z]);
    const brace = mesh(new THREE.BoxGeometry(.16, .045, .24), metal, parent, [0, length * .48, 0]); brace.rotation.z = .06;
    const points = Array.from({ length: 151 }, (_, i) => {
      const t = i / 150, a = t * Math.PI * 2 * 12;
      return new THREE.Vector3(.047 * Math.cos(a) + .10, .18 + t * length * .57, .047 * Math.sin(a));
    });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 150, .012, 6, false), metal, parent);
  }
  // Distinctive broad bell, rolled lip, brass crown and visible frosted bulb.
  const profile = [[.12,.32],[.17,.30],[.20,.22],[.25,.12],[.34,0],[.46,-.16],[.52,-.25],[.53,-.28]].map(([x,y]) => new THREE.Vector2(x,y));
  const shadeGeometry = new THREE.LatheGeometry(profile, 48);
  mesh(shadeGeometry, enamel, head);
  const lining = mesh(shadeGeometry, inner, head); lining.scale.setScalar(.975);
  const lip = mesh(new THREE.TorusGeometry(.527, .026, 10, 48), brass, head, [0, -.278, 0]); lip.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.07, .11, .14, 20), brass, head, [0, .36, 0]);
  mesh(new THREE.SphereGeometry(.14, 24, 16), bulbMaterial, head, [0, -.14, 0]);
  const bulb = new THREE.Object3D(); bulb.position.set(0, -.23, 0); head.add(bulb);
  const spot = new THREE.SpotLight(0xfff2d0, 23, 24, .48, .75, 1.4); spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.00015; spot.shadow.normalBias = .03;
  scene.add(spot, spot.target);
  const bounce = new THREE.PointLight(0xfff0d3, .65, 2.5); head.add(bounce);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.35, 3.4, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6df, transparent: true, opacity: .023, depthWrite: false, side: THREE.DoubleSide }));
  cone.position.y = -1.95; head.add(cone);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'), gradient = ctx.createRadialGradient(64,64,2,64,64,64);
  gradient.addColorStop(0, 'rgba(20,35,49,.36)'); gradient.addColorStop(.35, 'rgba(20,35,49,.20)'); gradient.addColorStop(1, 'rgba(20,35,49,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,128,128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI/2; shadow.position.y = .015; scene.add(shadow);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), dir = new THREE.Vector3();
  return {
    root, lower, upper, head, headTurn,
    update({ x, z, y, yaw, headYaw, headTilt, compression, impact, airborne }, time) {
      root.position.set(x, y, z); root.rotation.y = yaw;
      base.rotation.z = airborne ? -.045 * Math.sin(time * 9) : impact * .045 * Math.sin(time * 35);
      lower.rotation.z = .48 + compression * .9;
      upper.rotation.z = -1.16 - compression * 1.45;
      neck.rotation.z = -lower.rotation.z - upper.rotation.z;
      headTurn.rotation.y = headYaw;
      head.rotation.z = headTilt;
      root.updateMatrixWorld(true); bulb.getWorldPosition(v); head.getWorldQuaternion(q);
      dir.set(0,-1,0).applyQuaternion(q);
      spot.position.copy(v); spot.target.position.copy(v).addScaledVector(dir, 6);
      shadow.position.set(x, .016, z);
      const s = 1 / (1 + Math.max(y,0) * .16) + impact * .24;
      shadow.scale.set(s*size, s*size, 1); shadow.material.opacity = .8 / (1 + Math.max(y,0) * .48);
    }
  };
}
