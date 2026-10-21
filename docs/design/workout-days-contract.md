# The Teras ↔ Streak contract: `workout_days`

Teras uses **two Supabase projects** (decisions 22 and 23, 21 Oct 2026):

| Project | Holds | Who reads it |
|---|---|---|
| **The shared project** (Streak's) | `public.workout_days` only: one row per person per training day | Streak, for its second heatmap wave |
| **`teras-detail`** (Teras's own) | Every workout detail: workouts, their exercises and sets, routines, custom exercises, favourites, weigh-ins, and a `profiles` row mapping the person to their shared-project user | Teras only |

The phone's SQLite stays the source of truth for both: everything is written there first and copied in the
background. **Workout detail is never written to the shared project**, because Streak can read it. This document is
the contract for the shared half, `workout_days`; the detail project's schema is `supabase/detail/0001_teras_detail.sql`.

```text
Teras SQLite (source of truth: workout detail + day summaries)
   │  a day's completed sets change                 │  any detail row changes
   ▼                                                ▼
WorkoutDayRepository.recordDay                     marked "to send"
  → totals + frozen level, marked "to send"         │
   │  signed in + online                            │  signed in + online
   ▼                                                ▼
shared project: public.workout_days                teras-detail: workouts, workout_sets, …
  (upsert on user_id + date)                         (upsert on user_id + id; pull_changes by synced_at)
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
- **Guests** sign in anonymously (decision 23), so a guest has a real `user_id` from first launch and keeps it when
  they link Google or an email code. **Open:** whether an anonymous guest's days are sent to the shared project
  before they link an account (Streak can only show them once both apps share that account).
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
| Workout detail (the other project) | `supabase/detail/0001_teras_detail.sql`, checks in `supabase/detail/TEST.md` (kept on this computer only) |

The migration reuses `public.set_updated_at()` from Streak's `0001_profiles.sql`, so apply it to the same Supabase
project, after Streak's. Streak's `0005_teras_link.sql` adds a trigger on this table (a day's first sets become a
Workout check-in), so the table is shared by both apps: never drop or rename it.

**Superseded:** from 12 Oct 2026 the shared project also held a `teras` schema of detail tables with
`public.teras_push` / `public.teras_pull` (Teras's `0002_teras_detail_schema.sql`, `0003_teras_sync_functions.sql`).
Decision 22 moves detail to `teras-detail`; those objects are archived in
`docs/design/archive/shared-project-teras-schema-2026-10-12.md` and removed only after the owner confirms.
