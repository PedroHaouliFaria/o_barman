// Greybox em primitivas, porta direta do protótipo A-Frame (legacy/aframe).
// Será substituído peça por peça pelos modelos .glb do redesign.
import * as THREE from 'three';

export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;
const materials = new Map<string, THREE.MeshStandardMaterial>();

export function solid(color: string) {
  let material = materials.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02, flatShading: true });
    materials.set(color, material);
  }
  return material;
}

/** Rotação em graus no formato "x y z" do A-Frame (ordem YXZ). */
export function rotate(object: THREE.Object3D, degrees: string | Vec3) {
  const [x, y, z] = typeof degrees === 'string' ? degrees.split(' ').map(Number) : degrees;
  object.rotation.set(x * DEG, y * DEG, z * DEG, 'YXZ');
  return object;
}

export function group(parent: THREE.Object3D, at: Vec3 = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...at);
  parent.add(g);
  return g;
}

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, at: Vec3, material: THREE.Material) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...at);
  parent.add(m);
  return m;
}

export function box(parent: THREE.Object3D, at: Vec3, size: Vec3, color: string) {
  const m = mesh(parent, new THREE.BoxGeometry(...size), at, solid(color));
  m.userData.box = size;
  return m;
}

export function cylinder(parent: THREE.Object3D, at: Vec3, radius: number, height: number, color: string, sides = 12) {
  return mesh(parent, new THREE.CylinderGeometry(radius, radius, height, sides), at, solid(color));
}

export function cone(
  parent: THREE.Object3D,
  at: Vec3,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: string,
  sides = 36,
) {
  return mesh(parent, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), at, solid(color));
}

export function sphere(parent: THREE.Object3D, at: Vec3, radius: number, color: string) {
  return mesh(parent, new THREE.SphereGeometry(radius, 10, 6), at, solid(color));
}

export function torus(
  parent: THREE.Object3D,
  at: Vec3,
  radius: number,
  tube: number,
  material: THREE.Material | string,
  radial = 36,
  tubular = 32,
) {
  const mat = typeof material === 'string' ? solid(material) : material;
  return mesh(parent, new THREE.TorusGeometry(radius, tube, radial, tubular), at, mat);
}

export interface SignStyle {
  lines?: string[];
  bg?: string;
  ink?: string;
  accent?: string;
  font?: number;
  center?: boolean;
}

export interface Sign {
  mesh: THREE.Mesh;
  print(style?: SignStyle): void;
  dispose(): void;
}

/** Placa com texto desenhado em canvas (sem baixar fontes). */
export function sign(
  parent: THREE.Object3D,
  at: Vec3,
  width: number,
  height: number,
  initial: SignStyle = {},
  rotation: string = '0 0 0',
): Sign {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(Math.min(1200, Math.max(256, width * 940)));
  canvas.height = Math.round((canvas.width * height) / width);
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const plane = mesh(parent, new THREE.PlaneGeometry(width, height), at, material);
  rotate(plane, rotation);
  let previous = '';
  function print({
    lines = [],
    bg = '#183932',
    ink = '#fff0d8',
    accent = '#e6bb76',
    font = 0.12,
    center = false,
  }: SignStyle = {}) {
    const signature = JSON.stringify([lines, bg, ink, accent, font, center]);
    if (signature === previous) return;
    previous = signature;
    const w = canvas.width,
      h = canvas.height,
      px = Math.round(h * font);
    const pad = w * 0.055,
      maxWidth = w - 2 * pad;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, Math.max(2, h * 0.018));
    ctx.textAlign = center ? 'center' : 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + px + 'px system-ui, sans-serif';
    const rows: string[] = [];
    for (const line of lines) {
      let row = '';
      for (const word of line.split(' ')) {
        const test = row ? row + ' ' + word : word;
        if (row && ctx.measureText(test).width > maxWidth) {
          rows.push(row);
          row = word;
        } else row = test;
      }
      rows.push(row);
    }
    const step = Math.min(px * 1.42, (h * 0.88) / Math.max(1, rows.length));
    rows.forEach((line, index) => {
      ctx.fillStyle = index === 0 && rows.length > 1 ? accent : ink;
      ctx.fillText(line, center ? w / 2 : pad, h / 2 + (index - (rows.length - 1) / 2) * step, maxWidth);
    });
    texture.needsUpdate = true;
  }
  print(initial);
  return {
    mesh: plane,
    print,
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}

export function room(root: THREE.Object3D) {
  // Estação em U aberta para o jogador. A calibração move todas as superfícies juntas.
  box(root, [0, -0.07, -1.55], [8, 0.12, 7], '#483d36');
  box(root, [0, 1.6, 1.5], [7, 3.3, 0.12], '#354840');
  box(root, [0, 1.6, -3.8], [7, 3.3, 0.12], '#254640');
  box(root, [0, 0.53, -3.69], [7, 1.08, 0.14], '#513e32');
  box(root, [0, 1.1, -3.59], [7, 0.06, 0.05], '#b18a58');
  for (const x of [-3.41, 3.41]) box(root, [x, 1.6, -1.2], [0.12, 3.3, 5.4], '#354840');
  box(root, [0, 3.26, -1.2], [7, 0.1, 5.4], '#403831');
  box(root, [0, 0.51, -0.86], [2.45, 1.02, 0.59], '#433a31');
  box(root, [0, 1.04, -0.84], [2.55, 0.085, 0.69], '#9b7552');
  for (const x of [-0.97, 0.97]) {
    box(root, [x, 0.72, -0.21], [0.52, 0.58, 0.77], '#484239');
    box(root, [x, 1.04, -0.21], [0.58, 0.085, 0.77], '#9b7552');
  }
  box(root, [0, 1.087, -0.79], [1.18, 0.012, 0.4], '#304640');
  for (const x of [-1.08, 1.08]) {
    cylinder(root, [x, 2.98, -2.29], 0.012, 0.49, '#4a4235');
    cone(root, [x, 2.7, -2.29], 0.075, 0.27, 0.18, '#926e46');
    cylinder(root, [x, 2.603, -2.29], 0.23, 0.015, '#ffda8f');
  }
  const ambient = new THREE.AmbientLight('#fff1dc', 1.65);
  const sun = new THREE.DirectionalLight('#ffe3bb', 2);
  sun.position.set(-1.5, 3.3, 1.2);
  root.add(ambient, sun);
  return (act = 1) => {
    const [color, intensity] =
      act >= 3 ? (['#d5dcd6', 1.41] as const) : act === 2 ? (['#ebe9d4', 1.54] as const) : (['#fff1dc', 1.65] as const);
    ambient.color.set(color);
    ambient.intensity = intensity;
  };
}

const outfits = [
  ['#939f99', '#634138', '#a67e64', '#504538'],
  ['#78948c', '#c6a97a', '#b38266', '#48382d'],
  ['#756e5f', '#bfb4a0', '#b48a76', '#bdb6a3'],
  ['#96586d', '#d9b489', '#b88a6c', '#6e4c37'],
  ['#3d4948', '#bcaf94', '#bb9e84', '#544d43'],
  ['#788765', '#9aac79', '#b5866d', '#513922'],
  ['#8f7d66', '#a59881', '#a47f66', '#54473e'],
  ['#506673', '#566777', '#a19080', '#525455'],
  ['#5f5866', '#908392', '#c8b4a2', '#645d5c'],
];

/** Cliente em blocos. Cada parte tem material próprio para poder trocar a cor. */
export function customer(person: THREE.Object3D, hand: THREE.Object3D) {
  const own = (m: THREE.Mesh) => {
    m.material = (m.material as THREE.MeshStandardMaterial).clone();
    return m;
  };
  const sleeve = own(box(hand, [0, 0, -0.31], [0.086, 0.09, 0.55], outfits[0][0]));
  const palm = own(sphere(hand, [0, 0, 0], 0.068, outfits[0][2]));
  palm.scale.set(0.9, 0.55, 1.2);
  hand.visible = false;
  const jacket = own(box(person, [0, 1.27, 0], [0.41, 0.53, 0.25], outfits[0][0]));
  const shirt = box(person, [0, 1.35, 0.135], [0.16, 0.38, 0.022], '#d6c5a5');
  const tie = own(box(person, [0.015, 1.38, 0.155], [0.045, 0.26, 0.02], outfits[0][1]));
  tie.rotation.z = -0.11;
  const head = own(sphere(person, [0, 1.7, 0.02], 0.163, outfits[0][2]));
  head.scale.set(0.88, 1.12, 0.85);
  const hair = own(sphere(person, [0, 1.8, 0.002], 0.153, outfits[0][3]));
  hair.scale.set(0.91, 0.6, 0.91);
  const eyes = [-0.053, 0.053].map((x) => box(person, [x, 1.71, 0.147], [0.03, 0.014, 0.015], '#493b32'));
  const arms = [-1, 1].map((side) => {
    const arm = own(box(person, [side * 0.225, 1.23, 0.03], [0.105, 0.37, 0.13], outfits[0][0]));
    arm.rotation.z = side * 0.13;
    return arm;
  });
  return (index: number, visible: boolean) => {
    person.visible = visible;
    const color = outfits[index] || outfits[0];
    const parts: [THREE.Mesh, string][] = [
      [jacket, color[0]],
      [sleeve, color[0]],
      [palm, color[2]],
      [tie, color[1]],
      [head, color[2]],
      [hair, color[3]],
      ...arms.map((a) => [a, color[0]] as [THREE.Mesh, string]),
    ];
    for (const [part, tint] of parts) (part.material as THREE.MeshStandardMaterial).color.set(tint);
    shirt.visible = ![1, 5, 7].includes(index);
    tie.visible = index === 0 || index === 4;
    for (const arm of arms) arm.scale.y = index === 8 ? 1.75 : 1;
    const tall = index === 8 ? 0.13 : 0;
    head.position.y = 1.7 + tall;
    hair.position.y = 1.8 + tall;
    for (const eye of eyes) eye.position.y = 1.71 + tall;
    jacket.scale.y = index === 8 ? 1.42 : 1;
  };
}
