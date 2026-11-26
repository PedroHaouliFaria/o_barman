"""Estilo Máscara: pessoas como bonecos teatrais com máscara de porcelana.

Normais: olhos pintados à mão, bochechas e expressão. Estranhos (depois): olhos-buraco.
Uso: blender -b -P art/blender/build_mascaras.py -- <pasta_saida>
Saída: mascara_<id>.glb (pés no chão, de frente para +Y do Blender = -Z do jogo).
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
from figura import (chain_skin, clear, gauss, lathe_at, lin, prism, skin_mesh, smoothstep,  # noqa: E402
                    sphere, vertex_color_material)

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.abspath('out')
TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)
P = lib.principled

PEOPLE = {
    # cliente 1: cansado, gravata frouxa, de pé no balcão
    'executivo': dict(body='terno', seated=False, suit=(0.2, 0.2, 0.22), stripe=(0.55, 0.52, 0.48),
                      shirt=(0.85, 0.82, 0.74), tie=(0.45, 0.06, 0.07), hair='la', hair_color=(0.07, 0.06, 0.06),
                      iris=(0.3, 0.2, 0.12), mood='cansado', nose=1.0, lips=(0.55, 0.22, 0.2), blush=0.25,
                      briefcase=True),
    # cliente 2: jovem, simpática, sorridente; vestido, coque, câmera fotográfica
    'turista': dict(body='vestido', seated=True, dress=(0.78, 0.55, 0.22), dress2=(0.55, 0.3, 0.12),
                    shirt=(0.95, 0.92, 0.85), hair='coque', hair_color=(0.36, 0.18, 0.08), iris=(0.2, 0.38, 0.5),
                    mood='sorriso', nose=0.7, lips=(0.78, 0.16, 0.2), blush=0.6, camera=True),
    # cliente 4: elegante e alegre, começando a noite; vestido de franjas anos 20, pena, pérolas, piteira
    'festeira': dict(body='melindrosa', seated=False, dress=(0.78, 0.72, 0.6), shirt=(0.94, 0.92, 0.88),
                     hair='chanel', hair_color=(0.04, 0.03, 0.03), iris=(0.3, 0.2, 0.12), mood='festa', nose=0.65,
                     lips=(0.45, 0.04, 0.08), blush=0.45, shadow=(0.32, 0.18, 0.36), pinta=True),
    # cliente 3: senhor educado, grisalho, bigode e óculos; paletó de tweed
    'aposentado': dict(body='terno', seated=True, suit=(0.42, 0.34, 0.24), stripe=(0.6, 0.5, 0.36),
                       shirt=(0.88, 0.86, 0.8), tie=(0.15, 0.22, 0.32), hair='calvo', hair_color=(0.52, 0.5, 0.48),
                       iris=(0.35, 0.42, 0.45), mood='sereno', nose=1.25, lips=(0.6, 0.3, 0.28), blush=0.35,
                       mustache=True, glasses=True, vest=(0.32, 0.18, 0.12), cane=True),
    # cliente 7: reservada, observadora; ao virar de costas revela um segundo rosto na nuca
    'detetive': dict(body='sobretudo', seated=False, coat=(0.6, 0.48, 0.32), coat2=(0.34, 0.25, 0.16),
                     shirt=(0.8, 0.78, 0.72), hair='chanel', hair_color=(0.1, 0.07, 0.06), iris=(0.25, 0.42, 0.3),
                     mood='desconfiada', nose=0.85, lips=(0.55, 0.12, 0.14), blush=0.2, hat=True,
                     back_face=dict(mood='segundo', eyes='pintado', nose=0.6, iris=(0.0, 0.0, 0.0),
                                    lips=(0.12, 0.02, 0.03), blush=0.0)),
}

MOODS = {
    # sobrancelha (queda nas pontas), boca (curva: + sorri, - triste), pálpebra (0 aberto .. 1 fechado), olho feliz
    'cansado': dict(brow=0.06, mouth=-0.06, lid=0.42, happy=0.0),
    'sorriso': dict(brow=-0.03, mouth=0.14, lid=0.1, happy=0.6),
    'sereno': dict(brow=0.02, mouth=0.04, lid=0.3, happy=0.25),
    'festa': dict(brow=-0.05, mouth=0.16, lid=0.28, happy=0.45),
    'desconfiada': dict(brow=-0.02, mouth=-0.01, lid=0.38, happy=0.0),
    # o segundo rosto: olhos pretos pintados e sorriso largo demais
    'segundo': dict(brow=-0.05, mouth=0.24, lid=0.0, happy=0.0),
}


def paint_eye(x, z, sx, iris, mood):
    """Cor pintada do olho no ponto (x, z) da esfera unitária; None se fora do olho."""
    cx, cz = sx * 0.33, 0.1
    u = (x - cx) / 0.15
    v = (z - cz) / 0.075
    top = 1.0 - mood['lid'] * 0.9
    bottom = -1.0 + mood['happy'] * 0.8
    shape = 1 - u * u
    if shape <= 0:
        return None
    vt, vb = top * shape, bottom * shape
    line = 0.18
    if vb - line < v < vt + line * 1.6:
        if v > vt or v < vb:  # contorno: traço de nanquim, mais grosso em cima
            return (0.05, 0.035, 0.03)
        d = math.hypot((x - cx - sx * 0.005) / 0.058, (z - cz + 0.004) / 0.058)
        if iris == (0.0, 0.0, 0.0):  # segundo rosto: olho todo preto
            return (0.01, 0.01, 0.01)
        if d < 0.38:
            hl = math.hypot((x - cx + 0.018) / 0.014, (z - cz - 0.02) / 0.014)
            return (0.95, 0.95, 0.92) if hl < 1 else (0.02, 0.015, 0.015)
        if d < 1.0:
            return tuple(c * (0.75 + 0.25 * d) for c in iris)
        return (0.9, 0.88, 0.82)
    return None


def face_color(x, z, p, mood, eyes, ivory, iris, lips, brow_col):
    """Cor (linear) pintada no ponto (x, z) da esfera unitária da máscara."""
    c = list(ivory)
    blush = p['blush'] * sum(gauss(math.hypot(x - sx * 0.45, z + 0.25), 0.15) for sx in (-1, 1))
    c = [c[0] * (1 - 0.25 * blush) + 0.75 * 0.25 * blush, c[1] * (1 - 0.35 * blush), c[2] * (1 - 0.38 * blush)]
    mouth_z = -0.62 + mood['mouth'] * abs(x) * 2.2
    lip = gauss(z - mouth_z - 0.02, 0.045) * gauss(x, 0.22)
    c = [c[i] * (1 - lip) + lips[i] * lip for i in range(3)]
    line = gauss(z - mouth_z, 0.008) * gauss(x, 0.2)  # traço fino entre os lábios
    c = [c[i] * (1 - 0.6 * line) for i in range(3)]
    for sx in (-1, 1):  # sobrancelha pintada, afinando nas pontas
        bx = (x - sx * 0.33) / 0.2
        droop = mood['brow'] * 0.8 * max(0.0, (abs(x) - 0.33) / 0.2)
        bz = 0.27 + 0.05 * (1 - bx * bx) - droop
        if abs(bx) < 1:
            w = 0.016 * (1 - 0.6 * abs(bx))
            k = smoothstep(w, w * 0.6, abs(z - bz))
            c = [c[i] * (1 - k) + brow_col[i] * k for i in range(3)]
    if eyes == 'buraco':
        hole = smoothstep(0.16, 0.115, min(math.hypot((x - sx * 0.33) / 1.25, z - 0.1) for sx in (-1, 1)))
        return [k * (1 - hole) for k in c]
    if p.get('shadow'):  # sombra colorida de festa sobre as pálpebras
        sh_col = lin(p['shadow'])
        for sx in (-1, 1):
            k = 0.85 * gauss(math.hypot((x - sx * 0.33) / 1.3, z - 0.15), 0.075)
            c = [c[i] * (1 - k) + sh_col[i] * k for i in range(3)]
    if p.get('pinta'):  # pinta acima do lábio
        k = smoothstep(0.022, 0.014, math.hypot(x - 0.2, z + 0.47))
        c = [ci * (1 - k) + 0.03 * k for ci in c]
    for sx in (-1, 1):
        if mood['lid'] > 0.2:  # pálpebra caída: sombra suave acima do olho
            sh = 0.25 * mood['lid'] * gauss(math.hypot((x - sx * 0.33) / 1.4, z - 0.17), 0.06)
            c = [k * (1 - sh) for k in c]
        e = paint_eye(x, z, sx, iris, mood)
        if e:
            c = list(lin(e))
    return c


def srgb(x):
    x = max(0.0, min(1.0, x))
    return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055


def paint_face_image(name, p, mood, eyes, ivory, iris, lips, brow_col, size=1024):
    back = p.get('back_face')
    """Pinta o rosto numa textura (UV: u = longitude, v = latitude da esfera unitária)."""
    img = bpy.data.images.new(name, size, size)
    px = [0.0] * (size * size * 4)
    base = list(ivory)
    for j in range(size):
        lat = (j / (size - 1) - 0.5) * math.pi
        cl, z = math.cos(lat), math.sin(lat)
        for i in range(size):
            lon = i / (size - 1) * 2 * math.pi + math.pi / 2
            x, y = cl * math.sin(lon), cl * math.cos(lon)
            if y > 0.1:
                c = face_color(x, z, p, mood, eyes, ivory, iris, lips, brow_col)
            elif back and y < -0.1:
                b = back
                c = face_color(-x, z, b, MOODS[b['mood']], b['eyes'], ivory, lin(b['iris']), lin(b['lips']), brow_col)
            else:
                c = base
            k = (j * size + i) * 4
            px[k:k + 4] = (srgb(c[0]), srgb(c[1]), srgb(c[2]), 1.0)  # imagem PNG guarda sRGB
    img.pixels.foreach_set(px)
    img.filepath_raw = os.path.join(TEX, name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def hair_shell(name, head_c, radii, lon0, lon1, bottom, top, mat, nu=96, nv=24, wrap=False, wave=0.0):
    """Cabelo como faixa paramétrica sobre o crânio: bordas exatas, sem degraus.
    bottom(lon) e top(lon) dão a latitude (rad) das bordas."""
    bm = bmesh.new()
    cols = nu if wrap else nu + 1
    grid = []
    for i in range(cols):
        lon = lon0 + (lon1 - lon0) * i / nu
        b, t = bottom(lon), top(lon)
        row = []
        for j in range(nv + 1):
            lat = b + (t - b) * j / nv
            r = 1.0 + wave * math.sin(lon * 40) * (j / nv)
            row.append(bm.verts.new((head_c.x + radii[0] * r * math.cos(lat) * math.sin(lon),
                                     head_c.y + radii[1] * r * math.cos(lat) * math.cos(lon),
                                     head_c.z + radii[2] * math.sin(lat))))
        grid.append(row)
    for i in range(nu if wrap else nu):
        a, b = grid[i], grid[(i + 1) % cols]
        for j in range(nv):
            bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.modifiers.new('esp', 'SOLIDIFY').thickness = 0.007
    lib.assign(o, mat)
    return lib.to_mesh(lib.smooth(lib.link(o)))


def sculpt_face(x, z, mood, nose, eyes):
    """Relevo do rosto em coordenadas da esfera unitária (x lateral, z vertical)."""
    eye = min(math.hypot((x - sx * 0.33) / 1.25, z - 0.1) for sx in (-1, 1))
    disp = 0.0
    if eyes == 'buraco':
        disp -= 0.55 * smoothstep(0.17, 0.1, eye)
    else:
        disp -= 0.045 * gauss(eye, 0.14)
        disp += 0.025 * gauss(eye, 0.07)
    disp += 0.05 * gauss(z - 0.3, 0.08) * gauss(abs(x) - 0.3, 0.3)
    disp -= mood['brow'] * gauss(z - 0.3, 0.06) * gauss(abs(x) - 0.55, 0.12)
    disp += 0.2 * nose * gauss(x, 0.07 * (0.8 + 0.3 * nose)) * smoothstep(0.1, -0.1, z) * smoothstep(-0.46, -0.28, z)
    disp += 0.09 * nose * gauss(math.hypot(x, z + 0.4), 0.09 * nose)
    disp += 0.05 * mood['happy'] * sum(gauss(math.hypot(x - sx * 0.42, z + 0.28), 0.16) for sx in (-1, 1))
    disp -= 0.04 * (1 - mood['happy']) * gauss(math.hypot(abs(x) - 0.45, z + 0.25), 0.2)
    mouth_z = -0.62 + mood['mouth'] * abs(x) * 2.2
    disp += 0.035 * gauss(z - mouth_z - 0.045, 0.035) * gauss(x, 0.24)
    disp += 0.04 * gauss(z - mouth_z + 0.05, 0.04) * gauss(x, 0.2)
    disp -= 0.035 * gauss(z - mouth_z, 0.015) * gauss(x, 0.26)
    disp += 0.06 * gauss(math.hypot(x, z + 0.9), 0.2)
    return disp


def build_mask_head(parts, key, p, head_c, eyes='pintado'):
    mood = MOODS[p['mood']]
    ivory = lin((0.93, 0.89, 0.82))
    iris = lin(p['iris'])
    lips = lin(p['lips'])
    brow_col = lin(tuple(c * 0.8 for c in p['hair_color']))
    hair_mat = P(f'{key}_cabelo', lin(p['hair_color']), roughness=0.9)
    if eyes == 'buraco':  # estranho: cabeça preta atrás da máscara
        parts.append(sphere('cabeca', head_c, (0.148, 0.158, 0.178), P('vazio', (0, 0, 0), roughness=1.0)))
    # cabelo
    if p['hair'] == 'la':
        h = sphere('cabelo', head_c + Vector((0, -0.02, 0.02)), (0.165, 0.165, 0.19), hair_mat, 40, 28)
        bm = bmesh.new()
        bm.from_mesh(h.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.05 and v.co.z < 0.13], context='VERTS')
        for v in bm.verts:
            v.co += v.co.normalized() * 0.012 * math.sin(v.co.x * 90) * math.sin(v.co.z * 80)
        bm.to_mesh(h.data)
        bm.free()
        parts.append(h)
    elif p['hair'] == 'coque':
        def hairline(lon):  # testa alta na frente, nuca baixa atrás
            front = max(0.0, math.cos(lon)) ** 2
            return 0.55 * front - 0.35 * (1 - front) + 0.04 * math.sin(lon * 6) * (1 - front)
        parts.append(hair_shell('cabelo', head_c, (0.157, 0.167, 0.186), -math.pi, math.pi, hairline,
                                lambda lon: math.pi / 2 - 0.001, hair_mat, nu=128, nv=32, wrap=True, wave=0.008))
        parts.append(sphere('coque', head_c + Vector((0, -0.14, 0.15)), (0.075, 0.07, 0.07), hair_mat, 32, 20))
        parts.append(lathe_at('presilha', [(0.0, 0), (0.06, 0.0), (0.06, 0.012), (0, 0.012)],
                              head_c + Vector((0, -0.1, 0.13)), P('presilha', lin((0.55, 0.1, 0.12)), roughness=0.4),
                              24, rot=(math.radians(60), 0, 0)))
    elif p['hair'] == 'chanel':
        for a0, a1 in ((math.radians(40), math.radians(130)), (math.radians(230), math.radians(320))):
            parts.append(hair_shell('cabelo', head_c, (0.158, 0.168, 0.187), a0, a1,
                                    lambda lon: -0.42 + 0.06 * math.sin(lon * 5),
                                    lambda lon: math.pi / 2 - 0.05, hair_mat, nu=48, nv=24, wave=0.006))
        parts.append(hair_shell('franja', head_c, (0.16, 0.17, 0.189), math.radians(-42), math.radians(42),
                                lambda lon: 0.5 + 0.03 * math.cos(lon * 8), lambda lon: math.pi / 2 - 0.05, hair_mat,
                                nu=48, nv=16))
    elif p['hair'] == 'calvo':
        # coroa grisalha de orelha a orelha, por trás; o topo fica careca
        parts.append(hair_shell('cabelo', head_c, (0.155, 0.165, 0.183), math.radians(70), math.radians(290),
                                lambda lon: -0.3 + 0.05 * math.cos(lon * 3),
                                lambda lon: 0.12 + 0.12 * max(0.0, -math.cos(lon)) + 0.025 * math.sin(lon * 11),
                                hair_mat, nu=96, nv=16, wave=0.012))
    if p.get('hat'):
        felt = P(f'{key}_chapeu', lin((0.16, 0.13, 0.1)), roughness=0.8)
        band = P(f'{key}_fita_chapeu', lin((0.08, 0.05, 0.04)), roughness=0.4)
        top_z = head_c.z + 0.13
        parts.append(lathe_at('aba', [(0.0, 0.0), (0.25, -0.012), (0.255, 0.0), (0.24, 0.012), (0.0, 0.012)],
                              Vector((0, 0.01, top_z)), felt, 56, rot=(math.radians(-8), 0, 0)))
        crown = lib.lathe('copa', [(0.0, 0.0), (0.15, 0.0), (0.155, 0.07), (0.145, 0.12), (0.09, 0.145),
                                   (0.03, 0.13), (0.0, 0.135)], 48)
        for v in crown.data.vertices:
            ang = math.atan2(v.co.x, -v.co.y)
            if v.co.z > 0.08:
                v.co.z -= 0.022 * gauss(ang - math.pi, 0.5) * smoothstep(0.08, 0.145, v.co.z)
        crown.location = Vector((0, 0.01, top_z + 0.005))
        crown.rotation_euler.x = math.radians(-8)
        lib.assign(crown, felt)
        parts.append(lib.link(crown))
        parts.append(lathe_at('fita', [(0.153, 0.0), (0.157, 0.0), (0.157, 0.03), (0.153, 0.03)],
                              Vector((0, 0.01, top_z + 0.01)), band, 48, rot=(math.radians(-8), 0, 0)))
    # máscara esculpida e pintada
    bpy.ops.mesh.primitive_uv_sphere_add(segments=192, ring_count=144, radius=1.0)
    mask = bpy.context.active_object
    mask.name = 'mascara'
    bm = bmesh.new()
    bm.from_mesh(mask.data)
    kill = []
    nose = p['nose']
    back = p.get('back_face')
    uv_layer = bm.loops.layers.uv.verify()
    for f in bm.faces:  # UV pela direção original (antes de esculpir)
        for loop in f.loops:
            x, y, z = loop.vert.co
            lon = (math.atan2(x, y) - math.pi / 2) % (2 * math.pi)
            loop[uv_layer].uv = (lon / (2 * math.pi), 0.5 + math.asin(max(-1, min(1, z))) / math.pi)
    for v in bm.verts:
        x, y, z = v.co
        if eyes == 'buraco' and (y < 0.15 or z > 0.8 or z < -0.95):
            kill.append(v)
            continue
        # rosto da frente (só no hemisfério da frente) e, se houver, o segundo rosto na nuca
        disp = smoothstep(-0.1, 0.4, y) * sculpt_face(x, z, mood, nose, eyes)
        if back:
            disp += smoothstep(-0.1, 0.4, -y) * sculpt_face(-x, z, MOODS[back['mood']], back['nose'], back['eyes'])
        v.co = v.co + v.co.normalized() * disp
        v.co = Vector((v.co.x * 0.15, v.co.y * 0.16 + 0.012, v.co.z * 0.18))
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(mask.data)
    bm.free()
    mask.location = head_c
    if eyes == 'buraco':
        mask.modifiers.new('esp', 'SOLIDIFY').thickness = 0.008
    lib.smooth(mask)
    face = paint_face_image(f'rosto_{key}', p, mood, eyes, ivory, iris, lips, brow_col)
    face_mat = lib.textured(f'porcelana_{key}', face)
    bsdf = face_mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.22
    bsdf.inputs['Coat Weight'].default_value = 0.8
    lib.assign(mask, face_mat)
    parts.append(lib.to_mesh(mask))
    ribbon = P(f'{key}_fita', lin((0.35, 0.05, 0.06)), roughness=0.4)
    for sx in ((-1, 1) if eyes == 'buraco' else ()):
        pts = [tuple(head_c + Vector((sx * 0.14, 0.06, 0.05))), tuple(head_c + Vector((sx * 0.165, -0.06, 0.06))),
               tuple(head_c + Vector((sx * 0.08, -0.165, 0.05)))]
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('fita', pts, 0.005, 6), ribbon)))
    if p.get('mustache'):
        m = lib.tube_along('bigode', [tuple(head_c + Vector((sx * 0.05, 0.165, -0.085 - 0.012 * abs(sx))))
                                      for sx in (-1, -0.5, 0, 0.5, 1)], 0.011, 8)
        parts.append(lib.to_mesh(lib.assign(m, hair_mat)))
    if p.get('glasses'):
        gold = P('aro_ouro', lin((0.85, 0.65, 0.3)), roughness=0.25, metallic=1.0)
        for sx in (-1, 1):
            ring = [tuple(head_c + Vector((sx * 0.05 + 0.032 * math.cos(a), 0.175, 0.018 + 0.026 * math.sin(a))))
                    for a in [i / 24 * 2 * math.pi for i in range(25)]]
            parts.append(lib.to_mesh(lib.assign(lib.tube_along('oculos', ring, 0.0022, 6), gold)))
            parts.append(lib.to_mesh(lib.assign(lib.tube_along('haste', [
                tuple(head_c + Vector((sx * 0.082, 0.172, 0.022))), tuple(head_c + Vector((sx * 0.15, 0.08, 0.03))),
                tuple(head_c + Vector((sx * 0.158, -0.02, 0.0)))], 0.002, 6), gold)))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('ponte', [
            tuple(head_c + Vector((-0.018, 0.182, 0.03))), tuple(head_c + Vector((0.0, 0.186, 0.036))),
            tuple(head_c + Vector((0.018, 0.182, 0.03)))], 0.002, 6), gold)))


def necktie(mat, dz, loose=False):
    """Gravata: nó trapezoidal e lâmina que alarga até a ponta em bico, sobre o peitilho."""
    drop = 0.035 if loose else 0.0
    tilt = math.radians(7 if loose else 0)
    top = 1.255 + dz - drop
    cx = 0.0
    out = []

    def plate(name, outline, y, thick):
        bm = bmesh.new()
        vs = []
        for x, z in outline:
            # inclina em torno do nó quando a gravata está frouxa
            rx = x * math.cos(tilt) - (z - top) * math.sin(tilt)
            rz = x * math.sin(tilt) + (z - top) * math.cos(tilt) + top
            vs.append(bm.verts.new((cx + rx, y, rz)))
        bm.faces.new(vs)
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(name, me)
        sol = o.modifiers.new('esp', 'SOLIDIFY')
        sol.thickness = thick
        sol.offset = 0.0
        bev = o.modifiers.new('chanfro', 'BEVEL')
        bev.width = 0.002
        lib.assign(o, mat)
        return lib.to_mesh(lib.link(o))

    out.append(plate('gravata_no', [(-0.02, top), (0.02, top), (0.013, top - 0.035), (-0.013, top - 0.035)],
                     0.152, 0.012))
    bottom = 0.9 + dz
    out.append(plate('gravata', [(-0.011, top - 0.03), (0.011, top - 0.03), (0.033, bottom + 0.04), (0.0, bottom),
                                 (-0.033, bottom + 0.04)], 0.15, 0.006))
    return out


def accessories(parts, key, p, wrists, head_c, dz):
    if p.get('briefcase'):  # maleta de couro na mão esquerda
        leather = P(f'{key}_couro', lin((0.22, 0.11, 0.05)), roughness=0.45)
        brass = P('fecho', lin((0.75, 0.55, 0.25)), roughness=0.3, metallic=1.0)
        el, wr = wrists[-1]
        hx, hy, hz = wr.x - 0.005, wr.y + 0.03, wr.z - 0.07
        parts.append(prism('maleta', hz - 0.3, hz - 0.03, (0.05, 0.2), (0.045, 0.19), leather, center0=(hx, hy),
                           center1=(hx, hy), bevel=0.012))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('alca_maleta', [(hx, hy - 0.06, hz - 0.03),
                                                                            (hx, hy - 0.05, hz + 0.015),
                                                                            (hx, hy + 0.05, hz + 0.015),
                                                                            (hx, hy + 0.06, hz - 0.03)], 0.008, 8), leather)))
        for dy in (-0.12, 0.12):
            parts.append(prism('fecho', hz - 0.07, hz - 0.04, (0.052, 0.012), (0.052, 0.012), brass,
                               center0=(hx, hy + dy), bevel=0.002))
    if p.get('vest'):  # colete de lã entre as lapelas
        vest = P(f'{key}_colete', lin(p['vest']), roughness=0.8)
        parts.append(prism('colete', 0.8 + dz, 1.16 + dz, (0.075, 0.006), (0.035, 0.006), vest, center0=(0, 0.147),
                           center1=(0, 0.141), bevel=0.0))
        for i in range(3):
            parts.append(lathe_at('botao_colete', [(0, 0), (0.008, 0), (0.008, 0.004), (0, 0.006)],
                                  (0.0, 0.152, 0.86 + i * 0.08 + dz), P('botao_osso', lin((0.75, 0.68, 0.55))), 10,
                                  rot=(-math.pi / 2, 0, 0)))
    if p.get('cane'):  # bengala apoiada ao lado da cadeira
        wood = P('bengala', lin((0.12, 0.06, 0.03)), roughness=0.3)
        x0 = 0.32
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('bengala', [(x0, 0.25, 0.0), (x0, 0.32, 0.82),
                                                                         (x0, 0.36, 0.88), (x0, 0.42, 0.86),
                                                                         (x0, 0.43, 0.82)], 0.011, 10), wood)))
    if p['body'] == 'melindrosa':
        pearl = P('perola', lin((0.92, 0.9, 0.86)), roughness=0.15)
        # colar longo de pérolas em laço até a cintura
        for i in range(70):
            t = i / 70 * 2 * math.pi
            x = 0.12 * math.sin(t)
            z = 1.2 + dz - 0.38 * (1 - math.cos(t)) / 2
            y = 0.125 + 0.03 * (1 - math.cos(t)) / 2
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.009, location=(x, y, z))
            pr = bpy.context.active_object
            lib.assign(pr, pearl)
            parts.append(pr)
        # faixa na cabeça com joia e pena
        band = P('faixa_cabeca', lin((0.05, 0.04, 0.04)), roughness=0.3)
        gem = P('joia', lin((0.15, 0.35, 0.3)), roughness=0.05, metallic=0.3)
        parts.append(lathe_at('faixa', [(0.162, 0.0), (0.166, 0.0), (0.166, 0.028), (0.162, 0.028)],
                              head_c + Vector((0, 0, 0.09)), band, 64, rot=(math.radians(-12), 0, 0),
                              scale=(1.0, 1.06, 1.0)))
        jewel_c = head_c + Vector((0.11, 0.115, 0.115))
        parts.append(sphere('joia', jewel_c, (0.018, 0.012, 0.022), gem, 16, 12))
        feather = P('pena', lin((0.1, 0.25, 0.2)), roughness=0.6)
        quill = [jewel_c + Vector((0.01 * k, -0.01 * k, 0.05 * k - 0.004 * k * k)) for k in range(6)]
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('pena_haste', [tuple(q) for q in quill], 0.002, 6), feather)))
        bm = bmesh.new()
        for i in range(1, 30):  # barbas da pena
            q = quill[0].lerp(quill[-1], i / 30)
            for side in (-1, 1):
                L = 0.035 * math.sin(i / 30 * math.pi)
                a = bm.verts.new(q)
                b = bm.verts.new(q + Vector((side * L, -0.004, 0.012)))
                c = bm.verts.new(q + Vector((side * L * 0.9, -0.004, 0.018)))
                bm.faces.new((a, b, c))
        me = bpy.data.meshes.new('pena')
        bm.to_mesh(me)
        bm.free()
        fo = bpy.data.objects.new('pena', me)
        fo.modifiers.new('esp', 'SOLIDIFY').thickness = 0.001
        lib.assign(fo, feather)
        parts.append(lib.to_mesh(lib.link(fo)))
        # piteira na mão direita
        el, wr = wrists[1]
        d = (wr - el).normalized()
        tip = wr + d * 0.07
        holder = [tip, tip + Vector((-0.05, 0.12, 0.08))]
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('piteira', [tuple(h) for h in holder], 0.0035, 8),
                                            P('piteira', lin((0.02, 0.02, 0.02)), roughness=0.15))))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('cigarro', [tuple(holder[1]),
                                                                        tuple(holder[1] + Vector((-0.012, 0.03, 0.02)))],
                                                           0.004, 8), P('cigarro', lin((0.9, 0.88, 0.82))))))
        parts.append(sphere('brasa', holder[1] + Vector((-0.013, 0.032, 0.021)), (0.005, 0.005, 0.005),
                            P('brasa', lin((1, 0.4, 0.1)), emission=lin((1, 0.35, 0.05)), strength=8), 8, 6))


def fringe(name, z0, length, hx, hy, mat, n=72):
    """Fileira de franjas finas ao redor de um retângulo arredondado (um só objeto)."""
    bm = bmesh.new()
    for i in range(n):
        a = i / n * 2 * math.pi
        x = hx * math.copysign(abs(math.cos(a)) ** 0.6, math.cos(a)) * 1.02
        y = hy * math.copysign(abs(math.sin(a)) ** 0.6, math.sin(a)) * 1.02
        w = 0.006
        tx, ty = -math.sin(a) * w, math.cos(a) * w
        sway = 0.012 * math.sin(i * 1.7)
        vs = [bm.verts.new((x - tx, y - ty, z0 + length)), bm.verts.new((x + tx, y + ty, z0 + length)),
              bm.verts.new((x * 1.05 + tx + sway, y * 1.05 + ty, z0)), bm.verts.new((x * 1.05 - tx + sway, y * 1.05 - ty, z0))]
        bm.faces.new(vs)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.modifiers.new('esp', 'SOLIDIFY').thickness = 0.002
    lib.assign(o, mat)
    return lib.to_mesh(lib.link(o))


def gloves(parts, key, wrists, glove_mat):
    for sx, (el, wr) in wrists.items():
        d = (wr - el).normalized()
        palm = wr + d * 0.05
        verts, edges, radii = [wr, palm], [(0, 1)], [(0.045, 0.04), (0.05, 0.024)]
        for k in range(4):
            base = palm + d * 0.03 + Vector((sx * (-0.03 + k * 0.02), 0, 0))
            i0 = len(verts)
            verts += [base, base + d * 0.045]
            radii += [(0.012, 0.011), (0.011, 0.01)]
            edges += [(1, i0), (i0, i0 + 1)]
        verts.append(wr + d * 0.03 + Vector((sx * 0.045, 0.02, 0)))
        radii.append((0.013, 0.012))
        edges.append((1, len(verts) - 1))
        parts.append(skin_mesh('luva', verts, edges, radii, 2, glove_mat))


def build_person(key, p):
    parts = []
    seated = p['seated']
    dz = -0.14 if seated else 0.0          # sentado: tronco desce até o assento (0.46)
    glove_col = {'sobretudo': (0.12, 0.08, 0.06), 'melindrosa': (0.03, 0.025, 0.025)}.get(p['body'], (0.92, 0.9, 0.85))
    glove = P(f'{key}_luva', lin(glove_col), roughness=0.3 if p['body'] == 'melindrosa' else 0.5)
    shoe = P(f'{key}_sapato', lin((0.06, 0.04, 0.03)), roughness=0.25)
    shirt = P(f'{key}_camisa', lin(p['shirt']), roughness=0.6)
    if p['body'] == 'terno':
        pin = materials.pinstripe(f'p_{key}_terno', lin(p['suit']), lin(p['stripe']), spacing=0.02)
        imgs = lib.bake_tile(f'{key}_terno', pin, 1024, TEX, tile=0.4)
        cloth = lib.textured(f'{key}_terno', imgs['cor'], imgs['rug'], imgs['normal'])
        tie = P(f'{key}_gravata', lin(p['tie']), roughness=0.4)
        parts.append(prism('paleto', 0.62 + dz, 1.22 + dz, (0.2, 0.13), (0.24, 0.12), cloth, bevel=0.03))
        parts.append(prism('ombros', 1.22 + dz, 1.3 + dz, (0.24, 0.12), (0.19, 0.1), cloth, bevel=0.03))
        for sx in (-1, 1):
            bm = bmesh.new()
            vs = [bm.verts.new((x, y, z + dz)) for x, y, z in ((sx * 0.01, 0.15, 0.85), (sx * 0.19, 0.142, 1.2),
                                                                (sx * 0.12, 0.132, 1.29), (sx * 0.05, 0.15, 1.0))]
            bm.faces.new(vs if sx > 0 else list(reversed(vs)))
            me = bpy.data.meshes.new('lapela')
            bm.to_mesh(me)
            bm.free()
            lap = bpy.data.objects.new('lapela', me)
            sol = lap.modifiers.new('esp', 'SOLIDIFY')
            sol.thickness = 0.015
            sol.offset = 0.0  # engrossa para os dois lados: lapelas iguais
            lib.assign(lap, cloth)
            parts.append(lib.to_mesh(lib.link(lap)))
        parts.append(prism('peitilho', 0.88 + dz, 1.26 + dz, (0.03, 0.005), (0.1, 0.005), shirt, center0=(0, 0.14),
                           center1=(0, 0.126), bevel=0.0))
        parts += necktie(tie, dz, loose=p['mood'] == 'cansado')
        button = P('botao', lin((0.6, 0.45, 0.2)), roughness=0.3, metallic=1.0)
        for z in (0.74, 0.84):
            parts.append(lathe_at('botao', [(0, 0), (0.02, 0), (0.02, 0.006), (0, 0.01)], (0.0, 0.132, z + dz), button,
                                  16, rot=(-math.pi / 2, 0, 0)))
        if p['mood'] != 'cansado':  # lenço no bolso
            parts.append(prism('lenco', 1.1 + dz, 1.16 + dz, (0.03, 0.004), (0.035, 0.004),
                               P(f'{key}_lenco', lin((0.85, 0.8, 0.7))), center0=(-0.13, 0.135), bevel=0.002))
        sleeve_mat = cloth
        legs_mat = cloth
    elif p['body'] == 'sobretudo':
        coat = P(f'{key}_sobretudo', lin(p['coat']), roughness=0.75)
        coat2 = P(f'{key}_cinto', lin(p['coat2']), roughness=0.5)
        parts.append(prism('sobretudo_saia', 0.32 + dz, 0.92 + dz, (0.25, 0.17), (0.17, 0.12), coat, bevel=0.03))
        parts.append(prism('sobretudo_peito', 0.92 + dz, 1.22 + dz, (0.17, 0.12), (0.23, 0.12), coat, bevel=0.03))
        parts.append(prism('ombros', 1.22 + dz, 1.3 + dz, (0.23, 0.12), (0.18, 0.1), coat, bevel=0.03))
        parts.append(prism('cinto', 0.9 + dz, 0.96 + dz, (0.175, 0.125), (0.175, 0.125), coat2, bevel=0.01))
        parts.append(prism('fivela', 0.905 + dz, 0.955 + dz, (0.025, 0.005), (0.025, 0.005),
                           P('fivela', lin((0.6, 0.5, 0.3)), roughness=0.3, metallic=1.0), center0=(0.0, 0.13),
                           bevel=0.003))
        for sx in (-1, 1):  # gola larga e dragonas
            bm = bmesh.new()
            vs = [bm.verts.new((x, y, z + dz)) for x, y, z in ((sx * 0.02, 0.135, 1.0), (sx * 0.22, 0.13, 1.22),
                                                                (sx * 0.15, 0.12, 1.33), (sx * 0.05, 0.14, 1.12))]
            bm.faces.new(vs if sx > 0 else list(reversed(vs)))
            me = bpy.data.meshes.new('gola_trench')
            bm.to_mesh(me)
            bm.free()
            lap = bpy.data.objects.new('gola_trench', me)
            sol = lap.modifiers.new('esp', 'SOLIDIFY')
            sol.thickness = 0.015
            sol.offset = 0.0
            lib.assign(lap, coat)
            parts.append(lib.to_mesh(lib.link(lap)))
            parts.append(prism('dragona', 1.29 + dz, 1.31 + dz, (0.05, 0.025), (0.05, 0.025), coat2,
                               center0=(sx * 0.19, 0.0), bevel=0.005))
            for z in (0.98, 1.08, 0.75, 0.6):
                parts.append(lathe_at('botao', [(0, 0), (0.016, 0), (0.016, 0.006), (0, 0.008)],
                                      (sx * 0.08, 0.128 if z > 0.9 else 0.16, z + dz), coat2, 12,
                                      rot=(-math.pi / 2, 0, 0)))
        parts.append(prism('lenco_pescoco', 1.2 + dz, 1.3 + dz, (0.06, 0.005), (0.09, 0.005), shirt,
                           center0=(0, 0.125), center1=(0, 0.11), bevel=0.0))
        sleeve_mat = coat
        legs_mat = P(f'{key}_meia', lin((0.1, 0.07, 0.06)), roughness=0.5)
    elif p['body'] == 'melindrosa':
        dress = P(f'{key}_vestido', lin(p['dress']), roughness=0.35, metallic=0.6)
        parts.append(prism('vestido', 0.46 + dz, 1.22 + dz, (0.2, 0.15), (0.19, 0.115), dress, bevel=0.03))
        parts.append(prism('ombros', 1.22 + dz, 1.28 + dz, (0.19, 0.115), (0.15, 0.09), dress, bevel=0.025))
        parts.append(prism('faixa_quadril', 0.74 + dz, 0.8 + dz, (0.205, 0.155), (0.205, 0.155),
                           P(f'{key}_faixa', lin((0.08, 0.06, 0.05)), roughness=0.3), bevel=0.01))
        for z0, length in ((0.48, 0.2), (0.72, 0.18), (0.98, 0.16)):
            parts.append(fringe(f'franja', z0 + dz, length, 0.21, 0.16, dress))
        sleeve_mat = None
        legs_mat = P(f'{key}_meia', lin((0.35, 0.25, 0.2)), roughness=0.45)
    else:  # vestido com corpete, saia evasê e gola alta de renda
        dress = P(f'{key}_vestido', lin(p['dress']), roughness=0.7)
        dress2 = P(f'{key}_vestido_detalhe', lin(p['dress2']), roughness=0.6)
        parts.append(prism('corpete', 0.9 + dz, 1.24 + dz, (0.15, 0.1), (0.2, 0.11), dress, bevel=0.03))
        parts.append(prism('ombros', 1.24 + dz, 1.3 + dz, (0.2, 0.11), (0.16, 0.09), dress, bevel=0.03))
        parts.append(prism('cinto', 0.88 + dz, 0.93 + dz, (0.155, 0.105), (0.155, 0.105), dress2, bevel=0.01))
        for i in range(3):
            parts.append(lathe_at('botao', [(0, 0), (0.012, 0), (0.012, 0.006), (0, 0.008)],
                                  (0.0, 0.112, 1.0 + i * 0.07 + dz), P('botao_perola', lin((0.92, 0.9, 0.85)), roughness=0.2),
                                  12, rot=(-math.pi / 2, 0, 0)))
        if not seated:
            skirt = lib.lathe('saia', [(0.15, 0.0), (0.2, -0.15), (0.3, -0.45)], 48)
            skirt.location = (0, 0, 0.9)
            skirt.modifiers.new('esp', 'SOLIDIFY').thickness = 0.01
            lib.assign(skirt, dress)
            parts.append(lib.to_mesh(lib.link(skirt)))
        sleeve_mat = dress
        legs_mat = P(f'{key}_meia', lin((0.12, 0.08, 0.07)), roughness=0.5)
        if p.get('camera'):  # câmera fotográfica pendurada no pescoço
            body = P('camera', lin((0.05, 0.05, 0.05)), roughness=0.4)
            chrome = P('cromo', lin((0.7, 0.7, 0.7)), roughness=0.2, metallic=1.0)
            parts.append(prism('camera', 1.0 + dz, 1.08 + dz, (0.06, 0.025), (0.06, 0.025), body, center0=(0, 0.14),
                               bevel=0.006))
            parts.append(lathe_at('lente', [(0, 0), (0.025, 0), (0.025, 0.035), (0.02, 0.04), (0, 0.04)],
                                  (0, 0.165, 1.04 + dz), chrome, 24, rot=(-math.pi / 2, 0, 0)))
            parts.append(lib.to_mesh(lib.assign(lib.tube_along('alca', [(-0.06, 0.13, 1.06 + dz), (-0.1, 0.05, 1.3 + dz),
                                                                         (0, -0.06, 1.33 + dz), (0.1, 0.05, 1.3 + dz),
                                                                         (0.06, 0.13, 1.06 + dz)], 0.005, 6), body)))
    # gola alta (esconde o pescoço): colarinho no terno, renda no vestido
    collar = lib.lathe('gola', [(0.1, 0.0), (0.095, 0.11)] if p['body'] == 'terno' else
                       [(0.09, 0.0), (0.094, 0.03), (0.09, 0.06), (0.094, 0.09), (0.09, 0.12)] if p['body'] == 'melindrosa' else
                       [(0.1, 0.0), (0.085, 0.06), (0.1, 0.12)], 40,
                       arc=(math.pi * 0.15, math.pi * 1.85) if p['body'] == 'terno' else (0, 2 * math.pi))
    collar.location = (0, -0.005, 1.28 + dz)
    collar.modifiers.new('esp', 'SOLIDIFY').thickness = 0.01
    lib.assign(collar, shirt)
    parts.append(lib.to_mesh(lib.link(collar)))
    # pernas: em pé ou sentado (coxa para a frente, canela na vertical)
    for sx in (-1, 1):
        x = sx * 0.1
        if seated:
            if p['body'] == 'vestido':
                parts.append(prism('saia_coxa', 0.46, 0.6, (0.12, 0.2), (0.11, 0.2),
                                   P(f'{key}_vestido', lin(p['dress']), roughness=0.7), center0=(sx * 0.085, 0.18),
                                   center1=(sx * 0.085, 0.16), bevel=0.03))
                parts.append(chain_skin('canela', [Vector((x, 0.38, 0.5)), Vector((x, 0.42, 0.08))],
                                        [(0.04, 0.04), (0.03, 0.03)], 2, legs_mat))
            else:
                bm_t = prism('coxa', 0.46, 0.6, (0.085, 0.2), (0.085, 0.2), legs_mat, center0=(x, 0.18),
                             center1=(x, 0.18), bevel=0.02)
                parts.append(bm_t)
                parts.append(prism('canela', 0.06, 0.5, (0.07, 0.07), (0.08, 0.08), legs_mat, center0=(x, 0.4),
                                   center1=(x, 0.4), bevel=0.02))
            parts.append(lathe_at('sapato', [(0, 0), (0.06, 0), (0.065, 0.03), (0.045, 0.06), (0, 0.065)],
                                  (x, 0.45, 0.0), shoe, 28, scale=(0.95, 1.6, 1.0)))
        else:
            if p['body'] == 'terno':
                parts.append(prism('calca', 0.06, 0.66, (0.07, 0.075), (0.09, 0.1), legs_mat, center0=(x, 0),
                                   center1=(x, 0), bevel=0.02))
            else:
                parts.append(chain_skin('perna', [Vector((x, 0, 0.5)), Vector((x, 0.01, 0.08))],
                                        [(0.045, 0.045), (0.032, 0.032)], 2, legs_mat))
            parts.append(lathe_at('sapato', [(0, 0), (0.065, 0), (0.07, 0.03), (0.05, 0.06), (0, 0.065)],
                                  (x, 0.05, 0.0), shoe, 28, scale=(1.0, 1.7, 1.0)))
    # braços: em pé caídos; sentado com antebraços sobre a mesa
    wrists = {}
    for sx in (-1, 1):
        sh = Vector((sx * 0.25, 0, 1.22 + dz))
        if seated:
            el, wr = Vector((sx * 0.27, 0.12, 0.82)), Vector((sx * 0.16, 0.36, 0.8))
        elif p['body'] == 'melindrosa' and sx > 0:
            el, wr = Vector((0.3, 0.1, 0.98)), Vector((0.2, 0.2, 1.16))
        else:
            el, wr = Vector((sx * 0.29, 0.04, 0.96)), Vector((sx * 0.27, 0.13, 0.78))
        if sleeve_mat is None:  # braço de porcelana com luva longa até o cotovelo
            parts.append(chain_skin('braco', [sh, el], [(0.055, 0.055), (0.045, 0.045)], 1,
                                    P(f'{key}_porcelana_braco', lin((0.93, 0.89, 0.82)), roughness=0.25)))
            parts.append(chain_skin('luva_longa', [el, wr], [(0.05, 0.05), (0.042, 0.042)], 1, glove))
        else:
            parts.append(chain_skin('manga', [sh, el, wr], [(0.075, 0.075), (0.062, 0.062), (0.06, 0.06)], 1, sleeve_mat))
        wrists[sx] = (el, wr)
    gloves(parts, key, wrists, glove)
    head_c = Vector((0, 0.0, 1.5 + dz))
    accessories(parts, key, p, wrists, head_c, dz)
    build_mask_head(parts, key, p, head_c)
    lib.export(parts, os.path.join(OUT, f'mascara_{key}.glb'))
    clear()


lib.reset()
only = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 2 else []
for key, p in PEOPLE.items():
    if only and key not in only:
        continue
    print('CONSTRUINDO', key)
    build_person(key, p)
print('PRONTO')
