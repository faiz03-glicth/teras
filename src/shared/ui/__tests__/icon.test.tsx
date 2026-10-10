import { screen } from '@testing-library/react-native';
import codepoints from 'lucide-static/font/codepoints.json';

import { renderInScheme, styleOf } from '@test/render';

import { Icon } from '../Icon';
import { ICONS } from '../icons';

const glyphOf = (code: number) => String.fromCodePoint(code);
// Icons are decorative, hidden from screen readers, so the queries look past that.
const HIDDEN = { includeHiddenElements: true } as const;

describe('Icon', () => {
  it.each(Object.entries(ICONS))("draws %s as lucide's own glyph", (_, { lucide, code }) => {
    expect((codepoints as Record<string, number>)[lucide]).toBe(code);
  });

  it('is a glyph of the icon font in its size square, whatever the text size', () => {
    renderInScheme(<Icon name="info" size={20} color="#123456" />);

    const glyph = screen.getByText(glyphOf(ICONS.info.code), HIDDEN);
    expect(glyph.props.allowFontScaling).toBe(false);
    expect(styleOf(glyph)).toMatchObject({
      fontFamily: 'lucide',
      fontSize: 20,
      lineHeight: 20,
      width: 20,
      height: 20,
      color: '#123456',
      includeFontPadding: false,
    });
  });

  it('falls back to a sparkle for a name it does not know', () => {
    renderInScheme(<Icon name="kettlebell-swing" color="#000000" />);

    expect(screen.getByText(glyphOf(ICONS.sparkles.code), HIDDEN)).toBeTruthy();
  });

  it('fills only the icons with a filled form, which stay SVG (the heart); the rest stay glyphs', () => {
    renderInScheme(
      <>
        <Icon name="heart" color="#000000" fill="#FF0000" />
        <Icon name="star" color="#000000" fill="#FF0000" />
        <Icon name="heart" color="#000000" />
      </>,
    );

    // The SVG heart (an empty view under Jest), the star's glyph, and the unfilled heart's glyph.
    expect(screen.getAllByTestId('icon', HIDDEN)).toHaveLength(1);
    expect(screen.getByText(glyphOf(ICONS.star.code), HIDDEN)).toBeTruthy();
    expect(screen.getByText(glyphOf(ICONS.heart.code), HIDDEN)).toBeTruthy();
  });
});
