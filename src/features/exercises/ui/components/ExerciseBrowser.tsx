import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, ErrorState, LoadingState, SectionLabel, TextField } from '@/shared/ui';

import type { ExerciseBrowserModel } from '../useExerciseBrowser';
import { ExerciseRow } from './ExerciseRow';

export interface ExerciseBrowserProps {
  browser: ExerciseBrowserModel;
  onPick: (id: string) => void;
  onInfo: (id: string) => void;
}

/**
 * Search, then the lists: Favourites and Recent first, then every exercise (or the matches), forty at a
 * time. Shared by Add exercise and the Exercise library; each says what picking one does.
 */
export function ExerciseBrowser({ browser, onPick, onInfo }: ExerciseBrowserProps) {
  return (
    <>
      <TextField
        label="Search exercises"
        icon="search"
        value={browser.query}
        onChangeText={browser.onQueryChange}
        placeholder={browser.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        testID="exercise-search"
      />

      {browser.status === 'loading' && <LoadingState label="Loading exercises" />}
      {browser.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load exercises" onRetry={browser.onRetry} />
        </Card>
      )}

      {browser.sections.map((section) => (
        <View key={section.key} style={styles.group}>
          <SectionLabel>{section.title}</SectionLabel>
          <Card tight divided>
            {section.rows.map((choice) => (
              <ExerciseRow
                key={choice.id}
                choice={choice}
                onPress={onPick}
                onInfo={onInfo}
                testID={`${section.key}-${choice.id}`}
              />
            ))}
          </Card>
        </View>
      ))}

      {browser.remaining > 0 && (
        <Button
          label={`Show more (${browser.remaining} left)`}
          variant="secondary"
          onPress={browser.onShowMore}
          testID="exercises-more"
        />
      )}

      {browser.empty && (
        <Card>
          <EmptyState
            icon="search"
            title="No exercise matches"
            body="Check the spelling, or clear the search."
            action={{ label: 'Clear', onPress: browser.onClear }}
          />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: { gap: theme.spacing.sm },
}));
