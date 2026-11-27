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
    # cliente 5: elegante, sério, perfeito demais; pede o absurdo com naturalidade
    'cavalheiro': dict(body='fraque', seated=False, suit=(0.03, 0.03, 0.035), shirt=(0.95, 0.94, 0.92),
                       hair='pomada', hair_color=(0.03, 0.025, 0.025), iris=(0.42, 0.42, 0.42), mood='perfeito',
                       nose=0.9, lips=(0.62, 0.4, 0.38), blush=0.0, pale=True, hat='cartola', monocle=True,
                       cane='prata'),
    # cliente 6: jovem descontraído, devolve a sensação de segurança
    'universitario': dict(body='sueter', seated=True, sweater=(0.45, 0.1, 0.09), argyle=(0.78, 0.66, 0.36),
                          argyle_line=(0.1, 0.13, 0.28), trousers=(0.6, 0.52, 0.38), shirt=(0.86, 0.88, 0.92),
                          hair='la', hair_color=(0.28, 0.15, 0.07), iris=(0.28, 0.32, 0.15), mood='animado',
                          nose=0.75, lips=(0.62, 0.3, 0.28), blush=0.5, freckles=True, hat='boina',
                          scarf=((0.12, 0.16, 0.38), (0.78, 0.62, 0.2)), books=True),
    # cliente 8: capa de chuva sem estar chovendo, sempre molhado; a tinta dos olhos escorre
    'encharcado': dict(body='capa', seated=False, coat=(0.22, 0.26, 0.1), shirt=(0.22, 0.26, 0.1),
                       hair='la', hair_color=(0.03, 0.03, 0.03), iris=(0.2, 0.26, 0.26), mood='molhado',
                       nose=1.1, lips=(0.42, 0.32, 0.32), blush=0.0, hat='pescador', escorre=True, wet=True,
                       drops=True),
    # ---------------- Ato III
    # cliente 9: pálida, elegante, imóvel; máscara rachada
    'dama': dict(body='vestido_longo', seated=False, dress=(0.88, 0.85, 0.78), shirt=(0.9, 0.88, 0.82),
                 hair='coque', hair_color=(0.06, 0.05, 0.05), iris=(0.55, 0.57, 0.6), mood='perfeito', nose=0.7,
                 lips=(0.5, 0.3, 0.32), blush=0.0, pale=True, cracks=True, veil=True),
    # cliente 10: altíssimo, braços desproporcionais; máscara pequena demais para a cabeça
    'alongado': dict(body='terno', seated=False, suit=(0.12, 0.12, 0.14), stripe=(0.3, 0.3, 0.32),
                     shirt=(0.8, 0.8, 0.78), tie=(0.1, 0.1, 0.12), hair='nenhum', hair_color=(0.05, 0.05, 0.05),
                     iris=(0.1, 0.1, 0.1), mood='perfeito', nose=0.8, lips=(0.45, 0.35, 0.35), blush=0.0,
                     stretch=1.42, mask_scale=0.62, hat='coco'),
    # cliente 11: absolutamente comum, não percebe nada
    'desavisada': dict(body='cardiga', seated=False, knit=(0.42, 0.55, 0.62), skirt=(0.32, 0.28, 0.24),
                       shirt=(0.95, 0.93, 0.88), hair='chanel', hair_color=(0.4, 0.24, 0.12), iris=(0.3, 0.22, 0.12),
                       mood='sorriso', nose=0.75, lips=(0.72, 0.25, 0.28), blush=0.55, handbag=True),
    # cliente 12: venda nos olhos, acompanha tudo; máscara lisa onde seriam os olhos
    'cego': dict(body='terno', seated=False, suit=(0.07, 0.07, 0.08), stripe=(0.16, 0.16, 0.18),
                 shirt=(0.82, 0.8, 0.76), tie=(0.05, 0.05, 0.06), hair='pomada', hair_color=(0.35, 0.34, 0.33),
                 iris=(0.1, 0.1, 0.1), mood='perfeito', nose=1.0, lips=(0.45, 0.32, 0.3), blush=0.0,
                 no_eyes=True, blindfold=True, white_cane=True),
    # ---------------- Ato IV
    # cliente 13: sem nenhuma feição; porcelana em branco
    'semrosto': dict(body='sobretudo', seated=False, coat=(0.28, 0.28, 0.29), coat2=(0.16, 0.16, 0.17),
                     shirt=(0.4, 0.4, 0.42), hair='nenhum', hair_color=(0.1, 0.1, 0.1), iris=(0, 0, 0),
                     mood='perfeito', nose=0.0, lips=(0.9, 0.88, 0.85), blush=0.0, pale=True, blank=True,
                     hat='fedora', hat_color=(0.12, 0.12, 0.13), scarf_plain=(0.18, 0.18, 0.2)),
    # cliente 14: sorriso esculpido de orelha a orelha, com dentes
    'sorridente': dict(body='mestre', seated=False, vest=(0.55, 0.08, 0.08), vest2=(0.85, 0.78, 0.62),
                       trousers=(0.04, 0.04, 0.045), shirt=(0.92, 0.9, 0.86), hair='pomada',
                       hair_color=(0.12, 0.05, 0.03), iris=(0.05, 0.05, 0.05), mood='animado', nose=0.9,
                       lips=(0.35, 0.03, 0.05), blush=0.7, carved_smile=True, hat='cartola',
                       hat_color=(0.45, 0.06, 0.07)),
    # cliente 15: o Proprietário; máscara preta, olhos-buraco com brilho fraco, capa até o chão
    'proprietario': dict(body='smoking', seated=False, suit=(0.012, 0.012, 0.014), shirt=(0.9, 0.88, 0.85),
                         hair='nenhum', hair_color=(0.02, 0.02, 0.02), iris=(0, 0, 0), mood='perfeito', nose=0.9,
                         lips=(0.02, 0.02, 0.02), blush=0.0, eyes='buraco', mask_dark=True, stretch=1.12,
                         glow_eyes=True, ring=True),
    # o pianista (sempre de costas)
    'pianista': dict(body='fraque', seated=True, suit=(0.03, 0.03, 0.035), shirt=(0.92, 0.9, 0.86), hair='pomada',
                     hair_color=(0.05, 0.04, 0.035), iris=(0.3, 0.3, 0.3), mood='perfeito', nose=0.9,
                     lips=(0.55, 0.35, 0.33), blush=0.0, pale=True),
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
    'perfeito': dict(brow=0.0, mouth=0.0, lid=0.12, happy=0.0),
    'animado': dict(brow=-0.05, mouth=0.22, lid=0.05, happy=0.7),
    'molhado': dict(brow=0.07, mouth=-0.05, lid=0.35, happy=0.0),
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


FRECKLES = [((i * 0.137) % 0.5 - 0.25 + (0.18 if i % 2 else -0.18) * (i % 3 > 0), -0.22 - ((i * 0.071) % 0.2),
             0.012 + 0.006 * ((i * 7) % 3) / 2) for i in range(46)]


def _crack_paths():
    """Rachaduras como polilinhas (caminhada aleatória determinística) na esfera unitária."""
    paths, seed = [], 7
    def rnd():
        nonlocal seed
        seed = (seed * 1103515245 + 12345) % 2 ** 31
        return seed / 2 ** 31
    for x0, z0 in ((0.25, 0.62), (-0.42, 0.5), (0.55, -0.1), (-0.15, -0.35), (0.05, 0.75), (-0.6, -0.05)):
        pts, x, z, a = [(x0, z0)], x0, z0, rnd() * 6.28
        for _ in range(7):
            a += (rnd() - 0.5) * 1.6
            x, z = x + 0.09 * math.cos(a), z - 0.09 * abs(math.sin(a)) - 0.03
            pts.append((x, z))
        paths.append(pts)
    return [(a, b) for pts in paths for a, b in zip(pts, pts[1:])]


CRACKS = _crack_paths()


def _seg_dist(px, pz, a, b):
    ax, az = a
    bx, bz = b
    dx, dz = bx - ax, bz - az
    t = max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
    return math.hypot(px - ax - t * dx, pz - az - t * dz)


def smile_curve(x):
    return -0.5 + 0.55 * x * x


def face_color(x, z, p, mood, eyes, ivory, iris, lips, brow_col):
    """Cor (linear) pintada no ponto (x, z) da esfera unitária da máscara."""
    c = list(ivory)
    if p.get('blank'):  # porcelana em branco: nada pintado
        return c
    if p.get('carved_smile') and abs(x) < 0.78:  # sorriso esculpido: fenda escura com dentes pintados
        zc = smile_curve(x)
        d = z - zc
        if -0.075 < d < 0.03:
            tooth = (d > -0.035) and (abs(((x + 0.7) / 0.07) % 1 - 0.5) < 0.42)
            return list(lin((0.92, 0.9, 0.82))) if tooth else list(lin((0.12, 0.01, 0.02)))
        rim = smoothstep(0.035, 0.0, abs(d + 0.022) - 0.053)
        c = [c[i] * (1 - rim) + lips[i] * rim for i in range(3)]
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
    if p.get('cracks'):  # rachaduras finas e escuras
        dmin = min(_seg_dist(x, z, a, b) for a, b in CRACKS)
        k = smoothstep(0.009, 0.003, dmin)
        c = [ci * (1 - 0.85 * k) for ci in c]
    if eyes == 'buraco':
        hole = smoothstep(0.16, 0.115, min(math.hypot((x - sx * 0.33) / 1.25, z - 0.1) for sx in (-1, 1)))
        return [k * (1 - hole) for k in c]
    if p.get('no_eyes'):
        return c
    if p.get('shadow'):  # sombra colorida de festa sobre as pálpebras
        sh_col = lin(p['shadow'])
        for sx in (-1, 1):
            k = 0.85 * gauss(math.hypot((x - sx * 0.33) / 1.3, z - 0.15), 0.075)
            c = [c[i] * (1 - k) + sh_col[i] * k for i in range(3)]
    if p.get('freckles'):  # sardas sobre o nariz e as bochechas
        for fx, fz, fr in FRECKLES:
            k = smoothstep(fr, fr * 0.5, math.hypot(x - fx, z - fz))
            c = [ci * (1 - 0.45 * k) + (0.25 if i == 0 else 0.12) * 0.45 * k for i, ci in enumerate(c)]
    if p.get('escorre'):  # tinta dos olhos lavada pela água, escorrendo até o queixo
        for sx in (-1, 1):
            for off, w0, depth in ((0.0, 0.016, -0.82), (0.07, 0.009, -0.5), (-0.06, 0.007, -0.35)):
                if depth < z < 0.08:
                    dx = x - sx * (0.33 + off) - 0.012 * math.sin(z * 23 + sx)
                    w = w0 * (1 + 2.5 * (0.08 - z))
                    k = smoothstep(w, w * 0.4, abs(dx)) * smoothstep(depth, depth + 0.25, z)
                    c = [ci * (1 - 0.8 * k) + (0.05, 0.06, 0.08)[i] * 0.8 * k for i, ci in enumerate(c)]
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


def sculpt_face(x, z, mood, nose, eyes, p=None):
    """Relevo do rosto em coordenadas da esfera unitária (x lateral, z vertical)."""
    p = p or {}
    if p.get('blank'):
        return 0.0
    eye = min(math.hypot((x - sx * 0.33) / 1.25, z - 0.1) for sx in (-1, 1))
    disp = 0.0
    if p.get('carved_smile') and abs(x) < 0.8:  # fenda do sorriso de orelha a orelha
        d = z - smile_curve(x) + 0.022
        disp -= 0.12 * smoothstep(0.06, 0.02, abs(d)) * smoothstep(0.8, 0.6, abs(x))
        disp += 0.06 * sum(gauss(math.hypot(x - sx * 0.45, z + 0.12), 0.15) for sx in (-1, 1))
    if p.get('no_eyes'):
        pass
    elif eyes == 'buraco':
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
    cut = eyes == 'buraco' or bool(p.get('mask_scale'))  # máscara recortada sobre cabeça preta
    ivory = lin((0.035, 0.032, 0.035) if p.get('mask_dark') else (0.97, 0.96, 0.95) if p.get('pale') else (0.93, 0.89, 0.82))
    iris = lin(p['iris'])
    lips = lin(p['lips'])
    brow_col = lin(tuple(c * 0.8 for c in p['hair_color']))
    hair_mat = P(f'{key}_cabelo', lin(p['hair_color']), roughness=0.9)
    if cut:  # estranho: cabeça preta atrás da máscara
        parts.append(sphere('cabeca', head_c, (0.148, 0.158, 0.178), P('vazio', (0, 0, 0), roughness=1.0)))
    if p.get('glow_eyes'):  # brilho fraco, fundo, dentro das órbitas
        ember = P('brasa_olho', lin((0.6, 0.08, 0.04)), emission=lin((1.0, 0.15, 0.05)), strength=3)
        for sx in (-1, 1):
            parts.append(sphere('olho_brilho', head_c + Vector((sx * 0.05, 0.1, 0.018)), (0.012, 0.006, 0.009),
                                ember, 12, 8))
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
    elif p['hair'] == 'pomada':  # penteado para trás, brilhante, risca lateral
        slick = P(f'{key}_brilhantina', lin(p['hair_color']), roughness=0.22)
        parts.append(hair_shell('cabelo', head_c, (0.157, 0.167, 0.186), -math.pi, math.pi,
                                lambda lon: 0.5 * max(0.0, math.cos(lon)) ** 2 - 0.3 * (1 - max(0.0, math.cos(lon)) ** 2),
                                lambda lon: math.pi / 2 - 0.001, slick, nu=128, nv=28, wrap=True))
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
    hat = p.get('hat')
    top_z = head_c.z + 0.13
    if hat == 'cartola':
        silk = P(f'{key}_cartola', lin(p.get('hat_color', (0.02, 0.02, 0.022))), roughness=0.25)
        parts.append(lathe_at('aba', [(0.0, 0.0), (0.2, 0.0), (0.215, 0.012), (0.205, 0.016), (0.0, 0.016)],
                              Vector((0, 0.005, top_z)), silk, 56, rot=(math.radians(-5), 0, 0)))
        parts.append(lathe_at('copa', [(0.0, 0.0), (0.14, 0.0), (0.135, 0.12), (0.145, 0.2), (0.0, 0.2)],
                              Vector((0, 0.005, top_z + 0.01)), silk, 48, rot=(math.radians(-5), 0, 0)))
        parts.append(lathe_at('fita', [(0.142, 0.0), (0.146, 0.0), (0.144, 0.04), (0.14, 0.04)],
                              Vector((0, 0.005, top_z + 0.012)), P('cetim', lin((0.06, 0.05, 0.06)), roughness=0.15),
                              48, rot=(math.radians(-5), 0, 0)))
    elif hat == 'coco':  # chapéu-coco
        felt = P(f'{key}_coco', lin(p.get('hat_color', (0.03, 0.03, 0.03))), roughness=0.5)
        parts.append(lathe_at('aba', [(0.0, 0.0), (0.2, 0.0), (0.215, 0.015), (0.205, 0.02), (0.0, 0.015)],
                              Vector((0, 0.0, top_z)), felt, 56))
        parts.append(lathe_at('copa', [(0.0, 0.0), (0.15, 0.0), (0.155, 0.06), (0.13, 0.12), (0.07, 0.15),
                                       (0.0, 0.155)], Vector((0, 0.0, top_z + 0.01)), felt, 48))
    elif hat == 'boina':
        wool = P(f'{key}_boina', lin((0.16, 0.18, 0.24)), roughness=0.9)
        parts.append(lathe_at('boina', [(0.0, 0.07), (0.12, 0.065), (0.2, 0.035), (0.19, 0.0), (0.15, -0.01),
                                        (0.0, 0.0)], Vector((0.02, 0.0, top_z - 0.02)), wool, 48,
                              rot=(math.radians(-6), math.radians(14), 0)))
        parts.append(lathe_at('pino', [(0.0, 0.0), (0.008, 0.0), (0.006, 0.02), (0.0, 0.022)],
                              Vector((0.0, -0.005, top_z + 0.05)), wool, 8))
    elif hat == 'pescador':
        oil = P(f'{key}_oleado', lin(p['coat']), roughness=0.12)
        parts.append(lathe_at('copa', [(0.0, 0.0), (0.155, 0.0), (0.15, 0.08), (0.11, 0.13), (0.0, 0.14)],
                              Vector((0, -0.005, top_z - 0.01)), oil, 48))
        brim = lib.lathe('aba', [(0.15, 0.0), (0.25, -0.05), (0.26, -0.06), (0.255, -0.05), (0.15, 0.008)], 56)
        for v in brim.data.vertices:  # aba mais longa e caída atrás
            if v.co.y > 0.0:
                v.co.y *= 1.35
                v.co.z -= 0.05 * v.co.y
        brim.location = Vector((0, -0.005, top_z))
        lib.assign(brim, oil)
        parts.append(lib.link(brim))
    if hat is True or hat == 'fedora':
        felt = P(f'{key}_chapeu', lin(p.get('hat_color', (0.16, 0.13, 0.1))), roughness=0.8)
        band = P(f'{key}_fita_chapeu', lin((0.08, 0.05, 0.04)), roughness=0.4)
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
        if cut and (y < 0.15 or z > 0.8 or z < -0.95):
            kill.append(v)
            continue
        # rosto da frente (só no hemisfério da frente) e, se houver, o segundo rosto na nuca
        disp = smoothstep(-0.1, 0.4, y) * sculpt_face(x, z, mood, nose, eyes, p)
        if back:
            disp += smoothstep(-0.1, 0.4, -y) * sculpt_face(-x, z, MOODS[back['mood']], back['nose'], back['eyes'])
        v.co = v.co + v.co.normalized() * disp
        v.co = Vector((v.co.x * 0.15, v.co.y * 0.16 + 0.012, v.co.z * 0.18))
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(mask.data)
    bm.free()
    mask.location = head_c
    if p.get('mask_scale'):  # máscara pequena demais, colada no centro do rosto
        s_ = p['mask_scale']
        mask.scale = (s_, s_, s_)
        mask.location = head_c + Vector((0, 0.17 * (1 - s_), 0.01))
    if cut:
        mask.modifiers.new('esp', 'SOLIDIFY').thickness = 0.008
    lib.smooth(mask)
    face = paint_face_image(f'rosto_{key}', p, mood, eyes, ivory, iris, lips, brow_col)
    face_mat = lib.textured(f'porcelana_{key}', face)
    bsdf = face_mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.06 if p.get('wet') else 0.12 if p.get('mask_dark') else 0.22
    bsdf.inputs['Coat Weight'].default_value = 1.0 if p.get('wet') else 0.8
    lib.assign(mask, face_mat)
    parts.append(lib.to_mesh(mask))
    ribbon = P(f'{key}_fita', lin((0.35, 0.05, 0.06)), roughness=0.4)
    for sx in ((-1, 1) if cut and not p.get('mask_scale') else ()):
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
    if p.get('white_cane'):  # bengala branca com ponta vermelha
        el, wr = wrists[-1]
        top = wr + Vector((0, 0.03, 0.02))
        foot = Vector((top.x - 0.05, top.y + 0.25, 0.0))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('bengala_branca', [tuple(top), tuple(foot.lerp(top, 0.12))], 0.008, 10),
                                            P('bengala_branca', lin((0.92, 0.92, 0.9)), roughness=0.3))))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('ponta', [tuple(foot.lerp(top, 0.12)), tuple(foot)], 0.0085, 10),
                                            P('ponta_vermelha', lin((0.6, 0.04, 0.04)), roughness=0.3))))
    if p.get('handbag'):  # bolsa de mão pendurada no antebraço esquerdo
        el, wr = wrists[1]
        mid = el.lerp(wr, 0.45)
        bag = P(f'{key}_bolsa', lin((0.45, 0.14, 0.1)), roughness=0.4)
        parts.append(prism('bolsa', mid.z - 0.24, mid.z - 0.09, (0.12, 0.04), (0.1, 0.035), bag,
                           center0=(mid.x + 0.06, mid.y + 0.03), bevel=0.015))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('alca_bolsa', [(mid.x - 0.02, mid.y + 0.03, mid.z - 0.09),
                                                                           (mid.x, mid.y + 0.03, mid.z + 0.03),
                                                                           (mid.x + 0.14, mid.y + 0.03, mid.z - 0.09)],
                                                           0.005, 6), bag)))
        parts.append(prism('fecho_bolsa', mid.z - 0.1, mid.z - 0.085, (0.02, 0.01), (0.02, 0.01),
                           P('ouro', lin((0.85, 0.65, 0.3)), roughness=0.25, metallic=1.0),
                           center0=(mid.x + 0.06, mid.y + 0.068), bevel=0.002))
    if p.get('ring'):  # anel de ouro com pedra vermelha na mão direita
        el, wr = wrists[-1]
        d = (wr - el).normalized()
        ring_c = wr + d * 0.09
        gold = P('ouro', lin((0.85, 0.65, 0.3)), roughness=0.2, metallic=1.0)
        parts.append(lathe_at('anel', [(0.012, -0.004), (0.016, 0.0), (0.012, 0.004)], ring_c, gold, 20,
                              rot=(math.pi / 2, 0, 0)))
        parts.append(sphere('rubi', ring_c + Vector((0, 0.016, 0)), (0.007, 0.007, 0.007),
                            P('rubi', lin((0.5, 0.02, 0.04)), roughness=0.05), 10, 8))
    if p.get('monocle'):  # monóculo no olho direito, corrente até o colete
        silver = P('prata', lin((0.8, 0.8, 0.78)), roughness=0.2, metallic=1.0)
        ring = [tuple(head_c + Vector((-0.05 + 0.03 * math.cos(a), 0.178, 0.018 + 0.03 * math.sin(a))))
                for a in [i / 24 * 2 * math.pi for i in range(25)]]
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('monoculo', ring, 0.0025, 6), silver)))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('corrente', [
            tuple(head_c + Vector((-0.075, 0.17, -0.02))), (-0.11, 0.17, 1.2 + dz), (-0.1, 0.16, 1.05 + dz),
            (-0.07, 0.15, 0.98 + dz)], 0.0015, 4), silver)))
    if p.get('cane') == 'prata':  # bengala preta com castão de prata na mão direita
        silver = P('prata', lin((0.8, 0.8, 0.78)), roughness=0.2, metallic=1.0)
        el, wr = wrists[-1]
        top = wr + Vector((0, 0.03, 0.02))
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('bengala', [tuple(top), (top.x, top.y + 0.06, 0.0)], 0.009, 10),
                                            P('ebano', lin((0.02, 0.018, 0.016)), roughness=0.2))))
        parts.append(sphere('castao', top + Vector((0, 0, 0.02)), (0.022, 0.022, 0.028), silver, 16, 12))
    if p.get('scarf'):  # cachecol listrado da faculdade: volta no pescoço e ponta caída
        c1 = P(f'{key}_cachecol1', lin(p['scarf'][0]), roughness=0.95)
        c2 = P(f'{key}_cachecol2', lin(p['scarf'][1]), roughness=0.95)
        loop = [Vector((0.11 * math.sin(a), 0.11 * math.cos(a) - 0.005, 1.29 + dz + 0.01 * math.sin(a * 2)))
                for a in [i / 24 * 2 * math.pi for i in range(25)]]
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('cachecol_volta', [tuple(v) for v in loop], 0.028, 10), c1)))
        hang = [Vector((0.06, 0.13, 1.28 + dz)), Vector((0.08, 0.17, 1.1 + dz)), Vector((0.09, 0.175, 0.9 + dz))]
        for i in range(8):  # listras: segmentos alternados
            a = hang[0].lerp(hang[1], i / 8) if i < 4 else hang[1].lerp(hang[2], (i - 4) / 4)
            b = hang[0].lerp(hang[1], (i + 1) / 8) if i < 3 else hang[1].lerp(hang[2], (i - 3) / 4)
            seg = lib.tube_along('cachecol_ponta', [tuple(a), tuple(b)], 0.022, 8)
            seg.scale = (1, 1, 1)
            parts.append(lib.to_mesh(lib.assign(seg, c1 if i % 2 else c2)))
    if p.get('books'):  # dois livros sobre a mesa à frente
        for i, (col, h) in enumerate((((0.3, 0.08, 0.06), 0.035), ((0.08, 0.18, 0.12), 0.03))):
            z0 = 0.775 + i * 0.035
            parts.append(prism('livro', z0, z0 + h, (0.08, 0.11), (0.08, 0.11), P(f'livro{i}', lin(col), roughness=0.6),
                               center0=(0.22 - i * 0.01, 0.42 + i * 0.01), bevel=0.004))
            parts.append(prism('paginas', z0 + 0.003, z0 + h - 0.003, (0.075, 0.105), (0.075, 0.105),
                               P('paginas', lin((0.85, 0.8, 0.68)), roughness=0.9),
                               center0=(0.226 - i * 0.01, 0.42 + i * 0.01), bevel=0.0))
    if p.get('drops'):  # gotas paradas no chapéu e na barra, e a poça aos pés
        water = P('agua', lin((0.6, 0.65, 0.6)), roughness=0.02, transmission=0.9, ior=1.33)
        for i in range(26):
            a = i / 26 * 2 * math.pi + 0.3
            pos = head_c + Vector((0.255 * math.sin(a), -0.005 + 0.255 * math.cos(a) * (1.35 if math.cos(a) < 0 else 1.0),
                                   0.13 - 0.07 - 0.05 * max(0.0, -math.cos(a))))
            parts.append(sphere('gota', pos, (0.006, 0.006, 0.011), water, 8, 6))
        for i in range(30):
            a = i / 30 * 2 * math.pi
            pos = Vector((0.27 * math.sin(a) * 0.98, 0.19 * math.cos(a), 0.22 + dz - 0.01 * (i % 3)))
            parts.append(sphere('gota', pos, (0.006, 0.006, 0.012), water, 8, 6))
        puddle = lib.lathe('poca', [(0.0, 0.0), (0.42, 0.0), (0.44, 0.002), (0.0, 0.003)], 48)
        for v in puddle.data.vertices:
            ang = math.atan2(v.co.x, v.co.y)
            k = 1 + 0.18 * math.sin(ang * 3) + 0.1 * math.sin(ang * 7)
            v.co.x *= k
            v.co.y *= k
        puddle.location = (0.0, 0.08, 0.001)
        lib.assign(puddle, P('poca', lin((0.03, 0.035, 0.03)), roughness=0.02))
        parts.append(lib.link(puddle))
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


def stripes_image(name, a, b, size=256):
    """Listras verticais largas (tile de 0,3 m) com filete fino."""
    img = bpy.data.images.new(name, size, size)
    px = [0.0] * (size * size * 4)
    for j in range(size):
        for i in range(size):
            u = i / size
            band = int(u * 8) % 2
            c = a if band else b
            if abs((u * 8) % 1 - 0.5) > 0.46:
                c = tuple(x * 0.5 for x in a)
            k = (j * size + i) * 4
            px[k:k + 4] = (srgb(c[0]), srgb(c[1]), srgb(c[2]), 1.0)
    img.pixels.foreach_set(px)
    img.filepath_raw = os.path.join(TEX, name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def argyle_image(name, base, diamond, line, size=512):
    """Losangos de tricô (tile de 0,24 m): fundo, losangos alternados e linhas finas cruzadas."""
    img = bpy.data.images.new(name, size, size)
    px = [0.0] * (size * size * 4)
    for j in range(size):
        v = j / size
        for i in range(size):
            u = i / size
            du, dv = abs((u * 2) % 1 - 0.5), abs((v * 2) % 1 - 0.5)
            inside = du + dv < 0.5
            cell = (int(u * 2) + int(v * 2)) % 2
            c = diamond if inside and cell == 0 else base
            if inside and cell == 1:
                c = tuple(b * 0.8 for b in base)
            for t in (u * 2 + v * 2, u * 2 - v * 2):  # linhas diagonais finas
                if abs(t - round(t)) < 0.012:
                    c = line
            knit = 0.92 + 0.08 * math.sin(i * 0.9) * math.sin(j * 1.3)
            k = (j * size + i) * 4
            px[k:k + 4] = (srgb(c[0] * knit), srgb(c[1] * knit), srgb(c[2] * knit), 1.0)
    img.pixels.foreach_set(px)
    img.filepath_raw = os.path.join(TEX, name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def stretch(parts, head_start, f, neck_z):
    """Alonga o corpo (z multiplicado por f) e sobe a cabeça junto, sem deformá-la."""
    from mathutils import Matrix
    for i, o in enumerate(parts):
        o.data.transform(o.matrix_basis)
        o.matrix_basis = Matrix.Identity(4)
        for v in o.data.vertices:
            if i < head_start:
                v.co.z *= f
            else:
                v.co.z += (f - 1) * neck_z


def head_accessories(parts, key, p, head_c, wrists, dz):
    if p.get('veil'):  # véu de renda: longo atrás, curto na frente até o nariz
        lace = P('veu', lin((0.95, 0.94, 0.92)), roughness=0.6, alpha=0.28)
        back = lib.lathe('veu', [(0.04, 0.19), (0.165, 0.11), (0.18, -0.08), (0.2, -0.36)], 48,
                         arc=(-math.pi * 0.6, math.pi * 0.6))   # atrás (ângulo 0 = costas)
        front = lib.lathe('veu_frente', [(0.04, 0.19), (0.17, 0.11), (0.182, 0.02)], 48,
                          arc=(math.pi * 0.66, math.pi * 1.34))  # rendinha na frente até os olhos
        for o in (back, front):
            o.location = head_c + Vector((0, -0.01, 0.0))
            lib.assign(o, lace)
            parts.append(lib.link(o))
        parts.append(sphere('pente', head_c + Vector((0, -0.06, 0.17)), (0.05, 0.02, 0.025),
                            P('perola', lin((0.92, 0.9, 0.86)), roughness=0.15), 16, 10))
    if p.get('blindfold'):  # venda de pano sobre os olhos, nó atrás
        cloth = P('venda', lin((0.75, 0.72, 0.66)), roughness=0.9)
        parts.append(lathe_at('venda', [(0.168, -0.028), (0.174, -0.02), (0.176, 0.02), (0.168, 0.03)],
                              head_c + Vector((0, 0.008, 0.02)), cloth, 64, rot=(math.radians(4), 0, 0),
                              scale=(1.0, 1.07, 1.0)))
        knot = head_c + Vector((0, -0.18, 0.02))
        parts.append(sphere('no_venda', knot, (0.025, 0.018, 0.022), cloth, 12, 8))
        for sx in (-1, 1):
            parts.append(lib.to_mesh(lib.assign(lib.tube_along('ponta_venda', [tuple(knot), tuple(knot + Vector((sx * 0.03, -0.02, -0.1))),
                                                                                tuple(knot + Vector((sx * 0.04, -0.01, -0.18)))],
                                                               0.01, 6), cloth)))
    if p.get('scarf_plain'):  # cachecol enrolado até o queixo
        wool = P(f'{key}_cachecol', lin(p['scarf_plain']), roughness=0.95)
        for i in range(4):
            z = 1.26 + dz + i * 0.045
            parts.append(lathe_at('cachecol', [(0.1 + 0.01 * (i == 3), -0.025), (0.125, 0.0), (0.1, 0.025)],
                                  Vector((0, 0.0, z)), wool, 40, rot=(math.radians(6 * (i % 2) - 3), 0, 0)))
        parts.append(prism('cachecol_ponta', 0.85 + dz, 1.26 + dz, (0.045, 0.012), (0.05, 0.015), wool,
                           center0=(0.08, 0.15), center1=(0.07, 0.14), bevel=0.01))


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
    glove_col = {'sobretudo': (0.12, 0.08, 0.06), 'melindrosa': (0.03, 0.025, 0.025),
                 'capa': (0.04, 0.045, 0.03), 'smoking': (0.02, 0.02, 0.02),
                 'vestido_longo': (0.92, 0.9, 0.86)}.get(p['body'], (0.92, 0.9, 0.85))
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
    elif p['body'] == 'fraque':
        black = P(f'{key}_fraque', lin(p['suit']), roughness=0.55)
        satin = P(f'{key}_cetim', lin((0.05, 0.05, 0.055)), roughness=0.15)
        white = P(f'{key}_colete_branco', lin((0.93, 0.92, 0.9)), roughness=0.5)
        parts.append(prism('paleto', 0.95 + dz, 1.22 + dz, (0.18, 0.12), (0.24, 0.12), black, bevel=0.03))
        parts.append(prism('ombros', 1.22 + dz, 1.3 + dz, (0.24, 0.12), (0.19, 0.1), black, bevel=0.03))
        parts.append(prism('cintura', 0.62 + dz, 0.95 + dz, (0.16, 0.11), (0.18, 0.12), black, bevel=0.03))
        for sx in (-1, 1):  # abas da casaca, atrás, até o joelho
            parts.append(prism('aba_casaca', 0.42 + dz, 0.98 + dz, (0.075, 0.012), (0.095, 0.015), black,
                               center0=(sx * 0.07, -0.125), center1=(sx * 0.1, -0.12), bevel=0.008))
            bm = bmesh.new()
            vs = [bm.verts.new((x, y, z + dz)) for x, y, z in ((sx * 0.03, 0.15, 0.97), (sx * 0.2, 0.142, 1.2),
                                                                (sx * 0.12, 0.132, 1.29), (sx * 0.06, 0.15, 1.05))]
            bm.faces.new(vs if sx > 0 else list(reversed(vs)))
            me = bpy.data.meshes.new('lapela')
            bm.to_mesh(me)
            bm.free()
            lap = bpy.data.objects.new('lapela', me)
            sol = lap.modifiers.new('esp', 'SOLIDIFY')
            sol.thickness = 0.015
            sol.offset = 0.0
            lib.assign(lap, satin)
            parts.append(lib.to_mesh(lib.link(lap)))
        parts.append(prism('colete', 0.8 + dz, 1.2 + dz, (0.1, 0.006), (0.04, 0.006), white, center0=(0, 0.14),
                           center1=(0, 0.13), bevel=0.0))
        parts.append(prism('peitilho', 1.12 + dz, 1.26 + dz, (0.03, 0.005), (0.07, 0.005), shirt, center0=(0, 0.146),
                           center1=(0, 0.128), bevel=0.0))
        for i in range(3):
            parts.append(lathe_at('botao', [(0, 0), (0.009, 0), (0.009, 0.004), (0, 0.006)],
                                  (0.0, 0.147, 0.88 + i * 0.08 + dz), P('perola', lin((0.92, 0.9, 0.86)), roughness=0.15),
                                  10, rot=(-math.pi / 2, 0, 0)))
        for sx in (-1, 1):  # gravata-borboleta branca
            parts.append(prism('laco', 1.235 + dz, 1.265 + dz, (0.002, 0.006), (0.006, 0.006), white,
                               center0=(sx * 0.008, 0.152), center1=(sx * 0.04, 0.152), bevel=0.004))
        parts.append(sphere('no_laco', Vector((0, 0.155, 1.25 + dz)), (0.01, 0.008, 0.012), white, 12, 8))
        sleeve_mat = black
        legs_mat = black
    elif p['body'] == 'sueter':
        img = argyle_image(f'{key}_losangos', lin(p['sweater']), lin(p['argyle']), lin(p['argyle_line']))
        knit = lib.textured(f'{key}_sueter', img)
        knit.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
        rib = P(f'{key}_punho_tricot', tuple(c * 0.7 for c in lin(p['sweater'])), roughness=0.95)
        body_parts = [prism('sueter', 0.68 + dz, 1.22 + dz, (0.19, 0.125), (0.23, 0.12), knit, bevel=0.035),
                      prism('ombros', 1.22 + dz, 1.3 + dz, (0.23, 0.12), (0.18, 0.1), knit, bevel=0.03)]
        for o in body_parts:
            lib.box_uv(o, 0.24)
        parts += body_parts
        parts.append(prism('barra', 0.62 + dz, 0.69 + dz, (0.19, 0.125), (0.19, 0.125), rib, bevel=0.015))
        for sx in (-1, 1):  # pontas da gola da camisa por cima do suéter
            bm = bmesh.new()
            vs = [bm.verts.new((x, y, z + dz)) for x, y, z in ((sx * 0.01, 0.13, 1.25), (sx * 0.07, 0.115, 1.28),
                                                                (sx * 0.06, 0.135, 1.2))]
            bm.faces.new(vs if sx > 0 else list(reversed(vs)))
            me = bpy.data.meshes.new('gola_camisa')
            bm.to_mesh(me)
            bm.free()
            gc = bpy.data.objects.new('gola_camisa', me)
            sol = gc.modifiers.new('esp', 'SOLIDIFY')
            sol.thickness = 0.006
            sol.offset = 0.0
            lib.assign(gc, shirt)
            parts.append(lib.to_mesh(lib.link(gc)))
        sleeve_mat = knit
        legs_mat = P(f'{key}_calca', lin(p['trousers']), roughness=0.85)
    elif p['body'] == 'capa':
        oil = P(f'{key}_oleado', lin(p['coat']), roughness=0.12)
        oil.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value = 1.0
        parts.append(prism('capa', 0.24 + dz, 1.22 + dz, (0.27, 0.19), (0.23, 0.13), oil, bevel=0.035))
        parts.append(prism('ombros', 1.22 + dz, 1.3 + dz, (0.23, 0.13), (0.18, 0.1), oil, bevel=0.03))
        parts.append(prism('aba_tempestade', 0.45 + dz, 1.24 + dz, (0.05, 0.006), (0.05, 0.006), oil,
                           center0=(0.04, 0.188 - 0.06), center1=(0.04, 0.135), bevel=0.004))
        for z in (0.55, 0.75, 0.95, 1.15):
            parts.append(lathe_at('fivela_capa', [(0, 0), (0.018, 0), (0.018, 0.008), (0, 0.01)],
                                  (0.07, 0.19 - (z - 0.24) * 0.06 + 0.012, z + dz),
                                  P('fivela_capa', lin((0.08, 0.08, 0.07)), roughness=0.3), 12,
                                  rot=(-math.pi / 2, 0, 0)))
        sleeve_mat = oil
        legs_mat = P(f'{key}_bota', lin((0.03, 0.03, 0.028)), roughness=0.2)
    elif p['body'] == 'vestido_longo':  # corpete justo, saia até o chão com cauda
        satin = P(f'{key}_cetim', lin(p['dress']), roughness=0.3)
        parts.append(prism('corpete', 0.92 + dz, 1.22 + dz, (0.14, 0.095), (0.19, 0.105), satin, bevel=0.03))
        parts.append(prism('ombros', 1.22 + dz, 1.28 + dz, (0.19, 0.105), (0.15, 0.09), satin, bevel=0.025))
        skirt = lib.lathe('saia', [(0.15, 0.94), (0.2, 0.7), (0.3, 0.3), (0.4, 0.0)], 64)
        for v in skirt.data.vertices:  # cauda atrás e dobras
            ang = math.atan2(v.co.x, v.co.y)
            if v.co.y < 0:
                v.co.y *= 1 + 0.7 * (0.94 - v.co.z)
            r = 1 + 0.03 * math.sin(ang * 14) * (0.94 - v.co.z)
            v.co.x *= r
            v.co.y *= r
        skirt.location = (0, 0, dz)
        skirt.modifiers.new('esp', 'SOLIDIFY').thickness = 0.01
        lib.assign(skirt, satin)
        parts.append(lib.to_mesh(lib.link(skirt)))
        sleeve_mat = None
        legs_mat = None
    elif p['body'] == 'cardiga':  # cardigã de tricô liso, blusa, saia plissada
        knit_img = argyle_image(f'{key}_tricot', lin(p['knit']), lin(p['knit']), tuple(c * 0.85 for c in lin(p['knit'])))
        knit = lib.textured(f'{key}_cardiga', knit_img)
        knit.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
        body = [prism('cardiga', 0.88 + dz, 1.22 + dz, (0.17, 0.115), (0.21, 0.115), knit, bevel=0.035),
                prism('ombros', 1.22 + dz, 1.29 + dz, (0.21, 0.115), (0.16, 0.095), knit, bevel=0.03)]
        for o in body:
            lib.box_uv(o, 0.24)
        parts += body
        parts.append(prism('blusa', 1.05 + dz, 1.27 + dz, (0.03, 0.005), (0.08, 0.005), shirt, center0=(0, 0.122),
                           center1=(0, 0.105), bevel=0.0))
        for i in range(4):
            parts.append(lathe_at('botao', [(0, 0), (0.01, 0), (0.01, 0.005), (0, 0.007)],
                                  (0.0, 0.124, 0.92 + i * 0.07 + dz), P('botao_madreperola', lin((0.9, 0.88, 0.85)), roughness=0.2),
                                  10, rot=(-math.pi / 2, 0, 0)))
        skirt = lib.lathe('saia', [(0.16, 0.92), (0.2, 0.75), (0.26, 0.45)], 96)
        for v in skirt.data.vertices:  # pregas
            ang = math.atan2(v.co.x, v.co.y)
            r = 1 + 0.06 * abs(math.sin(ang * 12)) * (0.92 - v.co.z)
            v.co.x *= r
            v.co.y *= r
        skirt.location = (0, 0, dz)
        skirt.modifiers.new('esp', 'SOLIDIFY').thickness = 0.008
        lib.assign(skirt, P(f'{key}_saia', lin(p['skirt']), roughness=0.85))
        parts.append(lib.to_mesh(lib.link(skirt)))
        sleeve_mat = knit
        legs_mat = P(f'{key}_meia', lin((0.55, 0.42, 0.35)), roughness=0.5)
    elif p['body'] == 'mestre':  # colete listrado de mestre de cerimônias, mangas de camisa com ligas
        img = stripes_image(f'{key}_listras', lin(p['vest']), lin(p['vest2']))
        vest = lib.textured(f'{key}_colete', img)
        body = [prism('colete', 0.66 + dz, 1.22 + dz, (0.18, 0.12), (0.22, 0.115), vest, bevel=0.03),
                prism('ombros', 1.22 + dz, 1.29 + dz, (0.22, 0.115), (0.17, 0.095), shirt, bevel=0.03)]
        lib.box_uv(body[0], 0.3)
        parts += body
        parts.append(prism('peitilho', 1.02 + dz, 1.27 + dz, (0.03, 0.005), (0.08, 0.005), shirt, center0=(0, 0.127),
                           center1=(0, 0.108), bevel=0.0))
        red = P(f'{key}_laco', lin((0.6, 0.04, 0.05)), roughness=0.3)
        for sx in (-1, 1):
            parts.append(prism('laco', 1.235 + dz, 1.27 + dz, (0.003, 0.008), (0.008, 0.008), red,
                               center0=(sx * 0.01, 0.13), center1=(sx * 0.05, 0.13), bevel=0.004))
        parts.append(sphere('no_laco', Vector((0, 0.135, 1.252 + dz)), (0.012, 0.009, 0.014), red, 12, 8))
        gold = P('ouro', lin((0.85, 0.65, 0.3)), roughness=0.25, metallic=1.0)
        parts.append(lib.to_mesh(lib.assign(lib.tube_along('corrente_relogio', [(-0.12, 0.128, 0.92 + dz), (-0.05, 0.14, 0.86 + dz),
                                                                              (0.04, 0.14, 0.88 + dz), (0.12, 0.128, 0.95 + dz)],
                                                        0.003, 4), gold)))
        for i in range(5):
            parts.append(lathe_at('botao', [(0, 0), (0.01, 0), (0.01, 0.005), (0, 0.007)],
                                  (0.0, 0.126, 0.72 + i * 0.07 + dz), gold, 10, rot=(-math.pi / 2, 0, 0)))
        sleeve_mat = shirt
        legs_mat = P(f'{key}_calca', lin(p['trousers']), roughness=0.6)
    elif p['body'] == 'smoking':  # smoking e capa longa até o chão
        black = P(f'{key}_smoking', lin(p['suit']), roughness=0.5)
        satin = P(f'{key}_cetim', lin((0.03, 0.03, 0.035)), roughness=0.12)
        lining = P(f'{key}_forro', lin((0.22, 0.02, 0.03)), roughness=0.3)
        parts.append(prism('paleto', 0.62 + dz, 1.22 + dz, (0.18, 0.12), (0.24, 0.12), black, bevel=0.03))
        parts.append(prism('ombros', 1.22 + dz, 1.3 + dz, (0.24, 0.12), (0.19, 0.1), black, bevel=0.03))
        parts.append(prism('peitilho', 0.9 + dz, 1.26 + dz, (0.03, 0.005), (0.09, 0.005), shirt, center0=(0, 0.146),
                           center1=(0, 0.128), bevel=0.0))
        for sx in (-1, 1):
            parts.append(prism('laco', 1.235 + dz, 1.265 + dz, (0.002, 0.006), (0.006, 0.006), satin,
                               center0=(sx * 0.008, 0.152), center1=(sx * 0.04, 0.152), bevel=0.004))
        cape = lib.lathe('capa', [(0.2, 1.3), (0.3, 1.0), (0.42, 0.5), (0.5, 0.02)], 64,
                         arc=(-math.pi * 0.72, math.pi * 0.72))  # ângulo 0 do torno = costas
        cape.location = (0, -0.02, dz)
        sol = cape.modifiers.new('esp', 'SOLIDIFY')
        sol.thickness = 0.012
        sol.material_offset = 1
        cape.data.materials.append(black)
        cape.data.materials.append(lining)
        parts.append(lib.to_mesh(lib.link(cape)))
        sleeve_mat = black
        legs_mat = black
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
    collar = lib.lathe('gola', [(0.1, 0.0), (0.095, 0.11)] if p['body'] in ('terno', 'fraque', 'smoking', 'mestre') else
                       [(0.115, 0.0), (0.105, 0.08), (0.12, 0.15)] if p['body'] == 'capa' else
                       [(0.09, 0.0), (0.094, 0.03), (0.09, 0.06), (0.094, 0.09), (0.09, 0.12)] if p['body'] == 'melindrosa' else
                       [(0.1, 0.0), (0.085, 0.06), (0.1, 0.12)], 40,
                       arc=(math.pi * 0.15, math.pi * 1.85) if p['body'] in ('terno', 'fraque', 'smoking', 'mestre') else
                       (math.pi * 0.25, math.pi * 1.75) if p['body'] == 'capa' else (0, 2 * math.pi))
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
            if p['body'] == 'vestido_longo':
                continue  # a saia vai até o chão
            if p['body'] in ('terno', 'fraque', 'sueter', 'mestre', 'smoking'):
                parts.append(prism('calca', 0.06, 0.66, (0.07, 0.075), (0.09, 0.1), legs_mat, center0=(x, 0),
                                   center1=(x, 0), bevel=0.02))
                if p['body'] == 'fraque':  # galão de cetim na lateral
                    parts.append(prism('galao', 0.08, 0.64, (0.004, 0.01), (0.004, 0.01),
                                       P('galao', lin((0.06, 0.06, 0.065)), roughness=0.12),
                                       center0=(x + sx * 0.072, 0), center1=(x + sx * 0.092, 0), bevel=0.0))
            elif p['body'] == 'capa':  # botas altas de borracha
                parts.append(prism('bota', 0.0, 0.38, (0.075, 0.12), (0.08, 0.08), legs_mat, center0=(x, 0.04),
                                   center1=(x, 0.0), bevel=0.025))
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
            if p['body'] == 'mestre':
                g = sh.lerp(el, 0.7)
                parts.append(lathe_at('liga', [(0.072, -0.012), (0.078, -0.012), (0.078, 0.012), (0.072, 0.012)], g,
                                      P('liga', lin((0.6, 0.04, 0.05)), roughness=0.4), 20,
                                      rot=(0, sx * math.radians(8), 0)))
        wrists[sx] = (el, wr)
    gloves(parts, key, wrists, glove)
    head_c = Vector((0, 0.0, 1.5 + dz))
    accessories(parts, key, p, wrists, head_c, dz)
    head_start = len(parts)
    build_mask_head(parts, key, p, head_c, p.get('eyes', 'pintado'))
    head_accessories(parts, key, p, head_c, wrists, dz)
    if p.get('stretch'):
        stretch(parts, head_start, p['stretch'], 1.28 + dz)
    lib.export(parts, os.path.join(OUT, f'mascara_{key}.glb'))
    clear()


# Versões em pé de quem espera sentado à mesa: na sua vez, a pessoa levanta e anda até o
# balcão (pedido do Felipe, 27/11/2026: "nao tem animacao do cliente andando ate o balcao").
for _k in ('turista', 'aposentado', 'universitario'):
    PEOPLE[_k + '_em_pe'] = dict(PEOPLE[_k], seated=False)

lib.reset()
only = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 2 else []
for key, p in PEOPLE.items():
    if only and key not in only:
        continue
    print('CONSTRUINDO', key)
    build_person(key, p)
print('PRONTO')
