import { StyleSheet } from 'react-native-unistyles';

import { Card, EmptyState, ErrorState, ListRow, LoadingState, NavBar, Screen } from '@/shared/ui';

import { useRecordsViewModel } from './useRecordsViewModel';

/** Every exercise's record, the most recently trained first; each opens its exercise. */
export function RecordsScreen() {
  const vm = useRecordsViewModel();

  return (
    <Screen scroll testID="records-screen" contentStyle={styles.content}>
      <NavBar title="Records" onBack={vm.onBack} />

      {vm.status === 'loading' && <LoadingState label="Loading your records" testID="records-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load your records" onRetry={vm.onRetry} testID="records-error" />
        </Card>
      )}
      {vm.status === 'ready' && vm.rows.length === 0 && (
        <Card>
          <EmptyState icon="trophy" title="No records yet" />
        </Card>
      )}
      {vm.status === 'ready' && vm.rows.length > 0 && (
        <Card tight divided>
          {vm.rows.map((row) => (
            <ListRow
              key={row.exerciseId}
              title={row.title}
              description={row.record}
              icon="trophy"
              trailing="chevron"
              onPress={() => vm.onOpenExercise(row.exerciseId)}
              accessibilityHint="Opens the exercise"
              testID={`record-${row.exerciseId}`}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
}));
