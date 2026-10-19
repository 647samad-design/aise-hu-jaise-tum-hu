"""Generate the PWA PNG icons with Pillow (no Node/sharp needed).

Run:  python3 scripts/make_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

GREEN_TOP = (23, 116, 74)
GREEN_BOT = (11, 55, 36)
GOLD = (240, 201, 79)
CREAM = (251, 248, 239)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
]


def load_font(size: int) -> ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_icon(size: int, pad_ratio: float = 0.0) -> Image.Image:
    S = 1024  # draw large, then downscale for smooth edges
    img = Image.new("RGB", (S, S), GREEN_BOT)
    px = img.load()
    for y in range(S):
        t = y / (S - 1)
        row = tuple(int(GREEN_TOP[i] * (1 - t) + GREEN_BOT[i] * t) for i in range(3))
        for x in range(S):
            px[x, y] = row
    d = ImageDraw.Draw(img)

    scale = 1 - pad_ratio * 2
    cx = cy = S / 2
    r = 340 * scale
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=int(28 * scale))

    big = load_font(int(470 * scale))
    d.text((cx, cy - 40 * scale), "1", font=big, fill=GOLD, anchor="mm")
    small = load_font(int(104 * scale))
    d.text((cx, cy + 250 * scale), "RUPYA", font=small, fill=CREAM, anchor="mm")

    return img.resize((size, size), Image.LANCZOS)


draw_icon(192).save(OUT / "icon-192.png")
draw_icon(512).save(OUT / "icon-512.png")
draw_icon(512, pad_ratio=0.12).save(OUT / "maskable-512.png")
print("icons written to", OUT)
