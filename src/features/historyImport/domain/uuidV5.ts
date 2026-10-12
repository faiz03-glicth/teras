/**
 * Name-based UUIDs (RFC 4122 version 5: SHA-1 of a namespace and a name). The same name always gives the
 * same id, which is what makes the history import safe to run again: a row it already wrote gets the id it
 * already has. Synchronous and dependency-free, so the import plan stays pure.
 */

const utf8 = (text: string): number[] => [...new TextEncoder().encode(text)];

const rotl = (value: number, bits: number) => (value << bits) | (value >>> (32 - bits));

/** PURE: SHA-1 of `bytes` (FIPS 180-4), as 20 bytes. */
export function sha1(bytes: readonly number[]): number[] {
  const bitLength = bytes.length * 8;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  // The message length in bits, big-endian, in the last 8 bytes (high word first).
  const high = Math.floor(bitLength / 0x100000000);
  for (const word of [high, bitLength >>> 0]) {
    padded.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  }

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i += 1) {
      const at = block + i * 4;
      w[i] =
        ((padded[at] ?? 0) << 24) |
        ((padded[at + 1] ?? 0) << 16) |
        ((padded[at + 2] ?? 0) << 8) |
        (padded[at + 3] ?? 0);
    }
    for (let i = 16; i < 80; i += 1) {
      w[i] = rotl((w[i - 3] ?? 0) ^ (w[i - 8] ?? 0) ^ (w[i - 14] ?? 0) ^ (w[i - 16] ?? 0), 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i += 1) {
      const [f, k] =
        i < 20
          ? [(b & c) | (~b & d), 0x5a827999]
          : i < 40
            ? [b ^ c ^ d, 0x6ed9eba1]
            : i < 60
              ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc]
              : [b ^ c ^ d, 0xca62c1d6];
      const next = (rotl(a, 5) + f + e + k + (w[i] ?? 0)) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = next;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }
  return [h0, h1, h2, h3, h4].flatMap((h) => [
    (h >>> 24) & 0xff,
    (h >>> 16) & 0xff,
    (h >>> 8) & 0xff,
    h & 0xff,
  ]);
}

const hex = (bytes: readonly number[]) => bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** PURE: the version-5 UUID of `name` in `namespace` (itself a UUID, e.g. "6ba7b810-…"). */
export function uuidV5(name: string, namespace: string): string {
  const space = namespace.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(space)) throw new Error('uuidV5 needs a UUID namespace');
  const spaceBytes = Array.from({ length: 16 }, (_, i) => parseInt(space.slice(i * 2, i * 2 + 2), 16));
  const digest = sha1([...spaceBytes, ...utf8(name)]).slice(0, 16);
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  const id = hex(digest);
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
