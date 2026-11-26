// O pianista do bar: um piano de cauda sintetizado nota a nota (sem samples baixados),
// tocando uma balada original que acompanha a noite. O som sai do piano no fundo do
// salão (áudio posicional) e passa por uma reverberação de sala gerada por código.
//
// Como soa um piano aqui:
//   - cada nota é "renderizada" uma vez num OfflineAudioContext e guardada (barato no Quest);
//   - 2 ou 3 cordas levemente desafinadas entre si (o batimento que dá vida ao timbre);
//   - parciais inarmônicas (cordas rígidas), agudas morrem antes das graves;
//   - decaimento em dois estágios (ataque forte + sustentação longa) e o golpe do martelo;
//   - pedal de sustentação simulado pela duração das notas do acompanhamento.
//
// A noite piora e a música acompanha (atos do roteiro):
//   I   balada afinada, quente, ~64 bpm
//   II  afinação começa a escorregar, uma ou outra nota errada, mais lenta
//   III abafada (o som "atrás de uma porta"), o andamento oscila, frases se repetem
//   IV  acordes que não resolvem, notas presas, silêncios longos
import * as THREE from 'three';

type Voice = { midi: number; at: number; velocity: number; length: number; hand: 0 | 1 };

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// ---------------------------------------------------------------- composição (original)
// Ré menor, forma de 16 compassos. Acompanhamento: baixo no tempo 1, acorde aberto no 2 e 4.
const CHORDS: { bass: number; voicing: number[] }[] = [
  { bass: 38, voicing: [53, 57, 60, 64] }, // Dm9
  { bass: 38, voicing: [53, 57, 59, 64] }, // Dm6/9
  { bass: 43, voicing: [53, 57, 59, 64] }, // G13
  { bass: 43, voicing: [53, 56, 59, 62] }, // G7b9
  { bass: 36, voicing: [52, 55, 59, 62] }, // Cmaj9
  { bass: 45, voicing: [55, 58, 61, 65] }, // A7b9
  { bass: 46, voicing: [53, 57, 60, 62] }, // Bbmaj9
  { bass: 45, voicing: [55, 57, 61, 64] }, // A7sus → A7
  { bass: 38, voicing: [53, 57, 60, 64] }, // Dm9
  { bass: 41, voicing: [55, 57, 60, 64] }, // F6/9
  { bass: 46, voicing: [53, 56, 60, 62] }, // Bb7
  { bass: 45, voicing: [55, 58, 61, 65] }, // A7b9
  { bass: 43, voicing: [53, 58, 62, 65] }, // Gm9
  { bass: 40, voicing: [55, 58, 62, 64] }, // Em7b5
  { bass: 45, voicing: [55, 57, 61, 64] }, // A7
  { bass: 38, voicing: [53, 57, 60, 62] }, // Dm(add9)
];
// Melodia por compasso: [tempo (em semínimas, 0..3.5), nota, duração em tempos]
const MELODY: [number, number, number][][] = [
  [[0.5, 69, 1], [1.5, 72, 1.5], [3, 74, 1]],
  [[0, 72, 1.5], [2, 69, 2]],
  [[1, 71, 0.5], [1.5, 72, 0.5], [2, 74, 1], [3, 77, 1]],
  [[0, 76, 2.5], [3, 74, 1]],
  [[0, 71, 1], [1, 72, 1], [2, 76, 2]],
  [[0.5, 73, 1], [1.5, 76, 1], [2.5, 79, 1.5]],
  [[0, 77, 1.5], [2, 74, 1], [3, 72, 1]],
  [[0, 73, 3]],
  [[0.5, 74, 1], [1.5, 77, 1.5], [3, 81, 1]],
  [[0, 79, 1.5], [2, 76, 2]],
  [[1, 74, 0.5], [1.5, 76, 0.5], [2, 77, 1], [3, 74, 1]],
  [[0, 73, 2], [2.5, 70, 1]],
  [[0, 70, 1], [1, 74, 1], [2, 77, 2]],
  [[0, 76, 1.5], [2, 74, 1], [3, 72, 1]],
  [[0, 73, 1], [1, 76, 1], [2, 79, 1.5]],
  [[0, 74, 4]],
];

interface ActStyle {
  bpm: number;
  /** desvio de afinação em cents por nota */
  drift: number;
  /** chance de uma nota da melodia sair errada (meio tom) */
  wrong: number;
  /** filtro passa-baixa final (Hz) */
  lowpass: number;
  /** variação de andamento (fração) */
  rubato: number;
  /** chance de pular uma nota da melodia (silêncio) */
  silence: number;
  /** quanto do sinal vai para a reverberação */
  wet: number;
  /** cluster dissonante no lugar do acorde */
  cluster: number;
}
const ACTS: Record<number, ActStyle> = {
  1: { bpm: 64, drift: 1.5, wrong: 0, lowpass: 9000, rubato: 0.04, silence: 0.02, wet: 0.28, cluster: 0 },
  2: { bpm: 60, drift: 9, wrong: 0.05, lowpass: 7000, rubato: 0.07, silence: 0.06, wet: 0.34, cluster: 0.04 },
  3: { bpm: 52, drift: 18, wrong: 0.1, lowpass: 2600, rubato: 0.14, silence: 0.16, wet: 0.45, cluster: 0.12 },
  4: { bpm: 44, drift: 30, wrong: 0.18, lowpass: 1700, rubato: 0.22, silence: 0.3, wet: 0.55, cluster: 0.35 },
};

// ---------------------------------------------------------------- síntese de uma nota

async function renderNote(sampleRate: number, midi: number): Promise<AudioBuffer> {
  const seconds = midi < 50 ? 6 : midi < 70 ? 4.5 : 3;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
  const f0 = hz(midi);
  const strings = midi < 40 ? 1 : midi < 52 ? 2 : 3;
  const inharmonic = 0.00012 * Math.pow(f0 / 110, 1.2) + 0.00004;
  const sustain = 5.5 * Math.pow(261.6 / f0, 0.55); // t60 da fundamental (s)
  const master = ctx.createGain();
  master.gain.value = 0.32;
  // Caixa de ressonância: corta o sub e suaviza o brilho excessivo.
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = Math.min(9000, 2400 + f0 * 6);
  body.Q.value = 0.4;
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = 38;
  master.connect(body).connect(low).connect(ctx.destination);
  const partials = Math.min(14, Math.floor(9000 / f0));
  for (let s = 0; s < strings; s++) {
    const detune = strings === 1 ? 0 : (s - (strings - 1) / 2) * (0.9 + Math.random() * 0.5); // cents
    for (let n = 1; n <= partials; n++) {
      const freq = n * f0 * Math.sqrt(1 + inharmonic * n * n) * 2 ** (detune / 1200);
      const amp = (1 / Math.pow(n, 1.15)) * (n === 1 ? 1 : 0.9) * (1 / strings);
      // Martelo bate a 1/8 da corda: o 8º parcial quase some.
      const hammer = n % 8 === 0 ? 0.15 : 1;
      const t60 = sustain / (1 + 0.45 * (n - 1));
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const peak = amp * hammer;
      // Dois estágios: queda rápida (prompt) e sustentação longa (aftersound).
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(peak, 0.004);
      g.gain.setTargetAtTime(peak * 0.42, 0.004, Math.min(0.35, t60 / 9));
      g.gain.setTargetAtTime(0.00001, 0.25, t60 / 6.9);
      osc.connect(g).connect(master);
      osc.start(0);
      osc.stop(seconds);
    }
  }
  // Golpe do martelo: ruído curto filtrado em torno do registro da nota.
  const noise = ctx.createBuffer(1, Math.ceil(sampleRate * 0.05), sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.008));
  const thump = ctx.createBufferSource();
  thump.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = Math.min(6000, f0 * 3.5);
  band.Q.value = 0.9;
  const tg = ctx.createGain();
  tg.gain.value = 0.18;
  thump.connect(band).connect(tg).connect(master);
  thump.start(0);
  return ctx.startRendering();
}

/** Resposta ao impulso de uma sala de madeira média (~2 s), estéreo, com reflexões iniciais. */
function roomImpulse(ctx: BaseAudioContext, seconds = 2.2) {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, Math.ceil(rate * seconds), rate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const t = i / rate;
      // cauda: ruído com decaimento exponencial e agudos sumindo mais rápido (suavizado)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.45) * 0.6;
    }
    // suaviza (madeira absorve agudos)
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = last + (d[i] - last) * (0.35 - 0.25 * Math.min(1, i / d.length));
      d[i] = last;
    }
    for (const [ms, g] of [[11, 0.5], [17, 0.35], [29, 0.28], [41, 0.2], [57, 0.15]] as const) {
      const at = Math.floor(((ms + c * 3) / 1000) * rate);
      if (at < d.length) d[at] += g * (c ? 0.9 : 1);
    }
  }
  return buffer;
}

// ---------------------------------------------------------------- o pianista

export interface Pianist {
  start(): void;
  setAct(act: number): void;
  setPaused(paused: boolean): void;
  setEnabled(enabled: boolean): void;
  /** fim do turno: um último acorde e silêncio */
  finale(): void;
  /** volta a tocar depois do fim (novo turno) */
  resume(): void;
  /** diagnóstico: notas prontas e tocadas, pico do último compasso */
  stats(): { rendered: number; played: number; peak: number; state: string };
  dispose(): void;
}

export function createPianist(listener: THREE.AudioListener, anchor: THREE.Object3D, onStrike: (hand: 0 | 1) => void = () => {}): Pianist {
  const ctx = listener.context;
  const cache = new Map<number, Promise<AudioBuffer>>();
  const ready = new Map<number, AudioBuffer>();
  const keyOf = (midi: number) => Math.max(33, Math.min(96, Math.round(midi)));
  const load = (midi: number) => {
    const key = keyOf(midi);
    if (!cache.has(key)) cache.set(key, renderNote(ctx.sampleRate, key).then((b) => (ready.set(key, b), b)));
    return cache.get(key)!;
  };
  const note = (midi: number) => {
    load(midi);
    return ready.get(keyOf(midi));
  };
  // Pré-renderiza, uma nota por vez, o que a peça usa (não trava o quadro nem o Quest).
  const needed = new Set<number>();
  for (const c of CHORDS) [c.bass, c.bass + 12, ...c.voicing, ...c.voicing.map((m) => m + 1)].forEach((m) => needed.add(m));
  for (const bar of MELODY) for (const [, m] of bar) [m - 1, m, m + 1].forEach((x) => needed.add(x));
  for (const m of [26, 38, 53, 56, 61]) needed.add(m);
  let warm: Promise<unknown> = Promise.resolve();
  for (const m of needed) warm = warm.then(() => load(m));

  // Cadeia: vozes → seco/molhado → abafador do ato → volume → saída posicional no piano.
  const dry = ctx.createGain();
  const send = ctx.createGain();
  const reverb = ctx.createConvolver();
  reverb.buffer = roomImpulse(ctx);
  const muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.Q.value = 0.5;
  const volume = ctx.createGain();
  volume.gain.value = 0;
  dry.connect(muffle);
  send.connect(reverb).connect(muffle);
  muffle.connect(volume);
  const speaker = new THREE.PositionalAudio(listener);
  speaker.setRefDistance(2.6);
  speaker.setRolloffFactor(0.7);
  speaker.setDistanceModel('inverse');
  speaker.setNodeSource(volume as unknown as AudioBufferSourceNode);
  anchor.add(speaker);

  let act = 1;
  let style = ACTS[1];
  let enabled = true;
  let paused = false;
  let playing = false;
  let ended = false;
  let bar = 0;
  let nextBarAt = 0;
  let timer = 0;
  let wowPhase = 0;

  function applyStyle(when = ctx.currentTime) {
    muffle.frequency.setTargetAtTime(style.lowpass, when, 1.5);
    dry.gain.setTargetAtTime(1 - style.wet * 0.5, when, 1.5);
    send.gain.setTargetAtTime(style.wet, when, 1.5);
    const target = !enabled ? 0 : paused ? 0.25 : 0.9;
    volume.gain.setTargetAtTime(target, when, 0.6);
  }

  let played = 0;
  const meter = ctx.createAnalyser();
  meter.fftSize = 1024;
  volume.connect(meter);
  const samples = new Float32Array(meter.fftSize);
  function play(v: Voice) {
    const buffer = note(v.midi);
    if (!buffer) return;
    played++; // ainda renderizando: a nota fica de fora (só nos primeiros segundos)
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    // Ato III em diante: a "fita" oscila (wow) e as notas escorregam.
    wowPhase += 0.37;
    const wow = act >= 3 ? Math.sin(wowPhase) * style.drift * 0.6 : 0;
    src.detune.value = (Math.random() - 0.5) * 2 * style.drift + wow + (v.midi - Math.round(v.midi)) * 100;
    const g = ctx.createGain();
    // Dinâmica: notas fortes mais brilhantes (filtro por voz).
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800 + v.velocity * 7000;
    g.gain.setValueAtTime(v.velocity, v.at);
    // Abafador soltando a corda no fim da duração (pedal levantado).
    g.gain.setTargetAtTime(0.0001, v.at + v.length, 0.12);
    src.connect(tone).connect(g);
    g.connect(dry);
    g.connect(send);
    src.start(v.at);
    src.stop(v.at + v.length + 0.8);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
      tone.disconnect();
    };
    const delay = Math.max(0, (v.at - ctx.currentTime) * 1000);
    window.setTimeout(() => onStrike(v.hand), delay);
  }

  function scheduleBar(at: number) {
    const beat = (60 / style.bpm) * (1 + (Math.random() - 0.5) * 2 * style.rubato);
    const chord = CHORDS[bar % CHORDS.length];
    const phrase = MELODY[bar % MELODY.length];
    const soft = paused ? 0.6 : 1;
    // Baixo (tempo 1) e oitava no 3 em compassos ímpares.
    play({ midi: chord.bass, at, velocity: 0.55 * soft, length: beat * 3.6, hand: 0 });
    if (bar % 2) play({ midi: chord.bass + 12, at: at + beat * 2, velocity: 0.32 * soft, length: beat * 1.8, hand: 0 });
    // Acorde aberto, levemente arpejado, nos tempos 2 e 4 (no Ato IV vira cluster preso).
    const clustered = Math.random() < style.cluster;
    const voicing = clustered ? chord.voicing.map((m, i) => m + (i % 2 ? 1 : 0)) : chord.voicing;
    for (const t of [1, 3]) {
      if (Math.random() < style.silence * 0.5) continue;
      voicing.forEach((m, i) =>
        play({ midi: m, at: at + beat * t + i * 0.012, velocity: (0.22 + (t === 1 ? 0.04 : 0)) * soft, length: beat * (clustered ? 3 : 1.6), hand: 0 }),
      );
    }
    // Melodia (mão direita), com respiração humana e os desvios do ato.
    for (const [t, m, dur] of phrase) {
      if (Math.random() < style.silence) continue;
      const wrong = Math.random() < style.wrong ? (Math.random() < 0.5 ? -1 : 1) : 0;
      const human = (Math.random() - 0.5) * 0.04;
      const accent = t === 0 ? 0.08 : 0;
      play({ midi: m + wrong, at: at + beat * t + human, velocity: (0.42 + accent + Math.random() * 0.08) * soft, length: beat * dur * 1.05, hand: 1 });
      // Ato III: a frase "engasga" e repete a nota.
      if (act >= 3 && Math.random() < 0.18) play({ midi: m + wrong, at: at + beat * (t + 0.5), velocity: 0.3 * soft, length: beat, hand: 1 });
    }
    bar++;
    // Ato IV: às vezes o pianista para no meio da música.
    const rest = act >= 4 && Math.random() < 0.25 ? beat * 4 : 0;
    return at + beat * 4 + rest;
  }

  function tick() {
    if (!playing) return;
    // Agenda com 1,2 s de antecedência (o relógio do áudio é preciso; o setTimeout não).
    while (!ended && nextBarAt < ctx.currentTime + 1.2) nextBarAt = scheduleBar(Math.max(nextBarAt, ctx.currentTime + 0.05));
    timer = window.setTimeout(tick, 200);
  }

  return {
    start() {
      if (playing) return;
      playing = true;
      ended = false;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      // Espera as notas mais usadas ficarem prontas antes da primeira frase.
      warm.then(() => {
        nextBarAt = ctx.currentTime + 0.3;
        applyStyle();
        tick();
      });
    },
    setAct(next: number) {
      act = Math.max(1, Math.min(4, next));
      style = ACTS[act];
      applyStyle();
    },
    setPaused(next: boolean) {
      paused = next;
      applyStyle();
    },
    setEnabled(next: boolean) {
      enabled = next;
      applyStyle();
    },
    finale() {
      ended = true;
      const at = Math.max(nextBarAt, ctx.currentTime + 0.4);
      for (const m of [26, 38, 53, 56, 61]) play({ midi: m, at, velocity: 0.5, length: 6, hand: 0 });
    },
    stats() {
      meter.getFloatTimeDomainData(samples);
      let peak = 0;
      for (const x of samples) peak = Math.max(peak, Math.abs(x));
      return { rendered: ready.size, played, peak, state: ctx.state };
    },
    resume() {
      if (!ended) return;
      ended = false;
      bar = 0;
      nextBarAt = ctx.currentTime + 2;
    },
    dispose() {
      playing = false;
      clearTimeout(timer);
      speaker.removeFromParent();
      speaker.disconnect();
    },
  };
}
