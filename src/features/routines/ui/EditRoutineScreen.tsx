import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  NavBar,
  Screen,
  SectionLabel,
  Text,
  TextField,
} from '@/shared/ui';

import { RoutineItemRow } from './components/RoutineItemRow';
import { useEditRoutineViewModel, type EditRoutineViewModel } from './useEditRoutineViewModel';

/**
 * Edit routine: the name, the exercises in order, Add exercise, then Delete. Save sits in the header;
 * nothing is kept until it is pressed. `routineId` as the view model takes it.
 */
export function EditRoutineScreen({ routineId }: { routineId: string | null }) {
  const vm = useEditRoutineViewModel(routineId);

  return (
    <Screen scroll keyboard testID="edit-routine-screen" contentStyle={styles.content}>
      <NavBar
        onBack={vm.onBack}
        right={
          vm.status === 'ready' && (
            <Button
              label="Save"
              variant="quiet"
              onPress={vm.onSave}
              loading={vm.saving}
              loadingLabel="Saving"
              testID="routine-save"
            />
          )
        }
      />

      {vm.status === 'loading' && <LoadingState label="Loading the routine" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this routine" onRetry={vm.onRetry} />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Routine not found" />
        </Card>
      )}
      {vm.status === 'ready' && <Ready vm={vm} />}
    </Screen>
  );
}

function Ready({ vm }: { vm: EditRoutineViewModel }) {
  return (
    <>
      <Text variant="title" accessibilityRole="header">
        {vm.title}
      </Text>

      <TextField
        label="Routine name"
        value={vm.name}
        onChangeText={vm.onNameChange}
        error={vm.nameError}
        autoCapitalize="words"
        maxLength={60}
        returnKeyType="done"
        testID="routine-name"
      />

      <View style={styles.group}>
        <SectionLabel>{vm.section}</SectionLabel>
        <Card tight divided>
          {vm.rows.length === 0 ? (
            <Text variant="footnote" tone="secondary" style={styles.empty}>
              No exercises yet
            </Text>
          ) : (
            vm.rows.map((row) => (
              <RoutineItemRow key={row.key} row={row} onMove={vm.onMove} onRemove={vm.onRemove} />
            ))
          )}
        </Card>
      </View>

      <Button
        label="Add exercise"
        icon="plus"
        variant="secondary"
        onPress={vm.onAddExercise}
        testID="routine-add-exercise"
      />
      {vm.canDelete && (
        <Button
          label="Delete routine"
          variant="danger"
          onPress={vm.onDelete}
          loading={vm.deleting}
          loadingLabel="Deleting"
          testID="routine-delete"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  group: { gap: theme.spacing.sm },
  empty: { paddingVertical: theme.spacing.lg, textAlign: 'center' },
}));
