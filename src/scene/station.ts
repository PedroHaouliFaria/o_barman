// Monta a estação do bartender (greybox) e liga as regras do jogo à cena.
// Porta do station.js do protótipo A-Frame, com as mesmas posições em metros.
import * as THREE from 'three';
import { BOOK_RECIPES, GLASSES, INGREDIENTS, ORDERS } from '../domain/game.js';
import { bottleShelves } from '../interaction/bottle-placement.js';
import { bindControls } from '../interaction/controls';
import { box, cone, customer, cylinder, group, rotate, room, sign, sphere, torus, type Sign, type SignStyle, type Vec3 } from './blockout';
import { buildEvents, specimen } from './environment';
import { tipJar } from './tip-jar';
import type { Action, Item, Result } from './types';
import { vesselFeedback } from './vessel-feedback';

const colors: Record<string, string> = {
  rum: '#b66e35', cola: '#74483e', lime: '#9caf57', ice: '#b2e3e4', cachaca: '#afc28d', sugar: '#f0dfc1',
  whisky: '#bd8244', lemon_juice: '#e6c979', sugar_syrup: '#c48d7b', tequila: '#c39b5c', orange_liqueur: '#cd8645',
  gin: '#749e8c', campari: '#a04e50', sweet_vermouth: '#8d5355', mint: '#38784f', soda_water: '#97b9c2',
  dry_vermouth: '#b3b87d', vodka: '#98b5c4', ginger_beer: '#a6894d',
};
const portions: Record<string, Vec3> = { lime: [0.39, 1.19, -0.7], mint: [0.64, 1.19, -0.7], ice: [-0.97, 1.17, 0.01] };

export interface StationCallbacks {
  onAction?: (action: Action) => Result;
  onFeedback?: (message: string) => void;
  onEventCue?: (id: string) => void;
  onPage?: (index: number) => void;
}

export interface StationContext {
  scene: THREE.Scene;
  gl: THREE.WebGLRenderer;
  camera: () => THREE.Camera;
  stage: HTMLElement;
}

export type Station = ReturnType<typeof mountStation>;

export function mountStation(ctx: StationContext, session: any, callbacks: StationCallbacks = {}) {
  const { scene, gl } = ctx;
  const root = group(scene);
  root.name = 'station-world';
  const items = new Map<string, Item>();
  const signs: Sign[] = [];
  function label(parent: THREE.Object3D, at: Vec3, w: number, h: number, config: SignStyle, rotation?: string) {
    const s = sign(parent, at, w, h, config, rotation);
    signs.push(s);
    return s;
  }
  function target(id: string, name: string, at: Vec3, held = false, parent: THREE.Object3D = root) {
    const obj = group(parent, at);
    obj.name = id;
    items.set(id, { id, name, obj, held, home: new THREE.Vector3(...at) });
    return obj;
  }
  const illuminate = room(root);
  const showTips = tipJar(root, label, ORDERS.length * 10);
  box(root, [0, 1.37, 0.92], [1.36, 1.17, 0.05], '#483a30');
  for (const { top, width } of bottleShelves) box(root, [0, top - 0.02, 0.78], [width, 0.04, 0.25], '#866544');
  const person = target('customer', 'Cliente', [0, 0, -1.53]);
  const hand = target('receiving-hand', 'Entregar na mão', [0.21, 1.32, 0.64], false, person);
  const drawCustomer = customer(person, hand);
  label(root, [0, 2.41, -3.72], 1.74, 0.32, { lines: ['ON THE HOUSE'], bg: '#26433b', ink: '#f0dcb3', font: 0.39, center: true });
  const clock = label(root, [0, 1.95, -3.7], 0.51, 0.15, { lines: ['22h00'], font: 0.57, center: true });
  const request = label(root, [-0.69, 1.67, -1.43], 0.73, 0.4, {}, '0 16 0');
  const manual = group(root, [0.99, 1.085, -0.12]);
  rotate(manual, '0 -88 0');
  box(manual, [0, 0.12, 0], [0.3, 0.24, 0.12], '#694c35');
  const book = group(manual, [0, 0.25, 0]);
  rotate(book, '-48 0 0');
  box(book, [0, 0, 0], [0.69, 0.36, 0.027], '#583626');
  for (const x of [-0.163, 0.163]) box(book, [x, 0, 0.025], [0.318, 0.336, 0.032], '#d8caa4');
  const paper = { bg: '#f3e6c9', ink: '#292d24', accent: '#775230' };
  const left = target('previous-page', 'Receita anterior', [-0.163, 0, 0.043], false, book);
  const right = target('next-page', 'Próxima receita', [0.163, 0, 0.043], false, book);
  const titlePage = label(left, [0, 0, 0], 0.312, 0.33, {});
  const page = label(right, [0, 0, 0], 0.312, 0.33, {});
  const tray = target('tray', 'Entrega', [0.34, 1.098, -1.045]);
  box(tray, [0, 0, 0], [0.3, 0.018, 0.14], '#ad955e');
  label(tray, [0, 0.012, 0], 0.25, 0.075, { lines: ['ENTREGA'], font: 0.48, center: true }, '-90 0 0');
  function basin(id: string, name: string, z: number) {
    const b = target(id, name, [-0.97, 1.095, z]);
    box(b, [0, 0, 0], [0.43, 0.025, 0.29], '#566b68');
    for (const side of [-1, 1]) {
      box(b, [side * 0.209, 0.024, 0], [0.018, 0.054, 0.3], '#adbfbb');
      box(b, [0, 0.024, side * 0.143], [0.41, 0.054, 0.018], '#adbfbb');
    }
    label(b, [0.228, 0.027, 0], 0.17, 0.043, { lines: [name], center: true, font: 0.49 }, '0 90 0');
    return b;
  }
  const sink = basin('sink', 'Pia', -0.34);
  cylinder(sink, [0, 0.016, 0], 0.025, 0.005, '#9aa69d');
  cylinder(sink, [-0.18, 0.11, 0], 0.015, 0.17, '#abbcb8');
  box(sink, [-0.13, 0.19, 0], [0.12, 0.023, 0.025], '#abbcb8');
  const iceBin = basin('bin-ice', 'Gelo', 0.01);
  for (let i = 0; i < 15; i++) {
    const cube = box(iceBin, [((i % 5) - 2) * 0.073, 0.035, (Math.floor(i / 5) - 1) * 0.08], [0.064, 0.05, 0.064], colors.ice);
    cube.rotation.y = i * 0.64;
  }
  const glass = target('glass', 'Copo', [-0.02, 1.18, -0.65], true);
  function glassModel(parent: THREE.Object3D, type: string) {
    const model = group(parent);
    const height = type === 'rocks' ? 0.112 : 0.164;
    const radius = type === 'coupe' ? 0.081 : type === 'rocks' || type === 'mug' ? 0.068 : 0.048;
    if (type === 'mug') torus(model, [0.068, 0, 0], 0.041, 0.009, '#a46f4d', 5, 10);
    if (type === 'coupe') {
      cylinder(model, [0, -0.077, 0], 0.054, 0.012, '#aecac3');
      cylinder(model, [0, -0.027, 0], 0.012, 0.09, '#aecac3');
      cone(model, [0, 0.05, 0], radius, 0.018, 0.068, '#aecac3');
    } else {
      cylinder(model, [0, (height - 0.164) / 2, 0], radius, height, type === 'mug' ? '#bf8d61' : '#aecac3');
    }
    cylinder(model, [0, height - 0.082, 0], radius, 0.006, '#4c6964');
    return model;
  }
  const glassModels = new Map<string, THREE.Object3D>();
  box(root, [-0.46, 1.29, -1.08], [0.89, 0.1, 0.21], '#67533e');
  for (const x of [-0.86, -0.06]) box(root, [x, 1.16, -1.11], [0.05, 0.17, 0.13], '#67533e');
  for (const [index, type] of Object.keys(GLASSES).entries()) {
    glassModels.set(type, glassModel(glass, type));
    const sample = target('choose-' + type, GLASSES[type as keyof typeof GLASSES], [-0.77 + index * 0.21, 1.423, -1.08]);
    glassModel(sample, type);
    label(sample, [0, -0.105, 0.11], 0.19, 0.052, { lines: [GLASSES[type as keyof typeof GLASSES]], font: 0.45, center: true });
  }
  const fill = cylinder(glass, [0, 0.089, 0], 0.052, 0.005, '#c6894d');
  const shaker = target('shaker', 'Coqueteleira', [-0.28, 1.215, -0.72], true);
  cylinder(shaker, [0, 0, 0], 0.067, 0.22, '#9da9a3');
  cylinder(shaker, [0, 0.112, 0], 0.067, 0.006, '#485854');
  const lid = target('lid', 'Tampa da coqueteleira', [-0.47, 1.135, -0.72], true);
  cone(lid, [0, 0, 0], 0.033, 0.067, 0.06, '#899b96', 12);
  const shakerSurface = cylinder(shaker, [0, 0.116, 0], 0.059, 0.004, '#c6894d');
  const gauge = box(shaker, [0, -0.003, 0.067], [0.025, 0.16, 0.003], '#34433c');
  const level = box(gauge, [0, 0, 0.003], [0.017, 0.15, 0.003], '#e5ab62');
  const contents = vesselFeedback({ root, stage: ctx.stage, vessels: { glass, shaker }, label });
  const pestle = target('pestle', 'Macerador', [-0.43, 1.19, -0.53], true);
  cylinder(pestle, [0, 0, 0], 0.023, 0.19, '#b78759');
  sphere(pestle, [0, -0.077, 0], 0.04, '#73533b');

  const spoon = target('spoon', 'Colher', [-0.148, 1.111, -0.62], true);
  spoon.rotation.set(-Math.PI / 2, 0, 0.34, 'YXZ');
  items.get('spoon')!.homeQuaternion = spoon.quaternion.clone();
  cylinder(spoon, [0, -0.005, 0], 0.01, 0.17, '#bbc2af', 7);
  sphere(spoon, [0, 0.079, 0], 0.033, '#b4b9a6').scale.set(0.72, 1.12, 0.43);
  const spoonSugar = sphere(spoon, [0, 0.083, 0.012], 0.021, colors.sugar);
  spoonSugar.name = 'sugar-dose';
  spoonSugar.visible = false;

  for (const [id, data] of Object.entries(INGREDIENTS) as [string, { name: string; kind: string; special?: boolean }][]) {
    const shelf = bottleShelves.find((row) => row.stock.includes(id));
    let home: Vec3 = [0, 0, 0];
    if (shelf) {
      const { stock, top } = shelf;
      const x = ((stock.length - 1) / 2 - stock.indexOf(id)) * 0.25;
      home = [x, top + 0.096, 0.78];
      const slot = target('slot-' + id, 'Guardar ' + data.name, [x, top + 0.007, 0.78]);
      cylinder(slot, [0, 0, 0], 0.085, 0.014, '#aa946a');
      label(slot, [0, -0.025, -0.132], 0.237, 0.044, { lines: [data.name], center: true, font: 0.47 }, '0 180 0');
    } else if (!data.special) {
      home = portions[id] ?? [0.89, 1.09, -0.7];
    }
    if (id === 'sugar' || id === 'lime' || id === 'mint') {
      const jar = target(id === 'sugar' ? id : 'bin-' + id, data.name, [home[0], 1.09, home[2]]);
      cylinder(jar, [0, 0.046, 0], 0.093, 0.092, '#956e50');
      cylinder(jar, [0, 0.093, 0], 0.084, 0.006, id === 'sugar' ? colors.sugar : '#534836');
      const face = Math.atan2(-home[0], -home[2]);
      label(
        jar,
        [Math.sin(face) * 0.103, 0.062, Math.cos(face) * 0.103],
        0.143,
        0.054,
        { lines: [data.name], center: true, font: 0.48 },
        '-15 ' + (face * 180) / Math.PI + ' 0',
      );
      if (id === 'sugar') continue;
      for (const offset of [-0.044, 0.046]) {
        const piece = sphere(jar, [offset, 0.101, -0.02], 0.033, colors[id]);
        if (id === 'mint') piece.scale.set(0.7, 0.4, 1.2);
      }
    }
    const el = target(id, data.name, home, true);
    if (data.special) {
      specimen(el, id);
      el.visible = false;
      continue;
    }
    if (data.kind === 'liquid') {
      cylinder(el, [0, -0.012, 0], 0.049, 0.165, colors[id]);
      cylinder(el, [0, 0.091, 0], 0.025, 0.058, colors[id]);
      cylinder(el, [0, 0.126, 0], 0.027, 0.022, '#6b5945');
      label(
        el,
        [0, -0.013, -0.051],
        0.092,
        0.064,
        { lines: [data.name], font: 0.25, center: true, bg: '#eee1bd', ink: '#302f27', accent: '#433627' },
        '0 180 0',
      );
    } else if (id === 'mint') {
      const stem = cylinder(el, [0, 0.016, 0], 0.003, 0.057, '#668746', 6);
      stem.rotation.z = -0.23;
      for (const side of [-1, 1]) {
        const leaf = sphere(el, [side * 0.016, side * 0.007 + 0.02, 0], 0.032, side === 1 ? '#508757' : colors.mint);
        leaf.scale.set(0.87, 0.31, 0.47);
        leaf.rotation.z = side * 0.55;
      }
    } else if (id === 'lime') {
      sphere(el, [0, 0.013, 0], 0.047, colors[id]).scale.set(1.1, 0.91, 0.93);
      cylinder(el, [0.011, 0.054, 0], 0.004, 0.011, '#587241', 6);
    } else box(el, [0, 0.003, 0], [0.072, 0.065, 0.063], colors[id]);
  }

  function button(id: string, name: string, at: Vec3, w: number, lines: string[], rotation = '-40 0 0') {
    const el = target(id, name, at);
    return label(el, [0, 0, 0], w, 0.081, { lines, center: true, font: 0.35 }, rotation);
  }
  const glassType = button('type', 'Trocar tipo de copo', [0.16, 1.14, -0.63], 0.18, ['TIPO DE COPO']);
  const toggle = button('pause', 'Turno / pausa', [-1.15, 1.69, -1.21], 0.21, ['INICIAR'], '0 20 0');
  button('height', 'Ajustar altura', [-1.15, 1.58, -1.21], 0.21, ['ALTURA'], '0 20 0');

  const flow = cylinder(root, [0, 0, 0], 0.012, 1, '#dfba76', 7);
  flow.visible = false;
  const cursors = ['#bce6df', '#ffe19b'].map((color) => {
    const ring = torus(root, [0, 0, 0], 0.06, 0.003, new THREE.MeshBasicMaterial({ color }), 6, 20);
    ring.visible = false;
    return ring;
  });

  let lastState: any,
    pageIndex = 0,
    previousPhase = '',
    previousOrder = -1,
    previousPause = false;
  function writePage() {
    const order = BOOK_RECIPES[pageIndex];
    titlePage.print({
      ...paper,
      lines: [
        order.name,
        'Copo: ' + GLASSES[order.glass as keyof typeof GLASSES],
        ...Object.entries(order.ingredients).map(([id, n]) => n + ' × ' + INGREDIENTS[id as keyof typeof INGREDIENTS].name),
        '‹ Anterior',
      ],
      font: 0.093,
    });
    page.print({
      ...paper,
      lines: ['PREPARO', order.instructions, pageIndex + 1 + ' / ' + BOOK_RECIPES.length + '   Próxima ›'],
      font: 0.097,
    });
  }
  function selectPage(index: number) {
    pageIndex = index;
    writePage();
    callbacks.onPage?.(index);
  }
  const feedback = (message: string) => callbacks.onFeedback?.(message);
  function act(action: Action): Result {
    events.activity();
    if (callbacks.onAction) return callbacks.onAction(action);
    const result = session.dispatch(action);
    render(session.state);
    return result;
  }
  function recenter() {
    const view = gl.xr.isPresenting ? gl.xr.getCamera() : ctx.camera();
    const position = new THREE.Vector3();
    view.getWorldPosition(position);
    // Move a estação, nunca o headset: a folga em relação aos olhos se mantém sentado.
    root.position.set(position.x, position.y - 1.6, position.z);
    root.updateMatrixWorld(true);
    feedback('Altura da bancada ajustada à posição atual.');
  }
  function activate(id: string) {
    if (id === 'height') {
      recenter();
      return true;
    }
    if (id === 'previous-page' || id === 'next-page') {
      selectPage((pageIndex + (id === 'next-page' ? 1 : -1) + BOOK_RECIPES.length) % BOOK_RECIPES.length);
      feedback('Livro de receitas · ' + BOOK_RECIPES[pageIndex].name);
      return true;
    }
    if (id === 'pause') {
      act({ type: lastState.phase === 'menu' ? 'start' : lastState.phase === 'finished' ? 'restart' : 'togglePause' });
      return true;
    }
    if (lastState.paused || lastState.phase !== 'playing') return false;
    if (id.startsWith('choose-')) {
      act({ type: 'selectGlass', glass: id.slice(7) });
      return true;
    }
    if (id === 'type') {
      const keys = Object.keys(GLASSES);
      act({ type: 'selectGlass', glass: keys[(keys.indexOf(lastState.glass.type) + 1) % keys.length] });
      return true;
    }
    return false;
  }
  const events = buildEvents({ root, target, onHint: feedback, onCue: callbacks.onEventCue });
  const controls = bindControls({
    scene,
    gl,
    camera: ctx.camera,
    root,
    items,
    flow,
    cursors,
    act,
    activate,
    feedback,
    session,
    collectSource: events.collect,
    tickEnvironment: events.tick,
    updateVesselPanels: (holders) => {
      const immersive = gl.xr.isPresenting;
      contents.frame(holders, immersive ? gl.xr.getCamera() : ctx.camera(), immersive, gl.domElement);
    },
    onInteraction: events.activity,
  });
  function render(state: any) {
    showTips(state.tips);
    const changed = previousOrder !== state.orderIndex || previousPhase !== state.phase;
    const pausedChange = previousPause !== state.paused;
    const newSession = lastState && lastState !== state;
    if (changed || pausedChange || newSession) {
      controls.releaseAll();
      if (newSession) controls.restoreThrown();
    }
    if (changed) {
      drawCustomer(state.orderIndex, state.phase === 'playing');
      illuminate(session.order?.act ?? (state.phase === 'finished' ? ORDERS.at(-1)!.act : 1));
      clock.print({ lines: [session.time], font: 0.57, center: true });
    }
    const collected = state.event?.status === 'collected' ? state.event.ingredient : null;
    controls.releaseUnavailable(collected);
    events.sync(state.event);
    previousOrder = state.orderIndex;
    previousPhase = state.phase;
    previousPause = state.paused;
    lastState = state;
    writePage();
    const order = session.order;
    const instruction = state.phase === 'finished' ? 'Amostra concluída.' : 'Pegue um ingrediente ou selecione INICIAR.';
    request.print({
      lines: state.paused
        ? ['PAUSA', 'Retome o turno no botão da estação.']
        : order
          ? [order.customer.toUpperCase(), state.complaint || order.dialogue]
          : ['BALCÃO DE ATENDIMENTO', instruction],
      font: 0.115,
    });
    toggle.print({
      lines: [state.phase === 'finished' ? 'REINICIAR' : state.phase === 'menu' ? 'INICIAR' : state.paused ? 'RETOMAR' : 'PAUSAR'],
      center: true,
      font: 0.35,
    });
    glassType.print({
      lines: ['COPO · ' + GLASSES[state.glass.type as keyof typeof GLASSES].toUpperCase()],
      font: 0.3,
      center: true,
    });
    for (const [type, model] of glassModels) model.visible = type === state.glass.type;
    fill.position.y = state.glass.type === 'rocks' ? 0.036 : 0.089;
    fill.visible = Object.keys(state.glass.ingredients).length > 0;
    const units = (Object.values(state.shaker.ingredients) as number[]).reduce((sum, count) => sum + count, 0);
    const height = units / (units + 2);
    level.visible = units > 0;
    level.scale.y = height;
    level.position.y = -0.075 * (1 - height);
    shakerSurface.visible = units > 0 && !state.shaker.closed;
    contents.render(state, changed || pausedChange || newSession);
    const parent = state.shaker.closed ? shaker : root;
    if (lid.parent !== parent) {
      if (state.shaker.closed) controls.releaseLid();
      parent.add(lid);
      if (state.shaker.closed) lid.position.set(0, 0.142, 0);
      else lid.position.copy(items.get('lid')!.home);
      lid.quaternion.identity();
      lid.updateMatrixWorld(true);
    }
  }
  render(session.state);
  // Começa com a bancada à vista, como no protótipo.
  return {
    render,
    recenter,
    frame: controls.frame,
    ingredientAdded: contents.added,
    selectPage,
    /** Posição de um objeto na tela (px no canvas). Usado pelos testes de navegador. */
    locate(id: string) {
      const item = items.get(id);
      if (!item?.obj.visible) return null;
      const p = item.obj.getWorldPosition(new THREE.Vector3()).project(ctx.camera());
      if (p.z > 1) return null;
      const r = gl.domElement.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    },
    /** Posição de um objeto em coordenadas da estação. Usado pelos testes de navegador. */
    where(id: string) {
      const p = items.get(id)!.obj.position;
      return { x: p.x, y: p.y, z: p.z };
    },
    /** Gira a câmera desktop para olhar um objeto. Usado pelos testes de navegador. */
    lookAt(id: string) {
      const camera = ctx.camera();
      const target = items.get(id)!.obj.getWorldPosition(new THREE.Vector3());
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
    },
    destroy() {
      controls.destroy();
      contents.destroy();
      for (const s of signs) s.dispose();
      root.removeFromParent();
    },
  };
}
