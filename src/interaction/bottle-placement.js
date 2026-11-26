// Alturas e áreas úteis em coordenadas locais da estação, em metros. A queda
// virtual termina no apoio sob a mão e o cilindro repousa na vertical.
// Layout do bar Âmbar Noturno com a estante aproximada (src/scene/art-bar.ts):
// complementos na frente do tampo do armário de trás, uma fileira de alcoólicos
// atrás deles e outra na primeira prateleira, todas a até ~0,85 m do jogador.
export const bottleShelves = [
  { top: 1.052, z: 0.5, width: 1.2, stock: ['cola', 'soda_water', 'ginger_beer', 'lemon_juice', 'sugar_syrup'] },
  { top: 1.052, z: 0.74, width: 1.2, stock: ['vodka', 'orange_liqueur', 'campari', 'sweet_vermouth', 'dry_vermouth'] },
  { top: 1.492, z: 0.83, width: 1.2, stock: ['rum', 'cachaca', 'whisky', 'tequila', 'gin'] },
];

/** Espaço entre garrafas vizinhas na mesma fileira. */
export const BOTTLE_SPACING = 0.2;

const surfaces = [
  { xMin: -1.22, xMax: 1.22, zMin: -1.18, zMax: -0.5, y: 1.083 },
  { xMin: -1.21, xMax: -0.73, zMin: -0.55, zMax: 0.12, y: 1.083 },
  { xMin: 0.73, xMax: 1.21, zMin: -0.55, zMax: 0.12, y: 1.083 },
  // tapete de borracha da área de preparo (mais alto que o tampo)
  { xMin: -0.33, xMax: 0.29, zMin: -0.85, zMax: -0.59, y: 1.092 },
  // tampo do armário de trás e primeira prateleira
  { xMin: -2.6, xMax: 2.6, zMin: 0.36, zMax: 0.92, y: 1.052, back: true },
  { xMin: -2.35, xMax: 2.35, zMin: 0.68, zMax: 0.98, y: 1.492, back: true },
];

export function bottleSurfaceAt({ x, y, z }) {
  const onFloor = x > -3.30 && x < 3.30 && z > -3.68 && z < 1.40;
  let highest = onFloor ? -0.01 : null;
  for (const surface of surfaces) {
    if (x < surface.xMin || x > surface.xMax || z < surface.zMin || z > surface.zMax) continue;
    // A pose tracked inside a cabinet still rests the bottle on its worktop.
    // On the open shelves, use the highest board below the grip.
    if (surface.back && y < surface.y - 0.04) continue;
    if (highest === null || surface.y > highest) highest = surface.y;
  }
  return highest;
}

/** Superfície onde um objeto solto devagar assenta (a mais alta sob ele, sem contar o piso). */
export function restingSurfaceAt(point) {
  return bottleSurfaceAt(point);
}

/**
 * Distância da origem do objeto de jogo até a sua base, para assentá-lo em pé.
 * null = o objeto não assenta (porções, utensílios e bichos caem com física).
 */
export function settleHeight(id, kind, state) {
  if (id === 'glass') return state?.glass?.type ? 0.082 : null;
  if (id === 'shaker') return 0.11;
  if (kind === 'liquid') return 0.0945;
  return null;
}
