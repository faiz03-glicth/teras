import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { FILLED_ICONS, ICONS, isIconName, type IconName } from './icons';

interface IconProps {
  /** A known icon name, or any string (e.g. a user activity's icon) that falls back to a sparkle. */
  name: IconName | (string & {});
  size?: number;
  color: string;
  /** Fills the shape too, for an icon that is "on" (a favourite's heart). Only FILLED_ICONS have a fill. */
  fill?: string;
}

/** The filled icons' line, as an SVG; the font's glyphs carry lucide's own. */
const FILLED_STROKE = 1.9;

/** Each icon's glyph in lucide's font, made once. */
const GLYPHS = Object.fromEntries(
  Object.entries(ICONS).map(([name, { code }]) => [name, String.fromCodePoint(code)]),
) as Record<IconName, string>;

/**
 * Decorative by default: icons never carry meaning on their own, the surrounding control's label does.
 * A glyph of lucide's font in a `size` square, never scaled with the phone's text size: an icon keeps the
 * proportions of the control it sits in.
 */
export function Icon({ name, size = 24, color, fill = 'none' }: IconProps) {
  const icon = isIconName(name) ? name : 'sparkles';
  const Filled = fill === 'none' ? undefined : FILLED_ICONS[icon];
  if (Filled) {
    return (
      <Filled
        size={size}
        color={color}
        strokeWidth={FILLED_STROKE}
        fill={fill}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    );
  }
  return (
    <Text
      style={styles.glyph(size, color)}
      allowFontScaling={false}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {GLYPHS[icon]}
    </Text>
  );
}

const styles = StyleSheet.create({
  // The font's line is exactly its em (ascender 1000, descender 0, of 1000 units), so with Android's extra
  // font padding off a glyph fills the `size` square the SVG did.
  glyph: (size: number, color: string) => ({
    fontFamily: 'lucide',
    fontSize: size,
    lineHeight: size,
    width: size,
    height: size,
    color,
    textAlign: 'center' as const,
    includeFontPadding: false,
  }),
});
