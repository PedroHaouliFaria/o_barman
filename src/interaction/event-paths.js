// Trajetos dos eventos ambientais (lógica pura, copiada do protótipo A-Frame).
export const EVENT_HINT_DELAY = 12000;

export const EVENT_SOURCES = {
  cockroach: {
    position: [0, 0.77, -0.544],
    clue: 'Barata no balcão',
    hint: 'Olhe para baixo, na face interna do balcão.',
  },
  slug_slime: {
    position: [0, -0.009, 0.78],
    clue: 'Há um rastro no chão sob a estante de bebidas.',
    hint: 'Atrás de você, no chão sob as garrafas, clique no rastro ou use o gatilho para colher a gosma.',
  },
  spider: {
    position: [0, 1.98, -0.12],
    clue: 'Aranha no fio',
    hint: 'A aranha desce do teto sobre você. Mire nela e use o gatilho ou clique.',
  },
};

const slugStraight = 0.82;
const slugRadius = 0.16;
const slugBend = Math.PI * slugRadius;
const slugLap = 2 * (slugStraight + slugBend);
const slugSpeed = 0.000095; // meters per millisecond of animation
const trailLength = 0.55;
// Distance along a closed track on the floor, with tangent angle in the XZ plane.
export function slugTrack(distance) {
  const path = distance % slugLap;
  const returning = path >= slugLap / 2;
  const local = returning ? path - slugLap / 2 : path;
  const sign = returning ? -1 : 1;
  const angle = Math.max(0, local - slugStraight) / slugRadius;
  const x = Math.min(local, slugStraight) - slugStraight / 2 + slugRadius * Math.sin(angle);
  return { x: sign * x, z: -sign * slugRadius * Math.cos(angle), angle: angle + (returning ? Math.PI : 0) };
}

// The clock belongs to the bar, so changing customers never restarts a route.
export function eventPose(id, elapsed) {
  if (id === 'cockroach') {
    const phase = elapsed / 3500;
    return { x: 0.46 * Math.sin(phase), y: 0.035 * Math.sin(2 * phase), z: 0 };
  }
  if (id === 'spider') {
    return { x: 0, y: 0.59 * (1 + Math.cos(elapsed * 2 * Math.PI / 16000)), z: 0 };
  }
  return { ...slugTrack(elapsed * slugSpeed), y: 0 };
}
