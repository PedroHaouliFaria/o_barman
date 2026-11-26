"""Gera por código os assets do enquadramento do bartender.

Uso (no Windows):
  blender -b -P art/blender/build_balcao.py -- <pasta_saida>

Saída: luminaria.glb, balcao.glb, copos.glb, garrafas.glb (+ texturas assadas e rótulos em PNG).
Nada é baixado: madeira, couro e rótulos nascem de nós procedurais e texto.
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

# ------------------------------------------------------------------ materiais base
brass = lib.principled('latao', (0.62, 0.43, 0.20), roughness=0.28, metallic=1.0)
brass_dark = lib.principled('latao_velho', (0.40, 0.27, 0.12), roughness=0.42, metallic=1.0)
copper = lib.principled('cobre', (0.75, 0.36, 0.22), roughness=0.3, metallic=1.0)
fabric = lib.principled('tecido_cabo', (0.025, 0.02, 0.018), roughness=0.9)
glass_cup = lib.principled('vidro_copo', (0.92, 0.96, 0.95), roughness=0.04, transmission=1.0, ior=1.5)
glass_amber = lib.principled('vidro_ambar', (0.95, 0.55, 0.18), roughness=0.12, transmission=0.85, ior=1.5)
glass_bulb = lib.principled('vidro_lampada', (1.0, 0.92, 0.8), roughness=0.02, transmission=1.0, ior=1.5)
filament = lib.principled('filamento', (1, 0.6, 0.25), emission=(1.0, 0.55, 0.2), strength=40)
cork = lib.principled('rolha', (0.42, 0.3, 0.18), roughness=0.85)
cap_metal = lib.principled('tampa_metal', (0.55, 0.5, 0.42), roughness=0.35, metallic=1.0)
cap_wax = lib.principled('lacre', (0.38, 0.04, 0.03), roughness=0.5)

print('ASSANDO madeira...')
wood_top_imgs = lib.bake_tile('nogueira_tampo', materials.walnut('proc_tampo'), 2048, TEX)
wood_body_imgs = lib.bake_tile('nogueira_corpo', materials.walnut('proc_corpo', light=(0.12, 0.055, 0.026),
                                                                    dark=(0.03, 0.012, 0.006), gloss=0.38,
                                                                    plank_width=0.11, plank_length=0.55), 1024, TEX)
leather_imgs = lib.bake_tile('couro', materials.leather('proc_couro'), 1024, TEX, tile=0.6)
mat_imgs = lib.bake_tile('borracha', materials.rubber_mat('proc_borracha'), 512, TEX, tile=0.6)
wood_top = lib.textured('madeira_tampo', wood_top_imgs['cor'], wood_top_imgs['rug'], wood_top_imgs['normal'])
wood_body = lib.textured('madeira_corpo', wood_body_imgs['cor'], wood_body_imgs['rug'], wood_body_imgs['normal'])
leather_mat = lib.textured('couro', leather_imgs['cor'], leather_imgs['rug'], leather_imgs['normal'])
rubber = lib.textured('borracha', mat_imgs['cor'], mat_imgs['rug'], mat_imgs['normal'])


def done(obj, material=None, tile=None):
    if material:
        lib.assign(obj, material)
    obj = lib.to_mesh(obj) if obj.modifiers or obj.type == 'CURVE' else lib.link(obj)
    if material and not obj.data.materials:
        obj.data.materials.append(material)
    if tile:
        lib.box_uv(obj, tile)
    return obj


# ------------------------------------------------------------------ luminária (herói do enquadramento)
def build_pendant():
    parts = []
    # origem = topo do soquete; o cabo sobe 1 m até a canopla
    parts.append(done(lib.tube_along('lum_cabo', [(0, 0, 0.06), (0, 0, 2.0)], 0.0035), fabric))
    canopy = lib.lathe('lum_canopla', [(0.0, 2.0), (0.055, 2.0), (0.058, 1.995), (0.05, 1.975), (0.012, 1.965),
                                       (0.006, 1.96)], 40)
    parts.append(done(canopy, brass))
    socket = lib.lathe('lum_soquete', [(0.0, 0.07), (0.012, 0.07), (0.016, 0.06), (0.016, 0.052), (0.019, 0.05),
                                       (0.019, 0.044), (0.016, 0.042), (0.016, 0.012), (0.021, 0.008),
                                       (0.021, 0.0), (0.0, 0.0)], 32)
    parts.append(done(socket, brass_dark))
    # cúpula de vidro âmbar em sino (casca com espessura)
    outer = [(0.024, 0.012), (0.04, 0.008), (0.075, -0.015), (0.12, -0.06), (0.16, -0.11), (0.185, -0.15),
             (0.19, -0.16)]
    inner = [(r - 0.003, h - 0.002) for r, h in reversed(outer)]
    shade = lib.lathe('lum_cupula', outer + [(0.187, -0.162)] + inner, 64)
    parts.append(done(shade, glass_amber))
    rim = lib.lathe('lum_aro', [(0.186, -0.155), (0.194, -0.155), (0.196, -0.163), (0.19, -0.168),
                                (0.185, -0.163)], 64)
    parts.append(done(rim, brass))
    collar = lib.lathe('lum_colar', [(0.021, 0.016), (0.03, 0.014), (0.032, 0.004), (0.022, 0.0)], 32)
    parts.append(done(collar, brass))
    # lâmpada de filamento (ST64)
    bulb_profile = [(0.0, -0.002), (0.012, -0.002), (0.013, -0.02), (0.022, -0.04), (0.031, -0.075),
                    (0.032, -0.095), (0.028, -0.12), (0.018, -0.138), (0.006, -0.146), (0.0, -0.147)]
    parts.append(done(lib.lathe('lum_lampada', bulb_profile, 40), glass_bulb))
    # filamento em espiral de laços, preso por hastes
    pts = []
    for i in range(41):
        t = i / 40
        a = t * math.pi * 2
        pts.append((0.016 * math.cos(a), 0.016 * math.sin(a), -0.085 + 0.012 * math.sin(a * 4)))
    parts.append(done(lib.tube_along('lum_filamento', pts, 0.0007, 6), filament))
    for a in (0.0, math.pi * 2 / 3, math.pi * 4 / 3):
        parts.append(done(lib.tube_along('lum_haste', [(0, 0, -0.02), (0.016 * math.cos(a), 0.016 * math.sin(a), -0.085)],
                                         0.0004, 4), lib.principled('haste', (0.3, 0.3, 0.3), metallic=1)))
    lib.export(parts, os.path.join(OUT, 'luminaria.glb'))
    return parts


# ------------------------------------------------------------------ balcão
def build_counter():
    parts = []
    # tampo (Three: centro (0, 1.055, -0.88), 7.0 x 0.07 x 0.8)
    top = lib.box('balcao_tampo', (7.0, 0.8, 0.07), game(0, 1.055, -0.88), bevel=0.01, segments=3)
    parts.append(done(top, wood_top, tile=1.6))
    # apoio de braço em couro na borda do cliente, com costura de latão
    arm = lib.tube_along('balcao_apoio', [(-3.48, *game(0, 1.1, -1.255)[1:]), (3.48, *game(0, 1.1, -1.255)[1:])],
                         0.038, 16)
    parts.append(done(arm, leather_mat, tile=0.6))
    for z in (-1.215,):
        parts.append(done(lib.box('balcao_friso', (7.0, 0.008, 0.012), game(0, 1.075, z)), brass))
    # corpo frontal com almofadas de madeira
    body = lib.box('balcao_corpo', (6.8, 0.62, 1.0), game(0, 0.52, -0.9), bevel=0.004)
    parts.append(done(body, wood_body, tile=0.55))
    for i in range(8):
        x = -2.975 + i * 0.85
        frame = lib.box(f'balcao_moldura{i}', (0.72, 0.03, 0.62), game(x, 0.58, -1.222), bevel=0.012, segments=3)
        parts.append(done(frame, wood_body, tile=0.55))
        panel = lib.box(f'balcao_almofada{i}', (0.58, 0.03, 0.48), game(x, 0.58, -1.236), bevel=0.02, segments=4)
        parts.append(done(panel, wood_body, tile=0.55))
    parts.append(done(lib.box('balcao_rodape', (6.8, 0.015, 0.14), game(0, 0.07, -1.215), bevel=0.003), brass_dark))
    parts.append(done(lib.box('balcao_cornija', (6.86, 0.06, 0.05), game(0, 0.995, -1.21), bevel=0.012, segments=3),
                      wood_body, tile=0.55))
    # trilho de pé em latão com suportes
    rail_y, rail_z = 0.22, -1.34
    parts.append(done(lib.tube_along('balcao_trilho', [(-3.3, -rail_z, rail_y), (3.3, -rail_z, rail_y)], 0.024, 16),
                      brass))
    for i in range(7):
        x = -3.0 + i * 1.0
        bracket = lib.tube_along(f'balcao_suporte{i}', [(x, -rail_z, rail_y), (x, -(rail_z + 0.06), rail_y + 0.05),
                                                       (x, -(-1.215), rail_y + 0.07)], 0.009, 8)
        parts.append(done(bracket, brass))
    # abas laterais do posto do bartender
    for x in (-0.97, 0.97):
        parts.append(done(lib.box(f'aba_corpo{x}', (0.52, 0.77, 1.0), game(x, 0.5, -0.2), bevel=0.004), wood_body,
                          tile=0.55))
        parts.append(done(lib.box(f'aba_tampo{x}', (0.58, 0.8, 0.07), game(x, 1.055, -0.2), bevel=0.01, segments=3),
                          wood_top, tile=1.6))
    # tapete de borracha da bancada de trabalho
    parts.append(done(lib.box('balcao_tapete', (0.62, 0.26, 0.01), game(-0.02, 1.095, -0.72), bevel=0.004), rubber,
                      tile=0.6))
    lib.export(parts, os.path.join(OUT, 'balcao.glb'))
    return parts


# ------------------------------------------------------------------ copos
def build_glasses():
    parts = []
    profiles = {
        'copo_highball': [(0, 0), (0.033, 0), (0.035, 0.004), (0.037, 0.15), (0.034, 0.15), (0.0325, 0.013), (0, 0.013)],
        'copo_rocks': [(0, 0), (0.042, 0), (0.045, 0.004), (0.047, 0.094), (0.0435, 0.094), (0.041, 0.024),
                       (0, 0.024)],
        'copo_coupe': [(0, 0), (0.038, 0), (0.04, 0.003), (0.008, 0.008), (0.0045, 0.03), (0.0045, 0.09),
                       (0.012, 0.1), (0.045, 0.112), (0.061, 0.135), (0.0635, 0.142), (0.0605, 0.142),
                       (0.0585, 0.136), (0.044, 0.116), (0.01, 0.104), (0, 0.103)],
    }
    for i, (name, prof) in enumerate(profiles.items()):
        o = lib.lathe(name, prof, 48)
        o.location = (i * 0.16, 0, 0)
        parts.append(done(o, glass_cup))
    mug = lib.lathe('copo_caneca', [(0, 0), (0.039, 0), (0.041, 0.003), (0.045, 0.1), (0.0475, 0.104),
                                    (0.0455, 0.106), (0.042, 0.1), (0.038, 0.006), (0, 0.006)], 48)
    mug.location = (3 * 0.16, 0, 0)
    mug = done(mug, copper)
    handle = lib.tube_along('copo_caneca_alca', [(3 * 0.16 + 0.044, 0, 0.085), (3 * 0.16 + 0.075, 0, 0.08),
                                                 (3 * 0.16 + 0.08, 0, 0.05), (3 * 0.16 + 0.07, 0, 0.022),
                                                 (3 * 0.16 + 0.042, 0, 0.02)], 0.006, 10)
    handle = done(handle, copper)
    bpy.ops.object.select_all(action='DESELECT')
    mug.select_set(True)
    handle.select_set(True)
    bpy.context.view_layer.objects.active = mug
    bpy.ops.object.join()
    parts.append(mug)
    lib.export(parts, os.path.join(OUT, 'copos.glb'))
    return parts


# ------------------------------------------------------------------ garrafas (as 19 bebidas do jogo)
def profile(kind):
    """Perfis (raio, altura) em metros."""
    if kind == 'classica':
        return [(0, 0), (0.038, 0), (0.041, 0.006), (0.041, 0.19), (0.036, 0.22), (0.024, 0.245), (0.014, 0.262),
                (0.0125, 0.3), (0.015, 0.302), (0.015, 0.312), (0.012, 0.314)]
    if kind == 'alta':
        return [(0, 0), (0.033, 0), (0.036, 0.006), (0.036, 0.235), (0.03, 0.258), (0.016, 0.275), (0.012, 0.285),
                (0.011, 0.325), (0.0135, 0.327), (0.0135, 0.336), (0.011, 0.338)]
    if kind == 'baixa':
        return [(0, 0), (0.046, 0), (0.05, 0.008), (0.05, 0.13), (0.042, 0.155), (0.02, 0.18), (0.014, 0.19),
                (0.013, 0.225), (0.016, 0.227), (0.016, 0.236), (0.013, 0.238)]
    if kind == 'redonda':
        return [(0, 0), (0.03, 0), (0.05, 0.03), (0.056, 0.075), (0.05, 0.125), (0.032, 0.155), (0.015, 0.17),
                (0.013, 0.215), (0.016, 0.217), (0.016, 0.225), (0.013, 0.227)]
    if kind == 'refri':
        return [(0, 0), (0.028, 0), (0.03, 0.005), (0.03, 0.06), (0.026, 0.08), (0.03, 0.1), (0.027, 0.13),
                (0.016, 0.165), (0.011, 0.185), (0.012, 0.19), (0.0115, 0.195)]
    if kind == 'jarra':
        return [(0, 0), (0.04, 0), (0.043, 0.006), (0.043, 0.15), (0.034, 0.17), (0.019, 0.185), (0.017, 0.205),
                (0.02, 0.21), (0.018, 0.212)]
    raise ValueError(kind)


BOTTLES = [
    # id do jogo, formato, cor do vidro, cor do líquido, nível, tampa, rótulo [(texto, tamanho, estilo)], cores do rótulo
    ('rum', 'baixa', (0.35, 0.2, 0.1), (0.45, 0.16, 0.04), 0.7, 'rolha',
     [('PORTO ESCURO', 0.011, 'display'), ('---', 0.004, ''), ('rum envelhecido', 0.006, 'italic'), ('1931', 0.005, 'serif')],
     ((0.85, 0.78, 0.6), (0.1, 0.06, 0.04), (0.5, 0.1, 0.05))),
    ('cachaca', 'alta', (0.85, 0.92, 0.88), (0.9, 0.85, 0.6), 0.8, 'tampa',
     [('ENGENHO', 0.009, 'display'), ('FUNDO', 0.011, 'bold'), ('---', 0.004, ''), ('cachaça de alambique', 0.005, 'italic')],
     ((0.9, 0.88, 0.8), (0.15, 0.25, 0.12), (0.6, 0.45, 0.1))),
    ('whisky', 'classica', (0.75, 0.6, 0.4), (0.6, 0.3, 0.08), 0.65, 'rolha',
     [('CARVALHO', 0.01, 'display'), ('NEGRO', 0.012, 'bold'), ('---', 0.004, ''), ('whisky · 12 anos', 0.0055, 'italic')],
     ((0.12, 0.1, 0.08), (0.85, 0.7, 0.4), (0.85, 0.7, 0.4))),
    ('tequila', 'redonda', (0.9, 0.95, 0.92), (0.85, 0.7, 0.4), 0.75, 'rolha',
     [('SOL DE', 0.009, 'serif'), ('PEDRA', 0.012, 'display'), ('---', 0.004, ''), ('tequila reposado', 0.0055, 'italic')],
     ((0.9, 0.82, 0.62), (0.4, 0.12, 0.05), (0.2, 0.35, 0.3))),
    ('gin', 'alta', (0.75, 0.9, 0.85), (0.92, 0.95, 0.93), 0.85, 'tampa',
     [('JARDIM', 0.01, 'display'), ('PÁLIDO', 0.011, 'bold'), ('---', 0.004, ''), ('gin seco', 0.006, 'italic')],
     ((0.88, 0.9, 0.84), (0.1, 0.25, 0.2), (0.45, 0.6, 0.4))),
    ('vodka', 'alta', (0.92, 0.95, 0.97), (0.95, 0.97, 0.98), 0.9, 'tampa',
     [('NEVE', 0.012, 'display'), ('FUNDA', 0.011, 'bold'), ('---', 0.004, ''), ('vodka', 0.006, 'italic')],
     ((0.92, 0.93, 0.95), (0.08, 0.1, 0.2), (0.6, 0.1, 0.1))),
    ('orange_liqueur', 'redonda', (0.6, 0.35, 0.12), (0.8, 0.4, 0.08), 0.6, 'lacre',
     [('ÂMBAR', 0.011, 'display'), ('de Sevilha', 0.007, 'italic'), ('---', 0.004, ''), ('licor de laranja', 0.0055, 'serif')],
     ((0.95, 0.85, 0.6), (0.4, 0.15, 0.05), (0.75, 0.4, 0.1))),
    ('campari', 'classica', (0.9, 0.85, 0.85), (0.6, 0.03, 0.05), 0.7, 'tampa',
     [('RUBRO', 0.013, 'display'), ('---', 0.004, ''), ('bitter aperitivo', 0.006, 'italic'), ('Milão · 1904', 0.005, 'serif')],
     ((0.9, 0.85, 0.75), (0.55, 0.05, 0.05), (0.15, 0.1, 0.08))),
    ('sweet_vermouth', 'classica', (0.3, 0.2, 0.15), (0.35, 0.06, 0.05), 0.6, 'tampa',
     [('VERMUTE', 0.009, 'serif'), ('NOTURNO', 0.011, 'display'), ('---', 0.004, ''), ('tinto', 0.006, 'italic')],
     ((0.5, 0.08, 0.08), (0.92, 0.85, 0.7), (0.92, 0.85, 0.7))),
    ('dry_vermouth', 'classica', (0.75, 0.8, 0.6), (0.85, 0.85, 0.6), 0.7, 'tampa',
     [('VERMUTE', 0.009, 'serif'), ('BRANCO', 0.011, 'display'), ('---', 0.004, ''), ('seco', 0.006, 'italic')],
     ((0.85, 0.88, 0.75), (0.15, 0.25, 0.15), (0.6, 0.5, 0.2))),
    ('cola', 'refri', (0.4, 0.55, 0.45), (0.12, 0.04, 0.02), 0.85, 'tampa',
     [('COLA', 0.012, 'display'), ('NEGRA', 0.009, 'bold')], ((0.6, 0.06, 0.05), (0.95, 0.9, 0.8), (0.95, 0.9, 0.8))),
    ('soda_water', 'refri', (0.6, 0.8, 0.75), (0.9, 0.95, 0.95), 0.85, 'tampa',
     [('ÁGUA', 0.01, 'display'), ('com gás', 0.008, 'italic')], ((0.85, 0.92, 0.95), (0.1, 0.2, 0.35), (0.1, 0.2, 0.35))),
    ('ginger_beer', 'refri', (0.5, 0.35, 0.15), (0.8, 0.6, 0.3), 0.85, 'tampa',
     [('GENGIBRE', 0.009, 'display'), ('cerveja', 0.007, 'italic')], ((0.95, 0.85, 0.55), (0.3, 0.15, 0.05), (0.3, 0.15, 0.05))),
    ('lemon_juice', 'jarra', (0.92, 0.95, 0.92), (0.95, 0.9, 0.5), 0.7, 'rolha',
     [('LIMÃO', 0.011, 'display'), ('suco', 0.007, 'italic')], ((0.95, 0.93, 0.75), (0.25, 0.35, 0.1), (0.25, 0.35, 0.1))),
    ('sugar_syrup', 'jarra', (0.92, 0.95, 0.92), (0.95, 0.9, 0.75), 0.6, 'rolha',
     [('XAROPE', 0.01, 'display'), ('de açúcar', 0.007, 'italic')], ((0.95, 0.92, 0.85), (0.35, 0.2, 0.1), (0.35, 0.2, 0.1))),
]


def build_bottles():
    out = []
    for i, (gid, kind, tint, liquid, level, closure, text, (paper, ink, accent)) in enumerate(BOTTLES):
        prof = profile(kind)
        x = (i % 8) * 0.16
        y = (i // 8) * 0.2
        bits = []
        glass = lib.principled(f'vidro_garrafa_{gid}', tint, roughness=0.06, transmission=1.0, ior=1.5)
        g = lib.lathe(f'g_{gid}', prof, 40)
        bits.append(done(g, glass))
        # líquido: mesmo perfil um pouco menor até o nível
        top = max(h for _, h in prof)
        fill = []
        for r, h in prof:
            if h > top * level:
                break
            fill.append((max(0, r * 0.93 - 0.001), h + 0.003))
        fill.append((fill[-1][0], top * level))
        fill.append((0, top * level))
        liq = lib.lathe(f'l_{gid}', fill, 32, cap_bottom=False)
        bits.append(done(liq, lib.principled(f'liquido_{gid}', liquid, roughness=0.1, transmission=0.6, ior=1.34)))
        # rótulo: faixa na frente acompanhando o corpo
        body_r = max(r for r, h in prof if h < top * 0.6)
        h0, h1 = (0.04, 0.14) if kind != 'refri' else (0.07, 0.115)
        if kind == 'alta':
            h0, h1 = 0.06, 0.17
        if kind == 'redonda':
            h0, h1 = 0.04, 0.11
        band = lib.lathe(f'r_{gid}', [(body_r + 0.0008, h0), (body_r + 0.0008, h1)], 24,
                         arc=(math.pi - 0.95, math.pi + 0.95))
        img = labels.render_label(gid, text, paper, ink, accent, outdir=TEX)
        label_mat = lib.textured(f'rotulo_{gid}', img)
        bits.append(done(band, label_mat))
        # tampa
        lip = prof[-1][1]
        neck = prof[-3][0]
        if closure == 'rolha':
            c = lib.lathe(f'c_{gid}', [(0, lip + 0.022), (neck * 1.35, lip + 0.022), (neck * 1.35, lip + 0.006),
                                       (neck * 0.9, lip + 0.004), (neck * 0.9, lip - 0.01), (0, lip - 0.01)], 24)
            bits.append(done(c, cork))
        elif closure == 'lacre':
            c = lib.lathe(f'c_{gid}', [(0, lip + 0.012), (neck * 1.25, lip + 0.012), (neck * 1.35, lip - 0.02),
                                       (neck * 1.1, lip - 0.024), (0, lip - 0.024)], 24)
            bits.append(done(c, cap_wax))
        else:
            c = lib.lathe(f'c_{gid}', [(0, lip + 0.016), (neck * 1.25, lip + 0.016), (neck * 1.28, lip - 0.004),
                                       (0, lip - 0.004)], 24)
            bits.append(done(c, cap_metal))
        bpy.ops.object.select_all(action='DESELECT')
        for b in bits:
            b.select_set(True)
        bpy.context.view_layer.objects.active = bits[0]
        bpy.ops.object.join()
        joined = bpy.context.active_object
        joined.name = joined.data.name = f'garrafa_{gid}'
        joined.location = (x, y, 0)
        out.append(joined)
    lib.export(out, os.path.join(OUT, 'garrafas.glb'))
    return out


def clear_scene_objects():
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)


for step in (build_pendant, build_counter, build_glasses, build_bottles):
    print('CONSTRUINDO', step.__name__)
    step()
    clear_scene_objects()
print('PRONTO')
