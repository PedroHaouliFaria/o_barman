// Interface HTML (barra, caderno, diálogos) + cena React Three Fiber.
// Porta do main.js do protótipo: mesmas telas, comandos e mensagens.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App, xrStore } from './app/App';
import { createAudio } from "./audio.js";
import { BOOK_RECIPES, createGame, GLASSES, INGREDIENTS, ORDERS } from './domain/game.js';
import { initPhysics } from './interaction/throw-physics';
import type { Station } from './scene/station';
import type { Action } from './scene/types';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import './style.css';

const game = createGame();
const audio = createAudio();
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const select = (id: string) => byId<HTMLSelectElement>(id);
let station: Station | undefined;
let sugarScooped = false;
let lastOrder = -1;
let pausedForDialog = false;
let boundXRSession: XRSession | null = null;

type IngredientId = keyof typeof INGREDIENTS;
const ingredientName = (id: string) => INGREDIENTS[id as IngredientId].name;

function updateAddButton() {
  byId('add').textContent =
    select('ingredient').value === 'sugar' ? (sugarScooped ? 'Adicionar colherada' : 'Pegar com a colher') : 'Adicionar';
}
function announce(text: string) {
  const toast = byId('feedback');
  toast.textContent = text;
  // Reinicia a animação: o aviso aparece, fica e esmaece.
  toast.classList.add('again');
  void toast.offsetWidth;
  toast.classList.remove('again');
}
function listIngredients(vessel: { ingredients: Record<string, number> }) {
  return (
    Object.entries(vessel.ingredients)
      .map(([id, units]) => units + ' × ' + ingredientName(id))
      .join(', ') || 'vazio'
  );
}
const option = (value: string | number, label: string) => new Option(label, String(value));
function readRecipe() {
  const recipe = BOOK_RECIPES[Number(select('recipe').value)];
  if (!recipe) return;
  const heading = document.createElement('h2');
  heading.textContent = recipe.name;
  const list = document.createElement('ul');
  for (const [id, units] of Object.entries(recipe.ingredients)) {
    const item = document.createElement('li');
    item.textContent = units + ' × ' + ingredientName(id);
    list.append(item);
  }
  const instructions = document.createElement('p');
  instructions.textContent = recipe.instructions;
  byId('recipe-text').replaceChildren(heading, list, instructions);
}
function showPage(id: string) {
  for (const button of document.querySelectorAll<HTMLElement>('[data-page]')) {
    const active = button.dataset.page === id;
    button.setAttribute('aria-pressed', String(active));
    byId(button.dataset.page!).hidden = !active;
  }
}
function render() {
  const { state, order } = game as { state: any; order: any };
  const playing = state.phase === 'playing';
  byId('turn-control').hidden = (playing && !state.paused) || state.phase === 'menu';
  byId('turn-control').textContent = state.paused
    ? 'Voltar ao turno'
    : state.phase === 'finished'
      ? 'Servir de novo'
      : 'Abrir o bar';
  byId('title-card').hidden = state.phase !== 'menu';
  byId('entry').hidden = state.phase !== 'menu';
  byId('service').hidden = !playing;
  byId('end').hidden = state.phase !== 'finished';
  const actNumber = (order ?? ORDERS[state.phase === 'finished' ? ORDERS.length - 1 : 0]).act;
  byId('folio').textContent = 'Ato ' + ['I', 'II', 'III', 'IV'][actNumber - 1];
  if (order) {
    if (state.orderIndex !== lastOrder) {
      sugarScooped = false;
      showPage('order');
      select('target').value = order.technique === 'shake' ? 'shaker' : 'glass';
      select('ingredient').value = Object.keys(order.ingredients)[0];
      updateAddButton();
      readRecipe();
    }
    byId('order-no').textContent =
      'Atendimento ' + String(state.orderIndex + 1).padStart(2, '0') + ' / ' + String(ORDERS.length).padStart(2, '0');
    byId('customer').textContent = order.customer;
    byId('dialogue').textContent = '“' + (state.complaint || order.dialogue) + '”';
    byId('drink').textContent = order.name;
    const stock = !state.glass.type
      ? 'Sem copo'
      : 'Copo ' +
        GLASSES[state.glass.type as keyof typeof GLASSES] +
        ' · ' +
        (state.glass.returned ? 'devolvido' : listIngredients(state.glass));
    const shakerList = listIngredients(state.shaker);
    const shakerStock =
      'Coqueteleira ' + (state.shaker.closed ? 'fechada' : 'aberta') + ' · ' + (shakerList === 'vazio' ? 'vazia' : shakerList);
    const technique = state.glass.muddled
      ? 'Maceração concluída.'
      : state.glass.stirred
        ? 'Bebida mexida.'
        : state.glass.shaken || state.shaker.shaken
          ? 'Mistura agitada.'
          : '';
    byId('contents').replaceChildren(
      ...[stock, shakerStock, technique].filter(Boolean).map((text) => {
        const line = document.createElement('p');
        line.textContent = text;
        return line;
      }),
    );
    byId('bench-stock').textContent = [stock, shakerStock, technique].filter(Boolean).join(' / ');
    select('glass-type').value = state.glass.type ?? '';
    byId('lid').textContent = state.shaker.closed ? 'Abrir tampa' : 'Fechar tampa';
    byId('pause').textContent = state.paused ? 'Retomar turno' : 'Pausar turno';
    for (const control of document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
      '#order button, #bench button, #bench select',
    ))
      control.disabled = state.paused;
    const event = state.event;
    byId('event-tools').hidden = !event || event.status === 'used';
    if (event) {
      const held = event.status === 'collected';
      const name = ingredientName(event.ingredient);
      byId('event-action').textContent = (held ? 'Adicionar ao recipiente · ' : 'Coletar · ') + name;
      byId('event-return').hidden = !held;
    }
  }
  lastOrder = playing ? state.orderIndex : -1;
  station?.render(state);
}
function act(action: Action) {
  audio.unlock();
  station?.startMusic();
  if (action.type === 'restart' || action.type === 'togglePause') sugarScooped = false;
  const result = game.dispatch(action as any);
  updateAddButton();
  render();
  if (result.ok) station?.confirmPreparation(action as any);
  announce(result.message);
  // Sons do balcão saem do objeto (src/audio/foley.ts); os bipes antigos saíram.
  if (!game.state.paused || action.type === 'togglePause') station?.actionSound(action as any, result.ok);
  return result;
}
function pauseForInterruption() {
  if (game.state.phase === 'playing' && !game.state.paused) act({ type: 'togglePause' });
}
function openInfo(markup: string) {
  pausedForDialog = game.state.phase === 'playing' && !game.state.paused;
  pauseForInterruption();
  byId('info-content').innerHTML = markup;
  byId<HTMLDialogElement>('info').showModal();
}
byId('info').addEventListener('close', () => {
  if (pausedForDialog && game.state.paused && !document.hidden) act({ type: 'togglePause' });
  pausedForDialog = false;
});
byId('open-notebook').onclick = () => byId<HTMLDialogElement>('notebook').showModal();
const fullscreen = byId('fullscreen');
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    openInfo('<h2>Tela cheia indisponível</h2><p>Use a opção de tela cheia do navegador.</p>');
  }
};
document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'Janela' : 'Tela cheia';
});
byId('help').onclick = () =>
  openInfo(
    '<h2>Como servir</h2><dl>' +
      '<dt>O pedido</dt><dd>A comanda espetada no balcão diz o drinque e o copo. O livro à direita tem a receita; toque nas páginas para folhear.</dd>' +
      '<dt>No computador</dt><dd>Arraste para olhar. Clique num copo da prateleira para pô-lo na bancada. Clique numa garrafa (atrás de você) e depois no copo ou na coqueteleira para uma dose; clique na plaqueta da garrafa para guardá-la. Gelo, limão e hortelã saem da cuba e dos potes. Açúcar: colher, pote, copo. Macerador e colher: clique no copo. Coqueteleira: tampa sobre ela, pegue-a e aperte E para agitar, tire a tampa e clique no copo. Sirva clicando no copo e na mão do cliente. Q arremessa.</dd>' +
      '<dt>No Quest 3</dt><dd>Grip pega e solta; o gatilho usa. Incline a garrafa sobre o copo para dosar. Solte porções sobre o copo. Mexa com uma volta da colher; macere com duas batidas. Agite a coqueteleira fechada e incline-a aberta sobre o copo. Solte o copo na mão do cliente. O medalhão Altura ajusta a bancada à sua postura.</dd>' +
      '<dt>Sem pressa</dt><dd>Não há relógio contra você. O Caderno também permite preparar tudo por botões.</dd></dl>',
  );
byId('credits').onclick = () =>
  openInfo(
    '<h2>Créditos</h2><p>On the House é um projeto acadêmico em desenvolvimento. A equipe ainda não informou os nomes e as atribuições dos integrantes.</p><p>Cena em React Three Fiber (Three.js) e WebXR, física Rapier. Os sons de interação são sintetizados no navegador.</p>',
  );
byId('sound').onclick = () => {
  const enabled = audio.toggle();
  station?.startMusic();
  station?.setSound(enabled);
  byId('sound').setAttribute('aria-pressed', String(enabled));
  byId('sound').textContent = 'Som';
};
byId('total-orders').textContent = ORDERS.length + ' clientes';
byId('event-action').onclick = () => {
  const event = game.state.event as { ingredient: string; status: string } | null;
  if (!event) return;
  act(
    event.status === 'available'
      ? { type: 'collect', ingredient: event.ingredient }
      : { type: 'add', ingredient: event.ingredient, target: select('target').value },
  );
};
for (const [id, info] of Object.entries(INGREDIENTS) as [string, { name: string; special?: boolean }][]) {
  if (!info.special) select('ingredient').add(option(id, info.name));
}
for (const [id, label] of Object.entries(GLASSES)) select('glass-type').add(option(id, label));
byId('turn-control').onclick = () =>
  act({ type: game.state.paused ? 'togglePause' : game.state.phase === 'finished' ? 'restart' : 'start' });
byId('start').onclick = () => act({ type: 'start' });
byId('pause').onclick = () => act({ type: 'togglePause' });
byId('height').onclick = () => station?.recenter();
select('recipe').replaceChildren(...BOOK_RECIPES.map((r, i) => option(i, r.name)));
select('recipe').onchange = () => station?.selectPage(Number(select('recipe').value));
select('ingredient').onchange = () => {
  sugarScooped = false;
  updateAddButton();
};
byId('add').onclick = () => {
  const ingredient = select('ingredient').value;
  if (ingredient === 'sugar' && !sugarScooped) {
    sugarScooped = true;
    updateAddButton();
    announce('Uma colher de açúcar pronta para adicionar.');
    return;
  }
  const result = act({ type: 'add', target: select('target').value, ingredient });
  if (result.ok) sugarScooped = false;
  updateAddButton();
};
byId('rinse').onclick = () => act({ type: 'rinse', target: select('target').value });
select('glass-type').onchange = (event) => act({ type: 'selectGlass', glass: (event.target as HTMLSelectElement).value });
for (const button of document.querySelectorAll<HTMLElement>('[data-page]')) button.onclick = () => showPage(button.dataset.page!);
for (const button of document.querySelectorAll<HTMLElement>('[data-command]'))
  button.onclick = () => act({ type: button.dataset.command! });

function onVisibility() {
  if (boundXRSession?.visibilityState === 'hidden' || boundXRSession?.visibilityState === 'visible-blurred')
    pauseForInterruption();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseForInterruption();
});
xrStore.subscribe((state, previous) => {
  if (state.session === previous.session) return;
  boundXRSession?.removeEventListener('visibilitychange', onVisibility);
  boundXRSession = state.session ?? null;
  // Em VR a interface do navegador sai da frente (no simulador ela cobriria a vista do headset).
  document.body.classList.toggle('in-xr', Boolean(state.session));
  // Simulador do Quest: ele desenha na resolução CSS da janela (metade numa tela Retina);
  // aqui volta para a resolução real da tela, para comparar com o computador de igual para igual.
  if (state.session && (window as any).__questEmulator) {
    requestAnimationFrame(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#canvas-root canvas, canvas');
      if (!canvas) return;
      canvas.width = Math.round(innerWidth * devicePixelRatio);
      canvas.height = Math.round(innerHeight * devicePixelRatio);
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    });
  }
  boundXRSession?.addEventListener('visibilitychange', onVisibility);
  if (!state.session) pauseForInterruption();
});
byId('enter-vr').onclick = async () => {
  audio.unlock();
  // O clique em "Entrar em VR" é o gesto que libera o som: o pianista já toca quando o bar aparece.
  station?.startMusic();
  try {
    if (!window.isSecureContext || !(await navigator.xr?.isSessionSupported('immersive-vr'))) {
      openInfo(
        '<h2>Acesso em VR</h2><p>Abra o protótipo no navegador do Meta Quest 3 usando um endereço HTTPS confiável. A sessão imersiva está indisponível neste navegador.</p>',
      );
      return;
    }
    await xrStore.enterVR();
  } catch (error) {
    announce('A sessão VR não abriu. ' + (error as Error).message);
  }
};

function boot(mounted: Station) {
  if (station) return;
  station = mounted;
  // Gancho para os testes automáticos de navegador (scripts/browser-check.js).
  (window as any).__barman = { game, station, act, xr: xrStore };
  render();
  byId('start').textContent = 'Preparando o bar…';
  document.body.classList.add('loading');
  mounted.whenReady.then(() => {
    for (const id of ['start', 'turn-control', 'enter-vr']) byId<HTMLButtonElement>(id).disabled = false;
    byId('start').textContent = 'Abrir o bar';
    document.body.classList.remove('loading');
    announce('Balcão pronto. Abra o bar para receber a primeira comanda.');
  });
}

// Em desenvolvimento, ?xr-emulate simula um Meta Quest 3 no navegador (sem headset).
if (import.meta.env.DEV && location.search.includes('xr-emulate')) await (await import('./dev/xr-emulate')).installQuestEmulator();
await initPhysics();
createRoot(byId('canvas-root')).render(
  createElement(App, {
    game,
    callbacks: {
      onAction: act,
      onFeedback: announce,
      onEventCue: audio.eventCue,
      onPage(index: number) {
        select('recipe').value = String(index);
        updateAddButton();
        readRecipe();
      },
    },
    onReady: boot,
  }),
);
