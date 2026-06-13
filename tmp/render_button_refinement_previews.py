from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


SOURCE = Path(r"C:\Users\NOFUCK~1\AppData\Local\Temp\codex-clipboard-90b3d06f-31dd-4d73-91e1-eb340f0bf8c1.png")
OUT_DIR = Path(__file__).resolve().parent
BASE_SIZE = (2048, 990)


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for item in candidates:
        if Path(item).exists():
            return ImageFont.truetype(item, size)
    return ImageFont.load_default()


F = {
    "nav": font(15, True),
    "small": font(13, True),
    "link": font(20, True),
    "save": font(24, True),
}


def rgb(hex_color, alpha=255):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow(base, box, radius, color, blur=16, offset=(0, 8)):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shifted = (box[0] + offset[0], box[1] + offset[1], box[2] + offset[0], box[3] + offset[1])
    d.rounded_rectangle(shifted, radius=radius, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGBA", size, top)
    pix = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(4))
        for x in range(w):
            pix[x, y] = c
    return img


def paste_round_gradient(base, box, radius, top, bottom, outline=None, shadow_color=None, blur=16, offset=(0, 8)):
    if shadow_color:
        shadow(base, box, radius, shadow_color, blur=blur, offset=offset)
    x1, y1, x2, y2 = box
    grad = vertical_gradient((x2 - x1, y2 - y1), top, bottom)
    mask = Image.new("L", (x2 - x1, y2 - y1), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, x2 - x1 - 1, y2 - y1 - 1), radius=radius, fill=255)
    base.paste(grad, (x1, y1), mask)
    d = ImageDraw.Draw(base)
    if outline:
        rounded(d, box, radius, None, outline, 1)
    return d


def clear_region(base, box, fill):
    d = ImageDraw.Draw(base)
    d.rectangle(box, fill=fill)


def centered_text(draw, box, text, fill, font_obj):
    l, t, r, b = draw.textbbox((0, 0), text, font=font_obj)
    tw, th = r - l, b - t
    x = box[0] + (box[2] - box[0] - tw) / 2
    y = box[1] + (box[3] - box[1] - th) / 2 - 1
    draw.text((x, y), text, font=font_obj, fill=fill)


def draw_house_icon(d, cx, cy, color):
    d.line((cx - 8, cy + 4, cx, cy - 6, cx + 8, cy + 4), fill=color, width=3, joint="curve")
    d.rounded_rectangle((cx - 7, cy + 2, cx + 7, cy + 12), radius=2, outline=color, width=3)


def draw_plus_icon(d, cx, cy, color):
    d.line((cx - 7, cy, cx + 7, cy), fill=color, width=3)
    d.line((cx, cy - 7, cx, cy + 7), fill=color, width=3)


def draw_square_icon(d, cx, cy, color):
    d.rounded_rectangle((cx - 7, cy - 7, cx + 7, cy + 7), radius=3, outline=color, width=3)


def draw_list_icon(d, cx, cy, color):
    for off in (-6, 0, 6):
        d.line((cx - 8, cy + off, cx + 8, cy + off), fill=color, width=3)


def draw_download_icon(d, cx, cy, color):
    d.line((cx, cy - 10, cx, cy + 6), fill=color, width=3)
    d.line((cx - 7, cy, cx, cy + 7, cx + 7, cy), fill=color, width=3, joint="curve")
    d.line((cx - 10, cy + 11, cx + 10, cy + 11), fill=color, width=3)


def draw_nav_option(img, palette, active_style="solid"):
    d = ImageDraw.Draw(img)
    sidebar_bg = rgb("#ffffff")
    navs = [
        ("总览", draw_house_icon, True, 92),
        ("记一笔", draw_plus_icon, False, 140),
        ("分类与预算", draw_square_icon, False, 188),
        ("流水明细", draw_list_icon, False, 236),
        ("导入导出", draw_download_icon, False, 284),
    ]
    for text, icon_fn, active, y in navs:
        clear_region(img, (14, y - 2, 218, y + 43), sidebar_bg)
        if active:
            if active_style == "outline":
                shadow(img, (14, y, 218, y + 43), 12, palette["active_shadow"], blur=12, offset=(0, 6))
                rounded(d, (14, y, 218, y + 43), 12, palette["active_fill"], palette["active_outline"], 1)
            else:
                paste_round_gradient(
                    img,
                    (14, y, 218, y + 43),
                    12,
                    palette["active_top"],
                    palette["active_bottom"],
                    outline=palette["active_outline"],
                    shadow_color=palette["active_shadow"],
                    blur=15,
                    offset=(0, 8),
                )
            rounded(d, (28, y + 7, 55, y + 34), 8, palette["icon_active_bg"])
            icon_fn(d, 42, y + 20, palette["icon_active"])
            d.text((64, y + 11), text, font=F["nav"], fill=palette["active_text"])
        else:
            rounded(d, (26, y + 6, 54, y + 34), 10, palette["icon_idle_bg"])
            icon_fn(d, 40, y + 19, palette["icon_idle"])
            d.text((64, y + 10), text, font=F["nav"], fill=palette["idle_text"])


def draw_segmented(img, palette, style="solid"):
    d = ImageDraw.Draw(img)
    clear_region(img, (1852, 88, 2032, 132), rgb("#f8fbfa"))
    if style == "outline":
        shadow(img, (1855, 90, 2030, 130), 12, palette["seg_shadow"], blur=12, offset=(0, 6))
        rounded(d, (1855, 90, 2030, 130), 12, palette["seg_bg"], palette["seg_outline"], 1)
        rounded(d, (1861, 96, 1913, 124), 9, palette["seg_active_fill"], palette["seg_active_outline"], 1)
    else:
        shadow(img, (1855, 90, 2030, 130), 12, palette["seg_shadow"], blur=12, offset=(0, 7))
        rounded(d, (1855, 90, 2030, 130), 12, palette["seg_bg"], palette["seg_outline"], 1)
        paste_round_gradient(img, (1860, 95, 1914, 125), 9, palette["seg_active_top"], palette["seg_active_bottom"], shadow_color=palette["seg_active_shadow"], blur=8, offset=(0, 4))
    centered_text(d, (1860, 95, 1914, 125), "每周", palette["seg_active_text"], F["small"])
    centered_text(d, (1920, 95, 1974, 125), "每月", palette["seg_text"], F["small"])
    centered_text(d, (1982, 95, 2024, 125), "每年", palette["seg_text"], F["small"])


def draw_primary_button(img, palette, style="solid"):
    d = ImageDraw.Draw(img)
    clear_region(img, (1684, 692, 2014, 744), rgb("#ffffff"))
    if style == "outline":
        shadow(img, (1686, 695, 2012, 741), 8, palette["primary_shadow"], blur=12, offset=(0, 8))
        rounded(d, (1686, 695, 2012, 741), 8, palette["primary_fill"], palette["primary_outline"], 1)
    else:
        paste_round_gradient(
            img,
            (1686, 695, 2012, 741),
            8,
            palette["primary_top"],
            palette["primary_bottom"],
            outline=palette["primary_outline"],
            shadow_color=palette["primary_shadow"],
            blur=16,
            offset=(0, 8),
        )
        d.line((1698, 697, 2000, 697), fill=palette["primary_highlight"], width=1)
    centered_text(d, (1686, 695, 2012, 741), "保存支出", palette["primary_text"], F["save"])


def draw_text_actions(img, palette, style="solid"):
    d = ImageDraw.Draw(img)
    clear_region(img, (1922, 330, 2016, 356), rgb("#ffffff"))
    clear_region(img, (1536, 484, 1640, 512), rgb("#ffffff"))
    if style == "outline":
        rounded(d, (1921, 329, 2013, 356), 10, palette["link_fill"], palette["link_outline"], 1)
        rounded(d, (1538, 485, 1627, 511), 10, palette["link_fill"], palette["link_outline"], 1)
    else:
        rounded(d, (1921, 329, 2013, 356), 10, palette["link_fill"], None)
        rounded(d, (1538, 485, 1627, 511), 10, palette["link_fill"], None)
    centered_text(d, (1921, 329, 2013, 356), "完整表单", palette["link_text"], F["small"])
    centered_text(d, (1538, 485, 1627, 511), "查看全部", palette["link_text"], F["small"])


def draw_input_button_accents(img, palette):
    d = ImageDraw.Draw(img)
    # Subtle replacement for select/date affordance button areas only.
    for box in [(1810, 557, 1841, 601), (1980, 557, 2012, 601), (1972, 476, 2009, 520)]:
        rounded(d, box, 8, palette["input_affordance"], None)
    d.text((1822, 570), "⌄", font=F["small"], fill=palette["input_icon"])
    d.text((1992, 570), "⌄", font=F["small"], fill=palette["input_icon"])
    d.text((1985, 487), "□", font=F["small"], fill=palette["input_icon"])


def render_variant(name, palette, style="solid", active_style="solid"):
    img = Image.open(SOURCE).convert("RGBA")
    if img.size != BASE_SIZE:
        img = img.resize(BASE_SIZE, Image.Resampling.LANCZOS)
    draw_nav_option(img, palette, active_style=active_style)
    draw_segmented(img, palette, style=style)
    draw_text_actions(img, palette, style=style)
    draw_primary_button(img, palette, style=style)
    out = OUT_DIR / f"button-preview-{name}.png"
    img.convert("RGB").save(out, quality=96)
    return out


def main():
    variants = [
        (
            "01-soft-mint",
            "solid",
            "solid",
            {
                "active_top": rgb("#f0fffb"),
                "active_bottom": rgb("#dff6ef"),
                "active_outline": rgb("#a9ded5"),
                "active_shadow": rgb("#0a9f94", 34),
                "active_text": rgb("#07867d"),
                "active_fill": rgb("#e4f7f2"),
                "icon_active_bg": rgb("#0e9f95"),
                "icon_active": rgb("#087d76"),
                "icon_idle_bg": rgb("#eef6f5"),
                "icon_idle": rgb("#71858a"),
                "idle_text": rgb("#263c40"),
                "seg_bg": rgb("#ffffff", 238),
                "seg_outline": rgb("#d7e3e6"),
                "seg_shadow": rgb("#0f3440", 24),
                "seg_active_top": rgb("#19b8ae"),
                "seg_active_bottom": rgb("#078c83"),
                "seg_active_shadow": rgb("#078c83", 58),
                "seg_active_text": rgb("#ffffff"),
                "seg_text": rgb("#53676d"),
                "primary_top": rgb("#1bbdb2"),
                "primary_bottom": rgb("#0b978e"),
                "primary_outline": rgb("#087f78"),
                "primary_shadow": rgb("#088d84", 52),
                "primary_highlight": rgb("#7af4ea", 110),
                "primary_text": rgb("#ffffff"),
                "link_fill": rgb("#e8f9f5"),
                "link_outline": rgb("#bfe7df"),
                "link_text": rgb("#07867d"),
                "input_affordance": rgb("#f2faf8"),
                "input_icon": rgb("#6d8588"),
            },
        ),
        (
            "02-glass-teal",
            "solid",
            "solid",
            {
                "active_top": rgb("#15c6ba"),
                "active_bottom": rgb("#087d76"),
                "active_outline": rgb("#077870"),
                "active_shadow": rgb("#078c83", 64),
                "active_text": rgb("#ffffff"),
                "active_fill": rgb("#0d9d92"),
                "icon_active_bg": rgb("#ffffff", 42),
                "icon_active": rgb("#ffffff"),
                "icon_idle_bg": rgb("#edf4f5"),
                "icon_idle": rgb("#6f8186"),
                "idle_text": rgb("#1f3438"),
                "seg_bg": rgb("#ffffff", 242),
                "seg_outline": rgb("#cadade"),
                "seg_shadow": rgb("#112b34", 30),
                "seg_active_top": rgb("#12b7ad"),
                "seg_active_bottom": rgb("#075e58"),
                "seg_active_shadow": rgb("#065e58", 74),
                "seg_active_text": rgb("#ffffff"),
                "seg_text": rgb("#52656b"),
                "primary_top": rgb("#18c8bd"),
                "primary_bottom": rgb("#075f59"),
                "primary_outline": rgb("#075f59"),
                "primary_shadow": rgb("#075f59", 76),
                "primary_highlight": rgb("#9efff4", 120),
                "primary_text": rgb("#ffffff"),
                "link_fill": rgb("#e6fbf8"),
                "link_outline": rgb("#aee5dc"),
                "link_text": rgb("#067b73"),
                "input_affordance": rgb("#edf8f7"),
                "input_icon": rgb("#647a7f"),
            },
        ),
        (
            "03-quiet-outline",
            "outline",
            "outline",
            {
                "active_outline": rgb("#22a69b"),
                "active_shadow": rgb("#083c38", 20),
                "active_text": rgb("#087f78"),
                "active_fill": rgb("#f7fffd"),
                "icon_active_bg": rgb("#e0f4ef"),
                "icon_active": rgb("#087f78"),
                "icon_idle_bg": rgb("#f2f7f8"),
                "icon_idle": rgb("#71858a"),
                "idle_text": rgb("#243a3e"),
                "seg_bg": rgb("#ffffff", 240),
                "seg_outline": rgb("#d3e0e4"),
                "seg_shadow": rgb("#172c34", 18),
                "seg_active_fill": rgb("#f0fffc"),
                "seg_active_outline": rgb("#26a79c"),
                "seg_active_text": rgb("#07867d"),
                "seg_text": rgb("#5f7076"),
                "primary_fill": rgb("#0f9f96"),
                "primary_outline": rgb("#087d76"),
                "primary_shadow": rgb("#087d76", 42),
                "primary_text": rgb("#ffffff"),
                "link_fill": rgb("#ffffff"),
                "link_outline": rgb("#b7deda"),
                "link_text": rgb("#07867d"),
                "input_affordance": rgb("#f7fbfb"),
                "input_icon": rgb("#687c82"),
            },
        ),
    ]
    for name, style, active_style, palette in variants:
        print(render_variant(name, palette, style=style, active_style=active_style))


if __name__ == "__main__":
    main()
