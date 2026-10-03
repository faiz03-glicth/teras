# Failed-flow triage and fix brief (lead fills this, then delegates)

Run summary comes from `node .maestro/tools/run.mjs all` (read-only `flows/` only).
`writes/` flows wipe data or send real email: never run them without the owner's approval.

## 1. Triage (the lead decides from the summary + evidence, never the worker)
Pick exactly one:
- TEST BUG: the flow is stale (selector, text or step order changed). Fix the flow.
- APP BUG: the app behaves wrongly. Fix the app code, not the flow.
- FLAKY: it passed on the automatic rerun. Only add a proper wait (`extendedWaitUntil`) if it fails again.
- ENVIRONMENT: phone, USB, Metro, `adb reverse` or build problem. Run `node .maestro/tools/run.mjs doctor`. Not a code task.

## 2. Brief (use ~/.claude/worker/TASK_TEMPLATE.md with these fields filled)
GOAL: Make flow <name> pass without weakening what it verifies.
CONTEXT: Failing step: <step>. Error: <message>. Triage: <class>. Evidence: <path under .maestro/reports/>.
  Selectors use testIDs (`id: "tab-profile"`); prefer adding a testID in the screen over matching visible text.
FILES: EDIT <exact flow or source file>. READ-ONLY <screen source that owns the selector>, .maestro/subflows/open-app.yaml.
SPEC: <exact change: new selector or testID, wait, or code fix, with names>.
DO NOT: delete steps, loosen assertions, replace assertions with long waits, add sleeps over 2s, edit other flows,
  or touch anything in `.maestro/writes/`.
ACCEPTANCE: `node .maestro/tools/run.mjs flow <file>` must print PASS.

## 3. Loop limits
Two fix attempts per failure, then the lead fixes it directly.
After every flow passes, run the FULL `all` suite once more as the regression check.
