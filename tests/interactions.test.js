import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMotion, pourStep, shakeStep, stirStep, muddleStep } from '../src/interaction/motion.js';

test('garrafa em pé ou longe permanece sem despejo', () => {
  const input = newMotion();
  for (let i = 0; i < 90; i++) {
    assert.equal(pourStep(input, 'glass', 1, 16), false);
    assert.equal(pourStep(input, null, -1, 16), false);
  }
});

test('despejo requer permanência e conta uma dose até rearmar', () => {
  const input = newMotion();
  function dwell(target, frames, upY = -0.2) {
    return Array.from({ length: frames }, () => pourStep(input, target, upY, 16)).filter(Boolean).length;
  }
  assert.equal(dwell('glass', 25), 0);
  assert.equal(dwell('glass', 90), 1);
  assert.equal(dwell('glass', 50), 0);
  assert.equal(dwell('glass', 1, 0.65), 0);
  assert.equal(dwell('glass', 100), 1);
  assert.equal(dwell('shaker', 100), 1);
  assert.equal(dwell(null, 1), 0);
  assert.equal(dwell('shaker', 50), 1);
});

test('uma pausa na execução não injeta o tempo ausente como dose', () => {
  assert.equal(pourStep(newMotion(), 'glass', 0, 1500), false);
});

test('mexer exige uma volta contínua dentro do copo em qualquer sentido', () => {
  for (const direction of [-1, 1]) {
    const motion = newMotion();
    const step = (angle, inside = true) =>
      stirStep(motion, { x: 0.02 * Math.cos(angle), z: 0.02 * Math.sin(angle) }, inside);
    for (let i = 0; i < 100; i++) assert.equal(step((i % 2) * 0.1), false);
    for (let i = 0; i < 16; i++) assert.equal(step(direction * i * Math.PI / 16), false);
    step(0, false);
    for (let i = 0; i < 31; i++) assert.equal(step(direction * i * Math.PI / 16), false);
    assert.equal(step(direction * 31 * Math.PI / 16), true);
  }
});

test('macerar exige duas batidas no mesmo copo e não repete ao manter a mão parada', () => {
  const motion = newMotion();
  const step = (height, aligned = true) => muddleStep(motion, height, 0.03, aligned);
  assert.equal(step(0.04), false);
  assert.equal(step(-0.04), false);
  for (let i = 0; i < 50; i++) assert.equal(step(-0.04), false);
  step(0.04, false);
  assert.equal(step(0.04), false);
  assert.equal(step(-0.04), false);
  assert.equal(step(0.04), false);
  assert.equal(step(-0.04), true);
});

test('carregar a coqueteleira em linha reta não conclui agitação', () => {
  const input = newMotion();
  for (let i = 0; i < 100; i++) assert.equal(shakeStep(input, 0.01, 0, 0, 16), false);
});

test('gestos curtos repetidos atingem o limiar em qualquer eixo', () => {
  for (let axis = 0; axis < 3; axis++) {
    const input = newMotion();
    let accepted = 0;
    for (let i = 0; i < 37; i++) {
      const xyz = [0, 0, 0];
      xyz[axis] = (Math.floor(i / 8) % 2 === 0 ? 1 : -1) * 0.008;
      if (shakeStep(input, ...xyz, 16)) accepted++;
    }
    assert.equal(accepted, 1);
  }
});

import { eventPose, EVENT_SOURCES } from '../src/interaction/event-paths.js';

test('barata percorre a face interna do balcão entre as duas bancadas', () => {
  const home = EVENT_SOURCES.cockroach.position;
  for (let ms = 0; ms < 30000; ms += 250) {
    const pose = eventPose('cockroach', ms);
    assert.ok(Math.abs(home[0] + pose.x) < 0.65);
    assert.ok(home[1] + pose.y < 1.02);
    assert.ok(home[2] + pose.z > -0.565);
  }
  assert.notEqual(eventPose('cockroach', 0).x, eventPose('cockroach', 3000).x);
});

test('aranha desce sobre o posto, recolhe o fio e repete o percurso', () => {
  const home = EVENT_SOURCES.spider.position;
  assert.ok(Math.hypot(home[0], home[2]) < 0.2);
  assert.ok(home[1] + eventPose('spider', 0).y > 3);
  assert.equal(eventPose('spider', 8000).y, 0);
  assert.deepEqual(eventPose('spider', 16000), eventPose('spider', 0));
});
