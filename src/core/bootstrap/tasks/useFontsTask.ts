import { useFonts } from 'expo-font';

import { done, failed, pending, type BootTask } from '../bootState';
import { APP_FONTS } from '../fonts';

export function useFontsTask(): BootTask {
  const [loaded, error] = useFonts(APP_FONTS);
  if (error) return failed('Fonts failed to load', error.message);
  return loaded ? done : pending;
}
