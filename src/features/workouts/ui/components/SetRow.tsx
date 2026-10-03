import { memo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { WeightUnit } from '@/features/training/domain/preferences';
import { Icon, PressableScale, Text } from '@/shared/ui';

import type { SetPatch, WorkoutExercise, WorkoutSet } from '../../data/WorkoutRepository';
import { parseSetWeight, setWeightText, weightColumn } from '../../domain/setUnits';

export interface SetRowProps {
  set: WorkoutSet;
  index: number;
  type: WorkoutExercise['type'];
  /** Weights are typed and shown in this unit, and stored in kilograms. */
  unit: WeightUnit;
  /** The set of the same number last time ("60kg × 8"), or a dash; and how a screen reader says it. */
  previous: string;
  previousLabel: string;
  onChange: (setId: string, patch: SetPatch) => void;
  onTick: (setId: string, done: boolean) => void;
}

/** The table's fixed columns, shared by the header and every row so they always line up. */
const NUMBER_WIDTH = 24;
/** Room for "102.5kg × 10"; anything longer shrinks to fit rather than wrapping. */
const PREVIOUS_WIDTH = 84;
const TICK_SIZE = 44;

/**
 * The column names above a set table, so a field is never a bare "–". Weight is named in the unit it is
 * typed in, and for a bodyweight exercise as what it is: weight added to the body ("+kg").
 */
export function SetTableHeader({ type, unit }: { type: WorkoutExercise['type']; unit: WeightUnit }) {
  const { theme } = useUnistyles();
  const columns = type === 'timed' ? ['Seconds'] : [weightColumn(type, unit), 'Reps'];
  return (
    <View style={styles.header} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text variant="mini" tone="tertiary" weight="semibold" style={styles.number}>
        SET
      </Text>
      <Text variant="mini" tone="tertiary" weight="semibold" style={styles.previous}>
        PREVIOUS
      </Text>
      <View style={styles.fields}>
        {columns.map((column) => (
          <Text key={column} variant="mini" tone="tertiary" weight="semibold" style={styles.column}>
            {column.toUpperCase()}
          </Text>
        ))}
      </View>
      <View style={styles.tickColumn}>
        <Icon name="check" size={14} color={theme.colors.text3} />
      </View>
    </View>
  );
}

/** Shows a number without a trailing ".0", and an empty field for nothing recorded yet. */
const asText = (value: number | null): string => (value === null ? '' : String(value));

/** A typed field back to a number: blank means "not recorded", not zero. */
const asNumber = (text: string): number | null => {
  const value = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

/**
 * One line of the set table: its number, what was lifted, and the tick that completes it.
 * The fields keep what is typed locally and push the parsed number up, so a reformat never moves
 * the cursor mid-entry.
 */
export const SetRow = memo(function SetRow({
  set,
  index,
  type,
  unit,
  previous,
  previousLabel,
  onChange,
  onTick,
}: SetRowProps) {
  const { theme } = useUnistyles();
  const [weight, setWeight] = useState(() => setWeightText(set.weightKg, unit));
  const [reps, setReps] = useState(() => asText(set.reps));
  const [seconds, setSeconds] = useState(() => asText(set.seconds));
  const done = set.status === 'done';

  const field = (
    value: string,
    onText: (text: string) => void,
    patch: (text: string) => SetPatch,
    label: string,
  ) => (
    <TextInput
      value={value}
      onChangeText={(text) => {
        onText(text);
        onChange(set.id, patch(text));
      }}
      // A completed set is locked, as in the prototype: untick it to change it.
      editable={!done}
      keyboardType="decimal-pad"
      selectTextOnFocus
      placeholder="–"
      placeholderTextColor={theme.colors.text3}
      accessibilityLabel={`${label}, set ${index + 1}`}
      style={styles.input(done)}
      testID={`set-${set.id}-${label}`}
    />
  );

  return (
    <View style={styles.row} testID={`set-${set.id}`}>
      <Text variant="sub" tone="secondary" style={styles.number}>
        {index + 1}
      </Text>
      <Text
        variant="footnote"
        tone="tertiary"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        accessibilityLabel={previousLabel}
        style={styles.previous}
        testID={`set-${set.id}-previous`}
      >
        {previous}
      </Text>

      {type === 'timed' ? (
        <View style={styles.fields}>
          {field(seconds, setSeconds, (text) => ({ seconds: asNumber(text) }), 'seconds')}
        </View>
      ) : (
        <View style={styles.fields}>
          {field(weight, setWeight, (text) => ({ weightKg: parseSetWeight(text, unit) }), 'weight')}
          {field(reps, setReps, (text) => ({ reps: asNumber(text) }), 'reps')}
        </View>
      )}

      <PressableScale
        onPress={() => onTick(set.id, !done)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Set ${index + 1} done`}
        style={styles.tick(done)}
        testID={`set-${set.id}-tick`}
      >
        <Icon name="check" size={20} color={done ? theme.colors.onAccent : theme.colors.text3} />
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    // 52 around a 44 field leaves a clear gap between one set's wells and the next.
    minHeight: 52,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 28 },
  number: { width: NUMBER_WIDTH, textAlign: 'center', fontVariant: ['tabular-nums'] },
  previous: { width: PREVIOUS_WIDTH, textAlign: 'center', fontVariant: ['tabular-nums'] },
  fields: { flex: 1, flexDirection: 'row', gap: theme.spacing.sm },
  column: { flex: 1, textAlign: 'center' },
  tickColumn: { width: TICK_SIZE, alignItems: 'center' },
  // A field is a well pressed into the card. Once its set is done it fills gold-tinted, so a finished
  // row reads by its colour even where the inset shadow does not draw.
  input: (done: boolean) => ({
    flex: 1,
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.control,
    backgroundColor: done ? theme.colors.accentSoft : theme.material.inset.background,
    boxShadow: theme.material.inset.shadow,
    color: theme.colors.text,
    fontFamily: theme.fonts.semibold,
    fontSize: 17,
    textAlign: 'center' as const,
    fontVariant: ['tabular-nums' as const],
  }),
  // The tick is a raised key; done, it sinks into the card and turns gold with a dark check.
  tick: (done: boolean) => ({
    width: TICK_SIZE,
    height: TICK_SIZE,
    borderRadius: theme.radii.control,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: done ? theme.material.accent.background : theme.material.raisedSm.background,
    boxShadow: done ? theme.material.accent.pressedShadow : theme.material.raisedSm.shadow,
  }),
}));
