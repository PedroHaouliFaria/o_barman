// All geometry is made of A-Frame primitives. Canvas is used only to print
// legible Portuguese labels onto flat signs without fetching font assets.
export function entity(parent, tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  parent.appendChild(el);
  return el;
}

const pos = (values) => values.join(' ');
export const group = (parent, at) => entity(parent, 'a-entity', { position: pos(at) });
const solid = (color) => ({ color, roughness: 0.92, metalness: 0.02, flatShading: true });
export const box = (parent, at, size, color) =>
  entity(parent, 'a-box', {
    position: pos(at),
    width: size[0],
    height: size[1],
    depth: size[2],
    material: solid(color),
  });
export const cylinder = (parent, at, radius, height, color, sides = 12) =>
  entity(parent, 'a-cylinder', {
    position: pos(at),
    radius,
    height,
    'segments-radial': sides,
    material: solid(color),
  });
export const sphere = (parent, at, radius, color) =>
  entity(parent, 'a-sphere', {
    position: pos(at),
    radius,
    'segments-width': 10,
    'segments-height': 6,
    material: solid(color),
  });

export function sign(parent, at, width, height, initial = {}, rotation = '0 0 0') {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(Math.min(1200, Math.max(256, width * 940)));
  canvas.height = Math.round((canvas.width * height) / width);
  const ctx = canvas.getContext('2d');
  const texture = new AFRAME.THREE.CanvasTexture(canvas);
  texture.colorSpace = AFRAME.THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  const el = entity(parent, 'a-plane', {
    position: pos(at),
    rotation,
    width,
    height,
    material: { shader: 'flat', color: '#ffffff' },
  });
  function bind() {
    const mesh = el.getObject3D('mesh');
    if (!mesh) return;
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
  }
  // Geometry initially installs its own white material. A-Frame replaces it
  // while initializing the material component. Bind after both have loaded.
  const afterMaterial = () => queueMicrotask(bind);
  el.addEventListener('object3dset', afterMaterial);
  el.addEventListener('loaded', afterMaterial);
  el.addEventListener('componentinitialized', afterMaterial);
  bind();

  let previous;
  function print({
    lines = [],
    bg = '#183932',
    ink = '#fff0d8',
    accent = '#e6bb76',
    font = 0.12,
    center = false,
  } = {}) {
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
    const rows = [];
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
    el,
    print,
    dispose() {
      el.removeEventListener('object3dset', afterMaterial);
      el.removeEventListener('loaded', afterMaterial);
      el.removeEventListener('componentinitialized', afterMaterial);
      texture.dispose();
    },
  };
}

export function room(root) {
  // U station opens toward the player. Work surfaces move together during calibration.
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
    entity(root, 'a-cone', {
      position: pos([x, 2.7, -2.29]),
      'radius-top': 0.075,
      'radius-bottom': 0.27,
      height: 0.18,
      material: solid('#926e46'),
    });
    cylinder(root, [x, 2.603, -2.29], 0.23, 0.015, '#ffda8f');
  }
  const ambient = entity(root, 'a-light', { type: 'ambient', color: '#fff1dc', intensity: 1.65 });
  entity(root, 'a-light', {
    type: 'directional',
    position: '-1.5 3.3 1.2',
    color: '#ffe3bb',
    intensity: 2,
  });
  return (act = 1) => {
    const palette = act >= 3 ? ['#d5dcd6', 1.41] : act === 2 ? ['#ebe9d4', 1.54] : ['#fff1dc', 1.65];
    ambient.setAttribute('light', 'color', palette[0]);
    ambient.setAttribute('light', 'intensity', palette[1]);
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

export function customer(person, hand) {
  const sleeve = box(hand, [0, 0, -0.31], [0.086, 0.09, 0.55], outfits[0][0]);
  const palm = sphere(hand, [0,0,0], 0.068, outfits[0][2]);
  palm.object3D.scale.set(0.9,0.55,1.2);
  hand.object3D.visible = false;
  const jacket = box(person, [0, 1.27, 0], [0.41, 0.53, 0.25], outfits[0][0]);
  const shirt = box(person, [0, 1.35, 0.135], [0.16, 0.38, 0.022], '#d6c5a5');
  const tie = box(person, [0.015, 1.38, 0.155], [0.045, 0.26, 0.02], outfits[0][1]);
  tie.object3D.rotation.z = -0.11;
  const head = sphere(person, [0, 1.7, 0.02], 0.163, outfits[0][2]);
  head.object3D.scale.set(0.88, 1.12, 0.85);
  const hair = sphere(person, [0, 1.8, 0.002], 0.153, outfits[0][3]);
  hair.object3D.scale.set(0.91, 0.6, 0.91);
  const eyes = [-0.053, 0.053].map(x => box(person, [x, 1.71, 0.147], [0.03, 0.014, 0.015], '#493b32'));
  const arms = [-1, 1].map((side) => {
    const arm = box(person, [side * 0.225, 1.23, 0.03], [0.105, 0.37, 0.13], outfits[0][0]);
    arm.object3D.rotation.z = side * 0.13;
    return arm;
  });
  return (index, visible) => {
    person.object3D.visible = visible;
    const color = outfits[index] || outfits[0];
    for (const [part, tint] of [
      [jacket, color[0]],
      [sleeve, color[0]],
      [palm, color[2]],
      [tie, color[1]],
      [head, color[2]],
      [hair, color[3]],
      ...arms.map((a) => [a, color[0]]),
    ]) {
      part.setAttribute('material', 'color', tint);
    }
    shirt.object3D.visible = ![1, 5, 7].includes(index);
    tie.object3D.visible = index === 0 || index === 4;
    for (const arm of arms) arm.object3D.scale.y = index === 8 ? 1.75 : 1;
    const tall = index === 8 ? 0.13 : 0;
    head.object3D.position.y = 1.70 + tall;
    hair.object3D.position.y = 1.80 + tall;
    for (const eye of eyes) eye.object3D.position.y = 1.71 + tall;
    jacket.object3D.scale.y = index === 8 ? 1.42 : 1;
  };
}
