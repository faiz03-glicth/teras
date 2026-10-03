# Maestro UI regression (branch `automation-testing`)

Device tests run here, not by hand. `flows/` is read-only and safe on the owner's phone.
`writes/` saves data, wipes it (00) or sends email (01): ask first.

Setup: Metro running (`npx expo start`), then `adb reverse tcp:8081 tcp:8081`.

    maestro test .maestro/flows                 # read-only regression
    maestro test .maestro/writes/04-routine-save-delete.yaml

Coverage, login → current phase:
- 00 onboarding + guest (Get Started, Set up, Sign in skip) — writes
- 01 email sign-in request — writes (real email)
- flows/01 tabs, 02 Home + heatmap, 03 filters, 04 routine edit/discard, 05 new routine,
  06 Profile, 07 Exercise detail, 08 search shorthand
- writes/02 full workout, 03 discard workout, 04 routine save/delete

Every page and button (added): flows/09 Home → Calendar → Session → Exercise detail, 10 Workout tab buttons,
11 library sheets + Create sheet + detail buttons, 12 Profile toggles; writes/05 every active-workout
button, 06 theme + Log out.
