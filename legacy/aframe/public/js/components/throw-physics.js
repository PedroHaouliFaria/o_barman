import { Body, Box, ConeTwistConstraint, Cylinder, Quaternion, Sphere, Vec3, World } from '../../vendor/cannon-es/cannon-es.js';

function makeBody(id, state) {
  const body = new Body({ mass: 0.25, linearDamping: 0.05, angularDamping: 0.16 });
  function cylinder(top, bottom, height, y = 0) {
    body.addShape(new Cylinder(top, bottom, height, 12), new Vec3(0, y, 0));
  }
  if (['pliers', 'tweezers', 'knife'].includes(id)) {
    body.addShape(new Box(new Vec3(id === 'tweezers' ? 0.077 : 0.105, 0.007, id === 'pliers' ? 0.029 : 0.016)));
  } else if (id === 'spoon' || id === 'pestle') {
    cylinder(id === 'spoon' ? 0.01 : 0.023, id === 'spoon' ? 0.01 : 0.023, 0.17);
    body.addShape(new Sphere(id === 'spoon' ? 0.025 : 0.04), new Vec3(0, id === 'spoon' ? 0.079 : -0.077, 0));
  } else if (id === 'glass') {
    const rocks = state.glass.type === 'rocks';
    const radius = { highball: 0.048, rocks: 0.068, coupe: 0.081, mug: 0.068 }[state.glass.type];
    cylinder(radius, radius, rocks ? 0.112 : 0.164, rocks ? -0.026 : 0);
  } else if (id === 'shaker') {
    cylinder(0.067, 0.067, 0.22);
    if (state.shaker.closed) cylinder(0.033, 0.067, 0.06, 0.142);
  } else if (id === 'lid') cylinder(0.033, 0.067, 0.06);
  else if (id === 'lime') body.addShape(new Sphere(0.043));
  else if (id === 'ice') body.addShape(new Box(new Vec3(0.035, 0.035, 0.035)));
  else if (['mint', 'cockroach', 'spider', 'slug_slime'].includes(id))
    body.addShape(new Box(new Vec3(0.032, 0.012, 0.042)));
  else {
    cylinder(0.049, 0.049, 0.165, -0.012);
    cylinder(0.025, 0.025, 0.072, 0.099);
  }
  return body;
}

// Attach a light segment at the inner end of each modeled insect leg.
function attachLegs(world, item, torso) {
  const legs = [];
  for (const el of item.el.querySelectorAll('[data-leg]')) {
    const mesh = el.object3D;
    const restPosition = mesh.position.clone(), restRotation = mesh.quaternion.clone();
    const localRotation = new Quaternion().copy(restRotation);
    const localCenter = new Vec3().copy(restPosition);
    const side = Number(el.dataset.leg);
    const inward = new Vec3(-side * 0.023, 0, 0);
    const axis = new Vec3(side, 0, 0);
    const joint = localRotation.vmult(inward).vadd(localCenter);
    const limb = new Body({ mass: 0.015, shape: new Box(new Vec3(0.023, 0.0045, 0.004)),
      collisionFilterGroup: 2, collisionFilterMask: 1, angularDamping: 0.4 });
    torso.pointToWorldFrame(localCenter, limb.position);
    torso.quaternion.mult(localRotation, limb.quaternion);
    limb.velocity.copy(torso.velocity);
    limb.angularVelocity.copy(torso.angularVelocity);
    const constraint = new ConeTwistConstraint(torso, limb, {
      pivotA: joint, pivotB: inward, axisA: localRotation.vmult(axis), axisB: axis,
      angle: 0.85, twistAngle: 0.3, collideConnected: false,
    });
    world.addBody(limb);
    world.addConstraint(constraint);
    legs.push({ mesh, limb, constraint, restPosition, restRotation });
  }
  return legs;
}

export function throwPhysics(root, bottles, isHeld, drawer) {
  const world = new World({ gravity: new Vec3(0, -9.81, 0), allowSleep: true });
  world.defaultContactMaterial.friction = 0.48;
  world.defaultContactMaterial.restitution = 0.19;
  const bodies = new Map();
  const legs = new Map();
  const local = new Vec3(), rotation = new Quaternion();
  let drawerBody;
  function moveDrawer(dx) {
    if (!drawerBody) return true;
    const occupants = [];
    for (const [item, body] of bodies) {
      const { x, y, z } = body.position.vsub(drawerBody.position);
      if (x < 0 || x > 0.31 || Math.abs(z) > 0.26 || y < -0.055 || y > 0.08) continue;
      body.updateAABB();
      if (dx > 0 && body.aabb.upperBound.y > 0.997) return false;
      occupants.push([item, body]);
    }
    drawerBody.position.x += dx;
    drawerBody.aabbNeedsUpdate = true;
    for (const [item, body] of occupants) {
      for (const part of [body, ...(legs.get(item) ?? []).map(leg => leg.limb)]) {
        part.position.x += dx;
        part.aabbNeedsUpdate = true;
        part.wakeUp();
      }
      item.el.object3D.position.copy(body.position);
    }
    return true;
  }
  let roomReady = false;
  function remove(item) {
    const body = bodies.get(item);
    for (const leg of legs.get(item) ?? []) {
      world.removeConstraint(leg.constraint);
      world.removeBody(leg.limb);
      leg.mesh.position.copy(leg.restPosition);
      leg.mesh.quaternion.copy(leg.restRotation);
    }
    legs.delete(item);
    if (body) world.removeBody(body);
    bodies.delete(item);
  }
  function launch(item, state, velocity, spin) {
    if (!roomReady) {
      // Walls, shelves and countertops use the actual scene geometry in station coordinates.
      for (const el of root.children) {
        if (el.tagName !== 'A-BOX') continue;
        const { width, height, depth } = el.getAttribute('geometry');
        const body = new Body({ mass: 0, shape: new Box(new Vec3(width / 2, height / 2, depth / 2)) });
        body.position.copy(el.object3D.position);
        body.quaternion.copy(el.object3D.quaternion);
        world.addBody(body);
      }
      if (drawer) {
        drawerBody = new Body({ mass: 0 });
        drawerBody.position.copy(drawer.object3D.position);
        for (const panel of drawer.children) {
          if (panel.tagName !== 'A-BOX') continue;
          const { width, height, depth } = panel.getAttribute('geometry');
          drawerBody.addShape(new Box(new Vec3(width / 2, height / 2, depth / 2)),
            new Vec3().copy(panel.object3D.position), new Quaternion().copy(panel.object3D.quaternion));
        }
        world.addBody(drawerBody);
      }
      roomReady = true;
    }
    // Resting bottles wake on impact; a bottle in either hand stays under hand tracking.
    for (const bottle of bottles) {
      if (bottle === item || bodies.has(bottle) || isHeld(bottle)) continue;
      const resting = makeBody(bottle.id, state);
      resting.position.copy(bottle.el.object3D.position);
      resting.quaternion.copy(bottle.el.object3D.quaternion);
      world.addBody(resting);
      resting.sleep();
      bodies.set(bottle, resting);
    }
    remove(item);
    const body = makeBody(item.id, state);
    body.position.copy(item.el.object3D.position);
    body.quaternion.copy(item.el.object3D.quaternion);
    body.velocity.copy(velocity);
    body.angularVelocity.copy(spin);
    bodies.set(item, body);
    world.addBody(body);
    if (item.id === 'cockroach' || item.id === 'spider') legs.set(item, attachLegs(world, item, body));
  }
  function step(dt) {
    if (!bodies.size || !(dt > 0)) return;
    world.step(1 / 120, Math.min(dt, 80) / 1000, 10);
    for (const [item, body] of bodies) {
      item.el.object3D.position.copy(body.position);
      item.el.object3D.quaternion.copy(body.quaternion);
      for (const leg of legs.get(item) ?? []) {
        leg.mesh.position.copy(body.pointToLocalFrame(leg.limb.position, local));
        body.quaternion.conjugate(rotation).mult(leg.limb.quaternion, rotation);
        leg.mesh.quaternion.copy(rotation);
      }
    }
  }
  return { launch, remove, step, bodies, moveDrawer };
}
