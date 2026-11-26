import * as THREE from 'three';
import type { Panel } from '../ui/world-ui';
import { group, torus, type Vec3 } from './blockout';

type Label = (parent: THREE.Object3D, at: Vec3, w: number, h: number) => Panel;

export function tipJar(root: THREE.Object3D, label: Label, capacity: number) {
  const jar = group(root, [0.68, 1.083, -1.08]);
  jar.name = 'tip-jar';
  jar.rotation.y = -0.48;
  // Perfil da base até a boca aberta e de volta pela parede interna.
  const profile = [
    [0, 0], [0.077, 0], [0.085, 0.009], [0.085, 0.147], [0.077, 0.166],
    [0.073, 0.171], [0.073, 0.194], [0.068, 0.194], [0.068, 0.169], [0.079, 0.146],
    [0.079, 0.012], [0, 0.012],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 32),
    new THREE.MeshStandardMaterial({
      color: '#c3eee0', transparent: true, opacity: 0.23, roughness: 0.18, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  jar.add(glass);
  const rim = new THREE.MeshStandardMaterial({ color: '#d8e9db', transparent: true, opacity: 0.72 });
  for (const y of [0.009, 0.175, 0.184, 0.194]) {
    torus(jar, [0, y, 0], y < 0.02 ? 0.079 : 0.073, 0.0025, rim).rotation.x = Math.PI / 2;
  }
  const tag = label(jar, [0, 0.1, 0.088], 0.12, 0.07);
  const coins = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.0046, 16),
    new THREE.MeshStandardMaterial({ color: '#e3ae4b', metalness: 0.32, roughness: 0.42 }),
    capacity,
  );
  const pose = new THREE.Object3D();
  for (let i = 0; i < capacity; i++) {
    const slot = i % 7;
    const angle = (slot * Math.PI) / 3 + 0.22;
    const radius = slot === 6 ? 0 : 0.043;
    pose.position.set(radius * Math.cos(angle), 0.016 + Math.floor(i / 7) * 0.0052, radius * Math.sin(angle));
    pose.rotation.y = i * 1.81;
    pose.updateMatrix();
    coins.setMatrixAt(i, pose.matrix);
  }
  coins.computeBoundingSphere();
  coins.count = 0;
  jar.add(coins);
  return (total = 0) => {
    coins.count = total;
    tag.draw({ title: 'Gorjetas', note: total + (total === 1 ? ' moeda' : ' moedas') });
  };
}
