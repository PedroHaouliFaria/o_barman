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
                      iris=(0.3, 0.2, 0.12), mood='cansado', nose=1.0, lips=(0.55, 0.22, 0.2), blush=0.25),
    # cliente 2: jovem, simpática, sorridente; vestido, coque, câmera fotográfica
    'turista': dict(body='vestido', seated=True, dress=(0.78, 0.55, 0.22), dress2=(0.55, 0.3, 0.12),
                    shirt=(0.95, 0.92, 0.85), hair='coque', hair_color=(0.36, 0.18, 0.08), iris=(0.2, 0.38, 0.5),
                    mood='sorriso', nose=0.7, lips=(0.78, 0.16, 0.2), blush=0.6, camera=True),
    # cliente 3: senhor educado, grisalho, bigode e óculos; paletó de tweed
    'aposentado': dict(body='terno', seated=True, suit=(0.42, 0.34, 0.24), stripe=(0.6, 0.5, 0.36),
                       shirt=(0.88, 0.86, 0.8), tie=(0.15, 0.22, 0.32), hair='calvo', hair_color=(0.72, 0.7, 0.66),
                       iris=(0.35, 0.42, 0.45), mood='sereno', nose=1.25, lips=(0.6, 0.3, 0.28), blush=0.35,
                       mustache=True, glasses=True),
}

MOODS = {
    # sobrancelha (queda nas pontas), boca (curva: + sorri, - triste), pálpebra (0 aberto .. 1 fechado), olho feliz
    'cansado': dict(brow=0.06, mouth=-0.06, lid=0.42, happy=0.0),
    'sorriso': dict(brow=-0.03, mouth=0.14, lid=0.1, happy=0.6),
    'sereno': dict(brow=0.02, mouth=0.04, lid=0.3, happy=0.25),
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
        if d < 0.38:
            hl = math.hypot((x - cx + 0.018) / 0.014, (z - cz - 0.02) / 0.014)
            return (0.95, 0.95, 0.92) if hl < 1 else (0.02, 0.015, 0.015)
        if d < 1.0:
            return tuple(c * (0.75 + 0.25 * d) for c in iris)
        return (0.9, 0.88, 0.82)
    return None


def build_mask_head(parts, key, p, head_c, eyes='pintado'):
    mood = MOODS[p['mood']]
    ivory = lin((0.93, 0.89, 0.82))
    iris = lin(p['iris'])
    lips = lin(p['lips'])
    brow_col = lin(tuple(c * 0.8 for c in p['hair_color']))
    hair_mat = P(f'{key}_cabelo', lin(p['hair_color']), roughness=0.9)
    void = P('vazio', (0, 0, 0), roughness=1.0)
    parts.append(sphere('cabeca', head_c, (0.15, 0.16, 0.18), void))
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
        h = sphere('cabelo', head_c + Vector((0, -0.015, 0.025)), (0.162, 0.168, 0.19), hair_mat, 48, 32)
        bm = bmesh.new()
        bm.from_mesh(h.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.02 and v.co.z < 0.14], context='VERTS')
        for v in bm.verts:  # mechas penteadas para trás
            v.co += v.co.normalized() * 0.004 * math.sin(math.atan2(v.co.x, v.co.z) * 40)
        bm.to_mesh(h.data)
        bm.free()
        parts.append(h)
        parts.append(sphere('coque', head_c + Vector((0, -0.14, 0.15)), (0.075, 0.07, 0.07), hair_mat, 32, 20))
        parts.append(lathe_at('presilha', [(0.0, 0), (0.06, 0.0), (0.06, 0.012), (0, 0.012)],
                              head_c + Vector((0, -0.1, 0.13)), P('presilha', lin((0.55, 0.1, 0.12)), roughness=0.4),
                              24, rot=(math.radians(60), 0, 0)))
    elif p['hair'] == 'calvo':
        h = sphere('cabelo', head_c + Vector((0, -0.02, 0.0)), (0.162, 0.168, 0.185), hair_mat, 40, 28)
        bm = bmesh.new()
        bm.from_mesh(h.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.0 or v.co.z > 0.1 or v.co.z < -0.12],
                         context='VERTS')
        for v in bm.verts:
            v.co += v.co.normalized() * 0.01 * math.sin(v.co.x * 120) * math.sin(v.co.z * 100)
        bm.to_mesh(h.data)
        bm.free()
        parts.append(h)
    # máscara esculpida e pintada
    bpy.ops.mesh.primitive_uv_sphere_add(segments=192, ring_count=144, radius=1.0)
    mask = bpy.context.active_object
    mask.name = 'mascara'
    bm = bmesh.new()
    bm.from_mesh(mask.data)
    kill = []
    nose = p['nose']
    for v in bm.verts:
        x, y, z = v.co
        if y < 0.15 or z > 0.8 or z < -0.95:
            kill.append(v)
            continue
        eye = min(math.hypot((x - sx * 0.33) / 1.25, z - 0.1) for sx in (-1, 1))
        disp = 0.0
        if eyes == 'buraco':
            disp -= 0.55 * smoothstep(0.17, 0.1, eye)
        else:
            disp -= 0.045 * gauss(eye, 0.14)                     # leve concavidade
            disp += 0.025 * gauss(eye, 0.07)                     # globo pintado sobressai
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
        v.co = v.co + v.co.normalized() * disp
        v.co = Vector((v.co.x * 0.15, v.co.y * 0.16 + 0.012, v.co.z * 0.18))
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    col = bm.loops.layers.color.new('Col')
    for f in bm.faces:
        for loop in f.loops:
            x, y, z = loop.vert.co.x / 0.15, (loop.vert.co.y - 0.012) / 0.16, loop.vert.co.z / 0.18
            r = max(1e-6, math.sqrt(x * x + y * y + z * z))
            x, z = x / r, z / r
            c = list(ivory)
            blush = p['blush'] * sum(gauss(math.hypot(x - sx * 0.45, z + 0.25), 0.15) for sx in (-1, 1))
            c = [c[0] * (1 - 0.25 * blush) + 0.75 * 0.25 * blush, c[1] * (1 - 0.35 * blush), c[2] * (1 - 0.38 * blush)]
            mouth_z = -0.62 + mood['mouth'] * abs(x) * 2.2
            lip = gauss(z - mouth_z - 0.02, 0.045) * gauss(x, 0.22)
            c = [c[i] * (1 - lip) + lips[i] * lip for i in range(3)]
            for sx in (-1, 1):  # sobrancelha pintada, fina
                bx = (x - sx * 0.33) / 0.2
                droop = mood['brow'] * 0.8 * max(0.0, (abs(x) - 0.33) / 0.2)
                bz = 0.27 + 0.05 * (1 - bx * bx) - droop
                if abs(bx) < 1 and abs(z - bz) < 0.018 * (1 - 0.5 * abs(bx)):
                    c = list(brow_col)
            if eyes == 'buraco':
                hole = smoothstep(0.16, 0.115, min(math.hypot((x - sx * 0.33) / 1.25, z - 0.1) for sx in (-1, 1)))
                c = [k * (1 - hole) for k in c]
            else:
                for sx in (-1, 1):
                    e = paint_eye(x, z, sx, iris, mood)
                    if e:
                        c = list(lin(e))
                    if mood['lid'] > 0.2:  # pálpebra caída: leve sombra acima do olho
                        c = [k * (1 - 0.25 * mood['lid'] * gauss(math.hypot((x - sx * 0.33) / 1.4, z - 0.17), 0.06))
                             for k in c]
            loop[col] = (*c, 1.0)
    bm.to_mesh(mask.data)
    bm.free()
    mask.location = head_c
    mask.modifiers.new('esp', 'SOLIDIFY').thickness = 0.008
    lib.smooth(mask)
    lib.assign(mask, vertex_color_material(f'porcelana_{key}', rough=0.2, coat=0.8))
    parts.append(lib.to_mesh(mask))
    ribbon = P(f'{key}_fita', lin((0.35, 0.05, 0.06)), roughness=0.4)
    for sx in (-1, 1):
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
    glove = P(f'{key}_luva', lin((0.92, 0.9, 0.85)), roughness=0.55)
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
            lap.modifiers.new('esp', 'SOLIDIFY').thickness = 0.015
            lib.assign(lap, cloth)
            parts.append(lib.to_mesh(lib.link(lap)))
        parts.append(prism('peitilho', 0.88 + dz, 1.26 + dz, (0.03, 0.005), (0.1, 0.005), shirt, center0=(0, 0.14),
                           center1=(0, 0.126), bevel=0.0))
        parts.append(prism('gravata', 0.86 + dz, 1.22 + dz, (0.035, 0.006), (0.02, 0.006), tie,
                           center0=(0.03 if p['mood'] == 'cansado' else 0.0, 0.148), center1=(0.01 if p['mood'] == 'cansado' else 0.0, 0.134), bevel=0.003))
        button = P('botao', lin((0.6, 0.45, 0.2)), roughness=0.3, metallic=1.0)
        for z in (0.74, 0.84):
            parts.append(lathe_at('botao', [(0, 0), (0.02, 0), (0.02, 0.006), (0, 0.01)], (0.0, 0.132, z + dz), button,
                                  16, rot=(-math.pi / 2, 0, 0)))
        if p['mood'] != 'cansado':  # lenço no bolso
            parts.append(prism('lenco', 1.1 + dz, 1.16 + dz, (0.03, 0.004), (0.035, 0.004),
                               P(f'{key}_lenco', lin((0.85, 0.8, 0.7))), center0=(-0.13, 0.135), bevel=0.002))
        sleeve_mat = cloth
        legs_mat = cloth
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
        else:
            el, wr = Vector((sx * 0.29, 0.04, 0.96)), Vector((sx * 0.27, 0.13, 0.78))
        parts.append(chain_skin('manga', [sh, el, wr], [(0.075, 0.075), (0.062, 0.062), (0.06, 0.06)], 1, sleeve_mat))
        wrists[sx] = (el, wr)
    gloves(parts, key, wrists, glove)
    build_mask_head(parts, key, p, Vector((0, 0.0, 1.5 + dz)))
    lib.export(parts, os.path.join(OUT, f'mascara_{key}.glb'))
    clear()


lib.reset()
for key, p in PEOPLE.items():
    print('CONSTRUINDO', key)
    build_person(key, p)
print('PRONTO')
