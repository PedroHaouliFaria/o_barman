import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Quaternion, Vec3 } from '../public/vendor/cannon-es/cannon-es.js';
import { throwPhysics } from '../public/js/components/throw-physics.js';

test('arremesso conserva impulso e giro, derruba outra garrafa e repousa no chão', () => {
  const transform = (x, y, z) => ({ position: new Vec3(x, y, z), quaternion: new Quaternion() });
  const bottle = (id, x, y) => ({ id, el: { object3D: transform(x, y, 0) } });
  const floor = { tagName: 'A-BOX', object3D: transform(0, -0.1, 0),
    getAttribute: () => ({ width: 8, height: 0.2, depth: 8 }) };
  const thrown = bottle('rum', -0.36, 0.19);
  const standing = bottle('gin', 0, 0.095);
  const physics = throwPhysics({ children: [floor] }, [standing], () => false);
  physics.launch(thrown, {}, new Vec3(2.5, 0.4, 0), new Vec3(0, 0, 3));
  const obj = thrown.el.object3D;
  assert.equal(obj.position.x, -0.36);
  physics.step(16);
  assert.ok(obj.position.x > -0.36 && obj.quaternion.z > 0);
  for (let i = 0; i < 360; i++) physics.step(16);
  assert.ok(obj.position.y > 0 && obj.position.y < 0.16);
  assert.ok(Math.abs(standing.el.object3D.quaternion.z) > 0.1);
  const rest = obj.position.clone();
  for (let i = 0; i < 30; i++) physics.step(16);
  assert.ok(obj.position.distanceTo(rest) < 0.002);
  physics.remove(thrown);
  obj.position.set(1, 2, 0);
  physics.step(16);
  assert.equal(obj.position.y, 2);
});
