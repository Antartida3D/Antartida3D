"""Run in live Blender through MCP with REPO_ROOT set. Export boxes from authored meshes.

Flag designs: docs/reclamos-antarticos-fuentes.md. Pixelated symbols are illustrations.
The existing Argentine model is reused; this script authors the other six national flags.
"""
import json
import math
from pathlib import Path

import bpy

root = Path(REPO_ROOT)
scene_name = "Antarctic Claim Flags - Issue 108"
if bpy.data.scenes.get(scene_name):
    raise RuntimeError("Inspect the existing claim flags scene before rebuilding.")
scene = bpy.data.scenes.new(scene_name)
scene["description"] = "Illustrative voxel national flags. No real flagpole positions or scale."
palette = {"WHITE": 0xf7fafb, "ZINC": 0x7d868c, "ICE": 0xe9f1f4,
           "FLAG_BLUE": 0x012169, "FLAG_RED": 0xc8102e}
materials = {}


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


for name, value in palette.items():
    mat = bpy.data.materials.new("Claim108 " + name)
    rgb = [linear(((value >> shift) & 255) / 255) for shift in (16, 8, 0)]
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = .8
    materials[name] = mat


def box(collection, parent, name, x, y, z, sx, sy, sz, color):
    # App: y up, front +z; Blender: z up, front -y.
    verts = [(dx * sx / 2, -dz * sz / 2, dy * sy / 2)
             for dx, dy, dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                               (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(parent.name + " " + name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    obj.location = (x, -z, y)
    obj.data.materials.append(materials[color])
    obj["palette"] = color


def star(x, y, cx, cy, radius, points=5):
    polygon = [(cx + math.sin(i * math.pi / points) * radius * (1 if i % 2 == 0 else .42),
                cy - math.cos(i * math.pi / points) * radius * (1 if i % 2 == 0 else .42))
               for i in range(points * 2)]
    inside = False
    j = len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def union(x, y):
    # 2:1 flag, x 0..2 and y 0..1. Red saltires are counterchanged, not centered.
    d1, d2 = y - x / 2, y - (1 - x / 2)
    color = "FLAG_BLUE"
    if abs(d1) < .11 or abs(d2) < .11:
        color = "WHITE"
    if (0 < d1 < .07 if x < 1 else -.07 < d1 < 0) or (0 < d2 < .07 if x < 1 else -.07 < d2 < 0):
        color = "FLAG_RED"
    if abs(x - 1) < .17 or abs(y - .5) < .17:
        color = "WHITE"
    if abs(x - 1) < .10 or abs(y - .5) < .10:
        color = "FLAG_RED"
    return color


def pixel(country, x, y, width, height):
    u, v = x / width, y / height
    if country == "fr":
        return ["FLAG_BLUE", "WHITE", "FLAG_RED"][min(2, int(u * 3))]
    if country == "no":
        if 7 / 22 <= u < 9 / 22 or 7 / 16 <= v < 9 / 16:
            return "FLAG_BLUE"
        if 6 / 22 <= u < 10 / 22 or 6 / 16 <= v < 10 / 16:
            return "WHITE"
        return "FLAG_RED"
    if country == "cl":
        if v >= .5:
            return "FLAG_RED"
        if u >= 1 / 3:
            return "WHITE"
        return "WHITE" if star(x, y, width / 6, height / 4, height * .14) else "FLAG_BLUE"
    if country == "gb":
        return union(2 * u, v)
    if u < .5 and v < .5:
        return union(4 * u, 2 * v)
    if country == "au":
        stars = [( .25, .75, .15, 7), (.75, .81, .14, 7), (.62, .44, .14, 7),
                 (.75, .20, .14, 7), (.88, .40, .14, 7), (.81, .58, .08, 5)]
        for cx, cy, r, n in stars:
            if star(x, y, cx * width, cy * height, r * height, n):
                return "WHITE"
    else:
        for cx, cy, r in [(.75, .22, .12), (.62, .45, .11), (.88, .40, .10), (.75, .81, .13)]:
            if star(x, y, cx * width, cy * height, r * height * .7):
                return "FLAG_RED"
            if star(x, y, cx * width, cy * height, r * height):
                return "WHITE"
    return "FLAG_BLUE"


models = {}
for index, (country, width, height) in enumerate([
    ("cl", 90, 60), ("gb", 120, 60), ("au", 120, 60),
    ("fr", 90, 60), ("nz", 120, 60), ("no", 88, 64),
]):
    collection = bpy.data.collections.new("Claim108 " + country)
    scene.collection.children.link(collection)
    parent = bpy.data.objects.new("Claim flag " + country, None)
    collection.objects.link(parent)
    parent.location = ((index % 3) * 1.05, 0, -(index // 3) * 1.25)
    box(collection, parent, "mast", 0, .49, 0, .024, .98, .024, "ZINC")
    box(collection, parent, "mast highlight", -.008, .49, .014, .008, .98, .006, "ICE")
    box(collection, parent, "cap", 0, .989, 0, .035, .022, .035, "ICE")
    box(collection, parent, "support", .335, .966, 0, .69, .022, .022, "ZINC")
    box(collection, parent, "upper collar", 0, .95, 0, .04, .025, .04, "WHITE")
    box(collection, parent, "lower collar", 0, .95 - .63 * height / width, 0, .04, .025, .04, "WHITE")
    # Consecutive same-color horizontal runs become solid voxels. Even simple tricolors
    # retain rows, so every model satisfies the same detail contract as other scene models.
    unit = .63 / width
    for row in range(height):
        start = 0
        while start < width:
            color = pixel(country, start + .5, row + .5, width, height)
            end = start + 1
            while end < width and pixel(country, end + .5, row + .5, width, height) == color:
                end += 1
            box(collection, parent, f"row {row} run {start}",
                .025 + (start + end) / 2 * unit, .95 - (row + .5) * unit, 0,
                (end - start) * unit, unit, .014, color)
            start = end
    models[country] = [o for o in collection.objects if o.type == "MESH"]

lines = ["// Generated from authored Blender meshes by scripts/build-claim-flags.py.",
         "import type { ClaimId } from '@antartida/core';",
         "import type { Box } from '../voyage/vehicles.ts';",
         "import { MALVINAS_FLAG_BOXES } from './malvinasFlagModel.ts';", ""]
for name, value in palette.items():
    lines.append(f"const {name} = 0x{value:06x};")
lines.extend(["", "export const CLAIM_FLAG_MODELS: Record<ClaimId, readonly Box[]> = {", "  ar: MALVINAS_FLAG_BOXES,"])
for country, objects in models.items():
    lines.append(f"  {country}: [")
    for obj in objects:
        xs, ys, zs = zip(*(v.co for v in obj.data.vertices))
        values = [obj.location.x, obj.location.z, -obj.location.y,
                  max(xs)-min(xs), max(zs)-min(zs), max(ys)-min(ys)]
        lines.append("    [" + ", ".join(f"{v:.6f}".rstrip("0").rstrip(".") or "0" for v in values)
                     + ", " + obj["palette"] + "],")
    lines.append("  ],")
lines.append("};\n")
(root / "packages/react-ui/src/map3d/claimFlagModels.ts").write_text("\n".join(lines))
bpy.data.libraries.write(str(root / "docs/diseno/modelos/claim-flags.blend"), {scene}, fake_user=True, compress=True)
print(json.dumps({"scene": scene.name, "boxes": {c: len(o) for c, o in models.items()}}))
