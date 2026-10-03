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
  testID?: string;
}

export function Card({
  children,
  tight = false,
  tone = 'default',
  divided = false,
  style,
  testID,
}: CardProps) {
  const rows = divided ? Children.toArray(children).filter(isValidElement) : null;
  return (
    <View style={[styles.card(tight, tone), style]} testID={testID}>
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
    paddingVertical: tight ? theme.spacing.xs : theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    // A card is the material raised. The gold-tinted tone is the opposite, a well pressed into it, for a
    // panel that reports a state (the rest timer) rather than one that holds content.
    backgroundColor: tone === 'accentSoft' ? theme.colors.accentSoft : theme.material.raised.background,
    boxShadow: tone === 'accentSoft' ? theme.material.inset.shadow : theme.material.raised.shadow,
  }),
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
}));
