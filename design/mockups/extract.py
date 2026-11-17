# Gewinnt Gestaltungselemente aus den vorhandenen Originalen im Design-Eingang (nur lesen, Originale bleiben unverändert).
# Ergebnis liegt in design/mockups/assets/ und dient nur den Mockups; in die App kommt es erst nach Freigabe
# (dann über scripts/import-realmcraft.py nach src/assets/realmcraft/).
from PIL import Image, ImageFilter
import os

SRC = 'RealmCraft/Design-inbox'
OUT = 'design/mockups/assets'
os.makedirs(OUT, exist_ok=True)
sheet = Image.open(f'{SRC}/Ornaments/Gemini_Generated_Image_9y7j2o9y7j2o9y7j(3).jpg').convert('RGB')

def key_gold(img, lo=60, hi=150):
    """Goldene Linien behalten, dunklen Hintergrund transparent machen (Alpha aus Helligkeit und Gelbanteil)."""
    img = img.convert('RGB'); out = Image.new('RGBA', img.size)
    px, po = img.load(), out.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b = px[x, y]
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            warm = max(0, r - b)
            a = max(0, min(255, int((lum - lo) / (hi - lo) * 255))) if warm > 25 else 0
            po[x, y] = (min(255, r + 10), min(255, g + 6), b, a)
    return out

# 1. Goldenes Eckfiligran (oben links aus dem Schwalbenschwanz-Banner); die anderen Ecken entstehen per Spiegelung im CSS
corner = sheet.crop((125, 590, 330, 790))
cg = key_gold(corner, 40, 110)
# Linien leicht verstärken, damit das Filigran auch klein sichtbar bleibt
a = cg.getchannel('A').filter(ImageFilter.MaxFilter(3)); cg.putalpha(a)
cg.save(f'{OUT}/corner-gold.png')
# 2. Strukturierte Aubergine-Fläche (Innenseite des Banners, ohne Ornamente)
sheet.crop((520, 640, 2150, 900)).save(f'{OUT}/aubergine.jpg', quality=88)
# 3. Schwalbenschwanz-Banner als Titelband, Hintergrund transparent (schwarze Umgebung raus)
ban = sheet.crop((112, 575, 2640, 962)).convert('RGBA'); bp = ban.load()
for y in range(ban.size[1]):
    for x in range(ban.size[0]):
        r, g, b, _ = bp[x, y]
        if r + g + b < 30: bp[x, y] = (0, 0, 0, 0)
ban.save(f'{OUT}/banner.webp', quality=88)
# 4. (Der feine Panelrahmen des Gruppen-Panels ist zu kontrastarm zum Ausschneiden; der vorhandene Messingrahmen --frame deckt ihn ab.)
# 5. Dunkle, leicht marmorierte Seitenleistenfläche
sheet.crop((10, 1160, 400, 1380)).save(f'{OUT}/dark.jpg', quality=88)
# 6. Kleiner Rautentrenner (aus der Seitenleiste)
key_gold(sheet.crop((150, 1390, 300, 1430)), 50, 130).save(f'{OUT}/divider-small.png')
# 7. Senkrechte Zierleiste (rechter Rand der Seitenleiste)
key_gold(sheet.crop((398, 1160, 432, 1380)), 50, 130).save(f'{OUT}/vertical.png')
print('ok')
