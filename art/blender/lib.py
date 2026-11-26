"""Utilidades do pipeline Blender (100% código, sem assets externos).

Convenção de eixos: o jogo (Three.js) usa Y para cima e o jogador olha para -Z.
No Blender, Z é para cima. Um ponto do jogo (x, y, z) fica em (x, -z, y) no Blender;
o exportador glTF faz a conversão de volta.
"""
import math
import os

import bmesh
import bpy
from mathutils import Vector


def game(x, y, z):
    """Converte coordenada do jogo (Y up) para o Blender (Z up)."""
    return Vector((x, -z, y))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves, bpy.data.objects):
        for block in list(coll):
            coll.remove(block)


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def link(obj, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    return obj


def smooth(obj, angle=35):
    for p in obj.data.polygons:
        p.use_smooth = True
    try:
        mod = obj.modifiers.new('suave', 'SMOOTH_BY_ANGLE')
        mod.angle = math.radians(angle)
    except Exception:
        pass
    return obj


# ---------------------------------------------------------------- geometria

def lathe(name, profile, segments=48, arc=(0.0, 2 * math.pi), cap_bottom=False, cap_top=False, uv=True):
    """Revolve um perfil [(raio, altura), ...] em torno do eixo Z.

    `arc` permite fatias (ex.: rótulo na frente da garrafa). As UVs saem com
    u = ângulo e v = altura normalizada, prontas para um rótulo.
    """
    bm = bmesh.new()
    full = abs(arc[1] - arc[0] - 2 * math.pi) < 1e-6
    steps = segments if full else segments + 1
    rings = []
    for i in range(steps):
        a = arc[0] + (arc[1] - arc[0]) * i / segments
        ring = [bm.verts.new((r * math.sin(a), -r * math.cos(a), h)) for r, h in profile]
        rings.append(ring)
    uv_layer = bm.loops.layers.uv.new('UVMap') if uv else None
    hmin = min(h for _, h in profile)
    hmax = max(h for _, h in profile)
    span = max(1e-6, hmax - hmin)
    count = segments if full else segments
    for i in range(count):
        a, b = rings[i], rings[(i + 1) % steps]
        for j in range(len(profile) - 1):
            face = bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
            if uv_layer:
                us = (i / segments, (i + 1) / segments, (i + 1) / segments, i / segments)
                vs = ((profile[j][1] - hmin) / span, (profile[j][1] - hmin) / span,
                      (profile[j + 1][1] - hmin) / span, (profile[j + 1][1] - hmin) / span)
                for loop, u, v in zip(face.loops, us, vs):
                    loop[uv_layer].uv = (u, v)
    if full and cap_bottom and profile[0][0] > 0:
        bm.faces.new([ring[0] for ring in reversed(rings)])
    if full and cap_top and profile[-1][0] > 0:
        bm.faces.new([ring[-1] for ring in rings])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    return smooth(obj)


def box(name, size, location=(0, 0, 0), bevel=0.0, segments=2):
    """Caixa em metros (dimensões x, y, z do Blender) com chanfro opcional."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    if bevel > 0:
        mod = obj.modifiers.new('chanfro', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'ANGLE'
    return obj


def tube_along(name, points, radius, sides=10):
    """Tubo por uma polilinha (cabo, trilho, filamento)."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = max(1, sides // 4)
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (co[0], co[1], co[2], 1)
    obj = bpy.data.objects.new(name, curve)
    return obj


def to_mesh(obj):
    """Aplica modificadores/curvas e devolve um objeto de malha."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    if obj.name not in bpy.context.scene.objects:
        link(obj)
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated)
    new = bpy.data.objects.new(obj.name, mesh)
    new.matrix_world = obj.matrix_basis.copy()  # matrix_world só atualiza depois do depsgraph
    for m in obj.data.materials if hasattr(obj.data, 'materials') else []:
        if m and m.name not in [x.name for x in new.data.materials if x]:
            new.data.materials.append(m)
    name = obj.name
    bpy.data.objects.remove(obj)
    new.name = mesh.name = name
    link(new)
    return new


def box_uv(obj, tile=1.6):
    """UV em escala de mundo por projeção de caixa: 1 unidade de UV = `tile` metros.

    O veio da madeira corre em X (comprimento do balcão)."""
    bpy.context.view_layer.update()
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name='UVMap')
    uv = mesh.uv_layers.active.data
    mw = obj.matrix_world
    for poly in mesh.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = mw @ mesh.vertices[mesh.loops[li].vertex_index].co
            if ax == 2:
                u, v = co.x, co.y
            elif ax == 1:
                u, v = co.x, co.z
            else:
                u, v = co.y, co.z
            uv[li].uv = (u / tile, v / tile)


# ---------------------------------------------------------------- materiais

def principled(name, color=(0.8, 0.8, 0.8), roughness=0.5, metallic=0.0, emission=None, strength=0.0,
               transmission=0.0, alpha=1.0, ior=1.45):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['IOR'].default_value = ior
    if transmission:
        bsdf.inputs['Transmission Weight'].default_value = transmission
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
    return m


def textured(name, color_img, rough_img=None, normal_img=None, normal_strength=1.0):
    """Material com texturas assadas (o que o glTF/Three.js entende)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = color_img
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if rough_img:
        r = nt.nodes.new('ShaderNodeTexImage')
        r.image = rough_img
        r.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(r.outputs['Color'], bsdf.inputs['Roughness'])
    if normal_img:
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = normal_img
        n.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(n.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def assign(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return obj


# ---------------------------------------------------------------- bake

def use_gpu():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                break
        except TypeError:
            continue
    for d in prefs.devices:
        d.use = d.type != 'CPU'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False


def bake_tile(name, material, size, outdir, tile=1.6):
    """Assa cor, rugosidade e normal de um material procedural numa textura quadrada.

    O material é aplicado num plano de `tile` x `tile` metros; as imagens resultantes
    servem para qualquer objeto com box_uv(tile)."""
    use_gpu()
    bpy.ops.mesh.primitive_plane_add(size=tile, location=(0, 0, -50))
    plane = bpy.context.active_object
    plane.name = 'bake_' + name
    assign(plane, material)
    images = {}
    nt = material.node_tree
    for kind, bake_type, colorspace in (('cor', 'DIFFUSE', 'sRGB'), ('rug', 'ROUGHNESS', 'Non-Color'),
                                        ('normal', 'NORMAL', 'Non-Color')):
        img = bpy.data.images.new(f'{name}_{kind}', size, size)
        img.colorspace_settings.name = colorspace
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = img
        nt.nodes.active = node
        bpy.ops.object.select_all(action='DESELECT')
        plane.select_set(True)
        bpy.context.view_layer.objects.active = plane
        kwargs = dict(type=bake_type, margin=4)
        if bake_type == 'DIFFUSE':
            kwargs['pass_filter'] = {'COLOR'}
        bpy.ops.object.bake(**kwargs)
        img.filepath_raw = os.path.join(outdir, f'{name}_{kind}.png')
        img.file_format = 'PNG'
        img.save()
        nt.nodes.remove(node)
        images[kind] = img
    bpy.data.objects.remove(plane)
    return images


def export(objects, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        if o.name not in bpy.context.scene.objects:
            link(o)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    kwargs = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                  export_image_format='JPEG', export_extras=True)
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_jpeg_quality=88)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print('EXPORTADO', path)


def grid(name, w, h, nx, ny, displace=None):
    """Malha plana w x h (eixos X e Z do Blender, de frente para -Y) com deslocamento opcional em Y."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new('UVMap')
    verts = [[bm.verts.new((-w / 2 + w * i / nx, (displace(i / nx, j / ny) if displace else 0.0), h * j / ny))
              for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
            for loop, (u, v) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                loop[uv_layer].uv = (u / nx, v / ny)
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return smooth(bpy.data.objects.new(name, mesh))


def join(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        if o.name not in bpy.context.scene.objects:
            link(o)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    out = bpy.context.active_object
    out.name = out.data.name = name
    return out
