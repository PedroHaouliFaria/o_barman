// Simulador de Meta Quest 3 (IWER) para testar o modo VR sem headset.
// Só carrega em desenvolvimento com ?xr-emulate na URL.
import { metaQuest3, XRDevice } from 'iwer';

export async function installQuestEmulator() {
  const device = new XRDevice(metaQuest3);
  device.installRuntime({ forceInstall: true });

  (window as any).__questEmulator = device;
  return device;
}
