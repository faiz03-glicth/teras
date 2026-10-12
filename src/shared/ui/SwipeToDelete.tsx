import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { motion } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

const { actionWidth, openAt, fullAt, flickSpeed, slopPt, goneMs, closeMs, spring } = motion.swipeAction;
const slideAway = motion.timing(goneMs, 'exit');
const closeUp = motion.timing(closeMs, 'exit');

/** Room kept around the row for the shadows of what is in it (a raised key's reach ~11pt): never clipped. */
const BLEED = 12;
/** The key is as tall as the fields and the tick beside it: the row's height less this, top and bottom. */
const KEY_INSET = 4;
/** A row still here this long after it was deleted wasn't removed (the delete failed): it comes back. */
const RESTORE_AFTER_MS = 1500;

export type SwipeRest = 'closed' | 'open' | 'gone';

interface OpenRow {
  id: symbol;
  close: () => void;
}

/** The row open or being swiped right now: swiping another shuts it first, so only one is ever open. */
let openRow: OpenRow | null = null;

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
 * and a haptic tick says when letting go will. A deleted row slides off, then its place closes up. The row moves on the UI thread only: the screen hears from it
 * when a swipe starts (the key is only built then: a long list of rows carries none), when it crosses the
 * line past which letting go deletes (the key turns solid and reads "Release to delete"), when it comes to
 * rest open (so the key can be pressed) and when it has gone. A tap on an open row closes it, and swiping
 * another row closes it too. A screen reader can't swipe, so the row's owner offers the same delete as an
 * accessibility action.
 */
export function SwipeToDelete({ children, onDelete, accessibilityLabel, testID }: SwipeToDeleteProps) {
  const width = useSharedValue(0);
  // How far the row is pulled left (pt, never below 0), and where it was when the finger took it.
  const offset = useSharedValue(0);
  const from = useSharedValue(0);
  const armed = useSharedValue(false);
  const leaving = useSharedValue(false);
  // The row's own height (pt), and how far its place has closed up once it has slid away (0 open, 1 shut).
  const height = useSharedValue(0);
  const shut = useSharedValue(0);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [armedKey, setArmedKey] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [id] = useState(() => Symbol('row'));

  /** Crossing the line: letting go now deletes. One firm tap marks it; drawing back undoes it quietly. */
  const arm = useCallback((on: boolean) => {
    setArmedKey(on);
    if (on) haptics.medium();
  }, []);
  /** At rest and shut: the key is let go. */
  const settle = useCallback(() => {
    setRevealed(false);
    if (openRow?.id === id) openRow = null;
  }, [id]);
  const remove = useCallback(() => {
    setOpen(false);
    setDeleted(true);
    if (openRow?.id === id) openRow = null;
    onDelete();
  }, [id, onDelete]);

  /** Back to rest, then the key is let go. */
  const springShut = useCallback(() => {
    offset.set(withSpring(0, spring, (finished) => finished && scheduleOnRN(settle)));
  }, [offset, settle]);

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => {
      setDeleted(false);
      setArmedKey(false);
      shut.set(0);
      leaving.set(false);
      springShut();
    }, RESTORE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [deleted, leaving, shut, springShut]);

  /** Slides off, then its place closes up so the sets below move up into it; only then is it deleted. */
  const slideOff = useCallback(() => {
    'worklet';
    leaving.set(true);
    offset.set(
      withTiming(width.get(), slideAway, (slid) => {
        if (!slid) return;
        shut.set(withTiming(1, closeUp, (closed) => closed && scheduleOnRN(remove)));
      }),
    );
  }, [leaving, offset, remove, shut, width]);

  const close = useCallback(() => {
    // A row already sliding away is left to go: shutting it now would strand it half-deleted.
    if (leaving.get()) return;
    setOpen(false);
    springShut();
  }, [leaving, springShut]);

  /** A swipe starts here: the key is built, and any other open row shuts. */
  const begin = useCallback(() => {
    if (openRow && openRow.id !== id) openRow.close();
    openRow = { id, close };
    setRevealed(true);
  }, [close, id]);

  useEffect(
    () => () => {
      if (openRow?.id === id) openRow = null;
    },
    [id],
  );

  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .activeOffsetX([-slopPt, slopPt])
      .failOffsetY([-slopPt, slopPt])
      .onStart((event) => {
        // From where it is, less the slop already travelled: the row never jumps as the swipe takes over.
        from.set(offset.get() + event.translationX);
        scheduleOnRN(begin);
      })
      .onUpdate((event) => {
        if (leaving.get()) return;
        const pulled = Math.max(0, from.get() - event.translationX);
        offset.set(pulled);
        const past = width.get() > 0 && pulled >= width.get() * fullAt;
        if (past === armed.get()) return;
        armed.set(past);
        scheduleOnRN(arm, past);
      })
      .onEnd((event) => {
        if (leaving.get()) return;
        const rest = swipeRest(offset.get(), event.velocityX, width.get());
        if (armed.get() && rest !== 'gone') scheduleOnRN(arm, false);
        armed.set(false);
        if (rest === 'gone') {
          slideOff();
          return;
        }
        scheduleOnRN(setOpen, rest === 'open');
        if (rest === 'open') {
          offset.set(withSpring(actionWidth, spring));
          return;
        }
        offset.set(withSpring(0, spring, (finished) => finished && scheduleOnRN(settle)));
      });
    return testID ? gesture.withTestId(testID) : gesture;
  }, [arm, armed, begin, from, leaving, offset, settle, slideOff, testID, width]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      width.set(event.nativeEvent.layout.width);
      height.set(event.nativeEvent.layout.height);
    },
    [height, width],
  );

  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -offset.get() }] }));
  // Held at the row's own height (plus the shadows' room) once measured, so closing up is one value.
  const frameStyle = useAnimatedStyle(() =>
    height.get() > 0 ? { height: height.get() * (1 - shut.get()) + 2 * BLEED } : {},
  );

  // The swipe is caught on the row itself (it moves with the finger), never on the frame: the frame lets
  // touches through to its children (box-none), and a gesture on such a view never receives one.
  return (
    <Animated.View style={[styles.frame, frameStyle]} pointerEvents="box-none" testID={testID}>
      {revealed && (
        <DeleteStrip
          offset={offset}
          width={width}
          open={open}
          armed={armedKey}
          onPress={slideOff}
          accessibilityLabel={accessibilityLabel}
          testID={testID && `${testID}-delete`}
        />
      )}
      <GestureDetector gesture={pan}>
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
      </GestureDetector>
    </Animated.View>
  );
}

interface DeleteStripProps {
  offset: SharedValue<number>;
  width: SharedValue<number>;
  /** Resting open: the key can be pressed, and a screen reader can find it. */
  open: boolean;
  /** Past the line: letting go deletes. The key turns solid and says so. */
  armed: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * The strip the row uncovers, following its right edge. The key inside it is held still, so the strip shows
 * just the part of the key the row has moved off; it fades in over the key's width. Transforms and opacity
 * only: nothing is laid out while it moves (arming swaps the key's look once, not per frame).
 */
function DeleteStrip({ offset, width, open, armed, onPress, accessibilityLabel, testID }: DeleteStripProps) {
  const { theme } = useUnistyles();
  const stripStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, actionWidth], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: width.get() - offset.get() }],
  }));
  const keyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() - width.get() }] }));
  const ink = armed ? theme.colors.onDanger : theme.colors.danger;
  return (
    <Animated.View
      style={[styles.strip, stripStyle]}
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[styles.key(armed), keyStyle]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={armed ? styles.actionArmed : styles.action}
        testID={testID}
      >
        <Icon name="trash" size={16} color={ink} />
        <Text variant="sub" weight="semibold" numberOfLines={1} style={{ color: ink }}>
          {armed ? 'Release to delete' : 'Delete'}
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
  key: (armed: boolean) => ({
    position: 'absolute',
    top: KEY_INSET,
    right: 0,
    bottom: KEY_INSET,
    left: 0,
    borderRadius: theme.radii.control,
    backgroundColor: armed ? theme.colors.danger : theme.colors.dangerSoft,
  }),
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: actionWidth,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Armed, the label reads from the row's edge across the whole key.
  actionArmed: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    alignItems: 'center',
    paddingLeft: theme.spacing.md,
  },
}));
