# Übernimmt die RealmCraft-Grafiken aus RealmCraft/Design-inbox nach src/assets/realmcraft/.
# Originale bleiben unverändert. Ablage unter src/ (nicht public/), weil Vite nur so die Bilder in die Einzeldatei einbettet.
# Aufruf: python -I scripts/import-realmcraft.py
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / 'RealmCraft' / 'Design-inbox'
OUT = ROOT / 'src' / 'assets' / 'realmcraft'
for d in ['branding', 'campaigns', 'dashboard', 'textures', 'ornaments']:
    (OUT / d).mkdir(parents=True, exist_ok=True)

def save(img, path, q=80, **kw):
    img.save(path, 'WEBP', quality=q, method=6, **kw)
    print(f'{path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {path.stat().st_size // 1024} KB')

def fit_w(img, w):
    return img if img.width <= w else img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)

# ---- Branding: schwarz auf weiß → Messing mit Transparenz ----
def brass(src, w):
    g = ImageOps.grayscale(Image.open(src))
    a = g.point(lambda v: max(0, min(255, round((235 - v) * 1.25))))  # Weiß transparent, Schwarz deckend, Kanten weich
    box = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    a = a.crop(box)
    top, bot = (236, 210, 148), (180, 138, 70)  # helles Messing oben, dunkleres unten
    grad = Image.new('RGB', (1, a.height))
    for y in range(a.height):
        t = y / max(1, a.height - 1)
        grad.putpixel((0, y), tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    img = grad.resize(a.size)
    img.putalpha(a)
    return fit_w(img, w)

br = sorted((INBOX / 'Branding').glob('*.jpeg'))
by_ratio = sorted(br, key=lambda p: Image.open(p).width / Image.open(p).height)
save(brass(by_ratio[0], 512), OUT / 'branding' / 'monogram.webp', q=90)   # quadratisch: RC mit W20
save(brass(by_ratio[-1], 1200), OUT / 'branding' / 'wordmark.webp', q=90)  # breit: Schriftzug RealmCraft

# ---- Kampagnen: alle sechs Illustrationen, Kartenformat ----
CAMPS = [  # (Datei, Name im Projekt)
    ('Gemini_Generated_Image_t9fsp1t9fsp1t9fs.jpg', 'castle-sunset'),
    ('Gemini_Generated_Image_2a19fn2a19fn2a19.jpg', 'castle-valley'),
    ('Gemini_Generated_Image_tti8u7tti8u7tti8.jpg', 'fortress-storm'),
    ('Gemini_Generated_Image_itvzv5itvzv5itvz.jpg', 'river-city'),
    ('Gemini_Generated_Image_2yw4mf2yw4mf2yw4.jpg', 'dungeon-vault'),
    ('Gemini_Generated_Image_z7y190z7y190z7y1.jpg', 'forest-ruins'),
]
for f, name in CAMPS:
    save(fit_w(Image.open(INBOX / 'Campaigns' / f).convert('RGB'), 960), OUT / 'campaigns' / f'{name}.webp', q=78)

# ---- Dashboard: Willkommensbild (Burg im Abendlicht) und Seitenleiste (Stadt bei Nacht, Hochformat) ----
save(fit_w(Image.open(INBOX / 'Campaigns' / CAMPS[0][0]).convert('RGB'), 1800), OUT / 'dashboard' / 'hero.webp', q=80)
city = Image.open(INBOX / 'Campaigns' / 'Gemini_Generated_Image_itvzv5itvzv5itvz.jpg').convert('RGB')
save(fit_w(city.crop((0, 0, 980, 1536)), 520), OUT / 'dashboard' / 'sidebar.webp', q=78)

# ---- Textur: Pergamentblatt mit gerissenen Kanten, schwarzer Grund → transparent ----
p = Image.open(INBOX / 'Textures' / 'Gemini_Generated_Image_9y7j2o9y7j2o9y7j(1).jpg').convert('RGB')
a = ImageOps.grayscale(p).point(lambda v: max(0, min(255, (v - 18) * 6)))
p.putalpha(a)
p = p.crop(a.point(lambda v: 255 if v > 30 else 0).getbbox())
save(fit_w(p, 1000), OUT / 'textures' / 'parchment-sheet.webp', q=82)

# ---- Ornamente: vier goldene Trennlinien auf Schwarz → einzeln, transparent ----
o = Image.open(INBOX / 'Ornaments' / 'Gemini_Generated_Image_9y7j2o9y7j2o9y7j(2).jpg').convert('RGB')
rows = [(40, 380), (410, 760), (800, 1170), (1240, 1430)]
for i, (y0, y1) in enumerate(rows, 1):
    part = o.crop((0, y0, o.width, y1))
    lum = ImageOps.grayscale(part)
    al = lum.point(lambda v: max(0, min(255, round((v - 10) * 2.2))))
    # Farbe aufhellen, wo die Deckkraft sinkt, damit Kanten nicht schwarz säumen
    px = part.load(); ap = al.load()
    for y in range(part.height):
        for x in range(part.width):
            av = ap[x, y]
            if 0 < av < 255:
                r, g, b = px[x, y]; k = 255 / av
                px[x, y] = (min(255, round(r * k)), min(255, round(g * k)), min(255, round(b * k)))
    part.putalpha(al)
    part = part.crop(al.point(lambda v: 255 if v > 40 else 0).getbbox())
    save(fit_w(part, 900), OUT / 'ornaments' / f'divider-{i}.webp', q=85)
print('fertig')
