import * as SplashScreen from 'expo-splash-screen';

/** Keeps the native splash up; call once at module load, before the first render. */
export function keepSplashVisible(): void {
  void SplashScreen.preventAutoHideAsync();
  SplashScreen.setOptions({ fade: true, duration: 250 });
}

/** Hides the native splash. Safe to call more than once. */
export function hideSplash(): void {
  SplashScreen.hide();
}
