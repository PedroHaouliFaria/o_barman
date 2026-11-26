import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, GLASSES, INGREDIENTS, ORDERS } from '../src/domain/game.js';

function command(game, type, fields) {
  return game.dispatch({ type, ...fields });
}

function perform(game, type, fields) {
  const result = command(game, type, fields);
  assert.ok(result.ok, result.message);
}

function add(game, target, ...ingredients) {
  for (const ingredient of ingredients) perform(game, 'add', { target, ingredient });
}

function openShift() {
  const game = createGame();
  perform(game, 'start');
  perform(game, 'selectGlass', { glass: 'highball' });
  return game;
}

function fillCuba(game) {
  add(game, 'glass', 'rum', 'cola', 'lime', 'ice');
}

function nextCaipirinha(game) {
  if (!game.state.glass.type) perform(game, 'selectGlass', { glass: 'highball' });
  fillCuba(game);
  perform(game, 'deliver');
  perform(game, 'selectGlass', { glass: 'rocks' });
}

function nextWhiskey(game) {
  nextCaipirinha(game);
  add(game, 'glass', 'lime', 'sugar');
  perform(game, 'muddle');
  add(game, 'glass', 'cachaca', 'ice');
  perform(game, 'deliver');
  perform(game, 'selectGlass', { glass: 'coupe' });
}

function shakeAndPour(game) {
  perform(game, 'toggleLid');
  perform(game, 'shake');
  perform(game, 'toggleLid');
  perform(game, 'transfer');
}

// Oráculo independente do catálogo de produção, transcrito do quadro de pedidos.
const expectedOrders = [
  [1, 'Executivo', 'Cuba Libre', 'Highball', 'build', 'rum cola lime ice'],
  [2, 'Turista', 'Caipirinha', 'Rocks', 'muddle', 'cachaca lime sugar ice'],
  [3, 'Aposentado', 'Whiskey Sour', 'Coupe', 'shake', 'whisky lemon_juice sugar_syrup ice'],
  [4, 'Festeira', 'Margarita', 'Coupe', 'shake', 'tequila orange_liqueur lemon_juice ice'],
  [5, 'Cavalheiro', 'Negroni com barata', 'Rocks', 'stir', 'gin campari sweet_vermouth ice cockroach'],
  [6, 'Universitário', 'Mojito', 'Highball', 'muddle', 'rum mint lime sugar soda_water ice'],
  [7, 'Detetive', 'Dry Martini', 'Coupe', 'stir', 'gin dry_vermouth ice'],
  [8, 'Homem Encharcado', 'Moscow Mule com gosma', 'Caneca', 'build', 'vodka ginger_beer lemon_juice ice slug_slime'],
  [10, 'Homem Alongado', 'Martini com aranha', 'Coupe', 'stir', 'gin dry_vermouth ice spider'],
];

function prepareOrder(game) {
  const { technique, ingredients, event } = game.order;
  if (!game.state.glass.type) perform(game, 'selectGlass', { glass: game.order.glass });
  if (event) perform(game, 'collect', { ingredient: event });
  add(game, technique === 'shake' ? 'shaker' : 'glass', ...Object.keys(ingredients));
  if (technique === 'shake') shakeAndPour(game);
  if (technique === 'stir' || technique === 'muddle') perform(game, technique);
}

function reachOrder(number) {
  const game = openShift();
  while (game.order?.number < number) {
    prepareOrder(game);
    perform(game, 'deliver');
  }
  if (!game.state.glass.type) perform(game, 'selectGlass', { glass: game.order.glass });
  assert.equal(game.order?.number, number);
  return game;
}

test('DOM-01 | catálogo preserva ingredientes, clientes, técnicas e ordem narrativa do recorte', () => {
  assert.deepEqual(
    ORDERS.map((o) => [o.number, o.customer, o.name, GLASSES[o.glass], o.technique, Object.keys(o.ingredients).join(' ')]),
    expectedOrders,
  );
  assert.ok(ORDERS.every((o) => Object.values(o.ingredients).every((units) => units === 1)));
  assert.deepEqual(ORDERS.map((o) => o.act), [1, 1, 1, 1, 2, 2, 2, 2, 3]);
  assert.deepEqual(ORDERS.map((o) => o.event), [null, null, null, null, 'cockroach', null, null, 'slug_slime', 'spider']);
  assert.equal(INGREDIENTS.ice.kind, 'solid');
  assert.equal(INGREDIENTS.sugar_syrup.kind, 'liquid');
});

test('DOM-02 | nove aprovações levam ao fim do recorte, sem duplicar entregas', () => {
  const game = openShift();
  for (const [number] of expectedOrders) {
    const before = game.state.completed;
    assert.equal(game.order.number, number);
    const time = game.time;
    assert.equal(command(game, 'deliver').ok, false);
    assert.equal(game.time, time);
    assert.equal(game.state.completed, before);
    prepareOrder(game);
    assert.equal(game.state.glass.ingredients.ice, 1);
    assert.deepEqual(game.state.shaker.ingredients, {});
    assert.equal(command(game, 'transfer').ok, false);
    perform(game, 'deliver');
    assert.equal(game.state.completed, before + 1);
  }
  assert.equal(game.state.phase, 'finished');
  assert.equal(game.state.completed, 9);
  assert.equal(game.state.event, null);
  assert.equal(game.time, '00h30');
  assert.equal(game.order, null);
  assert.equal(command(game, 'deliver').ok, false);
  assert.equal(game.state.completed, 9);
});

test('DOM-03 | ingredientes ausentes, extras e dosagem repetida geram reclamação genérica e aceitam retentativa', () => {
  const game = openShift();
  add(game, 'glass', 'lime', 'ice', 'rum', 'rum', 'sugar');
  const response = command(game, 'deliver');
  assert.equal(response.ok, true);
  assert.deepEqual(game.state.glass.ingredients, { lime: 1, ice: 1, rum: 2, sugar: 1 });
  assert.equal(game.state.glass.returned, true);
  assert.ok(game.state.complaint);
  for (const detail of ['Cola', 'Rum', 'Açúcar']) assert.ok(!response.message.includes(detail));
  assert.equal(game.state.completed, 0);
  assert.equal(game.order.name, 'Cuba Libre');
  perform(game, 'rinse', { target: 'glass' });
  assert.equal(game.state.glass.returned, false);
  nextCaipirinha(game);
  assert.equal(game.state.completed, 1);
  assert.equal(command(game, 'deliver').ok, false);
  assert.equal(game.state.completed, 1);
});

test('DOM-04 | tipo do copo importa e trocar um copo ocupado preserva as doses', () => {
  const game = openShift();
  perform(game, 'selectGlass', { glass: 'rocks' });
  fillCuba(game);
  assert.equal(command(game, 'selectGlass', { glass: 'highball' }).ok, false);
  assert.equal(game.state.glass.ingredients.rum, 1);
  assert.match(command(game, 'deliver').message, /devolveu o copo/);
  perform(game, 'rinse', { target: 'glass' });
  perform(game, 'selectGlass', { glass: 'highball' });
  nextCaipirinha(game);
});

test('DOM-05 | macerar exige limão e açúcar e a Caipirinha exige maceração', () => {
  const game = openShift();
  nextCaipirinha(game);
  add(game, 'glass', 'lime');
  assert.equal(command(game, 'muddle').ok, false);
  add(game, 'glass', 'sugar', 'ice', 'cachaca');
  perform(game, 'deliver');
  assert.match(game.state.complaint, /Caipirinha/);
  perform(game, 'muddle');
  perform(game, 'deliver');
  assert.equal(game.state.glass.muddled, false);
});

test('DOM-06 | coqueteleira exige mistura e tampa fechada, bloqueia inserção e transferência fechada', () => {
  const game = openShift();
  assert.equal(command(game, 'transfer').ok, false);
  perform(game, 'toggleLid');
  assert.equal(command(game, 'shake').ok, false);
  perform(game, 'toggleLid');
  add(game, 'shaker', 'whisky');
  assert.equal(command(game, 'shake').ok, false);
  perform(game, 'toggleLid');
  assert.equal(command(game, 'add', { ingredient: 'ice', target: 'shaker' }).ok, false);
  perform(game, 'shake');
  assert.equal(command(game, 'transfer').ok, false);
  assert.deepEqual(game.state.shaker.ingredients, { whisky: 1 });
  perform(game, 'toggleLid');
  perform(game, 'transfer');
  assert.equal(game.state.glass.shaken, true);
});

test('DOM-07 | adicionar ingredientes depois de agitar requer nova agitação para o Whiskey Sour', () => {
  const game = openShift();
  nextWhiskey(game);
  add(game, 'shaker', 'whisky', 'lemon_juice', 'sugar_syrup');
  perform(game, 'toggleLid');
  perform(game, 'shake');
  perform(game, 'toggleLid');
  add(game, 'shaker', 'ice');
  perform(game, 'transfer');
  perform(game, 'deliver');
  assert.ok(game.state.complaint);
  perform(game, 'rinse', { target: 'glass' });
  add(game, 'shaker', 'whisky', 'lemon_juice', 'sugar_syrup');
  shakeAndPour(game);
  add(game, 'glass', 'ice');
  perform(game, 'deliver');
  assert.ok(game.state.complaint);
});

test('DOM-08 | pia limpa só o recipiente escolhido, inclusive a tampa e as marcas de técnica', () => {
  const game = openShift();
  nextCaipirinha(game);
  add(game, 'glass', 'lime', 'sugar');
  perform(game, 'muddle');
  add(game, 'shaker', 'rum');
  perform(game, 'toggleLid');
  perform(game, 'shake');
  perform(game, 'rinse', { target: 'glass' });
  assert.equal(game.state.glass.muddled, false);
  assert.deepEqual(game.state.glass.ingredients, {});
  assert.equal(game.state.shaker.shaken, true);
  perform(game, 'rinse', { target: 'shaker' });
  assert.deepEqual(game.state.shaker, { ingredients: {}, closed: false, shaken: false });
  assert.equal(game.order.name, 'Caipirinha');
});

test('DOM-09 | pausa bloqueia entrega, adição e pia; retomada conserva o preparo', () => {
  const game = openShift();
  fillCuba(game);
  perform(game, 'togglePause');
  assert.equal(command(game, 'deliver').ok, false);
  assert.equal(command(game, 'rinse', { target: 'glass' }).ok, false);
  assert.equal(command(game, 'add', { ingredient: 'rum', target: 'glass' }).ok, false);
  assert.equal(game.state.glass.ingredients.rum, 1);
  assert.equal(game.state.completed, 0);
  perform(game, 'togglePause');
  perform(game, 'deliver');
  assert.equal(game.state.completed, 1);
});

test('DOM-10 | menu bloqueia preparo e reinício zera sessão, recipientes, progresso e pausa', () => {
  const game = createGame();
  assert.equal(game.state.phase, 'menu');
  assert.equal(command(game, 'add', { ingredient: 'ice', target: 'glass' }).ok, false);
  perform(game, 'start');
  nextCaipirinha(game);
  add(game, 'glass', 'lime');
  add(game, 'shaker', 'cachaca');
  perform(game, 'toggleLid');
  perform(game, 'togglePause');
  perform(game, 'restart');
  const fresh = createGame();
  perform(fresh, 'start');
  assert.deepEqual(game.state, fresh.state);
  assert.equal(game.order.name, 'Cuba Libre');
});

test('DOM-11 | entradas desconhecidas não alteram a preparação', () => {
  const game = openShift();
  for (const [type, fields] of [
    ['add', { ingredient: 'cafe', target: 'glass' }],
    ['add', { ingredient: 'rum', target: 'balde' }],
    ['selectGlass', { glass: 'balde' }],
    ['rinse', { target: 'balde' }],
    ['teleporte', {}],
  ]) {
    assert.equal(command(game, type, fields).ok, false);
  }
  assert.deepEqual(game.state.glass.ingredients, {});
  assert.deepEqual(game.state.shaker.ingredients, {});
  assert.equal(game.state.glass.type, 'highball');
});

test('DOM-12 | preparo montado na coqueteleira é rejeitado e transferência exige copo vazio', () => {
  const game = openShift();
  add(game, 'shaker', 'rum', 'cola', 'lime', 'ice');
  add(game, 'glass', 'sugar');
  assert.equal(command(game, 'transfer').ok, false);
  assert.equal(game.state.shaker.ingredients.ice, 1);
  perform(game, 'rinse', { target: 'glass' });
  perform(game, 'transfer');
  perform(game, 'deliver');
  assert.match(game.state.feedback, /devolveu o copo/);
});

test('Caipirinha completa na taça Coupe mantém a Turista aguardando o Rocks', () => {
  const game = openShift();
  nextCaipirinha(game);
  perform(game, 'selectGlass', { glass: 'coupe' });
  add(game, 'glass', 'lime', 'sugar');
  perform(game, 'muddle');
  add(game, 'glass', 'cachaca', 'ice');
  const result = command(game, 'deliver');
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.message, /Rocks/);
  assert.equal(game.order.id, 'caipirinha');
});


for (const [number, ingredient] of [[5, 'cockroach'], [8, 'slug_slime'], [10, 'spider']]) {
  test('ENV-' + number + ' | coleta única, descarte, recipiente errado, pia e nova coleta de ' + ingredient, () => {
    const game = reachOrder(number);
    assert.deepEqual(game.state.event, { ingredient, status: 'available' });
    assert.equal(command(game, 'add', { ingredient, target: 'glass' }).ok, false);
    assert.equal(command(game, 'collect', { ingredient: 'rum' }).ok, false);
    perform(game, 'collect', { ingredient });
    assert.equal(command(game, 'collect', { ingredient }).ok, false);
    perform(game, 'discardSpecial');
    assert.equal(game.state.event.status, 'available');
    perform(game, 'collect', { ingredient });
    perform(game, 'toggleLid');
    assert.equal(command(game, 'add', { ingredient, target: 'shaker' }).ok, false);
    assert.equal(game.state.event.status, 'collected');
    perform(game, 'toggleLid');
    add(game, 'shaker', ingredient);
    assert.equal(game.state.event.status, 'used');
    assert.equal(command(game, 'add', { ingredient, target: 'glass' }).ok, false);
    perform(game, 'rinse', { target: 'glass' });
    assert.equal(game.state.event.status, 'used');
    perform(game, 'transfer');
    perform(game, 'rinse', { target: 'shaker' });
    assert.equal(game.state.event.status, 'used');
    perform(game, 'rinse', { target: 'glass' });
    assert.equal(game.state.event.status, 'available');
    prepareOrder(game);
    perform(game, 'deliver');
    assert.ok(game.state.event?.ingredient !== ingredient);
  });
}

test('ENV-0 | eventos só existem no pedido correto e não avançam durante pausa ou após reinício', () => {
  const game = openShift();
  assert.equal(game.state.event, null);
  assert.equal(command(game, 'collect', { ingredient: 'cockroach' }).ok, false);
  assert.equal(command(game, 'add', { ingredient: 'spider', target: 'glass' }).ok, false);
  const eventGame = reachOrder(5);
  perform(eventGame, 'togglePause');
  assert.equal(command(eventGame, 'collect', { ingredient: 'cockroach' }).ok, false);
  assert.equal(eventGame.state.event.status, 'available');
  perform(eventGame, 'togglePause');
  perform(eventGame, 'collect', { ingredient: 'cockroach' });
  perform(eventGame, 'restart');
  assert.equal(eventGame.state.event, null);
  assert.equal(eventGame.state.completed, 0);
});

test('DOM-13 | mexer antes da última porção requer nova mistura com a colher', () => {
  const game = reachOrder(7);
  assert.equal(command(game, 'stir').ok, false);
  add(game, 'glass', 'gin', 'dry_vermouth');
  perform(game, 'stir');
  add(game, 'glass', 'ice');
  const result = command(game, 'deliver');
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.message, /colher/);
  assert.equal(game.state.glass.stirred, false);
  perform(game, 'stir');
  perform(game, 'deliver');
  assert.equal(game.order.number, 8);
  assert.equal(game.state.glass.stirred, false);
});

test('ENV-REC | lavar diretamente a coqueteleira recupera o especial sem perder o atendimento', () => {
  const game = reachOrder(8);
  perform(game, 'collect', { ingredient: 'slug_slime' });
  add(game, 'shaker', 'slug_slime');
  perform(game, 'rinse', { target: 'shaker' });
  assert.equal(game.state.event.status, 'available');
  assert.equal(game.order.number, 8);
  assert.equal(game.time, '23h45');
});

test('gorjetas acumulam 10, 3 ou 0 moedas conforme as entregas erradas de cada pedido', () => {
  const game = openShift();
  for (const [mistakes, total] of [[0, 10], [1, 13], [2, 13], [3, 13], [0, 23]]) {
    perform(game, 'selectGlass', { glass: game.order.glass });
    const previous = game.state.tips;
    for (let attempt = 0; attempt < mistakes; attempt++) {
      add(game, 'glass', 'ice');
      perform(game, 'deliver');
      perform(game, 'rinse', { target: 'glass' });
      assert.equal(game.state.tips, previous);
    }
    prepareOrder(game);
    perform(game, 'deliver');
    assert.equal(game.state.tips, total);
  }
  perform(game, 'restart');
  assert.equal(game.state.tips, 0);
});

test('cada cliente aguarda a escolha manual do copo, inclusive no primeiro pedido', () => {
  const game = createGame();
  perform(game, 'start');
  for (const order of ORDERS) {
    assert.equal(game.state.glass.type, null);
    assert.equal(command(game, 'add', { target: 'glass', ingredient: 'ice' }).ok, false);
    assert.equal(command(game, 'deliver').ok, false);
    assert.equal(game.state.orderMistakes, 0);
    add(game, 'shaker', 'ice');
    assert.equal(command(game, 'transfer').ok, false);
    assert.equal(game.state.shaker.ingredients.ice, 1);
    perform(game, 'rinse', { target: 'shaker' });
    perform(game, 'selectGlass', { glass: order.glass });
    prepareOrder(game);
    perform(game, 'deliver');
  }
});
