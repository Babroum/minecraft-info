import os
import json
from PIL import Image, ImageDraw

textures_dir = os.path.abspath('kubejs/assets/kubejs/textures/item')
models_dir = os.path.abspath('kubejs/assets/kubejs/models/item')
armor_models_dir = os.path.abspath('kubejs/assets/kubejs/textures/models/armor')

os.makedirs(textures_dir, exist_ok=True)
os.makedirs(models_dir, exist_ok=True)
os.makedirs(armor_models_dir, exist_ok=True)

def save_model(item_id):
    model_path = os.path.join(models_dir, f'{item_id}.json')
    data = {
        "parent": "minecraft:item/generated",
        "textures": {
            "layer0": f"kubejs:item/{item_id}"
        }
    }
    with open(model_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

# 1. Plaque composite balistique (16x16)
img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
for x in range(3, 13):
    for y in range(3, 13):
        d.point((x, y), fill=(45, 52, 54, 255))
for x in range(4, 12):
    for y in range(4, 12):
        shade = 70 + ((x + y) % 2) * 20
        d.point((x, y), fill=(shade, shade + 5, shade + 10, 255))
for rx, ry in [(4, 4), (11, 4), (4, 11), (11, 11)]:
    d.point((rx, ry), fill=(180, 190, 200, 255))
for i in range(3, 13):
    d.point((i, 3), fill=(30, 35, 40, 255))
    d.point((i, 12), fill=(20, 25, 30, 255))
    d.point((3, i), fill=(30, 35, 40, 255))
    d.point((12, i), fill=(20, 25, 30, 255))
img.save(os.path.join(textures_dir, 'plaque_composite_balistique.png'))
save_model('plaque_composite_balistique')

# 2. Plaque uranium blinde (16x16)
img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
for x in range(2, 14):
    for y in range(2, 14):
        d.point((x, y), fill=(25, 35, 30, 255))
for x in range(3, 13):
    for y in range(3, 13):
        d.point((x, y), fill=(40, 55, 45, 255))
for i in range(5, 11):
    d.point((i, 8), fill=(46, 204, 113, 255))
    d.point((8, i), fill=(46, 204, 113, 255))
d.point((8, 8), fill=(120, 255, 150, 255))
for cx, cy in [(3, 3), (12, 3), (3, 12), (12, 12)]:
    d.point((cx, cy), fill=(241, 196, 15, 255))
img.save(os.path.join(textures_dir, 'plaque_uranium_blinde.png'))
save_model('plaque_uranium_blinde')

def make_helmet(base_color, visor_color, border_color):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    for x in range(4, 12):
        for y in range(2, 9):
            dr.point((x, y), fill=base_color)
    for y in range(9, 13):
        dr.point((4, y), fill=base_color)
        dr.point((5, y), fill=base_color)
        dr.point((10, y), fill=base_color)
        dr.point((11, y), fill=base_color)
    if visor_color:
        for x in range(6, 10):
            dr.point((x, 8), fill=visor_color)
            dr.point((x, 9), fill=visor_color)
    for x in range(4, 12):
        dr.point((x, 2), fill=border_color)
    return im

def make_chestplate(base_color, accent_color, plate_color):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    for y in range(1, 15):
        for x in range(2, 14):
            if y == 1 and (x in (2, 7, 8, 13)): continue
            if y == 2 and (x in (7, 8)): continue
            dr.point((x, y), fill=base_color)
    for x in range(4, 12):
        for y in range(4, 12):
            if x not in (7, 8):
                dr.point((x, y), fill=plate_color)
    if accent_color:
        dr.point((7, 7), fill=accent_color)
        dr.point((8, 7), fill=accent_color)
        dr.point((7, 8), fill=accent_color)
        dr.point((8, 8), fill=accent_color)
    return im

def make_leggings(base_color, knee_color, border_color):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    for x in range(2, 14):
        dr.point((x, 2), fill=border_color)
        dr.point((x, 3), fill=base_color)
        dr.point((x, 4), fill=base_color)
    for y in range(5, 15):
        for x in range(3, 7):
            dr.point((x, y), fill=base_color)
        for x in range(9, 13):
            dr.point((x, y), fill=base_color)
    if knee_color:
        for x in range(3, 7):
            dr.point((x, 9), fill=knee_color)
        for x in range(9, 13):
            dr.point((x, 9), fill=knee_color)
    return im

def make_boots(base_color, sole_color, cuff_color):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    for y in range(8, 15):
        for x in range(2, 6):
            dr.point((x, y), fill=base_color)
        for x in range(10, 14):
            dr.point((x, y), fill=base_color)
    for x in range(1, 7):
        dr.point((x, 14), fill=sole_color)
    for x in range(9, 15):
        dr.point((x, 14), fill=sole_color)
    for x in range(2, 6):
        dr.point((x, 8), fill=cuff_color)
    for x in range(10, 14):
        dr.point((x, 8), fill=cuff_color)
    return im

# Composite Armor
make_helmet((52, 73, 94, 255), (41, 128, 185, 255), (33, 47, 61, 255)).save(os.path.join(textures_dir, 'composite_helmet.png'))
make_chestplate((44, 62, 80, 255), (231, 76, 60, 255), (60, 85, 110, 255)).save(os.path.join(textures_dir, 'composite_chestplate.png'))
make_leggings((44, 62, 80, 255), (60, 85, 110, 255), (33, 47, 61, 255)).save(os.path.join(textures_dir, 'composite_leggings.png'))
make_boots((33, 47, 61, 255), (20, 25, 30, 255), (52, 73, 94, 255)).save(os.path.join(textures_dir, 'composite_boots.png'))

save_model('composite_helmet')
save_model('composite_chestplate')
save_model('composite_leggings')
save_model('composite_boots')

# Uranium Juggernaut Armor
make_helmet((25, 45, 35, 255), (46, 204, 113, 255), (15, 30, 20, 255)).save(os.path.join(textures_dir, 'uranium_juggernaut_helmet.png'))
make_chestplate((25, 45, 35, 255), (46, 204, 113, 255), (35, 65, 50, 255)).save(os.path.join(textures_dir, 'uranium_juggernaut_chestplate.png'))
make_leggings((25, 45, 35, 255), (46, 204, 113, 255), (15, 30, 20, 255)).save(os.path.join(textures_dir, 'uranium_juggernaut_leggings.png'))
make_boots((15, 30, 20, 255), (46, 204, 113, 255), (35, 65, 50, 255)).save(os.path.join(textures_dir, 'uranium_juggernaut_boots.png'))

save_model('uranium_juggernaut_helmet')
save_model('uranium_juggernaut_chestplate')
save_model('uranium_juggernaut_leggings')
save_model('uranium_juggernaut_boots')

# Armor entity textures (64x32)
def make_layer(base_rgb, accent_rgb, filename):
    layer = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle([0, 0, 31, 15], fill=base_rgb + (255,))
    d.rectangle([16, 16, 39, 31], fill=base_rgb + (255,))
    d.rectangle([40, 16, 55, 31], fill=base_rgb + (255,))
    d.rectangle([0, 16, 15, 31], fill=base_rgb + (255,))
    d.rectangle([8, 8, 15, 11], fill=accent_rgb + (255,))
    d.rectangle([20, 20, 27, 27], fill=accent_rgb + (255,))
    layer.save(os.path.join(armor_models_dir, filename))

make_layer((50, 65, 80), (70, 130, 180), 'composite_layer_1.png')
make_layer((40, 55, 70), (70, 130, 180), 'composite_layer_2.png')
make_layer((30, 50, 38), (46, 204, 113), 'uranium_juggernaut_layer_1.png')
make_layer((20, 38, 28), (46, 204, 113), 'uranium_juggernaut_layer_2.png')

print('All textures and models generated successfully!')
