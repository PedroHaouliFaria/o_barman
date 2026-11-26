// Medidas de cada copo no referencial do objeto de jogo "glass" (metros).
// A base fica sempre em y = BASE; boca e raio vêm dos modelos do Blender
// (public/models/props/copos.glb) ampliados em GLASS_SCALE para facilitar a mira em VR.
// JS puro para ser usado também pelos testes em Node.
export const GLASS_SCALE = 1.15;
export const BASE = -0.082;

/** @typedef {{ radius: number, rim: number, bottom: number, height: number }} GlassShape */

/** @returns {GlassShape} */
function shape(radius, height, bottomFraction = 0.08) {
  const r = radius * GLASS_SCALE,
    h = height * GLASS_SCALE;
  return { radius: r, rim: BASE + h, bottom: BASE + h * bottomFraction, height: h };
}

// Raios e alturas medidos em copos.glb (bounding box de cada nó).
/** @type {Record<string, GlassShape>} */
export const GLASS_SHAPES = {
  highball: shape(0.037, 0.15),
  rocks: shape(0.047, 0.094),
  coupe: shape(0.064, 0.142, 0.63), // a taça começa acima da haste
  mug: shape(0.047, 0.106),
};

/** Folga dos gestos dentro do copo: mexer e macerar contam um pouco além da borda. */
export const GESTURE_SLACK = 0.015;

/** @param {string | null | undefined} type @returns {GlassShape} */
export const glassShape = (type) => GLASS_SHAPES[type ?? 'highball'] ?? GLASS_SHAPES.highball;
