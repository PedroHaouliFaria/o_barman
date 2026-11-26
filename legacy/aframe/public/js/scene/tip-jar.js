import { entity, group } from './blockout.js';

export function tipJar(root, label, capacity) {
  const T = AFRAME.THREE;
  const jar = group(root, [0.68, 1.083, -1.08]);
  jar.id = 'tip-jar';
  jar.object3D.rotation.y = -0.48;

  // Cross section from the base up to the open lip and back down the inner wall.
  const profile = [[0, 0], [.077, 0], [.085, .009], [.085, .147], [.077, .166],
    [.073, .171], [.073, .194], [.068, .194], [.068, .169], [.079, .146],
    [.079, .012], [0, .012]].map(([r, y]) => new T.Vector2(r, y));
  const glass = new T.Mesh(new T.LatheGeometry(profile, 32), new T.MeshStandardMaterial({
    color: '#c3eee0', transparent: true, opacity: .23, roughness: .18, depthWrite: false,
    side: T.DoubleSide,
  }));
  jar.setObject3D('glass', glass);
  for (const y of [.009, .175, .184, .194]) {
    entity(jar, 'a-torus', { position: '0 ' + y + ' 0', rotation: '90 0 0',
      radius: y < .02 ? .079 : .073, 'radius-tubular': .0025,
      material: { color: '#d8e9db', transparent: true, opacity: .72 } });
  }
  const tag = label(jar, [0, .114, .085], .147, .064, {});
  const coins = new T.InstancedMesh(new T.CylinderGeometry(.019, .019, .0046, 16),
    new T.MeshStandardMaterial({ color: '#e3ae4b', metalness: .32, roughness: .42 }), capacity);
  const pose = new T.Object3D();
  for (let i = 0; i < capacity; i++) {
    const slot = i % 7;
    const angle = slot * Math.PI / 3 + .22;
    const radius = slot === 6 ? 0 : .043;
    pose.position.set(radius * Math.cos(angle), .016 + Math.floor(i / 7) * .0052, radius * Math.sin(angle));
    pose.rotation.y = i * 1.81;
    pose.updateMatrix();
    coins.setMatrixAt(i, pose.matrix);
  }
  coins.computeBoundingSphere();
  coins.count = 0;
  jar.setObject3D('coins', coins);
  return (total = 0) => {
    coins.count = total;
    tag.print({ lines: ['GORJETAS', total + ' moedas'], center: true, font: .32,
      bg: '#eee1c1', ink: '#27271d', accent: '#493928' });
  };
}
