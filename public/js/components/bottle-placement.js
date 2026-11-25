// Alturas e áreas úteis em coordenadas locais da estação, em metros. A queda
// virtual termina no apoio sob a mão e o cilindro repousa na vertical.
export const bottleShelves = [
  { top: 1.10, width: 1.36, stock: ['cola', 'soda_water', 'ginger_beer', 'lemon_juice', 'sugar_syrup'] },
  { top: 1.42, width: 1.36, stock: ['vodka', 'orange_liqueur', 'campari', 'sweet_vermouth', 'dry_vermouth'] },
  { top: 1.74, width: 1.36, stock: ['rum', 'cachaca', 'whisky', 'tequila', 'gin'] },
];

const surfaces = [
  { xMin: -1.22, xMax: 1.22, zMin: -1.14, zMax: -0.54, y: 1.083 },
  { xMin: -1.21, xMax: -0.73, zMin: -0.55, zMax: 0.12, y: 1.083 },
  { xMin: 0.73, xMax: 1.21, zMin: -0.55, zMax: 0.12, y: 1.083 },
  ...bottleShelves.map(({ top, width }) => ({
    xMin: -width / 2 + 0.05, xMax: width / 2 - 0.05, zMin: 0.70, zMax: 0.86, y: top
  })),
];

export function bottleSurfaceAt({ x, y, z }) {
  const onFloor = x > -3.30 && x < 3.30 && z > -3.68 && z < 1.40;
  let highest = onFloor ? -0.01 : null;
  for (const surface of surfaces) {
    if (x < surface.xMin || x > surface.xMax || z < surface.zMin || z > surface.zMax) continue;
    // A pose tracked inside a cabinet still rests the bottle on its worktop.
    // On the open shelves, use the highest board below the grip.
    if (surface.zMin > 0 && y < surface.y - 0.04) continue;
    if (highest === null || surface.y > highest) highest = surface.y;
  }
  return highest;
}
