// Ensaio de navegador da v2 (React Three Fiber): serve o jogo com Vite, joga os
// 9 pedidos pelos objetos 3D, testa o arremesso com Rapier, reinicia e joga os
// 9 de novo pelo Caderno. Uso: npm run test:browser
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

  // ---- Os 9 pedidos pelos objetos 3D (mouse e tecla E) ----
  const clickItem = async (id, look = id) => {
    await page.evaluate((key) => window.__barman.station.lookAt(key), look);
    await page.waitForTimeout(120);
    const p = await page.evaluate((key) => window.__barman.station.locate(key), id);
    assert.ok(p, 'Objeto visível na tela: ' + id);
    await page.mouse.move(p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(120);
  };
  const expect = async (pattern, what) => assert.match(await feedback(), pattern, what);
  // Olha para o teto e clica: nenhum objeto sob o mouse.
  const clickEmpty = async () => {
    await page.evaluate(() => window.__barman.station.lookAt([0, 3.2, -1.2]));
    await page.waitForTimeout(100);
    await page.mouse.move(720, 470);
    await page.mouse.click(720, 470);
    await page.waitForTimeout(120);
  };
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__barman.game.state)));
  const chooseGlass = async (type) => {
    await clickItem('choose-' + type);
    assert.equal((await state()).glass.type, type, 'copo escolhido na estante');
  };
  const pour = async (bottle, into) => {
    await clickItem(bottle);
    await expect(/em mãos/);
    await clickItem(into);
    await expect(into === 'glass' ? /no copo/ : /na coqueteleira/, bottle + ' em ' + into);
    await clickItem('slot-' + bottle);
    await expect(/no seu lugar/);
  };
  const portion = async (id, into) => {
    await clickItem('bin-' + id);
    await clickItem(into);
    await expect(into === 'glass' ? /no copo/ : /na coqueteleira/, id + ' em ' + into);
  };
  const sugar = async (into) => {
    await clickItem('spoon');
    await clickItem('sugar');
    await expect(/porção de açúcar/);
    await clickItem(into);
    await expect(/Açúcar/);
  };
  const muddle = async () => {
    await clickItem('pestle');
    await clickItem('glass');
    await expect(/macerados/);
  };
  const stir = async () => {
    await clickItem('spoon');
    await clickItem('glass');
    await expect(/mexidos/);
  };
  const special = async (id, into = 'glass') => {
    await clickItem('event-' + id);
    await expect(/em mãos/, 'coletou ' + id);
    await clickItem(into);
    await expect(/no copo|na coqueteleira/, id + ' depositado');
  };
  const shakeAndTransfer = async () => {
    await clickItem('lid');
    await clickItem('shaker');
    await expect(/fechada/);
    await clickItem('shaker');
    await page.evaluate(() => window.__barman.station.lookAt([0, 3.2, -1.2]));
    await page.mouse.move(720, 470);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(120);
    await expect(/agitada/);
    await clickEmpty();
    await clickItem('lid', 'shaker');
    await expect(/aberta|em mãos/);
    await clickEmpty();
    assert.equal((await state()).shaker.closed, false, 'tampa aberta');
    await clickItem('shaker');
    await clickItem('glass');
    await expect(/transferido/);
    await clickEmpty();
  };
  const serve3d = async (name) => {
    await clickItem('glass');
    await clickItem('receiving-hand');
    await expect(new RegExp(name + ' aprovado'), 'entrega de ' + name);
    await shot('3d-' + name.toLowerCase().replace(/\W+/g, '-'));
  };

  await click('turn-control');
  // 1 Cuba Libre
  await chooseGlass('highball');
  for (const bottle of ['rum', 'cola']) await pour(bottle, 'glass');
  await portion('lime', 'glass');
  await portion('ice', 'glass');
  await serve3d('Cuba Libre');
  // 2 Caipirinha
  await chooseGlass('rocks');
  await portion('lime', 'glass');
  await sugar('glass');
  await muddle();
  await pour('cachaca', 'glass');
  await portion('ice', 'glass');
  await serve3d('Caipirinha');
  // 3 Whiskey Sour
  await chooseGlass('coupe');
  for (const bottle of ['whisky', 'lemon_juice', 'sugar_syrup']) await pour(bottle, 'shaker');
  await portion('ice', 'shaker');
  await shakeAndTransfer();
  await serve3d('Whiskey Sour');
  // 4 Margarita
  await chooseGlass('coupe');
  for (const bottle of ['tequila', 'orange_liqueur', 'lemon_juice']) await pour(bottle, 'shaker');
  await portion('ice', 'shaker');
  await shakeAndTransfer();
  await serve3d('Margarita');
  // 5 Negroni com barata
  await chooseGlass('rocks');
  for (const bottle of ['gin', 'campari', 'sweet_vermouth']) await pour(bottle, 'glass');
  await portion('ice', 'glass');
  await special('cockroach');
  await stir();
  await serve3d('Negroni com barata');
  // 6 Mojito
  await chooseGlass('highball');
  await portion('lime', 'glass');
  await sugar('glass');
  await muddle();
  await pour('rum', 'glass');
  await portion('mint', 'glass');
  await pour('soda_water', 'glass');
  await portion('ice', 'glass');
  await serve3d('Mojito');
  // 7 Dry Martini
  await chooseGlass('coupe');
  for (const bottle of ['gin', 'dry_vermouth']) await pour(bottle, 'glass');
  await portion('ice', 'glass');
  await stir();
  await serve3d('Dry Martini');
  // 8 Moscow Mule com gosma
  await chooseGlass('mug');
  for (const bottle of ['vodka', 'ginger_beer', 'lemon_juice']) await pour(bottle, 'glass');
  await portion('ice', 'glass');
  await special('slug_slime');
  await serve3d('Moscow Mule com gosma');
  // 9 Martini com aranha
  await chooseGlass('coupe');
  for (const bottle of ['gin', 'dry_vermouth']) await pour(bottle, 'glass');
  await portion('ice', 'glass');
  await special('spider');
  await stir();
  await serve3d('Martini com aranha');
  assert.equal((await state()).phase, 'finished');
  console.log('Os 9 pedidos pelos objetos 3D: ok');
  await click('turn-control');
  assert.equal((await state()).phase, 'playing');
  await chooseGlass('highball');

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

  // ---- Pedidos 1 a 9 pelo Caderno (preparo assistido), depois de reiniciar ----
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
  // Pedido 1 já vem com o copo do reinício; volta a ele antes de seguir pelo Caderno.
  await tab('bench');
  await add('glass', 'rum', 'cola', 'lime', 'ice');
  await deliver('Cuba Libre');
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
  console.log('Os 9 pedidos pelo Caderno: ok');
  await command('restart');
  assert.equal(await page.evaluate(() => window.__barman.game.state.orderIndex), 0);
  console.log('Reinício: ok');

  assert.deepEqual(errors, [], 'Sem erros no console');
  console.log('Ensaio de navegador aprovado.');
} finally {
  await browser?.close();
  server?.kill();
}
