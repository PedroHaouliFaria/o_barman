// Monta a estação do bartender (greybox) e liga as regras do jogo à cena.
// Porta do station.js do protótipo A-Frame, com as mesmas posições em metros.
import * as THREE from 'three';
import { BOOK_RECIPES, GLASSES, INGREDIENTS, ORDERS } from '../domain/game.js';
import { BOTTLE_SPACING, bottleShelves } from '../interaction/bottle-placement.js';
import { ART_Y, mountArtBar } from './art-bar';
import { customerCast, dressBottle, dressGlass, dressUtensils, loadUtensils } from './dress';
import { BASE, GLASS_SHAPES } from './glass-shapes.js';
import { bindControls } from '../interaction/controls';
import { box, cone, customer, cylinder, group, rotate, room, sphere, torus, type Vec3 } from './blockout';
import { bookPage, medallion, paperLabel, plaque, subtitle, ticket, type Panel } from '../ui/world-ui';
import { buildEvents, specimen } from './environment';
import { createPianist } from '../audio/piano';
import { createMurmurs } from '../audio/room';
import { tipJar } from './tip-jar';
import { toolDrawer } from './tool-drawer';
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
  // Toda a interface no mundo vem de src/ui/world-ui.ts (desenhada do zero, diegética).
  const panels: Panel[] = [];
  const keepPanel = <T extends Panel>(p: T) => (panels.push(p), p);
  const engraved = (parent: THREE.Object3D, at: Vec3, w: number, h: number, rotation: Vec3, text: string) =>
    keepPanel(plaque(parent, at, w, h, rotation, text));
  function target(id: string, name: string, at: Vec3, held = false, parent: THREE.Object3D = root) {
    const obj = group(parent, at);
    obj.name = id;
    items.set(id, { id, name, obj, held, home: new THREE.Vector3(...at) });
    return obj;
  }
  room(root, { visible: false });
  // Colisores invisíveis do armário de trás e das prateleiras (estante aproximada).
  const collider = (at: Vec3, size: Vec3) => (box(root, at, size, '#000').visible = false);
  collider([0, 0.526, 0.64], [5.3, 1.052, 0.56]);
  collider([0, 1.472, 0.83], [4.8, 0.04, 0.3]);
  collider([0, 1.912, 0.83], [4.8, 0.04, 0.3]);
  collider([0, 1.85, 1.0], [5, 1.6, 0.03]);
  const art = mountArtBar(root, scene, (x, z, y) =>
    Math.abs(x) < 0.55 && bottleShelves.some((row) => Math.abs(row.top - y) < 0.1 && Math.abs(row.z - z) < 0.2),
  );
  // Som do salão: o pianista e o murmúrio das mesas, posicionais (o ouvido é a câmera/cabeça).
  const listener = new THREE.AudioListener();
  ctx.camera().add(listener);
  const pianist = createPianist(listener, art.bar.pianoAnchor, (hand) => art.bar.strike(hand));
  const murmurs = createMurmurs(listener, art.bar.murmurAnchors);
  let soundOn = true;
  const illuminate = (act: number) => {
    art.setAct(act);
    pianist.setAct(act);
    // O salão vai se calando enquanto a noite piora.
    murmurs.setLevel(soundOn ? ({ 1: 1, 2: 0.65, 3: 0.3, 4: 0.12 } as Record<number, number>)[act] ?? 0.12 : 0);
  };
  // ?leve: perfil do Quest também no computador (testes automáticos e máquinas fracas).
  const lightMode = typeof location !== 'undefined' && new URLSearchParams(location.search).has('leve');
  let lastMode: string | null = null;
  const showTips = tipJar(root, (parent, at, w, h) => keepPanel(paperLabel(parent, at, w, h, [0, 0, 0], { title: 'Gorjetas' })), ORDERS.length * 10);
  const person = target('customer', 'Cliente', [0, 0, -1.53]);
  // A mão estendida fica sobre o balcão, mais perto do bartender (alcance em VR).
  const hand = target('receiving-hand', 'Entregar na mão', [0.21, 1.25, 0.72], false, person);
  const drawBlocks = customer(person, hand);
  const blockParts = person.children.filter((child) => child !== hand);
  const cast = customerCast(person, art.stool);
  function drawCustomer(index: number, visible: boolean) {
    drawBlocks(index, visible);
    person.visible = true;
    const masked = cast.show(index, visible);
    for (const part of blockParts) part.visible = visible && !masked;
    // Quem está sentado à mesa levanta para vir ao balcão na sua vez.
    const atTable = [1, 2, 5];
    art.tablePeople.forEach((p, i) => (p.visible = !(visible && index === atTable[i])));
  }
  // Comanda: papel espetado num suporte de latão no balcão, inclinado para o bartender.
  const spike = group(root, [0.1, 1.084, -0.985]);
  const brassMat = new THREE.MeshStandardMaterial({ color: '#b8893f', metalness: 1, roughness: 0.32 });
  const spikeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 24), brassMat);
  spikeBase.position.y = 0.008;
  const spikeRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.2, 8), brassMat);
  spikeRod.position.set(0, 0.11, -0.014);
  spikeRod.rotation.x = -0.21;
  spike.add(spikeBase, spikeRod);
  const slip = keepPanel(ticket(spike, [0, 0.14, -0.006], 0.17, 0.24, [-12, 0, 0]));
  // Fala do cliente: legenda de cinema ao lado do rosto, sobre o salão escuro (não cobre a máscara).
  const speech = keepPanel(subtitle(root, [0.64, 1.7, -1.42], 0.66, 0.36, [0, -20, 0]));
  const manual = group(root, [0.99, 1.085, -0.12]);
  rotate(manual, '0 -88 0');
  box(manual, [0, 0.12, 0], [0.3, 0.24, 0.12], '#694c35').userData.greybox = true;
  const toggleDrawer = toolDrawer(target, items);
  const book = group(manual, [0, 0.25, 0]);
  rotate(book, '-48 0 0');
  box(book, [0, 0, 0], [0.69, 0.36, 0.027], '#583626');
  for (const x of [-0.163, 0.163]) box(book, [x, 0, 0.025], [0.318, 0.336, 0.032], '#d8caa4');
  // As páginas ficam 3 mm acima do papel do livro modelado.
  const left = target('previous-page', 'Receita anterior', [-0.163, 0, 0.049], false, book);
  const right = target('next-page', 'Próxima receita', [0.163, 0, 0.049], false, book);
  const titlePage = keepPanel(bookPage(left, [0, 0, 0], 0.312, 0.33, [0, 0, 0]));
  const page = keepPanel(bookPage(right, [0, 0, 0], 0.312, 0.33, [0, 0, 0]));
  const tray = target('tray', 'Entrega', [0.34, 1.098, -1.045]);
  box(tray, [0, 0, 0], [0.3, 0.018, 0.14], '#ad955e');
  engraved(tray, [0, 0.016, 0], 0.16, 0.04, [-90, 0, 0], 'Entrega');
  function basin(id: string, name: string, z: number) {
    const b = target(id, name, [-0.97, 1.095, z]);
    box(b, [0, 0, 0], [0.43, 0.025, 0.29], '#566b68');
    for (const side of [-1, 1]) {
      box(b, [side * 0.209, 0.024, 0], [0.018, 0.054, 0.3], '#adbfbb');
      box(b, [0, 0.024, side * 0.143], [0.41, 0.054, 0.018], '#adbfbb');
    }
    engraved(b, [0.219, 0.022, 0], 0.13, 0.034, [0, 90, 0], name);
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
    const { radius, height: tall } = GLASS_SHAPES[type];
    const height = tall;
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
  const sampleModels = new Map<string, THREE.Object3D>();
  const rack = [
    box(root, [-0.46, 1.29, -1.08], [0.89, 0.1, 0.21], '#67533e'),
    ...[-0.86, -0.06].map((x) => box(root, [x, 1.16, -1.11], [0.05, 0.17, 0.13], '#67533e')),
  ];
  for (const [index, type] of Object.keys(GLASSES).entries()) {
    glassModels.set(type, glassModel(glass, type));
    const sample = target('choose-' + type, GLASSES[type as keyof typeof GLASSES], [-0.77 + index * 0.21, 1.423, -1.08]);
    sampleModels.set(type, glassModel(sample, type));
    engraved(sample, [0, -0.105, 0.108], 0.15, 0.036, [0, 0, 0], GLASSES[type as keyof typeof GLASSES]);
  }
  // Superfície do drinque: aparece quando há algo no copo, a 70% da altura.
  const fill = cylinder(glass, [0, 0, 0], 1, 0.004, '#c6894d');
  fill.material = new THREE.MeshStandardMaterial({
    color: '#b8742f',
    roughness: 0.15,
    transparent: true,
    opacity: 0.85,
    emissive: '#4a2408',
  });
  art.ready.then((assets) => {
    for (const [type, model] of glassModels) dressGlass(model, type, assets);
    for (const type of Object.keys(GLASSES)) dressGlass(sampleModels.get(type)!, type, assets);
    for (const item of items.values()) if (INGREDIENTS[item.id as keyof typeof INGREDIENTS]?.kind === 'liquid') dressBottle(item, assets);
    render(session.state);
  });
  const shaker = target('shaker', 'Coqueteleira', [-0.28, 1.215, -0.72], true);
  cylinder(shaker, [0, 0, 0], 0.067, 0.22, '#9da9a3');
  cylinder(shaker, [0, 0.112, 0], 0.067, 0.006, '#485854');
  const lid = target('lid', 'Tampa da coqueteleira', [-0.47, 1.135, -0.72], true);
  cone(lid, [0, 0, 0], 0.033, 0.067, 0.06, '#899b96', 12);
  const shakerSurface = cylinder(shaker, [0, 0.116, 0], 0.059, 0.004, '#c6894d');
  const gauge = box(shaker, [0, -0.003, 0.071], [0.025, 0.16, 0.003], '#34433c');
  const level = box(gauge, [0, 0, 0.003], [0.017, 0.15, 0.003], '#e5ab62');
  const contents = vesselFeedback({ root, stage: ctx.stage, vessels: { glass, shaker } });
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
      const { stock, top, z } = shelf;
      const x = ((stock.length - 1) / 2 - stock.indexOf(id)) * BOTTLE_SPACING;
      home = [x, top + 0.0965, z];
      // Base para guardar a garrafa (desktop): aro de latão em volta do lugar e plaqueta com o nome.
      const slot = target('slot-' + id, 'Guardar ' + data.name, [x, top + 0.004, z]);
      const ring = torus(slot, [0, 0, 0], 0.062, 0.0035, '#b08a4a', 6, 28);
      ring.rotation.x = Math.PI / 2;
      // Área de clique invisível dentro do aro (o mouse acerta o lugar da garrafa).
      const hit = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      hit.rotation.x = -Math.PI / 2;
      hit.position.y = 0.002;
      slot.add(hit);
      const front = shelf.z < 0.6;
      const onShelf = shelf.top > 1.3;
      const tag: [Vec3, Vec3] = front
        ? [[0, -0.025, -0.142], [0, 180, 0]] // na face do tampo de trás
        : onShelf
          ? [[0, -0.024, -0.153], [0, 180, 0]] // na borda da prateleira
          : [[0, -0.001, -0.1], [-90, 180, 0]]; // deitada no tampo, à frente da garrafa
      engraved(slot, tag[0], 0.16, 0.032, tag[1], data.name);
    } else if (!data.special) {
      home = portions[id] ?? [0.89, 1.09, -0.7];
    }
    if (id === 'sugar' || id === 'lime' || id === 'mint') {
      const jar = target(id === 'sugar' ? id : 'bin-' + id, data.name, [home[0], 1.09, home[2]]);
      cylinder(jar, [0, 0.046, 0], 0.093, 0.092, '#956e50');
      cylinder(jar, [0, 0.093, 0], 0.084, 0.006, id === 'sugar' ? colors.sugar : '#534836');
      const face = Math.atan2(-home[0], -home[2]);
      keepPanel(
        paperLabel(jar, [Math.sin(face) * 0.1, 0.05, Math.cos(face) * 0.1], 0.1, 0.05, [-4, (face * 180) / Math.PI, 0], {
          title: data.name,
        }),
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

  // Medalhões de latão num pequeno atril de nogueira à esquerda da bancada.
  const controlsStand = group(root, [-1.0, 1.084, -0.8]);
  controlsStand.rotation.y = 0.6;
  const standWood = new THREE.MeshStandardMaterial({ color: '#3a2214', roughness: 0.55 });
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.09), standWood);
  standBase.position.y = 0.012;
  const standBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.018), standWood);
  standBack.position.set(0, 0.07, -0.02);
  standBack.rotation.x = -0.35;
  controlsStand.add(standBase, standBack);
  function medal(id: string, name: string, x: number) {
    const el = target(id, name, [0, 0, 0], false, controlsStand);
    el.position.set(x, 0.072, -0.008);
    el.rotation.x = -0.35;
    return keepPanel(medallion(el, [0, 0, 0], 0.082, [0, 0, 0]));
  }
  const toggle = medal('pause', 'Turno / pausa', -0.048);
  medal('height', 'Ajustar altura', 0.048).draw({ word: 'Altura', icon: 'height' });

  const flow = cylinder(root, [0, 0, 0], 0.012, 1, '#dfba76', 7);
  flow.visible = false;
  // Mira: halo de latão discreto (uma cor por mão).
  const cursors = ['#f1d59a', '#e8b66a'].map((color) => {
    const ring = torus(
      root,
      [0, 0, 0],
      0.055,
      0.0022,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
      6,
      32,
    );
    ring.visible = false;
    return ring;
  });

  let lastState: any,
    pageIndex = 0,
    previousPhase = '',
    previousOrder = -1,
    previousPause = false;
  function writePage() {
    const recipe = BOOK_RECIPES[pageIndex];
    titlePage.draw({
      kind: 'ingredients',
      title: recipe.name,
      subtitle: 'servido em ' + GLASSES[recipe.glass as keyof typeof GLASSES],
      lines: Object.entries(recipe.ingredients).map(([id, n]) => n + ' × ' + INGREDIENTS[id as keyof typeof INGREDIENTS].name),
      folio: '— ' + (pageIndex + 1) + ' —',
      hint: '‹ toque para voltar',
    });
    page.draw({
      kind: 'method',
      title: recipe.name,
      lines: [recipe.instructions],
      folio: '— ' + (pageIndex + 1) + ' / ' + BOOK_RECIPES.length + ' —',
      hint: 'toque para avançar ›',
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
    if (id === 'drawer') {
      toggleDrawer(controls.moveDrawer);
      return true;
    }
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
    return false;
  }
  const events = buildEvents({ root, target, onHint: feedback, onCue: callbacks.onEventCue });
  let dressed = false;
  Promise.all([loadUtensils(), art.ready, cast.loading]).then(([get]) => {
    dressed = true;
    dressUtensils(get, {
      items,
      manual,
      book,
      rack,
      root,
      slug: events.slugBody,
      actors: events.actors,
      keep: new Set([shakerSurface, gauge]),
    });
    controls.dressHands(get('mao_cliente'));
  });
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
    if (changed && state.phase === 'finished') pianist.finale();
    if (changed && state.phase === 'playing') pianist.resume();
    if (pausedChange) pianist.setPaused(state.paused);
    if (changed) {
      controls.clearGlass();
      drawCustomer(state.orderIndex, state.phase === 'playing');
      illuminate(session.order?.act ?? (state.phase === 'finished' ? ORDERS.at(-1)!.act : 1));
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
    // Comanda: o pedido atual; fora do turno, a comanda diz o que fazer.
    if (order) {
      slip.draw({
        number: state.orderIndex + 1,
        time: session.time,
        customer: order.customer,
        drink: order.name,
        glass: GLASSES[order.glass as keyof typeof GLASSES],
        stamp: state.complaint ? 'Devolvido' : undefined,
      });
    } else {
      slip.draw({
        number: 0,
        time: '',
        customer: '',
        drink: '',
        glass: '',
        idle:
          state.phase === 'finished'
            ? { title: 'Casa fechada', line: 'Toque no medalhão para servir de novo.' }
            : { title: 'O bar vai abrir', line: 'Toque no medalhão de latão para começar o turno.' },
      });
    }
    speech.draw(
      state.paused
        ? { line: 'Turno em pausa', tone: 'system' }
        : order
          ? { speaker: order.customer, line: state.complaint || order.dialogue, tone: state.complaint ? 'complaint' : 'normal' }
          : { line: '' },
    );
    toggle.draw(
      state.phase === 'finished'
        ? { word: 'Reabrir', icon: 'restart' }
        : state.phase === 'menu'
          ? { word: 'Abrir', icon: 'play' }
          : state.paused
            ? { word: 'Voltar', icon: 'play' }
            : { word: 'Pausar', icon: 'pause' },
    );
    glass.visible = Boolean(state.glass.type);
    for (const [type, model] of glassModels) model.visible = type === state.glass.type;
    const cup = GLASS_SHAPES[state.glass.type ?? 'highball'];
    const surface = cup.bottom + (cup.rim - cup.bottom) * 0.7;
    fill.position.y = surface;
    // Raio na altura da superfície (a taça Coupe se abre para cima).
    const across = state.glass.type === 'coupe' ? 0.55 + 0.45 * 0.7 : 0.92;
    fill.scale.set(cup.radius * across, 1, cup.radius * across);
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
    /** Liga a música (precisa de um gesto do jogador antes, por regra dos navegadores). */
    startMusic() {
      if (listener.context.state === 'suspended') listener.context.resume().catch(() => {});
      pianist.start();
      murmurs.start();
      illuminate(session.order?.act ?? 1);
    },
    music: () => pianist.stats(),
    /** Diagnóstico: luzes do bar e se estão ligadas. */
    lightReport: () => {
      const out: string[] = [];
      art.bar.root.traverse((o) => {
        if ((o as THREE.Light).isLight) out.push(o.type + ':' + o.visible + ':' + (o as THREE.Light).castShadow);
      });
      return out;
    },
    setSound(on: boolean) {
      soundOn = on;
      pianist.setEnabled(on);
      illuminate(session.order?.act ?? 1);
    },
    frame(time: number, dt: number, xrFrame?: XRFrame) {
      const mode = lightMode ? 'leve' : gl.xr.isPresenting ? 'vr' : 'alta';
      if (mode !== lastMode) {
        lastMode = mode;
        art.setQuality(mode, gl);
      }
      art.update(time / 1000, dt / 1000);
      controls.frame(time, dt, xrFrame);
    },
    confirmPreparation: contents.confirmPreparation,
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
    /** true quando os modelos do Blender já vestiram a estação. Usado pelos testes. */
    get ready() {
      return dressed;
    },
    /** Só para ensaios no simulador sem GPU: esconde a decoração a mais de `reach` metros (salão, mesas, piano). */
    declutter(reach = 2.4) {
      const p = new THREE.Vector3();
      art.bar.root.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        o.getWorldPosition(p);
        if (Math.hypot(p.x, p.z) > reach) o.visible = false;
      });
      for (const l of [...art.bar.pendantLights]) l.castShadow = false;
    },
    debugHands: () => controls.debugHands(),
    /** Ponto (0, y, 0) do objeto em coordenadas da estação. Usado pelos testes de VR para mirar. */
    pointOf(id: string, y: number) {
      const p = root.worldToLocal(items.get(id)!.obj.localToWorld(new THREE.Vector3(0, y, 0)));
      return { x: p.x, y: p.y, z: p.z };
    },
    /** Diagnóstico: malhas visíveis por grupo de topo e luzes visíveis por tipo. */
    meshReport() {
      const out: Record<string, number> = {};
      const lights: string[] = [];
      scene.traverseVisible((o) => {
        if ((o as THREE.Light).isLight) lights.push(o.type + (o.parent?.name ? '@' + o.parent.name : ''));
        if (!(o as THREE.Mesh).isMesh) return;
        let top: THREE.Object3D = o;
        while (top.parent && top.parent !== root && top.parent !== art.bar.root && top.parent !== scene) top = top.parent;
        const key = (top.parent === art.bar.root ? 'bar/' : top.parent === root ? 'estacao/' : '') + (top.name || top.type);
        out[key] = (out[key] ?? 0) + 1;
      });
      return { meshes: Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 25), lights };
    },
    /** Custo do último quadro (chamadas de desenho, triângulos, luzes ativas). Diagnóstico de desempenho. */
    stats() {
      let lights = 0,
        meshes = 0;
      scene.traverseVisible((o) => {
        if ((o as THREE.Light).isLight) lights++;
        if ((o as THREE.Mesh).isMesh) meshes++;
      });
      return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, lights, meshes, programs: gl.info.programs?.length };
    },
    /** Altura da boca de uma garrafa acima da origem. Usado pelos testes de VR. */
    mouth(id: string) {
      return items.get(id)?.mouth ?? 0.135;
    },
    /** Posição de um objeto em coordenadas da estação. Usado pelos testes de navegador. */
    where(id: string) {
      const p = root.worldToLocal(items.get(id)!.obj.getWorldPosition(new THREE.Vector3()));
      return { x: p.x, y: p.y, z: p.z };
    },
    /** Gira a câmera desktop para olhar um objeto. Usado pelos testes de navegador. */
    lookAt(id: string | [number, number, number]) {
      const camera = ctx.camera();
      const target =
        typeof id === 'string'
          ? items.get(id)!.obj.getWorldPosition(new THREE.Vector3())
          : root.localToWorld(new THREE.Vector3(...id));
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
    },
    destroy() {
      pianist.dispose();
      murmurs.dispose();
      listener.removeFromParent();
      controls.destroy();
      contents.destroy();
      for (const p of panels) p.dispose();
      root.removeFromParent();
    },
  };
}
