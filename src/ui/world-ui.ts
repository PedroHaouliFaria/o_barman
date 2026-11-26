// Interface dentro do bar (Âmbar Noturno), desenhada do zero.
// Princípio: a informação mora em objetos do próprio bar (diegética), como num bar
// de 1920 à meia-luz. Nada de painéis de aplicativo flutuando:
//   - comanda: papel de pedido num espeto de latão sobre o balcão
//   - legenda: a fala do cliente como legenda de cinema, sem caixa
//   - plaqueta: latão gravado (pia, gelo, entrega, copos, garrafas)
//   - rótulo: etiqueta de papel colada (potes, pote de gorjetas)
//   - medalhão: botões redondos de latão esmaltado (turno, altura)
//   - página: o livro de receitas impresso
//   - nota: a etiqueta pendurada no recipiente em mãos
//   - flutuante: "+1 Rum", "Mexido"... em dourado que sobe e some
import * as THREE from 'three';

export const UI = {
  ink: '#2a1a0f',
  inkSoft: '#5a4330',
  paper: '#eadcbc',
  paperEdge: '#c9b48a',
  cream: '#f4e7cb',
  brass: '#c9a25a',
  brassLight: '#ecd39a',
  brassDark: '#7d5a26',
  wine: '#8c2a2a',
  night: '#0d0806',
  display: '"Cinzel", "Cormorant Garamond", Georgia, serif',
  serif: '"Cormorant Garamond", Georgia, serif',
};

const DEG = Math.PI / 180;
type V3 = [number, number, number];

export const fontsReady: Promise<unknown> =
  typeof document === 'undefined'
    ? Promise.resolve()
    : Promise.all(
        ['600 40px Cinzel', '700 40px Cinzel', '500 40px "Cormorant Garamond"', '600 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"'].map(
          (f) => document.fonts.load(f).catch(() => null),
        ),
      );

export interface Panel {
  mesh: THREE.Mesh;
  /** redesenha (só quando o conteúdo muda) */
  draw(content: unknown): void;
  dispose(): void;
}

type Painter<T> = (ctx: CanvasRenderingContext2D, w: number, h: number, content: T) => void;

interface PanelOptions {
  /** px por metro do canvas */
  density?: number;
  /** objeto iluminado pela cena (papel, latão) ou luz própria (legenda, flutuante) */
  lit?: boolean;
  transparent?: boolean;
  /** quanto o objeto iluminado brilha sozinho para continuar legível na meia-luz */
  glow?: number;
}

const panels = new Set<{ redraw(): void }>();
fontsReady.then(() => panels.forEach((p) => p.redraw()));

function rotate(obj: THREE.Object3D, rotation: V3) {
  obj.rotation.set(rotation[0] * DEG, rotation[1] * DEG, rotation[2] * DEG, 'YXZ');
}

export function panel<T>(
  parent: THREE.Object3D,
  at: V3,
  size: [number, number],
  rotation: V3,
  paint: Painter<T>,
  initial: T,
  { density = 1400, lit = true, transparent = true, glow = 0.45 }: PanelOptions = {},
): Panel {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(Math.min(1400, Math.max(64, size[0] * density)));
  canvas.height = Math.round((canvas.width * size[1]) / size[0]);
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  const material = lit
    ? new THREE.MeshStandardMaterial({
        map: texture,
        transparent,
        alphaTest: transparent ? 0.02 : 0,
        roughness: 0.75,
        emissive: '#ffffff',
        emissiveMap: texture,
        emissiveIntensity: glow,
      })
    : new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
  mesh.position.set(...at);
  rotate(mesh, rotation);
  parent.add(mesh);
  let last = '';
  let content = initial;
  const entry = {
    redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paint(ctx, canvas.width, canvas.height, content);
      texture.needsUpdate = true;
    },
  };
  panels.add(entry);
  const api: Panel = {
    mesh,
    draw(next) {
      const key = JSON.stringify(next);
      if (key === last) return;
      last = key;
      content = next as T;
      entry.redraw();
    },
    dispose() {
      panels.delete(entry);
      texture.dispose();
      material.dispose();
      mesh.geometry.dispose();
    },
  };
  api.draw(initial);
  return api;
}

// ---------------------------------------------------------------- utilidades de desenho

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, max: number) {
  let size = px;
  ctx.font = font(size);
  while (size > 8 && ctx.measureText(text).width > max) {
    size -= 1;
    ctx.font = font(size);
  }
  return size;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const rows: string[] = [];
  let row = '';
  for (const word of text.split(' ')) {
    const test = row ? row + ' ' + word : word;
    if (row && ctx.measureText(test).width > max) {
      rows.push(row);
      row = word;
    } else row = test;
  }
  if (row) rows.push(row);
  return rows;
}

/** Fibra de papel: ruído fino e borda mais escura. */
function paperGround(ctx: CanvasRenderingContext2D, w: number, h: number, tone = UI.paper) {
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(255,248,230,0.25)');
  g.addColorStop(1, 'rgba(120,85,40,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  let seed = w * 7 + h;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = 'rgba(90,60,30,0.05)';
  for (let i = 0; i < (w * h) / 900; i++) ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
}

function brassGround(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number) {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, '#e9cd8c');
  g.addColorStop(0.45, '#b88a44');
  g.addColorStop(1, '#8a6229');
  roundRect(ctx, 1, 1, w - 2, h - 2, radius);
  ctx.fillStyle = g;
  ctx.fill();
  // escovado
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.08;
  for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = x % 2 ? '#fff' : '#000';
    ctx.fillRect(x, 0, 1, h);
  }
  ctx.restore();
  ctx.lineWidth = Math.max(2, h * 0.05);
  ctx.strokeStyle = 'rgba(70,45,15,0.65)';
  roundRect(ctx, h * 0.09, h * 0.09, w - h * 0.18, h - h * 0.18, radius * 0.7);
  ctx.stroke();
}

/** Texto gravado: sulco escuro com luz na borda de baixo. */
function engrave(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = 'rgba(255,236,190,0.55)';
  ctx.fillText(text, x, y + 2);
  ctx.fillStyle = '#2b1a08';
  ctx.fillText(text, x, y);
}

// ---------------------------------------------------------------- componentes

/** Plaqueta de latão gravada. */
export function plaque(parent: THREE.Object3D, at: V3, w: number, h: number, rotation: V3, text: string) {
  return panel<string>(
    parent,
    at,
    [w, h],
    rotation,
    (ctx, cw, ch, t) => {
      brassGround(ctx, cw, ch, ch * 0.22);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fit(ctx, t.toUpperCase(), (px) => `700 ${px}px ${UI.display}`, ch * 0.5, cw * 0.82);
      engrave(ctx, t.toUpperCase(), cw / 2, ch * 0.53);
    },
    text,
    { glow: 0.35, transparent: true },
  );
}

/** Rótulo de papel colado, com filete duplo. */
export function paperLabel(parent: THREE.Object3D, at: V3, w: number, h: number, rotation: V3, content: { title: string; note?: string }) {
  return panel<{ title: string; note?: string }>(
    parent,
    at,
    [w, h],
    rotation,
    (ctx, cw, ch, c) => {
      paperGround(ctx, cw, ch);
      ctx.strokeStyle = UI.brassDark;
      ctx.lineWidth = Math.max(1.5, ch * 0.025);
      ctx.strokeRect(ch * 0.08, ch * 0.08, cw - ch * 0.16, ch - ch * 0.16);
      ctx.lineWidth = Math.max(1, ch * 0.01);
      ctx.strokeRect(ch * 0.13, ch * 0.13, cw - ch * 0.26, ch - ch * 0.26);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = UI.ink;
      const titleY = c.note ? ch * 0.4 : ch * 0.52;
      fit(ctx, c.title, (px) => `italic 600 ${px}px ${UI.serif}`, ch * (c.note ? 0.36 : 0.5), cw * 0.8);
      ctx.fillText(c.title, cw / 2, titleY);
      if (c.note) {
        ctx.fillStyle = UI.inkSoft;
        fit(ctx, c.note, (px) => `600 ${px}px ${UI.display}`, ch * 0.18, cw * 0.75);
        ctx.fillText(c.note, cw / 2, ch * 0.7);
      }
    },
    content,
    { glow: 0.4 },
  );
}

export interface TicketContent {
  number: number;
  time: string;
  customer: string;
  drink: string;
  glass: string;
  /** "Devolvido" depois de uma reclamação */
  stamp?: string;
  /** turno fora de serviço: título grande e linha de apoio */
  idle?: { title: string; line: string };
}

/** Comanda de papel (pedido), com picote embaixo. */
export function ticket(parent: THREE.Object3D, at: V3, w: number, h: number, rotation: V3) {
  return panel<TicketContent>(
    parent,
    at,
    [w, h],
    rotation,
    (ctx, cw, ch, c) => {
      // papel com picote (dentes) na base
      ctx.save();
      ctx.beginPath();
      const teeth = 14,
        tooth = cw / teeth,
        depth = ch * 0.018;
      ctx.moveTo(0, 0);
      ctx.lineTo(cw, 0);
      ctx.lineTo(cw, ch - depth);
      for (let i = teeth; i > 0; i--) {
        ctx.lineTo((i - 0.5) * tooth, ch);
        ctx.lineTo((i - 1) * tooth, ch - depth);
      }
      ctx.closePath();
      ctx.clip();
      paperGround(ctx, cw, ch, '#efe3c6');
      ctx.restore();
      const pad = cw * 0.1;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = UI.brassDark;
      ctx.textAlign = 'center';
      ctx.font = `600 ${ch * 0.042}px ${UI.display}`;
      ctx.fillText('ON THE HOUSE', cw / 2, ch * 0.08);
      ctx.strokeStyle = UI.brassDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad, ch * 0.105);
      ctx.lineTo(cw - pad, ch * 0.105);
      ctx.stroke();
      if (c.idle) {
        ctx.fillStyle = UI.ink;
        ctx.font = `600 ${ch * 0.1}px ${UI.serif}`;
        for (const [i, row] of wrap(ctx, c.idle.title, cw - 2 * pad).entries()) ctx.fillText(row, cw / 2, ch * (0.32 + i * 0.11));
        ctx.font = `italic 500 ${ch * 0.058}px ${UI.serif}`;
        ctx.fillStyle = UI.inkSoft;
        for (const [i, row] of wrap(ctx, c.idle.line, cw - 2 * pad).entries()) ctx.fillText(row, cw / 2, ch * (0.62 + i * 0.07));
        return;
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = UI.inkSoft;
      ctx.font = `600 ${ch * 0.045}px ${UI.display}`;
      ctx.fillText('Nº ' + String(c.number).padStart(2, '0'), pad, ch * 0.17);
      ctx.textAlign = 'right';
      ctx.fillText(c.time, cw - pad, ch * 0.17);
      ctx.textAlign = 'left';
      ctx.font = `italic 500 ${ch * 0.055}px ${UI.serif}`;
      ctx.fillText(c.customer, pad, ch * 0.26);
      ctx.fillStyle = UI.ink;
      ctx.font = `600 ${ch * 0.095}px ${UI.serif}`;
      const rows = wrap(ctx, c.drink, cw - 2 * pad);
      rows.forEach((row, i) => ctx.fillText(row, pad, ch * (0.39 + i * 0.1)));
      const below = 0.39 + rows.length * 0.1;
      ctx.fillStyle = UI.inkSoft;
      ctx.font = `italic 500 ${ch * 0.058}px ${UI.serif}`;
      ctx.fillText('servir em ' + c.glass, pad, ch * (below + 0.02));
      // linha pontilhada e rodapé
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(pad, ch * 0.82);
      ctx.lineTo(cw - pad, ch * 0.82);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'center';
      ctx.font = `500 ${ch * 0.04}px ${UI.display}`;
      ctx.fillText('consulte o livro de receitas', cw / 2, ch * 0.89);
      if (c.stamp) {
        ctx.save();
        ctx.translate(cw * 0.62, ch * 0.62);
        ctx.rotate(-0.22);
        ctx.strokeStyle = 'rgba(140,42,42,0.85)';
        ctx.fillStyle = 'rgba(140,42,42,0.85)';
        ctx.lineWidth = ch * 0.008;
        ctx.font = `700 ${ch * 0.06}px ${UI.display}`;
        const sw = ctx.measureText(c.stamp).width + ch * 0.05;
        ctx.strokeRect(-sw / 2, -ch * 0.045, sw, ch * 0.09);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.stamp, 0, ch * 0.004);
        ctx.restore();
      }
    },
    { number: 0, time: '', customer: '', drink: '', glass: '' },
    { glow: 0.55, density: 1800 },
  );
}

export interface SubtitleContent {
  speaker?: string;
  line: string;
  tone?: 'normal' | 'complaint' | 'system';
}

/** Legenda de cinema: sem caixa, texto creme com halo escuro. */
export function subtitle(parent: THREE.Object3D, at: V3, w: number, h: number, rotation: V3) {
  return panel<SubtitleContent>(
    parent,
    at,
    [w, h],
    rotation,
    (ctx, cw, ch, c) => {
      if (!c.line) return;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lineFont = (px: number) => `italic 500 ${px}px ${UI.serif}`;
      let px = ch * 0.2;
      ctx.font = lineFont(px);
      let rows = wrap(ctx, '“' + c.line + '”', cw * 0.92);
      while (rows.length > 3 && px > 10) {
        px -= 2;
        ctx.font = lineFont(px);
        rows = wrap(ctx, '“' + c.line + '”', cw * 0.92);
      }
      if (c.tone === 'system') rows = wrap(ctx, c.line, cw * 0.92);
      const total = rows.length * px * 1.15 + (c.speaker ? px * 0.9 : 0);
      let y = ch / 2 - total / 2 + px * 0.5;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = px * 0.35;
      if (c.speaker) {
        ctx.font = `700 ${px * 0.5}px ${UI.display}`;
        ctx.fillStyle = c.tone === 'complaint' ? '#e08a7a' : UI.brass;
        ctx.fillText(c.speaker.toUpperCase(), cw / 2, y);
        y += px * 0.9;
      }
      ctx.font = c.tone === 'system' ? `600 ${px * 0.9}px ${UI.serif}` : lineFont(px);
      ctx.fillStyle = c.tone === 'complaint' ? '#f6d2c4' : UI.cream;
      for (const row of rows) {
        // duas passadas: halo forte e texto limpo
        ctx.fillText(row, cw / 2, y);
        ctx.shadowBlur = 0;
        ctx.fillText(row, cw / 2, y);
        ctx.shadowBlur = px * 0.35;
        y += px * 1.15;
      }
    },
    { line: '' },
    { lit: false, density: 1100 },
  );
}

/** Medalhão de latão (botão redondo) com uma palavra gravada e um ícone simples. */
export function medallion(parent: THREE.Object3D, at: V3, diameter: number, rotation: V3) {
  return panel<{ word: string; icon: 'play' | 'pause' | 'restart' | 'height' }>(
    parent,
    at,
    [diameter, diameter],
    rotation,
    (ctx, w, h, c) => {
      const r = w / 2;
      const g = ctx.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
      g.addColorStop(0, '#f0d79c');
      g.addColorStop(0.6, '#b8884a');
      g.addColorStop(1, '#6e4c1e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r - 2, 0, Math.PI * 2);
      ctx.fill();
      // esmalte vinho no centro
      ctx.fillStyle = '#3a1416';
      ctx.beginPath();
      ctx.arc(r, r, r * 0.74, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = UI.brassLight;
      ctx.lineWidth = r * 0.03;
      ctx.beginPath();
      ctx.arc(r, r, r * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = UI.brassLight;
      ctx.strokeStyle = UI.brassLight;
      const s = r * 0.22,
        cy = r * 0.8;
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      if (c.icon === 'play') {
        ctx.moveTo(r - s * 0.7, cy - s);
        ctx.lineTo(r + s, cy);
        ctx.lineTo(r - s * 0.7, cy + s);
        ctx.closePath();
        ctx.fill();
      } else if (c.icon === 'pause') {
        ctx.fillRect(r - s * 0.8, cy - s, s * 0.5, s * 2);
        ctx.fillRect(r + s * 0.3, cy - s, s * 0.5, s * 2);
      } else if (c.icon === 'restart') {
        ctx.arc(r, cy, s, Math.PI * 0.2, Math.PI * 1.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r + s * 0.55, cy - s * 1.25);
        ctx.lineTo(r + s * 1.1, cy - s * 0.55);
        ctx.lineTo(r + s * 0.25, cy - s * 0.35);
        ctx.fill();
      } else {
        ctx.moveTo(r, cy - s * 1.1);
        ctx.lineTo(r, cy + s * 1.1);
        ctx.stroke();
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(r - s * 0.6, cy + d * s * 0.55);
          ctx.lineTo(r, cy + d * s * 1.15);
          ctx.lineTo(r + s * 0.6, cy + d * s * 0.55);
          ctx.fill();
        }
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fit(ctx, c.word.toUpperCase(), (px) => `700 ${px}px ${UI.display}`, r * 0.26, r * 1.15);
      ctx.fillText(c.word.toUpperCase(), r, r * 1.32);
    },
    { word: '', icon: 'play' },
    { glow: 0.5, density: 1200 },
  );
}

export interface PageContent {
  kind: 'ingredients' | 'method';
  title: string;
  subtitle?: string;
  lines: string[];
  folio: string;
  hint: string;
}

/** Página impressa do livro de receitas. */
export function bookPage(parent: THREE.Object3D, at: V3, w: number, h: number, rotation: V3) {
  return panel<PageContent>(
    parent,
    at,
    [w, h],
    rotation,
    (ctx, cw, ch, c) => {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      const pad = cw * 0.1;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = UI.ink;
      ctx.textAlign = 'center';
      if (c.kind === 'ingredients') {
        ctx.font = `600 ${ch * 0.04}px ${UI.display}`;
        ctx.fillStyle = UI.brassDark;
        ctx.fillText('RECEITA', cw / 2, ch * 0.12);
        ctx.fillStyle = UI.ink;
        fit(ctx, c.title, (px) => `600 ${px}px ${UI.serif}`, ch * 0.1, cw - 2 * pad);
        ctx.fillText(c.title, cw / 2, ch * 0.24);
        ctx.font = `italic 500 ${ch * 0.055}px ${UI.serif}`;
        ctx.fillStyle = UI.inkSoft;
        if (c.subtitle) ctx.fillText(c.subtitle, cw / 2, ch * 0.32);
        ctx.strokeStyle = UI.brassDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cw * 0.35, ch * 0.37);
        ctx.lineTo(cw * 0.65, ch * 0.37);
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.fillStyle = UI.ink;
        ctx.font = `500 ${ch * 0.06}px ${UI.serif}`;
        c.lines.forEach((line, i) => ctx.fillText('·  ' + line, pad, ch * (0.47 + i * 0.075)));
      } else {
        ctx.font = `600 ${ch * 0.04}px ${UI.display}`;
        ctx.fillStyle = UI.brassDark;
        ctx.fillText('PREPARO', cw / 2, ch * 0.12);
        ctx.textAlign = 'left';
        ctx.fillStyle = UI.ink;
        ctx.font = `500 ${ch * 0.064}px ${UI.serif}`;
        const rows = wrap(ctx, c.lines.join(' '), cw - 2 * pad);
        rows.forEach((row, i) => ctx.fillText(row, pad, ch * (0.24 + i * 0.08)));
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = UI.inkSoft;
      ctx.font = `italic 500 ${ch * 0.045}px ${UI.serif}`;
      ctx.fillText(c.hint, cw / 2, ch * 0.9);
      ctx.font = `600 ${ch * 0.035}px ${UI.display}`;
      ctx.fillText(c.folio, cw / 2, ch * 0.96);
    },
    { kind: 'ingredients', title: '', lines: [], folio: '', hint: '' },
    { glow: 0.5, density: 1500 },
  );
}

/** Etiqueta pendurada no recipiente em mãos: lista escrita à mão. */
export function tag(parent: THREE.Object3D, w: number, h: number) {
  return panel<{ title: string; lines: string[] }>(
    parent,
    [0, 0, 0],
    [w, h],
    [0, 0, 0],
    (ctx, cw, ch, c) => {
      roundRect(ctx, 2, 2, cw - 4, ch - 4, ch * 0.06);
      ctx.save();
      ctx.clip();
      paperGround(ctx, cw, ch, '#ecdfc2');
      ctx.restore();
      ctx.strokeStyle = UI.brassDark;
      ctx.lineWidth = 3;
      roundRect(ctx, 2, 2, cw - 4, ch - 4, ch * 0.06);
      ctx.stroke();
      // ilhós
      ctx.fillStyle = UI.brass;
      ctx.beginPath();
      ctx.arc(cw * 0.5, ch * 0.08, ch * 0.03, 0, Math.PI * 2);
      ctx.fill();
      const pad = cw * 0.09;
      ctx.textAlign = 'left';
      ctx.fillStyle = UI.brassDark;
      ctx.font = `700 ${ch * 0.075}px ${UI.display}`;
      ctx.fillText(c.title.toUpperCase(), pad, ch * 0.22);
      ctx.fillStyle = UI.ink;
      const px = Math.min(ch * 0.1, (ch * 0.68) / Math.max(1, c.lines.length));
      ctx.font = `italic 600 ${px}px ${UI.serif}`;
      c.lines.forEach((line, i) => ctx.fillText(line, pad, ch * 0.33 + (i + 0.6) * px * 1.05));
    },
    { title: '', lines: [] },
    { lit: false, density: 1300 },
  );
}

/** Texto dourado que sobe e some ("+1 Rum", "Mexido"). */
export function floatingWord(parent: THREE.Object3D, w: number, h: number) {
  return panel<{ text: string }>(
    parent,
    [0, 0, 0],
    [w, h],
    [0, 0, 0],
    (ctx, cw, ch, c) => {
      if (!c.text) return;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fit(ctx, c.text, (px) => `600 ${px}px ${UI.serif}`, ch * 0.7, cw * 0.95);
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = ch * 0.12;
      ctx.fillStyle = UI.brassLight;
      ctx.fillText(c.text, cw / 2, ch / 2);
      ctx.shadowBlur = 0;
      ctx.fillText(c.text, cw / 2, ch / 2);
    },
    { text: '' },
    { lit: false, density: 1100 },
  );
}
