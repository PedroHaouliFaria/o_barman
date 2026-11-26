// Física de arremesso (Rapier) da v2. Node 23+ executa o .ts removendo os tipos.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { initPhysics, throwPhysics } from '../src/interaction/throw-physics.ts';

await initPhysics();

function boxAt(parent, at, size) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size));
  m.position.set(...at);
  m.userData.box = size;
  parent.add(m);
  return m;
}
const item = (id, at) => {
  const obj = new THREE.Group();
  obj.position.set(...at);
  return { id, name: id, obj, held: true, home: new THREE.Vector3(...at) };
};
const settle = (physics, frames = 150) => {
  for (let i = 0; i < frames; i++) physics.step(16);
};

test('arremesso conserva impulso e giro e repousa no chão', () => {
  const root = new THREE.Group();
  boxAt(root, [0, -0.1, 0], [8, 0.2, 8]);
  const thrown = item('rum', [-0.36, 0.19, 0]);
  const physics = throwPhysics(root, [], () => false);
  physics.launch(thrown, {}, new THREE.Vector3(2.5, 0.4, 0), new THREE.Vector3(0, 0, 3));
  physics.step(16);
  assert.ok(thrown.obj.position.x > -0.36, 'andou para frente');
  settle(physics, 360);
  const y = thrown.obj.position.y;
  assert.ok(y > 0 && y < 0.16, 'deitada ou em pé no chão: ' + y);
  const rest = thrown.obj.position.clone();
  settle(physics, 30);
  assert.ok(thrown.obj.position.distanceTo(rest) < 0.002, 'repousou');
});

test('o fundo da gaveta aberta sustenta utensílios e os acompanha ao fechar e abrir', () => {
  const root = new THREE.Group();
  const drawer = new THREE.Group();
  drawer.position.set(0.38, 0.918, -0.14);
  boxAt(drawer, [0.159, -0.05, 0], [0.3, 0.014, 0.52]);
  root.add(drawer);
  const physics = throwPhysics(root, [], () => false, drawer);
  const knife = item('knife', [0.53, 1.0, -0.14]);
  physics.launch(knife, {}, new THREE.Vector3(0, -0.5, 0), new THREE.Vector3());
  settle(physics);
  const pos = knife.obj.position;
  const floor = 0.918 - 0.05 + 0.007 + 0.007;
  assert.ok(Math.abs(pos.y - floor) < 0.004, 'faca no fundo da gaveta: ' + pos.y);
  for (const dx of [0.32, -0.32]) {
    const x = pos.x;
    assert.ok(physics.moveDrawer(dx));
    settle(physics);
    assert.ok(Math.abs(pos.x - x - dx) < 0.004, 'acompanhou a gaveta');
    assert.ok(Math.abs(pos.y - floor) < 0.004, 'continua no fundo');
  }
});
