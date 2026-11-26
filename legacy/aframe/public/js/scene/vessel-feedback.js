import { GLASSES, INGREDIENTS } from '../domain/game.js';

const techniques = {
  muddle: { target: 'glass', text: 'Macerado' },
  stir: { target: 'glass', text: 'Mexido' },
  shake: { target: 'shaker', text: 'Batido' },
};

// Keep the signs outside the grabbable meshes so they never intercept a pour or delivery.
export function vesselFeedback({ root, scene, vessels, label }) {
  const desktopList = document.createElement('aside');
  desktopList.className = 'held-contents';
  desktopList.hidden = true;
  scene.parentElement.append(desktopList);
  const panels = {};
  for (const id of Object.keys(vessels)) {
    const contents = label(root, [0, 0, 0], 0.22, 0.16, {});
    contents.el.dataset.vesselContents = id;
    const receipt = label(root, [0, 0, 0], 0.21, 0.048, {});
    for (const sign of [contents, receipt]) sign.el.object3D.visible = false;
    panels[id] = { contents, receipt, until: 0 };
  }
  const point = new AFRAME.THREE.Vector3();
  const orientation = new AFRAME.THREE.Quaternion();
  const projected = new AFRAME.THREE.Vector3();

  function render(state, reset) {
    for (const [id, panel] of Object.entries(panels)) {
      const vessel = state[id];
      panel.hideContents = id === 'glass' && (!vessel.type || vessel.returned);
      if (panel.hideContents) {
        panel.until = 0;
        continue;
      }
      const entries = Object.entries(vessel.ingredients);
      const lines = [id === 'glass' ? 'Copo · ' + GLASSES[vessel.type] : 'Coqueteleira'];
      for (const [ingredient, units] of entries) lines.push(units + ' × ' + INGREDIENTS[ingredient].name);
      if (!entries.length) lines.push(id === 'glass' ? 'Vazio' : 'Vazia');
      panel.text = lines.join('\n');
      panel.contents.print({ lines, font: Math.min(0.145, 0.8 / lines.length) });
      if (reset || !entries.length) panel.until = 0;
    }
  }

  function confirmPreparation(action) {
    const receipt = action.type === 'add'
      ? { target: action.target, text: '+1  ' + INGREDIENTS[action.ingredient].name }
      : techniques[action.type];
    if (!receipt) return;
    const panel = panels[receipt.target];
    panel.receipt.print({ lines: [receipt.text], center: true, font: 0.45 });
    panel.until = performance.now() + 1600;
  }

  function frame(holders) {
    const xr = scene.renderer.xr;
    const immersive = Boolean(xr?.isPresenting);
    const camera = immersive ? xr.getCamera() : scene.camera;
    let showDesktopList = false;
    camera.getWorldQuaternion(orientation);
    for (const [id, panel] of Object.entries(panels)) {
      const holder = holders.find(hand => hand.held?.id === id);
      const held = Boolean(holder);
      const list = panel.contents.el.object3D;
      const note = panel.receipt.el.object3D;
      const inspect = held && !panel.hideContents;
      list.visible = inspect && immersive;
      if (inspect && !immersive) {
        showDesktopList = true;
        if (desktopList.textContent !== panel.text) desktopList.textContent = panel.text;
        desktopList.hidden = false;
        vessels[id].object3D.getWorldPosition(projected).project(camera);
        const width = scene.canvas.clientWidth;
        const height = scene.canvas.clientHeight;
        const x = (1 + projected.x) * width / 2;
        const y = (1 - projected.y) * height / 2;
        // Leave room for the glass silhouette and use the opposite side near an edge.
        const gap = height * 0.10;
        const right = x + gap;
        const left = right + desktopList.offsetWidth <= width - 8 ? right : x - gap - desktopList.offsetWidth;
        desktopList.style.left = Math.max(8, left) + 'px';
        desktopList.style.top = Math.max(8, Math.min(height - desktopList.offsetHeight - 8, y - desktopList.offsetHeight / 2)) + 'px';
      }
      note.visible = performance.now() < panel.until;
      if (!list.visible && !note.visible) continue;
      vessels[id].object3D.getWorldPosition(point);
      const view = camera.cameras?.[0] ?? scene.camera;
      const widthAtDepth = -view.worldToLocal(projected.copy(point)).z / view.projectionMatrix.elements[0];
      const screenX = projected.copy(point).project(view).x;
      const preferredSide = holder?.side === 'left' ? -1 : 1;
      const roomAtSide = (1 - preferredSide * screenX) * widthAtDepth;
      const side = roomAtSide > 0.32 ? preferredSide : -preferredSide;
      for (const sign of [list, note]) {
        if (!sign.visible) continue;
        const offsetX = held ? side * 0.20 : 0;
        const offsetY = sign === list ? 0.045 : held ? 0.16 : 0.19;
        sign.position.set(offsetX, offsetY, 0).applyQuaternion(orientation).add(point);
        root.object3D.worldToLocal(sign.position);
        sign.quaternion.copy(orientation);
      }
    }
    desktopList.hidden = !showDesktopList;
  }
  return { render, confirmPreparation, frame, destroy: () => desktopList.remove() };
}
