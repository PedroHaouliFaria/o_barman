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
  byId('feedback').textContent = text;
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
  byId('turn-control').hidden = playing && !state.paused;
  byId('turn-control').textContent = state.paused
    ? 'Retomar turno'
    : state.phase === 'finished'
      ? 'Reiniciar turno'
      : 'Iniciar turno';
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
    const stock =
      'Copo ' +
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
    select('glass-type').value = state.glass.type;
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
  if (action.type === 'restart' || action.type === 'togglePause') sugarScooped = false;
  const result = game.dispatch(action as any);
  updateAddButton();
  render();
  if (result.ok && action.type === 'add') station?.ingredientAdded(action as any);
  announce(result.message);
  if (!game.state.paused) audio.play(action, result.ok);
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
  fullscreen.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
});
byId('help').onclick = () =>
  openInfo(
    '<h2>Controles</h2><dl><dt>Desktop</dt><dd>Arraste para olhar ao redor. Clique numa garrafa da estante atrás de você, vire até o balcão e clique no copo ou na coqueteleira para dosar. Volte à estante e clique na base com o nome da bebida para guardá-la. Pegue gelo na cuba à esquerda, limão e hortelã nos potes. Para o açúcar, clique na colher, no pote e no recipiente. Para servir, clique no copo pronto e depois no cliente. Com um objeto na mão, mire no alvo e pressione E para usá-lo. Pressione Q para arremessar.</dd><dt>Preparo assistido</dt><dd>Abra Bancada para trabalhar com ingredientes e utensílios por botões. Confira o Manual e entregue pela Comanda.</dd><dt>Meta Quest 3</dt><dd>Use o grip para pegar e soltar e o gatilho para interagir. Incline a garrafa sobre o recipiente para dosar e solte o grip durante o movimento para arremessá-la. Pegue as porções nos potes ou na cuba de gelo e solte sobre o recipiente. Mergulhe a colher no açúcar e leve a colherada para dentro do recipiente. Para mexer, faça uma volta com a colher dentro do copo. Para macerar o limão com açúcar, dê duas batidas com o macerador. Para fechar a coqueteleira, pegue a tampa ao lado e solte-a sobre a boca. Pegue a tampa encaixada para abrir. Para servir, solte o grip junto à mão estendida do cliente. O comando Altura ajusta a estação à sua postura.</dd></dl>',
  );
byId('credits').onclick = () =>
  openInfo(
    '<h2>Créditos</h2><p>On the House é um projeto acadêmico em desenvolvimento. A equipe ainda não informou os nomes e as atribuições dos integrantes.</p><p>Cena em React Three Fiber (Three.js) e WebXR, física Rapier. Os sons de interação são sintetizados no navegador.</p>',
  );
byId('sound').onclick = () => {
  const enabled = audio.toggle();
  byId('sound').setAttribute('aria-pressed', String(enabled));
  byId('sound').textContent = enabled ? 'Som ligado' : 'Som desligado';
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
  boundXRSession?.addEventListener('visibilitychange', onVisibility);
  if (!state.session) pauseForInterruption();
});
byId('enter-vr').onclick = async () => {
  audio.unlock();
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
  for (const id of ['start', 'turn-control', 'enter-vr']) byId<HTMLButtonElement>(id).disabled = false;
  announce('Balcão pronto. Inicie o turno para receber a primeira comanda.');
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
