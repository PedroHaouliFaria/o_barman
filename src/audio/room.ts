// Murmúrio das mesas do salão: vozes indistintas (ruído marrom filtrado na faixa da fala,
// com "sílabas" de amplitude), cada mesa como uma fonte posicional. Sem samples baixados.
import * as THREE from 'three';

export function createMurmurs(listener: THREE.AudioListener, anchors: THREE.Object3D[]) {
  const ctx = listener.context;
  const seconds = 6;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const sources: THREE.PositionalAudio[] = [];
  const nodes: AudioScheduledSourceNode[] = [];
  for (const anchor of anchors) {
    const voice = ctx.createBufferSource();
    voice.buffer = buffer;
    voice.loop = true;
    voice.playbackRate.value = 0.85 + Math.random() * 0.3;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 380 + Math.random() * 220;
    band.Q.value = 1.6;
    const syllables = ctx.createGain();
    syllables.gain.value = 0.045;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 2.2 + Math.random() * 2.4;
    const depth = ctx.createGain();
    depth.gain.value = 0.035;
    lfo.connect(depth).connect(syllables.gain);
    voice.connect(band).connect(syllables);
    const out = ctx.createGain();
    syllables.connect(out);
    const speaker = new THREE.PositionalAudio(listener);
    speaker.setRefDistance(1.4);
    speaker.setRolloffFactor(1.1);
    speaker.setNodeSource(out as unknown as AudioBufferSourceNode);
    speaker.setVolume(0);
    anchor.add(speaker);
    sources.push(speaker);
    nodes.push(voice, lfo);
  }
  let started = false;
  return {
    start() {
      if (started) return;
      started = true;
      const t = ctx.currentTime;
      nodes.forEach((n) => n.start(t + Math.random()));
    },
    /** 0..1; o salão vai ficando quieto conforme a noite piora */
    setLevel(level: number) {
      for (const s of sources) s.setVolume(level);
    },
    dispose() {
      for (const s of sources) {
        s.removeFromParent();
        s.disconnect();
      }
    },
  };
}
