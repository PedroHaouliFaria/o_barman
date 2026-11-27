// Pessoas andando pelo salão (clientes chegando ao balcão e indo embora).
// Os modelos Máscara são estátuas de porcelana sem esqueleto: o andar é um deslizar com
// passinhos — sobe e desce a cada passo, balança de leve de um lado para o outro e inclina
// o tronco para a frente. Combina com o estilo (bonecos de porcelana) e soa com passos.
import * as THREE from 'three';

export type Point = [x: number, z: number];

export interface WalkOptions {
  /** metros por segundo */
  speed?: number;
  /** para onde olhar no fim (rad; 0 = de frente para o bartender) */
  endYaw?: number;
  /** atraso antes de começar (s) */
  delay?: number;
  onStart?: () => void;
  onDone?: () => void;
  /** chamado a cada passo (som) */
  onStep?: (where: THREE.Object3D) => void;
}

interface Walk {
  body: THREE.Object3D;
  rig: THREE.Group;
  path: THREE.Vector2[];
  leg: number;
  speed: number;
  endYaw: number;
  wait: number;
  phase: number;
  started: boolean;
  options: WalkOptions;
  turning: boolean;
}

const STEP = 0.55; // metros por passo

export function createWalkers(stage: THREE.Object3D) {
  const walks = new Set<Walk>();

  /** Leva `body` pelo caminho (pontos x,z no espaço de `stage`). Devolve o grupo que anda. */
  function walk(body: THREE.Object3D, path: Point[], options: WalkOptions = {}) {
    const rig = new THREE.Group();
    rig.name = 'andando';
    stage.add(rig);
    rig.position.set(path[0][0], 0, path[0][1]);
    const next = path[1] ?? path[0];
    rig.rotation.y = Math.atan2(next[0] - path[0][0], next[1] - path[0][1]);
    rig.add(body);
    body.visible = !(options.delay && options.delay > 0);
    const w: Walk = {
      body,
      rig,
      path: path.map(([x, z]) => new THREE.Vector2(x, z)),
      leg: 1,
      speed: options.speed ?? 1.05,
      endYaw: options.endYaw ?? 0,
      wait: options.delay ?? 0,
      phase: 0,
      started: false,
      options,
      turning: false,
    };
    walks.add(w);
    return rig;
  }

  function finish(w: Walk) {
    walks.delete(w);
    w.body.position.y = w.body.userData.baseY ?? w.body.position.y;
    w.options.onDone?.();
  }

  function update(dt: number) {
    dt = Math.min(dt, 0.1);
    for (const w of [...walks]) {
      if (w.wait > 0) {
        w.wait -= dt;
        if (w.wait > 0) continue;
      }
      if (!w.started) {
        w.started = true;
        w.body.visible = true;
        w.body.userData.baseY ??= w.body.position.y;
        w.options.onStart?.();
      }
      const base = w.body.userData.baseY as number;
      if (w.leg < w.path.length) {
        const target = w.path[w.leg];
        const dx = target.x - w.rig.position.x;
        const dz = target.y - w.rig.position.z;
        const dist = Math.hypot(dx, dz);
        const move = w.speed * dt;
        // vira suavemente para a direção do passo
        const want = Math.atan2(dx, dz);
        const turn = Math.atan2(Math.sin(want - w.rig.rotation.y), Math.cos(want - w.rig.rotation.y));
        w.rig.rotation.y += Math.sign(turn) * Math.min(Math.abs(turn), dt * 5);
        if (dist <= move) {
          w.rig.position.x = target.x;
          w.rig.position.z = target.y;
          w.leg++;
        } else {
          w.rig.position.x += (dx / dist) * move;
          w.rig.position.z += (dz / dist) * move;
        }
        const before = Math.floor(w.phase / Math.PI);
        w.phase += (move / STEP) * Math.PI;
        if (Math.floor(w.phase / Math.PI) !== before) w.options.onStep?.(w.rig);
        // passinho de boneco: sobe e desce, balança, tronco para a frente
        w.body.position.y = base + Math.abs(Math.sin(w.phase)) * 0.022;
        w.body.rotation.z = Math.sin(w.phase) * 0.028;
        w.body.rotation.x = 0.035;
        continue;
      }
      // chegou: vira para o lado final e assenta
      const turn = Math.atan2(Math.sin(w.endYaw - w.rig.rotation.y), Math.cos(w.endYaw - w.rig.rotation.y));
      w.rig.rotation.y += Math.sign(turn) * Math.min(Math.abs(turn), dt * 3);
      w.body.position.y += (base - w.body.position.y) * Math.min(1, dt * 10);
      w.body.rotation.z *= 1 - Math.min(1, dt * 10);
      w.body.rotation.x *= 1 - Math.min(1, dt * 10);
      if (Math.abs(turn) < 0.02) {
        w.body.rotation.x = w.body.rotation.z = 0;
        finish(w);
      }
    }
  }

  /** Cancela tudo (reinício do turno); quem estava andando some. */
  function clear() {
    for (const w of walks) {
      w.body.visible = false;
      w.body.position.y = w.body.userData.baseY ?? w.body.position.y;
      w.body.rotation.x = w.body.rotation.z = 0;
    }
    walks.clear();
  }

  return { walk, update, clear, get busy() { return walks.size > 0; } };
}
