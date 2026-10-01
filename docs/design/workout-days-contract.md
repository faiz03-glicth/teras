# The Teras ↔ Streak contract: `workout_days`

Teras keeps every workout detail in SQLite on the phone. The **only** workout data it sends to Supabase is one row
per person per training day, in `public.workout_days`. Streak reads that table to draw its second heatmap wave.

```text
Teras SQLite (workout detail)
   │  a day's completed sets change
   ▼
WorkoutDayRepository.recordDay  → totals + frozen level, stored locally, marked "to send"
   │  signed in + online (on sign-in, on reconnect, on returning to the app)
   ▼
Supabase public.workout_days   (upsert on user_id + date)
   │
   ▼
Streak reads date + level  → second heatmap wave
```

## Columns

| Column | Type | Meaning |
|---|---|---|
| `user_id` | uuid | The Supabase auth user. Both apps sign in with the same account; this id is their only link. |
| `date` | date | The person's **local** calendar day. A day never moves when the time zone changes. |
| `volume_kg` | double precision | Reps × weight over the day's completed sets, in kg. Timed sets add 0. |
| `sets` | integer | Completed sets. |
| `workouts` | integer | Workouts with at least one completed set. |
| `level` | smallint 0–4 | 0 No workout · 1 Light · 2 Moderate · 3 Strong · 4 Peak. |
| `created_at`, `updated_at` | timestamptz | Set by the database. |

Primary key: `(user_id, date)`. Row Level Security lets each person read, insert and update only their own rows. There is
no delete: a day whose sets were all removed is stored with level 0, so the change still reaches Streak.

## Rules

- **Teras is the only writer.** Streak only reads.
- **`level` is final.** Teras computes it against the person's own previous 90 days and freezes it
  (`src/features/workoutDays/domain/heatLevel.ts`). Streak draws it as is and never recomputes it, so Streak needs
  no knowledge of what a "heavy day" is.
- **Guests send nothing.** Days logged as a guest are handed to the account and sent after sign-in.
- **A failed send is retried.** Rows stay marked until the server accepts them.

## How Streak reads it

```sql
select date, level, volume_kg, sets
from public.workout_days
where user_id = auth.uid() and date between :from and :to
order by date;
```

`level` colours the cell. `volume_kg` and `sets` are for labels such as "14 sets · 5,400 kg". Teras's own
`WorkoutDayApi.list` makes the same read, so the path is already exercised from the Teras side.

## Where it lives

| Piece | Location |
|---|---|
| Supabase migration (table, RLS, trigger) | `supabase/migrations/0001_workout_days.sql` (kept on this computer only, like Streak's) |
| Local SQLite table | `src/core/db/schema/workoutDays.ts` |
| Level rule | `src/features/workoutDays/domain/heatLevel.ts` |
| Repository (record, list, push) | `src/features/workoutDays/data/WorkoutDayRepository.ts` |
| Supabase read/write | `src/features/workoutDays/data/remote/workoutDayApi.ts` |
| Background push | `src/features/workoutDays/hooks/usePushPendingWorkoutDays.ts` |

The migration reuses `public.set_updated_at()` from Streak's `0001_profiles.sql`, so apply it to the same Supabase
project, after Streak's.
