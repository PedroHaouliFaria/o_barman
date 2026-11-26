// Carrega os modelos gerados no Blender (art/blender) e ajusta os materiais
// que o glTF não descreve bem: vidro, líquido, cúpula âmbar e filamento.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface BarAssets {
  luminaria: THREE.Object3D;
  balcao: THREE.Object3D;
  copos: Record<string, THREE.Object3D>;
  garrafas: Record<string, THREE.Object3D>;
}

const loader = new GLTFLoader();
const base = import.meta.env.BASE_URL + 'models/';

function physical(source: THREE.MeshStandardMaterial, extra: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: source.color,
    roughness: source.roughness,
    metalness: 0,
    ior: 1.5,
    ...extra,
  });
}

function fixMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
    const fixed = mats.map((m) => {
      const name = m.name ?? '';
      if (name.startsWith('vidro_ambar'))
        return physical(m, {
          transmission: 0.55,
          thickness: 0.003,
          roughness: 0.25,
          side: THREE.DoubleSide,
          emissive: new THREE.Color('#ff8a2a'),
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.92,
        });
      if (name.startsWith('vidro_lampada'))
        return physical(m, { transmission: 1, thickness: 0.001, roughness: 0.02, transparent: true, opacity: 0.4 });
      if (name.startsWith('vidro_copo'))
        // vidro de copo: quase só reflexo e borda, como vidro real num bar escuro
        return physical(m, {
          color: new THREE.Color('#dfe9e6'),
          transparent: true,
          opacity: 0.22,
          roughness: 0.03,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          envMapIntensity: 3.5,
          specularIntensity: 1,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      if (name.startsWith('vidro'))
        // garrafa: vidro escuro tingido, deixa o líquido e o rótulo aparecerem
        return physical(m, {
          color: m.color.clone().multiplyScalar(0.55),
          transparent: true,
          opacity: 0.38,
          roughness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          envMapIntensity: 2.5,
          depthWrite: false,
        });
      if (name.startsWith('liquido'))
        return physical(m, {
          color: m.color.clone().multiplyScalar(0.8),
          transparent: true,
          opacity: 0.93,
          roughness: 0.12,
          envMapIntensity: 1.2,
        });
      if (name.startsWith('filamento'))
        return new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb15a').multiplyScalar(6), toneMapped: false });
      return m;
    });
    if (fixed.some((m) => (m as THREE.MeshPhysicalMaterial).transmission)) mesh.castShadow = false;
    mesh.material = Array.isArray(mesh.material) ? fixed : fixed[0];
  });
  return root;
}

async function load(name: string) {
  const gltf = await loader.loadAsync(base + name);
  return fixMaterials(gltf.scene);
}

function byPrefix(root: THREE.Object3D, prefix: string) {
  const out: Record<string, THREE.Object3D> = {};
  for (const child of [...root.children]) {
    if (!child.name.startsWith(prefix)) continue;
    child.position.set(0, 0, 0);
    out[child.name.slice(prefix.length)] = child;
  }
  return out;
}

export async function loadBarAssets(): Promise<BarAssets> {
  const [luminaria, balcao, copos, garrafas] = await Promise.all(
    ['luminaria.glb', 'balcao.glb', 'copos.glb', 'garrafas.glb'].map(load),
  );
  return { luminaria, balcao, copos: byPrefix(copos, 'copo_'), garrafas: byPrefix(garrafas, 'garrafa_') };
}
