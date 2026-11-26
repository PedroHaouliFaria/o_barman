"""Pessoas v2: três estilos NÃO realistas, que escondem ou reinventam olhos e pescoço.

Uso: blender -b -P art/blender/build_pessoas_v2.py -- <pasta_saida>

  pessoa_sombra.glb     figura de silhueta, preto aveludado, sem rosto (contorno de luz no Three.js)
  pessoa_mascara.glb    boneco teatral de cabeça grande com máscara de porcelana (olhos = buracos)
  pessoa_deco.glb       estatueta art déco de bronze, volumes geométricos, filetes dourados

Todos são o Executivo (cliente 1). Referencial: pés no chão, de frente para +Y do Blender (-Z do jogo).
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
import materials  # noqa: E402

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.abspath('out')
TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)


def lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def gauss(d, s):
    return math.exp(-(d / s) ** 2)


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def skin_mesh(name, verts, edges, radii, subdiv=2, mat=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], edges, [])
    obj = lib.link(bpy.data.objects.new(name, mesh))
    mod = obj.modifiers.new('pele', 'SKIN')
    mod.use_smooth_shade = True
    sk = mesh.skin_vertices[0].data
    for i, r in enumerate(radii):
        sk[i].radius = r
    sk[0].use_root = True
    if subdiv:
        sub = obj.modifiers.new('sub', 'SUBSURF')
        sub.levels = sub.render_levels = subdiv
    if mat:
        lib.assign(obj, mat)
    return lib.to_mesh(obj)


def chain_skin(name, pts, radii, subdiv=2, mat=None):
    return skin_mesh(name, pts, [(i, i + 1) for i in range(len(pts) - 1)], radii, subdiv, mat)


def lathe_at(name, profile, loc, mat, seg=40, rot=(0, 0, 0), scale=(1, 1, 1)):
    o = lib.lathe(name, profile, seg)
    o.location = loc
    o.rotation_euler = rot
    o.scale = scale
    lib.assign(o, mat)
    return lib.link(o)


def prism(name, z0, z1, bottom, top, mat, center0=(0, 0), center1=None, bevel=0.006):
    """Tronco de pirâmide retangular: meias-larguras (x, y) embaixo e em cima."""
    center1 = center1 or center0
    bm = bmesh.new()
    vs = []
    for (hx, hy), (cx, cy), z in ((bottom, center0, z0), (top, center1, z1)):
        vs.append([bm.verts.new((cx + sx * hx, cy + sy * hy, z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    b, t = vs
    bm.faces.new(list(reversed(b)))
    bm.faces.new(t)
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((b[i], b[j], t[j], t[i]))
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    if bevel:
        m = o.modifiers.new('chanfro', 'BEVEL')
        m.width = bevel
        m.segments = 2
    lib.assign(o, mat)
    return lib.to_mesh(lib.link(o))


def sphere(name, loc, scale, mat, seg=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    for v in o.data.vertices:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    lib.smooth(o)
    lib.assign(o, mat)
    return o


def vertex_color_material(name, rough=0.4, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Coat Weight'].default_value = coat
    return m


def clear():
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)


P = lib.principled


# ===================================================================== 1. SOMBRAS
def build_shadow():
    """Silhueta alta de sobretudo e chapéu. Sem rosto: quem desenha a forma é a luz de contorno."""
    shadow = P('sombra', (0.006, 0.005, 0.005), roughness=0.7)
    band = P('sombra_fita', (0.02, 0.008, 0.008), roughness=0.35)
    parts = []
    # sobretudo: barra larga, cintura marcada, ombros retos e altos
    coat = [Vector(p) for p in ((0, 0.0, 0.5), (0, 0.0, 0.8), (0, 0.0, 1.08), (0, 0.01, 1.36), (0, -0.01, 1.58),
                                (0, -0.01, 1.7))]
    coat_r = [(0.21, 0.17), (0.17, 0.13), (0.135, 0.1), (0.16, 0.11), (0.18, 0.095), (0.075, 0.075)]
    verts, edges, radii = list(coat), [(i, i + 1) for i in range(5)], list(coat_r)
    for sx in (-1, 1):  # ombros quadrados
        verts.append(Vector((sx * 0.22, -0.01, 1.6)))
        radii.append((0.06, 0.07))
        edges.append((4, len(verts) - 1))
    parts.append(skin_mesh('sobretudo', verts, edges, radii, 2, shadow))
    # pernas finas e sapatos pontudos
    for sx in (-1, 1):
        parts.append(chain_skin('perna', [Vector((sx * 0.085, 0, 0.6)), Vector((sx * 0.08, 0.01, 0.3)),
                                          Vector((sx * 0.075, 0, 0.06))], [(0.05, 0.05), (0.042, 0.042), (0.036, 0.036)],
                                2, shadow))
        parts.append(lathe_at('sapato', [(0, 0), (0.04, 0), (0.042, 0.02), (0.03, 0.05), (0, 0.055)],
                              (sx * 0.078, 0.07, 0.0), shadow, 24, scale=(0.8, 2.6, 1.0)))
    # braços longos, mãos em luva comprida
    for sx in (-1, 1):
        sh, el, wr = Vector((sx * 0.22, 0, 1.58)), Vector((sx * 0.25, 0.03, 1.24)), Vector((sx * 0.24, 0.1, 0.95))
        parts.append(chain_skin('manga', [sh, el, wr], [(0.058, 0.06), (0.048, 0.048), (0.046, 0.046)], 2, shadow))
        d = (wr - el).normalized()
        parts.append(chain_skin('mao', [wr, wr + d * 0.07, wr + d * 0.16], [(0.03, 0.022), (0.032, 0.014),
                                                                            (0.018, 0.01)], 2, shadow))
    # gola levantada esconde o pescoço
    collar = lib.lathe('gola', [(0.075, 0.0), (0.085, 0.08), (0.1, 0.17)], 40, arc=(math.pi * 0.32, math.pi * 1.68))
    for v in collar.data.vertices:  # pontas da gola sobem mais na frente
        ang = math.atan2(v.co.x, -v.co.y)
        if v.co.z > 0.05:
            v.co.z += 0.05 * max(0.0, math.cos(ang - math.pi)) ** 2
    collar.location = (0, -0.01, 1.66)
    sol = collar.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.012
    lib.assign(collar, shadow)
    parts.append(lib.to_mesh(lib.link(collar)))
    # cabeça oval, sem feições
    parts.append(sphere('cabeca', (0, 0.0, 1.86), (0.072, 0.088, 0.108), shadow))
    # chapéu: aba com leve curva e copa com vinco
    brim = [(0.0, 0.0), (0.21, -0.01), (0.215, 0.0), (0.2, 0.012), (0.0, 0.012)]
    parts.append(lathe_at('aba', brim, (0, 0.01, 1.935), shadow, 56, rot=(math.radians(-6), 0, 0)))
    crown = lib.lathe('copa', [(0.0, 0.0), (0.1, 0.0), (0.105, 0.06), (0.098, 0.12), (0.06, 0.14), (0.02, 0.125),
                               (0.0, 0.13)], 48)
    for v in crown.data.vertices:  # vinco frontal e laterais apertadas
        ang = math.atan2(v.co.x, -v.co.y)
        if v.co.z > 0.08:
            v.co.x *= 0.9 + 0.1 * abs(math.cos(ang))
            v.co.z -= 0.02 * gauss(ang - math.pi, 0.5) * smoothstep(0.08, 0.14, v.co.z)
    crown.location = (0, 0.01, 1.945)
    crown.rotation_euler.x = math.radians(-6)
    lib.assign(crown, shadow)
    parts.append(lib.link(crown))
    parts.append(lathe_at('fita', [(0.104, 0.0), (0.107, 0.0), (0.107, 0.028), (0.104, 0.028)], (0, 0.01, 1.95),
                          band, 48, rot=(math.radians(-6), 0, 0)))
    # gravata frouxa: tira torta à frente do peito (pega a luz de contorno)
    tie = lib.tube_along('gravata', [(0.0, 0.09, 1.62), (0.015, 0.12, 1.4), (0.035, 0.115, 1.2)], 0.014, 4)
    tie = lib.to_mesh(lib.assign(tie, band))
    for v in tie.data.vertices:
        v.co.y = 0.1 + (v.co.y - 0.1) * 0.25 + 0.03 * (1.62 - v.co.z)
    parts.append(tie)
    lib.export(parts, os.path.join(OUT, 'pessoa_sombra.glb'))
    clear()


# ===================================================================== 2. MÁSCARAS
def build_mask():
    """Boneco teatral de cabeça grande. O rosto é uma máscara de porcelana com buracos nos olhos."""
    pin = materials.pinstripe('p_mascara_terno', lin((0.2, 0.2, 0.22)), lin((0.55, 0.52, 0.48)), spacing=0.02)
    imgs = lib.bake_tile('mascara_terno', pin, 1024, TEX, tile=0.4)
    suit = lib.textured('mascara_terno', imgs['cor'], imgs['rug'], imgs['normal'])
    shirt = P('camisa', lin((0.85, 0.82, 0.74)), roughness=0.6)
    tie = P('gravata', lin((0.45, 0.06, 0.07)), roughness=0.4)
    glove = P('luva', lin((0.9, 0.88, 0.82)), roughness=0.55)
    hair = P('cabelo_la', lin((0.07, 0.06, 0.06)), roughness=0.95)
    void = P('vazio', (0.0, 0.0, 0.0), roughness=1.0)
    ribbon = P('fita_mascara', lin((0.35, 0.05, 0.06)), roughness=0.4)
    shoe = P('sapato', lin((0.06, 0.04, 0.03)), roughness=0.25)
    parts = []
    # corpo curto e duro de boneco: paletó quadrado com lapelas enormes
    parts.append(prism('paleto', 0.62, 1.22, (0.2, 0.13), (0.24, 0.12), suit, bevel=0.03))
    parts.append(prism('ombros', 1.22, 1.3, (0.24, 0.12), (0.19, 0.1), suit, bevel=0.03))
    for sx in (-1, 1):
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in ((sx * 0.01, 0.15, 0.85), (sx * 0.19, 0.142, 1.2), (sx * 0.12, 0.132, 1.29),
                                        (sx * 0.05, 0.15, 1.0))]
        bm.faces.new(vs if sx > 0 else list(reversed(vs)))
        me = bpy.data.meshes.new('lapela')
        bm.to_mesh(me)
        bm.free()
        lap = bpy.data.objects.new('lapela', me)
        lap.modifiers.new('esp', 'SOLIDIFY').thickness = 0.015
        lib.assign(lap, suit)
        parts.append(lib.to_mesh(lib.link(lap)))

    # peitilho, gravata solta e colarinho alto (esconde o pescoço)
    parts.append(prism('peitilho', 0.88, 1.26, (0.03, 0.005), (0.1, 0.005), shirt, center0=(0, 0.14),
                       center1=(0, 0.126), bevel=0.0))
    parts.append(prism('gravata', 0.86, 1.22, (0.035, 0.006), (0.02, 0.006), tie, center0=(0.03, 0.148),
                       center1=(0.01, 0.134), bevel=0.003))
    for z in (0.74, 0.84):
        parts.append(lathe_at('botao', [(0, 0), (0.02, 0), (0.02, 0.006), (0, 0.01)], (0.0, 0.132, z),
                              P('botao', lin((0.6, 0.45, 0.2)), roughness=0.3, metallic=1.0), 16,
                              rot=(-math.pi / 2, 0, 0)))
    collar = lib.lathe('colarinho', [(0.1, 0.0), (0.095, 0.11)], 40, arc=(math.pi * 0.15, math.pi * 1.85))
    collar.location = (0, -0.005, 1.28)
    collar.modifiers.new('esp', 'SOLIDIFY').thickness = 0.01
    lib.assign(collar, shirt)
    parts.append(lib.to_mesh(lib.link(collar)))
    # calça larga, sapatos redondos
    for sx in (-1, 1):
        parts.append(prism('calca', 0.06, 0.66, (0.07, 0.075), (0.09, 0.1), suit, center0=(sx * 0.1, 0),
                           center1=(sx * 0.1, 0), bevel=0.02))
        parts.append(lathe_at('sapato', [(0, 0), (0.065, 0), (0.07, 0.03), (0.05, 0.06), (0, 0.065)],
                              (sx * 0.1, 0.05, 0.0), shoe, 28, scale=(1.0, 1.7, 1.0)))
    # braços duros e luvas brancas de quatro dedos
    for sx in (-1, 1):
        sh, el, wr = Vector((sx * 0.25, 0, 1.22)), Vector((sx * 0.29, 0.04, 0.96)), Vector((sx * 0.27, 0.13, 0.78))
        parts.append(chain_skin('manga', [sh, el, wr], [(0.075, 0.075), (0.062, 0.062), (0.06, 0.06)], 1, suit))
        d = (wr - el).normalized()
        palm = wr + d * 0.05
        verts, edges, radii = [wr, palm], [(0, 1)], [(0.045, 0.04), (0.05, 0.024)]
        for k in range(4):
            off = Vector((sx * (-0.03 + k * 0.02), 0, 0))
            base = palm + d * 0.03 + off
            i0 = len(verts)
            verts += [base, base + d * 0.045]
            radii += [(0.012, 0.011), (0.011, 0.01)]
            edges += [(1, i0), (i0, i0 + 1)]
        verts.append(wr + d * 0.03 + Vector((sx * 0.045, 0.02, 0)))
        radii.append((0.013, 0.012))
        edges.append((1, len(verts) - 1))
        parts.append(skin_mesh('luva', verts, edges, radii, 2, glove))
    # cabeça grande: volume escuro de lã atrás da máscara
    head_c = Vector((0, 0.0, 1.5))
    parts.append(sphere('cabeca', head_c, (0.15, 0.16, 0.18), void))
    hair_obj = sphere('cabelo', head_c + Vector((0, -0.02, 0.02)), (0.165, 0.165, 0.19), hair, 40, 28)
    bm = bmesh.new()
    bm.from_mesh(hair_obj.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.05 and v.co.z < 0.13], context='VERTS')
    for v in bm.verts:  # lã desgrenhada
        n = v.co.normalized()
        v.co += n * 0.012 * math.sin(v.co.x * 90) * math.sin(v.co.z * 80)
    bm.to_mesh(hair_obj.data)
    bm.free()
    parts.append(hair_obj)
    # máscara: casca frontal esculpida (cansaço: sobrancelhas caídas, boca para baixo), olhos furados
    bpy.ops.mesh.primitive_uv_sphere_add(segments=192, ring_count=144, radius=1.0)
    mask = bpy.context.active_object
    mask.name = 'mascara'
    bm = bmesh.new()
    bm.from_mesh(mask.data)
    kill = []
    col_layer = bm.loops.layers.color.new('Col')
    ivory = lin((0.92, 0.88, 0.8))
    for v in bm.verts:
        x, y, z = v.co
        if y < 0.15 or z > 0.8 or z < -0.95:
            kill.append(v)
            continue
        eye = min(math.hypot((x - sx * 0.36) / 1.25, (z - 0.12) * (1.0 + 0.35 * sx * (x - sx * 0.36))) for sx in (-1, 1))
        disp = -0.55 * smoothstep(0.17, 0.1, eye)                                # órbita funda e lisa
        disp += 0.09 * gauss(z - 0.32, 0.08) * gauss(abs(x) - 0.3, 0.3)          # arco das sobrancelhas
        disp += 0.05 * gauss(z - 0.32, 0.06) * gauss(abs(x) - 0.55, 0.12) * -1.0  # pontas caídas
        disp += 0.22 * gauss(x, 0.08) * smoothstep(0.15, -0.1, z) * smoothstep(-0.48, -0.3, z)  # nariz longo
        disp += 0.1 * gauss(math.hypot(x, z + 0.42), 0.1)
        disp -= 0.06 * gauss(math.hypot(abs(x) - 0.45, z + 0.25), 0.2)          # bochechas fundas
        mouth = gauss(z + 0.62 + 0.08 * abs(x), 0.03) * gauss(x, 0.28)           # boca para baixo
        disp -= 0.05 * mouth
        disp += 0.06 * gauss(math.hypot(x, z + 0.9), 0.2)                        # queixo
        v.co = v.co + v.co.normalized() * disp
        v.co = Vector((v.co.x * 0.15, v.co.y * 0.16 + 0.012, v.co.z * 0.18))
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    for f in bm.faces:  # pintura: olheiras azuladas e boca fina
        for loop in f.loops:
            x, y, z = loop.vert.co.x / 0.15, (loop.vert.co.y - 0.012) / 0.16, loop.vert.co.z / 0.18
            r = max(1e-6, math.sqrt(x * x + y * y + z * z))
            x, z = x / r, z / r
            shade = min(1.0, sum(gauss(math.hypot(x - sx * 0.36, z + 0.05), 0.13) for sx in (-1, 1)))
            hole = smoothstep(0.16, 0.115, min(math.hypot((x - sx * 0.36) / 1.25, z - 0.12) for sx in (-1, 1)))
            lips = gauss(z + 0.62 + 0.08 * abs(x), 0.025) * gauss(x, 0.24)
            c = [ivory[i] * (1 - 0.45 * shade) + (0.05 if i == 2 else 0.0) * shade for i in range(3)]
            c = [c[i] * (1 - lips) + lin((0.45, 0.08, 0.08))[i] * lips for i in range(3)]
            c = [x * (1 - hole) for x in c]
            loop[col_layer] = (*c, 1.0)
    bm.to_mesh(mask.data)
    bm.free()
    mask.location = head_c
    sol = mask.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.008
    lib.smooth(mask)
    lib.assign(mask, vertex_color_material('porcelana', rough=0.18, coat=0.8))
    parts.append(lib.to_mesh(mask))
    for sx in (-1, 1):  # fitas da máscara
        pts = [tuple(head_c + Vector((sx * 0.14, 0.06, 0.05))), tuple(head_c + Vector((sx * 0.165, -0.06, 0.06))),
               tuple(head_c + Vector((sx * 0.08, -0.165, 0.05)))]
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('fita', pts, 0.006, 6), ribbon)))
    lib.export(parts, os.path.join(OUT, 'pessoa_mascara.glb'))
    clear()


# ===================================================================== 3. ESTATUETAS DÉCO
def build_deco():
    """Estatueta de bronze em volumes geométricos, filetes dourados, cabeça oval de olhos fechados."""
    bronze = P('bronze', lin((0.5, 0.33, 0.18)), roughness=0.38, metallic=1.0)
    gilt = P('ouro_fosco', lin((0.9, 0.7, 0.4)), roughness=0.3, metallic=1.0)
    bronze_dark = P('bronze_escuro', lin((0.12, 0.08, 0.05)), roughness=0.5, metallic=1.0)
    gold = P('ouro', lin((0.95, 0.72, 0.32)), roughness=0.18, metallic=1.0)
    parts = []

    def inlay(name, pts, r=0.004):
        parts.append(lib.to_mesh(lib.assign(lib.tube_along(name, pts, r, 6), gold)))

    # pernas e calça em prismas afunilados
    for sx in (-1, 1):
        parts.append(prism('calca', 0.06, 0.92, (0.045, 0.05), (0.085, 0.08), bronze_dark, center0=(sx * 0.08, 0.0),
                           center1=(sx * 0.09, 0.0), bevel=0.006))
        parts.append(prism('sapato', 0.0, 0.06, (0.045, 0.11), (0.04, 0.06), bronze_dark, center0=(sx * 0.08, 0.04),
                           center1=(sx * 0.08, 0.0), bevel=0.01))
        inlay('vinco', [(sx * 0.08, 0.065, 0.1), (sx * 0.09, 0.083, 0.9)], 0.002)
    # paletó: cintura fina, ombros largos (trapézios)
    parts.append(prism('paleto_baixo', 0.82, 1.08, (0.15, 0.1), (0.12, 0.09), bronze, bevel=0.008))
    parts.append(prism('paleto_peito', 1.08, 1.42, (0.12, 0.09), (0.2, 0.1), bronze, bevel=0.008))
    parts.append(prism('ombros', 1.42, 1.48, (0.2, 0.1), (0.12, 0.08), bronze, bevel=0.008))
    # lapelas e gravata em chevrons dourados (linguagem déco)
    for sx in (-1, 1):
        inlay('lapela', [(sx * 0.01, 0.105, 0.95), (sx * 0.16, 0.112, 1.36), (sx * 0.09, 0.102, 1.46)])
        inlay('bolso', [(sx * 0.13, 0.104, 1.28), (sx * 0.06, 0.104, 1.28)], 0.003)
    for i, z in enumerate((1.4, 1.3, 1.2, 1.1)):
        w = 0.035 - i * 0.004
        inlay('chevron', [(-w, 0.108, z + 0.03), (0.0, 0.109, z), (w, 0.108, z + 0.03)], 0.004)
    inlay('barra', [(-0.17, 0.112, 0.83), (0.17, 0.112, 0.83)], 0.003)
    # braços como prismas articulados em ângulos retos de estátua
    for sx in (-1, 1):
        parts.append(prism('braco', 1.18, 1.45, (0.042, 0.048), (0.05, 0.052), bronze, center0=(sx * 0.24, 0.02),
                           center1=(sx * 0.21, 0.0), bevel=0.008))
        parts.append(prism('antebraco', 0.92, 1.18, (0.038, 0.043), (0.042, 0.048), bronze, center0=(sx * 0.25, 0.1),
                           center1=(sx * 0.24, 0.02), bevel=0.008))
        parts.append(prism('mao', 0.82, 0.92, (0.02, 0.035), (0.035, 0.04), gilt, center0=(sx * 0.25, 0.13),
                           center1=(sx * 0.25, 0.1), bevel=0.006))
        inlay('punho', [(sx * 0.205, 0.06, 0.93), (sx * 0.295, 0.145, 0.93)], 0.003)
    # pescoço: coluna estilizada (de propósito) com gola dourada
    parts.append(lathe_at('pescoco', [(0, 0), (0.05, 0), (0.04, 0.06), (0.036, 0.12), (0, 0.12)], (0, 0, 1.47),
                          bronze, 24))
    parts.append(lathe_at('gola', [(0.052, 0.0), (0.056, 0.0), (0.052, 0.03), (0.048, 0.03)], (0, 0, 1.47), gold, 24))
    # cabeça oval inclinada, olhos fechados gravados, nariz em aresta
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=72, radius=1.0)
    head = bpy.context.active_object
    head.name = 'cabeca'
    for v in head.data.vertices:
        x, y, z = v.co
        front = smoothstep(0.0, 0.6, y)
        if z < 0:
            x *= 1 - 0.25 * (-z)
        disp = 0.2 * gauss(x, 0.05) * smoothstep(0.25, 0.0, z) * smoothstep(-0.45, -0.25, z) * front  # nariz aresta
        for sx in (-1, 1):  # pálpebras fechadas: sulco em arco
            ex = x - sx * 0.33
            arc = z - (0.02 - 1.6 * ex * ex)
            disp -= 0.05 * gauss(arc, 0.03) * gauss(ex, 0.17) * front
            disp += 0.03 * gauss(arc - 0.05, 0.05) * gauss(ex, 0.2) * front  # pálpebra cheia
        disp -= 0.04 * gauss(z + 0.6, 0.02) * gauss(x, 0.15) * front  # boca: linha
        disp += 0.035 * gauss(z + 0.55, 0.04) * gauss(x, 0.13) * front  # lábio
        p = Vector((x, y, z)) + Vector((x, y, z)).normalized() * disp
        v.co = Vector((p.x * 0.085, p.y * 0.1, p.z * 0.13))
    head.location = (0, 0.02, 1.7)
    head.rotation_euler.x = math.radians(-12)
    lib.smooth(head)
    lib.assign(head, gilt)
    parts.append(head)
    # cabelo esculpido em ondas paralelas (capacete déco)
    hair = lathe_at('cabelo', [(0.0, 0.135), (0.06, 0.13), (0.09, 0.09), (0.092, 0.03), (0.086, -0.02)],
                    (0, 0.012, 1.7), bronze_dark, 48, rot=(math.radians(-12), 0, 0), scale=(1.02, 1.08, 1.0))
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.05 and v.co.z < 0.1], context='VERTS')
    bm.to_mesh(hair.data)
    bm.free()
    parts.append(hair)
    lib.export(parts, os.path.join(OUT, 'pessoa_deco.glb'))
    clear()


lib.reset()
for step in (build_shadow, build_mask, build_deco):
    print('CONSTRUINDO', step.__name__)
    step()
print('PRONTO')
