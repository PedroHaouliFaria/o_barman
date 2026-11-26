import { GLASSES, INGREDIENTS } from './menu.js';

export function emptyGlass(type) {
  return { type, returned: false, ingredients: {}, muddled: false, stirred: false, shaken: false, transferred: false };
}

export function emptyShaker() {
  return { ingredients: {}, closed: false, shaken: false };
}

export function validateDrink(glass, order) {
  if (glass.type !== order.glass) return 'Eu pedi este drink em ' + GLASSES[order.glass] + '.';
  const missing = [];
  const extra = [];
  const ids = new Set([...Object.keys(order.ingredients), ...Object.keys(glass.ingredients)]);
  for (const id of ids) {
    const difference = (glass.ingredients[id] ?? 0) - (order.ingredients[id] ?? 0);
    const units = Math.abs(difference) + ' × ' + INGREDIENTS[id].name;
    if (difference < 0) missing.push(units);
    if (difference > 0) extra.push(units);
  }
  if (missing.length || extra.length) {
    return [
      missing.length && 'Está faltando ' + missing.join(', ') + '.',
      extra.length && 'Veio em excesso ' + extra.join(', ') + '.',
    ]
      .filter(Boolean)
      .join(' ');
  }
  if (order.technique === 'shake' && !glass.shaken) {
    return 'Eu pedi a bebida batida na coqueteleira.';
  }
  if (order.technique !== 'shake' && glass.transferred) {
    return 'Eu queria esse drink montado diretamente no copo.';
  }
  if (order.technique === 'stir' && !glass.stirred) {
    return 'Faltou mexer com a colher.';
  }
  if (order.technique === 'build' && glass.stirred) {
    return 'Eu pedi esse drink sem mexer.';
  }
  if (order.technique === 'muddle' && !glass.muddled) {
    return 'O limão e o açúcar vieram sem macerar.';
  }
  if (order.technique === 'build' && glass.muddled) {
    return 'Eu pedi esse drink sem macerar.';
  }
  return null;
}

const ok = (message) => ({ ok: true, message });
const fail = (message) => ({ ok: false, message });

function addIngredient({ glass, shaker, event }, { ingredient, target }) {
  if (!Object.hasOwn(INGREDIENTS, ingredient)) return fail('Ingrediente desconhecido.');
  if (target !== 'shaker' && target !== 'glass') return fail('Escolha um recipiente.');
  if (target === 'shaker' && shaker.closed)
    return fail('Abra a coqueteleira para adicionar ingredientes.');
  if (INGREDIENTS[ingredient].special) {
    if (event?.ingredient !== ingredient || event.status !== 'collected') {
      return fail('Colete o ingrediente ambiental deste pedido antes de adicioná-lo.');
    }
    event.status = 'used';
  }
  const vessel = target === 'glass' ? glass : shaker;
  if (target === 'glass') glass.stirred = false;
  vessel.ingredients[ingredient] = (vessel.ingredients[ingredient] ?? 0) + 1;
  vessel.shaken = false;
  return ok(INGREDIENTS[ingredient].name + (target === 'glass' ? ' no copo.' : ' na coqueteleira.'));
}

function transfer({ glass, shaker }) {
  if (shaker.closed) return fail('Abra a coqueteleira antes de transferir.');
  if (Object.keys(shaker.ingredients).length === 0) return fail('A coqueteleira está vazia.');
  if (Object.keys(glass.ingredients).length) return fail('Lave o copo antes de transferir a bebida.');
  glass.ingredients = shaker.ingredients;
  glass.shaken = shaker.shaken;
  glass.transferred = true;
  shaker.ingredients = {};
  shaker.shaken = false;
  return ok('Conteúdo da coqueteleira transferido para o copo.');
}

export function prepare(state, action) {
  const { glass, shaker, event } = state;
  if (!glass.type && (['transfer', 'stir', 'muddle'].includes(action.type) ||
      (['add', 'rinse'].includes(action.type) && action.target === 'glass'))) {
    return fail('Pegue um copo na estante.');
  }
  switch (action.type) {
    case 'collect':
      if (!event || event.ingredient !== action.ingredient) return fail('Este pedido não tem esse ingrediente ambiental.');
      if (event.status !== 'available') return fail('O ingrediente deste evento já foi coletado.');
      event.status = 'collected';
      return ok(INGREDIENTS[event.ingredient].name + ' em mãos.');
    case 'discardSpecial':
      if (event?.status !== 'collected') return fail('Nenhum ingrediente ambiental em mãos para devolver.');
      event.status = 'available';
      return ok('Ingrediente devolvido. Você pode coletá-lo novamente.');
    case 'stir':
      if (!Object.keys(glass.ingredients).length) return fail('Coloque os ingredientes no copo antes de mexer.');
      glass.stirred = true;
      return ok('Ingredientes mexidos com a colher.');
    case 'add':
      return addIngredient(state, action);
    case 'muddle':
      if (!glass.ingredients.lime || !glass.ingredients.sugar)
        return fail('Coloque limão e açúcar no copo.');
      glass.muddled = true;
      return ok('Limão e açúcar macerados.');
    case 'toggleLid':
      shaker.closed = !shaker.closed;
      return ok(shaker.closed ? 'Coqueteleira fechada.' : 'Coqueteleira aberta.');
    case 'shake':
      if (!shaker.closed) return fail('Feche a coqueteleira para agitar.');
      if (!Object.keys(shaker.ingredients).length) return fail('A coqueteleira está vazia.');
      shaker.shaken = true;
      return ok('Mistura agitada. Abra a tampa e transfira para o copo.');
    case 'transfer':
      return transfer(state);
    case 'rinse': {
      if (action.target !== 'glass' && action.target !== 'shaker') return fail('Escolha qual recipiente lavar.');
      const restoresEvent = event?.status === 'used' && state[action.target].ingredients[event.ingredient] > 0;
      if (restoresEvent) event.status = 'available';
      const recovery = restoresEvent ? ' O ingrediente ambiental pode ser coletado novamente.' : '';
      if (action.target === 'glass') {
        state.glass = emptyGlass(glass.type);
        return ok('Copo lavado.' + recovery);
      }
      state.shaker = emptyShaker();
      return ok('Coqueteleira lavada e aberta.' + recovery);
    }
    case 'selectGlass':
      if (!Object.hasOwn(GLASSES, action.glass)) return fail('Tipo de copo desconhecido.');
      if (Object.keys(glass.ingredients).length) return fail('Lave o copo antes de trocá-lo.');
      state.glass = emptyGlass(action.glass);
      return ok('Copo ' + GLASSES[action.glass] + ' na bancada.');
    default:
      return fail('Ação de preparo desconhecida.');
  }
}
