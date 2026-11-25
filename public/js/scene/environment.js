import { box, entity, group, sphere } from './blockout.js';

const insectColor = '#6e3f24';
const silkColor = '#e2dcc9';
export const EVENT_HINT_DELAY = 12000;

export const EVENT_SOURCES = {
  cockroach: {
    position: [0, 0.77, -0.544],
    clue: 'Barata no balcão',
    hint: 'Olhe para baixo, na face interna do balcão.',
  },
  slug_slime: {
    position: [0, -0.009, 0.78],
    clue: 'Há um rastro no chão sob a estante de bebidas.',
    hint: 'Atrás de você, no chão sob as garrafas, clique no rastro ou use o gatilho para colher a gosma.',
  },
  spider: {
    position: [0, 1.98, -0.12],
    clue: 'Aranha no fio',
    hint: 'A aranha desce do teto sobre você. Mire nela e use o gatilho ou clique.',
  },
};

const slugStraight = 0.82;
const slugRadius = 0.16;
const slugBend = Math.PI * slugRadius;
const slugLap = 2 * (slugStraight + slugBend);
const slugSpeed = 0.000095; // meters per millisecond of animation
const trailLength = 0.55;

// Distance along a closed track on the floor, with tangent angle in the XZ plane.
function slugTrack(distance) {
  const path = distance % slugLap;
  const returning = path >= slugLap / 2;
  const local = returning ? path - slugLap / 2 : path;
  const sign = returning ? -1 : 1;
  const angle = Math.max(0, local - slugStraight) / slugRadius;
  const x = Math.min(local, slugStraight) - slugStraight / 2 + slugRadius * Math.sin(angle);
  return { x: sign * x, z: -sign * slugRadius * Math.cos(angle), angle: angle + (returning ? Math.PI : 0) };
}

function slugTrail(parent) {
  const THREE = AFRAME.THREE;
  const segments = 28;
  const vertices = new Float32Array((segments + 1) * 6);
  const colors = [];
  const indices = [];
  const tint = new THREE.Color('#a5b97d');
  for (let i = 0; i <= segments; i++) {
    const opacity = 0.72 * (1 - i / segments);
    colors.push(tint.r, tint.g, tint.b, opacity, tint.r, tint.g, tint.b, opacity);
    if (i < segments) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const points = new THREE.BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', points);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  // All samples are local to the slug and at most one trail length behind it.
  const reach = trailLength + 0.024;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.002, 0), reach);
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-reach, 0.002, -reach), new THREE.Vector3(reach, 0.002, reach),
  );
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  parent.setObject3D('slime-trail', mesh);
  return (elapsed, head, collectedAt) => {
    const distance = elapsed * slugSpeed;
    for (let i = 0; i <= segments; i++) {
      const fraction = i / segments;
      const mark = slugTrack(Math.max(collectedAt * slugSpeed, distance - fraction * trailLength));
      const width = 0.024 * (1 - 0.65 * fraction);
      const dx = -Math.sin(mark.angle) * width;
      const dz = Math.cos(mark.angle) * width;
      const x = mark.x - head.x, z = mark.z - head.z;
      points.setXYZ(2 * i, x - dx, 0.002, z - dz);
      points.setXYZ(2 * i + 1, x + dx, 0.002, z + dz);
    }
    points.needsUpdate = true;

  };
}

// The clock belongs to the bar, so changing customers never restarts a route.
export function eventPose(id, elapsed) {
  if (id === 'cockroach') {
    const phase = elapsed / 3500;
    return { x: 0.46 * Math.sin(phase), y: 0.035 * Math.sin(2 * phase), z: 0 };
  }
  if (id === 'spider') {
    return { x: 0, y: 0.59 * (1 + Math.cos(elapsed * 2 * Math.PI / 16000)), z: 0 };
  }
  return { ...slugTrack(elapsed * slugSpeed), y: 0 };
}

export function specimen(parent, id) {
  if (id === 'slug_slime') {
    const puddle = sphere(parent, [0, 0.009, 0], 0.064, '#95ae70');
    puddle.object3D.scale.set(1.15, 0.23, 0.7);
    return;
  }
  const spider = id === 'spider';
  const body = sphere(parent, [0, 0, 0], spider ? 0.038 : 0.044, spider ? '#45404b' : insectColor);
  body.object3D.scale.set(spider ? 0.83 : 0.60, 0.66, 1);
  sphere(parent, [0, 0.002, -0.032], 0.019, spider ? '#565160' : '#493327');
  const legs = spider ? 4 : 3;
  for (const side of [-1, 1]) {
    for (let i = 0; i < legs; i++) {
      const leg = box(parent, [side * 0.038, -0.008, (i - (legs - 1) / 2) * 0.015], [0.046, 0.009, 0.008], spider ? '#544957' : insectColor);
      leg.dataset.leg = String(side);
      leg.object3D.rotation.y = side * (i - (legs - 1) / 2) * 0.34;
    }
  }
}

export function buildEvents({ root, target, onHint, onCue }) {
  const actors = new Map();
  for (const [id, source] of Object.entries(EVENT_SOURCES)) {
    const actor = target('event-' + id, source.clue, source.position);
    if (id !== 'slug_slime') specimen(actor, id);
    actors.set(id, { el: actor, object: actor.object3D, elapsed: 0, respawnAt: 0, collectedAt: 0 });
  }
  const slugSource = actors.get('slug_slime').el;
  const updateTrail = slugTrail(slugSource);
  const slug = group(slugSource, [0, 0.024, 0]);
  sphere(slug, [0, 0, 0], 0.044, '#737c53').object3D.scale.set(1.55, 0.55, 0.8);
  sphere(slug, [0.053, 0.014, 0], 0.022, '#899061');
  const thread = entity(root, 'a-cylinder', {
    radius: 0.0025, height: 1, 'segments-radial': 5, color: silkColor,
  });
  let collected = null;
  let requested = null;
  let idle = 0;
  let hinted = false;
  function draw(id, actor) {
    const { position } = EVENT_SOURCES[id];
    const pose = eventPose(id, actor.elapsed);
    const obj = actor.object;
    obj.position.set(position[0] + pose.x, position[1] + pose.y, position[2] + pose.z);
    if (id === 'cockroach') {
      const phase = actor.elapsed / 3500;
      // Local belly faces the wood, head follows the tangent to the path.
      obj.rotation.order = 'ZXY';
      obj.rotation.x = Math.PI / 2;
      obj.rotation.z = Math.atan2(-0.46 * Math.cos(phase), 0.07 * Math.cos(2 * phase));
    } else if (id === 'spider') {
      const ceiling = 3.21;
      thread.object3D.position.set(obj.position.x, (obj.position.y + ceiling) / 2, obj.position.z);
      thread.object3D.scale.y = ceiling - obj.position.y;
    } else {
      slug.object3D.rotation.y = -pose.angle;
      updateTrail(actor.elapsed, pose, actor.collectedAt);
    }
  }
  for (const [id, actor] of actors) draw(id, actor);
  return {
    sync(event) {
      const held = event?.status === 'collected' ? event.ingredient : null;
      if (held && collected !== held) this.collect(held);
      collected = held;
      const next = event?.status === 'available' ? event.ingredient : null;
      if (requested !== next) {
        requested = next;
        idle = 0;
        hinted = false;
      }
    },
    tick(dt) {
      if (!(dt > 0)) return;
      const step = Math.min(dt, 250);
      for (const [id, actor] of actors) {
        actor.elapsed += step;
        if (!actor.object.visible) {
          if (actor.elapsed < actor.respawnAt) continue;
          actor.object.visible = true;
          if (id === 'spider') thread.object3D.visible = true;
        }
        draw(id, actor);
      }
      idle += step;
      if (requested && !hinted && idle >= EVENT_HINT_DELAY) {
        hinted = true;
        onHint(EVENT_SOURCES[requested].hint);
      }
    },
    activity() { idle = 0; },
    collect(id) {
      const actor = actors.get(id);
      onCue?.(id);
      if (id === 'slug_slime') {
        actor.collectedAt = actor.elapsed;
        draw(id, actor);
      } else {
        actor.object.visible = false;
        actor.respawnAt = actor.elapsed + 3500;
        if (id === 'spider') thread.object3D.visible = false;
      }
    },
  };
}
