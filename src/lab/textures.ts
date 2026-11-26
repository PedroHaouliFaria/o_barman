// Texturas procedurais (canvas) para o laboratório de estilos. Nada é baixado.
import * as THREE from 'three';

type Painter = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const cache = new Map<string, THREE.Texture>();

export function canvasTexture(key: string, paint: Painter, size: number, repeat: [number, number], pixel = false) {
  const id = key + size + repeat.join() + pixel;
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, size, seeded(key.length * 977 + size));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = pixel ? 1 : 8;
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  cache.set(id, tex);
  return tex;
}

export const paintWood =
  (base: string, dark: string): Painter =>
  (ctx, size, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const planks = 4;
    for (let p = 0; p < planks; p++) {
      const x0 = (p * size) / planks;
      ctx.globalAlpha = 0.18 + rand() * 0.15;
      ctx.fillStyle = dark;
      ctx.fillRect(x0, 0, size / planks, size);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = dark;
        ctx.globalAlpha = 0.08 + rand() * 0.22;
        ctx.lineWidth = 0.5 + rand() * 2;
        ctx.beginPath();
        const x = x0 + rand() * (size / planks);
        ctx.moveTo(x, 0);
        for (let y = 0; y <= size; y += size / 16) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 3 + (rand() - 0.5) * 2, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#000';
      ctx.fillRect(x0, 0, 2, size);
    }
    ctx.globalAlpha = 1;
  };

export const paintWallpaper =
  (base: string, motif: string): Painter =>
  (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = motif;
    ctx.strokeStyle = motif;
    const step = size / 4;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const cx = x * step + (y % 2 ? step / 2 : 0) + step / 4;
        const cy = y * step + step / 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, step * 0.12, step * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = size / 220;
        ctx.beginPath();
        ctx.ellipse(cx, cy, step * 0.26, step * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    ctx.globalAlpha = 0.18;
    for (let x = 0; x < size; x += size / 32) ctx.fillRect(x, 0, size / 256, size);
    ctx.globalAlpha = 1;
  };

export const paintTiles =
  (a: string, b: string): Painter =>
  (ctx, size, rand) => {
    const n = 8;
    const s = size / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? a : b;
        ctx.fillRect(x * s, y * s, s, s);
        ctx.globalAlpha = rand() * 0.12;
        ctx.fillStyle = '#000';
        ctx.fillRect(x * s, y * s, s, s);
        ctx.globalAlpha = 1;
      }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = size / 512;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s, 0);
      ctx.lineTo(i * s, size);
      ctx.moveTo(0, i * s);
      ctx.lineTo(size, i * s);
      ctx.stroke();
    }
  };

export const paintNoise =
  (base: string, amount: number): Painter =>
  (ctx, size, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rand() - 0.5) * amount;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  };

/** Rótulos de garrafa variados, numa grade 4x4. */
export const paintLabels: Painter = (ctx, size, rand) => {
  const s = size / 4;
  const inks = ['#f0e2c0', '#e9d9a6', '#d9c39a', '#efe7d4', '#c9b07a'];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = inks[Math.floor(rand() * inks.length)];
      ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      ctx.fillStyle = 'rgba(60,30,20,.8)';
      ctx.fillRect(x * s + s * 0.15, y * s + s * 0.35, s * 0.7, s * 0.08);
      ctx.fillRect(x * s + s * 0.25, y * s + s * 0.55, s * 0.5, s * 0.05);
    }
};
