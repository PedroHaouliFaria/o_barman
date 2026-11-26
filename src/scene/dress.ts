// "Veste" os objetos de jogo com os modelos do Blender quando eles carregam:
// copos, garrafas e clientes Máscara. A lógica e os alvos continuam os mesmos;
// só a malha visível muda. Utensílios sem modelo seguem com o greybox até existirem.
import * as THREE from 'three';
import { loadModels, type BarAssets } from '../lab/assets';
import { CUSTOMER_MODELS } from './art-bar';
import { BASE, GLASS_SCALE } from './glass-shapes.js';
import type { Item } from './types';

/** Distância da origem da garrafa de jogo até a base (o greybox era centrado no corpo). */
const BOTTLE_BASE = -0.0945;

function clearGreybox(obj: THREE.Object3D, keep: (child: THREE.Object3D) => boolean = () => false) {
  for (const child of [...obj.children]) if (!keep(child)) obj.remove(child);
}

function bounds(obj: THREE.Object3D) {
  return new THREE.Box3().setFromObject(obj);
}

const GLASS_NODE: Record<string, string> = { highball: 'highball', rocks: 'rocks', coupe: 'coupe', mug: 'caneca' };

export function dressGlass(holder: THREE.Object3D, type: string, assets: BarAssets) {
  const source = assets.copos[GLASS_NODE[type]];
  if (!source) return;
  clearGreybox(holder);
  const model = source.clone();
  model.scale.setScalar(GLASS_SCALE);
  model.position.y = BASE;
  // Caneca com a alça para a direita do jogador.
  if (type === 'mug') model.rotation.y = Math.PI;
  holder.add(model);
}

export function dressBottle(item: Item, assets: BarAssets) {
  const source = assets.garrafas[item.id];
  if (!source) return;
  clearGreybox(item.obj);
  const model = source.clone();
  model.position.y = BOTTLE_BASE;
  item.obj.add(model);
  const box = bounds(source);
  const height = box.max.y - box.min.y;
  item.mouth = BOTTLE_BASE + height + 0.004;
  item.bottle = { radius: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2, height };
}

/** Clientes Máscara: um modelo por pedido, carregado em segundo plano. */
export function customerCast(person: THREE.Object3D, stool: () => THREE.Object3D | null) {
  const models: (THREE.Object3D | null)[] = CUSTOMER_MODELS.map(() => null);
  let seat: THREE.Object3D | null = null;
  let current = -1;
  let visible = false;
  const loading = loadModels(CUSTOMER_MODELS.map((c) => c.file)).then((loaded) => {
    loaded.forEach((model, i) => {
      const { seated } = CUSTOMER_MODELS[i];
      // Os modelos olham para -Z; o cliente olha para o bartender (+Z).
      model.rotation.y = Math.PI;
      // Sentados ficam numa banqueta do balcão (assento a 0,815 m; quadril do modelo a 0,46 m).
      if (seated) model.position.set(0, 0.355, -0.12);
      model.visible = false;
      person.add(model);
      models[i] = model;
    });
    show(current, visible);
    return loaded;
  });
  function show(index: number, on: boolean) {
    current = index;
    visible = on;
    const model = models[index];
    if (!model) return false;
    for (const m of models) if (m) m.visible = m === model && on;
    const seated = CUSTOMER_MODELS[index]?.seated;
    if (seated && !seat) {
      seat = stool();
      if (seat) {
        seat.position.set(0, 0, -0.19);
        person.add(seat);
      }
    }
    if (seat) seat.visible = on && Boolean(seated);
    return true;
  }
  return { show, loading, hasModel: (index: number) => Boolean(models[index]) };
}

/** Objetos de jogo modelados no Blender (public/models/props/utensilios.glb). */
export async function loadUtensils() {
  const [root] = await loadModels(['props/utensilios']);
  return (name: string) => {
    const node = root.getObjectByName(name);
    if (!node) return null;
    const copy = node.clone();
    copy.position.set(0, 0, 0);
    return copy;
  };
}
export type Utensils = Awaited<ReturnType<typeof loadUtensils>>;

interface UtensilTargets {
  items: Map<string, Item>;
  manual: THREE.Object3D;
  book: THREE.Object3D;
  rack: THREE.Object3D[];
  root: THREE.Object3D;
  slug: THREE.Object3D;
  actors: Record<string, THREE.Object3D>;
  /** malhas do greybox a preservar (mostradores e placas de texto) */
  keep: Set<THREE.Object3D>;
}

/** Troca a malha de blocos de cada objeto pelo modelo, sem mexer em alvos, posições e lógica. */
export function dressUtensils(get: Utensils, t: UtensilTargets) {
  const isSign = (o: THREE.Object3D) =>
    (o as THREE.Mesh).isMesh && ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).map instanceof THREE.CanvasTexture;
  const keep = (o: THREE.Object3D) => t.keep.has(o) || isSign(o) || o.name === 'sugar-dose';
  function swap(obj: THREE.Object3D | undefined, name: string, at: [number, number, number] = [0, 0, 0], extra?: (m: THREE.Object3D) => void) {
    const model = obj && get(name);
    if (!obj || !model) return null;
    clearGreybox(obj, keep);
    model.position.set(...at);
    extra?.(model);
    obj.add(model);
    return model;
  }
  const item = (id: string) => t.items.get(id)?.obj;
  swap(item('shaker'), 'coqueteleira');
  swap(item('lid'), 'coqueteleira_tampa');
  swap(item('spoon'), 'colher');
  swap(item('pestle'), 'macerador');
  for (const [id, content] of [
    ['bin-lime', 'pote_limao_conteudo'],
    ['bin-mint', 'pote_hortela_conteudo'],
    ['sugar', 'pote_acucar_conteudo'],
  ]) {
    const jar = item(id);
    if (!swap(jar, 'pote', [0, -0.006, 0])) continue;
    const filling = get(content);
    if (filling) {
      filling.position.y = -0.006;
      jar!.add(filling);
    }
  }
  swap(item('lime'), 'porcao_limao');
  swap(item('mint'), 'porcao_hortela');
  swap(item('ice'), 'porcao_gelo');
  swap(item('bin-ice'), 'cuba_gelo', [0, 0.002, 0]);
  swap(item('sink'), 'pia', [0, 0.002, 0]);
  const tray = swap(item('tray'), 'bandeja');
  if (tray) for (const child of item('tray')!.children) if (isSign(child)) child.position.y = 0.016;
  // A gaveta guarda as caixas do greybox, invisíveis: são o fundo e as laterais da física.
  const drawer = item('drawer');
  const drawerModel = get('gaveta');
  if (drawer && drawerModel) {
    for (const child of drawer.children) child.visible = false;
    drawer.add(drawerModel);
  }
  swap(item('pliers'), 'alicate');
  swap(item('tweezers'), 'pinca');
  swap(item('knife'), 'faca');
  for (const id of ['cockroach', 'spider', 'slug_slime']) {
    const name = id === 'cockroach' ? 'barata' : id === 'spider' ? 'aranha' : 'gosma';
    swap(item(id), name);
    if (id !== 'slug_slime') swap(t.actors[id], name);
  }
  if (get('lesma')) swap(t.slug, 'lesma', [0, -0.024, 0]);
  swap(item('receiving-hand'), 'mao_cliente');
  // Suporte do livro, livro e prateleira de copos não são alvos: só trocam a malha.
  const stand = get('atril');
  if (stand) {
    for (const child of [...t.manual.children]) if (child !== t.book && !keep(child)) t.manual.remove(child);
    t.manual.add(stand);
  }
  const cover = get('livro');
  if (cover) {
    for (const child of [...t.book.children]) if ((child as THREE.Mesh).isMesh && !keep(child)) t.book.remove(child);
    t.book.add(cover);
  }
  const rack = get('suporte_copos');
  if (rack) {
    for (const part of t.rack) part.visible = false; // continuam como colisores da física
    rack.position.set(-0.46, 1.29, -1.08);
    t.root.add(rack);
  }
}
