import { ORDERS, SAMPLE_END_TIME } from './menu.js';
import { emptyGlass, emptyShaker, prepare, validateDrink } from './preparation.js';

export { BOOK_RECIPES, GLASSES, INGREDIENTS, ORDERS } from './menu.js';

const complaints = [
  name => `Eu pedi ${name}. Isso aqui é suco de fossa com guarda-chuvinha!`,
  name => `Um gole e meu arroto pediu demissão. Cadê meu pedido de ${name}?`,
  name => `Isso tem gosto de meia que o defunto usou no velório. Eu pedi ${name}!`,
  name => `Pedi ${name}. Quem foi que torceu a fralda do capeta no meu copo?`,
  name => `Puta merda, até o ralo cuspiu de volta! Meu pedido era ${name}.`,
];

function initialState() {
  return {
    phase: 'menu',
    paused: false,
    completed: 0,
    tips: 0,
    orderMistakes: 0,
    complaint: '',
    orderIndex: 0,
    event: null,
    glass: emptyGlass(null),
    shaker: emptyShaker(),
    feedback: 'Inicie o atendimento.',
  };
}

export function createGame() {
  let state = initialState();

  function report(ok, message) {
    state.feedback = message;
    return { ok, message };
  }

  function deliver() {
    const order = ORDERS[state.orderIndex];
    if (!state.glass.type) return report(false, 'Pegue um copo na estante.');
    if (validateDrink(state.glass, order)) {
      state.orderMistakes++;
      const choices = complaints.map(write => write(order.name)).filter(line => line !== state.complaint);
      state.complaint = choices[Math.floor(Math.random() * choices.length)];
      state.glass.returned = Object.keys(state.glass.ingredients).length > 0;
      return report(state.glass.returned,
        order.customer + ' devolveu o copo. “' + state.complaint + '”');
    }
    state.complaint = '';

    const tip = [10, 3][state.orderMistakes] ?? 0;
    state.tips += tip;
    state.orderMistakes = 0;
    state.completed++;
    state.orderIndex++;
    const next = ORDERS[state.orderIndex];
    state.event = next?.event ? { ingredient: next.event, status: 'available' } : null;
    state.glass = emptyGlass(null);
    state.shaker = emptyShaker();
    if (!next) {
      state.phase = 'finished';
      return report(true, order.name + ' aprovado. Você concluiu os ' + state.completed + ' pedidos deste protótipo.');
    }
    return report(true, order.name + ' aprovado. Próximo cliente: ' + next.customer + '.');
  }

  return {
    get state() {
      return state;
    },
    get time() {
      return ORDERS[state.orderIndex]?.time ?? SAMPLE_END_TIME;
    },
    get order() {
      return state.phase === 'playing' ? ORDERS[state.orderIndex] : null;
    },
    dispatch(action) {
      if (action.type === 'restart' || (action.type === 'start' && state.phase === 'menu')) {
        state = initialState();
        state.phase = 'playing';
        return report(true, ORDERS[0].customer + ' aguarda atendimento.');
      }
      if (state.phase !== 'playing')
        return report(false, 'O atendimento está encerrado ou ainda não começou.');
      if (action.type === 'togglePause') {
        state.paused = !state.paused;
        return report(true, state.paused ? 'Atendimento pausado.' : 'Atendimento retomado.');
      }
      if (state.paused) return report(false, 'Retome o atendimento para continuar.');
      if (action.type === 'deliver') return deliver();
      const result = prepare(state, action);
      return report(result.ok, result.message);
    },
  };
}
