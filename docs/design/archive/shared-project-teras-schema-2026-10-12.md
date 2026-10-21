# Archive: Teras's objects on the shared Supabase project (applied 12 Oct 2026)

On 12 Oct 2026 Teras's workout-detail schema was applied to the **shared** Supabase project (the one Streak
uses). Decision 22 (21 Oct 2026) moves workout detail to Teras's own project, `teras-detail`
(`supabase/detail/0001_teras_detail.sql`). This file records what was on the shared project before anything
is removed, so it can be rebuilt if ever needed.

**Status:** classification done; live definitions **waiting for the owner's snapshot**
(`supabase/snapshot/shared-project-snapshot.sql`, read-only). Nothing has been dropped.

## Migrations applied to the shared project

| App | Files (kept on this computer only) |
|---|---|
| Streak (`-Ada/supabase/migrations/`) | `0001_profiles`, `0002_harden_profiles`, `0003_check_ins`, `0004_harden_check_ins`, `0005_teras_link`, `0006_teras_link_clock`, `0007_teras_log_day` |
| Teras (`Teras/supabase/migrations/`) | `0001_workout_days` (keep), `0002_teras_detail_schema` and `0003_teras_sync_functions` (the objects archived here) |

The live server has the **original** Teras 0002/0003 from 12 Oct. The later review fixes in the local files
were never applied, so the snapshot below, not the local files, is the record of what ran.

## Classification

### Teras's, to remove (Part 3, only after the owner says yes)

- Schema `teras`, with its 8 tables, their indexes, constraints and policies, and the 8 `*_before_write`
  triggers.
- `teras.before_write()`.
- `public.teras_push(jsonb)`.
- `public.teras_pull(timestamptz, text, text, integer)`.

### Teras's, to keep

- `public.workout_days`, its 3 policies and its trigger `workout_days_set_updated_at`. This is the
  Teras → Streak contract (`docs/design/workout-days-contract.md`).

### Streak's, never touched

- Tables `public.profiles`, `public.check_ins`, `public.workout_reminders`, with their policies and triggers.
- Functions `handle_new_user`, `set_updated_at`, `push_check_ins`, `check_ins_before_write`,
  `check_ins_quota`, `check_ins_to_workout_reminders`, `purge_deleted_check_ins`, `streak_workout_dates`,
  `workout_days_to_check_ins`, and `teras_log_day` (Streak's `0007`, despite the name).
- Any `cron.job` rows (Streak's purge).

### Shared by both apps, never dropped

- `public.workout_days`: Teras writes it, Streak reads it, and Streak's trigger `workout_days_to_check_ins`
  is on it.
- `public.set_updated_at()`: Streak's function, used by Teras's `workout_days` trigger.

## Row counts at the snapshot

_Waiting for the snapshot ("rows" section)._

| Table | Rows |
|---|---|
| `teras.*` (8 tables) | — |
| `public.workout_days` | — |

## Live definitions

_Waiting for the snapshot. Paste the CSV's schema, table, column, constraint, index, rls, policy, trigger,
function and grant rows for schema `teras` and for `teras_push` / `teras_pull` here, unchanged._
