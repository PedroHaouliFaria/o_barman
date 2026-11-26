// Captura as mesmas vistas do jogo em duas versões (ex.: sem e com otimização) para
// comparar o visual lado a lado e medir chamadas de desenho.
// Uso: node scripts/compare-views.js <url-base> <pasta> <sufixo> [query extra]
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const [base = 'http://localhost:5180', dir = 'comparar', tag = 'atual', query = ''] = process.argv.slice(2);
const chrome =
  process.env.CHROME_BIN ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const VIEWS = {
  balcao: [0, 1.25, -1.1],
  salao: [-1.5, 1.2, -5],
  estante: [0, 1.4, 1.2],
  piano: [3.6, 1.2, -7.6],
};
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + '/?' + query);
await page.waitForFunction(() => !document.querySelector('#start').disabled, {}, { timeout: 90000 });
await page.click('#start');
await page.waitForFunction(() => window.__barman.station.ready === true, {}, { timeout: 90000 });
await page.waitForTimeout(3000);
const stats = {};
for (const [name, at] of Object.entries(VIEWS)) {
  await page.evaluate((p) => window.__barman.station.lookAt(p), at);
  await page.waitForTimeout(1500);
  stats[name] = await page.evaluate(() => window.__barman.station.stats());
  await page.screenshot({ path: `${dir}/${name}_${tag}.png` });
}
console.log(JSON.stringify({ tag, stats }));
await browser.close();
