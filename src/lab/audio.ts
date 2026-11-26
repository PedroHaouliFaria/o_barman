// Som do laboratório: piano sintetizado (posicional, saindo do piano no fundo),
// murmúrio das mesas e rangido da porta. Rascunho do sistema de música viva:
// cada estilo desafina, "embola" a fita ou abafa o piano de um jeito.
import * as THREE from 'three';
import type { StyleDef } from './styles';

// Balada lenta em ré menor, com acordes que nunca resolvem por completo.
const PROGRESSION: number[][] = [
  [50, 57, 60, 64, 65], // Dm9
  [43, 53, 57, 59, 64], // G13
  [48, 55, 59, 62, 64], // Cmaj9
  [45, 55, 58, 61, 65], // A7b9
  [46, 53, 57, 60, 62], // Bbmaj9
  [44, 54, 57, 60, 64], // ? diminuto deslocado
  [43, 53, 58, 62, 65], // Gm9
  [45, 55, 57, 61, 64], // A7
];
const MELODY = [69, 72, 74, 72, 69, 67, 65, 64, 65, 67, 69, 65, 64, 62, 61, 62];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function createLabAudio(listener: THREE.AudioListener) {
  const ctx = listener.context;
  let style: StyleDef | null = null;
  let piano: THREE.PositionalAudio | null = null;
  let bus: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let wobble: OscillatorNode | null = null;
  let wobbleDepth: GainNode | null = null;
  let timer = 0;
  let step = 0;
  let onStrike: (hand: 0 | 1) => void = () => {};
  const murmurs: THREE.PositionalAudio[] = [];

  function note(midi: number, when: number, velocity: number, length: number) {
    if (!bus || !style) return;
    const detune = (Math.random() - 0.5) * style.music.detune * 2;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, when);
    out.gain.linearRampToValueAtTime(velocity, when + 0.008);
    out.gain.exponentialRampToValueAtTime(velocity * 0.35, when + 0.35);
    out.gain.exponentialRampToValueAtTime(0.0001, when + length);
    out.connect(bus);
    for (const [ratio, amp, type] of [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine'], [4.01, 0.05, 'sine']] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = hz(midi) * ratio;
      osc.detune.value = detune;
      if (wobbleDepth) wobbleDepth.connect(osc.detune);
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(out);
      osc.start(when);
      osc.stop(when + length + 0.05);
    }
  }

  function schedule() {
    if (!style) return;
    const now = ctx.currentTime + 0.05;
    const bar = Math.floor(step / 4);
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const beat = 0.85; // ~70 bpm, arrastado
    const swing = step % 2 ? 0.08 : 0;
    if (step % 4 === 0) {
      chord.forEach((m, i) => note(m, now + i * 0.018, i === 0 ? 0.18 : 0.08, 3.6));
      onStrike(0);
    }
    if (step % 2 === 1 || Math.random() < 0.3) {
      const m = MELODY[step % MELODY.length] + (Math.random() < 0.15 ? 12 : 0);
      note(m, now + swing, 0.11, 1.6);
      onStrike(1);
    }
    step++;
    timer = window.setTimeout(schedule, beat * 1000);
  }

  function brownNoise(seconds: number) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  return {
    start(next: StyleDef, pianoAnchor: THREE.Object3D, murmurAnchors: THREE.Object3D[], strike: (hand: 0 | 1) => void) {
      this.stop();
      style = next;
      onStrike = strike;
      if (ctx.state === 'suspended') ctx.resume();
      bus = ctx.createGain();
      bus.gain.value = 0.9;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = style.music.lowpass;
      bus.connect(filter);
      if (style.music.wobble) {
        wobble = ctx.createOscillator();
        wobble.frequency.value = 0.6;
        wobbleDepth = ctx.createGain();
        wobbleDepth.gain.value = style.music.wobble;
        wobble.connect(wobbleDepth);
        wobble.start();
      }
      piano = new THREE.PositionalAudio(listener);
      piano.setRefDistance(2.2);
      piano.setRolloffFactor(0.8);
      piano.setNodeSource(filter as unknown as AudioBufferSourceNode);
      pianoAnchor.add(piano);
      const noise = brownNoise(6);
      for (const anchor of murmurAnchors) {
        const m = new THREE.PositionalAudio(listener);
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        src.playbackRate.value = 0.9 + Math.random() * 0.2;
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 420 + Math.random() * 180;
        band.Q.value = 1.4;
        const am = ctx.createGain();
        am.gain.value = 0.05;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 2 + Math.random() * 2.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.04;
        lfo.connect(lfoGain).connect(am.gain);
        src.connect(band).connect(am);
        src.start(ctx.currentTime + Math.random());
        lfo.start();
        m.setNodeSource(am as unknown as AudioBufferSourceNode);
        m.setRefDistance(1.2);
        anchor.add(m);
        murmurs.push(m);
      }
      step = 0;
      schedule();
    },
    creak(anchor: THREE.Object3D) {
      if (!style || ctx.state !== 'running') return;
      const pa = new THREE.PositionalAudio(listener);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(95, t + 1.4);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.2);
      g.gain.linearRampToValueAtTime(0, t + 1.5);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 6;
      osc.connect(f).connect(g);
      pa.setNodeSource(g as unknown as AudioBufferSourceNode);
      pa.setRefDistance(1.5);
      anchor.add(pa);
      osc.start(t);
      osc.stop(t + 1.6);
      setTimeout(() => anchor.remove(pa), 2000);
    },
    stop() {
      clearTimeout(timer);
      piano?.removeFromParent();
      piano?.disconnect();
      for (const m of murmurs) {
        m.removeFromParent();
        m.disconnect();
      }
      murmurs.length = 0;
      wobble?.stop();
      wobble = null;
      wobbleDepth = null;
      bus?.disconnect();
      piano = null;
      style = null;
    },
  };
}
