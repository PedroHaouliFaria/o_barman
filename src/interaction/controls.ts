// Entrada do jogador: mouse/teclado no desktop e controles/mãos no Quest.
// Porta direta do station-controls.js do protótipo: mesmos limiares e regras.
import * as THREE from 'three';
import { INGREDIENTS } from '../domain/game.js';
import { group, sphere } from '../scene/blockout';
import type { Action, Item, Result } from '../scene/types';
import { muddleStep, newMotion, pourStep, resetShake, shakeStep, stirStep } from './motion.js';
import { throwPhysics } from './throw-physics';
import { GESTURE_SLACK, glassShape } from '../scene/glass-shapes.js';
import { restingSurfaceAt, settleHeight } from './bottle-placement.js';

type Motion = ReturnType<typeof newMotion>;
const isIngredient = (id: string): id is keyof typeof INGREDIENTS => Object.hasOwn(INGREDIENTS, id);
const kindOf = (id: string) => (isIngredient(id) ? INGREDIENTS[id].kind : undefined);
const isSpecial = (id: string) => isIngredient(id) && Boolean((INGREDIENTS[id] as { special?: boolean }).special);

interface Holder {
  el: THREE.Object3D;
  held: Item | null;
  motion: Motion;
  previous: THREE.Vector3;
  isMouse?: boolean;
  side?: XRHandedness;
  trackedSpecial?: boolean;
  triggerItem?: Item | null;
  sampled?: boolean;
  velocity?: THREE.Vector3;
  spin?: THREE.Vector3;
}
interface Hand extends Holder {
  side: XRHandedness;
  aim: THREE.Object3D;
  source: XRInputSource | null;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  lastPos: THREE.Vector3;
  lastRot: THREE.Quaternion;
  cursor: THREE.Object3D;
  gripPressed?: boolean;
  selectPressed?: boolean;
  rawGrip?: boolean;
  rawSelect?: boolean;
}

export interface ControlsOptions {
  scene: THREE.Scene;
  gl: THREE.WebGLRenderer;
  camera: () => THREE.Camera;
  root: THREE.Object3D;
  items: Map<string, Item>;
  flow: THREE.Object3D;
  cursors: THREE.Object3D[];
  act: (action: Action) => Result;
  activate: (id: string) => boolean;
  feedback: (message: string) => void;
  session: { state: any; dispatch: (action: Action) => Result };
  collectSource: (id: string) => void;
  tickEnvironment: (dt: number) => void;
  updateVesselPanels: (holders: Holder[]) => void;
  onInteraction: () => void;
}

export function bindControls(o: ControlsOptions) {
  const { scene, gl, root, items, flow, cursors, act, activate, feedback, session } = o;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const vec = () => new THREE.Vector3();
  const here = vec(),
    point = vec(),
    dest = vec(),
    delta = vec(),
    axis = vec();
  const quaternion = new THREE.Quaternion();
  const roots = [...items.values()].map((item) => item.obj);
  const lookup = new Map([...items.values()].map((item) => [item.obj, item]));
  const hands: Hand[] = [];
  const events = new AbortController();
  const listeners = { signal: events.signal };
  const canvas = gl.domElement;
  const portions = new Set(['lime', 'ice', 'mint']);
  const portionAtRest = new Map([...portions].map((id) => [id, items.get(id)!.obj.visible]));
  const bottles = [...items.values()].filter((item) => kindOf(item.id) === 'liquid');
  const physics = throwPhysics(
    root,
    bottles,
    (item) => holders().some((hand) => hand.held === item),
    items.get('drawer')?.obj,
  );
  const change = new THREE.Quaternion();
  const sugarDose = items.get('spoon')!.obj.getObjectByName('sugar-dose');
  let spoonLoaded = false;
  function loadSpoon(loaded: boolean) {
    spoonLoaded = loaded;
    if (sugarDose) sugarDose.visible = loaded;
  }
  loadSpoon(false);
  const desktop: Holder = { el: o.camera(), held: null, motion: newMotion(), previous: vec(), isMouse: true };
  let activeCanvas = false,
    down: { x: number; y: number; dragged: boolean } | null = null,
    lastHover = 0,
    wasImmersed = false;
  const live = () => session.state.phase === 'playing' && !session.state.paused;
  const immersed = () => gl.xr.isPresenting;

  function fromRay(hand?: Holder) {
    const hits = ray.intersectObjects(roots, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && obj.visible && !lookup.has(obj)) obj = obj.parent;
      const item = obj ? lookup.get(obj) : undefined;
      if (item && item.obj.visible && canTarget(hand, item)) return item;
    }
    return null;
  }
  function underMouse() {
    if (!activeCanvas || immersed()) return null;
    ray.near = 0.02;
    ray.far = 6;
    ray.setFromCamera(pointer, o.camera());
    return fromRay(desktop);
  }
  function canTarget(hand: Holder | undefined, item: Item) {
    // Com algo na mão, as outras garrafas não são alvo (não se usa garrafa em garrafa):
    // a mira atravessa a fileira da frente até a plaqueta de trás.
    if (hand?.held && hand.held !== item && kindOf(item.id) === 'liquid') return false;
    const owner = holders().find((h) => h.held === item);
    return !owner || (owner !== hand && Boolean(hand?.held) && ['glass', 'shaker'].includes(item.id));
  }
  function front(hand: Hand) {
    if (hand.held?.id === 'spoon') {
      const nearby = closeTarget(hand, ['sugar', 'glass', 'shaker'], 0.079, 0.09);
      if (nearby) return nearby;
    }
    hand.el.getWorldPosition(here);
    let result: Item | null = null,
      distance = 0.135;
    for (const item of items.values()) {
      if (!item.obj.visible || item.id.startsWith('slot-') || !canTarget(hand, item)) continue;
      item.obj.getWorldPosition(point);
      const d = here.distanceTo(point);
      if (d < distance) {
        result = item;
        distance = d;
      }
    }
    if (result) return result;
    hand.aim.getWorldPosition(here);
    axis.set(0, 0, -1).applyQuaternion(hand.aim.getWorldQuaternion(quaternion));
    ray.near = 0.01;
    ray.far = 6;
    ray.set(here, axis);
    return fromRay(hand);
  }
  const allHolders: Holder[] = [desktop];
  const holders = () => allHolders;
  function resetItem(holder: Holder) {
    const item = holder.held;
    if (!item) return;
    // Utensílios da gaveta não voltam sozinhos: caem de onde estão.
    if (item.stow) return throwItem(holder, delta.set(0, 0, 0), axis.set(0, 0, 0));
    item.obj.position.copy(item.home);
    if (item.homeQuaternion) item.obj.quaternion.copy(item.homeQuaternion);
    else item.obj.quaternion.identity();
    if (portions.has(item.id)) item.obj.visible = portionAtRest.get(item.id)!;
    if (item.id === 'spoon') loadSpoon(false);
    if (item.id === 'glass') items.get('receiving-hand')!.obj.visible = false;
    if (isSpecial(item.id)) item.obj.visible = false;
    holder.trackedSpecial = false;
    holder.triggerItem = null;
    holder.held = null;
    holder.motion = newMotion();
    flow.visible = false;
  }
  function releaseAll() {
    for (const holder of holders()) resetItem(holder);
    for (const cursor of cursors) cursor.visible = false;
  }
  function restoreThrown() {
    for (const item of [...physics.bodies.keys()]) {
      physics.remove(item);
      item.obj.position.copy(item.home);
      item.obj.quaternion.copy(item.homeQuaternion ?? quaternion.identity());
      if (portions.has(item.id)) item.obj.visible = portionAtRest.get(item.id)!;
      if (isSpecial(item.id)) item.obj.visible = false;
      item.stow?.();
    }
  }
  function pick(holder: Holder, target: Item | null) {
    let item = target;
    // Os modelos na estante são a fonte do copo: pegar um deles põe esse copo vazio na mão.
    if (item?.id.startsWith('choose-')) {
      if (session.state.phase === 'menu') act({ type: 'start' });
      const glass = items.get('glass')!;
      if (holders().some((h) => h.held === glass)) return;
      if (!live() || !act({ type: 'selectGlass', glass: item.id.slice(7) }).ok) return;
      physics.remove(glass);
      if (holder.isMouse) {
        // No desktop o copo escolhido vai direto para o lugar dele na bancada.
        glass.obj.position.copy(glass.home);
        glass.obj.quaternion.identity();
        return;
      }
      item = glass;
    }
    const source = item?.id.startsWith('event-') ? item : null;
    if (source) item = items.get(source.id.slice(6)) ?? null;
    if (item?.id.startsWith('bin-')) item = items.get(item.id.slice(4)) ?? null;
    if (item?.id === 'sugar') {
      feedback('Pegue a colher para retirar o açúcar.');
      return;
    }
    if (!item?.held || holders().some((h) => h.held === item)) return;
    if (session.state.phase === 'menu') act({ type: 'start' });
    if (!live()) {
      feedback(
        session.state.paused
          ? 'Turno pausado. Selecione Retomar para usar o balcão.'
          : 'Reinicie o turno para usar o balcão.',
      );
      return;
    }
    if (item.id === 'lid' && session.state.shaker.closed) act({ type: 'toggleLid' });
    if (source) {
      if (!source.obj.visible) return;
      const event = session.state.event;
      if (event?.ingredient === item.id && event.status === 'available') {
        act({ type: 'collect', ingredient: item.id });
      } else {
        o.collectSource(item.id);
      }
      holder.trackedSpecial = event?.ingredient === item.id && event.status === 'collected';
      item.obj.visible = true;
    }
    if (!source && physics.bodies.has(item)) holder.trackedSpecial = Boolean(item.thrownSpecial);
    physics.remove(item);
    holder.sampled = false;
    holder.velocity?.set(0, 0, 0);
    holder.spin?.set(0, 0, 0);
    o.onInteraction();
    holder.held = item;
    if (item.stow) item.stowed = false;
    if (portions.has(item.id)) item.obj.visible = true;
    if (item.id === 'glass') items.get('receiving-hand')!.obj.visible = true;
    holder.motion = newMotion();
    follow(holder);
    item.obj.getWorldPosition(holder.previous);
    feedback(item.id === 'glass' ? 'Copo em mãos. Entregue ao cliente ou leve à pia.' : item.name + ' em mãos.');
  }
  function follow(holder: Holder) {
    const anchor = holder.el;
    const obj = holder.held!.obj;
    point.set(...((holder.isMouse ? [0.18, -0.2, -0.43] : [0, 0, -0.045]) as [number, number, number]));
    anchor.localToWorld(point);
    root.worldToLocal(point);
    obj.position.copy(point);
    anchor.getWorldQuaternion(quaternion);
    obj.quaternion.copy(quaternion);
    if (!holder.isMouse && holder.held!.id === 'spoon') obj.rotateX(Math.PI);
    obj.updateMatrixWorld(true);
  }
  function mark(item: Item | null, cursorRing: THREE.Object3D) {
    cursorRing.visible = Boolean(item);
    if (!item) return;
    item.obj.getWorldPosition(cursorRing.position);
    root.worldToLocal(cursorRing.position);
    if (item.held) cursorRing.position.y -= 0.035;
    else cursorRing.position.z += 0.015;
    cursorRing.rotation.x = item.held || ['sink', 'tray'].includes(item.id) ? -Math.PI / 2 : 0;
  }
  function operate(holder: Holder, target: Item | null, release = false) {
    o.onInteraction();
    const item = holder.held;
    // Placas e pausa também funcionam antes do primeiro pedido e durante a pausa.
    if (!item) {
      if (target?.id.startsWith('event-')) return pick(holder, target);
      if (target && activate(target.id)) return;
      if (holder.isMouse && !release && target) pick(holder, target);
      return;
    }
    if (!live()) return;
    // Mouse: soltar na gaveta aberta (qualquer objeto) ou um utensílio sobre uma superfície o pousa ali.
    const drawer = items.get('drawer');
    const overDrawer = Boolean(drawer) && target === drawer && drawer!.obj.position.x < drawer!.home.x;
    if (holder.isMouse && release && (overDrawer || item.stow)) {
      const surfaces = overDrawer ? [drawer!.obj] : root.children.filter((child) => child.userData.box);
      const hit = ray.intersectObjects(surfaces, true)[0];
      if (hit?.face && hit.face.normal.y > 0.5) {
        root.worldToLocal(point.copy(hit.point));
        point.y += item.stow ? 0.025 : 0.12;
        item.obj.position.copy(point);
        if (item.stow) item.obj.rotation.set(0, holder.el.rotation.y, 0);
      }
      throwItem(holder, delta.set(0, 0, 0), axis.set(0, 0, 0));
      return;
    }
    const id = item.id;
    const container = target?.id === 'glass' || target?.id === 'shaker' ? target.id : null;
    if (id === 'lid') {
      if (!release) return;
      resetItem(holder);
      if (container === 'shaker' && !session.state.shaker.closed) act({ type: 'toggleLid' });
      return;
    }
    if (kindOf(id) === 'liquid') {
      if (holder.isMouse && target?.id === 'slot-' + id) {
        resetItem(holder);
        feedback(item.name + ' no seu lugar.');
      } else if (holder.isMouse && container) {
        act({ type: 'add', ingredient: id, target: container });
      } else if (target?.id === 'pause' || target?.id === 'height') {
        activate(target.id);
      } else {
        feedback(
          holder.isMouse
            ? 'Clique no recipiente para dosar ou na base desta garrafa para guardá-la.'
            : 'Incline a garrafa perto da boca do recipiente para despejar.',
        );
      }
      return;
    }
    if (!holder.isMouse && !release && (id === 'spoon' || id === 'pestle') && (container || target?.id === 'sugar')) return;
    if (id === 'spoon' && target?.id === 'sugar') {
      loadSpoon(true);
      feedback('Colher com uma porção de açúcar. Leve-a até o recipiente.');
      return;
    }
    if (id === 'spoon' && container && spoonLoaded) {
      const result = act({ type: 'add', ingredient: 'sugar', target: container });
      if (result.ok) {
        loadSpoon(false);
        if (holder.isMouse) resetItem(holder);
      }
      return;
    }
    if (isIngredient(id) && container) {
      if (!release && !holder.isMouse) feedback('Solte o ingrediente sobre o recipiente.');
      else act({ type: 'add', ingredient: id, target: container });
    } else if (release && holder.trackedSpecial) {
      act({ type: 'discardSpecial' });
    } else if (id === 'spoon' && container === 'glass') act({ type: 'stir' });
    else if (id === 'pestle' && container === 'glass') act({ type: 'muddle' });
    else if (id === 'shaker' && container === 'glass') act({ type: 'transfer' });
    else if (id === 'glass' && ['customer', 'receiving-hand', 'tray'].includes(target?.id ?? '')) {
      if (act({ type: 'deliver' }).ok) resetItem(holder);
    } else if ((id === 'glass' || id === 'shaker') && target?.id === 'sink') act({ type: 'rinse', target: id });
    else if (id === 'shaker' && !release && session.state.shaker.closed) act({ type: 'shake' });
    else if (!release && target && activate(target.id)) return;
    else if (!release) feedback('Aponte para o recipiente, a pia ou a bandeja.');
    if (release || (holder.isMouse && isIngredient(id))) resetItem(holder);
  }
  function sampleRelease(hand: Hand, dt: number) {
    const obj = hand.held!.obj;
    if (hand.sampled && dt > 0 && dt <= 100) {
      const blend = 1 - Math.exp(-dt / 30);
      delta.subVectors(obj.position, hand.lastPos).multiplyScalar(1000 / dt);
      hand.velocity.lerp(delta.clampLength(0, 8), blend);
      change.copy(hand.lastRot).invert().premultiply(obj.quaternion);
      const length = Math.hypot(change.x, change.y, change.z);
      const angle = 2 * Math.atan2(length, Math.abs(change.w));
      delta
        .set(change.x, change.y, change.z)
        .multiplyScalar(length ? (Math.sign(change.w || 1) * angle * 1000) / (length * dt) : 0);
      hand.spin.lerp(delta.clampLength(0, 25), blend);
    } else {
      hand.velocity.set(0, 0, 0);
      hand.spin.set(0, 0, 0);
    }
    hand.lastPos.copy(obj.position);
    hand.lastRot.copy(obj.quaternion);
    hand.sampled = true;
  }
  function throwItem(holder: Holder, velocity: THREE.Vector3, spin: THREE.Vector3) {
    const item = holder.held!;
    physics.launch(item, session.state, velocity, spin);
    if (item.id === 'glass') items.get('receiving-hand')!.obj.visible = false;
    item.thrownSpecial = holder.trackedSpecial;
    holder.trackedSpecial = false;
    holder.triggerItem = null;
    holder.held = null;
    holder.sampled = false;
    flow.visible = false;
  }
  function closeTarget(holder: Holder, ids: string[], offset = 0, radius = 0.145) {
    point.set(0, offset, 0);
    holder.held!.obj.localToWorld(point);
    let result: Item | null = null,
      closest = radius;
    for (const id of ids) {
      const item = items.get(id);
      if (!item?.obj.visible) continue;
      dest.set(0, id === 'glass' ? glassShape(session.state.glass.type).rim : id === 'shaker' ? 0.112 : 0, 0);
      item.obj.localToWorld(dest);
      const d = dest.distanceTo(point);
      if (d < closest) {
        result = item;
        closest = d;
      }
    }
    return result;
  }
  function drop(hand: Hand) {
    if (!hand.held) return;
    follow(hand);
    const id = hand.held.id;
    let target: Item | null = null;
    if (id === 'lid') target = closeTarget(hand, ['shaker'], -0.03, 0.085);
    else if (kindOf(id) === 'solid') target = closeTarget(hand, ['glass', 'shaker']);
    else if (id === 'glass') target = closeTarget(hand, ['receiving-hand', 'tray', 'sink'], 0, 0.19);
    else if (id === 'shaker') target = closeTarget(hand, ['sink'], 0, 0.19);
    if (target) operate(hand, target, true);
    else if (!setDown(hand)) throwItem(hand, hand.velocity, hand.spin);
  }
  /**
   * Assistência de pouso (boa prática de VR): soltar devagar um recipiente ou garrafa
   * logo acima de uma bancada ou prateleira o assenta em pé ali, sem tombar nem quicar.
   * Soltar em movimento continua sendo arremesso.
   */
  function setDown(hand: Hand) {
    const item = hand.held!;
    const base = settleHeight(item.id, kindOf(item.id), session.state);
    if (base === null || hand.velocity.length() > 0.9) return false;
    item.obj.getWorldPosition(point);
    root.worldToLocal(point);
    const surface = restingSurfaceAt({ x: point.x, y: point.y - base, z: point.z });
    if (surface === null || surface < 0.5 || point.y - base - surface > 0.3) return false;
    item.obj.position.set(point.x, surface + base + 0.002, point.z);
    // Não deixa dois objetos ocupando o mesmo lugar: afasta do vizinho na mesma superfície.
    const radius = (it: Item) => (it.id === 'glass' ? glassShape(session.state.glass.type).radius + 0.01 : it.id === 'shaker' ? 0.072 : (it.bottle?.radius ?? 0.05) + 0.004);
    for (let pass = 0; pass < 3; pass++) {
      for (const other of items.values()) {
        if (other === item || !other.obj.visible || !(other.id === 'glass' || other.id === 'shaker' || kindOf(other.id) === 'liquid')) continue;
        if (holders().some((h) => h.held === other)) continue;
        other.obj.getWorldPosition(dest);
        root.worldToLocal(dest);
        if (Math.abs(dest.y - item.obj.position.y) > 0.15) continue;
        const dx = item.obj.position.x - dest.x,
          dz = item.obj.position.z - dest.z;
        const gap = Math.hypot(dx, dz);
        const need = radius(item) + radius(other);
        if (gap >= need) continue;
        const ux = gap > 1e-4 ? dx / gap : 1,
          uz = gap > 1e-4 ? dz / gap : 0;
        item.obj.position.x = dest.x + ux * need;
        item.obj.position.z = dest.z + uz * need;
      }
    }
    // Fica em pé, mantendo só o giro em torno do eixo vertical.
    const yaw = new THREE.Euler().setFromQuaternion(item.obj.quaternion, 'YXZ').y;
    item.obj.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    physics.remove(item);
    if (item.id === 'glass') items.get('receiving-hand')!.obj.visible = false;
    hand.held = null;
    hand.trackedSpecial = false;
    hand.triggerItem = null;
    hand.motion = newMotion();
    hand.sampled = false;
    flow.visible = false;
    feedback(item.name + ' na bancada.');
    return true;
  }
  function tipIn(id: string) {
    return items.get(id)!.obj.worldToLocal(dest.copy(point));
  }
  function updateUtensil(hand: Hand) {
    const spoon = hand.held!.id === 'spoon';
    const { glass, shaker } = session.state;
    point.set(0, spoon ? 0.079 : -0.1, 0);
    hand.held!.obj.localToWorld(point);
    if (spoon && !spoonLoaded) {
      const jar = tipIn('sugar');
      if (Math.hypot(jar.x, jar.z) < 0.084 && jar.y >= 0 && jar.y <= 0.097) {
        loadSpoon(true);
        feedback('Colher com uma porção de açúcar.');
      }
    }
    const { rim, bottom, radius: inner } = glassShape(glass.type);
    const radius = inner + GESTURE_SLACK;
    const tip = tipIn('glass');
    const aligned = Math.hypot(tip.x, tip.z) < radius && tip.y >= bottom;
    const inside = aligned && tip.y <= rim;
    if (!spoon) {
      const ready = glass.ingredients.lime && glass.ingredients.sugar && !glass.muddled;
      if (muddleStep(hand.motion, tip.y, rim, ready && aligned && tip.y < rim + 0.16)) act({ type: 'muddle' });
      return;
    }
    if (spoonLoaded) {
      stirStep(hand.motion, tip, false);
      const shakerTip = tipIn('shaker');
      const inShaker =
        !shaker.closed && Math.hypot(shakerTip.x, shakerTip.z) < 0.067 && shakerTip.y >= -0.11 && shakerTip.y <= 0.112;
      if (inside || inShaker) {
        const result = act({ type: 'add', ingredient: 'sugar', target: inside ? 'glass' : 'shaker' });
        if (result.ok) loadSpoon(false);
      }
      return;
    }
    if (stirStep(hand.motion, tip, inside && !glass.stirred && Object.keys(glass.ingredients).length > 0))
      act({ type: 'stir' });
  }
  function updateHand(hand: Hand, dt: number) {
    const item = hand.held;
    if (!item) return;
    if (item.id === 'spoon' || item.id === 'pestle') return updateUtensil(hand);
    const kind = kindOf(item.id);
    const isShaker = item.id === 'shaker';
    if (kind === 'liquid' || isShaker) {
      const { glass, shaker } = session.state;
      const mouth = isShaker ? 0.112 : item.mouth ?? 0.135;
      const ready =
        !isShaker ||
        (!shaker.closed && Object.keys(shaker.ingredients).length > 0 && Object.keys(glass.ingredients).length === 0);
      const target = ready ? closeTarget(hand, isShaker ? ['glass'] : ['glass', 'shaker'], mouth, 0.135) : null;
      axis.set(0, 1, 0).applyQuaternion(item.obj.quaternion);
      if (pourStep(hand.motion, target?.id || null, axis.y, dt)) {
        act(isShaker ? { type: 'transfer' } : { type: 'add', ingredient: item.id, target: target!.id });
      }
      if (target && axis.y <= 0.1 && !hand.motion.poured) {
        point.set(0, mouth, 0);
        item.obj.localToWorld(point);
        root.worldToLocal(point);
        dest.set(0, target.id === 'glass' ? glassShape(glass.type).rim : 0.112, 0);
        target.obj.localToWorld(dest);
        root.worldToLocal(dest);
        delta.subVectors(dest, point);
        flow.position.copy(point).addScaledVector(delta, 0.5);
        flow.scale.y = delta.length();
        if (flow.scale.y > 0.001) {
          flow.quaternion.setFromUnitVectors(axis.set(0, 1, 0), delta.normalize());
          flow.visible = true;
        }
      }
    }
    if (isShaker) {
      item.obj.getWorldPosition(point);
      delta.subVectors(point, hand.previous);
      hand.previous.copy(point);
      if (session.state.shaker.closed && !session.state.shaker.shaken) {
        if (shakeStep(hand.motion, delta.x, delta.y, delta.z, dt)) act({ type: 'shake' });
      } else resetShake(hand.motion);
    }
  }

  // ---- Mouse e teclado ----
  function capture(event: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, (-(event.clientY - r.top) / r.height) * 2 + 1);
    activeCanvas = true;
  }
  canvas.addEventListener(
    'pointermove',
    (e) => {
      capture(e);
      if (down && Math.hypot(down.x - e.clientX, down.y - e.clientY) > 6) down.dragged = true;
    },
    listeners,
  );
  canvas.addEventListener('pointerleave', () => (activeCanvas = false), listeners);
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return;
      capture(e);
      down = { x: e.clientX, y: e.clientY, dragged: false };
    },
    listeners,
  );
  canvas.addEventListener(
    'pointerup',
    (e) => {
      if (e.button !== 0 || !down || immersed()) return;
      const dragged = down.dragged || Math.hypot(down.x - e.clientX, down.y - e.clientY) > 6;
      down = null;
      capture(e);
      if (dragged) return;
      const target = underMouse();
      if (desktop.held) operate(desktop, target, true);
      else operate(desktop, target);
    },
    listeners,
  );
  canvas.addEventListener('pointercancel', () => (down = null), listeners);
  window.addEventListener(
    'keydown',
    (e) => {
      const tag = (e.target as HTMLElement)?.tagName ?? '';
      if (immersed() || !['KeyE', 'KeyQ'].includes(e.code) || e.repeat || !activeCanvas || /INPUT|TEXTAREA|SELECT/.test(tag))
        return;
      e.preventDefault();
      if (e.code === 'KeyQ') {
        if (desktop.held && live()) {
          desktop.el.getWorldQuaternion(quaternion);
          axis.set(0, 0.16, -1).applyQuaternion(quaternion).multiplyScalar(3.6);
          throwItem(desktop, axis, delta.set(-3, 0, 0).applyQuaternion(quaternion));
        }
      } else operate(desktop, underMouse());
    },
    listeners,
  );

  // ---- Mãos no Quest ----
  for (const side of ['left', 'right'] as const) {
    const el = group(scene);
    el.name = 'hand-' + side;
    const palm = sphere(el, [0, 0, 0], 0.04, '#bf9970');
    palm.scale.set(0.88, 0.58, 1.2);
    const thumb = sphere(el, [side === 'left' ? 0.031 : -0.031, 0, -0.015], 0.017, '#bf9970');
    thumb.scale.z = 1.4;
    const aim = group(scene);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.025), new THREE.Vector3(0, 0, -1.2)]),
      new THREE.LineBasicMaterial({ color: '#efce92', transparent: true, opacity: 0.65 }),
    );
    aim.add(line);
    el.visible = aim.visible = false;
    const hand: Hand = {
      side, el, aim, source: null, held: null, motion: newMotion(), previous: vec(),
      velocity: vec(), spin: vec(), lastPos: vec(), lastRot: new THREE.Quaternion(), cursor: cursors[hands.length],
    };
    hands.push(hand);
    allHolders.push(hand);
  }
  let xrSession: XRSession | null = null;
  let xrEvents: AbortController | undefined;
  function input(event: XRInputSourceEvent) {
    const hand = hands.find((h) => h.side === event.inputSource.handedness);
    if (!hand?.el.visible) return;
    const grip = event.type.startsWith('squeeze');
    setButton(hand, grip ? 'grip' : 'select', event.type.endsWith('start'));
  }
  function setButton(hand: Hand, button: 'grip' | 'select', pressed: boolean) {
    const key = button === 'grip' ? 'gripPressed' : 'selectPressed';
    if (Boolean(hand[key]) === pressed) return;
    hand[key] = pressed;
    if (button === 'grip') useHand(hand, pressed ? 'squeezestart' : 'squeezeend');
    else if (pressed) useHand(hand, 'selectstart');
    else if (hand.triggerItem && hand.held === hand.triggerItem) drop(hand);
    if (button === 'select' && !pressed) hand.triggerItem = null;
  }
  function useHand(hand: Hand, type: string) {
    if (type === 'squeezeend') return drop(hand);
    const target = front(hand);
    if (type === 'squeezestart') {
      if (!hand.held && target?.id === 'drawer') activate(target.id);
      else if (!hand.held) pick(hand, target);
    } else if (hand.source?.hand) {
      // Pinça para pegar; depois pinça num alvo para usar ou no vazio para soltar.
      if (!hand.held && (target?.held || target?.id.startsWith('bin-') || target?.id.startsWith('choose-'))) pick(hand, target);
      else if (hand.held && (!target || hand.held.id === 'lid' || hand.held.stow || kindOf(hand.held.id) === 'solid')) drop(hand);
      else operate(hand, target);
    } else if (!hand.held && (target?.held || target?.id.startsWith('bin-') || target?.id.startsWith('choose-'))) {
      pick(hand, target);
      hand.triggerItem = hand.held;
    } else operate(hand, target);
  }
  function setSession(next: XRSession | null) {
    if (next === xrSession) return;
    xrEvents?.abort();
    xrSession = next;
    for (const hand of hands) {
      resetItem(hand);
      hand.source = null;
      hand.el.visible = hand.aim.visible = false;
    }
    if (!next) return;
    xrEvents = new AbortController();
    for (const type of ['squeezestart', 'squeezeend', 'selectstart', 'selectend'] as const)
      next.addEventListener(type, input as EventListener, { signal: xrEvents.signal });
  }
  function poseObject(obj: THREE.Object3D, pose: XRPose) {
    const { position, orientation } = pose.transform;
    obj.position.set(position.x, position.y, position.z);
    obj.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
    obj.updateMatrixWorld(true);
  }
  function trackHands(dt: number, frame: XRFrame | undefined) {
    setSession(gl.xr.getSession());
    if (!xrSession) return;
    const reference = gl.xr.getReferenceSpace();
    if (!frame || !reference) return;
    const primary = Array.from(xrSession.inputSources);
    const tracked = (xrSession as XRSession & { trackedSources?: XRInputSourceArray }).trackedSources;
    const sources = new Set<XRInputSource>([...primary, ...(tracked ? Array.from(tracked) : [])]);
    for (const hand of hands) {
      let source: XRInputSource | null = null,
        pose: XRPose | undefined,
        rayPose: XRPose | undefined;
      let best = -1;
      for (const candidate of sources) {
        if (candidate.handedness !== hand.side) continue;
        const wrist = candidate.hand?.get('wrist');
        const rayP = candidate.targetRaySpace && frame.getPose(candidate.targetRaySpace, reference);
        const grip = candidate.gripSpace && frame.getPose(candidate.gripSpace, reference);
        const joint = wrist && frame.getJointPose?.(wrist, reference);
        const trackedPose = grip || joint || rayP;
        if (!trackedPose) continue;
        const pressed = candidate.gamepad?.buttons?.some((b) => b.pressed || b.value > 0.65);
        const score =
          (candidate === hand.source && hand.held ? 8 : 0) +
          (pressed ? 4 : 0) +
          (primary.includes(candidate) ? 2 : 0) +
          (candidate === hand.source ? 1 : 0);
        if (score <= best) continue;
        best = score;
        source = candidate;
        pose = trackedPose;
        rayPose = rayP || trackedPose;
      }
      if (!source && hand.source && sources.has(hand.source)) source = hand.source;
      if (source !== hand.source) {
        if (!(hand.source && sources.has(hand.source)) && !source) resetItem(hand);
        hand.source = source;
        hand.sampled = false;
        hand.rawGrip = hand.rawSelect = undefined;
        if (!hand.held) hand.gripPressed = hand.selectPressed = false;
      }
      hand.el.visible = hand.aim.visible = Boolean(pose);
      if (!pose) {
        hand.sampled = false;
        hand.velocity.set(0, 0, 0);
        hand.spin.set(0, 0, 0);
        if (hand.held) hand.motion = newMotion();
        continue;
      }
      poseObject(hand.el, pose);
      poseObject(hand.aim, rayPose!);
      if (hand.held) {
        follow(hand);
        sampleRelease(hand, dt);
      }
    }
    // Compara as bordas dos botões independentemente dos eventos nativos: uma amostra
    // parada nunca solta um grip vindo de evento, e um início duplicado dispara uma vez.
    for (const hand of hands) {
      if (!hand.el.visible || !hand.source) continue;
      const source = hand.source;
      const buttons = source.gamepad?.buttons;
      const read = (button: GamepadButton | undefined, isDown?: boolean) =>
        button ? button.pressed || button.value > (isDown ? 0.35 : 0.65) : undefined;
      const grip = read(buttons?.[1], hand.gripPressed);
      let select = read(buttons?.[0], hand.selectPressed);
      if (source.hand) {
        const tip = (name: XRHandJoint) => {
          const joint = source.hand!.get(name);
          return joint && frame.getJointPose?.(joint, reference)?.transform.position;
        };
        const index = tip('index-finger-tip'),
          thumb = tip('thumb-tip');
        if (index && thumb)
          select =
            Boolean(select) ||
            Math.hypot(index.x - thumb.x, index.y - thumb.y, index.z - thumb.z) < (hand.selectPressed ? 0.032 : 0.022);
      }
      if (grip !== undefined && grip !== Boolean(hand.rawGrip)) setButton(hand, 'grip', grip);
      if (select !== undefined && select !== Boolean(hand.rawSelect)) setButton(hand, 'select', select);
      hand.rawGrip = grip;
      hand.rawSelect = select;
    }
  }
  function resetInput() {
    releaseAll();
    activeCanvas = false;
    down = null;
  }
  window.addEventListener('blur', resetInput, listeners);

  function frame(time: number, dt: number, xrFrame?: XRFrame) {
    const immersive = immersed();
    if (immersive !== wasImmersed) {
      wasImmersed = immersive;
      resetInput();
    }
    desktop.el = o.camera();
    flow.visible = false;
    if (!session.state.paused) o.tickEnvironment(dt);
    if (live()) physics.step(dt);
    if (immersive) {
      trackHands(dt, xrFrame);
      const refresh = time - lastHover > 70;
      for (const hand of hands) {
        if (refresh) mark(hand.el.visible ? front(hand) : null, hand.cursor);
        if (hand.el.visible && live()) updateHand(hand, dt);
      }
      if (refresh) lastHover = time;
    } else {
      setSession(null);
      if (desktop.held) follow(desktop);
      if (time - lastHover > 80) {
        mark(underMouse(), cursors[1]);
        lastHover = time;
      }
    }
    o.updateVesselPanels(allHolders);
  }

  return {
    frame,
    /** Estado das mãos para diagnóstico nos ensaios. */
    debugHands: () =>
      hands.map((h) => ({ side: h.side, visible: h.el.visible, held: h.held?.id ?? null, speed: h.velocity.length(), motion: { ...h.motion }, pos: h.el.position.toArray() })),
    releaseAll,
    restoreThrown,
    /** Troca as mãos de bloco pela mão de porcelana (estilo Máscara): dedos para a frente,
     *  palma voltada para dentro, punho da manga para trás. A esquerda é o espelho da direita. */
    dressHands(model: THREE.Object3D | null) {
      if (!model) return;
      for (const hand of hands) {
        for (const child of [...hand.el.children]) hand.el.remove(child);
        const copy = model.clone();
        const left = hand.side === 'left';
        copy.scale.set(left ? -1 : 1, 1, 1);
        copy.rotation.set(0, Math.PI, left ? -Math.PI / 2 : Math.PI / 2, 'YXZ');
        copy.traverse((o) => (o.raycast = () => {}));
        hand.el.add(copy);
      }
    },
    /** Novo cliente: o copo volta à bancada (fica invisível até ser pego na estante). */
    moveDrawer: physics.moveDrawer,
    clearGlass() {
      const glass = items.get('glass')!;
      physics.remove(glass);
      glass.obj.position.copy(glass.home);
      glass.obj.quaternion.identity();
    },
    releaseLid() {
      physics.remove(items.get('lid')!);
      const holder = holders().find((hand) => hand.held?.id === 'lid');
      if (holder) resetItem(holder);
    },
    releaseUnavailable(collected: string | null) {
      for (const item of [...physics.bodies.keys()]) {
        if (item.thrownSpecial && item.id !== collected) {
          physics.remove(item);
          item.obj.visible = false;
        }
      }
      for (const holder of holders()) {
        if (holder.trackedSpecial && holder.held?.id !== collected) resetItem(holder);
      }
    },
    destroy() {
      resetInput();
      events.abort();
      setSession(null);
      for (const hand of hands) {
        hand.el.removeFromParent();
        hand.aim.removeFromParent();
      }
    },
  };
}
