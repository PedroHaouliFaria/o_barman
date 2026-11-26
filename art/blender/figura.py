"""Utilitários para montar figuras (corpo por skin modifier, prismas, torno, esferas)."""
import math

import bmesh
import bpy
from mathutils import Vector

import lib

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


