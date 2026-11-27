// Chegada e saída dos clientes (pedido do Felipe, 27/11/2026: "nao tem animacao do cliente
// andando ate o balcao, ele se teleporta e desaparece, melhore MUITO essa interacao").
//
// - Quem espera à mesa (Turista, Aposentado, Universitário) levanta, anda até o balcão e
//   senta na banqueta; depois de servido volta para a mesa com o drink na mão e senta.
// - Os outros entram pela porta dos fundos: a porta abre, o sininho toca, a pessoa atravessa
//   o salão entre as mesas e para no balcão. Servida, sai pela mesma porta com o drink.
// - A fala do pedido só aparece quando o cliente chega ao balcão.
import * as THREE from 'three';
import type { Foley } from '../audio/foley';
import { CUSTOMER_MODELS } from './art-bar';
import type { CustomerCast } from './dress';
import { createWalkers, type Point } from './walkers';

/** Caminho da porta dos fundos até o balcão, pelo corredor à esquerda das mesas (espaço da estação). */
const FROM_DOOR: Point[] = [
  [-2.3, -10.35],
  [-2.32, -9.2],
  [-3.0, -7.6],
  [-3.05, -4.9],
  [-2.5, -3.05],
  [-1.0, -2.1],
];
/** Corredor entre as duas mesas da frente. */
const AISLE_X = -0.85;

interface FlowOptions {
  stage: THREE.Object3D;
  person: THREE.Object3D;
  cast: CustomerCast;
  tablePeople: THREE.Object3D[];
  foley: Foley;
  door: { hold: number };
  doorAnchor: THREE.Object3D;
  /** cópia do copo servido (com o drink) para o cliente levar */
  drink: () => THREE.Object3D | null;
}

export function customerFlow(o: FlowOptions) {
  const walkers = createWalkers(o.stage);
  const counter = (): Point => [o.person.position.x, o.person.position.z];
  const p = new THREE.Vector3();
  let present = -1; // quem está (ou está vindo) no balcão
  let arrived = -1; // quem já chegou e está no balcão
  const away = new Set<THREE.Object3D>(); // quem está indo embora
  const settles: { body: THREE.Object3D; from: number; to: number; t: number; done?: () => void }[] = [];

  function stagePoint(obj: THREE.Object3D): Point {
    obj.getWorldPosition(p);
    o.stage.worldToLocal(p);
    return [p.x, p.z];
  }

  /** Do lugar à mesa até o balcão: sai da cadeira para fora da mesa e usa o corredor. */
  function tablePath(index: number): Point[] {
    const figure = o.tablePeople[CUSTOMER_MODELS[index].table!];
    const seat = stagePoint(figure);
    const center = figure.parent ? stagePoint(figure.parent) : seat;
    const dx = seat[0] - center[0];
    const dz = seat[1] - center[1];
    const len = Math.hypot(dx, dz) || 1;
    const out: Point = [seat[0] + (dx / len) * 0.4, seat[1] + (dz / len) * 0.4];
    const c = counter();
    return [seat, out, [AISLE_X, out[1]], [AISLE_X, -2.55], [-0.35, -1.95], c];
  }

  function doorPath(): Point[] {
    return [...FROM_DOOR, counter()];
  }

  function step(where: THREE.Object3D) {
    o.foley.play('step', where, 0.55);
  }

  function bell() {
    o.foley.play('bell', o.doorAnchor, 0.8);
  }

  function hideAll() {
    walkers.clear();
    for (const m of [...o.cast.models, ...o.cast.standing]) {
      if (!m) continue;
      m.visible = false;
      if (m.parent !== o.person) o.person.add(m);
      m.position.set(0, m.userData.baseY ?? 0, CUSTOMER_MODELS[o.cast.models.indexOf(m)]?.seated ? -0.12 : 0);
    }
    for (const t of o.tablePeople) t.visible = true;
    for (const c of o.stage.children.filter((c) => c.name === 'andando')) c.removeFromParent();
    away.clear();
    settles.length = 0;
    present = arrived = -1;
  }

  /** Corpo que anda: a versão em pé de quem senta; o próprio modelo de quem fica em pé. */
  function walker(index: number) {
    return o.cast.standing[index] ?? o.cast.models[index];
  }

  function arrive(index: number, delay: number) {
    const def = CUSTOMER_MODELS[index];
    const body = walker(index);
    const seated = o.cast.models[index];
    present = -1;
    arrived = -1;
    if (!body || !seated) return;
    present = index;
    body.position.set(0, 0, 0);
    const fromTable = def.table !== undefined;
    const path = fromTable ? tablePath(index) : doorPath();
    walkers.walk(body, path, {
      delay,
      endYaw: 0,
      onStart: () => {
        if (fromTable) o.tablePeople[def.table!].visible = false;
        else {
          o.door.hold = 7;
          bell();
        }
      },
      onStep: step,
      onDone: () => {
        const rig = body.parent!;
        if (present !== index) return; // reinício no meio do caminho
        if (def.seated) {
          // senta na banqueta: troca para o modelo sentado e assenta devagar
          body.visible = false;
          o.person.add(body);
          seated.visible = true;
          const to = seated.userData.baseY as number;
          settles.push({ body: seated, from: to + 0.16, to, t: 0 });
          seated.position.y = to + 0.16;
        } else {
          o.person.add(body);
          body.position.set(0, 0, 0);
        }
        rig.removeFromParent();
        arrived = index;
      },
    });
  }

  function leave(index: number, carry: boolean) {
    const def = CUSTOMER_MODELS[index];
    const body = walker(index);
    const seated = o.cast.models[index];
    if (!body || !seated) return;
    const fromTable = def.table !== undefined;
    const path = (fromTable ? tablePath(index) : doorPath()).reverse();
    const start = () => {
      seated.visible = false;
      body.visible = true;
      away.add(body);
      const rig = walkers.walk(body, path, {
        endYaw: fromTable ? Math.atan2(path.at(-2)![0] - path.at(-1)![0], path.at(-2)![1] - path.at(-1)![1]) + Math.PI : Math.PI,
        onStart: () => {
          if (!fromTable) o.door.hold = 12;
        },
        onStep: step,
        onDone: () => {
          away.delete(body);
          body.visible = false;
          o.person.add(body);
          body.position.set(0, body.userData.baseY ?? 0, 0);
          for (const c of [...rig.children]) if (c !== body) c.removeFromParent();
          rig.removeFromParent();
          if (fromTable) o.tablePeople[def.table!].visible = true;
          else bell();
        },
      });
      if (carry) {
        const glass = o.drink();
        if (glass) {
          glass.position.set(0.22, 1.0, 0.16);
          rig.add(glass);
        }
      }
    };
    if (def.seated && seated.visible) {
      // levanta da banqueta antes de andar
      const to = seated.userData.baseY as number;
      settles.push({ body: seated, from: to, to: to + 0.14, t: 0, done: start });
    } else start();
  }

  return {
    /**
     * Pedido atual mudou: quem estava vai embora (com o drink, se foi servido) e o próximo vem.
     * `served`: o cliente anterior saiu satisfeito.
     */
    show(index: number, playing: boolean, served: boolean) {
      if (!playing) {
        hideAll();
        return;
      }
      if (index === present) return;
      const previous = present;
      if (previous >= 0) leave(previous, served);
      arrive(index, previous >= 0 ? 1.6 : 0.4);
    },
    /** O cliente do pedido já está no balcão (a fala aparece). */
    isHere: (index: number) => arrived === index,
    update(dt: number) {
      walkers.update(dt);
      for (const s of [...settles]) {
        s.t = Math.min(1, s.t + dt / 0.35);
        const k = s.t * s.t * (3 - 2 * s.t);
        s.body.position.y = s.from + (s.to - s.from) * k;
        if (s.t >= 1) {
          settles.splice(settles.indexOf(s), 1);
          s.body.position.y = s.done ? (s.body.userData.baseY as number) : s.to;
          s.done?.();
        }
      }
    },
    reset: hideAll,
  };
}
