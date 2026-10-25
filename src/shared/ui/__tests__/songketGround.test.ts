import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import { semanticColors } from '@/theme/tokens/colors';

const DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'songket');
const COLOR_TYPE_RGB = 2;

/** What the PNG header says, and the colour of its first pixel (the corner, where no thread is woven). */
function readPng(name: string) {
  const png = fs.readFileSync(path.join(DIR, name));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idat: Buffer[] = [];
  let at = 8;
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  // The first row's first byte is its filter; the first pixel has no neighbours, so its bytes are as stored.
  const first = zlib.inflateSync(Buffer.concat(idat)).subarray(1, 4);
  const hex = `#${[...first].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  return { width, height, bitDepth: png[24], colorType: png[25], corner: hex, bytes: png.length };
}

/**
 * The songket wall is transparent (gold about 20%, ink about 12%): blended over the canvas it is a full-screen
 * blend on every frame. The ground (scripts/songket-ground.js) is the same thread already blended onto the
 * canvas colour: opaque, so it draws with no blending.
 */
describe.each([
  ['dark', 'ground-dark.png', 'wall-dark.png'],
  ['light', 'ground-light.png', 'wall-light.png'],
] as const)('the %s songket ground', (scheme, ground, wall) => {
  it('is an opaque RGB image, the size of the wall it was made from, with no alpha channel', () => {
    const image = readPng(ground);

    expect(image).toMatchObject({ width: 1170, height: 2532, bitDepth: 8, colorType: COLOR_TYPE_RGB });
    expect(image).toMatchObject({ width: readPng(wall).width, height: readPng(wall).height });
  });

  it("is the scheme's canvas colour where no thread is woven, so it can stand in for the canvas fill", () => {
    expect(readPng(ground).corner).toBe(semanticColors[scheme].canvas.toUpperCase());
  });

  it('carries the thread, so it is not a flat fill, and is smaller than a screen of raw pixels', () => {
    const { bytes } = readPng(ground);

    expect(bytes).toBeGreaterThan(5_000);
    expect(bytes).toBeLessThan(1170 * 2532 * 3);
  });
});
