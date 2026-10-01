import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface CardProps {
  children: ReactNode;
  /** List-style padding (4 vertical, 16 horizontal) for cards of rows. */
  tight?: boolean;
  tone?: 'default' | 'accentSoft';
  /** Draws a hairline between each child row. */
  divided?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, tight = false, tone = 'default', divided = false, style }: CardProps) {
  const rows = divided ? Children.toArray(children).filter(isValidElement) : null;
  return (
    <View style={[styles.card(tight, tone), style]}>
      {rows
        ? rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 && <View style={styles.divider} />}
              {row}
            </Fragment>
          ))
        : children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: (tight: boolean, tone: 'default' | 'accentSoft') => ({
    borderRadius: theme.radii.card,
    borderWidth: 1,
    paddingVertical: tight ? theme.spacing.xs : theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor:
      tone === 'accentSoft'
        ? theme.colors.accentSoft
        : (theme.glass?.card.background ?? theme.colors.surface),
    borderColor: tone === 'accentSoft' ? 'transparent' : (theme.glass?.card.edge ?? theme.colors.border),
    // Glass: a lit edge and a soft drop make the translucent card read as a pane over the backdrop.
    boxShadow:
      (tone === 'default' ? theme.glass?.card.shadow : undefined) ?? theme.elevation.card ?? undefined,
  }),
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
}));
