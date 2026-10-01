import { cleanDisplayName, MAX_DISPLAY_NAME_LENGTH } from '../Profile';

describe('cleanDisplayName (matches the server constraint)', () => {
  it('trims, and turns nothing into null', () => {
    expect(cleanDisplayName('  Faiz Ahmad  ')).toBe('Faiz Ahmad');
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName('')).toBeNull();
    expect(cleanDisplayName(null)).toBeNull();
  });

  it('removes control characters and caps the length', () => {
    expect(cleanDisplayName('Fa\niz\t\u0007')).toBe('Faiz');
    expect(cleanDisplayName('x'.repeat(150))).toHaveLength(MAX_DISPLAY_NAME_LENGTH);
  });
});
