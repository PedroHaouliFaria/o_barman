// Eventos ambientais (barata, lesma, aranha). Porta do protótipo A-Frame.
import * as THREE from 'three';
import { EVENT_HINT_DELAY, EVENT_SOURCES, eventPose, slugTrack } from '../interaction/event-paths.js';
import { box, cylinder, group, solid, sphere } from './blockout';
import type { Target } from './types';

const insectColor = '#6e3f24';
const silkColor = '#e2dcc9';
const slugSpeed = 0.000095;
const trailLength = 0.55;

type EventId = 'cockroach' | 'slug_slime' | 'spider';

function slugTrail(parent: THREE.Object3D) {
  const segments = 28;
  const vertices = new Float32Array((segments + 1) * 6);
  const colors: number[] = [];
  const indices: number[] = [];
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
  const reach = trailLength + 0.024;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.002, 0), reach);
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-reach, 0.002, -reach), new THREE.Vector3(reach, 0.002, reach));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  parent.add(mesh);
  return (elapsed: number, head: { x: number; z: number }, collectedAt: number) => {
    const distance = elapsed * slugSpeed;
    for (let i = 0; i <= segments; i++) {
      const fraction = i / segments;
      const mark = slugTrack(Math.max(collectedAt * slugSpeed, distance - fraction * trailLength));
      const width = 0.024 * (1 - 0.65 * fraction);
      const dx = -Math.sin(mark.angle) * width;
      const dz = Math.cos(mark.angle) * width;
      const x = mark.x - head.x,
        z = mark.z - head.z;
      points.setXYZ(2 * i, x - dx, 0.002, z - dz);
      points.setXYZ(2 * i + 1, x + dx, 0.002, z + dz);
    }
    points.needsUpdate = true;
  };
}

export function specimen(parent: THREE.Object3D, id: string) {
  if (id === 'slug_slime') {
    const puddle = sphere(parent, [0, 0.009, 0], 0.064, '#95ae70');
    puddle.scale.set(1.15, 0.23, 0.7);
    return;
  }
  const spider = id === 'spider';
  const body = sphere(parent, [0, 0, 0], spider ? 0.038 : 0.044, spider ? '#45404b' : insectColor);
  body.scale.set(spider ? 0.83 : 0.6, 0.66, 1);
  sphere(parent, [0, 0.002, -0.032], 0.019, spider ? '#565160' : '#493327');
  const legs = spider ? 4 : 3;
  for (const side of [-1, 1]) {
    for (let i = 0; i < legs; i++) {
      const leg = box(
        parent,
        [side * 0.038, -0.008, (i - (legs - 1) / 2) * 0.015],
        [0.046, 0.009, 0.008],
        spider ? '#544957' : insectColor,
      );
      leg.userData.leg = side;
      leg.rotation.y = side * (i - (legs - 1) / 2) * 0.34;
    }
  }
}

interface Actor {
  object: THREE.Object3D;
  elapsed: number;
  respawnAt: number;
  collectedAt: number;
}

export function buildEvents({
  root,
  target,
  onHint,
  onCue,
}: {
  root: THREE.Object3D;
  target: Target;
  onHint: (message: string) => void;
  onCue?: (id: string) => void;
}) {
  const actors = new Map<EventId, Actor>();
  for (const [id, source] of Object.entries(EVENT_SOURCES) as [EventId, (typeof EVENT_SOURCES)[EventId]][]) {
    const actor = target('event-' + id, source.clue, source.position as [number, number, number]);
    if (id !== 'slug_slime') specimen(actor, id);
    actors.set(id, { object: actor, elapsed: 0, respawnAt: 0, collectedAt: 0 });
  }
  const slugSource = actors.get('slug_slime')!.object;
  const updateTrail = slugTrail(slugSource);
  const slug = group(slugSource, [0, 0.024, 0]);
  sphere(slug, [0, 0, 0], 0.044, '#737c53').scale.set(1.55, 0.55, 0.8);
  sphere(slug, [0.053, 0.014, 0], 0.022, '#899061');
  const thread = cylinder(root, [0, 0, 0], 0.0025, 1, silkColor, 5);
  thread.material = solid(silkColor);
  let collected: string | null = null;
  let requested: EventId | null = null;
  let idle = 0;
  let hinted = false;
  function draw(id: EventId, actor: Actor) {
    const { position } = EVENT_SOURCES[id];
    const pose = eventPose(id, actor.elapsed) as { x: number; y: number; z: number; angle?: number };
    const obj = actor.object;
    obj.position.set(position[0] + pose.x, position[1] + pose.y, position[2] + pose.z);
    if (id === 'cockroach') {
      const phase = actor.elapsed / 3500;
      obj.rotation.order = 'ZXY';
      obj.rotation.x = Math.PI / 2;
      obj.rotation.z = Math.atan2(-0.46 * Math.cos(phase), 0.07 * Math.cos(2 * phase));
    } else if (id === 'spider') {
      const ceiling = 3.38;
      thread.position.set(obj.position.x, (obj.position.y + ceiling) / 2, obj.position.z);
      thread.scale.y = ceiling - obj.position.y;
    } else {
      slug.rotation.y = -(pose.angle ?? 0);
      updateTrail(actor.elapsed, pose, actor.collectedAt);
    }
  }
  for (const [id, actor] of actors) draw(id, actor);
  const api = {
    /** corpo da lesma (o rastro fica fora) e os alvos de cada bicho, para a arte trocar a malha */
    slugBody: slug,
    actors: Object.fromEntries([...actors].map(([id, a]) => [id, a.object])) as Record<EventId, THREE.Object3D>,
    sync(event: { ingredient: string; status: string } | null) {
      const held = event?.status === 'collected' ? event.ingredient : null;
      if (held && collected !== held) api.collect(held);
      collected = held;
      const next = event?.status === 'available' ? (event.ingredient as EventId) : null;
      if (requested !== next) {
        requested = next;
        idle = 0;
        hinted = false;
      }
    },
    tick(dt: number) {
      if (!(dt > 0)) return;
      const step = Math.min(dt, 250);
      for (const [id, actor] of actors) {
        actor.elapsed += step;
        if (!actor.object.visible) {
          if (actor.elapsed < actor.respawnAt) continue;
          actor.object.visible = true;
          if (id === 'spider') thread.visible = true;
        }
        draw(id, actor);
      }
      idle += step;
      if (requested && !hinted && idle >= EVENT_HINT_DELAY) {
        hinted = true;
        onHint(EVENT_SOURCES[requested].hint);
      }
    },
    activity() {
      idle = 0;
    },
    collect(id: string) {
      const actor = actors.get(id as EventId);
      if (!actor) return;
      onCue?.(id);
      if (id === 'slug_slime') {
        actor.collectedAt = actor.elapsed;
        draw(id, actor);
      } else {
        actor.object.visible = false;
        if (id === 'spider') thread.visible = false;
        actor.respawnAt = actor.elapsed + 3500;
      }
    },
  };
  return api;
}
