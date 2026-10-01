import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Text as RNText, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { GoogleLogo } from './GoogleLogo';
import { PressableScale } from './PressableScale';

export type SsoProvider = 'apple' | 'google';

export interface SsoButtonProps {
  provider: SsoProvider;
  onPress: () => void;
  /** This button's sign-in is in progress: spinner + "Connecting…". */
  busy?: boolean;
  /** Another sign-in is in progress. */
  disabled?: boolean;
  /** Google label; Apple always uses the native "Sign in with Apple". */
  label?: string;
}

const HEIGHT = 52;
const BUSY_LABEL = 'Connecting…';

/**
 * Provider sign-in buttons that follow each brand's rules:
 * Apple renders the native AppleAuthenticationButton (black in light, white in dark); Google uses the
 * official "G" and Roboto Medium.
 *
 * Every provider connects the same way: a same-size "Connecting…" pill in the provider's own colours fades
 * in over the button (the button stays underneath, so the pill never dips or shifts), and fades back out if
 * the sign-in doesn't complete. Another provider connecting dims the button and makes it inert.
 */
export function SsoButton({
  provider,
  onPress,
  busy = false,
  disabled = false,
  label = 'Continue with Google',
}: SsoButtonProps) {
  const { theme } = useUnistyles();
  const colors = provider === 'apple' ? theme.brand.apple : theme.brand.google;
  const border = provider === 'google' ? theme.brand.google.border : null;
  const fade = useStateTransition('opacity');
  const inert = disabled || busy;

  // Sign in with Apple is iOS-only; the native button doesn't exist elsewhere.
  if (provider === 'apple' && Platform.OS !== 'ios') return null;

  const idle =
    provider === 'apple' ? (
      <Animated.View
        testID="apple-sso"
        style={[{ opacity: disabled ? 0.45 : 1 }, fade]}
        pointerEvents={inert ? 'none' : 'auto'}
        accessibilityState={{ disabled }}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            theme.scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={HEIGHT / 2}
          style={styles.native}
          onPress={onPress}
        />
      </Animated.View>
    ) : (
      <PressableScale
        onPress={onPress}
        disabled={inert}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[styles.pill(colors.background, border), { opacity: disabled ? 0.45 : 1 }, fade]}
      >
        <GoogleLogo size={20} />
        <RNText style={styles.label('google', colors.foreground)}>{label}</RNText>
      </PressableScale>
    );

  return (
    <View>
      <View
        importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={busy}
      >
        {idle}
      </View>
      <Animated.View
        pointerEvents={busy ? 'auto' : 'none'}
        style={[styles.pill(colors.background, border), styles.over, { opacity: busy ? 1 : 0 }, fade]}
        accessible={busy}
        importantForAccessibility={busy ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!busy}
        accessibilityRole="button"
        accessibilityLabel={BUSY_LABEL}
        accessibilityState={{ busy: true, disabled: true }}
      >
        <ActivityIndicator size="small" color={colors.foreground} />
        <RNText style={styles.label(provider, colors.foreground)}>{BUSY_LABEL}</RNText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  pill: (background: string, border: string | null) => ({
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: background,
    borderWidth: border ? 1 : 0,
    borderColor: border ?? undefined,
  }),
  over: { position: 'absolute', left: 0, right: 0, top: 0 },
  native: { height: HEIGHT, width: '100%' },
  // Apple's busy pill uses the system font to match the native button next to it.
  label: (provider: SsoProvider, color: string) => ({
    color,
    fontSize: 17,
    fontFamily: provider === 'google' ? theme.fonts.googleLabel : undefined,
    fontWeight: provider === 'apple' ? ('600' as const) : undefined,
  }),
}));
