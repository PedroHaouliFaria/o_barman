// Exporta o bar do jogo para o Blender assar a luz (art/blender/bake_luz.py).
// Uso: node scripts/export-bake.js <pasta>   (servidor de desenvolvimento em http://localhost:5180)
// Gera <pasta>/bar_para_assar.glb e <pasta>/bar_para_assar.json (luzes, fundo e materiais).
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const out = process.argv[2] ?? 'art/luz';
const url = process.env.URL ?? 'http://localhost:5180';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('ERRO', e.message));
// semjuntar: a cena original, sem juntar malhas e sem luz assada; leve: o simulador sem GPU aguenta.
await page.goto(url + '/?leve&semjuntar');
await page.waitForFunction(() => window.__barman?.station?.ready === true, {}, { timeout: 180000 });
const { glb, info } = await page.evaluate(async () => {
  const { glb, info } = await window.__barman.station.exportBake();
  const bytes = new Uint8Array(glb);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { glb: btoa(bin), info };
});
writeFileSync(`${out}/bar_para_assar.glb`, Buffer.from(glb, 'base64'));
writeFileSync(`${out}/bar_para_assar.json`, JSON.stringify(info, null, 1));
console.log(`exportado: ${info.materials.length} materiais, ${info.lights.length} luzes → ${out}/`);
await browser.close();
