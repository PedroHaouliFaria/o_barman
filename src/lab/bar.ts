// O bar inteiro (planta em docs/v2/estilos/planta.svg), montado em código para
// testar estilos. Unidades em metros; o jogador (bartender) fica na origem
// olhando para -Z, como no jogo.
import * as THREE from 'three';
import type { BarAssets } from './assets';
import { ink, makeMaterial, type Role, type StyleDef } from './styles';

type V3 = [number, number, number];

export interface BarScene {
  root: THREE.Group;
  update(t: number, dt: number): void;
  door: { openness: number };
  pianoAnchor: THREE.Object3D;
  murmurAnchors: THREE.Object3D[];
  doorAnchor: THREE.Object3D;
  /** chamado quando uma tecla do piano é tocada (anima as mãos). */
  strike(hand: 0 | 1): void;
  /** troca as primitivas pelos modelos do Blender */
  applyAssets(assets: BarAssets): void;
  /** cliente provisório em frente ao bartender (escondido quando testamos pessoas) */
  frontCustomer: THREE.Object3D;
  /** manequins sentados nas mesas, na ordem das mesas */
  tableFigures: THREE.Object3D[];
  /** pianista provisório (de costas, no banco do piano) */
  pianistFigure: THREE.Object3D;
  /** garrafas decorativas da estante (o jogo esconde as que ficam onde estão as garrafas jogáveis) */
  shelfBottles: THREE.Object3D[];
  /** luzes das luminárias do balcão (o jogo mantém só estas no Quest) */
  pendantLights: THREE.PointLight[];
}

/**
 * Opções do jogo (src/scene/art-bar.ts). O laboratório usa o padrão.
 * - `game`: sem cliente provisório e sem copos/garrafas decorativos na bancada de trabalho.
 * - `shelfShift`: aproxima a estante do bartender (metros em Z; negativo = mais perto), para alcançar em VR.
 */
export interface BarOptions {
  game?: boolean;
  shelfShift?: number;
}

export function buildBar(style: StyleDef, options: BarOptions = {}): BarScene {
  const root = new THREE.Group();
  root.name = 'bar';
  const animators: ((t: number, dt: number) => void)[] = [];
  const mat = (role: Role, color?: string) => makeMaterial(style, role, color);
  // lugares que recebem modelos do Blender quando eles carregam
  const slots = {
    counter: null as THREE.Object3D | null,
    pendants: [] as { group: THREE.Group; placeholder: THREE.Group; light: THREE.PointLight }[],
    glasses: [] as { group: THREE.Group; kind: string }[],
    shelf: [] as THREE.Group[],
    /** modelo do Blender que substitui um conjunto de primitivas */
    models: [] as { holder: THREE.Object3D; key: string; node?: string; placeholders: THREE.Object3D[] }[],
  };
  const since = (holder: THREE.Object3D, n: number) => holder.children.slice(n);

  function add<T extends THREE.Object3D>(parent: THREE.Object3D, obj: T, at: V3 = [0, 0, 0], rotY = 0): T {
    obj.position.set(...at);
    obj.rotation.y = rotY;
    parent.add(obj);
    return obj;
  }
  function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, role: Role | THREE.Material, at: V3 = [0, 0, 0], rotY = 0, color?: string) {
    const m = new THREE.Mesh(geo, role instanceof THREE.Material ? role : mat(role, color));
    m.castShadow = m.receiveShadow = true;
    return add(parent, m, at, rotY);
  }
  const boxG = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt: number, rb: number, h: number, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const box = (p: THREE.Object3D, size: V3, at: V3, role: Role, rotY = 0, color?: string) => mesh(p, boxG(...size), role, at, rotY, color);
  const group = (p: THREE.Object3D, at: V3 = [0, 0, 0], rotY = 0) => add(p, new THREE.Group(), at, rotY);

  // ---------------- sala ----------------
  const W = 11, X0 = -5.5, X1 = 5.5, ZB = 1.7, ZF = -10, H = 3.4;
  const room0 = root.children.length;
  const floorGeo = new THREE.PlaneGeometry(W, ZB - ZF);
  const floor = mesh(root, floorGeo, 'floor', [0, 0, (ZB + ZF) / 2]);
  floor.rotation.x = -Math.PI / 2;
  const ceil = mesh(root, new THREE.PlaneGeometry(W, ZB - ZF), 'ceiling', [0, H, (ZB + ZF) / 2]);
  ceil.rotation.x = Math.PI / 2;
  for (let z = ZB - 1.2; z > ZF; z -= 2.2) box(root, [W, 0.22, 0.28], [0, H - 0.11, z], 'woodDark');
  function wall(len: number, at: V3, rotY: number) {
    const g = group(root, at, rotY);
    box(g, [len, 1.05, 0.06], [0, 0.525, 0], 'wainscot');
    box(g, [len, 0.05, 0.1], [0, 1.08, 0.02], 'wood');
    mesh(g, new THREE.PlaneGeometry(len, H - 1.1), 'wallpaper', [0, 1.1 + (H - 1.1) / 2, 0.035]);
    box(g, [len, 0.14, 0.08], [0, H - 0.07, 0.02], 'woodDark');
    return g;
  }
  wall(W, [0, 0, ZF], 0);
  wall(ZB - ZF, [X0, 0, (ZB + ZF) / 2], Math.PI / 2);
  wall(ZB - ZF, [X1, 0, (ZB + ZF) / 2], -Math.PI / 2);
  wall(W, [0, 0, ZB], Math.PI);
  slots.models.push({ holder: root, key: 'sala', placeholders: since(root, room0) });

  // ---------------- balcão (posto do jogador) ----------------
  const bar = group(root);
  slots.counter = bar;
  box(bar, [6.8, 1.02, 0.62], [0, 0.51, -0.9], 'wood');
  for (let x = -3.2; x <= 3.2; x += 0.8) box(bar, [0.06, 0.9, 0.02], [x, 0.5, -1.215], 'woodDark');
  box(bar, [7.0, 0.07, 0.8], [0, 1.055, -0.88], 'counterTop');
  const rail = mesh(bar, cyl(0.025, 0.025, 6.6, 12), 'brass', [0, 0.22, -1.3]);
  rail.rotation.z = Math.PI / 2;
  for (const x of [-0.97, 0.97]) {
    box(bar, [0.52, 1.0, 0.77], [x, 0.5, -0.2], 'woodDark');
    box(bar, [0.58, 0.07, 0.8], [x, 1.055, -0.2], 'counterTop');
  }
  box(bar, [1.18, 0.012, 0.4], [0, 1.095, -0.79], 'woodDark');
  // banquetas do lado do cliente
  for (const x of [-2.7, -1.8, -0.9, 0.9, 1.8, 2.7]) {
    const s = group(root, [x, 0, -1.72]);
    mesh(s, cyl(0.2, 0.2, 0.07), 'velvet', [0, 0.78, 0]);
    mesh(s, cyl(0.03, 0.03, 0.75, 10), 'brass', [0, 0.38, 0]);
    mesh(s, cyl(0.22, 0.24, 0.03), 'brass', [0, 0.015, 0]);
    const ring = mesh(s, new THREE.TorusGeometry(0.16, 0.012, 6, 20), 'brass', [0, 0.3, 0]);
    ring.rotation.x = Math.PI / 2;
    slots.models.push({ holder: s, key: 'banqueta', placeholders: [...s.children] });
  }
  // copos e garrafas na bancada (no jogo a bancada é do jogador)
  for (const [x, z, h, kind] of (options.game ? [] : [
    [-0.18, -0.74, 0.16, 'highball'], [0.12, -0.7, 0.11, 'rocks'], [0.4, -0.86, 0.13, 'coupe'],
    [-0.45, -0.9, 0.3, 'garrafa:rum'], [-0.62, -0.78, 0.2, 'garrafa:cola'], [0.66, -0.72, 0.2, 'garrafa:lemon_juice'],
  ]) as [number, number, number, string][]) {
    const g = group(root, [x, 1.092, z]);
    mesh(g, cyl(0.04, 0.035, h, 14), 'bottle', [0, h / 2, 0], 0, '#9fb8b0');
    slots.glasses.push({ group: g, kind });
  }

  // ---------------- estante atrás do jogador ----------------
  const backWrap = group(root, [0, 0, options.shelfShift ?? 0]);
  const back = group(backWrap, [0, 0, 1.25]);
  box(back, [5.2, 1.0, 0.5], [0, 0.5, 0], 'woodDark');
  box(back, [5.3, 0.06, 0.56], [0, 1.03, 0], 'counterTop');
  mesh(back, new THREE.PlaneGeometry(4.6, 1.5), 'mirror', [0, 2.0, 0.38], Math.PI);
  box(back, [4.9, 0.1, 0.12], [0, 2.8, 0.34], 'wood');
  const labelMat = mat('label');
  const liquids = ['#7a3b16', '#a4612a', '#c9b98a', '#3b5a2a', '#8a1d22', '#d8d0b8', '#5a3a1a', '#b88a2a'];
  for (const [row, y] of [[0, 1.06], [1, 1.5], [2, 1.94]] as const) {
    box(back, [4.6, 0.04, 0.3], [0, y - 0.02, 0.18], 'wood');
    for (let i = 0; i < 18; i++) {
      const x = -2.15 + i * 0.25 + (row % 2) * 0.1;
      const tall = 0.24 + ((i * 7 + row * 3) % 5) * 0.025;
      const g = group(back, [x, y + 0.002, 0.18]);
      slots.shelf.push(g);
      const glass = mesh(g, cyl(0.045, 0.048, tall, 12), 'bottle', [0, tall / 2, 0], 0, liquids[(i + row * 3) % liquids.length]);
      glass.castShadow = false;
      mesh(g, cyl(0.016, 0.03, 0.08, 10), 'bottle', [0, tall + 0.04, 0], 0, liquids[(i + row * 3) % liquids.length]);
      mesh(g, new THREE.PlaneGeometry(0.07, 0.08), labelMat, [0, tall * 0.45, -0.049], Math.PI);
    }
  }

  slots.models.push({ holder: backWrap, key: 'estante', placeholders: back.children.filter((c) => !slots.shelf.includes(c as THREE.Group)) });

  // ---------------- luminárias sobre o balcão ----------------
  const flickers: { light: THREE.Light; base: number; seed: number }[] = [];
  function pendant(at: V3, shadow: boolean) {
    const g = group(root, at);
    const ph = group(g);
    mesh(ph, cyl(0.006, 0.006, H - at[1], 6), 'metal', [0, (H - at[1]) / 2, 0]);
    mesh(ph, cyl(0.07, 0.24, 0.2, 24), 'lampShade', [0, 0, 0]);
    mesh(ph, new THREE.SphereGeometry(0.035, 12, 8), 'glow', [0, -0.07, 0]);
    const light = new THREE.PointLight(style.light.pendant[0], style.light.pendant[1], 6, 2);
    light.position.set(0, -0.15, 0);
    if (shadow && style.shadows) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.002;
    }
    g.add(light);
    flickers.push({ light, base: light.intensity, seed: at[0] * 13.1 + at[2] });
    slots.pendants.push({ group: g, placeholder: ph, light });
  }
  pendant([-1.8, 2.45, -0.95], true);
  pendant([0, 2.22, -0.95], true); // a central fica mais baixa que as outras, visível olhando reto
  pendant([1.8, 2.45, -0.95], false);

  // ---------------- salão: mesas, cadeiras, cabines ----------------
  const murmurAnchors: THREE.Object3D[] = [];
  const tableFigures: THREE.Object3D[] = [];
  function chair(p: THREE.Object3D, at: V3, rotY: number) {
    const c = group(p, at, rotY);
    box(c, [0.42, 0.05, 0.42], [0, 0.46, 0], 'wood');
    box(c, [0.42, 0.5, 0.04], [0, 0.73, 0.19], 'wood');
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(c, [0.035, 0.46, 0.035], [x, 0.23, z], 'woodDark');
    slots.models.push({ holder: c, key: 'cadeira', placeholders: [...c.children] });
    return c;
  }
  function table(at: V3, seats: number[], people: { seat: number; look: number; outfit: number; hat?: boolean }[]) {
    const t = group(root, at);
    const t0 = t.children.length;
    mesh(t, cyl(0.42, 0.42, 0.04, 28), 'tableTop', [0, 0.75, 0]);
    mesh(t, cyl(0.04, 0.05, 0.72, 10), 'brass', [0, 0.37, 0]);
    mesh(t, cyl(0.25, 0.28, 0.03, 20), 'brass', [0, 0.015, 0]);
    // abajur de mesa
    mesh(t, cyl(0.02, 0.03, 0.18, 8), 'brass', [0, 0.86, 0]);
    mesh(t, cyl(0.05, 0.1, 0.09, 16), 'lampShade', [0, 0.98, 0]);
    mesh(t, new THREE.SphereGeometry(0.025, 8, 6), 'candle', [0, 0.95, 0]);
    slots.models.push({ holder: t, key: 'mesa', placeholders: since(t, t0) });
    const l = new THREE.PointLight(style.light.candle[0], style.light.candle[1], 2.6, 2);
    l.position.set(0, 0.93, 0);
    t.add(l);
    flickers.push({ light: l, base: l.intensity, seed: at[0] * 5 + at[2] * 3 });
    for (const a of seats) {
      chair(t, [Math.sin(a) * 0.72, 0, Math.cos(a) * 0.72], a);
    }
    for (const p of people) {
      const a = seats[p.seat];
      const f = figure(style, { seated: true, outfit: p.outfit, hat: p.hat });
      add(t, f.root, [Math.sin(a) * 0.68, 0, Math.cos(a) * 0.68], a);
      f.root.userData.look = p.look;
      tableFigures.push(f.root);
      animators.push((time, dt) => f.talk(time, dt));
      const drink = group(t, [Math.sin(a) * 0.25, 0.772, Math.cos(a) * 0.25]);
      mesh(drink, cyl(0.035, 0.03, 0.12, 12), 'bottle', [0, 0.06, 0], 0, '#b9c8bf');
      slots.glasses.push({ group: drink, kind: p.seat % 2 ? 'rocks' : 'highball' });
    }
    murmurAnchors.push(t);
    return t;
  }
  table([-1.7, 0, -4.1], [0.4, 2.6], [{ seat: 0, look: 0, outfit: 1, hat: true }, { seat: 1, look: 0, outfit: 3 }]);
  table([0.45, 0, -4.35], [-0.6, 1.6, 3.6], [{ seat: 0, look: 0, outfit: 0 }, { seat: 1, look: 0, outfit: 5 }, { seat: 2, look: 0, outfit: 2 }]);
  table([-0.2, 0, -6.6], [0.8, 3.9], [{ seat: 0, look: 0, outfit: 6 }]);
  table([1.15, 0, -7.0], [2.2, 5.2], []);

  // cabines de veludo na parede esquerda
  for (const z of [-3.4, -5.6, -7.8]) {
    const b = group(root, [X0 + 0.55, 0, z]);
    const b0 = b.children.length;
    for (const dz of [-0.75, 0.75]) {
      box(b, [0.9, 0.45, 0.5], [0, 0.225, dz], 'velvet');
      box(b, [0.9, 1.25, 0.14], [0, 0.62, dz + Math.sign(dz) * 0.3], 'velvet');
      box(b, [0.92, 0.08, 0.16], [0, 1.27, dz + Math.sign(dz) * 0.3], 'woodDark');
    }
    box(b, [0.8, 0.05, 0.7], [0.1, 0.74, 0], 'tableTop');
    box(b, [0.1, 0.72, 0.1], [0.1, 0.36, 0], 'woodDark');
    // arandela
    mesh(b, new THREE.SphereGeometry(0.06, 12, 8), 'glow', [-0.5, 1.85, 0]);
    slots.models.push({ holder: b, key: 'cabine', placeholders: since(b, b0) });
    const sc = new THREE.PointLight(style.light.sconce[0], style.light.sconce[1], 3, 2);
    sc.position.set(-0.3, 1.8, 0);
    b.add(sc);
    flickers.push({ light: sc, base: sc.intensity, seed: z });
  }
  // casal numa cabine
  {
    const b = root.children.at(-1)!; // última cabine (fundo)
    const a = figure(style, { seated: true, outfit: 4 });
    add(b, a.root, [0, 0, -0.55], Math.PI);
    const c = figure(style, { seated: true, outfit: 2, hat: true });
    add(b, c.root, [0, 0, 0.55], 0);
    animators.push((t, dt) => a.talk(t, dt), (t, dt) => c.talk(t + 2, dt));
    murmurAnchors.push(b);
  }
  // cliente no balcão em frente ao jogador + dois no balcão
  let frontCustomer: THREE.Object3D = root;
  if (options.game) frontCustomer = new THREE.Group();
  else {
    const front = figure(style, { seated: false, outfit: 0 });
    add(root, front.root, [0, 0, -1.55], Math.PI);
    frontCustomer = front.root;
    animators.push((t, dt) => front.idle(t, dt));
    const left = figure(style, { seated: true, outfit: 6, hunch: true });
    add(root, left.root, [-2.7, 0.33, -1.78], Math.PI + 0.2);
    animators.push((t, dt) => left.idle(t + 4, dt));
    const right = figure(style, { seated: true, outfit: 1, hat: true });
    add(root, right.root, [2.7, 0.33, -1.78], Math.PI - 0.4);
    animators.push((t, dt) => right.idle(t + 7, dt));
  }

  // janelas altas na parede direita (noite lá fora)
  for (const z of [-3.6, -6.4]) {
    const w = group(root, [X1 - 0.04, 0, z], -Math.PI / 2);
    mesh(w, new THREE.PlaneGeometry(1.1, 1.9), 'window', [0, 1.85, 0]);
    box(w, [1.24, 0.08, 0.1], [0, 0.88, 0], 'woodDark');
    box(w, [1.24, 0.08, 0.1], [0, 2.82, 0], 'woodDark');
    box(w, [0.06, 1.9, 0.08], [0, 1.85, 0.01], 'woodDark');
    box(w, [1.1, 0.05, 0.08], [0, 1.85, 0.01], 'woodDark');
    for (const x of [-0.62, 0.62]) box(w, [0.08, 2.0, 0.1], [x, 1.85, 0], 'woodDark');
    slots.models.push({ holder: w, key: 'janela', placeholders: [...w.children] });
  }

  // ---------------- piano e pianista (fundo, à direita) ----------------
  const STAGE = 0.26; // palco do piano (modelado em sala.glb)
  const piano = group(root, [3.6, STAGE, -7.9], -0.35);
  const piano0 = piano.children.length;
  {
    // corpo de cauda: perfil curvo extrudado
    const s = new THREE.Shape();
    s.moveTo(-0.75, 0);
    s.lineTo(0.75, 0);
    s.lineTo(0.75, -0.55);
    s.bezierCurveTo(0.75, -1.2, 0.3, -1.25, 0.15, -1.55);
    s.bezierCurveTo(0.0, -1.85, -0.2, -1.9, -0.45, -1.9);
    s.bezierCurveTo(-0.75, -1.9, -0.75, -1.6, -0.75, -1.3);
    s.lineTo(-0.75, 0);
    const body = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 18 });
    body.rotateX(Math.PI / 2);
    mesh(piano, body, 'piano', [0, 1.0, -0.05]);
    const lid = new THREE.ShapeGeometry(s, 18);
    lid.rotateX(Math.PI / 2);
    const lidPivot = group(piano, [-0.75, 1.0, -0.05]);
    const lidMesh = mesh(lidPivot, lid, 'piano', [0.75, 0, 0]);
    lidMesh.position.x = 0.75;
    lidPivot.rotation.z = 0.5;
    const stick = mesh(piano, cyl(0.01, 0.01, 0.62, 6), 'brass', [-0.4, 1.28, -0.9]);
    stick.rotation.z = -0.3;
    for (const [x, z] of [[-0.62, -0.15], [0.62, -0.15], [-0.4, -1.65]]) mesh(piano, cyl(0.05, 0.035, 0.72, 10), 'piano', [x, 0.36, z]);
    // teclado
    box(piano, [1.5, 0.06, 0.2], [0, 0.74, 0.08], 'piano');
    box(piano, [1.38, 0.025, 0.15], [0, 0.78, 0.1], 'ivory');
    for (let i = 0; i < 36; i++) if ([1, 3, 6, 8, 10].includes(i % 12)) box(piano, [0.018, 0.02, 0.09], [-0.68 + i * 0.039, 0.8, 0.07], 'piano');
    box(piano, [1.5, 0.3, 0.03], [0, 0.95, -0.02], 'piano');
    // banco
    box(piano, [0.75, 0.06, 0.36], [0, 0.5, 0.62], 'piano');
    for (const [x, z] of [[-0.32, 0.48], [0.32, 0.48], [-0.32, 0.76], [0.32, 0.76]]) box(piano, [0.04, 0.48, 0.04], [x, 0.24, z], 'piano');
    slots.models.push({ holder: piano, key: 'piano', placeholders: since(piano, piano0) });
    // luz de cena sobre o piano
    const spot = new THREE.SpotLight(style.light.piano[0], style.light.piano[1], 7, 0.55, 0.6, 2);
    spot.position.set(0.6, 3.2, 1.2);
    spot.target.position.set(0, 0.8, 0.2);
    if (style.shadows) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.002;
    }
    piano.add(spot, spot.target);
  }
  const pianist = figure(style, { seated: true, outfit: 0, pianist: true });
  add(piano, pianist.root, [0, 0.05, 0.6], 0); // de costas para o bar
  animators.push((t, dt) => pianist.play(t, dt));
  const pianoAnchor = group(piano, [0, 1.0, -0.4]);

  // ---------------- porta dos fundos ----------------
  const doorX = -2.3;
  const doorG = group(root, [doorX, 0, ZF + 0.02]);
  const door0 = doorG.children.length;
  for (const x of [-0.55, 0.55]) box(doorG, [0.1, 2.3, 0.14], [x, 1.15, 0.05], 'woodDark');
  box(doorG, [1.2, 0.12, 0.14], [0, 2.3, 0.05], 'woodDark');
  slots.models.push({ holder: doorG, key: 'porta', node: 'porta_moldura', placeholders: since(doorG, door0) });
  const nightMat = (mat('night') as THREE.MeshBasicMaterial).clone();
  const nightBase = nightMat.color.clone();
  const nightOpen = new THREE.Color(style.light.door[0]).multiplyScalar(0.55);
  mesh(doorG, new THREE.PlaneGeometry(1.0, 2.24), nightMat, [0, 1.12, 0.03]);
  // silhueta lá fora
  const outsider = figure(style, { seated: false, outfit: 4, hat: true, silhouette: true });
  add(doorG, outsider.root, [0.05, 0, 0.16], Math.PI);
  outsider.root.visible = false;
  const hinge = group(doorG, [-0.49, 0, 0.08]);
  box(hinge, [0.98, 2.16, 0.05], [0.49, 1.08, 0], 'wood');
  box(hinge, [0.7, 0.6, 0.06], [0.49, 1.6, 0.0], 'woodDark');
  box(hinge, [0.7, 0.8, 0.06], [0.49, 0.6, 0.0], 'woodDark');
  mesh(hinge, new THREE.SphereGeometry(0.035, 10, 8), 'brass', [0.88, 1.05, 0.05]);
  slots.models.push({ holder: hinge, key: 'porta', node: 'porta_folha', placeholders: [...hinge.children] });
  const doorLight = new THREE.SpotLight(style.light.door[0], 0, 10, 0.75, 0.7, 1.5);
  doorLight.position.set(0, 2.0, 0.12);
  doorLight.target.position.set(0.4, 0, 4.5);
  if (style.shadows) doorLight.castShadow = true;
  doorG.add(doorLight, doorLight.target);
  // placa de saída
  box(doorG, [0.5, 0.18, 0.06], [0, 2.6, 0.05], 'woodDark');
  mesh(doorG, new THREE.PlaneGeometry(0.42, 0.11), 'exitSign', [0, 2.6, 0.085]);
  const door = { openness: 0 };
  animators.push((t) => {
    // ciclo de 22 s: abre devagar, alguém parado lá fora, fecha
    const c = t % 22;
    const target = c > 9 && c < 15 ? 1 : 0;
    door.openness += (target - door.openness) * 0.02;
    hinge.rotation.y = -door.openness * 1.35;
    doorLight.intensity = door.openness * style.light.door[1];
    outsider.root.visible = door.openness > 0.25;
    nightMat.color.copy(nightBase).lerp(nightOpen, door.openness);
  });
  const doorAnchor = group(doorG, [0, 1.2, 0]);

  // relógio de parede acima do espelho do fundo (visível ao virar)
  {
    const clock = group(root, [3.6, 2.45, ZF + 0.06]);
    mesh(clock, cyl(0.28, 0.28, 0.06, 32), 'woodDark', [0, 0, 0]).rotation.x = Math.PI / 2;
    const face = mesh(clock, new THREE.CircleGeometry(0.24, 32), 'ivory', [0, 0, 0.035]);
    face.castShadow = false;
    slots.models.push({ holder: clock, key: 'relogio', placeholders: [...clock.children] });
    const hour = mesh(clock, boxG(0.02, 0.13, 0.01), 'piano', [0, 0.05, 0.045]);
    const minute = mesh(clock, boxG(0.012, 0.2, 0.01), 'piano', [0, 0.08, 0.05]);
    const hp = group(clock, [0, 0, 0]);
    const mp = group(clock, [0, 0, 0]);
    hp.add(hour);
    mp.add(minute);
    animators.push((t) => {
      // o ponteiro dos minutos anda rápido demais
      mp.rotation.z = -t * 0.35;
      hp.rotation.z = -t * 0.03 - 0.6;
    });
  }

  if (style.outline) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.material instanceof THREE.MeshBasicMaterial) return;
      const hull = new THREE.Mesh(m.geometry, ink());
      hull.castShadow = hull.receiveShadow = false;
      hull.raycast = () => {};
      m.add(hull);
    });
  }

  function applyAssets(assets: BarAssets) {
    const swap = (holder: THREE.Object3D, model: THREE.Object3D) => {
      for (const c of holder.children) c.visible = false;
      holder.add(model);
    };
    for (const m of slots.models) {
      const source = assets.models[m.key];
      if (!source) continue;
      const model = m.node ? source.getObjectByName(m.node)?.clone() : source.clone();
      if (!model) continue;
      for (const ph of m.placeholders) ph.visible = false;
      // um nó avulso (ex.: folha da porta) já traz a posição relativa ao seu grupo
      m.holder.add(model);
    }
    if (slots.counter) {
      slots.counter.visible = false;
      root.add(assets.balcao.clone());
    }
    for (const p of slots.pendants) {
      p.placeholder.visible = false;
      const lamp = assets.luminaria.clone();
      lamp.position.y = 0.0;
      p.group.add(lamp);
      p.light.position.set(0, -0.085, 0);
    }
    for (const g of slots.glasses) {
      const model = g.kind.startsWith('garrafa:') ? assets.garrafas[g.kind.slice(8)] : assets.copos[g.kind];
      if (!model) continue;
      const clone = model.clone();
      // garrafas da bancada com o rótulo virado para o bartender
      if (g.kind.startsWith('garrafa:')) clone.rotation.y = Math.PI;
      swap(g.group, clone);
    }
    const ids = Object.keys(assets.garrafas);
    slots.shelf.forEach((g, i) => {
      const model = assets.garrafas[ids[(i * 7) % ids.length]].clone();
      swap(g, model);
    });
  }

  return {
    root,
    frontCustomer,
    tableFigures,
    pianistFigure: pianist.root,
    shelfBottles: slots.shelf,
    pendantLights: slots.pendants.map((p) => p.light),
    applyAssets,
    door,
    pianoAnchor,
    murmurAnchors,
    doorAnchor,
    strike: (hand) => pianist.strike(hand),
    update(t, dt) {
      for (const a of animators) a(t, dt);
      for (const f of flickers) {
        const n = Math.sin(t * 9.1 + f.seed) * 0.5 + Math.sin(t * 23.7 + f.seed * 2) * 0.3 + (Math.random() - 0.5) * 0.6;
        f.light.intensity = f.base * (1 + n * style.light.flicker);
      }
    },
  };
}

// ---------------- figuras humanas estilizadas ----------------
// Manequins sem rosto: a forma final dos personagens vem do redesign,
// aqui servem para mostrar como cada estilo trata pessoas.
interface FigureOptions {
  seated: boolean;
  outfit: number;
  hat?: boolean;
  hunch?: boolean;
  pianist?: boolean;
  silhouette?: boolean;
}

function figure(style: StyleDef, o: FigureOptions) {
  const mat = (role: Role, color?: string) => makeMaterial(style, role, color);
  const cloth = o.silhouette ? '#050505' : style.cloth[o.outfit % style.cloth.length];
  const clothMat = o.silhouette ? new THREE.MeshBasicMaterial({ color: '#030303' }) : mat('wood', cloth);
  const skinMat = o.silhouette ? clothMat : mat('skin');
  const root = new THREE.Group();
  const part = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, at: V3) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...at);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const hipY = o.seated ? 0.47 : 0.95;
  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);
  // pernas
  for (const s of [-1, 1]) {
    if (o.seated) {
      const thigh = part(cap(0.075, 0.34), clothMat, hips, [s * 0.1, 0, -0.2]);
      thigh.rotation.x = Math.PI / 2;
      part(cap(0.065, 0.36), clothMat, hips, [s * 0.1, -0.24, -0.4]);
      part(new THREE.BoxGeometry(0.1, 0.06, 0.24), mat('piano'), hips, [s * 0.1, -0.45, -0.46]);
    } else {
      part(cap(0.075, 0.72), clothMat, hips, [s * 0.1, -0.47, 0]);
      part(new THREE.BoxGeometry(0.1, 0.06, 0.24), mat('piano'), hips, [s * 0.1, -0.92, -0.05]);
    }
  }
  const torso = new THREE.Group();
  hips.add(torso);
  if (o.hunch) torso.rotation.x = -0.35;
  part(cap(0.17, 0.36), clothMat, torso, [0, 0.33, 0]);
  part(new THREE.BoxGeometry(0.44, 0.12, 0.24), clothMat, torso, [0, 0.55, 0]);
  const neck = new THREE.Group();
  neck.position.set(0, 0.66, 0);
  torso.add(neck);
  part(cap(0.045, 0.06), skinMat, neck, [0, 0.02, 0]);
  const head = new THREE.Group();
  head.position.set(0, 0.17, 0);
  neck.add(head);
  const skull = part(new THREE.SphereGeometry(0.115, 18, 14), skinMat, head, [0, 0, 0]);
  skull.scale.set(0.9, 1.12, 1);
  if (!o.silhouette) part(new THREE.SphereGeometry(0.118, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), mat('woodDark', '#1b120c'), head, [0, 0.035, 0.012]);
  if (o.hat) {
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 24), mat('woodDark', '#151212'), head, [0, 0.09, 0]);
    part(new THREE.CylinderGeometry(0.11, 0.12, 0.13, 20), mat('woodDark', '#151212'), head, [0, 0.16, 0]);
  }
  // braços com ombro e cotovelo articulados
  const arms = [-1, 1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.23, 0.52, 0);
    torso.add(shoulder);
    part(cap(0.055, 0.22), clothMat, shoulder, [0, -0.15, 0]);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    shoulder.add(elbow);
    part(cap(0.048, 0.2), clothMat, elbow, [0, -0.13, 0]);
    part(new THREE.SphereGeometry(0.045, 10, 8), skinMat, elbow, [0, -0.29, 0]);
    shoulder.rotation.z = s * 0.08;
    if (o.seated) {
      shoulder.rotation.x = -0.45;
      elbow.rotation.x = -1.0;
    }
    return { shoulder, elbow, s };
  });
  let gesture = 0;
  let gestureHand = 0;
  const strikes = [0, 0];
  const seed = o.outfit * 1.7 + (o.hat ? 3 : 0);
  return {
    root,
    idle(t: number, _dt?: number) {
      torso.scale.y = 1 + Math.sin(t * 1.6 + seed) * 0.012;
      head.rotation.y = Math.sin(t * 0.25 + seed) * 0.35;
      head.rotation.x = Math.sin(t * 0.4 + seed) * 0.06;
    },
    talk(t: number, dt: number) {
      torso.scale.y = 1 + Math.sin(t * 1.6 + seed) * 0.012;
      torso.rotation.y = Math.sin(t * 0.35 + seed) * 0.12;
      head.rotation.y = Math.sin(t * 0.6 + seed) * 0.4;
      head.rotation.x = Math.sin(t * 2.3 + seed) * 0.05 - 0.05;
      // de vez em quando gesticula
      if (gesture <= 0 && Math.random() < dt * 0.25) {
        gesture = 1.6;
        gestureHand = Math.random() < 0.5 ? 0 : 1;
      }
      gesture = Math.max(0, gesture - dt);
      for (const [i, a] of arms.entries()) {
        const lift = i === gestureHand ? Math.sin((gesture / 1.6) * Math.PI) : 0;
        a.shoulder.rotation.x = -0.45 - lift * 0.6;
        a.elbow.rotation.x = -1.0 - lift * 0.5 + Math.sin(t * 6 + i) * lift * 0.2;
      }
    },
    play(t: number, dt: number) {
      torso.rotation.z = Math.sin(t * 0.9) * 0.05;
      torso.rotation.x = 0.12 + Math.sin(t * 1.8) * 0.02;
      head.rotation.x = 0.25 + Math.sin(t * 0.9) * 0.05;
      head.rotation.z = Math.sin(t * 0.45) * 0.08;
      for (const [i, a] of arms.entries()) {
        strikes[i] = Math.max(0, strikes[i] - dt * 6);
        a.shoulder.rotation.x = -0.75 + Math.sin(t * 0.7 + i) * 0.05;
        a.shoulder.rotation.z = a.s * (0.25 + Math.sin(t * 0.5 + i * 2) * 0.12);
        a.elbow.rotation.x = -1.05 + strikes[i] * 0.25;
      }
    },
    strike(hand: 0 | 1) {
      strikes[hand] = 1;
    },
  };
}
