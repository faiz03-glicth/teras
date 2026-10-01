# Teras ↔ Streak: the cross-app contract

Written 1 Oct 2026. **Proposed, not approved.** Nothing here is built yet.

This document answers one question: when someone uses both apps, how does a `Workout` habit logged in
Streak reach Teras without inventing workout data? It extends `decisions.md` rows 2, 6, 7 and 8; it does
not replace them. Teras stays local-first, the repos stay separate, and no cloud backup is introduced.

---

## 1. What the code actually does today

Findings from reading both repos, because the design depends on them.

| # | Question | Finding |
|---|---|---|
| 1 | How Streak stores a check-in | `check_ins` in SQLite: `id, user_id, date` (local YYYY-MM-DD), `minute`, `activity_id`, `note`, soft-deleted via `deleted_at`. |
| 2 | How a workout habit is identified | `activity_id = 'workout'`, a stable template key from `SEED_ACTIVITIES`. Activities live in a **persisted Zustand store on the device** — not in SQLite, not in Supabase. |
| 3 | How Teras stores `workout_days` | SQLite table (sync columns + `date, volume_kg, sets, workouts, level`) mirrored to Supabase `workout_days`, primary key `(user_id, date)`, three owner-only RLS policies. |
| 4 | How auth is shared | One Supabase project, one `auth.users` id. A trigger creates a `profiles` row for any new user from either app. |
| 5 | Teras → Streak sync | `usePushPendingWorkoutDays` pushes `dirty` rows on sign-in, on reconnect and on foreground. Guest rows carry `user_id = NULL` and are claimed by `reassignGuestData` on sign-in. |
| 6 | Can Streak signal Teras today? | **No.** `CheckInRepository` says in as many words: "nothing here talks to a server." Streak's only Supabase traffic is `profiles`. Its sync engine is Phase 5 and unbuilt. |
| 7 | Where pending state belongs | Teras-local, derived. It must never enter `workout_days.level`. |
| 8 | Push or in-app? | **In-app.** Neither app depends on `expo-notifications`; there is no push infrastructure to reuse. |
| 9 | Guest → authenticated | `reassignGuestData` reassigns guest rows atomically and marks them dirty. Already solved. |
| 10 | Sign-out / account switch | Local rows are scoped by `user_id`. Anything pulled from the server must be scoped the same way and cleared on sign-out. |

**The load-bearing finding is #6.** Everything else is a small addition to Teras. A Streak → Teras signal
is the only part that requires Streak to gain a capability it does not have: writing to Supabase.

---

## 2. Recommended architecture

### A one-way daily flag, in its own table

```sql
create table public.workout_signals (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  source     text not null default 'streak' check (source in ('streak')),
  created_at timestamptz not null default now(),
  primary key (user_id, date, source)
);
```

Four columns. It carries no count, no habit id, no note, no time of day — only *"on this local date, this
person reported a workout in Streak."*

**Streak writes it. Teras only reads it.** Teras never writes a signal; Streak never reads `workout_days`
rows it did not need for its own heatmap.

### Why a daily flag rather than an event record

- **Repeats become free.** Streak brightens its own heatmap when a habit is logged several times a day;
  Teras only needs "at least one". The primary key makes the second and third log a no-op, so there is no
  deduplication code anywhere.
- **Deletion is natural.** When the last `Workout` check-in for a day is removed, Streak deletes the row.
  An event log would need tombstones and replay.
- **No cursor, no ordering, no queue.** Teras reads a date range and gets the truth. There is nothing to
  resume, which is what keeps this from becoming the generic event bus the brief rules out.

### Why not the alternatives

| Alternative | Why not |
|---|---|
| **Add a `source` column to `workout_days`** and let Streak upsert a row | Makes a Teras-owned table writable by Streak, and puts a non-workout row inside the table the heat window reads. One careless query and a Streak habit becomes a zero-volume training day — exactly Rule 7. |
| **Streak writes a check-in table to Supabase** | Builds a chunk of Streak's Phase 5 sync engine, exposes habit data the contract does not need, and couples Teras to Streak's schema. |
| **Teras reads Streak's local database** | Impossible; separate apps, separate sandboxes. |
| **Defer the whole thing** | Legitimate, and cheapest. See §9. |

---

## 3. The heatmap: how a signal stays out of the level

`heatLevel()` does not change. A signal never reaches it.

```
Streak logs "Workout"            →  workout_signals row  (remote)
        ↓
Teras pulls it                   →  local mirror, scoped to user_id
        ↓
Day has a signal and no real
Teras workout                    →  cell state = "pending"   ← VISUAL ONLY
        ↓
User records the real workout    →  recordDay() → DayTotals → heatLevel(totals, window)
        ↓
workout_days.level is written    →  pending condition is false, so the marker goes
```

Three properties that must hold, and do:

1. **`workout_days` gains no row from a signal.** Pending is derived at render time from
   `signal exists AND no workout_days row with volume > 0`. Nothing is stored that could be mistaken for
   training.
2. **The 90-day window is untouched.** `trainingVolumes()` reads real rows only, so a pending day is not a
   training day and cannot drag a percentile. This satisfies Rule 7 for free, because there is nothing to
   exclude.
3. **Frozen levels stay frozen.** Decision 7 is unaffected: a signal arriving for an old date changes no
   stored level.

The UI change is one new value on an existing union in `src/features/heatmap/domain/grid.ts`:

```ts
export type HeatCellState = 'default' | 'today' | 'selected' | 'future' | 'blank' | 'pending';
```

A pending cell draws at level 0 with a ring — visibly "something happened here, details missing", never a
heat colour it did not earn.

---

## 4. Product behaviour by state

| State | What the person sees |
|---|---|
| **Teras guest** | Everything: routines, logging, sets, PRs, history, their own heatmap. No signals, no reminder, no mention of Streak beyond one optional line. Authentication is never required to log a workout. |
| **Teras signed in, no Streak** | Identical, plus their day summaries reach Supabase. Honest framing: the account exists so Streak *can* show the training wave. If they do not use Streak, the account changes nothing they can see — and the copy must say so rather than imply backup. |
| **Streak only** | Unchanged. It writes signals nobody reads; four columns a day, harmless. |
| **Both, Teras → Streak** | Already built. Finish a workout → `recordDay` → pushed on foreground/reconnect → Streak draws the second wave. |
| **Both, Streak → Teras** | Log `Workout` in Streak → Teras shows that day as pending and, for today only, a dismissible banner. |

---

## 5. Authentication

- **Optional, always.** Guest mode is a first-class path. Nothing in logging, history or the heatmap is
  gated behind an account.
- **Useful when, and only when, the person also uses Streak.** That is the whole of the current value.
- **Signing in later** reassigns guest rows via `reassignGuestData` and marks them dirty, so past days
  reach Streak. Already implemented and tested.
- **Switching accounts** must clear the local signal mirror — it is remote-derived and cheap to re-pull.
  Workout detail is *not* cleared: it belongs to the device.
- **Signing out** clears the mirror and stops the reminder. No workout data is touched.

---

## 6. Reminder

> **Workout logged in Streak**
> Add the details here when you get a moment.

| Aspect | Rule |
|---|---|
| **Trigger** | Signed in **and** a signal exists for **today** **and** no Teras workout with a completed set for today **and** not dismissed. |
| **Scope** | Today only. A signal from three days ago never raises a banner; the day still shows as pending on the heatmap. |
| **Deduplication** | The primary key `(user_id, date, source)` means repeat logs are one row. One banner per date, ever. |
| **Dismissal** | `dismissed_at` on the local mirror row. Local-only, never pushed. |
| **Resolution** | Recording the workout makes the condition false. Nothing to clean up. |
| **Offline** | Renders from the cached mirror. No network, no new signals, no error. |
| **Never opened since** | Nothing happens until Teras opens; the "today only" rule stops a backlog of banners. |
| **Account mismatch** | Mirror rows are scoped by `user_id`; another account's signals are never visible. |

In-app only. No push notifications, no background fetch, no new native dependency.

---

## 7. Ownership rules (to be added to `decisions.md`)

1. Teras workout details belong to Teras.
2. Streak habit data belongs to Streak.
3. The shared account id connects the apps; it does not mean they share all data.
4. `workout_days` is a lightweight summary, not a copy of the workout database.
5. A Streak `Workout` habit is an external signal, not a Teras workout session.
6. A Teras workout is authoritative for Teras training metrics.
7. A missing Teras workout is never zero-volume training just because Streak logged a habit.
8. No cloud backup or restore as part of this.

### An honest note on enforcement

RLS gives every table owner-only access, so **people can only ever read their own rows** — that is the
security requirement and it holds.

What RLS cannot do is tell the two apps apart. Both authenticate as the same user against the same project
with the same anon key, so Postgres sees one identity. Nothing at the database level stops Teras writing a
signal or Streak selecting `workout_days`. **The separation is a convention held by the two codebases, not
a permission boundary.** Enforcing it properly would need separate Postgres roles and separate keys per
app, which is more machinery than this is worth today. It should be written down rather than assumed.

---

## 8. Changes required

### Supabase (shared project)

- `0002_workout_signals.sql`: the table above, RLS on, owner-only select/insert/delete, `grant select,
  insert, delete`. No update policy — a signal has nothing to change.

### Teras

- Local mirror table `workout_signals` (`user_id, date, source, dismissed_at`) — pull-only, so no `dirty`.
- `WorkoutSignalRepository`: `pullRange(userId, from, to)`, `list(userId, from, to)`, `dismiss(date)`.
- `useWorkoutSignals` — pull on sign-in, foreground and reconnect, mirroring `usePushPendingWorkoutDays`.
- `'pending'` added to `HeatCellState`, and the grid builder marking a day pending when a signal has no
  matching real workout.
- A dismissible banner on Home.
- Honest sign-in copy (§9 of this document's companion change, below).

### Streak

- Write a `workout_signals` row when a check-in with `activity_id = 'workout'` is added; delete it when the
  last one for that date is removed.
- Queue it when offline. This is the one piece that touches Streak's unbuilt sync path, and the reason to
  consider the staging in §9.

### UX copy

`benefits.ts` and `loginCopy.ts` currently sell Teras as a Streak accessory and must be rewritten to stand
alone. Replacement benefits, all true today:

| Icon | Title | Description |
|---|---|---|
| `lock` | Private by default | Exercises, sets and weights never leave this phone |
| `flame` | Works with Streak | Your training days appear there as a second wave |
| `user` | One account for both apps | The same sign-in as Streak, if you use it |

And the words that must not appear, because they are not true: *backed up*, *across devices*, *never lose
your data*, *sync your workouts*, *access anywhere*.

### `decisions.md`

Only what this genuinely changes:

- **Row 2** — extend: the shared id is the link, and the contract is now two tables, one per direction.
- **Row 8** — extend: local-first, push the daily summary, **pull a minimal daily flag**. Still no backup.
- **Rows 6 and 7** — unchanged, with a sentence making it explicit that an external signal never
  contributes to a level.
- **New row 22** — the Streak → Teras workout signal and the pending state.

Rows 1, 3–5 and 9–21 are untouched.

---

## 9. Implementation order, and a question about staging

1. Supabase migration for `workout_signals`.
2. Teras: local mirror, repository, pull hook. Behind a flag, inert with no rows.
3. Teras: `'pending'` cell state and the grid rule.
4. Teras: the Home banner and dismissal.
5. Teras: honest sign-in copy. **Independent of everything above** — worth doing first either way.
6. Streak: write and delete signals.
7. `decisions.md` and `workout-days-contract.md` updates.

Steps 1–5 are Teras-only and safe: with no producer, the feature is simply dormant. Step 6 is the one that
asks Streak for something new.

**This is the open question.** Teras has no workout logging yet, so there is nothing for a pending state to
resolve into. Doing steps 1–4 now means building a consumer for a producer that does not exist, against a
feature that does not exist. The alternative is to do step 5 now, build workout logging, and return to
1–4 when there is a real workout to be reminded about.

---

## 10. Acceptance criteria

- [ ] A guest can log a full workout and see their heatmap with no account and no network.
- [ ] Signing in reassigns guest days and pushes them; no workout detail leaves the device.
- [ ] Logging `Workout` in Streak makes that day pending in Teras within one foreground cycle.
- [ ] A pending day shows level 0 and is absent from the 90-day window used by `heatLevel`.
- [ ] Logging the real workout replaces pending with the computed level; no stored level ever changes retrospectively.
- [ ] Repeating the Streak habit five times produces one row, one banner.
- [ ] Removing the Streak check-in clears the pending state on the next pull.
- [ ] Logging in Streak *after* finishing in Teras raises no banner.
- [ ] Dismissing the banner keeps it dismissed across launches.
- [ ] Signing out, then into another account, shows none of the first account's signals.
- [ ] Offline: no errors, no banner changes, pending renders from cache.
- [ ] Streak alone keeps working with Teras uninstalled; Teras alone keeps working with Streak uninstalled.
- [ ] No string in the sign-in flow claims backup, sync or cross-device access.
