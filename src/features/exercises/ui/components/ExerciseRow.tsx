import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, Pill, PressableScale, Text } from '@/shared/ui';

import type { ExerciseChoice } from '../useExerciseBrowser';

export interface ExerciseRowProps {
  choice: ExerciseChoice;
  onPress: (id: string) => void;
  /** The ⓘ: the exercise's details, whatever a tap on the row does. */
  onInfo: (id: string) => void;
  testID: string;
}

/** The ⓘ is 34pt, like an IconButton; its hit slop takes the touch target to 44pt. */
const INFO_SIZE = 34;
const INFO_HIT_SLOP = (44 - INFO_SIZE) / 2;

/** One exercise in a list: its muscle mark, name and muscles, a heart if it is a favourite, and ⓘ. */
export const ExerciseRow = memo(function ExerciseRow({ choice, onPress, onInfo, testID }: ExerciseRowProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={() => onPress(choice.id)}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={choice.label}
        style={styles.main}
        testID={testID}
      >
        <View style={styles.badge}>
          <Text variant="caption" weight="semibold" tone="accent">
            {choice.badge}
          </Text>
        </View>
        <View style={styles.text}>
          <View style={styles.title}>
            <Text variant="sub" weight="semibold" style={styles.name}>
              {choice.name}
            </Text>
            {choice.custom && <Pill label="Custom" />}
          </View>
          <Text variant="footnote" tone="secondary" numberOfLines={1}>
            {choice.muscles}
          </Text>
        </View>
        {choice.favourite && (
          <Icon name="heart" size={16} color={theme.colors.accentText} fill={theme.colors.accentText} />
        )}
      </PressableScale>
      {/* A plain pressable, not an IconButton: in a list this long, one animated pressable per row (the
          row itself) is enough. Held, the icon fades. */}
      <Pressable
        onPress={() => onInfo(choice.id)}
        hitSlop={INFO_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={`About ${choice.name}`}
        testID={`${testID}-info`}
        style={({ pressed }) => [styles.info, pressed && styles.infoPressed]}
      >
        <Icon name="info" size={24} color={theme.colors.text} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  main: {
    flex: 1,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  text: { flex: 1, gap: 1 },
  title: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.xs },
  name: { flexShrink: 1 },
  info: { width: INFO_SIZE, height: INFO_SIZE, alignItems: 'center', justifyContent: 'center' },
  infoPressed: { opacity: 0.5 },
}));
