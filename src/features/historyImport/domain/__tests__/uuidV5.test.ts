import { createHash } from 'crypto';

import { sha1, uuidV5 } from '../uuidV5';

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const bytes = (text: string) => [...Buffer.from(text, 'utf8')];

describe('sha1', () => {
  it('matches Node for empty, short, block-edge and multi-block input', () => {
    for (const text of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'ünïcödé '.repeat(40)]) {
      expect(Buffer.from(sha1(bytes(text))).toString('hex')).toBe(
        createHash('sha1').update(text, 'utf8').digest('hex'),
      );
    }
  });
});

describe('uuidV5', () => {
  it('gives the RFC 4122 example id for www.example.com in the DNS namespace', () => {
    expect(uuidV5('www.example.com', DNS)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });

  it('is the same for the same name, and different for another', () => {
    expect(uuidV5('S00000001', DNS)).toBe(uuidV5('S00000001', DNS));
    expect(uuidV5('S00000001', DNS)).not.toBe(uuidV5('S00000002', DNS));
  });

  it('refuses a namespace that is not a UUID', () => {
    expect(() => uuidV5('x', 'not-a-uuid')).toThrow('UUID namespace');
  });
});
