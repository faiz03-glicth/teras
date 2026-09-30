# Teras: design decisions so far

> Status: **in progress**, not yet an approved spec. Sections 1 and 2 are approved. Sections 3–6 are still to be
> designed. Written 30 Sep 2026.

## Goal

A separate workout app with richer data than Streak's one-tap check-ins: exercises, sets, reps, weight and
PRs. Its daily training becomes a heatmap wave that **Streak also shows**, next to the habit wave. That makes Streak
a multi-heatmap app.

## Decisions (and why)

| # | Decision | Chosen | Why |
|---|---|---|---|
| 1 | Why a separate app? | **Richer workout data** | Sets, reps and weight don't fit Streak's check-in model. |
| 2 | How the apps connect | **Shared Supabase project + same login** | The shared `auth.users` id is the only link between the two apps. |
| 3 | Code sharing | **Separate repos, no monorepo (for now)** | Avoids migrating Streak and disrupting its branches and parallel sessions. The small heatmap UI is copied once. Revisit a monorepo only if duplicating the sync engine starts to hurt. |
| 4 | What to design first | **Teras (the producer)** | Streak's multi-heatmap (the consumer) comes after. |
| 5 | Workout model | **Session → exercises → sets** | The classic strength logger. |
| 6 | Heat metric | **Training volume (reps × weight)**, relative to your own history | Absolute volume varies too much between people, so levels are personal. |
| 7 | Level stability | **Frozen at the time.** A day is compared with the ~90 days before it, and the result is stored | Matches Streak: "the heatmap you built is the heatmap you see". |
| 8 | Data approach | **Local-first + push only the daily summary** | Works offline in the gym. Streak's sync engine is not built yet (its Phase 5), so there is nothing to copy. |
| 9 | Workout library | **Curated starter workouts + your own routines** | Required by the workout-discovery requirement. |

Defaults that came with these decisions:
- **Bodyweight exercises** count as reps × (bodyweight + added weight). You set your bodyweight once, and each session stores a snapshot of it.
- **Cold start:** until there are about 5 prior training days, every training day shows as "Moderate".
- **Units:** weights are stored in kg, never rounded when saved, and converted only for display.
- **Only completed sets count.** Any day with at least one completed set is at least Level 1, so a plank-only day never looks empty.

## Section 1: Architecture & repo setup (approved)

- **Separate repo**, bundle/package ID **`com.faiz.teras`**, with its own EAS project. It installs next to Streak.
- **Same stack and structure as Streak:** Expo Router (routes in `app/`) and MVVM + repositories + a DI
  composition root, with the same ESLint import boundaries.
- **Copied once from Streak:** core scaffolding (boot gate, DB client + migrations, query client, DI), the Supabase client +
  `LargeSecureStore`, the auth feature (Apple / Google / email OTP / guest), date utilities, theme tokens, and the heatmap UI +
  grid builders.
- **Not copied:** check-ins, activities, insights, onboarding content.
- **Shared Supabase project:** the same URL and anon key. Setup needed:
  1. Apple: enable Sign in with Apple for `com.faiz.teras` and add it to Supabase's Apple allowed client IDs.
  2. Google: create iOS + Android OAuth clients for `com.faiz.teras` in the same Google Cloud project, and add the
     new iOS client ID to Supabase's Google **Client IDs**. The Web client ID can be shared.
  3. Email OTP needs no changes.
- Streak's `on_auth_user_created` trigger also creates a `profiles` row for people who sign up in Teras first.
  This is intended: `profiles` is the shared identity for both apps.
- **Migrations:** Teras owns the migration for the table it writes (`workout_days`). Streak keeps `profiles`.

## Section 2: Local data model (approved, revised for the UX requirements)

Every table carries Streak's `syncColumns`: `id`, `user_id`, timestamps, soft-delete `deleted_at`, and `dirty`.

**Library**

| Where | What | Fields |
|---|---|---|
| Config | Starter exercises | `name`, `type` = weighted / bodyweight / timed, `muscles` (primary first), `equipment` |
| `exercises` table | Custom exercises | same fields |
| Config | Curated workouts (~12–20) | `name`, `goal`, `difficulty`, `description`, planned exercises (`target_sets`, `target_reps` or `target_seconds`, `rest_seconds`) |
| `routines` + `routine_exercises` | Your own routines | the same shape |

- Curated workouts are read-only. "Save as my routine" copies one so you can customise it.
- **Duration, equipment and target muscles are derived** from a workout's exercises and targets, never typed by hand.

**Sessions**

| Table | Fields |
|---|---|
| `workouts` | `date` (local day), `minute`, `bodyweight_kg` snapshot, `note`, `template_id` + `template_name` snapshot, `status` (in progress / completed), `started_at`, `finished_at`, `rest_ends_at` |
| `workout_exercises` | `exercise_id`, `position`, `status` (upcoming / active / completed / skipped), `rest_seconds` |
| `workout_sets` | `position`, targets (`target_reps` / `target_seconds`), actuals (`reps`, `weight_kg`, `duration_seconds`), `status` (upcoming / completed / skipped), `completed_at` |
| `workout_days` | `date`, `volume_kg`, `sets`, `workouts`, `level` (0–4). This is the daily summary, and also the push outbox |

- **Starting a workout creates its planned sets up front**, with weights pre-filled from the last time you did that exercise. Completing a set is usually one tap.
- **All in-progress state lives in the database.** After a crash or kill, the app reopens exactly where you were. Timers are computed from timestamps.
- **PRs are derived:** heaviest weight (weighted), most reps (bodyweight), longest hold (timed). Only completed sets count.
- **Settings** (a persisted store, not synced): display unit, bodyweight, default rest time.

## Still to design

3. The heat level logic: volume, percentiles over the trailing window, cold start, frozen levels, backfills.
4. The contract + push flow: the Supabase `workout_days` table + RLS, when the push runs, guest → sign-in catch-up,
   and the same-account requirement.
5. Screens and v1 scope, split into phases like Streak's roadmap.
6. Error handling & testing, plus the UX consistency review as an acceptance gate.

Then: the written spec, then the implementation plan, then scaffolding the app. Streak's multi-heatmap is a separate,
later piece of work in the Streak repo.

## Choices the mockup adds (awaiting feedback)

- **Accent:** amber, from Streak's amber heat palette. The apps look like siblings, and the Teras wave looks different from Streak's green one.
- **Tab bar:** Home · Workouts · (+) · Progress · Profile, the same shape as Streak's. The centre button starts an empty
  workout in one tap, and becomes **Resume** while a workout is running.
- **No avatar on Home**, because it would duplicate the Profile tab.
