// Arremesso com física Rapier. Porta do throw-physics (cannon-es) do protótipo:
// mesmas formas, massa, atrito, quique e amortecimento.
// Diferença: as patas articuladas dos insetos (ragdoll) ainda não foram portadas.
import RAPIER from '@dimforge/rapier3d-compat';
import type * as THREE from 'three';
import type { Item } from '../scene/types';

let ready: Promise<void> | null = null;
export function initPhysics() {
  ready ??= RAPIER.init();
  return ready;
}

const MASS = 0.25;
const FRICTION = 0.48;
const RESTITUTION = 0.19;

function colliders(id: string, state: any): RAPIER.ColliderDesc[] {
  const out: RAPIER.ColliderDesc[] = [];
  // Rapier usa cilindros retos; cones truncados viram cilindros de raio médio.
  const cylinder = (top: number, bottom: number, height: number, y = 0) =>
    out.push(RAPIER.ColliderDesc.cylinder(height / 2, (top + bottom) / 2).setTranslation(0, y, 0));
  if (id === 'spoon' || id === 'pestle') {
    const r = id === 'spoon' ? 0.01 : 0.023;
    cylinder(r, r, 0.17);
    out.push(RAPIER.ColliderDesc.ball(id === 'spoon' ? 0.025 : 0.04).setTranslation(0, id === 'spoon' ? 0.079 : -0.077, 0));
  } else if (id === 'glass') {
    const rocks = state.glass.type === 'rocks';
    const radius = ({ highball: 0.048, rocks: 0.068, coupe: 0.081, mug: 0.068 } as Record<string, number>)[state.glass.type];
    cylinder(radius, radius, rocks ? 0.112 : 0.164, rocks ? -0.026 : 0);
  } else if (id === 'shaker') {
    cylinder(0.067, 0.067, 0.22);
    if (state.shaker.closed) cylinder(0.033, 0.067, 0.06, 0.142);
  } else if (id === 'lid') cylinder(0.033, 0.067, 0.06);
  else if (id === 'lime') out.push(RAPIER.ColliderDesc.ball(0.043));
  else if (id === 'ice') out.push(RAPIER.ColliderDesc.cuboid(0.035, 0.035, 0.035));
  else if (['mint', 'cockroach', 'spider', 'slug_slime'].includes(id)) out.push(RAPIER.ColliderDesc.cuboid(0.032, 0.012, 0.042));
  else {
    cylinder(0.049, 0.049, 0.165, -0.012);
    cylinder(0.025, 0.025, 0.072, 0.099);
  }
  for (const c of out) c.setMass(MASS / out.length).setFriction(FRICTION).setRestitution(RESTITUTION);
  return out;
}

export function throwPhysics(root: THREE.Object3D, bottles: Item[], isHeld: (item: Item) => boolean) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 120;
  const bodies = new Map<Item, RAPIER.RigidBody>();
  let roomReady = false;
  let accumulator = 0;

  function makeBody(item: Item, state: any, sleeping = false) {
    const { position, quaternion } = item.obj;
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w })
      .setLinearDamping(0.05)
      .setAngularDamping(0.16)
      .setCcdEnabled(true)
      .setSleeping(sleeping);
    const body = world.createRigidBody(desc);
    for (const c of colliders(item.id, state)) world.createCollider(c, body);
    return body;
  }
  function remove(item: Item) {
    const body = bodies.get(item);
    if (body) world.removeRigidBody(body);
    bodies.delete(item);
  }
  function launch(item: Item, state: any, velocity: THREE.Vector3, spin: THREE.Vector3) {
    if (!roomReady) {
      // Paredes, prateleiras e bancadas usam a geometria real da cena (coordenadas da estação).
      for (const child of root.children) {
        const size = child.userData.box as [number, number, number] | undefined;
        if (!size) continue;
        const q = child.quaternion;
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed()
            .setTranslation(child.position.x, child.position.y, child.position.z)
            .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }),
        );
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setFriction(FRICTION).setRestitution(RESTITUTION),
          body,
        );
      }
      roomReady = true;
    }
    // Garrafas paradas acordam com o impacto; a que está numa mão segue o rastreamento.
    for (const bottle of bottles) {
      if (bottle === item || bodies.has(bottle) || isHeld(bottle)) continue;
      bodies.set(bottle, makeBody(bottle, state, true));
    }
    remove(item);
    const body = makeBody(item, state);
    body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    body.setAngvel({ x: spin.x, y: spin.y, z: spin.z }, true);
    bodies.set(item, body);
  }
  function step(dt: number) {
    if (!bodies.size || !(dt > 0)) return;
    accumulator += Math.min(dt, 80) / 1000;
    let steps = 0;
    while (accumulator >= world.timestep && steps < 10) {
      world.step();
      accumulator -= world.timestep;
      steps++;
    }
    if (steps === 10) accumulator = 0;
    for (const [item, body] of bodies) {
      const t = body.translation();
      const r = body.rotation();
      item.obj.position.set(t.x, t.y, t.z);
      item.obj.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
  return { launch, remove, step, bodies };
}
