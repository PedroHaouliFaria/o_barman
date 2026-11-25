import assert from 'node:assert/strict';
import test from 'node:test';
import { bottleSurfaceAt } from '../public/js/components/bottle-placement.js';

test('garrafas repousam sobre a frente e as duas abas da estação', () => {
  for (const [x, z] of [[0.45, -0.73], [-0.97, -0.15], [0.96, 0]]) {
    assert.equal(bottleSurfaceAt({ x, y: 1.41, z }), 1.083);
  }
});

test('garrafa pousa na prateleira sob a mão para cada uma das três alturas', () => {
  for (const level of [1.10, 1.42, 1.74]) {
    assert.equal(bottleSurfaceAt({ x: -0.25, y: level + 0.125, z: 0.78 }), level);
  }
});

test('garrafa solta em espaço livre fica no piso e pode ser pega novamente', () => {
  for (const [x, z] of [[0, -0.2], [1.8, -0.7], [0.66, 0.78]]) {
    assert.equal(bottleSurfaceAt({ x, y: 1.3, z }), -0.01);
  }
  assert.equal(bottleSurfaceAt({ x: 0.48, y: 0.6, z: -0.75 }), 1.083);
  assert.equal(bottleSurfaceAt({ x: 4.1, y: 1.4, z: 0 }), null);
});
