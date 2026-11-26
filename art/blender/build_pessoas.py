"""Pessoas por código: corpo (skin modifier), rosto esculpido por funções, roupa e olhos.

Uso: blender -b -P art/blender/build_pessoas.py -- <pasta_saida>

Gera o Executivo (cliente 1) em três estilos para aprovação:
  pessoa_realista.glb, pessoa_cera.glb, pessoa_marionete.glb
Referencial: pés no chão (y = 0 do jogo), de frente para -Z do jogo (+Y do Blender),
o mesmo dos manequins provisórios de src/lab/bar.ts.
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

STYLES = {
    'realista': dict(height=1.0, neck=1.0, head=1.0, shoulders=1.0, fingers=1.0, facets=0.0, sculpt=1.0,
                     skin=(0.62, 0.42, 0.33), skin_rough=0.55, iris=(0.22, 0.16, 0.1), iris_r=0.0058,
                     suit=(0.045, 0.05, 0.06), shirt=(0.78, 0.76, 0.7), tie=(0.28, 0.04, 0.045),
                     hair=(0.13, 0.11, 0.1), gray=0.35, lips=(0.5, 0.25, 0.22), joints=False),
    'cera': dict(height=1.07, neck=1.35, head=0.93, shoulders=0.9, fingers=1.2, facets=0.0, sculpt=0.75,
                 skin=(0.86, 0.74, 0.66), skin_rough=0.22, iris=(0.42, 0.5, 0.52), iris_r=0.0066,
                 suit=(0.03, 0.03, 0.035), shirt=(0.9, 0.88, 0.82), tie=(0.35, 0.03, 0.04),
                 hair=(0.06, 0.05, 0.045), gray=0.0, lips=(0.62, 0.22, 0.2), joints=False),
    'marionete': dict(height=1.0, neck=1.1, head=1.04, shoulders=1.0, fingers=0.95, facets=0.12, sculpt=1.15,
                      skin=(0.55, 0.36, 0.22), skin_rough=0.6, iris=(0.05, 0.04, 0.03), iris_r=0.006,
                      suit=(0.08, 0.09, 0.11), shirt=(0.75, 0.68, 0.55), tie=(0.4, 0.08, 0.05),
                      hair=(0.12, 0.07, 0.04), gray=0.0, lips=(0.45, 0.15, 0.1), joints=True),
}


def lin(c):
    """sRGB -> linear (as cores de STYLES foram escolhidas em sRGB)."""
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def gauss(d, s):
    return math.exp(-(d / s) ** 2)


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ corpo/roupa por esqueleto + skin modifier
def skin_mesh(name, verts, edges, radii, subdiv=2):
    """verts em metros (Blender), radii [(rx, ry)] por vértice. Retorna malha suavizada."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, edges, [])
    obj = lib.link(bpy.data.objects.new(name, mesh))
    mod = obj.modifiers.new('pele', 'SKIN')
    mod.use_smooth_shade = True
    sk = mesh.skin_vertices[0].data
    for i, r in enumerate(radii):
        sk[i].radius = r
    sk[0].use_root = True
    sub = obj.modifiers.new('sub', 'SUBSURF')
    sub.levels = subdiv
    sub.render_levels = subdiv
    return obj


def chain(points, radii):
    verts = [tuple(p) for p in points]
    edges = [(i, i + 1) for i in range(len(points) - 1)]
    return verts, edges, radii


def merge(*parts):
    """Junta várias cadeias num só esqueleto; `parts` = (verts, edges, radii, ligar_em_indice_global|None)."""
    V, E, R = [], [], []
    for verts, edges, radii, attach in parts:
        base = len(V)
        V += verts
        R += radii
        E += [(a + base, b + base) for a, b in edges]
        if attach is not None:
            E.append((attach, base))
    return V, E, R


def build_person(style_key):
    st = dict(STYLES[style_key])
    for key in ('skin', 'iris', 'suit', 'shirt', 'tie', 'hair', 'lips'):
        st[key] = lin(st[key])
    s_h, s_n, s_sh = st['height'], st['neck'], st['shoulders']
    mats = {}

    def mat(key, color, rough=0.6, metal=0.0):
        if key not in mats:
            mats[key] = lib.principled(f'{style_key}_{key}', color, roughness=rough, metallic=metal)
        return mats[key]

    # tecido do terno: lã com risca de giz assada em textura (realista/cera); marionete = madeira pintada
    if style_key == 'marionete':
        wood = materials.walnut(f'p_{style_key}_madeira', light=st['skin'], dark=tuple(c * 0.4 for c in st['skin']),
                                gloss=0.4, plank_width=0.5, plank_length=2.0)
        imgs = lib.bake_tile(f'{style_key}_madeira', wood, 1024, TEX, tile=0.6)
        skin_mat = lib.textured(f'{style_key}_pele', imgs['cor'], imgs['rug'], imgs['normal'])
    else:
        skin_mat = None
    pin = materials.pinstripe(f'p_{style_key}_terno', st['suit'])
    pin_imgs = lib.bake_tile(f'{style_key}_terno', pin, 1024, TEX, tile=0.4)
    suit_mat = lib.textured(f'{style_key}_terno', pin_imgs['cor'], pin_imgs['rug'], pin_imgs['normal'])
    shirt_mat = mat('camisa', st['shirt'], 0.7)
    tie_mat = mat('gravata', st['tie'], 0.45)
    shoe_mat = mat('sapato', (0.025, 0.018, 0.015), 0.25)
    hair_mat = mat('cabelo', tuple(c + st['gray'] * (0.45 - c) for c in st['hair']), 0.55)
    parts = []

    def V(x, y, z):  # y do Blender = frente do personagem
        return Vector((x, y, z))

    # alturas-chave (homem de ~1,78 m)
    ankle, knee, hip = 0.09 * s_h, 0.5 * s_h, 0.93 * s_h
    waist, chest, shoulder = 1.05 * s_h, 1.3 * s_h, 1.44 * s_h
    neck_base = shoulder + 0.03
    head_base = neck_base + 0.1 * s_n
    sw = 0.185 * s_sh

    # ---------------- calça + sapatos
    legs = []
    for sx in (-1, 1):
        x = sx * 0.1
        legs.append(chain([V(x, 0.0, hip), V(x * 1.05, 0.015, knee), V(x * 1.05, -0.005, ankle + 0.03)],
                          [(0.095, 0.1), (0.07, 0.072), (0.06, 0.06)]))
    pelvis = chain([V(0, 0, waist), V(0, 0, hip + 0.02)], [(0.15, 0.105), (0.15, 0.105)])
    v, e, r = merge((*pelvis, None), (*legs[0], 1), (*legs[1], 1))
    trousers = skin_mesh('calca', v, e, r)
    lib.assign(trousers, suit_mat)
    parts.append(trousers)
    for sx in (-1, 1):
        shoe = lib.lathe('sapato', [(0, 0), (0.05, 0), (0.055, 0.02), (0.05, 0.06), (0.03, 0.075), (0, 0.078)], 24)
        shoe.scale = (0.85, 2.0, 1.0)
        shoe.location = (sx * 0.105, 0.06, 0.0)
        lib.assign(shoe, shoe_mat)
        parts.append(lib.link(shoe))

    # ---------------- paletó (tronco + mangas, com aba abaixo da cintura)
    arm_pts = {}
    for sx in (-1, 1):
        sh = V(sx * sw, -0.01, shoulder)
        elbow = V(sx * (sw + 0.07), 0.04, shoulder - 0.3 * s_h)
        wrist = V(sx * (sw + 0.06), 0.16, shoulder - 0.53 * s_h)
        arm_pts[sx] = (sh, elbow, wrist)
    torso = chain([V(0, 0.005, hip - 0.12), V(0, 0.01, waist), V(0, 0.015, chest), V(0, -0.005, shoulder - 0.02),
                   V(0, -0.01, neck_base)],
                  [(0.165, 0.115), (0.15, 0.105), (0.17, 0.115), (0.155, 0.1), (0.06, 0.06)])
    sleeves = []
    for sx in (-1, 1):
        sh, el, wr = arm_pts[sx]
        sleeves.append(chain([sh, el, wr], [(0.06, 0.062), (0.05, 0.05), (0.046, 0.046)]))
    v, e, r = merge((*torso, None), (*sleeves[0], 3), (*sleeves[1], 3))
    jacket = skin_mesh('paleto', v, e, r)
    lib.assign(jacket, suit_mat)
    parts.append(jacket)
    # lapelas e gola: placas finas sobre o peito, abrindo em V
    for sx in (-1, 1):
        bm = bmesh.new()
        pts = [V(sx * 0.015, 0.142, waist + 0.04), V(sx * 0.09, 0.138, chest + 0.05), V(sx * 0.11, 0.112, shoulder - 0.01),
               V(sx * 0.055, 0.085, neck_base - 0.015), V(sx * 0.03, 0.138, chest)]
        vs = [bm.verts.new(p) for p in pts]
        bm.faces.new(vs)
        me = bpy.data.meshes.new('lapela')
        bm.to_mesh(me)
        bm.free()
        lap = bpy.data.objects.new('lapela', me)
        sol = lap.modifiers.new('esp', 'SOLIDIFY')
        sol.thickness = 0.008
        lib.assign(lap, suit_mat)
        parts.append(lib.to_mesh(lap))
    # camisa no V do peito, punhos e colarinho aberto (gravata frouxa)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in (V(-0.03, 0.135, chest), V(0, 0.14, waist + 0.04), V(0.03, 0.135, chest),
                                     V(0.05, 0.085, neck_base - 0.015), V(-0.05, 0.085, neck_base - 0.015))]
    bm.faces.new(vs)
    me = bpy.data.meshes.new('camisa')
    bm.to_mesh(me)
    bm.free()
    shirt = bpy.data.objects.new('camisa', me)
    shirt.modifiers.new('esp', 'SOLIDIFY').thickness = 0.004
    lib.assign(shirt, shirt_mat)
    parts.append(lib.to_mesh(shirt))
    collar = lib.lathe('colarinho', [(0.052, 0.0), (0.056, 0.035)], 24, arc=(math.pi * 0.25, math.pi * 1.75))
    collar.location = (0, -0.008, neck_base - 0.005)
    lib.assign(collar, shirt_mat)
    parts.append(lib.link(collar))
    for sx in (-1, 1):
        sh, el, wr = arm_pts[sx]
        cuff = lib.lathe('punho', [(0.042, 0.0), (0.043, 0.03)], 20)
        d = (wr - el).normalized()
        cuff.location = wr - d * 0.005
        cuff.rotation_mode = 'QUATERNION'
        cuff.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
        lib.assign(cuff, shirt_mat)
        parts.append(lib.link(cuff))
    # gravata frouxa: nó abaixo do colarinho, lâmina caindo um pouco torta
    tie_pts = [V(0.004, 0.11, neck_base - 0.05), V(0.008, 0.147, chest), V(0.014, 0.152, waist + 0.06)]
    tie = lib.tube_along('gravata', [tuple(p) for p in tie_pts], 0.012, 4)
    tie.data.bevel_resolution = 0
    tie_obj = lib.to_mesh(lib.assign(tie, tie_mat))
    # achata a gravata em relação ao próprio eixo (não à origem) e alarga a ponta
    for vtx in tie_obj.data.vertices:
        t = max(0.0, min(1.0, (neck_base - 0.05 - vtx.co.z) / (neck_base - waist - 0.11)))
        cx = 0.004 + 0.01 * t
        cy = 0.11 + 0.042 * min(1.0, t * 1.6)
        vtx.co.x = cx + (vtx.co.x - cx) * (1.4 + 1.6 * t)
        vtx.co.y = cy + (vtx.co.y - cy) * 0.3
    parts.append(tie_obj)
    knot = lib.lathe('no', [(0, -0.012), (0.01, -0.008), (0.012, 0.004), (0.008, 0.011), (0, 0.012)], 12)
    knot.location = tuple(V(0.003, 0.112, neck_base - 0.045))
    knot.scale = (1.0, 0.6, 1.0)
    lib.assign(knot, tie_mat)
    parts.append(lib.link(knot))

    # ---------------- mãos (palma + dedos por skin modifier)
    for sx in (-1, 1):
        sh, el, wr = arm_pts[sx]
        d = (wr - el).normalized()
        palm_c = wr + d * 0.05
        side = Vector((sx, 0, 0))
        fwd = Vector((0, 1, 0))
        verts, edges, radii = [tuple(wr), tuple(palm_c)], [(0, 1)], [(0.022, 0.028), (0.03, 0.014)]
        fl = 0.028 * st['fingers']
        for k, off in enumerate((-0.022, -0.007, 0.008, 0.021)):
            base = palm_c + d * 0.04 + side * off * -sx + fwd * 0.004
            pts = [base + d * fl * j + fwd * 0.006 * j * j for j in range(1, 4)]
            i0 = len(verts)
            verts.append(tuple(base))
            radii.append((0.0085, 0.0075))
            edges.append((1, i0))
            for j, p in enumerate(pts):
                verts.append(tuple(p))
                radii.append((0.0078 - j * 0.0008, 0.007 - j * 0.0008))
                edges.append((i0 + j, i0 + j + 1))
        thumb_base = wr + d * 0.03 + side * -sx * -0.025 + fwd * 0.02
        i0 = len(verts)
        verts.append(tuple(thumb_base))
        radii.append((0.011, 0.01))
        edges.append((1, i0))
        for j in range(1, 3):
            verts.append(tuple(thumb_base + (d * 0.6 + fwd * 0.6).normalized() * 0.025 * j))
            radii.append((0.009 - j * 0.001, 0.0085 - j * 0.001))
            edges.append((i0 + j - 1, i0 + j))
        hand = skin_mesh('mao', verts, edges, radii, subdiv=2)
        parts.append(hand)

    # ---------------- pescoço
    neck = skin_mesh('pescoco', [tuple(V(0, -0.01, neck_base - 0.04)), tuple(V(0, 0.0, head_base + 0.02))], [(0, 1)],
                     [(0.042, 0.045), (0.04, 0.043)])
    parts.append(neck)

    # ---------------- cabeça esculpida por funções
    k = st['head']
    ax, ay, az = 0.074 * k, 0.093 * k, 0.112 * k
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=72, radius=1.0)
    head = bpy.context.active_object
    head.name = 'cabeca'
    sculpt = st['sculpt']
    colors = []
    for vtx in head.data.vertices:
        x, y, z = vtx.co
        front = smoothstep(-0.1, 0.5, y)
        disp = 0.0
        # mandíbula afinando e queixo
        if z < -0.15:
            taper = 1 - 0.32 * smoothstep(-0.15, -1.0, z)
            x *= taper
            y *= 1 - 0.12 * smoothstep(-0.15, -1.0, z) * (1 - front)
        chin = gauss(math.hypot(x, z + 0.86), 0.26) * front
        y += 0.12 * chin * sculpt
        # crânio mais cheio atrás e em cima
        y -= 0.06 * smoothstep(0.0, -0.8, y) * smoothstep(-0.3, 0.6, z)
        # testa e arco das sobrancelhas
        brow = gauss(z - 0.17, 0.08) * gauss(abs(x) - 0.38, 0.34) * front
        disp += 0.07 * brow * sculpt
        # órbitas dos olhos
        for sx in (-1, 1):
            orb = gauss(math.hypot(x - sx * 0.34, z - 0.0), 0.19) * front
            disp -= 0.11 * orb * sculpt
        # maçãs do rosto
        for sx in (-1, 1):
            disp += 0.06 * gauss(math.hypot(x - sx * 0.5, z + 0.15), 0.2) * front * sculpt
        # bochechas cansadas (levemente fundas)
        for sx in (-1, 1):
            disp -= 0.035 * gauss(math.hypot(x - sx * 0.48, z + 0.42), 0.18) * front * sculpt
        # nariz: dorso, ponta e asas
        bridge = gauss(x, 0.08) * smoothstep(0.1, -0.1, z) * smoothstep(-0.5, -0.28, z) * front
        tip = gauss(math.hypot(x, z + 0.33), 0.1) * front
        wings = sum(gauss(math.hypot(x - sx * 0.11, z + 0.39), 0.065) for sx in (-1, 1)) * front
        y += (0.2 * bridge + 0.16 * tip + 0.05 * wings) * sculpt
        # boca: lábios e linha
        lips_w = gauss(x, 0.24)
        y += (0.05 * gauss(z + 0.53, 0.045) + 0.055 * gauss(z + 0.64, 0.05)) * lips_w * front * sculpt
        y -= 0.035 * gauss(z + 0.585, 0.016) * gauss(x, 0.2) * front * sculpt
        # sulco nasolabial
        for sx in (-1, 1):
            disp -= 0.025 * gauss(math.hypot(abs(x) - 0.26, z + 0.48), 0.06) * front * sculpt
        n = Vector((x, y, z)).normalized()
        p = Vector((x, y, z)) + n * disp
        vtx.co = Vector((p.x * ax, p.y * ay, p.z * az))
        # cor da pele por vértice: olheiras, bochechas, lábios, barba por fazer
        c = list(st['skin'])
        dark = sum(gauss(math.hypot(x - sx * 0.34, z + 0.12), 0.12) for sx in (-1, 1)) * front
        lip = (gauss(z + 0.53, 0.045) + gauss(z + 0.64, 0.05)) * lips_w * front
        cheek = sum(gauss(math.hypot(x - sx * 0.46, z + 0.25), 0.2) for sx in (-1, 1)) * front
        stubble = smoothstep(-0.25, -0.6, z) * front * (1 - lip) * (0.55 if style_key == 'realista' else 0.0)
        for i in range(3):
            c[i] *= 1 - 0.35 * dark * (1.0 if style_key != 'cera' else 0.4)
            c[i] = c[i] * (1 - min(1, lip)) + st['lips'][i] * min(1, lip)
            c[i] *= 1 + (0.25 if i == 0 else -0.05) * cheek
            c[i] *= 1 - 0.25 * stubble
        colors.append(c)
    head.location = (0, 0.015, head_base + az * 0.95)
    # cores por vértice -> atributo usado pelo material da pele
    attr = head.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(colors):
        attr.data[i].color = (*[max(0, min(1, x)) for x in c], 1)
    face_mat = bpy.data.materials.new(f'{style_key}_rosto')
    face_mat.use_nodes = True
    nt = face_mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = st['skin_rough']
    if style_key == 'cera':
        bsdf.inputs['Coat Weight'].default_value = 0.6
    lib.assign(head, face_mat)
    lib.smooth(head)
    parts.append(head)
    skin_plain = skin_mat or mat('pele', st['skin'], st['skin_rough'])
    for o in (neck,) + tuple(p for p in parts if p.name.startswith('mao')):
        lib.assign(o, skin_plain)

    def head_point(ux, uy, uz):
        """Ponto da superfície da cabeça em coordenadas de esfera unitária (aprox.)."""
        return Vector((ux * ax, uy * ay, uz * az)) + head.location

    # olhos: globo branco, íris colorida e pupila; pálpebra superior caída (cansaço)
    for sx in (-1, 1):
        c = head_point(sx * 0.33, 0.755, 0.0)
        eye = lib.lathe('olho', [(0, -0.012), (0.0125, 0.0), (0, 0.012)], 24)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.0118, location=c)
        ball = bpy.context.active_object
        ball.name = 'olho'
        lib.assign(ball, mat('esclera', (0.82, 0.8, 0.74), 0.15))
        bpy.data.objects.remove(eye)
        parts.append(ball)
        iris = lib.lathe('iris', [(0, 0.0), (st['iris_r'], 0.0), (st['iris_r'] * 0.98, 0.0012)], 24)
        iris.rotation_euler.x = -math.pi / 2
        iris.location = c + Vector((0, 0.0106, 0))
        lib.assign(iris, mat('iris', st['iris'], 0.2))
        parts.append(lib.link(iris))
        pupil = lib.lathe('pupila', [(0, 0.0), (st['iris_r'] * 0.42, 0.0), (st['iris_r'] * 0.4, 0.0006)], 16)
        pupil.rotation_euler.x = -math.pi / 2
        pupil.location = c + Vector((0, 0.0116, 0))
        lib.assign(pupil, mat('pupila', (0.005, 0.005, 0.005), 0.05))
        parts.append(lib.link(pupil))
        # pálpebra superior (meia casca)
        lid = lib.lathe('palpebra', [(0.0135, 0.0), (0.0128, 0.006), (0.006, 0.0118), (0.0, 0.0122)], 20,
                        arc=(-math.pi * 0.55, math.pi * 0.55))
        lid.rotation_euler.x = math.radians(-20)
        lid.location = c
        lib.assign(lid, skin_plain if style_key == 'marionete' else mat('palpebra', tuple(x * 0.92 for x in st['skin']),
                                                                         st['skin_rough']))
        parts.append(lib.link(lid))
        # sobrancelha
        brow_pts = [tuple(head_point(sx * (0.14 + 0.42 * t), 0.9 - 0.14 * t * t, 0.19 + 0.035 * math.sin(t * 3)))
                    for t in [i / 6 for i in range(7)]]
        brow = lib.tube_along('sobrancelha', brow_pts, 0.0028, 6)
        parts.append(lib.to_mesh(lib.assign(brow, hair_mat)))
    # orelhas
    for sx in (-1, 1):
        ear = lib.lathe('orelha', [(0, 0), (0.026, 0.0), (0.03, 0.004), (0.026, 0.009), (0, 0.01)], 20)
        ear.scale = (1.0, 0.62, 1.0)
        ear.rotation_euler = (0, sx * math.radians(80), sx * math.radians(-10))
        ear.location = head_point(sx * 0.97, -0.08, -0.1)
        ear.scale = (0.62, 0.42, 1.0)
        lib.assign(ear, skin_plain)
        parts.append(lib.link(ear))
    # cabelo curto repartido de lado (casca sobre o crânio)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=48, radius=1.0)
    hair = bpy.context.active_object
    hair.name = 'cabelo'
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    kill = []
    for vtx in bm.verts:
        x, y, z = vtx.co
        line = 0.42 + 0.06 * math.cos(x * 6) - 0.35 * smoothstep(0.1, -0.6, y)  # entradas na testa, nuca mais baixa
        if z < line - (0.55 if y < -0.2 else 0.0) or (y > 0.55 and z < 0.55):
            kill.append(vtx)
        else:
            part = 0.03 * gauss(x - 0.3, 0.03) * smoothstep(0.3, 0.9, z)  # risca lateral
            vtx.co = Vector((x * ax * 1.07, y * ay * 1.06, z * az * 1.05 - part * az))
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(hair.data)
    bm.free()
    hair.location = head.location
    sol = hair.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.008
    lib.assign(hair, hair_mat)
    parts.append(lib.to_mesh(lib.smooth(hair)))

    if st['joints']:
        joint_mat = mat('junta', (0.3, 0.2, 0.12), 0.5)
        for sx in (-1, 1):
            for p in (arm_pts[sx][1], arm_pts[sx][2]):
                bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.03, location=p)
                j = bpy.context.active_object
                lib.assign(j, joint_mat)
                parts.append(j)

    # converte tudo em malha final; estilo marionete fica facetado (madeira entalhada)
    final = []
    for o in parts:
        o = lib.to_mesh(o) if (o.modifiers or o.type == 'CURVE') else o
        if st['facets'] and o.name.split('.')[0] in ('cabeca', 'paleto', 'calca', 'mao', 'pescoco'):
            dec = o.modifiers.new('facetas', 'DECIMATE')
            dec.ratio = st['facets'] if o.name.startswith('cabeca') else st['facets'] * 1.6
            o = lib.to_mesh(o)
            for poly in o.data.polygons:
                poly.use_smooth = False
        if o.name.startswith('cabeca') and skin_mat and style_key == 'marionete':
            pass
        final.append(o)
    # partes separadas (a cabeça tem cor por vértice própria; não juntar com o resto)
    lib.export(final, os.path.join(OUT, f'pessoa_{style_key}.glb'))
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)


lib.reset()
for key in STYLES:
    print('CONSTRUINDO', key)
    build_person(key)
print('PRONTO')
