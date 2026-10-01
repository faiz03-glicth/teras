"""Draws the Teras Core Orb: concentric broken rings around a solid core.

One master is drawn at 4x and downsampled, so every asset comes from the same geometry.
Colours are the app's own tokens (src/theme/tokens): brand gold on walnut, accentText on parchment.
"""

import sys
from PIL import Image, ImageDraw

GOLD = '#FFD179'  # BRAND_GOLD
WALNUT = '#16110C'  # dark canvas
PARCHMENT = '#F6E7B6'  # light canvas
BRONZE = '#7A4A12'  # light accentText: gold is unreadable on parchment, so a gold mark uses this

SS = 4  # supersample

# Rings, from the outside in: (radius as a fraction of the orb radius, stroke, gap degrees, rotation)
RINGS = [
    (1.00, 0.115, 30, 35),
    (0.75, 0.105, 30, 125),
    (0.51, 0.095, 0, 0),
]
CORE = 0.25


def draw_orb(size, colour, background, orb_fraction):
    """An orb `orb_fraction` of `size` across, centred on `background` (None: transparent)."""
    s = size * SS
    im = Image.new('RGBA', (s, s), background or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    centre = s / 2
    radius = s * orb_fraction / 2

    for fraction, stroke, gap, rotation in RINGS:
        r = radius * fraction
        width = max(1, round(radius * stroke))
        # Stroke straddles the radius, so the outermost ring stays inside the orb.
        r -= width / 2
        box = (centre - r, centre - r, centre + r, centre + r)
        if gap == 0:
            d.ellipse(box, outline=colour, width=width)
            continue
        # Two arcs, with a gap at each end of the axis the ring is rotated to.
        for start in (rotation + gap / 2, rotation + 180 + gap / 2):
            d.arc(box, start=start, end=start + 180 - gap, fill=colour, width=width)

    core = radius * CORE
    d.ellipse((centre - core, centre - core, centre + core, centre + core), fill=colour)
    return im.resize((size, size), Image.LANCZOS)


VARIANTS = {
    'gold-on-walnut': (GOLD, WALNUT),
    'bronze-on-parchment': (BRONZE, PARCHMENT),
    'gold-clear': (GOLD, None),
    'bronze-clear': (BRONZE, None),
    'white-clear': ('#FFFFFF', None),
    'grey-on-black': ('#D8D8D8', '#000000'),
    'walnut-flat': (WALNUT, WALNUT),
    'parchment-flat': (PARCHMENT, PARCHMENT),
}


def build(name, size, variant, orb_fraction):
    colour, background = VARIANTS[variant]
    if variant.endswith('-flat'):  # a plain background layer, no mark
        return Image.new('RGBA', (size, size), background)
    im = draw_orb(size, colour, background, orb_fraction)
    return im


if __name__ == '__main__':
    out = sys.argv[1]
    for name, size, variant, fraction in [
        ('preview-dark', 512, 'gold-on-walnut', 0.62),
        ('preview-light', 512, 'bronze-on-parchment', 0.62),
        ('preview-mono', 512, 'white-clear', 0.50),
    ]:
        build(name, size, variant, fraction).save(f'{out}/{name}.png')
    print('ok')
