import type { ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme';

import { PressDelay } from './pressDelay';

export interface ScreenProps {
  children: ReactNode;
  /** Scrolls (the platform's own scroll view: native momentum, nothing in the way). */
  scroll?: boolean;
  /**
   * The child is a virtualised list (FlatList) that scrolls itself and pads its own content: the screen
   * adds no scroll view and no padding around it, only the press delay a scroll needs.
   */
  list?: boolean;
  /**
   * The screen has text fields: scrolling also keeps the focused one above the keyboard. Only these
   * screens pay for keyboard tracking; every other screen scrolls on the plain native scroll view.
   */
  keyboard?: boolean;
  /** Leaves room for the floating tab bar and FAB. */
  withTabBar?: boolean;
  edges?: readonly Edge[];
  /** 'wide' = 24pt side padding (onboarding, login); default is the 16pt gutter. */
  inset?: 'default' | 'wide';
  contentStyle?: StyleProp<ViewStyle>;
  /** Docked under the content, outside the scroll: stays in view however far the content scrolls. */
  footer?: ReactNode;
  testID?: string;
}

const TAB_BAR_CLEARANCE = 104;

export function Screen({
  children,
  scroll = false,
  list = false,
  keyboard = false,
  withTabBar = false,
  edges = ['top', 'bottom'],
  inset = 'default',
  contentStyle,
  footer,
  testID,
}: ScreenProps) {
  const content = [styles.content(inset, withTabBar), contentStyle];
  return (
    <SafeAreaView edges={edges} style={styles.root} testID={testID}>
      {list ? (
        <PressDelay value={motion.scroll.pressDelayMs}>{children}</PressDelay>
      ) : scroll ? (
        // A press that becomes a scroll never presses (motion.scroll): starting a scroll on a card or a
        // month doesn't dip it, which is what makes a scroll feel like it's fighting the finger.
        <PressDelay value={motion.scroll.pressDelayMs}>
          {keyboard ? (
            <KeyboardAwareScrollView
              bottomOffset={24}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={[styles.grow, content]}
            >
              {children}
            </KeyboardAwareScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.grow, content]}>
              {children}
            </ScrollView>
          )}
        </PressDelay>
      ) : (
        // Tapping empty space dismisses the keyboard; not an accessibility element.
        <Pressable style={styles.grow} onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.grow, content]}>{children}</View>
        </Pressable>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
  grow: { flexGrow: 1 },
  content: (inset: 'default' | 'wide', withTabBar: boolean) => ({
    paddingHorizontal: inset === 'wide' ? theme.spacing.xxl : theme.spacing.gutter,
    paddingBottom: withTabBar ? TAB_BAR_CLEARANCE : theme.spacing.lg,
    gap: theme.spacing.stack,
  }),
}));
