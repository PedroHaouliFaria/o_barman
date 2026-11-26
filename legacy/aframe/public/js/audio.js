// Breves sinais sintetizados. A primeira ação do jogador libera o contexto.
export function createAudio() {
  let context;
  let enabled = true;
  function unlock() {
    if (!enabled || !window.AudioContext) return;
    context ??= new AudioContext();
    if (context.state === 'suspended') context.resume().catch(() => {});
  }
  function play(action, ok) {
    if (action.type === 'togglePause') return;
    const frequency = !ok
      ? 145
      : ({ add: 370, deliver: 680, rinse: 280, shake: 215, stir: 310, collect: 510 }[action.type] ??
        450);
    tone(frequency, frequency * (ok ? 1.2 : 0.8), 0.12);
  }
  function tone(frequency, endFrequency, duration) {
    if (!enabled || context?.state !== 'running') return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * 0.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.01);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
  return {
    unlock,
    play,
    eventCue(id) {
      const start = { cockroach: 790, slug_slime: 210, spider: 580 }[id];
      if (start) tone(start, start * 0.48, 0.35);
    },
    toggle() {
      enabled = !enabled;
      if (enabled) unlock();
      else context?.suspend().catch(() => {});
      return enabled;
    },
  };
}
