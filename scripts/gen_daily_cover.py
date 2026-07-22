#!/usr/bin/env python3
"""每日核心封面生成器（ybq.me 固定版式 · 1200x630）

用法：
  python3 scripts/gen_daily_cover.py --num 4 --title "标题" --subtitle "副标题第一行[,第二行]" --quote "金句" --out static/images/covers/YYYY-MM-DD-NNN-slug.png

字体：优先 Kimi Work 托管运行时自带 NotoSansSC，回退系统字体。
"""
import argparse, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_W, BASE_H = 1200, 630
BG = (250, 247, 240); NAVY = (31, 41, 66); GOLD = (176, 141, 74)
GRAY = (110, 110, 110); PALE = (232, 224, 205); BORDER = (200, 190, 165)
BADGE = (90, 100, 130)

FONT_CANDIDATES = [
    ("/Users/apple/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/python/fonts/NotoSansSC-Bold.ttf",
     "/Users/apple/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/python/fonts/NotoSansSC-Regular.ttf"),
    ("/System/Library/Fonts/STHeiti Medium.ttc", "/System/Library/Fonts/STHeiti Light.ttc"),
    ("/System/Library/Fonts/Hiragino Sans GB.ttc", "/System/Library/Fonts/Hiragino Sans GB.ttc"),
]

def font_pair():
    for b, r in FONT_CANDIDATES:
        if Path(b).exists() and Path(r).exists():
            return b, r
    sys.exit("找不到可用中文字体，请检查 FONT_CANDIDATES")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--num", required=True, help="期号，如 4")
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", default="", help="多行用英文逗号分隔")
    ap.add_argument("--quote", required=True)
    ap.add_argument("--badge", default="每日核心")
    ap.add_argument("--bignum", default=None, help="右下角大数字，默认 %03d")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=2, help="渲染倍数，默认 2（2400x1260 高清）")
    a = ap.parse_args()

    S = a.scale
    W, H = BASE_W * S, BASE_H * S
    bold, reg = font_pair()
    F = lambda size, b=True: ImageFont.truetype(bold if b else reg, size * S)

    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([8*S, 8*S, W - 9*S, H - 9*S], radius=22, outline=BORDER, width=2*S)

    # 徽标（宽度自适应）
    bf = F(26)
    bw = d.textlength(a.badge, font=bf)
    d.rounded_rectangle([48*S, 48*S, 48*S + bw + 52*S, 100*S], radius=26, fill=BADGE)
    d.text((48*S + (bw + 52*S) / 2, 74*S), a.badge, font=bf, fill="white", anchor="mm")

    d.text((1140*S, 74*S), f"#{a.num}", font=F(30), fill=GOLD, anchor="mm")

    tf = F(64)
    d.text((60*S, 185*S), a.title, font=tf, fill=NAVY)
    tw = min(d.textlength(a.title, font=tf), 620)
    d.rounded_rectangle([62*S, 245*S, 62*S + max(tw * 0.35, 120*S), 255*S], radius=4, fill=GOLD)

    y = 300*S
    for line in [s for s in a.subtitle.split(",") if s]:
        d.text((60*S, y), line, font=F(30, False), fill=GRAY)
        y += 50*S

    bignum = a.bignum or f"{int(a.num):03d}"
    d.text((1180*S, 600*S), bignum, font=F(300), fill=PALE, anchor="rs")

    qf = F(30)
    qw = d.textlength(a.quote, font=qf)
    pw = qw + 90*S
    x0 = (W - pw) / 2
    d.rounded_rectangle([x0, 515*S, x0 + pw, 580*S], radius=32, fill=NAVY)
    d.text((W / 2, 547*S), a.quote, font=qf, fill="white", anchor="mm")

    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    im.save(a.out)
    print(f"saved: {a.out}")

if __name__ == "__main__":
    main()
