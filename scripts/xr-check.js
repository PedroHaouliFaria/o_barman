// Ensaio de VR sem headset: simula um Meta Quest 3 (IWER) no Chrome, entra na
// sessão WebXR e usa os controles para pegar, soltar e despejar.
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
try {
  const url = await serve();
  browser = await chromium.launch({ executablePath: chrome, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '/?xr-emulate');
  await page.waitForFunction(() => !document.querySelector('#start').disabled, {}, { timeout: 30000 });
  await page.click('#turn-control');
  await page.click('#enter-vr');
  await page.waitForFunction(() => Boolean(window.__barman.xr.getState().session), {}, { timeout: 10000 });
  const step = (ms = 300) => page.waitForTimeout(ms);
  const feedback = () => page.locator('#feedback').innerText();
  const pose = (side, p, q = [0, 0, 0, 1]) =>
    page.evaluate(([side, p, q]) => {
      const c = window.__questEmulator.controllers[side];
      c.position.set(...p);
      c.quaternion.set(...q);
    }, [side, p, q]);
  const grip = (side, v) => page.evaluate(([side, v]) => window.__questEmulator.controllers[side].updateButtonValue('squeeze', v), [side, v]);

  await pose('right', [0.39, 1.12, -0.7]);
  await step();
  await grip('right', 1);
  await step();
  assert.match(await feedback(), /Limão em mãos/);
  await pose('right', [-0.02, 1.3, -0.65]);
  await step();
  await grip('right', 0);
  await step();
  assert.match(await feedback(), /Limão no copo/);
  console.log('Sólido pego e solto no copo: ok');

  await pose('left', [0.5, 1.84, 0.78]);
  await step();
  await grip('left', 1);
  await step();
  assert.match(await feedback(), /Rum em mãos/);
  await pose('left', [-0.02, 1.4, -0.65], [0, 0, 1, 0]);
  await step(900);
  assert.match(await feedback(), /Rum no copo/);
  assert.deepEqual(await page.evaluate(() => window.__barman.game.state.glass.ingredients), { lime: 1, rum: 1 });
  console.log('Garrafa inclinada sobre o copo: ok');
  assert.deepEqual(errors, [], 'Sem erros no console');
  console.log('Ensaio de VR (simulado) aprovado.');
} finally {
  await browser?.close();
  server?.kill();
}
