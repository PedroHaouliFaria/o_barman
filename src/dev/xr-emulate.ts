// Simulador de Meta Quest 3 (IWER) para testar o modo VR sem headset.
// Só carrega em desenvolvimento com ?xr-emulate na URL.
// Com o painel do simulador (DevUI) dá para mexer a cabeça e os controles com mouse e teclado
// e ver no navegador o que o Quest mostraria. Os ensaios automáticos usam ?xr-emulate&semui.
import { DevUI } from '@iwer/devui';
import { metaQuest3, XRDevice } from 'iwer';

export async function installQuestEmulator() {
  const device = new XRDevice(metaQuest3);
  device.installRuntime({ forceInstall: true });
  // Cabeça na altura de um adulto em pé atrás do balcão, olhando para o cliente.
  device.position.set(0, 1.6, 0);
  // Controles à frente do corpo, na altura da bancada.
  device.controllers.left?.position.set(-0.18, 1.3, -0.35);
  device.controllers.right?.position.set(0.18, 1.3, -0.35);
  if (!new URLSearchParams(location.search).has('semui')) device.installDevUI(DevUI);
  (window as any).__questEmulator = device;
  return device;
}
