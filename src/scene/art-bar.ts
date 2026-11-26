// O bar Âmbar Noturno do laboratório (src/lab) como cenário do jogo.
// O greybox continua existindo só como colisor invisível da física; tudo o que
// se vê vem dos modelos do Blender (public/models) e do estilo aprovado.
import * as THREE from 'three';
import { loadBarAssets, loadModels, type BarAssets } from '../lab/assets';
import { buildBar } from '../lab/bar';
import { STYLES } from '../lab/styles';

/** O tampo do balcão novo fica 8 mm acima do greybox; o bar desce para alinhar. */
export const ART_Y = -0.008;
/** A estante vem 60 cm para perto do bartender: as garrafas ficam ao alcance da mão em VR. */
export const SHELF_SHIFT = -0.6;

export const style = STYLES.ambar;

/** Clientes Máscara, na ordem dos pedidos jogáveis (ORDERS). `sentado` = modelo de quadril a 0,46 m. */
export const CUSTOMER_MODELS = [
  { file: 'mascara_executivo', seated: false },
  { file: 'mascara_turista', seated: true },
  { file: 'mascara_aposentado', seated: true },
  { file: 'mascara_festeira', seated: false },
  { file: 'mascara_cavalheiro', seated: false },
  { file: 'mascara_universitario', seated: true },
  { file: 'mascara_detetive', seated: false },
  { file: 'mascara_encharcado', seated: false },
  { file: 'mascara_alongado', seated: false },
];

export function mountArtBar(root: THREE.Object3D, scene: THREE.Scene, playableBottles: (x: number, worldZ: number, y: number) => boolean) {
  const bar = buildBar(style, { game: true, shelfShift: SHELF_SHIFT });
  bar.root.position.y = ART_Y;
  root.add(bar.root);
  // Mesmas luzes de base do laboratório.
  const ambient = new THREE.AmbientLight(style.light.ambient[0], style.light.ambient[1]);
  const hemi = new THREE.HemisphereLight(style.light.hemi[0], style.light.hemi[1], style.light.hemi[2]);
  // Luz de trabalho suave sobre a bancada e a estante: o jogador precisa ler rótulos e ver o copo.
  const work = new THREE.PointLight('#ffc98a', 1.4, 3.2, 2);
  work.position.set(0, 2.05, -0.25);
  const back = new THREE.PointLight('#ffb36b', 0.9, 2.6, 2);
  back.position.set(0, 2.1, 0.55);
  root.add(ambient, hemi, work, back);
  scene.background = new THREE.Color(style.background);
  scene.fog = new THREE.FogExp2(style.fog.color, style.fog.density);

  // Esconde as garrafas decorativas que ocupariam o lugar das garrafas jogáveis.
  const p = new THREE.Vector3();
  bar.root.updateMatrixWorld(true);
  for (const g of bar.shelfBottles) {
    root.worldToLocal(g.getWorldPosition(p));
    if (playableBottles(p.x, p.z, p.y)) g.visible = false;
  }

  let loaded: BarAssets | null = null;
  const ready: Promise<BarAssets> = loadBarAssets().then((assets) => {
    bar.applyAssets(assets);
    loaded = assets;
    return assets;
  });

  // Pessoas sentadas às mesas: os clientes sentados esperam ali até a vez deles.
  const tablePeople: THREE.Object3D[] = [];
  const seatedLoaded = loadModels(['mascara_turista', 'mascara_aposentado', 'mascara_universitario']).then((models) => {
    bar.tableFigures.forEach((f, i) => {
      const person = models[i];
      f.visible = false;
      if (!person) return;
      person.position.copy(f.position);
      person.rotation.copy(f.rotation);
      f.parent!.add(person);
      tablePeople.push(person);
    });
    return models;
  });

  // ---- Desempenho ----
  // 'alta' = computador (sombras, vidro com transmissão, todas as luzes do laboratório).
  // 'vr'   = Quest 3: sem sombras, vidro sem passe de transmissão, só as luzes que contam
  //          (pendentes do balcão, luz de trabalho, piano). Velas e arandelas ficam no brilho próprio.
  let quality: 'alta' | 'vr' = 'alta';
  const workLights = new Set<THREE.Light>([work, back]);
  function applyQuality(gl: THREE.WebGLRenderer) {
    const vr = quality === 'vr';
    gl.shadowMap.enabled = !vr;
    const pendants = new Set(bar.pendantLights);
    bar.root.traverse((o) => {
      const light = o as THREE.Light;
      if (light.isLight) {
        if (vr) light.castShadow = false;
        else if (light.userData.castShadow !== undefined) light.castShadow = light.userData.castShadow;
        light.userData.castShadow ??= light.castShadow;
        const essential = pendants.has(light as THREE.PointLight) || workLights.has(light) || (light as THREE.SpotLight).isSpotLight;
        light.visible = !vr || essential;
        return;
      }
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.userData.castShadow ??= mesh.castShadow;
      mesh.castShadow = vr ? false : mesh.userData.castShadow;
      for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshPhysicalMaterial[]) {
        if (!m.isMeshPhysicalMaterial) continue;
        m.userData.transmission ??= m.transmission;
        m.userData.opacity ??= m.opacity;
        if (!m.userData.transmission) continue;
        m.transmission = vr ? 0 : m.userData.transmission;
        m.transparent = true;
        m.opacity = vr ? 0.55 : m.userData.opacity;
        m.needsUpdate = true;
      }
    });
  }

  return {
    bar,
    ready,
    /** Troca o perfil de desempenho (o jogo chama ao entrar e sair do VR). */
    setQuality(mode: 'alta' | 'vr', gl: THREE.WebGLRenderer) {
      quality = mode;
      applyQuality(gl);
      ready.then(() => applyQuality(gl));
    },
    seatedLoaded,
    tablePeople,
    /** Banqueta extra para o cliente sentado no balcão (null até os modelos carregarem). */
    stool: () => loaded?.models.banqueta?.clone() ?? null,
    /** Atos: a luz do salão vai sumindo e as lâmpadas tremem mais. */
    setAct(act: number) {
      ambient.intensity = style.light.ambient[1] * (act >= 3 ? 0.55 : act === 2 ? 0.8 : 1);
      hemi.intensity = style.light.hemi[2] * (act >= 3 ? 0.6 : act === 2 ? 0.85 : 1);
      (scene.fog as THREE.FogExp2).density = style.fog.density * (act >= 3 ? 1.35 : act === 2 ? 1.15 : 1);
    },
    update(t: number, dt: number) {
      bar.update(t, dt);
    },
  };
}
