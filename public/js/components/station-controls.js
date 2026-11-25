import { INGREDIENTS } from '../domain/game.js';
import { entity, group, sphere } from '../scene/blockout.js';
import { newMotion, pourStep, resetShake, shakeStep, stirStep, muddleStep } from './motion.js?v=utensil-gestures';
import { throwPhysics } from './throw-physics.js';

function installTicker() {
  if (AFRAME.components['station-input']) return;
  AFRAME.registerComponent('station-input', {
    tick(time, dt) {
      this.el.stationFrame?.(time, dt);
    },
  });
}

export function bindControls({
  scene,
  rig,
  head,
  root,
  items,
  flow,
  cursors,
  act,
  activate,
  feedback,
  session,
  collectSource,
  tickEnvironment,
  updateVesselPanels,
  onInteraction,
}) {
  installTicker();
  const THREE = AFRAME.THREE;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const vec = () => new THREE.Vector3();
  const here = vec(),
    point = vec(),
    dest = vec(),
    delta = vec(),
    axis = vec();
  const quaternion = new THREE.Quaternion();
  const roots = [...items.values()].map((item) => item.el.object3D);
  const lookup = new Map([...items.values()].map((item) => [item.el.object3D, item]));
  const hands = [],
    events = new AbortController(),
    listeners = { signal: events.signal };
  const canvas = scene.canvas;
  const portions = new Set(['lime', 'ice', 'mint']);
  const portionAtRest = new Map([...portions].map(id => [id, items.get(id).el.object3D.visible]));
  const bottles = [...items.values()].filter(item => INGREDIENTS[item.id]?.kind === 'liquid');
  const physics = throwPhysics(root, bottles, item => holders().some(hand => hand.held === item));
  const change = new THREE.Quaternion();
  const sugarDose = items.get('spoon').el.querySelector('[data-sugar-dose]');
  let spoonLoaded = false;
  function loadSpoon(loaded) {
    spoonLoaded = loaded;
    if (sugarDose) sugarDose.object3D.visible = loaded;
  }
  loadSpoon(false);
  const desktop = { el: head, held: null, motion: newMotion(), previous: vec(), isMouse: true };
  let activeCanvas = false,
    down = null,
    lastHover = 0;
  const live = () => session.state.phase === 'playing' && !session.state.paused;
  const immersed = () => scene.is('vr-mode') && Boolean(scene.renderer?.xr?.isPresenting);

  function fromRay(hand) {
    const hits = ray.intersectObjects(roots, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && obj.visible && !lookup.has(obj)) obj = obj.parent;
      const item = lookup.get(obj);
      if (item && item.el.object3D.visible && canTarget(hand, item)) return item;
    }
    return null;
  }
  function underMouse() {
    if (!activeCanvas || immersed()) return null;
    ray.near = 0.02;
    ray.far = 6;
    ray.setFromCamera(pointer, scene.camera);
    return fromRay();
  }
  function canTarget(hand, item) {
    const owner = holders().find(h => h.held === item);
    return !owner || (owner !== hand && hand?.held && ['glass', 'shaker'].includes(item.id));
  }
  function front(hand) {
    if (hand.held?.id === 'spoon') {
      const nearby = closeTarget(hand, ['sugar', 'glass', 'shaker'], 0.079, 0.09);
      if (nearby) return nearby;
    }
    hand.el.object3D.getWorldPosition(here);
    let result = null,
      distance = 0.135;
    for (const item of items.values()) {
      if (!item.el.object3D.visible || item.id.startsWith('slot-') || !canTarget(hand, item)) continue;
      item.el.object3D.getWorldPosition(point);
      const d = here.distanceTo(point);
      if (d < distance) {
        result = item;
        distance = d;
      }
    }
    if (result) return result;
    hand.aim.object3D.getWorldPosition(here);
    axis.set(0, 0, -1).applyQuaternion(hand.aim.object3D.getWorldQuaternion(quaternion));
    ray.near = 0.01;
    ray.far = 6;
    ray.set(here, axis);
    return fromRay(hand);
  }
  const allHolders = [desktop];
  function holders() {
    return allHolders;
  }
  function resetItem(holder) {
    const item = holder.held;
    if (!item) return;
    item.el.object3D.position.copy(item.home);
    if (item.homeQuaternion) item.el.object3D.quaternion.copy(item.homeQuaternion);
    else item.el.object3D.quaternion.identity();
    if (portions.has(item.id)) item.el.object3D.visible = portionAtRest.get(item.id);
    if (item.id === 'spoon') loadSpoon(false);
    if (item.id === 'glass') items.get('receiving-hand').el.object3D.visible = false;
    if (INGREDIENTS[item.id]?.special) item.el.object3D.visible = false;
    holder.trackedSpecial = false;
    holder.triggerItem = null;
    holder.held = null;
    holder.motion = newMotion();
    flow.object3D.visible = false;
  }
  function releaseAll() {
    for (const holder of holders()) resetItem(holder);
    for (const cursor of cursors) cursor.object3D.visible = false;
  }
  function restoreThrown() {
    for (const item of physics.bodies.keys()) {
      physics.remove(item);
      item.el.object3D.position.copy(item.home);
      item.el.object3D.quaternion.copy(item.homeQuaternion ?? quaternion.identity());
      if (portions.has(item.id)) item.el.object3D.visible = portionAtRest.get(item.id);
      if (INGREDIENTS[item.id]?.special) item.el.object3D.visible = false;
    }
  }
  function pick(holder, item) {
    const source = item?.id.startsWith('event-') ? item : null;
    if (source) item = items.get(source.id.slice(6));
    if (item?.id.startsWith('bin-')) item = items.get(item.id.slice(4));
    if (item?.id === 'sugar') {
      feedback('Pegue a colher para retirar o açúcar.');
      return;
    }
    if (!item?.held || holders().some((h) => h.held === item)) return;
    if (session.state.phase === 'menu') act({ type: 'start' });
    if (!live()) {
      feedback(session.state.paused ? 'Turno pausado. Selecione Retomar para usar o balcão.' : 'Reinicie o turno para usar o balcão.');
      return;
    }
    if (item.id === 'lid' && session.state.shaker.closed) act({ type: 'toggleLid' });
    if (source) {
      if (!source.el.object3D.visible) return;
      const event = session.state.event;
      if (event?.ingredient === item.id && event.status === 'available') {
        act({ type: 'collect', ingredient: item.id });
      } else {
        collectSource(item.id);
      }
      holder.trackedSpecial = event?.ingredient === item.id && event.status === 'collected';
      item.el.object3D.visible = true;
    }
    if (!source && physics.bodies.has(item)) holder.trackedSpecial = Boolean(item.thrownSpecial);
    physics.remove(item);
    holder.sampled = false;
    holder.velocity?.set(0, 0, 0);
    holder.spin?.set(0, 0, 0);
    onInteraction();
    holder.held = item;
    if (portions.has(item.id)) item.el.object3D.visible = true;
    if (item.id === 'glass') items.get('receiving-hand').el.object3D.visible = true;
    holder.motion = newMotion();
    follow(holder);
    item.el.object3D.getWorldPosition(holder.previous);
    feedback(item.id === 'glass' ? 'Copo em mãos. Entregue ao cliente ou leve à pia.' : item.name + ' em mãos.');
  }
  function follow(holder) {
    const anchor = holder.el.object3D;
    point.set(...(holder.isMouse ? [0.18, -0.2, -0.43] : [0, 0, -0.045]));
    anchor.localToWorld(point);
    root.object3D.worldToLocal(point);
    holder.held.el.object3D.position.copy(point);
    anchor.getWorldQuaternion(quaternion);
    holder.held.el.object3D.quaternion.copy(quaternion);
    if (!holder.isMouse && holder.held.id === 'spoon') holder.held.el.object3D.rotateX(Math.PI);
    holder.held.el.object3D.updateMatrixWorld(true);
  }
  function mark(item, cursorRing) {
    cursorRing.object3D.visible = Boolean(item);
    if (!item) return;
    item.el.object3D.getWorldPosition(cursorRing.object3D.position);
    root.object3D.worldToLocal(cursorRing.object3D.position);
    if (item.held) cursorRing.object3D.position.y -= 0.035;
    else cursorRing.object3D.position.z += 0.015;
    cursorRing.object3D.rotation.x = item.held || ['sink', 'tray'].includes(item.id) ? -Math.PI / 2 : 0;
  }
  function operate(holder, target, release = false) {
    onInteraction();
    const item = holder.held;
    // Signage and pause controls also work before the first order and while paused.
    if (!item) {
      if (target?.id.startsWith('event-')) return pick(holder, target);
      if (target && activate(target.id)) return;
      if (holder.isMouse && !release && target) pick(holder, target);
      return;
    }
    if (!live()) return;
    const id = item.id;
    const container = target?.id === 'glass' || target?.id === 'shaker' ? target.id : null;
    if (id === 'lid') {
      if (!release) return;
      resetItem(holder);
      if (container === 'shaker' && !session.state.shaker.closed) act({ type: 'toggleLid' });
      return;
    }
    if (INGREDIENTS[id]?.kind === 'liquid') {
      if (holder.isMouse && target?.id === 'slot-' + id) {
        resetItem(holder);
        feedback(item.name + ' no seu lugar.');
      } else if (holder.isMouse && container) {
        act({ type: 'add', ingredient: id, target: container });
      } else if (target?.id === 'pause' || target?.id === 'height') {
        activate(target.id);
      } else {
        feedback(holder.isMouse ? 'Clique no recipiente para dosar ou na base desta garrafa para guardá-la.' :
          'Incline a garrafa perto da boca do recipiente para despejar.');
      }
      return;
    }
    if (!holder.isMouse && !release && (id === 'spoon' || id === 'pestle') &&
        (container || target?.id === 'sugar')) return;
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
    if (INGREDIENTS[id] && container) {
      if (!release && !holder.isMouse) {
        feedback('Solte o ingrediente sobre o recipiente.');
      } else {
        act({ type: 'add', ingredient: id, target: container });
      }
    } else if (release && holder.trackedSpecial) {
      act({ type: 'discardSpecial' });
    } else if (id === 'spoon' && container === 'glass') act({ type: 'stir' });
    else if (id === 'pestle' && container === 'glass') act({ type: 'muddle' });
    else if (id === 'shaker' && container === 'glass') act({ type: 'transfer' });
    else if (id === 'glass' && ['customer', 'receiving-hand', 'tray'].includes(target?.id)) {
      if (act({ type: 'deliver' }).ok) resetItem(holder);
    }
    else if ((id === 'glass' || id === 'shaker') && target?.id === 'sink')
      act({ type: 'rinse', target: id });
    else if (id === 'shaker' && !release && session.state.shaker.closed) act({ type: 'shake' });
    else if (!release && target && activate(target.id)) return;
    else if (!release) feedback('Aponte para o recipiente, a pia ou a bandeja.');
    if (release || (holder.isMouse && INGREDIENTS[id])) resetItem(holder);
  }
  function sampleRelease(hand, dt) {
    const obj = hand.held.el.object3D;
    if (hand.sampled && dt > 0 && dt <= 100) {
      const blend = 1 - Math.exp(-dt / 30);
      delta.subVectors(obj.position, hand.lastPos).multiplyScalar(1000 / dt);
      hand.velocity.lerp(delta.clampLength(0, 8), blend);
      change.copy(hand.lastRot).invert().premultiply(obj.quaternion);
      const length = Math.hypot(change.x, change.y, change.z);
      const angle = 2 * Math.atan2(length, Math.abs(change.w));
      delta.set(change.x, change.y, change.z).multiplyScalar(length ? Math.sign(change.w || 1) * angle * 1000 / (length * dt) : 0);
      hand.spin.lerp(delta.clampLength(0, 25), blend);
    } else {
      hand.velocity.set(0, 0, 0);
      hand.spin.set(0, 0, 0);
    }
    hand.lastPos.copy(obj.position);
    hand.lastRot.copy(obj.quaternion);
    hand.sampled = true;
  }
  function throwItem(holder, velocity, spin) {
    const item = holder.held;
    physics.launch(item, session.state, velocity, spin);
    if (item.id === 'glass') items.get('receiving-hand').el.object3D.visible = false;
    item.thrownSpecial = holder.trackedSpecial;
    holder.trackedSpecial = false;
    holder.triggerItem = null;
    holder.held = null;
    holder.sampled = false;
    flow.object3D.visible = false;
  }
  function closeTarget(holder, ids, offset = 0, radius = 0.145) {
    point.set(0, offset, 0);
    holder.held.el.object3D.localToWorld(point);
    let result = null,
      closest = radius;
    for (const id of ids) {
      const item = items.get(id);
      if (!item?.el.object3D.visible) continue;
      dest.set(0, id === 'glass' ? 0.082 : id === 'shaker' ? 0.112 : 0, 0);
      item.el.object3D.localToWorld(dest);
      const d = dest.distanceTo(point);
      if (d < closest) {
        result = item;
        closest = d;
      }
    }
    return result;
  }
  function drop(hand) {
    if (!hand.held) return;
    follow(hand);
    const id = hand.held.id;
    let target;
    if (id === 'lid') target = closeTarget(hand, ['shaker'], -0.03, 0.085);
    else if (INGREDIENTS[id]?.kind === 'solid') target = closeTarget(hand, ['glass', 'shaker']);
    else if (id === 'glass') target = closeTarget(hand, ['receiving-hand', 'tray', 'sink'], 0, 0.19);
    else if (id === 'shaker') target = closeTarget(hand, ['sink'], 0, 0.19);
    if (target) operate(hand, target, true);
    else throwItem(hand, hand.velocity, hand.spin);
  }
  function tipIn(id) {
    return items.get(id).el.object3D.worldToLocal(dest.copy(point));
  }
  function updateUtensil(hand) {
    const spoon = hand.held.id === 'spoon';
    const { glass, shaker } = session.state;
    point.set(0, spoon ? 0.079 : -0.10, 0);
    hand.held.el.object3D.localToWorld(point);
    if (spoon && !spoonLoaded) {
      const jar = tipIn('sugar');
      if (Math.hypot(jar.x, jar.z) < 0.084 && jar.y >= 0 && jar.y <= 0.097) {
        loadSpoon(true);
        feedback('Colher com uma porção de açúcar.');
      }
    }
    const rim = glass.type === 'rocks' ? 0.03 : 0.082;
    const radius = { highball: 0.048, rocks: 0.068, mug: 0.068, coupe: 0.081 }[glass.type];
    const bottom = glass.type === 'coupe' ? 0.016 : -0.082;
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
      const inShaker = !shaker.closed && Math.hypot(shakerTip.x, shakerTip.z) < 0.067 &&
        shakerTip.y >= -0.11 && shakerTip.y <= 0.112;
      if (inside || inShaker) {
        const result = act({ type: 'add', ingredient: 'sugar', target: inside ? 'glass' : 'shaker' });
        if (result.ok) loadSpoon(false);
      }
      return;
    }
    if (stirStep(hand.motion, tip, inside && !glass.stirred && Object.keys(glass.ingredients).length > 0))
      act({ type: 'stir' });
  }
  function updateHand(hand, dt) {
    const item = hand.held;
    if (!item) return;
    if (item.id === 'spoon' || item.id === 'pestle') return updateUtensil(hand);
    const kind = INGREDIENTS[item.id]?.kind;
    const isShaker = item.id === 'shaker';
    if (kind === 'liquid' || isShaker) {
      const { glass, shaker } = session.state;
      const mouth = isShaker ? 0.112 : 0.135;
      const ready = !isShaker || (!shaker.closed && Object.keys(shaker.ingredients).length > 0 &&
        Object.keys(glass.ingredients).length === 0);
      const target = ready ? closeTarget(hand, isShaker ? ['glass'] : ['glass', 'shaker'], mouth, 0.135) : null;
      axis.set(0, 1, 0).applyQuaternion(item.el.object3D.quaternion);
      if (pourStep(hand.motion, target?.id || null, axis.y, dt)) {
        act(isShaker ? { type: 'transfer' } : { type: 'add', ingredient: item.id, target: target.id });
      }
      if (target && axis.y <= 0.1 && !hand.motion.poured) {
        point.set(0, mouth, 0);
        item.el.object3D.localToWorld(point);
        root.object3D.worldToLocal(point);
        dest.set(0, target.id === 'glass' ? 0.082 : 0.112, 0);
        target.el.object3D.localToWorld(dest);
        root.object3D.worldToLocal(dest);
        delta.subVectors(dest, point);
        flow.object3D.position.copy(point).addScaledVector(delta, 0.5);
        flow.object3D.scale.y = delta.length();
        if (flow.object3D.scale.y > 0.001) {
          flow.object3D.quaternion.setFromUnitVectors(axis.set(0, 1, 0), delta.normalize());
          flow.object3D.visible = true;
        }
      }
    }
    if (item.id === 'shaker') {
      item.el.object3D.getWorldPosition(point);
      delta.subVectors(point, hand.previous);
      hand.previous.copy(point);
      if (session.state.shaker.closed && !session.state.shaker.shaken) {
        if (shakeStep(hand.motion, delta.x, delta.y, delta.z, dt)) act({ type: 'shake' });
      } else resetShake(hand.motion);
    }
  }
  function capture(event) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    activeCanvas = true;
  }
  canvas.addEventListener('pointermove', e => {
    capture(e);
    if (down && Math.hypot(down.x - e.clientX, down.y - e.clientY) > 6) down.dragged = true;
  }, listeners);
  canvas.addEventListener(
    'pointerleave',
    () => {
      activeCanvas = false;
    },
    listeners,
  );
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
  canvas.addEventListener(
    'pointercancel',
    () => {
      down = null;
    },
    listeners,
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        immersed() ||
        !['KeyE', 'KeyQ'].includes(e.code) ||
        e.repeat ||
        !activeCanvas ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      e.preventDefault();
      if (e.code === 'KeyQ') {
        if (desktop.held && live()) {
          head.object3D.getWorldQuaternion(quaternion);
          axis.set(0, 0.16, -1).applyQuaternion(quaternion).multiplyScalar(3.6);
          throwItem(desktop, axis, delta.set(-3, 0, 0).applyQuaternion(quaternion));
        }
      } else operate(desktop, underMouse());
    },
    listeners,
  );
  for (const side of ['left', 'right']) {
    const el = group(rig, [0, 0, 0]);
    el.dataset.stationHand = side;
    const palm = sphere(el, [0, 0, 0], 0.04, '#bf9970');
    palm.object3D.scale.set(0.88, 0.58, 1.2);
    const thumb = sphere(el, [side === 'left' ? 0.031 : -0.031, 0, -0.015], 0.017, '#bf9970');
    thumb.object3D.scale.z = 1.4;
    const aim = group(rig, [0, 0, 0]);
    entity(aim, 'a-entity', {
      line: { start: '0 0 -.025', end: '0 0 -1.2', color: '#efce92', opacity: 0.65 },
    });
    el.object3D.visible = aim.object3D.visible = false;
    const hand = { side, el, aim, source: null, held: null, motion: newMotion(), previous: vec() };
    Object.assign(hand, { velocity: vec(), spin: vec(), lastPos: vec(), lastRot: new THREE.Quaternion() });
    hand.cursor = cursors[hands.length];
    hands.push(hand);
    allHolders.push(hand);
  }
  let xrSession = null;
  let xrEvents;
  function grab(hand, target) {
    pick(hand, target);
  }
  function input(event) {
    const hand = hands.find(h => h.side === event.inputSource.handedness);
    if (!hand?.el.object3D.visible) return;
    const grip = event.type.startsWith('squeeze');
    setButton(hand, grip ? 'grip' : 'select', event.type.endsWith('start'));
  }
  function setButton(hand, button, pressed) {
    const key = button === 'grip' ? 'gripPressed' : 'selectPressed';
    if (Boolean(hand[key]) === pressed) return;
    hand[key] = pressed;
    if (button === 'grip') useHand(hand, pressed ? 'squeezestart' : 'squeezeend');
    else if (pressed) useHand(hand, 'selectstart');
    else if (hand.triggerItem && hand.held === hand.triggerItem) drop(hand);
    if (button === 'select' && !pressed) hand.triggerItem = null;
  }
  function useHand(hand, type) {
    if (type === 'squeezeend') return drop(hand);
    const target = front(hand);
    if (type === 'squeezestart') {
      if (!hand.held) grab(hand, target);
    } else if (hand.source.hand) {
      // Pinch once to pick up, then pinch a target to use or an empty spot to release.
      if (!hand.held && (target?.held || target?.id.startsWith('bin-'))) grab(hand, target);
      else if (hand.held && (!target || hand.held.id === 'lid' || INGREDIENTS[hand.held.id]?.kind === 'solid')) drop(hand);
      else operate(hand, target);
    } else if (!hand.held && (target?.held || target?.id.startsWith('bin-'))) {
      grab(hand, target);
      hand.triggerItem = hand.held;
    } else operate(hand, target);
  }
  function setSession(next) {
    if (next === xrSession) return;
    xrEvents?.abort();
    xrSession = next;
    for (const hand of hands) {
      resetItem(hand);
      hand.source = null;
      hand.el.object3D.visible = hand.aim.object3D.visible = false;
    }
    if (!next) return;
    xrEvents = new AbortController();
    for (const type of ['squeezestart', 'squeezeend', 'selectstart', 'selectend'])
      next.addEventListener(type, input, { signal: xrEvents.signal });
  }
  function poseObject(el, pose) {
    const { position, orientation } = pose.transform;
    el.object3D.position.copy(position);
    el.object3D.quaternion.copy(orientation);
    el.object3D.updateMatrixWorld(true);
  }
  function trackHands(dt) {
    const xr = scene.renderer.xr;
    setSession(xr.getSession());
    if (!xrSession) return;
    const reference = xr.getReferenceSpace();
    const frame = scene.frame;
    if (!frame || !reference) return;
    const primary = Array.from(xrSession.inputSources);
    const sources = new Set([...primary, ...(xrSession.trackedSources ?? [])]);
    for (const hand of hands) {
      let source = null, pose = null, rayPose = null;
      let best = -1;
      for (const candidate of sources) {
        if (candidate.handedness !== hand.side) continue;
        const wrist = candidate.hand?.get('wrist');
        const ray = candidate.targetRaySpace && frame.getPose(candidate.targetRaySpace, reference);
        const grip = candidate.gripSpace && frame.getPose(candidate.gripSpace, reference);
        const joint = wrist && frame.getJointPose?.(wrist, reference);
        const tracked = grip || joint || ray;
        if (!tracked) continue;
        const pressed = candidate.gamepad?.buttons?.some(b => b.pressed || b.value > 0.65);
        const score = (candidate === hand.source && hand.held ? 8 : 0) + (pressed ? 4 : 0) +
          (primary.includes(candidate) ? 2 : 0) + (candidate === hand.source ? 1 : 0);
        if (score <= best) continue;
        best = score;
        source = candidate;
        pose = tracked;
        rayPose = ray || tracked;
      }
      if (!source && sources.has(hand.source)) source = hand.source;
      if (source !== hand.source) {
        if (!sources.has(hand.source) && !source) resetItem(hand);
        hand.source = source;
        hand.sampled = false;
        hand.rawGrip = hand.rawSelect = undefined;
        if (!hand.held) hand.gripPressed = hand.selectPressed = false;
      }
      hand.el.object3D.visible = hand.aim.object3D.visible = Boolean(pose);
      if (!pose) {
        hand.sampled = false;
        hand.velocity.set(0, 0, 0);
        hand.spin.set(0, 0, 0);
        if (hand.held) hand.motion = newMotion();
        continue;
      }
      poseObject(hand.el, pose);
      poseObject(hand.aim, rayPose);
      if (hand.held) { follow(hand); sampleRelease(hand, dt); }
    }
    // Compare raw edges independently of native events. A stale idle sample must
    // never release an event-driven grip, and a duplicated start must fire only once.
    for (const hand of hands) {
      if (!hand.el.object3D.visible) continue;
      const source = hand.source;
      const buttons = source.gamepad?.buttons;
      const read = (button, down) => button && (button.pressed || button.value > (down ? 0.35 : 0.65));
      const grip = read(buttons?.[1], hand.gripPressed);
      let select = read(buttons?.[0], hand.selectPressed);
      if (source.hand) {
        const tip = name => {
          const joint = source.hand.get(name);
          return joint && frame.getJointPose?.(joint, reference)?.transform.position;
        };
        const index = tip('index-finger-tip'), thumb = tip('thumb-tip');
        if (index && thumb) select = Boolean(select) || Math.hypot(index.x - thumb.x, index.y - thumb.y, index.z - thumb.z) <
          (hand.selectPressed ? 0.032 : 0.022);
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
  scene.addEventListener('exit-vr', resetInput, listeners);
  scene.addEventListener('enter-vr', resetInput, listeners);
  window.addEventListener('blur', resetInput, listeners);
  root.stationFrame = (time, dt) => {
    flow.object3D.visible = false;
    if (!session.state.paused) tickEnvironment(dt);
    if (live()) physics.step(dt);
    if (immersed()) {
      trackHands(dt);
      const refresh = time - lastHover > 70;
      for (const hand of hands) {
        if (refresh) mark(hand.el.object3D.visible ? front(hand) : null, hand.cursor);
        if (hand.el.object3D.visible && live()) updateHand(hand, dt);
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
    updateVesselPanels(allHolders);
  };
  root.setAttribute('station-input', '');
  return {
    releaseAll,
    restoreThrown,
    releaseLid() {
      physics.remove(items.get('lid'));
      const holder = holders().find(hand => hand.held?.id === 'lid');
      if (holder) resetItem(holder);
    },
    releaseUnavailable(collected) {
      for (const item of physics.bodies.keys()) {
        if (item.thrownSpecial && item.id !== collected) {
          physics.remove(item);
          item.el.object3D.visible = false;
        }
      }
      for (const holder of holders()) {
        if (holder.trackedSpecial && holder.held?.id !== collected) resetItem(holder);
      }
    },
    destroy() {
      resetInput();
      events.abort();
      root.removeAttribute('station-input');
      delete root.stationFrame;
      setSession(null);
      for (const hand of hands) { hand.el.remove(); hand.aim.remove(); }
    },
  };
}
