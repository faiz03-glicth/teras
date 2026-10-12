import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { ExerciseType } from '@/core/db/schema';
import { MUSCLE_LABELS } from '@/features/exercises/domain/labels';
import { useExerciseList } from '@/features/exercises/hooks/useExerciseQueries';
import { formatWeight, type StepDirection, type WeightUnit } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { setWeightText } from '@/features/workouts/domain/setUnits';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openAddExercise, useLeaveGuard } from '@/shared/actions';
import { NEW_ROUTINE } from '@/shared/actions/params';
import { haptics } from '@/shared/lib/haptics';
import { showInfo, showSuccess } from '@/shared/ui/toast';

import {
  draftChanged,
  parseStartWeight,
  parseTargetCount,
  stepCount,
  stepSeconds,
  stepStartWeight,
  TARGET_LIMITS,
  targetLine,
  type RoutineDraftItem,
  type TargetChange,
} from '../domain/draft';
import { useRemoveRoutine, useRoutine, useSaveRoutine } from '../hooks/useRoutineQueries';
import { useRoutineDraftStore } from '../state/routineDraftStore';

/** What a new routine is called until it is renamed. */
const NEW_NAME = 'New routine';

/** Which of an exercise's targets a stepper changes. */
export type TargetField = 'sets' | 'each' | 'weight';

/** One target of an exercise, as its stepper shows it and as it opens for typing. */
export interface TargetView {
  field: TargetField;
  label: string;
  /** "3", "10", "45 s", "40 kg" or "None". */
  value: string;
  /** The number to type over, and what follows it. */
  text: string;
  suffix: string;
  maxLength: number;
  /** Typed as a decimal (a weight), otherwise a whole number. */
  decimal: boolean;
}

/** One exercise of the routine, ready to show. */
export interface RoutineRowModel {
  key: string;
  name: string;
  /** "3 sets × 10 reps · 40 kg · Chest". */
  line: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Sets, then reps or seconds, then the starting weight (none for a held exercise), for its editor. */
  targets: readonly TargetView[];
}

interface RowExercise {
  name: string;
  primaryMuscle: keyof typeof MUSCLE_LABELS;
  type: ExerciseType;
}

/** PURE: one exercise's targets, as its editor's steppers show them. */
function targetViews(
  item: RoutineDraftItem,
  exercise: RowExercise | undefined,
  unit: WeightUnit,
): TargetView[] {
  const sets = String(item.targetSets);
  const views: TargetView[] = [
    { field: 'sets', label: 'Sets', value: sets, text: sets, suffix: 'sets', maxLength: 2, decimal: false },
  ];
  if (item.targetSeconds !== null) {
    const seconds = String(item.targetSeconds);
    views.push({
      field: 'each',
      label: 'Seconds',
      value: `${seconds} s`,
      text: seconds,
      suffix: 's',
      maxLength: 3,
      decimal: false,
    });
    return views;
  }
  const reps = String(item.targetReps ?? 0);
  views.push(
    { field: 'each', label: 'Reps', value: reps, text: reps, suffix: 'reps', maxLength: 3, decimal: false },
    {
      field: 'weight',
      label: exercise?.type === 'bodyweight' ? 'Added weight' : 'Starting weight',
      value: item.startWeightKg === null ? 'None' : formatWeight(item.startWeightKg, unit),
      text: setWeightText(item.startWeightKg, unit),
      suffix: unit,
      maxLength: 5,
      decimal: true,
    },
  );
  return views;
}

/** PURE: one exercise's row. A new object only when something it shows changed (see `rows` below). */
function rowModel(
  item: RoutineDraftItem,
  exercise: RowExercise | undefined,
  unit: WeightUnit,
  canMoveUp: boolean,
  canMoveDown: boolean,
): RoutineRowModel {
  const weight = item.startWeightKg === null ? null : formatWeight(item.startWeightKg, unit);
  const target = weight === null ? targetLine(item) : `${targetLine(item)} · ${weight}`;
  return {
    key: item.key,
    name: exercise?.name ?? 'Exercise',
    line: exercise ? `${target} · ${MUSCLE_LABELS[exercise.primaryMuscle]}` : target,
    canMoveUp,
    canMoveDown,
    targets: targetViews(item, exercise, unit),
  };
}

/** PURE: what one tap of a target's stepper changes. */
function stepChange(
  item: RoutineDraftItem,
  field: TargetField,
  direction: StepDirection,
  unit: WeightUnit,
): TargetChange {
  if (field === 'sets') return { targetSets: stepCount(item.targetSets, direction, TARGET_LIMITS.sets) };
  if (field === 'weight') return { startWeightKg: stepStartWeight(item.startWeightKg, direction, unit) };
  return item.targetSeconds !== null
    ? { targetSeconds: stepSeconds(item.targetSeconds, direction) }
    : { targetReps: stepCount(item.targetReps ?? TARGET_LIMITS.reps.min, direction, TARGET_LIMITS.reps) };
}

/** PURE: what a typed target changes, or null when it doesn't read as one (the value then stays as it was). */
function typedChange(
  item: RoutineDraftItem,
  field: TargetField,
  text: string,
  unit: WeightUnit,
): TargetChange | null {
  if (field === 'weight') {
    const typed = parseStartWeight(text, unit);
    return typed.ok ? { startWeightKg: typed.kg } : null;
  }
  if (field === 'sets') {
    const sets = parseTargetCount(text, TARGET_LIMITS.sets);
    return sets === null ? null : { targetSets: sets };
  }
  if (item.targetSeconds !== null) {
    const seconds = parseTargetCount(text, TARGET_LIMITS.seconds);
    return seconds === null ? null : { targetSeconds: seconds };
  }
  const reps = parseTargetCount(text, TARGET_LIMITS.reps);
  return reps === null ? null : { targetReps: reps };
}

interface CachedRow {
  exercise: RowExercise | undefined;
  unit: WeightUnit;
  row: RoutineRowModel;
}

/**
 * Each draft item's row, by the item itself: items are never changed in place (a change makes a new one),
 * so an item still here with the same exercise, unit and ends gets the very row object it had, and its
 * memoised row doesn't render again. Entries go with their items.
 */
const builtRows = new WeakMap<RoutineDraftItem, CachedRow>();

/** PURE (bar the cache above): the row for `item`, reused when nothing it shows has changed. */
function cachedRow(
  item: RoutineDraftItem,
  exercise: RowExercise | undefined,
  unit: WeightUnit,
  canMoveUp: boolean,
  canMoveDown: boolean,
): RoutineRowModel {
  const kept = builtRows.get(item);
  if (
    kept &&
    kept.exercise === exercise &&
    kept.unit === unit &&
    kept.row.canMoveUp === canMoveUp &&
    kept.row.canMoveDown === canMoveDown
  ) {
    return kept.row;
  }
  const row = rowModel(item, exercise, unit, canMoveUp, canMoveDown);
  builtRows.set(item, { exercise, unit, row });
  return row;
}

const report = (what: string, cause: unknown) =>
  console.error(`[routines] ${what} (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)

/** Asks before changes are thrown away; `leave` carries on without them. */
function askToDiscard(leave: () => void) {
  Alert.alert('Discard changes?', "What you changed won't be saved.", [
    { text: 'Keep editing', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: leave },
  ]);
}

/**
 * Edit routine: its name, its exercises in order, Save and Delete. `routineId` is a saved routine's id,
 * NEW_ROUTINE for a new one, or null for a link to none. Nothing is kept until Save, and leaving with
 * changes asks first, however the screen is left.
 */
export function useEditRoutineViewModel(routineId: string | null) {
  const isNew = routineId === NEW_ROUTINE;
  const savedId = isNew ? null : routineId;
  const owner = useWorkoutOwner();
  const routine = useRoutine(owner, savedId);
  const library = useExerciseList(owner);
  // This editor's own: what it opens, and the only draft it shows.
  const [holder] = useState(() => Symbol('routine editor'));
  const draft = useRoutineDraftStore((state) => (state.holder === holder ? state.draft : null));
  const saved = useRoutineDraftStore((state) => (state.holder === holder ? state.saved : null));
  const open = useRoutineDraftStore((state) => state.open);
  const rename = useRoutineDraftStore((state) => state.rename);
  const remove = useRoutineDraftStore((state) => state.remove);
  const move = useRoutineDraftStore((state) => state.move);
  const moveTo = useRoutineDraftStore((state) => state.moveTo);
  const update = useRoutineDraftStore((state) => state.update);
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const { mutateAsync: saveRoutine, isPending: saving } = useSaveRoutine(owner);
  const { mutateAsync: removeRoutine, isPending: deleting } = useRemoveRoutine(owner);
  const [nameError, setNameError] = useState<string | null>(null);
  const busy = useRef(false);

  // Opened once by each editor: a new routine at once, a saved one once it is read, so a later read
  // never throws away what is being typed. Before the first paint, so no spinner flashes when cached.
  const opened = useRef(false);
  useLayoutEffect(() => {
    if (opened.current) return;
    if (isNew) open(holder, { routineId: null, name: NEW_NAME, items: [] });
    else if (routine.data) open(holder, routine.data);
    else return;
    opened.current = true;
  }, [holder, isNew, open, routine.data]);

  const changed = draft !== null && saved !== null && draftChanged(saved, draft);
  const leave = useLeaveGuard(changed, askToDiscard);

  const byId = useMemo(() => new Map((library.data ?? []).map((row) => [row.id, row])), [library.data]);
  const items = draft?.items;
  // A row keeps its object while nothing it shows changes, so adding, editing or moving one exercise
  // redraws only the rows that changed (the memoised rows compare by object), not every row.
  const rows = useMemo<RoutineRowModel[]>(
    () =>
      (items ?? []).map((one, index, all) =>
        cachedRow(one, byId.get(one.exerciseId), unit, index > 0, index < all.length - 1),
      ),
    [byId, items, unit],
  );

  // Read from the store at tap time, not from this render: two taps before the next render each step from
  // the one before, and the handlers below change only with the unit, so no row re-renders for them.
  const findItem = useCallback(
    (key: string) => {
      const state = useRoutineDraftStore.getState();
      return state.holder === holder ? state.draft?.items.find((one) => one.key === key) : undefined;
    },
    [holder],
  );

  const onStep = useCallback(
    (key: string, field: TargetField, direction: StepDirection) => {
      const item = findItem(key);
      if (item) update(key, stepChange(item, field, direction, unit));
    },
    [findItem, unit, update],
  );

  /** A typed target: kept when it reads as one (true); otherwise the stepper puts the value back (false). */
  const onType = useCallback(
    (key: string, field: TargetField, text: string) => {
      const item = findItem(key);
      const change = item ? typedChange(item, field, text, unit) : null;
      if (change === null) return false;
      update(key, change);
      return true;
    },
    [findItem, unit, update],
  );

  const onSave = useCallback(async () => {
    if (!draft || busy.current) return;
    busy.current = true;
    try {
      const result = await saveRoutine(draft);
      if (!result.ok) {
        haptics.warning();
        setNameError(result.reason);
        return;
      }
      haptics.success();
      leave();
      showSuccess({ title: 'Routine saved' });
    } catch (cause) {
      report('Could not save a routine', cause);
      showInfo({ title: "Couldn't save", sub: 'Try again.' });
    } finally {
      busy.current = false;
    }
  }, [draft, leave, saveRoutine]);

  const deleteRoutine = useCallback(
    async (id: string) => {
      try {
        await removeRoutine(id);
        haptics.success();
        leave();
        showSuccess({ title: 'Routine deleted' });
      } catch (cause) {
        report('Could not delete a routine', cause);
        showInfo({ title: "Couldn't delete", sub: 'Try again.' });
      }
    },
    [leave, removeRoutine],
  );

  const onDelete = useCallback(() => {
    if (!savedId) return;
    Alert.alert('Delete routine?', 'Workouts already logged from it are kept.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteRoutine(savedId) },
    ]);
  }, [deleteRoutine, savedId]);

  const onNameChange = useCallback(
    (text: string) => {
      rename(text);
      setNameError(null);
    },
    [rename],
  );

  const { refetch: refetchRoutine } = routine;
  const { refetch: refetchLibrary } = library;
  const onRetry = useCallback(() => {
    void refetchRoutine();
    void refetchLibrary();
  }, [refetchLibrary, refetchRoutine]);

  const status =
    draft && library.data
      ? ('ready' as const)
      : routine.isError || library.isError
        ? ('error' as const)
        : !isNew && (savedId === null || (routine.isSuccess && routine.data === null))
          ? ('missing' as const)
          : ('loading' as const);

  return {
    status,
    title: isNew ? 'New routine' : 'Edit routine',
    name: draft?.name ?? '',
    nameError,
    /** "5 exercises", as the exercise browser counts. */
    section: rows.length === 0 ? 'Exercises' : `${rows.length} exercise${rows.length === 1 ? '' : 's'}`,
    rows,
    saving,
    deleting,
    canDelete: !isNew,
    onNameChange,
    onAddExercise: () => openAddExercise('routine'),
    onMove: move,
    onMoveTo: moveTo,
    onRemove: remove,
    onStep,
    onType,
    onSave: () => void onSave(),
    onDelete,
    onBack: () => (changed ? askToDiscard(leave) : goBack()),
    onRetry,
  };
}

export type EditRoutineViewModel = ReturnType<typeof useEditRoutineViewModel>;
