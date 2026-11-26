"""Objetos de jogo do posto do bartender, no estilo Âmbar Noturno (100% código).

Uso (no Windows):
  blender -b -P art/blender/build_utensilios.py -- <pasta_saida> [--folha]

Saída: utensilios.glb com um nó de topo por objeto de jogo (coqueteleira, tampa,
colher, macerador, potes e conteúdos, porções, cuba de gelo, pia, bandeja,
suporte de copos, atril, livro, gaveta, alicate, pinça, faca, barata, aranha,
lesma, gosma e a mão do cliente). A origem de cada nó é a origem do objeto
correspondente no jogo (src/scene/station.ts). Com --folha, renderiza também
utensilios_folha.png (Eevee) com todos lado a lado para conferência.

Regras: nenhuma superfície coplanar (peças encostadas ficam 2 mm afastadas),
poucos polígonos (Quest 3) e nomes de material que o Three.js reconhece
(src/lab/assets.ts): vidro_*, liquido_*.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from figura import lin, skin_mesh  # noqa: E402
from lib import game  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = next((a for a in ARGS if not a.startswith('--')), os.path.abspath('out'))
FOLHA = '--folha' in ARGS
TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)

lib.reset()

# ------------------------------------------------------------------ materiais
P = lib.principled
brass = P('latao', (0.62, 0.43, 0.20), roughness=0.28, metallic=1.0)
brass_dark = P('latao_velho', (0.40, 0.27, 0.12), roughness=0.42, metallic=1.0)
copper = P('cobre', (0.75, 0.36, 0.22), roughness=0.3, metallic=1.0)
steel = P('aco_escovado', (0.7, 0.68, 0.64), roughness=0.26, metallic=1.0)
steel_dark = P('aco_interno', (0.07, 0.065, 0.06), roughness=0.5, metallic=0.6)
blade_steel = P('aco_lamina', (0.75, 0.74, 0.72), roughness=0.18, metallic=1.0)
ceramic = P('ceramica_ambar', (0.28, 0.12, 0.04), roughness=0.18)
ceramic_in = P('ceramica_interna', (0.05, 0.03, 0.02), roughness=0.6)
felt = P('feltro', (0.03, 0.06, 0.045), roughness=0.95)
paper = P('papel', (0.88, 0.82, 0.68), roughness=0.85)
leather = P('couro_livro', (0.16, 0.035, 0.02), roughness=0.55)
rubber_grip = P('cabo_borracha', (0.25, 0.04, 0.03), roughness=0.7)
ice = P('vidro_gelo', (0.85, 0.93, 0.97), roughness=0.08, transmission=0.9, ior=1.31)
lime_peel = P('limao_casca', (0.25, 0.42, 0.06), roughness=0.45)
lime_flesh = P('limao_polpa', (0.72, 0.82, 0.38), roughness=0.35)
mint = P('hortela', (0.06, 0.22, 0.07), roughness=0.55)
mint_dark = P('hortela_escura', (0.02, 0.07, 0.025), roughness=0.7)
mint_stem = P('hortela_talo', (0.16, 0.25, 0.08), roughness=0.6)
sugar = P('acucar', (0.86, 0.8, 0.68), roughness=0.95)
roach = P('barata_quitina', (0.16, 0.05, 0.02), roughness=0.18)
roach_leg = P('barata_perna', (0.09, 0.03, 0.015), roughness=0.3)
spider = P('aranha_corpo', (0.035, 0.02, 0.04), roughness=0.35)
spider_leg = P('aranha_perna', (0.05, 0.03, 0.055), roughness=0.4)
slug = P('lesma_pele', (0.17, 0.14, 0.06), roughness=0.12)
slime = P('gosma', (0.45, 0.62, 0.25), roughness=0.05, alpha=0.55, emission=(0.12, 0.2, 0.05), strength=0.25)
for m in (slime,):
    if hasattr(m, 'surface_render_method'):
        m.surface_render_method = 'BLENDED'
    if hasattr(m, 'blend_method'):
        try:
            m.blend_method = 'BLEND'
        except TypeError:
            pass
porcelain = P('porcelana_mao', lin((0.93, 0.89, 0.82)), roughness=0.25)
sleeve = P('manga_escura', lin((0.09, 0.07, 0.07)), roughness=0.7)


def walnut():
    """Nogueira assada pelo build_balcao (mesma textura do balcão), ou cor lisa se não houver."""
    files = [os.path.join(TEX, f'nogueira_corpo_{k}.png') for k in ('cor', 'rug', 'normal')]
    if all(os.path.exists(f) for f in files):
        imgs = [bpy.data.images.load(f) for f in files]
        return lib.textured('madeira_nogueira', *imgs), True
    return P('madeira_nogueira', (0.09, 0.04, 0.018), roughness=0.4), False


wood, wood_textured = walnut()
wood_dark = P('madeira_escura', (0.045, 0.022, 0.012), roughness=0.45)


def done(obj, material=None, tile=None):
    if material:
        lib.assign(obj, material)
    if obj.modifiers or obj.type == 'CURVE':
        if obj.name not in bpy.context.scene.objects:
            lib.link(obj)
        bpy.context.view_layer.update()  # o depsgraph precisa ver o objeto para aplicar o chanfro
    obj = lib.to_mesh(obj) if obj.modifiers or obj.type == 'CURVE' else lib.link(obj)
    if material and not obj.data.materials:
        obj.data.materials.append(material)
    if tile and wood_textured:
        lib.box_uv(obj, tile)
    return obj


def join(parts, name):
    """Une as peças num nó com origem na origem do objeto de jogo (transformações aplicadas)."""
    bpy.context.view_layer.update()
    for o in parts:
        if o.name not in bpy.context.scene.objects:
            lib.link(o)
        o.data.transform(o.matrix_basis)
        o.matrix_basis = Matrix.Identity(4)
    obj = lib.join(parts, name)
    obj.matrix_basis = Matrix.Identity(4)
    return obj


def lathe(name, profile, mat, seg=32, y=0.0, **kw):
    """Perfil (raio, altura do jogo) girado em torno do eixo Y do jogo; `y` desloca a altura."""
    o = lib.lathe(name, [(r, h + y) for r, h in profile], seg, **kw)
    return done(o, mat)


def box(name, size, at, mat, bevel=0.0, tile=None):
    """Caixa em coordenadas do jogo: size = (x, y, z) do jogo, at = centro no jogo."""
    sx, sy, sz = size
    return done(lib.box(name, (sx, sz, sy), game(*at), bevel=bevel, segments=2), mat, tile)


def ellipsoid(name, radii, at, mat, seg=16, rings=10):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    rx, ry, rz = radii  # jogo
    for v in bm.verts:
        v.co = Vector((v.co.x * rx, v.co.y * rz, v.co.z * ry))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = game(*at)
    lib.smooth(o)
    return done(o, mat)


def tube(name, points, radius, mat, sides=8):
    """Tubo por pontos do jogo."""
    return done(lib.tube_along(name, [tuple(game(*p)) for p in points], radius, sides), mat)


# ------------------------------------------------------------------ coqueteleira
def shaker():
    parts = [
        lathe('coq_corpo', [(0.0, -0.11), (0.058, -0.11), (0.066, -0.104), (0.067, -0.09), (0.067, 0.088),
                            (0.0645, 0.1), (0.0645, 0.112), (0.0605, 0.112)], steel, 40),
        lathe('coq_interno', [(0.0585, 0.1105), (0.0585, -0.098), (0.0, -0.098)], steel_dark, 40),
        lathe('coq_frisos', [(0.0683, -0.064), (0.0683, -0.054)], copper, 40),
        lathe('coq_frisos2', [(0.0683, 0.06), (0.0683, 0.066)], copper, 40),
    ]
    return join(parts, 'coqueteleira')


def shaker_lid():
    parts = [
        lathe('tampa_corpo', [(0.0, -0.028), (0.0635, -0.028), (0.066, -0.024), (0.066, -0.012), (0.06, -0.006),
                              (0.036, 0.016), (0.03, 0.02), (0.022, 0.021)], steel, 40),
        lathe('tampa_botao', [(0.022, 0.019), (0.024, 0.024), (0.022, 0.03), (0.0, 0.031)], copper, 32),
    ]
    return join(parts, 'coqueteleira_tampa')


# ------------------------------------------------------------------ colher bailarina
def spoon():
    parts = [lathe('colher_haste', [(0.0032, -0.2), (0.0032, 0.058)], brass, 10)]
    # torção da haste: hélice fina ao redor
    pts = []
    for i in range(121):
        t = i / 120
        y = -0.19 + t * 0.24
        a = t * math.pi * 2 * 22
        pts.append((0.0034 * math.cos(a), y, 0.0034 * math.sin(a)))
    parts.append(tube('colher_torcao', pts, 0.0011, brass, 5))
    parts.append(ellipsoid('colher_remate', (0.007, 0.009, 0.007), (0, -0.205, 0), brass, 12, 8))
    # concha côncava para +Z (jogo): calota girada
    bowl = lib.lathe('colher_concha', [(0.0, -0.007), (0.011, -0.0055), (0.018, -0.0025), (0.022, 0.002)], 24)
    bowl.rotation_euler = (math.radians(90), 0, 0)
    bowl.scale = (1.0, 1.3, 1.0)
    bowl.location = game(0, 0.079, 0.0)
    bowl.modifiers.new('esp', 'SOLIDIFY').thickness = 0.0015
    parts.append(done(bowl, brass))
    parts.append(lathe('colher_pescoco', [(0.0032, 0.056), (0.0045, 0.06), (0.003, 0.064)], brass, 10))
    return join(parts, 'colher')


# ------------------------------------------------------------------ macerador
def pestle():
    prof = [(0.0, -0.095), (0.026, -0.095), (0.031, -0.091), (0.032, -0.078), (0.028, -0.066), (0.019, -0.055),
            (0.016, -0.03), (0.018, 0.06), (0.02, 0.078), (0.018, 0.089), (0.011, 0.094), (0.0, 0.095)]
    parts = [lathe('mac_corpo', prof, wood_dark, 28),
             lathe('mac_anel', [(0.0172, -0.03), (0.0172, -0.022)], brass, 24)]
    return join(parts, 'macerador')


# ------------------------------------------------------------------ potes e conteúdos
def jar():
    parts = [
        lathe('pote_casca', [(0.0, 0.0), (0.08, 0.0), (0.088, 0.006), (0.093, 0.03), (0.092, 0.078), (0.089, 0.087),
                             (0.089, 0.09)], ceramic, 36),
        lathe('pote_interno', [(0.0845, 0.0905), (0.0845, 0.012), (0.0, 0.012)], ceramic_in, 36),
        lathe('pote_aro', [(0.0865, 0.0915), (0.092, 0.0925), (0.0935, 0.0955), (0.09, 0.0975), (0.0865, 0.0955)],
              brass, 36),
    ]
    return join(parts, 'pote')


def lime_wedge(name, at, rot_y=0.0, r=0.024, thick=0.012, tilt=0.0):
    """Meia-lua de limão: disco cortado ao meio, casca verde e polpa clara."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r, radius2=r, depth=thick)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
    edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    bmesh.ops.edgeloop_fill(bm, edges=edges)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(lime_peel)
    o.data.materials.append(lime_flesh)
    # polpa: faces de topo, base e corte; casca: lateral curva
    for p in o.data.polygons:
        n = p.normal
        p.material_index = 0 if abs(n.z) < 0.5 and n.y > -0.5 else 1
        p.use_smooth = False
    o.rotation_euler = (math.radians(90) + tilt, 0, rot_y)
    o.location = game(*at)
    return lib.link(o)


def mint_sprig(name, at, scale=1.0, rot=0.0):
    parts = []
    ox, oy, oz = at
    s = scale
    parts.append(tube(name + '_talo', [(ox, oy - 0.02 * s, oz), (ox + 0.004 * s, oy + 0.03 * s, oz)], 0.0016 * s,
                      mint_stem, 5))
    for i, (dy, side) in enumerate([(0.0, 1), (0.008, -1), (0.018, 1), (0.026, -1), (0.034, 0)]):
        a = rot + side * 0.9
        cx = ox + math.cos(a) * 0.012 * s * abs(side) + 0.004 * s
        cz = oz + math.sin(a) * 0.012 * s * abs(side)
        leaf = ellipsoid(f'{name}_folha{i}', (0.012 * s, 0.0022 * s, 0.007 * s), (cx, oy + dy * s, cz), mint, 10, 6)
        leaf.rotation_euler = (0, 0, a)
        parts.append(leaf)
    return parts


def jar_contents():
    lime = []
    for i, (x, z, a, tilt) in enumerate([(-0.035, -0.02, 0.4, 0.5), (0.03, 0.025, 2.0, -0.4), (0.0, -0.045, 1.1, 0.3),
                                         (0.04, -0.03, 2.8, 0.6), (-0.03, 0.035, 0.2, -0.5)]):
        lime.append(lime_wedge(f'pote_limao_{i}', (x, 0.093 + (i % 2) * 0.008, z), a, tilt=tilt))
    lime.append(ellipsoid('pote_limao_fundo', (0.082, 0.01, 0.082), (0, 0.08, 0), lime_peel, 18, 6))
    limao = join(lime, 'pote_limao_conteudo')
    leaves = [ellipsoid('pote_hortela_fundo', (0.082, 0.01, 0.082), (0, 0.08, 0), mint_dark, 18, 6)]
    for i, (x, z, a) in enumerate([(-0.03, -0.02, 0.3), (0.025, 0.03, 1.9), (0.035, -0.035, 2.6), (-0.04, 0.03, 4.1),
                                   (0.0, 0.0, 5.0)]):
        leaves += mint_sprig(f'pote_hortela_{i}', (x, 0.095, z), 1.0, a)
    hortela = join(leaves, 'pote_hortela_conteudo')
    mound = lathe('pote_acucar_monte', [(0.0, 0.091), (0.03, 0.0895), (0.06, 0.0875), (0.083, 0.086)], sugar, 32)
    acucar = join([mound], 'pote_acucar_conteudo')
    return [limao, hortela, acucar]


# ------------------------------------------------------------------ porções soltas
def portions():
    w = lime_wedge('porcao_limao_gomo', (0, -0.013, 0), 0.0, r=0.026, thick=0.014)
    limao = join([w], 'porcao_limao')
    cube = done(lib.box('porcao_gelo_cubo', (0.062, 0.062, 0.062), (0, 0, 0), bevel=0.01, segments=2), ice)
    gelo = join([cube], 'porcao_gelo')
    hortela = join(mint_sprig('porcao_hortela_ramo', (0, -0.005, 0), 1.25, 0.0), 'porcao_hortela')
    return [limao, gelo, hortela]


# ------------------------------------------------------------------ cuba de gelo e pia
def basin(prefix, mat_out, mat_in, depth_y, extras):
    parts = [
        box(prefix + '_fundo', (0.41, 0.012, 0.27), (0, depth_y + 0.006, 0), mat_in, 0.002),
    ]
    for s in (-1, 1):
        parts.append(box(f'{prefix}_lado{s}', (0.016, 0.051 - depth_y, 0.29), (s * 0.207, (0.051 + depth_y) / 2, 0),
                         mat_out, 0.003))
        parts.append(box(f'{prefix}_frente{s}', (0.396, 0.049 - depth_y, 0.016), (0, (0.049 + depth_y) / 2, s * 0.137),
                         mat_out, 0.003))
        parts.append(box(f'{prefix}_aba{s}', (0.43, 0.006, 0.024), (0, 0.054, s * 0.136), mat_out, 0.002))
    parts += extras
    return join(parts, prefix)


def ice_bin():
    cubes = []
    for i in range(18):
        x = ((i % 6) - 2.5) * 0.062
        z = (i // 6 - 1) * 0.075
        c = lib.box(f'cuba_cubo{i}', (0.052, 0.052, 0.05), game(x, 0.024 + (i * 7 % 3) * 0.008, z), bevel=0.009)
        c.rotation_euler = (0.2 * ((i * 5) % 3 - 1), 0.15 * ((i * 3) % 3 - 1), i * 0.64)
        cubes.append(done(c, ice))
    return basin('cuba_gelo', copper, steel, -0.0125, cubes)


def sink():
    extras = [
        lathe('pia_ralo', [(0.0, -0.0105), (0.022, -0.0105), (0.024, -0.0095)], steel_dark, 24),
        lathe('pia_base_torneira', [(0.0, 0.0), (0.026, 0.0), (0.024, 0.016), (0.014, 0.02)], brass, 24),
        tube('pia_torneira', [(-0.18, 0.015, 0), (-0.18, 0.17, 0), (-0.175, 0.195, 0), (-0.155, 0.205, 0),
                              (-0.12, 0.2, 0), (-0.085, 0.185, 0), (-0.07, 0.168, 0)], 0.009, brass, 12),
    ]
    extras[1].location = game(-0.18, 0.0, 0)
    for s in (-1, 1):
        extras.append(tube(f'pia_registro{s}', [(-0.18, 0.08, s * 0.012), (-0.18, 0.08, s * 0.05)], 0.005, brass, 8))
        extras.append(ellipsoid(f'pia_manopla{s}', (0.014, 0.008, 0.014), (-0.18, 0.08, s * 0.056), brass_dark, 10, 6))
    return basin('pia', steel, steel_dark, -0.0125, extras)


# ------------------------------------------------------------------ bandeja e suporte de copos
def tray():
    parts = [box('bandeja_fundo', (0.29, 0.004, 0.13), (0, -0.006, 0), brass_dark, 0.001)]
    for s in (-1, 1):
        parts.append(box(f'bandeja_lado{s}', (0.006, 0.018, 0.14), (s * 0.147, 0.0, 0), brass, 0.002))
        parts.append(box(f'bandeja_frente{s}', (0.288, 0.018, 0.006), (0, 0.0, s * 0.067), brass, 0.002))
        parts.append(tube(f'bandeja_alca{s}', [(s * 0.15, 0.004, -0.035), (s * 0.168, 0.008, -0.03),
                                               (s * 0.168, 0.008, 0.03), (s * 0.15, 0.004, 0.035)], 0.003, brass, 6))
    return join(parts, 'bandeja')


def glass_rack():
    parts = [box('suporte_tabua', (0.89, 0.1, 0.21), (0, 0, 0), wood, 0.008, 0.55)]
    for x in (-0.4, 0.4):
        parts.append(box(f'suporte_pe{x}', (0.05, 0.1555, 0.13), (x, -0.1278, -0.03), wood, 0.005, 0.55))
        parts.append(box(f'suporte_sapata{x}', (0.06, 0.006, 0.15), (x, -0.2045, -0.03), brass_dark, 0.002))
    parts.append(tube('suporte_trilho', [(-0.43, 0.065, 0.1), (0.43, 0.065, 0.1)], 0.005, brass, 8))
    for x in (-0.42, 0.0, 0.42):
        parts.append(tube(f'suporte_haste{x}', [(x, 0.052, 0.1), (x, 0.065, 0.1)], 0.003, brass, 6))
    return join(parts, 'suporte_copos')


# ------------------------------------------------------------------ atril e livro
def lectern():
    parts = [
        box('atril_base', (0.3, 0.22, 0.12), (0, 0.11, 0), wood, 0.008, 0.55),
        box('atril_tampo', (0.32, 0.018, 0.14), (0, 0.231, 0), wood, 0.004, 0.55),
        box('atril_rodape', (0.316, 0.016, 0.136), (0, 0.008, 0), brass_dark, 0.002),
    ]
    return join(parts, 'atril')


def book():
    parts = [box('livro_capa', (0.69, 0.36, 0.027), (0, 0, 0), leather, 0.004)]
    for x in (-0.163, 0.163):
        parts.append(box(f'livro_paginas{x}', (0.318, 0.336, 0.0245), (x, 0, 0.0278), paper, 0.002))
    parts.append(tube('livro_fita', [(0.02, 0.17, 0.042), (0.025, 0.1, 0.043), (0.02, -0.19, 0.043)], 0.003,
                      P('fita_vinho', (0.3, 0.02, 0.03), roughness=0.5), 4))
    return join(parts, 'livro')


# ------------------------------------------------------------------ gaveta e utensílios
def drawer():
    parts = [
        box('gaveta_frente', (0.025, 0.138, 0.54), (0, 0, 0), wood, 0.004, 0.55),
        box('gaveta_puxador', (0.014, 0.019, 0.145), (-0.048, 0, 0), brass, 0.003),
        box('gaveta_fundo', (0.296, 0.014, 0.494), (0.159, -0.05, 0), felt),
        box('gaveta_traseira', (0.014, 0.05, 0.5), (0.3, -0.031, 0), wood, 0.002, 0.55),
    ]
    for z in (-0.065, 0.065):
        parts.append(box(f'gaveta_pino{z}', (0.045, 0.014, 0.015), (-0.024, 0, z), brass_dark, 0.002))
    for z in (-0.253, 0.253):
        parts.append(box(f'gaveta_lateral{z}', (0.3, 0.054, 0.014), (0.16, -0.029, z), wood, 0.002, 0.55))
    for z in (-0.084, 0.084):
        parts.append(box(f'gaveta_divisoria{z}', (0.27, 0.018, 0.008), (0.16, -0.035, z), wood_dark, 0.001))
    return join(parts, 'gaveta')


def pliers():
    parts = []
    for s in (-1, 1):
        parts.append(tube(f'alicate_cabo{s}', [(-0.105, 0.0, s * 0.03), (-0.05, 0.0, s * 0.017),
                                               (0.0, 0.0, s * 0.005)], 0.0065, rubber_grip, 8))
        parts.append(tube(f'alicate_mordente{s}', [(0.0, 0.0, s * 0.005), (0.05, 0.0, -s * 0.004),
                                                   (0.1, 0.0, -s * 0.002)], 0.0055, steel, 8))
    parts.append(lathe('alicate_pino', [(0.0, -0.007), (0.009, -0.007), (0.009, 0.007), (0.0, 0.007)], steel_dark, 12))
    return join(parts, 'alicate')


def tweezers():
    parts = []
    for s in (-1, 1):
        parts.append(tube(f'pinca_haste{s}', [(-0.0765, 0.0, 0.0), (-0.06, 0.0, s * 0.006), (0.04, 0.0, s * 0.007),
                                              (0.0765, 0.0, s * 0.0015)], 0.0022, steel, 6))
    parts.append(ellipsoid('pinca_dobra', (0.006, 0.004, 0.006), (-0.077, 0, 0), steel, 10, 6))
    return join(parts, 'pinca')


def knife():
    parts = [box('faca_cabo', (0.09, 0.016, 0.022), (-0.055, 0, 0), wood_dark, 0.006)]
    for x in (-0.08, -0.03):
        parts.append(lathe(f'faca_rebite{x}', [(0.0, 0.0081), (0.0035, 0.0081), (0.003, 0.0095), (0.0, 0.0095)],
                           brass, 10))
        parts[-1].location = game(x, 0, 0)
    parts.append(box('faca_guarda', (0.008, 0.02, 0.03), (-0.008, 0, 0), steel, 0.002))
    # lâmina: perfil achatado com ponta
    bm = bmesh.new()
    outline = [(-0.004, -0.014), (0.09, -0.012), (0.105, -0.002), (0.098, 0.006), (0.06, 0.013), (-0.004, 0.014)]
    top = [bm.verts.new(game(x, 0.0015, z)) for x, z in outline]
    bot = [bm.verts.new(game(x, -0.0015, z)) for x, z in outline]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    n = len(outline)
    for i in range(n):
        bm.faces.new((top[i], bot[i], bot[(i + 1) % n], top[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('faca_lamina')
    bm.to_mesh(me)
    bm.free()
    parts.append(done(bpy.data.objects.new('faca_lamina', me), blade_steel))
    return join(parts, 'faca')


# ------------------------------------------------------------------ bichos
def legged(name, body_parts, legs, leg_mat, radius):
    body = join(body_parts, name)
    for i, pts in enumerate(legs):
        base = Vector(pts[0])
        leg = tube(f'{name}_perna_{i}', [tuple(Vector(p) - base) for p in pts], radius, leg_mat, 5)
        leg.location = game(*base)
        leg.parent = body
    return body


def cockroach():
    parts = [
        ellipsoid('barata_abdome', (0.017, 0.008, 0.026), (0, 0.0, 0.008), roach, 16, 10),
        ellipsoid('barata_torax', (0.015, 0.0075, 0.011), (0, 0.001, -0.02), roach, 14, 8),
        ellipsoid('barata_cabeca', (0.008, 0.006, 0.007), (0, -0.001, -0.033), roach_leg, 12, 8),
    ]
    for s in (-1, 1):
        parts.append(tube(f'barata_antena{s}', [(s * 0.004, 0.0, -0.038), (s * 0.016, 0.004, -0.06),
                                                (s * 0.03, 0.006, -0.075)], 0.0006, roach_leg, 4))
        parts.append(tube(f'barata_cerco{s}', [(s * 0.005, 0.002, 0.033), (s * 0.01, 0.003, 0.042)], 0.0009,
                          roach_leg, 4))
    legs = []
    for s in (-1, 1):
        for k, z in enumerate((-0.024, -0.016, -0.006)):
            spread = (-0.6, 0.1, 0.8)[k]
            out = 0.022 + k * 0.004
            legs.append([(s * 0.011, -0.003, z), (s * (0.011 + out * 0.6), 0.006, z + spread * 0.01),
                         (s * (0.011 + out), -0.008, z + spread * 0.026)])
    return legged('barata', parts, legs, roach_leg, 0.0012)


def spider_body():
    parts = [
        ellipsoid('aranha_abdome', (0.012, 0.011, 0.014), (0, 0.002, 0.012), spider, 16, 10),
        ellipsoid('aranha_cefalo', (0.008, 0.006, 0.009), (0, 0.0, -0.007), spider, 12, 8),
    ]
    red = P('aranha_marca', (0.35, 0.02, 0.02), roughness=0.4)
    parts.append(ellipsoid('aranha_marca', (0.0035, 0.002, 0.005), (0, 0.0125, 0.013), red, 8, 6))
    legs = []
    for s in (-1, 1):
        for k in range(4):
            a = math.radians(-55 + k * 35)
            dx, dz = math.cos(a), math.sin(a)
            r0 = (s * 0.006, 0.0, -0.008 + k * 0.003)
            knee = (s * (0.006 + dx * 0.022), 0.016, r0[2] + dz * 0.022)
            foot = (s * (0.006 + dx * 0.045), -0.008, r0[2] + dz * 0.045)
            legs.append([r0, knee, foot])
    return legged('aranha', parts, legs, spider_leg, 0.0011)


def slug_body():
    body = ellipsoid('lesma_corpo', (0.07, 0.016, 0.019), (0.0, 0.016, 0.0), slug, 20, 10)
    mantle = ellipsoid('lesma_manto', (0.028, 0.011, 0.016), (0.022, 0.026, 0.0), slug, 14, 8)
    parts = [body, mantle]
    for s in (-1, 1):
        parts.append(tube(f'lesma_antena{s}', [(0.06, 0.022, s * 0.005), (0.075, 0.04, s * 0.011)], 0.0018, slug, 6))
        parts.append(ellipsoid(f'lesma_olho{s}', (0.0028, 0.0028, 0.0028), (0.0758, 0.041, s * 0.0113), slug, 8, 6))
    return join(parts, 'lesma')


def slime_pool():
    pool = ellipsoid('gosma_poca', (0.075, 0.004, 0.045), (0, 0.004, 0), slime, 24, 8)
    blob = ellipsoid('gosma_gota', (0.022, 0.006, 0.017), (0.025, 0.006, -0.01), slime, 14, 6)
    return join([pool, blob], 'gosma')


# ------------------------------------------------------------------ mão do cliente (estilo Máscara)
def customer_hand():
    # pontos no jogo; palma para cima, dedos em direção ao bartender (+Z)
    wrist = Vector(game(0, -0.004, -0.055))
    palm = Vector(game(0, 0, 0.0))
    verts, edges, radii = [wrist, palm], [(0, 1)], [(0.024, 0.016), (0.04, 0.012)]
    for k in range(4):
        x = -0.024 + k * 0.016
        length = (0.04, 0.048, 0.046, 0.036)[k]
        base = Vector(game(x, 0.0, 0.035))
        mid = Vector(game(x * 1.05, 0.006, 0.035 + length * 0.55))
        tip = Vector(game(x * 1.1, 0.016, 0.035 + length))
        i0 = len(verts)
        verts += [base, mid, tip]
        radii += [(0.0085, 0.0075), (0.0075, 0.0068), (0.0062, 0.0058)]
        edges += [(1, i0), (i0, i0 + 1), (i0 + 1, i0 + 2)]
    thumb0 = Vector(game(-0.03, 0.004, 0.0))
    thumb1 = Vector(game(-0.05, 0.014, 0.025))
    i0 = len(verts)
    verts += [thumb0, thumb1]
    radii += [(0.01, 0.009), (0.008, 0.0075)]
    edges += [(1, i0), (i0, i0 + 1)]
    hand = skin_mesh('mao_pele', verts, edges, radii, 2, porcelain)
    cuff = lib.lathe('mao_punho', [(0.0, -0.1), (0.03, -0.1), (0.031, -0.06), (0.034, -0.052), (0.0, -0.052)], 24)
    cuff.rotation_euler = (math.radians(90), 0, 0)
    cuff = done(cuff, sleeve)
    return join([hand, cuff], 'mao_cliente')


# ------------------------------------------------------------------ montagem
BUILDERS = [shaker, shaker_lid, spoon, pestle, jar, jar_contents, portions, ice_bin, sink, tray, glass_rack, lectern,
            book, drawer, pliers, tweezers, knife, cockroach, spider_body, slug_body, slime_pool, customer_hand]

nodes = []
for build in BUILDERS:
    print('CONSTRUINDO', build.__name__)
    made = build()
    nodes += made if isinstance(made, list) else [made]

everything = []
for n in nodes:
    everything.append(n)
    everything += list(n.children)
lib.export(everything, os.path.join(OUT, 'utensilios.glb'))

# Relatório: caixa de cada nó em coordenadas do jogo (Y para cima).
bpy.context.view_layer.update()
for n in nodes:
    pts = []
    for o in [n, *n.children]:
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = [min(p[i] for p in pts) for i in range(3)]
    mx = [max(p[i] for p in pts) for i in range(3)]
    tris = 0
    for o in [n, *n.children]:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    # Blender (x, y, z) -> jogo (x, z, -y)
    gmin = (mn[0], mn[2], -mx[1])
    gmax = (mx[0], mx[2], -mn[1])
    print('NO %s min=(%.3f, %.3f, %.3f) max=(%.3f, %.3f, %.3f) tris=%d' % (n.name, *gmin, *gmax, tris))

# ------------------------------------------------------------------ folha de conferência
if FOLHA:
    scene = bpy.context.scene
    for engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x, scene.render.resolution_y = 2400, 1500
    scene.render.film_transparent = False
    world = bpy.data.worlds.new('folha')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.018, 0.01, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    scene.world = world
    try:
        scene.view_settings.view_transform = 'AgX'
    except TypeError:
        pass
    label_mat = P('folha_texto', (0.9, 0.75, 0.5), emission=(0.9, 0.7, 0.45), strength=2.0)
    floor_mat = P('folha_piso', (0.018, 0.011, 0.007), roughness=0.7)
    # cada objeto é mostrado com o mesmo tamanho aparente; o fator de escala vai no nome
    cols, cell = 6, 0.62
    for i, n in enumerate(nodes):
        pts = [n.matrix_world @ Vector(c) for o in [n, *n.children] for c in o.bound_box]
        lo = Vector([min(p[k] for p in pts) for k in range(3)])
        hi = Vector([max(p[k] for p in pts) for k in range(3)])
        size = max((hi - lo)[k] for k in range(3))
        s = round(min(4.0, max(0.5, 0.34 / max(size, 1e-3))), 1)
        cx, cy = (i % cols) * cell, -(i // cols) * cell * 1.25
        n.scale = (s, s, s)
        n.location = Vector((cx - (lo.x + hi.x) / 2 * s, cy - (lo.y + hi.y) / 2 * s, -lo.z * s + 0.002))
        bpy.ops.object.text_add(location=(cx - 0.27, cy - 0.27, 0.001))
        t = bpy.context.active_object
        t.data.body = f'{n.name}  ×{s:g}'
        t.data.size = 0.04
        lib.assign(t, label_mat)
    rows = (len(nodes) + cols - 1) // cols
    bpy.ops.mesh.primitive_plane_add(size=1, location=((cols - 1) * cell / 2, -(rows - 1) * cell * 0.625, 0))
    floor = bpy.context.active_object
    floor.scale = (cols * cell + 2, rows * cell + 2, 1)
    lib.assign(floor, floor_mat)
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = cols * cell + 0.5
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    target = Vector(((cols - 1) * cell / 2, -(rows - 1) * cell * 0.625 - 0.08, 0.1))
    cam.location = target + Vector((0, -4.0, 3.0))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 2400, 1800
    for loc, energy in (((-1, -3, 3), 260), ((4, -1, 2.5), 160), ((1.5, 2, 3), 120)):
        ld = bpy.data.lights.new('luz', 'AREA')
        ld.energy = energy
        ld.size = 2.5
        ld.color = (1.0, 0.75, 0.5)
        lo_ = bpy.data.objects.new('luz', ld)
        lo_.location = Vector(loc) + Vector((target.x, target.y, 0))
        lo_.rotation_euler = (target - lo_.location).to_track_quat('-Z', 'Y').to_euler()
        scene.collection.objects.link(lo_)
    scene.render.filepath = os.path.join(OUT, 'utensilios_folha.png')
    print('FOLHA', scene.render.filepath)
    bpy.ops.render.render(write_still=True)
    print('EXPORTADO', scene.render.filepath)
print('PRONTO')
