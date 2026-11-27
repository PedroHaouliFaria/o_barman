// Sons do balcão (foley), todos sintetizados por código: nada baixado.
// Cada som é "renderizado" uma vez num OfflineAudioContext (várias variações, para não repetir)
// e tocado como fonte posicional no objeto que fez o barulho: o gelo batendo na coqueteleira
// sai da coqueteleira, a colher no vidro sai do copo, os passos saem do cliente.
import * as THREE from 'three';

type Build = (ctx: OfflineAudioContext, out: AudioNode, rnd: () => number) => void;
export type FoleyName =
  | 'shake' | 'stir' | 'muddle' | 'pour' | 'ice' | 'drop' | 'clink' | 'lid' | 'water'
  | 'deliver' | 'error' | 'bell' | 'step' | 'skitter' | 'squish' | 'pick';

// ------------------------------------------------------------ blocos de síntese
function noise(ctx: OfflineAudioContext, seconds: number) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = b;
  return src;
}

/** Ruído filtrado com envelope (ataque, queda). */
function burst(ctx: OfflineAudioContext, out: AudioNode, at: number, o: { f: number; q?: number; type?: BiquadFilterType; gain: number; attack?: number; decay: number }) {
  const len = (o.attack ?? 0.001) + o.decay * 4;
  const src = noise(ctx, len);
  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.value = o.f;
  filter.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(o.gain, at + (o.attack ?? 0.001));
  g.gain.setTargetAtTime(0, at + (o.attack ?? 0.001), o.decay);
  src.connect(filter).connect(g).connect(out);
  src.start(at);
  src.stop(at + len);
}

/** Corpo que ressoa: parciais senoidais com queda própria (vidro, metal, sino). */
function ring(ctx: OfflineAudioContext, out: AudioNode, at: number, f0: number, partials: [ratio: number, amp: number, decay: number][], gain: number, glide = 1) {
  for (const [ratio, amp, decay] of partials) {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(f0 * ratio, at);
    if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(f0 * ratio * glide, at + decay * 2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp * gain, at + 0.0015);
    g.gain.setTargetAtTime(0, at + 0.0015, decay);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + decay * 6 + 0.01);
  }
}

/** Baque grave com queda de afinação (madeira, pilão). */
function thump(ctx: OfflineAudioContext, out: AudioNode, at: number, from: number, to: number, decay: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + decay * 1.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.002);
  g.gain.setTargetAtTime(0, at + 0.002, decay);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + decay * 6);
}

const GLASS: [number, number, number][] = [[1, 1, 0.22], [2.32, 0.55, 0.13], [4.25, 0.3, 0.07], [6.63, 0.18, 0.045]];
const TIN: [number, number, number][] = [[1, 1, 0.05], [1.62, 0.7, 0.04], [2.41, 0.5, 0.03], [3.36, 0.35, 0.02]];

// ------------------------------------------------------------ receitas
const RECIPES: Record<FoleyName, { seconds: number; variants: number; build: Build }> = {
  // gelo batendo dentro da coqueteleira de metal (um golpe por troca de direção)
  shake: {
    seconds: 0.35, variants: 6,
    build(ctx, out, r) {
      thump(ctx, out, 0, 190 + r() * 40, 120, 0.035, 0.35);
      const hits = 4 + Math.floor(r() * 4);
      for (let i = 0; i < hits; i++) {
        const t = 0.004 + r() * 0.05;
        burst(ctx, out, t, { f: 2600 + r() * 2600, q: 2.5, gain: 0.35 + r() * 0.3, decay: 0.004 + r() * 0.004 });
        ring(ctx, out, t, 1700 + r() * 900, TIN, 0.05 + r() * 0.05);
      }
      burst(ctx, out, 0.01, { f: 3800, q: 0.8, gain: 0.08, attack: 0.01, decay: 0.05 });
    },
  },
  // colher bailarina encostando no vidro + gelo girando
  stir: {
    seconds: 0.6, variants: 5,
    build(ctx, out, r) {
      ring(ctx, out, 0, 2100 + r() * 700, GLASS, 0.11 + r() * 0.06);
      if (r() > 0.5) ring(ctx, out, 0.03 + r() * 0.05, 2400 + r() * 900, GLASS, 0.05);
      burst(ctx, out, 0, { f: 1500, q: 0.7, type: 'bandpass', gain: 0.05, attack: 0.05, decay: 0.08 });
    },
  },
  // pilão: baque no fundo do copo + limão/hortelã esmagando
  muddle: {
    seconds: 0.45, variants: 4,
    build(ctx, out, r) {
      thump(ctx, out, 0, 130 + r() * 30, 55, 0.06, 0.7);
      burst(ctx, out, 0, { f: 420, q: 0.8, type: 'lowpass', gain: 0.5, decay: 0.03 });
      burst(ctx, out, 0.005, { f: 850 + r() * 300, q: 1.2, gain: 0.35, attack: 0.008, decay: 0.05 }); // suco
      const crunch = 8 + Math.floor(r() * 10);
      for (let i = 0; i < crunch; i++) burst(ctx, out, 0.01 + r() * 0.12, { f: 1400 + r() * 2200, q: 3, gain: 0.08 + r() * 0.1, decay: 0.003 });
    },
  },
  // líquido caindo (laço): filete + bolhas
  pour: {
    seconds: 2, variants: 1,
    build(ctx, out, r) {
      const src = noise(ctx, 2);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      f.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      src.connect(f).connect(g).connect(out);
      src.start(0);
      for (let i = 0; i < 70; i++) {
        const t = r() * 1.95;
        const osc = ctx.createOscillator();
        const f0 = 350 + r() * 900;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f0 * (1.6 + r()), t + 0.025);
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0, t);
        bg.gain.linearRampToValueAtTime(0.06 + r() * 0.05, t + 0.003);
        bg.gain.setTargetAtTime(0, t + 0.004, 0.008);
        osc.connect(bg).connect(out);
        osc.start(t);
        osc.stop(t + 0.06);
      }
    },
  },
  // gelo caindo no copo
  ice: {
    seconds: 0.6, variants: 3,
    build(ctx, out, r) {
      for (let i = 0; i < 3; i++) {
        const t = i * (0.05 + r() * 0.06);
        ring(ctx, out, t, 2600 + r() * 1400, GLASS, 0.12 + r() * 0.06);
        burst(ctx, out, t, { f: 3500, q: 1.5, gain: 0.12, decay: 0.006 });
      }
    },
  },
  // limão, hortelã, açúcar caindo no copo
  drop: {
    seconds: 0.3, variants: 3,
    build(ctx, out, r) {
      thump(ctx, out, 0, 300 + r() * 80, 160, 0.03, 0.25);
      burst(ctx, out, 0, { f: 900, q: 1, gain: 0.15, decay: 0.02 });
      ring(ctx, out, 0.002, 2300 + r() * 500, GLASS, 0.03);
    },
  },
  // copo pousado na madeira
  clink: {
    seconds: 0.4, variants: 3,
    build(ctx, out, r) {
      thump(ctx, out, 0, 260 + r() * 60, 180, 0.035, 0.35);
      burst(ctx, out, 0, { f: 1300, q: 1.2, gain: 0.18, decay: 0.012 });
      ring(ctx, out, 0, 3000 + r() * 600, GLASS, 0.05);
    },
  },
  // tampa de metal encaixando na coqueteleira
  lid: {
    seconds: 0.5, variants: 2,
    build(ctx, out, r) {
      ring(ctx, out, 0, 880 + r() * 120, [[1, 1, 0.12], [2.7, 0.5, 0.07], [5.1, 0.25, 0.04]], 0.18);
      burst(ctx, out, 0, { f: 2500, q: 1, gain: 0.2, decay: 0.01 });
    },
  },
  // água da pia
  water: {
    seconds: 1.2, variants: 1,
    build(ctx, out) {
      const src = noise(ctx, 1.2);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(0.22, 0.08);
      g.gain.setValueAtTime(0.22, 0.85);
      g.gain.linearRampToValueAtTime(0, 1.15);
      src.connect(f).connect(g).connect(out);
      src.start(0);
    },
  },
  // copo deslizando no balcão até o cliente
  deliver: {
    seconds: 0.8, variants: 1,
    build(ctx, out) {
      burst(ctx, out, 0, { f: 700, q: 0.6, type: 'lowpass', gain: 0.18, attack: 0.08, decay: 0.12 });
      ring(ctx, out, 0.42, 2900, GLASS, 0.06);
      thump(ctx, out, 0.42, 240, 170, 0.03, 0.2);
    },
  },
  // não deu: duas batidas secas na madeira
  error: {
    seconds: 0.4, variants: 1,
    build(ctx, out) {
      thump(ctx, out, 0, 170, 110, 0.04, 0.4);
      thump(ctx, out, 0.11, 150, 100, 0.05, 0.35);
    },
  },
  // sininho de latão da porta (cliente chegando)
  bell: {
    seconds: 2.4, variants: 1,
    build(ctx, out) {
      const bell: [number, number, number][] = [[1, 1, 0.55], [2.76, 0.5, 0.3], [5.4, 0.25, 0.16], [8.93, 0.12, 0.08]];
      ring(ctx, out, 0, 1650, bell, 0.12);
      ring(ctx, out, 0.14, 1662, bell, 0.08);
      ring(ctx, out, 0.31, 1655, bell, 0.04);
    },
  },
  // passo de sapato duro no piso (um pouco oco, de porcelana)
  step: {
    seconds: 0.25, variants: 4,
    build(ctx, out, r) {
      thump(ctx, out, 0, 110 + r() * 25, 70, 0.03, 0.4);
      burst(ctx, out, 0, { f: 1900 + r() * 600, q: 1.8, gain: 0.22, decay: 0.008 });
      ring(ctx, out, 0.001, 620 + r() * 80, [[1, 0.6, 0.03], [2.3, 0.3, 0.015]], 0.08);
    },
  },
  // patinhas de barata
  skitter: {
    seconds: 0.8, variants: 1,
    build(ctx, out, r) {
      for (let i = 0; i < 34; i++) burst(ctx, out, (i / 34) * 0.7 + r() * 0.01, { f: 4000 + r() * 3000, q: 4, gain: 0.08 + r() * 0.08, decay: 0.002 });
    },
  },
  // lesma / gosma
  squish: {
    seconds: 0.6, variants: 1,
    build(ctx, out) {
      const src = noise(ctx, 0.6);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 4;
      f.frequency.setValueAtTime(500, 0);
      f.frequency.exponentialRampToValueAtTime(1400, 0.25);
      f.frequency.exponentialRampToValueAtTime(380, 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(0.3, 0.05);
      g.gain.setTargetAtTime(0, 0.3, 0.07);
      src.connect(f).connect(g).connect(out);
      src.start(0);
    },
  },
  // pegou algo leve (copo da estante, utensílio)
  pick: {
    seconds: 0.25, variants: 2,
    build(ctx, out, r) {
      ring(ctx, out, 0, 3200 + r() * 500, GLASS, 0.025);
      burst(ctx, out, 0, { f: 1800, q: 1, gain: 0.05, decay: 0.01 });
    },
  },
};

async function render(sampleRate: number, name: FoleyName, seed: number): Promise<AudioBuffer> {
  const recipe = RECIPES[name];
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * recipe.seconds), sampleRate);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  recipe.build(ctx, master, rnd);
  return ctx.startRendering();
}

export interface Foley {
  /** Toca um som no objeto (ou na cabeça do jogador, se nenhum). */
  play(name: FoleyName, at?: THREE.Object3D | null, gain?: number, delay?: number): void;
  /** Laço de líquido caindo enquanto o jogador serve. */
  pour(at: THREE.Object3D | null): void;
  setEnabled(on: boolean): void;
  dispose(): void;
}

export function createFoley(listener: THREE.AudioListener, root: THREE.Object3D): Foley {
  const ctx = listener.context;
  const buffers = new Map<FoleyName, AudioBuffer[]>();
  const ready = Promise.all(
    (Object.keys(RECIPES) as FoleyName[]).map(async (name) => {
      const list = await Promise.all(Array.from({ length: RECIPES[name].variants }, (_, i) => render(ctx.sampleRate, name, i + 1)));
      buffers.set(name, list);
    }),
  ).catch((e) => console.warn('[foley]', e));
  let enabled = true;
  const pool: THREE.PositionalAudio[] = [];
  let next = 0;
  for (let i = 0; i < 10; i++) {
    const a = new THREE.PositionalAudio(listener);
    a.setRefDistance(0.6);
    a.setRolloffFactor(1.2);
    root.add(a);
    pool.push(a);
  }
  const variant = new Map<FoleyName, number>();
  const p = new THREE.Vector3();

  // laço do líquido
  const pourAudio = new THREE.PositionalAudio(listener);
  pourAudio.setRefDistance(0.6);
  root.add(pourAudio);
  let pourOn = false;
  let pourTimer = 0;

  function place(a: THREE.Object3D, at?: THREE.Object3D | null) {
    if (at) at.getWorldPosition(p);
    else listener.getWorldPosition(p).add(new THREE.Vector3(0, -0.3, -0.3));
    a.position.copy(root.worldToLocal(p));
  }

  return {
    play(name, at, gain = 1, delay = 0) {
      if (!enabled || ctx.state !== 'running') return;
      const list = buffers.get(name);
      if (!list?.length) {
        void ready;
        return;
      }
      const i = ((variant.get(name) ?? -1) + 1 + Math.floor(Math.random() * Math.max(1, list.length - 1))) % list.length;
      variant.set(name, i);
      const a = pool[next++ % pool.length];
      if (a.isPlaying) a.stop();
      place(a, at);
      a.setBuffer(list[i]);
      a.setVolume(gain);
      a.setPlaybackRate(0.94 + Math.random() * 0.12);
      a.play(delay);
    },
    pour(at) {
      clearTimeout(pourTimer);
      if (!at || !enabled) {
        if (pourOn) {
          pourAudio.stop();
          pourOn = false;
        }
        return;
      }
      place(pourAudio, at);
      if (!pourOn && ctx.state === 'running') {
        const b = buffers.get('pour')?.[0];
        if (!b) return;
        pourAudio.setBuffer(b);
        pourAudio.setLoop(true);
        pourAudio.setVolume(0.8);
        pourAudio.play();
        pourOn = true;
      }
      // se ninguém renovar (o jogador parou de servir), o som para sozinho
      pourTimer = window.setTimeout(() => {
        if (pourOn) pourAudio.stop();
        pourOn = false;
      }, 160);
    },
    setEnabled(on) {
      enabled = on;
      if (!on && pourOn) {
        pourAudio.stop();
        pourOn = false;
      }
    },
    dispose() {
      for (const a of [...pool, pourAudio]) {
        if (a.isPlaying) a.stop();
        a.removeFromParent();
      }
    },
  };
}
