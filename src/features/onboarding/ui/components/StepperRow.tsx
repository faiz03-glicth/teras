import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ValueField } from '@/features/training/domain/preferences';
import { haptics } from '@/shared/lib/haptics';
import { IconButton, PressableScale, Text } from '@/shared/ui';

export interface StepperRowProps {
  label: string;
  value: string;
  onStep: (direction: 1 | -1) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** The value as fields to type into, opened by a short hold on it. Without it the value only steps. */
  input?: readonly ValueField[];
  /** The fields take a decimal point (bodyweight); otherwise whole numbers only. */
  decimal?: boolean;
  /**
   * What is typed, one string per field, as it is typed: true when it reads as a value and was kept.
   * Leaving the fields on something that does not read hands back where the value started.
   */
  onType?: (parts: readonly string[]) => boolean;
  testID?: string;
}

/** While a button is held the stepper repeats this often. */
export const HOLD_REPEAT_MS = 100;
/** How long a value is held before it opens for typing: half the system's long press, so it feels quick. */
export const EDIT_HOLD_MS = 250;
/** How long after a field is left the typing ends, unless another field of the value takes the focus. */
const LEAVE_GRACE_MS = 150;

/**
 * A labelled value with − and + buttons either side of it. Tap for one step; hold a button to keep going;
 * hold the value itself, briefly, to type a number far from where it starts. Typing opens only this row:
 * the value becomes its own fields ("5 ft 7 in" is two), and the steppers rest until it is done.
 * Android's Back only lowers the keyboard and leaves a field focused, as everywhere on Android; what was
 * typed is already kept, and the fields close when they are left.
 */
export function StepperRow({
  label,
  value,
  onStep,
  decreaseLabel,
  increaseLabel,
  input,
  decimal = false,
  onType,
  testID,
}: StepperRowProps) {
  const { theme } = useUnistyles();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // The interval and the deferred blur outlive the render that started them, so they read the latest
  // handlers from here.
  const step = useRef(onStep);
  const typed = useRef(onType);
  useEffect(() => {
    step.current = onStep;
    typed.current = onType;
  });

  // What is being typed, one string per field; null while the value is only shown.
  const [draft, setDraft] = useState<string[] | null>(null);
  const draftNow = useRef<string[] | null>(null);
  const before = useRef<string[]>([]);
  const fields = useRef<(TextInput | null)[]>([]);
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editing = draft !== null;

  const changeDraft = (next: string[] | null) => {
    draftNow.current = next;
    setDraft(next);
  };

  const stopHold = () => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopHold, []);

  const startHold = (direction: 1 | -1) => {
    stopHold();
    timer.current = setInterval(() => step.current(direction), HOLD_REPEAT_MS);
  };

  const startTyping = () => {
    if (!input || !onType || editing) return;
    stopHold();
    haptics.light();
    before.current = input.map((field) => field.text);
    changeDraft(before.current);
  };

  // Kept as it is typed, so nothing typed is lost to a tap on Continue or a Back press.
  const typeDraft = (index: number, text: string) => {
    const next = (draftNow.current ?? []).map((part, at) => (at === index ? text : part));
    changeDraft(next);
    typed.current?.(next);
  };

  /**
   * Closes the fields, once: Done and the blur that follows it both arrive here. What they hold was kept
   * as it was typed; if it does not read as a value (cleared, a stray point), the value goes back to
   * where it started rather than keeping whatever it passed through on the way.
   */
  const finishTyping = useCallback(() => {
    const parts = draftNow.current;
    if (parts === null) return;
    draftNow.current = null;
    setDraft(null);
    if (typed.current?.(parts) === false) typed.current(before.current);
  }, []);

  // Feet to inches blurs one field and focuses the next a moment later (on Android, not at once): a blur
  // only ends the typing if no field of this value takes the focus within that moment.
  const stayTyping = () => {
    if (leaving.current !== null) clearTimeout(leaving.current);
    leaving.current = null;
  };
  const onFieldBlur = () => {
    stayTyping();
    leaving.current = setTimeout(finishTyping, LEAVE_GRACE_MS);
  };
  useEffect(() => stayTyping, []);

  const shown = (
    <PressableScale
      onLongPress={startTyping}
      delayLongPress={EDIT_HOLD_MS}
      disabled={!input || !onType}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint="Hold to type a value"
      accessibilityActions={[{ name: 'longpress', label: 'Type a value' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') startTyping();
      }}
      style={styles.value}
      testID={testID ? `${testID}-hold` : undefined}
    >
      <Text
        variant="headline"
        align="center"
        style={styles.number}
        testID={testID ? `${testID}-value` : undefined}
      >
        {value}
      </Text>
    </PressableScale>
  );

  const typing = draft && input && (
    // Pressed into the row with a gold edge: it reads as open for typing even where shadows do not draw.
    <View style={[styles.value, styles.well]}>
      {input.map((field, index) => {
        const last = index === input.length - 1;
        return (
          <View key={field.suffix} style={styles.part}>
            <TextInput
              ref={(node) => {
                fields.current[index] = node;
              }}
              value={draft[index] ?? ''}
              onChangeText={(text) => typeDraft(index, text)}
              onSubmitEditing={() => (last ? finishTyping() : fields.current[index + 1]?.focus())}
              onFocus={stayTyping}
              onBlur={onFieldBlur}
              returnKeyType={last ? 'done' : 'next'}
              submitBehavior={last ? 'blurAndSubmit' : 'submit'}
              keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
              maxLength={field.maxLength}
              autoFocus={index === 0}
              selectTextOnFocus
              cursorColor={theme.colors.accentText}
              selectionColor={theme.colors.accentSoft}
              accessibilityLabel={`${label}, ${field.suffix}`}
              style={styles.field(Math.min((draft[index] ?? '').length + 1, field.maxLength))}
              testID={testID ? `${testID}-input-${index}` : undefined}
            />
            <Text variant="sub" tone="secondary">
              {field.suffix}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.row} testID={testID}>
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
      <IconButton
        icon="minus"
        onPress={() => onStep(-1)}
        onLongPress={() => startHold(-1)}
        onPressOut={stopHold}
        disabled={editing}
        accessibilityLabel={decreaseLabel}
        testID={testID ? `${testID}-minus` : undefined}
      />
      {typing || shown}
      <IconButton
        icon="plus"
        onPress={() => onStep(1)}
        onLongPress={() => startHold(1)}
        onPressOut={stopHold}
        disabled={editing}
        accessibilityLabel={increaseLabel}
        testID={testID ? `${testID}-plus` : undefined}
      />
    </View>
  );
}

/**
 * A field is as wide as its number plus one digit (up to its longest), so a short number sits snug
 * against its unit and the next digit typed never scrolls the field before it widens.
 */
const DIGIT_WIDTH = 10;

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 52 },
  label: { flex: 1 },
  value: {
    minWidth: 96,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.control,
  },
  number: { fontVariant: ['tabular-nums'] },
  well: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.material.inset.background,
    boxShadow: theme.material.inset.shadow,
    borderWidth: 1,
    borderColor: theme.colors.accentText,
  },
  part: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  field: (digits: number) => ({
    width: digits * DIGIT_WIDTH + 6,
    height: 40,
    padding: 0,
    includeFontPadding: false,
    textAlign: 'right' as const,
    textAlignVertical: 'center' as const,
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    fontVariant: ['tabular-nums' as const],
    color: theme.colors.text,
  }),
}));
