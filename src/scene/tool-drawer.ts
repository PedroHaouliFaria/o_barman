// Gaveta de utensílios sob a bancada da direita (alicate, pinça, faca).
// Porta do tool-drawer.js do protótipo A-Frame (PR #1 da equipe), mesmas medidas.
import * as THREE from 'three';
import { box, cylinder, solid } from './blockout';
import type { Item, Target } from './types';

const CLOSED_X = 0.7;
const EXTENSION = 0.32;

export function toolDrawer(target: Target, items: Map<string, Item>) {
  const wood = '#74513a',
    brass = '#b79659',
    steel = '#b8c6c6';
  const drawer = target('drawer', 'Gaveta', [CLOSED_X, 0.918, -0.14]);
  box(drawer, [0, 0, 0], [0.025, 0.138, 0.54], wood);
  for (const z of [-0.065, 0.065]) box(drawer, [-0.024, 0, z], [0.045, 0.014, 0.015], brass);
  box(drawer, [-0.048, 0, 0], [0.014, 0.019, 0.145], brass);
  box(drawer, [0.159, -0.05, 0], [0.3, 0.014, 0.52], '#31463d');
  for (const z of [-0.253, 0.253]) box(drawer, [0.16, -0.03, z], [0.3, 0.052, 0.014], wood);
  box(drawer, [0.3, -0.03, 0], [0.014, 0.052, 0.52], wood);
  for (const z of [-0.084, 0.084]) box(drawer, [0.16, -0.038, z], [0.27, 0.018, 0.008], wood);

  let open = false;
  const tools: THREE.Object3D[] = [];
  function tool(id: string, name: string, z: number) {
    const obj = target(id, name, [CLOSED_X - EXTENSION + 0.155, 0.885, -0.14 + z], true);
    const item = items.get(id)!;
    item.stowed = true;
    item.stow = () => {
      item.stowed = true;
      obj.visible = open;
    };
    obj.visible = false;
    tools.push(obj);
    return obj;
  }

  const pliers = tool('pliers', 'Alicate', -0.16);
  for (const side of [-1, 1]) {
    box(pliers, [-0.045, 0, side * 0.018], [0.117, 0.014, 0.014], steel).rotation.y = side * 0.19;
    box(pliers, [0.049, 0, -side * 0.008], [0.073, 0.014, 0.012], steel).rotation.y = side * 0.13;
    box(pliers, [0.092, 0.005, -side * 0.012], [0.028, 0.011, 0.009], steel).rotation.z = 0.35;
  }
  cylinder(pliers, [0.014, 0.006, 0], 0.012, 0.012, '#75817e');
  const tweezers = tool('tweezers', 'Pinça', 0);
  for (const side of [-1, 1]) box(tweezers, [0, 0, side * 0.006], [0.153, 0.009, 0.005], steel).rotation.y = -side * 0.078;
  const knife = tool('knife', 'Faca', 0.16);
  box(knife, [-0.058, 0, 0], [0.09, 0.016, 0.022], '#51382b');
  box(knife, [0.024, 0, 0], [0.076, 0.006, 0.032], steel);
  // Ponta da lâmina: triângulo deitado, visível dos dois lados.
  const tip = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0.016),
    new THREE.Vector3(0.05, 0, -0.016),
    new THREE.Vector3(0, 0, -0.016),
  ]);
  tip.computeVertexNormals();
  const blade = solid(steel).clone();
  blade.side = THREE.DoubleSide;
  const point = new THREE.Mesh(tip, blade);
  point.position.x = 0.062;
  knife.add(point);

  /** Abre ou fecha. `moveDrawer` move o fundo físico e o que está dentro; recusa fechar com algo para fora. */
  return function toggle(moveDrawer: (dx: number) => boolean) {
    if (!moveDrawer(open ? EXTENSION : -EXTENSION)) return false;
    open = !open;
    drawer.position.x = CLOSED_X - (open ? EXTENSION : 0);
    drawer.updateMatrixWorld(true);
    for (const obj of tools) {
      if (items.get(obj.name)!.stowed) obj.visible = open;
    }
    return true;
  };
}
