import { box, cylinder, entity } from './blockout.js';

export function toolDrawer(target, items) {
  const wood = '#74513a', brass = '#b79659', steel = '#b8c6c6';
  const drawer = target('drawer', 'Gaveta', [0.70, 0.918, -0.14]);
  box(drawer, [0, 0, 0], [0.025, 0.138, 0.54], wood);
  for (const z of [-0.065, 0.065]) box(drawer, [-0.024, 0, z], [0.045, 0.014, 0.015], brass);
  box(drawer, [-0.048, 0, 0], [0.014, 0.019, 0.145], brass);
  box(drawer, [0.159, -0.05, 0], [0.30, 0.014, 0.52], '#31463d');
  for (const z of [-0.253, 0.253]) box(drawer, [0.16, -0.03, z], [0.30, 0.052, 0.014], wood);
  box(drawer, [0.30, -0.03, 0], [0.014, 0.052, 0.52], wood);
  for (const z of [-0.084, 0.084]) box(drawer, [0.16, -0.038, z], [0.27, 0.018, 0.008], wood);

  let open = false;
  const extension = 0.32;
  function tool(id, name, z) {
    const el = target(id, name, [0.70 - extension + 0.155, 0.885, -0.14 + z], true);
    const item = items.get(id);
    item.stowed = true;
    item.stow = () => {
      item.stowed = true;
      el.object3D.visible = open;
    };
    el.object3D.visible = false;
    return el;
  }

  const pliers = tool('pliers', 'Alicate', -0.16);
  for (const side of [-1, 1]) {
    box(pliers, [-0.045, 0, side * 0.018], [0.117, 0.014, 0.014], steel).object3D.rotation.y = side * 0.19;
    box(pliers, [0.049, 0, -side * 0.008], [0.073, 0.014, 0.012], steel).object3D.rotation.y = side * 0.13;
    box(pliers, [0.092, 0.005, -side * 0.012], [0.028, 0.011, 0.009], steel).object3D.rotation.z = 0.35;
  }
  cylinder(pliers, [0.014, 0.006, 0], 0.012, 0.012, '#75817e');
  const tweezers = tool('tweezers', 'Pinça', 0);
  for (const side of [-1, 1]) {
    box(tweezers, [0, 0, side * 0.006], [0.153, 0.009, 0.005], steel).object3D.rotation.y = -side * 0.078;
  }
  const knife = tool('knife', 'Faca', 0.16);
  box(knife, [-0.058, 0, 0], [0.090, 0.016, 0.022], '#51382b');
  box(knife, [0.024, 0, 0], [0.076, 0.006, 0.032], steel);
  entity(knife, 'a-triangle', {
    position: '0.062 0 0', rotation: '-90 0 0', 'vertex-a': '0 -.016 0',
    'vertex-b': '.05 .016 0', 'vertex-c': '0 .016 0', material: { color: steel, side: 'double' },
  });

  return function toggle(moveDrawer) {
    if (!moveDrawer(open ? extension : -extension)) return;
    open = !open;
    drawer.object3D.position.x = 0.70 - (open ? extension : 0);
    for (const el of [pliers, tweezers, knife]) {
      if (items.get(el.dataset.stationItem).stowed) el.object3D.visible = open;
    }
  };
}
