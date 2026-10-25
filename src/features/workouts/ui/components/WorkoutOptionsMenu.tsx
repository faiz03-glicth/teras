import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button, Icon, PressableScale, Text, type IconName } from '@/shared/ui';
import { edgeRoom, surfaceStyle } from '@/theme';

export interface WorkoutOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onAddExercise: () => void;
  /** Throws the workout away (already confirmed here). */
  onDiscard: () => void;
  /** What discarding would lose: "Your 3 completed sets will be deleted." */
  discardLine: string;
}

/** Where the menu hangs: under the top bar, against the right edge. */
const BELOW_TOP_BAR = 56;

function Item({
  icon,
  label,
  danger = false,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { theme } = useUnistyles();
  const color = danger ? theme.colors.danger : theme.colors.text;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={styles.item}
      pressedStyle={styles.itemPressed}
      testID={testID}
    >
      <Icon name={icon} size={18} color={color} />
      <Text variant="sub" weight="semibold" style={{ color }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * The workout's own options, behind "…" in its top bar: Add exercise, and Discard one step away and
 * confirmed in place (Keep / Discard), so throwing a workout away is never one stray tap. The confirm is
 * drawn here rather than as a system alert, in the app's own material.
 */
export function WorkoutOptionsMenu({
  visible,
  onClose,
  onAddExercise,
  onDiscard,
  discardLine,
}: WorkoutOptionsMenuProps) {
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  // Every way out clears the confirm, so the next opening starts at the options.
  const close = () => {
    setConfirming(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable
        style={styles.scrim}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close options"
        testID="workout-options-scrim"
      />
      <View
        style={[styles.menu, { top: insets.top + BELOW_TOP_BAR }]}
        accessibilityRole="menu"
        accessibilityLabel="Workout options"
        testID="workout-options-menu"
      >
        {confirming ? (
          <View style={styles.confirm}>
            <View style={styles.confirmText}>
              <Text variant="sub" weight="semibold">
                Discard this workout?
              </Text>
              <Text variant="footnote" tone="secondary">
                {discardLine}
              </Text>
            </View>
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button label="Keep" variant="secondary" onPress={close} testID="keep-workout" />
              </View>
              <View style={styles.action}>
                <Button
                  label="Discard"
                  variant="danger"
                  onPress={() => {
                    close();
                    onDiscard();
                  }}
                  testID="confirm-discard"
                />
              </View>
            </View>
          </View>
        ) : (
          <>
            <Item
              icon="plus"
              label="Add exercise"
              onPress={() => {
                close();
                onAddExercise();
              }}
              testID="options-add-exercise"
            />
            <View style={styles.divider} />
            <Item
              icon="trash"
              label="Discard workout"
              danger
              onPress={() => setConfirming(true)}
              testID="discard-workout"
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.scrim, opacity: 0.35 },
  menu: {
    position: 'absolute',
    right: theme.spacing.md,
    width: 264,
    // Black's rim and base lie inside the menu's box: they take their width out of the padding.
    paddingTop: 6 - edgeRoom(theme.material.raised).top,
    paddingRight: 6 - edgeRoom(theme.material.raised).right,
    paddingBottom: 6 - edgeRoom(theme.material.raised).bottom,
    paddingLeft: 6 - edgeRoom(theme.material.raised).left,
    borderRadius: 18,
    ...surfaceStyle(theme.material.raised),
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.key,
  },
  itemPressed: { backgroundColor: theme.material.inset.background },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: theme.spacing.sm,
    marginVertical: 4,
    backgroundColor: theme.colors.border,
  },
  confirm: { gap: theme.spacing.md, padding: theme.spacing.sm },
  confirmText: { gap: 4 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  action: { flex: 1 },
}));
