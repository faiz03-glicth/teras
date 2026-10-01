import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/**
 * The canvas behind a screen. With Liquid Glass it is the material's glowing backdrop (radial gradients,
 * drawn natively on iOS and Android); with Classic, the plain canvas colour shows through instead.
 * The gradient is passed as an inline style from the current theme, so React Native parses it on every
 * theme change (a stylesheet value would reach native without being parsed).
 */
export function Backdrop() {
  const { theme } = useUnistyles();
  if (!theme.glass) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.fill, { experimental_backgroundImage: theme.glass.backdrop }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
