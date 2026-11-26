// Captura o laboratório de estilos (3 estilos x 4 vistas) em JPG.
// Uso: node scripts/capture-styles.js [pasta] [versão]   (precisa do `npm run dev` rodando em :5173)
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const out = process.argv[2] ?? 'docs/v2/estilos';
const version = process.argv[3] ?? 'v1';
const base = process.env.BAR_TEST_URL ?? 'http://localhost:5173';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const estilo of ['ambar', 'fita', 'gravura']) {
  for (const vista of ['bartender', 'salao', 'fundo', 'balcao']) {
    await page.goto(`${base}/estilos.html?estilo=${estilo}&vista=${vista}&debug`);
    // a porta abre entre 9 s e 15 s do ciclo: a vista do fundo espera por ela
    await page.waitForTimeout(vista === 'fundo' ? 12500 : 5000);
    await page.evaluate(() => document.querySelectorAll('.bar-top, .enter').forEach((el) => (el.style.display = 'none')));
    await page.screenshot({ path: `${out}/${estilo}_${vista}_${version}.jpg`, quality: 90 });
    console.log(estilo, vista);
  }
}
console.log(errors.length ? errors.slice(0, 5) : 'sem erros');
await browser.close();
