#!/usr/bin/env python3
"""Generate compendium banner strips (300x70 each) from one source image.

Compendium list is read from system.json "packs" (alphabetical by name).
The source image is scaled proportionally to cover a (BANNER_W x N*BANNER_H)
strip, then sliced into N banners, one per compendium in alphabetical order.

If the source image has real transparency, a 15px transparent margin is kept
on each side (scaled content width = BANNER_W - 2*MARGIN). If the image has
no alpha (fully opaque), it fills the full banner width with no margin.

Usage:
    python generate_banners.py <source_image> [--out-dir assets/art/banners]
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
BANNER_W = 300
BANNER_H = 70
MARGIN = 15


def get_compendium_names(system_json: Path) -> list[str]:
    data = json.loads(system_json.read_text(encoding="utf-8"))
    names = [pack["name"] for pack in data["packs"]]
    return sorted(names)


def has_real_transparency(im: Image.Image) -> bool:
    if im.mode != "RGBA":
        return False
    return im.getchannel("A").getextrema()[0] < 255


def build_strip(src: Image.Image, total_height: int) -> Image.Image:
    src = src.convert("RGBA")
    margin = MARGIN if has_real_transparency(src) else 0
    target_w = BANNER_W - 2 * margin

    ow, oh = src.size
    scale = max(target_w / ow, total_height / oh)
    new_w, new_h = round(ow * scale), round(oh * scale)
    resized = src.resize((new_w, new_h), Image.LANCZOS)

    # center-crop to exactly target_w x total_height
    left = (new_w - target_w) // 2
    top = (new_h - total_height) // 2
    cropped = resized.crop((left, top, left + target_w, top + total_height))

    canvas = Image.new("RGBA", (BANNER_W, total_height), (0, 0, 0, 0))
    canvas.paste(cropped, (margin, 0), cropped)
    return canvas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", help="path to source image")
    parser.add_argument("--out-dir", default=str(ROOT / "assets" / "art" / "banners"))
    parser.add_argument("--system-json", default=str(ROOT / "system.json"))
    args = parser.parse_args()

    src_path = Path(args.source)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    names = get_compendium_names(Path(args.system_json))
    n = len(names)
    total_height = BANNER_H * n

    src = Image.open(src_path)
    strip = build_strip(src, total_height)

    for i, name in enumerate(names):
        piece = strip.crop((0, i * BANNER_H, BANNER_W, (i + 1) * BANNER_H))
        out_path = out_dir / f"banner_{name}.webp"
        piece.save(out_path, "WEBP", lossless=True)
        print(f"wrote {out_path} ({piece.size[0]}x{piece.size[1]})")


if __name__ == "__main__":
    sys.exit(main())
