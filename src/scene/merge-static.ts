// Junta a geometria que não se mexe (sala, balcão, estante, mesas, cadeiras, garrafas
// decorativas...) em uma malha por material. O visual não muda: mesmas malhas, mesmos
// materiais, mesmas posições; o que cai é o número de chamadas de desenho por quadro,
// que é o limite real do Quest 3.
// Fica de fora tudo o que anima, troca de visibilidade ou é marcado com userData.dynamic.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function visibleChain(o: THREE.Object3D, stop: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p && p !== stop; p = p.parent) if (!p.visible) return false;
  return true;
}

export function mergeStatic(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>();
  const skip = new Set<THREE.Object3D>();
  root.traverse((o) => {
    if (o.userData.dynamic) o.traverse((c) => skip.add(c));
  });
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || skip.has(mesh) || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (Array.isArray(mesh.material) || !visibleChain(mesh, root)) return;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    if (Object.keys(geometry.morphAttributes).length) return;
    const attrs = Object.keys(geometry.attributes).sort().join(',');
    const key = mesh.material.uuid + '|' + attrs + '|' + (geometry.index ? 'i' : 'n') + '|' + mesh.castShadow + mesh.receiveShadow;
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { material: mesh.material, meshes: [] }));
    group.meshes.push(mesh);
  });
  let before = 0,
    after = 0;
  const matrix = new THREE.Matrix4();
  for (const { material, meshes } of groups.values()) {
    before += meshes.length;
    if (meshes.length < 2) {
      after += meshes.length;
      continue;
    }
    const parts = meshes.map((mesh) => {
      const g = (mesh.geometry as THREE.BufferGeometry).clone();
      matrix.multiplyMatrices(inverse, mesh.matrixWorld);
      g.applyMatrix4(matrix);
      return g;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) {
      after += meshes.length;
      continue;
    }
    merged.computeBoundingSphere();
    const out = new THREE.Mesh(merged, material);
    out.name = 'estatico:' + (material.name || material.type);
    out.castShadow = meshes[0].castShadow;
    out.receiveShadow = meshes[0].receiveShadow;
    out.renderOrder = meshes[0].renderOrder;
    out.userData.merged = meshes.length;
    root.add(out);
    for (const mesh of meshes) mesh.removeFromParent();
    after += 1;
  }
  return { before, after };
}
