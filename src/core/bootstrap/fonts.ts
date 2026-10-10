// Per-weight imports so only the five fonts in use are bundled.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';

/** Keys are the font family names referenced by theme/tokens/typography.ts (and `lucide` by Icon). */
export const APP_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Roboto_500Medium,
  // lucide's icon font: shared/ui/Icon draws every icon as one of its glyphs.
  lucide: require('lucide-static/font/lucide.ttf') as number,
};
