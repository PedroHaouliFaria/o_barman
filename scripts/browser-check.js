// Ensaio de navegador da v2 (React Three Fiber): serve o jogo com Vite, joga o
// primeiro pedido pelos objetos 3D, os outros oito pelo Caderno, testa o
// arremesso com Rapier e o reinício. Uso: npm run test:browser
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const evidence = process.env.BAR_EVIDENCE_DIR;
const chrome =
  process.env.CHROME_BIN ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(
    existsSync,
  );
let server, browser;

async function serve() {
  if (process.env.BAR_TEST_URL) return process.env.BAR_TEST_URL;
  const port = 5199;
  server = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--bypass-lock'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => /ready|Local:/i.test(String(d)) && resolve());
    server.on('exit', () => reject(Error('Vite encerrou antes de iniciar.')));
  });
  return 'http://localhost:' + port;
}

try {
  const url = await serve();
  browser = await chromium.launch({ executablePath: chrome, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const click = (id) => page.locator('#' + id).click();
  const feedback = () => page.locator('#feedback').innerText();
  const shot = async (name) => {
    if (!evidence) return;
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: evidence + '/' + name + '.png' });
  };

  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector('#start').disabled, {}, { timeout: 30000 });
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('.stage canvas').getBoundingClientRect();
    const header = document.querySelector('header').getBoundingClientRect();
    return { full: Math.abs(canvas.width - innerWidth) < 1 && Math.abs(canvas.top - header.bottom) < 1 && Math.abs(canvas.bottom - innerHeight) < 1 };
  });
  assert.ok(layout.full, 'A cena ocupa a janela abaixo da barra superior');
  await shot('entrada');

  // ---- Pedido 1 inteiro pelos objetos 3D (mouse) ----
  const clickItem = async (id, look = id) => {
    await page.evaluate((key) => window.__barman.station.lookAt(key), look);
    await page.waitForTimeout(120);
    const p = await page.evaluate((key) => window.__barman.station.locate(key), id);
    assert.ok(p, 'Objeto visível na tela: ' + id);
    await page.mouse.move(p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(120);
  };
  await click('turn-control');
  for (const bottle of ['rum', 'cola']) {
    await clickItem(bottle);
    assert.match(await feedback(), /em mãos/);
    await clickItem('glass');
    assert.match(await feedback(), /no copo/);
    await clickItem('slot-' + bottle);
    assert.match(await feedback(), /no seu lugar/);
  }
  await clickItem('bin-lime');
  await clickItem('glass');
  await clickItem('bin-ice');
  await clickItem('glass');
  assert.match(await feedback(), /Gelo no copo/);
  await clickItem('glass');
  await clickItem('receiving-hand');
  assert.match(await feedback(), /Cuba Libre aprovado/);
  await shot('cuba-libre-aprovado');
  console.log('Pedido 1 pelos objetos 3D: ok');

  // ---- Arremesso (Q) com física Rapier ----
  await clickItem('spoon');
  const before = await page.evaluate(() => window.__barman.game.state.phase);
  assert.equal(before, 'playing');
  const held = await page.evaluate(() => window.__barman.station.where('spoon'));
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(400);
  const flying = await page.evaluate(() => window.__barman.station.where('spoon'));
  await page.waitForTimeout(3000);
  const rest = await page.evaluate(() => window.__barman.station.where('spoon'));
  await page.waitForTimeout(500);
  const still = await page.evaluate(() => window.__barman.station.where('spoon'));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  assert.ok(dist(held, flying) > 0.3, 'A colher voou: ' + JSON.stringify([held, flying]));
  assert.ok(rest.y > -0.05 && rest.y < 1.3, 'A colher caiu sobre uma superfície: ' + JSON.stringify(rest));
  assert.ok(dist(rest, still) < 0.01, 'A colher repousou');
  console.log('Arremesso: ok');

  // ---- Pedidos 2 a 9 pelo Caderno (preparo assistido) ----
  await click('open-notebook');
  const tab = (name) => page.locator('[data-page="' + name + '"]').click();
  const command = (name) => page.locator('[data-command="' + name + '"]').click();
  const add = async (target, ...ids) => {
    await page.selectOption('#target', target);
    for (const id of ids) {
      if (id === 'special') {
        await click('event-action');
        await click('event-action');
        continue;
      }
      await page.selectOption('#ingredient', id);
      if (id === 'sugar') await click('add');
      await click('add');
    }
  };
  const deliver = async (name) => {
    await tab('order');
    await command('deliver');
    assert.match(await feedback(), new RegExp(name + ' aprovado'));
  };
  const glass = (type) => page.selectOption('#glass-type', type);
  const shake = async () => {
    await command('toggleLid');
    await command('shake');
    await command('toggleLid');
    await command('transfer');
  };
  // 2 Caipirinha
  await tab('bench');
  await glass('rocks');
  await add('glass', 'lime', 'sugar');
  await command('muddle');
  await add('glass', 'cachaca', 'ice');
  await deliver('Caipirinha');
  // 3 Whiskey Sour
  await tab('bench');
  await glass('coupe');
  await add('shaker', 'whisky', 'lemon_juice', 'sugar_syrup', 'ice');
  await shake();
  await deliver('Whiskey Sour');
  // 4 Margarita
  await tab('bench');
  await glass('coupe');
  await add('shaker', 'tequila', 'orange_liqueur', 'lemon_juice', 'ice');
  await shake();
  await deliver('Margarita');
  // 5 Negroni com barata
  await tab('bench');
  await glass('rocks');
  await add('glass', 'gin', 'campari', 'sweet_vermouth', 'ice', 'special');
  await command('stir');
  await deliver('Negroni com barata');
  // 6 Mojito
  await tab('bench');
  await glass('highball');
  await add('glass', 'lime', 'sugar');
  await command('muddle');
  await add('glass', 'rum', 'mint', 'soda_water', 'ice');
  await deliver('Mojito');
  // 7 Dry Martini
  await tab('bench');
  await glass('coupe');
  await add('glass', 'gin', 'dry_vermouth', 'ice');
  await command('stir');
  await deliver('Dry Martini');
  // 8 Moscow Mule com gosma
  await tab('bench');
  await glass('mug');
  await add('glass', 'vodka', 'ginger_beer', 'lemon_juice', 'ice', 'special');
  await deliver('Moscow Mule com gosma');
  // 9 Martini com aranha
  await tab('bench');
  await glass('coupe');
  await add('glass', 'gin', 'dry_vermouth', 'ice', 'special');
  await command('stir');
  await deliver('Martini com aranha');
  assert.equal(await page.evaluate(() => window.__barman.game.state.phase), 'finished');
  assert.ok(await page.locator('#end').isVisible());
  console.log('Pedidos 2 a 9 pelo Caderno: ok');
  await command('restart');
  assert.equal(await page.evaluate(() => window.__barman.game.state.orderIndex), 0);
  console.log('Reinício: ok');

  assert.deepEqual(errors, [], 'Sem erros no console');
  console.log('Ensaio de navegador aprovado.');
} finally {
  await browser?.close();
  server?.kill();
}
