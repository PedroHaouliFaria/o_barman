"""Materiais procedurais (nós do Blender) que viram texturas assadas."""
import bpy


def _rgba(node, name, output=False):
    """Soquete de cor do nó Mix (há soquetes homônimos para float/vetor/cor)."""
    sockets = node.outputs if output else node.inputs
    return next(x for x in sockets if x.name == name and x.type == 'RGBA')


def _nodes(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes, nt.links, nt.nodes.get('Principled BSDF')


def walnut(name, light=(0.20, 0.095, 0.045), dark=(0.055, 0.022, 0.010), plank_width=0.16, plank_length=0.8,
           gloss=0.28, wear=0.18):
    """Nogueira envernizada em tábuas. Coordenadas em metros (objeto)."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    # tábuas: textura de tijolo vira divisão de tábuas com tom próprio
    brick = n.new('ShaderNodeTexBrick')
    brick.offset = 0.5
    brick.squash = 1.0
    brick.inputs['Scale'].default_value = 1.0
    brick.inputs['Brick Width'].default_value = plank_length
    brick.inputs['Row Height'].default_value = plank_width
    brick.inputs['Mortar Size'].default_value = 0.0022
    brick.inputs['Mortar Smooth'].default_value = 0.4
    brick.inputs['Bias'].default_value = 0.0
    brick.inputs['Color1'].default_value = (*light, 1)
    brick.inputs['Color2'].default_value = tuple(c * 0.72 for c in light) + (1,)
    brick.inputs['Mortar'].default_value = (*dark, 1)
    l.new(coord.outputs['Object'], brick.inputs['Vector'])
    # veio: bandas distorcidas correndo ao longo de X
    wave = n.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'Y'
    wave.inputs['Scale'].default_value = 7.0
    wave.inputs['Distortion'].default_value = 9.0
    wave.inputs['Detail'].default_value = 4.0
    wave.inputs['Detail Scale'].default_value = 1.6
    stretch = n.new('ShaderNodeMapping')
    stretch.inputs['Scale'].default_value = (0.35, 3.0, 1.0)
    l.new(coord.outputs['Object'], stretch.inputs['Vector'])
    l.new(stretch.outputs['Vector'], wave.inputs['Vector'])
    grain = n.new('ShaderNodeValToRGB')
    grain.color_ramp.elements[0].position = 0.25
    grain.color_ramp.elements[0].color = (0.35, 0.35, 0.35, 1)
    grain.color_ramp.elements[1].position = 0.85
    grain.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(wave.outputs['Fac'], grain.inputs['Fac'])
    pores = n.new('ShaderNodeTexNoise')
    pores.inputs['Scale'].default_value = 90.0
    pores.inputs['Detail'].default_value = 6.0
    l.new(coord.outputs['Object'], pores.inputs['Vector'])
    mul = n.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    l.new(brick.outputs['Color'], _rgba(mul, 'A'))
    l.new(grain.outputs['Color'], _rgba(mul, 'B'))
    pore_mix = n.new('ShaderNodeMix')
    pore_mix.data_type = 'RGBA'
    pore_mix.blend_type = 'MULTIPLY'
    pore_mix.inputs['Factor'].default_value = 0.35
    l.new(_rgba(mul, 'Result', True), _rgba(pore_mix, 'A'))
    l.new(pores.outputs['Color'], _rgba(pore_mix, 'B'))
    l.new(_rgba(pore_mix, 'Result', True), bsdf.inputs['Base Color'])
    # verniz: brilhante, gasto em manchas largas
    smudge = n.new('ShaderNodeTexNoise')
    smudge.inputs['Scale'].default_value = 2.5
    smudge.inputs['Detail'].default_value = 3.0
    l.new(coord.outputs['Object'], smudge.inputs['Vector'])
    rough = n.new('ShaderNodeMapRange')
    rough.inputs['From Min'].default_value = 0.35
    rough.inputs['From Max'].default_value = 0.7
    rough.inputs['To Min'].default_value = gloss
    rough.inputs['To Max'].default_value = gloss + wear
    l.new(smudge.outputs['Fac'], rough.inputs['Value'])
    rmax = n.new('ShaderNodeMath')
    rmax.operation = 'MAXIMUM'
    gap = n.new('ShaderNodeMath')
    gap.operation = 'SUBTRACT'
    gap.inputs[0].default_value = 1.0
    l.new(brick.outputs['Fac'], gap.inputs[1])
    l.new(rough.outputs['Result'], rmax.inputs[0])
    l.new(gap.outputs['Value'], rmax.inputs[1])
    l.new(rmax.outputs['Value'], bsdf.inputs['Roughness'])
    # relevo: frestas entre tábuas + veio leve
    bump_gap = n.new('ShaderNodeBump')
    bump_gap.inputs['Strength'].default_value = 0.6
    bump_gap.inputs['Distance'].default_value = 0.002
    l.new(brick.outputs['Fac'], bump_gap.inputs['Height'])
    bump_grain = n.new('ShaderNodeBump')
    bump_grain.inputs['Strength'].default_value = 0.12
    bump_grain.inputs['Distance'].default_value = 0.0005
    l.new(wave.outputs['Fac'], bump_grain.inputs['Height'])
    l.new(bump_gap.outputs['Normal'], bump_grain.inputs['Normal'])
    l.new(bump_grain.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def leather(name, color=(0.09, 0.018, 0.012)):
    """Couro do apoio de braço: cor com variação e rugosidade de poros."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    noise = n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 6.0
    noise.inputs['Detail'].default_value = 5.0
    l.new(coord.outputs['Object'], noise.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = tuple(c * 0.6 for c in color) + (1,)
    ramp.color_ramp.elements[1].color = tuple(min(1, c * 1.6) for c in color) + (1,)
    l.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    cells = n.new('ShaderNodeTexVoronoi')
    cells.inputs['Scale'].default_value = 260.0
    l.new(coord.outputs['Object'], cells.inputs['Vector'])
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.25
    l.new(cells.outputs['Distance'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = 0.45
    return m


def rubber_mat(name):
    """Tapete de borracha de bar com nervuras."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    wave = n.new('ShaderNodeTexWave')
    wave.bands_direction = 'X'
    wave.wave_profile = 'SAW'
    wave.inputs['Scale'].default_value = 60.0
    l.new(coord.outputs['Object'], wave.inputs['Vector'])
    bsdf.inputs['Base Color'].default_value = (0.012, 0.012, 0.011, 1)
    bsdf.inputs['Roughness'].default_value = 0.75
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.8
    l.new(wave.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def _mix(n, l, a, b, fac, blend='MIX'):
    m = n.new('ShaderNodeMix')
    m.data_type = 'RGBA'
    m.blend_type = blend
    if isinstance(fac, float):
        m.inputs['Factor'].default_value = fac
    else:
        l.new(fac, m.inputs['Factor'])
    for sock, val in (('A', a), ('B', b)):
        if isinstance(val, tuple):
            _rgba(m, sock).default_value = (*val, 1) if len(val) == 3 else val
        else:
            l.new(val, _rgba(m, sock))
    return _rgba(m, 'Result', True)


def wallpaper(name, base=(0.16, 0.035, 0.03), stripe=(0.11, 0.022, 0.02), gold=(0.55, 0.38, 0.16)):
    """Papel de parede listrado com filete dourado e medalhões, envelhecido."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    sep = n.new('ShaderNodeSeparateXYZ')
    l.new(coord.outputs['Object'], sep.inputs['Vector'])
    # listras verticais: 8 por tile de 0.8 m (u = x)
    stripe_wave = n.new('ShaderNodeMath')
    stripe_wave.operation = 'SINE'
    mul = n.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = 2 * 3.14159265 * 10.0
    l.new(sep.outputs['X'], mul.inputs[0])
    l.new(mul.outputs['Value'], stripe_wave.inputs[0])
    band = n.new('ShaderNodeMath')
    band.operation = 'GREATER_THAN'
    band.inputs[1].default_value = 0.0
    l.new(stripe_wave.outputs['Value'], band.inputs[0])
    pin = n.new('ShaderNodeMath')
    pin.operation = 'GREATER_THAN'
    pin.inputs[1].default_value = 0.985
    absw = n.new('ShaderNodeMath')
    absw.operation = 'ABSOLUTE'
    l.new(stripe_wave.outputs['Value'], absw.inputs[0])
    inv = n.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1.0
    l.new(absw.outputs['Value'], inv.inputs[1])
    l.new(inv.outputs['Value'], pin.inputs[0])
    # medalhões em grade nas listras largas
    vor = n.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 10.0
    vor.voronoi_dimensions = '2D'
    l.new(coord.outputs['Object'], vor.inputs['Vector'])
    dot = n.new('ShaderNodeMath')
    dot.operation = 'LESS_THAN'
    dot.inputs[1].default_value = 0.12
    l.new(vor.outputs['Distance'], dot.inputs[0])
    col = _mix(n, l, base, stripe, band.outputs['Value'])
    col = _mix(n, l, col, tuple(c * 1.25 for c in base), dot.outputs['Value'])
    col = _mix(n, l, col, gold, pin.outputs['Value'])
    age = n.new('ShaderNodeTexNoise')
    age.inputs['Scale'].default_value = 3.0
    age.inputs['Detail'].default_value = 6.0
    l.new(coord.outputs['Object'], age.inputs['Vector'])
    col = _mix(n, l, col, age.outputs['Color'], 0.18, 'MULTIPLY')
    l.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8
    mix_r = n.new('ShaderNodeMath')
    mix_r.operation = 'MULTIPLY_ADD'
    mix_r.inputs[1].default_value = -0.5
    mix_r.inputs[2].default_value = 0.85
    l.new(pin.outputs['Value'], mix_r.inputs[0])
    l.new(mix_r.outputs['Value'], bsdf.inputs['Roughness'])
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.15
    l.new(dot.outputs['Value'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def marble_floor(name, light=(0.62, 0.56, 0.46), dark=(0.025, 0.022, 0.02), tile=0.3):
    """Piso xadrez de mármore creme e preto, com veios e rejunte."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    checker = n.new('ShaderNodeTexChecker')
    checker.inputs['Scale'].default_value = 1.0 / tile
    checker.inputs['Color1'].default_value = (*light, 1)
    checker.inputs['Color2'].default_value = (*dark, 1)
    l.new(coord.outputs['Object'], checker.inputs['Vector'])
    vein = n.new('ShaderNodeTexWave')
    vein.wave_type = 'BANDS'
    vein.bands_direction = 'DIAGONAL'
    vein.inputs['Scale'].default_value = 3.0
    vein.inputs['Distortion'].default_value = 14.0
    vein.inputs['Detail'].default_value = 8.0
    l.new(coord.outputs['Object'], vein.inputs['Vector'])
    vr = n.new('ShaderNodeValToRGB')
    vr.color_ramp.elements[0].position = 0.0
    vr.color_ramp.elements[0].color = (0.55, 0.55, 0.55, 1)
    vr.color_ramp.elements[1].position = 0.08
    vr.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(vein.outputs['Fac'], vr.inputs['Fac'])
    col = _mix(n, l, checker.outputs['Color'], vr.outputs['Color'], 1.0, 'MULTIPLY')
    brick = n.new('ShaderNodeTexBrick')
    brick.offset = 0.0
    brick.inputs['Scale'].default_value = 1.0
    brick.inputs['Brick Width'].default_value = tile
    brick.inputs['Row Height'].default_value = tile
    brick.inputs['Mortar Size'].default_value = 0.002
    brick.inputs['Color1'].default_value = (1, 1, 1, 1)
    brick.inputs['Color2'].default_value = (1, 1, 1, 1)
    brick.inputs['Mortar'].default_value = (0.15, 0.13, 0.11, 1)
    l.new(coord.outputs['Object'], brick.inputs['Vector'])
    col = _mix(n, l, col, brick.outputs['Color'], 1.0, 'MULTIPLY')
    dirt = n.new('ShaderNodeTexNoise')
    dirt.inputs['Scale'].default_value = 1.5
    dirt.inputs['Detail'].default_value = 8.0
    l.new(coord.outputs['Object'], dirt.inputs['Vector'])
    col = _mix(n, l, col, dirt.outputs['Color'], 0.25, 'MULTIPLY')
    l.new(col, bsdf.inputs['Base Color'])
    rough = n.new('ShaderNodeMapRange')
    rough.inputs['To Min'].default_value = 0.18
    rough.inputs['To Max'].default_value = 0.5
    l.new(dirt.outputs['Fac'], rough.inputs['Value'])
    l.new(rough.outputs['Result'], bsdf.inputs['Roughness'])
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.5
    bump.invert = True
    l.new(brick.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def velvet_tufted(name, color=(0.22, 0.02, 0.025), spacing=0.12):
    """Veludo capitonê: losangos estufados com botões (para encostos)."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    rot = n.new('ShaderNodeMapping')
    rot.inputs['Rotation'].default_value = (0, 0, 0.785398)
    rot.inputs['Scale'].default_value = (1 / spacing, 1 / spacing, 1)
    l.new(coord.outputs['Object'], rot.inputs['Vector'])
    vor = n.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 1.0
    vor.feature = 'F1'
    vor.distance = 'MANHATTAN'
    vor.inputs['Randomness'].default_value = 0.0
    l.new(rot.outputs['Vector'], vor.inputs['Vector'])
    shape = n.new('ShaderNodeValToRGB')
    shape.color_ramp.elements[0].position = 0.0
    shape.color_ramp.elements[0].color = (0.25, 0.25, 0.25, 1)
    shape.color_ramp.elements[1].position = 0.45
    shape.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(vor.outputs['Distance'], shape.inputs['Fac'])
    sheen = n.new('ShaderNodeTexNoise')
    sheen.inputs['Scale'].default_value = 25.0
    sheen.inputs['Detail'].default_value = 4.0
    l.new(coord.outputs['Object'], sheen.inputs['Vector'])
    col = _mix(n, l, tuple(c * 0.45 for c in color), color, shape.outputs['Color'])
    col = _mix(n, l, col, sheen.outputs['Color'], 0.2, 'OVERLAY')
    l.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.95
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 1.0
    bump.inputs['Distance'].default_value = 0.03
    l.new(shape.outputs['Color'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def plaster(name, color=(0.06, 0.045, 0.035)):
    """Teto/reboco pintado escuro com manchas."""
    m, nt, n, l, bsdf = _nodes(name)
    coord = n.new('ShaderNodeTexCoord')
    noise = n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 4.0
    noise.inputs['Detail'].default_value = 10.0
    l.new(coord.outputs['Object'], noise.inputs['Vector'])
    col = _mix(n, l, tuple(c * 0.7 for c in color), tuple(c * 1.3 for c in color), noise.outputs['Fac'])
    l.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.9
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.2
    l.new(noise.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m
