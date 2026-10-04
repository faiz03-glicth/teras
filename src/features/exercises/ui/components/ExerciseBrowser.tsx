import { useCallback, type ReactNode } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionLabel,
  Text,
  TextField,
} from '@/shared/ui';

import {
  itemKey,
  itemKind,
  type BrowserItem,
  type CardPlace,
  type ExerciseBrowserModel,
} from '../useExerciseBrowser';
import { ExerciseRow } from './ExerciseRow';
import { FilterButton } from './FilterButton';
import { MusclePanel } from './MusclePanel';

export interface ExerciseBrowserProps {
  browser: ExerciseBrowserModel;
  onPick: (id: string) => void;
  onInfo: (id: string) => void;
  /** What sits above the search: the screen's bar and title. Scrolls away with the list. */
  header: ReactNode;
}

// The muscle panel opening above the list must push the list down, not hold the rows still under it.
const KEEP_PLACE = { disabled: true } as const;

/**
 * Search and the equipment and muscle filters (the body opens in place, above the list it narrows), then
 * the lists: Favourites and Recent first, then every exercise (or the matches), grouped by muscle. One
 * recycling list: only the rows on screen (and a little either side) exist, however long the library, and a
 * row scrolled off is reused for the next one rather than built again.
 * Shared by Add exercise and the Exercise library; each says what picking one does.
 */
export function ExerciseBrowser({ browser, onPick, onInfo, header }: ExerciseBrowserProps) {
  const { results } = browser;
  const { onClearFilters } = results;
  const renderItem: ListRenderItem<BrowserItem> = useCallback(
    // A row past the end of the list for a render (see `itemKey`) draws nothing.
    ({ item }: { item: BrowserItem | undefined }) => {
      if (item === undefined) return null;
      if (item.kind === 'section') {
        return (
          <SectionHeading title={item.title} onClearFilters={item.clearable ? onClearFilters : undefined} />
        );
      }
      return (
        <CardSlice place={item.place}>
          {item.kind === 'group' ? (
            <Text
              variant="caption"
              tone="tertiary"
              weight="semibold"
              accessibilityRole="header"
              style={styles.muscle}
            >
              {item.title}
            </Text>
          ) : (
            <ExerciseRow choice={item.choice} onPress={onPick} onInfo={onInfo} testID={item.testID} />
          )}
        </CardSlice>
      );
    },
    [onClearFilters, onInfo, onPick],
  );

  return (
    <FlashList
      data={results.items}
      keyExtractor={itemKey}
      getItemType={itemKind}
      maintainVisibleContentPosition={KEEP_PLACE}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <BrowserControls browser={browser} />
          {results.status === 'loading' && <LoadingState label="Loading exercises" />}
          {results.status === 'error' && (
            <Card>
              <ErrorState title="Couldn't load exercises" onRetry={results.onRetry} />
            </Card>
          )}
        </View>
      }
      ListFooterComponent={
        results.empty ? (
          <Card>
            <EmptyState
              icon="search"
              title="No exercise matches"
              body="Check the spelling, clear a filter, or create it yourself."
              secondaryAction={{ label: 'Clear', onPress: results.onClear }}
              action={{ label: 'Create exercise', onPress: results.onCreate }}
            />
          </Card>
        ) : null
      }
      contentContainerStyle={styles.content}
      testID="exercise-list"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

/** The search field and the two filter buttons, and the muscle panel when it is open. */
function BrowserControls({ browser }: { browser: ExerciseBrowserModel }) {
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
      <View style={styles.filters}>
        <FilterButton
          label={browser.equipmentFilter.label}
          active={browser.equipmentFilter.active}
          onPress={browser.onOpenEquipment}
          accessibilityLabel={browser.equipmentFilter.accessibilityLabel}
          testID="exercise-filter-equipment"
        />
        <FilterButton
          label={browser.muscleFilter.label}
          active={browser.muscleFilter.active}
          expanded={browser.muscles.open}
          onPress={browser.muscles.onToggle}
          accessibilityLabel={browser.muscleFilter.accessibilityLabel}
          testID="exercise-filter-muscle"
        />
      </View>
      {browser.muscles.open && <MusclePanel filter={browser.muscles} />}
    </>
  );
}

/**
 * One row's share of its section's card: the list draws rows one by one, so each paints its part of the
 * card (raised fill, rounded top on the first, rounded bottom on the last, a hairline between rows).
 */
function CardSlice({ place, children }: { place: CardPlace; children: ReactNode }) {
  return (
    <View style={[styles.slice, styles[place]]}>
      {(place === 'middle' || place === 'last') && <View style={styles.divider} />}
      {children}
    </View>
  );
}

/** A section's title; over the matches while a filter is on, with the way to take them all off. */
function SectionHeading({ title, onClearFilters }: { title: string; onClearFilters?: () => void }) {
  return (
    <View style={styles.heading}>
      <SectionLabel>{title}</SectionLabel>
      {onClearFilters && (
        <Button
          label="Clear filters"
          variant="ghost"
          size="sm"
          onPress={onClearFilters}
          testID="exercise-clear-filters"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xxl },
  header: { gap: theme.spacing.lg },
  // Close under the search, as one control: what to look for, then where.
  filters: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: -theme.spacing.sm },
  heading: {
    minHeight: 36,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // The card's look (Card tight), cut into slices.
  slice: { paddingHorizontal: theme.spacing.lg, backgroundColor: theme.material.raised.background },
  only: { borderRadius: theme.radii.card, paddingVertical: theme.spacing.xs },
  first: {
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
    paddingTop: theme.spacing.xs,
  },
  middle: {},
  last: {
    borderBottomLeftRadius: theme.radii.card,
    borderBottomRightRadius: theme.radii.card,
    paddingBottom: theme.spacing.xs,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  // A plain heading per muscle inside the card: no card of its own.
  muscle: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xs },
}));
