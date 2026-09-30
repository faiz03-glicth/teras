# Teras

**Teras** is a workout-logging app for strength training. You log sessions, exercises and sets (reps × weight), follow planned workouts with rest timers, and track PRs and progress. Each day's training shows up as a GitHub-style **heatmap wave**.

It is the companion app to **Streak**, a habit-logging app. Both apps share one Supabase backend and one login. Teras publishes a small per-day workout summary, and Streak shows it as a second heatmap wave next to your habits.

## Status

**Design phase. There is no app code yet.** The Expo app is scaffolded once the design spec and implementation plan are approved.

| Doc | What it holds |
|---|---|
| [docs/design/decisions.md](docs/design/decisions.md) | The design agreed so far: architecture, data model, open items |
| [docs/design/ux-requirements.md](docs/design/ux-requirements.md) | Mandatory UX requirements: navigation, workout discovery, exercise tracking |
| [docs/mockup/](docs/mockup/) | Clickable mockup of 9 screens (source files for the design canvas) |

## Planned stack

The same stack as Streak, so the patterns carry over: Expo SDK 57 with Expo Router, TypeScript, expo-sqlite with Drizzle (local-first), Supabase (auth + the shared daily summary), TanStack Query, Zustand, Unistyles and Reanimated.

## Repositories

- GitLab (source of truth): https://gitlab.com/faiz03-glicth/teras
- GitHub (mirror): https://github.com/faiz03-glicth/teras
