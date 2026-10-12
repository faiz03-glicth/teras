import { memo, useCallback, useMemo } from 'react';
import { View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import type { StepDirection } from '@/features/training/domain/preferences';
import { haptics } from '@/shared/lib/haptics';
import { Icon, IconButton, PressableScale, StepperRow, Text } from '@/shared/ui';
import { motion } from '@/theme';

import type { RoutineRowModel, TargetField, TargetView } from '../useEditRoutineViewModel';

import { dropIndex, dropOffset, shiftFor } from './reorder';

const { holdMs, liftScale, shiftMs, dropMs } = motion.reorder;
const shiftTiming = motion.timing(shiftMs);
const dropTiming = motion.timing(dropMs);

/** The drag in progress, shared by every row of one list (see RoutineItemList). */
export interface ReorderState {
  /** The rows' keys in their current order. */
  order: SharedValue<string[]>;
  /** Each row's height with the divider under it, by key. */
  heights: SharedValue<Record<string, number>>;
  /** The row being dragged, or none. */
  active: SharedValue<string | null>;
  /** Where the dragged row started, and where it would land now. */
  from: SharedValue<number>;
  to: SharedValue<number>;
  /** How far the finger has moved it (pt). */
  dragY: SharedValue<number>;
}

export interface RoutineItemRowProps {
  row: RoutineRowModel;
  /** Its targets' editor is open. */
  expanded: boolean;
  drag: ReorderState;
  /** The divider's height under each row, counted into its height. */
  divider: number;
  onToggle: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  /** Let go after a drag: settle at place `to` (from place `from`). */
  onDrop: (key: string, from: number, to: number) => void;
  onRemove: (key: string) => void;
  onStep: (key: string, field: TargetField, direction: StepDirection) => void;
  onType: (key: string, field: TargetField, text: string) => boolean;
}

/**
 * One exercise of a routine being edited. Tap it to open its targets (sets, reps or seconds, and the weight
 * its first workout starts from); hold it, then drag, to move it up or down the routine. The rows it passes
 * glide aside on the UI thread and the routine changes order only once it is let go. A screen reader moves
 * it with the Move up and Move down actions instead.
 */
export const RoutineItemRow = memo(function RoutineItemRow({
  row,
  expanded,
  drag,
  divider,
  onToggle,
  onMove,
  onDrop,
  onRemove,
  onStep,
  onType,
}: RoutineItemRowProps) {
  const { theme } = useUnistyles();
  const { key } = row;
  const lifted = theme.material.raised.background;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(holdMs)
        .onStart(() => {
          const from = drag.order.get().indexOf(key);
          drag.from.set(from);
          drag.to.set(from);
          drag.dragY.set(0);
          drag.active.set(key);
          scheduleOnRN(haptics.medium);
        })
        .onUpdate((event) => {
          if (drag.active.get() !== key) return;
          drag.dragY.set(event.translationY);
          const heights = drag.order.get().map((one) => drag.heights.get()[one] ?? 0);
          const to = dropIndex(heights, drag.from.get(), event.translationY);
          if (to === drag.to.get()) return;
          drag.to.set(to);
          scheduleOnRN(haptics.selection);
        })
        .onFinalize(() => {
          if (drag.active.get() !== key) return;
          const from = drag.from.get();
          const to = drag.to.get();
          const heights = drag.order.get().map((one) => drag.heights.get()[one] ?? 0);
          drag.dragY.set(
            withTiming(dropOffset(heights, from, to), dropTiming, () => scheduleOnRN(onDrop, key, from, to)),
          );
        })
        .withTestId(`routine-drag-${key}`),
    [drag, key, onDrop],
  );

  const moving = useAnimatedStyle(() => {
    const active = drag.active.get();
    if (active === key) {
      return {
        transform: [{ translateY: drag.dragY.get() }, { scale: liftScale }],
        zIndex: 2,
        backgroundColor: lifted,
      };
    }
    if (active === null) {
      return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, backgroundColor: 'transparent' };
    }
    const index = drag.order.get().indexOf(key);
    const shift = shiftFor(index, drag.from.get(), drag.to.get(), drag.heights.get()[active] ?? 0);
    return {
      transform: [{ translateY: withTiming(shift, shiftTiming) }, { scale: 1 }],
      zIndex: 0,
      backgroundColor: 'transparent',
    };
  });

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height + divider;
      drag.heights.modify((all) => {
        'worklet';
        all[key] = height;
        return all;
      });
    },
    [divider, drag, key],
  );

  const onAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'moveUp') onMove(key, -1);
      if (event.nativeEvent.actionName === 'moveDown') onMove(key, 1);
    },
    [key, onMove],
  );

  const actions = [
    ...(row.canMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(row.canMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];

  return (
    <Animated.View style={[styles.row, moving]} onLayout={onLayout} testID={`routine-item-${key}`}>
      <View style={styles.head}>
        <GestureDetector gesture={pan}>
          <PressableScale
            style={styles.open}
            scaleTo={0.985}
            onPress={() => onToggle(key)}
            accessibilityRole="button"
            accessibilityLabel={`${row.name}, ${row.line}`}
            accessibilityHint={
              expanded ? 'Hides its targets' : 'Shows its sets, reps and weight. Hold to move it'
            }
            accessibilityState={{ expanded }}
            accessibilityActions={actions}
            onAccessibilityAction={onAction}
            testID={`routine-item-open-${key}`}
          >
            <Icon name="grip" size={18} color={theme.colors.text3} />
            <View style={styles.text}>
              <Text variant="sub" weight="semibold" testID={`routine-item-name-${key}`}>
                {row.name}
              </Text>
              <Text variant="footnote" tone="secondary">
                {row.line}
              </Text>
            </View>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.text3} />
          </PressableScale>
        </GestureDetector>
        <IconButton
          icon="close"
          plain
          onPress={() => onRemove(key)}
          accessibilityLabel={`Remove ${row.name}`}
        />
      </View>
      {expanded && (
        <View style={styles.editor} testID={`routine-item-editor-${key}`}>
          {row.targets.map((target) => (
            <TargetStepper
              key={target.field}
              itemKey={key}
              name={row.name}
              target={target}
              onStep={onStep}
              onType={onType}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
});

interface TargetStepperProps {
  itemKey: string;
  name: string;
  target: TargetView;
  onStep: RoutineItemRowProps['onStep'];
  onType: RoutineItemRowProps['onType'];
}

/** One target of the open editor: − and + either side of it, held to type a number. */
function TargetStepper({ itemKey, name, target, onStep, onType }: TargetStepperProps) {
  const { field } = target;
  const label = target.label.toLowerCase();
  return (
    <StepperRow
      label={target.label}
      value={target.value}
      onStep={(direction) => onStep(itemKey, field, direction)}
      decreaseLabel={`Less ${label} for ${name}`}
      increaseLabel={`More ${label} for ${name}`}
      input={[{ text: target.text, suffix: target.suffix, maxLength: target.maxLength }]}
      decimal={target.decimal}
      onType={(parts) => onType(itemKey, field, parts[0] ?? '')}
      testID={`routine-item-${field}-${itemKey}`}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { borderRadius: theme.radii.control },
  head: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  text: { flex: 1, gap: 1, paddingVertical: theme.spacing.sm },
  editor: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
}));
