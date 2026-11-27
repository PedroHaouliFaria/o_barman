"""Assa a luz do bar Âmbar Noturno numa textura (lightmap) para o Quest 3.

Entrada (scripts/export-bake.js): bar_para_assar.glb (geometria fixa do bar, coordenadas do
jogo) e bar_para_assar.json (luzes em candela, cores lineares, fundo céu/chão, materiais).
Saída: bar_luz.glb (mesma geometria com a 2ª UV), bar_luz.jpg (a luz) e bar_luz.json (escala).

Unidades: no Three.js a irradiância de uma luz é E = I/d². No Cycles uma luz pontual de P watts
dá E = P/(4π d²), e o passe DIFFUSE (sem cor) grava E/π (conferido no Blender 5.3). Então
P = 4π·I, o fundo uniforme R dá E = πR, e o jogo multiplica a textura por π·escala.

Uso: blender -b -P bake_luz.py -- <pasta com bar_para_assar.*> <pasta de saída> [tamanho] [amostras]
"""
import json
import math
import os
import sys
import time

import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
SIZE = int(argv[2]) if len(argv) > 2 else 4096
SAMPLES = int(argv[3]) if len(argv) > 3 else 512
os.makedirs(OUT, exist_ok=True)
t0 = time.time()


def log(*a):
    print('LUZ', f'{time.time() - t0:6.1f}s', *a, flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
info = json.load(open(os.path.join(SRC, 'bar_para_assar.json')))

# ---------------- geometria ----------------
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'bar_para_assar.glb'))
meshes = [o for o in scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
bar = bpy.context.active_object
bar.name = 'bar_luz'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
log('malha', len(bar.data.polygons), 'faces,', len(bar.data.materials), 'materiais')

# 2ª UV, só para a luz: ilhas proporcionais à área real, sem sobreposição
uvs = bar.data.uv_layers
if not uvs:
    uvs.new(name='UVMap')
light_uv = uvs.new(name='luz')
uvs.active = light_uv
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True,
                         scale_to_bounds=False)
margin = 6 / SIZE
try:
    bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=True, margin_method='FRACTION', margin=margin)
except TypeError:
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
bpy.ops.object.mode_set(mode='OBJECT')
log('uv da luz pronta')

# ---------------- luzes (coordenadas do jogo -> Blender: (x, y, z) -> (x, -z, y)) ----------------
def bl(p):
    return (p[0], -p[2], p[1])


for i, L in enumerate(info['lights']):
    kind = 'SPOT' if L['type'] == 'spot' else 'POINT'
    data = bpy.data.lights.new(f'luz_{i}', kind)
    data.color = L['color']
    data.energy = 4 * math.pi * L['intensity']
    # raio da fonte = maciez da sombra: lâmpada de luminária, vela, arandela, refletor
    data.shadow_soft_size = 0.15 if kind == 'SPOT' else (0.05 if L['intensity'] > 4 else 0.035 if L['intensity'] > 2 else 0.015)
    # igual ao Three: luz sem sombra lá (velas, arandelas) não faz sombra aqui
    if not L.get('shadow', True):
        if hasattr(data, 'use_shadow'):
            data.use_shadow = False
        else:
            data.cycles.cast_shadow = False
    obj = bpy.data.objects.new(f'luz_{i}', data)
    obj.location = bl(L['position'])
    scene.collection.objects.link(obj)
    if kind == 'SPOT':
        data.spot_size = 2 * L['angle']
        data.spot_blend = L['penumbra']
        from mathutils import Vector
        d = Vector(bl(L['target'])) - Vector(bl(L['position']))
        obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
log(len(info['lights']), 'luzes')

# fundo: céu acima do horizonte, chão abaixo (igual à luz de hemisfério do Three)
world = bpy.data.worlds.new('fundo')
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputWorld')
sky = nt.nodes.new('ShaderNodeBackground')
ground = nt.nodes.new('ShaderNodeBackground')
sky.inputs['Color'].default_value = [c / math.pi for c in info['world']['sky']] + [1]
ground.inputs['Color'].default_value = [c / math.pi for c in info['world']['ground']] + [1]
coord = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ')
gt = nt.nodes.new('ShaderNodeMath')
gt.operation = 'GREATER_THAN'
gt.inputs[1].default_value = 0.0
mix = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(coord.outputs['Generated'], sep.inputs[0])
nt.links.new(sep.outputs['Z'], gt.inputs[0])
nt.links.new(gt.outputs[0], mix.inputs[0])
nt.links.new(ground.outputs[0], mix.inputs[1])
nt.links.new(sky.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out.inputs['Surface'])

# ---------------- bake ----------------
img = bpy.data.images.new('luz', SIZE, SIZE, float_buffer=True, alpha=False)
for mat in bar.data.materials:
    if mat is None:
        continue
    mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs['Roughness'].default_value = 1.0
        bsdf.inputs['Metallic'].default_value = 0.0
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = img
    mat.node_tree.nodes.active = node

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
for kind in ('OPTIX', 'CUDA'):
    try:
        prefs.compute_device_type = kind
        prefs.get_devices()
        if any(d.type == kind for d in prefs.devices):
            break
    except TypeError:
        continue
for d in prefs.devices:
    d.use = d.type != 'CPU'
scene.cycles.device = 'GPU'
scene.cycles.samples = SAMPLES
scene.cycles.max_bounces = 4
scene.cycles.diffuse_bounces = 3
scene.cycles.glossy_bounces = 0
scene.cycles.transmission_bounces = 0
scene.cycles.sample_clamp_indirect = 4.0
scene.render.bake.margin = 8
bpy.ops.object.select_all(action='DESELECT')
bar.select_set(True)
bpy.context.view_layer.objects.active = bar
uvs = bar.data.uv_layers  # referências antigas morrem ao sair do modo de edição
uvs.active = uvs['luz']
log(f'assando {SIZE}x{SIZE}, {SAMPLES} amostras...')
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=8, use_clear=True)
log('assado')

# ---------------- textura: luz / escala, codificada em sRGB (detalhe nas sombras) ----------------
px = np.empty(SIZE * SIZE * 4, dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(SIZE, SIZE, 4)[..., :3]
# tira o ruído que sobra das amostras: média 3x3 ponderada (só dentro das áreas assadas)
peak = px.max(axis=2)
mask = (peak > 0).astype(np.float32)
k = np.array([1, 2, 1], dtype=np.float32)
def blur(a):
    a = (np.pad(a, ((1, 1), (0, 0)) + ((0, 0),) * (a.ndim - 2), mode='edge'))
    a = a[:-2] * k[0] + a[1:-1] * k[1] + a[2:] * k[2]
    a = (np.pad(a, ((0, 0), (1, 1)) + ((0, 0),) * (a.ndim - 2), mode='edge'))
    return a[:, :-2] * k[0] + a[:, 1:-1] * k[1] + a[:, 2:] * k[2]
w = blur(mask)
smooth = blur(px * mask[..., None]) / np.maximum(w, 1e-6)[..., None]
px = np.where(mask[..., None] > 0, smooth, px)
lit = px.max(axis=2)[mask > 0]
scale = float(np.percentile(lit, 99.8)) if lit.size else 1.0
v = np.clip(px / scale, 0, 1)
srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
out_img = bpy.data.images.new('bar_luz', SIZE, SIZE, alpha=False)
out_img.colorspace_settings.name = 'Non-Color'
rgba = np.concatenate([srgb, np.ones((SIZE, SIZE, 1), np.float32)], axis=2).astype(np.float32)
out_img.pixels.foreach_set(rgba.ravel())
out_img.filepath_raw = os.path.join(OUT, 'bar_luz.jpg')
out_img.file_format = 'JPEG'
scene.render.image_settings.quality = 92
out_img.save()
log('textura', out_img.filepath_raw, 'escala', scale)

# ---------------- glb: só geometria + as duas UVs + nomes dos materiais ----------------
for mat in bar.data.materials:
    if mat:
        for n in [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE']:
            mat.node_tree.nodes.remove(n)
# a UV original vem primeiro (TEXCOORD_0), a da luz depois (TEXCOORD_1)
uvs = bar.data.uv_layers
uvs.active_index = 0
for i, layer in enumerate(uvs):
    layer.active_render = i == 0
bpy.ops.object.select_all(action='DESELECT')
bar.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'bar_luz.glb'), export_format='GLB', use_selection=True,
                          export_yup=True, export_normals=False, export_texcoords=True, export_materials='EXPORT',
                          export_extras=False)
json.dump({'materials': info['materials'], 'scale': scale, 'image': 'bar_luz.jpg', 'size': SIZE,
           'samples': SAMPLES}, open(os.path.join(OUT, 'bar_luz.json'), 'w'), indent=1)
log('PRONTO', OUT)
