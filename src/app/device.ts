// Perfil do aparelho. No Quest (navegador do headset) o jogo usa a luz assada e efeitos
// mais baratos; no computador fica tudo como antes. ?quest simula o perfil no computador.
const q = new URLSearchParams(location.search);

/** Navegador do Meta Quest (ou ?quest para testar no computador). */
export const QUEST = q.has('quest') || /OculusBrowser|Quest/i.test(navigator.userAgent);
