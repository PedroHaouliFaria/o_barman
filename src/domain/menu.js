// Uma unidade corresponde a uma dose ou porção virtual.
export const INGREDIENTS = {
  rum: { name: 'Rum', kind: 'liquid' },
  cola: { name: 'Cola', kind: 'liquid' },
  lime: { name: 'Limão', kind: 'solid' },
  ice: { name: 'Gelo', kind: 'solid' },
  cachaca: { name: 'Cachaça', kind: 'liquid' },
  sugar: { name: 'Açúcar', kind: 'solid' },
  whisky: { name: 'Whisky', kind: 'liquid' },
  lemon_juice: { name: 'Suco de limão', kind: 'liquid' },
  sugar_syrup: { name: 'Xarope de açúcar', kind: 'liquid' },
  tequila: { name: 'Tequila', kind: 'liquid' },
  orange_liqueur: { name: 'Licor de laranja', kind: 'liquid' },
  gin: { name: 'Gin', kind: 'liquid' },
  campari: { name: 'Campari', kind: 'liquid' },
  sweet_vermouth: { name: 'Vermute tinto', kind: 'liquid' },
  cockroach: { name: 'Barata', kind: 'solid', special: true },
  mint: { name: 'Hortelã', kind: 'solid' },
  soda_water: { name: 'Água com gás', kind: 'liquid' },
  dry_vermouth: { name: 'Vermute seco', kind: 'liquid' },
  vodka: { name: 'Vodka', kind: 'liquid' },
  ginger_beer: { name: 'Ginger beer', kind: 'liquid' },
  slug_slime: { name: 'Gosma de lesma', kind: 'solid', special: true },
  spider: { name: 'Aranha', kind: 'solid', special: true },
};

export const GLASSES = {
  highball: 'Highball',
  rocks: 'Rocks',
  coupe: 'Coupe',
  mug: 'Caneca',
};

export const ORDERS = [
  {
    id: 'cuba_libre', number: 1, act: 1, event: null,
    time: '22h00',
    customer: 'Executivo',
    dialogue: 'Que dia desgraçado... Me vê um Cuba Libre, por favor.',
    name: 'Cuba Libre',
    ingredients: { rum: 1, cola: 1, lime: 1, ice: 1 },
    technique: 'build',
    glass: 'highball',
    instructions: 'Monte diretamente no copo Highball, com uma unidade de cada ingrediente.',
  },
  {
    id: 'caipirinha', number: 2, act: 1, event: null,
    time: '22h15',
    customer: 'Turista',
    dialogue: 'Me disseram que aqui fazem uma ótima caipirinha!',
    name: 'Caipirinha',
    ingredients: { cachaca: 1, lime: 1, sugar: 1, ice: 1 },
    technique: 'muddle',
    glass: 'rocks',
    instructions: 'No copo Rocks, macere o limão com o açúcar. Junte a cachaça e o gelo.',
  },
  {
    id: 'whiskey_sour', number: 3, act: 1, event: null,
    time: '22h30',
    customer: 'Aposentado',
    dialogue: 'Um Whiskey Sour, meu jovem. Sem pressa.',
    name: 'Whiskey Sour',
    ingredients: { whisky: 1, lemon_juice: 1, sugar_syrup: 1, ice: 1 },
    technique: 'shake',
    glass: 'coupe',
    instructions: 'Coloque tudo na coqueteleira. Feche, agite, abra e transfira para a taça Coupe.',
  },
  {
    id: 'margarita', number: 4, act: 1, event: null,
    time: '22h45', customer: 'Festeira', name: 'Margarita',
    dialogue: 'Uma Margarita! A noite está só começando.',
    ingredients: { tequila: 1, orange_liqueur: 1, lemon_juice: 1, ice: 1 },
    technique: 'shake', glass: 'coupe',
    instructions: 'Coloque tudo na coqueteleira. Feche, agite, abra e transfira para a taça Coupe.',
  },
  {
    id: 'negroni_cockroach', number: 5, act: 2, event: 'cockroach',
    time: '23h00', customer: 'Cavalheiro', name: 'Negroni com barata', recipeName: 'Negroni',
    dialogue: 'Um Negroni, por gentileza. Com uma barata. Aquela no balcão servirá perfeitamente.',
    ingredients: { gin: 1, campari: 1, sweet_vermouth: 1, ice: 1, cockroach: 1 },
    technique: 'stir', glass: 'rocks',
    instructions: 'Junte gin, Campari, vermute tinto e gelo no Rocks e mexa com a colher.',
  },
  {
    id: 'mojito', number: 6, act: 2, event: null,
    time: '23h15', customer: 'Universitário', name: 'Mojito',
    dialogue: 'E aí, chefe! Consegue fazer um Mojito?',
    ingredients: { rum: 1, mint: 1, lime: 1, sugar: 1, soda_water: 1, ice: 1 },
    technique: 'muddle', glass: 'highball',
    instructions: 'Macere limão e açúcar no Highball. Junte hortelã, rum, água com gás e gelo.',
  },
  {
    id: 'dry_martini', number: 7, act: 2, event: null,
    time: '23h30', customer: 'Detetive', name: 'Dry Martini',
    dialogue: 'Um Dry Martini. Você começou a trabalhar aqui recentemente?',
    ingredients: { gin: 1, dry_vermouth: 1, ice: 1 },
    technique: 'stir', glass: 'coupe',
    instructions: 'Coloque gin, vermute seco e gelo na taça Coupe. Mexa com a colher.',
  },
  {
    id: 'moscow_mule_slime', number: 8, act: 2, event: 'slug_slime',
    time: '23h45', customer: 'Homem Encharcado', name: 'Moscow Mule com gosma', recipeName: 'Moscow Mule',
    dialogue: 'Um Moscow Mule. Com aquela gosma... Não seja econômico.',
    ingredients: { vodka: 1, ginger_beer: 1, lemon_juice: 1, ice: 1, slug_slime: 1 },
    technique: 'build', glass: 'mug',
    instructions: 'Monte a bebida diretamente na caneca com vodka, ginger beer, suco de limão e gelo.',
  },
  {
    id: 'martini_spider', number: 10, act: 3, event: 'spider',
    time: '00h15', customer: 'Homem Alongado', name: 'Martini com aranha', recipeName: 'Martini',
    dialogue: 'Um Martini. Há algo no teto que gostaria que acrescentasse.',
    ingredients: { gin: 1, dry_vermouth: 1, ice: 1, spider: 1 },
    technique: 'stir', glass: 'coupe',
    instructions: 'Coloque gin, vermute seco e gelo na taça Coupe. Mexa com a colher.',
  },
];

function checkMenu() {
  const ids = new Set();
  for (const order of ORDERS) {
    if (
      ids.has(order.id) ||
      !Object.hasOwn(GLASSES, order.glass) ||
      !['build', 'muddle', 'shake', 'stir'].includes(order.technique)
    ) {
      throw new Error('Dados de pedido inválidos: ' + order.id);
    }
    ids.add(order.id);
    const specials = Object.keys(order.ingredients).filter((id) => INGREDIENTS[id]?.special);
    if (specials.length !== Number(Boolean(order.event)) || (order.event && !specials.includes(order.event))) {
      throw new Error('Evento incompatível com os ingredientes: ' + order.id);
    }
    const entries = Object.entries(order.ingredients);
    if (
      !entries.length ||
      entries.some(
        ([id, units]) => !Object.hasOwn(INGREDIENTS, id) || !Number.isInteger(units) || units < 1,
      )
    ) {
      throw new Error('Ingredientes inválidos: ' + order.id);
    }
  }
}

checkMenu();

export const BOOK_RECIPES = ORDERS.map(order => ({
  name: order.recipeName ?? order.name,
  glass: order.glass,
  ingredients: Object.fromEntries(Object.entries(order.ingredients).filter(([id]) => !INGREDIENTS[id].special)),
  instructions: order.instructions,
}));

export const SAMPLE_END_TIME = '00h30';
