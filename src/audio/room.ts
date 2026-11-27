// Conversa das mesas do salão: cada mesa toca uma conversa gravada por voz sintética
// (public/audio/conversa_mesa*.ogg, gerada no Windows por art/audio/gerar_conversa.py),
// como fonte posicional, em laço e com começo aleatório. Enquanto o áudio não carrega, ou
// se falhar, fica o murmúrio antigo (ruído marrom na faixa da fala).
import * as THREE from 'three';

const TALKS = ['conversa_mesa1', 'conversa_mesa2', 'conversa_mesa3'];

export function createMurmurs(listener: THREE.AudioListener, anchors: THREE.Object3D[]) {
  const ctx = listener.context;
  const talks: THREE.PositionalAudio[] = [];
  const loader = new THREE.AudioLoader();
  let talkLevel = 1;
  let talkStarted = false;
  const buffers = Promise.all(
    TALKS.map((name) => loader.loadAsync(import.meta.env.BASE_URL + 'audio/' + name + '.ogg').catch(() => null)),
  );
  anchors.forEach((anchor, i) => {
    const a = new THREE.PositionalAudio(listener);
    a.setRefDistance(1.3);
    a.setRolloffFactor(1.25);
    a.position.set(0, 1.1, 0);
    anchor.add(a);
    talks.push(a);
    a.userData.talk = i % TALKS.length;
  });
  function startTalks() {
    buffers.then((list) => {
      if (!talkStarted) return;
      talks.forEach((a) => {
        const b = list[a.userData.talk];
        if (!b || a.isPlaying) return;
        a.setBuffer(b);
        a.setLoop(true);
        a.setVolume(0.55 * talkLevel);
        a.offset = Math.random() * b.duration;
        a.setPlaybackRate(0.97 + Math.random() * 0.06);
        a.play();
      });
      if (list.some(Boolean)) for (const s of sources) s.setVolume(0);
    });
  }
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
      talkStarted = true;
      startTalks();
      if (started) return;
      started = true;
      const t = ctx.currentTime;
      nodes.forEach((n) => n.start(t + Math.random()));
    },
    /** 0..1; o salão vai ficando quieto conforme a noite piora */
    setLevel(level: number) {
      talkLevel = level;
      for (const a of talks) a.setVolume(0.55 * level);
      buffers.then((list) => {
        for (const s of sources) s.setVolume(list.some(Boolean) ? 0 : level);
      });
    },
    dispose() {
      for (const a of talks) {
        if (a.isPlaying) a.stop();
        a.removeFromParent();
      }
      for (const s of sources) {
        s.removeFromParent();
        s.disconnect();
      }
    },
  };
}
