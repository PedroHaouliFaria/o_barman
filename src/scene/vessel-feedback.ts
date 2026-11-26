// O que está em cada recipiente e o que acabou de acontecer com ele.
// - Em mãos (VR): etiqueta de papel pendurada ao lado do recipiente, com a lista.
// - Em mãos (desktop): a mesma etiqueta em HTML perto do recipiente na tela.
// - A cada ação: a palavra dourada ("+1 Rum", "Mexido", "Batido") sobe do recipiente e some.
import * as THREE from 'three';
import { GLASSES, INGREDIENTS } from '../domain/game.js';
import { floatingWord, tag, type Panel } from '../ui/world-ui';

type VesselId = 'glass' | 'shaker';
interface Holder {
  held: { id: string } | null;
  side?: string;
}

const techniques: Record<string, { target: VesselId; text: string }> = {
  muddle: { target: 'glass', text: 'Macerado' },
  stir: { target: 'glass', text: 'Mexido' },
  shake: { target: 'shaker', text: 'Batido' },
  transfer: { target: 'glass', text: 'Servido no copo' },
  rinse: { target: 'glass', text: 'Lavado' },
};
const RISE_MS = 1500;

interface Card {
  label: Panel;
  word: Panel;
  title: string;
  lines: string[];
  hide: boolean;
  since: number;
}

export function vesselFeedback({ root, stage, vessels }: { root: THREE.Object3D; stage: HTMLElement; vessels: Record<VesselId, THREE.Object3D> }) {
  const note = document.createElement('aside');
  note.className = 'vessel-note';
  note.hidden = true;
  stage.append(note);
  const cards = {} as Record<VesselId, Card>;
  for (const id of Object.keys(vessels) as VesselId[]) {
    const label = tag(root, 0.12, 0.15);
    const word = floatingWord(root, 0.3, 0.06);
    label.mesh.visible = word.mesh.visible = false;
    cards[id] = { label, word, title: '', lines: [], hide: false, since: -Infinity };
  }
  const point = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const projected = new THREE.Vector3();

  function render(state: any, reset: boolean) {
    for (const [id, card] of Object.entries(cards) as [VesselId, Card][]) {
      const vessel = state[id];
      card.hide = id === 'glass' && (!vessel.type || vessel.returned);
      if (reset) card.since = -Infinity;
      if (card.hide) continue;
      const entries = Object.entries(vessel.ingredients) as [keyof typeof INGREDIENTS, number][];
      card.title = id === 'glass' ? GLASSES[vessel.type as keyof typeof GLASSES] : 'Coqueteleira';
      card.lines = entries.length ? entries.map(([k, n]) => n + ' × ' + INGREDIENTS[k].name) : [id === 'glass' ? 'vazio' : 'vazia'];
      if (id === 'glass' && vessel.muddled) card.lines.push('— macerado');
      if (id === 'glass' && vessel.stirred) card.lines.push('— mexido');
      if (vessel.shaken) card.lines.push('— batido');
      card.label.draw({ title: card.title, lines: card.lines });
    }
  }

  /** "+1 Rum" ou o nome da técnica sobe do recipiente. */
  function confirmPreparation(action: { type: string; target?: VesselId; ingredient?: keyof typeof INGREDIENTS }) {
    const receipt =
      action.type === 'add' && action.target && action.ingredient
        ? { target: action.target, text: '+1  ' + INGREDIENTS[action.ingredient].name }
        : techniques[action.type] && { ...techniques[action.type], target: (action.target as VesselId) ?? techniques[action.type].target };
    if (!receipt) return;
    const card = cards[receipt.target];
    card.word.draw({ text: receipt.text });
    card.since = performance.now();
  }

  function frame(holders: Holder[], camera: THREE.Camera, immersive: boolean, canvas: HTMLCanvasElement) {
    let showNote = false;
    camera.getWorldQuaternion(orientation);
    const now = performance.now();
    for (const [id, card] of Object.entries(cards) as [VesselId, Card][]) {
      const holder = holders.find((hand) => hand.held?.id === id);
      const inspect = Boolean(holder) && !card.hide;
      card.label.mesh.visible = inspect && immersive;
      if (inspect && !immersive) {
        showNote = true;
        const text = card.title + '\n' + card.lines.join('\n');
        if (note.dataset.text !== text) {
          note.dataset.text = text;
          note.replaceChildren(
            Object.assign(document.createElement('strong'), { textContent: card.title }),
            ...card.lines.map((line) => Object.assign(document.createElement('span'), { textContent: line })),
          );
        }
        vessels[id].getWorldPosition(projected).project(camera);
        const width = canvas.clientWidth,
          height = canvas.clientHeight;
        const x = ((1 + projected.x) * width) / 2,
          y = ((1 - projected.y) * height) / 2;
        const gap = height * 0.09;
        const left = x + gap + note.offsetWidth <= width - 12 ? x + gap : x - gap - note.offsetWidth;
        note.style.left = Math.max(12, left) + 'px';
        note.style.top = Math.max(12, Math.min(height - note.offsetHeight - 12, y - note.offsetHeight / 2)) + 'px';
      }
      const age = now - card.since;
      const rising = age >= 0 && age < RISE_MS;
      card.word.mesh.visible = rising;
      if (!card.label.mesh.visible && !rising) continue;
      vessels[id].getWorldPosition(point);
      const view = ((camera as THREE.ArrayCamera).cameras?.[0] ?? camera) as THREE.PerspectiveCamera;
      const widthAtDepth = -view.worldToLocal(projected.copy(point)).z / view.projectionMatrix.elements[0];
      const screenX = projected.copy(point).project(view).x;
      const preferred = holder?.side === 'left' ? -1 : 1;
      const side = (1 - preferred * screenX) * widthAtDepth > 0.3 ? preferred : -preferred;
      if (card.label.mesh.visible) {
        const m = card.label.mesh;
        m.position.set(side * 0.16, 0.02, 0).applyQuaternion(orientation).add(point);
        root.worldToLocal(m.position);
        m.quaternion.copy(orientation);
      }
      if (rising) {
        const k = age / RISE_MS;
        const m = card.word.mesh;
        m.position.set(0, 0.14 + k * 0.09, 0).applyQuaternion(orientation).add(point);
        root.worldToLocal(m.position);
        m.quaternion.copy(orientation);
        (m.material as THREE.MeshBasicMaterial).opacity = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45);
      }
    }
    note.hidden = !showNote;
  }
  return {
    render,
    confirmPreparation,
    frame,
    destroy() {
      note.remove();
      for (const card of Object.values(cards)) {
        card.label.dispose();
        card.word.dispose();
      }
    },
  };
}
