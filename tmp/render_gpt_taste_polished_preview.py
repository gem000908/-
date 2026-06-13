from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


OUT = Path(__file__).with_name("gpt-taste-polished-preview.png")
W, H = 1440, 960
S = 2


def scaled(value):
    return int(round(value * S))


def rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def font(size, weight="regular"):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if weight == "bold" else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\seguisb.ttf" if weight == "bold" else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for item in candidates:
        path = Path(item)
        if path.exists():
            return ImageFont.truetype(str(path), scaled(size))
    return ImageFont.load_default()


FONT = {
    "h1": font(46, "bold"),
    "h2": font(18, "bold"),
    "body": font(14),
    "body_bold": font(14, "bold"),
    "small": font(12),
    "small_bold": font(12, "bold"),
    "metric": font(31, "bold"),
    "button": font(16, "bold"),
    "brand": font(15, "bold"),
}


def draw_text(draw, xy, text, fill="#101820", f="body", anchor=None):
    draw.text((scaled(xy[0]), scaled(xy[1])), text, fill=rgb(fill), font=FONT[f], anchor=anchor)


def text_size(draw, text, f="body"):
    box = draw.textbbox((0, 0), text, font=FONT[f])
    return (box[2] - box[0]) / S, (box[3] - box[1]) / S


def rounded(draw, box, radius, fill, outline=None, width=1):
    box = tuple(scaled(v) for v in box)
    draw.rounded_rectangle(box, radius=scaled(radius), fill=fill, outline=outline, width=scaled(width))


def shadowed_card(base, box, radius=18, fill=(255, 255, 255, 232), outline=(190, 203, 211, 220), shadow=(24, 38, 50, 24)):
    x1, y1, x2, y2 = [scaled(v) for v in box]
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle((x1, y1, x2, y2), radius=scaled(radius), fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(scaled(14)))
    base.alpha_composite(layer, (0, scaled(9)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((x1, y1, x2, y2), radius=scaled(radius), fill=fill, outline=outline, width=scaled(1))
    return d


def gradient_bg():
    img = Image.new("RGBA", (scaled(W), scaled(H)), (249, 251, 250, 255))
    pix = img.load()
    c1, c2, c3 = rgb("#f9fbfa"), rgb("#eef3f2"), rgb("#f7f4ef")
    for y in range(img.height):
        t = y / max(1, img.height - 1)
        for x in range(img.width):
            u = x / max(1, img.width - 1)
            a = min(1, (u + t) / 1.55)
            mid = tuple(int(c1[i] * (1 - a) + c2[i] * a) for i in range(3))
            b = max(0, (u - 0.55) * 1.8)
            col = tuple(int(mid[i] * (1 - b) + c3[i] * b) for i in range(3))
            pix[x, y] = (*col, 255)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((scaled(-120), scaled(-84), scaled(330), scaled(320)), fill=(35, 88, 230, 34))
    od.ellipse((scaled(1020), scaled(-140), scaled(1580), scaled(410)), fill=(7, 134, 125, 42))
    od.ellipse((scaled(860), scaled(620), scaled(1500), scaled(1120)), fill=(201, 130, 20, 20))
    overlay = overlay.filter(ImageFilter.GaussianBlur(scaled(42)))
    img.alpha_composite(overlay)
    return img


def icon_nav(d, cx, cy, kind, active=False):
    color = rgb("#ffffff" if active else "#7a8a94")
    x, y = scaled(cx), scaled(cy)
    if kind == "overview":
        d.line((x - scaled(7), y + scaled(5), x, y - scaled(3), x + scaled(7), y + scaled(5)), fill=color, width=scaled(2))
        d.rounded_rectangle((x - scaled(7), y + scaled(4), x + scaled(7), y + scaled(11)), radius=scaled(2), outline=color, width=scaled(2))
    elif kind == "plus":
        d.line((x - scaled(6), y, x + scaled(6), y), fill=color, width=scaled(2))
        d.line((x, y - scaled(6), x, y + scaled(6)), fill=color, width=scaled(2))
    elif kind == "grid":
        d.rounded_rectangle((x - scaled(7), y - scaled(7), x + scaled(7), y + scaled(7)), radius=scaled(3), outline=color, width=scaled(2))
    elif kind == "list":
        for off in [-5, 0, 5]:
            d.line((x - scaled(7), y + scaled(off), x + scaled(7), y + scaled(off)), fill=color, width=scaled(2))
    else:
        d.line((x, y - scaled(8), x, y + scaled(8)), fill=color, width=scaled(2))
        d.line((x - scaled(5), y + scaled(3), x, y + scaled(8), x + scaled(5), y + scaled(3)), fill=color, width=scaled(2))


def progress(d, x, y, w, pct, fill="#07867d"):
    rounded(d, (x, y, x + w, y + 9), 99, rgb("#e5ecef"))
    rounded(d, (x, y, x + max(7, w * pct), y + 9), 99, rgb(fill))


def draw_input(d, box, text, chevron=False):
    rounded(d, box, 12, (255, 255, 255, 236), rgb("#d4dfe5"))
    draw_text(d, (box[0] + 12, box[1] + 12), text, "#1a2730", "body")
    if chevron:
        draw_text(d, (box[2] - 20, box[1] + 12), "⌄", "#6f7b84", "body_bold")


def draw_metric(base, box, title, value, caption, accent, kind):
    d = shadowed_card(base, box, radius=16)
    x1, y1, x2, y2 = box
    wash = Image.new("RGBA", base.size, (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse((scaled(x2 - 92), scaled(y2 - 82), scaled(x2 + 44), scaled(y2 + 54)), fill=(*rgb(accent), 24))
    base.alpha_composite(wash)
    draw_text(d, (x1 + 18, y1 + 20), title, "#66727c", "small_bold")
    draw_text(d, (x1 + 18, y1 + 48), value, "#101820", "metric")
    draw_text(d, (x1 + 18, y1 + 91), caption, "#66727c", "small")
    rounded(d, (x2 - 66, y1 + 18, x2 - 18, y1 + 66), 15, (*rgb(accent), 28))
    cx, cy = x2 - 42, y1 + 42
    col = rgb(accent)
    if kind == "spent":
        d.rounded_rectangle((scaled(cx - 9), scaled(cy - 9), scaled(cx + 9), scaled(cy + 9)), radius=scaled(4), outline=col, width=scaled(2))
        d.line((scaled(cx - 4), scaled(cy), scaled(cx - 1), scaled(cy + 4), scaled(cx + 6), scaled(cy - 5)), fill=col, width=scaled(2))
    elif kind == "remaining":
        d.rounded_rectangle((scaled(cx - 11), scaled(cy - 7), scaled(cx + 11), scaled(cy + 8)), radius=scaled(5), outline=col, width=scaled(2))
        d.ellipse((scaled(cx + 4), scaled(cy - 1), scaled(cx + 8), scaled(cy + 3)), fill=col)
    else:
        for i, h in enumerate([12, 18, 24]):
            bx = cx - 10 + i * 8
            d.rounded_rectangle((scaled(bx), scaled(cy + 12 - h), scaled(bx + 4), scaled(cy + 12)), radius=scaled(2), fill=col)


def main():
    img = gradient_bg()
    d = ImageDraw.Draw(img)

    # Sidebar
    rounded(d, (0, 0, 236, 960), 0, (255, 255, 255, 184), rgb("#d5e0e6"))
    rounded(d, (16, 26, 54, 64), 12, rgb("#2358e6"))
    draw_text(d, (35, 35), "￥", "#ffffff", "brand", anchor="ma")
    draw_text(d, (60, 30), "每日记账", "#101820", "brand")
    draw_text(d, (60, 51), "本地支出流水", "#66727c", "small")

    navs = [
        ("总览", "overview", True),
        ("记一笔", "plus", False),
        ("分类与预算", "grid", False),
        ("流水明细", "list", False),
        ("导入导出", "arrow", False),
    ]
    for i, (label, kind, active) in enumerate(navs):
        y = 88 + i * 48
        if active:
            rounded(d, (14, y, 206, y + 42), 12, rgb("#eaf0ff"), rgb("#c4d3ff"))
        rounded(d, (27, y + 8, 53, y + 34), 9, rgb("#2358e6") if active else rgb("#eef3f5"))
        icon_nav(d, 40, y + 21, kind, active)
        draw_text(d, (62, y + 12), label, "#2358e6" if active else "#26333d", "body_bold")

    shadowed_card(img, (14, 876, 205, 942), radius=14, fill=(255, 255, 255, 222))
    d = ImageDraw.Draw(img)
    draw_text(d, (28, 892), "数据保存在本机", "#66727c", "small")
    draw_text(d, (28, 916), "1 条流水", "#101820", "brand")

    # Header
    draw_text(d, (244, 74), "总览", "#101820", "h1")
    d.ellipse((scaled(245), scaled(133), scaled(252), scaled(140)), fill=rgb("#07867d"))
    draw_text(d, (263, 129), "每月 · 2026-06-01 至 2026-06-30", "#66727c", "body")
    shadowed_card(img, (837, 86, 1058, 124), radius=13, fill=(255, 255, 255, 210))
    d = ImageDraw.Draw(img)
    for i, label in enumerate(["每周", "每月", "每年"]):
        x = 845 + i * 70
        if label == "每月":
            rounded(d, (x, 90, x + 64, 120), 9, rgb("#2358e6"))
            draw_text(d, (x + 32, 97), label, "#ffffff", "small_bold", anchor="ma")
        else:
            draw_text(d, (x + 32, 97), label, "#5d6871", "small_bold", anchor="ma")

    # Metrics
    metric_boxes = [(244, 150, 506, 262), (520, 150, 782, 262), (796, 150, 1058, 262)]
    draw_metric(img, metric_boxes[0], "已支出", "￥1,248.50", "本周期已记录支出", "#2358e6", "spent")
    draw_metric(img, metric_boxes[1], "剩余", "￥2,251.50", "可用预算", "#07867d", "remaining")
    draw_metric(img, metric_boxes[2], "预算", "￥3,500.00", "3 条启用规则", "#6654d8", "budget")
    d = ImageDraw.Draw(img)

    # Quick add
    shadowed_card(img, (1076, 76, 1416, 411), radius=18, fill=(255, 255, 255, 230))
    d = ImageDraw.Draw(img)
    draw_text(d, (1094, 102), "快速记账", "#101820", "h2")
    draw_text(d, (1327, 103), "完整表单", "#2358e6", "small_bold")
    draw_text(d, (1093, 138), "金额", "#66727c", "small_bold")
    draw_text(d, (1252, 138), "日期", "#66727c", "small_bold")
    draw_input(d, (1093, 156, 1240, 196), "0.00")
    draw_input(d, (1252, 156, 1399, 196), "2026/06/07")
    draw_text(d, (1093, 214), "一级分类", "#66727c", "small_bold")
    draw_text(d, (1252, 214), "二级分类", "#66727c", "small_bold")
    draw_input(d, (1093, 232, 1240, 273), "餐饮", True)
    draw_input(d, (1252, 232, 1399, 273), "外卖", True)
    draw_text(d, (1093, 291), "备注", "#66727c", "small_bold")
    draw_input(d, (1093, 308, 1399, 346), "可选备注")
    rounded(d, (1093, 358, 1399, 394), 12, rgb("#2358e6"))
    draw_text(d, (1246, 366), "保存支出", "#ffffff", "button", anchor="ma")

    # Budget panel
    shadowed_card(img, (244, 282, 1058, 560), radius=18, fill=(255, 255, 255, 230))
    d = ImageDraw.Draw(img)
    draw_text(d, (261, 302), "预算状态", "#101820", "h2")
    draw_text(d, (994, 306), "每月", "#66727c", "small_bold")
    heads = [("分类", 274), ("已支出", 468), ("预算", 581), ("剩余", 695), ("进度", 823)]
    for label, x in heads:
        draw_text(d, (x, 333), label, "#66727c", "small_bold")

    rows = [
        ("餐饮", "每月规则", "￥1,248.50", "￥2,400.00", "￥1,151.50", 0.52, "#07867d", "餐", "#ddf7ef", "#006b62"),
        ("交通", "每月规则", "￥0.00", "￥600.00", "￥600.00", 0.04, "#2358e6", "行", "#e5edff", "#2057dd"),
        ("娱乐", "每月规则", "￥0.00", "￥500.00", "￥500.00", 0.04, "#c98214", "娱", "#fff1d1", "#a46506"),
    ]
    for i, row in enumerate(rows):
        y = 352 + i * 74
        rounded(d, (260, y, 1041, y + 63), 14, (255, 255, 255, 222), rgb("#d6e1e6"))
        name, rule, spent, budget, remaining, pct, color, glyph, orb_fill, orb_text = row
        rounded(d, (274, y + 12, 312, y + 50), 99, rgb(orb_fill))
        draw_text(d, (293, y + 21), glyph, orb_text, "small_bold", anchor="ma")
        draw_text(d, (324, y + 12), name, "#101820", "body_bold")
        draw_text(d, (324, y + 35), rule, "#66727c", "small")
        for x, label, val, val_color in [
            (468, "已支出", spent, "#101820"),
            (581, "预算", budget, "#101820"),
            (695, "剩余", remaining, "#07867d"),
        ]:
            draw_text(d, (x, y + 12), label, "#66727c", "small")
            draw_text(d, (x, y + 33), val, val_color, "small_bold")
        progress(d, 823, y + 28, 144, pct, color)
        draw_text(d, (1000, y + 23), f"{int(0 if pct == 0.04 else pct * 100)}%", "#101820", "small_bold")

    # Recent panel
    shadowed_card(img, (244, 580, 1058, 714), radius=18, fill=(255, 255, 255, 230))
    d = ImageDraw.Draw(img)
    draw_text(d, (261, 604), "最近流水", "#101820", "h2")
    draw_text(d, (980, 606), "查看全部", "#2358e6", "small_bold")
    rounded(d, (260, 640, 1041, 698), 14, (255, 255, 255, 222), rgb("#d8e2e7"))
    rounded(d, (274, 650, 312, 688), 99, rgb("#ddf7ef"))
    draw_text(d, (293, 659), "餐", "#006b62", "small_bold", anchor="ma")
    draw_text(d, (325, 650), "餐饮 / 外卖", "#101820", "body_bold")
    draw_text(d, (325, 674), "团队午餐", "#66727c", "small")
    draw_text(d, (951, 650), "￥1,248.50", "#101820", "body_bold")
    draw_text(d, (962, 674), "2026-06-07", "#66727c", "small")

    # Signals
    shadowed_card(img, (1076, 430, 1416, 714), radius=18, fill=(255, 255, 255, 230))
    d = ImageDraw.Draw(img)
    draw_text(d, (1094, 452), "提醒", "#101820", "h2")
    draw_text(d, (1338, 456), "预算健康", "#66727c", "small_bold")
    for i, (title, left, right, pct) in enumerate([
        ("餐饮预算正常", "已使用 52%", "", 0.52),
        ("没有接近或超支分类", "继续保持当前节奏", "良好", 1.0),
    ]):
        y = 488 + i * 76
        rounded(d, (1093, y, 1399, y + 62), 15, rgb("#f7fafb"), rgb("#dce5e9"))
        draw_text(d, (1108, y + 13), title, "#101820", "body_bold")
        draw_text(d, (1108, y + 38), left, "#66727c", "small")
        if right:
            draw_text(d, (1360, y + 38), right, "#66727c", "small_bold")
        else:
            progress(d, 1292, y + 41, 92, pct, "#07867d")

    rounded(d, (1093, 622, 1399, 698), 16, rgb("#111a22"))
    draw_text(d, (1109, 636), "本月节奏", "#bac5cd", "small")
    draw_text(d, (1109, 657), "日均可用预算约 ￥75", "#ffffff", "h2")
    draw_text(d, (1109, 678), "可直接从快捷记账继续录入", "#d7dde2", "small")

    # Bottom subtle fade
    fade = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    fd.rectangle((scaled(236), scaled(740), scaled(1440), scaled(960)), fill=(255, 255, 255, 70))
    fade = fade.filter(ImageFilter.GaussianBlur(scaled(34)))
    img.alpha_composite(fade)

    img = img.resize((W, H), Image.Resampling.LANCZOS).convert("RGB")
    img.save(OUT, quality=96)
    print(OUT)


if __name__ == "__main__":
    main()
