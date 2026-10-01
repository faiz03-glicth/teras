import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'com.faiz.teras';
const IS_LOCAL = process.env.APP_VARIANT === 'local';

/** The EAS project on expo.dev (account `faiz-glitch`, slug `teras`). */
const EAS_PROJECT_ID = 'da6556e1-8c6d-42b7-bd0f-22123924d92c';
const APP_ID = IS_LOCAL ? `${BUNDLE_ID}.local` : BUNDLE_ID;

/**
 * Google Sign-In on iOS needs the *reversed* iOS client ID as a URL scheme:
 * `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`.
 */
function googleIosUrlScheme(): string {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const suffix = '.apps.googleusercontent.com';
  if (!clientId || !clientId.endsWith(suffix)) {
    console.warn(
      '[app.config] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing or invalid; Google Sign-In will not work on iOS.',
    );
    return 'com.googleusercontent.apps.missing-ios-client-id';
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_LOCAL ? 'Teras Local' : 'Teras',
  slug: 'teras',
  owner: 'faiz-glitch',
  scheme: IS_LOCAL ? 'teras-local' : 'teras',
  version: '1.0.0',
  orientation: 'portrait',
  // The Core Orb, in the app's own colours (assets are drawn from src/theme/tokens).
  // Android and the web use this one; iOS picks a variant below.
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: APP_ID,
    /**
     * iOS 18 swaps the icon with the phone's appearance: Walnut under a dark home screen, Parchment
     * under a light one, and a grey mark it tints itself. Gold reads on walnut but not on parchment,
     * so the light icon draws the orb in `accentText`, the same rule the app's own gold marks follow.
     */
    icon: {
      light: './assets/icon-light.png',
      dark: './assets/icon-dark.png',
      tinted: './assets/icon-tinted.png',
    },
    supportsTablet: true,
    usesAppleSignIn: true,
    // App Transport Security is left to Expo's template, which already refuses arbitrary loads
    // (NSAllowsArbitraryLoads: false) while allowing the local network the dev client needs.
    /**
     * "Required reason" APIs used by the app's native libraries. Apple doesn't reliably read the privacy
     * manifests inside static CocoaPods, so the app declares them itself (docs.expo.dev/guides/apple-privacy).
     * Collected from every PrivacyInfo.xcprivacy in node_modules; re-check when adding a native library.
     */
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          // react-native, @react-native-async-storage/async-storage, expo-file-system
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
        },
        {
          // react-native, expo-constants, expo-system-ui
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          // react-native
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          // expo-file-system
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
      ],
    },
  },
  android: {
    package: APP_ID,
    adaptiveIcon: {
      // Walnut, so the gold orb keeps its contrast whatever the launcher puts behind it. A flat
      // colour needs no background image; the monochrome layer is the Android 13+ themed icon.
      backgroundColor: '#16110C',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    /**
     * Permissions Teras never uses, removed from release builds. They come from Expo's default template
     * (storage, drawing over other apps) and expo-secure-store's optional biometric lock (Teras keeps its
     * session without one). `permissions` can't do this: it only adds; libraries' own entries still merge.
     * Debug builds keep SYSTEM_ALERT_WINDOW from their own manifest, for the dev menu.
     */
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
        // The light and dark canvas colours, so the splash fades into the first screen without a shift.
        backgroundColor: '#F6E7B6',
        dark: { image: './assets/splash-icon-dark.png', backgroundColor: '#16110C' },
      },
    ],
    'expo-font',
    'expo-sqlite',
    'expo-secure-store',
    'expo-web-browser',
    'expo-apple-authentication',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme() }],
    'react-native-edge-to-edge',
    [
      'expo-build-properties',
      {
        android: {
          // Release builds only, so the dev client is unaffected.
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // The staging APK is side-loaded onto real phones, which are all arm64.
          ...(process.env.EAS_BUILD_PROFILE === 'preview' && { buildArchs: ['arm64-v8a'] }),
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
  },
});
