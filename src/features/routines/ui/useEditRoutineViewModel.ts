import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { MUSCLE_LABELS } from '@/features/exercises/domain/labels';
import { useExerciseList } from '@/features/exercises/hooks/useExerciseQueries';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openAddExercise, useLeaveGuard } from '@/shared/actions';
import { NEW_ROUTINE } from '@/shared/actions/params';
import { haptics } from '@/shared/lib/haptics';
import { showInfo, showSuccess } from '@/shared/ui/toast';

import { draftChanged, targetLine } from '../domain/draft';
import { useRemoveRoutine, useRoutine, useSaveRoutine } from '../hooks/useRoutineQueries';
import { useRoutineDraftStore } from '../state/routineDraftStore';

/** What a new routine is called until it is renamed. */
const NEW_NAME = 'New routine';

/** One exercise of the routine, ready to show. */
export interface RoutineRowModel {
  key: string;
  name: string;
  /** "3 sets × 10 reps · Chest". */
  line: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
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
  const rows = useMemo<RoutineRowModel[]>(
    () =>
      (items ?? []).map((one, index, all) => {
        const exercise = byId.get(one.exerciseId);
        const target = targetLine(one);
        return {
          key: one.key,
          name: exercise?.name ?? 'Exercise',
          line: exercise ? `${target} · ${MUSCLE_LABELS[exercise.primaryMuscle]}` : target,
          canMoveUp: index > 0,
          canMoveDown: index < all.length - 1,
        };
      }),
    [byId, items],
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
    onRemove: remove,
    onSave: () => void onSave(),
    onDelete,
    onBack: () => (changed ? askToDiscard(leave) : goBack()),
    onRetry,
  };
}

export type EditRoutineViewModel = ReturnType<typeof useEditRoutineViewModel>;
