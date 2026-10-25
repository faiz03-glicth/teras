/**
 * Writes assets/songket/ground-dark.png and ground-light.png: the songket wall pre-composited on the canvas.
 *
 * Run after changing a wall:  node scripts/songket-ground.js
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

/** Encodes 8-bit RGB pixels as a PNG. Every row takes the filter that leaves it the least to compress. */
function encodeRgb({ width, height }, rgb) {
  const stride = width * 3;
  const rows = [];
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = rgb.subarray(y * stride, (y + 1) * stride);
    let best = null;
    for (const filter of [0, 1, 2, 4]) {
      const line = Buffer.alloc(stride + 1);
      line[0] = filter;
      let cost = 0;
      for (let x = 0; x < stride; x++) {
        const left = x >= 3 ? row[x - 3] : 0;
        const upLeft = x >= 3 ? previous[x - 3] : 0;
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
  header[9] = COLOR_TYPE_RGB;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const { wall, ground, canvas } of GROUNDS) {
  const image = decodeRgba(path.join(DIR, wall));
  const png = encodeRgb(image, compositeOnto(canvas, image));
  fs.writeFileSync(path.join(DIR, ground), png);
  console.log(`${ground}: ${image.width}x${image.height} opaque RGB, ${png.length} bytes`);
}
