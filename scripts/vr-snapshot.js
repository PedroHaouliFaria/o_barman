// Captura da vista do VR no Quest simulado, para conferir luz e atmosfera.
// Uso: node scripts/vr-snapshot.js <pasta> <nome>  (servidor em http://localhost:5180)
import { chromium } from 'playwright-core';
const D = process.argv[2], tag = process.argv[3];
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5180/?xr-emulate&semui');
await p.waitForFunction(() => !document.querySelector('#start').disabled, {}, { timeout: 90000 });
await p.click('#start');
await p.click('#enter-vr');
await p.waitForFunction(() => window.__barman.station.ready === true, {}, { timeout: 120000 });
await p.evaluate(() => { const h = window.__questEmulator; h.position.set(0, 1.6, 0); h.quaternion.set(-0.03, 0, 0, 0.9995); for (const s of ['left','right']) window.__questEmulator.controllers[s].position.set(s==='left'?-0.16:0.16, 1.47, -0.42); });
await p.waitForTimeout(20000);
await p.screenshot({ path: `${D}/vr_${tag}.png` });
await b.close();
