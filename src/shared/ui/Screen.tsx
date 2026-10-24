import type { ComponentProps, ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme';

import { PressDelay } from './pressDelay';
import { useTabBarClearance } from './tabBarClearance';
import { SongketWall } from './SongketWall';

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
  /**
   * Rows on it are held and dragged (a reorderable list): it scrolls on gesture-handler's scroll view, so
   * a row's drag, once held, takes the touch from the scroll. On the plain native scroll view the scroll
   * takes it instead: a drag upward scrolls the page, and one downward is let go before the finger is.
   */
  dragRows?: boolean;
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

/**
 * The room a tab's page leaves under its content for the floating tab bar, and for a bar docked on it
 * (Resume). A screen pads its own content with it; a list screen (`list`) pads its list's.
 */
export function useTabBarRoom(): number {
  return TAB_BAR_CLEARANCE + useTabBarClearance();
}

/**
 * Gesture-handler's scroll view, animated as the keyboard-aware scroll view expects its scroll view to be.
 * Its type names Reanimated's own ScrollView; this is the same animated scroll view with gesture-handler's
 * props added, hence the cast.
 */
const GestureAnimatedScrollView = Animated.createAnimatedComponent(
  GestureScrollView,
) as unknown as NonNullable<ComponentProps<typeof KeyboardAwareScrollView>['ScrollViewComponent']>;

export function Screen({
  children,
  scroll = false,
  list = false,
  keyboard = false,
  dragRows = false,
  withTabBar = false,
  edges = ['top', 'bottom'],
  inset = 'default',
  contentStyle,
  footer,
  testID,
}: ScreenProps) {
  const room = useTabBarRoom();
  const content = [styles.content(inset, withTabBar ? room : 0), contentStyle];
  return (
    <SafeAreaView edges={edges} style={styles.root} testID={testID}>
      <SongketWall />
      {list ? (
        <PressDelay value={motion.scroll.pressDelayMs}>{children}</PressDelay>
      ) : scroll ? (
        // A press that becomes a scroll never presses (motion.scroll): starting a scroll on a card or a
        // month doesn't dip it, which is what makes a scroll feel like it's fighting the finger.
        <PressDelay value={motion.scroll.pressDelayMs}>
          {keyboard ? (
            <KeyboardAwareScrollView
              ScrollViewComponent={dragRows ? GestureAnimatedScrollView : undefined}
              bottomOffset={24}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={[styles.grow, content]}
            >
              {children}
            </KeyboardAwareScrollView>
          ) : dragRows ? (
            <GestureScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.grow, content]}
            >
              {children}
            </GestureScrollView>
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
  // No background of its own: every screen sits in a navigator scene that already paints the canvas, and
  // each extra full-screen fill is drawn again on every frame (GPU overdraw).
  root: { flex: 1 },
  grow: { flexGrow: 1 },
  content: (inset: 'default' | 'wide', clearance: number) => ({
    paddingHorizontal: inset === 'wide' ? theme.spacing.xxl : theme.spacing.gutter,
    paddingBottom: clearance > 0 ? clearance : theme.spacing.lg,
    gap: theme.spacing.stack,
  }),
}));
