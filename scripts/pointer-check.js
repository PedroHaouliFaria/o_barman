// Use projected positions to drive a real mouse and keyboard on the canvas.
// The ray only locates a visible pixel; all game actions use browser input.
import assert from 'node:assert/strict';

export async function checkPointer(page, shot) {
  const labels = await page.evaluate(() => {
    const signs = [...document.querySelectorAll('#station-world a-plane')];
    return {
      count: signs.length,
      readable: signs.every((el) => el.getObject3D('mesh')?.material.map?.image?.tagName === 'CANVAS'),
    };
  });
  assert.ok(labels.count > 10 && labels.readable, 'Placas usam a superfície de texto local');
  const hands = await page.evaluate(() =>
    [...document.querySelectorAll('[data-station-hand]')].map(el => el.dataset.stationHand),
  );
  assert.deepEqual(hands, ['left', 'right']);

  async function lookToward(id) {
    const drag = await page.evaluate((key) => {
      const scene = document.querySelector('a-scene');
      const target = scene.querySelector('[data-station-item="' + key + '"]');
      const point = target.object3D.getWorldPosition(new AFRAME.THREE.Vector3());
      const direction = point.sub(scene.camera.getWorldPosition(new AFRAME.THREE.Vector3())).normalize();
      const look = document.querySelector('#head').components['look-controls'];
      const delta = Math.atan2(-direction.x, -direction.z) - look.yawObject.rotation.y;
      const sensitivity = look.data.reverseMouseDrag ? 0.002 : -0.002;
      return [
        Math.atan2(Math.sin(delta), Math.cos(delta)) / sensitivity,
        (Math.asin(direction.y) - look.pitchObject.rotation.x) / sensitivity,
      ];
    }, id);
    const area = await page.locator('a-scene canvas').boundingBox();
    const x = area.x + area.width / 2,
      y = area.y + area.height / 2;
    const steps = Math.max(
      1,
      Math.ceil(
        Math.max(Math.abs(drag[0]) / (area.width * 0.4), Math.abs(drag[1]) / (area.height * 0.4)),
      ),
    );
    for (let i = 0; i < steps; i++) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + drag[0] / steps, y + drag[1] / steps, { steps: 3 });
      await page.mouse.up();
    }
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  }
  async function aim(id, retry = true) {
    const hit = await page.evaluate((wanted) => {
      const scene = document.querySelector('a-scene');
      const T = AFRAME.THREE;
      const target = document.querySelector('[data-station-item="' + wanted + '"]');
      const cam = scene.camera;
      scene.object3D.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(target.object3D);
      const center = target.object3D.getWorldPosition(new T.Vector3()).project(cam);
      const corners = [];
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            corners.push(new T.Vector3(x, y, z).project(cam));
          }
      const xs = corners.map((v) => v.x),
        ys = corners.map((v) => v.y);
      const candidates = [center];
      for (const i of [0.5, 0.25, 0.75, 0.15, 0.85, 0.05, 0.95])
        for (const j of [0.5, 0.25, 0.75, 0.15, 0.85, 0.05, 0.95]) {
          candidates.push(
            new T.Vector2(
              T.MathUtils.lerp(Math.min(...xs), Math.max(...xs), i),
              T.MathUtils.lerp(Math.min(...ys), Math.max(...ys), j),
            ),
          );
        }
      const r = scene.canvas.getBoundingClientRect();
      const ray = new T.Raycaster();
      for (const point of candidates) {
        if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1) continue;
        ray.setFromCamera(point, cam);
        const top = ray.intersectObject(scene.object3D, true).find(({ object }) => {
          for (let node = object; node; node = node.parent) if (!node.visible) return false;
          return object.isMesh;
        });
        if (!top) continue;
        for (let n = top.object; n; n = n.parent) {
          if (n === target.object3D)
            return [r.left + ((point.x + 1) * r.width) / 2, r.top + ((1 - point.y) * r.height) / 2];
        }
      }
    }, id);
    if (!hit && retry) {
      await lookToward(id);
      return aim(id, false);
    }
    assert.ok(hit, 'Alvo visível no balcão: ' + id);
    await page.mouse.move(...hit);
    return hit;
  }
  const pick = async (id) => {
    await page.mouse.click(...(await aim(id)));
  };
  async function place(id, into, key = false) {
    const kind = await page.evaluate(async id => (await import('/js/domain/menu.js')).INGREDIENTS[id]?.kind, id);
    if (id === 'sugar') {
      await pick('spoon');
      await pick('sugar');
      await feedback(/porção de açúcar/);
    } else await pick(['lime', 'mint', 'ice'].includes(id) ? 'bin-' + id : id);
    if (key) {
      await aim(into);
      await page.keyboard.press('e');
    } else await pick(into);
    if (kind === 'liquid') {
      await feedback(/no copo|na coqueteleira/);
      await pick('slot-' + id);
      await feedback(/no seu lugar/);
    }
  }
  async function feedback(re) {
    assert.match(await page.locator('#feedback').innerText(), re);
  }

  const stage = await page.locator('a-scene canvas').boundingBox();
  // Ordinary customers already share the bar with the animals.
  for (const id of ['cockroach', 'spider', 'slug_slime']) {
    await pick('event-' + id);
    assert.equal(await page.locator('#customer').innerText(), 'Executivo');
    assert.equal(await page.locator('#event-tools').isVisible(), false);
    await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
  }
  await pick('choose-highball');
  await pick('customer');
  await feedback(/devolveu o copo/);
  assert.equal(await page.locator('#customer').innerText(), 'Executivo');
  await place('rum', 'glass', true);
  await place('glass', 'receiving-hand');
  await feedback(/Executivo devolveu o copo/);
  assert.doesNotMatch(await page.locator('#dialogue').textContent(), /rum|cola/i);
  assert.match(await page.locator('#contents').textContent(), /Highball · devolvido/);

  await place('glass', 'sink');
  await feedback(/lavado/);
  for (const id of ['rum', 'cola', 'lime', 'ice']) await place(id, 'glass');
  await place('glass', 'receiving-hand');
  assert.equal(await page.locator('#customer').innerText(), 'Turista');
  await pick('next-page');
  await feedback(/Livro de receitas · Caipirinha/);
  await pick('previous-page');
  await feedback(/Livro de receitas · Cuba Libre/);
  for (const type of ['coupe', 'highball', 'rocks']) {
    await pick('choose-' + type);
    await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
    assert.equal(
      await page.locator('#glass-type').inputValue(),
      type,
      await page.locator('#feedback').innerText(),
    );
  }
  for (const id of ['lime', 'sugar']) await place(id, 'glass');
  await place('pestle', 'glass');
  await feedback(/macerados/);
  for (const id of ['cachaca', 'ice']) await place(id, 'glass');
  await place('glass', 'tray');
  assert.equal(await page.locator('#customer').innerText(), 'Aposentado');
  await pick('choose-coupe');
  await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
  for (const id of ['whisky', 'lemon_juice', 'sugar_syrup', 'ice']) await place(id, 'shaker');
  await place('lid', 'shaker');
  await feedback(/fechada/);
  await pick('shaker');
  await page.mouse.move(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
  await page.keyboard.press('e');
  await feedback(/agitada/);
  await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
  await pick('lid');
  await feedback(/em mãos/);
  await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
  await place('shaker', 'glass');
  await feedback(/transferido/);
  await place('glass', 'customer');
  const rest = await page.evaluate(async () => (await import('/js/domain/menu.js')).ORDERS.slice(3));
  for (const order of rest) {
    assert.equal(await page.locator('#customer').textContent(), order.customer);
    await pick('choose-' + order.glass);
    await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
    const vessel = order.technique === 'shake' ? 'shaker' : 'glass';
    for (const id of Object.keys(order.ingredients)) {
      if (id === order.event) {
        const source = 'event-' + id;
        await page.waitForFunction(
          (key) => document.querySelector('[data-station-item="' + key + '"]')?.object3D.visible,
          source,
        );
        if (shot) await shot(order.id);
        await pick(source);
        await feedback(/em mãos/);
        assert.equal(await page.locator('[data-station-item="' + source + '"]').evaluate(el => el.object3D.visible), id === 'slug_slime');
        await pick(vessel);
        continue;
      }
      await place(id, vessel);
    }
    if (order.technique === 'shake') {
      await place('lid', 'shaker');
      await pick('shaker');
      await page.mouse.move(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
      await page.keyboard.press('e');
      await feedback(/agitada/);
      await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
      await pick('lid');
      await page.mouse.click(stage.x + stage.width * 0.07, stage.y + stage.height * 0.07);
      await place('shaker', 'glass');
    }
    if (order.technique === 'muddle') await place('pestle', 'glass');
    if (order.technique === 'stir') await place('spoon', 'glass');
    await place('glass', 'customer');
    await feedback(/aprovad/i);
    console.log('Cena 3D · servido', order.name);
  }
  assert.equal(await page.locator('#end').getAttribute('hidden'), null);
  console.log('PASS · nove pedidos pela cena 3D, incluindo três coletas ambientais.');
}
