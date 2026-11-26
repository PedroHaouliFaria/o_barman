// A dose is measured at the bottle mouth, in meters and milliseconds.
export function newMotion() {
  return {
    stirAngle: null,
    stirTravel: 0,
    pestleRaised: false,
    strokes: 0,
    target: null,
    poured: false,
    dwell: 0,
    axis: -1,
    direction: 0,
    turns: 0,
    elapsed: 0,
    idle: 0,
  };
}

export function pourStep(motion, target, upY, dt) {
  if (!target || motion.target !== target || upY > 0.35) {
    motion.target = target;
    motion.dwell = 0;
    motion.poured = false;
  }
  if (upY > 0.1 && !motion.poured) motion.dwell = 0;
  if (!target || upY > 0.1 || motion.poured) return false;
  motion.dwell += Math.min(dt, 100);
  if (motion.dwell < 430) return false;
  motion.poured = true;
  return true;
}

// Count changes of direction along the first meaningful axis. Slow movement
// and a simple trip from the shelf to the cup cannot complete the technique.
export function shakeStep(motion, dx, dy, dz, dt) {
  if (dt <= 0 || dt > 120) {
    resetShake(motion);
    return false;
  }
  if (motion.axis < 0) {
    const max = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    if ((max * 1000) / dt < 0.24) return false;
    motion.axis = max === Math.abs(dx) ? 0 : max === Math.abs(dy) ? 1 : 2;
  }
  const delta = motion.axis === 0 ? dx : motion.axis === 1 ? dy : dz;
  motion.elapsed += dt;
  if ((Math.abs(delta) * 1000) / dt < 0.24) {
    motion.idle += dt;
    if (motion.idle > 350) resetShake(motion);
    return false;
  }
  motion.idle = 0;
  const direction = Math.sign(delta);
  if (motion.direction && motion.direction !== direction) motion.turns++;
  motion.direction = direction;
  if (motion.turns < 3 || motion.elapsed < 450) return false;
  resetShake(motion);
  return true;
}

export function resetShake(motion) {
  motion.axis = -1;
  motion.direction = 0;
  motion.turns = 0;
  motion.elapsed = 0;
  motion.idle = 0;
}

// Coordinates follow the glass so either hand can hold it during preparation.
export function stirStep(motion, tip, inside) {
  if (!inside || Math.hypot(tip.x, tip.z) < 0.009) {
    motion.stirAngle = null;
    motion.stirTravel = 0;
    return false;
  }
  const angle = Math.atan2(tip.z, tip.x);
  if (motion.stirAngle !== null) {
    const delta = angle - motion.stirAngle;
    const turn = Math.atan2(Math.sin(delta), Math.cos(delta));
    motion.stirTravel = Math.abs(turn) < Math.PI / 2 ? motion.stirTravel + turn : 0;
  }
  motion.stirAngle = angle;
  return Math.abs(motion.stirTravel) >= 1.9 * Math.PI;
}

export function muddleStep(motion, height, rim, aligned) {
  if (!aligned) {
    motion.pestleRaised = false;
    motion.strokes = 0;
  } else if (height >= rim - 0.01) {
    motion.pestleRaised = true;
  } else if (height <= rim - 0.055 && motion.pestleRaised) {
    motion.pestleRaised = false;
    motion.strokes++;
  }
  return motion.strokes >= 2;
}
