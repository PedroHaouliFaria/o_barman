"""Gera por código a sala e os móveis do bar (tudo exceto pessoas).

Uso: blender -b -P art/blender/build_salao.py -- <pasta_saida>

Saída (public/models): sala, estante, banqueta, mesa, cadeira, cabine, piano, porta, janela, relogio.
Cada modelo usa o mesmo referencial local do objeto provisório que substitui em src/lab/bar.ts.
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
import labels  # noqa: E402
import materials  # noqa: E402
from lib import game  # noqa: E402

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.abspath('out')
TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)
lib.reset()

# sala (mesmas medidas de src/lab/bar.ts)
X0, X1, ZB, ZF, H = -5.5, 5.5, 1.7, -10.0, 3.4

# ------------------------------------------------------------------ materiais
P = lib.principled
brass = P('latao', (0.62, 0.43, 0.20), roughness=0.28, metallic=1.0)
brass_old = P('latao_velho', (0.40, 0.27, 0.12), roughness=0.45, metallic=1.0)
iron = P('ferro', (0.035, 0.032, 0.03), roughness=0.55, metallic=0.8)
lacquer = P('laca_piano', (0.012, 0.010, 0.010), roughness=0.12)
ivory = P('marfim', (0.86, 0.82, 0.72), roughness=0.35)
ebony = P('ebano', (0.02, 0.018, 0.017), roughness=0.3)
velvet_flat = P('veludo', (0.16, 0.015, 0.02), roughness=1.0)
fabric_shade = P('cupula_tecido', (0.85, 0.6, 0.32), roughness=0.9)
glass_tulip = P('vidro_ambar_tulipa', (0.95, 0.6, 0.25), roughness=0.15, transmission=0.85)
glass_window = P('vidro_janela', (0.05, 0.08, 0.14), roughness=0.05)
mirror = P('espelho', (0.6, 0.55, 0.48), roughness=0.05, metallic=1.0)
bulb = P('filamento', (1, 0.6, 0.25), emission=(1.0, 0.55, 0.2), strength=30)
paint_dark = P('pintura_escura', (0.035, 0.022, 0.016), roughness=0.6)

print('ASSANDO texturas...')
T = {}
for key, mat, size, tile in (
    ('nogueira', materials.walnut('p_nog'), 2048, 1.6),
    ('nogueira_escura', materials.walnut('p_nog2', light=(0.1, 0.045, 0.022), dark=(0.025, 0.01, 0.005), gloss=0.35,
                                         plank_width=0.11, plank_length=0.55), 1024, 0.55),
    ('papel_parede', materials.wallpaper('p_pp'), 1024, 0.8),
    ('piso', materials.marble_floor('p_piso'), 1024, 0.6),
    ('veludo_capitone', materials.velvet_tufted('p_vel'), 1024, 0.6),
    ('couro', materials.leather('p_couro'), 1024, 0.6),
    ('reboco', materials.plaster('p_reb'), 512, 1.5),
):
    imgs = lib.bake_tile(key, mat, size, TEX, tile=tile)
    T[key] = (lib.textured(key, imgs['cor'], imgs['rug'], imgs['normal']), tile)
dial = lib.textured('mostrador', labels.render_dial('relogio', TEX))


def put(obj, material=None, tex=None):
    """Aplica material (ou textura assada com UV de mundo) e converte em malha."""
    mat = T[tex][0] if tex else material
    if mat:
        lib.assign(obj, mat)
    obj = lib.to_mesh(obj) if (obj.modifiers or obj.type == 'CURVE') else lib.link(obj)
    if tex:
        lib.box_uv(obj, T[tex][1])
    return obj


def gbox(name, w, h, d, x, y, z, material=None, tex=None, bevel=0.0, seg=2):
    """Caixa em medidas do JOGO (largura x, altura y, profundidade z), centro em (x, y, z)."""
    return put(lib.box(name, (w, d, h), game(x, y, z), bevel=bevel, segments=seg), material, tex)


def gtube(name, pts, r, material, sides=10):
    return put(lib.tube_along(name, [tuple(game(*p)) for p in pts], r, sides), material)


def glathe(name, profile, x, y, z, material=None, tex=None, seg=40, rot_x=0.0):
    """Torno em torno do eixo vertical do jogo, base em (x, y, z)."""
    o = lib.lathe(name, profile, seg)
    o.location = game(x, y, z)
    o.rotation_euler.x = rot_x
    return put(o, material, tex)


def export(parts, name):
    lib.export(parts, os.path.join(OUT, name + '.glb'))
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)


# ------------------------------------------------------------------ sala
def build_room():
    parts = []
    # piso de mármore xadrez e teto de reboco escuro com vigas
    parts.append(gbox('piso', X1 - X0, 0.02, ZB - ZF, 0, -0.01, (ZB + ZF) / 2, tex='piso'))
    parts.append(gbox('teto', X1 - X0, 0.04, ZB - ZF, 0, H + 0.02, (ZB + ZF) / 2, tex='reboco'))
    z = ZB - 1.2
    while z > ZF:
        parts.append(gbox('viga', X1 - X0, 0.22, 0.26, 0, H - 0.11, z, tex='nogueira_escura', bevel=0.01))
        z -= 2.2

    def wall(kind):
        """kind: fundo, esquerda, direita, frente. u corre ao longo da parede; d entra na sala."""
        if kind in ('fundo', 'frente'):
            u0, u1 = X0, X1
        else:
            u0, u1 = ZF, ZB

        def at(u, y, d):
            if kind == 'fundo':
                return (u, y, ZF + d)
            if kind == 'frente':
                return (u, y, ZB - d)
            if kind == 'esquerda':
                return (X0 + d, y, u)
            return (X1 - d, y, u)

        def wbox(name, ua, ub, ya, yb, da, db, **kw):
            (x0, y0, z0), (x1, y1, z1) = at(ua, ya, da), at(ub, yb, db)
            return gbox(name, abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2,
                        **kw)

        out = []
        out.append(wbox('parede_base', u0, u1, 0, H, -0.05, 0.0, material=paint_dark))
        out.append(wbox('papel', u0, u1, 1.08, H - 0.2, 0.0, 0.008, tex='papel_parede'))
        # lambri: painéis de madeira com moldura
        out.append(wbox('lambri', u0, u1, 0.0, 1.05, 0.0, 0.02, tex='nogueira_escura'))
        n = max(1, round((u1 - u0) / 0.95))
        step = (u1 - u0) / n
        for i in range(n):
            a, b = u0 + i * step + 0.09, u0 + (i + 1) * step - 0.09
            out.append(wbox('lambri_painel', a, b, 0.2, 0.92, 0.02, 0.045, tex='nogueira_escura', bevel=0.015, seg=3))
        out.append(wbox('rodape', u0, u1, 0.0, 0.14, 0.02, 0.05, tex='nogueira_escura', bevel=0.006))
        out.append(wbox('guarnicao', u0, u1, 1.03, 1.1, 0.02, 0.07, tex='nogueira', bevel=0.012, seg=3))
        out.append(wbox('friso_latao', u0, u1, 1.112, 1.122, 0.05, 0.06, material=brass))
        out.append(wbox('sanca', u0, u1, H - 0.2, H, 0.0, 0.12, tex='nogueira_escura', bevel=0.03, seg=4))
        out.append(wbox('sanca_filete', u0, u1, H - 0.24, H - 0.2, 0.0, 0.05, material=brass_old))
        return out

    for k in ('fundo', 'esquerda', 'direita', 'frente'):
        parts += wall(k)
    export(parts, 'sala')


# ------------------------------------------------------------------ estante atrás do bartender
def build_backbar():
    p = []
    # armário baixo com portas (topo em y = 1.06: a primeira fileira de garrafas pousa nele)
    p.append(gbox('armario', 5.2, 1.0, 0.5, 0, 0.5, 1.25, tex='nogueira_escura', bevel=0.004))
    p.append(gbox('armario_tampo', 5.3, 0.06, 0.56, 0, 1.03, 1.24, tex='nogueira', bevel=0.012, seg=3))
    for i in range(6):
        x = -2.15 + i * 0.86
        p.append(gbox('porta_armario', 0.8, 0.78, 0.025, x, 0.5, 0.99, tex='nogueira_escura', bevel=0.01, seg=3))
        p.append(gbox('porta_almofada', 0.6, 0.58, 0.02, x, 0.5, 0.975, tex='nogueira_escura', bevel=0.02, seg=4))
        p.append(gtube('puxador', [(x + 0.3, 0.62, 0.955), (x + 0.3, 0.75, 0.955)], 0.007, brass))
    p.append(gbox('armario_rodape', 5.2, 0.1, 0.02, 0, 0.05, 0.985, material=brass_old))
    # espelhos entre colunas, com moldura
    for x0, x1 in ((-2.35, -0.85), (-0.8, 0.8), (0.85, 2.35)):
        w = x1 - x0
        p.append(gbox('espelho', w, 1.55, 0.01, (x0 + x1) / 2, 1.85, 1.6, material=mirror))
    for x in (-2.5, -0.825, 0.825, 2.5):
        p.append(gbox('coluna', 0.12, 1.75, 0.16, x, 1.93, 1.55, tex='nogueira_escura', bevel=0.012, seg=3))
        p.append(gbox('coluna_capitel', 0.18, 0.08, 0.2, x, 2.8, 1.54, tex='nogueira', bevel=0.015, seg=3))
    p.append(gbox('cornija', 5.4, 0.16, 0.3, 0, 2.92, 1.5, tex='nogueira', bevel=0.03, seg=4))
    p.append(gbox('cornija_filete', 5.3, 0.03, 0.02, 0, 2.86, 1.345, material=brass))
    # prateleiras (topo em 1.5 e 1.94) com grade de latão na frente
    for top in (1.5, 1.94):
        p.append(gbox('prateleira', 4.8, 0.04, 0.3, 0, top - 0.02, 1.43, tex='nogueira', bevel=0.006))
        p.append(gtube('grade', [(-2.4, top + 0.06, 1.29), (2.4, top + 0.06, 1.29)], 0.005, brass))
        for x in (-2.4, -1.2, 0, 1.2, 2.4):
            p.append(gtube('grade_pe', [(x, top, 1.29), (x, top + 0.06, 1.29)], 0.004, brass))
    p.append(gtube('grade_base', [(-2.55, 1.12, 1.0), (2.55, 1.12, 1.0)], 0.005, brass))
    export(p, 'estante')


# ------------------------------------------------------------------ banqueta (origem no chão, assento em 0.815)
def build_stool():
    p = []
    p.append(glathe('banqueta_assento', [(0, 0.0), (0.19, 0.0), (0.205, 0.015), (0.205, 0.04), (0.19, 0.055),
                                         (0.1, 0.062), (0, 0.063)], 0, 0.752, 0, tex='couro', seg=40))
    p.append(glathe('banqueta_aro', [(0.17, 0.0), (0.2, 0.0), (0.2, 0.012), (0.17, 0.012)], 0, 0.742, 0, brass))
    p.append(glathe('banqueta_coluna', [(0, 0.0), (0.24, 0.0), (0.24, 0.015), (0.2, 0.03), (0.06, 0.05),
                                        (0.032, 0.09), (0.028, 0.7), (0.05, 0.72), (0.12, 0.742), (0, 0.742)],
                    0, 0, 0, brass_old, seg=36))
    ring = [(0.165 * math.cos(a), 0.3, 0.165 * math.sin(a)) for a in [i / 32 * 2 * math.pi for i in range(33)]]
    p.append(gtube('banqueta_descanso', ring, 0.011, brass))
    for a in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        p.append(gtube('banqueta_raio', [(0.03 * math.cos(a), 0.3, 0.03 * math.sin(a)),
                                          (0.165 * math.cos(a), 0.3, 0.165 * math.sin(a))], 0.006, brass))
    export(p, 'banqueta')


# ------------------------------------------------------------------ mesa redonda com abajur
def build_table():
    p = []
    p.append(glathe('mesa_tampo', [(0, 0.0), (0.4, 0.0), (0.42, 0.01), (0.42, 0.035), (0.4, 0.04), (0, 0.04)],
                    0, 0.73, 0, tex='nogueira', seg=56))
    p.append(glathe('mesa_borda', [(0.418, 0.012), (0.425, 0.012), (0.425, 0.03), (0.418, 0.03)], 0, 0.73, 0, brass,
                    seg=56))
    p.append(glathe('mesa_pe', [(0, 0.0), (0.27, 0.0), (0.27, 0.02), (0.18, 0.05), (0.06, 0.1), (0.04, 0.2),
                                (0.035, 0.6), (0.05, 0.66), (0.12, 0.72), (0.12, 0.73), (0, 0.73)], 0, 0, 0, iron, seg=36))
    # abajur: base de latão e cúpula de tecido plissado
    p.append(glathe('abajur_base', [(0, 0), (0.045, 0), (0.045, 0.008), (0.02, 0.02), (0.008, 0.03), (0.007, 0.16),
                                    (0.012, 0.17), (0, 0.172)], 0, 0.77, 0, brass, seg=24))
    pleats = []
    for i in range(49):
        a = i / 48 * 2 * math.pi
        k = 1 + 0.06 * (i % 2)
        pleats.append(a)
    shade = lib.lathe('abajur_cupula', [(0.105, 0.0), (0.05, 0.09)], 48)
    for v in shade.data.vertices:
        ang = math.atan2(v.co.x, -v.co.y)
        k = 1 + 0.05 * math.cos(ang * 24)
        v.co.x *= k
        v.co.y *= k
    shade.location = game(0, 0.88, 0)
    p.append(put(shade, fabric_shade))
    p.append(glathe('abajur_lampada', [(0, 0), (0.018, 0.005), (0.02, 0.025), (0.01, 0.04), (0, 0.042)], 0, 0.9, 0,
                    bulb, seg=16))
    export(p, 'mesa')


# ------------------------------------------------------------------ cadeira de madeira curvada (olha para -Z)
def build_chair():
    p = []
    r = 0.012
    wood = T['nogueira'][0]
    p.append(glathe('cadeira_assento', [(0, 0), (0.2, 0), (0.205, 0.012), (0.2, 0.028), (0, 0.03)], 0, 0.445, 0,
                    tex='nogueira', seg=36))
    p.append(gtube('cadeira_aro_assento', [(0.19 * math.cos(a), 0.435, 0.19 * math.sin(a))
                                          for a in [i / 32 * 2 * math.pi for i in range(33)]], 0.013, wood))
    # pernas da frente, abertas
    for s in (-1, 1):
        p.append(gtube('cadeira_perna', [(s * 0.15, 0.44, -0.12), (s * 0.18, 0.2, -0.16), (s * 0.2, 0.0, -0.19)], r, wood))
    # pernas de trás que sobem e viram o encosto em arco
    back = [(-0.2, 0.0, 0.2), (-0.17, 0.2, 0.17), (-0.15, 0.44, 0.15), (-0.16, 0.62, 0.19), (-0.17, 0.8, 0.22)]
    arc = [(-0.17 * math.cos(t), 0.8 + 0.1 * math.sin(t), 0.22 + 0.02 * math.sin(t))
           for t in [i / 12 * math.pi for i in range(1, 12)]]
    right = [(-x, y, z) for x, y, z in reversed(back)]
    p.append(gtube('cadeira_encosto', back + arc + right, r, wood, sides=8))
    inner = [(-0.12 * math.cos(t), 0.62 + 0.12 * math.sin(t), 0.2) for t in [i / 16 * math.pi for i in range(17)]]
    p.append(gtube('cadeira_encosto_laco', inner, 0.009, wood, sides=8))
    p.append(gtube('cadeira_aro_pernas', [(0.175 * math.cos(a), 0.2, 0.175 * math.sin(a))
                                         for a in [i / 32 * 2 * math.pi for i in range(33)]], 0.008, wood))
    export(p, 'cadeira')


# ------------------------------------------------------------------ cabine de veludo (parede à esquerda, abre para +X)
def build_booth():
    p = []
    for dz in (-0.75, 0.75):
        s = 1 if dz > 0 else -1
        p.append(gbox('cabine_base', 0.9, 0.36, 0.5, 0, 0.18, dz, tex='nogueira_escura', bevel=0.006))
        p.append(gbox('cabine_assento', 0.86, 0.1, 0.48, 0.0, 0.41, dz, material=velvet_flat, bevel=0.035, seg=4))
        p.append(gbox('cabine_encosto', 0.88, 0.9, 0.12, 0, 0.9, dz + s * 0.3, tex='veludo_capitone', bevel=0.04, seg=4))
        p.append(gbox('cabine_moldura', 0.92, 1.32, 0.06, 0, 0.66, dz + s * 0.37, tex='nogueira_escura', bevel=0.008))
        p.append(gbox('cabine_topo', 0.96, 0.06, 0.12, 0, 1.35, dz + s * 0.35, tex='nogueira', bevel=0.02, seg=3))
        for y in (0.68, 1.0, 1.25):
            for x in (-0.3, -0.1, 0.1, 0.3):
                p.append(glathe('botao', [(0, 0), (0.009, 0.003), (0, 0.008)], x, y, dz + s * 0.235, brass_old, seg=8,
                                rot_x=-s * math.pi / 2))
    p.append(gbox('cabine_mesa', 0.8, 0.045, 0.72, 0.1, 0.74, 0, tex='nogueira', bevel=0.015, seg=3))
    p.append(gbox('cabine_mesa_borda', 0.81, 0.012, 0.73, 0.1, 0.725, 0, material=brass))
    p.append(glathe('cabine_mesa_pe', [(0, 0), (0.2, 0), (0.2, 0.02), (0.05, 0.08), (0.035, 0.66), (0.1, 0.72),
                                       (0, 0.72)], 0.1, 0, 0, iron, seg=28))
    # arandela de latão com tulipa âmbar na parede
    p.append(gbox('arandela_espelho', 0.02, 0.2, 0.12, -0.54, 1.85, 0, material=brass_old, bevel=0.01))
    p.append(gtube('arandela_braco', [(-0.53, 1.82, 0), (-0.45, 1.8, 0), (-0.4, 1.86, 0)], 0.008, brass))
    p.append(glathe('arandela_tulipa', [(0.015, 0.0), (0.03, -0.02), (0.06, -0.08), (0.07, -0.12), (0.065, -0.125)],
                    -0.4, 1.86, 0, glass_tulip, seg=32, rot_x=math.pi))
    p.append(glathe('arandela_lampada', [(0, 0), (0.016, 0.01), (0.012, 0.035), (0, 0.04)], -0.4, 1.875, 0, bulb,
                    seg=16))
    export(p, 'cabine')


# ------------------------------------------------------------------ piano de cauda + banco (referencial do grupo `piano`)
def build_piano():
    p = []
    s = [(-0.75, 0), (0.75, 0), (0.75, -0.55)]

    def bez(p0, p1, p2, p3, n=12):
        return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
                      for a, b, c, d in zip(p0, p1, p2, p3)) for t in [i / n for i in range(1, n + 1)]]
    s += bez((0.75, -0.55), (0.75, -1.2), (0.3, -1.25), (0.15, -1.55))
    s += bez((0.15, -1.55), (0.0, -1.85), (-0.2, -1.9), (-0.45, -1.9))
    s += bez((-0.45, -1.9), (-0.75, -1.9), (-0.75, -1.6), (-0.75, -1.3))
    import bmesh

    def slab(name, outline, y0, y1, material, z0=-0.05):
        bm = bmesh.new()
        bot = [bm.verts.new(game(x, y0, z + z0)) for x, z in outline]
        top = [bm.verts.new(game(x, y1, z + z0)) for x, z in outline]
        bm.faces.new(list(reversed(bot)))
        bm.faces.new(top)
        for i in range(len(outline)):
            j = (i + 1) % len(outline)
            bm.faces.new((bot[i], bot[j], top[j], top[i]))
        bm.normal_update()
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        o = bpy.data.objects.new(name, mesh)
        mod = o.modifiers.new('chanfro', 'BEVEL')
        mod.width = 0.012
        mod.segments = 3
        mod.limit_method = 'ANGLE'
        return put(o, material)

    p.append(slab('piano_corpo', s, 0.7, 1.0, lacquer))
    p.append(slab('piano_friso', s, 0.995, 1.005, brass_old))
    # tampa aberta (dobradiça na borda x = -0.75), com escora
    lid = slab('piano_tampa', s, 0.0, 0.015, lacquer)
    for v in lid.data.vertices:
        v.co.x += 0.75
    lid.location = game(-0.75, 1.0, 0)
    lid.rotation_euler.y = -0.5
    p.append(lid)
    p.append(gtube('piano_escora', [(-0.35, 1.0, -0.95), (-0.42, 1.48, -0.95)], 0.008, brass))
    # teclado
    p.append(gbox('piano_teclado_base', 1.5, 0.08, 0.24, 0, 0.72, 0.08, lacquer, bevel=0.01))
    keys = 52
    w = 1.36 / keys
    for i in range(keys):
        x = -0.68 + (i + 0.5) * w
        p.append(gbox('tecla', w * 0.94, 0.02, 0.15, x, 0.77, 0.12, ivory, bevel=0.002))
        if i % 7 in (0, 1, 3, 4, 5) and i < keys - 1:
            p.append(gbox('tecla_preta', w * 0.55, 0.022, 0.09, x + w / 2, 0.79, 0.09, ebony, bevel=0.002))
    p.append(gbox('piano_tampa_teclas', 1.5, 0.06, 0.06, 0, 0.83, 0.0, lacquer, bevel=0.012))
    p.append(gbox('piano_estante', 0.7, 0.28, 0.015, 0, 1.12, -0.12, lacquer, bevel=0.004))
    for x, z in ((-0.62, -0.1), (0.62, -0.1), (-0.4, -1.65)):
        p.append(glathe('piano_perna', [(0, 0), (0.035, 0), (0.035, 0.03), (0.05, 0.05), (0.04, 0.2), (0.055, 0.45),
                                        (0.075, 0.6), (0.08, 0.7), (0, 0.7)], x, 0, z, lacquer, seg=20))
        p.append(glathe('piano_rodizio', [(0, 0), (0.04, 0.0), (0.04, 0.025), (0, 0.025)], x, 0, z, brass, seg=16))
    p.append(gbox('piano_lira', 0.18, 0.6, 0.03, 0, 0.35, -0.25, lacquer, bevel=0.01))
    for x in (-0.05, 0, 0.05):
        p.append(gbox('pedal', 0.03, 0.012, 0.09, x, 0.06, -0.21, brass, bevel=0.003))
    # banco com assento de couro capitonê
    p.append(gbox('banco_assento', 0.78, 0.07, 0.38, 0, 0.5, 0.62, tex='couro', bevel=0.025, seg=3))
    p.append(gbox('banco_moldura', 0.8, 0.05, 0.4, 0, 0.45, 0.62, lacquer, bevel=0.008))
    for x, z in ((-0.34, 0.47), (0.34, 0.47), (-0.34, 0.77), (0.34, 0.77)):
        p.append(glathe('banco_perna', [(0, 0), (0.025, 0), (0.02, 0.2), (0.028, 0.42), (0, 0.42)], x, 0, z, lacquer,
                        seg=12))
    export(p, 'piano')


# ------------------------------------------------------------------ porta dos fundos (referencial do grupo `doorG`)
def build_door():
    p = []
    for x in (-0.56, 0.56):
        p.append(gbox('porta_batente', 0.12, 2.34, 0.16, x, 1.17, 0.05, tex='nogueira_escura', bevel=0.012, seg=3))
        p.append(gbox('porta_guarnicao', 0.06, 2.4, 0.04, x + (0.07 if x > 0 else -0.07), 1.2, 0.12,
                      tex='nogueira', bevel=0.01, seg=3))
    p.append(gbox('porta_verga', 1.28, 0.14, 0.16, 0, 2.33, 0.05, tex='nogueira_escura', bevel=0.012, seg=3))
    p.append(gbox('porta_frontao', 1.4, 0.1, 0.08, 0, 2.45, 0.1, tex='nogueira', bevel=0.02, seg=3))
    frame = lib.join(p, 'porta_moldura')
    # folha: origem na dobradiça (x = 0), largura 0.98
    leaf = []
    leaf.append(gbox('folha', 0.98, 2.16, 0.05, 0.49, 1.08, 0, tex='nogueira_escura', bevel=0.004))
    for y in (0.55, 1.55):
        for side in (-1, 1):
            leaf.append(gbox('folha_almofada', 0.7, 0.75 if y < 1 else 0.85, 0.02, 0.49, y, side * 0.03,
                             tex='nogueira_escura', bevel=0.02, seg=4))
    for side in (-1, 1):
        leaf.append(glathe('macaneta', [(0, 0), (0.03, 0.0), (0.028, 0.01), (0.008, 0.02), (0.008, 0.045),
                                       (0.022, 0.05), (0.024, 0.065), (0.015, 0.075), (0, 0.076)],
                           0.88, 1.05, side * 0.025, brass, seg=20, rot_x=side * math.pi / 2))
        leaf.append(gbox('chapa_chute', 0.8, 0.18, 0.004, 0.49, 0.12, side * 0.027, brass_old))
    door = lib.join(leaf, 'porta_folha')
    export([frame, door], 'porta')


# ------------------------------------------------------------------ janela com cortinas (referencial do grupo da janela)
def build_window():
    p = []
    p.append(gbox('janela_vidro', 1.1, 1.9, 0.01, 0, 1.85, -0.01, glass_window))
    for x in (-0.6, 0.6):
        p.append(gbox('janela_batente', 0.1, 2.06, 0.12, x, 1.85, 0.03, tex='nogueira_escura', bevel=0.01, seg=3))
    for y in (0.85, 2.85):
        p.append(gbox('janela_travessa', 1.3, 0.1, 0.12, 0, y, 0.03, tex='nogueira_escura', bevel=0.01, seg=3))
    for y in (1.48, 2.17):
        p.append(gbox('janela_pinazio', 1.1, 0.03, 0.04, 0, y, 0.0, tex='nogueira_escura'))
    p.append(gbox('janela_pinazio_v', 0.03, 1.9, 0.04, 0, 1.85, 0.0, tex='nogueira_escura'))
    p.append(gbox('janela_peitoril', 1.42, 0.05, 0.2, 0, 0.8, 0.08, tex='nogueira', bevel=0.015, seg=3))
    p.append(gtube('cortina_varao', [(-1.05, 3.05, 0.12), (1.05, 3.05, 0.12)], 0.014, brass))
    for x in (-1.05, 1.05):
        p.append(glathe('varao_ponteira', [(0, 0), (0.025, 0.01), (0.03, 0.03), (0, 0.05)], x, 3.05, 0.12, brass,
                        seg=12, rot_x=0))
    for side in (-1, 1):
        def wave(u, v, s=side):
            return 0.035 * math.sin(u * math.pi * 9) * (0.6 + 0.4 * v)
        c = lib.grid('cortina', 0.5, 2.25, 36, 6, wave)
        c.location = game(side * 0.82, 0.78, 0.16)
        p.append(put(c, velvet_flat))
    export(p, 'janela')


# ------------------------------------------------------------------ relógio de parede (de frente para +Z do jogo)
def build_clock():
    p = []
    case = lib.lathe('relogio_caixa', [(0, -0.04), (0.29, -0.04), (0.3, -0.02), (0.3, 0.01), (0.27, 0.035),
                                       (0.25, 0.035), (0.25, 0.02), (0, 0.02)], 64)
    case.rotation_euler.x = math.pi / 2
    p.append(put(case, None, 'nogueira'))
    bezel = lib.lathe('relogio_aro', [(0.24, 0.02), (0.255, 0.02), (0.255, 0.04), (0.24, 0.042)], 64)
    bezel.rotation_euler.x = math.pi / 2
    p.append(put(bezel, brass))
    face = lib.lathe('relogio_mostrador', [(0, 0.021), (0.24, 0.021)], 64)
    # UV planar para a imagem do mostrador
    for poly in face.data.polygons:
        for li in poly.loop_indices:
            v = face.data.vertices[face.data.loops[li].vertex_index].co
            face.data.uv_layers.active.data[li].uv = (0.5 + v.x * 0.49 / 0.24, 0.5 + v.y * 0.49 / 0.24)
    face.rotation_euler.x = math.pi / 2
    p.append(put(face, dial))
    export(p, 'relogio')


for step in (build_room, build_backbar, build_stool, build_table, build_chair, build_booth, build_piano, build_door,
             build_window, build_clock):
    print('CONSTRUINDO', step.__name__)
    step()
print('PRONTO')
