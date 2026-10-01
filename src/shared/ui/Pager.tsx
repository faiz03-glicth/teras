import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { motion } from '@/theme';

import { PressDelay } from './pressDelay';

const slide = motion.timing(motion.pager.slideMs);
const { landWithin } = motion.pager;

/**
 * The page the pager has just landed on, or null. Landed means: no finger on it, and within `landWithin`
 * of a page's spot (the snap's last points crawl, so waiting for it to stop would sound late). A page that
 * was already the landed one doesn't land again (a swipe that snaps back is silent).
 */
export function landedPage(position: number, landed: number, count: number): number | null {
  'worklet';
  const nearest = Math.min(count - 1, Math.max(0, Math.round(position)));
  if (nearest === landed || Math.abs(position - nearest) > landWithin) return null;
  return nearest;
}

export interface PagerProps {
  /** How many pages. */
  count: number;
  /** The page to show. Changing it (a button, Back) slides there. */
  index: number;
  /**
   * A swipe landed on another page. Reported only once it has settled, never mid-drag: the logical page
   * doesn't flip back and forth under the finger, and nothing re-renders while the pages are moving.
   */
  onIndexChange: (index: number) => void;
  /** Written by the pager, in pages (1.5 = halfway from the second to the third), for things that follow it. */
  progress: SharedValue<number>;
  /** The screen's side padding: the pager is full-bleed, and each page puts the padding back inside. */
  inset: number;
  /** `seen`: the page has been the current one at least once (entrances wait for it). */
  renderPage: (page: number, seen: boolean) => ReactNode;
}

/**
 * Pages side by side that the person swipes through (onboarding). A swipe moves them with the finger and
 * the platform snaps to the nearest page; setting `index` slides a whole page on the motion system's curve.
 * A finger always wins: touching the pager mid-slide stops the slide where it is. Each page that settles
 * into place is set down like a block: a wooden clack and a soft tick. Only the current page is exposed to
 * screen readers.
 *
 * While the pages move, nothing runs on the JS thread: the platform scroll view follows the finger and
 * snaps on release (velocity and distance decide), and `progress` is a UI-thread value for whatever
 * follows the pages. The logical page changes once a page has landed. Presses inside the pages wait a
 * moment (`pager.pressDelayMs`) so that a swipe starting on a button or tile is just a swipe: no press
 * feedback, no haptic.
 */
export function Pager({ count, index, onIndexChange, progress, inset, renderPage }: PagerProps) {
  const { width } = useWindowDimensions();
  const ref = useAnimatedRef<Animated.ScrollView>();
  // Where a driven slide is taking the pager (x offset); only ever animated, never touched by a swipe.
  const target = useSharedValue(index * width);
  // Where the pages start. Never changed after mounting: a new `contentOffset` makes the native scroll view
  // jump there on the spot (Android and iOS alike), even under a finger mid-drag.
  const [startOffset] = useState(() => ({ x: index * width, y: 0 }));
  // The page navigation knows about (JS): landing on it again, e.g. at the end of a button slide, isn't news.
  const reported = useRef(index);
  const shownWidth = useRef(width);
  // The page it last settled on, and whether a finger is on it (a held page hasn't landed yet).
  const landedOnUI = useSharedValue(index);
  const dragging = useSharedValue(false);
  // Pages that have been the main one. A page counts as seen as soon as it covers most of the screen, so
  // its entrance plays while it slides in; that's once per page, the only JS work a swipe does mid-way.
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([index]));
  const seenOnUI = useSharedValue<number[]>([index]);
  if (!seen.has(index)) setSeen(new Set(seen).add(index));
  const see = useCallback(
    (page: number) => setSeen((pages) => (pages.has(page) ? pages : new Set(pages).add(page))),
    [],
  );

  // A page settling into place: one block set down.
  const setDown = useCallback(() => {
    sounds.play('pageClack');
    haptics.soft();
  }, []);

  // A page landed: set it down (sound, haptic) and, if it's a different page, tell navigation.
  const land = useCallback(
    (page: number) => {
      setDown();
      if (page === reported.current) return;
      reported.current = page;
      onIndexChange(page);
    },
    [onIndexChange, setDown],
  );

  useEffect(() => sounds.preload('pageClack'), []);

  const onScroll = useAnimatedScrollHandler({
    // Every frame of a move: one number for the things that follow the pages, nothing else.
    onScroll: (event) => {
      const position = event.contentOffset.x / width;
      progress.set(position);
      const nearest = Math.min(count - 1, Math.max(0, Math.round(position)));
      if (!seenOnUI.get().includes(nearest)) {
        seenOnUI.set([...seenOnUI.get(), nearest]);
        scheduleOnRN(see, nearest);
      }
      if (dragging.get()) return;
      const page = landedPage(position, landedOnUI.get(), count);
      if (page !== null) {
        landedOnUI.set(page);
        scheduleOnRN(land, page);
      }
    },
    onBeginDrag: () => {
      dragging.set(true);
      cancelAnimation(target);
    },
    // Let go exactly on a page (no snap to follow): it has landed now.
    onEndDrag: (event) => {
      dragging.set(false);
      const page = landedPage(event.contentOffset.x / width, landedOnUI.get(), count);
      if (page !== null) {
        landedOnUI.set(page);
        scheduleOnRN(land, page);
      }
    },
  });

  // A driven slide moves the pager frame by frame on the UI thread (a swipe never changes `target`).
  useAnimatedReaction(
    () => target.get(),
    (x, previous) => {
      if (previous !== null) scrollTo(ref, x, 0, false);
    },
  );

  useEffect(() => {
    const to = index * width;
    // The window changed size (split screen, a fold): put the page back in its place.
    if (width !== shownWidth.current) {
      shownWidth.current = width;
      reported.current = index;
      scheduleOnUI(() => {
        cancelAnimation(target);
        target.set(to);
        scrollTo(ref, to, 0, false);
      });
      return;
    }
    // The pager itself got there (a swipe): nothing to drive.
    if (index === reported.current) return;
    reported.current = index;
    scheduleOnUI(() => {
      // Start from wherever the pages are now, so a new slide never jumps.
      target.set(progress.get() * width);
      target.set(withTiming(to, slide));
    });
  }, [index, width, progress, target, ref]);

  return (
    <Animated.ScrollView
      ref={ref}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      decelerationRate="fast"
      contentOffset={startOffset}
      onScroll={onScroll}
      style={styles.pager(inset)}
    >
      <PressDelay value={motion.pager.pressDelayMs}>
        {Array.from({ length: count }, (_, page) => (
          <View
            key={page}
            style={styles.page(width, inset)}
            importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={page !== index}
          >
            {renderPage(page, seen.has(page))}
          </View>
        ))}
      </PressDelay>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Fills the space its screen gives it, so the tallest page never pushes what's below it off screen.
  pager: (inset: number) => ({ marginHorizontal: -inset, flexGrow: 1 }),
  page: (width: number, inset: number) => ({ width, paddingHorizontal: inset, gap: theme.spacing.xl }),
}));
