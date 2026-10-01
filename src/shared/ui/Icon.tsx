import { ICONS, isIconName, type IconName } from './icons';

interface IconProps {
  /** A known icon name, or any string (e.g. a user activity's icon) that falls back to a sparkle. */
  name: IconName | (string & {});
  size?: number;
  color: string;
  strokeWidth?: number;
}

/** Decorative by default: icons never carry meaning on their own, the surrounding control's label does. */
export function Icon({ name, size = 24, color, strokeWidth = 1.9 }: IconProps) {
  const Glyph = ICONS[isIconName(name) ? name : 'sparkles'];
  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
