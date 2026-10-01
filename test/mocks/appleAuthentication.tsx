/** Jest stand-in for expo-apple-authentication: the native button becomes a plain pressable. */
import { Pressable, Text } from 'react-native';

export enum AppleAuthenticationButtonType {
  SIGN_IN = 0,
  CONTINUE = 1,
  SIGN_UP = 2,
}
export enum AppleAuthenticationButtonStyle {
  WHITE = 0,
  WHITE_OUTLINE = 1,
  BLACK = 2,
}
export enum AppleAuthenticationScope {
  FULL_NAME = 0,
  EMAIL = 1,
}

export const isAvailableAsync = jest.fn(async () => true);
export const signInAsync = jest.fn();

export function AppleAuthenticationButton({
  onPress,
  buttonStyle,
}: {
  onPress: () => void;
  buttonStyle: AppleAuthenticationButtonStyle;
}) {
  return (
    <Pressable
      testID="apple-sign-in"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      accessibilityHint={buttonStyle === AppleAuthenticationButtonStyle.WHITE ? 'white' : 'black'}
    >
      <Text>Sign in with Apple</Text>
    </Pressable>
  );
}
