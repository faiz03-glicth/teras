"""Writes every Teras app icon from the Core Orb geometry in orb.py.

Run after changing the orb or the theme colours:  python scripts/build-icons.py
An icon only reaches a phone through a native rebuild (npx expo run:android), never a reload.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orb import PARCHMENT, WALNUT, draw_orb  # noqa: E402

# The icon's mark is the songket's muted grey: the face on dark grounds, the shadow on parchment.
MARK = '#8C8C8C'
MARK_ON_LIGHT = '#4A4A4A'

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'assets')

# Android's adaptive mask cuts to the middle 66%, so the orb is smaller on that layer.
FULL = 0.62
SAFE = 0.46
SPLASH = 0.86

JOBS = [
    # (file, size, colour, background, orb fraction, keep alpha)
    ('icon.png', 1024, MARK, WALNUT, FULL, False),
    ('icon-light.png', 1024, MARK_ON_LIGHT, PARCHMENT, FULL, False),
    ('icon-dark.png', 1024, MARK, WALNUT, FULL, False),
    ('icon-tinted.png', 1024, '#D8D8D8', '#000000', FULL, False),
    ('android-icon-foreground.png', 1024, MARK, None, SAFE, True),
    ('android-icon-monochrome.png', 1024, '#FFFFFF', None, SAFE, True),
    ('splash-icon.png', 1024, MARK_ON_LIGHT, None, SPLASH, True),
    ('splash-icon-dark.png', 1024, MARK, None, SPLASH, True),
    ('favicon.png', 64, MARK, WALNUT, FULL, False),
]

for name, size, colour, background, fraction, alpha in JOBS:
    im = draw_orb(size, colour, background, fraction)
    if not alpha:
        im = im.convert('RGB')  # App Store icons must carry no alpha channel
    im.save(os.path.join(ASSETS, name), optimize=True)
    print(f'{name}  {size}x{size}  {"RGBA" if alpha else "RGB"}')
