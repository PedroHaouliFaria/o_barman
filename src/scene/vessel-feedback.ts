// O que está em cada recipiente e o que acabou de acontecer com ele.
// - Em mãos (VR): etiqueta de papel pendurada ao lado do recipiente, com a lista.
// - Em mãos (desktop): a mesma etiqueta em HTML perto do recipiente na tela.
// - A cada ação: a palavra dourada ("+1 Rum", "Mexido", "Batido") sobe do recipiente e some.
// - Selo fixo: depois de batido/mexido/macerado, a palavra fica pairando sobre o recipiente
//   (também quando ele está pousado), para o jogador nunca perder o estado do drink.
// - Durante o gesto (bater, mexer, macerar): um anel dourado em volta da boca enche até completar.
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
const RISE_MS = 2400;
const RING_HOLD_MS = 700;

interface Card {
  label: Panel;
  word: Panel;
  badge: Panel;
  badgeText: string;
  ring: THREE.Mesh;
  ringValue: number;
  ringAt: number;
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
    const word = floatingWord(root, 0.42, 0.085);
    const badge = floatingWord(root, 0.26, 0.05);
    label.mesh.visible = word.mesh.visible = badge.mesh.visible = false;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.062, 0.072, 48, 1, Math.PI / 2, Math.PI * 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf7a').multiplyScalar(1.6), transparent: true, depthTest: false, toneMapped: false, side: THREE.DoubleSide }),
    );
    ring.renderOrder = 20;
    ring.visible = false;
    root.add(ring);
    cards[id] = { label, word, badge, badgeText: '', ring, ringValue: 0, ringAt: -Infinity, title: '', lines: [], hide: false, since: -Infinity };
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
      const done = [
        id === 'glass' && vessel.muddled && 'Macerado',
        id === 'glass' && vessel.stirred && 'Mexido',
        vessel.shaken && 'Batido',
      ].filter(Boolean) as string[];
      const text = done.join('  ·  ');
      if (text !== card.badgeText) {
        card.badgeText = text;
        if (text) card.badge.draw({ text });
      }
    }
  }

  /** Progresso do gesto em andamento (0..1): o anel em volta do recipiente enche. */
  function progress(target: VesselId, value: number) {
    const card = cards[target];
    card.ringValue = Math.max(0, Math.min(1, value));
    card.ringAt = performance.now();
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
      const showBadge = !card.hide && Boolean(card.badgeText) && !inspect && !rising && vessels[id].visible;
      card.badge.mesh.visible = showBadge;
      const ringing = now - card.ringAt < RING_HOLD_MS && card.ringValue > 0 && card.ringValue < 1;
      card.ring.visible = ringing;
      if (!card.label.mesh.visible && !rising && !showBadge && !ringing) continue;
      vessels[id].getWorldPosition(point);
      if (showBadge) {
        const m = card.badge.mesh;
        m.position.set(0, 0.17, 0).applyQuaternion(orientation).add(point);
        root.worldToLocal(m.position);
        m.quaternion.copy(orientation);
      }
      if (ringing) {
        const r = card.ring;
        r.position.set(0, 0.06, 0).applyQuaternion(orientation).add(point);
        root.worldToLocal(r.position);
        r.quaternion.copy(orientation);
        const g = r.geometry as THREE.RingGeometry;
        if (Math.abs(Math.abs(g.parameters.thetaLength) - card.ringValue * Math.PI * 2) > 0.01) {
          g.dispose();
          r.geometry = new THREE.RingGeometry(0.062, 0.072, 48, 1, Math.PI / 2, -card.ringValue * Math.PI * 2);
        }
      }
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
    progress,
    frame,
    destroy() {
      note.remove();
      for (const card of Object.values(cards)) {
        card.label.dispose();
        card.word.dispose();
        card.badge.dispose();
        card.ring.geometry.dispose();
        card.ring.removeFromParent();
      }
    },
  };
}
