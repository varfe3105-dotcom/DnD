# Gewinnt weitere Gestaltungselemente aus dem Ornament-Blatt im Design-Eingang (Originale bleiben unverändert)
# und legt sie neben die übrigen RealmCraft-Grafiken (src/assets/realmcraft/). Ergänzt scripts/import-realmcraft.py;
# die Ausschnitte sind dieselben wie in design/mockups/extract.py (Gestaltungskonzept, Abschnitt 9.2).
# Aufruf: python -I scripts/import-realmcraft-ornaments.py
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'RealmCraft' / 'Design-inbox' / 'Ornaments' / 'Gemini_Generated_Image_9y7j2o9y7j2o9y7j(3).jpg'
OUT = ROOT / 'src' / 'assets' / 'realmcraft'
sheet = Image.open(SRC).convert('RGB')

def save(img, rel, q=82, lossless=False):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, 'WEBP', quality=q, method=6, lossless=lossless)
    print(f'{p.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {p.stat().st_size // 1024} KB')

def key_gold(img, lo=60, hi=150):
    """Goldene Linien behalten, dunklen Grund transparent machen (Deckkraft aus Helligkeit, nur warme Töne)."""
    img = img.convert('RGB'); out = Image.new('RGBA', img.size)
    px, po = img.load(), out.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b = px[x, y]
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            a = max(0, min(255, int((lum - lo) / (hi - lo) * 255))) if r - b > 25 else 0
            po[x, y] = (min(255, r + 10), min(255, g + 6), b, a)
    return out

def fit(img, w):
    return img if img.width <= w else img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)

# Goldenes Eckfiligran (oben links aus dem Banner); die übrigen Ecken entstehen per Spiegelung im CSS
cg = key_gold(sheet.crop((125, 590, 330, 790)), 40, 110)
cg.putalpha(cg.getchannel('A').filter(ImageFilter.MaxFilter(3)))
save(fit(cg, 160), 'ornaments/corner.webp', q=90)
# Strukturierte Aubergine-Fläche (Innenseite des Banners) und dunkle Marmorfläche (Seitenleiste)
save(fit(sheet.crop((520, 640, 2150, 900)), 1200), 'textures/aubergine.webp', q=78)
save(sheet.crop((10, 1160, 400, 1380)), 'textures/dark.webp', q=78)
# Schwalbenschwanz-Band, schwarze Umgebung transparent
ban = sheet.crop((112, 575, 2640, 962)).convert('RGBA'); bp = ban.load()
for y in range(ban.size[1]):
    for x in range(ban.size[0]):
        r, g, b, _ = bp[x, y]
        if r + g + b < 30: bp[x, y] = (0, 0, 0, 0)
save(fit(ban, 1000), 'ornaments/banner.webp', q=82)
# Kleiner Rautentrenner und senkrechte Zierleiste
save(key_gold(sheet.crop((150, 1390, 300, 1430)), 50, 130), 'ornaments/divider-small.webp', q=90)
save(key_gold(sheet.crop((398, 1160, 432, 1380)), 50, 130), 'ornaments/vertical.webp', q=90)
print('fertig')
