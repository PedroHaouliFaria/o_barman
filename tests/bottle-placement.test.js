import assert from 'node:assert/strict';
import test from 'node:test';
import { BOTTLE_SPACING, bottleShelves, bottleSurfaceAt } from '../src/interaction/bottle-placement.js';

test('garrafas repousam sobre a frente e as duas abas da estação', () => {
  for (const [x, z] of [[0.45, -0.73], [-0.97, -0.15], [0.96, 0]]) {
    assert.equal(bottleSurfaceAt({ x, y: 1.41, z }), 1.083);
  }
});

test('garrafa pousa no tampo de trás ou na prateleira sob a mão', () => {
  for (const row of bottleShelves) {
    assert.equal(bottleSurfaceAt({ x: -0.25, y: row.top + 0.125, z: row.z }), row.top);
  }
});

test('todas as garrafas jogáveis ficam ao alcance do jogador parado (até 0,97 m da cabeça)', () => {
  for (const row of bottleShelves) {
    for (let i = 0; i < row.stock.length; i++) {
      const x = ((row.stock.length - 1) / 2 - i) * BOTTLE_SPACING;
      const reach = Math.hypot(x, row.top + 0.15 - 1.6, row.z);
      assert.ok(reach < 0.97, row.stock[i] + ' a ' + reach.toFixed(2) + ' m');
    }
  }
});

test('garrafa solta em espaço livre fica no piso e pode ser pega novamente', () => {
  for (const [x, z] of [[0, -0.2], [1.8, -0.7], [0.66, 0.2]]) {
    assert.equal(bottleSurfaceAt({ x, y: 1.3, z }), -0.01);
  }
  assert.equal(bottleSurfaceAt({ x: 0.48, y: 0.6, z: -0.75 }), 1.083);
  assert.equal(bottleSurfaceAt({ x: 4.1, y: 1.4, z: 0 }), null);
});
