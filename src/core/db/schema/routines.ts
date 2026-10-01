import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';
import { exercises } from './exercises';

/** A routine the person built: an ordered list of exercises with targets. Local only. */
export const routines = sqliteTable('routines', {
  ...syncColumns(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
});

/**
 * One exercise inside a routine. `target_reps` is for weighted and bodyweight exercises, `target_seconds`
 * for timed ones. `start_weight_kg` fills the first workout; after that the last performance is used.
 */
export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    ...syncColumns(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    targetSets: integer('target_sets').notNull(),
    targetReps: integer('target_reps'),
    targetSeconds: integer('target_seconds'),
    startWeightKg: real('start_weight_kg'),
  },
  (table) => [index('routine_exercises_routine').on(table.routineId, table.position)],
);

export type RoutineRow = typeof routines.$inferSelect;
export type NewRoutineRow = typeof routines.$inferInsert;
export type RoutineExerciseRow = typeof routineExercises.$inferSelect;
export type NewRoutineExerciseRow = typeof routineExercises.$inferInsert;
