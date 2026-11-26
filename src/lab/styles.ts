// Os três estilos propostos para o redesign. Cada um define materiais, luz,
// neblina e pós-processamento sobre O MESMO bar (src/lab/Bar.tsx).
import * as THREE from 'three';
import { canvasTexture, paintLabels, paintNoise, paintTiles, paintWallpaper, paintWood } from './textures';

export type StyleId = 'ambar' | 'fita' | 'gravura';

export type Role =
  | 'wood' | 'woodDark' | 'counterTop' | 'brass' | 'wallpaper' | 'wainscot' | 'floor' | 'ceiling'
  | 'velvet' | 'tableTop' | 'skin' | 'piano' | 'ivory' | 'metal' | 'mirror' | 'bottle' | 'label'
  | 'lampShade' | 'glow' | 'glowCold' | 'night' | 'window' | 'exitSign' | 'candle';

export interface StyleDef {
  id: StyleId;
  name: string;
  tagline: string;
  description: string[];
  references: string;
  background: string;
  fog: { color: string; density: number };
  toneMapping: THREE.ToneMapping;
  exposure: number;
  shadows: boolean;
  /** Fração da resolução (1 = nativa). Abaixo de 1 vira pixel visível. */
  resolution: number;
  vertexSnap: boolean;
  outline: boolean;
  light: {
    ambient: [string, number];
    hemi: [string, string, number];
    pendant: [string, number];
    candle: [string, number];
    piano: [string, number];
    door: [string, number];
    sconce: [string, number];
    flicker: number;
  };
  post: { bloom: number; vignette: number; noise: number; chroma: number; sepia?: number };
  cloth: string[];
  music: { detune: number; wobble: number; lowpass: number };
}

export const STYLES: Record<StyleId, StyleDef> = {
  ambar: {
    id: 'ambar',
    name: 'Âmbar Noturno',
    tagline: 'Realismo pintado: um bar elegante demais para aquela hora.',
    description: [
      'Materiais quase reais (madeira, latão, veludo, vidro) com luz quente em poças e cantos que somem no escuro.',
      'O medo vem do contraste: tudo é bonito e acolhedor, mas a luz nunca alcança o salão inteiro.',
      'Luz baked no Blender + poucas luzes dinâmicas; bloom suave, grão de filme e vinheta.',
    ],
    references: 'Edward Hopper (Nighthawks), o salão dourado de O Iluminado, Manet (Bar aux Folies-Bergère)',
    background: '#0b0807',
    fog: { color: '#120c09', density: 0.085 },
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.2,
    shadows: true,
    resolution: 1,
    vertexSnap: false,
    outline: false,
    light: {
      ambient: ['#ffcf9a', 0.09],
      hemi: ['#ffd9a8', '#1a0e08', 0.22],
      pendant: ['#ffb565', 4.2],
      candle: ['#ff9a3c', 1.6],
      piano: ['#ffd2a0', 28],
      door: ['#7fa6ff', 18],
      sconce: ['#ffae5c', 2.2],
      flicker: 0.04,
    },
    post: { bloom: 0.9, vignette: 0.75, noise: 0.06, chroma: 0 },
    cloth: ['#2a2b2f', '#4a1f22', '#2f3a33', '#5a4a3a', '#1d2433', '#6b5a48', '#3a2f3f'],
    music: { detune: 0, wobble: 0, lowpass: 9000 },
  },
  fita: {
    id: 'fita',
    name: 'Fita Perdida',
    tagline: 'Terror retrô de console antigo: o bar lembrado por uma fita gasta.',
    description: [
      'Baixa resolução, vértices que tremem, texturas pixeladas e neblina densa esverdeada.',
      'O estranho já está na própria imagem: nada é totalmente nítido, as figuras no fundo são só silhuetas.',
      'O mais leve de rodar no Quest; esconde a simplicidade dos modelos e combina com o tom de terror.',
    ],
    references: 'jogos de terror da era PS1, VHS e found footage, fotos de bares antigos com flash',
    background: '#18211b',
    fog: { color: '#18211b', density: 0.13 },
    toneMapping: THREE.NoToneMapping,
    exposure: 1,
    shadows: false,
    resolution: 0.2,
    // tremor de vértices desligado: em certas vistas apaga a imagem (investigar antes de usar)
    vertexSnap: false,
    outline: false,
    light: {
      ambient: ['#9fb59a', 0.45],
      hemi: ['#c9d8b8', '#0b0d0a', 0.45],
      pendant: ['#ffe2a6', 5],
      candle: ['#ffb060', 1.2],
      piano: ['#e8f0d0', 16],
      door: ['#b7ffd0', 14],
      sconce: ['#ffd38a', 1.4],
      flicker: 0.22,
    },
    post: { bloom: 0.45, vignette: 0.8, noise: 0.07, chroma: 0.002 },
    cloth: ['#3b4038', '#4d3434', '#2f3d3a', '#55503d', '#2b2f3d', '#61574a', '#3c3540'],
    music: { detune: 18, wobble: 9, lowpass: 2600 },
  },
  gravura: {
    id: 'gravura',
    name: 'Gravura',
    tagline: 'Ilustração em tinta: um livro de contos macabros que ganhou volume.',
    description: [
      'Sombreamento em faixas (toon), contorno preto de nanquim e paleta curta: creme, vinho, preto e um verde doente.',
      'O terror vem do grafismo: sombras chapadas e pretos enormes engolindo o salão.',
      'Visual autoral e muito legível em VR; personagens podem deformar sem parecer “errados” tecnicamente.',
    ],
    references: 'gravuras de Goya e Redon, quadrinhos de Mike Mignola, ilustração de livros de contos de terror',
    background: '#070605',
    fog: { color: '#070605', density: 0.075 },
    toneMapping: THREE.NoToneMapping,
    exposure: 1,
    shadows: true,
    resolution: 1,
    vertexSnap: false,
    outline: true,
    light: {
      ambient: ['#e9dcc0', 0.16],
      hemi: ['#f1e4c8', '#22130f', 0.2],
      pendant: ['#ffe3b0', 5],
      candle: ['#ffcf80', 1.1],
      piano: ['#fff1d6', 22],
      door: ['#c6e05a', 16],
      sconce: ['#ffd590', 1.6],
      flicker: 0.02,
    },
    post: { bloom: 0.2, vignette: 0.65, noise: 0.08, chroma: 0 },
    cloth: ['#1b1716', '#6e1f24', '#2a2422', '#c8b58f', '#1b1716', '#7a6a4c', '#3a1416'],
    music: { detune: 6, wobble: 0, lowpass: 6000 },
  },
};

const PALETTE: Record<StyleId, Partial<Record<Role, string>>> = {
  ambar: {
    wood: '#5a3520', woodDark: '#2a160d', counterTop: '#3d2214', brass: '#c29a52', wallpaper: '#3c1a1a', wainscot: '#2b1810',
    floor: '#2a221d', ceiling: '#1a120e', velvet: '#5a1418', tableTop: '#3a2316', skin: '#c79d82', piano: '#0d0a0a',
    ivory: '#efe5cf', metal: '#8d8a84', mirror: '#2a2420', bottle: '#3b5a3a', label: '#e9dcb8', lampShade: '#b9853e',
    glow: '#ffcf8a', glowCold: '#9cc0ff', night: '#0b1220', window: '#16233a', exitSign: '#7cff9a', candle: '#ffd9a0',
  },
  fita: {
    wood: '#4a3a2a', woodDark: '#241c15', counterTop: '#33281e', brass: '#9c8c5c', wallpaper: '#2e3a2c', wainscot: '#221c16',
    floor: '#262a22', ceiling: '#151814', velvet: '#4a2424', tableTop: '#30281f', skin: '#b5a08a', piano: '#101210',
    ivory: '#d8d8c0', metal: '#7a7f78', mirror: '#202620', bottle: '#2f4a36', label: '#cfd1b0', lampShade: '#9a8a58',
    glow: '#fff0b8', glowCold: '#c8ffd8', night: '#0a120e', window: '#14241c', exitSign: '#ff4a3a', candle: '#ffe0a0',
  },
  gravura: {
    wood: '#3a1f18', woodDark: '#1b1210', counterTop: '#241512', brass: '#c9b37a', wallpaper: '#e2d3b2', wainscot: '#2a1a15',
    floor: '#b8a582', ceiling: '#1b1210', velvet: '#7a1d22', tableTop: '#2a1a15', skin: '#e9dcc0', piano: '#120f0e',
    ivory: '#f2e8d2', metal: '#9a948a', mirror: '#1b1716', bottle: '#5f7a2a', label: '#efe3c8', lampShade: '#c9a45a',
    glow: '#fff1c8', glowCold: '#d7f07a', night: '#0f1408', window: '#1c2410', exitSign: '#c6e05a', candle: '#fff0c0',
  },
};

// ---------- fábrica de materiais ----------

let toonRamp: THREE.DataTexture | null = null;
function ramp() {
  if (toonRamp) return toonRamp;
  const data = new Uint8Array([40, 40, 40, 255, 130, 130, 130, 255, 255, 255, 255, 255]);
  toonRamp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

function snap(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       vec2 snapRes = vec2(180.0, 110.0);
       // só encaixa vértices a mais de ~1 m: perto da câmera o encaixe gera triângulos gigantes
       if (gl_Position.w > 1.2) gl_Position.xy = floor(gl_Position.xy / gl_Position.w * snapRes) / snapRes * gl_Position.w;`,
    );
  };
  return material;
}

const texCache = new Map<string, THREE.Texture | null>();
function textureFor(style: StyleId, role: Role, color: string): THREE.Texture | null {
  if (style === 'gravura') return null;
  const key = style + role + color;
  if (texCache.has(key)) return texCache.get(key)!;
  const px = style === 'fita';
  const size = px ? 64 : 512;
  let tex: THREE.Texture | null = null;
  const shade = (c: string, k: number) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  if (['wood', 'woodDark', 'counterTop', 'tableTop', 'wainscot'].includes(role))
    tex = canvasTexture('wood' + color, paintWood(color, shade(color, 0.45)), size, [1, 1], px);
  else if (role === 'wallpaper') tex = canvasTexture('wall' + color, paintWallpaper(color, shade(color, 1.6)), size, [6, 2], px);
  else if (role === 'floor') tex = canvasTexture('floor' + color, paintTiles(color, shade(color, 1.9)), size, [7, 7], px);
  else if (role === 'velvet' || role === 'ceiling') tex = canvasTexture('noise' + color, paintNoise(color, 26), size / 2, [3, 3], px);
  else if (role === 'label') tex = canvasTexture('labels', paintLabels, px ? 64 : 256, [1, 1], px);
  texCache.set(key, tex);
  return tex;
}

const matCache = new Map<string, THREE.Material>();

export function makeMaterial(style: StyleDef, role: Role, override?: string): THREE.Material {
  const color = override ?? PALETTE[style.id][role] ?? '#888888';
  const key = style.id + role + color;
  const hit = matCache.get(key);
  if (hit) return hit;
  let m: THREE.Material;
  const emissive = ['glow', 'glowCold', 'exitSign', 'candle', 'night', 'window'].includes(role);
  if (emissive) {
    const strength = role === 'night' || role === 'window' ? 1 : style.id === 'ambar' ? 3.2 : 1.6;
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: role === 'window' });
  } else if (style.id === 'gravura') {
    m = new THREE.MeshToonMaterial({ color, gradientMap: ramp() });
  } else if (style.id === 'fita') {
    m = new THREE.MeshLambertMaterial({ color: '#ffffff', map: textureFor(style.id, role, color) ?? null, flatShading: true });
    if (!(m as THREE.MeshLambertMaterial).map) (m as THREE.MeshLambertMaterial).color.set(color);
  } else {
    const map = textureFor(style.id, role, color);
    const params: THREE.MeshStandardMaterialParameters = { color: map ? '#ffffff' : color, map, roughness: 0.75, metalness: 0 };
    if (role === 'brass') Object.assign(params, { roughness: 0.32, metalness: 1 });
    if (role === 'metal') Object.assign(params, { roughness: 0.4, metalness: 0.9 });
    if (role === 'mirror') Object.assign(params, { roughness: 0.08, metalness: 1, color });
    if (role === 'piano') Object.assign(params, { roughness: 0.18, metalness: 0.1 });
    if (role === 'counterTop' || role === 'tableTop') params.roughness = 0.35;
    if (role === 'velvet') params.roughness = 1;
    if (role === 'bottle')
      Object.assign(params, { roughness: 0.08, metalness: 0, transparent: true, opacity: 0.72 });
    m = new THREE.MeshStandardMaterial(params);
  }
  if (style.vertexSnap) snap(m);
  matCache.set(key, m);
  return m;
}

// Contorno de nanquim: casca invertida empurrada pela normal.
let inkMaterial: THREE.MeshBasicMaterial | null = null;
export function ink() {
  if (inkMaterial) return inkMaterial;
  inkMaterial = new THREE.MeshBasicMaterial({ color: '#0b0908', side: THREE.BackSide });
  inkMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normalize(normal) * 0.022;`,
    );
  };
  return inkMaterial;
}
