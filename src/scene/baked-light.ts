// Luz assada (lightmap) do bar Âmbar Noturno.
//
// Por quê: no Quest 3 a luz em tempo real (sombras de 4 luzes, 10+ pontos de luz por pixel)
// derrubava o jogo. A mesma iluminação é calculada uma vez no Blender (Cycles, na RTX do
// Windows, com luz rebatida e sombras macias) e gravada numa textura. No jogo, tudo o que é
// fixo vira material sem cálculo de luz: cor × textura × luz assada. Custo quase zero.
//
// Fluxo (ver art/blender/bake_luz.py e art/gerar_luz.sh):
//   1. exportForBake(): exporta a geometria fixa do bar + a lista de luzes (escala do jogo);
//   2. o Blender assa a luz (irradiância) numa textura e devolve o bar com a 2ª UV;
//   3. applyBakedLight(): troca as malhas fixas pelas assadas.
// A correspondência é pela ordem dos materiais fixos (mesma travessia nos dois lados) e pelo
// nome; se o bar mudar sem assar de novo, o jogo avisa e continua com a luz em tempo real.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Lit = THREE.MeshStandardMaterial & Partial<THREE.MeshPhysicalMaterial>;

function visibleChain(o: THREE.Object3D, stop: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p && p !== stop; p = p.parent) if (!p.visible) return false;
  return true;
}

/** Material que pode receber luz assada: opaco, sem brilho próprio, sem metal, sem shader próprio. */
function bakeable(m: THREE.Material): m is Lit {
  const s = m as Lit;
  if (!s.isMeshStandardMaterial) return false;
  if (s.transparent || (s.transmission ?? 0) > 0 || s.metalness > 0.5) return false;
  if (s.emissive && s.emissiveIntensity > 0 && s.emissive.getHex() !== 0) return false;
  if (s.onBeforeCompile && s.onBeforeCompile.toString() !== THREE.Material.prototype.onBeforeCompile.toString()) return false;
  return true;
}

/** Malhas fixas e visíveis do bar que recebem luz assada, na ordem da travessia. */
export function bakeTargets(barRoot: THREE.Object3D) {
  const skip = new Set<THREE.Object3D>();
  barRoot.traverse((o) => {
    if (o.userData.dynamic) o.traverse((c) => skip.add(c));
  });
  const meshes: THREE.Mesh[] = [];
  const materials: Lit[] = [];
  const index = new Map<THREE.Material, number>();
  barRoot.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || skip.has(mesh) || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (Array.isArray(mesh.material) || !bakeable(mesh.material) || !visibleChain(mesh, barRoot)) return;
    if (!(mesh.geometry as THREE.BufferGeometry).attributes.position) return;
    meshes.push(mesh);
    if (!index.has(mesh.material)) {
      index.set(mesh.material, materials.length);
      materials.push(mesh.material);
    }
  });
  return { meshes, materials, index };
}

/** Cor média de uma textura (para a luz rebatida no Blender ter a cor certa). */
function averageColor(tex: THREE.Texture | null | undefined): THREE.Color {
  const img = tex?.image as CanvasImageSource | undefined;
  if (!img) return new THREE.Color(1, 1, 1);
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d')!;
  try {
    g.drawImage(img, 0, 0, 4, 4);
    const d = g.getImageData(0, 0, 4, 4).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) (r += d[i]), (gg += d[i + 1]), (b += d[i + 2]);
    return new THREE.Color().setRGB(r / 16 / 255, gg / 16 / 255, b / 16 / 255, THREE.SRGBColorSpace);
  } catch {
    return new THREE.Color(0.5, 0.5, 0.5);
  }
}

/**
 * Exporta a geometria fixa (coordenadas do bar) e as luzes, para o Blender assar.
 * Intensidades em candela (decay 2), cores lineares: o Blender usa P = 4π·I watts,
 * o que dá a mesma irradiância que o Three.js.
 */
export async function exportForBake(barRoot: THREE.Object3D, extraLights: THREE.Light[]) {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  barRoot.updateMatrixWorld(true);
  const inverse = barRoot.matrixWorld.clone().invert();
  const { meshes, materials, index } = bakeTargets(barRoot);
  const proxies = materials.map((m, i) => {
    const albedo = m.color.clone().multiply(averageColor(m.map));
    return new THREE.MeshStandardMaterial({ name: 'L' + i, color: albedo, roughness: 1, metalness: 0, side: m.side });
  });
  const scene = new THREE.Scene();
  const matrix = new THREE.Matrix4();
  for (const mesh of meshes) {
    const src = mesh.geometry as THREE.BufferGeometry;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.attributes.position.clone());
    if (src.attributes.normal) g.setAttribute('normal', src.attributes.normal.clone());
    if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone());
    if (src.index) g.setIndex(src.index.clone());
    g.applyMatrix4(matrix.multiplyMatrices(inverse, mesh.matrixWorld));
    scene.add(new THREE.Mesh(g, proxies[index.get(mesh.material as THREE.Material)!]));
  }
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;

  const lights: Record<string, unknown>[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const lin = (c: THREE.Color) => [c.r, c.g, c.b];
  barRoot.traverse((o) => {
    const l = o as THREE.PointLight & THREE.SpotLight;
    if (!l.isLight || !visibleChain(l, barRoot)) return;
    const intensity = (l.userData.base as number | undefined) ?? l.intensity;
    if (!(intensity > 0)) return;
    p.setFromMatrixPosition(l.matrixWorld).applyMatrix4(inverse);
    // Luz sem sombra no Three atravessa a própria cúpula/arandela; no Blender também não faz sombra.
    const shadow = Boolean(l.userData.castShadow ?? l.castShadow);
    if (l.isPointLight) lights.push({ type: 'point', name: l.parent?.name ?? '', position: p.toArray(), color: lin(l.color), intensity, distance: l.distance, decay: l.decay, shadow });
    else if (l.isSpotLight) {
      l.target.updateMatrixWorld();
      t.setFromMatrixPosition(l.target.matrixWorld).applyMatrix4(inverse);
      lights.push({ type: 'spot', position: p.toArray(), target: t.toArray(), color: lin(l.color), intensity, distance: l.distance, decay: l.decay, angle: l.angle, penumbra: l.penumbra, shadow });
    }
  });
  const ambient = new THREE.Color(0, 0, 0);
  const sky = new THREE.Color(0, 0, 0);
  const ground = new THREE.Color(0, 0, 0);
  for (const l of extraLights) {
    if ((l as THREE.AmbientLight).isAmbientLight) ambient.add(l.color.clone().multiplyScalar(l.intensity));
    const h = l as THREE.HemisphereLight;
    if (h.isHemisphereLight) {
      sky.add(h.color.clone().multiplyScalar(h.intensity));
      ground.add(h.groundColor.clone().multiplyScalar(h.intensity));
    }
  }
  const info = {
    materials: materials.map((m) => m.name),
    lights,
    // irradiância de fundo (Three: ambiente + hemisfério), céu acima e chão abaixo
    world: { sky: lin(sky.add(ambient)), ground: lin(ground.add(ambient)) },
  };
  return { glb, info };
}

export interface BakedLight {
  ok: boolean;
  reason?: string;
  meshes: number;
  /** Ajusta o brilho da luz assada (atos escurecem o salão). */
  setGain(g: number): void;
}

/** Troca as malhas fixas do bar pelas assadas. Chame depois de applyAssets e antes de mergeStatic. */
export async function applyBakedLight(barRoot: THREE.Object3D, url: string): Promise<BakedLight> {
  const fail = (reason: string): BakedLight => {
    console.warn('[luz assada] usando luz em tempo real:', reason);
    return { ok: false, reason, meshes: 0, setGain() {} };
  };
  let info: { materials: string[]; scale: number; image: string };
  try {
    info = await (await fetch(url + '.json')).json();
  } catch {
    return fail('sem ' + url + '.json');
  }
  const { meshes, materials } = bakeTargets(barRoot);
  if (materials.length !== info.materials.length || materials.some((m, i) => m.name !== info.materials[i]))
    return fail('o bar mudou depois de assar (rode art/gerar_luz.sh)');

  const base = url.slice(0, url.lastIndexOf('/') + 1);
  const [gltf, lightMap] = await Promise.all([
    new GLTFLoader().loadAsync(url + '.glb'),
    new THREE.TextureLoader().loadAsync(base + info.image),
  ]);
  lightMap.colorSpace = THREE.SRGBColorSpace;
  lightMap.flipY = false;
  lightMap.channel = 1;
  lightMap.anisotropy = 4;
  // O Blender grava a luz difusa (E/π) dividida por `scale`; o Three espera a irradiância E.
  const intensity = Math.PI * info.scale;
  const baked: THREE.MeshBasicMaterial[] = materials.map((m) => {
    const b = new THREE.MeshBasicMaterial({
      name: m.name + '_assado',
      color: m.color,
      map: m.map,
      lightMap,
      lightMapIntensity: intensity,
      side: m.side,
      alphaTest: m.alphaTest,
      vertexColors: m.vertexColors,
    });
    return b;
  });
  const group = gltf.scene;
  group.name = 'luz_assada';
  group.userData.dynamic = true; // já vem junta por material; a junção não precisa mexer
  let count = 0;
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.material as THREE.Material).name;
    const i = Number(name.replace(/^L/, '').replace(/\..*$/, ''));
    if (!(i in baked)) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    if (!geo.attributes.uv1) return;
    mesh.material = baked[i];
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    count++;
  });
  for (const mesh of meshes) mesh.visible = false;
  barRoot.add(group);
  return {
    ok: true,
    meshes: count,
    setGain(g: number) {
      for (const b of baked) b.lightMapIntensity = intensity * g;
    },
  };
}
