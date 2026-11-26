// Ensaio de VR sem headset: simula um Meta Quest 3 (IWER) no Chrome, entra na
// sessão WebXR e joga os 9 pedidos só com gestos dos controles: pegar o copo na
// prateleira, inclinar garrafas, soltar porções, colherada de açúcar, macerar,
// mexer, tampar, agitar, despejar da coqueteleira, coletar bichos e servir na mão.
// Uso: npm run test:xr  (não substitui o teste no Quest físico)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const chrome =
  process.env.CHROME_BIN ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
let server, browser;
async function serve() {
  if (process.env.BAR_TEST_URL) return process.env.BAR_TEST_URL;
  server = spawn('npx', ['vite', '--port', '5198', '--strictPort', '--bypass-lock'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => /ready|Local:/i.test(String(d)) && resolve());
    server.on('exit', () => reject(Error('Vite encerrou antes de iniciar.')));
  });
  return 'http://localhost:5198';
}

const UPRIGHT = [0, 0, 0, 1];
let frameMs = 16;
const slow = (ms) => Math.max(ms, frameMs * 2.5);
// O despejo soma no máximo 100 ms por quadro até 430 ms: em quadros lentos precisa de mais quadros.
const dwell = () => (Math.ceil(430 / Math.min(frameMs, 100)) + 4) * frameMs;
const UPSIDE_DOWN = [0, 0, 1, 0]; // 180° em torno de Z: boca para baixo

try {
  const url = await serve();
  browser = await chromium.launch({ executablePath: chrome, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '/?xr-emulate&leve');
  await page.waitForFunction(() => !document.querySelector('#start').disabled, {}, { timeout: 60000 });
  await page.click('#start');
  await page.click('#enter-vr');
  await page.waitForFunction(() => Boolean(window.__barman.xr.getState().session), {}, { timeout: 15000 });
  // Os modelos do Blender precisam estar carregados (as medidas das garrafas mudam a boca do despejo).
  await page.waitForFunction(() => window.__barman.station.ready === true, {}, { timeout: 60000 });
  await page.evaluate(() => window.__barman.station.declutter());
  const fps = await page.evaluate(
    () => new Promise((done) => {
      let n = 0;
      const t0 = performance.now();
      const s = window.__barman.xr.getState().session;
      const tick = () => (++n < 30 ? s.requestAnimationFrame(tick) : done(Math.round((n * 1000) / (performance.now() - t0))));
      s.requestAnimationFrame(tick);
    }),
  );
  console.log('Quadros por segundo no simulador (SwiftShader, sem GPU): ' + fps);
  // Os gestos dependem de quadros: em simulador lento, cada pose dura mais.
  frameMs = Math.max(16, 1000 / Math.max(1, fps));

  const wait = (ms = 250) => page.waitForTimeout(ms);
  const feedback = () => page.locator('#feedback').innerText();
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__barman.game.state)));
  const where = (id) => page.evaluate((key) => window.__barman.station.where(key), id);
  const pose = (side, p, q = UPRIGHT) =>
    page.evaluate(
      ([side, p, q]) => {
        const c = window.__questEmulator.controllers[side];
        c.position.set(...p);
        c.quaternion.set(...q);
      },
      [side, p, q],
    );
  const grip = (side, v) => page.evaluate(([side, v]) => window.__questEmulator.controllers[side].updateButtonValue('squeeze', v), [side, v]);
  const R = 'right';
  // A mão segura o objeto 4,5 cm à frente (−Z local do controle).
  const holdAt = (p, q = UPRIGHT) => [p[0], p[1], p[2] + (q === UPSIDE_DOWN ? 0.045 : 0.045)];
  async function grab(id, side = R) {
    const p = await where(id);
    await pose(side, [p.x, p.y + 0.01, p.z + 0.03]);
    await wait(200);
    await grip(side, 1);
    await wait(200);
  }
  async function release(side = R) {
    // A mão fica parada antes de soltar: soltar em movimento arremessa (a velocidade passa ao objeto).
    await wait(700);
    await grip(side, 0);
    await wait(250);
  }
  async function moveTo(p, q = UPRIGHT, side = R, ms = 250) {
    await pose(side, p, q);
    await wait(ms);
  }
  const glassAt = () => where('glass');
  // Boca de cada copo acima da origem (src/scene/glass-shapes.js).
  const rimOf = (type) => ({ highball: 0.0905, rocks: 0.026, coupe: 0.0813, mug: 0.0399 })[type];
  const controller = () => page.evaluate(() => Array.from(window.__questEmulator.controllers.right.position.vec3));
  // A pegada do controle tem inclinação própria: mede onde fica o ponto local (0, y, 0) do objeto
  // em relação ao controle, com a orientação `q`, e devolve uma função que leva esse ponto até um alvo.
  async function handle(id, y, q = UPRIGHT) {
    const c = await controller();
    await pose(R, c, q);
    await wait(slow(250));
    const p = await page.evaluate(([k, y]) => window.__barman.station.pointOf(k, y), [id, y]);
    const off = [c[0] - p.x, c[1] - p.y, c[2] - p.z];
    return async (target, ms = 250, refine = 1) => {
      await pose(R, [target[0] + off[0], target[1] + off[1], target[2] + off[2]], q);
      await wait(ms);
      // Corrige o resto do erro (a pegada do simulador não é perfeitamente rígida).
      for (let i = 0; i < refine; i++) {
        const now = await page.evaluate(([k, y]) => window.__barman.station.pointOf(k, y), [id, y]);
        const c2 = await controller();
        await pose(R, [c2[0] + target[0] - now.x, c2[1] + target[1] - now.y, c2[2] + target[2] - now.z], q);
        await wait(slow(200));
      }
    };
  }
  async function chooseGlass(type) {
    await grab('choose-' + type);
    assert.equal((await state()).glass.type, type, 'copo ' + type + ' na mão');
    await moveTo([-0.02, 1.23, -0.6]);
    await release(); // cai na bancada
    await wait(600);
  }
  const rim = async () => rimOf((await state()).glass.type);
  async function pour(bottle, into = 'glass') {
    const home = await where(bottle);
    await grab(bottle);
    assert.match(await feedback(), /em mãos/, 'pegou ' + bottle);
    const t = into === 'glass' ? await glassAt() : await where('shaker');
    const top = into === 'glass' ? await rim() : 0.112;
    const mouth = await page.evaluate((id) => window.__barman.station.mouth(id), bottle);
    const to = await handle(bottle, mouth, UPSIDE_DOWN);
    await to([t.x, t.y + top + 0.01, t.z], dwell());
    if (!/no copo|na coqueteleira/.test(await feedback()))
      console.log('DEBUG', JSON.stringify(await page.evaluate(() => window.__barman.station.debugHands())));
    assert.match(await feedback(), /no copo|na coqueteleira/, bottle + ' dosado: ' + (await feedback()));
    // Apruma e devolve a garrafa ao lugar dela na estante: soltar devagar sobre a prateleira a assenta em pé.
    await moveTo([t.x, t.y + 0.4, t.z + 0.2], UPRIGHT);
    const back = await handle(bottle, -0.0945);
    await back([home.x, Math.max(home.y, 1.1) - 0.0945 + 0.01, Math.min(home.z, 0.9)], slow(300), 2);
    const pre = await page.evaluate((b) => ({ obj: window.__barman.station.where(b), h: window.__barman.station.debugHands()[1] }), bottle);
    await release();
    const said = await feedback();
    const rest = await where(bottle);
    assert.ok(Math.hypot(rest.x - home.x, rest.z - home.z) < 0.1 && Math.abs(rest.y - home.y) < 0.02, bottle + ' de volta à estante: ' + JSON.stringify({ rest, home, said, pre: pre.obj, speed: pre.h.speed }));
  }
  async function portion(id, into = 'glass') {
    await grab('bin-' + id);
    assert.match(await feedback(), /em mãos/, 'pegou ' + id);
    const t = into === 'glass' ? await glassAt() : await where('shaker');
    const top = into === 'glass' ? await rim() : 0.112;
    const to = await handle(id, 0);
    await to([t.x, t.y + top + 0.04, t.z], slow(250));
    await release();
    assert.match(await feedback(), /no copo|na coqueteleira/, id + ' depositado: ' + (await feedback()));
  }
  // Devolve o utensílio para perto do lugar dele, devagar (cai deitado sobre a bancada).
  async function putBack(id) {
    const home = { spoon: [-0.15, 1.16, -0.66], pestle: [-0.43, 1.25, -0.62] }[id];
    const to = await handle(id, 0);
    await to(home, slow(300));
    await release();
  }
  async function sugar(into = 'glass') {
    await grab('spoon');
    const to = await handle('spoon', 0.079);
    const jar = await where('sugar');
    await to([jar.x, jar.y + 0.05, jar.z], slow(300));
    assert.match(await feedback(), /açúcar/, 'colherada');
    const t = into === 'glass' ? await glassAt() : await where('shaker');
    await to([t.x, t.y + (into === 'glass' ? (await rim()) - 0.03 : 0.05), t.z], slow(400));
    assert.match(await feedback(), /Açúcar no copo|Açúcar na coqueteleira/, 'açúcar depositado: ' + (await feedback()));
    await putBack('spoon');
  }
  async function stir() {
    await grab('spoon');
    const to = await handle('spoon', 0.079);
    const g = await glassAt();
    const type = (await state()).glass.type;
    const bottom = { highball: -0.0682, rocks: -0.0733, coupe: 0.0209, mug: -0.0722 }[type];
    const y = g.y + (bottom + (await rim())) / 2;
    // Uma volta em 12 passos; em quadros lentos cada passo precisa de pelo menos um quadro.
    for (let i = 0; i <= 30 && !(await state()).glass.stirred; i++) {
      const a = (i / 12) * Math.PI * 2;
      await to([g.x + 0.022 * Math.cos(a), y, g.z + 0.022 * Math.sin(a)], slow(45));
    }
    assert.equal((await state()).glass.stirred, true, 'mexido com a colher');
    await putBack('spoon');
  }
  async function muddle() {
    await grab('pestle');
    const to = await handle('pestle', -0.1);
    const g = await glassAt();
    const top = await rim();
    for (let i = 0; i < 3 && !(await state()).glass.muddled; i++) {
      await to([g.x, g.y + top + 0.03, g.z], slow(200));
      await to([g.x, g.y + top - 0.07, g.z], slow(200));
    }
    assert.equal((await state()).glass.muddled, true, 'macerado');
    await putBack('pestle');
  }
  async function closeLid() {
    await grab('lid');
    const to = await handle('lid', -0.03);
    const s = await where('shaker');
    await to([s.x, s.y + 0.112 + 0.005, s.z], slow(250));
    await release();
    assert.equal((await state()).shaker.closed, true, 'tampa encaixada');
  }
  async function shake() {
    await grab('shaker');
    const s = await where('shaker');
    for (let i = 0; i < 14 && !(await state()).shaker.shaken; i++) {
      await pose(R, [s.x, s.y + (i % 2 ? 0.08 : -0.02), s.z + 0.045]);
      await wait(90);
    }
    if (!(await state()).shaker.shaken) {
      // Quadros lentos demais para o gesto (cada quadro > 120 ms): usa a alternativa do gatilho,
      // apontando a coqueteleira fechada para o teto.
      console.log('   (agitar pelo gatilho: o simulador está lento demais para o gesto)');
      await pose(R, [s.x, s.y + 0.1, s.z + 0.045], [0.7071, 0, 0, 0.7071]);
      await wait(slow(300));
      await page.evaluate(() => window.__questEmulator.controllers.right.updateButtonValue('trigger', 1));
      await wait(slow(300));
      await page.evaluate(() => window.__questEmulator.controllers.right.updateButtonValue('trigger', 0));
      await wait(slow(300));
    }
    assert.equal((await state()).shaker.shaken, true, 'coqueteleira agitada');
    const to = await handle('shaker', -0.11);
    await to([-0.28, 1.093 + 0.01, -0.72], slow(300));
    const before = await page.evaluate(() => window.__barman.station.debugHands());
    await release();
    const fb = await feedback();
    await wait(3000);
    const after = await where('shaker');
    if (after.y < 1) console.log('DEBUG shaker caiu', fb, JSON.stringify(before.map((h) => [h.held, h.speed, h.pos])), JSON.stringify(after));
  }
  async function openLid() {
    await grab('lid');
    if ((await state()).shaker.closed)
      console.log('DEBUG lid', await feedback(), JSON.stringify(await page.evaluate(() => ({ h: window.__barman.station.debugHands().map((x) => x.held), lid: window.__barman.station.where('lid'), sh: window.__barman.station.where('shaker') }))));
    assert.equal((await state()).shaker.closed, false, 'tampa aberta ao pegar');
    await moveTo([-0.6, 1.25, -0.75]);
    await release();
  }
  async function transfer() {
    await grab('shaker');
    const to = await handle('shaker', 0.112, UPSIDE_DOWN);
    const g = await glassAt();
    await to([g.x, g.y + (await rim()) + 0.01, g.z], dwell());
    assert.match(await feedback(), /transferido/, 'despejou: ' + (await feedback()));
    await moveTo([-0.3, 1.4, -0.5], UPRIGHT);
    const back = await handle('shaker', -0.11);
    await back([-0.28, 1.093 + 0.01, -0.72], slow(300));
    await release();
  }
  async function special(id) {
    // A aranha só fica ao alcance no fim da descida (~2 m): espera ela descer.
    if (id === 'spider') await page.waitForFunction(() => window.__barman.station.where('event-spider').y < 2.1, {}, { timeout: 40000, polling: 100 });
    await page.evaluate(
      ([key]) => {
        const p = window.__barman.station.where('event-' + key);
        const c = window.__questEmulator.controllers.right;
        c.position.set(p.x, p.y + 0.01, p.z + 0.03);
      },
      [id],
    );
    await wait(slow(150));
    await grip(R, 1);
    await wait(slow(200));
    assert.match(await feedback(), /em mãos/, 'coletou ' + id);
    const to = await handle(id, 0);
    const g = await glassAt();
    await to([g.x, g.y + (await rim()) + 0.04, g.z], slow(250));
    await release();
    assert.match(await feedback(), /no copo/, id + ' no copo: ' + (await feedback()));
  }
  async function serveGlass(name) {
    await grab('glass');
    const to = await handle('glass', 0);
    const hand = await where('receiving-hand');
    await to([hand.x, hand.y + 0.06, hand.z], slow(250));
    await release();
    assert.match(await feedback(), new RegExp(name + ' aprovado'), 'entrega de ' + name + ': ' + (await feedback()));
    console.log('VR · ' + name + ': ok');
  }

  // 1 Cuba Libre (montar)
  await chooseGlass('highball');
  await pour('rum');
  await pour('cola');
  await portion('lime');
  await portion('ice');
  await serveGlass('Cuba Libre');
  // 2 Caipirinha (açúcar com colher + macerar)
  await chooseGlass('rocks');
  await portion('lime');
  await sugar();
  await muddle();
  await pour('cachaca');
  await portion('ice');
  await serveGlass('Caipirinha');
  // 3 Whiskey Sour (coqueteleira: tampa, agitar, abrir, despejar)
  await chooseGlass('coupe');
  for (const b of ['whisky', 'lemon_juice', 'sugar_syrup']) await pour(b, 'shaker');
  await portion('ice', 'shaker');
  await closeLid();
  await shake();
  await openLid();
  await transfer();
  await serveGlass('Whiskey Sour');
  // 4 Margarita
  await chooseGlass('coupe');
  for (const b of ['tequila', 'orange_liqueur', 'lemon_juice']) await pour(b, 'shaker');
  await portion('ice', 'shaker');
  await closeLid();
  await shake();
  await openLid();
  await transfer();
  await serveGlass('Margarita');
  // 5 Negroni com barata (bicho + mexer)
  await chooseGlass('rocks');
  for (const b of ['gin', 'campari', 'sweet_vermouth']) await pour(b);
  await portion('ice');
  await special('cockroach');
  await stir();
  await serveGlass('Negroni com barata');
  // 6 Mojito
  await chooseGlass('highball');
  await portion('lime');
  await sugar();
  await muddle();
  await pour('rum');
  await portion('mint');
  await pour('soda_water');
  await portion('ice');
  await serveGlass('Mojito');
  // 7 Dry Martini
  await chooseGlass('coupe');
  await pour('gin');
  await pour('dry_vermouth');
  await portion('ice');
  await stir();
  await serveGlass('Dry Martini');
  // 8 Moscow Mule com gosma (a lesma é colhida no chão)
  await chooseGlass('mug');
  for (const b of ['vodka', 'ginger_beer', 'lemon_juice']) await pour(b);
  await portion('ice');
  await special('slug_slime');
  await serveGlass('Moscow Mule com gosma');
  // 9 Martini com aranha
  await chooseGlass('coupe');
  await pour('gin');
  await pour('dry_vermouth');
  await portion('ice');
  await special('spider');
  await stir();
  await serveGlass('Martini com aranha');
  assert.equal((await state()).phase, 'finished');
  assert.deepEqual(errors, [], 'Sem erros no console');
  console.log('Ensaio de VR (simulado): os 9 pedidos por gestos aprovados.');
} finally {
  await browser?.close();
  server?.kill();
}
