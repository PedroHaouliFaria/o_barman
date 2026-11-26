import * as THREE from 'three';
import { GLASSES, INGREDIENTS } from '../domain/game.js';
import type { Sign, SignStyle, Vec3 } from './blockout';

const techniques: Record<string, { target: VesselId; text: string }> = {
  muddle: { target: 'glass', text: 'Macerado' },
  stir: { target: 'glass', text: 'Mexido' },
  shake: { target: 'shaker', text: 'Batido' },
};

type Label = (parent: THREE.Object3D, at: Vec3, w: number, h: number, style: SignStyle, rotation?: string) => Sign;
type VesselId = 'glass' | 'shaker';
interface Holder {
  held: { id: string } | null;
  side?: string;
}
interface Panel {
  contents: Sign;
  receipt: Sign;
  until: number;
  hideContents?: boolean;
  text?: string;
}

// As placas ficam fora dos objetos pegáveis para nunca interceptar despejo ou entrega.
export function vesselFeedback({
  root,
  stage,
  vessels,
  label,
}: {
  root: THREE.Object3D;
  stage: HTMLElement;
  vessels: Record<VesselId, THREE.Object3D>;
  label: Label;
}) {
  const desktopList = document.createElement('aside');
  desktopList.className = 'held-contents';
  desktopList.hidden = true;
  stage.append(desktopList);
  const panels = {} as Record<VesselId, Panel>;
  for (const id of Object.keys(vessels) as VesselId[]) {
    const contents = label(root, [0, 0, 0], 0.22, 0.16, {});
    const receipt = label(root, [0, 0, 0], 0.21, 0.048, {});
    for (const s of [contents, receipt]) s.mesh.visible = false;
    panels[id] = { contents, receipt, until: 0 };
  }
  const point = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const projected = new THREE.Vector3();

  function render(state: any, reset: boolean) {
    for (const [id, panel] of Object.entries(panels) as [VesselId, Panel][]) {
      const vessel = state[id];
      panel.hideContents = id === 'glass' && (!vessel.type || vessel.returned);
      if (panel.hideContents) {
        panel.until = 0;
        continue;
      }
      const entries = Object.entries(vessel.ingredients) as [keyof typeof INGREDIENTS, number][];
      const lines = [id === 'glass' ? 'Copo · ' + GLASSES[vessel.type as keyof typeof GLASSES] : 'Coqueteleira'];
      for (const [ingredient, units] of entries) lines.push(units + ' × ' + INGREDIENTS[ingredient].name);
      if (!entries.length) lines.push(id === 'glass' ? 'Vazio' : 'Vazia');
      panel.text = lines.join('\n');
      panel.contents.print({ lines, font: Math.min(0.145, 0.8 / lines.length) });
      if (reset || !entries.length) panel.until = 0;
    }
  }

  /** Recibo curto sobre o recipiente: "+1 Rum", "Macerado", "Mexido", "Batido". */
  function confirmPreparation(action: { type: string; target?: VesselId; ingredient?: keyof typeof INGREDIENTS }) {
    const receipt =
      action.type === 'add' && action.target && action.ingredient
        ? { target: action.target, text: '+1  ' + INGREDIENTS[action.ingredient].name }
        : techniques[action.type];
    if (!receipt) return;
    const panel = panels[receipt.target];
    panel.receipt.print({ lines: [receipt.text], center: true, font: 0.45 });
    panel.until = performance.now() + 1600;
  }

  function frame(holders: Holder[], camera: THREE.Camera, immersive: boolean, canvas: HTMLCanvasElement) {
    let showDesktopList = false;
    camera.getWorldQuaternion(orientation);
    for (const [id, panel] of Object.entries(panels) as [VesselId, Panel][]) {
      const holder = holders.find((hand) => hand.held?.id === id);
      const held = Boolean(holder);
      const list = panel.contents.mesh;
      const note = panel.receipt.mesh;
      const inspect = held && !panel.hideContents;
      list.visible = inspect && immersive;
      if (inspect && !immersive) {
        showDesktopList = true;
        if (desktopList.textContent !== panel.text) desktopList.textContent = panel.text ?? '';
        desktopList.hidden = false;
        vessels[id].getWorldPosition(projected).project(camera);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const x = ((1 + projected.x) * width) / 2;
        const y = ((1 - projected.y) * height) / 2;
        const gap = height * 0.1;
        const right = x + gap;
        const left = right + desktopList.offsetWidth <= width - 8 ? right : x - gap - desktopList.offsetWidth;
        desktopList.style.left = Math.max(8, left) + 'px';
        desktopList.style.top =
          Math.max(8, Math.min(height - desktopList.offsetHeight - 8, y - desktopList.offsetHeight / 2)) + 'px';
      }
      note.visible = performance.now() < panel.until;
      if (!list.visible && !note.visible) continue;
      vessels[id].getWorldPosition(point);
      const view = ((camera as THREE.ArrayCamera).cameras?.[0] ?? camera) as THREE.PerspectiveCamera;
      const widthAtDepth = -view.worldToLocal(projected.copy(point)).z / view.projectionMatrix.elements[0];
      const screenX = projected.copy(point).project(view).x;
      const preferredSide = holder?.side === 'left' ? -1 : 1;
      const roomAtSide = (1 - preferredSide * screenX) * widthAtDepth;
      const side = roomAtSide > 0.32 ? preferredSide : -preferredSide;
      for (const s of [list, note]) {
        if (!s.visible) continue;
        const offsetX = held ? side * 0.2 : 0;
        const offsetY = s === list ? 0.045 : held ? 0.16 : 0.19;
        s.position.set(offsetX, offsetY, 0).applyQuaternion(orientation).add(point);
        root.worldToLocal(s.position);
        s.quaternion.copy(orientation);
      }
    }
    desktopList.hidden = !showDesktopList;
  }
  return { render, confirmPreparation, frame, destroy: () => desktopList.remove() };
}
