# Teras mockup

A clickable mockup of 9 phone screens (390 × 844). Its visual language comes from Streak: Inter, Streak's neutrals and
glass cards, radii, and the two-tabs + centre-button tab bar. The accent is amber, from Streak's amber heat palette.

| File | Screen |
|---|---|
| `Main.dc.html` | Home: 3-month volume heatmap, weekly stats, start again, recent |
| `Workouts.dc.html` | Workout discovery: search, goal chips, your routines + curated workouts by goal |
| `Progress.dc.html` | Per-exercise best-set chart and PRs |
| `Preview.dc.html` | Workout preview sheet: everything a workout contains, on one screen |
| `Active.dc.html` | Active workout: current set, targets, steppers, one-tap complete, exercise states. Has a `dark` option |
| `Rest.dc.html` | Rest timer with lock-screen alert, ±15 s, and a "set saved · Undo" toast |
| `Complete.dc.html` | Workout saved: stats, new PRs, today's heat level, "Shared with Streak" |
| `ActiveDark.dc.html` | The active workout in dark theme (it reuses `Active.dc.html`) |
| `TabBar.dc.html` | The one tab bar component every tab uses. Has a `running` option that switches the centre button to Resume |

These are source files for the Claude design canvas, and `canvas.json` lays them out. They load the canvas runtime
(`support.js`), so they don't render as standalone pages in a browser.
