import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { chromium } from 'playwright-core';
import { checkPointer } from './pointer-check.js';

const evidence = process.env.BAR_EVIDENCE_DIR;
const localChrome =
  process.env.CHROME_BIN ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find(existsSync);
let server, browser;
async function serve() {
  if (process.env.BAR_TEST_URL) return process.env.BAR_TEST_URL;
  server = spawn(
    'python3',
    ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', 'public'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  server.stderr.resume();
  const rl = createInterface({ input: server.stdout });
  const [line] = await Promise.race([
    once(rl, 'line'),
    once(server, 'exit').then(() => {
      throw Error('Servidor encerrou antes da inicialização.');
    }),
  ]);
  const port = line.match(/port (\d+)/)?.[1];
  assert.ok(port, line);
  return 'http://127.0.0.1:' + port;
}
try {
  const url = await serve();
  browser = await chromium.launch({
    executablePath: localChrome,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [],
    external = [],
    webErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (res) => {
    if (res.status() >= 400) webErrors.push(res.status() + ' ' + res.url());
  });
  page.on('request', (req) => {
    if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== new URL(url).origin)
      external.push(req.url());
  });
  const click = (id) => page.locator('#' + id).click();
  const tab = (name) => page.locator('[data-page="' + name + '"]').click();
  const command = (name) => page.locator('[data-command="' + name + '"]').click();
  const message = async (re) => assert.match(await page.locator('#feedback').innerText(), re);
  const add = async (...ids) => {
    for (const id of ids) {
      await page.selectOption('#ingredient', id);
      if (id === 'sugar') await click('add');
      await click('add');
    }
  };
  async function shot(name) {
    if (!evidence) return;
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: evidence + '/' + name + '.png' });
  }
  await page.goto(url);
  await page
    .waitForFunction(() => !document.querySelector('#start').disabled, {}, { timeout: 18000 })
    .catch((error) => {
      throw Error(error.message + ' / ' + [...errors, ...webErrors].join(' / '));
    });
  const details = await page.evaluate(() => {
    const scene = document.querySelector('a-scene');
    return {
      frame: AFRAME.version,
      draws: scene.renderer.info.render.calls,
      fixed: !document.querySelector('#head').getAttribute('wasd-controls').enabled,
      width: scene.canvas.width,
      height: scene.canvas.height,
    };
  });
  assert.ok(details.fixed && details.width > 0 && details.height > 0);
  await page.waitForFunction(() => document.querySelector('a-scene').renderer.info.render.calls > 10);
  console.log('A-Frame, WebGL e estação fixa', details, 'Chrome', browser.version());
  async function stockLayout() {
    return page.evaluate(async () => {
      const { INGREDIENTS } = await import('/js/domain/menu.js');
      return Object.keys(INGREDIENTS)
        .filter((id) => !INGREDIENTS[id].special)
        .map((id) => {
          const object = document.querySelector('[data-station-item="' + id + '"]').object3D;
          if (!object.visible) throw Error('Ingrediente oculto: ' + id);
          return [id, ...object.position.toArray()];
        });
    });
  }
  const openingStock = await stockLayout();
  const checkLayout = async () => {
    const fits = await page.evaluate(() => {
      const scene = document.querySelector('a-scene canvas').getBoundingClientRect();
      const header = document.querySelector('header').getBoundingClientRect();
      return (
        scene.left === 0 &&
        Math.abs(scene.width - innerWidth) < 1 &&
        Math.abs(scene.top - header.bottom) < 1 &&
        Math.abs(scene.bottom - innerHeight) < 1
      );
    });
    assert.ok(fits, 'Cena ocupa toda a janela abaixo da barra superior');
  };
  await page.setViewportSize({ width: 2280, height: 1308 });
  await checkLayout();
  await page.setViewportSize({ width: 1440, height: 900 });
  await checkLayout();
  await shot('entrada');
  // A new player can interact with the counter before opening the notebook.
  for (const id of ['lime', 'glass']) {
    const point = await page.evaluate(key => {
      const scene = document.querySelector('a-scene');
      const item = scene.querySelector('[data-station-item="' + key + '"]');
      const pos = item.object3D.getWorldPosition(new AFRAME.THREE.Vector3()).project(scene.camera);
      const rect = scene.canvas.getBoundingClientRect();
      return [rect.left + (1 + pos.x) * rect.width / 2, rect.top + (1 - pos.y) * rect.height / 2];
    }, id);
    await page.mouse.click(...point);
  }
  assert.match(await page.locator('#feedback').textContent(), /Limão no copo/);
  await page.reload();
  await click('turn-control');
  await click('open-notebook');
  assert.match(await page.locator('#dialogue').innerText(), /Cuba Libre/);
  await shot('executivo');
  await page.keyboard.press('Escape');
  await click('help');
  assert.equal(await page.locator('#info').isVisible(), true);
  await page.keyboard.press('Escape');
  await click('open-notebook');
  await click('pause');
  assert.equal(await page.locator('[data-command=deliver]').isDisabled(), true);
  await click('pause');
  await tab('manual');
  assert.equal(await page.locator('#recipe option').count(), 9);
  await tab('order');
  await command('deliver');
  await message(/devolveu o copo/);
  await tab('bench');
  await add('rum', 'rum');
  await tab('order');
  await command('deliver');
  await message(/devolveu o copo/);
  assert.doesNotMatch(await page.locator('#dialogue').innerText(), /excesso|rum|cola/i);
  assert.match(await page.locator('#contents').innerText(), /Highball · devolvido/);
  await tab('bench');
  await click('rinse');
  await add('rum', 'cola', 'lime', 'ice');
  await tab('order');
  await command('deliver');
  assert.equal(await page.locator('#customer').innerText(), 'Turista');
  assert.deepEqual(await stockLayout(), openingStock);

  await tab('bench');
  await add('lime', 'sugar');
  await command('muddle');
  await add('cachaca', 'ice');
  await tab('order');
  await command('deliver');
  assert.equal(await page.locator('#customer').innerText(), 'Aposentado');
  await tab('manual');
  assert.equal(await page.locator('#recipe option').count(), 9);
  for (const [index, name] of [[4, 'Negroni'], [7, 'Moscow Mule'], [8, 'Martini']]) {
    await page.selectOption('#recipe', String(index));
    assert.equal(await page.locator('#recipe option:checked').innerText(), name);
    assert.equal(await page.locator('#recipe-text h2').innerText(), name);
    assert.doesNotMatch(await page.locator('#recipe-text').innerText(), /barata|lesma|gosma|aranha|captur|recolh/i);
  }
  await page.selectOption('#recipe', '0');
  assert.match(await page.locator('#recipe-text').innerText(), /Rum/);
  await tab('bench');
  assert.deepEqual(await stockLayout(), openingStock);
  assert.equal(await page.inputValue('#target'), 'shaker');
  await add('whisky', 'lemon_juice', 'sugar_syrup', 'ice');
  await command('shake');
  await message(/Feche/);
  await command('toggleLid');
  await command('shake');
  await command('toggleLid');
  await command('transfer');
  await tab('order');
  await command('deliver');
  const remaining = await page.evaluate(async () =>
    (await import('/js/domain/menu.js')).ORDERS.slice(3),
  );
  for (const order of remaining) {
    assert.equal(await page.locator('#customer').innerText(), order.customer);
    await tab('bench');
    if (order.event) {
      await click('event-action');
      await click('event-return');
      await click('event-action');
      await click('event-action');
      await click('rinse');
      await click('event-action');
      await click('event-action');
    }
    for (const id of Object.keys(order.ingredients)) {
      if (id !== order.event) await add(id);
    }
    if (order.technique === 'shake') {
      await command('toggleLid');
      await command('shake');
      await command('toggleLid');
      await command('transfer');
    }
    if (order.technique === 'muddle' || order.technique === 'stir') await command(order.technique);
    await tab('order');
    await command('deliver');
    await message(/aprovad/i);
    console.log('Caderno · servido', order.name);
  }
  assert.equal(await page.locator('#end').isVisible(), true);
  await shot('amostra-concluida');
  await command('restart');
  assert.equal(await page.locator('#customer').innerText(), 'Executivo');
  assert.deepEqual(await stockLayout(), openingStock);
  await page.keyboard.press('Escape');
  await checkPointer(page, shot);
  await click('open-notebook');
  await command('restart');
  await page.keyboard.press('Escape');
  await click('sound');
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await checkLayout();
  await click('open-notebook');
  await tab('bench');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  assert.deepEqual(webErrors, []);
  assert.deepEqual(external, []);
  console.log(
    'PASS · pedidos, manual, pausa, erro, pia, técnicas, reinício, áudio, largura móvel e rede local.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
