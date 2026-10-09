import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { motion } from '@/theme';

import { Text } from './Text';

const { actionWidth, openAt, fullAt, flickSpeed, slopPt, goneMs, spring } = motion.swipeAction;
const slideAway = motion.timing(goneMs, 'exit');

/** Room kept around the row for the shadows of what is in it (a raised key's reach ~11pt): never clipped. */
const BLEED = 12;
/** The key is as tall as the fields and the tick beside it: the row's height less this, top and bottom. */
const KEY_INSET = 4;
/** A row still here this long after it was deleted wasn't removed (the delete failed): it comes back. */
const RESTORE_AFTER_MS = 1500;

export type SwipeRest = 'closed' | 'open' | 'gone';

/**
 * PURE: where a swiped row comes to rest when the finger lets go. `offset`: how far it is pulled left (pt);
 * `velocity`: the finger's (pt/s, negative = left); `width`: the row's (0 before it is measured). Only
 * distance deletes, never a flick: a flick left at most opens the row.
 */
export function swipeRest(offset: number, velocity: number, width: number): SwipeRest {
  'worklet';
  if (velocity > flickSpeed) return 'closed';
  if (width > 0 && offset >= width * fullAt) return 'gone';
  if (offset >= actionWidth * openAt || velocity < -flickSpeed) return 'open';
  return 'closed';
}

export interface SwipeToDeleteProps {
  children: ReactNode;
  /** Runs once the row has slid away. If the row is still here a moment later, it slides back. */
  onDelete: () => void;
  /** The Delete key's name for a screen reader, saying what goes: "Delete set 2". */
  accessibilityLabel: string;
  /** The row's gesture (for tests), and the root of its parts' IDs: `-content`, `-delete`, `-close`. */
  testID?: string;
}

/**
 * A row that a swipe left uncovers a Delete key behind; carrying on past most of the row deletes it outright,
 * and a haptic tick says when letting go will. The row moves on the UI thread only: the screen hears from it
 * when a swipe starts (the key is only built then: a long list of rows carries none), when it comes to rest
 * open (so the key can be pressed) and when it has gone. A tap on an open row closes it. A screen reader
 * can't swipe, so the row's owner offers the same delete as an accessibility action.
 */
export function SwipeToDelete({ children, onDelete, accessibilityLabel, testID }: SwipeToDeleteProps) {
  const width = useSharedValue(0);
  // How far the row is pulled left (pt, never below 0), and where it was when the finger took it.
  const offset = useSharedValue(0);
  const from = useSharedValue(0);
  const armed = useSharedValue(false);
  const leaving = useSharedValue(false);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const tick = useCallback(() => haptics.selection(), []);
  const remove = useCallback(() => {
    setOpen(false);
    setDeleted(true);
    onDelete();
  }, [onDelete]);

  /** Back to rest, then the key is let go. */
  const springShut = useCallback(() => {
    offset.set(withSpring(0, spring, (finished) => finished && scheduleOnRN(setRevealed, false)));
  }, [offset]);

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => {
      setDeleted(false);
      leaving.set(false);
      springShut();
    }, RESTORE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [deleted, leaving, springShut]);

  const onDeleteKey = useCallback(() => {
    leaving.set(true);
    offset.set(withTiming(width.get(), slideAway, (finished) => finished && scheduleOnRN(remove)));
  }, [leaving, offset, remove, width]);

  const close = useCallback(() => {
    setOpen(false);
    springShut();
  }, [springShut]);

  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .activeOffsetX([-slopPt, slopPt])
      .failOffsetY([-slopPt, slopPt])
      .onStart((event) => {
        // From where it is, less the slop already travelled: the row never jumps as the swipe takes over.
        from.set(offset.get() + event.translationX);
        scheduleOnRN(setRevealed, true);
      })
      .onUpdate((event) => {
        if (leaving.get()) return;
        const pulled = Math.max(0, from.get() - event.translationX);
        offset.set(pulled);
        const past = width.get() > 0 && pulled >= width.get() * fullAt;
        if (past === armed.get()) return;
        armed.set(past);
        scheduleOnRN(tick);
      })
      .onEnd((event) => {
        if (leaving.get()) return;
        armed.set(false);
        const rest = swipeRest(offset.get(), event.velocityX, width.get());
        if (rest === 'gone') {
          leaving.set(true);
          offset.set(withTiming(width.get(), slideAway, (finished) => finished && scheduleOnRN(remove)));
          return;
        }
        scheduleOnRN(setOpen, rest === 'open');
        if (rest === 'open') {
          offset.set(withSpring(actionWidth, spring));
          return;
        }
        offset.set(withSpring(0, spring, (finished) => finished && scheduleOnRN(setRevealed, false)));
      });
    return testID ? gesture.withTestId(testID) : gesture;
  }, [armed, from, leaving, offset, remove, testID, tick, width]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width),
    [width],
  );

  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -offset.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.frame} pointerEvents="box-none" testID={testID}>
        {revealed && (
          <DeleteStrip
            offset={offset}
            width={width}
            open={open}
            onPress={onDeleteKey}
            accessibilityLabel={accessibilityLabel}
            testID={testID && `${testID}-delete`}
          />
        )}
        <Animated.View style={contentStyle} onLayout={onLayout} testID={testID && `${testID}-content`}>
          {children}
          {open && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={close}
              accessible={false}
              testID={testID && `${testID}-close`}
            />
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

interface DeleteStripProps {
  offset: SharedValue<number>;
  width: SharedValue<number>;
  /** Resting open: the key can be pressed, and a screen reader can find it. */
  open: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * The strip the row uncovers, following its right edge. The key inside it is held still, so the strip shows
 * just the part of the key the row has moved off. Transforms only: nothing is laid out while it moves.
 */
function DeleteStrip({ offset, width, open, onPress, accessibilityLabel, testID }: DeleteStripProps) {
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: width.get() - offset.get() }] }));
  const keyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() - width.get() }] }));
  return (
    <Animated.View
      style={[styles.strip, stripStyle]}
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[styles.key, keyStyle]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.action}
        testID={testID}
      >
        <Text variant="sub" weight="semibold" style={styles.label}>
          Delete
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // The row's own box plus room for its shadows: what slides past it is clipped, the shadows are not.
  frame: {
    margin: -BLEED,
    padding: BLEED,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    top: BLEED,
    right: BLEED,
    bottom: BLEED,
    left: BLEED,
    overflow: 'hidden',
  },
  key: {
    position: 'absolute',
    top: KEY_INSET,
    right: 0,
    bottom: KEY_INSET,
    left: 0,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.dangerSoft,
  },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: actionWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: theme.colors.danger },
}));
