/**
 * Writes the songket pictures in assets/songket/:
 *  - ground-dark.png and ground-light.png: the songket wall pre-composited on the canvas (below);
 *  - cta-face@3x.png and cta-shadow.png: the engraved face and the soft drop shadow of the big gold buttons
 *    in Black (the end of this file).
 *
 * Run after changing a wall or the engraving:  node scripts/songket-ground.js
 * The walls (wall-dark.png, wall-light.png) are transparent: gold at about 20% in Black, ink at about 12% in
 * Parchment. Drawn over the canvas that is a blended full-screen image on every frame, and a full-screen
 * blend is what a mobile GPU is slowest at. Here the thread is blended onto the canvas colour ONCE, and the
 * result written as an OPAQUE image (8-bit RGB, no alpha channel): smaller, and drawn with no blending at all.
 * SongketWall shows it as the screen's whole background.
 *
 * The canvas colours below are the theme's (src/theme/tokens/colors.ts, `canvas`); a test keeps them in step.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(path.dirname(__dirname), 'assets', 'songket');

const GROUNDS = [
  { wall: 'wall-dark.png', ground: 'ground-dark.png', canvas: [0x0b, 0x0b, 0x0c] },
  { wall: 'wall-light.png', ground: 'ground-light.png', canvas: [0xf6, 0xe7, 0xb6] },
];

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPE_RGB = 2;
const COLOR_TYPE_RGBA = 6;

/** Decodes an 8-bit, non-interlaced RGBA PNG into its width, height and raw pixels (4 bytes each). */
function decodeRgba(file) {
  const png = fs.readFileSync(file);
  if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error(`${file}: not a PNG`);
  let at = 8;
  let width = 0;
  let height = 0;
  const data = [];
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('ascii', at + 4, at + 8);
    if (type === 'IHDR') {
      width = png.readUInt32BE(at + 8);
      height = png.readUInt32BE(at + 12);
      const ok = png[at + 16] === 8 && png[at + 17] === COLOR_TYPE_RGBA && png[at + 20] === 0;
      if (!ok) throw new Error(`${file}: need an 8-bit, non-interlaced RGBA PNG`);
    }
    if (type === 'IDAT') data.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(stride * height);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      row[x] = (line[x] + predictor(filter, left, up, upLeft)) & 255;
    }
    row.copy(pixels, y * stride);
    previous = row;
  }
  return { width, height, pixels };
}

/** What a PNG filter type predicts from the pixel to the left, above and above-left. */
function predictor(filter, left, up, upLeft) {
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return (left + up) >> 1;
  if (filter === 4) return paeth(left, up, upLeft);
  return 0;
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
}

/** Each pixel of the wall blended onto the canvas colour: the colour it would have on screen, as RGB. */
function compositeOnto(canvas, { width, height, pixels }) {
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const alpha = pixels[i * 4 + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      const thread = pixels[i * 4 + channel];
      rgb[i * 3 + channel] = Math.round(thread * alpha + canvas[channel] * (1 - alpha));
    }
  }
  return rgb;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Encodes 8-bit pixels (RGB, or RGBA with `colorType` 6) as a PNG. Every row takes the filter that leaves it the least to compress. */
function encodePng({ width, height }, pixels, colorType = COLOR_TYPE_RGB) {
  const bytesPerPixel = colorType === COLOR_TYPE_RGBA ? 4 : 3;
  const stride = width * bytesPerPixel;
  const rows = [];
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    let best = null;
    for (const filter of [0, 1, 2, 4]) {
      const line = Buffer.alloc(stride + 1);
      line[0] = filter;
      let cost = 0;
      for (let x = 0; x < stride; x++) {
        const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
        const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
        const residual = (row[x] - predictor(filter, left, previous[x], upLeft)) & 255;
        line[x + 1] = residual;
        cost += residual < 128 ? residual : 256 - residual;
      }
      if (best === null || cost < best.cost) best = { cost, line };
    }
    rows.push(best.line);
    previous = row;
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const { wall, ground, canvas } of GROUNDS) {
  const image = decodeRgba(path.join(DIR, wall));
  const png = encodePng(image, compositeOnto(canvas, image));
  fs.writeFileSync(path.join(DIR, ground), png);
  console.log(`${ground}: ${image.width}x${image.height} opaque RGB, ${png.length} bytes`);
}

/*
 * The big gold buttons in Black (src/shared/ui/GoldFace.tsx). Both pictures are drawn here once, so the app
 * paints a bitmap and never a pattern, a gradient or a blur.
 */

/**
 * The engraving of the "Teras Refined" mockup (Main.dc.html, `engr`): a 30 x 24 tile of teluk berantai and
 * pucuk rebung on a one-unit thread grid, each cell a unit square ("Mx yhwvhh-w" is one rectangle).
 */
const ENGRAVING =
  'M4 2h1v2h-1M14 2h1v2h-1M24 2h1v2h-1M3 4h1v2h-1M5 4h1v2h-1M13 4h1v2h-1M15 4h1v2h-1M23 4h1v2h-1M25 4h1v2h-1M2 6h1v2h-1M4 6h1v2h-1M6 6h1v2h-1M12 6h1v2h-1M14 6h1v2h-1M16 6h1v2h-1M22 6h1v2h-1M24 6h1v2h-1M26 6h1v2h-1M1 8h1v2h-1M3 8h1v2h-1M5 8h1v2h-1M7 8h1v2h-1M11 8h1v2h-1M13 8h1v2h-1M15 8h1v2h-1M17 8h1v2h-1M21 8h1v2h-1M23 8h1v2h-1M25 8h1v2h-1M27 8h1v2h-1M0 10h1v2h-1M2 10h1v2h-1M6 10h1v2h-1M8 10h1v2h-1M10 10h1v2h-1M12 10h1v2h-1M16 10h1v2h-1M18 10h1v2h-1M20 10h1v2h-1M22 10h1v2h-1M26 10h1v2h-1M28 10h1v2h-1M0 13h30v1h-30M0 15h30v1h-30M4 17h1v1h-1M12 17h1v1h-1M20 17h1v1h-1M28 17h1v1h-1M0 18h1v1h-1M3 18h1v1h-1M5 18h1v1h-1M8 18h1v1h-1M11 18h1v1h-1M13 18h1v1h-1M16 18h1v1h-1M19 18h1v1h-1M21 18h1v1h-1M24 18h1v1h-1M27 18h1v1h-1M29 18h1v1h-1M2 19h1v1h-1M6 19h1v1h-1M10 19h1v1h-1M14 19h1v1h-1M18 19h1v1h-1M22 19h1v1h-1M26 19h1v1h-1M1 20h1v1h-1M4 20h1v1h-1M7 20h1v1h-1M9 20h1v1h-1M12 20h1v1h-1M15 20h1v1h-1M17 20h1v1h-1M20 20h1v1h-1M23 20h1v1h-1M25 20h1v1h-1M28 20h1v1h-1M0 21h1v1h-1M8 21h1v1h-1M16 21h1v1h-1M24 21h1v1h-1';
const TILE_UNITS = { width: 30, height: 24 };
/** One thread unit is 3 pixels: the picture is a 3x one, so it is 30 x 24 pt on a 3x phone. */
const TILE_SCALE = 3;
/**
 * The groove is a darker gold pressed into the face, and the light catches the groove's lower-right lip
 * (the same cells, one unit down and right, underneath): gold on gold, never louder than the label.
 */
const GROOVE = { color: [0x7a, 0x4a, 0x12], alpha: 0.13, shift: 0 };
const LIP = { color: [0xff, 0xf3, 0xc9], alpha: 0.22, shift: 1 };

/** The unit cells the engraving's rectangles cover. */
function engravingCells(d) {
  const cells = [];
  const rectangles = [...d.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)/g)];
  if (rectangles.length !== d.split('M').length - 1) throw new Error('engraving: a rectangle was not understood');
  for (const [, x, y, w, h, back] of rectangles) {
    if (w !== back) throw new Error('engraving: a rectangle does not close');
    for (let row = 0; row < +h; row++) for (let col = 0; col < +w; col++) cells.push([+x + col, +y + row]);
  }
  return cells;
}

/** The tile as RGBA: the lip under the groove, composited, wrapped so the tile repeats without a seam. */
function paintEngravingTile() {
  const { width: unitsX, height: unitsY } = TILE_UNITS;
  const cells = engravingCells(ENGRAVING);
  const covered = (layer) => {
    const grid = Array.from({ length: unitsY }, () => new Array(unitsX).fill(false));
    for (const [x, y] of cells) grid[(y + layer.shift) % unitsY][(x + layer.shift) % unitsX] = true;
    return grid;
  };
  const layers = [LIP, GROOVE].map((layer) => ({ ...layer, grid: covered(layer) }));

  const width = unitsX * TILE_SCALE;
  const height = unitsY * TILE_SCALE;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ux = Math.floor(x / TILE_SCALE);
      const uy = Math.floor(y / TILE_SCALE);
      let alpha = 0;
      const colour = [0, 0, 0];
      for (const layer of layers) {
        if (!layer.grid[uy][ux]) continue;
        for (let channel = 0; channel < 3; channel++) {
          colour[channel] = colour[channel] * (1 - layer.alpha) + layer.color[channel] * layer.alpha;
        }
        alpha = alpha * (1 - layer.alpha) + layer.alpha;
      }
      const at = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) rgba[at + channel] = alpha === 0 ? 0 : Math.round(colour[channel] / alpha);
      rgba[at + 3] = Math.round(alpha * 255);
    }
  }
  return { width, height, rgba };
}

/**
 * The soft drop shadow under a big gold button: the mockup's `0 10px 14px rgba(0,0,0,0.6)`, one picture the
 * button stretches across its width. In Black the 6pt ledge lies inside the button's box, so the shadow
 * (10 down) sits 4 below the box's bottom edge. The picture is the strip below that edge: 20 rows, as wide
 * as a full-width button (358) and `pad` each side for the blur. It is a blurred rounded rectangle, rendered
 * here (a Gaussian, sigma = blur / 2), not blurred by the phone.
 */
const SHADOW = { box: 358, pad: 14, rows: 20, radius: 14, sigma: 7, drop: 4, alpha: 0.6 };

function insideShadowBox(x, y) {
  const { box, radius, drop } = SHADOW;
  if (x < 0 || x > box || y > drop) return false;
  const cornerY = drop - radius;
  if (y <= cornerY || (x >= radius && x <= box - radius)) return true;
  const cornerX = x < radius ? radius : box - radius;
  return (x - cornerX) ** 2 + (y - cornerY) ** 2 <= radius ** 2;
}

function paintShadow() {
  const { box, pad, rows, sigma, alpha } = SHADOW;
  const width = box + pad * 2;
  const reach = Math.ceil(sigma * 3);
  const weights = [];
  let total = 0;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      weights.push([dx, dy, weight]);
      total += weight;
    }
  }
  const rgba = Buffer.alloc(width * rows * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      let lit = 0;
      for (const [dx, dy, weight] of weights) {
        if (insideShadowBox(x - pad + 0.5 + dx, y + 0.5 + dy)) lit += weight;
      }
      rgba[(y * width + x) * 4 + 3] = Math.round((lit / total) * alpha * 255);
    }
  }
  return { width, height: rows, rgba };
}

const CTA_PICTURES = [
  { file: 'cta-face@3x.png', paint: paintEngravingTile },
  { file: 'cta-shadow.png', paint: paintShadow },
];
for (const { file, paint } of CTA_PICTURES) {
  const image = paint();
  const png = encodePng(image, image.rgba, COLOR_TYPE_RGBA);
  fs.writeFileSync(path.join(DIR, file), png);
  console.log(`${file}: ${image.width}x${image.height} RGBA, ${png.length} bytes`);
}
