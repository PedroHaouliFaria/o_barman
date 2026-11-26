"""Rótulos de garrafa desenhados por código: texto + ornamentos renderizados no Workbench.

Todas as marcas são fictícias."""
import math
import os

import bpy

FONT_DIR = 'C:/Windows/Fonts'


def _font(name):
    path = os.path.join(FONT_DIR, name)
    if os.path.exists(path):
        return bpy.data.fonts.load(path, check_existing=True)
    return None


def _flat(name, color, scene):
    obj_color = (*color, 1)
    return obj_color


def render_label(key, lines, paper=(0.86, 0.80, 0.66), ink=(0.12, 0.08, 0.05), accent=(0.55, 0.12, 0.08),
                 outdir='.', width=512, height=704):
    """Renderiza um rótulo em PNG. `lines`: [(texto, tamanho, 'serif'|'italic'|'bold', cor_opcional)]."""
    scene = bpy.data.scenes.new('rotulo_' + key)
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'OBJECT'
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new('w') if not bpy.data.worlds else bpy.data.worlds[0]
    w, h = 0.10, 0.10 * height / width

    def add(obj, color, z=0.0):
        obj.color = (*color, 1)
        obj.location.z = z
        scene.collection.objects.link(obj)
        return obj

    def plane(name, sx, sy, x, y, color, z):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([(-sx / 2, -sy / 2, 0), (sx / 2, -sy / 2, 0), (sx / 2, sy / 2, 0), (-sx / 2, sy / 2, 0)], [],
                         [(0, 1, 2, 3)])
        o = bpy.data.objects.new(name, mesh)
        o.location = (x, y, z)
        return add(o, color, z)

    plane('papel', w * 1.2, h * 1.2, 0, 0, paper, 0)
    # moldura dupla e filetes
    for inset, t in ((0.006, 0.0012), (0.009, 0.0005)):
        for sx, sy, x, y in ((w - 2 * inset, t, 0, h / 2 - inset), (w - 2 * inset, t, 0, -h / 2 + inset),
                             (t, h - 2 * inset, w / 2 - inset, 0), (t, h - 2 * inset, -w / 2 + inset, 0)):
            plane('filete', sx, sy, x, y, ink, 0.0005)
    fonts = {'serif': _font('georgia.ttf'), 'bold': _font('georgiab.ttf'), 'italic': _font('georgiai.ttf'),
             'display': _font('BOD_R.TTF') or _font('georgiab.ttf')}
    # empilha as linhas centralizadas
    total = sum(size * 1.35 for _, size, _, *_ in lines)
    y = total / 2
    for text, size, style, *color in lines:
        y -= size * 0.95
        if text == '---':
            plane('linha', w * 0.5, 0.0007, 0, y + size * 0.4, (color[0] if color else accent), 0.0006)
            y -= size * 0.4
            continue
        curve = bpy.data.curves.new('t', 'FONT')
        curve.body = text
        curve.align_x = 'CENTER'
        curve.align_y = 'CENTER'
        curve.size = size
        if fonts.get(style):
            curve.font = fonts[style]
        o = bpy.data.objects.new('t', curve)
        o.location = (0, y, 0.001)
        add(o, color[0] if color else ink, 0.001)
        # encolhe se passar da largura
        scene.view_layers[0].update()
        dims = o.dimensions
        if dims.x > w * 0.84:
            s = w * 0.84 / dims.x
            o.scale = (s, s, 1)
        y -= size * 0.4
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = max(w, h)
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = (0, 0, 1)
    scene.collection.objects.link(cam)
    scene.camera = cam
    path = os.path.join(outdir, f'rotulo_{key}.png')
    scene.render.filepath = path
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True, scene=scene.name)
    img = bpy.data.images.load(path, check_existing=False)
    img.name = f'rotulo_{key}'
    bpy.data.scenes.remove(scene)
    return img
